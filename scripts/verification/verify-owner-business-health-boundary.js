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
const publicTruthOwnerCard = read('src/components/templates/main-app/ownerBusinessAssistant/PublicTruthOwnerCheckCard.tsx');
const mobileHealthScreen = read('src/components/mobile/screens/MobileBusinessHealthScreen.tsx');
const mobilePublicTruthOwnerCard = read('src/components/mobile/components/MobilePublicTruthOwnerCheckCard.tsx');
const mobileShell = read('src/components/mobile/MobileShell.tsx');
const mobileMoreScreen = read('src/components/mobile/screens/MobileMoreScreen.tsx');
const permissionRequirements = read('src/lib/permissions/permissionRequirements.ts');
const currentRoute = read('src/app/api/owner-business-assistant/current/route.ts');
const analyticsRoute = read('src/app/api/owner-business-assistant/analytics/route.ts');
const locationsRoute = read('src/app/api/owner-business-assistant/locations/route.ts');
requireToken(locationsRoute, "'Cache-Control': 'private, no-store, max-age=0'", 'locations route private response cache boundary');
requireToken(locationsRoute, "'X-Content-Type-Options': 'nosniff'", 'locations route JSON content boundary');
if ((locationsRoute.match(/return NextResponse\.json\(/g) || []).length !== 1) {
  failures.push('locations route must keep NextResponse.json encapsulated by its private response boundary');
}
const answerRoute = read('src/app/api/owner-business-assistant/answer/route.ts');
const feedbackRoute = read('src/app/api/owner-business-assistant/feedback/route.ts');
const threadRoute = read('src/app/api/owner-business-assistant/thread/[threadId]/route.ts');
const schemas = read('src/lib/ownerBusinessAssistant/schemas.ts');
const threadIdBoundary = read('src/lib/ownerBusinessAssistant/threadIdBoundary.ts');
const threadResponse = read('src/lib/ownerBusinessAssistant/threadResponse.ts');
const constants = read('src/lib/ownerBusinessAssistant/constants.ts');
const clientResponses = read('src/lib/ownerBusinessAssistant/clientResponses.ts');
const apiGuards = read('src/lib/ownerBusinessAssistant/server/apiGuards.ts');
const sessionScope = read('src/lib/ownerBusinessAssistant/server/sessionScope.ts');
const clientScope = read('src/lib/ownerBusinessAssistant/clientScope.ts');
const contextPacketCache = read('src/lib/ownerBusinessAssistant/server/contextPacketCache.ts');
const contextPacketBuilder = read('src/lib/ownerBusinessAssistant/server/buildOwnerBusinessAssistantContextPacket.ts');
const domainMatrix = read('src/lib/ownerBusinessAssistant/server/domainCapabilityMatrix.ts');
const answerResolver = read('src/lib/ownerBusinessAssistant/server/resolveOwnerBusinessAssistantAnswer.ts');
const answerEventLogger = read('src/lib/ownerBusinessAssistant/server/answerEventLogger.ts');
const threadStore = read('src/lib/ownerBusinessAssistant/server/threadStore.ts');
const maintenanceScheduler = read('functions/src/schedulers/menulistMaintenanceScheduler.ts');
const businessSignals = read('src/lib/ownerBusinessAssistant/businessSignals.ts');
const ownerPublicTruthReadiness = read('src/lib/public-truth-tools/ownerPublicTruthReadiness.ts');
const currentHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessHealthCurrent.ts');
const analyticsHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessAnalyticsIndex.ts');
const answerHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantAnswer.ts');
const threadHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantThread.ts');
const locationsHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessLocationsSummary.ts');
const feedbackHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantFeedback.ts');
const platformMonitorRoute = read('src/app/api/platform/owner-business-assistant/monitor/route.ts');
const readme = read('__docs__/owner-business-assistant/README.md');
const businessHealthDoc = read('__docs__/owner-business-assistant/owner-business-assistant_business-health.md');
const implDoc = read('__docs__/owner-business-assistant/owner-business-assistant_impl.md');
const mobileSupportDoc = read('__docs__/owner-business-assistant/owner-business-assistant_mobile-support.md');
const firebaseDoc = read('__docs__/owner-business-assistant/owner-business-assistant_firebase.md');
const validationDoc = read('__docs__/owner-business-assistant/owner-business-assistant_validation.md');
const helpDoc = read('__docs__/owner-business-assistant/owner-business-assistant_helpdoc.md');
const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');

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
  "import { normalizeOwnerBusinessAssistantProjectId } from '@lib/ownerBusinessAssistant/projectIdBoundary';",
  'return normalizeOwnerBusinessAssistantProjectId(raw) || undefined;',
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
  'Official customer source',
  'report.modules.map',
  'report.setupJobList',
  'Next public fixes',
  'job.fixHref',
  'job.actionLabel',
  'External platforms stay owner-confirmed',
].forEach((token) => requireToken(publicTruthOwnerCard, token, 'desktop public truth owner card'));

