#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-notification-os-rules';
const ROOT = path.resolve(__dirname, '..', '..');

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') },
    });

    try {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'stores/101'), {
                tenantId: '1',
                storeId: '101',
                name: 'NotificationOS Test Store',
                notificationSettings: {
                    channelMode: 'email_only',
                    whatsappConsent: false,
                },
            });
        });

        const ownerDb = testEnv.authenticatedContext('owner-1', {
            role: 'OWNER',
            storeId: '101',
            storeIds: ['101'],
            tenantId: '1',
            uId: 'owner-1',
        }).firestore();

        await assertSucceeds(getDoc(doc(ownerDb, 'stores/101')));
        await assertSucceeds(updateDoc(doc(ownerDb, 'stores/101'), {
            name: 'Updated Store Name',
        }));
        await assertFails(updateDoc(doc(ownerDb, 'stores/101'), {
            'notificationSettings.channelMode': 'email_and_whatsapp',
            'notificationSettings.whatsappConsent': true,
        }));

        for (const collectionName of [
            'emailOsDeliveries',
            'emailOsWebhookReceipts',
            'emailOsSuppressions',
            'whatsappOsMessageRefs',
            'whatsappOsWebhookReceipts',
            'whatsappOsConsentEvents',
        ]) {
            const protectedRef = doc(ownerDb, collectionName, 'test-document');
            await assertFails(getDoc(protectedRef));
            await assertFails(setDoc(protectedRef, { ownerUid: 'owner-1' }));
        }
    } finally {
        await testEnv.cleanup();
    }

    const answerlatticeEnv = await initializeTestEnvironment({
        projectId: `${PROJECT_ID}-answerlattice`,
        firestore: { rules: fs.readFileSync(path.join(ROOT, 'firestore-answerlattice.rules'), 'utf8') },
    });
    try {
        const tenantUserDb = answerlatticeEnv.authenticatedContext('answerlattice-owner', {
            pId: 'AL',
            tId: 'tenant-1',
            sId: 'workspace-1',
            role: 'OWNER',
        }).firestore();
        for (const collectionName of [
            'answerlattice_emailOsDeliveries',
            'answerlattice_emailOsWebhookReceipts',
            'answerlattice_emailOsSuppressions',
            'answerlattice_whatsappOsMessageRefs',
            'answerlattice_whatsappOsWebhookReceipts',
            'answerlattice_whatsappOsConsentEvents',
        ]) {
            const protectedRef = doc(tenantUserDb, collectionName, 'test-document');
            await assertFails(getDoc(protectedRef));
            await assertFails(setDoc(protectedRef, { pId: 'AL', tId: 'tenant-1', sId: 'workspace-1' }));
        }
    } finally {
        await answerlatticeEnv.cleanup();
    }
}

run().then(() => {
    process.stdout.write('NotificationOS Firestore consent-boundary rules tests passed.\n');
}).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
