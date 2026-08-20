const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

let isConnected = false;

/**
 * Sanitizes MongoDB URI to prevent credentials leaking in logs
 */
const sanitizeUri = (uri) => {
  if (!uri) return 'undefined';
  return uri.replace(/\/\/(.*):(.*)@/, '//***:***@');
};

const connectDB = async () => {
  if (isConnected) {
    logger.info('MongoDB connection already established.');
    return true;
  }

  if (!env.MONGODB_URI) {
    logger.warn('MONGODB_URI is not configured. Database connection skipped.');
    return false;
  }

  try {
    const sanitizedPath = sanitizeUri(env.MONGODB_URI);
    logger.info(`Connecting to MongoDB at: ${sanitizedPath}`);

    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    logger.info(`MongoDB Connected: ${conn.connection.host} / Database: ${conn.connection.name}`);
    return true;
  } catch (error) {
    isConnected = false;
    logger.error('MongoDB connection error:', error.message);
    // Return false without throwing an unhandled rejection, allowing the server to handle status gracefully
    return false;
  }
};

/**
 * Helper to check connection state
 */
const getDBStatus = () => {
  const readyState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[readyState] || 'unknown';
};

module.exports = {
  connectDB,
  getDBStatus,
};
