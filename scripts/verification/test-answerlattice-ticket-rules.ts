#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

const ROOT = path.resolve(__dirname, '..', '..');
const RULES_FILE = process.env.ANSWERLATTICE_RULES_FILE || 'firestore-answerlattice.rules';
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-ticket-rules';
const NOW = Timestamp.fromMillis(1_700_000_000_000);

const actor = { id: 'owner-1', name: 'Owner', email: 'owner@example.com' };
const statusEntry = (status: string) => ({ status, timestamp: NOW, createdBy: actor, remark: `Status ${status}` });
const message = (id: string, type: 'user' | 'system' = 'user') => ({
    id,
    text: type === 'system' ? 'Status changed' : 'Reply',
    type,
    sender: actor,
    timestamp: NOW,
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
        const otherDb = testEnv.authenticatedContext('owner-2', {
            role: 'OWNER',
            tenantId: '2',
            storeId: '202',
            uId: 'owner-2',
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-1', {
            platformRole: 'PLATFORM',
            role: 'PLATFORM',
            tenantId: '0',
            storeId: '0',
            uId: 'platform-1',
        }).firestore();
        const ticketRef = doc(ownerDb, 'supportTickets', 'ticket-1');

        await assertSucceeds(setDoc(ticketRef, ticket()));
        await assertSucceeds(getDoc(ticketRef));
        await assertFails(getDoc(doc(otherDb, 'supportTickets', 'ticket-1')));
        await assertFails(setDoc(doc(ownerDb, 'supportTickets', 'wrong-product'), ticket({ pId: 'ML' })));
        await assertFails(setDoc(doc(ownerDb, 'supportTickets', 'too-many-documents'), ticket({
            documents: Array.from({ length: 21 }, (_, index) => ({
                name: `file-${index}`,
                size: 1,
                type: 'text/plain',
                url: `https://example.com/${index}`,
            })),
        })));

        await assertSucceeds(updateDoc(ticketRef, {
            messages: [message('reply-1')],
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
        await assertFails(updateDoc(ticketRef, { tId: 2, sId: 202, modifiedOn: NOW }));
        await assertFails(deleteDoc(ticketRef));
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

