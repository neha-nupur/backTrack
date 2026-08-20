const mongoose = require('mongoose');
const Participant = require('./src/models/Participant');
const Event = require('./src/models/Event');
const Challenge = require('./src/models/Challenge');
const Attempt = require('./src/models/Attempt');
const { EVENT_STATUS, CHALLENGE_STATUS } = require('./src/constants/status');
const ROLES = require('./src/constants/roles');
const executionService = require('./src/services/executionService');
const resultService = require('./src/services/resultService');
const db = require('./src/config/database');

const runTests = async () => {
  console.log('Connecting to DB...');
  await db.connectDB();
  
  let passed = 0;
  let failed = 0;
  const tests = [];
  const test = (name, fn) => tests.push({ name, fn });
  const assert = (condition, message) => {
    if (!condition) throw new Error(message || 'Assertion failed');
  };

  let participant1Id, participant2Id, eventId, challengeId;

  test('Setup test data', async () => {
    await Participant.deleteMany({});
    await Event.deleteMany({});
    await Challenge.deleteMany({});
    await Attempt.deleteMany({});

    const p1 = await Participant.create({
      name: 'P1',
      email: 'p1@college.edu',
      status: 'ACTIVE',
    });
    participant1Id = p1._id;

    const p2 = await Participant.create({
      name: 'P2',
      email: 'p2@college.edu',
      status: 'ACTIVE',
    });
    participant2Id = p2._id;

    const event = await Event.create({
      name: 'Phase 6 Event',
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date(Date.now() + 3600000),
      status: EVENT_STATUS.LIVE,
    });
    eventId = event._id.toString();

    const challenge = await Challenge.create({
      eventId: event._id,
      title: 'P6 Challenge',
      description: 'Test',
      hiddenCode: 'console.log(userInput.trim() + " output");',
      score: 100,
      status: CHALLENGE_STATUS.ENABLED,
    });
    challengeId = challenge._id.toString();
  });

  test('Execution creates an attempt (participant 1)', async () => {
    const res = await executionService.executeChallenge(participant1Id, eventId, challengeId, 'test1');
    assert(res.attempt !== undefined, 'Attempt should be in response');
    assert(res.attempt.output === 'test1 output', 'Output should be captured');
    assert(res.attempt.isCorrect === null, 'isCorrect should be null');
    assert(res.attempt.score === 0, 'Score should be 0');
  });

  test('Execution creates another attempt (participant 1)', async () => {
    const res = await executionService.executeChallenge(participant1Id, eventId, challengeId, 'test2');
    assert(res.attempt !== undefined, 'Attempt should be in response');
    assert(res.attempt.output === 'test2 output', 'Output should be captured');
  });

  test('Attempt history fetch', async () => {
    const res = await resultService.getParticipantAttempts(participant1Id, eventId);
    assert(res.attempts.length === 2, `Expected 2 attempts, got ${res.attempts.length}`);
    assert(res.attempts[0].input === 'test2', 'Attempts should be sorted by newest first');
    assert(res.attempts[0].hiddenCode === undefined, 'hiddenCode MUST NOT be leaked');
  });

  test('Result summary fetch', async () => {
    const res = await resultService.getParticipantEventResult(participant1Id, eventId);
    assert(res.summary.totalChallenges === 1, 'Total challenges should be 1');
    assert(res.summary.attemptedChallenges === 1, 'Attempted challenges should be 1');
    assert(res.summary.correctChallenges === 0, 'Correct challenges should be 0');
  });

  test('Participant isolation', async () => {
    const res = await resultService.getParticipantAttempts(participant2Id, eventId);
    assert(res.attempts.length === 0, 'Participant 2 should not see Participant 1s attempts');
    
    const resSummary = await resultService.getParticipantEventResult(participant2Id, eventId);
    assert(resSummary.summary.attemptedChallenges === 0, 'Participant 2 should have 0 attempted challenges');
  });

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   ATTEMPT & RESULTS TEST SUITE                      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
      console.log(`  ✓ PASS: ${name}`);
    } catch (err) {
      failed++;
      console.log(`  ✗ FAIL: ${name}`);
      console.log(`         ${err.message}`);
    }
  }

  console.log('\n──────────────────────────────────────────────────────');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${tests.length} total`);
  console.log('──────────────────────────────────────────────────────');

  await mongoose.disconnect();
  
  if (failed > 0) process.exit(1);
};

runTests();
