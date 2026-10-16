const pool = require('../../config/db'); // adjust path to your db config

// =====================================================================
// GET /api/permissions/admins
//   → list of admin users for the dropdown
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
//   → roles / zones / regions from participants
//   → projects from project_round_config
//   → existing admin_permission row for this admin
//   (sections are static on the frontend — NOT fetched)
// =====================================================================
exports.getOptions = async (req, res) => {
  try {
    // --- 1. Roles / Zones / Regions from participants ---
    const [pRows] = await pool.query(
      `SELECT role, zone, region FROM participants`
    );
    const roles   = Array.from(new Set(pRows.map((p) => p.role  ).filter(Boolean))).sort();
    const zones   = Array.from(new Set(pRows.map((p) => p.zone  ).filter(Boolean))).sort();
    const regions = Array.from(new Set(pRows.map((p) => p.region).filter(Boolean))).sort();

    // --- 2. Projects from project_round_config ---
    const [projRows] = await pool.query(
      `SELECT project_name
         FROM project_round_config
        WHERE status = 'active'
        ORDER BY project_name`
    );
    const projects = projRows.map((p) => p.project_name);

    // --- 3. Existing permissions for this admin ---
    let existing = null;
    if (req.query.userId) {
      const [up] = await pool.query(
        `SELECT allowed_roles, allowed_zones, allowed_regions,
                allowed_projects,
                permissions
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
// body: {
//   userId,                         // → admin_id in DB
//   allowedRoles, allowedZones, allowedRegions, allowedProjects,
//   permissions: { <group>: { <field_key>: bool } }
// }
// → UPSERT into admin_permission
// =====================================================================
exports.savePermissions = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      userId,                       // = admin_id
      allowedRoles    = [],
      allowedZones    = [],
      allowedRegions  = [],
      allowedProjects = [],
      permissions     = {},
    } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    // -------- serialize payload --------
    const rolesJson    = JSON.stringify(allowedRoles);
    const zonesJson    = JSON.stringify(allowedZones);
    const regionsJson  = JSON.stringify(allowedRegions);
    const projectsJson = JSON.stringify(allowedProjects);
    const permsJson    = JSON.stringify(permissions);

    await conn.beginTransaction();

    // -------- does a row already exist? --------
    const [existing] = await conn.query(
      `SELECT id FROM admin_permission
        WHERE admin_id = ?
        ORDER BY id DESC
        LIMIT 1`,
      [userId]
    );

    let action;

    if (existing.length) {
      // ---------- UPDATE ----------
      await conn.query(
        `UPDATE admin_permission
            SET allowed_roles    = ?,
                allowed_zones    = ?,
                allowed_regions  = ?,
                allowed_projects = ?,
                permissions      = ?,
                updated_at       = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [
          rolesJson, zonesJson, regionsJson,
          projectsJson, permsJson,
          existing[0].id,
        ]
      );

      // safety cleanup (UNIQUE prevents duplicates anyway)
      await conn.query(
        `DELETE FROM admin_permission
          WHERE admin_id = ? AND id <> ?`,
        [userId, existing[0].id]
      );

      action = 'updated';
    } else {
      // ---------- INSERT ----------
      await conn.query(
        `INSERT INTO admin_permission
           (admin_id,
            allowed_roles, allowed_zones, allowed_regions,
            allowed_projects,
            permissions)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          rolesJson, zonesJson, regionsJson,
          projectsJson, permsJson,
        ]
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