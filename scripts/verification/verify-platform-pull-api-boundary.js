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

function requireOccurrenceAtLeast(source, token, count, label) {
  const actual = (source.match(new RegExp(escapeRegExp(token), 'g')) || []).length;
  if (actual < count) {
    failures.push(`${label} expected at least ${count} occurrences of ${token}, found ${actual}`);
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const packageJson = read('package.json');
const features = read('src/config/features.ts');
const publicApiAuth = read('src/lib/publicApi/auth.ts');
const businessRoute = read('src/app/api/public/v1/business/route.ts');
const menuRoute = read('src/app/api/public/v1/menu/route.ts');
const keyRoute = read('src/app/api/store/public-api-key/route.ts');
const integrationsTab = read('src/components/templates/main-app/businessSettings/tabs/IntegrationsTab.tsx');
const businessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
const storeType = read('src/types/platform/store.ts');
const readme = read('__docs__/platform-pull-api/README.md');
const spec = read('__docs__/platform-pull-api/platform-pull-api_spec.md');
const impl = read('__docs__/platform-pull-api/platform-pull-api_impl.md');
const firebaseDoc = read('__docs__/platform-pull-api/platform-pull-api_firebase.md');
const mobileDoc = read('__docs__/platform-pull-api/platform-pull-api_mobile-support.md');
const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/CHANGELOG.md');

requireToken(
  packageJson,
  '"verify:platform-pull-api-boundary": "node scripts/verification/verify-platform-pull-api-boundary.js"',
  'package scripts',
);
requireToken(features, 'ENABLE_PUBLIC_API: true', 'Platform Pull API feature flag');

[
  'export const PULL_API_SCHEMA_VERSION = "1.0";',
  'PULL_API_RESPONSE_CACHE_CONTROL = "private, max-age=60, stale-while-revalidate=300"',
  'PULL_API_RESPONSE_VARY = "X-API-Key"',
  "const PUBLIC_API_KEY_PATTERN = /^(ml|cn|al)_[A-Za-z0-9_-]{20,128}$/;",
  'function normalizePublicApiKey(apiKey: string | null): string | null',
  'export function hashApiKey(apiKey: string): string',
  'export function buildPullApiResponseHeaders(etag: string): Record<string, string>',
  "'Vary': PULL_API_RESPONSE_VARY",
  'export async function isMenuListPublicApiTargetAllowed(storeData: any): Promise<boolean>',
  'storeData.active === false || storeData.deleted === true || isPlatformEntityBlocked(storeData)',
  '.collection(DB_COLLECTIONS.TENANTS)',
  'return tenantSnap.exists && !isPlatformEntityBlocked(tenantSnap.data());',
  "secureLog('[Public API] Request'",
  'requestIpHash: hashPublicRateLimitValue(getClientIp(request))',
  "getBoundedSecurityStringContext('storeId', storeId)",
  "getBoundedSecurityStringContext('userAgent', userAgent)",
  'const MAX_VALIDATION_CACHE_TTL_MS = 30_000;',
  'export async function validatePublicApiKey(',
  ".where('publicApi.apiKeyHash', '==', keyHash)",
  ".where('publicApi.apiKey', '==', normalizedApiKey)",
  "secureLog('[Public API] Invalid API key attempt')",
].forEach((token) => requireToken(publicApiAuth, token, 'Public API auth helper'));
forbidToken(publicApiAuth, 'secureLog(`[Public API] ${endpoint}`', 'Public API auth helper raw dynamic log event');
forbidToken(publicApiAuth, 'userAgent: userAgent.slice', 'Public API auth helper raw user agent log');
forbidToken(publicApiAuth, '        storeId,\n        ip,', 'Public API auth helper raw store/IP log context');

[
  ['business', businessRoute, '/api/public/v1/business', 'public_api_business_route_failed'],
  ['menu', menuRoute, '/api/public/v1/menu', 'public_api_menu_route_failed'],
].forEach(([label, route, endpoint, failureCode]) => {
  [
    "export const dynamic = 'force-dynamic';",
    'if (!FEATURE_FLAGS.ENABLE_PUBLIC_API)',
    "request.headers.get('x-api-key')",
    "if (!apiKey.trim().startsWith('ml_'))",
    'const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);',
    `endpoint: '${endpoint}'`,
    'key: `public-api:${apiKeyRateLimitId}`',
    "apiError('RATE_LIMIT_EXCEEDED', 'Too many requests', 429",
    "'Retry-After': String(Math.max(retryAfter, 1))",
    'const result = await validatePublicApiKey(apiKey);',
    'if (!(await isMenuListPublicApiTargetAllowed(storeData)))',
    "apiError('INVALID_API_KEY', 'Invalid API key', 401)",
    'logApiRequest(request, storeId',
    'schemaVersion: PULL_API_SCHEMA_VERSION',
    'const etag = `"${generateETag(',
    'const responseHeaders = buildPullApiResponseHeaders(etag);',
    'if (ifNoneMatch === etag)',
    'headers: responseHeaders',
    `logSecurityFailure('${failureCode}'`,
    "apiError('INTERNAL_ERROR', 'Internal error', 500)",
  ].forEach((token) => requireToken(route, token, `Public ${label} pull route`));

  requireOrder(
    route,
    [
      "request.headers.get('x-api-key')",
      "if (!apiKey.trim().startsWith('ml_'))",
      'const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);',
      'const rlResult = await checkRateLimit',
      'const result = await validatePublicApiKey(apiKey);',
      'if (!(await isMenuListPublicApiTargetAllowed(storeData)))',
      'logApiRequest(request, storeId',
      'const etag = `"${generateETag(',
      'const responseHeaders = buildPullApiResponseHeaders(etag);',
    ],
    `Public ${label} pull route admission order`,
  );
  forbidToken(route, 'cacheTtlMs', `Public ${label} pull route validation cache`);
  forbidToken(route, 'key: `public-api:${apiKey}`', `Public ${label} pull route raw limiter key`);
  forbidToken(route, "'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'", `Public ${label} pull route shared cache`);
});

[
  'parseSummaryProjects(summarySnap.data())',
  'project.active !== false',
  'project.deleted !== true',
  'project.isSpecialMenu !== true',
  'projects.find((project) => project.isDefault === true) || projects[0]',
  '.collection(DB_COLLECTIONS.PROJECTS)',
  'if (projectData?.active === false || projectData?.deleted === true) return null;',
  "event: 'menu.pull' as const",
].forEach((token) => requireToken(menuRoute, token, 'Public menu pull route project selection'));

[
  'function getActiveTempStatus(tempStatus: any)',
  'const activeTempStatus = FEATURE_FLAGS.ENABLE_TEMP_STATUS',
  'tempStatus: activeTempStatus',
].forEach((token) => requireToken(businessRoute, token, 'Public business pull active status boundary'));

[
  "export const dynamic = 'force-dynamic';",
  'export const POST = withAuth(async (request: NextRequest, session) =>',
  'if (!FEATURE_FLAGS.ENABLE_PUBLIC_API)',
  'const { tId: tenantId, sId: storeId } = session',
  'requireAnyStorePermission(',
  '[PERMISSIONS.MANAGE_INTEGRATIONS]',
  'const storeRateLimitHash = hashPublicRateLimitValue(storeId);',
  'key: `api-key-mgmt:${storeRateLimitHash}`',
  'const PUBLIC_API_KEY_ACTION_MAX_BODY_BYTES = 1024;',
  'readBoundedJsonBody(request, PUBLIC_API_KEY_ACTION_MAX_BODY_BYTES',
  'RequestSchema.safeParse(body)',
  "const apiKey = `ml_${randomUUID().replace(/-/g, '')}`;",
  'const apiKeyHash = hashApiKey(apiKey);',
  'publicApi: {',
  'apiKeyHash,',
  'keyPrefix: apiKey.slice(0, 7)',
  'publicApi: admin.firestore.FieldValue.delete()',
  "logSecurityDiagnostic('public_api_key_generated'",
  "logSecurityDiagnostic('public_api_key_revoked'",
  "logSecurityFailure('public_api_key_management_failed'",
  '{ error: "Failed to manage API key" }',
].forEach((token) => requireToken(keyRoute, token, 'Public API key management route'));
requireOrder(
  keyRoute,
  [
    'if (!FEATURE_FLAGS.ENABLE_PUBLIC_API)',
    'requireAnyStorePermission(',
    'const storeRateLimitHash = hashPublicRateLimitValue(storeId);',
    'readBoundedJsonBody(request, PUBLIC_API_KEY_ACTION_MAX_BODY_BYTES',
    'RequestSchema.safeParse(body)',
    'await storeRef.update({',
  ],
  'Public API key management route admission order',
);
forbidToken(keyRoute, 'apiKey: apiKey', 'Public API key management route raw key storage');
forbidToken(keyRoute, 'key: `api-key-mgmt:${storeId}`', 'Public API key management route raw limiter key');
forbidToken(keyRoute, "secureLog('[Public API] Key generated'", 'Public API key management raw generated log');
forbidToken(keyRoute, "secureLog('[Public API] Key revoked'", 'Public API key management raw revoked log');

[
  'PUBLIC_API_KEY_RESPONSE_JSON_MAX_BYTES = 8 * 1024',
  'readJsonResponseWithLimit<unknown>',
  'business_settings_public_api_key_response_parse_failed',
  'business_settings_public_api_key_response_invalid',
  "new Error('Public API key request failed')",
  "payload.apiKey.startsWith('ml_')",
  "payload.success === true",
  'FEATURE_FLAGS.ENABLE_PUBLIC_API',
  "fetch('/api/store/public-api-key'",
  '...AUTH_BROWSER_REQUEST_POLICY',
  "body: JSON.stringify({ action })",
  'business_settings_public_api_key_generate_failed',
  'business_settings_public_api_key_revoke_failed',
  'business_settings_public_api_key_copy_failed',
  'setGeneratedApiKey(payload.apiKey)',
  'keyPrefix: payload.apiKey.slice(0, 7)',
  'const { publicApi, ...rest } = previous || {};',
  'navigator.clipboard.writeText(generatedApiKey)',
  'Platform Pull API',
  'Save this key now',
  'Generate key',
  'Regenerate key',
  'Revoke key',
].forEach((token) => requireToken(integrationsTab, token, 'Business Settings Platform Pull API key UI'));
requireOccurrenceAtLeast(integrationsTab, "fetch('/api/store/public-api-key'", 2, 'Business Settings Platform Pull API key UI route calls');
requireOccurrenceAtLeast(integrationsTab, '...AUTH_BROWSER_REQUEST_POLICY', 2, 'Business Settings Platform Pull API key UI request policy');
forbidToken(integrationsTab, 'response.json()', 'Business Settings Platform Pull API key UI direct response parsing');
forbidToken(integrationsTab, '.json().catch', 'Business Settings Platform Pull API key UI swallowed response parsing');
forbidToken(integrationsTab, 'data.error ||', 'Business Settings Platform Pull API key UI raw API error copy');
forbidToken(integrationsTab, 'console.error', 'Business Settings Platform Pull API key UI console diagnostics');
forbidToken(integrationsTab, 'console.warn', 'Business Settings Platform Pull API key UI console diagnostics');
requireToken(businessSettings, 'setStoreDetails={setStoreDetails}', 'Business Settings Platform Pull API key UI state wiring');

[
  'publicApi?: {',
  'apiKey?: string;        // Legacy raw key fallback only',
  'apiKeyHash?: string;    // SHA-256 hash used by current validation path',
  'keyPrefix?: string;',
].forEach((token) => requireToken(storeType, token, 'Store publicApi type'));

[
  '## Source Gate',
  '`npm run verify:platform-pull-api-boundary`',
  '`ENABLE_PUBLIC_API: true`',
  'Business Settings Integrations tab',
  'live key/target revalidation',
].forEach((token) => requireToken(readme, token, 'Platform Pull API README'));
forbidToken(readme, 'default OFF', 'Platform Pull API README stale flag default');

[
  '## Source Gate',
  '`npm run verify:platform-pull-api-boundary`',
  'Business Settings Integrations tab',
  'FR-17',
].forEach((token) => requireToken(spec, token, 'Platform Pull API spec'));

[
  '## Source Gate',
  '`npm run verify:platform-pull-api-boundary`',
  'Business Settings Integrations tab',
  'raw key is shown only once',
].forEach((token) => requireToken(impl, token, 'Platform Pull API implementation doc'));

[
  '## Source Gate',
  '`npm run verify:platform-pull-api-boundary`',
  'Feature flag is currently `ENABLE_PUBLIC_API: true`',
  'Business Settings Integrations tab',
].forEach((token) => requireToken(firebaseDoc, token, 'Platform Pull API Firebase doc'));
forbidToken(firebaseDoc, 'Feature flag OFF by default', 'Platform Pull API Firebase stale flag default');

[
  '## Source Gate',
  '`npm run verify:platform-pull-api-boundary`',
  'No dedicated mobile key-management UI is required',
].forEach((token) => requireToken(mobileDoc, token, 'Platform Pull API mobile doc'));

requireToken(inventory, 'platform-pull-api boundary source gate passed; live key fixture/manual still pending', 'feature sweep inventory');
[
  '## Platform Pull API Boundary',
  '`npm run verify:platform-pull-api-boundary`',
  'source/docs verification only',
].forEach((token) => requireToken(report, token, 'feature sweep report'));
[
  'Platform Pull API boundary checkpoint',
  '`npm run verify:platform-pull-api-boundary`',
  'Business Settings Integrations tab',
].forEach((token) => requireToken(audit, token, 'production readiness audit'));
[
  'July 2, 2026 - Platform Pull API Boundary',
  'verify:platform-pull-api-boundary',
  'Business Settings Integrations tab',
].forEach((token) => requireToken(changelog, token, 'changelog'));

if (failures.length > 0) {
  console.error('FAIL verify-platform-pull-api-boundary');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PASS verify-platform-pull-api-boundary');
console.log('Validated Platform Pull API key lifecycle, business/menu pull routes, private response headers, desktop key UI, and docs parity.');
