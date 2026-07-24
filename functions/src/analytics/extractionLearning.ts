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
 * Firebase cost: volume-dependent; see the feature Firebase cost contract
 * - 1 read (storesSummary — shared with scheduler)
 * - paginated reads of each active store's 30-day MOL window
 * - 1 write (platformSummary/extractionLearning)
 * - 1 write (telemetry)
 *
 * @see __docs__/infrastructure-compounding/extraction-learning-loop_spec.md
 */

import { firestoreAdmin } from '../firebaseAdmin';
import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { parsePlatformStoreSummary } from '../sharedData/storeSummaryBoundary';
import { analyticsLogger, getAnalyticsErrorContext, getAnalyticsIdContext } from './analyticsDiagnostics';
import { readExtractionCorrectionContribution } from './extractionLearningBoundary';

// ================================================================
// TYPES
// ================================================================

interface ExtractionLearningResult {
    totalCorrections: number;
    storesProcessed: number;
    storesWithCorrections: number;
    storesFailed: number;
    readsCount: number;
    writesCount: number;
}

interface FieldStats {
    corrections: number;
    total: null;
    rate: null;
}

interface ConfidenceCalibration {
    total: null;
    corrected: number;
    accuracy: null;
}

// ================================================================
// CONSTANTS
// ================================================================

const ROLLING_WINDOW_DAYS = 30;
const CHANGE_LOG_PAGE_SIZE = 500;
const MAX_CHANGE_LOG_DOCUMENTS_PER_STORE = 50_000;

// ================================================================
// MAIN FUNCTION
// ================================================================

/**
 * Process extraction learning for all stores
 * Aggregates EXTRACTION_CORRECTION events into platform-level patterns
 */
