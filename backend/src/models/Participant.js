const mongoose = require('mongoose');
const { PARTICIPANT_STATUS } = require('../constants/status');

const participantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Participant name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'College email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [PARTICIPANT_STATUS.ACTIVE, PARTICIPANT_STATUS.DISABLED],
      default: PARTICIPANT_STATUS.ACTIVE,
    },
    passwordHash: {
      type: String,
      required: false, // Optional because they can fall back to master password
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Prevent exposing passwordHash in JSON serialization
participantSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('Participant', participantSchema);
