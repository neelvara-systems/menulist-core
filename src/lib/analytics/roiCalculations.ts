/**
 * Assumption-labelled ROI scenario calculations for Answerlattice chat analytics.
 *
 * Observed analytics are kept separate from operator-provided planning assumptions.
 * The output must not imply measured resolution, retention, or revenue impact.
 */

export interface ChatAnalyticsData {
    totalConversations: number;
    qnaConversations: number;
    assistantConversations: number;
    positiveFeedback: number;
    negativeFeedback: number;
    dateRange: {
        start: Date;
        end: Date;
    };
}

export interface ROIMetrics {
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

export interface ROICalculationParams {
    analyticsData: ChatAnalyticsData;
    avgSupportAgentHourlyCost?: number;
    platformMonthlyCost?: number;
    assumedMinutesSavedPerConversation?: number;
}

const DEFAULT_HOURLY_COST = 25;
const DEFAULT_PLATFORM_MONTHLY_COST = 99;
const DEFAULT_MINUTES_SAVED_PER_CONVERSATION = 8;

const requireNonNegativeFinite = (value: number, field: string): number => {
    if (!Number.isFinite(value) || value < 0) {
        throw new RangeError(`${field} must be a non-negative finite number`);
    }
    return value;
};

const requireNonNegativeInteger = (value: number, field: string): number => {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new RangeError(`${field} must be a non-negative safe integer`);
    }
    return value;
};

const roundOneDecimal = (value: number): number => Math.round(value * 10) / 10;

/**
 * Calculates an illustrative cost/time scenario from observed conversation counts.
 *
 * `assumedMinutesSavedPerConversation` is deliberately explicit: Answerlattice does
 * not currently persist a measured manual-support baseline or a resolution outcome.
 */
export function calculateROI(params: ROICalculationParams): ROIMetrics {
    const {
        analyticsData,
        avgSupportAgentHourlyCost = DEFAULT_HOURLY_COST,
        platformMonthlyCost = DEFAULT_PLATFORM_MONTHLY_COST,
        assumedMinutesSavedPerConversation = DEFAULT_MINUTES_SAVED_PER_CONVERSATION,
    } = params;

    const totalConversations = requireNonNegativeInteger(
        analyticsData.totalConversations,
        'analyticsData.totalConversations',
    );
    const qnaConversations = requireNonNegativeInteger(
        analyticsData.qnaConversations,
        'analyticsData.qnaConversations',
    );
    const assistantConversations = requireNonNegativeInteger(
        analyticsData.assistantConversations,
        'analyticsData.assistantConversations',
    );
    const positiveFeedbackSignals = requireNonNegativeInteger(
        analyticsData.positiveFeedback,
        'analyticsData.positiveFeedback',
    );
    const negativeFeedbackSignals = requireNonNegativeInteger(
        analyticsData.negativeFeedback,
        'analyticsData.negativeFeedback',
    );
    if (qnaConversations + assistantConversations > totalConversations) {
        throw new RangeError('conversation mode counts cannot exceed total conversations');
    }
    const hourlyCost = requireNonNegativeFinite(
        avgSupportAgentHourlyCost,
        'avgSupportAgentHourlyCost',
    );
    const monthlyPlatformCost = requireNonNegativeFinite(
        platformMonthlyCost,
        'platformMonthlyCost',
    );
    const minutesSavedPerConversation = requireNonNegativeFinite(
        assumedMinutesSavedPerConversation,
        'assumedMinutesSavedPerConversation',
    );

    const startTime = analyticsData.dateRange.start.getTime();
    const endTime = analyticsData.dateRange.end.getTime();
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
        throw new RangeError('analyticsData.dateRange must be a valid positive interval');
    }

    const rangeDays = (endTime - startTime) / (1000 * 60 * 60 * 24);
    const monthsInRange = rangeDays / 30;
    const estimatedTotalHoursSaved = (totalConversations * minutesSavedPerConversation) / 60;
    const estimatedMonthlyHoursSaved = estimatedTotalHoursSaved / monthsInRange;
    const estimatedTotalCostSaved = estimatedTotalHoursSaved * hourlyCost;
    const estimatedMonthlyCostSaved = estimatedMonthlyHoursSaved * hourlyCost;
    const platformCost = monthlyPlatformCost * monthsInRange;
    const estimatedNetSavings = estimatedTotalCostSaved - platformCost;
    const estimatedRoi = platformCost > 0
        ? (estimatedNetSavings / platformCost) * 100
        : 0;
    const estimatedMonthlyNetSavings = estimatedMonthlyCostSaved - monthlyPlatformCost;
    const estimatedPaybackPeriod = estimatedMonthlyNetSavings > 0
        ? monthlyPlatformCost / estimatedMonthlyNetSavings
        : null;

    return {
        estimatedTotalHoursSaved: roundOneDecimal(estimatedTotalHoursSaved),
        estimatedMonthlyHoursSaved: roundOneDecimal(estimatedMonthlyHoursSaved),
        estimatedTotalCostSaved: Math.round(estimatedTotalCostSaved),
        estimatedMonthlyCostSaved: Math.round(estimatedMonthlyCostSaved),
        conversationsObserved: totalConversations,
        qnaConversations,
        assistantConversations,
        positiveFeedbackSignals,
        negativeFeedbackSignals,
        platformCost: Math.round(platformCost),
        estimatedNetSavings: Math.round(estimatedNetSavings),
        estimatedRoi: roundOneDecimal(estimatedRoi),
        estimatedPaybackPeriod: estimatedPaybackPeriod === null
            ? null
            : roundOneDecimal(estimatedPaybackPeriod),
    };
}

export function formatCurrency(amount: number, currency: 'USD' | 'INR' = 'USD'): string {
    const symbol = currency === 'USD' ? '$' : '₹';
    return `${symbol}${Math.round(amount).toLocaleString()}`;
}

export function formatHours(hours: number): string {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    return `${roundOneDecimal(hours)} hrs`;
}

export function formatPaybackPeriod(months: number | null): string {
    if (months === null) return 'N/A';
    if (months < 1) return '<1 month';
    if (months === 1) return '1 month';
    return `${Math.round(months)} months`;
}

export function getDefaultROIParams(analyticsData: ChatAnalyticsData): ROICalculationParams {
    return {
        analyticsData,
        avgSupportAgentHourlyCost: DEFAULT_HOURLY_COST,
        platformMonthlyCost: DEFAULT_PLATFORM_MONTHLY_COST,
        assumedMinutesSavedPerConversation: DEFAULT_MINUTES_SAVED_PER_CONVERSATION,
    };
}
