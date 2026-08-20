const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const { CHALLENGE_STATUS } = require('../constants/status');

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_FORMAT_LENGTH = 1000;
const MAX_HIDDEN_CODE_LENGTH = 51200; // 50 KB
const MAX_SCORE = 10000;

// URL Validation Regex (http or https)
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

/**
 * Validate MongoDB ObjectId in params (:id)
 */
const validateChallengeId = (req, res, next) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError('Invalid challenge ID format.', 400, 'INVALID_ID_FORMAT'));
  }
  next();
};

/**
 * Validate MongoDB ObjectId in params (:eventId)
 */
const validateEventIdParam = (req, res, next) => {
  const { eventId } = req.params;
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return next(new AppError('Invalid event ID format.', 400, 'INVALID_ID_FORMAT'));
  }
  next();
};

/**
 * Validate Create Challenge Request
 */
const validateCreateChallenge = (req, res, next) => {
  const {
    title,
    description,
    hiddenCode,
    inputFormat,
    outputFormat,
    constraints,
    score,
    hackerRankUrl,
    status,
  } = req.body;

  // 1. Validate Title
  if (!title || typeof title !== 'string' || !title.trim()) {
    return next(new AppError('Challenge title is required.', 400, 'MISSING_TITLE'));
  }
  if (title.trim().length > MAX_TITLE_LENGTH) {
    return next(
      new AppError(`Challenge title cannot exceed ${MAX_TITLE_LENGTH} characters.`, 400, 'TITLE_TOO_LONG')
    );
  }

  // 2. Validate Description
  if (!description || typeof description !== 'string' || !description.trim()) {
    return next(new AppError('Challenge description is required.', 400, 'MISSING_DESCRIPTION'));
  }
  if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
    return next(
      new AppError(`Challenge description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`, 400, 'DESCRIPTION_TOO_LONG')
    );
  }

  // 3. Validate Hidden Code (pure text validation, no eval/execution)
  if (!hiddenCode || typeof hiddenCode !== 'string' || !hiddenCode.trim()) {
    return next(new AppError('Hidden JavaScript code logic is required.', 400, 'MISSING_HIDDEN_CODE'));
  }
  if (hiddenCode.length > MAX_HIDDEN_CODE_LENGTH) {
    return next(
      new AppError(
        `Hidden JavaScript code cannot exceed ${MAX_HIDDEN_CODE_LENGTH / 1024} KB.`,
        400,
        'HIDDEN_CODE_TOO_LARGE'
      )
    );
  }

  // 4. Validate Input / Output Formats & Constraints
  if (inputFormat !== undefined && inputFormat !== null) {
    if (typeof inputFormat !== 'string') {
      return next(new AppError('Input format must be a string.', 400, 'INVALID_INPUT_FORMAT'));
    }
    if (inputFormat.trim().length > MAX_FORMAT_LENGTH) {
      return next(new AppError(`Input format cannot exceed ${MAX_FORMAT_LENGTH} characters.`, 400, 'FORMAT_TOO_LONG'));
    }
  }

  if (outputFormat !== undefined && outputFormat !== null) {
    if (typeof outputFormat !== 'string') {
      return next(new AppError('Output format must be a string.', 400, 'INVALID_OUTPUT_FORMAT'));
    }
    if (outputFormat.trim().length > MAX_FORMAT_LENGTH) {
      return next(new AppError(`Output format cannot exceed ${MAX_FORMAT_LENGTH} characters.`, 400, 'FORMAT_TOO_LONG'));
    }
  }

  if (constraints !== undefined && constraints !== null) {
    if (typeof constraints !== 'string') {
      return next(new AppError('Constraints must be a string.', 400, 'INVALID_CONSTRAINTS'));
    }
    if (constraints.trim().length > MAX_FORMAT_LENGTH) {
      return next(new AppError(`Constraints cannot exceed ${MAX_FORMAT_LENGTH} characters.`, 400, 'CONSTRAINTS_TOO_LONG'));
    }
  }

  // 5. Validate Score
  if (score !== undefined) {
    const numScore = Number(score);
    if (isNaN(numScore) || numScore <= 0 || !Number.isFinite(numScore)) {
      return next(new AppError('Challenge score must be a positive number.', 400, 'INVALID_SCORE'));
    }
    if (numScore > MAX_SCORE) {
      return next(new AppError(`Challenge score cannot exceed ${MAX_SCORE}.`, 400, 'SCORE_TOO_LARGE'));
    }
  }

  // 6. Validate HackerRank URL if provided
  if (hackerRankUrl !== undefined && hackerRankUrl !== null && hackerRankUrl.trim() !== '') {
    if (typeof hackerRankUrl !== 'string' || !URL_REGEX.test(hackerRankUrl.trim())) {
      return next(new AppError('Please provide a valid URL for HackerRank (e.g. https://...).', 400, 'INVALID_HACKERRANK_URL'));
    }
  }

  // 7. Validate Status
  if (status !== undefined) {
    if (![CHALLENGE_STATUS.ENABLED, CHALLENGE_STATUS.DISABLED].includes(status)) {
      return next(
        new AppError(
          `Invalid challenge status. Must be one of: [${CHALLENGE_STATUS.ENABLED}, ${CHALLENGE_STATUS.DISABLED}].`,
          400,
          'INVALID_STATUS'
        )
      );
    }
  }

  next();
};

