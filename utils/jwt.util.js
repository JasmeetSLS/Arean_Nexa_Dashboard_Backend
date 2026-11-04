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

// const jwt = require('jsonwebtoken');

// const JWT_SECRET = process.env.JWT_SECRET || 'your-strong-secret-key-change-this';
// const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h'; // 👈 1. Add this line

// class JWTUtils {
//   // 2. Change default parameter to JWT_EXPIRES
//   static generateToken(payload, expiresIn = JWT_EXPIRES) {
//     // 3. Remove the if/else and just use jwt.sign directly
//     return jwt.sign(payload, JWT_SECRET, { expiresIn });
//   }

//   static verifyToken(token) {
//     try {
//       return jwt.verify(token, JWT_SECRET);
//     } catch (error) {
//       throw new Error('Invalid token');
//     }
//   }

//   static decodeToken(token) {
//     try {
//       return jwt.decode(token);
//     } catch (error) {
//       throw new Error('Invalid token');
//     }
//   }
// }

// module.exports = JWTUtils;