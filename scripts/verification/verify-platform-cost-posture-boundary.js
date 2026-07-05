const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(source, token, label) {
  assert(source.includes(token), `${label} must include ${token}`);
}

function assertNotIncludes(source, token, label) {
  assert(!source.includes(token), `${label} must not include ${token}`);
}

function assertNotMatches(source, pattern, label) {
  assert(!pattern.test(source), `${label} must not match ${pattern}`);
}

function assertOrder(source, tokens, label) {
  let lastIndex = -1;
  for (const token of tokens) {
    const index = source.indexOf(token, lastIndex + 1);
    assert(index >= 0, `${label} must include ${token}`);
    assert(index > lastIndex, `${label} must keep ${token} after the previous checkpoint`);
    lastIndex = index;
  }
}

function verifyRoute(route) {
  [
    "export const dynamic = 'force-dynamic';",
    'withPlatformAuth(async (request: NextRequest, session: any) =>',
    'const EXTRACTION_OPERATION_LIMIT = 300;',
    'const BUSINESS_HEALTH_EVENT_LIMIT = 200;',
    'const ALERT_LIMIT = 30;',
    'const MAX_TIMESTAMP_PARSE_DIAGNOSTIC_SHAPES = 25;',
    'const reportedTimestampParseShapes = new Set<string>();',
    'days: z.coerce.number().int().min(1).max(90).optional().default(30)',
    'function cleanText(value: unknown, max = 260): string',
    "replace(/[\\u0000-\\u001f\\u007f]/g, ' ')",
    'function getCostAlertStringContext',
    'function buildCostAlertTitle',
    'function buildCostAlertMessage',
    'function buildSafeModeReasonSummary',
    'function buildCostAlertResponseId',
    "createHash('sha256').update(docId).digest('hex').slice(0, 12)",
    'function getTimestampParseContext',
    "logRuntimeFailure('platform_cost_posture_timestamp_parse_failed'",
    "fallbackPolicy: 'omit_timestamp'",
    'reportedTimestampParseShapes.add(shapeKey)',
    'return date instanceof Date && Number.isFinite(date.getTime()) ? date : null',
    'if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;',
    'async function readDocuments(',
    ".orderBy(orderField, 'desc')",
    '.limit(readLimit)',
    "logRuntimeFailure('platform_cost_posture_source_read_failed'",
    "getBoundedRuntimeStringContext('collectionName', collectionName)",
    "getBoundedRuntimeStringContext('orderField', orderField)",
    "firestoreAdmin.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system').get()",
    'reason: buildSafeModeReasonSummary(data.reason)',
    "logRuntimeFailure('platform_cost_posture_system_config_read_failed'",
    '!FEATURE_FLAGS.ENABLE_PLATFORM_COST_POSTURE',
    'QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))',
    'getSafeZodValidationDetails(parsed.error)',
    "getRateLimitForFeature('DATA_READ')",
    'const userRateLimitHash = hashPublicRateLimitValue(userId);',
    'key: `platform-cost-posture:${userRateLimitHash}`',
    "logger.security('Rate Limit Exceeded - Platform Cost Posture'",
    "getBoundedRuntimeStringContext('userId', userId)",
    "'Retry-After': String(waitSeconds)",
    'readDocuments(',
    "DB_COLLECTIONS.MENULIST_AI_EXTRACTION_OPERATIONS",
    "DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_ANSWER_EVENTS",
    'id: buildCostAlertResponseId(doc.id)',
    'title: buildCostAlertTitle(data)',
    'message: buildCostAlertMessage(data)',
    "status: 'pending' as const",
    'blocksBillForecast: true',
    'buildGuardrails(systemConfig.safeMode, billingExport.blocksBillForecast, sourceCoverage)',
    'return NextResponse.json({ data });',
    "logRuntimeFailure('platform_cost_posture_route_failed'",
    "return NextResponse.json({ error: 'Failed to load platform cost posture' }, { status: 500 });",
  ].forEach((token) => assertIncludes(route, token, 'Platform Cost Posture API route'));

  assertOrder(route, [
    '!FEATURE_FLAGS.ENABLE_PLATFORM_COST_POSTURE',
    'QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))',
    "getRateLimitForFeature('DATA_READ')",
    'const rateLimit = await checkRateLimit({',
    'const [systemConfig, alertRead, extractionRead, businessHealthRead] = await Promise.all([',
    'return NextResponse.json({ data });',
  ], 'Platform Cost Posture API admission/read order');

  [
    'request.json()',
    'secureError(',
    'id: doc.id,',
    "title: cleanText(data.title || data.type || 'Cost signal', 140)",
    "message: cleanText(data.message || data.reason || '', 260)",
    'reason: data.reason ? cleanText(data.reason, 240) : null',
    'safeMode.reason ? `: ${safeMode.reason}`',
    'key: `platform-cost-posture:${userId}`',
    '.set(',
    '.delete(',
    'writeBatch',
    'runTransaction',
  ].forEach((token) => assertNotIncludes(route, token, 'Platform Cost Posture API boundary'));

  assertNotMatches(route, /\.collection\([^)]*\)\s*\.add\s*\(/, 'Platform Cost Posture API Firestore write boundary');
}

