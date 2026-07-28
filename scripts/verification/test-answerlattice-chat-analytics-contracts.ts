import assert from 'node:assert/strict';
import {
    getAnswerlatticeChatWorkspaceScopeKey,
    getAnswerlatticeAnalyticsQueryWindow,
    isAnswerlatticeChatWorkspaceScopeAcknowledgement,
    normalizeAnswerlatticeAnalyticsDays,
    normalizeAnswerlatticeAnalyticsPageSize,
    parseAnswerlatticeAnalyticsDateRange,
    parseAnswerlatticeChatAnalyticsDay,
} from '../../src/lib/answerlattice/chatAnalyticsContracts';
import {
    getAnswerlatticeCompletedWeeklyWindows,
    getAnswerlatticeWeeklySummaryFreshness,
    parseAnswerlatticeFeedbackIntelligence,
    parseAnswerlatticeWeeklySummary,
} from '../../src/lib/answerlattice/analyticsIntelligenceContracts';
import { parseAnswerlatticeRoiMetricsApiResponse } from '../../src/lib/answerlattice/roiMetricsContracts';
import { calculateROI } from '../../src/lib/analytics/roiCalculations';

const validDay = {
    pId: 'AL',
    tId: 11,
    sId: 101,
    date: '2026-07-10',
    totalChats: 4,
    qnaChats: 3,
    assistantChats: 1,
    totalMessages: 8,
    positiveFeedback: 2,
    negativeFeedback: 1,
    totalFeedback: 3,
    totalRegenerations: 1,
    topQuestions: [{ question: 'How do I start?', count: 2 }],
    knowledgeGaps: [{ question: 'Why did billing fail?', count: 1, examples: ['The answer was stale.'] }],
    sourceComplete: true,
    sourceSessionCount: 4,
    sourceLimit: 2000,
};

assert.equal(
    getAnswerlatticeChatWorkspaceScopeKey({ tenantId: 11, storeId: 101 }),
    'answerlattice-chat:11:101',
);
assert.equal(
    getAnswerlatticeChatWorkspaceScopeKey({ tenantId: 11, tId: 12, storeId: 101 }),
    null,
    'conflicting tenant aliases must not create a cross-workspace cache key',
);
assert.equal(
    getAnswerlatticeChatWorkspaceScopeKey({ tenantId: 11, storeId: 101, sId: 102 }),
    null,
    'conflicting store aliases must not create a cross-workspace cache key',
);

const validRoiResponse = {
    success: true,
    data: {
        tId: 11,
        sId: 101,
        metrics: {
            estimatedTotalHoursSaved: 5.3,
            estimatedMonthlyHoursSaved: 5.3,
            estimatedTotalCostSaved: 133,
            estimatedMonthlyCostSaved: 133,
            conversationsObserved: 40,
            qnaConversations: 30,
            assistantConversations: 10,
            positiveFeedbackSignals: 30,
            negativeFeedbackSignals: 4,
            platformCost: 99,
            estimatedNetSavings: 34,
            estimatedRoi: 34.3,
            estimatedPaybackPeriod: 2.9,
        },
        params: {
            avgSupportAgentHourlyCost: 25,
            assumedMinutesSavedPerConversation: 8,
            platformMonthlyCost: 99,
        },
        dateRange: {
            start: '2026-06-11T00:00:00.000Z',
            end: '2026-07-11T00:00:00.000Z',
            days: 30,
        },
    },
};
assert.equal(
    parseAnswerlatticeRoiMetricsApiResponse(validRoiResponse, { tId: 11, sId: 101 })?.data.metrics.estimatedRoi,
    34.3,
);
assert.equal(
    parseAnswerlatticeRoiMetricsApiResponse(validRoiResponse, { tId: 11, sId: 102 }),
    null,
    'ROI responses must acknowledge the exact requested workspace',
);
assert.equal(
    parseAnswerlatticeRoiMetricsApiResponse({
        ...validRoiResponse,
        data: {
            ...validRoiResponse.data,
            analyticsData: { private: true },
        },
    }, { tId: 11, sId: 101 }),
    null,
    'undeclared raw analytics data must not enter browser state',
);
assert.equal(
    parseAnswerlatticeRoiMetricsApiResponse({
        ...validRoiResponse,
        data: {
            ...validRoiResponse.data,
            metrics: {
                ...validRoiResponse.data.metrics,
                qnaConversations: 41,
            },
        },
    }, { tId: 11, sId: 101 }),
    null,
    'conversation mode counts must reconcile with observed conversations',
);
assert.equal(
    parseAnswerlatticeRoiMetricsApiResponse({
        ...validRoiResponse,
        data: {
            ...validRoiResponse.data,
            metrics: {
                ...validRoiResponse.data.metrics,
                estimatedRevenueProtected: 1000,
            },
        },
    }, { tId: 11, sId: 101 }),
    null,
    'unsupported retention or revenue-attribution fields must not enter browser state',
);

