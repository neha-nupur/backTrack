const express = require('express');
const { participantLogin, adminLogin, getCurrentUser, logout } = require('../controllers/authController');
const { validateLoginInput } = require('../validators/authValidator');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ROLES = require('../constants/roles');
const { successResponse } = require('../utils/apiResponse');

const router = express.Router();

// Public Authentication Endpoints
router.post('/login', validateLoginInput, participantLogin);
router.post('/admin/login', validateLoginInput, adminLogin);

// Protected Authentication Endpoints
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);

// Protected Test Endpoints (Development Verification)
router.get('/test-admin', authenticate, authorize(ROLES.ADMIN), (req, res) => {
  return successResponse(res, 'Admin authorization verified', { user: req.user });
});

router.get('/test-participant', authenticate, authorize(ROLES.PARTICIPANT), (req, res) => {
  return successResponse(res, 'Participant authorization verified', { user: req.user });
});

module.exports = router;
