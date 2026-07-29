import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    AnswerlatticeGovernanceActionResultSchema,
    AnswerlatticeGovernanceActionSchema,
    AnswerlatticeStoredMutationProposalSchema,
} from '../../src/lib/answerlattice/governanceContracts';
import {
    normalizeAnswerlatticeResolvedEntityIds,
    replaceAnswerlatticeResolvedEntityReference,
} from '../../src/lib/answerlattice/governanceIdBoundary';

const requestId = 'request_12345678';
assert.deepEqual(
    normalizeAnswerlatticeResolvedEntityIds(['entity_1', 'entity_1', 'entity_2'], 2),
    ['entity_1', 'entity_2'],
);
assert.deepEqual(normalizeAnswerlatticeResolvedEntityIds(['entity_1'], 0), []);
assert.deepEqual(normalizeAnswerlatticeResolvedEntityIds(new Proxy([], {
    get() {
        throw new Error('entity list proxy must remain contained');
    },
}), 10), []);
const validMerge = AnswerlatticeGovernanceActionSchema.safeParse({
    action: 'merge_entities',
    mergedId: 'entity_merged',
    requestId,
    survivorId: 'entity_survivor',
});
assert.equal(validMerge.success, true, 'different valid entity IDs must be admitted');

const sameEntityMerge = AnswerlatticeGovernanceActionSchema.safeParse({
    action: 'merge_entities',
    mergedId: 'entity_same',
    requestId,
    survivorId: 'entity_same',
});
assert.equal(sameEntityMerge.success, false, 'an entity cannot be merged into itself');
if (!sameEntityMerge.success) {
    assert.deepEqual(sameEntityMerge.error.issues[0]?.path, ['mergedId']);
}

const unknownField = AnswerlatticeGovernanceActionSchema.safeParse({
    action: 'reject_proposal',
    proposalId: 'proposal_123',
    unexpected: true,
});
assert.equal(unknownField.success, false, 'governance actions must reject unknown fields');

const malformedAction = AnswerlatticeGovernanceActionSchema.safeParse({
    action: 'publish_without_review',
    requestId,
});
assert.equal(malformedAction.success, false, 'unknown governance actions must fail closed');

assert.equal(
    AnswerlatticeGovernanceActionSchema.safeParse({ action: 'evaluate_drift' }).success,
    true,
    'drift evaluation must be admitted without accepting a client-authored reason',
);
assert.equal(
    AnswerlatticeGovernanceActionSchema.safeParse({
        action: 'record_drift',
        answerId: 'answer_123',
        driftReason: '[scope_conflict] forged client reason',
    }).success,
    false,
    'clients must not be able to submit authoritative drift reasons',
);

