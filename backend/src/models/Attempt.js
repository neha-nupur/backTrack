const mongoose = require('mongoose');
const { ATTEMPT_STATUS } = require('../constants/status');

const attemptSchema = new mongoose.Schema(
  {
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: [true, 'Participant reference is required'],
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required'],
      index: true,
    },
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: [true, 'Challenge reference is required'],
      index: true,
    },
    input: {
      type: String,
    },
    output: {
      type: String,
      default: '',
    },
    executionTime: {
      type: Number,
      default: 0,
    },
    success: {
      type: Boolean,
      default: true,
    },
    // High-level outcome of this attempt, for admin monitoring/filtering.
    // Derived at write time in executionService.js from `success` plus the
    // executor's error code (see codeExecutor/errors.js). Kept alongside
    // `success`/`executionTime` rather than replacing them, since
    // resultService.js (participant-facing results) already depends on
    // those two fields as-is.
    status: {
      type: String,
      enum: Object.values(ATTEMPT_STATUS),
      required: [true, 'Attempt status is required'],
      index: true,
    },
    // Safe, human-readable error message (never hiddenCode, stack traces,
    // or file paths — see codeExecutor/errors.js) for admin display when
    // status !== SUCCESS. Null on successful attempts.
    error: {
      type: String,
      default: null,
    },
    isCorrect: {
      type: Boolean,
      default: null, // Null indicates correctness is not evaluated on this platform
    },
    score: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Compound indexes for efficient querying
attemptSchema.index({ participantId: 1, eventId: 1, createdAt: -1 });
attemptSchema.index({ participantId: 1, challengeId: 1, createdAt: -1 });
attemptSchema.index({ eventId: 1, challengeId: 1 });
attemptSchema.index({ eventId: 1, status: 1 });

module.exports = mongoose.model('Attempt', attemptSchema);
