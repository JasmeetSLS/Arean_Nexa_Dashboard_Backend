// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

// ---- MySQL Pool ----
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'skill_contest_portal',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

// ---- Helpers ----
const hmsToSeconds = (hms) => {
  if (!hms || typeof hms !== 'string') return 0;
  const [h = '0', m = '0', s = '0'] = hms.split(':');
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
};

const secondsToHms = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// =====================================================================
// GET /api/grid
// trainers[] → {
//   trainer: { id, name, photoUrl, totalAssigned, passPercentage, avgTime },
//   participants: [...]
// }
// =====================================================================
app.get('/api/grid', async (_req, res) => {
  try {
    // ---- 1. Users + their LAST round's trainer ----
    const [users] = await pool.query(`
      SELECT
        ud.mspin,
        ud.name,
        ud.role,
        td.id         AS trainer_id,
        td.name       AS trainer_name,
        td.photo_url  AS trainer_photo
      FROM user_details ud
      LEFT JOIN participant_rounds pr
        ON pr.id = (
          SELECT p2.id
          FROM participant_rounds p2
          WHERE p2.mspin = ud.mspin
          ORDER BY p2.id DESC
          LIMIT 1
        )
      LEFT JOIN trainer_details td
        ON td.name = pr.trainer_name
      ORDER BY ud.mspin
    `);

    // ---- 2. All rounds (per participant) ----
    const [rounds] = await pool.query(`
      SELECT mspin, round_name, trainer_name, score, status
      FROM participant_rounds
      ORDER BY mspin, id
    `);

    // ---- 3. user_result (percentage, total_time, status) ----
    const [results] = await pool.query(`
      SELECT mspin, percentage, total_time, status, rounds_status
      FROM user_result
    `);

    // ---- 4. Trainer master ----
    const [trainerRows] = await pool.query(`
      SELECT id, name, photo_url
      FROM trainer_details
      ORDER BY id
    `);

    // ---- 5. Index lookups ----
    const roundsByUser = {};
    for (const r of rounds) {
      if (!roundsByUser[r.mspin]) roundsByUser[r.mspin] = [];
      roundsByUser[r.mspin].push({
        roundName:   r.round_name,
        trainerName: r.trainer_name,
        score:       r.score,
        status:      r.status,
      });
    }

    const resultByUser = {};
    for (const r of results) resultByUser[r.mspin] = r;

    // ---- 6. Group participants under each trainer + compute stats ----
    const trainers = trainerRows.map((t) => {
      const assigned = users
        .filter((u) => u.trainer_id === t.id)
        .map((u) => {
          const ur = resultByUser[u.mspin] || {};
          return {
            mspin:        u.mspin,
            name:         u.name,
            role:         u.role,
            percentage:   ur.percentage    ?? 0,
            totalTime:    ur.total_time    ?? '00:00:00',
            status:       ur.status        ?? 'Fail',
            roundsStatus: ur.rounds_status ?? 'In Progress',
            rounds:       roundsByUser[u.mspin] || [],
          };
        });

      const totalAssigned = assigned.length;

      // Pass %
      const passCount = assigned.filter((p) => p.status === 'Pass').length;
      const passPercentage =
        totalAssigned > 0
          ? Number(((passCount / totalAssigned) * 100).toFixed(2))
          : 0;

      // Avg total time (from user_result.total_time)
      const totalSecs = assigned.reduce(
        (sum, p) => sum + hmsToSeconds(p.totalTime),
        0
      );
      const avgTime =
        totalAssigned > 0
          ? secondsToHms(Math.round(totalSecs / totalAssigned))
          : '00:00:00';

      return {
        trainer: {
          id: t.id,
          name: t.name,
          photoUrl: t.photo_url,
          totalAssigned,
          passPercentage,
          avgTime,
          participants: assigned,
        },
      };
    });

    // ---- 7. Response ----
    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      totalTrainers: trainers.length,
      trainers,
    });
  } catch (err) {
    console.error('[/api/grid] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- Health check ----
app.get('/health', (_req, res) => res.json({ ok: true }));

// ---- Start ----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ API running → http://localhost:${PORT}`);
  console.log(`   GET /api/grid`);
});