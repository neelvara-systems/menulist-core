import {
    ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
    ANSWERLATTICE_SUPPORT_METRIC_WINDOWS,
    isAnswerlatticeDateKey,
} from '@data/shared/answerlatticeSupportMetrics';
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
    lastUpdated: unknown;
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
        volumeChange: number;
        satisfactionChange: number;
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

const normalizeTimestampIso = (value: unknown): string | null => {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
    if (!isRecord(value)) return null;

    if (typeof value.toDate === 'function') {
        try {
            const date = (value.toDate as () => unknown)();
            return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
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
    const date = new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000));
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
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
    const startAt = normalizeTimestampIso(value.startAt);
    const endAt = normalizeTimestampIso(value.endAt);
    const sourceLimit = normalizeNonNegativeInteger(value.sourceLimit);
    const observedCount = normalizeNonNegativeInteger(value.observedCount);
    if (
        !startAt
        || !endAt
        || startAt >= endAt
        || sourceLimit === null
        || sourceLimit < 1
        || observedCount === null
        || observedCount > sourceLimit
    ) return null;

    if (expectedKind === ANSWERLATTICE_SUPPORT_METRIC_WINDOWS.UTC_CALENDAR_7_DAYS) {
        const dateKeys = [
            value.currentStartDate,
            value.currentEndDate,
            value.previousStartDate,
            value.previousEndDate,
        ];
        if (!dateKeys.every(isAnswerlatticeDateKey)) return null;
    }

    return value as unknown as AnswerlatticeSupportMetricWindow;
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
    if (!window || !isRecord(value.coverage)) return null;
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
    ) return null;

    return value as unknown as AnswerlatticeCoverageData;
}

export function parseAnswerlatticeTrustMetrics(
    value: unknown,
    scope: { tenantId: number; storeId: number },
): AnswerlatticeTrustMetrics | null {
    if (!isRecord(value) || !hasCurrentMetricsSchema(value, scope)) return null;
    const window = parseMetricWindow(value.window, ANSWERLATTICE_SUPPORT_METRIC_WINDOWS.ROLLING_24_HOURS);
    if (
        !window
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
        || Number(value.nonEscalation.withoutEscalation) + Number(value.nonEscalation.escalated) !== Number(value.nonEscalation.total)
        || Number(value.entityAnswerCoverage.coveredCount) + Number(value.entityAnswerCoverage.uncoveredCount) !== Number(value.entityAnswerCoverage.totalEntities)
        || Number(value.entityAnswerCoverage.driftedCoveredCount) > Number(value.entityAnswerCoverage.coveredCount)
        || Number(value.sourceCompleteness.searchHistory) !== window.observedCount
    ) return null;

    const escalationFields = ['knowledgeGap', 'lowConfidence', 'retrievalFailure', 'userRequested', 'total'];
    if (!hasCountMetric(value.escalationBreakdown, escalationFields)) return null;
    if (
        Number(value.escalationBreakdown.knowledgeGap)
        + Number(value.escalationBreakdown.lowConfidence)
        + Number(value.escalationBreakdown.retrievalFailure)
        !== Number(value.escalationBreakdown.total)
    ) return null;

    const validTopEntities = value.topFailingEntities.every((entry) => (
        isRecord(entry)
        && Boolean(normalizeText(entry.entityId, 200))
        && Boolean(normalizeText(entry.entityName, 300))
        && Boolean(normalizeText(entry.entityType, 80))
        && hasCountMetric(entry, ['queryCount', 'escalationCount', 'evidenceCount', 'negativeFeedbackCount', 'canonicalMissCount'])
        && normalizeFiniteMetric(entry.weightedLoad) !== null
    ));
    if (!validTopEntities) return null;

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
        ) return null;
    }

    return value as unknown as AnswerlatticeTrustMetrics;
}

