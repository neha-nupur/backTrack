const Participant = require("../models/Participant");
const Event = require("../models/Event");
const Challenge = require("../models/Challenge");
const Attempt = require("../models/Attempt");
const { Types } = require("mongoose");
const { ATTEMPT_STATUS } = require("../constants/status");

class AdminMonitoringService {
  /**
   * Get operational dashboard statistics
   */
  async getDashboardStats() {
    const [
      totalParticipants,
      activeParticipants,
      disabledParticipants,
      totalEvents,
      upcomingEvents,
      liveEvents,
      completedEvents,
      totalChallenges,
      enabledChallenges,
      totalAttempts,
    ] = await Promise.all([
      Participant.countDocuments({}),
      Participant.countDocuments({ status: "ACTIVE" }),
      Participant.countDocuments({ status: "DISABLED" }),
      Event.countDocuments({}),
      Event.countDocuments({ status: "UPCOMING" }),
      Event.countDocuments({ status: "LIVE" }),
      Event.countDocuments({ status: "COMPLETED" }),
      Challenge.countDocuments(),
      Challenge.countDocuments({ status: "ENABLED" }),
      Attempt.countDocuments(),
    ]);

    return {
      participants: {
        total: totalParticipants,
        active: activeParticipants,
        disabled: disabledParticipants,
      },
      events: {
        total: totalEvents,
        upcoming: upcomingEvents,
        live: liveEvents,
        completed: completedEvents,
      },
      challenges: { total: totalChallenges, enabled: enabledChallenges },
      attempts: { total: totalAttempts },
    };
  }

  /**
   * Get paginated and filtered attempts without hiddenCode
   */
  async getAttempts(filters = {}, options = { page: 1, limit: 20 }) {
    const query = {};

    if (filters.eventId) query.eventId = filters.eventId;
    if (filters.challengeId) query.challengeId = filters.challengeId;
    if (filters.participantId) query.participantId = filters.participantId;
    if (filters.status) query.status = filters.status;

    const skip = (options.page - 1) * options.limit;

    const attempts = await Attempt.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit)
      .populate("participantId", "name email")
      .populate("eventId", "name")
      .populate("challengeId", "title challengeNumber")
      .lean();

    const total = await Attempt.countDocuments(query);

    return {
      attempts: attempts.map(this._serializeAttempt),
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  /**
   * Get attempt detail safely
   */
  async getAttemptById(attemptId) {
    const attempt = await Attempt.findById(attemptId)
      .populate("participantId", "name email")
      .populate("eventId", "name")
      .populate("challengeId", "title challengeNumber")
      .lean();

    if (!attempt) return null;
    return this._serializeAttempt(attempt);
  }

  /**
   * Get event activity aggregations
   */
  async getEventActivity(eventId) {
    const event = await Event.findById(eventId).lean();
    if (!event) return null;

    const [totalAttempts, successExecutions, failedExecutions, challenges] =
      await Promise.all([
        Attempt.countDocuments({ eventId }),
        Attempt.countDocuments({ eventId, status: ATTEMPT_STATUS.SUCCESS }),
        Attempt.countDocuments({
          eventId,
          status: { $ne: ATTEMPT_STATUS.SUCCESS },
        }),
        Challenge.countDocuments({ eventId }),
      ]);

    // Unique participants who attempted something in this event
    const uniqueParticipantsResult = await Attempt.aggregate([
      { $match: { eventId: new Types.ObjectId(eventId) } },
      { $group: { _id: "$participantId" } },
      { $count: "total" },
    ]);
    const activeParticipants =
      uniqueParticipantsResult.length > 0
        ? uniqueParticipantsResult[0].total
        : 0;

    return {
      event: { id: event._id, name: event.name, status: event.status },
      activity: {
        totalAttempts,
        successExecutions,
        failedExecutions,
        activeParticipants,
        totalChallenges: challenges,
      },
    };
  }

  /**
   * Safe serializer for attempts (ensures no internal exposure).
   *
   * NOTE: `status` and `error` map directly from the Attempt document — both
   * are now real persisted fields (see models/Attempt.js and
   * executionService.js). `executionTimeMs` is aliased from the schema's
   * `executionTime` field rather than renamed at the schema level, since
   * resultService.js (participant-facing results) already depends on
   * `executionTime` as-is.
   */
  _serializeAttempt(attempt) {
    return {
      id: attempt._id,
      participant: attempt.participantId
        ? {
            id: attempt.participantId._id,
            name: attempt.participantId.name,
            email: attempt.participantId.email,
          }
        : null,
      event: attempt.eventId
        ? {
            id: attempt.eventId._id,
            name: attempt.eventId.name,
          }
        : null,
      challenge: attempt.challengeId
        ? {
            id: attempt.challengeId._id,
            title: attempt.challengeId.title,
            challengeNumber: attempt.challengeId.challengeNumber,
          }
        : null,
      input: attempt.input,
      output: attempt.output,
      error: attempt.error,
      status: attempt.status,
      executionTimeMs: attempt.executionTime,
      score: attempt.score,
      isCorrect: attempt.isCorrect,
      createdAt: attempt.createdAt,
    };
  }
}

module.exports = new AdminMonitoringService();
