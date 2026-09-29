const ExcelJS = require('exceljs');
const pool    = require('../../config/db');

// =====================================================================
// Inlined time helpers
// =====================================================================
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
// =====================================================================
exports.getGrid = async (_req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT
        ud.mpin,
        ud.name,
        ud.role,
        t.id         AS trainer_id,
        t.name       AS trainer_name,
        t.photo_url  AS trainer_photo
      FROM participants ud
      LEFT JOIN participant_rounds pr
        ON pr.id = (
          SELECT p2.id
          FROM participant_rounds p2
          WHERE p2.mpin = ud.mpin
          ORDER BY p2.id DESC
          LIMIT 1
        )
      LEFT JOIN trainers t
        ON t.name = pr.trainer_name
      ORDER BY ud.mpin
    `);

    const [rounds] = await pool.query(`
      SELECT mpin, round_name, trainer_name, score
      FROM participant_rounds
      ORDER BY mpin, id
    `);

    const [results] = await pool.query(`
      SELECT mpin, percentage, total_time, status, rounds_status
      FROM user_result
    `);

    const [trainerRows] = await pool.query(`
      SELECT id, name, photo_url
      FROM trainers
      ORDER BY id
    `);

    const roundsByUser = {};
    for (const r of rounds) {
      if (!roundsByUser[r.mpin]) roundsByUser[r.mpin] = [];
      roundsByUser[r.mpin].push({
        roundName:   r.round_name,
        trainerName: r.trainer_name,
        score:       r.score,
      });
    }

    const resultByUser = {};
    for (const r of results) resultByUser[r.mpin] = r;

    const trainers = trainerRows.map((t) => {
      const assigned = users
        .filter((u) => u.trainer_id === t.id)
        .map((u) => {
          const ur = resultByUser[u.mpin] || {};
          return {
            mpin:         u.mpin,
            name:         u.name,
            role:         u.role,
            percentage:   ur.percentage    ?? 0,
            totalTime:    ur.total_time    ?? '00:00:00',
            status:       ur.status        ?? 'Fail',
            roundsStatus: ur.rounds_status ?? 'In Progress',
            rounds:       roundsByUser[u.mpin] || [],
          };
        });

      const totalAssigned = assigned.length;
      const passCount = assigned.filter((p) => p.status === 'Pass').length;
      const passPercentage =
        totalAssigned > 0
          ? Number(((passCount / totalAssigned) * 100).toFixed(2))
          : 0;

      const totalSecs = assigned.reduce((sum, p) => sum + hmsToSeconds(p.totalTime), 0);
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
    console.error('[setup.getGrid]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/dashboard
// =====================================================================
exports.getDashboard = async (_req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT mpin, name, region, zone, round_start_time
      FROM participants
    `);

    const [rounds] = await pool.query(`
      SELECT mpin, trainer_name, round_name, score, end_time
      FROM participant_rounds
    `);

    const [results] = await pool.query(`
      SELECT mpin, percentage, total_time, status, rounds_status
      FROM user_result
    `);

    const [trainerRows] = await pool.query(`
      SELECT id, name, photo_url
      FROM trainers
      ORDER BY id
    `);

    const resultByUser = {};
    for (const r of results) resultByUser[r.mpin] = r;

    const userByMpin = {};
    for (const u of users) userByMpin[u.mpin] = u;

    // ---- todayLive ----
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm   = String(today.getMonth() + 1).padStart(2, '0');
    const dd   = String(today.getDate()).padStart(2, '0');
    const todayDate = `${yyyy}-${mm}-${dd}`;

    const todayUsers = users.filter(
      (u) => u.round_start_time && String(u.round_start_time).slice(0, 10) === todayDate
    );
    const todayMpins = new Set(todayUsers.map((u) => u.mpin));
    const todayResults = results.filter((r) => todayMpins.has(r.mpin));

    const tPass = todayResults.filter((r) => r.status === 'Pass').length;
    const tFail = todayResults.filter((r) => r.status === 'Fail').length;

    const tPassRate = (tPass + tFail) > 0
      ? Number(((tPass / (tPass + tFail)) * 100).toFixed(2))
      : 0;

    const tSecs = todayResults.reduce((sum, r) => sum + hmsToSeconds(r.total_time), 0);
    const tAvgTime = todayResults.length > 0
      ? secondsToHms(Math.round(tSecs / todayResults.length))
      : '00:00:00';

    const todayCompleted = todayResults.filter((r) => r.rounds_status === 'Completed').length;
    const todayInProgress = todayMpins.size - todayCompleted;

    const activeTrainers = new Set(rounds.map((r) => r.trainer_name).filter(Boolean));

    const todayLive = {
      date:           todayDate,
      scheduled:      todayMpins.size,
      completed:      todayCompleted,
      inProgress:     todayInProgress,
      passRate:       tPassRate,
      avgTime:        tAvgTime,
      activeTrainers: activeTrainers.size,
    };

    // ---- regionSummary ----
    const regionBuckets = {};
    for (const r of results) {
      const u = userByMpin[r.mpin];
      if (!u) continue;
      const key = `${u.region || '—'}|${u.zone || '—'}`;
      if (!regionBuckets[key]) {
        regionBuckets[key] = {
          region: u.region || '—', zone: u.zone || '—',
          total: 0, completed: 0, pass: 0, fail: 0, totalSecs: 0,
        };
      }
      const b = regionBuckets[key];
      b.total += 1;
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

    // ---- trainerSummary ----
    const trainerSummary = trainerRows.map((t) => {
      const assignedUsers = users.filter((u) => {
        const userRounds = rounds.filter((r) => r.mpin === u.mpin);
        if (userRounds.length === 0) return false;
        return userRounds[userRounds.length - 1].trainer_name === t.name;
      });

      const assigned = assignedUsers.length;
      const pass = assignedUsers.filter((u) => {
        const ur = resultByUser[u.mpin]; return ur && ur.status === 'Pass';
      }).length;
      const fail = assignedUsers.filter((u) => {
        const ur = resultByUser[u.mpin]; return ur && ur.status === 'Fail';
      }).length;

      const secs = assignedUsers.reduce((sum, u) => {
        const ur = resultByUser[u.mpin];
        return sum + (ur ? hmsToSeconds(ur.total_time) : 0);
      }, 0);

      const roundJourney = {};
      rounds.forEach((r) => {
        if (r.trainer_name !== t.name) return;
        if (r.score == null || r.end_time == null) return;
        const key = r.round_name.toLowerCase().replace(/\s+/g, '');
        roundJourney[key] = (roundJourney[key] || 0) + 1;
      });

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

    // ---- contestTotals ----
    const totalScheduled = users.length;
    const totalAttempted = rounds.filter((r) => r.score != null && r.end_time != null).length;
    const overallPass = results.filter((r) => r.status === 'Pass').length;
    const overallFail = results.filter((r) => r.status === 'Fail').length;
    const overallPassRate = (overallPass + overallFail) > 0
      ? Number(((overallPass / (overallPass + overallFail)) * 100).toFixed(2))
      : 0;
    const allSecs = results.reduce((sum, r) => sum + hmsToSeconds(r.total_time), 0);
    const overallAvg = results.length > 0
      ? secondsToHms(Math.round(allSecs / results.length))
      : '00:00:00';

    const totalCompleted = results.filter((r) => r.rounds_status === 'Completed').length;
    const totalInProgress = results.filter((r) => r.rounds_status !== 'Completed').length;

    const contestTotals = {
      totalScheduled,
      totalAttempted,
      completed:  totalCompleted,
      inProgress: totalInProgress,
      passRate:   overallPassRate,
      avgTime:    overallAvg,
    };

    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      todayLive,
      regionSummary,
      trainerSummary,
      contestTotals,
    });
  } catch (err) {
    console.error('[setup.getDashboard]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/filters
// =====================================================================
exports.getFilters = async (_req, res) => {
  try {
    const [dateRows] = await pool.query(`
      SELECT DISTINCT DATE(round_start_time) AS d
      FROM participants WHERE round_start_time IS NOT NULL
      ORDER BY d DESC
    `);
    const [zoneRows]       = await pool.query(`SELECT DISTINCT zone FROM participants WHERE zone IS NOT NULL AND zone <> '' ORDER BY zone`);
    const [regionRows]     = await pool.query(`SELECT DISTINCT region FROM participants WHERE region IS NOT NULL AND region <> '' ORDER BY region`);
    const [trainerRows]    = await pool.query(`SELECT id, name, photo_url FROM trainers ORDER BY name`);
    const [roleRows]       = await pool.query(`SELECT DISTINCT role FROM participants WHERE role IS NOT NULL AND role <> '' ORDER BY role`);
    const [agencyRows]     = await pool.query(`SELECT DISTINCT agency FROM participants WHERE agency IS NOT NULL AND agency <> '' ORDER BY agency`);
    const [dealerNameRows] = await pool.query(`SELECT DISTINCT dealer_name FROM participants WHERE dealer_name IS NOT NULL AND dealer_name <> '' ORDER BY dealer_name`);
    const [dealerCodeRows] = await pool.query(`SELECT DISTINCT dealer_code FROM participants WHERE dealer_code IS NOT NULL AND dealer_code <> '' ORDER BY dealer_code`);

    const dates = dateRows.map(r =>
      typeof r.d === 'string' ? r.d : new Date(r.d).toISOString().slice(0, 10)
    );

    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      dates,
      zones:       zoneRows.map(r => r.zone),
      regions:     regionRows.map(r => r.region),
      trainers:    trainerRows.map(t => ({ id: t.id, name: t.name, photoUrl: t.photo_url })),
      roles:       roleRows.map(r => r.role),
      agencies:    agencyRows.map(r => r.agency),
      dealerNames: dealerNameRows.map(r => r.dealer_name),
      dealerCodes: dealerCodeRows.map(r => r.dealer_code),
    });
  } catch (err) {
    console.error('[setup.getFilters]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/export/users
// =====================================================================
exports.exportUsers = async (req, res) => {
  try {
    const {
      region, zone, role, status,
      agency, dealerName, dealerCode, trainer,
    } = req.query;

    const where = [];
    const params = [];
    if (region)     { where.push('ud.region = ?');      params.push(region); }
    if (zone)       { where.push('ud.zone = ?');        params.push(zone); }
    if (role)       { where.push('ud.role = ?');        params.push(role); }
    if (status)     { where.push('ur.status = ?');      params.push(status); }
    if (agency)     { where.push('ud.agency = ?');      params.push(agency); }
    if (dealerName) { where.push('ud.dealer_name = ?'); params.push(dealerName); }
    if (dealerCode) { where.push('ud.dealer_code = ?'); params.push(dealerCode); }
    if (trainer)    { where.push('ur.trainer = ?');     params.push(trainer); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `
      SELECT
        ud.mpin, ud.name, ud.role, ud.agency, ud.region, ud.zone,
        ud.city, ud.dealer_name, ud.dealer_code,
        ur.trainer, ur.percentage, ur.status AS pass_fail,
        ur.rounds_status, ur.total_time, ur.updated_at
      FROM participants ud
      LEFT JOIN user_result ur ON ur.mpin = ud.mpin
      ${whereSql}
      ORDER BY ud.region, ud.zone, ud.name
      `,
      params
    );

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Skill Contest Portal';
    wb.created = new Date();

    const ws = wb.addWorksheet('Users', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    ws.columns = [
      { header: 'MPIN',          key: 'mpin',          width: 16 },
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

    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.alignment = { vertical: 'middle', horizontal: 'center' };
    header.height = 22;
    header.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C1D95' } };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left:   { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right:  { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });

    rows.forEach((r) => {
      const row = ws.addRow({
        mpin:          r.mpin,
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

      const statusCell = row.getCell('pass_fail');
      if (r.pass_fail === 'Pass')
        statusCell.font = { bold: true, color: { argb: 'FF047857' } };
      else if (r.pass_fail === 'Fail')
        statusCell.font = { bold: true, color: { argb: 'FFB91C1C' } };

      const pctCell = row.getCell('percentage');
      if (r.percentage != null) {
        pctCell.numFmt = '0.00"%"';
        pctCell.alignment = { horizontal: 'right' };
      }

      const dateCell = row.getCell('updated_at');
      if (dateCell.value) dateCell.numFmt = 'yyyy-mm-dd hh:mm';
    });

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = `users_export_${stamp}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[setup.exportUsers]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};