import http from 'k6/http';
import { check, fail } from 'k6';
import { SharedArray } from 'k6/data';
import { BASE_URL } from './config.js';

const tokenUsers = __ENV.TOKEN_FILE
  ? new SharedArray('participant tokens', () => JSON.parse(open(__ENV.TOKEN_FILE)))
  : [];

const credentialUsers = __ENV.CREDENTIALS_FILE
  ? new SharedArray('participant credentials', () => JSON.parse(open(__ENV.CREDENTIALS_FILE)))
  : [];

let cachedSession;

function userForVu(users) {
  if (users.length) return users[(__VU - 1) % users.length];
  return null;
}

function extractToken(record) {
  return typeof record === 'string' ? record : record && record.token;
}

export function participantSession() {
  if (cachedSession) return cachedSession;

  const directToken = __ENV.PARTICIPANT_TOKEN || extractToken(userForVu(tokenUsers));
  if (directToken) {
    cachedSession = { token: directToken };
    return cachedSession;
  }

  const credentials = userForVu(credentialUsers) || (
    __ENV.USER_EMAIL && __ENV.USER_PASSWORD
      ? { email: __ENV.USER_EMAIL, password: __ENV.USER_PASSWORD }
      : null
  );

  if (!credentials) {
    fail('Provide PARTICIPANT_TOKEN, TOKEN_FILE, or USER_EMAIL and USER_PASSWORD (or CREDENTIALS_FILE).');
  }

  const response = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: credentials.email, password: credentials.password }),
    { headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, tags: { endpoint: 'auth_login' } },
  );
  const valid = check(response, {
    'login returned 200': (res) => res.status === 200,
    'login returned participant token': (res) => {
      try { return Boolean(res.json('data.token')); } catch (_) { return false; }
    },
  });

  if (!valid) fail(`Participant login failed with status ${response.status}.`);
  cachedSession = { token: response.json('data.token') };
  return cachedSession;
}

export function participantHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}
