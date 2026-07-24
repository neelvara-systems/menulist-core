import {
    ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
    ANSWERLATTICE_SUPPORT_METRIC_WINDOWS,
    isAnswerlatticeDateKey,
} from '@data/shared/answerlatticeSupportMetrics';
import { Timestamp } from 'firebase/firestore';
import { normalizeAnswerlatticeResolvedEntityId } from '@lib/answerlattice/governanceIdBoundary';
import type {
    AnswerlatticeFrictionInsight,
    AnswerlatticeFrictionSnapshot,
    AnswerlatticeSupportMetricWindow,
    AnswerlatticeTrustMetrics,
} from '@type/answerlattice';

export type AnswerlatticeCoverageData = {
    pId: 'AL';
    tId: number;
    sId: number;
    schemaVersion: number;
    lastUpdated: Timestamp;
    window: AnswerlatticeSupportMetricWindow;
    coverage: {
        date: string;
        hits: number;
        misses: number;
        rate: number;
        total: number;
    };
};

export type AnswerlatticeWeeklySummary = {
    weekStart: string;
    weekEnd: string;
    narrative: string;
    highlights: string[];
    recommendations: string[];
    keyMetrics: {
        volumeChangePercent: number | null;
        positiveFeedbackSharePointChange: number | null;
        topCategory: string;
    };
    sourceCompleteness: {
        currentDays: number | null;
        previousDays: number | null;
        currentWeekComplete: boolean;
        comparisonComplete: boolean;
    };
    generatedAt: string;
    generationMode: 'deterministic';
};

export type AnswerlatticeWeeklySummaryFreshness = {
    state: 'current' | 'stale' | 'future';
    ageDays: number;
};

export type AnswerlatticeFeedbackTheme = {
    theme: string;
    count: number;
    severity: 'low' | 'medium' | 'high';
    examples: string[];
    suggestedActions: string[];
};

export type AnswerlatticeFeedbackIntelligence = {
    date: string;
    themes: AnswerlatticeFeedbackTheme[];
    summary: string;
    topIssues: string[];
    recommendations: string[];
    generatedAt: string;
};

export type AnswerlatticeCompletedWeeklyWindows = {
    weekStart: string;
    weekEnd: string;
    previousWeekStart: string;
    previousWeekEnd: string;
};

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SEVERITIES = new Set(['low', 'medium', 'high']);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeDateKey = (value: unknown): string | null => {
    if (typeof value !== 'string' || !DATE_KEY_PATTERN.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
        ? value
        : null;
};

const shiftUtcDateKey = (dateKey: string, days: number): string => {
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
};

export function getAnswerlatticeCompletedWeeklyWindows(
    now: Date = new Date(),
    days = 7,
): AnswerlatticeCompletedWeeklyWindows | null {
    if (
        !(now instanceof Date)
        || !Number.isFinite(now.getTime())
        || !Number.isSafeInteger(days)
        || days < 1
        || days > 31
    ) return null;

    const today = now.toISOString().slice(0, 10);
    const weekEnd = shiftUtcDateKey(today, -1);
    const weekStart = shiftUtcDateKey(weekEnd, -(days - 1));
    const previousWeekEnd = shiftUtcDateKey(weekStart, -1);
    const previousWeekStart = shiftUtcDateKey(previousWeekEnd, -(days - 1));
    return { weekStart, weekEnd, previousWeekStart, previousWeekEnd };
}

const normalizeText = (value: unknown, maxLength: number): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return normalized ? normalized.slice(0, maxLength) : null;
};

const normalizeTextArray = (
    value: unknown,
    maxItems: number,
    maxLength: number,
): string[] | null => {
    if (!Array.isArray(value) || value.length > maxItems) return null;
    const normalized = value.map((entry) => normalizeText(entry, maxLength));
    return normalized.some((entry) => !entry) ? null : normalized as string[];
};

const normalizeFiniteMetric = (value: unknown): number | null => (
    typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1_000_000
        ? value
        : null
);

const normalizeNonNegativeInteger = (value: unknown): number | null => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000
        ? value
        : null
);

const normalizePercentage = (value: unknown): number | null => (
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
        ? value
        : null
);

const calculateRoundedPercentage = (numerator: number, denominator: number): number => (
    denominator > 0 ? Math.round((numerator / denominator) * 100) : 0
);

