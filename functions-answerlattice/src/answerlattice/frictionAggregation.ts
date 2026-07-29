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
    type AnswerlatticeFrictionEvidenceComponents,
    calculateAnswerlatticeFrictionLoad,
    classifyAnswerlatticeFrictionLevel,
    detectAnswerlatticeFrictionTrend,
    getAnswerlatticeUtcFrictionWindows,
    isAnswerlatticeDateKey,
} from '../sharedData/answerlatticeSupportMetrics';
import { normalizeAnswerlatticeResolvedFunctionEntityId } from './entityIdBoundary';
import { type AnswerlatticeSchedulerReadObserver } from './schedulerReadTelemetry';

const ANSWERLATTICE_FRICTION_AGGREGATION_FAILED = 'ANSWERLATTICE_FRICTION_AGGREGATION_FAILED';
const ANSWERLATTICE_FRICTION_STATS_CLEANUP_FAILED = 'ANSWERLATTICE_FRICTION_STATS_CLEANUP_FAILED';
const ANSWERLATTICE_FRICTION_INVALID_INPUT = 'ANSWERLATTICE_FRICTION_INVALID_INPUT';
const MAX_FRICTION_METRIC = 1_000_000;

function getSafeFrictionErrorField(source: Record<string, unknown>, field: string): unknown {
    try {
        return source[field];
    } catch {
        return undefined;
    }
}

function normalizeFrictionDiagnosticText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return normalized ? normalized.slice(0, 80) : null;
}

function getFrictionAggregationSourceErrorContext(error: unknown): {
    sourceErrorName: string | null;
    sourceErrorCode: string | number | null;
    sourceStatusCode: number | null;
} {
    const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    const rawStatus = getSafeFrictionErrorField(source, 'status');
    const rawStatusCode = getSafeFrictionErrorField(source, 'statusCode');
    const statusCandidate = typeof rawStatus === 'number' ? rawStatus : rawStatusCode;
    const sourceStatusCode = typeof statusCandidate === 'number'
        && Number.isSafeInteger(statusCandidate)
        && statusCandidate >= 100
        && statusCandidate <= 599
        ? statusCandidate
        : null;
    const rawCode = getSafeFrictionErrorField(source, 'code');

    return {
        sourceErrorName: normalizeFrictionDiagnosticText(getSafeFrictionErrorField(source, 'name')),
        sourceErrorCode: typeof rawCode === 'number' && Number.isSafeInteger(rawCode)
            ? rawCode
            : normalizeFrictionDiagnosticText(rawCode),
        sourceStatusCode,
    };
}

function getFrictionAggregationScopeContext(tId?: number, sId?: number): {
    hasTenantScope: boolean;
    hasStoreScope: boolean;
} {
    return {
        hasTenantScope: typeof tId === 'number' && Number.isSafeInteger(tId) && tId > 0,
        hasStoreScope: typeof sId === 'number' && Number.isSafeInteger(sId) && sId > 0,
    };
}

function hasExactFrictionScope(tId: number, sId: number): boolean {
    return Number.isSafeInteger(tId) && tId > 0 && Number.isSafeInteger(sId) && sId > 0;
}

