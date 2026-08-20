const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ROLES = require('../constants/roles');
const participantController = require('../controllers/participantController');
const settingsController = require('../controllers/settingsController');
const eventController = require('../controllers/eventController');
const {
  validateObjectId,
  validateCreateParticipant,
  validateUpdateParticipant,
  validateStatusUpdate: validateParticipantStatusUpdate,
  validateMasterPasswordUpdate,
  validateListQuery: validateParticipantListQuery,
} = require('../validators/participantValidator');
const {
  validateEventId,
  validateCreateEvent,
  validateUpdateEvent,
  validateStatusUpdate: validateEventStatusUpdate,
  validateEventQuery,
} = require('../validators/eventValidator');

// Protect all admin routes: require valid JWT + ADMIN role
router.use(authenticate, authorize(ROLES.ADMIN));

// --- Participant Management Endpoints ---
router.get('/participants', validateParticipantListQuery, participantController.list);
router.get('/participants/:id', validateObjectId, participantController.getById);
router.post('/participants', validateCreateParticipant, participantController.create);
router.patch('/participants/:id', validateObjectId, validateUpdateParticipant, participantController.update);
router.patch('/participants/:id/status', validateObjectId, validateParticipantStatusUpdate, participantController.updateStatus);
router.delete('/participants/:id', validateObjectId, participantController.remove);

// --- Event Management Endpoints ---
router.get('/events', validateEventQuery, eventController.listAdmin);
router.get('/events/:id', validateEventId, eventController.getById);
router.post('/events', validateCreateEvent, eventController.create);
router.patch('/events/:id', validateEventId, validateUpdateEvent, eventController.update);
router.patch('/events/:id/status', validateEventId, validateEventStatusUpdate, eventController.updateStatus);
router.delete('/events/:id', validateEventId, eventController.remove);

// --- Settings Endpoints ---
router.patch('/settings/master-password', validateMasterPasswordUpdate, settingsController.updateMasterPassword);

module.exports = router;
