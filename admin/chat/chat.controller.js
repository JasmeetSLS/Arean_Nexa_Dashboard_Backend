const pool     = require('../../config/db');
const JWTUtils = require('../../utils/jwt.util');

exports.me = (req, res) => {
  res.json({
    success: true,
    user: {
      userId:   req.user.userId,      // decoded by middleware
      username: req.user.username,
      type:     req.user.type,
    },
  });
};

// =====================================================================
// GET /api/users
//   admin   → all trainers
//   trainer → all admins
// =====================================================================
exports.getUsers = async (req, res) => {
  try {
    const { type } = req.user;

    let rows;
    if (type === 'admin') {
      [rows] = await pool.query(
        `SELECT id, name AS username, photo_url FROM trainers ORDER BY name`
      );
    } else {
      [rows] = await pool.query(
        `SELECT id, username, NULL AS photo_url
           FROM admin WHERE status = 'active' ORDER BY username`
      );
    }

    res.json({
      success: true,
      users: rows.map((r) => ({
        userId:   r.id,
        username: r.username,
        type:     type === 'admin' ? 'trainer' : 'admin',
        photoUrl: r.photo_url,
      })),
    });
  } catch (err) {
    console.error('[chat.getUsers]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================================================
// GET /api/conversations
// =====================================================================
exports.getConversations = async (req, res) => {
  try {
    const { userId, type } = req.user;
    const otherType = type === 'admin' ? 'trainer' : 'admin';

    let people;
    if (type === 'admin') {
      const [rows] = await pool.query(
        `SELECT id, name AS username, photo_url FROM trainers ORDER BY name`
      );
      people = rows;
    } else {
      const [rows] = await pool.query(
        `SELECT id, username, NULL AS photo_url
           FROM admin WHERE status = 'active' ORDER BY username`
      );
      people = rows;
    }

    const conversations = [];

    for (const p of people) {
      const [lastRows] = await pool.query(
        `SELECT id, message, sender_type, sender_id, created_at, is_read
           FROM chat_messages
          WHERE (sender_type = ? AND sender_id = ? AND receiver_type = ? AND receiver_id = ?)
             OR (sender_type = ? AND sender_id = ? AND receiver_type = ? AND receiver_id = ?)
          ORDER BY id DESC LIMIT 1`,
        [type, userId, otherType, p.id,
         otherType, p.id, type, userId]
      );

      const [[{ unread }]] = await pool.query(
        `SELECT COUNT(*) AS unread FROM chat_messages
          WHERE receiver_type = ? AND receiver_id = ?
            AND sender_type  = ? AND sender_id  = ?
            AND is_read = 0`,
        [type, userId, otherType, p.id]
      );

      conversations.push({
        id:          p.id,        // conversation id = peerId
        peerId:      p.id,
        peerType:    otherType,
        peerName:    p.username,
        photoUrl:    p.photo_url,
        lastMessage: lastRows[0] || null,
        unread,
      });
    }

    conversations.sort(
      (a, b) =>
        new Date(b.lastMessage?.created_at || 0) -
        new Date(a.lastMessage?.created_at || 0)
    );

    res.json({ success: true, conversations });
  } catch (err) {
    console.error('[chat.getConversations]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================================================
// POST /api/conversations   { peerId }
// =====================================================================
exports.createConversation = async (req, res) => {
  try {
    const { userId, type } = req.user;
    const peerId = Number(req.body?.peerId);

    if (!peerId) {
      return res.status(400).json({ success: false, message: 'peerId required' });
    }

    const otherType = type === 'admin' ? 'trainer' : 'admin';
    const table     = otherType === 'trainer' ? 'trainers' : 'admin';
    const nameCol   = otherType === 'trainer' ? 'name' : 'username';

    const [rows] = await pool.query(
      `SELECT id, ${nameCol} AS username FROM ${table} WHERE id = ? LIMIT 1`,
      [peerId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [existing] = await pool.query(
      `SELECT id FROM chat_messages
        WHERE (sender_type = ? AND sender_id = ? AND receiver_type = ? AND receiver_id = ?)
           OR (sender_type = ? AND sender_id = ? AND receiver_type = ? AND receiver_id = ?)
        LIMIT 1`,
      [type, userId, otherType, peerId,
       otherType, peerId, type, userId]
    );

    res.json({
      success: true,
      created: !existing.length,
      conversation: {
        id:       peerId,
        peerId,
        peerType: otherType,
        peerName: rows[0].username,
      },
    });
  } catch (err) {
    console.error('[chat.createConversation]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================================================
// GET /api/conversations/:id/messages
//   :id = peerId
// =====================================================================
exports.getMessages = async (req, res) => {
  try {
    const { userId, type } = req.user;
    const peerId    = Number(req.params.id);
    const otherType = type === 'admin' ? 'trainer' : 'admin';
    const limit     = Math.min(Number(req.query.limit) || 100, 500);

    const [rows] = await pool.query(
      `SELECT id, sender_type, sender_id, receiver_type, receiver_id,
              message, is_read, created_at
         FROM chat_messages
        WHERE (sender_type = ? AND sender_id = ? AND receiver_type = ? AND receiver_id = ?)
           OR (sender_type = ? AND sender_id = ? AND receiver_type = ? AND receiver_id = ?)
        ORDER BY id DESC LIMIT ?`,
      [type, userId, otherType, peerId,
       otherType, peerId, type, userId,
       limit]
    );

    // mark read on fetch
    await pool.query(
      `UPDATE chat_messages SET is_read = 1
        WHERE receiver_type = ? AND receiver_id = ?
          AND sender_type  = ? AND sender_id  = ?
          AND is_read = 0`,
      [type, userId, otherType, peerId]
    );

    res.json({ success: true, messages: rows.reverse() });
  } catch (err) {
    console.error('[chat.getMessages]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================================================
// POST /api/chat/trainer-token/:trainerId   (admin only)
// =====================================================================
exports.trainerToken = async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const trainerId = Number(req.params.trainerId);
    const [rows] = await pool.query(
      `SELECT id, name FROM trainers WHERE id = ? LIMIT 1`,
      [trainerId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Trainer not found' });
    }

    const t = rows[0];
    const token = JWTUtils.generateToken({
      userId:   t.id,
      username: t.name,
      type:     'trainer',
    }, '2h');

    res.json({ success: true, token, trainer: { userId: t.id, name: t.name } });
  } catch (err) {
    console.error('[chat.trainerToken]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};