/**
 * STORE TRUTH CONFIDENCE SCORE — Nightly Computation (Infrastructure Compounding 10.3)
 * ═══════════════════════════════════════════════════════════════
 *
 * Computes a composite 0-100 reliability score per store, stored in a single
 * platformSummary document. Used internally to detect stale/weak stores.
 *
 * Score formula (weighted average):
 *   freshnessScore     × 0.30  — How recent is the data?
 *   completenessScore  × 0.25  — How complete is the schema?
 *   stabilityScore     × 0.20  — How stable (not volatile) is the data?
 *   extractionScore    × 0.15  — How confident was the extraction?
 *   engagementScore    × 0.10  — How engaged is the owner?
 *
 * Called from: decisionBlocksScoring.ts (nightly scheduler)
 * Feature flag: ENABLE_STORE_TRUTH_CONFIDENCE
 *
 * Firebase cost: CONSTANT regardless of store count
 * - 1 read  (platformSummary/extractionLearning)
 * - 1 write (platformSummary/storeTruthConfidence)
 * - 1 write (telemetry)
 * All per-store data is reused from storesSummary (already loaded by scheduler).
 *
 * @see __docs__/infrastructure-compounding/store-truth-confidence_spec.md
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import {
    normalizeStoreSummaryDate,
    parsePlatformStoreSummary,
    type PlatformStoreSummaryData,
} from '../sharedData/storeSummaryBoundary';
import { analyticsLogger, getAnalyticsErrorContext } from './analyticsDiagnostics';

// ================================================================
// TYPES
// ================================================================

export interface StoreTruthConfidenceResult {
    processed: number;
    averageScore: number;
    staleCount: number;
    readsCount: number;
    writesCount: number;
}

interface StoreScoreEntry {
    tId: string;
    score: number;
    freshnessScore: number;
    completenessScore: number;
    stabilityScore: number;
    extractionScore: number;
    engagementScore: number;
    daysSincePublish: number | null;
    staleFlag: boolean;
}

// ================================================================
// COMPONENT SCORE FUNCTIONS (0-100 each)
// ================================================================

function computeFreshnessScore(lastPublishedAt: Date | null): number {
    if (!lastPublishedAt) return 0;

    const daysSincePublish = Math.floor(
        (Date.now() - lastPublishedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSincePublish <= 7) return 100;
    if (daysSincePublish <= 30) return 80;
    if (daysSincePublish <= 60) return 60;
    if (daysSincePublish <= 90) return 40;
    if (daysSincePublish <= 180) return 20;
    return 10;
}

function computeCompletenessScore(storeInfo: PlatformStoreSummaryData): number {
    // Use storesSummary data which has basic counts
    // Fields available: tId, businessType, businessCategory, active, name, projectCount, lastPublishedAt
    let score = 50; // Base score — store exists

    if (typeof storeInfo.projectCount === 'number' && Number.isFinite(storeInfo.projectCount) && storeInfo.projectCount > 0) score += 20;
    if (typeof storeInfo.name === 'string' && storeInfo.name.trim()) score += 10;
    if (typeof storeInfo.businessCategory === 'string' && storeInfo.businessCategory.trim()) score += 10;
    if (typeof storeInfo.businessType === 'string' && storeInfo.businessType.trim()) score += 10;

    return Math.min(100, score);
}

function computeStabilityScore(): number {
    // Without per-item drift data in storesSummary, use a conservative default.
    // The nightly menu drift task runs separately; we just check if it flagged issues.
    // For now, assume stable unless we have data.
    return 70; // Conservative default — will be refined when drift data is integrated
}

function computeExtractionScore(globalCorrectionRate: number | null): number {
    // Based on global correction rate from extractionLearning
    let score = 80; // Default — assume decent extraction

    if (globalCorrectionRate === null) return score;

    if (globalCorrectionRate > 0.20) score -= 30;
    else if (globalCorrectionRate > 0.10) score -= 15;
    else if (globalCorrectionRate > 0.05) score -= 5;

    return Math.max(0, Math.min(100, score));
}

function computeEngagementScore(lastPublishedAt: Date | null): number {
    // Best proxy for engagement: when was the menu last modified?
    // lastPublishedAt is enriched by the nightly scheduler from project modifiedOn
    if (lastPublishedAt) {
        const daysSinceActive = Math.floor(
            (Date.now() - lastPublishedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceActive <= 7) return 90;
        if (daysSinceActive <= 30) return 70;
        if (daysSinceActive <= 90) return 50;
        return 30;
    }
    return 50; // Default — no data
}

// ================================================================
// MAIN FUNCTION
// ================================================================

const WEIGHTS = {
    freshness: 0.30,
    completeness: 0.25,
    stability: 0.20,
    extraction: 0.15,
    engagement: 0.10,
};

const STALE_THRESHOLD_DAYS = 90;

/**
 * Compute store truth confidence scores for all stores
 */
