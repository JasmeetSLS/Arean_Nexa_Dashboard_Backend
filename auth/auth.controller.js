const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const [rows] = await pool.query(
      `SELECT id, username, password, status
         FROM admin
        WHERE username = ?
        LIMIT 1`,
      [username.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const user = rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Account is inactive. Contact administrator.' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, status: user.status },
    });
  } catch (err) {
    console.error('[auth.login]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};