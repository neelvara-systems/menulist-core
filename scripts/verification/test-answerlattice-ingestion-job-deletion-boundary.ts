import assert from 'node:assert/strict';
import {
    countFailedStorageCleanupResults,
    getIngestionJobTimestampMillis,
    isDeletableIngestionJobStatus,
    isExactAnswerlatticeProductId,
    normalizeIngestionJobQueryLimit,
} from '../../src/lib/answerlattice/ingestionJobDeletionBoundary';

assert.equal(isDeletableIngestionJobStatus('needs_review'), true);
assert.equal(isDeletableIngestionJobStatus('failed'), true);
assert.equal(isDeletableIngestionJobStatus('cancelled'), true);
assert.equal(isDeletableIngestionJobStatus('published'), false, 'published provenance must remain durable');
assert.equal(isDeletableIngestionJobStatus('processing'), false, 'active generation must not be deleted');
assert.equal(isDeletableIngestionJobStatus(' failed '), false, 'status admission must not trim malformed data');

assert.equal(isExactAnswerlatticeProductId('AL'), true);
assert.equal(isExactAnswerlatticeProductId(' al '), false, 'product identity must not normalize malformed persisted data');
assert.equal(isExactAnswerlatticeProductId('ML'), false);

assert.equal(getIngestionJobTimestampMillis({ toMillis: () => 42 }), 42);
assert.equal(getIngestionJobTimestampMillis({ toMillis: () => Number.NaN }), null);
assert.equal(getIngestionJobTimestampMillis({ seconds: 42 }), null, 'non-Timestamp legacy shapes must not crash or be trusted');

assert.equal(normalizeIngestionJobQueryLimit(12, 20, 50), 12);
assert.equal(normalizeIngestionJobQueryLimit(80, 20, 50), 50);
assert.equal(normalizeIngestionJobQueryLimit(Number.NaN, 20, 50), 20);
assert.equal(normalizeIngestionJobQueryLimit(0, 20, 50), 20);

assert.equal(countFailedStorageCleanupResults([]), 0);
assert.equal(countFailedStorageCleanupResults([{ success: true }, { success: true }]), 0);
assert.equal(
    countFailedStorageCleanupResults([{ success: true }, { success: false }]),
    1,
    'fulfilled cleanup failures must be counted',
);
assert.equal(
    countFailedStorageCleanupResults([{ success: false }, null, {}, Promise.resolve()]),
    4,
    'malformed cleanup results must fail closed',
);

process.stdout.write('Answerlattice ingestion-job deletion boundary tests passed.\n');
