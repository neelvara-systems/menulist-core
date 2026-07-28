import { PRODUCT_IDS } from '@constant/product';
import {
    normalizeAnswerlatticeScopeDocumentId,
    normalizeConsistentAnswerlatticeScopeDocumentIds,
} from '@lib/answerlattice/sessionScope';

export const ANSWERLATTICE_CHAT_ANALYTICS_MAX_DAYS = 90;
export const ANSWERLATTICE_CHAT_ANALYTICS_PAGE_LIMIT = 50;
export const ANSWERLATTICE_CHAT_ANALYTICS_LIVE_SESSION_LIMIT = 500;

export type AnswerlatticeAnalyticsDateRange = {
    start: Date;
    end: Date;
};

export type AnswerlatticeAnalyticsQueryWindow = {
    startDateKey: string;
    endDateKey: string;
    historicalEndDateKey: string | null;
    includesToday: boolean;
    dayCount: number;
};

export type AnswerlatticeChatWorkspaceScope = {
    tId: number;
    sId: number;
};

export type AnswerlatticeChatAnalyticsDay = {
    id: string;
    pId: typeof PRODUCT_IDS.ANSWERLATTICE;
    tId: number;
    sId: number;
    date: string;
    totalChats: number;
    qnaChats: number;
    assistantChats: number;
    totalMessages: number;
    positiveFeedback: number;
    negativeFeedback: number;
    totalFeedback: number;
    totalRegenerations: number;
    topQuestions: Array<{ question: string; count: number }>;
    knowledgeGaps: Array<{ question: string; count: number; examples: string[] }>;
    sourceComplete: boolean;
    sourceSessionCount: number;
    sourceLimit: number;
    createdOn?: unknown;
    modifiedOn?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const boundedNonNegativeInteger = (value: unknown): number | null => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
);

const cleanText = (value: unknown, max: number): string | null => {
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned ? cleaned.slice(0, max) : null;
};

export const normalizeAnswerlatticeAnalyticsDays = (value: unknown, fallback = 30): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(Math.floor(parsed), ANSWERLATTICE_CHAT_ANALYTICS_MAX_DAYS);
};

export const normalizeAnswerlatticeAnalyticsPageSize = (value: unknown, fallback = 20): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(Math.floor(parsed), ANSWERLATTICE_CHAT_ANALYTICS_PAGE_LIMIT);
};

export const getAnswerlatticeChatWorkspaceScopeKey = (
    value: { tenantId?: unknown; storeId?: unknown; tId?: unknown; sId?: unknown } | null | undefined,
): string | null => {
    if (!value) return null;
    const tId = normalizeConsistentAnswerlatticeScopeDocumentIds([value.tId, value.tenantId]);
    const sId = normalizeConsistentAnswerlatticeScopeDocumentIds([value.sId, value.storeId]);
    return tId && sId ? `answerlattice-chat:${tId}:${sId}` : null;
};

export const isAnswerlatticeChatWorkspaceScopeAcknowledgement = (
    value: unknown,
    expected: AnswerlatticeChatWorkspaceScope,
): boolean => {
    if (!isRecord(value)) return false;
    return normalizeAnswerlatticeScopeDocumentId(value.tId) === expected.tId
        && normalizeAnswerlatticeScopeDocumentId(value.sId) === expected.sId;
};

export const parseAnswerlatticeAnalyticsDateRange = (
    value: unknown,
): AnswerlatticeAnalyticsDateRange | null => {
    if (!isRecord(value) || !(value.start instanceof Date) || !(value.end instanceof Date)) return null;
    if (!Number.isFinite(value.start.getTime()) || !Number.isFinite(value.end.getTime())) return null;
    if (value.start > value.end) return null;
    const maxRangeMs = ANSWERLATTICE_CHAT_ANALYTICS_MAX_DAYS * 24 * 60 * 60 * 1000;
    if (value.end.getTime() - value.start.getTime() > maxRangeMs) return null;
    return { start: value.start, end: value.end };
};

const formatUtcDateKey = (value: Date): string => value.toISOString().slice(0, 10);

const shiftUtcDateKey = (dateKey: string, days: number): string => {
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return formatUtcDateKey(date);
};

/**
 * Normalize an owner-selected range into the exact UTC buckets used by the
 * Answerlattice nightly chat-analytics writer.
 */
export const getAnswerlatticeAnalyticsQueryWindow = (
    value: unknown,
    now: Date = new Date(),
): AnswerlatticeAnalyticsQueryWindow | null => {
    const range = parseAnswerlatticeAnalyticsDateRange(value);
    if (!range || !Number.isFinite(now.getTime())) return null;

    const startDateKey = formatUtcDateKey(range.start);
    const endDateKey = formatUtcDateKey(range.end);
    const todayDateKey = formatUtcDateKey(now);
    if (startDateKey > endDateKey || endDateKey > todayDateKey) return null;

    const startMs = new Date(`${startDateKey}T00:00:00.000Z`).getTime();
    const endMs = new Date(`${endDateKey}T00:00:00.000Z`).getTime();
    const dayCount = Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1;
    if (dayCount < 1 || dayCount > ANSWERLATTICE_CHAT_ANALYTICS_MAX_DAYS) return null;

    const includesToday = startDateKey <= todayDateKey && endDateKey >= todayDateKey;
    const yesterdayDateKey = shiftUtcDateKey(todayDateKey, -1);
    const historicalEndDateKey = startDateKey > yesterdayDateKey
        ? null
        : endDateKey < todayDateKey
            ? endDateKey
            : yesterdayDateKey;

    return {
        startDateKey,
        endDateKey,
        historicalEndDateKey,
        includesToday,
        dayCount,
    };
};

