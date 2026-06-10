import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  OWNER_BUSINESS_ASSISTANT_CACHE,
  OWNER_BUSINESS_ASSISTANT_ENDPOINTS,
} from '@lib/ownerBusinessAssistant/constants';
import { canRunOwnerBusinessAssistantPublicTruthAction } from '@lib/ownerBusinessAssistant/actions/publicTruthActionGuard';
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
  OwnerBusinessActionDefinition,
  OwnerBusinessAnalyticsPeriod,
  OwnerBusinessHealthCheck,
  OwnerBusinessHealthCurrentDoc,
} from '@lib/ownerBusinessAssistant/types';

const repoRoot = process.cwd();

const fakePublicTruthAction: OwnerBusinessActionDefinition = {
  actionType: 'fake_public_truth_action',
  ownerLabel: 'Fake public action',
  riskLevel: 'public_truth',
  requiredPermissions: [],
  requiredFlags: [],
  targetKinds: ['store'],
  resolver: 'existing_api',
  executor: 'server_adapter',
  cacheImpact: 'store_public',
};

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
  packetProfile: 'owner_question_actionable',
});
const healthKey = buildOwnerBusinessAssistantPacketCacheKey({
  tId: 1,
  sId: 2,
  projectId: 'project-a',
  includeProjectInCacheKey: false,
  packetProfile: 'health_card',
});

assert.equal(OWNER_BUSINESS_ASSISTANT_ENDPOINTS.locations, '/api/owner-business-assistant/locations');
assert.equal(OWNER_BUSINESS_ASSISTANT_CACHE.browserLocationsPrefix, 'ownerBusinessAssistant-locations');
assert.equal(OWNER_BUSINESS_ASSISTANT_CACHE.browserReadModelTtlMs, 10 * 60 * 1000);
assert.equal(OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketIndexPrefix, 'owner-business-assistant:packet-index:v1');
assert.match(answerKey, new RegExp(`${OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketPrefix}:1:2:p:project-a:profile:owner_question_actionable`));
assert.match(healthKey, new RegExp(`${OWNER_BUSINESS_ASSISTANT_CACHE.serverPacketPrefix}:1:2:p:_:profile:health_card`));
assert.notEqual(answerKey, healthKey, 'packet profiles must create separate cache keys');

assert.equal(
  canRunOwnerBusinessAssistantPublicTruthAction(fakePublicTruthAction),
  false,
  'public-truth actions must remain blocked until verified adapters are enabled',
);

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

const actionAuditLogger = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/actions/actionAuditLogger.ts'), 'utf8');
assert.match(actionAuditLogger, /operation !== 'navigate'/);
assert.match(actionAuditLogger, /return undefined/);
assert.match(actionAuditLogger, /firestoreWriteCount: \(params\.result\.metrics\?\.firestoreWriteCount \?\? 0\) \+ 1/);
const actionHook = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantAction.ts'), 'utf8');
assert.match(actionHook, /OwnerBusinessAssistantActionTargetKind/);
const actionExecutor = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/actions/actionExecutor.ts'), 'utf8');
assert.match(actionExecutor, /definition\.targetKinds\.includes/);
assert.match(actionExecutor, /That target is not supported for this action/);
const actionTargetResolver = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/actions/actionTargetResolver.ts'), 'utf8');
assert.match(actionTargetResolver, /withProjectQuery/);
assert.match(actionTargetResolver, /\?projectId=/);

const functionsWriter = readFileSync(join(repoRoot, 'functions/src/ownerBusinessAssistant/ownerBusinessHealthWriters.ts'), 'utf8');
assert.match(functionsWriter, /getMultiLocation/);
assert.match(functionsWriter, /invalidateOwnerBusinessAssistantContextPackets/);

const contextPacketBuilder = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/server/buildOwnerBusinessAssistantContextPacket.ts'), 'utf8');
assert.match(contextPacketBuilder, /packetProfile !== 'health_card'/);
assert.match(contextPacketBuilder, /packetProfile !== 'analytics_periods'/);
assert.match(contextPacketBuilder, /numberFormatter/);
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

const locationsHook = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessLocationsSummary.ts'), 'utf8');
assert.match(locationsHook, /browserLocationsPrefix/);
assert.match(locationsHook, /selectedStoreScope/);
assert.match(locationsHook, /params\.set\('storeId', String\(storeScopeKey\)\)/);
assert.match(locationsHook, /\[url, scope, selectedStoreScope\] as const/);
assert.match(locationsHook, /fallbackData: cached/);
assert.match(locationsHook, /shouldRevalidate/);
assert.match(locationsHook, /browserReadModelTtlMs/);

const currentHook = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessHealthCurrent.ts'), 'utf8');
assert.match(currentHook, /browserReadModelTtlMs/);
assert.match(currentHook, /params\.set\('storeId', String\(storeScopeKey\)\)/);
const analyticsHook = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessAnalyticsIndex.ts'), 'utf8');
assert.match(analyticsHook, /browserReadModelTtlMs/);
assert.match(analyticsHook, /params\.set\('storeId', String\(storeScopeKey\)\)/);
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
const desktopAssistantPanel = readFileSync(join(repoRoot, 'src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantPanel.tsx'), 'utf8');
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
assert.match(mobileHealthScreen, /useOwnerBusinessAssistantAction\(scopedProjectId, storeDetails\?\.storeId\)/);
assert.match(mobileHealthScreen, /ProjectSelectorList/);
assert.match(mobileHealthScreen, /ProjectSelectorTrigger/);
assert.match(mobileHealthScreen, /isLoading: isProjectsLoading/);
assert.match(mobileHealthScreen, /if \(!businessHealthProjectId \|\| isProjectsLoading\) return/);
assert.doesNotMatch(mobileHealthScreen, /current\?\.analyticsTeaser/);
assert.doesNotMatch(mobileHealthScreen, /<Card title="Open">/);
const mobileDashboardScreen = readFileSync(join(repoRoot, 'src/components/mobile/screens/MobileDashboardScreen.tsx'), 'utf8');
assert.match(mobileDashboardScreen, /isBusinessHealthReady/);
assert.match(mobileDashboardScreen, /enabled: canShowBusinessHealthAnalytics && isBusinessHealthReady/);
const businessHealthRoute = readFileSync(join(repoRoot, 'src/app/(main)/business-health/page.tsx'), 'utf8');
assert.match(businessHealthRoute, /normalizeProjectId/);
assert.match(businessHealthRoute, /trimmed\.length <= 160/);

const requestSchemas = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/schemas.ts'), 'utf8');
assert.match(requestSchemas, /owner_question_actionable/);
assert.match(requestSchemas, /multi_location_summary/);
assert.match(requestSchemas, /projectId: z\.string\(\)\.min\(1\)\.max\(160\)\.optional\(\)/);
assert.match(requestSchemas, /OwnerBusinessAssistantStoreIdSchema/);
assert.match(requestSchemas, /storeId: OwnerBusinessAssistantStoreIdSchema/);
assert.match(requestSchemas, /OwnerBusinessAssistantActionTargetKindSchema/);
assert.match(requestSchemas, /targetKind: OwnerBusinessAssistantActionTargetKindSchema\.optional\(\)/);
const featureFlags = readFileSync(join(repoRoot, 'src/config/features.ts'), 'utf8');
assert.match(featureFlags, /ENABLE_OWNER_BUSINESS_ACTION_PROVIDER_TEXT: false/);

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

console.log('Owner Business Assistant hardening verification passed.');
