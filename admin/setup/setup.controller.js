const ExcelJS = require('exceljs');
const pool = require('../../config/db');

exports.getDashboard = async (req, res) => {
  try {
    const { project_id } = req.params;

    const [[cfg]] = await pool.query(
      `SELECT project_name FROM project_round_config WHERE id = ?`,
      [project_id]
    );
    if (!cfg) return res.status(404).json({ success: false, error: 'Project not found' });

    const projectName = cfg.project_name;

    // -------------------------------------------------------------
    // 1) Contest totals
    // -------------------------------------------------------------
    const [[totals]] = await pool.query(
      `SELECT
         COUNT(*)                                                       AS total_scheduled,
         COALESCE(SUM(status = 'Pass'), 0)                              AS total_pass,
         COALESCE(SUM(status = 'Fail'), 0)                              AS total_fail,
         COALESCE(SUM(round_status = 'Completed'), 0)                   AS completed,
         COALESCE(SUM(round_status = 'In Progress'), 0)                 AS in_progress,
         COALESCE(SUM(delay_status = 'Delay'), 0)                       AS delayed_count,
         COALESCE(ROUND(SUM(status = 'Pass') /
               NULLIF(SUM(status = 'Pass') + SUM(status = 'Fail'), 0) * 100, 2), 0)
                                                                        AS pass_rate,
         COALESCE(TIME_FORMAT(SEC_TO_TIME(AVG(total_secs)), '%H:%i:%s'), '00:00:00')
                                                                        AS avg_time
       FROM dashboard
      WHERE project_name = ?`,
      [projectName]
    );

    // -------------------------------------------------------------
    // 2) Today's live
    // -------------------------------------------------------------
    const [[todayLive]] = await pool.query(
      `SELECT
         COUNT(*)                                                       AS scheduled,
         COALESCE(SUM(d.round_status = 'Completed'), 0)                 AS completed,
         COALESCE(SUM(d.round_status = 'In Progress'), 0)               AS inProgress,
         COALESCE(SUM(d.delay_status = 'Delay'), 0)                     AS delayed_count,
         COALESCE(ROUND(SUM(d.status = 'Pass') /
               NULLIF(SUM(d.status = 'Pass') + SUM(d.status = 'Fail'), 0) * 100, 2), 0)
                                                                        AS passRate,
         COALESCE(TIME_FORMAT(SEC_TO_TIME(AVG(d.total_secs)), '%H:%i:%s'), '00:00:00')
                                                                        AS avgTime,
         COUNT(DISTINCT d.trainer_id)                                   AS activeTrainers
       FROM dashboard d
       JOIN participants p ON p.mpin = d.mpin
      WHERE d.project_name = ?
        AND DATE(p.date) = CURDATE()`,
      [projectName]
    );

    // -------------------------------------------------------------
    // 3) Region-wise summary
    // -------------------------------------------------------------
    const [regionSummary] = await pool.query(
      `SELECT
         p.region,
         p.zone,
         COUNT(*)                                                       AS total,
         COALESCE(SUM(d.round_status = 'Completed'), 0)                 AS completed,
         COALESCE(ROUND(SUM(d.status = 'Pass') /
               NULLIF(SUM(d.status = 'Pass') + SUM(d.status = 'Fail'), 0) * 100, 2), 0)
                                                                        AS passRate,
         COALESCE(TIME_FORMAT(SEC_TO_TIME(AVG(d.total_secs)), '%H:%i:%s'), '00:00:00')
                                                                        AS avgTime
       FROM dashboard d
       JOIN participants p ON p.mpin = d.mpin
      WHERE d.project_name = ?
      GROUP BY p.region, p.zone
      ORDER BY p.region, p.zone`,
      [projectName]
    );

    // -------------------------------------------------------------
    // 4) Trainer-wise summary
    // -------------------------------------------------------------
    const [trainerSummaryRows] = await pool.query(
      `SELECT
         t.id,
         t.name,
         t.username,
         t.photo_url                                                    AS photoUrl,
         COUNT(d.mpin)                                                  AS assigned,
         COALESCE(ROUND(SUM(d.status = 'Pass') /
               NULLIF(SUM(d.status = 'Pass') + SUM(d.status = 'Fail'), 0) * 100, 2), 0)
                                                                        AS passRate,
         COALESCE(TIME_FORMAT(SEC_TO_TIME(AVG(d.total_secs)), '%H:%i:%s'), '00:00:00')
                                                                        AS avgTime
       FROM trainers t
       LEFT JOIN dashboard d ON d.trainer_id = t.username AND d.project_name = ?
      GROUP BY t.id, t.name, t.username, t.photo_url
      ORDER BY t.id`,
      [projectName]
    );

    // -------------------------------------------------------------
    // 5) Round journey per trainer
    // -------------------------------------------------------------
    const [journeyRows] = await pool.query(
      `SELECT
         pr.trainer_id,
         LOWER(REPLACE(pr.round_name, ' ', '')) AS round_key,
         COUNT(DISTINCT pr.mpin)                AS cnt
       FROM participant_rounds pr
       JOIN dashboard d ON d.mpin = pr.mpin
      WHERE d.project_name = ?
      GROUP BY pr.trainer_id, round_key`,
      [projectName]
    );

    const journeyByTrainer = {};
    for (const j of journeyRows) {
      (journeyByTrainer[j.trainer_id] ||= {})[j.round_key] = String(j.cnt);
    }

    const trainerSummary = trainerSummaryRows.map(t => ({
      id:           t.id,
      name:         t.name,
      photoUrl:     t.photoUrl,
      assigned:     Number(t.assigned) || 0,
      passRate:     Number(t.passRate) || 0,
      avgTime:      t.avgTime ?? '00:00:00',
      roundJourney: journeyByTrainer[t.username] || {},
    }));

    // -------------------------------------------------------------
    // 6) Response
    // -------------------------------------------------------------
    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      projectId:   project_id || null,
      projectName,

      todayLive: {
        date:           new Date().toISOString().slice(0, 10),
        scheduled:      Number(todayLive.scheduled)      || 0,
        completed:      Number(todayLive.completed)      || 0,
        inProgress:     Number(todayLive.inProgress)     || 0,
        delayed:        Number(todayLive.delayed_count)  || 0,
        passRate:       Number(todayLive.passRate)       || 0,
        avgTime:        todayLive.avgTime                ?? '00:00:00',
        activeTrainers: Number(todayLive.activeTrainers) || 0,
      },

      regionSummary: regionSummary.map(r => ({
        region:    r.region,
        zone:      r.zone,
        total:     Number(r.total)     || 0,
        completed: Number(r.completed) || 0,
        passRate:  Number(r.passRate)  || 0,
        avgTime:   r.avgTime           ?? '00:00:00',
      })),

      trainerSummary,

      contestTotals: {
        totalScheduled: Number(totals.total_scheduled) || 0,
        totalAttempted: (Number(totals.completed) || 0) + (Number(totals.in_progress) || 0),
        completed:      Number(totals.completed)       || 0,
        inProgress:     Number(totals.in_progress)     || 0,
        delayed:        Number(totals.delayed_count)   || 0,
        passRate:       Number(totals.pass_rate)       || 0,
        avgTime:        totals.avg_time                ?? '00:00:00',
      },
    });
  } catch (err) {
    console.error('[getDashboard]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getGrid = async (req, res) => {
  try {
    const { project_id } = req.params;

    const [[cfg]] = await pool.query(
      `SELECT project_name FROM project_round_config WHERE id = ?`,
      [project_id]
    );
    if (!cfg) return res.status(404).json({ success: false, error: 'Project not found' });

    const projectName = cfg.project_name;

    // -------------------------------------------------------------
    // 1) Participants + dashboard
    // -------------------------------------------------------------
    const [users] = await pool.query(
      `SELECT
         d.mpin,
         p.name,
         p.role,
         d.project_name,
         t.id         AS trainer_id,
         t.name       AS trainer_name,
         t.photo_url  AS trainer_photo,
         d.marks,
         d.max_marks,
         d.completed,
         d.required,
         d.percentage,
         d.total_time,
         d.status,
         d.round_status,
         d.delay_status
       FROM dashboard d
       JOIN participants p ON p.mpin = d.mpin
       LEFT JOIN trainers t ON t.username = d.trainer_id
      WHERE d.project_name = ?
      ORDER BY d.mpin`,
      [projectName]
    );

    // -------------------------------------------------------------
    // 2) Rounds per participant
    // -------------------------------------------------------------
    const [rounds] = await pool.query(
      `SELECT pr.mpin,
              pr.round_name,
              pr.trainer_id,
              t.name AS trainer_name,
              pr.score
         FROM participant_rounds pr
         JOIN dashboard d ON d.mpin = pr.mpin
         LEFT JOIN trainers t ON t.username = pr.trainer_id
        WHERE d.project_name = ?
        ORDER BY pr.mpin, pr.id`,
      [projectName]
    );

    // -------------------------------------------------------------
    // 3) Trainers list
    // -------------------------------------------------------------
    const [trainers] = await pool.query(
      `SELECT id, name, photo_url FROM trainers ORDER BY id`
    );

    // -------------------------------------------------------------
    // 4) Trainer aggregates
    // -------------------------------------------------------------
    const [trainerAgg] = await pool.query(
      `SELECT
         t.id,
         COUNT(d.mpin)                                                  AS total_assigned,
         COALESCE(ROUND(SUM(d.status = 'Pass') /
               NULLIF(SUM(d.status = 'Pass') + SUM(d.status = 'Fail'), 0) * 100, 2), 0)
                                                                        AS pass_rate,
         COALESCE(TIME_FORMAT(SEC_TO_TIME(AVG(d.total_secs)), '%H:%i:%s'), '00:00:00')
                                                                        AS avg_time
       FROM trainers t
       LEFT JOIN dashboard d ON d.trainer_id = t.username AND d.project_name = ?
      GROUP BY t.id`,
      [projectName]
    );

    // -------------------------------------------------------------
    // 5) Shape
    // -------------------------------------------------------------
    const roundsByUser = {};
    for (const r of rounds) {
      (roundsByUser[r.mpin] ||= []).push({
        roundName:   r.round_name,
        trainerId:   r.trainer_id,
        trainerName: r.trainer_name,
        score:       r.score,
      });
    }

    const aggById = {};
    for (const a of trainerAgg) aggById[a.id] = a;

    const result = trainers.map((t) => {
      const a = aggById[t.id] || {};
      const assigned = users
        .filter(u => u.trainer_id === t.id)
        .map(u => ({
          mpin:            u.mpin,
          name:            u.name,
          role:            u.role,
          projectName:     u.project_name,
          totalRounds:     Number(u.required)   || 5,
          totalScore:      Number(u.max_marks)  || 100,
          marks:           Number(u.marks)      || 0,
          completedRounds: Number(u.completed)  || 0,
          percentage:      Number(u.percentage) || 0,
          totalTime:       u.total_time         ?? '00:00:00',
          status:          u.status             ?? 'Fail',
          roundsStatus:    u.round_status       ?? 'In Progress',
          delayStatus:     u.delay_status       ?? 'On Time',
          rounds:          roundsByUser[u.mpin] || [],
        }));

      return {
        trainer: {
          id:             t.id,
          name:           t.name,
          photoUrl:       t.photo_url,
          totalAssigned:  Number(a.total_assigned) || 0,
          passPercentage: Number(a.pass_rate)      || 0,
          avgTime:        a.avg_time               ?? '00:00:00',
          participants:   assigned,
        },
      };
    });

    // -------------------------------------------------------------
    // 6) Response
    // -------------------------------------------------------------
    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      projectId:   project_id || null,
      projectName,
      totalTrainers: result.length,
      trainers: result,
    });
  } catch (err) {
    console.error('[getGrid]', err);
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
// GET /api/setup/projects
// List all projects from project_round_config
// =====================================================================
exports.getProjects = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id,
              project_name,
              total_rounds,
              total_score,
              passing_percentage,
              trainer_time_secs,
              status,
              created_at,
              updated_at
         FROM project_round_config
        ORDER BY id`
    );

    // pretty shape for frontend
    const projects = rows.map((r) => ({
      id:                r.id,
      projectName:       r.project_name,
      totalRounds:       r.total_rounds,
      totalScore:        r.total_score,
      passingPercentage: Number(r.passing_percentage),
      trainerTimeSecs:   r.trainer_time_secs,
      status:            r.status,
      createdAt:         r.created_at,
      updatedAt:         r.updated_at,
    }));

    res.json({ success: true, total: projects.length, projects });
  } catch (err) {
    console.error('[getProjects]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// POST /api/setup/projects
// Add a new project to project_round_config
// Body: { projectName, totalRounds, totalScore,
//         passingPercentage, trainerTimeSecs, status }
// =====================================================================
exports.addProject = async (req, res) => {
  try {
    const {
      projectName,
      totalRounds,
      totalScore,
      passingPercentage,
      trainerTimeSecs,
      status,
    } = req.body;

    // ---- validate ----
    if (!projectName || !projectName.trim()) {
      return res.status(400).json({ success: false, error: 'projectName is required' });
    }
    if (totalRounds == null || totalRounds < 1 || totalRounds > 20) {
      return res.status(400).json({ success: false, error: 'totalRounds must be 1–20' });
    }
    if (totalScore == null || totalScore < 1) {
      return res.status(400).json({ success: false, error: 'totalScore must be > 0' });
    }
    if (passingPercentage == null || passingPercentage < 0 || passingPercentage > 100) {
      return res.status(400).json({ success: false, error: 'passingPercentage must be 0–100' });
    }
    if (trainerTimeSecs == null || trainerTimeSecs < 0) {
      return res.status(400).json({ success: false, error: 'trainerTimeSecs must be >= 0' });
    }

    const safeStatus = status === 'inactive' ? 'inactive' : 'active';

    // ---- insert ----
    const [result] = await pool.query(
      `INSERT INTO project_round_config
         (project_name, total_rounds, total_score,
          passing_percentage, trainer_time_secs, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        projectName.trim(),
        totalRounds,
        totalScore,
        passingPercentage,
        trainerTimeSecs,
        safeStatus,
      ]
    );

    res.json({ success: true, id: result.insertId, mode: 'created' });
  } catch (err) {
    console.error('[addProject]', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Project name already exists' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};