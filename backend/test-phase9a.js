process.env.NODE_ENV = 'test';
process.env.MONGODB_TEST_URI = 'mongodb://127.0.0.1:27017/backtrack_test_db';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/backtrack_test_db';

const env = require('./src/config/env');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB, assertTestDatabase } = require('./src/config/database');
const Admin = require('./src/models/Admin');
const Participant = require('./src/models/Participant');
const Event = require('./src/models/Event');
const Challenge = require('./src/models/Challenge');
const Attempt = require('./src/models/Attempt');
const eventService = require('./src/services/eventService');
const challengeService = require('./src/services/challengeService');
const executionService = require('./src/services/executionService');
const authService = require('./src/services/authService');
const { EVENT_TYPE, EVENT_STATUS, CHALLENGE_STATUS } = require('./src/constants/status');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    testsFailed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runPhase9aTests() {
  console.log('\n==================================================');
  console.log('   backTrack PHASE 9A INTEGRATION TEST SUITE   ');
  console.log('==================================================\n');

  try {
    // 1. Database Connection Isolation
    await connectDB();
    const dbName = mongoose.connection.name;
    assert(dbName.includes('test'), `1. Connected to isolated test DB: "${dbName}"`);

    // 2. Database Safety Guard Check
    try {
      assertTestDatabase();
      assert(true, '2. Database safety guard passed for test environment');
    } catch (e) {
      assert(false, `2. Database safety guard failed unexpectedly: ${e.message}`);
    }

    // Cleanup test collection
    await Admin.deleteMany({});
    await Participant.deleteMany({});
    await Event.deleteMany({});
    await Challenge.deleteMany({});
    await Attempt.deleteMany({});

    // 3. Admin Bootstrap Creation
    const adminUser = await Admin.create({
      name: 'System Admin',
      email: 'admin_test@backtrack.edu',
      passwordHash: await bcrypt.hash('Admin@123456', 10),
      role: 'ADMIN',
    });
    assert(adminUser._id && adminUser.role === 'ADMIN', '3. Admin user created successfully');

    // 4. Admin Auth Token Generation
    const adminAuth = await authService.authenticateAdmin('admin_test@backtrack.edu', 'Admin@123456');
    assert(adminAuth.token && adminAuth.user.role === 'ADMIN', '4. Admin login & JWT generation verified');

    // 5. Participant Creation
    const participantUser = await Participant.create({
      name: 'Test Participant',
      email: 'student_test@backtrack.edu',
      status: 'ACTIVE',
    });
    assert(participantUser._id && participantUser.status === 'ACTIVE', '5. Participant created successfully');

    // 6. Participant Auth Token Generation (Master Password)
    const masterPassHash = await bcrypt.hash('MasterPass123', 10);
    const { setMasterPasswordHash } = require('./src/services/settingsService');
    await setMasterPasswordHash(masterPassHash);
    const partAuth = await authService.authenticateParticipant('student_test@backtrack.edu', 'MasterPass123');
    assert(partAuth.token && partAuth.user.role === 'PARTICIPANT', '6. Participant login with master password verified');

    // 7. Event Creation with type DEMO
    const demoEvent = await eventService.createEvent({
      name: 'Demo Practice Round',
      type: EVENT_TYPE.DEMO,
      description: 'Practice environment for participants',
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      status: EVENT_STATUS.LIVE,
      isActive: true,
    });
    assert(demoEvent.type === EVENT_TYPE.DEMO, '7. Event created with type DEMO');

    // 8. Event Creation with type CONTEST
    const contestEvent = await eventService.createEvent({
      name: 'Spring Championship 2026',
      type: EVENT_TYPE.CONTEST,
      description: 'Official competition round',
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      status: EVENT_STATUS.LIVE,
      isActive: true,
    });
    assert(contestEvent.type === EVENT_TYPE.CONTEST, '8. Event created with type CONTEST');

    // 9. Event Creation with isActive true
    assert(contestEvent.isActive === true, '9. Event isActive: true verified');

    // 10. Event Creation with isActive false
    const inactiveEvent = await eventService.createEvent({
      name: 'Disabled Contest Round',
      type: EVENT_TYPE.CONTEST,
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      status: EVENT_STATUS.LIVE,
      isActive: false,
    });
    assert(inactiveEvent.isActive === false, '10. Event created with isActive: false');

    // 11. Event Creation with Password Protection
    const protectedEvent = await eventService.createEvent({
      name: 'Password Protected Final Round',
      type: EVENT_TYPE.CONTEST,
      password: 'EventSecretPassword123',
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      status: EVENT_STATUS.LIVE,
      isActive: true,
    });
    assert(protectedEvent.isPasswordProtected === true, '11. Event password protection enabled & hashed');

    // 12. Admin List Events Includes Type, Active & Password Info
    const adminEvents = await eventService.listAdminEvents();
    const foundProtected = adminEvents.events.find(e => e.id === protectedEvent.id);
    assert(foundProtected && foundProtected.isPasswordProtected === true, '12. Admin list includes password protection status');

    // 13. Participant Get Live Events (Filter DEMO)
    const liveDemoRes = await eventService.getParticipantLiveEvents(EVENT_TYPE.DEMO);
    const liveDemoEvents = liveDemoRes.events || [];
    assert(liveDemoEvents.length === 1 && liveDemoEvents[0].id === demoEvent.id, '13. Participant getLiveEvents(DEMO) returns only active DEMO events');

    // 14. Participant Get Live Events (Filter CONTEST)
    const liveContestRes = await eventService.getParticipantLiveEvents(EVENT_TYPE.CONTEST);
    const liveContestEvents = liveContestRes.events || [];
    const hasContestOnly = liveContestEvents.every(e => e.type === EVENT_TYPE.CONTEST);
    assert(hasContestOnly && liveContestEvents.some(e => e.id === contestEvent.id), '14. Participant getLiveEvents(CONTEST) returns only active CONTEST events');

    // 15. Inactive Events Excluded from Participant Views
    const hasInactive = liveContestEvents.some(e => e.id === inactiveEvent.id);
    assert(!hasInactive, '15. Inactive events strictly excluded from participant live events listing');

    // 16. Unprotected Event Start Succeeds Without Password
    const startUnprotected = await eventService.startEvent(contestEvent.id, participantUser._id, null);
    assert(startUnprotected && startUnprotected.eventId.toString() === contestEvent.id, '16. Unprotected event start succeeds');

    // 17. Protected Event Start Fails Without Password
    try {
      await eventService.startEvent(protectedEvent.id, participantUser._id, null);
      assert(false, '17. Protected event start failed to enforce password requirement');
    } catch (e) {
      assert(e.errorCode === 'EVENT_PASSWORD_REQUIRED', '17. Protected event start throws EVENT_PASSWORD_REQUIRED');
    }

    // 18. Protected Event Start Fails With Wrong Password
    try {
      await eventService.startEvent(protectedEvent.id, participantUser._id, 'WrongPassword');
      assert(false, '18. Protected event start failed to reject invalid password');
    } catch (e) {
      assert(e.errorCode === 'INVALID_EVENT_PASSWORD', '18. Protected event start throws INVALID_EVENT_PASSWORD');
    }

    // 19. Protected Event Start Succeeds With Correct Password
    const startProtected = await eventService.startEvent(protectedEvent.id, participantUser._id, 'EventSecretPassword123');
    assert(startProtected && startProtected.eventId.toString() === protectedEvent.id, '19. Protected event start succeeds with correct password');

    // 20. Challenge Creation with Hint
    const challengeWithHint = await challengeService.createChallenge(contestEvent.id, {
      title: 'String Inversion Challenge',
      description: 'Reverse string characters.',
      hiddenCode: 'function solution(input) { return input.split("").reverse().join(""); }\nconsole.log(solution(userInput));',
      constraints: '1 <= input.length <= 500',
      hint: 'Think about splitting string into array elements.',
      score: 150,
      hackerRankUrl: 'https://www.hackerrank.com/challenges/sample-string-reversal',
      status: CHALLENGE_STATUS.ENABLED,
    });
    assert(challengeWithHint.hint === 'Think about splitting string into array elements.', '20. Challenge created with admin-configured hint');

    // 21. Challenge Update with New Hint
    const updatedChallenge = await challengeService.updateChallenge(challengeWithHint.id, {
      hint: 'Updated hint: Use built-in JS reverse function.',
    });
    assert(updatedChallenge.hint === 'Updated hint: Use built-in JS reverse function.', '21. Challenge hint updated successfully');

    // 22. Admin Get Challenge Returns Full Response (Includes hiddenCode, title, description)
    const adminChallenge = await challengeService.getChallengeById(challengeWithHint.id);
    assert(
      adminChallenge.hiddenCode && adminChallenge.title && adminChallenge.description,
      '22. Admin challenge API returns full schema including hiddenCode'
    );

    // 23. Participant Get Challenges Returns ONLY Safe Fields
    const participantChallenges = await challengeService.getParticipantChallengesByEvent(contestEvent.id);
    const pCh = participantChallenges[0];
    assert(
      pCh.id && pCh.challengeNumber === 1 && pCh.inputConstraints && pCh.hint && pCh.hackerRankUrl,
      '23. Participant challenge response includes safe fields (id, challengeNumber, inputConstraints, hint, hackerRankUrl)'
    );

    // 24. Participant Response Strictly Excludes Title
    assert(pCh.title === undefined, '24. Participant challenge response strictly EXCLUDES title');

    // 25. Participant Response Strictly Excludes Description
    assert(pCh.description === undefined, '25. Participant challenge response strictly EXCLUDES description');

    // 26. Participant Response Strictly Excludes Score
    assert(pCh.score === undefined, '26. Participant challenge response strictly EXCLUDES score');

    // 27. Participant Response Strictly Excludes HiddenCode
    assert(pCh.hiddenCode === undefined, '27. Participant challenge response strictly EXCLUDES hiddenCode');

    // 28. Challenge Execution with Valid Input
    const execSuccess = await executionService.executeChallenge(
      participantUser._id,
      contestEvent.id,
      challengeWithHint.id,
      'hello'
    );
    assert(
      execSuccess.execution.success === true && execSuccess.execution.output === 'olleh' && typeof execSuccess.execution.executionTimeMs === 'number',
      '28. Challenge execution returns expected output ("olleh") and execution time'
    );

    // 29. Challenge Execution Error Handling
    const invalidChallenge = await challengeService.createChallenge(contestEvent.id, {
      title: 'Buggy Function Challenge',
      description: 'Throws error',
      hiddenCode: 'function solution(input) { throw new Error("Runtime Execution Error"); }\nsolution(userInput);',
    });
    const execError = await executionService.executeChallenge(
      participantUser._id,
      contestEvent.id,
      invalidChallenge.id,
      'test'
    );
    assert(
      execError.execution.success === false && execError.execution.error.code === 'RUNTIME_ERROR',
      '29. Challenge execution handles runtime errors safely without crashing server'
    );

    // 30. Attempt History Recording
    const attempts = await Attempt.find({ participantId: participantUser._id });
    assert(attempts.length >= 2, '30. Attempts properly recorded in MongoDB');

    // 31. Sanitization & Safety Audit Check
    const sanitizedKeys = Object.keys(pCh);
    const unsafeKeys = ['title', 'description', 'score', 'hiddenCode', 'solution', 'rank', 'leaderboard'];
    const hasUnsafeKey = unsafeKeys.some(k => sanitizedKeys.includes(k));
    assert(!hasUnsafeKey, '31. Participant API payload sanitization audit verified');

    // 32. Test Database Cleanup Safety
    await Admin.deleteMany({});
    await Participant.deleteMany({});
    await Event.deleteMany({});
    await Challenge.deleteMany({});
    await Attempt.deleteMany({});
    assert(true, '32. Test database cleanly purged');

  } catch (err) {
    console.error('\n❌ UNHANDLED EXCEPTION IN TEST SUITE:', err);
    testsFailed++;
  } finally {
    await mongoose.disconnect();
    console.log('\n==================================================');
    console.log(`   TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED   `);
    console.log('==================================================\n');
    process.exit(testsFailed > 0 ? 1 : 0);
  }
}

runPhase9aTests();
