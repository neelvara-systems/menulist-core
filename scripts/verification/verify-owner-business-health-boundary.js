#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing required file: ${file}`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function requireMissing(file, label) {
  if (fs.existsSync(path.join(root, file))) {
    failures.push(`${label} must stay removed: ${file}`);
  }
}

function requireToken(source, token, label) {
  if (!source.includes(token)) {
    failures.push(`${label} missing token: ${token}`);
  }
}

function forbidToken(source, token, label) {
  if (source.includes(token)) {
    failures.push(`${label} must not include token: ${token}`);
  }
}

function requireOrder(source, tokens, label) {
  let previousIndex = -1;
  for (const token of tokens) {
    const index = source.indexOf(token, previousIndex + 1);
    if (index === -1) {
      failures.push(`${label} missing ordered token: ${token}`);
      return;
    }
    if (index <= previousIndex) {
      failures.push(`${label} token out of order: ${token}`);
      return;
    }
    previousIndex = index;
  }
}

const packageJson = read('package.json');
const businessHealthRoute = read('src/app/(main)/business-health/page.tsx');
const businessHealthPage = read('src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthPage.tsx');
const ownerAssistantPanel = read('src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantPanel.tsx');
const mobileHealthScreen = read('src/components/mobile/screens/MobileBusinessHealthScreen.tsx');
const mobileShell = read('src/components/mobile/MobileShell.tsx');
const mobileMoreScreen = read('src/components/mobile/screens/MobileMoreScreen.tsx');
const currentRoute = read('src/app/api/owner-business-assistant/current/route.ts');
const analyticsRoute = read('src/app/api/owner-business-assistant/analytics/route.ts');
const locationsRoute = read('src/app/api/owner-business-assistant/locations/route.ts');
const answerRoute = read('src/app/api/owner-business-assistant/answer/route.ts');
const feedbackRoute = read('src/app/api/owner-business-assistant/feedback/route.ts');
const schemas = read('src/lib/ownerBusinessAssistant/schemas.ts');
const constants = read('src/lib/ownerBusinessAssistant/constants.ts');
const clientResponses = read('src/lib/ownerBusinessAssistant/clientResponses.ts');
const apiGuards = read('src/lib/ownerBusinessAssistant/server/apiGuards.ts');
const contextPacketBuilder = read('src/lib/ownerBusinessAssistant/server/buildOwnerBusinessAssistantContextPacket.ts');
const domainMatrix = read('src/lib/ownerBusinessAssistant/server/domainCapabilityMatrix.ts');
const answerResolver = read('src/lib/ownerBusinessAssistant/server/resolveOwnerBusinessAssistantAnswer.ts');
const threadStore = read('src/lib/ownerBusinessAssistant/server/threadStore.ts');
const businessSignals = read('src/lib/ownerBusinessAssistant/businessSignals.ts');
const currentHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessHealthCurrent.ts');
const analyticsHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessAnalyticsIndex.ts');
const answerHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantAnswer.ts');
const threadHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantThread.ts');
const locationsHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessLocationsSummary.ts');
const feedbackHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantFeedback.ts');
const platformMonitorRoute = read('src/app/api/platform/owner-business-assistant/monitor/route.ts');
const readme = read('__docs__/owner-business-assistant/README.md');
const businessHealthDoc = read('__docs__/owner-business-assistant/owner-business-assistant_business-health.md');
const mobileSupportDoc = read('__docs__/owner-business-assistant/owner-business-assistant_mobile-support.md');
const firebaseDoc = read('__docs__/owner-business-assistant/owner-business-assistant_firebase.md');
const validationDoc = read('__docs__/owner-business-assistant/owner-business-assistant_validation.md');
const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/CHANGELOG.md');

requireToken(
  packageJson,
  '"verify:owner-business-health-boundary": "node scripts/verification/verify-owner-business-health-boundary.js"',
  'package scripts',
);
requireToken(
  packageJson,
  '"verify:owner-business-assistant": "ts-node --compiler-options',
  'existing owner-business-assistant hardening script',
);

[
  "import { BusinessHealthPage } from '@template/main-app/ownerBusinessAssistant/BusinessHealthPage';",
  'trimmed.length <= 160',
  'FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH',
  'FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_PAGE',
  '<BusinessHealthPage projectId={normalizeProjectId(searchParams?.projectId)} />',
].forEach((token) => requireToken(businessHealthRoute, token, 'business health route'));

