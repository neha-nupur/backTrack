const { errorResponse } = require('../utils/apiResponse');

/**
 * 404 Route Not Found Middleware
 */
const notFoundHandler = (req, res) => {
  return errorResponse(
    res,
    `API route not found: ${req.method} ${req.originalUrl}`,
    'ROUTE_NOT_FOUND',
    404
  );
};

module.exports = notFoundHandler;