const normalizeFirestoreTimestamp = (value: unknown): Timestamp | null => {
    if (value instanceof Timestamp) {
        try {
            return Number.isFinite(value.toMillis()) ? value : null;
        } catch {
            return null;
        }
    }
    if (value instanceof Date) {
        try {
            return Number.isFinite(value.getTime()) ? Timestamp.fromDate(value) : null;
        } catch {
            return null;
        }
    }
    if (!isRecord(value)) return null;

    if (typeof value.toDate === 'function') {
        try {
            const date = (value.toDate as () => unknown)();
            return date instanceof Date && Number.isFinite(date.getTime()) ? Timestamp.fromDate(date) : null;
        } catch {
            return null;
        }
    }

    const seconds = value.seconds;
    const nanoseconds = value.nanoseconds ?? 0;
    if (
        typeof seconds !== 'number'
        || !Number.isSafeInteger(seconds)
        || typeof nanoseconds !== 'number'
        || !Number.isSafeInteger(nanoseconds)
        || nanoseconds < 0
        || nanoseconds > 999_999_999
    ) return null;
    try {
        const timestamp = new Timestamp(seconds, nanoseconds);
        return Number.isFinite(timestamp.toMillis()) ? timestamp : null;
    } catch {
        return null;
    }
};

const normalizeTimestampIso = (value: unknown): string | null => {
    const timestamp = normalizeFirestoreTimestamp(value);
    if (!timestamp) return null;
    try {
        return timestamp.toDate().toISOString();
    } catch {
        return null;
    }
};

const hasExpectedScope = (
    value: Record<string, unknown>,
    scope: { tenantId: number; storeId: number },
): boolean => (
    value.pId === 'AL'
    && String(value.tId ?? '') === String(scope.tenantId)
    && String(value.sId ?? '') === String(scope.storeId)
);

const parseMetricWindow = (
    value: unknown,
    expectedKind: AnswerlatticeSupportMetricWindow['kind'],
): AnswerlatticeSupportMetricWindow | null => {
    if (!isRecord(value) || value.kind !== expectedKind || value.complete !== true) return null;
    const startAt = normalizeFirestoreTimestamp(value.startAt);
    const endAt = normalizeFirestoreTimestamp(value.endAt);
    const sourceLimit = normalizeNonNegativeInteger(value.sourceLimit);
    const observedCount = normalizeNonNegativeInteger(value.observedCount);
    if (
        !startAt
        || !endAt
        || startAt.toMillis() >= endAt.toMillis()
        || sourceLimit === null
        || sourceLimit < 1
        || observedCount === null
        || observedCount > sourceLimit
    ) return null;

    if (expectedKind === ANSWERLATTICE_SUPPORT_METRIC_WINDOWS.UTC_CALENDAR_7_DAYS) {
        const currentStartDate = normalizeDateKey(value.currentStartDate);
        const currentEndDate = normalizeDateKey(value.currentEndDate);
        const previousStartDate = normalizeDateKey(value.previousStartDate);
        const previousEndDate = normalizeDateKey(value.previousEndDate);
        if (
            !currentStartDate
            || !currentEndDate
            || !previousStartDate
            || !previousEndDate
            || shiftUtcDateKey(currentStartDate, 6) !== currentEndDate
            || shiftUtcDateKey(previousStartDate, 6) !== previousEndDate
            || shiftUtcDateKey(previousEndDate, 1) !== currentStartDate
            || startAt.toDate().toISOString().slice(0, 10) !== currentStartDate
            || endAt.toDate().toISOString().slice(0, 10) !== currentEndDate
        ) return null;
        return {
            kind: ANSWERLATTICE_SUPPORT_METRIC_WINDOWS.UTC_CALENDAR_7_DAYS,
            startAt,
            endAt,
            complete: true,
            sourceLimit,
            observedCount,
            currentStartDate,
            currentEndDate,
            previousStartDate,
            previousEndDate,
        };
    }

    return {
        kind: ANSWERLATTICE_SUPPORT_METRIC_WINDOWS.ROLLING_24_HOURS,
        startAt,
        endAt,
        complete: true,
        sourceLimit,
        observedCount,
    };
};

const hasCurrentMetricsSchema = (
    value: Record<string, unknown>,
    scope: { tenantId: number; storeId: number },
): boolean => (
    value.pId === 'AL'
    && value.tId === scope.tenantId
    && value.sId === scope.storeId
    && value.schemaVersion === ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION
    && Boolean(normalizeTimestampIso(value.lastUpdated))
);

const hasCountMetric = (value: unknown, fields: string[]): boolean => {
    if (!isRecord(value)) return false;
    return fields.every((field) => normalizeNonNegativeInteger(value[field]) !== null);
};

export function parseAnswerlatticeCoverageData(
    value: unknown,
    scope: { tenantId: number; storeId: number },
): AnswerlatticeCoverageData | null {
    if (!isRecord(value) || !hasCurrentMetricsSchema(value, scope)) return null;
    const window = parseMetricWindow(value.window, ANSWERLATTICE_SUPPORT_METRIC_WINDOWS.ROLLING_24_HOURS);
    const lastUpdated = normalizeFirestoreTimestamp(value.lastUpdated);
    if (!window || !lastUpdated || !isRecord(value.coverage)) return null;
    const hits = normalizeNonNegativeInteger(value.coverage.hits);
    const misses = normalizeNonNegativeInteger(value.coverage.misses);
    const total = normalizeNonNegativeInteger(value.coverage.total);
    const rate = normalizePercentage(value.coverage.rate);
    if (
        !isAnswerlatticeDateKey(value.coverage.date)
        || hits === null
        || misses === null
        || total === null
        || rate === null
        || hits + misses !== total
        || total !== window.observedCount
        || rate !== calculateRoundedPercentage(hits, total)
    ) return null;

    return {
        pId: 'AL',
        tId: scope.tenantId,
        sId: scope.storeId,
        schemaVersion: ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
        lastUpdated,
        window,
        coverage: {
            date: value.coverage.date,
            hits,
            misses,
            rate,
            total,
        },
    };
}

