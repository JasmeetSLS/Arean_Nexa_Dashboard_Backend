const { Server } = require('socket.io');
const pool       = require('../config/db');
const JWTUtils   = require('../utils/jwt.util');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  });

  // ---- handshake auth ----
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token;

      if (!token) return next(new Error('Token required'));

      const decoded = JWTUtils.verifyToken(token);

      socket.user = {
        userId:   decoded.userId || decoded.sub,
        type:     decoded.type || 'admin',
        username: decoded.username,
      };

      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, type } = socket.user;
    socket.join(`${type}:${userId}`);
    console.log(`[socket] ${type}:${userId} connected`);

    // ---- STEP 6: send_message ----
    socket.on('send_message', async (payload, ack) => {
      try {
        const { peerId, message } = payload || {};
        const toType = type === 'admin' ? 'trainer' : 'admin';

        if (!peerId || !message?.trim()) {
          return ack?.({ ok: false, error: 'Invalid payload' });
        }

        const [ins] = await pool.query(
          `INSERT INTO chat_messages
             (sender_type, sender_id, receiver_type, receiver_id, message)
           VALUES (?, ?, ?, ?, ?)`,
          [type, userId, toType, peerId, message.trim()]
        );

        const row = {
          id:             ins.insertId,
          conversationId: peerId,
          sender_type:    type,
          sender_id:      userId,
          receiver_type:  toType,
          receiver_id:    peerId,
          message:        message.trim(),
          is_read:        0,
          created_at:     new Date().toISOString(),
        };

        // STEP 7: receive_message
        socket.emit('receive_message', row);
        io.to(`${toType}:${peerId}`).emit('receive_message', row);

        ack?.({ ok: true, data: row });
      } catch (err) {
        console.error('[socket send_message]', err);
        ack?.({ ok: false, error: err.message });
      }
    });

    // ---- STEP 8: typing ----
    socket.on('typing', ({ peerId, isTyping }) => {
      const toType = type === 'admin' ? 'trainer' : 'admin';
      if (!peerId) return;
      io.to(`${toType}:${peerId}`).emit('typing', {
        fromType: type,
        fromId:   userId,
        peerId,
        isTyping: !!isTyping,
      });
    });

    // ---- STEP 9: message_read ----
    socket.on('message_read', async ({ peerId }, ack) => {
      try {
        const fromType = type === 'admin' ? 'trainer' : 'admin';
        if (!peerId) return ack?.({ ok: false, error: 'peerId required' });

        await pool.query(
          `UPDATE chat_messages SET is_read = 1
            WHERE receiver_type = ? AND receiver_id = ?
              AND sender_type  = ? AND sender_id  = ?
              AND is_read = 0`,
          [type, userId, fromType, peerId]
        );

        io.to(`${fromType}:${peerId}`).emit('message_read', {
          byType: type,
          byId:   userId,
          peerId,
        });

        ack?.({ ok: true });
      } catch (err) {
        console.error('[socket message_read]', err);
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[socket] ${type}:${userId} disconnected`);
    });
  });

  return io;
}

module.exports = { initSocket };