function verifyDal(dal) {
  [
    "const PLATFORM_COST_POSTURE_LOAD_FAILED = 'Failed to load platform cost posture';",
    "PLATFORM_COST_POSTURE_RESPONSE_PARSE_FAILED = 'platform_cost_posture_response_parse_failed'",
    "PLATFORM_COST_POSTURE_RESPONSE_INVALID = 'platform_cost_posture_response_invalid'",
    "PLATFORM_COST_POSTURE_RESPONSE_REJECTED = 'platform_cost_posture_response_rejected'",
    'PLATFORM_COST_POSTURE_RESPONSE_JSON_MAX_BYTES = 256 * 1024',
    'function createPlatformCostPostureLoadError(status?: number): Error',
    'function isPlatformCostPostureData(value: unknown): value is PlatformCostPostureData',
    'isBillingExportStatus(value.billingExport)',
    'isSafeModeStatus(value.safeMode)',
    'isCostTotals(value.totals)',
    'value.signals.every(isCostSignal)',
    'value.alerts.every(isCostAlert)',
    'value.guardrails.every(isCostGuardrail)',
    'value.sourceCoverage.every(isSourceCoverage)',
    'readJsonResponseWithLimit<unknown>',
    'PLATFORM_COST_POSTURE_RESPONSE_JSON_MAX_BYTES',
    'getPlatformCostPostureResponseContext(response, days)',
    "fetch(`/api/platform/cost-posture?${params.toString()}`, {",
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    'logRuntimeFailure(\n      PLATFORM_COST_POSTURE_RESPONSE_PARSE_FAILED',
    'logRuntimeFailure(\n      PLATFORM_COST_POSTURE_RESPONSE_REJECTED',
    'logRuntimeFailure(\n      PLATFORM_COST_POSTURE_RESPONSE_INVALID',
    'const error = createPlatformCostPostureLoadError(response.status);',
    'throw error;',
    'return payload.data;',
  ].forEach((token) => assertIncludes(dal, token, 'Platform Cost Posture browser DAL'));

  [
    'response.json()',
    '.json().catch',
    'throw new Error((payload',
    'payload.error) ||',
    'console.error',
    'error.message',
  ].forEach((token) => assertNotIncludes(dal, token, 'Platform Cost Posture browser DAL boundary'));
}

function verifyDesktop(component) {
  [
    "platformRole === 'PLATFORM'",
    "redirect('/dashboard')",
    'getPlatformCostPosture(days)',
    "logRuntimeFailure('platform_cost_posture_load_failed'",
    "message.error('Failed to load platform cost posture')",
    'Known internal cost signals for {data.periodDays} days. Whole-bill forecasting waits for Cloud Billing export.',
    'Cloud Billing export: ${statusLabel(data.billingExport.status)}',
    '<Statistic title="Known Internal Cost"',
    '<Statistic title="Known Owner Charge"',
    '<Statistic title="Provider Calls"',
    '<Statistic title="Reads Observed"',
    '<Statistic\n              title="SAFE_MODE"',
    'rowKey="id"',
    '<Button href="/ops">Ops</Button>',
    '<Button href="/ops/extraction">Extraction</Button>',
    '<Button href="/platform/owner-business-assistant">Business Health</Button>',
    '<Button href="/transactions">AI Transactions</Button>',
    '<Button onClick={() => void loadData()}>Refresh</Button>',
    'Generated {formatTimestamp(data.generatedAt)}',
  ].forEach((token) => assertIncludes(component, token, 'Platform Cost Posture desktop surface'));

  [
    'response.json()',
    '.json().catch',
    'console.error',
    'error.message',
    'fetch(',
  ].forEach((token) => assertNotIncludes(component, token, 'Platform Cost Posture desktop boundary'));
}

