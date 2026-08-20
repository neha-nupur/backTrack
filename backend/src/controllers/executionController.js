/**
 * Execution Controller
 * 
 * Handles POST /api/events/:eventId/challenges/:challengeId/execute
 * 
 * SECURITY: The response NEVER contains hiddenCode.
 * Only sanitized output and error information is returned.
 */

const executionService = require('../services/executionService');

/**
 * POST /api/events/:eventId/challenges/:challengeId/execute
 * Execute a challenge's hidden code with participant input
 */
const execute = async (req, res, next) => {
  try {
    const { eventId, challengeId } = req.params;
    const { userInput } = req.body;
    const participantId = req.user.id;

    const result = await executionService.executeChallenge(
      participantId,
      eventId,
      challengeId,
      userInput || ''
    );

    return res.status(200).json({
      success: true,
      message: result.execution.success
        ? 'Code executed successfully'
        : 'Code execution completed with errors',
      data: {
        attempt: result.attempt,
        execution: result.execution,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  execute,
};
