#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { buildAiMenuManagerReceipt } from '../../src/lib/ai-menu-manager/receiptBuilder';
import { normalizeAiMenuManagerProposalSnapshot } from '../../src/lib/ai-menu-manager/proposalIntegrity';
import { buildExecutionId, buildProposalId, hashStableValue } from '../../src/lib/ai-menu-manager/idempotency';
import type { AiMenuManagerProposalDoc } from '../../src/types/aiMenuManager';

const tId = '921';
const sId = '922';
const projectId = 'proposal-integrity-project';
const sessionId = `amm2_${tId}_${sId}_2026-07-13_${projectId}`;
const idempotencyKey = 'proposal-integrity';
const patch = {
    kind: 'menu_settings_update' as const,
    menuSettings: { specialNote: 'Weekend only' },
};
const patchHash = hashStableValue(patch);
const proposalId = buildProposalId({
    tId,
    sId,
    projectId,
    idempotencyKey,
    actionType: 'menu_special_note_update',
    patchHash,
});
const scope = { type: 'project' as const, tId, sId, projectId, label: 'Integrity Store' };
const approvalPolicy = {
    level: 'confirm' as const,
    requiresApproval: true,
    reason: 'Menu truth changes only after approval.',
};
const beforeAfterSummary = {
    title: 'Update menu note',
    beforeValue: 'Open daily',
    afterValue: 'Weekend only',
};

function pendingProposal(): AiMenuManagerProposalDoc {
    return {
        proposalId,
        sessionId,
        tId,
        sId,
        projectId,
        actionType: 'menu_special_note_update',
        status: 'pending_approval',
        risk: 'low',
        approvalPolicy,
        entityRefs: [{ kind: 'project', id: projectId, label: 'Integrity Menu' }],
        scope,
        beforeAfterSummary,
        cardPayload: {
            cardId: proposalId,
            kind: 'proposal',
            actionType: 'menu_special_note_update',
            title: 'Update menu note',
            message: 'Review this change.',
            status: 'pending_approval',
            risk: 'low',
            approvalPolicy,
            scope,
            entityRefs: [{ kind: 'project', id: projectId, label: 'Integrity Menu' }],
            beforeAfterSummary,
            actions: ['approve', 'cancel', 'edit'],
            createdAt: '2026-07-13T10:00:00.000Z',
        },
        executionMode: 'client_project_mutation',
        executionStatus: 'not_started',
        patch,
        patchHash,
        baseProjectUpdatedAt: 'project-v1',
        baseProjectHash: hashStableValue({ projectId, version: 'project-v1' }),
        idempotencyKeys: [idempotencyKey],
        createdAt: new Date('2026-07-13T10:00:00.000Z'),
        updatedAt: { seconds: 1_784_000_000, nanoseconds: 0 },
        expiresAt: { toDate: () => new Date('2026-08-27T10:00:00.000Z') },
    };
}

function executingProposal(): AiMenuManagerProposalDoc {
    const proposal = pendingProposal();
    const executionId = buildExecutionId(proposalId, 'approval-key');
    return {
        ...proposal,
        status: 'executing',
        executionStatus: 'locked',
        cardPayload: { ...proposal.cardPayload, status: 'approved' },
        approvalRecord: {
            approvedBy: 'owner-1',
            approvedAt: new Date('2026-07-13T10:05:00.000Z'),
            action: 'approve',
        },
        executionDirective: {
            proposalId,
            executionId,
            actionType: proposal.actionType,
            scope,
            baseProjectUpdatedAt: proposal.baseProjectUpdatedAt,
            baseProjectHash: proposal.baseProjectHash,
            patchHash,
            patch,
            patchSummary: beforeAfterSummary,
            expiresAt: '2026-07-13T10:15:00.000Z',
        },
    };
}

