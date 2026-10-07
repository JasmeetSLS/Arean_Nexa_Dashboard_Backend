const { Server } = require('socket.io');
const jwt  = require('jsonwebtoken');
const pool = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

let io = null;

const trainerRoom = (id) => `trainer:${id}`;
const ADMIN_ROOM  = 'admins';

const normalizeRow = (r) => ({
  id:           r.id,
  senderType:   r.sender_type,
  senderId:     r.sender_id,
  receiverType: r.receiver_type,
  receiverId:   r.receiver_id,
  message:      r.message,
  isRead:       !!r.is_read,
  createdAt:    r.created_at,
});

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) return next(new Error('Missing token'));

      const payload = jwt.verify(token, JWT_SECRET);
      socket.user = {
        id:       payload.sub,
        username: payload.username,
        name:     payload.name || payload.username,
        type:     payload.type || 'admin',
      };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const user    = socket.user;
    const isAdmin = user.type === 'admin';

    if (isAdmin) socket.join(ADMIN_ROOM);
    else         socket.join(trainerRoom(user.id));

    socket.on('chat:join', ({ trainerId }) => {
      if (!trainerId) return;
      if (isAdmin || Number(trainerId) === Number(user.id)) {
        socket.join(trainerRoom(trainerId));
      }
    });

    socket.on('chat:leave', ({ trainerId }) => {
      if (trainerId) socket.leave(trainerRoom(trainerId));
    });

    socket.on('chat:send', async (payload, ack) => {
      try {
        const trainerId = Number(payload?.trainerId);
        const message   = String(payload?.message || '').trim();
        if (!trainerId || !message) {
          return ack?.({ ok: false, error: 'Invalid payload' });
        }
        if (!isAdmin && trainerId !== Number(user.id)) {
          return ack?.({ ok: false, error: 'Forbidden' });
        }

        const sender_type   = isAdmin ? 'admin'   : 'trainer';
        const sender_id     = isAdmin ? user.id   : trainerId;
        const receiver_type = isAdmin ? 'trainer' : 'admin';
        const receiver_id   = isAdmin ? trainerId : user.id;

        const [r] = await pool.query(
          `INSERT INTO chat_messages
             (sender_type, sender_id, receiver_type, receiver_id, message)
           VALUES (?, ?, ?, ?, ?)`,
          [sender_type, sender_id, receiver_type, receiver_id, message]
        );

        const [rows] = await pool.query(
          `SELECT id, sender_type, sender_id, receiver_type, receiver_id,
                  message, is_read, created_at
             FROM chat_messages WHERE id = ?`,
          [r.insertId]
        );
        const saved = normalizeRow(rows[0]);

        io.to(trainerRoom(trainerId)).emit('chat:new', saved);
        io.to(ADMIN_ROOM).emit('chat:new', saved);

        if (sender_type === 'trainer') {
          const [unread] = await pool.query(
            `SELECT COUNT(*) AS n FROM chat_messages
              WHERE sender_type = 'trainer' AND sender_id = ?
                AND receiver_type = 'admin' AND is_read = 0`,
            [trainerId]
          );
          io.to(ADMIN_ROOM).emit('chat:unread', { trainerId, unread: unread[0].n });
        } else {
          const [unread] = await pool.query(
            `SELECT COUNT(*) AS n FROM chat_messages
              WHERE sender_type = 'admin'
                AND receiver_type = 'trainer' AND receiver_id = ?
                AND is_read = 0`,
            [trainerId]
          );
          io.to(trainerRoom(trainerId)).emit('chat:unread', { trainerId, unread: unread[0].n });
        }

        ack?.({ ok: true, message: saved });
      } catch (err) {
        console.error('[socket chat:send]', err);
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('chat:read', async ({ trainerId }) => {
      try {
        trainerId = Number(trainerId);
        if (!trainerId) return;
        if (!isAdmin && trainerId !== Number(user.id)) return;

        if (isAdmin) {
          await pool.query(
            `UPDATE chat_messages SET is_read = 1
              WHERE sender_type = 'trainer' AND sender_id = ?
                AND receiver_type = 'admin' AND is_read = 0`,
            [trainerId]
          );
        } else {
          await pool.query(
            `UPDATE chat_messages SET is_read = 1
              WHERE sender_type = 'admin'
                AND receiver_type = 'trainer' AND receiver_id = ?
                AND is_read = 0`,
            [trainerId]
          );
        }

        const [unread] = await pool.query(
          `SELECT COUNT(*) AS n FROM chat_messages
            WHERE sender_type = 'trainer' AND sender_id = ?
              AND receiver_type = 'admin' AND is_read = 0`,
          [trainerId]
        );

        io.to(ADMIN_ROOM).emit('chat:unread', { trainerId, unread: unread[0].n });
        io.to(trainerRoom(trainerId)).emit('chat:read', { trainerId });
      } catch (err) {
        console.error('[socket chat:read]', err);
      }
    });

    socket.on('chat:typing', ({ trainerId, isTyping }) => {
      if (!trainerId) return;
      socket.to(trainerRoom(trainerId)).emit('chat:typing', {
        trainerId: Number(trainerId),
        from:      isAdmin ? 'admin' : 'trainer',
        isTyping:  !!isTyping,
      });
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

module.exports = { initSocket, getIO: () => io };