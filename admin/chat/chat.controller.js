const pool = require('../../config/db');

exports.getMe = async (req, res) => {
  try {
    const { userId, type } = req.user; // req.user is set by your auth middleware
    let user = { userId, type, username: 'Unknown', photoUrl: null };

    if (type === 'admin') {
      const [rows] = await pool.query(
        `SELECT username FROM admin WHERE id = ? LIMIT 1`, [userId]
      );
      if (rows.length) user.username = rows[0].username;
      
    } else if (type === 'trainer') {
      const [rows] = await pool.query(
        `SELECT name AS username, photo_url AS photoUrl FROM trainers WHERE id = ? LIMIT 1`, [userId]
      );
      if (rows.length) {
        user.username = rows[0].username;
        user.photoUrl = rows[0].photoUrl;
      }
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('[getMe Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getChatUsers = async (req, res) => {
  try {
    const userId = req.user.userId;
    const type   = req.user.type;
    const search = req.query.search ? `%${req.query.search}%` : null; // ✅ Get search param

    let otherType;
    if (type === 'admin') otherType = 'trainer';
    else                  otherType = 'admin';

    let people;
    if (type === 'admin') {
      let sql = `SELECT id, name AS username, photo_url FROM trainers`;
      let params = [];
      
      if (search) {
        sql += ` WHERE name LIKE ?`;
        params.push(search);
      }
      sql += ` ORDER BY name`;
      
      const [rows] = await pool.query(sql, params);
      people = rows;
    } else {
      let sql = `SELECT id, username, NULL AS photo_url FROM admin WHERE status = 'active'`;
      let params = [];
      
      if (search) {
        sql += ` AND username LIKE ?`;
        params.push(search);
      }
      sql += ` ORDER BY username`;
      
      const [rows] = await pool.query(sql, params);
      people = rows;
    }

    const users = [];

    for (const p of people) {
      // ... (Keep your existing loop for fetching lastMessage and unread counts)
      const [last] = await pool.query(
        `SELECT id, message, sender_type, sender_id, created_at, is_read
           FROM chat_messages
          WHERE (sender_type = ? AND sender_id = ? AND receiver_type = ? AND receiver_id = ?)
             OR (sender_type = ? AND sender_id = ? AND receiver_type = ? AND receiver_id = ?)
          ORDER BY id DESC LIMIT 1`,
        [type, userId, otherType, p.id, otherType, p.id, type, userId]
      );

      const [unreadRows] = await pool.query(
        `SELECT COUNT(*) AS unread FROM chat_messages
          WHERE receiver_type = ? AND receiver_id = ?
            AND sender_type  = ? AND sender_id  = ?
            AND is_read = 0`,
        [type, userId, otherType, p.id]
      );

      users.push({
        userId:      p.id,
        username:    p.username,
        type:        otherType,
        photoUrl:    p.photo_url,
        lastMessage: last[0] || null,
        unread:      unreadRows[0].unread,
        cacheKey:    last[0] ? new Date(last[0].created_at).getTime() : 0,
      });
    }

    users.sort((a, b) => b.cacheKey - a.cacheKey);
    res.json({ success: true, users });
  } catch (err) {
    console.error('[chat.getChatUsers]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =====================================================================
   GET /api/chat/messages/:userId
   ===================================================================== */
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const type   = req.user.type;

    // inline: otherType
    let otherType;
    if (type === 'admin') otherType = 'trainer';
    else                  otherType = 'admin';

    const peerId = Number(req.params.userId);
    const limit  = Math.min(Number(req.query.limit) || 50, 200);
    const before = req.query.before ? Number(req.query.before) : null;

    let sql = `
      SELECT id, sender_type, sender_id, receiver_type, receiver_id,
             message, is_read, created_at
        FROM chat_messages
       WHERE (
              (sender_type = ? AND sender_id = ? AND receiver_type = ? AND receiver_id = ?)
           OR (sender_type = ? AND sender_id = ? AND receiver_type = ? AND receiver_id = ?)
             )`;
    const params = [
      type, userId, otherType, peerId,
      otherType, peerId, type, userId,
    ];

    if (before) {
      sql += ` AND id < ?`;
      params.push(before);
    }

    sql += ` ORDER BY id DESC LIMIT ?`;
    params.push(limit);

    const [rows] = await pool.query(sql, params);

    // mark incoming messages as read
    await pool.query(
      `UPDATE chat_messages SET is_read = 1
        WHERE receiver_type = ? AND receiver_id = ?
          AND sender_type  = ? AND sender_id  = ?
          AND is_read = 0`,
      [type, userId, otherType, peerId]
    );

    // realtime notify peer
    const io = req.app.get('io');
    if (io) {
      io.to(`${otherType}:${peerId}`).emit('message_read', {
        byType: type,
        byId:   userId,
        peerId: userId,
      });
    }

    res.json({
      success:  true,
      peerId,
      messages: rows.reverse(),
      hasMore:  rows.length === limit,
    });
  } catch (err) {
    console.error('[chat.getMessages]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =====================================================================
   POST /api/chat/messages   { peerId, message }
   ===================================================================== */
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const type   = req.user.type;

    // inline: otherType
    let otherType;
    if (type === 'admin') otherType = 'trainer';
    else                  otherType = 'admin';

    const peerId = Number(req.body?.peerId);
    const text   = (req.body?.message || '').trim();

    if (!peerId || !text) {
      return res.status(400).json({ success: false, message: 'peerId & message required' });
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

    const io = req.app.get('io');
    if (io) {
      io.to(`${otherType}:${peerId}`).emit('receive_message', row);
      io.to(`${type}:${userId}`).emit('receive_message', row);
    }

    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[chat.sendMessage]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};