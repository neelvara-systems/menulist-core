import assert from 'node:assert/strict';
import {
    AnswerlatticeGovernanceActionResultSchema,
    AnswerlatticeGovernanceActionSchema,
    AnswerlatticeStoredMutationProposalSchema,
} from '../../src/lib/answerlattice/governanceContracts';

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

process.stdout.write('Answerlattice governance contract tests passed.\n');
