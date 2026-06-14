'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const nodemailer = require('nodemailer');
const webpush = require('web-push');
const { Pool } = require('pg');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const Handlebars = require('handlebars');
const winston = require('winston');

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
const redis = new Redis(process.env.REDIS_URL);

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      `mailto:${process.env.SMTP_USER || 'noreply@eduhub.test'}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
  } catch (err) {
    console.warn('[VAPID] Chave inválida — push notifications desactivadas:', err.message);
  }
}

// ─── Templates de email ────────────────────────────────────────────────────────
const emailTemplates = {
  session_scheduled: Handlebars.compile(`
    <h2>Aula Agendada!</h2>
    <p>Olá {{name}},</p>
    <p>A sua aula de <strong>{{discipline}}</strong> foi agendada para <strong>{{datetime}}</strong>.</p>
    <p>Professor: <strong>{{teacher_name}}</strong></p>
    <a href="{{join_url}}" style="background:#6366f1;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">
      Entrar na Aula
    </a>
    <p>Até breve! 🎓</p>
  `),
  session_reminder: Handlebars.compile(`
    <h2>Lembrete: Aula em 30 minutos!</h2>
    <p>Olá {{name}}, a sua aula começa em <strong>30 minutos</strong>.</p>
    <p>Disciplina: <strong>{{discipline}}</strong> | Professor: <strong>{{teacher_name}}</strong></p>
    <a href="{{join_url}}" style="background:#10b981;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">
      Entrar Agora
    </a>
  `),
  payment_confirmed: Handlebars.compile(`
    <h2>Pagamento Confirmado ✅</h2>
    <p>Olá {{name}}, o seu pagamento de <strong>{{amount}} MZN</strong> foi confirmado.</p>
    <p>Curso: <strong>{{course_title}}</strong></p>
    <p>Obrigado por escolher o EduHub!</p>
  `),
  new_feedback: Handlebars.compile(`
    <h2>Nova Avaliação Recebida ⭐</h2>
    <p>Olá {{name}}, recebeu uma nova avaliação de <strong>{{rating}} estrelas</strong>.</p>
    <p>Comentário: "{{comment}}"</p>
  `),
  lesson_approved: Handlebars.compile(`
    <h2>Aula Aprovada ✅</h2>
    <p>Olá {{name}}, a sua aula <strong>{{lesson_title}}</strong> foi aprovada e já está disponível.</p>
  `),
  lesson_rejected: Handlebars.compile(`
    <h2>Aula Não Aprovada ❌</h2>
    <p>Olá {{name}}, a sua aula <strong>{{lesson_title}}</strong> não foi aprovada.</p>
    <p>Motivo: {{reason}}</p>
    <p>Por favor, revise e submeta novamente.</p>
  `),
  welcome: Handlebars.compile(`
    <h2>Bem-vindo ao EduHub! 🎓</h2>
    <p>Olá {{name}},</p>
    <p>A sua conta foi criada com sucesso. Comece a explorar os melhores professores da plataforma!</p>
    <a href="{{frontend_url}}/diagnostic" style="background:#6366f1;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">
      Fazer Diagnóstico de Nível
    </a>
  `),
  email_verification: Handlebars.compile(`
    <h2>Verifique o seu email 📧</h2>
    <p>Olá, obrigado por se registar no EduHub!</p>
    <p>Clique no botão abaixo para verificar o seu endereço de email:</p>
    <a href="{{verification_url}}" style="background:#6366f1;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">
      Verificar Email
    </a>
    <p>Este link expira em 24 horas. Se não criou uma conta, ignore este email.</p>
  `),
  password_reset: Handlebars.compile(`
    <h2>Recuperação de Password 🔐</h2>
    <p>Recebemos um pedido para redefinir a password da sua conta EduHub.</p>
    <a href="{{reset_url}}" style="background:#ef4444;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">
      Redefinir Password
    </a>
    <p>Este link expira em <strong>{{expires_in}}</strong>. Se não solicitou este pedido, ignore este email.</p>
  `),
};

// ─── Funções de envio ──────────────────────────────────────────────────────────
async function sendEmail(to, subject, templateKey, data) {
  const template = emailTemplates[templateKey];
  if (!template) {
    logger.warn({ event: 'unknown-template', templateKey });
    return;
  }
  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html: template(data),
    });
    logger.info({ event: 'email-sent', to, templateKey });
  } catch (err) {
    logger.error({ event: 'email-error', error: err.message, to, templateKey });
  }
}

async function sendPushNotification(userID, title, body, data = {}) {
  const subscriptionStr = await redis.get(`push_sub:${userID}`);
  if (!subscriptionStr) return;
  try {
    const subscription = JSON.parse(subscriptionStr);
    await webpush.sendNotification(subscription, JSON.stringify({ title, body, data }));
    logger.info({ event: 'push-sent', userID });
  } catch (err) {
    if (err.statusCode === 410) {
      await redis.del(`push_sub:${userID}`);
    }
    logger.warn({ event: 'push-failed', userID, error: err.message });
  }
}

async function saveInAppNotification(userID, type, title, body, data = {}) {
  await db.query(
    `INSERT INTO notifications (user_id, type, title, body, data, channel)
     VALUES ($1, $2, $3, $4, $5, 'in_app')`,
    [userID, type, title, body, JSON.stringify(data)],
  );
}

// ─── Handlers de notificação por tipo ─────────────────────────────────────────
const notificationHandlers = {
  async session_scheduled({ session, student, teacher }) {
    await sendEmail(student.email, 'Aula Agendada - EduHub', 'session_scheduled', {
      name: student.name,
      discipline: session.discipline,
      datetime: new Date(session.scheduled_at).toLocaleString('pt-PT', { timeZone: 'Africa/Maputo' }),
      teacher_name: teacher.name,
      join_url: session.join_url || `${process.env.FRONTEND_URL}/session/${session.id}`,
    });
    await sendPushNotification(student.id, 'Aula Agendada!', `${session.discipline} com ${teacher.name}`);
    await saveInAppNotification(student.id, 'session_scheduled', 'Aula Agendada', `Aula de ${session.discipline} agendada`, session);
  },

  async session_reminder({ session, student, teacher }) {
    await sendEmail(student.email, '⏰ Sua aula começa em 30 minutos', 'session_reminder', {
      name: student.name,
      discipline: session.discipline,
      teacher_name: teacher.name,
      join_url: session.join_url || `${process.env.FRONTEND_URL}/session/${session.id}`,
    });
    await sendPushNotification(student.id, '⏰ Aula em 30 minutos!', `${session.discipline} com ${teacher.name}`);
  },

  async payment_confirmed({ transaction, student, course }) {
    await sendEmail(student.email, 'Pagamento Confirmado - EduHub', 'payment_confirmed', {
      name: student.name,
      amount: transaction.gross_amount.toFixed(2),
      course_title: course.title,
    });
    await saveInAppNotification(student.id, 'payment_confirmed', 'Pagamento Confirmado', `Acesso liberado: ${course.title}`, transaction);
  },

  async new_feedback({ feedback, teacher }) {
    await sendEmail(teacher.email, 'Nova Avaliação Recebida - EduHub', 'new_feedback', {
      name: teacher.name,
      rating: feedback.rating,
      comment: feedback.comment || 'Sem comentário',
    });
    await saveInAppNotification(teacher.id, 'new_feedback', 'Nova Avaliação', `${feedback.rating}⭐ recebida`, feedback);
  },

  async lesson_approved({ lesson, teacher }) {
    await sendEmail(teacher.email, 'Aula Aprovada - EduHub', 'lesson_approved', {
      name: teacher.name,
      lesson_title: lesson.title,
    });
    await saveInAppNotification(teacher.id, 'lesson_approved', 'Aula Aprovada ✅', lesson.title, lesson);
  },

  async lesson_rejected({ lesson, teacher, reason }) {
    await sendEmail(teacher.email, 'Aula Não Aprovada - EduHub', 'lesson_rejected', {
      name: teacher.name,
      lesson_title: lesson.title,
      reason: reason || 'Conteúdo não cumpre os requisitos',
    });
    await saveInAppNotification(teacher.id, 'lesson_rejected', 'Aula Não Aprovada ❌', lesson.title, { reason });
  },

  async welcome({ user }) {
    await sendEmail(user.email, 'Bem-vindo ao EduHub! 🎓', 'welcome', {
      name: user.name || user.email,
      frontend_url: process.env.FRONTEND_URL,
    });
  },

  async email_verification({ user, verification_url }) {
    await sendEmail(user.email, 'Verifique o seu email - EduHub', 'email_verification', {
      verification_url,
    });
  },

  async password_reset({ user, reset_url, expires_in }) {
    await sendEmail(user.email, 'Recuperação de Password - EduHub', 'password_reset', {
      reset_url,
      expires_in: expires_in || '1 hora',
    });
  },
};

// ─── Auth ──────────────────────────────────────────────────────────────────────
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

// ─── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notification' }));

// Endpoint interno para outros serviços dispararem notificações
app.post('/notify/internal', async (req, res) => {
  const { type, ...payload } = req.body;
  const handler = notificationHandlers[type];
  if (!handler) {
    return res.status(400).json({ error: `tipo de notificação desconhecido: ${type}` });
  }
  try {
    await handler(payload);
    res.json({ sent: true });
  } catch (err) {
    logger.error({ event: 'notify-error', type, error: err.message });
    res.status(500).json({ error: 'erro ao enviar notificação' });
  }
});

// Registar subscription de Web Push
app.post('/push/subscribe', authMiddleware, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ error: 'subscription obrigatória' });
  await redis.set(`push_sub:${req.user.user_id}`, JSON.stringify(subscription), 'EX', 30 * 24 * 3600);
  res.json({ subscribed: true });
});

// Notificações in-app do utilizador
app.get('/notifications', authMiddleware, async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, type, title, body, data, is_read, created_at
     FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.user.user_id],
  );
  res.json(rows);
});

// Marcar como lida
app.post('/notifications/:id/read', authMiddleware, async (req, res) => {
  await db.query(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.user_id],
  );
  res.json({ read: true });
});

// Marcar todas como lidas
app.post('/notifications/read-all', authMiddleware, async (req, res) => {
  await db.query(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND is_read = FALSE`,
    [req.user.user_id],
  );
  res.json({ read: true });
});

// Contagem de não lidas
app.get('/notifications/unread-count', authMiddleware, async (req, res) => {
  const { rows } = await db.query(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [req.user.user_id],
  );
  res.json({ count: parseInt(rows[0].count) });
});

const PORT = process.env.PORT || 8087;
app.listen(PORT, () => {
  logger.info({ message: `Notification Service listening on :${PORT}` });
});