const calculatedRoi = calculateROI({
    analyticsData: {
        totalConversations: 40,
        qnaConversations: 30,
        assistantConversations: 10,
        positiveFeedback: 12,
        negativeFeedback: 4,
        dateRange: {
            start: new Date('2026-06-11T00:00:00.000Z'),
            end: new Date('2026-07-11T00:00:00.000Z'),
        },
    },
    avgSupportAgentHourlyCost: 25,
    assumedMinutesSavedPerConversation: 8,
    platformMonthlyCost: 99,
});
assert.deepEqual(calculatedRoi, {
    estimatedTotalHoursSaved: 5.3,
    estimatedMonthlyHoursSaved: 5.3,
    estimatedTotalCostSaved: 133,
    estimatedMonthlyCostSaved: 133,
    conversationsObserved: 40,
    qnaConversations: 30,
    assistantConversations: 10,
    positiveFeedbackSignals: 12,
    negativeFeedbackSignals: 4,
    platformCost: 99,
    estimatedNetSavings: 34,
    estimatedRoi: 34.7,
    estimatedPaybackPeriod: 2.9,
});
assert.equal(
    calculateROI({
        analyticsData: {
            totalConversations: 0,
            qnaConversations: 0,
            assistantConversations: 0,
            positiveFeedback: 0,
            negativeFeedback: 0,
            dateRange: {
                start: new Date('2026-06-11T00:00:00.000Z'),
                end: new Date('2026-07-11T00:00:00.000Z'),
            },
        },
        assumedMinutesSavedPerConversation: 0,
    }).estimatedPaybackPeriod,
    null,
    'a scenario without positive monthly savings must use a JSON-safe null payback period',
);
assert.equal(
    getAnswerlatticeChatWorkspaceScopeKey({ tenantId: '011', storeId: 101 }),
    null,
    'noncanonical workspace IDs must not enter browser cache keys',
);
assert.equal(
    isAnswerlatticeChatWorkspaceScopeAcknowledgement(
        { tId: 11, sId: 101 },
        { tId: 11, sId: 101 },
    ),
    true,
);
assert.equal(
    isAnswerlatticeChatWorkspaceScopeAcknowledgement(
        { tId: 11, sId: 102 },
        { tId: 11, sId: 101 },
    ),
    false,
    'a stale or wrong-workspace page must not settle browser state',
);

const parsed = parseAnswerlatticeChatAnalyticsDay({
    id: '11_101_2026-07-10',
    value: validDay,
    scope: { tId: 11, sId: 101 },
});
assert.equal(parsed?.totalChats, 4);
assert.equal(parsed?.sourceComplete, true);
assert.equal(parseAnswerlatticeChatAnalyticsDay({
    id: '11_101_2026-07-10',
    value: { ...validDay, pId: 'ML' },
    scope: { tId: 11, sId: 101 },
}), null);
assert.equal(parseAnswerlatticeChatAnalyticsDay({
    id: '11_101_2026-07-10',
    value: { ...validDay, totalChats: '4' },
    scope: { tId: 11, sId: 101 },
}), null, 'numeric strings must not enter summary counters');
assert.equal(parseAnswerlatticeChatAnalyticsDay({
    id: '11_101_2026-07-10',
    value: { ...validDay, sourceComplete: undefined },
    scope: { tId: 11, sId: 101 },
}), null, 'source completeness must be explicit');
assert.equal(parseAnswerlatticeChatAnalyticsDay({
    id: '11_101_2026-07-10',
    value: { ...validDay, date: '2026-99-99' },
    scope: { tId: 11, sId: 101 },
}), null, 'calendar dates must be real');
assert.equal(parseAnswerlatticeChatAnalyticsDay({
    id: '11_101_2026-07-11',
    value: validDay,
    scope: { tId: 11, sId: 101 },
}), null, 'document identity must match workspace and date');
assert.equal(parseAnswerlatticeChatAnalyticsDay({
    id: '11_101_2026-07-10',
    value: { ...validDay, totalFeedback: 4 },
    scope: { tId: 11, sId: 101 },
}), null, 'feedback counters must reconcile');
assert.equal(parseAnswerlatticeChatAnalyticsDay({
    id: '11_101_2026-07-10',
    value: { ...validDay, tId: 12 },
    scope: { tId: 11, sId: 101 },
}), null);
assert.equal(parseAnswerlatticeChatAnalyticsDay({
    id: '11_101_2026-07-10',
    value: { ...validDay, sourceSessionCount: -1 },
    scope: { tId: 11, sId: 101 },
}), null);

