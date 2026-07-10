#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { DEFAULT_PRODUCT_ID } from '@constant/product';
import {
    OWNER_REFERRAL_LEDGER_EVENT,
    OWNER_REFERRAL_REFERRED_CREDITS,
    OWNER_REFERRAL_REFERRER_CREDITS,
    OWNER_REFERRAL_STATUS,
} from '@data/shared/ownerReferralPolicy';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { setOwnerReferralAttributionBeforeSubscription } from '@lib/ownerReferral/ownerReferralAttributionServer';
import {
    recordReferredOwnerReferralPaymentAndSettle,
    settlePendingOwnerReferralsForPaidStore,
} from '@lib/ownerReferral/ownerReferralSettlementServer';
import {
    getOwnerReferralDocumentId,
    getOwnerReferralRewardIssueId,
    getOwnerReferralRewardTransactionId,
} from '@lib/ownerReferral/ownerReferralTokenServer';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-owner-referral';
const ROOT = path.resolve(__dirname, '..', '..');

const assert = (condition: unknown, message: string): void => {
    if (!condition) throw new Error(message);
};

const makePaidSubscription = (params: {
    manual?: boolean;
    storeId: number;
    tenantId: number;
    topUpCredits: number;
}) => {
    const now = admin.firestore.Timestamp.now();
    const future = admin.firestore.Timestamp.fromMillis(Date.now() + 90 * 24 * 60 * 60 * 1000);
    return {
        productId: DEFAULT_PRODUCT_ID,
        pId: DEFAULT_PRODUCT_ID,
        tenantId: params.tenantId,
        storeId: params.storeId,
        tId: params.tenantId,
        sId: params.storeId,
        status: 'active',
        cycleStartDate: now,
        subscriptionStartDate: now,
        cycleEndDate: future,
        subscriptionEndDate: future,
        totalPaymentsMadeCount: 1,
        billingHistory: ['payment_captured'],
        billingMode: params.manual ? 'manual' : 'provider',
        manualPaymentConfirmed: params.manual === true,
        topUpCredits: params.topUpCredits,
        monthlyCredits: 100,
        monthlyCreditsAllowance: 100,
        statuses: [],
    };
};

const seedReferral = async (params: {
    referredStoreId: number;
    referredTenantId: number;
    referrerStoreId: number;
    referrerTenantId: number;
}) => {
    const now = admin.firestore.Timestamp.now();
    const referralId = getOwnerReferralDocumentId(params.referredTenantId, params.referredStoreId);
    await firestoreAdmin.collection(DB_COLLECTIONS.OWNER_REFERRALS).doc(referralId).set({
        programVersion: 2,
        status: OWNER_REFERRAL_STATUS.ATTRIBUTED,
        referrerTenantId: params.referrerTenantId,
        referrerStoreId: params.referrerStoreId,
        referrerBusinessNameSnapshot: 'Referrer Business',
        referredTenantId: params.referredTenantId,
        referredStoreId: params.referredStoreId,
        referredBusinessNameSnapshot: `Referred ${params.referredStoreId}`,
        attributionSource: 'owner_invite',
        onboardingSource: 'EMULATOR_TEST',
        attributionTokenIdHash: `token_${referralId}`,
        attributedAt: now,
        createdAt: now,
        updatedAt: now,
    });
    return referralId;
};

const readCredits = async (subscriptionId: string): Promise<number> => {
    const snapshot = await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get();
    return Number(snapshot.data()?.topUpCredits || 0);
};

