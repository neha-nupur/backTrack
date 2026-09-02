'use strict';

const { ExperimentalPersistentWorkerPool } = require('./src/services/codeExecutor/experimentalPersistentWorker');

const USERS = Number(process.env.CONCURRENT_USERS || 25);
const WORKERS = Number(process.env.EXPERIMENTAL_WORKERS || 2);
const TIMEOUT_MS = Number(process.env.EXPERIMENTAL_TIMEOUT_MS || 1000);
const challengeId = 'experimental-sum-two-numbers';
const hiddenCode = `
  function solution(input) {
    const values = String(input).split(',').map(Number);
    return values[0] + values[1];
  }
  console.log(solution(userInput));
`;

const percentile = (values, percentage) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * percentage))];
};

(async () => {
  const pool = new ExperimentalPersistentWorkerPool({ size: WORKERS, timeoutMs: TIMEOUT_MS });
  const start = Date.now();

  try {
    await pool.start();
    const compileStart = Date.now();
    await pool.loadChallenge(challengeId, hiddenCode);
    const compileMs = Date.now() - compileStart;

    const durations = [];
    const results = await Promise.all(Array.from({ length: USERS }, async (_, index) => {
      const requestStart = Date.now();
      const result = await pool.execute(challengeId, `${index},${index + 1}`);
      durations.push(Date.now() - requestStart);
      return result;
    }));

    const failures = results.filter(result => !result.success);
    const invalidOutputs = results.filter((result, index) => result.output !== String(index * 2 + 1));
    const totalMs = Date.now() - start;

    console.log(JSON.stringify({
      users: USERS,
      workers: WORKERS,
      compileMs,
      totalMs,
      p50Ms: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
      maxMs: Math.max(...durations),
      successes: results.length - failures.length,
      failures: failures.length,
      invalidOutputs: invalidOutputs.length,
    }, null, 2));

    if (failures.length || invalidOutputs.length) process.exitCode = 1;
  } finally {
    await pool.close();
  }
})();
