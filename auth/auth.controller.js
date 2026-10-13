const bcrypt   = require('bcryptjs');
const pool     = require('../config/db');
const JWTUtils = require('../utils/jwt.util');

// =====================================================================
// POST /api/auth/login
// body: { username, password, type }   type = 'admin' | 'trainer'
// =====================================================================
exports.login = async (req, res) => {
  try {
    const { username, password, type = 'admin' } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password required',
      });
    }

    if (!['admin', 'trainer'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be "admin" or "trainer".',
      });
    }

    // ---- pick the right table based on type ----
    const table = type === 'admin' ? 'admin' : 'trainers';

    const [rows] = await pool.query(
      `SELECT id, username, password, status
         FROM ${table}
        WHERE username = ?
        LIMIT 1`,
      [username.trim()]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const user = rows[0];

    // `trainers` has no status column — treat missing as active
    if (user.status && user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive',
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'Password not set for this account',
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // ---- sign JWT ----
    const token = JWTUtils.generateToken({
      userId:   user.id,
      username: user.username,
      type,
    });

    res.json({
      success: true,
      token,
      user: {
        userId:   user.id,
        username: user.username,
        type,
      },
    });
  } catch (err) {
    console.error('[auth.login]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};