export function parseAnswerlatticeTrustMetrics(
    value: unknown,
    scope: { tenantId: number; storeId: number },
): AnswerlatticeTrustMetrics | null {
    if (!isRecord(value) || !hasCurrentMetricsSchema(value, scope)) return null;
    const window = parseMetricWindow(value.window, ANSWERLATTICE_SUPPORT_METRIC_WINDOWS.ROLLING_24_HOURS);
    const lastUpdated = normalizeFirestoreTimestamp(value.lastUpdated);
    if (
        !window
        || !lastUpdated
        || !isAnswerlatticeDateKey(value.date)
        || !isRecord(value.coverage)
        || !isRecord(value.nonEscalation)
        || !isRecord(value.drift)
        || !isRecord(value.entityAnswerCoverage)
        || !isRecord(value.sourceCompleteness)
        || value.sourceCompleteness.complete !== true
        || !Array.isArray(value.topFailingEntities)
        || value.topFailingEntities.length > 5
        || !isRecord(value.escalationBreakdown)
    ) return null;

    const percentageFields = [
        value.coverage.rate,
        value.coverage.previousRate,
        value.nonEscalation.rate,
        value.nonEscalation.previousRate,
        value.drift.rate,
        value.drift.previousRate,
        value.entityAnswerCoverage.rate,
        value.entityAnswerCoverage.previousRate,
    ];
    if (percentageFields.some((entry) => normalizePercentage(entry) === null)) return null;
    if (!hasCountMetric(value.coverage, ['hits', 'misses', 'total'])) return null;
    if (!hasCountMetric(value.nonEscalation, ['withoutEscalation', 'escalated', 'total'])) return null;
    if (!hasCountMetric(value.drift, ['driftedCount', 'activeCount'])) return null;
    if (!hasCountMetric(value.entityAnswerCoverage, ['coveredCount', 'uncoveredCount', 'driftedCoveredCount', 'totalEntities'])) return null;
    if (!hasCountMetric(value.sourceCompleteness, ['activeAnswers', 'activeEntities', 'signalEvents', 'searchHistory'])) return null;
    if (
        Number(value.coverage.hits) + Number(value.coverage.misses) !== Number(value.coverage.total)
        || Number(value.coverage.total) !== window.observedCount
        || Number(value.coverage.rate) !== calculateRoundedPercentage(
            Number(value.coverage.hits),
            Number(value.coverage.total),
        )
        || Number(value.nonEscalation.withoutEscalation) + Number(value.nonEscalation.escalated) !== Number(value.nonEscalation.total)
        || Number(value.nonEscalation.total) !== Number(value.coverage.total)
        || Number(value.nonEscalation.rate) !== calculateRoundedPercentage(
            Number(value.nonEscalation.withoutEscalation),
            Number(value.nonEscalation.total),
        )
        || Number(value.drift.driftedCount) > Number(value.drift.activeCount)
        || Number(value.drift.rate) !== calculateRoundedPercentage(
            Number(value.drift.driftedCount),
            Number(value.drift.activeCount),
        )
        || Number(value.entityAnswerCoverage.coveredCount) + Number(value.entityAnswerCoverage.uncoveredCount) !== Number(value.entityAnswerCoverage.totalEntities)
        || Number(value.entityAnswerCoverage.driftedCoveredCount) > Number(value.entityAnswerCoverage.coveredCount)
        || Number(value.entityAnswerCoverage.rate) !== calculateRoundedPercentage(
            Number(value.entityAnswerCoverage.coveredCount),
            Number(value.entityAnswerCoverage.totalEntities),
        )
        || Number(value.sourceCompleteness.activeAnswers) !== Number(value.drift.activeCount)
        || Number(value.sourceCompleteness.activeEntities) !== Number(value.entityAnswerCoverage.totalEntities)
        || Number(value.sourceCompleteness.searchHistory) !== window.observedCount
    ) return null;

    const escalationFields = ['knowledgeGap', 'lowConfidence', 'entityMismatch', 'retrievalFailure', 'userRequested', 'total'];
    if (!hasCountMetric(value.escalationBreakdown, escalationFields)) return null;
    if (
        Number(value.escalationBreakdown.knowledgeGap)
        + Number(value.escalationBreakdown.lowConfidence)
        + Number(value.escalationBreakdown.entityMismatch)
        + Number(value.escalationBreakdown.retrievalFailure)
        !== Number(value.escalationBreakdown.total)
    ) return null;

    const topFailingEntities: AnswerlatticeTrustMetrics['topFailingEntities'] = [];
    const seenEntityIds = new Set<string>();
    let previousWeightedLoad = Number.POSITIVE_INFINITY;
    for (const entry of value.topFailingEntities) {
        if (!isRecord(entry)) return null;
        const entityId = normalizeAnswerlatticeResolvedEntityId(entry.entityId);
        const entityName = normalizeText(entry.entityName, 300);
        const entityType = normalizeText(entry.entityType, 80);
        const queryCount = normalizeNonNegativeInteger(entry.queryCount);
        const escalationCount = normalizeNonNegativeInteger(entry.escalationCount);
        const reliabilityScore = normalizePercentage(entry.reliabilityScore);
        const failureScore = normalizeFiniteMetric(entry.failureScore);
        const evidenceCount = normalizeNonNegativeInteger(entry.evidenceCount);
        const negativeFeedbackCount = normalizeNonNegativeInteger(entry.negativeFeedbackCount);
        const canonicalMissCount = normalizeNonNegativeInteger(entry.canonicalMissCount);
        const weightedLoad = normalizeFiniteMetric(entry.weightedLoad);
        if (
            !entityId
            || !entityName
            || !entityType
            || seenEntityIds.has(entityId)
            || queryCount === null
            || escalationCount === null
            || escalationCount > queryCount
            || reliabilityScore === null
            || failureScore === null
            || failureScore < 0
            || evidenceCount === null
            || negativeFeedbackCount === null
            || canonicalMissCount === null
            || weightedLoad === null
            || weightedLoad < 0
            || weightedLoad > previousWeightedLoad
        ) return null;
        seenEntityIds.add(entityId);
        previousWeightedLoad = weightedLoad;
        topFailingEntities.push({
            entityId,
            entityName,
            entityType,
            queryCount,
            escalationCount,
            reliabilityScore,
            failureScore,
            evidenceCount,
            negativeFeedbackCount,
            canonicalMissCount,
            weightedLoad,
        });
    }

    let confirmedResolution: AnswerlatticeTrustMetrics['confirmedResolution'];
    if (value.confirmedResolution !== undefined) {
        if (
            !isRecord(value.confirmedResolution)
            || normalizePercentage(value.confirmedResolution.rate) === null
            || normalizePercentage(value.confirmedResolution.previousRate) === null
            || !hasCountMetric(value.confirmedResolution, [
                'confirmedResolved',
                'confirmedNotResolved',
                'explicitOutcomeTotal',
                'recontactEligible',
                'recontactedSameSession',
                'observationWindowHours',
            ])
        ) return null;
        if (
            Number(value.confirmedResolution.confirmedResolved)
            + Number(value.confirmedResolution.confirmedNotResolved)
            !== Number(value.confirmedResolution.explicitOutcomeTotal)
            || Number(value.confirmedResolution.rate) !== calculateRoundedPercentage(
                Number(value.confirmedResolution.confirmedResolved),
                Number(value.confirmedResolution.explicitOutcomeTotal),
            )
            || Number(value.confirmedResolution.recontactedSameSession) > Number(value.confirmedResolution.recontactEligible)
        ) return null;
        confirmedResolution = {
            rate: Number(value.confirmedResolution.rate),
            confirmedResolved: Number(value.confirmedResolution.confirmedResolved),
            confirmedNotResolved: Number(value.confirmedResolution.confirmedNotResolved),
            explicitOutcomeTotal: Number(value.confirmedResolution.explicitOutcomeTotal),
            recontactEligible: Number(value.confirmedResolution.recontactEligible),
            recontactedSameSession: Number(value.confirmedResolution.recontactedSameSession),
            previousRate: Number(value.confirmedResolution.previousRate),
            observationWindowHours: Number(value.confirmedResolution.observationWindowHours),
        };
    }

    const resolution = value.resolution;
    if (
        resolution !== undefined
        && (
            !isRecord(resolution)
            || normalizePercentage(resolution.rate) === null
            || normalizePercentage(resolution.previousRate) === null
            || !hasCountMetric(resolution, ['resolved', 'escalated', 'total'])
            || Number(resolution.resolved) + Number(resolution.escalated) !== Number(resolution.total)
            || Number(resolution.total) !== Number(value.coverage.total)
            || Number(resolution.rate) !== calculateRoundedPercentage(
                Number(resolution.resolved),
                Number(resolution.total),
            )
        )
    ) return null;

    const entityHealth = value.entityHealth;
    if (
        entityHealth !== undefined
        && (
            !isRecord(entityHealth)
            || normalizePercentage(entityHealth.avgScore) === null
            || normalizePercentage(entityHealth.previousAvgScore) === null
            || !hasCountMetric(entityHealth, ['healthyCount', 'attentionCount', 'criticalCount', 'totalEntities'])
            || Number(entityHealth.healthyCount)
                + Number(entityHealth.attentionCount)
                + Number(entityHealth.criticalCount)
                !== Number(entityHealth.totalEntities)
            || Number(entityHealth.totalEntities) !== Number(value.entityAnswerCoverage.totalEntities)
            || Number(entityHealth.avgScore) !== Number(value.entityAnswerCoverage.rate)
        )
    ) return null;

    return {
        pId: 'AL',
        tId: scope.tenantId,
        sId: scope.storeId,
        schemaVersion: ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
        lastUpdated,
        date: value.date,
        window,
        sourceCompleteness: {
            complete: true,
            activeAnswers: Number(value.sourceCompleteness.activeAnswers),
            activeEntities: Number(value.sourceCompleteness.activeEntities),
            signalEvents: Number(value.sourceCompleteness.signalEvents),
            searchHistory: Number(value.sourceCompleteness.searchHistory),
        },
        coverage: {
            rate: Number(value.coverage.rate),
            hits: Number(value.coverage.hits),
            misses: Number(value.coverage.misses),
            total: Number(value.coverage.total),
            previousRate: Number(value.coverage.previousRate),
        },
        ...(isRecord(resolution) ? {
            resolution: {
                rate: Number(resolution.rate),
                resolved: Number(resolution.resolved),
                escalated: Number(resolution.escalated),
                total: Number(resolution.total),
                previousRate: Number(resolution.previousRate),
            },
        } : {}),
        nonEscalation: {
            rate: Number(value.nonEscalation.rate),
            withoutEscalation: Number(value.nonEscalation.withoutEscalation),
            escalated: Number(value.nonEscalation.escalated),
            total: Number(value.nonEscalation.total),
            previousRate: Number(value.nonEscalation.previousRate),
        },
        ...(confirmedResolution ? { confirmedResolution } : {}),
        drift: {
            rate: Number(value.drift.rate),
            driftedCount: Number(value.drift.driftedCount),
            activeCount: Number(value.drift.activeCount),
            previousRate: Number(value.drift.previousRate),
        },
        ...(isRecord(entityHealth) ? {
            entityHealth: {
                avgScore: Number(entityHealth.avgScore),
                healthyCount: Number(entityHealth.healthyCount),
                attentionCount: Number(entityHealth.attentionCount),
                criticalCount: Number(entityHealth.criticalCount),
                totalEntities: Number(entityHealth.totalEntities),
                previousAvgScore: Number(entityHealth.previousAvgScore),
            },
        } : {}),
        entityAnswerCoverage: {
            rate: Number(value.entityAnswerCoverage.rate),
            coveredCount: Number(value.entityAnswerCoverage.coveredCount),
            uncoveredCount: Number(value.entityAnswerCoverage.uncoveredCount),
            driftedCoveredCount: Number(value.entityAnswerCoverage.driftedCoveredCount),
            totalEntities: Number(value.entityAnswerCoverage.totalEntities),
            previousRate: Number(value.entityAnswerCoverage.previousRate),
        },
        topFailingEntities,
        escalationBreakdown: {
            knowledgeGap: Number(value.escalationBreakdown.knowledgeGap),
            lowConfidence: Number(value.escalationBreakdown.lowConfidence),
            entityMismatch: Number(value.escalationBreakdown.entityMismatch),
            retrievalFailure: Number(value.escalationBreakdown.retrievalFailure),
            userRequested: Number(value.escalationBreakdown.userRequested),
            total: Number(value.escalationBreakdown.total),
        },
    };
}