export async function computeStoreTruthConfidenceForAllStores(): Promise<StoreTruthConfidenceResult> {
    const db = admin.firestore();
    const result: StoreTruthConfidenceResult = {
        processed: 0,
        averageScore: 0,
        staleCount: 0,
        readsCount: 0,
        writesCount: 0,
    };

    analyticsLogger.info('[StoreTruthConfidence] Starting nightly computation');

    try {
        // Read storesSummary (shared with scheduler — already loaded)
        const storesSummaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get();
        result.readsCount++;

        const storesSummary = parsePlatformStoreSummary(storesSummaryDoc.exists ? storesSummaryDoc.data() : undefined);
        const storeIds = Object.keys(storesSummary);

        // Read extraction learning data (1 read)
        const learningDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('extractionLearning').get();
        result.readsCount++;
        const learningData = learningDoc.exists ? learningDoc.data() : undefined;
        const storedCorrectionRate = learningData?.correctionRate;
        const globalCorrectionRate = learningData?.correctionRateStatus === 'measured'
            && typeof storedCorrectionRate === 'number'
            && Number.isFinite(storedCorrectionRate)
            && storedCorrectionRate >= 0
            && storedCorrectionRate <= 1
            ? storedCorrectionRate
            : null;

        const storeScores: Record<string, StoreScoreEntry> = {};
        let totalScore = 0;

        for (const sId of storeIds) {
            const storeInfo = storesSummary[sId];
            if (storeInfo.active === false) continue;

            const tId = storeInfo.tId;

            // Compute component scores
            // lastPublishedAt may be a Firestore Timestamp or a Date string/number
            const lastPublishedAt = normalizeStoreSummaryDate(storeInfo.lastPublishedAt);

            const freshness = computeFreshnessScore(lastPublishedAt);
            const completeness = computeCompletenessScore(storeInfo);
            const stability = computeStabilityScore();
            const extraction = computeExtractionScore(globalCorrectionRate);
            const engagement = computeEngagementScore(lastPublishedAt);

            // Weighted composite
            const score = Math.round(
                freshness * WEIGHTS.freshness +
                completeness * WEIGHTS.completeness +
                stability * WEIGHTS.stability +
                extraction * WEIGHTS.extraction +
                engagement * WEIGHTS.engagement
            );

            const daysSincePublish = lastPublishedAt
                ? Math.floor((Date.now() - lastPublishedAt.getTime()) / (1000 * 60 * 60 * 24))
                : null;

            const staleFlag = daysSincePublish !== null && daysSincePublish > STALE_THRESHOLD_DAYS;
            if (staleFlag) result.staleCount++;

            storeScores[sId] = {
                tId,
                score,
                freshnessScore: freshness,
                completenessScore: completeness,
                stabilityScore: stability,
                extractionScore: extraction,
                engagementScore: engagement,
                daysSincePublish,
                staleFlag,
            };

            totalScore += score;
            result.processed++;
        }

        result.averageScore = result.processed > 0
            ? Math.round((totalScore / result.processed) * 10) / 10
            : 0;

        // Write single aggregate document (1 write)
        await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storeTruthConfidence').set({
            computedAt: FieldValue.serverTimestamp(),
            totalStores: result.processed,
            averageScore: result.averageScore,
            staleCount: result.staleCount,
            stores: storeScores,
        });
        result.writesCount++;

        analyticsLogger.info('[StoreTruthConfidence] Computation complete', {
            storesProcessed: result.processed,
            averageScore: result.averageScore,
            staleCount: result.staleCount,
            staleThresholdDays: STALE_THRESHOLD_DAYS,
        });

        return result;
    } catch (error: any) {
        analyticsLogger.error('[StoreTruthConfidence] Fatal error', {
            error: getAnalyticsErrorContext(error),
        });
        throw error;
    }
}
