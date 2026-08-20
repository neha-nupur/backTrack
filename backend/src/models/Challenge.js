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
    challengeNumber: {
      type: Number,
      required: [true, 'Challenge number is required'],
    },
    internalName: {
      type: String,
      default: '',
      trim: true,
    },
    hiddenCode: {
      type: String,
      required: [true, 'Hidden JavaScript code logic is required'],
    },
    inputConstraints: {
      type: String,
      default: '',
      trim: true,
    },
    hackerRankUrl: {
      type: String,
      required: [true, 'HackerRank URL is required'],
      trim: true,
    },
    score: {
      type: Number,
      default: 100,
      min: [0, 'Score must be non-negative'],
    },
    status: {
      type: String,
      enum: [CHALLENGE_STATUS.ACTIVE, CHALLENGE_STATUS.INACTIVE],
      default: CHALLENGE_STATUS.ACTIVE,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Helper method to sanitize challenge payload for participant endpoint
challengeSchema.methods.toParticipantJSON = function () {
  return {
    id: this._id,
    challengeNumber: this.challengeNumber,
    inputConstraints: this.inputConstraints,
    hackerRankUrl: this.hackerRankUrl,
  };
};

module.exports = mongoose.model('Challenge', challengeSchema);