export function parseAnswerlatticeFrictionSnapshot(
    value: unknown,
    scope: { tenantId: number; storeId: number },
): AnswerlatticeFrictionSnapshot | null {
    if (!isRecord(value) || !hasCurrentMetricsSchema(value, scope)) return null;
    const window = parseMetricWindow(value.window, ANSWERLATTICE_SUPPORT_METRIC_WINDOWS.UTC_CALENDAR_7_DAYS);
    const lastUpdated = normalizeFirestoreTimestamp(value.lastUpdated);
    const totalWeightedLoad = normalizeFiniteMetric(value.totalWeightedLoad);
    const totalSignals7d = normalizeNonNegativeInteger(value.totalSignals7d);
    const totalEscalations7d = normalizeNonNegativeInteger(value.totalEscalations7d);
    const unmappedEvidenceCount = normalizeNonNegativeInteger(value.unmappedEvidenceCount);
    const legacyDailyStatCount = normalizeNonNegativeInteger(value.legacyDailyStatCount);
    const frictionLevel = value.frictionLevel;
    if (
        !window
        || !lastUpdated
        || !Array.isArray(value.topFrictionEntities)
        || value.topFrictionEntities.length > 10
        || !Array.isArray(value.emergingTopics)
        || value.emergingTopics.length > 5
        || (frictionLevel !== 'LOW' && frictionLevel !== 'MODERATE' && frictionLevel !== 'HIGH')
        || totalWeightedLoad === null
        || totalWeightedLoad < 0
        || totalSignals7d === null
        || totalEscalations7d === null
        || totalEscalations7d > totalSignals7d
        || unmappedEvidenceCount === null
        || legacyDailyStatCount === null
        || (value.overallHealth !== undefined && value.overallHealth !== frictionLevel)
    ) return null;

    const topFrictionEntities: AnswerlatticeFrictionSnapshot['topFrictionEntities'] = [];
    const seenEntityIds = new Set<string>();
    let priorFrictionLoad = Number.POSITIVE_INFINITY;
    let representedSignalCount = 0;
    let representedEscalationCount = 0;
    let representedFrictionLoad = 0;
    for (const entry of value.topFrictionEntities) {
        if (
            !isRecord(entry)
            || !isRecord(entry.last7d)
            || !isRecord(entry.previous7d)
        ) return null;
        const entityId = normalizeAnswerlatticeResolvedEntityId(entry.entityId);
        const entityName = normalizeText(entry.entityName, 300);
        const entityType = normalizeText(entry.entityType, 80);
        const trendDirection = entry.trendDirection;
        const trendScore = normalizeFiniteMetric(entry.trendScore);
        const currentQueryCount = normalizeNonNegativeInteger(entry.last7d.queryCount);
        const currentEscalationCount = normalizeNonNegativeInteger(entry.last7d.escalationCount);
        const currentLowConfidenceCount = normalizeNonNegativeInteger(entry.last7d.lowConfidenceCount);
        const currentLoad = normalizeFiniteMetric(entry.last7d.frictionScore);
        const previousQueryCount = normalizeNonNegativeInteger(entry.previous7d.queryCount);
        const previousLoad = normalizeFiniteMetric(entry.previous7d.frictionScore);
        if (
            !entityId
            || !entityName
            || !entityType
            || seenEntityIds.has(entityId)
            || (trendDirection !== 'rising' && trendDirection !== 'stable' && trendDirection !== 'improving' && trendDirection !== 'new')
            || trendScore === null
            || trendScore < 0
            || currentQueryCount === null
            || currentEscalationCount === null
            || currentEscalationCount > currentQueryCount
            || currentLowConfidenceCount === null
            || currentLowConfidenceCount > currentQueryCount
            || currentLoad === null
            || currentLoad < 0
            || currentLoad > priorFrictionLoad
            || previousQueryCount === null
            || previousLoad === null
            || previousLoad < 0
        ) return null;
        seenEntityIds.add(entityId);
        priorFrictionLoad = currentLoad;
        representedSignalCount += currentQueryCount;
        representedEscalationCount += currentEscalationCount;
        representedFrictionLoad += currentLoad;
        topFrictionEntities.push({
            entityId,
            entityName,
            entityType,
            last7d: {
                queryCount: currentQueryCount,
                escalationCount: currentEscalationCount,
                lowConfidenceCount: currentLowConfidenceCount,
                frictionScore: currentLoad,
            },
            previous7d: { queryCount: previousQueryCount, frictionScore: previousLoad },
            trendDirection,
            trendScore,
        });
    }
    if (
        representedSignalCount > totalSignals7d
        || representedEscalationCount > totalEscalations7d
        || representedFrictionLoad > totalWeightedLoad + 0.01
    ) return null;

    const emergingTopics: AnswerlatticeFrictionSnapshot['emergingTopics'] = [];
    const seenEmergingIds = new Set<string>();
    const currentWindowEndDate = window.currentEndDate;
    const previousWindowStartDate = window.previousStartDate;
    if (!currentWindowEndDate || !previousWindowStartDate) return null;
    let priorEmergingQueryCount = Number.POSITIVE_INFINITY;
    for (const entry of value.emergingTopics) {
        if (!isRecord(entry)) return null;
        const entityId = normalizeAnswerlatticeResolvedEntityId(entry.entityId);
        const entityName = normalizeText(entry.entityName, 300);
        const entityType = normalizeText(entry.entityType, 80);
        const queryCount = normalizeNonNegativeInteger(entry.queryCount);
        const escalationRate = normalizeFiniteMetric(entry.escalationRate);
        const firstSeenDate = normalizeDateKey(entry.firstSeenDate);
        if (
            !entityId
            || !entityName
            || !entityType
            || seenEmergingIds.has(entityId)
            || queryCount === null
            || escalationRate === null
            || escalationRate < 0
            || escalationRate > 1
            || !firstSeenDate
            || firstSeenDate < previousWindowStartDate
            || firstSeenDate > currentWindowEndDate
            || queryCount > priorEmergingQueryCount
        ) return null;
        seenEmergingIds.add(entityId);
        priorEmergingQueryCount = queryCount;
        emergingTopics.push({ entityId, entityName, entityType, queryCount, escalationRate, firstSeenDate });
    }

    return {
        pId: 'AL',
        tId: scope.tenantId,
        sId: scope.storeId,
        schemaVersion: ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
        lastUpdated,
        window,
        topFrictionEntities,
        emergingTopics,
        frictionLevel,
        totalWeightedLoad,
        ...(value.overallHealth === frictionLevel ? { overallHealth: frictionLevel } : {}),
        totalSignals7d,
        totalEscalations7d,
        unmappedEvidenceCount,
        legacyDailyStatCount,
    };
}

