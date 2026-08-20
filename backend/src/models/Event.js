const mongoose = require('mongoose');
const { EVENT_STATUS } = require('../constants/status');

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
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
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

module.exports = mongoose.model('Event', eventSchema);
