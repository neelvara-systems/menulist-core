#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
  countMessagingEventTypes,
  emitHealthAlerts,
  getMessagingSessionUploadByteSample,
  isMessagingHealthComputationDue,
  isMessagingHealthLeaseOwner,
  normalizeMessagingHealthSessionSample,
  shouldCheckMessagingOnboardingHealth,
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
assert.equal(
  isMessagingHealthLeaseOwner({ computeLeaseId: 'lease-current' }, 'lease-current'),
  true,
  'the current computation lease owner may settle',
);
assert.equal(
  isMessagingHealthLeaseOwner({ computeLeaseId: 'lease-replacement' }, 'lease-stale'),
  false,
  'a stale computation must not settle or clear a replacement lease',
);
assert.equal(
  isMessagingHealthLeaseOwner({ computeLeaseId: 'lease-current' }, ''),
  false,
  'an empty expected lease identity must fail closed',
);

assert.equal(shouldCheckMessagingOnboardingHealth(Date.UTC(2026, 6, 16, 10, 0)), true);
assert.equal(shouldCheckMessagingOnboardingHealth(Date.UTC(2026, 6, 16, 10, 3, 59)), true);
assert.equal(shouldCheckMessagingOnboardingHealth(Date.UTC(2026, 6, 16, 10, 4)), false);
assert.equal(shouldCheckMessagingOnboardingHealth(Number.NaN), false);

assert.deepEqual(normalizeMessagingHealthSessionSample({
  processingRuns: 2,
  publishedResult: null,
  state: 'PROCESSING_MENU',
}), { processingRuns: 2, published: false });
assert.deepEqual(normalizeMessagingHealthSessionSample({
  processingRuns: 1,
  publishedResult: {
    dashboardUrl: 'https://app.menulist.ai/signin',
    projectId: '1-default-1',
    publicUrl: 'https://example.menulist.online',
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

void (async () => {
  const alertAttempts: string[] = [];
  const failedAlertCount = await emitHealthAlerts([
    {
      key: 'cost_warning',
      severity: 'warning',
      title: 'Cost warning',
      message: 'Cost warning message',
      metadata: {},
    },
    {
      key: 'failure_critical',
      severity: 'critical',
      title: 'Failure critical',
      message: 'Failure critical message',
      metadata: {},
    },
    {
      key: 'queue_warning',
      severity: 'warning',
      title: 'Queue warning',
      message: 'Queue warning message',
      metadata: {},
    },
  ], async (alert) => {
    const alertKey = String(alert.metadata?.alertKey);
    alertAttempts.push(alertKey);
    if (alertKey === 'cost_warning') {
      throw new Error('simulated alert persistence failure');
    }
    return 'test-alert-id';
  });

  assert.equal(failedAlertCount, 1);
  assert.deepEqual(alertAttempts, [
    'cost_warning',
    'failure_critical',
    'queue_warning',
  ]);

  console.log('Messaging health data boundary verification passed.');
})().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
