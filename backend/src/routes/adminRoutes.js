const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ROLES = require('../constants/roles');
const participantController = require('../controllers/participantController');
const settingsController = require('../controllers/settingsController');
const {
  validateObjectId,
  validateCreateParticipant,
  validateUpdateParticipant,
  validateStatusUpdate,
  validateMasterPasswordUpdate,
  validateListQuery,
} = require('../validators/participantValidator');

// Protect all admin routes: require valid JWT + ADMIN role
router.use(authenticate, authorize(ROLES.ADMIN));

// --- Participant Management Endpoints ---
router.get('/participants', validateListQuery, participantController.list);
router.get('/participants/:id', validateObjectId, participantController.getById);
router.post('/participants', validateCreateParticipant, participantController.create);
router.patch('/participants/:id', validateObjectId, validateUpdateParticipant, participantController.update);
router.patch('/participants/:id/status', validateObjectId, validateStatusUpdate, participantController.updateStatus);
router.delete('/participants/:id', validateObjectId, participantController.remove);

// --- Settings Endpoints ---
router.patch('/settings/master-password', validateMasterPasswordUpdate, settingsController.updateMasterPassword);

module.exports = router;
