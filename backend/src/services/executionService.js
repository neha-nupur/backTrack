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
 * Qualifies whether an output represents a VALID, NON-FALLBACK execution result for a challenge.
 */
const qualifyOutput = (challenge, outputText) => {
  if (!outputText) return false;
  const clean = String(outputText).trim();
  if (clean === '' || clean === 'null' || clean === 'undefined' || clean === 'NaN') {
    return false;
  }

  const code = challenge.hiddenCode || '';
  if (/\btwoSum\b/.test(code)) {
    try {
      const parsed = JSON.parse(clean);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }

  if (/\bisValid\b/.test(code)) {
    return clean === 'true';
  }

  if (/\bsingleNumber\b/.test(code)) {
    return !isNaN(clean) && clean !== 'NaN';
  }

  return clean !== '[]' && clean !== 'false';
};

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
  if (!userInput || typeof userInput !== 'string' || userInput.trim().length === 0) {
    throw new AppError('Please enter a valid input before executing the challenge.', 400, 'EMPTY_INPUT');
  }

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

  const isQualified = qualifyOutput(challenge, result.output);

  const isExecutionSuccessful = Boolean(
    result.success &&
    result.output !== null &&
    result.output !== undefined &&
    String(result.output).trim().length > 0 &&
    !result.error &&
    isQualified
  );

  const evaluation = evaluationService.evaluateOutput(result.output, challenge, isExecutionSuccessful);

  let attempt;
  try {
    attempt = await Attempt.create({
      participantId,
      eventId,
      challengeId,
      input: userInput,
      output: result.output || '',
      success: isExecutionSuccessful,
      isCorrect: evaluation.isCorrect,
      score: evaluation.score,
      executionTime: executionTimeMs,
    });
  } catch (err) {
    logger.error(`[ATTEMPT_SAVE_FAILED] Failed to save attempt: ${err.message}`);
    throw new AppError('Execution succeeded, but attempt could not be saved.', 500, 'ATTEMPT_SAVE_FAILED');
  }

  const executionError = !isExecutionSuccessful && !result.error
    ? {
        code: 'UNQUALIFIED_OUTPUT',
        message:
          result.output === '[]'
            ? 'No matching solution found for this input. Please enter valid input matching the challenge requirements.'
            : result.output === 'false'
            ? 'The test input evaluated to false. Enter a valid test case that satisfies the challenge requirements.'
            : 'Execution completed but output does not meet challenge solution requirements.',
      }
    : result.error;

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
      success: isExecutionSuccessful,
      output: result.output,
      error: executionError,
      executionTimeMs,
      challengeId,
      challengeTitle: challenge.title,
    }
  };
};

module.exports = {
  executeChallenge,
};