[
  'useOwnerBusinessContextPacket(undefined, storeDetails?.storeId)',
  'useOwnerPublicTruthReadiness({',
  'BusinessHealthProjectScopeSelector',
  'BusinessHealthLocationSummary',
  '<BusinessHealthAnalyticsStrip',
  'enabled={isHealthReady}',
  '<BusinessHealthPriorityChecks',
  '<OwnerAssistantPanel',
  'current={current}',
  'storeScopeKey={storeDetails?.storeId}',
  "key={`${storeDetails?.storeId || 'store'}:${scopedProjectId || 'all'}`}",
].forEach((token) => requireToken(businessHealthPage, token, 'desktop business health page'));

[
  'useOwnerBusinessHealthCurrent(undefined, storeDetails?.storeId)',
  'useOwnerBusinessAnalyticsIndex(scopedProjectId, storeDetails?.storeId, { enabled: isHealthReady })',
  'useOwnerBusinessAssistantAnswer(scopedProjectId, {',
  "currentRoute: '/business-health'",
  "mobileTab: 'more'",
  'useOwnerBusinessAssistantThread(threadId, storeDetails?.storeId)',
  'useOwnerBusinessLocationsSummary(',
  'ProjectSelectorTrigger',
  'ProjectSelectorList',
  'handlePublicTruthFixTarget',
  'onOpenMenuTab?.()',
  'onOpenShareTab?.()',
  'onOpenMoreScreen?.(moreTarget)',
  'mobile_business_health_answer_failed',
].forEach((token) => requireToken(mobileHealthScreen, token, 'mobile business health screen'));
forbidToken(mobileHealthScreen, 'useOwnerBusinessAssistantAction', 'mobile business health action hook');
forbidToken(mobileHealthScreen, 'MobileBusinessHealthActionSheet', 'mobile business health action sheet');
forbidToken(mobileHealthScreen, 'window.location', 'mobile business health route bypass');
forbidToken(ownerAssistantPanel, 'OwnerAssistantActionSheet', 'desktop business health action sheet');

[
  "'/business-health': { tab: 'more', todayScreen: 'main', moreScreen: 'businessHealth' }",
  'OWNER_PATH_TO_MOBILE_ROUTE[normalizedPathname]',
  "setMoreScreen('businessHealth')",
  '<MobileMoreScreen initialScreen={moreScreen}',
].forEach((token) => requireToken(mobileShell, token, 'MobileShell business health route'));

[
  "else if (subScreen === 'businessHealth')",
  '<MobileBusinessHealthScreen',
  'onOpenMoreScreen={openSubScreen}',
].forEach((token) => requireToken(mobileMoreScreen, token, 'Mobile More business health route'));

[
  'export const GET = withAuth(async (request: NextRequest, session) => {',
  'applyOwnerBusinessAssistantRateLimit({',
  "feature: 'DATA_READ'",
  'OwnerBusinessAssistantScopeSchema',
  'safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))',
  'resolveOwnerAssistantSelectedStoreScope(request, session, parsedScope.data.storeId)',
  'requireAnyStorePermissionForStore(',
  '[PERMISSIONS.VIEW_ANALYTICS]',
  "packetProfile: 'health_card'",
].forEach((token) => requireToken(currentRoute, token, 'current route'));

[
  'export const GET = withAuth(async (request: NextRequest, session) => {',
  "packetProfile: 'analytics_periods'",
  'resolveOwnerAssistantSelectedStoreScope(request, session, parsedScope.data.storeId)',
  'requireAnyStorePermissionForStore(',
  '[PERMISSIONS.VIEW_ANALYTICS]',
].forEach((token) => requireToken(analyticsRoute, token, 'analytics route'));

[
  'parseSummaryStores',
  "doc('storesSummary')",
  'resolveOwnerAssistantSelectedStoreScope',
  'isActiveStore',
  'normalizeLocationStore',
  'firestoreReadCount: 2',
].forEach((token) => requireToken(locationsRoute, token, 'locations route'));

[
  'export const POST = withAuth(async (request: NextRequest, session) => {',
  'const OWNER_BUSINESS_ASSISTANT_ANSWER_MAX_BODY_BYTES = 32 * 1024;',
  'if (FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_AI_ANSWERS) {',
  'const safeMode = await checkSafeMode();',
  "feature: FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_AI_ANSWERS ? 'AI_OPERATION' : 'DATA_READ'",
  'await readBoundedJsonBody(',
  'OwnerBusinessAssistantAnswerRequestSchema.safeParse(bodyResult.data)',
  'normalizeSuggestedQuestionRequest(parsed.data)',
  'resolveOwnerAssistantSelectedStoreScope(request, session, normalizedRequest.storeId)',
  'requireAnyStorePermissionForStore(',
  'resolveOwnerBusinessAssistantAnswer({',
  'persistOwnerBusinessAssistantExchange({',
  'logOwnerBusinessAssistantAnswerEvent({',
  'owner_business_assistant_thread_persistence_failed',
  'owner_business_assistant_answer_event_logging_failed',
].forEach((token) => requireToken(answerRoute, token, 'answer route'));
forbidToken(answerRoute, 'request.json()', 'answer route raw request parsing');
forbidToken(answerRoute, 'logger.warn', 'answer route raw warn logging');

