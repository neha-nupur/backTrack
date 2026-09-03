const authService = require('../services/authService');
const { successResponse } = require('../utils/apiResponse');

/**
 * Participant Login Controller
 * Endpoint: POST /api/auth/login
 */
const participantLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.authenticateParticipant(email, password);
    return successResponse(res, 'Participant authenticated successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Login Controller
 * Endpoint: POST /api/auth/admin/login
 */
const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.authenticateAdmin(email, password);
    return successResponse(res, 'Admin authenticated successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Current Authenticated User Identity
 * Endpoint: GET /api/auth/me
 */
const getCurrentUser = async (req, res, next) => {
  try {
    return successResponse(res, 'User session verified', { user: req.user }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Logout Controller
 * Endpoint: POST /api/auth/logout
 */
const logout = async (req, res) => {
  return successResponse(res, 'Logged out successfully', {}, 200);
};

module.exports = {
  participantLogin,
  adminLogin,
  getCurrentUser,
  logout,
};
