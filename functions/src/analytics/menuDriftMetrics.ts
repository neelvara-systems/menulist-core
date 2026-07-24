/**
 * MENU DRIFT METRICS - MOL v0 Sprint 2
 * ═══════════════════════════════════════════════════════════════
 * 
 * Nightly computation of drift metrics from menu change logs.
 * Part of Menu Observation Layer (MOL v0) - silent infrastructure.
 * 
 * Per Authority Maturation Doctrine:
 * - This is internal system memory, NOT user-facing
 * - Metrics inform future autonomous capabilities
 * - Zero UI exposure
 * 
 * Implements:
 * - Category D (Owner Intervention Tracking) from Internal Tracking System
 * - Category E (Output Stability) via drift counters
 * - Category F (Cost & Performance) via telemetry
 * 
 * @see __docs__/internal-tracking/mol-v0-implementation-plan.md
 * @see __docs__/internal-tracking/menulist-internal-tracking-system.md
 */

import { firestoreAdmin } from '../firebaseAdmin';
import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import {
    getPriceStaleAssessment,
    readMenuDriftContributions,
    type MenuDriftSummaryContribution,
} from '../sharedData/menuDriftContribution';
import { parsePlatformStoreSummary } from '../sharedData/storeSummaryBoundary';
import { logTelemetry, startTimer } from '../telemetry/logger';
import { analyticsLogger, getAnalyticsErrorContext, getAnalyticsIdContext } from './analyticsDiagnostics';

// ================================================================
// TYPES
// ================================================================

export interface ItemDriftAccumulator {
    priceChangeCount: number;
    availabilityToggleCount: number;
    lastPriceChange: Timestamp | null;
    lastAvailabilityChange: Timestamp | null;
}

export type ProjectDriftAccumulators = Map<string, ItemDriftAccumulator>;
export type StoreDriftAccumulators = Map<string, ProjectDriftAccumulators>;

interface DerivedItemMetrics {
    itemId: string;
    projectId: string;
    tId: string;
    sId: string;

    // Counters (30-day rolling window)
    priceChangeCount30d: number;
    availabilityToggleCount30d: number;

    // Computed values
    daysSinceLastPriceChange: number | null;
    daysSinceLastAvailabilityChange: number | null;

    // Internal flags (NEVER exposed to UI - for system use only)
    _priceStale: boolean | null;
    _priceStaleStatus: 'measured' | 'unavailable_outside_rolling_window';
    _availabilityChurn: boolean;   // toggleCount30d > 10
    _highVolatility: boolean;      // priceChangeCount30d > 5

    // Metadata
    computedAt: FieldValue;
    windowStart: string;           // YYYY-MM-DD
    windowEnd: string;             // YYYY-MM-DD
}

interface DriftMetricsResult {
    processed: number;
    storesProcessed: number;
    projectsProcessed: number;
    itemsProcessed: number;
    readsCount: number;
    writesCount: number;
    errors: string[];
}

// ================================================================
// CONSTANTS
// ================================================================

const ROLLING_WINDOW_DAYS = 30;
const STALE_PRICE_THRESHOLD_DAYS = 180;
const AVAILABILITY_CHURN_THRESHOLD = 10;
const HIGH_VOLATILITY_THRESHOLD = 5;
const PROJECT_DRIFT_FAILURE = 'PROJECT_DRIFT_METRICS_FAILED';
const STORE_DRIFT_FAILURE = 'STORE_DRIFT_METRICS_FAILED';
const CHANGE_LOG_PAGE_SIZE = 500;
const MAX_CHANGE_LOG_DOCUMENTS_PER_STORE = 50_000;
const METRICS_READ_PAGE_SIZE = 500;
const MAX_METRICS_DOCUMENTS_PER_PROJECT = 10_000;
const METRICS_WRITE_BATCH_SIZE = 400;

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Get date string N days ago
 */
function getDateNDaysAgo(days: number, now = new Date()): string {
    const date = new Date(now.getTime());
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
}

/**
 * Calculate days since a timestamp
 */
