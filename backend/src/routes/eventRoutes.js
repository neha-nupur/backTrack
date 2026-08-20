const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ROLES = require('../constants/roles');
const eventController = require('../controllers/eventController');
const challengeController = require('../controllers/challengeController');
const { validateEventId } = require('../validators/eventValidator');
const { validateEventIdParam } = require('../validators/challengeValidator');

// Protect all participant event routes: require valid JWT + PARTICIPANT role
router.use(authenticate, authorize(ROLES.PARTICIPANT));

// --- Participant Event Endpoints ---
router.get('/live', eventController.getLive);
router.get('/upcoming', eventController.getUpcoming);
router.post('/:eventId/start', validateEventId, eventController.start);

// Participant-safe challenge endpoint (strictly excludes hiddenCode)
router.get('/:eventId/challenges', validateEventIdParam, challengeController.listParticipantChallenges);

module.exports = router;
