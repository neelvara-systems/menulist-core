import assert from 'node:assert/strict';

import {
    GEMINI_SPEND_ADMISSION_ERROR_CODES,
    GeminiSpendAdmissionError,
    calculateGeminiResponseCostMicroUsd,
    estimateGeminiRequestCostMicroUsd,
    getFullJitterDelayMs,
    getGeminiRetryAfterMs,
    getGeminiSpendLimitMicroUsd,
    reserveGeminiSpend,
    settleGeminiSpend,
} from '../../src/data/shared/geminiSpendPolicy';

assert.equal(calculateGeminiResponseCostMicroUsd('gemini-3.6-flash', {
    usageMetadata: {
        promptTokenCount: 1_000,
        candidatesTokenCount: 500,
        totalTokenCount: 1_500,
    },
}), 5_250);

assert.equal(calculateGeminiResponseCostMicroUsd('gemini-3.5-flash-lite', {
    usageMetadata: {
        promptTokenCount: 1_000,
        candidatesTokenCount: 500,
        thoughtsTokenCount: 250,
        totalTokenCount: 1_750,
    },
}), 2_175);

const estimated = estimateGeminiRequestCostMicroUsd('generateContent', {
    model: 'gemini-3.6-flash',
    contents: 'Return a short JSON object.',
    config: { maxOutputTokens: 100 },
});
assert(estimated > 0 && estimated < 10_000);
assert.equal(estimateGeminiRequestCostMicroUsd('fileDelete', {}), 0);

const first = reserveGeminiSpend(null, {
    estimatedMicroUsd: 4_000,
    limitMicroUsd: 8_000,
    model: 'gemini-3.6-flash',
    nowMs: 60_000,
});
assert.equal(first.allowed, true);
assert(first.reservation);

const second = reserveGeminiSpend(first.state, {
    estimatedMicroUsd: 4_000,
    limitMicroUsd: 8_000,
    model: 'gemini-3.6-flash',
    nowMs: 61_000,
});
assert.equal(second.allowed, true);

const blocked = reserveGeminiSpend(second.state, {
    estimatedMicroUsd: 1,
    limitMicroUsd: 8_000,
    model: 'gemini-3.6-flash',
    nowMs: 62_000,
});
assert.equal(blocked.allowed, false);
assert(blocked.retryAfterSeconds && blocked.retryAfterSeconds >= 60);

const settled = settleGeminiSpend(second.state, {
    actualMicroUsd: 2_000,
    nowMs: 63_000,
    reservation: first.reservation,
});
const afterSettlement = reserveGeminiSpend(settled, {
    estimatedMicroUsd: 2_000,
    limitMicroUsd: 8_000,
    model: 'gemini-3.6-flash',
    nowMs: 64_000,
});
assert.equal(afterSettlement.allowed, true);

const afterWindow = reserveGeminiSpend(second.state, {
    estimatedMicroUsd: 8_000,
    limitMicroUsd: 8_000,
    model: 'gemini-3.6-flash',
    nowMs: 12 * 60_000,
});
assert.equal(afterWindow.allowed, true);

assert.equal(getGeminiSpendLimitMicroUsd('menulist', {}), 8_000_000);
assert.equal(getGeminiSpendLimitMicroUsd('answerlattice', {
    ANSWERLATTICE_GEMINI_SPEND_LIMIT_USD_10M: '12.5',
}), 12_500_000);
assert.throws(
    () => getGeminiSpendLimitMicroUsd('signaldesk', {
        SIGNALDESK_GEMINI_SPEND_LIMIT_USD_10M: '250',
    }),
    (error: unknown) => error instanceof GeminiSpendAdmissionError
        && error.code === GEMINI_SPEND_ADMISSION_ERROR_CODES.CONFIG_INVALID,
);

assert.equal(getFullJitterDelayMs(2, 1_000, 16_000, 0.5), 2_000);
assert.equal(getGeminiRetryAfterMs({ details: { retryDelay: '2.5s' } }), 2_500);
assert.equal(getGeminiRetryAfterMs({
    error: {
        details: [{
            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
            retryDelay: '4s',
        }],
    },
}), 4_000);
assert.equal(getGeminiRetryAfterMs({ response: { headers: { 'retry-after': '3' } } }), 3_000);
assert.equal(getGeminiRetryAfterMs({ retryAfter: '750ms' }), 750);
assert.equal(getGeminiRetryAfterMs({ message: 'retry in 30 seconds' }), null);

console.log('Gemini rolling-spend policy tests passed');
