import assert from 'node:assert/strict';
import { getSignalDeskRateLimitFailureDecision } from '@lib/signaldesk/apiGuards';

const now = 1_000_000;

assert.deepEqual(
    getSignalDeskRateLimitFailureDecision({
        now,
        reason: 'provider_unavailable',
        resetAt: now + 5_000,
    }),
    {
        code: 'RATE_LIMIT_UNAVAILABLE',
        providerUnavailable: true,
        retryAfter: 5,
        status: 503,
    },
);

assert.deepEqual(
    getSignalDeskRateLimitFailureDecision({
        now,
        reason: 'limit_exceeded',
        resetAt: now + 90_001,
    }),
    {
        code: 'RATE_LIMITED',
        providerUnavailable: false,
        retryAfter: 91,
        status: 429,
    },
);

assert.equal(
    getSignalDeskRateLimitFailureDecision({
        now,
        reason: 'provider_unavailable',
        resetAt: Number.NaN,
    }).retryAfter,
    1,
);
assert.equal(
    getSignalDeskRateLimitFailureDecision({
        now,
        reason: true,
        resetAt: '2000000',
    }).status,
    429,
);

console.log('SignalDesk rate-limit policy contracts passed');
