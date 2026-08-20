const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/app');
const { generateToken } = require('../src/utils/jwtUtils');
const Participant = require('../src/models/Participant');
const Event = require('../src/models/Event');
const Challenge = require('../src/models/Challenge');
const Attempt = require('../src/models/Attempt');
const { EVENT_STATUS, CHALLENGE_STATUS } = require('../src/constants/status');
const ROLES = require('../src/constants/roles');

describe('Phase 6: Attempt Persistence and Results', () => {
  let adminToken;
  let participant1Token;
  let participant2Token;
  let participant1Id;
  let participant2Id;
  let eventId;
  let challengeId;

  beforeAll(async () => {
    await Participant.deleteMany({});
    await Event.deleteMany({});
    await Challenge.deleteMany({});
    await Attempt.deleteMany({});

    // Create Participants
    const p1 = await Participant.create({
      name: 'P1',
      email: 'p1@college.edu',
      status: 'ACTIVE',
    });
    participant1Id = p1._id;
    participant1Token = generateToken({ id: p1._id, role: ROLES.PARTICIPANT });

    const p2 = await Participant.create({
      name: 'P2',
      email: 'p2@college.edu',
      status: 'ACTIVE',
    });
    participant2Id = p2._id;
    participant2Token = generateToken({ id: p2._id, role: ROLES.PARTICIPANT });

    // Create Event
    const event = await Event.create({
      name: 'Phase 6 Event',
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(Date.now() + 3600000), // 1 hour from now
      status: EVENT_STATUS.LIVE,
    });
    eventId = event._id;

    // Create Challenge
    const challenge = await Challenge.create({
      eventId: event._id,
      title: 'P6 Challenge',
      description: 'Test',
      hiddenCode: 'console.log(userInput.trim() + " output");',
      score: 100,
      status: CHALLENGE_STATUS.ENABLED,
    });
    challengeId = challenge._id;
  });

  afterAll(async () => {
    await Participant.deleteMany({});
    await Event.deleteMany({});
    await Challenge.deleteMany({});
    await Attempt.deleteMany({});
  });

  it('1. Participant 1 executes challenge and creates an attempt', async () => {
    const res = await request(app)
      .post(`/api/events/${eventId}/challenges/${challengeId}/execute`)
      .set('Authorization', `Bearer ${participant1Token}`)
      .send({ userInput: 'test' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attempt).toBeDefined();
    expect(res.body.data.attempt.output).toBe('test output');
    expect(res.body.data.attempt.isCorrect).toBeNull(); // Due to PDF gap
    expect(res.body.data.attempt.score).toBe(0); // Due to PDF gap
    
    // Verify DB
    const attemptInDb = await Attempt.findById(res.body.data.attempt.id);
    expect(attemptInDb).toBeDefined();
    expect(attemptInDb.participantId.toString()).toBe(participant1Id.toString());
    expect(attemptInDb.output).toBe('test output');
    expect(attemptInDb.hiddenCode).toBeUndefined(); // Critical security check
  });

  it('2. Participant 1 fetches their own attempt history', async () => {
    const res = await request(app)
      .get(`/api/events/${eventId}/attempts`)
      .set('Authorization', `Bearer ${participant1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attempts.length).toBe(1);
    expect(res.body.data.attempts[0].output).toBe('test output');
    expect(res.body.data.attempts[0].hiddenCode).toBeUndefined();
  });

  it('3. Participant 2 cannot see Participant 1s attempts', async () => {
    const res = await request(app)
      .get(`/api/events/${eventId}/attempts`)
      .set('Authorization', `Bearer ${participant2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attempts.length).toBe(0);
  });

  it('4. Participant 1 fetches their result summary', async () => {
    const res = await request(app)
      .get(`/api/events/${eventId}/results`)
      .set('Authorization', `Bearer ${participant1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.totalChallenges).toBe(1);
    expect(res.body.data.summary.attemptedChallenges).toBe(1);
  });

  it('5. Participant 2 fetches their result summary (empty)', async () => {
    const res = await request(app)
      .get(`/api/events/${eventId}/results`)
      .set('Authorization', `Bearer ${participant2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.totalChallenges).toBe(1);
    expect(res.body.data.summary.attemptedChallenges).toBe(0);
  });

  it('6. Multiple attempts are supported', async () => {
    const res1 = await request(app)
      .post(`/api/events/${eventId}/challenges/${challengeId}/execute`)
      .set('Authorization', `Bearer ${participant1Token}`)
      .send({ userInput: 'test2' });
      
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .get(`/api/events/${eventId}/attempts`)
      .set('Authorization', `Bearer ${participant1Token}`);

    expect(res2.status).toBe(200);
    expect(res2.body.data.attempts.length).toBe(2);
    // Ordered by createdAt descending
    expect(res2.body.data.attempts[0].input).toBe('test2');
    expect(res2.body.data.attempts[1].input).toBe('test');
  });

  it('7. Unauthenticated user cannot access attempts', async () => {
    const res = await request(app).get(`/api/events/${eventId}/attempts`);
    expect(res.status).toBe(401);
  });

});
