require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

// Generate Tokens
const adminId = new mongoose.Types.ObjectId();
const adminToken = jwt.sign({ sub: adminId.toString(), role: 'ADMIN' }, JWT_SECRET);
const participantId = new mongoose.Types.ObjectId();
const participantToken = jwt.sign({ sub: participantId.toString(), role: 'PARTICIPANT' }, JWT_SECRET);


async function request(endpoint, token = null) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  
  const res = await fetch(`${API_URL}${endpoint}`, { headers });
  const data = await res.json().catch(() => null);
  
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function runTests() {
  console.log('--- STARTING ADMIN RESULTS & STATISTICS TESTS ---\n');
  let passed = 0, failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. RBAC Tests
    try {
      await request('/admin/results/overview');
      assert(false, 'Unauthenticated user should not access overview');
    } catch (e) {
      assert(e.status === 401, 'Unauthenticated user gets 401');
    }

    try {
      await request('/admin/results/overview', participantToken);
      assert(false, 'Participant should not access overview');
    } catch (e) {
      assert(e.status === 403, 'Participant gets 403');
    }

    // Connect to DB directly to create test data
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/backtrack');
    
    // Clear old test data
    await mongoose.connection.collection('admins').deleteMany({ email: 'test_admin@example.com' });
    await mongoose.connection.collection('events').deleteMany({ name: 'TEST_RESULTS_EVENT' });
    await mongoose.connection.collection('participants').deleteMany({ email: 'test_res@example.com' });
    
    // Create test data
    await mongoose.connection.collection('admins').insertOne({
      _id: adminId,
      name: 'Test Admin',
      email: 'test_admin@example.com',
      passwordHash: 'hash',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const eventId = new mongoose.Types.ObjectId();
    await mongoose.connection.collection('events').insertOne({
      _id: eventId,
      name: 'TEST_RESULTS_EVENT',
      status: 'LIVE',
      startTime: new Date(),
      endTime: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await mongoose.connection.collection('participants').insertOne({
      _id: participantId,
      name: 'Test Results Participant',
      email: 'test_res@example.com',
      password: 'hash',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const challengeId = new mongoose.Types.ObjectId();
    await mongoose.connection.collection('challenges').insertOne({
      _id: challengeId,
      eventId: eventId,
      title: 'Test Challenge',
      hiddenCode: 'SECRET_CODE_DO_NOT_LEAK',
      status: 'PUBLISHED',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create 2 Attempts (1 SUCCESS, 1 FAILED)
    await mongoose.connection.collection('attempts').insertMany([
      {
        participantId: participantId,
        eventId: eventId,
        challengeId: challengeId,
        input: '1 2',
        output: '3',
        success: true,
        status: 'SUCCESS',
        executionTime: 10,
        createdAt: new Date(Date.now() - 1000)
      },
      {
        participantId: participantId,
        eventId: eventId,
        challengeId: challengeId,
        input: 'a b',
        error: 'NaN',
        success: false,
        status: 'FAILED',
        executionTime: 5,
        createdAt: new Date()
      }
    ]);

    // Test Admin API Overview
    const overviewRes = await request('/admin/results/overview', adminToken);
    assert(overviewRes.success === true, 'Admin can access overview');
    
    // Test Event Statistics
    const eventStatsRes = await request(`/admin/results/events/${eventId}`, adminToken);
    const stats = eventStatsRes.data;
    assert(stats.execution.totalAttempts === 2, 'Event stats: 2 total attempts');
    assert(stats.execution.successfulExecutions === 1, 'Event stats: 1 success');
    assert(stats.execution.failedExecutions === 1, 'Event stats: 1 failed');
    assert(stats.execution.uniqueParticipants === 1, 'Event stats: 1 participant');

    // Test Participant Results
    const partRes = await request(`/admin/results/participants?eventId=${eventId}`, adminToken);
    const partData = partRes.data.results[0];
    assert(partData.name === 'Test Results Participant', 'Participant name present in list');
    assert(partData.totalAttempts === 2, 'Participant has 2 attempts');

    // Test Challenge Stats
    const chalRes = await request(`/admin/results/challenges/${eventId}`, adminToken);
    const chalData = chalRes.data.find(c => c._id.toString() === challengeId.toString());
    assert(chalData.attemptsCount === 2, 'Challenge has 2 attempts');

    // Test Recent Attempts
    const recentRes = await request(`/admin/results/recent/${eventId}`, adminToken);
    const recentData = recentRes.data;
    assert(recentData.length === 2, 'Recent attempts returned 2 items');
    assert(recentData[0].participant.name === 'Test Results Participant', 'Participant joined in recent attempts');
    assert(recentData[0].challenge.title === 'Test Challenge', 'Challenge joined in recent attempts');
    assert(recentData[0].challenge.hiddenCode === undefined, 'Hidden code is NOT exposed in recent attempts');

  } catch (err) {
    console.error('Test execution failed with error:', err.message);
    if (err.data) {
      console.error(err.data);
    }
  } finally {
    // Cleanup
    try {
      await mongoose.connection.collection('admins').deleteMany({ email: 'test_admin@example.com' });
      await mongoose.connection.collection('events').deleteMany({ name: 'TEST_RESULTS_EVENT' });
      await mongoose.connection.collection('participants').deleteMany({ email: 'test_res@example.com' });
      await mongoose.connection.collection('challenges').deleteMany({ title: 'Test Challenge' });
      await mongoose.connection.collection('attempts').deleteMany({ participantId: participantId });
      await mongoose.disconnect();
    } catch (e) {
      console.error('Cleanup failed', e.message);
    }

    console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed.`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
