/**
 * Standardized API Response Formatters
 */

const successResponse = (res, message = 'Success', data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, message = 'An error occurred', errorCode = 'INTERNAL_ERROR', statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errorCode,
  });
};

module.exports = {
  successResponse,
  errorResponse,
};
