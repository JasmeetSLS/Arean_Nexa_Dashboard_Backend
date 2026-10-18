const pool = require('../../config/db');

// =====================================================================
// GET /api/setup/projects
// =====================================================================
exports.getProjects = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, project_name AS \`name\`, project_name,
              total_rounds, total_score, passing_percentage,
              trainer_time_secs, status
         FROM project_round_config
        WHERE status = 'active'
        ORDER BY id`
    );
    res.json({ success: true, total: rows.length, projects: rows });
  } catch (err) {
    console.error('[getProjects]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/setup/filters
// Cascading filters: ?project=...&zone=...&region=...&dealerName=...
// =====================================================================
exports.getFilters = async (req, res) => {
  try {
    const { project, zone, region, dealerName } = req.query;

    // 1. Get ALL Projects (Top level dropdown)
    const [projects] = await pool.query(
      `SELECT id, project_name AS \`name\`, project_name, status 
         FROM project_round_config 
        WHERE status = 'active' 
        ORDER BY id`
    );

    // If no project selected yet, just return the list of projects
    if (!project) {
      return res.json({ success: true, projects });
    }

    // 2. Get Zones (Depends only on project)
    const [zones] = await pool.query(
      `SELECT DISTINCT zone FROM participants WHERE project_name = ? AND zone IS NOT NULL ORDER BY zone`,
      [project]
    );

    // 3. Get Regions (Depends on Zone)
    let regionQuery = `SELECT DISTINCT region FROM participants WHERE project_name = ? AND region IS NOT NULL`;
    const regionParams = [project];
    if (zone) {
      regionQuery += ` AND zone = ?`;
      regionParams.push(zone);
    }
    regionQuery += ` ORDER BY region`;
    const [regions] = await pool.query(regionQuery, regionParams);

    // 4. Get Dealer Names (Depends on Zone + Region)
    let dealerQuery = `SELECT DISTINCT dealer_name FROM participants WHERE project_name = ? AND dealer_name IS NOT NULL`;
    const dealerParams = [project];
    if (zone) { dealerQuery += ` AND zone = ?`; dealerParams.push(zone); }
    if (region) { dealerQuery += ` AND region = ?`; dealerParams.push(region); }
    dealerQuery += ` ORDER BY dealer_name`;
    const [dealers] = await pool.query(dealerQuery, dealerParams);

    // 5. Get Dealer Codes (Depends on Zone + Region + Dealer Name)
    let codeQuery = `SELECT DISTINCT dealer_code FROM participants WHERE project_name = ? AND dealer_code IS NOT NULL`;
    const codeParams = [project];
    if (zone) { codeQuery += ` AND zone = ?`; codeParams.push(zone); }
    if (region) { codeQuery += ` AND region = ?`; codeParams.push(region); }
    if (dealerName) { codeQuery += ` AND dealer_name = ?`; codeParams.push(dealerName); }
    codeQuery += ` ORDER BY dealer_code`;
    const [codes] = await pool.query(codeQuery, codeParams);

    // 6. Get Dates (Static per project)
    const [dates] = await pool.query(
      `SELECT DISTINCT date FROM participants WHERE project_name = ? AND date IS NOT NULL ORDER BY date DESC`,
      [project]
    );

    // 7. Get Trainers & Roles (Static per project)
    const [trainers] = await pool.query(`SELECT id, name, username FROM trainers WHERE status = 'active' ORDER BY name`);
    const [roles] = await pool.query(`SELECT DISTINCT role FROM participants WHERE project_name = ? AND role IS NOT NULL ORDER BY role`, [project]);

    res.json({
      success: true,
      projects,
      zones: zones.map(z => z.zone),
      regions: regions.map(r => r.region),
      dealerNames: dealers.map(d => d.dealer_name),
      dealerCodes: codes.map(c => c.dealer_code),
      dates: dates.map(d => new Date(d.date).toISOString().split('T')[0]),
      trainers: trainers,
      roles: roles.map(r => r.role),
    });
  } catch (err) {
    console.error('[getFilters]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/setup/dashboard
// ?project=...&regionPage=0&regionLimit=4&date=...&zone=...
// =====================================================================
exports.getDashboard = async (req, res) => {
  try {
    const regionPage  = parseInt(req.query.regionPage, 10)  || 0;
    const regionLimit = parseInt(req.query.regionLimit, 10) || 4;
    const offset      = regionPage * regionLimit;
    
    const { project, date, zone, region, dealerName, dealerCode, trainer, role } = req.query;

    if (!project) return res.status(400).json({ success: false, error: 'Project is required' });

    // --- DYNAMIC FILTERS ---
    let filterSql = '';
    const filterParams = [];
    if (date)       { filterSql += ' AND DATE(p.date) = ?'; filterParams.push(date); }
    if (zone)       { filterSql += ' AND p.zone = ?'; filterParams.push(zone); }
    if (region)     { filterSql += ' AND p.region = ?'; filterParams.push(region); }
    if (dealerName) { filterSql += ' AND p.dealer_name = ?'; filterParams.push(dealerName); }
    if (dealerCode) { filterSql += ' AND p.dealer_code = ?'; filterParams.push(dealerCode); }
    if (role)       { filterSql += ' AND p.role = ?'; filterParams.push(role); }
    if (trainer)    { filterSql += ' AND d.trainer_id = ?'; filterParams.push(trainer); }

    // 1) TODAY'S LIVE
    const [[todayLive]] = await pool.query(
      `SELECT
          CURDATE()                                                                     AS \`date\`,
          COUNT(*)                                                                      AS \`scheduled\`,
          COALESCE(SUM(d.round_status IN ('Completed','In Progress')), 0)               AS \`attempted\`,
          COALESCE(SUM(d.round_status = 'Completed'), 0)                                AS \`completed\`,
          COALESCE(SUM(d.round_status = 'In Progress'), 0)                              AS \`inProgress\`,
          COUNT(*) - COALESCE(SUM(d.round_status IN ('Completed','In Progress')), 0)   AS \`absentees\`,
          COALESCE(SUM(d.delay_status = 'Delay'), 0)                                    AS \`delayed\`,
          COALESCE(ROUND(SUM(d.status = 'Pass') /
              NULLIF(SUM(d.status = 'Pass') + SUM(d.status = 'Fail'), 0) * 100, 2), 0)  AS \`passRate\`,
          COALESCE(TIME_FORMAT(SEC_TO_TIME(AVG(d.total_secs)), '%H:%i:%s'), '00:00:00') AS \`avgTime\`,
          COUNT(DISTINCT d.trainer_id)                                                  AS \`activeTrainers\`
        FROM dashboard d
        JOIN participants p ON p.mpin = d.mpin
       WHERE d.project_name = ?
         AND (
              DATE(p.date) = CURDATE()
              OR EXISTS (
                   SELECT 1 FROM participant_rounds pr
                    WHERE pr.mpin = d.mpin
                      AND DATE(pr.start_time) = CURDATE()
              )
         )
         ${filterSql}`,
      [project, ...filterParams]
    );

    // 2) CONTEST TOTALS
    const [[contestTotals]] = await pool.query(
      `SELECT
          COUNT(*)                                                                      AS \`totalScheduled\`,
          COALESCE(SUM(d.round_status IN ('Completed','In Progress')), 0)               AS \`totalAttempted\`,
          COALESCE(SUM(d.round_status = 'Completed'), 0)                                AS \`completed\`,
          COALESCE(SUM(d.round_status = 'In Progress'), 0)                              AS \`inProgress\`,
          COUNT(*) - COALESCE(SUM(d.round_status IN ('Completed','In Progress')), 0)   AS \`totalAbsentees\`,
          COALESCE(SUM(d.delay_status = 'Delay'), 0)                                    AS \`delayed\`,
          COALESCE(ROUND(SUM(d.status = 'Pass') /
              NULLIF(SUM(d.status = 'Pass') + SUM(d.status = 'Fail'), 0) * 100, 2), 0)  AS \`passRate\`,
          COALESCE(TIME_FORMAT(SEC_TO_TIME(AVG(d.total_secs)), '%H:%i:%s'), '00:00:00') AS \`avgTime\`
        FROM dashboard d
        JOIN participants p ON p.mpin = d.mpin
       WHERE d.project_name = ?
         ${filterSql}`,
      [project, ...filterParams]
    );

    // 3) REGIONS
    const [[{ regionTotal }]] = await pool.query(
      `SELECT COUNT(*) AS \`regionTotal\`
         FROM (
           SELECT p.region, p.zone
             FROM dashboard d
             JOIN participants p ON p.mpin = d.mpin
            WHERE d.project_name = ?
              ${filterSql}
            GROUP BY p.region, p.zone
         ) AS t`,
      [project, ...filterParams]
    );

    const [regionSummary] = await pool.query(
      `SELECT
          p.region,
          p.zone,
          COALESCE(SUM(d.round_status = 'Completed'), 0)                                AS \`completed\`,
          COALESCE(ROUND(SUM(d.status = 'Pass') /
              NULLIF(SUM(d.status = 'Pass') + SUM(d.status = 'Fail'), 0) * 100, 2), 0)  AS \`passRate\`,
          COALESCE(TIME_FORMAT(SEC_TO_TIME(AVG(d.total_secs)), '%H:%i:%s'), '00:00:00') AS \`avgTime\`
        FROM dashboard d
        JOIN participants p ON p.mpin = d.mpin
       WHERE d.project_name = ?
         ${filterSql}
       GROUP BY p.region, p.zone
       ORDER BY p.region, p.zone
       LIMIT ? OFFSET ?`,
      [project, ...filterParams, regionLimit, offset]
    );

    res.json({
      success: true,
      projectName: project,
      todayLive,
      contestTotals,
      regionSummary,
      regionPagination: {
        page: regionPage,
        limit: regionLimit,
        total: Number(regionTotal) || 0,
        totalPages: Math.max(1, Math.ceil((Number(regionTotal) || 0) / regionLimit)),
      },
    });
  } catch (err) {
    console.error('[getDashboard]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/setup/grid-trainer
// ?project=...&page=0&limit=5&date=...
// =====================================================================
exports.getGridTrainer = async (req, res) => {
  try {
    const page  = parseInt(req.query.page,  10) || 0;
    const limit = parseInt(req.query.limit, 10) || 5;
    const offset = page * limit;

    const { project, date, zone, region, dealerName, dealerCode, trainer, role } = req.query;

    if (!project) return res.status(400).json({ success: false, error: 'Project is required' });

    // --- DYNAMIC FILTERS ---
    let filterSql = '';
    const filterParams = [];
    if (date)       { filterSql += ' AND DATE(p.date) = ?'; filterParams.push(date); }
    if (zone)       { filterSql += ' AND p.zone = ?'; filterParams.push(zone); }
    if (region)     { filterSql += ' AND p.region = ?'; filterParams.push(region); }
    if (dealerName) { filterSql += ' AND p.dealer_name = ?'; filterParams.push(dealerName); }
    if (dealerCode) { filterSql += ' AND p.dealer_code = ?'; filterParams.push(dealerCode); }
    if (role)       { filterSql += ' AND p.role = ?'; filterParams.push(role); }
    if (trainer)    { filterSql += ' AND d.trainer_id = ?'; filterParams.push(trainer); }

    // 1. Fetch DISTINCT round names
    const [roundRows] = await pool.query(
      `SELECT DISTINCT pr.round_name 
         FROM participant_rounds pr
         JOIN dashboard d ON d.mpin = pr.mpin
         JOIN participants p ON p.mpin = d.mpin
        WHERE d.project_name = ?
          ${filterSql}
        ORDER BY pr.round_name ASC`,
      [project, ...filterParams]
    );
    const rounds = roundRows.map(r => r.round_name);

    // 2. Get ONLY the 5 trainers for this page
    const [trainers] = await pool.query(
      `SELECT
          t.id,
          t.name,
          t.username,
          t.photo_url                                                                   AS \`photoUrl\`,
          COUNT(d.mpin)                                                                 AS \`totalAssigned\`,
          COALESCE(SUM(d.round_status = 'Completed'), 0)                                AS \`completedCount\`,
          COALESCE(ROUND(SUM(d.status = 'Pass') /
              NULLIF(SUM(d.status = 'Pass') + SUM(d.status = 'Fail'), 0) * 100, 2), 0)  AS \`passPercentage\`,
          COALESCE(TIME_FORMAT(SEC_TO_TIME(AVG(d.total_secs)), '%H:%i:%s'), '00:00:00') AS \`avgTime\`
        FROM trainers t
        LEFT JOIN dashboard d
          ON d.trainer_id = t.username
         AND d.project_name = ?
        LEFT JOIN participants p ON p.mpin = d.mpin
       WHERE t.status = 'active'
         ${filterSql}
       GROUP BY t.id, t.name, t.username, t.photo_url
       ORDER BY t.id
       LIMIT ? OFFSET ?`,
      [project, ...filterParams, limit, offset]
    );

    // Count total trainers that match the filters
    const [[{ trainerTotal }]] = await pool.query(
      `SELECT COUNT(DISTINCT t.id) AS \`trainerTotal\` 
         FROM trainers t
         LEFT JOIN dashboard d ON d.trainer_id = t.username AND d.project_name = ?
         LEFT JOIN participants p ON p.mpin = d.mpin
        WHERE t.status = 'active'
          ${filterSql}`,
      [project, ...filterParams]
    );

    res.json({
      success: true,
      projectName: project,
      rounds,
      trainers,
      pagination: {
        page, limit,
        total: Number(trainerTotal) || 0,
        totalPages: Math.max(1, Math.ceil((Number(trainerTotal) || 0) / limit)),
      },
    });
  } catch (err) {
    console.error('[getGridTrainer]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/setup/grid-participant
// ?project=...&page=0&limit=5&participantPage=0&date=...
// =====================================================================
exports.getGridParticipant = async (req, res) => {
  try {
    const page  = parseInt(req.query.page,  10) || 0;  
    const participantPage  = parseInt(req.query.participantPage, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 5;   

    const { project, date, zone, region, dealerName, dealerCode, trainer, role } = req.query;

    if (!project) return res.status(400).json({ success: false, error: 'Project is required' });

    const offset = page * limit;
    const pOffset = participantPage * limit;

    // --- DYNAMIC FILTERS ---
    let filterSql = '';
    const filterParams = [];
    if (date)       { filterSql += ' AND DATE(p.date) = ?'; filterParams.push(date); }
    if (zone)       { filterSql += ' AND p.zone = ?'; filterParams.push(zone); }
    if (region)     { filterSql += ' AND p.region = ?'; filterParams.push(region); }
    if (dealerName) { filterSql += ' AND p.dealer_name = ?'; filterParams.push(dealerName); }
    if (dealerCode) { filterSql += ' AND p.dealer_code = ?'; filterParams.push(dealerCode); }
    if (role)       { filterSql += ' AND p.role = ?'; filterParams.push(role); }
    if (trainer)    { filterSql += ' AND d.trainer_id = ?'; filterParams.push(trainer); }

    // 1. Get the exact same 5 trainers for this page
    const [trainerRows] = await pool.query(
      `SELECT DISTINCT t.id, t.username
         FROM trainers t
         LEFT JOIN dashboard d ON d.trainer_id = t.username AND d.project_name = ?
         LEFT JOIN participants p ON p.mpin = d.mpin
        WHERE t.status = 'active'
          ${filterSql}
        ORDER BY t.id
        LIMIT ? OFFSET ?`,
      [project, ...filterParams, limit, offset]
    );

    if (trainerRows.length === 0) {
      return res.json({ success: true, participants: [] });
    }

    const usernames = trainerRows.map(t => t.username);
    const usernameToIdMap = {};
    trainerRows.forEach(t => { usernameToIdMap[t.username] = t.id; });

    // 2. Fetch paginated participants for EACH trainer
    const [participants] = await pool.query(
      `SELECT * FROM (
          SELECT
             d.mpin,
             d.trainer_id,
             d.project_name                                                               AS \`projectName\`,
             d.marks,
             d.max_marks                                                                  AS \`totalScore\`,
             d.completed                                                                  AS \`completedRounds\`,
             d.required                                                                   AS \`totalRounds\`,
             d.percentage,
             d.total_time                                                                 AS \`totalTime\`,
             d.status,
             d.round_status                                                               AS \`roundsStatus\`,
             d.delay_status                                                               AS \`delayStatus\`,
             p.name,
             p.role,
             ROW_NUMBER() OVER (PARTITION BY d.trainer_id ORDER BY d.mpin)                AS rn
          FROM dashboard d
          JOIN participants p ON p.mpin = d.mpin
         WHERE d.project_name = ?
           AND d.trainer_id IN (?)
           ${filterSql}
       ) AS x
       WHERE rn > ? AND rn <= ?`,
      [project, usernames, ...filterParams, pOffset, pOffset + limit]
    );

    // 3. Fetch rounds for these participants
    let rounds = [];
    if (participants.length > 0) {
      const mpins = participants.map(p => p.mpin);
      [rounds] = await pool.query(
        `SELECT pr.mpin, pr.round_name AS \`roundName\`, pr.trainer_id AS \`trainerId\`,
                t.name AS \`trainerName\`, pr.score
           FROM participant_rounds pr
           LEFT JOIN trainers t ON t.username = pr.trainer_id
          WHERE pr.mpin IN (?)
          ORDER BY pr.mpin, pr.id`,
        [mpins]
      );
    }

    const roundsByMpin = {};
    for (const r of rounds) {
      (roundsByMpin[r.mpin] ||= []).push({
        roundName:   r.roundName,
        trainerId:   r.trainerId,
        trainerName: r.trainerName,
        score:       r.score,
      });
    }

    // 4. Shape response
    const shaped = participants.map(p => ({
      ...p,
      trainerId: Number(usernameToIdMap[p.trainer_id]) || null,
      marks: Number(p.marks) || 0,
      totalScore: Number(p.totalScore) || 100,
      completedRounds: Number(p.completedRounds) || 0,
      totalRounds: Number(p.totalRounds) || 5,
      percentage: Number(p.percentage) || 0,
      rounds: roundsByMpin[p.mpin] || [],
    }));

    res.json({
      success: true,
      participants: shaped,
    });
  } catch (err) {
    console.error('[getGridParticipant]', err);
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