function daysSince(timestamp: Timestamp | null): number | null {
    if (!timestamp) return null;
    const now = new Date();
    const then = timestamp.toDate();
    return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Compute internal flags from metrics
 * CRITICAL: These flags are NEVER exposed to UI
 */
function computeInternalFlags(metrics: Partial<DerivedItemMetrics>): {
    _priceStale: boolean | null;
    _priceStaleStatus: 'measured' | 'unavailable_outside_rolling_window';
    _availabilityChurn: boolean;
    _highVolatility: boolean;
} {
    const priceStale = getPriceStaleAssessment(
        metrics.daysSinceLastPriceChange ?? null,
        STALE_PRICE_THRESHOLD_DAYS,
    );
    return {
        _priceStale: priceStale.value,
        _priceStaleStatus: priceStale.status,
        _availabilityChurn: (metrics.availabilityToggleCount30d || 0) > AVAILABILITY_CHURN_THRESHOLD,
        _highVolatility: (metrics.priceChangeCount30d || 0) > HIGH_VOLATILITY_THRESHOLD,
    };
}

// ================================================================
// MAIN PROCESSING FUNCTIONS
// ================================================================

const applyDriftContribution = (
    changesByItem: ProjectDriftAccumulators,
    contribution: MenuDriftSummaryContribution,
    timestamp: Timestamp,
): void => {
    const accumulator = changesByItem.get(contribution.itemId) || {
        priceChangeCount: 0,
        availabilityToggleCount: 0,
        lastPriceChange: null,
        lastAvailabilityChange: null,
    };

    if (contribution.priceChanges > 0) {
        accumulator.priceChangeCount += contribution.priceChanges;
        if (!accumulator.lastPriceChange
            || timestamp.toMillis() > accumulator.lastPriceChange.toMillis()) {
            accumulator.lastPriceChange = timestamp;
        }
    }
    if (contribution.availabilityChanges > 0) {
        accumulator.availabilityToggleCount += contribution.availabilityChanges;
        if (!accumulator.lastAvailabilityChange
            || timestamp.toMillis() > accumulator.lastAvailabilityChange.toMillis()) {
            accumulator.lastAvailabilityChange = timestamp;
        }
    }
    changesByItem.set(contribution.itemId, accumulator);
};

/**
 * Read each store's rolling MOL window once and partition contributions by the
 * document-path project IDs that are active in that store.
 */
export async function readStoreDriftAccumulators(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    activeProjectIds: ReadonlySet<string>,
    windowStartTimestamp: Timestamp,
    windowEndTimestamp: Timestamp,
): Promise<{ changesByProject: StoreDriftAccumulators; reads: number }> {
    let reads = 0;
    let documentsScanned = 0;
    const changesByProject: StoreDriftAccumulators = new Map();
    const changeLogsRef = db.collection(DB_COLLECTIONS.MENU_CHANGE_LOG)
        .doc(tId)
        .collection(sId);
    let lastDocument: FirebaseFirestore.QueryDocumentSnapshot | undefined;

    while (true) {
        if (documentsScanned >= MAX_CHANGE_LOG_DOCUMENTS_PER_STORE) {
            throw new RangeError('Menu drift store scan limit exceeded');
        }
        let changeQuery = changeLogsRef
            .where('timestamp', '>=', windowStartTimestamp)
            .where('timestamp', '<=', windowEndTimestamp)
            .orderBy('timestamp', 'asc')
            .orderBy(FieldPath.documentId(), 'asc')
            .limit(CHANGE_LOG_PAGE_SIZE);
        if (lastDocument) changeQuery = changeQuery.startAfter(lastDocument);

        const changesSnapshot = await changeQuery.get();
        reads += Math.max(1, changesSnapshot.size);
        documentsScanned += changesSnapshot.size;

        for (const document of changesSnapshot.docs) {
            const data = document.data();
            if (typeof data.projectId !== 'string'
                || !activeProjectIds.has(data.projectId)
                || !(data.timestamp instanceof Timestamp)) {
                continue;
            }

            const contributions = readMenuDriftContributions(data);
            if (contributions.length === 0) continue;

            const changesByItem = changesByProject.get(data.projectId) || new Map();
            for (const contribution of contributions) {
                applyDriftContribution(changesByItem, contribution, data.timestamp);
            }
            changesByProject.set(data.projectId, changesByItem);
        }

        if (changesSnapshot.size < CHANGE_LOG_PAGE_SIZE) break;
        lastDocument = changesSnapshot.docs[changesSnapshot.docs.length - 1];
    }

    return { changesByProject, reads };
}

/**
 * Persist one project's in-memory counters in bounded Firestore batches.
 */
export async function writeProjectDriftMetrics(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    changesByItem: ProjectDriftAccumulators,
    windowStart: string,
    windowEnd: string,
): Promise<{ itemsProcessed: number; reads: number; writes: number }> {
    const metricsRef = db.collection(DB_COLLECTIONS.MENU_ITEM_STATE)
        .doc(tId)
        .collection(sId)
        .doc(projectId)
        .collection(DB_COLLECTIONS.METRICS);
    let batch = db.batch();
    let writesInBatch = 0;
    let writes = 0;
    let reads = 0;
    let metricsDocumentsScanned = 0;
    let lastMetricDocument: FirebaseFirestore.QueryDocumentSnapshot | undefined;

    // Rolling-window documents are derived cache. Remove entries whose last
    // contribution aged out so a previous run cannot remain as current truth.
    while (true) {
        if (metricsDocumentsScanned >= MAX_METRICS_DOCUMENTS_PER_PROJECT) {
            throw new RangeError('Menu drift metrics cleanup scan limit exceeded');
        }
        let metricsQuery = metricsRef
            .orderBy(FieldPath.documentId(), 'asc')
            .limit(METRICS_READ_PAGE_SIZE);
        if (lastMetricDocument) metricsQuery = metricsQuery.startAfter(lastMetricDocument);
        const existingMetrics = await metricsQuery.get();
        reads += Math.max(1, existingMetrics.size);
        metricsDocumentsScanned += existingMetrics.size;

        for (const metricDocument of existingMetrics.docs) {
            if (changesByItem.has(metricDocument.id)) continue;
            batch.delete(metricDocument.ref);
            writesInBatch++;
            writes++;
            if (writesInBatch === METRICS_WRITE_BATCH_SIZE) {
                await batch.commit();
                batch = db.batch();
                writesInBatch = 0;
            }
        }
        if (existingMetrics.size < METRICS_READ_PAGE_SIZE) break;
        lastMetricDocument = existingMetrics.docs[existingMetrics.docs.length - 1];
    }

    for (const [itemId, changes] of changesByItem.entries()) {
        const daysSinceLastPriceChange = daysSince(changes.lastPriceChange);
        const daysSinceLastAvailabilityChange = daysSince(changes.lastAvailabilityChange);

        const flags = computeInternalFlags({
            daysSinceLastPriceChange,
            availabilityToggleCount30d: changes.availabilityToggleCount,
            priceChangeCount30d: changes.priceChangeCount,
        });

        const metrics: DerivedItemMetrics = {
            itemId,
            projectId,
            tId,
            sId,
            priceChangeCount30d: changes.priceChangeCount,
            availabilityToggleCount30d: changes.availabilityToggleCount,
            daysSinceLastPriceChange,
            daysSinceLastAvailabilityChange,
            ...flags,
            computedAt: FieldValue.serverTimestamp(),
            windowStart,
            windowEnd,
        };

        // This is the complete rolling-window projection for one item. Exact
        // replacement prevents unknown legacy fields or removed derived fields
        // from surviving after the authoritative source window is recomputed.
        batch.set(metricsRef.doc(itemId), metrics);
        writesInBatch++;
        writes++;
        if (writesInBatch === METRICS_WRITE_BATCH_SIZE) {
            await batch.commit();
            batch = db.batch();
            writesInBatch = 0;
        }
    }
    if (writesInBatch > 0) await batch.commit();

    return {
        itemsProcessed: changesByItem.size,
        reads,
        writes,
    };
}

/**
 * Process drift metrics for all stores
 * Called by the nightly scheduler (decisionBlocksScoring.ts)
 */
export async function processMenuDriftMetricsForAllStores(): Promise<DriftMetricsResult> {
    const db = firestoreAdmin;
    const timer = startTimer();

    analyticsLogger.info('[MenuDriftMetrics] Starting nightly drift computation');

    const result: DriftMetricsResult = {
        processed: 0,
        storesProcessed: 0,
        projectsProcessed: 0,
        itemsProcessed: 0,
        readsCount: 0,
        writesCount: 0,
        errors: [],
    };

    try {
        // Use storesSummary for efficiency (same pattern as decisionBlocksScoring)
        const storesSummaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get();
        result.readsCount++;

        const storesSummary = parsePlatformStoreSummary(storesSummaryDoc.exists ? storesSummaryDoc.data() : undefined);
        const storeIds = Object.keys(storesSummary);

        analyticsLogger.info('[MenuDriftMetrics] Stores found to process', {
            storeCount: storeIds.length,
        });

        const windowEndTimestamp = Timestamp.now();
        const windowEndDate = windowEndTimestamp.toDate();
        const windowEnd = windowEndDate.toISOString().split('T')[0];
        const windowStart = getDateNDaysAgo(ROLLING_WINDOW_DAYS, windowEndDate);

        for (const sId of storeIds) {
            const storeInfo = storesSummary[sId];
            const tId = storeInfo.tId;

            // Skip inactive stores or stores with no tenant
            if (storeInfo.active === false || !tId) {
                continue;
            }

            try {
                // Projects use the nested collection contract
                // projects/{tId}/{sId}/{projectId}; querying the top-level
                // collection returns tenant container documents, not projects.
                const projectsSnapshot = await db.collection(DB_COLLECTIONS.PROJECTS)
                    .doc(tId)
                    .collection(sId)
                    .get();
                result.readsCount += Math.max(1, projectsSnapshot.size);

                const activeProjectIds = new Set<string>();
                for (const projectDoc of projectsSnapshot.docs) {
                    const projectData = projectDoc.data();
                    if (projectData.deleted === true || projectData.active === false) {
                        continue;
                    }
                    // The document path is authoritative. Never let a mutable
                    // payload field redirect metrics to another project.
                    activeProjectIds.add(projectDoc.id);
                }
                if (activeProjectIds.size === 0) continue;

                result.storesProcessed++;
                const storeDrift = await readStoreDriftAccumulators(
                    db,
                    tId,
                    sId,
                    activeProjectIds,
                    Timestamp.fromDate(new Date(windowStart)),
                    windowEndTimestamp,
                );
                result.readsCount += storeDrift.reads;

                for (const projectId of activeProjectIds) {
                    try {
                        const projectResult = await writeProjectDriftMetrics(
                            db,
                            tId,
                            sId,
                            projectId,
                            storeDrift.changesByProject.get(projectId) || new Map(),
                            windowStart,
                            windowEnd,
                        );

                        result.projectsProcessed++;
                        result.itemsProcessed += projectResult.itemsProcessed;
                        result.readsCount += projectResult.reads;
                        result.writesCount += projectResult.writes;
                    } catch (projectError: unknown) {
                        result.errors.push(PROJECT_DRIFT_FAILURE);
                        analyticsLogger.warn('[MenuDriftMetrics] Project processing failed', {
                            projectId: getAnalyticsIdContext(projectId),
                            storeId: getAnalyticsIdContext(sId),
                            tenantId: getAnalyticsIdContext(tId),
                            error: getAnalyticsErrorContext(projectError),
                        });
                    }
                }
            } catch (storeError: unknown) {
                result.errors.push(STORE_DRIFT_FAILURE);
                analyticsLogger.warn('[MenuDriftMetrics] Store processing failed', {
                    storeId: getAnalyticsIdContext(sId),
                    tenantId: getAnalyticsIdContext(tId),
                    error: getAnalyticsErrorContext(storeError),
                });
            }
        }

        result.processed = result.itemsProcessed;

        analyticsLogger.info('[MenuDriftMetrics] Computation complete', {
            storesProcessed: result.storesProcessed,
            projectsProcessed: result.projectsProcessed,
            itemsProcessed: result.itemsProcessed,
            readsCount: result.readsCount,
            writesCount: result.writesCount,
            errors: result.errors.length,
        });

        if (result.errors.length > 0) {
            analyticsLogger.warn('[MenuDriftMetrics] Computation completed with errors', {
                errorCount: result.errors.length,
                sampleCodes: Array.from(new Set(result.errors)).slice(0, 5),
            });
        }

        // Log telemetry
        await logTelemetry('menuDriftMetricsFn', {
            status: result.errors.length === 0 ? 'success' : 'failed',
            runTime: timer.getElapsed(),
            recordsProcessed: result.itemsProcessed,
            startedAt: timer.stop().startedAt,
            completedAt: Timestamp.now(),
        });

        // Also log cost telemetry per Category F of Internal Tracking System
        const today = new Date().toISOString().split('T')[0];
        await db.collection(DB_COLLECTIONS.SYSTEM_TELEMETRY).doc(`mol_costs_${today}`).set({
            type: 'mol_cost_telemetry',
            functionName: 'menuDriftMetrics',
            date: today,
            readsCount: result.readsCount,
            writesCount: result.writesCount,
            executionMs: timer.getElapsed(),
            storesProcessed: result.storesProcessed,
            itemsProcessed: result.itemsProcessed,
            errors: result.errors.length,
            timestamp: FieldValue.serverTimestamp(),
        }, { merge: true });

        return result;
    } catch (error: unknown) {
        analyticsLogger.error('[MenuDriftMetrics] Fatal error', {
            error: getAnalyticsErrorContext(error),
        });

        await logTelemetry('menuDriftMetricsFn', {
            status: 'failed',
            runTime: timer.getElapsed(),
            error: 'MENU_DRIFT_METRICS_FATAL',
            startedAt: timer.stop().startedAt,
            completedAt: Timestamp.now(),
        });

        throw error;
    }
}
