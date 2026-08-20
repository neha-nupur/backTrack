/**
 * Result Service
 * 
 * Responsible for aggregating participant attempts and generating
 * result summaries for events.
 */

const Attempt = require('../models/Attempt');
const Event = require('../models/Event');
const Challenge = require('../models/Challenge');
const AppError = require('../utils/appError');

/**
 * Gets attempt history for a specific participant in an event.
 */
const getParticipantAttempts = async (participantId, eventId, options = {}) => {
  const { page = 1, limit = 20, challengeId } = options;
  
  const query = { participantId, eventId };
  if (challengeId) {
    query.challengeId = challengeId;
  }

  const skip = (page - 1) * limit;

  const [attempts, total] = await Promise.all([
    Attempt.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('challengeId', 'title') // Populate challenge title
      .lean(),
    Attempt.countDocuments(query),
  ]);

  // Sanitize for participant
  const sanitizedAttempts = attempts.map(attempt => ({
    id: attempt._id,
    eventId: attempt.eventId,
    challengeId: attempt.challengeId._id || attempt.challengeId,
    challengeTitle: attempt.challengeId.title || 'Unknown Challenge',
    input: attempt.input,
    output: attempt.output,
    success: attempt.success,
    isCorrect: attempt.isCorrect,
    score: attempt.score,
    executionTimeMs: attempt.executionTime,
    createdAt: attempt.createdAt,
  }));

  return {
    attempts: sanitizedAttempts,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Gets a result summary for a participant in a specific event.
 */
const getParticipantEventResult = async (participantId, eventId) => {
  const event = await Event.findById(eventId).lean();
  if (!event) {
    throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  }

  // Count total challenges in this event
  const totalChallenges = await Challenge.countDocuments({ eventId, status: 'ENABLED' });

  // Get all attempts for this participant in this event
  const attempts = await Attempt.find({ participantId, eventId }).lean();

  const attemptedChallengeIds = new Set();
  let correctChallenges = 0;
  let totalScore = 0;

  // Due to spec gap, attempts might not have isCorrect=true.
  // We'll aggregate what we have, even if scores are 0.
  // The unique challenges attempted is still useful.
  attempts.forEach(attempt => {
    attemptedChallengeIds.add(attempt.challengeId.toString());
    // If scoring were implemented, we'd handle max score per challenge here
  });

  return {
    event: {
      id: event._id,
      name: event.name,
      status: event.status,
    },
    summary: {
      totalChallenges,
      attemptedChallenges: attemptedChallengeIds.size,
      correctChallenges, // Always 0 due to spec limitation
      totalScore, // Always 0 due to spec limitation
    }
  };
};

module.exports = {
  getParticipantAttempts,
  getParticipantEventResult,
};
