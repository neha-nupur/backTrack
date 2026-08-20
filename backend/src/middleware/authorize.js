const AppError = require('../utils/appError');

/**
 * Role Authorization Middleware
 * Enforces role-based access control (RBAC).
 * Returns 403 Forbidden if user role is not explicitly authorized.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required before authorization check.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}].`,
          403,
          'FORBIDDEN_ROLE'
        )
      );
    }

    next();
  };
};

module.exports = authorize;
