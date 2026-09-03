import { fail } from 'k6';

export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');
export const WRITE_ENABLED = (__ENV.WRITE_ENABLED || 'false').toLowerCase() === 'true';
export const EXECUTION_INPUT = __ENV.EXECUTION_INPUT || '';
export const EVENT_ID = __ENV.EVENT_ID || '';
export const EVENT_PASSWORD = __ENV.EVENT_PASSWORD || '';

const DEFAULT_STAGES = {
  smoke: [{ duration: '30s', target: 1 }, { duration: '30s', target: 0 }],
  baseline: [{ duration: '1m', target: 10 }, { duration: '3m', target: 10 }, { duration: '1m', target: 0 }],
  load: [
    { duration: '1m', target: 10 }, { duration: '2m', target: 10 },
    { duration: '1m', target: 50 }, { duration: '3m', target: 50 },
    { duration: '1m', target: 100 }, { duration: '3m', target: 100 },
    { duration: '2m', target: 250 }, { duration: '4m', target: 250 },
    { duration: '3m', target: 500 }, { duration: '5m', target: 500 },
    { duration: '5m', target: 1000 }, { duration: '5m', target: 1000 },
    { duration: '3m', target: 0 },
  ],
  stress: [{ duration: '2m', target: 100 }, { duration: '4m', target: 500 }, { duration: '4m', target: 1000 }, { duration: '3m', target: 0 }],
};

function parseStages(raw, fallback) {
  if (!raw) return fallback;

  const stages = raw.split(',').map((entry) => {
    const [target, duration] = entry.trim().split(':');
    const parsedTarget = Number(target);
    if (!Number.isInteger(parsedTarget) || parsedTarget < 0 || !duration) {
      fail('Invalid stage format. Use VUS:DURATION,VUS:DURATION, for example 10:1m,50:3m,0:1m.');
    }
    return { target: parsedTarget, duration };
  });

  return stages;
}

export function buildOptions(profile) {
  const profileKey = profile.toUpperCase();
  const thresholds = {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    checks: ['rate>0.99'],
    execution_duration: ['p(95)<6000'],
  };

  if (profile === 'spike') {
    const spikeVus = Number(__ENV.SPIKE_VUS || 500);
    const spikeDuration = __ENV.SPIKE_DURATION || '2m';
    return {
      thresholds,
      scenarios: {
        participant_spike: {
          executor: 'constant-vus',
          vus: spikeVus,
          duration: spikeDuration,
          gracefulStop: '30s',
        },
      },
    };
  }

  return {
    thresholds,
    stages: parseStages(__ENV[`${profileKey}_STAGES`], DEFAULT_STAGES[profile]),
  };
}

export function assertWriteConfiguration() {
  if (WRITE_ENABLED && !EXECUTION_INPUT.trim()) {
    fail('WRITE_ENABLED=true requires EXECUTION_INPUT for the dedicated test challenge.');
  }
}
