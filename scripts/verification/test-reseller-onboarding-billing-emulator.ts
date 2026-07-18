import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
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
    planId: 'reseller_founder_400',
    planName: 'MenuList Starter',
    planType: 'MONTH',
    providerPlanId: paymentMode === 'offline' ? '' : 'provider_plan',
    providerSubscriptionId: subscriptionId,
    quantity: 1,
    resellerId: 'reseller_auth_uid',
    resellerProfileId: profileRef.id,
    resellerPricingTier: 'FOUNDER_400',
    shortUrl: paymentMode === 'offline' ? '' : 'https://rzp.io/i/example',
    status: paymentMode === 'offline' ? 'active' : 'pending',
    statuses: [],
    storeId: paymentMode === 'offline' ? 41 : 42,
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
    commitmentMonths: params.paymentMode === 'offline' ? 3 : undefined,
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
}

run()
    .then(async () => {
        console.log('Reseller onboarding billing emulator tests passed.');
        await admin.app().delete();
    })
    .catch(async (error) => {
        console.error(error);
        await admin.app().delete();
        process.exitCode = 1;
    });