assert.equal(normalizeAnswerlatticeAnalyticsDays(500), 90);
assert.equal(normalizeAnswerlatticeAnalyticsDays(0, 30), 30);
assert.equal(normalizeAnswerlatticeAnalyticsPageSize(500), 50);
assert.equal(normalizeAnswerlatticeAnalyticsPageSize('bad', 20), 20);
assert.ok(parseAnswerlatticeAnalyticsDateRange({
    start: new Date('2026-07-01T00:00:00.000Z'),
    end: new Date('2026-07-10T00:00:00.000Z'),
}));
assert.equal(parseAnswerlatticeAnalyticsDateRange({
    start: new Date('2026-07-10T00:00:00.000Z'),
    end: new Date('2026-07-01T00:00:00.000Z'),
}), null);

const now = new Date('2026-07-11T12:00:00.000Z');
assert.deepEqual(getAnswerlatticeAnalyticsQueryWindow({
    start: new Date('2026-07-01T00:00:00.000Z'),
    end: new Date('2026-07-10T00:00:00.000Z'),
}, now), {
    startDateKey: '2026-07-01',
    endDateKey: '2026-07-10',
    historicalEndDateKey: '2026-07-10',
    includesToday: false,
    dayCount: 10,
});
assert.deepEqual(getAnswerlatticeAnalyticsQueryWindow({
    start: new Date('2026-07-11T00:00:00.000Z'),
    end: new Date('2026-07-11T00:00:00.000Z'),
}, now), {
    startDateKey: '2026-07-11',
    endDateKey: '2026-07-11',
    historicalEndDateKey: null,
    includesToday: true,
    dayCount: 1,
});
assert.equal(getAnswerlatticeAnalyticsQueryWindow({
    start: new Date('2026-07-01T00:00:00.000Z'),
    end: new Date('2026-07-12T00:00:00.000Z'),
}, now), null, 'future analytics windows must fail closed');
assert.equal(getAnswerlatticeAnalyticsQueryWindow({
    start: new Date('2026-04-12T00:00:00.000Z'),
    end: new Date('2026-07-11T00:00:00.000Z'),
}, now), null, 'more than 90 inclusive analytics days must fail closed');

