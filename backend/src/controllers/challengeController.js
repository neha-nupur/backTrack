const challengeService = require('../services/challengeService');

/**
 * POST /api/admin/events/:eventId/challenges
 * Create a new challenge assigned to an event (ADMIN)
 */
const create = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const challenge = await challengeService.createChallenge(eventId, req.body);
    return res.status(201).json({
      success: true,
      message: 'Challenge created successfully',
      data: { challenge },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/events/:eventId/challenges
 * List challenges for an event (ADMIN)
 */
const listByEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await challengeService.listChallengesByEvent(eventId, req.query);
    return res.status(200).json({
      success: true,
      message: 'Challenges fetched successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/challenges/:id
 * Get single challenge details by ID (ADMIN)
 */
const getById = async (req, res, next) => {
  try {
    const challenge = await challengeService.getChallengeById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Challenge fetched successfully',
      data: { challenge },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/challenges/:id
 * Update challenge details (ADMIN)
 */
const update = async (req, res, next) => {
  try {
    const challenge = await challengeService.updateChallenge(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Challenge updated successfully',
      data: { challenge },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/challenges/:id/status
 * Update challenge status (ADMIN)
 */
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const challenge = await challengeService.updateChallengeStatus(req.params.id, status);
    return res.status(200).json({
      success: true,
      message: `Challenge status updated to ${status}`,
      data: { challenge },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/challenges/:id
 * Delete challenge (ADMIN)
 */
const remove = async (req, res, next) => {
  try {
    const deleted = await challengeService.deleteChallenge(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Challenge deleted successfully',
      data: { deleted },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/events/:eventId/challenges
 * Retrieve participant-safe challenges for an event (PARTICIPANT)
 * Excludes hiddenCode
 */
const listParticipantChallenges = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const challenges = await challengeService.getParticipantChallengesByEvent(eventId);
    return res.status(200).json({
      success: true,
      message: 'Event challenges fetched successfully',
      data: { challenges },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  listByEvent,
  getById,
  update,
  updateStatus,
  remove,
  listParticipantChallenges,
};
