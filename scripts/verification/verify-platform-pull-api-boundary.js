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
const targetEligibility = read('src/lib/publicApi/targetEligibility.ts');
const publicTruthEligibility = read('src/lib/publicTruth/entityEligibility.ts');
const responseIdentity = read('src/lib/publicApi/responseIdentity.ts');
const menuListScope = read('src/lib/publicApi/menuListScope.ts');
const businessProjection = read('src/lib/publicApi/businessProjection.ts');
const tempStatusBoundary = read('src/lib/tempStatus/statusBoundary.ts');
const businessAttributes = read('src/lib/obp/businessAttributes.ts');
const menuProjection = read('src/lib/publicApi/menuProjection.ts');
const summaryProjectParser = read('src/lib/firestore/parseSummaryProjects.ts');
const summaryMapParser = read('src/lib/firestore/summaryMapParser.ts');
const summaryStoreParser = read('src/lib/firestore/parseSummaryStores.ts');
const summaryProjectWriter = read('src/lib/firestore/summaryProjectsWriter.ts');
const decisionBlocksScoring = read('functions/src/decisionBlocksScoring.ts');
const obpContent = read('src/app/client/obp/OBPContent.tsx');
const campaignServerScreen = read('src/database/campaigns/serverScreen.ts');
const screenInvalidation = read('src/lib/screen/screenInvalidation.ts');
const businessRoute = read('src/app/api/public/v1/business/route.ts');
const menuRoute = read('src/app/api/public/v1/menu/route.ts');
const keyRoute = read('src/app/api/store/public-api-key/route.ts');
const integrationsTab = read('src/components/templates/main-app/businessSettings/tabs/IntegrationsTab.tsx');
const businessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
const storeType = read('src/types/platform/store.ts');
const storePublicApiType = storeType.slice(
  storeType.indexOf('    publicApi?: {'),
  storeType.indexOf('    answerlatticeWidgetApi?: {'),
);
const readme = read('__docs__/platform-pull-api/README.md');
const spec = read('__docs__/platform-pull-api/platform-pull-api_spec.md');
const impl = read('__docs__/platform-pull-api/platform-pull-api_impl.md');
const firebaseDoc = read('__docs__/platform-pull-api/platform-pull-api_firebase.md');
const mobileDoc = read('__docs__/platform-pull-api/platform-pull-api_mobile-support.md');
const businessTruthContract = read('__docs__/canonical-truth-infrastructure/canonical-truth-infrastructure_business-truth-contract.md');
const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');

[
  "const UNSAFE_SUMMARY_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);",
  'Object.create(null)',
  'export function parseSummaryMap(',
  'if (![entityId, ...fieldPath].every(isSafeSummaryMapSegment)) continue;',
].forEach((token) => requireToken(summaryMapParser, token, 'Shared summary map prototype boundary'));
[
  'export function withAuthoritativeSummaryProjectId(',
  'return { ...data, projectId };',
  'export function isActiveRegularSummaryProject(',
  'export function isCurrentActiveSpecialSummaryProject(',
  'export function normalizeSummaryProjectLocalizedText(',
  "return parseSummaryMap(data, 'projects');",
].forEach((token) => requireToken(summaryProjectParser, token, 'Summary project parser identity and prototype boundary'));
[
  'export function withAuthoritativeSummaryStoreId(',
  'return { ...data, storeId };',
  "return parseSummaryMap(data, 'stores');",
].forEach((token) => requireToken(summaryStoreParser, token, 'Summary store parser identity and prototype boundary'));
[
  'assertSafeSummaryProjectId(projectId);',
  'assertSafeSummaryFieldPath(fieldPath);',
  "projectId.includes('.')",
].forEach((token) => requireToken(summaryProjectWriter, token, 'Summary project writer path boundary'));
[
  "const UNSAFE_SUMMARY_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);",
  'Object.create(null)',
  'projectId: snap.id,',
  'projectId: doc.id,',
].forEach((token) => requireToken(decisionBlocksScoring, token, 'Decision Blocks summary project boundary'));
[
  'isActiveRegularSummaryProject',
  'isCurrentActiveSpecialSummaryProject',
  'normalizeSummaryProjectLocalizedText',
  'withAuthoritativeSummaryProjectId',
].forEach((token) => requireToken(obpContent, token, 'OBP summary runtime boundary'));
[campaignServerScreen, screenInvalidation].forEach((source) => {
  ['isActiveRegularSummaryProject', 'isDefaultSummaryProject', 'withAuthoritativeSummaryProjectId']
    .forEach((token) => requireToken(source, token, 'Digital screen summary runtime boundary'));
});
requireToken(packageJson, '"test:summary-project-boundaries"', 'Summary project behavioral test package script');

