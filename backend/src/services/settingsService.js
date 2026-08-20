const bcrypt = require('bcryptjs');
const SystemSetting = require('../models/SystemSetting');
const env = require('../config/env');
const logger = require('../utils/logger');
const AppError = require('../utils/appError');

const MASTER_PASSWORD_KEY = 'masterPasswordHash';
const MIN_PASSWORD_LENGTH = 8;

/**
 * Retrieve the current master password hash from DB.
 * Falls back to env var if no DB record exists (supports Phase 1 migration).
 */
const getMasterPasswordHash = async () => {
  const setting = await SystemSetting.findOne({ key: MASTER_PASSWORD_KEY });
  if (setting && setting.value) {
    return setting.value;
  }
  // Fallback to environment variable (Phase 1 backward compatibility)
  return env.MASTER_PASSWORD_HASH || null;
};

/**
 * Persist a new master password hash to the database.
 */
const setMasterPasswordHash = async (newHash) => {
  await SystemSetting.findOneAndUpdate(
    { key: MASTER_PASSWORD_KEY },
    { key: MASTER_PASSWORD_KEY, value: newHash },
    { upsert: true, new: true }
  );
};

/**
 * One-time migration: seed the DB setting from env if DB has no record.
 * Called once on server startup after DB connection.
 */
const migrateEnvMasterPassword = async () => {
  const existing = await SystemSetting.findOne({ key: MASTER_PASSWORD_KEY });
  if (existing) {
    logger.info('Master password hash already in database — migration not required.');
    return;
  }

  if (env.MASTER_PASSWORD_HASH) {
    await SystemSetting.create({
      key: MASTER_PASSWORD_KEY,
      value: env.MASTER_PASSWORD_HASH,
    });
    logger.info('Master password hash migrated from environment to database.');
  } else {
    logger.warn('No MASTER_PASSWORD_HASH found in environment — participant login will fail until master password is set.');
  }
};

/**
 * Admin-initiated master password change.
 * 1. Verifies current master password.
 * 2. Validates new password requirements.
 * 3. Hashes and persists new password.
 */
const updateMasterPassword = async (currentPassword, newPassword) => {
  if (!currentPassword || typeof currentPassword !== 'string') {
    throw new AppError('Current master password is required.', 400, 'MISSING_CURRENT_PASSWORD');
  }

  if (!newPassword || typeof newPassword !== 'string') {
    throw new AppError('New master password is required.', 400, 'MISSING_NEW_PASSWORD');
  }

  if (newPassword.trim().length < MIN_PASSWORD_LENGTH) {
    throw new AppError(
      `New master password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      400,
      'PASSWORD_TOO_SHORT'
    );
  }

  const currentHash = await getMasterPasswordHash();
  if (!currentHash) {
    throw new AppError('No master password is currently configured.', 500, 'MASTER_PASSWORD_NOT_SET');
  }

  const isCurrentCorrect = await bcrypt.compare(currentPassword, currentHash);
  if (!isCurrentCorrect) {
    throw new AppError('Current master password is incorrect.', 401, 'INVALID_CURRENT_PASSWORD');
  }

  const saltRounds = 10;
  const newHash = await bcrypt.hash(newPassword.trim(), saltRounds);
  await setMasterPasswordHash(newHash);

  logger.info('Master password updated successfully by admin.');
};

module.exports = {
  getMasterPasswordHash,
  setMasterPasswordHash,
  migrateEnvMasterPassword,
  updateMasterPassword,
};
