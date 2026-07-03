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
  'src/app/api/ops/report-leads/route.ts',
  'src/app/(main)/ops/report-leads/page.tsx',
  'src/components/templates/main-app/platform/reportLeadMonitor/index.tsx',
  'src/lib/ops/reportLeadTypes.ts',
  'src/lib/ops/reportLeadClientResponse.ts',
  'scripts/verification/verify-report-leads-boundary.js',
];

for (const file of FILES) {
  assert(exists(file), `Report Leads required file missing: ${file}`);
}

const route = read('src/app/api/ops/report-leads/route.ts');
const page = read('src/app/(main)/ops/report-leads/page.tsx');
const monitor = read('src/components/templates/main-app/platform/reportLeadMonitor/index.tsx');
const types = read('src/lib/ops/reportLeadTypes.ts');
const responseHelper = read('src/lib/ops/reportLeadClientResponse.ts');
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

assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_REPORT_LEAD_OPS_DASHBOARD: true', 'Report Leads feature flag');
assertIncludes(packageJson, '"verify:report-leads-boundary": "node scripts/verification/verify-report-leads-boundary.js"', 'Report Leads package verifier');
assertIncludes(aggregateVerifier, 'verify-report-leads-boundary.js', 'Report Leads aggregate verifier');

[
  "withAuth(async (request, session) =>",
  "requiredPlatformRole: 'PLATFORM'",
  'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_REPORT_LEAD_OPS_DASHBOARD',
  'ReportLeadQuerySchema',
  "reportStatus: z.enum(REPORT_LEAD_STATUS_FILTERS).default('all')",
  "toolId: z.string().trim().max(80).optional().default('all')",
  'limit: z.coerce.number().int().min(5).max(60).default(30)',
  'validateAPIInput(ReportLeadQuerySchema',
  'hashPublicRateLimitValue(operatorId)',
  'REPORT_LEAD_OPS_RATE_LIMIT_KEY',
  "key: `${REPORT_LEAD_OPS_RATE_LIMIT_KEY}:${operatorRateLimitHash}`",
  'collection(DB_COLLECTIONS.LANDING_PAGE_ENQUIRIES)',
  ".orderBy('createdOn', 'desc')",
  '.limit(scanLimit)',
  "data.sourceKind === 'shareable_tool_report'",
  "sourceContext.sourceKind === 'shareable_tool_report'",
  "headers: { 'Cache-Control': 'no-store' }",
  "logOpsFailure('report_lead_ops_route_failed'",
  'Manual refresh only. No realtime listener.',
  'filters report leads in memory to avoid new indexes',
].forEach((token) => assertIncludes(route, token, 'Report Leads ops API route'));

assertOrder(route, [
  'validateAPIInput(ReportLeadQuerySchema',
  'const rateLimitResponse = await checkReportLeadOpsRateLimit(session);',
  "collection(DB_COLLECTIONS.LANDING_PAGE_ENQUIRIES)",
], 'Report Leads ops API admission order');

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
  "platformRole === 'PLATFORM'",
  "redirect('/dashboard')",
  "fetch(`/api/ops/report-leads?",
  "cache: 'no-store'",
  "credentials: 'same-origin'",
  "redirect: 'manual'",
  'readReportLeadOpsSnapshotResponse(response',
  "message.error('Failed to load report leads')",
  'copyRuntimeTextToClipboard(record.suggestedReply)',
  'hasRuntimeClipboardWrite()',
  'hasRuntimeCopyFallback()',
  'Lead triage only',
  'It does not store reports, inspect external platforms, or mutate owner business truth.',
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
  "accessModel: 'platform_role'",
  'realtimeListeners: false',
  'writes: 0',
].forEach((token) => assertIncludes(types, token, 'Report Leads ops types'));

[
  'REPORT_LEAD_OPS_RESPONSE_JSON_MAX_BYTES = 192 * 1024',
  'readJsonResponseWithLimit<unknown>',
  "value.feature.accessModel === 'platform_role'",
  'value.feature.realtimeListeners === false',
  'isReportLeadRow',
  'isReportLeadOpsCost',
  'REPORT_LEAD_OPS_RESPONSE_PARSE_FAILED',
  'REPORT_LEAD_OPS_RESPONSE_REJECTED',
  'REPORT_LEAD_OPS_RESPONSE_INVALID',
].forEach((token) => assertIncludes(responseHelper, token, 'Report Leads response helper'));

[
  'response.json()',
  '.json().catch',
  'await navigator.clipboard.writeText',
].forEach((token) => assertNotIncludes(responseHelper, token, 'Report Leads response helper boundary'));

[
  '/ops/report-leads',
  'Report Leads',
].forEach((token) => assertIncludes(readmeDoc, token, 'Shareable Tool Reports README Report Leads coverage'));

[
  'Internal Report Lead Ops',
  '/api/ops/report-leads',
  'no lead mutation',
  'no report storage',
].forEach((token) => assertIncludes(implDoc, token, 'Shareable Tool Reports implementation Report Leads coverage'));

[
  'Report Lead Ops',
  'Reads recent `landingPageEnquiries`',
  '0 writes',
].forEach((token) => assertIncludes(firebaseDoc, token, 'Shareable Tool Reports Firebase Report Leads coverage'));

[
  '`/ops/report-leads`',
  'manual-refresh',
].forEach((token) => assertIncludes(playbookDoc, token, 'Shareable Tool Reports playbook Report Leads coverage'));

[
  'Report Lead Ops is an internal platform-admin desktop monitor',
  'no owner-mobile action',
].forEach((token) => assertIncludes(mobileDoc, token, 'Shareable Tool Reports mobile Report Leads boundary'));

assertIncludes(testCasesDoc, 'STR-015', 'Shareable Tool Reports Report Leads test coverage');
assertIncludes(validationDoc, 'npm run verify:report-leads-boundary', 'Shareable Tool Reports Report Leads validation gate');

console.log('Report Leads boundary verification passed');