/**
 * Validate Update Challenge Request
 */
const validateUpdateChallenge = (req, res, next) => {
  const {
    title,
    description,
    hiddenCode,
    inputFormat,
    outputFormat,
    constraints,
    score,
    hackerRankUrl,
    status,
  } = req.body;

  if (
    title === undefined &&
    description === undefined &&
    hiddenCode === undefined &&
    inputFormat === undefined &&
    outputFormat === undefined &&
    constraints === undefined &&
    score === undefined &&
    hackerRankUrl === undefined &&
    status === undefined
  ) {
    return next(new AppError('At least one field must be provided for update.', 400, 'EMPTY_UPDATE'));
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      return next(new AppError('Challenge title cannot be empty.', 400, 'INVALID_TITLE'));
    }
    if (title.trim().length > MAX_TITLE_LENGTH) {
      return next(
        new AppError(`Challenge title cannot exceed ${MAX_TITLE_LENGTH} characters.`, 400, 'TITLE_TOO_LONG')
      );
    }
  }

  if (description !== undefined) {
    if (typeof description !== 'string' || !description.trim()) {
      return next(new AppError('Challenge description cannot be empty.', 400, 'INVALID_DESCRIPTION'));
    }
    if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
      return next(
        new AppError(`Challenge description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`, 400, 'DESCRIPTION_TOO_LONG')
      );
    }
  }

  if (hiddenCode !== undefined) {
    if (typeof hiddenCode !== 'string' || !hiddenCode.trim()) {
      return next(new AppError('Hidden JavaScript code cannot be empty.', 400, 'INVALID_HIDDEN_CODE'));
    }
    if (hiddenCode.length > MAX_HIDDEN_CODE_LENGTH) {
      return next(
        new AppError(
          `Hidden JavaScript code cannot exceed ${MAX_HIDDEN_CODE_LENGTH / 1024} KB.`,
          400,
          'HIDDEN_CODE_TOO_LARGE'
        )
      );
    }
  }

  if (inputFormat !== undefined && inputFormat !== null) {
    if (typeof inputFormat !== 'string') {
      return next(new AppError('Input format must be a string.', 400, 'INVALID_INPUT_FORMAT'));
    }
    if (inputFormat.trim().length > MAX_FORMAT_LENGTH) {
      return next(new AppError(`Input format cannot exceed ${MAX_FORMAT_LENGTH} characters.`, 400, 'FORMAT_TOO_LONG'));
    }
  }

  if (outputFormat !== undefined && outputFormat !== null) {
    if (typeof outputFormat !== 'string') {
      return next(new AppError('Output format must be a string.', 400, 'INVALID_OUTPUT_FORMAT'));
    }
    if (outputFormat.trim().length > MAX_FORMAT_LENGTH) {
      return next(new AppError(`Output format cannot exceed ${MAX_FORMAT_LENGTH} characters.`, 400, 'FORMAT_TOO_LONG'));
    }
  }

  if (constraints !== undefined && constraints !== null) {
    if (typeof constraints !== 'string') {
      return next(new AppError('Constraints must be a string.', 400, 'INVALID_CONSTRAINTS'));
    }
    if (constraints.trim().length > MAX_FORMAT_LENGTH) {
      return next(new AppError(`Constraints cannot exceed ${MAX_FORMAT_LENGTH} characters.`, 400, 'CONSTRAINTS_TOO_LONG'));
    }
  }

  if (score !== undefined) {
    const numScore = Number(score);
    if (isNaN(numScore) || numScore <= 0 || !Number.isFinite(numScore)) {
      return next(new AppError('Challenge score must be a positive number.', 400, 'INVALID_SCORE'));
    }
    if (numScore > MAX_SCORE) {
      return next(new AppError(`Challenge score cannot exceed ${MAX_SCORE}.`, 400, 'SCORE_TOO_LARGE'));
    }
  }

  if (hackerRankUrl !== undefined && hackerRankUrl !== null && hackerRankUrl.trim() !== '') {
    if (typeof hackerRankUrl !== 'string' || !URL_REGEX.test(hackerRankUrl.trim())) {
      return next(new AppError('Please provide a valid URL for HackerRank (e.g. https://...).', 400, 'INVALID_HACKERRANK_URL'));
    }
  }

  if (status !== undefined) {
    if (![CHALLENGE_STATUS.ENABLED, CHALLENGE_STATUS.DISABLED].includes(status)) {
      return next(
        new AppError(
          `Invalid challenge status. Must be one of: [${CHALLENGE_STATUS.ENABLED}, ${CHALLENGE_STATUS.DISABLED}].`,
          400,
          'INVALID_STATUS'
        )
      );
    }
  }

  next();
};

