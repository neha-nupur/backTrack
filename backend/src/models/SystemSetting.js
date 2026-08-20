const mongoose = require('mongoose');

/**
 * SystemSetting — Minimal key/value store for runtime-configurable system settings.
 * Currently used exclusively for masterPasswordHash.
 * Intentionally kept minimal — not a general-purpose config store.
 */
const systemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
