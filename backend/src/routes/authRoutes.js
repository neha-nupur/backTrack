const express = require('express');
const rateLimit = require('express-rate-limit');
const { participantLogin, adminLogin, getCurrentUser, logout } = require('../controllers/authController');
const { validateLoginInput } = require('../validators/authValidator');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ROLES = require('../constants/roles');
const { successResponse } = require('../utils/apiResponse');

const router = express.Router();

// Auth rate limiter to prevent brute-force attacks (5 attempts per 15 mins per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Max 30 attempts per 15 mins for development/event safety
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});

// Public Authentication Endpoints
router.post('/login', authLimiter, validateLoginInput, participantLogin);
router.post('/admin/login', authLimiter, validateLoginInput, adminLogin);

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
