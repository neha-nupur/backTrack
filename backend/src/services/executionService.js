/**
 * Execution Service
 * 
 * Orchestrates the full execution flow.
 * Ensures hiddenCode is sent only to the executor and never returned.
 */

const Challenge = require('../models/Challenge');
const Event = require('../models/Event');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const { CHALLENGE_STATUS, EVENT_STATUS } = require('../constants/status');
const executor = require('./codeExecutor/executor');
const env = require('../config/env');
const Attempt = require('../models/Attempt');
const evaluationService = require('./evaluationService');

/**
 * Execute a challenge's hidden code with participant input.
 * 
 * @param {string} participantId - The authenticated participant's ID
 * @param {string} eventId - The event ID
 * @param {string} challengeId - The challenge ID
 * @param {string} userInput - The participant's input string
 * @returns {Promise<{ attempt: object, execution: object }>}
 */
const executeChallenge = async (participantId, eventId, challengeId, userInput = '') => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found.', 404, 'EVENT_NOT_FOUND');
  }

  if (event.status !== EVENT_STATUS.LIVE) {
    throw new AppError(
      'Code execution is only available during LIVE events.',
      403,
      'EVENT_NOT_LIVE'
    );
  }

  // Server-authoritative time check
  const now = new Date();
  if (now < new Date(event.startTime)) {
    throw new AppError(
      'This event has not started yet.',
      403,
      'EVENT_NOT_STARTED'
    );
  }
  if (now > new Date(event.endTime)) {
    throw new AppError(
      'This event has ended.',
      403,
      'EVENT_ENDED'
    );
  }

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    throw new AppError('Challenge not found.', 404, 'CHALLENGE_NOT_FOUND');
  }

  // Ensure the challenge belongs to this event
  if (challenge.eventId.toString() !== eventId) {
    throw new AppError(
      'Challenge does not belong to this event.',
      400,
      'CHALLENGE_EVENT_MISMATCH'
    );
  }

  // Ensure the challenge is enabled
  if (challenge.status !== CHALLENGE_STATUS.ENABLED) {
    throw new AppError(
      'This challenge is currently disabled.',
      403,
      'CHALLENGE_DISABLED'
    );
  }

  const hiddenCode = challenge.hiddenCode;
  
  logger.info(
    `[EXECUTION] Participant executing challenge "${challenge.title}" (${challengeId}) ` +
    `in event "${event.name}" (${eventId})`
  );

  const startTime = Date.now();

  const result = await executor.execute(hiddenCode, userInput, {
    timeoutMs: env.EXECUTION_TIMEOUT_MS,
    maxInputLength: env.EXECUTION_MAX_INPUT_LENGTH,
    maxOutputLength: env.EXECUTION_MAX_OUTPUT_LENGTH,
  });

  const executionTimeMs = Date.now() - startTime;

  logger.info(
    `[EXECUTION COMPLETE] Challenge "${challenge.title}" (${challengeId}) — ` +
    `success=${result.success}, time=${executionTimeMs}ms`
  );

  const evaluation = evaluationService.evaluateOutput(result.output, challenge, result.success);

  let attempt;
  try {
    attempt = await Attempt.create({
      participantId,
      eventId,
      challengeId,
      input: userInput,
      output: result.output || '', // Null output replaced with empty string for DB
      success: result.success,
      isCorrect: evaluation.isCorrect,
      score: evaluation.score,
      executionTime: executionTimeMs, // Naming consistency with existing schema field
    });
  } catch (err) {
    logger.error(`[ATTEMPT_SAVE_FAILED] Failed to save attempt: ${err.message}`);
    throw new AppError('Execution succeeded, but attempt could not be saved.', 500, 'ATTEMPT_SAVE_FAILED');
  }

  return {
    attempt: {
      id: attempt._id,
      challengeId: attempt.challengeId,
      challengeTitle: challenge.title,
      input: attempt.input,
      output: attempt.output,
      success: attempt.success,
      isCorrect: attempt.isCorrect,
      score: attempt.score,
      executionTimeMs: attempt.executionTime,
      createdAt: attempt.createdAt,
    },
    execution: {
      success: result.success,
      output: result.output,
      error: result.error,
      executionTimeMs,
      challengeId,
      challengeTitle: challenge.title,
    }
  };
};

module.exports = {
  executeChallenge,
};
