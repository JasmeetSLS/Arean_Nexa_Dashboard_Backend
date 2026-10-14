const ExcelJS = require('exceljs');
const pool    = require('../../config/db');

// =====================================================================
// Time helpers
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
// GET /api/grid/:project_id
// =====================================================================
exports.getGrid = async (req, res) => {
  try {
    const { project_id } = req.params;

    let projectName = null;
    if (project_id) {
      const [[cfg]] = await pool.query(
        `SELECT project_name FROM project_round_config WHERE id = ?`,
        [project_id]
      );
      if (!cfg) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }
      projectName = cfg.project_name;
    }

    const where  = [];
    const params = [];
    if (projectName) { where.push('ud.project_name = ?'); params.push(projectName); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Participants + latest round's trainer (join via username)
    const [users] = await pool.query(
      `
      SELECT
        ud.mpin,
        ud.name,
        ud.role,
        ud.project_name,
        t.id         AS trainer_id,
        t.name       AS trainer_name,
        t.photo_url  AS trainer_photo
      FROM participants ud
      LEFT JOIN participant_rounds pr
        ON pr.id = (
          SELECT p2.id FROM participant_rounds p2
          WHERE p2.mpin = ud.mpin
          ORDER BY p2.id DESC LIMIT 1
        )
      LEFT JOIN trainers t ON t.username = pr.trainer_id
      ${whereSql}
      ORDER BY ud.mpin
      `,
      params
    );

    // Rounds per participant — bring back the trainer display name via join
    const [rounds] = await pool.query(
      `
      SELECT pr.mpin,
             pr.round_name,
             pr.trainer_id,
             t.name AS trainer_name,
             pr.score
      FROM participant_rounds pr
      JOIN participants ud ON ud.mpin = pr.mpin
      LEFT JOIN trainers t ON t.username = pr.trainer_id
      ${whereSql}
      ORDER BY pr.mpin, pr.id
      `,
      params
    );

    // user_result scoped to project
    const [results] = await pool.query(
      `
      SELECT ur.mpin, ur.trainer_id, ur.percentage, ur.total_time,
             ur.status, ur.rounds_status
      FROM user_result ur
      JOIN participants ud ON ud.mpin = ur.mpin
      ${whereSql}
      `,
      params
    );

    const [trainerRows] = await pool.query(
      `SELECT id, name, photo_url FROM trainers ORDER BY id`
    );

    const [configRows] = await pool.query(
      `
      SELECT project_name, total_rounds, total_score, passing_percentage
      FROM project_round_config
      ${projectName ? 'WHERE project_name = ?' : ''}
      `,
      projectName ? [projectName] : []
    );
    const configMap = {};
    for (const c of configRows) {
      configMap[c.project_name] = {
        totalRounds:       c.total_rounds,
        totalScore:        c.total_score,
        passingPercentage: Number(c.passing_percentage),
      };
    }

    const roundsByUser = {};
    for (const r of rounds) {
      (roundsByUser[r.mpin] ||= []).push({
        roundName:   r.round_name,
        trainerId:   r.trainer_id,     // username
        trainerName: r.trainer_name,   // display name from trainers
        score:       r.score,
      });
    }

    const resultByUser = {};
    for (const r of results) resultByUser[r.mpin] = r;

    const trainers = trainerRows.map((t) => {
      const assigned = users
        .filter((u) => u.trainer_id === t.id)
        .map((u) => {
          const ur  = resultByUser[u.mpin] || {};
          const cfg = configMap[u.project_name] || {
            totalRounds: 5, totalScore: 100, passingPercentage: 80,
          };
          return {
            mpin:              u.mpin,
            name:              u.name,
            role:              u.role,
            projectName:       u.project_name,
            totalRounds:       cfg.totalRounds,
            totalScore:        cfg.totalScore,
            passingPercentage: cfg.passingPercentage,
            percentage:        ur.percentage    ?? 0,
            totalTime:         ur.total_time    ?? '00:00:00',
            status:            ur.status        ?? 'Fail',
            roundsStatus:      ur.rounds_status ?? 'In Progress',
            rounds:            roundsByUser[u.mpin] || [],
          };
        });

      const totalAssigned  = assigned.length;
      const passCount      = assigned.filter((p) => p.status === 'Pass').length;
      const passPercentage = totalAssigned > 0
        ? Number(((passCount / totalAssigned) * 100).toFixed(2))
        : 0;

      const totalSecs = assigned.reduce((s, p) => s + hmsToSeconds(p.totalTime), 0);
      const avgTime   = totalAssigned > 0
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
      projectId:   project_id || null,
      projectName,
      totalTrainers: trainers.length,
      trainers,
    });
  } catch (err) {
    console.error('[setup.getGrid]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/dashboard/:project_id
// =====================================================================
exports.getDashboard = async (req, res) => {
  try {
    const { project_id } = req.params;

    let projectName = null;
    if (project_id) {
      const [[cfg]] = await pool.query(
        `SELECT project_name FROM project_round_config WHERE id = ?`,
        [project_id]
      );
      if (!cfg) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }
      projectName = cfg.project_name;
    }

    const where  = [];
    const params = [];
    if (projectName) { where.push('p.project_name = ?'); params.push(projectName); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [users] = await pool.query(
      `SELECT p.mpin, p.name, p.region, p.zone, p.project_name
         FROM participants p ${whereSql}`,
      params
    );

    // Rounds — bring trainer display name via join
    const [rounds] = await pool.query(
      `SELECT pr.mpin,
              pr.trainer_id,
              t.name AS trainer_name,
              pr.round_name,
              pr.score, pr.start_time, pr.end_time
         FROM participant_rounds pr
         JOIN participants p ON p.mpin = pr.mpin
         LEFT JOIN trainers t ON t.username = pr.trainer_id
         ${whereSql}`,
      params
    );

    const [results] = await pool.query(
      `SELECT ur.mpin, ur.trainer_id, ur.percentage,
              ur.total_time, ur.status, ur.rounds_status
         FROM user_result ur
         JOIN participants p ON p.mpin = ur.mpin
         ${whereSql}`,
      params
    );

    const [trainerRows] = await pool.query(
      `SELECT id, name, username, photo_url FROM trainers ORDER BY id`
    );

    const [configRows] = await pool.query(
      `SELECT project_name, total_rounds, total_score, passing_percentage
         FROM project_round_config
         ${projectName ? 'WHERE project_name = ?' : ''}`,
      projectName ? [projectName] : []
    );
    const configMap = {};
    for (const c of configRows) {
      configMap[c.project_name] = {
        totalRounds:       c.total_rounds,
        totalScore:        c.total_score,
        passingPercentage: Number(c.passing_percentage),
      };
    }

    const resultByUser = {};
    for (const r of results) resultByUser[r.mpin] = r;

    const userByMpin = {};
    for (const u of users) userByMpin[u.mpin] = u;

    // ---- todayLive ----
    const today = new Date();
    const todayDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');

    const todayMpins = new Set(
      rounds
        .filter(r => r.start_time && String(r.start_time).slice(0, 10) === todayDate)
        .map(r => r.mpin)
    );
    const todayResults = results.filter(r => todayMpins.has(r.mpin));

    const tPass = todayResults.filter(r => r.status === 'Pass').length;
    const tFail = todayResults.filter(r => r.status === 'Fail').length;
    const tPassRate = (tPass + tFail) > 0
      ? Number(((tPass / (tPass + tFail)) * 100).toFixed(2))
      : 0;

    const tSecs    = todayResults.reduce((s, r) => s + hmsToSeconds(r.total_time), 0);
    const tAvgTime = todayResults.length > 0
      ? secondsToHms(Math.round(tSecs / todayResults.length))
      : '00:00:00';

    const todayCompleted  = todayResults.filter(r => r.rounds_status === 'Completed').length;
    const todayInProgress = todayMpins.size - todayCompleted;

    const activeTrainers = new Set(rounds.map(r => r.trainer_id).filter(Boolean));

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
        const userRounds = rounds.filter(r => r.mpin === u.mpin);
        if (!userRounds.length) return false;
        return userRounds[userRounds.length - 1].trainer_id === t.username;
      });

      const assigned = assignedUsers.length;
      const pass = assignedUsers.filter(u => resultByUser[u.mpin]?.status === 'Pass').length;
      const fail = assignedUsers.filter(u => resultByUser[u.mpin]?.status === 'Fail').length;

      const secs = assignedUsers.reduce((s, u) => {
        const ur = resultByUser[u.mpin];
        return s + (ur ? hmsToSeconds(ur.total_time) : 0);
      }, 0);

      const roundJourney = {};
      rounds.forEach(r => {
        if (r.trainer_id !== t.username) return;
        if (r.score == null || r.end_time == null) return;
        const key = r.round_name.toLowerCase().replace(/\s+/g, '');
        roundJourney[key] = (roundJourney[key] || 0) + 1;
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
        roundJourney: Object.fromEntries(
          Object.entries(roundJourney).map(([k, v]) => [k, String(v)])
        ),
      };
    });

    // ---- projectSummary ----
    const projectBuckets = {};
    for (const u of users) {
      const key = u.project_name || '—';
      if (!projectBuckets[key]) {
        const cfg = configMap[key] || {
          totalRounds: 5, totalScore: 100, passingPercentage: 80,
        };
        projectBuckets[key] = {
          projectName:       key,
          totalRounds:       cfg.totalRounds,
          totalScore:        cfg.totalScore,
          passingPercentage: cfg.passingPercentage,
          totalUsers: 0, completed: 0, inProgress: 0,
        };
      }
      projectBuckets[key].totalUsers += 1;
      const ur = resultByUser[u.mpin];
      if (ur?.rounds_status === 'Completed') projectBuckets[key].completed += 1;
      else                                   projectBuckets[key].inProgress += 1;
    }
    const projectSummary = Object.values(projectBuckets)
      .sort((a, b) => a.projectName.localeCompare(b.projectName));

    // ---- contestTotals ----
    const totalScheduled = users.length;
    const totalAttempted = rounds.filter(r => r.score != null && r.end_time != null).length;
    const overallPass = results.filter(r => r.status === 'Pass').length;
    const overallFail = results.filter(r => r.status === 'Fail').length;
    const overallPassRate = (overallPass + overallFail) > 0
      ? Number(((overallPass / (overallPass + overallFail)) * 100).toFixed(2))
      : 0;
    const allSecs = results.reduce((s, r) => s + hmsToSeconds(r.total_time), 0);
    const overallAvg = results.length > 0
      ? secondsToHms(Math.round(allSecs / results.length))
      : '00:00:00';

    const totalCompleted  = results.filter(r => r.rounds_status === 'Completed').length;
    const totalInProgress = results.filter(r => r.rounds_status !== 'Completed').length;

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
      projectId:   project_id || null,
      projectName,
      todayLive,
      regionSummary,
      trainerSummary,
      projectSummary,
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
    const [projectRows] = await pool.query(`
      SELECT id, project_name, total_rounds, total_score, passing_percentage
      FROM project_round_config
      WHERE status = 'active'
      ORDER BY project_name
    `);

    const [dateRows] = await pool.query(`
      SELECT DISTINCT DATE(pr.start_time) AS d
      FROM participant_rounds pr
      WHERE pr.start_time IS NOT NULL
      ORDER BY d DESC
    `);

    const [zoneRows]       = await pool.query(`SELECT DISTINCT zone       FROM participants WHERE zone       IS NOT NULL AND zone       <> '' ORDER BY zone`);
    const [regionRows]     = await pool.query(`SELECT DISTINCT region     FROM participants WHERE region     IS NOT NULL AND region     <> '' ORDER BY region`);
    const [trainerRows]    = await pool.query(`SELECT id, name, photo_url FROM trainers ORDER BY name`);
    const [roleRows]       = await pool.query(`SELECT DISTINCT role       FROM participants WHERE role       IS NOT NULL AND role       <> '' ORDER BY role`);
    const [dealerNameRows] = await pool.query(`SELECT DISTINCT dealer_name FROM participants WHERE dealer_name IS NOT NULL AND dealer_name <> '' ORDER BY dealer_name`);
    const [dealerCodeRows] = await pool.query(`SELECT DISTINCT dealer_code FROM participants WHERE dealer_code IS NOT NULL AND dealer_code <> '' ORDER BY dealer_code`);

    const dates = dateRows.map(r =>
      typeof r.d === 'string' ? r.d : new Date(r.d).toISOString().slice(0, 10)
    );

    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      projects: projectRows.map(r => ({
        id:                r.id,
        name:              r.project_name,
        totalRounds:       r.total_rounds,
        totalScore:        r.total_score,
        passingPercentage: Number(r.passing_percentage),
      })),
      dates,
      zones:       zoneRows.map(r => r.zone),
      regions:     regionRows.map(r => r.region),
      trainers:    trainerRows.map(t => ({ id: t.id, name: t.name, photoUrl: t.photo_url })),
      roles:       roleRows.map(r => r.role),
      dealerNames: dealerNameRows.map(r => r.dealer_name),
      dealerCodes: dealerCodeRows.map(r => r.dealer_code),
    });
  } catch (err) {
    console.error('[setup.getFilters]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/export/users/:project_id
// =====================================================================
exports.exportUsers = async (req, res) => {
  try {
    const { project_id } = req.params;
    const {
      region, zone, role, status,
      dealerName, dealerCode, trainer,
    } = req.query;

    let projectName = null;
    if (project_id) {
      const [[cfg]] = await pool.query(
        `SELECT project_name FROM project_round_config WHERE id = ?`,
        [project_id]
      );
      if (!cfg) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }
      projectName = cfg.project_name;
    }

    const where  = [];
    const params = [];
    if (projectName) { where.push('ud.project_name = ?'); params.push(projectName); }
    if (region)      { where.push('ud.region = ?');       params.push(region); }
    if (zone)        { where.push('ud.zone = ?');         params.push(zone); }
    if (role)        { where.push('ud.role = ?');         params.push(role); }
    if (status)      { where.push('ur.status = ?');       params.push(status); }
    if (dealerName)  { where.push('ud.dealer_name = ?');  params.push(dealerName); }
    if (dealerCode)  { where.push('ud.dealer_code = ?');  params.push(dealerCode); }
    // Filter by trainer NAME → match against trainers.username via ur.trainer_id
    if (trainer)     { where.push('ur.trainer_id = ?');   params.push(trainer); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `
      SELECT
        ud.project_name,
        ud.mpin, ud.name, ud.role, ud.region, ud.zone,
        ud.city, ud.dealer_name, ud.dealer_code,
        ur.trainer_id,
        t.name AS trainer_name,
        ur.percentage, ur.status AS pass_fail,
        ur.rounds_status, ur.total_time, ur.updated_at
      FROM participants ud
      LEFT JOIN user_result ur ON ur.mpin = ud.mpin
      LEFT JOIN trainers t ON t.username = ur.trainer_id
      ${whereSql}
      ORDER BY ud.project_name, ud.region, ud.zone, ud.name
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
      { header: 'Project',       key: 'project_name',  width: 16 },
      { header: 'MPIN',          key: 'mpin',          width: 16 },
      { header: 'Name',          key: 'name',          width: 24 },
      { header: 'Role',          key: 'role',          width: 16 },
      { header: 'Region',        key: 'region',        width: 14 },
      { header: 'Zone',          key: 'zone',          width: 12 },
      { header: 'City',          key: 'city',          width: 16 },
      { header: 'Dealer Name',   key: 'dealer_name',   width: 26 },
      { header: 'Dealer Code',   key: 'dealer_code',   width: 14 },
      { header: 'Trainer ID',    key: 'trainer_id',    width: 16 },  // username
      { header: 'Trainer',       key: 'trainer_name',  width: 22 },  // display name
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
        project_name:  r.project_name   || '—',
        mpin:          r.mpin,
        name:          r.name,
        role:          r.role,
        region:        r.region,
        zone:          r.zone,
        city:          r.city,
        dealer_name:   r.dealer_name,
        dealer_code:   r.dealer_code,
        trainer_id:    r.trainer_id    || '—',
        trainer_name:  r.trainer_name  || '—',
        percentage:    r.percentage != null ? Number(r.percentage) : null,
        pass_fail:     r.pass_fail     || '—',
        rounds_status: r.rounds_status || '—',
        total_time:    r.total_time    || '—',
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

// =====================================================================
// GET /api/setup
// =====================================================================
exports.getSetup = async (_req, res) => {
  try {
    const [cfg] = await pool.query(
      `SELECT id, project_name
         FROM setup_config
        WHERE status = 'active'
        ORDER BY id DESC LIMIT 1`
    );

    if (!cfg.length) {
      return res.json({ success: true, setup: null, fields: [] });
    }

    const [fields] = await pool.query(
      `SELECT field_group, field_key, field_order, sort_order, is_selected
         FROM setup_field_master
        WHERE setup_config_id = ?
        ORDER BY sort_order, field_order`,
      [cfg[0].id]
    );

    res.json({
      success: true,
      setup: {
        id: cfg[0].id,
        projectName: cfg[0].project_name,
      },
      fields: fields.map((f) => ({
        field_group: f.field_group,
        field_key:   f.field_key,
        field_order: f.field_order,
        sort_order:  f.sort_order,
        is_selected: !!f.is_selected,
      })),
    });
  } catch (err) {
    console.error('[setup.getSetup]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// POST /api/setup
// body: { projectName, fields:[{ field_group, field_key,
//                                field_order, sort_order, is_selected }] }
// =====================================================================
exports.saveSetup = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { projectName, fields } = req.body;

    if (!projectName || !String(projectName).trim()) {
      return res.status(400).json({ success: false, error: 'projectName is required' });
    }
    if (!Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ success: false, error: 'fields array is required' });
    }

    await conn.beginTransaction();

    // ---------- 1. setup_config : SELECT → UPDATE / INSERT ----------
    const [cfg] = await conn.query(
      `SELECT id FROM setup_config
        WHERE status = 'active'
        ORDER BY id DESC LIMIT 1`
    );

    let setupConfigId;
    let configAction;

    if (cfg.length) {
      // UPDATE
      setupConfigId = cfg[0].id;
      await conn.query(
        `UPDATE setup_config
            SET project_name = ?
          WHERE id = ?`,
        [String(projectName).trim(), setupConfigId]
      );

      // safety: remove any stray duplicates for the same active config
      await conn.query(
        `DELETE FROM setup_config
          WHERE status = 'active' AND id <> ?`,
        [setupConfigId]
      );

      configAction = 'updated';
    } else {
      // INSERT
      const [ins] = await conn.query(
        `INSERT INTO setup_config (project_name, status)
         VALUES (?, 'active')`,
        [String(projectName).trim()]
      );
      setupConfigId = ins.insertId;
      configAction  = 'inserted';
    }

    // ---------- 2. setup_field_master : delete + re-insert ----------
    await conn.query(
      `DELETE FROM setup_field_master WHERE setup_config_id = ?`,
      [setupConfigId]
    );

    const rows = fields.map((f) => [
      setupConfigId,
      f.field_key,
      f.field_group,
      Number(f.field_order) || 0,
      Number(f.sort_order)  || 0,
      f.is_selected ? 1 : 0,
    ]);

    await conn.query(
      `INSERT INTO setup_field_master
         (setup_config_id, field_key, field_group, field_order, sort_order, is_selected)
       VALUES ?`,
      [rows]
    );

    // ---------- 3. user_permission : SELECT → UPDATE / INSERT ----------
    if (req.user && req.user.id) {
      const permissions = {};
      fields.forEach((f) => {
        if (!permissions[f.field_group]) permissions[f.field_group] = {};
        permissions[f.field_group][f.field_key] = !!f.is_selected;
      });

      const rolesJson   = JSON.stringify(req.body.allowedRoles   || []);
      const zonesJson   = JSON.stringify(req.body.allowedZones   || []);
      const regionsJson = JSON.stringify(req.body.allowedRegions || []);
      const permsJson   = JSON.stringify(permissions);

      const [existing] = await conn.query(
        `SELECT id FROM user_permission
          WHERE user_id = ? AND setup_config_id = ?
          ORDER BY id DESC
          LIMIT 1`,
        [req.user.id, setupConfigId]
      );

      if (existing.length) {
        // UPDATE existing row
        await conn.query(
          `UPDATE user_permission
              SET allowed_roles   = ?,
                  allowed_zones   = ?,
                  allowed_regions = ?,
                  permissions     = ?,
                  updated_at      = CURRENT_TIMESTAMP
            WHERE id = ?`,
          [rolesJson, zonesJson, regionsJson, permsJson, existing[0].id]
        );

        // safety: remove stale duplicates for same (user, config)
        await conn.query(
          `DELETE FROM user_permission
            WHERE user_id = ? AND setup_config_id = ? AND id <> ?`,
          [req.user.id, setupConfigId, existing[0].id]
        );
      } else {
        // INSERT new row
        await conn.query(
          `INSERT INTO user_permission
             (user_id, setup_config_id, allowed_roles, allowed_zones,
              allowed_regions, permissions)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            req.user.id,
            setupConfigId,
            rolesJson,
            zonesJson,
            regionsJson,
            permsJson,
          ]
        );
      }
    }

    await conn.commit();

    res.json({
      success: true,
      message: 'Setup saved successfully',
      configAction,
      setupConfigId,
      projectName: String(projectName).trim(),
      fieldsSaved: rows.length,
    });
  } catch (err) {
    await conn.rollback();
    console.error('[setup.saveSetup]', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};