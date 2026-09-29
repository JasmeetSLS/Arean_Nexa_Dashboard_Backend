const pool = require('../../config/db');

exports.getMessages = async (req, res) => {
  try {
    const { trainerId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 200, 500);

    const [rows] = await pool.query(
      `SELECT id, trainer_id, sender_type, sender_name, message, is_read, created_at
         FROM chat_messages
        WHERE trainer_id = ?
        ORDER BY id DESC
        LIMIT ?`,
      [trainerId, limit]
    );

    res.json({
      success: true,
      messages: rows.reverse().map((r) => ({
        id:         r.id,
        trainerId:  r.trainer_id,
        senderType: r.sender_type,
        senderName: r.sender_name,
        message:    r.message,
        isRead:     !!r.is_read,
        createdAt:  r.created_at,
      })),
    });
  } catch (err) {
    console.error('[chat.getMessages]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getSummary = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        t.id        AS trainer_id,
        t.name      AS trainer_name,
        t.photo_url AS trainer_photo,
        (SELECT message    FROM chat_messages c WHERE c.trainer_id = t.id ORDER BY id DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM chat_messages c WHERE c.trainer_id = t.id ORDER BY id DESC LIMIT 1) AS last_at,
        (SELECT COUNT(*)   FROM chat_messages c
          WHERE c.trainer_id = t.id AND c.sender_type = 'trainer' AND c.is_read = 0) AS unread
      FROM trainers t
      ORDER BY (last_at IS NULL), last_at DESC, t.name
    `);

    res.json({
      success: true,
      summary: rows.map((r) => ({
        trainerId:    r.trainer_id,
        trainerName:  r.trainer_name,
        trainerPhoto: r.trainer_photo,
        lastMessage:  r.last_message,
        lastAt:       r.last_at,
        unread:       Number(r.unread) || 0,
      })),
    });
  } catch (err) {
    console.error('[chat.getSummary]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};