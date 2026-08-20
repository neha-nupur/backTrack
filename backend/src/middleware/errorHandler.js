const logger = require('../utils/logger');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Centralized Error Handling Middleware
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected internal server error occurred';

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    const messages = Object.values(err.errors).map((e) => e.message);
    message = `Validation Failed: ${messages.join(', ')}`;
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_KEY_ERROR';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists.`;
  }

  // Mongoose Cast Error (Invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID_FORMAT';
    message = `Invalid ID format for ${err.path}`;
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token provided.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired.';
  }

  // Log error internally without exposing sensitive details
  logger.error(`[${req.method} ${req.url}] ${statusCode} - ${errorCode}: ${message}`);
  if (process.env.NODE_ENV === 'development' && err.stack && !err.isOperational) {
    console.error(err.stack);
  }

  return errorResponse(res, message, errorCode, statusCode);
};

module.exports = errorHandler;
