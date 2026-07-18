#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import {
    approveAiMenuManagerProposal,
    assertAiMenuManagerCommandProposalIdentity,
    completeAiMenuManagerProposal,
    getAiMenuManagerProject,
    getAiMenuManagerInbox,
    persistAiMenuManagerCommand,
} from '../../src/database/aiMenuManager/server';
import { firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';
import { buildAiMenuManagerContextBaseHash, buildAiMenuManagerContextPacket } from '../../src/lib/ai-menu-manager/contextPacket';
import { buildDailySessionId, buildProposalId, hashStableValue } from '../../src/lib/ai-menu-manager/idempotency';
import { normalizeAiMenuManagerSessionSnapshot } from '../../src/lib/ai-menu-manager/sessionIntegrity';
import type { Project } from '../../src/components/templates/main-app/projects/types';
import type {
    AiMenuManagerCardPayload,
    AiMenuManagerProjectPatch,
    AiMenuManagerProposalDoc,
} from '../../src/types/aiMenuManager';

const tId = 821;
const sId = 822;
const projectId = 'amm-emulator-project';
const sessionDate = '2026-07-13';
const sessionId = buildDailySessionId({ tId, sId, projectId, sessionDate });
const sessionRef = firestoreAdmin.collection(DB_COLLECTIONS.AI_MENU_MANAGER_SESSIONS).doc(sessionId);
const projectRef = firestoreAdmin
    .collection(DB_COLLECTIONS.PROJECTS)
    .doc(String(tId))
    .collection(String(sId))
    .doc(projectId);

const patch: AiMenuManagerProjectPatch = {
    kind: 'menu_settings_update',
    menuSettings: { specialNote: 'Weekend service only' },
};
const patchHash = hashStableValue(patch);

function project(modifiedOn: string, specialNote = 'Open daily'): Project {
    return {
        projectId,
        name: { en: 'AMM Test Menu' },
        defaultLanguage: 'en',
        languages: ['en'],
        files: [],
        menuSettings: { specialNote },
        modifiedOn,
        tId,
        sId,
    } as unknown as Project;
}

function card(proposalId: string, status: AiMenuManagerProposalDoc['status'] = 'pending_approval'): AiMenuManagerCardPayload {
    return {
        cardId: proposalId,
        kind: 'proposal',
        actionType: 'menu_special_note_update',
        title: 'Update menu note',
        message: 'Review the new menu note.',
        status,
        risk: 'low',
        approvalPolicy: {
            level: 'confirm',
            requiresApproval: true,
            reason: 'Menu truth changes only after approval.',
        },
        scope: {
            type: 'project',
            tId,
            sId,
            projectId,
            label: 'AMM Test Store',
        },
        entityRefs: [{ kind: 'project', id: projectId, label: 'AMM Test Menu' }],
        beforeAfterSummary: {
            title: 'Update menu note',
            beforeValue: 'Open daily',
            afterValue: 'Weekend service only',
        },
        actions: ['approve', 'cancel', 'edit'],
        createdAt: new Date().toISOString(),
    };
}

function proposal(params: {
    idempotencyKey: string;
    projectValue: Project;
    status?: AiMenuManagerProposalDoc['status'];
}): AiMenuManagerProposalDoc {
    const proposalId = buildProposalId({
        tId,
        sId,
        projectId,
        idempotencyKey: params.idempotencyKey,
        actionType: 'menu_special_note_update',
        patchHash,
    });
    const cardPayload = card(proposalId, params.status);
    const context = buildAiMenuManagerContextPacket({
        project: params.projectValue,
        storeName: cardPayload.scope.label,
    });
    return {
        proposalId,
        sessionId,
        tId,
        sId,
        projectId,
        actionType: 'menu_special_note_update',
        status: params.status || 'pending_approval',
        risk: 'low',
        approvalPolicy: cardPayload.approvalPolicy,
        entityRefs: cardPayload.entityRefs,
        scope: cardPayload.scope,
        beforeAfterSummary: cardPayload.beforeAfterSummary,
        cardPayload,
        executionMode: 'client_project_mutation',
        executionStatus: 'not_started',
        patch,
        patchHash,
        baseProjectUpdatedAt: context.projectUpdatedAt,
        baseProjectHash: buildAiMenuManagerContextBaseHash(context),
        idempotencyKeys: [params.idempotencyKey],
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

async function seedSession(proposalIds: string[]): Promise<void> {
    await sessionRef.set({
        sessionId,
        tId: String(tId),
        sId: String(sId),
        projectId,
        sessionDate,
        storageMode: 'daily_compact',
        status: 'active',
        compactMessages: [],
        pendingCardSummaries: proposalIds.map((proposalId) => ({
            proposalId,
            actionType: 'menu_special_note_update',
            title: 'Update menu note',
            status: 'pending_approval',
            risk: 'low',
            projectId,
            updatedAt: new Date().toISOString(),
        })),
        hasPendingOperations: proposalIds.length > 0,
        pendingCount: new Set(proposalIds).size,
        recentReceiptSummaries: [],
        counters: {
            commands: 1,
            proposalsCreated: proposalIds.length,
            approvals: 0,
            executions: 0,
            compoundCommands: 2,
            deterministicRoutes: 3,
            plannerAttempts: 4,
            plannerAccepted: 1,
            plannerFallbacks: 3,
            clarifications: 2,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    });
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');

    const baseProject = project('2026-07-13T00:00:01.000Z');
    await projectRef.set(baseProject);

    await projectRef.set({
        ...baseProject,
        files: { malformed: true },
    });
    assert.equal(
        await getAiMenuManagerProject({ tId, sId, projectId }),
        null,
        'Admin project reads must reject malformed persisted runtime shape',
    );
    await projectRef.set(baseProject);
    assert.equal(
        (await getAiMenuManagerProject({ tId, sId, projectId }))?.projectId,
        projectId,
        'valid project reads must recover after malformed data is replaced',
    );

    const ownProposal = proposal({ idempotencyKey: 'own-proposal', projectValue: baseProject });
    const arbitrarySessionId = 'amm_aaaaaaaaaaaaaaaaaaaaaaaa';
    await assert.rejects(
        persistAiMenuManagerCommand({
            sessionId: arbitrarySessionId,
            sessionDate,
            storageMode: 'daily_compact',
            tId,
            sId,
            projectId,
            ownerText: 'Update menu note',
            messageId: 'amm_msg_arbitrary_session',
            card: ownProposal.cardPayload,
            proposal: ownProposal,
        }),
        /Session identity mismatch/,
    );
    assert.equal(
        (await firestoreAdmin.collection(DB_COLLECTIONS.AI_MENU_MANAGER_SESSIONS).doc(arbitrarySessionId).get()).exists,
        false,
        'arbitrary session IDs must not create compact session documents',
    );
    await sessionRef.set({
        sessionId,
        tId,
        sId,
        projectId: 'different-project',
        sessionDate,
        storageMode: 'daily_compact',
        status: 'active',
        compactMessages: [],
        pendingCardSummaries: [],
        recentReceiptSummaries: [],
        counters: { commands: 0, proposalsCreated: 0, approvals: 0, executions: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    await assert.rejects(
        persistAiMenuManagerCommand({
            sessionId,
            sessionDate,
            storageMode: 'daily_compact',
            tId,
            sId,
            projectId,
            ownerText: 'Update menu note',
            messageId: 'amm_msg_mismatched_session',
            card: ownProposal.cardPayload,
            proposal: ownProposal,
        }),
        /Invalid session data/,
    );
    await sessionRef.delete();

    assert.doesNotThrow(() => assertAiMenuManagerCommandProposalIdentity({
        existing: ownProposal,
        expected: ownProposal,
    }));
    const conflictingProposal = {
        ...ownProposal,
        sessionId: buildDailySessionId({
            tId,
            sId,
            projectId,
            sessionDate: '2026-07-12',
        }),
    };
    assert.throws(
        () => assertAiMenuManagerCommandProposalIdentity({
            existing: conflictingProposal,
            expected: ownProposal,
        }),
        /Proposal identity mismatch/,
    );
    const ownProposalRef = firestoreAdmin
        .collection(DB_COLLECTIONS.AI_MENU_MANAGER_PROPOSALS)
        .doc(ownProposal.proposalId);
    await ownProposalRef.set(conflictingProposal);
    await assert.rejects(
        persistAiMenuManagerCommand({
            sessionId,
            sessionDate,
            storageMode: 'daily_compact',
            tId,
            sId,
            projectId,
            ownerText: 'Update menu note',
            messageId: 'amm_msg_conflicting_retry',
            card: ownProposal.cardPayload,
            proposal: ownProposal,
        }),
        /Proposal identity mismatch/,
    );
    assert.equal(
        (await sessionRef.get()).exists,
        false,
        'a conflicting deterministic proposal must not create or mutate the current compact session',
    );
    await ownProposalRef.delete();

    await ownProposalRef.set(ownProposal);

    const foreignProposalId = buildProposalId({
        tId: 991,
        sId: 992,
        projectId: 'foreign-project',
        idempotencyKey: 'foreign-proposal',
        actionType: 'menu_special_note_update',
        patchHash,
    });
    await firestoreAdmin.collection(DB_COLLECTIONS.AI_MENU_MANAGER_PROPOSALS).doc(foreignProposalId).set({
        ...ownProposal,
        proposalId: foreignProposalId,
        sessionId: 'amm_aaaaaaaaaaaaaaaaaaaaaaaa',
        tId: 991,
        sId: 992,
        projectId: 'foreign-project',
        cardPayload: {
            ...ownProposal.cardPayload,
            cardId: foreignProposalId,
            scope: {
                ...ownProposal.cardPayload.scope,
                tId: 991,
                sId: 992,
                projectId: 'foreign-project',
            },
        },
    });
    const malformedProposal = proposal({ idempotencyKey: 'malformed-proposal', projectValue: baseProject });
    await firestoreAdmin.collection(DB_COLLECTIONS.AI_MENU_MANAGER_PROPOSALS).doc(malformedProposal.proposalId).set({
        ...malformedProposal,
        status: 'executing',
        executionStatus: 'locked',
        cardPayload: { ...malformedProposal.cardPayload, status: 'approved' },
    });
    await seedSession([
        ownProposal.proposalId,
        foreignProposalId,
        malformedProposal.proposalId,
        ownProposal.proposalId,
    ]);

    const inbox = await getAiMenuManagerInbox({ sessionId, tId, sId, projectId });
    assert.deepEqual(
        inbox.cards.map((entry) => entry.cardId),
        [ownProposal.proposalId],
        'inbox hydration must deduplicate refs and reject foreign or malformed proposal truth',
    );
    const nextDaySessionId = buildDailySessionId({
        tId,
        sId,
        projectId,
        sessionDate: '2026-07-14',
    });
    const pendingQuery = await firestoreAdmin
        .collection(DB_COLLECTIONS.AI_MENU_MANAGER_SESSIONS)
        .where('tId', '==', String(tId))
        .where('sId', '==', String(sId))
        .where('projectId', '==', projectId)
        .where('hasPendingOperations', '==', true)
        .orderBy('updatedAt', 'desc')
        .limit(1)
        .get();
    assert.equal(pendingQuery.size, 1, 'latest-pending query must return the scoped unresolved session');
    assert.ok(
        normalizeAiMenuManagerSessionSnapshot(pendingQuery.docs[0].data()),
        'latest-pending query result must pass compact-session normalization',
    );
    const recoveredInbox = await getAiMenuManagerInbox({
        sessionId: nextDaySessionId,
        tId,
        sId,
        projectId,
    });
    assert.equal(recoveredInbox.sessionId, sessionId, 'a new day must recover the latest scoped unresolved session');
    assert.deepEqual(
        recoveredInbox.cards.map((entry) => entry.cardId),
        [ownProposal.proposalId],
        'cross-day recovery must preserve normal proposal integrity filtering',
    );
    await assert.rejects(
        approveAiMenuManagerProposal({
            proposalId: malformedProposal.proposalId,
            tId,
            sId,
            idempotencyKey: 'approve-malformed',
            userId: 'owner-1',
        }),
        /Invalid proposal data/,
    );
    assert.equal(
        (await firestoreAdmin.collection(DB_COLLECTIONS.AI_MENU_MANAGER_PROPOSALS).doc(malformedProposal.proposalId).get()).data()?.executionDirective,
        undefined,
        'malformed persisted proposal must not be repaired or mutated by an approval attempt',
    );

    const staleProposal = proposal({ idempotencyKey: 'stale-approval', projectValue: baseProject });
    await firestoreAdmin.collection(DB_COLLECTIONS.AI_MENU_MANAGER_PROPOSALS).doc(staleProposal.proposalId).set(staleProposal);
    await projectRef.set(project('2026-07-13T00:00:02.000Z'));
    await assert.rejects(
        approveAiMenuManagerProposal({
            proposalId: staleProposal.proposalId,
            tId,
            sId,
            idempotencyKey: 'approve-stale',
            userId: 'owner-1',
        }),
        /Menu changed/,
    );
    assert.equal(
        (await firestoreAdmin.collection(DB_COLLECTIONS.AI_MENU_MANAGER_PROPOSALS).doc(staleProposal.proposalId).get()).data()?.status,
        'pending_approval',
        'stale approval must not lock a directive',
    );

    const executableProject = project('2026-07-13T00:00:03.000Z');
    await projectRef.set(executableProject);
    const executableProposal = proposal({ idempotencyKey: 'concurrent-completion', projectValue: executableProject });
    const executableProposalRef = firestoreAdmin
        .collection(DB_COLLECTIONS.AI_MENU_MANAGER_PROPOSALS)
        .doc(executableProposal.proposalId);
    await executableProposalRef.set(executableProposal);
    await seedSession([executableProposal.proposalId]);
    const approval = await approveAiMenuManagerProposal({
        proposalId: executableProposal.proposalId,
        tId,
        sId,
        idempotencyKey: 'approve-current',
        userId: 'owner-1',
    });
    await projectRef.set(project('2026-07-13T00:00:04.000Z', 'Weekend service only'));

    const completionInput = {
        proposalId: executableProposal.proposalId,
        tId,
        sId,
        projectId,
        actionType: 'menu_special_note_update' as const,
        executionId: approval.directive.executionId,
        patchHash,
    };
    const completions = await Promise.all([
        completeAiMenuManagerProposal({
            ...completionInput,
            result: 'executed',
            message: 'Executed contender',
            idempotencyKey: 'complete-executed',
        }),
        completeAiMenuManagerProposal({
            ...completionInput,
            result: 'failed',
            message: 'Failed contender',
            idempotencyKey: 'complete-failed',
        }),
    ]);
    const persisted = (await executableProposalRef.get()).data() as AiMenuManagerProposalDoc;
    assert.ok(persisted.receipt, 'one terminal receipt must be persisted');
    completions.forEach((completion) => {
        assert.equal(completion.status, persisted.status, 'concurrent retry must return persisted terminal status');
        assert.equal(completion.receipt.receiptId, persisted.receipt?.receiptId, 'concurrent retry must return persisted receipt');
    });
    assert.equal(
        (await sessionRef.get()).data()?.recentReceiptSummaries?.length,
        1,
        'concurrent completion must append one compact receipt',
    );
    assert.equal(
        (await sessionRef.get()).data()?.counters?.plannerAttempts,
        4,
        'server approval/completion must preserve route-quality counters',
    );
    assert.equal((await sessionRef.get()).data()?.hasPendingOperations, false);
    assert.equal((await sessionRef.get()).data()?.pendingCount, 0);

    await assert.rejects(
        completeAiMenuManagerProposal({
            ...completionInput,
            executionId: 'amm_exec_wrong',
            result: 'executed',
            idempotencyKey: 'complete-wrong-directive',
        }),
        /Execution directive mismatch/,
    );

    console.log('AI Menu Manager emulator verification passed');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
