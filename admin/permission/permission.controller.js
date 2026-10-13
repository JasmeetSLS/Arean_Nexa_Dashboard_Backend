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
//   → sections + fields from setup_field_master (is_selected = 1)
//   → roles / zones / regions from participants
//   → existing user_permission row for this user
// =====================================================================
exports.getOptions = async (req, res) => {
  try {
    // --- 1. Active setup config ---
    const [cfg] = await pool.query(
      `SELECT id FROM setup_config
        WHERE status = 'active'
        ORDER BY id DESC LIMIT 1`
    );
    if (!cfg.length) {
      return res.json({
        success: true,
        sections: [], roles: [], zones: [], regions: [], existing: null,
      });
    }
    const setupConfigId = cfg[0].id;

    // --- 2. Selected fields ---
    const [rows] = await pool.query(
      `SELECT field_group, field_key, field_order, sort_order
         FROM setup_field_master
        WHERE setup_config_id = ? AND is_selected = 1
        ORDER BY sort_order, field_order`,
      [setupConfigId]
    );

    const sectionsMap = {};
    for (const r of rows) {
      if (!sectionsMap[r.field_group]) {
        sectionsMap[r.field_group] = {
          key: r.field_group,
          sort_order: r.sort_order,
          fields: [],
        };
      }
      sectionsMap[r.field_group].fields.push({
        field_key:   r.field_key,
        field_order: r.field_order,
      });
    }
    const sections = Object.values(sectionsMap)
      .sort((a, b) => a.sort_order - b.sort_order);

    // --- 3. Roles / Zones / Regions from participants ---
    const [pRows] = await pool.query(`SELECT role, zone, region FROM participants`);
    const roles   = Array.from(new Set(pRows.map((p) => p.role  ).filter(Boolean))).sort();
    const zones   = Array.from(new Set(pRows.map((p) => p.zone  ).filter(Boolean))).sort();
    const regions = Array.from(new Set(pRows.map((p) => p.region).filter(Boolean))).sort();

    // --- 4. Existing permissions for this user ---
    let existing = null;
    if (req.query.userId) {
      const [up] = await pool.query(
        `SELECT allowed_roles, allowed_zones, allowed_regions, permissions
           FROM user_permission
          WHERE user_id = ? AND setup_config_id = ?
          ORDER BY id DESC
          LIMIT 1`,
        [req.query.userId, setupConfigId]
      );
      if (up.length) {
        existing = {
          allowed_roles:   up[0].allowed_roles,
          allowed_zones:   up[0].allowed_zones,
          allowed_regions: up[0].allowed_regions,
          permissions:     up[0].permissions,
        };
      }
    }

    res.json({
      success: true,
      setupConfigId,
      sections,
      roles, zones, regions,
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
//   userId,
//   allowedRoles: [..], allowedZones: [..], allowedRegions: [..],
//   permissions: { <field_group>: { <field_key>: bool } }
// }
// → SELECT then UPDATE or INSERT
// =====================================================================
exports.savePermissions = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      userId,
      allowedRoles   = [],
      allowedZones   = [],
      allowedRegions = [],
      permissions    = {},
    } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    // --- active setup config ---
    const [cfg] = await conn.query(
      `SELECT id FROM setup_config
        WHERE status = 'active'
        ORDER BY id DESC LIMIT 1`
    );
    if (!cfg.length) {
      return res.status(400).json({ success: false, error: 'No active setup config' });
    }
    const setupConfigId = cfg[0].id;

    // -------- serialize payload --------
    const rolesJson   = JSON.stringify(allowedRoles);
    const zonesJson   = JSON.stringify(allowedZones);
    const regionsJson = JSON.stringify(allowedRegions);
    const permsJson   = JSON.stringify(permissions);

    await conn.beginTransaction();

    // -------- does a row already exist? --------
    const [existing] = await conn.query(
      `SELECT id FROM user_permission
        WHERE user_id = ? AND setup_config_id = ?
        ORDER BY id DESC
        LIMIT 1`,
      [userId, setupConfigId]
    );

    let action;

    if (existing.length) {
      // ---------- UPDATE ----------
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

      // safety cleanup if there are stray duplicates
      await conn.query(
        `DELETE FROM user_permission
          WHERE user_id = ? AND setup_config_id = ? AND id <> ?`,
        [userId, setupConfigId, existing[0].id]
      );

      action = 'updated';
    } else {
      // ---------- INSERT ----------
      await conn.query(
        `INSERT INTO user_permission
           (user_id, setup_config_id, allowed_roles, allowed_zones,
            allowed_regions, permissions)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, setupConfigId, rolesJson, zonesJson, regionsJson, permsJson]
      );

      action = 'inserted';
    }

    await conn.commit();

    res.json({
      success: true,
      message: `Permissions ${action} successfully`,
      action,
      userId,
      setupConfigId,
    });
  } catch (err) {
    await conn.rollback();
    console.error('[permission.savePermissions]', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};