export const parseAnswerlatticeChatAnalyticsDay = (params: {
    id: string;
    value: unknown;
    scope: { tId: number; sId: number };
}): AnswerlatticeChatAnalyticsDay | null => {
    if (!params.id || !isRecord(params.value)) return null;
    const expectedDate = typeof params.value.date === 'string' ? params.value.date : '';
    const parsedDate = new Date(`${expectedDate}T00:00:00.000Z`);
    if (
        params.value.pId !== PRODUCT_IDS.ANSWERLATTICE
        || normalizeAnswerlatticeScopeDocumentId(params.value.tId) !== params.scope.tId
        || normalizeAnswerlatticeScopeDocumentId(params.value.sId) !== params.scope.sId
        || !/^\d{4}-\d{2}-\d{2}$/.test(expectedDate)
        || !Number.isFinite(parsedDate.getTime())
        || parsedDate.toISOString().slice(0, 10) !== expectedDate
        || params.id !== `${params.scope.tId}_${params.scope.sId}_${expectedDate}`
        || typeof params.value.sourceComplete !== 'boolean'
    ) return null;
    const numericKeys = [
        'totalChats',
        'qnaChats',
        'assistantChats',
        'totalMessages',
        'positiveFeedback',
        'negativeFeedback',
        'totalFeedback',
        'totalRegenerations',
        'sourceSessionCount',
        'sourceLimit',
    ] as const;
    const numericValues = Object.fromEntries(numericKeys.map((key) => [
        key,
        boundedNonNegativeInteger(params.value[key]),
    ]));
    if (Object.values(numericValues).some((value) => value === null)) return null;
    if (
        numericValues.qnaChats! + numericValues.assistantChats! !== numericValues.totalChats
        || numericValues.positiveFeedback! + numericValues.negativeFeedback! !== numericValues.totalFeedback
        || numericValues.sourceSessionCount !== numericValues.totalChats
        || numericValues.sourceLimit! < numericValues.sourceSessionCount!
        || numericValues.sourceLimit === 0
        || numericValues.totalFeedback! > numericValues.totalMessages!
        || numericValues.totalRegenerations! > numericValues.totalMessages!
        || !Array.isArray(params.value.topQuestions)
        || params.value.topQuestions.length > 10
        || !Array.isArray(params.value.knowledgeGaps)
        || params.value.knowledgeGaps.length > 20
    ) return null;
    const topQuestions = params.value.topQuestions
        .flatMap((entry) => {
            if (!isRecord(entry)) return [];
            const question = cleanText(entry.question, 500);
            const count = boundedNonNegativeInteger(entry.count);
            return question && count !== null && count > 0 ? [{ question, count }] : [];
        });
    const knowledgeGaps = params.value.knowledgeGaps
        .flatMap((entry) => {
            if (!isRecord(entry)) return [];
            const question = cleanText(entry.question, 500);
            const count = boundedNonNegativeInteger(entry.count);
            if (!question || count === null || count <= 0) return [];
            const examples = Array.isArray(entry.examples)
                ? entry.examples.slice(0, 3).flatMap((example) => {
                    const cleaned = cleanText(example, 1000);
                    return cleaned ? [cleaned] : [];
                })
                : [];
            return [{ question, count, examples }];
        });
    if (
        topQuestions.length !== params.value.topQuestions.length
        || knowledgeGaps.length !== params.value.knowledgeGaps.length
    ) return null;
    return {
        id: params.id,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: params.scope.tId,
        sId: params.scope.sId,
        date: expectedDate,
        totalChats: numericValues.totalChats!,
        qnaChats: numericValues.qnaChats!,
        assistantChats: numericValues.assistantChats!,
        totalMessages: numericValues.totalMessages!,
        positiveFeedback: numericValues.positiveFeedback!,
        negativeFeedback: numericValues.negativeFeedback!,
        totalFeedback: numericValues.totalFeedback!,
        totalRegenerations: numericValues.totalRegenerations!,
        topQuestions,
        knowledgeGaps,
        sourceComplete: params.value.sourceComplete,
        sourceSessionCount: numericValues.sourceSessionCount!,
        sourceLimit: numericValues.sourceLimit!,
        ...(params.value.createdOn ? { createdOn: params.value.createdOn } : {}),
        ...(params.value.modifiedOn ? { modifiedOn: params.value.modifiedOn } : {}),
    };
};