export function parseAnswerlatticeFrictionInsight(
    value: unknown,
    scope: { tenantId: number; storeId: number },
): AnswerlatticeFrictionInsight | null {
    if (!isRecord(value) || !hasCurrentMetricsSchema(value, scope) || value.advisory !== true) return null;
    const lastUpdated = normalizeFirestoreTimestamp(value.lastUpdated);
    const generatedAt = normalizeFirestoreTimestamp(value.generatedAt);
    const sourceSnapshotUpdatedAt = normalizeFirestoreTimestamp(value.sourceSnapshotUpdatedAt);
    const weekStart = normalizeDateKey(value.weekStart);
    const weekEnd = normalizeDateKey(value.weekEnd);
    const summary = normalizeText(value.summary, 2_000);
    const promptVersion = normalizeText(value.promptVersion, 100);
    const frictionLevel = value.frictionLevel;
    if (
        !lastUpdated
        || !generatedAt
        || !sourceSnapshotUpdatedAt
        || generatedAt.toMillis() !== lastUpdated.toMillis()
        || sourceSnapshotUpdatedAt.toMillis() > generatedAt.toMillis()
        || !weekStart
        || !weekEnd
        || shiftUtcDateKey(weekStart, 6) !== weekEnd
        || !summary
        || !promptVersion
        || (frictionLevel !== 'LOW' && frictionLevel !== 'MODERATE' && frictionLevel !== 'HIGH')
        || (value.overallHealth !== undefined && value.overallHealth !== frictionLevel)
        || !Array.isArray(value.suggestedActions)
        || value.suggestedActions.length > 10
    ) return null;

    const suggestedActions: AnswerlatticeFrictionInsight['suggestedActions'] = [];
    const seenEntityIds = new Set<string>();
    for (const entry of value.suggestedActions) {
        if (!isRecord(entry)) return null;
        const entityId = normalizeAnswerlatticeResolvedEntityId(entry.entityId);
        const action = normalizeText(entry.action, 500);
        if (!entityId || !action || seenEntityIds.has(entityId)) return null;
        seenEntityIds.add(entityId);
        suggestedActions.push({ entityId, action });
    }

    return {
        pId: 'AL',
        tId: scope.tenantId,
        sId: scope.storeId,
        schemaVersion: ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
        lastUpdated,
        weekStart,
        weekEnd,
        summary,
        advisory: true,
        sourceSnapshotUpdatedAt,
        suggestedActions,
        frictionLevel,
        ...(value.overallHealth === frictionLevel ? { overallHealth: frictionLevel } : {}),
        promptVersion,
        generatedAt,
    };
}

