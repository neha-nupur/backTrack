const bcrypt = require("bcryptjs");
const Event = require("../models/Event");
const Participant = require("../models/Participant");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const {
  EVENT_STATUS,
  EVENT_TYPE,
  PARTICIPANT_STATUS,
} = require("../constants/status");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/**
 * Format event document for administrative response
 */
const formatAdminEvent = (doc) => ({
  id: doc._id ? doc._id.toString() : doc.id,
  _id: doc._id ? doc._id.toString() : doc.id,
  name: doc.name,
  type: doc.type || EVENT_TYPE.CONTEST,
  description: doc.description || "",
  startTime: doc.startTime,
  endTime: doc.endTime,
  status: doc.status,
  isActive: doc.isActive !== false,
  isPasswordProtected: !!doc.passwordHash,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

/**
 * Format event document for participant-safe response
 * Explicitly omits internal database fields or potential administrative metadata
 */
const formatParticipantEvent = (doc) => ({
  id: doc._id ? doc._id.toString() : doc.id,
  name: doc.name,
  type: doc.type || EVENT_TYPE.CONTEST,
  description: doc.description || "",
  startTime: doc.startTime,
  endTime: doc.endTime,
  status: doc.status,
  isActive: doc.isActive !== false,
  isPasswordProtected: !!doc.passwordHash,
});

/**
 * Create a new event (ADMIN)
 */
const createEvent = async ({
  name,
  type = EVENT_TYPE.CONTEST,
  description = "",
  startTime,
  endTime,
  status = EVENT_STATUS.UPCOMING,
  isActive = true,
  password = null,
}) => {
  let passwordHash = null;
  if (password && typeof password === "string" && password.trim()) {
    passwordHash = await bcrypt.hash(password.trim(), 10);
  }

  const event = await Event.create({
    name: name.trim(),
    type: type || EVENT_TYPE.CONTEST,
    description: description ? description.trim() : "",
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    status: status || EVENT_STATUS.UPCOMING,
    isActive: isActive !== false,
    passwordHash,
  });

  logger.info(
    `[EVENT CREATED] "${event.name}" (${event._id}) type [${event.type}] with status [${event.status}]`,
  );
  return formatAdminEvent(event);
};

/**
 * List events for administration with search, filter, and pagination
 */
const listAdminEvents = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT),
  );
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.search && query.search.trim()) {
    const escapedSearch = query.search
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.name = new RegExp(escapedSearch, "i");
  }

  const [total, docs] = await Promise.all([
    Event.countDocuments(filter),
    Event.find(filter)
      .sort({ startTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    events: docs.map(formatAdminEvent),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

/**
 * Get single event details by ID (ADMIN)
 */
const getEventById = async (id) => {
  const event = await Event.findById(id);
  if (!event) {
    throw new AppError("Event not found.", 404, "EVENT_NOT_FOUND");
  }
  return formatAdminEvent(event);
};

/**
 * Update event fields (ADMIN)
 */
const updateEvent = async (id, fields) => {
  const event = await Event.findById(id);
  if (!event) {
    throw new AppError("Event not found.", 404, "EVENT_NOT_FOUND");
  }

  // Lifecycle check: prevent modifying times of a COMPLETED event
  if (
    event.status === EVENT_STATUS.COMPLETED &&
    (fields.startTime || fields.endTime)
  ) {
    throw new AppError(
      "Cannot change scheduled times of an already completed event.",
      400,
      "CANNOT_MODIFY_COMPLETED_EVENT",
    );
  }

  if (fields.name) {
    event.name = fields.name.trim();
  }

  if (
    fields.type &&
    (fields.type === EVENT_TYPE.DEMO || fields.type === EVENT_TYPE.CONTEST)
  ) {
    event.type = fields.type;
  }

  if (fields.isActive !== undefined) {
    event.isActive = !!fields.isActive;
  }

  if (fields.password !== undefined) {
    if (
      fields.password &&
      typeof fields.password === "string" &&
      fields.password.trim()
    ) {
      event.passwordHash = await bcrypt.hash(fields.password.trim(), 10);
    } else if (fields.password === null || fields.password === "") {
      event.passwordHash = null;
    }
  }

  if (fields.description !== undefined) {
    event.description = fields.description ? fields.description.trim() : "";
  }

  const newStart = fields.startTime
    ? new Date(fields.startTime)
    : event.startTime;
  const newEnd = fields.endTime ? new Date(fields.endTime) : event.endTime;

  if (newEnd.getTime() <= newStart.getTime()) {
    throw new AppError(
      "Scheduled end time must be after the scheduled start time.",
      400,
      "INVALID_TIME_RANGE",
    );
  }

  if (fields.startTime) event.startTime = newStart;
  if (fields.endTime) event.endTime = newEnd;

  if (fields.status && fields.status !== event.status) {
    // Validate status transition
    validateStatusTransition(event.status, fields.status);
    event.status = fields.status;
  }

  const saved = await event.save();
  logger.info(`[EVENT UPDATED] "${saved.name}" (${saved._id})`);
  return formatAdminEvent(saved);
};

/**
 * Helper to validate logical event status transitions
 */
const validateStatusTransition = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) return;

  // Disallow transition out of COMPLETED state to preserve historical event integrity
  if (currentStatus === EVENT_STATUS.COMPLETED) {
    throw new AppError(
      "Completed events cannot be transitioned back to active or upcoming states.",
      400,
      "INVALID_STATUS_TRANSITION",
    );
  }
};

/**
 * Update event status only (ADMIN)
 */
const updateEventStatus = async (id, status) => {
  const event = await Event.findById(id);
  if (!event) {
    throw new AppError("Event not found.", 404, "EVENT_NOT_FOUND");
  }

  validateStatusTransition(event.status, status);

  // Safety check before marking LIVE: ensure valid duration
  if (
    status === EVENT_STATUS.LIVE &&
    event.endTime.getTime() <= event.startTime.getTime()
  ) {
    throw new AppError(
      "Cannot mark event LIVE: End time is not after start time.",
      400,
      "INVALID_TIME_RANGE",
    );
  }

  event.status = status;
  const saved = await event.save();
  logger.info(
    `[EVENT STATUS CHANGED] "${saved.name}" (${saved._id}) -> [${status}]`,
  );
  return formatAdminEvent(saved);
};

/**
 * Delete an event (ADMIN)
 */
const deleteEvent = async (id) => {
  const event = await Event.findByIdAndDelete(id);
  if (!event) {
    throw new AppError("Event not found.", 404, "EVENT_NOT_FOUND");
  }
  logger.info(`[EVENT DELETED] "${event.name}" (${event._id})`);
  return { id: event._id, name: event.name };
};

/**
 * Retrieve LIVE events for participants (filtered by isActive: true and optional type)
 */
const getParticipantLiveEvents = async (type = null) => {
  const now = new Date();
  const filter = { status: EVENT_STATUS.LIVE, isActive: true };
  if (type && (type === EVENT_TYPE.DEMO || type === EVENT_TYPE.CONTEST)) {
    filter.type = type;
  }

  const docs = await Event.find(filter).sort({ startTime: 1 }).lean();

  return {
    events: docs.map(formatParticipantEvent),
    serverTime: now.toISOString(),
  };
};

/**
 * Retrieve UPCOMING events for participants (filtered by isActive: true and optional type)
 */
const getParticipantUpcomingEvents = async (type = null) => {
  const now = new Date();
  const filter = { status: EVENT_STATUS.UPCOMING, isActive: true };
  if (type && (type === EVENT_TYPE.DEMO || type === EVENT_TYPE.CONTEST)) {
    filter.type = type;
  }

  const docs = await Event.find(filter).sort({ startTime: 1 }).lean();

  return {
    events: docs.map(formatParticipantEvent),
    serverTime: now.toISOString(),
  };
};

/**
 * Start an Event (PARTICIPANT)
 * Authoritative server-side validation of participant active status, event active state, event password, and server time.
 */
const startEvent = async (eventId, participantId, password = null) => {
  // 1. Re-verify participant identity and active status from database
  const participant = await Participant.findById(participantId);
  if (!participant) {
    throw new AppError(
      "Participant account not found.",
      404,
      "PARTICIPANT_NOT_FOUND",
    );
  }
  if (participant.status !== PARTICIPANT_STATUS.ACTIVE) {
    throw new AppError(
      "Your participant account is disabled and cannot join events.",
      403,
      "ACCOUNT_DISABLED",
    );
  }

  // 2. Query the requested event
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError("Event not found.", 404, "EVENT_NOT_FOUND");
  }

  // 3. Check Event Activation
  if (event.isActive === false) {
    throw new AppError(
      "This event is currently deactivated by administrator.",
      403,
      "EVENT_INACTIVE",
    );
  }

  // 4. Validate Event Status
  if (event.status === EVENT_STATUS.UPCOMING) {
    throw new AppError("Event is not live yet.", 403, "EVENT_NOT_LIVE");
  }

  if (event.status === EVENT_STATUS.COMPLETED) {
    throw new AppError(
      "This event has been completed.",
      403,
      "EVENT_COMPLETED",
    );
  }

  // 5. Check Protected Event Password
  if (event.passwordHash) {
    if (!password || typeof password !== "string") {
      throw new AppError(
        "Event password is required to access this protected event.",
        401,
        "EVENT_PASSWORD_REQUIRED",
      );
    }
    const isMatch = await bcrypt.compare(password.trim(), event.passwordHash);
    if (!isMatch) {
      throw new AppError(
        "Invalid event password.",
        401,
        "INVALID_EVENT_PASSWORD",
      );
    }
  }

  // 6. Server-Authoritative Time Check
  const now = new Date();
  const serverTimeMs = now.getTime();
  const startTimeMs = event.startTime.getTime();
  const endTimeMs = event.endTime.getTime();

  // Check if before start time
  if (serverTimeMs < startTimeMs) {
    throw new AppError(
      `Event has not started yet. Please wait until ${event.startTime.toISOString()}.`,
      403,
      "EVENT_NOT_STARTED",
    );
  }

  // Check if after end time
  if (serverTimeMs > endTimeMs) {
    throw new AppError("This event has ended.", 403, "EVENT_ENDED");
  }

  logger.info(
    `[EVENT SESSION STARTED] Participant "${participant.email}" (${participant._id}) started event "${event.name}" (${event._id})`,
  );

  return {
    eventId: event._id,
    name: event.name,
    type: event.type,
    status: event.status,
    startTime: event.startTime,
    endTime: event.endTime,
    serverTime: now.toISOString(),
  };
};

module.exports = {
  createEvent,
  listAdminEvents,
  getEventById,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  getParticipantLiveEvents,
  getParticipantUpcomingEvents,
  startEvent,
};
