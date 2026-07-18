import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG,
    ANSWERLATTICE_EMBEDDING_VERSION,
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
assert.equal(ANSWERLATTICE_EMBEDDING_VERSION, 'v1');
assert.equal(ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG.model, 'gemini-embedding-2');
assert.equal(ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG.vectorField, 'embedding');
assert.equal(ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG.outputDimensionality, 768);
assert.equal(ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG.cacheVersion, 'gemini-embedding-2:768:v1');
assert.equal(sharedContract.includes('gemini-embedding-001'), false);
assert.equal(sharedContract.includes('taskType'), false);
assert.equal(sharedContract.includes('embeddingV2'), false);

const queryRequest = buildAnswerlatticeEmbeddingRequest({
    content: 'How do I retry a failed invoice?',
    purpose: 'query',
});
assert.equal(queryRequest.contents, 'task: question answering | query: How do I retry a failed invoice?');
assert.equal('taskType' in queryRequest.config, false, 'Embedding 2 must not receive taskType.');

const documentRequest = buildAnswerlatticeEmbeddingRequest({
    content: 'Open Billing and retry with an active payment method.',
    purpose: 'document',
    title: 'Fix a failed invoice',
});
assert.equal(
    documentRequest.contents,
    'title: Fix a failed invoice | text: Open Billing and retry with an active payment method.',
);
assert.equal('taskType' in documentRequest.config, false, 'Embedding 2 documents must not receive taskType.');

const runtimePaths = [
    'src/constants/AI/models.ts',
    'src/constants/answerlattice/ai.ts',
    'src/lib/answerlattice/articleEmbeddingServer.ts',
    'src/lib/search/searchCore.ts',
    'src/lib/vectorEmbeddings/index.ts',
    'functions/src/constants/ai.ts',
    'functions/src/logic/articleEmbedding.ts',
    'functions/src/logic/startGeneration.ts',
    'functions/src/utils/aiUtils.ts',
    'functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts',
    'functions-answerlattice/src/logic/articleEmbedding.ts',
    'functions-answerlattice/src/logic/startGeneration.ts',
    'functions-answerlattice/src/utils/aiUtils.ts',
];
for (const runtimePath of runtimePaths) {
    const source = fs.readFileSync(path.join(root, runtimePath), 'utf8');
    assert.equal(source.includes('gemini-embedding-001'), false, `${runtimePath} must not use the retired embedding model.`);
    assert.equal(source.includes('embeddingV2'), false, `${runtimePath} must not retain the migration-only vector field.`);
    assert.equal(source.includes('includeLegacy'), false, `${runtimePath} must not retain legacy dual-write controls.`);
    assert.equal(source.includes('embedding_v2_migration'), false, `${runtimePath} must not retain the corpus migration task.`);
    assert.equal(source.includes('taskType'), false, `${runtimePath} must use embedding purpose rather than legacy taskType.`);
}
assert.equal(
    fs.existsSync(path.join(root, 'functions-answerlattice/src/answerlattice/embeddingV2Migration.ts')),
    false,
    'The pre-launch embedding contract must not retain a backfill worker.',
);

for (const indexPath of ['firestore.indexes.json', 'firestore-answerlattice.indexes.json']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, indexPath), 'utf8')) as {
        indexes?: Array<{ collectionGroup?: string; fields?: Array<{ fieldPath?: string; vectorConfig?: unknown }> }>;
    };
    const vectorFields = (manifest.indexes || [])
        .filter(index => index.collectionGroup === 'kb_articles')
        .flatMap(index => index.fields || [])
        .filter(field => field.vectorConfig)
        .map(field => field.fieldPath);
    assert.deepEqual(vectorFields, ['embedding'], `${indexPath} must keep one canonical KB vector index.`);
}

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
