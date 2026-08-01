import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { writeOwnerBusinessHealthDocs } from '../../functions/src/ownerBusinessAssistant/ownerBusinessHealthWriters';
import {
  buildOwnerBusinessAnalyticsPeriod,
  isOwnerBusinessAnalyticsDailyInScope,
  isOwnerBusinessAnalyticsDashboardInScope,
} from '../../functions/src/ownerBusinessAssistant/buildOwnerBusinessAnalyticsIndex';
import {
  getOwnerBusinessFeedbackProjectName,
  projectOwnerBusinessFeedbackFact,
} from '../../functions/src/ownerBusinessAssistant/buildOwnerBusinessFeedbackSummary';
import {
  OWNER_BUSINESS_ASSISTANT_CACHE,
  OWNER_BUSINESS_ASSISTANT_ENDPOINTS,
} from '@lib/ownerBusinessAssistant/constants';
import {
  parseOwnerBusinessAnalyticsIndexDoc,
  parseOwnerBusinessHealthCurrentDoc,
} from '@lib/ownerBusinessAssistant/readModelBoundary';
import {
  OWNER_BUSINESS_ASSISTANT_THREAD_ID_PATTERN,
  normalizeOwnerBusinessAssistantThreadId,
} from '@lib/ownerBusinessAssistant/threadIdBoundary';
import {
  normalizeOwnerBusinessAssistantProjectId,
} from '@lib/ownerBusinessAssistant/projectIdBoundary';
import {
  buildOwnerBusinessAssistantPacketCacheKey,
  parseCachedOwnerBusinessAssistantPacket,
} from '@lib/ownerBusinessAssistant/server/contextPacketCache';
import { buildOwnerBusinessDomainCapabilities } from '@lib/ownerBusinessAssistant/server/domainCapabilityMatrix';
import { buildOwnerBusinessAssistantRefusal } from '@lib/ownerBusinessAssistant/server/refusals';
import { resolveOwnerBusinessAnalyticsPeriod } from '@lib/ownerBusinessAssistant/server/analyticsPeriodResolver';
import {
  buildOwnerBusinessActivityMetrics,
  getOwnerBusinessCheckActionLabel,
  getOwnerBusinessCheckOwnerMessage,
  getOwnerBusinessPrimaryAnalyticsPeriod,
} from '@lib/ownerBusinessAssistant/businessSignals';
import type {
  OwnerBusinessAnalyticsPeriod,
  OwnerBusinessHealthCheck,
  OwnerBusinessHealthCurrentDoc,
} from '@lib/ownerBusinessAssistant/types';
import {
  OwnerBusinessAssistantAnswerRequestSchema,
  OwnerBusinessAssistantFeedbackRequestSchema,
} from '@lib/ownerBusinessAssistant/schemas';
import {
  projectOwnerBusinessAssistantAnalyticsResponse,
  projectOwnerBusinessAssistantCurrentResponse,
  projectOwnerBusinessAssistantLocationsResponse,
} from '@lib/ownerBusinessAssistant/clientResponses';
import {
  projectOwnerBusinessAssistantAnswerResponse,
} from '@lib/ownerBusinessAssistant/answerResponseBoundary';

const repoRoot = process.cwd();

const health: OwnerBusinessHealthCurrentDoc = {
  version: 1,
  tId: '1',
  sId: '2',
  localDate: '2026-06-08',
  generatedAt: '2026-06-08T00:00:00.000Z',
  sourceWindow: { today: '2026-06-08' },
  status: 'stable',
  summary: {
    headline: 'Business looks stable',
    ownerMessage: 'MenuList did not find anything that needs action in the latest check.',
    noActionNeeded: true,
    actionCount: 0,
  },
  feedbackSummary: {
    version: 1,
    status: 'stable',
    localDate: '2026-06-08',
    generatedAt: '2026-06-08T00:00:00.000Z',
    windowDays: 90,
    sampledCount: 1,
    truncated: false,
    periods: {
      last30Days: {
        key: 'last30Days',
        label: 'Last 30 days',
        rangeLabel: '2026-05-10 to 2026-06-08',
        totalCount: 1,
        needsAttentionCount: 0,
        sourceFactIds: ['guest_feedback_test'],
      },
    },
    topThemes: [],
    latestNeedsAttention: [],
    latestFeedback: [{
      feedbackId: 'feedback-test',
      projectId: 'project-a',
      rating: 5,
      sourceFactId: 'guest_feedback_test',
    }],
    projectBreakdown: {
      'project-a': {
        projectId: 'project-a',
        totalCount: 1,
        needsAttentionCount: 0,
        sourceFactIds: ['guest_feedback_test'],
      },
    },
    sourceFactIds: ['guest_feedback_summary', 'guest_feedback_test'],
  },
  blocks: {},
  suggestedChecks: [],
  suggestedQuestions: [],
  supportedIntents: ['business_status'],
  supportedDomains: [{ domain: 'business_health', status: 'supported', sourceFactIds: ['health_current'] }],
  unsupportedData: {},
  sourceRefs: [{ id: 'health_current', source: 'platformSummary', docId: 'ownerBusinessHealthCurrent_1_2' }],
  cost: {
    builderReadCount: 0,
    builderWriteCount: 3,
    chatHotPathReadCount: 2,
  },
};

assert.deepEqual(projectOwnerBusinessAssistantCurrentResponse({ data: health }), { data: health });
assert.equal(projectOwnerBusinessAssistantCurrentResponse({ data: { ...health, version: '1' } }), null);
assert.deepEqual(projectOwnerBusinessAssistantAnalyticsResponse({ data: null }), { data: null });
assert.equal(projectOwnerBusinessAssistantAnalyticsResponse({ data: [] }), null);
assert.deepEqual(projectOwnerBusinessAssistantLocationsResponse({ data: { stores: [] } }), { data: { stores: [] } });
assert.equal(projectOwnerBusinessAssistantLocationsResponse({ data: { stores: [{}] } }), null);

const validAnswerResponse = {
  data: {
    answerId: '12345678-1234-1234-1234-123456789abc',
    status: 'answered',
    text: 'No action needed.',
    freshnessLabel: 'Stable. Uses the latest available MenuList data.',
    sourceFactIds: ['health_current'],
    artifacts: [{
      type: 'metric_row',
      metrics: [{ label: 'Menu visits', value: '12' }],
    }],
    suggestedQuestions: [{
      id: 'weekly_changes',
      label: 'Weekly changes',
      question: 'What changed this week?',
      intent: 'weekly_changes',
      domain: 'business_health',
    }],
    confidence: 'high',
    cache: {
      source: 'fresh_firestore',
      cacheKey: 'owner-business-assistant:packet:v1:1:2:p:_:profile:owner_question_basic',
    },
  },
};
assert.deepEqual(projectOwnerBusinessAssistantAnswerResponse(validAnswerResponse), validAnswerResponse);
assert.equal(projectOwnerBusinessAssistantAnswerResponse({ data: { ...validAnswerResponse.data, text: '' } }), null);
assert.equal(projectOwnerBusinessAssistantAnswerResponse({
  data: { ...validAnswerResponse.data, sourceFactIds: ['health_current', 'health_current'] },
}), null);
assert.equal(projectOwnerBusinessAssistantAnswerResponse({
  data: { ...validAnswerResponse.data, internalProviderPayload: { prompt: 'private' } },
}), null);
assert.equal(projectOwnerBusinessAssistantAnswerResponse({
  data: {
    ...validAnswerResponse.data,
    artifacts: [{ type: 'metric_row', metrics: [{ label: 'Menu visits', value: Number.NaN }] }],
  },
}), null);

const answerKey = buildOwnerBusinessAssistantPacketCacheKey({
  tId: 1,
  sId: 2,
  projectId: 'project-a',
  includeProjectInCacheKey: true,
  packetProfile: 'owner_question_basic',
});
const healthKey = buildOwnerBusinessAssistantPacketCacheKey({
  tId: 1,
  sId: 2,
  projectId: 'project-a',
  includeProjectInCacheKey: false,
  packetProfile: 'health_card',
});

