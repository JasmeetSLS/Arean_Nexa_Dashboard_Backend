const pool = require('../../config/db');
const { getIO } = require('../../socket');

// =====================================================================
// Inlined helpers
// =====================================================================
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

const threadTrainerId = (row) =>
  row.sender_type === 'trainer' ? row.sender_id : row.receiver_id;

// =====================================================================
// GET /api/chatbot/me
// =====================================================================
exports.chatbotMe = async (req, res) => {
  try {
    const { id, type, username, name } = req.user;

    let photoUrl = null;
    if (type === 'trainer') {
      const [[row]] = await pool.query(
        `SELECT photo_url FROM trainers WHERE id = ? LIMIT 1`,
        [id]
      );
      photoUrl = row?.photo_url || null;
    }

    res.json({
      success: true,
      user: {
        id,
        type,
        username: username || null,
        name:     name || username || (type === 'admin' ? 'Admin' : 'Trainer'),
        photoUrl,
      },
    });
  } catch (err) {
    console.error('[chat.chatbotMe]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/chat/summary
// =====================================================================
exports.getChatSummary = async (_req, res) => {
  try {
    const [trainers] = await pool.query(`
      SELECT id, name, photo_url
      FROM trainers
      ORDER BY name
    `);

    const [unreadRows] = await pool.query(`
      SELECT sender_id AS trainer_id, COUNT(*) AS unread
      FROM chat_messages
      WHERE sender_type = 'trainer'
        AND receiver_type = 'admin'
        AND is_read = 0
      GROUP BY sender_id
    `);

    const [lastRows] = await pool.query(`
      SELECT m.*
      FROM chat_messages m
      JOIN (
        SELECT
          CASE WHEN sender_type = 'trainer' THEN sender_id ELSE receiver_id END AS tid,
          MAX(id) AS maxId
        FROM chat_messages
        WHERE sender_type = 'trainer' OR receiver_type = 'trainer'
        GROUP BY tid
      ) x ON x.maxId = m.id
    `);

    const unreadMap = new Map(unreadRows.map((r) => [r.trainer_id, r.unread]));
    const lastMap   = new Map(lastRows.map((r) => [threadTrainerId(r), r]));

    const list = trainers.map((t) => {
      const last = lastMap.get(t.id);
      return {
        id:       t.id,
        name:     t.name,
        photoUrl: t.photo_url,
        unread:   unreadMap.get(t.id) || 0,
        preview:  last ? last.message : '',
        lastAt:   last ? last.created_at : null,
        lastFrom: last ? last.sender_type : null,
      };
    });

    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      totalTrainers: list.length,
      trainers: list,
    });
  } catch (err) {
    console.error('[chat.getChatSummary]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/chat/admins
// =====================================================================
exports.getAllAdmins = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, username AS name
      FROM admin
      WHERE status = 'active'
      ORDER BY id
    `);
    res.json({
      success: true,
      total: rows.length,
      admins: rows.map((r) => ({ id: r.id, name: r.name })),
    });
  } catch (err) {
    console.error('[chat.getAllAdmins]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/chat/trainers
// =====================================================================
exports.getAllTrainers = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, photo_url
      FROM trainers
      ORDER BY name
    `);
    res.json({
      success: true,
      total: rows.length,
      trainers: rows.map((r) => ({
        id: r.id,
        name: r.name,
        photoUrl: r.photo_url,
      })),
    });
  } catch (err) {
    console.error('[chat.getAllTrainers]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/chat/:trainerId/messages
// =====================================================================
exports.getChatHistory = async (req, res) => {
  try {
    const trainerId = Number(req.params.trainerId);
    if (!trainerId) {
      return res.status(400).json({ success: false, error: 'Invalid trainerId' });
    }

    if (req.user.type !== 'admin' && Number(req.user.id) !== trainerId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const before = req.query.before ? Number(req.query.before) : null;
    const limit  = req.query.limit  ? Number(req.query.limit)  : 50;

    const params = [trainerId, trainerId];
    let sql = `
      SELECT id, sender_type, sender_id, receiver_type, receiver_id,
             message, is_read, created_at
      FROM chat_messages
      WHERE (sender_type = 'trainer' AND sender_id = ?)
         OR (receiver_type = 'trainer' AND receiver_id = ?)
    `;
    if (before) {
      sql += ' AND id < ?';
      params.push(before);
    }
    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.query(sql, params);
    rows.reverse();

    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      trainerId,
      count: rows.length,
      messages: rows.map(normalizeRow),
    });
  } catch (err) {
    console.error('[chat.getChatHistory]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// POST /api/chat/:trainerId/read
// =====================================================================
exports.markChatRead = async (req, res) => {
  try {
    const trainerId = Number(req.params.trainerId);
    if (!trainerId) {
      return res.status(400).json({ success: false, error: 'Invalid trainerId' });
    }

    const isAdmin = req.user.type === 'admin';
    if (!isAdmin && Number(req.user.id) !== trainerId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    let sql, params;
    if (isAdmin) {
      sql = `
        UPDATE chat_messages
           SET is_read = 1
         WHERE sender_type = 'trainer' AND sender_id = ?
           AND receiver_type = 'admin' AND is_read = 0
      `;
      params = [trainerId];
    } else {
      sql = `
        UPDATE chat_messages
           SET is_read = 1
         WHERE sender_type = 'admin'
           AND receiver_type = 'trainer' AND receiver_id = ?
           AND is_read = 0
      `;
      params = [trainerId];
    }

    const [result] = await pool.query(sql, params);

    const io = getIO();
    if (io) {
      const [remaining] = await pool.query(
        `SELECT COUNT(*) AS n FROM chat_messages
          WHERE sender_type = 'trainer' AND sender_id = ?
            AND receiver_type = 'admin' AND is_read = 0`,
        [trainerId]
      );
      io.to('admins').emit('chat:unread', { trainerId, unread: remaining[0].n });
      io.to(`trainer:${trainerId}`).emit('chat:read', { trainerId });
    }

    res.json({ success: true, trainerId, updated: result.affectedRows });
  } catch (err) {
    console.error('[chat.markChatRead]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// POST /api/chat/:trainerId/send   (REST fallback)
// =====================================================================
exports.sendChatMessage = async (req, res) => {
  try {
    const trainerId = Number(req.params.trainerId);
    const message   = String(req.body?.message || '').trim();

    if (!trainerId || !message) {
      return res.status(400).json({ success: false, error: 'Invalid payload' });
    }

    const isAdmin = req.user.type === 'admin';
    if (!isAdmin && Number(req.user.id) !== trainerId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const sender_type   = isAdmin ? 'admin'   : 'trainer';
    const sender_id     = isAdmin ? req.user.id : trainerId;
    const receiver_type = isAdmin ? 'trainer' : 'admin';
    const receiver_id   = isAdmin ? trainerId   : req.user.id;

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

    const io = getIO();
    if (io) {
      io.to(`trainer:${trainerId}`).emit('chat:new', saved);
      io.to('admins').emit('chat:new', saved);

      const [unread] = await pool.query(
        `SELECT COUNT(*) AS n FROM chat_messages
          WHERE sender_type = 'trainer' AND sender_id = ?
            AND receiver_type = 'admin' AND is_read = 0`,
        [trainerId]
      );
      io.to('admins').emit('chat:unread', { trainerId, unread: unread[0].n });
    }

    res.json({ success: true, message: saved });
  } catch (err) {
    console.error('[chat.sendChatMessage]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};