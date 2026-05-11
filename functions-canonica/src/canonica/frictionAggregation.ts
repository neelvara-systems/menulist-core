/**
 * Canonica — Product Friction Intelligence: Nightly Aggregation
 * 
 * Step 9 of canonicaNightly: Aggregate signal events into daily per-entity
 * friction metrics + compute 7-day snapshot with trends.
 * 
 * Pipeline:
 * 1. Query today's signal events, group by entityId
 * 2. Query today's canonical misses from search history
 * 3. For each entity with signals: compute friction score, write daily stat
 * 4. Read last 14 days of daily stats → compute 7d vs previous 7d trends
 * 5. Detect emerging topics
 * 6. Write frictionSnapshot to platformSummary
 * 
 * Feature-flagged: ENABLE_CANONICA_FRICTION_INTELLIGENCE
 * @see __docs__/canonica/product-friction-intelligence/
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin as db } from '../firebaseAdmin';

// ═══════════════════════════════════════════════════════════════
// TYPES (server-side mirrors of src/types/canonica/index.ts)
// ═══════════════════════════════════════════════════════════════

type FrictionTrendDirection = 'rising' | 'stable' | 'improving' | 'new';
type FrictionHealth = 'HIGH' | 'MODERATE' | 'LOW';

interface EntitySignalCounts {
    entityId: string;
    ticketCount: number;
    chatNegativeCount: number;
    escalationCount: number;
    queryCount: number;
}

interface EntityDailyStat {
    entityId: string;
    entityName: string;
    entityType: string;
    date: string;
    queryCount: number;
    ticketCount: number;
    chatNegativeCount: number;
    escalationCount: number;
    lowConfidenceCount: number;
    frictionScore: number;
}

interface FrictionEntitySummary {
    entityId: string;
    entityName: string;
    entityType: string;
    last7d: {
        queryCount: number;
        escalationCount: number;
        lowConfidenceCount: number;
        frictionScore: number;
    };
    previous7d: {
        queryCount: number;
        frictionScore: number;
    };
    trendDirection: FrictionTrendDirection;
    trendScore: number;
}

interface EmergingTopic {
    entityId: string;
    entityName: string;
    entityType: string;
    queryCount: number;
    escalationRate: number;
    firstSeenDate: string;
}

export interface FrictionAggregationResult {
    entitiesProcessed: number;
    dailyStatsWritten: number;
    snapshotWritten: boolean;
    topEntityCount: number;
    emergingCount: number;
    overallHealth: FrictionHealth;
}

// ═══════════════════════════════════════════════════════════════
// FRICTION SCORE ALGORITHM
// ═══════════════════════════════════════════════════════════════

function calculateFrictionScore(queryCount: number, escalationCount: number, lowConfidenceCount: number): number {
    if (queryCount === 0) return 0;
    const escalationRate = escalationCount / queryCount;
    const lowConfidenceRate = lowConfidenceCount / queryCount;
    return Math.round(queryCount * (1 + escalationRate + lowConfidenceRate) * 100) / 100;
}

function detectTrend(last7d: number, previous7d: number): { direction: FrictionTrendDirection; score: number } {
    if (previous7d === 0 && last7d > 0) return { direction: 'new', score: 0 };
    if (previous7d === 0) return { direction: 'stable', score: 1.0 };
    const ratio = Math.round((last7d / previous7d) * 100) / 100;
    if (ratio > 1.5) return { direction: 'rising', score: ratio };
    if (ratio < 0.7) return { direction: 'improving', score: ratio };
    return { direction: 'stable', score: ratio };
}

function classifyOverallHealth(totalFrictionScore: number): FrictionHealth {
    if (totalFrictionScore > 500) return 'HIGH';
    if (totalFrictionScore > 100) return 'MODERATE';
    return 'LOW';
}

// ═══════════════════════════════════════════════════════════════
// MAIN AGGREGATION
// ═══════════════════════════════════════════════════════════════

export async function aggregateFrictionStats(tId: number, sId: number): Promise<FrictionAggregationResult> {
    const result: FrictionAggregationResult = {
        entitiesProcessed: 0,
        dailyStatsWritten: 0,
        snapshotWritten: false,
        topEntityCount: 0,
        emergingCount: 0,
        overallHealth: 'LOW',
    };

    if (!FUNCTION_FLAGS.ENABLE_CANONICA_FRICTION_INTELLIGENCE) return result;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayStartTimestamp = Timestamp.fromDate(dayStart);

    try {
        // ─── Step 1: Query today's signal events, group by entityId ───
        const signalsSnap = await db
            .collection(DB_COLLECTIONS.CANONICA_SIGNAL_EVENTS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('timestamp', '>=', dayStartTimestamp)
            .limit(500)
            .get();

        const entitySignals = new Map<string, EntitySignalCounts>();

        for (const doc of signalsSnap.docs) {
            const data = doc.data();
            const entityId = data.entityId;
            if (!entityId || entityId === 'unresolved') continue;

            const counts = entitySignals.get(entityId) || {
                entityId,
                ticketCount: 0,
                chatNegativeCount: 0,
                escalationCount: 0,
                queryCount: 0,
            };

            counts.queryCount++;
            if (data.type === 'ticket') counts.ticketCount++;
            else if (data.type === 'chat_negative') counts.chatNegativeCount++;
            else if (data.type === 'escalation') counts.escalationCount++;

            entitySignals.set(entityId, counts);
        }

        // ─── Step 2: Query today's canonical misses from search history ───
        const entityMissCounts = new Map<string, number>();

        try {
            const missesSnap = await db
                .collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('canonical', '==', false)
                .where('createdOn', '>=', dayStartTimestamp)
                .limit(500)
                .get();

            for (const doc of missesSnap.docs) {
                const data = doc.data();
                const matchedEntityIds: string[] = data.matchedEntityIds || [];
                for (const entityId of matchedEntityIds) {
                    if (entityId && entityId !== 'unresolved') {
                        entityMissCounts.set(entityId, (entityMissCounts.get(entityId) || 0) + 1);
                    }
                }
            }
        } catch {
            // Non-blocking: search history may not have all fields
        }

        // ─── Step 3: Denormalize entity names + write daily stats ───
        const allEntityIds = new Set([...entitySignals.keys(), ...entityMissCounts.keys()]);
        if (allEntityIds.size === 0) return result;

        // Fetch entity names/types in bulk
        const entityNameMap = new Map<string, { name: string; type: string }>();
        const entityIdsArray = Array.from(allEntityIds);

        // Firestore batched get avoids scanning every entity doc for each chunk.
        for (let i = 0; i < entityIdsArray.length; i += 30) {
            const batch = entityIdsArray.slice(i, i + 30);
            const refs = batch.map(entityId => db.collection(DB_COLLECTIONS.CANONICA_ENTITIES).doc(entityId));
            const entityDocs = await db.getAll(...refs);

            for (const doc of entityDocs) {
                if (!doc.exists) continue;
                const data = doc.data();
                if (data?.tId !== tId || data?.sId !== sId) continue;
                entityNameMap.set(doc.id, { name: data.name || doc.id, type: data.type || 'feature' });
            }
        }

        const dailyStats: EntityDailyStat[] = [];

        for (const entityId of allEntityIds) {
            const signals = entitySignals.get(entityId) || {
                entityId, ticketCount: 0, chatNegativeCount: 0, escalationCount: 0, queryCount: 0,
            };
            const lowConfidenceCount = entityMissCounts.get(entityId) || 0;
            const entityInfo = entityNameMap.get(entityId) || { name: entityId, type: 'feature' };

            // Skip deprecated entities
            const frictionScore = calculateFrictionScore(
                signals.queryCount + lowConfidenceCount,
                signals.escalationCount,
                lowConfidenceCount
            );

            const stat: EntityDailyStat = {
                entityId,
                entityName: entityInfo.name,
                entityType: entityInfo.type,
                date: today,
                queryCount: signals.queryCount + lowConfidenceCount,
                ticketCount: signals.ticketCount,
                chatNegativeCount: signals.chatNegativeCount,
                escalationCount: signals.escalationCount,
                lowConfidenceCount,
                frictionScore,
            };

            dailyStats.push(stat);
        }

        // Write daily stats (set with merge = idempotent)
        for (const stat of dailyStats) {
            const docId = `${tId}_${sId}_${stat.entityId}_${today}`;
            await db.collection(DB_COLLECTIONS.CANONICA_FRICTION_DAILY_STATS).doc(docId).set({
                tId,
                sId,
                ...stat,
                createdOn: Timestamp.now(),
            }, { merge: true });
            result.dailyStatsWritten++;
        }

        result.entitiesProcessed = dailyStats.length;

        // ─── Step 4: Compute 7d snapshot with trends ───
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0];

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        const historicalSnap = await db
            .collection(DB_COLLECTIONS.CANONICA_FRICTION_DAILY_STATS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('date', '>=', fourteenDaysAgoStr)
            .limit(500)
            .get();

        // Aggregate per entity: last7d vs previous7d
        const entityAgg = new Map<string, {
            entityName: string;
            entityType: string;
            last7d: { queryCount: number; escalationCount: number; lowConfidenceCount: number; frictionScore: number };
            previous7d: { queryCount: number; frictionScore: number };
            firstSeenDate: string;
        }>();

        for (const doc of historicalSnap.docs) {
            const data = doc.data();
            const eid = data.entityId;
            if (!eid) continue;

            const agg = entityAgg.get(eid) || {
                entityName: data.entityName || eid,
                entityType: data.entityType || 'feature',
                last7d: { queryCount: 0, escalationCount: 0, lowConfidenceCount: 0, frictionScore: 0 },
                previous7d: { queryCount: 0, frictionScore: 0 },
                firstSeenDate: data.date,
            };

            if (data.date >= sevenDaysAgoStr) {
                agg.last7d.queryCount += data.queryCount || 0;
                agg.last7d.escalationCount += data.escalationCount || 0;
                agg.last7d.lowConfidenceCount += data.lowConfidenceCount || 0;
                agg.last7d.frictionScore += data.frictionScore || 0;
            } else {
                agg.previous7d.queryCount += data.queryCount || 0;
                agg.previous7d.frictionScore += data.frictionScore || 0;
            }

            if (data.date < agg.firstSeenDate) agg.firstSeenDate = data.date;

            entityAgg.set(eid, agg);
        }

        // Build top friction entities (sorted by last7d frictionScore)
        const topEntities: FrictionEntitySummary[] = Array.from(entityAgg.entries())
            .map(([entityId, agg]) => {
                const trend = detectTrend(agg.last7d.frictionScore, agg.previous7d.frictionScore);
                return {
                    entityId,
                    entityName: agg.entityName,
                    entityType: agg.entityType,
                    last7d: agg.last7d,
                    previous7d: agg.previous7d,
                    trendDirection: trend.direction,
                    trendScore: trend.score,
                };
            })
            .filter(e => e.last7d.queryCount > 0)
            .sort((a, b) => b.last7d.frictionScore - a.last7d.frictionScore)
            .slice(0, 10);

        // ─── Step 5: Detect emerging topics ───
        const emerging: EmergingTopic[] = Array.from(entityAgg.entries())
            .filter(([, agg]) => agg.last7d.queryCount >= 10 && agg.previous7d.queryCount < 3)
            .map(([entityId, agg]) => ({
                entityId,
                entityName: agg.entityName,
                entityType: agg.entityType,
                queryCount: agg.last7d.queryCount,
                escalationRate: agg.last7d.queryCount > 0
                    ? Math.round((agg.last7d.escalationCount / agg.last7d.queryCount) * 100) / 100
                    : 0,
                firstSeenDate: agg.firstSeenDate,
            }))
            .sort((a, b) => b.queryCount - a.queryCount)
            .slice(0, 5);

        // Overall health
        const totalFrictionScore = topEntities.reduce((sum, e) => sum + e.last7d.frictionScore, 0);
        const overallHealth = classifyOverallHealth(totalFrictionScore);
        const totalSignals7d = topEntities.reduce((sum, e) => sum + e.last7d.queryCount, 0);
        const totalEscalations7d = topEntities.reduce((sum, e) => sum + e.last7d.escalationCount, 0);

        // ─── Step 6: Write frictionSnapshot to platformSummary ───
        await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`frictionSnapshot_${tId}_${sId}`).set({
            lastUpdated: Timestamp.now(),
            topFrictionEntities: topEntities,
            emergingTopics: emerging,
            overallHealth,
            totalSignals7d,
            totalEscalations7d,
        }, { merge: true });

        result.snapshotWritten = true;
        result.topEntityCount = topEntities.length;
        result.emergingCount = emerging.length;
        result.overallHealth = overallHealth;

    } catch (error) {
        logger.error('[Canonica Friction] Aggregation failed', { tId, sId, error });
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// DAILY STATS CLEANUP (90-day retention)
// ═══════════════════════════════════════════════════════════════

export async function cleanupExpiredFrictionStats(tId: number, sId: number, retentionDays: number = 90, batchLimit: number = 100): Promise<{ cleaned: number }> {
    const result = { cleaned: 0 };

    if (!FUNCTION_FLAGS.ENABLE_CANONICA_FRICTION_INTELLIGENCE) return result;

    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        const snapshot = await db
            .collection(DB_COLLECTIONS.CANONICA_FRICTION_DAILY_STATS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('date', '<', cutoffStr)
            .limit(batchLimit)
            .get();

        if (snapshot.empty) return result;

        const batch = db.batch();
        for (const doc of snapshot.docs) {
            batch.delete(doc.ref);
            result.cleaned++;
        }
        await batch.commit();
    } catch (error) {
        logger.error('[Canonica Friction] Stats cleanup failed', { tId, sId, retentionDays, batchLimit, error });
    }

    return result;
}