function run(): void {
    const pending = pendingProposal();
    const normalized = normalizeAiMenuManagerProposalSnapshot({ ...pending, ignored: 'drop-me' }, proposalId);
    assert.ok(normalized, 'valid pending proposal must normalize');
    assert.equal('ignored' in (normalized as unknown as Record<string, unknown>), false, 'unknown fields must be dropped');
    assert.equal(normalized?.tId, tId);
    assert.equal(normalized?.cardPayload.scope.projectId, projectId);

    assert.equal(normalizeAiMenuManagerProposalSnapshot(pending, 'amm_prop_aaaaaaaaaaaaaaaaaaaaaaaaaaaa'), null);
    assert.equal(normalizeAiMenuManagerProposalSnapshot({ ...pending, proposalId: 'invalid' }, proposalId), null);
    assert.equal(normalizeAiMenuManagerProposalSnapshot({ ...pending, sessionId: 'invalid' }, proposalId), null);
    assert.equal(normalizeAiMenuManagerProposalSnapshot({ ...pending, tId: 'foreign' }, proposalId), null);
    assert.equal(normalizeAiMenuManagerProposalSnapshot({ ...pending, risk: 'high' }, proposalId), null);
    assert.equal(normalizeAiMenuManagerProposalSnapshot({
        ...pending,
        cardPayload: { ...pending.cardPayload, actionType: 'item_price_update' },
    }, proposalId), null);
    assert.equal(normalizeAiMenuManagerProposalSnapshot({
        ...pending,
        scope: { ...pending.scope, projectId: 'foreign-project' },
    }, proposalId), null);
    assert.equal(normalizeAiMenuManagerProposalSnapshot({ ...pending, patchHash: '0'.repeat(32) }, proposalId), null);
    assert.equal(normalizeAiMenuManagerProposalSnapshot({
        ...pending,
        patch: { kind: 'menu_settings_update', menuSettings: { unregistered: true } },
    }, proposalId), null);
    assert.equal(normalizeAiMenuManagerProposalSnapshot({ ...pending, idempotencyKeys: [] }, proposalId), null);
    assert.equal(normalizeAiMenuManagerProposalSnapshot({
        ...pending,
        createdAt: { toDate: () => { throw new Error('bad timestamp'); } },
    }, proposalId), null);
    assert.equal(normalizeAiMenuManagerProposalSnapshot({
        ...pending,
        status: 'executing',
        cardPayload: { ...pending.cardPayload, status: 'approved' },
        executionStatus: 'locked',
    }, proposalId), null, 'executing proposal without directive must fail closed');

    const executing = executingProposal();
    assert.ok(normalizeAiMenuManagerProposalSnapshot(executing, proposalId), 'coherent executing proposal must normalize');
    assert.equal(normalizeAiMenuManagerProposalSnapshot({
        ...executing,
        approvalRecord: undefined,
    }, proposalId), null);
    assert.equal(normalizeAiMenuManagerProposalSnapshot({
        ...executing,
        executionDirective: { ...executing.executionDirective!, executionId: 'amm_exec_wrong' },
    }, proposalId), null);
    assert.equal(normalizeAiMenuManagerProposalSnapshot({
        ...executing,
        executionDirective: {
            ...executing.executionDirective!,
            scope: { ...executing.executionDirective!.scope, sId: 'foreign' },
        },
    }, proposalId), null);
    assert.equal(normalizeAiMenuManagerProposalSnapshot({
        ...executing,
        executionDirective: {
            ...executing.executionDirective!,
            baseProjectHash: hashStableValue({ wrong: true }),
        },
    }, proposalId), null);

    const receipt = buildAiMenuManagerReceipt({
        proposalId,
        actionType: pending.actionType,
        projectId,
        status: 'executed',
        title: pending.cardPayload.title,
        message: 'Change applied.',
        executedAt: '2026-07-13T10:10:00.000Z',
    });
    const executed: AiMenuManagerProposalDoc = {
        ...executing,
        status: 'executed',
        executionStatus: 'executed',
        cardPayload: { ...executing.cardPayload, status: 'executed' },
        receipt,
    };
    assert.ok(normalizeAiMenuManagerProposalSnapshot(executed, proposalId), 'coherent terminal proposal must normalize');
    assert.equal(normalizeAiMenuManagerProposalSnapshot({ ...executed, receipt: undefined }, proposalId), null);
    assert.equal(normalizeAiMenuManagerProposalSnapshot({
        ...executed,
        receipt: { ...receipt, actionType: 'item_price_update' },
    }, proposalId), null);
    const cancelledReceipt = buildAiMenuManagerReceipt({
        proposalId,
        actionType: pending.actionType,
        projectId,
        status: 'cancelled',
        title: pending.cardPayload.title,
        message: 'No MenuList action was taken.',
        executedAt: '2026-07-13T10:11:00.000Z',
    });
    assert.equal(normalizeAiMenuManagerProposalSnapshot({
        ...pending,
        status: 'cancelled',
        cardPayload: { ...pending.cardPayload, status: 'cancelled' },
        receipt: cancelledReceipt,
    }, proposalId), null, 'server proposal snapshots must not inherit client-only cancelled receipts');
    assert.equal(normalizeAiMenuManagerProposalSnapshot({
        ...executed,
        receipt: { ...receipt, projectId: undefined },
    }, proposalId), null);
    assert.equal(normalizeAiMenuManagerProposalSnapshot({
        ...executed,
        executionStatus: 'failed',
    }, proposalId), null);

    console.log('AI Menu Manager proposal integrity tests passed');
}

run();
