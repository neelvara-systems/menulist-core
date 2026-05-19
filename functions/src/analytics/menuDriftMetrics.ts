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
 * @see __docs__/internal-tracking/MOL-V0-IMPLEMENTATION-PLAN.md
 * @see __docs__/internal-tracking/MENULIST-INTERNAL-TRACKING-SYSTEM.md
 */

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { logTelemetry, startTimer } from '../telemetry/logger';

// ================================================================
// TYPES
// ================================================================

interface MenuChangeLogEntry {
    id: string;
    projectId: string;
    itemId?: string;
    categoryId?: string;
    changeType: MenuChangeType;
    oldValue: any;
    newValue: any;
    changedBy: string;
    timestamp: Timestamp;
    tId?: string;
    sId?: string;
}

type MenuChangeType =
    | 'PRICE'
    | 'AVAILABILITY'
    | 'ITEM_ADDED'
    | 'ITEM_REMOVED'
    | 'ITEM_ACTIVE'
    | 'CATEGORY_ADDED'
    | 'CATEGORY_REMOVED'
    | 'CATEGORY_REORDER'
    | 'ITEM_REORDER'
    | 'NAME_CHANGE'
    | 'DESCRIPTION_CHANGE'
    | 'IMAGE_CHANGE'
    | 'STRUCTURE';

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
    _priceStale: boolean;          // daysSinceLastPriceChange > 180
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

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Get date string N days ago
 */
function getDateNDaysAgo(days: number): string {
    const date = new Date();
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
    _priceStale: boolean;
    _availabilityChurn: boolean;
    _highVolatility: boolean;
} {
    return {
        _priceStale: (metrics.daysSinceLastPriceChange || 0) > STALE_PRICE_THRESHOLD_DAYS,
        _availabilityChurn: (metrics.availabilityToggleCount30d || 0) > AVAILABILITY_CHURN_THRESHOLD,
        _highVolatility: (metrics.priceChangeCount30d || 0) > HIGH_VOLATILITY_THRESHOLD,
    };
}

// ================================================================
// MAIN PROCESSING FUNCTIONS
// ================================================================

/**
 * Process drift metrics for a single project
 */
