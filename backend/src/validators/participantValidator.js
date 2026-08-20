const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const { PARTICIPANT_STATUS } = require('../constants/status');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Validate MongoDB ObjectId in params
 */
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError('Invalid participant ID format.', 400, 'INVALID_ID_FORMAT'));
  }
  next();
};

/**
 * Validate Create Participant Request
 */
const validateCreateParticipant = (req, res, next) => {
  const { name, email, status } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new AppError('Participant name is required.', 400, 'MISSING_NAME'));
  }

  if (name.trim().length > MAX_NAME_LENGTH) {
    return next(
      new AppError(`Participant name cannot exceed ${MAX_NAME_LENGTH} characters.`, 400, 'NAME_TOO_LONG')
    );
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    return next(new AppError('Participant email is required.', 400, 'MISSING_EMAIL'));
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    return next(new AppError('Please provide a valid email address.', 400, 'INVALID_EMAIL_FORMAT'));
  }

  if (status !== undefined) {
    if (![PARTICIPANT_STATUS.ACTIVE, PARTICIPANT_STATUS.DISABLED].includes(status)) {
      return next(
        new AppError(
          `Invalid status. Must be one of: [${PARTICIPANT_STATUS.ACTIVE}, ${PARTICIPANT_STATUS.DISABLED}].`,
          400,
          'INVALID_STATUS'
        )
      );
    }
  }

  next();
};

/**
 * Validate Update Participant Request
 */
const validateUpdateParticipant = (req, res, next) => {
  const { name, email, status } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new AppError('Participant name cannot be empty.', 400, 'INVALID_NAME'));
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      return next(
        new AppError(`Participant name cannot exceed ${MAX_NAME_LENGTH} characters.`, 400, 'NAME_TOO_LONG')
      );
    }
  }

  if (email !== undefined) {
    if (typeof email !== 'string' || !email.trim()) {
      return next(new AppError('Participant email cannot be empty.', 400, 'INVALID_EMAIL'));
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return next(new AppError('Please provide a valid email address.', 400, 'INVALID_EMAIL_FORMAT'));
    }
  }

  if (status !== undefined) {
    if (![PARTICIPANT_STATUS.ACTIVE, PARTICIPANT_STATUS.DISABLED].includes(status)) {
      return next(
        new AppError(
          `Invalid status. Must be one of: [${PARTICIPANT_STATUS.ACTIVE}, ${PARTICIPANT_STATUS.DISABLED}].`,
          400,
          'INVALID_STATUS'
        )
      );
    }
  }

  if (name === undefined && email === undefined && status === undefined) {
    return next(new AppError('At least one field (name, email, status) must be provided for update.', 400, 'EMPTY_UPDATE'));
  }

  next();
};

/**
 * Validate Status Update Request
 */
const validateStatusUpdate = (req, res, next) => {
  const { status } = req.body;

  if (!status || ![PARTICIPANT_STATUS.ACTIVE, PARTICIPANT_STATUS.DISABLED].includes(status)) {
    return next(
      new AppError(
        `Invalid status. Must be one of: [${PARTICIPANT_STATUS.ACTIVE}, ${PARTICIPANT_STATUS.DISABLED}].`,
        400,
        'INVALID_STATUS'
      )
    );
  }

  next();
};

/**
 * Validate Master Password Update Request
 */
const validateMasterPasswordUpdate = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || typeof currentPassword !== 'string') {
    return next(new AppError('Current master password is required.', 400, 'MISSING_CURRENT_PASSWORD'));
  }

  if (!newPassword || typeof newPassword !== 'string') {
    return next(new AppError('New master password is required.', 400, 'MISSING_NEW_PASSWORD'));
  }

  if (newPassword.trim().length < MIN_PASSWORD_LENGTH) {
    return next(
      new AppError(
        `New master password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
        400,
        'PASSWORD_TOO_SHORT'
      )
    );
  }

  next();
};

/**
 * Validate query params for participant listing
 */
const validateListQuery = (req, res, next) => {
  const { status, page, limit } = req.query;

  if (status && ![PARTICIPANT_STATUS.ACTIVE, PARTICIPANT_STATUS.DISABLED].includes(status)) {
    return next(
      new AppError(
        `Invalid status filter. Must be one of: [${PARTICIPANT_STATUS.ACTIVE}, ${PARTICIPANT_STATUS.DISABLED}].`,
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
  validateObjectId,
  validateCreateParticipant,
  validateUpdateParticipant,
  validateStatusUpdate,
  validateMasterPasswordUpdate,
  validateListQuery,
};
