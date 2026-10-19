const { Server } = require('socket.io');
const pool       = require('../config/db');
const JWTUtils   = require('../utils/jwt.util');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  });

  // ============================================================
  // 🔍 NEW — engine-level errors (this is what catches the 400)
  // ============================================================
  io.engine.on('connection_error', (err) => {
    console.log('========================================');
    console.log('[socket engine error]');
    console.log('  code      :', err.code);
    console.log('  message   :', err.message);
    console.log('  context   :', err.context);
    console.log('  req.url   :', err.req?.url);
    console.log('  req.method:', err.req?.method);
    console.log('  req.headers:', err.req?.headers);
    console.log('========================================');
  });

  console.log('[socket] initSocket called — engine listeners attached');

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token;
      console.log('[socket auth] handshake token present?', !!token);
      if (!token) return next(new Error('Token required'));

      const decoded = JWTUtils.verifyToken(token);
      console.log('[socket auth] decoded JWT =', decoded);

      socket.user = {
        userId:   decoded.userId || decoded.sub,
        type:     decoded.type || 'admin',
        username: decoded.username,
      };

      console.log('[socket auth] resolved socket.user =', socket.user, '| typeof userId =', typeof socket.user.userId);

      if (!socket.user.userId) {
        console.error('[socket auth] ❌ decoded JWT has NO userId/sub!');
        return next(new Error('Invalid token payload: missing userId'));
      }
      next();
    } catch (e) {
      console.error('[socket auth] verifyToken failed:', e.message);
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

    // ============================================================
    // 🔍 NEW — join global notification room
    // ============================================================
    socket.join(`user:${userId}`);

    console.log('========================================');
    console.log('[socket connect] socketId =', socket.id);
    console.log('[socket connect] user     =', socket.user);
    console.log('[socket connect] joined room:', myRoom, '| user room: user:' + userId);
    console.log('[socket connect] transport:', socket.conn.transport.name);
    console.log('[socket connect] otherType:', otherType);
    console.log('========================================');

    socket.on('send_message', async (payload, ack) => {
      console.log('[socket send_message] from', { type, userId }, '| payload =', payload);

      try {
        const peerId = Number(payload?.peerId);
        const text   = (payload?.message || '').trim();

        console.log('[socket send_message] parsed:', { peerId, typeofPeer: typeof peerId, text, otherType });

        if (!peerId || !text) {
          console.warn('[socket send_message] ❌ invalid payload');
          return ack?.({ ok: false, error: 'Invalid payload' });
        }

        const [ins] = await pool.query(
          `INSERT INTO chat_messages
             (sender_type, sender_id, receiver_type, receiver_id, message)
           VALUES (?, ?, ?, ?, ?)`,
          [type, userId, otherType, peerId, text]
        );

        console.log('[socket send_message] ✅ inserted id =', ins.insertId);

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
        console.log('[socket send_message] emitting receive_message → sender room', myRoom, 'and peer room', targetRoom);

        socket.emit('receive_message', row);
        io.to(targetRoom).emit('receive_message', row);

        // ============================================================
        // 🔍 NEW — realtime dashboard/notification signal to recipient
        // ============================================================
        io.to(`user:${peerId}`).emit('data:changed', {
          scope:    'chat',
          peerId:   userId,
          peerType: type,
          message:  row,
        });

        ack?.({ ok: true, data: row });
      } catch (err) {
        console.error('[socket send_message] ❌', err);
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('typing', ({ peerId, isTyping }) => {
      console.log('[socket typing] from', { type, userId }, '→ peer', peerId, 'isTyping:', isTyping);
      if (!peerId) return;
      io.to(`${otherType}:${peerId}`).emit('typing', {
        fromType: type,
        fromId:   userId,
        peerId,
        isTyping: !!isTyping,
      });
    });

    socket.on('message_read', async ({ peerId }, ack) => {
      console.log('[socket message_read] from', { type, userId }, '→ peer', peerId);
      try {
        if (!peerId) return ack?.({ ok: false, error: 'peerId required' });

        const [result] = await pool.query(
          `UPDATE chat_messages SET is_read = 1
            WHERE receiver_type = ? AND receiver_id = ?
              AND sender_type  = ? AND sender_id  = ?
              AND is_read = 0`,
          [type, userId, otherType, peerId]
        );

        console.log('[socket message_read] updated rows =', result.affectedRows);

        io.to(`${otherType}:${peerId}`).emit('message_read', {
          byType: type,
          byId:   userId,
          peerId,
        });

        ack?.({ ok: true });
      } catch (err) {
        console.error('[socket message_read] ❌', err);
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket disconnect]', socket.id, '| reason:', reason);
    });
  });

  return io;
}

module.exports = { initSocket };