export function parseAnswerlatticeFrictionSnapshot(
    value: unknown,
    scope: { tenantId: number; storeId: number },
): AnswerlatticeFrictionSnapshot | null {
    if (!isRecord(value) || !hasCurrentMetricsSchema(value, scope)) return null;
    const window = parseMetricWindow(value.window, ANSWERLATTICE_SUPPORT_METRIC_WINDOWS.UTC_CALENDAR_7_DAYS);
    const totalWeightedLoad = normalizeFiniteMetric(value.totalWeightedLoad);
    if (
        !window
        || !Array.isArray(value.topFrictionEntities)
        || value.topFrictionEntities.length > 10
        || !Array.isArray(value.emergingTopics)
        || value.emergingTopics.length > 5
        || !['LOW', 'MODERATE', 'HIGH'].includes(String(value.frictionLevel))
        || totalWeightedLoad === null
        || totalWeightedLoad < 0
        || !hasCountMetric(value, ['totalSignals7d', 'totalEscalations7d', 'unmappedEvidenceCount', 'legacyDailyStatCount'])
    ) return null;

    const validEntities = value.topFrictionEntities.every((entry) => {
        if (
            !isRecord(entry)
            || !normalizeText(entry.entityId, 200)
            || !normalizeText(entry.entityName, 300)
            || !normalizeText(entry.entityType, 80)
            || !isRecord(entry.last7d)
            || !isRecord(entry.previous7d)
            || !['rising', 'stable', 'improving', 'new'].includes(String(entry.trendDirection))
        ) return false;
        const trendScore = normalizeFiniteMetric(entry.trendScore);
        const currentLoad = normalizeFiniteMetric(entry.last7d.frictionScore);
        const previousLoad = normalizeFiniteMetric(entry.previous7d.frictionScore);
        return hasCountMetric(entry.last7d, ['queryCount', 'escalationCount', 'lowConfidenceCount'])
            && hasCountMetric(entry.previous7d, ['queryCount'])
            && trendScore !== null
            && trendScore >= 0
            && currentLoad !== null
            && currentLoad >= 0
            && previousLoad !== null
            && previousLoad >= 0;
    });
    const validEmerging = value.emergingTopics.every((entry) => (
        isRecord(entry)
        && Boolean(normalizeText(entry.entityId, 200))
        && Boolean(normalizeText(entry.entityName, 300))
        && Boolean(normalizeText(entry.entityType, 80))
        && normalizeNonNegativeInteger(entry.queryCount) !== null
        && typeof entry.escalationRate === 'number'
        && Number.isFinite(entry.escalationRate)
        && entry.escalationRate >= 0
        && entry.escalationRate <= 1
        && isAnswerlatticeDateKey(entry.firstSeenDate)
    ));
    if (!validEntities || !validEmerging) return null;
    return value as unknown as AnswerlatticeFrictionSnapshot;
}

export function parseAnswerlatticeFrictionInsight(
    value: unknown,
    scope: { tenantId: number; storeId: number },
): AnswerlatticeFrictionInsight | null {
    if (
        !isRecord(value)
        || !hasCurrentMetricsSchema(value, scope)
        || value.advisory !== true
        || !isAnswerlatticeDateKey(value.weekStart)
        || !isAnswerlatticeDateKey(value.weekEnd)
        || value.weekStart > value.weekEnd
        || !normalizeText(value.summary, 2_000)
        || !normalizeTimestampIso(value.sourceSnapshotUpdatedAt)
        || !['LOW', 'MODERATE', 'HIGH'].includes(String(value.frictionLevel))
        || !Array.isArray(value.suggestedActions)
        || value.suggestedActions.length > 10
        || !value.suggestedActions.every((entry) => (
            isRecord(entry)
            && Boolean(normalizeText(entry.entityId, 200))
            && Boolean(normalizeText(entry.action, 500))
        ))
    ) return null;
    return value as unknown as AnswerlatticeFrictionInsight;
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

    const volumeChange = normalizeFiniteMetric(value.keyMetrics.volumeChange);
    const satisfactionChange = normalizeFiniteMetric(value.keyMetrics.satisfactionChange);
    const topCategory = normalizeText(value.keyMetrics.topCategory, 120);
    if (volumeChange === null || satisfactionChange === null || !topCategory) return null;
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
        keyMetrics: { volumeChange, satisfactionChange, topCategory },
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