requireToken(
  packageJson,
  '"verify:platform-pull-api-boundary": "node scripts/verification/verify-platform-pull-api-boundary.js && npm run test:platform-pull-api-target-eligibility"',
  'package scripts',
);
requireToken(packageJson, '"test:platform-pull-api-target-eligibility"', 'Platform Pull API target eligibility test registry');
requireToken(features, 'ENABLE_PUBLIC_API: true', 'Platform Pull API feature flag');

[
  'export function isMenuListPublicApiEntityEligible(value: unknown): boolean',
  'return isMenuListPublicEntityEligible(value);',
].forEach((token) => requireToken(targetEligibility, token, 'Platform Pull API entity eligibility compatibility boundary'));
[
  'export function isMenuListPublicEntityEligible(value: unknown): boolean',
  'entity.active !== false',
  'entity.deleted !== true',
  '!isPlatformEntityBlocked(entity)',
].forEach((token) => requireToken(publicTruthEligibility, token, 'Shared public truth entity eligibility boundary'));
[
  'export function isMenuListPublicApiProductEntity(value: unknown): boolean',
  'export function isMenuListPublicApiCredentialInScope(value: unknown): boolean',
  "credential.purpose === 'menulist_public_api'",
  'explicitProductIds.every((productId) => productId === PRODUCT_IDS.MENULIST)',
  "resolveConsistentIdentityAliases(entity, ['tenantId', 'tId'])",
  'export function isMenuListPublicApiStoreIdentityConsistent(',
  "resolveConsistentIdentityAliases(entity, ['storeId', 'sId'])",
  'export function isMenuListPublicApiTenantIdentityConsistent(',
].forEach((token) => requireToken(menuListScope, token, 'Platform Pull API MenuList product and identity coherence boundary'));

[
  "const PULL_API_VOLATILE_RESPONSE_FIELDS = new Set(['generatedAt', 'timestamp']);",
  'export function buildPullApiETagPayload(',
  '!PULL_API_VOLATILE_RESPONSE_FIELDS.has(field)',
].forEach((token) => requireToken(responseIdentity, token, 'Platform Pull API stable response identity boundary'));

