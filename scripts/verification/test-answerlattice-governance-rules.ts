#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    doc,
    getDoc,
    setDoc,
    Timestamp,
    updateDoc,
    writeBatch,
} from 'firebase/firestore';
import { seedActiveAnswerlatticeRuleWorkspace } from './answerlattice-rule-test-fixtures';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-governance-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const NOW = Timestamp.fromMillis(1_700_000_000_000);
const RULES_FILE = process.env.ANSWERLATTICE_RULES_FILE === 'firestore.rules'
    ? 'firestore.rules'
    : 'firestore-answerlattice.rules';

const canonicalAnswer = (overrides: Record<string, unknown> = {}) => ({
    pId: 'AL',
    tId: 1,
    sId: 101,
    title: 'Update a payment method',
    slug: 'update-a-payment-method',
    status: 'active',
    answerType: 'explanation',
    scope: { entityIds: ['billing'] },
    productBinding: {
        introducedInVersion: 1,
        lastValidatedInVersion: 1,
        applicableVersions: { from: 1, to: null },
    },
    content: {
        structuredSummary: 'Open Billing and choose an active payment method.',
        detailedExplanation: 'Open Billing, select Payment methods, and choose an active payment method for the subscription.',
    },
    governance: { driftFlag: false, reviewRequired: false },
    createdOn: NOW,
    modifiedOn: NOW,
    ...overrides,
});

const pendingProposal = (overrides: Record<string, unknown> = {}) => ({
    pId: 'AL',
    tId: 1,
    sId: 101,
    targetAnswerId: '',
    relatedEntityIds: ['billing'],
    mutationType: 'new_answer_required',
    signalSummary: {
        ticketCount: 1,
        chatCount: 0,
        negativeFeedbackRate: 0,
        exampleReferences: ['ticket_1'],
    },
    suggestedChange: {
        draftTitle: 'Update a payment method',
        draftStatus: 'pending',
        draftSource: 'ticket_resolution',
    },
    confidenceScore: 0.6,
    status: 'pending_review',
    createdOn: NOW,
    modifiedOn: NOW,
    createdBy: 'owner-1',
    modifiedBy: 'owner-1',
    ...overrides,
});

