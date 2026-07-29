export const ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION = 2 as const;

export const ANSWERLATTICE_SUPPORT_METRIC_WINDOWS = {
    ROLLING_24_HOURS: 'rolling_24_hours',
    UTC_CALENDAR_7_DAYS: 'utc_calendar_7_days',
} as const;

export const ANSWERLATTICE_SUPPORT_METRIC_SOURCE_LIMITS = {
    coverageHistory: 500,
    activeAnswers: 500,
    activeEntities: 1_000,
    signalEvents: 1_000,
    dailyFrictionSignals: 500,
    dailyCanonicalMisses: 500,
    frictionHistoryRows: 500,
} as const;

export type AnswerlatticeFrictionTrendDirection = 'rising' | 'stable' | 'improving' | 'new';
export type AnswerlatticeFrictionLevel = 'HIGH' | 'MODERATE' | 'LOW';

export interface AnswerlatticeFrictionEvidenceComponents {
    ticketCount: number;
    chatNegativeCount: number;
    escalationCount: number;
    canonicalMissCount: number;
}

export interface AnswerlatticeUtcFrictionWindows {
    today: string;
    dayStartMs: number;
    currentStart: string;
    currentEnd: string;
    previousStart: string;
    previousEnd: string;
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isAnswerlatticeDateKey = (value: unknown): value is string => {
    if (typeof value !== 'string' || !DATE_KEY_PATTERN.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const shiftAnswerlatticeUtcDateKey = (dateKey: string, days: number): string => {
    if (!isAnswerlatticeDateKey(dateKey) || !Number.isSafeInteger(days)) {
        throw new Error('Invalid UTC date-key shift input.');
    }
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
};

export const getAnswerlatticeUtcFrictionWindows = (
    now: Date = new Date(),
): AnswerlatticeUtcFrictionWindows => {
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
        throw new Error('A valid date is required for friction windows.');
    }

    const today = now.toISOString().slice(0, 10);
    const currentEnd = shiftAnswerlatticeUtcDateKey(today, -1);
    return {
        today,
        dayStartMs: Date.parse(`${today}T00:00:00.000Z`),
        currentStart: shiftAnswerlatticeUtcDateKey(currentEnd, -6),
        currentEnd,
        previousStart: shiftAnswerlatticeUtcDateKey(currentEnd, -13),
        previousEnd: shiftAnswerlatticeUtcDateKey(currentEnd, -7),
    };
};

export const calculateAnswerlatticeFrictionLoad = (
    evidenceCount: number,
    escalationCount: number,
    canonicalMissCount: number,
): number => {
    if (
        !Number.isFinite(evidenceCount)
        || !Number.isFinite(escalationCount)
        || !Number.isFinite(canonicalMissCount)
        || evidenceCount <= 0
    ) return 0;

    const boundedEvidence = Math.max(0, evidenceCount);
    const escalationRate = Math.max(0, escalationCount) / boundedEvidence;
    const missRate = Math.max(0, canonicalMissCount) / boundedEvidence;
    return Math.round(boundedEvidence * (1 + escalationRate + missRate) * 100) / 100;
};

export const detectAnswerlatticeFrictionTrend = (
    currentLoad: number,
    previousLoad: number,
): { direction: AnswerlatticeFrictionTrendDirection; ratio: number } => {
    const current = Number.isFinite(currentLoad) ? Math.max(0, currentLoad) : 0;
    const previous = Number.isFinite(previousLoad) ? Math.max(0, previousLoad) : 0;
    if (previous === 0 && current > 0) return { direction: 'new', ratio: 0 };
    if (previous === 0) return { direction: 'stable', ratio: 1 };
    const ratio = Math.round((current / previous) * 100) / 100;
    if (ratio > 1.5) return { direction: 'rising', ratio };
    if (ratio < 0.7) return { direction: 'improving', ratio };
    return { direction: 'stable', ratio };
};

/** Volume-sensitive support-evidence load, not customer satisfaction or answer accuracy. */
export const classifyAnswerlatticeFrictionLevel = (
    totalWeightedLoad: number,
): AnswerlatticeFrictionLevel => {
    const load = Number.isFinite(totalWeightedLoad) ? Math.max(0, totalWeightedLoad) : 0;
    if (load > 500) return 'HIGH';
    if (load > 100) return 'MODERATE';
    return 'LOW';
};