function verifyMobileAndNavigation(mobileShell, mobileMore, mobileInternal, navConstants, sidebar, horizontalSidebar) {
  assertIncludes(mobileShell, "'/platform/cost-posture': 'costPosture'", 'Mobile shell Cost Posture route map');
  assertIncludes(mobileShell, "'costPosture'", 'Mobile shell Cost Posture screen list');

  [
    "FEATURE_FLAGS.ENABLE_PLATFORM_COST_POSTURE ? [{ key: 'costPosture'",
    "label: 'Cost Posture'",
    "description: 'Cost guardrails, expensive-operation signals, and platform cost posture.'",
    "onClick: () => openSubScreen('costPosture')",
    "if (screen === 'costPosture') return isPlatformAdmin && FEATURE_FLAGS.ENABLE_PLATFORM_COST_POSTURE;",
  ].forEach((token) => assertIncludes(mobileMore, token, 'Mobile More Cost Posture gate'));

  [
    "const PlatformCostPosture = dynamic(() => import('@template/main-app/platform/costPosture')",
    "costPosture: {",
    'Component: PlatformCostPosture',
    "desktopPath: '/platform/cost-posture'",
    "description: 'Review platform cost posture, guardrails, and expensive-operation signals.'",
    'minWidth: 720',
    "surface: 'Cost Posture'",
    "title: 'Cost Posture'",
    'setForceDesktopRoute(config.desktopPath)',
    'data-mobile-platform-screen={screen}',
  ].forEach((token) => assertIncludes(mobileInternal, token, 'Mobile platform internal Cost Posture wrapper'));

  [
    'PLATFORM_COST_POSTURE: `/platform/cost-posture`',
    "{ label: 'Cost Posture', route: NAVIGARIONS_ROUTINGS.PLATFORM_COST_POSTURE, icon: LuDollarSign, allowedPlatformRoles: [ECOMSAI_PLATFORM_USER_ROLE] }",
  ].forEach((token) => assertIncludes(navConstants, token, 'Platform Cost Posture navigation constants'));

  [
    'if (nav.route === NAVIGARIONS_ROUTINGS.PLATFORM_COST_POSTURE) {',
    'return FEATURE_FLAGS.ENABLE_PLATFORM_COST_POSTURE;',
  ].forEach((token) => {
    assertIncludes(sidebar, token, 'Sidebar Cost Posture feature gate');
    assertIncludes(horizontalSidebar, token, 'Horizontal sidebar Cost Posture feature gate');
  });
}

function verifyTypes(types) {
  [
    "export type PlatformCostPostureStatus = 'healthy' | 'watch' | 'action_required' | 'setup_required';",
    "export type PlatformCostSourceStatus = 'available' | 'empty' | 'error' | 'setup_required';",
    'export interface PlatformBillingExportStatus',
    'blocksBillForecast: boolean;',
    'export interface PlatformSafeModeStatus',
    'reason: string | null;',
    'export interface PlatformCostTotals',
    'knownInternalCostPaise: number;',
    'firestoreReadsObserved: number;',
    'export interface PlatformCostSignal',
    'export interface PlatformCostAlert',
    'export interface PlatformCostGuardrail',
    'export interface PlatformCostSourceCoverage',
    'export interface PlatformCostPostureData',
    'export interface PlatformCostPostureApiResponse',
  ].forEach((token) => assertIncludes(types, token, 'Platform Cost Posture types'));
}

