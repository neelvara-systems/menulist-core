import assert from 'node:assert/strict';
import {
  projectOwnerActionPlanAiResponse,
  type OwnerActionCandidate,
} from '../../functions/src/services/gemini/ownerActionPlan';
import {
  generateDailyOwnerDashboardFallback,
  generateMonthlyOwnerDashboardFallback,
  generateOwnerDashboardFallbackSummary,
  parseOwnerDashboardGeminiResponse,
  type DailyDashboardMetrics,
  type MonthlyDashboardMetrics,
  type OwnerDashboardMetrics,
} from '../../functions/src/services/gemini/ownerDashboardSummary';
import {
  parseKBQualityResponse,
  parseKBStoreQualityResponse,
  type KBQualityStoreInput,
} from '../../functions/src/services/gemini/kbQuality';

const candidates: OwnerActionCandidate[] = [
  {
    id: 'action-1',
    type: 'menu_attention',
    title: 'Check the top item',
    description: 'Review the item customers open most.',
    reason: 'This item received the most clicks.',
    actionLabel: 'Review item',
    metricLabel: '12 clicks',
    priority: 'high',
  },
  {
    id: 'action-2',
    type: 'menu_search',
    title: 'Check an unanswered search',
    description: 'See whether this item belongs on the menu.',
    reason: 'Customers searched for it five times.',
    actionLabel: 'Review searches',
    metricLabel: '5 searches',
    priority: 'medium',
  },
];

const partial = projectOwnerActionPlanAiResponse(candidates, [{
  id: 'action-1',
  title: ' Review the popular item ',
  description: 'Open the item customers select most.',
  reason: 'It has the highest click count.',
  type: 'attacker-overwrite',
  priority: 'low',
  actionLabel: 'Delete everything',
  privatePayload: { leak: true },
}]);

assert.equal(partial.usedAiWording, true);
assert.equal(partial.actions.length, candidates.length, 'a partial model response must not remove a rule-selected action');
assert.deepEqual(partial.actions[1], candidates[1], 'an omitted action must retain its complete rule-generated card');
assert.deepEqual(partial.actions[0], {
  ...candidates[0],
  title: 'Review the popular item',
  description: 'Open the item customers select most.',
  reason: 'It has the highest click count.',
});

const malformed = projectOwnerActionPlanAiResponse(candidates, [
  null,
  { id: 'unknown-action', title: 'Injected action' },
  { id: 'action-1', title: { instruction: 'replace title' }, description: [], reason: 42 },
  { id: 'action-1', title: 'Duplicate must not win' },
]);

assert.equal(malformed.usedAiWording, false);
assert.deepEqual(malformed.actions, candidates, 'malformed, unknown and duplicate provider fields must fail back to rules');

assert.deepEqual(
  parseOwnerDashboardGeminiResponse(JSON.stringify({
    bulletPoints: [
      ' First valid bullet ',
      { privatePayload: true },
      '',
      'Second\nvalid\tbullet',
      42,
      'Third valid bullet',
    ],
    privatePayload: { leak: true },
  }), 2),
  { bulletPoints: ['First valid bullet', 'Second valid bullet'] },
);
assert.throws(
  () => parseOwnerDashboardGeminiResponse('{"bulletPoints":[{"text":"not a string"}]}'),
  /GEMINI_OWNER_DASHBOARD_PARSE_FAILED/,
);

