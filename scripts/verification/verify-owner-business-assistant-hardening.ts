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
import type {
  OwnerBusinessActionDefinition,
  OwnerBusinessAnalyticsPeriod,
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
  freshnessLabel: 'Latest settled data',
  sourceFactIds: ['analytics_test'],
};
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

const contextPacketCache = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/server/contextPacketCache.ts'), 'utf8');
assert.match(contextPacketCache, /serverPacketIndexPrefix/);
assert.match(contextPacketCache, /redis\.sadd/);
assert.match(contextPacketCache, /redis\.smembers/);
assert.match(contextPacketCache, /isNotReadyFallbackPacket/);

const locationsHook = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessLocationsSummary.ts'), 'utf8');
assert.match(locationsHook, /browserLocationsPrefix/);
assert.match(locationsHook, /\[OWNER_BUSINESS_ASSISTANT_ENDPOINTS\.locations, scope\] as const/);
assert.match(locationsHook, /fallbackData: cached/);
assert.match(locationsHook, /shouldRevalidate/);
assert.match(locationsHook, /browserReadModelTtlMs/);

const currentHook = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessHealthCurrent.ts'), 'utf8');
assert.match(currentHook, /browserReadModelTtlMs/);
const analyticsHook = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessAnalyticsIndex.ts'), 'utf8');
assert.match(analyticsHook, /browserReadModelTtlMs/);
const contextPacketHook = readFileSync(join(repoRoot, 'src/hooks/ownerBusinessAssistant/useOwnerBusinessContextPacket.ts'), 'utf8');
assert.match(contextPacketHook, /useOwnerBusinessHealthCurrent/);
assert.doesNotMatch(contextPacketHook, /useOwnerBusinessAnalyticsIndex/);
const analyticsStrip = readFileSync(join(repoRoot, 'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthAnalyticsStrip.tsx'), 'utf8');
assert.match(analyticsStrip, /useOwnerBusinessAnalyticsIndex/);
assert.doesNotMatch(analyticsStrip, /useOwnerBusinessHealthCurrent/);
assert.match(analyticsStrip, /numberFormatter/);
const dashboardHealthCard = readFileSync(join(repoRoot, 'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthDashboardCard.tsx'), 'utf8');
assert.match(dashboardHealthCard, /useOwnerBusinessHealthCurrent\(undefined, storeDetails\?\.storeId\)/);

const locationsRoute = readFileSync(join(repoRoot, 'src/app/api/owner-business-assistant/locations/route.ts'), 'utf8');
assert.match(locationsRoute, /parseSummaryStores/);
assert.match(locationsRoute, /doc\('storesSummary'\)/);
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
const businessHealthPage = readFileSync(join(repoRoot, 'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthPage.tsx'), 'utf8');
assert.match(businessHealthPage, /useOwnerBusinessContextPacket\(undefined, storeDetails\?\.storeId\)/);
const mobileHealthScreen = readFileSync(join(repoRoot, 'src/components/mobile/screens/MobileBusinessHealthScreen.tsx'), 'utf8');
assert.match(mobileHealthScreen, /Checked/);
assert.match(mobileHealthScreen, /useOwnerBusinessAnalyticsIndex/);
assert.match(mobileHealthScreen, /useOwnerBusinessHealthCurrent\(undefined, storeDetails\?\.storeId\)/);
assert.doesNotMatch(mobileHealthScreen, /current\?\.analyticsTeaser/);
const businessHealthRoute = readFileSync(join(repoRoot, 'src/app/(main)/business-health/page.tsx'), 'utf8');
assert.match(businessHealthRoute, /normalizeProjectId/);
assert.match(businessHealthRoute, /trimmed\.length <= 160/);

const requestSchemas = readFileSync(join(repoRoot, 'src/lib/ownerBusinessAssistant/schemas.ts'), 'utf8');
assert.match(requestSchemas, /owner_question_actionable/);
assert.match(requestSchemas, /multi_location_summary/);
assert.match(requestSchemas, /projectId: z\.string\(\)\.min\(1\)\.max\(160\)\.optional\(\)/);
assert.match(requestSchemas, /OwnerBusinessAssistantActionTargetKindSchema/);
assert.match(requestSchemas, /targetKind: OwnerBusinessAssistantActionTargetKindSchema\.optional\(\)/);
const featureFlags = readFileSync(join(repoRoot, 'src/config/features.ts'), 'utf8');
assert.match(featureFlags, /ENABLE_OWNER_BUSINESS_ACTION_PROVIDER_TEXT: false/);

const currentRoute = readFileSync(join(repoRoot, 'src/app/api/owner-business-assistant/current/route.ts'), 'utf8');
assert.match(currentRoute, /OwnerBusinessAssistantScopeSchema/);
assert.match(currentRoute, /safeParse\(Object\.fromEntries\(request\.nextUrl\.searchParams\.entries\(\)\)\)/);
const analyticsRoute = readFileSync(join(repoRoot, 'src/app/api/owner-business-assistant/analytics/route.ts'), 'utf8');
assert.match(analyticsRoute, /OwnerBusinessAssistantScopeSchema/);
assert.match(analyticsRoute, /packetProfile: 'analytics_periods'/);
const answerRoute = readFileSync(join(repoRoot, 'src/app/api/owner-business-assistant/answer/route.ts'), 'utf8');
assert.match(answerRoute, /threadWritten: true/);
assert.match(answerRoute, /answerEventWritten: true/);
assert.match(answerRoute, /firestoreWriteCount: \(answer\.metrics\?\.firestoreWriteCount \?\? 0\) \+ 1/);

console.log('Owner Business Assistant hardening verification passed.');
