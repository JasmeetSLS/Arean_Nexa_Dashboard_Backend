const pool = require('../../config/db');

exports.saveRound = async (req, res) => {
  try {
    const { mpin, trainer_id, round_name, start_time, score, end_time } = req.body;

    // 1. Update participant's date ONLY if it's different from start_time
    if (start_time) {
      await pool.query(
        `UPDATE participants 
            SET date = DATE(?) 
          WHERE mpin = ? AND DATE(date) != DATE(?)`,
        [start_time, mpin, start_time]
      );
    }

    // 2. Check if the round already exists
    const [rows] = await pool.query(
      `SELECT id FROM participant_rounds WHERE mpin = ? AND trainer_id = ? AND round_name = ? LIMIT 1`,
      [mpin, trainer_id, round_name]
    );

    // 3. Update if exists, Insert if not
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

exports.resetRounds = async (req, res) => {
  try {
    const { mpin, rounds } = req.body;
    const toDelete = Object.keys(rounds || {}).filter(r => rounds[r] === true);

    if (!mpin || !toDelete.length) {
      return res.json({ success: true, message: 'Nothing to reset' });
    }

    await pool.query(
      `DELETE FROM participant_rounds WHERE mpin = ? AND round_name IN (?)`,
      [mpin, toDelete]
    );

    res.json({ success: true, message: 'Rounds reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// API Payload
// {
//   "mpin": "1341632",
//   "rounds": {
//     "Round 2A": true,
//     "Round 2B": true,
//     "Round 3A": false,
//     "Round 3B": false
//   }
// }