const blockPerformance = {
  popular: { rendered: 3, clicks: 1 },
  quickPick: { rendered: 2, clicks: 1 },
  bestValue: { rendered: 1, clicks: 1 },
};
const weeklyMetrics: OwnerDashboardMetrics = {
  period: 'last_7_days',
  weekStart: '2026-07-20',
  weekEnd: '2026-07-26',
  menuVisits: 20,
  menuVisitsChange: 10,
  itemClicks: 12,
  searches: 4,
  zeroResultSearches: 1,
  unavailableItemTaps: 2,
  menuActionClicks: 3,
  topSearchTerm: { term: 'dosa', count: 4 },
  topUnavailableItem: { itemId: 'item-1', taps: 2 },
  topMenuAction: { action: 'call', count: 3 },
  smartPicksRendered: 10,
  smartPicksClicks: 2,
  topItems: [{ itemId: 'item-2', clicks: 5 }],
  blockPerformance,
};
const weeklyFallback = generateOwnerDashboardFallbackSummary(weeklyMetrics);
assert.equal(weeklyFallback.bulletPoints.length, 5);
assert.equal((weeklyFallback.markdown.match(/^• /gm) || []).length, 5);

const dailyMetrics: DailyDashboardMetrics = {
  ...weeklyMetrics,
  period: 'yesterday',
  date: '2026-07-26',
};
const dailyFallback = generateDailyOwnerDashboardFallback(dailyMetrics);
assert.equal(dailyFallback.bulletPoints.length, 2);
assert.equal((dailyFallback.markdown.match(/^• /gm) || []).length, 2);

const monthlyMetrics: MonthlyDashboardMetrics = {
  ...weeklyMetrics,
  period: 'last_month',
  monthStart: '2026-06-01',
  monthEnd: '2026-06-30',
  daysWithData: 30,
};
const monthlyFallback = generateMonthlyOwnerDashboardFallback(monthlyMetrics);
assert.equal(monthlyFallback.bulletPoints.length, 3);
assert.equal((monthlyFallback.markdown.match(/^• /gm) || []).length, 3);

assert.deepEqual(parseKBQualityResponse(JSON.stringify({
  qualityScore: 82.4,
  priority: 'high',
  issues: [{
    type: 'negative_feedback',
    queries: [' Query one ', { privatePayload: true }],
    suggestions: ['Clarify the return window.', 42],
    privatePayload: 'drop-me',
  }],
  improvementSuggestions: [' Add a clear example. ', { privatePayload: true }],
  privatePayload: { leak: true },
})), {
  qualityScore: 82,
  priority: 'high',
  issues: [{
    type: 'negative_feedback',
    queries: ['Query one'],
    suggestions: ['Clarify the return window.'],
  }],
  improvementSuggestions: ['Add a clear example.'],
});
assert.throws(
  () => parseKBQualityResponse('{"qualityScore":"100","issues":[],"improvementSuggestions":[]}'),
  /GEMINI_KB_QUALITY_PARSE_FAILED/,
);

const kbStoreInput: KBQualityStoreInput = {
  dataRange: { start: '2026-07-01', end: '2026-07-27' },
  articles: [{
    articleRef: 'A1',
    title: 'Returns',
    contentLength: 200,
    lowConfidenceQueries: [],
    negativeFeedback: [],
    noAnswerQueries: [],
  }],
};
const projectedStoreQuality = parseKBStoreQualityResponse(JSON.stringify({
  qualityScore: 74,
  priority: 'medium',
  summary: ' Clear summary ',
  topIssues: ['Missing example', { privatePayload: true }],
  improvementSuggestions: ['Add an example'],
  articles: [
    {
      articleRef: 'UNKNOWN',
      qualityScore: 100,
      issues: [],
      improvementSuggestions: [],
      priority: 'low',
    },
    {
      articleRef: 'A1',
      qualityScore: 70,
      issues: [],
      improvementSuggestions: ['Clarify timing'],
      priority: 'medium',
      privatePayload: 'drop-me',
    },
  ],
}), kbStoreInput);
assert.equal(projectedStoreQuality.articles.length, 1);
assert.equal(projectedStoreQuality.articles[0].articleRef, 'A1');
assert.equal(projectedStoreQuality.articles[0].qualityScore, 70);
assert.deepEqual(projectedStoreQuality.topIssues, ['Missing example']);

console.log('Owner action plan boundary tests passed.');
