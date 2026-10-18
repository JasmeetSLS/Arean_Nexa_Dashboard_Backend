const pool = require('../../config/db');

// =====================================================================
// GET /api/permissions/admins
// =====================================================================
exports.listAdmins = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, status
         FROM admin
        WHERE status = 'active'
        ORDER BY username`
    );
    res.json({ success: true, admins: rows });
  } catch (err) {
    console.error('[permission.listAdmins]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// =====================================================================
// GET /api/permissions/options?userId=1
// =====================================================================
exports.getOptions = async (req, res) => {
  try {
    // --- Roles / Zones / Regions from participants ---
    const [pRows] = await pool.query(
      `SELECT role, zone, region FROM participants`
    );
    const roles   = Array.from(new Set(pRows.map((p) => p.role  ).filter(Boolean))).sort();
    const zones   = Array.from(new Set(pRows.map((p) => p.zone  ).filter(Boolean))).sort();
    const regions = Array.from(new Set(pRows.map((p) => p.region).filter(Boolean))).sort();

    // --- Projects from project_round_config ---
    const [projRows] = await pool.query(
      `SELECT project_name
         FROM project_round_config
        WHERE status = 'active'
        ORDER BY project_name`
    );
    const projects = projRows.map((p) => p.project_name);

    // --- Existing permissions for this admin ---
    let existing = null;
    if (req.query.userId) {
      const [up] = await pool.query(
        `SELECT allowed_roles, allowed_zones, allowed_regions,
                allowed_projects, permissions
           FROM admin_permission
          WHERE admin_id = ?
          ORDER BY id DESC
          LIMIT 1`,
        [req.query.userId]
      );
      if (up.length) {
        existing = {
          allowed_roles:    up[0].allowed_roles,
          allowed_zones:    up[0].allowed_zones,
          allowed_regions:  up[0].allowed_regions,
          allowed_projects: up[0].allowed_projects,
          permissions:      up[0].permissions,
        };
      }
    }

    res.json({
      success: true,
      roles, zones, regions, projects,
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
      allowedZones    = [],
      allowedRegions  = [],
      allowedProjects = [],
      permissions     = {},
    } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const rolesJson    = JSON.stringify(allowedRoles);
    const zonesJson    = JSON.stringify(allowedZones);
    const regionsJson  = JSON.stringify(allowedRegions);
    const projectsJson = JSON.stringify(allowedProjects);
    const permsJson    = JSON.stringify(permissions);

    await conn.beginTransaction();

    const [existing] = await conn.query(
      `SELECT id FROM admin_permission
        WHERE admin_id = ?
        ORDER BY id DESC
        LIMIT 1`,
      [userId]
    );

    let action;

    if (existing.length) {
      await conn.query(
        `UPDATE admin_permission
            SET allowed_roles    = ?,
                allowed_zones    = ?,
                allowed_regions  = ?,
                allowed_projects = ?,
                permissions      = ?,
                updated_at       = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [rolesJson, zonesJson, regionsJson, projectsJson, permsJson, existing[0].id]
      );

      await conn.query(
        `DELETE FROM admin_permission WHERE admin_id = ? AND id <> ?`,
        [userId, existing[0].id]
      );

      action = 'updated';
    } else {
      await conn.query(
        `INSERT INTO admin_permission
           (admin_id, allowed_roles, allowed_zones, allowed_regions,
            allowed_projects, permissions)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, rolesJson, zonesJson, regionsJson, projectsJson, permsJson]
      );

      action = 'inserted';
    }

    await conn.commit();

    res.json({
      success: true,
      message: `Permissions ${action} successfully`,
      action,
      userId,
    });
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
    
    // Fetch permissions for the logged in admin
    const [[row]] = await pool.query(
      `SELECT permissions FROM admin_permission WHERE admin_id = ? LIMIT 1`,
      [userId]
    );

    // If no row exists, default to empty object (nothing visible)
    const perms = row?.permissions || {};

    res.json({ success: true, permissions: perms });
  } catch (err) {
    console.error('[getMyPermissions]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};