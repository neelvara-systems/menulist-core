#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { AI_ACTIONS_TYPES } from '../../src/constants/common';
import {
    type AiOperationLogInput,
    buildAiOperationLog,
} from '../../src/lib/ai/operationLog';

const base = (overrides: Record<string, unknown> = {}): AiOperationLogInput => ({
    action: AI_ACTIONS_TYPES.IMAGE_GENERATION,
    ...overrides,
} as AiOperationLogInput);

const canonical = buildAiOperationLog(base({
    candidatesTokenCount: 20,
    promptTokenCount: 10,
    totalTokenCount: 30,
    unitsConsumed: 5,
}));
assert.equal(canonical.totalTokenCount, 30);
assert.equal(canonical.unitsConsumed, 5);

for (const [field, value] of [
    ['promptTokenCount', '10'],
    ['candidatesTokenCount', 1.5],
    ['totalTokenCount', Number.POSITIVE_INFINITY],
    ['tokenPerCredit', 0],
    ['chargePerCredit', '100'],
    ['totalCredits', Number.NaN],
    ['unitsConsumed', '5'],
    ['totalCharge', -1],
    ['realCostPaise', '10'],
    ['ourChargePaise', Number.MAX_SAFE_INTEGER + 1],
    ['marginPaise', 0.5],
] as const) {
    assert.throws(
        () => buildAiOperationLog(base({ [field]: value })),
        /AI operation .+ is invalid/,
        `${field} must reject coercible or out-of-contract operation evidence`,
    );
}

assert.throws(
    () => buildAiOperationLog(base({
        geminiResponse: { usageMetadata: { totalTokenCount: '30' } },
    })),
    /total token count is invalid/,
    'provider usage metadata must preserve its exact numeric runtime type',
);

const summarized = buildAiOperationLog(base({
    clientResponse: { createdCount: 2, referencesCount: '3' },
})).clientResponse as Record<string, unknown>;
assert.equal(summarized.createdCount, 2);
assert.equal('referencesCount' in summarized, false, 'summary counts must not coerce string values');

console.log('AI operation log scalar boundary tests passed.');