[
  'export const PULL_API_SCHEMA_VERSION = "1.0";',
  'PULL_API_RESPONSE_CACHE_CONTROL = "private, max-age=60, stale-while-revalidate=300"',
  'PULL_API_ERROR_CACHE_CONTROL = "private, no-store"',
  'PULL_API_RESPONSE_VARY = "X-API-Key"',
  'PULL_API_KEY_RATE_LIMIT = 60',
  'PULL_API_PREAUTH_RATE_LIMIT = PULL_API_KEY_RATE_LIMIT * 4',
  'PULL_API_RATE_LIMIT_WINDOW_SECONDS = 60',
  "const PUBLIC_API_KEY_PATTERN = /^(ml|cn|al)_[A-Za-z0-9_-]{20,128}$/;",
  'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
  'export function normalizePublicApiDocumentId(value: unknown): string | null',
  'return documentId === raw && isValidFirestoreDocumentId(documentId) ? documentId : null;',
  'export function normalizeMenuListPublicApiNumericId(value: unknown): number | null',
  'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
  'export function normalizePublicApiKey(apiKey: string | null): string | null',
  'export function hashApiKey(apiKey: string): string',
  'export function generatePullApiETag(payload: Record<string, unknown>): string',
  'return generateETag(buildPullApiETagPayload(payload));',
  'export function buildPullApiResponseHeaders(etag: string): Record<string, string>',
  'export function pullApiError(',
  "'Cache-Control': PULL_API_ERROR_CACHE_CONTROL",
  "'Vary': PULL_API_RESPONSE_VARY",
  'export function pullApiRateLimitError(result:',
  "result.reason === 'provider_unavailable'",
  "pullApiError('SERVICE_UNAVAILABLE', 'Service temporarily unavailable', 503",
  "pullApiError('RATE_LIMIT_EXCEEDED', 'Too many requests', 429",
  'export async function isMenuListPublicApiTargetAllowed(',
  'storeDocumentId: string,',
  '!isMenuListPublicApiEntityEligible(storeData)',
  '!isMenuListPublicApiProductEntity(storeData)',
  '!isMenuListPublicApiStoreIdentityConsistent(storeData, storeDocumentId)',
  'const tenantDocumentId = resolveMenuListPublicApiTenantDocumentId(storeData);',
  '.collection(DB_COLLECTIONS.TENANTS)',
  'isMenuListPublicApiProductEntity(tenantData)',
  'isMenuListPublicApiTenantIdentityConsistent(tenantData, tenantDocumentId)',
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
requireOccurrenceAtLeast(publicApiAuth, '.limit(2)', 4, 'Public API duplicate credential lookup boundary');
requireOccurrenceAtLeast(publicApiAuth, 'snapshot.docs.length !== 1', 1, 'Public API ambiguous credential rejection');
[
  'const [hashedSnapshot, legacyRawSnapshot] = await Promise.all([',
  'const publicCredentialDocumentPaths = new Set([',
  '...hashedSnapshot.docs.map((doc) => doc.ref.path)',
  '...(legacyRawSnapshot?.docs.map((doc) => doc.ref.path) || [])',
  'if (publicCredentialDocumentPaths.size > 1)',
  "secureLog('[Public API] Ambiguous cross-representation API key rejected')",
  'snapshot = !hashedSnapshot.empty ? hashedSnapshot : legacyRawSnapshot;',
].forEach((token) => requireToken(publicApiAuth, token, 'Public API cross-representation credential uniqueness boundary'));
requireOccurrenceAtLeast(publicApiAuth, 'const storeDocumentId = normalizePublicApiDocumentId(doc.id);', 2, 'Public API auth helper store document-ID validation');
requireOccurrenceAtLeast(publicApiAuth, 'storeId: storeDocumentId', 2, 'Public API auth helper normalized validation result store ID');
forbidToken(publicApiAuth, 'secureLog(`[Public API] ${endpoint}`', 'Public API auth helper raw dynamic log event');
forbidToken(publicApiAuth, 'userAgent: userAgent.slice', 'Public API auth helper raw user agent log');
forbidToken(publicApiAuth, '        storeId,\n        ip,', 'Public API auth helper raw store/IP log context');
forbidToken(publicApiAuth, '.doc(String(tenantId))', 'Public API auth helper raw tenant ref');

[
  ['business', businessRoute, '/api/public/v1/business', 'public_api_business_route_failed'],
  ['menu', menuRoute, '/api/public/v1/menu', 'public_api_menu_route_failed'],
].forEach(([label, route, endpoint, failureCode]) => {
  [
    "export const dynamic = 'force-dynamic';",
    'if (!FEATURE_FLAGS.ENABLE_PUBLIC_API)',
    "const rawApiKey = request.headers.get('x-api-key')",
    'const apiKey = normalizePublicApiKey(rawApiKey);',
    "if (!apiKey || !apiKey.startsWith('ml_'))",
    'key: `public-api-preauth:${hashPublicRateLimitValue(getClientIp(request))}`',
    'limit: PULL_API_PREAUTH_RATE_LIMIT',
    'const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);',
    `endpoint: '${endpoint}'`,
    'key: `public-api:${apiKeyRateLimitId}`',
    'limit: PULL_API_KEY_RATE_LIMIT',
    'failClosedOnProviderError: true',
    'return pullApiRateLimitError(preAuthRateLimitResult);',
    'return pullApiRateLimitError(rlResult);',
    'const result = await validatePublicApiKey(apiKey);',
    'const { credential, storeData, storeId } = result;',
    '!isMenuListPublicApiCredentialInScope(credential)',
    "!hasPublicApiCredentialScope(credential, 'public:read')",
    'const storeNumericId = normalizeMenuListPublicApiNumericId',
    'if (!(await isMenuListPublicApiTargetAllowed(storeData, storeDocumentId)))',
    "pullApiError('INVALID_API_KEY', 'Invalid API key', 401)",
    "getBoundedSecurityStringContext('storeId', storeDocumentId)",
    'logApiRequest(request, storeDocumentId',
    'schemaVersion: PULL_API_SCHEMA_VERSION',
    'const etag = `"${generatePullApiETag(',
    'const responseHeaders = buildPullApiResponseHeaders(etag);',
    'if (ifNoneMatch === etag)',
    'headers: responseHeaders',
    `logSecurityFailure('${failureCode}'`,
    "pullApiError('INTERNAL_ERROR', 'Internal error', 500)",
  ].forEach((token) => requireToken(route, token, `Public ${label} pull route`));

  requireOrder(
    route,
    [
      "const rawApiKey = request.headers.get('x-api-key')",
      'const apiKey = normalizePublicApiKey(rawApiKey);',
      "if (!apiKey || !apiKey.startsWith('ml_'))",
      'key: `public-api-preauth:${hashPublicRateLimitValue(getClientIp(request))}`',
      'if (!preAuthRateLimitResult.allowed)',
      'const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);',
      'const rlResult = await checkRateLimit',
      'const result = await validatePublicApiKey(apiKey);',
      'const storeNumericId = normalizeMenuListPublicApiNumericId',
      'if (!(await isMenuListPublicApiTargetAllowed(storeData, storeDocumentId)))',
      'logApiRequest(request, storeDocumentId',
      'const etag = `"${generatePullApiETag(',
      'const responseHeaders = buildPullApiResponseHeaders(etag);',
    ],
    `Public ${label} pull route admission order`,
  );
  forbidToken(route, 'cacheTtlMs', `Public ${label} pull route validation cache`);
  requireOccurrenceAtLeast(route, 'failClosedOnProviderError: true', 2, `Public ${label} pull route fail-closed limiters`);
  forbidToken(route, 'key: `public-api:${apiKey}`', `Public ${label} pull route raw limiter key`);
  forbidToken(route, "'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'", `Public ${label} pull route shared cache`);
  forbidToken(route, 'Number(storeId)', `Public ${label} pull route raw numeric store coercion`);
});

[
  'const tenantDocumentId = resolveMenuListPublicApiTenantDocumentId(storeData);',
  'const storeDocumentId = normalizePublicApiDocumentId(storeId);',
  'const tenantNumericId = normalizeMenuListPublicApiNumericId(tenantDocumentId);',
  'const storeNumericId = normalizeMenuListPublicApiNumericId(storeDocumentId);',
  '.doc(tenantDocumentId)',
  '.collection(storeDocumentId)',
  'storeNumericId,',
  'tenantNumericId,',
].forEach((token) => requireToken(menuRoute, token, 'Public menu pull route target document-ID boundary'));
forbidToken(menuRoute, 'Number(tenantId)', 'Public menu pull route raw numeric tenant coercion');
forbidToken(menuRoute, 'Number(storeDocumentId)', 'Public menu pull route unchecked normalized store coercion');
forbidToken(menuRoute, 'Number(tenantDocumentId)', 'Public menu pull route unchecked normalized tenant coercion');

[
  'parseSummaryProjects(summarySnap.data())',
  '.doc(`projects_${storeDocumentId}`)',
  'const projectDocumentId = normalizePublicApiDocumentId(projectId);',
  'project.active !== false',
  'project.deleted !== true',
  'project.isSpecialMenu !== true',
  'projects.find((project) => project.isDefault === true) || projects[0]',
  'const projectScope = projectDocumentId',
  'projectScope?.tenantDocumentId === tenantDocumentId',
  'projectScope.storeDocumentId === storeDocumentId',
  'withAuthoritativeSummaryProjectId(projectScope.projectId, data)',
  '.collection(DB_COLLECTIONS.PROJECTS)',
  'if (projectData?.active === false || projectData?.deleted === true) return null;',
  "event: 'menu.pull' as const",
  'projectId: projectDoc.id,',
  'normalizePosSyncMenuVersion(projectData.menuVersion)',
  'const masterProjectScope = normalizeMultiOutletProjectId(storeProject.masterProjectId);',
  'masterProjectScope.tenantDocumentId !== tenantDocumentId',
  '.doc(masterProjectScope.tenantDocumentId)',
  '.collection(masterProjectScope.storeDocumentId)',
  '.doc(masterProjectScope.projectId)',
  'masterProjectData.masterProjectId',
  'populateMasterCache(masterProjectScope.projectId,',
  'const resolvedProject = await resolveProjectForRender({ storeProject });',
  'resolvedProject._resolved?.isMasterLinked !== true',
  'inheritLinkedPublicPullMetadata(resolvedProject, masterProjectData)',
  'projectId: storeProject.projectId,',
].forEach((token) => requireToken(menuRoute, token, 'Public menu pull route project selection'));
[
  'export function inheritLinkedPublicPullMetadata(',
  'languages: resolvedProject.languages?.length',
  ': masterProject.languages,',
  'menuVersion: resolvedProject.menuVersion ?? masterProject.menuVersion,',
].forEach((token) => requireToken(menuProjection, token, 'Public menu linked outlet metadata projection'));
forbidToken(menuRoute, 'projectId: projectData?.projectId || selectedProject.projectId', 'Public menu pull embedded project ID override');
forbidToken(menuRoute, 'projectData as any', 'Public menu pull project cast');

[
  'getActivePublicTempStatus(storeData.tempStatus)',
  'const activeTempStatus = FEATURE_FLAGS.ENABLE_TEMP_STATUS',
  'tempStatus: activeTempStatus',
  'const publicBusinessAttributes = FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES',
  'normalizePublicBusinessAttributes(storeData.businessAttributes)',
].forEach((token) => requireToken(businessRoute, token, 'Public business pull active status boundary'));
[
  'export function normalizePublicBusinessAttributes(value: unknown)',
  'const normalized = normalizeBusinessAttributes(value);',
  "import { getActiveTempStatus, type ActiveTempStatus } from '@lib/tempStatus/statusBoundary';",
  'export type PublicTempStatus = ActiveTempStatus;',
  'export function getActivePublicTempStatus(',
  'return getActiveTempStatus(value, nowMs);',
].forEach((token) => requireToken(businessProjection, token, 'Public business pull shared projection boundary'));
[
  'export function getActiveTempStatus(',
  'const type = normalizeTempStatusType(status.type);',
  "typeof status.expiresAt !== 'string'",
  'const expiresAtMs = Date.parse(status.expiresAt);',
  'expiresAtMs <= nowMs',
  'message: normalizeTempStatusMessage(type, status.message)',
].forEach((token) => requireToken(tempStatusBoundary, token, 'Shared active temporary-status runtime boundary'));
[
  'export function normalizeBusinessAttributes(value: unknown)',
  'BUSINESS_ATTRIBUTE_CONFIG.forEach(({ key }) =>',
  "typeof attributes[key] === 'boolean'",
].forEach((token) => requireToken(businessAttributes, token, 'Shared controlled business-attribute runtime boundary'));

[
  "export const dynamic = 'force-dynamic';",
  'export const POST = withAuth(async (request: NextRequest, session) =>',
  'if (!FEATURE_FLAGS.ENABLE_PUBLIC_API)',
  'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
  'const PUBLIC_API_KEY_SESSION_DOCUMENT_ID_MAX_LENGTH = 160;',
  'function normalizeSessionDocumentId(value: unknown): string | null',
  'documentId.length <= PUBLIC_API_KEY_SESSION_DOCUMENT_ID_MAX_LENGTH',
  'isValidFirestoreDocumentId(documentId)',
  'const { tId: rawTenantId, sId: rawStoreId } = session',
  'const tenantId = normalizeSessionDocumentId(rawTenantId);',
  'const storeId = normalizeSessionDocumentId(rawStoreId);',
  'requireAnyStorePermissionForStoreData(',
  '[PERMISSIONS.MANAGE_INTEGRATIONS]',
  'const storeRateLimitHash = hashPublicRateLimitValue(storeId);',
  'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeId);',
  'const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantId);',
  'key: `api-key-mgmt:${storeRateLimitHash}`',
  'const PUBLIC_API_KEY_ACTION_MAX_BODY_BYTES = 1024;',
  "storeId: z.string().min(1).max(PUBLIC_API_KEY_SESSION_DOCUMENT_ID_MAX_LENGTH)",
  "tenantId: z.string().min(1).max(PUBLIC_API_KEY_SESSION_DOCUMENT_ID_MAX_LENGTH)",
  'readBoundedJsonBody(request, PUBLIC_API_KEY_ACTION_MAX_BODY_BYTES',
  'RequestSchema.safeParse(body)',
  'const requestedTenantId = normalizeSessionDocumentId(validation.data.tenantId);',
  'const requestedStoreId = normalizeSessionDocumentId(validation.data.storeId);',
  'if (requestedTenantId !== tenantId || requestedStoreId !== storeId)',
  '{ error: "Store context changed" }',
  '}).strict();',
  'const transactionResult = await db.runTransaction(async (transaction) => {',
  'transaction.get(tenantRef)',
  'transaction.get(storeRef)',
  '!isMenuListPublicApiEntityEligible(tenantData)',
  '!isMenuListPublicApiProductEntity(tenantData)',
  '!isMenuListPublicApiTenantIdentityConsistent(tenantData, tenantId)',
  '!isMenuListPublicApiEntityEligible(storeData)',
  '!isMenuListPublicApiProductEntity(storeData)',
  '!isMenuListPublicApiStoreIdentityConsistent(storeData, storeId)',
  'resolveMenuListPublicApiTenantDocumentId(storeData) !== tenantId',
  "const apiKey = action === 'generate'",
  "? `ml_${randomUUID().replace(/-/g, '')}`",
  'const apiKeyHash = apiKey ? hashApiKey(apiKey) : null;',
  'publicApi: {',
  'apiKeyHash,',
  'keyPrefix: apiKey.slice(0, 7)',
  "productId: 'ML'",
  "purpose: 'menulist_public_api'",
  "scopes: ['public:read']",
  'publicApi: admin.firestore.FieldValue.delete()',
  "logSecurityDiagnostic('public_api_key_generated'",
  "logSecurityDiagnostic('public_api_key_revoked'",
  "logSecurityFailure('public_api_key_management_failed'",
  'failClosedOnProviderError: true',
  "const PUBLIC_API_KEY_RESPONSE_HEADERS = { 'Cache-Control': 'private, no-store' };",
  'function getPublicApiKeyRateLimitResponse(result:',
  "result.reason === 'provider_unavailable'",
  'status: providerUnavailable ? 503 : 429',
  "'Retry-After': String(Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 1))",
  'return getPublicApiKeyRateLimitResponse(rlResult);',
  '{ apiKey, storeId, tenantId }',
  '{ success: true, storeId, tenantId }',
  '{ error: "Failed to manage API key" }',
].forEach((token) => requireToken(keyRoute, token, 'Public API key management route'));
requireOrder(
  keyRoute,
  [
    'if (!FEATURE_FLAGS.ENABLE_PUBLIC_API)',
    'const tenantId = normalizeSessionDocumentId(rawTenantId);',
    'const storeId = normalizeSessionDocumentId(rawStoreId);',
    'const storeRateLimitHash = hashPublicRateLimitValue(storeId);',
    'readBoundedJsonBody(request, PUBLIC_API_KEY_ACTION_MAX_BODY_BYTES',
    'RequestSchema.safeParse(body)',
    'const transactionResult = await db.runTransaction(async (transaction) => {',
    'requireAnyStorePermissionForStoreData(',
    'transaction.update(storeRef,',
  ],
  'Public API key management route admission order',
);
forbidToken(keyRoute, 'apiKey: apiKey', 'Public API key management route raw key storage');
forbidToken(keyRoute, 'key: `api-key-mgmt:${storeId}`', 'Public API key management route raw limiter key');
forbidToken(keyRoute, 'doc(String(storeId))', 'Public API key management route raw store ref');
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
  'body: JSON.stringify({ action, ...expectedScope })',
  'const publicApiActionInFlightRef = useRef(false);',
  'const activeIntegrationScopeRef = useRef(integrationScopeKey);',
  'const componentActiveRef = useRef(true);',
  'payload.storeId === expectedScope.storeId',
  'payload.tenantId === expectedScope.tenantId',
  'activeIntegrationScopeRef.current !== requestScopeKey',
  "String(previous?.storeId ?? '') === expectedScope.storeId",
  "String(previous?.tenantId ?? '') === expectedScope.tenantId",
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
requireToken(businessSettings, "key={`integrations:${String(storeDetails?.tenantId ?? '')}:${String(storeDetails?.storeId ?? '')}`}", 'Business Settings Platform Pull API exact-scope remount');
requireToken(businessSettings, 'setStoreDetails={setStoreDetails}', 'Business Settings Platform Pull API key UI state wiring');

[
  'publicApi?: {',
  'apiKey?: string;        // Legacy raw key fallback only',
  'apiKeyHash?: string;    // SHA-256 hash used by current validation path',
  'keyPrefix?: string;',
  'productId?: StorePublicApiCredentialProductId;',
  'purpose?: StorePublicApiCredentialPurpose;',
  'scopes?: StorePublicApiCredentialScope[];',
].forEach((token) => requireToken(storePublicApiType, token, 'Store publicApi type'));
forbidToken(storePublicApiType, "productId?: 'AL' | string;", 'Store publicApi product type drift');
forbidToken(storePublicApiType, "purpose?: 'answerlattice_widget' | string;", 'Store publicApi purpose type drift');
requireToken(
  publicApiAuth,
  'export type PublicApiCredentialScope = StorePublicApiCredentialScope;',
  'Shared public API credential scope SSOT',
);

[
  '## Source Gate',
  '`npm run verify:platform-pull-api-boundary`',
  '`ENABLE_PUBLIC_API: true`',
  'Business Settings Integrations tab',
  'live key/target revalidation',
  'Target document-ID admission',
].forEach((token) => requireToken(readme, token, 'Platform Pull API README'));
forbidToken(readme, 'default OFF', 'Platform Pull API README stale flag default');

[
  '## Source Gate',
  '`npm run verify:platform-pull-api-boundary`',
  'Business Settings Integrations tab',
  'FR-17',
  'FR-18',
  'target document-ID and MenuList numeric-ID admission',
].forEach((token) => requireToken(spec, token, 'Platform Pull API spec'));

[
  '## Source Gate',
  '`npm run verify:platform-pull-api-boundary`',
  'Business Settings Integrations tab',
  'raw key is shown only once',
  'Request tenant/store IDs pass the same document-ID normalization and must exactly match the authenticated session',
  'require normalized credential store IDs and exact positive numeric MenuList target IDs before response construction',
  'normalizePublicApiDocumentId(value)',
  'normalizeMenuListPublicApiNumericId(value)',
  'stores only the non-secret credential projection',
  "productId?: 'ML' | 'AL';",
  "purpose?: 'menulist_public_api' | 'answerlattice_public_api' | 'answerlattice_widget';",
  'scopes?: StorePublicApiCredentialScope[];',
  "Current MenuList generation writes the hash, prefix, timestamp, `productId: 'ML'`",
].forEach((token) => requireToken(impl, token, 'Platform Pull API implementation doc'));

[
  '## Source Gate',
  '`npm run verify:platform-pull-api-boundary`',
  'Feature flag is currently `ENABLE_PUBLIC_API: true`',
  'Business Settings Integrations tab',
  'Key-management session tenant/store document-ID admission',
  'session tenant/store IDs pass through the shared Firestore document-ID guard',
  'target document-ID and MenuList numeric-ID admission',
  'Target document-ID guard',
].forEach((token) => requireToken(firebaseDoc, token, 'Platform Pull API Firebase doc'));
forbidToken(firebaseDoc, 'Feature flag OFF by default', 'Platform Pull API Firebase stale flag default');

[
  '## Source Gate',
  '`npm run verify:platform-pull-api-boundary`',
  'No dedicated mobile key-management UI is required',
].forEach((token) => requireToken(mobileDoc, token, 'Platform Pull API mobile doc'));

[
  '# MenuList Business Truth Contract',
  'This contract consolidates the runtime that already exists.',
  'It does not create',
  'a second canonical collection',
  '## Current Projections',
  'Platform Pull Business API',
  'Platform Pull Menu API',
  '`schemaVersion: "1.0"`',
  'A modification timestamp is not',
  'Platform Pull v1 deliberately exposes the approved decision value',
  '## External Location Collision Gate',
  'no grounded-candidate confirmation UI may be released',
  '## Version Policy',
  'new API schema version and migration',
  'Duplicate anonymous public JSON endpoint',
].forEach((token) => requireToken(businessTruthContract, token, 'MenuList Business Truth Contract'));

requireToken(inventory, 'platform-pull-api boundary source gate passed; live key fixture/manual still pending', 'feature sweep inventory');
[
  '## Platform Pull API Boundary',
  '`npm run verify:platform-pull-api-boundary`',
  'source/docs verification only',
].forEach((token) => requireToken(report, token, 'feature sweep report'));
[
  'Platform Pull API target document-ID boundary checkpoint',
  'Owner store session document-ID boundary checkpoint',
  'Platform Pull API boundary checkpoint',
  'Platform Pull API key-management strict session document-ID boundary checkpoint',
  '`npm run verify:platform-pull-api-boundary`',
  'MenuList numeric-ID admission',
  'raw `doc(String(storeId))` exclusions',
  'Business Settings Integrations tab',
].forEach((token) => requireToken(audit, token, 'production readiness audit'));
[
  'Platform Pull API Target Document ID Boundary',
  'Owner Store Session Document ID Boundary',
  'Platform Pull API Key-Management Strict Session Document ID Boundary',
  'July 2, 2026 - Platform Pull API Boundary',
  'MenuList numeric-ID admission',
  '`/api/store/public-api-key` validates session tenant/store IDs with the shared Firestore document-ID guard',
  'raw `doc(String(storeId))` exclusions',
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
