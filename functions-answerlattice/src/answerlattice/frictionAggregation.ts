/**
 * Answerlattice — Product Friction Intelligence: Nightly Aggregation
 * 
 * Step 9 of answerlatticeNightly: Aggregate signal events into daily per-entity
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
 * Feature-flagged: ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE
 * @see __docs__/answerlattice/product-friction-intelligence/
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin as db } from '../firebaseAdmin';
import {
    ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
    ANSWERLATTICE_SUPPORT_METRIC_SOURCE_LIMITS,
    ANSWERLATTICE_SUPPORT_METRIC_WINDOWS,
    calculateAnswerlatticeFrictionLoad,
    classifyAnswerlatticeFrictionLevel,
    detectAnswerlatticeFrictionTrend,
    getAnswerlatticeUtcFrictionWindows,
} from '../sharedData/answerlatticeSupportMetrics';
import { normalizeAnswerlatticeResolvedFunctionEntityId } from './entityIdBoundary';
import { type AnswerlatticeSchedulerReadObserver } from './schedulerReadTelemetry';

const ANSWERLATTICE_FRICTION_AGGREGATION_FAILED = 'ANSWERLATTICE_FRICTION_AGGREGATION_FAILED';
const ANSWERLATTICE_FRICTION_STATS_CLEANUP_FAILED = 'ANSWERLATTICE_FRICTION_STATS_CLEANUP_FAILED';

function getFrictionAggregationSourceErrorContext(error: unknown): {
    sourceErrorName: string | null;
    sourceErrorCode: string | number | null;
    sourceStatusCode: number | null;
} {
    const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    const sourceStatusCode = typeof source.status === 'number'
        ? source.status
        : (typeof source.statusCode === 'number' ? source.statusCode : null);

    return {
        sourceErrorName: typeof source.name === 'string' ? source.name : null,
        sourceErrorCode: typeof source.code === 'string' || typeof source.code === 'number' ? source.code : null,
        sourceStatusCode,
    };
}

function getFrictionAggregationScopeContext(tId?: number, sId?: number): {
    hasTenantScope: boolean;
    hasStoreScope: boolean;
} {
    return {
        hasTenantScope: Number.isFinite(tId),
        hasStoreScope: Number.isFinite(sId),
    };
}

// ═══════════════════════════════════════════════════════════════
// TYPES (server-side mirrors of src/types/answerlattice/index.ts)
// ═══════════════════════════════════════════════════════════════

type FrictionTrendDirection = 'rising' | 'stable' | 'improving' | 'new';
type FrictionLevel = 'HIGH' | 'MODERATE' | 'LOW';

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
    overallHealth: FrictionLevel;
    unmappedEvidenceCount: number;
    legacyDailyStatCount: number;
}

// ═══════════════════════════════════════════════════════════════
// FRICTION SCORE ALGORITHM
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// MAIN AGGREGATION
// ═══════════════════════════════════════════════════════════════

export async function aggregateFrictionStats(
    tId: number,
    sId: number,
    readObserver?: AnswerlatticeSchedulerReadObserver,
): Promise<FrictionAggregationResult> {
    const result: FrictionAggregationResult = {
        entitiesProcessed: 0,
        dailyStatsWritten: 0,
        snapshotWritten: false,
        topEntityCount: 0,
        emergingCount: 0,
        overallHealth: 'LOW',
        unmappedEvidenceCount: 0,
        legacyDailyStatCount: 0,
    };

    if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE) return result;

    const now = new Date();
    const windows = getAnswerlatticeUtcFrictionWindows(now);
    const today = windows.today;
    const dayStartTimestamp = Timestamp.fromMillis(windows.dayStartMs);
    const signalLimit = ANSWERLATTICE_SUPPORT_METRIC_SOURCE_LIMITS.dailyFrictionSignals;
    const missLimit = ANSWERLATTICE_SUPPORT_METRIC_SOURCE_LIMITS.dailyCanonicalMisses;
    const historyLimit = ANSWERLATTICE_SUPPORT_METRIC_SOURCE_LIMITS.frictionHistoryRows;

    try {
        // ─── Step 1: Query today's signal events, group by entityId ───
        const signalsSnap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
            .where('pId', '==', 'AL')
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('timestamp', '>=', dayStartTimestamp)
            .orderBy('timestamp', 'desc')
            .limit(signalLimit + 1)
            .get();
        readObserver?.record({
            source: DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS,
            window: 'utc_today',
            documentsReturned: signalsSnap.size,
            queryLimit: signalLimit + 1,
            saturated: signalsSnap.size > signalLimit,
        });

        if (signalsSnap.size > signalLimit) {
            throw new Error(`Daily signal evidence exceeded the complete-window limit of ${signalLimit}.`);
        }

        const entitySignals = new Map<string, EntitySignalCounts>();

        for (const doc of signalsSnap.docs) {
            const data = doc.data();
            if (data.pId !== 'AL' || data.tId !== tId || data.sId !== sId) {
                throw new Error('Daily signal evidence contained an invalid Answerlattice scope.');
            }
            const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(data.entityId);
            if (!entityId) continue;

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

        const missesSnap = await db
            .collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('canonical', '==', false)
            .where('createdOn', '>=', dayStartTimestamp)
            .orderBy('createdOn', 'desc')
            .limit(missLimit + 1)
            .get();
        readObserver?.record({
            source: DB_COLLECTIONS.AI_SEARCH_HISTORY,
            window: 'utc_today_canonical_misses',
            documentsReturned: missesSnap.size,
            queryLimit: missLimit + 1,
            saturated: missesSnap.size > missLimit,
        });

        if (missesSnap.size > missLimit) {
            throw new Error(`Daily canonical misses exceeded the complete-window limit of ${missLimit}.`);
        }

        for (const doc of missesSnap.docs) {
            const data = doc.data();
            if (data.pId !== 'AL' || data.tId !== tId || data.sId !== sId) continue;
            const matchedEntityIds = Array.isArray(data.matchedEntityIds) ? data.matchedEntityIds : [];
            for (const rawEntityId of matchedEntityIds) {
                const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(rawEntityId);
                if (entityId) {
                    entityMissCounts.set(entityId, (entityMissCounts.get(entityId) || 0) + 1);
                }
            }
        }

        // ─── Step 3: Denormalize entity names + write daily stats ───
        const allEntityIds = new Set([...entitySignals.keys(), ...entityMissCounts.keys()]);
        // Fetch entity names/types in bulk
        const entityNameMap = new Map<string, { name: string; type: string }>();
        const entityIdsArray = Array.from(allEntityIds);

        // Firestore batched get avoids scanning every entity doc for each chunk.
        for (let i = 0; i < entityIdsArray.length; i += 30) {
            const batch = entityIdsArray.slice(i, i + 30);
            const refs = batch.map(entityId => db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(entityId));
            const entityDocs = await db.getAll(...refs);
            readObserver?.record({
                source: DB_COLLECTIONS.ANSWERLATTICE_ENTITIES,
                window: 'by_id',
                documentsReturned: entityDocs.filter(document => document.exists).length,
                queryLimit: refs.length,
            });

            for (const doc of entityDocs) {
                if (!doc.exists) continue;
                const data = doc.data();
                if (data?.pId !== 'AL' || data?.tId !== tId || data?.sId !== sId || data?.status !== 'active') continue;
                entityNameMap.set(doc.id, { name: data.name || doc.id, type: data.type || 'feature' });
            }
        }

        const dailyStats: EntityDailyStat[] = [];

        for (const entityId of allEntityIds) {
            const signals = entitySignals.get(entityId) || {
                entityId, ticketCount: 0, chatNegativeCount: 0, escalationCount: 0, queryCount: 0,
            };
            const lowConfidenceCount = entityMissCounts.get(entityId) || 0;
            const entityInfo = entityNameMap.get(entityId);
            if (!entityInfo) {
                result.unmappedEvidenceCount += signals.queryCount + lowConfidenceCount;
                continue;
            }

            const frictionScore = calculateAnswerlatticeFrictionLoad(
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

        // Write daily stats in bounded batches (set with merge = idempotent).
        for (let offset = 0; offset < dailyStats.length; offset += 400) {
            const writeBatch = db.batch();
            const chunk = dailyStats.slice(offset, offset + 400);
            for (const stat of chunk) {
                const docId = `${tId}_${sId}_${stat.entityId}_${today}`;
                const ref = db.collection(DB_COLLECTIONS.ANSWERLATTICE_FRICTION_DAILY_STATS).doc(docId);
                writeBatch.set(ref, {
                    pId: 'AL',
                    tId,
                    sId,
                    schemaVersion: ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
                    ...stat,
                    createdOn: Timestamp.now(),
                }, { merge: true });
            }
            await writeBatch.commit();
            result.dailyStatsWritten += chunk.length;
        }

        result.entitiesProcessed = dailyStats.length;

        // ─── Step 4: Compute 7d snapshot with trends ───
        const historicalSnap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_FRICTION_DAILY_STATS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('date', '>=', windows.previousStart)
            .where('date', '<=', windows.currentEnd)
            .orderBy('date', 'desc')
            .limit(historyLimit + 1)
            .get();
        readObserver?.record({
            source: DB_COLLECTIONS.ANSWERLATTICE_FRICTION_DAILY_STATS,
            window: 'rolling_14d',
            documentsReturned: historicalSnap.size,
            queryLimit: historyLimit + 1,
            saturated: historicalSnap.size > historyLimit,
        });

        if (historicalSnap.size > historyLimit) {
            throw new Error(`Friction history exceeded the complete-window limit of ${historyLimit}.`);
        }

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
            if (data.tId !== tId || data.sId !== sId || (data.pId !== undefined && data.pId !== 'AL')) {
                throw new Error('Friction history contained an invalid Answerlattice scope.');
            }
            if (data.pId !== 'AL' || data.schemaVersion !== ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION) {
                result.legacyDailyStatCount++;
            }
            const eid = normalizeAnswerlatticeResolvedFunctionEntityId(data.entityId);
            if (!eid) continue;

            const agg = entityAgg.get(eid) || {
                entityName: data.entityName || eid,
                entityType: data.entityType || 'feature',
                last7d: { queryCount: 0, escalationCount: 0, lowConfidenceCount: 0, frictionScore: 0 },
                previous7d: { queryCount: 0, frictionScore: 0 },
                firstSeenDate: data.date,
            };

            if (data.date >= windows.currentStart && data.date <= windows.currentEnd) {
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
        const allEntitySummaries: FrictionEntitySummary[] = Array.from(entityAgg.entries())
            .map(([entityId, agg]) => {
                const trend = detectAnswerlatticeFrictionTrend(agg.last7d.frictionScore, agg.previous7d.frictionScore);
                return {
                    entityId,
                    entityName: agg.entityName,
                    entityType: agg.entityType,
                    last7d: agg.last7d,
                    previous7d: agg.previous7d,
                    trendDirection: trend.direction,
                    trendScore: trend.ratio,
                };
            })
            .filter(e => e.last7d.queryCount > 0)
            .sort((a, b) => b.last7d.frictionScore - a.last7d.frictionScore);
        const topEntities = allEntitySummaries.slice(0, 10);

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

        const totalFrictionScore = allEntitySummaries.reduce((sum, e) => sum + e.last7d.frictionScore, 0);
        const frictionLevel = classifyAnswerlatticeFrictionLevel(totalFrictionScore);
        const totalSignals7d = allEntitySummaries.reduce((sum, e) => sum + e.last7d.queryCount, 0);
        const totalEscalations7d = allEntitySummaries.reduce((sum, e) => sum + e.last7d.escalationCount, 0);

        // ─── Step 6: Write frictionSnapshot to platformSummary ───
        await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`frictionSnapshot_${tId}_${sId}`).set({
            pId: 'AL',
            tId,
            sId,
            schemaVersion: ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
            lastUpdated: Timestamp.now(),
            window: {
                kind: ANSWERLATTICE_SUPPORT_METRIC_WINDOWS.UTC_CALENDAR_7_DAYS,
                startAt: Timestamp.fromDate(new Date(`${windows.currentStart}T00:00:00.000Z`)),
                endAt: Timestamp.fromDate(new Date(`${windows.currentEnd}T23:59:59.999Z`)),
                complete: true,
                sourceLimit: historyLimit,
                observedCount: historicalSnap.size,
                currentStartDate: windows.currentStart,
                currentEndDate: windows.currentEnd,
                previousStartDate: windows.previousStart,
                previousEndDate: windows.previousEnd,
            },
            topFrictionEntities: topEntities,
            emergingTopics: emerging,
            frictionLevel,
            totalWeightedLoad: Math.round(totalFrictionScore * 100) / 100,
            // Compatibility alias; this is a volume-sensitive friction level, not product health.
            overallHealth: frictionLevel,
            totalSignals7d,
            totalEscalations7d,
            unmappedEvidenceCount: result.unmappedEvidenceCount,
            legacyDailyStatCount: result.legacyDailyStatCount,
        }, { merge: true });

        result.snapshotWritten = true;
        result.topEntityCount = topEntities.length;
        result.emergingCount = emerging.length;
        result.overallHealth = frictionLevel;

    } catch (error) {
        logger.error('[Answerlattice Friction] Aggregation failed', {
            failureCode: ANSWERLATTICE_FRICTION_AGGREGATION_FAILED,
            ...getFrictionAggregationScopeContext(tId, sId),
            ...getFrictionAggregationSourceErrorContext(error),
        });
        throw error;
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// DAILY STATS CLEANUP (90-day retention)
// ═══════════════════════════════════════════════════════════════

export async function cleanupExpiredFrictionStats(tId: number, sId: number, retentionDays: number = 90, batchLimit: number = 100): Promise<{ cleaned: number }> {
    const result = { cleaned: 0 };

    if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE) return result;

    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        const snapshot = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_FRICTION_DAILY_STATS)
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
        logger.error('[Answerlattice Friction] Stats cleanup failed', {
            failureCode: ANSWERLATTICE_FRICTION_STATS_CLEANUP_FAILED,
            ...getFrictionAggregationScopeContext(tId, sId),
            retentionDays,
            batchLimit,
            ...getFrictionAggregationSourceErrorContext(error),
        });
    }

    return result;
}
