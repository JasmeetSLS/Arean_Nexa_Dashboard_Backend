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

// =====================================================================
// GET /api/grid
// Returns trainers[], each with:
//   - trainer: { id, name, photoUrl }
//   - totalAssigned: number
//   - participants: [ { mspin, name } ]
// =====================================================================
app.get('/api/grid', async (_req, res) => {
  try {
    // ---- 1. Users + their LAST round's trainer (one row per user) ----
    const [rows] = await pool.query(`
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

    // ---- 2. Trainer master ----
    const [trainerRows] = await pool.query(`
      SELECT id, name, photo_url
      FROM trainer_details
      ORDER BY id
    `);

    // ---- 3. Group participants (mspin + name only) under each trainer ----
    const trainers = trainerRows.map((t) => {
      const assigned = rows
        .filter((r) => r.trainer_id === t.id)
        .map((r) => ({
          mspin: r.mspin,
          name: r.name,
          role: r.role,
        }));

      return {
        trainer: {
          id: t.id,
          name: t.name,
          photoUrl: t.photo_url,
        },
        totalAssigned: assigned.length,
        participants: assigned,
      };
    });

    // ---- 4. Response ----
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