[
  'readBoundedJsonBody',
  'OWNER_BUSINESS_ASSISTANT_FEEDBACK_MAX_BODY_BYTES = 8 * 1024',
  'OwnerBusinessAssistantFeedbackRequestSchema.safeParse(bodyResult.data)',
  'resolveOwnerAssistantSelectedStoreScope(request, session, parsed.data.storeId)',
  'requireAnyStorePermissionForStore',
  'OWNER_BUSINESS_ASSISTANT_FEEDBACK',
].forEach((token) => requireToken(feedbackRoute, token, 'feedback route'));
forbidToken(feedbackRoute, 'request.json()', 'feedback route raw request parsing');

[
  'OWNER_BUSINESS_ASSISTANT_READ_MODEL_RESPONSE_JSON_MAX_BYTES = 256 * 1024',
  'OWNER_BUSINESS_ASSISTANT_MUTATION_RESPONSE_JSON_MAX_BYTES = 16 * 1024',
  'OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY',
  "cache: 'no-store'",
  "credentials: 'same-origin'",
  "redirect: 'manual'",
  'readJsonResponseWithLimit<unknown>',
  'readOwnerBusinessAssistantCurrentResponse',
  'readOwnerBusinessAssistantAnalyticsResponse',
  'readOwnerBusinessAssistantLocationsResponse',
  'readOwnerBusinessAssistantThreadResponse',
  'readOwnerBusinessAssistantFeedbackResponse',
].forEach((token) => requireToken(clientResponses, token, 'client response helpers'));

[
  'OWNER_BUSINESS_ASSISTANT_ENDPOINTS',
  "locations: '/api/owner-business-assistant/locations'",
  'browserReadModelTtlMs: 10 * 60 * 1000',
  'serverPacketIndexPrefix',
].forEach((token) => requireToken(constants, token, 'owner business constants'));
forbidToken(constants, 'action:', 'owner business action endpoint');

[
  'OwnerBusinessAssistantScopeSchema',
  'OwnerBusinessAssistantStoreIdSchema',
  'projectId: z.string().min(1).max(160).optional()',
  'multi_location_summary',
].forEach((token) => requireToken(schemas, token, 'owner business schemas'));
forbidToken(schemas, 'owner_question_actionable', 'owner business action schema');
forbidToken(schemas, 'targetKind', 'owner business action target schema');

[
  'getBoundedSecurityRouteContext',
  "getBoundedSecurityStringContext('attemptedStoreId', selectedStoreId)",
  'applyOwnerBusinessAssistantRateLimit',
].forEach((token) => requireToken(apiGuards, token, 'owner business API guards'));

[
  "packetProfile !== 'health_card'",
  "packetProfile !== 'analytics_periods'",
  'numberFormatter',
].forEach((token) => requireToken(contextPacketBuilder, token, 'context packet builder'));
forbidToken(contextPacketBuilder, 'allowedActions', 'context packet action catalog');
forbidToken(contextPacketBuilder, 'actionCatalog', 'context packet action catalog');

[
  'buildOwnerBusinessDomainCapabilities',
  'OWNER_BUSINESS_ASSISTANT_DOMAINS.map((domain)',
  'summary_only',
].forEach((token) => requireToken(domainMatrix, token, 'domain capability matrix'));

[
  'resolveOwnerBusinessAssistantAnswer',
  'buildOwnerBusinessAssistantRefusal',
  'supportedDomains',
].forEach((token) => requireToken(answerResolver, token, 'answer resolver'));

[
  'MAX_MESSAGES_PER_THREAD = 20',
  'messages: nextMessages',
  'params.request.projectId || params.request.clientContext?.selectedProjectId',
].forEach((token) => requireToken(threadStore, token, 'thread store'));

[
  'OwnerBusinessSignalAction = \'promote\' | \'fix\' | \'restock\' | \'update\'',
  'Update link',
  'Restock them or hide them',
].forEach((token) => requireToken(businessSignals, token, 'business signals'));

