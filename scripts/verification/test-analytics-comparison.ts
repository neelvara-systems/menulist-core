import assert from 'node:assert/strict';
import {
    calculateCategoryDistribution,
    calculateFirstResponseTime,
    calculatePeakHours,
    calculateResolutionRate,
    compareMetrics,
    getComparisonDateRange,
    type AnalyticsSummary,
} from '../../src/lib/analytics/comparison';

const toDateKey = (value: Date) => value.toISOString().slice(0, 10);
const custom = getComparisonDateRange(
    'custom',
    new Date('2026-07-01T18:30:00.000Z'),
    new Date('2026-07-07T23:59:59.999Z'),
);
assert.equal(toDateKey(custom.start), '2026-06-24');
assert.equal(toDateKey(custom.end), '2026-06-30');

const nonLeapMonthEnd = getComparisonDateRange(
    'mom',
    new Date('2026-03-31T00:00:00.000Z'),
    new Date('2026-03-31T00:00:00.000Z'),
);
assert.equal(toDateKey(nonLeapMonthEnd.start), '2026-02-28');
assert.equal(toDateKey(nonLeapMonthEnd.end), '2026-02-28');
const leapMonthEnd = getComparisonDateRange(
    'mom',
    new Date('2024-03-31T00:00:00.000Z'),
    new Date('2024-03-31T00:00:00.000Z'),
);
assert.equal(toDateKey(leapMonthEnd.start), '2024-02-29');
assert.throws(
    () => getComparisonDateRange('wow', new Date('invalid'), new Date('2026-01-01T00:00:00.000Z')),
    /analytics_comparison_date_range_invalid/,
);

const summary = (overrides: Partial<AnalyticsSummary>): AnalyticsSummary => ({
    totalChats: 0,
    positiveFeedbackShare: null,
    avgMessagesPerChat: 0,
    totalMessages: 0,
    totalFeedback: 0,
    positiveCount: 0,
    negativeCount: 0,
    ...overrides,
});
const fromZero = compareMetrics(summary({ totalChats: 5 }), summary({ totalChats: 0 }));
assert.equal(fromZero.volume.changePercent, 100);
assert.equal(fromZero.volume.trend, 'up');
const malformedMetric = compareMetrics(
    summary({ totalChats: Number.NaN }),
    summary({ totalChats: Number.POSITIVE_INFINITY }),
);
assert.deepEqual(malformedMetric.volume, {
    current: 0,
    previous: 0,
    change: 0,
    changePercent: 0,
    displayChange: 0,
    changeUnit: 'percent',
    available: true,
    trend: 'stable',
    isPositive: true,
});
const feedbackShare = compareMetrics(
    summary({ positiveFeedbackShare: 80, totalFeedback: 10 }),
    summary({ positiveFeedbackShare: 50, totalFeedback: 10 }),
);
assert.equal(feedbackShare.positiveFeedbackShare.change, 30);
assert.equal(feedbackShare.positiveFeedbackShare.displayChange, 30);
assert.equal(feedbackShare.positiveFeedbackShare.changeUnit, 'percentage-points');
assert.equal(feedbackShare.positiveFeedbackShare.available, true);
const unavailableFeedbackShare = compareMetrics(
    summary({ positiveFeedbackShare: 80, totalFeedback: 10 }),
    summary({ positiveFeedbackShare: null, totalFeedback: 0 }),
);
assert.equal(unavailableFeedbackShare.positiveFeedbackShare.available, false);
assert.equal(unavailableFeedbackShare.positiveFeedbackShare.displayChange, null);

assert.equal(calculateFirstResponseTime([
    { role: 'assistant', timestamp: new Date('2026-07-01T09:00:00.000Z') },
    { role: 'assistant', timestamp: new Date('2026-07-01T10:00:05.000Z') },
    { role: 'user', timestamp: new Date('2026-07-01T10:00:00.000Z') },
]), 5, 'only an assistant response after the first user message counts');
assert.equal(calculateFirstResponseTime([
    { role: 'user', timestamp: new Date('invalid') },
    { role: 'assistant', timestamp: new Date('2026-07-01T10:00:05.000Z') },
]), 0);

assert.equal(calculateResolutionRate(12, 10), 100);
assert.equal(calculateResolutionRate(-2, 10), 0);
assert.equal(calculateResolutionRate(Number.NaN, 10), 0);
assert.equal(calculateResolutionRate(2, 0), 0);

const peakHours = calculatePeakHours([
    new Date('2026-07-01T23:15:00.000Z'),
    new Date('invalid'),
]);
assert.equal(peakHours.length, 24);
assert.equal(peakHours[23].count, 1);
assert.equal(peakHours.reduce((total, hour) => total + hour.count, 0), 1);

assert.deepEqual(calculateCategoryDistribution([
    { name: 'Valid', count: 2 },
    { name: 'Negative', count: -1 },
    { name: 'Malformed', count: Number.NaN },
]), [
    { name: 'Valid', count: 2, percentage: 100 },
    { name: 'Malformed', count: 0, percentage: 0 },
    { name: 'Negative', count: 0, percentage: 0 },
]);

process.stdout.write('Analytics comparison tests passed.\n');
