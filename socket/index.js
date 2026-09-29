const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing auth token'));
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.user = { id: payload.sub, username: payload.username };
      next();
    } catch {
      next(new Error('Invalid auth token'));
    }
  });

  const onlineTrainers = new Map();

  io.on('connection', (socket) => {
    console.log('[socket] connected', socket.id, 'user:', socket.user?.username);

    socket.on('register', ({ role, trainerId, name }) => {
      socket.role = role;
      socket.trainerId = trainerId || null;
      socket.name = name || 'Unknown';

      if (role === 'trainer' && trainerId) {
        if (!onlineTrainers.has(trainerId)) onlineTrainers.set(trainerId, new Set());
        onlineTrainers.get(trainerId).add(socket.id);
        io.emit('trainer:online', { trainerId, online: true });
      }

      if (role === 'panel') {
        socket.join('panel');
        socket.emit('trainer:onlineList', Array.from(onlineTrainers.keys()));
      }
    });

    socket.on('message:send', async ({ trainerId, senderType, senderName, message }, ack) => {
      try {
        if (!trainerId || !message?.trim()) {
          return ack?.({ ok: false, error: 'Missing trainerId or message' });
        }

        const [result] = await pool.query(
          `INSERT INTO chat_messages (trainer_id, sender_type, sender_name, message)
           VALUES (?, ?, ?, ?)`,
          [trainerId, senderType, senderName, message.trim()]
        );

        const payload = {
          id: result.insertId,
          trainerId,
          senderType,
          senderName,
          message: message.trim(),
          isRead: false,
          createdAt: new Date().toISOString(),
        };

        io.to('panel').emit('message:new', payload);
        const trainerSockets = onlineTrainers.get(Number(trainerId));
        if (trainerSockets) {
          trainerSockets.forEach((sid) => io.to(sid).emit('message:new', payload));
        }

        ack?.({ ok: true, payload });
      } catch (err) {
        console.error('[socket message:send]', err);
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('message:read', async ({ trainerId, readerType }) => {
      try {
        const fromType = readerType === 'panel' ? 'trainer' : 'panel';
        await pool.query(
          `UPDATE chat_messages
           SET is_read = 1
           WHERE trainer_id = ? AND sender_type = ? AND is_read = 0`,
          [trainerId, fromType]
        );

        io.to('panel').emit('message:read', { trainerId, readerType });
        const trainerSockets = onlineTrainers.get(Number(trainerId));
        if (trainerSockets) {
          trainerSockets.forEach((sid) =>
            io.to(sid).emit('message:read', { trainerId, readerType })
          );
        }
      } catch (err) {
        console.error('[socket message:read]', err);
      }
    });

    socket.on('disconnect', () => {
      if (socket.role === 'trainer' && socket.trainerId) {
        const set = onlineTrainers.get(socket.trainerId);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) {
            onlineTrainers.delete(socket.trainerId);
            io.emit('trainer:online', { trainerId: socket.trainerId, online: false });
          }
        }
      }
    });
  });

  return io;
}

module.exports = { initSocket };