import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    AnswerlatticeGovernanceActionResultSchema,
    AnswerlatticeGovernanceActionSchema,
    AnswerlatticeStoredMutationProposalSchema,
} from '../../src/lib/answerlattice/governanceContracts';
import { replaceAnswerlatticeResolvedEntityReference } from '../../src/lib/answerlattice/governanceIdBoundary';

const requestId = 'request_12345678';
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
        negativeFeedbackRate: 0.25,
        exampleReferences: ['signal_123'],
    },
    suggestedChange: {
        draftTitle: 'Billing failed',
        draftStatus: 'generated',
        structuredSummary: 'Check the failed invoice and retry the payment method.',
        detailedExplanation: 'Open Billing, inspect the failed invoice, and retry with an active payment method.',
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
    transferredRelations: 1,
});
assert.equal(mergeResult.success, true, 'entity merge results must report transferred article references');

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
