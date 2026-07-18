import assert from 'node:assert/strict';
import { summarizeStorageCleanupResults } from '../../src/lib/storage/storageCleanupResults';

assert.deepEqual(summarizeStorageCleanupResults([]), {
    attempted: 0,
    failed: 0,
    succeeded: 0,
});

assert.deepEqual(summarizeStorageCleanupResults([
    { status: 'fulfilled', value: { success: true } },
    { status: 'fulfilled', value: { success: false } },
    { status: 'rejected', reason: new Error('network') },
]), {
    attempted: 3,
    failed: 2,
    succeeded: 1,
});

process.stdout.write('Storage cleanup result tests passed.\n');
