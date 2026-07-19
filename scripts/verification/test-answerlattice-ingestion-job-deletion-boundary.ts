import assert from 'node:assert/strict';
import {
    getIngestionJobTimestampMillis,
    isDeletableIngestionJobStatus,
    isExactAnswerlatticeProductId,
    normalizeIngestionJobQueryLimit,
    planIngestionJobSourceCleanup,
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

const sourcePrefix = 'ingestion_source_files/12/34/';
const cleanupPlan = planIngestionJobSourceCleanup([
    {
        storagePath: `${sourcePrefix}job-a.pdf`,
        downloadURL: 'https://storage.example/job-a.pdf',
    },
    {
        storagePath: `${sourcePrefix}shared.pdf`,
        downloadURL: 'https://storage.example/shared.pdf',
    },
], [[{
    storagePath: `${sourcePrefix}shared.pdf`,
}]], sourcePrefix);
assert.deepEqual(cleanupPlan.cleanupCandidates, [{
    storagePath: `${sourcePrefix}job-a.pdf`,
    downloadURL: 'https://storage.example/job-a.pdf',
}]);
assert.deepEqual(cleanupPlan.preservedStoragePaths, [`${sourcePrefix}shared.pdf`]);

assert.throws(
    () => planIngestionJobSourceCleanup([{
        storagePath: 'ingestion_source_files/99/34/outside.pdf',
        downloadURL: 'https://storage.example/outside.pdf',
    }], [], sourcePrefix),
    /invalid source-file cleanup data/,
);
assert.throws(
    () => planIngestionJobSourceCleanup([{
        storagePath: `${sourcePrefix}job-a.pdf`,
        downloadURL: 'https://storage.example/job-a.pdf',
    }], [[{ storagePath: `${sourcePrefix}../unsafe.pdf` }]], sourcePrefix),
    /invalid source-file reference data/,
);

process.stdout.write('Answerlattice ingestion-job deletion boundary tests passed.\n');