export function parseAnswerlatticeWeeklySummary(
    value: unknown,
    scope: { tenantId: number; storeId: number },
): AnswerlatticeWeeklySummary | null {
    if (!isRecord(value) || !hasExpectedScope(value, scope)) return null;
    const weekStart = normalizeDateKey(value.weekStart);
    const weekEnd = normalizeDateKey(value.weekEnd);
    const narrative = normalizeText(value.narrative, 20_000);
    const highlights = normalizeTextArray(value.highlights, 20, 1_000);
    const recommendations = normalizeTextArray(value.recommendations, 20, 1_000);
    const generatedAt = normalizeTimestampIso(value.generatedAt);
    if (
        !weekStart
        || !weekEnd
        || shiftUtcDateKey(weekStart, 6) !== weekEnd
        || !narrative
        || !highlights
        || !recommendations
        || !generatedAt
        || value.generationMode !== 'deterministic'
        || !isRecord(value.keyMetrics)
    ) return null;

    const normalizeNullableMetric = (metric: unknown): number | null | undefined => {
        if (metric === null) return null;
        return normalizeFiniteMetric(metric) ?? undefined;
    };
    const usesCurrentMetricNames = (
        Object.prototype.hasOwnProperty.call(value.keyMetrics, 'volumeChangePercent')
        || Object.prototype.hasOwnProperty.call(value.keyMetrics, 'positiveFeedbackSharePointChange')
    );
    const volumeChangePercent = normalizeNullableMetric(
        usesCurrentMetricNames ? value.keyMetrics.volumeChangePercent : value.keyMetrics.volumeChange,
    );
    const positiveFeedbackSharePointChange = normalizeNullableMetric(
        usesCurrentMetricNames
            ? value.keyMetrics.positiveFeedbackSharePointChange
            : value.keyMetrics.satisfactionChange,
    );
    const topCategory = normalizeText(value.keyMetrics.topCategory, 120);
    if (
        volumeChangePercent === undefined
        || positiveFeedbackSharePointChange === undefined
        || !topCategory
    ) return null;
    let sourceCompleteness: AnswerlatticeWeeklySummary['sourceCompleteness'] = {
        currentDays: null,
        previousDays: null,
        currentWeekComplete: false,
        comparisonComplete: false,
    };
    if (value.sourceCompleteness !== undefined) {
        if (
            !isRecord(value.sourceCompleteness)
            || normalizeNonNegativeInteger(value.sourceCompleteness.currentDays) === null
            || normalizeNonNegativeInteger(value.sourceCompleteness.previousDays) === null
            || Number(value.sourceCompleteness.currentDays) > 7
            || Number(value.sourceCompleteness.previousDays) > 7
            || typeof value.sourceCompleteness.currentWeekComplete !== 'boolean'
            || typeof value.sourceCompleteness.comparisonComplete !== 'boolean'
            || value.sourceCompleteness.currentWeekComplete !== (value.sourceCompleteness.currentDays === 7)
            || (
                value.sourceCompleteness.comparisonComplete
                !== (
                    value.sourceCompleteness.currentWeekComplete === true
                    && value.sourceCompleteness.previousDays === 7
                )
            )
        ) return null;
        sourceCompleteness = {
            currentDays: Number(value.sourceCompleteness.currentDays),
            previousDays: Number(value.sourceCompleteness.previousDays),
            currentWeekComplete: value.sourceCompleteness.currentWeekComplete,
            comparisonComplete: value.sourceCompleteness.comparisonComplete,
        };
    }

    return {
        weekStart,
        weekEnd,
        narrative,
        highlights,
        recommendations,
        keyMetrics: { volumeChangePercent, positiveFeedbackSharePointChange, topCategory },
        sourceCompleteness,
        generatedAt,
        generationMode: 'deterministic',
    };
}

