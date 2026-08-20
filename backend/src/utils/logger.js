/**
 * Safe Application Logger
 * Logs system events without exposing secrets or sensitive data.
 */

const formatTimestamp = () => new Date().toISOString();

const sanitizeMessage = (msg) => {
  if (typeof msg !== 'string') return msg;
  // Redact potential passwords, connection URIs, tokens
  return msg
    .replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, 'mongodb://***:***@...[REDACTED]')
    .replace(/(password|jwt_secret|hash|token)\s*[:=]\s*['"]?[^'"\s]+['"]?/gi, '$1=[REDACTED]');
};

const logger = {
  info: (message, ...args) => {
    console.log(`[INFO] [${formatTimestamp()}] ${sanitizeMessage(message)}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] [${formatTimestamp()}] ${sanitizeMessage(message)}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`[ERROR] [${formatTimestamp()}] ${sanitizeMessage(message)}`, ...args);
  },
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] [${formatTimestamp()}] ${sanitizeMessage(message)}`, ...args);
    }
  },
};

module.exports = logger;