const storedProposal = {
    id: 'proposal_123',
    pId: 'AL',
    tId: 10,
    sId: 20,
    targetAnswerId: '',
    relatedEntityIds: ['entity_123'],
    mutationType: 'new_answer_required',
    signalSummary: {
        ticketCount: 1,
        chatCount: 2,
        escalationCount: 1,
        negativeFeedbackRate: 0.25,
        exampleReferences: ['signal_123'],
    },
    suggestedChange: {
        draftTitle: 'Billing failed',
        draftStatus: 'generated',
        baseAnswerFingerprint: 'a'.repeat(64),
        structuredSummary: 'Check the failed invoice and retry the payment method.',
        detailedExplanation: 'Open Billing, inspect the failed invoice, and retry with an active payment method.',
        proposedEvidence: {
            sourceIds: ['source_123'],
            citations: [{
                id: 'citation_123',
                title: 'Failed invoice documentation',
                url: 'https://docs.example.com/billing/failed-invoices',
                sourceId: 'source_123',
            }],
        },
    },
    confidenceScore: 0.9,
    status: 'pending_review',
};
assert.equal(
    AnswerlatticeStoredMutationProposalSchema.safeParse(storedProposal).success,
    true,
    'a scoped stored proposal must validate before governance consumes it',
);
assert.equal(
    AnswerlatticeStoredMutationProposalSchema.safeParse({ ...storedProposal, pId: 'ML' }).success,
    false,
    'stored proposals from another product must fail closed',
);
assert.equal(
    AnswerlatticeStoredMutationProposalSchema.safeParse({ ...storedProposal, confidenceScore: 1.5 }).success,
    false,
    'stored proposal confidence must stay within its declared range',
);
assert.equal(
    AnswerlatticeStoredMutationProposalSchema.safeParse({
        ...storedProposal,
        signalSummary: {
            ...storedProposal.signalSummary,
            escalationCount: -1,
        },
    }).success,
    false,
    'stored proposal escalation evidence must be a bounded non-negative count',
);
assert.equal(
    AnswerlatticeStoredMutationProposalSchema.safeParse({
        ...storedProposal,
        suggestedChange: { ...storedProposal.suggestedChange, baseAnswerFingerprint: 'not-a-fingerprint' },
    }).success,
    false,
    'stored proposal base-answer fingerprints must use the full SHA-256 contract',
);
assert.equal(
    AnswerlatticeStoredMutationProposalSchema.safeParse({
        ...storedProposal,
        suggestedChange: {
            ...storedProposal.suggestedChange,
            proposedEvidence: {
                sourceIds: ['source_123'],
                citations: [{
                    title: 'Private documentation',
                    url: 'https://owner:secret@docs.example.com/private',
                }],
            },
        },
    }).success,
    false,
    'review proposals must reject citation URLs containing credentials',
);
assert.equal(
    AnswerlatticeGovernanceActionSchema.safeParse({
        action: 'approve_proposal',
        proposalId: 'proposal_123',
        editedContent: {
            title: 'Billing failed',
            structuredSummary: 'Check the failed invoice.',
            detailedExplanation: 'Open Billing and review the failed invoice.',
            citations: [{
                title: 'Failed invoice documentation',
                url: 'https://docs.example.com/billing/failed-invoices',
            }],
        },
    }).success,
    true,
    'reviewers must be able to approve bounded public citations explicitly',
);

const validResult = AnswerlatticeGovernanceActionResultSchema.safeParse({
    success: true,
    action: 'approve_proposal',
    proposalId: 'proposal_123',
    answerId: 'answer_123',
    status: 'implemented',
});
assert.equal(validResult.success, true, 'valid governance responses must be admitted');
assert.equal(
    AnswerlatticeGovernanceActionResultSchema.safeParse({
        success: true,
        action: 'evaluate_drift',
        evaluatedAnswers: 12,
        updatedAnswers: 3,
    }).success,
    true,
    'drift evaluation results must expose bounded evaluation and update counts',
);
assert.equal(
    AnswerlatticeGovernanceActionResultSchema.safeParse({
        success: true,
        action: 'approve_proposal',
        internalScope: { tId: 10, sId: 20 },
    }).success,
    false,
    'governance responses must reject undeclared internal fields',
);

assert.deepEqual(
    replaceAnswerlatticeResolvedEntityReference(
        ['entity_merged', 'entity_survivor', 'entity_other'],
        'entity_merged',
        'entity_survivor',
        10,
    ),
    ['entity_survivor', 'entity_other'],
    'entity merge must replace article references and deduplicate the surviving entity',
);
assert.equal(
    replaceAnswerlatticeResolvedEntityReference(
        ['entity_merged', 'invalid/path'],
        'entity_merged',
        'entity_survivor',
        10,
    ),
    null,
    'malformed stored article entity references must fail closed',
);
assert.equal(
    replaceAnswerlatticeResolvedEntityReference(
        ['entity_merged', 'entity_1', 'entity_2', 'entity_3', 'entity_4', 'entity_5', 'entity_6', 'entity_7', 'entity_8', 'entity_9', 'entity_10'],
        'entity_merged',
        'entity_survivor',
        10,
    ),
    null,
    'over-limit stored article entity references must fail closed instead of truncating silently',
);
assert.equal(
    replaceAnswerlatticeResolvedEntityReference(
        ['entity_merged', 'entity_merged'],
        'entity_merged',
        'entity_survivor',
        10,
    ),
    null,
    'duplicate stored article entity references must fail closed',
);