[
  'report.modules.map',
  'report?.setupJobList',
  'Next public fixes',
  'job.mobileFixTarget',
  'job.actionLabel',
  'External platforms stay owner-confirmed',
].forEach((token) => requireToken(mobilePublicTruthOwnerCard, token, 'mobile public truth owner card'));
forbidToken(mobilePublicTruthOwnerCard, 'window.location', 'mobile public truth owner card route bypass');

[
  "'/business-health': { tab: 'more', todayScreen: 'main', moreScreen: 'businessHealth' }",
  'OWNER_PATH_TO_MOBILE_ROUTE[normalizedPathname]',
  "setMoreScreen('businessHealth')",
  "if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH || !canViewAnalytics)",
  "moreScreen === 'businessHealth'",
  "&& (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH || !canViewAnalytics)",
  'canViewAnalytics && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH',
  '<MobileMoreScreen initialScreen={moreScreen}',
].forEach((token) => requireToken(mobileShell, token, 'MobileShell business health route'));

[
  'pathname === "/dashboard" || pathname === "/business-health"',
  'requirement: { anyOf: [PERMISSIONS.VIEW_ANALYTICS], label: "Analytics" }',
].forEach((token) => requireToken(permissionRequirements, token, 'desktop analytics permission route guard'));

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
  'OWNER_BUSINESS_ASSISTANT_THREAD_ID_PATTERN',
  'normalizeOwnerBusinessAssistantThreadId',
  'isValidFirestoreDocumentId(threadId)',
].forEach((token) => requireToken(threadIdBoundary, token, 'owner business thread ID boundary'));

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

const ownerBusinessAssistantCleanupStart = maintenanceScheduler.indexOf(
  'async function runOwnerBusinessAssistantCleanup(): Promise<MaintenanceTaskResult> {',
);
const ownerBusinessAssistantCleanupEnd = maintenanceScheduler.indexOf(
  '\nasync function runAlertEscalation(): Promise<MaintenanceTaskResult> {',
  ownerBusinessAssistantCleanupStart,
);
const ownerBusinessAssistantCleanup = ownerBusinessAssistantCleanupStart >= 0
  && ownerBusinessAssistantCleanupEnd > ownerBusinessAssistantCleanupStart
  ? maintenanceScheduler.slice(ownerBusinessAssistantCleanupStart, ownerBusinessAssistantCleanupEnd)
  : '';
[
  'DB_COLLECTIONS.PLATFORM_SUMMARY',
  "kind: 'ownerBusinessHealthSnapshot'",
  'DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_ANSWER_EVENTS',
  'DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_FEEDBACK',
  'DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_THREADS',
].forEach((token) => requireToken(
  ownerBusinessAssistantCleanup,
  token,
  'owner business assistant retention cleanup',
));
forbidToken(
  ownerBusinessAssistantCleanup,
  'isFunctionFeatureEnabled',
  'owner business assistant retention cleanup feature gate',
);
forbidToken(
  ownerBusinessAssistantCleanup,
  'skippedCleanup',
  'owner business assistant retention cleanup skip branch',
);

