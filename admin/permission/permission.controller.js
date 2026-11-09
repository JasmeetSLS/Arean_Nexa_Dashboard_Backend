const pool = require('../../config/db');

// =====================================================================
// GET /api/permissions/admins
// =====================================================================
exports.listAdmins = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, status FROM admin WHERE status = 'active' ORDER BY username`
    );
    res.json({ success: true, admins: rows });
  } catch (err) {
    console.error('[permission.listAdmins]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/permissions/options?userId=1&projects=P1,P2
// Roles filtered by projects, Regions always all distinct
// =====================================================================
exports.getOptions = async (req, res) => {
  try {
    const { userId, projects } = req.query;
    const projectArr = projects ? String(projects).split(',').filter(Boolean) : [];

    // Projects
    const [projRows] = await pool.query(
      `SELECT project_name FROM project_round_config WHERE status = 'active' ORDER BY project_name`
    );

    // Roles (filtered by projects)
    let roleSql = `SELECT DISTINCT role FROM participants WHERE role IS NOT NULL`;
    const roleParams = [];
    if (projectArr.length) { roleSql += ` AND project_name IN (?)`; roleParams.push(projectArr); }
    roleSql += ` ORDER BY role`;
    const [roleRows] = await pool.query(roleSql, roleParams);

    // Regions (always all)
    const [regionRows] = await pool.query(
      `SELECT DISTINCT region FROM participants WHERE region IS NOT NULL ORDER BY region`
    );

    // Existing
    let existing = null;
    if (userId) {
      const [up] = await pool.query(
        `SELECT allowed_roles, allowed_regions, allowed_projects, permissions
           FROM admin_permission WHERE admin_id = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      if (up.length) existing = up[0];
    }

    res.json({
      success: true,
      projects: projRows.map((r) => r.project_name),
      roles:    roleRows.map((r) => r.role),
      regions:  regionRows.map((r) => r.region),
      existing,
    });
  } catch (err) {
    console.error('[permission.getOptions]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// POST /api/permissions
// =====================================================================
exports.savePermissions = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      userId,
      allowedRoles    = [],
      allowedRegions  = [],
      allowedProjects = [],
      permissions     = {},
    } = req.body;

    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

    await conn.beginTransaction();

    const [existing] = await conn.query(
      `SELECT id FROM admin_permission WHERE admin_id = ? ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    const values = [
      JSON.stringify(allowedRoles),
      JSON.stringify(allowedRegions),
      JSON.stringify(allowedProjects),
      JSON.stringify(permissions),
    ];

    let action;
    if (existing.length) {
      await conn.query(
        `UPDATE admin_permission
            SET allowed_roles = ?, allowed_regions = ?,
                allowed_projects = ?, permissions = ?,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [...values, existing[0].id]
      );
      await conn.query(`DELETE FROM admin_permission WHERE admin_id = ? AND id <> ?`, [userId, existing[0].id]);
      action = 'updated';
    } else {
      await conn.query(
        `INSERT INTO admin_permission
           (admin_id, allowed_roles, allowed_regions, allowed_projects, permissions)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, ...values]
      );
      action = 'inserted';
    }

    await conn.commit();
    res.json({ success: true, message: `Permissions ${action} successfully`, action, userId });
  } catch (err) {
    await conn.rollback();
    console.error('[permission.savePermissions]', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};

// =====================================================================
// GET /api/setup/my-permissions
// =====================================================================
exports.getMyPermissions = async (req, res) => {
  try {
    const { userId } = req.user;
    const [[row]] = await pool.query(
      `SELECT permissions FROM admin_permission WHERE admin_id = ? LIMIT 1`,
      [userId]
    );
    res.json({ success: true, permissions: row?.permissions || {} });
  } catch (err) {
    console.error('[getMyPermissions]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};