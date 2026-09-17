// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const ExcelJS = require('exceljs');

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
// GET /api/grid (unchanged)
// =====================================================================
app.get('/api/grid', async (_req, res) => {
  try {
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

    const [rounds] = await pool.query(`
      SELECT mspin, round_name, trainer_name, score, status
      FROM participant_rounds
      ORDER BY mspin, id
    `);

    const [results] = await pool.query(`
      SELECT mspin, percentage, total_time, status, rounds_status
      FROM user_result
    `);

    const [trainerRows] = await pool.query(`
      SELECT id, name, photo_url
      FROM trainer_details
      ORDER BY id
    `);

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

      const passCount = assigned.filter((p) => p.status === 'Pass').length;
      const passPercentage =
        totalAssigned > 0
          ? Number(((passCount / totalAssigned) * 100).toFixed(2))
          : 0;

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


// =====================================================================
// GET /api/dashboard
//   todayLive      → stats restricted to TODAY only
//   regionSummary  → lifetime, grouped by region + zone
//   trainerSummary → lifetime, grouped by trainer
//   contestTotals  → lifetime, global
// =====================================================================
app.get('/api/dashboard', async (_req, res) => {
  try {
    // ---- 1. All users ----
    const [users] = await pool.query(`
      SELECT mspin, name, region, zone
      FROM user_details
    `);

    // ---- 2. All rounds (with start_time for today filter) ----
    const [rounds] = await pool.query(`
      SELECT mspin, trainer_name, round_name, score, status, start_time, end_time
      FROM participant_rounds
    `);

    // ---- 3. user_result ----
    const [results] = await pool.query(`
      SELECT mspin, percentage, total_time, status, rounds_status
      FROM user_result
    `);

    // ---- 4. Trainers ----
    const [trainerRows] = await pool.query(`
      SELECT id, name, photo_url
      FROM trainer_details
      ORDER BY id
    `);

    // ---- 5. Indexes ----
    const resultByUser = {};
    for (const r of results) resultByUser[r.mspin] = r;

    const userByMspin = {};
    for (const u of users) userByMspin[u.mspin] = u;

    // =====================================================================
    // todayLive — stats for TODAY only
    // =====================================================================
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm   = String(today.getMonth() + 1).padStart(2, '0');
    const dd   = String(today.getDate()).padStart(2, '0');
    const todayDate = `${yyyy}-${mm}-${dd}`;

    // Rounds whose start_time date == today
    const todayRounds = rounds.filter(
      (r) => r.start_time && r.start_time.slice(0, 10) === todayDate
    );

    // Distinct mspins scheduled today
    const todayMspins = new Set(todayRounds.map((r) => r.mspin));

// Today's results = user_result for those mspins
const todayResults = results.filter((r) => todayMspins.has(r.mspin));

const tPass = todayResults.filter((r) => r.status === 'Pass').length;
const tFail = todayResults.filter((r) => r.status === 'Fail').length;

const tPassRate = (tPass + tFail) > 0
  ? Number(((tPass / (tPass + tFail)) * 100).toFixed(2))
  : 0;

const tSecs = todayResults.reduce(
  (sum, r) => sum + hmsToSeconds(r.total_time), 0
);
const tAvgTime = todayResults.length > 0
  ? secondsToHms(Math.round(tSecs / todayResults.length))
  : '00:00:00';

// ---- Today's completed vs in-progress ----
// "Completed" = user_result.rounds_status === 'Completed' for those mspins
const todayCompleted = todayResults.filter(
  (r) => r.rounds_status === 'Completed'
).length;

// "In Progress" = users who have rounds today but haven't finished all 5
const todayInProgress = todayMspins.size - todayCompleted;

   const activeTrainers = new Set(
  rounds.map((r) => r.trainer_name).filter(Boolean)
);

const todayLive = {
  date:           todayDate,
  scheduled:      todayMspins.size,
  completed:      todayCompleted,
  inProgress:     todayInProgress,
  passRate:       tPassRate,
  avgTime:        tAvgTime,
  activeTrainers: activeTrainers.size,
};

    // =====================================================================
    // regionSummary — lifetime, grouped by region + zone
    // =====================================================================
    const regionBuckets = {};
    for (const r of results) {
      const u = userByMspin[r.mspin];
      if (!u) continue;
      const key = `${u.region || '—'}|${u.zone || '—'}`;
      if (!regionBuckets[key]) {
        regionBuckets[key] = {
          region:   u.region || '—',
          zone:     u.zone   || '—',
          total:    0,
          completed: 0,
          pass:     0,
          fail:     0,
          totalSecs: 0,
        };
      }
      const b = regionBuckets[key];
      b.total     += 1;
      if (r.rounds_status === 'Completed') b.completed += 1;
      if (r.status === 'Pass') b.pass += 1;
      if (r.status === 'Fail') b.fail += 1;
      b.totalSecs += hmsToSeconds(r.total_time);
    }

    const regionSummary = Object.values(regionBuckets)
      .map((b) => ({
        region:    b.region,
        zone:      b.zone,
        total:     b.total,
        completed: b.completed,
        passRate:  (b.pass + b.fail) > 0
          ? Number(((b.pass / (b.pass + b.fail)) * 100).toFixed(2))
          : 0,
        avgTime:   b.total > 0
          ? secondsToHms(Math.round(b.totalSecs / b.total))
          : '00:00:00',
      }))
      .sort((a, b) =>
        a.region.localeCompare(b.region) || a.zone.localeCompare(b.zone)
      );

    // =====================================================================
    // trainerSummary — lifetime
    // =====================================================================
const trainerSummary = trainerRows.map((t) => {
  const assignedUsers = users.filter((u) => {
    const userRounds = rounds.filter((r) => r.mspin === u.mspin);
    if (userRounds.length === 0) return false;
    const lastRound = userRounds[userRounds.length - 1];
    return lastRound.trainer_name === t.name;
  });

  const assigned = assignedUsers.length;
  const pass = assignedUsers.filter((u) => {
    const ur = resultByUser[u.mspin];
    return ur && ur.status === 'Pass';
  }).length;
  const fail = assignedUsers.filter((u) => {
    const ur = resultByUser[u.mspin];
    return ur && ur.status === 'Fail';
  }).length;

  const secs = assignedUsers.reduce((sum, u) => {
    const ur = resultByUser[u.mspin];
    return sum + (ur ? hmsToSeconds(ur.total_time) : 0);
  }, 0);

  // ---- roundJourney: for THIS trainer, how many completed rounds per round name ----
  // e.g. { round1: "5", round2: "3" } means this trainer has taught Round 1 five times
  // and Round 2 three times (counting completed rounds only).
  const roundJourney = {};
  rounds.forEach((r) => {
    if (r.trainer_name !== t.name) return;
    if (r.status !== 'completed') return;   // only count finished rounds
    const key = r.round_name.toLowerCase().replace(/\s+/g, ''); // "Round 1" → "round1"
    roundJourney[key] = (roundJourney[key] || 0) + 1;
  });

  // Convert counts to strings (matches the sample response)
  const roundJourneyStr = {};
  Object.keys(roundJourney).forEach((k) => {
    roundJourneyStr[k] = String(roundJourney[k]);
  });

  return {
    id:       t.id,
    name:     t.name,
    photoUrl: t.photo_url,
    assigned,
    passRate: (pass + fail) > 0
      ? Number(((pass / (pass + fail)) * 100).toFixed(2))
      : 0,
    avgTime:  assigned > 0
      ? secondsToHms(Math.round(secs / assigned))
      : '00:00:00',
    roundJourney: roundJourneyStr,
  };
});

    // =====================================================================
    // contestTotals — lifetime
    // =====================================================================
    const totalScheduled = users.length;
    const totalAttempted = rounds.filter((r) => r.status === 'completed').length;
    const overallPass = results.filter((r) => r.status === 'Pass').length;
    const overallFail = results.filter((r) => r.status === 'Fail').length;
    const overallPassRate = (overallPass + overallFail) > 0
      ? Number(((overallPass / (overallPass + overallFail)) * 100).toFixed(2))
      : 0;
    const allSecs = results.reduce((sum, r) => sum + hmsToSeconds(r.total_time), 0);
    const overallAvg = results.length > 0
      ? secondsToHms(Math.round(allSecs / results.length))
      : '00:00:00';

  // ---- Lifetime Completed vs In Progress (from user_result) ----
const totalCompleted = results.filter(
  (r) => r.rounds_status === 'Completed'
).length;

const totalInProgress = results.filter(
  (r) => r.rounds_status !== 'Completed'
).length;

const contestTotals = {
  totalScheduled,
  totalAttempted,
  completed:   totalCompleted,
  inProgress:  totalInProgress,
  passRate:    overallPassRate,
  avgTime:     overallAvg,
};

    // =====================================================================
    // Response
    // =====================================================================
    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      todayLive,
      regionSummary,
      trainerSummary,
      contestTotals,
    });
  } catch (err) {
    console.error('[/api/dashboard] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================================
// GET /api/filters
// Returns all distinct filter values for dashboard dropdowns.
// =====================================================================
app.get('/api/filters', async (_req, res) => {
  try {
    // 1. Distinct dates from participant_rounds
    const [dateRows] = await pool.query(`
      SELECT DISTINCT DATE(start_time) AS d
      FROM participant_rounds
      WHERE start_time IS NOT NULL
      ORDER BY d DESC
    `);

    // 2. Distinct zones + regions from user_details
    const [zoneRows] = await pool.query(`
      SELECT DISTINCT zone FROM user_details
      WHERE zone IS NOT NULL AND zone <> ''
      ORDER BY zone
    `);

    const [regionRows] = await pool.query(`
      SELECT DISTINCT region FROM user_details
      WHERE region IS NOT NULL AND region <> ''
      ORDER BY region
    `);

    // 3. Trainers
    const [trainerRows] = await pool.query(`
      SELECT id, name, photo_url
      FROM trainer_details
      ORDER BY name
    `);

    // 4. Roles
    const [roleRows] = await pool.query(`
      SELECT DISTINCT role FROM user_details
      WHERE role IS NOT NULL AND role <> ''
      ORDER BY role
    `);

    // 5. Agencies
    const [agencyRows] = await pool.query(`
      SELECT DISTINCT agency FROM user_details
      WHERE agency IS NOT NULL AND agency <> ''
      ORDER BY agency
    `);

    // 6. Dealer names & codes
    const [dealerNameRows] = await pool.query(`
      SELECT DISTINCT dealer_name FROM user_details
      WHERE dealer_name IS NOT NULL AND dealer_name <> ''
      ORDER BY dealer_name
    `);

    const [dealerCodeRows] = await pool.query(`
      SELECT DISTINCT dealer_code FROM user_details
      WHERE dealer_code IS NOT NULL AND dealer_code <> ''
      ORDER BY dealer_code
    `);

    // ---- Shape response ----
    const dates       = dateRows.map(r => {
      // MySQL DATE() with dateStrings:true returns "YYYY-MM-DD"
      return typeof r.d === 'string' ? r.d : new Date(r.d).toISOString().slice(0, 10);
    });
    const zones       = zoneRows.map(r => r.zone);
    const regions     = regionRows.map(r => r.region);
    const trainers    = trainerRows.map(t => ({
      id:       t.id,
      name:     t.name,
      photoUrl: t.photo_url,
    }));
    const roles       = roleRows.map(r => r.role);
    const agencies    = agencyRows.map(r => r.agency);
    const dealerNames = dealerNameRows.map(r => r.dealer_name);
    const dealerCodes = dealerCodeRows.map(r => r.dealer_code);

    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      dates,
      zones,
      regions,
      trainers,
      roles,
      agencies,
      dealerNames,
      dealerCodes,
    });
  } catch (err) {
    console.error('[/api/filters] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================================
// GET /api/export/users  →  Download all users as .xlsx
// Optional query params:
//   ?region=West  &zone=North  &role=Sales  &status=Pass
// =====================================================================
app.get('/api/export/users', async (req, res) => {
  try {
    const { region, zone, role, status } = req.query;

    // ---- Build dynamic WHERE ----
    const where = [];
    const params = [];
    if (region) { where.push('ud.region = ?'); params.push(region); }
    if (zone)   { where.push('ud.zone = ?');   params.push(zone); }
    if (role)   { where.push('ud.role = ?');   params.push(role); }
    if (status) { where.push('ur.status = ?'); params.push(status); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // ---- Fetch joined data ----
    const [rows] = await pool.query(
      `
      SELECT
        ud.mspin,
        ud.name,
        ud.role,
        ud.agency,
        ud.region,
        ud.zone,
        ud.city,
        ud.dealer_name,
        ud.dealer_code,
        ur.trainer,
        ur.percentage,
        ur.status        AS pass_fail,
        ur.rounds_status,
        ur.total_time,
        ur.updated_at
      FROM user_details ud
      LEFT JOIN user_result ur ON ur.mspin = ud.mspin
      ${whereSql}
      ORDER BY ud.region, ud.zone, ud.name
      `,
      params
    );

    // ---- Build workbook ----
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Skill Contest Portal';
    wb.created = new Date();

    const ws = wb.addWorksheet('Users', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Column definitions
    ws.columns = [
      { header: 'MSPIN',         key: 'mspin',         width: 16 },
      { header: 'Name',          key: 'name',          width: 24 },
      { header: 'Role',          key: 'role',          width: 16 },
      { header: 'Agency',        key: 'agency',        width: 20 },
      { header: 'Region',        key: 'region',        width: 14 },
      { header: 'Zone',          key: 'zone',          width: 12 },
      { header: 'City',          key: 'city',          width: 16 },
      { header: 'Dealer Name',   key: 'dealer_name',   width: 26 },
      { header: 'Dealer Code',   key: 'dealer_code',   width: 14 },
      { header: 'Trainer',       key: 'trainer',       width: 22 },
      { header: 'Percentage',    key: 'percentage',    width: 12 },
      { header: 'Status',        key: 'pass_fail',     width: 10 },
      { header: 'Rounds Status', key: 'rounds_status', width: 14 },
      { header: 'Total Time',    key: 'total_time',    width: 12 },
      { header: 'Updated At',    key: 'updated_at',    width: 20 },
    ];

    // Style header row
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.alignment = { vertical: 'middle', horizontal: 'center' };
    header.height = 22;
    header.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4C1D95' }, // purple-700
      };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left:   { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right:  { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });

    // Add data rows
    rows.forEach((r) => {
      const row = ws.addRow({
        mspin:         r.mspin,
        name:          r.name,
        role:          r.role,
        agency:        r.agency,
        region:        r.region,
        zone:          r.zone,
        city:          r.city,
        dealer_name:   r.dealer_name,
        dealer_code:   r.dealer_code,
        trainer:       r.trainer        || '—',
        percentage:    r.percentage != null ? Number(r.percentage) : null,
        pass_fail:     r.pass_fail      || '—',
        rounds_status: r.rounds_status  || '—',
        total_time:    r.total_time     || '—',
        updated_at:    r.updated_at ? new Date(r.updated_at) : null,
      });

      // Color-code Pass / Fail
      const statusCell = row.getCell('pass_fail');
      if (r.pass_fail === 'Pass') {
        statusCell.font = { bold: true, color: { argb: 'FF047857' } }; // emerald-700
      } else if (r.pass_fail === 'Fail') {
        statusCell.font = { bold: true, color: { argb: 'FFB91C1C' } }; // red-700
      }

      // Percentage formatting
      const pctCell = row.getCell('percentage');
      if (r.percentage != null) {
        pctCell.numFmt = '0.00"%"';
        pctCell.alignment = { horizontal: 'right' };
      }

      // Date formatting
      const dateCell = row.getCell('updated_at');
      if (dateCell.value) {
        dateCell.numFmt = 'yyyy-mm-dd hh:mm';
      }
    });

    // ---- Filename ----
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = `users_export_${stamp}.xlsx`;

    // ---- Send ----
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[/api/export/users] error:', err);
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
  console.log(`   GET /api/dashboard`);
});