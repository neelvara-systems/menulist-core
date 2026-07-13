#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
  countMessagingEventTypes,
  getMessagingSessionUploadByteSample,
  isMessagingHealthComputationDue,
  normalizeMessagingHealthSessionSample,
} from '../../functions/src/messagingOnboarding/healthMonitor';

const timestamp = (millis: number) => ({ toMillis: () => millis });
const now = 2_000_000_000;

assert.equal(isMessagingHealthComputationDue(null, now), true);
assert.equal(isMessagingHealthComputationDue({
  lastComputedAt: timestamp(now - 30 * 60 * 1000),
}, now), false);
assert.equal(isMessagingHealthComputationDue({
  computeLeaseUntil: timestamp(now + 5 * 60 * 1000),
  lastComputedAt: timestamp(now - 2 * 60 * 60 * 1000),
}, now), false);
assert.equal(isMessagingHealthComputationDue({
  computeLeaseUntil: timestamp(now - 1),
  lastComputedAt: timestamp(now - 2 * 60 * 60 * 1000),
}, now), true);
assert.equal(isMessagingHealthComputationDue({
  lastComputedAt: timestamp(now + 60 * 60 * 1000),
}, now), true);
assert.equal(isMessagingHealthComputationDue({
  computeLeaseUntil: timestamp(now + 24 * 60 * 60 * 1000),
}, now), true);
assert.equal(isMessagingHealthComputationDue({}, Number.NaN), false);

assert.deepEqual(normalizeMessagingHealthSessionSample({
  processingRuns: 2,
  publishedResult: null,
  state: 'PROCESSING_MENU',
}), { processingRuns: 2, published: false });
assert.deepEqual(normalizeMessagingHealthSessionSample({
  processingRuns: 1,
  publishedResult: {
    dashboardUrl: 'https://menulist.ai/signin',
    projectId: '1-default-1',
    publicUrl: 'https://example.menulist.ai',
    storeId: 1,
    tenantId: 1,
    userId: 'owner-1',
  },
  state: 'LIVE',
}), { processingRuns: 1, published: true });
assert.equal(normalizeMessagingHealthSessionSample({
  processingRuns: 1,
  publishedResult: { storeId: 1 },
  state: 'LIVE',
}), null);
assert.equal(normalizeMessagingHealthSessionSample({
  processingRuns: '2',
  publishedResult: null,
  state: 'PROCESSING_MENU',
}), null);
assert.equal(normalizeMessagingHealthSessionSample({
  processingRuns: 1,
  publishedResult: null,
  state: 'LIVE',
}), null);
assert.equal(normalizeMessagingHealthSessionSample({
  processingRuns: 1,
  publishedResult: { storeId: 1 },
  state: 'PROCESSING_MENU',
}), null);

assert.deepEqual(countMessagingEventTypes([
  'EXTRACTION_FAILED',
  'EXTRACTION_FAILED',
  'PUBLISH_COMPLETED',
  '__proto__',
  null,
]), {
  EXTRACTION_FAILED: 2,
  PUBLISH_COMPLETED: 1,
});

assert.deepEqual(getMessagingSessionUploadByteSample({
  uploads: [
    { fileSize: 100 },
    { fileSize: '200' },
    { fileSize: -1 },
    { fileSize: Number.POSITIVE_INFINITY },
    { fileSize: 11 * 1024 * 1024 },
  ],
}), { bytes: 100, invalidRecords: 4 });
assert.deepEqual(getMessagingSessionUploadByteSample({ uploads: null }), {
  bytes: 0,
  invalidRecords: 1,
});

console.log('Messaging health data boundary verification passed.');
