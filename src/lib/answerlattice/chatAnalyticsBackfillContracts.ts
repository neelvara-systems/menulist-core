export type AnswerlatticeChatAnalyticsBackfillResult = {
    date: string;
    chats: number;
    status: 'success' | 'skipped';
    partial: boolean;
};

export type AnswerlatticeChatAnalyticsBackfillResponse = {
    tenantId: number;
    storeId: number;
    days: number;
    results: AnswerlatticeChatAnalyticsBackfillResult[];
};

export const normalizeAnswerlatticeChatAnalyticsScopeId = (value: unknown): number | null => (
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0
        ? value
        : null
);

const isRealCalendarDate = (value: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const millis = Date.parse(`${value}T00:00:00.000Z`);
    return Number.isFinite(millis) && new Date(millis).toISOString().slice(0, 10) === value;
};

export function parseAnswerlatticeChatAnalyticsBackfillResponse(
    value: unknown,
    expected: { tId: number; sId: number; days: number },
): AnswerlatticeChatAnalyticsBackfillResponse {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('chat_analytics_backfill_response_invalid');
    }
    const response = value as Record<string, unknown>;
    if (
        Object.keys(response).some((key) => !['tId', 'sId', 'days', 'results'].includes(key))
        || normalizeAnswerlatticeChatAnalyticsScopeId(response.tId) !== expected.tId
        || normalizeAnswerlatticeChatAnalyticsScopeId(response.sId) !== expected.sId
        || response.days !== expected.days
        || !Array.isArray(response.results)
        || response.results.length !== expected.days
    ) {
        throw new Error('chat_analytics_backfill_response_invalid');
    }

    const seenDates = new Set<string>();
    const results = response.results.map((entry): AnswerlatticeChatAnalyticsBackfillResult => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new Error('chat_analytics_backfill_response_invalid');
        }
        const result = entry as Record<string, unknown>;
        if (
            Object.keys(result).some((key) => !['date', 'chats', 'status', 'partial'].includes(key))
            || typeof result.date !== 'string'
            || !isRealCalendarDate(result.date)
            || seenDates.has(result.date)
            || typeof result.chats !== 'number'
            || !Number.isSafeInteger(result.chats)
            || result.chats < 0
            || (result.status !== 'success' && result.status !== 'skipped')
            || typeof result.partial !== 'boolean'
        ) {
            throw new Error('chat_analytics_backfill_response_invalid');
        }
        seenDates.add(result.date);
        return {
            date: result.date,
            chats: result.chats,
            status: result.status,
            partial: result.partial,
        };
    });

    return {
        tenantId: expected.tId,
        storeId: expected.sId,
        days: expected.days,
        results,
    };
}
