#!/usr/bin/env ts-node

import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    where,
} from 'firebase/firestore';
import { seedActiveAnswerlatticeRuleWorkspace } from './answerlattice-rule-test-fixtures';

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
            await seedActiveAnswerlatticeRuleWorkspace(adminDb);
            await setDoc(doc(adminDb, 'subscriptions', 'sub_Answerlattice123'), answerlatticeBillingRecord({
                status: 'active',
            }));
            await setDoc(doc(adminDb, 'payment_transactions', 'payment_answerlattice_1'), answerlatticeBillingRecord({
                event: 'subscription.charged',
            }));
            await setDoc(doc(adminDb, 'topups', 'order_Answerlattice123'), answerlatticeBillingRecord({
                status: 'paid',
            }));
            await setDoc(doc(adminDb, 'billingDocuments', 'inv_answerlattice_1'), answerlatticeBillingRecord({
                documentType: 'tax_invoice',
                documentNumber: 'AL26-27-000001',
            }));
            await setDoc(doc(adminDb, 'billingDocumentCounters', 'ctr_answerlattice_1'), {
                documentType: 'tax_invoice',
                financialYear: '26-27',
                lastSequence: 1,
            });
            await setDoc(doc(adminDb, 'answerlattice_aiCapacityReservations', 'idem_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'), {
                pId: 'AL',
                tId: 1,
                sId: 101,
                recoveryAt: new Date(),
            });
            await setDoc(doc(adminDb, 'subscriptions', 'sub_Conflicting123'), answerlatticeBillingRecord({
                productId: 'ML',
                status: 'active',
            }));
            await setDoc(doc(adminDb, 'payment_transactions', 'payment_conflicting_1'), answerlatticeBillingRecord({
                event: 'subscription.charged',
                productId: 'ML',
            }));
            await setDoc(doc(adminDb, 'subscriptions', 'sub_ConflictingScope123'), answerlatticeBillingRecord({
                tId: 999,
                status: 'active',
            }));
            await setDoc(doc(adminDb, 'payment_transactions', 'payment_conflicting_scope_1'), answerlatticeBillingRecord({
                event: 'subscription.charged',
                sId: 999,
            }));

            if (IS_SHARED_RULES) {
                await setDoc(doc(adminDb, 'subscriptions', 'sub_MenuList123'), {
                    pId: 'ML',
                    productId: 'ML',
                    tId: 1,
                    tenantId: 1,
                    sId: 101,
                    storeId: 101,
                    status: 'active',
                });
                await setDoc(doc(adminDb, 'payment_transactions', 'payment_menulist_1'), {
                    pId: 'ML',
                    productId: 'ML',
                    tId: 1,
                    tenantId: 1,
                    sId: 101,
                    storeId: 101,
                    event: 'subscription.charged',
                });
                await setDoc(doc(adminDb, 'topups', 'order_MenuList123'), {
                    pId: 'ML',
                    productId: 'ML',
                    tId: 1,
                    tenantId: 1,
                    sId: 101,
                    storeId: 101,
                    status: 'paid',
                });
                await setDoc(doc(adminDb, 'subscriptions', 'sub_CampaignCue123'), {
                    pId: 'CC',
                    productId: 'CC',
                    tenantId: 1,
                    storeId: 101,
                    status: 'active',
                });
                await setDoc(doc(adminDb, 'topups', 'order_CampaignCue123'), {
                    pId: 'CC',
                    productId: 'CC',
                    tenantId: 1,
                    storeId: 101,
                    status: 'paid',
                });
                await setDoc(doc(adminDb, 'subscriptions', 'sub_MenuListConflictingScope123'), {
                    pId: 'ML',
                    productId: 'ML',
                    tId: 999,
                    tenantId: 1,
                    sId: 101,
                    storeId: 101,
                    status: 'active',
                });
                await setDoc(doc(adminDb, 'payment_transactions', 'payment_menulist_conflicting_scope_1'), {
                    pId: 'ML',
                    productId: 'ML',
                    tId: 1,
                    tenantId: 1,
                    sId: 999,
                    storeId: 101,
                    event: 'subscription.charged',
                });
                await setDoc(doc(adminDb, 'topups', 'order_MenuListConflictingScope123'), {
                    pId: 'ML',
                    productId: 'ML',
                    tId: 999,
                    tenantId: 1,
                    sId: 101,
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
        await assertFails(getDoc(doc(ownerDb, 'payment_transactions', 'payment_conflicting_1')));
        await assertFails(getDoc(doc(ownerDb, 'subscriptions', 'sub_ConflictingScope123')));
        await assertFails(getDoc(doc(ownerDb, 'payment_transactions', 'payment_conflicting_scope_1')));
        await assertFails(getDoc(doc(billingDb, 'topups', 'order_Answerlattice123')));
        await assertFails(getDoc(doc(ownerDb, 'topups', 'order_Answerlattice123')));
        for (const clientDb of [billingDb, ownerDb, managerDb, otherDb]) {
            await assertFails(getDoc(doc(clientDb, 'billingDocuments', 'inv_answerlattice_1')));
            await assertFails(getDocs(collection(clientDb, 'billingDocuments')));
            await assertFails(getDoc(doc(clientDb, 'billingDocumentCounters', 'ctr_answerlattice_1')));
            await assertFails(setDoc(doc(clientDb, 'billingDocuments', 'forged_invoice'), answerlatticeBillingRecord()));
        }
        await assertFails(setDoc(
            doc(ownerDb, 'subscriptions', 'sub_Answerlattice123'),
            { status: 'cancelled' },
            { merge: true },
        ));
        for (const deniedRecoveryDb of [billingDb, ownerDb, managerDb, otherDb]) {
            await assertFails(getDoc(doc(
                deniedRecoveryDb,
                'answerlattice_aiCapacityReservations',
                'idem_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            )));
            await assertFails(getDocs(collection(deniedRecoveryDb, 'answerlattice_aiCapacityReservations')));
            await assertFails(setDoc(
                doc(deniedRecoveryDb, 'answerlattice_aiCapacityReservations', 'forged_reservation'),
                { pId: 'AL', tId: 1, sId: 101 },
            ));
        }

        // Exact duplicate-alias predicates exclude conflicting rows while
        // preserving the valid workspace result.
        const exactAnswerlatticeSubscriptions = await assertSucceeds(getDocs(query(
            collection(billingDb, 'subscriptions'),
            where('pId', '==', 'AL'),
            where('productId', '==', 'AL'),
            where('tenantId', '==', 1),
            where('tId', '==', 1),
            where('storeId', '==', 101),
            where('sId', '==', 101),
        )));
        assert.deepEqual(exactAnswerlatticeSubscriptions.docs.map((item) => item.id), ['sub_Answerlattice123']);
        const exactAnswerlatticePayments = await assertSucceeds(getDocs(query(
            collection(billingDb, 'payment_transactions'),
            where('pId', '==', 'AL'),
            where('productId', '==', 'AL'),
            where('tenantId', '==', 1),
            where('tId', '==', 1),
            where('storeId', '==', 101),
            where('sId', '==', 101),
        )));
        assert.deepEqual(exactAnswerlatticePayments.docs.map((item) => item.id), ['payment_answerlattice_1']);
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const adminDb = context.firestore();
            await deleteDoc(doc(adminDb, 'subscriptions', 'sub_ConflictingScope123'));
            await deleteDoc(doc(adminDb, 'payment_transactions', 'payment_conflicting_scope_1'));
        });
        await assertFails(setDoc(
            doc(ownerDb, 'payment_transactions', 'payment_answerlattice_1'),
            { status: 'forged' },
            { merge: true },
        ));

        await assertSucceeds(getDocs(query(
            collection(billingDb, 'subscriptions'),
            where('pId', '==', 'AL'),
            where('productId', '==', 'AL'),
            where('tenantId', '==', 1),
            where('tId', '==', 1),
            where('storeId', '==', 101),
            where('sId', '==', 101),
        )));
        await assertFails(getDocs(query(
            collection(managerDb, 'subscriptions'),
            where('pId', '==', 'AL'),
            where('productId', '==', 'AL'),
            where('tenantId', '==', 1),
            where('tId', '==', 1),
            where('storeId', '==', 101),
            where('sId', '==', 101),
        )));

        await assertSucceeds(getDocs(query(
            collection(billingDb, 'payment_transactions'),
            where('pId', '==', 'AL'),
            where('productId', '==', 'AL'),
            where('tenantId', '==', 1),
            where('tId', '==', 1),
            where('storeId', '==', 101),
            where('sId', '==', 101),
        )));
        await assertFails(getDocs(query(
            collection(managerDb, 'payment_transactions'),
            where('pId', '==', 'AL'),
            where('productId', '==', 'AL'),
            where('tenantId', '==', 1),
            where('tId', '==', 1),
            where('storeId', '==', 101),
            where('sId', '==', 101),
        )));

        // A single-alias query can match a conflicting product record. Rules
        // must reject it before any malformed row reaches the browser.
        await assertFails(getDocs(query(
            collection(billingDb, 'payment_transactions'),
            where('pId', '==', 'AL'),
            where('tenantId', '==', 1),
            where('storeId', '==', 101),
        )));
        await assertFails(getDocs(query(
            collection(billingDb, 'subscriptions'),
            where('pId', '==', 'AL'),
            where('tenantId', '==', 1),
            where('storeId', '==', 101),
        )));

        if (IS_SHARED_RULES) {
            await assertFails(getDoc(doc(managerDb, 'subscriptions', 'sub_MenuListConflictingScope123')));
            await assertFails(getDoc(doc(managerDb, 'payment_transactions', 'payment_menulist_conflicting_scope_1')));
            const exactMenuListSubscriptions = await assertSucceeds(getDocs(query(
                collection(managerDb, 'subscriptions'),
                where('pId', '==', 'ML'),
                where('productId', '==', 'ML'),
                where('tenantId', '==', 1),
                where('tId', '==', 1),
                where('storeId', '==', 101),
                where('sId', '==', 101),
            )));
            assert.deepEqual(exactMenuListSubscriptions.docs.map((item) => item.id), ['sub_MenuList123']);
            const exactMenuListPayments = await assertSucceeds(getDocs(query(
                collection(managerDb, 'payment_transactions'),
                where('pId', '==', 'ML'),
                where('productId', '==', 'ML'),
                where('tenantId', '==', 1),
                where('tId', '==', 1),
                where('storeId', '==', 101),
                where('sId', '==', 101),
            )));
            assert.deepEqual(exactMenuListPayments.docs.map((item) => item.id), ['payment_menulist_1']);
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const adminDb = context.firestore();
                await deleteDoc(doc(adminDb, 'subscriptions', 'sub_MenuListConflictingScope123'));
                await deleteDoc(doc(adminDb, 'payment_transactions', 'payment_menulist_conflicting_scope_1'));
            });
            await assertSucceeds(getDoc(doc(managerDb, 'subscriptions', 'sub_MenuList123')));
            await assertSucceeds(getDoc(doc(managerDb, 'payment_transactions', 'payment_menulist_1')));
            await assertSucceeds(getDoc(doc(managerDb, 'topups', 'order_MenuList123')));
            await assertFails(getDoc(doc(managerDb, 'topups', 'order_MenuListConflictingScope123')));
            await assertFails(getDoc(doc(managerDb, 'subscriptions', 'sub_CampaignCue123')));
            await assertFails(getDoc(doc(managerDb, 'topups', 'order_CampaignCue123')));
            await assertSucceeds(getDocs(query(
                collection(managerDb, 'subscriptions'),
                where('pId', '==', 'ML'),
                where('productId', '==', 'ML'),
                where('tenantId', '==', 1),
                where('tId', '==', 1),
                where('storeId', '==', 101),
                where('sId', '==', 101),
            )));
            await assertFails(getDocs(query(
                collection(managerDb, 'subscriptions'),
                where('pId', '==', 'ML'),
                where('tenantId', '==', 1),
                where('tId', '==', 1),
                where('storeId', '==', 101),
                where('sId', '==', 101),
            )));
            await assertSucceeds(getDocs(query(
                collection(managerDb, 'payment_transactions'),
                where('pId', '==', 'ML'),
                where('productId', '==', 'ML'),
                where('tenantId', '==', 1),
                where('tId', '==', 1),
                where('storeId', '==', 101),
                where('sId', '==', 101),
            )));
            await assertFails(getDocs(query(
                collection(managerDb, 'payment_transactions'),
                where('pId', '==', 'ML'),
                where('tenantId', '==', 1),
                where('storeId', '==', 101),
            )));
        }
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write(`Answerlattice billing rules passed (${RULES_FILE}).\n`);
}

void run();