[
  'OwnerBusinessAssistantThreadParamsSchema.safeParse(params)',
  'applyOwnerBusinessAssistantRateLimit({',
  "feature: 'DATA_READ'",
  'OwnerBusinessAssistantScopeSchema',
  'resolveOwnerAssistantSelectedStoreScope(request, session, parsedScope.data.storeId)',
  'requireAnyStorePermissionForStore(',
  'DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_THREADS',
  '.doc(parsed.data.threadId)',
  'isOwnerBusinessAssistantThreadOwnedByScope(thread, scope)',
  'projectOwnerBusinessAssistantMessage',
  'threadId: parsed.data.threadId',
].forEach((token) => requireToken(threadRoute, token, 'thread route'));
forbidToken(threadRoute, 'const threadMeta = { ...thread };', 'thread route raw persistence spread');
requireOrder(
  threadRoute,
  [
    'OwnerBusinessAssistantThreadParamsSchema.safeParse(params)',
    'applyOwnerBusinessAssistantRateLimit({',
    'OwnerBusinessAssistantScopeSchema',
    'resolveOwnerAssistantSelectedStoreScope(request, session, parsedScope.data.storeId)',
    '.doc(parsed.data.threadId)',
  ],
  'thread route validation and scope before Firestore read',
);

[
  'readBoundedJsonBody',
  'OWNER_BUSINESS_ASSISTANT_FEEDBACK_MAX_BODY_BYTES = 8 * 1024',
  "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
  'OwnerBusinessAssistantFeedbackRequestSchema.safeParse(bodyResult.data)',
  'resolveOwnerAssistantSelectedStoreScope(request, session, parsed.data.storeId)',
  'requireAnyStorePermissionForStore',
  'if (!isValidFirestoreDocumentId(docId)) {',
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
  'owner_business_assistant_packet_cache_index_read_failed',
  'owner_business_assistant_packet_cache_read_failed',
  'owner_business_assistant_packet_cache_write_failed',
  'owner_business_assistant_packet_cache_invalidate_failed',
  'getOwnerBusinessAssistantPacketCacheContext',
  "getBoundedRuntimeStringContext('cacheKey', params.cacheKey)",
  "getBoundedRuntimeStringContext('indexKey', params.indexKey)",
  "fallbackPolicy: 'cache_miss'",
  "fallbackPolicy: 'skip_cache_write'",
  "fallbackPolicy: 'best_effort_invalidation'",
].forEach((token) => requireToken(contextPacketCache, token, 'owner business packet cache diagnostics'));
forbidToken(contextPacketCache, 'catch {\n    return null;', 'owner business packet cache silent read fallback');
forbidToken(contextPacketCache, 'catch {\n    return { attempted: true', 'owner business packet cache silent invalidation fallback');

[
  'OwnerBusinessAssistantScopeSchema',
  'OwnerBusinessAssistantStoreIdSchema',
  "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
  "import { normalizeOwnerBusinessAssistantProjectId } from './projectIdBoundary';",
  'const OwnerBusinessAssistantProjectIdSchema = z.preprocess',
  'normalizeOwnerBusinessAssistantProjectId(value) === value',
  'projectId: OwnerBusinessAssistantProjectIdSchema',
  'selectedProjectId: OwnerBusinessAssistantProjectIdSchema',
  'normalizeOwnerBusinessAssistantThreadId(value) === value',
  'const OwnerBusinessAssistantAnswerIdSchema = z.string()',
  ".refine((value) => value === value.trim() && isValidFirestoreDocumentId(value), 'Invalid answer ID')",
  'answerId: OwnerBusinessAssistantAnswerIdSchema',
  'multi_location_summary',
].forEach((token) => requireToken(schemas, token, 'owner business schemas'));

[
  "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
  'const normalizeAnswerEventDocumentId = (value: unknown): string | null => {',
  'return documentId === value && isValidFirestoreDocumentId(documentId) ? documentId : null;',
  'const answerId = normalizeAnswerEventDocumentId(params.answer.answerId);',
  'if (!answerId) return;',
  '.doc(answerId)',
  'answerId,',
].forEach((token) => requireToken(answerEventLogger, token, 'owner business answer event ID boundary'));
requireOrder(
  answerEventLogger,
  [
    'const answerId = normalizeAnswerEventDocumentId(params.answer.answerId);',
    '.doc(answerId)',
  ],
  'owner business answer event ID boundary order',
);
forbidToken(answerEventLogger, '.doc(params.answer.answerId)', 'owner business answer event raw document ID');