export function getAnswerlatticeWeeklySummaryFreshness(
    summary: AnswerlatticeWeeklySummary,
    now: Date = new Date(),
): AnswerlatticeWeeklySummaryFreshness {
    const nowMs = now.getTime();
    const generatedMs = Date.parse(summary.generatedAt);
    if (!Number.isFinite(nowMs) || !Number.isFinite(generatedMs)) {
        return { state: 'stale', ageDays: Number.POSITIVE_INFINITY };
    }
    const ageDays = Math.max(0, (nowMs - generatedMs) / (24 * 60 * 60 * 1_000));
    if (generatedMs > nowMs + 5 * 60 * 1_000) return { state: 'future', ageDays: 0 };

    const today = now.toISOString().slice(0, 10);
    const oldestCurrentWeekEnd = shiftUtcDateKey(today, -8);
    return {
        state: ageDays > 8 || summary.weekEnd < oldestCurrentWeekEnd ? 'stale' : 'current',
        ageDays,
    };
}

export function parseAnswerlatticeFeedbackIntelligence(
    value: unknown,
    scope: { tenantId: number; storeId: number },
): AnswerlatticeFeedbackIntelligence | null {
    if (!isRecord(value) || !hasExpectedScope(value, scope)) return null;
    const date = normalizeDateKey(value.date);
    const summary = normalizeText(value.summary, 20_000);
    const topIssues = normalizeTextArray(value.topIssues, 20, 1_000);
    const recommendations = normalizeTextArray(value.recommendations, 20, 1_000);
    const generatedAt = normalizeTimestampIso(value.generatedAt);
    if (
        !date
        || !summary
        || !topIssues
        || !recommendations
        || !generatedAt
        || !Array.isArray(value.themes)
        || value.themes.length > 20
    ) return null;

    const themes = value.themes.map((entry): AnswerlatticeFeedbackTheme | null => {
        if (!isRecord(entry)) return null;
        const theme = normalizeText(entry.theme, 500);
        const count = normalizeNonNegativeInteger(entry.count);
        const examples = normalizeTextArray(entry.examples, 10, 1_000);
        const suggestedActions = normalizeTextArray(entry.suggestedActions, 10, 1_000);
        if (
            !theme
            || count === null
            || typeof entry.severity !== 'string'
            || !SEVERITIES.has(entry.severity)
            || !examples
            || !suggestedActions
        ) return null;
        return {
            theme,
            count,
            severity: entry.severity as AnswerlatticeFeedbackTheme['severity'],
            examples,
            suggestedActions,
        };
    });
    if (themes.some((theme) => !theme)) return null;

    return {
        date,
        themes: themes as AnswerlatticeFeedbackTheme[],
        summary,
        topIssues,
        recommendations,
        generatedAt,
    };
}
