/**
 * AUTHORITY MATURATION ANALYSIS
 * ═══════════════════════════════════════════════════════════════
 * 
 * Nightly analysis of owner control usage to track Authority Maturation Doctrine.
 * 
 * Per the doctrine:
 * - Usage = Lack of Trust Signal
 * - Declining usage = Maturation progressing (Phase 1 → Phase 2 → Phase 3)
 * - High usage → system trust hasn't formed
 * 
 * This function:
 * 1. Reads all ownerControlUsage documents
 * 2. Calculates maturation phase for each store
 * 3. Logs insights for monitoring
 */

import { firestoreAdmin } from '../firebaseAdmin';
import { FieldPath, Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import {
    parseOwnerControlUsageDocument,
    type OwnerControlUsageDocument,
} from '../sharedData/ownerControlUsageContract';
import { analyticsLogger, getAnalyticsErrorContext } from './analyticsDiagnostics';

// ================================================================
// TYPES
// ================================================================

type OwnerControlUsageDoc = OwnerControlUsageDocument<Timestamp>;

type MaturationPhase = 'phase1_active' | 'phase2_passive' | 'phase3_dormant';

interface MaturationAnalysis {
    tId: string;
    sId: string;
    phase: MaturationPhase;
    usageRate: number;          // Usage events per day
    trend: 'increasing' | 'stable' | 'decreasing';
    daysSinceFirstTracked: number;
    totalControlUsages: number;
    lastUsedAny: Date | null;
}

const OWNER_CONTROL_USAGE_PAGE_SIZE = 500;

// ================================================================
// ANALYSIS FUNCTIONS
// ================================================================

/**
 * Calculate maturation phase based on usage patterns
 * 
 * Phase 1 (Active): > 0.5 usages/day OR used in last 7 days
 * Phase 2 (Passive): 0.1-0.5 usages/day AND not used in last 7 days
 * Phase 3 (Dormant): < 0.1 usages/day AND not used in last 30 days
 */
function calculateMaturationPhase(
    usageRate: number,
    daysSinceLastUsed: number | null
): MaturationPhase {
    // If never used or no last used data, assume phase 3
    if (daysSinceLastUsed === null) {
        return 'phase3_dormant';
    }

    // Phase 1: Active users
    if (usageRate > 0.5 || daysSinceLastUsed <= 7) {
        return 'phase1_active';
    }

    // Phase 2: Passive users
    if (usageRate >= 0.1 && daysSinceLastUsed <= 30) {
        return 'phase2_passive';
    }

    // Phase 3: Dormant users
    return 'phase3_dormant';
}

/**
 * Calculate trend from monthly data
 */
function calculateTrend(
    monthlyUsage: Record<string, Record<string, number>>
): 'increasing' | 'stable' | 'decreasing' {
    const months = Object.keys(monthlyUsage).sort();

    if (months.length < 2) {
        return 'stable';
    }

    const lastMonth = monthlyUsage[months[months.length - 1]] || {};
    const prevMonth = monthlyUsage[months[months.length - 2]] || {};

    const lastTotal = Object.values(lastMonth).reduce((a, b) => a + b, 0);
    const prevTotal = Object.values(prevMonth).reduce((a, b) => a + b, 0);

    if (lastTotal > prevTotal * 1.2) return 'increasing';
    if (lastTotal < prevTotal * 0.8) return 'decreasing';
    return 'stable';
}

/**
 * Analyze a single store's owner control usage
 */
function analyzeStore(doc: OwnerControlUsageDoc): MaturationAnalysis {
    const now = new Date();
    const firstTrackedAt = doc.firstTrackedAt?.toDate() || now;
    const daysSinceFirst = Math.max(1, Math.floor(
        (now.getTime() - firstTrackedAt.getTime()) / (1000 * 60 * 60 * 24)
    ));

    // Calculate total usages
    const totalUsages = Object.values(doc.counts || {}).reduce((a, b) => a + b, 0);
    const usageRate = totalUsages / daysSinceFirst;

    // Find last used timestamp (any control)
    let lastUsedAny: Date | null = null;
    if (doc.lastUsed) {
        for (const ts of Object.values(doc.lastUsed)) {
            if (ts) {
                const date = ts.toDate();
                if (!lastUsedAny || date > lastUsedAny) {
                    lastUsedAny = date;
                }
            }
        }
    }

    const daysSinceLastUsed = lastUsedAny
        ? Math.floor((now.getTime() - lastUsedAny.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const phase = calculateMaturationPhase(usageRate, daysSinceLastUsed);
    const trend = calculateTrend(doc.monthlyUsage || {});

    return {
        tId: doc.tId,
        sId: doc.sId,
        phase,
        usageRate,
        trend,
        daysSinceFirstTracked: daysSinceFirst,
        totalControlUsages: totalUsages,
        lastUsedAny,
    };
}

// ================================================================
// MAIN PROCESSING FUNCTION
// ================================================================

/**
 * Process Authority Maturation analysis for all stores
 * Called by master scheduler nightly
 */
export async function processAuthorityMaturationForAllStores(): Promise<{
    processed: number;
    invalidDocuments: number;
    phase1Count: number;
    phase2Count: number;
    phase3Count: number;
}> {
    const db = firestoreAdmin;
    analyticsLogger.info('[AuthorityMaturation] Starting nightly analysis');

    try {
        let processed = 0;
        let invalidDocuments = 0;
        let phase1Count = 0;
        let phase2Count = 0;
        let phase3Count = 0;
        let activeTotalControlUsages = 0;
        let activeMaxUsageRate = 0;
        const activeTrends: Record<MaturationAnalysis['trend'], number> = {
            increasing: 0,
            stable: 0,
            decreasing: 0,
        };
        let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;

        while (true) {
            let query = db.collection(DB_COLLECTIONS.OWNER_CONTROL_USAGE)
                .orderBy(FieldPath.documentId())
                .limit(OWNER_CONTROL_USAGE_PAGE_SIZE);
            if (cursor) query = query.startAfter(cursor);

            const snapshot = await query.get();
            if (snapshot.empty) break;

            for (const documentSnapshot of snapshot.docs) {
                const data = parseOwnerControlUsageDocument(
                    documentSnapshot.data(),
                    documentSnapshot.id,
                    (value): value is Timestamp => value instanceof Timestamp,
                    (value) => value.toMillis(),
                );
                if (!data) {
                    invalidDocuments++;
                    continue;
                }

                const analysis = analyzeStore(data);
                processed++;
                if (analysis.phase === 'phase1_active') {
                    phase1Count++;
                    activeTotalControlUsages += analysis.totalControlUsages;
                    activeMaxUsageRate = Math.max(activeMaxUsageRate, analysis.usageRate);
                    activeTrends[analysis.trend]++;
                } else if (analysis.phase === 'phase2_passive') {
                    phase2Count++;
                } else {
                    phase3Count++;
                }
            }

            cursor = snapshot.docs[snapshot.docs.length - 1];
            if (snapshot.size < OWNER_CONTROL_USAGE_PAGE_SIZE) break;
        }

        if (processed === 0 && invalidDocuments === 0) {
            analyticsLogger.info('[AuthorityMaturation] No usage data found');
        }

        analyticsLogger.info('[AuthorityMaturation] Analysis complete', {
            totalStores: processed,
            invalidDocuments,
            phase1Count,
            phase1Percentage: processed > 0 ? Number(((phase1Count / processed) * 100).toFixed(1)) : 0,
            phase2Count,
            phase2Percentage: processed > 0 ? Number(((phase2Count / processed) * 100).toFixed(1)) : 0,
            phase3Count,
            phase3Percentage: processed > 0 ? Number(((phase3Count / processed) * 100).toFixed(1)) : 0,
        });

        // Log detailed insights for active phase 1 stores (for monitoring)
        if (phase1Count > 0 && phase1Count <= 10) {
            analyticsLogger.info('[AuthorityMaturation] Active high-usage stores found', {
                count: phase1Count,
                totalControlUsages: activeTotalControlUsages,
                maxUsageRate: activeMaxUsageRate,
                trends: activeTrends,
            });
        }

        // Store aggregate summary in insights collection for dashboard
        const summaryDocId = `authority_maturation_${new Date().toISOString().split('T')[0]}`;
        await db.collection(DB_COLLECTIONS.INSIGHTS).doc(summaryDocId).set({
            type: 'authority_maturation_summary',
            date: Timestamp.now(),
            totalStores: processed,
            invalidDocuments,
            phase1Count,
            phase2Count,
            phase3Count,
            phase1Percentage: processed > 0 ? (phase1Count / processed) * 100 : 0,
            phase2Percentage: processed > 0 ? (phase2Count / processed) * 100 : 0,
            phase3Percentage: processed > 0 ? (phase3Count / processed) * 100 : 0,
        });

        return {
            processed,
            invalidDocuments,
            phase1Count,
            phase2Count,
            phase3Count,
        };
    } catch (error) {
        analyticsLogger.error('[AuthorityMaturation] Analysis failed', {
            error: getAnalyticsErrorContext(error),
        });
        throw error;
    }
}
