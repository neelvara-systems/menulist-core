const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
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

function assertOrder(source, tokens, label) {
  let lastIndex = -1;
  for (const token of tokens) {
    const index = source.indexOf(token);
    assert(index >= 0, `${label} must include ${token}`);
    assert(index > lastIndex, `${label} must keep ${token} after the previous checkpoint`);
    lastIndex = index;
  }
}

const FILES = [
  'src/app/api/public/contact/route.ts',
  'src/app/api/ops/report-leads/route.ts',
  'src/app/(main)/ops/report-leads/page.tsx',
  'src/components/templates/main-app/platform/reportLeadMonitor/index.tsx',
  'src/lib/ops/reportLeadTypes.ts',
  'src/lib/ops/reportLeadClientResponse.ts',
  'src/lib/auth/currentPlatformUser.ts',
  'scripts/verification/test-current-platform-user.ts',
  'scripts/verification/test-current-platform-user-emulator.ts',
  'scripts/verification/verify-report-leads-boundary.js',
  'firestore.indexes.json',
];

for (const file of FILES) {
  assert(exists(file), `Report Leads required file missing: ${file}`);
}

const contactRoute = read('src/app/api/public/contact/route.ts');
const route = read('src/app/api/ops/report-leads/route.ts');
const page = read('src/app/(main)/ops/report-leads/page.tsx');
const monitor = read('src/components/templates/main-app/platform/reportLeadMonitor/index.tsx');
const types = read('src/lib/ops/reportLeadTypes.ts');
const responseHelper = read('src/lib/ops/reportLeadClientResponse.ts');
const currentPlatformUser = read('src/lib/auth/currentPlatformUser.ts');
const features = read('src/config/features.ts');
const packageJson = read('package.json');
const aggregateVerifier = read('scripts/verification/verify-public-truth-tools.js');
const opsControlRoom = read('src/components/templates/main-app/platform/opsControlRoom/index.tsx');
const readmeDoc = read('__docs__/menulist-tools/shareable-tool-reports/README.md');
const implDoc = read('__docs__/menulist-tools/shareable-tool-reports/shareable-tool-reports_impl.md');
const firebaseDoc = read('__docs__/menulist-tools/shareable-tool-reports/shareable-tool-reports_firebase.md');
const playbookDoc = read('__docs__/menulist-tools/shareable-tool-reports/shareable-tool-reports_follow-up-playbook.md');
const mobileDoc = read('__docs__/menulist-tools/shareable-tool-reports/shareable-tool-reports_mobile-support.md');
const testCasesDoc = read('__docs__/menulist-tools/shareable-tool-reports/shareable-tool-reports_test-cases.md');
const validationDoc = read('__docs__/menulist-tools/shareable-tool-reports/shareable-tool-reports_validation.md');
const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');
const firestoreIndexes = JSON.parse(read('firestore.indexes.json'));

assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_REPORT_LEAD_OPS_DASHBOARD: true', 'Report Leads feature flag');
assertIncludes(packageJson, '"verify:report-leads-boundary": "node scripts/verification/verify-report-leads-boundary.js"', 'Report Leads package verifier');
assertIncludes(packageJson, '"test:current-platform-user"', 'Current platform-user regression registry');
assertIncludes(packageJson, '"test:current-platform-user:emulator"', 'Current platform-user emulator regression registry');
assertIncludes(aggregateVerifier, 'verify-report-leads-boundary.js', 'Report Leads aggregate verifier');

[
  'SHAREABLE_TOOL_REPORT_SOURCE_CONTEXT_ISO_TIMESTAMP_PATTERN',
  'cleanShareableToolReportTimestamp',
  'Date.parse(timestamp)',
  'new Date(timestampMs).toISOString()',
  'normalizedTimestamp === timestamp ? normalizedTimestamp : null',
  'reportGeneratedAt: cleanShareableToolReportTimestamp(sourceContext.reportGeneratedAt)',
].forEach((token) => assertIncludes(contactRoute, token, 'Report Leads public contact source timestamp boundary'));

assertNotIncludes(
  contactRoute,
  'reportGeneratedAt: clean(sourceContext.reportGeneratedAt, 80)',
  'Report Leads public contact source timestamp must not accept arbitrary strings',
);

