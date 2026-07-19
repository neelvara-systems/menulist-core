#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    where,
} from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-billing-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const RULES_FILE = process.env.ANSWERLATTICE_RULES_FILE === 'firestore.rules'
    ? 'firestore.rules'
    : 'firestore-answerlattice.rules';
const IS_SHARED_RULES = RULES_FILE === 'firestore.rules';

const answerlatticeBillingRecord = (extra: Record<string, unknown> = {}) => ({
    pId: 'AL',
    productId: 'AL',
    tId: 1,
    tenantId: 1,
    sId: 101,
    storeId: 101,
    ...extra,
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
        const billingDb = testEnv.authenticatedContext('billing-1', {
            canManageBilling: true,
            role: 'CUSTOM_BILLING',
            storeId: '101',
            tenantId: '1',
            uId: 'billing-1',
        }).firestore();
        const ownerDb = testEnv.authenticatedContext('owner-1', {
            role: 'OWNER',
            storeId: '101',
            tenantId: '1',
            uId: 'owner-1',
        }).firestore();
        const managerDb = testEnv.authenticatedContext('manager-1', {
            role: 'MANAGER',
            storeId: '101',
            tenantId: '1',
            uId: 'manager-1',
        }).firestore();
        const otherDb = testEnv.authenticatedContext('owner-2', {
            role: 'OWNER',
            storeId: '202',
            tenantId: '2',
            uId: 'owner-2',
        }).firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const adminDb = context.firestore();
            await setDoc(doc(adminDb, 'subscriptions', 'sub_Answerlattice123'), answerlatticeBillingRecord({
                status: 'active',
            }));
            await setDoc(doc(adminDb, 'payment_transactions', 'payment_answerlattice_1'), answerlatticeBillingRecord({
                event: 'subscription.charged',
            }));
            await setDoc(doc(adminDb, 'topups', 'order_Answerlattice123'), answerlatticeBillingRecord({
                status: 'paid',
            }));
            await setDoc(doc(adminDb, 'subscriptions', 'sub_Conflicting123'), answerlatticeBillingRecord({
                productId: 'ML',
                status: 'active',
            }));

            if (IS_SHARED_RULES) {
                await setDoc(doc(adminDb, 'subscriptions', 'sub_MenuList123'), {
                    tenantId: 1,
                    storeId: 101,
                    status: 'active',
                });
                await setDoc(doc(adminDb, 'payment_transactions', 'payment_menulist_1'), {
                    tenantId: 1,
                    storeId: 101,
                    event: 'subscription.charged',
                });
                await setDoc(doc(adminDb, 'topups', 'order_MenuList123'), {
                    tenantId: 1,
                    storeId: 101,
                    status: 'paid',
                });
            }
        });

        for (const allowedDb of [billingDb, ownerDb]) {
            await assertSucceeds(getDoc(doc(allowedDb, 'subscriptions', 'sub_Answerlattice123')));
            await assertSucceeds(getDoc(doc(allowedDb, 'payment_transactions', 'payment_answerlattice_1')));
        }

        for (const deniedDb of [managerDb, otherDb]) {
            await assertFails(getDoc(doc(deniedDb, 'subscriptions', 'sub_Answerlattice123')));
            await assertFails(getDoc(doc(deniedDb, 'payment_transactions', 'payment_answerlattice_1')));
        }

        await assertFails(getDoc(doc(ownerDb, 'subscriptions', 'sub_Conflicting123')));
        await assertFails(getDoc(doc(billingDb, 'topups', 'order_Answerlattice123')));
        await assertFails(getDoc(doc(ownerDb, 'topups', 'order_Answerlattice123')));
        await assertFails(setDoc(
            doc(ownerDb, 'subscriptions', 'sub_Answerlattice123'),
            { status: 'cancelled' },
            { merge: true },
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'payment_transactions', 'payment_answerlattice_1'),
            { status: 'forged' },
            { merge: true },
        ));

        await assertSucceeds(getDocs(query(
            collection(billingDb, 'subscriptions'),
            where('pId', '==', 'AL'),
            where('tenantId', '==', 1),
            where('storeId', '==', 101),
        )));
        await assertFails(getDocs(query(
            collection(managerDb, 'subscriptions'),
            where('pId', '==', 'AL'),
            where('tenantId', '==', 1),
            where('storeId', '==', 101),
        )));

        await assertSucceeds(getDocs(query(
            collection(billingDb, 'payment_transactions'),
            where('pId', '==', 'AL'),
            where('tenantId', '==', 1),
            where('storeId', '==', 101),
        )));
        await assertFails(getDocs(query(
            collection(managerDb, 'payment_transactions'),
            where('pId', '==', 'AL'),
            where('tenantId', '==', 1),
            where('storeId', '==', 101),
        )));

        if (IS_SHARED_RULES) {
            await assertSucceeds(getDoc(doc(managerDb, 'subscriptions', 'sub_MenuList123')));
            await assertSucceeds(getDoc(doc(managerDb, 'payment_transactions', 'payment_menulist_1')));
            await assertSucceeds(getDoc(doc(managerDb, 'topups', 'order_MenuList123')));
        }
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write(`Answerlattice billing rules passed (${RULES_FILE}).\n`);
}

void run();
