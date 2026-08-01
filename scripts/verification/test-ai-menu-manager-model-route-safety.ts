import assert from 'node:assert/strict';
import {
    assertAiMenuManagerModelRouteIsSafe,
    type AiMenuManagerModelRouteResult,
} from '@lib/ai-menu-manager/modelRouter/routerOutcomeSchema';
import {
    AiMenuManagerPlannerResponseSchema,
    normalizeAiMenuManagerCommandResponse,
    normalizeAiMenuManagerInboxResponse,
    normalizeAiMenuManagerProposalActionResponse,
    normalizeAiMenuManagerProposalCompleteResponse,
} from '@lib/ai-menu-manager/schemas';
import { buildDailySessionId, hashStableValue } from '@lib/ai-menu-manager/idempotency';
import { buildAiMenuManagerReceipt } from '@lib/ai-menu-manager/receiptBuilder';

const answer: AiMenuManagerModelRouteResult = {
    outcome: 'answer',
    ownerReply: 'Your menu is ready.',
    provider: 'deterministic',
    safety: {
        mutatesTruth: false,
        reason: 'Read-only response.',
        requiresApproval: false,
    },
};
assert.doesNotThrow(() => assertAiMenuManagerModelRouteIsSafe(answer));

const prepared: AiMenuManagerModelRouteResult = {
    actionType: 'item_price_update',
    outcome: 'prepare_action',
    ownerReply: 'Review this price change.',
    provider: 'cloud_planner',
    safety: {
        mutatesTruth: true,
        reason: 'Prepared owner-approved action.',
        requiresApproval: true,
    },
};
assert.doesNotThrow(() => assertAiMenuManagerModelRouteIsSafe(prepared));
assert.equal(AiMenuManagerPlannerResponseSchema.safeParse({ route: answer }).success, true);
assert.equal(AiMenuManagerPlannerResponseSchema.safeParse({ route: prepared }).success, true);
assert.equal(AiMenuManagerPlannerResponseSchema.safeParse({ route: null }).success, true);

[
    { ...answer, safety: { ...answer.safety, mutatesTruth: true } },
    { ...answer, safety: { ...answer.safety, requiresApproval: true } },
    { ...answer, actionType: 'item_price_update' as const },
    { ...prepared, safety: { ...prepared.safety, mutatesTruth: false } },
    { ...prepared, safety: { ...prepared.safety, requiresApproval: false } },
    { ...prepared, actionType: undefined },
    { ...answer, toolName: 'write_firestore' as never },
].forEach((result) => {
    assert.throws(() => assertAiMenuManagerModelRouteIsSafe(result));
    assert.equal(AiMenuManagerPlannerResponseSchema.safeParse({ route: result }).success, false);
});

assert.equal(AiMenuManagerPlannerResponseSchema.safeParse({}).success, false);
assert.equal(AiMenuManagerPlannerResponseSchema.safeParse({ route: { ...answer, ownerReply: '' } }).success, false);
assert.equal(AiMenuManagerPlannerResponseSchema.safeParse({
    route: { ...answer, provider: 'unknown_provider' },
}).success, false);