assert.equal(OWNER_BUSINESS_ASSISTANT_ENDPOINTS.locations, '/api/owner-business-assistant/locations');
assert.equal(
  'action' in OWNER_BUSINESS_ASSISTANT_ENDPOINTS,
  false,
  'Business Health must not expose an action endpoint; Menu Manager owns operations',
);
assert.equal(OWNER_BUSINESS_ASSISTANT_CACHE.browserLocationsPrefix, 'ownerBusinessAssistant-locations');
assert.equal(OWNER_BUSINESS_ASSISTANT_CACHE.browserReadModelTtlMs, 10 * 60 * 1000);
assert.equal(OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketIndexPrefix, 'owner-business-assistant:packet-index:v1');
assert.match('oba_12345678-1234-1234-1234-123456789abc', OWNER_BUSINESS_ASSISTANT_THREAD_ID_PATTERN);
assert.equal(
  normalizeOwnerBusinessAssistantThreadId('oba_12345678-1234-1234-1234-123456789abc'),
  'oba_12345678-1234-1234-1234-123456789abc',
);
assert.equal(normalizeOwnerBusinessAssistantProjectId('menu_123'), 'menu_123');
assert.equal(normalizeOwnerBusinessAssistantProjectId(' menu_123'), null);
assert.equal(normalizeOwnerBusinessAssistantThreadId('__oba_bad__'), null);
assert.equal(normalizeOwnerBusinessAssistantThreadId('oba_bad/path'), null);
assert.equal(normalizeOwnerBusinessAssistantThreadId(' oba_12345678-1234-1234-1234-123456789abc'), null);
assert.match(answerKey, new RegExp(`${OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketPrefix}:1:2:p:project-a:profile:owner_question_basic`));
assert.match(healthKey, new RegExp(`${OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketPrefix}:1:2:p:_:profile:health_card`));
assert.notEqual(answerKey, healthKey, 'packet profiles must create separate cache keys');

const projectedHealth = parseOwnerBusinessHealthCurrentDoc({
  ...health,
  kind: 'ownerBusinessHealthCurrent',
  expiresAt: { seconds: 1 },
  internalOnly: 'drop-me',
  summary: {
    ...health.summary,
    internalSummaryField: 'drop-me',
  },
}, { tId: '1', sId: '2' });
assert.ok(projectedHealth);
assert.equal('kind' in projectedHealth, false);
assert.equal('expiresAt' in projectedHealth, false);
assert.equal('internalOnly' in projectedHealth, false);
assert.equal('internalSummaryField' in projectedHealth.summary, false);
assert.equal(parseOwnerBusinessHealthCurrentDoc(health, { tId: 'other', sId: '2' }), null);
assert.equal(parseOwnerBusinessHealthCurrentDoc({ ...health, sourceRefs: 'invalid' }, { tId: '1', sId: '2' }), null);

const projectedAnalytics = parseOwnerBusinessAnalyticsIndexDoc({
  version: 1,
  tId: '1',
  sId: '2',
  localDate: health.localDate,
  generatedAt: health.generatedAt,
  periods: {},
  unsupportedPeriods: {},
  sourceRefs: [],
  cost: { builderReadCount: 0, hotPathReadCount: 1 },
  kind: 'ownerBusinessAnalyticsIndex',
  expiresAt: { seconds: 1 },
}, { tId: '1', sId: '2' });
assert.ok(projectedAnalytics);
assert.equal('kind' in projectedAnalytics, false);
assert.equal('expiresAt' in projectedAnalytics, false);

const analyticsSourceScope = {
  tId: '1',
  sId: '2',
  projectId: 'menu-project',
  localDate: '2026-06-08',
};
assert.equal(isOwnerBusinessAnalyticsDashboardInScope({
  ...analyticsSourceScope,
  kind: 'ownerDashboardSummary',
  generatedForLocalDate: analyticsSourceScope.localDate,
}, analyticsSourceScope), true);
assert.equal(isOwnerBusinessAnalyticsDashboardInScope({
  ...analyticsSourceScope,
  sId: '3',
  kind: 'ownerDashboardSummary',
  generatedForLocalDate: analyticsSourceScope.localDate,
}, analyticsSourceScope), false, 'foreign dashboard store scope must fail before owner index projection');
assert.equal(isOwnerBusinessAnalyticsDashboardInScope({
  ...analyticsSourceScope,
  kind: 'ownerDashboardSummary',
  generatedForLocalDate: '2026-06-07',
}, analyticsSourceScope), false, 'stale dashboard generation scope must fail before owner index projection');
assert.equal(isOwnerBusinessAnalyticsDailyInScope({
  ...analyticsSourceScope,
  analyticsScope: 'customer',
  grain: 'daily',
  surface: 'menu',
  date: analyticsSourceScope.localDate,
  localDate: analyticsSourceScope.localDate,
}, analyticsSourceScope), true);
assert.equal(isOwnerBusinessAnalyticsDailyInScope({
  ...analyticsSourceScope,
  analyticsScope: 'customer',
  grain: 'daily',
  surface: 'menu',
  date: analyticsSourceScope.localDate,
  localDate: '2026-06-07',
}, analyticsSourceScope), false, 'mismatched daily date aliases must fail before owner index projection');
assert.equal(isOwnerBusinessAnalyticsDailyInScope({
  ...analyticsSourceScope,
  analyticsScope: 'customer',
  grain: 'daily',
  surface: 'obp',
  date: analyticsSourceScope.localDate,
  localDate: analyticsSourceScope.localDate,
}, analyticsSourceScope), false, 'wrong-surface daily rows must fail before owner index projection');

const projectedPersistedPeriod = buildOwnerBusinessAnalyticsPeriod({
  key: 'today',
  label: 'Today',
  rangeLabel: '2026-06-08',
  scope: 'store',
  sourceFactIds: ['analytics_test'],
  source: {
    metrics: {
      menuVisits: 12,
      itemClicks: -4,
    },
    topItems: [
      { itemId: 'item-1', name: { en: 'Dosa' }, clicks: 3, privatePayload: 'drop-me' },
      { itemId: { attacker: true }, clicks: 99 },
    ],
    topCategories: [
      { categoryId: 'category-1', name: 'Breakfast', views: 4, privatePayload: 'drop-me' },
      { categoryId: '', views: 12 },
    ],
    topSearchTerms: [
      { term: ' masala dosa ', count: 2, privatePayload: 'drop-me' },
      { term: { attacker: true }, count: 100 },
    ],
    sourceQuality: [
      { source: 'direct', visits: 8, actionRate: 0.25, privatePayload: 'drop-me' },
      { source: 'invalid-rate', visits: 2, actionRate: 4 },
      { source: { attacker: true }, visits: 20 },
    ],
  },
});
assert.ok(projectedPersistedPeriod);
assert.equal(projectedPersistedPeriod.metrics.menuVisits, 12);
assert.equal(projectedPersistedPeriod.metrics.itemClicks, 0, 'negative persisted counters must not reach the owner read model');
assert.deepEqual(projectedPersistedPeriod.topItems, [{
  itemId: 'item-1',
  name: 'Dosa',
  value: 3,
  signal: 'clicks',
}]);
assert.deepEqual(projectedPersistedPeriod.topCategories, [{
  categoryId: 'category-1',
  name: 'Breakfast',
  value: 4,
}]);
assert.deepEqual(projectedPersistedPeriod.topSearches, [{ term: 'masala dosa', count: 2 }]);
assert.deepEqual(projectedPersistedPeriod.sourceQuality, [
  { source: 'direct', visits: 8, actionRate: 0.25 },
  { source: 'invalid-rate', visits: 2 },
]);
assert.equal(
  getOwnerBusinessFeedbackProjectName({
    projectId: 'menu-1',
    data: { projectName: { en: 'Localized menu name' } },
  }),
  'Localized menu name',
  'localized project names must survive feedback-summary projection',
);

