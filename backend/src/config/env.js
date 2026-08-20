const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const validateEnv = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '5000', 10);

  // Critical environment variables required for core system integrity
  const requiredVars = ['PORT', 'NODE_ENV'];
  const missingVars = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `[FATAL CONFIG ERROR] Missing essential environment variable(s): ${missingVars.join(', ')}. ` +
      `Please check your backend/.env configuration file.`
    );
  }

  // Warnings for future-phase/security variables if missing
  const securityVars = ['MONGODB_URI', 'JWT_SECRET', 'MASTER_PASSWORD_HASH', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'FRONTEND_URL'];
  const warnings = [];

  for (const varName of securityVars) {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  }

  if (warnings.length > 0 && nodeEnv !== 'test') {
    console.warn(
      `[CONFIG WARNING] The following security variables are missing or default: [${warnings.join(', ')}]. ` +
      `Ensure they are correctly configured in production.`
    );
  }

  return {
    PORT: port,
    NODE_ENV: nodeEnv,
    MONGODB_URI: process.env.MONGODB_URI || '',
    JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_key_placeholder',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
    MASTER_PASSWORD_HASH: process.env.MASTER_PASSWORD_HASH || '',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@college.edu',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@BlackBox2026',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  };
};

module.exports = validateEnv();
