require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // List ALL collections
  const collections = await db.listCollections().toArray();
  console.log('=== ALL COLLECTIONS IN DB ===');
  collections.forEach(c => console.log(' -', c.name));

  // Check participants collection
  console.log('\n=== PARTICIPANTS ===');
  const participants = await db.collection('participants').find({}).toArray();
  console.log('Count:', participants.length);
  participants.forEach(p => {
    console.log({
      id: p._id,
      name: p.name,
      email: p.email,
      registrationNumber: p.registrationNumber,
      eventId: p.eventId,
      createdAt: p.createdAt,
    });
  });

  // Check users collection (in case participants are stored there)
  console.log('\n=== USERS ===');
  try {
    const users = await db.collection('users').find({}).toArray();
    console.log('Count:', users.length);
    users.forEach(u => console.log({ id: u._id, email: u.email, role: u.role }));
  } catch (e) {
    console.log('No users collection or error:', e.message);
  }

  // Check attempts — see unique participant IDs
  console.log('\n=== UNIQUE PARTICIPANT IDs IN ATTEMPTS ===');
  const attempts = await db.collection('attempts').distinct('participantId');
  console.log('Unique participant IDs:', attempts);

  // Check total attempts
  const totalAttempts = await db.collection('attempts').countDocuments();
  console.log('Total attempts:', totalAttempts);

  mongoose.disconnect();
  process.exit(0);
})();
