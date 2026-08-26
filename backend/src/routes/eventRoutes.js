const express = require('express');
const rateLimit = require('express-rate-limit');
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

// Dedicated rate limiter for the code execution endpoint.
//
// Code execution is compute-heavy (spawns a sandboxed child process). This
// limiter is scoped exclusively to POST /execute so that all other participant
// endpoints (event listing, challenge fetching, attempt history) are completely
// unaffected by it.
//
// Limit: 5,000 executions per IP per 15 minutes.
//   → Even if 25 participants share one NAT IP, each can make ~200 submissions
//     per 15 min (>13/min), which is more than enough for aggressive testing.
//   → 500 participants on a single IP could exceed this, but that extreme
//     scenario is mitigated because execution is naturally throttled by the
//     time each call takes (participants wait for a response before retrying).
const executionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5_000,               // 5,000 execute calls per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many execution requests from this IP. Please wait a moment before submitting again.",
    errorCode: "EXECUTION_RATE_LIMIT_EXCEEDED",
  },
});

// --- Participant Code Execution Endpoint ---
// POST /api/events/:eventId/challenges/:challengeId/execute
// Requires: LIVE event, ENABLED challenge, valid participant JWT
router.post(
  '/:eventId/challenges/:challengeId/execute',
  executionLimiter,
  validateEventIdParam,
  validateChallengeIdParam,
  validateExecutionRequest,
  executionController.execute
);

module.exports = router;
