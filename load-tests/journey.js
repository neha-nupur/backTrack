import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { participantHeaders, participantSession } from './auth.js';
import { BASE_URL, EVENT_ID, EVENT_PASSWORD, EXECUTION_INPUT, WRITE_ENABLED } from './config.js';

export const executionDuration = new Trend('execution_duration', true);

function successBody(res) {
  try { return res.json(); } catch (_) { return null; }
}

function isSuccessful(res) {
  const body = successBody(res);
  return res.status >= 200 && res.status < 300 && body && body.success === true;
}

function requestCheck(res, label) {
  return check(res, {
    [`${label}: successful status`]: (response) => response.status >= 200 && response.status < 300,
    [`${label}: success response`]: isSuccessful,
  });
}

function chooseEvent(liveResponse) {
  const body = successBody(liveResponse);
  const events = body && body.data && body.data.events;
  if (!Array.isArray(events)) return null;
  return events.find((event) => String(event.id || event._id) === EVENT_ID) || events[0] || null;
}

export default function participantJourney() {
  const { token } = participantSession();
  const headers = participantHeaders(token);

  const sessionResponse = http.get(`${BASE_URL}/auth/me`, { headers, tags: { endpoint: 'auth_me' } });
  if (!requestCheck(sessionResponse, 'session verification')) return;

  // The participant dashboard fetches these independently when it opens.
  const dashboardResponses = http.batch([
    ['GET', `${BASE_URL}/events/live`, null, { headers, tags: { endpoint: 'events_live' } }],
    ['GET', `${BASE_URL}/events/upcoming`, null, { headers, tags: { endpoint: 'events_upcoming' } }],
  ]);
  const liveResponse = dashboardResponses[0];
  requestCheck(liveResponse, 'live events');
  requestCheck(dashboardResponses[1], 'upcoming events');

  const event = chooseEvent(liveResponse);
  const eventId = event && (event.id || event._id);
  check(event, { 'a configured or discoverable LIVE event exists': (value) => Boolean(value && eventId) });
  if (!eventId) return;

  const startPayload = EVENT_PASSWORD ? { password: EVENT_PASSWORD } : {};
  const startResponse = http.post(
    `${BASE_URL}/events/${eventId}/start`,
    JSON.stringify(startPayload),
    { headers, tags: { endpoint: 'event_start' } },
  );
  if (!requestCheck(startResponse, 'event start')) return;

  const challengesResponse = http.get(
    `${BASE_URL}/events/${eventId}/challenges`,
    { headers, tags: { endpoint: 'participant_challenges' } },
  );
  if (!requestCheck(challengesResponse, 'challenge list')) return;

  const challengeBody = successBody(challengesResponse);
  const challenges = challengeBody && challengeBody.data && challengeBody.data.challenges;
  const challenge = Array.isArray(challenges) ? challenges[0] : null;
  const challengeId = challenge && (challenge.id || challenge._id);
  check(challenge, { 'an enabled test challenge exists': (value) => Boolean(value && challengeId) });
  if (!challengeId) return;

  const attemptsResponse = http.get(
    `${BASE_URL}/events/${eventId}/attempts?challengeId=${challengeId}&limit=30`,
    { headers, tags: { endpoint: 'participant_attempts' } },
  );
  requestCheck(attemptsResponse, 'attempt history');

  // Writes are opt-in because every execution creates an Attempt document.
  const executionEvery = Math.max(1, Number(__ENV.EXECUTION_EVERY_N || 4));
  if (WRITE_ENABLED && ((__ITER + __VU) % executionEvery === 0)) {
    const executionResponse = http.post(
      `${BASE_URL}/events/${eventId}/challenges/${challengeId}/execute`,
      JSON.stringify({ userInput: EXECUTION_INPUT }),
      { headers, tags: { endpoint: 'challenge_execute' }, timeout: __ENV.EXECUTION_HTTP_TIMEOUT || '10s' },
    );
    executionDuration.add(executionResponse.timings.duration);
    requestCheck(executionResponse, 'challenge execution');
  }

  const resultResponse = http.get(
    `${BASE_URL}/events/${eventId}/results`,
    { headers, tags: { endpoint: 'event_results' } },
  );
  requestCheck(resultResponse, 'event results');
  sleep(Number(__ENV.THINK_TIME_SECONDS || 1));
}
