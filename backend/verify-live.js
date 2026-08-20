const http = require('http');
require('dotenv').config();

const request = (method, path, body, token) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
        } catch(e) {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(data);
    req.end();
  });
};

const run = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const verifyParticipantEmail = process.env.VERIFY_PARTICIPANT_EMAIL;
    const masterPassword = process.env.MASTER_PASSWORD;

    if (!adminEmail || !adminPassword || !verifyParticipantEmail || !masterPassword) {
      console.error('Missing required environment variable(s) for verification.');
      if (!adminEmail) console.error('Missing: ADMIN_EMAIL');
      if (!adminPassword) console.error('Missing: ADMIN_PASSWORD');
      if (!verifyParticipantEmail) console.error('Missing: VERIFY_PARTICIPANT_EMAIL');
      if (!masterPassword) console.error('Missing: MASTER_PASSWORD');
      process.exit(1);
    }

    let adminToken = '';
    let pToken = '';
    let participantId = '';
    let eventId = '';
    let challengeId = '';

    console.log('1. Admin Login');
    const loginRes = await request('POST', '/auth/admin/login', {
      email: adminEmail,
      password: adminPassword
    });
    if(loginRes.status === 200) {
      adminToken = loginRes.body.data.token;
      console.log('✓ PASS');
    } else throw new Error('Admin login failed');

    console.log('2. Create Participant');
    const pRes = await request('POST', '/admin/participants', {
      name: 'Test Live Participant',
      email: verifyParticipantEmail,
      status: 'ACTIVE'
    }, adminToken);
    if(pRes.status === 201) {
      participantId = pRes.body.data.participant.id;
      console.log('✓ PASS');
    } else throw new Error('Participant creation failed');

    console.log('3. Create Event');
    const eRes = await request('POST', '/admin/events', {
      name: 'Live Test Event',
      description: 'Testing',
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      status: 'LIVE'
    }, adminToken);
    if(eRes.status === 201) {
      eventId = eRes.body.data.event.id;
      console.log('✓ PASS');
    } else throw new Error('Event creation failed');

    console.log('4. Create Challenge');
    const cRes = await request('POST', `/admin/events/${eventId}/challenges`, {
      title: 'Live Challenge',
      description: 'Test',
      hiddenCode: 'console.log("Hello BlackBox");',
      score: 100,
      status: 'ENABLED'
    }, adminToken);
    if(cRes.status === 201) {
      challengeId = cRes.body.data.challenge.id;
      console.log('✓ PASS');
    } else throw new Error('Challenge creation failed');

    console.log('5. Participant Login');
    const plRes = await request('POST', '/auth/login', {
      email: verifyParticipantEmail,
      password: masterPassword
    });
    if(plRes.status === 200) {
      pToken = plRes.body.data.token;
      console.log('✓ PASS');
    } else throw new Error('Participant login failed');

    console.log('6. Execute Challenge');
    const exRes = await request('POST', `/events/${eventId}/challenges/${challengeId}/execute`, {
      userInput: ''
    }, pToken);
    if(exRes.status === 200 && exRes.body.data.attempt) {
      console.log('✓ PASS');
    } else throw new Error('Execution failed');

    console.log('7. Attempt History');
    const histRes = await request('GET', `/events/${eventId}/attempts`, null, pToken);
    if(histRes.status === 200 && histRes.body.data.attempts.length > 0) {
      console.log('✓ PASS');
    } else throw new Error('History failed');

    console.log('All API tests passed!');
  } catch(err) {
    console.error('Test Failed:', err.message);
    process.exit(1);
  }
};

run();
