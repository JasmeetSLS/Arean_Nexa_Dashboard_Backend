const JWTUtils = require('../utils/jwt.util');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // allow ?token= (used by iframe embeds)
    let token = null;
    if (authHeader) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token required',
      });
    }

    const decoded = JWTUtils.verifyToken(token);

    // ---- shape used by every controller ----
    req.user = {
      userId:   decoded.userId || decoded.sub,   // accept both
      type:     decoded.type || 'admin',         // 'admin' | 'trainer'
      username: decoded.username,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
};