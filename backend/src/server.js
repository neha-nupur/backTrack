const env = require('./config/env');
const { connectDB } = require('./config/database');
const bootstrapAdmin = require('./services/adminBootstrap');
const { migrateEnvMasterPassword } = require('./services/settingsService');
const logger = require('./utils/logger');
const app = require('./app');

const startServer = async () => {
  logger.info(`Starting backTrack Backend in [${env.NODE_ENV}] mode...`);

  // Attempt database connection
  const dbConnected = await connectDB();

  if (dbConnected) {
    // Run idempotent admin bootstrapper
    await bootstrapAdmin();
    // One-time migration: seed DB master password hash from env if not yet set
    await migrateEnvMasterPassword();
  }

  const PORT = env.PORT || 5000;
  const server = app.listen(PORT, () => {
    logger.info(`backTrack API Server successfully running on port ${PORT}`);
    logger.info(`Health check available at http://localhost:${PORT}/api/health`);
  });

  // Handle unhandled promise rejections gracefully
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection:', err.message);
    if (env.NODE_ENV === 'development') {
      console.error(err);
    }
  });

  // Handle SIGTERM / SIGINT for graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  });
};

startServer();