function normalizeFrictionText(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeFrictionCount(value: unknown): number | null {
    return typeof value === 'number'
        && Number.isSafeInteger(value)
        && value >= 0
        && value <= MAX_FRICTION_METRIC
        ? value
        : null;
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

export interface NormalizedFrictionDailyStat extends EntityDailyStat {
    legacy: boolean;
}

export function normalizeFrictionDailyStat(
    value: unknown,
    tId: number,
    sId: number,
): NormalizedFrictionDailyStat | null {
    if (!hasExactFrictionScope(tId, sId) || !value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (record.pId !== 'AL' || record.tId !== tId || record.sId !== sId) return null;
    const schemaVersion = record.schemaVersion;
    const legacy = schemaVersion !== ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION;
    if (
        legacy
        && schemaVersion !== undefined
        && (!Number.isSafeInteger(schemaVersion) || typeof schemaVersion !== 'number' || schemaVersion < 1 || schemaVersion >= ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION)
    ) return null;

    const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(record.entityId);
    const entityName = normalizeFrictionText(record.entityName, 300);
    const entityType = normalizeFrictionText(record.entityType, 80);
    const date = isAnswerlatticeDateKey(record.date) ? record.date : null;
    const queryCount = normalizeFrictionCount(record.queryCount);
    const ticketCount = normalizeFrictionCount(record.ticketCount);
    const chatNegativeCount = normalizeFrictionCount(record.chatNegativeCount);
    const escalationCount = normalizeFrictionCount(record.escalationCount);
    const lowConfidenceCount = normalizeFrictionCount(record.lowConfidenceCount);
    if (
        !entityId
        || !entityName
        || !entityType
        || !date
        || queryCount === null
        || ticketCount === null
        || chatNegativeCount === null
        || escalationCount === null
        || lowConfidenceCount === null
        || ticketCount + chatNegativeCount + escalationCount > queryCount
        || lowConfidenceCount > queryCount
    ) return null;

    return {
        entityId,
        entityName,
        entityType,
        date,
        queryCount,
        ticketCount,
        chatNegativeCount,
        escalationCount,
        lowConfidenceCount,
        frictionScore: calculateAnswerlatticeFrictionLoad(queryCount, escalationCount, lowConfidenceCount),
        legacy,
    };
}

interface FrictionEntitySummary {
    entityId: string;
    entityName: string;
    entityType: string;
    last7d: {
        queryCount: number;
        lowConfidenceCount: number;
        frictionScore: number;
    } & AnswerlatticeFrictionEvidenceComponents;
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
    now: Date = new Date(),
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
    if (!hasExactFrictionScope(tId, sId) || !(now instanceof Date) || !Number.isFinite(now.getTime())) {
        throw new Error(ANSWERLATTICE_FRICTION_INVALID_INPUT);
    }

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
            .where('pId', '==', 'AL')
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
            if (matchedEntityIds.length > 50) {
                throw new Error('Canonical-miss entity evidence exceeded the supported boundary.');
            }
            const normalizedMatchedEntityIds = new Set<string>();
            for (const rawEntityId of matchedEntityIds) {
                const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(rawEntityId);
                if (entityId) normalizedMatchedEntityIds.add(entityId);
            }
            for (const entityId of normalizedMatchedEntityIds) {
                entityMissCounts.set(entityId, (entityMissCounts.get(entityId) || 0) + 1);
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
                const name = data.name === undefined
                    ? normalizeFrictionText(doc.id, 300)
                    : normalizeFrictionText(data.name, 300);
                const type = data.type === undefined
                    ? 'feature'
                    : normalizeFrictionText(data.type, 80);
                if (!name || !type) throw new Error('Friction entity metadata was malformed.');
                entityNameMap.set(doc.id, { name, type });
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
                });
            }
            await writeBatch.commit();
            result.dailyStatsWritten += chunk.length;
        }

        result.entitiesProcessed = dailyStats.length;

        // ─── Step 4: Compute 7d snapshot with trends ───
        const historicalSnap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_FRICTION_DAILY_STATS)
            .where('pId', '==', 'AL')
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
            last7d: {
                queryCount: number;
                ticketCount: number;
                chatNegativeCount: number;
                escalationCount: number;
                canonicalMissCount: number;
                lowConfidenceCount: number;
                frictionScore: number;
            };
            previous7d: { queryCount: number; frictionScore: number };
            firstSeenDate: string;
        }>();

        const seenDailyStats = new Set<string>();
        for (const doc of historicalSnap.docs) {
            const stat = normalizeFrictionDailyStat(doc.data(), tId, sId);
            if (!stat) throw new Error('Friction history contained an invalid Answerlattice row.');
            const dailyIdentity = `${stat.entityId}:${stat.date}`;
            if (seenDailyStats.has(dailyIdentity)) {
                throw new Error('Friction history contained duplicate entity/day truth.');
            }
            seenDailyStats.add(dailyIdentity);
            if (stat.legacy) result.legacyDailyStatCount++;

            const agg = entityAgg.get(stat.entityId) || {
                entityName: stat.entityName,
                entityType: stat.entityType,
                last7d: {
                    queryCount: 0,
                    ticketCount: 0,
                    chatNegativeCount: 0,
                    escalationCount: 0,
                    canonicalMissCount: 0,
                    lowConfidenceCount: 0,
                    frictionScore: 0,
                },
                previous7d: { queryCount: 0, frictionScore: 0 },
                firstSeenDate: stat.date,
            };

            if (stat.date >= windows.currentStart && stat.date <= windows.currentEnd) {
                agg.last7d.queryCount += stat.queryCount;
                agg.last7d.ticketCount += stat.ticketCount;
                agg.last7d.chatNegativeCount += stat.chatNegativeCount;
                agg.last7d.escalationCount += stat.escalationCount;
                agg.last7d.canonicalMissCount += stat.lowConfidenceCount;
                agg.last7d.lowConfidenceCount += stat.lowConfidenceCount;
                agg.last7d.frictionScore += stat.frictionScore;
            } else {
                agg.previous7d.queryCount += stat.queryCount;
                agg.previous7d.frictionScore += stat.frictionScore;
            }

            if (stat.date < agg.firstSeenDate) agg.firstSeenDate = stat.date;

            entityAgg.set(stat.entityId, agg);
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
        });

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

