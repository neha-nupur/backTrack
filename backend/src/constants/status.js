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
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
});

module.exports = {
  EVENT_STATUS,
  PARTICIPANT_STATUS,
  CHALLENGE_STATUS,
};
