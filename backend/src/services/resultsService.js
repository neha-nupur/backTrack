const mongoose = require('mongoose');
const Participant = require('../models/Participant');
const Event = require('../models/Event');
const Challenge = require('../models/Challenge');
const Attempt = require('../models/Attempt');
const { PARTICIPANT_STATUS, EVENT_STATUS, CHALLENGE_STATUS } = require('../constants/status');

/**
 * Get system-wide overall statistics
 */
const getOverallStatistics = async () => {
  const [participantStats, eventStats, challengeStats, attemptStats] = await Promise.all([
    Participant.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', PARTICIPANT_STATUS.ACTIVE] }, 1, 0] } },
          disabled: { $sum: { $cond: [{ $eq: ['$status', PARTICIPANT_STATUS.DISABLED] }, 1, 0] } },
        }
      }
    ]),
    Event.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          upcoming: { $sum: { $cond: [{ $eq: ['$status', EVENT_STATUS.UPCOMING] }, 1, 0] } },
          live: { $sum: { $cond: [{ $eq: ['$status', EVENT_STATUS.LIVE] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', EVENT_STATUS.COMPLETED] }, 1, 0] } },
        }
      }
    ]),
    Challenge.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          enabled: { $sum: { $cond: [{ $eq: ['$status', CHALLENGE_STATUS.ENABLED] }, 1, 0] } },
          disabled: { $sum: { $cond: [{ $eq: ['$status', CHALLENGE_STATUS.DISABLED] }, 1, 0] } },
        }
      }
    ]),
    Attempt.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          successful: { $sum: { $cond: ['$success', 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] } },
          timeouts: { $sum: { $cond: [{ $regexMatch: { input: '$output', regex: /timeout/i } }, 1, 0] } }, // Assuming timeout is recorded in output or similar
          evaluated: { $sum: { $cond: [{ $ne: ['$isCorrect', null] }, 1, 0] } },
          solved: { $sum: { $cond: [{ $eq: ['$isCorrect', true] }, 1, 0] } },
          totalScore: { $sum: '$score' }
        }
      }
    ])
  ]);

  return {
    participants: participantStats[0] || { total: 0, active: 0, disabled: 0 },
    events: eventStats[0] || { total: 0, upcoming: 0, live: 0, completed: 0 },
    challenges: challengeStats[0] || { total: 0, enabled: 0, disabled: 0 },
    attempts: attemptStats[0] || { total: 0, successful: 0, failed: 0, timeouts: 0, evaluated: 0, solved: 0, totalScore: 0 }
  };
};

/**
 * Get statistics for a specific event
 */
const getEventStatistics = async (eventId) => {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  const challenges = await Challenge.countDocuments({ eventId });
  
  const attemptStats = await Attempt.aggregate([
    { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        successful: { $sum: { $cond: ['$success', 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] } },
        uniqueParticipants: { $addToSet: '$participantId' },
        evaluated: { $sum: { $cond: [{ $ne: ['$isCorrect', null] }, 1, 0] } },
        solved: { $sum: { $cond: [{ $eq: ['$isCorrect', true] }, 1, 0] } },
        totalScore: { $sum: '$score' }
      }
    },
    {
      $project: {
        _id: 0,
        total: 1,
        successful: 1,
        failed: 1,
        evaluated: 1,
        solved: 1,
        totalScore: 1,
        uniqueParticipantsCount: { $size: '$uniqueParticipants' }
      }
    }
  ]);

  return {
    event,
    challengeCount: challenges,
    execution: {
      totalAttempts: attemptStats[0]?.total || 0,
      successfulExecutions: attemptStats[0]?.successful || 0,
      failedExecutions: attemptStats[0]?.failed || 0,
      uniqueParticipants: attemptStats[0]?.uniqueParticipantsCount || 0
    },
    evaluation: {
      evaluatedAttempts: attemptStats[0]?.evaluated || 0,
      solvedAttempts: attemptStats[0]?.solved || 0,
      totalScore: attemptStats[0]?.totalScore || 0,
      evaluationAvailable: attemptStats[0]?.evaluated > 0
    }
  };
};

