import assert from 'node:assert/strict';

import {
    getAIProviderRetryAfter,
    isAIProviderRateLimitError,
} from '../../src/lib/ai/providerErrors';

assert.equal(isAIProviderRateLimitError({ status: 429 }), true);
assert.equal(isAIProviderRateLimitError({ error: { code: '429' } }), true);
assert.equal(isAIProviderRateLimitError({ details: { reason: 'RESOURCE_EXHAUSTED' } }), true);
assert.equal(isAIProviderRateLimitError({ message: 'quota exceeded' }), false);
assert.equal(isAIProviderRateLimitError({ status: 500 }), false);

assert.equal(getAIProviderRetryAfter({ retryAfterSeconds: 12.2 }), 13);
assert.equal(getAIProviderRetryAfter({ details: { retryDelay: '4.1s' } }), 5);
assert.equal(getAIProviderRetryAfter({ retryAfter: 'invalid', retryDelay: 9 }), 9);
assert.equal(getAIProviderRetryAfter({ retryAfter: 0 }), null);

const throwingProxy = new Proxy({}, {
    get: () => {
        throw new Error('provider field access must fail closed');
    },
    has: () => {
        throw new Error('provider field membership must fail closed');
    },
    ownKeys: () => {
        throw new Error('provider enumeration must fail closed');
    },
});
assert.doesNotThrow(() => isAIProviderRateLimitError(throwingProxy));
assert.equal(isAIProviderRateLimitError(throwingProxy), false);
assert.doesNotThrow(() => getAIProviderRetryAfter(throwingProxy));
assert.equal(getAIProviderRetryAfter(throwingProxy), null);

let numericCoercionAttempted = false;
const coerciveRetryValue = {
    valueOf: () => {
        numericCoercionAttempted = true;
        throw new Error('provider retry metadata must not be coerced');
    },
};
assert.equal(getAIProviderRetryAfter({ retryAfter: coerciveRetryValue }), null);
assert.equal(numericCoercionAttempted, false);

console.log('AI provider error boundary tests passed.');
