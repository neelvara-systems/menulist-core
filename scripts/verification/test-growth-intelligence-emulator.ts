#!/usr/bin/env ts-node

import { DB_COLLECTIONS } from '@constant/database';
import { GROWTH_ACQUISITION_CAMPAIGN, GROWTH_ACQUISITION_MEDIUM, GROWTH_ACQUISITION_SOURCE } from '@lib/growth/acquisitionAttribution';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { recordFounderGrowthEvent } from '@lib/ops/founderGrowthReadModel';
import {
    recordFounderRevenueMovement,
    recordFounderSubscriptionMrrChange,
    recordFounderSubscriptionNewMrr,
} from '@lib/ops/founderRevenueReadModel';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';
import { rebuildFounderMonitorSnapshotLogic } from '../../functions/src/schedulers/founderMonitorSnapshot';

const assert = (condition: unknown, message: string): void => {
    if (!condition) throw new Error(message);
};

const getIndiaDayKey = (date: Date): string => (
    new Date(date.getTime() + (330 * 60 * 1000)).toISOString().slice(0, 10)
);

const run = async (): Promise<void> => {
    assert(Boolean(process.env.FIRESTORE_EMULATOR_HOST), 'FIRESTORE_EMULATOR_HOST is required');

    const suffix = Date.now().toString(36);
    const draftId = `growth-intelligence-${suffix}`;
    const partnerDraftId = `growth-intelligence-partner-${suffix}`;
    const tooExpensiveMovementId = `growth-intelligence-churn-price-${suffix}`;
    const switchedProviderMovementId = `growth-intelligence-churn-switch-${suffix}`;
    const lifecycleSubscriptionId = `growth-intelligence-subscription-${suffix}`;
    const malformedMovementId = `growth-intelligence-malformed-${suffix}`;
    const occurredAt = new Date();
    const growthSummaryRef = firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('founderMonitorGrowth');
    const revenueSummaryRef = firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('founderMonitorRevenue');
    const dailySummaryRef = firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`founderMonitorRevenueDaily_${getIndiaDayKey(occurredAt)}`);

    const attribution = {
        source: GROWTH_ACQUISITION_SOURCE.MENULIST_PUBLIC_SURFACE,
        medium: GROWTH_ACQUISITION_MEDIUM.POWERED_BY,
        campaign: GROWTH_ACQUISITION_CAMPAIGN.PRODUCT_LOOP,
    };
    const draftRef = firestoreAdmin.collection(DB_COLLECTIONS.PUBLIC_MENU_DRAFTS).doc(draftId);
    const partnerDraftRef = firestoreAdmin.collection(DB_COLLECTIONS.PUBLIC_MENU_DRAFTS).doc(partnerDraftId);
    await draftRef.set({ growthAcquisition: attribution });

    const draftResults = await Promise.all(Array.from({ length: 6 }, () => recordFounderGrowthEvent({
        attribution,
        draftId,
        occurredAt,
        stage: 'draft_created',
    })));
    assert(draftResults.filter((result) => result.recorded).length === 1, 'Draft event must record exactly once');

    const claimResults = await Promise.all(Array.from({ length: 6 }, () => recordFounderGrowthEvent({
        attribution,
        draftId,
        occurredAt,
        stage: 'business_claimed',
    })));
    assert(claimResults.filter((result) => result.recorded).length === 1, 'Claim event must record exactly once');

    const partnerAttribution = {
        source: GROWTH_ACQUISITION_SOURCE.PHYSICAL_PARTNER,
        medium: GROWTH_ACQUISITION_MEDIUM.PARTNER_HANDOFF,
        campaign: GROWTH_ACQUISITION_CAMPAIGN.BENGALURU_PILOT_2026,
    };
    await partnerDraftRef.set({ growthAcquisition: partnerAttribution });
    const partnerResults = await Promise.all(Array.from({ length: 3 }, () => recordFounderGrowthEvent({
        attribution: partnerAttribution,
        draftId: partnerDraftId,
        occurredAt,
        stage: 'draft_created',
    })));
    assert(partnerResults.filter((result) => result.recorded).length === 1, 'Partner draft event must record exactly once');

    const growthSummary = (await growthSummaryRef.get()).data() || {};
    assert(growthSummary.draftsCreated === 2, 'Growth summary draft count must preserve both sources');
    assert(growthSummary.businessesClaimed === 1, 'Growth summary claim count must equal one');
    assert(growthSummary.bySource?.menulist_public_surface?.draftsCreated === 1, 'Source draft count must be preserved');
    assert(growthSummary.bySource?.menulist_public_surface?.businessesClaimed === 1, 'Source claim count must be preserved');
    assert(growthSummary.bySource?.physical_partner?.draftsCreated === 1, 'Partner source draft count must be preserved');

    const churnResults = await Promise.all(Array.from({ length: 6 }, () => recordFounderRevenueMovement({
        amountPaise: 10000,
        cancellationReasonCode: 'too_expensive',
        id: tooExpensiveMovementId,
        kind: 'churn',
        occurredAt,
        productId: 'ML',
        source: 'emulator:growth-intelligence',
    })));
    assert(churnResults.filter((result) => result.recorded).length === 1, 'Churn movement must record exactly once');

    const switchedProviderResults = await Promise.all(Array.from({ length: 3 }, () => recordFounderRevenueMovement({
        amountPaise: 10000,
        cancellationReasonCode: 'switched_provider',
        id: switchedProviderMovementId,
        kind: 'churn',
        occurredAt,
        productId: 'ML',
        source: 'emulator:growth-intelligence',
    })));
    assert(switchedProviderResults.filter((result) => result.recorded).length === 1, 'Second churn reason must record exactly once');

    const originalRunTransaction = firestoreAdmin.runTransaction.bind(firestoreAdmin);
    (firestoreAdmin as any).runTransaction = async () => {
        throw new Error('simulated-founder-revenue-write-failure');
    };
    try {
        const optionalFailure = await recordFounderRevenueMovement({
            amountPaise: 100,
            id: `optional-failure-${suffix}`,
            kind: 'cash_collected',
            productId: 'ML',
            source: 'emulator:growth-intelligence:optional-failure',
        });
        assert(!optionalFailure.recorded, 'Optional projection failure must remain observable as not recorded');

        let requiredFailureRejected = false;
        try {
            await recordFounderRevenueMovement({
                amountPaise: 100,
                id: `required-failure-${suffix}`,
                kind: 'cash_collected',
                productId: 'ML',
                requireDurableWrite: true,
                source: 'emulator:growth-intelligence:required-failure',
            });
        } catch (error) {
            requiredFailureRejected = String(error).includes('simulated-founder-revenue-write-failure');
        }
        assert(requiredFailureRejected, 'Required projection failure must reject so the caller can retry');
    } finally {
        (firestoreAdmin as any).runTransaction = originalRunTransaction;
    }

    let invalidRequiredMovementRejected = false;
    try {
        await recordFounderRevenueMovement({
            amountPaise: 100,
            id: '/',
            kind: 'cash_collected',
            productId: 'ML',
            requireDurableWrite: true,
            source: 'emulator:growth-intelligence:invalid-required-id',
        });
    } catch (error) {
        invalidRequiredMovementRejected = String(error).includes('identity is invalid');
    }
    assert(invalidRequiredMovementRejected, 'Required projection must reject an invalid movement identity');

    const missingProductResult = await recordFounderRevenueMovement({
        amountPaise: 100,
        id: `missing-product-${suffix}`,
        kind: 'cash_collected',
        source: 'emulator:growth-intelligence:missing-product',
    });
    assert(!missingProductResult.recorded && missingProductResult.movementId === null, 'Missing product identity must not default into MenuList revenue');

    const lifecycleSubscription: Partial<FirestoreSubscriptionDoc> & { id: string } = {
        amount: 12000,
        currency: 'INR',
        id: lifecycleSubscriptionId,
        pId: 'ML',
        productId: 'ML',
        planName: 'Growth Intelligence Test',
        planType: 'MONTH',
        quantity: 1,
        sId: 202,
        storeId: 202,
        tId: 101,
        tenantId: 101,
    };
    const newMrrResults = await Promise.all(Array.from({ length: 3 }, () => recordFounderSubscriptionNewMrr({
        productId: 'ML',
        requireDurableWrite: true,
        source: 'emulator:growth-intelligence:new-mrr-replay',
        subscription: lifecycleSubscription,
    })));
    assert(newMrrResults.filter((result) => result.recorded).length === 1, 'Required new-MRR replay must record exactly once');

    const mrrChangeResults = await Promise.all(Array.from({ length: 3 }, () => recordFounderSubscriptionMrrChange({
        eventKey: `quantity-change-${suffix}`,
        previousSubscription: lifecycleSubscription,
        productId: 'ML',
        requireDurableWrite: true,
        source: 'emulator:growth-intelligence:mrr-change-replay',
        subscription: {
            ...lifecycleSubscription,
            quantity: 2,
        },
    })));
    assert(mrrChangeResults.filter((result) => result.recorded).length === 1, 'Required MRR-change replay must record exactly once');

    let conflictingSubscriptionScopeRejected = false;
    try {
        await recordFounderSubscriptionNewMrr({
            productId: 'ML',
            requireDurableWrite: true,
            source: 'emulator:growth-intelligence:conflicting-scope',
            subscription: {
                ...lifecycleSubscription,
                sId: 999,
            },
        });
    } catch (error) {
        conflictingSubscriptionScopeRejected = String(error).includes('scope is invalid');
    }
    assert(conflictingSubscriptionScopeRejected, 'Required lifecycle projection must reject conflicting subscription aliases');

    let malformedRequiredAmountRejected = false;
    try {
        await recordFounderRevenueMovement({
            amountPaise: '100' as any,
            id: `malformed-amount-${suffix}`,
            kind: 'cash_collected',
            productId: 'ML',
            requireDurableWrite: true,
            source: 'emulator:growth-intelligence:malformed-amount',
        });
    } catch (error) {
        malformedRequiredAmountRejected = String(error).includes('amount is invalid');
    }
    assert(malformedRequiredAmountRejected, 'Required movement must reject a coercible nonnumeric amount');

    let malformedRequiredTimeRejected = false;
    try {
        await recordFounderRevenueMovement({
            amountPaise: 100,
            id: `malformed-time-${suffix}`,
            kind: 'cash_collected',
            occurredAt: 'not-a-real-time',
            productId: 'ML',
            requireDurableWrite: true,
            source: 'emulator:growth-intelligence:malformed-time',
        });
    } catch (error) {
        malformedRequiredTimeRejected = String(error).includes('time is invalid');
    }
    assert(malformedRequiredTimeRejected, 'Required movement must reject an invalid event time');

    let malformedSubscriptionAmountRejected = false;
    try {
        await recordFounderSubscriptionNewMrr({
            productId: 'ML',
            requireDurableWrite: true,
            source: 'emulator:growth-intelligence:malformed-subscription-amount',
            subscription: {
                ...lifecycleSubscription,
                amount: '12000' as any,
            },
        });
    } catch (error) {
        malformedSubscriptionAmountRejected = String(error).includes('MRR amount is invalid');
    }
    assert(malformedSubscriptionAmountRejected, 'Required lifecycle movement must reject coercible subscription MRR');

    let malformedRequiredScopeRejected = false;
    try {
        await recordFounderRevenueMovement({
            amountPaise: 100,
            id: `malformed-scope-${suffix}`,
            kind: 'cash_collected',
            productId: 'ML',
            requireDurableWrite: true,
            source: 'emulator:growth-intelligence:malformed-scope',
            storeId: '202',
            tenantId: '101',
        });
    } catch (error) {
        malformedRequiredScopeRejected = String(error).includes('scope is invalid');
    }
    assert(malformedRequiredScopeRejected, 'Required movement must reject coercible workspace scope');

    let unscopedSubscriptionMovementRejected = false;
    try {
        await recordFounderRevenueMovement({
            amountPaise: 100,
            id: `unscoped-subscription-${suffix}`,
            kind: 'cash_collected',
            productId: 'ML',
            requireDurableWrite: true,
            source: 'emulator:growth-intelligence:unscoped-subscription',
            subscriptionId: lifecycleSubscriptionId,
        });
    } catch (error) {
        unscopedSubscriptionMovementRejected = String(error).includes('scope is invalid');
    }
    assert(unscopedSubscriptionMovementRejected, 'Required subscription movement must carry exact workspace scope');

    await firestoreAdmin.collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS).doc(malformedMovementId).set({
        amountPaise: '99900',
        businessDayKey: getIndiaDayKey(occurredAt),
        description: 'Malformed persisted movement.',
        kind: 'cash_collected',
        occurredAt,
        pId: 'ML',
        productId: 'ML',
        sId: '202',
        storeId: '202',
        tId: '101',
        tenantId: '101',
    });
    await rebuildFounderMonitorSnapshotLogic();
    const reconciledDaily = (await dailySummaryRef.get()).data() || {};
    const reconciledSnapshot = (
        await firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('founderMonitorSnapshot').get()
    ).data() || {};
    assert(reconciledDaily.cashCollectedPaise === 0, 'Scheduler must exclude coercible persisted movement amounts');
    assert(
        reconciledSnapshot.dataGaps?.some((gap: { id?: unknown }) => gap.id === 'invalid-daily-revenue-movements'),
        'Scheduler must expose excluded persisted movements as an operational data gap',
    );

    const revenueSummary = (await revenueSummaryRef.get()).data() || {};
    assert(revenueSummary.churnReasons?.too_expensive === 1, 'Price churn reason must be preserved');
    assert(revenueSummary.churnReasons?.switched_provider === 1, 'Second churn reason must merge without replacing the first');

    await Promise.all([
        draftRef.delete(),
        partnerDraftRef.delete(),
        firestoreAdmin.collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS).doc(tooExpensiveMovementId).delete(),
        firestoreAdmin.collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS).doc(switchedProviderMovementId).delete(),
        firestoreAdmin.collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS).doc(malformedMovementId).delete(),
        firestoreAdmin.collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS).doc(`new_mrr:${lifecycleSubscriptionId}`).delete(),
        firestoreAdmin.collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS).doc(`expansion_mrr:${lifecycleSubscriptionId}:quantity-change-${suffix}`).delete(),
        growthSummaryRef.delete(),
        revenueSummaryRef.delete(),
        dailySummaryRef.delete(),
        firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('founderMonitorSnapshot').delete(),
    ]);

    console.log('Growth intelligence emulator verification passed.');
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
