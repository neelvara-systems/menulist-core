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
    generatedAt: string;
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
        || weekStart > weekEnd
        || !narrative
        || !highlights
        || !recommendations
        || !generatedAt
        || !isRecord(value.keyMetrics)
    ) return null;

    const volumeChange = normalizeFiniteMetric(value.keyMetrics.volumeChange);
    const satisfactionChange = normalizeFiniteMetric(value.keyMetrics.satisfactionChange);
    const topCategory = normalizeText(value.keyMetrics.topCategory, 120);
    if (volumeChange === null || satisfactionChange === null || !topCategory) return null;

    return {
        weekStart,
        weekEnd,
        narrative,
        highlights,
        recommendations,
        keyMetrics: { volumeChange, satisfactionChange, topCategory },
        generatedAt,
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
