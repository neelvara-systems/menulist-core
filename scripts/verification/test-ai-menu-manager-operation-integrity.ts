#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    assertAiMenuManagerPreparedOperationGroup,
    resolveCurrentAiMenuManagerOperation,
    resolveCurrentAiMenuManagerOperationGroup,
} from '../../src/lib/ai-menu-manager/pendingOperationIntegrity';
import type { AiMenuManagerPendingOperation } from '../../src/types/aiMenuManager';

function operation(params: {
    id: string;
    groupId?: string;
    groupSize?: number;
    kind?: 'proposal' | 'manual_task';
    title?: string;
}): AiMenuManagerPendingOperation {
    const kind = params.kind || 'proposal';
    return {
        operationId: params.id,
        commandGroupId: params.groupId,
        commandGroupSize: params.groupSize,
        sessionId: 'amm2_821_822_2026-07-13_project',
        tId: 821,
        sId: 822,
        projectId: 'project',
        card: {
            cardId: params.id,
            kind,
            actionType: kind === 'manual_task' ? 'system_manual_task_create' : 'menu_special_note_update',
            title: params.title || params.id,
            message: 'Review this card.',
            status: kind === 'manual_task' ? 'manual_task' : 'pending_approval',
            risk: 'low',
            approvalPolicy: {
                level: kind === 'manual_task' ? 'none' : 'confirm',
                requiresApproval: kind !== 'manual_task',
                reason: 'Test policy.',
            },
            scope: {
                type: 'project',
                tId: 821,
                sId: 822,
                projectId: 'project',
                label: 'Test project',
            },
            entityRefs: [],
            beforeAfterSummary: { title: 'Test update' },
            actions: kind === 'manual_task' ? ['mark_done', 'cancel'] : ['approve', 'cancel'],
            createdAt: '2026-07-13T00:00:00.000Z',
        },
        executionMode: kind === 'manual_task' ? 'manual_task' : 'client_project_mutation',
        idempotencyKeys: [`key-${params.id}`],
        createdAt: '2026-07-13T00:00:00.000Z',
        updatedAt: '2026-07-13T00:00:00.000Z',
    };
}

const persistedProposal = operation({ id: 'operation-a', title: 'Persisted proposal' });
const forgedManualTask = operation({ id: 'operation-a', kind: 'manual_task', title: 'Forged manual task' });
assert.equal(
    resolveCurrentAiMenuManagerOperation({
        currentOperations: [persistedProposal],
        requestedOperation: forgedManualTask,
    }),
    persistedProposal,
    'completion must use the current persisted operation body instead of caller-supplied card data',
);
assert.throws(
    () => resolveCurrentAiMenuManagerOperation({
        currentOperations: [],
        requestedOperation: persistedProposal,
    }),
    /Card no longer matches/,
);
assert.throws(
    () => resolveCurrentAiMenuManagerOperation({
        currentOperations: [persistedProposal, { ...persistedProposal }],
        requestedOperation: persistedProposal,
    }),
    /Card no longer matches/,
    'corrupt duplicate persisted IDs must fail closed',
);

const groupA = operation({ id: 'group-a', groupId: 'group-1', groupSize: 2 });
const groupB = operation({ id: 'group-b', groupId: 'group-1', groupSize: 2 });
assert.equal(assertAiMenuManagerPreparedOperationGroup([groupA, groupB]), 'group-1');
assert.throws(
    () => assertAiMenuManagerPreparedOperationGroup([groupA, { ...groupB, commandGroupSize: 3 }]),
    /Prepared updates no longer match/,
    'grouped project saves must reject incomplete or inconsistent groups before mutation',
);
assert.throws(
    () => assertAiMenuManagerPreparedOperationGroup([groupA, { ...groupB, sId: 999 }]),
    /Prepared updates no longer match/,
    'grouped project saves must reject mixed scope before mutation',
);
assert.deepEqual(
    resolveCurrentAiMenuManagerOperationGroup({
        currentOperations: [groupA, groupB],
        requestedOperations: [
            { ...groupB, card: { ...groupB.card, title: 'Caller-mutated title' } },
            groupA,
        ],
    }),
    [groupB, groupA],
    'group completion must preserve requested order while returning canonical persisted bodies',
);
assert.throws(
    () => resolveCurrentAiMenuManagerOperationGroup({
        currentOperations: [groupA, groupB],
        requestedOperations: [groupA, groupA],
    }),
    /Prepared updates no longer match/,
    'duplicate requested IDs must not create duplicate receipts or counter increments',
);
assert.throws(
    () => resolveCurrentAiMenuManagerOperationGroup({
        currentOperations: [groupA, groupB],
        requestedOperations: [groupA, operation({ id: 'missing', groupId: 'group-1', groupSize: 2 })],
    }),
    /Prepared updates no longer match/,
);
assert.throws(
    () => resolveCurrentAiMenuManagerOperationGroup({
        currentOperations: [groupA, groupB, operation({ id: 'group-c', groupId: 'group-1', groupSize: 3 })],
        requestedOperations: [groupA, groupB],
    }),
    /Prepared updates no longer match/,
    'partial completion of a currently pending group must fail closed',
);
assert.throws(
    () => resolveCurrentAiMenuManagerOperationGroup({
        currentOperations: [groupA, { ...groupB, commandGroupSize: 3 }],
        requestedOperations: [groupA, groupB],
    }),
    /Prepared updates no longer match/,
    'inconsistent persisted group-size metadata must fail closed',
);

process.stdout.write('AI Menu Manager pending-operation integrity tests passed.\n');