const verifyAtomicSettlementAndReplay = async (): Promise<void> => {
    const referrerSubscriptionId = 'owner_referral_test_referrer';
    const referredSubscriptionId = 'owner_referral_test_referred';
    const referrerScope = { tenantId: 8101, storeId: 8201 };
    const referredScope = { tenantId: 8102, storeId: 8202 };

    await Promise.all([
        firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(referrerSubscriptionId).set(
            makePaidSubscription({ ...referrerScope, topUpCredits: 7 }),
        ),
        firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(referredSubscriptionId).set(
            makePaidSubscription({ ...referredScope, topUpCredits: 3 }),
        ),
    ]);
    const referralId = await seedReferral({
        referredStoreId: referredScope.storeId,
        referredTenantId: referredScope.tenantId,
        referrerStoreId: referrerScope.storeId,
        referrerTenantId: referrerScope.tenantId,
    });

    const results = await Promise.all(Array.from({ length: 8 }, (_, index) => (
        recordReferredOwnerReferralPaymentAndSettle({
            referredScope,
            evidence: {
                paidAt: new Date(),
                paymentEvidenceId: `captured_payment_${index}`,
                source: 'emulator:concurrent-callback',
                subscriptionId: referredSubscriptionId,
            },
        })
    )));
    assert(results.filter((result) => result === 'reward_issued').length === 1, 'Concurrent callbacks must issue exactly once');
    assert(await readCredits(referrerSubscriptionId) === 7 + OWNER_REFERRAL_REFERRER_CREDITS, 'Referrer credits must increase exactly once');
    assert(await readCredits(referredSubscriptionId) === 3 + OWNER_REFERRAL_REFERRED_CREDITS, 'Referred credits must increase exactly once');

    const rewardIssueId = getOwnerReferralRewardIssueId(referralId);
    const referrerLedgerId = getOwnerReferralRewardTransactionId(rewardIssueId, 'referrer');
    const referredLedgerId = getOwnerReferralRewardTransactionId(rewardIssueId, 'referred');
    const [referral, referrerLedger, referredLedger] = await Promise.all([
        firestoreAdmin.collection(DB_COLLECTIONS.OWNER_REFERRALS).doc(referralId).get(),
        firestoreAdmin.collection(DB_COLLECTIONS.PAYMENT_TRANSACTIONS).doc(referrerLedgerId).get(),
        firestoreAdmin.collection(DB_COLLECTIONS.PAYMENT_TRANSACTIONS).doc(referredLedgerId).get(),
    ]);
    assert(referral.data()?.status === OWNER_REFERRAL_STATUS.REWARD_ISSUED, 'Referral must be marked issued in the same settlement');
    assert(referral.data()?.referrerTopUpBefore === 7 && referral.data()?.referrerTopUpAfter === 107, 'Referral must record referrer balance movement');
    assert(referral.data()?.referredTopUpBefore === 3 && referral.data()?.referredTopUpAfter === 53, 'Referral must record referred balance movement');
    assert(referrerLedger.data()?.event === OWNER_REFERRAL_LEDGER_EVENT, 'Referrer reward ledger row is missing');
    assert(referrerLedger.data()?.credits === 100 && referrerLedger.data()?.topUpCreditsBefore === 7 && referrerLedger.data()?.topUpCreditsAfter === 107, 'Referrer ledger amount or balance movement is wrong');
    assert(referredLedger.data()?.event === OWNER_REFERRAL_LEDGER_EVENT, 'Referred reward ledger row is missing');
    assert(referredLedger.data()?.credits === 50 && referredLedger.data()?.topUpCreditsBefore === 3 && referredLedger.data()?.topUpCreditsAfter === 53, 'Referred ledger amount or balance movement is wrong');

    const replay = await recordReferredOwnerReferralPaymentAndSettle({
        referredScope,
        evidence: {
            paidAt: new Date(),
            paymentEvidenceId: 'captured_payment_replay',
            source: 'emulator:replay',
            subscriptionId: referredSubscriptionId,
        },
    });
    assert(replay === 'already_issued', 'A replay must return already_issued');
    assert(await readCredits(referrerSubscriptionId) === 107, 'Replay must not add referrer credits');
    assert(await readCredits(referredSubscriptionId) === 53, 'Replay must not add referred credits');
};

const verifyPendingRepairAndNoCap = async (): Promise<void> => {
    const referrerScope = { tenantId: 8301, storeId: 8401 };
    const referrerSubscriptionId = 'owner_referral_test_repair_referrer';
    await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(referrerSubscriptionId).set({
        ...makePaidSubscription({ ...referrerScope, topUpCredits: 11 }),
        status: 'pending',
        cycleEndDate: null,
        totalPaymentsMadeCount: 0,
        billingHistory: [],
    });

    const referredScopes = Array.from({ length: 4 }, (_, index) => ({
        tenantId: 8501 + index,
        storeId: 8601 + index,
    }));
    for (let index = 0; index < referredScopes.length; index += 1) {
        const referredScope = referredScopes[index];
        const subscriptionId = `owner_referral_test_uncapped_referred_${index}`;
        await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set(
            makePaidSubscription({ ...referredScope, manual: index % 2 === 1, topUpCredits: 0 }),
        );
        await seedReferral({
            referredStoreId: referredScope.storeId,
            referredTenantId: referredScope.tenantId,
            referrerStoreId: referrerScope.storeId,
            referrerTenantId: referrerScope.tenantId,
        });
        const result = await recordReferredOwnerReferralPaymentAndSettle({
            referredScope,
            evidence: {
                paidAt: new Date(),
                paymentEvidenceId: `pending_payment_${index}`,
                source: 'emulator:pending',
                subscriptionId,
            },
        });
        assert(result === 'payment_pending', 'Referral must wait while one wallet is unpaid');
    }

    await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(referrerSubscriptionId).set(
        makePaidSubscription({ ...referrerScope, topUpCredits: 11 }),
        { merge: true },
    );
    const repair = await settlePendingOwnerReferralsForPaidStore(referrerScope);
    assert(repair.issued === 4, 'All four paid referrals must issue without a rolling cap');
    assert(await readCredits(referrerSubscriptionId) === 11 + (4 * OWNER_REFERRAL_REFERRER_CREDITS), 'Uncapped referrer total is wrong');
    for (let index = 0; index < referredScopes.length; index += 1) {
        assert(await readCredits(`owner_referral_test_uncapped_referred_${index}`) === 50, `Referred wallet ${index} was not credited`);
    }
};

