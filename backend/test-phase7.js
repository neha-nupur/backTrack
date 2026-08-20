require('dotenv').config();
const mongoose = require('mongoose');
const { Types } = require('mongoose');
const adminMonitoringService = require('./src/services/adminMonitoringService');
const Attempt = require('./src/models/Attempt');
const Participant = require('./src/models/Participant');
const Event = require('./src/models/Event');
const Challenge = require('./src/models/Challenge');

async function runTests() {
  console.log('--- Starting Admin Monitoring Tests ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blackbox_db');
  console.log('Connected to DB.');

  try {
    // 1. Dashboard Stats
    const stats = await adminMonitoringService.getDashboardStats();
    if (stats.participants && stats.events && stats.challenges && stats.attempts) {
      console.log('✓ PASS: getDashboardStats structure valid');
    } else {
      throw new Error('Dashboard stats missing fields');
    }

    // 2. Fetch Attempts without hiddenCode
    const attempts = await adminMonitoringService.getAttempts({}, { page: 1, limit: 10 });
    if (attempts.attempts) {
      const hasHiddenCode = attempts.attempts.some(a => 'hiddenCode' in a);
      if (hasHiddenCode) {
        throw new Error('SECURITY VIOLATION: hiddenCode exposed in attempts list');
      }
      console.log('✓ PASS: Attempts fetched safely (no hiddenCode)');
    } else {
      throw new Error('Failed to fetch attempts');
    }

    // 3. Attempt Detail safely
    if (attempts.attempts.length > 0) {
      const detail = await adminMonitoringService.getAttemptById(attempts.attempts[0].id);
      if ('hiddenCode' in detail) {
        throw new Error('SECURITY VIOLATION: hiddenCode exposed in attempt detail');
      }
      console.log('✓ PASS: Attempt detail fetched safely (no hiddenCode)');
    }

    // 4. Event Activity
    const event = await Event.findOne();
    if (event) {
      const activity = await adminMonitoringService.getEventActivity(event._id);
      if (activity && activity.activity) {
        if ('hiddenCode' in activity) {
          throw new Error('SECURITY VIOLATION: hiddenCode exposed in event activity');
        }
        console.log('✓ PASS: Event activity aggregated safely');
      }
    }

    console.log('\n--- All Admin Monitoring Tests Passed Successfully ---');
  } catch (err) {
    console.error('\n✗ FAIL:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
