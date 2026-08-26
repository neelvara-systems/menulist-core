#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { buildDailySessionId } from '../../src/lib/ai-menu-manager/idempotency';
import { buildAiMenuManagerReceipt } from '../../src/lib/ai-menu-manager/receiptBuilder';
import {
    AI_MENU_MANAGER_COMPACT_SESSION_MAX_BYTES,
    estimateAiMenuManagerSessionBytes,
    normalizeAiMenuManagerSessionSnapshot,
    prepareAiMenuManagerSessionWrite,
} from '../../src/lib/ai-menu-manager/sessionIntegrity';

const tId = '821';
const sId = '822';
const projectId = 'project';
const sessionDate = '2026-07-13';
const sessionId = buildDailySessionId({ tId, sId, projectId, sessionDate });
const createdAt = '2026-07-13T00:00:00.000Z';

function operation(operationId: string): Record<string, any> {
    return {
        operationId,
        commandGroupSize: 1,
        sessionId,
        tId,
        sId,
        projectId,
        card: {
            cardId: operationId,
            kind: 'proposal',
            actionType: 'menu_special_note_update',
            title: 'Update special note',
            message: 'Review this card.',
            status: 'pending_approval',
            risk: 'low',
            approvalPolicy: {
                level: 'confirm',
                requiresApproval: true,
                reason: 'Review the prepared change before it applies.',
            },
            scope: { type: 'project', tId, sId, projectId, label: 'Test menu' },
            entityRefs: [],
            beforeAfterSummary: { title: 'Special note update' },
            actions: ['approve', 'edit', 'cancel'],
            createdAt,
        },
        executionMode: 'client_project_mutation',
        patch: { kind: 'menu_settings_update', menuSettings: { specialNote: 'Lunch is ready.' } },
        patchHash: '0123456789abcdef',
        idempotencyKeys: [`key-${operationId}`],
        createdAt,
        updatedAt: createdAt,
    };
}

function validSession(): Record<string, any> {
    const receipt = buildAiMenuManagerReceipt({
        proposalId: 'completed-operation',
        actionType: 'menu_special_note_update',
        projectId,
        status: 'executed',
        title: 'Special note updated',
        message: 'Change applied.',
        executedAt: createdAt,
    });
    return {
        sessionId,
        tId,
        sId,
        projectId,
        sessionDate,
        storageMode: 'daily_compact',
        status: 'active',
        compactMessages: [{
            messageId: 'message-1', role: 'menu_manager', kind: 'reply', text: 'Ready.', createdAt,
        }],
        pendingCardSummaries: [{
            proposalId: 'operation-1',
            actionType: 'menu_special_note_update',
            title: 'Update special note',
            status: 'pending_approval',
            risk: 'low',
            projectId,
            updatedAt: createdAt,
        }],
        pendingOperations: [operation('operation-1')],
        recentReceiptSummaries: [receipt],
        counters: {
            commands: 4,
            proposalsCreated: 3,
            approvals: 2,
            executions: 1,
            deterministicRoutes: 4,
        },
        artifactRefs: [{ assetId: 'asset-1', storagePath: 'safe/path.png' }],
        createdAt,
        updatedAt: createdAt,
        injected: 'must be removed',
    };
}

const normalized = normalizeAiMenuManagerSessionSnapshot(validSession());
assert.ok(normalized);
assert.equal(normalized.tId, tId);
assert.equal(normalized.sId, sId);
assert.equal(normalized.pendingOperations?.length, 1);
assert.equal(normalized.hasPendingOperations, true);
assert.equal(normalized.pendingCount, 1);
assert.equal(normalized.pendingOperations?.[0].commandGroupSize, undefined);
assert.equal(normalized.counters.commands, 4);
assert.equal(normalized.counters.compoundCommands, 0);
assert.equal('injected' in normalized, false, 'unknown top-level fields must not survive normalization');

const forgedProposalBacking = validSession();
forgedProposalBacking.pendingOperations[0].proposalApiBacked = true;
assert.equal(
    normalizeAiMenuManagerSessionSnapshot(forgedProposalBacking)?.pendingOperations?.[0].proposalApiBacked,
    undefined,
    'persisted compact operations must not self-assert proposal API backing',
);

assert.equal(normalizeAiMenuManagerSessionSnapshot({
    ...validSession(),
    hasPendingOperations: false,
    pendingCount: 0,
}), null, 'persisted pending-state metadata must agree with canonical pending operations');

const malformedCard = validSession();
delete malformedCard.pendingOperations[0].card.actions;
assert.equal(normalizeAiMenuManagerSessionSnapshot(malformedCard)?.pendingOperations?.length, 0);

const incoherentCard = validSession();
incoherentCard.pendingOperations[0].card.kind = 'manual_task';
assert.equal(normalizeAiMenuManagerSessionSnapshot(incoherentCard)?.pendingOperations?.length, 0);

const incompletePatch = validSession();
delete incompletePatch.pendingOperations[0].patchHash;
assert.equal(normalizeAiMenuManagerSessionSnapshot(incompletePatch)?.pendingOperations?.length, 0);

const invalidSingleGroupSize = validSession();
invalidSingleGroupSize.pendingOperations[0].commandGroupSize = 2;
assert.equal(normalizeAiMenuManagerSessionSnapshot(invalidSingleGroupSize)?.pendingOperations?.length, 0);

const grouped = validSession();
grouped.pendingOperations = [operation('group-1'), operation('group-2')].map((entry) => ({
    ...entry,
    commandGroupId: 'command-group',
    commandGroupSize: 2,
}));
assert.equal(normalizeAiMenuManagerSessionSnapshot(grouped)?.pendingOperations?.length, 2);