const projectedCachePacket = parseCachedOwnerBusinessAssistantPacket({
  version: 1,
  packetId: 'packet-test',
  cacheKey: answerKey,
  tId: '1',
  sId: '2',
  projectId: 'project-a',
  localBusinessDate: health.localDate,
  validUntil: '2026-06-09T00:00:00.000Z',
  generatedAt: health.generatedAt,
  sourceSignatures: {},
  health: {
    ...health,
    kind: 'ownerBusinessHealthCurrent',
    expiresAt: { seconds: 1 },
  },
  answerRules: {
    refuseUnsupported: true,
    sourceFactIdsRequired: true,
    noRevenueProfitWithoutSource: true,
  },
  internalPacketField: 'drop-me',
}, answerKey);
assert.ok(projectedCachePacket);
assert.equal('internalPacketField' in projectedCachePacket, false);
assert.equal('kind' in projectedCachePacket.health, false);
assert.equal(parseCachedOwnerBusinessAssistantPacket({
  ...projectedCachePacket,
  tId: 'other',
}, answerKey), null);

const refusal = buildOwnerBusinessAssistantRefusal({
  answerId: 'answer-test',
  reason: 'MenuList does not have verified revenue data for that yet.',
  alternative: 'I can show customer attention instead.',
});
assert.match(refusal.text, /customer attention/);

const capabilities = buildOwnerBusinessDomainCapabilities({ health });
assert.equal(capabilities.find((entry) => entry.domain === 'business_health')?.status, 'supported');
assert.equal(capabilities.find((entry) => entry.domain === 'analytics')?.status, 'unsupported');
assert.equal(capabilities.find((entry) => entry.domain === 'billing')?.status, 'summary_only');

const lastMonthPeriod: OwnerBusinessAnalyticsPeriod = {
  key: 'lastMonth',
  label: 'Last month',
  rangeLabel: '2026-05-01 to 2026-05-31',
  scope: 'store',
  status: 'available',
  metrics: { menuVisits: 10 },
  topItems: [{ itemId: 'item-a', name: 'Paneer Wrap', value: 5, signal: 'views' }],
  sourceQuality: [
    { source: 'instagram_link', visits: 7, actionRate: 0.4 },
    { source: 'qr_table', visits: 2, actionRate: 1 },
  ],
  freshnessLabel: 'Latest settled data',
  sourceFactIds: ['analytics_test'],
};
assert.equal(
  getOwnerBusinessPrimaryAnalyticsPeriod({ lastMonth: lastMonthPeriod }),
  null,
  'dashboard activity should not invent a primary period from unsupported fallback order',
);
const activityMetrics = buildOwnerBusinessActivityMetrics(lastMonthPeriod);
assert.equal(activityMetrics.find((metric) => metric.key === 'top-demand')?.detail, 'Promote: 5 views');
assert.equal(activityMetrics.find((metric) => metric.key === 'best-source')?.detail, 'Update link: 7 visits');
const unavailableCheck: OwnerBusinessHealthCheck = {
  id: 'unavailable_item_taps',
  title: 'Check unavailable items',
  message: '3 taps happened on unavailable items.',
  priority: 'medium',
  status: 'watch',
  actionType: 'navigate_menu',
  sourceFactIds: ['analytics_test'],
};
assert.equal(getOwnerBusinessCheckActionLabel(unavailableCheck), 'Restock');
assert.match(getOwnerBusinessCheckOwnerMessage(unavailableCheck), /Restock them or hide them/);
assert.equal(
  resolveOwnerBusinessAnalyticsPeriod('which item was on top last month', { periods: { lastMonth: lastMonthPeriod } }),
  lastMonthPeriod,
);
assert.equal(
  resolveOwnerBusinessAnalyticsPeriod('which item was on top from June 1 to June 5', { periods: { today: lastMonthPeriod } }),
  null,
  'unsupported custom date ranges must not fall back to today',
);
assert.equal(
  resolveOwnerBusinessAnalyticsPeriod('how are we doing this month so far', {
    periods: {
      thisMonth: lastMonthPeriod,
      today: { ...lastMonthPeriod, label: 'Today' },
    },
  }),
  lastMonthPeriod,
  'an explicit named period must win over the generic so-far phrase',
);
assert.equal(
  resolveOwnerBusinessAnalyticsPeriod('show last month from June 1 to June 5', {
    periods: { lastMonth: lastMonthPeriod },
  }),
  null,
  'an unsupported explicit date range must not be replaced by a named-period match',
);

const threadStore = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/server/threadStore.ts'), 'utf8');
assert.match(threadStore, /MAX_MESSAGES_PER_THREAD = 20/);
assert.match(threadStore, /messages: nextMessages/);
assert.match(threadStore, /params\.request\.projectId \|\| params\.request\.clientContext\?\.selectedProjectId/);
assert.doesNotMatch(threadStore, /OWNER_BUSINESS_ASSISTANT_MESSAGES/);

