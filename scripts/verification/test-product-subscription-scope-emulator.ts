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
    syncAnswerlatticeSubscriptionEntitlementFromSubscription,
    updateProductSubscription,
} from '../../src/lib/billing/productBillingServer';
import {
    composeInitialSubscriptionPayloadServer,
    getDirectActiveSubscriptionForStoreServer,
} from '../../src/database/subscriptions/server';
import { firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { persistPendingProductTopupSnapshot } from '../../src/lib/billing/topupSettlementServer';
import { syncStorePlanEntitlementFromSubscription } from '../../src/lib/billing/subscriptionEntitlementSync';

const baseSubscription = (overrides: Record<string, unknown> = {}) => ({
    amount: 49_900,
    billingHistory: ['pay_ScopeBoundary123'],
    creditsLastResetMonth: 202607,
    currency: 'INR',
    monthlyCredits: 50,
    monthlyCreditsAllowance: 75,
    pId: 'ML',
    paymentProvider: 'razorpay',
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

    await writeSubscription('sub_ImmutableScope123', baseSubscription({
        providerSubscriptionId: 'sub_ImmutableScope123',
    }));
    await assert.rejects(
        updateProductSubscription(PRODUCT_IDS.MENULIST, 'sub_ImmutableScope123', {
            sId: 303,
            storeId: 303,
            tId: 404,
            tenantId: 404,
        }),
        /scope is immutable/,
        'a generic MenuList update must not move a subscription to another workspace',
    );
    const immutableScopeSubscription = await readSubscription('sub_ImmutableScope123');
    assert.equal(immutableScopeSubscription.tId, 101);
    assert.equal(immutableScopeSubscription.tenantId, 101);
    assert.equal(immutableScopeSubscription.sId, 202);
    assert.equal(immutableScopeSubscription.storeId, 202);

    await writeSubscription('sub_PendingCannotEntitle123', baseSubscription({
        cycleEndDate: null,
        providerSubscriptionId: 'sub_PendingCannotEntitle123',
        status: 'pending',
    }));
    assert.equal(
        await getDirectActiveSubscriptionForStoreServer(101, 202),
        null,
        'a pending subscription must not enter paid entitlement truth',
    );
    await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc('sub_PendingCannotEntitle123').delete();

    await writeSubscription('sub_UnpaidActiveCannotEntitle123', baseSubscription({
        billingHistory: [],
        cycleEndDate: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
        providerSubscriptionId: 'sub_UnpaidActiveCannotEntitle123',
    }));
    assert.equal(
        await getDirectActiveSubscriptionForStoreServer(101, 202),
        null,
        'a provider-active subscription without captured payment evidence must not enter server entitlement truth',
    );
    await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc('sub_UnpaidActiveCannotEntitle123').delete();

    await writeSubscription('sub_StalePausedCannotEntitle123', baseSubscription({
        cycleEndDate: Timestamp.fromMillis(Date.now() - 60_000),
        providerSubscriptionId: 'sub_StalePausedCannotEntitle123',
        status: 'paused',
    }));
    assert.equal(
        await getDirectActiveSubscriptionForStoreServer(101, 202),
        null,
        'a paused subscription beyond its paid cycle must not enter entitlement truth',
    );
    await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc('sub_StalePausedCannotEntitle123').delete();

    await writeSubscription('sub_PastDueGrace123', baseSubscription({
        cycleEndDate: Timestamp.fromMillis(Date.now() - 60_000),
        pastDueSinceAt: Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000),
        providerSubscriptionId: 'sub_PastDueGrace123',
        status: 'past_due',
    }));
    assert.equal(
        (await getDirectActiveSubscriptionForStoreServer(101, 202))?.id,
        'sub_PastDueGrace123',
        'a past-due subscription inside payment recovery must remain available after cycle end',
    );
    await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc('sub_PastDueGrace123').delete();

    await writeSubscription('sub_PastDueMissingMarker123', baseSubscription({
        cycleEndDate: Timestamp.fromMillis(Date.now() - 60_000),
        pastDueSinceAt: null,
        providerSubscriptionId: 'sub_PastDueMissingMarker123',
        status: 'past_due',
    }));
    assert.equal(
        await getDirectActiveSubscriptionForStoreServer(101, 202),
        null,
        'past-due entitlement must fail closed when its recovery start is missing',
    );
    await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc('sub_PastDueMissingMarker123').delete();

    await writeSubscription('sub_PastDueMalformedMarker123', baseSubscription({
        cycleEndDate: Timestamp.fromMillis(Date.now() - 60_000),
        pastDueSinceAt: 'not-a-timestamp',
        providerSubscriptionId: 'sub_PastDueMalformedMarker123',
        status: 'past_due',
    }));
    assert.equal(
        await getDirectActiveSubscriptionForStoreServer(101, 202),
        null,
        'past-due entitlement must fail closed when its recovery start is malformed',
    );
    await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc('sub_PastDueMalformedMarker123').delete();
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
    assert.deepEqual(
        (await readSubscription('sub_ConflictingScope123')).billingHistory,
        ['pay_ScopeBoundary123'],
    );
    await assert.rejects(
        applyProductSubscriptionPayment(PRODUCT_IDS.MENULIST, {
            billingPeriod: 202607,
            paymentHistoryId: 'evt_NotCapturedPayment123',
            statusEntry: {
                amount: 49_900,
                currency: 'INR',
                remark: 'must reject non-payment authority',
                status: 'charged',
                timestamp: Timestamp.now() as never,
            },
            subscriptionId: 'sub_ConflictingScope123',
            update: {},
        }),
        /Invalid subscription payment application/,
        'the captured-payment transaction boundary must reject non-pay provider identifiers',
    );

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
    await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc('202').set({
        active: true,
        pId: 'AL',
        productId: 'AL',
        sId: 202,
        storeId: 202,
        tId: 101,
        tenantId: 101,
    });
    const answerlatticeFutureCycleEnd = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
    await createProductInitialSubscription(
        PRODUCT_IDS.ANSWERLATTICE,
        'sub_AnswerlatticeExactScope123',
        baseSubscription({
            pId: 'AL',
            productId: 'AL',
            providerSubscriptionId: 'sub_AnswerlatticeExactScope123',
            cycleEndDate: answerlatticeFutureCycleEnd,
            planId: 'answerlattice_growth',
        }) as never,
    );
    assert.equal(
        (await getProductSubscriptionById(PRODUCT_IDS.ANSWERLATTICE, 'sub_AnswerlatticeExactScope123'))?.productId,
        'AL',
    );
    const exactAnswerlatticeSubscription = await getProductSubscriptionById(
        PRODUCT_IDS.ANSWERLATTICE,
        'sub_AnswerlatticeExactScope123',
    );
    assert.ok(exactAnswerlatticeSubscription);
    await syncAnswerlatticeSubscriptionEntitlementFromSubscription({
        ...exactAnswerlatticeSubscription,
        tId: 999,
    }, 'conflicting_entry_scope_must_not_sync');
    const answerlatticeStoreAfterConflictingSync = (
        await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc('202').get()
    ).data();
    assert.equal(
        answerlatticeStoreAfterConflictingSync?.answerlatticeSubscription,
        undefined,
        'a conflicting input subscription alias must not write Answerlattice store entitlement',
    );
    assert.equal(
        (await readSubscription('sub_AnswerlatticeExactScope123')).analyticsEntitlement,
        undefined,
        'a conflicting input subscription alias must not acknowledge entitlement sync',
    );
    await Promise.all(Array.from({ length: 10 }, (_, index) => (
        writeSubscription(
            `sub_AnswerlatticeAliasConflict${String(index).padStart(2, '0')}`,
            baseSubscription({
                cycleEndDate: Timestamp.fromMillis(
                    answerlatticeFutureCycleEnd.toMillis() + ((index + 1) * 24 * 60 * 60 * 1000),
                ),
                pId: 'AL',
                planId: 'answerlattice_studio',
                productId: 'AL',
                providerSubscriptionId: `sub_AnswerlatticeAliasConflict${String(index).padStart(2, '0')}`,
                sId: 800 + index,
                tId: 900 + index,
            }),
        )
    )));
    await syncAnswerlatticeSubscriptionEntitlementFromSubscription(
        exactAnswerlatticeSubscription,
        'exact_aliases_must_filter_before_bounded_query',
    );
    const answerlatticeStoreAfterBoundedQuery = (
        await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc('202').get()
    ).data();
    assert.equal(
        answerlatticeStoreAfterBoundedQuery?.activePlanType,
        'answerlattice_growth',
        'conflicting duplicate aliases must be excluded before the bounded active-subscription query',
    );
    assert.equal(
        answerlatticeStoreAfterBoundedQuery?.answerlatticeSubscription?.id,
        'sub_AnswerlatticeExactScope123',
        'an exact current subscription must remain discoverable behind more than ten conflicting alias rows',
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

    await writeSubscription('sub_TerminalUpgradeOld123', baseSubscription({
        providerSubscriptionId: 'sub_TerminalUpgradeOld123',
    }));
    await writeSubscription('sub_TerminalUpgradeNew123', baseSubscription({
        billingHistory: ['pay_TerminalUpgrade123'],
        providerStatus: 'cancelled',
        providerSubscriptionId: 'sub_TerminalUpgradeNew123',
        replacementForSubscriptionId: 'sub_TerminalUpgradeOld123',
        status: 'cancelled',
        topUpCredits: 0,
    }));
    const terminalUpgradeResult = await applyProductSubscriptionUpgradeCarryForward(
        PRODUCT_IDS.MENULIST,
        {
            newSubscriptionId: 'sub_TerminalUpgradeNew123',
            oldSubscriptionId: 'sub_TerminalUpgradeOld123',
            storeId: 202,
            terminalCapturedPaymentId: 'pay_TerminalUpgrade123',
            tenantId: 101,
        },
    );
    assert.equal(terminalUpgradeResult?.applied, true);
    assert.equal((await readSubscription('sub_TerminalUpgradeOld123')).status, 'expired');
    const terminalReplacement = await readSubscription('sub_TerminalUpgradeNew123');
    assert.equal(terminalReplacement.status, 'cancelled');
    assert.equal(
        terminalReplacement.carryForwardFromSubscriptionId,
        'sub_TerminalUpgradeOld123',
    );

    await writeSubscription('sub_UnpaidTerminalUpgradeOld123', baseSubscription({
        providerSubscriptionId: 'sub_UnpaidTerminalUpgradeOld123',
    }));
    await writeSubscription('sub_UnpaidTerminalUpgradeNew123', baseSubscription({
        providerStatus: 'cancelled',
        providerSubscriptionId: 'sub_UnpaidTerminalUpgradeNew123',
        replacementForSubscriptionId: 'sub_UnpaidTerminalUpgradeOld123',
        status: 'cancelled',
        topUpCredits: 0,
    }));
    const unpaidTerminalUpgradeResult = await applyProductSubscriptionUpgradeCarryForward(
        PRODUCT_IDS.MENULIST,
        {
            newSubscriptionId: 'sub_UnpaidTerminalUpgradeNew123',
            oldSubscriptionId: 'sub_UnpaidTerminalUpgradeOld123',
            storeId: 202,
            terminalCapturedPaymentId: 'pay_UnpaidTerminalUpgrade123',
            tenantId: 101,
        },
    );
    assert.equal(unpaidTerminalUpgradeResult?.applied, false);
    assert.equal((await readSubscription('sub_UnpaidTerminalUpgradeOld123')).status, 'active');

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

    const futureCycleEnd = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
    await writeSubscription('sub_EntitlementStoreRace123', baseSubscription({
        cycleEndDate: futureCycleEnd,
        planId: 'growth',
        providerSubscriptionId: 'sub_EntitlementStoreRace123',
    }));
    const reassignedStoreRef = firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc('202');
    await reassignedStoreRef.set({
        activePlanType: 'foreign-plan',
        sId: 202,
        storeId: 202,
        tId: 999,
        tenantId: 999,
    });
    await syncStorePlanEntitlementFromSubscription({
        id: 'sub_EntitlementStoreRace123',
        planId: 'growth',
        status: 'active',
        storeId: 202,
        tenantId: 101,
    }, 'emulator:store-reassignment-race');
    assert.equal(
        (await reassignedStoreRef.get()).data()?.activePlanType,
        'foreign-plan',
        'A stale subscription must not overwrite a store that now belongs to another tenant',
    );
    assert.equal(
        (await readSubscription('sub_EntitlementStoreRace123')).analyticsEntitlement,
        undefined,
        'A store-scope mismatch must leave the subscription entitlement retryable',
    );

    const malformedStatusStoreRef = firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc('303');
    await malformedStatusStoreRef.set({
        activePlanType: 'stale-plan',
        pId: 'ML',
        productId: 'ML',
        sId: 303,
        storeId: 303,
        tId: 101,
        tenantId: 101,
    });
    await writeSubscription('sub_EntitlementValidCandidate123', baseSubscription({
        cycleEndDate: futureCycleEnd,
        planId: 'pro',
        providerSubscriptionId: 'sub_EntitlementValidCandidate123',
        sId: 303,
        storeId: 303,
    }));
    await writeSubscription('sub_EntitlementMalformedStatus123', baseSubscription({
        providerSubscriptionId: 'sub_EntitlementMalformedStatus123',
        sId: 303,
        status: { attackerControlled: true },
        storeId: 303,
    }));
    await syncStorePlanEntitlementFromSubscription({
        id: 'sub_EntitlementMalformedStatus123',
        planId: 'stale-plan',
        status: 'active',
        storeId: 303,
        tenantId: 101,
    }, 'emulator:malformed-transaction-current-status');
    assert.equal(
        (await malformedStatusStoreRef.get()).data()?.activePlanType,
        'pro',
        'an exact current candidate must still repair the store plan mirror',
    );
    const malformedStatusAudit = (
        await readSubscription('sub_EntitlementMalformedStatus123')
    ).analyticsEntitlement;
    assert.ok(
        malformedStatusAudit
        && typeof malformedStatusAudit === 'object'
        && !Array.isArray(malformedStatusAudit),
        'the source subscription must receive a bounded entitlement audit mirror',
    );
    assert.equal(
        (malformedStatusAudit as Record<string, unknown>).status,
        null,
        'malformed transaction-current status must not enter the typed entitlement audit mirror',
    );

    console.log('Product subscription scope emulator tests passed.');
}

void run();