[
  'OWNER_BUSINESS_ASSISTANT_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/',
  'normalizeOwnerBusinessAssistantProjectId',
  'projectId === value',
  'isValidFirestoreDocumentId(projectId)',
].forEach((token) => requireToken(read('src/lib/ownerBusinessAssistant/projectIdBoundary.ts'), token, 'owner business project ID boundary'));
[
  'OWNER_BUSINESS_ASSISTANT_THREAD_ID_PATTERN',
  'threadId === value',
  'isValidFirestoreDocumentId(threadId)',
].forEach((token) => requireToken(read('src/lib/ownerBusinessAssistant/threadIdBoundary.ts'), token, 'owner business thread ID boundary'));
requireToken(schemas, "if (typeof value === 'string') return value;", 'owner business project ID raw schema');
forbidToken(schemas, "if (typeof value === 'string') return value.trim();", 'owner business project ID trim-before-validation schema');
forbidToken(schemas, 'const OwnerBusinessAssistantThreadIdSchema = z.string()\n  .trim()', 'owner business thread ID trim-before-validation schema');
requireToken(schemas, ".refine((value) => value === value.trim() && isValidFirestoreDocumentId(value), 'Invalid answer ID')", 'owner business feedback answer ID strict schema');
forbidToken(schemas, 'projectId: z.string().min(1).max(160).optional()', 'owner business project ID loose schema');
forbidToken(schemas, 'answerId: z.string().min(1).max(180)', 'owner business feedback answer ID loose schema');
forbidToken(schemas, 'owner_question_actionable', 'owner business action schema');
forbidToken(schemas, 'targetKind', 'owner business action target schema');

[
  'Business Health project ID boundary',
  'src/lib/ownerBusinessAssistant/projectIdBoundary.ts',
  'whitespace-mutated',
  'does not trim before `normalizeOwnerBusinessAssistantProjectId(value) === value`',
  'before selected project IDs can become read-model query scope, answer context-packet scope, browser/server cache keys, or thread message scope',
].forEach((token) => requireToken(implDoc, token, 'owner business implementation project ID boundary docs'));
[
  'Business Health project ID admission is cost-neutral',
  'src/lib/ownerBusinessAssistant/projectIdBoundary.ts',
  'whitespace-mutated',
  'does not trim before `normalizeOwnerBusinessAssistantProjectId(value) === value`',
  'before those values can become current/analytics query scope, answer context-packet scope, browser/server cache keys, or thread message project scope',
].forEach((token) => requireToken(firebaseDoc, token, 'owner business Firebase project ID boundary docs'));
[
  'Business Health Project ID Boundary checkpoint',
  'src/lib/ownerBusinessAssistant/projectIdBoundary.ts',
  'malformed selected `projectId` values can no longer become Business Health query scope, answer context-packet scope, browser/server cache keys, or thread message project scope',
].forEach((token) => requireToken(audit, token, 'production audit owner business project ID boundary'));
[
  'Business Health Project ID Boundary',
  'Business Health selected project IDs are validated before scope/cache use',
  'Malformed selected project IDs fail closed',
].forEach((token) => requireToken(changelog, token, 'changelog owner business project ID boundary'));