/**
 * Get participant results with optional filters and pagination
 */
const getParticipantResults = async ({ eventId, search, page = 1, limit = 20, sort = 'name', order = 'asc' }) => {
  const matchStage = {};
  if (eventId) matchStage.eventId = new mongoose.Types.ObjectId(eventId);
  
  const sortDirection = order === 'desc' ? -1 : 1;
  
  const pipeline = [];
  
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  // Group by participant
  pipeline.push({
    $group: {
      _id: '$participantId',
      totalAttempts: { $sum: 1 },
      uniqueChallenges: { $addToSet: '$challengeId' },
      successfulExecutions: { $sum: { $cond: ['$success', 1, 0] } },
      failedExecutions: { $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] } },
      evaluatedAttempts: { $sum: { $cond: [{ $ne: ['$isCorrect', null] }, 1, 0] } },
      solved: { $sum: { $cond: [{ $eq: ['$isCorrect', true] }, 1, 0] } },
      score: { $sum: '$score' },
      totalExecutionTime: { $sum: '$executionTime' },
      firstActivity: { $min: '$createdAt' },
      lastActivity: { $max: '$createdAt' }
    }
  });

  // Lookup participant details
  pipeline.push({
    $lookup: {
      from: 'participants',
      localField: '_id',
      foreignField: '_id',
      as: 'participant'
    }
  });
  
  pipeline.push({ $unwind: '$participant' });

  // Apply search if provided
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { 'participant.name': { $regex: search, $options: 'i' } },
          { 'participant.email': { $regex: search, $options: 'i' } }
        ]
      }
    });
  }
  
  // Format the output
  pipeline.push({
    $project: {
      _id: 1,
      name: '$participant.name',
      email: '$participant.email',
      status: '$participant.status',
      totalAttempts: 1,
      uniqueChallengesAttempted: { $size: '$uniqueChallenges' },
      successfulExecutions: 1,
      failedExecutions: 1,
      evaluatedAttempts: 1,
      solved: 1,
      score: 1,
      totalExecutionTime: 1,
      firstActivity: 1,
      lastActivity: 1
    }
  });

  // Sort, pagination and total count using facet
  pipeline.push({
    $facet: {
      metadata: [{ $count: 'total' }],
      data: [
        { $sort: { [sort]: sortDirection, _id: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
      ]
    }
  });

  const result = await Attempt.aggregate(pipeline);
  const total = result[0]?.metadata[0]?.total || 0;
  
  return {
    results: result[0]?.data || [],
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get individual participant result for an event
 */
const getParticipantResult = async (participantId, eventId) => {
  const matchStage = {
    participantId: new mongoose.Types.ObjectId(participantId)
  };
  
  if (eventId) {
    matchStage.eventId = new mongoose.Types.ObjectId(eventId);
  }

  const result = await Attempt.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$participantId',
        totalAttempts: { $sum: 1 },
        uniqueChallenges: { $addToSet: '$challengeId' },
        successfulExecutions: { $sum: { $cond: ['$success', 1, 0] } },
        failedExecutions: { $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] } },
        evaluatedAttempts: { $sum: { $cond: [{ $ne: ['$isCorrect', null] }, 1, 0] } },
        solved: { $sum: { $cond: [{ $eq: ['$isCorrect', true] }, 1, 0] } },
        score: { $sum: '$score' },
        totalExecutionTime: { $sum: '$executionTime' },
        firstActivity: { $min: '$createdAt' },
        lastActivity: { $max: '$createdAt' }
      }
    },
    {
      $lookup: {
        from: 'participants',
        localField: '_id',
        foreignField: '_id',
        as: 'participant'
      }
    },
    { $unwind: '$participant' },
    {
      $project: {
        _id: 1,
        name: '$participant.name',
        email: '$participant.email',
        status: '$participant.status',
        totalAttempts: 1,
        uniqueChallengesAttempted: { $size: '$uniqueChallenges' },
        successfulExecutions: 1,
        failedExecutions: 1,
        evaluatedAttempts: 1,
        solved: 1,
        score: 1,
        totalExecutionTime: 1,
        firstActivity: 1,
        lastActivity: 1
      }
    }
  ]);

  return result[0] || null;
};

