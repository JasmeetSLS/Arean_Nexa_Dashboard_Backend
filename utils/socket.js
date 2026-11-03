const { Server } = require('socket.io');
const pool       = require('../config/db');
const JWTUtils   = require('../utils/jwt.util');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  });

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

      if (!socket.user.userId) {
        return next(new Error('Invalid token payload: missing userId'));
      }
      next();
    } catch (e) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.userId;
    const type   = socket.user.type;

    let otherType;
    if (type === 'admin') otherType = 'trainer';
    else                  otherType = 'admin';

    const myRoom = `${type}:${userId}`;
    socket.join(myRoom);

    socket.on('send_message', async (payload, ack) => {
      try {
        const peerId = Number(payload?.peerId);
        const text   = (payload?.message || '').trim();

        if (!peerId || !text) {
          return ack?.({ ok: false, error: 'Invalid payload' });
        }

        const [ins] = await pool.query(
          `INSERT INTO chat_messages
             (sender_type, sender_id, receiver_type, receiver_id, message)
           VALUES (?, ?, ?, ?, ?)`,
          [type, userId, otherType, peerId, text]
        );

        const row = {
          id:            ins.insertId,
          sender_type:   type,
          sender_id:     userId,
          receiver_type: otherType,
          receiver_id:   peerId,
          message:       text,
          is_read:       0,
          created_at:    new Date().toISOString(),
        };

        const targetRoom = `${otherType}:${peerId}`;

        socket.emit('receive_message', row);
        io.to(targetRoom).emit('receive_message', row);

        ack?.({ ok: true, data: row });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('typing', ({ peerId, isTyping }) => {
      if (!peerId) return;
      io.to(`${otherType}:${peerId}`).emit('typing', {
        fromType: type,
        fromId:   userId,
        peerId,
        isTyping: !!isTyping,
      });
    });

    socket.on('message_read', async ({ peerId }, ack) => {
      try {
        if (!peerId) return ack?.({ ok: false, error: 'peerId required' });

        await pool.query(
          `UPDATE chat_messages SET is_read = 1
            WHERE receiver_type = ? AND receiver_id = ?
              AND sender_type  = ? AND sender_id  = ?
              AND is_read = 0`,
          [type, userId, otherType, peerId]
        );

        io.to(`${otherType}:${peerId}`).emit('message_read', {
          byType: type,
          byId:   userId,
          peerId,
        });

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      // Disconnected
    });
  });

  return io;
}

module.exports = { initSocket };