const responseScope = {
    tId: '821',
    sId: '822',
    projectId: 'project',
};
const sessionDate = '2026-07-30';
const sessionId = buildDailySessionId({ ...responseScope, sessionDate });
const proposalId = `amm_prop_${'a'.repeat(28)}`;
const createdAt = '2026-07-30T00:00:00.000Z';
const card = {
    cardId: proposalId,
    kind: 'proposal',
    actionType: 'menu_special_note_update',
    title: 'Update special note',
    message: 'Review this card.',
    status: 'pending_approval',
    risk: 'low',
    approvalPolicy: {
        level: 'confirm',
        requiresApproval: true,
        reason: 'Review the prepared change.',
    },
    scope: { type: 'project', ...responseScope, label: 'Test menu' },
    entityRefs: [],
    beforeAfterSummary: { title: 'Special note update' },
    actions: ['approve', 'edit', 'cancel'],
    createdAt,
};
const commandResponse = {
    sessionId,
    messageId: 'message-1',
    cards: [card],
    nextRequiredAction: 'owner_approval',
};
assert.ok(normalizeAiMenuManagerCommandResponse(commandResponse, {
    ...responseScope,
    expectedSessionId: sessionId,
}));
assert.equal(normalizeAiMenuManagerCommandResponse({
    ...commandResponse,
    cards: [{ ...card, scope: { ...card.scope, sId: '999' } }],
}, {
    ...responseScope,
    expectedSessionId: sessionId,
}), null, 'command responses must reject cross-store cards');
assert.equal(normalizeAiMenuManagerCommandResponse({
    ...commandResponse,
    nextRequiredAction: 'approve_everything',
}, {
    ...responseScope,
    expectedSessionId: sessionId,
}), null, 'command responses must reject unknown workflow states');
assert.equal(normalizeAiMenuManagerCommandResponse({
    ...commandResponse,
    nextRequiredAction: 'none',
}, {
    ...responseScope,
    expectedSessionId: sessionId,
}), null, 'command responses must correlate required action with canonical cards');

assert.ok(normalizeAiMenuManagerInboxResponse({
    session: null,
    sessionId,
    cards: [card],
    receipts: [],
}, {
    ...responseScope,
    expectedSessionId: sessionId,
}));
assert.equal(normalizeAiMenuManagerInboxResponse({
    session: null,
    sessionId: buildDailySessionId({ ...responseScope, sessionDate: '2026-07-29' }),
    cards: [card],
    receipts: [],
}, {
    ...responseScope,
    expectedSessionId: sessionId,
}), null, 'inbox responses must bind the exact requested session');

const patch = {
    kind: 'menu_settings_update' as const,
    menuSettings: { specialNote: 'Lunch is ready.' },
};
const patchHash = hashStableValue(patch);
const actionResponse = {
    data: {
        directive: {
            proposalId,
            executionId: `amm_exec_${'b'.repeat(28)}`,
            actionType: 'menu_special_note_update',
            scope: card.scope,
            patchHash,
            patch,
            patchSummary: card.beforeAfterSummary,
            expiresAt: '2026-07-30T00:10:00.000Z',
        },
        proposal: {
            proposalId,
            actionType: 'menu_special_note_update',
            status: 'executing',
        },
    },
};
assert.ok(normalizeAiMenuManagerProposalActionResponse(actionResponse, {
    ...responseScope,
    action: 'approve',
    actionType: 'menu_special_note_update',
    proposalId,
}));
assert.equal(normalizeAiMenuManagerProposalActionResponse({
    ...actionResponse,
    data: {
        ...actionResponse.data,
        directive: {
            ...actionResponse.data.directive,
            patchHash: '0'.repeat(32),
        },
    },
}, {
    ...responseScope,
    action: 'approve',
    actionType: 'menu_special_note_update',
    proposalId,
}), null, 'approval responses must reject a directive whose hash does not match its patch');
assert.deepEqual(normalizeAiMenuManagerProposalActionResponse({
    data: { status: 'cancelled' },
}, {
    ...responseScope,
    action: 'cancel',
    proposalId,
}), {
    data: { status: 'cancelled' },
});

const receipt = buildAiMenuManagerReceipt({
    proposalId,
    actionType: 'menu_special_note_update',
    projectId: responseScope.projectId,
    status: 'executed',
    title: 'Special note updated',
    message: 'Change applied.',
    executedAt: createdAt,
});
assert.ok(normalizeAiMenuManagerProposalCompleteResponse({
    data: { status: 'executed', receipt, verified: true },
}, {
    actionType: 'menu_special_note_update',
    projectId: responseScope.projectId,
    proposalId,
}));
assert.equal(normalizeAiMenuManagerProposalCompleteResponse({
    data: { status: 'executed', receipt, verified: false },
}, {
    actionType: 'menu_special_note_update',
    projectId: responseScope.projectId,
    proposalId,
}), null, 'completion responses must correlate verified truth with terminal status');

console.log('AI Menu Manager model-route safety tests passed.');