const apiGuards = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/server/apiGuards.ts'), 'utf8');
assert.match(apiGuards, /getBoundedSecurityRouteContext/);
assert.match(apiGuards, /getBoundedSecurityStringContext\('attemptedStoreId', selectedStoreId\)/);
assert.match(apiGuards, /key: `\$\{params\.keyPrefix\}:\$\{userRateLimitHash\}:\$\{tenantRateLimitHash\}:\$\{storeRateLimitHash\}`/);
assert.doesNotMatch(apiGuards, /buildSecurityContext/);
assert.doesNotMatch(apiGuards, /key: `\$\{params\.keyPrefix\}:\$\{userId/);

const removedActionSupportPaths = [
  'src/app/api/owner-business-assistant/action/route.ts',
  'src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantAction.ts',
  'src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantActionSheet.tsx',
  'src/components/mobile/sheets/MobileBusinessHealthActionSheet.tsx',
  'src/lib/ownerBusinessAssistant/actions/actionAccess.ts',
  'src/lib/ownerBusinessAssistant/actions/actionAuditLogger.ts',
  'src/lib/ownerBusinessAssistant/actions/actionDraftBuilder.ts',
  'src/lib/ownerBusinessAssistant/actions/actionExecutor.ts',
  'src/lib/ownerBusinessAssistant/actions/actionRegistry.ts',
  'src/lib/ownerBusinessAssistant/actions/actionSchemas.ts',
  'src/lib/ownerBusinessAssistant/actions/actionTargetResolver.ts',
  'src/lib/ownerBusinessAssistant/actions/checkWorkflowService.ts',
  'src/lib/ownerBusinessAssistant/actions/publicTruthActionGuard.ts',
];
for (const relativePath of removedActionSupportPaths) {
  assert.equal(
    existsSync(join(repoRoot, relativePath)),
    false,
    `${relativePath} must stay removed; Menu Manager owns owner-initiated operations`,
  );
}

const functionsWriter = readFileSync(join(repoRoot, 'functions/src/ownerBusinessAssistant/ownerBusinessHealthWriters.ts'), 'utf8');
assert.match(functionsWriter, /getMultiLocation/);
assert.match(functionsWriter, /invalidateOwnerBusinessAssistantContextPackets/);

const contextPacketBuilder = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/server/buildOwnerBusinessAssistantContextPacket.ts'), 'utf8');
assert.match(contextPacketBuilder, /packetProfile !== 'health_card'/);
assert.match(contextPacketBuilder, /packetProfile !== 'analytics_periods'/);
assert.match(contextPacketBuilder, /numberFormatter/);
assert.match(contextPacketBuilder, /parseOwnerBusinessHealthCurrentDoc\(currentSnap\.data\(\), \{ tId, sId \}\)/);
assert.match(contextPacketBuilder, /parseOwnerBusinessAnalyticsIndexDoc\(analyticsSnap\.data\(\), \{ tId, sId \}\)/);
assert.doesNotMatch(contextPacketBuilder, /as OwnerBusinessHealthCurrentDoc \| null/);
assert.doesNotMatch(contextPacketBuilder, /as OwnerBusinessAnalyticsIndexDoc \| null/);
assert.doesNotMatch(contextPacketBuilder, /getOwnerBusinessAssistantAllowedActions/);
assert.doesNotMatch(contextPacketBuilder, /allowedActions/);
assert.doesNotMatch(contextPacketBuilder, /actionCatalog/);
assert.doesNotMatch(contextPacketBuilder, /GUEST_FEEDBACK/);

const feedbackSummaryBuilder = readFileSync(join(repoRoot, 'functions/src/ownerBusinessAssistant/buildOwnerBusinessFeedbackSummary.ts'), 'utf8');
assert.match(feedbackSummaryBuilder, /MAX_FEEDBACK_DOCS = 80/);
assert.match(feedbackSummaryBuilder, /DB_COLLECTIONS\.GUEST_FEEDBACK/);
assert.match(feedbackSummaryBuilder, /sanitizeSnippet/);
assert.match(feedbackSummaryBuilder, /projectOwnerBusinessFeedbackFact/);
assert.match(feedbackSummaryBuilder, /OWNER_BUSINESS_FEEDBACK_INVALID_RECORD/);
assert.doesNotMatch(feedbackSummaryBuilder, /generateFeedbackAnalysis/);
assert.doesNotMatch(feedbackSummaryBuilder, /customerName/);
assert.doesNotMatch(feedbackSummaryBuilder, /customerPhone/);
assert.doesNotMatch(feedbackSummaryBuilder, /customerEmail/);

const validFeedbackRecord = {
  tId: 1,
  sId: 101,
  projectId: '1-menu-101',
  rating: 2,
  source: 'direct_link',
  status: 'new',
  needsAttention: true,
  createdBy: 'guest',
  createdOn: Timestamp.fromMillis(1_700_000_000_000),
  expiresOn: Timestamp.fromMillis(1_707_776_000_000),
  message: 'Wrong price. Contact me at owner@example.test',
};
const validFeedbackFact = projectOwnerBusinessFeedbackFact({
  feedbackId: `guest_feedback_${'a'.repeat(40)}`,
  data: validFeedbackRecord,
  expectedTId: 1,
  expectedSId: 101,
  projectNames: new Map([['1-menu-101', 'Lunch menu']]),
  timeZone: 'Asia/Kolkata',
});
assert.equal(validFeedbackFact?.rating, 2);
assert.equal(validFeedbackFact?.projectName, 'Lunch menu');
assert.equal(validFeedbackFact?.snippet, 'Wrong price. Contact me at [contact]');
for (const malformed of [
  { ...validFeedbackRecord, tId: 2 },
  { ...validFeedbackRecord, sId: 102 },
  { ...validFeedbackRecord, projectId: '../foreign' },
  { ...validFeedbackRecord, rating: 0 },
  { ...validFeedbackRecord, rating: 2.5 },
  { ...validFeedbackRecord, rating: 6 },
  { ...validFeedbackRecord, status: 'pending' },
  { ...validFeedbackRecord, needsAttention: false },
  { ...validFeedbackRecord, source: 'provider_import' },
  { ...validFeedbackRecord, createdOn: new Date() },
  { ...validFeedbackRecord, expiresOn: new Date() },
  { ...validFeedbackRecord, businessDate: '2026-02-30' },
  { ...validFeedbackRecord, message: 'x'.repeat(301) },
]) {
  assert.equal(projectOwnerBusinessFeedbackFact({
    feedbackId: `guest_feedback_${'b'.repeat(40)}`,
    data: malformed,
    expectedTId: 1,
    expectedSId: 101,
  }), null);
}
assert.equal(projectOwnerBusinessFeedbackFact({
  feedbackId: 'invalid/feedback-id',
  data: validFeedbackRecord,
  expectedTId: 1,
  expectedSId: 101,
}), null);

const feedbackAnswerTemplates = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/server/answerTemplates.ts'), 'utf8');
assert.match(feedbackAnswerTemplates, /buildFeedbackPatternAnswer/);
assert.match(feedbackAnswerTemplates, /feedbackSummary/);
assert.doesNotMatch(feedbackAnswerTemplates, /guestFeedback/);

const contextPacketCache = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/server/contextPacketCache.ts'), 'utf8');
assert.match(contextPacketCache, /serverPacketIndexPrefix/);
assert.match(contextPacketCache, /redis\.sadd/);
assert.match(contextPacketCache, /redis\.smembers/);
assert.match(contextPacketCache, /isNotReadyFallbackPacket/);
assert.match(contextPacketCache, /getOwnerBusinessAssistantPacketCacheContext/);
assert.match(contextPacketCache, /parseCachedOwnerBusinessAssistantPacket\(result, cacheKey\)/);
assert.match(contextPacketCache, /owner_business_assistant_packet_cache_invalid/);
assert.match(contextPacketCache, /logRuntimeFailure\('owner_business_assistant_packet_cache_index_read_failed'/);
assert.match(contextPacketCache, /logRuntimeFailure\('owner_business_assistant_packet_cache_read_failed'/);
assert.match(contextPacketCache, /logRuntimeFailure\('owner_business_assistant_packet_cache_write_failed'/);
assert.match(contextPacketCache, /logRuntimeFailure\('owner_business_assistant_packet_cache_invalidate_failed'/);
assert.match(contextPacketCache, /getBoundedRuntimeStringContext\('cacheKey', params\.cacheKey\)/);
assert.match(contextPacketCache, /getBoundedRuntimeStringContext\('indexKey', params\.indexKey\)/);
assert.match(contextPacketCache, /fallbackPolicy: 'cache_miss'/);
assert.match(contextPacketCache, /fallbackPolicy: 'skip_cache_write'/);
assert.match(contextPacketCache, /fallbackPolicy: 'best_effort_invalidation'/);
assert.doesNotMatch(contextPacketCache, /catch\s*\{\s*return null;/);
assert.doesNotMatch(contextPacketCache, /catch\s*\{\s*return \{ attempted: true/);

const locationsHook = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessLocationsSummary.ts'), 'utf8');
assert.match(locationsHook, /browserLocationsPrefix/);
assert.match(locationsHook, /selectedStoreScope/);
assert.match(locationsHook, /resolveOwnerBusinessAssistantClientScope\(session, storeScopeKey\)/);
assert.match(locationsHook, /params\.set\('storeId', clientScope\.storeId\)/);
assert.match(locationsHook, /\[url, clientScope\.tenantId, clientScope\.storeId\] as const/);
assert.match(locationsHook, /fallbackData: cached \|\| undefined/);
assert.match(locationsHook, /shouldRevalidate/);
assert.match(locationsHook, /browserReadModelTtlMs/);
assert.match(locationsHook, /readOwnerBusinessAssistantLocationsResponse/);
assert.match(locationsHook, /getCachedData<unknown>/);
assert.match(locationsHook, /projectOwnerBusinessAssistantLocationsResponse\(cachedValue\)/);
assert.match(locationsHook, /cachedValue !== undefined && !cached\) removeCachedData\(cacheKey\)/);
assert.match(locationsHook, /OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY/);
assert.match(locationsHook, /getBoundedRuntimeStringContext/);
assert.doesNotMatch(locationsHook, /response\.json\(\)/);

const currentHook = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessHealthCurrent.ts'), 'utf8');
assert.match(currentHook, /browserReadModelTtlMs/);
assert.match(currentHook, /resolveOwnerBusinessAssistantClientScope\(session, storeScopeKey\)/);
assert.match(currentHook, /params\.set\('storeId', clientScope\.storeId\)/);
assert.match(currentHook, /readOwnerBusinessAssistantCurrentResponse/);
assert.match(currentHook, /getCachedData<unknown>/);
assert.match(currentHook, /projectOwnerBusinessAssistantCurrentResponse\(cachedValue\)/);
assert.match(currentHook, /cachedValue !== undefined && !cached\) removeCachedData\(cacheKey\)/);
assert.match(currentHook, /OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY/);
assert.match(currentHook, /getBoundedRuntimeStringContext/);
assert.doesNotMatch(currentHook, /response\.json\(\)/);
const answerHook = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantAnswer.ts'), 'utf8');
assert.match(answerHook, /OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY/);
assert.match(answerHook, /readJsonResponseWithLimit/);
assert.match(answerHook, /OWNER_BUSINESS_ASSISTANT_ANSWER_RESPONSE_JSON_MAX_BYTES/);
assert.match(answerHook, /owner_business_assistant_answer_response_parse_failed/);
assert.match(answerHook, /owner_business_assistant_answer_response_invalid/);
assert.doesNotMatch(answerHook, /response\.json\(\)\.catch\(\(\) => null\)/);
const analyticsHook = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessAnalyticsIndex.ts'), 'utf8');
assert.match(analyticsHook, /browserReadModelTtlMs/);
assert.match(analyticsHook, /resolveOwnerBusinessAssistantClientScope\(session, storeScopeKey\)/);
assert.match(analyticsHook, /params\.set\('storeId', clientScope\.storeId\)/);
assert.match(analyticsHook, /readOwnerBusinessAssistantAnalyticsResponse/);
assert.match(analyticsHook, /getCachedData<unknown>/);
assert.match(analyticsHook, /projectOwnerBusinessAssistantAnalyticsResponse\(cachedValue\)/);
assert.match(analyticsHook, /cachedValue !== undefined && !cached\) removeCachedData\(cacheKey\)/);
assert.match(analyticsHook, /OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY/);
assert.match(analyticsHook, /getBoundedRuntimeStringContext/);
assert.doesNotMatch(analyticsHook, /response\.json\(\)/);
const clientResponses = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/clientResponses.ts'), 'utf8');
assert.match(clientResponses, /OWNER_BUSINESS_ASSISTANT_READ_MODEL_RESPONSE_JSON_MAX_BYTES = 256 \* 1024/);
assert.match(clientResponses, /OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY/);
assert.match(clientResponses, /cache: 'no-store'/);
assert.match(clientResponses, /credentials: 'same-origin'/);
assert.match(clientResponses, /redirect: 'manual'/);
assert.match(clientResponses, /readJsonResponseWithLimit<unknown>/);
assert.match(clientResponses, /isOwnerBusinessHealthCurrentDoc/);
assert.match(clientResponses, /ownerBusinessHealthCurrentDocSchema\.safeParse\(value\)\.success/);
assert.match(clientResponses, /ownerBusinessAnalyticsResponseDataSchema\.safeParse\(value\)\.success/);
assert.match(clientResponses, /isOwnerBusinessAssistantAnalyticsResponse/);
assert.match(clientResponses, /isOwnerBusinessAssistantLocationsResponse/);
assert.match(clientResponses, /isOwnerBusinessAssistantThreadResponse/);
[
  'owner_business_assistant_current_response_rejected',
  'owner_business_assistant_current_response_parse_failed',
  'owner_business_assistant_current_response_invalid',
  'owner_business_assistant_analytics_response_rejected',
  'owner_business_assistant_analytics_response_parse_failed',
  'owner_business_assistant_analytics_response_invalid',
  'owner_business_assistant_locations_response_rejected',
  'owner_business_assistant_locations_response_parse_failed',
  'owner_business_assistant_locations_response_invalid',
  'owner_business_assistant_thread_response_rejected',
  'owner_business_assistant_thread_response_parse_failed',
  'owner_business_assistant_thread_response_invalid',
].forEach((failureCode) => {
  assert.match(clientResponses, new RegExp(failureCode));
});
const contextPacketHook = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessContextPacket.ts'), 'utf8');
assert.match(contextPacketHook, /useOwnerBusinessHealthCurrent/);
assert.doesNotMatch(contextPacketHook, /useOwnerBusinessAnalyticsIndex/);
const analyticsStrip = readFileSync(join(repoRoot, 'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthAnalyticsStrip.tsx'), 'utf8');
assert.match(analyticsStrip, /useOwnerBusinessAnalyticsIndex/);
assert.doesNotMatch(analyticsStrip, /useOwnerBusinessHealthCurrent/);
assert.match(analyticsStrip, /enabled = true/);
assert.match(analyticsStrip, /useOwnerBusinessAnalyticsIndex\(projectId, storeScopeKey, \{ enabled \}\)/);
assert.match(analyticsStrip, /buildOwnerBusinessActivityMetrics/);
assert.match(analyticsStrip, /getOwnerBusinessPrimaryAnalyticsPeriod/);
assert.doesNotMatch(analyticsStrip, /numberFormatter/);
const businessSignals = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/businessSignals.ts'), 'utf8');
assert.match(businessSignals, /numberFormatter/);
assert.match(businessSignals, /OwnerBusinessSignalAction = 'promote' \| 'fix' \| 'restock' \| 'update'/);
assert.match(businessSignals, /Update link/);
assert.match(businessSignals, /Restock them or hide them/);
const dashboardHealthCard = readFileSync(join(repoRoot, 'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthDashboardCard.tsx'), 'utf8');
assert.match(dashboardHealthCard, /usesProvidedCurrent/);
assert.match(dashboardHealthCard, /useOwnerBusinessHealthCurrent\(undefined, storeScopeKey \|\| storeDetails\?\.storeId, \{ enabled: !usesProvidedCurrent \}\)/);
const ownerDashboard = readFileSync(join(repoRoot, 'src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx'), 'utf8');
assert.match(ownerDashboard, /useOwnerBusinessHealthCurrent/);
assert.match(ownerDashboard, /isBusinessHealthReady/);
assert.match(ownerDashboard, /enabled=\{isBusinessHealthReady\}/);
const dashboardProjectSelector = readFileSync(join(repoRoot, 'src/components/templates/main-app/dashboard/OwnerDashboard/DashboardProjectSelector.tsx'), 'utf8');
assert.match(dashboardProjectSelector, /activeStoreScope/);
assert.match(dashboardProjectSelector, /dashboard-projects-\$\{activeTenantScope\}-\$\{activeStoreScope\}/);
const ownerProjectSelection = readFileSync(join(repoRoot, 'src/lib/projects/projectSelection.ts'), 'utf8');
assert.match(ownerProjectSelection, /const hasScope = Boolean\(getOwnerProjectStoreScope\(storeId\) \|\| getOwnerProjectTenantScope\(tenantId\)\)/);
assert.match(ownerProjectSelection, /if \(getOwnerProjectStoreScope\(storeId\) \|\| getOwnerProjectTenantScope\(tenantId\)\) return null/);

const locationsRoute = readFileSync(join(repoRoot, 'src/app/api/owner-business-assistant/locations/route.ts'), 'utf8');
assert.match(locationsRoute, /parseSummaryStores/);
assert.match(locationsRoute, /doc\('storesSummary'\)/);
assert.match(locationsRoute, /resolveOwnerAssistantSelectedStoreScope/);
assert.match(locationsRoute, /isActiveStore/);
assert.match(locationsRoute, /normalizeLocationStore/);
assert.match(locationsRoute, /cleanSourceFactIds/);
assert.match(locationsRoute, /isOwnerBusinessHealthStatus/);
assert.match(locationsRoute, /firestoreReadCount: 2/);
assert.match(locationsRoute, /'Cache-Control': 'private, no-store, max-age=0'/);
assert.match(locationsRoute, /'X-Content-Type-Options': 'nosniff'/);
assert.equal((locationsRoute.match(/return NextResponse\.json\(/g) || []).length, 1);

const functionsInvalidator = readFileSync(join(repoRoot, 'functions/src/ownerBusinessAssistant/contextPacketCacheInvalidation.ts'), 'utf8');
assert.match(functionsInvalidator, /serverPacketIndexPrefix/);
assert.match(functionsInvalidator, /smembers/);
assert.match(functionsInvalidator, /tId: string \| number;/);
assert.doesNotMatch(functionsInvalidator, /params\.tId == null \? '\*'/);
assert.match(functionsInvalidator, /redis\.srem\(indexKey/);
assert.match(functionsInvalidator, /eligibleKeys\.length <= keysToDelete\.length/);
assert.match(functionsInvalidator, /expectedPacketPrefix/);
assert.match(functionsInvalidator, /serverPacketPrefix\}:\$\{params\.tId\}:\$\{params\.sId\}:/);
assert.match(functionsInvalidator, /OWNER_BUSINESS_ASSISTANT_CACHE_INVALIDATION_FAILED/);

const desktopLocations = readFileSync(join(repoRoot, 'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthLocationSummary.tsx'), 'utf8');
assert.match(desktopLocations, /Checked/);
assert.match(desktopLocations, /storeScopeKey/);
const businessHealthPage = readFileSync(join(repoRoot, 'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthPage.tsx'), 'utf8');
assert.match(businessHealthPage, /useOwnerBusinessContextPacket\(undefined, storeDetails\?\.storeId\)/);
assert.match(businessHealthPage, /storeScopeKey=\{storeDetails\?\.storeId\}/);
assert.match(businessHealthPage, /BusinessHealthProjectScopeSelector/);
assert.match(businessHealthPage, /scopedProjectId/);
assert.match(businessHealthPage, /isHealthReady/);
assert.match(businessHealthPage, /styles\.summaryGridSingle/);
assert.match(businessHealthPage, /<BusinessHealthAnalyticsStrip\s+enabled=\{isHealthReady\}/);
assert.match(businessHealthPage, /key=\{`\$\{storeDetails\?\.storeId \|\| 'store'\}:\$\{scopedProjectId \|\| 'all'\}`\}/);
const publicTruthOwnerCard = readFileSync(join(repoRoot, 'src/components/templates/main-app/ownerBusinessAssistant/PublicTruthOwnerCheckCard.tsx'), 'utf8');
assert.match(publicTruthOwnerCard, /Official customer source/);
assert.match(publicTruthOwnerCard, /report\.modules\.map/);
assert.match(publicTruthOwnerCard, /report\.setupJobList/);
assert.match(publicTruthOwnerCard, /Next public fixes/);
assert.match(publicTruthOwnerCard, /job\.fixHref/);
assert.match(publicTruthOwnerCard, /job\.actionLabel/);
assert.match(publicTruthOwnerCard, /module\.fixHref/);
assert.match(publicTruthOwnerCard, /moduleAction = report\.modules\.find/);
assert.match(publicTruthOwnerCard, /moduleAction\.fixHref/);
assert.match(publicTruthOwnerCard, /moduleAction\.actionLabel/);
assert.match(publicTruthOwnerCard, /External platforms stay owner-confirmed/);
const ownerPublicTruthReadiness = readFileSync(join(repoRoot, 'src/lib/public-truth-tools/ownerPublicTruthReadiness.ts'), 'utf8');
assert.match(ownerPublicTruthReadiness, /OwnerPublicTruthSetupJob/);
assert.match(ownerPublicTruthReadiness, /OWNER_PUBLIC_TRUTH_MAX_SETUP_JOBS = 6/);
assert.match(ownerPublicTruthReadiness, /buildOwnerPublicTruthSetupJobList/);
assert.match(ownerPublicTruthReadiness, /setupJobList,/);
const desktopAssistantPanel = readFileSync(join(repoRoot, 'src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantPanel.tsx'), 'utf8');
assert.doesNotMatch(desktopAssistantPanel, /OwnerAssistantActionSheet/);
assert.doesNotMatch(desktopAssistantPanel, /Open dashboard/);
assert.doesNotMatch(desktopAssistantPanel, /Open menu/);
assert.doesNotMatch(desktopAssistantPanel, /Open share/);
assert.doesNotMatch(desktopAssistantPanel, /Open settings/);
const businessHealthScopeSelector = readFileSync(join(repoRoot, 'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthProjectScopeSelector.tsx'), 'utf8');
assert.match(businessHealthScopeSelector, /getExistingProjectsListWithoutLoader/);
assert.match(businessHealthScopeSelector, /ALL_MENUS_SCOPE/);
assert.match(businessHealthScopeSelector, /if \(isLoading \|\| !selectedProjectId\) return/);
assert.match(businessHealthScopeSelector, /onChange\(undefined\)/);
const mobileHealthScreen = readFileSync(join(repoRoot, 'src/components/mobile/screens/MobileBusinessHealthScreen.tsx'), 'utf8');
assert.match(mobileHealthScreen, /Checked/);
assert.match(mobileHealthScreen, /useOwnerBusinessAnalyticsIndex/);
assert.match(mobileHealthScreen, /useOwnerBusinessAnalyticsIndex\(scopedProjectId, storeDetails\?\.storeId, \{ enabled: isHealthReady \}\)/);
assert.match(mobileHealthScreen, /useOwnerBusinessHealthCurrent\(undefined, storeDetails\?\.storeId\)/);
assert.match(mobileHealthScreen, /useOwnerBusinessAssistantThread\(threadId, storeDetails\?\.storeId\)/);
assert.match(mobileHealthScreen, /ALL_MENUS_SCOPE/);
assert.match(mobileHealthScreen, /businessHealthProjectId/);
assert.doesNotMatch(mobileHealthScreen, /useOwnerBusinessAssistantAction/);
assert.doesNotMatch(mobileHealthScreen, /MobileBusinessHealthActionSheet/);
assert.doesNotMatch(mobileHealthScreen, /Open action/);
assert.doesNotMatch(mobileHealthScreen, /Reviewed/);
assert.doesNotMatch(mobileHealthScreen, /Dismiss/);
assert.match(mobileHealthScreen, /ProjectSelectorList/);
assert.match(mobileHealthScreen, /ProjectSelectorTrigger/);
assert.match(mobileHealthScreen, /isLoading: isProjectsLoading/);
assert.match(mobileHealthScreen, /if \(!businessHealthProjectId \|\| isProjectsLoading\) return/);
assert.doesNotMatch(mobileHealthScreen, /current\?\.analyticsTeaser/);
assert.doesNotMatch(mobileHealthScreen, /<Card title="Open">/);
const mobilePublicTruthOwnerCard = readFileSync(join(repoRoot, 'src/components/mobile/components/MobilePublicTruthOwnerCheckCard.tsx'), 'utf8');
assert.match(mobilePublicTruthOwnerCard, /report\.modules\.map/);
assert.match(mobilePublicTruthOwnerCard, /report\?\.setupJobList/);
assert.match(mobilePublicTruthOwnerCard, /Next public fixes/);
assert.match(mobilePublicTruthOwnerCard, /job\.mobileFixTarget/);
assert.match(mobilePublicTruthOwnerCard, /job\.actionLabel/);
assert.match(mobilePublicTruthOwnerCard, /External platforms stay owner-confirmed/);
assert.match(mobilePublicTruthOwnerCard, /onFixTarget/);
assert.match(mobilePublicTruthOwnerCard, /module\.mobileFixTarget/);
assert.match(mobilePublicTruthOwnerCard, /module\.actionLabel/);
assert.doesNotMatch(mobilePublicTruthOwnerCard, /window\.location/);
assert.match(mobileHealthScreen, /handlePublicTruthFixTarget/);
assert.match(mobileHealthScreen, /onOpenMenuTab\?\.\(\)/);
assert.match(mobileHealthScreen, /onOpenShareTab\?\.\(\)/);
assert.match(mobileHealthScreen, /onOpenMoreScreen\?\.\(moreTarget\)/);
const threadHook = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantThread.ts'), 'utf8');
assert.match(threadHook, /readOwnerBusinessAssistantThreadResponse/);
assert.match(threadHook, /OwnerBusinessAssistantThreadResponse/);
assert.match(threadHook, /getBoundedRuntimeStringContext/);
assert.doesNotMatch(threadHook, /response\.json\(\)/);
const mobileDashboardScreen = readFileSync(join(repoRoot, 'src/components/mobile/screens/MobileDashboardScreen.tsx'), 'utf8');
assert.match(mobileDashboardScreen, /isBusinessHealthReady/);
assert.match(mobileDashboardScreen, /enabled: canShowBusinessHealthAnalytics && isBusinessHealthReady/);
const businessHealthRoute = readFileSync(join(repoRoot, 'src/app/(main)/business-health/page.tsx'), 'utf8');
assert.match(businessHealthRoute, /normalizeOwnerBusinessAssistantProjectId/);
assert.match(businessHealthRoute, /return normalizeOwnerBusinessAssistantProjectId\(raw\) \|\| undefined;/);

const requestSchemas = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/schemas.ts'), 'utf8');
const projectIdBoundary = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/projectIdBoundary.ts'), 'utf8');
const threadIdBoundary = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/threadIdBoundary.ts'), 'utf8');
const threadStoreSource = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/server/threadStore.ts'), 'utf8');
const answerEventLoggerSource = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/server/answerEventLogger.ts'), 'utf8');
const answerHookSource = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantAnswer.ts'), 'utf8');
const clientScopeSource = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/clientScope.ts'), 'utf8');
const ownerBusinessAssistantImplDoc = readFileSync(join(repoRoot, '__docs__/owner-business-assistant/owner-business-assistant_impl.md'), 'utf8');
const ownerBusinessAssistantFirebaseDoc = readFileSync(join(repoRoot, '__docs__/owner-business-assistant/owner-business-assistant_firebase.md'), 'utf8');
const ownerBusinessAssistantValidationDoc = readFileSync(join(repoRoot, '__docs__/owner-business-assistant/owner-business-assistant_validation.md'), 'utf8');
const productionReadinessAudit = readFileSync(join(repoRoot, '__docs__/audits/menulist-production-readiness-audit.md'), 'utf8');
const changelog = readFileSync(join(repoRoot, '__docs__/changelog.md'), 'utf8');

assert.match(answerHookSource, /projectOwnerBusinessAssistantAnswerResponse\(value\)/);
assert.doesNotMatch(answerHookSource, /readJsonResponseWithLimit<OwnerBusinessAssistantAnswerPayload>/);

assert.equal(
  OwnerBusinessAssistantAnswerRequestSchema.parse({ question: '  Are my hours current?  ' }).question,
  'Are my hours current?',
);
assert.equal(
  OwnerBusinessAssistantAnswerRequestSchema.safeParse({ question: '   ' }).success,
  false,
);
assert.equal(
  OwnerBusinessAssistantFeedbackRequestSchema.safeParse({
    answerId: 'answer_1',
    rating: 'helpful',
    reason: '   ',
  }).success,
  false,
);
assert.doesNotMatch(requestSchemas, /owner_question_actionable/);
assert.match(requestSchemas, /multi_location_summary/);
assert.match(requestSchemas, /import \{ isValidFirestoreDocumentId \} from '@lib\/firebase\/firestoreDocumentId';/);
assert.match(projectIdBoundary, /OWNER_BUSINESS_ASSISTANT_PROJECT_ID_PATTERN = \/\^\[A-Za-z0-9_-\]\{1,160\}\$\/;/);
assert.match(projectIdBoundary, /projectId === value/);
assert.match(projectIdBoundary, /isValidFirestoreDocumentId\(projectId\)/);
assert.match(requestSchemas, /normalizeOwnerBusinessAssistantProjectId\(value\) === value/);
assert.match(requestSchemas, /projectId: OwnerBusinessAssistantProjectIdSchema/);
assert.match(requestSchemas, /selectedProjectId: OwnerBusinessAssistantProjectIdSchema/);
assert.doesNotMatch(requestSchemas, /if \(typeof value === 'string'\) return value\.trim\(\);/);
assert.doesNotMatch(requestSchemas, /projectId: z\.string\(\)\.min\(1\)\.max\(160\)\.optional\(\)/);
assert.match(requestSchemas, /const OwnerBusinessAssistantAnswerIdSchema = z\.string\(\)/);
assert.match(requestSchemas, /\.refine\(\(value\) => value === value\.trim\(\) && isValidFirestoreDocumentId\(value\), 'Invalid answer ID'\)/);
assert.match(requestSchemas, /answerId: OwnerBusinessAssistantAnswerIdSchema/);
assert.doesNotMatch(requestSchemas, /answerId: z\.string\(\)\.min\(1\)\.max\(180\)/);
assert.match(answerEventLoggerSource, /import \{ isValidFirestoreDocumentId \} from '@lib\/firebase\/firestoreDocumentId';/);
assert.match(answerEventLoggerSource, /const normalizeAnswerEventDocumentId = \(value: unknown\): string \| null => \{/);
assert.match(answerEventLoggerSource, /documentId === value && isValidFirestoreDocumentId\(documentId\)/);
assert.match(answerEventLoggerSource, /const answerId = normalizeAnswerEventDocumentId\(params\.answer\.answerId\);/);
assert.match(answerEventLoggerSource, /if \(!answerId\) return;/);
assert.match(answerEventLoggerSource, /\.doc\(answerId\)/);
assert.doesNotMatch(answerEventLoggerSource, /\.doc\(params\.answer\.answerId\)/);
assert.match(requestSchemas, /OwnerBusinessAssistantStoreIdSchema/);
assert.match(requestSchemas, /storeId: OwnerBusinessAssistantStoreIdSchema/);
assert.match(threadIdBoundary, /OWNER_BUSINESS_ASSISTANT_THREAD_ID_PATTERN/);
assert.match(threadIdBoundary, /threadId === value/);
assert.match(threadIdBoundary, /isValidFirestoreDocumentId\(threadId\)/);
assert.match(requestSchemas, /normalizeOwnerBusinessAssistantThreadId\(value\) === value/);
assert.doesNotMatch(requestSchemas, /const OwnerBusinessAssistantThreadIdSchema = z\.string\(\)\s*\.trim\(\)/);
assert.match(threadStoreSource, /normalizeOwnerBusinessAssistantThreadId\(params\.request\.threadId\)/);
assert.match(threadStoreSource, /if \(!threadId\) return undefined;/);
assert.match(answerHookSource, /const readStoredThreadId/);
assert.match(answerHookSource, /normalizeOwnerBusinessAssistantThreadId\(window\.localStorage\.getItem\(storageKey\)\)/);
assert.match(answerHookSource, /normalizeOwnerBusinessAssistantThreadId\(answerData\.threadId\)/);
assert.match(clientScopeSource, /resolveCurrentSessionUserDocumentId\(session\)/);
assert.match(clientScopeSource, /ownerBusinessAssistant-thread:\$\{scope\.cacheScope\}:\$\{encodeURIComponent\(scope\.actorId\)\}/);
assert.match(threadHook, /\[url, clientScope\.cacheScope, clientScope\.actorId\] as const/);
assert.match(answerHookSource, /session\?\.uId, session\?\.user\?\.id/);
assert.doesNotMatch(requestSchemas, /OwnerBusinessAssistantAction/);
assert.doesNotMatch(requestSchemas, /targetKind/);
[
  ownerBusinessAssistantImplDoc,
  ownerBusinessAssistantFirebaseDoc,
  ownerBusinessAssistantValidationDoc,
  productionReadinessAudit,
  changelog,
].forEach((docSource) => {
  assert.match(docSource, /whitespace-mutated/);
});
assert.match(ownerBusinessAssistantImplDoc, /does not trim before `normalizeOwnerBusinessAssistantProjectId\(value\) === value`/);
assert.match(ownerBusinessAssistantImplDoc, /OwnerBusinessAssistantThreadIdSchema` does not trim before `normalizeOwnerBusinessAssistantThreadId\(value\) === value`/);
assert.match(ownerBusinessAssistantFirebaseDoc, /does not trim before `normalizeOwnerBusinessAssistantProjectId\(value\) === value`/);
assert.match(ownerBusinessAssistantFirebaseDoc, /Malformed, whitespace-mutated, path-shaped, or reserved IDs stop before the feedback write/);
assert.match(productionReadinessAudit, /Owner Business Assistant strict document-ID boundary checkpoint/);
assert.match(changelog, /Owner Business Assistant Strict Document ID Boundary/);
const featureFlags = readFileSync(join(repoRoot, 'src/config/features.ts'), 'utf8');
assert.doesNotMatch(featureFlags, /ENABLE_OWNER_BUSINESS_ACTION/);

