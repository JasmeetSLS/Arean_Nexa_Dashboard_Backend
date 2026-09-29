const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  let [scheme, token] = header.split(' ');
  if (!token && req.query.token) token = req.query.token;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth, JWT_SECRET };