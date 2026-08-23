#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import {
    ANSWERLATTICE_TICKET_DOCUMENT_LIMIT,
    ANSWERLATTICE_TICKET_MESSAGE_LIMIT,
    ANSWERLATTICE_TICKET_STATUS_HISTORY_LIMIT,
} from '@lib/answerlattice/supportTicketLifecycle';
import { seedActiveAnswerlatticeRuleWorkspace } from './answerlattice-rule-test-fixtures';

const ROOT = path.resolve(__dirname, '..', '..');
const RULES_FILE = process.env.ANSWERLATTICE_RULES_FILE || 'firestore-answerlattice.rules';
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-ticket-rules';
const NOW = Timestamp.fromMillis(1_700_000_000_000);

const actor = { id: 'owner-1', name: 'Owner', email: 'owner@example.com' };
const statusEntry = (status: string, createdBy = actor) => ({ status, timestamp: NOW, createdBy, remark: `Status ${status}` });
const message = (id: string, type: 'user' | 'system' = 'user') => ({
    id,
    text: type === 'system' ? 'Status changed' : 'Reply',
    type,
    sender: actor,
    timestamp: NOW,
});
const ticketDocument = (index: number) => ({
    name: `file-${index}.txt`,
    size: 1,
    type: 'text/plain',
    uid: `upload-${index}`,
    url: `https://firebasestorage.googleapis.com/v0/b/demo/o/supportTickets%2Fdocuments%2F${index}?alt=media`,
});
const ticket = (overrides: Record<string, unknown> = {}) => ({
    pId: 'AL',
    tId: 1,
    sId: 101,
    subject: 'Billing question',
    status: 'Open',
    priority: 'Normal',
    category: 'Billing Inquiry',
    message: 'Please help.',
    documents: [],
    platformNotes: '',
    platformTags: [],
    contextKeys: ['billing'],
    deleted: false,
    statuses: [statusEntry('Open')],
    messages: [],
    createdOn: NOW,
    modifiedOn: NOW,
    createdBy: 'Owner',
    modifiedBy: 'Owner',
    uId: 'owner-1',
    ...overrides,
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, RULES_FILE), 'utf8') },
    });

    try {
        const ownerDb = testEnv.authenticatedContext('owner-1', {
            role: 'OWNER',
            tenantId: '1',
            storeId: '101',
            uId: 'owner-1',
        }).firestore();
        const numericOwnerDb = testEnv.authenticatedContext('firebase-owner-numeric', {
            role: 'OWNER',
            tenantId: '1',
            storeId: '101',
            uId: 123,
        }).firestore();
        const otherDb = testEnv.authenticatedContext('owner-2', {
            role: 'OWNER',
            tenantId: '2',
            storeId: '202',
            uId: 'owner-2',
        }).firestore();
        const noSupportDb = testEnv.authenticatedContext('viewer-1', {
            role: 'VIEWER',
            tenantId: '1',
            storeId: '101',
            uId: 'viewer-1',
        }).firestore();
        const supportDb = testEnv.authenticatedContext('support-1', {
            canManageSupport: true,
            role: 'CUSTOM',
            tenantId: '1',
            storeId: '101',
            uId: 'support-1',
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-1', {
            platformRole: 'PLATFORM',
            role: 'PLATFORM',
            tenantId: '0',
            storeId: '0',
            uId: 'platform-1',
        }).firestore();
        const platformSupportDb = testEnv.authenticatedContext('platform-support-1', {
            platformRole: 'PLATFORM_SUPPORT',
            role: 'PLATFORM_SUPPORT',
            uId: 'platform-support-1',
        }).firestore();
        const ticketRef = doc(ownerDb, 'supportTickets', 'ticket-1');

        const maximumStatuses = Array.from(
            { length: ANSWERLATTICE_TICKET_STATUS_HISTORY_LIMIT },
            () => statusEntry('Open'),
        );
        const appendableMessages = Array.from(
            { length: ANSWERLATTICE_TICKET_MESSAGE_LIMIT - 1 },
            (_, index) => message(`history-${index}`),
        );
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await seedActiveAnswerlatticeRuleWorkspace(context.firestore());
            await setDoc(doc(context.firestore(), 'supportTickets', 'message-limit-ticket'), ticket({
                messages: appendableMessages,
                statuses: maximumStatuses,
            }));
        });
        await assertSucceeds(updateDoc(doc(ownerDb, 'supportTickets', 'message-limit-ticket'), {
            messages: [...appendableMessages, message('history-last')],
            modifiedBy: 'Owner',
            modifiedOn: NOW,
        }));
        await assertFails(updateDoc(doc(ownerDb, 'supportTickets', 'message-limit-ticket'), {
            messages: [...appendableMessages, message('history-last'), message('history-over-limit')],
            modifiedBy: 'Owner',
            modifiedOn: NOW,
        }));

        const appendableStatuses = Array.from(
            { length: ANSWERLATTICE_TICKET_STATUS_HISTORY_LIMIT - 1 },
            () => statusEntry('Open'),
        );
        const statusMessages = Array.from(
            { length: ANSWERLATTICE_TICKET_STATUS_HISTORY_LIMIT - 1 },
            (_, index) => message(`status-history-${index}`, 'system'),
        );
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'supportTickets', 'status-limit-ticket'), ticket({
                messages: statusMessages,
                statuses: appendableStatuses,
            }));
        });
        await assertSucceeds(updateDoc(doc(ownerDb, 'supportTickets', 'status-limit-ticket'), {
            status: 'In Progress',
            statuses: [...appendableStatuses, statusEntry('In Progress')],
            messages: [...statusMessages, message('status-history-last', 'system')],
            modifiedBy: 'Owner',
            modifiedOn: NOW,
        }));
        await assertFails(updateDoc(doc(ownerDb, 'supportTickets', 'status-limit-ticket'), {
            status: 'Resolved',
            statuses: [
                ...appendableStatuses,
                statusEntry('In Progress'),
                statusEntry('Resolved'),
            ],
            messages: [
                ...statusMessages,
                message('status-history-last', 'system'),
                message('status-history-over-limit', 'system'),
            ],
            modifiedBy: 'Owner',
            modifiedOn: NOW,
        }));

        await assertSucceeds(setDoc(ticketRef, ticket()));
        await assertSucceeds(setDoc(doc(numericOwnerDb, 'supportTickets', 'numeric-owner'), ticket({
            uId: 123,
            statuses: [statusEntry('Open', { id: '123', name: 'Owner', email: 'owner@example.com' })],
        })));
        await assertFails(setDoc(doc(numericOwnerDb, 'supportTickets', 'forged-numeric-owner'), ticket({
            uId: 123,
            statuses: [statusEntry('Open', { id: '124', name: 'Owner', email: 'owner@example.com' })],
        })));
        await assertSucceeds(getDoc(ticketRef));
        await assertFails(getDoc(doc(noSupportDb, 'supportTickets', 'ticket-1')));
        await assertSucceeds(getDoc(doc(supportDb, 'supportTickets', 'ticket-1')));
        await assertSucceeds(getDoc(doc(platformSupportDb, 'supportTickets', 'ticket-1')));
        await assertFails(getDoc(doc(otherDb, 'supportTickets', 'ticket-1')));
        await assertFails(setDoc(doc(ownerDb, 'supportTickets', 'wrong-product'), ticket({ pId: 'ML' })));
        await assertFails(setDoc(doc(ownerDb, 'supportTickets', 'empty-subject'), ticket({ subject: '' })));
        await assertFails(setDoc(doc(ownerDb, 'supportTickets', 'forged-status-actor'), ticket({
            statuses: [{
                ...statusEntry('Open'),
                createdBy: { ...actor, id: 'another-owner' },
            }],
        })));
        await assertFails(setDoc(doc(ownerDb, 'supportTickets', 'preloaded-message'), ticket({
            messages: [message('forged-initial-message')],
        })));
        for (const [documentId, reservedFields] of [
            ['client-source', { source: 'ai_escalation' }],
            ['client-knowledge-candidate', { knowledgeCandidate: true }],
            ['client-escalation-context', {
                escalationContext: {
                    triggerTypes: ['explicit_user_request'],
                    query: 'Forged escalation evidence',
                    escalatedAt: new Date(NOW.toMillis()).toISOString(),
                },
            }],
            ['client-widget-escalation', {
                widgetEscalation: {
                    searchHistoryId: 'history-1',
                    replyEmail: 'owner@example.com',
                    detailsProvided: false,
                },
            }],
        ] as const) {
            await assertFails(setDoc(
                doc(ownerDb, 'supportTickets', documentId),
                ticket(reservedFields),
            ));
        }
        await assertSucceeds(setDoc(doc(ownerDb, 'supportTickets', 'maximum-documents'), ticket({
            documents: Array.from(
                { length: ANSWERLATTICE_TICKET_DOCUMENT_LIMIT },
                (_, index) => ticketDocument(index),
            ),
        })));
        await assertFails(setDoc(doc(ownerDb, 'supportTickets', 'too-many-documents'), ticket({
            documents: Array.from(
                { length: ANSWERLATTICE_TICKET_DOCUMENT_LIMIT + 1 },
                (_, index) => ticketDocument(index),
            ),
        })));
        await assertSucceeds(updateDoc(ticketRef, {
            messages: [message('reply-1')],
            modifiedBy: 'Owner',
            modifiedOn: NOW,
        }));
        await assertFails(updateDoc(ticketRef, {
            messages: [message('rewritten-reply'), message('reply-2')],
            modifiedBy: 'Owner',
            modifiedOn: NOW,
        }));
        await assertFails(updateDoc(ticketRef, {
            messages: [message('reply-1'), {
                ...message('reply-2'),
                sender: { ...actor, id: 'another-owner' },
            }],
            modifiedBy: 'Owner',
            modifiedOn: NOW,
        }));
        await assertFails(updateDoc(ticketRef, {
            statuses: [{ ...statusEntry('Open'), remark: 'Rewritten history' }],
            modifiedBy: 'Owner',
            modifiedOn: NOW,
        }));
        await assertFails(updateDoc(ticketRef, {
            messages: [message('reply-1'), message('reply-2'), message('reply-3')],
            modifiedBy: 'Owner',
            modifiedOn: NOW,
        }));
        await assertFails(updateDoc(ticketRef, {
            status: 'Re-Opened',
            statuses: [statusEntry('Open'), statusEntry('Re-Opened')],
            messages: [message('reply-1'), message('status-1', 'system')],
            modifiedBy: 'Owner',
            modifiedOn: NOW,
        }));
        await assertFails(updateDoc(ticketRef, {
            status: 'Resolved',
            modifiedBy: 'Owner',
            modifiedOn: NOW,
        }));
        await assertSucceeds(updateDoc(ticketRef, {
            status: 'Resolved',
            statuses: [statusEntry('Open'), statusEntry('Resolved')],
            messages: [message('reply-1'), message('status-resolved', 'system')],
            modifiedBy: 'Owner',
            modifiedOn: NOW,
        }));
        await assertSucceeds(updateDoc(ticketRef, {
            satisfaction: { rating: 5, comment: 'Resolved', submittedAt: NOW },
            modifiedOn: NOW,
        }));
        await assertFails(updateDoc(ticketRef, {
            satisfaction: { rating: 1, comment: 'Rewritten', submittedAt: NOW },
            modifiedOn: NOW,
        }));
        await assertFails(updateDoc(ticketRef, { tId: 2, sId: 202, modifiedOn: NOW }));
        await assertFails(deleteDoc(ticketRef));
        await assertFails(deleteDoc(doc(platformSupportDb, 'supportTickets', 'ticket-1')));
        await assertSucceeds(deleteDoc(doc(platformDb, 'supportTickets', 'ticket-1')));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write(`Answerlattice ticket rules passed (${RULES_FILE}).\n`);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