export async function processExtractionLearningForAllStores(): Promise<ExtractionLearningResult> {
    const db = firestoreAdmin;
    const result: ExtractionLearningResult = {
        totalCorrections: 0,
        storesProcessed: 0,
        storesWithCorrections: 0,
        storesFailed: 0,
        readsCount: 0,
        writesCount: 0,
    };

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - ROLLING_WINDOW_DAYS);
    const windowStartTimestamp = Timestamp.fromDate(windowStart);
    const windowEndTimestamp = Timestamp.now();

    analyticsLogger.info('[ExtractionLearning] Starting nightly aggregation');

    // Aggregation accumulators
    const byField: Record<string, { corrections: number }> = {
        name: { corrections: 0 },
        price: { corrections: 0 },
        description: { corrections: 0 },
        categoryId: { corrections: 0 },
        tags: { corrections: 0 },
    };
    // The authoritative denominator (all extracted fields by confidence) is not
    // persisted today. Keep correction counts, but never manufacture accuracy.
    const confidenceCalibration: Record<string, { corrected: number }> = {
        high: { corrected: 0 },
        medium: { corrected: 0 },
        low: { corrected: 0 },
    };

    try {
        // Read storesSummary (shared with scheduler — conceptually 0 extra reads)
        const storesSummaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get();
        result.readsCount++;

        const storesSummary = parsePlatformStoreSummary(storesSummaryDoc.exists ? storesSummaryDoc.data() : undefined);
        const storeIds = Object.keys(storesSummary);

        for (const sId of storeIds) {
            const storeInfo = storesSummary[sId];
            const tId = storeInfo.tId;

            if (storeInfo.active === false || !tId) continue;

            try {
                // Store IDs are the current nested collection IDs, so page on
                // the automatic timestamp index and filter event type locally.
                const changeLogRef = db.collection(DB_COLLECTIONS.MENU_CHANGE_LOG)
                    .doc(tId)
                    .collection(sId);
                let storeCorrectionCount = 0;
                let documentsScanned = 0;
                const storeByField: Record<string, number> = {
                    name: 0,
                    price: 0,
                    description: 0,
                    categoryId: 0,
                    tags: 0,
                };
                const storeByConfidence: Record<string, number> = {
                    high: 0,
                    medium: 0,
                    low: 0,
                };
                let lastDocument: FirebaseFirestore.QueryDocumentSnapshot | undefined;

                while (true) {
                    if (documentsScanned >= MAX_CHANGE_LOG_DOCUMENTS_PER_STORE) {
                        throw new RangeError('Extraction learning store scan limit exceeded');
                    }
                    let correctionQuery = changeLogRef
                        .where('timestamp', '>=', windowStartTimestamp)
                        .where('timestamp', '<=', windowEndTimestamp)
                        .orderBy('timestamp', 'asc')
                        .orderBy(FieldPath.documentId(), 'asc')
                        .limit(CHANGE_LOG_PAGE_SIZE);
                    if (lastDocument) correctionQuery = correctionQuery.startAfter(lastDocument);

                    const correctionsSnapshot = await correctionQuery.get();
                    result.readsCount += Math.max(1, correctionsSnapshot.size);
                    documentsScanned += correctionsSnapshot.size;

                    for (const document of correctionsSnapshot.docs) {
                        const data = document.data();
                        const contribution = readExtractionCorrectionContribution(data);
                        if (contribution.total === 0) continue;

                        storeCorrectionCount += contribution.total;
                        for (const [field, count] of Object.entries(contribution.byField)) {
                            storeByField[field] += count;
                        }
                        for (const [confidence, count] of Object.entries(contribution.byConfidence)) {
                            storeByConfidence[confidence] += count;
                        }
                    }

                    if (correctionsSnapshot.size < CHANGE_LOG_PAGE_SIZE) break;
                    lastDocument = correctionsSnapshot.docs[correctionsSnapshot.docs.length - 1];
                }

                result.storesProcessed++;
                result.totalCorrections += storeCorrectionCount;
                for (const [field, count] of Object.entries(storeByField)) {
                    byField[field].corrections += count;
                }
                for (const [confidence, count] of Object.entries(storeByConfidence)) {
                    confidenceCalibration[confidence].corrected += count;
                }
                if (storeCorrectionCount > 0) result.storesWithCorrections++;
            } catch (storeError: unknown) {
                result.storesFailed++;
                analyticsLogger.warn('[ExtractionLearning] Error processing store', {
                    storeId: getAnalyticsIdContext(sId),
                    error: getAnalyticsErrorContext(storeError),
                });
            }
        }

        const byFieldWithRates: Record<string, FieldStats> = {};
        for (const [field, stats] of Object.entries(byField)) {
            byFieldWithRates[field] = {
                corrections: stats.corrections,
                total: null,
                rate: null,
            };
        }

        const calibrationWithAccuracy: Record<string, ConfidenceCalibration> = {};
        for (const [level, stats] of Object.entries(confidenceCalibration)) {
            calibrationWithAccuracy[level] = {
                total: null,
                corrected: stats.corrected,
                accuracy: null,
            };
        }

        // Write aggregate to platformSummary/extractionLearning (1 write)
        await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('extractionLearning').set({
            computedAt: FieldValue.serverTimestamp(),
            windowDays: ROLLING_WINDOW_DAYS,
            totalCorrections: result.totalCorrections,
            correctionRate: null,
            correctionRateStatus: 'unavailable_without_extraction_denominator',
            byField: byFieldWithRates,
            confidenceCalibration: calibrationWithAccuracy,
            storesWithCorrections: result.storesWithCorrections,
            storesFailed: result.storesFailed,
        }, { merge: true });
        result.writesCount++;

        analyticsLogger.info('[ExtractionLearning] Aggregation complete', {
            storesProcessed: result.storesProcessed,
            storesWithCorrections: result.storesWithCorrections,
            storesFailed: result.storesFailed,
            totalCorrections: result.totalCorrections,
            correctionRateAvailable: false,
        });

        return result;
    } catch (error: unknown) {
        analyticsLogger.error('[ExtractionLearning] Fatal error', {
            error: getAnalyticsErrorContext(error),
        });
        throw error;
    }
}
