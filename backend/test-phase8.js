const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const { connectDB } = require('./src/config/database');
const app = require('./src/app');
const { generateToken } = require('./src/services/authService');
const Admin = require('./src/models/Admin');
const Participant = require('./src/models/Participant');
const Event = require('./src/models/Event');
const Challenge = require('./src/models/Challenge');
const Attempt = require('./src/models/Attempt');

describe('Phase 8: Results & Statistics module tests', () => {
  let adminToken;
  let participantToken;
  let adminId;
  let participantId;
  let eventId;
  let challengeId;
  
  before(async () => {
    // Setup test data
    await connectDB();
    
    // Create Admin
    const admin = await Admin.create({
      name: 'Admin User',
      email: 'admin@test.com',
      passwordHash: 'password123',
      role: 'ADMIN'
    });
    adminId = admin._id;
    adminToken = generateToken(adminId, 'ADMIN');

    // Create Participant
    const participant = await Participant.create({
      name: 'Test Participant',
      email: 'participant@test.com',
      status: 'ACTIVE'
    });
    participantId = participant._id;
    participantToken = generateToken(participantId, 'PARTICIPANT');

    // Create Event
    const event = await Event.create({
      name: 'Test Event',
      description: 'Event for Phase 8 testing',
      startTime: new Date(Date.now() - 3600000), // Started 1 hour ago
      endTime: new Date(Date.now() + 3600000), // Ends in 1 hour
      status: 'LIVE'
    });
    eventId = event._id;

    // Create Challenge
    const challenge = await Challenge.create({
      eventId: eventId,
      title: 'Test Challenge',
      description: 'Challenge for Phase 8 testing',
      hiddenCode: 'return true;',
      score: 100,
      enabled: true
    });
    challengeId = challenge._id;

    // Create Attempts
    await Attempt.create([
      {
        participantId: participantId,
        eventId: eventId,
        challengeId: challengeId,
        code: 'console.log("Success");',
        language: 'javascript',
        success: true,
        output: 'Success',
        isCorrect: true,
        score: 100
      },
      {
        participantId: participantId,
        eventId: eventId,
        challengeId: challengeId,
        code: 'console.log("Failed");',
        language: 'javascript',
        success: true,
        output: 'Failed',
        isCorrect: false,
        score: 0
      }
    ]);
  });

  after(async () => {
    await Admin.deleteMany({});
    await Participant.deleteMany({});
    await Event.deleteMany({});
    await Challenge.deleteMany({});
    await Attempt.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/admin/results/overview', () => {
    it('should return overall statistics for ADMIN', async () => {
      const res = await request(app)
        .get('/api/admin/results/overview')
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('participants');
      expect(res.body.data).to.have.property('events');
      expect(res.body.data).to.have.property('challenges');
      expect(res.body.data).to.have.property('attempts');
    });

    it('should block access for PARTICIPANT', async () => {
      const res = await request(app)
        .get('/api/admin/results/overview')
        .set('Authorization', `Bearer ${participantToken}`);
        
      expect(res.status).to.equal(403);
    });
  });

  describe('GET /api/admin/results/events/:eventId', () => {
    it('should return statistics for a specific event', async () => {
      const res = await request(app)
        .get(`/api/admin/results/events/${eventId}`)
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('event');
      expect(res.body.data).to.have.property('event');
      expect(res.body.data).to.have.property('challengeCount');
      expect(res.body.data).to.have.property('execution');
    });

    it('should return 400 for invalid eventId', async () => {
      const res = await request(app)
        .get('/api/admin/results/events/invalid_id')
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.status).to.equal(400);
    });
  });

  describe('GET /api/admin/results/participants', () => {
    it('should return paginated participant results', async () => {
      const res = await request(app)
        .get('/api/admin/results/participants')
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('results');
      expect(res.body.data).to.have.property('pagination');
      expect(Array.isArray(res.body.data.results)).to.be.true;
    });
    
    it('should support eventId filtering', async () => {
      const res = await request(app)
        .get(`/api/admin/results/participants?eventId=${eventId}`)
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
    });
  });

  describe('GET /api/admin/results/participants/:participantId', () => {
    it('should return specific participant results', async () => {
      const res = await request(app)
        .get(`/api/admin/results/participants/${participantId}`)
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('name');
      expect(res.body.data).to.have.property('totalAttempts');
    });
  });

  describe('GET /api/admin/results/challenges/:eventId', () => {
    it('should return challenge statistics for an event', async () => {
      const res = await request(app)
        .get(`/api/admin/results/challenges/${eventId}`)
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(Array.isArray(res.body.data)).to.be.true;
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).to.have.property('attemptsCount');
      }
    });
  });

  describe('GET /api/admin/results/leaderboard/:eventId', () => {
    it('should return leaderboard for an event', async () => {
      const res = await request(app)
        .get(`/api/admin/results/leaderboard/${eventId}`)
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('available');
      if (res.body.data.available) {
        expect(Array.isArray(res.body.data.leaderboard)).to.be.true;
      }
    });
  });

  describe('GET /api/admin/results/export/:eventId?', () => {
    it('should return CSV data for all results', async () => {
      const res = await request(app)
        .get('/api/admin/results/export')
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.match(/text\/csv/);
      expect(res.headers['content-disposition']).to.match(/attachment/);
    });
    
    it('should return CSV data for specific event', async () => {
      const res = await request(app)
        .get(`/api/admin/results/export/${eventId}`)
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.match(/text\/csv/);
      expect(res.headers['content-disposition']).to.match(/attachment/);
    });
  });
});
