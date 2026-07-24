#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { AI_ACTIONS_TYPES } from '../../src/constants/common';
import {
    type AiOperationLogInput,
    buildAiOperationDocument,
    buildAiOperationLog,
} from '../../src/lib/ai/operationLog';

const forgedCreatedOn = '2000-01-01T00:00:00.000Z';
const withAdversarialFields = {
    action: AI_ACTIONS_TYPES.IMAGE_GENERATION,
    articleId: 'article_123',
    billingMode: 'billable',
    byteSize: 1024,
    clientResponse: { createdCount: 1 },
    createdOn: forgedCreatedOn,
    generationConfig: { systemInstruction: 'raw private prompt' },
    itemSummary: { name: 'private item' },
    processingTime: 25,
    rating: 5,
    rawProviderResponse: { text: 'raw generated text' },
    source: 'boundary_test',
    sourceHash: 'private-source-hash',
    tokenCountSource: 'provider',
    unitsConsumed: 1,
} as AiOperationLogInput;

const projected = buildAiOperationLog(withAdversarialFields);
assert.equal(projected.articleId, 'article_123');
assert.equal(projected.byteSize, 1024);
assert.equal(projected.processingTime, 25);
assert.equal(projected.tokenCountSource, 'provider');
for (const forbidden of [
    'createdOn',
    'generationConfig',
    'itemSummary',
    'rating',
    'rawProviderResponse',
    'sourceHash',
]) {
    assert.equal(forbidden in projected, false, `${forbidden} must not cross the operation document projector`);
}

const document = buildAiOperationDocument({
    ...withAdversarialFields,
    pId: 'ML',
    tId: 1,
    sId: 2,
}) as Record<string, unknown>;
assert.equal(typeof (document.createdOn as { toMillis?: unknown })?.toMillis, 'function');
assert.notEqual(document.createdOn, forgedCreatedOn);
assert.equal(document.detailRetentionDays, 0);
assert.equal('detailExpiresAt' in document, false);
assert.equal('rawProviderResponse' in document, false);

for (const [field, value] of [
    ['action', 123],
    ['articleId', 'x'.repeat(257)],
    ['billingMode', 'auto'],
    ['byteSize', '1024'],
    ['createdBy', ''],
    ['fileId', 1],
    ['model', 'x'.repeat(181)],
    ['processingTime', -1],
    ['projectId', {}],
    ['source', 'x'.repeat(181)],
    ['tokenCountSource', 'guessed'],
    ['uId', 'x'.repeat(257)],
] as const) {
    assert.throws(
        () => buildAiOperationLog({
            action: AI_ACTIONS_TYPES.IMAGE_GENERATION,
            [field]: value,
        } as AiOperationLogInput),
        /AI operation .+ is invalid/,
        `${field} must reject malformed top-level metadata`,
    );
}

console.log('AI operation document boundary tests passed.');
