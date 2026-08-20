const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const { EVENT_STATUS } = require('../constants/status');

const MAX_NAME_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 1000;

/**
 * Validate MongoDB ObjectId in params (supports :id or :eventId)
 */
const validateEventId = (req, res, next) => {
  const id = req.params.id || req.params.eventId;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError('Invalid event ID format.', 400, 'INVALID_ID_FORMAT'));
  }
  next();
};

/**
 * Validate Create Event Request
 */
const validateCreateEvent = (req, res, next) => {
  const { name, description, startTime, endTime, status } = req.body;

  // 1. Validate Name
  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new AppError('Event name is required.', 400, 'MISSING_NAME'));
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    return next(
      new AppError(`Event name cannot exceed ${MAX_NAME_LENGTH} characters.`, 400, 'NAME_TOO_LONG')
    );
  }

  // 2. Validate Description
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      return next(new AppError('Event description must be a string.', 400, 'INVALID_DESCRIPTION'));
    }
    if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
      return next(
        new AppError(
          `Event description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`,
          400,
          'DESCRIPTION_TOO_LONG'
        )
      );
    }
  }

  // 3. Validate Start Time
  if (!startTime) {
    return next(new AppError('Scheduled start time is required.', 400, 'MISSING_START_TIME'));
  }
  const parsedStartTime = new Date(startTime);
  if (isNaN(parsedStartTime.getTime())) {
    return next(new AppError('Scheduled start time must be a valid date/timestamp.', 400, 'INVALID_START_TIME'));
  }

  // 4. Validate End Time
  if (!endTime) {
    return next(new AppError('Scheduled end time is required.', 400, 'MISSING_END_TIME'));
  }
  const parsedEndTime = new Date(endTime);
  if (isNaN(parsedEndTime.getTime())) {
    return next(new AppError('Scheduled end time must be a valid date/timestamp.', 400, 'INVALID_END_TIME'));
  }

  // 5. Ensure End Time is after Start Time
  if (parsedEndTime.getTime() <= parsedStartTime.getTime()) {
    return next(new AppError('Scheduled end time must be after the scheduled start time.', 400, 'INVALID_TIME_RANGE'));
  }

  // 6. Validate Status if provided
  if (status !== undefined) {
    if (!Object.values(EVENT_STATUS).includes(status)) {
      return next(
        new AppError(
          `Invalid event status. Must be one of: [${Object.values(EVENT_STATUS).join(', ')}].`,
          400,
          'INVALID_STATUS'
        )
      );
    }
  }

  next();
};

/**
 * Validate Update Event Request
 */
const validateUpdateEvent = (req, res, next) => {
  const { name, description, startTime, endTime, status } = req.body;

  if (
    name === undefined &&
    description === undefined &&
    startTime === undefined &&
    endTime === undefined &&
    status === undefined
  ) {
    return next(new AppError('At least one field must be provided for update.', 400, 'EMPTY_UPDATE'));
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new AppError('Event name cannot be empty.', 400, 'INVALID_NAME'));
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      return next(
        new AppError(`Event name cannot exceed ${MAX_NAME_LENGTH} characters.`, 400, 'NAME_TOO_LONG')
      );
    }
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      return next(new AppError('Event description must be a string.', 400, 'INVALID_DESCRIPTION'));
    }
    if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
      return next(
        new AppError(
          `Event description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`,
          400,
          'DESCRIPTION_TOO_LONG'
        )
      );
    }
  }

  let parsedStart = null;
  let parsedEnd = null;

  if (startTime !== undefined) {
    parsedStart = new Date(startTime);
    if (isNaN(parsedStart.getTime())) {
      return next(new AppError('Scheduled start time must be a valid date/timestamp.', 400, 'INVALID_START_TIME'));
    }
  }

  if (endTime !== undefined) {
    parsedEnd = new Date(endTime);
    if (isNaN(parsedEnd.getTime())) {
      return next(new AppError('Scheduled end time must be a valid date/timestamp.', 400, 'INVALID_END_TIME'));
    }
  }

  if (parsedStart && parsedEnd && parsedEnd.getTime() <= parsedStart.getTime()) {
    return next(new AppError('Scheduled end time must be after the scheduled start time.', 400, 'INVALID_TIME_RANGE'));
  }

  if (status !== undefined) {
    if (!Object.values(EVENT_STATUS).includes(status)) {
      return next(
        new AppError(
          `Invalid event status. Must be one of: [${Object.values(EVENT_STATUS).join(', ')}].`,
          400,
          'INVALID_STATUS'
        )
      );
    }
  }

  next();
};

/**
 * Validate Status Update Request
 */
const validateStatusUpdate = (req, res, next) => {
  const { status } = req.body;

  if (!status || !Object.values(EVENT_STATUS).includes(status)) {
    return next(
      new AppError(
        `Invalid event status. Must be one of: [${Object.values(EVENT_STATUS).join(', ')}].`,
        400,
        'INVALID_STATUS'
      )
    );
  }

  next();
};

/**
 * Validate query parameters for event listing
 */
const validateEventQuery = (req, res, next) => {
  const { status, page, limit } = req.query;

  if (status && !Object.values(EVENT_STATUS).includes(status)) {
    return next(
      new AppError(
        `Invalid status filter. Must be one of: [${Object.values(EVENT_STATUS).join(', ')}].`,
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
  validateEventId,
  validateCreateEvent,
  validateUpdateEvent,
  validateStatusUpdate,
  validateEventQuery,
};
