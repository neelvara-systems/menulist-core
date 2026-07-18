#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-pos-sync-secret-rules';
const ROOT = path.resolve(__dirname, '..', '..');

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') },
    });

    try {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, 'stores', '101'), {
                active: true,
                storeId: 101,
                tenantId: 1,
                posSync: {
                    enabled: true,
                    status: 'healthy',
                    webhookSecret: 'whsec_legacy',
                    webhookUrl: 'https://provider.example/webhook',
                },
            });
            await setDoc(doc(db, 'stores', '102'), {
                active: true,
                storeId: 102,
                tenantId: 1,
            });
            await setDoc(doc(db, 'posSyncSecrets', '1_101'), {
                pId: 'ML',
                sId: 101,
                secret: 'whsec_server',
                tId: 1,
                version: 1,
            });
        });

        const ownerDb = testEnv.authenticatedContext('owner-1', {
            role: 'OWNER', storeId: '101', storeIds: ['101', '102'], tenantId: '1', uId: 'owner-1',
        }).firestore();
        const staffDb = testEnv.authenticatedContext('staff-1', {
            role: 'STAFF', storeId: '101', storeIds: ['101'], tenantId: '1', uId: 'staff-1',
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-1', {
            platformRole: 'PLATFORM', uId: 'platform-1',
        }).firestore();

        for (const clientDb of [ownerDb, staffDb, platformDb, testEnv.unauthenticatedContext().firestore()]) {
            await assertFails(getDoc(doc(clientDb, 'posSyncSecrets', '1_101')));
            await assertFails(setDoc(doc(clientDb, 'posSyncSecrets', '1_102'), { secret: 'client-secret' }));
        }

        await assertSucceeds(updateDoc(doc(ownerDb, 'stores', '101'), {
            'posSync.enabled': false,
            'posSync.status': 'disabled',
        }));
        await assertFails(updateDoc(doc(ownerDb, 'stores', '101'), {
            'posSync.webhookSecret': 'whsec_changed',
        }));
        await assertFails(updateDoc(doc(ownerDb, 'stores', '101'), {
            'posSync.webhookSecret': deleteField(),
        }));
        await assertFails(updateDoc(doc(platformDb, 'stores', '101'), {
            'posSync.webhookSecret': 'whsec_platform_changed',
        }));
        await assertFails(updateDoc(doc(ownerDb, 'stores', '102'), {
            posSync: {
                enabled: true,
                status: 'healthy',
                webhookSecret: 'whsec_added',
                webhookUrl: 'https://provider.example/webhook',
            },
        }));
        await assertSucceeds(updateDoc(doc(ownerDb, 'stores', '102'), {
            posSync: {
                enabled: true,
                status: 'healthy',
                secretVersion: 1,
                webhookUrl: 'https://provider.example/webhook',
            },
        }));

        process.stdout.write('POS sync secret Firestore rules tests passed.\n');
    } finally {
        await testEnv.cleanup();
    }
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
