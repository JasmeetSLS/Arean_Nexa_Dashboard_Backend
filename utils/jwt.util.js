const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-strong-secret-key-change-this';

class JWTUtils {
  // Token with NO expiration by default
  static generateToken(payload, expiresIn = null) {
    if (expiresIn) {
      return jwt.sign(payload, JWT_SECRET, { expiresIn });
    }
    return jwt.sign(payload, JWT_SECRET);
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

module.exports = JWTUtils;