const authService = require('../services/authService');
const AppError = require('../utils/appError');

/**
 * Authentication Middleware
 * Validates JWT in Authorization header and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required. Please provide a valid token.', 401, 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      return next(new AppError('Authentication required. Token is empty.', 401, 'UNAUTHORIZED'));
    }

    const decoded = authService.verifyToken(token);
    if (!decoded || !decoded.sub || !decoded.role) {
      return next(new AppError('Invalid token payload structure.', 401, 'INVALID_TOKEN'));
    }

    const user = await authService.getUserById(decoded.sub, decoded.role);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