function verifyDocsAndPackage(packageJson, readme, implDoc, firebaseDoc, mobileDoc, auditDoc, changelog) {
  assertIncludes(
    packageJson,
    '"verify:platform-cost-posture-boundary": "node scripts/verification/verify-platform-cost-posture-boundary.js"',
    'package.json platform cost posture verifier',
  );

  [
    'Source gate: `npm run verify:platform-cost-posture-boundary`',
    'platform-only API admission',
    'bounded Admin SDK source reads',
    '256KB browser response guard',
    'platform-only mobile wrapper',
    'timestamp parser diagnostics',
  ].forEach((token) => assertIncludes(readme, token, 'Platform Cost Posture README source gate'));

  [
    'Source gate: `npm run verify:platform-cost-posture-boundary`',
    'feature flag, platform auth, query validation, DATA_READ rate limit',
    'fixed read limits',
    'hashed alert row IDs',
    'SAFE_MODE reason summary',
    'timestamp parser diagnostics',
    'platform_cost_posture_timestamp_parse_failed',
    'same-origin manual-redirect browser fetch policy',
  ].forEach((token) => assertIncludes(implDoc, token, 'Platform Cost Posture implementation source gate'));

  [
    'Source gate: `npm run verify:platform-cost-posture-boundary`',
    'no Firestore writes',
    'timestamp parser diagnostics',
    'platform_cost_posture_timestamp_parse_failed',
    'no Storage operations, provider calls, Cloud Functions, cache tags, rules, indexes, or deploy requirement',
  ].forEach((token) => assertIncludes(firebaseDoc, token, 'Platform Cost Posture Firebase source gate'));

  [
    'No owner mobile PWA screen is added.',
    'platform-only mobile internal wrapper',
    'Source gate: `npm run verify:platform-cost-posture-boundary`',
    'MobileShell route mapping',
  ].forEach((token) => assertIncludes(mobileDoc, token, 'Platform Cost Posture mobile source gate'));

  [
    'Platform cost posture boundary source gate: `npm run verify:platform-cost-posture-boundary`',
    'source-only platform API admission, bounded Admin SDK reads, browser response guard, desktop/mobile navigation, and docs gate',
    'Platform Cost Posture timestamp diagnostics checkpoint',
    'platform_cost_posture_timestamp_parse_failed',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit platform cost posture checkpoint'));

  [
    'Platform Cost Posture Timestamp Diagnostics',
    'platform_cost_posture_timestamp_parse_failed',
    'timestamp parser diagnostics',
  ].forEach((token) => assertIncludes(changelog, token, 'Changelog platform cost posture timestamp diagnostics'));
}

function verifyPlatformCostPostureBoundary() {
  const files = {
    packageJson: read('package.json'),
    route: read('src/app/api/platform/cost-posture/route.ts'),
    dal: read('src/database/ops/costPosture.ts'),
    desktop: read('src/components/templates/main-app/platform/costPosture/index.tsx'),
    mobileShell: read('src/components/mobile/MobileShell.tsx'),
    mobileMore: read('src/components/mobile/screens/MobileMoreScreen.tsx'),
    mobileInternal: read('src/components/mobile/screens/MobilePlatformInternalScreen.tsx'),
    navConstants: read('src/constants/navigations.ts'),
    sidebar: read('src/components/organisms/sidebar/index.tsx'),
    horizontalSidebar: read('src/components/organisms/sidebar/horizontalSidebar.tsx'),
    types: read('src/lib/ops/costPostureTypes.ts'),
    readme: read('__docs__/platform-cost-posture/README.md'),
    implDoc: read('__docs__/platform-cost-posture/platform-cost-posture_impl.md'),
    firebaseDoc: read('__docs__/platform-cost-posture/platform-cost-posture_firebase.md'),
    mobileDoc: read('__docs__/platform-cost-posture/platform-cost-posture_mobile-support.md'),
    auditDoc: read('__docs__/audits/menulist-production-readiness-audit.md'),
    changelog: read('__docs__/CHANGELOG.md'),
  };

  verifyRoute(files.route);
  verifyDal(files.dal);
  verifyDesktop(files.desktop);
  verifyMobileAndNavigation(
    files.mobileShell,
    files.mobileMore,
    files.mobileInternal,
    files.navConstants,
    files.sidebar,
    files.horizontalSidebar,
  );
  verifyTypes(files.types);
  verifyDocsAndPackage(
    files.packageJson,
    files.readme,
    files.implDoc,
    files.firebaseDoc,
    files.mobileDoc,
    files.auditDoc,
    files.changelog,
  );

  console.log('Platform Cost Posture boundary verifier passed');
}

verifyPlatformCostPostureBoundary();