[
  [currentHook, 'readOwnerBusinessAssistantCurrentResponse', 'current hook'],
  [currentHook, 'OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY', 'current hook'],
  [analyticsHook, 'readOwnerBusinessAssistantAnalyticsResponse', 'analytics hook'],
  [answerHook, 'readJsonResponseWithLimit', 'answer hook'],
  [answerHook, 'OWNER_BUSINESS_ASSISTANT_ANSWER_RESPONSE_JSON_MAX_BYTES', 'answer hook'],
  [threadHook, 'readOwnerBusinessAssistantThreadResponse', 'thread hook'],
  [locationsHook, 'readOwnerBusinessAssistantLocationsResponse', 'locations hook'],
  [feedbackHook, 'readOwnerBusinessAssistantFeedbackResponse', 'feedback hook'],
].forEach(([source, token, label]) => requireToken(source, token, label));
[
  currentHook,
  analyticsHook,
  threadHook,
  locationsHook,
].forEach((source, index) => forbidToken(source, 'response.json()', `read-model hook ${index + 1}`));

[
  'owner_business_assistant_monitor_route_failed',
  'logRuntimeFailure',
  "getBoundedRuntimeStringContext('requestPath', request.nextUrl.pathname)",
].forEach((token) => requireToken(platformMonitorRoute, token, 'platform monitor route'));
forbidToken(platformMonitorRoute, 'recentActions', 'platform monitor action metrics');
forbidToken(platformMonitorRoute, 'OWNER_BUSINESS_ASSISTANT_ACTIONS', 'platform monitor action collection');

[
  'src/app/api/owner-business-assistant/action/route.ts',
  'src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantAction.ts',
  'src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantActionSheet.tsx',
  'src/components/mobile/sheets/MobileBusinessHealthActionSheet.tsx',
  'src/lib/ownerBusinessAssistant/actions/actionAccess.ts',
  'src/lib/ownerBusinessAssistant/actions/actionExecutor.ts',
  'src/lib/ownerBusinessAssistant/actions/actionRegistry.ts',
].forEach((file) => requireMissing(file, 'removed Business Health action support'));

[
  'Owner Business Health boundary source gate',
  '`npm run verify:owner-business-health-boundary`',
  'read-only Business Health and grounded answer surface',
  'must not prepare action drafts',
  'Browser read-model hooks parse current, analytics, locations, and thread responses through a shared 256KB bounded reader',
].forEach((token) => requireToken(readme, token, 'owner business README'));

[
  'Owner Business Health boundary source gate',
  '`npm run verify:owner-business-health-boundary`',
  'read-only AI diagnostic runtime',
  'Business Health must not',
  'update menu/store/outlet/staff/public truth',
].forEach((token) => requireToken(businessHealthDoc, token, 'business health doc'));

[
  'Owner Business Health boundary source gate',
  '`npm run verify:owner-business-health-boundary`',
  'MobileShell read-only screen',
  'desktop route bypass through `window.location`',
  'Asking for a mutation does not mutate truth and does not open an action sheet',
].forEach((token) => requireToken(mobileSupportDoc, token, 'mobile support doc'));

[
  '`npm run verify:owner-business-health-boundary`',
  'read-only source gate',
  'No public truth writes',
].forEach((token) => requireToken(firebaseDoc, token, 'firebase doc'));

[
  '`npm run verify:owner-business-health-boundary`',
  'read-only boundary',
].forEach((token) => requireToken(validationDoc, token, 'validation doc'));

[
  ['inventory', inventory, 'owner_business_health'],
  ['inventory', inventory, 'owner-business-health boundary source gate passed'],
  ['report', report, '## Owner Business Health Boundary'],
  ['report', report, '`npm run verify:owner-business-health-boundary`'],
  ['audit', audit, 'Owner Business Health boundary checkpoint'],
  ['audit', audit, '`npm run verify:owner-business-health-boundary`'],
  ['changelog', changelog, 'Owner Business Health Boundary'],
  ['changelog', changelog, '`npm run verify:owner-business-health-boundary`'],
].forEach(([label, source, token]) => requireToken(source, token, `owner business health ledger ${label}`));

requireOrder(
  answerRoute,
  [
    'await readBoundedJsonBody(',
    'OwnerBusinessAssistantAnswerRequestSchema.safeParse(bodyResult.data)',
    'resolveOwnerAssistantSelectedStoreScope(request, session, normalizedRequest.storeId)',
    'requireAnyStorePermissionForStore(',
    'resolveOwnerBusinessAssistantAnswer({',
  ],
  'answer route admission order',
);

if (failures.length > 0) {
  console.error('FAIL verify-owner-business-health-boundary');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('PASS verify-owner-business-health-boundary');
console.log('Validated read-only Business Health route/API/mobile/docs boundary, bounded responses, removed action surfaces, and ledger coverage.');
