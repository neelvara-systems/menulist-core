import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  OWNER_BUSINESS_ASSISTANT_CACHE,
  OWNER_BUSINESS_ASSISTANT_ENDPOINTS,
} from '@lib/ownerBusinessAssistant/constants';
import {
  OWNER_BUSINESS_ASSISTANT_THREAD_ID_PATTERN,
  normalizeOwnerBusinessAssistantThreadId,
} from '@lib/ownerBusinessAssistant/threadIdBoundary';
import {
  normalizeOwnerBusinessAssistantProjectId,
} from '@lib/ownerBusinessAssistant/projectIdBoundary';
import { buildOwnerBusinessAssistantPacketCacheKey } from '@lib/ownerBusinessAssistant/server/contextPacketCache';
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
assert.doesNotMatch(contextPacketBuilder, /getOwnerBusinessAssistantAllowedActions/);
assert.doesNotMatch(contextPacketBuilder, /allowedActions/);
assert.doesNotMatch(contextPacketBuilder, /actionCatalog/);
assert.doesNotMatch(contextPacketBuilder, /GUEST_FEEDBACK/);

const feedbackSummaryBuilder = readFileSync(join(repoRoot, 'functions/src/ownerBusinessAssistant/buildOwnerBusinessFeedbackSummary.ts'), 'utf8');
assert.match(feedbackSummaryBuilder, /MAX_FEEDBACK_DOCS = 80/);
assert.match(feedbackSummaryBuilder, /DB_COLLECTIONS\.GUEST_FEEDBACK/);
assert.match(feedbackSummaryBuilder, /sanitizeSnippet/);
assert.doesNotMatch(feedbackSummaryBuilder, /generateFeedbackAnalysis/);
assert.doesNotMatch(feedbackSummaryBuilder, /customerName/);
assert.doesNotMatch(feedbackSummaryBuilder, /customerPhone/);
assert.doesNotMatch(feedbackSummaryBuilder, /customerEmail/);

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
assert.match(locationsHook, /params\.set\('storeId', String\(storeScopeKey\)\)/);
assert.match(locationsHook, /\[url, scope, selectedStoreScope\] as const/);
assert.match(locationsHook, /fallbackData: cached/);
assert.match(locationsHook, /shouldRevalidate/);
assert.match(locationsHook, /browserReadModelTtlMs/);
assert.match(locationsHook, /readOwnerBusinessAssistantLocationsResponse/);
assert.match(locationsHook, /OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY/);
assert.match(locationsHook, /getBoundedRuntimeStringContext/);
assert.doesNotMatch(locationsHook, /response\.json\(\)/);

const currentHook = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessHealthCurrent.ts'), 'utf8');
assert.match(currentHook, /browserReadModelTtlMs/);
assert.match(currentHook, /params\.set\('storeId', String\(storeScopeKey\)\)/);
assert.match(currentHook, /readOwnerBusinessAssistantCurrentResponse/);
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
assert.match(analyticsHook, /params\.set\('storeId', String\(storeScopeKey\)\)/);
assert.match(analyticsHook, /readOwnerBusinessAssistantAnalyticsResponse/);
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
assert.match(ownerProjectSelection, /const hasStoreScope/);
assert.match(ownerProjectSelection, /if \(hasStoreScope\) return null/);

const locationsRoute = readFileSync(join(repoRoot, 'src/app/api/owner-business-assistant/locations/route.ts'), 'utf8');
assert.match(locationsRoute, /parseSummaryStores/);
assert.match(locationsRoute, /doc\('storesSummary'\)/);
assert.match(locationsRoute, /resolveOwnerAssistantSelectedStoreScope/);
assert.match(locationsRoute, /isActiveStore/);
assert.match(locationsRoute, /normalizeLocationStore/);
assert.match(locationsRoute, /cleanSourceFactIds/);
assert.match(locationsRoute, /isOwnerBusinessHealthStatus/);
assert.match(locationsRoute, /firestoreReadCount: 2/);

const functionsInvalidator = readFileSync(join(repoRoot, 'functions/src/ownerBusinessAssistant/contextPacketCacheInvalidation.ts'), 'utf8');
assert.match(functionsInvalidator, /serverPacketIndexPrefix/);
assert.match(functionsInvalidator, /smembers/);

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
const ownerBusinessAssistantImplDoc = readFileSync(join(repoRoot, '__docs__/owner-business-assistant/owner-business-assistant_impl.md'), 'utf8');
const ownerBusinessAssistantFirebaseDoc = readFileSync(join(repoRoot, '__docs__/owner-business-assistant/owner-business-assistant_firebase.md'), 'utf8');
const ownerBusinessAssistantValidationDoc = readFileSync(join(repoRoot, '__docs__/owner-business-assistant/owner-business-assistant_validation.md'), 'utf8');
const productionReadinessAudit = readFileSync(join(repoRoot, '__docs__/audits/menulist-production-readiness-audit.md'), 'utf8');
const changelog = readFileSync(join(repoRoot, '__docs__/changelog.md'), 'utf8');
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
assert.match(feedbackRoute, /if \(!isValidFirestoreDocumentId\(docId\)\) \{/);
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

console.log('Owner Business Assistant hardening verification passed.');
