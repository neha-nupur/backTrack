process.env.NODE_ENV = 'test';
process.env.MONGODB_TEST_URI = 'mongodb://127.0.0.1:27017/backtrack_test_db';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/backtrack_test_db';

const env = require('./src/config/env');
const mongoose = require('mongoose');
const { connectDB } = require('./src/config/database');
const Participant = require('./src/models/Participant');
const Event = require('./src/models/Event');
const Challenge = require('./src/models/Challenge');
const Attempt = require('./src/models/Attempt');
const eventService = require('./src/services/eventService');
const challengeService = require('./src/services/challengeService');
const executionService = require('./src/services/executionService');
const { EVENT_TYPE, EVENT_STATUS, CHALLENGE_STATUS } = require('./src/constants/status');

const CONCURRENT_USERS = 100;

async function runConcurrencyTest() {
  console.log('\n==================================================');
  console.log(`   backTrack CONCURRENCY SIMULATION (${CONCURRENT_USERS} USERS)   `);
  console.log('==================================================\n');

  try {
    await connectDB();

    // Clean test DB
    await Participant.deleteMany({});
    await Event.deleteMany({});
    await Challenge.deleteMany({});
    await Attempt.deleteMany({});

    // 1. Create a LIVE Contest Event
    const liveEvent = await eventService.createEvent({
      name: 'High Concurrency Load Event',
      type: EVENT_TYPE.CONTEST,
      description: 'Load test event',
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      status: EVENT_STATUS.LIVE,
      isActive: true,
    });

    // 2. Create Challenge
    const challenge = await challengeService.createChallenge(liveEvent.id, {
      title: 'Concurrency Challenge',
      description: 'Calculate sum of digits',
      hiddenCode: 'function solution(input) { return input.split("").reduce((a,b)=>a+Number(b),0); }\nconsole.log(solution(userInput));',
      constraints: '1 <= N <= 100',
      hint: 'Sum all digits.',
      score: 100,
      status: CHALLENGE_STATUS.ENABLED,
    });

    // 3. Provision 100 Participants
    console.log(`Provisioning ${CONCURRENT_USERS} test participants...`);
    const participantDocs = [];
    for (let i = 1; i <= CONCURRENT_USERS; i++) {
      participantDocs.push({
        name: `Participant ${i}`,
        email: `user${i}@backtrack.edu`,
        status: 'ACTIVE',
      });
    }
    const createdParticipants = await Participant.insertMany(participantDocs);
    console.log(`✓ ${createdParticipants.length} participants created.`);

    // 4. Launch 100 Concurrent Execution Requests
    console.log(`Launching ${CONCURRENT_USERS} parallel code execution requests...`);
    const startTime = Date.now();

    const executionPromises = createdParticipants.map((p, idx) => {
      const sampleInput = String(1000 + idx); // e.g. "1000", "1001"
      return executionService.executeChallenge(
        p._id,
        liveEvent.id,
        challenge.id,
        sampleInput
      ).catch(err => ({
        error: err.message,
        success: false,
      }));
    });

    const results = await Promise.all(executionPromises);
    const totalTimeMs = Date.now() - startTime;

    const successfulExecutions = results.filter(r => r.execution && r.execution.success).length;
    const failedExecutions = results.length - successfulExecutions;

    console.log('\n--------------------------------------------------');
    console.log(`Total Requests Sent : ${results.length}`);
    console.log(`Successful Execs   : ${successfulExecutions}`);
    console.log(`Failed Executions   : ${failedExecutions}`);
    console.log(`Total Batch Time    : ${totalTimeMs} ms`);
    console.log(`Average Latency     : ${(totalTimeMs / results.length).toFixed(2)} ms / req`);
    console.log('--------------------------------------------------\n');

    // 5. Verify Database Integrity
    const attemptCount = await Attempt.countDocuments({ eventId: liveEvent.id });
    console.log(`Recorded Attempts in DB : ${attemptCount}`);

    if (successfulExecutions === CONCURRENT_USERS && attemptCount === CONCURRENT_USERS) {
      console.log('\n🎉 CONCURRENCY TEST PASSED: All 100 concurrent requests processed cleanly!\n');
    } else {
      console.error(`\n⚠️ CONCURRENCY TEST WARNING: ${failedExecutions} requests failed.\n`);
    }

    // Cleanup
    await Participant.deleteMany({});
    await Event.deleteMany({});
    await Challenge.deleteMany({});
    await Attempt.deleteMany({});

  } catch (err) {
    console.error('Fatal concurrency test failure:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runConcurrencyTest();
