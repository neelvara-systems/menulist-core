#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
  isMessagingPublishClaimStale,
  isMessagingPublishRetryableError,
  MESSAGING_PUBLISH_STALE_AFTER_MS,
} from '../../src/lib/messaging-onboarding/publishRetryBoundary';

for (const code of ['aborted', 'firestore/unavailable', 'deadline-exceeded', 'resource-exhausted']) {
  assert.equal(isMessagingPublishRetryableError({ code }), true, `${code} must be retryable`);
}
for (const code of [2, 4, 8, 10, 13, 14]) {
  assert.equal(isMessagingPublishRetryableError({ code }), true, `gRPC ${code} must be retryable`);
}
for (const error of [
  new Error('unknown application failure'),
  { code: 'already-exists' },
  { code: 'invalid-argument' },
  { code: 'permission-denied' },
  { code: 3 },
  null,
]) {
  assert.equal(isMessagingPublishRetryableError(error), false);
}

const now = Date.now();
assert.equal(isMessagingPublishClaimStale(now - MESSAGING_PUBLISH_STALE_AFTER_MS, now), true);
assert.equal(isMessagingPublishClaimStale(now - MESSAGING_PUBLISH_STALE_AFTER_MS + 1, now), false);
assert.equal(isMessagingPublishClaimStale(Number.NaN, now), false);
assert.equal(isMessagingPublishClaimStale(now, Number.POSITIVE_INFINITY), false);

console.log('Messaging publish retry boundary verification passed.');
