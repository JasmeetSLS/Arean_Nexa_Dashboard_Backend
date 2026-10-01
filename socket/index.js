const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // ---- Authenticate every socket ----
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

  // ---- Online maps ----
  const onlineTrainers = new Map();   // trainerId → Set<socketId>
  const onlinePanels   = new Set();

  const emitToTrainer = (trainerId, event, payload) => {
    const set = onlineTrainers.get(Number(trainerId));
    if (!set) return;
    set.forEach((sid) => io.to(sid).emit(event, payload));
  };

  io.on('connection', (socket) => {
    console.log('[socket] connected', socket.id, 'user:', socket.user?.username);

    // =================================================================
    // REGISTER
    // =================================================================
    socket.on('register', ({ role, trainerId, name }) => {
      socket.role      = role;                            // 'panel' | 'trainer'
      socket.trainerId = trainerId ? Number(trainerId) : null;
      socket.name      = name || 'Unknown';

      if (role === 'trainer' && socket.trainerId) {
        if (!onlineTrainers.has(socket.trainerId)) {
          onlineTrainers.set(socket.trainerId, new Set());
        }
        onlineTrainers.get(socket.trainerId).add(socket.id);

        io.emit('trainer:online', { trainerId: socket.trainerId, online: true });
      }

      if (role === 'panel') {
        socket.join('panel');
        onlinePanels.add(socket.id);
        socket.emit('trainer:onlineList', Array.from(onlineTrainers.keys()));
      }
    });

    // =================================================================
    // SEND MESSAGE
    //   payload: {
    //     senderType, senderId, senderName,
    //     receiverType, receiverId,
    //     message
    //   }
    // =================================================================
    socket.on('message:send', async (payload, ack) => {
      try {
        const {
          senderType, senderId, senderName,
          receiverType, receiverId,
          message,
        } = payload || {};

        if (!senderType || !senderId || !receiverType || !receiverId || !message?.trim()) {
          return ack?.({ ok: false, error: 'Missing fields' });
        }

        const [result] = await pool.query(
          `INSERT INTO chat_messages
             (sender_type, sender_id, receiver_type, receiver_id, message)
           VALUES (?, ?, ?, ?, ?)`,
          [senderType, senderId, receiverType, receiverId, message.trim()]
        );

        const saved = {
          id:            result.insertId,
          senderType,
          senderId,
          receiverType,
          receiverId,
          senderName,
          message:       message.trim(),
          isRead:        false,
          createdAt:     new Date().toISOString(),
        };

        // ---------------------------------------------------------------
        // 1️⃣  Route to the RECEIVER
        //     (use socket.to to avoid echoing to the sender twice)
        // ---------------------------------------------------------------
        if (receiverType === 'command') {
          socket.to('panel').emit('message:new', saved);
        } else if (receiverType === 'trainer') {
          emitToTrainer(receiverId, 'message:new', saved);
        }

        // ---------------------------------------------------------------
        // 2️⃣  ALSO echo to the SENDER'S OWN side
        //     so their UI updates live even if the receiver is offline
        // ---------------------------------------------------------------
        if (senderType === 'command') {
          io.to('panel').emit('message:new', saved);
        } else if (senderType === 'trainer') {
          emitToTrainer(senderId, 'message:new', saved);
        }

        ack?.({ ok: true, payload: saved });
      } catch (err) {
        console.error('[socket message:send]', err);
        ack?.({ ok: false, error: err.message });
      }
    });

    // =================================================================
    // MARK READ
    //   payload: { trainerId, readerType: 'panel' | 'trainer' }
    // =================================================================
    socket.on('message:read', async ({ trainerId, readerType }) => {
      try {
        const tid = Number(trainerId);
        if (!tid) return;

        if (readerType === 'panel') {
          await pool.query(
            `UPDATE chat_messages
                SET is_read = 1
              WHERE sender_type = 'trainer'
                AND sender_id = ?
                AND receiver_type = 'command'
                AND is_read = 0`,
            [tid]
          );
        } else {
          await pool.query(
            `UPDATE chat_messages
                SET is_read = 1
              WHERE sender_type = 'command'
                AND receiver_type = 'trainer'
                AND receiver_id = ?
                AND is_read = 0`,
            [tid]
          );
        }

        io.to('panel').emit('message:read', { trainerId: tid, readerType });
        emitToTrainer(tid, 'message:read', { trainerId: tid, readerType });
      } catch (err) {
        console.error('[socket message:read]', err);
      }
    });

    // =================================================================
    // DISCONNECT
    // =================================================================
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
      if (socket.role === 'panel') {
        onlinePanels.delete(socket.id);
      }
    });
  });

  return io;
}

module.exports = { initSocket };