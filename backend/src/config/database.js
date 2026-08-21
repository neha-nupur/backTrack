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

const connectDB = async (customUri = null) => {
  if (isConnected) {
    logger.info('MongoDB connection already established.');
    return true;
  }

  let targetUri = customUri;

  if (process.env.NODE_ENV === 'test' && !customUri) {
    targetUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/backtrack_test_db';
  }

  if (!targetUri) {
    targetUri = process.env.MONGODB_URI || env.MONGODB_URI;
  }

  if (!targetUri) {
    logger.warn('MONGODB_URI is not configured. Database connection skipped.');
    return false;
  }

  try {
    const sanitizedPath = sanitizeUri(targetUri);
    logger.info(`Connecting to MongoDB at: ${sanitizedPath}`);

    const conn = await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 5000,
    });

    // Safety guard for test environment
    if (process.env.NODE_ENV === 'test') {
      const dbName = conn.connection.name;
      if (!dbName.includes('test')) {
        await mongoose.disconnect();
        throw new Error(`[FATAL TEST SAFETY ERROR] Refusing to run tests on non-test database "${dbName}". Use a database name containing "test".`);
      }
    }

    isConnected = true;
    logger.info(`MongoDB Connected: ${conn.connection.host} / Database: ${conn.connection.name}`);
    return true;
  } catch (error) {
    isConnected = false;
    logger.error('MongoDB connection error:', error.message);
    if (process.env.NODE_ENV === 'test') throw error;
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

/**
 * Asserts test database safety guard
 */
const assertTestDatabase = () => {
  if (process.env.NODE_ENV === 'test') {
    const dbName = mongoose.connection.name;
    if (!dbName || !dbName.includes('test')) {
      throw new Error(`[FATAL TEST SAFETY ERROR] Refusing to run tests on non-test database "${dbName}". Use a database name containing "test".`);
    }
  }
};

module.exports = {
  connectDB,
  getDBStatus,
  assertTestDatabase,
};