/**
 * Get challenge-wise statistics for an event
 */
const getChallengeStatistics = async (eventId) => {
  const results = await Challenge.aggregate([
    { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
    {
      $lookup: {
        from: 'attempts',
        localField: '_id',
        foreignField: 'challengeId',
        as: 'attempts'
      }
    },
    {
      $project: {
        _id: 1,
        title: 1,
        score: 1,
        status: 1,
        attemptsCount: { $size: '$attempts' },
        uniqueParticipants: {
          $size: {
            $setUnion: [
              {
                $map: {
                  input: '$attempts',
                  as: 'a',
                  in: '$$a.participantId'
                }
              },
              []
            ]
          }
        },
        successfulExecutions: {
          $size: {
            $filter: {
              input: '$attempts',
              as: 'a',
              cond: { $eq: ['$$a.success', true] }
            }
          }
        },
        failedExecutions: {
          $size: {
            $filter: {
              input: '$attempts',
              as: 'a',
              cond: { $eq: ['$$a.success', false] }
            }
          }
        },
        evaluatedAttempts: {
          $size: {
            $filter: {
              input: '$attempts',
              as: 'a',
              cond: { $ne: ['$$a.isCorrect', null] }
            }
          }
        },
        solved: {
          $size: {
            $filter: {
              input: '$attempts',
              as: 'a',
              cond: { $eq: ['$$a.isCorrect', true] }
            }
          }
        },
        avgExecutionTime: {
          $avg: '$attempts.executionTime'
        },
        minExecutionTime: {
          $min: '$attempts.executionTime'
        },
        maxExecutionTime: {
          $max: '$attempts.executionTime'
        }
      }
    },
    {
      $addFields: {
        executionSuccessRate: {
          $cond: [
            { $gt: ['$attemptsCount', 0] },
            { $multiply: [{ $divide: ['$successfulExecutions', '$attemptsCount'] }, 100] },
            0
          ]
        },
        solveRate: {
          $cond: [
            { $gt: ['$evaluatedAttempts', 0] },
            { $multiply: [{ $divide: ['$solved', '$evaluatedAttempts'] }, 100] },
            0
          ]
        },
        evaluationAvailable: { $gt: ['$evaluatedAttempts', 0] }
      }
    },
    { $sort: { title: 1 } }
  ]);

  return results;
};

/**
 * Get leaderboard for an event
 */
const getLeaderboard = async (eventId) => {
  // Check if evaluation data even exists for this event
  const evaluationCheck = await Attempt.findOne({
    eventId: new mongoose.Types.ObjectId(eventId),
    isCorrect: { $ne: null }
  });

  if (!evaluationCheck) {
    return {
      available: false,
      message: 'Leaderboard unavailable — attempts are not internally evaluated.',
      leaderboard: []
    };
  }

  const results = await Attempt.aggregate([
    { $match: { eventId: new mongoose.Types.ObjectId(eventId), isCorrect: true } },
    {
      $group: {
        _id: '$participantId',
        solved: { $addToSet: '$challengeId' }, // unique challenges solved
        totalScore: { $sum: '$score' },
        lastSolvedAt: { $max: '$createdAt' }
      }
    },
    {
      $lookup: {
        from: 'participants',
        localField: '_id',
        foreignField: '_id',
        as: 'participant'
      }
    },
    { $unwind: '$participant' },
    {
      $project: {
        _id: 1,
        name: '$participant.name',
        email: '$participant.email',
        solvedCount: { $size: '$solved' },
        totalScore: 1,
        lastSolvedAt: 1
      }
    },
    { $sort: { totalScore: -1, lastSolvedAt: 1 } }
  ]);

  // Add rank
  const rankedResults = results.map((r, i) => ({
    rank: i + 1,
    ...r
  }));

  return {
    available: true,
    leaderboard: rankedResults
  };
};

/**
 * Export results for an event as CSV
 */
const exportResults = async (eventId) => {
  const matchStage = eventId ? { eventId: new mongoose.Types.ObjectId(eventId) } : {};
  
  const results = await Attempt.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$participantId',
        totalAttempts: { $sum: 1 },
        uniqueChallenges: { $addToSet: '$challengeId' },
        successfulExecutions: { $sum: { $cond: ['$success', 1, 0] } },
        failedExecutions: { $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] } },
        evaluatedAttempts: { $sum: { $cond: [{ $ne: ['$isCorrect', null] }, 1, 0] } },
        solved: { $sum: { $cond: [{ $eq: ['$isCorrect', true] }, 1, 0] } },
        score: { $sum: '$score' },
        firstActivity: { $min: '$createdAt' },
        lastActivity: { $max: '$createdAt' }
      }
    },
    {
      $lookup: {
        from: 'participants',
        localField: '_id',
        foreignField: '_id',
        as: 'participant'
      }
    },
    { $unwind: '$participant' },
    { $sort: { 'participant.name': 1 } }
  ]);

  let eventInfo = '';
  if (eventId) {
    const event = await Event.findById(eventId);
    if (event) {
      eventInfo = event.name;
    }
  }

  const csvRows = [];
  // CSV Header
  csvRows.push([
    'Participant',
    'Email',
    'Event',
    'Attempts',
    'Unique Challenges Attempted',
    'Successful Executions',
    'Failed Executions',
    'Evaluated Attempts',
    'Solved',
    'Score',
    'First Activity',
    'Last Activity'
  ].join(','));

  results.forEach(row => {
    const isEvaluated = row.evaluatedAttempts > 0;
    csvRows.push([
      `"${row.participant.name}"`,
      row.participant.email,
      `"${eventInfo}"`,
      row.totalAttempts,
      row.uniqueChallenges.length,
      row.successfulExecutions,
      row.failedExecutions,
      row.evaluatedAttempts,
      isEvaluated ? row.solved : 'NOT_EVALUATED',
      isEvaluated ? row.score : 'NOT_EVALUATED',
      row.firstActivity.toISOString(),
      row.lastActivity.toISOString()
    ].join(','));
  });

  return {
    filename: `blackbox-results-${eventInfo ? eventInfo.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'all'}.csv`,
    data: csvRows.join('\n')
  };
};

/**
 * Get recent attempts for an event (safe projection)
 */
const getRecentAttempts = async (eventId, limit = 50) => {
  const matchStage = eventId ? { eventId: new mongoose.Types.ObjectId(eventId) } : {};
  
  const results = await Attempt.aggregate([
    { $match: matchStage },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'participants',
        localField: 'participantId',
        foreignField: '_id',
        as: 'participant'
      }
    },
    { $unwind: '$participant' },
    {
      $lookup: {
        from: 'challenges',
        localField: 'challengeId',
        foreignField: '_id',
        as: 'challenge'
      }
    },
    { $unwind: { path: '$challenge', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        participantId: 1,
        eventId: 1,
        challengeId: 1,
        input: 1,
        output: 1,
        error: 1,
        executionTime: 1,
        success: 1,
        status: 1,
        createdAt: 1,
        score: 1,
        isCorrect: 1,
        'participant.name': 1,
        'participant.email': 1,
        'challenge.title': 1
      }
    }
  ]);
  
  return results;
};

module.exports = {
  getOverallStatistics,
  getEventStatistics,
  getParticipantResults,
  getParticipantResult,
  getChallengeStatistics,
  getLeaderboard,
  exportResults,
  getRecentAttempts
};
