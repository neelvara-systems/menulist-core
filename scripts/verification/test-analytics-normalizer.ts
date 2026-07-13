import assert from 'node:assert/strict';
import { METRIC_KEYS } from '../../src/lib/analytics/registry';
import {
    aggregateMetrics,
    getMetricValue,
    normalizeChartData,
    normalizeFirestoreDoc,
    normalizeKnowledgeGaps,
    normalizeTopQuestions,
    validateNormalizedMetrics,
} from '../../src/lib/analytics/normalizer';

const normalized = normalizeFirestoreDoc({
    id: '11_101_2026-07-11',
    tId: '11',
    sId: '101',
    date: '2026-07-11',
    totalChats: 4,
    totalMessages: Number.NaN,
    satisfactionRate: -1,
    lastUpdated: { seconds: 1_720_000_000 },
});
assert.equal(normalized.metrics[METRIC_KEYS.TOTAL_CHATS], 4);
assert.equal(normalized.metrics[METRIC_KEYS.TOTAL_MESSAGES], 0);
assert.equal(normalized.metrics[METRIC_KEYS.SATISFACTION_RATE], 0);
assert.equal(normalized.metadata.lastUpdated, 1_720_000_000_000);
assert.equal(validateNormalizedMetrics(normalized), true);
assert.equal(validateNormalizedMetrics({ ...normalized, date: '2026-02-30' }), false);
assert.equal(validateNormalizedMetrics({
    ...normalized,
    metrics: { ...normalized.metrics, bad: Number.POSITIVE_INFINITY },
}), false);

const chart = normalizeChartData([{
    date: '2026-07-11',
    count: 7,
    label: '  Lunch\u0000 views  ',
    constructor: 'drop',
}, {
    date: 'invalid',
    count: -1,
}, null]);
assert.equal(chart.length, 2);
assert.equal(chart[0].count, 7);
assert.equal(chart[0].label, 'Lunch views');
assert.equal(Object.prototype.hasOwnProperty.call(chart[0], 'constructor'), false);
assert.equal(chart[1].count, 0);
assert.match(chart[1].date, /^\d{4}-\d{2}-\d{2}$/);

const gaps = normalizeKnowledgeGaps([
    { question: '  Missing answer ', count: 12, examples: ['  First\u0000 example ', 7] },
    { question: 'Invalid count', count: '2' },
]);
assert.equal(gaps.length, 1);
assert.equal(gaps[0].severity, 'high');
assert.deepEqual(gaps[0].examples, ['First example']);

const questions = normalizeTopQuestions([
    { question: ' Where is billing? ', count: 2, category: ' Billing ', lastAsked: '2026-07-11' },
    { question: '', count: 1 },
]);
assert.deepEqual(questions, [{
    question: 'Where is billing?',
    count: 2,
    category: 'Billing',
    lastAsked: '2026-07-11',
}]);

const aggregate = aggregateMetrics([
    {
        ...normalized,
        id: 'first',
        metrics: { [METRIC_KEYS.SATISFACTION_RATE]: 80, [METRIC_KEYS.TOTAL_CHATS]: 2 },
    },
    {
        ...normalized,
        id: 'second',
        metrics: { [METRIC_KEYS.TOTAL_CHATS]: 3 },
    },
]);
assert.equal(
    aggregate[METRIC_KEYS.SATISFACTION_RATE],
    80,
    'missing daily rates must not dilute the observed rate average',
);
assert.equal(aggregate[METRIC_KEYS.TOTAL_CHATS], 5);
assert.equal(getMetricValue({ ...normalized, metrics: { bad: Number.NaN } }, 'bad', 9), 9);
assert.equal(getMetricValue(null, 'bad', Number.NaN), 0);

process.stdout.write('Analytics normalizer tests passed.\n');
