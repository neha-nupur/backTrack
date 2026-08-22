require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Challenge = require('./src/models/Challenge');
const executor = require('./src/services/codeExecutor/executor');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const ch = await Challenge.findById('6a897e70100045831129bf41');
  console.log('Challenge in DB:');
  console.log('Title:', ch.title);
  console.log('HiddenCode:\n', ch.hiddenCode);

  console.log('\n--- Running Executor on DB HiddenCode ---');
  const res = await executor.execute(ch.hiddenCode, '(())]');
  console.log('Result for (())]:', JSON.stringify(res, null, 2));

  mongoose.disconnect();
  process.exit(0);
})();
