/**
 * Result Controller
 * 
 * Handles participant endpoints for retrieving attempt history and results.
 */

const resultService = require('../services/resultService');

/**
 * GET /api/events/:eventId/attempts
 * Get attempt history for the authenticated participant
 */
const getAttempts = async (req, res, next) => {
  try {
    const participantId = req.user.id;
    const { eventId } = req.params;
    const { page, limit, challengeId } = req.query;

    const result = await resultService.getParticipantAttempts(participantId, eventId, {
      page,
      limit,
      challengeId,
    });

    return res.status(200).json({
      success: true,
      message: 'Attempts retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/events/:eventId/results
 * Get result summary for the authenticated participant
 */
const getEventResult = async (req, res, next) => {
  try {
    const participantId = req.user.id;
    const { eventId } = req.params;

    const result = await resultService.getParticipantEventResult(participantId, eventId);

    return res.status(200).json({
      success: true,
      message: 'Result summary retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAttempts,
  getEventResult,
};
