import assert from "node:assert/strict";
import { getAnswerlatticeDashboardReadRateLimitDecision } from "../../src/lib/answerlattice/dashboardReadRateLimitPolicy";

assert.deepEqual(
    getAnswerlatticeDashboardReadRateLimitDecision({
        allowed: true,
        remaining: 5,
        resetAt: 10_000,
    }, 1_000),
    { kind: "allow" },
);

assert.deepEqual(
    getAnswerlatticeDashboardReadRateLimitDecision({
        allowed: false,
        reason: "provider_unavailable",
        remaining: 0,
        resetAt: 10_000,
    }, 1_000),
    { kind: "provider_unavailable", status: 503 },
);

assert.deepEqual(
    getAnswerlatticeDashboardReadRateLimitDecision({
        allowed: false,
        reason: "limit_exceeded",
        remaining: 0,
        resetAt: 3_250,
    }, 1_000),
    {
        kind: "limit_exceeded",
        remaining: 0,
        resetAt: 3_250,
        retryAfterSeconds: 3,
        status: 429,
    },
);

assert.deepEqual(
    getAnswerlatticeDashboardReadRateLimitDecision({
        allowed: false,
        remaining: Number.NaN,
        resetAt: Number.NaN,
    }, 1_000),
    {
        kind: "limit_exceeded",
        remaining: 0,
        resetAt: 2_000,
        retryAfterSeconds: 1,
        status: 429,
    },
);

console.log("Answerlattice dashboard read rate-limit policy tests passed");