const crossScope = validSession();
crossScope.pendingOperations[0].sId = '999';
assert.equal(normalizeAiMenuManagerSessionSnapshot(crossScope)?.pendingOperations?.length, 0);

const unknownAction = validSession();
unknownAction.pendingOperations[0].card.actionType = 'invented_action';
assert.equal(normalizeAiMenuManagerSessionSnapshot(unknownAction)?.pendingOperations?.length, 0);

const duplicatedOperations = validSession();
duplicatedOperations.pendingOperations = [operation('operation-1'), operation('operation-1')];
assert.equal(
    normalizeAiMenuManagerSessionSnapshot(duplicatedOperations)?.pendingOperations?.length,
    0,
    'all copies of a duplicate operation ID must be discarded',
);

const malformedNested = validSession();
malformedNested.compactMessages.push({
    messageId: 'bad-message', role: 'unknown', kind: 'reply', text: 'Unsafe', createdAt,
});
malformedNested.recentReceiptSummaries.push({
    ...malformedNested.recentReceiptSummaries[0],
    receiptId: 'not-derived-from-proposal',
});
const normalizedNested = normalizeAiMenuManagerSessionSnapshot(malformedNested);
assert.equal(normalizedNested?.compactMessages.length, 1);
assert.equal(normalizedNested?.recentReceiptSummaries.length, 1);

const malformedCounters = validSession();
malformedCounters.counters = {
    commands: '4',
    proposalsCreated: -1,
    approvals: Number.NaN,
    executions: 1_000_000_001,
    deterministicRoutes: 6,
    unknownCounter: 99,
};
assert.deepEqual(normalizeAiMenuManagerSessionSnapshot(malformedCounters)?.counters, {
    commands: 0,
    proposalsCreated: 0,
    approvals: 0,
    executions: 0,
    compoundCommands: 0,
    deterministicRoutes: 6,
    plannerAttempts: 0,
    plannerAccepted: 0,
    plannerFallbacks: 0,
    clarifications: 0,
});

assert.equal(normalizeAiMenuManagerSessionSnapshot({ ...validSession(), sessionDate: '2026-02-30' }), null);
assert.equal(normalizeAiMenuManagerSessionSnapshot({ ...validSession(), sessionId: 'amm_bad' }), null);
assert.equal(normalizeAiMenuManagerSessionSnapshot({ ...validSession(), projectId: 'other-project' }), null);
assert.equal(normalizeAiMenuManagerSessionSnapshot({ ...validSession(), storageMode: 'unknown' }), null);
assert.equal(normalizeAiMenuManagerSessionSnapshot({ ...validSession(), status: 'unknown' }), null);

const tooManyMessages = validSession();
tooManyMessages.compactMessages = Array.from({ length: 30 }, (_, index) => ({
    messageId: `message-${index}`, role: 'owner', text: `Message ${index}`, createdAt,
}));
const bounded = normalizeAiMenuManagerSessionSnapshot(tooManyMessages);
assert.equal(bounded?.compactMessages.length, 20);
assert.equal(bounded?.compactMessages[0].messageId, 'message-10');

const boundedReceipt = buildAiMenuManagerReceipt({
    proposalId: 'operation-2',
    actionType: 'menu_special_note_update',
    projectId,
    status: 'executed',
    title: `  ${'T'.repeat(200)}  `,
    message: `  ${'M'.repeat(600)}  `,
    executedAt: 'not-a-date',
});
assert.equal(boundedReceipt.title.length, 160);
assert.equal(boundedReceipt.message.length, 500);
assert.equal(new Date(boundedReceipt.executedAt).toISOString(), boundedReceipt.executedAt);
assert.ok(boundedReceipt.receiptId.startsWith('operation-2:executed:'));
const cancelledReceipt = buildAiMenuManagerReceipt({
    proposalId: 'operation-3',
    actionType: 'menu_special_note_update',
    projectId,
    status: 'cancelled',
    title: 'Update cancelled',
    message: 'No MenuList action was taken.',
    executedAt: createdAt,
});
assert.equal(
    normalizeAiMenuManagerSessionSnapshot({
        ...validSession(),
        recentReceiptSummaries: [cancelledReceipt],
    })?.recentReceiptSummaries[0]?.status,
    'cancelled',
    'compact-session normalization must preserve canonical cancellation evidence for retry recovery',
);
assert.throws(() => buildAiMenuManagerReceipt({
    proposalId: ' operation-2 ',
    actionType: 'menu_special_note_update',
    status: 'executed',
    title: 'Title',
    message: 'Message',
}), /Invalid proposal ID/);

const oversizedHistory = {
    ...normalized,
    compactMessages: Array.from({ length: 20 }, (_, index) => ({
        messageId: `large-${index}`,
        role: 'owner' as const,
        text: 'x'.repeat(50_000),
        createdAt,
    })),
};
const compacted = prepareAiMenuManagerSessionWrite(oversizedHistory);
assert.ok(estimateAiMenuManagerSessionBytes(compacted) <= AI_MENU_MANAGER_COMPACT_SESSION_MAX_BYTES);
assert.equal(compacted.pendingOperations?.length, 1, 'size compaction must never remove pending work');
assert.ok(compacted.compactMessages.length < oversizedHistory.compactMessages.length);

assert.throws(() => prepareAiMenuManagerSessionWrite({
    ...normalized,
    compactMessages: [],
    recentReceiptSummaries: [],
    artifactRefs: [],
    pendingCardSummaries: [{ proposalId: 'oversized-pending' } as any],
    pendingOperations: [{ operationId: 'oversized-pending', payload: 'x'.repeat(AI_MENU_MANAGER_COMPACT_SESSION_MAX_BYTES) } as any],
}), /Finish or cancel an existing Menu Manager card/);

process.stdout.write('AI Menu Manager compact-session integrity tests passed.\n');
