#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-billing-coordination-rules';
const ROOT = path.resolve(__dirname, '..', '..');

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') },
    });

    try {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const adminDb = context.firestore();
            await setDoc(doc(adminDb, 'billingCheckoutLeases', 'lease-1'), {
                status: 'processing',
                expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
            });
            await setDoc(doc(adminDb, 'billingProviderPlans', 'plan-1'), {
                status: 'ready',
                providerPlanId: 'plan_test123',
            });
            await setDoc(doc(adminDb, 'menulistPurchasedCreditRecoveries', '1_101'), {
                purchasedCredits: 250,
                status: 'frozen',
            });
            await setDoc(doc(adminDb, 'billingDocuments', 'inv_test'), {
                documentNumber: 'ML26-27-000001',
                productId: 'ML',
                tenantId: 1,
                storeId: 101,
            });
            await setDoc(doc(adminDb, 'billingDocumentCounters', 'ctr_test'), {
                lastSequence: 1,
            });
        });

        const contexts = [
            testEnv.unauthenticatedContext().firestore(),
            testEnv.authenticatedContext('owner-1', {
                role: 'OWNER', storeId: '101', tenantId: '1', uId: 'owner-1',
            }).firestore(),
            testEnv.authenticatedContext('platform-1', {
                platformRole: 'PLATFORM', uId: 'platform-1',
            }).firestore(),
        ];
        for (const clientDb of contexts) {
            await assertFails(getDoc(doc(clientDb, 'billingCheckoutLeases', 'lease-1')));
            await assertFails(setDoc(doc(clientDb, 'billingCheckoutLeases', 'lease-2'), { status: 'processing' }));
            await assertFails(getDoc(doc(clientDb, 'billingProviderPlans', 'plan-1')));
            await assertFails(setDoc(doc(clientDb, 'billingProviderPlans', 'plan-2'), { status: 'ready' }));
            await assertFails(getDoc(doc(clientDb, 'menulistPurchasedCreditRecoveries', '1_101')));
            await assertFails(setDoc(doc(clientDb, 'menulistPurchasedCreditRecoveries', '1_102'), {
                purchasedCredits: 250,
                status: 'frozen',
            }));
            await assertFails(getDoc(doc(clientDb, 'billingDocuments', 'inv_test')));
            await assertFails(setDoc(doc(clientDb, 'billingDocuments', 'inv_other'), {
                documentNumber: 'ML26-27-000002',
            }));
            await assertFails(getDoc(doc(clientDb, 'billingDocumentCounters', 'ctr_test')));
            await assertFails(setDoc(doc(clientDb, 'billingDocumentCounters', 'ctr_other'), {
                lastSequence: 2,
            }));
        }
        process.stdout.write('Billing coordination Firestore rules tests passed.\n');
    } finally {
        await testEnv.cleanup();
    }
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
