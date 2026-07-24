import {
    isAnswerlatticeChatWorkspaceScopeAcknowledgement,
    type AnswerlatticeChatWorkspaceScope,
} from './chatAnalyticsContracts';

export interface AnswerlatticeRoiMetrics {
    estimatedTotalHoursSaved: number;
    estimatedMonthlyHoursSaved: number;
    estimatedTotalCostSaved: number;
    estimatedMonthlyCostSaved: number;
    conversationsObserved: number;
    qnaConversations: number;
    assistantConversations: number;
    positiveFeedbackSignals: number;
    negativeFeedbackSignals: number;
    platformCost: number;
    estimatedNetSavings: number;
    estimatedRoi: number;
    estimatedPaybackPeriod: number | null;
}

export interface AnswerlatticeRoiData {
    tId: number;
    sId: number;
    metrics: AnswerlatticeRoiMetrics;
    params: {
        avgSupportAgentHourlyCost: number;
        assumedMinutesSavedPerConversation: number;
        platformMonthlyCost: number;
    };
    dateRange: {
        start: string;
        end: string;
        days: number;
    };
}

export type AnswerlatticeRoiMetricsApiResponse = {
    success: true;
    data: AnswerlatticeRoiData;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => (
    Object.keys(value).length === keys.length
    && Object.keys(value).every((key) => keys.includes(key))
);

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const isNonNegativeFiniteNumber = (value: unknown): value is number => (
    isFiniteNumber(value) && value >= 0
);

const isNonNegativeSafeInteger = (value: unknown): value is number => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
);

const isRoiMetrics = (value: unknown): value is AnswerlatticeRoiMetrics => {
    if (!isRecord(value)) return false;

    return hasExactKeys(value, [
        'estimatedTotalHoursSaved', 'estimatedMonthlyHoursSaved',
        'estimatedTotalCostSaved', 'estimatedMonthlyCostSaved',
        'conversationsObserved', 'qnaConversations', 'assistantConversations',
        'positiveFeedbackSignals', 'negativeFeedbackSignals', 'platformCost',
        'estimatedNetSavings', 'estimatedRoi', 'estimatedPaybackPeriod',
    ])
        && isNonNegativeFiniteNumber(value.estimatedTotalHoursSaved)
        && isNonNegativeFiniteNumber(value.estimatedMonthlyHoursSaved)
        && isNonNegativeFiniteNumber(value.estimatedTotalCostSaved)
        && isNonNegativeFiniteNumber(value.estimatedMonthlyCostSaved)
        && isNonNegativeSafeInteger(value.conversationsObserved)
        && isNonNegativeSafeInteger(value.qnaConversations)
        && isNonNegativeSafeInteger(value.assistantConversations)
        && value.qnaConversations + value.assistantConversations <= value.conversationsObserved
        && isNonNegativeSafeInteger(value.positiveFeedbackSignals)
        && isNonNegativeSafeInteger(value.negativeFeedbackSignals)
        && isNonNegativeFiniteNumber(value.platformCost)
        && isFiniteNumber(value.estimatedNetSavings)
        && isFiniteNumber(value.estimatedRoi)
        && (
            value.estimatedPaybackPeriod === null
            || isNonNegativeFiniteNumber(value.estimatedPaybackPeriod)
        );
};

const isRoiData = (
    value: unknown,
    expectedScope: AnswerlatticeChatWorkspaceScope,
): value is AnswerlatticeRoiData => (
    isRecord(value)
    && hasExactKeys(value, ['tId', 'sId', 'metrics', 'params', 'dateRange'])
    && isAnswerlatticeChatWorkspaceScopeAcknowledgement(value, expectedScope)
    && isRoiMetrics(value.metrics)
    && isRecord(value.params)
    && hasExactKeys(value.params, [
        'avgSupportAgentHourlyCost',
        'assumedMinutesSavedPerConversation',
        'platformMonthlyCost',
    ])
    && isNonNegativeFiniteNumber(value.params.avgSupportAgentHourlyCost)
    && isNonNegativeFiniteNumber(value.params.assumedMinutesSavedPerConversation)
    && isNonNegativeFiniteNumber(value.params.platformMonthlyCost)
    && isRecord(value.dateRange)
    && hasExactKeys(value.dateRange, ['start', 'end', 'days'])
    && typeof value.dateRange.start === 'string'
    && typeof value.dateRange.end === 'string'
    && Number.isFinite(Date.parse(value.dateRange.start))
    && Number.isFinite(Date.parse(value.dateRange.end))
    && Date.parse(value.dateRange.start) <= Date.parse(value.dateRange.end)
    && isNonNegativeSafeInteger(value.dateRange.days)
    && value.dateRange.days >= 1
    && value.dateRange.days <= 90
);

export const parseAnswerlatticeRoiMetricsApiResponse = (
    value: unknown,
    expectedScope: AnswerlatticeChatWorkspaceScope,
): AnswerlatticeRoiMetricsApiResponse | null => {
    if (
        !isRecord(value)
        || !hasExactKeys(value, ['success', 'data'])
        || value.success !== true
        || !isRoiData(value.data, expectedScope)
    ) return null;

    return {
        success: true,
        data: value.data,
    };
};