[
  "withAuth(async (request, session) =>",
  "requiredPlatformRole: 'PLATFORM'",
  'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_REPORT_LEAD_OPS_DASHBOARD',
  'ReportLeadQuerySchema',
  "reportStatus: z.enum(REPORT_LEAD_STATUS_FILTERS).default('all')",
  "toolId: z.string().trim().max(80).optional().default('all')",
  'limit: z.coerce.number().int().min(5).max(60).default(30)',
  'validateAPIInput(ReportLeadQuerySchema',
  'getCurrentPlatformUser(session)',
  'resolveCurrentSessionUserDocumentId(session)',
  'Authorization Failed - Report Lead Current Platform Role',
  'hashPublicRateLimitValue(operatorId)',
  'REPORT_LEAD_OPS_RATE_LIMIT_KEY',
  "key: `${REPORT_LEAD_OPS_RATE_LIMIT_KEY}:${operatorRateLimitHash}`",
  "failClosedOnProviderError: process.env.NODE_ENV === 'production'",
  'collection(DB_COLLECTIONS.LANDING_PAGE_ENQUIRIES)',
  ".where('sourceKind', '==', 'shareable_tool_report')",
  ".orderBy('createdOn', 'desc')",
  '.limit(scanLimit)',
  "data.sourceKind === 'shareable_tool_report'",
  "sourceContext.sourceKind === 'shareable_tool_report'",
  'REPORT_LEAD_ISO_TIMESTAMP_PATTERN',
  'cleanReportLeadGeneratedAt',
  'Date.parse(timestamp)',
  'new Date(timestampMs).toISOString()',
  'normalizedTimestamp === timestamp ? normalizedTimestamp : null',
  'reportGeneratedAt: cleanReportLeadGeneratedAt(sourceContext.reportGeneratedAt)',
  'cleanSetupJobList(sourceContext.setupJobList)',
  'setupJobList,',
  'The report gaps become this setup job list:',
  "headers: { 'Cache-Control': 'no-store' }",
  "logOpsFailure('report_lead_ops_route_failed'",
  'Manual refresh only. No realtime listener.',
  'an indexed bounded query for shareable-tool-report enquiries only',
  'scanMayBeIncomplete: snapshot.size >= scanLimit',
].forEach((token) => assertIncludes(route, token, 'Report Leads ops API route'));

const reportLeadIndexes = firestoreIndexes.indexes.filter((index) => (
  index.collectionGroup === 'landingPageEnquiries'
  && index.queryScope === 'COLLECTION'
  && JSON.stringify(index.fields) === JSON.stringify([
    { fieldPath: 'sourceKind', order: 'ASCENDING' },
    { fieldPath: 'createdOn', order: 'DESCENDING' },
  ])
));
assert(reportLeadIndexes.length === 1, 'Report Leads must have one exact sourceKind + createdOn composite index');

assertNotIncludes(
  route,
  'reportGeneratedAt: cleanOpsText(sourceContext.reportGeneratedAt, 80) || null',
  'Report Leads ops API must not return arbitrary generatedAt strings',
);

assertOrder(route, [
  'validateAPIInput(ReportLeadQuerySchema',
  'const operatorId = resolveCurrentSessionUserDocumentId(session);',
  'const rateLimitResponse = await checkReportLeadOpsRateLimit(operatorId);',
  'const currentPlatformUser = await getCurrentPlatformUser(session);',
  "collection(DB_COLLECTIONS.LANDING_PAGE_ENQUIRIES)",
], 'Report Leads ops API admission order');

[
  'export function isCurrentPlatformUserRecordEligible',
  'export async function getCurrentPlatformUser',
  "userData.platformRole !== ECOMSAI_PLATFORM_USER_ROLE",
  'userData.active !== true',
  'userData.isVerified !== true',
  'userData.authDisabled === true',
  'isPlatformEntityBlocked(userData)',
  'currentPlatformTimestampMillis(userData.sessionRevokedAt)',
  'revocationTimestamps.some((timestamp) => timestamp === null)',
  'issuedAt === null || issuedAt <= 0',
  'revokedAt === 0 || revokedAt < issuedAt',
  'if (!directSnapshot.exists) return null',
].forEach((token) => assertIncludes(currentPlatformUser, token, 'Report Leads current platform-user guard'));