[
  'getBoundedSecurityRouteContext',
  "getBoundedSecurityStringContext('attemptedStoreId', selectedStoreId)",
  'applyOwnerBusinessAssistantRateLimit',
  "const failClosedOnProviderError = params.feature === 'AI_OPERATION';",
  'failClosedOnProviderError,',
  "const providerUnavailable = rateLimit.reason === 'provider_unavailable';",
  'status: providerUnavailable ? 503 : 429',
].forEach((token) => requireToken(apiGuards, token, 'owner business API guards'));
[
  'resolveStorePermissionSessionScope(session)',
  'normalized.every((actorId) => actorId === first)',
  'resolveOwnerBusinessAssistantSessionScope',
].forEach((token) => requireToken(sessionScope, token, 'owner business exact session scope'));
requireToken(apiGuards, 'resolveOwnerBusinessAssistantSessionScope(session)', 'owner business API exact session scope');
[
  'resolveCurrentSessionUserDocumentId(session)',
  'actorId,',
  'encodeURIComponent(scope.actorId)',
  "projectId ? `project:${encodeURIComponent(projectId)}` : 'all'",
].forEach((token) => requireToken(clientScope, token, 'owner business exact browser actor scope'));
requireToken(threadHook, '[url, clientScope.cacheScope, clientScope.actorId] as const', 'owner business personal thread SWR identity');
requireToken(answerHook, 'session?.uId, session?.user?.id', 'owner business personal thread memo identity');
[
  'export const projectOwnerBusinessAssistantMessage = (value: unknown) => {',
  'sourceFactIds:',
  'suggestedQuestions:',
  'export function isOwnerBusinessAssistantThreadOwnedByScope(',
].forEach((token) => requireToken(threadResponse, token, 'owner business thread response projector'));
forbidToken(threadResponse, '...message', 'owner business thread response raw message spread');
requireToken(packageJson, 'test:owner-business-assistant-session-scope', 'owner business session-scope regression script');
requireToken(packageJson, 'test:owner-business-assistant-thread-response', 'owner business thread-response regression script');

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
  'normalizeOwnerBusinessAssistantThreadId(params.request.threadId)',
  'if (!threadId) return undefined;',
  'messages: nextMessages',
  'params.request.projectId || params.request.clientContext?.selectedProjectId',
  'isOwnerBusinessAssistantThreadOwnedByScope(existing, { tId, sId, userId: userId || \'\' })',
].forEach((token) => requireToken(threadStore, token, 'thread store'));

[
  'OwnerBusinessSignalAction = \'promote\' | \'fix\' | \'restock\' | \'update\'',
  'Update link',
  'Restock them or hide them',
].forEach((token) => requireToken(businessSignals, token, 'business signals'));

[
  'OwnerPublicTruthSetupJob',
  'OWNER_PUBLIC_TRUTH_MAX_SETUP_JOBS = 6',
  'buildOwnerPublicTruthSetupJobList',
  'setupJobList,',
  'fixHref: module.fixHref',
  'mobileFixTarget: module.mobileFixTarget',
].forEach((token) => requireToken(ownerPublicTruthReadiness, token, 'owner public truth readiness setup jobs'));

[
  [currentHook, 'readOwnerBusinessAssistantCurrentResponse', 'current hook'],
  [currentHook, 'OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY', 'current hook'],
  [analyticsHook, 'readOwnerBusinessAssistantAnalyticsResponse', 'analytics hook'],
  [answerHook, 'readJsonResponseWithLimit', 'answer hook'],
  [answerHook, 'OWNER_BUSINESS_ASSISTANT_ANSWER_RESPONSE_JSON_MAX_BYTES', 'answer hook'],
  [answerHook, 'readStoredThreadId', 'answer hook'],
  [answerHook, 'normalizeOwnerBusinessAssistantThreadId(answerData.threadId)', 'answer hook'],
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
  'public readiness fix list',
  'Browser read-model hooks parse current, analytics, locations, and thread responses through a shared 256KB bounded reader',
  'Thread IDs must match the browser-generated `oba_` runtime ID shape',
].forEach((token) => requireToken(readme, token, 'owner business README'));

[
  'src/lib/ownerBusinessAssistant/threadIdBoundary.ts',
  'answer requests, thread persistence, and thread-route reads accept only browser-generated `oba_` runtime thread IDs',
  'thread route params and answer request thread IDs use the shared `oba_` runtime ID boundary',
  'Business Health feedback answer ID boundary',
  'Business Health answer-event ID boundary',
].forEach((token) => requireToken(implDoc, token, 'implementation doc'));

[
  'Owner Business Health boundary source gate',
  '`npm run verify:owner-business-health-boundary`',
  'read-only AI diagnostic runtime',
  'Business Health must not',
  'update menu/store/outlet/staff/public truth',
  'Official customer source fix list',
  'treat official customer source fix-list rows as action drafts',
].forEach((token) => requireToken(businessHealthDoc, token, 'business health doc'));

[
  'Owner Business Health boundary source gate',
  '`npm run verify:owner-business-health-boundary`',
  'MobileShell read-only screen',
  'desktop route bypass through `window.location`',
  'Asking for a mutation does not mutate truth and does not open an action sheet',
  'Official customer source fix-list buttons route through',
].forEach((token) => requireToken(mobileSupportDoc, token, 'mobile support doc'));

