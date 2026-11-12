const { Server } = require('socket.io');
const pool       = require('../config/db');
const JWTUtils   = require('../utils/jwt.util');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  });

  /* ── auth handshake ── */
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token;

      if (!token) return next(new Error('Token required'));

      const decoded = JWTUtils.verifyToken(token);

      socket.user = {
        username: decoded.username,
        type:     decoded.type || 'admin',
      };

      if (!socket.user.username) {
        return next(new Error('Invalid token payload: missing username'));
      }
      next();
    } catch (e) {
      next(new Error('Invalid token'));
    }
  });

  /* ── connection ── */
  io.on('connection', (socket) => {
    const { username, type } = socket.user;
    const otherType = type === 'admin' ? 'trainer' : 'admin';

    socket.join(`${type}:${username}`);   // rooms keyed by username

    /* send_message */
    socket.on('send_message', async (payload, ack) => {
      try {
        const peerUsername = (payload?.peerUsername || '').trim();
        const text         = (payload?.message || '').trim();

        if (!peerUsername || !text) {
          return ack?.({ ok: false, error: 'Invalid payload' });
        }

        const [ins] = await pool.query(
          `INSERT INTO chat_messages
             (sender_type, sender_username, receiver_type, receiver_username, message)
           VALUES (?, ?, ?, ?, ?)`,
          [type, username, otherType, peerUsername, text]
        );

        const row = {
          id:                ins.insertId,
          sender_type:       type,
          sender_username:   username,
          receiver_type:     otherType,
          receiver_username: peerUsername,
          message:           text,
          is_read:           0,
          created_at:        new Date().toISOString(),
        };

        // ✅ FIXED: Emit to the sender's room (updates all tabs of the sender)
        // and the receiver's room.
        io.to(`${type}:${username}`).emit('receive_message', row);
        io.to(`${otherType}:${peerUsername}`).emit('receive_message', row);

        ack?.({ ok: true, data: row });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    /* typing */
    socket.on('typing', ({ peerUsername, isTyping }) => {
      if (!peerUsername) return;
      io.to(`${otherType}:${peerUsername}`).emit('typing', {
        fromType:     type,
        fromUsername: username,
        isTyping:     !!isTyping,
      });
    });

    /* message_read */
    socket.on('message_read', async ({ peerUsername }, ack) => {
      try {
        if (!peerUsername) return ack?.({ ok: false, error: 'peerUsername required' });

        await pool.query(
          `UPDATE chat_messages SET is_read = 1
            WHERE receiver_type = ? AND receiver_username = ?
              AND sender_type   = ? AND sender_username   = ?
              AND is_read = 0`,
          [type, username, otherType, peerUsername]
        );

        io.to(`${otherType}:${peerUsername}`).emit('message_read', {
          byType:       type,
          byUsername:   username,
          peerUsername: username,
        });

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

module.exports = { initSocket };