[
  ".where('email', '==', email)",
  'emailSnapshot',
].forEach((token) => assertNotIncludes(currentPlatformUser, token, 'Report Leads current platform-user guard direct identity boundary'));

assertIncludes(route, 'sourcePath: normalizePublicContactSourcePath(data.sourcePath)', 'Report Leads legacy source-path minimization');

[
  'export const POST',
  'readBoundedJsonBody',
  'request.json()',
  'add(',
  'set(',
  'update(',
  'delete(',
  'onSnapshot',
  'DB_COLLECTIONS.SHAREABLE_TOOL_REPORTS',
  'toolReports',
  '@google/genai',
  'openai',
].forEach((token) => assertNotIncludes(route, token, 'Report Leads ops API boundary'));

assertIncludes(page, 'ReportLeadMonitor', 'Report Leads ops page');
assertIncludes(opsControlRoom, 'href="/ops/report-leads"', 'Ops Control Room Report Leads link');

[
  "resolveExactSessionPlatformRole(session) === 'PLATFORM'",
  "redirect('/dashboard')",
  "fetch(`/api/ops/report-leads?",
  "cache: 'no-store'",
  "credentials: 'same-origin'",
  "redirect: 'manual'",
  'readReportLeadOpsSnapshotResponse(response',
  'requestIdRef.current + 1',
  'requestId !== requestIdRef.current',
  'setSnapshot(null)',
  "message.error('Failed to load report leads')",
  'copyRuntimeTextToClipboard(record.suggestedReply)',
  'hasRuntimeClipboardWrite()',
  'hasRuntimeCopyFallback()',
  'Lead triage only',
  'It does not store reports, inspect external platforms, or mutate owner business truth.',
  'renderSetupJobTags(record)',
  'Setup job list',
  'No setup jobs were submitted with this report.',
  'Recent report-lead limit reached',
  'Older matching report leads may exist.',
  'report-lead enquiry reads.',
].forEach((token) => assertIncludes(monitor, token, 'Report Leads ops monitor'));

[
  'response.json()',
  '.json().catch',
  'error.message',
  'await navigator.clipboard.writeText',
].forEach((token) => assertNotIncludes(monitor, token, 'Report Leads ops monitor boundary'));

[
  'ReportLeadOpsSnapshot',
  'ReportLeadRow',
  'ReportLeadSetupJob',
  'setupJobList: ReportLeadSetupJob[]',
  "accessModel: 'platform_role'",
  'realtimeListeners: false',
  'scanMayBeIncomplete: boolean',
  'writes: 0',
  'authReads: 1',
].forEach((token) => assertIncludes(types, token, 'Report Leads ops types'));

[
  'REPORT_LEAD_OPS_RESPONSE_JSON_MAX_BYTES = 192 * 1024',
  'readJsonResponseWithLimit<unknown>',
  "value.feature.accessModel === 'platform_role'",
  'value.feature.realtimeListeners === false',
  "typeof value.feature.scanMayBeIncomplete === 'boolean'",
  'isReportLeadRow',
  'isReportLeadSetupJob',
  'value.setupJobList.every(isReportLeadSetupJob)',
  'isReportLeadOpsCost',
  'value.authReads === 1',
  'REPORT_LEAD_OPS_RESPONSE_PARSE_FAILED',
  'REPORT_LEAD_OPS_RESPONSE_REJECTED',
  'REPORT_LEAD_OPS_RESPONSE_INVALID',
].forEach((token) => assertIncludes(responseHelper, token, 'Report Leads response helper'));

assertIncludes(
  monitor,
  'current-user authorization read plus',
  'Report Leads current authorization read cost disclosure',
);

[
  'response.json()',
  '.json().catch',
  'await navigator.clipboard.writeText',
].forEach((token) => assertNotIncludes(responseHelper, token, 'Report Leads response helper boundary'));

