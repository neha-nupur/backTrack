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
const { CHALLENGE_STATUS, EVENT_STATUS, ATTEMPT_STATUS } = require('../constants/status');
const executor = require('./codeExecutor/executor');
const { EXECUTION_ERROR } = require('./codeExecutor/errors');
const env = require('../config/env');
const Attempt = require('../models/Attempt');
const evaluationService = require('./evaluationService');

/**
 * Qualifies whether an output represents a genuine execution result.
 *
 * IMPORTANT: This platform is an intentional "black box" — it does not store
 * expected outputs or test cases (see evaluationService.js), so it can never
 * know whether a given output is the *correct* answer. It can only tell
 * whether the hidden code actually ran and produced a real result.
 *
 * Values like `[]`, `false`, `null`, `0`, or `NaN` are all perfectly valid,
 * legitimate outputs for plenty of algorithms (e.g. a backtracking search
 * that finds no solutions correctly returns `[]`; a boolean predicate
 * correctly returns `false`). Previously this function treated a fixed
 * blocklist of such values as automatic failures — which silently marked
 * correct executions as "UNQUALIFIED_OUTPUT" for any challenge whose real
 * answer happened to be one of those values. It also special-cased a single
 * challenge by name ("twoSum"), which doesn't generalize to any other
 * challenge and has no business living in generic execution plumbing.
 *
 * The only thing this function should gate on is whether the worker
 * actually produced output at all — genuine "no output" cases are already
 * surfaced as a distinct NO_OUTPUT error by the worker itself (see
 * worker.js), so there is nothing further to second-guess here.
 */
const qualifyOutput = (challenge, outputText) => {
  if (outputText === null || outputText === undefined) return false;
  const clean = String(outputText).trim();
  return clean.length > 0;
};

/**
 * Maps an execution outcome to the admin-facing ATTEMPT_STATUS enum.
 *
 * The executor/worker can surface many specific error codes (RUNTIME_ERROR,
 * SYNTAX_ERROR, MEMORY_LIMIT_EXCEEDED, WORKER_CRASH, EXECUTION_INTERNAL_ERROR,
 * FORBIDDEN_OPERATION, INPUT_VALIDATION_ERROR, or the locally-constructed
 * NO_OUTPUT) — see codeExecutor/errors.js and worker.js. The admin monitoring
 * UI only distinguishes three buckets: a clean success, a timeout, or any
 * other execution error. Only EXECUTION_TIMEOUT gets its own bucket; every
 * other non-success outcome collapses into EXECUTION_ERROR. The specific
 * code/message is preserved separately in the Attempt's `error` field so
 * nothing is actually lost — this mapping only affects the coarse `status`
 * used for filtering/badges.
 */
const mapToAttemptStatus = (isExecutionSuccessful, executionError) => {
  if (isExecutionSuccessful) return ATTEMPT_STATUS.SUCCESS;
  if (executionError && executionError.code === EXECUTION_ERROR.TIMEOUT) {
    return ATTEMPT_STATUS.EXECUTION_TIMEOUT;
  }
  return ATTEMPT_STATUS.EXECUTION_ERROR;
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

  // At this point the only way isExecutionSuccessful is false without a
  // worker-reported error is a genuinely empty/missing output, since
  // qualifyOutput no longer rejects legitimate falsy-but-real values.
  // Computed BEFORE Attempt.create (rather than after, as previously) so
  // the persisted record can capture the same status/error the participant
  // response reports — the two were drifting apart otherwise.
  const executionError = !isExecutionSuccessful && !result.error
    ? {
        code: 'NO_OUTPUT',
        message: 'The function executed but produced no output. Please verify your input format.',
      }
    : result.error;

  const attemptStatus = mapToAttemptStatus(isExecutionSuccessful, executionError);

  let attempt;
  try {
    attempt = await Attempt.create({
      participantId,
      eventId,
      challengeId,
      input: userInput,
      output: result.output || '',
      success: isExecutionSuccessful,
      status: attemptStatus,
      error: executionError ? executionError.message : null,
      isCorrect: evaluation.isCorrect,
      score: evaluation.score,
      executionTime: executionTimeMs,
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
      status: attempt.status,
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
