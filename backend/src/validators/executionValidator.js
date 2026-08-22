const mongoose = require('mongoose');
const AppError = require('../utils/appError');

/**
 * Maximum allowed participant input size (characters).
 * Additional defence-in-depth layer above the executor's own limit.
 */
const MAX_USER_INPUT_LENGTH = 10000; // 10 KB

/**
 * Validate execution request body for POST /execute
 */
const validateExecutionRequest = (req, res, next) => {
  const { userInput } = req.body;

  // userInput is strictly required and cannot be empty or only whitespace
  if (userInput === undefined || userInput === null || typeof userInput !== 'string' || userInput.trim().length === 0) {
    return next(
      new AppError(
        'Please enter a valid input before executing the challenge.',
        400,
        'EMPTY_INPUT'
      )
    );
  }

  if (userInput.length > MAX_USER_INPUT_LENGTH) {
    return next(
      new AppError(
        `User input cannot exceed ${MAX_USER_INPUT_LENGTH} characters.`,
        400,
        'INPUT_TOO_LARGE'
      )
    );
  }

  next();
};

/**
 * Validate :challengeId route param
 */
const validateChallengeIdParam = (req, res, next) => {
  const { challengeId } = req.params;
  if (!challengeId || !mongoose.Types.ObjectId.isValid(challengeId)) {
    return next(new AppError('Invalid challenge ID format.', 400, 'INVALID_ID_FORMAT'));
  }
  next();
};

module.exports = {
  validateExecutionRequest,
  validateChallengeIdParam,
};
