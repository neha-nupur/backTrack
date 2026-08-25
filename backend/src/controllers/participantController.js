const participantService = require('../services/participantService');

/**
 * GET /api/admin/participants
 * List participants with search, filter, pagination
 */
const list = async (req, res, next) => {
  try {
    const result = await participantService.listParticipants(req.query);
    return res.status(200).json({
      success: true,
      message: 'Participants fetched successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/participants/:id
 * Get single participant by ID
 */
const getById = async (req, res, next) => {
  try {
    const participant = await participantService.getParticipantById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Participant fetched successfully',
      data: { participant },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/participants
 * Create new participant
 */
const create = async (req, res, next) => {
  try {
    const { name, email, status } = req.body;
    const participant = await participantService.createParticipant({ name, email, status });
    return res.status(201).json({
      success: true,
      message: 'Participant created successfully',
      data: { participant },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/participants/:id
 * Update participant (name, email, status)
 */
const update = async (req, res, next) => {
  try {
    const { name, email, status } = req.body;
    const participant = await participantService.updateParticipant(req.params.id, { name, email, status });
    return res.status(200).json({
      success: true,
      message: 'Participant updated successfully',
      data: { participant },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/participants/:id/status
 * Update participant status only (ACTIVE / DISABLED)
 */
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const participant = await participantService.updateParticipantStatus(req.params.id, status);
    return res.status(200).json({
      success: true,
      message: `Participant status updated to ${status}`,
      data: { participant },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/participants/:id
 * Delete participant
 */
const remove = async (req, res, next) => {
  try {
    const deleted = await participantService.deleteParticipant(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Participant deleted successfully',
      data: { deleted },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/participants/import
 * Bulk import participants from JSON
 */
const importParticipants = async (req, res, next) => {
  try {
    const participants = req.body;
    const result = await participantService.bulkCreateParticipants(participants);
    
    return res.status(200).json({
      success: true,
      message: 'Bulk import processed',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  getById,
  create,
  update,
  updateStatus,
  remove,
  importParticipants,
};
