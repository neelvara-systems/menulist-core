#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import { sanitizeMessagingOnboardingEventError } from "../../functions/src/messagingOnboarding/eventLogger";

assert.deepEqual(sanitizeMessagingOnboardingEventError({
  code: "TRANSIENT_PROVIDER_FAILURE",
  retryable: true,
  retryCount: 2,
}), {
  code: "TRANSIENT_PROVIDER_FAILURE",
  retryable: true,
  retryCount: 2,
});
assert.deepEqual(sanitizeMessagingOnboardingEventError({
  code: "INVALID_RETRY_COUNT",
  retryable: false,
  retryCount: Number.NaN,
}), {
  code: "INVALID_RETRY_COUNT",
  retryable: false,
});
assert.deepEqual(sanitizeMessagingOnboardingEventError({
  code: "NEGATIVE_RETRY_COUNT",
  retryable: true,
  retryCount: -1,
}), {
  code: "NEGATIVE_RETRY_COUNT",
  retryable: true,
});
assert.equal(sanitizeMessagingOnboardingEventError(undefined), undefined);

console.log("Messaging event boundary verification passed.");
