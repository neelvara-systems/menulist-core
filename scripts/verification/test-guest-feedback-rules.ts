#!/usr/bin/env ts-node

import fs from 'fs';
import { strict as nodeAssert } from 'node:assert';
import path from 'path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-guest-feedback-rules';
const ROOT = path.resolve(__dirname, '..', '..');

const feedback = (tId: number, sId: number, rating: 1 | 2 | 3 | 4 | 5) => ({
    createdBy: 'guest',
    createdOn: Timestamp.fromMillis(1_700_000_000_000),
    expiresOn: Timestamp.fromMillis(1_707_776_000_000),
    needsAttention: rating <= 3,
    projectId: `project-${sId}`,
    rating,
    sId,
    source: 'direct_link',
    status: 'new',
    tId,
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') },
    });

    try {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await Promise.all([
                setDoc(doc(db, 'guestFeedback', 'store-101'), feedback(1, 101, 2)),
                setDoc(doc(db, 'guestFeedback', 'store-102'), feedback(1, 102, 5)),
                setDoc(doc(db, 'guestFeedback', 'tenant-2'), feedback(2, 201, 3)),
            ]);
        });

        const storeOneDb = testEnv.authenticatedContext('store-one', {
            tenantId: '1',
            storeId: '101',
            storeIds: ['101'],
            role: 'MANAGER',
        }).firestore();
        const tenantOnlyDb = testEnv.authenticatedContext('tenant-only', {
            tenantId: '1',
            role: 'MANAGER',
        }).firestore();
        const multiStoreDb = testEnv.authenticatedContext('multi-store', {
            tenantId: '1',
            storeId: '101',
            storeIds: ['101', '102'],
            role: 'OWNER',
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform', {
            platformRole: 'PLATFORM',
        }).firestore();
        const publicDb = testEnv.unauthenticatedContext().firestore();

        await assertSucceeds(getDoc(doc(storeOneDb, 'guestFeedback', 'store-101')));
        await assertFails(getDoc(doc(storeOneDb, 'guestFeedback', 'store-102')));
        await assertFails(getDoc(doc(tenantOnlyDb, 'guestFeedback', 'store-101')));
        await assertSucceeds(getDoc(doc(multiStoreDb, 'guestFeedback', 'store-101')));
        await assertSucceeds(getDoc(doc(multiStoreDb, 'guestFeedback', 'store-102')));
        await assertSucceeds(getDoc(doc(platformDb, 'guestFeedback', 'tenant-2')));

        await assertSucceeds(updateDoc(doc(storeOneDb, 'guestFeedback', 'store-101'), {
            modifiedBy: 'store-one',
            modifiedOn: serverTimestamp(),
            needsAttention: false,
            ownerNote: 'Resolved with the guest.',
            status: 'resolved',
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'guestFeedback', 'store-101'), {
            modifiedBy: 'store-one',
            modifiedOn: Timestamp.fromMillis(1_700_000_100_000),
            needsAttention: true,
            status: 'new',
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'guestFeedback', 'store-101'), {
            modifiedBy: 'store-one',
            modifiedOn: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
            needsAttention: true,
            status: 'new',
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'guestFeedback', 'store-101'), {
            modifiedBy: 'store-one',
            modifiedOn: serverTimestamp(),
            needsAttention: true,
            status: 'resolved',
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'guestFeedback', 'store-101'), {
            modifiedBy: 'store-one',
            modifiedOn: serverTimestamp(),
            needsAttention: true,
            ownerNote: 'x'.repeat(301),
            status: 'new',
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'guestFeedback', 'store-102'), {
            modifiedBy: 'store-one',
            modifiedOn: serverTimestamp(),
            needsAttention: false,
            status: 'resolved',
        }));
        await assertFails(updateDoc(doc(tenantOnlyDb, 'guestFeedback', 'store-101'), {
            modifiedBy: 'tenant-only',
            modifiedOn: serverTimestamp(),
            needsAttention: false,
            status: 'resolved',
        }));
        await assertFails(updateDoc(doc(storeOneDb, 'guestFeedback', 'store-101'), {
            modifiedBy: 'another-user',
            modifiedOn: serverTimestamp(),
            needsAttention: true,
            status: 'new',
        }));

        const forgedEvent = {
            eventType: 'FEEDBACK_SUBMITTED',
            expiresAt: Timestamp.fromMillis(1_700_000_100_000),
            projectId: 'other-tenant-project',
            rating: 1,
            sId: 999,
            tId: 999,
            timestamp: Timestamp.fromMillis(1_700_000_000_000),
            type: 'feedback_event',
        };
        await assertFails(addDoc(collection(publicDb, 'feedbackEvents'), forgedEvent));
        await assertFails(addDoc(collection(storeOneDb, 'feedbackEvents'), forgedEvent));

        const { submitGuestFeedbackAdmin, logFeedbackMOLEventAdmin } = await import('@database/guestFeedback/server');
        const { firestoreAdmin } = await import('@lib/firebase/firebaseAdmin');
        const idempotentInput = {
            customerName: 'अन्वी',
            message: 'The printed price needs checking.',
            projectId: '1-idempotency-101',
            rating: 2 as const,
            sId: 101,
            source: 'feedback_qr' as const,
            submissionId: 'idempotency-test-request-001',
            tId: 1,
        };
        const firstSubmission = await submitGuestFeedbackAdmin(idempotentInput);
        const replayedSubmission = await submitGuestFeedbackAdmin(idempotentInput);
        nodeAssert.equal(firstSubmission.created, true);
        nodeAssert.equal(replayedSubmission.created, false);
        nodeAssert.equal(replayedSubmission.feedback.id, firstSubmission.feedback.id);
        await nodeAssert.rejects(
            submitGuestFeedbackAdmin({ ...idempotentInput, rating: 3 }),
            /replay conflict/,
        );

        await logFeedbackMOLEventAdmin(
            'FEEDBACK_SUBMITTED',
            idempotentInput.tId,
            idempotentInput.sId,
            idempotentInput.projectId,
            idempotentInput.rating,
            firstSubmission.feedback.id,
        );
        await logFeedbackMOLEventAdmin(
            'FEEDBACK_SUBMITTED',
            idempotentInput.tId,
            idempotentInput.sId,
            idempotentInput.projectId,
            idempotentInput.rating,
            firstSubmission.feedback.id,
        );

        const persistedFeedback = await firestoreAdmin
            .collection('guestFeedback')
            .where('projectId', '==', idempotentInput.projectId)
            .get();
        const persistedEvents = await firestoreAdmin
            .collection('feedbackEvents')
            .where('projectId', '==', idempotentInput.projectId)
            .get();
        nodeAssert.equal(persistedFeedback.size, 1);
        nodeAssert.equal(persistedEvents.size, 1);
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('Guest feedback Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
