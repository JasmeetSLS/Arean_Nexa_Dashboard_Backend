const pool = require('../../config/db');

/* =========================================================
   GET /api/chat/me
   ========================================================= */
exports.getMe = async (req, res) => {
  try {
    const { username, type } = req.user;
    let user = { username, displayName: username, type, photoUrl: null };

    if (type === 'admin') {
      const [rows] = await pool.query(
        `SELECT username FROM admin WHERE username = ? LIMIT 1`,
        [username]
      );
      if (rows.length) {
        user.username    = rows[0].username;
        user.displayName = rows[0].username;
      }
    } else if (type === 'trainer') {
      const [rows] = await pool.query(
        `SELECT username, name, photo_url
           FROM trainers WHERE username = ? LIMIT 1`,
        [username]
      );
      if (rows.length) {
        user.username    = rows[0].username;
        user.displayName = rows[0].name || rows[0].username;
        user.photoUrl    = rows[0].photo_url;
      }
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('[chat.getMe]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* =========================================================
   GET /api/chat/users   (search)
   ========================================================= */
exports.getChatUsers = async (req, res) => {
  try {
    const { username, type } = req.user;
    const otherType = type === 'admin' ? 'trainer' : 'admin';
    const search    = req.query.search ? `%${req.query.search}%` : null;

    let people;
    if (type === 'admin') {
      let sql = `SELECT username AS peerUsername, name AS peerName, photo_url
                   FROM trainers WHERE status = 'active'`;
      const params = [];
      if (search) { sql += ` AND name LIKE ?`; params.push(search); }
      sql += ` ORDER BY name`;
      [people] = await pool.query(sql, params);
    } else {
      let sql = `SELECT username AS peerUsername, username AS peerName,
                        NULL AS photo_url
                   FROM admin WHERE status = 'active'`;
      const params = [];
      if (search) { sql += ` AND username LIKE ?`; params.push(search); }
      sql += ` ORDER BY username`;
      [people] = await pool.query(sql, params);
    }

    const users = [];
    for (const p of people) {
      const [last] = await pool.query(
        `SELECT id, message, sender_type, sender_username,
                receiver_type, receiver_username, created_at, is_read
           FROM chat_messages
          WHERE (sender_type = ? AND sender_username = ?
                 AND receiver_type = ? AND receiver_username = ?)
             OR (sender_type = ? AND sender_username = ?
                 AND receiver_type = ? AND receiver_username = ?)
          ORDER BY id DESC LIMIT 1`,
        [type, username, otherType, p.peerUsername,
         otherType, p.peerUsername, type, username]
      );

      const [unreadRows] = await pool.query(
        `SELECT COUNT(*) AS unread FROM chat_messages
          WHERE receiver_type = ? AND receiver_username = ?
            AND sender_type   = ? AND sender_username   = ?
            AND is_read = 0`,
        [type, username, otherType, p.peerUsername]
      );

      users.push({
        peerUsername: p.peerUsername,
        peerName:     p.peerName,
        type:         otherType,
        photoUrl:     p.photo_url,
        lastMessage:  last[0] || null,
        unread:       unreadRows[0].unread,
        cacheKey:     last[0] ? new Date(last[0].created_at).getTime() : 0,
      });
    }

    users.sort((a, b) => b.cacheKey - a.cacheKey);
    res.json({ success: true, users });
  } catch (err) {
    console.error('[chat.getChatUsers]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   GET /api/chat/messages/:username
   ========================================================= */
exports.getMessages = async (req, res) => {
  try {
    const { username, type } = req.user;
    const otherType    = type === 'admin' ? 'trainer' : 'admin';
    const peerUsername = decodeURIComponent(req.params.username);
    const limit        = Math.min(Number(req.query.limit) || 50, 200);
    const before       = req.query.before ? Number(req.query.before) : null;

    let sql = `
      SELECT id, sender_type, sender_username,
             receiver_type, receiver_username,
             message, is_read, created_at
        FROM chat_messages
       WHERE (
              (sender_type = ? AND sender_username = ?
               AND receiver_type = ? AND receiver_username = ?)
           OR (sender_type = ? AND sender_username = ?
               AND receiver_type = ? AND receiver_username = ?)
             )`;
    const params = [
      type, username, otherType, peerUsername,
      otherType, peerUsername, type, username,
    ];

    if (before) { sql += ` AND id < ?`; params.push(before); }
    sql += ` ORDER BY id DESC LIMIT ?`;
    params.push(limit);

    const [rows] = await pool.query(sql, params);

    // mark incoming as read
    await pool.query(
      `UPDATE chat_messages SET is_read = 1
        WHERE receiver_type = ? AND receiver_username = ?
          AND sender_type   = ? AND sender_username   = ?
          AND is_read = 0`,
      [type, username, otherType, peerUsername]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`${otherType}:${peerUsername}`).emit('message_read', {
        byType:       type,
        byUsername:   username,
        peerUsername: username,
      });
    }

    res.json({
      success: true,
      peerUsername,
      messages: rows.reverse(),
      hasMore:  rows.length === limit,
    });
  } catch (err) {
    console.error('[chat.getMessages]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   POST /api/chat/messages   { peerUsername, message }
   ========================================================= */
exports.sendMessage = async (req, res) => {
  try {
    const { username, type } = req.user;
    const otherType    = type === 'admin' ? 'trainer' : 'admin';
    const peerUsername = (req.body?.peerUsername || '').trim();
    const text         = (req.body?.message || '').trim();

    if (!peerUsername || !text) {
      return res.status(400).json({
        success: false,
        message: 'peerUsername & message required',
      });
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

    const io = req.app.get('io');
    if (io) {
      io.to(`${otherType}:${peerUsername}`).emit('receive_message', row);
      io.to(`${type}:${username}`).emit('receive_message', row);
    }

    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[chat.sendMessage]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};