const mergeResult = AnswerlatticeGovernanceActionResultSchema.safeParse({
    success: true,
    action: 'merge_entities',
    transferredAnswers: 2,
    transferredArticles: 3,
    transferredFaqs: 1,
    transferredRelations: 1,
    transferredSurfaces: 2,
});
assert.equal(mergeResult.success, true, 'entity merge results must report every governed reference class');

const root = path.resolve(__dirname, '../..');
const governanceServerSource = fs.readFileSync(
    path.join(root, 'src/lib/answerlattice/governanceServer.ts'),
    'utf8',
);
assert.equal(
    governanceServerSource.includes(".where('entityIds', 'array-contains', mergedId)"),
    true,
    'entity merge must query articles linked to the merged entity',
);
assert.equal(
    governanceServerSource.includes('kb: changedArticles.length > 0'),
    true,
    'entity merge must invalidate KB-backed retrieval when article links change',
);
assert.equal(
    governanceServerSource.includes('faqs: changedFaqs.length > 0'),
    true,
    'entity merge must invalidate compiled FAQ truth when FAQ links change',
);
assert.equal(
    governanceServerSource.includes('surfaces: changedSurfaces.length > 0'),
    true,
    'entity merge must invalidate compiled product-surface truth when surface links change',
);
assert.equal(
    governanceServerSource.includes('prefixTokens: buildAnswerlatticeEntityPrefixTokens'),
    true,
    'entity merge must rebuild the survivor search index instead of changing synonyms alone',
);
assert.match(
    governanceServerSource,
    /survivorIndexes\.empty[\s\S]*deterministicSurvivorIndexSnapshot\.exists[\s\S]*!searchIndexIsOwnedBy/,
    'entity merge must reject a deterministic survivor search-index row outside exact ownership',
);
assert.match(
    governanceServerSource,
    /relationTargetSnapshots[\s\S]*!relationIsOwnedBy\(snapshot\.data\(\), scope, mutation\.target\.value\)/,
    'entity merge must reject deterministic relation targets outside exact ownership',
);
assert.equal(
    /transaction\.set\(db\.collection\(AUDIT_COLLECTION\)/.test(governanceServerSource),
    false,
    'deterministic governance audit rows must use create-only writes so collisions cannot be overwritten',
);
assert.match(
    governanceServerSource,
    /readInvalidationOwnership\(transaction, scope, invalidationOptions\)[\s\S]*addInvalidationWrites\(transaction, scope, invalidationOwnership, invalidationOptions\)/,
    'governance mutations must read transaction-current source, manifest and cache invalidation ownership before writes',
);
assert.equal(
    governanceServerSource.includes('Number(proposal.confidenceScore'),
    false,
    'proposal evidence scores must never be copied into canonical answer validation',
);
assert.equal(
    governanceServerSource.includes("validationSource: 'manual'"),
    true,
    'human approval must remain the canonical validation authority',
);

for (const indexPath of ['firestore.indexes.json', 'firestore-answerlattice.indexes.json']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, indexPath), 'utf8')) as {
        indexes?: Array<{
            collectionGroup?: string;
            fields?: Array<{ arrayConfig?: string; fieldPath?: string; order?: string }>;
        }>;
    };
    const mergeIndex = (manifest.indexes || []).find(index => (
        index.collectionGroup === 'kb_articles'
        && (index.fields || []).length === 4
        && (index.fields || []).some(field => field.fieldPath === 'entityIds' && field.arrayConfig === 'CONTAINS')
        && ['pId', 'tId', 'sId'].every(
            fieldPath => (index.fields || []).some(field => field.fieldPath === fieldPath && field.order === 'ASCENDING'),
        )
    ));
    assert(mergeIndex, `${indexPath} must include the scoped entity-merge article index.`);
}

process.stdout.write('Answerlattice governance contract tests passed.\n');
