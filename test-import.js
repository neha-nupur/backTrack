const fs = require('fs');
const http = require('http');

const data = fs.readFileSync('C:/Users/nehan/.gemini/antigravity-ide/brain/386f00e3-a389-4e7e-8dcf-7d09eb70c124/scratch/participants.json', 'utf8');

// I need an admin token. I'll just write a script that connects directly to the DB to verify the participants are there since it's easier than mocking a login to get a JWT, or I can just run a mongoose script.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('./backend/src/config/env');
const Participant = require('./backend/src/models/Participant');
const participantService = require('./backend/src/services/participantService');

mongoose.connect(env.MONGO_URI || 'mongodb://127.0.0.1:27017/backtrack')
  .then(async () => {
    console.log('Connected to DB');
    const participants = JSON.parse(data);
    
    // Clear previous if any
    // await Participant.deleteMany({});
    
    console.log('Importing...');
    const result = await participantService.bulkCreateParticipants(participants);
    console.log('Import result:', result.imported, 'imported,', result.skipped, 'skipped');
    
    const count = await Participant.countDocuments();
    console.log('Total participants in DB:', count);
    
    const p1 = await Participant.findOne({ email: '20251651001@iiitvadodara.ac.in' });
    if (p1 && p1.passwordHash) {
      console.log('Participant 1 has password hash:', p1.passwordHash);
      const isMatch = await bcrypt.compare('Contest#2026@BT', p1.passwordHash);
      console.log('Password match:', isMatch);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
