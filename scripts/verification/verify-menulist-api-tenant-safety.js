#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..', '..');
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function listRouteFiles(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];

  return fs.readdirSync(absoluteDir, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = path.join(absoluteDir, entry.name);
      const relativePath = path.relative(ROOT, absolutePath).replace(/\\/g, '/');

      if (entry.isDirectory()) return listRouteFiles(relativePath);
      if (entry.isFile() && /^route\.tsx?$/.test(entry.name)) return [relativePath];
      return [];
    })
    .sort();
}

function listFiles(relativeDir, shouldInclude = () => true) {
  const absoluteDir = path.join(ROOT, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];

  return fs.readdirSync(absoluteDir, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = path.join(absoluteDir, entry.name);
      const relativePath = path.relative(ROOT, absolutePath).replace(/\\/g, '/');

      if (entry.isDirectory()) return listFiles(relativePath, shouldInclude);
      if (entry.isFile() && shouldInclude(relativePath)) return [relativePath];
      return [];
    })
    .sort();
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(relativePath, needles, label) {
  const content = read(relativePath);
  const missing = needles.filter((needle) => (
    needle instanceof RegExp ? !needle.test(content) : !content.includes(needle)
  ));

  assert(
    missing.length === 0,
    `${label} missing ${missing.map(String).join(', ')}`,
  );
}

function assertOrder(relativePath, orderedNeedles, label) {
  const content = read(relativePath);
  let cursor = -1;
  const missingOrOutOfOrder = [];

  orderedNeedles.forEach((needle) => {
    const nextIndex = content.indexOf(needle, cursor + 1);
    if (nextIndex === -1) {
      missingOrOutOfOrder.push(needle);
      return;
    }
    cursor = nextIndex;
  });

  assert(
    missingOrOutOfOrder.length === 0,
    `${label} missing or out of order: ${missingOrOutOfOrder.join(', ')}`,
  );
}

function assertOccurrenceAtLeast(content, needle, minimum, label) {
  const count = content.split(needle).length - 1;
  assert(
    count >= minimum,
    `${label} must include ${needle} at least ${minimum} times, found ${count}`,
  );
}

function verifyPublicPullApiResponseCacheBoundary() {
  const businessRoute = read('src/app/api/public/v1/business/route.ts');
  const menuRoute = read('src/app/api/public/v1/menu/route.ts');
  const publicApiAuth = read('src/lib/publicApi/auth.ts');
  const publicApiTargetEligibility = read('src/lib/publicApi/targetEligibility.ts');
  const publicEntityEligibility = read('src/lib/publicTruth/entityEligibility.ts');
  const publicApiMenuListScope = read('src/lib/publicApi/menuListScope.ts');

  [
    [businessRoute, 'business'],
    [menuRoute, 'menu'],
  ].forEach(([route, label]) => {
    assert(route.includes('validatePublicApiKey(apiKey)'), `public pull ${label} route must validate the API key on each request`);
    assert(!route.includes('cacheTtlMs'), `public pull ${label} route must not cache API-key/store eligibility validation`);
    assert(route.includes('isMenuListPublicApiTargetAllowed'), `public pull ${label} route must import MenuList target eligibility guard`);
    assert(route.includes('normalizeMenuListPublicApiNumericId'), `public pull ${label} route must validate MenuList numeric public IDs before response building`);
    assert(route.includes('const storeNumericId = normalizeMenuListPublicApiNumericId'), `public pull ${label} route must normalize the validated store document ID before emitting storeId`);
    assert(route.includes('if (!(await isMenuListPublicApiTargetAllowed(storeData, storeDocumentId)))'), `public pull ${label} route must reject out-of-product, incoherent, inactive/deleted/platform-blocked/tenant-blocked stores`);
    assert(route.indexOf('if (!(await isMenuListPublicApiTargetAllowed(storeData, storeDocumentId)))') < route.indexOf('logApiRequest(request,'), `public pull ${label} route must check target eligibility before abuse logging and response building`);
    assert(route.includes('buildPullApiResponseHeaders(etag)'), `public pull ${label} route must use shared private cache headers`);
    assert(route.includes('const responseHeaders = buildPullApiResponseHeaders(etag);'), `public pull ${label} route must reuse identical 200/304 headers`);
    assert(!route.includes("'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'"), `public pull ${label} route must not use shared public cache headers`);
    assert(!route.includes('Number(storeId)'), `public pull ${label} route must not coerce raw store IDs without numeric admission`);
  });

  assert(publicApiAuth.includes('export async function isMenuListPublicApiTargetAllowed'), 'public pull API must expose a MenuList target eligibility helper');
  assert(publicApiAuth.includes('export function normalizePublicApiDocumentId(value: unknown): string | null'), 'public pull API must expose a shared Firestore document-ID normalizer');
  assert(publicApiAuth.includes('export function normalizeMenuListPublicApiNumericId(value: unknown): number | null'), 'public pull API must expose a MenuList numeric ID normalizer');
  assert(publicApiAuth.includes('Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId'), 'public pull API numeric IDs must be exact positive integers');
  assert(publicApiAuth.includes('!isMenuListPublicApiEntityEligible(storeData)'), 'public pull API must use the shared lifecycle/block eligibility guard for stores');
  assert(publicApiAuth.includes('!isMenuListPublicApiProductEntity(storeData)'), 'public pull API must reject explicit non-MenuList store products');
  assert(publicApiAuth.includes('!isMenuListPublicApiStoreIdentityConsistent(storeData, storeDocumentId)'), 'public pull API must compare stored store aliases to the credential document ID');
  assert(publicApiAuth.includes('const tenantDocumentId = resolveMenuListPublicApiTenantDocumentId(storeData);'), 'public pull API must reject malformed or conflicting tenant aliases before lookup');
  assert(publicApiAuth.includes('.collection(DB_COLLECTIONS.TENANTS)'), 'public pull API must read tenant eligibility before returning MenuList public data');
  assert(publicApiAuth.includes('isMenuListPublicApiProductEntity(tenantData)'), 'public pull API must reject explicit non-MenuList tenant products');
  assert(publicApiAuth.includes('isMenuListPublicApiTenantIdentityConsistent(tenantData, tenantDocumentId)'), 'public pull API must compare tenant aliases to the tenant document ID');
  assert(publicApiTargetEligibility.includes('return isMenuListPublicEntityEligible(value);'), 'public pull API eligibility alias must use shared public-truth lifecycle admission');
  ['entity.active !== false', 'entity.deleted !== true', '!isPlatformEntityBlocked(entity)'].forEach((token) => {
    assert(publicEntityEligibility.includes(token), `public pull API entity eligibility must include ${token}`);
  });
  [
    'explicitProductIds.every((productId) => productId === PRODUCT_IDS.MENULIST)',
    "resolveConsistentIdentityAliases(entity, ['tenantId', 'tId'])",
    "resolveConsistentIdentityAliases(entity, ['storeId', 'sId'])",
  ].forEach((token) => {
    assert(publicApiMenuListScope.includes(token), `public pull API MenuList scope boundary must include ${token}`);
  });
  assert(publicApiAuth.includes('PULL_API_RESPONSE_CACHE_CONTROL = "private, max-age=60, stale-while-revalidate=300"'), 'public pull API must keep responses out of shared caches');
  assert(publicApiAuth.includes('PULL_API_RESPONSE_VARY = "X-API-Key"'), 'public pull API must vary responses by API key');
  assert(publicApiAuth.includes("'Vary': PULL_API_RESPONSE_VARY"), 'public pull API response helper must emit Vary');
}

function verifyComplianceBrowserRequestPolicyBoundary() {
  const authBrowserRequestPolicy = read('src/lib/auth/browserRequestPolicy.ts');
  const complianceCallers = [
    ['src/components/templates/main-app/businessSettings/tabs/CompliancePagesSection.tsx', 'standalone desktop compliance pages'],
    ['src/components/templates/main-app/businessSettings/tabs/CustomDomainTab.tsx', 'embedded custom-domain compliance pages'],
    ['src/components/mobile/components/MobileCompliancePagesEditor.tsx', 'mobile compliance pages'],
  ];

  assert(authBrowserRequestPolicy.includes("cache: 'no-store' as RequestCache"), 'auth browser request policy must bypass browser caches');
  assert(authBrowserRequestPolicy.includes("credentials: 'same-origin' as RequestCredentials"), 'auth browser request policy must keep credentials same-origin');
  assert(authBrowserRequestPolicy.includes("redirect: 'manual' as RequestRedirect"), 'auth browser request policy must not follow redirects');

  complianceCallers.forEach(([relativePath, label]) => {
    const content = read(relativePath);
    assert(content.includes('AUTH_BROWSER_REQUEST_POLICY'), `${label} must use the shared authenticated browser request policy`);
    assertOccurrenceAtLeast(content, "fetch('/api/compliance'", 3, `${label} compliance API calls`);
    assertOccurrenceAtLeast(content, 'AUTH_BROWSER_REQUEST_POLICY', 4, `${label} shared authenticated browser request policy use`);
    assertOccurrenceAtLeast(content, '...AUTH_BROWSER_REQUEST_POLICY', 2, `${label} compliance mutations must spread shared request policy`);
    assert(!content.includes("fetch('/api/compliance', {\n                cache: 'no-store'"), `${label} must not reintroduce inline compliance request policy`);
    assert(!content.includes("fetch('/api/compliance', {\n        cache: 'no-store'"), `${label} must not reintroduce inline compliance load policy`);
  });
}

function listMenuListBrowserSurfaceFiles() {
  return [
    ...listFiles('src/app', (relativePath) => /\.(?:ts|tsx)$/.test(relativePath) && !/\.(?:test|spec)\.(?:ts|tsx)$/.test(relativePath)),
    ...listFiles('src/components', (relativePath) => /\.(?:ts|tsx)$/.test(relativePath) && !/\.(?:test|spec)\.(?:ts|tsx)$/.test(relativePath)),
  ].filter((relativePath) => {
    if (relativePath.startsWith('src/app/api/')) return false;
    if (relativePath.startsWith('src/app/sites/answerlattice/')) return false;
    if (relativePath.includes('/answerlattice/')) return false;
    return true;
  });
}

const DIRECT_FIREBASE_FUNCTIONS_CALLABLE_ALLOWLIST = new Map([
  ['src/components/templates/main-app/platform/opsControlRoom/index.tsx', {
    imports: new Set(['getFunctions', 'httpsCallable']),
    callables: new Set(['forceRepublish']),
  }],
  ['src/components/mobile/screens/MobileOpsControlRoomScreen.tsx', {
    imports: new Set(['getFunctions', 'httpsCallable']),
    callables: new Set(['forceRepublish']),
  }],
  ['src/components/templates/main-app/platform/schedulerMonitor/index.tsx', {
    imports: new Set(['getFunctions', 'httpsCallable']),
    callables: new Set(['triggerStoreNightlyScheduler']),
  }],
  ['src/components/mobile/screens/MobileSchedulerMonitorScreen.tsx', {
    imports: new Set(['getFunctions', 'httpsCallable']),
    callables: new Set(['triggerStoreNightlyScheduler']),
  }],
]);

function getImportedNames(importClause) {
  const namedMatch = importClause.match(/\{([\s\S]*?)\}/);
  if (!namedMatch) return [];

  return namedMatch[1]
    .split(',')
    .map((specifier) => specifier.trim())
    .filter(Boolean)
    .map((specifier) => specifier.replace(/^type\s+/, '').split(/\s+as\s+/i)[0].trim())
    .filter(Boolean);
}

function inspectDirectHttpsCallableInvocations(relativePath, content) {
  const sourceFile = ts.createSourceFile(
    relativePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const callableNames = [];
  let invalidInvocationCount = 0;
  let invocationCount = 0;

  const visit = (node) => {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === 'httpsCallable'
    ) {
      invocationCount += 1;
      const callableName = node.arguments[1];
      if (callableName && ts.isStringLiteralLike(callableName)) {
        callableNames.push(callableName.text);
      } else {
        invalidInvocationCount += 1;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return { callableNames, invalidInvocationCount, invocationCount };
}

function verifyBrowserDirectFirebaseFunctionsCallableBoundary() {
  const staticImportPattern = /import\s+(type\s+)?([^;]*?)\s+from\s+['"](?:firebase\/functions|@firebase\/functions)['"]\s*;?/g;
  const dynamicImportPattern = /(?:const|let|var)\s+\{\s*([^}]+?)\s*\}\s*=\s*(?:await\s+)?import\(\s*['"](?:firebase\/functions|@firebase\/functions)['"]\s*\)/g;

  listMenuListBrowserSurfaceFiles().forEach((relativePath) => {
    const content = read(relativePath);
    const allowlist = DIRECT_FIREBASE_FUNCTIONS_CALLABLE_ALLOWLIST.get(relativePath);
    let importsFirebaseFunctionsDirectly = false;

    for (const match of content.matchAll(staticImportPattern)) {
      if (match[1]) continue;
      importsFirebaseFunctionsDirectly = true;
      const importedNames = getImportedNames(match[2]);
      assert(
        !/\bhttpsCallable\s+as\s+\w+/.test(match[2]),
        `${relativePath} must not alias httpsCallable because callable-name inspection requires the canonical local identifier`,
      );

      assert(
        importedNames.length > 0,
        `${relativePath} must not use default or namespace firebase/functions imports from browser surfaces`,
      );

      importedNames.forEach((importedName) => {
        assert(
          Boolean(allowlist?.imports.has(importedName)),
          `${relativePath} must not import ${importedName} from firebase/functions outside the platform recovery allowlist`,
        );
      });
    }

    for (const match of content.matchAll(dynamicImportPattern)) {
      importsFirebaseFunctionsDirectly = true;
      getImportedNames(`{${match[1]}}`).forEach((importedName) => {
        assert(
          Boolean(allowlist?.imports.has(importedName)),
          `${relativePath} must not dynamically import ${importedName} from firebase/functions outside the platform recovery allowlist`,
        );
      });
    }

    if (!importsFirebaseFunctionsDirectly) return;

    assert(
      Boolean(allowlist),
      `${relativePath} must not call Firebase Functions directly from browser code; use an API route or approved helper`,
    );

    const callableInspection = inspectDirectHttpsCallableInvocations(relativePath, content);
    assert(
      callableInspection.invalidInvocationCount === 0,
      `${relativePath} must pass every direct httpsCallable target as a string literal`,
    );
    if (content.includes('httpsCallable')) {
      assert(
        callableInspection.invocationCount > 0,
        `${relativePath} must expose at least one inspectable direct httpsCallable invocation`,
      );
    }
    callableInspection.callableNames.forEach((callableName) => {
      assert(
        Boolean(allowlist?.callables.has(callableName)),
        `${relativePath} must not call Firebase callable ${callableName} outside the platform recovery allowlist`,
      );
    });
  });

  const genericFixture = inspectDirectHttpsCallableInvocations(
    'fixture.ts',
    "httpsCallable<{ id: string }, void>(getFunctions(), 'allowedCallable');",
  );
  assert(
    genericFixture.invocationCount === 1
      && genericFixture.invalidInvocationCount === 0
      && genericFixture.callableNames[0] === 'allowedCallable',
    'Firebase callable verifier must inspect generic calls with literal targets',
  );
  const dynamicFixture = inspectDirectHttpsCallableInvocations(
    'fixture.ts',
    'httpsCallable(getFunctions(), callableName);',
  );
  assert(
    dynamicFixture.invocationCount === 1 && dynamicFixture.invalidInvocationCount === 1,
    'Firebase callable verifier must reject dynamic callable targets',
  );
}

function verifyBrowserDirectFirebaseFunctionsCallableBoundaryDocs() {
  const changelog = read('__docs__/changelog.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');

  [
    'Browser Firebase Functions Callable Boundary',
    'verify:menulist-api-tenant-safety',
    'forceRepublish',
    'triggerStoreNightlyScheduler',
    'platform recovery controls',
  ].forEach((token) => {
    assert(changelog.includes(token), `changelog must document browser Firebase Functions callable boundary token ${token}`);
  });

  [
    'Browser Firebase Functions callable boundary checkpoint',
    'verify:menulist-api-tenant-safety',
    'forceRepublish',
    'triggerStoreNightlyScheduler',
    'platform recovery controls',
  ].forEach((token) => {
    assert(productionAudit.includes(token), `production audit must document browser Firebase Functions callable boundary token ${token}`);
  });
}

function verifyNoApiDirectBodyParsers() {
  const apiRouteFiles = listRouteFiles('src/app/api');
  assert(apiRouteFiles.length > 0, 'API direct body parser verifier found no route files');

  apiRouteFiles.forEach((route) => {
    const content = read(route);
    const hasRawJsonParser = /\b(?:request|req)\s*\.\s*json\s*\(/.test(content);
    assert(!hasRawJsonParser, `${route} must use bounded request-body helpers instead of request.json()/req.json()`);

    const hasDirectBodyParser = /\b(?:request|req)\s*\.\s*(?:text|arrayBuffer|blob|formData)\s*\(/.test(content);
    assert(!hasDirectBodyParser, `${route} must use bounded request-body helpers instead of direct request/req body readers`);
  });
}

function verifyNoApiRawZodFlattenDetails() {
  const apiRouteFiles = listRouteFiles('src/app/api');
  assert(apiRouteFiles.length > 0, 'API Zod flatten verifier found no route files');

  apiRouteFiles.forEach((route) => {
    const content = read(route);
    assert(!content.includes('.error.flatten()'), `${route} must use getSafeZodValidationDetails instead of returning raw Zod flatten details`);
    assert(!content.includes('error.flatten()'), `${route} must use getSafeZodValidationDetails instead of returning raw Zod flatten details`);
  });
}

function verifyNoApiRouteConsoleCalls() {
  const apiRouteFiles = listRouteFiles('src/app/api');
  assert(apiRouteFiles.length > 0, 'API console-call verifier found no route files');

  apiRouteFiles.forEach((route) => {
    const content = read(route);
    assert(
      !/\bconsole\.(?:error|warn|log)\s*\(/.test(content),
      `${route} must use secure/logger wrappers instead of direct route-level console calls`,
    );
  });
}

function verifyNoUnreviewedAliasedApiMethodExports() {
  const allowedAliasedMethodRoutes = new Set([
    'src/app/api/auth/[...nextauth]/route.ts',
  ]);
  const aliasedMethodExportPattern = /\bexport\s*\{[^}]*\b(?:GET|POST|PUT|PATCH|DELETE)\b[^}]*\}/s;

  listRouteFiles('src/app/api').forEach((route) => {
    const content = read(route);
    if (!aliasedMethodExportPattern.test(content)) return;
    assert(
      allowedAliasedMethodRoutes.has(route),
      `${route} uses an aliased HTTP method export that bypasses normal read/mutation admission classification`,
    );
  });

  assert(
    aliasedMethodExportPattern.test('export { handler as GET, handler as POST };'),
    'API method export verifier must detect aliased route methods',
  );
}

function hasMutatingRouteExport(content) {
  return /\bexport\s+(?:const|async\s+function)\s+(?:POST|PUT|PATCH|DELETE)\b/.test(content);
}

function hasReadRouteExport(content) {
  return /\bexport\s+(?:const|async\s+function)\s+GET\b/.test(content);
}

function isMenuListOwnedApiRoute(route) {
  return ![
    'src/app/api/answerlattice/',
    'src/app/api/campaigncue/',
    'src/app/api/platform/answerlattice-intake/',
    'src/app/api/revalidate/answerlattice/',
    'src/app/api/signaldesk/',
    'src/app/api/widget/',
  ].some((prefix) => route.startsWith(prefix));
}

function verifyMenuListMutatingApiAdmissionGuards() {
  const apiRouteFiles = listRouteFiles('src/app/api').filter(isMenuListOwnedApiRoute);
  assert(apiRouteFiles.length > 0, 'MenuList mutating API admission verifier found no route files');

  apiRouteFiles.forEach((route) => {
    const content = read(route);
    if (!hasMutatingRouteExport(content)) return;

    const hasBoundedBodyGate = /read(?:Optional)?Bounded(?:Json|Text|FormData)Body|rejectInvalidOrOversizedDeclaredBody/.test(content);
    const hasProtectedAdmission = /\bwith(?:Platform)?Auth\b|\bwithPublicApiAuth\b/.test(content);
    const hasPublicAdmission = /\bcheckPublicRateLimit\b|\bvalidatePublicApiKey\b|\bwithCORS\b/.test(content);
    const hasSecretOrSignatureAdmission = /REVALIDATION_SECRET|WORKER_SECRET|BATCH_IMAGE_GENERATION_WORKER_SECRET|x-[a-z0-9-]*signature|timingSafeEqual|validate[A-Za-z]*WebhookSignature/i.test(content);
    const hasAnonymousTokenAdmission = hasBoundedBodyGate
      && /\bcheckRateLimit\b/.test(content)
      && /hashPublicRateLimitValue|hashRequestValueForPhoneOtp|previewToken|SCREEN_TOKEN_PATTERN/.test(content);
    const hasDevelopmentOnlyAdmission = /process\.env\.NODE_ENV\s*!==\s*['"]development['"]/.test(content);

    assert(
      hasProtectedAdmission
      || hasPublicAdmission
      || hasSecretOrSignatureAdmission
      || hasAnonymousTokenAdmission
      || hasDevelopmentOnlyAdmission,
      `${route} mutating handler must declare a protected, public, token, signature, worker-secret, or development-only admission guard`,
    );
  });
}

function verifyMenuListReadApiAdmissionGuards() {
  const apiRouteFiles = listRouteFiles('src/app/api').filter(isMenuListOwnedApiRoute);
  assert(apiRouteFiles.length > 0, 'MenuList read API admission verifier found no route files');

  apiRouteFiles.forEach((route) => {
    const content = read(route);
    if (!hasReadRouteExport(content)) return;

    const hasProtectedAdmission = /\bwith(?:Platform)?Auth\b|\bwithPublicApiAuth\b/.test(content);
    const hasPublicAdmission = /\bcheckPublicRateLimit\b|\bvalidatePublicApiKey\b|\bwithCORS\b/.test(content);
    const hasSecretOrSignatureAdmission = /REVALIDATION_SECRET|WORKER_SECRET|CRON_SECRET|x-[a-z0-9-]*signature|timingSafeEqual|Authorization|Bearer/i.test(content);
    const hasAnonymousTokenAdmission = /\bcheckRateLimit\b/.test(content)
      && /hashPublicRateLimitValue|hashRequestValueForPhoneOtp/.test(content)
      && /claimToken|PreviewQuerySchema|previewToken|token/.test(content);
    const hasDevelopmentOnlyAdmission = /process\.env\.NODE_ENV\s*!==\s*['"]development['"]/.test(content);
    const hasStaticPublicAdmission = /VERCEL_GIT_COMMIT_SHA|NEXT_PUBLIC_BUILD_ID|Cache-Control/.test(content);

    assert(
      hasProtectedAdmission
      || hasPublicAdmission
      || hasSecretOrSignatureAdmission
      || hasAnonymousTokenAdmission
      || hasDevelopmentOnlyAdmission
      || hasStaticPublicAdmission,
      `${route} read handler must declare a protected, public, token, signature, worker-secret, development-only, or static public admission guard`,
    );
  });
}

function verifyCoreAuthHelpers() {
  assertIncludes(
    'src/middleware/auth.ts',
    [
      'export function verifyTenantAccess',
      'const sessionScope = resolveStorePermissionSessionScope(session);',
      'const requestTenantScope = normalizeStorePermissionScopeDocumentId(requestedTenantId);',
      'const requestStoreScope = normalizeStorePermissionScopeDocumentId(requestedStoreId);',
      'getAuthMiddlewareSecurityContext',
      'getBoundedSecurityRouteContext(session, request)',
      "getBoundedSecurityStringContext('endpoint', request.nextUrl.pathname)",
      "getBoundedSecurityStringContext('method', request.method)",
      'Horizontal Privilege Escalation Attempt - Tenant',
      'Horizontal Privilege Escalation Attempt - Store',
      'attemptedTenantId: requestTenantId',
      'attemptedStoreId: requestStoreId',
      'resolveExactSessionPlatformRole(session)',
      'resolveExactSessionStoreRole(session)',
      'resolveCurrentSessionUserDocumentId(session)',
      'Authorization Failed - Actor Identity',
      'sessionPlatformRole !== options.requiredPlatformRole',
      'sessionStoreRole !== options.requiredRole',
    ],
    'withAuth tenant/store access helper',
  );
  const authMiddleware = read('src/middleware/auth.ts');
  assert(!authMiddleware.includes('buildSecurityContext'), 'auth middleware must not spread raw route security context');
  assert(!authMiddleware.includes("ip: request.headers.get('x-forwarded-for')"), 'auth middleware must not log raw request IPs in security events');
  assert(!authMiddleware.includes("userAgent: request.headers.get('user-agent')"), 'auth middleware must not log raw user agents in security events');
  assert(!authMiddleware.includes('userId: session.user?.id || session.uId,\n                email: session.user?.email'), 'auth middleware tenant/store violations must not log raw user IDs or emails');
  assert(!authMiddleware.includes('email: session.user?.email,\n                tenantId: session.tId'), 'auth middleware tenant/store violations must not log raw emails or tenant IDs');
  assert(!authMiddleware.includes("session.user.platformRole !== options.requiredPlatformRole"), 'withAuth must not authorize from one conflicting platform-role alias');
  assert(!authMiddleware.includes('session.user.role !== options.requiredRole'), 'withAuth must not authorize from one conflicting store-role alias');

  assertIncludes(
    'src/app/api/auth/access-status/route.ts',
    [
      'withAuth',
      'checkAccessStatusRateLimit(request, session)',
      'getRateLimitForFeature("DATA_READ")',
      'checkRateLimit({',
      'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      'const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);',
      'const storeRateLimitHash = hashPublicRateLimitValue(storeId);',
      'key: `${ACCESS_STATUS_RATE_LIMIT_KEY}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`',
      '"Cache-Control", "private, no-store, max-age=0"',
      '"X-Content-Type-Options", "nosniff"',
      'failClosedOnProviderError: true',
      'rateLimit.reason === "provider_unavailable"',
      '"X-RateLimit-Limit": String(rateLimitConfig.limit)',
      'logger.security("Rate Limit Exceeded - Session Access Check"',
      'getBoundedSecurityRouteContext(session, request)',
      'getBoundedRuntimeStringContext("tenantId", tenantId)',
      'getBoundedRuntimeStringContext("storeId", storeId)',
      'getCurrentUserSnapshot(session)',
      'const userId = resolveCurrentSessionUserDocumentId(session);',
      'getUniqueAuthUserByEmailFromCollection(',
      'getEntityData(DB_COLLECTIONS.TENANTS',
      'getEntityData(DB_COLLECTIONS.STORES',
      'isPlatformAccessSession(session, userData)',
      'return invalidAccess(request, session, "TENANT_NOT_FOUND"',
      'return invalidAccess(request, session, "STORE_NOT_FOUND"',
      'if (!platformAccessSession && store.data && !tenant.documentId)',
      'return invalidAccess(request, session, "STORE_TENANT_MISMATCH"',
      'isAccessStatusStoreOwnedByTenant(store.data, tenant.documentId)',
      'return invalidAccess(request, session, "SESSION_REVOKED"',
    ],
    'session access-status read limiter and access boundary',
  );
  assertOrder(
    'src/app/api/auth/access-status/route.ts',
    [
      'checkAccessStatusRateLimit(request, session)',
      'getCurrentUserSnapshot(session)',
      'getEntityData(DB_COLLECTIONS.TENANTS',
      'getEntityData(DB_COLLECTIONS.STORES',
    ],
    'session access-status read limiter before Firestore reads',
  );
  const accessStatusRoute = read('src/app/api/auth/access-status/route.ts');
  assert(!accessStatusRoute.includes('key: `${ACCESS_STATUS_RATE_LIMIT_KEY}:${userId}:${tenantId}:${storeId}`'), 'access-status route must not store raw user/tenant/store IDs in rate-limit keys');
  assert(!accessStatusRoute.includes('tenantId: userData.tenantId'), 'access-status route must not log raw tenant IDs');
  assert(!accessStatusRoute.includes('storeId: userData.storeId'), 'access-status route must not log raw store IDs');
  assert(!accessStatusRoute.includes('buildSecurityContext'), 'access-status route must not spread raw session security context into security logs');
  assert(!accessStatusRoute.includes('const userId = session?.uId || session?.user?.id;'), 'access-status route must not select the first conflicting session user alias');
  assert(!accessStatusRoute.includes('.limit(1)'), 'access-status route must not select an arbitrary persisted email identity');
  assert(accessStatusRoute.includes('documentId === rawDocumentId && isValidFirestoreDocumentId(documentId)'), 'access-status route must reject whitespace-mutated user/tenant/store document IDs before Firestore reads');
  assert(accessStatusRoute.includes('resolveAccessStatusPreferredScope('), 'access-status route must reconcile persisted and session scope aliases');
  assert(accessStatusRoute.includes('isAccessStatusEntityIdentityConsistent('), 'access-status route must reconcile tenant/store embedded identity aliases');
  assert(accessStatusRoute.includes('isAccessStatusStoreOwnedByTenant('), 'access-status route must compare every persisted store tenant alias to the checked tenant');
  assert(accessStatusRoute.includes('if (!platformAccessSession && store.data && !tenant.documentId)'), 'access-status route must fail non-platform store-scoped sessions that omit tenant context');
  assertOrder(
    'src/app/api/auth/access-status/route.ts',
    [
      'return invalidAccess(request, session, "TENANT_NOT_FOUND"',
      'return invalidAccess(request, session, "STORE_NOT_FOUND"',
      'return invalidAccess(request, session, "STORE_TENANT_MISMATCH"',
      'return invalidAccess(request, session, "SESSION_REVOKED"',
    ],
    'access-status route must prove referenced tenant/store existence and ownership before revocation success',
  );

  assertIncludes(
      'src/lib/permissions/scopeDocumentId.ts',
      [
      "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
      'export function normalizeStorePermissionScopeDocumentId(',
      'export function resolveStorePermissionSessionScope(',
      'normalized.every((scope) => scope?.numericId === first.numericId)',
      'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
    ],
    'store permission scope document ID helper',
  );
  assertIncludes(
      'src/lib/permissions/server.ts',
      [
      'resolveStorePermissionSessionScope,',
      'const sessionScope = resolveStorePermissionSessionScope(session);',
      'const { storeScope, tenantScope } = sessionScope;',
      'const storeScope = normalizeStorePermissionScopeDocumentId(storeId);',
      'tenantId ?? sessionScope?.tenantScope.documentId',
      '.doc(storeScope.documentId)',
      'export async function requireAnyStorePermissionForStore',
      'isStorePermissionDataInScope(storeData, storeScope, tenantScope)',
      'import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";',
      'const isStorePermissionTargetBlocked = (storeData: any): boolean => (',
      'storeData?.active === false',
      'storeData?.deleted === true',
      'isPlatformEntityBlocked(storeData)',
      'normalizeStorePermissionScopeDocumentId(store?.storeId)?.numericId === storeScope.numericId',
      'if (isPlatformSession(session)) return null;',
      'requireAnyStorePermissionForStoreData',
      'Authorization Failed - Permission Required',
    ],
    'store permission helper',
  );
  const permissionsServerHelper = read('src/lib/permissions/server.ts');
  assert(!permissionsServerHelper.includes('.doc(String(storeId))'), 'store permission helper must not build store refs from raw store IDs');
  assert(!permissionsServerHelper.includes('.doc(String(normalizedStoreId))'), 'store permission helper must not build store refs from loosely normalized store IDs');
  assert(!permissionsServerHelper.includes('const normalizedStoreId = Number(storeId);'), 'store permission helper must not coerce target store scope before document-ID validation');
  assert(!permissionsServerHelper.includes('const normalizedTenantId = Number(tenantId);'), 'store permission helper must not coerce target tenant scope before document-ID validation');

  assertIncludes(
    '__docs__/roles-permissions/roles-permissions_impl.md',
    [
      'Server-side permission guards in `src/lib/permissions/server.ts`',
      '`normalizeStorePermissionScopeDocumentId()` validates session and explicit tenant/store scope',
      'before `stores/{storeId}` permission reads',
    ],
    'roles implementation store permission document-ID boundary',
  );
  assertIncludes(
    '__docs__/roles-permissions/roles-permissions_firebase.md',
    [
      'July 6 store permission scope document-ID boundary is Firebase-cost neutral',
      '`normalizeStorePermissionScopeDocumentId()` rejects malformed',
    ],
    'roles Firebase store permission document-ID boundary',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'Store Permission Scope Document ID Boundary checkpoint',
      'normalizeStorePermissionScopeDocumentId()',
      'raw `doc(String(storeId))` exclusion',
    ],
    'production audit store permission document-ID boundary',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Store Permission Scope Document ID Boundary',
      'Shared store-permission scope is guarded',
      'normalizeStorePermissionScopeDocumentId()',
    ],
    'primary changelog store permission document-ID boundary',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Store Permission Scope Document ID Boundary',
      'Shared store-permission scope is guarded',
      'normalizeStorePermissionScopeDocumentId()',
    ],
    'mirrored changelog store permission document-ID boundary',
  );

  assertIncludes(
    'src/lib/ai-menu-manager/apiGuards.ts',
    [
      'resolveAiMenuManagerSelectedStoreScope',
      'const sessionScope = resolveStorePermissionSessionScope(session);',
      'normalizeAiMenuManagerScopeDocumentId(sessionScope?.tenantScope.documentId)',
      'normalizeAiMenuManagerScopeDocumentId(sessionScope?.storeScope.documentId)',
      'const selectedStoreScope = hasRequestedStoreId',
      'normalizeAiMenuManagerScopeDocumentId(requestedStoreId)',
      'canUserAccessStore({ sessionUser, storeId: selectedStoreScope.numericId })',
      'Tenant Access Violation - AI Menu Manager Store Scope',
      'getBoundedSecurityRouteContext',
      "getBoundedSecurityStringContext('attemptedStoreId', selectedStoreId)",
      "getBoundedSecurityStringContext('sessionStoreId', sId)",
      'ensureAiMenuManagerTenantAccess',
      'verifyTenantAccess(session, tenantScope.documentId, storeScope.documentId, request)',
      'const userRateLimitHash = hashPublicRateLimitValue(userId || \'unknown\');',
      'const tenantRateLimitHash = hashPublicRateLimitValue(tId || \'_\');',
      'const storeRateLimitHash = hashPublicRateLimitValue(sId || \'_\');',
      'key: `${params.keyPrefix}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`',
      "getBoundedSecurityStringContext('storeId', sId)",
      "getBoundedSecurityStringContext('tenantId', tId)",
      "getBoundedSecurityStringContext('userId', userId)",
    ],
    'AI Menu Manager selected-store scope guard',
  );
  const aiMenuManagerApiGuards = read('src/lib/ai-menu-manager/apiGuards.ts');
  assert(!aiMenuManagerApiGuards.includes('session?.tId || session?.user?.tenantId'), 'AI Menu Manager API guards must not select one session tenant alias');
  assert(!aiMenuManagerApiGuards.includes('session?.sId || session?.user?.storeId'), 'AI Menu Manager API guards must not select one session store alias');
  assert(!aiMenuManagerApiGuards.includes('key: `${params.keyPrefix}:${userId || \'unknown\'}:${tId || \'_\'}:${sId || \'_\'}`'), 'AI Menu Manager API guards must not store raw user/tenant/store IDs in rate-limit keys');
  assert(!aiMenuManagerApiGuards.includes('attemptedStoreId: selectedStoreId'), 'AI Menu Manager API guards must not raw-log selected-store violation store IDs');
  assert(!aiMenuManagerApiGuards.includes('sessionStoreId: sId'), 'AI Menu Manager API guards must not raw-log selected-store violation session store IDs');
  assert(!aiMenuManagerApiGuards.includes('storeId: sId,\n        tenantId: tId,\n        userId,'), 'AI Menu Manager API guards must not raw-log rate-limit scope IDs');
  assert(!aiMenuManagerApiGuards.includes('buildSecurityContext'), 'AI Menu Manager API guards must not spread raw security context into guard security logs');
}

function verifyOwnerSelectedScopeRoutes() {
  assertIncludes(
    'src/app/api/ai-menu-manager/command/route.ts',
    [
      'withAuth',
      'readBoundedJsonBody',
      'AiMenuManagerCommandRequestSchema.safeParse',
      'resolveAiMenuManagerSelectedStoreScope(request, session, parsed.data.storeId)',
      'requireAnyStorePermissionForStore(',
      'getAiMenuManagerProject({',
      'tId: scope.tId',
      'sId: scope.sId',
    ],
    'AI Menu Manager command tenant scope',
  );
  assertOrder(
    'src/app/api/ai-menu-manager/command/route.ts',
    [
      'applyAiMenuManagerRateLimit({',
      'readBoundedJsonBody(request, AI_MENU_MANAGER_COMMAND_MAX_BODY_BYTES',
      'AiMenuManagerCommandRequestSchema.safeParse(bodyResult.data)',
      'resolveAiMenuManagerSelectedStoreScope(request, session, parsed.data.storeId)',
      'getAiMenuManagerProject({',
    ],
    'AI Menu Manager command rate/body/scope ordering',
  );

  [
    {
      route: 'src/app/api/ai-menu-manager/proposals/[proposalId]/actions/route.ts',
      cap: 'AI_MENU_MANAGER_PROPOSAL_ACTION_MAX_BODY_BYTES',
      schema: 'AiMenuManagerProposalActionSchema.safeParse(bodyResult.data)',
    },
    {
      route: 'src/app/api/ai-menu-manager/proposals/[proposalId]/complete/route.ts',
      cap: 'AI_MENU_MANAGER_PROPOSAL_COMPLETE_MAX_BODY_BYTES',
      schema: 'AiMenuManagerProposalCompleteSchema.safeParse(bodyResult.data)',
    },
  ].forEach(({ route, cap, schema }) => {
    assertIncludes(
      route,
      [
        'withAuth',
        'normalizeAiMenuManagerProposalId(params?.proposalId)',
        'readBoundedJsonBody',
        'resolveAiMenuManagerSelectedStoreScope(request, session, parsed.data.storeId)',
        'requireAnyStorePermissionForStore(',
        'String(proposal.tId) !== String(scope.tId) || String(proposal.sId) !== String(scope.sId)',
        'proposal.projectId && String(proposal.projectId) !== String(parsed.data.projectId || \'\')',
      ],
      `${route} tenant scope`,
    );
    assertOrder(
      route,
      [
        'normalizeAiMenuManagerProposalId(params?.proposalId)',
        'applyAiMenuManagerRateLimit({',
        'getAiMenuManagerProposal(proposalId)',
      ],
      `${route} route proposal id ordering`,
    );
    assertOrder(
      route,
      [
        'applyAiMenuManagerRateLimit({',
        `readBoundedJsonBody(request, ${cap}`,
        schema,
        'resolveAiMenuManagerSelectedStoreScope(request, session, parsed.data.storeId)',
        'getAiMenuManagerProposal(proposalId)',
      ],
      `${route} rate/body/scope ordering`,
    );
  });
  assertIncludes(
    'src/app/api/ai-menu-manager/proposals/[proposalId]/actions/route.ts',
    [
      'logRuntimeFailure',
      'getBoundedRuntimeStringContext',
      'ai_menu_manager_proposal_status_update_failed',
      'ai_menu_manager_proposal_approval_failed',
      'getProposalActionLogContext()',
    ],
    'AI Menu Manager proposal action bounded diagnostics',
  );
  {
    const actionRoute = read('src/app/api/ai-menu-manager/proposals/[proposalId]/actions/route.ts');
    assert(!actionRoute.includes("secureError('[AI Menu Manager] Proposal status update failed'"), 'AI Menu Manager proposal action must not raw-log status update failures');
    assert(!actionRoute.includes('catch {'), 'AI Menu Manager proposal action must not silently swallow approval failures');
  }

  assertIncludes(
    'src/app/api/ai-menu-manager/sessions/[sessionId]/route.ts',
    [
      'withAuth',
      'normalizeAiMenuManagerSessionId(params?.sessionId)',
      "normalizeAiMenuManagerProjectId(request.nextUrl.searchParams.get('projectId'))",
      'resolveAiMenuManagerSelectedStoreScope(request, session, storeId)',
      'requireAnyStorePermissionForStore(',
      'getAiMenuManagerInbox({',
      'tId: scope.tId',
      'sId: scope.sId',
    ],
    'AI Menu Manager session tenant scope',
  );
  assertOrder(
    'src/app/api/ai-menu-manager/sessions/[sessionId]/route.ts',
    [
      'normalizeAiMenuManagerSessionId(params?.sessionId)',
      "normalizeAiMenuManagerProjectId(request.nextUrl.searchParams.get('projectId'))",
      'resolveAiMenuManagerSelectedStoreScope(request, session, storeId)',
      'getAiMenuManagerInbox({',
    ],
    'AI Menu Manager session route id ordering',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'AI Menu Manager route ID boundary checkpoint',
      'src/lib/ai-menu-manager/routeIds.ts',
      'getAiMenuManagerInbox()',
      'getAiMenuManagerProposal()',
    ],
    'AI Menu Manager route ID audit evidence',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'AI Menu Manager Route ID Boundary',
      'AMM fallback IDs are shape-checked before reads',
    ],
    'AI Menu Manager route ID primary changelog evidence',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'AI Menu Manager Route ID Boundary',
      'AMM fallback IDs are shape-checked before reads',
    ],
    'AI Menu Manager route ID lowercase changelog evidence',
  );

  const aiMenuManagerServerRepo = read('src/database/aiMenuManager/server.ts');
  [
    'normalizeAiMenuManagerSessionId(sessionId)',
    'normalizeAiMenuManagerProposalId(proposalId)',
    'normalizeAiMenuManagerProjectId(params.projectId)',
    'normalizeAiMenuManagerScopeDocumentId(params.tId)',
    'normalizeAiMenuManagerScopeDocumentId(params.sId)',
    'requireAiMenuManagerScopeDocumentIds(params)',
    '.doc(scope.tId)',
    '.collection(scope.sId)',
    'requireSessionRef(params.sessionId)',
    'requireProposalRef(params.proposal.proposalId)',
    '.map((entry) => normalizeAiMenuManagerProposalId(entry.proposalId))',
    'const sessionSnap = sessionRef ? await transaction.get(sessionRef) : null;',
  ].forEach((needle) => {
    assert(aiMenuManagerServerRepo.includes(needle), `AI Menu Manager server DAL ID boundary missing: ${needle}`);
  });
  assert(!aiMenuManagerServerRepo.includes('.doc(sessionId)'), 'AI Menu Manager server DAL must not directly pass sessionId into Firestore doc refs');
  assert(!aiMenuManagerServerRepo.includes('.doc(proposalId)'), 'AI Menu Manager server DAL must not directly pass proposalId into Firestore doc refs');
  assert(!aiMenuManagerServerRepo.includes('.doc(params.projectId)'), 'AI Menu Manager server DAL must not directly pass params.projectId into Firestore doc refs');
  assert(!aiMenuManagerServerRepo.includes('collection(`${DB_COLLECTIONS.PROJECTS}/${params.tId}/${params.sId}`)'), 'AI Menu Manager server DAL must not build scoped project paths from raw tenant/store params');
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'AI Menu Manager server DAL ID boundary checkpoint',
      'src/database/aiMenuManager/server.ts',
      'stored malformed proposal-summary IDs',
    ],
    'AI Menu Manager server DAL ID audit evidence',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'AI Menu Manager Scope Document ID Boundary checkpoint',
      'normalizeAiMenuManagerScopeDocumentId()',
      'scoped project refs',
    ],
    'AI Menu Manager scope document-ID audit evidence',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'AI Menu Manager Server DAL ID Boundary',
      'AMM server DAL normalizes IDs before document refs',
    ],
    'AI Menu Manager server DAL ID primary changelog evidence',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'AI Menu Manager Scope Document ID Boundary',
      'AMM tenant/store scope is guarded',
    ],
    'AI Menu Manager scope document-ID primary changelog evidence',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'AI Menu Manager Server DAL ID Boundary',
      'AMM server DAL normalizes IDs before document refs',
    ],
    'AI Menu Manager server DAL ID lowercase changelog evidence',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'AI Menu Manager Scope Document ID Boundary',
      'AMM tenant/store scope is guarded',
    ],
    'AI Menu Manager scope document-ID lowercase changelog evidence',
  );
}

function verifyCallerSuppliedTenantStoreRoutes() {
  [
    'src/app/api/pos-sync/deliver/route.ts',
    'src/app/api/pos-sync/test/route.ts',
  ].forEach((route) => {
    assertIncludes(
      route,
      [
        'withAuth',
        'requireAnyStorePermissionForStoreData',
        'readBoundedJsonBody',
        'validateAPIInput(schema, bodyResult.data)',
        'const { storeId, tenantId',
        'const tenantScope = normalizePosSyncNumericDocumentId(tenantId);',
        'const storeScope = normalizePosSyncNumericDocumentId(storeId);',
        'verifyTenantAccess(session, tenantId, storeId, request)',
        'checkRateLimit',
        'const storeRateLimitHash = hashPublicRateLimitValue(`${tenantDocumentId}:${storeDocumentId}`);',
        'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId);',
        'const storeDoc = await storeRef.get();',
        'const targetPermissionError = requireAnyStorePermissionForStoreData(',
        'if (targetPermissionError) return targetPermissionError;',
        'validatePosSyncWebhookUrl',
        'validatePosSyncWebhookNetworkTarget',
        'signPayload',
      ],
      `${route} tenant and provider boundary`,
    );
  });
  assertIncludes(
    'src/app/api/pos-sync/deliver/route.ts',
    [
      'key: `pos-deliver:${storeRateLimitHash}`',
      "projectId: z.string().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/).refine(isValidFirestoreDocumentId, 'Invalid project ID'),",
    ],
    'POS delivery hashed store limiter key and strict project ID schema',
  );
  assert(!read('src/app/api/pos-sync/deliver/route.ts').includes('projectId: z.string().trim()'), 'POS delivery must not trim project IDs before validation');
  assertIncludes(
    'src/app/api/pos-sync/test/route.ts',
    [
      'key: `pos-test:${storeRateLimitHash}`',
    ],
    'POS test hashed store limiter key',
  );
  assert(!read('src/app/api/pos-sync/deliver/route.ts').includes('key: `pos-deliver:${storeId}`'), 'POS delivery must not store raw store IDs in rate-limit keys');
  assert(!read('src/app/api/pos-sync/test/route.ts').includes('key: `pos-test:${storeId}`'), 'POS test must not store raw store IDs in rate-limit keys');
  [
    'src/app/api/pos-sync/deliver/route.ts',
    'src/app/api/pos-sync/test/route.ts',
  ].forEach((route) => {
    const source = read(route);
    assert(!source.includes('hashPublicRateLimitValue(storeId)'), `${route} must hash normalized POS store document IDs`);
    assert(!source.includes('doc(String(storeId))'), `${route} must not build POS store refs from raw store IDs`);
    assert(!source.includes('storeId: z.number().positive()'), `${route} must require integer POS store IDs`);
    assert(!source.includes('tenantId: z.number().positive()'), `${route} must require integer POS tenant IDs`);
  });

  assertIncludes(
    'src/app/api/menu-extraction/jobs/route.ts',
    [
      'withAuth',
      'RequestSchema.safeParse',
      'parseProjectIds(projectId)',
      'requireAnyStorePermission',
      'PERMISSIONS.USE_MENU_EXTRACTION',
      'checkSafeMode()',
      'verifyTenantAccess(session, ids.tId, ids.sId, request)',
      'const userRateLimitHash = hashPublicRateLimitValue(ids.uId);',
      'const tenantRateLimitHash = hashPublicRateLimitValue(ids.tId);',
      'const storeRateLimitHash = hashPublicRateLimitValue(ids.sId);',
      'key: `menu-extraction-job-request:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`',
      'isAllowedProjectUploadUrl(file.url, ids)',
      'buildOwnerUploadSourceFingerprint',
      'const MenuExtractionJobIdSchema = z.string()',
      'normalizeMenuExtractionJobId(value) === value',
      'retriedFromJobId: MenuExtractionJobIdSchema.optional()',
      'function requireMenuExtractionRetryJobId(value: unknown): string',
      'const retriedFromJobId = requireMenuExtractionRetryJobId(params.retriedFromJobId);',
      '.doc(retriedFromJobId)',
      'key: `menu-extraction-job:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`',
      'getRateLimitForFeature("AI_EXPENSIVE")',
      'buildMenuExtractionRoutingFields(buildProjectMenuExtractionDestination(',
    ],
    'menu extraction job tenant, upload, and cost boundary',
  );
  const menuExtractionJobRoute = read('src/app/api/menu-extraction/jobs/route.ts');
  assert(!menuExtractionJobRoute.includes('key: `menu-extraction-job-request:${ids.uId}:${ids.tId}:${ids.sId}`'), 'menu extraction request gate must not store raw user/tenant/store IDs in rate-limit keys');
  assert(!menuExtractionJobRoute.includes('key: `menu-extraction-job:${ids.uId}:${ids.tId}:${ids.sId}`'), 'menu extraction AI gate must not store raw user/tenant/store IDs in rate-limit keys');
  assert(!menuExtractionJobRoute.includes('retriedFromJobId: z.string().min(1).max(160).optional()'), 'menu extraction retry job IDs must not use loose string schema');
  assert(!menuExtractionJobRoute.includes('.doc(params.retriedFromJobId)'), 'menu extraction retry job reads must not use raw retry job IDs');
  assertIncludes(
    'src/lib/menu-extraction/jobIdBoundary.ts',
    [
      'MENU_EXTRACTION_JOB_ID_PATTERN = /^[A-Za-z0-9]{20}$/',
      'documentId === value',
      'isValidFirestoreDocumentId(documentId)',
      'normalizeMenuExtractionJobId',
    ],
    'menu extraction strict retry job ID boundary helper',
  );
  assertOrder(
    'src/app/api/menu-extraction/jobs/route.ts',
    [
      'const validation = RequestSchema.safeParse(bodyResult.data);',
      'const projectIds = parseProjectIds(projectId);',
      'const permissionResponse = await requireAnyStorePermission(',
      '[PERMISSIONS.USE_MENU_EXTRACTION]',
      'if (validation.data.retriedFromJobId) {',
      'retryContext = await loadRetryContext({',
      'retriedFromJobId: validation.data.retriedFromJobId',
    ],
    'menu extraction retry job ID schema boundary before original job read',
  );
  assertOrder(
    'src/app/api/menu-extraction/jobs/route.ts',
    [
      'function requireMenuExtractionRetryJobId(value: unknown): string',
      'const retriedFromJobId = requireMenuExtractionRetryJobId(params.retriedFromJobId);',
      '.doc(retriedFromJobId)',
    ],
    'menu extraction retry loader normalizes retry job ID before original job read',
  );
  assertIncludes(
    'src/lib/firebase/menuProcessing.ts',
    [
      'MENU_PROCESSING_JOB_START_REQUEST_POLICY',
      "cache: 'no-store'",
      "credentials: 'same-origin'",
      "redirect: 'manual'",
      '...MENU_PROCESSING_JOB_START_REQUEST_POLICY',
    ],
    'menu extraction job browser request policy',
  );

  assertIncludes(
    'src/app/api/menu-intake-identity/route.ts',
    [
      'withAuth',
      'checkSafeMode()',
      'normalizeMenuIntakeScopeDocumentId',
      'const tenantScope = normalizeMenuIntakeScopeDocumentId(ids.tId);',
      'const storeScope = normalizeMenuIntakeScopeDocumentId(ids.sId);',
      'verifyTenantAccess(session, tenantScope.documentId, storeScope.documentId, request)',
      'const userRateLimitHash = hashPublicRateLimitValue(ids.uId);',
      'const tenantRateLimitHash = hashPublicRateLimitValue(tenantScope.documentId);',
      'const storeRateLimitHash = hashPublicRateLimitValue(storeScope.documentId);',
      'key: `menu-intake:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`',
      'readBoundedJsonBody(request, MENU_INTAKE_IDENTITY_MAX_BODY_BYTES)',
      'IntakeRequestSchema.safeParse(bodyResult.data)',
      'requireAnyStorePermission',
      'PERMISSIONS.USE_MENU_EXTRACTION',
    ],
    'menu intake identity hashed limiter and bounded body guard',
  );
  assert(!read('src/app/api/menu-intake-identity/route.ts').includes('key: `menu-intake:${ids.uId}:${ids.tId}:${ids.sId}`'), 'menu intake identity must not store raw user/tenant/store IDs in rate-limit keys');
  assert(!read('src/app/api/menu-intake-identity/route.ts').includes('verifyTenantAccess(session, ids.tId, ids.sId, request)'), 'menu intake identity must not verify raw session scope after normalization');
  assert(!read('src/app/api/menu-intake-identity/route.ts').includes('hashPublicRateLimitValue(ids.tId)'), 'menu intake identity must hash normalized tenant document IDs');
  assert(!read('src/app/api/menu-intake-identity/route.ts').includes('hashPublicRateLimitValue(ids.sId)'), 'menu intake identity must hash normalized store document IDs');
  assertOrder(
    'src/app/api/menu-intake-identity/route.ts',
    [
      'const validation = IntakeRequestSchema.safeParse(bodyResult.data);',
      'const permissionResponse = await requireAnyStorePermission(',
      '[PERMISSIONS.USE_MENU_EXTRACTION]',
      'runMenuIntakeIdentityCheck({',
    ],
    'menu intake identity requires current persisted extraction permission before provider work',
  );
  assertIncludes(
    'src/lib/menu-extraction/menuIntakeIdentityServer.ts',
    [
      'export function normalizeMenuIntakeScopeDocumentId(value: unknown): MenuIntakeScopeDocumentId | null {',
      'raw !== raw.trim() || !isValidFirestoreDocumentId(raw)',
      'Number.isSafeInteger(numericId)',
      'String(numericId) !== raw',
      '.doc(tenantScope.documentId)',
      '.collection(storeScope.documentId)',
      'firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId)',
    ],
    'menu intake identity helper scope document ID guard',
  );
  assert(!read('src/lib/menu-extraction/menuIntakeIdentityServer.ts').includes('.doc(String(params.sId))'), 'menu intake identity helper must not build store refs from raw params.sId');
  assertIncludes(
    'src/lib/menu-intake-identity/client.ts',
    [
      'MENU_INTAKE_IDENTITY_REQUEST_POLICY',
      'cache: "no-store"',
      'credentials: "same-origin"',
      'redirect: "manual"',
      '...MENU_INTAKE_IDENTITY_REQUEST_POLICY',
    ],
    'menu intake identity browser request policy',
  );

  assertIncludes(
    'src/app/api/menu-link-imports/route.ts',
    [
      'withAuth',
      'FEATURE_FLAGS.ENABLE_MENU_LINK_IMPORT',
      'checkSafeMode()',
      'verifyTenantAccess(session, ids.tId, ids.sId, request)',
      'const userRateLimitHash = hashPublicRateLimitValue(ids.uId);',
      'const tenantRateLimitHash = hashPublicRateLimitValue(ids.tId);',
      'const storeRateLimitHash = hashPublicRateLimitValue(ids.sId);',
      'key: `menu-link-import:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`',
      'readBoundedJsonBody(request, MENU_LINK_IMPORT_MAX_BODY_BYTES)',
      'RequestSchema.safeParse(bodyResult.data)',
      'requireAnyStorePermission',
      'PERMISSIONS.USE_MENU_EXTRACTION',
      'MENU_LINK_IMPORT_STORAGE_CLEANUP_FAILED',
      'createOrReuseActiveMenuExtractionJob',
      'additionalCreates: [{ data: artifactData, ref: artifactRef }]',
      'deleteMenuLinkImportStoragePath',
    ],
    'menu link import hashed limiter and bounded body guard',
  );
  assertIncludes(
    'src/lib/menu-extraction/activeJobClaim.ts',
    [
      'additionalCreates?: ReadonlyArray',
      'return params.db.runTransaction(async (transaction) => {',
      'transaction.create(jobRef, params.jobData);',
      'transaction.create(additionalCreate.ref, additionalCreate.data);',
    ],
    'menu link import atomically creates artifact metadata with the extraction job',
  );
  const menuLinkImportRoute = read('src/app/api/menu-link-imports/route.ts');
  assertOrder(
    'src/app/api/menu-link-imports/route.ts',
    [
      'const validation = RequestSchema.safeParse(bodyResult.data);',
      'const permissionResponse = await requireAnyStorePermission(',
      '[PERMISSIONS.USE_MENU_EXTRACTION]',
      'const projectDoc = await projectRef.get();',
      'const acquisition = await acquireMenuLinkSource(',
    ],
    'menu link import requires current persisted extraction permission before project and provider work',
  );
  assert(!menuLinkImportRoute.includes('key: `menu-link-import:${ids.uId}:${ids.tId}:${ids.sId}`'), 'menu link import must not store raw user/tenant/store IDs in rate-limit keys');
  assert(!menuLinkImportRoute.includes('Promise.allSettled(createdStoragePaths.map((path) => storageAdmin.bucket().file(path).delete'), 'menu link import must not silently swallow storage cleanup failures');
  assert(!menuLinkImportRoute.includes('artifactRef.set('), 'menu link import must not create artifact metadata outside the active-job transaction');
  assertIncludes(
    'src/app/api/menu-link-imports/route.ts',
    [
      'async function persistMenuLinkImportCleanupRecord(',
      'await artifactRef.create(artifactData);',
      'menu_link_import_cleanup_record_failed',
    ],
    'menu link import failed-storage-cleanup recovery record',
  );
  assertIncludes(
    'src/lib/menu-link-import/client.ts',
    [
      'MENU_LINK_IMPORT_REQUEST_POLICY',
      "cache: 'no-store'",
      "credentials: 'same-origin'",
      "redirect: 'manual'",
      '...MENU_LINK_IMPORT_REQUEST_POLICY',
    ],
    'menu link import browser request policy',
  );

  assertIncludes(
    'src/app/api/projects/master-job-status/route.ts',
    [
      'withAuth',
      'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
      'resolveStorePermissionSessionScope,',
      'querySchema.safeParse',
      '.refine(isValidFirestoreDocumentId, "Invalid project ID")',
      'const sessionScope = resolveStorePermissionSessionScope(session);',
      'sessionScope.tenantScope.numericId !== tenantId',
      '!verifyTenantAccess(session, tenantId, sessionScope.storeScope.numericId, request)',
      'const sessionStoreId = sessionScope.storeScope.numericId;',
      'db.doc(`${DB_COLLECTIONS.STORES}/${sessionScope.storeScope.documentId}`)',
      'Number(sessionStore?.tenantId) !== tenantId',
      'requireAnyStorePermissionForStoreData(',
      'if (sessionStoreId !== masterStoreId) {',
      'outletRef.tId !== tenantId || outletRef.sId !== sessionStoreId',
      'getMasterJobStatusRouteLogContext',
      'master_job_status_route_failed',
      'getRateLimitForFeature("DATA_READ")',
      'checkRateLimit({',
      'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      'const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);',
      'const storeRateLimitHash = hashPublicRateLimitValue(storeId);',
      'key: `${MASTER_JOB_STATUS_RATE_LIMIT_KEY}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`',
      '"X-RateLimit-Limit": String(rateLimitConfig.limit)',
      "getBoundedRuntimeStringContext(\"masterProjectId\", request.nextUrl.searchParams.get(\"masterProjectId\"))",
      "getBoundedRuntimeStringContext(\"outletProjectId\", request.nextUrl.searchParams.get(\"outletProjectId\"))",
    ],
    'master job status tenant boundary',
  );
  const masterJobStatusRoute = read('src/app/api/projects/master-job-status/route.ts');
  assert(!masterJobStatusRoute.includes('const projectIdSchema = z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/);'), 'master job status route must not keep regex-only project ID validation');
  assert(!masterJobStatusRoute.includes('const sessionStoreId = Number(session.sId || session.user?.storeId);'), 'master job status route must not coerce session store IDs before document access');
  assert(!masterJobStatusRoute.includes('session.sId ?? session.user?.storeId'), 'master job status route must not select one session store alias while ignoring a contradictory alias');
  assert(!masterJobStatusRoute.includes('normalizeMasterJobStatusSessionDocumentId'), 'master job status route must use the shared authenticated session-scope resolver');
  assert(!masterJobStatusRoute.includes('db.doc(`${DB_COLLECTIONS.STORES}/${sessionStoreId}`)'), 'master job status route must not build store refs from numeric-coerced session store IDs');
  assert(!masterJobStatusRoute.includes('sessionStoreId !== masterStoreId && sessionStore?.isMaster !== true'), 'master job status route must not let master stores query other stores without an outlet link');
  assert(!masterJobStatusRoute.includes('key: `${MASTER_JOB_STATUS_RATE_LIMIT_KEY}:${userId}:${tenantId}:${storeId}`'), 'master job status route must not store raw user/tenant/store IDs in rate-limit keys');
  assertOrder(
    'src/app/api/projects/master-job-status/route.ts',
    [
      'applyMasterJobStatusRateLimit(session)',
      'querySchema.safeParse',
      'const sessionStoreSnap = await db.doc',
      '.collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS)',
    ],
    'master job status read limiter before validation and Firestore reads',
  );
  assert(!masterJobStatusRoute.includes('secureError("[Projects] Master job status failed"'), 'master job status route must not raw-log route failures');
  assert(!masterJobStatusRoute.includes('tenantId: session?.tId'), 'master job status route must not log raw tenant IDs');
  assert(!masterJobStatusRoute.includes('storeId: session?.sId'), 'master job status route must not log raw store IDs');
  assertIncludes(
    '__docs__/multi-outlet-consistency/multi-outlet-consistency_firebase.md',
    [
      'Master job status store-link boundary',
      'Master job status project ID boundary',
      'Master job status session store ID boundary',
      'Only the store encoded in the master project id can query that master job directly',
      'other stores must present a linked outlet project whose `masterProjectId` matches',
      'session store scope must be an exact positive numeric Firestore document ID',
    ],
    'multi-outlet Firebase master job status store-link boundary',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'Master job status store-link boundary checkpoint',
      'Master job status project ID boundary checkpoint',
      'Master job status session store document-ID boundary checkpoint',
      '`src/app/api/projects/master-job-status/route.ts` now lets only the store encoded in `masterProjectId` query that master job directly',
      'all other stores must present an `outletProjectId` linked to the requested master project',
      'session store scope can no longer be numeric-coerced before the `stores/{sId}` read',
      '`npm run verify:menulist-api-tenant-safety` source-gates the explicit `sessionStoreId !== masterStoreId` branch',
    ],
    'production audit master job status store-link boundary evidence',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Master Job Status Store-Link Boundary',
      'Master Job Status Project ID Boundary',
      'Master Job Status Session Store ID Boundary',
      'Master job polling is store-bound',
      'Outlet polling still works through linked projects',
      'Whitespace-mutated session store IDs fail before the caller-store read',
      'npm run verify:menulist-api-tenant-safety',
    ],
    'primary changelog master job status store-link boundary entry',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Master Job Status Store-Link Boundary',
      'Master Job Status Project ID Boundary',
      'Master Job Status Session Store ID Boundary',
      'Master job polling is store-bound',
      'Outlet polling still works through linked projects',
      'Whitespace-mutated session store IDs fail before the caller-store read',
      'npm run verify:menulist-api-tenant-safety',
    ],
    'mirrored changelog master job status store-link boundary entry',
  );
  const masterJobStatusResponse = read('src/lib/multiOutlet/masterJobStatusResponse.ts');
  [
    'MASTER_JOB_STATUS_RESPONSE_JSON_MAX_BYTES = 8 * 1024',
    'ACTIVE_MASTER_JOB_STATUSES',
    'isActiveMasterJobStatus',
    'isMasterJobStatusResponse',
    "value.isMasterJobActive === false",
    "typeof value.masterJobId === 'string'",
    'value.masterJobId.trim().length > 0',
  ].forEach((token) => {
    assert(masterJobStatusResponse.includes(token), `master job status response guard missing ${token}`);
  });
  assertIncludes(
    'src/hooks/useMasterJobStatus.ts',
    [
      "import { getBoundedHookStringContext, logHookFailure } from '@hook/hookDiagnostics';",
      "import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';",
      'MASTER_JOB_STATUS_RESPONSE_JSON_MAX_BYTES',
      'isMasterJobStatusResponse',
      'readMasterJobStatusResponse',
      'master_job_status_response_rejected',
      'master_job_status_response_parse_failed',
	      'master_job_status_response_invalid',
	      'master_job_status_check_failed',
	      'MASTER_JOB_STATUS_REQUEST_POLICY',
	      "cache: 'no-store'",
	      "credentials: 'same-origin'",
	      "redirect: 'manual'",
	      '...MASTER_JOB_STATUS_REQUEST_POLICY',
	      "getBoundedHookStringContext('masterProjectId', masterProjectId)",
	      "getBoundedHookStringContext('outletProjectId', outletProjectId)",
	      'const unavailableMasterJobStatus = (): MasterJobStatus => ({',
	      'isMasterJobActive: true,',
	      'setStatus(unavailableMasterJobStatus());',
	    ],
    'master job status hook bounded diagnostics',
  );
  const masterJobStatusHook = read('src/hooks/useMasterJobStatus.ts');
  assert(!masterJobStatusHook.includes("logger.warn('[useMasterJobStatus] Status check failed'"), 'master job status hook must not use raw logger diagnostics');
  assert(!masterJobStatusHook.includes('error?.message || String(error)'), 'master job status hook must not log raw exception text');
  assert(!masterJobStatusHook.includes('const data = await response.json()'), 'master job status hook must not use direct unbounded response parsing');
  assert(!masterJobStatusHook.includes('.json().catch'), 'master job status hook must not silently swallow response parsing failures');
  assert(!masterJobStatusHook.includes('fail open'), 'master job status uncertainty must not unblock outlet editing');
}

function verifyPosSyncOwnerSafeFailureContract() {
  const posSyncEventBuilder = read('src/lib/posSync/eventBuilder.ts');

  [
    {
      route: 'src/app/api/pos-sync/deliver/route.ts',
      safeResponseNeedles: [
        'ownerError = POS_SYNC_CONNECTION_ISSUE_MESSAGE',
        'error: ownerError',
        'POS_SYNC_BLOCKED_WEBHOOK_TARGET',
        "getBoundedSecurityStringContext('networkError', networkValidation.error)",
      ],
    },
    {
      route: 'src/app/api/pos-sync/test/route.ts',
      safeResponseNeedles: [
        'error: POS_SYNC_CONNECTION_ISSUE_MESSAGE',
        'POS_SYNC_BLOCKED_WEBHOOK_TARGET',
        "getBoundedSecurityStringContext('networkError', networkValidation.error)",
      ],
    },
  ].forEach(({ route, safeResponseNeedles }) => {
    assertIncludes(
      route,
      [
        'POS_SYNC_CONNECTION_ISSUE_MESSAGE',
        "'posSync.lastError': POS_SYNC_CONNECTION_ISSUE_MESSAGE",
        'getBoundedSecurityStringContext',
        'logSecurityDiagnostic',
        'logSecurityFailure',
        ...safeResponseNeedles,
      ],
      `${route} owner-safe POS failure contract`,
    );
  });

  [
    ['src/app/api/pos-sync/deliver/route.ts', 'webhookValidation.error ||'],
    ['src/app/api/pos-sync/deliver/route.ts', '`HTTP ${response.status}`'],
    ['src/app/api/pos-sync/deliver/route.ts', "'Timeout (5s)'"],
    ['src/app/api/pos-sync/deliver/route.ts', "'Connection failed'"],
    ['src/app/api/pos-sync/deliver/route.ts', "'Unknown error'"],
    ['src/app/api/pos-sync/deliver/route.ts', "secureLog('[POS Sync]"],
    ['src/app/api/pos-sync/deliver/route.ts', "secureError('[POS Sync]"],
    ['src/app/api/pos-sync/test/route.ts', 'webhookValidation.error ||'],
    ['src/app/api/pos-sync/test/route.ts', '`Webhook returned ${response.status}`'],
    ['src/app/api/pos-sync/test/route.ts', "'Webhook timed out (5s)'"],
    ['src/app/api/pos-sync/test/route.ts', "'Could not reach webhook URL'"],
    ['src/app/api/pos-sync/test/route.ts', 'markConnectionIssue(errorMessage)'],
    ['src/app/api/pos-sync/test/route.ts', "secureLog('[POS Sync]"],
    ['src/app/api/pos-sync/test/route.ts', "secureError('[POS Sync]"],
  ].forEach(([route, rawSnippet]) => {
    assert(!read(route).includes(rawSnippet), `${route} must not expose or persist raw POS provider failure detail: ${rawSnippet}`);
  });

  assertIncludes(
    'src/components/mobile/screens/MobilePosSyncScreen.tsx',
    [
      'const POS_SYNC_CONNECTION_ISSUE_MESSAGE',
      'message: POS_SYNC_CONNECTION_ISSUE_MESSAGE',
      '<Text type="secondary">{POS_SYNC_CONNECTION_ISSUE_MESSAGE}</Text>',
      "lastError: enabled && !connectionChanged && currentPosSync.lastError ? POS_SYNC_CONNECTION_ISSUE_MESSAGE : ''",
      'mobile_pos_sync_settings_save_failed',
      'mobile_pos_sync_store_update_rejected',
      'mobile_pos_sync_secret_copy_failed',
      "getBoundedMobileOwnerStringContext('status', nextPosSync.status)",
      "action: 'rotate'",
      'hasWebhookSecret: Boolean(webhookSecret)',
      'webhookSecretLength: webhookSecret.length',
    ],
    'mobile POS sync owner-safe failure display',
  );
  [
    'message: data.error',
    "'Network error'",
    '{currentPosSync.lastError}</Text>',
  ].forEach((rawSnippet) => {
    assert(!read('src/components/mobile/screens/MobilePosSyncScreen.tsx').includes(rawSnippet), `mobile POS sync must not render raw failure detail: ${rawSnippet}`);
  });

  assertIncludes(
    'src/lib/posSync/eventBuilder.ts',
    [
      'POS_SYNC_DELIVERY_TRIGGER_FAILED',
      'POS_SYNC_DELIVERY_REQUEST_REJECTED',
      'logSecurityFailure(',
      "getBoundedSecurityStringContext('storeId', storeId)",
      "getBoundedSecurityStringContext('tenantId', tenantId)",
      "getBoundedSecurityStringContext('projectId', projectId)",
      "cache: 'no-store'",
      "credentials: 'same-origin'",
      "redirect: 'manual'",
      'if (!response.ok)',
      'throw createPosSyncDeliveryError(POS_SYNC_DELIVERY_REQUEST_REJECTED, response.status)',
    ],
    'POS sync debounced delivery trigger uses bounded diagnostics',
  );
  [
    'createDeliveryJob(storeId, tenantId, projectId).catch(() =>',
    '// Silent failure',
    '// Silent — POS sync failures never surface to the owner',
  ].forEach((rawSnippet) => {
    assert(!posSyncEventBuilder.includes(rawSnippet), `POS sync debounced delivery must not silently swallow failures: ${rawSnippet}`);
  });
  assert(!posSyncEventBuilder.includes('if (!posSync?.webhookSecret) return;'), 'POS sync debounce must not depend on a browser-readable signing secret');
}

function verifyPosSyncWebhookNetworkGuard() {
  assertIncludes(
    'src/lib/posSync/webhookUrl.ts',
    [
      'export function isBlockedPosSyncNetworkTarget',
      'export function isBlockedHostname',
      'export function isPrivateIpv4',
      'export function isPrivateIpv6',
    ],
    'POS sync shared webhook URL network target helpers',
  );

  assertIncludes(
    'src/lib/posSync/serverWebhookTarget.ts',
    [
      "import { lookup } from 'dns/promises';",
      'validatePosSyncWebhookNetworkTarget',
      'lookup(hostname, { all: true, verbatim: true })',
      'isBlockedPosSyncNetworkTarget(address.address)',
      "error: 'blocked_resolved_address'",
      "error: 'dns_lookup_failed'",
    ],
    'POS sync server DNS network target guard',
  );

  assertOrder(
    'src/app/api/pos-sync/deliver/route.ts',
    [
      'const webhookValidation = validatePosSyncWebhookUrl(String(posSync.webhookUrl));',
      'const networkValidation = await validatePosSyncWebhookNetworkTarget(webhookValidation.normalizedUrl);',
      'const projectRef = db',
      'const deliveryClaim = await db.runTransaction(async (transaction) => {',
      'transaction.get(projectRef)',
      'const payload = buildMenuSnapshot(',
      'const response = await postPosSyncWebhook({',
    ],
    'POS delivery DNS target guard before project read, version increment, outbound fetch, and redirect boundary',
  );

  assertOrder(
    'src/app/api/pos-sync/test/route.ts',
    [
      'const webhookValidation = validatePosSyncWebhookUrl(String(posSync.webhookUrl));',
      'const networkValidation = await validatePosSyncWebhookNetworkTarget(webhookValidation.normalizedUrl);',
      'const secretRef = getPosSyncSecretRef(db, tenantDocumentId, storeDocumentId);',
      'const connectionClaim = await db.runTransaction(async (transaction) => {',
      'const testPayload = buildTestPayload(storeId, tenantId, connectionClaim.currency);',
      'const response = await postPosSyncWebhook({',
    ],
    'POS test DNS target guard before test payload, outbound fetch, and redirect boundary',
  );
}

function verifyMultiOutletPublicTruthWriteRoutes() {
  const outletCreateRoute = read('src/app/api/outlets/create/route.ts');
  const outletDeactivateRoute = read('src/app/api/outlets/deactivate/route.ts');
  const sharedNeedles = [
    'withAuth',
    'verifyTenantAccess',
    'requireAnyStorePermissionForStoreData',
    'checkRateLimit',
    'revalidateTag',
    'touchDigitalScreenContentVersionForStoreServer',
    'invalidateOwnerBusinessAssistantPacketCache',
  ];

  [
    'src/app/api/outlets/create/route.ts',
    'src/app/api/outlets/deactivate/route.ts',
    'src/app/api/outlets/rename/route.ts',
  ].forEach((route) => {
    assertIncludes(route, [...sharedNeedles, 'runStorePublicTruthPostCommitEffects({', 'revalidate: (tag) => revalidateTag(tag, { expire: 0 })'], `${route} multi-outlet public truth write guards`);
  });
  assertIncludes(
    'src/app/api/projects/outlet-save/route.ts',
    [...sharedNeedles, 'runStorePublicTruthPostCommitEffects({', 'storeIds: [String(outletStoreId)]', 'revalidate: (tag) => revalidateTag(tag, { expire: 0 })'],
    'linked outlet save public truth write guards',
  );
  assertIncludes(
    'src/lib/cache/storePublicTruthPostCommit.ts',
    ['`menu-store-${storeId}`', '`store-${storeId}`', "params.deps.revalidate('client-stores')", "params.deps.revalidate('screen-data')"],
    'shared store public-truth cache-tag boundary',
  );

  assertIncludes(
    'src/app/api/projects/outlet-save/route.ts',
    [
      'import { normalizeMultiOutletNumericDocumentId, normalizeMultiOutletProjectId } from "@lib/multiOutlet/projectIdBoundary";',
      'normalizeMultiOutletProjectId(project.projectId)',
      'normalizeMultiOutletProjectId(project.masterProjectId)',
      'const outletSessionScope = getOutletSessionScope(session);',
      'const currentStoreScope = normalizeMultiOutletNumericDocumentId(outletSessionScope?.storeDocumentId);',
      'linked_outlet_save_invalid_session_store_scope',
      'const currentStoreId = currentStoreScope.numericId;',
      'isValidFirestoreDocumentId',
      '.refine(isValidFirestoreDocumentId, "Invalid project ID")',
      '.refine(isValidFirestoreDocumentId, "Invalid override ID")',
      'active: z.boolean().optional()',
      'outletStatus: z.enum(["active", "inactive"]).optional()',
      'outletProjectRef.tId !== masterProjectRef.tId',
      'outletProjectRef.sId === masterProjectRef.sId',
      'const outletPolicy = requireLinkedOutletAuthority({',
      'isStorePermissionDataInScope(callerStore, callerStoreScope, tenantScope)',
      'isStorePermissionDataInScope(outletStore, outletStoreScope, tenantScope)',
      'isStorePermissionDataInScope(masterStore, masterStoreScope, tenantScope)',
      'const callerIsInTenant = tenantStores.some',
      'const targetIsInTenant = tenantStores.some',
      'const masterIsInTenant = tenantStores.some',
      'if (!callerIsInTenant || !targetIsInTenant || !masterIsInTenant)',
      '"Store membership changed", "linked_outlet_membership_invalid"',
      'Only the outlet or master store can save this menu',
      'transaction.get(callerStoreDocumentRef)',
      'transaction.get(outletStoreDocumentRef)',
      'transaction.get(masterStoreDocumentRef)',
      'transaction.get(tenantDocumentRef)',
      'collectLocalIds(effectiveStandardProject.files)',
      'getOutletPolicyViolation(effectiveStandardProject, existingProject, outletPolicy)',
      'buildSummaryProjectFieldPayload(effectiveStandardProject.projectId, "active", effectiveStandardProject.active)',
      'const expectedBucket = storageAdmin.bucket().name',
      'normalizeImageBatchProjectSelections(',
      'transaction.get(persistedOutletProjectRef)',
      'transaction.get(masterProjectDocumentRef)',
      'outletPolicy.imageOverride !== true',
      'transaction.set(latestOutletSnap.ref, safeProject, { merge: true });',
    ],
    'linked outlet save target and policy guards',
  );
  assert(
    !read('src/app/api/projects/outlet-save/route.ts').includes('const writeBatch = db.batch();'),
    'linked outlet save must not restore a stale batch write outside the authority transaction',
  );
  assert(
    !read('src/app/api/projects/outlet-save/route.ts').includes('const currentStoreId = Number(session.sId || session.user?.storeId);'),
    'linked outlet save must not coerce session store IDs before tenant/store reads',
  );

  assertIncludes(
    'src/app/api/outlets/deactivate/route.ts',
    [
      'const outletStoreDocumentId = normalizeOutletDocumentId(outletStoreId);',
      'targetStoreRef',
      'Number(targetStore?.tenantId) !== Number(tenantId)',
      'targetStore?.isMaster === true',
      'tx.get(targetStoreRef)',
      'InvalidOutletTargetError',
      'throw new InvalidOutletTargetError()',
      'isInvalidOutletTargetError(error)',
    ],
    'outlet deactivate canonical target guard',
  );

  assertIncludes(
    'src/app/api/outlets/create/route.ts',
    [
      "import { getBoundedMultiOutletStringContext, logMultiOutletFailure } from \"@lib/multiOutlet/diagnostics\";",
      'multi_outlet_billing_upi_quantity_update_unsupported',
      'multi_outlet_billing_provider_quantity_update_failed',
      'multi_outlet_billing_provider_quantity_revert_failed',
      'multi_outlet_subscription_quantity_revert_failed',
      'multi_outlet_create_lock_release_failed',
      'multi_outlet_create_failed',
      'getOutletCreateLogContext(tenantDocumentId, storeDocumentId',
      'getBoundedMultiOutletStringContext("providerSubscriptionId", providerSubId)',
    ],
    'outlet create bounded provider and route diagnostics',
  );
  assertIncludes(
    'src/app/api/outlets/create/route.ts',
    [
      'class OutletCreateLockHeldError extends Error',
      'readonly code = OUTLET_CREATE_LOCK_HELD_CODE',
      'throw new OutletCreateLockHeldError()',
      'isOutletCreateLockHeldError(error)',
    ],
    'outlet create typed lock contention sentinel',
  );
  assertIncludes(
    'src/app/api/outlets/deactivate/route.ts',
    [
      "import { getBoundedMultiOutletStringContext, logMultiOutletFailure } from \"@lib/multiOutlet/diagnostics\";",
      'multi_outlet_billing_reduction_failed',
      'multi_outlet_deactivate_failed',
      'getOutletDeactivateLogContext(tenantDocumentId, storeDocumentId, outletStoreDocumentId',
      'getOutletDeactivateLogContext(tenantDocumentId, storeDocumentId, parsedOutletStoreDocumentId || parsedOutletStoreId)',
      "logger.security('Outlet Deactivated'",
      'activeStoresAfterDeactivation',
    ],
    'outlet deactivate bounded provider and route diagnostics',
  );
  assertIncludes(
    'src/app/api/outlets/deactivate/route.ts',
    [
      'class InvalidOutletTargetError extends Error',
      'readonly code = INVALID_OUTLET_TARGET_CODE',
      'throw new InvalidOutletTargetError()',
      'isInvalidOutletTargetError(error)',
    ],
    'outlet deactivate typed invalid-target sentinel',
  );
  assert(!outletCreateRoute.includes('secureError('), 'outlet create must use bounded multi-outlet diagnostics instead of raw secureError');
  assert(!outletDeactivateRoute.includes('secureError('), 'outlet deactivate must use bounded multi-outlet diagnostics instead of raw secureError');
  assert(!outletCreateRoute.includes('throw new Error("LOCK_HELD")'), 'outlet create lock contention must use a typed local sentinel error');
  assert(!outletCreateRoute.includes('(error as Error).message'), 'outlet create catch paths must not branch on raw Error.message');
  assert(!outletCreateRoute.includes('} catch (_) { /* best-effort */ }'), 'outlet create lock release must not silently swallow cleanup failures');
  assert(!outletDeactivateRoute.includes('throw new Error("INVALID_OUTLET_TARGET")'), 'outlet deactivate invalid target must use a typed local sentinel error');
  assert(!outletDeactivateRoute.includes('(error as Error).message'), 'outlet deactivate catch paths must not branch on raw Error.message');
  const outletDeactivateSecurityLogStart = outletDeactivateRoute.indexOf("logger.security('Outlet Deactivated'");
  const outletDeactivateSecurityLogEnd = outletDeactivateRoute.indexOf("}, 'medium');", outletDeactivateSecurityLogStart);
  const outletDeactivateSecurityLogBlock = outletDeactivateSecurityLogStart >= 0 && outletDeactivateSecurityLogEnd > outletDeactivateSecurityLogStart
    ? outletDeactivateRoute.slice(outletDeactivateSecurityLogStart, outletDeactivateSecurityLogEnd)
    : '';
  assert(outletDeactivateSecurityLogBlock.length > 0, 'outlet deactivate success security log block must be verifiable');
  assert(
    !outletDeactivateSecurityLogBlock.includes('\n            tenantId,\n')
      && !outletDeactivateSecurityLogBlock.includes('masterStoreId: storeId')
      && !outletDeactivateSecurityLogBlock.includes('\n            outletStoreId,\n'),
    'outlet deactivate success security log must not include raw tenant, master, or outlet IDs',
  );

  assertIncludes(
    'src/app/api/outlets/rename/route.ts',
    [
      'Number(outlet.tenantId) !== Number(tenantId)',
      'outlet.isMaster',
      'outlet.active === false',
      'const [freshMasterSnap, tenantDoc, freshOutletSnap] = await Promise.all([',
      'tx.get(masterStoreRef)',
      'Number(freshOutlet.tenantId) !== Number(tenantId)',
      'freshMasterSummary.isMaster !== true',
      'freshOutletSummary.isMaster === true',
      'readOutletSlugReservationInTransaction({',
      'writeCurrentOutletSlugClaim(tx, newReservation, now);',
      'writeRedirectOutletSlugClaim(tx, oldReservation, now)',
      'tx.update(outletRef, updatePayload)',
      'tx.update(tenantRef, { storesList: updatedStoresList })',
    ],
    'outlet rename tenant and transactional slug-chain guard',
  );
  assertIncludes(
    'src/lib/routing/outletSlugClaim.ts',
    [
      "const OUTLET_SLUG_CLAIM_DOCUMENT_PREFIX = 'outletSlugClaim_'",
      'export function getOutletSlugClaimDocumentId(tenantId: string, outletSlug: string): string',
      'export async function readOutletSlugReservationInTransaction(params:',
      ".where('tenantId', '==', Number(tenantId))",
      ".where('outletSlug', '==', outletSlug)",
      ".where('previousOutletSlugs', 'array-contains', outletSlug)",
      'historySnap.size >= OUTLET_HISTORY_QUERY_LIMIT',
    ],
    'tenant-scoped outlet slug claim boundary',
  );
  const outletRenameRoute = read('src/app/api/outlets/rename/route.ts');
  assert(
    !outletRenameRoute.includes('const directCollisionSnap = await db')
      && !outletRenameRoute.includes('const chainCollisionSnap = await db'),
    'outlet rename must not use non-transactional slug collision authority',
  );
}

function verifyMobileLocationsFailureContract() {
  const mobileLocations = read('src/components/mobile/screens/MobileLocationsScreen.tsx');
  const desktopLocations = read('src/app/(main)/locations/page.tsx');
  const addOutletModal = read('src/components/organisms/AddOutletModal/index.tsx');
  const outletRenameModal = read('src/components/organisms/OutletRenameModal/index.tsx');
  const multiOutletDal = read('src/database/multiOutlet/index.ts');
  const outletActionGuards = read('src/lib/multiOutlet/outletActionResponseGuards.ts');

  assertIncludes(
    'src/components/mobile/screens/MobileLocationsScreen.tsx',
    [
      'mobile_location_store_switch_failed',
      "readAuthAccountResponse(res, 'switch_store')",
      'logMultiOutletFailure',
      "buildMobileLocationLogContext('switch_store'",
      "getBoundedMultiOutletStringContext('targetStoreId', storeId)",
      'mobile_location_create_failed',
      "buildMobileLocationLogContext('create_outlet'",
    ],
    'mobile locations store switch and create bounded failure contract',
  );

  assert(
    !mobileLocations.includes("if (res.ok) {\n                await refreshFirebaseAuthClaims(storeId);"),
    'mobile locations store switch must not silently ignore rejected switch-store responses',
  );
  assert(!mobileLocations.includes('} catch {\n            Toast.show({ content: t(\'networkError\')'), 'mobile locations outlet create must log bounded network/client failures');
  assert(mobileLocations.includes('return <MobileLocationsScreenContent key={scopeKey} {...props} />;'), 'Mobile Locations must remount drafts on exact tenant/store changes');
  assert(mobileLocations.includes('locationActionInFlightRef.current'), 'Mobile Locations must serialize tenant/store mutations before React state settles');
  assert(mobileLocations.includes('isExpectedLocationScope(expectedTenantId, expectedStoreId)'), 'Mobile Locations must recheck exact action scope after async stages');
  assert(mobileLocations.includes("String(previous.tenantId ?? '') === String(expectedTenantId)"), 'Mobile Locations tenant-list settlement must require the admitted tenant');
  assert(mobileLocations.includes("String(previous?.storeId ?? '') === String(expectedStoreId)"), 'Mobile Locations store settlement must require the admitted store');
  assert(mobileLocations.includes('store.name === submittedTarget.name'), 'Mobile Locations rename settlement must preserve newer same-store name truth');
  assert(mobileLocations.includes('store.outletSlug === submittedTarget.outletSlug'), 'Mobile Locations rename settlement must preserve newer same-store slug truth');
  assert(mobileLocations.includes('previous.outletPolicy === sourcePolicy'), 'Mobile Locations policy settlement must preserve newer current-store policy truth');
  assert(mobileLocations.includes('store.storeDetails?.outletPolicy === sourcePolicy'), 'Mobile Locations policy settlement must preserve newer tenant-summary policy truth');
  assert(!mobileLocations.includes('setTenantDetails({ ...tenantDetails, storesList: updatedStoresList })'), 'Mobile Locations must not replace a captured tenant store list');
  assert(!mobileLocations.includes('setStoreDetails({\n                    ...storeDetails,'), 'Mobile Locations must not replace captured generic store context');
  assert(outletActionGuards.includes('MULTI_OUTLET_ACTION_REQUEST_POLICY'), 'multi-outlet outlet action guards must expose a shared browser request policy');
  assert(outletActionGuards.includes("cache: 'no-store'"), 'multi-outlet outlet action requests must bypass browser cache');
  assert(outletActionGuards.includes("credentials: 'same-origin'"), 'multi-outlet outlet action requests must keep credentials same-origin');
  assert(outletActionGuards.includes("redirect: 'manual'"), 'multi-outlet outlet action requests must not follow redirects');
  [
    [mobileLocations, 'mobile locations outlet actions', ['/api/outlets/deactivate', '/api/outlets/rename', '/api/outlets/create']],
    [desktopLocations, 'desktop locations outlet deactivation', ['/api/outlets/deactivate']],
    [addOutletModal, 'desktop add outlet modal', ['/api/outlets/create']],
    [outletRenameModal, 'desktop outlet rename modal', ['/api/outlets/rename']],
    [multiOutletDal, 'outlet policy DAL', ['/api/outlets/policy']],
  ].forEach(([source, label, endpoints]) => {
    endpoints.forEach((endpoint) => {
      assert(source.includes(endpoint), `${label} must keep endpoint ${endpoint}`);
    });
    assert(source.includes('MULTI_OUTLET_ACTION_REQUEST_POLICY'), `${label} must use the shared multi-outlet action request policy`);
  });
}

function verifySessionScopedPublicTruthRoutes() {
  assertIncludes(
    'src/app/api/auth/change-password/route.ts',
    [
      'function normalizeChangePasswordUserDocumentId(value: unknown): string | null',
      'userId === raw',
      'userId.length <= CHANGE_PASSWORD_USER_DOCUMENT_ID_MAX_LENGTH',
      'isValidFirestoreDocumentId(userId)',
      'const userId = normalizeChangePasswordUserDocumentId(rawUserId);',
      'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      'key: `auth-pwd:${userRateLimitHash}`',
      'readBoundedJsonBody(request, CHANGE_PASSWORD_MAX_BODY_BYTES',
      'getBoundedSecurityRouteContext(session, request)',
    ],
    'change-password hashed limiter identity and bounded body guard',
  );
  assert(!read('src/app/api/auth/change-password/route.ts').includes('key: `auth-pwd:${userId}`'), 'change-password must not store raw user IDs in rate-limit keys');
  assert(!read('src/app/api/auth/change-password/route.ts').includes('const userId = String(session?.uId || session?.user?.id || "");'), 'change-password must not coerce raw session user IDs before document-ID validation');
  assert(!read('src/app/api/auth/change-password/route.ts').includes('buildSecurityContext'), 'change-password must not spread raw session security context into security logs');
  assertIncludes(
    '__docs__/auth/README.md',
    [
      'Session user ID must pass the shared Firestore document-ID guard',
      'HMAC-hashed normalized session user ID before a 2KB bounded JSON body',
    ],
    'auth README records strict change-password session user ID boundary',
  );
  assertIncludes(
    '__docs__/auth/auth_firebase.md',
    [
      'normalized session user ID',
      'Malformed, reserved, whitespace-mutated, path-shaped, or oversized session user IDs fail',
    ],
    'auth Firebase docs record strict change-password session user ID boundary',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'Auth change-password strict user document-ID boundary checkpoint',
      'normalizeChangePasswordUserDocumentId()',
      'raw session-user coercion exclusion',
    ],
    'production-readiness audit records strict change-password session user ID boundary',
  );

  assertIncludes(
    'src/app/api/auth/switch-store/route.ts',
    [
      'normalizeStorePermissionScopeDocumentId',
      'const tenantScope = normalizeStorePermissionScopeDocumentId(session.tId);',
      'const currentStoreScope = normalizeStorePermissionScopeDocumentId(session.sId);',
      'verifyTenantAccess(session, tenantScope.numericId, currentStoreScope.numericId, request)',
      'const sessionUserId = resolveCurrentSessionUserDocumentId(session);',
      'if (!sessionUserId)',
      'const userRateLimitHash = hashPublicRateLimitValue(sessionUserId);',
      'key: `switch-store:${userRateLimitHash}`',
      'failClosedOnProviderError: true',
      'rateLimit.reason === "provider_unavailable"',
      '"Cache-Control": "private, no-store, max-age=0"',
      '"X-Content-Type-Options": "nosniff"',
      'readBoundedJsonBody(request, SWITCH_STORE_MAX_BODY_BYTES',
      'const targetStoreScope = normalizeStorePermissionScopeDocumentId(targetStoreId);',
      'getBoundedSecurityRouteContext(session, request)',
      'import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";',
      'const callerStoreSnap = await db.collection(DB_COLLECTIONS.STORES).doc(currentStoreScope.documentId).get();',
      'const tenantData = tenantSnap.exists ? tenantSnap.data() : null;',
      'if (!tenantData || isPlatformEntityBlocked(tenantData))',
      'const targetStoreSnap = await db.collection(DB_COLLECTIONS.STORES).doc(targetStoreScope.documentId).get();',
      'targetStoreData.tenantId !== tenantScope.numericId',
      'normalizeStorePermissionScopeDocumentId(store.storeId)?.numericId === targetStoreScope.numericId',
      'targetStoreData.active === false',
      'targetStoreData.deleted === true',
      'isPlatformEntityBlocked(targetStoreData)',
    ],
    'switch-store hashed limiter identity, bounded body guard, and target store eligibility',
  );
  assert(!read('src/app/api/auth/switch-store/route.ts').includes('key: `switch-store:${session.uId || session.user?.id}`'), 'switch-store must not store raw session user IDs in rate-limit keys');
  assert(!read('src/app/api/auth/switch-store/route.ts').includes('buildSecurityContext'), 'switch-store must not spread raw session security context into security logs');
  assert(!read('src/app/api/auth/switch-store/route.ts').includes('db.doc(`${DB_COLLECTIONS.STORES}/${currentStoreId}`).get()'), 'switch-store must not read caller store through raw session store IDs');
  assert(!read('src/app/api/auth/switch-store/route.ts').includes('db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`).get()'), 'switch-store must not read tenant through raw session tenant IDs');
  assert(!read('src/app/api/auth/switch-store/route.ts').includes('db.doc(`${DB_COLLECTIONS.STORES}/${targetStoreId}`).get()'), 'switch-store must not read target store through raw request target IDs');
  assert(!read('src/app/api/auth/switch-store/route.ts').includes('Number(s.storeId) === targetStoreScope.numericId'), 'switch-store must not coerce tenant-list store IDs');
  assert(!read('src/app/api/auth/switch-store/route.ts').includes('Number(targetStoreData.tenantId)'), 'switch-store must not coerce persisted target-store tenant authority');
  const storeSwitchAccess = read('src/lib/multiOutlet/storeSwitchAccess.ts');
  assert(storeSwitchAccess.includes('normalizeStoreSwitchStoreId'), 'shared store-switch access must expose exact store ID normalization');
  assert(storeSwitchAccess.includes("if (!/^[1-9]\\d*$/.test(raw)) return null;"), 'shared store-switch access must require canonical positive decimal IDs');
  assert(!storeSwitchAccess.includes('const numeric = Number(value);'), 'shared store-switch access must not coerce arbitrary mapped store IDs');
  const storePermissionServer = read('src/lib/permissions/server.ts');
  assert(storePermissionServer.includes('normalizeStorePermissionScopeDocumentId(store?.storeId)?.numericId === storeScope.numericId'), 'store permission role lookup must use exact mapped-store IDs');
  assert(!storePermissionServer.includes('Number(store?.storeId) === storeScope.numericId'), 'store permission role lookup must not coerce mapped-store IDs');
  assert(read('__docs__/multi-outlet-consistency/multi-outlet-consistency_firebase.md').includes('Switch-store scope document ID boundary'), 'multi-outlet Firebase docs must document switch-store scope document ID boundary');
  assert(read('__docs__/audits/menulist-production-readiness-audit.md').includes('Switch-store scope document ID boundary checkpoint'), 'production audit must document switch-store scope document ID boundary');
  assert(read('__docs__/changelog.md').includes('Switch-Store Scope Document ID Boundary'), 'changelog must document switch-store scope document ID boundary');

  assertIncludes(
    'src/app/api/public/create-menu/route.ts',
    [
      'async function checkAuthenticatedPublicMenuEntryLimit(userId: string)',
      "getRateLimitForFeature('PUBLIC_MENU_ENTRY_AUTH')",
      'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      'key: `public-menu-entry:${userRateLimitHash}`',
      'readBoundedJsonBody(req, PUBLIC_CREATE_MENU_LINK_MAX_BODY_BYTES',
      'readBoundedFormDataBody(req, MAX_CREATE_MENU_BODY_SIZE',
      'key: `public-menu-entry-status:${userRateLimitHash}:${draftRateLimitHash}`',
      'PUBLIC_MENU_ENTRY_STORAGE_CLEANUP_FAILED',
      'PUBLIC_MENU_ENTRY_COLLISION_LOOKUP_FAILED',
      'deletePublicMenuEntryStoragePath',
      'buildIdempotentPublicDraftToken',
      'batch.create(jobRef',
      'batch.create(draftRef',
      'getReusableDraftByIdForUser',
      'getPublicMenuDraftTimestampMillis',
      'expiresAtMillis === null',
    ],
    'public create-menu entry hashed limiter and bounded body guard',
  );
  const publicCreateMenuRoute = read('src/app/api/public/create-menu/route.ts');
  assert(!publicCreateMenuRoute.includes('key: `public-menu-entry:${userId}`'), 'public create-menu entry must not store raw user IDs in rate-limit keys');
  assert(!publicCreateMenuRoute.includes('.doc(draftToken).set({'), 'public create-menu entry must create draft and job atomically');
  assert(!publicCreateMenuRoute.includes('extractionJobId: null'), 'public create-menu entry must not expose an orphanable draft state');
  assert(!publicCreateMenuRoute.includes('bucket.file(storagePath).delete({ ignoreNotFound: true }).catch(() => undefined)'), 'public create-menu entry must not silently swallow storage cleanup failures');
  assert(!publicCreateMenuRoute.includes('firestoreAdmin.collection(COLLECTION).doc(draftToken).delete().catch(() => undefined)'), 'public create-menu entry must not silently swallow draft cleanup failures');
  assert(!publicCreateMenuRoute.includes('Promise.allSettled(createdStoragePaths.map((path) => storageAdmin.bucket().file(path).delete'), 'public create-menu link import must not silently swallow storage cleanup failures');

  assertIncludes(
    'src/app/api/public/create-menu/claim/route.ts',
    [
      'const userId = session.user.id;',
      "getRateLimitForFeature('PAYMENT_ONBOARDING')",
      'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      'key: `public-menu-claim:${userRateLimitHash}`',
      'readBoundedJsonBody(request, PUBLIC_MENU_CLAIM_MAX_BODY_BYTES',
      "import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';",
      "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
      'function normalizePublicMenuClaimNumericDocumentId(',
      'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
      'const tenantScope = normalizePublicMenuClaimNumericDocumentId(session.user.tenantId);',
      'const storeScope = normalizePublicMenuClaimNumericDocumentId(session.user.storeId);',
      'normalizePublicMenuDraftExtractedData(draft.extractedData)',
      'getPublicMenuDraftTimestampMillis(draft.expiresAt)',
      'normalizePublicDraftSourceForProject(draft, draftId',
      'allowedBucket: storageAdmin.bucket().name',
      'normalizeCompletedClaimResult(draft, userId)',
      'convertedTenantId: tenantId',
      'convertedProjectSlug: projectSlug',
      'convertedSubdomain: subdomain',
      'Promise.allSettled(cacheEffects.map((effect) => effect.run()))',
      'const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantDocumentId);',
      'const existingProjectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${storeDocumentId}`);',
      'const tenantDoc = await transaction.get(tenantRef);',
      'const existingSummaryDoc = await transaction.get(existingProjectsSummaryRef);',
      '.doc(tenantDocumentId)',
      '.collection(storeDocumentId)',
      'const projectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${storeDocumentId}`);',
      'let existingSummaryProjectsForDefaultDemotion: Record<string, any> = {};',
      'existingSummaryProjectsForDefaultDemotion = existingSummaryDoc.exists',
      'Object.entries(existingSummaryProjectsForDefaultDemotion).forEach',
      'const storeTenantScope = normalizeMenuListPublicEntityIdentityAliases([',
      'storeTenantScope?.numericId !== tenantId',
      'normalizeMenuListPublicEntityIdentityAliases(storeIdentityAliases)?.numericId !== storeId',
      'storeData.active === false',
      'storeData.deleted === true',
      'isPlatformEntityBlocked(storeData)',
      'isPlatformEntityBlocked(tenantDoc.data())',
      'touchDigitalScreenContentVersionForStoreServer(result.storeId, \'publicCreateMenuClaim\')',
    ],
    'public create-menu claim hashed limiter and bounded body guard',
  );
  assertOrder(
    'src/app/api/public/create-menu/claim/route.ts',
    [
      'const existingSummaryDoc = await transaction.get(existingProjectsSummaryRef);',
      'if (Object.keys(storeDefaultsPatch).length > 0) {',
      'transaction.update(storeRef, {',
      'Object.entries(existingSummaryProjectsForDefaultDemotion).forEach',
      'transaction.set(projectRef, projectData);',
    ],
    'public create-menu existing-account claim must complete transaction reads before writes',
  );
  assert(!read('src/app/api/public/create-menu/claim/route.ts').includes('key: `public-menu-claim:${userId}`'), 'public create-menu claim must not store raw user IDs in rate-limit keys');
  assert(!read('src/app/api/public/create-menu/claim/route.ts').includes('const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(String(tenantId));'), 'public create-menu claim must not build tenant refs from raw claim IDs');
  assert(!read('src/app/api/public/create-menu/claim/route.ts').includes('const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(storeId));'), 'public create-menu claim must not build store refs from raw claim IDs');
  assert(!read('src/app/api/public/create-menu/claim/route.ts').includes('const projectCollectionPath = `${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}`;'), 'public create-menu claim must not build project collection paths from raw claim IDs');
  assert(!read('src/app/api/public/create-menu/claim/route.ts').includes('const existingProjectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${storeId}`);'), 'public create-menu claim must not build existing project summaries from raw claim IDs');

  [
    ['src/app/api/public-truth-monitor/summary/route.ts', 'GET', 'Public Truth Monitor summary'],
    ['src/app/api/public-truth-monitor/refresh/route.ts', 'POST', 'Public Truth Monitor refresh'],
  ].forEach(([routePath, method, label]) => {
    assertIncludes(
      routePath,
      [
        'withAuth',
        `export const ${method} = withAuth(async`,
        'getPublicTruthMonitorSessionScope',
        'const sessionScope = getPublicTruthMonitorSessionScope(session);',
        'verifyTenantAccess(session, sessionScope.tenantScope.numericId, sessionScope.storeScope.numericId, request)',
        'requireAnyStorePermissionForStoreData(',
        '[PERMISSIONS.VIEW_ANALYTICS]',
        'sessionScope.storeScope.numericId',
        'sessionScope.tenantScope.numericId',
        'evaluatePublicTruthMonitorServerEntitlement',
      ],
      `${label} session-scoped permission and entitlement guard`,
    );
  });

  assertOrder(
    'src/app/api/public-truth-monitor/summary/route.ts',
    [
      'const rateLimitResponse = await checkAIRateLimit("DATA_READ", "public-truth-monitor-read", {',
      'const sessionScope = getPublicTruthMonitorSessionScope(session);',
      'if (!verifyTenantAccess(session, sessionScope.tenantScope.numericId, sessionScope.storeScope.numericId, request))',
      'authorized = await readAuthorizedPublicTruthMonitorSummaryServer({',
      'authorizeStore: (storeData) => {',
      'permissionError = requireAnyStorePermissionForStoreData(',
      'const entitlement = await evaluatePublicTruthMonitorServerEntitlement({',
      '? authorized.summary',
    ],
    'Public Truth Monitor summary must rate-limit, tenant-check, permission-check, then read saved summary',
  );

  assertOrder(
    'src/app/api/public-truth-monitor/refresh/route.ts',
    [
      'const rateLimitResponse = await checkDataWriteLimit({',
      'const validation = validateAPIInput(PublicTruthMonitorRefreshRequestSchema, jsonBody.data);',
      'const sessionScope = getPublicTruthMonitorSessionScope(session);',
      'if (!verifyTenantAccess(session, sessionScope.tenantScope.numericId, sessionScope.storeScope.numericId, request))',
      'const storeData = await readPublicTruthMonitorStoreDataServer(sessionScope.storeScope.documentId);',
      'const permissionError = requireAnyStorePermissionForStoreData(',
      'const entitlementEvaluation = await evaluatePublicTruthMonitorServerEntitlementWithAuthority({',
      'const { activeSubscription, entitlement } = entitlementEvaluation;',
      'summary = await updatePublicTruthMonitorSummaryServer({',
      'authorizeSubscription: (subscriptionData, currentStoreData) => (',
      'authorizeStore: (currentStoreData) => {',
      'finalPermissionError = requireAnyStorePermissionForStoreData(',
      'subscriptionId: activeSubscription.id',
    ],
    'Public Truth Monitor refresh must rate-limit, validate, tenant-check, permission-check, then write summary',
  );
  ['src/app/api/public-truth-monitor/summary/route.ts', 'src/app/api/public-truth-monitor/refresh/route.ts'].forEach((routePath) => {
    const route = read(routePath);
    [
      'verifyTenantAccess(session, session.tId, session.sId, request)',
      'readPublicTruthMonitorStoreDataServer(session.sId)',
      'Number(session.sId)',
      'Number(session.tId)',
    ].forEach((token) => {
      assert(!route.includes(token), `${routePath} must not use raw Public Truth Monitor session scope token ${token}`);
    });
  });

  assertIncludes(
    'src/lib/validation/publicTruthMonitorSchemas.ts',
    [
      'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
      'const publicTruthMonitorProjectIdSchema = z.string()',
      '.refine(isValidFirestoreDocumentId, "Invalid project ID")',
      'selectedProjectId: publicTruthMonitorProjectIdSchema.optional()',
    ],
    'Public Truth Monitor refresh selected-project schema must use shared document-ID guard',
  );
  assert(
    !read('src/lib/validation/publicTruthMonitorSchemas.ts').includes('.trim()'),
    'Public Truth Monitor refresh selectedProjectId must not trim IDs before validation',
  );
  assert(
    !read('src/lib/validation/publicTruthMonitorSchemas.ts').includes('selectedProjectId: z.string().min(1).max(140).optional()'),
    'Public Truth Monitor refresh selectedProjectId must not keep max-only validation',
  );
  assertIncludes(
    'src/database/publicTruthMonitor/server.ts',
    [
      'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
      'function normalizePublicTruthMonitorDocumentId(value: unknown): string | null',
      'const raw = typeof value === "string" ? value : "";',
      'return documentId === raw && isValidFirestoreDocumentId(documentId) ? documentId : null;',
      'function normalizePublicTruthMonitorScopeDocumentId(value: unknown): string | null',
      'return documentId === raw && isValidFirestoreDocumentId(documentId) ? documentId : null;',
      'const projectId = normalizePublicTruthMonitorDocumentId(project.projectId);',
      'const selectedProjectIdDocumentId = normalizePublicTruthMonitorDocumentId(selectedProjectId);',
      'const projectId = normalizePublicTruthMonitorDocumentId(params.projectId);',
      'const tenantDocumentId = normalizePublicTruthMonitorScopeDocumentId(params.tId);',
      'const storeDocumentId = normalizePublicTruthMonitorScopeDocumentId(params.sId);',
      'if (!projectId) return null;',
    ],
    'Public Truth Monitor server DAL must normalize and reject malformed selected/project IDs',
  );
  assert(
    !read('src/database/publicTruthMonitor/server.ts').includes('.doc(params.projectId)'),
    'Public Truth Monitor server DAL must not use raw project ID document refs',
  );
  assertOrder(
    'src/database/publicTruthMonitor/server.ts',
    [
      'const projectId = normalizePublicTruthMonitorDocumentId(params.projectId);',
      '.doc(projectId)',
    ],
    'Public Truth Monitor project ID normalizer must run before project document reads',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'Public Truth Monitor project and scope ID boundary checkpoint',
      'Public Truth Monitor server DAL ID normalization checkpoint',
      'whitespace-mutated selected project IDs',
    ],
    'Production audit must record Public Truth Monitor project/scope ID boundaries',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Public Truth Monitor Project ID Boundary',
      'Public Truth Monitor Server DAL ID Normalization',
      'Public Truth Monitor Strict Project ID Boundary',
    ],
    'Changelog must record Public Truth Monitor project ID boundaries',
  );

  assertIncludes(
    'src/app/api/domain/route.ts',
    [
      'withAuth',
      'normalizeStorePermissionScopeDocumentId',
      'function normalizeDomainSessionDocumentId(value: unknown): string | null',
      'function getDomainSessionScope(session: any): { tenantId: string; storeId: string } | null',
      'const scope = getDomainSessionScope(session);',
      'const { tenantId, storeId } = scope;',
      'requireAnyStorePermissionForStoreData(',
      '!isMenuListPublicEntityEligible(tenantData)',
      '!isMenuListPublicEntityEligible(storeData)',
      'storedStoreScope?.documentId !== params.scope.storeId',
      'storedTenantScope?.documentId !== params.scope.tenantId',
      'const storeIdentityAliasesMatch = normalizeMenuListPublicEntityIdentityAliases([',
      'const storeTenantAliasesMatch = normalizeMenuListPublicEntityIdentityAliases([',
      'const tenantIdentityAliasesMatch = tenantIdentityValues.length === 0',
      'checkDomainManagementRateLimit(session, storeId)',
      'const userRateLimitHash = hashPublicRateLimitValue(userId || session.user?.id || \'unknown\');',
      'const storeRateLimitHash = hashPublicRateLimitValue(storeId);',
      'key: `domain-management:${userRateLimitHash}:${storeRateLimitHash}`',
      'readBoundedJsonBody(request, DOMAIN_ACTION_MAX_BODY_BYTES',
      'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeId);',
      'readCustomDomainReservationInTransaction({',
      'writeReservedCustomDomainClaim(',
      'writeCurrentCustomDomainClaim(',
      'writeReleasingCustomDomainClaim(',
      'writeReleasedCustomDomainClaim(',
      'const reservationId = randomUUID();',
      'getVercelProjectDomain(normalizedDomain)',
      'providerConflictHasMenuListProvenance',
      'compensatePendingDomainReservation({',
      'releaseReleasingDomainClaim(',
      'CustomDomainLegacyConflictError',
      'isVercelDomainExplicitlyMisconfigured(configResult.data)',
      'transaction.update(storeRef,',
      'normalizeDomainRouteFailure',
      'buildDomainRouteLogContext',
      "getBoundedDomainRouteStringContext('domain', domain)",
      'providerStatus: result.status',
      'DOMAIN_STATUS_PROVIDER_FAILURE_MESSAGE',
      'statusProviderStatus: configResult.status',
      'normalizeDomainRouteFailure(error, "Domain status check failed")',
      'DOMAIN_REMOVE_PROVIDER_FAILURE_MESSAGE',
      'removeProviderStatus: removeResult.status',
      'normalizeDomainRouteFailure(error, "Domain remove failed")',
      'await revalidateMenuCache(storeId, { tId: tenantId })',
    ],
    'custom domain session-scoped public truth write guard',
  );

  const domainRoute = read('src/app/api/domain/route.ts');
  assert(
    !domainRoute.includes('result.data?.error?.message'),
    'custom domain route must not log raw Vercel provider error messages',
  );
  assert(
    !domainRoute.includes('new Error(providerMessage)'),
    'custom domain route must normalize provider failures before secure logging',
  );
  assert(
    !domainRoute.includes('catch {\n        // Non-blocking'),
    'custom domain remove failures must log bounded diagnostics before continuing',
  );
  assert(
    !domainRoute.includes('key: `domain-management:${userId}:${storeId}`'),
    'custom domain management must not store raw user/store IDs in rate-limit keys',
  );
  assert(
    !domainRoute.includes('const { tId: tenantId, sId: storeId } = session'),
    'custom domain route must not use raw session tenant/store IDs',
  );
  assert(
    !domainRoute.includes('doc(String(storeId))'),
    'custom domain route must not build store refs from raw String(storeId)',
  );
  assertOccurrenceAtLeast(
    domainRoute,
    'const scope = getDomainSessionScope(session);',
    3,
    'custom domain verbs normalize session scope',
  );
  assertOrder(
    'src/app/api/domain/route.ts',
    [
      'const scope = getDomainSessionScope(session);',
      'const { tenantId, storeId } = scope;',
      'const rateLimitResponse = await checkDomainManagementRateLimit(session, storeId);',
      'const bodyResult = await readBoundedJsonBody(request, DOMAIN_ACTION_MAX_BODY_BYTES',
      'const validation = AddDomainSchema.safeParse(body);',
      'const reservationResult = await db.runTransaction(async (transaction) => {',
      'readAuthorizedDomainStateInTransaction({',
      'writeReservedCustomDomainClaim(',
      'const result = await addDomainToVercelProject(normalizedDomain);',
      'getVercelProjectDomain(normalizedDomain)',
      'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeId);',
      'const finalizeResult = await db.runTransaction(async (transaction) => {',
      'transaction.update(storeRef,',
      'removeDomainFromProviderBestEffort(',
      'releaseReleasingDomainClaim(',
      'await revalidateMenuCache(storeId, { tId: tenantId });',
    ],
    'custom domain normalized scope, limiter, bounded body, current permission, provider, transactional store, and cache ordering',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'Custom Domain session document-ID boundary checkpoint',
      '`/api/domain` POST/GET/DELETE route keeps the same `MANAGE_PUBLIC_PRESENCE` admission',
      '`src/app/api/domain/route.ts` validates session tenant/store IDs with `src/lib/firebase/firestoreDocumentId.ts` before the permission helper',
      '`npm run verify:menulist-api-tenant-safety` source-gates the normalized scope helper',
    ],
    'production audit custom domain session document ID boundary evidence',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Custom Domain Session Document ID Boundary',
      '`/api/domain` validates session tenant/store IDs with the shared Firestore document-ID guard',
      'Malformed session IDs fail closed before provider work',
      '`npm run verify:menulist-api-tenant-safety` now guards the normalized domain session scope helper',
    ],
    'primary changelog custom domain session document ID boundary entry',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Custom Domain Session Document ID Boundary',
      '`/api/domain` validates session tenant/store IDs with the shared Firestore document-ID guard',
      'Malformed session IDs fail closed before provider work',
      '`npm run verify:menulist-api-tenant-safety` now guards the normalized domain session scope helper',
    ],
    'mirrored changelog custom domain session document ID boundary entry',
  );

  assertIncludes(
    'src/app/api/subdomain/check/route.ts',
    [
      'withAuth',
      'checkSubdomainReadRateLimit(session)',
      'getRateLimitForFeature("DATA_READ")',
      'checkRateLimit({',
      'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      'const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);',
      'const storeRateLimitHash = hashPublicRateLimitValue(storeId);',
      'key: `${SUBDOMAIN_CHECK_RATE_LIMIT_KEY}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`',
      '"X-RateLimit-Limit": String(rateLimitConfig.limit)',
      'requireAnyStorePermission(request, session, [PERMISSIONS.MANAGE_PUBLIC_PRESENCE], "Subdomain")',
      'const scope = getOutletSessionScope(session);',
      'await db.runTransaction(async (transaction) => {',
      'readSubdomainOwnerStoreInTransaction({',
      'readSubdomainReservationInTransaction({',
      'storeId: scope.storeDocumentId,',
      'tenantId: scope.tenantDocumentId,',
    ],
    'subdomain availability read guard',
  );
  assertIncludes(
    'src/lib/routing/subdomainClaim.ts',
    [
      "const SUBDOMAIN_CLAIM_DOCUMENT_PREFIX = 'subdomainClaim_';",
      "const directQuery = db.collection(DB_COLLECTIONS.STORES)",
      ".where('subdomain', '==', subdomain)",
      ".where('previousSubdomainSlugs', 'array-contains', subdomain)",
      'transaction.get(claimRef)',
      'transaction.get(directQuery)',
      'transaction.get(previousQuery)',
      'snapshot.id !== storeId',
      'previousSnap.size >= PREVIOUS_SUBDOMAIN_QUERY_LIMIT',
      'throw new SubdomainUnavailableError();',
    ],
    'transactional subdomain claim and compatibility collision boundary',
  );
  assert(!read('src/app/api/subdomain/check/route.ts').includes('key: `${SUBDOMAIN_CHECK_RATE_LIMIT_KEY}:${userId}:${tenantId}:${storeId}`'), 'subdomain availability must not store raw user/tenant/store IDs in rate-limit keys');
  assertOrder(
    'src/app/api/subdomain/check/route.ts',
    [
      'checkSubdomainReadRateLimit(session)',
      'requireAnyStorePermission(request, session, [PERMISSIONS.MANAGE_PUBLIC_PRESENCE], "Subdomain")',
      "const rawSubdomain = searchParams.get('subdomain')",
      'const scope = getOutletSessionScope(session);',
      'await db.runTransaction(async (transaction) => {',
      'readSubdomainOwnerStoreInTransaction({',
      'readSubdomainReservationInTransaction({',
    ],
    'subdomain availability read limiter before permission, owner scope, and transactional reservation reads',
  );
  assertIncludes(
    'src/lib/routing/subdomainOwnerScope.ts',
    [
      "const BRAND_SUBDOMAIN_TENANT_FIELDS = ['tenantId', 'tId'] as const;",
      "export type SubdomainOwnerScopeErrorReason = 'INVALID_SCOPE' | 'MASTER_REQUIRED';",
      'export async function readSubdomainOwnerStoreInTransaction(',
      'if (storeData.isMaster === true) return { storeData, storeRef };',
      "if (storeData.isMaster === false) throw new SubdomainOwnerScopeError('MASTER_REQUIRED');",
      ".where(field, '==', value).limit(2)",
      'canonicalStoreIds.size !== 1 || !canonicalStoreIds.has(storeId)',
    ],
    'subdomain owner-store master authority boundary',
  );

  assertIncludes(
    'src/app/api/compliance/route.ts',
    [
      'withAuth',
      "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
      'function normalizeComplianceSessionDocumentId(value: unknown): string | null',
      'function getComplianceSessionScope(session: any): { sId: string; tId: string } | null',
      'const scope = getComplianceSessionScope(session);',
      'const { sId, tId } = scope;',
      'requireAnyStorePermission(',
      '[PERMISSIONS.MANAGE_PUBLIC_PRESENCE, PERMISSIONS.MANAGE_STORE]',
      "getRateLimitForFeature('DATA_WRITE')",
      'failClosedOnProviderError: true',
      'const userRateLimitHash = hashPublicRateLimitValue(session.uId || session.user?.id || \'unknown\');',
      'const storeRateLimitHash = hashPublicRateLimitValue(sId);',
      'key: `compliance:${userRateLimitHash}:${storeRateLimitHash}`',
      'readBoundedJsonBody(request, COMPLIANCE_OVERRIDE_MAX_BODY_BYTES',
      'OverrideSchema.safeParse(body)',
      'sanitizeComplianceContent(content)',
      'saveComplianceOverrideServer(sId, tId, type, sanitized)',
      'deleteComplianceOverrideServer(sId, tId, type)',
    ],
    'compliance page session-scoped override guard',
  );
  const complianceRoute = read('src/app/api/compliance/route.ts');
  const complianceServerDal = read('src/database/compliance/server.ts');
  assert(!complianceRoute.includes('key: `compliance:${session.uId || session.user?.id}:${sId}`'), 'compliance override must not store raw user/store IDs in rate-limit keys');
  assert(!complianceRoute.includes('const { sId, tId } = session'), 'compliance route must not use raw session tenant/store IDs');
  assert(!complianceRoute.includes('.doc(String(sId))'), 'compliance route must not build store refs from raw String(sId)');
  assert(!complianceServerDal.includes('firestoreAdmin.collection(COLLECTION).doc(String(sId))'), 'compliance server DAL must not build override refs from raw String(sId)');
  assertIncludes(
    'src/database/compliance/server.ts',
    [
      'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
      'function normalizeComplianceStoreDocumentId(value: unknown): string | null',
      'firestoreAdmin.collection(COLLECTION).doc(documentId)',
      'throw new Error("invalid_compliance_store_id");',
    ],
    'compliance server DAL document ID guard',
  );
  assertOccurrenceAtLeast(
    complianceRoute,
    'const scope = getComplianceSessionScope(session);',
    2,
    'compliance GET/POST normalize session scope',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'Compliance Pages session document-ID boundary checkpoint',
      '`/api/compliance` validates session tenant/store IDs',
      '`src/database/compliance/server.ts` now rejects malformed `compliancePages/{sId}` refs',
      '`npm run verify:compliance-pages-boundary` and `npm run verify:menulist-api-tenant-safety` source-gate the route scope helper',
    ],
    'production audit compliance session document ID boundary evidence',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Compliance Pages Session Document ID Boundary',
      '`/api/compliance` validates session tenant/store IDs with the shared Firestore document-ID guard',
      'Malformed session IDs fail closed before compliance reads or writes',
      '`npm run verify:compliance-pages-boundary` and `npm run verify:menulist-api-tenant-safety` now guard the compliance session scope helper',
    ],
    'primary changelog compliance session document ID boundary entry',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Compliance Pages Session Document ID Boundary',
      '`/api/compliance` validates session tenant/store IDs with the shared Firestore document-ID guard',
      'Malformed session IDs fail closed before compliance reads or writes',
      '`npm run verify:compliance-pages-boundary` and `npm run verify:menulist-api-tenant-safety` now guard the compliance session scope helper',
    ],
    'mirrored changelog compliance session document ID boundary entry',
  );

  assertIncludes(
    'src/app/api/store/temp-status/route.ts',
    [
      'if (!FEATURE_FLAGS.ENABLE_TEMP_STATUS)',
      'withAuth',
      'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
      'const TEMP_STATUS_SESSION_DOCUMENT_ID_MAX_LENGTH = 160;',
      'function normalizeSessionDocumentId(value: unknown): string | null',
      'documentId.length <= TEMP_STATUS_SESSION_DOCUMENT_ID_MAX_LENGTH',
      'isValidFirestoreDocumentId(documentId)',
      'const { tId: rawTenantId, sId: rawStoreId } = session',
      'const rawUserId = session.uId || session.user?.id;',
      'const tenantId = normalizeSessionDocumentId(rawTenantId);',
      'const storeId = normalizeSessionDocumentId(rawStoreId);',
      'const userId = normalizeSessionDocumentId(rawUserId);',
      'const sessionScope = resolveStorePermissionSessionScope(session);',
      'sessionScope.tenantScope.documentId !== tenantId',
      'sessionScope.storeScope.documentId !== storeId',
      'requireAnyStorePermissionForStoreData(',
      "getRateLimitForFeature('DATA_WRITE')",
      'const userRateLimitHash = hashPublicRateLimitValue(userId || \'unknown\');',
      'const storeRateLimitHash = hashPublicRateLimitValue(storeId);',
      'key: `temp-status:${userRateLimitHash}:${storeRateLimitHash}`',
      'readBoundedJsonBody(request, TEMP_STATUS_ACTION_MAX_BODY_BYTES',
      'RequestSchema.safeParse(body)',
      'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeId);',
      'const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantId);',
      'const transactionPermissionError = await db.runTransaction(async (transaction) => {',
      'transaction.get(storeRef)',
      'transaction.get(tenantRef)',
      'isTempStatusMutationScopeCurrent({',
      'createdBy: userId || null',
      'transaction.update(storeRef, storeUpdate);',
      'runStorePublicTruthPostCommitEffects({',
      "touchDigitalScreenContentVersionForStoreServer(targetStoreId, 'storeTempStatus')",
      'invalidateOwnerBusinessAssistantPacketCache',
      'effectsPending: postCommit.effectsPending, success: true',
    ],
    'temporary status session-scoped public truth write guard',
  );
  assert(!read('src/app/api/store/temp-status/route.ts').includes('key: `temp-status:${userId || session.user?.id}:${storeId}`'), 'temporary status must not store raw user/store IDs in rate-limit keys');
  assert(!read('src/app/api/store/temp-status/route.ts').includes('hashPublicRateLimitValue(userId || session.user?.id || \'unknown\')'), 'temporary status must not use raw session user IDs in rate-limit keys');

  assertIncludes(
    'src/app/api/store/public-api-key/route.ts',
    [
      'withAuth',
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
      'key: `api-key-mgmt:${storeRateLimitHash}`',
      'readBoundedJsonBody(request, PUBLIC_API_KEY_ACTION_MAX_BODY_BYTES',
      'RequestSchema.safeParse(body)',
      'const requestedTenantId = normalizeSessionDocumentId(validation.data.tenantId);',
      'const requestedStoreId = normalizeSessionDocumentId(validation.data.storeId);',
      'if (requestedTenantId !== tenantId || requestedStoreId !== storeId)',
      'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeId);',
      'const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantId);',
      'const transactionResult = await db.runTransaction(async (transaction) => {',
      'transaction.get(tenantRef)',
      'transaction.get(storeRef)',
      '!isMenuListPublicApiEntityEligible(tenantData)',
      '!isMenuListPublicApiEntityEligible(storeData)',
      'resolveMenuListPublicApiTenantDocumentId(storeData) !== tenantId',
      'transaction.update(storeRef,',
      'hashApiKey(apiKey)',
      'publicApi: {',
      'publicApi: admin.firestore.FieldValue.delete()',
      "logSecurityDiagnostic('public_api_key_generated'",
      "logSecurityDiagnostic('public_api_key_revoked'",
      "logSecurityFailure('public_api_key_management_failed'",
    ],
    'public pull API key management permission guard',
  );
  const publicApiKeyRoute = read('src/app/api/store/public-api-key/route.ts');
  assert(publicApiKeyRoute.indexOf('const rlResult = await checkRateLimit') < publicApiKeyRoute.indexOf('requireAnyStorePermissionForStoreData('), 'public API key management must rate-limit before current permission Firestore work');
  assert(publicApiKeyRoute.indexOf('RequestSchema.safeParse(body)') < publicApiKeyRoute.indexOf('requireAnyStorePermissionForStoreData('), 'public API key management must validate the bounded body before current permission Firestore work');
  assert(publicApiKeyRoute.indexOf('requireAnyStorePermissionForStoreData(') < publicApiKeyRoute.indexOf('transaction.update(storeRef,'), 'public API key management must authorize from the transaction snapshot before writing');
  assert(!publicApiKeyRoute.includes('key: `api-key-mgmt:${storeId}`'), 'public API key management must not store raw store IDs in rate-limit keys');
  assert(!publicApiKeyRoute.includes('await storeRef.update('), 'public API key management must not write outside its current-scope transaction');
  assert(!publicApiKeyRoute.includes("secureLog('[Public API] Key generated'"), 'public API key generation must not log raw store IDs');
  assert(!publicApiKeyRoute.includes("secureLog('[Public API] Key revoked'"), 'public API key revocation must not log raw store IDs');
}

function verifyPlatformAdminMutationBoundedBodies() {
  const adminSubdomainRenameRoute = read('src/app/api/admin/subdomains/rename/route.ts');
  assertIncludes(
    'src/app/api/admin/subdomains/rename/route.ts',
    [
      "requiredPlatformRole: 'PLATFORM'",
      "import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';",
      "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
      "import { checkRateLimit } from '@lib/rateLimit';",
      "import { getRateLimitForFeature } from '@lib/rateLimit/configs';",
      "import { hashPublicRateLimitValue } from 'src/middleware/publicApi';",
      'getBoundedSecurityRouteContext',
      "const ADMIN_SUBDOMAIN_RENAME_RATE_LIMIT_KEY = 'admin-subdomain-rename';",
      'function getAdminSubdomainRenameOperatorId(session: any): string',
      "return resolveCurrentSessionUserDocumentId(session) || 'invalid-platform-operator';",
      'function normalizeAdminSubdomainRenameScopeDocumentId(value: unknown): AdminSubdomainRenameScopeDocumentId | null',
      'Number.isSafeInteger(numericId)',
      'String(numericId) !== documentId',
      "getRateLimitForFeature('ADMIN_SUBDOMAIN_RENAME_MUTATION')",
      'hashPublicRateLimitValue(getAdminSubdomainRenameOperatorId(session))',
      'key: `${ADMIN_SUBDOMAIN_RENAME_RATE_LIMIT_KEY}:${operatorRateLimitHash}`',
      "logger.security('Rate Limit Exceeded - Admin Subdomain Rename'",
      'readBoundedJsonBody(request, ADMIN_SUBDOMAIN_RENAME_MAX_BODY_BYTES',
      'validateAPIInput(schema, bodyResult.data)',
      'const tenantScope = normalizeAdminSubdomainRenameScopeDocumentId(rawTenantId);',
      'const storeScope = normalizeAdminSubdomainRenameScopeDocumentId(storeId);',
      'const tenantId = tenantScope.numericId;',
      'const storeIdStr = storeScope.documentId;',
      'db.collection(DB_COLLECTIONS.STORES).doc(storeIdStr)',
      'normalizeStoreSummaryNumericAliases([store?.tenantId, store?.tId]) !== tenantScope.documentId',
      'normalizeStoreSummaryNumericAliases([freshStore.tenantId, freshStore.tId]) !== tenantScope.documentId',
      'const renameResult = await db.runTransaction(async (tx) => {',
      'const freshStoreSnap = await tx.get(storeRef);',
      'readSubdomainReservationInTransaction({',
      'writeCurrentSubdomainClaim(tx, reservation, now);',
      'writeRedirectSubdomainClaim({',
      'previousSubdomains: nextHistory',
      'previousSubdomainSlugs: nextHistorySlugs',
      'runStorePublicTruthPostCommitEffects({',
      'storeIds: [storeIdStr]',
      'revalidate: (tag) => revalidateTag(tag, { expire: 0 })',
      "touchDigitalScreenContentVersionForStoreServer(effectStoreId, 'adminSubdomainRename')",
      'invalidateOwnerBusinessAssistantPacketCache',
      "logSecurityFailure('admin_subdomain_rename_post_commit_effect_failed'",
      'derivedEffectsPending: postCommit.effectsPending',
      'failedEffectCount: postCommit.failedEffectCount',
      "logSecurityFailure('admin_subdomain_rename_failed'",
      "logger.security(\n                'Admin subdomain rename'",
      'auditIdPresent: auditRef.id.length > 0',
      'previousSubdomainLength: renameResult.previousSubdomain.length',
      'historyEntryCount: renameResult.historyEntryCount',
      'operatorUserId: getAdminSubdomainRenameOperatorId(session)',
      "getBoundedSecurityStringContext('storeId', storeIdStr)",
    ],
    'admin subdomain rename platform, public-cache, and bounded-diagnostics guard',
  );
  assertIncludes(
    'src/lib/rateLimit/configs.ts',
    [
      'ADMIN_SUBDOMAIN_RENAME_MUTATION: {',
      'limit: 10,',
      'window: 3600,',
      "description: 'Admin subdomain rename - 10 per hour per platform operator'",
    ],
    'admin subdomain rename rate-limit profile',
  );
  [
    ['URL routing README', read('__docs__/url-routing-architecture/README.md')],
    ['URL routing Firebase docs', read('__docs__/url-routing-architecture/url-routing-architecture_firebase.md')],
    ['Production-readiness audit', read('__docs__/audits/menulist-production-readiness-audit.md')],
    ['Changelog', read('__docs__/changelog.md')],
    ['Lowercase changelog', read('__docs__/changelog.md')],
  ].forEach(([label, content]) => {
    assert(content.includes('Admin Subdomain Rename Rate-Limit and Scope Boundary') || content.includes('Admin subdomain rename rate-limit and scope boundary'), `${label} documents admin subdomain rename rate-limit and scope boundary`);
    assert(content.includes('ADMIN_SUBDOMAIN_RENAME_MUTATION'), `${label} documents admin subdomain rename limiter profile`);
  });
  assert(
    !adminSubdomainRenameRoute.includes("secureError('[Admin] Subdomain rename failed'"),
    'admin subdomain rename must not raw-log route failures',
  );
  const successSecurityLogStart = adminSubdomainRenameRoute.indexOf("logger.security(\n                'Admin subdomain rename'");
  const successSecurityLogEnd = adminSubdomainRenameRoute.indexOf('\n\n            return NextResponse.json', successSecurityLogStart);
  const successSecurityLogBlock = successSecurityLogStart >= 0 && successSecurityLogEnd > successSecurityLogStart
    ? adminSubdomainRenameRoute.slice(successSecurityLogStart, successSecurityLogEnd)
    : '';
  assert(successSecurityLogBlock.length > 0, 'admin subdomain rename success security log block must be verifiable');
  assert(
    !successSecurityLogBlock.includes("storeId: storeIdStr")
      && !successSecurityLogBlock.includes("tenantId,")
      && !successSecurityLogBlock.includes("previousSubdomain: currentSubdomain")
      && !successSecurityLogBlock.includes("newSubdomain: proposed"),
    'admin subdomain rename success security log must not include raw store, tenant, or subdomain values',
  );
  assert(
    !successSecurityLogBlock.includes("operator: session?.user?.email")
      && !successSecurityLogBlock.includes("reason,")
      && !successSecurityLogBlock.includes("ackRef"),
    'admin subdomain rename success security log must not include raw operator, reason, or acknowledgement values',
  );
  assertOrder(
    'src/app/api/admin/subdomains/rename/route.ts',
    [
      "const rateLimitConfig = getRateLimitForFeature('ADMIN_SUBDOMAIN_RENAME_MUTATION');",
      'const operatorRateLimitHash = hashPublicRateLimitValue(getAdminSubdomainRenameOperatorId(session));',
      'const rateLimit = await checkRateLimit({',
      'if (!rateLimit.allowed) {',
      'readBoundedJsonBody(request, ADMIN_SUBDOMAIN_RENAME_MAX_BODY_BYTES',
      'validateAPIInput(schema, bodyResult.data)',
      'const tenantScope = normalizeAdminSubdomainRenameScopeDocumentId(rawTenantId);',
      'const storeScope = normalizeAdminSubdomainRenameScopeDocumentId(storeId);',
      'const storeSnap = await storeRef.get();',
      'const renameResult = await db.runTransaction(async (tx) => {',
      'const freshStoreSnap = await tx.get(storeRef);',
      'readSubdomainReservationInTransaction({',
    ],
    'admin subdomain rename limiter, bounded body, and ID normalization before transactional claim reads',
  );
  assert(!adminSubdomainRenameRoute.includes('key: `admin-subdomain-rename:${getAdminSubdomainRenameOperatorId(session)}`'), 'admin subdomain rename must not build rate-limit keys from raw operator IDs');
  assert(!adminSubdomainRenameRoute.includes('key: `admin-subdomain-rename:${session'), 'admin subdomain rename must not build rate-limit keys from raw session material');
  assert(!adminSubdomainRenameRoute.includes('const storeIdStr = String(storeId);'), 'admin subdomain rename must not coerce raw store IDs into doc refs');
  assert(!adminSubdomainRenameRoute.includes('db.doc(`${DB_COLLECTIONS.STORES}/${storeIdStr}`)'), 'admin subdomain rename must not build store refs with raw doc path strings');
  assert(!adminSubdomainRenameRoute.includes('Number(store?.tenantId) !== Number(tenantId)'), 'admin subdomain rename must not compare raw tenant numbers after validation');
  assert(!adminSubdomainRenameRoute.includes('store?.tenantId ?? store?.tId'), 'admin subdomain rename must reject conflicting persisted tenant aliases');
  assert(!adminSubdomainRenameRoute.includes('operatorUserId: session?.user?.id || null'), 'admin subdomain rename audit records must use the exact admitted platform actor identity');
  assert(!adminSubdomainRenameRoute.includes('session?.user?.email || \'platform\''), 'admin subdomain rename rate-limit and audit identity must not fall back to email');
  assert(!adminSubdomainRenameRoute.includes('const directCollision = await db'), 'admin subdomain rename must centralize direct collision reads in the transactional claim boundary');
  assert(!adminSubdomainRenameRoute.includes('const chainCollision = await db'), 'admin subdomain rename must centralize rename-history reads in the transactional claim boundary');
  assert(!adminSubdomainRenameRoute.includes('request.json()'), 'admin subdomain rename must not parse unbounded JSON');

  assertIncludes(
    'src/app/api/platform/entity-blocks/route.ts',
    [
      'withPlatformAuth',
      'getRateLimitForFeature(\'PLATFORM_ENTITY_BLOCK_MUTATION\')',
      'hashPublicRateLimitValue(getPlatformEntityBlockOperatorId(session))',
      'key: `${PLATFORM_ENTITY_BLOCK_RATE_LIMIT_KEY}:${operatorRateLimitHash}`',
      'logger.security(\'Rate Limit Exceeded - Platform Entity Blocks\'',
      'getBoundedSecurityRouteContext(session, request)',
      'readBoundedJsonBody(request, PLATFORM_ENTITY_BLOCK_MAX_BODY_BYTES',
      'EntityBlockRequestSchema.safeParse(bodyResult.data)',
      'type PlatformEntityBlockDocumentScope = {',
      'function normalizePlatformEntityBlockDocumentId(value: string | number | undefined | null): PlatformEntityBlockDocumentScope | null {',
      'value === value.trim() && isValidFirestoreDocumentId(value)',
      'typeof value !== \'number\' || !Number.isSafeInteger(value) || value <= 0',
      'function normalizePlatformEntityBlockNumericDocumentId(value: string | number | undefined | null): PlatformEntityBlockDocumentScope | null {',
      'String(numericId) !== scope.documentId',
      'function normalizePlatformEntityBlockTargetDocumentId(',
      "if (entityType === 'tenant' || entityType === 'store')",
      '}).superRefine((value, ctx) => {',
      'const entityScope = normalizePlatformEntityBlockTargetDocumentId(entityType, entityId);',
      'getEntityDocRef(db, entityType, entityScope.documentId)',
      'buildPlatformBlockDetails',
      'const tenantScope = entityScope;',
      'const MAX_TENANT_BLOCK_STORES = 200;',
      'async function updateTenantBlockStateAtomically({',
      'return db.runTransaction(async (transaction) => {',
      'transaction.get(docRef)',
      'transaction.get(summaryRef)',
      '...storeQueries.map((query) => transaction.get(query))',
      'hasExactStoredEntityIdentity(tenant, \'tenantId\', tenantScope)',
      'hasExactTenantOwnership(storeData, tenantScope)',
      'normalizePlatformEntityBlockTargetDocumentId(\'store\', store.id)',
      'transaction.update(docRef, { blocked, blockDetails });',
      'transaction.update(store.ref, {',
      'tenantBlockedSyncedAt: now',
      'transaction.set(summaryRef, {',
      'const result = await updateTenantBlockStateAtomically({',
      'runStorePublicTruthPostCommitEffects({',
      'storeIds: result.affectedStoreIds.map(String)',
      'platform_entity_block_tenant_post_commit_effect_failed',
      'const storeScope = entityScope;',
      'const freshStoreSnap = await transaction.get(docRef);',
      'hasExactStoredEntityIdentity(freshStore, \'storeId\', storeScope)',
      'storeIds: [storeScope.documentId]',
      'platform_entity_block_store_post_commit_effect_failed',
      'storesSummary',
      'authAdmin.updateUser',
      'authAdmin.revokeRefreshTokens',
      'const USER_AUTH_RECONCILIATION_MAX_ATTEMPTS = 5;',
      'const USER_AUTH_SYNC_LEASE_MS = 2 * 60 * 1000;',
      'const operationId = randomUUID();',
      'const started = await db.runTransaction(async (transaction) => {',
      'const freshUserSnap = await transaction.get(docRef);',
      'hasExactStoredUserIdentity(freshUser, entityScope)',
      'hasActiveUserAuthSyncLease(freshUser, now.toMillis())',
      'authSyncPending: {',
      'leaseExpiresAt: admin.firestore.Timestamp.fromMillis(now.toMillis() + USER_AUTH_SYNC_LEASE_MS)',
      'authSyncRevision: operationId',
      'transaction.update(docRef, updateData);',
      'async function reconcileUserBlockAuthState({',
      'freshUser.authSyncRevision !== revision',
      'authSyncPending: admin.firestore.FieldValue.delete()',
      'const reconciled = await reconcileUserBlockAuthState({',
      'if (reconciled.superseded) {',
      'await markUserAuthSyncFailed(db, docRef, operationId);',
      'logFirebaseAdminDiagnostic("platform_entity_block_auth_user_missing"',
      'getBoundedFirebaseAdminStringContext("userId", entity?.id)',
    ],
    'platform entity blocks body, auth, cache, and auth-state guard',
  );
  assertOrder(
    'src/app/api/platform/entity-blocks/route.ts',
    [
      'const rateLimitConfig = getRateLimitForFeature(\'PLATFORM_ENTITY_BLOCK_MUTATION\');',
      'const operatorRateLimitHash = hashPublicRateLimitValue(getPlatformEntityBlockOperatorId(session));',
      'const rateLimit = await checkRateLimit({',
      'if (!rateLimit.allowed) {',
      'readBoundedJsonBody(request, PLATFORM_ENTITY_BLOCK_MAX_BODY_BYTES',
      'EntityBlockRequestSchema.safeParse(bodyResult.data)',
      'const entityScope = normalizePlatformEntityBlockTargetDocumentId(entityType, entityId);',
      'const docRef = getEntityDocRef(db, entityType, entityScope.documentId);',
      'const entitySnap = await docRef.get();',
    ],
    'platform entity blocks bounded body before entity reads',
  );
  assert(!read('src/app/api/platform/entity-blocks/route.ts').includes("z.string().trim().min(1).max(160).refine(isValidFirestoreDocumentId, 'Invalid entity ID')"), 'platform entity blocks must not trim entity IDs before validation');
  assert(!read('src/app/api/platform/entity-blocks/route.ts').includes('getEntityDocRef(db, entityType, entityId)'), 'platform entity blocks must not build refs from raw entity IDs');
  assert(!read('src/app/api/platform/entity-blocks/route.ts').includes('batch.update(db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)), {'), 'platform entity blocks must not mirror tenant blocks through raw store IDs');
  assert(!read('src/app/api/platform/entity-blocks/route.ts').includes('db.batch()'), 'platform entity blocks must not split tenant/store/summary block state across non-atomic batches');
  assert(!read('src/app/api/platform/entity-blocks/route.ts').includes('await docRef.update(updateData)'), 'platform entity blocks must not change Firebase Auth before a durable user block revision');
  assert(!read('src/app/api/platform/entity-blocks/route.ts').includes("normalizePlatformEntityBlockTargetDocumentId('tenant', existingEntity.tenantId) || entityScope"), 'platform entity blocks must not redirect tenant propagation through a drifted persisted ID field');
  assert(!read('src/app/api/platform/entity-blocks/route.ts').includes("normalizePlatformEntityBlockTargetDocumentId('store', existingEntity.storeId) || entityScope"), 'platform entity blocks must not redirect store summary/cache effects through a drifted persisted ID field');
  assert(!read('src/app/api/platform/entity-blocks/route.ts').includes('key: `platform-entity-block:${getPlatformEntityBlockOperatorId(session)}`'), 'platform entity blocks must not build rate-limit keys from raw operator IDs');
  assert(!read('src/app/api/platform/entity-blocks/route.ts').includes('key: `platform-entity-block:${session'), 'platform entity blocks must not build rate-limit keys from raw session material');
  assert(!read('src/app/api/platform/entity-blocks/route.ts').includes('request.json()'), 'platform entity blocks must not parse unbounded JSON');
  assert(!read('src/app/api/platform/entity-blocks/route.ts').includes('logger.warn("[platform] Firebase Auth user missing during user block sync"'), 'platform entity blocks must not raw-log missing Firebase Auth users');
  assert(!read('src/app/api/platform/entity-blocks/route.ts').includes('userId: entity?.id'), 'platform entity blocks must not log raw user IDs for missing Firebase Auth users');
  assertIncludes(
    'src/lib/rateLimit/configs.ts',
    [
      'PLATFORM_ENTITY_BLOCK_MUTATION: {',
      'limit: 20,',
      'window: 3600,',
      "description: 'Platform entity block mutation - 20 per hour per platform operator'",
    ],
    'platform entity blocks rate-limit profile',
  );
  const platformEntityBlocksClient = read('src/database/platformEntityBlocks/index.ts');
  assertIncludes(
    'src/database/platformEntityBlocks/index.ts',
    [
      'PLATFORM_ENTITY_BLOCK_RESPONSE_JSON_MAX_BYTES = 64 * 1024',
      'PLATFORM_ENTITY_BLOCK_REQUEST_POLICY',
      "cache: 'no-store'",
      "credentials: 'same-origin'",
      "redirect: 'manual'",
      '...PLATFORM_ENTITY_BLOCK_REQUEST_POLICY',
      'readJsonResponseWithLimit<unknown>',
      'platform_entity_block_response_parse_failed',
      'platform_entity_block_response_rejected',
      'platform_entity_block_response_invalid',
      'parsePlatformEntityBlockResponse',
      'value.success !== true',
      'parsePlatformEntityBlockAcknowledgement(value.entity, expected)',
      'const entity = parsePlatformEntityBlockResponse(payload, responseContext);',
      'if (!entity) {',
      'return entity;',
      "new Error(PLATFORM_ENTITY_BLOCK_FAILED_MESSAGE)",
      'error.status = response.status',
      'error.code = code.slice(0, 64)',
    ],
    'platform entity blocks client response parsing and fixed failure text',
  );
  assert(!platformEntityBlocksClient.includes('payload?.error ||'), 'platform entity blocks client helper must not throw raw API response text');
  assert(!platformEntityBlocksClient.includes('response.json()'), 'platform entity blocks client helper must not parse unbounded response JSON');
  assert(!platformEntityBlocksClient.includes('.json().catch'), 'platform entity blocks client helper must not silently swallow malformed response JSON');
  assert(!platformEntityBlocksClient.includes('getResponseEntityId'), 'platform entity blocks client helper must use the exact acknowledgement parser');
  assert(!platformEntityBlocksClient.includes('String(expected.entityId)'), 'platform entity blocks client helper must not coerce untrusted response IDs');
  assertIncludes(
    'src/components/templates/platform/settings/EntityBlockSettings.tsx',
    [
      "message.error('Could not update block status')",
      "throw new Error('Could not update block status')",
    ],
    'platform entity blocks settings fixed failure text',
  );
  assert(!read('src/components/templates/platform/settings/EntityBlockSettings.tsx').includes('error instanceof Error ? error.message'), 'platform entity blocks settings must not show raw helper errors');
}

function verifyOpsMutationBoundedBodies() {
  assertIncludes(
    'src/app/api/ops/mute-alerts/route.ts',
    [
      "requiredPlatformRole: 'PLATFORM'",
      'const OPS_MUTE_ALERTS_MAX_BODY_BYTES = 1024;',
      'checkRateLimit({',
      'const operatorRateLimitHash = hashPublicRateLimitValue(operatorId);',
      'failClosedOnProviderError: true',
      'getCurrentPlatformUser(session)',
      'getBoundedSecurityRouteContext(session, request)',
      'readBoundedJsonBody(request, OPS_MUTE_ALERTS_MAX_BODY_BYTES',
      'MuteAlertsRequestSchema.safeParse(bodyResult.data)',
      'await opsRef.set(',
    ],
    'ops mute-alerts platform, rate, and body guard',
  );
  assertOrder(
    'src/app/api/ops/mute-alerts/route.ts',
    [
      'const operatorRateLimitHash = hashPublicRateLimitValue(operatorId);',
      'const rateLimit = await checkRateLimit({',
      'key: `ops-mute-alerts:${operatorRateLimitHash}`',
      'const currentPlatformUser = await getCurrentPlatformUser(session);',
      'readBoundedJsonBody(request, OPS_MUTE_ALERTS_MAX_BODY_BYTES',
      'MuteAlertsRequestSchema.safeParse(bodyResult.data)',
      'const db = getFirestore();',
      'await opsRef.set(',
    ],
    'ops mute-alerts limiter and bounded body before write',
  );

  assertIncludes(
    'src/app/api/ops/safe-mode/route.ts',
    [
      "requiredPlatformRole: 'PLATFORM'",
      'const OPS_SAFE_MODE_MAX_BODY_BYTES = 2 * 1024;',
      'checkRateLimit({',
      'const operatorRateLimitHash = hashPublicRateLimitValue(operatorId);',
      'failClosedOnProviderError: true',
      'getCurrentPlatformUser(session)',
      'getBoundedSecurityRouteContext(session, request)',
      'readBoundedJsonBody(request, OPS_SAFE_MODE_MAX_BODY_BYTES',
      'validateAPIInput(SafeModeRequestSchema, bodyResult.data)',
      "getBoundedOpsStringContext('reason', reason || 'Manual activation')",
      'firestoreAdmin.runTransaction(async (transaction) =>',
      'createAlert({',
    ],
    'ops safe-mode platform, rate, body, and alert guard',
  );
  assertOrder(
    'src/app/api/ops/safe-mode/route.ts',
    [
      'const operatorRateLimitHash = hashPublicRateLimitValue(operatorId);',
      'const rateLimit = await checkRateLimit({',
      'key: `ops-safe-mode:${operatorRateLimitHash}`',
      'const currentPlatformUser = await getCurrentPlatformUser(session);',
      'readBoundedJsonBody(request, OPS_SAFE_MODE_MAX_BODY_BYTES',
      'validateAPIInput(SafeModeRequestSchema, bodyResult.data)',
      "firestoreAdmin.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system')",
      'const changed = await firestoreAdmin.runTransaction(async (transaction) =>',
    ],
    'ops safe-mode limiter and bounded body before toggle write',
  );

  [
    {
      route: 'src/app/api/ops/owner-notifications/route.ts',
      cap: 'OWNER_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES',
      label: 'owner notification ops action',
      hashDeclaration: 'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      key: 'owner-notification-ops:${userRateLimitHash}',
      rawKey: 'key: `owner-notification-ops:${userId}`',
      validation: 'validateAPIInput(PostActionSchema, body)',
      firstWork: 'const db = getDbForProduct(validation.data.productId);',
    },
    {
      route: 'src/app/api/ops/platform-notifications/route.ts',
      cap: 'PLATFORM_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES',
      label: 'platform notification ops action',
      hashDeclaration: 'const operatorRateLimitHash = hashPublicRateLimitValue(sessionOperatorId);',
      key: 'platform-notification-ops:${operatorRateLimitHash}',
      rawKey: 'key: `platform-notification-ops:${operatorId}`',
      validation: 'validateAPIInput(PostActionSchema, body)',
      firstWork: 'if (validation.data.action === \'acknowledge\')',
    },
  ].forEach(({ route, cap, label, hashDeclaration, key, rawKey, validation, firstWork }) => {
    assertIncludes(
      route,
      [
        "requiredPlatformRole: 'PLATFORM'",
        `const ${cap} = 8 * 1024;`,
        'checkRateLimit({',
        hashDeclaration,
        'failClosedOnProviderError: true',
        'getCurrentPlatformUser(session)',
        `readBoundedJsonBody(request, ${cap}`,
        validation,
      ],
      `${label} platform, rate, and body guard`,
    );
    assertOrder(
      route,
      [
        hashDeclaration,
        'const rateLimit',
        `key: \`${key}\``,
        `readBoundedJsonBody(request, ${cap}`,
        validation,
        firstWork,
      ],
      `${label} limiter and bounded body before mutation work`,
    );
    assert(!read(route).includes(rawKey), `${label} must not store raw operator/user IDs in rate-limit keys`);
  });

  assert(!read('src/app/api/ops/mute-alerts/route.ts').includes('key: `ops-mute-alerts:${operatorId}`'), 'ops mute-alerts must not store raw operator IDs in rate-limit keys');
  assert(!read('src/app/api/ops/safe-mode/route.ts').includes('key: `ops-safe-mode:${operatorId}`'), 'ops safe-mode must not store raw operator IDs in rate-limit keys');
  assert(!read('src/app/api/ops/mute-alerts/route.ts').includes('buildSecurityContext'), 'ops mute-alerts security logs must not spread raw route security context');
  assert(!read('src/app/api/ops/safe-mode/route.ts').includes('buildSecurityContext'), 'ops safe-mode security logs must not spread raw route security context');
  assert(!read('src/app/api/ops/safe-mode/route.ts').includes("reason: reason || 'Manual activation'"), 'ops safe-mode security logs must not store raw activation reason text');
  [
    'src/app/api/ops/platform-notifications/route.ts',
    'src/app/api/ops/owner-notifications/route.ts',
  ].forEach((route) => {
    assertIncludes(
      route,
      [
        'getBoundedSecurityRouteContext(session, request)',
        "getBoundedOpsStringContext('action', body?.action)",
      ],
      `${route} bounded ops notification security logs`,
    );
    assert(!read(route).includes('buildSecurityContext'), `${route} security logs must not spread raw route security context`);
    assert(!read(route).includes("action: typeof body?.action === 'string' ? body.action : 'unknown'"), `${route} validation security logs must not store raw attempted action text`);
  });
  {
    const messagingOnboardingOpsRoute = read('src/app/api/ops/messaging-onboarding/route.ts');
    assert(!messagingOnboardingOpsRoute.includes('buildSecurityContext'), 'messaging onboarding ops route must not spread raw route security context');
    assert(!messagingOnboardingOpsRoute.includes('logger.error('), 'messaging onboarding ops route must use bounded ops diagnostics instead of raw logger.error');
  }

  [
    'src/app/api/ops/mute-alerts/route.ts',
    'src/app/api/ops/safe-mode/route.ts',
    'src/app/api/ops/owner-notifications/route.ts',
    'src/app/api/ops/platform-notifications/route.ts',
  ].forEach((route) => {
    assert(!read(route).includes('request.json()'), `${route} must not parse unbounded JSON`);
  });

  [
    ['src/app/api/ops/mute-alerts/route.ts', [
      'ops_mute_alerts_route_failed',
      'logOpsFailure',
      'getBoundedOpsStringContext',
      "getBoundedOpsStringContext('userId', getOperatorId(session))",
      "getBoundedOpsStringContext('requestPath', request.nextUrl.pathname)",
    ]],
    ['src/app/api/ops/safe-mode/route.ts', [
      'ops_safe_mode_route_failed',
      'logOpsFailure',
      'getBoundedOpsStringContext',
      "getBoundedOpsStringContext('userId', getOperatorId(session))",
      "getBoundedOpsStringContext('requestPath', request.nextUrl.pathname)",
    ]],
    ['src/app/api/ops/messaging-onboarding/route.ts', [
      'ops_messaging_onboarding_route_failed',
      'logOpsFailure',
      'getBoundedOpsStringContext',
      "getBoundedOpsStringContext('userId', getOperatorId(session))",
      "getBoundedOpsStringContext('requestPath', request.nextUrl.pathname)",
    ]],
    ['src/app/api/ops/platform-notifications/route.ts', [
      'platform_notifications_route_failed',
      'platform_notifications_action_failed',
      'logOpsFailure',
      'getBoundedOpsStringContext',
      "getBoundedOpsStringContext('userId', getOperatorId(session))",
      "getBoundedOpsStringContext('requestPath', request.nextUrl.pathname)",
      "getBoundedOpsStringContext('action', validation.data.action)",
      "getBoundedOpsStringContext('eventId', validation.data.eventId)",
    ]],
    ['src/app/api/ops/owner-notifications/route.ts', [
      'const SAFE_METADATA_PREVIEW_KEYS = new Set',
      'const BOUNDED_METADATA_PREVIEW_KEYS = new Set',
      'function getOwnerNotificationStringContext',
      'function getOwnerNotificationStoredTextSummary',
      'function getOwnerNotificationErrorSummary',
      "subject: getOwnerNotificationStoredTextSummary('Subject', data.subject)",
      "providerMessageId: getOwnerNotificationStoredTextSummary('Provider message id', data.providerMessageId)",
      'error: getOwnerNotificationErrorSummary(data.error)',
      'Object.assign(acc, getOwnerNotificationStringContext(key, value))',
      'owner_notifications_recipient_resolution_failed',
      'owner_notifications_route_failed',
      'owner_notifications_action_failed',
      'logOpsFailure',
      'getBoundedOpsStringContext',
      'function normalizeOwnerNotificationEventId(value: unknown): string | null',
      'function requireOwnerNotificationEventId(value: unknown): string',
      'const eventId = requireOwnerNotificationEventId(params.eventId);',
      'const normalizedEventId = requireOwnerNotificationEventId(eventId);',
      'const eventId = requireOwnerNotificationEventId(validation.data.eventId);',
      '.doc(eventId)',
      '.doc(normalizedEventId)',
      ".where('eventId', '==', eventId)",
      "getBoundedOpsStringContext('userId', getOperatorId(session))",
      "getBoundedOpsStringContext('requestPath', request.nextUrl.pathname)",
      "getBoundedOpsStringContext('productId', validation.data.productId)",
      "getBoundedOpsStringContext('eventId', normalizeOwnerNotificationEventId(validation.data.eventId))",
    ]],
  ].forEach(([route, required]) => {
    assertIncludes(route, required, `${route} bounded ops route diagnostics`);
  });

  [
    'src/app/api/ops/owner-notifications/route.ts',
  ].forEach((route) => {
    [
      '.doc(params.eventId)',
      ".where('eventId', '==', params.eventId)",
      'processOwnerNotificationEvent(validation.data.productId, validation.data.eventId)',
      'loadRawEvent(db, validation.data.productId, validation.data.eventId)',
      "getBoundedOpsStringContext('eventId', validation.data.eventId)",
    ].forEach((rawPattern) => {
      assert(!read(route).includes(rawPattern), `${route} must not keep raw owner notification event-id helper path ${rawPattern}`);
    });
  });

  [
    ['src/app/api/ops/mute-alerts/route.ts', "logger.error('[API /ops/mute-alerts] Error"],
    ['src/app/api/ops/safe-mode/route.ts', "logger.error('[API /ops/safe-mode] Error"],
    ['src/app/api/ops/platform-notifications/route.ts', "logger.error('[API /ops/platform-notifications] Error"],
    ['src/app/api/ops/platform-notifications/route.ts', "logger.error('[API /ops/platform-notifications] Action error"],
    ['src/app/api/ops/owner-notifications/route.ts', "logger.error('[API /ops/owner-notifications] Recipient resolution failed"],
    ['src/app/api/ops/owner-notifications/route.ts', "logger.error('[API /ops/owner-notifications] Error"],
    ['src/app/api/ops/owner-notifications/route.ts', "logger.error('[API /ops/owner-notifications] Action error"],
    ['src/app/api/ops/owner-notifications/route.ts', "error: typeof data.error === 'string' ? data.error : null"],
    ['src/app/api/ops/owner-notifications/route.ts', 'subject: data.subject || null'],
    ['src/app/api/ops/owner-notifications/route.ts', 'providerMessageId: data.providerMessageId || null'],
    ['src/app/api/ops/owner-notifications/route.ts', 'error: data.error || null'],
  ].forEach(([route, rawPattern]) => {
    assert(!read(route).includes(rawPattern), `${route} must not keep raw ops route logger pattern ${rawPattern}`);
  });
}

function verifyAuthClaimAndCacheBoundaries() {
  assertIncludes(
    'src/app/api/auth/set-claims/route.ts',
    [
      'withAuth',
      'const SET_CLAIMS_MAX_BODY_BYTES = 2 * 1024;',
      "import { checkRateLimit } from '@lib/rateLimit';",
      "import { getRateLimitForFeature } from '@lib/rateLimit/configs';",
      "import { hashPublicRateLimitValue } from 'src/middleware/publicApi';",
      "const SET_CLAIMS_RATE_LIMIT_KEY = 'auth-set-claims';",
      "const rateLimitConfig = getRateLimitForFeature('AUTH_CLAIM_SYNC');",
      'const sessionUserId = resolveCurrentSessionUserDocumentId(session);',
      'if (!sessionUserId)',
      'const setClaimsUserRateLimitHash = hashPublicRateLimitValue(sessionUserId);',
      'key: `${SET_CLAIMS_RATE_LIMIT_KEY}:${setClaimsUserRateLimitHash}`',
      "logger.security('Rate Limit Exceeded - Set Claims'",
      'readOptionalBoundedJsonBody(request, SET_CLAIMS_MAX_BODY_BYTES',
      'targetStoreId: z.number().int().positive().optional()',
      "normalizeStorePermissionScopeDocumentId",
      'const resolveClaimStoreScope',
      'const canAccessStore',
      'set_claims_store_switch_outside_user_stores_rejected',
      'set_claims_invalid_workspace_scope_rejected',
      'hasDefaultPlatformAccess',
      'const claimStoreScope = resolvedTargetStoreId && (hasDefaultPlatformAccess || canAccessTargetStore)',
      '? normalizeStorePermissionScopeDocumentId(resolvedTargetStoreId)',
      'resolveSetClaimsWorkspaceFromStore',
      '.doc(claimStoreScope.documentId)',
      'const claimTenantScope = canonicalWorkspace.tenantScope;',
      'tenantId: claimTenantScope.documentId',
      'storeId: claimStoreScope.documentId',
      "storeIds: productId === PRODUCT_IDS.ANSWERLATTICE\n                ? [claimStoreScope.documentId]",
      '...getStoreIdsClaim(dbUser),',
      'claimStoreScope.documentId',
      'normalizeEmail(validatedDefaultFirebaseUser.email) !== normalizeEmail(session.user.email)',
      'set_claims_uid_email_mismatch_rejected',
      'getSetClaimsLogContext',
      'logAuthDiagnostic',
      'logAuthFailure',
    ],
    'set-claims store switch and UID boundary',
  );
  const setClaimsRoute = read('src/app/api/auth/set-claims/route.ts');
  const setClaimsAuthFirebaseDoc = read('__docs__/auth/auth_firebase.md');
  const setClaimsFirebaseAuthSyncDoc = read('__docs__/auth/firebase-auth-sync.md');
  const setClaimsProductionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const setClaimsChangelog = read('__docs__/changelog.md');
  const setClaimsLowercaseChangelog = read('__docs__/changelog.md');
  assert(!setClaimsRoute.includes('secureLog('), 'set-claims route must use bounded auth diagnostics instead of raw secureLog');
  assert(!setClaimsRoute.includes('secureError('), 'set-claims route must use bounded auth diagnostics instead of raw secureError');
  assertOrder(
    'src/app/api/auth/set-claims/route.ts',
    [
      'if (!session?.user?.email)',
      "const rateLimitConfig = getRateLimitForFeature('AUTH_CLAIM_SYNC');",
      'const rateLimit = await checkRateLimit({',
      'readOptionalBoundedJsonBody(request, SET_CLAIMS_MAX_BODY_BYTES',
      'validateAPIInput(setClaimsSchema, body)',
      'getAuthUserByEmail(session.user.email)',
    ],
    'set-claims bounded optional body before user reads',
  );
  assert(!setClaimsRoute.includes('key: `auth-set-claims:${session.uId'), 'set-claims route must not store raw session user IDs in rate-limit keys');
  assert(!setClaimsRoute.includes('key: `auth-set-claims:${session.user.email'), 'set-claims route must not store raw emails in rate-limit keys');
  assert(!setClaimsRoute.includes('key: `${SET_CLAIMS_RATE_LIMIT_KEY}:${session'), 'set-claims route must build limiter keys from hashed identity material');
  assert(setClaimsAuthFirebaseDoc.includes('Set-claims rate-limit boundary'), 'Auth Firebase docs must record the set-claims rate-limit boundary');
  assert(setClaimsAuthFirebaseDoc.includes('one canonical target-store read for each valid sync attempt'), 'Auth Firebase docs must record canonical set-claims store verification');
  assert(setClaimsFirebaseAuthSyncDoc.includes('Set-claims rate-limit boundary'), 'Firebase Auth sync docs must record the set-claims rate-limit boundary');
  assert(setClaimsProductionAudit.includes('Set-claims rate-limit boundary checkpoint'), 'Production audit must record the set-claims rate-limit boundary');
  assert(setClaimsProductionAudit.includes('Set-claims canonical product workspace checkpoint'), 'Production audit must record canonical product workspace claim verification');
  assert(setClaimsChangelog.includes('Set-claims Rate-Limit Boundary'), 'Changelog must record the set-claims rate-limit boundary');
  assert(setClaimsLowercaseChangelog.includes('Set-claims Rate-Limit Boundary'), 'Lowercase changelog must record the set-claims rate-limit boundary');

  assertOrder(
    'src/app/api/revalidate/menu/route.ts',
    [
      'function normalizeStoreId',
      'return STORE_ID_PATTERN.test(normalized) ? normalized : null;',
      'sessionAccess = session ? resolveMenuRevalidationSessionAccess(session) : null;',
      "if (authMode === 'session' && !sessionAccess)",
      'const storeId = normalizeStoreId(body.storeId);',
      'if (!storeId)',
      'if (sessionAccess && !canMenuRevalidationSessionAccessStore(sessionAccess, storeId))',
      'tags = [`menu-store-${storeId}`, `store-${storeId}`, \'client-stores\', \'screen-data\'];',
    ],
    'menu revalidation store shorthand auth boundary',
  );

  assertIncludes(
    'src/app/api/revalidate/menu/route.ts',
    [
      'x-revalidate-secret',
      'const STORE_ID_PATTERN = /^\\d{1,20}$/;',
      'const VALID_TAG_PATTERNS = [/^menu-store-\\d{1,20}$/, /^store-\\d{1,20}$/];',
      'function getStoreIdFromCacheTag(tag: string): string | null',
      'function deriveSingleStoreIdFromTags(tags: string[]): string | undefined',
      'requestedStoreId = deriveSingleStoreIdFromTags(tags);',
      'z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)',
      'VALID_TAG_PATTERNS.some(pattern => pattern.test(tag))',
      'validTagPatterns: VALID_TAG_DESCRIPTIONS',
      'readBoundedJsonBody(request, MENU_REVALIDATE_MAX_BODY_BYTES',
      'if (sessionAccess && !sessionAccess.platformSession)',
      'return NextResponse.json({ error: "Forbidden" }, { status: 403 });',
      'tId: sessionAccess?.tenantId',
      'invalidateOwnerBusinessAssistantPacketCache',
    ],
    'menu revalidation explicit tag and assistant-cache boundary',
  );
  const revalidateMenuRoute = read('src/app/api/revalidate/menu/route.ts');
  const revalidateRateLimitConfigs = read('src/lib/rateLimit/configs.ts');
  const revalidateClientMenuFirebaseDoc = read('__docs__/client-menu/client-menu_firebase.md');
  const revalidateProductionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const revalidateChangelog = read('__docs__/changelog.md');
  const revalidateLowercaseChangelog = read('__docs__/changelog.md');
  assertIncludes(
    'src/app/api/revalidate/menu/route.ts',
    [
      'import { checkRateLimit } from "@lib/rateLimit";',
      'import { getRateLimitForFeature } from "@lib/rateLimit/configs";',
      'import { hashPublicRateLimitValue } from "../../../../middleware/publicApi";',
      "const MENU_REVALIDATE_RATE_LIMIT_KEY = 'menu-cache-revalidate';",
      'type MenuRevalidationAuthMode = \'secret\' | \'session\';',
      'function getMenuRevalidationRateLimitIdentity(',
      'async function applyMenuRevalidationRateLimit(',
      "getRateLimitForFeature('MENU_CACHE_REVALIDATION')",
      'key: `${MENU_REVALIDATE_RATE_LIMIT_KEY}:${authMode}:${sourceRateLimitHash}`',
      "logger.security('Rate Limit Exceeded - Menu Cache Revalidation'",
      'return handleRevalidateMenuCache(request, session, \'session\');',
      'return handleRevalidateMenuCache(request, null, \'secret\');',
    ],
    'menu revalidation route rate-limit boundary',
  );
  assertIncludes(
    'src/lib/rateLimit/configs.ts',
    [
      'MENU_CACHE_REVALIDATION: {',
      'limit: 600',
      'description: \'Menu cache revalidation - 600 per minute per source\'',
    ],
    'menu revalidation route rate-limit profile',
  );
  assertOrder(
    'src/app/api/revalidate/menu/route.ts',
    [
      'const rateLimitResponse = await applyMenuRevalidationRateLimit(request, session, authMode);',
      'if (rateLimitResponse) return rateLimitResponse;',
      'const bodyResult = await readBoundedJsonBody(request, MENU_REVALIDATE_MAX_BODY_BYTES',
      'for (const tag of tags) {',
      'revalidateTag(tag, { expire: 0 });',
      'invalidateOwnerBusinessAssistantPacketCache',
    ],
    'menu revalidation route rate limit before cache work',
  );
  assert(!revalidateMenuRoute.includes('key: `menu-cache-revalidate:${session'), 'menu revalidation route must not store raw session material in limiter keys');
  assert(!revalidateMenuRoute.includes('key: `menu-cache-revalidate:${request'), 'menu revalidation route must not store raw request material in limiter keys');
  assert(revalidateRateLimitConfigs.includes('MENU_CACHE_REVALIDATION'), 'rate limit configs must include menu cache revalidation profile');
  assert(revalidateClientMenuFirebaseDoc.includes('Menu cache revalidation rate-limit boundary'), 'Client Menu Firebase docs must record menu revalidation limiter');
  assert(revalidateProductionAudit.includes('Menu Cache Revalidation Rate-Limit Boundary checkpoint'), 'Production audit must record menu revalidation limiter');
  assert(revalidateChangelog.includes('Menu Cache Revalidation Rate-Limit Boundary'), 'Changelog must record menu revalidation limiter');
  assert(revalidateLowercaseChangelog.includes('Menu Cache Revalidation Rate-Limit Boundary'), 'Lowercase changelog must record menu revalidation limiter');
  assert(!revalidateMenuRoute.includes('tag.startsWith(prefix)'), 'menu revalidation must not accept arbitrary prefixed cache tags');
  assert(!revalidateMenuRoute.includes('sId: String(body.storeId).trim()'), 'menu revalidation assistant cache must use normalized store id');
  assert(!revalidateMenuRoute.includes('session?.user?.platformRole === \'PLATFORM\' || session?.platformRole === \'PLATFORM\''), 'menu revalidation must not elevate one conflicting platform-role alias');
  assert(!revalidateMenuRoute.includes('(session as any)?.tId || (session as any)?.user?.tenantId'), 'menu revalidation assistant cache must not select one conflicting tenant alias');
  assertIncludes(
    'src/lib/cache/menuRevalidationSessionAccess.ts',
    [
      "import { resolveExactSessionPlatformRole } from '@lib/auth/sessionPlatformRole';",
      'resolveStorePermissionSessionScope(source)',
      'const platformRole = resolveExactSessionPlatformRole(source);',
      'if (platformRole === null) return null;',
      'allowedStoreIds.add(normalized.documentId);',
      'return access.platformSession || access.allowedStoreIds.has(storeId);',
    ],
    'menu revalidation exact session access projection',
  );
}

function verifyPublicTruthMutationBoundedBodies() {
  const boundedRoutes = [
    'src/app/api/store/public-api-key/route.ts',
    'src/app/api/store/temp-status/route.ts',
    'src/app/api/compliance/route.ts',
    'src/app/api/domain/route.ts',
    'src/app/api/revalidate/menu/route.ts',
    'src/app/api/pos-sync/test/route.ts',
    'src/app/api/pos-sync/deliver/route.ts',
    'src/app/api/outlets/create/route.ts',
    'src/app/api/outlets/rename/route.ts',
    'src/app/api/outlets/deactivate/route.ts',
    'src/app/api/outlets/policy/route.ts',
    'src/app/api/tenants/name/route.ts',
    'src/app/api/projects/outlet-save/route.ts',
  ];

  boundedRoutes.forEach((route) => {
    const content = read(route);
    assert(!content.includes('request.json()'), `${route} must not parse unbounded JSON`);
    assert(content.includes('readBoundedJsonBody'), `${route} bounded JSON body reader`);
    assert(
      content.includes('if (bodyResult.ok === false) return bodyResult.response;')
        || content.includes('if (bodyResult.ok === false) return applyPrivateResponseHeaders(bodyResult.response);'),
      `${route} bounded JSON body guard`,
    );
  });

  assertIncludes(
    'src/app/api/tenants/name/route.ts',
    [
      'export const POST = withAuth(async (request, session) => {',
      'key: `tenant-name:${limiterHash}`',
      'failClosedOnProviderError: true',
      "rateLimit.reason === 'provider_unavailable'",
      "'Cache-Control': 'private, no-store, max-age=0'",
      "'X-Content-Type-Options': 'nosniff'",
      'readBoundedJsonBody(request, TENANT_NAME_MAX_BODY_BYTES',
      'validateAPIInput(schema, bodyResult.data)',
      'sessionScope.tenantDocumentId !== tenantDocumentId',
      'requireAnyStorePermissionForStoreData(',
      '.limit(MAX_TENANT_NAME_STORES + 1)',
      'const result = await db.runTransaction(async (transaction) => {',
      'transaction.get(tenantRef)',
      'transaction.get(storeQuery)',
      'transaction.update(tenantRef, {',
      ".doc('storesSummary')",
      'committed = true;',
    ],
    'tenant name atomic tenant/store/summary route boundary',
  );
  assertOrder(
    'src/app/api/tenants/name/route.ts',
    [
      'checkRateLimit({',
      'readBoundedJsonBody(request, TENANT_NAME_MAX_BODY_BYTES',
      'validateAPIInput(schema, bodyResult.data)',
      'const result = await db.runTransaction(async (transaction) => {',
    ],
    'tenant name limiter, bounded body and transaction ordering',
  );

  assertOrder(
    'src/app/api/domain/route.ts',
    [
      'const rateLimitResponse = await checkDomainManagementRateLimit(session, storeId);',
      'const bodyResult = await readBoundedJsonBody(request, DOMAIN_ACTION_MAX_BODY_BYTES',
      'const validation = AddDomainSchema.safeParse(body);',
      'const reservationResult = await db.runTransaction(async (transaction) => {',
      'readAuthorizedDomainStateInTransaction({',
      'const result = await addDomainToVercelProject(normalizedDomain);',
    ],
    'custom domain limiter and bounded body before authorization, claim, provider, or store work',
  );

  assertOrder(
    'src/app/api/compliance/route.ts',
    [
      'const scope = getComplianceSessionScope(session);',
      'const { sId, tId } = scope;',
      'const permissionError = await requireAnyStorePermission(',
      "const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');",
      'const userRateLimitHash = hashPublicRateLimitValue(session.uId || session.user?.id || \'unknown\');',
      'const storeRateLimitHash = hashPublicRateLimitValue(sId);',
      'key: `compliance:${userRateLimitHash}:${storeRateLimitHash}`',
      'const bodyResult = await readBoundedJsonBody(request, COMPLIANCE_OVERRIDE_MAX_BODY_BYTES',
      'const validation = OverrideSchema.safeParse(body);',
      'sanitizeComplianceContent(content)',
      'await saveComplianceOverrideServer(sId, tId, type, sanitized);',
    ],
    'compliance override permission, limiter, and bounded body ordering',
  );

  assertOrder(
    'src/app/api/store/temp-status/route.ts',
    [
      'if (!FEATURE_FLAGS.ENABLE_TEMP_STATUS)',
      'const tenantId = normalizeSessionDocumentId(rawTenantId);',
      'const storeId = normalizeSessionDocumentId(rawStoreId);',
      'const userId = normalizeSessionDocumentId(rawUserId);',
      "const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');",
      'const userRateLimitHash = hashPublicRateLimitValue(userId || \'unknown\');',
      'const storeRateLimitHash = hashPublicRateLimitValue(storeId);',
      'key: `temp-status:${userRateLimitHash}:${storeRateLimitHash}`',
      'const bodyResult = await readBoundedJsonBody(request, TEMP_STATUS_ACTION_MAX_BODY_BYTES',
      'const validation = RequestSchema.safeParse(body);',
      'const db = admin.firestore();',
      'const transactionPermissionError = await db.runTransaction(async (transaction) => {',
      'transaction.get(storeRef)',
      'transaction.get(tenantRef)',
      'requireAnyStorePermissionForStoreData(',
      'transaction.update(storeRef, storeUpdate);',
      'runStorePublicTruthPostCommitEffects({',
    ],
    'temporary status permission, limiter, bounded body, and cache ordering',
  );
  assert(!read('src/app/api/store/temp-status/route.ts').includes('await storeRef.update'), 'temporary status must not write after a stale out-of-transaction authorization read');

  assertOrder(
    'src/app/api/store/public-api-key/route.ts',
    [
      'const tenantId = normalizeSessionDocumentId(rawTenantId);',
      'const storeId = normalizeSessionDocumentId(rawStoreId);',
      'const storeRateLimitHash = hashPublicRateLimitValue(storeId);',
      'const rlResult = await checkRateLimit({',
      'key: `api-key-mgmt:${storeRateLimitHash}`',
      'failClosedOnProviderError: true',
      'const bodyResult = await readBoundedJsonBody(request, PUBLIC_API_KEY_ACTION_MAX_BODY_BYTES',
      'const validation = RequestSchema.safeParse(body);',
      'const db = admin.firestore();',
      'hashApiKey(apiKey)',
    ],
    'public API key limiter and bounded body ordering',
  );

  [
    {
      key: 'key: `outlet:${tenantRateLimitHash}`',
      rawKey: 'key: `outlet:${tenantId}`',
      route: 'src/app/api/outlets/create/route.ts',
    },
    {
      key: 'key: `outlet-rename:${tenantRateLimitHash}`',
      rawKey: 'key: `outlet-rename:${tenantId}`',
      route: 'src/app/api/outlets/rename/route.ts',
    },
    {
      key: 'key: `outlet-deactivate:${tenantRateLimitHash}`',
      rawKey: 'key: `outlet-deactivate:${tenantId}`',
      route: 'src/app/api/outlets/deactivate/route.ts',
    },
    {
      key: 'key: `outlet-policy:${tenantRateLimitHash}`',
      rawKey: 'key: `outlet-policy:${tenantId}`',
      route: 'src/app/api/outlets/policy/route.ts',
    },
  ].forEach(({ key, rawKey, route }) => {
    assertOrder(
      route,
      [
        'const scope = getOutletSessionScope(session);',
        'const { tenantId, storeId, tenantDocumentId, storeDocumentId } = scope;',
        'const tenantRateLimitHash = hashPublicRateLimitValue(tenantDocumentId);',
        'checkRateLimit({ key:',
        'const bodyResult = await readBoundedJsonBody(',
        'const v = validateAPIInput(schema, body);',
      ],
      `${route} outlet limiter before bounded body validation`,
    );
    assertIncludes(
      route,
      [
        'import { getOutletSessionScope',
        'const tenantRateLimitHash = hashPublicRateLimitValue(tenantDocumentId);',
        key,
      ],
      `${route} hashed tenant limiter key`,
    );
    assert(!read(route).includes(rawKey), `${route} must not store raw tenant IDs in rate-limit keys`);
    assert(!read(route).includes('const { tId: tenantId, sId: storeId } = session'), `${route} must not use raw session tenant/store destructuring`);
    assert(!read(route).includes('hashPublicRateLimitValue(tenantId)'), `${route} must not hash raw session tenant IDs`);
  });
  assertIncludes(
    'src/lib/multiOutlet/outletSessionScope.ts',
    [
      'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
      'export function normalizeOutletDocumentId(value: unknown): string | null',
      'return documentId === raw && isValidFirestoreDocumentId(documentId) ? documentId : null;',
      'export function getOutletSessionScope(session: unknown): OutletSessionScope | null',
      'normalized.every((value) => value?.documentId === first.documentId)',
      'tenantDocumentId: tenantId.documentId',
      'storeDocumentId: storeId.documentId',
    ],
    'multi-outlet session document ID helper',
  );
  assertIncludes(
    'src/app/api/outlets/rename/route.ts',
    [
      'const outletStoreIdStr = normalizeOutletDocumentId(outletStoreId);',
      'if (!outletStoreIdStr)',
      'const outletRef = db.doc(`${DB_COLLECTIONS.STORES}/${outletStoreIdStr}`);',
      'touchDigitalScreenContentVersionForStoreServer(storeId, \'outletRename\')',
    ],
    'outlet rename target document ID boundary',
  );
  assertIncludes(
    'src/app/api/outlets/deactivate/route.ts',
    [
      'const outletStoreDocumentId = normalizeOutletDocumentId(outletStoreId);',
      'if (!outletStoreDocumentId)',
      'const targetStoreRef = db.doc(`${DB_COLLECTIONS.STORES}/${outletStoreDocumentId}`);',
      'touchDigitalScreenContentVersionForStoreServer(effectStoreId, \'outletDeactivate\')',
    ],
    'outlet deactivate target document ID boundary',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'Outlet Lifecycle Session Document ID Boundary checkpoint',
      '`/api/outlets/create`, `/api/outlets/rename`, `/api/outlets/deactivate`, and `/api/outlets/policy`',
      'preserves the original numeric/string session values for existing numeric comparisons, equality filters, and billing logic',
      '`npm run verify:multi-location-boundary` and `npm run verify:menulist-api-tenant-safety` source-gate the shared outlet session scope helper',
    ],
    'production audit outlet lifecycle session document ID boundary evidence',
  );
  assertIncludes(
    '__docs__/multi-outlet-consistency/multi-outlet-consistency_impl.md',
    [
      'July 6, 2026 outlet lifecycle session document-ID boundary',
      '`src/lib/multiOutlet/outletSessionScope.ts`',
      'Existing numeric comparisons, tenant/store equality filters, billing quantity decisions, and valid route behavior are preserved',
    ],
    'multi-outlet implementation outlet lifecycle session document ID boundary evidence',
  );
  assertIncludes(
    '__docs__/multi-outlet-consistency/multi-outlet-consistency_firebase.md',
    [
      'Outlet lifecycle session ID admission is cost-neutral',
      'Rename and deactivate validate the body-provided outlet store ID before target outlet refs/cache work',
      'Firebase deploy requirement, or Vercel deploy action',
    ],
    'multi-outlet Firebase cost outlet lifecycle session document ID boundary evidence',
  );
  assertIncludes(
    '__docs__/multi-outlet-consistency/multi-outlet-consistency_impl.md',
    [
      'July 6, 2026 linked outlet save session store ID boundary',
      '`/api/projects/outlet-save` now validates authenticated session store scope',
      'Valid outlet and master-store saves keep the same behavior',
    ],
    'multi-outlet implementation linked outlet save session store boundary evidence',
  );
  assertIncludes(
    '__docs__/multi-outlet-consistency/multi-outlet-consistency_firebase.md',
    [
      'Linked outlet save session store ID boundary is cost-neutral',
      'normalizeMultiOutletNumericDocumentId()',
      'Firebase deploy requirement, or Vercel deploy action',
    ],
    'multi-outlet Firebase linked outlet save session store boundary evidence',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'Linked outlet save session store document-ID boundary checkpoint',
      'Number(session.sId || session.user?.storeId)',
      '`npm run verify:multi-location-boundary` and `npm run verify:menulist-api-tenant-safety` source-gate',
    ],
    'production audit linked outlet save session store boundary evidence',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Linked Outlet Save Session Store ID Boundary',
      'Linked outlet save caller-store scope is exact',
      'normalized session store scope',
    ],
    'primary changelog linked outlet save session store boundary entry',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Linked Outlet Save Session Store ID Boundary',
      'Linked outlet save caller-store scope is exact',
      'normalized session store scope',
    ],
    'mirrored changelog linked outlet save session store boundary entry',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Outlet Lifecycle Session Document ID Boundary',
      'validate session tenant/store IDs with the shared Firestore document-ID guard',
      '`npm run verify:multi-location-boundary` and `npm run verify:menulist-api-tenant-safety` now guard the shared outlet session scope helper',
    ],
    'primary changelog outlet lifecycle session document ID boundary entry',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Outlet Lifecycle Session Document ID Boundary',
      'validate session tenant/store IDs with the shared Firestore document-ID guard',
      '`npm run verify:multi-location-boundary` and `npm run verify:menulist-api-tenant-safety` now guard the shared outlet session scope helper',
    ],
    'mirrored changelog outlet lifecycle session document ID boundary entry',
  );

  assertOrder(
    'src/app/api/projects/outlet-save/route.ts',
    [
      'const bodyResult = await readBoundedJsonBody(request, OUTLET_SAVE_MAX_BODY_BYTES',
      'const validation = validateAPIInput(schema, body);',
      'normalizeMultiOutletProjectId(project.projectId)',
      'const outletSessionScope = getOutletSessionScope(session);',
      'const currentStoreScope = normalizeMultiOutletNumericDocumentId(outletSessionScope?.storeDocumentId);',
      'verifyTenantAccess(session, tenantId, currentStoreId, request)',
      'const userRateLimitHash = hashPublicRateLimitValue(session.uId || session.user?.id || "unknown");',
      'const projectRateLimitHash = hashPublicRateLimitValue(project.projectId);',
      'const rateLimit = await checkRateLimit({',
      'const callerStoreDocumentRef = db.doc(`${DB_COLLECTIONS.STORES}/${currentStoreId}`);',
      'savedProject = await db.runTransaction(async (transaction) => {',
      'transaction.get(callerStoreDocumentRef)',
      'const outletPolicy = requireLinkedOutletAuthority({',
    ],
    'linked outlet save bounded body before transaction-owned tenant/store reads',
  );
  assertIncludes(
    'src/app/api/projects/outlet-save/route.ts',
    [
      'key: `outlet-save:${userRateLimitHash}:${projectRateLimitHash}`',
    ],
    'linked outlet save hashed limiter key',
  );
  assert(!read('src/app/api/projects/outlet-save/route.ts').includes('key: `outlet-save:${session.uId || session.user?.id}:${project.projectId}`'), 'linked outlet save must not store raw user/project IDs in rate-limit keys');

  [
    'src/app/api/pos-sync/test/route.ts',
    'src/app/api/pos-sync/deliver/route.ts',
  ].forEach((route) => {
    assertOrder(
      route,
      [
        'const bodyResult = await readBoundedJsonBody(request, POS_SYNC_ACTION_MAX_BODY_BYTES',
        'const validation = validateAPIInput(schema, bodyResult.data);',
        'const tenantScope = normalizePosSyncNumericDocumentId(tenantId);',
        'const storeScope = normalizePosSyncNumericDocumentId(storeId);',
        'verifyTenantAccess(session, tenantId, storeId, request)',
        'const rlResult = await checkRateLimit({',
        'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId);',
        'const storeDoc = await storeRef.get();',
        'const targetPermissionError = requireAnyStorePermissionForStoreData(',
        'if (targetPermissionError) return targetPermissionError;',
        'validatePosSyncWebhookUrl',
        'validatePosSyncWebhookNetworkTarget',
      ],
      `${route} bounded POS body before provider/store work`,
    );
  });
}

function verifyLinkedOutletSaveResponseDiagnostics() {
  const responseHelper = read('src/lib/multiOutlet/linkedOutletSaveResponse.ts');
  const projectDal = read('src/database/projects/index.ts');
  const extractionApply = read('src/lib/extraction/applyChanges.ts');

  assert(responseHelper.includes('LINKED_OUTLET_SAVE_RESPONSE_JSON_MAX_BYTES = 2 * 1024 * 1024'), 'linked outlet save response helper must cap response JSON parsing at 2MB');
  assert(responseHelper.includes('LINKED_OUTLET_SAVE_REQUEST_POLICY'), 'linked outlet save helper must define the shared browser request policy');
  assert(responseHelper.includes("cache: 'no-store'"), 'linked outlet save requests must bypass browser cache');
  assert(responseHelper.includes("credentials: 'same-origin'"), 'linked outlet save requests must keep credentials same-origin');
  assert(responseHelper.includes("redirect: 'manual'"), 'linked outlet save requests must not follow redirects');
  assert(responseHelper.includes('readJsonResponseWithLimit<unknown>'), 'linked outlet save response helper must use the bounded response reader');
  assert(responseHelper.includes('isLinkedOutletSaveResponse'), 'linked outlet save response helper must expose the acknowledgement shape guard');
  assert(responseHelper.includes('data.success === true'), 'linked outlet save response helper must require success true');
  assert(responseHelper.includes('data.project.projectId === expectedProjectId'), 'linked outlet save response helper must require matching projectId');
  assert(responseHelper.includes('data.project.masterProjectId === expectedMasterProjectId'), 'linked outlet save response helper must require matching masterProjectId');

  assert(projectDal.includes('@lib/multiOutlet/linkedOutletSaveResponse'), 'project DAL must use the shared linked outlet save response helper');
  assert(projectDal.includes('LINKED_OUTLET_SAVE_REQUEST_POLICY'), 'project DAL must import the shared linked outlet save request policy');
  assert((projectDal.match(/\.\.\.LINKED_OUTLET_SAVE_REQUEST_POLICY/g) || []).length >= 2, 'project DAL linked outlet save/publish must spread the shared request policy');
  assert(projectDal.includes('readLinkedOutletSaveResponseJson(response)'), 'project DAL must parse linked outlet save responses through the shared bounded reader');
  assert(projectDal.includes('project_linked_outlet_response_parse_failed'), 'project DAL must log linked outlet save parse failures');
  assert(projectDal.includes('project_linked_outlet_save_response_invalid'), 'project DAL must log invalid linked outlet save acknowledgements');
  assert(projectDal.includes('project_linked_outlet_publish_response_invalid'), 'project DAL must log invalid linked outlet publish acknowledgements');
  assert(extractionApply.includes('expectedChangeCount?: number'), 'extraction apply must accept the owner-approved expected change count');
  assert(extractionApply.includes('isAcknowledgedApplyChangesResult'), 'extraction apply must expose the shared result acknowledgement guard');
  assert(extractionApply.includes('menu_review_apply_acknowledgement_mismatch'), 'extraction apply must log no-op or partial apply acknowledgement mismatches');
  assert(!projectDal.includes('const result = await response.json().catch(() => ({}))'), 'project DAL must not silently swallow linked outlet save response parsing failures');
  assert(!projectDal.includes('result.error || `Linked outlet save failed'), 'project DAL must not surface raw linked outlet save API error text');
  assert(!projectDal.includes('result.error || `Linked outlet publish failed'), 'project DAL must not surface raw linked outlet publish API error text');

  assert(extractionApply.includes('@lib/multiOutlet/linkedOutletSaveResponse'), 'extraction apply must use the shared linked outlet save response helper');
  assert(extractionApply.includes('LINKED_OUTLET_SAVE_REQUEST_POLICY'), 'extraction apply must import the shared linked outlet save request policy');
  assert(extractionApply.includes('...LINKED_OUTLET_SAVE_REQUEST_POLICY'), 'extraction apply linked outlet save must spread the shared request policy');
  assert(extractionApply.includes('readLinkedOutletSaveResponseJson(response)'), 'extraction apply must parse linked outlet save responses through the shared bounded reader');
  assert(extractionApply.includes('isLinkedOutletSaveResponse(payload, project.projectId, project.masterProjectId)'), 'extraction apply must require matching linked outlet save acknowledgement');
  assert(extractionApply.includes('menu_review_linked_outlet_save_response_parse_failed'), 'extraction apply must log linked outlet save parse failures');
  assert(extractionApply.includes('menu_review_linked_outlet_save_response_invalid'), 'extraction apply must log invalid linked outlet save acknowledgements');
  assert(extractionApply.includes('linked_outlet_project_save_response_invalid'), 'extraction apply must throw a bounded invalid-response code');
  assert(!extractionApply.includes('response.json().catch(() => ({}))'), 'extraction apply must not silently swallow linked outlet save response parsing failures');
  assert(!extractionApply.includes('result.error ||'), 'extraction apply must not surface raw linked outlet save API error text');
}

function verifyTempStatusClientResponseDiagnostics() {
  const authBrowserRequestPolicy = read('src/lib/auth/browserRequestPolicy.ts');
  const tempStatusClient = read('src/lib/tempStatus/clientResponse.ts');
  const desktopTempStatus = read('src/components/templates/main-app/businessSettings/TempStatusCard.tsx');
  const mobileTempStatus = read('src/components/mobile/screens/MobileTempStatusScreen.tsx');
  const mobileHours = read('src/components/mobile/screens/MobileHoursScreen.tsx');

  assert(authBrowserRequestPolicy.includes("cache: 'no-store' as RequestCache"), 'temp status shared browser request policy must bypass browser caches');
  assert(authBrowserRequestPolicy.includes("credentials: 'same-origin' as RequestCredentials"), 'temp status shared browser request policy must keep credentials same-origin');
  assert(authBrowserRequestPolicy.includes("redirect: 'manual' as RequestRedirect"), 'temp status shared browser request policy must not follow redirects');

  assert(tempStatusClient.includes('TEMP_STATUS_RESPONSE_JSON_MAX_BYTES = 8 * 1024'), 'temp status client response parser must cap response JSON parsing');
  assert(tempStatusClient.includes('readJsonResponseWithLimit<unknown>'), 'temp status client response parser must use the bounded response reader');
  assert(tempStatusClient.includes('temp_status_response_parse_failed'), 'temp status client response parser must log malformed or oversized responses');
  assert(tempStatusClient.includes('temp_status_response_invalid'), 'temp status client response parser must log invalid successful envelopes');
  assert(tempStatusClient.includes('isTempStatusSuccessResponse'), 'temp status client response parser must validate success envelopes');
  assert(tempStatusClient.includes('value.success === true'), 'temp status client response parser must require success true');
  assert(tempStatusClient.includes("new Error('Temporary status request failed')"), 'temp status client errors must use fixed local error text');
  assert(tempStatusClient.includes('error.status = response.status'), 'temp status client errors must preserve status-only diagnostics');
  assert(tempStatusClient.includes('error.code = code.slice(0, 64)'), 'temp status client errors may keep bounded response codes');
  assert(!tempStatusClient.includes('response.json()'), 'temp status client response parser must not use direct unbounded response parsing');
  assert(!tempStatusClient.includes('.json().catch'), 'temp status client response parser must not silently swallow malformed response JSON');

  assert((desktopTempStatus.match(/readTempStatusResponse/g) || []).length >= 3, 'desktop temp status card must use the shared parser for import, set, and clear');
  assert(desktopTempStatus.includes('desktop_temp_status_set_failed'), 'desktop temp status set failures must use bounded diagnostics');
  assert(desktopTempStatus.includes('desktop_temp_status_clear_failed'), 'desktop temp status clear failures must use bounded diagnostics');
  assert(desktopTempStatus.includes("setError('Failed to set status')"), 'desktop temp status set fallback must remain fixed local copy');
  assert(desktopTempStatus.includes("setError('Failed to clear status')"), 'desktop temp status clear fallback must remain fixed local copy');
  assert(desktopTempStatus.includes('AUTH_BROWSER_REQUEST_POLICY'), 'desktop temp status requests must use the shared authenticated browser request policy');
  assert((desktopTempStatus.match(/fetch\('\/api\/store\/temp-status'/g) || []).length >= 2, 'desktop temp status requests must call the status route');
  assert((desktopTempStatus.match(/\.\.\.AUTH_BROWSER_REQUEST_POLICY/g) || []).length >= 2, 'desktop temp status mutations must spread the shared request policy');
  assert(!desktopTempStatus.includes("fetch('/api/store/temp-status', {\n                cache: 'no-store'"), 'desktop temp status must not reintroduce inline request policy');
  assert(!desktopTempStatus.includes('res.json()'), 'desktop temp status card must not use direct response parsing');
  assert(!desktopTempStatus.includes('.json().catch'), 'desktop temp status card must not silently swallow malformed response JSON');
  assert(!desktopTempStatus.includes('data.error ||'), 'desktop temp status card must not surface raw API response error text');
  assert(!desktopTempStatus.includes('err.message ||'), 'desktop temp status card must not surface raw exception messages');

  assert((mobileTempStatus.match(/readTempStatusResponse/g) || []).length >= 3, 'mobile temp status screen must use the shared parser for import, set, and clear');
  assert(mobileTempStatus.includes('mobile_temp_status_set_failed'), 'mobile temp status set failures must use bounded diagnostics');
  assert(mobileTempStatus.includes('mobile_temp_status_clear_failed'), 'mobile temp status clear failures must use bounded diagnostics');
  assert(mobileTempStatus.includes('AUTH_BROWSER_REQUEST_POLICY'), 'mobile temp status requests must use the shared authenticated browser request policy');
  assert((mobileTempStatus.match(/fetch\('\/api\/store\/temp-status'/g) || []).length >= 2, 'mobile temp status requests must call the status route');
  assert((mobileTempStatus.match(/\.\.\.AUTH_BROWSER_REQUEST_POLICY/g) || []).length >= 2, 'mobile temp status mutations must spread the shared request policy');
  assert(!mobileTempStatus.includes("fetch('/api/store/temp-status', {\n                cache: 'no-store'"), 'mobile temp status must not reintroduce inline request policy');
  assert(!mobileTempStatus.includes('res.json()'), 'mobile temp status screen must not use direct response parsing');
  assert(!mobileTempStatus.includes('.json().catch'), 'mobile temp status screen must not silently swallow malformed response JSON');
  assert(mobileTempStatus.includes('return <MobileTempStatusScreenContent key={scopeKey} {...props} />;'), 'Mobile Temporary Status must remount drafts on exact tenant/store changes');
  assert(mobileTempStatus.includes('tempStatusActionInFlightRef.current'), 'Mobile Temporary Status must reject duplicate set/clear actions before React state settles');
  assert(mobileTempStatus.includes('isExpectedStoreScope(expectedTenantId, expectedStoreId)'), 'Mobile Temporary Status must recheck exact scope after confirmation and network stages');
  assert((mobileTempStatus.match(/prev === optimisticStoreDetails/g) || []).length >= 2, 'Mobile Temporary Status rollback must require exact optimistic attempt ownership');

  assert((mobileHours.match(/readTempStatusResponse/g) || []).length >= 4, 'mobile Today/Hours temp status actions must use the shared parser for import, close-today, set, and clear');
  assert(mobileHours.includes('mobile_today_close_today_failed'), 'mobile Today closed-today failures must use bounded diagnostics');
  assert(mobileHours.includes('mobile_today_temp_status_set_failed'), 'mobile Today temp status set failures must use bounded diagnostics');
  assert(mobileHours.includes('mobile_today_temp_status_clear_failed'), 'mobile Today temp status clear failures must use bounded diagnostics');
  assert(mobileHours.includes('AUTH_BROWSER_REQUEST_POLICY'), 'mobile Today/Hours temp status requests must use the shared authenticated browser request policy');
  assert((mobileHours.match(/fetch\('\/api\/store\/temp-status'/g) || []).length >= 3, 'mobile Today/Hours temp status requests must call the status route');
  assert((mobileHours.match(/\.\.\.AUTH_BROWSER_REQUEST_POLICY/g) || []).length >= 3, 'mobile Today/Hours temp status mutations must spread the shared request policy');
  assert(!mobileHours.includes("fetch('/api/store/temp-status', {\n                cache: 'no-store'"), 'mobile Today/Hours temp status must not reintroduce inline request policy');
  assert(!mobileHours.includes('res.json()'), 'mobile Today/Hours temp status actions must not use direct response parsing');
  assert(!mobileHours.includes('.json().catch'), 'mobile Today/Hours temp status actions must not silently swallow malformed response JSON');
  assert(!mobileHours.includes('if (!res.ok) throw new Error();'), 'mobile Today/Hours temp status actions must validate successful response envelopes');
}

function verifyHelpCenterSearchClientResponseDiagnostics() {
  const searchResponse = read('src/lib/search/helpCenterSearchResponse.ts');
  const helpChatApi = read('src/components/templates/main-app/helpChat/api.ts');
  const aiSearchModal = read('src/components/organisms/AISearchModal/AiSearchBarComponent.tsx');

  assert(searchResponse.includes('HELP_CENTER_SEARCH_RESPONSE_JSON_MAX_BYTES = 1024 * 1024'), 'help center search response parser must cap response JSON parsing at 1MB');
  assert(searchResponse.includes('HELP_CENTER_SEARCH_REQUEST_POLICY'), 'help center search helper must expose a shared browser request policy');
  assert(searchResponse.includes("cache: 'no-store'"), 'help center search request policy must bypass browser cache');
  assert(searchResponse.includes("credentials: 'same-origin'"), 'help center search request policy must use same-origin credentials');
  assert(searchResponse.includes("redirect: 'manual'"), 'help center search request policy must not follow redirects');
  assert(searchResponse.includes('readJsonResponseWithLimit<unknown>'), 'help center search response parser must use the bounded response reader');
  assert(searchResponse.includes('help_center_search_response_parse_failed'), 'help center search response parser must log malformed or oversized responses');
  assert(searchResponse.includes('help_center_search_response_invalid'), 'help center search response parser must log invalid successful envelopes');
  assert(searchResponse.includes('isHelpCenterSearchResponse'), 'help center search response parser must expose a response shape guard');
  assert(searchResponse.includes('typeof value.id === \'string\''), 'help center search response parser must require a search history id');
  assert(searchResponse.includes('typeof value.craftedAnswer === \'string\''), 'help center search response parser must require crafted answer text');
  assert(searchResponse.includes('Array.isArray(value.references)'), 'help center search response parser must require a references array');
  assert(searchResponse.includes('value.references.every(isReferenceArticle)'), 'help center search response parser must validate returned references');
  assert(searchResponse.includes('typeof value.categoryId === \'string\''), 'help center search references must include category ids for UI enrichment');
  assert(searchResponse.includes('new Error(HELP_CENTER_SEARCH_FAILED_MESSAGE)'), 'help center search client errors must use fixed local error text');
  assert(searchResponse.includes('error.status = response.status'), 'help center search client errors must preserve status-only diagnostics');
  assert(searchResponse.includes('error.code = code.slice(0, 64)'), 'help center search client errors may keep bounded response codes');
  assert(!searchResponse.includes('response.json()'), 'help center search response parser must not use direct unbounded response parsing');
  assert(!searchResponse.includes('.json().catch'), 'help center search response parser must not silently swallow malformed response JSON');

  assert(helpChatApi.includes("readHelpCenterSearchResponse(response, 'help_chat')"), 'help chat API client must use the shared help center search response parser');
  assert(helpChatApi.includes('HELP_CENTER_SEARCH_REQUEST_POLICY'), 'help chat API client must use the shared help center search request policy');
  assert(helpChatApi.includes('...HELP_CENTER_SEARCH_REQUEST_POLICY'), 'help chat API client must spread the shared help center search request policy');
  assert(!helpChatApi.includes('response.json()'), 'help chat API client must not use direct search response parsing');
  assert(!helpChatApi.includes('.json().catch'), 'help chat API client must not silently swallow malformed search responses');
  assert(!helpChatApi.includes('data.error ||'), 'help chat API client must not surface raw search API error text');

  assert(aiSearchModal.includes("readHelpCenterSearchResponse(response, 'ai_search_modal')"), 'AI search modal must use the shared help center search response parser');
  assert(aiSearchModal.includes('HELP_CENTER_SEARCH_REQUEST_POLICY'), 'AI search modal must use the shared help center search request policy');
  assert(aiSearchModal.includes('...HELP_CENTER_SEARCH_REQUEST_POLICY'), 'AI search modal must spread the shared help center search request policy');
  assert(aiSearchModal.includes('getHelpCenterSearchClientFailureMessage(error, AI_SEARCH_FAILED_MESSAGE)'), 'AI search modal must keep fixed local fallback copy');
  assert(aiSearchModal.includes('data.references.map'), 'AI search modal must only map references after response shape validation');
  assert(!aiSearchModal.includes('response.json()'), 'AI search modal must not use direct search response parsing');
  assert(!aiSearchModal.includes('.json().catch'), 'AI search modal must not silently swallow malformed search responses');
}

function verifyDeploymentVersionResponseDiagnostics() {
  const versionResponse = read('src/lib/deployment/versionResponse.ts');
  const ownerUpdatePrompt = read('src/components/common/OwnerAppUpdatePrompt.tsx');
  const deploymentBuildBadge = read('src/components/common/DeploymentBuildBadge.tsx');
  const errorReportButton = read('src/components/shared/debug/ErrorReportButton.tsx');

  assert(versionResponse.includes('DEPLOYMENT_VERSION_RESPONSE_JSON_MAX_BYTES = 8 * 1024'), 'deployment version response parser must cap response JSON parsing at 8KB');
  assert(versionResponse.includes('DEPLOYMENT_VERSION_REQUEST_POLICY'), 'deployment version helper must export a shared request policy');
  assert(versionResponse.includes("cache: 'no-store'"), 'deployment version request policy must disable browser caching');
  assert(versionResponse.includes("credentials: 'same-origin'"), 'deployment version request policy must keep same-origin credentials');
  assert(versionResponse.includes("redirect: 'manual'"), 'deployment version request policy must use manual redirect handling');
  assert(versionResponse.includes('readJsonResponseWithLimit<unknown>'), 'deployment version response parser must use the bounded response reader');
  assert(versionResponse.includes('deployment_version_response_parse_failed'), 'deployment version response parser must log malformed or oversized responses');
  assert(versionResponse.includes('deployment_version_response_invalid'), 'deployment version response parser must log invalid successful envelopes');
  assert(versionResponse.includes('isDeploymentVersionResponse'), 'deployment version response parser must expose a response shape guard');
  assert(versionResponse.includes('isOptionalString(value.buildId)'), 'deployment version response parser must validate buildId type');
  assert(versionResponse.includes('isOptionalString(value.shortBuildId)'), 'deployment version response parser must validate shortBuildId type');
  assert(versionResponse.includes('isOptionalString(value.buildCreatedAt)'), 'deployment version response parser must validate buildCreatedAt type');
  assert(versionResponse.includes('isOptionalString(value.deploymentUrl)'), 'deployment version response parser must validate deploymentUrl type');
  assert(versionResponse.includes('isOptionalString(value.env)'), 'deployment version response parser must validate env type');
  assert(!versionResponse.includes('response.json()'), 'deployment version response parser must not use direct unbounded response parsing');
  assert(!versionResponse.includes('.json().catch'), 'deployment version response parser must not silently swallow malformed response JSON');

  assert(ownerUpdatePrompt.includes("readDeploymentVersionResponse(response, 'owner_update_prompt')"), 'owner update prompt must use the shared deployment version response parser');
  assert(ownerUpdatePrompt.includes('DEPLOYMENT_VERSION_REQUEST_POLICY'), 'owner update prompt must use the shared deployment version request policy');
  assert(ownerUpdatePrompt.includes("fetch('/api/version', DEPLOYMENT_VERSION_REQUEST_POLICY)"), 'owner update prompt must apply the shared deployment version request policy');
  assert(ownerUpdatePrompt.includes('type DeploymentVersionResponse'), 'owner update prompt must use the shared deployment version response type');
  assert(!ownerUpdatePrompt.includes('response.json()'), 'owner update prompt must not use direct version response parsing');
  assert(!ownerUpdatePrompt.includes('.json().catch'), 'owner update prompt must not silently swallow malformed version responses');

  assert(deploymentBuildBadge.includes("readDeploymentVersionResponse(res, 'deployment_build_badge')"), 'deployment build badge must use the shared deployment version response parser');
  assert(deploymentBuildBadge.includes('DEPLOYMENT_VERSION_REQUEST_POLICY'), 'deployment build badge must use the shared deployment version request policy');
  assert(deploymentBuildBadge.includes("fetch('/api/version', DEPLOYMENT_VERSION_REQUEST_POLICY)"), 'deployment build badge must apply the shared deployment version request policy');
  assert(!deploymentBuildBadge.includes('res.json()'), 'deployment build badge must not use direct version response parsing');
  assert(!deploymentBuildBadge.includes('.json().catch'), 'deployment build badge must not silently swallow malformed version responses');

  assert(errorReportButton.includes("readDeploymentVersionResponse(response, 'error_report')"), 'error report button must use the shared deployment version response parser');
  assert(errorReportButton.includes('DEPLOYMENT_VERSION_REQUEST_POLICY'), 'error report button must use the shared deployment version request policy');
  assert(errorReportButton.includes("fetch('/api/version', DEPLOYMENT_VERSION_REQUEST_POLICY)"), 'error report button must apply the shared deployment version request policy');
  assert(errorReportButton.includes('return getClientBuildDiagnostics()'), 'error report button must preserve client env fallback when version response cannot be trusted');
  assert(errorReportButton.includes('copyRuntimeTextToClipboard(diagnostics)'), 'error report diagnostic copy must use the acknowledged runtime clipboard helper');
  assert(errorReportButton.includes('hasClipboardWrite: hasRuntimeClipboardWrite()'), 'error report diagnostic copy failure must include clipboard support metadata');
  assert(errorReportButton.includes('hasCopyFallback: hasRuntimeCopyFallback()'), 'error report diagnostic copy failure must include fallback support metadata');
  assert(errorReportButton.includes('diagnosticsLength: diagnostics.length'), 'error report diagnostic copy failure must log bounded diagnostics length only');
  assert(!errorReportButton.includes('response.json()'), 'error report button must not use direct version response parsing');
  assert(!errorReportButton.includes('.json().catch'), 'error report button must not silently swallow malformed version responses');
  assert(!errorReportButton.includes('await navigator.clipboard.writeText(diagnostics)'), 'error report diagnostic copy must not use unguarded Clipboard API success');
}

function verifyPublicCustomerSignalBoundedBodies() {
  const analyticsRoute = read('src/app/api/public/analytics/track/route.ts');
  const analyticsServerWrite = read('src/lib/analytics/serverWrite.ts');
  const analyticsImplDoc = read('__docs__/client-menu/analytics-tracking/_impl.md');
  const analyticsFirebaseDoc = read('__docs__/client-menu/analytics-tracking/analytics-tracking_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const lowercaseChangelog = read('__docs__/changelog.md');
  assert(!analyticsRoute.includes('req.json()'), 'public analytics track must not parse unbounded JSON');
  assertOrder(
    'src/app/api/public/analytics/track/route.ts',
    [
      'const storeSnap = await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeId).get();',
      'const storeTenantScope = normalizeMenuListPublicEntityIdentityAliases([',
      'storeTenantScope?.documentId !== tenantId',
      'normalizeMenuListPublicEntityIdentityAliases(storeIdentityAliases)?.documentId !== storeId',
      'if (store.active === false || store.deleted === true || isPlatformEntityBlocked(store)) return null;',
      'const tenantSnap = await firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc(tenantId).get();',
      'const tenant = tenantSnap.data();',
      'const tenantIdentityAliases = [tenant?.tenantId, tenant?.tId]',
      'normalizeMenuListPublicEntityIdentityAliases(tenantIdentityAliases)?.documentId !== tenantId',
      'tenant?.active === false',
      'tenant?.deleted === true',
      'isPlatformEntityBlocked(tenant)',
      'const target: ValidatedAnalyticsTarget = {',
    ],
    'public analytics target eligibility before preferences',
  );
  assertOrder(
    'src/app/api/public/analytics/track/route.ts',
    [
      "checkPublicRateLimit(req, 'PUBLIC_ANALYTICS')",
      'readBoundedJsonBody(req, PUBLIC_ANALYTICS_TRACK_MAX_BODY_BYTES',
      'AnalyticsTrackSchema.safeParse(bodyResult.data)',
      'const tenantScope = normalizePublicAnalyticsNumericDocumentId(data.tenantId);',
      'const storeScope = normalizePublicAnalyticsNumericDocumentId(data.storeId);',
      'validateAnalyticsTarget(tenantId, storeId, data.projectId)',
      'writePublicAnalyticsEventAdmin({',
    ],
    'public analytics bounded body before target validation/write',
  );
  assertIncludes(
    'src/app/api/public/analytics/track/route.ts',
    [
      "import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from '@lib/analytics/analyticsDiagnostics';",
      "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
      "import { normalizeMenuListPublicEntityIdentityAliases } from '@lib/publicTruth/entityEligibility';",
      'function normalizePublicAnalyticsNumericDocumentId(value: unknown): PublicAnalyticsNumericDocumentId | null',
      'documentId !== raw || !/^\\d+$/.test(documentId) || !isValidFirestoreDocumentId(documentId)',
      'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
      'const tenantId = tenantScope.documentId;',
      'const storeId = storeScope.documentId;',
      "projectId: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/).refine(isValidFirestoreDocumentId, 'Invalid project ID'),",
      "logAnalyticsFailure('public_analytics_track_failed'",
      '.collection(DB_COLLECTIONS.TENANTS)',
      'const tenant = tenantSnap.data();',
      'tenant?.active === false',
      'tenant?.deleted === true',
      'isPlatformEntityBlocked(tenant)',
      "getBoundedAnalyticsStringContext('tenantId', tenantId)",
      "getBoundedAnalyticsStringContext('storeId', storeId)",
      "getBoundedAnalyticsStringContext('projectId', data.projectId)",
      'updateFieldCount: Object.keys(data.updateData).length',
      'hasRequestedDate: Boolean(data.dateString)',
    ],
    'public analytics bounded diagnostics',
  );
  assert(!analyticsRoute.includes("import { secureError } from '@lib/security/secureLogger';"), 'public analytics track must use bounded analytics diagnostics');
  assert(!analyticsRoute.includes('secureError('), 'public analytics track must not pass raw route failures to secureError');
  assert(!analyticsRoute.includes('new Error(String(error))'), 'public analytics track must not stringify thrown values into logs');
  assert(!analyticsRoute.includes('error instanceof Error ? error'), 'public analytics track must not pass raw exceptions to secure logging');
  assert(!analyticsRoute.includes('const tenantId = String(data.tenantId);'), 'public analytics track must not build tenant refs from raw parsed tenant IDs');
  assert(!analyticsRoute.includes('const storeId = String(data.storeId);'), 'public analytics track must not build store refs from raw parsed store IDs');
  assert(!analyticsRoute.includes('projectId: z.string().trim()'), 'public analytics track must not trim project IDs before validation');
  assert(!analyticsRoute.includes('projectId: z.string().trim().regex(/^[A-Za-z0-9_-]{1,120}$/),'), 'public analytics track must not keep regex-only project ID validation');
  assertIncludes(
    'src/lib/analytics/serverWrite.ts',
    [
      "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
      'function normalizePublicAnalyticsWriteScopeDocumentId(value: unknown): string | null',
      'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
      'function normalizePublicAnalyticsWriteProjectId(value: unknown): string | null',
      'PUBLIC_ANALYTICS_PROJECT_ID_PATTERN.test(projectDocumentId)',
      'function normalizePublicAnalyticsWriteDateKey(value: unknown): string | null',
      'parsed.toISOString().slice(0, 10) !== dateKey',
      'const tenantDocumentId = normalizePublicAnalyticsWriteScopeDocumentId(tenantId);',
      'const storeDocumentId = normalizePublicAnalyticsWriteScopeDocumentId(storeId);',
      'const analyticsProjectId = normalizePublicAnalyticsWriteProjectId(projectId);',
      'const analyticsDateKey = normalizePublicAnalyticsWriteDateKey(dateString);',
      'const docId = `${tenantDocumentId}_${storeDocumentId}_${analyticsProjectId}_${DAILY_ANALYTICS_COLLECTION}_${analyticsDateKey}`;',
      'tId: tenantDocumentId',
      'sId: storeDocumentId',
      'projectId: analyticsProjectId',
      'date: analyticsDateKey',
      'localDate: analyticsDateKey',
    ],
    'public analytics shared write helper boundary',
  );
  assert(!analyticsServerWrite.includes('const docId = `${tenantId}_${storeId}_${projectId}_${DAILY_ANALYTICS_COLLECTION}_${dateString}`;'), 'public analytics shared write helper must not build doc IDs from raw scope values');
  assert(!analyticsServerWrite.includes('tId: String(tenantId)'), 'public analytics shared write helper must not store raw tenant IDs');
  assert(!analyticsServerWrite.includes('sId: String(storeId)'), 'public analytics shared write helper must not store raw store IDs');
  assert(analyticsImplDoc.includes('Public analytics tenant/store document ID boundary'), 'Analytics implementation docs must record public analytics tenant/store document ID boundary');
  assert(analyticsFirebaseDoc.includes('Public analytics tenant/store document ID boundary'), 'Analytics Firebase docs must record public analytics tenant/store document ID boundary');
  assert(analyticsImplDoc.includes('Public analytics shared write helper boundary'), 'Analytics implementation docs must record public analytics shared write helper boundary');
  assert(analyticsFirebaseDoc.includes('Public analytics shared write helper boundary'), 'Analytics Firebase docs must record public analytics shared write helper boundary');
  assert(analyticsImplDoc.includes('Public analytics project ID boundary'), 'Analytics implementation docs must record public analytics project ID boundary');
  assert(analyticsFirebaseDoc.includes('Public analytics project ID boundary'), 'Analytics Firebase docs must record public analytics project ID boundary');
  assert(analyticsImplDoc.includes('whitespace-mutated project IDs fail'), 'Analytics implementation docs must record strict public analytics project ID admission');
  assert(analyticsFirebaseDoc.includes('whitespace-mutated project IDs fail'), 'Analytics Firebase docs must record strict public analytics project ID admission');
  assert(productionAudit.includes('Public Analytics Shared Write Helper Boundary checkpoint'), 'Production audit must record public analytics shared write helper checkpoint');
  assert(productionAudit.includes('Public Analytics Tenant/Store Document ID Boundary checkpoint'), 'Production audit must record public analytics tenant/store document ID checkpoint');
  assert(productionAudit.includes('Public Analytics Project ID Boundary checkpoint'), 'Production audit must record public analytics project ID checkpoint');
  assert(productionAudit.includes('whitespace-mutated project IDs'), 'Production audit must record strict public analytics project ID admission');
  assert(changelog.includes('Public Analytics Shared Write Helper Boundary'), 'Changelog must record public analytics shared write helper boundary');
  assert(lowercaseChangelog.includes('Public Analytics Shared Write Helper Boundary'), 'Lowercase changelog must record public analytics shared write helper boundary');
  assert(changelog.includes('Public Analytics Tenant/Store Document ID Boundary'), 'Changelog must record public analytics tenant/store document ID boundary');
  assert(lowercaseChangelog.includes('Public Analytics Tenant/Store Document ID Boundary'), 'Lowercase changelog must record public analytics tenant/store document ID boundary');
  assert(changelog.includes('Public Analytics Project ID Boundary'), 'Changelog must record public analytics project ID boundary');
  assert(lowercaseChangelog.includes('Public Analytics Project ID Boundary'), 'Lowercase changelog must record public analytics project ID boundary');
  assert(changelog.includes('Public Analytics Strict Project ID Boundary'), 'Changelog must record strict public analytics project ID boundary');
  assert(lowercaseChangelog.includes('Public Analytics Strict Project ID Boundary'), 'Lowercase changelog must record strict public analytics project ID boundary');

  const feedbackRoute = read('src/app/api/public/feedback/submit/route.ts');
  const feedbackProjectIdBoundary = read('src/lib/feedback/guestFeedbackProjectIdBoundary.ts');
  const feedbackSchemas = read('src/lib/validation/apiSchemas.ts');
  assert(feedbackProjectIdBoundary.includes('documentId === value'), 'public feedback project ID helper must reject whitespace-mutated project IDs');
  assert(feedbackSchemas.includes("projectId: z.string()\n        .refine((value) => normalizeGuestFeedbackProjectId(value) === value, 'Invalid project ID')"), 'public feedback submit schema must validate raw project IDs through the shared helper');
  assert(!feedbackSchemas.includes('projectId: z.string()\n        .trim()\n        .refine((value) => normalizeGuestFeedbackProjectId(value) === value'), 'public feedback submit schema must not trim project IDs before validation');
  assert(!feedbackRoute.includes('req.json()'), 'public feedback submit must not parse unbounded JSON');
  assertOrder(
    'src/app/api/public/feedback/submit/route.ts',
    [
      "checkPublicRateLimit(req, 'FEEDBACK_SUBMISSION')",
      'readBoundedJsonBody(req, PUBLIC_FEEDBACK_SUBMIT_MAX_BODY_BYTES',
      'guestFeedbackSubmitSchema.safeParse(bodyResult.data)',
      'const projectId = normalizeGuestFeedbackProjectId(data.projectId);',
      'validateHoneypot(data.website)',
      'verifyTurnstileToken(data.captchaToken, req)',
      '.doc(projectId)',
      'projectRef.get()',
      'tenantRef.get()',
      'const tenantData = tenantDoc.data();',
      'tenantData?.active === false',
      'tenantData?.deleted === true',
      'isPlatformEntityBlocked(tenantData)',
      'submitGuestFeedbackAdmin({',
    ],
    'public feedback bounded body before captcha/store reads/write',
  );
  assertIncludes(
    'src/app/api/public/feedback/submit/route.ts',
    [
      "import { getBoundedGuestFeedbackStringContext, logGuestFeedbackFailure } from '@database/guestFeedback/guestFeedbackDiagnostics';",
      "logGuestFeedbackFailure('public_guest_feedback_scope_verification_failed'",
      "logGuestFeedbackFailure('public_guest_feedback_submit_failed'",
      "import { normalizeGuestFeedbackNumericDocumentId, normalizeGuestFeedbackProjectId } from '@lib/feedback/guestFeedbackProjectIdBoundary';",
      "import { normalizeMenuListPublicEntityIdentityAliases } from '@lib/publicTruth/entityEligibility';",
      'const projectId = normalizeGuestFeedbackProjectId(data.projectId);',
      'const tenantScope = normalizeGuestFeedbackNumericDocumentId(data.tId);',
      'const storeScope = normalizeGuestFeedbackNumericDocumentId(data.sId);',
      'const tenantDocumentId = tenantScope.documentId;',
      'const storeDocumentId = storeScope.documentId;',
      '.collection(DB_COLLECTIONS.TENANTS)',
      '.doc(projectId)',
      'const [projectDoc, storeDoc, tenantDoc] = await Promise.all([',
      'const tenantData = tenantDoc.data();',
      'tenantData?.active === false',
      'tenantData?.deleted === true',
      'isPlatformEntityBlocked(tenantData)',
      "getBoundedGuestFeedbackStringContext('tenantId', tenantDocumentId)",
      "getBoundedGuestFeedbackStringContext('storeId', storeDocumentId)",
      "getBoundedGuestFeedbackStringContext('projectId', projectId)",
      'hasCaptchaToken: Boolean(data.captchaToken)',
      'hasComment: Boolean(effectiveMessage)',
      'hasEmail: Boolean(effectiveEmail)',
    ],
    'public feedback bounded diagnostics',
  );
  assert(!feedbackRoute.includes("import { secureError } from '@lib/security/secureLogger';"), 'public feedback submit must use bounded guest-feedback diagnostics');
  assert(!feedbackRoute.includes('.doc(data.projectId)'), 'public feedback submit must not read project docs with raw project IDs');
  assert(!feedbackRoute.includes('.doc(String(data.tId))'), 'public feedback submit must not read tenant docs with raw tenant IDs');
  assert(!feedbackRoute.includes('.doc(String(data.sId))'), 'public feedback submit must not read store docs with raw store IDs');
  assert(!feedbackRoute.includes('.collection(String(data.sId))'), 'public feedback submit must not read project collections with raw store IDs');
  assert(!feedbackRoute.includes("getBoundedGuestFeedbackStringContext('projectId', data.projectId)"), 'public feedback diagnostics must not use raw project IDs');
  assert(!feedbackRoute.includes("logFeedbackMOLEventAdmin('FEEDBACK_SUBMITTED', data.tId, data.sId, data.projectId"), 'public feedback MOL events must not use raw project IDs');
  assert(!feedbackRoute.includes("logFeedbackMOLEventAdmin('FEEDBACK_SUBMITTED', data.tId, data.sId, projectId"), 'public feedback MOL events must not use raw tenant/store IDs');
  assert(!feedbackRoute.includes('secureError('), 'public feedback submit must not pass raw route failures to secureError');
  assert(!feedbackRoute.includes('new Error(String(error))'), 'public feedback submit must not stringify thrown values into logs');
  assert(!feedbackRoute.includes('error instanceof Error ? error'), 'public feedback submit must not pass raw exceptions to secure logging');

  assertIncludes(
    'src/database/guestFeedback/server.ts',
    [
      "import { getBoundedGuestFeedbackStringContext, logGuestFeedbackFailure } from './guestFeedbackDiagnostics';",
      "logGuestFeedbackFailure('guest_feedback_admin_mol_event_log_failed'",
      "getBoundedGuestFeedbackStringContext('tenantId', tId)",
      "getBoundedGuestFeedbackStringContext('storeId', sId)",
      "getBoundedGuestFeedbackStringContext('projectId', projectId)",
    ],
    'public feedback admin MOL bounded diagnostics',
  );
  const guestFeedbackServer = read('src/database/guestFeedback/server.ts');
  assert(!guestFeedbackServer.includes('} catch {\n        // Non-blocking operational signal. Feedback submission must not fail.\n    }'), 'public feedback admin MOL event write must not silently swallow failures');
  assert(productionAudit.includes('Guest Feedback Target Document ID Boundary checkpoint'), 'Production audit must record Guest Feedback target document ID boundary');
  assert(changelog.includes('Guest Feedback Target Document ID Boundary'), 'Changelog must record Guest Feedback target document ID boundary');
  assert(lowercaseChangelog.includes('Guest Feedback Target Document ID Boundary'), 'Lowercase changelog must record Guest Feedback target document ID boundary');
}

function verifyAnalyticsErrorBoundary() {
  const route = read('src/app/api/analytics/reports/route.ts');
  const analyticsServer = read('src/lib/analytics/server/index.ts');
  const googleReportQuery = read('src/lib/analytics/googleReportQuery.ts');
  const googlePropertyAccess = read('src/lib/analytics/googlePropertyAccess.ts');
  const analyticsDiagnostics = read('src/lib/analytics/analyticsDiagnostics.ts');
  const analyticsDatabase = read('src/database/analytics/index.ts');
  const analyticsUnified = read('src/lib/analytics/unified.ts');
  const analyticsSearchDedup = read('src/lib/analytics/searchDedup.ts');
  const analyticsDevice = read('src/lib/analytics/device.ts');
  const analyticsGeo = read('src/lib/analytics/geo.ts');
  const analyticsDateKey = read('src/lib/analytics/dateKey.ts');
  const analyticsBusinessDay = read('src/lib/analytics/businessDay.ts');
  const aiOperationHistoryQuery = read('src/lib/ai/operationHistoryQuery.ts');
  const aiOperationsRoute = read('src/app/api/ai-operations/route.ts');
  const analyticsTimeZoneDiagnostics = read('src/lib/analytics/timeZoneDiagnostics.ts');
  const appSchedulerHour = read('src/lib/utils/schedulerHour.ts');
  const functionsSchedulerHour = read('functions/src/utils/schedulerHour.ts');
  const analyticsSession = read('src/lib/analytics/session.ts');
  const analyticsDal = read('src/lib/analytics/dal.ts');
  const ownerActionMarkDoneRoute = read('src/app/api/analytics/owner-action/mark-done/route.ts');
  const ownerActionReceiptTransaction = read('src/lib/analytics/ownerActionReceiptTransaction.ts');
  const ownerDashboardDal = read('src/database/ownerDashboard/index.ts');
  const analyticsComparison = read('src/lib/analytics/comparison.ts');
  const analyticsComparisonView = read('src/components/analytics/ComparisonView.tsx');
  const chatInsights = read('src/components/templates/platform/chatManagement/ChatInsights.tsx');
  const analyticsNormalizer = read('src/lib/analytics/normalizer.ts');
  const analyticsService = read('src/services/analytics/index.ts');
  const analyticsDashboard = read('src/components/templates/main-app/dashboard/AnalyticsDashboard/index.tsx');
  const customerAppMetrics = read('src/components/templates/main-app/dashboard/AnalyticsDashboard/CustomerAppMetrics.tsx');
  const googleMenuPerformance = read('src/components/templates/main-app/dashboard/googleAnalytics/MenuPerformance.tsx');
  const googleQuickStats = read('src/components/templates/main-app/dashboard/googleAnalytics/QuickStats.tsx');
  const googleLocationInsights = read('src/components/templates/main-app/dashboard/googleAnalytics/LocationInsights.tsx');
  const googleTrendAnalysis = read('src/components/templates/main-app/dashboard/googleAnalytics/TrendAnalysis.tsx');
  const googleDateRangeSelector = read('src/components/templates/main-app/dashboard/googleAnalytics/DateRangeSelector.tsx');
  const analyticsImplDoc = read('__docs__/client-menu/analytics-tracking/_impl.md');
  const analyticsFirebaseDoc = read('__docs__/client-menu/analytics-tracking/analytics-tracking_firebase.md');
  const aiSystemReadme = read('__docs__/ai-system-layer/README.md');
  const aiSystemImplDoc = read('__docs__/ai-system-layer/ai-system-layer_impl.md');
  const aiSystemFirebaseDoc = read('__docs__/ai-system-layer/ai-system-layer_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const legacyAnalyticsRoutes = [
    ['src/app/api/analytics/route.ts', 'analytics_realtime_api_failed', 'overview'],
    ['src/app/api/analytics/locations/route.ts', 'analytics_locations_api_failed', 'locations'],
    ['src/app/api/analytics/menu/route.ts', 'analytics_menu_api_failed', 'menu'],
    ['src/app/api/analytics/realtime/route.ts', 'analytics_realtime_detail_api_failed', 'realtime'],
    ['src/app/api/analytics/roi-metrics/route.ts', 'analytics_roi_metrics_api_failed', 'roi-metrics'],
  ];

  assertIncludes(
    'src/app/api/analytics/reports/route.ts',
    [
	      'requireAnyStorePermission(request, session, [PERMISSIONS.VIEW_ANALYTICS]',
	      'requireConfiguredGoogleAnalyticsProperty(request, session, rawPropertyId)',
	      "logAnalyticsFailure('analytics_reports_api_failed'",
	      "endpoint: '/api/analytics/reports'",
	      "status === 403 ? 'Analytics access is not available.' : 'Failed to fetch analytics data'",
	    ],
    'analytics reports permission and generic error boundary',
	  );
	  assert(!route.includes("{ error: error.message"), 'analytics reports must not return raw exception messages');
	  assert(!route.includes('console.error'), 'analytics reports must use secure logging');
	  assert(!route.includes('new Error(String(error))'), 'analytics reports must not normalize logs from raw exception strings');
	  assert(!route.includes('error instanceof Error ? error'), 'analytics reports must not pass raw exceptions to secure logging');
  assertIncludes(
    'src/lib/analytics/googleReportQuery.ts',
    [
      'GOOGLE_ANALYTICS_MAX_DATE_RANGE_DAYS = 366',
      'DASHBOARD_PREFERENCE_START_DATES',
      "'7days': '7daysAgo'",
      'RELATIVE_GOOGLE_ANALYTICS_DATE_PATTERN',
      'parseAbsoluteGoogleAnalyticsDate',
      'if (absoluteDate.getTime() > getUtcStartOfToday().getTime()) return null;',
      'if (resolvedStartDate.getTime() > resolvedEndDate.getTime()) return null;',
      'if (rangeDays > GOOGLE_ANALYTICS_MAX_DATE_RANGE_DAYS) return null;',
      'return { startDate, endDate };',
    ],
    'analytics Google provider date-range boundary',
  );
  assert(!googleReportQuery.includes('Date.parse('), 'analytics Google provider date-range boundary must not use permissive Date.parse');
  assertIncludes(
    'src/lib/analytics/googlePropertyAccess.ts',
    [
      "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
      'const GOOGLE_ANALYTICS_PROPERTY_ID_PATTERN = /^\\d{1,32}$/;',
      'return GOOGLE_ANALYTICS_PROPERTY_ID_PATTERN.test(normalized) ? normalized : null;',
      'return normalized ? `properties/${normalized}` : null;',
      'export function normalizeGoogleAnalyticsScopeDocumentId(value: unknown): GoogleAnalyticsScopeDocumentId | null {',
      'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
      'const sessionScope = resolveSensitiveSessionStoreScope({',
      'tenantValues: [session?.tId, session?.user?.tenantId],',
      'storeValues: [session?.sId, session?.user?.storeId],',
      'isSensitiveStoreRecordInScope({',
      '.doc(storeScope.documentId)',
    ],
    'analytics Google provider property resource boundary',
  );
  assert(!googlePropertyAccess.includes("return trimmed.startsWith('properties/') ? trimmed.slice('properties/'.length).trim() : trimmed;"), 'analytics property helper must not return unshaped raw property suffixes');
  assert(!googlePropertyAccess.includes('.doc(String(storeId))'), 'analytics property helper must not build store refs from raw session store IDs');
  assertIncludes(
    '__docs__/client-menu/analytics-tracking/_impl.md',
    [
      'require numeric GA Data API property IDs',
      'normalize legacy saved dashboard preferences like `7days` to `7daysAgo`',
      'reject reversed or wider-than-366-day ranges before provider calls',
      'Google Analytics configured-store scope boundary',
    ],
    'client menu analytics implementation Google provider query boundary',
  );
  assertIncludes(
    '__docs__/client-menu/analytics-tracking/analytics-tracking_firebase.md',
    [
      'Owner Google Analytics provider-read rule',
      'pass only numeric GA Data API property resources to Google',
      'normalize report date ranges through `src/lib/analytics/googleReportQuery.ts`',
      'rejects reversed or wider-than-366-day ranges',
      'Google Analytics configured-store scope boundary',
    ],
    'client menu analytics Firebase Google provider query boundary',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'Owner Google Analytics provider-query boundary checkpoint',
      '`src/lib/analytics/googlePropertyAccess.ts` now accepts only numeric GA Data API property IDs',
      'Google Analytics configured-store scope boundary checkpoint',
      '`normalizeGoogleAnalyticsScopeDocumentId()`',
      '`src/lib/analytics/googleReportQuery.ts` normalizes saved dashboard quick preferences',
      '`npm run verify:menulist-api-tenant-safety` source-gates the property shape guard',
    ],
    'production audit Google provider query boundary evidence',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Owner Google Analytics Provider Query Boundary',
      'Google Analytics Configured-Store Scope Boundary',
      'Google Analytics report dates are normalized before provider calls',
      'Google Analytics property resources are shaped',
      'npm run verify:menulist-api-tenant-safety',
    ],
    'primary changelog Google provider query boundary entry',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Owner Google Analytics Provider Query Boundary',
      'Google Analytics Configured-Store Scope Boundary',
      'Google Analytics report dates are normalized before provider calls',
      'Google Analytics property resources are shaped',
      'npm run verify:menulist-api-tenant-safety',
    ],
    'mirrored changelog Google provider query boundary entry',
  );
	  assertIncludes(
	    'src/lib/analytics/server/index.ts',
	    [
	      "import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from '@lib/analytics/analyticsDiagnostics';",
	      'analytics_server_client_initialization_failed',
	      'analytics_server_report_failed',
	      'analytics_server_realtime_report_failed',
	      "new Error('analytics_access_not_available')",
	      "getBoundedAnalyticsStringContext('propertyId', propertyId)",
	      'clientEmailConfigured: Boolean(process.env.GA_CLIENT_EMAIL)',
	      'privateKeyConfigured: Boolean(process.env.GA_PRIVATE_KEY)',
	    ],
	    'analytics server bounded provider logging',
	  );
	  assert(!analyticsServer.includes('console.error'), 'analytics server helper must use secure logging');
	  assert(!analyticsServer.includes('new Error(String(error))'), 'analytics server helper must not normalize logs from raw exception strings');
	  assert(!analyticsServer.includes('error instanceof Error ? error'), 'analytics server helper must not pass raw provider exceptions to secure logging');
	  assert(!analyticsServer.includes('throw error;'), 'analytics server helper must not rethrow raw provider exceptions');

  assertIncludes(
    'src/app/api/analytics/readRateLimit.ts',
    [
      "getRateLimitForFeature('DATA_READ')",
      "import { getSessionProviderScopeKey } from '@lib/multiOutlet/sessionProviderScopeBoundary';",
      'const sessionScopeKey = getSessionProviderScopeKey(session);',
      "return NextResponse.json({ error: 'Forbidden' }, { status: 403 });",
      'checkRateLimit({',
      'const sessionScopeHash = hashPublicRateLimitValue(sessionScopeKey);',
      'key: `analytics-read:${routeKey}:${sessionScopeHash}`',
      "'Retry-After': String(waitSeconds)",
      "'X-RateLimit-Limit': String(rateLimitConfig.limit)",
      "'X-RateLimit-Remaining': String(rateLimit.remaining)",
      "'X-RateLimit-Reset': String(rateLimit.resetAt)",
    ],
    'analytics shared read rate limiter',
  );
  assert(!read('src/app/api/analytics/readRateLimit.ts').includes('key: `analytics-read:${routeKey}:${userId}:${tenantId}:${storeId}`'), 'analytics shared read limiter must not store raw user/tenant/store IDs in rate-limit keys');
  assert(!read('src/app/api/analytics/readRateLimit.ts').includes("session?.tId || session?.user?.tenantId || 'unknown'"), 'analytics shared read limiter must not select one tenant alias');
  assert(!read('src/app/api/analytics/readRateLimit.ts').includes("session?.sId || session?.user?.storeId || 'unknown'"), 'analytics shared read limiter must not select one store alias');

  legacyAnalyticsRoutes.forEach(([relPath, failureCode, routeKey]) => {
    const legacyRoute = read(relPath);
    assertIncludes(
      relPath,
      [
        'applyAnalyticsReadRateLimit',
        routeKey === 'roi-metrics'
          ? `applyAnalyticsReadRateLimit(scopedSession, '${routeKey}')`
          : `applyAnalyticsReadRateLimit(session, '${routeKey}')`,
        'getBoundedAnalyticsStringContext',
        'logAnalyticsFailure',
        failureCode,
      ],
      `${relPath} bounded analytics route diagnostics and read limiter`,
    );
    if (routeKey === 'roi-metrics') {
      assertOrder(
        relPath,
        [
          `applyAnalyticsReadRateLimit(scopedSession, '${routeKey}')`,
          'getChatStatisticsOptimized(scopedSession, days)',
        ],
        `${relPath} read limiter before analytics reads`,
      );
    } else {
      assertOrder(
        relPath,
        [
          `applyAnalyticsReadRateLimit(session, '${routeKey}')`,
          'requireAnyStorePermission(',
        ],
        `${relPath} read limiter before permission reads`,
      );
    }
    assert(!legacyRoute.includes('secureError('), `${relPath} must not pass raw route exceptions to secureError`);
    assert(!legacyRoute.includes("import { secureError } from '@lib/security/secureLogger';"), `${relPath} must not import raw secureError`);
    assert(!legacyRoute.includes('console.error'), `${relPath} must use secure analytics logging`);
    if (routeKey === 'menu' || routeKey === 'locations') {
      assertIncludes(
        relPath,
        [
          "import { normalizeGoogleAnalyticsDateRange } from '@lib/analytics/googleReportQuery';",
          'const dateRange = normalizeGoogleAnalyticsDateRange(startDate, endDate);',
          'dateRanges: [dateRange]',
        ],
        `${relPath} Google provider date-range boundary`,
      );
      assert(!legacyRoute.includes('dateRanges: [{ startDate, endDate }]'), `${relPath} must not pass raw query date ranges to Google Analytics`);
    }
  });

  assertIncludes(
    'src/app/api/analytics/reports/route.ts',
    [
      'applyAnalyticsReadRateLimit',
      "applyAnalyticsReadRateLimit(session, 'reports')",
      "import { normalizeGoogleAnalyticsDateRange } from '@lib/analytics/googleReportQuery';",
      'const dateRange = normalizeGoogleAnalyticsDateRange(',
      "{ startDate: '7daysAgo', endDate: 'today' }",
      "return NextResponse.json({ error: 'Valid start date and end date are required' }, { status: 400 });",
      "logAnalyticsFailure('analytics_reports_api_failed'",
    ],
    'analytics reports route shared read limiter',
  );
  assertOrder(
    'src/app/api/analytics/reports/route.ts',
    [
      "applyAnalyticsReadRateLimit(session, 'reports')",
      'requireAnyStorePermission(',
      'requireConfiguredGoogleAnalyticsProperty(',
      'const dateRange = normalizeGoogleAnalyticsDateRange(',
      'const { startDate, endDate } = dateRange;',
      'getAnalyticsReport(propertyId, startDate, endDate)',
    ],
    'analytics reports read limiter before permission/provider work',
  );

  const weeklyNarrativeRouteForAuth = read('src/app/api/analytics/weekly-narrative/generate-local/route.ts');
  assert(weeklyNarrativeRouteForAuth.includes("import { withAuth } from '@/middleware/auth';"), 'weekly narrative refresh must use shared auth');
  assert(weeklyNarrativeRouteForAuth.includes('ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT'), 'weekly narrative refresh must require support management');
  assert(weeklyNarrativeRouteForAuth.includes("'answerlattice-weekly-narrative',\n                'workspace'"), 'weekly narrative refresh must use a workspace-scoped limiter');
  assert(weeklyNarrativeRouteForAuth.includes('limit: 2'), 'weekly narrative refresh must cap workspace refreshes');
  assert(weeklyNarrativeRouteForAuth.includes("generationMode: 'deterministic'"), 'weekly narrative refresh must remain deterministic');
  assert(weeklyNarrativeRouteForAuth.includes("currentInsight.get('sourceHash') !== sourceHash"), 'weekly narrative refresh must hash-skip unchanged writes');
  assert(!weeklyNarrativeRouteForAuth.includes('answerlatticeGenAIClient'), 'weekly narrative refresh must not call a model provider');
  assert(!weeklyNarrativeRouteForAuth.includes('recordAnswerlatticeAiOperation'), 'weekly narrative refresh must not record a provider operation');
  assert(
    !fs.existsSync(path.join(ROOT, 'src/app/api/analytics/weekly-narrative/regenerate/route.ts')),
    'retired Answerlattice weekly narrative regeneration wrapper must stay absent',
  );
  assertIncludes(
    'src/app/api/ai-operations/route.ts',
    [
      "from '@lib/ai/operationHistoryQuery';",
      'AI_OPERATION_DATE_FILTER_MAX_LENGTH,',
      'isAiOperationHistoryCursorAdmissible,',
      'isValidAiOperationCursorId,',
      'normalizeAiOperationHistoryDateRange,',
      '.refine((value) => !value || isValidAiOperationCursorId(value), \'Invalid cursor ID\')',
      'endDate: z.string().trim().max(AI_OPERATION_DATE_FILTER_MAX_LENGTH).optional(),',
      'startDate: z.string().trim().max(AI_OPERATION_DATE_FILTER_MAX_LENGTH).optional(),',
      "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
      'function normalizeAiOperationHistoryScopeDocumentId(value: unknown): AiOperationHistoryScopeDocumentId | null',
      'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
      'const sessionScope = resolveStorePermissionSessionScope(session);',
      'const tenantScope = normalizeAiOperationHistoryScopeDocumentId(sessionScope?.tenantScope.documentId);',
      'const storeScope = normalizeAiOperationHistoryScopeDocumentId(sessionScope?.storeScope.documentId);',
      'const tenantId = tenantScope.documentId;',
      'const storeId = storeScope.documentId;',
      'const dateRange = normalizeAiOperationHistoryDateRange(startDate, endDate);',
      'if (!dateRange) {',
      "query = query.where('createdOn', '>=', dateRange.start);",
      "query = query.where('createdOn', '<=', dateRange.end);",
      'const cursorDoc = await getCursorDoc(tenantId, storeId, cursorId);',
      'isAiOperationHistoryCursorAdmissible({',
      'cursorCreatedOn: cursorDoc?.get(\'createdOn\')',
      'cursorExists: Boolean(cursorDoc)',
      'cursorRequested: Boolean(cursorId)',
      "return privateJson({ error: 'Invalid cursor' }, { status: 400 });",
      'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      'const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);',
      'const storeRateLimitHash = hashPublicRateLimitValue(storeId);',
      'key: `ai-operations:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`',
      'failClosedOnProviderError: true',
      "rateLimit.reason === 'provider_unavailable'",
      "'Cache-Control': 'private, no-store, max-age=0'",
      "'X-Content-Type-Options': 'nosniff'",
      "logger.security('Rate Limit Exceeded', {",
      '...getAiOperationsReadLogContext(request, session',
    ],
    'AI operations read hashed limiter and bounded rate-limit diagnostics',
  );
  assert(!aiOperationsRoute.includes('session.tId || session.user?.tenantId'), 'AI operations route must not select one session tenant alias');
  assert(
    (aiOperationsRoute.match(/return NextResponse\.json\(/g) || []).length === 1,
    'AI operations route must keep NextResponse.json encapsulated by its private response boundary',
  );
  assert(!aiOperationsRoute.includes('session.sId || session.user?.storeId'), 'AI operations route must not select one session store alias');
  assert(aiOperationHistoryQuery.includes("import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';"), 'AI operation history query helper must import shared Firestore document ID guard');
  assert(aiOperationHistoryQuery.includes('AI_OPERATION_CURSOR_ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/'), 'AI operation history query helper must validate simple Firestore cursor IDs');
  assert(aiOperationHistoryQuery.includes('AI_OPERATION_CURSOR_ID_PATTERN.test(cursorId) && isValidFirestoreDocumentId(cursorId)'), 'AI operation history query helper must reject reserved or path-shaped Firestore cursor IDs');
  assert(aiOperationHistoryQuery.includes('AI_OPERATION_HISTORY_MAX_DATE_RANGE_DAYS = 366'), 'AI operation history query helper must cap date-filter ranges');
  assert(aiOperationHistoryQuery.includes('AI_OPERATION_ISO_DATE_PATTERN'), 'AI operation history query helper must parse strict browser ISO timestamps');
  assert(aiOperationHistoryQuery.includes('AI_OPERATION_DATE_PATTERN'), 'AI operation history query helper must parse strict date-only filters');
  assert(aiOperationHistoryQuery.includes('if (start.getTime() > end.getTime()) return null;'), 'AI operation history query helper must reject reversed date filters');
  assert(aiOperationHistoryQuery.includes('if (rangeDays > AI_OPERATION_HISTORY_MAX_DATE_RANGE_DAYS) return null;'), 'AI operation history query helper must reject wider-than-cap date filters');
  assert(aiOperationHistoryQuery.includes('export function isAiOperationHistoryCursorAdmissible'), 'AI operation history query helper must expose persisted cursor admission');
  assert(aiOperationHistoryQuery.includes('if (!cursorExists) return false;'), 'AI operation history query helper must reject requested missing cursors');
  assert(aiOperationHistoryQuery.includes('if (dateRange.start && cursorTime < dateRange.start.getTime()) return false;'), 'AI operation history query helper must reject cursors before the active date range');
  assert(aiOperationHistoryQuery.includes('if (dateRange.end && cursorTime > dateRange.end.getTime()) return false;'), 'AI operation history query helper must reject cursors after the active date range');
  assertOrder(
    'src/app/api/ai-operations/route.ts',
    [
      'const cursorDoc = await getCursorDoc(tenantId, storeId, cursorId);',
      'if (!isAiOperationHistoryCursorAdmissible({',
      'const result = action',
    ],
    'AI operations persisted cursor admission before continuation queries',
  );
  assert(!aiOperationHistoryQuery.includes('Date.parse('), 'AI operation history query helper must not use permissive Date.parse');
  assert(!aiOperationsRoute.includes('function getDateParam'), 'AI operations route must not keep route-local permissive date parsing');
  assert(!aiOperationsRoute.includes('new Date(value)'), 'AI operations route must not use permissive new Date(value) parsing');
  assert(!read('src/app/api/ai-operations/route.ts').includes('key: `ai-operations:${userId}:${tenantId}:${storeId}`'), 'AI operations route must not store raw user/tenant/store IDs in rate-limit keys');
  assert(!aiOperationsRoute.includes('.doc(String(tenantId))'), 'AI operations route must not build history refs from raw tenant IDs');
  assert(!aiOperationsRoute.includes('.collection(String(storeId))'), 'AI operations route must not build history refs from raw store IDs');
  assert(aiOperationsRoute.includes("import { requireAnyStorePermission } from '@lib/permissions/server';"), 'AI operations route must use current persisted store permission authority');
  assert(aiOperationsRoute.includes('[PERMISSIONS.ACCESS_BILLING]'), 'AI operations route must require billing access before ledger reads');
  assert(
    aiOperationsRoute.indexOf('const permissionError = await requireAnyStorePermission(')
      < aiOperationsRoute.indexOf('const cursorDoc = await getCursorDoc(tenantId, storeId, cursorId);'),
    'AI operations route must authorize before the first ledger read',
  );
  assert(productionAudit.includes('AI Operations History Scope Document ID Boundary checkpoint'), 'Production audit AI operations history scope boundary missing');
  assert(productionAudit.includes('AI operation persisted-cursor admission checkpoint'), 'Production audit AI operations persisted cursor boundary missing');
  assert(changelog.includes('AI Operations History Scope Document ID Boundary'), 'Changelog AI operations history scope boundary missing');
  assert(changelog.includes('AI Operation Persisted Cursor Admission'), 'Changelog AI operations persisted cursor boundary missing');
  assert(read('__docs__/changelog.md').includes('AI Operations History Scope Document ID Boundary'), 'Lowercase changelog AI operations history scope boundary missing');
  assertIncludes(
    '__docs__/ai-system-layer/ai-system-layer_impl.md',
    [
      'July 5 transaction-history query boundary',
      'simple Firestore document ID cursor values',
      'shared Firestore reserved/path guard',
      'strict `YYYY-MM-DD` or browser ISO `...Z` date filters',
      'reserved/path-shaped cursor IDs',
      'AI Operations History Scope Document ID Boundary',
    ],
    'AI System implementation transaction-history query boundary',
  );
  assertIncludes(
    '__docs__/ai-system-layer/ai-system-layer_firebase.md',
    [
      'July 5 transaction-history query boundary is Firebase-cost neutral',
      'validates simple cursor IDs through the shared Firestore reserved/path guard and strict date filters before the existing Firestore read',
      'rejects malformed cursor IDs plus reversed or wider-than-366-day date ranges',
      'AI Operations History Scope Document ID Boundary',
    ],
    'AI System Firebase transaction-history query boundary',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'AI operation transaction-history query boundary checkpoint',
      '`src/lib/ai/operationHistoryQuery.ts` now accepts only simple Firestore document ID cursors',
      'strict `YYYY-MM-DD` or browser ISO `...Z` date filters',
      '`npm run verify:menulist-api-tenant-safety` source-gates the helper constants',
    ],
    'production audit AI operation transaction-history query boundary evidence',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'AI Operation Transaction-History Query Boundary',
      'Transaction-history cursors are shape-checked',
      'Transaction-history date filters are strict',
      'npm run verify:menulist-api-tenant-safety',
    ],
    'primary changelog AI operation transaction-history query boundary entry',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'AI Operation Transaction-History Query Boundary',
      'Transaction-history cursors are shape-checked',
      'Transaction-history date filters are strict',
      'npm run verify:menulist-api-tenant-safety',
    ],
    'mirrored changelog AI operation transaction-history query boundary entry',
  );
  assertIncludes(
    'src/lib/google/genAi/diagnostics.ts',
    [
      'getBoundedSecurityStringContext',
      'export function getAIRouteSecurityContext',
      "getBoundedSecurityStringContext('userId'",
      "getBoundedSecurityStringContext('email'",
      "getBoundedSecurityStringContext('tenantId'",
      "getBoundedSecurityStringContext('storeId'",
      "getBoundedSecurityStringContext('ip'",
      "getBoundedSecurityStringContext('userAgent'",
    ],
    'AI route bounded security context helper',
  );
  [
    'src/app/api/business-copy/route.ts',
    'src/app/api/campaigns/caption/route.ts',
    'src/app/api/descriptions/route.ts',
    'src/app/api/image-editing/route.ts',
    'src/app/api/image-generation/batch-trigger/route.ts',
    'src/app/api/image-generation/route.ts',
    'src/app/api/menu-card-export/design-advisor/route.ts',
    'src/app/api/new-item-metadata/route.ts',
    'src/app/api/reviews/suggest/route.ts',
    'src/app/api/seo/route.ts',
    'src/app/api/translations/route.ts',
  ].forEach((route) => {
    const source = read(route);
    assert(source.includes('getAIRouteSecurityContext(session, request)'), `${route} must use bounded AI route security context`);
    assert(!source.includes('buildSecurityContext'), `${route} must not spread raw security context into owner AI security logs`);
  });
  assertIncludes(
    'src/app/api/menu-card-export/design-advisor/route.ts',
    [
      'import { isValidFirestoreDocumentId }',
      'function normalizeMenuCardDesignAdvisorSessionScopeDocumentId(',
      'const tenantScope = normalizeMenuCardDesignAdvisorSessionScopeDocumentId(session.tId);',
      'const storeScope = normalizeMenuCardDesignAdvisorSessionScopeDocumentId(session.sId);',
      'const tenantId = tenantScope.numericId;',
      'const storeId = storeScope.numericId;',
      'verifyTenantAccess(session, tenantId, storeId, request)',
      'getActiveSubscriptionForStore(tenantId, storeId)',
      'checkAICapacity(tenantId, storeId, ACTION, 1, subscription)',
    ],
    'Menu Card design advisor session-scope boundary',
  );
  [
    'const tenantId = Number(session.tId);',
    'const storeId = Number(session.sId);',
    'if (!Number.isFinite(tenantId) || !Number.isFinite(storeId))',
  ].forEach((token) => {
    assert(!read('src/app/api/menu-card-export/design-advisor/route.ts').includes(token), `Menu Card design advisor must not use loose session scope token ${token}`);
  });
  assertIncludes(
    '__docs__/menu-card-export/menu-card-export_firebase.md',
    [
      'AI advisor session-scope admission is cost-neutral',
      'exact positive numeric Firestore document IDs',
    ],
    'Menu Card Export Firebase session-scope boundary docs',
  );
  assertIncludes(
    '__docs__/menu-card-export/menu-card-export_impl.md',
    [
      'July 6 AI advisor session scope boundary',
      'subscription lookup, AI capacity check, Gemini call, recommendation normalization, or AI accounting',
    ],
    'Menu Card Export implementation session-scope boundary docs',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'Menu Card Design Advisor session scope boundary checkpoint',
      'subscription lookup',
      'provider call',
    ],
    'Production audit Menu Card design advisor session-scope boundary evidence',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Menu Card Design Advisor Session Scope Boundary',
      'npm run verify:menu-card-export',
      'npm run verify:menulist-api-tenant-safety',
    ],
    'Changelog Menu Card design advisor session-scope boundary evidence',
  );
  assertIncludes(
    'src/app/api/image-generation/batch-generation/route.ts',
    [
      'import { checkRateLimit } from "@lib/rateLimit";',
      'import { getRateLimitForFeature } from "@lib/rateLimit/configs";',
      'import { hashPublicRateLimitValue } from "../../../../middleware/publicApi";',
      "const BATCH_IMAGE_WORKER_RATE_LIMIT_KEY = 'batch-image-worker';",
      'async function applyBatchImageWorkerRateLimit',
      "getRateLimitForFeature('BATCH_IMAGE_WORKER')",
      'key: `${BATCH_IMAGE_WORKER_RATE_LIMIT_KEY}:${tenantRateLimitHash}:${storeRateLimitHash}`',
      "logger.security('Rate Limit Exceeded - Batch Image Worker'",
      'const rateLimitResponse = await applyBatchImageWorkerRateLimit({ jobId, sId, tId });',
    ],
    'batch image worker rate-limit boundary',
  );
  assertIncludes(
    'src/lib/rateLimit/configs.ts',
    [
      'BATCH_IMAGE_WORKER: {',
      'limit: 600',
      "description: 'Batch image worker - 600 per minute per store'",
    ],
    'batch image worker rate-limit profile',
  );
  assertOrder(
    'src/app/api/image-generation/batch-generation/route.ts',
    [
      'hasValidWorkerSecret(request)',
      'readBoundedJsonBody(request, BATCH_IMAGE_WORKER_MAX_BODY_BYTES',
      'validateAPIInput(BatchImageGenerationWorkerRequestSchema, rawData)',
      'const projectScope = normalizeImageBatchProjectId(requestedProjectId);',
      'const jobId = normalizeImageBatchJobId(requestedJobId);',
      'const rateLimitResponse = await applyBatchImageWorkerRateLimit({ jobId, sId, tId });',
      'getImageBatchProcessingJobByIdAdmin',
      'checkAICapacity(',
    ],
    'batch image worker rate limit before job read and provider work',
  );
  const batchWorkerRoute = read('src/app/api/image-generation/batch-generation/route.ts');
  assert(!batchWorkerRoute.includes('key: `batch-image-worker:${tId'), 'batch image worker must not store raw tenant IDs in limiter keys');
  assert(!batchWorkerRoute.includes('key: `batch-image-worker:${sId'), 'batch image worker must not store raw store IDs in limiter keys');
  [
    {
      label: 'business copy generation',
      permission: '[PERMISSIONS.MANAGE_PUBLIC_PRESENCE, PERMISSIONS.MANAGE_STORE]',
      route: 'src/app/api/business-copy/route.ts',
      before: 'const capacityCheck = await checkAICapacity(',
    },
    {
      label: 'campaign caption',
      permission: '[PERMISSIONS.MANAGE_MENU_SHARING, PERMISSIONS.PUBLISH_MENU, PERMISSIONS.MANAGE_MENU]',
      route: 'src/app/api/campaigns/caption/route.ts',
      before: 'if (projectId) {',
    },
    {
      label: 'description generation',
      permission: '[PERMISSIONS.GENERATE_DESCRIPTIONS]',
      route: 'src/app/api/descriptions/route.ts',
      before: 'const outletPolicyBlockReason = await getLinkedOutletPolicyBlockReason({',
    },
    {
      label: 'new item metadata',
      permission: '[PERMISSIONS.GENERATE_DESCRIPTIONS]',
      route: 'src/app/api/new-item-metadata/route.ts',
      before: 'const capacityCheck = await checkAICapacity(',
    },
    {
      label: 'image generation',
      permission: '[PERMISSIONS.GENERATE_IMAGES]',
      route: 'src/app/api/image-generation/route.ts',
      before: 'const outletPolicyBlockReason = await getLinkedOutletPolicyBlockReason({',
    },
    {
      label: 'image editing',
      permission: '[PERMISSIONS.GENERATE_IMAGES]',
      route: 'src/app/api/image-editing/route.ts',
      before: 'const outletPolicyBlockReason = await getLinkedOutletPolicyBlockReason({',
    },
    {
      label: 'batch image generation',
      permission: '[PERMISSIONS.GENERATE_IMAGES]',
      route: 'src/app/api/image-generation/batch-trigger/route.ts',
      before: 'const outletPolicyBlockReason = await getLinkedOutletPolicyBlockReason({',
    },
    {
      label: 'menu card design advisor',
      permission: '[PERMISSIONS.MANAGE_MENU_SHARING, PERMISSIONS.PUBLISH_MENU, PERMISSIONS.MANAGE_MENU]',
      route: 'src/app/api/menu-card-export/design-advisor/route.ts',
      before: 'const subscription = await getActiveSubscriptionForStore(',
    },
    {
      label: 'seo generation',
      permission: '[PERMISSIONS.MANAGE_PUBLIC_PRESENCE, PERMISSIONS.MANAGE_STORE]',
      route: 'src/app/api/seo/route.ts',
      before: 'const capacityCheck = await checkAICapacity(',
    },
    {
      label: 'translation generation',
      permission: '[PERMISSIONS.GENERATE_DESCRIPTIONS]',
      route: 'src/app/api/translations/route.ts',
      before: "logger.info('Translation requested'",
    },
  ].forEach(({ before, label, permission, route }) => {
    assertIncludes(
      route,
      [
        'import { PERMISSIONS }',
        'import { requireAnyStorePermission }',
        'const permissionError = await requireAnyStorePermission(',
        permission,
        'if (permissionError) return permissionError;',
      ],
      `${label} route permission guard`,
    );
    assertOrder(
      route,
      [
        'const bodyResult = await readBoundedJsonBody(',
        'const validation = validateAPIInput(',
        'const permissionError = await requireAnyStorePermission(',
        'if (permissionError) return permissionError;',
        before,
      ],
      `${label} route must validate input and permission before expensive AI work`,
    );
  });
  assertIncludes(
    'src/lib/multiOutlet/serverOutletPolicy.ts',
    [
      'normalizeMultiOutletNumericDocumentId',
      'normalizeMultiOutletProjectId',
      'const sessionScope = getOutletSessionScope(session);',
      'const tenantScope = normalizeMultiOutletNumericDocumentId(sessionScope?.tenantDocumentId);',
      'const storeScope = normalizeMultiOutletNumericDocumentId(sessionScope?.storeDocumentId);',
      'const projectScope = normalizeMultiOutletProjectId(projectId);',
      'projectScope.tId !== tenantScope.numericId',
      'projectScope.sId !== storeScope.numericId',
      '.doc(`${DB_COLLECTIONS.PROJECTS}/${tenantScope.documentId}/${storeScope.documentId}/${projectScope.projectId}`)',
      'const masterProjectScope = normalizeMultiOutletProjectId(masterProjectId);',
      'masterProjectScope.tId !== tenantScope.numericId',
      'masterProjectScope.sId === storeScope.numericId',
      '.doc(`${DB_COLLECTIONS.STORES}/${masterProjectScope.storeDocumentId}`)',
      'const masterTenantScope = resolveStorePermissionScopeDocumentIdAliases([',
      'masterStoreSnap.data()?.tId,',
      'masterTenantScope.numericId !== tenantScope.numericId',
    ],
    'linked outlet AI policy scope boundary',
  );
  [
    'const parsed = Number(session.tId ?? session.user?.tenantId);',
    'const parsed = Number(session.sId ?? session.user?.storeId);',
    'const parts = projectId.split("-");',
    'const parsed = Number(parts[parts.length - 1]);',
    'Number(masterStoreSnap.data()?.tenantId)',
  ].forEach((token) => {
    assert(!read('src/lib/multiOutlet/serverOutletPolicy.ts').includes(token), `linked outlet AI policy must not use loose scope parsing: ${token}`);
  });
  assertIncludes(
    '__docs__/multi-outlet-consistency/multi-outlet-consistency_firebase.md',
    [
      'Linked outlet AI policy scope boundary is cost-neutral',
      '`getLinkedOutletPolicyBlockReason()` now uses `normalizeMultiOutletProjectId()`',
    ],
    'multi-outlet Firebase linked outlet AI policy scope boundary docs',
  );
  assertIncludes(
    '__docs__/multi-chain-permissions/multi-chain-permissions_firebase.md',
    [
      'Linked outlet AI policy scope boundary is cost-neutral',
      '`getLinkedOutletPolicyBlockReason()` now normalizes session scope, requested project scope, stored master project scope, and master store tenant scope',
    ],
    'multi-chain permissions linked outlet AI policy scope boundary docs',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'Linked outlet AI policy scope boundary checkpoint',
      'provider calls',
      'normalizeMultiOutletProjectId',
    ],
    'production audit linked outlet AI policy scope boundary evidence',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Linked Outlet AI Policy Scope Boundary',
      'getLinkedOutletPolicyBlockReason()',
      'npm run verify:menulist-api-tenant-safety',
    ],
    'changelog linked outlet AI policy scope boundary evidence',
  );
  assertIncludes(
    'src/app/api/ai-packs/status/route.ts',
    [
      'import { PERMISSIONS }',
      'requireAnyStorePermission,',
      'resolveStorePermissionSessionScope,',
      'const scope = resolveStorePermissionSessionScope(session);',
      'scope.tenantScope.numericId',
      'scope.storeScope.numericId',
      'const permissionError = await requireAnyStorePermission(',
      '[PERMISSIONS.ACCESS_BILLING]',
      'if (permissionError) return permissionError;',
    ],
    'AI pack status permission guard',
  );
  assertOrder(
    'src/app/api/ai-packs/status/route.ts',
    [
      'const scope = resolveStorePermissionSessionScope(session);',
      'if (!scope) {',
      'const permissionError = await requireAnyStorePermission(',
      'if (permissionError) return permissionError;',
      'const capacityCheck = await checkAICapacity(',
    ],
    'AI pack status route must check billing permission before capacity reads',
  );
  const aiPackStatusRoute = read('src/app/api/ai-packs/status/route.ts');
  assert(!aiPackStatusRoute.includes('const tenantId = session?.user?.tenantId || session?.tId'), 'AI pack status must not prefer a conflicting legacy tenant alias for datastore scope');
  assert(!aiPackStatusRoute.includes('const storeId = session?.user?.storeId || session?.sId'), 'AI pack status must not prefer a conflicting legacy store alias for datastore scope');
  assert(!aiPackStatusRoute.includes('Number(tenantId)'), 'AI pack status must not loose-coerce tenant scope');
  assert(!aiPackStatusRoute.includes('Number(storeId)'), 'AI pack status must not loose-coerce store scope');
  [
    [
      'src/app/api/business-copy/route.ts',
      [
        'const attemptedData = getAIRouteLogContext({',
        'categoryCount: Array.isArray(rawData?.menu?.categories) ? rawData.menu.categories.length : 0',
        'itemCount: Array.isArray(rawData?.menu?.items) ? rawData.menu.items.length : 0',
        'sourceLang: rawData?.sourceLang?.code || rawData?.sourceLang',
        'storeName: rawData?.store?.name',
        'attemptedData,',
        'writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, attemptedData)',
      ],
      'Business Copy validation diagnostics must be bounded before local log writes',
    ],
    [
      'src/app/api/seo/route.ts',
      [
        'const attemptedData = getSeoAttemptedInputSummary(rawData)',
        "typeof record.menu === 'object'",
        "typeof record.store === 'object'",
        'categoryCount: Array.isArray(menu.categories) ? menu.categories.length : 0',
        'itemCount: Array.isArray(menu.items) ? menu.items.length : 0',
        'storeName: store.name',
        'attemptedData,',
        'writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, attemptedData)',
      ],
      'SEO validation diagnostics must be bounded before local log writes',
    ],
    [
      'src/app/api/descriptions/route.ts',
      [
        'const attemptedData = getAIRouteLogContext({',
        'action: rawData?.action',
        'itemCount: Array.isArray(rawData?.itemsList) ? rawData.itemsList.length : 0',
        'sourceLang: rawData?.sourceLang?.code || rawData?.sourceLang',
        'targetLang: rawData?.targetLang?.code || rawData?.targetLang',
        'attemptedData,',
        'writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, attemptedData)',
      ],
      'Description validation diagnostics must be bounded before local log writes',
    ],
    [
      'src/app/api/translations/route.ts',
      [
        'const attemptedData = getAIRouteLogContext({',
        'action: rawData?.action',
        'inputKeyCount: Object.keys(rawData?.inputJson || {}).length',
        'sourceLang: rawData?.sourceLang?.code || rawData?.sourceLang',
        'targetLang: rawData?.targetLang?.code || rawData?.targetLang',
        'attemptedData,',
        'writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, attemptedData)',
      ],
      'Translation validation diagnostics must be bounded before local log writes',
    ],
    [
      'src/app/api/new-item-metadata/route.ts',
      [
        'const attemptedData = getAIRouteLogContext({',
        'contentLength: rawData?.contentLength',
        'itemCount: rawData?.item ? 1 : 0',
        'sourceLang: rawData?.sourceLang?.code || rawData?.sourceLang',
        'targetLang: rawData?.targetLang?.code || rawData?.targetLang',
        'attemptedData,',
        'writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, attemptedData)',
      ],
      'New item metadata validation diagnostics must be bounded before local log writes',
    ],
  ].forEach(([route, tokens, message]) => {
    const source = read(route);
    tokens.forEach((token) => {
      assert(source.includes(token), `${route} ${message}: ${token}`);
    });
    assert(!source.includes('writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, rawData)'), `${route} must not write raw validation payloads to local logs`);
  });
  assert(read('src/app/api/image-generation/batch-trigger/route.ts').includes('attemptedData: requestLogContext'), 'batch image trigger validation diagnostics must reuse bounded attempted-data context');
  [
    'src/app/api/descriptions/route.ts',
    'src/app/api/translations/route.ts',
  ].forEach((route) => {
    const source = read(route);
    assert(!source.includes('attemptedProjectId'), `${route} must not log raw attempted project IDs in security events`);
    assert(!source.includes('\n                projectId,\n                reason: outletPolicyBlockReason,'), `${route} must not log raw project IDs in outlet policy security events`);
  });
  assert(!read('src/app/api/new-item-metadata/route.ts').includes('substring(0, 50)'), 'new item metadata validation security logs must not include raw item text previews');
  assertIncludes(
    'src/app/api/analytics/roi-metrics/route.ts',
    [
      "import { withAuth } from '../../../../middleware/auth';",
      'applyAnalyticsReadRateLimit',
      'const DEFAULT_ROI_RANGE_DAYS = 30;',
      'const MAX_ROI_HOURLY_COST = 1000;',
      'const MAX_ROI_PLATFORM_MONTHLY_COST = 100_000;',
      'const MAX_ROI_MINUTES_SAVED_PER_CONVERSATION = 480;',
      'const ROI_DAYS_PARAM_PATTERN = /^\\d{1,3}$/;',
      'const ROI_MONEY_PARAM_PATTERN = /^\\d+(?:\\.\\d{1,2})?$/;',
      'function parseBoundedRoiDaysParam(rawDays: string | null): number',
      'function parseBoundedRoiMoneyParam(rawValue: string | null, maxValue: number): number | undefined',
      'const days = parseBoundedRoiDaysParam(searchParams.get(\'days\'));',
      'const hourlyCost = parseBoundedRoiMoneyParam(hourlyCostParam, MAX_ROI_HOURLY_COST);',
      'const minutesSavedPerConversation = parseBoundedRoiMoneyParam(',
      'const platformMonthlyCost = parseBoundedRoiMoneyParam(platformCostParam, MAX_ROI_PLATFORM_MONTHLY_COST);',
      '...(hourlyCost !== undefined && { avgSupportAgentHourlyCost: hourlyCost })',
      'assumedMinutesSavedPerConversation: minutesSavedPerConversation',
      '...(platformMonthlyCost !== undefined && { platformMonthlyCost })',
      'export const GET = withAuth(async (request: NextRequest, session) => {',
      'const answerlatticeScope = resolveAnswerlatticeSessionScope(session);',
      'if (!answerlatticeScope)',
      'const scopedSession = getAnswerlatticeScopedSession(session);',
      "logAnalyticsFailure('analytics_roi_metrics_api_failed'",
    ],
    'ROI metrics route shared auth guard',
  );
  const roiMetricsRoute = read('src/app/api/analytics/roi-metrics/route.ts');
  assert(!roiMetricsRoute.includes('getActiveSession'), 'ROI metrics route must use withAuth instead of direct session lookup');
  assert(!roiMetricsRoute.includes('parseFloat('), 'ROI metrics route must not parse partial numeric override params');
  assert(!roiMetricsRoute.includes('parseInt('), 'ROI metrics route must not parse partial day params');
  assert(!roiMetricsRoute.includes('resolvedConversations'), 'ROI metrics route must not invent resolved-conversation outcomes');
  assert(!roiMetricsRoute.includes('avgCustomerLifetimeValue'), 'ROI metrics route must not infer retention value from feedback');
  assertIncludes(
    '__docs__/answerlattice/chat-monitoring/chat-monitoring_impl.md',
    [
      'ROI metrics query-parameter boundary',
      'ignores malformed money overrides',
      'clamps valid overrides to finite server caps',
      'does not change the optimized chat statistics read path',
    ],
    'Answerlattice chat monitoring implementation ROI query boundary',
  );
  assertIncludes(
    '__docs__/answerlattice/chat-monitoring/chat-monitoring_firebase.md',
    [
      'ROI metrics query-parameter boundary',
      'bounded numeric parser',
      'No additional Firestore read/write/delete',
      'no provider call',
    ],
    'Answerlattice chat monitoring Firebase ROI query boundary',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'ROI metrics query-parameter boundary checkpoint',
      '`src/app/api/analytics/roi-metrics/route.ts` now parses `days` with a strict digit guard',
      'money overrides use a strict decimal guard',
      '`npm run verify:menulist-api-tenant-safety` source-gates the ROI days parser',
    ],
    'production audit ROI query boundary evidence',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'ROI Metrics Query Parameter Boundary',
      'ROI override values are finite and bounded',
      'Partial numeric parsing is blocked',
      'npm run verify:menulist-api-tenant-safety',
    ],
    'primary changelog ROI query boundary entry',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'ROI Metrics Query Parameter Boundary',
      'ROI override values are finite and bounded',
      'Partial numeric parsing is blocked',
      'npm run verify:menulist-api-tenant-safety',
    ],
    'mirrored changelog ROI query boundary entry',
  );

  assertIncludes(
    'src/lib/analytics/analyticsDiagnostics.ts',
    [
      "import { secureError } from '@lib/security/secureLogger';",
      'getBoundedAnalyticsStringContext',
      'getAnalyticsTrackingContext',
      'getAnalyticsQueueContext',
      'new Error(failureCode)',
      'sourceErrorName',
      'sourceErrorCode',
      'sourceStatusCode',
    ],
    'analytics bounded diagnostics helper',
  );
  assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(analyticsDiagnostics), 'analytics diagnostics helper must not direct-console failures');

  assertIncludes(
    'src/database/analytics/index.ts',
    [
      "import { getAnalyticsQueueContext, getAnalyticsTrackingContext, getBoundedAnalyticsStringContext, logAnalyticsFailure } from \"@lib/analytics/analyticsDiagnostics\";",
      'analytics_queue_flush_failed',
      'getAnalyticsQueueContext(queueKey, queued)',
      'analytics_queue_persist_failed',
      'reportedAnalyticsQueuePersistFailure',
      'queueEntryCount: analyticsWriteQueue.size',
      'queuedEventCount: getQueuedAnalyticsEventCount()',
      "getBoundedAnalyticsStringContext('serializedQueue', serializedQueue)",
      'analytics_persisted_queue_invalid',
      'analytics_missing_required_identity',
      'analytics_enqueue_failed',
      "if (typeof window === 'undefined') return false;",
      "fetch('/api/public/analytics/track', {",
      "cache: 'no-store'",
      "credentials: 'same-origin'",
      "redirect: 'manual'",
    ],
    'analytics write queue bounded diagnostics',
  );
  assert(!analyticsDatabase.includes('writeAnalyticsEventNow'), 'analytics browser queue must not retain a direct Firestore writer');
  assert(!analyticsDatabase.includes('updateAnalyticsSummary'), 'analytics browser DAL must not retain the dead client summary writer');
  assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(analyticsDatabase), 'analytics database helper must not direct-console queue/write failures');
  assert(!/\blogger\.(?:error|warn|log)\s*\(/.test(analyticsDatabase), 'analytics database helper must not raw-log queue/write failures');
  assert(!analyticsDatabase.includes('} catch {\n    // Analytics must never break the public menu.'), 'analytics queue persistence must not silently swallow localStorage failures');
  assert(!analyticsDatabase.includes('window.localStorage.setItem(ANALYTICS_QUEUE_STORAGE_KEY, JSON.stringify(serializable));'), 'analytics queue persistence must keep serialized queue metadata bounded for diagnostics');

  assertIncludes(
    'src/lib/analytics/unified.ts',
    [
      'getAnalyticsTrackingContext',
      'getBoundedAnalyticsStringContext',
      'logMissingRequiredAnalyticsField',
      'analytics_rate_limit_exceeded',
      'analytics_location_context_failed',
      'analytics_track_event_failed',
      'analytics_firebase_event_failed',
      'analytics_ga4_event_failed',
      'analytics_session_milestones_read_failed',
      'analytics_session_milestones_write_failed',
      'analytics_session_source_read_failed',
	      'analytics_session_source_write_failed',
	      'analytics_active_filter_read_failed',
	      'analytics_active_filter_write_failed',
	      'analytics_entry_source_inference_failed',
	      'getAnalyticsSessionStorageContext',
	      'getSessionMilestoneStateContext',
	      'logEntrySourceInferenceFailure',
	      'MAX_ENTRY_SOURCE_INFERENCE_DIAGNOSTICS',
	      'reportedEntrySourceInferenceFailures',
	      "getBoundedAnalyticsStringContext('storageKey', key)",
	      "getBoundedAnalyticsStringContext('serializedState', serializedState)",
	      "getBoundedAnalyticsStringContext('entrySource', entrySource)",
	      "getBoundedAnalyticsStringContext('filterLabel', label)",
	      "getBoundedAnalyticsStringContext('locationSearch', locationSearch)",
	      "getBoundedAnalyticsStringContext('referrer', referrer)",
	    ],
	    'analytics unified client bounded diagnostics',
	  );
  assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(analyticsUnified), 'analytics unified helper must not direct-console tracking failures');
  assert(!/\blogger\.(?:error|warn|log)\s*\(/.test(analyticsUnified), 'analytics unified helper must not raw-log tracking failures');
  assert(!analyticsUnified.includes('} catch {\n    return null;\n  }'), 'analytics unified sessionStorage helpers must not silently return null on storage/parse failures');
	  assert(!analyticsUnified.includes('Session milestones are additive analytics only; never block customer UX.'), 'analytics unified session milestone writes must not silently swallow storage failures');
	  assert(!analyticsUnified.includes('Source quality is additive analytics only; never block customer UX.'), 'analytics unified source writes must not silently swallow storage failures');
	  assert(!analyticsUnified.includes('Filter intent is additive analytics only; never block customer UX.'), 'analytics unified filter writes must not silently swallow storage failures');
	  assert(!analyticsUnified.includes("} catch {\n    return 'direct';\n  }"), 'analytics unified entry-source inference must not silently downgrade to direct');

  assertIncludes(
    'src/lib/analytics/searchDedup.ts',
    [
      "import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from './analyticsDiagnostics';",
      'reportedSearchDedupStorageAvailabilityFailures',
      'analytics_search_dedup_storage_unavailable',
      'analytics_search_dedup_read_failed',
      'analytics_search_dedup_write_failed',
      "getBoundedAnalyticsStringContext('storageKey', key)",
      "getBoundedAnalyticsStringContext('storedSearchTerms', rawTerms)",
      "getBoundedAnalyticsStringContext('normalizedSearchTerm', normalizedTerm)",
      "getBoundedAnalyticsStringContext('serializedSearchTerms', serializedTerms)",
    ],
    'analytics search de-dupe bounded diagnostics',
  );
  assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(analyticsSearchDedup), 'analytics search de-dupe helper must not direct-console storage failures');
  assert(!/\blogger\.(?:error|warn|log)\s*\(/.test(analyticsSearchDedup), 'analytics search de-dupe helper must not raw-log storage failures');
  assert(!analyticsSearchDedup.includes('} catch {\n    return false;\n  }'), 'analytics search de-dupe reads must not silently swallow storage/parse failures');
  assert(!analyticsSearchDedup.includes('} catch {\n    /* noop */\n  }'), 'analytics search de-dupe writes must not silently swallow storage/parse failures');

  assertIncludes(
    'src/lib/analytics/session.ts',
    [
      "import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from './analyticsDiagnostics';",
      'ANALYTICS_SESSION_STORAGE_FAILURE_CODES',
      'analytics_session_get_failed',
      'analytics_session_refresh_failed',
      'analytics_session_clear_failed',
      'reportedAnalyticsSessionStorageFailures',
      'getAnalyticsSessionStorageFailureContext',
      'logAnalyticsSessionStorageFailure',
      "getBoundedAnalyticsStringContext('sessionIdKey', SESSION_ID_KEY)",
      "getBoundedAnalyticsStringContext('sessionTimestampKey', SESSION_TIMESTAMP_KEY)",
      "getBoundedAnalyticsStringContext('existingSessionId', values.existingId)",
      "getBoundedAnalyticsStringContext('sessionTimestamp', values.timestamp)",
      "fallback: operation === 'get' ? 'new_anonymous_session_id' : 'skip_session_storage_update'",
      "logAnalyticsSessionStorageFailure('get', error",
      "logAnalyticsSessionStorageFailure('refresh', error",
      "logAnalyticsSessionStorageFailure('clear', error)",
    ],
    'analytics session storage bounded diagnostics',
  );
  assert(!analyticsSession.includes('logAnalyticsFailure(\'analytics_session_get_failed\', error);'), 'analytics session get must include bounded storage context');
  assert(!analyticsSession.includes('logAnalyticsFailure(\'analytics_session_refresh_failed\', error);'), 'analytics session refresh must include bounded storage context');
  assert(!analyticsSession.includes('logAnalyticsFailure(\'analytics_session_clear_failed\', error);'), 'analytics session clear must include bounded storage context');

  assertIncludes(
    'src/lib/analytics/geo.ts',
    [
      "import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from './analyticsDiagnostics';",
      'analytics_geolocation_position_failed',
      'analytics_location_lookup_failed',
      'isGeolocationPermissionDenied',
      'GEOLOCATION_PERMISSION_DENIED_CODE',
      'getGeolocationAttemptContext',
      'hasIntlDateTimeFormat',
      'getLocationLookupFailureContext',
      "getBoundedAnalyticsStringContext('timeZone', timeZone)",
      "fallback: 'timezone'",
      "fallback: 'unknown'",
      "typeof navigator !== 'undefined'",
      "logAnalyticsFailure('analytics_location_lookup_failed', error, getLocationLookupFailureContext(timeZone))",
    ],
    'analytics geolocation fallback bounded diagnostics',
  );
  assert(!analyticsGeo.includes('}).catch(() => null);'), 'analytics geolocation lookup must not silently swallow position failures');
  assert(!analyticsGeo.includes("logAnalyticsFailure('analytics_location_lookup_failed', error);"), 'analytics location lookup failures must include bounded fallback context');

  assertIncludes(
    'src/lib/analytics/timeZoneDiagnostics.ts',
    [
      "import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from './analyticsDiagnostics';",
      'analytics_timezone_validation_failed',
      'logAnalyticsTimeZoneFallback',
      'MAX_ANALYTICS_TIME_ZONE_DIAGNOSTICS',
      'reportedAnalyticsTimeZoneFailures',
      "getBoundedAnalyticsStringContext('timeZone', timeZone)",
      "getBoundedAnalyticsStringContext('source', source)",
      "fallbackTimeZone: 'UTC'",
      "hasWindow: typeof window !== 'undefined'",
    ],
    'analytics timezone validation fallback diagnostics',
  );
  assertIncludes(
    'src/lib/analytics/dateKey.ts',
    [
      "import { isValidAnalyticsTimeZone } from './timeZoneDiagnostics';",
      "isValidAnalyticsTimeZone(timeZone, 'analytics_date_key') ? timeZone : 'UTC'",
    ],
    'analytics date-key timezone validation diagnostics',
  );
  assertIncludes(
    'src/lib/analytics/businessDay.ts',
    [
      "import { isValidAnalyticsTimeZone } from './timeZoneDiagnostics';",
      "isValidAnalyticsTimeZone(timeZone, 'analytics_business_day') ? timeZone : 'UTC'",
    ],
    'analytics business-day timezone validation diagnostics',
  );
  assert(analyticsImplDoc.includes('Shared analytics timezone diagnostics'), 'Analytics implementation timezone diagnostics missing');
  assert(analyticsImplDoc.includes('Entry-source inference diagnostics'), 'Analytics implementation entry-source inference diagnostics missing');
  assert(analyticsImplDoc.includes('Session ID storage diagnostics'), 'Analytics implementation session storage diagnostics missing');
  assert(analyticsImplDoc.includes('Location lookup diagnostics'), 'Analytics implementation location lookup diagnostics missing');
  assert(analyticsFirebaseDoc.includes('Analytics timezone diagnostics rule'), 'Analytics Firebase timezone diagnostics rule missing');
  assert(analyticsFirebaseDoc.includes('Entry-source inference diagnostics rule'), 'Analytics Firebase entry-source inference diagnostics rule missing');
  assert(analyticsFirebaseDoc.includes('Session ID storage diagnostics rule'), 'Analytics Firebase session storage diagnostics rule missing');
  assert(analyticsFirebaseDoc.includes('Location fallback diagnostics rule'), 'Analytics Firebase location diagnostics rule missing');
  assert(productionAudit.includes('Analytics timezone validation diagnostics checkpoint'), 'Production audit analytics timezone diagnostics checkpoint missing');
  assert(productionAudit.includes('Analytics entry-source inference diagnostics checkpoint'), 'Production audit analytics entry-source diagnostics checkpoint missing');
  assert(productionAudit.includes('Analytics session ID storage diagnostics checkpoint'), 'Production audit analytics session storage diagnostics checkpoint missing');
  assert(productionAudit.includes('Analytics location fallback diagnostics checkpoint'), 'Production audit analytics location diagnostics checkpoint missing');
  assert(changelog.includes('Analytics Timezone Validation Diagnostics'), 'Changelog analytics timezone diagnostics checkpoint missing');
  assert(changelog.includes('Analytics Entry Source Inference Diagnostics'), 'Changelog analytics entry-source diagnostics checkpoint missing');
  assert(changelog.includes('Analytics Session ID Storage Diagnostics'), 'Changelog analytics session storage diagnostics checkpoint missing');
  assert(changelog.includes('Analytics Location Fallback Diagnostics'), 'Changelog analytics location diagnostics checkpoint missing');
  assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(analyticsTimeZoneDiagnostics), 'analytics timezone diagnostics helper must not direct-console failures');
  assert(!/\blogger\.(?:error|warn|log)\s*\(/.test(analyticsTimeZoneDiagnostics), 'analytics timezone diagnostics helper must not raw-log failures');
  assert(!analyticsDateKey.includes('} catch {\n    return false;\n  }'), 'analytics date-key timezone validation must not silently swallow invalid timezone failures');
  assert(!analyticsBusinessDay.includes('} catch {\n    return false;\n  }'), 'analytics business-day timezone validation must not silently swallow invalid timezone failures');

  assertIncludes(
    'src/lib/utils/schedulerHour.ts',
    [
      "import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from '@lib/analytics/analyticsDiagnostics';",
      'scheduler_hour_timezone_validation_failed',
      'MAX_SCHEDULER_HOUR_TIMEZONE_DIAGNOSTICS',
      'reportedSchedulerHourTimeZoneFailures',
      'logSchedulerHourTimeZoneFallback',
      'isSchedulerTimeZoneValid',
      "getBoundedAnalyticsStringContext('timeZone', timeZone)",
      "fallbackPolicy: 'use_utc_settlement_hour'",
      "hasIntl: typeof Intl !== 'undefined'",
      'if (!isSchedulerTimeZoneValid(timeZone, targetLocalHour)) return fallbackHour;',
    ],
    'app scheduler-hour timezone fallback diagnostics',
  );
  assertIncludes(
    'functions/src/utils/schedulerHour.ts',
    [
      "import { analyticsLogger, getAnalyticsErrorContext, getAnalyticsIdContext } from '../analytics/analyticsDiagnostics';",
      'SCHEDULER_HOUR_TIMEZONE_VALIDATION_FAILED',
      'MAX_SCHEDULER_HOUR_TIMEZONE_DIAGNOSTICS',
      'reportedSchedulerHourTimeZoneFailures',
      "analyticsLogger.warn('[SchedulerHour] Timezone validation failed, using UTC settlement hour'",
      'timeZone: getAnalyticsIdContext(timeZone)',
      "fallbackPolicy: 'use_utc_settlement_hour'",
      "hasIntl: typeof Intl !== 'undefined'",
      'error: getAnalyticsErrorContext(error)',
      'if (!isSchedulerTimeZoneValid(timeZone, targetLocalHour)) return fallbackHour;',
    ],
    'Functions scheduler-hour timezone fallback diagnostics',
  );
  assert(!appSchedulerHour.includes('} catch {\n        return fallbackHour;\n    }'), 'app scheduler-hour fallback must not silently swallow timezone failures');
  assert(!functionsSchedulerHour.includes('} catch {\n        return fallbackHour;\n    }'), 'Functions scheduler-hour fallback must not silently swallow timezone failures');
  assert(analyticsImplDoc.includes('Scheduler-hour timezone diagnostics'), 'Analytics implementation scheduler-hour diagnostics missing');
  assert(analyticsFirebaseDoc.includes('Scheduler-hour timezone diagnostics rule'), 'Analytics Firebase scheduler-hour diagnostics rule missing');
  assert(productionAudit.includes('Scheduler-hour timezone diagnostics checkpoint'), 'Production audit scheduler-hour timezone diagnostics checkpoint missing');
  assert(changelog.includes('Scheduler-Hour Timezone Diagnostics'), 'Changelog scheduler-hour timezone diagnostics checkpoint missing');

  [
    ['src/lib/analytics/device.ts', analyticsDevice, 'analytics_device_user_agent_parse_failed'],
    ['src/lib/analytics/geo.ts', analyticsGeo, 'analytics_location_lookup_failed'],
    ['src/lib/analytics/session.ts', analyticsSession, 'analytics_session_get_failed'],
  ].forEach(([relPath, source, failureCode]) => {
    assertIncludes(relPath, ['logAnalyticsFailure', failureCode], `${relPath} bounded analytics diagnostics`);
    assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(source), `${relPath} must not direct-console analytics failures`);
  });

  assertIncludes(
    'src/lib/analytics/dal.ts',
    [
      "import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from './analyticsDiagnostics';",
      'getAnalyticsDalSessionContext',
      'getAnalyticsDalDateRangeContext',
      'analytics_dashboard_data_fetch_failed',
      'analytics_ai_intelligence_fetch_failed',
      'analytics_summary_metrics_fetch_failed',
    ],
    'analytics DAL bounded diagnostics',
  );
  assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(analyticsDal), 'analytics DAL must not direct-console owner dashboard failures');
  assert(!analyticsDal.includes('generateHealthMetrics'), 'analytics DAL must not derive system health from incompatible chat/feedback denominators');
  assert(!analyticsDal.includes('Knowledge Base Coverage'), 'analytics DAL must not label negative-feedback gap counts as knowledge-base coverage');
  assert(!analyticsDal.includes('User Satisfaction'), 'analytics DAL must not label feedback share as measured user satisfaction');
  assert(!analyticsDal.includes('API Response Time'), 'analytics DAL must not emit fake API response-time health metrics');
  assert(!analyticsDal.includes('value: 245'), 'analytics DAL must not emit hard-coded API latency values');
  assert(!analyticsDal.includes('mock for now'), 'analytics DAL must not retain mock production-health comments');
  assert(analyticsDal.includes('totalMessages: statistics?.totalMessages || 0'), 'analytics DAL summary must carry source-backed total message counts');
  assert(analyticsComparisonView.includes('totalMessages: data.summary.totalMessages'), 'analytics comparison view must use source-backed total message counts');
  assert(analyticsComparisonView.includes('resolveAnswerlatticeSessionScope(session)'), 'analytics comparison view must derive exact Answerlattice workspace identity');
  assert(analyticsComparisonView.includes('getDashboardData(dateRange, session)'), 'analytics comparison view must pass its initiating session to the DAL');
  assert(!analyticsComparisonView.includes('tenantId: string'), 'analytics comparison view must not accept a raw tenant ID as read authority');
  assert(!analyticsComparisonView.includes('storeId: string'), 'analytics comparison view must not accept a raw store ID as read authority');
  assert(!analyticsDal.includes('activeUsers: 0'), 'analytics comparison wrapper must not emit fake active-user counts');
  assert(!analyticsDal.includes('totalMessages: 0, // Not in current summary'), 'analytics comparison wrapper must not zero source-backed total messages');
  assert(analyticsComparison.includes('totalMessages: ComparisonResult'), 'analytics comparison engine must compare total messages');
  assert(analyticsComparison.includes("changeUnit: 'percent' | 'percentage-points'"), 'analytics comparison engine must preserve change units');
  assert(analyticsComparison.includes('positiveFeedbackShare: ComparisonResult'), 'analytics comparison engine must expose literal feedback-share comparison');
  assert(analyticsComparison.includes("changeUnit: 'percentage-points'"), 'analytics comparison engine must render feedback-share movement in percentage points');
  assert(!analyticsComparison.includes('satisfaction: ComparisonResult'), 'analytics comparison engine must not infer satisfaction');
  assert(!analyticsComparison.includes('activeUsers: ComparisonResult'), 'analytics comparison engine must not expose fake active-user comparison');
  assert(analyticsComparisonView.includes('title="Total Messages"'), 'analytics comparison view must render source-backed total messages');
  assert(analyticsComparisonView.includes('data.feedback.total > 0 ? data.summary.satisfactionRate : null'), 'analytics comparison view must preserve unavailable feedback share');
  assert(analyticsComparisonView.includes('comparison.positiveFeedbackShare'), 'analytics comparison view must use literal feedback-share comparison');
  assert(!analyticsComparisonView.includes('title="Active Users"'), 'analytics comparison view must not render fake active users');
  assert(chatInsights.includes("title: 'Positive Feedback Share'"), 'Chat Insights must label positive feedback divided by recorded feedback accurately');
  assert(!chatInsights.includes('feedbackResponseRate'), 'Chat Insights must not divide feedback events by chat sessions as response coverage');
  assert(!chatInsights.includes('SystemHealthSection'), 'Chat Insights must not present derived chat ratios as infrastructure/system health');
  assert(!chatInsights.includes('value: 88'), 'Chat Insights must not render hard-coded feedback response rate');
  assert(!chatInsights.includes('value: -10'), 'Chat Insights must not render hard-coded Knowledge Gaps trend');
  assert(!chatInsights.includes('description={analyticsMetadata?.lastError'), 'Chat Insights must not render stored analytics job errors directly');
  assert(!chatInsights.includes('PlatformGlobalDataContext'), 'Chat Insights must not read MenuList store state for Answerlattice analytics status');
  assert(!chatInsights.includes('analyticsMetadata?.lastStatus'), 'Chat Insights must not render cross-product analytics job status');
  assert(analyticsDashboard.includes('description="Try again later."'), 'Analytics dashboard must use fixed error description');
  assert(customerAppMetrics.includes('description="Try again later."'), 'Customer App metrics must use fixed error description');
  assert(!analyticsDashboard.includes('description={error.message}'), 'Analytics dashboard must not render raw exception text');
  assert(!customerAppMetrics.includes('description={error.message}'), 'Customer App metrics must not render raw exception text');

  assertIncludes(
    'src/lib/analytics/normalizer.ts',
    [
      "import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from './analyticsDiagnostics';",
      'getAnalyticsNormalizerValidationContext',
      'analytics_normalized_metrics_validation_failed',
      'hasMetricsRecord',
      'hasMetadata',
    ],
    'analytics normalizer bounded diagnostics',
  );
  assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(analyticsNormalizer), 'analytics normalizer must not direct-console validation failures');

  assertIncludes(
    'src/services/analytics/index.ts',
    [
      'LEGACY_ANALYTICS_RESPONSE_JSON_MAX_BYTES = 1024 * 1024',
      'readJsonResponseWithLimit<unknown>',
      'legacy_analytics_response_parse_failed',
      'legacy_analytics_response_invalid',
      'isAnalyticsReportResponse',
      "if (endpoint === 'reports')",
      'return payload.report',
      'createLegacyAnalyticsClientError(endpoint, response)',
      "fetch(`/api/analytics/${endpoint}?${searchParams}`, {",
      "cache: 'no-store'",
      "credentials: 'same-origin'",
      "redirect: 'manual'",
    ],
    'legacy analytics browser response parser',
  );
  assert(!analyticsService.includes('return response.json()'), 'legacy analytics browser service must not return direct response parsing');
  assert(!analyticsService.includes('.json().catch'), 'legacy analytics browser service must not silently swallow malformed response JSON');
  assert(!analyticsService.includes('data.error ||'), 'legacy analytics browser service must not surface raw analytics API error text');
  assertIncludes(
    'src/database/ownerDashboard/index.ts',
    [
      'OWNER_ACTION_MARK_DONE_RESPONSE_JSON_MAX_BYTES = 16 * 1024',
      'readJsonResponseWithLimit<unknown>',
      'readOwnerActionMarkDoneResponse',
      'isOwnerActionMarkDonePayload(payload)',
      'owner_dashboard_action_mark_done_response_parse_failed',
      'owner_dashboard_action_mark_done_response_rejected',
      'owner_dashboard_action_mark_done_response_invalid',
      'owner_dashboard_action_mark_done_receipt_invalid',
      "throw new Error('Could not mark action done')",
      "fetch('/api/analytics/owner-action/mark-done', {",
      "cache: 'no-store'",
      "credentials: 'same-origin'",
      "redirect: 'manual'",
    ],
    'owner dashboard action mark-done bounded response parser',
  );
  assert(!ownerDashboardDal.includes('response.json().catch(() => null)'), 'owner dashboard action mark-done must not silently swallow response parse failures');
  assert(!ownerDashboardDal.includes("payload?.error || 'Could not mark action done'"), 'owner dashboard action mark-done must not surface raw API error text');
  assert(!ownerDashboardDal.includes('return normalizeOwnerActionReceipt(payload?.receipt) as OwnerActionReceipt'), 'owner dashboard action mark-done must guard receipt shape before returning success');
  assertIncludes(
    'src/app/api/analytics/owner-action/mark-done/route.ts',
    [
      "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
      "import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';",
      'const MarkDoneProjectIdSchema = z.string()',
      ".regex(/^[A-Za-z0-9_-]+$/)",
      ".refine(isValidFirestoreDocumentId, 'Invalid project ID')",
      'projectId: MarkDoneProjectIdSchema',
      'const OWNER_ACTION_SCOPE_DOCUMENT_ID_PATTERN = /^\\d+$/;',
      'function normalizeMarkDoneScopeDocumentId(value: unknown): string | null',
      'OWNER_ACTION_SCOPE_DOCUMENT_ID_PATTERN.test(documentId)',
      'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
      'if (!isValidFirestoreDocumentId(dashboardDocId))',
      "logAnalyticsFailure('owner_action_mark_done_invalid_dashboard_doc_id'",
      "import { markOwnerActionDoneTransaction } from '@lib/analytics/ownerActionReceiptTransaction';",
      'const outcome = await markOwnerActionDoneTransaction(admin.firestore(), {',
      'const sessionScope = resolveStorePermissionSessionScope(session);',
      'const rawTenantId = sessionScope?.tenantScope.documentId;',
      'const rawStoreId = sessionScope?.storeScope.documentId;',
      'const userId = resolveCurrentSessionUserDocumentId(session);',
      'const storeId = normalizeMarkDoneScopeDocumentId(rawStoreId);',
      'if (!tenantId || !storeId || !userId)',
      "logAnalyticsFailure('owner_action_mark_done_invalid_session_scope'",
      "return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });",
    ],
    'owner dashboard action mark-done session/project/receipt ID boundary',
  );
  assertOrder(
    'src/app/api/analytics/owner-action/mark-done/route.ts',
    [
      'const sessionScope = resolveStorePermissionSessionScope(session);',
      'const rawTenantId = sessionScope?.tenantScope.documentId;',
      'const tenantId = normalizeMarkDoneScopeDocumentId(rawTenantId);',
      'const userId = resolveCurrentSessionUserDocumentId(session);',
      'if (!tenantId || !storeId || !userId)',
      "const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');",
      'const bodyResult = await readBoundedJsonBody',
      'const validation = MarkDoneSchema.safeParse(bodyResult.data);',
      'const { projectId, actionId, actionType, actionTitle, actionLabel, metricLabel } = validation.data;',
      'const receiptId = buildReceiptId(projectId, actionId);',
      'const dashboardDocId = `${tenantId}_${storeId}_${projectId}_dashboard_summary`;',
      'if (!isValidFirestoreDocumentId(dashboardDocId))',
      'const dashboardRef = admin.firestore().collection(DB_COLLECTIONS.ANALYTICS).doc(dashboardDocId);',
    ],
    'owner dashboard action mark-done ID validation before Firestore document access',
  );
  assert(!ownerActionMarkDoneRoute.includes('.trim()'), 'owner dashboard action mark-done projectId must not trim before validation');
  assert(!ownerActionMarkDoneRoute.includes('if (!isValidFirestoreDocumentId(tenantId) || !isValidFirestoreDocumentId(storeId))'), 'owner dashboard action mark-done session scope must not rely on trim-tolerant direct document-ID checks');
  assert(!ownerActionMarkDoneRoute.includes('projectId: z.string().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/)'), 'owner dashboard action mark-done projectId must not keep regex-only validation');
  assert(!ownerActionMarkDoneRoute.includes('const dashboardRef = admin.firestore().collection(DB_COLLECTIONS.ANALYTICS).doc(`${tenantId}_${storeId}_${projectId}_dashboard_summary`)'), 'owner dashboard action mark-done must keep the dashboard doc id inspectable before Firestore access');
  assert(!ownerActionMarkDoneRoute.includes("session.tId || session.user?.tenantId || ''"), 'owner dashboard action mark-done must not select one tenant alias');
  assert(!ownerActionMarkDoneRoute.includes("session.sId || session.user?.storeId || ''"), 'owner dashboard action mark-done must not select one store alias');
  assert(!ownerActionMarkDoneRoute.includes("String(session.uId || session.user?.id || 'unknown')"), 'owner dashboard action mark-done must not select one actor alias');
  assert(!ownerActionMarkDoneRoute.includes('await dashboardRef.get();'), 'owner dashboard action mark-done must not read outside its receipt transaction');
  assert(!ownerActionMarkDoneRoute.includes('await dashboardRef.update(updates);'), 'owner dashboard action mark-done must not write outside its receipt transaction');
  [
    'const OWNER_ACTION_RECEIPT_ID_PATTERN = /^[a-f0-9]{32}$/;',
    'function isOwnerActionReceiptId',
    'const entries = getReceiptEntries(data).filter(([receiptId]) => isOwnerActionReceiptId(receiptId));',
    'export function getOwnerActionReceiptIdsToPrune(',
    'const incomingAlreadyExists = entries.some(([receiptId]) => receiptId === incomingReceiptId);',
    '.filter(([receiptId]) => receiptId !== incomingReceiptId)',
    'return firestore.runTransaction(async (transaction) => {',
    'const dashboardSnap = await transaction.get(params.dashboardRef);',
    'transaction.update(params.dashboardRef, updates);',
  ].forEach((token) => assert(ownerActionReceiptTransaction.includes(token), `owner action receipt transaction helper missing ${token}`));
  assert(analyticsFirebaseDoc.includes('Owner action mark-done session scope boundary'), 'Analytics Firebase docs must record owner action mark-done session scope ID boundary');
  assert(analyticsFirebaseDoc.includes('Whitespace-mutated, nonnumeric, zero, negative, unsafe, or reserved session scope'), 'Analytics Firebase docs must record strict owner action mark-done session scope rejection');
  assert(analyticsFirebaseDoc.includes('Owner action mark-done project/receipt ID boundary'), 'Analytics Firebase docs must record owner action mark-done project/receipt ID boundary');
  assert(analyticsFirebaseDoc.includes('whitespace-mutated project IDs'), 'Analytics Firebase docs must record owner action mark-done whitespace-mutated project ID rejection');
  assert(analyticsImplDoc.includes('Owner action mark-done session scope boundary'), 'Analytics implementation docs must record owner action mark-done session scope ID boundary');
  assert(analyticsImplDoc.includes('Whitespace-mutated, nonnumeric, zero, negative, unsafe, or reserved session scope'), 'Analytics implementation docs must record strict owner action mark-done session scope rejection');
  assert(analyticsImplDoc.includes('Owner action mark-done project/receipt ID boundary'), 'Analytics implementation docs must record owner action mark-done project/receipt ID boundary');
  assert(analyticsImplDoc.includes('whitespace-mutated project IDs'), 'Analytics implementation docs must record owner action mark-done whitespace-mutated project ID rejection');
  assert(productionAudit.includes('Owner Action Mark-Done Session Scope Boundary checkpoint'), 'Production audit must record owner action mark-done session scope checkpoint');
  assert(productionAudit.includes('Owner Action Mark-Done Project And Receipt ID Boundary checkpoint'), 'Production audit must record owner action mark-done project/receipt checkpoint');
  assert(changelog.includes('Owner Action Mark-Done Session Scope Boundary'), 'Changelog must record owner action mark-done session scope boundary');
  assert(changelog.includes('Owner Action Mark-Done Project And Receipt ID Boundary'), 'Changelog must record owner action mark-done project/receipt boundary');

  [
    [
      'src/components/templates/main-app/dashboard/googleAnalytics/MenuPerformance.tsx',
      googleMenuPerformance,
      'dashboard_google_menu_performance_load_failed',
      'Error fetching menu stats:',
    ],
    [
      'src/components/templates/main-app/dashboard/googleAnalytics/QuickStats.tsx',
      googleQuickStats,
      'dashboard_google_quick_stats_load_failed',
      'Error fetching stats:',
    ],
    [
      'src/components/templates/main-app/dashboard/googleAnalytics/LocationInsights.tsx',
      googleLocationInsights,
      'dashboard_google_location_insights_load_failed',
      'Error fetching location stats:',
    ],
    [
      'src/components/templates/main-app/dashboard/googleAnalytics/TrendAnalysis.tsx',
      googleTrendAnalysis,
      'dashboard_google_trend_analysis_load_failed',
      'Error fetching trend data:',
    ],
  ].forEach(([relPath, source, failureCode, rawMessage]) => {
    assertIncludes(relPath, ['getBoundedAnalyticsStringContext', 'logAnalyticsFailure', failureCode], `${relPath} bounded dashboard analytics diagnostics`);
    assert(!/\bconsole\.(?:error|warn|log|debug)\s*\(/.test(source), `${relPath} must not direct-console dashboard analytics failures`);
    assert(!source.includes(rawMessage), `${relPath} must not include old raw analytics diagnostic`);
  });
  assertIncludes(
    'src/components/templates/main-app/dashboard/googleAnalytics/DateRangeSelector.tsx',
    [
      'assertStoreUpdateSucceeded(',
      'dashboard_google_date_range_preference_store_update_rejected',
      'dashboard_google_date_range_preference_save_failed',
      'void saveDashboardPreferences(range);',
      "getBoundedAnalyticsStringContext('dateRange', dateRange)",
    ],
    'legacy analytics date-range preference save acknowledgement and bounded diagnostics',
  );
  assert(!/\bconsole\.(?:error|warn|log|debug)\s*\(/.test(googleDateRangeSelector), 'DateRangeSelector must not direct-console preference save failures');
  assert(googleDateRangeSelector.includes('const writeResult = await updateStore({'), 'DateRangeSelector must capture the store update result before acknowledgement inspection');
  assert(googleQuickStats.includes("row.metricValues?.[2]?.value || '0'"), 'Quick Stats must read revenue from the reports route totalRevenue metric index');
  assert(googleQuickStats.includes('const totalOrders = 0;'), 'Quick Stats must not read unavailable order metric from reports route rows');
  assert(googleTrendAnalysis.includes("row.metricValues?.[2]?.value || '0'"), 'Trend Analysis must read revenue from the reports route totalRevenue metric index');
  assertIncludes(
    'src/components/templates/main-app/dashboard/googleAnalytics/LocationInsights.tsx',
    ['percentage: total > 0 ? (loc.visitors / total) * 100 : 0'],
    'LocationInsights zero-total percentage guard',
  );
}

function verifyOwnerUtilitySecureLogging() {
  const safeMode = read('src/lib/ops/safeMode.ts');
  assertIncludes(
	    'src/lib/ops/safeMode.ts',
	    [
	      "import { logOpsFailure } from '@lib/ops/opsDiagnostics';",
	      "logOpsFailure('ops_safe_mode_check_failed'",
	      'failOpen: true',
	    ],
	    'SAFE_MODE fail-open bounded ops diagnostics',
	  );
	  assert(!safeMode.includes('console.error'), 'SAFE_MODE helper must use bounded ops diagnostics');
	  assert(!safeMode.includes('new Error(String(error))'), 'SAFE_MODE helper must not stringify thrown values into logs');
	  assert(!safeMode.includes('error instanceof Error ? error'), 'SAFE_MODE helper must not pass raw exceptions to secureError');

  const opsDiagnostics = read('src/lib/ops/opsDiagnostics.ts');
  const opsControlRoomClientResponse = read('src/lib/ops/opsControlRoomClientResponse.ts');
  const opsDal = read('src/database/ops/index.ts');
  const schedulerDal = read('src/database/ops/scheduler.ts');
  const opsControlRoom = read('src/components/templates/main-app/platform/opsControlRoom/index.tsx');
  const schedulerMonitor = read('src/components/templates/main-app/platform/schedulerMonitor/index.tsx');
  const storesDal = read('src/database/stores/index.tsx');
  const timeSlotCascadeReconciler = read('src/lib/menu/reconcileTimeSlotPresetCascade.ts');
  const tenantsDal = read('src/database/tenants/index.tsx');
  const desktopBusinessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
  const desktopDomainSettings = read('src/components/templates/main-app/businessSettings/tabs/DomainSettingsTab.tsx');
  const desktopCustomDomain = read('src/components/templates/main-app/businessSettings/tabs/CustomDomainTab.tsx');
  const desktopPosSync = read('src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx');
  const authBrowserRequestPolicy = read('src/lib/auth/browserRequestPolicy.ts');
  const mobileSchedulerMonitor = read('src/components/mobile/screens/MobileSchedulerMonitorScreen.tsx');
  const mobileOpsControlRoom = read('src/components/mobile/screens/MobileOpsControlRoomScreen.tsx');
  const mobilePosSync = read('src/components/mobile/screens/MobilePosSyncScreen.tsx');
  const mobileAdvancedSettings = read('src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx');
  const mobileBasicSettings = read('src/components/mobile/screens/MobileBasicSettingsScreen.tsx');
  const mobileBusinessAttributes = read('src/components/mobile/screens/MobileBusinessAttributesScreen.tsx');
  const mobileBusinessCopy = read('src/components/mobile/screens/MobileBusinessCopySetupScreen.tsx');
  const mobileLocaleSettings = read('src/components/mobile/screens/MobileLocaleSettingsScreen.tsx');
  const mobileSeoAnalytics = read('src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx');
  const mobileHours = read('src/components/mobile/screens/MobileHoursScreen.tsx');
  const mobileWorkingHours = read('src/components/mobile/screens/MobileWorkingHoursEditScreen.tsx');
  const mobileTimeSlots = read('src/components/mobile/screens/MobileTimeSlotsScreen.tsx');
  const mobileDomainSettings = read('src/components/mobile/screens/MobileDomainSettingsScreen.tsx');
  const mobileMore = read('src/components/mobile/screens/MobileMoreScreen.tsx');
  const platformNotificationMonitor = read('src/components/templates/main-app/platform/platformNotificationMonitor/index.tsx');
  const platformNotificationClientResponse = read('src/lib/ops/platformNotificationClientResponse.ts');
  const ownerNotificationMonitor = read('src/components/templates/main-app/platform/ownerNotificationMonitor/index.tsx');
  const ownerNotificationClientResponse = read('src/lib/ops/ownerNotificationClientResponse.ts');
  const ownerBusinessAssistantMonitor = read('src/components/templates/main-app/platform/ownerBusinessAssistantMonitor/index.tsx');
  const costPosture = read('src/components/templates/main-app/platform/costPosture/index.tsx');
  const costPostureDal = read('src/database/ops/costPosture.ts');
  const costPostureRoute = read('src/app/api/platform/cost-posture/route.ts');
  const messagingOnboardingOpsRoute = read('src/app/api/ops/messaging-onboarding/route.ts');
  const messagingOnboardingMonitor = read('src/components/templates/main-app/platform/messagingOnboardingMonitor/index.tsx');
  const notificationClient = read('src/lib/notifications/client.ts');
  const lifecycleMessaging = read('src/lib/messaging/index.ts');
  const notificationService = read('src/lib/notifications/index.ts');
  const smtpConfig = read('src/lib/notifications/smtpConfig.ts');
  const legacyNotificationService = read('src/lib/notifications/notificationService.ts');
  const ownerNotificationService = read('src/lib/owner-notifications/index.ts');
  const ownerNotificationEmail = read('src/lib/owner-notifications/channels/email.ts');
  const ownerNotificationWhatsApp = read('src/lib/owner-notifications/channels/whatsapp.ts');
  const opsAlerts = read('src/lib/ops/alerts.ts');
  const functionsOperations = read('functions/src/triggers/operations.ts');
  const functionsMasterScheduler = read('functions/src/schedulers/masterScheduler.ts');
  const functionsDecisionBlocks = read('functions/src/decisionBlocksScoring.ts');
  [
    'normalizeOwnerNotificationNumericScopeAliases([',
    'storeData?.tId,',
    'storeData?.tenantId,',
    'storedTenantScope?.documentId !== tId',
    'normalizeOwnerNotificationNumericScopeAliases(storedStoreAliases)?.documentId !== sId',
  ].forEach((token) => assert(
    functionsDecisionBlocks.includes(token),
    `Decision Blocks callable store scope must include ${token}`,
  ));
  assert(
    !functionsDecisionBlocks.includes("String(storeData?.tId || storeData?.tenantId || '')"),
    'Decision Blocks callable store scope must reject conflicting tenant aliases',
  );
  assertIncludes(
    'src/data/shared/ownerNotificationDeliveryBoundary.ts',
    [
      'normalizeOwnerNotificationNumericScopeDocumentId',
      'normalizeOwnerNotificationReferenceId',
      'getNextOwnerNotificationProcessingAttempt',
      "status !== 'pending' && status !== 'failed'",
    ],
    'owner notification delivery identity and processing boundary',
  );
  assertIncludes(
    'src/lib/owner-notifications/recipientResolver.ts',
    [
      'event.workspaceId ?? event.storeId',
      'normalizeOwnerNotificationDocumentIdAliases([',
      'workspaceData?.tenantId,',
      'workspaceData?.tId,',
      'storedTenantDocumentId === tenantDocumentId',
      'normalizeOwnerNotificationNumericScopeAliases([',
      'storeData?.tenantId,',
      'storeData?.tId,',
      'storedTenantScope?.numericId === tenantScope.numericId',
    ],
    'owner notification recipient tenant boundary',
  );
  const ownerNotificationRecipient = read('src/lib/owner-notifications/recipientResolver.ts');
  assert(
    !ownerNotificationRecipient.includes('workspaceData?.tenantId ?? workspaceData?.tId')
      && !ownerNotificationRecipient.includes('storeData?.tenantId ?? storeData?.tId'),
    'Owner notification recipient scope must reject conflicting persisted tenant aliases',
  );
  assertIncludes(
    'src/lib/owner-notifications/index.ts',
    [
      'const existing = await transaction.get(ref);',
      'if (existing.exists) {',
      'transaction.create(ref, doc);',
      'options.processExisting === false',
      'getNextOwnerNotificationProcessingAttempt(',
      "error: 'scope_not_found_or_mismatch'",
      'tenantId: event.tenantId',
    ],
    'owner notification app transactional delivery boundary',
  );
  assertIncludes(
    'src/lib/messaging/index.ts',
    [
      'normalizeOwnerNotificationNumericScopeDocumentId(payload.storeId)',
      'normalizeOwnerNotificationNumericScopeDocumentId(payload.tenantId)',
      'resolveAuthoritativeLifecycleRecipient',
      'claimLifecycleDelivery',
      'transaction.create(ref, {',
      'db.collection(MESSAGE_LOGS).doc(documentId).set({',
    ],
    'legacy app lifecycle tenant and idempotency boundary',
  );
  assertIncludes(
    'functions/src/ownerNotifications/processor.ts',
    [
      'normalizeOwnerNotificationNumericScopeDocumentId(payload.tenantId)',
      'normalizeOwnerNotificationNumericScopeDocumentId(payload.storeId)',
      'const existing = await tx.get(eventRef);',
      'if (!existing.exists) tx.create(eventRef, eventDoc);',
      'const event = await claimOwnerNotificationEvent(eventRef);',
      'const tenantAliases = [data.tenantId, data.tId]',
      'normalizeOwnerNotificationNumericScopeAliases(tenantAliases)',
      'storedTenantScope?.numericId !== tenantScope.numericId',
    ],
    'Functions owner notification transactional tenant boundary',
  );
  assert(
    !read('src/lib/owner-notifications/recipientResolver.ts').includes('cleanEmail(data.email)\n        || cleanEmail(hints.email)'),
    'Owner notification automated email resolution must not fall back to caller hints',
  );
  assert(
    !read('functions/src/ownerNotifications/processor.ts').includes('|| event.recipientHints?.email'),
    'Functions owner notification email resolution must not fall back to stored caller hints',
  );
  assertIncludes(
    'src/lib/posSync/testResponse.ts',
    [
      'export const POS_SYNC_TEST_REQUEST_POLICY',
      "cache: 'no-store'",
      "credentials: 'same-origin'",
      "redirect: 'manual'",
    ],
    'POS Sync shared test request policy',
  );
  assert(!mobilePosSync.includes('const POS_SYNC_TEST_REQUEST_POLICY = {'), 'mobile POS sync must use shared test request policy');
  assert(!desktopPosSync.includes('const POS_SYNC_TEST_REQUEST_POLICY = {'), 'desktop POS sync must use shared test request policy');
  assertIncludes(
    'src/lib/ops/opsDiagnostics.ts',
    [
      "import { secureError } from '@lib/security/secureLogger';",
      "'[Ops] Operation failed'",
      'getBoundedOpsStringContext',
      'sourceErrorName',
      'sourceErrorCode',
      'sourceStatusCode',
    ],
    'ops diagnostics helper',
  );
  [
    ['Ops diagnostics helper', opsDiagnostics],
    ['Ops control room client response helper', opsControlRoomClientResponse],
    ['Ops DAL', opsDal],
    ['Scheduler DAL', schedulerDal],
    ['Ops control room', opsControlRoom],
    ['Scheduler monitor', schedulerMonitor],
    ['Mobile scheduler monitor', mobileSchedulerMonitor],
    ['Mobile ops control room', mobileOpsControlRoom],
    ['Mobile domain settings screen', mobileDomainSettings],
    ['Platform notification monitor', platformNotificationMonitor],
    ['Platform notification client response helper', platformNotificationClientResponse],
    ['Owner notification monitor', ownerNotificationMonitor],
    ['Owner notification client response helper', ownerNotificationClientResponse],
    ['Owner Business Assistant monitor', ownerBusinessAssistantMonitor],
    ['Platform cost posture', costPosture],
    ['Platform cost posture DAL', costPostureDal],
    ['Platform cost posture route', costPostureRoute],
    ['Messaging onboarding monitor', messagingOnboardingMonitor],
    ['Notification client', notificationClient],
    ['Lifecycle messaging helper', lifecycleMessaging],
    ['Notification service', notificationService],
    ['Legacy notification service', legacyNotificationService],
    ['Owner notification service', ownerNotificationService],
    ['Owner notification email channel', ownerNotificationEmail],
    ['Owner notification WhatsApp channel', ownerNotificationWhatsApp],
    ['Ops alerts helper', opsAlerts],
    ['Functions operations triggers', functionsOperations],
    ['Functions master scheduler', functionsMasterScheduler],
    ['Functions decision blocks scheduler', functionsDecisionBlocks],
  ].forEach(([label, source]) => {
    assert(!/\bconsole\.(?:error|warn|log|debug)\s*\(/.test(source), `${label} must not use direct runtime console logging`);
  });
  assert(
    !fs.existsSync(path.join(ROOT, 'src/components/mobile/screens/MobileCustomDomainScreen.tsx')),
    'Standalone MobileCustomDomainScreen must not be reintroduced; mobile More > Domain uses MobileDomainSettingsScreen',
  );
  assert(
    !fs.existsSync(path.join(ROOT, 'src/components/mobile/screens/MobileSubdomainScreen.tsx')),
    'Standalone MobileSubdomainScreen must not be reintroduced; mobile More > Domain uses MobileDomainSettingsScreen',
  );
  assert(
    !fs.existsSync(path.join(ROOT, 'src/components/mobile/screens/MobilePublicInfoScreen.tsx')),
    'Standalone MobilePublicInfoScreen must not be reintroduced; mobile More > Brand Settings uses MobileBasicSettingsScreen',
  );
  assert(
    !fs.existsSync(path.join(ROOT, 'src/components/mobile/screens/MobileAnswerlatticeClientScreen.tsx')),
    'Standalone MobileAnswerlatticeClientScreen must not be reintroduced; mobile Answerlattice support uses MobileHelpScreen from MobileMoreScreen',
  );
  assert(
    mobileMore.includes("key: 'basicSettings'") && mobileMore.includes("openSubScreen('basicSettings')"),
    'Mobile More brand settings route must use MobileBasicSettingsScreen',
  );
  assert(
    mobileMore.includes("subScreen === 'answerlatticeDocs') subScreenContent = <MobileHelpScreen initialTab=\"kb\"")
      && mobileMore.includes("subScreen === 'answerlatticeSupport') subScreenContent = <MobileHelpScreen initialTab=\"ticket\"")
      && mobileMore.includes("subScreen === 'answerlatticeReleaseNotes') subScreenContent = <MobileHelpScreen initialTab=\"changelog\""),
    'Mobile More Answerlattice help routes must use MobileHelpScreen tabs',
  );
  [
    ['Mobile Basic Settings', mobileBasicSettings],
    ['Mobile Advanced Settings', mobileAdvancedSettings],
    ['Mobile Business Attributes', mobileBusinessAttributes],
    ['Mobile Locale Settings', mobileLocaleSettings],
    ['Mobile SEO/Analytics Settings', mobileSeoAnalytics],
    ['Mobile Hours', mobileHours],
    ['Mobile Working Hours', mobileWorkingHours],
    ['Mobile Time Slots', mobileTimeSlots],
  ].forEach(([label, source]) => {
    assert(source.includes('logMobileOwnerFailure'), `${label} must use bounded mobile owner diagnostics`);
  });
  assert(mobileBasicSettings.includes('addressLine: formData.addressLine'), 'Mobile Basic Settings must keep public address edits on the active screen');
  assert(mobileBasicSettings.includes('normalizeGeoCoordinateDraft(formData.latitude, formData.longitude)'), 'Mobile Basic Settings must keep validated coordinate edits on the active screen');
  assert(mobileBasicSettings.includes('if (normalizedGeo.geo || storeDetails.geo) updates.geo = normalizedGeo.geo;'), 'Mobile Basic Settings must persist valid coordinate pairs and explicit clears');
  assert(mobileBasicSettings.includes('mobile_basic_settings_save_failed'), 'Mobile Basic Settings must log bounded save failures');
  assert(storesDal.includes('export function assertStoreUpdateSucceeded'), 'Store DAL must expose an explicit update acknowledgement guard');
  assert(storesDal.includes('const assertActiveSessionStore = async'), 'Store DAL owner-local writes must expose active session store guard');
  assert(storesDal.includes("await assertActiveSessionStore(storeId, 'menu_presence_store_scope_mismatch');"), 'Menu presence store writes must verify active session store before writing');
  assert(storesDal.includes("await assertActiveSessionStore(storeId, 'starter_activation_signal_store_scope_mismatch');"), 'Starter activation signal writes must verify active session store before writing');
  assert(storesDal.includes('await revalidatePublicClientCache(storeId, "updateTimeSlotPresets");'), 'Time slot preset store writes must refresh public cache');
  assert(storesDal.includes('timeSlotPresetCascadePending: pendingCascade'), 'Time slot preset edit/delete must atomically persist its project-cascade marker');
  assert(storesDal.includes("throw new Error('time_slot_preset_cascade_pending');"), 'Time slot preset writes must reject while a prior cascade remains pending');
  assert(storesDal.includes("throw new Error('time_slot_preset_cascade_operation_conflict');"), 'Time slot preset marker completion must reject a different operation');
  assert(storesDal.includes('timeSlotPresetCascadePending: deleteField(),'), 'Time slot preset marker completion must transactionally clear the exact marker');
  assert(timeSlotCascadeReconciler.includes('assertProjectPresetCascadeSucceeded('), 'Time slot preset reconciliation must require project cascade acknowledgement');
  assert(timeSlotCascadeReconciler.includes('assertTimeSlotPresetCascadeCompleted(completionResult);'), 'Time slot preset reconciliation must require marker completion acknowledgement');
  assert(tenantsDal.includes('export function assertTenantUpdateSucceeded'), 'Tenant DAL must expose an explicit update acknowledgement guard');
  assert(!tenantsDal.includes('updateTenantsStoreslist'), 'Tenant DAL must not expose stale whole-list replacement');
  assert(mobileBasicSettings.includes('assertStoreUpdateSucceeded('), 'Mobile Basic Settings must require explicit store-write acknowledgement before local success state');
  assert(mobileBasicSettings.includes('mobile_basic_settings_store_update_rejected'), 'Mobile Basic Settings must include bounded store rejected acknowledgement code');
  assert(mobileBasicSettings.includes('assertTenantUpdateSucceeded('), 'Mobile Basic Settings must require explicit tenant-write acknowledgement before local tenant state');
  assert(mobileBasicSettings.includes('mobile_basic_settings_tenant_update_rejected'), 'Mobile Basic Settings must include bounded tenant rejected acknowledgement code');
  assert(mobileBasicSettings.includes('return <MobileBasicSettingsScreenContent key={scopeKey} {...props} />;'), 'Mobile Basic Settings must remount drafts on exact tenant/store changes');
  assert(mobileBasicSettings.includes('previous?.storeId === expectedStoreId && previous?.tenantId === expectedTenantId'), 'Mobile Basic Settings must scope optimistic state to the admitted tenant/store');
  assert(mobileBasicSettings.includes('Object.entries(optimisticUpdates).every(([key, value]) => previous?.[key] === value)'), 'Mobile Basic Settings must rollback only its own optimistic attempt');
  assert(mobileBasicSettings.includes('const currentStoreDetailsRef = useRef(storeDetails);'), 'Mobile Basic Settings must compare completion with current same-store context');
  assert(mobileBasicSettings.includes('mobile_basic_settings_tenant_sync_failed'), 'Mobile Basic Settings must distinguish a post-store tenant synchronization failure');
  assert(desktopBusinessSettings.includes('assertStoreUpdateSucceeded('), 'Desktop Business Settings must require explicit store-write acknowledgement before local success state');
  assert(desktopBusinessSettings.includes('desktop_business_settings_store_update_rejected'), 'Desktop Business Settings must include bounded store update rejected acknowledgement code');
  assert(desktopBusinessSettings.includes('<BusinessSettingsContent key={scopeKey}'), 'Desktop Business Settings must remount by exact tenant/store');
  assert(desktopBusinessSettings.includes('const settingsSaveInFlightRef = useRef(false);'), 'Desktop Business Settings must reject duplicate same-scope saves');
  assert(desktopBusinessSettings.includes('activeBusinessSettingsScopeRef.current !== requestScopeKey'), 'Desktop Business Settings must reject settlement admission after scope change');
  assert(desktopBusinessSettings.includes('activeBusinessSettingsScopeRef.current === requestScopeKey'), 'Desktop Business Settings must guard local settlement by exact scope');
  assert(desktopBusinessSettings.includes('desktop_business_settings_store_create_rejected'), 'Desktop Business Settings must include bounded store create rejected acknowledgement code');
  assert(desktopBusinessSettings.includes('desktop_business_copy_store_update_rejected'), 'Desktop Business Copy must include bounded generated-copy store rejected acknowledgement code');
  assert(desktopBusinessSettings.includes('desktop_business_copy_translation_store_update_rejected'), 'Desktop Business Copy must include bounded translation-repair store rejected acknowledgement code');
  assert(desktopBusinessSettings.includes('desktop_official_page_google_link_store_update_rejected'), 'Desktop Official Page Google link must include bounded store rejected acknowledgement code');
  assert(desktopBusinessSettings.includes('desktop_official_page_google_link_update_failed'), 'Desktop Official Page Google link must log bounded save failures');
  assert(desktopBusinessSettings.includes('desktop_domain_settings_subdomain_store_update_rejected'), 'Desktop Domain Settings subdomain save must include bounded store rejected acknowledgement code');
  assert(desktopDomainSettings.includes('desktop_domain_settings_subdomain_save_failed'), 'Desktop Domain Settings subdomain save must log bounded save failures');
  assert(desktopDomainSettings.includes('await Promise.resolve(onStoreUpdate?.({ subdomain: nextSubdomain }));'), 'Desktop Domain Settings must wait for parent subdomain persistence');
  assert(desktopBusinessSettings.includes('assertTenantUpdateSucceeded('), 'Desktop Business Settings must require explicit tenant-write acknowledgement before local tenant state');
  assert(!desktopBusinessSettings.includes('updateTenantsStoreslist('), 'Desktop Business Settings must rely on the atomic store/summary/tenant-list DAL transaction');
  assert(storesDal.includes('storesList: upsertTenantStoreListEntry(tenantSnapshot.data()?.storesList, nextStore)'), 'Store rename transaction must derive tenant storesList from current state');
  assert(storesDal.includes('transaction.set(summaryRef, {'), 'Store create/update must write storesSummary inside its persistence transaction');
  assert(mobileBasicSettings.includes('hasLogoUpdate: Boolean(updates.imageToUpdate)'), 'Mobile Basic Settings must include bounded logo-update context');
  assert(mobileBasicSettings.includes('tenantNameChanged: formData.tenantName.trim() !== tenantDetails?.name'), 'Mobile Basic Settings must include bounded tenant-name context');
  assert(mobileBusinessAttributes.includes('mobile_business_attributes_save_failed'), 'Mobile Business Attributes must log bounded save failures');
  assert(mobileBusinessAttributes.includes('assertStoreUpdateSucceeded('), 'Mobile Business Attributes must require explicit store-write acknowledgement before local success state');
  assert(mobileBusinessAttributes.includes('mobile_business_attributes_store_update_rejected'), 'Mobile Business Attributes must include bounded store rejected acknowledgement code');
  assert(mobileBusinessAttributes.includes('enabledAttributeCount: Object.values(attributes).filter(Boolean).length'), 'Mobile Business Attributes must include bounded enabled count context');
  assert(mobileBusinessAttributes.includes('customAttributeCount: normalizedCustomAttributes.length'), 'Mobile Business Attributes must include bounded normalized custom count context');
  assert(mobileBusinessAttributes.includes('return <MobileBusinessAttributesScreenContent key={scopeKey} {...props} />;'), 'Mobile Business Attributes must remount drafts on exact tenant/store changes');
  assert(mobileBusinessAttributes.includes('previous?.storeId === expectedStoreId'), 'Mobile Business Attributes must scope optimistic state to the admitted store');
  assert(mobileBusinessAttributes.includes('previous?.tenantId === expectedTenantId'), 'Mobile Business Attributes must scope optimistic state to the admitted tenant');
  assert(mobileBusinessAttributes.includes('...(previous.publicPresence || {})'), 'Mobile Business Attributes must merge acknowledged custom attributes with current same-store public presence');
  assert(!mobileBusinessAttributes.includes('optimisticPublicPresence'), 'Mobile Business Attributes must not project a captured public-presence sibling map optimistically');
  assert(mobileBusinessAttributes.includes('previous?.businessAttributes === previousBusinessAttributes'), 'Mobile Business Attributes must not overwrite a newer same-store attribute update');
  assert(mobileBusinessAttributes.includes('previous?.publicPresence?.customAttributes === previousCustomAttributes'), 'Mobile Business Attributes must not overwrite a newer same-store custom-attribute update');
  assert(mobileBusinessCopy.includes('assertStoreUpdateSucceeded('), 'Mobile Business Copy must require explicit store-write acknowledgement before local success state');
  assert(mobileBusinessCopy.includes('mobile_business_copy_store_update_rejected'), 'Mobile Business Copy must include bounded generated-copy store rejected acknowledgement code');
  assert(mobileBusinessCopy.includes('mobile_business_copy_translation_store_update_rejected'), 'Mobile Business Copy must include bounded translation-repair store rejected acknowledgement code');
  assert(mobileLocaleSettings.includes('mobile_locale_settings_save_failed'), 'Mobile Locale Settings must log bounded save failures');
  assert(mobileLocaleSettings.includes('assertStoreUpdateSucceeded('), 'Mobile Locale Settings must require explicit store-write acknowledgement before local success state');
  assert(mobileLocaleSettings.includes('mobile_locale_settings_store_update_rejected'), 'Mobile Locale Settings must include bounded store rejected acknowledgement code');
  assert(mobileLocaleSettings.includes('activeLanguageCount: normalizedLanguagePolicy.activeLanguages.length'), 'Mobile Locale Settings must include bounded active-language count context');
  assert(mobileLocaleSettings.includes('currencyChanged: formData.currencyCode !== storeDetails.currencyCode || formData.currencySymbol !== storeDetails.currencySymbol'), 'Mobile Locale Settings must include bounded currency-change context');
  assert(mobileLocaleSettings.includes('return <MobileLocaleSettingsScreenContent key={scopeKey} {...props} />;'), 'Mobile Locale Settings must remount drafts on exact tenant/store changes');
  assert(mobileLocaleSettings.includes('previous?.storeId === expectedStoreId && previous?.tenantId === expectedTenantId'), 'Mobile Locale Settings must scope optimistic state to the admitted tenant/store');
  assert(mobileLocaleSettings.includes('localeSaveInFlightRef.current'), 'Mobile Locale Settings must reject duplicate saves before React state settles');
  const mobileOfficialPage = read('src/components/mobile/screens/MobileOfficialPageScreen.tsx');
  assert(mobileOfficialPage.includes('return <MobileOfficialPageScreenContent key={scopeKey} {...props} />;'), 'Mobile Official Page must remount drafts on exact tenant/store changes');
  assert(mobileOfficialPage.includes('previous?.storeId === expectedStoreId'), 'Mobile Official Page must scope optimistic state to the admitted store');
  assert(mobileOfficialPage.includes('previous?.tenantId === expectedTenantId'), 'Mobile Official Page must scope optimistic state to the admitted tenant');
  assert(mobileOfficialPage.includes('presenceSaveInFlightRef.current'), 'Mobile Official Page must reject duplicate saves before React state settles');
  assert(mobileAdvancedSettings.includes('assertStoreUpdateSucceeded('), 'Mobile Advanced Settings must require explicit store-write acknowledgement before local success state');
  assert(mobileAdvancedSettings.includes('mobile_advanced_settings_store_update_rejected'), 'Mobile Advanced Settings must include bounded store rejected acknowledgement code');
  assert(mobileAdvancedSettings.includes('return <MobileAdvancedSettingsScreenContent key={scopeKey} {...props} />;'), 'Mobile Advanced Settings must remount drafts on exact tenant/store/mode changes');
  assert(mobileAdvancedSettings.includes('saveInFlightRef.current'), 'Mobile Advanced Settings must reject duplicate saves before React state settles');
  assert(mobileAdvancedSettings.includes('currentStoreDetails?.storeId !== expectedStoreId'), 'Mobile Advanced Settings must reject obsolete store settlement');
  assert(mobileAdvancedSettings.includes('currentStoreDetails?.tenantId !== expectedTenantId'), 'Mobile Advanced Settings must reject obsolete tenant settlement');
  [
    'mobile_analytics_settings_save_failed',
    'mobile_seo_settings_save_failed',
  ].forEach((failureCode) => {
    assert(mobileSeoAnalytics.includes(failureCode), `Mobile SEO/Analytics Settings must include ${failureCode}`);
  });
  assert(!mobileSeoAnalytics.includes('const saveField = async'), 'Mobile SEO/Analytics must not retain the unused unsafe single-field writer');
  assert(mobileSeoAnalytics.includes('return <MobileSeoAnalyticsScreenContent key={scopeKey} {...props} />;'), 'Mobile SEO/Analytics must remount drafts on exact tenant/store/mode changes');
  assert(mobileSeoAnalytics.includes('saveInFlightRef.current'), 'Mobile SEO/Analytics must reject duplicate saves before React state settles');
  assert(mobileSeoAnalytics.includes('currentDetails?.storeId === expectedStoreId'), 'Mobile SEO/Analytics must scope acknowledgement settlement to the admitted store');
  assert(mobileSeoAnalytics.includes('currentDetails?.tenantId === expectedTenantId'), 'Mobile SEO/Analytics must scope acknowledgement settlement to the admitted tenant');
  assert(mobileSeoAnalytics.includes('currentDetails?.analytics === previousAnalytics'), 'Mobile Analytics must not overwrite newer same-store analytics truth');
  assert(mobileSeoAnalytics.includes('seoFields.every((field) => currentDetails[field] === sourceStoreDetails[field])'), 'Mobile SEO must not overwrite newer same-store SEO truth');
  assert(mobileSeoAnalytics.includes('mobile_analytics_settings_store_update_rejected'), 'Mobile Analytics Settings must include bounded store rejected acknowledgement code');
  assert(mobileSeoAnalytics.includes('mobile_seo_settings_store_update_rejected'), 'Mobile SEO Settings must include bounded store rejected acknowledgement code');
  assert(mobileSeoAnalytics.includes('enabledTrackingCount: countEnabledAnalyticsTracking(analyticsDraft)'), 'Mobile Analytics Settings must include bounded enabled tracking count context');
  assert(mobileSeoAnalytics.includes('localizedDraftLanguageCount: Object.keys(localizedSeoDrafts).length'), 'Mobile SEO Settings must include bounded localized draft count context');
  assert(mobileWorkingHours.includes('assertStoreUpdateSucceeded('), 'Mobile Working Hours must require explicit store-write acknowledgement before local success state');
  assert(mobileWorkingHours.includes('mobile_working_hours_store_update_rejected'), 'Mobile Working Hours must include bounded store rejected acknowledgement code');
  assert(mobileWorkingHours.includes('mobile_working_hours_save_failed'), 'Mobile Working Hours must log bounded save failures');
  assert(mobileWorkingHours.includes('<MobileWorkingHoursEditScreenContent key={scopeKey}'), 'Mobile Working Hours must remount by exact tenant/store');
  assert(mobileWorkingHours.includes("String(previous?.tenantId ?? '') === String(expectedTenantId)"), 'Mobile Working Hours must scope optimistic/rollback state by tenant');
  assert(mobileWorkingHours.includes("String(previous?.storeId ?? '') === String(expectedStoreId)"), 'Mobile Working Hours must scope optimistic/rollback state by store');
  assert(mobileHours.includes('assertStoreUpdateSucceeded('), 'Mobile Today hours update must require explicit store-write acknowledgement before success state');
  assert(mobileHours.includes('mobile_today_hours_store_update_rejected'), 'Mobile Today hours update must include bounded store rejected acknowledgement code');
  assert(mobileHours.includes('mobile_today_hours_update_failed'), 'Mobile Today hours update must log bounded save failures');
  assert(mobileHours.includes('<MobileHoursScreenContent key={scopeKey}'), 'Mobile Today must remount by exact tenant/store');
  assert(mobileHours.includes('const hoursActionInFlightRef = useRef(false);'), 'Mobile Today hours must reject duplicate same-scope writes');
  assert(mobileHours.includes("String(previous?.tenantId ?? '') === String(expectedTenantId)"), 'Mobile Today hours must scope optimistic/rollback state by tenant');
  assert(mobileHours.includes("String(previous?.storeId ?? '') === String(expectedStoreId)"), 'Mobile Today hours must scope optimistic/rollback state by store');
  assert(mobileTimeSlots.includes('assertTimeSlotPresetUpdateSucceeded(writeResult);'), 'Mobile Time Slots must require explicit store-write acknowledgement before local success state');
  assert(mobileTimeSlots.includes('await reconcileTimeSlotPresetCascade('), 'Mobile Time Slots must reconcile project references before local success state');
  assert(mobileTimeSlots.includes('mobile_time_slot_preset_recovery_failed'), 'Mobile Time Slots must surface bounded pending-cascade recovery diagnostics');
  assert(mobileTimeSlots.includes('mobile_time_slot_preset_save_failed'), 'Mobile Time Slots must log bounded save failures');
  assert(mobileTimeSlots.includes('mobile_time_slot_preset_delete_failed'), 'Mobile Time Slots must log bounded delete failures');
  assert(mobileTimeSlots.includes("getBoundedMobileOwnerStringContext('presetLabel'"), 'Mobile Time Slots must include bounded preset-label context');
  assert(mobileTimeSlots.includes('remainingPresetCount: Math.max(presets.length - 1, 0)'), 'Mobile Time Slots must include bounded delete-count context');
  assert(
    mobileMore.includes("subScreen === 'domainSettings') subScreenContent = <MobileDomainSettingsScreen"),
    'Mobile More domain route must use MobileDomainSettingsScreen',
  );
  assert(
    mobileDomainSettings.includes('assertStoreUpdateSucceeded('),
    'Mobile domain settings must require explicit store-write acknowledgement before local subdomain success state',
  );
  assert(
    mobileDomainSettings.includes('mobile_domain_settings_subdomain_store_update_rejected'),
    'Mobile domain settings must include bounded subdomain store rejected acknowledgement code',
  );
  assert(authBrowserRequestPolicy.includes("cache: 'no-store' as RequestCache"), 'domain settings shared browser request policy must bypass browser caches');
  assert(authBrowserRequestPolicy.includes("credentials: 'same-origin' as RequestCredentials"), 'domain settings shared browser request policy must keep credentials same-origin');
  assert(authBrowserRequestPolicy.includes("redirect: 'manual' as RequestRedirect"), 'domain settings shared browser request policy must not follow redirects');
  assert(storesDal.includes('`/api/domain?candidate=${encodeURIComponent(normalizedDomain)}`'), 'custom-domain availability must use the authenticated server claim boundary');
  assert(!storesDal.includes("where('customDomain', '==', normalizedDomain)"), 'custom-domain availability must not query cross-store uniqueness from the browser');
  [
    ['Desktop Domain Settings', desktopDomainSettings],
    ['Desktop Custom Domain', desktopCustomDomain],
    ['Mobile Domain Settings', mobileDomainSettings],
  ].forEach(([label, source]) => {
    assert(source.includes('AUTH_BROWSER_REQUEST_POLICY'), `${label} must use the shared authenticated browser request policy`);
    assert((source.match(/fetch\('\/api\/domain'/g) || []).length >= 3, `${label} must keep guarded custom-domain API calls explicit`);
    assert((source.match(/\.\.\.AUTH_BROWSER_REQUEST_POLICY/g) || []).length >= 2, `${label} custom-domain mutations must spread the shared request policy`);
    assert(!source.includes("fetch('/api/domain', {\n                cache: 'no-store'"), `${label} must not reintroduce inline custom-domain request policy`);
  });
  [
    ['Desktop Domain Settings', desktopDomainSettings, 'value.trim()'],
    ['Mobile Domain Settings', mobileDomainSettings, 'input.trim()'],
  ].forEach(([label, source, inputExpression]) => {
    assert(source.includes(`/api/subdomain/check?subdomain=\${encodeURIComponent(${inputExpression})}`), `${label} must keep guarded subdomain availability API call explicit`);
    assert(!source.includes("fetch(`/api/subdomain/check?subdomain=${encodeURIComponent"), `${label} must not reintroduce inline subdomain request policy`);
  });
  assertOrder(
    'src/components/mobile/screens/MobileDomainSettingsScreen.tsx',
    [
      "const response = await fetch('/api/domain', AUTH_BROWSER_REQUEST_POLICY);",
      'mobile_domain_settings_status_rejected',
      'readMobileDomainSettingsDomainResponseJson<DomainStatusResponse>',
      'mobile_domain_settings_status_response_invalid',
      'setDomainStatus(data);',
    ],
    'mobile domain settings status response guard before state update',
  );
	  assertOrder(
	    'src/components/mobile/screens/MobileDomainSettingsScreen.tsx',
	    [
	      'const response = await fetch(\n                `/api/subdomain/check?subdomain=${encodeURIComponent(input.trim())}`,',
      'AUTH_BROWSER_REQUEST_POLICY',
	      'readJsonResponseWithLimit<SubdomainAvailabilityResponse>',
	      'mobile_domain_settings_subdomain_check_response_parse_failed',
	      'mobile_domain_settings_subdomain_check_rejected',
	      'mobile_domain_settings_subdomain_check_response_invalid',
	      'setAvailability(data);',
	    ],
	    'mobile domain settings subdomain check response guard before availability update',
	  );
  [
    ['src/database/ops/index.ts', [
      'ops_system_state_load_failed',
      'ops_adoption_pulse_load_failed',
      'ops_integrity_signals_load_failed',
      'ops_recent_alerts_load_failed',
      'getBoundedOpsStringContext',
      'function buildOpsStoredTextSummary',
      "result.safeModeReason = buildOpsStoredTextSummary('SAFE_MODE reason', 'safeModeReason', data.reason)",
      "result.lastAlertTitle = buildOpsStoredTextSummary('Alert title', 'lastAlertTitle', lastAlert.title)",
    ]],
    ['src/database/ops/scheduler.ts', [
      'ops_scheduler_run_history_load_failed',
      'ops_scheduler_health_summary_load_failed',
      'ops_scheduler_run_details_load_failed',
      'ops_scheduler_settlement_summary_load_failed',
      'getBoundedOpsStringContext',
    ]],
	    ['src/components/templates/main-app/platform/opsControlRoom/index.tsx', [
	      'OPS_CONTROL_ROOM_REQUEST_POLICY',
	      'readOpsControlRoomSafeModeResponse',
	      'readOpsControlRoomMuteAlertsResponse',
	      'isOpsControlRoomForceRepublishResponse',
	      'logInvalidOpsControlRoomForceRepublishResponse',
	      '...OPS_CONTROL_ROOM_REQUEST_POLICY',
	      'ops_control_room_load_failed',
	      'ops_control_room_safe_mode_toggle_failed',
	      'ops_control_room_mute_alerts_failed',
	      'ops_control_room_force_republish_failed',
	      'ops_control_room_force_republish_response_invalid',
	      'logOpsFailure',
	      'getBoundedOpsStringContext',
	      "message.error('Failed to toggle SAFE_MODE')",
	      "message.error('Failed to mute alerts')",
	      "message.error('Force republish failed')",
	    ]],
	    ['src/lib/ops/opsControlRoomClientResponse.ts', [
	      'OPS_CONTROL_ROOM_RESPONSE_JSON_MAX_BYTES = 16 * 1024',
	      'OPS_CONTROL_ROOM_REQUEST_POLICY',
	      "cache: 'no-store'",
	      "credentials: 'same-origin'",
	      "redirect: 'manual'",
	      'readJsonResponseWithLimit<unknown>',
	      'ops_control_room_response_parse_failed',
	      'ops_control_room_response_invalid',
	      'ops_control_room_response_rejected',
	      'isOpsControlRoomSafeModeResponse',
	      'isOpsControlRoomMuteAlertsResponse',
	      'isOpsControlRoomForceRepublishResponse',
	      'logInvalidOpsControlRoomForceRepublishResponse',
	      "typeof value.success === 'boolean'",
	      'Number.isSafeInteger(value.projectCount)',
	      "typeof value.projectId === 'string'",
	      "typeof value.verification === 'string'",
	      'ops_control_room_force_republish_response_invalid',
	      'readOpsControlRoomSafeModeResponse',
	      'readOpsControlRoomMuteAlertsResponse',
	      "getBoundedOpsStringContext('responseKind', kind)",
	    ]],
    ['src/components/templates/main-app/platform/schedulerMonitor/index.tsx', [
      'ops_scheduler_monitor_load_failed',
      'ops_scheduler_manual_recovery_failed',
      'function formatDetailValue(value: unknown): string',
      "if (typeof value === 'string') return `[text:length=${value.length}]`;",
      "if (Array.isArray(value)) return `[array:length=${value.length}]`;",
      'return `[object:keys=${Object.keys(value as Record<string, unknown>).length}]`;',
      'function formatStoredSchedulerError(value: unknown): string',
      'function formatTaskError(value: unknown): string',
      'return formatStoredSchedulerError(value);',
      'formatTaskError(task.error) || flattenDetails(task.details)',
      "formatStoredSchedulerError(state.error) || 'failed'",
      "formatStoredSchedulerError(err.error) || 'failed'",
      'Details: {flattenDetails(err.details)}',
      'Nightly recovery failed${runLogId ? ` · Run log: ${runLogId}` : \'\'}',
    ]],
    ['src/components/mobile/screens/MobileSchedulerMonitorScreen.tsx', [
      'mobile_scheduler_recovery_trigger_failed',
      'getBoundedOpsStringContext',
      'function formatDetailValue(value: unknown): string',
      "if (typeof value === 'string') return `[text:length=${value.length}]`;",
      "if (Array.isArray(value)) return `[array:length=${value.length}]`;",
      'function formatTaskError(value: unknown): string',
      'formatTaskError(task.error) || flattenDetails(task.details)',
      "Toast.show({ content: 'Nightly recovery failed'",
    ]],
    ['src/components/mobile/screens/MobileOpsControlRoomScreen.tsx', [
      'OPS_CONTROL_ROOM_REQUEST_POLICY',
      'readOpsControlRoomSafeModeResponse',
      'readOpsControlRoomMuteAlertsResponse',
      'isOpsControlRoomForceRepublishResponse',
      'logInvalidOpsControlRoomForceRepublishResponse',
      '...OPS_CONTROL_ROOM_REQUEST_POLICY',
      'mobile_ops_safe_mode_toggle_failed',
      'mobile_ops_mute_alerts_failed',
      'mobile_ops_force_republish_failed',
      'mobile_ops_force_republish_response_invalid',
      'getBoundedOpsStringContext',
      "Toast.show({ content: 'Could not update SAFE_MODE'",
      "Toast.show({ content: 'Could not mute alerts'",
      "Toast.show({ content: 'Republish failed'",
    ]],
	    ['src/components/mobile/screens/MobileDomainSettingsScreen.tsx', [
	      'normalizeVercelDomainDnsRecords',
	      'const domainDnsConfig = domainStatus?.config || domainStatus?.verification',
	      'const dnsRecords = useMemo',
	      'domainStatus?.projectDomain',
	      'DNS records are not available yet. Check verification again in a moment.',
      'copyMobileDomainSettingsText(record.value)',
      'MOBILE_DOMAIN_SETTINGS_COPY_UNAVAILABLE',
      "const copied = document.execCommand('copy');",
	      'mobile_domain_settings_status_rejected',
	      'mobile_domain_settings_status_load_failed',
	      'mobile_domain_settings_subdomain_check_rejected',
	      'mobile_domain_settings_subdomain_check_response_parse_failed',
	      'mobile_domain_settings_subdomain_check_response_invalid',
      'mobile_domain_settings_subdomain_store_update_rejected',
      'mobile_domain_settings_add_failed',
      "method: 'DELETE'",
      'AUTH_BROWSER_REQUEST_POLICY',
      '...AUTH_BROWSER_REQUEST_POLICY',
      'mobile_domain_settings_remove_rejected',
      'mobile_domain_settings_remove_failed',
    ]],
    ['src/components/mobile/screens/MobilePosSyncScreen.tsx', [
      'mobile_pos_sync_settings_save_failed',
      'mobile_pos_sync_store_update_rejected',
      'mobile_pos_sync_test_failed',
	      'mobile_pos_sync_secret_copy_failed',
	      'POS_SYNC_TEST_REQUEST_POLICY',
	      'from \'@lib/posSync/testResponse\'',
	      '...POS_SYNC_TEST_REQUEST_POLICY',
	      'logMobileOwnerFailure',
	      "getBoundedMobileOwnerStringContext('status', nextPosSync.status)",
	      'webhookUrlLength: String(nextPosSync.webhookUrl || \'\').length',
	      'hasWebhookSecret: Boolean(webhookSecret)',
	      'webhookSecretLength: webhookSecret.length',
	      "lastError: enabled && !connectionChanged && currentPosSync.lastError ? POS_SYNC_CONNECTION_ISSUE_MESSAGE : ''",
	      'message: POS_SYNC_CONNECTION_ISSUE_MESSAGE',
    ]],
    ['src/components/mobile/screens/MobileSpecialMenuScreen.tsx', [
      'mobile_special_menu_name_translation_failed',
      'mobile_special_menu_project_public_content_translation_failed',
      'logMobileOwnerFailure',
      "getBoundedMobileOwnerStringContext('projectId', sourceItem?.projectId)",
      "getBoundedMobileOwnerStringContext('selectedLanguage', sourceSelectedLanguage)",
      'managedLanguageCount',
      'displayNameLength',
      'descriptionLength',
      'return <MobileSpecialMenuScreenContent key={scopeKey} {...props} />;',
      'getProjectDataWithoutLoader(projectId, expectedScope)',
      'submitInFlightRef.current',
      'translationInFlightRef.current',
      'if (!isExpectedScope(expectedScope)) return;',
    ]],
    ['src/components/mobile/components/MobileProjectSelectorSheet.tsx', [
      'mobile_project_public_content_translation_failed',
      'logMobileProjectFailure',
      "getBoundedMobileProjectStringContext('selectedLanguage', formSelectedLanguage)",
      "getBoundedMobileProjectStringContext('referenceLanguage', formReferenceLanguage)",
      'nameDraftLength',
      'descriptionDraftLength',
      'hasInitialNameDrafts',
      'hasInitialDescriptionDrafts',
    ]],
    ['src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx', [
      'desktop_pos_sync_test_failed',
      'desktop_pos_sync_delivery_history_load_failed',
      'desktop_pos_sync_toggle_save_failed',
      'desktop_pos_sync_url_save_failed',
      'desktop_pos_sync_secret_copy_failed',
      'desktop_pos_sync_instructions_prepare_failed',
      'desktop_pos_sync_technical_summary_copy_failed',
	      'desktop_pos_sync_sample_download_failed',
	      'desktop_pos_sync_settings_missing_store_update_handler',
	      'POS_SYNC_TEST_REQUEST_POLICY',
	      'from "@lib/posSync/testResponse"',
	      '...POS_SYNC_TEST_REQUEST_POLICY',
	      'await Promise.resolve(onStoreUpdate(updates));',
      "'posSync.webhookUrl': validation.normalizedUrl,\n                'posSync.status': enabled ? 'healthy' : 'disabled',",
      'logBusinessSettingsFailure',
      'POS_SYNC_TEST_FAILED_MESSAGE',
      "message: POS_SYNC_TEST_FAILED_MESSAGE",
      'webhookSecretLength: webhookSecret.length',
      'technicalSummaryLength: technicalSummary.length',
      'sampleJsonLength: sampleJson.length',
    ]],
	    ['src/components/templates/main-app/businessSettings/index.tsx', [
	      'desktop_pos_sync_store_update_rejected',
	      'applyPosSyncStoreUpdates',
	    ]],
	    ['src/lib/runtime/runtimeDiagnostics.ts', [
	      'copyRuntimeTextToClipboard',
	      'RUNTIME_CLIPBOARD_COPY_UNAVAILABLE',
	      'RUNTIME_CLIPBOARD_COPY_FALLBACK_FAILED',
	      'hasRuntimeClipboardWrite',
	      'hasRuntimeCopyFallback',
	      "const copied = document.execCommand('copy');",
	    ]],
	    ['src/components/templates/main-app/platform/platformNotificationMonitor/index.tsx', [
	      'readPlatformNotificationSnapshotResponse',
	      'readPlatformNotificationActionResponse',
	      'platform_notification_monitor_load_failed',
      'platform_notification_monitor_action_failed',
      'platform_notification_monitor_whatsapp_open_failed',
      'platform_notification_monitor_whatsapp_open_blocked',
      'platform_notification_monitor_message_copy_failed',
      'logRuntimeFailure',
      "const opened = window.open(whatsappWebHref, '_blank', 'noopener,noreferrer')",
      "getBoundedRuntimeStringContext('destination', prefillModal.destination)",
	      "getBoundedRuntimeStringContext('subject', prefillModal.subject)",
	      "getBoundedRuntimeStringContext('messageBody', prefillModal.body)",
	      "getBoundedRuntimeStringContext('whatsappWebHref', whatsappWebHref)",
	      'copyRuntimeTextToClipboard(messageText)',
	      'messageTextLength: messageText.length',
	      'hasClipboardWrite: hasRuntimeClipboardWrite()',
	      'hasCopyFallback: hasRuntimeCopyFallback()',
	      "message.error('Failed to load platform notifications')",
	      "message.error('Platform notification action failed')",
      "message.error('Unable to open WhatsApp Web')",
      "message.error('Unable to copy message')",
    ]],
    ['src/lib/ops/platformNotificationClientResponse.ts', [
      'PLATFORM_NOTIFICATION_MONITOR_RESPONSE_JSON_MAX_BYTES = 256 * 1024',
      'readJsonResponseWithLimit<unknown>',
      'isPlatformNotificationSnapshot',
      'isPlatformNotificationActionResult',
      'isPlatformNotificationRow',
      'isPlatformNotificationOpsCost',
      'isPlatformNotificationRegistryEntry',
      'platform_notification_monitor_response_parse_failed',
      'platform_notification_monitor_response_invalid',
      'platform_notification_monitor_response_rejected',
      "getBoundedRuntimeStringContext('responseKind', kind)",
    ]],
    ['src/app/api/ops/platform-notifications/route.ts', [
      'const SAFE_METADATA_PREVIEW_KEYS = new Set',
      'const BOUNDED_METADATA_PREVIEW_KEYS = new Set',
      'function getPlatformAlertStringContext',
      'function buildPlatformAlertDisplayMessage',
      'title: classified.entry.title',
      'message: buildPlatformAlertDisplayMessage(classified.entry.description, data)',
      'Object.assign(acc, getPlatformAlertStringContext(key, value))',
    ]],
    ['src/components/templates/main-app/platform/ownerNotificationMonitor/index.tsx', [
      'readOwnerNotificationSnapshotResponse',
      'readOwnerNotificationActionResponse',
      'owner_notification_monitor_load_failed',
      'owner_notification_monitor_action_failed',
      'owner_notification_monitor_whatsapp_open_failed',
      'owner_notification_monitor_whatsapp_open_blocked',
      'owner_notification_monitor_message_copy_failed',
      'function formatMonitorError(value: unknown): string',
      'Stored error present (${text.length} chars).',
      'record.error ? formatMonitorError(record.error) : metadataText(record)',
      'formatMonitorError(selectedEvent.error)',
      'logRuntimeFailure',
      "const opened = window.open(whatsappWebHref, '_blank', 'noopener,noreferrer')",
      "getBoundedRuntimeStringContext('destination', prefillDestination)",
	      "getBoundedRuntimeStringContext('subject', prefillSubject)",
	      "getBoundedRuntimeStringContext('messageBody', prefillBody)",
	      "getBoundedRuntimeStringContext('whatsappWebHref', whatsappWebHref)",
	      'copyRuntimeTextToClipboard(messageText)',
	      'messageTextLength: messageText.length',
	      'hasClipboardWrite: hasRuntimeClipboardWrite()',
	      'hasCopyFallback: hasRuntimeCopyFallback()',
	      "message.error('Failed to load owner notifications')",
	      "message.error('Owner notification action failed')",
      "message.error('Unable to open WhatsApp Web')",
      "message.error('Unable to copy message')",
    ]],
    ['src/lib/ops/ownerNotificationClientResponse.ts', [
      'OWNER_NOTIFICATION_MONITOR_RESPONSE_JSON_MAX_BYTES = 256 * 1024',
      'readJsonResponseWithLimit<unknown>',
      'isOwnerNotificationSnapshot',
      'isOwnerNotificationActionResult',
      'isOwnerNotificationEventRow',
      'isOwnerNotificationDeliveryRow',
      'isOwnerNotificationRecipient',
      'isOwnerNotificationManualTemplate',
      'isOwnerNotificationOpsCost',
      'owner_notification_monitor_response_parse_failed',
      'owner_notification_monitor_response_invalid',
      'owner_notification_monitor_response_rejected',
      "getBoundedRuntimeStringContext('responseKind', kind)",
    ]],
    ['src/components/templates/main-app/platform/ownerBusinessAssistantMonitor/index.tsx', [
      'readOwnerBusinessAssistantMonitorResponse',
      'owner_business_assistant_monitor_load_failed',
      'logRuntimeFailure',
      "message.error('Failed to load Business Health monitor')",
    ]],
    ['src/app/api/platform/owner-business-assistant/monitor/route.ts', [
      'function getMonitorStringContext',
      'function getMonitorTextSummary',
      'function getOptionalMonitorTextSummary',
      'function getMonitorIdentifierSummary',
      'function buildMonitorResponseId',
      'function serializeFeedbackDoc',
      "id: buildMonitorResponseId('answer-event', doc.id)",
      "question: getMonitorTextSummary('Question', data.question)",
      "answerText: getMonitorTextSummary('Answer', data.answerText)",
      "unsupportedReason: getOptionalMonitorTextSummary('Unsupported reason', data.unsupportedReason)",
      "reason: getOptionalMonitorTextSummary('Coverage reason', entry?.reason)",
      "recentFeedback: feedbackSnap.docs.map(serializeFeedbackDoc)",
    ]],
    ['src/components/templates/main-app/platform/costPosture/index.tsx', [
      'platform_cost_posture_load_failed',
      'logRuntimeFailure',
      "message.error('Failed to load platform cost posture')",
    ]],
	    ['src/database/ops/costPosture.ts', [
	      "const PLATFORM_COST_POSTURE_LOAD_FAILED = 'Failed to load platform cost posture';",
	      "PLATFORM_COST_POSTURE_RESPONSE_PARSE_FAILED = 'platform_cost_posture_response_parse_failed'",
	      "PLATFORM_COST_POSTURE_RESPONSE_INVALID = 'platform_cost_posture_response_invalid'",
	      "PLATFORM_COST_POSTURE_RESPONSE_REJECTED = 'platform_cost_posture_response_rejected'",
	      'PLATFORM_COST_POSTURE_RESPONSE_JSON_MAX_BYTES = 256 * 1024',
	      'function createPlatformCostPostureLoadError(status?: number): Error',
	      'readPlatformCostPostureResponseJson',
	      'readJsonResponseWithLimit<unknown>',
	      'isPlatformCostPostureApiResponse',
	      'isPlatformCostPostureData',
	      'isBillingExportStatus',
	      'isSafeModeStatus',
	      'isCostTotals',
	      'isCostSignal',
	      'isCostAlert',
	      'isCostGuardrail',
	      'isSourceCoverage',
	      'Array.isArray(value.signals)',
	      'value.signals.every(isCostSignal)',
	      'Array.isArray(value.alerts)',
	      'value.guardrails.every(isCostGuardrail)',
	      'value.sourceCoverage.every(isSourceCoverage)',
	      'PLATFORM_COST_POSTURE_RESPONSE_PARSE_FAILED,',
	      'logRuntimeFailure(\n      PLATFORM_COST_POSTURE_RESPONSE_REJECTED',
	      'logRuntimeFailure(\n      PLATFORM_COST_POSTURE_RESPONSE_INVALID',
	      'const error = createPlatformCostPostureLoadError(response.status);',
	      'throw error;',
	    ]],
    ['src/app/api/platform/cost-posture/route.ts', [
      'platform_cost_posture_source_read_failed',
      'platform_cost_posture_system_config_read_failed',
      'platform_cost_posture_route_failed',
      'logRuntimeFailure',
      'function getCostAlertStringContext',
      'function buildCostAlertTitle',
      'function buildCostAlertMessage',
      'function buildSafeModeReasonSummary',
      'function buildCostAlertResponseId',
      'title: buildCostAlertTitle(data)',
      'message: buildCostAlertMessage(data)',
      'reason: buildSafeModeReasonSummary(data.reason)',
      'id: buildCostAlertResponseId(doc.id)',
      "getBoundedRuntimeStringContext('userId', userId)",
      "getBoundedRuntimeStringContext('requestPath', request.nextUrl.pathname)",
    ]],
    ['src/components/templates/main-app/platform/messagingOnboardingMonitor/index.tsx', [
      'function getBoundedMessagingEventErrorCode',
      'messaging_onboarding_event_failed',
      'getBoundedMessagingEventErrorCode(record.error)',
    ]],
    ['src/lib/notifications/smtpConfig.ts', [
      'const SMTP_MIN_PORT = 1;',
      'const SMTP_MAX_PORT = 65535;',
      'export function parseSmtpPort(rawPort: string | undefined): number | null',
      'if (!/^\\d+$/.test(normalizedPort)) return null;',
      'Number.isSafeInteger(port) && port >= SMTP_MIN_PORT && port <= SMTP_MAX_PORT',
      'export function getSmtpConfigFromEnv(env: NodeJS.ProcessEnv = process.env): SmtpConfig | null',
      'const port = parseSmtpPort(env.SMTP_PORT);',
      'pass.trim().length === 0',
      'secure: port === 465',
      'export function isSmtpConfigured',
      'return getSmtpConfigFromEnv(env) !== null;',
    ]],
    ['src/lib/messaging/index.ts', [
      "import { getSmtpConfigFromEnv } from '@lib/notifications/smtpConfig';",
      'getLifecycleMessageLogContext',
      'function getLifecycleDeliveryError',
      "error: getLifecycleDeliveryError(result)",
      'const smtpConfig = getSmtpConfigFromEnv();',
      'if (!smtpConfig) return null;',
      'host: smtpConfig.host',
      'port: smtpConfig.port',
      'secure: smtpConfig.secure',
      'auth: { user: smtpConfig.user, pass: smtpConfig.pass }',
      "error: 'smtp_not_configured'",
      "error: 'smtp_verify_failed'",
      "error: 'smtp_send_failed'",
      "title: 'SMTP connection failed'",
      'lifecycle_messaging_flag_read_failed',
      'lifecycle_message_duplicate_check_failed',
      'lifecycle_message_rate_limit_check_failed',
      'lifecycle_message_smtp_verify_failed',
      'lifecycle_message_smtp_alert_failed',
      'lifecycle_message_smtp_send_failed',
      'lifecycle_message_owner_notification_enqueue_failed',
      'lifecycle_message_log_write_failed',
      'internal_lifecycle_notification_email_failed',
      'internal_lifecycle_notification_alert_failed',
      'logNotificationFailure',
    ]],
    ['src/lib/notifications/index.ts', [
      "import { getSmtpConfigFromEnv, isSmtpConfigured } from './smtpConfig';",
      'return isSmtpConfigured();',
      'function getNotificationDeliveryError',
      "error: getNotificationDeliveryError(result)",
      'const smtpConfig = getSmtpConfigFromEnv();',
      'if (!smtpConfig) return null;',
      'host: smtpConfig.host',
      'port: smtpConfig.port',
      'secure: smtpConfig.secure',
      'auth: { user: smtpConfig.user, pass: smtpConfig.pass }',
      "error: 'smtp_not_configured'",
      "error: 'smtp_send_failed'",
      'claimNotificationDelivery',
      'finalizeNotificationDelivery',
      'notification_log_claim_lost',
      'notification_rate_limit_check_failed',
      'notification_log_write_failed',
      'notification_log_target_unavailable',
      'logNotificationFailure',
    ]],
    ['src/app/api/notifications/send/route.ts', [
      'const userRateLimitHash = hashPublicRateLimitValue(userId || \'unknown\');',
      'key: `notification-send:${userRateLimitHash}`',
      'readBoundedJsonBody(request, NOTIFICATION_SEND_MAX_BODY_BYTES',
      'NotificationRequestSchema.safeParse(bodyResult.data)',
      'ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT',
      'failClosedOnProviderError: true',
      '.collection(DB_COLLECTIONS.SUPPORT_TICKETS)',
      'parseAnswerlatticeSupportTicketDocument({',
      'projectTicketNotification({',
      'logNotificationFailure(\'notification_send_route_failed\'',
    ]],
    ['src/lib/notifications/client.ts', [
      'NOTIFICATION_TRIGGER_REQUEST_POLICY',
      "cache: 'no-store'",
      "credentials: 'same-origin'",
      "redirect: 'manual'",
      '...NOTIFICATION_TRIGGER_REQUEST_POLICY',
      'notification_trigger_response_rejected',
      'notification_trigger_request_failed',
      'responseStatus: response.status',
      'getNotificationPayloadLogContext(params)',
    ]],
    ['src/lib/notifications/notificationService.ts', [
      'LEGACY_NOTIFICATION_SERVICE_DISABLED',
      'logLegacyNotificationServiceBlocked',
      'logNotificationFailure(LEGACY_NOTIFICATION_SERVICE_DISABLED',
      "operation = 'createNotification'",
      "operation = 'sendEmailNotification'",
      "operation = 'sendSlackNotification'",
    ]],
    ['src/lib/owner-notifications/index.ts', [
      'function getOwnerNotificationDeliveryError',
      'error: getOwnerNotificationDeliveryError(params.result)',
      "error: 'owner_notification_processing_failed'",
      'owner_notification_unknown_trigger',
      'owner_notification_firestore_target_unavailable',
      'owner_notification_processing_failed',
      "getBoundedNotificationStringContext('eventId', eventId)",
      'logNotificationFailure',
    ]],
    ['src/lib/owner-notifications/channels/email.ts', [
      "import { getSmtpConfigFromEnv, isSmtpConfigured } from '@lib/notifications/smtpConfig';",
      'const smtpConfig = getSmtpConfigFromEnv();',
      'if (!smtpConfig) return null;',
      'host: smtpConfig.host',
      'port: smtpConfig.port',
      'secure: smtpConfig.secure',
      'auth: { user: smtpConfig.user, pass: smtpConfig.pass }',
      'return isSmtpConfigured();',
      "skippedReason: 'smtp_not_configured'",
      "error: 'smtp_send_failed'",
    ]],
    ['src/lib/owner-notifications/channels/whatsapp.ts', [
      "error: 'whatsapp_send_failed'",
      'OWNER_NOTIFICATION_WHATSAPP_RESPONSE_PARSE_FAILED',
      'const encodedPhoneNumberId = encodeURIComponent(phoneNumberId);',
	      '${encodedPhoneNumberId}/messages',
	      'const MAX_WHATSAPP_PROVIDER_MESSAGE_ID_LENGTH = 200;',
	      'const OWNER_NOTIFICATION_WHATSAPP_RESPONSE_JSON_MAX_BYTES = 64 * 1024;',
	      'function getWhatsAppProviderMessageId(value: unknown): string | undefined',
	      'async function readOwnerNotificationWhatsAppResponseJson(response: Response): Promise<unknown | null>',
	      'logNotificationFailure(OWNER_NOTIFICATION_WHATSAPP_RESPONSE_PARSE_FAILED',
	      'readJsonResponseWithLimit(response, OWNER_NOTIFICATION_WHATSAPP_RESPONSE_JSON_MAX_BYTES)',
	      'const providerMessageId = getWhatsAppProviderMessageId(parsed);',
	      "redirect: 'manual',",
    ]],
    ['functions/src/monitoring/platformNotificationDelivery.ts', [
      'const encodedPhoneNumberId = encodeURIComponent(phoneNumberId);',
      '${encodedPhoneNumberId}/messages',
      'function getPlatformDeliveryStringContext',
      'function buildPlatformDeliveryScopeLine',
      'function buildPlatformDeliveryAlertLine',
      "getPlatformDeliveryStringContext('tenantId', alert.tId)",
      "getPlatformDeliveryStringContext('storeId', alert.sId)",
      "getPlatformDeliveryStringContext('alertId', alert.id)",
      'PLATFORM_ALERT_EMAIL_DELIVERY_FAILED',
      'PLATFORM_ALERT_WHATSAPP_DELIVERY_FAILED',
      'function getBoundedPlatformDeliveryLogStringContext',
      'function logPlatformDeliveryChannelFailure',
      'function logPlatformDeliveryResultFailure',
      'getMonitoringErrorContext(error)',
      'if (!response.ok)',
      'statusCode: response.status',
      'if (!result.success)',
    ]],
    ['src/lib/ops/platformNotificationDelivery.ts', [
      'function getPlatformDeliveryStringContext',
      'function buildPlatformDeliveryScopeLine',
      'function buildPlatformDeliveryAlertLine',
      "getPlatformDeliveryStringContext('tenantId', alert.tId)",
      "getPlatformDeliveryStringContext('storeId', alert.sId)",
      "getPlatformDeliveryStringContext('alertId', alert.id)",
      'OPS_PLATFORM_ALERT_EMAIL_DELIVERY_FAILED',
      'OPS_PLATFORM_ALERT_WHATSAPP_DELIVERY_FAILED',
      'function logPlatformDeliveryChannelFailure',
      'function logPlatformDeliveryResultFailure',
      "logOpsFailure(failureCode, error",
      'if (!result.ok)',
    ]],
    ['functions/src/monitoring/telegramAlert.ts', [
      'TELEGRAM_BOT_TOKEN_PATTERN',
      'function getTelegramSendMessageUrl',
      'encodeURIComponent(normalizedToken)',
      'function escapeTelegramHtml',
      'escapeTelegramHtml(alert.title)',
      'escapeTelegramHtml(alert.message)',
      'function getTelegramMetadataStringContext',
      "escapeTelegramHtml(getTelegramMetadataStringContext('storeId', alert.metadata.storeId))",
      "escapeTelegramHtml(getTelegramMetadataStringContext('tenantId', alert.metadata.tenantId))",
      'escapeTelegramHtml(String(alert.metadata.failureCode))',
    ]],
    ['functions/src/ownerNotifications/processor.ts', [
      'OWNER_NOTIFICATION_WHATSAPP_SEND_FAILED',
      'OWNER_NOTIFICATION_WHATSAPP_RESPONSE_PARSE_FAILED',
      'OWNER_NOTIFICATION_PROCESSING_FAILED',
      'OWNER_NOTIFICATION_ALERT_CREATE_FAILED',
      'function getOwnerNotificationEventLogContext',
      'function getOwnerNotificationErrorContext',
      'const encodedPhoneNumberId = encodeURIComponent(phoneNumberId);',
	      '${encodedPhoneNumberId}/messages',
	      'const MAX_OWNER_NOTIFICATION_WHATSAPP_PROVIDER_MESSAGE_ID_LENGTH = 200;',
	      'const OWNER_NOTIFICATION_WHATSAPP_RESPONSE_JSON_MAX_BYTES = 64 * 1024;',
	      'function getOwnerNotificationWhatsAppProviderMessageId(value: unknown): string | undefined',
	      'async function readOwnerNotificationWhatsAppResponseJson(response: Response): Promise<unknown | null>',
	      '[OwnerNotifications] WhatsApp response parse failed',
	      'failureCode: OWNER_NOTIFICATION_WHATSAPP_RESPONSE_PARSE_FAILED',
	      'readJsonResponseWithLimit(response, OWNER_NOTIFICATION_WHATSAPP_RESPONSE_JSON_MAX_BYTES)',
	      'const providerMessageId = getOwnerNotificationWhatsAppProviderMessageId(parsed);',
      'providerResponseBodySkipped: true',
      'error: OWNER_NOTIFICATION_PROCESSING_FAILED',
    ]],
    ['src/lib/ops/alerts.ts', [
      'TELEGRAM_BOT_TOKEN_PATTERN',
      'function getTelegramSendMessageUrl',
      'encodeURIComponent(normalizedToken)',
      'function escapeTelegramMarkdown',
      'escapeTelegramMarkdown(params.title)',
      'escapeTelegramMarkdown(params.message)',
      "parse_mode: 'MarkdownV2'",
      'ops_alert_telegram_configuration_invalid',
      'ops_alert_telegram_delivery_failed',
      'ops_alert_platform_delivery_failed',
      'ops_alert_delivery_check_failed',
	      'ops_alert_create_failed',
	      'getBoundedOpsStringContext',
	      'fetch(telegramSendMessageUrl',
	      "redirect: 'manual',",
	      'if (response.ok) return;',
	      "logOpsFailure('ops_alert_telegram_delivery_failed', { status: response.status }",
	    ]],
	    ['functions/src/triggers/operations.ts', [
	      'OPERATIONS_VERIFY_MENU_PUBLISH_FAILED',
      'OPERATIONS_VERIFY_MENU_PUBLISH_SUCCESS_MESSAGE_FAILED',
      'OPERATIONS_VERIFY_MENU_PUBLISH_FAILURE_MESSAGE_FAILED',
      'OPERATIONS_BUDGET_ALERT_WEBHOOK_FAILED',
	      'OPERATIONS_FORCE_REPUBLISH_FAILED',
	      'OPERATIONS_FORCE_REPUBLISH_PROJECT_LIMIT_EXCEEDED',
	      'OPERATIONS_FORCE_REPUBLISH_PUBLIC_URL_UNAVAILABLE',
      'OPERATIONS_BACKFILL_STORES_SUMMARY_FAILED',
      'getBoundedOperationsStringContext',
      'getOperationsErrorContext',
      "throw new HttpsError('internal', VERIFY_MENU_PUBLISH_FAILED_MESSAGE)",
	      "throw new HttpsError('failed-precondition', FORCE_REPUBLISH_PUBLIC_URL_UNAVAILABLE_MESSAGE)",
	      "throw new HttpsError('resource-exhausted', 'The store has too many projects for this recovery action.')",
      "throw new HttpsError('internal', FORCE_REPUBLISH_FAILED_MESSAGE)",
      "throw new HttpsError('internal', BACKFILL_STORES_SUMMARY_FAILED_MESSAGE)",
    ]],
    ['functions/src/schedulers/masterScheduler.ts', [
      'LEGACY_HELP_CENTER_ANALYTICS_MOVED_TO_ANSWERLATTICE',
      'Help-center analytics now run in the Answerlattice workspace.',
      "throw new HttpsError('failed-precondition'",
      "throwRetired(request.auth?.uid, 'triggerSchedulerManually')",
      "throwRetired(request.auth?.uid, 'triggerWeeklyNarrativeManually')",
    ]],
    ['functions/src/decisionBlocksScoring.ts', [
      'SCHEDULER_NO_STORES_RUN_LOG_PERSIST_FAILED',
      'SCHEDULER_LIFECYCLE_MESSAGE_RETRY_FAILED',
      'SCHEDULER_LIFECYCLE_MESSAGE_DIGEST_FAILED',
	      'SCHEDULER_COMPLETION_ALERT_FAILED',
      "getSchedulerIdLogContext('resellerProfileId', context.resellerProfileId)",
      "getSchedulerIdLogContext('subscriptionId', context.subscriptionId)",
      "logSchedulerFailure(logger, '[DecisionBlocks] No-stores run log failed'",
      "logSchedulerFailure(logger, 'Lifecycle Messaging retry task failed'",
      "logSchedulerFailure(logger, 'Lifecycle Messaging digest task failed'",
	      "name: 'kb_generation_watchdog'",
	      "details: { reason: 'moved_to_answerlattice_runtime' }",
	      "logSchedulerFailure(logger, '[DecisionBlocks] Completion alert failed'",
	      "logSchedulerFailure(logger, '[DecisionBlocks] Store enrichment collection failed'",
	      "operation: 'collect_store_enrichment'",
	    ]],
    ['src/app/api/ops/messaging-onboarding/route.ts', [
      'function serializeEvent',
      'function buildMessagingOpsResponseId',
      "getRateLimitForFeature('DATA_READ')",
      'checkRateLimit({',
      'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      'key: `${MESSAGING_ONBOARDING_OPS_RATE_LIMIT_KEY}:${userRateLimitHash}`',
      "'X-RateLimit-Limit': String(rateLimitConfig.limit)",
      'checkMessagingOnboardingOpsRateLimit(session)',
      'normalizeMessagingOnboardingOpsHealth',
      'normalizeMessagingOnboardingOpsEvent',
      'normalizeMessagingOnboardingOpsSession',
      'normalizeMessagingOnboardingOpsAlert',
      ".where('metadata.subsystem', '==', 'messaging_onboarding')",
      ".where('timestamp', '<=', windowEnd)",
    ]],
    ['src/lib/ops/messagingOnboardingOpsBoundary.ts', [
      'const BOUNDED_METADATA_KEYS = new Set',
      'function getStoredTextContext',
      'function buildAlertMessage',
      'function normalizeHealthAlerts',
      'function isSafeMetadataKey',
      'export function sanitizeMessagingOnboardingOpsMetadata',
      'export function maskMessagingOnboardingOpsDisplayId',
      'export function normalizeMessagingOnboardingOpsHealth',
      'export function normalizeMessagingOnboardingOpsEvent',
      'export function normalizeMessagingOnboardingOpsSession',
      'export function normalizeMessagingOnboardingOpsAlert',
      'export function isMessagingOnboardingOpsSnapshotResponse',
      'return value.slice(0, MESSAGING_ONBOARDING_HEALTH_ALERT_LIMIT)',
    ]],
    ['src/lib/ops/messagingOnboardingTypes.ts', [
      'export interface MessagingOnboardingOpsEvent',
      'code?: string',
      'retryable?: boolean',
    ]],
    ['functions/src/messagingOnboarding/eventLogger.ts', [
      'function sanitizeEventError',
      'function sanitizeEventMetadata',
      'function isSafeEventMetadataKey',
      'const BOUNDED_EVENT_METADATA_KEYS = new Set',
      'metadataDroppedCount',
      'code: error.code.slice(0, 96)',
	      'retryable: error.retryable === true',
	      'metadata: sanitizeEventMetadata(params.metadata)',
	      'MSG_ONBOARDING_EVENT_WRITE_FAILED',
	      'MSG_ONBOARDING_EVENT_PREPARE_FAILED',
	      'function getEventLoggerErrorContext',
	      'getBoundedFunctionsErrorName(error)',
	      'getBoundedFunctionsErrorCode(error)',
	    ]],
	    ['functions/src/messagingOnboarding/inboundQueue.ts', [
	      'const INBOUND_PROCESSING_FAILED_CODE = "INBOUND_PROCESSING_FAILED";',
	      'const INBOUND_STALE_PROCESSING_RESET_CODE = "INBOUND_STALE_PROCESSING_RESET";',
	      'function getInboundQueueIdContext',
	      'getInboundQueueIdContext("messageId", messageId)',
	      'lastError: INBOUND_PROCESSING_FAILED_CODE',
	      'code: INBOUND_PROCESSING_FAILED_CODE',
	      'getInboundQueueErrorContext(error)',
	      'lastError: INBOUND_STALE_PROCESSING_RESET_CODE',
	      'failureCode: INBOUND_STALE_PROCESSING_RESET_CODE',
	      'export async function enqueueInboundMessages',
	      'const closePromise = writer.close()',
	      'handlerCompletedAt',
	      'snapshot.get("processingToken") !== claim.processingToken',
	      'resetCount,',
	      'staleWindowMs: STALE_PROCESSING_MS',
	      'getBoundedFunctionsErrorName(error)',
	      'getBoundedFunctionsErrorCode(error)',
	    ]],
    ['functions/src/messagingOnboarding/webhookHandler.ts', [
      'const WEBHOOK_QUEUE_FAILED_CODE = "WEBHOOK_QUEUE_FAILED";',
      'function getWebhookBoundedStringContext',
      'function getWebhookErrorName',
      'function getWebhookErrorCode',
      'function getWebhookErrorStatus',
      'function getWebhookErrorContext',
      'sourceErrorName: getWebhookErrorName(error)',
      'sourceErrorCode: getWebhookErrorCode(error)',
      'sourceErrorStatus: getWebhookErrorStatus(error)',
      'function getWebhookRequestLogContext',
      'function getWebhookInboundLogContext',
      'getWebhookBoundedStringContext("ip", req.ip)',
      'failureCode: WEBHOOK_QUEUE_FAILED_CODE',
      'enqueueInboundMessages(normalizedMessages)',
      'getInboundMessageId(firstMessage)',
    ]],
    ['functions/src/messagingOnboarding/extractionWatcher.ts', [
	      'const EXTRACTION_FAILED_CODE = "EXTRACTION_FAILED";',
		      'const EXTRACTION_PREVIEW_SEND_FAILED_CODE = "EXTRACTION_PREVIEW_SEND_FAILED";',
		      'const EXTRACTION_CLEARER_PHOTOS_SEND_FAILED_CODE = "EXTRACTION_CLEARER_PHOTOS_SEND_FAILED";',
		      'const EXTRACTION_PREVIEW_LEASE_RELEASE_FAILED_CODE = "EXTRACTION_PREVIEW_LEASE_RELEASE_FAILED";',
	      'function logClearerPhotosMessageSendFailed',
	      'logger.warn("[ExtractionWatcher] Failed to send clearer photos message"',
	      'failureCode: EXTRACTION_CLEARER_PHOTOS_SEND_FAILED_CODE',
	      'code: jobData.error?.code || EXTRACTION_FAILED_CODE',
	      'EXTRACTION_FAILED_CODE,',
		      'failureCode: EXTRACTION_PREVIEW_SEND_FAILED_CODE',
		      'failureCode: EXTRACTION_PREVIEW_LEASE_RELEASE_FAILED_CODE',
		      'code: "SEND_FAILED"',
		      'getExtractionWatcherErrorContext(err)',
		      'session.extractionJobId !== jobId',
		      'finalizeMessagingExtractionSuccess',
		    ]],
    ['functions/src/messagingOnboarding/healthMonitor.ts', [
      'MESSAGING_HEALTH_SNAPSHOT_WRITE_FAILED',
      'MESSAGING_HEALTH_ALERT_EMIT_FAILED',
      'function getMessagingHealthErrorName',
      'function getMessagingHealthErrorCode',
      'function getMessagingHealthErrorContext',
      'errorName: getMessagingHealthErrorName(error)',
      'errorCode: getMessagingHealthErrorCode(error)',
      'getMessagingHealthErrorContext(error)',
      '.doc(snapshotId)',
      'transaction.set(snapshotRef, snapshot);',
      'isMessagingHealthLeaseOwner(currentControl.data(), computeLeaseId)',
      'export async function emitHealthAlerts(',
      'failedAlerts += 1;',
      'alertKey: alert.key,',
    ]],
		    ['functions/src/messagingOnboarding/intakeProcessor.ts', [
		      'const INTAKE_PROVIDER_MESSAGE_SEND_FAILED_CODE = "INTAKE_PROVIDER_MESSAGE_SEND_FAILED";',
		      'const INTAKE_MESSAGE_LEASE_RELEASE_FAILED_CODE = "INTAKE_MESSAGE_LEASE_RELEASE_FAILED";',
	      'function getIntakeProcessorErrorContext',
	      'function getIntakeProcessorIdLogContext',
		      'function logProviderMessageSendFailed',
		      'async function releasePendingMessageLease',
	      'getIntakeProcessorIdLogContext("sessionId", doc.id)',
	      'getIntakeProcessorIdLogContext("sessionId", session.sessionId)',
	      'getBoundedFunctionsErrorName(error)',
	      'getBoundedFunctionsErrorCode(error)',
	      'code: "GEMINI_API_ERROR"',
		      'logger.warn("[IntakeProcessor] Non-blocking provider message send failed"',
		      'failureCode: INTAKE_PROVIDER_MESSAGE_SEND_FAILED_CODE',
		      'logger.warn("[IntakeProcessor] Pending message lease release failed"',
		      'failureCode: INTAKE_MESSAGE_LEASE_RELEASE_FAILED_CODE',
		      'claimMessagingIntakeSession',
		      'commitMessagingAssetValidation',
		      'enqueueMessagingExtractionJob',
	      '"asset_validation_retry_failed"',
	      '"no_valid_menu_files"',
	      '"all_files_non_menu"',
	      '"partial_menu_more_uploads"',
	      '"extraction_progress"',
		      'getIntakeProcessorErrorContext(err)',
		    ]],
	    ['functions/src/messagingOnboarding/sessionEngine.ts', [
	      'function getSessionEngineIdLogContext',
	      'function getSessionEngineErrorName',
	      'function getSessionEngineErrorCode',
	      'function getSessionEngineErrorContext',
      'getSessionEngineIdLogContext("sessionId", sessionId)',
      'code: "MEDIA_DOWNLOAD_FAILED"',
		      'errorName: getSessionEngineErrorName(error)',
		      'errorCode: getSessionEngineErrorCode(error)',
		      'getSessionEngineErrorContext(err)',
			      'async function appendStoredUploadOrCleanup',
			      'export function isMessagingUploadPathReferencedBySession',
			      'async function deleteStoredUploadIfUnreferenced',
			      'await deleteStoredUploadIfUnreferenced(upload, session.sessionId, "session_append_failed")',
			      'await deleteStoredUploadIfUnreferenced(upload, preGeneratedSessionId, "session_create_failed")',
			      'const uploadId = crypto.randomUUID().replace(/-/g, "")',
			      'const reopenedFromFailure = session.state === "FAILED"',
			      'reason: "Valid upload received after failure"',
			      'extractionCompletedJobId: null',
			      'extractionJobId: null',
			      'invalidAttempt.cooldownApplied ? MESSAGES.RATE_LIMITED : MESSAGES.NON_MENU_FILE',
			      'reason: "Maximum invalid upload attempts reached"',
			      'state: "COOLDOWN"',
	      'const result = await db.runTransaction(async (transaction) =>',
		      'getSessionEngineIdLogContext("uploadId", upload.id)',
		      'getSessionEngineErrorContext(error)',
		    ]],
	    ['functions/src/utils/boundedResponseBody.ts', [
	      'class ResponseBodyTooLargeError extends Error',
	      'response.headers.get("content-length")',
	      'contentLength > maxBytes',
	      'const arrayBuffer = await response.arrayBuffer()',
	      'arrayBuffer.byteLength > maxBytes',
	      'response.body.getReader()',
	      'totalBytes > maxBytes',
	      'await reader.cancel().catch(() => undefined)',
	    ]],
		    ['functions/src/messagingOnboarding/assetIntelligence.ts', [
		      'ASSET_VALIDATION_UPLOAD_FETCH_FAILED',
		      'ASSET_VALIDATION_UPLOAD_INTEGRITY_REJECTED',
		      'ASSET_VALIDATION_UPLOAD_RECORD_REJECTED',
		      'ASSET_VALIDATION_RESPONSE_PARSE_FAILED',
		      'async function readMessagingStorageObject',
		      'function getProjectStorageBucketFallback()',
		      'process.env.FIREBASE_STORAGE_BUCKET',
		      'process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
		      'process.env.GCLOUD_PROJECT',
		      'process.env.GCP_PROJECT',
		      'process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID',
		      'storageAdmin.bucket(getAllowedStorageBucket() || undefined).file(storagePath).createReadStream({',
		      'validation: "crc32c"',
		      'byteLength > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES',
		      'validateMessagingStoredUploadRecord(upload, sessionId)',
		      'validateMessagingStoredUploadBytes(upload, responseBytes)',
		      'shouldInlineAssetValidationFiles(prompt, readableFiles.map((file) => file.bytes.length))',
		      'uploadAssetValidationFiles(readableFiles, operationAbortSignal)',
		      'uploadedProviderFiles = providerUpload.files',
		      'uploadedProviderFileNames = providerUpload.providerNames',
		      'if (providerUpload.firstError) throw providerUpload.firstError',
		      'cleanupAssetValidationProviderFiles(uploadedProviderFileNames)',
		      'names.map((name) => genAIClient.files.delete({',
		      'name,',
				      'ASSET_VALIDATION_DOWNLOAD_CONCURRENCY',
				      'ASSET_VALIDATION_PROVIDER_UPLOAD_CONCURRENCY',
				      'httpOptions: { timeout: ASSET_VALIDATION_MODEL_TIMEOUT_MS }',
				      'function getAssetIntelligenceErrorName',
		      'function getAssetIntelligenceErrorCode',
		      'function getAssetIntelligenceStatusCode',
		      'function getAssetIntelligenceErrorContext',
				      'sourceErrorName: getAssetIntelligenceErrorName(error)',
		      'sourceErrorCode: getAssetIntelligenceErrorCode(error)',
		      'sourceStatusCode: getAssetIntelligenceStatusCode(error)',
		      'responseTextLength: responseText.length',
		      'uploadIdLength: upload.id.length',
		    ]],
		    ['functions/src/messagingOnboarding/assetStorageBoundary.ts', [
		      'validateMessagingStoredUploadRecord',
		      'validateMessagingStoredUploadBytes',
		      'url.hostname !== "firebasestorage.googleapis.com"',
		      'url.searchParams.get("alt") !== "media"',
		      'upload.storagePath.endsWith(expectedSuffix)',
		      'bytes.length !== upload.fileSize',
		      'validateMessagingUploadContent(bytes, upload.mimeType)',
		      'actualSha256 !== upload.sha256',
		    ]],
		    ['functions/src/messagingOnboarding/assetModelInputBoundary.ts', [
		      'INLINE_ASSET_VALIDATION_REQUEST_MAX_BYTES = 18 * 1024 * 1024',
		      'Math.ceil(byteLength / 3) * 4',
		      'estimateInlineAssetValidationRequestBytes',
		      'shouldInlineAssetValidationFiles',
		      'Number.POSITIVE_INFINITY',
		    ]],
	    ['functions/src/messagingOnboarding/publishPipeline.ts', [
	      'Messaging onboarding Cloud Functions publisher guard',
	      'Active publishing is owned exclusively by:',
	      'src/lib/messaging-onboarding/publish.ts',
	      'MESSAGING_FUNCTIONS_PUBLISH_PIPELINE_DISABLED',
	    ]],
    ['functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts', [
      'WHATSAPP_SEND_TEXT_FAILED',
      'WHATSAPP_INTERACTIVE_SEND_FAILED',
	      'WHATSAPP_MEDIA_URL_REJECTED',
	      'WHATSAPP_MEDIA_URL_LOOKUP_FAILED',
	      'WHATSAPP_MEDIA_URL_RESPONSE_PARSE_FAILED',
	      'WHATSAPP_MEDIA_DOWNLOAD_FAILED',
	      'WHATSAPP_MEDIA_TOO_LARGE',
	      'validateNetworkTargetUrl',
      'private get encodedPhoneNumberId(): string',
      'return encodeURIComponent(this.phoneNumberId);',
	      'const encodedMediaId = encodeURIComponent(providerMediaId);',
		      'WHATSAPP_PROVIDER_JSON_MAX_BYTES',
		      'readJsonResponseWithLimit<{ url?: unknown }>(metaResponse, WHATSAPP_PROVIDER_JSON_MAX_BYTES)',
		      'async function readWhatsAppMediaUrlLookupPayload(metaResponse: Response): Promise<{ url?: unknown } | null>',
		      '[WhatsApp] Failed to parse media URL response',
		      'failureCode: WHATSAPP_MEDIA_URL_RESPONSE_PARSE_FAILED_CODE',
		      'const url = typeof metaPayload?.url === "string" ? metaPayload.url : "";',
			      'const urlValidation = await validateNetworkTargetUrl(url);',
		      'fetch(urlValidation.normalizedUrl',
			      'readResponseUint8ArrayWithLimit(mediaResponse, UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES)',
			      'isResponseBodyTooLargeError(error)',
			      '${this.encodedPhoneNumberId}/messages',
	      'function getWhatsAppStringLogContext',
	      'function getWhatsAppErrorName',
	      'function getWhatsAppErrorCode',
	      'function getWhatsAppErrorContext',
	      'getWhatsAppStringLogContext("providerUserId", userId)',
	      'providerResponseBodySkipped: true',
	      'errorName: getWhatsAppErrorName(error)',
	      'errorCode: getWhatsAppErrorCode(error)',
	      'getWhatsAppErrorContext(error)',
	      'throw createWhatsAppProviderError(WHATSAPP_SEND_TEXT_FAILED_CODE, response.status)',
	    ]],
    ['functions/src/schedulers/messagingSessionCleanup.ts', [
      'MESSAGING_SESSION_EXPIRE_FAILED',
      'MESSAGING_EXPIRED_SESSION_QUERY_FAILED',
      'MESSAGING_SESSION_REMINDER_SEND_FAILED',
	      'MESSAGING_SESSION_REMINDER_FAILED',
	      'MESSAGING_SESSION_REMINDER_QUERY_FAILED',
	      'MESSAGING_SESSION_CLEAN_FAILED',
	      'MESSAGING_SESSION_FILE_CLEAN_FAILED',
	      'MESSAGING_SESSION_CLEANUP_QUERY_FAILED',
	      'MESSAGING_INBOUND_CLEANUP_FAILED',
	      'function getCleanupErrorName',
	      'function getCleanupErrorCode',
	      'function getCleanupErrorStatus',
	      'function getCleanupErrorContext',
	      'function getCleanupIdLogContext',
	      'function isMissingStorageObjectError',
	      'sessionIdLength: doc.id.length',
	      'sessionIdLength: session.sessionId.length',
	      'logger.warn("[Cleanup] Failed to clean session upload file"',
	      'failureCode: SESSION_FILE_CLEAN_FAILED_CODE',
	      'getCleanupIdLogContext("sessionId", session.sessionId)',
	      'getCleanupIdLogContext("uploadId", upload.id)',
	      'getCleanupIdLogContext("storagePath", upload.storagePath)',
	      'isMissingStorageObjectError(err)',
	      'sourceErrorName: getCleanupErrorName(error)',
	      'sourceErrorCode: getCleanupErrorCode(error)',
	      'sourceErrorStatus: getCleanupErrorStatus(error)',
    ]],
    ['functions/src/messaging/messagingEngine.ts', [
      'getBoundedFunctionsErrorName(error)',
      'getBoundedFunctionsErrorCode(error)',
      'getBoundedFunctionsErrorStatus(error)',
      'function getMessagingIdLogContext',
      'function getMessagingOperationLogContext',
      "getMessagingIdLogContext('storeId', context.storeId)",
      "getMessagingIdLogContext('tenantId', context.tenantId)",
      "getMessagingIdLogContext('referenceId', context.referenceId)",
      "getMessagingIdLogContext('subscriptionId', context.subscriptionId)",
    ]],
    ['functions/src/triggers/messaging.ts', [
      'MSG_EXTRACTION_WATCHER_FAILED',
      'function getMessagingTriggerStringContext',
      'function getMessagingTriggerErrorCode',
      'function getMessagingTriggerErrorName',
      'function getMessagingTriggerErrorContext',
      'failureCode: MSG_EXTRACTION_WATCHER_FAILED',
      "...getMessagingTriggerStringContext('jobId', event.params.jobId)",
      'getBoundedFunctionsErrorCode(error)',
      "return getBoundedFunctionsErrorName(error) || 'Error'",
    ]],
    ['functions/src/messagingOnboarding/extractionWatcher.ts', [
      'EXTRACTION_PREVIEW_SEND_FAILED_CODE',
      'function getExtractionWatcherIdContext',
      'function getExtractionWatcherErrorName',
      'function getExtractionWatcherErrorCode',
      'function getExtractionWatcherErrorContext',
      'sourceErrorName: getExtractionWatcherErrorName(error)',
      'sourceErrorCode: getExtractionWatcherErrorCode(error)',
      'getExtractionWatcherIdContext("sessionId", sessionId)',
      'getBoundMessagingSessionId',
      'MESSAGING_EXTRACTION_JOB_FILE_BINDING_MISMATCH',
    ]],
    ['functions/src/schedulers/aiProviderHealth.ts', [
      'AI_PROVIDER_HEALTH_CHECK_FAILED',
      'AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE',
      'AI_PROVIDER_HEALTH_FAILURE_STATE_WRITE_FAILED',
      'function getAiProviderHealthErrorContext',
      'function getAiProviderHealthFailureCode',
      'error: failureCode',
      'failureCode,',
      'sourceErrorName: getBoundedFunctionsErrorName(error)',
      'export async function replaceAiProviderHealthState',
      '.doc(HEALTH_DOC_ID).set(details);',
      'await replaceAiProviderHealthState(details);',
      'await replaceAiProviderHealthState(failureState).catch',
    ]],
    ['functions/src/schedulers/menulistMaintenanceScheduler.ts', [
      'function getTaskFailureCode',
      'MAINTENANCE_TASK_FAILED_${suffix}',
      'function getSchedulerErrorName',
      'function getSchedulerErrorCode',
      'function getSchedulerErrorStatus',
      'function getSchedulerErrorContext',
      'sourceErrorName: getSchedulerErrorName(error)',
      'sourceErrorCode: getSchedulerErrorCode(error)',
      'sourceErrorStatus: getSchedulerErrorStatus(error)',
      'function getSchedulerStringContext',
      'SCHEDULER_ALERT_CREATE_FAILED_CODE',
      'SCHEDULER_LEASE_RELEASE_FAILED_CODE',
      'PUBLIC_MENU_DRAFT_IMAGE_DELETE_FAILED_CODE',
      'PUBLIC_MENU_DRAFT_IMAGE_PATH_INVALID_CODE',
      'imagePath.startsWith(`publicMenuDrafts/${doc.id}/`)',
      'Preserve the draft as the durable retry record',
      'if (deletedDrafts > 0)',
      'deletedDrafts,',
      'RESELLER_LICENSE_EXPIRE_FAILED_CODE',
      'sampleJobCount: stuckResult.sampleJobCount',
      'sampleJobIdLengthTotal: stuckResult.sampleJobIdLengthTotal',
      'async function runResellerLicenseExpiry',
      "isFunctionFeatureEnabled('ENABLE_RESELLER_DASHBOARD')",
      ".where('billingMode', '==', 'manual')",
      ".where('status', '==', 'active')",
      ".where('validUntil', '<=', graceCutoff)",
      '.limit(pageSize)',
      'const currentSnapshot = await transaction.get(subDoc.ref);',
      'normalizeSubscriptionDocumentId(currentSnapshot.id)',
      'getExactMenuListSubscriptionScope(current)',
      'normalizeScopeDocumentId(exactScope?.tenantId)',
      'normalizeScopeDocumentId(exactScope?.storeId)',
      'Math.max(0, Math.floor(activeOfflineStores) - 1)',
      "where('billingEntitlementSyncPending', '==', true)",
      "'menulistMaintenanceScheduler:pendingEntitlementRepair'",
      'billingEntitlementSyncPending: true',
      'billingEntitlementSyncPending: FieldValue.delete()',
      'await syncStorePlanEntitlement(',
      "'menulistMaintenanceScheduler:resellerLicenseExpiry'",
      "name: 'subscription_reconciliation'",
      "name: 'reseller_license_expiry'",
      "getSchedulerStringContext('runId', runId)",
      "getSchedulerStringContext('draftId', doc.id)",
      'sampleDraftCount',
      'sampleDraftIdLengthTotal',
      'UNRESOLVED_CRITICAL_ALERT_TITLE',
      'UNRESOLVED_CRITICAL_ALERT_MESSAGE',
      'function getUnresolvedCriticalAlertMetadata',
      "getSchedulerStringContext('alertId', docId)",
      "getSchedulerStringContext('storeId', alert.sId)",
      "getSchedulerStringContext('tenantId', alert.tId)",
      "getSchedulerStringContext('alertTitle', alert.title)",
      "getSchedulerStringContext('alertMessage', alert.message)",
      'const escalationMetadata = getUnresolvedCriticalAlertMetadata(doc.id, alert)',
      'title: UNRESOLVED_CRITICAL_ALERT_TITLE',
      'message: UNRESOLVED_CRITICAL_ALERT_MESSAGE',
      'error: failureCode',
      'message: `Task ${task.name} failed with code ${failureCode}. See bounded scheduler diagnostics.`',
    ]],
  ].forEach(([relPath, tokens]) => {
    assertIncludes(relPath, tokens, `${relPath} bounded ops diagnostics`);
  });

  {
    const operations = read('functions/src/triggers/operations.ts');
    const sharedTriggers = read('functions/src/triggers/shared.ts');
    const callableScopeAccess = read('functions/src/utils/callableScopeAccess.ts');
    const publishVerification = read('functions/src/monitoring/publishVerification.ts');
    [
      'normalizeOwnerNotificationNumericScopeAliases([',
      'token.tenantId,',
      'token.tId,',
      'const directAliases = [token.storeId, token.sId];',
      'normalizeOwnerNotificationNumericScopeAliases(directAliases)',
      'normalizeOwnerNotificationNumericScopeDocumentId(value)',
      'token.storeIds.length > MAX_CALLABLE_STORE_IDS',
    ].forEach((token) => assert(
      callableScopeAccess.includes(token),
      `Functions callable scope boundary must include ${token}`,
    ));
    [operations, sharedTriggers].forEach((source) => {
      assert(
        source.includes('hasCallableTenantStoreAccess('),
        'Functions callable trigger must use exact shared tenant/store access',
      );
      assert(
        !source.includes('token.tenantId || token.tId'),
        'Functions callable trigger must reject conflicting tenant aliases',
      );
      assert(
        !source.includes('token.storeId || token.sId'),
        'Functions callable trigger must reject conflicting store aliases',
      );
    });
    const deliveryCalls = operations.split('sendLifecycleMessage({').length - 1;
    const awaitedDeliveryCalls = operations.split('await sendLifecycleMessage({').length - 1;
    assert(deliveryCalls >= 2, 'verifyMenuPublish must retain both lifecycle delivery branches');
    assert(
      deliveryCalls === awaitedDeliveryCalls,
      'verifyMenuPublish must await every lifecycle delivery before returning from the callable',
    );
    assert(
      !operations.includes('Lifecycle message: Store Published (fire-and-forget)'),
      'verifyMenuPublish must not document server delivery as fire-and-forget',
    );
    assertOrder(
      'functions/src/triggers/operations.ts',
      [
        "if (!request.auth) {",
        'normalizeOwnerNotificationDocumentId(authToken.uId)',
        'normalizeOwnerNotificationNumericScopeDocumentId(input.storeId)',
        'if (!hasTenantStoreAccess(request, tenantId, storeId))',
        'if (!await isPublishVerificationScopeAuthorized(storeId, tenantId, userId, { publicMenuUrl }))',
        'const result = await verifyPublish(publicMenuUrl);',
        'await updateStoreHealth(storeId, tenantId, userId, result, { publicMenuUrl });',
      ],
      'verifyMenuPublish cheap-fail and canonical scope before network/write',
    );
    [
      'isActiveCanonicalPublishScope(',
      'db.runTransaction(async (transaction) => {',
      'const tenantDoc = await transaction.get(tenantRef);',
      'const storeDoc = await transaction.get(storeRef);',
      'const userDoc = await transaction.get(userRef);',
      'isPublicMenuUrlInStoreScope(storeData, options.publicMenuUrl)',
      'getPublishVerificationPublicBaseDomain()',
      "const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || '').trim();",
      'if (!appUrl) return null;',
      "if (parsed.protocol !== 'https:') return null;",
      'hostname === `${subdomain}.${baseDomain}`',
      "if (currentPlatformRole === 'PLATFORM') return true;",
      'normalizeOwnerNotificationNumericScopeAliases(tenantAliases)?.documentId !== tenantId',
      'normalizeOwnerNotificationNumericScopeAliases(storedStoreAliases)?.documentId !== storeId',
      'normalizeOwnerNotificationNumericScopeAliases(directStoreAliases)',
      'readStoredConsecutiveFailures(currentHealth.consecutiveFailures)',
      'transaction.set(storeRef, {',
    ].forEach((token) => assert(
      publishVerification.includes(token),
      `publish verification scope boundary must include ${token}`,
    ));
    assert(
      !publishVerification.includes('storeDoc.data()?.health as StoreHealth'),
      'publish verification must not trust persisted health fields through a cast',
    );

    const forceRepublishSource = operations.slice(operations.indexOf('export const forceRepublish'));
    const forceRepublishOrder = [
      "assertPlatformOwner(request, 'force republish stores')",
      'normalizeOwnerNotificationDocumentId(request.auth?.token?.uId)',
      'forceRepublishActiveProjects(storeId, tenantId, userId)',
      'revalidatePublicClientCacheForStore(',
      'if (!refreshResult.cacheRevalidated)',
      'const result = await verifyPublish(publicMenuUrl);',
      'updateStoreHealth(storeId, tenantId, userId, result, {',
      'requirePlatformAuthority: true,',
    ];
    let forceRepublishCursor = -1;
    forceRepublishOrder.forEach((token) => {
      const nextIndex = forceRepublishSource.indexOf(token, forceRepublishCursor + 1);
      assert(nextIndex >= 0, `forceRepublish canonical authorization/write order missing ${token}`);
      forceRepublishCursor = nextIndex;
    });
    [
      '.limit(MAX_FORCE_REPUBLISH_PROJECTS + 1)',
      'const projectsSnapshot = await transaction.get(projectsQuery);',
      'projectsSnapshot.size > MAX_FORCE_REPUBLISH_PROJECTS',
      'projectData.deleted === true || projectData.active === false',
      'normalizeOwnerNotificationNumericScopeAliases(embeddedTenantAliases)?.documentId',
      'normalizeOwnerNotificationNumericScopeAliases(embeddedStoreAliases)?.documentId',
      'activeProjects.forEach((projectDoc) => {',
      'transaction.update(projectDoc.ref, {',
      'projectIds: activeProjects.map((projectDoc) => projectDoc.id).sort()',
    ].forEach((token) => assert(
      publishVerification.includes(token),
      `forceRepublish transactional project boundary must include ${token}`,
    ));
  }

  {
    const messagingTrigger = read('functions/src/triggers/messaging.ts');
    assert(!messagingTrigger.includes('jobId: event.params.jobId'), 'messaging extraction watcher trigger must not raw-log event job IDs');
    assert(!messagingTrigger.includes('sourceErrorName: error.name'), 'messaging extraction watcher trigger must bound source error names');
    assert(!messagingTrigger.includes('sourceErrorCode: (error as any).code'), 'messaging extraction watcher trigger must not log unbounded source error codes');
    assert(!messagingTrigger.includes('sourceErrorStatus: (error as any).status || (error as any).statusCode'), 'messaging extraction watcher trigger must normalize source error status');
  }
  {
    const extractionWatcher = read('functions/src/messagingOnboarding/extractionWatcher.ts');
    assert(!extractionWatcher.includes('sourceErrorName: error.name'), 'messaging extraction watcher must bound source error names');
    assert(!extractionWatcher.includes('sourceErrorCode: (error as any).code'), 'messaging extraction watcher must bound source error codes');
  }
  {
    const webhookHandler = read('functions/src/messagingOnboarding/webhookHandler.ts');
    assert(!webhookHandler.includes('sourceErrorName: error.name'), 'messaging webhook handler must bound source error names');
    assert(!webhookHandler.includes('sourceErrorCode: (error as any).code'), 'messaging webhook handler must bound source error codes');
    assert(!webhookHandler.includes('sourceErrorStatus: (error as any).status || (error as any).statusCode'), 'messaging webhook handler must normalize source error status');
  }
  {
    const assetIntelligence = read('functions/src/messagingOnboarding/assetIntelligence.ts');
    assert(!assetIntelligence.includes('sourceErrorName: error.name'), 'messaging asset intelligence must bound source error names');
    assert(!assetIntelligence.includes('sourceErrorCode: errorRecord.code'), 'messaging asset intelligence must bound source error codes through helper');
    assert(!assetIntelligence.includes('typeof errorRecord.status === "number"'), 'messaging asset intelligence must normalize source status values');
  }
  {
    const inboundQueue = read('functions/src/messagingOnboarding/inboundQueue.ts');
    assert(!inboundQueue.includes('errorName: error.name'), 'messaging inbound queue must bound source error names');
    assert(!inboundQueue.includes('errorCode: (error as any).code'), 'messaging inbound queue must bound source error codes');
  }
  {
    const healthMonitor = read('functions/src/messagingOnboarding/healthMonitor.ts');
    assert(!healthMonitor.includes('errorName: error instanceof Error ? error.name : typeof error'), 'messaging health monitor must bound source error names');
    assert(!healthMonitor.includes('errorCode: error instanceof Error ? (error as any).code : undefined'), 'messaging health monitor must bound source error codes');
  }
  {
    const intakeProcessor = read('functions/src/messagingOnboarding/intakeProcessor.ts');
    assert(!intakeProcessor.includes('errorName: error.name'), 'messaging intake processor must bound source error names');
    assert(!intakeProcessor.includes('errorCode: (error as any).code'), 'messaging intake processor must bound source error codes');
  }
  {
    const sessionEngine = read('functions/src/messagingOnboarding/sessionEngine.ts');
    assert(!sessionEngine.includes('errorName: err instanceof Error ? err.name : typeof err'), 'messaging session engine must bound upload error names');
    assert(!sessionEngine.includes('errorCode: err instanceof Error ? (err as any).code : undefined'), 'messaging session engine must bound upload error codes');
  }
  {
    const publishPipeline = read('functions/src/messagingOnboarding/publishPipeline.ts');
    assert(!publishPipeline.includes('errorName: err instanceof Error ? err.name : typeof err'), 'messaging publish pipeline must bound confirmation error names');
    assert(!publishPipeline.includes('errorCode: err instanceof Error ? (err as any).code : undefined'), 'messaging publish pipeline must bound confirmation error codes');
  }
  {
    const whatsappAdapter = read('functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts');
    assert(!whatsappAdapter.includes('errorName: err instanceof Error ? err.name : typeof err'), 'WhatsApp adapter must bound parse error names');
    assert(!whatsappAdapter.includes('errorCode: err instanceof Error ? (err as any).code : undefined'), 'WhatsApp adapter must bound parse error codes');
    assert(!whatsappAdapter.includes('throw new Error(`WhatsApp send failed: ${response.status}`)'), 'WhatsApp adapter must throw stable send failure codes');
  }

  {
    const functionsFeatureFlags = read('functions/src/constants/features.ts');
    const decisionBlocksScoring = read('functions/src/decisionBlocksScoring.ts');
    const maintenanceScheduler = read('functions/src/schedulers/menulistMaintenanceScheduler.ts');
    assert(functionsFeatureFlags.includes('ENABLE_RESELLER_DASHBOARD: true,'), 'Functions reseller dashboard flag must stay enabled so manual license expiry can run');
    assert(!decisionBlocksScoring.includes('Manual License Expiry Check'), 'reseller license expiry must stay out of the legacy decision-block scheduler');
    assert(!decisionBlocksScoring.includes("name: 'reseller_license_expiry'"), 'legacy decision-block scheduler must not register reseller license expiry');
    assert(!decisionBlocksScoring.includes('SCHEDULER_RESELLER_LICENSE_EXPIRE_FAILED'), 'legacy decision-block scheduler must not own reseller expiry failure codes');
    assert(!maintenanceScheduler.includes('sampleJobIds'), 'maintenance scheduler stuck-job alert metadata must not store raw extraction job IDs');
    assert(!maintenanceScheduler.includes('                runId,\n                failureCode,'), 'maintenance scheduler failure alert metadata must not store raw run IDs');
    assert(!maintenanceScheduler.includes('sampleDraftIds'), 'maintenance scheduler public-draft cleanup details must not store raw draft ID samples');
    assert(!maintenanceScheduler.includes('draftId: doc.id'), 'maintenance scheduler public-draft cleanup logs must not store raw draft IDs');
    assert(!maintenanceScheduler.includes('sourceErrorName: error.name'), 'maintenance scheduler errors must bound source error names');
    assert(!maintenanceScheduler.includes('sourceErrorCode: (error as any).code'), 'maintenance scheduler errors must bound source error codes');
    assert(!maintenanceScheduler.includes('sourceErrorStatus: (error as any).status || (error as any).statusCode'), 'maintenance scheduler errors must normalize source error status');
    assert(!maintenanceScheduler.includes('title: `STILL UNRESOLVED: ${alert.title}`'), 'maintenance scheduler alert escalation must not forward raw alert titles');
    assert(!maintenanceScheduler.includes('${alert.message}'), 'maintenance scheduler alert escalation must not forward raw alert messages');
    assert(!maintenanceScheduler.includes('Original time: ${alert.timestamp'), 'maintenance scheduler alert escalation must not forward raw alert timestamps in message copy');
  }
  {
    const menuJobCleanup = read('functions/src/schedulers/menuJobCleanup.ts');
    assert(menuJobCleanup.includes('sampleJobIdLengthTotal'), 'menu job cleanup must return bounded stuck-job ID metadata');
    assert(!menuJobCleanup.includes('jobIds: string[]'), 'menu job cleanup must not return raw stuck-job ID arrays');
    assert(!menuJobCleanup.includes('return { cleaned: stuckJobs.size, jobIds }'), 'menu job cleanup must not return raw stuck-job IDs');
  }
  {
    const messagingSessionCleanup = read('functions/src/schedulers/messagingSessionCleanup.ts');
    assert(!messagingSessionCleanup.includes('sourceErrorName: error.name'), 'messaging session cleanup errors must bound source error names');
    assert(!messagingSessionCleanup.includes('sourceErrorCode: (error as any).code'), 'messaging session cleanup errors must bound source error codes');
    assert(!messagingSessionCleanup.includes('sourceErrorStatus: (error as any).status || (error as any).statusCode'), 'messaging session cleanup errors must normalize source error status');
  }
  {
    const platformNotificationDelivery = read('functions/src/monitoring/platformNotificationDelivery.ts');
    assert(
      !platformNotificationDelivery.includes('metadata?: Record<string, any>'),
      'Functions platform alert payload metadata must stay at an unknown runtime boundary',
    );
    assert(
      !platformNotificationDelivery.includes("`Scope: tenant=${alert.tId || 'system'} store=${alert.sId || 'system'}`"),
      'platform alert delivery copy must not render raw tenant/store scope identifiers',
    );
    assert(
      !platformNotificationDelivery.includes('`Alert ID: ${alert.id}`'),
      'platform alert delivery copy must not render raw alert IDs',
    );
    assert(
      !platformNotificationDelivery.includes('.catch(() => undefined)'),
      'platform alert delivery must not silently swallow Email/WhatsApp provider failures',
    );
    assert(
      platformNotificationDelivery.includes("error: 'whatsapp_send_failed'"),
      'platform alert WhatsApp delivery must return a stable failure code for non-2xx provider responses',
    );
  }
  {
    const appPlatformNotificationDelivery = read('src/lib/ops/platformNotificationDelivery.ts');
    assert(
      !appPlatformNotificationDelivery.includes('metadata?: Record<string, any>'),
      'App platform alert payload metadata must stay at an unknown runtime boundary',
    );
    assert(
      !appPlatformNotificationDelivery.includes("`Scope: tenant=${alert.tId || 'system'} store=${alert.sId || 'system'}`"),
      'app-side platform alert delivery copy must not render raw tenant/store scope identifiers',
    );
    assert(
      !appPlatformNotificationDelivery.includes('`Alert ID: ${alert.id}`'),
      'app-side platform alert delivery copy must not render raw alert IDs',
    );
    assert(
      !appPlatformNotificationDelivery.includes('.catch(() => undefined)'),
      'app-side platform alert delivery must not silently swallow Email/WhatsApp provider failures',
    );
    assert(
      appPlatformNotificationDelivery.includes('logPlatformDeliveryResultFailure(OPS_PLATFORM_ALERT_EMAIL_DELIVERY_FAILED'),
      'app-side platform alert email returned failures must be logged with bounded diagnostics',
    );
    assert(
      appPlatformNotificationDelivery.includes('logPlatformDeliveryResultFailure(OPS_PLATFORM_ALERT_WHATSAPP_DELIVERY_FAILED'),
      'app-side platform alert WhatsApp returned failures must be logged with bounded diagnostics',
    );
  }
  {
    const telegramAlert = read('functions/src/monitoring/telegramAlert.ts');
    assert(
      !telegramAlert.includes('`Store: ${alert.metadata.storeId}`'),
      'Telegram alert delivery copy must not render raw store identifiers',
    );
    assert(
      !telegramAlert.includes('`Tenant: ${alert.metadata.tenantId}`'),
      'Telegram alert delivery copy must not render raw tenant identifiers',
    );
    assert(
      !telegramAlert.includes('] ${alert.title}</b>'),
      'Telegram alert delivery copy must not render raw alert titles in HTML mode',
    );
    assert(
      !telegramAlert.includes('\n    alert.message,\n'),
      'Telegram alert delivery copy must not render raw alert messages in HTML mode',
    );
    assert(
      !telegramAlert.includes('`Code: ${alert.metadata.failureCode}`'),
      'Telegram alert delivery copy must not render raw failure-code metadata in HTML mode',
    );
  }
  assertOrder(
    'src/app/api/ops/messaging-onboarding/route.ts',
    [
      'if (!FEATURE_FLAGS.ENABLE_MESSAGING_ONBOARDING_DASHBOARD)',
      'checkMessagingOnboardingOpsRateLimit(session)',
      'await Promise.all([',
      'getLatestHealthSnapshot()',
      'getInboundQueueCounts()',
      'getSessionStateCounts()',
      'getWebhookWindow(generatedAt)',
      'getRecentSessions()',
      'getRecentAlerts()',
    ],
    'messaging onboarding ops read limiter before Admin SDK snapshot reads',
  );
  const appOpsAlerts = read('src/lib/ops/alerts.ts');
  assert(
    !appOpsAlerts.includes('https://api.telegram.org/bot${botToken}/sendMessage'),
    'App-side Telegram alert helper must not interpolate raw bot token into provider URL path',
  );
  assert(
    !appOpsAlerts.includes('*${params.title}*'),
    'App-side Telegram alert helper must not interpolate raw alert titles into Markdown text',
  );
  assert(
    !appOpsAlerts.includes('${params.message}'),
    'App-side Telegram alert helper must not interpolate raw alert messages into Markdown text',
  );
  const platformNotificationsRoute = read('src/app/api/ops/platform-notifications/route.ts');
  assert(!platformNotificationsRoute.includes('title: String(data.title || classified.entry.title)'), 'Platform notification route must not return raw stored alert titles');
  assert(!platformNotificationsRoute.includes('message: String(data.message || classified.entry.description)'), 'Platform notification route must not return raw stored alert messages');
  assert(!platformNotificationsRoute.includes("const keys = [\n    'alertId',"), 'Platform notification route must not preview raw ID-like alert metadata');
	  assert(!opsDal.includes('result.safeModeReason = data.reason || null'), 'Ops DAL must not return raw SAFE_MODE reason text');
	  assert(!opsDal.includes('result.lastAlertTitle = lastAlert.title || null'), 'Ops DAL must not return raw stored alert titles');
	  assert(!opsControlRoom.includes('secureError('), 'Ops control room must use bounded ops diagnostics instead of raw secureError');
	  assert(!opsControlRoom.includes('res.json()'), 'Ops control room must not use direct unbounded response parsing');
	  assert(!opsControlRoom.includes('.json().catch'), 'Ops control room must not silently swallow malformed response JSON');
	  assert(!mobileOpsControlRoom.includes("if (!response.ok) throw new Error('Request failed')"), 'Mobile ops control room must validate bounded action response envelopes');
	  assert(!mobileOpsControlRoom.includes('response.json()'), 'Mobile ops control room must not use direct unbounded response parsing');
	  assert(!mobileOpsControlRoom.includes('.json().catch'), 'Mobile ops control room must not silently swallow malformed response JSON');
	  assert(!opsControlRoomClientResponse.includes('response.json()'), 'Ops control room response helper must not use direct unbounded response parsing');
	  assert(!opsControlRoomClientResponse.includes('.json().catch'), 'Ops control room response helper must not silently swallow malformed response JSON');
	  assert(!costPostureDal.includes('throw new Error((payload'), 'Platform cost posture DAL must not throw raw API error text');
  assert(!costPostureDal.includes('payload.error) ||'), 'Platform cost posture DAL must not copy raw API error text into thrown errors');
  assert(!costPostureDal.includes('return await response.json()'), 'Platform cost posture DAL must not parse unbounded response JSON');
  assert(!costPostureDal.includes('response.json()'), 'Platform cost posture DAL must not use direct response parsing');
  assert(!costPostureDal.includes('response.json().catch(() => null)'), 'Platform cost posture DAL must not silently swallow response parse failures');
  assert(!costPostureRoute.includes("title: cleanText(data.title || data.type || 'Cost signal', 140)"), 'Platform cost posture route must not return raw stored alert titles');
  assert(!costPostureRoute.includes("message: cleanText(data.message || data.reason || '', 260)"), 'Platform cost posture route must not return raw stored alert messages');
  assert(!costPostureRoute.includes('reason: data.reason ? cleanText(data.reason, 240) : null'), 'Platform cost posture route must not return raw stored SAFE_MODE reason text');
  assert(!costPostureRoute.includes('safeMode.reason ? `: ${safeMode.reason}`'), 'Platform cost posture guardrail must not interpolate raw SAFE_MODE reason text');
  assert(!costPostureRoute.includes('id: doc.id,'), 'Platform cost posture route must not return raw stored alert document IDs');
  assert(!/secureError\('\[PlatformCostPosture\]/.test(costPostureRoute), 'Platform cost posture route must not use raw secureError diagnostics');
  assert(!/logger\.security\([\s\S]+?\buserId,\s*\n/.test(costPostureRoute), 'Platform cost posture route rate-limit log must not include raw userId');
  assert(!platformNotificationMonitor.includes('response.json()'), 'Platform notification monitor must not use direct unbounded response parsing');
  assert(!platformNotificationMonitor.includes('.json().catch'), 'Platform notification monitor must not silently swallow malformed response JSON');
  assert(platformNotificationMonitor.includes("cache: 'no-store'"), 'Platform notification monitor route requests must disable browser cache');
  assert(platformNotificationMonitor.includes("credentials: 'same-origin'"), 'Platform notification monitor route requests must keep credentials same-origin');
  assert(platformNotificationMonitor.includes("redirect: 'manual'"), 'Platform notification monitor route requests must not follow auth/API redirects');
	  assert(!platformNotificationMonitor.includes('const data = await response.json'), 'Platform notification monitor loads must use the bounded response helper');
	  assert(!platformNotificationMonitor.includes('const result = await response.json'), 'Platform notification monitor actions must use the bounded response helper');
	  assert(!platformNotificationMonitor.includes('await navigator.clipboard.writeText(prefillModal?.channel'), 'Platform notification monitor must not use inline unguarded prefill message copy');
	  assert(!platformNotificationMonitor.includes('await navigator.clipboard.writeText(messageText);'), 'Platform notification monitor must not use unguarded Clipboard API success');
	  assert(!platformNotificationClientResponse.includes('response.json()'), 'Platform notification response helper must not use direct unbounded response parsing');
  assert(!platformNotificationClientResponse.includes('.json().catch'), 'Platform notification response helper must not silently swallow malformed response JSON');
  assert(!ownerNotificationMonitor.includes('response.json()'), 'Owner notification monitor must not use direct unbounded response parsing');
  assert(!ownerNotificationMonitor.includes('.json().catch'), 'Owner notification monitor must not silently swallow malformed response JSON');
  assert(ownerNotificationMonitor.includes("cache: 'no-store'"), 'Owner notification monitor route requests must disable browser cache');
  assert(ownerNotificationMonitor.includes("credentials: 'same-origin'"), 'Owner notification monitor route requests must keep credentials same-origin');
  assert(ownerNotificationMonitor.includes("redirect: 'manual'"), 'Owner notification monitor route requests must not follow auth/API redirects');
	  assert(!ownerNotificationMonitor.includes('const data = await response.json'), 'Owner notification monitor loads must use the bounded response helper');
	  assert(!ownerNotificationMonitor.includes('const result = await response.json'), 'Owner notification monitor actions must use the bounded response helper');
	  assert(!ownerNotificationMonitor.includes('await navigator.clipboard.writeText(prefillModal?.channel'), 'Owner notification monitor must not use inline unguarded prefill message copy');
	  assert(!ownerNotificationMonitor.includes('await navigator.clipboard.writeText(messageText);'), 'Owner notification monitor must not use unguarded Clipboard API success');
  assert(!ownerNotificationClientResponse.includes('response.json()'), 'Owner notification response helper must not use direct unbounded response parsing');
  assert(!ownerNotificationClientResponse.includes('.json().catch'), 'Owner notification response helper must not silently swallow malformed response JSON');
  assertIncludes(
    'src/app/api/platform/cost-posture/route.ts',
    [
      "getRateLimitForFeature('DATA_READ')",
      'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      'key: `platform-cost-posture:${userRateLimitHash}`',
    ],
    'Platform cost posture read limiter',
  );
  assert(!costPostureRoute.includes('key: `platform-cost-posture:${userId}`'), 'Platform cost posture route must not store raw user IDs in rate-limit keys');
  assert(!messagingOnboardingOpsRoute.includes('id: doc.id,'), 'Messaging onboarding ops route must not return raw Firestore document IDs as row keys');
  assert(!messagingOnboardingOpsRoute.includes("sessionId: String(data.sessionId || '-')"), 'Messaging onboarding ops route must not return raw event session IDs');
  assert(!messagingOnboardingOpsRoute.includes('alerts: Array.isArray(data.alerts) ? data.alerts : []'), 'Messaging onboarding ops route must not return raw health alert text');
  assert(!messagingOnboardingOpsRoute.includes("title: data.title || 'Messaging onboarding alert'"), 'Messaging onboarding ops route must not return raw stored alert titles');
  assert(!messagingOnboardingOpsRoute.includes("message: data.message || ''"), 'Messaging onboarding ops route must not return raw stored alert messages');
  assert(!messagingOnboardingOpsRoute.includes('key: `${MESSAGING_ONBOARDING_OPS_RATE_LIMIT_KEY}:${userId}`'), 'Messaging onboarding ops route must not store raw user IDs in rate-limit keys');
  assertIncludes(
    'src/components/templates/main-app/platform/messagingOnboardingMonitor/index.tsx',
    [
      "cache: 'no-store'",
      "credentials: 'same-origin'",
      "redirect: 'manual'",
      'MESSAGING_ONBOARDING_MONITOR_RESPONSE_JSON_MAX_BYTES = 256 * 1024',
      'readJsonResponseWithLimit<unknown>',
      'isMessagingOnboardingOpsSnapshotResponse',
      'const activeRequestRef = useRef<AbortController | null>(null)',
      'activeRequestRef.current?.abort()',
      'signal: controller.signal',
      'setSnapshot(null)',
      'messaging_onboarding_monitor_response_parse_failed',
      'messaging_onboarding_monitor_response_invalid',
      'messaging_onboarding_monitor_response_rejected',
      'messaging_onboarding_monitor_request_failed',
      "getBoundedRuntimeStringContext('endpoint', '/api/ops/messaging-onboarding')",
      'MESSAGING_ONBOARDING_MONITOR_LOAD_FAILED',
    ],
    'Messaging onboarding monitor bounded response reader',
  );
  assertIncludes(
    'src/lib/ops/messagingOnboardingOpsBoundary.ts',
    [
      'isCanonicalIsoTimestamp(value.generatedAt)',
      'isNonNegativeSafeInteger(value.inboundQueue?.[key])',
      'value.recentSessions.length > MESSAGING_ONBOARDING_RECENT_SESSION_LIMIT',
      'value.recentEvents.length > MESSAGING_ONBOARDING_RECENT_EVENT_LIMIT',
      'value.recentAlerts.length > MESSAGING_ONBOARDING_RECENT_ALERT_LIMIT',
    ],
    'Messaging onboarding shared response boundary',
  );
  assert(!messagingOnboardingMonitor.includes('setSnapshot(await response.json())'), 'Messaging onboarding monitor must not set state from direct unbounded response parsing');
  assert(!messagingOnboardingMonitor.includes('response.json()'), 'Messaging onboarding monitor must not use direct unbounded response parsing');
  assert(!messagingOnboardingMonitor.includes('.json().catch'), 'Messaging onboarding monitor must not silently swallow malformed response JSON');
  const ownerBusinessAssistantMonitorRoute = read('src/app/api/platform/owner-business-assistant/monitor/route.ts');
  const ownerBusinessAssistantThreadRoute = read('src/app/api/owner-business-assistant/thread/[threadId]/route.ts');
  const ownerBusinessAssistantFeedbackRoute = read('src/app/api/owner-business-assistant/feedback/route.ts');
  const ownerBusinessAssistantSchemas = read('src/lib/ownerBusinessAssistant/schemas.ts');
  const ownerBusinessAssistantProjectIdBoundary = read('src/lib/ownerBusinessAssistant/projectIdBoundary.ts');
  const ownerBusinessAssistantThreadIdBoundary = read('src/lib/ownerBusinessAssistant/threadIdBoundary.ts');
  const ownerBusinessAssistantThreadResponse = read('src/lib/ownerBusinessAssistant/threadResponse.ts');
  const ownerBusinessAssistantAnswerEventLogger = read('src/lib/ownerBusinessAssistant/server/answerEventLogger.ts');
  const ownerBusinessAssistantApiGuards = read('src/lib/ownerBusinessAssistant/server/apiGuards.ts');
  const ownerBusinessAssistantSessionScope = read('src/lib/ownerBusinessAssistant/server/sessionScope.ts');
  const ownerBusinessAssistantClientResponses = read('src/lib/ownerBusinessAssistant/clientResponses.ts');
  const ownerBusinessAssistantCurrentHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessHealthCurrent.ts');
  const ownerBusinessAssistantAnalyticsHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessAnalyticsIndex.ts');
  const ownerBusinessAssistantLocationsHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessLocationsSummary.ts');
  const ownerBusinessAssistantThreadHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantThread.ts');
  const ownerBusinessAssistantAnswerHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantAnswer.ts');
  const ownerBusinessAssistantImplDoc = read('__docs__/owner-business-assistant/owner-business-assistant_impl.md');
  const ownerBusinessAssistantFirebaseDoc = read('__docs__/owner-business-assistant/owner-business-assistant_firebase.md');
  const ownerBusinessAssistantValidationDoc = read('__docs__/owner-business-assistant/owner-business-assistant_validation.md');
  const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  assertIncludes(
    'src/lib/ownerBusinessAssistant/server/apiGuards.ts',
    [
      'resolveOwnerAssistantSelectedStoreScope',
      'normalizeStoreSwitchStoreId',
      'if (hasRequestedStoreId && !selectedStoreId)',
      'canUserAccessStore({ sessionUser, storeId: selectedStoreId })',
      'Tenant Access Violation - Owner Business Assistant Store Scope',
      'getBoundedSecurityRouteContext',
      "getBoundedSecurityStringContext('attemptedStoreId', selectedStoreId)",
      "getBoundedSecurityStringContext('sessionStoreId', sId)",
      'ensureOwnerAssistantTenantAccess',
      'verifyTenantAccess(session, tId, sId, request)',
      'const userRateLimitHash = hashPublicRateLimitValue(userId || \'unknown\');',
      'const tenantRateLimitHash = hashPublicRateLimitValue(tId || \'_\');',
      'const storeRateLimitHash = hashPublicRateLimitValue(sId || \'_\');',
      'key: `${params.keyPrefix}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`',
      "getBoundedSecurityStringContext('storeId', sId)",
      "getBoundedSecurityStringContext('tenantId', tId)",
      "getBoundedSecurityStringContext('userId', userId)",
    ],
    'Owner Business Assistant API guard hashed limiter and bounded diagnostics',
  );
  assert(!ownerBusinessAssistantApiGuards.includes('key: `${params.keyPrefix}:${userId || \'unknown\'}:${tId || \'_\'}:${sId || \'_\'}`'), 'Owner Business Assistant API guards must not store raw user/tenant/store IDs in rate-limit keys');
  assert(!ownerBusinessAssistantApiGuards.includes('attemptedStoreId: selectedStoreId'), 'Owner Business Assistant API guards must not raw-log selected-store violation store IDs');
  assert(!ownerBusinessAssistantApiGuards.includes('sessionStoreId: sId'), 'Owner Business Assistant API guards must not raw-log selected-store violation session store IDs');
  assert(!ownerBusinessAssistantApiGuards.includes('storeId: sId,\n    tenantId: tId,\n    userId,'), 'Owner Business Assistant API guards must not raw-log rate-limit scope IDs');
  assert(!ownerBusinessAssistantApiGuards.includes('buildSecurityContext'), 'Owner Business Assistant API guards must not spread raw security context into guard security logs');
  assert(ownerBusinessAssistantSessionScope.includes('resolveStorePermissionSessionScope(session)'), 'Owner Business Assistant scope must require exact root/nested tenant and store alias agreement');
  assert(ownerBusinessAssistantSessionScope.includes('normalized.every((actorId) => actorId === first)'), 'Owner Business Assistant scope must require exact root/nested actor alias agreement');
  assert(ownerBusinessAssistantApiGuards.includes('resolveOwnerBusinessAssistantSessionScope(session)'), 'Owner Business Assistant API guards must use exact authenticated scope');
  assert(ownerBusinessAssistantSchemas.includes('normalizeStoreSwitchStoreId(value) !== null'), 'Owner Business Assistant store schema must require exact canonical store IDs');
  assert(!ownerBusinessAssistantSchemas.includes("z.string().min(1).max(80).regex(/^\\d+$/).optional()"), 'Owner Business Assistant store schema must not admit leading-zero or unsafe numeric strings');
  [
    'OWNER_BUSINESS_ASSISTANT_READ_MODEL_RESPONSE_JSON_MAX_BYTES = 256 * 1024',
    'OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY',
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    'readJsonResponseWithLimit<unknown>',
    'isOwnerBusinessHealthCurrentDoc',
    'isOwnerBusinessAssistantAnalyticsResponse',
    'isOwnerBusinessAssistantLocationsResponse',
    'isOwnerBusinessAssistantThreadResponse',
    'isOwnerBusinessAssistantMonitorResponse',
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
    'owner_business_assistant_monitor_response_rejected',
    'owner_business_assistant_monitor_response_parse_failed',
    'owner_business_assistant_monitor_response_invalid',
    'readOwnerBusinessAssistantMonitorResponse',
  ].forEach((token) => {
    assert(ownerBusinessAssistantClientResponses.includes(token), `Owner Business Assistant read-model response guard missing ${token}`);
  });
  [
    ['current', ownerBusinessAssistantCurrentHook, 'readOwnerBusinessAssistantCurrentResponse'],
    ['analytics', ownerBusinessAssistantAnalyticsHook, 'readOwnerBusinessAssistantAnalyticsResponse'],
    ['locations', ownerBusinessAssistantLocationsHook, 'readOwnerBusinessAssistantLocationsResponse'],
    ['thread', ownerBusinessAssistantThreadHook, 'readOwnerBusinessAssistantThreadResponse'],
    ['monitor', ownerBusinessAssistantMonitor, 'readOwnerBusinessAssistantMonitorResponse'],
  ].forEach(([label, source, reader]) => {
    assert(source.includes(reader), `Owner Business Assistant ${label} caller must use shared bounded response reader`);
    assert(source.includes('OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY'), `Owner Business Assistant ${label} caller must use shared request policy`);
    assert(source.includes('getBoundedRuntimeStringContext'), `Owner Business Assistant ${label} caller must use bounded diagnostics context`);
    assert(!source.includes('response.json()'), `Owner Business Assistant ${label} caller must not use direct unbounded response parsing`);
    assert(!source.includes('.json().catch'), `Owner Business Assistant ${label} caller must not silently swallow response parsing failures`);
  });
  assert(ownerBusinessAssistantAnswerHook.includes('OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY'), 'Owner Business Assistant answer caller must use shared request policy');
  assert(ownerBusinessAssistantAnswerHook.includes('readJsonResponseWithLimit'), 'Owner Business Assistant answer caller must use bounded answer response parser');
  assert(ownerBusinessAssistantThreadRoute.includes('OwnerBusinessAssistantThreadParamsSchema.safeParse(params)'), 'Owner Business Assistant thread route must schema-validate route params');
  assert(ownerBusinessAssistantThreadRoute.includes('resolveOwnerAssistantSelectedStoreScope(request, session, parsedScope.data.storeId)'), 'Owner Business Assistant thread route must resolve selected store scope');
  assert(ownerBusinessAssistantThreadRoute.includes('requireAnyStorePermissionForStore('), 'Owner Business Assistant thread route must require store permission before thread reads');
  assert(ownerBusinessAssistantThreadRoute.includes('isOwnerBusinessAssistantThreadOwnedByScope(thread, scope)'), 'Owner Business Assistant thread route must require exact actor ownership');
  assert(ownerBusinessAssistantThreadRoute.includes('projectOwnerBusinessAssistantMessage'), 'Owner Business Assistant thread route must project allowlisted messages');
  assert(!ownerBusinessAssistantThreadRoute.includes('const threadMeta = { ...thread };'), 'Owner Business Assistant thread route must not expose raw persisted thread fields');
  assert(ownerBusinessAssistantThreadResponse.includes('export const projectOwnerBusinessAssistantMessage = (value: unknown) => {'), 'Owner Business Assistant thread messages must use a pure allowlist projector');
  assert(ownerBusinessAssistantThreadResponse.includes('export function isOwnerBusinessAssistantThreadOwnedByScope('), 'Owner Business Assistant thread ownership must use a pure exact scope predicate');
  assert(!ownerBusinessAssistantThreadResponse.includes('...message'), 'Owner Business Assistant thread projector must not spread raw persisted messages');
  assert(ownerBusinessAssistantSchemas.includes("import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';"), 'Owner Business Assistant schemas must import shared document-ID guard');
  assert(ownerBusinessAssistantProjectIdBoundary.includes('projectId === value'), 'Owner Business Assistant project ID helper must reject whitespace-mutated project IDs');
  assert(ownerBusinessAssistantThreadIdBoundary.includes('threadId === value'), 'Owner Business Assistant thread ID helper must reject whitespace-mutated thread IDs');
  assert(ownerBusinessAssistantSchemas.includes("if (typeof value === 'string') return value;"), 'Owner Business Assistant project ID schema must preserve raw project ID values before validation');
  assert(!ownerBusinessAssistantSchemas.includes("if (typeof value === 'string') return value.trim();"), 'Owner Business Assistant project ID schema must not trim project IDs before validation');
  assert(!ownerBusinessAssistantSchemas.includes('const OwnerBusinessAssistantThreadIdSchema = z.string()\n  .trim()'), 'Owner Business Assistant thread ID schema must not trim thread IDs before validation');
  assert(ownerBusinessAssistantSchemas.includes('const OwnerBusinessAssistantAnswerIdSchema = z.string()'), 'Owner Business Assistant schemas must define feedback answer ID schema');
  assert(ownerBusinessAssistantSchemas.includes(".refine((value) => value === value.trim() && isValidFirestoreDocumentId(value), 'Invalid answer ID')"), 'Owner Business Assistant feedback answer IDs must use strict raw shared document-ID guard');
  assert(ownerBusinessAssistantSchemas.includes('answerId: OwnerBusinessAssistantAnswerIdSchema'), 'Owner Business Assistant feedback schema must use answer ID boundary');
  assert(!ownerBusinessAssistantSchemas.includes('answerId: z.string().min(1).max(180)'), 'Owner Business Assistant feedback answer ID must not keep loose string validation');
  assert(ownerBusinessAssistantAnswerEventLogger.includes("import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';"), 'Owner Business Assistant answer-event logger must import shared document-ID guard');
  assert(ownerBusinessAssistantAnswerEventLogger.includes('const normalizeAnswerEventDocumentId = (value: unknown): string | null => {'), 'Owner Business Assistant answer-event logger must normalize answer event document IDs');
  assert(ownerBusinessAssistantAnswerEventLogger.includes('documentId === value && isValidFirestoreDocumentId(documentId)'), 'Owner Business Assistant answer-event logger must reject whitespace-mutated answer IDs');
  assert(ownerBusinessAssistantAnswerEventLogger.includes('const answerId = normalizeAnswerEventDocumentId(params.answer.answerId);'), 'Owner Business Assistant answer-event logger must normalize answer IDs before writes');
  assert(ownerBusinessAssistantAnswerEventLogger.includes('if (!answerId) return;'), 'Owner Business Assistant answer-event logger must skip malformed answer IDs');
  assert(ownerBusinessAssistantAnswerEventLogger.includes('.doc(answerId)'), 'Owner Business Assistant answer-event logger must write normalized answer event document IDs');
  assert(!ownerBusinessAssistantAnswerEventLogger.includes('.doc(params.answer.answerId)'), 'Owner Business Assistant answer-event logger must not write raw answer event document IDs');
  [
    ownerBusinessAssistantImplDoc,
    ownerBusinessAssistantFirebaseDoc,
    ownerBusinessAssistantValidationDoc,
    productionReadinessAudit,
    changelog,
  ].forEach((docSource) => {
    assert(docSource.includes('whitespace-mutated'), 'Owner Business Assistant docs must record whitespace-mutated ID rejection');
  });
  assert(ownerBusinessAssistantImplDoc.includes('does not trim before `normalizeOwnerBusinessAssistantProjectId(value) === value`'), 'Owner Business Assistant implementation docs must record raw project ID validation');
  assert(ownerBusinessAssistantImplDoc.includes('OwnerBusinessAssistantThreadIdSchema` does not trim before `normalizeOwnerBusinessAssistantThreadId(value) === value`'), 'Owner Business Assistant implementation docs must record raw thread ID validation');
  assert(ownerBusinessAssistantFirebaseDoc.includes('does not trim before `normalizeOwnerBusinessAssistantProjectId(value) === value`'), 'Owner Business Assistant Firebase docs must record raw project ID validation');
  assert(ownerBusinessAssistantFirebaseDoc.includes('Malformed, whitespace-mutated, path-shaped, or reserved IDs stop before the feedback write'), 'Owner Business Assistant Firebase docs must record raw answer ID rejection');
  assert(productionReadinessAudit.includes('Owner Business Assistant strict document-ID boundary checkpoint'), 'Production readiness audit must record Owner Business Assistant strict document-ID checkpoint');
  assert(changelog.includes('Owner Business Assistant Strict Document ID Boundary'), 'Changelog must record Owner Business Assistant strict document-ID checkpoint');
  assert(ownerBusinessAssistantFeedbackRoute.includes("import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';"), 'Owner Business Assistant feedback route must import shared document-ID guard');
  assert(ownerBusinessAssistantFeedbackRoute.includes('if (!isValidFirestoreDocumentId(docId)) {'), 'Owner Business Assistant feedback route must guard composed feedback document ID before write');
  assertOrder(
    'src/app/api/owner-business-assistant/feedback/route.ts',
    [
      'OwnerBusinessAssistantFeedbackRequestSchema.safeParse(bodyResult.data)',
      'const docId = `${parsed.data.answerId}_${scope.userId || \'unknown\'}`;',
      'if (!isValidFirestoreDocumentId(docId)) {',
      'const feedbackRecord = buildOwnerBusinessAssistantFeedbackRecord({',
      '.collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_FEEDBACK)',
      '.doc(docId)',
      '.set(feedbackRecord);',
    ],
    'Owner Business Assistant feedback answer ID boundary before feedback document write',
  );
  assert(!ownerBusinessAssistantFeedbackRoute.includes('.set(feedbackRecord, { merge: true })'), 'Owner Business Assistant replacement feedback must not retain omitted reason/question fields');
  assertOrder(
    'src/app/api/owner-business-assistant/thread/[threadId]/route.ts',
    [
      'OwnerBusinessAssistantThreadParamsSchema.safeParse(params)',
      'applyOwnerBusinessAssistantRateLimit({',
      'OwnerBusinessAssistantScopeSchema',
      'resolveOwnerAssistantSelectedStoreScope(request, session, parsedScope.data.storeId)',
      'firestoreAdmin.collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_THREADS).doc(parsed.data.threadId)',
    ],
    'Owner Business Assistant thread route validation and scope before Firestore read',
  );
  assert(!ownerBusinessAssistantMonitorRoute.includes('id: doc.id,'), 'Business Health monitor route must not return raw answer or feedback document IDs');
  assert(!ownerBusinessAssistantMonitorRoute.includes('answerId: String(data.answerId || doc.id)'), 'Business Health monitor route must not return raw answer IDs');
  assert(!ownerBusinessAssistantMonitorRoute.includes("tId: String(data.tId || '')"), 'Business Health monitor route must not return raw tenant IDs');
  assert(!ownerBusinessAssistantMonitorRoute.includes("sId: String(data.sId || '')"), 'Business Health monitor route must not return raw store IDs');
  assert(!ownerBusinessAssistantMonitorRoute.includes("question: String(data.question || '')"), 'Business Health monitor route must not return raw stored questions');
  assert(!ownerBusinessAssistantMonitorRoute.includes("answerText: String(data.answerText || '')"), 'Business Health monitor route must not return raw stored answer text');
  assert(!ownerBusinessAssistantMonitorRoute.includes('unsupportedReason: data.unsupportedReason ? String(data.unsupportedReason) : null'), 'Business Health monitor route must not return raw unsupported reasons');
  assert(!ownerBusinessAssistantMonitorRoute.includes('reason: entry?.reason ? String(entry.reason) : null'), 'Business Health monitor route must not return raw source coverage reasons');
  assert(!ownerBusinessAssistantMonitorRoute.includes('recentFeedback: feedbackSnap.docs.map((doc) => serializeValue({ id: doc.id, ...doc.data() }))'), 'Business Health monitor route must not return raw feedback document spreads');
  assertIncludes(
    'src/app/api/platform/owner-business-assistant/monitor/route.ts',
    [
      "getRateLimitForFeature('DATA_READ')",
      'checkRateLimit({',
      'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      'key: `${OWNER_BUSINESS_ASSISTANT_MONITOR_RATE_LIMIT_KEY}:${userRateLimitHash}`',
      "'X-RateLimit-Limit': String(rateLimitConfig.limit)",
      'checkOwnerBusinessAssistantMonitorRateLimit(session)',
      '.collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_ANSWER_EVENTS)',
      '.collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_FEEDBACK)',
    ],
    'Owner Business Assistant monitor read limiter',
  );
  assert(!ownerBusinessAssistantMonitorRoute.includes('key: `${OWNER_BUSINESS_ASSISTANT_MONITOR_RATE_LIMIT_KEY}:${userId}`'), 'Owner Business Assistant monitor route must not store raw user IDs in rate-limit keys');
  assertOrder(
    'src/app/api/platform/owner-business-assistant/monitor/route.ts',
    [
      'QuerySchema.safeParse',
      'checkOwnerBusinessAssistantMonitorRateLimit(session)',
      '.collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_ANSWER_EVENTS)',
      '.collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_FEEDBACK)',
    ],
    'Owner Business Assistant monitor read limiter before Firestore reads',
  );
  [
    ['src/app/api/ops/messaging-onboarding/route.ts', 'message: data.error.message'],
    ['src/lib/ops/messagingOnboardingTypes.ts', 'message?: string'],
    ['functions/src/types/messagingOnboarding.types.ts', 'message: string'],
	    ['functions/src/messagingOnboarding/eventLogger.ts', 'message:'],
	    ['functions/src/messagingOnboarding/eventLogger.ts', 'metadata: params.metadata || {}'],
	    ['functions/src/messagingOnboarding/eventLogger.ts', 'errorName: error.name'],
	    ['functions/src/messagingOnboarding/eventLogger.ts', 'errorCode: (error as any).code'],
	    ['functions/src/messagingOnboarding/inboundQueue.ts', 'errorMessage'],
    ['functions/src/messagingOnboarding/inboundQueue.ts', 'error: errorMessage'],
    ['functions/src/messagingOnboarding/inboundQueue.ts', 'metadata: {\n      messageId,'],
    ['functions/src/messagingOnboarding/inboundQueue.ts', 'metadata: { messageId },'],
    ['functions/src/messagingOnboarding/inboundQueue.ts', 'logger.error("[InboundQueue] Failed to process inbound message", {\n      messageId,'],
    ['functions/src/messagingOnboarding/inboundQueue.ts', 'metadata: { messageId, attempts, exhausted },'],
    ['functions/src/messagingOnboarding/webhookHandler.ts', 'logger.info("[Webhook] Unknown or disabled provider", { path: req.path })'],
    ['functions/src/messagingOnboarding/webhookHandler.ts', 'ip: req.ip,'],
    ['functions/src/messagingOnboarding/webhookHandler.ts', 'metadata: { ip: req.ip }'],
    ['functions/src/messagingOnboarding/webhookHandler.ts', 'userId: normalizedMsg.userId.slice(-4)'],
    ['functions/src/messagingOnboarding/webhookHandler.ts', 'error: (queueError as Error).message'],
    ['functions/src/messagingOnboarding/webhookHandler.ts', 'messageId: queued.messageId'],
    ['functions/src/messagingOnboarding/extractionWatcher.ts', 'message: (err as Error).message'],
    ['functions/src/messagingOnboarding/extractionWatcher.ts', 'jobData.error?.message'],
    ['functions/src/messagingOnboarding/extractionWatcher.ts', 'logger.warn("[ExtractionWatcher] Session not found", { sessionId })'],
    ['functions/src/messagingOnboarding/extractionWatcher.ts', 'logger.warn("[ExtractionWatcher] Session not in PROCESSING_MENU, ignoring extraction result", {\n      sessionId,'],
    ['functions/src/messagingOnboarding/extractionWatcher.ts', 'logger.error("[ExtractionWatcher] Failed to send preview link", {\n      sessionId,'],
    ['functions/src/messagingOnboarding/extractionWatcher.ts', 'logger.info("[ExtractionWatcher] Pending uploads detected — owner may re-send", {\n      sessionId,'],
    ['functions/src/messagingOnboarding/extractionWatcher.ts', 'tempProjectId,\n      path: `projects/${tId}/${sId}/${tempProjectId}`,'],
    ['functions/src/messagingOnboarding/extractionWatcher.ts', 'Silent failure — temp project may not exist if extraction failed before save'],
    ['functions/src/messagingOnboarding/extractionWatcher.ts', '// Non-critical'],
	    ['functions/src/messagingOnboarding/intakeProcessor.ts', 'message: (err as Error).message'],
	    ['functions/src/messagingOnboarding/intakeProcessor.ts', '// Non-critical'],
	    ['functions/src/messagingOnboarding/intakeProcessor.ts', 'catch(() => { /* Rate limit doc may not exist yet'],
	    ['functions/src/messagingOnboarding/intakeProcessor.ts', 'Rate limit doc may not exist yet'],
	    ['functions/src/messagingOnboarding/sessionEngine.ts', 'message: (err as Error).message'],
    ['functions/src/messagingOnboarding/sessionEngine.ts', 'error: (err as Error).message'],
    ['functions/src/messagingOnboarding/sessionEngine.ts', 'logger.error("[SessionEngine] Forbidden state transition attempted", {\n      sessionId,'],
    ['functions/src/messagingOnboarding/sessionEngine.ts', 'logger.error("[SessionEngine] Failed to process upload", {\n      sessionId,'],
    ['functions/src/messagingOnboarding/sessionEngine.ts', 'Silent — file cleanup is non-critical'],
	    ['functions/src/messagingOnboarding/intakeProcessor.ts', 'error: (err as Error).message'],
    ['functions/src/messagingOnboarding/intakeProcessor.ts', 'logger.error("[IntakeProcessor] Error processing session", {\n        sessionId: doc.id,'],
    ['functions/src/messagingOnboarding/intakeProcessor.ts', 'logger.info("[IntakeProcessor] Sent pending preview link", {\n          sessionId: session.sessionId,'],
    ['functions/src/messagingOnboarding/intakeProcessor.ts', 'logger.error("[IntakeProcessor] Failed to send pending preview link", {\n          sessionId: doc.id,'],
    ['functions/src/messagingOnboarding/intakeProcessor.ts', 'logger.info("[IntakeProcessor] Sent publish confirmation", {\n          sessionId: session.sessionId,'],
    ['functions/src/messagingOnboarding/intakeProcessor.ts', 'logger.error("[IntakeProcessor] Failed to send publish confirmation", {\n          sessionId: doc.id,'],
    ['functions/src/messagingOnboarding/intakeProcessor.ts', 'logger.error("[IntakeProcessor] Failed to send fix message", {\n          sessionId: doc.id,'],
    ['functions/src/messagingOnboarding/intakeProcessor.ts', 'logger.error("[IntakeProcessor] Asset validation failed", {\n      sessionId: session.sessionId,'],
    ['functions/src/messagingOnboarding/intakeProcessor.ts', 'Asset validation failed after retry: ${(retryErr as Error).message}'],
    ['functions/src/messagingOnboarding/intakeProcessor.ts', 'Extraction job created: ${jobRef.id}'],
	    ['functions/src/messagingOnboarding/assetIntelligence.ts', 'error: (err as Error).message'],
	    ['functions/src/messagingOnboarding/assetIntelligence.ts', 'error: (parseErr as Error).message'],
		    ['functions/src/messagingOnboarding/assetIntelligence.ts', 'responseText.slice'],
		    ['functions/src/messagingOnboarding/assetIntelligence.ts', 'responseText:'],
				    ['functions/src/messagingOnboarding/assetIntelligence.ts', 'uploadId: upload.id'],
					    ['functions/src/messagingOnboarding/assetIntelligence.ts', 'fetch(upload.storageUrl)'],
					    ['functions/src/messagingOnboarding/assetIntelligence.ts', 'validateNetworkTargetUrl'],
					    ['functions/src/messagingOnboarding/assetIntelligence.ts', 'readResponseUint8ArrayWithLimit'],
				    ['functions/src/messagingOnboarding/assetIntelligence.ts', 'Buffer.from(await response.arrayBuffer())'],
				    ['functions/src/messagingOnboarding/assetIntelligence.ts', 'const arrayBuffer = await response.arrayBuffer()'],
			    ['functions/src/messagingOnboarding/publishPipeline.ts', 'error: (err as Error).message'],
    ['functions/src/messagingOnboarding/publishPipeline.ts', 'logger.warn("[PublishPipeline] Publishing without priced items", {\n      sessionId,'],
    ['functions/src/messagingOnboarding/publishPipeline.ts', 'logger.error("[PublishPipeline] Failed to send confirmation", {\n      sessionId,'],
    ['functions/src/messagingOnboarding/publishPipeline.ts', 'logger.info("[PublishPipeline] Published successfully", {\n    sessionId,'],
    ['functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts', 'error: (err as Error).message'],
    ['functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts', 'userId: userId.slice(-4)'],
	    ['functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts', 'await response.text()'],
	    ['functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts', 'const errorBody = await'],
		    ['functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts', 'getWhatsAppStringLogContext("errorBody"'],
		    ['functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts', 'Buffer.from(await mediaResponse.arrayBuffer())'],
		    ['functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts', 'const arrayBuffer = await mediaResponse.arrayBuffer()'],
    ['functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts', 'error: errorBody.slice(0, 200)'],
    ['functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts', '${providerMediaId}'],
    ['functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts', 'statusText'],
    ['functions/src/messagingOnboarding/healthMonitor.ts', 'error instanceof Error ? error.message'],
    ['functions/src/schedulers/messagingSessionCleanup.ts', 'error: (err as Error).message'],
    ['functions/src/schedulers/messagingSessionCleanup.ts', 'error: (sendErr as Error).message'],
	    ['functions/src/schedulers/messagingSessionCleanup.ts', '(err as Error).message'],
	    ['functions/src/schedulers/messagingSessionCleanup.ts', '(sendErr as Error).message'],
	    ['functions/src/schedulers/messagingSessionCleanup.ts', 'sessionId: doc.id,'],
	    ['functions/src/schedulers/messagingSessionCleanup.ts', 'File may already be deleted'],
	    ['functions/src/schedulers/messagingSessionCleanup.ts', 'uploadId: upload.id'],
	    ['functions/src/schedulers/messagingSessionCleanup.ts', 'storagePath: upload.storagePath'],
    ['functions/src/messaging/messagingEngine.ts', 'message: error.message'],
    ['functions/src/messaging/messagingEngine.ts', "logger.warn('[Messaging] Rate limited, skipping', { eventType, storeId })"],
    ['functions/src/messaging/messagingEngine.ts', "logger.warn('[Messaging] No recipient email for store', { storeId, tenantId, eventType })"],
    ['functions/src/messaging/messagingEngine.ts', "logger.info('[Messaging] Duplicate detected, skipping', { eventType, referenceId })"],
    ['functions/src/messaging/messagingEngine.ts', "logger.error('[Messaging] Failed to log message', {\n      storeId: log.storeId,"],
    ['functions/src/messaging/messagingEngine.ts', "logger.error('[Messaging] Renewal reminder failed for subscription', {\n          subscriptionId: doc.id,"],
    ['functions/src/messaging/messagingEngine.ts', "logger.error('[Messaging] Suspension warning failed for subscription', {\n          subscriptionId: doc.id,"],
    ['functions/src/messaging/messagingEngine.ts', 'errorName: error.name'],
    ['functions/src/messaging/messagingEngine.ts', 'errorCode: (error as any).code'],
    ['functions/src/messaging/messagingEngine.ts', 'errorStatus: (error as any).status || (error as any).statusCode'],
    ['functions/src/triggers/messaging.ts', 'error: error.message'],
    ['functions/src/triggers/messaging.ts', 'error.message'],
    ['functions/src/schedulers/aiProviderHealth.ts', 'function compactError'],
    ['functions/src/schedulers/aiProviderHealth.ts', 'error.message.slice'],
    ['functions/src/schedulers/aiProviderHealth.ts', "String(error || 'Unknown provider error')"],
    ['functions/src/schedulers/aiProviderHealth.ts', 'Gemini provider health check failed:'],
    ['functions/src/schedulers/aiProviderHealth.ts', 'error: message'],
    ['functions/src/schedulers/aiProviderHealth.ts', '.set(details, { merge: true })'],
    ['functions/src/schedulers/aiProviderHealth.ts', '}, { merge: true }).catch'],
    ['functions/src/schedulers/menulistMaintenanceScheduler.ts', 'error instanceof Error ? error.message'],
    ['functions/src/schedulers/menulistMaintenanceScheduler.ts', 'String(error ||'],
    ['functions/src/schedulers/menulistMaintenanceScheduler.ts', 'Task ${task.name} failed:'],
    ['functions/src/schedulers/menulistMaintenanceScheduler.ts', 'error: message'],
    ['functions/src/schedulers/menulistMaintenanceScheduler.ts', 'error: errorMessage'],
    ['functions/src/schedulers/menulistMaintenanceScheduler.ts', 'errorMessage(error)'],
    ['functions/src/schedulers/menulistMaintenanceScheduler.ts', 'metadata: { alertId: doc.id, storeId: alert.sId, tenantId: alert.tId }'],
    ['functions/src/schedulers/menulistMaintenanceScheduler.ts', 'alertId: doc.id,\n                storeId: alert.sId,\n                tenantId: alert.tId,'],
  ].forEach(([relPath, rawPattern]) => {
    assert(!read(relPath).includes(rawPattern), `${relPath} must not expose raw messaging onboarding/provider failure text via ${rawPattern}`);
  });
  [
    ['src/components/templates/main-app/platform/schedulerMonitor/index.tsx', '[SchedulerMonitor] Failed to load data:'],
    ['src/components/templates/main-app/platform/schedulerMonitor/index.tsx', 'Nightly recovery failed: ${error.message}'],
    ['src/components/templates/main-app/platform/schedulerMonitor/index.tsx', 'JSON.stringify(err.details)'],
    ['src/components/templates/main-app/platform/schedulerMonitor/index.tsx', 'JSON.stringify(v)'],
    ['src/components/templates/main-app/platform/schedulerMonitor/index.tsx', 'task.error || flattenDetails(task.details)'],
    ['src/components/templates/main-app/platform/schedulerMonitor/index.tsx', '>{task.error}</Text>'],
    ['src/components/templates/main-app/platform/schedulerMonitor/index.tsx', "state.error || 'failed'"],
    ['src/components/templates/main-app/platform/schedulerMonitor/index.tsx', ' — {err.error}'],
    ['src/components/templates/main-app/platform/schedulerMonitor/index.tsx', 'Error: {err.error}'],
    ['src/components/templates/main-app/platform/opsControlRoom/index.tsx', 'Force republish failed: ${error.message}'],
    ['src/components/templates/main-app/platform/platformNotificationMonitor/index.tsx', 'data?.error ||'],
    ['src/components/templates/main-app/platform/platformNotificationMonitor/index.tsx', 'result?.error ||'],
    ['src/components/templates/main-app/platform/platformNotificationMonitor/index.tsx', 'error?.message'],
    ['src/components/templates/main-app/platform/ownerNotificationMonitor/index.tsx', 'data?.error ||'],
    ['src/components/templates/main-app/platform/ownerNotificationMonitor/index.tsx', 'result?.error ||'],
    ['src/components/templates/main-app/platform/ownerNotificationMonitor/index.tsx', 'error?.message'],
    ['src/components/templates/main-app/platform/ownerNotificationMonitor/index.tsx', '>{record.error || metadataText(record)}</Text>'],
    ['src/components/templates/main-app/platform/ownerNotificationMonitor/index.tsx', '>{value || \'-\'}</Text>'],
    ['src/components/templates/main-app/platform/ownerNotificationMonitor/index.tsx', '>{selectedEvent.error || \'-\'}</Descriptions.Item>'],
    ['src/components/templates/main-app/platform/ownerBusinessAssistantMonitor/index.tsx', 'payload?.error ||'],
    ['src/components/templates/main-app/platform/ownerBusinessAssistantMonitor/index.tsx', 'error.message'],
    ['src/components/templates/main-app/platform/costPosture/index.tsx', 'error.message'],
    ['src/components/templates/main-app/platform/messagingOnboardingMonitor/index.tsx', 'record.error?.message'],
    ['src/lib/messaging/index.ts', 'verifyErr'],
    ['src/lib/messaging/index.ts', 'SMTP verify failed:'],
    ['src/lib/messaging/index.ts', 'verifyErr.message'],
    ['src/lib/messaging/index.ts', 'result.error ||'],
    ['src/lib/messaging/index.ts', 'catch { /* non-blocking */ }'],
    ['src/lib/messaging/index.ts', 'logging failure is non-blocking'],
    ['src/lib/messaging/index.ts', "process.env.SMTP_PORT || '587'"],
    ['src/lib/messaging/index.ts', 'parseInt(process.env.SMTP_PORT'],
    ['src/lib/messaging/index.ts', 'return false; // On error, allow the send (fail-open)'],
    ['src/lib/messaging/index.ts', 'return false; // Fail-open'],
    ['src/lib/notifications/index.ts', 'Unknown SMTP error'],
    ['src/lib/notifications/index.ts', 'result.error ||'],
    ['src/lib/notifications/index.ts', "process.env.SMTP_PORT || '587'"],
    ['src/lib/notifications/index.ts', 'parseInt(process.env.SMTP_PORT'],
    ['src/lib/notifications/index.ts', 'return false; // On error, allow the send (fail-open)'],
    ['src/lib/notifications/index.ts', 'return false; // Fail-open'],
    ['src/lib/notifications/index.ts', "secureError('[Notification] Duplicate check failed'"],
    ['src/lib/notifications/index.ts', "secureError('[Notification] Rate-limit check failed'"],
    ['src/lib/notifications/index.ts', "secureError('[Notification] Log write failed'"],
    ['src/lib/notifications/index.ts', "secureError(\n                '[Notification] No log target available'"],
    ['src/app/api/notifications/send/route.ts', "key: `notification-send:${userId || 'unknown'}`"],
    ['src/lib/notifications/notificationService.ts', "import { logger }"],
    ['src/lib/notifications/notificationService.ts', "logger.warn('Legacy notification service call blocked'"],
    ['src/lib/owner-notifications/index.ts', 'error instanceof Error ? error.message'],
    ['src/lib/owner-notifications/index.ts', 'params.result?.error ||'],
    ['src/lib/owner-notifications/index.ts', "secureError('[OwnerNotifications] Unknown trigger'"],
    ['src/lib/owner-notifications/index.ts', "secureError('[OwnerNotifications] Firestore target unavailable'"],
    ['src/lib/owner-notifications/index.ts', "secureError('[OwnerNotifications] Processing failed'"],
    ['src/lib/owner-notifications/channels/email.ts', 'Unknown SMTP error'],
    ['src/lib/owner-notifications/channels/email.ts', 'error instanceof Error ? error.message'],
    ['src/lib/owner-notifications/channels/email.ts', "process.env.SMTP_PORT || '587'"],
    ['src/lib/owner-notifications/channels/email.ts', 'parseInt(process.env.SMTP_PORT'],
    ['src/lib/owner-notifications/channels/whatsapp.ts', 'WhatsApp send failed:'],
    ['src/lib/owner-notifications/channels/whatsapp.ts', 'response.text()'],
    ['src/lib/owner-notifications/channels/whatsapp.ts', 'const responseText'],
	    ['src/lib/owner-notifications/channels/whatsapp.ts', 'responseText.slice'],
	    ['src/lib/owner-notifications/channels/whatsapp.ts', 'Unknown WhatsApp error'],
	    ['src/lib/owner-notifications/channels/whatsapp.ts', 'error instanceof Error ? error.message'],
	    ['src/lib/owner-notifications/channels/whatsapp.ts', 'response.json().catch(() => null)'],
	    ['src/lib/owner-notifications/channels/whatsapp.ts', 'readJsonResponseWithLimit(response, OWNER_NOTIFICATION_WHATSAPP_RESPONSE_JSON_MAX_BYTES).catch(() => null)'],
	    ['functions/src/ownerNotifications/processor.ts', 'WhatsApp send failed:'],
	    ['functions/src/ownerNotifications/processor.ts', 'response.text()'],
	    ['functions/src/ownerNotifications/processor.ts', 'const responseText'],
	    ['functions/src/ownerNotifications/processor.ts', 'responseText.slice'],
	    ['functions/src/ownerNotifications/processor.ts', 'unknown_whatsapp_error'],
	    ['functions/src/ownerNotifications/processor.ts', 'response.json().catch(() => null)'],
	    ['functions/src/ownerNotifications/processor.ts', 'readJsonResponseWithLimit(response, OWNER_NOTIFICATION_WHATSAPP_RESPONSE_JSON_MAX_BYTES).catch(() => null)'],
	    ['functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts', 'metaResponse.json()'],
	    ['functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts', 'readJsonResponseWithLimit<{ url?: unknown }>(metaResponse, WHATSAPP_PROVIDER_JSON_MAX_BYTES).catch(() => null)'],
    ['functions/src/ownerNotifications/processor.ts', 'error: alertError instanceof Error ? alertError.message : String(alertError)'],
    ['functions/src/ownerNotifications/processor.ts', 'error: error instanceof Error ? error.message : String(error)'],
    ['functions/src/ownerNotifications/processor.ts', "error: error instanceof Error ? error.message : 'unknown_error'"],
    ['src/components/mobile/screens/MobileSchedulerMonitorScreen.tsx', 'error?.message'],
    ['src/components/mobile/screens/MobileSchedulerMonitorScreen.tsx', 'runLogId ? ` · ${runLogId}`'],
    ['src/components/mobile/screens/MobileSchedulerMonitorScreen.tsx', 'JSON.stringify(value)'],
    ['src/components/mobile/screens/MobileSchedulerMonitorScreen.tsx', 'task.error || Object.entries'],
    ['src/components/mobile/screens/MobileDomainSettingsScreen.tsx', 'JSON.stringify(domainStatus.config)'],
    ['src/components/mobile/screens/MobileDomainSettingsScreen.tsx', "await fetch('/api/domain', { method: 'DELETE' });\n            setStoreDetails({ ...storeDetails, customDomain: undefined, domainVerified: undefined });"],
    ['src/components/mobile/screens/MobileOpsControlRoomScreen.tsx', 'error?.message'],
    ['src/components/mobile/screens/MobilePosSyncScreen.tsx', 'message: data.error'],
    ['src/components/mobile/screens/MobileSpecialMenuScreen.tsx', 'catch {'],
    ['src/components/mobile/components/MobileProjectSelectorSheet.tsx', "} catch {\n            Toast.show({ content: 'Could not translate project public content.'"],
    ['src/database/ops/index.ts', '[OpsDAL] Failed to get system state:'],
    ['src/database/ops/index.ts', '[OpsDAL] Failed to get adoption pulse:'],
    ['src/database/ops/index.ts', '[OpsDAL] Failed to get integrity signals:'],
    ['src/database/ops/index.ts', '[OpsDAL] Failed to get recent alerts:'],
    ['src/database/ops/scheduler.ts', '[SchedulerDAL] Failed to get run history:'],
    ['src/database/ops/scheduler.ts', '[SchedulerDAL] Failed to get health summary:'],
    ['src/database/ops/scheduler.ts', '[SchedulerDAL] Failed to get run details:'],
    ['src/database/ops/scheduler.ts', '[SchedulerDAL] Failed to get settlement summary:'],
    ['src/lib/ops/alerts.ts', '[createAlert] Failed:'],
    ['src/lib/pricing/molLogger.ts', 'secureLog("[MOL] Event logged"'],
    ['src/lib/pricing/molLogger.ts', 'secureError("[MOL] Failed to log event"'],
    ['src/lib/pricing/integrityEngine.ts', 'secureLog("[Pricing Integrity] Price updated successfully"'],
    ['src/lib/pricing/integrityEngine.ts', 'secureError("[Pricing Integrity] Failed to update price"'],
    ['src/lib/pricing/integrityEngine.ts', 'secureLog("[Pricing Integrity] PDF marked as fresh"'],
    ['src/lib/pricing/integrityEngine.ts', 'secureLog("[Pricing Integrity] PDF marked as failed"'],
    ['src/lib/pricing/integrityEngine.ts', '"pricingIntegrity.pdf.lastFailureReason": error'],
    ['functions/src/triggers/operations.ts', "logger.error('[BudgetAlert] Error processing webhook:', error)"],
    ['functions/src/triggers/operations.ts', "logger.info('[backfillStoresSummary] Started by user:', request.auth?.uid)"],
    ['functions/src/triggers/operations.ts', 'Verification failed: '],
    ['functions/src/triggers/operations.ts', 'Force republish failed: '],
    ['functions/src/triggers/operations.ts', 'Backfill failed: '],
    ['functions/src/triggers/operations.ts', 'error: error.message'],
    ['functions/src/triggers/operations.ts', '}).catch(() => { /* non-blocking */ });'],
    ['functions/src/triggers/operations.ts', '} catch { /* non-blocking */ }'],
    ['functions/src/triggers/operations.ts', "process.env.NEXT_PUBLIC_APP_URL || 'https://app.menulist.online'"],
    ['functions/src/triggers/operations.ts', "return 'menulist.online'"],
    ['functions/src/triggers/operations.ts', "verification: 'skipped'"],
    ['functions/src/schedulers/masterScheduler.ts', '} catch { /* non-blocking */ }'],
    ['functions/src/decisionBlocksScoring.ts', '} catch { /* non-blocking */ }'],
    ['functions/src/decisionBlocksScoring.ts', 'Non-blocking — enrichment failure should never block scoring'],
  ].forEach(([relPath, rawDiagnostic]) => {
    assert(!read(relPath).includes(rawDiagnostic), `${relPath} must not keep old raw diagnostic string ${rawDiagnostic}`);
  });

  assertOrder(
    'src/lib/messaging/index.ts',
    [
      'lifecycle_message_duplicate_check_failed',
      'return true;',
      'lifecycle_message_rate_limit_check_failed',
      'return true;',
    ],
    'Lifecycle messaging duplicate/rate-limit failures fail closed',
  );

  assertOrder(
    'src/lib/notifications/index.ts',
    [
      'notification_rate_limit_check_failed',
      'return true;',
      'const claim = await claimNotificationDelivery({',
      'if (!claim.claimed) return false;',
    ],
    'Notification claim/rate-limit failures fail closed',
  );

  assertIncludes(
    'src/lib/pricing/pricingDiagnostics.ts',
    [
      'getBoundedPricingStringContext',
      'logPricingDiagnostic',
      'logPricingFailure',
      'sourceErrorName',
      'sourceErrorCode',
      'sourceStatusCode',
    ],
    'pricing diagnostics helper',
  );
  [
    ['src/lib/pricing/molLogger.ts', [
      'pricing_mol_event_logged',
      'pricing_mol_event_log_failed',
      'logPricingDiagnostic',
      'logPricingFailure',
      "getBoundedPricingStringContext(\"projectId\", params.projectId)",
    ]],
    ['src/lib/pricing/integrityEngine.ts', [
      'PRICING_PDF_FAILURE_REASON_FALLBACK',
      'PRICING_PDF_FAILURE_REASON_PATTERN',
      'function normalizePricingPdfFailureReason(reason: string): string',
      'pricing_integrity_price_update_succeeded',
      'pricing_integrity_price_update_failed',
      'pricing_integrity_pdf_marked_fresh',
      'pricing_integrity_pdf_marked_failed',
      'const failureReason = normalizePricingPdfFailureReason(error);',
      '"pricingIntegrity.pdf.lastFailureReason": failureReason',
      'failureReason,',
      'logPricingDiagnostic',
      'logPricingFailure',
      "getBoundedPricingStringContext(\"projectId\", projectId)",
      "getBoundedPricingStringContext(\"itemId\", itemId)",
      "getBoundedPricingStringContext(\"userId\", actorUserId)",
      "getBoundedPricingStringContext(\"failureReason\", error)",
    ]],
    ['src/lib/pricing/pdfQueue.ts', [
      'pricing_pdf_regen_disabled',
      'logPricingDiagnostic',
      "getBoundedPricingStringContext(\"projectId\", params.projectId)",
    ]],
  ].forEach(([relPath, required]) => {
    assertIncludes(relPath, required, `${relPath} bounded pricing diagnostics`);
  });
  assert(!read('src/lib/pricing/pdfQueue.ts').includes('secureLog("[PDF Queue]'), 'pricing PDF queue must not use raw secureLog breadcrumbs');

  const runtimeDiagnosticRoutes = [
    [
      'src/app/api/reviews/states/route.ts',
      'reviews_states_fetch_failed',
      [
        'const userRateLimitHash = hashPublicRateLimitValue(userId);',
        'const tenantRateLimitHash = hashPublicRateLimitValue(tenantDocumentId);',
        'const storeRateLimitHash = hashPublicRateLimitValue(storeDocumentId);',
        'key: `review-states:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`',
        'getBoundedRuntimeStringContext("tenantId", tenantId)',
        'getBoundedRuntimeStringContext("storeId", storeId)',
        'getBoundedRuntimeStringContext("userId", userId)',
      ],
    ],
    [
      'src/app/api/store/temp-status/route.ts',
      'store_temp_status_update_failed',
      [
        'getBoundedRuntimeStringContext("tenantId", tenantId)',
        'getBoundedRuntimeStringContext("storeId", storeId)',
        'getBoundedRuntimeStringContext("userId", userId || session.user?.id)',
        'getBoundedRuntimeStringContext(',
      ],
    ],
    [
      'src/app/api/ai-packs/status/route.ts',
      'ai_packs_status_check_failed',
      [
        'logRuntimeFailure',
        'getBoundedRuntimeStringContext("userId", session?.uId || session?.user?.id)',
        'getBoundedRuntimeStringContext("tenantId", session?.user?.tenantId || session?.tId)',
        'getBoundedRuntimeStringContext("storeId", session?.user?.storeId || session?.sId)',
        'getBoundedRuntimeStringContext("requestPath", request.nextUrl.pathname)',
      ],
    ],
  ];

  runtimeDiagnosticRoutes.forEach(([relPath, failureCode, tokens]) => {
    const route = read(relPath);
    assertIncludes(
      relPath,
      ['logRuntimeFailure', failureCode, ...tokens],
      `${relPath} bounded runtime diagnostics`,
    );
    assert(!route.includes('secureError('), `${relPath} must not pass raw route failures to secureError`);
    assert(!route.includes('console.error'), `${relPath} must use secure logging`);
  });

  const reviewsStatesRoute = read('src/app/api/reviews/states/route.ts');
  const reputationGuard = read('src/components/templates/main-app/reviews/ReputationGuard.tsx');
  const reputationStateResponse = read('src/lib/reviews/reputationStateResponse.ts');
  assertIncludes(
    'src/app/api/reviews/states/route.ts',
    [
      'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
      'type ReviewsSessionDocumentId = {',
      'function normalizeReviewsSessionDocumentId(value: unknown): ReviewsSessionDocumentId | null',
      'function getReviewsSessionScope(session: any): {',
      'const scope = getReviewsSessionScope(session);',
      'const { tenantId, storeId, tenantDocumentId, storeDocumentId } = scope;',
      'const userId = session.uId || session.user?.id || "unknown";',
      '.where("tId", "==", tenantId)',
      '.where("sId", "==", storeId)',
    ],
    'reviews states session document ID boundary',
  );
  assertOrder(
    'src/app/api/reviews/states/route.ts',
    [
      'const scope = getReviewsSessionScope(session);',
      'const { tenantId, storeId, tenantDocumentId, storeDocumentId } = scope;',
      'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      'const rateLimit = await checkRateLimit({',
      '.collection(DB_COLLECTIONS.REVIEWS_STATE)',
      '.where("tId", "==", tenantId)',
      '.where("sId", "==", storeId)',
    ],
    'reviews states normalized scope, limiter, and query ordering',
  );
  assert(!reviewsStatesRoute.includes('key: `review-states:${session.uId}:${tenantId}:${storeId}`'), 'reviews states must not store raw user/tenant/store IDs in rate-limit keys');
  assert(!reviewsStatesRoute.includes('const { tId: tenantId, sId: storeId } = session'), 'reviews states must not use raw session tenant/store destructuring');
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'Review States session document-ID boundary checkpoint',
      '`GET /api/reviews/states` validates session tenant/store IDs',
      'preserves the original numeric/string session values for the `reviewsState` equality filters',
      '`npm run verify:menulist-api-tenant-safety` source-gates the review-state session scope helper',
    ],
    'production audit review states session document ID boundary evidence',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Review States Session Document ID Boundary',
      '`GET /api/reviews/states` validates session tenant/store IDs with the shared Firestore document-ID guard',
      'preserves the original numeric/string session values for existing `reviewsState` equality filters',
      '`npm run verify:menulist-api-tenant-safety` now guards the review-state session scope helper',
    ],
    'primary changelog review states session document ID boundary entry',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Review States Session Document ID Boundary',
      '`GET /api/reviews/states` validates session tenant/store IDs with the shared Firestore document-ID guard',
      'preserves the original numeric/string session values for existing `reviewsState` equality filters',
      '`npm run verify:menulist-api-tenant-safety` now guards the review-state session scope helper',
    ],
    'mirrored changelog review states session document ID boundary entry',
  );
  [
    'REPUTATION_STATE_RESPONSE_JSON_MAX_BYTES = 16 * 1024',
    'isReputationStateResponse',
    "typeof value.data.hasBlockActive === 'boolean'",
    "typeof value.data.hasEscalationActive === 'boolean'",
  ].forEach((token) => {
    assert(reputationStateResponse.includes(token), `review state response guard missing ${token}`);
  });
	  [
	    'REPUTATION_STATE_REQUEST_POLICY',
	    "cache: 'no-store'",
	    "credentials: 'same-origin'",
	    "redirect: 'manual'",
	    "fetch('/api/reviews/states', REPUTATION_STATE_REQUEST_POLICY)",
	    'readJsonResponseWithLimit<unknown>',
    'reputation_guard_state_response_rejected',
    'reputation_guard_state_response_parse_failed',
    'reputation_guard_state_response_invalid',
    'reputation_guard_state_request_failed',
    'getBoundedRuntimeStringContext',
  ].forEach((token) => {
    assert(reputationGuard.includes(token), `ReputationGuard bounded state response diagnostics missing ${token}`);
  });
  assert(!reputationGuard.includes('const data = await res.json()'), 'ReputationGuard must not use direct unbounded response parsing');
  assert(!reputationGuard.includes('.json().catch'), 'ReputationGuard must not silently swallow response parsing failures');

  assertIncludes(
    'src/app/api/reviews/suggest/route.ts',
    [
	      'const userRateLimitHash = hashPublicRateLimitValue(session.uId);',
	      'key: `review-suggest:${userRateLimitHash}`',
	      'readBoundedJsonBody(request, REVIEW_SUGGEST_MAX_BODY_BYTES)',
	      'const REVIEW_PROMPT_TEXT_MAX_LENGTH = 2000;',
	      'const REVIEW_BUSINESS_TYPE_MAX_LENGTH = 80;',
	      'businessType: z.string().max(REVIEW_BUSINESS_TYPE_MAX_LENGTH).optional()',
	      'function sanitizeReviewPromptText(',
	      'const promptReviewText = sanitizeReviewPromptText(reviewText, REVIEW_PROMPT_TEXT_MAX_LENGTH);',
	      'JSON.stringify(promptReviewText)',
	      'requireAnyStorePermission(',
	      '[PERMISSIONS.MANAGE_FEEDBACK]',
	      'checkAICapacity(session.tId, session.sId, ACTION)',
	    ],
	    'review suggest hashed limiter, feedback permission, and bounded AI body guard',
	  );
	  assertOrder(
	    'src/app/api/reviews/suggest/route.ts',
	    [
	      'const bodyResult = await readBoundedJsonBody(request, REVIEW_SUGGEST_MAX_BODY_BYTES)',
	      'const validation = SuggestSchema.safeParse(bodyResult.data);',
	      'const permissionError = await requireAnyStorePermission(',
	      'if (permissionError) return permissionError;',
	      'const capacityCheck = await checkAICapacity(session.tId, session.sId, ACTION);',
	    ],
	    'review suggest must validate input and permission before AI capacity/provider work',
	  );
	  assert(!read('src/app/api/reviews/suggest/route.ts').includes('key: `review-suggest:${session.uId}`'), 'review suggest must not store raw user IDs in rate-limit keys');
	  assert(!read('src/app/api/reviews/suggest/route.ts').includes('reviewText.slice(0, 2000)'), 'review suggest must not inject raw review text into the prompt');
}

function verifyPublicOperationalSignalCheapFail() {
  assertOrder(
    'src/app/api/csp-report/route.ts',
    [
      "getRateLimitForFeature('CSP_REPORT')",
      'const ipHash = hashPublicRateLimitValue(getClientIp(request));',
      'key: `csp-report:${ipHash}`',
      'readBoundedTextBody(request, CSP_REPORT_MAX_BYTES',
      'let report: unknown;',
      'report = JSON.parse(body);',
      'const normalizedReport = normalizeCspViolationReport(report);',
      "logSecurityFailure('csp_report_processing_failed'",
    ],
    'CSP report public endpoint cheap-fail ordering',
  );
  assert(!read('src/app/api/csp-report/route.ts').includes('request.text()'), 'CSP report must not parse unbounded text bodies');
  assert(!read('src/app/api/csp-report/route.ts').includes("logger.error('Failed to process CSP report'"), 'CSP report must not raw-log route failures');
  assert(!read('src/app/api/csp-report/route.ts').includes("logger.security('CSP Violation Detected', violation"), 'CSP report must not log raw violation payloads');
  assertIncludes(
    'src/app/api/csp-report/route.ts',
    [
      'const getCspViolationLogContext = (violation: CSPViolationLogDetails) => ({',
      'blockedUriKind: getBlockedUriKind(violation.blockedUri)',
      'directiveCategory: getDirectiveCategory(violation.violatedDirective)',
      "getBoundedSecurityStringContext('blockedUri', violation.blockedUri)",
      "getBoundedSecurityStringContext('sourceFile', violation.sourceFile)",
      "getBoundedSecurityStringContext('userAgent', violation.userAgent)",
      "logger.security('CSP Violation Detected', getCspViolationLogContext(violation), severity)",
      "logSecurityDiagnostic(\n                    'csp_report_json_parse_failed'",
      "fallbackPolicy: 'ignore_malformed_report'",
      'const MAX_CSP_REPORT_JSON_PARSE_DIAGNOSTICS = 25;',
      'reportedCspReportJsonParseFailures',
      'bodyShapeKind: getBodyShapeKind(trimmedBody)',
      "getBoundedSecurityStringContext('contentType', request.headers.get('content-type'))",
      "getBoundedSecurityStringContext('reportUrl', request.headers.get('referer'))",
      "getBoundedSecurityStringContext('requestUrl', request.url)",
      "getBoundedSecurityStringContext('requestIpHash', hashPublicRateLimitValue(getClientIp(request)))",
      'determineCspViolationSeverity(violation)',
      'normalizeCspViolationReport(report)',
    ],
    'CSP report bounded failure diagnostics',
  );
  assertIncludes(
    'src/lib/security/cspReport.ts',
    [
      'export const normalizeCspViolationReport = (value: unknown)',
      "const report = value['csp-report'];",
      'if (!isRecord(report)) return null;',
      "directive.includes('script-src') && /^https?:\\/\\//.test(blockedUri)",
    ],
    'CSP report exact envelope and severity boundary',
  );
  assert(!read('src/app/api/csp-report/route.ts').includes('determineCSPSeverity(violation: any)'), 'CSP report severity must not accept an untyped report');
  assert(!read('src/lib/security/cspReport.ts').includes("blockedUri.includes('google')"), 'CSP report severity must not trust a host-name substring');
  assert(!read('src/app/api/csp-report/route.ts').includes('JSON.parse(body);\n        } catch {\n            return new Response(null, { status: 204 });'), 'CSP report must not silently drop malformed JSON reports without diagnostics');
  assert(!read('src/app/api/csp-report/route.ts').includes('body.slice'), 'CSP report malformed JSON diagnostics must not log raw body previews');
  assert(!read('src/app/api/csp-report/route.ts').includes("getBoundedSecurityStringContext('requestIp', getClientIp(request))"), 'CSP report must not log raw request IPs');
  assertIncludes(
    '__docs__/security/csp/complete-guide.md',
    [
      'logs malformed JSON envelopes as capped `csp_report_json_parse_failed` diagnostics',
      'returning the same non-blocking 204 response',
    ],
    'CSP security guide malformed JSON diagnostics docs parity',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'CSP report malformed JSON diagnostics checkpoint: fixed.',
      '`npm run verify:menulist-api-tenant-safety` source-gates the diagnostic code, capped guard, fallback policy, CSP docs parity, and raw body preview exclusion.',
    ],
    'Production readiness audit CSP malformed JSON diagnostics docs parity',
  );

  assertOrder(
    'src/app/api/screen/seen/route.ts',
    [
      'const SCREEN_SEEN_MAX_BODY_BYTES = 1024;',
      'rejectInvalidOrOversizedDeclaredBody(request, SCREEN_SEEN_MAX_BODY_BYTES',
      "getRateLimitForFeature('SCREEN_SEEN_SIGNAL')",
      'const ipHash = hashPublicRateLimitValue(getClientIp(request));',
      'key: `screen-seen:ip:${ipHash}`',
      'readBoundedJsonBody(request, SCREEN_SEEN_MAX_BODY_BYTES',
      'const screenTokenHash = hashPublicRateLimitValue(token);',
      'key: `screen-seen:token:${storeHashSegment}:${screenTokenHash}`',
      'const commitResult = await commitCurrentScreenSeen({',
      "logScreenDisplayFailure('screen_seen_route_failed'",
    ],
    'screen seen public endpoint cheap-fail ordering',
  );
  assert(!read('src/app/api/screen/seen/route.ts').includes('request.json()'), 'screen seen must not parse unbounded JSON');
  assert(!read('src/app/api/screen/seen/route.ts').includes("logger.error('[Screen Seen] Error', error)"), 'screen seen must not raw-log route failures');
  assert(!read('src/app/api/screen/seen/route.ts').includes('storeId: normalizedStoreId || undefined'), 'screen seen success diagnostics must not log raw store IDs');
  assert(!read('src/app/api/screen/seen/route.ts').includes("key: `screen-seen:token:${normalizedStoreId || 'legacy'}:${token}`"), 'screen seen must not store raw screen token in rate-limit keys');
  assert(!read('src/app/api/screen/seen/route.ts').includes('key: `screen-seen:ip:${getClientIp(request)}`'), 'screen seen must not store raw IP in rate-limit keys');
  assert(!/if \(!tokenRateLimit\.allowed\) \{\s+return cachedSeenResponse\(\);\s+\}/.test(read('src/app/api/screen/seen/route.ts')), 'screen seen token limiter must not acknowledge an unverified liveness write');
  assert(!/if \(!ipRateLimit\.allowed\) \{\s+return cachedSeenResponse\(\);\s+\}/.test(read('src/app/api/screen/seen/route.ts')), 'screen seen IP limiter must not create an unverified browser daily marker');

  assertIncludes(
    'src/app/api/screen/seen/route.ts',
    [
      'SCREEN_TOKEN_PATTERN',
      'STORE_ID_PATTERN',
      'rateLimitedSeenResponse',
      "status: 429",
      "'Retry-After': String(TOKEN_RATE_LIMIT_WINDOW_SECONDS)",
      'firestoreAdmin.runTransaction',
      'transaction.get(params.screenRef)',
      'transaction.get(storeRef)',
      'transaction.get(tenantRef)',
      'screen?.screenToken !== params.token',
      'screen?.enabled !== true',
      'isCurrentScreenSeenPublicScope({',
      "summaryRef.where('screen.screenToken', '==', token).limit(2).get()",
      'resolveUniqueLegacyScreenSeenStoreId(',
      'storeId: targetStoreId',
      'transaction.update(params.screenRef',
      "'screen.screenLastSeenAt': FieldValue.serverTimestamp()",
      "getBoundedScreenStringContext('screenToken', token)",
      "getBoundedScreenStringContext('storeId', normalizedStoreId)",
    ],
    'screen seen token/store guard',
  );
  assertIncludes(
    'src/lib/screen/screenSeenScope.ts',
    [
      'CAMPAIGNS_SUMMARY_ID_PATTERN',
      'if (summaryDocumentIds.length !== 1) return null;',
      'normalizeStorePermissionScopeDocumentId(match[1])',
    ],
    'screen seen legacy candidate uniqueness',
  );
  assertOrder(
    'src/app/api/screen/seen/route.ts',
    [
      'transaction.get(params.screenRef)',
      'transaction.get(storeRef)',
      'transaction.get(tenantRef)',
      'isCurrentScreenSeenPublicScope({',
      'transaction.update(params.screenRef',
    ],
    'screen seen transaction must recheck current authority before its liveness write',
  );
}

function verifyReviewsReputationDormantBoundary() {
  const features = read('src/config/features.ts');
  const reviewsStatesRoute = read('src/app/api/reviews/states/route.ts');
  const reviewsSuggestRoute = read('src/app/api/reviews/suggest/route.ts');
  const reputationGuard = read('src/components/templates/main-app/reviews/ReputationGuard.tsx');
  const reviewReplyTool = read('src/components/templates/main-app/reviews/ReviewReplyTool.tsx');
  const readinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const reviewsValidation = read('__docs__/reviews-reputation/reviews-reputation_validation.md');

  assert(features.includes('ENABLE_REVIEWS_REPUTATION: false'), 'Reviews/Reputation parent flag must remain disabled until GBP ingestion exists');
  assert(features.includes('ENABLE_AI_REPLY_ASSIST: false'), 'AI reply assist flag must remain disabled until Reviews/Reputation is intentionally enabled');
  assertOrder(
    'src/config/features.ts',
    [
      'ENABLE_REVIEWS_REPUTATION: false',
      'ENABLE_AI_REPLY_ASSIST: false',
    ],
    'review reply assist flag must remain subordinate to Reviews/Reputation',
  );

  assert(reviewsStatesRoute.includes('if (!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION) {'), 'review states route must 404 while Reviews/Reputation is disabled');
  assert(reviewsStatesRoute.includes('return NextResponse.json({ error: "Feature disabled" }, { status: 404 });'), 'review states route must use disabled 404 response');
  assert(reviewsSuggestRoute.includes('if (!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION || !FEATURE_FLAGS.ENABLE_AI_REPLY_ASSIST) {'), 'review suggest route must require parent and child feature flags');
  assert(reviewsSuggestRoute.includes("return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });"), 'review suggest route must use disabled 404 response');
  assert(reputationGuard.includes('if (!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION) return null;'), 'ReputationGuard must stay hidden while Reviews/Reputation is disabled');
  assert(reviewReplyTool.includes('if (!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION || !FEATURE_FLAGS.ENABLE_AI_REPLY_ASSIST) {'), 'ReviewReplyTool must stay hidden unless parent and child flags are enabled');

  const sourceFiles = listFiles('src', (relativePath) => (
    /\.(ts|tsx)$/.test(relativePath)
    && !relativePath.startsWith('src/components/templates/main-app/reviews/')
    && !relativePath.startsWith('src/app/api/reviews/')
  ));
  const dormantReviewImportPattern = /import\s+[\s\S]*\b(?:ReputationGuard|ReviewReplyTool)\b[\s\S]*from\s+['"][^'"]*\/reviews\/(?:ReputationGuard|ReviewReplyTool)['"]/;
  sourceFiles.forEach((relativePath) => {
    assert(!dormantReviewImportPattern.test(read(relativePath)), `${relativePath} must not mount dormant Reviews/Reputation components before GBP ingestion is enabled`);
  });

  assert(readinessAudit.includes('Reviews/Reputation remains disabled until GBP ingestion exists and owner mount points are intentionally added.'), 'production readiness audit must record the Reviews/Reputation GBP ingestion and mount-point blocker');
  assert(reviewsValidation.includes('Historical docs-alignment evidence only; not current implementation or launch approval'), 'Reviews/Reputation validation must remain historical-only');
  assert(reviewsValidation.includes('Implementation remains blocked until GBP API access'), 'Reviews/Reputation validation must preserve GBP API blocker');
  assert(!reviewsValidation.includes('**READY FOR:** Team review, implementation'), 'Reviews/Reputation validation must not use stale ready-for implementation footer');
}

function verifyPaymentWebhookCheapFail() {
  assertIncludes(
    'src/lib/security/boundedRequestBody.ts',
    [
      'export function rejectInvalidOrOversizedDeclaredBody',
      "request.headers.get('content-length')",
      'export async function readBoundedArrayBufferBody',
      'export async function readBoundedFormDataBody',
      'export async function readBoundedTextBody',
      'request.body.getReader()',
      'totalBytes > maxBytes',
      'export async function readBoundedJsonBody',
      'JSON.parse(textResult.body)',
    ],
    'bounded request body helper',
  );

  assertOrder(
    'src/app/api/razorpay/webhook/route.ts',
    [
      'const RAZORPAY_WEBHOOK_MAX_BODY_BYTES = 256 * 1024;',
      'const declaredBodyResponse = rejectInvalidOrOversizedDeclaredBody(',
      "const rateLimitResponse = await checkPublicRateLimit(request, 'WEBHOOK');",
      'const boundedBody = await readBoundedTextBody(',
      'const isSignatureValid = await validateRazorpayWebhookSignature',
    ],
    'Razorpay webhook bounded raw-body helper usage',
  );

  assertOrder(
    'src/app/api/razorpay/webhook/route.ts',
    [
      "const signature = request.headers.get('x-razorpay-signature');",
      'const declaredBodyResponse = rejectInvalidOrOversizedDeclaredBody(',
      "const rateLimitResponse = await checkPublicRateLimit(request, 'WEBHOOK');",
      'const boundedBody = await readBoundedTextBody(',
      'const requestBody = boundedBody.body;',
      'const isSignatureValid = await validateRazorpayWebhookSignature(requestBody, signature, secret);',
      'event = JSON.parse(requestBody);',
      'webhookClaim = await claimRazorpayWebhookEvent({',
    ],
    'Razorpay webhook cheap-fail, signature, and idempotency ordering',
  );

  assertIncludes(
    'src/app/api/razorpay/webhook/route.ts',
    [
      'Razorpay Webhook FAILED',
      'writeProductPaymentTransactionAudit',
      'safeSyncProductSubscriptionEntitlementFromSubscription',
      "getRazorpayFailureLogData('razorpay_webhook_processing_failed', error)",
      "getRazorpayPaymentFailureRemark(event.event)",
      "getRazorpayFailureLogData('razorpay_webhook_payment_failure_event', undefined",
      "getBoundedRazorpayStringContext('storeId', event?.storeId)",
      "getBoundedRazorpayStringContext('providerErrorDescription', paymentEntity?.error_description)",
      "getBoundedRazorpayStringContext('providerErrorReason', paymentEntity?.error_reason)",
      "message: 'Razorpay reported a payment failure. Check bounded payment metadata and the provider dashboard.'",
      "message: 'Webhook processing crashed. Payment state may be inconsistent. See bounded Razorpay webhook diagnostics.'",
    ],
    'Razorpay webhook payment mutation and alert anchors',
  );
  assertIncludes(
    'src/lib/billing/razorpayWebhookLease.ts',
    [
      'DB_COLLECTIONS.RAZORPAY_WEBHOOK_EVENTS',
      "outcome: 'processed' | 'processing'",
      "current.attemptId !== params.attemptId",
      "return 'ownership_lost';",
    ],
    'Razorpay webhook attempt-fenced ledger',
  );
  const webhookRoute = read('src/app/api/razorpay/webhook/route.ts');
  assert(!webhookRoute.includes('errorMessage: error instanceof Error ? error.message'), 'Razorpay webhook must not persist raw exception messages');
  assert(!webhookRoute.includes('Error: ${error instanceof Error ? error.message'), 'Razorpay webhook alert must not include raw exception messages');
  assert(!webhookRoute.includes('Error: ${paymentEntity?.error_description'), 'Razorpay webhook alert must not include raw provider failure messages');
  assert(!webhookRoute.includes('paymentEntity.error_description || paymentEntity.error_reason'), 'Razorpay webhook status remarks must not persist raw provider failure messages');
  assert(!webhookRoute.includes('Payment ${event.event ==='), 'Razorpay webhook alert titles must not embed raw store context');
  assert(!webhookRoute.includes("logger.debug('Unhandled webhook event type'"), 'Razorpay webhook must not debug-log normal unhandled-event breadcrumbs');
  assert(webhookRoute.includes("logType: 'RAZORPAY_WEBHOOK_UNHANDLED_EVENT'"), 'Razorpay webhook keeps durable local audit rows for unhandled events');
}

function verifyPaymentMutationBoundedJson() {
  assertIncludes(
    'src/lib/billing/razorpayDiagnostics.ts',
	    [
	      'getBoundedRazorpayStringContext',
	      'getBoundedRazorpaySecurityContext',
	      'getRazorpayFailureLogData',
	      'getRazorpaySubscriptionMutationLogContext',
	      'logRazorpayNonBlockingFailure',
	      "[Razorpay] Non-blocking operation failed",
	      "getBoundedRazorpayStringContext('userId'",
	      "getBoundedRazorpayStringContext('email'",
	      "getBoundedRazorpayStringContext('ip'",
	      "getBoundedRazorpayStringContext('userAgent'",
	      'sourceErrorName',
	      'sourceErrorCode',
	      'sourceStatusCode',
	    ],
	    'Razorpay bounded diagnostics helper',
	  );

	  const billingAccess = read('src/lib/billing/billingAccess.ts');
	  assertIncludes(
	    'src/lib/billing/billingAccess.ts',
	    [
	      "import { isValidFirestoreDocumentId } from \"@lib/firebase/firestoreDocumentId\";",
	      'export function normalizeBillingMutationScopeDocumentId(value: unknown): BillingMutationScopeDocumentId | null {',
	      'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
	      'const sessionScope = resolveSensitiveSessionStoreScope({',
	      'tenantValues: [session?.tId, session?.user?.tenantId],',
	      'storeValues: [session?.sId, session?.user?.storeId],',
	      'doc(storeScope.documentId)',
	      'isSensitiveStoreRecordInScope({',
	      'getBoundedRazorpaySecurityContext',
	      "getBoundedRazorpayStringContext('billingStoreId', storeId)",
	      "getBoundedRazorpayStringContext('roleId', roleId)",
	    ],
	    'billing mutation authorization bounded security context',
	  );
	  assert(!billingAccess.includes('.doc(String(storeId))'), 'billing mutation authorization must not build store refs from raw session store IDs');
	  assert(!billingAccess.includes('buildSecurityContext'), 'billing mutation authorization must not spread raw security context');
	  assert(!billingAccess.includes('storeId,\n            roleId'), 'billing mutation authorization must not raw-log store or role IDs');

  const subscriptionStateMachine = read('src/lib/billing/subscriptionStateMachine.ts');
  assertIncludes(
    'src/lib/billing/subscriptionStateMachine.ts',
    [
      'getTransitionLogContext',
      "getBoundedRazorpayStringContext('fromStatus', from)",
      "getBoundedRazorpayStringContext('toStatus', to)",
      "getBoundedRazorpayStringContext('transitionContext', context)",
      "logger.warn('[StateMachine] Unknown current state'",
      "logger.warn('[StateMachine] Invalid transition'",
      'allowedTransitionCount: allowedTransitions.length',
    ],
    'subscription state machine bounded diagnostics',
  );
  assert(!subscriptionStateMachine.includes('[StateMachine] Unknown current state:'), 'subscription state machine must not warn with raw current status text');
  assert(!subscriptionStateMachine.includes('[StateMachine] Invalid transition:'), 'subscription state machine must not warn with raw transition text');
  assert(!subscriptionStateMachine.includes('allowedTransitions: allowed'), 'subscription state machine must not log raw allowed transition arrays');

  const subscriptionEntitlementSync = read('src/lib/billing/subscriptionEntitlementSync.ts');
  assertIncludes(
    'src/lib/billing/subscriptionEntitlementSync.ts',
    [
      'getSubscriptionEntitlementLogContext',
      'billing_store_plan_entitlement_sync_failed',
      'getBoundedRazorpayStringContext',
      'getRazorpayFailureLogData',
      'secureError',
    ],
    'MenuList subscription entitlement bounded diagnostics',
  );
  assert(!subscriptionEntitlementSync.includes('logger.error'), 'MenuList subscription entitlement sync must not raw-log failures');
  assert(!subscriptionEntitlementSync.includes('Failed to sync store plan entitlement'), 'MenuList subscription entitlement sync must not use legacy raw failure message');
  assert(!subscriptionEntitlementSync.includes('subscriptionId: subscription.id'), 'MenuList subscription entitlement sync must not log raw subscription IDs');
  assert(!subscriptionEntitlementSync.includes('tenantId: subscription.tenantId'), 'MenuList subscription entitlement sync must not log raw tenant IDs');
  assert(!subscriptionEntitlementSync.includes('storeId: subscription.storeId'), 'MenuList subscription entitlement sync must not log raw store IDs');

  const razorpayPlanHandler = read('src/lib/razorpay/plan-handler.ts');
  assertIncludes(
    'src/lib/razorpay/plan-handler.ts',
    [
      'getRazorpayPlanLogContext',
      'razorpay_plan_lookup_or_create_failed',
      'getBoundedRazorpayStringContext',
      'getRazorpayFailureLogData',
      "throw new Error('Could not process Razorpay plan.')",
    ],
    'Razorpay plan handler bounded diagnostics',
  );
  assert(!razorpayPlanHandler.includes('logger.error'), 'Razorpay plan handler must not raw-log provider failures');
  assert(!razorpayPlanHandler.includes('Failed to find or create Razorpay plan'), 'Razorpay plan handler must not use legacy raw failure message');
  assert(!razorpayPlanHandler.includes('Could not process Razorpay plan:'), 'Razorpay plan handler must not throw raw provider messages');
  assert(!razorpayPlanHandler.includes('providerPlanId: foundPlan.id'), 'Razorpay plan handler must not log raw provider plan IDs');
  assert(!razorpayPlanHandler.includes('planId: newPlan.id'), 'Razorpay plan handler must not log raw provider plan IDs as planId');
  assert(!razorpayPlanHandler.includes('{ lookupKey, price, currency }'), 'Razorpay plan handler must not log raw lookup keys');
  assert(!razorpayPlanHandler.includes("logger.debug('Searching for Razorpay plan'"), 'Razorpay plan handler must not debug-log normal plan lookup breadcrumbs');

  assert(
    !fs.existsSync(path.join(ROOT, 'src/app/api/internal/reconcile-subscriptions/route.ts')),
    'Deprecated Vercel subscription reconciliation route must stay removed; Functions scheduler owns reconciliation.',
  );

  const functionsReconciliation = read('functions/src/billing/reconcileSubscriptions.ts');
  assertIncludes(
    'functions/src/billing/reconcileSubscriptions.ts',
    [
      'BILLING_SUBSCRIPTION_RECONCILIATION_SUBSCRIPTION_FAILED',
      'function getReconciliationStringContext',
      'function getReconciliationErrorContext',
      'getBoundedFunctionsErrorName(error)',
      'getBoundedFunctionsErrorCode(error)',
      'getBoundedFunctionsErrorStatus(error)',
      'function getReconciliationSubscriptionLogContext',
      'function getReconciliationUpdateLogContext',
      'function getTransitionLogContext',
      "getReconciliationStringContext('subscriptionId', sub?.id)",
      "getReconciliationStringContext('fromStatus', from)",
      "getReconciliationStringContext('toStatus', to)",
      "getReconciliationStringContext('transitionContext', context)",
      "functions.logger.warn(\n            '[Reconciliation] Unknown subscription state transition'",
      "functions.logger.warn(\n            '[Reconciliation] Invalid subscription state transition'",
      'failureCode: BILLING_SUBSCRIPTION_RECONCILIATION_SUBSCRIPTION_FAILED',
      'export function normalizeSubscriptionDocumentId',
      'export function normalizeScopeDocumentId',
      'export async function syncStorePlanEntitlement',
      '): Promise<boolean> {',
      'transaction.get(entitledSubscriptionsQuery)',
      ".where('status', 'in', [...PLAN_ENTITLED_SUBSCRIPTION_STATUSES])",
      ".where('cycleEndDate', '>=', Timestamp.now())",
      ".orderBy('cycleEndDate', 'desc')",
      '.orderBy(FieldPath.documentId())',
      'const sub = { ...docSnap.data(), id: docSnap.id }',
      'const currentSnapshot = await transaction.get(docSnap.ref);',
      'transaction.update(docSnap.ref, updates);',
      'updates.statuses = appendBoundedBillingStatusHistory(current.statuses, {',
      'updates.creditsLastResetMonth = billingPeriod;',
    ],
    'Functions subscription reconciliation bounded diagnostics',
  );
  assert(!functionsReconciliation.includes("logger.info('[Reconciliation] Subscription synced', {\n                    subId: sub.id"), 'Functions subscription reconciliation must not info-log raw subscription IDs');
  assert(!functionsReconciliation.includes('updates: Object.keys(updates)'), 'Functions subscription reconciliation must not log raw update key arrays');
  assert(!functionsReconciliation.includes('providerSubId: sub.providerSubscriptionId'), 'Functions subscription reconciliation must not log raw provider subscription IDs');
  assert(!functionsReconciliation.includes('error: subError.message'), 'Functions subscription reconciliation must not log raw subscription errors');
  assert(!functionsReconciliation.includes('sourceErrorName: error.name'), 'Functions subscription reconciliation must bound source error names');
  assert(!functionsReconciliation.includes('sourceErrorCode: (error as any).code'), 'Functions subscription reconciliation must bound source error codes');
  assert(!functionsReconciliation.includes('sourceErrorStatus: (error as any).status || (error as any).statusCode'), 'Functions subscription reconciliation must normalize source error status');
  assert(!functionsReconciliation.includes('[Reconciliation] Unknown state:'), 'Functions subscription reconciliation must not warn with raw current status text');
  assert(!functionsReconciliation.includes('[Reconciliation] Invalid transition:'), 'Functions subscription reconciliation must not warn with raw transition text');
  assert(!functionsReconciliation.includes('const sub = { id: docSnap.id, ...docSnap.data() }'), 'Functions subscription reconciliation must not allow embedded IDs to override Firestore authority');
  assert(!functionsReconciliation.includes("String(sub.providerSubscriptionId || '').trim()"), 'Functions subscription reconciliation must reject whitespace-mutated provider IDs');
  assert(!functionsReconciliation.includes('.doc(sub.id).update(updates)'), 'Functions subscription reconciliation must not update from an embedded subscription ID');

  const functionsCircuitBreaker = read('functions/src/lib/circuitBreaker.ts');
  assertIncludes(
    'functions/src/lib/circuitBreaker.ts',
    [
      'function getCircuitBreakerErrorContext',
      'getBoundedFunctionsErrorName(error)',
      'getBoundedFunctionsErrorCode(error)',
      'getBoundedFunctionsErrorStatus(error)',
      '...getCircuitBreakerErrorContext(error)',
    ],
    'Functions circuit breaker bounded diagnostics',
  );
  assert(!functionsCircuitBreaker.includes("error: error?.message || 'Unknown error'"), 'Functions circuit breaker must not log raw provider exception messages');
  assert(!functionsCircuitBreaker.includes('sourceErrorName: error.name'), 'Functions circuit breaker must bound source error names');
  assert(!functionsCircuitBreaker.includes('sourceErrorCode: (error as any).code'), 'Functions circuit breaker must bound source error codes');
  assert(!functionsCircuitBreaker.includes('sourceErrorStatus: (error as any).status || (error as any).statusCode'), 'Functions circuit breaker must normalize source error status');

  const weeklyNarrativeLocalRoute = read('src/app/api/analytics/weekly-narrative/generate-local/route.ts');
  assert(weeklyNarrativeLocalRoute.includes('getWeeklyNarrativeRouteLogContext'), 'weekly narrative refresh must use bounded route context');
  assert(weeklyNarrativeLocalRoute.includes("logRuntimeFailure(\n            'weekly_narrative_local_generation_failed'"), 'weekly narrative refresh must use bounded failure diagnostics');
  assert(!weeklyNarrativeLocalRoute.includes('reason: error instanceof Error ? error.message'), 'weekly narrative refresh must not log raw exception messages');
  assert(!weeklyNarrativeLocalRoute.includes('answerlatticeGenAIClient'), 'weekly narrative refresh diagnostics must not restore provider work');
  assert(
    !fs.existsSync(path.join(ROOT, 'src/app/api/analytics/weekly-narrative/regenerate/route.ts')),
    'retired weekly narrative wrapper must stay absent from route diagnostics',
  );

  const razorpayRoutes = [
    'src/app/api/razorpay/create-subscription/route.ts',
    'src/app/api/razorpay/create-topup-order/route.ts',
    'src/app/api/razorpay/verify-subscription/route.ts',
    'src/app/api/razorpay/verify-topup/route.ts',
    'src/app/api/razorpay/cancel-subscription/route.ts',
    'src/app/api/razorpay/pause-subscription/route.ts',
    'src/app/api/razorpay/resume-subscription/route.ts',
    'src/app/api/razorpay/upgrade-subscription/route.ts',
  ];

	  razorpayRoutes.forEach((route) => {
	    const content = read(route);
	    assert(!content.includes('request.json()'), `${route} must not parse unbounded JSON`);
	    assert(!content.includes('buildSecurityContext'), `${route} must not spread raw security context into payment security logs`);
	    assert(content.includes('getBoundedRazorpaySecurityContext'), `${route} must use bounded Razorpay security context`);
	    assert(!content.includes('message: error instanceof Error ? error.message'), `${route} must not persist raw payment exception messages`);
	    assertIncludes(
      route,
      [
        'readBoundedJsonBody',
        'const RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES = 8 * 1024;',
        'if (bodyResult.ok === false) return bodyResult.response;',
        'validateAPIInput(',
      ],
      `${route} bounded payment body guard`,
    );
    assertOrder(
      route,
      [
        'const bodyResult = await readBoundedJsonBody(request, RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES',
        'if (bodyResult.ok === false) return bodyResult.response;',
        'const validation = validateAPIInput(',
      ],
      `${route} bounded payment body before validation`,
	    );
	  });

	  [
	    'productId: body?.productId',
	    'productId: rawData?.productId',
	    'planId: body?.planId',
	    'packId: body?.packId',
	    'currency: body?.currency',
	    'userType: body?.userType',
	    'subscriptionId: body?.subscriptionId',
	    'remainingCredits: body?.rc',
	    'subscriptionTenantId: internalSub.tenantId',
	    'subscriptionStoreId: internalSub.storeId',
	  ].forEach((rawToken) => {
	    razorpayRoutes.forEach((route) => {
	      assert(!read(route).includes(rawToken), `${route} must not keep raw Razorpay security-log token ${rawToken}`);
	    });
	  });

  [
    'src/app/api/razorpay/create-subscription/route.ts',
    'src/app/api/razorpay/create-topup-order/route.ts',
    'src/app/api/razorpay/verify-subscription/route.ts',
    'src/app/api/razorpay/verify-topup/route.ts',
    'src/app/api/razorpay/webhook/route.ts',
    'src/app/api/razorpay/cancel-subscription/route.ts',
    'src/app/api/razorpay/pause-subscription/route.ts',
    'src/app/api/razorpay/resume-subscription/route.ts',
    'src/app/api/razorpay/upgrade-subscription/route.ts',
  ].forEach((route) => {
    assert(read(route).includes('getRazorpayFailureLogData('), `${route} must persist bounded Razorpay failure diagnostics`);
  });

  {
    const webhookRoute = read('src/app/api/razorpay/webhook/route.ts');
    [
      'getWebhookNonBlockingContext',
      'logRazorpayNonBlockingFailure',
      'razorpay_webhook_payment_failure_alert_failed',
      'razorpay_webhook_payment_failure_lifecycle_message_failed',
      'razorpay_webhook_payment_failure_lifecycle_message_setup_failed',
      'razorpay_webhook_subscription_success_lifecycle_message_failed',
      'razorpay_webhook_subscription_success_lifecycle_message_setup_failed',
      'razorpay_webhook_subscription_success_internal_notification_failed',
      'razorpay_webhook_subscription_success_internal_notification_setup_failed',
      'razorpay_webhook_subscription_cancelled_lifecycle_message_failed',
      'razorpay_webhook_subscription_cancelled_lifecycle_message_setup_failed',
      'razorpay_webhook_subscription_paused_lifecycle_message_failed',
      'razorpay_webhook_subscription_paused_lifecycle_message_setup_failed',
      'razorpay_webhook_subscription_resumed_lifecycle_message_failed',
      'razorpay_webhook_subscription_resumed_lifecycle_message_setup_failed',
      'razorpay_webhook_failed_status_mark_failed',
      'razorpay_webhook_processing_alert_failed',
      "getBoundedRazorpayStringContext(\n            'eventId'",
      "getBoundedRazorpayStringContext('eventKey', webhookClaim.eventKey)",
    ].forEach((needle) => assert(webhookRoute.includes(needle), `webhook diagnostics must include ${needle}`));
    assert(!webhookRoute.includes('}).catch(() => { /* non-blocking */ });'), 'webhook must not silently swallow non-blocking notification send/status failures');
    assert(!webhookRoute.includes('} catch { /* non-blocking */ }'), 'webhook must not silently swallow non-blocking notification setup/alert failures');
    assert(!webhookRoute.includes('eventId: event.id || event.payload?.payment?.entity?.id'), 'webhook receipt breadcrumb must not log raw provider event IDs');
    const duplicateBreadcrumbBlock = webhookRoute.match(/logger\.info\('Duplicate Razorpay webhook skipped',[\s\S]*?return NextResponse\.json\(\{ status: 'duplicate' \}\);/)?.[0] || '';
    assert(duplicateBreadcrumbBlock.includes("getBoundedRazorpayStringContext('eventKey', webhookClaim.eventKey)"), 'webhook duplicate breadcrumb must bound event keys');
    assert(!duplicateBreadcrumbBlock.includes('eventKey: webhookClaim.eventKey'), 'webhook duplicate breadcrumb must not log raw event keys');
  }

  [
    {
      route: 'src/app/api/razorpay/verify-subscription/route.ts',
      failureCodes: [
        'razorpay_verify_subscription_lifecycle_message_failed',
        'razorpay_verify_subscription_lifecycle_message_import_failed',
        'razorpay_verify_subscription_internal_notification_failed',
        'razorpay_verify_subscription_internal_notification_import_failed',
      ],
    },
    {
      route: 'src/app/api/razorpay/verify-topup/route.ts',
      failureCodes: [
        'razorpay_verify_topup_lifecycle_message_failed',
        'razorpay_verify_topup_lifecycle_message_import_failed',
        'razorpay_verify_topup_internal_notification_failed',
        'razorpay_verify_topup_internal_notification_import_failed',
      ],
    },
    {
      route: 'src/app/api/razorpay/cancel-subscription/route.ts',
      failureCodes: [
        'razorpay_cancel_subscription_lifecycle_message_failed',
        'razorpay_cancel_subscription_lifecycle_message_import_failed',
      ],
    },
    {
      route: 'src/app/api/razorpay/pause-subscription/route.ts',
      failureCodes: [
        'razorpay_pause_subscription_lifecycle_message_failed',
        'razorpay_pause_subscription_lifecycle_message_import_failed',
      ],
    },
    {
      route: 'src/app/api/razorpay/resume-subscription/route.ts',
      failureCodes: [
        'razorpay_resume_subscription_lifecycle_message_failed',
        'razorpay_resume_subscription_lifecycle_message_import_failed',
      ],
    },
    {
      route: 'src/app/api/razorpay/upgrade-subscription/route.ts',
      failureCodes: [
        'razorpay_upgrade_subscription_lifecycle_message_failed',
        'razorpay_upgrade_subscription_lifecycle_message_import_failed',
      ],
    },
  ].forEach(({ route, failureCodes }) => {
    const source = read(route);
    assert(source.includes('logRazorpayNonBlockingFailure'), `${route} must log non-blocking Razorpay notification failures`);
    failureCodes.forEach((failureCode) => {
      assert(source.includes(failureCode), `${route} must use stable ${failureCode} diagnostics`);
    });
    assert(!source.includes('}).catch(() => { /* non-blocking */ });'), `${route} must not silently swallow non-blocking notification send failures`);
    assert(!source.includes('} catch { /* non-blocking */ }'), `${route} must not silently swallow non-blocking notification import failures`);
  });

  [
    {
      route: 'src/app/api/razorpay/cancel-subscription/route.ts',
      failureCode: 'razorpay_cancel_subscription_failed',
      rawLogger: "logger.error('Subscription cancellation failed', error",
      extraRawTokens: [
        'summarizeSubscriptionForCancelLog',
        'subscriptionId: subscription?.id',
        'tenantId: subscription?.tenantId',
        'storeId: subscription?.storeId',
        'providerSubscriptionId: subscription?.providerSubscriptionId',
      ],
    },
    {
      route: 'src/app/api/razorpay/create-subscription/route.ts',
      failureCode: 'razorpay_create_subscription_failed',
      rawLogger: "logger.error('Subscription creation failed', error",
      extraRawTokens: [
        'subscriptionId: razorpaySubscription.id',
        'tenantId: session.user.tenantId',
        'storeId: session.user.storeId',
      ],
    },
    {
      route: 'src/app/api/razorpay/pause-subscription/route.ts',
      failureCode: 'razorpay_pause_subscription_failed',
      rawLogger: "logger.error('Subscription pause failed', error",
      extraRawTokens: [
        'summarizeSubscriptionForMutationLog',
        'subscriptionTenantId: internalSub.tenantId',
        'subscriptionStoreId: internalSub.storeId',
        "logger.info('Subscription paused successfully', {",
      ],
    },
    {
      route: 'src/app/api/razorpay/resume-subscription/route.ts',
      failureCode: 'razorpay_resume_subscription_failed',
      rawLogger: "logger.error('Subscription resume failed', error",
      extraRawTokens: [
        'summarizeSubscriptionForMutationLog',
        'subscriptionTenantId: internalSub.tenantId',
        'subscriptionStoreId: internalSub.storeId',
        "logger.info('Subscription resumed successfully', {",
      ],
    },
    {
      route: 'src/app/api/razorpay/upgrade-subscription/route.ts',
      failureCode: 'razorpay_upgrade_subscription_failed',
      rawLogger: "logger.error('Subscription upgrade failed', error",
      extraRawTokens: [
        'summarizeSubscriptionForMutationLog',
        'subscriptionTenantId: internalSub.tenantId',
        'subscriptionStoreId: internalSub.storeId',
        'newSubscriptionTenantId: newInternalSub.tenantId',
        'newSubscriptionStoreId: newInternalSub.storeId',
        'oldSubscriptionId: internalSub.id',
      ],
    },
  ].forEach(({ route, failureCode, rawLogger, extraRawTokens }) => {
    const source = read(route);
    assert(source.includes('getRazorpaySubscriptionMutationLogContext'), `${route} must use bounded Razorpay subscription mutation context`);
    if (route !== 'src/app/api/razorpay/create-subscription/route.ts') {
      assert(source.includes('const userRateLimitHash = hashPublicRateLimitValue(userId);'), `${route} must hash subscription mutation user rate-limit key material`);
      assert(source.includes('key: `sub-mutate:${userRateLimitHash}`'), `${route} must not store raw user IDs in subscription mutation rate-limit keys`);
      assert(!source.includes('key: `sub-mutate:${userId}`'), `${route} must not store raw user IDs in subscription mutation rate-limit keys`);
    }
    assert(source.includes(`const failureData = getRazorpayFailureLogData('${failureCode}'`), `${route} must reuse bounded ${failureCode} data for logger and local logs`);
    assert(source.includes(`logger.error('Subscription`), `${route} keeps payment failure breadcrumb`);
    assert(source.includes(`new Error('${failureCode}')`), `${route} must pass stable failure code error to logger`);
    assert(!source.includes(rawLogger), `${route} must not pass raw provider exceptions to logger.error`);
    extraRawTokens.forEach((token) => {
      assert(!source.includes(token), `${route} must not keep raw Razorpay diagnostic token ${token}`);
    });
  });

  [
    {
      route: 'src/app/api/razorpay/create-topup-order/route.ts',
      failureCode: 'razorpay_create_topup_order_failed',
      loggerLabel: "logger.error('Top-up order creation failed'",
      rawLogger: "logger.error('Top-up order creation failed', error",
    },
    {
      route: 'src/app/api/razorpay/verify-topup/route.ts',
      failureCode: 'razorpay_verify_topup_failed',
      loggerLabel: "logger.error('Top-up verification API error'",
      rawLogger: "logger.error('Top-up verification API error', error",
    },
    {
      route: 'src/app/api/razorpay/verify-subscription/route.ts',
      failureCode: 'razorpay_verify_subscription_failed',
      loggerLabel: "logger.error('Subscription verification failed'",
      rawLogger: "logger.error('Subscription verification failed', error",
    },
    {
      route: 'src/app/api/razorpay/webhook/route.ts',
      failureCode: 'razorpay_webhook_processing_failed',
      loggerLabel: "logger.error('Webhook processing failed'",
      rawLogger: "logger.error('Webhook processing failed', error",
    },
  ].forEach(({ route, failureCode, loggerLabel, rawLogger }) => {
    const source = read(route);
    assert(source.includes('getBoundedRazorpayStringContext'), `${route} must use bounded Razorpay string context`);
    assert(source.includes(`getRazorpayFailureLogData('${failureCode}'`), `${route} must build bounded ${failureCode} data`);
    assert(source.includes(loggerLabel), `${route} must keep a stable billing failure breadcrumb`);
    assert(source.includes(`new Error('${failureCode}')`), `${route} must pass stable ${failureCode} errors to logger`);
    assert(!source.includes(rawLogger), `${route} must not pass raw provider exceptions to logger.error`);
  });
  {
    const createTopupRoute = read('src/app/api/razorpay/create-topup-order/route.ts');
    [
      "import { normalizeBillingTopupDocumentId, normalizeBillingTopupScopeDocumentId } from \"@lib/billing/topupDocumentIdBoundary\";",
      'const tenantScope = normalizeBillingTopupScopeDocumentId(scope.tenantId);',
      'const storeScope = normalizeBillingTopupScopeDocumentId(scope.storeId);',
      'const tenantId = tenantScope.numericId;',
      'const storeId = storeScope.numericId;',
      'verifyTenantAccess(session, tenantId, storeId, request)',
    ].forEach((needle) => assert(createTopupRoute.includes(needle), `create topup scope boundary must include ${needle}`));
    assert(
      createTopupRoute.indexOf('const tenantScope = normalizeBillingTopupScopeDocumentId(scope.tenantId);') < createTopupRoute.indexOf('verifyTenantAccess(session, tenantId, storeId, request)'),
      'create topup must validate tenant/store document IDs before access checks and provider work',
    );
  }
  {
    const verifyTopupRoute = read('src/app/api/razorpay/verify-topup/route.ts');
    [
      "import { normalizeBillingTopupDocumentId, normalizeBillingTopupScopeDocumentId } from \"@lib/billing/topupDocumentIdBoundary\";",
      'const tenantScope = normalizeBillingTopupScopeDocumentId(scope.tenantId);',
      'const storeScope = normalizeBillingTopupScopeDocumentId(scope.storeId);',
      'const tenantId = tenantScope.numericId;',
      'const storeId = storeScope.numericId;',
      'const storeDocumentId = storeScope.documentId;',
      'orderTenantId !== tenantId || orderStoreId !== storeId',
      'getActiveProductSubscriptionForStore(productId, tenantId, storeId)',
      'billingDb.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId)',
      'razorpay_topup_summary_mirror_failed',
      "getBoundedRazorpayStringContext('orderId', razorpay_order_id)",
      "getBoundedRazorpayStringContext('paymentId', razorpay_payment_id)",
      "getBoundedRazorpayStringContext('storedPaymentId', existingTopup.providerPaymentId)",
      "getBoundedRazorpayStringContext('subscriptionTenantId', internalSub.tenantId)",
      "getBoundedRazorpayStringContext('packId', packId)",
    ].forEach((needle) => assert(verifyTopupRoute.includes(needle), `verify topup diagnostics must include ${needle}`));
    assert(
      verifyTopupRoute.indexOf('const tenantScope = normalizeBillingTopupScopeDocumentId(scope.tenantId);') < verifyTopupRoute.indexOf('verifyTenantAccess(session, tenantId, storeId, request)'),
      'verify topup must validate tenant/store document IDs before access checks',
    );
    assert(!verifyTopupRoute.includes('.doc(String(storeId))'), 'verify topup must not build raw store document refs');
    assert(!verifyTopupRoute.includes('orderId: razorpay_order_id'), 'verify topup diagnostics must not log raw order id fields');
    assert(!verifyTopupRoute.includes('paymentId: razorpay_payment_id'), 'verify topup diagnostics must not log raw payment id fields');
  }
  {
    const verifySubscriptionRoute = read('src/app/api/razorpay/verify-subscription/route.ts');
    [
      "getBoundedRazorpayStringContext('paymentId', payment?.id)",
      "getBoundedRazorpayStringContext('subscriptionId', subscription?.id)",
      "getBoundedRazorpayStringContext('requestedSubscriptionId', razorpay_subscription_id)",
      "getBoundedRazorpayStringContext('paymentSubscriptionId', paymentSubscriptionId)",
      "getBoundedRazorpayStringContext('userId', userId)",
    ].forEach((needle) => assert(verifySubscriptionRoute.includes(needle), `verify subscription diagnostics must include ${needle}`));
    assert(!verifySubscriptionRoute.includes('data: {\n                subscriptionId: razorpay_subscription_id'), 'verify subscription local logs must not persist raw subscription IDs');
    assert(!verifySubscriptionRoute.includes('logFileName: LOG_FILE,\n            userId'), 'verify subscription local logs must not use raw top-level user IDs');
    assert(!verifySubscriptionRoute.includes('logFileName: LOG_FILE,\n            userId: userId'), 'verify subscription local logs must not use raw top-level user ID fields');
  }
  {
    const webhookRoute = read('src/app/api/razorpay/webhook/route.ts');
    assert(webhookRoute.includes("getRazorpayFailureLogData('razorpay_webhook_invoice_fetch_failed'"), 'webhook invoice fetch must use bounded failure data');
    assert(webhookRoute.includes("getBoundedRazorpayStringContext('invoiceId'"), 'webhook invoice fetch must bound invoice IDs');
    assert(!webhookRoute.includes("logger.error('Failed to fetch invoice for webhook', error"), 'webhook invoice fetch must not raw-log provider errors');
  }

  [
    'PAYMENT_VERIFICATION: {',
    'limit: 20',
    'window: 3600',
    "description: 'Payment verification - 20 per hour per user'",
  ].forEach((needle) => {
    assert(read('src/lib/rateLimit/configs.ts').includes(needle), `payment verification limiter config must include ${needle}`);
  });

  [
    {
      route: 'src/app/api/razorpay/verify-subscription/route.ts',
      key: 'key: `payment-verify:subscription:${userRateLimitHash}`',
      rawKey: 'key: `payment-verify:subscription:${userId}`',
    },
    {
      route: 'src/app/api/razorpay/verify-topup/route.ts',
      key: 'key: `payment-verify:topup:${userRateLimitHash}`',
      rawKey: 'key: `payment-verify:topup:${session.user.id}`',
    },
  ].forEach(({ route, key, rawKey }) => {
    assertIncludes(
      route,
      [
        'import { checkRateLimit }',
        'import { getRateLimitForFeature }',
        'import { hashPublicRateLimitValue }',
        "const rateLimitConfig = getRateLimitForFeature('PAYMENT_VERIFICATION');",
        'const userRateLimitHash = hashPublicRateLimitValue(',
        key,
        "logger.security('Payment Verification Rate Limit Exceeded'",
        "feature: 'PAYMENT_VERIFICATION'",
        "'Retry-After': String(waitSeconds)",
      ],
      `${route} payment verification limiter`,
    );
    assertOrder(
      route,
      [
        "const rateLimitConfig = getRateLimitForFeature('PAYMENT_VERIFICATION');",
        'const rateLimitResult = await checkRateLimit({',
        'const bodyResult = await readBoundedJsonBody(request, RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES',
        'const validation = validateAPIInput(',
      ],
      `${route} payment verification limiter before bounded payment body`,
    );
    assert(!read(route).includes(rawKey), `${route} must not store raw user IDs in payment verification rate-limit keys`);
  });
  assert(read('__docs__/razorpay/razorpay_firebase.md').includes('payment verification rate-limit boundary'), 'Razorpay Firebase docs must record the payment verification rate-limit boundary');
  assert(read('__docs__/razorpay/razorpay_impl.md').includes('Payment verification rate-limit boundary'), 'Razorpay implementation docs must record the payment verification rate-limit boundary');
  assert(read('__docs__/audits/menulist-production-readiness-audit.md').includes('Razorpay payment verification rate-limit boundary checkpoint'), 'Production audit must record the payment verification rate-limit boundary');
  assert(read('__docs__/changelog.md').includes('Razorpay Payment Verification Rate-Limit Boundary'), 'Changelog must record the payment verification rate-limit boundary');
  assert(read('__docs__/changelog.md').includes('Razorpay Payment Verification Rate-Limit Boundary'), 'Lowercase changelog must record the payment verification rate-limit boundary');

  [
    'src/app/api/razorpay/cancel-subscription/route.ts',
    'src/app/api/razorpay/pause-subscription/route.ts',
    'src/app/api/razorpay/resume-subscription/route.ts',
    'src/app/api/razorpay/upgrade-subscription/route.ts',
  ].forEach((route) => {
    assertOrder(
      route,
      [
        'const userRateLimitHash = hashPublicRateLimitValue(userId);',
        "getRateLimitForFeature('SUBSCRIPTION_MUTATION')",
        'const bodyResult = await readBoundedJsonBody(request, RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES',
        'const validation = validateAPIInput(',
      ],
      `${route} mutation limiter before bounded payment body`,
    );
  });

  assertIncludes(
    'src/app/api/razorpay/create-subscription/route.ts',
    [
      'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      'const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);',
      'key: `subscription:${productId}:${userRateLimitHash}:${tenantRateLimitHash}`',
      "const name = session?.user?.name || '';",
      "const email = session?.user?.email || '';",
    ],
    'create subscription hashed payment rate-limit key and session-only billing identity',
  );
  assert(!read('src/app/api/razorpay/create-subscription/route.ts').includes('key: `subscription:${productId}:${userId}:${tenantId}`'), 'create subscription must not store raw user/tenant IDs in rate-limit keys');
  assert(!read('src/app/api/razorpay/create-subscription/route.ts').includes('body.name'), 'create subscription must not use unvalidated request body names');
  assert(!read('src/app/api/razorpay/create-subscription/route.ts').includes('body.email'), 'create subscription must not use unvalidated request body emails');

  assertIncludes(
    'src/app/api/razorpay/create-topup-order/route.ts',
    [
      'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      'const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);',
      'key: `topup:${productId}:${userRateLimitHash}:${tenantRateLimitHash}`',
    ],
    'create topup hashed payment rate-limit key',
  );
  assert(!read('src/app/api/razorpay/create-topup-order/route.ts').includes('key: `topup:${productId}:${userId}:${tenantId}`'), 'create topup must not store raw user/tenant IDs in rate-limit keys');

  assertIncludes(
    'src/lib/billing/billingAccess.ts',
    [
      'import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";',
      'const sessionScope = resolveSensitiveSessionStoreScope({',
      'tenantValues: [session?.tId, session?.user?.tenantId],',
      'storeValues: [session?.sId, session?.user?.storeId],',
      'Missing tenant, store, or role for billing mutation',
      "getBoundedRazorpayStringContext('billingTenantId', tenantId)",
      'isSensitiveStoreRecordInScope({',
      'doc(storeScope.documentId)',
      'storeData.active === false',
      'storeData.deleted === true',
      'isPlatformEntityBlocked(storeData)',
      'Store unavailable for billing mutation',
    ],
    'billing mutation permission helper rejects inactive/deleted/blocked store targets',
  );

  assertIncludes(
    '__docs__/razorpay/razorpay_impl.md',
    [
      'Authenticated MenuList billing mutations use `canManageBillingMutation()`',
      'Every supplied session tenant/store alias must normalize and agree',
    ],
    'Razorpay implementation billing mutation scope boundary',
  );
  assertIncludes(
    '__docs__/razorpay/razorpay_firebase.md',
    [
      'July 6 billing mutation scope document-ID boundary is Firebase-cost neutral',
      '`normalizeBillingMutationScopeDocumentId()` rejects malformed',
    ],
    'Razorpay Firebase billing mutation scope boundary',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'Billing Mutation Scope Document ID Boundary checkpoint',
      'normalizeBillingMutationScopeDocumentId()',
      'raw `doc(String(storeId))` exclusion',
    ],
    'Production audit billing mutation scope boundary',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Billing Mutation Scope Document ID Boundary',
      'Shared billing mutation scope is guarded',
      'normalizeBillingMutationScopeDocumentId()',
    ],
    'primary changelog billing mutation scope boundary',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Billing Mutation Scope Document ID Boundary',
      'Shared billing mutation scope is guarded',
      'normalizeBillingMutationScopeDocumentId()',
    ],
    'mirrored changelog billing mutation scope boundary',
  );

  assertOrder(
    'src/app/api/onboarding/create-subscription/route.ts',
    [
      "getRateLimitForFeature('PAYMENT_ONBOARDING')",
      'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      'const bodyResult = await readBoundedJsonBody(request, ONBOARDING_SUBSCRIPTION_MAX_BODY_BYTES',
      'const validation = validateAPIInput(OnboardingSubscriptionSchema, body);',
      'createTenantStoreInTransaction(',
      'await revalidateMenuCache(result.storeId, { tId: result.tenantId });',
      "let razorpayPlanId = '';",
      'razorpayPlanId = await getOrCreateRazorpayPlan({',
      'await compensateOnboardingPaymentProviderFailure({',
    ],
    'onboarding subscription bounded body, public cache refresh, and compensation before provider failure rethrow',
  );
  assertIncludes(
    'src/app/api/onboarding/create-subscription/route.ts',
    [
      'import { compensateFailedTenantStoreOnboarding } from "@lib/onboarding/compensateFailedOnboarding";',
      'const ONBOARDING_SUBSCRIPTION_MAX_BODY_BYTES = 16 * 1024;',
      'const ONBOARDING_SUBSCRIPTION_CACHE_REVALIDATION_FAILURE_CODE = \'razorpay_onboarding_cache_revalidation_failed\';',
      'const ONBOARDING_SUBSCRIPTION_COMPENSATION_FAILED_CODE = \'razorpay_onboarding_compensation_failed\';',
      'const ONBOARDING_SUBSCRIPTION_COMPENSATION_CACHE_REVALIDATION_FAILED_CODE = \'razorpay_onboarding_compensation_cache_revalidation_failed\';',
      'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      'key: `onboarding:${userRateLimitHash}`',
      'async function compensateOnboardingPaymentProviderFailure',
      'await compensateFailedTenantStoreOnboarding({',
      'source: "WEBSITE_ONBOARDING"',
      'reason: ONBOARDING_SUBSCRIPTION_FAILURE_CODE',
      'revalidateMenuCache(result.storeId, { tId: result.tenantId });',
    ],
    'onboarding subscription body cap and provider-failure compensation',
  );
  assert(!read('src/app/api/onboarding/create-subscription/route.ts').includes('key: `onboarding:${userId}`'), 'onboarding subscription must not store raw user IDs in rate-limit keys');
  assert(!read('src/app/api/onboarding/create-subscription/route.ts').includes('request.json()'), 'onboarding subscription must not parse unbounded JSON');
  assertIncludes(
    'src/app/api/onboarding/create-subscription/route.ts',
    [
      'const ONBOARDING_SUBSCRIPTION_FAILURE_CODE = \'razorpay_onboarding_subscription_failed\';',
      'const ONBOARDING_SUBSCRIPTION_VALIDATION_FAILED_CODE = \'razorpay_onboarding_subscription_validation_failed\';',
      'const getOnboardingSubscriptionLogContext = (input:',
      'const getOnboardingSubscriptionValidationContext = (',
      'getBoundedSecurityRouteContext(session, request)',
      'businessNameLength: typeof input.businessName === \'string\' ? input.businessName.length : 0',
      'getBoundedRazorpayStringContext(\'businessIndustry\', input.businessIndustry)',
      'getBoundedRazorpayStringContext(\'currency\', input.currency)',
      'getBoundedRazorpayStringContext(\'interval\', input.interval)',
      'getBoundedRazorpayStringContext(\'userType\', input.userType)',
      'getBoundedRazorpayStringContext(\'userId\', input.userId)',
      'getBoundedRazorpayStringContext(\'tenantId\', input.tenantId)',
      'getBoundedRazorpayStringContext(\'storeId\', input.storeId)',
      'getBoundedRazorpayStringContext(\'planId\', input.planId)',
      'getBoundedRazorpayStringContext(\'subscriptionId\', input.subscriptionId)',
      'bodyFieldCount:',
      'validationErrorLength: errorMsg.length',
      'error: ONBOARDING_SUBSCRIPTION_VALIDATION_FAILED_CODE',
      'data: onboardingLogContext',
      'data: getOnboardingSubscriptionLogContext({',
      'getRazorpayFailureLogData(',
      'logger.error(\'[Onboarding] Failed\', new Error(ONBOARDING_SUBSCRIPTION_FAILURE_CODE), failureData)',
      'data: failureData',
    ],
    'onboarding subscription bounded failure diagnostics',
  );
  {
    assertIncludes(
      'src/lib/onboarding/onboardingUserId.ts',
      [
        "import { isValidFirestoreDocumentId } from \"@lib/firebase/firestoreDocumentId\";",
        'export function normalizeOnboardingUserId(value: unknown): string | null',
        'const raw = value;',
        'userId === raw && userId.length > 0 && userId.length <= 160 && isValidFirestoreDocumentId(userId)',
        'isValidFirestoreDocumentId(userId)',
        'export function requireOnboardingUserId(value: unknown): string',
      ],
      'onboarding user ID boundary helper',
    );
    assertIncludes(
      'src/lib/onboarding/createTenantStore.ts',
      [
        'requireOnboardingUserId',
        'const normalizedUserId = requireOnboardingUserId(userId);',
        '.doc(normalizedUserId)',
      ],
      'central onboarding user update helper user ID boundary',
    );
    assertIncludes(
      'src/lib/onboarding/compensateFailedOnboarding.ts',
      [
        'PAYMENT_PROVIDER_FAILED_STATUS = "payment_provider_failed"',
        'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
        'const ONBOARDING_COMPENSATION_SCOPE_DOCUMENT_ID_PATTERN = /^[1-9]\\d*$/;',
        'requireOnboardingUserId',
        'const tenantScope = normalizePositiveId(params.tenantId);',
        'const storeScope = normalizePositiveId(params.storeId);',
        'const tenantId = tenantScope.numericId;',
        'const storeId = storeScope.numericId;',
        'doc(tenantScope.documentId)',
        'doc(storeScope.documentId)',
        '[storeScope.documentId]',
        'export async function compensateFailedTenantStoreOnboarding',
        'const userId = requireOnboardingUserId(params.userId);',
        'active: false',
        'onboardingCompensatedAt: now',
        'onboardingCompensationReason: reason',
        'onboardingStatus: PAYMENT_PROVIDER_FAILED_STATUS',
        'storeIds: remainingStoreIds',
        'stores: remainingStores',
        'userUpdate.storeId = null',
        'userUpdate.tenantId = null',
        'storesSummaryRef',
      ],
      'failed onboarding compensation helper',
    );
    assertIncludes(
      'src/app/api/reseller/onboard/route.ts',
      [
        'import { requireOnboardingUserId } from "@lib/onboarding/onboardingUserId";',
        'const userId = requireOnboardingUserId(existingOwnerDoc?.id || authAccount.uid);',
        'readResellerOwnerClaimInTransaction({',
      ],
      'reseller onboarding generated auth UID user document boundary',
    );
    assertIncludes(
      'src/lib/reseller/resellerOwnerClaim.ts',
      [
        'const normalizedUserId = normalizeOnboardingUserId(userId);',
        'const ref = db.collection(DB_COLLECTIONS.USERS).doc(normalizedUserId);',
        'const snapshot = await transaction.get(ref);',
      ],
      'reseller onboarding transaction owner document boundary',
    );
    const onboardingCreateTenantStore = read('src/lib/onboarding/createTenantStore.ts');
    const failedOnboardingCompensation = read('src/lib/onboarding/compensateFailedOnboarding.ts');
    assert(!onboardingCreateTenantStore.includes('.doc(userId);'), 'central onboarding user update helper must not use raw user IDs in document refs');
    assert(!failedOnboardingCompensation.includes('.doc(params.userId)'), 'failed onboarding compensation helper must not use raw user IDs in document refs');
    assert(!failedOnboardingCompensation.includes('const id = Number(value);'), 'failed onboarding compensation helper must not numeric-coerce scope before document refs');
    assert(!failedOnboardingCompensation.includes('.doc(String(tenantId))'), 'failed onboarding compensation helper must not build tenant refs from stringified numeric scope');
    assert(!failedOnboardingCompensation.includes('.doc(String(storeId))'), 'failed onboarding compensation helper must not build store refs from stringified numeric scope');
    assertIncludes(
      '__docs__/onboarding-centralization/README.md',
      [
        'July 5 user-ID boundary',
        'July 6 compensation scope boundary',
        'src/lib/onboarding/onboardingUserId.ts',
        'whitespace-mutated',
        'oversized',
        'updateUserWithTenantStore()',
        'provider-failure compensation normalizes `params.userId`',
        'provider-failure compensation normalizes `params.tenantId` and `params.storeId`',
      ],
      'onboarding centralization user ID boundary docs',
    );
    assertIncludes(
      '__docs__/auth-onboarding/auth-onboarding_impl.md',
      [
        'Onboarding user-ID boundary',
        'Onboarding compensation scope boundary',
        'src/lib/onboarding/onboardingUserId.ts',
        'whitespace-mutated',
        'oversized',
        '`compensateFailedTenantStoreOnboarding()`',
        'exact positive numeric tenant/store document IDs',
        'Reseller onboarding normalizes Firebase Auth-generated UIDs',
      ],
      'auth onboarding implementation user ID boundary docs',
    );
    assertIncludes(
      '__docs__/auth-onboarding/auth-onboarding_firebase.md',
      [
        'Onboarding user-ID boundary',
        'Onboarding compensation scope boundary',
        'normalize user IDs through `src/lib/onboarding/onboardingUserId.ts`',
        'exact positive numeric tenant/store document IDs',
        'whitespace-mutated',
        'oversized',
        'add no reads or writes for valid requests',
      ],
      'auth onboarding Firebase user ID boundary docs',
    );
    assertIncludes(
      '__docs__/audits/menulist-production-readiness-audit.md',
      [
        'Onboarding strict user ID helper boundary checkpoint',
        'Onboarding compensation scope boundary checkpoint',
        'src/lib/onboarding/onboardingUserId.ts',
        'whitespace-mutated',
        'oversized',
        'compensateFailedTenantStoreOnboarding()',
        'provider-failure compensation now requires exact positive numeric tenant/store document IDs',
        'reseller onboarding normalizes Firebase Auth-generated UIDs',
      ],
      'production audit onboarding user ID boundary evidence',
    );
    assertIncludes(
      '__docs__/changelog.md',
      [
        'Onboarding Strict User ID Helper Boundary',
        'Onboarding Compensation Scope Boundary',
        'whitespace-mutated',
        'oversized',
        'Provider-failure compensation scope is exact',
        'Onboarding helper user IDs are validated before user document refs',
        'Reseller-created owner docs use the same guard',
      ],
      'primary changelog onboarding user ID boundary evidence',
    );
    assertIncludes(
      '__docs__/changelog.md',
      [
        'Onboarding Strict User ID Helper Boundary',
        'Onboarding Compensation Scope Boundary',
        'whitespace-mutated',
        'oversized',
        'Provider-failure compensation scope is exact',
        'Onboarding helper user IDs are validated before user document refs',
        'Reseller-created owner docs use the same guard',
      ],
      'mirrored changelog onboarding user ID boundary evidence',
    );
    const onboardingRoute = read('src/app/api/onboarding/create-subscription/route.ts');
    assert(!onboardingRoute.includes('secureError(\'[Onboarding] Failed\''), 'onboarding subscription must not raw secureError caught failures');
    assert(!onboardingRoute.includes('data: { userId, error: (error as Error).message }'), 'onboarding subscription local error log must not persist raw exception messages');
    assert(!onboardingRoute.includes('businessName: body?.businessName?.substring'), 'onboarding subscription validation diagnostics must not log raw business names');
    assert(!onboardingRoute.includes('attemptedData: {'), 'onboarding subscription validation diagnostics must not log raw attempted data objects');
    assert(!onboardingRoute.includes('tenantId: session.user.tenantId'), 'onboarding existing-user diagnostics must not log raw tenant IDs');
    assert(!onboardingRoute.includes('storeId: session.user.storeId'), 'onboarding existing-user diagnostics must not log raw store IDs');
    assert(!onboardingRoute.includes('data: { userId, businessName, planId }'), 'onboarding started local log must not persist raw user/business/plan IDs');
    assert(!onboardingRoute.includes('data: { userId, tenantId: result.tenantId, storeId: result.storeId }'), 'onboarding transaction local log must not persist raw tenant/store IDs');
    assert(!onboardingRoute.includes('data: { subscriptionId: razorpaySubscription.id, tenantId: result.tenantId }'), 'onboarding provider-created local log must not persist raw subscription IDs');
    assert(!onboardingRoute.includes('data: { userId, tenantId: result.tenantId, storeId: result.storeId, subscriptionId: razorpaySubscription.id }'), 'onboarding complete local log must not persist raw user/store/subscription IDs');
    assert(!onboardingRoute.includes("logger.info('[Onboarding] User onboarded successfully', {\n            tenantId: result.tenantId,\n            userId,"), 'onboarding success diagnostics must not log raw tenant/user IDs');
    assert(!onboardingRoute.includes('buildSecurityContext'), 'onboarding subscription security logs must not spread raw session/request context');
  }

  assertIncludes(
    'src/lib/errors/firestoreErrors.ts',
    [
      'getBoundedRuntimeStringContext(\'userId\', context?.userId)',
      'getBoundedRuntimeStringContext(\'tenantId\', context?.tenantId)',
      'logger.error(message, new Error(failureCode), {',
      '\'payment_firestore_error\'',
      '\'payment_firestore_transaction_failed\'',
      '\'payment_razorpay_api_failed\'',
      '\'payment_razorpay_timeout\'',
      'sourceErrorName: getPaymentErrorName(error)',
      'sourceErrorCode: getPaymentErrorCode(error)',
      'sourceStatusCode: getPaymentErrorStatus(error)',
      'details: \'Request could not be completed\'',
      'details: \'Failed to process payment request\'',
    ],
    'payment error handler bounded diagnostics',
  );
  {
    const paymentErrors = read('src/lib/errors/firestoreErrors.ts');
    [
      'logger.error(\'Firestore Error\', {',
      'logger.error(\'Razorpay API Error\', {',
      'errorMessage: firestoreError.message',
      'stack: firestoreError.stack',
      'errorMessage: razorpayError.message',
      'stack: razorpayError.stack',
      'details: process.env.NODE_ENV === \'development\' ? firestoreError.message : undefined',
      'details: process.env.NODE_ENV === \'development\' ? razorpayError.message : undefined',
      'razorpayError.error?.description || razorpayError.message',
    ].forEach((rawPattern) => {
      assert(!paymentErrors.includes(rawPattern), `payment error handler must not include raw diagnostic pattern: ${rawPattern}`);
    });
  }

  const resellerRoutes = [
    'src/app/api/reseller/onboard/route.ts',
    'src/app/api/reseller/renew/route.ts',
    'src/app/api/reseller/add-location-capacity/route.ts',
    'src/app/api/reseller/confirm-payment/route.ts',
    'src/app/api/reseller/manage/route.ts',
  ];
  resellerRoutes.forEach((route) => {
    const content = read(route);
    assert(!content.includes('request.json()'), `${route} must not parse unbounded JSON`);
    assertIncludes(
      route,
      [
        'readBoundedJsonBody',
        'const RESELLER_ACTION_MAX_BODY_BYTES = 16 * 1024;',
        'if (bodyResult.ok === false) return bodyResult.response;',
        'validateAPIInput(',
      ],
      `${route} bounded reseller body guard`,
    );
    assertOrder(
      route,
      [
        "getRateLimitForFeature('DATA_WRITE')",
        'const bodyResult = await readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES',
        'validateAPIInput(',
      ],
      `${route} reseller write limiter before bounded body validation`,
    );
  });
  [
    {
      route: 'src/app/api/reseller/onboard/route.ts',
      hashDeclaration: 'const resellerRateLimitHash = hashPublicRateLimitValue(resellerId);',
      hashedKey: 'key: `reseller-onboard:${resellerRateLimitHash}`',
      rawKey: 'key: `reseller-onboard:${resellerId}`',
    },
    {
      route: 'src/app/api/reseller/renew/route.ts',
      hashDeclaration: 'const resellerRateLimitHash = hashPublicRateLimitValue(resellerId);',
      hashedKey: 'key: `reseller-renew:${resellerRateLimitHash}`',
      rawKey: 'key: `reseller-renew:${resellerId}`',
    },
    {
      route: 'src/app/api/reseller/add-location-capacity/route.ts',
      hashDeclaration: 'const resellerRateLimitHash = hashPublicRateLimitValue(resellerId);',
      hashedKey: 'key: `reseller-add-location:${resellerRateLimitHash}`',
      rawKey: 'key: `reseller-add-location:${resellerId}`',
    },
    {
      route: 'src/app/api/reseller/confirm-payment/route.ts',
      hashDeclaration: 'const resellerRateLimitHash = hashPublicRateLimitValue(resellerId);',
      hashedKey: 'key: `reseller-confirm-payment:${resellerRateLimitHash}`',
      rawKey: 'key: `reseller-confirm-payment:${resellerId}`',
    },
    {
      route: 'src/app/api/reseller/manage/route.ts',
      hashDeclaration: 'const userRateLimitHash = hashPublicRateLimitValue(session.user.id);',
      hashedKey: 'key: `reseller-manage:${userRateLimitHash}`',
      rawKey: 'key: `reseller-manage:${session.user.id}`',
    },
  ].forEach(({ route, hashDeclaration, hashedKey, rawKey }) => {
    assertIncludes(
      route,
      [
        hashDeclaration,
        hashedKey,
      ],
      `${route} reseller mutation hashed limiter key`,
    );
    assertOrder(
      route,
      [
        "getRateLimitForFeature('DATA_WRITE')",
        hashDeclaration,
        hashedKey,
        'const bodyResult = await readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES',
      ],
      `${route} reseller mutation hashed limiter before bounded body`,
    );
    assert(!read(route).includes(rawKey), `${route} must not store raw reseller/user IDs in rate-limit keys`);
  });
  assertIncludes(
    'src/app/api/reseller/readRateLimit.ts',
    [
      "getRateLimitForFeature('DATA_READ')",
      'checkRateLimit({',
      "export const RESELLER_PRIVATE_RESPONSE_HEADERS = {",
      "'Cache-Control': 'private, no-store'",
      "'X-Content-Type-Options': 'nosniff'",
      'export const resellerPrivateJson = (',
      'const headers = new Headers(init.headers);',
      'Object.entries(RESELLER_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {',
      'headers.set(name, value);',
      'return NextResponse.json(body, {',
      'headers,',
      'const userRateLimitHash = hashPublicRateLimitValue(userId);',
      'const resellerProfileRateLimitHash = hashPublicRateLimitValue(resellerProfileId);',
      'key: `reseller-read:${routeKey}:${userRateLimitHash}:${resellerProfileRateLimitHash}`',
      "'Retry-After': String(waitSeconds)",
      "'X-RateLimit-Limit': String(rateLimitConfig.limit)",
      "'X-RateLimit-Remaining': String(rateLimit.remaining)",
      "'X-RateLimit-Reset': String(rateLimit.resetAt)",
    ],
    'reseller shared read rate limiter',
  );
  {
    const readRateLimit = read('src/app/api/reseller/readRateLimit.ts');
    assert(!readRateLimit.includes('key: `reseller-read:${routeKey}:${userId}:${resellerProfileId}`'), 'reseller shared read limiter must not store raw user/profile IDs in rate-limit keys');
    assert(!readRateLimit.includes('...Object.fromEntries(new Headers(init.headers).entries())'), 'reseller private response headers must not be caller-overridable');
  }
  [
    {
      route: 'src/app/api/reseller/profile/route.ts',
      key: 'profile',
      before: 'const resellerId = session.user.id;',
    },
    {
      route: 'src/app/api/reseller/clients/route.ts',
      key: 'clients',
      before: 'const isPlatform = resolveExactSessionPlatformRole(session)',
    },
    {
      route: 'src/app/api/reseller/monthly-summary/route.ts',
      key: 'monthly-summary',
      before: 'const isPlatform = resolveExactSessionPlatformRole(session)',
    },
    {
      route: 'src/app/api/reseller/manage/route.ts',
      key: 'manage',
      before: 'const persistedProfiles = await getAllResellerProfiles();',
    },
  ].forEach(({ route, key, before }) => {
    assertIncludes(
      route,
      [
        'applyResellerReadRateLimit',
        `applyResellerReadRateLimit(session, "${key}")`,
      ],
      `${route} reseller read limiter`,
    );
    assertOrder(
      route,
      [
        `applyResellerReadRateLimit(session, "${key}")`,
        before,
      ],
      `${route} reseller read limiter before Firestore reads`,
    );
    assertIncludes(
      route,
      ['resellerPrivateJson', 'from "../readRateLimit"'],
      `${route} reseller private response boundary`,
    );
  });
  assertIncludes(
    'src/lib/billing/resellerApiDiagnostics.ts',
    [
      'getBoundedResellerApiStringContext',
      'getResellerApiFailureLogData',
      'sourceErrorName: getResellerApiErrorName(error)',
      'sourceErrorCode: getResellerApiErrorCode(error)',
      'sourceStatusCode: getResellerApiErrorStatus(error)',
      'secureError("[Reseller API] Operation failed"',
    ],
    'reseller API diagnostics helper',
  );
  [
    ['src/app/api/reseller/profile/route.ts', ['reseller_profile_route_failed']],
    ['src/app/api/reseller/clients/route.ts', ['reseller_clients_route_failed']],
    ['src/app/api/reseller/monthly-summary/route.ts', ['reseller_monthly_summary_route_failed']],
    ['src/app/api/reseller/manage/route.ts', ['reseller_manage_get_route_failed', 'reseller_manage_post_route_failed']],
    ['src/app/api/reseller/onboard/route.ts', [
      'reseller_onboard_route_failed',
      'reseller_onboard_cache_revalidation_failed',
      'reseller_onboard_auth_cleanup_failed',
      'reseller_onboard_auth_claims_compensation_failed',
      'reseller_onboard_provider_compensation_failed',
      'reseller_onboard_provider_compensation_cache_revalidation_failed',
    ]],
    ['src/app/api/reseller/renew/route.ts', ['reseller_renew_route_failed']],
    ['src/app/api/reseller/add-location-capacity/route.ts', ['reseller_add_location_capacity_route_failed']],
    ['src/app/api/reseller/confirm-payment/route.ts', ['reseller_confirm_payment_route_failed']],
  ].forEach(([route, failureCodes]) => {
    const content = read(route);
    failureCodes.forEach((failureCode) => assert(content.includes(failureCode), `${route} must log ${failureCode}`));
    assert(content.includes('logResellerApiFailure'), `${route} must use bounded reseller API diagnostics`);
    assert(content.includes('getBoundedResellerApiStringContext'), `${route} must bound reseller API route context`);
    assert(!content.includes('secureError('), `${route} must not pass raw route failures to secureError`);
  });
  [
    'src/app/api/reseller/onboard/route.ts',
    'src/app/api/reseller/renew/route.ts',
    'src/app/api/reseller/add-location-capacity/route.ts',
    'src/app/api/reseller/confirm-payment/route.ts',
  ].forEach((route) => {
    const content = read(route);
    assert(content.includes('getBoundedSecurityRouteContext(session, request)'), `${route} security logs must use bounded route metadata`);
    assert(!content.includes('buildSecurityContext'), `${route} security logs must not spread raw route security context`);
  });
	  {
	    const onboardRoute = read('src/app/api/reseller/onboard/route.ts');
	    assert(onboardRoute.includes('revalidateMenuCache(result.storeId, { tId: result.tenantId });'), 'reseller onboard must refresh public cache after tenant/store creation');
	    assert(onboardRoute.includes('import { compensateFailedTenantStoreOnboarding } from "@lib/onboarding/compensateFailedOnboarding";'), 'reseller onboard must import failed onboarding compensation helper');
	    assert(onboardRoute.includes('async function compensateResellerOnboardingFailure'), 'reseller onboard must define provider-failure compensation');
	    assert(onboardRoute.includes('await compensateFailedTenantStoreOnboarding({'), 'reseller online provider failure must compensate the created tenant/store scope');
	    assert(onboardRoute.includes('source: "RESELLER_ONBOARDING"'), 'reseller online provider failure compensation must record reseller source');
	    assert(onboardRoute.includes('reason: \'reseller_online_provider_setup_failed\''), 'reseller online provider failure compensation must record stable reason');
	    assert(onboardRoute.includes('await authAdmin.setCustomUserClaims(params.authUid, {'), 'reseller provider failure compensation must clear just-set owner auth scope claims');
	    assert(onboardRoute.includes('await compensateResellerOnboardingFailure({'), 'reseller online provider catch must call compensation before rethrow');
	    assert(onboardRoute.includes('projectResellerProviderSubscription(providerSubscription)'), 'reseller online onboarding must validate provider identity and allowlist the checkout URL');
	    assertOrder(
	      'src/app/api/reseller/onboard/route.ts',
	      [
	        'await razorpayClient.subscriptions.cancel(razorpaySubscription.id);',
	        'await compensateResellerOnboardingFailure({',
	        'throw providerError;',
	      ],
	      'reseller provider setup failure must cancel before local compensation and rethrow',
	    );
	    assert(onboardRoute.includes("getResellerApiFailureLogData('reseller_onboard_route_failed'"), 'reseller onboard local error log must use bounded failure payload');
	    assert(onboardRoute.includes('RESELLER_ONBOARD_AUTH_CLEANUP_FAILED'), 'reseller onboard must code auth cleanup rollback failures');
	    assert(onboardRoute.includes("getBoundedResellerApiStringContext('authUid'"), 'reseller onboard auth cleanup diagnostic must bound auth UID context');
	    assert(!onboardRoute.includes("data: { resellerId, error: (error as Error).message }"), 'reseller onboard local error log must not persist raw exception messages');
	    assert(!onboardRoute.includes("data: { resellerId, businessName"), 'reseller onboard local start log must not persist raw business identifiers');
	    assert(!onboardRoute.includes("data: { resellerId, tenantId: result.tenantId"), 'reseller onboard local completion log must not persist raw tenant/store identifiers');
	    assert(!onboardRoute.includes('authAdmin.deleteUser(authAccount.uid).catch(() => undefined)'), 'reseller onboard auth cleanup failures must not be silently swallowed');
	    assert(onboardRoute.includes("where('email', '==', params.email).limit(2).get()"), 'reseller onboard must detect duplicate owner email documents');
	    assert(onboardRoute.includes("where('username', '==', params.username).limit(2).get()"), 'reseller onboard must detect duplicate owner login usernames');
	    assert(onboardRoute.includes('emailSnapshot.docs.some((emailDoc) => emailDoc.id !== params.existingOwnerDocId)'), 'reseller onboard must reject any competing email owner document');
	    assert(onboardRoute.includes('usernameSnapshot.docs.some((usernameDoc) => usernameDoc.id !== params.existingOwnerDocId)'), 'reseller onboard must reject any competing username owner document');
	  }
	  {
	    const manageRoute = read('src/app/api/reseller/manage/route.ts');
	    assert(manageRoute.includes("logger.info('Reseller profile updated'"), 'reseller manage route keeps update success breadcrumb');
	    assert(manageRoute.includes("logger.info('Reseller profile created'"), 'reseller manage route keeps create success breadcrumb');
	    assert(manageRoute.includes("getBoundedResellerApiStringContext('profileId'"), 'reseller manage success breadcrumbs must bound profile IDs');
	    assert(manageRoute.includes("getBoundedResellerApiStringContext('resellerName'"), 'reseller manage create breadcrumb must bound reseller names');
	    assert(manageRoute.includes("profileId: z.string().min(1).max(128).refine((value) => value === value.trim() && isValidFirestoreDocumentId(value), 'Invalid profile ID')"), 'reseller manage update profileId must reject whitespace-mutated Firestore document IDs');
	    assert(manageRoute.includes('updatedFieldCount: Object.keys(profileUpdates).length'), 'reseller manage update breadcrumb must log field counts, not field names');
	    assert(!manageRoute.includes('buildSecurityContext'), 'reseller manage route must not import or spread raw security context');
	    assert(!manageRoute.includes("profileId: z.string().trim().min(1).max(128).refine(isValidFirestoreDocumentId, 'Invalid profile ID')"), 'reseller manage update profileId must not trim before Firestore document ID validation');
	    assert(!manageRoute.includes('profileId,\n                updatedFields: Object.keys(profileUpdates)'), 'reseller manage update breadcrumb must not log raw profile IDs or field names');
	    assert(!manageRoute.includes('profileId: authUserId,\n                resellerName: data.name'), 'reseller manage create breadcrumb must not log raw profile IDs or reseller names');
	  }
	  const mobileResellerManagement = read('src/components/mobile/screens/MobileResellerManagementScreen.tsx');
  const mobileResellerDashboard = read('src/components/mobile/screens/MobileResellerDashboardScreen.tsx');
  const mobileResellerOnboarding = read('src/components/mobile/screens/MobileResellerOnboardingScreen.tsx');
  const desktopResellerManagement = read('src/components/templates/main-app/reseller/ResellerManagement.tsx');
  const desktopResellerDashboard = read('src/components/templates/main-app/reseller/ResellerDashboard.tsx');
  const desktopResellerOnboarding = read('src/components/templates/main-app/reseller/OnboardingWizard.tsx');
  const resellerDashboardHook = read('src/hooks/useResellerDashboard.ts');
  const resellerDiagnostics = read('src/components/templates/main-app/reseller/resellerDiagnostics.ts');
  assert(resellerDiagnostics.includes('copyResellerTextToClipboard'), 'reseller diagnostics must expose copy acknowledgement helper');
  assert(resellerDiagnostics.includes('RESELLER_CLIPBOARD_COPY_UNAVAILABLE'), 'reseller diagnostics must code unavailable clipboard support');
  assert(resellerDiagnostics.includes('RESELLER_CLIPBOARD_COPY_FALLBACK_FAILED'), 'reseller diagnostics must code failed textarea fallback');
	  assert(resellerDiagnostics.includes('hasResellerClipboardWrite'), 'reseller diagnostics must expose clipboard support helper');
	  assert(resellerDiagnostics.includes('hasResellerCopyFallback'), 'reseller diagnostics must expose copy fallback support helper');
	  assert(resellerDiagnostics.includes("const copied = document.execCommand('copy');"), 'reseller diagnostics fallback must inspect copy acknowledgement');
	  assert(resellerDiagnostics.includes('RESELLER_REQUEST_POLICY'), 'reseller diagnostics must expose shared browser request policy');
	  assert(resellerDiagnostics.includes("cache: 'no-store'"), 'reseller request policy must bypass browser cache');
	  assert(resellerDiagnostics.includes("credentials: 'same-origin'"), 'reseller request policy must keep credentials same-origin');
	  assert(resellerDiagnostics.includes("redirect: 'manual'"), 'reseller request policy must not follow redirects');
	  [
    [
      mobileResellerManagement,
      'mobile reseller management',
      [
        'mobile_reseller_profiles_load_failed',
        'mobile_reseller_monthly_summary_load_failed',
        'mobile_reseller_save_failed',
        'logMobileOwnerFailure',
        'getBoundedMobileOwnerStringContext',
      ],
    ],
    [
      mobileResellerDashboard,
      'mobile reseller dashboard',
      [
        'mobile_reseller_dashboard_add_location_failed',
        'mobile_reseller_dashboard_add_location_rejected',
        'logMobileOwnerFailure',
        'getBoundedMobileOwnerStringContext',
      ],
    ],
    [
      mobileResellerOnboarding,
      'mobile reseller onboarding',
      [
        'mobile_reseller_onboard_failed',
        'mobile_reseller_onboard_rejected',
        'logMobileOwnerFailure',
        'getBoundedMobileOwnerStringContext',
      ],
    ],
    [
      desktopResellerManagement,
      'desktop reseller management',
      [
        'desktop_reseller_profiles_load_failed',
        'desktop_reseller_monthly_summary_load_failed',
        'desktop_reseller_save_failed',
        'logResellerFailure',
        'getBoundedResellerStringContext',
      ],
    ],
    [
      desktopResellerDashboard,
      'desktop reseller dashboard',
      [
        'desktop_reseller_dashboard_add_location_failed',
        'desktop_reseller_dashboard_add_location_rejected',
        'logResellerFailure',
        'getBoundedResellerStringContext',
      ],
    ],
    [
      desktopResellerOnboarding,
      'desktop reseller onboarding',
      [
        'desktop_reseller_onboard_failed',
        'desktop_reseller_onboard_rejected',
        'logResellerFailure',
        'getBoundedResellerStringContext',
      ],
    ],
  ].forEach(([content, label, needles]) => {
    needles.forEach((needle) => {
      assert(content.includes(needle), `${label} must include ${needle}`);
    });
    assert(!content.includes('throw new Error(data.error'), `${label} must not throw raw API response text`);
    assert(!content.includes('data?.error'), `${label} must not show raw API response text`);
    assert(!content.includes('error?.message'), `${label} must not show raw exception text`);
    assert(!content.includes('Toast.show({ content: error'), `${label} must not toast raw exception values`);
  });
  [
    [
      desktopResellerDashboard,
      'desktop reseller dashboard payment handoffs',
      [
	        'desktop_reseller_dashboard_payment_link_copy_failed',
	        'desktop_reseller_dashboard_payment_link_open_failed',
	        'desktop_reseller_dashboard_payment_link_open_blocked',
	        'normalizeRazorpaySubscriptionCheckoutUrl(link)',
	        'copyResellerTextToClipboard(checkoutUrl)',
	        'hasClipboardWrite: hasResellerClipboardWrite()',
	        'hasCopyFallback: hasResellerCopyFallback()',
	        "window.open(checkoutUrl, '_blank', 'noopener,noreferrer')",
	        "getBoundedResellerStringContext('paymentLink', link)",
	        'void copyPaymentLink(record.subscriptionShortUrl, record)',
        'openPaymentLink(record.subscriptionShortUrl, record)',
      ],
    ],
    [
      mobileResellerDashboard,
      'mobile reseller dashboard payment handoffs',
      [
	        'mobile_reseller_dashboard_payment_link_copy_failed',
	        'mobile_reseller_dashboard_payment_link_open_failed',
	        'mobile_reseller_dashboard_payment_link_open_blocked',
	        'copyPaymentLink = async (transaction: ResellerClientRecord)',
	        'copyMobileResellerDashboardText(link)',
	        'MOBILE_RESELLER_DASHBOARD_COPY_UNAVAILABLE',
	        'MOBILE_RESELLER_DASHBOARD_COPY_FALLBACK_FAILED',
	        'hasClipboardWrite: hasMobileResellerDashboardClipboardWrite()',
	        'hasCopyFallback: hasMobileResellerDashboardCopyFallback()',
	        "const copied = document.execCommand('copy');",
	        "window.open(link, '_blank', 'noopener,noreferrer')",
	        "getBoundedMobileOwnerStringContext('paymentLink', link)",
	        'onCopyPaymentLink: (transaction: ResellerClientRecord) => void',
        'onOpenPaymentLink: (transaction: ResellerClientRecord) => void',
      ],
    ],
    [
      desktopResellerOnboarding,
      'desktop reseller onboarding handoffs',
      [
	        'desktop_reseller_onboarding_copy_failed',
	        'type ResellerOnboardingCopyKind',
	        'handleCopyResultValue',
	        'copyResellerTextToClipboard(copyValue)',
	        'hasClipboardWrite: hasResellerClipboardWrite()',
	        'hasCopyFallback: hasResellerCopyFallback()',
	        "getBoundedResellerStringContext('copyValue', copyValue)",
	        "handleCopyResultValue(result.shortUrl, 'payment_link'",
        "handleCopyResultValue(result.dashboardUrl, 'dashboard_link'",
        "handleCopyResultValue(result.publicUrl, 'public_link'",
      ],
    ],
    [
      mobileResellerOnboarding,
      'mobile reseller onboarding handoffs',
      [
        'mobile_reseller_onboarding_copy_failed',
	        'mobile_reseller_onboarding_share_failed',
	        'type MobileResellerOnboardingHandoffKind',
	        'copyMobileResellerOnboardingText(link)',
	        'MOBILE_RESELLER_ONBOARDING_COPY_UNAVAILABLE',
	        'MOBILE_RESELLER_ONBOARDING_COPY_FALLBACK_FAILED',
	        'hasClipboardWrite: hasMobileResellerOnboardingClipboardWrite()',
	        'hasCopyFallback: hasMobileResellerOnboardingCopyFallback()',
	        "const copied = document.execCommand('copy');",
	        'navigator.share({ text: link, title, url: link })',
	        "getBoundedMobileOwnerStringContext('copyValue', link)",
        "getBoundedMobileOwnerStringContext('shareLink', link)",
        "error instanceof DOMException && error.name === 'AbortError'",
      ],
    ],
  ].forEach(([content, label, needles]) => {
    needles.forEach((needle) => {
      assert(content.includes(needle), `${label} must include ${needle}`);
    });
  });
  assert(!desktopResellerOnboarding.includes("navigator.clipboard.writeText(result.shortUrl || '')"), 'desktop reseller onboarding payment link copy must use guarded handoff helper');
  assert(!desktopResellerOnboarding.includes("navigator.clipboard.writeText(result.ownerUsername || '')"), 'desktop reseller onboarding username copy must use guarded handoff helper');
  assert(!desktopResellerOnboarding.includes("navigator.clipboard.writeText(result.loginEmail || '')"), 'desktop reseller onboarding email copy must use guarded handoff helper');
  assert(!desktopResellerOnboarding.includes("navigator.clipboard.writeText(form.getFieldValue('ownerPassword') || '')"), 'desktop reseller onboarding password copy must use guarded handoff helper');
	  assert(!desktopResellerOnboarding.includes("navigator.clipboard.writeText(result.dashboardUrl || '')"), 'desktop reseller onboarding dashboard link copy must use guarded handoff helper');
	  assert(!desktopResellerOnboarding.includes("navigator.clipboard.writeText(result.publicUrl || '')"), 'desktop reseller onboarding public link copy must use guarded handoff helper');
	  assert(!desktopResellerOnboarding.includes('await navigator.clipboard.writeText(copyValue);'), 'desktop reseller onboarding must not use unguarded Clipboard API success');
	  assert(!desktopResellerDashboard.includes('await navigator.clipboard.writeText(link);'), 'desktop reseller dashboard must not use unguarded Clipboard API success');
	  assert(!mobileResellerOnboarding.includes('await navigator.clipboard.writeText(link);'), 'mobile reseller onboarding must not use unguarded Clipboard API success');
	  assert(!mobileResellerDashboard.includes('await navigator.clipboard.writeText(link);'), 'mobile reseller dashboard must not use unguarded Clipboard API success');
	  assert(!desktopResellerOnboarding.includes("document.execCommand('copy');\n            message.success"), 'desktop reseller onboarding textarea fallback must not assume success');
	  assert(!desktopResellerDashboard.includes("document.execCommand('copy');\n            message.success"), 'desktop reseller dashboard textarea fallback must not assume success');
	  assert(!mobileResellerOnboarding.includes("document.execCommand('copy');\n            Toast.show"), 'mobile reseller onboarding textarea fallback must not assume success');
	  assert(!mobileResellerDashboard.includes("document.execCommand('copy');\n            Toast.show"), 'mobile reseller dashboard textarea fallback must not assume success');
	  assert(!mobileResellerOnboarding.includes('Text copyable'), 'mobile reseller onboarding must not use uncontrolled copyable text for returned links or login details');
  assert(!mobileResellerDashboard.includes('onCopyPaymentLink: (link: string) => void'), 'mobile reseller dashboard payment link copy must receive transaction context');
	  assert(!mobileResellerDashboard.includes('onOpenPaymentLink: (link: string) => void'), 'mobile reseller dashboard payment link open must receive transaction context');
	  assert(!desktopResellerDashboard.includes('onClick={() => copyPaymentLink(record.subscriptionShortUrl)}'), 'desktop reseller dashboard copy action must pass transaction context');
	  assert(!desktopResellerDashboard.includes('onClick={() => openPaymentLink(record.subscriptionShortUrl)}'), 'desktop reseller dashboard open action must pass transaction context');
	  assert(resellerDashboardHook.includes('RESELLER_DASHBOARD_REQUEST_POLICY'), 'reseller dashboard hook must share a browser request policy');
	  assert(resellerDashboardHook.includes("cache: 'no-store'"), 'reseller dashboard hook request policy must bypass browser cache');
	  assert(resellerDashboardHook.includes("credentials: 'same-origin'"), 'reseller dashboard hook request policy must keep credentials same-origin');
	  assert(resellerDashboardHook.includes("redirect: 'manual'"), 'reseller dashboard hook request policy must not follow redirects');
	  assert(resellerDashboardHook.includes("fetch('/api/reseller/monthly-summary', RESELLER_DASHBOARD_REQUEST_POLICY)"), 'reseller dashboard monthly summary read must use the shared request policy');
	  assert(resellerDashboardHook.includes("fetch('/api/reseller/profile', RESELLER_DASHBOARD_REQUEST_POLICY)"), 'reseller dashboard profile read must use the shared request policy');
		  assert(resellerDashboardHook.includes("fetch('/api/reseller/clients', RESELLER_DASHBOARD_REQUEST_POLICY)"), 'reseller dashboard clients read must use the shared request policy');
		  assert(desktopResellerManagement.includes("fetch('/api/reseller/manage', RESELLER_REQUEST_POLICY)"), 'desktop reseller management profile reads must use shared request policy');
		  assert(desktopResellerManagement.includes("fetch('/api/reseller/monthly-summary', RESELLER_REQUEST_POLICY)"), 'desktop reseller management monthly reads must use shared request policy');
		  assert(desktopResellerManagement.includes('...RESELLER_REQUEST_POLICY'), 'desktop reseller management saves must use shared request policy');
		  assert(mobileResellerManagement.includes("fetch('/api/reseller/manage', RESELLER_REQUEST_POLICY)"), 'mobile reseller management profile reads must use shared request policy');
		  assert(mobileResellerManagement.includes("fetch('/api/reseller/monthly-summary', RESELLER_REQUEST_POLICY)"), 'mobile reseller management monthly reads must use shared request policy');
		  assert(mobileResellerManagement.includes('...RESELLER_REQUEST_POLICY'), 'mobile reseller management saves must use shared request policy');
		  assert(desktopResellerDashboard.includes('...RESELLER_REQUEST_POLICY'), 'desktop reseller add-location request must use shared request policy');
		  assert(mobileResellerDashboard.includes('...RESELLER_REQUEST_POLICY'), 'mobile reseller add-location request must use shared request policy');
		  assert(desktopResellerOnboarding.includes('...RESELLER_REQUEST_POLICY'), 'desktop reseller onboarding request must use shared request policy');
		  assert(mobileResellerOnboarding.includes('...RESELLER_REQUEST_POLICY'), 'mobile reseller onboarding request must use shared request policy');
		  assert(resellerDiagnostics.includes("secureError('[Reseller] Operation failed'"), 'reseller diagnostics must use secureError');
  assert(resellerDiagnostics.includes('getBoundedResellerStringContext'), 'reseller diagnostics must expose bounded string context');
  assert(resellerDiagnostics.includes('sourceErrorName: getResellerErrorName(error)'), 'reseller diagnostics must include source error name');
  assert(resellerDiagnostics.includes('sourceErrorCode: getResellerErrorCode(error)'), 'reseller diagnostics must include source error code');
  assert(resellerDiagnostics.includes('sourceStatusCode: getResellerErrorStatus(error)'), 'reseller diagnostics must include source status code');
  [
    'reseller_dashboard_monthly_summary_load_failed',
    'reseller_dashboard_profile_load_failed',
    'reseller_dashboard_clients_load_failed',
  ].forEach((failureCode) => {
    assert(resellerDashboardHook.includes(failureCode), `reseller dashboard hook must log ${failureCode}`);
  });
  assert(resellerDashboardHook.includes('logHookFailure'), 'reseller dashboard hook must use bounded hook diagnostics');
  assert(!resellerDashboardHook.includes('data.error ||'), 'reseller dashboard hook must not throw raw reseller API response text');

  const paymentDiagnostics = read('src/hooks/paymentDiagnostics.ts');
  const paymentHook = read('src/hooks/usePaymentHandler.ts');
  const razorpayScriptHook = read('src/hooks/useRazorpayScript.ts');
  const websitePricingPage = read('src/components/website/pricing-pages/index.tsx');
  const websitePricingSuccessModal = read('src/components/website/pricing-pages/SubscriptionPayementSuccessModal.tsx');
  const websiteCreditPacks = read('src/components/website/pricing-pages/shared/CreditPacksCtaSection.tsx');
  const desktopBillingPage = read('src/components/templates/main-app/billing/index.tsx');
  const desktopSubscriptionCard = read('src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx');
  const desktopBillingHistory = read('src/components/templates/main-app/billing/BillingHistory.tsx');
  const mobileBillingScreen = read('src/components/mobile/screens/MobileBillingScreen.tsx');

  assertIncludes(
    'src/hooks/paymentDiagnostics.ts',
    [
      "import { secureError } from '@lib/security/secureLogger';",
      'getBoundedPaymentStringContext',
      'getPaymentFlowLogContext',
      'new Error(failureCode)',
      'sourceErrorName',
      'sourceErrorCode',
    ],
    'payment diagnostics helper',
  );
  assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(paymentDiagnostics), 'payment diagnostics helper must not direct-console failures');

  assertIncludes(
    'src/hooks/usePaymentHandler.ts',
    [
      'logPaymentFailure',
      'payment_subscription_create_failed',
      'payment_subscription_verify_rejected',
      'payment_topup_verify_rejected',
      'payment_post_onboarding_failed',
      'payment_response_parse_failed',
      'getBoundedPaymentStringContext',
      'readJsonResponseWithLimit',
      'PAYMENT_RESPONSE_JSON_MAX_BYTES',
      'readPaymentResponseJson',
      'readPaymentSubscriptionActionResponse',
      'readPaymentVerificationResponse',
      'isPaymentSubscriptionActionResponse',
      'isPaymentSubscriptionVerifyResponse',
      'isPaymentTopupVerifyResponse',
      'PAYMENT_ROUTE_REQUEST_OPTIONS',
      "cache: 'no-store'",
      "credentials: 'same-origin'",
      "redirect: 'manual'",
      'responseOk: response.ok',
      'createPaymentStatusError',
      'payment_subscription_create_rejected',
      'payment_subscription_create_response_invalid',
      'payment_subscription_verify_response_invalid',
      'payment_subscription_cancel_rejected',
      'payment_subscription_cancel_response_invalid',
      'payment_subscription_pause_rejected',
      'payment_subscription_pause_response_invalid',
      'payment_subscription_resume_rejected',
      'payment_subscription_resume_response_invalid',
      'payment_subscription_upgrade_rejected',
      'payment_subscription_upgrade_response_invalid',
      'payment_topup_order_create_rejected',
      'payment_topup_order_create_response_invalid',
      'payment_topup_verify_response_invalid',
      'payment_onboarding_subscription_create_rejected',
      'payment_onboarding_subscription_create_response_invalid',
      'responseStatus: response.status',
      'hasResultError: hasPaymentResponseError(result)',
      "value.status === 'active'",
      'Number.isFinite(value.newCreditBalance)',
    ],
    'payment hook bounded diagnostics',
  );
  assertOccurrenceAtLeast(
    paymentHook,
    '...PAYMENT_ROUTE_REQUEST_OPTIONS',
    9,
    'payment hook billing route requests',
  );
  assert(!paymentHook.includes('json().catch(() => null)'), 'payment hook must not silently swallow payment route response parse failures');
  assert(!paymentHook.includes('const result = await verificationResponse.json()'), 'payment hook verification flows must use the bounded response parser');
  assert(!paymentHook.includes('const { order } = await response.json()'), 'payment hook top-up order creation must validate parsed response shape');
  assert(!paymentHook.includes('const { subscription, tenantId, storeId } = await response.json()'), 'payment hook onboarding subscription creation must validate parsed response shape');
  assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(paymentHook), 'payment hook must not direct-console Razorpay checkout or verification failures');
  assert(!paymentHook.includes('console.log("verificationResponse"'), 'payment hook must not log raw verification responses');
  assert(!paymentHook.includes('Verification failed:'), 'payment hook must not log raw verification failure payloads');
  assert(!paymentHook.includes('Payment flow failed'), 'payment hook must not log raw payment flow errors');
  assert(!paymentHook.includes('Payment failed:'), 'payment hook must not log raw payment errors');
  assert(!paymentHook.includes('errorData.error'), 'payment hook must not throw raw payment API response text');
  assert(!paymentHook.includes('errorData.message'), 'payment hook must not throw raw payment API response messages');
  assert(!paymentHook.includes('reject(result.error)'), 'payment hook must not reject raw verification response text');

  assertIncludes(
    'src/hooks/useRazorpayScript.ts',
    [
      'logPaymentFailure',
      'payment_razorpay_script_load_failed',
    ],
    'Razorpay script hook bounded diagnostics',
  );
  assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(razorpayScriptHook), 'Razorpay script hook must not direct-console script load failures');

  assertIncludes(
    'src/components/website/pricing-pages/index.tsx',
    [
      'logPaymentFailure',
      'payment_pricing_post_onboarding_failed',
      'payment_pricing_card_click_failed',
      'payment_pricing_purchase_intent_parse_failed',
      'payment_pricing_pending_plan_missing',
      'const paymentPromise = onClickPaymentCard',
      'if (!paymentPromise) {',
    ],
    'website pricing bounded payment diagnostics',
  );
  assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(websitePricingPage), 'website pricing payment flow must not direct-console payment failures');
  assert(!websitePricingPage.includes('Post-onboarding process failed in startPaymentprocessing'), 'website pricing must not log raw post-onboarding payment errors');
  assert(!websitePricingPage.includes('Payment flow failed in handlePaymentCardClick'), 'website pricing must not log raw payment card errors');
  assert(!websitePricingPage.includes('User selection was lost. Cannot proceed.'), 'website pricing must not direct-log lost payment selections');

  assertIncludes(
    'src/components/website/pricing-pages/SubscriptionPayementSuccessModal.tsx',
    [
      'DASHBOARD_URL',
      'logPaymentFailure',
      'website_pricing_dashboard_open_failed',
      'website_pricing_dashboard_redirect_failed',
      "window.open(DASHBOARD_URL, '_blank', 'noopener,noreferrer')",
      'window.location.assign(DASHBOARD_URL)',
      "getBoundedPaymentStringContext('dashboardUrl', DASHBOARD_URL)",
      'hasPurchaseIntent: Boolean(purchaseIntent)',
      'hasPaymentDetails: Boolean(paymentDetails)',
    ],
    'website pricing success modal bounded dashboard handoff',
  );
  assert(!websitePricingSuccessModal.includes("window.open('https://dashboard.menulist.ai', '_blank')"), 'website pricing success modal must not use raw dashboard target opens');
  assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(websitePricingSuccessModal), 'website pricing success modal must not direct-console dashboard handoff failures');

  assertIncludes(
    'src/components/website/pricing-pages/shared/CreditPacksCtaSection.tsx',
    [
      'logPaymentFailure',
      'payment_pricing_credit_pack_failed',
      'getBoundedPaymentStringContext',
    ],
    'website credit-pack bounded payment diagnostics',
  );
  assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(websiteCreditPacks), 'website credit-pack payment flow must not direct-console payment failures');
  assert(!websiteCreditPacks.includes('Credit Payment flow failed in handleCreditsCardClick'), 'website credit-pack flow must not log raw payment errors');

  assertIncludes(
    'src/components/templates/main-app/billing/index.tsx',
    [
      'logPaymentFailure',
      'payment_desktop_billing_upgrade_failed',
      'payment_desktop_billing_paid_location_failed',
      'payment_desktop_billing_credit_pack_failed',
      'payment_desktop_billing_store_switch_failed',
      'payment_desktop_billing_subscription_refetch_failed',
      'diagnosticContext={buildBillingPaymentLogContext',
      'getBoundedPaymentStringContext',
    ],
    'desktop billing bounded payment diagnostics',
  );
  assert(!desktopBillingPage.includes("logger.error('Payment flow failed in handleConfirmUpgrade'"), 'desktop billing must not logger.error raw upgrade payment failures');
  assert(!desktopBillingPage.includes("logger.error('Location capacity payment failed in handleAddPaidLocation'"), 'desktop billing must not logger.error raw paid-location payment failures');
  assert(!desktopBillingPage.includes("logger.error('Enhancement pack purchase failed in handleCreditsPurchase'"), 'desktop billing must not logger.error raw credit-pack payment failures');
  assert(!desktopBillingPage.includes('logger.error'), 'desktop billing must not raw-log billing failures');
  assert(!desktopBillingPage.includes('throw new Error(data.error'), 'desktop billing store switch must not throw raw switch-store response text');
  assert(!desktopBillingPage.includes('message.error(error?.message'), 'desktop billing store switch must not show raw exception text');

  assertIncludes(
    'src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx',
    [
      'logPaymentFailure',
      'payment_desktop_subscription_cancel_failed',
      'payment_desktop_subscription_pause_failed',
      'payment_desktop_subscription_resume_failed',
      'payment_desktop_subscription_payment_link_open_failed',
      'getBoundedPaymentStringContext',
      'const subscriptionCheckoutUrl = normalizeRazorpaySubscriptionCheckoutUrl(activeSubscription.shortUrl);',
      "window.open(subscriptionCheckoutUrl, '_blank', 'noopener,noreferrer')",
      "message.error('Subscription cancellation failed. Please contact support.')",
    ],
    'desktop subscription-card bounded payment diagnostics',
  );
  assert(!desktopSubscriptionCard.includes("logger.error('Cancellation failed'"), 'desktop subscription card must not logger.error raw cancellation failures');
  assert(!desktopSubscriptionCard.includes("logger.error('Pause failed'"), 'desktop subscription card must not logger.error raw pause failures');
  assert(!desktopSubscriptionCard.includes("logger.error('Resume failed'"), 'desktop subscription card must not logger.error raw resume failures');
  assert(!desktopSubscriptionCard.includes('message.error(error.message'), 'desktop subscription card must not show raw payment error messages');
  assert(!desktopSubscriptionCard.includes('href={activeSubscription.shortUrl} target="_blank"'), 'desktop subscription card must not use raw payment target links');

  assertIncludes(
    'src/components/templates/main-app/billing/BillingHistory.tsx',
    [
      'logPaymentFailure',
      'payment_desktop_billing_invoice_open_failed',
      "window.open(record.invoiceUrl, '_blank', 'noopener,noreferrer')",
      "getBoundedPaymentStringContext('invoiceUrl', record.invoiceUrl)",
      "message.error('Could not open invoice.')",
    ],
    'desktop billing-history bounded invoice diagnostics',
  );
  assert(!desktopBillingHistory.includes("window.open(record.invoiceUrl, '_blank')"), 'desktop billing history must not use raw invoice target opens');

  assertIncludes(
    'src/components/mobile/screens/MobileBillingScreen.tsx',
    [
      'logPaymentFailure',
      'payment_mobile_billing_plan_update_failed',
      'payment_mobile_billing_paid_location_failed',
      'payment_mobile_billing_credit_pack_failed',
      'payment_mobile_billing_subscription_refetch_failed',
      'payment_mobile_billing_history_load_failed',
      'payment_mobile_billing_store_switch_failed',
      'payment_mobile_subscription_pause_failed',
      'payment_mobile_subscription_resume_failed',
      'payment_mobile_subscription_cancel_failed',
      'payment_mobile_billing_external_link_open_failed',
      "window.open(url, '_blank', 'noopener,noreferrer')",
      "getBoundedPaymentStringContext('externalUrl', url)",
      'getBoundedPaymentStringContext',
    ],
    'mobile billing bounded payment diagnostics',
  );
  assert(!mobileBillingScreen.includes("logger.error('Mobile billing plan update failed'"), 'mobile billing must not logger.error raw plan update payment failures');
  assert(!mobileBillingScreen.includes("logger.error('Mobile paid location update failed'"), 'mobile billing must not logger.error raw paid-location failures');
  assert(!mobileBillingScreen.includes("logger.error('Mobile enhancement pack purchase failed'"), 'mobile billing must not logger.error raw credit-pack failures');
  assert(!mobileBillingScreen.includes("logger.error('Mobile subscription pause failed'"), 'mobile billing must not logger.error raw pause failures');
  assert(!mobileBillingScreen.includes("logger.error('Mobile subscription resume failed'"), 'mobile billing must not logger.error raw resume failures');
  assert(!mobileBillingScreen.includes("logger.error('Mobile subscription cancellation failed'"), 'mobile billing must not logger.error raw cancellation failures');
  assert(!mobileBillingScreen.includes('logger.error'), 'mobile billing must not raw-log billing failures');
  assert(!mobileBillingScreen.includes('throw new Error(data.error'), 'mobile billing store switch must not throw raw switch-store response text');
  assert(!mobileBillingScreen.includes('err?.message'), 'mobile billing must not show raw exception text');
  assert(!mobileBillingScreen.includes("window.open(sub.shortUrl, '_blank')"), 'mobile billing must not use raw retry/payment target opens');
  assert(!mobileBillingScreen.includes("window.open(item.invoiceUrl, '_blank')"), 'mobile billing must not use raw invoice target opens');
  assert(!mobileBillingScreen.includes("Toast.show({ content: err?.message || t('paymentFailedRetry')"), 'mobile billing must not show raw plan/payment update errors');
  assert(!mobileBillingScreen.includes("Toast.show({ content: err?.message || t('purchaseFailed')"), 'mobile billing must not show raw credit-pack payment errors');
  assert(!mobileBillingScreen.includes("Toast.show({ content: err?.message || t('failedToPause')"), 'mobile billing must not show raw pause payment errors');
  assert(!mobileBillingScreen.includes("Toast.show({ content: err?.message || t('failedToResume')"), 'mobile billing must not show raw resume payment errors');
  assert(!mobileBillingScreen.includes("Toast.show({ content: err?.message || t('failedToCancel')"), 'mobile billing must not show raw cancellation payment errors');
}

function verifyMessagingPreviewCheapFail() {
  const previewClientResponse = read('src/lib/messaging-onboarding/previewClientResponse.ts');
  const previewRouteBoundary = read('src/lib/messaging-onboarding/previewRouteBoundary.ts');
  const messagingPublish = read('src/lib/messaging-onboarding/publish.ts');
  const previewPage = read('src/app/(global-pages)/msg-preview/[sessionId]/page.tsx');
  const previewGetRoute = read('src/app/api/msg-preview/[sessionId]/route.ts');

  assert(previewRouteBoundary.includes('MESSAGING_PREVIEW_SESSION_ID_PATTERN = /^[A-Za-z0-9]{20}$/'), 'messaging preview route boundary must accept only Firestore auto-ID session ids');
  assert(previewRouteBoundary.includes('normalizeMessagingPreviewSessionId'), 'messaging preview route boundary must expose a shared normalizer');
  assert(previewRouteBoundary.includes('const raw = typeof value === "string" ? value : "";'), 'messaging preview route boundary must preserve raw route params before normalization');
  assert(previewRouteBoundary.includes('sessionId !== raw'), 'messaging preview route boundary must reject whitespace-mutated session ids');
  assert(previewRouteBoundary.includes('isValidFirestoreDocumentId(sessionId)'), 'messaging preview route boundary must reject Firestore path-shaped session ids');
  assert(messagingPublish.includes('normalizeMessagingPreviewSessionId'), 'messaging preview publish helper must import the shared session id normalizer');
  assert(messagingPublish.includes('const normalizedSessionId = normalizeMessagingPreviewSessionId(sessionId);'), 'messaging preview publish helper must normalize its session id input');
  assert(messagingPublish.includes('throw new Error("Invalid messaging preview session");'), 'messaging preview publish helper must reject malformed session ids before Firestore work');
  assert(messagingPublish.includes('doc(normalizedSessionId)'), 'messaging preview publish helper must use the normalized session id for session doc access');
  assert(!messagingPublish.includes('.doc(sessionId)'), 'messaging preview publish helper must not use raw session id in Firestore doc access');

  assert(previewClientResponse.includes('MESSAGING_PREVIEW_RESPONSE_JSON_MAX_BYTES = 2 * 1024 * 1024'), 'messaging preview client responses must cap response JSON parsing at 2MB');
  assert(previewClientResponse.includes('readJsonResponseWithLimit<unknown>'), 'messaging preview client responses must use the bounded response reader');
  assert(previewClientResponse.includes('messaging_preview_response_parse_failed'), 'messaging preview client responses must log malformed or oversized responses');
  assert(previewClientResponse.includes('messaging_preview_response_invalid'), 'messaging preview client responses must log invalid successful envelopes');
  assert(previewClientResponse.includes('normalizePreviewData'), 'messaging preview client responses must normalize preview GET envelopes');
  assert(previewClientResponse.includes('normalizeApproveResponse'), 'messaging preview client responses must normalize approve envelopes');
  assert(previewClientResponse.includes('normalizeFixResponse'), 'messaging preview client responses must normalize fix envelopes');
  assert(previewClientResponse.includes('normalizeMessagingPreviewMenuData(payload.menuData)'), 'messaging preview client responses must project menu data before page state');
  assert(previewClientResponse.includes('normalizeMessagingPreviewPublishedResult(payload.publishedResult)'), 'messaging preview client responses must project publish handoff data before page state');
  assert(previewClientResponse.includes('normalizeMessagingPreviewCounter(payload.correctionCount)'), 'messaging preview client responses must require exact counters');
  assert(!previewClientResponse.includes('Number(payload.retryAfter)'), 'messaging preview client retry metadata must not coerce runtime values');
  assert(previewClientResponse.includes('payload.maxReached === true'), 'messaging preview fix rejections must preserve max-reached status only');
  assert(previewClientResponse.includes("super('Messaging preview request failed')"), 'messaging preview client errors must use fixed local error text');
  assert(!previewClientResponse.includes('response.json()'), 'messaging preview client parser must not use direct unbounded response parsing');
  assert(!previewClientResponse.includes('.json().catch'), 'messaging preview client parser must not silently swallow malformed response JSON');

  const previewResponseBoundary = read('src/lib/messaging-onboarding/previewResponseBoundary.ts');
  const publicMenuDraftData = read('src/data/shared/publicMenuDraftData.ts');
  assert(previewResponseBoundary.includes('normalizeMessagingPreviewMenuData'), 'messaging preview response boundary must expose the menu projector');
  assert(previewResponseBoundary.includes('normalizeMessagingPreviewPublishedResult'), 'messaging preview response boundary must expose the published-result projector');
  assert(previewResponseBoundary.includes("url.protocol !== 'https:'"), 'messaging preview published URLs must require HTTPS');
  assert(previewResponseBoundary.includes('normalizePublicMenuDraftExtractedData(value)'), 'messaging preview output must delegate to the public draft projector');
  assert(publicMenuDraftData.includes('MAX_CATEGORIES: 100'), 'messaging preview category output must inherit the bounded public draft category cap');
  assert(publicMenuDraftData.includes('MAX_ITEMS: 500'), 'messaging preview item output must inherit the bounded public draft item cap');

  assert(previewGetRoute.includes('normalizeMessagingPreviewMenuData(session.menuData)'), 'messaging preview GET must project persisted menu data before response');
  assert(previewGetRoute.includes('normalizeMessagingPreviewPublishedResult(session.publishedResult)'), 'messaging preview GET must project persisted published result before response');
  assert(previewGetRoute.includes('messaging_preview_persisted_output_invalid'), 'messaging preview GET must fail closed on malformed persisted output');

  assert(previewPage.includes('readMessagingPreviewDataResponse(res)'), 'messaging preview page must use the shared bounded parser for preview loads');
  assert(previewPage.includes('readMessagingPreviewApproveResponse(res)'), 'messaging preview page must use the shared bounded parser for approve responses');
  assert(previewPage.includes('readMessagingPreviewFixResponse(res)'), 'messaging preview page must use the shared bounded parser for fix responses');
  assert(previewPage.includes('getPreviewLoadErrorMessage(err)'), 'messaging preview page must map load failures from status-only diagnostics');
  assert(previewPage.includes('isMessagingPreviewMaxReachedError(err)'), 'messaging preview page must keep max-corrections fixed copy without parsing raw error text');
  assert(previewPage.includes('copyMsgPreviewPublishedLinkToClipboard'), 'messaging preview page must use a guarded copy helper for published links');
  assert(previewPage.includes('msg_preview_success_link_copy_unavailable'), 'messaging preview copy helper must code unavailable clipboard support');
  assert(previewPage.includes('hasClipboardWrite'), 'messaging preview copy diagnostics must include clipboard support metadata');
  assert(previewPage.includes('hasCopyFallback'), 'messaging preview copy diagnostics must include fallback support metadata');
  assert(previewPage.includes('const copied = document.execCommand("copy");'), 'messaging preview copy fallback must inspect copy acknowledgement');
  assert(!previewPage.includes('res.json()'), 'messaging preview page must not use direct response parsing');
  assert(!previewPage.includes('.json().catch'), 'messaging preview page must not silently swallow malformed response JSON');
  assert(!previewPage.includes('err as { maxReached?: unknown }'), 'messaging preview page must not inspect raw fix error payloads directly');
  assert(!previewPage.includes('await navigator.clipboard.writeText(publishResult.publicUrl);\n      setShareError(null);'), 'messaging preview page must not mark link copy success after an unguarded clipboard call');
  assert(!previewPage.includes('document.execCommand("copy");\n    document.body.removeChild(textarea);'), 'messaging preview page must not assume textarea copy fallback success');

  assertOrder(
    'src/app/api/msg-preview/[sessionId]/route.ts',
    [
      'const sessionId = normalizeMessagingPreviewSessionId(rawSessionId);',
      'const sessionHash = hashPublicRateLimitValue(sessionId);',
      '.doc(sessionId);',
    ],
    'message preview GET session id boundary before rate-limit and Firestore read',
  );

  assertIncludes(
    'src/lib/messaging-onboarding/eventMetadata.ts',
    [
      'export function sanitizeMessagingOnboardingEventMetadata',
      'const BOUNDED_EVENT_METADATA_KEYS = new Set',
      'function getBoundedMessagingEventMetadataContext',
      'metadataDroppedCount',
    ],
    'messaging onboarding app event metadata sanitizer',
  );

  assertOrder(
    'src/app/api/msg-preview/[sessionId]/approve/route.ts',
    [
      'const MSG_PREVIEW_ACTION_MAX_BODY_BYTES = 4 * 1024;',
      'const declaredBodyResponse = rejectInvalidOrOversizedDeclaredBody(',
      'const sessionId = normalizeMessagingPreviewSessionId(params?.sessionId);',
      'const ipHash = hashPublicRateLimitValue(ip);',
      'const sessionHash = hashPublicRateLimitValue(sessionId);',
      'const publishLimit = await checkRateLimit({',
      'key: `msg-preview-publish:${sessionHash}:${ipHash}`',
      'const bodyResult = await readBoundedJsonBody(request, MSG_PREVIEW_ACTION_MAX_BODY_BYTES);',
      'const validation = ApproveSchema.safeParse(bodyResult.data);',
      '.doc(sessionId);',
      'await db.runTransaction(async (tx) => {',
    ],
    'message preview approve bounded body and publish ordering',
  );

  assertOrder(
    'src/lib/messaging-onboarding/publish.ts',
    [
      'const normalizedSessionId = normalizeMessagingPreviewSessionId(sessionId);',
      'if (!normalizedSessionId) {',
      'logPublishEvent(normalizedSessionId, sessionData, "PUBLISH_STARTED", "PUBLISHING", {',
      'doc(normalizedSessionId)',
    ],
    'message preview publish helper session id boundary before event writes and Firestore work',
  );
	  assertIncludes(
	    'src/app/api/msg-preview/[sessionId]/approve/route.ts',
	    [
	      'sanitizeMessagingOnboardingEventMetadata({ businessName, businessType })',
	      'messaging_preview_event_write_failed',
	      'eventType: "PREVIEW_APPROVED"',
	      'eventType: "PUBLISH_FAILED"',
	      '{ error: "Session is not ready to publish." }',
	    ],
	    'message preview approve bounded event metadata',
  );

  assertOrder(
    'src/app/api/msg-preview/[sessionId]/fix/route.ts',
    [
      'const MSG_PREVIEW_ACTION_MAX_BODY_BYTES = 4 * 1024;',
      '.min(1)',
      '.max(5)',
      'const declaredBodyResponse = rejectInvalidOrOversizedDeclaredBody(',
      'const sessionId = normalizeMessagingPreviewSessionId(params?.sessionId);',
      'const sessionHash = hashPublicRateLimitValue(sessionId);',
      'const rateLimit = await checkRateLimit({',
      'key: `msg-preview-fix:${sessionHash}:${ipHash}`',
      'const bodyResult = await readBoundedJsonBody(request, MSG_PREVIEW_ACTION_MAX_BODY_BYTES);',
      'const validation = FixRequestSchema.safeParse(bodyResult.data);',
      'const mutation = await applyMessagingOnboardingFixRequest({',
    ],
    'message preview fix bounded body and mutation ordering',
  );

  assertOrder(
    'src/lib/messaging-onboarding/fixRequestTransaction.ts',
    [
      'const sessionId = normalizeMessagingPreviewSessionId(params.sessionId);',
      '.doc(sessionId);',
	      'const result = await db.runTransaction(async (transaction) => {',
	      'const sessionDoc = await transaction.get(sessionRef);',
	      'transaction.update(sessionRef, {',
	      'await cleanupPendingUploads(sessionId);',
	      'return result;',
	    ],
	    'message preview fix helper validates and mutates atomically before post-commit cleanup',
  );
	  assertIncludes(
	    'src/app/api/msg-preview/[sessionId]/fix/route.ts',
	    [
	      'sanitizeMessagingOnboardingEventMetadata({',
	      'messaging_preview_event_write_failed',
		      'eventType: "PREVIEW_FIX_REQUESTED"',
		      'issueCount: issues.length',
		      'correctionNumber,',
		      'hasNote: !!note',
    ],
    'message preview fix bounded event metadata',
  );
	  assertIncludes(
	    'src/lib/messaging-onboarding/publish.ts',
	    [
	      'sanitizeMessagingOnboardingEventMetadata(metadata)',
	      'messaging_onboarding_publish_event_write_failed',
	      'getBoundedRuntimeStringContext("sessionId", sessionId)',
	      'metadataKeyCount: Object.keys(metadata || {}).length',
	    ],
	    'messaging onboarding publish bounded event metadata',
	  );
  [
    ['src/app/api/msg-preview/[sessionId]/approve/route.ts', 'metadata: { businessName, businessType }'],
    ['src/app/api/msg-preview/[sessionId]/approve/route.ts', '{ error: msg }'],
    ['src/app/api/msg-preview/[sessionId]/approve/route.ts', 'key: `publish:${ip}`'],
	    ['src/app/api/msg-preview/[sessionId]/route.ts', 'key: `msg-preview-read:${sessionId}:${ip}`'],
	    ['src/app/api/msg-preview/[sessionId]/route.ts', 'sessionId.length < 10'],
	    ['src/app/api/msg-preview/[sessionId]/route.ts', '.catch(() => { })'],
	    ['src/app/api/msg-preview/[sessionId]/fix/route.ts', 'issues,\n          correctionNumber'],
	    ['src/app/api/msg-preview/[sessionId]/fix/route.ts', 'key: `msg-preview-fix:${sessionId}:${ip}`'],
	    ['src/app/api/msg-preview/[sessionId]/fix/route.ts', 'sessionId.length < 10'],
	    ['src/app/api/msg-preview/[sessionId]/fix/route.ts', '.catch(() => { })'],
	    ['src/app/api/msg-preview/[sessionId]/approve/route.ts', 'sessionId.length < 10'],
	    ['src/app/api/msg-preview/[sessionId]/approve/route.ts', '.catch(() => { })'],
	    ['src/lib/messaging-onboarding/publish.ts', 'metadata,\n      timestamp'],
	    ['src/lib/messaging-onboarding/publish.ts', '.catch(() => {})'],
	  ].forEach(([relPath, rawPattern]) => {
    assert(!read(relPath).includes(rawPattern), `${relPath} must not retain raw messaging event metadata via ${rawPattern}`);
  });
}

function verifyStaffTenantBoundary() {
  assertIncludes(
    'src/app/api/staff/route.ts',
    [
      'withAuth(listStaffUsers)',
      'withAuth(createStaffUser)',
      'withAuth(updateStaffUser)',
      'withAuth(removeStaffFromStore)',
    ],
    'staff route auth wrapper',
  );

  assertIncludes(
    'src/lib/staffManagement/server.ts',
    [
      'CreateStaffSchema',
      'UpdateStaffSchema',
      'RemoveStaffSchema',
      'StaffUserIdSchema',
      'normalizeStaffUserId(value: unknown)',
      'userId === value && userId.length > 0 && userId.length <= 160 && isValidFirestoreDocumentId(userId)',
      'isValidFirestoreDocumentId(userId)',
      'const StaffUserIdSchema = z.string()\n    .min(1)\n    .max(160)\n    .refine((value) => normalizeStaffUserId(value) === value, "Invalid user ID");',
      'const storeScope = normalizeStaffStoreScopeDocumentId(storeId);',
      'const storeScope = normalizeStaffStoreScopeDocumentId(store?.storeId);',
      'const storeScope = normalizeStaffStoreScopeDocumentId(input.storeId);',
      '.doc(storeScope.documentId)',
      'const getAuthority = async (session: any, tenantId: number, targetStoreIds: number[])',
      'const sessionScope = resolveStorePermissionSessionScope(session);',
      'const sessionTenantId = sessionScope?.tenantScope.numericId ?? null;',
      'const sessionStoreId = sessionScope?.storeScope.numericId ?? null;',
      'sessionTenantId !== tenantId',
      'const isEligibleStaffTargetStore = (',
      'store?.active !== false',
      'store?.deleted !== true',
      '!isPlatformEntityBlocked(store)',
      'if (!isEligibleStaffTargetStore(authorityStore, tenantId))',
      'targetIsOwnStoreOnly',
      'getUsersForStore',
      '.where("storeIds", "array-contains", storeIdValue)',
      'normalizeStaffScopeNumericId(doc.data()?.tenantId) === tenantId',
      'visibleStoreIds: authority?.isMaster ? undefined : [authority?.sessionStoreId].filter(isPositiveId)',
      'const targetStore = await fetchStoreById(storeId);',
      'if (!isEligibleStaffTargetStore(targetStore, tenantId))',
      'normalizeStaffScopeNumericId(existingData.tenantId) !== input.tenantId',
      'validateStoreMappings(input.stores, input.tenantId)',
      'if (!isEligibleStaffTargetStore(store, tenantId))',
      'const targetUserId = normalizeStaffUserId(input.userId);',
      '.doc(targetUserId)',
      'sanitizeStaffUserForAuthority(targetUserId',
      'runStaffUserMutationTransaction({',
    ],
    'staff tenant/store authority boundary',
  );

  const staffHelper = read('src/lib/staffManagement/server.ts');
  const staffScopeBoundary = read('src/lib/staffManagement/scopeBoundary.ts');
  const staffConcurrencyBoundary = read('src/lib/staffManagement/concurrencyBoundary.ts');
  assert(staffScopeBoundary.includes('function normalizeStaffStoreScopeDocumentId(value: unknown): StaffStoreScopeDocumentId | null'), 'staff scope boundary must define the exact document-ID normalizer');
  assert(staffScopeBoundary.includes('Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId'), 'staff scope boundary must reject non-canonical numeric IDs');
  assert((staffHelper.match(/userId: StaffUserIdSchema/g) || []).length >= 3, 'staff update/remove/reset schemas must use the staff user ID boundary');
  assert((staffHelper.match(/const targetUserId = normalizeStaffUserId\(input\.userId\);/g) || []).length >= 4, 'staff update/remove/reset/signout paths must normalize target user IDs');
  assert((staffHelper.match(/\.doc\(targetUserId\)/g) || []).length >= 3, 'staff route-side mutation user document refs must use normalized target user IDs');
  assert(staffConcurrencyBoundary.includes('.doc(params.userId)'), 'staff transaction boundary must use the normalized target user ID');
  assert(!staffHelper.includes('const StaffUserIdSchema = z.string()\n    .trim()'), 'staff user ID schema must not trim IDs before boundary validation');
  assert(!staffHelper.includes('.doc(input.userId)'), 'staff mutation user document refs must not use raw input user IDs');
  assert(!staffHelper.includes('sanitizeStaffUserForAuthority(input.userId'), 'staff mutation acknowledgements must not use raw input user IDs');
  assert(!staffHelper.includes('userId: input.userId'), 'staff mutation logs/responses must not use raw input user IDs after normalization');
  assert((staffHelper.match(/normalizeStaffStoreScopeDocumentId/g) || []).length >= 5, 'staff store read/write paths must normalize store scope before refs');
  assert((staffHelper.match(/\.doc\(storeScope\.documentId\)/g) || []).length >= 1, 'staff route-side store document refs must use normalized store scope document IDs');
  assert(staffHelper.includes('const repair = await runStaffRoleMutationTransaction({'), 'staff default-role repair must serialize through the role transaction boundary');
  assert(staffConcurrencyBoundary.includes('.doc(scope.documentId)'), 'staff transaction boundary must use normalized store scope document IDs');
  assert(!staffHelper.includes('.doc(String(storeId))'), 'staff store reads must not use raw store IDs');
  assert(!staffHelper.includes('.doc(String(store.storeId))'), 'staff default-role repair writes must not use raw store IDs');
  assert(staffHelper.includes('const StaffScopeIdSchema = z.number().int().positive().safe();'), 'staff request schemas must reject unsafe numeric tenant/store IDs');
  assert(staffHelper.includes('normalizePersistedStaffStoreMappings'), 'staff persisted store mappings must re-enter exact runtime normalization');
  assert(!staffHelper.includes('Number(doc.data()?.tenantId) === tenantId'), 'staff list tenant filtering must not coerce persisted tenant IDs');
  assert(!staffHelper.includes('Number(existingData.tenantId) !== input.tenantId'), 'staff mutation tenant checks must not coerce persisted tenant IDs');
  assert(!staffHelper.includes('Number(store?.storeId) === sessionStoreId'), 'staff authority role lookup must not coerce mapped store IDs');
  assert(!staffHelper.includes('session?.tId ?? session?.user?.tenantId'), 'staff authority must not select one session tenant alias');
  assert(!staffHelper.includes('session?.sId ?? session?.user?.storeId'), 'staff authority must not select one session store alias');
  [
    'STAFF_PASSCODE_RESET_LEASE_MS',
    'passcodeResetPending: {',
    'StaffPasscodeResetInProgressError',
    'pending.operationId !== passcodeResetOperationId',
    'PASSCODE_RESET_IN_PROGRESS',
    'staff_passcode_reset_audit_finalize_failed',
    'staff_passcode_reset_pending_cleanup_failed',
    'createdFirebaseAuthUser = true',
    'await authAdmin.deleteUser(firebaseUid)',
    'staff_create_auth_compensation_failed',
    '"staff_store_mapping_added"',
    '"staff_store_mapping_changed"',
    '"staff_store_mapping_removed"',
  ].forEach((token) => assert(staffHelper.includes(token), `staff helper must include ${token}`));
  assertOrder(
    'src/lib/staffManagement/server.ts',
    [
      'const passcodeResetOperationId = randomUUID();',
      'await firestoreAdmin.runTransaction(async (transaction) => {',
      'await authAdmin.updateUser(firebaseUser.uid, {',
      'await firestoreAdmin.runTransaction(async (transaction) => {',
    ],
    'staff passcode reset reservation, provider mutation, and finalization order',
  );
  assertOrder(
    'src/lib/staffManagement/server.ts',
    [
      'createdFirebaseAuthUser = true;',
      'persistedNewUserDoc = await createStaffUserDocumentTransaction({',
      'await authAdmin.deleteUser(firebaseUid);',
    ],
    'staff create Auth compensation order',
  );
  [
    'const STAFF_EMAIL_QUERY_LIMIT = 2;',
    '.limit(STAFF_EMAIL_QUERY_LIMIT)',
    'existingUserQuery.size > 1',
    '"EMAIL_RECORD_AMBIGUOUS"',
  ].forEach((token) => assert(staffHelper.includes(token), `staff helper must fail closed on ambiguous email authority through ${token}`));
  assert(!staffHelper.includes('.doc(String(input.storeId))'), 'staff role mutation writes must not use raw store IDs');
  ['store.active === false', 'store.deleted === true', 'isPlatformEntityBlocked(store)']
    .forEach((token) => assert(staffConcurrencyBoundary.includes(token), `staff role transaction must reject unsafe stores through ${token}`));
  assert(staffConcurrencyBoundary.includes("throw new StaffConcurrencyError('LAST_OWNER')"), 'staff transaction boundary must preserve one active owner');
  assert(staffConcurrencyBoundary.includes("throw new StaffConcurrencyError('ROLE_IN_USE')"), 'staff transaction boundary must reject deactivating assigned roles');
  assert(staffConcurrencyBoundary.includes('const MAX_STAFF_ACCESS_ASSIGNMENTS = 500;'), 'staff access-state initialization and persistence must use a closed assignment ceiling');
  assert(staffConcurrencyBoundary.includes('const parseAccessState = ('), 'staff concurrency guard documents must re-enter an exact runtime projector');
  assert(staffConcurrencyBoundary.includes('data.tenantId !== tenantId'), 'staff concurrency guard must require exact persisted tenant identity');
  assert(staffConcurrencyBoundary.includes('data.storeId !== storeId'), 'staff concurrency guard must require exact persisted store identity');
  assert(staffConcurrencyBoundary.includes('!Number.isSafeInteger(data.revision)'), 'staff concurrency guard revisions must reject coercible persisted values');
  assert(staffConcurrencyBoundary.includes('assignments.has(userId)'), 'staff concurrency guard must reject duplicate persisted user assignments');
  assert(staffConcurrencyBoundary.includes('.limit(MAX_STAFF_ACCESS_ASSIGNMENTS + 1)'), 'staff access-state bootstrap queries must use an explicit overflow probe');
  assert(staffConcurrencyBoundary.includes(".where('tenantId', '==', value)"), 'staff access-state bootstrap must scan bounded tenant truth rather than depend on denormalized store aliases');
  assert(!staffConcurrencyBoundary.includes(".where('storeIds', 'array-contains', value)"), 'staff access-state bootstrap must not omit legacy mappings when storeIds is stale or missing');
  assert(!staffConcurrencyBoundary.includes('revision: Number('), 'staff concurrency guard revisions must not use numeric coercion');

  assertIncludes(
    '__docs__/roles-permissions/roles-permissions_impl.md',
    [
      'Staff mutation target user IDs use the shared Firestore document-ID boundary',
      'whitespace-mutated',
      'does not trim `userId` before validation',
      'StaffUserIdSchema',
      '.doc(targetUserId)',
      'sanitizeStaffUserForAuthority(input.userId, ...)',
      'Staff store refs use `normalizeStaffStoreScopeDocumentId()`',
      '.doc(storeScope.documentId)',
    ],
    'roles-permissions implementation doc records staff document-ID boundaries',
  );
  assertIncludes(
    '__docs__/roles-permissions/roles-permissions_firebase.md',
    [
      'Staff mutation user-ID admission is cost-neutral',
      'whitespace-mutated',
      'does not trim `userId` before validation',
      'StaffUserIdSchema',
      '.doc(targetUserId)',
      'Staff store scope document-ID admission is cost-neutral',
      'normalizeStaffStoreScopeDocumentId()',
      '.doc(storeScope.documentId)',
      'Firebase deploy requirement',
    ],
    'roles-permissions Firebase doc records staff document-ID cost boundaries',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'Staff mutation user-ID boundary checkpoint',
      'Staff mutation strict user-ID boundary checkpoint',
      'no longer trims `userId` before `normalizeStaffUserId(value) === value`',
      'normalizeStaffUserId(input.userId)',
      '.doc(targetUserId)',
      'sanitizeStaffUserForAuthority(input.userId, ...)',
      'Staff store scope document-ID boundary checkpoint',
      'normalizeStaffStoreScopeDocumentId()',
      '.doc(storeScope.documentId)',
    ],
    'production-readiness audit records staff document-ID boundaries',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Staff Mutation User ID Boundary',
      'Staff Mutation Strict User ID Boundary',
      'Whitespace-mutated staff user IDs fail closed',
      'StaffUserIdSchema',
      '.doc(targetUserId)',
      'sanitizeStaffUserForAuthority(input.userId, ...)',
      'Staff Store Scope Document ID Boundary',
      'Staff store refs are guarded',
      'normalizeStaffStoreScopeDocumentId()',
    ],
    'changelog records staff document-ID boundaries',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Staff Mutation User ID Boundary',
      'Staff Mutation Strict User ID Boundary',
      'Whitespace-mutated staff user IDs fail closed',
      'StaffUserIdSchema',
      '.doc(targetUserId)',
      'sanitizeStaffUserForAuthority(input.userId, ...)',
      'Staff Store Scope Document ID Boundary',
      'Staff store refs are guarded',
      'normalizeStaffStoreScopeDocumentId()',
    ],
    'lowercase changelog records staff document-ID boundaries',
  );
}

function verifyStaffAndProfileHelperBodyAdmission() {
  const staffHelper = read('src/lib/staffManagement/server.ts');
  assert(staffHelper.includes('readBoundedJsonBody'), 'staff helper must use bounded JSON body parsing');
  assert(staffHelper.includes('const STAFF_MUTATION_MAX_BODY_BYTES = 16 * 1024;'), 'staff helper must cap mutation JSON bodies at 16KB');
  assert(staffHelper.includes('const readStaffMutationBody = (request: NextRequest) => readBoundedJsonBody('), 'staff helper must centralize mutation body admission');
  assert(staffHelper.includes('const sessionUserId = resolveCurrentSessionUserDocumentId(session);'), 'staff helper must resolve exact actor rate-limit identity');
  assert(staffHelper.includes('if (!sessionUserId)'), 'staff helper must reject ambiguous actor rate-limit identity');
  assert(staffHelper.includes('const identityKey = hashPublicRateLimitValue(sessionUserId);'), 'staff helper must hash exact actor rate-limit key material');
  assert(staffHelper.includes('const key = `${keyPrefix}:${identityKey}`;'), 'staff helper must build rate-limit keys from normalized identity material');
  assert((staffHelper.match(/readStaffMutationBody\(request\)/g) || []).length >= 5, 'staff create/update/reset/signout/role save must use bounded body admission');
  assert(!staffHelper.includes('request.json()'), 'staff helper must not parse unbounded JSON');
  assert(!staffHelper.includes('const identityKey = session?.uId || session?.user?.id || hashPublicRateLimitValue(getRequestIp(request));'), 'staff helper must not store raw actor IDs in rate-limit keys');
  assert(!staffHelper.includes('const key = `${keyPrefix}:${session?.uId || session?.user?.id || getRequestIp(request)}`;'), 'staff helper must not store raw request IP fallback in rate-limit keys');
  [
    'getStaffSecurityDetailsLogContext',
    'DIRECT_STAFF_SECURITY_DETAIL_KEYS',
    'getBoundedSecurityRouteContext(session, request)',
    'getBoundedSecurityStringContext("endpoint", request.nextUrl.pathname)',
    'getBoundedStaffStringContext(key, value)',
    'boundedDetails[`${key}Count`] = value.length',
    '...getStaffSecurityDetailsLogContext(details)',
    'logSecurity("Rate Limit Exceeded", session, request, { feature }, "medium")',
  ].forEach((needle) => {
    assert(staffHelper.includes(needle), `staff helper must include bounded security logging token ${needle}`);
  });
  assert(!staffHelper.includes('endpoint: request.nextUrl.pathname,\n        ...details,'), 'staff helper must not spread raw security details into logger.security');
  assert(!staffHelper.includes('buildSecurityContext'), 'staff helper security logs must not import or spread raw route security context');
  assert(!staffHelper.includes('logger.security("Rate Limit Exceeded", {\n        ...buildSecurityContext(session, request),'), 'staff helper rate-limit security logs must use bounded details');
  assert(staffHelper.includes('const FIREBASE_AUTH_SEND_OOB_CODE_URL = "https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode";'), 'staff helper must keep Firebase reset endpoint host/path fixed');
  assert(staffHelper.includes('const normalizeFirebaseAuthApiKey = (value?: string) => {'), 'staff helper must normalize Firebase Auth API keys before provider calls');
  assert(staffHelper.includes('new URL(FIREBASE_AUTH_SEND_OOB_CODE_URL)'), 'staff helper must construct Firebase reset URL with URL');
  assert(staffHelper.includes('endpoint.searchParams.set("key", apiKey);'), 'staff helper must encode Firebase reset API key with searchParams');
  assert(staffHelper.includes('fetch(buildFirebasePasswordResetEndpoint(apiKey), {'), 'staff helper must fetch the encoded Firebase reset endpoint');
  assert(staffHelper.includes('redirect: "manual"'), 'staff helper must not follow Firebase reset provider redirects');
  assert(staffHelper.includes('error: "PASSWORD_RESET_EMAIL_FAILED"'), 'staff helper must use fixed Firebase reset provider failure code');
  assert(staffHelper.includes('createStaffStoreMappingError("DUPLICATE_STORE_MAPPING")'), 'staff helper must throw structured duplicate-store mapping errors');
  assert(staffHelper.includes('staffMappingCode'), 'staff helper must carry store mapping failures through structured error codes');
  [
    'logStaffDiagnostic("staff_auth_user_missing_during_access_sync"',
    'logStaffDiagnostic("staff_auth_user_missing_during_token_revocation"',
    'logStaffDiagnostic("staff_password_setup_email_failed"',
    'logStaffDiagnostic("staff_default_roles_backfilled"',
    'logStaffDiagnostic("staff_existing_user_added_to_store"',
    'logStaffDiagnostic("staff_user_created"',
    'logStaffDiagnostic("staff_owner_passcode_reset"',
    'logStaffDiagnostic("staff_owner_forced_session_signout"',
    'getStaffAuthDiagnosticContext',
    'getBoundedStaffStringContext("providerFailureCode", passwordResetEmail.error)',
    'getBoundedStaffStringContext("tenantId", input.tenantId)',
    'getBoundedStaffStringContext("storeId", input.storeId)',
    'getBoundedStaffStringContext("userId", docRef.id)',
  ].forEach((needle) => {
    assert(staffHelper.includes(needle), `staff helper must include bounded diagnostic token ${needle}`);
  });
  assert(!staffHelper.includes('const rawCode = error instanceof Error ? error.message'), 'staff helper must not derive store mapping response codes from Error.message');
  assert(!staffHelper.includes('accounts:sendOobCode?key=${apiKey}'), 'staff helper must not interpolate Firebase API keys into provider URLs');
  assert(!staffHelper.includes('data?.error?.message'), 'staff helper must not retain Firebase Auth provider failure text');
  assert(!staffHelper.includes('logger.warn("[staff] Firebase Auth user missing during staff access sync"'), 'staff helper must not raw-log missing Firebase Auth users during access sync');
  assert(!staffHelper.includes('logger.warn("[staff] Firebase Auth user missing during staff token revocation"'), 'staff helper must not raw-log missing Firebase Auth users during token revocation');
  assert(!staffHelper.includes('logger.warn("[staff] Password setup email failed"'), 'staff helper must not raw-log staff password setup email failures');
  assert(!staffHelper.includes('logger.info("[staff] Backfilled missing default roles for store"'), 'staff helper must not raw-log staff default-role repair identifiers');
  assert(!staffHelper.includes('logger.info("[staff] Existing user added to store"'), 'staff helper must not raw-log existing staff add identifiers');
  assert(!staffHelper.includes('logger.info("[staff] New staff user created"'), 'staff helper must not raw-log new staff identifiers');
  assert(!staffHelper.includes('logger.info("[staff] Owner-managed staff passcode reset"'), 'staff helper must not raw-log staff passcode reset identifiers');
  assert(!staffHelper.includes('logger.info("[staff] Owner forced staff session signout"'), 'staff helper must not raw-log staff force-signout identifiers');
  assert(!staffHelper.includes('error: passwordResetEmail.error'), 'staff helper must not log raw password setup provider failure fields');

  assertOrder(
      'src/lib/userProfile/server.ts',
      [
        'const USER_PROFILE_UPDATE_MAX_BODY_BYTES = 4 * 1024;',
        'function normalizeProfileUserDocumentId(value: unknown): string | null',
        'const userId = normalizeProfileUserDocumentId(resolveCurrentSessionUserDocumentId(session));',
        'const userRateLimitHash = hashPublicRateLimitValue(userId);',
        'const profileWriteLimit = await checkRateLimit({',
        'key: `profile-update:${userRateLimitHash}`',
        'const bodyResult = await readBoundedJsonBody(request, USER_PROFILE_UPDATE_MAX_BODY_BYTES',
        'const validation = validateAPIInput(UpdateProfileSchema, bodyResult.data);',
        'await userRef.update(updates);',
    ],
    'profile update rate limit and bounded body ordering',
  );
  const profileHelper = read('src/lib/userProfile/server.ts');
  assert(profileHelper.includes('import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";'), 'profile helper must import the shared Firestore document ID guard');
  assert(profileHelper.includes('const USER_PROFILE_DOCUMENT_ID_MAX_LENGTH = 160;'), 'profile helper must cap session user document IDs');
  assert(profileHelper.includes('userId === raw'), 'profile helper must reject whitespace-mutated session user IDs');
  assert(profileHelper.includes('userId.length <= USER_PROFILE_DOCUMENT_ID_MAX_LENGTH'), 'profile helper must reject oversized session user IDs');
  assert(profileHelper.includes('isValidFirestoreDocumentId(userId)'), 'profile helper must reject path-shaped or reserved session user IDs');
  assert(profileHelper.includes('const userRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userId);'), 'profile helper must build user refs only from normalized user IDs');
  assert(!profileHelper.includes('request.json()'), 'profile helper must not parse unbounded JSON');
  assert(!profileHelper.includes('key: `profile-update:${userId}`'), 'profile helper must not store raw user IDs in rate-limit keys');
  assert(!profileHelper.includes('const userId = String(session?.uId || session?.user?.id || "");'), 'profile helper must not coerce raw session user IDs before document-ID validation');
  [
    'logAuthDiagnostic("profile_update_succeeded"',
    'logAuthFailure("profile_update_failed"',
    'getAuthSessionLogContext(session)',
    'getBoundedAuthStringContext("endpoint", request.nextUrl.pathname)',
    'getBoundedSecurityRouteContext(session, request)',
    'getBoundedSecurityStringContext("validationError", validation.error)',
  ].forEach((needle) => {
    assert(profileHelper.includes(needle), `profile helper must include ${needle}`);
  });
  assert(!profileHelper.includes('buildSecurityContext'), 'profile helper security logs must not import or spread raw route security context');
  assert(!profileHelper.includes('logger.info("[update-profile] Updated profile"'), 'profile helper must not raw-log successful profile updates');
  assert(!profileHelper.includes('logger.error("[update-profile] Error"'), 'profile helper must not raw-log profile update failures');
  assertIncludes(
    '__docs__/auth/README.md',
    [
      'Session user ID must pass the shared Firestore document-ID guard',
      'HMAC-hashed normalized session user ID',
      '4KB bounded JSON body before validation or user-document reads',
    ],
    'auth README records profile update user document-ID boundary',
  );
  assertIncludes(
    '__docs__/auth/auth_firebase.md',
    [
      'normalized session user ID',
      'session user ID normalized through the shared Firestore document-ID guard',
      'Malformed, reserved, whitespace-mutated, path-shaped, or oversized session user IDs fail',
    ],
    'auth Firebase docs record profile update user document-ID boundary',
  );
  assertIncludes(
    '__docs__/audits/menulist-production-readiness-audit.md',
    [
      'Profile Update User Document ID Boundary checkpoint',
      'src/lib/userProfile/server.ts',
      'src/lib/firebase/firestoreDocumentId.ts',
      'users/{userId}',
    ],
    'production-readiness audit records profile update user document-ID boundary',
  );
  assertIncludes(
    '__docs__/changelog.md',
    [
      'Profile Update User Document ID Boundary',
      'Profile update user refs are guarded',
      'normalized user ref',
      'raw session-user coercion exclusion',
    ],
    'changelog records profile update user document-ID boundary',
  );

  const permissionsHelper = `${read('src/lib/permissions/scopeDocumentId.ts')}\n${read('src/lib/permissions/server.ts')}`;
  [
    'normalizeStorePermissionScopeDocumentId',
    'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
    '.doc(storeScope.documentId)',
    'getBoundedSecurityRouteContext(session, request)',
    'getBoundedSecurityStringContext("endpoint", request.nextUrl.pathname)',
    'getBoundedSecurityStringContext("label", label)',
    'permissionCount: permissions.length',
    'Authorization Failed - Permission Store Missing',
    'Authorization Failed - Permission Required',
  ].forEach((needle) => {
    assert(permissionsHelper.includes(needle), `permissions helper must include bounded security token ${needle}`);
  });
  assert(!permissionsHelper.includes('.doc(String(storeId))'), 'permissions helper must not build store refs from raw session or target store IDs');
  assert(!permissionsHelper.includes('.doc(String(normalizedStoreId))'), 'permissions helper must not build store refs from loosely normalized store IDs');
  assert(!permissionsHelper.includes('const normalizedStoreId = Number(storeId);'), 'permissions helper must not coerce target store scope before document-ID validation');
  assert(!permissionsHelper.includes('const normalizedTenantId = Number(tenantId);'), 'permissions helper must not coerce target tenant scope before document-ID validation');
  assert(!permissionsHelper.includes('buildSecurityContext'), 'permissions helper must not import or spread raw route security context');
  assert(!permissionsHelper.includes('permissions,\n        storeId,\n        tenantId,'), 'permissions helper must not log raw permission arrays or raw tenant/store IDs');

  const analyticsPropertyAccess = read('src/lib/analytics/googlePropertyAccess.ts');
  [
    'normalizeGoogleAnalyticsScopeDocumentId',
    'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
    '.doc(storeScope.documentId)',
    'getBoundedSecurityRouteContext(session, request)',
    "getBoundedSecurityStringContext('endpoint', request.nextUrl.pathname)",
    "getBoundedSecurityStringContext('requestedPropertyId', requestedPropertyId)",
    'allowedPropertyCount: allowedPropertyIds.length',
    'Authorization Failed - Analytics Property Mismatch',
  ].forEach((needle) => {
    assert(analyticsPropertyAccess.includes(needle), `analytics property helper must include bounded security token ${needle}`);
  });
  assert(!analyticsPropertyAccess.includes('.doc(String(storeId))'), 'analytics property helper must not build configured-store refs from raw session store IDs');
  assert(!analyticsPropertyAccess.includes('buildSecurityContext'), 'analytics property helper must not import or spread raw route security context');
  assert(!analyticsPropertyAccess.includes('requestedPropertyId,\n            storeId,\n            tenantId,'), 'analytics property helper must not log raw property/store/tenant identifiers');
}

function verifyAuthAccountClientResponseDiagnostics() {
  const authAccountResponses = read('src/lib/auth/accountClientResponses.ts');
  const authBrowserRequestPolicy = read('src/lib/auth/browserRequestPolicy.ts');
  const claimAccountRoute = read('src/app/api/auth/claim-account/route.ts');
  const getActiveSessionHelper = read('src/lib/auth/getActiveSession.ts');
  const firebaseAuthSyncHelper = read('src/lib/auth/firebaseAuthSync.ts');
  const firebaseAuthSessionScope = read('src/lib/auth/firebaseAuthSessionScope.ts');
  const loginPage = read('src/components/templates/loginPage/index.tsx');
  const phoneOtpPanel = read('src/components/auth/PhoneOtpAuthPanel.tsx');
  const sessionExpiryMonitor = read('src/components/auth/SessionExpiryMonitor.tsx');
  const desktopProfileModal = read('src/components/organisms/headerComponent/profileActionsModal/userProfileModal/index.tsx');
  const desktopStoreSwitcher = read('src/components/molecules/StoreSwitcher/index.tsx');
  const desktopBillingPage = read('src/components/templates/main-app/billing/index.tsx');
  const desktopLocationsPage = read('src/app/(main)/locations/page.tsx');
  const mobileBillingScreen = read('src/components/mobile/screens/MobileBillingScreen.tsx');
  const mobileLocationsScreen = read('src/components/mobile/screens/MobileLocationsScreen.tsx');
  const mobileMoreScreen = read('src/components/mobile/screens/MobileMoreScreen.tsx');

  assert(authAccountResponses.includes('AUTH_ACCOUNT_RESPONSE_JSON_MAX_BYTES = 16 * 1024'), 'auth account client responses must cap response JSON parsing');
  assert(authAccountResponses.includes('AUTH_ACCOUNT_REQUEST_POLICY'), 'auth account browser requests must share a request policy');
  assert(authAccountResponses.includes('AUTH_ACCOUNT_REQUEST_POLICY = AUTH_BROWSER_REQUEST_POLICY'), 'auth account browser requests must use the shared auth browser request policy');
  assert(claimAccountRoute.includes('getBoundedSecurityRouteContext(null, request)'), 'claim-account security logs must use bounded anonymous route context');
  assert(!claimAccountRoute.includes('buildSecurityContext'), 'claim-account must not spread raw request security context into security logs');
  assert(authBrowserRequestPolicy.includes("cache: 'no-store'"), 'auth account browser requests must bypass browser cache');
  assert(authBrowserRequestPolicy.includes("credentials: 'same-origin'"), 'auth account browser requests must keep credentials same-origin');
  assert(authBrowserRequestPolicy.includes("redirect: 'manual'"), 'auth account browser requests must not follow redirects');
  [
    [getActiveSessionHelper, 'active session helper', ['/api/auth/session']],
    [firebaseAuthSyncHelper, 'Firebase auth sync helper', ['/api/auth/set-claims']],
    [loginPage, 'login page auth handoff', ['/api/auth/validate-claim', '/api/auth/set-claims', '/api/auth/claim-account']],
    [phoneOtpPanel, 'phone OTP auth panel', ['/api/auth/phone-otp/start', '/api/auth/phone-otp/verify']],
    [sessionExpiryMonitor, 'session expiry monitor', ['/api/auth/access-status']],
  ].forEach(([source, label, endpoints]) => {
    endpoints.forEach((endpoint) => {
      assert(source.includes(endpoint), `${label} must keep auth endpoint ${endpoint}`);
    });
    assert(source.includes('AUTH_BROWSER_REQUEST_POLICY'), `${label} must use the shared auth browser request policy`);
  });
  assert(firebaseAuthSyncHelper.includes('firebaseClaimsMatchTargetStore(refreshedToken?.claims, targetStoreId)'), 'Firebase auth claim refresh must verify target-store acknowledgement before active browser context changes');
  assert(firebaseAuthSyncHelper.includes('firebase_auth_claims_refresh_mismatch'), 'Firebase auth claim refresh must code target-store acknowledgement failures');
  assert(firebaseAuthSyncHelper.includes('resolveFirebaseAuthSessionScopeState'), 'Firebase auth sync must use exact session scope state');
  assert(firebaseAuthSyncHelper.includes("sessionScope.status === 'invalid'"), 'Firebase auth sync must distinguish conflicting scope from absent onboarding');
  assert(firebaseAuthSyncHelper.includes('firebase_auth_sync_invalid_session_scope'), 'Firebase auth sync must code contradictory session scope');
  assert(!firebaseAuthSyncHelper.includes('session?.user?.tenantId ?? session?.tId'), 'Firebase auth sync must not select one tenant alias');
  assert(!firebaseAuthSyncHelper.includes('session?.user?.storeId ?? session?.sId'), 'Firebase auth sync must not select one store alias');
  [
    'resolveStorePermissionSessionScope(source)',
    "status: 'absent'",
    "status: 'invalid'",
    "status: 'valid'",
    'source.user?.tId',
    'source.user?.sId',
  ].forEach((token) => assert(firebaseAuthSessionScope.includes(token), `Firebase auth exact session scope boundary missing ${token}`));
  assert(authAccountResponses.includes('readJsonResponseWithLimit<unknown>'), 'auth account client responses must parse through the bounded response reader');
  assert(authAccountResponses.includes('auth_account_response_parse_failed'), 'auth account client responses must log malformed or oversized response parsing failures');
  assert(authAccountResponses.includes('auth_account_response_invalid'), 'auth account client responses must log invalid successful response envelopes');
  assert(authAccountResponses.includes('isProfileUpdateResponse'), 'auth account client responses must validate profile update envelopes');
  assert(authAccountResponses.includes('isPasswordChangeResponse'), 'auth account client responses must validate password change envelopes');
  assert(authAccountResponses.includes('isSwitchStoreResponse'), 'auth account client responses must validate switch-store envelopes');
  assert(authAccountResponses.includes("AuthAccountResponseKind = 'profile_update' | 'password_change' | 'switch_store'"), 'auth account client responses must include switch-store response kind');
  assert(authAccountResponses.includes('success: true'), 'auth account client responses must require successful envelopes');
  assert(authAccountResponses.includes('Array.isArray(value.updated)'), 'profile update response must include updated field names');
  assert(authAccountResponses.includes('isRecord(value.updates)'), 'profile update response must include updates object');
  assert(authAccountResponses.includes('Number.isInteger(value.targetStoreId)'), 'switch-store response must include an integer target store id');
  assert(authAccountResponses.includes('AUTH_SWITCH_STORE_REJECTED'), 'switch-store rejected responses must map to fixed auth account codes');
  assert(authAccountResponses.includes('createAuthDiagnosticError(\'Auth account request failed\''), 'auth account client errors must use fixed local error text');
  assert(authAccountResponses.includes('error.status = response.status'), 'auth account client errors must preserve status-only diagnostics');
  assert(authAccountResponses.includes('error.code = code.slice(0, 64)'), 'auth account client errors may keep bounded response codes');
  assert(!authAccountResponses.includes('response.json()'), 'auth account client responses must not use direct unbounded response parsing');
  assert(!authAccountResponses.includes('.json().catch'), 'auth account client responses must not silently swallow malformed response JSON');

  [
    [desktopProfileModal, 'desktop profile modal'],
    [mobileMoreScreen, 'mobile More account screens'],
  ].forEach(([source, label]) => {
    assert(source.includes('readAuthAccountResponse'), `${label} must use the shared auth account response parser`);
    assert(source.includes('AUTH_ACCOUNT_REQUEST_POLICY'), `${label} must use the shared auth account request policy`);
    assert(!source.includes('/api/auth/update-profile') || !source.includes('data.error ||'), `${label} must not surface raw profile API error text`);
    assert(!source.includes('/api/auth/change-password') || !source.includes('data.error ||'), `${label} must not surface raw password API error text`);
  });

  assert(!desktopProfileModal.includes('const data = await res.json()'), 'desktop profile modal must not use direct profile/password response parsing');
  assert(!desktopProfileModal.includes('res.json().catch'), 'desktop profile modal must not silently swallow account response parsing failures');
  assert(desktopProfileModal.includes('desktop_account_profile_update_failed'), 'desktop profile modal must log bounded profile update failures');
  assert(desktopProfileModal.includes('desktop_account_password_change_failed'), 'desktop profile modal must log bounded password change failures');
  assert(desktopProfileModal.includes('Failed to update profile'), 'desktop profile update fallback must remain fixed local copy');
  assert(desktopProfileModal.includes('Failed to change password'), 'desktop password change fallback must remain fixed local copy');

  [
    [desktopStoreSwitcher, 'desktop header store switcher'],
    [desktopBillingPage, 'desktop billing store switcher'],
    [desktopLocationsPage, 'desktop locations store switcher'],
    [mobileBillingScreen, 'mobile billing store switcher'],
    [mobileLocationsScreen, 'mobile locations store switcher'],
    [mobileMoreScreen, 'mobile More store switcher'],
  ].forEach(([source, label]) => {
    assert(source.includes('/api/auth/switch-store'), `${label} must remain a switch-store caller`);
    assert(source.includes('AUTH_ACCOUNT_REQUEST_POLICY'), `${label} must use the shared auth account request policy for switch-store calls`);
    assert(source.includes("readAuthAccountResponse(res, 'switch_store')"), `${label} must parse and validate switch-store responses before accepting success`);
  });

  assert(!mobileMoreScreen.includes('const data = await res.json()'), 'mobile More account screens must not use direct profile/password response parsing');
  assert(!mobileMoreScreen.includes('res.json().catch'), 'mobile More account screens must not silently swallow account response parsing failures');
  assert(mobileMoreScreen.includes('mobile_account_profile_update_failed'), 'mobile profile screen must log bounded profile update failures');
  assert(mobileMoreScreen.includes('mobile_account_password_change_failed'), 'mobile account access screen must log bounded password change failures');
  assert(mobileMoreScreen.includes('Could not update profile.'), 'mobile profile update fallback must remain fixed local copy');
  assert(mobileMoreScreen.includes('Could not change password.'), 'mobile password change fallback must remain fixed local copy');
}

function verifyStaffClientDiagnostics() {
  const staffClient = read('src/lib/staffManagement/client.ts');
  const staffForm = read('src/components/templates/main-app/users/usersList/userForm/index.tsx');
  const desktopLoginDetails = read('src/components/templates/main-app/users/StaffLoginDetailsContent.tsx');
  const desktopUsers = read('src/components/templates/main-app/users/usersList/index.tsx');
  const desktopRoles = read('src/components/templates/main-app/users/permissions/index.tsx');
  const desktopRoleDetails = read('src/components/templates/main-app/users/permissions/roleDetailsModal.tsx');
  const mobileUsers = read('src/components/mobile/screens/MobileUsersScreen.tsx');
  const mobileRoles = read('src/components/mobile/screens/MobileRolesScreen.tsx');
  const staffLoginShare = read('src/lib/staffManagement/shareLoginDetails.ts');
  const diagnostics = read('src/lib/staffManagement/diagnostics.ts');

  assert(staffClient.includes('STAFF_CLIENT_RESPONSE_JSON_MAX_BYTES = 256 * 1024'), 'staff client must cap response JSON parsing');
  assert(staffClient.includes('STAFF_CLIENT_REQUEST_POLICY'), 'staff client browser requests must share a request policy');
  assert(staffClient.includes('cache: "no-store"'), 'staff client browser requests must bypass browser cache');
  assert(staffClient.includes('credentials: "same-origin"'), 'staff client browser requests must keep credentials same-origin');
  assert(staffClient.includes('redirect: "manual"'), 'staff client browser requests must not follow redirects');
  assert((staffClient.match(/STAFF_CLIENT_REQUEST_POLICY/g) || []).length >= 9, 'staff client must apply the request policy to list, staff mutation, and role mutation calls');
  assert(staffClient.includes('readJsonResponseWithLimit<unknown>'), 'staff client must parse API responses through bounded response reader');
  assert(staffClient.includes('staff_client_response_parse_failed'), 'staff client must code malformed/oversized response parse failures');
  assert(staffClient.includes('staff_client_response_invalid'), 'staff client must code invalid successful response shapes');
  assert(staffClient.includes('staff_create_compatibility_response_invalid'), 'staff client must code invalid create-staff compatibility response shapes');
  assert(staffClient.includes('isStaffListResponse'), 'staff client must validate staff list response shape');
  assert(staffClient.includes('isStaffMutationResponse'), 'staff client must validate staff mutation response shape');
  assert(staffClient.includes('hasConsistentStaffMutationIdentity'), 'staff client must validate staff mutation returned user/userId identity');
  assert(staffClient.includes('return value.user.id === value.userId;'), 'staff client must reject mismatched staff mutation returned user/userId envelopes');
  assert(staffClient.includes('isRoleMutationResponse'), 'staff client must validate role mutation response shape');
  assert(staffClient.includes('isCreateStaffCompatibilityRejectedResponse'), 'staff client must validate create-staff rejected response shapes');
  assert(staffClient.includes('readCreateStaffCompatibilityResponse'), 'staff client must expose bounded create-staff compatibility parser');
  assert(staffClient.includes('new Error("Staff request failed")'), 'staff client must use fixed local API rejection text');
  assert(staffClient.includes('error.status = response.status'), 'staff client must preserve status-only diagnostics');
  assert(staffClient.includes('error.code = code.slice(0, 64)'), 'staff client may keep bounded response codes');
  assert(!staffClient.includes('data?.error ||'), 'staff client must not propagate raw API response error text');
  assert(!staffClient.includes('response.json().catch(() => ({}))'), 'staff client must not silently swallow malformed response JSON');
  assert(!staffClient.includes('const data = await response.json()'), 'staff client must not use direct unbounded response parsing');
  assert(mobileRoles.includes('return <MobileRolesScreenContent key={scopeKey} {...props} />;'), 'Mobile Roles must remount drafts on exact tenant/store changes');
  assert(mobileRoles.includes('roleMutationInFlightRef.current'), 'Mobile Roles must reject duplicate save/delete mutations before React state settles');
  assert(mobileRoles.includes('currentStoreDetails?.tenantId === expectedTenantId'), 'Mobile Roles must scope response settlement to the admitted tenant');
  assert(mobileRoles.includes('currentStoreDetails?.storeId === expectedStoreId'), 'Mobile Roles must scope response settlement to the admitted store');
  assert(mobileRoles.includes('currentStoreDetails?.roles === sourceStoreDetails.roles'), 'Mobile role saves must not overwrite newer same-store role truth');
  assert(mobileRoles.includes('currentStoreDetails?.roles === sourceRoles'), 'Mobile role deletes must not overwrite newer same-store role truth');
  assert(!mobileRoles.includes('setStoreDetails({ ...storeDetails, roles: response.roles })'), 'Mobile Roles must not replace captured generic context after awaited mutations');
  assert(mobileUsers.includes('return <MobileUsersScreenContent key={scopeKey} {...props} />;'), 'Mobile Users must remount local staff state on exact tenant/store changes');
  assert(mobileUsers.includes('staffMutationInFlightRef.current'), 'Mobile Users must synchronously reject duplicate staff mutations');
  assert(mobileUsers.includes('latestLoadRequestRef.current'), 'Mobile Users must invalidate obsolete staff list requests');
  assert(mobileUsers.includes('isExpectedStaffScope(expectedTenantId, expectedStoreId)'), 'Mobile Users must scope response settlement to the admitted tenant/store');
  assert((mobileUsers.match(/!isMountedRef\.current/g) || []).length >= 6, 'Every Mobile Users mutation must reject admission after its mounted scope is obsolete');
  assert(mobileUsers.includes('item.id === user.id && item === user ? response.user : item'), 'Mobile Users must preserve newer same-store user truth');
  assert(!mobileUsers.includes('setUsersList([...users, data.user])'), 'Mobile Users must not replace current staff truth from a captured create list');
  assert(!mobileUsers.includes('setUsersList(users.map('), 'Mobile Users must not replace current staff truth from captured mutation lists');

  assert(staffLoginShare.includes('hasStaffLoginClipboardWrite'), 'staff login share helper must expose Clipboard API support detection');
  assert(staffLoginShare.includes('hasStaffLoginCopyFallback'), 'staff login share helper must expose textarea fallback support detection');
  assert(staffLoginShare.includes('Boolean(document.body)'), 'staff login share helper must require document body before fallback copy');
  assert(staffLoginShare.includes("const copied = doc.execCommand('copy');"), 'staff login share helper must inspect textarea copy acknowledgement');
  assert(staffLoginShare.includes('return copied;'), 'staff login share helper must return acknowledged fallback result');
  assert(staffLoginShare.includes('return false;'), 'staff login share helper must fail closed when copy is unavailable');

	  assert(!/\bconsole\.(?:error|warn|log|debug)\s*\(/.test(staffForm), 'staff user form must not direct-console staff mutation failures');
  assert(staffForm.includes('logStaffClientFailure'), 'staff user form must use bounded staff diagnostics');
  assert(staffForm.includes('staff_create_user_failed'), 'staff user form must log bounded create failures');
  assert(staffForm.includes('staff_update_user_failed'), 'staff user form must log bounded update failures');
  assert(staffForm.includes('"Could not create staff member"'), 'staff create fallback must use a generic owner-facing error');
  assert(staffForm.includes('"Could not update staff member"'), 'staff update fallback must use a generic owner-facing error');
  assert(!staffForm.includes('Staff creation error:'), 'staff user form must remove raw staff creation console diagnostics');
  assert(!staffForm.includes('err.message || "Something went wrong"'), 'staff user form must not expose raw staff mutation error messages');

  [
    'desktop_staff_users_load_failed',
    'desktop_staff_remove_failed',
    'desktop_staff_password_reset_failed',
    'desktop_staff_force_signout_failed',
  ].forEach((failureCode) => {
    assert(desktopUsers.includes(failureCode), `desktop users must log ${failureCode}`);
  });
  [
    'desktop_staff_login_details_copy_failed',
    'desktop_staff_login_details_whatsapp_open_failed',
    'desktop_staff_login_details_native_share_failed',
  ].forEach((failureCode) => {
    assert(desktopLoginDetails.includes(failureCode), `desktop login details must log ${failureCode}`);
  });
  assert(desktopLoginDetails.includes('buildLoginShareLogContext'), 'desktop login details must build bounded login-share diagnostics');
  assert(desktopLoginDetails.includes("getBoundedStaffStringContext('staffLoginId', staffLoginId)"), 'desktop login details must bound Staff ID diagnostic context');
  assert(desktopLoginDetails.includes("getBoundedStaffStringContext('temporaryPasscode', temporaryPasscode)"), 'desktop login details must bound passcode diagnostic context');
	  assert(desktopLoginDetails.includes('fullTextLength: fullText.length'), 'desktop login details must log only login-share text length');
	  assert(desktopLoginDetails.includes('copyValueLength: value.length'), 'desktop login details must log only copied value length');
  assert(desktopLoginDetails.includes('hasStaffLoginClipboardWrite'), 'desktop login details must import staff clipboard support helper');
  assert(desktopLoginDetails.includes('hasClipboardWrite: hasStaffLoginClipboardWrite()'), 'desktop login details copy failures must include Clipboard API support metadata');
  assert(desktopLoginDetails.includes('hasCopyFallback: hasStaffLoginCopyFallback()'), 'desktop login details copy failures must include fallback support metadata');
	  assert(desktopUsers.includes("diagnosticContext={buildDesktopUsersLogContext('login_details_share', data.user)}"), 'desktop password-reset login details must receive bounded diagnostics context');
	  assert(staffForm.includes("diagnosticContext={getStaffMutationLogContext(data.user || userDetails, 'login_details_share')}"), 'desktop staff-create login details must receive bounded diagnostics context');
  [
    'desktop_staff_role_delete_failed',
  ].forEach((failureCode) => {
    assert(desktopRoles.includes(failureCode), `desktop roles must log ${failureCode}`);
  });
  [
    'desktop_staff_role_save_failed',
  ].forEach((failureCode) => {
    assert(desktopRoleDetails.includes(failureCode), `desktop role details must log ${failureCode}`);
  });
  [
    'mobile_staff_users_load_failed',
    'mobile_staff_create_user_failed',
    'mobile_staff_active_toggle_failed',
    'mobile_staff_role_change_failed',
    'mobile_staff_remove_failed',
    'mobile_staff_password_reset_failed',
    'mobile_staff_force_signout_failed',
    'mobile_staff_login_details_copy_failed',
    'mobile_staff_login_details_whatsapp_open_failed',
    'mobile_staff_login_details_native_share_failed',
  ].forEach((failureCode) => {
    assert(mobileUsers.includes(failureCode), `mobile users must log ${failureCode}`);
  });
  assert(mobileUsers.includes('buildLoginShareLogContext'), 'mobile users must build bounded login-share diagnostics');
  assert(mobileUsers.includes("getBoundedStaffStringContext('staffLoginId', staffLoginId)"), 'mobile users must bound Staff ID diagnostic context');
	  assert(mobileUsers.includes("getBoundedStaffStringContext('temporaryPasscode', temporaryPasscode)"), 'mobile users must bound passcode diagnostic context');
	  assert(mobileUsers.includes('fullTextLength: fullText.length'), 'mobile users must log only login-share text length');
	  assert(mobileUsers.includes('copyValueLength: value.length'), 'mobile users must log only copied value length');
  assert(mobileUsers.includes('hasStaffLoginClipboardWrite'), 'mobile users login details must import staff clipboard support helper');
  assert(mobileUsers.includes('hasClipboardWrite: hasStaffLoginClipboardWrite()'), 'mobile users login details copy failures must include Clipboard API support metadata');
  assert(mobileUsers.includes('hasCopyFallback: hasStaffLoginCopyFallback()'), 'mobile users login details copy failures must include fallback support metadata');
  [
    'mobile_staff_role_save_failed',
    'mobile_staff_role_delete_failed',
  ].forEach((failureCode) => {
    assert(mobileRoles.includes(failureCode), `mobile roles must log ${failureCode}`);
  });
  [
    [desktopUsers, 'desktop users'],
    [desktopLoginDetails, 'desktop login details'],
    [desktopRoles, 'desktop roles'],
    [desktopRoleDetails, 'desktop role details'],
    [mobileUsers, 'mobile users'],
    [mobileRoles, 'mobile roles'],
  ].forEach(([content, label]) => {
    assert(content.includes('logStaffClientFailure'), `${label} must use bounded staff diagnostics`);
    assert(content.includes('getBoundedStaffStringContext'), `${label} must use bounded staff context`);
    assert(!content.includes('err?.message'), `${label} must not show raw staff exception text`);
    assert(!content.includes('error?.message'), `${label} must not show raw staff exception text`);
    assert(!content.includes('Toast.show({ content: err'), `${label} must not toast raw staff exception values`);
    assert(!content.includes('Toast.show({ content: error'), `${label} must not toast raw staff exception values`);
  });

  assert(diagnostics.includes("secureError('[Staff Management] Operation failed'"), 'staff diagnostics must use secureError');
  assert(diagnostics.includes("secureLog('[Staff Management] Diagnostic'"), 'staff diagnostics must use secureLog for bounded diagnostic breadcrumbs');
  assert(diagnostics.includes('logStaffDiagnostic'), 'staff diagnostics must expose bounded diagnostic logging');
  assert(diagnostics.includes('getBoundedStaffStringContext'), 'staff diagnostics must expose bounded string context');
  assert(diagnostics.includes('sourceErrorName: getStaffClientErrorName(error)'), 'staff diagnostics must include source error name');
  assert(diagnostics.includes('sourceErrorCode: getStaffClientErrorCode(error)'), 'staff diagnostics must include source error code');
  assert(diagnostics.includes('sourceStatusCode: getStaffClientErrorStatus(error)'), 'staff diagnostics must include source status code');
}

verifyPublicPullApiResponseCacheBoundary();
verifyComplianceBrowserRequestPolicyBoundary();
verifyBrowserDirectFirebaseFunctionsCallableBoundary();
verifyBrowserDirectFirebaseFunctionsCallableBoundaryDocs();
verifyNoApiDirectBodyParsers();
verifyNoApiRawZodFlattenDetails();
verifyNoApiRouteConsoleCalls();
verifyNoUnreviewedAliasedApiMethodExports();
verifyMenuListMutatingApiAdmissionGuards();
verifyMenuListReadApiAdmissionGuards();
verifyCoreAuthHelpers();
verifyOwnerSelectedScopeRoutes();
verifyCallerSuppliedTenantStoreRoutes();
verifyPosSyncOwnerSafeFailureContract();
verifyPosSyncWebhookNetworkGuard();
verifyMultiOutletPublicTruthWriteRoutes();
verifyMobileLocationsFailureContract();
verifySessionScopedPublicTruthRoutes();
verifyPlatformAdminMutationBoundedBodies();
verifyOpsMutationBoundedBodies();
verifyAuthClaimAndCacheBoundaries();
verifyPublicTruthMutationBoundedBodies();
verifyLinkedOutletSaveResponseDiagnostics();
verifyTempStatusClientResponseDiagnostics();
verifyHelpCenterSearchClientResponseDiagnostics();
verifyDeploymentVersionResponseDiagnostics();
verifyPublicCustomerSignalBoundedBodies();
verifyAnalyticsErrorBoundary();
verifyOwnerUtilitySecureLogging();
verifyPublicOperationalSignalCheapFail();
verifyReviewsReputationDormantBoundary();
verifyPaymentWebhookCheapFail();
verifyPaymentMutationBoundedJson();
verifyMessagingPreviewCheapFail();
verifyStaffTenantBoundary();
verifyStaffAndProfileHelperBodyAdmission();
verifyAuthAccountClientResponseDiagnostics();
verifyStaffClientDiagnostics();

if (failures.length > 0) {
  console.error('MenuList API tenant-safety verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('MenuList API tenant-safety verifier passed.');
