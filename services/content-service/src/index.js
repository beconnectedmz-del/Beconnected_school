'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const { Client: MinioClient } = require('minio');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const axios = require('axios');
const { validateUpload, sanitiseObjectName } = require('./security');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// ─── Clientes ─────────────────────────────────────────────────────────────────
const db = new Pool({ connectionString: process.env.DATABASE_URL });

const minio = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT?.split(':')[0] || 'minio',
  port: parseInt(process.env.MINIO_ENDPOINT?.split(':')[1] || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const BUCKET_VIDEOS    = process.env.MINIO_BUCKET_VIDEOS    || 'videos';
const BUCKET_MATERIALS = process.env.MINIO_BUCKET_MATERIALS || 'materials';
const MAX_SIZE_MB       = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '2048');

// Garantir que os buckets existem
async function ensureBuckets() {
  for (const bucket of [BUCKET_VIDEOS, BUCKET_MATERIALS]) {
    const exists = await minio.bucketExists(bucket);
    if (!exists) {
      await minio.makeBucket(bucket, 'us-east-1');
      logger.info({ message: `Bucket criado: ${bucket}` });
    }
  }
}

// ─── Auth Middleware ───────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'token não fornecido' });
  }
  try {
    req.user = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'token inválido' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'acesso negado' });
    }
    next();
  };
}

// ─── Upload (multipart streaming directo para MinIO) ──────────────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/ogg',
                     'application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`tipo de ficheiro não permitido: ${file.mimetype}`));
    }
  },
});

// Upload de vídeo de aula
app.post('/content/upload/video',
  authMiddleware,
  requireRole('teacher'),
  upload.single('video'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'ficheiro obrigatório' });

      // Magic bytes + MIME + filename validation
      const validation = validateUpload(req.file.buffer, req.file.mimetype, req.file.originalname, 'video');
      if (!validation.ok) {
        logger.warn({ event: 'upload-rejected', reason: validation.error, teacher: req.user.user_id });
        return res.status(422).json({ error: validation.error });
      }

      const { course_id, lesson_id, title } = req.body;
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      const objectName = sanitiseObjectName(`${req.user.user_id}/${course_id || 'uncategorized'}/${uuidv4()}.${ext}`);

      await minio.putObject(
        BUCKET_VIDEOS,
        objectName,
        req.file.buffer,
        req.file.size,
        { 'Content-Type': req.file.mimetype, 'X-Teacher-ID': req.user.user_id },
      );

      const videoUrl = `/${BUCKET_VIDEOS}/${objectName}`;

      // Actualizar registo da aula se lesson_id fornecido
      if (lesson_id) {
        await db.query(
          `UPDATE lessons SET video_url = $1, status = 'pending_review', updated_at = NOW()
           WHERE id = $2 AND course_id = $3`,
          [videoUrl, lesson_id, course_id],
        );
      }

      logger.info({ event: 'video-uploaded', teacher: req.user.user_id, object: objectName });

      res.status(201).json({
        video_url: videoUrl,
        object_name: objectName,
        size_bytes: req.file.size,
        message: 'vídeo enviado e aguarda revisão',
      });
    } catch (err) {
      logger.error({ event: 'upload-error', error: err.message });
      res.status(500).json({ error: 'erro ao fazer upload do vídeo' });
    }
  },
);

// Upload de material didáctico
app.post('/content/upload/material',
  authMiddleware,
  requireRole('teacher'),
  upload.single('material'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'ficheiro obrigatório' });

      const validation = validateUpload(req.file.buffer, req.file.mimetype, req.file.originalname, 'material');
      if (!validation.ok) {
        logger.warn({ event: 'material-upload-rejected', reason: validation.error });
        return res.status(422).json({ error: validation.error });
      }

      const { course_id, lesson_id } = req.body;
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      const objectName = sanitiseObjectName(`${req.user.user_id}/${course_id || 'general'}/${uuidv4()}.${ext}`);

      await minio.putObject(BUCKET_MATERIALS, objectName, req.file.buffer, req.file.size, {
        'Content-Type': req.file.mimetype,
      });

      res.status(201).json({
        material_url: `/${BUCKET_MATERIALS}/${objectName}`,
        original_name: req.file.originalname,
        size_bytes: req.file.size,
      });
    } catch (err) {
      logger.error({ event: 'material-upload-error', error: err.message });
      res.status(500).json({ error: 'erro ao fazer upload do material' });
    }
  },
);

// Gerar URL temporária (signed URL) para streaming protegido
app.get('/content/signed-url',
  authMiddleware,
  async (req, res) => {
    const { object, bucket } = req.query;
    if (!object || !bucket) return res.status(400).json({ error: 'object e bucket são obrigatórios' });

    const validBuckets = [BUCKET_VIDEOS, BUCKET_MATERIALS];
    if (!validBuckets.includes(bucket)) {
      return res.status(403).json({ error: 'bucket não permitido' });
    }

    try {
      const url = await minio.presignedGetObject(bucket, object, 3600);
      res.json({ signed_url: url, expires_in: 3600 });
    } catch (err) {
      res.status(500).json({ error: 'erro ao gerar URL' });
    }
  },
);

// ─── Validação de conteúdo (admin académico) ──────────────────────────────────
app.get('/content/pending',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    const { rows } = await db.query(
      `SELECT l.id, l.title, l.video_url, l.status, l.created_at,
              c.title as course_title, tp.full_name as teacher_name
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       JOIN teacher_profiles tp ON tp.id = c.teacher_id
       WHERE l.status = 'pending_review'
       ORDER BY l.created_at ASC LIMIT 50`,
    );
    res.json(rows);
  },
);

app.post('/content/lessons/:id/approve',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    const { id } = req.params;
    await db.query(
      `UPDATE lessons SET status = 'approved', updated_at = NOW() WHERE id = $1`, [id],
    );

    // Notificar professor
    notifyTeacher(id, 'approved');

    res.json({ message: 'aula aprovada com sucesso' });
  },
);

app.post('/content/lessons/:id/reject',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    await db.query(
      `UPDATE lessons SET status = 'rejected', rejection_reason = $1, updated_at = NOW() WHERE id = $2`,
      [reason || 'sem motivo especificado', id],
    );

    notifyTeacher(id, 'rejected', reason);

    res.json({ message: 'aula rejeitada' });
  },
);

async function notifyTeacher(lessonId, action, reason) {
  try {
    const notifURL = process.env.NOTIFICATION_SERVICE_URL;
    if (!notifURL) return;
    await axios.post(`${notifURL}/notify/internal`, {
      type: action === 'approved' ? 'lesson_approved' : 'lesson_rejected',
      lesson_id: lessonId,
      reason,
    });
  } catch (e) {
    logger.warn({ event: 'notify-failed', error: e.message });
  }
}

// ─── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'content' });
});

const PORT = process.env.PORT || 8085;

ensureBuckets().then(() => {
  app.listen(PORT, () => {
    logger.info({ message: `Content Service listening on :${PORT}` });
  });
}).catch(err => {
  logger.error({ message: 'startup error', error: err.message });
  process.exit(1);
});