const verifyPriorPaymentCannotBind = async (): Promise<void> => {
    const referredScope = { tenantId: 8701, storeId: 8801 };
    const referrerScope = { tenantId: 8702, storeId: 8802 };
    await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc('owner_referral_test_prior_paid').set(
        makePaidSubscription({ ...referredScope, topUpCredits: 0 }),
    );

    const result = await setOwnerReferralAttributionBeforeSubscription({
        referredBusinessName: 'Already Paid Business',
        referredScope,
        resolvedToken: {
            payload: {
                version: 2,
                referrerTenantId: referrerScope.tenantId,
                referrerStoreId: referrerScope.storeId,
                issuedAt: Math.floor(Date.now() / 1000),
                expiresAt: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
                tokenId: 'prior_payment_test_token',
            },
            referrerBusinessName: 'Referrer Business',
        },
        onboardingSource: 'EMULATOR_TEST',
    });

    assert(result.status === 'prior_paid', 'A previously paid business must not bind retroactively');
    const referral = await firestoreAdmin
        .collection(DB_COLLECTIONS.OWNER_REFERRALS)
        .doc(getOwnerReferralDocumentId(referredScope.tenantId, referredScope.storeId))
        .get();
    assert(!referral.exists, 'Prior-payment rejection must not create a referral record');
};

const verifyRules = async (): Promise<void> => {
    const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
    const testEnvironment = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules },
    });
    try {
        const owner = testEnvironment.authenticatedContext('owner-referral-test-owner', {
            platformRole: 'OWNER',
            tenantId: '8101',
            storeId: '8201',
            storeIds: ['8201'],
            role: 'OWNER',
        });
        const otherOwner = testEnvironment.authenticatedContext('owner-referral-test-other', {
            platformRole: 'OWNER',
            tenantId: '9991',
            storeId: '9992',
            storeIds: ['9992'],
            role: 'OWNER',
        });
        const referralId = getOwnerReferralDocumentId(8102, 8202);
        const rewardIssueId = getOwnerReferralRewardIssueId(referralId);
        const ledgerId = getOwnerReferralRewardTransactionId(rewardIssueId, 'referrer');
        await testEnvironment.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), DB_COLLECTIONS.PAYMENT_TRANSACTIONS, ledgerId), {
                event: OWNER_REFERRAL_LEDGER_EVENT,
                tenantId: 8101,
                storeId: 8201,
                transactionType: 'reward_credit',
                credits: 100,
            });
        });
        const referralRef = doc(owner.firestore(), DB_COLLECTIONS.OWNER_REFERRALS, referralId);
        await assertFails(getDoc(referralRef));
        await assertFails(setDoc(referralRef, { status: 'reward_issued' }));

        await assertSucceeds(getDoc(doc(owner.firestore(), DB_COLLECTIONS.PAYMENT_TRANSACTIONS, ledgerId)));
        await assertFails(getDoc(doc(otherOwner.firestore(), DB_COLLECTIONS.PAYMENT_TRANSACTIONS, ledgerId)));
        await assertFails(setDoc(doc(owner.firestore(), DB_COLLECTIONS.PAYMENT_TRANSACTIONS, 'forged'), {
            event: OWNER_REFERRAL_LEDGER_EVENT,
            tenantId: 8101,
            storeId: 8201,
        }));
    } finally {
        await testEnvironment.cleanup();
    }
};

const run = async (): Promise<void> => {
    assert(Boolean(process.env.FIRESTORE_EMULATOR_HOST), 'FIRESTORE_EMULATOR_HOST is required');
    (FEATURE_FLAGS as any).ENABLE_OWNER_REFERRAL_REWARD_PROCESSING = true;
    await verifyAtomicSettlementAndReplay();
    await verifyPendingRepairAndNoCap();
    await verifyPriorPaymentCannotBind();
    await verifyRules();
    console.log('Owner referral emulator verification passed.');
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
