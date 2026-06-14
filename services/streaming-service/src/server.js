'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('ioredis');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

const server = http.createServer(app);

// Redis adapter para sincronizar entre workers do cluster
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
    adapter: createAdapter(pubClient, subClient),
    maxHttpBufferSize: 5e6,
  });

  // Autenticação via JWT no handshake do socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('token não fornecido'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('token inválido'));
    }
  });

  // ─── Namespace de aulas ao vivo ───────────────────────────────────────────
  const liveNS = io.of('/live');

  liveNS.use((socket, next) => {
    socket.user = socket.handshake.auth?.user || socket.user;
    next();
  });

  liveNS.on('connection', (socket) => {
    const { user } = socket;
    logger.info({ event: 'connected', userId: user?.user_id, socketId: socket.id });

    // Entrar na sala
    socket.on('join-room', async ({ roomId, sessionId }) => {
      if (!roomId) return socket.emit('error', { message: 'roomId obrigatório' });

      const roomKey = `room:${roomId}`;
      const participants = await pubClient.sMembers(roomKey);
      const maxParticipants = parseInt(process.env.MAX_ROOM_PARTICIPANTS || '50');

      if (participants.length >= maxParticipants) {
        return socket.emit('error', { message: 'sala cheia' });
      }

      socket.join(roomId);
      await pubClient.sAdd(roomKey, socket.id);
      await pubClient.expire(roomKey, 7200); // 2h TTL

      // Informar outros participantes
      socket.to(roomId).emit('participant-joined', {
        socketId: socket.id,
        userId: user?.user_id,
        role: user?.role,
        name: user?.email,
      });

      // Enviar lista de participantes actuais
      const currentParticipants = await pubClient.sMembers(roomKey);
      socket.emit('room-joined', {
        roomId,
        participants: currentParticipants,
        participantCount: currentParticipants.length,
      });

      logger.info({ event: 'room-joined', roomId, userId: user?.user_id });
    });

    // Sinalização WebRTC — offer
    socket.on('offer', ({ targetSocketId, offer }) => {
      liveNS.to(targetSocketId).emit('offer', {
        from: socket.id,
        offer,
      });
    });

    // Sinalização WebRTC — answer
    socket.on('answer', ({ targetSocketId, answer }) => {
      liveNS.to(targetSocketId).emit('answer', {
        from: socket.id,
        answer,
      });
    });

    // ICE candidates
    socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
      liveNS.to(targetSocketId).emit('ice-candidate', {
        from: socket.id,
        candidate,
      });
    });

    // Chat em tempo real
    socket.on('chat-message', async ({ roomId, message }) => {
      if (!message?.trim() || message.length > 2000) return;

      const chatMsg = {
        id: uuidv4(),
        from: socket.id,
        userId: user?.user_id,
        role: user?.role,
        message: message.trim(),
        timestamp: new Date().toISOString(),
      };

      // Persistir no Redis (últimas 200 msgs)
      const chatKey = `chat:${roomId}`;
      await pubClient.lPush(chatKey, JSON.stringify(chatMsg));
      await pubClient.lTrim(chatKey, 0, 199);
      await pubClient.expire(chatKey, 86400); // 24h

      liveNS.to(roomId).emit('chat-message', chatMsg);
    });

    // Levantar mão (interacção do aluno)
    socket.on('raise-hand', ({ roomId }) => {
      socket.to(roomId).emit('hand-raised', {
        socketId: socket.id,
        userId: user?.user_id,
      });
    });

    // Controlo de media (mute/unmute/camera on-off)
    socket.on('media-state', ({ roomId, audio, video }) => {
      socket.to(roomId).emit('participant-media-state', {
        socketId: socket.id,
        audio,
        video,
      });
    });

    // Screenshare
    socket.on('start-screenshare', ({ roomId }) => {
      socket.to(roomId).emit('screenshare-started', { socketId: socket.id });
    });

    socket.on('stop-screenshare', ({ roomId }) => {
      socket.to(roomId).emit('screenshare-stopped', { socketId: socket.id });
    });

    // Histórico de chat ao entrar
    socket.on('get-chat-history', async ({ roomId }) => {
      const msgs = await pubClient.lRange(`chat:${roomId}`, 0, 49);
      socket.emit('chat-history', msgs.map(m => JSON.parse(m)).reverse());
    });

    // Sair da sala
    socket.on('leave-room', ({ roomId }) => {
      leaveRoom(socket, roomId);
    });

    socket.on('disconnect', async () => {
      // Remover de todas as salas
      const rooms = [...socket.rooms].filter(r => r !== socket.id);
      for (const roomId of rooms) {
        await leaveRoom(socket, roomId);
      }
      logger.info({ event: 'disconnected', userId: user?.user_id });
    });
  });

  async function leaveRoom(socket, roomId) {
    socket.leave(roomId);
    await pubClient.sRem(`room:${roomId}`, socket.id);
    socket.to(roomId).emit('participant-left', {
      socketId: socket.id,
      userId: socket.user?.user_id,
    });
  }

  // ─── HTTP endpoints ────────────────────────────────────────────────────────
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'streaming', worker: process.pid });
  });

  app.get('/rooms/:roomId/participants', async (req, res) => {
    const count = await pubClient.sCard(`room:${req.params.roomId}`);
    res.json({ roomId: req.params.roomId, participant_count: count });
  });

  app.post('/rooms/:roomId/close', async (req, res) => {
    const { roomId } = req.params;
    await pubClient.del(`room:${roomId}`, `chat:${roomId}`);
    liveNS.to(roomId).emit('room-closed', { reason: 'aula encerrada' });
    res.json({ message: 'sala encerrada' });
  });

  const PORT = process.env.PORT || 8084;
  server.listen(PORT, () => {
    logger.info({ message: `Streaming worker ${process.pid} listening on :${PORT}` });
  });
}).catch(err => {
  logger.error({ message: 'Redis connection failed', error: err.message });
  process.exit(1);
});
