/**
 * Entity Status Constants
 */

const EVENT_STATUS = Object.freeze({
  UPCOMING: 'UPCOMING',
  LIVE: 'LIVE',
  COMPLETED: 'COMPLETED',
});

const EVENT_TYPE = Object.freeze({
  DEMO: 'DEMO',
  CONTEST: 'CONTEST',
});

const PARTICIPANT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
});

const CHALLENGE_STATUS = Object.freeze({
  ENABLED: 'ENABLED',
  DISABLED: 'DISABLED',
  // Backward-compatible aliases
  ACTIVE: 'ENABLED',
  INACTIVE: 'DISABLED',
});

/**
 * Attempt status — reflects how a code execution attempt resolved.
 * Persisted on the Attempt model and consumed by the admin monitoring
 * dashboard/attempts table. Only three values are surfaced to admins:
 * a successful run, a timeout, or any other execution error. All the
 * more granular executor error codes (RUNTIME_ERROR, SYNTAX_ERROR,
 * MEMORY_LIMIT_EXCEEDED, WORKER_CRASH, etc. — see codeExecutor/errors.js)
 * collapse into EXECUTION_ERROR here; the specific code/message is still
 * preserved in the Attempt's `error` field for the detail view.
 */
const ATTEMPT_STATUS = Object.freeze({
  SUCCESS: 'SUCCESS',
  EXECUTION_ERROR: 'EXECUTION_ERROR',
  EXECUTION_TIMEOUT: 'EXECUTION_TIMEOUT',
});

module.exports = {
  EVENT_STATUS,
  EVENT_TYPE,
  PARTICIPANT_STATUS,
  CHALLENGE_STATUS,
  ATTEMPT_STATUS,
};
