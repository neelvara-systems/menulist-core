/**
 * EXTRACTION LEARNING LOOP — Nightly Aggregation (Infrastructure Compounding 10.2)
 * ═══════════════════════════════════════════════════════════════
 *
 * Aggregates EXTRACTION_CORRECTION events from the last 30 days across all stores.
 * Produces a single summary document that informs future extraction prompts.
 *
 * Called from: decisionBlocksScoring.ts (nightly scheduler)
 * Feature flag: ENABLE_EXTRACTION_LEARNING
 *
 * Firebase cost: ~$0.002/month at 100 stores
 * - 1 read (storesSummary — shared with scheduler)
 * - N reads (1 per store with corrections)
 * - 1 write (platformSummary/extractionLearning)
 * - 1 write (telemetry)
 *
 * @see __docs__/infrastructure-compounding/extraction-learning-loop_spec.md
 */

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { analyticsLogger, getAnalyticsErrorContext, getAnalyticsIdContext } from './analyticsDiagnostics';

// ================================================================
// TYPES
// ================================================================

interface ExtractionLearningResult {
    totalCorrections: number;
    storesProcessed: number;
    storesWithCorrections: number;
    readsCount: number;
    writesCount: number;
}

interface FieldStats {
    corrections: number;
    total: number;
    rate: number;
}

interface ConfidenceCalibration {
    total: number;
    corrected: number;
    accuracy: number;
}

// ================================================================
// CONSTANTS
// ================================================================

const ROLLING_WINDOW_DAYS = 30;

// ================================================================
// MAIN FUNCTION
// ================================================================

/**
 * Process extraction learning for all stores
 * Aggregates EXTRACTION_CORRECTION events into platform-level patterns
 */
export async function processExtractionLearningForAllStores(): Promise<ExtractionLearningResult> {
    const db = admin.firestore();
    const result: ExtractionLearningResult = {
        totalCorrections: 0,
        storesProcessed: 0,
        storesWithCorrections: 0,
        readsCount: 0,
        writesCount: 0,
    };

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - ROLLING_WINDOW_DAYS);
    const windowStartTimestamp = Timestamp.fromDate(windowStart);

    analyticsLogger.info('[ExtractionLearning] Starting nightly aggregation');

    // Aggregation accumulators
    const byField: Record<string, { corrections: number }> = {
        name: { corrections: 0 },
        price: { corrections: 0 },
        description: { corrections: 0 },
        categoryId: { corrections: 0 },
        tags: { corrections: 0 },
    };
    // Note: `total` per confidence level is not tracked yet (requires counting all
    // extracted items at each level, not just corrections). For v1, `corrected` count
    // is sufficient — `accuracy` defaults to 1.0 when total is unknown.
    const confidenceCalibration: Record<string, { total: number; corrected: number }> = {
        high: { total: 0, corrected: 0 },
        medium: { total: 0, corrected: 0 },
        low: { total: 0, corrected: 0 },
    };

    try {
        // Read storesSummary (shared with scheduler — conceptually 0 extra reads)
        const storesSummaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get();
        result.readsCount++;

        const storesSummary = storesSummaryDoc.exists ? storesSummaryDoc.data()?.stores || {} : {};
        const storeIds = Object.keys(storesSummary);

        for (const sId of storeIds) {
            const storeInfo = storesSummary[sId];
            const tId = storeInfo.tId != null ? String(storeInfo.tId) : '';

            if (storeInfo.active === false || !tId) continue;

            try {
                // Query EXTRACTION_CORRECTION events for this store
                const changeLogRef = db.collection(DB_COLLECTIONS.MENU_CHANGE_LOG)
                    .doc(tId)
                    .collection(sId);

                const correctionsSnapshot = await changeLogRef
                    .where('changeType', '==', 'EXTRACTION_CORRECTION')
                    .where('timestamp', '>=', windowStartTimestamp)
                    .get();

                result.readsCount++;
                result.storesProcessed++;

                if (correctionsSnapshot.empty) continue;

                result.storesWithCorrections++;

                for (const doc of correctionsSnapshot.docs) {
                    const data = doc.data();
                    result.totalCorrections++;

                    // Aggregate by field
                    const field = data.oldValue?.field || data.newValue?.field;
                    if (field && byField[field]) {
                        byField[field].corrections++;
                    }

                    // Aggregate confidence calibration
                    const confidence = data.oldValue?.confidence;
                    if (confidence && confidenceCalibration[confidence]) {
                        confidenceCalibration[confidence].corrected++;
                    }
                }
            } catch (storeError: any) {
                analyticsLogger.warn('[ExtractionLearning] Error processing store', {
                    storeId: getAnalyticsIdContext(sId),
                    error: getAnalyticsErrorContext(storeError),
                });
            }
        }

        // Compute rates
        const totalExtractedItems = result.totalCorrections > 0
            ? Math.max(result.totalCorrections * 5, 100) // Rough estimate: corrections are ~20% of extractions
            : 0;

        const byFieldWithRates: Record<string, FieldStats> = {};
        for (const [field, stats] of Object.entries(byField)) {
            byFieldWithRates[field] = {
                corrections: stats.corrections,
                total: totalExtractedItems,
                rate: totalExtractedItems > 0 ? stats.corrections / totalExtractedItems : 0,
            };
        }

        const calibrationWithAccuracy: Record<string, ConfidenceCalibration> = {};
        for (const [level, stats] of Object.entries(confidenceCalibration)) {
            calibrationWithAccuracy[level] = {
                total: stats.total,
                corrected: stats.corrected,
                accuracy: stats.total > 0 ? 1 - (stats.corrected / stats.total) : 1,
            };
        }

        // Write aggregate to platformSummary/extractionLearning (1 write)
        const correctionRate = totalExtractedItems > 0 ? result.totalCorrections / totalExtractedItems : 0;

        await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('extractionLearning').set({
            computedAt: FieldValue.serverTimestamp(),
            windowDays: ROLLING_WINDOW_DAYS,
            totalCorrections: result.totalCorrections,
            correctionRate: Math.round(correctionRate * 1000) / 1000,
            byField: byFieldWithRates,
            confidenceCalibration: calibrationWithAccuracy,
            storesWithCorrections: result.storesWithCorrections,
        }, { merge: true });
        result.writesCount++;

        analyticsLogger.info('[ExtractionLearning] Aggregation complete', {
            storesProcessed: result.storesProcessed,
            storesWithCorrections: result.storesWithCorrections,
            totalCorrections: result.totalCorrections,
            correctionRatePercent: Number((correctionRate * 100).toFixed(1)),
        });

        return result;
    } catch (error: any) {
        analyticsLogger.error('[ExtractionLearning] Fatal error', {
            error: getAnalyticsErrorContext(error),
        });
        throw error;
    }
}
