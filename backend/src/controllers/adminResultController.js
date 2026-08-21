const resultService = require('../services/resultsService');
const { successResponse } = require('../utils/apiResponse');

/**
 * Get overall statistics
 */
const getOverallStatistics = async (req, res, next) => {
  try {
    const stats = await resultService.getOverallStatistics();
    return successResponse(res, 'Overall statistics retrieved successfully', stats);
  } catch (error) {
    next(error);
  }
};

/**
 * Get statistics for a specific event
 */
const getEventStatistics = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const stats = await resultService.getEventStatistics(eventId);
    return successResponse(res, 'Event statistics retrieved successfully', stats);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all participant results with filters
 */
const getParticipantResults = async (req, res, next) => {
  try {
    const { eventId, search, page, limit, sort, order } = req.query;
    const results = await resultService.getParticipantResults({
      eventId,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      sort: sort || 'name',
      order: order || 'asc'
    });
    return successResponse(res, 'Participant results retrieved successfully', results);
  } catch (error) {
    next(error);
  }
};

/**
 * Get specific participant result
 */
const getParticipantResult = async (req, res, next) => {
  try {
    const { participantId } = req.params;
    const { eventId } = req.query;
    const result = await resultService.getParticipantResult(participantId, eventId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Participant result not found',
        errorCode: 'NOT_FOUND'
      });
    }
    
    return successResponse(res, 'Participant result retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get challenge statistics for an event
 */
const getChallengeStatistics = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const stats = await resultService.getChallengeStatistics(eventId);
    return successResponse(res, 'Challenge statistics retrieved successfully', stats);
  } catch (error) {
    next(error);
  }
};

/**
 * Get leaderboard for an event
 */
const getLeaderboard = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const leaderboard = await resultService.getLeaderboard(eventId);
    return successResponse(res, 'Leaderboard retrieved successfully', leaderboard);
  } catch (error) {
    next(error);
  }
};

/**
 * Export results as CSV
 */
const exportResults = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { filename, data } = await resultService.exportResults(eventId);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverallStatistics,
  getEventStatistics,
  getParticipantResults,
  getParticipantResult,
  getChallengeStatistics,
  getLeaderboard,
  exportResults
};
