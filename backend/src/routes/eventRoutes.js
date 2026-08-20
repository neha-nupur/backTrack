const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ROLES = require('../constants/roles');
const eventController = require('../controllers/eventController');
const { validateEventId } = require('../validators/eventValidator');

// Protect all participant event routes: require valid JWT + PARTICIPANT role
router.use(authenticate, authorize(ROLES.PARTICIPANT));

// --- Participant Event Endpoints ---
router.get('/live', eventController.getLive);
router.get('/upcoming', eventController.getUpcoming);
router.post('/:eventId/start', validateEventId, eventController.start);

module.exports = router;
