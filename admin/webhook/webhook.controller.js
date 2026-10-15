const pool = require('../../config/db');

exports.saveRound = async (req, res) => {
  try {
    const { mpin, trainer_id, round_name, start_time, score, end_time } = req.body;

    const [rows] = await pool.query(
      `SELECT id FROM participant_rounds
        WHERE mpin = ? AND trainer_id = ? AND round_name = ? LIMIT 1`,
      [mpin, trainer_id, round_name]
    );

    if (rows.length) {
      await pool.query(
        `UPDATE participant_rounds SET score = ?, end_time = ? WHERE id = ?`,
        [score ?? null, end_time ?? null, rows[0].id]
      );
      return res.json({ success: true, action: 'updated' });
    }

    await pool.query(
      `INSERT INTO participant_rounds (mpin, trainer_id, round_name, start_time, score, end_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [mpin, trainer_id, round_name, start_time, score ?? null, end_time ?? null]
    );
    res.json({ success: true, action: 'inserted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};