const Challenge = require('../models/Challenge');
const Event = require('../models/Event');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const { CHALLENGE_STATUS } = require('../constants/status');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/**
 * Format challenge document for administrative response (includes hiddenCode)
 */
const toAdminChallengeResponse = (doc) => ({
  id: doc._id,
  eventId: doc.eventId,
  title: doc.title,
  description: doc.description,
  hiddenCode: doc.hiddenCode,
  inputFormat: doc.inputFormat || '',
  outputFormat: doc.outputFormat || '',
  constraints: doc.constraints || '',
  hint: doc.hint || '',
  score: doc.score,
  hackerRankUrl: doc.hackerRankUrl || '',
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

/**
 * Format challenge document for participant response
 * CRITICAL SECURITY & SRS SANITIZATION:
 * Returns ONLY participant-safe fields: id, challengeNumber, inputConstraints, hint, hackerRankUrl, status.
 * Strictly EXCLUDES: title, description, hiddenCode, score, difficulty, solution, expectedOutput, etc.
 */
const toParticipantChallengeResponse = (doc, index = 0) => ({
  id: doc._id,
  eventId: doc.eventId,
  challengeNumber: index + 1,
  inputConstraints: doc.constraints || '',
  hint: doc.hint || '',
  hackerRankUrl: doc.hackerRankUrl || '',
  status: doc.status,
});

/**
 * Create a new challenge assigned to an event (ADMIN)
 */
const createChallenge = async (eventId, {
  title,
  description,
  hiddenCode,
  inputFormat = '',
  outputFormat = '',
  constraints = '',
  hint = '',
  score = 100,
  hackerRankUrl = '',
  status = CHALLENGE_STATUS.ENABLED,
}) => {
  // Ensure the target event exists
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Parent event not found.', 404, 'EVENT_NOT_FOUND');
  }

  const challenge = await Challenge.create({
    eventId: event._id,
    title: title.trim(),
    description: description.trim(),
    hiddenCode, // Pure text storage (no execution)
    inputFormat: inputFormat ? inputFormat.trim() : '',
    outputFormat: outputFormat ? outputFormat.trim() : '',
    constraints: constraints ? constraints.trim() : '',
    hint: hint ? hint.trim() : '',
    score: Number(score) || 100,
    hackerRankUrl: hackerRankUrl ? hackerRankUrl.trim() : '',
    status: status || CHALLENGE_STATUS.ENABLED,
  });

  logger.info(`[CHALLENGE CREATED] "${challenge.title}" (${challenge._id}) for Event (${eventId})`);
  return toAdminChallengeResponse(challenge);
};

/**
 * List challenges for an event (ADMIN)
 */
const listChallengesByEvent = async (eventId, query = {}) => {
  // Ensure the event exists
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found.', 404, 'EVENT_NOT_FOUND');
  }

  const page = Math.max(1, parseInt(query.page, 10) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const filter = { eventId };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.search && query.search.trim()) {
    const escapedSearch = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.title = new RegExp(escapedSearch, 'i');
  }

  const [total, docs] = await Promise.all([
    Challenge.countDocuments(filter),
    Challenge.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    challenges: docs.map(toAdminChallengeResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

/**
 * Get challenge details by ID (ADMIN - includes hiddenCode)
 */
const getChallengeById = async (id) => {
  const challenge = await Challenge.findById(id);
  if (!challenge) {
    throw new AppError('Challenge not found.', 404, 'CHALLENGE_NOT_FOUND');
  }
  return toAdminChallengeResponse(challenge);
};

/**
 * Retrieve participant-safe challenges for an event (PARTICIPANT)
 * Excludes hiddenCode, title, description, score entirely
 */
const getParticipantChallengesByEvent = async (eventId) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found.', 404, 'EVENT_NOT_FOUND');
  }

  const docs = await Challenge.find({
    eventId,
    status: CHALLENGE_STATUS.ENABLED,
  })
    .sort({ createdAt: 1 })
    .lean();

  return docs.map((doc, idx) => toParticipantChallengeResponse(doc, idx));
};

/**
 * Update challenge details (ADMIN)
 */
const updateChallenge = async (id, fields) => {
  const challenge = await Challenge.findById(id);
  if (!challenge) {
    throw new AppError('Challenge not found.', 404, 'CHALLENGE_NOT_FOUND');
  }

  if (fields.eventId && fields.eventId !== challenge.eventId.toString()) {
    const targetEvent = await Event.findById(fields.eventId);
    if (!targetEvent) {
      throw new AppError('Target reassignment event not found.', 404, 'EVENT_NOT_FOUND');
    }
    challenge.eventId = targetEvent._id;
  }

  if (fields.title !== undefined) challenge.title = fields.title.trim();
  if (fields.description !== undefined) challenge.description = fields.description.trim();
  if (fields.hiddenCode !== undefined) challenge.hiddenCode = fields.hiddenCode;
  if (fields.inputFormat !== undefined) challenge.inputFormat = fields.inputFormat ? fields.inputFormat.trim() : '';
  if (fields.outputFormat !== undefined) challenge.outputFormat = fields.outputFormat ? fields.outputFormat.trim() : '';
  if (fields.constraints !== undefined) challenge.constraints = fields.constraints ? fields.constraints.trim() : '';
  if (fields.hint !== undefined) challenge.hint = fields.hint ? fields.hint.trim() : '';
  if (fields.score !== undefined) challenge.score = Number(fields.score);
  if (fields.hackerRankUrl !== undefined) challenge.hackerRankUrl = fields.hackerRankUrl ? fields.hackerRankUrl.trim() : '';
  if (fields.status !== undefined) challenge.status = fields.status;

  const saved = await challenge.save();
  logger.info(`[CHALLENGE UPDATED] "${saved.title}" (${saved._id})`);
  return toAdminChallengeResponse(saved);
};

/**
 * Update challenge status (ADMIN)
 */
const updateChallengeStatus = async (id, status) => {
  const challenge = await Challenge.findById(id);
  if (!challenge) {
    throw new AppError('Challenge not found.', 404, 'CHALLENGE_NOT_FOUND');
  }

  challenge.status = status;
  const saved = await challenge.save();
  logger.info(`[CHALLENGE STATUS CHANGED] "${saved.title}" (${saved._id}) -> [${status}]`);
  return toAdminChallengeResponse(saved);
};

/**
 * Delete challenge (ADMIN)
 */
const deleteChallenge = async (id) => {
  const challenge = await Challenge.findByIdAndDelete(id);
  if (!challenge) {
    throw new AppError('Challenge not found.', 404, 'CHALLENGE_NOT_FOUND');
  }
  logger.info(`[CHALLENGE DELETED] "${challenge.title}" (${challenge._id})`);
  return { id: challenge._id, title: challenge.title };
};

module.exports = {
  toAdminChallengeResponse,
  toParticipantChallengeResponse,
  createChallenge,
  listChallengesByEvent,
  getChallengeById,
  getParticipantChallengesByEvent,
  updateChallenge,
  updateChallengeStatus,
  deleteChallenge,
};
