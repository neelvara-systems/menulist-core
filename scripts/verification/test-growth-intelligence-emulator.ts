#!/usr/bin/env ts-node

import { DB_COLLECTIONS } from '@constant/database';
import { GROWTH_ACQUISITION_CAMPAIGN, GROWTH_ACQUISITION_MEDIUM, GROWTH_ACQUISITION_SOURCE } from '@lib/growth/acquisitionAttribution';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { recordFounderGrowthEvent } from '@lib/ops/founderGrowthReadModel';
import { recordFounderRevenueMovement } from '@lib/ops/founderRevenueReadModel';

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
        source: 'emulator:growth-intelligence',
    })));
    assert(churnResults.filter((result) => result.recorded).length === 1, 'Churn movement must record exactly once');

    const switchedProviderResults = await Promise.all(Array.from({ length: 3 }, () => recordFounderRevenueMovement({
        amountPaise: 10000,
        cancellationReasonCode: 'switched_provider',
        id: switchedProviderMovementId,
        kind: 'churn',
        occurredAt,
        source: 'emulator:growth-intelligence',
    })));
    assert(switchedProviderResults.filter((result) => result.recorded).length === 1, 'Second churn reason must record exactly once');

    const revenueSummary = (await revenueSummaryRef.get()).data() || {};
    assert(revenueSummary.churnReasons?.too_expensive === 1, 'Price churn reason must be preserved');
    assert(revenueSummary.churnReasons?.switched_provider === 1, 'Second churn reason must merge without replacing the first');

    await Promise.all([
        draftRef.delete(),
        partnerDraftRef.delete(),
        firestoreAdmin.collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS).doc(tooExpensiveMovementId).delete(),
        firestoreAdmin.collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS).doc(switchedProviderMovementId).delete(),
        growthSummaryRef.delete(),
        revenueSummaryRef.delete(),
        dailySummaryRef.delete(),
    ]);

    console.log('Growth intelligence emulator verification passed.');
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
