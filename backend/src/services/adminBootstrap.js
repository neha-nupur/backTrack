const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const env = require('../config/env');
const logger = require('../utils/logger');
const ROLES = require('../constants/roles');

/**
 * Idempotent Admin Bootstrapper
 * Ensures the initial Admin user exists without creating duplicates on restart.
 */
const bootstrapAdmin = async () => {
  try {
    const adminEmail = (env.ADMIN_EMAIL || 'admin@college.edu').toLowerCase().trim();
    const existingAdmin = await Admin.findOne({ email: adminEmail });

    if (existingAdmin) {
      logger.info(`Admin bootstrap skipped: Primary admin [${adminEmail}] already exists.`);
      return existingAdmin;
    }

    const plainPassword = env.ADMIN_PASSWORD || 'Admin@BlackBox2026';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

    const initialAdmin = await Admin.create({
      name: 'Primary Administrator',
      email: adminEmail,
      passwordHash,
      role: ROLES.ADMIN,
    });

    logger.info(`[BOOTSTRAP SUCCESS] Primary administrator account created for: ${adminEmail}`);
    return initialAdmin;
  } catch (error) {
    logger.error('Admin bootstrap failed:', error.message);
    return null;
  }
};

module.exports = bootstrapAdmin;
