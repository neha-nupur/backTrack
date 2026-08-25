/**
 * One-time script to fix challenge hiddenCode entries that use Node.js
 * built-ins (require, process) which are forbidden in the sandbox.
 * 
 * Rewrites them as pure functions that the executor's auto-invocation
 * wrapper handles automatically.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function fixHiddenCodes() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const Challenge = require('./src/models/Challenge');
  const challenges = await Challenge.find({}).lean();

  console.log(`Found ${challenges.length} challenge(s)\n`);

  for (const ch of challenges) {
    const code = ch.hiddenCode || '';
    console.log(`=== "${ch.title}" ===`);

    // Check if it uses forbidden Node.js patterns
    const hasFsRequire = /require\s*\(\s*['"`]fs['"`]\s*\)/.test(code);
    const hasProcessStdout = /process\.stdout/.test(code);
    const hasProcessStdin = /process\.stdin/.test(code);

    if (!hasFsRequire && !hasProcessStdout && !hasProcessStdin) {
      console.log('  ✓ Already clean, skipping.\n');
      continue;
    }

    console.log('  ⚠ Contains forbidden patterns. Rewriting...');

    // Strip out:
    //   const fs = require("fs");
    //   const input = fs.readFileSync(0, "utf8").trim();
    //   process.stdout.write(...)
    //   console.log that wraps result at end (we let auto-invoke handle output)
    let cleaned = code
      // Remove fs require line
      .replace(/^const\s+fs\s*=\s*require\s*\(.*\);\s*\n?/m, '')
      // Remove input read lines using fs
      .replace(/^const\s+input\s*=\s*fs\.\w+.*;\s*\n?/m, '')
      // Remove process.stdout.write lines
      .replace(/^process\.stdout\.write\s*\(.*\);\s*\n?/mg, '')
      // Remove trailing result = fn(input) console.log lines that were manual
      .replace(/^const\s+result\s*=\s*\w+\s*\(input\);\s*\n?/m, '')
      .replace(/^console\.log\s*\(\s*result\s*\);\s*\n?/m, '')
      .trim();

    console.log('  New code:');
    console.log(cleaned);

    await Challenge.findByIdAndUpdate(ch._id, { hiddenCode: cleaned });
    console.log('  ✓ Updated!\n');
  }

  console.log('Done.');
  await mongoose.disconnect();
}

fixHiddenCodes().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