const ownerBusinessAssistantTypes = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/types.ts'), 'utf8');
assert.doesNotMatch(ownerBusinessAssistantTypes, /OwnerBusinessAssistantAction/);
assert.doesNotMatch(ownerBusinessAssistantTypes, /action_options/);
assert.doesNotMatch(ownerBusinessAssistantTypes, /allowedActions/);

const platformMonitorRoute = readFileSync(join(repoRoot, 'src/app/api/platform/owner-business-assistant/monitor/route.ts'), 'utf8');
assert.doesNotMatch(platformMonitorRoute, /OWNER_BUSINESS_ASSISTANT_ACTIONS/);
assert.doesNotMatch(platformMonitorRoute, /recentActions/);
assert.doesNotMatch(platformMonitorRoute, /actionOptionCount/);
assert.match(platformMonitorRoute, /owner_business_assistant_monitor_route_failed/);
assert.match(platformMonitorRoute, /logRuntimeFailure/);
assert.match(platformMonitorRoute, /getBoundedRuntimeStringContext\('requestPath', request\.nextUrl\.pathname\)/);
assert.match(platformMonitorRoute, /normalizeOwnerBusinessAssistantMonitorTimestamp/);
assert.doesNotMatch(platformMonitorRoute, /function toIso\(value: any\)/);
assert.doesNotMatch(platformMonitorRoute, /secureError\('\[OwnerBusinessAssistantMonitor\] Failed to load monitor data'/);

const currentRoute = readFileSync(join(repoRoot, 'src/app/api/owner-business-assistant/current/route.ts'), 'utf8');
assert.match(currentRoute, /OwnerBusinessAssistantScopeSchema/);
assert.match(currentRoute, /safeParse\(Object\.fromEntries\(request\.nextUrl\.searchParams\.entries\(\)\)\)/);
assert.match(currentRoute, /resolveOwnerAssistantSelectedStoreScope/);
assert.match(currentRoute, /requireAnyStorePermissionForStore/);
const analyticsRoute = readFileSync(join(repoRoot, 'src/app/api/owner-business-assistant/analytics/route.ts'), 'utf8');
assert.match(analyticsRoute, /OwnerBusinessAssistantScopeSchema/);
assert.match(analyticsRoute, /packetProfile: 'analytics_periods'/);
assert.match(analyticsRoute, /resolveOwnerAssistantSelectedStoreScope/);
const answerRoute = readFileSync(join(repoRoot, 'src/app/api/owner-business-assistant/answer/route.ts'), 'utf8');
assert.match(answerRoute, /resolveOwnerAssistantSelectedStoreScope/);
assert.match(answerRoute, /threadWritten: true/);
assert.match(answerRoute, /answerEventWritten: true/);
assert.match(answerRoute, /firestoreWriteCount: \(answer\.metrics\?\.firestoreWriteCount \?\? 0\) \+ 1/);
assert.match(answerRoute, /owner_business_assistant_thread_persistence_failed/);
assert.match(answerRoute, /owner_business_assistant_answer_event_logging_failed/);
assert.match(answerRoute, /projectOwnerBusinessAssistantAnswerResponse\(\{ data: answer \}\)/);
assert.match(answerRoute, /owner_business_assistant_answer_output_invalid/);
assert.doesNotMatch(answerRoute, /logger\.warn/);
assert.doesNotMatch(answerRoute, /error instanceof Error \? error\.message/);
const feedbackRoute = readFileSync(join(repoRoot, 'src/app/api/owner-business-assistant/feedback/route.ts'), 'utf8');
const feedbackHook = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantFeedback.ts'), 'utf8');
assert.match(feedbackRoute, /readBoundedJsonBody/);
assert.match(feedbackRoute, /OWNER_BUSINESS_ASSISTANT_FEEDBACK_MAX_BODY_BYTES = 8 \* 1024/);
assert.doesNotMatch(feedbackRoute, /request\.json\(\)/);
assert.match(feedbackRoute, /applyOwnerBusinessAssistantRateLimit[\s\S]+readBoundedJsonBody/);
assert.match(feedbackRoute, /OwnerBusinessAssistantFeedbackRequestSchema\.safeParse\(bodyResult\.data\)/);
assert.match(feedbackRoute, /resolveOwnerAssistantSelectedStoreScope\(request, session, parsed\.data\.storeId\)/);
assert.match(feedbackRoute, /requireAnyStorePermissionForStore/);
assert.match(feedbackRoute, /import \{ isValidFirestoreDocumentId \} from '@lib\/firebase\/firestoreDocumentId';/);
assert.match(feedbackRoute, /buildOwnerBusinessAssistantFeedbackDocumentId/);
assert.match(feedbackRoute, /if \(!docId \|\| !isValidFirestoreDocumentId\(docId\)\) \{/);
assert.match(feedbackRoute, /OWNER_BUSINESS_ASSISTANT_FEEDBACK/);
assert.match(clientResponses, /OWNER_BUSINESS_ASSISTANT_MUTATION_RESPONSE_JSON_MAX_BYTES = 16 \* 1024/);
assert.match(clientResponses, /readOwnerBusinessAssistantFeedbackResponse/);
assert.match(clientResponses, /owner_business_assistant_feedback_response_rejected/);
assert.match(clientResponses, /owner_business_assistant_feedback_response_parse_failed/);
assert.match(clientResponses, /owner_business_assistant_feedback_response_invalid/);
assert.match(clientResponses, /isOwnerBusinessAssistantFeedbackResponse/);
assert.match(clientResponses, /value\.data\.success === true/);
assert.match(feedbackHook, /OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY/);
assert.match(feedbackHook, /\.\.\.OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY/);
assert.match(feedbackHook, /readOwnerBusinessAssistantFeedbackResponse/);
assert.match(feedbackHook, /return result\?\.data\.success === true/);
assert.doesNotMatch(feedbackHook, /if \(!response\.ok\) return false;\s*return true;/);

const verifyOwnerBusinessHealthWriteReplacementSemantics = async () => {
  const capturedSets: Array<{
    path: string;
    data: FirebaseFirestore.DocumentData;
    options?: FirebaseFirestore.SetOptions;
  }> = [];
  const fakeBatch = {
    set(
      ref: FirebaseFirestore.DocumentReference,
      data: FirebaseFirestore.DocumentData,
      options?: FirebaseFirestore.SetOptions,
    ) {
      capturedSets.push({ path: ref.path, data, options });
      return this;
    },
    async commit() {
      return undefined;
    },
  };
  const db = new Firestore({ projectId: 'demo-menulist-owner-business-health' });
  Object.defineProperty(db, 'batch', { value: () => fakeBatch });

  const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  try {
    await writeOwnerBusinessHealthDocs({
      db,
      tId: '1',
      sId: '2',
      localDate: health.localDate,
      current: health,
      analytics: {
        version: 1,
        tId: '1',
        sId: '2',
        localDate: health.localDate,
        generatedAt: health.generatedAt,
        periods: {},
        unsupportedPeriods: {},
        sourceRefs: [],
        cost: { builderReadCount: 0, hotPathReadCount: 1 },
      },
      locationSummary: {
        sId: '2',
        storeName: 'Test Store',
        status: 'stable',
        actionCount: 0,
        lastCheckedAt: health.generatedAt,
        localDate: health.localDate,
        sourceFactIds: [],
      },
    });
  } finally {
    if (originalRedisUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl;
    if (originalRedisToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken;
  }

  assert.equal(capturedSets.length, 4);
  const currentWrite = capturedSets.find(({ path }) => path.endsWith('/ownerBusinessHealthCurrent_1_2'));
  const snapshotWrite = capturedSets.find(({ path }) => path.endsWith('/ownerBusinessHealthSnapshot_1_2_2026-06-08'));
  const analyticsWrite = capturedSets.find(({ path }) => path.endsWith('/ownerBusinessAnalyticsIndex_1_2'));
  const multiLocationWrite = capturedSets.find(({ path }) => path.endsWith('/ownerBusinessHealthMultiLocation_1'));

  assert.equal(currentWrite?.options, undefined, 'authoritative current health writes must replace stale optional fields');
  assert.equal(snapshotWrite?.options, undefined, 'same-day snapshots must replace stale optional fields');
  assert.equal(analyticsWrite?.options, undefined, 'analytics index writes must replace stale periods and project summaries');
  assert.deepEqual(multiLocationWrite?.options, { merge: true }, 'per-store multi-location updates must preserve sibling stores');
  assert.equal('analyticsTeaser' in (currentWrite?.data || {}), false);
};

void verifyOwnerBusinessHealthWriteReplacementSemantics()
  .then(() => console.log('Owner Business Assistant hardening verification passed.'))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
