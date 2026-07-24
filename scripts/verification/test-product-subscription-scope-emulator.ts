#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    applyProductSubscriptionPayment,
    applyProductSubscriptionStatusTransition,
    applyProductSubscriptionUpgradeCarryForward,
    applyProductSubscriptionWebhookEvent,
    createProductInitialSubscription,
    getProductSubscriptionById,
    updateProductSubscription,
} from '../../src/lib/billing/productBillingServer';
import { composeInitialSubscriptionPayloadServer } from '../../src/database/subscriptions/server';
import { firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { persistPendingProductTopupSnapshot } from '../../src/lib/billing/topupSettlementServer';

const baseSubscription = (overrides: Record<string, unknown> = {}) => ({
    amount: 49_900,
    billingHistory: [],
    creditsLastResetMonth: 202607,
    currency: 'INR',
    monthlyCredits: 50,
    monthlyCreditsAllowance: 75,
    pId: 'ML',
    productId: 'ML',
    providerSubscriptionId: 'sub_ScopeBoundary123',
    sId: 202,
    statuses: [],
    status: 'active',
    storeId: 202,
    tId: 101,
    tenantId: 101,
    topUpCredits: 10,
    ...overrides,
});

async function writeSubscription(id: string, data: Record<string, unknown>): Promise<void> {
    await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(id).set(data);
}

async function readSubscription(id: string): Promise<Record<string, unknown>> {
    return (await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(id).get()).data() || {};
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const snapshot = await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).get();
    await Promise.all(snapshot.docs.map((item) => item.ref.delete()));
    const topupSnapshot = await firestoreAdmin.collection(DB_COLLECTIONS.TOPUPS).get();
    await Promise.all(topupSnapshot.docs.map((item) => item.ref.delete()));

    const exactTopupOrder = {
        amount: 29_900,
        currency: 'INR',
        id: 'order_TopupScope123',
        notes: {
            billingStoreId: 202,
            creditAmount: 25,
            currency: 'INR',
            pId: 'ML',
            packId: 'enhancement_25',
            packName: 'Content Enhancement Pack',
            price: 29_900,
            productId: 'ML',
            sId: 202,
            storeId: 202,
            tId: 101,
            tenantId: 101,
        },
    };
    const exactPendingTopup = {
        amount: 29_900,
        billingDb: firestoreAdmin,
        billingStoreId: 202,
        creditsAdded: 25,
        currency: 'INR',
        order: exactTopupOrder,
        packId: 'enhancement_25',
        packName: 'Content Enhancement Pack',
        productId: PRODUCT_IDS.MENULIST,
        storeId: 202,
        tenantId: 101,
        userId: 'user_topup_scope_123',
    };
    assert.equal(await persistPendingProductTopupSnapshot(exactPendingTopup), 'created');
    const createdTopup = await firestoreAdmin.collection(DB_COLLECTIONS.TOPUPS).doc(exactTopupOrder.id).get();
    assert.equal(createdTopup.data()?.pId, 'ML');
    assert.equal(createdTopup.data()?.tId, 101);
    const firstCreatedOn = createdTopup.data()?.createdOn?.toMillis();
    assert.equal(await persistPendingProductTopupSnapshot(exactPendingTopup), 'replayed');
    assert.equal(
        (await firestoreAdmin.collection(DB_COLLECTIONS.TOPUPS).doc(exactTopupOrder.id).get()).data()?.createdOn?.toMillis(),
        firstCreatedOn,
        'exact pending replay must preserve the immutable creation time',
    );

    const conflictingTopupOrder = {
        ...exactTopupOrder,
        id: 'order_TopupCollision123',
    };
    const conflictingTopupRef = firestoreAdmin.collection(DB_COLLECTIONS.TOPUPS).doc(conflictingTopupOrder.id);
    await conflictingTopupRef.set({
        ...createdTopup.data(),
        pId: 'AL',
        productId: 'AL',
        providerOrderId: conflictingTopupOrder.id,
        status: 'paid',
    });
    await assert.rejects(
        persistPendingProductTopupSnapshot({
            ...exactPendingTopup,
            order: conflictingTopupOrder,
        }),
        /identity conflict/,
        'pending persistence must not overwrite an existing foreign or paid order id',
    );
    assert.equal((await conflictingTopupRef.get()).data()?.productId, 'AL');
    assert.equal((await conflictingTopupRef.get()).data()?.status, 'paid');

    await writeSubscription('sub_ConflictingScope123', baseSubscription({ tId: 999 }));
    assert.throws(
        () => composeInitialSubscriptionPayloadServer(baseSubscription({ tId: 999 }) as never),
        /tenant\/store identity is invalid/,
        'new MenuList payloads must reject conflicting duplicate scope aliases',
    );
    assert.equal(
        await getProductSubscriptionById(PRODUCT_IDS.MENULIST, 'sub_ConflictingScope123'),
        null,
        'direct MenuList reads must reject conflicting persisted scope aliases',
    );

    const statusResult = await applyProductSubscriptionStatusTransition(PRODUCT_IDS.MENULIST, {
        nextStatus: 'cancelled',
        statusEntry: {
            amount: 49_900,
            currency: 'INR',
            remark: 'must not apply',
            status: 'cancelled',
            timestamp: Timestamp.now() as never,
        },
        subscriptionId: 'sub_ConflictingScope123',
    });
    assert.equal(statusResult, null);
    assert.equal((await readSubscription('sub_ConflictingScope123')).status, 'active');
    await assert.rejects(
        updateProductSubscription(PRODUCT_IDS.MENULIST, 'sub_ConflictingScope123', { status: 'paused' }),
        /does not match the requested product and scope/,
        'direct updates must re-read and reject conflicting persisted ownership',
    );
    assert.equal((await readSubscription('sub_ConflictingScope123')).status, 'active');

    const paymentResult = await applyProductSubscriptionPayment(PRODUCT_IDS.MENULIST, {
        billingPeriod: 202607,
        paymentHistoryId: 'pay_ScopeBoundary123',
        statusEntry: {
            amount: 49_900,
            currency: 'INR',
            remark: 'must not apply',
            status: 'active',
            timestamp: Timestamp.now() as never,
        },
        subscriptionId: 'sub_ConflictingScope123',
        update: { monthlyCreditsAllowance: 75 },
    });
    assert.equal(paymentResult, null);
    assert.deepEqual((await readSubscription('sub_ConflictingScope123')).billingHistory, []);

    const webhookResult = await applyProductSubscriptionWebhookEvent(PRODUCT_IDS.MENULIST, {
        eventKey: 'evt_scope_boundary_123',
        nextStatus: 'past_due',
        subscriptionId: 'sub_ConflictingScope123',
    });
    assert.equal(webhookResult, null);
    assert.equal('webhookEventHistory' in await readSubscription('sub_ConflictingScope123'), false);

    await writeSubscription('sub_ForeignProduct123', baseSubscription({
        pId: 'AL',
        productId: 'AL',
    }));
    assert.equal(await applyProductSubscriptionWebhookEvent(PRODUCT_IDS.MENULIST, {
        eventKey: 'evt_foreign_product_123',
        nextStatus: 'past_due',
        subscriptionId: 'sub_ForeignProduct123',
    }), null);
    assert.equal((await readSubscription('sub_ForeignProduct123')).productId, 'AL');

    await assert.rejects(
        createProductInitialSubscription(
            PRODUCT_IDS.ANSWERLATTICE,
            'sub_AnswerlatticeConflictingScope123',
            baseSubscription({
                pId: 'AL',
                productId: 'AL',
                providerSubscriptionId: 'sub_AnswerlatticeConflictingScope123',
                tId: 999,
            }) as never,
        ),
        /tenant\/store identity is invalid/,
        'new Answerlattice payloads must reject conflicting duplicate scope aliases',
    );
    await createProductInitialSubscription(
        PRODUCT_IDS.ANSWERLATTICE,
        'sub_AnswerlatticeExactScope123',
        baseSubscription({
            pId: 'AL',
            productId: 'AL',
            providerSubscriptionId: 'sub_AnswerlatticeExactScope123',
        }) as never,
    );
    assert.equal(
        (await getProductSubscriptionById(PRODUCT_IDS.ANSWERLATTICE, 'sub_AnswerlatticeExactScope123'))?.productId,
        'AL',
    );
    await assert.rejects(
        createProductInitialSubscription(
            PRODUCT_IDS.MENULIST,
            'sub_ForeignProduct123',
            baseSubscription({ providerSubscriptionId: 'sub_ForeignProduct123' }) as never,
        ),
        /already exists|ALREADY_EXISTS/i,
        'initial persistence must not overwrite an existing foreign-product provider id',
    );
    assert.equal((await readSubscription('sub_ForeignProduct123')).productId, 'AL');

    await writeSubscription('sub_UpgradeOld123', baseSubscription({ sId: 999 }));
    await writeSubscription('sub_UpgradeNew123', baseSubscription({
        providerSubscriptionId: 'sub_UpgradeNew123',
        topUpCredits: 0,
    }));
    const upgradeResult = await applyProductSubscriptionUpgradeCarryForward(PRODUCT_IDS.MENULIST, {
        newSubscriptionId: 'sub_UpgradeNew123',
        oldSubscriptionId: 'sub_UpgradeOld123',
        storeId: 202,
        tenantId: 101,
    });
    assert.equal(upgradeResult?.applied, false);
    assert.equal(upgradeResult?.duplicate, false);
    assert.equal((await readSubscription('sub_UpgradeOld123')).status, 'active');
    assert.equal('carryForwardFromSubscriptionId' in await readSubscription('sub_UpgradeNew123'), false);

    await writeSubscription('sub_StringResetPeriod123', baseSubscription({
        billingHistory: ['pay_PreviousCycle123'],
        creditsLastResetMonth: '202608',
        monthlyCredits: 1,
        providerSubscriptionId: 'sub_StringResetPeriod123',
    }));
    const stringPeriodPayment = await applyProductSubscriptionPayment(PRODUCT_IDS.MENULIST, {
        billingPeriod: 202608,
        paymentHistoryId: 'pay_StringResetPeriod123',
        statusEntry: {
            amount: 49_900,
            currency: 'INR',
            remark: 'normalize the exact paid cycle',
            status: 'charged',
            timestamp: Timestamp.now() as never,
        },
        subscriptionId: 'sub_StringResetPeriod123',
        update: {},
    });
    assert.equal(stringPeriodPayment?.applied, true);
    const normalizedReset = await readSubscription('sub_StringResetPeriod123');
    assert.equal(normalizedReset.monthlyCredits, 75);
    assert.equal(normalizedReset.creditsLastResetMonth, 202608);

    await writeSubscription('sub_StringAllowance123', baseSubscription({
        billingHistory: ['pay_PreviousAllowanceCycle123'],
        creditsLastResetMonth: 202607,
        monthlyCredits: 1,
        monthlyCreditsAllowance: '75',
        providerSubscriptionId: 'sub_StringAllowance123',
    }));
    await assert.rejects(
        applyProductSubscriptionPayment(PRODUCT_IDS.MENULIST, {
            billingPeriod: 202608,
            paymentHistoryId: 'pay_StringAllowance123',
            statusEntry: {
                amount: 49_900,
                currency: 'INR',
                remark: 'must not coerce malformed allowance',
                status: 'charged',
                timestamp: Timestamp.now() as never,
            },
            subscriptionId: 'sub_StringAllowance123',
            update: {},
        }),
        /monthly credit allowance is invalid/,
    );
    const rejectedAllowance = await readSubscription('sub_StringAllowance123');
    assert.deepEqual(rejectedAllowance.billingHistory, ['pay_PreviousAllowanceCycle123']);
    assert.equal(rejectedAllowance.monthlyCredits, 1);

    await writeSubscription('sub_ExactScope123', baseSubscription());
    const exactResult = await applyProductSubscriptionStatusTransition(PRODUCT_IDS.MENULIST, {
        nextStatus: 'cancelled',
        statusEntry: {
            amount: 49_900,
            currency: 'INR',
            remark: 'valid exact-scope transition',
            status: 'cancelled',
            timestamp: Timestamp.now() as never,
        },
        subscriptionId: 'sub_ExactScope123',
    });
    assert.equal(exactResult?.applied, true);
    assert.equal((await readSubscription('sub_ExactScope123')).status, 'cancelled');
    await updateProductSubscription(PRODUCT_IDS.MENULIST, 'sub_ExactScope123', { status: 'paused' });
    assert.equal((await readSubscription('sub_ExactScope123')).status, 'paused');

    console.log('Product subscription scope emulator tests passed.');
}

void run();
