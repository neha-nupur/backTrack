const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ROLES = require('../constants/roles');
const adminResultController = require('../controllers/adminResultController');
const {
  validateEventId,
  validateParticipantId,
  validatePaginationAndFilters
} = require('../validators/resultValidator');

// Protect all admin result routes: require valid JWT + ADMIN role
router.use(authenticate, authorize(ROLES.ADMIN));

// Overview stats
router.get('/overview', adminResultController.getOverallStatistics);

// Event specific stats
router.get('/events/:eventId', validateEventId, adminResultController.getEventStatistics);

// Participant results
router.get('/participants', validatePaginationAndFilters, adminResultController.getParticipantResults);
router.get('/participants/:participantId', validateParticipantId, validatePaginationAndFilters, adminResultController.getParticipantResult);

// Challenge stats
router.get('/challenges/:eventId', validateEventId, adminResultController.getChallengeStatistics);

// Leaderboard
router.get('/leaderboard/:eventId', validateEventId, adminResultController.getLeaderboard);

// Export
router.get('/export/:eventId?', validateEventId, adminResultController.exportResults);

module.exports = router;