export async function cleanupExpiredFrictionStats(
    tId: number,
    sId: number,
    retentionDays: number = 90,
    batchLimit: number = 100,
    now: Date = new Date(),
): Promise<{ cleaned: number }> {
    const result = { cleaned: 0 };

    if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE) return result;

    try {
        if (
            !hasExactFrictionScope(tId, sId)
            || !Number.isSafeInteger(retentionDays)
            || retentionDays < 1
            || retentionDays > 3_650
            || !Number.isSafeInteger(batchLimit)
            || batchLimit < 1
            || batchLimit > 500
            || !(now instanceof Date)
            || !Number.isFinite(now.getTime())
        ) throw new Error(ANSWERLATTICE_FRICTION_INVALID_INPUT);

        const cutoffDate = new Date(now.getTime());
        cutoffDate.setUTCDate(cutoffDate.getUTCDate() - retentionDays);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        const snapshot = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_FRICTION_DAILY_STATS)
            .where('pId', '==', 'AL')
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('date', '<', cutoffStr)
            .orderBy('date', 'asc')
            .limit(batchLimit)
            .get();

        if (snapshot.empty) return result;

        const batch = db.batch();
        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (data.pId !== 'AL' || data.tId !== tId || data.sId !== sId || !isAnswerlatticeDateKey(data.date) || data.date >= cutoffStr) {
                throw new Error('Friction cleanup query returned invalid scope/date truth.');
            }
            batch.delete(doc.ref);
        }
        await batch.commit();
        result.cleaned = snapshot.size;
    } catch (error) {
        logger.error('[Answerlattice Friction] Stats cleanup failed', {
            failureCode: ANSWERLATTICE_FRICTION_STATS_CLEANUP_FAILED,
            ...getFrictionAggregationScopeContext(tId, sId),
            validRetentionDays: Number.isSafeInteger(retentionDays) && retentionDays >= 1 && retentionDays <= 3_650,
            validBatchLimit: Number.isSafeInteger(batchLimit) && batchLimit >= 1 && batchLimit <= 500,
            ...getFrictionAggregationSourceErrorContext(error),
        });
        throw new Error(ANSWERLATTICE_FRICTION_STATS_CLEANUP_FAILED);
    }

    return result;
}
