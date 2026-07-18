import assert from 'node:assert/strict';

import { cleanupCompletedUploadAfterUrlFailure } from '../../src/lib/firebase/storage';

async function main() {
  let cleanupCalls = 0;
  const success = await cleanupCompletedUploadAfterUrlFailure(async () => {
    cleanupCalls += 1;
  });
  assert.deepEqual(success, { success: true });
  assert.equal(cleanupCalls, 1, 'A completed upload cleanup must execute exactly once.');

  const cleanupFailure = new Error('delete denied');
  const failed = await cleanupCompletedUploadAfterUrlFailure(async () => {
    cleanupCalls += 1;
    throw cleanupFailure;
  });
  assert.equal(failed.success, false);
  if (failed.success) throw new Error('Expected failed cleanup acknowledgement.');
  assert.equal(failed.error, cleanupFailure, 'Cleanup failure evidence must remain available for bounded diagnostics.');
  assert.equal(cleanupCalls, 2, 'A failed cleanup attempt must not be retried implicitly.');

  process.stdout.write('Firebase Storage upload lifecycle tests passed.\n');
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
