import assert from 'node:assert/strict';
import { deleteApp } from 'firebase-admin/app';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { DEFAULT_PRODUCT_ID } from '../../src/constants/product';
import {
    createResellerOnboardingBillingServer,
    getResellerOfflineCapFromError,
} from '../../src/database/reseller/server';
import { admin, firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';
import { markResellerTransactionsActiveForSubscription } from '../../src/lib/reseller/resellerLedger';

const prefix = `reseller-onboarding-${Date.now()}`;
const profileRef = firestoreAdmin.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(`${prefix}-profile`);

const subscription = (subscriptionId: string, paymentMode: 'offline' | 'online', amount: number) => ({
    amount,
    billingHistory: [],
    billingMode: paymentMode === 'offline' ? 'manual' : 'auto',
    commitmentPeriodMonths: paymentMode === 'offline' ? 3 : null,
    currency: 'INR',
    email: 'owner@example.com',
    monthlyCredits: 75,
    monthlyCreditsAllowance: 75,
    name: 'Boundary Cafe',
    onboardingSource: 'RESELLER_ONBOARDING',
    paymentMethod: { type: paymentMode === 'offline' ? 'offline' : '' },
    paymentProvider: 'razorpay',
    pId: DEFAULT_PRODUCT_ID,
    planId: 'reseller_founder_400',
    planName: 'MenuList Starter',
    planType: 'MONTH',
    providerPlanId: paymentMode === 'offline' ? '' : 'provider_plan',
    providerSubscriptionId: subscriptionId,
    productId: DEFAULT_PRODUCT_ID,
    quantity: 1,
    resellerId: 'reseller_auth_uid',
    resellerProfileId: profileRef.id,
    resellerPricingTier: 'FOUNDER_400',
    shortUrl: paymentMode === 'offline' ? '' : 'https://rzp.io/i/example',
    status: paymentMode === 'offline' ? 'active' : 'pending',
    statuses: [],
    sId: paymentMode === 'offline' ? 41 : 42,
    storeId: paymentMode === 'offline' ? 41 : 42,
    tId: paymentMode === 'offline' ? 31 : 32,
    tenantId: paymentMode === 'offline' ? 31 : 32,
    topUpCredits: 0,
    totalPaymentsMadeCount: paymentMode === 'offline' ? 1 : 0,
    totalPaymentsNeededCount: paymentMode === 'offline' ? 1 : 36,
    userId: 'owner_auth_uid',
    userType: 'B2C',
}) as any;

const onboardingTransaction = (params: {
    amount: number;
    operationId: string;
    paymentMode: 'offline' | 'online';
    storeId: number;
    subscriptionId: string;
    tenantId: number;
}) => ({
    action: 'ONBOARD' as const,
    amountExpected: params.amount,
    billingInterval: 'MONTH' as const,
    ...(params.paymentMode === 'offline' ? { commitmentMonths: 3 } : {}),
    currency: 'INR' as const,
    locationCount: 1,
    operationFingerprint: `${params.operationId}-fingerprint`,
    operationId: params.operationId,
    paymentMode: params.paymentMode,
    pricingTier: 'FOUNDER_400',
    profileRevenueRecognized: params.paymentMode === 'offline',
    resellerEmail: 'reseller@example.com',
    resellerId: 'reseller_auth_uid',
    resellerProfileId: profileRef.id,
    status: params.paymentMode === 'offline' ? 'active' as const : 'pending_payment' as const,
    storeId: params.storeId,
    storeName: 'Boundary Cafe',
    subscriptionId: params.subscriptionId,
    subscriptionQuantity: 1,
    tenantId: params.tenantId,
    validFrom: null,
    validUntil: null,
});

async function run(): Promise<void> {
    await profileRef.set({
        active: true,
        authUserId: 'reseller_auth_uid',
        currentActiveOfflineStores: 0,
        maxOfflineActivations: 1,
        totalOfflineStores: 0,
        totalOnlineStores: 0,
        totalRevenueCollectedPaise: 0,
        totalStoresOnboarded: 0,
        totalTransactions: 0,
    });

    const offlineOperationId = '2b167ac8-c4c1-4c90-aa8b-a2d3df7a4f18';
    const offlineSubscriptionId = `manual_${offlineOperationId}`;
    const offlineTransaction = onboardingTransaction({
        amount: 120_000,
        operationId: offlineOperationId,
        paymentMode: 'offline',
        storeId: 41,
        subscriptionId: offlineSubscriptionId,
        tenantId: 31,
    });
    const first = await createResellerOnboardingBillingServer({
        profileId: profileRef.id,
        subscription: subscription(offlineSubscriptionId, 'offline', 120_000),
        subscriptionId: offlineSubscriptionId,
        transaction: offlineTransaction,
    });
    assert.equal(first.replayed, false);

    const replay = await createResellerOnboardingBillingServer({
        profileId: profileRef.id,
        subscription: subscription(offlineSubscriptionId, 'offline', 120_000),
        subscriptionId: offlineSubscriptionId,
        transaction: offlineTransaction,
    });
    assert.equal(replay.replayed, true);
    const offlineSubscriptionRef = firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(offlineSubscriptionId);
    await offlineSubscriptionRef.set({ tId: 999_999 }, { merge: true });
    await assert.rejects(
        createResellerOnboardingBillingServer({
            profileId: profileRef.id,
            subscription: subscription(offlineSubscriptionId, 'offline', 120_000),
            subscriptionId: offlineSubscriptionId,
            transaction: offlineTransaction,
        }),
        /operation id is already used by another action/,
        'A replay must reject transaction-current conflicting subscription ownership',
    );
    await offlineSubscriptionRef.set({ tId: 31 }, { merge: true });
    let profile = (await profileRef.get()).data();
    assert.equal(profile?.currentActiveOfflineStores, 1);
    assert.equal(profile?.totalOfflineStores, 1);
    assert.equal(profile?.totalRevenueCollectedPaise, 120_000);
    assert.equal(profile?.totalTransactions, 1);

    const cappedOperationId = 'f38313f7-00f7-48dc-a5ac-45530c42c565';
    const cappedSubscriptionId = `manual_${cappedOperationId}`;
    await assert.rejects(
        createResellerOnboardingBillingServer({
            profileId: profileRef.id,
            subscription: subscription(cappedSubscriptionId, 'offline', 120_000),
            subscriptionId: cappedSubscriptionId,
            transaction: onboardingTransaction({
                amount: 120_000,
                operationId: cappedOperationId,
                paymentMode: 'offline',
                storeId: 43,
                subscriptionId: cappedSubscriptionId,
                tenantId: 33,
            }),
        }),
        (error: unknown) => getResellerOfflineCapFromError(error) === 1,
    );
    assert.equal((await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(cappedSubscriptionId).get()).exists, false);

    const malformedProfileRef = firestoreAdmin
        .collection(DB_COLLECTIONS.RESELLER_PROFILES)
        .doc(`${prefix}-malformed-counter-profile`);
    const malformedOperationId = '7ab59b7d-b6a0-4d63-a4f7-835d24ae93ed';
    const malformedSubscriptionId = `manual_${malformedOperationId}`;
    await malformedProfileRef.set({
        active: true,
        authUserId: 'reseller_auth_uid',
        currentActiveOfflineStores: 0,
        maxOfflineActivations: 2,
        totalOfflineStores: 0,
        totalOnlineStores: 0,
        totalRevenueCollectedPaise: 0,
        totalStoresOnboarded: 0,
        totalTransactions: '0',
    });
    await assert.rejects(createResellerOnboardingBillingServer({
        profileId: malformedProfileRef.id,
        subscription: {
            ...subscription(malformedSubscriptionId, 'offline', 40_000),
            resellerProfileId: malformedProfileRef.id,
        },
        subscriptionId: malformedSubscriptionId,
        transaction: {
            ...onboardingTransaction({
                amount: 40_000,
                operationId: malformedOperationId,
                paymentMode: 'offline',
                storeId: 48,
                subscriptionId: malformedSubscriptionId,
                tenantId: 38,
            }),
            resellerProfileId: malformedProfileRef.id,
        },
    }), /profile counters are invalid/);
    assert.equal((await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(malformedSubscriptionId).get()).exists, false);

    const overflowProfileRef = firestoreAdmin
        .collection(DB_COLLECTIONS.RESELLER_PROFILES)
        .doc(`${prefix}-overflow-profile`);
    const overflowOperationId = 'd42c727c-47db-4a69-b2ee-da0cf77008c5';
    const overflowSubscriptionId = `${prefix}-overflow-subscription`;
    await overflowProfileRef.set({
        active: true,
        authUserId: 'reseller_auth_uid',
        totalRevenueCollectedPaise: 0,
        totalStoresOnboarded: Number.MAX_SAFE_INTEGER,
    });
    await assert.rejects(createResellerOnboardingBillingServer({
        profileId: overflowProfileRef.id,
        subscription: {
            ...subscription(overflowSubscriptionId, 'online', 40_000),
            resellerProfileId: overflowProfileRef.id,
        },
        subscriptionId: overflowSubscriptionId,
        transaction: {
            ...onboardingTransaction({
                amount: 40_000,
                operationId: overflowOperationId,
                paymentMode: 'online',
                storeId: 50,
                subscriptionId: overflowSubscriptionId,
                tenantId: 40,
            }),
            resellerProfileId: overflowProfileRef.id,
        },
    }), /profile counters would overflow/);
    assert.equal((await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(overflowSubscriptionId).get()).exists, false);

    const foreignInitialProfileRef = firestoreAdmin
        .collection(DB_COLLECTIONS.RESELLER_PROFILES)
        .doc(`${prefix}-foreign-initial-profile`);
    const foreignInitialOperationId = 'b2b453d3-e1d1-47db-908a-bf4b4a05e866';
    const foreignInitialSubscriptionId = `${prefix}-foreign-initial-subscription`;
    await foreignInitialProfileRef.set({
        active: true,
        authUserId: 'another-reseller',
        totalRevenueCollectedPaise: 0,
    });
    await assert.rejects(createResellerOnboardingBillingServer({
        profileId: foreignInitialProfileRef.id,
        subscription: {
            ...subscription(foreignInitialSubscriptionId, 'online', 40_000),
            resellerProfileId: foreignInitialProfileRef.id,
        },
        subscriptionId: foreignInitialSubscriptionId,
        transaction: {
            ...onboardingTransaction({
                amount: 40_000,
                operationId: foreignInitialOperationId,
                paymentMode: 'online',
                storeId: 49,
                subscriptionId: foreignInitialSubscriptionId,
                tenantId: 39,
            }),
            resellerProfileId: foreignInitialProfileRef.id,
        },
    }), /profile identity is invalid/);
    assert.equal((await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(foreignInitialSubscriptionId).get()).exists, false);

    const provisionalProfileRef = firestoreAdmin
        .collection(DB_COLLECTIONS.RESELLER_PROFILES)
        .doc(`${prefix}-provisional-profile`);
    const provisionalOperationId = 'f2aeeebd-2d43-4d06-9867-9af65c51c112';
    const provisionalSubscriptionId = `${prefix}-provisional-subscription`;
    const provisionalTransaction = {
        ...onboardingTransaction({
            amount: 40_000,
            operationId: provisionalOperationId,
            paymentMode: 'online',
            storeId: 52,
            subscriptionId: provisionalSubscriptionId,
            tenantId: 42,
        }),
        resellerProfileId: provisionalProfileRef.id,
    };
    await provisionalProfileRef.set({
        active: true,
        authUserId: 'reseller_auth_uid',
        currentActiveOfflineStores: 0,
        totalOfflineStores: 0,
        totalOnlineStores: 0,
        totalRevenueCollectedPaise: 0,
        totalStoresOnboarded: 0,
        totalTransactions: 0,
    });
    const provisionalOperationRef = firestoreAdmin
        .collection(DB_COLLECTIONS.RESELLER_TRANSACTIONS)
        .doc(provisionalOperationId);
    await provisionalOperationRef.set({
        action: 'ONBOARD',
        authUid: 'owner_auth_uid',
        operationFingerprint: provisionalTransaction.operationFingerprint,
        operationId: provisionalOperationId,
        paymentMode: 'online',
        resellerId: 'reseller_auth_uid',
        status: 'provider_provisioning',
        storeId: 52,
        tenantId: 42,
        userId: 'owner_auth_uid',
    });
    const provisionalResult = await createResellerOnboardingBillingServer({
        profileId: provisionalProfileRef.id,
        subscription: {
            ...subscription(provisionalSubscriptionId, 'online', 40_000),
            resellerProfileId: provisionalProfileRef.id,
            sId: 52,
            storeId: 52,
            tId: 42,
            tenantId: 42,
        },
        subscriptionId: provisionalSubscriptionId,
        transaction: provisionalTransaction,
    });
    assert.equal(provisionalResult.replayed, false);
    assert.equal((await provisionalOperationRef.get()).data()?.status, 'pending_payment');
    assert.equal((await provisionalOperationRef.get()).data()?.authUid, undefined);
    assert.equal((await provisionalProfileRef.get()).data()?.totalTransactions, 1);
    const provisionalReplay = await createResellerOnboardingBillingServer({
        profileId: provisionalProfileRef.id,
        subscription: {
            ...subscription(provisionalSubscriptionId, 'online', 40_000),
            resellerProfileId: provisionalProfileRef.id,
            sId: 52,
            storeId: 52,
            tId: 42,
            tenantId: 42,
        },
        subscriptionId: provisionalSubscriptionId,
        transaction: provisionalTransaction,
    });
    assert.equal(provisionalReplay.replayed, true);
    assert.equal((await provisionalProfileRef.get()).data()?.totalTransactions, 1);

    const onlineOperationId = 'f56e42da-c45a-4394-bc76-c29f769f4507';
    const onlineSubscriptionId = `${prefix}-online-subscription`;
    await createResellerOnboardingBillingServer({
        profileId: profileRef.id,
        subscription: subscription(onlineSubscriptionId, 'online', 40_000),
        subscriptionId: onlineSubscriptionId,
        transaction: onboardingTransaction({
            amount: 40_000,
            operationId: onlineOperationId,
            paymentMode: 'online',
            storeId: 42,
            subscriptionId: onlineSubscriptionId,
            tenantId: 32,
        }),
    });
    profile = (await profileRef.get()).data();
    assert.equal(profile?.totalRevenueCollectedPaise, 120_000);
    assert.equal(profile?.totalOnlineStores, 1);

    assert.equal(await markResellerTransactionsActiveForSubscription(onlineSubscriptionId, 'emulator:first'), 1);
    assert.equal(await markResellerTransactionsActiveForSubscription(onlineSubscriptionId, 'emulator:replay'), 0);
    profile = (await profileRef.get()).data();
    assert.equal(profile?.totalRevenueCollectedPaise, 160_000);
    const onlineLedger = (await firestoreAdmin.collection(DB_COLLECTIONS.RESELLER_TRANSACTIONS).doc(onlineOperationId).get()).data();
    assert.equal(onlineLedger?.status, 'active');
    assert.equal(onlineLedger?.profileRevenueRecognized, true);

    const nonOnlineTransactionRef = firestoreAdmin
        .collection(DB_COLLECTIONS.RESELLER_TRANSACTIONS)
        .doc(`${prefix}-non-online-operation`);
    await nonOnlineTransactionRef.set({
        ...onboardingTransaction({
            amount: 40_000,
            operationId: `${prefix}-non-online-operation`,
            paymentMode: 'offline',
            storeId: 47,
            subscriptionId: onlineSubscriptionId,
            tenantId: 37,
        }),
        profileRevenueRecognized: false,
        status: 'pending_payment',
    });
    assert.equal(await markResellerTransactionsActiveForSubscription(onlineSubscriptionId, 'emulator:non-online'), 0);
    assert.equal((await nonOnlineTransactionRef.get()).data()?.status, 'pending_payment');
    assert.equal((await nonOnlineTransactionRef.get()).data()?.profileRevenueRecognized, false);

    const repairProfileRef = firestoreAdmin
        .collection(DB_COLLECTIONS.RESELLER_PROFILES)
        .doc(`${prefix}-repair-profile`);
    const repairOperationId = `${prefix}-repair-operation`;
    const repairSubscriptionId = `${prefix}-repair-subscription`;
    const repairTransactionRef = firestoreAdmin
        .collection(DB_COLLECTIONS.RESELLER_TRANSACTIONS)
        .doc(repairOperationId);
    await repairTransactionRef.set({
        ...onboardingTransaction({
            amount: 25_000,
            operationId: repairOperationId,
            paymentMode: 'online',
            storeId: 44,
            subscriptionId: repairSubscriptionId,
            tenantId: 34,
        }),
        resellerProfileId: repairProfileRef.id,
    });
    assert.equal(await markResellerTransactionsActiveForSubscription(repairSubscriptionId, 'emulator:missing-profile'), 1);
    assert.equal((await repairTransactionRef.get()).data()?.profileRevenueRecognized, false);
    await repairProfileRef.set({
        active: true,
        authUserId: 'reseller_auth_uid',
        totalRevenueCollectedPaise: 0,
    });
    assert.equal(await markResellerTransactionsActiveForSubscription(repairSubscriptionId, 'emulator:repair'), 0);
    assert.equal((await repairTransactionRef.get()).data()?.profileRevenueRecognized, true);
    assert.equal((await repairProfileRef.get()).data()?.totalRevenueCollectedPaise, 25_000);

    const foreignProfileRef = firestoreAdmin
        .collection(DB_COLLECTIONS.RESELLER_PROFILES)
        .doc(`${prefix}-foreign-profile`);
    const foreignOperationId = `${prefix}-foreign-operation`;
    const foreignSubscriptionId = `${prefix}-foreign-subscription`;
    const foreignTransactionRef = firestoreAdmin
        .collection(DB_COLLECTIONS.RESELLER_TRANSACTIONS)
        .doc(foreignOperationId);
    await foreignProfileRef.set({
        active: true,
        authUserId: 'another-reseller',
        totalRevenueCollectedPaise: 0,
    });
    await foreignTransactionRef.set({
        ...onboardingTransaction({
            amount: 30_000,
            operationId: foreignOperationId,
            paymentMode: 'online',
            storeId: 45,
            subscriptionId: foreignSubscriptionId,
            tenantId: 35,
        }),
        resellerProfileId: foreignProfileRef.id,
    });
    assert.equal(await markResellerTransactionsActiveForSubscription(foreignSubscriptionId, 'emulator:foreign-profile'), 1);
    assert.equal((await foreignTransactionRef.get()).data()?.profileRevenueRecognized, false);
    assert.equal((await foreignProfileRef.get()).data()?.totalRevenueCollectedPaise, 0);

    const stringAmountOperationId = `${prefix}-string-amount-operation`;
    const stringAmountSubscriptionId = `${prefix}-string-amount-subscription`;
    const stringAmountTransactionRef = firestoreAdmin
        .collection(DB_COLLECTIONS.RESELLER_TRANSACTIONS)
        .doc(stringAmountOperationId);
    await stringAmountTransactionRef.set({
        ...onboardingTransaction({
            amount: 1,
            operationId: stringAmountOperationId,
            paymentMode: 'online',
            storeId: 46,
            subscriptionId: stringAmountSubscriptionId,
            tenantId: 36,
        }),
        amountExpected: '40000',
    });
    assert.equal(await markResellerTransactionsActiveForSubscription(stringAmountSubscriptionId, 'emulator:string-amount'), 1);
    assert.equal((await stringAmountTransactionRef.get()).data()?.profileRevenueRecognized, false);
    assert.equal((await profileRef.get()).data()?.totalRevenueCollectedPaise, 160_000);
}

run()
    .then(async () => {
        console.log('Reseller onboarding billing emulator tests passed.');
        await deleteApp(admin.app());
    })
    .catch(async (error) => {
        console.error(error);
        await deleteApp(admin.app());
        process.exitCode = 1;
    });