[
  '`npm run verify:owner-business-health-boundary`',
  'read-only source gate',
  'No public truth writes',
  'Public Truth owner fix list is Firebase-cost neutral',
  'Server packet cache diagnostics are cost-neutral',
  'Thread ID admission is shape-bound',
  'Business Health feedback answer-ID admission is cost-neutral',
  'Business Health answer-event ID admission is cost-neutral',
  'fresh `oba_` ID before sending the answer request',
  'owner_business_assistant_packet_cache_read_failed',
  'owner_business_assistant_packet_cache_invalidate_failed',
].forEach((token) => requireToken(firebaseDoc, token, 'firebase doc'));

[
  '`npm run verify:owner-business-health-boundary`',
  'read-only boundary',
  'public readiness fix list',
  'browser-generated `oba_` runtime thread IDs',
  'discards malformed stored thread IDs',
].forEach((token) => requireToken(validationDoc, token, 'validation doc'));

[
  'Status:** Implemented owner-help source',
  'Business Health is read-only.',
  'It does not prepare a price, description, image, publish, store, outlet, staff, or public-information change.',
].forEach((token) => requireToken(helpDoc, token, 'owner help doc'));
forbidToken(helpDoc, 'Draft for post-enable owner help', 'owner help doc stale status');
forbidToken(helpDoc, 'Business Health may open the right screen or prepare a draft for you.', 'owner help doc stale action claim');

[
  ['inventory', inventory, 'owner_business_health'],
  ['inventory', inventory, 'owner-business-health and assistant gates passed'],
  ['report', report, '## Owner Business Health Boundary'],
  ['report', report, '`npm run verify:owner-business-health-boundary`'],
  ['audit', audit, 'Owner Business Health boundary checkpoint'],
  ['audit', audit, '`npm run verify:owner-business-health-boundary`'],
  ['audit', audit, 'Business Health packet-cache diagnostics checkpoint'],
  ['audit', audit, 'Owner Business Assistant thread ID boundary checkpoint'],
  ['audit', audit, 'Business Health feedback answer ID boundary checkpoint'],
  ['audit', audit, 'Business Health answer-event ID boundary checkpoint'],
  ['audit', audit, 'src/lib/ownerBusinessAssistant/threadIdBoundary.ts'],
  ['audit', audit, 'owner_business_assistant_packet_cache_read_failed'],
  ['changelog', changelog, 'Owner Business Health Boundary'],
  ['changelog', changelog, 'Owner Business Assistant Thread ID Boundary'],
  ['changelog', changelog, 'Business Health Feedback Answer ID Boundary'],
  ['changelog', changelog, 'Business Health Answer-Event ID Boundary'],
  ['changelog', changelog, 'Business Health thread IDs are shape-checked before reads/writes'],
  ['changelog', changelog, '`npm run verify:owner-business-health-boundary`'],
  ['changelog', changelog, 'Business Health Packet Cache Diagnostics'],
  ['changelog', changelog, 'owner_business_assistant_packet_cache_*_failed'],
].forEach(([label, source, token]) => requireToken(source, token, `owner business health ledger ${label}`));

requireOrder(
  answerRoute,
  [
    'applyOwnerBusinessAssistantRateLimit({',
    'await readBoundedJsonBody(',
    'OwnerBusinessAssistantAnswerRequestSchema.safeParse(bodyResult.data)',
    'resolveOwnerAssistantSelectedStoreScope(request, session, normalizedRequest.storeId)',
    'requireAnyStorePermissionForStore(',
    'const safeMode = await checkSafeMode();',
    'resolveOwnerBusinessAssistantAnswer({',
  ],
  'answer route cost and admission order',
);

requireToken(apiGuards, 'normalizeStoreSwitchStoreId', 'Business Health selected-store exact shared store ID normalization');
requireToken(apiGuards, 'if (hasRequestedStoreId && !selectedStoreId)', 'Business Health malformed supplied store ID rejection');
requireToken(schemas, 'normalizeStoreSwitchStoreId(value) !== null', 'Business Health exact canonical store schema');

if (failures.length > 0) {
  console.error('FAIL verify-owner-business-health-boundary');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('PASS verify-owner-business-health-boundary');
console.log('Validated read-only Business Health route/API/mobile/docs boundary, bounded responses, removed action surfaces, and ledger coverage.');
