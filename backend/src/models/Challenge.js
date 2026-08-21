const mongoose = require('mongoose');
const { CHALLENGE_STATUS } = require('../constants/status');

const challengeSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Challenge title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Challenge description is required'],
      trim: true,
    },
    hiddenCode: {
      type: String,
      required: [true, 'Hidden JavaScript code logic is required'],
    },
    inputFormat: {
      type: String,
      default: '',
      trim: true,
    },
    outputFormat: {
      type: String,
      default: '',
      trim: true,
    },
    constraints: {
      type: String,
      default: '',
      trim: true,
    },
    hint: {
      type: String,
      default: '',
      trim: true,
    },
    score: {
      type: Number,
      required: [true, 'Challenge score is required'],
      default: 100,
      min: [1, 'Score must be a positive number'],
    },
    hackerRankUrl: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: [CHALLENGE_STATUS.ENABLED, CHALLENGE_STATUS.DISABLED],
      default: CHALLENGE_STATUS.ENABLED,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Compound indexes for query performance
challengeSchema.index({ eventId: 1, status: 1 });
challengeSchema.index({ eventId: 1, createdAt: -1 });

module.exports = mongoose.model('Challenge', challengeSchema);
