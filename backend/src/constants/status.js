/**
 * Entity Status Constants
 */

const EVENT_STATUS = Object.freeze({
  UPCOMING: 'UPCOMING',
  LIVE: 'LIVE',
  COMPLETED: 'COMPLETED',
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

module.exports = {
  EVENT_STATUS,
  PARTICIPANT_STATUS,
  CHALLENGE_STATUS,
};
