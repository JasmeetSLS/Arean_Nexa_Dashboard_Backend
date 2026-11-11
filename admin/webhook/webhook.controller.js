// const pool = require('../../config/db');

// exports.saveRound = async (req, res) => {
//   try {
//      console.log('req.body:', req.body);   
//     const { mpin, trainer_id, round_name, start_time, score, end_time } = req.body;

//     // 1. Update participant date & trainer (Only runs if both are provided)
//     if (start_time && trainer_id) {
//       await pool.query(
//         `UPDATE participants SET date = DATE(?), trainer_id = ? WHERE mpin = ?`,
//         [start_time, trainer_id, mpin]
//       );
//     }

//     // 2. Check if the round already exists
//     const [rows] = await pool.query(
//       `SELECT id, start_time, score, end_time, trainer_id
//          FROM participant_rounds
//         WHERE mpin = ? AND round_name = ?
//         LIMIT 1`,
//       [mpin, round_name]
//     );

//     // 3. Insert or Update the round
//     if (rows.length) {
//       const old = rows[0];
//       await pool.query(
//         `UPDATE participant_rounds
//             SET start_time = ?, score = ?, end_time = ?, trainer_id = ?
//           WHERE id = ?`,
//         [
//           start_time ?? old.start_time,
//           score      ?? old.score,
//           end_time   ?? old.end_time,
//           trainer_id ?? old.trainer_id,
//           old.id,
//         ]
//       );
//       return res.json({ success: true, action: 'updated' });
//     }

//     await pool.query(
//       `INSERT INTO participant_rounds (mpin, trainer_id, round_name, start_time, score, end_time) 
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [mpin, trainer_id, round_name, start_time, score ?? null, end_time ?? null]
//     );
    
//     res.json({ success: true, action: 'inserted' });

//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

const pool = require('../../config/db');

exports.saveRound = async (req, res) => {
  try {
    const { mpin, trainer_id, round_name, start_time, score, end_time } = req.body;

    // log every request
    pool.query(
      `INSERT INTO participant_rounds_logs (mpin, round_name, payload) VALUES (?, ?, ?)`,
      [mpin ?? null, round_name ?? null, JSON.stringify(req.body)]
    ).catch(() => {});

    if (start_time && trainer_id) {
      await pool.query(
        `UPDATE participants SET date = DATE(?), trainer_id = ? WHERE mpin = ?`,
        [start_time, trainer_id, mpin]
      );
    }

    const [rows] = await pool.query(
      `SELECT id, start_time, score, end_time, trainer_id
         FROM participant_rounds
        WHERE mpin = ? AND round_name = ?
        LIMIT 1`,
      [mpin, round_name]
    );

    if (rows.length) {
      const old = rows[0];
      await pool.query(
        `UPDATE participant_rounds
            SET start_time = ?, score = ?, end_time = ?, trainer_id = ?
          WHERE id = ?`,
        [
          start_time ?? old.start_time,
          score      ?? old.score,
          end_time   ?? old.end_time,
          trainer_id ?? old.trainer_id,
          old.id,
        ]
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