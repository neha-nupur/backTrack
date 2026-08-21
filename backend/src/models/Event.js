const mongoose = require('mongoose');
const { EVENT_STATUS, EVENT_TYPE } = require('../constants/status');

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: [EVENT_TYPE.DEMO, EVENT_TYPE.CONTEST],
      default: EVENT_TYPE.CONTEST,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Scheduled start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'Scheduled end time is required'],
    },
    status: {
      type: String,
      enum: [EVENT_STATUS.UPCOMING, EVENT_STATUS.LIVE, EVENT_STATUS.COMPLETED],
      default: EVENT_STATUS.UPCOMING,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    passwordHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Compound and single field indexes for query performance
eventSchema.index({ status: 1, type: 1, isActive: 1, startTime: 1, endTime: 1 });
eventSchema.index({ name: 1 });

module.exports = mongoose.model('Event', eventSchema);
