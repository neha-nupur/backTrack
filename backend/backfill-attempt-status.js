/**
 * Backfill script: populate `status` and `error` on legacy Attempt documents.
 *
 * BACKGROUND:
 * `status` (SUCCESS / EXECUTION_ERROR / EXECUTION_TIMEOUT) and `error`
 * (a plain string message) were added to the Attempt schema alongside a
 * fix for the admin monitoring dashboard, which expected those fields but
 * they were never persisted. Any Attempt document created before this
 * change will only have the older `success` (Boolean) / `executionTime`
 * fields and will be MISSING `status` entirely.
 *
 * Since `status` is now a required schema field, those legacy documents
 * will fail Mongoose validation the moment anything tries to re-save them,
 * and — more immediately — they will simply not show up in admin status
 * filters/badges until backfilled.
 *
 * WHAT THIS SCRIPT DOES:
 * - Finds every Attempt document with no `status` field.
 * - Derives `status` from the existing `success` boolean:
 *     success === true  -> SUCCESS
 *     success === false -> EXECUTION_ERROR  (legacy docs never distinguished
 *                          timeouts from other errors, so there is no way to
 *                          recover EXECUTION_TIMEOUT specifically after the
 *                          fact — every legacy failure is bucketed as a
 *                          generic EXECUTION_ERROR, which is the accurate,
 *                          honest choice given what was actually recorded)
 * - Sets `error` to null if it's not already set (legacy docs never stored
 *   an error message at all, so there's nothing to recover there either).
 * - Uses the raw collection (bypasses Mongoose schema validation) since the
 *   whole point is to fix documents that would currently fail that
 *   validation — going through the Attempt model here would just fail.
 * - Is idempotent: re-running it only touches documents still missing
 *   `status`, so it's safe to run more than once.
 *
 * USAGE:
 *   node backend/backfill-attempt-status.js
 *   node backend/backfill-attempt-status.js --dry-run   (report counts only, no writes)
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry-run');

const ATTEMPT_STATUS = {
  SUCCESS: 'SUCCESS',
  EXECUTION_ERROR: 'EXECUTION_ERROR',
  EXECUTION_TIMEOUT: 'EXECUTION_TIMEOUT',
};

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('[FATAL] MONGODB_URI is not set. Check backend/.env.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const attempts = mongoose.connection.db.collection('attempts');

  const legacyFilter = { status: { $exists: false } };
  const legacyCount = await attempts.countDocuments(legacyFilter);

  console.log(`Found ${legacyCount} Attempt document(s) missing 'status'.`);

  if (legacyCount === 0) {
    console.log('Nothing to backfill.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const successCount = await attempts.countDocuments({ ...legacyFilter, success: true });
  const failureCount = await attempts.countDocuments({ ...legacyFilter, success: { $ne: true } });

  console.log(`  -> would mark ${successCount} as ${ATTEMPT_STATUS.SUCCESS}`);
  console.log(`  -> would mark ${failureCount} as ${ATTEMPT_STATUS.EXECUTION_ERROR} (legacy docs cannot distinguish timeout from other errors)`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No documents were modified. Re-run without --dry-run to apply.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const successResult = await attempts.updateMany(
    { ...legacyFilter, success: true },
    { $set: { status: ATTEMPT_STATUS.SUCCESS, error: null } }
  );

  const failureResult = await attempts.updateMany(
    { ...legacyFilter, success: { $ne: true } },
    { $set: { status: ATTEMPT_STATUS.EXECUTION_ERROR, error: null } }
  );

  console.log(`\nUpdated ${successResult.modifiedCount} document(s) to ${ATTEMPT_STATUS.SUCCESS}.`);
  console.log(`Updated ${failureResult.modifiedCount} document(s) to ${ATTEMPT_STATUS.EXECUTION_ERROR}.`);

  const remaining = await attempts.countDocuments(legacyFilter);
  if (remaining > 0) {
    console.warn(`\n[WARNING] ${remaining} document(s) still missing 'status' after backfill. Investigate manually.`);
  } else {
    console.log('\nBackfill complete. All Attempt documents now have a status.');
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('[BACKFILL FAILED]', err);
  process.exit(1);
});
