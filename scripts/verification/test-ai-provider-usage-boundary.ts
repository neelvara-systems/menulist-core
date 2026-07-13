import assert from 'node:assert/strict';
import { summarizeAiProviderUsage } from '../../src/lib/ai/providerUsage';

assert.deepEqual(summarizeAiProviderUsage([]), {
    candidatesTokenCount: 0,
    promptTokenCount: 0,
    providerCallCount: 0,
    totalTokenCount: 0,
});

assert.deepEqual(summarizeAiProviderUsage([
    { usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 4, totalTokenCount: 14 } },
    { usageMetadata: { promptTokenCount: 6, candidatesTokenCount: 3 } },
]), {
    candidatesTokenCount: 7,
    promptTokenCount: 16,
    providerCallCount: 2,
    totalTokenCount: 23,
});

assert.deepEqual(summarizeAiProviderUsage([
    { response: { usageMetadata: { promptTokenCount: 5.9, candidatesTokenCount: 2.2, totalTokenCount: 9.8 } } },
    { usageMetadata: { promptTokenCount: -1, candidatesTokenCount: Number.POSITIVE_INFINITY, totalTokenCount: '12' } },
    null,
]), {
    candidatesTokenCount: 2,
    promptTokenCount: 5,
    providerCallCount: 3,
    totalTokenCount: 9,
});

console.log('AI provider usage boundary tests passed');
