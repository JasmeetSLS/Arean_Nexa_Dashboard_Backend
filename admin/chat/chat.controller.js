const pool = require('../../config/db');

// =====================================================================
// GET /api/chat/:trainerId/messages
//   Fetch full conversation between Command Center and one trainer.
// =====================================================================
exports.getMessages = async (req, res) => {
  try {
    const trainerId = Number(req.params.trainerId);
    if (!trainerId) {
      return res.status(400).json({ success: false, error: 'Invalid trainerId' });
    }

    const limit = Math.min(Number(req.query.limit) || 200, 500);

    const [rows] = await pool.query(
      `SELECT
         id,
         sender_type, sender_id,
         receiver_type, receiver_id,
         message, is_read, created_at
       FROM chat_messages
       WHERE (sender_type = 'command' AND receiver_type = 'trainer' AND receiver_id = ?)
          OR (sender_type = 'trainer' AND sender_id = ? AND receiver_type = 'command')
       ORDER BY id DESC
       LIMIT ?`,
      [trainerId, trainerId, limit]
    );

    res.json({
      success: true,
      messages: rows.reverse().map((r) => ({
        id:            r.id,
        senderType:    r.sender_type,
        senderId:      r.sender_id,
        receiverType:  r.receiver_type,
        receiverId:    r.receiver_id,
        message:       r.message,
        isRead:        !!r.is_read,
        createdAt:     r.created_at,
      })),
    });
  } catch (err) {
    console.error('[chat.getMessages]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/chat/summary
//   One row per trainer: last message + unread count
// =====================================================================
exports.getSummary = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        t.id        AS trainer_id,
        t.name      AS trainer_name,
        t.photo_url AS trainer_photo,

        (
          SELECT message
          FROM chat_messages c
          WHERE (c.sender_type = 'command' AND c.receiver_type = 'trainer' AND c.receiver_id = t.id)
             OR (c.sender_type = 'trainer' AND c.sender_id = t.id AND c.receiver_type = 'command')
          ORDER BY c.id DESC
          LIMIT 1
        ) AS last_message,

        (
          SELECT created_at
          FROM chat_messages c
          WHERE (c.sender_type = 'command' AND c.receiver_type = 'trainer' AND c.receiver_id = t.id)
             OR (c.sender_type = 'trainer' AND c.sender_id = t.id AND c.receiver_type = 'command')
          ORDER BY c.id DESC
          LIMIT 1
        ) AS last_at,

        (
          SELECT COUNT(*)
          FROM chat_messages c
          WHERE c.sender_type = 'trainer'
            AND c.sender_id = t.id
            AND c.receiver_type = 'command'
            AND c.is_read = 0
        ) AS unread

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