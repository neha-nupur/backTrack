const { successResponse } = require('../utils/apiResponse');
const { getDBStatus } = require('../config/database');

const getHealthStatus = (req, res) => {
  const healthData = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: process.env.NODE_ENV || 'development',
    database: getDBStatus(),
  };

  return successResponse(res, 'backTrack API is running', healthData, 200);
};

module.exports = {
  getHealthStatus,
};