const auditLog = (action: string, overrides: Record<string, unknown> = {}) => ({
    pId: 'AL',
    tId: 1,
    sId: 101,
    action,
    entityType: 'mutationProposal',
    entityId: 'proposal_1',
    performedBy: 'owner-1',
    timestamp: NOW,
    ...overrides,
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: fs.readFileSync(path.join(ROOT, RULES_FILE), 'utf8'),
        },
    });

    try {
        const ownerDb = testEnv.authenticatedContext('owner-1', {
            role: 'OWNER',
            storeId: '101',
            tenantId: '1',
            uId: 'owner-1',
        }).firestore();
        const otherWorkspaceDb = testEnv.authenticatedContext('owner-2', {
            role: 'OWNER',
            storeId: '202',
            tenantId: '2',
            uId: 'owner-2',
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-1', {
            platformRole: 'PLATFORM',
            uId: 'platform-1',
        }).firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const adminDb = context.firestore();
            await seedActiveAnswerlatticeRuleWorkspace(adminDb);
            await setDoc(
                doc(adminDb, 'answerlattice_canonicalAnswers', 'answer_existing'),
                canonicalAnswer(),
            );
            await setDoc(doc(adminDb, 'answerlattice_entities', 'billing'), {
                pId: 'AL', tId: 1, sId: 101, name: 'Billing', status: 'active',
            });
            await setDoc(doc(adminDb, 'answerlattice_entities', 'other_billing'), {
                pId: 'AL', tId: 2, sId: 202, name: 'Other billing', status: 'active',
            });
            await setDoc(
                doc(adminDb, 'answerlattice_mutationProposals', 'proposal_existing'),
                pendingProposal(),
            );
            await setDoc(
                doc(adminDb, 'answerlattice_canonicalAnswers', 'answer_wrong_product'),
                canonicalAnswer({ pId: 'ML' }),
            );
        });

        await assertSucceeds(getDoc(doc(ownerDb, 'answerlattice_canonicalAnswers', 'answer_existing')));
        await assertFails(getDoc(doc(otherWorkspaceDb, 'answerlattice_canonicalAnswers', 'answer_existing')));
        await assertFails(getDoc(doc(ownerDb, 'answerlattice_canonicalAnswers', 'answer_wrong_product')));

        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_canonicalAnswers', 'answer_direct_create'),
            canonicalAnswer(),
        ));
        await assertFails(updateDoc(
            doc(ownerDb, 'answerlattice_canonicalAnswers', 'answer_existing'),
            { title: 'Direct browser edit', modifiedOn: NOW },
        ));
        await assertFails(setDoc(
            doc(platformDb, 'answerlattice_canonicalAnswers', 'answer_platform_client_create'),
            canonicalAnswer(),
        ));

        await assertSucceeds(setDoc(
            doc(ownerDb, 'answerlattice_mutationProposals', 'proposal_pending'),
            pendingProposal(),
        ));
        await assertSucceeds((async () => {
            const batch = writeBatch(ownerDb);
            batch.set(
                doc(ownerDb, 'answerlattice_mutationProposals', 'almp_manual_test'),
                pendingProposal({ requestId: 'support_board_card_1' }),
            );
            batch.set(
                doc(ownerDb, 'answerlattice_auditLogs', 'manual_created_almp_manual_test'),
                auditLog('mutation_proposal_created_manual', {
                    entityId: 'almp_manual_test',
                    previousState: null,
                    newState: { mutationType: 'new_answer_required' },
                }),
            );
            return batch.commit();
        })());
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_mutationProposals', 'proposal_preapproved'),
            pendingProposal({ status: 'approved' }),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_mutationProposals', 'proposal_bad_confidence'),
            pendingProposal({ confidenceScore: 1.2 }),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_mutationProposals', 'proposal_no_entity'),
            pendingProposal({ relatedEntityIds: [] }),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_mutationProposals', 'proposal_unknown_entity'),
            pendingProposal({ relatedEntityIds: ['missing_entity'] }),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_mutationProposals', 'proposal_other_entity'),
            pendingProposal({ relatedEntityIds: ['other_billing'] }),
        ));
        await assertFails(setDoc(
            doc(otherWorkspaceDb, 'answerlattice_mutationProposals', 'proposal_cross_workspace'),
            pendingProposal(),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_mutationProposals', 'proposal_wrong_product'),
            pendingProposal({ pId: 'ML' }),
        ));
        await assertFails(updateDoc(
            doc(ownerDb, 'answerlattice_mutationProposals', 'proposal_existing'),
            { status: 'approved', modifiedOn: NOW },
        ));

        await assertSucceeds(setDoc(
            doc(ownerDb, 'answerlattice_auditLogs', 'client_note'),
            auditLog('entity_candidate_review_note'),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_auditLogs', 'forged_canonical_update'),
            auditLog('canonical_answer_updated'),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_auditLogs', 'forged_ticket_merge'),
            auditLog('ticket_knowledge_evidence_merged'),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_auditLogs', 'forged_public_api_rotation'),
            auditLog('public_api_key_rotated'),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_auditLogs', 'forged_public_api_revocation'),
            auditLog('public_api_key_revoked'),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_auditLogs', 'forged_support_truth_export'),
            auditLog('support_truth_export_generated'),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'answerlattice_auditLogs', 'missing_action'),
            {
                pId: 'AL',
                tId: 1,
                sId: 101,
                entityType: 'mutationProposal',
                entityId: 'proposal_1',
                performedBy: 'owner-1',
                timestamp: NOW,
            },
        ));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('Answerlattice governance Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
