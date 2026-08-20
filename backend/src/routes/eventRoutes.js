const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ROLES = require('../constants/roles');
const eventController = require('../controllers/eventController');
const challengeController = require('../controllers/challengeController');
const executionController = require('../controllers/executionController');
const resultController = require('../controllers/resultController');
const { validateEventId } = require('../validators/eventValidator');
const { validateEventIdParam } = require('../validators/challengeValidator');
const { validateExecutionRequest, validateChallengeIdParam } = require('../validators/executionValidator');

// Protect all participant event routes: require valid JWT + PARTICIPANT role
router.use(authenticate, authorize(ROLES.PARTICIPANT));

// --- Participant Event Endpoints ---
router.get('/live', eventController.getLive);
router.get('/upcoming', eventController.getUpcoming);
router.post('/:eventId/start', validateEventId, eventController.start);

// Participant-safe challenge endpoint (strictly excludes hiddenCode)
router.get('/:eventId/challenges', validateEventIdParam, challengeController.listParticipantChallenges);

// --- Participant Result Endpoints ---
router.get('/:eventId/attempts', validateEventIdParam, resultController.getAttempts);
router.get('/:eventId/results', validateEventIdParam, resultController.getEventResult);

// --- Participant Code Execution Endpoint ---
// POST /api/events/:eventId/challenges/:challengeId/execute
// Requires: LIVE event, ENABLED challenge, valid participant JWT
router.post(
  '/:eventId/challenges/:challengeId/execute',
  validateEventIdParam,
  validateChallengeIdParam,
  validateExecutionRequest,
  executionController.execute
);

module.exports = router;