async function processProjectDriftMetrics(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string
): Promise<{ itemsProcessed: number; reads: number; writes: number }> {
    const windowEnd = new Date().toISOString().split('T')[0];
    const windowStart = getDateNDaysAgo(ROLLING_WINDOW_DAYS);
    const windowStartDate = new Date(windowStart);

    let reads = 0;
    let writes = 0;

    // Query change logs for this project in the rolling window
    const changeLogsRef = db.collection(DB_COLLECTIONS.MENU_CHANGE_LOG)
        .doc(tId)
        .collection(sId);

    const changesSnapshot = await changeLogsRef
        .where('projectId', '==', projectId)
        .where('timestamp', '>=', Timestamp.fromDate(windowStartDate))
        .get();

    reads++;

    if (changesSnapshot.empty) {
        return { itemsProcessed: 0, reads, writes };
    }

    // Group changes by itemId
    const changesByItem = new Map<string, MenuChangeLogEntry[]>();

    for (const doc of changesSnapshot.docs) {
        const change = { id: doc.id, ...doc.data() } as MenuChangeLogEntry;
        if (!change.itemId) continue;

        const existing = changesByItem.get(change.itemId) || [];
        existing.push(change);
        changesByItem.set(change.itemId, existing);
    }

    // Compute metrics for each item
    const metricsRef = db.collection(DB_COLLECTIONS.MENU_ITEM_STATE)
        .doc(tId)
        .collection(sId)
        .doc(projectId)
        .collection(DB_COLLECTIONS.METRICS);

    for (const [itemId, changes] of changesByItem.entries()) {
        // Count by change type
        let priceChangeCount = 0;
        let availabilityToggleCount = 0;
        let lastPriceChange: Timestamp | null = null;
        let lastAvailabilityChange: Timestamp | null = null;

        for (const change of changes) {
            if (change.changeType === 'PRICE') {
                priceChangeCount++;
                if (!lastPriceChange || change.timestamp.toMillis() > lastPriceChange.toMillis()) {
                    lastPriceChange = change.timestamp;
                }
            }
            if (change.changeType === 'AVAILABILITY') {
                availabilityToggleCount++;
                if (!lastAvailabilityChange || change.timestamp.toMillis() > lastAvailabilityChange.toMillis()) {
                    lastAvailabilityChange = change.timestamp;
                }
            }
        }

        const daysSinceLastPriceChange = daysSince(lastPriceChange);
        const daysSinceLastAvailabilityChange = daysSince(lastAvailabilityChange);

        const flags = computeInternalFlags({
            daysSinceLastPriceChange,
            availabilityToggleCount30d: availabilityToggleCount,
            priceChangeCount30d: priceChangeCount,
        });

        const metrics: DerivedItemMetrics = {
            itemId,
            projectId,
            tId,
            sId,
            priceChangeCount30d: priceChangeCount,
            availabilityToggleCount30d: availabilityToggleCount,
            daysSinceLastPriceChange,
            daysSinceLastAvailabilityChange,
            ...flags,
            computedAt: FieldValue.serverTimestamp(),
            windowStart,
            windowEnd,
        };

        // Write metrics (fire-and-forget style but we track for telemetry)
        await metricsRef.doc(itemId).set(metrics, { merge: true });
        writes++;
    }

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
    const db = admin.firestore();
    const timer = startTimer();

    console.log('[MenuDriftMetrics] Starting nightly drift computation...');

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

        const storesSummary = storesSummaryDoc.exists ? storesSummaryDoc.data()?.stores || {} : {};
        const storeIds = Object.keys(storesSummary);

        console.log(`[MenuDriftMetrics] Found ${storeIds.length} stores to process`);

        for (const sId of storeIds) {
            const storeInfo = storesSummary[sId];
            const tId = storeInfo.tId != null ? String(storeInfo.tId) : '';

            // Skip inactive stores or stores with no tenant
            if (storeInfo.active === false || !tId) {
                continue;
            }

            try {
                // Check if store has any change logs (skip if none)
                const changeLogRef = db.collection(DB_COLLECTIONS.MENU_CHANGE_LOG)
                    .doc(tId)
                    .collection(sId);

                const sampleDoc = await changeLogRef.limit(1).get();
                result.readsCount++;

                if (sampleDoc.empty) {
                    // No change logs for this store, skip
                    continue;
                }

                result.storesProcessed++;

                // Fetch projects for this store
                const projectsSnapshot = await db.collection(DB_COLLECTIONS.PROJECTS)
                    .where('tId', '==', parseInt(tId))
                    .where('sId', '==', parseInt(sId))
                    .get();

                result.readsCount++;

                for (const projectDoc of projectsSnapshot.docs) {
                    const projectData = projectDoc.data();
                    const projectId = projectData.projectId || projectDoc.id;

                    // Skip inactive/deleted projects
                    if (projectData.deleted === true || projectData.active === false) {
                        continue;
                    }

                    try {
                        const projectResult = await processProjectDriftMetrics(db, tId, sId, projectId);

                        result.projectsProcessed++;
                        result.itemsProcessed += projectResult.itemsProcessed;
                        result.readsCount += projectResult.reads;
                        result.writesCount += projectResult.writes;
                    } catch (projectError: any) {
                        result.errors.push(`Project ${projectId}: ${projectError.message}`);
                    }
                }
            } catch (storeError: any) {
                result.errors.push(`Store ${sId}: ${storeError.message}`);
            }
        }

        result.processed = result.itemsProcessed;

        // Log summary
        console.log(`[MenuDriftMetrics] Computation complete:`);
        console.log(`  - Stores processed: ${result.storesProcessed}`);
        console.log(`  - Projects processed: ${result.projectsProcessed}`);
        console.log(`  - Items processed: ${result.itemsProcessed}`);
        console.log(`  - Reads: ${result.readsCount}, Writes: ${result.writesCount}`);

        if (result.errors.length > 0) {
            console.warn(`[MenuDriftMetrics] Errors (${result.errors.length}):`, result.errors.slice(0, 5));
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
    } catch (error: any) {
        console.error('[MenuDriftMetrics] Fatal error:', error);

        await logTelemetry('menuDriftMetricsFn', {
            status: 'failed',
            runTime: timer.getElapsed(),
            error: error.message,
            startedAt: timer.stop().startedAt,
            completedAt: Timestamp.now(),
        });

        throw error;
    }
}
