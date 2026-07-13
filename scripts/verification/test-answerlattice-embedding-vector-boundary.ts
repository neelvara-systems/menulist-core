import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG,
    ANSWERLATTICE_EMBEDDING_CONFIGS,
    buildAnswerlatticeEmbeddingRequest,
} from '../../src/data/shared/answerlatticeEmbedding';
import {
    getReusableEmbeddingVectorDimensions,
    isValidGeneratedEmbeddingVector,
} from '../../functions-answerlattice/src/logic/embeddingVectorBoundary';
import { isValidGeneratedEmbeddingVector as isValidSharedGeneratedEmbeddingVector } from '../../functions/src/logic/embeddingVectorBoundary';
import { getAnswerlatticeEmbeddingInput } from '../../functions-answerlattice/src/logic/embeddingSourceBoundary';
import { getAnswerlatticeEmbeddingInput as getSharedAnswerlatticeEmbeddingInput } from '../../functions/src/logic/embeddingSourceBoundary';

const content = {
    type: 'doc',
    content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'This article body is deliberately long enough for the embedding contract.' }],
    }],
};

const root = path.resolve(__dirname, '../..');
const sharedContract = fs.readFileSync(path.join(root, 'src/data/shared/answerlatticeEmbedding.ts'), 'utf8');
assert.equal(
    fs.readFileSync(path.join(root, 'functions/src/sharedData/answerlatticeEmbedding.ts'), 'utf8'),
    sharedContract,
    'MenuList compatibility Functions must mirror the embedding registry byte-for-byte.',
);
assert.equal(
    fs.readFileSync(path.join(root, 'functions-answerlattice/src/sharedData/answerlatticeEmbedding.ts'), 'utf8'),
    sharedContract,
    'Answerlattice Functions must mirror the embedding registry byte-for-byte.',
);
assert.equal(ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG, ANSWERLATTICE_EMBEDDING_CONFIGS.v2);
assert.equal(ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG.model, 'gemini-embedding-2');
assert.equal(ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG.vectorField, 'embeddingV2');
assert.equal(ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG.outputDimensionality, 768);

const v2QueryRequest = buildAnswerlatticeEmbeddingRequest({
    content: 'How do I retry a failed invoice?',
    purpose: 'query',
    version: 'v2',
});
assert.equal(v2QueryRequest.contents, 'task: question answering | query: How do I retry a failed invoice?');
assert.equal('taskType' in v2QueryRequest.config, false, 'Embedding 2 must not receive taskType.');

const v2DocumentRequest = buildAnswerlatticeEmbeddingRequest({
    content: 'Open Billing and retry with an active payment method.',
    purpose: 'document',
    title: 'Fix a failed invoice',
    version: 'v2',
});
assert.equal(
    v2DocumentRequest.contents,
    'title: Fix a failed invoice | text: Open Billing and retry with an active payment method.',
);
assert.equal('taskType' in v2DocumentRequest.config, false, 'Embedding 2 documents must not receive taskType.');

const v1DocumentRequest = buildAnswerlatticeEmbeddingRequest({
    content: 'Legacy rollback text',
    purpose: 'document',
    title: 'Legacy article',
    version: 'v1',
});
assert.equal(v1DocumentRequest.config.taskType, 'RETRIEVAL_DOCUMENT');
assert.equal(v1DocumentRequest.contents, 'Legacy rollback text');

const dedicatedInput = getAnswerlatticeEmbeddingInput({
    categoryTitle: 'Billing',
    sectionTitle: 'Invoices',
    title: 'Fix a failed invoice',
    content,
});
const sharedInput = getSharedAnswerlatticeEmbeddingInput({
    categoryTitle: 'Billing',
    sectionTitle: 'Invoices',
    title: 'Fix a failed invoice',
    content,
});
assert(dedicatedInput);
assert.deepEqual(sharedInput, dedicatedInput, 'Shared and dedicated embedding source contracts must stay identical.');
assert.equal(getAnswerlatticeEmbeddingInput({ categoryTitle: 'Billing', title: {}, content }), null);
assert.equal(getAnswerlatticeEmbeddingInput({ categoryTitle: 'Billing', title: 'Short', content: { type: 'doc', content: [] } }), null);

assert.equal(getReusableEmbeddingVectorDimensions({ values: [0.1, 0.2] }), 2);
assert.equal(getReusableEmbeddingVectorDimensions({ _values: [0.1, -0.2] }), 2);
assert.equal(getReusableEmbeddingVectorDimensions({ toArray: () => [0.1, 0.2, 0.3] }), 3);

for (const invalid of [
    null,
    undefined,
    [],
    {},
    { values: [] },
    { values: [0, 0] },
    { values: [Number.NaN, 1] },
    { values: [Number.POSITIVE_INFINITY, 1] },
    { values: ['1', 2] },
    { toArray: () => { throw new Error('malformed vector'); } },
]) {
    assert.equal(getReusableEmbeddingVectorDimensions(invalid), 0);
}

for (const isValid of [isValidGeneratedEmbeddingVector, isValidSharedGeneratedEmbeddingVector]) {
    assert.equal(isValid([0.1, -0.2], 2), true);
    assert.equal(isValid([0, 0], 2), false);
    assert.equal(isValid([Number.NaN, 1], 2), false);
    assert.equal(isValid([Number.POSITIVE_INFINITY, 1], 2), false);
    assert.equal(isValid(['0.1', 1], 2), false);
    assert.equal(isValid([0.1], 2), false);
}

console.log('Answerlattice embedding vector boundary tests passed');
