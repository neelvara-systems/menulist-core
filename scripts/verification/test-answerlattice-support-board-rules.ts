#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { seedActiveAnswerlatticeRuleWorkspace } from './answerlattice-rule-test-fixtures';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-support-board-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const RULES_FILE = process.env.ANSWERLATTICE_RULES_FILE === 'firestore.rules'
    ? 'firestore.rules'
    : 'firestore-answerlattice.rules';

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, RULES_FILE), 'utf8') },
    });
    const cardPath = 'answerlattice_supportBoardCards/card-1';
    const initialStatus = {
        status: 'needs_triage',
        timestamp: Timestamp.now(),
        createdBy: {
            id: 'support-1',
            name: 'Support One',
            email: 'support@example.com',
        },
        remark: 'Card created',
    };
    try {
        await testEnv.withSecurityRulesDisabled(async context => {
            await seedActiveAnswerlatticeRuleWorkspace(context.firestore());
            await setDoc(doc(context.firestore(), cardPath), {
                pId: 'AL', tId: 1, sId: 101,
                title: 'Review support gap', description: '',
                status: 'needs_triage', priority: 'medium',
                sourceType: 'manual', sourceId: null,
                notes: [], notesCount: 0,
                statuses: [initialStatus],
                resolvedOn: null,
                resolvedBy: null,
                sourceCustomerName: 'Customer',
                sourceCustomerEmail: 'customer@example.com',
                sourceCustomerPhone: null,
                sourceCustomerUserId: null,
                sourceOrigin: 'https://app.example.com',
                sourcePath: '/billing',
                sourceSessionId: 'session-1',
                sourceIdentityRedactedAt: null,
                sourceIdentityRedactedBy: null,
                createdOn: Timestamp.now(),
                createdBy: 'Support One',
                modifiedOn: Timestamp.now(),
                modifiedBy: 'Support One',
                role: 'SUPPORT',
                uId: 'support-1',
            });
            await setDoc(doc(context.firestore(), 'platformSummary/supportBoardSummary_1_101'), {
                pId: 'AL', tId: 1, sId: 101,
                openCards: 1,
                needsAnswerCards: 0,
                highPriorityCards: 0,
                totalRecentCards: 1,
            });
            await setDoc(doc(context.firestore(), 'answerlattice_supportBoardCards/card-status-cap'), {
                pId: 'AL', tId: 1, sId: 101,
                title: 'Status history cap', description: '',
                status: 'needs_triage', priority: 'medium',
                sourceType: 'manual', sourceId: null,
                notes: [], notesCount: 0, lastNoteAt: null,
                statuses: Array.from({ length: 50 }, () => ({ ...initialStatus })),
                resolvedOn: null,
                resolvedBy: null,
                sourceIdentityRedactedAt: null,
                sourceIdentityRedactedBy: null,
                modifiedOn: Timestamp.now(),
                modifiedBy: 'Support One',
                role: 'SUPPORT',
                uId: 'support-1',
            });
        });
        const supportDb = testEnv.authenticatedContext('support-1', {
            tenantId: '1', storeId: '101', uId: 'support-1', canManageSupport: true,
        }).firestore();
        const governanceDb = testEnv.authenticatedContext('governance-1', {
            tenantId: '1', storeId: '101', uId: 'governance-1',
            canManageSupport: true, canManageGovernance: true,
        }).firestore();
        const unprivilegedDb = testEnv.authenticatedContext('staff-1', {
            tenantId: '1', storeId: '101', uId: 'staff-1', canManageSupport: false, canManageWidget: false,
        }).firestore();
        const widgetOnlyDb = testEnv.authenticatedContext('widget-1', {
            tenantId: '1', storeId: '101', uId: 'widget-1', canManageSupport: false, canManageWidget: true,
        }).firestore();
        const platformSupportDb = testEnv.authenticatedContext('platform-support-1', {
            platformRole: 'PLATFORM_SUPPORT',
        }).firestore();
        const otherDb = testEnv.authenticatedContext('support-2', {
            tenantId: '2', storeId: '202', uId: 'support-2', canManageSupport: true,
        }).firestore();

        await assertSucceeds(getDoc(doc(supportDb, cardPath)));
        await assertFails(getDoc(doc(unprivilegedDb, cardPath)));
        await assertFails(getDoc(doc(widgetOnlyDb, cardPath)));
        await assertFails(getDoc(doc(otherDb, cardPath)));
        await assertSucceeds(getDoc(doc(platformSupportDb, cardPath)));
        await assertSucceeds(getDoc(doc(supportDb, 'platformSummary/supportBoardSummary_1_101')));
        await assertFails(getDoc(doc(widgetOnlyDb, 'platformSummary/supportBoardSummary_1_101')));
        await assertSucceeds(getDoc(doc(platformSupportDb, 'platformSummary/supportBoardSummary_1_101')));
        await assertSucceeds(updateDoc(doc(supportDb, cardPath), {
            title: 'Review repeated billing gap',
            modifiedOn: Timestamp.now(),
            modifiedBy: 'Support One',
            role: 'SUPPORT',
            uId: 'support-1',
        }));
        await assertFails(updateDoc(doc(supportDb, cardPath), { status: 'needs_answer' }));
        await assertFails(updateDoc(doc(supportDb, cardPath), {
            statuses: [{
                ...initialStatus,
                remark: 'Rewritten status history',
            }],
        }));
        const nextStatus = {
            status: 'needs_answer',
            timestamp: Timestamp.now(),
            createdBy: {
                id: 'support-1',
                name: 'Support One',
                email: 'support@example.com',
            },
            remark: 'Needs a reviewed answer',
        };
        await assertSucceeds(updateDoc(doc(supportDb, cardPath), {
            status: 'needs_answer',
            statuses: [nextStatus, initialStatus],
            modifiedOn: Timestamp.now(),
            modifiedBy: 'Support One',
            role: 'SUPPORT',
            uId: 'support-1',
        }));
        await assertFails(updateDoc(doc(supportDb, cardPath), {
            status: 'draft_ready',
            statuses: [{
                ...nextStatus,
                status: 'draft_ready',
                createdBy: {
                    ...nextStatus.createdBy,
                    id: 'another-user',
                },
            }, nextStatus, initialStatus],
            modifiedOn: Timestamp.now(),
            modifiedBy: 'Support One',
            role: 'SUPPORT',
            uId: 'support-1',
        }));
        const note = {
            id: 'note-1',
            text: 'Check the current billing policy.',
            status: 'open',
            authorId: 'support-1',
            authorName: 'Support One',
            createdAt: Timestamp.now(),
        };
        await assertSucceeds(updateDoc(doc(supportDb, cardPath), {
            notes: [note],
            notesCount: 1,
            lastNoteAt: note.createdAt,
            modifiedOn: Timestamp.now(),
            modifiedBy: 'Support One',
            role: 'SUPPORT',
            uId: 'support-1',
        }));
        await assertFails(updateDoc(doc(supportDb, cardPath), {
            notes: [{ ...note, id: 'note-forged', authorId: 'another-user' }, note],
            notesCount: 2,
            lastNoteAt: note.createdAt,
            modifiedOn: Timestamp.now(),
            modifiedBy: 'Support One',
            role: 'SUPPORT',
            uId: 'support-1',
        }));
        await assertFails(updateDoc(doc(supportDb, cardPath), {
            notes: [{ ...note, text: 'Rewritten history' }],
            notesCount: 1,
        }));
        await assertFails(updateDoc(doc(supportDb, cardPath), {
            sourceCustomerEmail: 'different@example.com',
        }));
        await assertSucceeds(updateDoc(doc(supportDb, cardPath), {
            sourceCustomerName: null,
            sourceCustomerEmail: null,
            sourceCustomerPhone: null,
            sourceCustomerUserId: null,
            sourceOrigin: null,
            sourcePath: null,
            sourceSessionId: null,
            sourceIdentityRedactedAt: Timestamp.now(),
            sourceIdentityRedactedBy: 'Support One',
            modifiedOn: Timestamp.now(),
            modifiedBy: 'Support One',
            role: 'SUPPORT',
            uId: 'support-1',
        }));
        await assertFails(updateDoc(doc(supportDb, cardPath), {
            sourceCustomerEmail: 'restore@example.com',
        }));
        await assertFails(updateDoc(doc(supportDb, cardPath), {
            relatedProposalId: 'proposal-1',
            modifiedOn: Timestamp.now(),
            modifiedBy: 'Support One',
            role: 'SUPPORT',
            uId: 'support-1',
        }));
        await assertSucceeds(updateDoc(doc(governanceDb, cardPath), {
            relatedProposalId: 'proposal-1',
            modifiedOn: Timestamp.now(),
            modifiedBy: 'Governance One',
            role: 'MANAGER',
            uId: 'governance-1',
        }));
        await assertFails(updateDoc(doc(supportDb, cardPath), { tId: 2 }));
        await assertFails(updateDoc(doc(supportDb, cardPath), { sourceType: 'ticket', sourceId: 'ticket-1' }));
        await assertFails(updateDoc(doc(supportDb, cardPath), { notes: Array.from({ length: 26 }, (_, index) => ({ id: String(index) })), notesCount: 26 }));
        await assertFails(updateDoc(doc(supportDb, cardPath), { syncManaged: true }));
        await assertFails(deleteDoc(doc(supportDb, cardPath)));
        await assertFails(updateDoc(doc(supportDb, 'answerlattice_supportBoardCards/card-status-cap'), {
            status: 'needs_answer',
            statuses: [{ ...nextStatus }, ...Array.from({ length: 49 }, () => ({ ...initialStatus }))],
            resolvedOn: null,
            resolvedBy: null,
            modifiedOn: Timestamp.now(),
            modifiedBy: 'Support One',
            role: 'SUPPORT',
            uId: 'support-1',
        }));

        await assertSucceeds(setDoc(doc(supportDb, 'answerlattice_supportBoardCards/card-2'), {
            pId: 'AL', tId: 1, sId: 101,
            title: 'Manual support gap', description: '',
            status: 'needs_triage', priority: 'medium',
            sourceType: 'manual', sourceId: null,
            notes: [], notesCount: 0, lastNoteAt: null,
            statuses: [{
                status: 'needs_triage',
                timestamp: Timestamp.now(),
                createdBy: {
                    id: 'support-1',
                    name: 'Support One',
                    email: 'support@example.com',
                },
                remark: 'Card created',
            }],
            resolvedOn: null,
            resolvedBy: null,
            sourceIdentityRedactedAt: null,
            sourceIdentityRedactedBy: null,
            createdOn: Timestamp.now(),
            createdBy: 'Support One',
            modifiedOn: Timestamp.now(),
            modifiedBy: 'Support One',
            role: 'SUPPORT',
            uId: 'support-1',
        }));
        await assertFails(setDoc(doc(supportDb, 'answerlattice_supportBoardCards/card-resolved-at-create'), {
            pId: 'AL', tId: 1, sId: 101,
            title: 'Invalid resolved card', description: '',
            status: 'resolved', priority: 'medium',
            sourceType: 'manual', sourceId: null,
            notes: [], notesCount: 0, lastNoteAt: null,
            statuses: [{
                status: 'resolved',
                timestamp: Timestamp.now(),
                createdBy: {
                    id: 'support-1',
                    name: 'Support One',
                    email: 'support@example.com',
                },
                remark: 'Card created',
            }],
            resolvedOn: null,
            resolvedBy: null,
            sourceIdentityRedactedAt: null,
            sourceIdentityRedactedBy: null,
            createdOn: Timestamp.now(),
            createdBy: 'Support One',
            modifiedOn: Timestamp.now(),
            modifiedBy: 'Support One',
            role: 'SUPPORT',
            uId: 'support-1',
        }));
        await assertFails(setDoc(doc(supportDb, 'answerlattice_supportBoardCards/card-invalid-tags'), {
            pId: 'AL', tId: 1, sId: 101,
            title: 'Invalid tag shape', description: '',
            status: 'needs_triage', priority: 'medium',
            sourceType: 'manual', sourceId: null,
            tags: ['valid', { invalid: true }],
            notes: [], notesCount: 0, lastNoteAt: null,
            statuses: [{ ...initialStatus }],
            resolvedOn: null,
            resolvedBy: null,
            sourceIdentityRedactedAt: null,
            sourceIdentityRedactedBy: null,
            createdOn: Timestamp.now(),
            createdBy: 'Support One',
            modifiedOn: Timestamp.now(),
            modifiedBy: 'Support One',
            role: 'SUPPORT',
            uId: 'support-1',
        }));
        await assertFails(setDoc(doc(supportDb, 'answerlattice_supportBoardCards/card-forged-sync'), {
            pId: 'AL', tId: 1, sId: 101,
            title: 'Forged sync card', description: '',
            status: 'needs_triage', priority: 'medium',
            sourceType: 'signal', sourceId: 'signal-1',
            notes: [], notesCount: 0,
            statuses: [{
                status: 'needs_triage',
                timestamp: Timestamp.now(),
                createdBy: {
                    id: 'support-1',
                    name: 'Support One',
                    email: 'support@example.com',
                },
                remark: 'Card created',
            }],
            syncManaged: true,
            createdOn: Timestamp.now(),
            createdBy: 'Support One',
            modifiedOn: Timestamp.now(),
            modifiedBy: 'Support One',
            role: 'SUPPORT',
            uId: 'support-1',
        }));
        await assertFails(setDoc(doc(unprivilegedDb, 'answerlattice_supportBoardCards/card-2'), {
            pId: 'AL', tId: 1, sId: 101,
            title: 'Blocked', description: '', status: 'new_signals', priority: 'medium',
            sourceType: 'manual', sourceId: null, notes: [], notesCount: 0, lastNoteAt: null,
            statuses: [{
                status: 'new_signals',
                timestamp: Timestamp.now(),
                createdBy: {
                    id: 'staff-1',
                    name: 'Staff One',
                    email: 'staff@example.com',
                },
                remark: 'Card created',
            }],
            resolvedOn: null,
            resolvedBy: null,
            createdOn: Timestamp.now(),
            createdBy: 'Staff One',
            modifiedOn: Timestamp.now(),
            modifiedBy: 'Staff One',
            role: 'STAFF',
            uId: 'staff-1',
        }));
        console.log(`Answerlattice support-board rules passed for ${RULES_FILE}.`);
    } finally {
        await testEnv.cleanup();
    }
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