const scope = { tenantId: 11, storeId: 101 };
assert.deepEqual(getAnswerlatticeCompletedWeeklyWindows(new Date('2026-07-11T23:59:59.999Z')), {
    weekStart: '2026-07-04',
    weekEnd: '2026-07-10',
    previousWeekStart: '2026-06-27',
    previousWeekEnd: '2026-07-03',
});
assert.deepEqual(getAnswerlatticeCompletedWeeklyWindows(new Date('2024-03-01T00:00:00.000Z'), 1), {
    weekStart: '2024-02-29',
    weekEnd: '2024-02-29',
    previousWeekStart: '2024-02-28',
    previousWeekEnd: '2024-02-28',
});
assert.equal(getAnswerlatticeCompletedWeeklyWindows(new Date('invalid')), null);
assert.equal(getAnswerlatticeCompletedWeeklyWindows(new Date('2026-07-11T00:00:00.000Z'), 32), null);
const generatedAt = { seconds: 1_720_000_000, nanoseconds: 0 };
const validWeekly = {
    pId: 'AL',
    tId: '11',
    sId: '101',
    weekStart: '2026-07-01',
    weekEnd: '2026-07-07',
    narrative: '  A useful weekly summary.  ',
    highlights: ['Stable answers'],
    recommendations: ['Review one gap'],
    keyMetrics: {
        volumeChange: 2.5,
        satisfactionChange: -1,
        topCategory: 'Billing',
    },
    sourceCompleteness: {
        currentDays: 7,
        previousDays: 7,
        currentWeekComplete: true,
        comparisonComplete: true,
    },
    generatedAt,
    generationMode: 'deterministic',
};
const parsedWeekly = parseAnswerlatticeWeeklySummary(validWeekly, scope);
assert.equal(parsedWeekly?.narrative, 'A useful weekly summary.');
assert.equal(parsedWeekly?.keyMetrics.volumeChangePercent, 2.5);
assert.equal(parsedWeekly?.keyMetrics.positiveFeedbackSharePointChange, -1);
assert.equal(parsedWeekly?.sourceCompleteness.comparisonComplete, true);
assert.equal(parseAnswerlatticeWeeklySummary({ ...validWeekly, pId: 'ML' }, scope), null);
assert.equal(parseAnswerlatticeWeeklySummary({ ...validWeekly, tId: '12' }, scope), null);
assert.equal(parseAnswerlatticeWeeklySummary({ ...validWeekly, weekEnd: '2026-07-08' }, scope), null);
assert.equal(parseAnswerlatticeWeeklySummary({ ...validWeekly, generationMode: 'model_assisted' }, scope), null);
const parsedWeeklyWithoutComparison = parseAnswerlatticeWeeklySummary({
    ...validWeekly,
    sourceCompleteness: {
        currentDays: 7,
        previousDays: 0,
        currentWeekComplete: true,
        comparisonComplete: false,
    },
}, scope);
assert.equal(parsedWeeklyWithoutComparison?.sourceCompleteness.currentWeekComplete, true);
assert.equal(parsedWeeklyWithoutComparison?.sourceCompleteness.comparisonComplete, false);
assert.equal(parseAnswerlatticeWeeklySummary({
    ...validWeekly,
    sourceCompleteness: {
        currentDays: 6,
        previousDays: 7,
        currentWeekComplete: true,
        comparisonComplete: true,
    },
}, scope), null);
const currentWeekly = parseAnswerlatticeWeeklySummary({
    ...validWeekly,
    schemaVersion: 2,
    keyMetrics: {
        volumeChangePercent: null,
        positiveFeedbackSharePointChange: null,
        topCategory: 'Billing',
    },
}, scope);
assert.equal(currentWeekly?.keyMetrics.volumeChangePercent, null);
assert.equal(currentWeekly?.keyMetrics.positiveFeedbackSharePointChange, null);
assert.equal(parseAnswerlatticeWeeklySummary({
    ...validWeekly,
    keyMetrics: { ...validWeekly.keyMetrics, volumeChange: Number.NaN },
}, scope), null);
assert.equal(parseAnswerlatticeWeeklySummary({ ...validWeekly, generatedAt: {} }, scope), null);
const legacyDeterministicWeekly = parseAnswerlatticeWeeklySummary({
    ...validWeekly,
    sourceCompleteness: undefined,
}, scope);
assert.deepEqual(legacyDeterministicWeekly?.sourceCompleteness, {
    currentDays: null,
    previousDays: null,
    currentWeekComplete: false,
    comparisonComplete: false,
});
assert.equal(getAnswerlatticeWeeklySummaryFreshness({
    ...parsedWeekly!,
    generatedAt: '2026-07-08T12:00:00.000Z',
}, new Date('2026-07-11T12:00:00.000Z')).state, 'current');
assert.equal(getAnswerlatticeWeeklySummaryFreshness({
    ...parsedWeekly!,
    generatedAt: '2026-06-01T12:00:00.000Z',
}, new Date('2026-07-11T12:00:00.000Z')).state, 'stale');
assert.equal(getAnswerlatticeWeeklySummaryFreshness({
    ...parsedWeekly!,
    generatedAt: '2026-07-12T12:00:00.000Z',
}, new Date('2026-07-11T12:00:00.000Z')).state, 'future');

const validFeedback = {
    pId: 'AL',
    tId: '11',
    sId: '101',
    date: '2026-07-11',
    themes: [{
        theme: 'Billing confusion',
        count: 2,
        severity: 'medium',
        examples: ['Where is my invoice?'],
        suggestedActions: ['Clarify the billing article.'],
    }],
    summary: 'Two related comments.',
    topIssues: ['Invoice discovery'],
    recommendations: ['Improve navigation'],
    generatedAt,
};
assert.equal(parseAnswerlatticeFeedbackIntelligence(validFeedback, scope)?.themes[0].count, 2);
assert.equal(parseAnswerlatticeFeedbackIntelligence({ ...validFeedback, pId: 'ML' }, scope), null);
assert.equal(parseAnswerlatticeFeedbackIntelligence({
    ...validFeedback,
    themes: [{ ...validFeedback.themes[0], severity: 'urgent' }],
}, scope), null);
assert.equal(parseAnswerlatticeFeedbackIntelligence({ ...validFeedback, date: '2026-02-30' }, scope), null);

process.stdout.write('Answerlattice chat analytics contracts passed.\n');