/**
 * Validate Challenge Status Update
 */
const validateChallengeStatusUpdate = (req, res, next) => {
  const { status } = req.body;

  if (!status || ![CHALLENGE_STATUS.ENABLED, CHALLENGE_STATUS.DISABLED].includes(status)) {
    return next(
      new AppError(
        `Invalid challenge status. Must be one of: [${CHALLENGE_STATUS.ENABLED}, ${CHALLENGE_STATUS.DISABLED}].`,
        400,
        'INVALID_STATUS'
      )
    );
  }

  next();
};

/**
 * Validate Challenge List Query
 */
const validateChallengeQuery = (req, res, next) => {
  const { status, page, limit } = req.query;

  if (status && ![CHALLENGE_STATUS.ENABLED, CHALLENGE_STATUS.DISABLED].includes(status)) {
    return next(
      new AppError(
        `Invalid status filter. Must be one of: [${CHALLENGE_STATUS.ENABLED}, ${CHALLENGE_STATUS.DISABLED}].`,
        400,
        'INVALID_STATUS_FILTER'
      )
    );
  }

  if (page !== undefined) {
    const parsedPage = parseInt(page, 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      return next(new AppError('Page parameter must be a positive integer.', 400, 'INVALID_PAGE'));
    }
  }

  if (limit !== undefined) {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return next(new AppError('Limit parameter must be a positive integer.', 400, 'INVALID_LIMIT'));
    }
  }

  next();
};

module.exports = {
  validateChallengeId,
  validateEventIdParam,
  validateCreateChallenge,
  validateUpdateChallenge,
  validateChallengeStatusUpdate,
  validateChallengeQuery,
};
