const mongoose = require('mongoose');

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
      default: '',
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

module.exports = mongoose.model('Attempt', attemptSchema);
