const pool = require('../../config/db');
const ExcelJS = require('exceljs');
// =====================================================================
// HELPER: Fetch Admin Permissions
// =====================================================================
async function getAdminPermissions(userId) {
  if (!userId) return null;
  try {
    const [[row]] = await pool.query(
      `SELECT allowed_roles, allowed_zones, allowed_regions, allowed_projects 
         FROM admin_permission 
        WHERE admin_id = ? LIMIT 1`,
      [userId]
    );
    if (!row) return null;

    return {
      roles:    Array.isArray(row.allowed_roles)    ? row.allowed_roles    : [],
      zones:    Array.isArray(row.allowed_zones)    ? row.allowed_zones    : [],
      regions:  Array.isArray(row.allowed_regions)  ? row.allowed_regions  : [],
      projects: Array.isArray(row.allowed_projects) ? row.allowed_projects : [],
    };
  } catch (err) {
    console.error('[getAdminPermissions]', err);
    return null;
  }
}

// =====================================================================
// GET /api/setup/filters
// =====================================================================
exports.getFilters = async (req, res) => {
  try {
    const { userId } = req.user || {};
    const perms = await getAdminPermissions(userId);

    const { project, zone, region, dealerName } = req.query;

    // 1. Get ALL Projects (Filtered by Admin Permissions)
    let projSql = `SELECT id, project_name AS \`name\`, project_name, status FROM project_round_config WHERE status = 'active'`;
    const projParams = [];

    if (perms) {
      if (perms.projects.length > 0) {
        projSql += ` AND project_name IN (?)`;
        projParams.push(perms.projects);
      } else {
        projSql += ` AND 1=0`; // No projects assigned
      }
    }
    projSql += ` ORDER BY id`;

    const [projects] = await pool.query(projSql, projParams);

    if (!project) return res.json({ success: true, projects });

    // --- Base permission filters for participants ---
    let permSql = '';
    const permParams = [];
    if (perms) {
      if (perms.zones.length > 0) { permSql += ` AND zone IN (?)`; permParams.push(perms.zones); } 
      else { permSql += ` AND 1=0`; }
      
      if (perms.regions.length > 0) { permSql += ` AND region IN (?)`; permParams.push(perms.regions); } 
      else { permSql += ` AND 1=0`; }

      if (perms.roles.length > 0) { permSql += ` AND role IN (?)`; permParams.push(perms.roles); } 
      else { permSql += ` AND 1=0`; }
    }

    // 2. Zones
    const [zones] = await pool.query(
      `SELECT DISTINCT zone FROM participants WHERE project_name = ? AND zone IS NOT NULL ${permSql} ORDER BY zone`, 
      [project, ...permParams]
    );

    // 3. Regions
    let regionQuery = `SELECT DISTINCT region FROM participants WHERE project_name = ? AND region IS NOT NULL ${permSql}`;
    const regionParams = [project, ...permParams];
    if (zone) { regionQuery += ` AND zone = ?`; regionParams.push(zone); }
    regionQuery += ` ORDER BY region`;
    const [regions] = await pool.query(regionQuery, regionParams);

    // 4. Dealer Names
    let dealerQuery = `SELECT DISTINCT dealer_name FROM participants WHERE project_name = ? AND dealer_name IS NOT NULL ${permSql}`;
    const dealerParams = [project, ...permParams];
    if (zone) { dealerQuery += ` AND zone = ?`; dealerParams.push(zone); }
    if (region) { dealerQuery += ` AND region = ?`; dealerParams.push(region); }
    dealerQuery += ` ORDER BY dealer_name`;
    const [dealers] = await pool.query(dealerQuery, dealerParams);

    // 5. Dealer Codes
    let codeQuery = `SELECT DISTINCT dealer_code FROM participants WHERE project_name = ? AND dealer_code IS NOT NULL ${permSql}`;
    const codeParams = [project, ...permParams];
    if (zone) { codeQuery += ` AND zone = ?`; codeParams.push(zone); }
    if (region) { codeQuery += ` AND region = ?`; codeParams.push(region); }
    if (dealerName) { codeQuery += ` AND dealer_name = ?`; codeParams.push(dealerName); }
    codeQuery += ` ORDER BY dealer_code`;
    const [codes] = await pool.query(codeQuery, codeParams);

    // 6. Dates
    const [dates] = await pool.query(
      `SELECT DISTINCT date FROM participants WHERE project_name = ? AND date IS NOT NULL ${permSql} ORDER BY date DESC`, 
      [project, ...permParams]
    );

    // 7. Trainers & Roles
    const [trainers] = await pool.query(`SELECT id, name, username FROM trainers WHERE status = 'active' ORDER BY name`);
    const [roles] = await pool.query(`SELECT DISTINCT role FROM participants WHERE project_name = ? AND role IS NOT NULL ${permSql} ORDER BY role`, [project, ...permParams]);

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
// GET /api/setup/grid-trainer
// =====================================================================
exports.getGridTrainer = async (req, res) => {
  try {
    const { userId } = req.user || {};
    const perms = await getAdminPermissions(userId);
    
    const page  = parseInt(req.query.page,  10) || 0;
    const limit = parseInt(req.query.limit, 10) || 5;
    const offset = page * limit;

    const { project, date, zone, region, dealerName, dealerCode, trainer, role, searchTrainer, searchParticipant } = req.query;

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

    if (searchTrainer) { filterSql += ' AND t.name LIKE ?'; filterParams.push(`%${searchTrainer}%`); }
    if (searchParticipant) { 
      filterSql += ` AND (p.mpin LIKE ? OR p.name LIKE ?)`;
      filterParams.push(`%${searchParticipant}%`, `%${searchParticipant}%`);
    }

    // --- ADMIN PERMISSION FILTERS ---
    if (perms) {
      if (!perms.projects.includes(project)) return res.json({ success: true, rounds: [], trainers: [], pagination: { total: 0, totalPages: 1 }});
      if (perms.zones.length > 0) { filterSql += ' AND p.zone IN (?)'; filterParams.push(perms.zones); } else { filterSql += ' AND 1=0'; }
      if (perms.regions.length > 0) { filterSql += ' AND p.region IN (?)'; filterParams.push(perms.regions); } else { filterSql += ' AND 1=0'; }
      if (perms.roles.length > 0) { filterSql += ' AND p.role IN (?)'; filterParams.push(perms.roles); } else { filterSql += ' AND 1=0'; }
    }

    // 1. Rounds
    const [roundRows] = await pool.query(
      `SELECT DISTINCT pr.round_name 
         FROM participant_rounds pr
         JOIN dashboard d ON d.mpin = pr.mpin
         JOIN participants p ON p.mpin = d.mpin
         JOIN trainers t ON t.username = d.trainer_id
        WHERE d.project_name = ?
          ${filterSql}
        ORDER BY pr.round_name ASC`,
      [project, ...filterParams]
    );
    const rounds = roundRows.map(r => r.round_name);

    // 2. Trainers
    const [trainers] = await pool.query(
      `SELECT
          t.id, t.name, t.username,
          t.photo_url AS \`photoUrl\`,
          COUNT(d.mpin) AS \`totalAssigned\`,
          COALESCE(SUM(d.round_status = 'Completed'), 0) AS \`completedCount\`,
          COALESCE(ROUND(SUM(d.status = 'Pass') /
              NULLIF(SUM(d.status = 'Pass') + SUM(d.status = 'Fail'), 0) * 100, 2), 0)  AS \`passPercentage\`,
          COALESCE(TIME_FORMAT(SEC_TO_TIME(AVG(d.total_secs)), '%H:%i:%s'), '00:00:00') AS \`avgTime\`
        FROM trainers t
        LEFT JOIN dashboard d ON d.trainer_id = t.username AND d.project_name = ?
        LEFT JOIN participants p ON p.mpin = d.mpin
       WHERE t.status = 'active'
         ${filterSql}
       GROUP BY t.id, t.name, t.username, t.photo_url
       HAVING COUNT(d.mpin) > 0
       ORDER BY t.id
       LIMIT ? OFFSET ?`,
      [project, ...filterParams, limit, offset]
    );

    // 3. Total Count
    const [[{ trainerTotal }]] = await pool.query(
      `SELECT COUNT(DISTINCT t.id) AS \`trainerTotal\` 
         FROM trainers t
         LEFT JOIN dashboard d ON d.trainer_id = t.username AND d.project_name = ?
         LEFT JOIN participants p ON p.mpin = d.mpin
        WHERE t.status = 'active'
          ${filterSql}
          AND d.mpin IS NOT NULL`,
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
// =====================================================================
exports.getGridParticipant = async (req, res) => {
  try {
    const { userId } = req.user || {};
    const perms = await getAdminPermissions(userId);

    const page  = parseInt(req.query.page,  10) || 0;  
    const participantPage  = parseInt(req.query.participantPage, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 5;   

    const { project, date, zone, region, dealerName, dealerCode, trainer, role, searchTrainer, searchParticipant } = req.query;

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

    if (searchTrainer) { filterSql += ' AND t.name LIKE ?'; filterParams.push(`%${searchTrainer}%`); }
    if (searchParticipant) { 
      filterSql += ` AND (p.mpin LIKE ? OR p.name LIKE ?)`;
      filterParams.push(`%${searchParticipant}%`, `%${searchParticipant}%`);
    }

    // --- ADMIN PERMISSION FILTERS ---
    if (perms) {
      if (!perms.projects.includes(project)) return res.json({ success: true, participants: [] });
      if (perms.zones.length > 0) { filterSql += ' AND p.zone IN (?)'; filterParams.push(perms.zones); } else { filterSql += ' AND 1=0'; }
      if (perms.regions.length > 0) { filterSql += ' AND p.region IN (?)'; filterParams.push(perms.regions); } else { filterSql += ' AND 1=0'; }
      if (perms.roles.length > 0) { filterSql += ' AND p.role IN (?)'; filterParams.push(perms.roles); } else { filterSql += ' AND 1=0'; }
    }

    // 1. Get trainers
    const [trainerRows] = await pool.query(
      `SELECT DISTINCT t.id, t.username
         FROM trainers t
         LEFT JOIN dashboard d ON d.trainer_id = t.username AND d.project_name = ?
         LEFT JOIN participants p ON p.mpin = d.mpin
        WHERE t.status = 'active'
          ${filterSql}
          AND d.mpin IS NOT NULL
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

    // 2. Fetch participants
    const [participants] = await pool.query(
      `SELECT * FROM (
          SELECT
             d.mpin, d.trainer_id,
             d.project_name AS \`projectName\`,
             d.marks,
             d.max_marks AS \`totalScore\`,
             d.completed AS \`completedRounds\`,
             d.required AS \`totalRounds\`,
             d.percentage,
             d.total_time AS \`totalTime\`,
             d.status,
             d.round_status AS \`roundsStatus\`,
             d.delay_status AS \`delayStatus\`,
             p.name, p.role,
             ROW_NUMBER() OVER (PARTITION BY d.trainer_id ORDER BY d.mpin) AS rn
          FROM dashboard d
          JOIN participants p ON p.mpin = d.mpin
          JOIN trainers t ON t.username = d.trainer_id
         WHERE d.project_name = ?
           AND d.trainer_id IN (?)
           ${filterSql}
       ) AS x
       WHERE rn > ? AND rn <= ?`,
      [project, usernames, ...filterParams, pOffset, pOffset + limit]
    );

    // 3. Fetch rounds
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

    // 4. Shape
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

    res.json({ success: true, participants: shaped });
  } catch (err) {
    console.error('[getGridParticipant]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/setup/dashboard
// =====================================================================
exports.getDashboard = async (req, res) => {
  try {
    const { userId } = req.user || {};
    const perms = await getAdminPermissions(userId);

    const regionPage  = parseInt(req.query.regionPage, 10)  || 0;
    const regionLimit = parseInt(req.query.regionLimit, 10) || 4;
    const offset      = regionPage * regionLimit;
    
    const { project, date, zone, region, dealerName, dealerCode, trainer, role } = req.query;

    if (!project) return res.status(400).json({ success: false, error: 'Project is required' });
    if (perms && !perms.projects.includes(project)) {
      return res.json({ success: true, todayLive: {}, contestTotals: {}, regionSummary: [], regionPagination: { total: 0, totalPages: 1 } });
    }

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

    // --- ADMIN PERMISSION FILTERS ---
    if (perms) {
      if (perms.zones.length > 0) { filterSql += ' AND p.zone IN (?)'; filterParams.push(perms.zones); } else { filterSql += ' AND 1=0'; }
      if (perms.regions.length > 0) { filterSql += ' AND p.region IN (?)'; filterParams.push(perms.regions); } else { filterSql += ' AND 1=0'; }
      if (perms.roles.length > 0) { filterSql += ' AND p.role IN (?)'; filterParams.push(perms.roles); } else { filterSql += ' AND 1=0'; }
    }

    // 1) TODAY'S LIVE
    const [[todayLive]] = await pool.query(
      `SELECT
          CURDATE() AS \`date\`,
          COUNT(*) AS \`scheduled\`,
          COALESCE(SUM(d.round_status IN ('Completed','In Progress')), 0) AS \`attempted\`,
          COALESCE(SUM(d.round_status = 'Completed'), 0) AS \`completed\`,
          COALESCE(SUM(d.round_status = 'In Progress'), 0) AS \`inProgress\`,
          COUNT(*) - COALESCE(SUM(d.round_status IN ('Completed','In Progress')), 0) AS \`absentees\`,
          COALESCE(SUM(d.delay_status = 'Delay'), 0) AS \`delayed\`,
          COALESCE(ROUND(SUM(d.status = 'Pass') /
              NULLIF(SUM(d.status = 'Pass') + SUM(d.status = 'Fail'), 0) * 100, 2), 0)  AS \`passRate\`,
          COALESCE(TIME_FORMAT(SEC_TO_TIME(AVG(d.total_secs)), '%H:%i:%s'), '00:00:00') AS \`avgTime\`,
          COUNT(DISTINCT d.trainer_id) AS \`activeTrainers\`
        FROM dashboard d
        JOIN participants p ON p.mpin = d.mpin
       WHERE d.project_name = ?
         AND (DATE(p.date) = CURDATE() OR EXISTS (SELECT 1 FROM participant_rounds pr WHERE pr.mpin = d.mpin AND DATE(pr.start_time) = CURDATE()))
         ${filterSql}`,
      [project, ...filterParams]
    );

    // 2) CONTEST TOTALS
    const [[contestTotals]] = await pool.query(
      `SELECT
          COUNT(*) AS \`totalScheduled\`,
          COALESCE(SUM(d.round_status IN ('Completed','In Progress')), 0) AS \`totalAttempted\`,
          COALESCE(SUM(d.round_status = 'Completed'), 0) AS \`completed\`,
          COALESCE(SUM(d.round_status = 'In Progress'), 0) AS \`inProgress\`,
          COUNT(*) - COALESCE(SUM(d.round_status IN ('Completed','In Progress')), 0) AS \`totalAbsentees\`,
          COALESCE(SUM(d.delay_status = 'Delay'), 0) AS \`delayed\`,
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
          p.region, p.zone,
          COALESCE(SUM(d.round_status = 'Completed'), 0) AS \`completed\`,
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

exports.getProjects = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id,
              project_name       AS projectName,
              total_rounds       AS totalRounds,
              rounds,
              total_score        AS totalScore,
              passing_percentage AS passingPercentage,
              trainer_time_secs  AS trainerTimeSecs,
              status,
              created_at         AS createdAt
         FROM project_round_config
        ORDER BY id`
    );
    const projects = rows.map(r => ({
      ...r,
      rounds: typeof r.rounds === 'string' ? JSON.parse(r.rounds) : (r.rounds || []),
    }));
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.addProject = async (req, res) => {
  try {
    const { projectName, rounds, passingPercentage, trainerTimeSecs } = req.body;

    if (!projectName?.trim())
      return res.status(400).json({ success: false, error: 'projectName is required' });
    if (!Array.isArray(rounds) || rounds.length === 0 || rounds.length > 20)
      return res.status(400).json({ success: false, error: 'rounds must be 1–20 items' });
    if (passingPercentage == null || passingPercentage < 0 || passingPercentage > 100)
      return res.status(400).json({ success: false, error: 'passingPercentage must be 0–100' });
    if (trainerTimeSecs == null || trainerTimeSecs < 0)
      return res.status(400).json({ success: false, error: 'trainerTimeSecs must be >= 0' });

    const cleaned = rounds.map((r, i) => ({
      name:  String(r?.name || '').trim() || `Round ${i + 1}`,
      score: Number(r?.score) || 0,
    }));

    const totalRounds = cleaned.length;
    const totalScore  = cleaned.reduce((a, r) => a + r.score, 0);

    const [result] = await pool.query(
      `INSERT INTO project_round_config
         (project_name, total_rounds, rounds, total_score,
          passing_percentage, trainer_time_secs, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [
        projectName.trim(),
        totalRounds,
        JSON.stringify(cleaned),
        totalScore,
        passingPercentage,
        trainerTimeSecs,
      ]
    );

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ success: false, error: 'Project already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.uploadParticipants = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, error: 'Excel file is required' });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);

    const ws = wb.worksheets[0];
    if (!ws)
      return res.status(400).json({ success: false, error: 'No worksheet found' });

    // ---- read headers (row 1), trim + lowercase ----
    const headers = [];
    ws.getRow(1).eachCell((cell, col) => {
      headers[col] = String(cell.value || '').trim().toLowerCase();
    });

    const rows   = [];
    const errors = [];

    // ---- normalize "9:30 AM" → "09:30 AM" ----
    const parseSlotTime = (v) => {
      if (!v) return null;
      const s = String(v).trim().toUpperCase().replace(/\s+/g, ' ');
      const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
      if (!m) return null;
      const [, h, mm, ap] = m;
      return `${h.padStart(2, '0')}:${mm} ${ap}`;
    };

    ws.eachRow((row, rowNo) => {
      if (rowNo === 1) return;

      const obj = {};
      headers.forEach((h, col) => {
        if (!h) return;
        let v = row.getCell(col).value;
        if (v instanceof Date) v = v.toISOString().slice(0, 10);
        obj[h] = v == null ? '' : String(v).trim();
      });

      // skip fully empty rows
      if (Object.values(obj).every(v => !v)) return;

      const project = obj.project_name;
      const mpin    = obj.mpin;
      const name    = obj.name;

      if (!project) { errors.push(`Row ${rowNo}: project_name required`); return; }
      if (!mpin)    { errors.push(`Row ${rowNo}: mpin required`);         return; }
      if (!name)    { errors.push(`Row ${rowNo}: name required`);         return; }

      // ---- date: MM/DD/YYYY or YYYY-MM-DD ----
      let dateVal = null;
      const raw = obj.date;
      if (raw) {
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
          dateVal = raw.slice(0, 10);
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
          const [mm, dd, yyyy] = raw.split('/');
          dateVal = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        }
      }

      rows.push({
        project_name: project,
        level:        obj.level       || null,       // ← NEW
        mpin,
        name,
        role:         obj.role        || null,
        region:       obj.region      || null,
        zone:         obj.zone        || null,
        city:         obj.city        || null,
        dealer_name:  obj.dealer_name || null,
        dealer_code:  obj.dealer_code || null,
        date:         dateVal,
        time_from:    parseSlotTime(obj.time_from),  // ← NEW
        time_to:      parseSlotTime(obj.time_to),    // ← NEW
      });
    });

    if (errors.length > 0)
      return res.status(400).json({
        success: false,
        error: errors.slice(0, 5).join('; '),
        errors,
      });

    if (rows.length === 0)
      return res.status(400).json({ success: false, error: 'Excel has no data rows' });

    // ---- split into insert vs update by mpin ----
    const mpins = rows.map(r => r.mpin);
    const [existing] = await pool.query(
      `SELECT mpin FROM participants WHERE mpin IN (?)`,
      [mpins]
    );
    const existingSet = new Set(existing.map(r => r.mpin));

    const toInsert = rows.filter(r => !existingSet.has(r.mpin));
    const toUpdate = rows.filter(r =>  existingSet.has(r.mpin));

    // ---- INSERT ----
    let insertedCount = 0;
    if (toInsert.length > 0) {
      const insertValues = toInsert.map(r => [
        r.project_name, r.level, r.mpin, r.name, r.role, r.region,
        r.zone, r.city, r.dealer_name, r.dealer_code, r.date,
        r.time_from, r.time_to,
      ]);
      const [insRes] = await pool.query(
        `INSERT INTO participants
           (project_name, level, mpin, name, role, region, zone,
            city, dealer_name, dealer_code, date,
            time_from, time_to)
         VALUES ?`,
        [insertValues]
      );
      insertedCount = insRes.affectedRows;
    }

    // ---- UPDATE ----
    let updatedCount = 0;
    for (const r of toUpdate) {
      const [updRes] = await pool.query(
        `UPDATE participants SET
           project_name = ?,
           level        = ?,
           name         = ?,
           role         = ?,
           region       = ?,
           zone         = ?,
           city         = ?,
           dealer_name  = ?,
           dealer_code  = ?,
           date         = ?,
           time_from    = ?,
           time_to      = ?
         WHERE mpin = ?`,
        [
          r.project_name,
          r.level,
          r.name,
          r.role,
          r.region,
          r.zone,
          r.city,
          r.dealer_name,
          r.dealer_code,
          r.date,
          r.time_from,
          r.time_to,
          r.mpin,
        ]
      );
      updatedCount += updRes.affectedRows;
    }

    res.json({
      success: true,
      inserted: insertedCount,
      updated:  updatedCount,
      total:    rows.length,
    });
  } catch (err) {
    console.error('[uploadParticipants]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.downloadParticipantTemplate = async (_req, res) => {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Participants', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    ws.columns = [
      { header: 'project_name', key: 'project_name', width: 18 },
      { header: 'level',        key: 'level',        width: 10 },   // ← NEW
      { header: 'mpin',         key: 'mpin',         width: 18 },
      { header: 'name',         key: 'name',         width: 26 },
      { header: 'role',         key: 'role',         width: 16 },
      { header: 'region',       key: 'region',       width: 12 },
      { header: 'zone',         key: 'zone',         width: 14 },
      { header: 'city',         key: 'city',         width: 16 },
      { header: 'dealer_name',  key: 'dealer_name',  width: 30 },
      { header: 'dealer_code',  key: 'dealer_code',  width: 14 },
      { header: 'date',         key: 'date',         width: 14 },
      { header: 'time_from',    key: 'time_from',    width: 12 },   // ← NEW
      { header: 'time_to',      key: 'time_to',      width: 12 },   // ← NEW
    ];

    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.alignment = { vertical: 'middle', horizontal: 'center' };
    header.height = 24;
    header.eachCell((cell) => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C1D95' } };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left:   { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right:  { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });

    ws.addRow({
      project_name: 'Arena L1',
      level:        'L1',
      mpin:         '1461374',
      name:         'RAJESH THAKUR',
      role:         'Sales Expert',
      region:       'C1',
      zone:         'C1',
      city:         'DELHI',
      dealer_name:  'AAA VEHICLEADES PVT LTD',
      dealer_code:  '08B4-08',
      date:         '9/18/2026',
      time_from:    '9:30 AM',
      time_to:      '9:50 AM',
    });
    ws.addRow({
      project_name: 'Arena L1',
      level:        'L1',
      mpin:         '1461375',
      name:         'AMAR KUMAR',
      role:         'Sales Expert',
      region:       'C1',
      zone:         'C1',
      city:         'DELHI',
      dealer_name:  'AAA VEHICLEADES PVT LTD',
      dealer_code:  '08B4-08',
      date:         '9/18/2026',
      time_from:    '9:50 AM',
      time_to:      '10:10 AM',
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="participants_template.xlsx"');

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[downloadParticipantTemplate]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};