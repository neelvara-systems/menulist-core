#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

const ROOT = path.resolve(__dirname, '..', '..');
const RULES_FILE = process.env.ANSWERLATTICE_RULES_FILE || 'firestore-answerlattice.rules';
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-signal-rules';
const NOW = Timestamp.fromMillis(1_700_000_000_000);
const EXPIRES_AT = Timestamp.fromMillis(1_731_536_000_000);

const signal = (overrides: Record<string, unknown> = {}) => ({
    pId: 'AL',
    tId: 1,
    sId: 101,
    entityId: 'unresolved',
    type: 'ticket',
    timestamp: NOW,
    expiresAt: EXPIRES_AT,
    metadata: { source: 'ticket', ticketId: 'ticket-1' },
    dedupKey: 'ticket:ticket_ticket-1',
    identityFingerprint: 'sigfp_abc123',
    requestId: 'ticket:ticket_ticket-1',
    traceId: 'al_signal_trace',
    sourceContext: null,
    role: 'OWNER',
    uId: 'owner-1',
    createdOn: NOW,
    modifiedOn: NOW,
    createdBy: 'Owner',
    modifiedBy: 'Owner',
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
            role: 'OWNER', tenantId: '1', storeId: '101', uId: 'owner-1',
        }).firestore();
        const otherDb = testEnv.authenticatedContext('owner-2', {
            role: 'OWNER', tenantId: '2', storeId: '202', uId: 'owner-2',
        }).firestore();
        const customerDb = testEnv.authenticatedContext('customer-1', {
            role: 'CUSTOMER', tenantId: '1', storeId: '101', uId: 'customer-1',
        }).firestore();
        const ref = doc(ownerDb, 'answerlattice_signalEvents', 'sig-ticket-1');

        await assertSucceeds(setDoc(ref, signal()));
        await assertSucceeds(getDoc(ref));
        await assertFails(getDoc(doc(otherDb, 'answerlattice_signalEvents', 'sig-ticket-1')));
        await assertFails(setDoc(doc(ownerDb, 'answerlattice_signalEvents', 'wrong-product'), signal({ pId: 'ML' })));
        await assertFails(setDoc(doc(ownerDb, 'answerlattice_signalEvents', 'wrong-scope'), signal({ tId: 2, sId: 202 })));
        await assertFails(setDoc(doc(ownerDb, 'answerlattice_signalEvents', 'string-tenant-scope'), signal({ tId: '1' })));
        await assertFails(setDoc(doc(ownerDb, 'answerlattice_signalEvents', 'string-store-scope'), signal({ sId: '101' })));
        await assertFails(setDoc(doc(ownerDb, 'answerlattice_signalEvents', 'fractional-scope'), signal({ tId: 1.5 })));
        await assertFails(setDoc(doc(ownerDb, 'answerlattice_signalEvents', 'wrong-type'), signal({ type: 'arbitrary' })));
        const missingExpiry = signal();
        delete (missingExpiry as Record<string, unknown>).expiresAt;
        await assertFails(setDoc(doc(ownerDb, 'answerlattice_signalEvents', 'missing-expiry'), missingExpiry));
        await assertFails(setDoc(doc(ownerDb, 'answerlattice_signalEvents', 'expired-on-create'), signal({ expiresAt: NOW })));
        await assertFails(setDoc(doc(ownerDb, 'answerlattice_signalEvents', 'processing-forged'), signal({
            processingRun: { id: 'forged', status: 'completed', startedAt: NOW },
        })));
        await assertFails(setDoc(doc(ownerDb, 'answerlattice_signalEvents', 'metadata-too-wide'), signal({
            metadata: Object.fromEntries(Array.from({ length: 31 }, (_, index) => [`key${index}`, index])),
        })));
        const missingFingerprint = signal();
        delete (missingFingerprint as Record<string, unknown>).identityFingerprint;
        await assertFails(setDoc(doc(ownerDb, 'answerlattice_signalEvents', 'missing-fingerprint'), missingFingerprint));
        await assertFails(setDoc(doc(ownerDb, 'answerlattice_signalEvents', 'malformed-fingerprint'), signal({
            identityFingerprint: 'not valid',
        })));
        await assertFails(setDoc(doc(customerDb, 'answerlattice_signalEvents', 'client-feedback-signal'), signal({
            type: 'feedback',
            metadata: { source: 'help_center_feedback', feedbackId: 'feedback_server_owned' },
            dedupKey: 'feedback:feedback_server_owned',
            identityFingerprint: 'sigfp_feedbackserverowned',
            requestId: 'feedback:feedback_server_owned',
            role: 'CUSTOMER',
            uId: 'customer-1',
            createdBy: 'Customer',
            modifiedBy: 'Customer',
        })));
        const orphanFingerprint = signal();
        delete (orphanFingerprint as Record<string, unknown>).dedupKey;
        await assertFails(setDoc(doc(ownerDb, 'answerlattice_signalEvents', 'orphan-fingerprint'), orphanFingerprint));
        const guidedResolution = signal({
            type: 'guided_resolution',
            requestId: 'guided-resolution-request',
        });
        delete (guidedResolution as Record<string, unknown>).dedupKey;
        delete (guidedResolution as Record<string, unknown>).identityFingerprint;
        await assertSucceeds(setDoc(doc(ownerDb, 'answerlattice_signalEvents', 'guided-resolution'), guidedResolution));
        await assertFails(updateDoc(ref, { metadata: { source: 'rewritten' } }));
    } finally {
        await testEnv.cleanup();
    }
    process.stdout.write(`Answerlattice signal rules passed (${RULES_FILE}).\n`);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