[
  '/ops/report-leads',
  'Report Leads',
  'canonical ISO `reportGeneratedAt`',
].forEach((token) => assertIncludes(readmeDoc, token, 'Shareable Tool Reports README Report Leads coverage'));

[
  'Internal Report Lead Ops',
  '/api/ops/report-leads',
  'no lead mutation',
  'no report storage',
  'canonical ISO generated timestamp or `null`',
  'where report gaps become the job list',
  're-reads the exact current `users/{userId}` document',
].forEach((token) => assertIncludes(implDoc, token, 'Shareable Tool Reports implementation Report Leads coverage'));

[
  'Report Lead Ops',
  'bounded recent `landingPageEnquiries` query',
  '`scanMayBeIncomplete`',
  '0 writes',
  'canonical ISO `reportGeneratedAt` or `null`',
  'bounded `setupJobList`',
  '1 exact `users/{userId}` read',
].forEach((token) => assertIncludes(firebaseDoc, token, 'Shareable Tool Reports Firebase Report Leads coverage'));

[
  '`/ops/report-leads`',
  'manual-refresh',
  'Canonical ISO source-tool timestamp',
  'report gaps become the setup job list',
].forEach((token) => assertIncludes(playbookDoc, token, 'Shareable Tool Reports playbook Report Leads coverage'));

[
  'Report Lead Ops is an internal platform-admin desktop monitor',
  'no owner-mobile action',
  'current persisted platform authorization',
].forEach((token) => assertIncludes(mobileDoc, token, 'Shareable Tool Reports mobile Report Leads boundary'));

assertIncludes(testCasesDoc, 'STR-015', 'Shareable Tool Reports Report Leads test coverage');
assertIncludes(testCasesDoc, 'canonical ISO `reportGeneratedAt` or `null`', 'Shareable Tool Reports Report Leads timestamp test coverage');
assertIncludes(testCasesDoc, 'shows setup job lists', 'Shareable Tool Reports Report Leads setup job test coverage');
assertIncludes(testCasesDoc, 'STR-018', 'Shareable Tool Reports current platform-user authorization test coverage');
assertIncludes(testCasesDoc, 'STR-023', 'Shareable Tool Reports bounded scan disclosure test coverage');
assertIncludes(testCasesDoc, 'STR-024', 'Shareable Tool Reports production limiter failure test coverage');
assertIncludes(validationDoc, 'npm run verify:report-leads-boundary', 'Shareable Tool Reports Report Leads validation gate');
assertIncludes(validationDoc, 'follow-up source metadata stores canonical ISO `reportGeneratedAt` or `null`', 'Shareable Tool Reports Report Leads timestamp validation gate');
assertIncludes(validationDoc, 'setup job list is derived from visible report gaps', 'Shareable Tool Reports Report Leads setup job validation gate');
assertIncludes(validationDoc, 'current persisted platform role, lifecycle, identity, and revocation state', 'Shareable Tool Reports current platform-user validation gate');

[
  'Report Leads source timestamp metadata boundary checkpoint: fixed in source.',
  'direct report follow-up submissions can no longer persist arbitrary `sourceContext.reportGeneratedAt`',
  '`npm run verify:report-leads-boundary` source-gates',
].forEach((token) => assertIncludes(productionAudit, token, 'Report Leads production audit source timestamp checkpoint'));

[
  'Report Leads current platform authorization checkpoint: fixed in source.',
  'a stale signed session cannot read current lead PII',
  'Legacy source paths are projected as pathnames only',
].forEach((token) => assertIncludes(productionAudit, token, 'Report Leads production audit current authorization checkpoint'));

[
  'Report Leads Source Timestamp Metadata Boundary',
  'Report lead `reportGeneratedAt` is ISO-only or null',
  'canonical ISO timestamp normalization',
].forEach((token) => assertIncludes(changelog, token, 'Report Leads changelog source timestamp checkpoint'));

[
  'Report Leads Current Authorization Boundary',
  'current persisted platform authorization',
  'exact current `users/{userId}` read',
].forEach((token) => assertIncludes(changelog, token, 'Report Leads changelog current authorization checkpoint'));

console.log('Report Leads boundary verification passed');
