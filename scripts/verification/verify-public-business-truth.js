require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
  require: ['tsconfig-paths/register'],
});

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
}

function assertOrder(content, first, second, label) {
  const firstIndex = content.indexOf(first);
  const secondIndex = content.indexOf(second);
  assert(
    firstIndex !== -1 && secondIndex !== -1 && firstIndex < secondIndex,
    `${label} must include ${first} before ${second}`,
  );
}

function assertOccurrenceAtLeast(content, needle, minimum, label) {
  const count = content.split(needle).length - 1;
  assert(count >= minimum, `${label} must include ${needle} at least ${minimum} times, found ${count}`);
}

function listSourceFiles(dir) {
  const absDir = path.join(ROOT, dir);
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const relPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
      return listSourceFiles(relPath);
    }
    if (!/\.(?:ts|tsx)$/.test(entry.name) || entry.name.endsWith('.d.ts')) return [];
    return [relPath];
  });
}

function listMenuListBrowserSurfaceFiles() {
  return [
    ...listSourceFiles('src/app'),
    ...listSourceFiles('src/components'),
  ].filter((relPath) => (
    !relPath.startsWith('src/app/api/')
    && !relPath.startsWith('src/app/sites/answerlattice/')
    && !relPath.includes('/answerlattice/')
  ));
}

function collectValuesByKey(value, targetKey, values = []) {
  if (!value || typeof value !== 'object') {
    return values;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === targetKey && typeof child === 'string') {
      values.push(child);
      continue;
    }

    collectValuesByKey(child, targetKey, values);
  }

  return values;
}

function verifyMenuListBrowserSurfacesDoNotWriteFirestoreDirectly() {
  const mutationSymbols = [
    'addDoc',
    'deleteDoc',
    'runTransaction',
    'setDoc',
    'updateDoc',
    'writeBatch',
  ];
  const importPattern = /import\s*{([^}]+)}\s*from\s*['"](?:@firebase|firebase)\/firestore['"]/gs;
  const namespaceImportPattern = /import\s+\*\s+as\s+\w+\s+from\s*['"](?:@firebase|firebase)\/firestore['"]/;
  const failures = [];

  for (const relPath of listMenuListBrowserSurfaceFiles()) {
    const content = read(relPath);

    for (const match of content.matchAll(importPattern)) {
      const importedSymbols = match[1]
        .split(',')
        .map((entry) => entry.trim().split(/\s+as\s+/)[0].trim())
        .filter(Boolean);
      const importedMutationSymbols = importedSymbols.filter((symbol) => mutationSymbols.includes(symbol));
      if (importedMutationSymbols.length > 0) {
        failures.push(`${relPath}: imports ${importedMutationSymbols.join(', ')} from firebase/firestore`);
      }
    }

    if (namespaceImportPattern.test(content)) {
      const usesMutationSymbol = mutationSymbols.some((symbol) => new RegExp(`\\.${symbol}\\s*\\(`).test(content));
      if (usesMutationSymbol) {
        failures.push(`${relPath}: imports firebase/firestore namespace and calls a mutation helper`);
      }
    }
  }

  const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  assert(
    failures.length === 0,
    `MenuList browser surfaces must not import direct Firestore mutation helpers; use DALs or API routes instead:\n${failures.join('\n')}`,
  );
  assertIncludes(productionReadinessAudit, 'Browser surface Firestore mutation boundary checkpoint', 'Production readiness audit browser Firestore mutation boundary checkpoint');
  assertIncludes(productionReadinessAudit, 'scans active MenuList browser surfaces for direct Firestore mutation helper imports', 'Production readiness audit browser Firestore mutation scan');
  assertIncludes(changelog, 'Browser Firestore mutations are source-gated', 'Changelog browser Firestore mutation source gate');
  assertIncludes(changelog, '`npm run verify:public-business-truth` now scans active MenuList browser surfaces for direct Firestore mutation helper imports', 'Changelog browser Firestore mutation scan');
}

const DIRECT_FIRESTORE_READ_LISTENER_ALLOWLIST = new Map([
  ['src/app/screen/[token]/ScreenDisplay.tsx', new Set(['doc', 'onSnapshot'])],
  ['src/app/screen/[token]/MenuBoardDisplay.tsx', new Set(['doc', 'onSnapshot'])],
  ['src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx', new Set([
    'collection',
    'getDocs',
    'limit',
    'orderBy',
    'query',
  ])],
  ['src/components/templates/platform/chatManagement/WeeklyDigest.tsx', new Set(['doc', 'getDoc'])],
]);

function verifyMenuListBrowserSurfacesUseAllowedFirestoreReadsOnly() {
  const readOrListenerSymbols = [
    'collection',
    'doc',
    'documentId',
    'getCountFromServer',
    'getDoc',
    'getDocs',
    'limit',
    'onSnapshot',
    'orderBy',
    'query',
    'startAfter',
    'where',
  ];
  const importPattern = /import\s*{([^}]+)}\s*from\s*['"](?:@firebase|firebase)\/firestore['"]/gs;
  const namespaceImportPattern = /import\s+\*\s+as\s+\w+\s+from\s*['"](?:@firebase|firebase)\/firestore['"]/;
  const failures = [];

  for (const relPath of listMenuListBrowserSurfaceFiles()) {
    const content = read(relPath);
    const allowedSymbols = DIRECT_FIRESTORE_READ_LISTENER_ALLOWLIST.get(relPath) || new Set();

    for (const match of content.matchAll(importPattern)) {
      const importedSymbols = match[1]
        .split(',')
        .map((entry) => entry.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim())
        .filter(Boolean);
      const importedReadSymbols = importedSymbols.filter((symbol) => readOrListenerSymbols.includes(symbol));
      const unapprovedReadSymbols = importedReadSymbols.filter((symbol) => !allowedSymbols.has(symbol));
      if (unapprovedReadSymbols.length > 0) {
        failures.push(`${relPath}: imports ${unapprovedReadSymbols.join(', ')} from firebase/firestore`);
      }
    }

    if (namespaceImportPattern.test(content)) {
      const usesReadSymbol = readOrListenerSymbols.some((symbol) => new RegExp(`\\.${symbol}\\s*\\(`).test(content));
      if (usesReadSymbol && !DIRECT_FIRESTORE_READ_LISTENER_ALLOWLIST.has(relPath)) {
        failures.push(`${relPath}: imports firebase/firestore namespace and calls a read/listener helper`);
      }
    }
  }

  const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  assert(
    failures.length === 0,
    `MenuList browser surfaces must not import direct Firestore read/listener helpers outside the approved UI allowlist; use DALs, API routes, or shared helpers instead:\n${failures.join('\n')}`,
  );
  assertIncludes(productionReadinessAudit, 'Browser surface Firestore read/listener boundary checkpoint', 'Production readiness audit browser Firestore read/listener boundary checkpoint');
  assertIncludes(productionReadinessAudit, 'direct Firestore read/listener helper imports', 'Production readiness audit browser Firestore read/listener scan');
  assertIncludes(changelog, 'Browser Firestore reads and listeners are source-gated', 'Changelog browser Firestore read/listener source gate');
  assertIncludes(changelog, '`npm run verify:public-business-truth` now scans active MenuList browser surfaces for direct Firestore read/listener helper imports', 'Changelog browser Firestore read/listener scan');
}

function verifyStoreUpdatesRequireAcknowledgement() {
  const storesDal = read('src/database/stores/index.tsx');
  assertIncludes(storesDal, 'export function assertStoreUpdateSucceeded', 'Store update acknowledgement guard');

  const failures = [];
  for (const relPath of listSourceFiles('src')) {
    const content = read(relPath);
    if (!content.includes('updateStore(')) continue;

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed.includes('updateStore(')) return;
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      if (/^(?:export\s+)?(?:async\s+)?function\s+updateStore\b/.test(trimmed)) return;
      if (/^(?:export\s+)?const\s+updateStore\b/.test(trimmed)) return;

      const followup = lines.slice(index, index + 35).join('\n');
      if (!followup.includes('assertStoreUpdateSucceeded(')) {
        failures.push(`${relPath}:${index + 1}`);
      }
    });
  }

  assert(
    failures.length === 0,
    `Every src updateStore() call must require assertStoreUpdateSucceeded() before local success state; missing near:\n${failures.join('\n')}`,
  );
}

function verifyTenantWritesRequireAcknowledgement() {
  const tenantsDal = read('src/database/tenants/index.tsx');
  assertIncludes(tenantsDal, 'export function assertTenantUpdateSucceeded', 'Tenant update acknowledgement guard');
  assertIncludes(tenantsDal, "if (!nextTenantName) throw new Error('tenant_create_name_invalid');", 'Tenant create must reject a missing canonical name before ID reservation or persistence.');
  assertIncludes(tenantsDal, "if ('name' in nextData && !nextTenantName) throw new Error('tenant_update_name_invalid');", 'Tenant update must reject an explicit canonical-name clear before persistence.');

  const tenantHelpers = [
    { helper: 'addTenant(', acknowledgement: 'assertTenantUpdateSucceeded(' },
    { helper: 'updateTenant(', acknowledgement: 'assertTenantUpdateSucceeded(' },
  ];
  const failures = [];

  for (const relPath of listSourceFiles('src')) {
    const content = read(relPath);
    if (!tenantHelpers.some(({ helper }) => content.includes(helper))) continue;

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const match = tenantHelpers.find(({ helper }) => trimmed.includes(helper));
      if (!match) return;
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      if (relPath === 'src/database/tenants/index.tsx') return;
      if (/^(?:export\s+)?(?:async\s+)?function\s+(?:addTenant|updateTenant)\b/.test(trimmed)) return;
      if (/^(?:export\s+)?const\s+(?:addTenant|updateTenant)\b/.test(trimmed)) return;

      const followup = lines.slice(index, index + 45).join('\n');
      if (!followup.includes(match.acknowledgement)) {
        failures.push(`${relPath}:${index + 1}:${match.helper}`);
      }
    });
  }

  assert(
    failures.length === 0,
    `Every src tenant write/stores-list call must require its tenant acknowledgement guard before local success state; missing near:\n${failures.join('\n')}`,
  );
}

function verifyPlatformUserWritesRequireAcknowledgement() {
  const usersDal = read('src/database/users/index.ts');
  assertIncludes(usersDal, 'export function assertUserUpdateSucceeded', 'User update acknowledgement guard');

  const userHelpers = [
    'addPlatformUser(',
    'addStoreToUser(',
    'updatePlatformUser(',
  ];
  const failures = [];

  for (const relPath of listSourceFiles('src')) {
    const content = read(relPath);
    if (!userHelpers.some((helper) => content.includes(helper))) continue;

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const helper = userHelpers.find((candidate) => trimmed.includes(candidate));
      if (!helper) return;
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      if (relPath === 'src/database/users/index.ts') return;
      if (/^(?:export\s+)?(?:async\s+)?function\s+(?:addPlatformUser|addStoreToUser|updatePlatformUser)\b/.test(trimmed)) return;
      if (/^(?:export\s+)?const\s+(?:addPlatformUser|addStoreToUser|updatePlatformUser)\b/.test(trimmed)) return;

      const followup = lines.slice(index, index + 45).join('\n');
      if (!followup.includes('assertUserUpdateSucceeded(')) {
        failures.push(`${relPath}:${index + 1}:${helper}`);
      }
    });
  }

  assert(
    failures.length === 0,
    `Every src platform-user write call must require assertUserUpdateSucceeded() before local success state; missing near:\n${failures.join('\n')}`,
  );
}

function verifyProjectWritesRequireAcknowledgement() {
  const projectsDal = read('src/database/projects/index.ts');
  assertIncludes(projectsDal, 'export function assertProjectUpdateSucceeded', 'Project update acknowledgement guard');

  const writeHelpers = [
    'addProject(',
    'publishProject(',
    'updateProject(',
    'updateProjectMetadata(',
    'updateProjectWithoutLoader(',
  ];
  const failures = [];

  for (const relPath of listSourceFiles('src')) {
    const content = read(relPath);
    if (!writeHelpers.some((helper) => content.includes(helper))) continue;

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const helper = writeHelpers.find((candidate) => trimmed.includes(candidate));
      if (!helper) return;
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      if (relPath === 'src/database/projects/index.ts') return;
      if (/^(?:export\s+)?(?:async\s+)?function\s+(?:addProject|publishProject|updateProject|updateProjectMetadata|updateProjectWithoutLoader)\b/.test(trimmed)) return;
      if (/^(?:export\s+)?const\s+(?:addProject|publishProject|updateProject|updateProjectMetadata|updateProjectWithoutLoader)\b/.test(trimmed)) return;

      const followup = lines.slice(index, index + 45).join('\n');
      if (!followup.includes('assertProjectUpdateSucceeded(')) {
        failures.push(`${relPath}:${index + 1}:${helper}`);
      }
    });
  }

  assert(
    failures.length === 0,
    `Every src project write/create/publish call must require assertProjectUpdateSucceeded() before local success state; missing near:\n${failures.join('\n')}`,
  );
}

function verifyProjectLifecycleMutationsRequireAcknowledgement() {
  const projectsDal = read('src/database/projects/index.ts');
  assertIncludes(projectsDal, 'export function assertProjectUpdateSucceeded', 'Project update acknowledgement guard');
  assertIncludes(projectsDal, 'export function assertProjectDeleteSucceeded', 'Project delete acknowledgement guard');

  const lifecycleHelpers = [
    { helper: 'deleteProject(', acknowledgement: 'assertProjectDeleteSucceeded(' },
    { helper: 'duplicateProject(', acknowledgement: 'assertProjectUpdateSucceeded(' },
    { helper: 'restoreProject(', acknowledgement: 'assertProjectUpdateSucceeded(' },
    { helper: 'setProjectActive(', acknowledgement: 'assertProjectUpdateSucceeded(' },
  ];
  const failures = [];

  for (const relPath of listSourceFiles('src')) {
    const content = read(relPath);
    if (!lifecycleHelpers.some(({ helper }) => content.includes(helper))) continue;

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const match = lifecycleHelpers.find(({ helper }) => trimmed.includes(helper));
      if (!match) return;
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      if (relPath === 'src/database/projects/index.ts') return;
      if (/^(?:export\s+)?(?:async\s+)?function\s+(?:deleteProject|duplicateProject|restoreProject|setProjectActive)\b/.test(trimmed)) return;
      if (/^(?:export\s+)?const\s+(?:deleteProject|duplicateProject|restoreProject|setProjectActive)\b/.test(trimmed)) return;

      const followup = lines.slice(index, index + 45).join('\n');
      if (!followup.includes(match.acknowledgement)) {
        failures.push(`${relPath}:${index + 1}:${match.helper}`);
      }
    });
  }

  assert(
    failures.length === 0,
    `Every src project lifecycle mutation call must require its project acknowledgement guard before local success state; missing near:\n${failures.join('\n')}`,
  );
}

function verifyPublicMenuApiSourceOfTruth() {
  const route = read('src/app/api/public/v1/menu/route.ts');
  const businessRoute = read('src/app/api/public/v1/business/route.ts');
  const publicApiAuth = read('src/lib/publicApi/auth.ts');

  assertIncludes(route, 'parseSummaryProjects', 'Public menu API default project resolver');
  assertIncludes(route, 'DB_COLLECTIONS.PLATFORM_SUMMARY', 'Public menu API default project resolver');
  assertIncludes(route, 'project.isDefault === true', 'Public menu API default project resolver');
  assertIncludes(route, 'projects[0]', 'Public menu API fallback resolver');
  assertIncludes(route, 'projectData.menuVersion', 'Public menu API menu version');
  assertIncludes(route, 'generatedAt', 'Public menu API response contract');
  assertIncludes(route, 'validatePublicApiKey(apiKey)', 'Public menu API live API-key validation');
  assertIncludes(route, 'const tenantDocumentId = resolveMenuListPublicApiTenantDocumentId(storeData);', 'Public menu API coherent tenant document-ID normalization');
  assertIncludes(route, 'const storeDocumentId = normalizePublicApiDocumentId(storeId);', 'Public menu API store document-ID normalization');
  assertIncludes(route, 'const tenantNumericId = normalizeMenuListPublicApiNumericId(tenantDocumentId);', 'Public menu API tenant numeric response guard');
  assertIncludes(route, 'const storeNumericId = normalizeMenuListPublicApiNumericId(storeDocumentId);', 'Public menu API store numeric response guard');
  assertIncludes(route, '.doc(tenantDocumentId)', 'Public menu API normalized tenant project ref');
  assertIncludes(route, '.collection(storeDocumentId)', 'Public menu API normalized store project ref');
  assertIncludes(route, '.doc(`projects_${storeDocumentId}`)', 'Public menu API normalized projects summary ref');
  assertIncludes(route, 'const projectDocumentId = normalizePublicApiDocumentId(projectId);', 'Public menu API project document-ID normalization');
  assertNotIncludes(route, 'cacheTtlMs', 'Public menu API validation cache');
  assertIncludes(route, "logSecurityFailure('public_api_menu_route_failed'", 'Public menu API bounded route diagnostics');
  assertIncludes(route, 'const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);', 'Public menu API hashed rate-limit key segment');
  assertIncludes(route, 'key: `public-api:${apiKeyRateLimitId}`', 'Public menu API rate-limit key does not include raw API key');
  assertIncludes(route, 'buildPullApiResponseHeaders(etag)', 'Public menu API private cache headers');
  assertIncludes(route, "getBoundedSecurityStringContext('apiKey', apiKey)", 'Public menu API bounded API-key context');
  assertIncludes(route, "getBoundedSecurityStringContext('projectId', projectData.projectId)", 'Public menu API bounded project context');
  assertNotIncludes(route, "secureError('[Public API] Menu endpoint error'", 'Public menu API raw route diagnostics');
  assertNotIncludes(route, 'key: `public-api:${apiKey}`', 'Public menu API raw API-key rate-limit key');
  assertNotIncludes(route, "'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'", 'Public menu API shared cache headers');
  assertNotIncludes(route, ".where('isDefault', '==', true)", 'Public menu API project lookup');

  assertIncludes(businessRoute, 'validatePublicApiKey(apiKey)', 'Public business API live API-key validation');
  assertIncludes(businessRoute, 'const storeNumericId = normalizeMenuListPublicApiNumericId(storeId);', 'Public business API store numeric response guard');
  assertIncludes(businessRoute, 'const storeDocumentId = String(storeNumericId);', 'Public business API normalized store diagnostic/logging ID');
  assertNotIncludes(businessRoute, 'cacheTtlMs', 'Public business API validation cache');
  assertIncludes(businessRoute, "logSecurityFailure('public_api_business_route_failed'", 'Public business API bounded route diagnostics');
  assertIncludes(businessRoute, 'const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);', 'Public business API hashed rate-limit key segment');
  assertIncludes(businessRoute, 'key: `public-api:${apiKeyRateLimitId}`', 'Public business API rate-limit key does not include raw API key');
  assertIncludes(businessRoute, 'buildPullApiResponseHeaders(etag)', 'Public business API private cache headers');
  assertIncludes(businessRoute, "getBoundedSecurityStringContext('apiKey', apiKey)", 'Public business API bounded API-key context');
  assertIncludes(businessRoute, "getBoundedSecurityStringContext('storeId', storeDocumentId)", 'Public business API bounded store context');
  assertNotIncludes(businessRoute, "secureError('[Public API] Business endpoint error'", 'Public business API raw route diagnostics');
  assertNotIncludes(businessRoute, 'key: `public-api:${apiKey}`', 'Public business API raw API-key rate-limit key');
  assertNotIncludes(businessRoute, 'Number(storeId)', 'Public business API raw store ID numeric coercion');
  assertNotIncludes(businessRoute, "'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'", 'Public business API shared cache headers');

  assertIncludes(publicApiAuth, 'export function normalizePublicApiDocumentId(value: unknown): string | null', 'Public pull API document-ID normalizer');
  assertIncludes(publicApiAuth, 'export function normalizeMenuListPublicApiNumericId(value: unknown): number | null', 'Public pull API numeric ID normalizer');
  assertIncludes(publicApiAuth, 'const tenantDocumentId = resolveMenuListPublicApiTenantDocumentId(storeData);', 'Public pull API coherent tenant numeric/document-ID guard');
  assertIncludes(publicApiAuth, 'isMenuListPublicApiTenantIdentityConsistent(tenantData, tenantDocumentId)', 'Public pull API canonical tenant identity guard');
  assertIncludes(publicApiAuth, 'PULL_API_RESPONSE_CACHE_CONTROL = "private, max-age=60, stale-while-revalidate=300"', 'Public pull API private response cache control');
  assertIncludes(publicApiAuth, 'PULL_API_RESPONSE_VARY = "X-API-Key"', 'Public pull API API-key vary header');
  assertIncludes(publicApiAuth, 'buildPullApiResponseHeaders', 'Public pull API shared response header helper');
  assertIncludes(publicApiAuth, "secureLog('[Public API] Request'", 'Public pull API request logging fixed event name');
  assertIncludes(publicApiAuth, 'requestIpHash: hashPublicRateLimitValue(getClientIp(request))', 'Public pull API request logging hashed IP');
  assertIncludes(publicApiAuth, "getBoundedSecurityStringContext('storeId', storeId)", 'Public pull API request logging bounded store context');
  assertIncludes(publicApiAuth, "getBoundedSecurityStringContext('userAgent', userAgent)", 'Public pull API request logging bounded user-agent context');
  assertNotIncludes(publicApiAuth, 'secureLog(`[Public API] ${endpoint}`', 'Public pull API request logging raw dynamic event');
  assertNotIncludes(publicApiAuth, 'userAgent: userAgent.slice', 'Public pull API request logging raw user-agent');
  assertNotIncludes(publicApiAuth, '        storeId,\n        ip,', 'Public pull API request logging raw store/IP context');
  assertNotIncludes(publicApiAuth, '.doc(String(tenantId))', 'Public pull API raw tenant document ref');
}

function verifyPublicCreateMenuRoutePrivacy() {
  const createRoute = read('src/app/api/public/create-menu/route.ts');
  const claimRoute = read('src/app/api/public/create-menu/claim/route.ts');

  assertIncludes(createRoute, 'const userRateLimitHash = hashPublicRateLimitValue(userId);', 'Public create-menu entry hashed user rate-limit segment');
  assertIncludes(createRoute, 'key: `public-menu-entry:${userRateLimitHash}`', 'Public create-menu entry hashed rate-limit key');
  assertIncludes(createRoute, 'key: `public-menu-entry-status:${userRateLimitHash}:${draftRateLimitHash}`', 'Public create-menu status hashed rate-limit key');
  assertIncludes(createRoute, 'PUBLIC_MENU_ENTRY_STORAGE_CLEANUP_FAILED', 'Public create-menu storage cleanup diagnostics');
  assertIncludes(createRoute, 'PUBLIC_MENU_ENTRY_COLLISION_LOOKUP_FAILED', 'Public create-menu collision lookup diagnostics');
  assertIncludes(createRoute, 'deletePublicMenuEntryStoragePath', 'Public create-menu bounded storage cleanup helper');
  assertIncludes(createRoute, 'buildIdempotentPublicDraftToken', 'Public create-menu deterministic owner/content draft identity');
  assertIncludes(createRoute, 'batch.create(jobRef', 'Public create-menu collision-safe job creation');
  assertIncludes(createRoute, 'batch.create(draftRef', 'Public create-menu collision-safe draft creation');
  assertIncludes(createRoute, 'await batch.commit();', 'Public create-menu atomic draft/job commit');
  assertIncludes(createRoute, 'const downloadToken = draftToken;', 'Public create-menu deterministic object metadata token');
  assertIncludes(createRoute, 'getReusableDraftByIdForUser', 'Public create-menu deterministic collision recovery');
  assertIncludes(createRoute, 'getPublicMenuDraftTimestampMillis', 'Public create-menu runtime TTL normalization');
  assertIncludes(createRoute, 'expiresAtMillis === null', 'Public create-menu malformed TTL fail-closed boundary');
  assertNotIncludes(createRoute, 'key: `public-menu-entry:${userId}`', 'Public create-menu entry raw user rate-limit key');
  assertNotIncludes(createRoute, '.doc(draftToken).set({', 'Public create-menu non-atomic draft write');
  assertNotIncludes(createRoute, 'extractionJobId: null', 'Public create-menu transient orphan draft state');
  assertNotIncludes(createRoute, 'bucket.file(storagePath).delete({ ignoreNotFound: true }).catch(() => undefined)', 'Public create-menu silent storage cleanup catch');
  assertNotIncludes(createRoute, 'firestoreAdmin.collection(COLLECTION).doc(draftToken).delete().catch(() => undefined)', 'Public create-menu silent draft cleanup catch');
  assertNotIncludes(createRoute, 'Promise.allSettled(createdStoragePaths.map((path) => storageAdmin.bucket().file(path).delete', 'Public create-menu silent link-storage cleanup catch');

  assertIncludes(claimRoute, 'const userRateLimitHash = hashPublicRateLimitValue(userId);', 'Public create-menu claim hashed user rate-limit segment');
  assertIncludes(claimRoute, 'key: `public-menu-claim:${userRateLimitHash}`', 'Public create-menu claim hashed rate-limit key');
  assertIncludes(claimRoute, 'function normalizePublicMenuClaimNumericDocumentId(', 'Public create-menu claim target document-ID normalizer');
  assertIncludes(claimRoute, 'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId', 'Public create-menu claim positive numeric target ID guard');
  assertIncludes(claimRoute, 'const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantDocumentId);', 'Public create-menu claim normalized tenant ref');
  assertIncludes(claimRoute, 'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId);', 'Public create-menu claim normalized store ref');
  assertIncludes(claimRoute, '.doc(tenantDocumentId)', 'Public create-menu claim normalized project tenant ref');
  assertIncludes(claimRoute, '.collection(storeDocumentId)', 'Public create-menu claim normalized project store ref');
  assertIncludes(claimRoute, 'normalizePublicMenuDraftExtractedData(draft.extractedData, {', 'Public create-menu claim persisted DTO validation');
  assertIncludes(claimRoute, 'getPublicMenuDraftTimestampMillis(draft.expiresAt)', 'Public create-menu claim runtime TTL validation');
  assertIncludes(claimRoute, 'normalizePublicDraftSourcesForProject(draft, draftId', 'Public create-menu claim source-envelope validation');
  assertIncludes(claimRoute, 'allowedBucket: storageAdmin.bucket().name', 'Public create-menu claim configured Storage bucket binding');
  assertIncludes(claimRoute, 'normalizeCompletedClaimResult(draft, userId)', 'Public create-menu claim idempotent exact-owner recovery');
  assertIncludes(claimRoute, 'convertedTenantId: tenantId', 'Public create-menu claim complete retry receipt');
  assertIncludes(claimRoute, 'convertedProjectSlug: projectSlug', 'Public create-menu claim project-slug retry receipt');
  assertIncludes(claimRoute, 'convertedSubdomain: subdomain', 'Public create-menu claim subdomain retry receipt');
  assertIncludes(claimRoute, 'Promise.allSettled(cacheEffects.map((effect) => effect.run()))', 'Public create-menu claim independent cache effects');
  assertNotIncludes(claimRoute, 'key: `public-menu-claim:${userId}`', 'Public create-menu claim raw user rate-limit key');
  assertNotIncludes(claimRoute, 'const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(String(tenantId));', 'Public create-menu claim raw tenant document ref');
  assertNotIncludes(claimRoute, 'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(storeId));', 'Public create-menu claim raw store document ref');
  assertNotIncludes(claimRoute, 'const projectCollectionPath = `${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}`;', 'Public create-menu claim raw project collection path');
}

function verifyHoursDoNotInventOpenState() {
  const hoursConfidence = read('src/lib/outputControl/hoursConfidence.ts');
  const hoursImplDoc = read('__docs__/hours-holiday-accuracy/hours-holiday-accuracy_impl.md');
  const hoursFirebaseDoc = read('__docs__/hours-holiday-accuracy/hours-holiday-accuracy_firebase.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const { getStoreStatus } = require('../../src/lib/hours/hoursEngine');
  const { hasPublicHoursTruth, resolveHoursOutput } = require('../../src/lib/outputControl/hoursConfidence');

  assertIncludes(hoursConfidence, 'hours_confidence_timestamp_parse_failed', 'Hours confidence timestamp parse diagnostic');
  assertIncludes(hoursConfidence, 'logHoursTimestampParseFailure', 'Hours confidence bounded timestamp parse logger');
  assertIncludes(hoursConfidence, 'MAX_HOURS_TIMESTAMP_PARSE_DIAGNOSTICS', 'Hours confidence diagnostic cap');
  assertIncludes(hoursConfidence, 'reportedHoursTimestampParseFailures', 'Hours confidence per-shape diagnostic guard');
  assertIncludes(hoursConfidence, 'getBoundedRuntimeStringContext("timestampValueKind", valueKind)', 'Hours confidence bounded timestamp kind context');
  assertIncludes(hoursConfidence, 'safeHasTimestampProperty(value, "toDate", "function")', 'Hours confidence safe toDate shape guard');
  assertIncludes(hoursConfidence, 'Number.isFinite(value.getTime())', 'Hours confidence invalid Date guard');
  assertIncludes(hoursConfidence, 'Number.isFinite(seconds)', 'Hours confidence invalid serialized seconds guard');
  assertIncludes(hoursConfidence, 'Number.isFinite(value) ? toValidDate(new Date(value)) : null', 'Hours confidence invalid numeric timestamp guard');
  assertIncludes(hoursConfidence, 'catch (error)', 'Hours confidence timestamp parse catch must retain source error');
  assertNotIncludes(hoursConfidence, '    } catch {\n        // Silent fail\n    }', 'Hours confidence timestamp parse fallback must not fail silently');
  assertIncludes(hoursImplDoc, 'Output Control timestamp diagnostics', 'Hours implementation doc timestamp diagnostics');
  assertIncludes(hoursFirebaseDoc, 'Output Control timestamp diagnostics', 'Hours Firebase doc timestamp diagnostics');
  assertIncludes(audit, 'Hours confidence timestamp diagnostics checkpoint', 'Production audit hours confidence timestamp diagnostics checkpoint');
  assertIncludes(changelog, 'Hours Confidence Timestamp Diagnostics', 'Changelog hours confidence timestamp diagnostics checkpoint');

  const missingHours = getStoreStatus(undefined, 'UTC');
  assert(missingHours.isOpen === false, 'Missing hours must not render as open');
  assert(missingHours.statusText === 'Hours not available', 'Missing hours must render as unavailable');

  const noHoursOutput = resolveHoursOutput({
    workingHours: undefined,
    timeZone: 'UTC',
  });
  assert(noHoursOutput.confidenceState === 'BROKEN', 'Output control must treat missing hours as broken');
  assert(noHoursOutput.statusText === 'Check with store', 'Output control must suppress missing-hours authority');
  assert(hasPublicHoursTruth(undefined, undefined) === false, 'Missing public hours must not imply closed');
  assert(hasPublicHoursTruth({}, {}) === false, 'Empty public hours records must not imply closed');
  assert(hasPublicHoursTruth({ mon: 'closed' }, undefined) === true, 'Explicit closed working hours remain known truth');
  assert(hasPublicHoursTruth(
    undefined,
    { '2026-08-26': { hours: 'closed' } },
    'UTC',
    new Date('2026-08-26T12:00:00.000Z'),
  ) === true, 'Explicit current-date special hours remain known truth');
  assert(hasPublicHoursTruth(
    undefined,
    { '2026-08-25': { hours: 'closed' } },
    'UTC',
    new Date('2026-08-26T12:00:00.000Z'),
  ) === false, 'Another date special-hours record must not imply the current date is closed');

  const invalidNumericFreshness = resolveHoursOutput({
    workingHours: { mon: '09:00-17:00' },
    hoursLastUpdatedAt: Number.NaN,
    timeZone: 'UTC',
  });
  assert(invalidNumericFreshness.confidenceState === 'BROKEN', 'Output control must treat invalid numeric freshness as broken');
  assert(invalidNumericFreshness.statusText === 'Check with store', 'Output control must not trust invalid numeric freshness');

  const invalidSerializedFreshness = resolveHoursOutput({
    workingHours: { mon: '09:00-17:00' },
    hoursLastUpdatedAt: { seconds: Number.NaN },
    timeZone: 'UTC',
  });
  assert(invalidSerializedFreshness.confidenceState === 'BROKEN', 'Output control must treat invalid serialized freshness as broken');
  assert(invalidSerializedFreshness.statusText === 'Check with store', 'Output control must not trust invalid serialized freshness');

  const unknownDayOnly = resolveHoursOutput({
    workingHours: { someday: '09:00-17:00' },
    hoursLastUpdatedAt: Date.now(),
    timeZone: 'UTC',
  });
  assert(unknownDayOnly.confidenceState === 'BROKEN', 'Output control must reject hours with no canonical weekday');

  for (const invalidHours of ['25:00-26:00', '09:00-09:00', 'arbitrary']) {
    const invalidStructure = resolveHoursOutput({
      workingHours: { mon: invalidHours },
      hoursLastUpdatedAt: Date.now(),
      timeZone: 'UTC',
    });
    assert(invalidStructure.confidenceState === 'BROKEN', `Output control must reject invalid hours ${invalidHours}`);
  }
}

function verifyTimedCategoriesUseStoreTruth() {
  const menuPage = read('src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx');
  const decisionBlocks = read('src/components/templates/main-app/projects/b2cView/output/DecisionBlocks.tsx');
  const timedCategories = read('src/hooks/useTimedCategories.ts');
  const readme = read('__docs__/client-menu/README.md');
  const firebaseDoc = read('__docs__/client-menu/client-menu_firebase.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  assertIncludes(menuPage, 'activeItemCategoryIds.has(cat.id)', 'Public menu category visibility');
  assertIncludes(
    menuPage,
    'isCategoryVisibleByTime(category, storeDetails?.timeZone, categoryVisibilityNow)',
    'Public menu category single-timestamp timezone evaluation',
  );
  assertIncludes(menuPage, 'item.active !== false && typeof item.category', 'Public menu item visibility');
  assertIncludes(menuPage, 'if (!categoriesById.has(categoryId))', 'Public menu item-link category admission');
  assertIncludes(menuPage, 'hiddenScheduledCategories.length > 0', 'Public menu scheduled-category empty state');
  assertIncludes(menuPage, 'items={visibleItems}', 'Public menu Featured and filter controls use admitted items');
  assertIncludes(menuPage, 'setSelectedItem(null);', 'Public menu closes item detail when category truth is withdrawn');
  assertIncludes(menuPage, 'getNextSlotOccurrence(', 'Public menu scheduled-category next-day truth');
  assertIncludes(menuPage, "|| t('menu.temporarilyUnavailable');", 'Public menu malformed schedule fallback presentation');
  assertIncludes(menuPage, '60000 - (Date.now() % 60000) + 25', 'Public menu minute-boundary category refresh');
  assertIncludes(menuPage, 'if (selectedItemRef.current === item) return;', 'Public menu minute refresh does not re-scroll an open item');
  assertNotIncludes(menuPage, 'if (allItems.length === 0) return; // Wait for items to load', 'Public menu stale item links on empty catalogs');
  assertIncludes(decisionBlocks, 'if (!category) return false;', 'Decision Blocks reject missing public categories');
  assertIncludes(decisionBlocks, 'return isWithinTimeSlot(category.timeSlots, storeTimeZone);', 'Decision Blocks shared timed-category evaluator');
  assertIncludes(timedCategories, 'public_menu_decision_blocks_timezone_failed', 'Decision Blocks timezone diagnostics');
  assertIncludes(timedCategories, 'logTimedCategoryTimezoneFailure', 'Decision Blocks bounded timezone logger');
  assertIncludes(timedCategories, 'day: now.getUTCDay()', 'Timed category deterministic timezone fallback day');
  assertIncludes(timedCategories, 'now.getUTCHours() * 60 + now.getUTCMinutes()', 'Timed category deterministic timezone fallback time');
  assertNotIncludes(timedCategories, 'day: now.getDay()', 'Timed category customer-device timezone fallback');
  assertIncludes(timedCategories, 'reportedTimedCategoryTimezoneFailures', 'Decision Blocks one-per-shape timezone guard');
  assertIncludes(timedCategories, "getBoundedRuntimeStringContext('timeZone', timeZone)", 'Decision Blocks bounded timezone context');
  assertIncludes(timedCategories, "new Error('invalid_timed_category_time_parts')", 'Decision Blocks invalid time-part diagnostic');
  assertNotIncludes(timedCategories, '} catch {\n            // Fall back to browser time if the store timezone is invalid.\n        }', 'Decision Blocks timezone fallback must not be silent');
  assertNotIncludes(decisionBlocks, 'console.error', 'Decision Blocks direct error logging');
  assertNotIncludes(decisionBlocks, 'console.warn', 'Decision Blocks direct warn logging');
  assertIncludes(readme, 'Decision Blocks timezone diagnostics', 'Client menu README Decision Blocks timezone diagnostics');
  assertIncludes(firebaseDoc, 'Decision Blocks timezone diagnostics', 'Client menu Firebase Decision Blocks timezone diagnostics');
  assertIncludes(audit, 'Public menu Decision Blocks timezone diagnostics checkpoint', 'Production audit Decision Blocks timezone diagnostics checkpoint');
  assertIncludes(changelog, 'Public Menu Decision Blocks Timezone Diagnostics', 'Changelog Decision Blocks timezone diagnostics checkpoint');

  const { isWithinTimeSlot } = require('../../src/hooks/useTimedCategories');
  const noonUtc = new Date('2026-01-01T12:30:00.000Z');
  const lunchSlot = [{ startTime: '12:00', endTime: '13:00' }];

  assert(isWithinTimeSlot(lunchSlot, 'UTC', noonUtc) === true, 'Timed categories must match store UTC time');
  assert(isWithinTimeSlot(lunchSlot, 'America/New_York', noonUtc) === false, 'Timed categories must not use customer/browser timezone');
  assert(isWithinTimeSlot([{ startTime: '12:00' }], 'UTC', noonUtc) === false, 'Partial timed category slots must not crash or render visible');
}

function verifyPublicMenuPublicationIndicatorUsesPublishedTruth() {
  const menuHeader = read('src/components/templates/main-app/projects/b2cView/output/MenuHeader.tsx');
  assertIncludes(menuHeader, 'modifiedOn={projectData?.lastPublishedAt}', 'Public menu live/published indicator requires an actual publish timestamp');
  assertNotIncludes(menuHeader, 'modifiedOn={(projectData as any)?.modifiedOn}', 'Public menu live/published indicator must not treat draft modification as publication');
}

function verifyDomainOwnershipComparisonIsTypeSafe() {
  const route = read('src/app/api/domain/route.ts');
  const claim = read('src/lib/routing/customDomainClaim.ts');

  assertIncludes(route, 'readCustomDomainReservationInTransaction({', 'Custom domain transactional ownership guard');
  assertIncludes(route, 'writeReservedCustomDomainClaim(', 'Custom domain reservation write');
  assertIncludes(route, 'writeCurrentCustomDomainClaim(', 'Custom domain committed ownership write');
  assertIncludes(route, 'const reservationId = randomUUID();', 'Custom domain request-unique reservation identity');
  assertIncludes(route, 'getVercelProjectDomain(normalizedDomain)', 'Custom domain provider conflict project verification');
  assertIncludes(route, 'providerConflictHasMenuListProvenance', 'Custom domain cross-product/provider conflict provenance gate');
  assertIncludes(claim, ".where('customDomain', '==', domain)", 'Custom domain legacy ownership query');
  assertIncludes(claim, '.limit(2)', 'Custom domain duplicate ownership detection');
  assertIncludes(claim, 'throw new CustomDomainUnavailableError()', 'Custom domain stable collision failure');
  assertIncludes(claim, "String(claim.reservationId || '') !== reservationId", 'Custom domain same-store reservation isolation');
  assertNotIncludes(route, 'const existingStore = await db', 'Custom domain non-transactional duplicate lookup');
  assertNotIncludes(route, 'String(existingStoreId) !== String(storeId)', 'Custom domain embedded store-ID collision authority');
}

function verifyVercelDomainPathSegmentsAreEncoded() {
  const helper = read('src/lib/domains/vercelDomains.ts');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const storesFirebase = read('__docs__/stores-management/stores-management_firebase.md');
  const urlRoutingFirebase = read('__docs__/url-routing-architecture/url-routing-architecture_firebase.md');

  assertIncludes(helper, 'function encodeVercelPathSegment', 'Vercel domain helper path-segment encoder');
  assertIncludes(helper, 'return encodeURIComponent(normalized);', 'Vercel domain helper URL-encodes path segments');
  assertIncludes(helper, 'VERCEL_DOMAIN_RESPONSE_JSON_MAX_BYTES', 'Vercel domain helper response JSON cap');
  assertIncludes(helper, 'VERCEL_DOMAIN_PROVIDER_TIMEOUT_MS', 'Vercel domain helper provider timeout');
  assertIncludes(helper, 'const controller = new AbortController();', 'Vercel domain helper abort controller');
  assertIncludes(helper, 'setTimeout(() => controller.abort(), VERCEL_DOMAIN_PROVIDER_TIMEOUT_MS)', 'Vercel domain helper timeout abort');
  assertIncludes(helper, 'signal: controller.signal', 'Vercel domain helper timeout signal');
  assertIncludes(helper, 'clearTimeout(timeout)', 'Vercel domain helper timeout cleanup');
  assertIncludes(helper, 'readJsonResponseWithLimit<T>(response, VERCEL_DOMAIN_RESPONSE_JSON_MAX_BYTES)', 'Vercel domain helper bounded JSON parsing');
  assertIncludes(helper, 'VERCEL_DOMAIN_PROVIDER_RESPONSE_PARSE_FAILED', 'Vercel domain helper fixed response-parse diagnostic code');
  assertIncludes(helper, 'readVercelDomainResponseData<T>(response, path, options)', 'Vercel domain helper uses guarded response parser');
  assertIncludes(helper, "secureError(\n            '[Vercel Domain] Provider response parse failed'", 'Vercel domain helper logs bounded provider response parse failures');
  assertIncludes(helper, 'getVercelProviderPathContext(path, options, response)', 'Vercel domain helper bounded provider response parse context');
  assertIncludes(helper, 'pathLength: path.length', 'Vercel domain helper records path length only');
  assertIncludes(helper, 'pathPresent: path.trim().length > 0', 'Vercel domain helper records path presence only');
  assertIncludes(helper, 'responseStatus: response.status', 'Vercel domain helper records provider response status');
  assertIncludes(helper, "redirect: 'manual',", 'Vercel domain helper manual redirect boundary');
  assertIncludes(helper, '`/v10/projects/${encodeVercelPathSegment(getVercelDomainProjectId())}/domains`', 'Vercel add-domain project path encoding');
  assertIncludes(helper, '`/v6/domains/${encodeVercelPathSegment(domain)}/config`', 'Vercel domain config path encoding');
  assertIncludes(helper, '`/v9/projects/${encodeVercelPathSegment(getVercelDomainProjectId())}/domains/${encodeVercelPathSegment(domain)}`', 'Vercel remove-domain path encoding');
  assertNotIncludes(helper, 'response.json().catch(() => ({} as T))', 'Vercel domain helper raw JSON parsing');
  assertNotIncludes(helper, 'readJsonResponseWithLimit<T>(response, VERCEL_DOMAIN_RESPONSE_JSON_MAX_BYTES).catch(() => ({} as T))', 'Vercel domain helper silent bounded parser fallback');
  assertNotIncludes(helper, '`/v6/domains/${domain}/config`', 'Vercel domain config raw path interpolation');
  assertNotIncludes(helper, '`/v9/projects/${getVercelDomainProjectId()}/domains/${domain}`', 'Vercel remove-domain raw path interpolation');
  [
    [productionAudit, 'production audit'],
    [changelog, 'changelog'],
    [storesFirebase, 'Stores Management Firebase docs'],
    [urlRoutingFirebase, 'URL routing Firebase docs'],
  ].forEach(([content, label]) => {
    assertIncludes(content, 'Vercel domain provider response', `${label} documents Vercel provider response parse boundary`);
    assertIncludes(content, 'vercel_domain_provider_response_parse_failed', `${label} documents Vercel provider response parse diagnostic`);
    assertIncludes(content, 'path presence/length', `${label} documents bounded provider path metadata`);
  });
}

function verifyCustomDomainDocsMatchVerificationBoundary() {
  const website = read('__docs__/client-menu/client-menu_website.md');
  const architecture = read('__docs__/client-menu/multi-tenant-architecture.md');
  const route = read('src/app/api/domain/route.ts');
  const helper = read('src/lib/domains/vercelDomains.ts');
  const lookup = read('src/lib/firestore/clientStoreLookup.ts');
  const clientPage = read('src/app/client/[[...slug]]/page.tsx');

  [
    [website, 'Client Menu website'],
    [architecture, 'Client Menu multi-tenant architecture'],
  ].forEach(([content, label]) => {
    [
      'Custom domains are fully supported with automatic SSL',
      'fully supported with automatic SSL',
      'automatic SSL',
      'Vercel auto-provisions SSL certificate',
      'Vercel Domains API (Future Automation)',
      'You add the domain in Vercel Dashboard',
      'Manual per Client',
      'custom domains are live immediately',
      'Custom domains go live instantly',
    ].forEach((stalePhrase) => {
      assertNotIncludes(content, stalePhrase, `${label} custom-domain verification copy`);
    });
  });

  assertIncludes(website, 'MenuList serves it after verification', 'Client Menu website custom-domain verification copy');
  assertIncludes(website, 'Vercel handles the certificate after the domain is accepted and configured', 'Client Menu website certificate boundary copy');
  assertIncludes(architecture, '`GET /api/domain` checks Vercel', 'Client Menu architecture verified-domain reconciliation authority');
  assertIncludes(architecture, 'starts a new hostname unverified', 'Client Menu architecture starts new domains unverified');
  assertIncludes(architecture, 'reconciles `domainVerified` in both directions', 'Client Menu architecture bidirectional Vercel verification boundary');
  assertIncludes(architecture, 'Certificate provisioning is provider-managed after the domain is accepted and configured', 'Client Menu architecture certificate boundary');
  assertIncludes(architecture, 'https://api.vercel.com/v10/projects/{projectId}/domains', 'Client Menu architecture Vercel add-domain API version');

  assertIncludes(route, 'const domainVerified = sameDomain', 'Custom domain add route keeps new domains unverified while preserving safe same-domain retries');
  assertIncludes(route, 'const isConfigured = Boolean(configResult?.ok)', 'Custom domain status route requires a successful Vercel config response');
  assertIncludes(route, '&& isVercelDomainConfigured(configResult?.data);', 'Custom domain status route checks successful Vercel config data');
  assertIncludes(route, 'isVercelDomainExplicitlyMisconfigured(configResult.data)', 'Custom domain status route recognizes explicit provider misconfiguration');
  assertIncludes(route, 'if (nextVerified !== initialState.domainVerified)', 'Custom domain status route reconciles changed verification state');
  assertIncludes(route, 'normalizeCustomDomainClaimCandidate(authorizedState.storeData.customDomain) !== domain', 'Custom domain status route rejects stale provider verification results');
  assertIncludes(route, 'domainVerified: nextVerified,', 'Custom domain status route writes the current provider truth');
  assertIncludes(route, 'await revalidateMenuCache(storeId, { tId: tenantId });', 'Custom domain route public cache invalidation');
  assertIncludes(helper, 'return config?.misconfigured === false;', 'Vercel domain config verification helper');
  assertIncludes(helper, 'return config?.misconfigured === true;', 'Vercel domain explicit misconfiguration helper');
  assertIncludes(lookup, ".where('customDomain', '==', domain.toLowerCase())", 'Public custom-domain lookup uses normalized domain');
  assertIncludes(lookup, ".where('domainVerified', '==', true)", 'Public custom-domain lookup verification gate');
  assertIncludes(lookup, 'if (snapshot.size !== 1) return null;', 'Public custom-domain lookup duplicate fail-closed gate');
  assertIncludes(lookup, 'if (!tenantSnap.exists) return true;', 'Public custom-domain lookup missing-tenant fail-closed gate');
  assertIncludes(lookup, '!isMenuListPublicEntityEligible(tenantData)', 'Public custom-domain lookup tenant lifecycle gate');
  assertIncludes(lookup, 'normalizeMenuListPublicEntityIdentityAliases([store?.storeId, store?.sId])', 'Public custom-domain lookup conflicting store-alias gate');
  assertIncludes(lookup, 'normalizeMenuListPublicEntityIdentityAliases([store?.tenantId, store?.tId])', 'Public custom-domain lookup conflicting tenant-alias gate');
  assertIncludes(clientPage, 'storeData = await withRetry(() => getStoreByCustomDomain(customDomain));', 'Client menu page custom-domain lookup path');
  assertIncludes(clientPage, 'storeData.customDomain && storeData.domainVerified', 'Client menu page subdomain redirect waits for verified custom domain');
}

function verifyClaimAccountStoreEmailInvalidatesPublicCache() {
  const route = read('src/app/api/auth/claim-account/route.ts');

  assertIncludes(route, 'revalidateMenuCache', 'Claim account public cache invalidation');
  assertIncludes(route, 'transaction.update(storeRef, { email: lowerEmail, modifiedOn: now });', 'Claim account email-password store email write');
  assertIncludes(route, 'transaction.update(storeRef, { email: googleEmail, modifiedOn: now });', 'Claim account Google store email write');

  assertIncludes(route, 'revalidate: (storeId, tenantId) => revalidateMenuCache(storeId, { tId: tenantId })', 'Claim account cache helper uses normalized public cache scope');
  const invalidationCalls = route.match(/await revalidateClaimAccountPublicCache\(claimScope, request\);/g) || [];
  assert(invalidationCalls.length >= 2, 'Claim account store email writes must request public menu and OBP cache invalidation in both modes');
  assertIncludes(route, 'claim_account_cache_revalidation_failed', 'Claim account cache failures remain observable after the durable claim commits');
}

function verifyTenantHeaderLoggingIsBounded() {
  const helper = read('src/lib/multiTenant/getTenantFromHeaders.ts');

  assertIncludes(helper, "import { secureError } from '@lib/security/secureLogger';", 'Tenant header helper secure logging');
  assertIncludes(helper, "secureError('[Tenant Headers] No host header found'", 'Tenant header helper missing-host logging');
  assertIncludes(helper, 'sanitizeTenantLogContext', 'Tenant header helper bounded log context');
  assertIncludes(helper, "const requestHost = headersList.get('host');", 'Tenant header helper original Host authority');
  assertIncludes(helper, 'resolveTenantRequestIdentity(requestHost', 'Tenant header helper Host-derived tenant identity');
  assertNotIncludes(helper, "headersList.get('x-forwarded-host')", 'Tenant header helper must not accept forwarded-host tenant selection');
  assertNotIncludes(helper, 'No host header found. Headers:', 'Tenant header helper raw header logging');
  assertNotIncludes(helper, 'console.error', 'Tenant header helper direct console logging');
}

function verifyTenantDomainLookupLoggingIsBounded() {
  const helper = read('src/lib/multiTenant/domainLookup.ts');

  assertIncludes(helper, "import { secureError } from '@lib/security/secureLogger';", 'Tenant domain lookup secure logging');
  assertIncludes(helper, 'normalizeDomainLookupFailure', 'Tenant domain lookup normalized errors');
  assertIncludes(helper, 'lookupValueLength: lookupValue.length', 'Tenant domain lookup bounded context');
  assertIncludes(helper, "'[Tenant Domain Lookup] Subdomain lookup failed'", 'Tenant subdomain lookup secure error');
  assertIncludes(helper, "'[Tenant Domain Lookup] Custom domain lookup failed'", 'Tenant custom domain lookup secure error');
  assertNotIncludes(helper, 'Error looking up subdomain:', 'Tenant subdomain lookup raw value logging');
  assertNotIncludes(helper, 'Error looking up custom domain:', 'Tenant custom domain lookup raw value logging');
  assertNotIncludes(helper, 'console.error', 'Tenant domain lookup direct console logging');
}

function verifyPublicClientCacheLoggingIsBounded() {
  const helper = read('src/lib/cache/publicClientCache.ts');

  assertIncludes(helper, 'secureError', 'Public client cache secure logging');
  assertIncludes(helper, 'logPublicClientCacheFailure', 'Public client cache bounded failure logger');
  assertIncludes(helper, 'sanitizePublicCacheContext', 'Public client cache context sanitizer');
  assertIncludes(helper, "redirect: 'manual'", 'Public client cache revalidation handoff does not follow redirects');
  assertIncludes(helper, 'storeIdLength: storeId.length', 'Public client cache bounded store-id context');
  assertIncludes(helper, 'responseStatus: outcome.response.status', 'Public client cache bounded response status context');
  assertIncludes(helper, 'errorName: getBoundedErrorName(outcome.error) || typeof outcome.error', 'Public client cache bounded error context');
  assertIncludes(helper, 'awaitPublicCacheRevalidationRequest', 'Public client cache explicit request deadline boundary');
  assertIncludes(helper, "errorName: 'TimeoutError'", 'Public client cache bounded timeout diagnostic');
  assertIncludes(helper, 'type PendingPublicCacheRevalidation', 'Public client cache pending entry contract');
  assertIncludes(helper, 'const pendingRevalidations = new Map<string, PendingPublicCacheRevalidation>();', 'Public client cache pending map keeps rerun state');
  assertIncludes(helper, 'pending.rerunRequested = true;', 'Public client cache same-store trailing revalidation marker');
  assertIncludes(helper, 'mergePendingPublicCacheRevalidation(', 'Public client cache monotonic trailing screen-refresh merge');
  assertIncludes(helper, 'pending.context = merged.context;', 'Public client cache same-store trailing context update');
  assertIncludes(helper, '} while (entry.rerunRequested);', 'Public client cache trailing revalidation loop');
  assertIncludes(helper, 'if (pendingRevalidations.get(normalizedStoreId) === entry)', 'Public client cache pending entry identity-safe cleanup');
  assertNotIncludes(helper, 'const pendingRevalidations = new Map<string, Promise<void>>();', 'Public client cache must not collapse later writes into a single promise');
  assertNotIncludes(helper, 'console.warn', 'Public client cache direct warn logging');
  assertNotIncludes(helper, 'console.error', 'Public client cache direct error logging');
}

function verifyPublicStoreLookupUsesCurrentTenantLifecycleState() {
  const helper = read('src/lib/firestore/clientStoreLookup.ts');
  const route = read('src/app/api/platform/entity-blocks/route.ts');
  const backfill = read('scripts/backfill-store-tenant-block-state.ts');
  assertIncludes(backfill, 'resolveTenantBlockBackfillStoreIdentity(storeDoc.id, store)', 'Tenant-block backfill exact persisted store/tenant identity projector');
  assertNotIncludes(backfill, 'store.tenantId ?? store.tId', 'Tenant-block backfill must not prefer one persisted tenant alias');

  assertIncludes(helper, 'async function isStoreOrTenantIneligible', 'Public store lookup shared lifecycle guard');
  assertIncludes(helper, 'if (!isMenuListPublicEntityEligible(store)) return true;', 'Public store lookup direct lifecycle/block guard');
  assertIncludes(helper, 'if (!tenantSnap.exists) return true;', 'Public store lookup missing-tenant fail-closed guard');
  assertIncludes(helper, 'if (!isMenuListPublicEntityEligible(tenantData)) return true;', 'Public store lookup current tenant lifecycle/block guard');
  assertNotIncludes(helper, 'if (store?.tenantBlocked === false) return false;', 'Public store lookup stale denormalized tenant bypass');
  assertIncludes(helper, "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';", 'Public store lookup shared Firestore document ID guard');
  assertIncludes(helper, 'const normalizeClientStoreLookupScopeDocumentId = (value: unknown): ClientStoreLookupScopeDocumentId | null => {', 'Public store lookup scope document ID normalizer');
  assertIncludes(helper, 'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId', 'Public store lookup exact positive numeric scope guard');
  assertIncludes(helper, 'const tenantScope = normalizeMenuListPublicEntityIdentityAliases([store?.tenantId, store?.tId]);', 'Public store lookup normalizes and reconciles current tenant aliases');
  assertIncludes(helper, 'if (!tenantScope) return true;', 'Public store lookup fails closed for malformed tenant scope');
  assertIncludes(helper, 'const tenantSnap = await buildTenantDocRef(tenantScope.documentId).get();', 'Public store lookup current tenant lifecycle read uses normalized scope');
  assertIncludes(helper, 'const storeScope = normalizeClientStoreLookupScopeDocumentId(storeId);', 'Public store-id lookup normalizes store document ID');
  assertIncludes(helper, 'const snap = await buildStoreCollection().doc(storeScope.documentId).get();', 'Public store-id lookup reads normalized store document ID');
  assertNotIncludes(helper, '.doc(String(tenantId))', 'Public store lookup must not read tenant-block fallback through raw tenant IDs');
  assertNotIncludes(helper, 'store?.tenantId ?? store?.tId', 'Public store lookup must not ignore a conflicting tenant identity alias');
  assertNotIncludes(helper, 'store?.storeId ?? store?.sId', 'Public store lookup must not ignore a conflicting store identity alias');
  assertNotIncludes(helper, "const normalizedStoreId = String(storeId || '').trim();", 'Public store-id lookup must not use loose numeric string normalization');
  assertIncludes(read('__docs__/audits/menulist-production-readiness-audit.md'), 'Public client store lookup scope document ID boundary checkpoint', 'Production audit documents public client store lookup scope boundary');
  assertIncludes(read('__docs__/changelog.md'), 'Public Client Store Lookup Scope Document ID Boundary', 'Changelog documents public client store lookup scope boundary');
  assertIncludes(read('__docs__/changelog.md'), 'Public Client Store Lookup Scope Document ID Boundary', 'Lowercase changelog documents public client store lookup scope boundary');
  assertIncludes(read('__docs__/official-business-page/official-business-page_firebase.md'), 'Public client store lookup scope document ID boundary', 'OBP Firebase docs document public client store lookup scope boundary');
  assertIncludes(read('__docs__/client-menu/client-menu_firebase.md'), 'Public client store lookup scope document ID boundary', 'Client menu Firebase docs document public client store lookup scope boundary');
  assertIncludes(read('__docs__/customer-app/customer-app_firebase.md'), 'Public client store lookup scope document ID boundary', 'Customer app Firebase docs document public client store lookup scope boundary');
  assertIncludes(route, 'MAX_TENANT_BLOCK_STORES = 200', 'Platform tenant-block transaction store limit');
  assertIncludes(route, 'TENANT_BLOCK_EFFECT_CHUNK_SIZE = 20', 'Platform tenant-block post-commit effect chunk limit');
  assertIncludes(route, 'import { parsePlatformStoreSummary } from "@data/shared/storeSummaryBoundary";', 'Platform tenant-block summary lookup uses shared runtime parser');
  assertIncludes(route, "const TENANT_STORE_SCOPE_FIELDS = ['tenantId', 'tId'] as const;", 'Platform tenant-block sync checks both tenant scope fields');
  assertIncludes(route, 'TENANT_STORE_SCOPE_FIELDS.map((field) => db', 'Platform tenant-block transactional store query covers tenantId and tId fields');
  assertIncludes(route, '.limit(MAX_TENANT_BLOCK_STORES + 1)', 'Platform tenant-block queries fail closed above the transaction bound');
  assertIncludes(route, 'return db.runTransaction(async (transaction) => {', 'Platform tenant-block canonical and summary state shares one transaction');
  assertIncludes(route, 'transaction.get(docRef)', 'Platform tenant-block transaction re-reads canonical tenant state');
  assertIncludes(route, 'transaction.get(summaryRef)', 'Platform tenant-block transaction reads current summary state');
  assertIncludes(route, '...storeQueries.map((query) => transaction.get(query))', 'Platform tenant-block transaction reads current store ownership state');
  assertIncludes(route, 'const stores = parsePlatformStoreSummary(summarySnap.exists ? summarySnap.data() : undefined);', 'Platform tenant-block summary lookup parses nested and historical summary rows');
  assertIncludes(route, 'store.tId === tenantScope.documentId', 'Platform tenant-block summary lookup compares normalized tenant identity');
  assertNotIncludes(route, "String(store?.tId ?? store?.tenantId ?? '') === tenantScope.documentId", 'Platform tenant-block summary lookup must not repeat loose route-local identity coercion');
  assertIncludes(route, "normalizePlatformEntityBlockTargetDocumentId('store', store.id)", 'Platform tenant-block direct store query normalizes store document IDs');
  assertIncludes(route, "hasExactStoredEntityIdentity(tenant, 'tenantId', tenantScope)", 'Platform tenant-block transaction rejects drifted tenant identity fields');
  assertIncludes(route, 'hasExactTenantOwnership(storeData, tenantScope)', 'Platform tenant-block transaction rejects ambiguous cross-tenant store ownership');
  assertIncludes(route, 'transaction.update(store.ref, {', 'Platform tenant-block transaction updates validated existing stores only');
  assertIncludes(route, 'transaction.update(docRef, { blocked, blockDetails });', 'Platform tenant block canonical state commits with inherited mirrors');
  assertIncludes(route, 'transaction.set(summaryRef, {', 'Platform tenant block summary commits with canonical state');
  assertNotIncludes(route, 'batch.update(db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)), {', 'Platform tenant-block sync must not write through raw store IDs');
  assertNotIncludes(route, 'db.batch()', 'Platform tenant-block sync must not split canonical and mirror writes across batches');
  assertIncludes(route, 'tenantBlockedSyncedAt: now', 'Platform tenant-block sync timestamp');
  assertIncludes(backfill, "const TENANT_STORE_SCOPE_FIELDS = ['tenantId', 'tId'] as const;", 'Tenant-block backfill checks both tenant scope fields');
  assertIncludes(backfill, 'for (const field of TENANT_STORE_SCOPE_FIELDS)', 'Tenant-block backfill direct store query covers tenantId and tId fields');
  assertIncludes(backfill, "const projectId = getArg('--project-id') || process.env.NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID || process.env.MENULIST_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;", 'Tenant-block backfill requires explicit product-scoped project target');
  assertIncludes(backfill, "throw new Error('Set FIREBASE_PROJECT_ID or pass --project-id before running tenant-block backfill.');", 'Tenant-block backfill refuses ambient default project');
  assertIncludes(backfill, 'function initializeFirestore(projectId: string): FirebaseFirestore.Firestore', 'Tenant-block backfill initializes Firestore after project validation');
  assertIncludes(backfill, 'initializeApp({ projectId })', 'Tenant-block backfill initializes with explicit project id');
  assertIncludes(backfill, 'const write = hasFlag(\'--write\');', 'Tenant-block backfill explicit write flag');
  assertIncludes(backfill, "const confirmedProjectId = getArg('--confirm-project');", 'Tenant-block backfill write confirmation argument');
  assertIncludes(backfill, 'if (write && confirmedProjectId !== projectId)', 'Tenant-block backfill requires matching write confirmation');
  assertIncludes(backfill, 'Refusing write: pass --confirm-project ${projectId}', 'Tenant-block backfill write refusal copy');
  assertIncludes(backfill, 'const scopeCount = Number(Boolean(tenantScope)) + Number(Boolean(storeScope)) + Number(allStores);', 'Tenant-block backfill computes mutually exclusive scope');
  assertIncludes(backfill, 'if (scopeCount !== 1)', 'Tenant-block backfill refuses missing or conflicting scope');
  assertIncludes(backfill, 'Pass exactly one of --tenant-id, --store-id, or --all-stores.', 'Tenant-block backfill scope refusal copy');
  assertIncludes(backfill, 'db = initializeFirestore(projectId);', 'Tenant-block backfill initializes Firestore only after write confirmation');
  assertOrder(backfill, 'if (write && confirmedProjectId !== projectId)', 'db = initializeFirestore(projectId);', 'Tenant-block backfill confirms write target before Firebase initialization');
  assertOrder(backfill, 'if (scopeCount !== 1)', 'db = initializeFirestore(projectId);', 'Tenant-block backfill confirms exact scope before Firebase initialization');
  assertIncludes(backfill, 'console.log(`Project: ${projectId}`);', 'Tenant-block backfill project banner');
  assertIncludes(backfill, "console.log(`Mode: ${write ? 'WRITE' : 'DRY RUN'}`);", 'Tenant-block backfill dry-run mode banner');
  assertIncludes(backfill, 'const storeDocs = await loadStoreDocs();', 'Tenant-block backfill loads store docs after project/mode banner');
  assertOrder(backfill, 'console.log(`Project: ${projectId}`);', 'const storeDocs = await loadStoreDocs();', 'Tenant-block backfill logs project before first Firestore read');
  assertIncludes(backfill, 'if (!write) continue;', 'Tenant-block backfill dry-run default');
  assertIncludes(backfill, 'batch.update(storeDoc.ref, {', 'Tenant-block backfill updates existing stores only');
  assertIncludes(backfill, 'tenantBlockedSyncedAt: FieldValue.serverTimestamp()', 'Tenant-block backfill timestamp');
  assertIncludes(backfill, 'tenant_block_backfill_failed', 'Tenant-block backfill stable failure code');
  assertIncludes(backfill, 'getBackfillErrorSummary(error)', 'Tenant-block backfill bounded failure summary');
  assertIncludes(backfill, 'message: getBoundedErrorString(source.message)', 'Tenant-block backfill bounded error message');
  assertIncludes(backfill, 'normalizePositiveNumericDocumentIdAliases([', 'Tenant-block backfill exact all-alias tenant identity projection');
  assertNotIncludes(backfill, 'store.tenantId ?? store.tId', 'Tenant-block backfill conflicting tenant alias exclusion');
  assertNotIncludes(backfill, 'console.error(error);', 'Tenant-block backfill raw stack logging');
}

function verifyFunctionsPublicCacheRevalidationLoggingIsBounded() {
  const helper = read('functions/src/logic/publicCacheRevalidation.ts');
  const networkTarget = read('functions/src/utils/networkTarget.ts');
  const scheduler = read('functions/src/decisionBlocksScoring.ts');
  const reconciliation = read('functions/src/billing/reconcileSubscriptions.ts');
  const processMenuImagesJob = read('functions/src/logic/processMenuImagesJob.ts');
  const businessAttributeDefaults = read('functions/src/logic/businessAttributeDefaults.ts');

  assertIncludes(helper, 'PUBLIC_CACHE_REVALIDATION_CONFIG_MISSING', 'Functions public cache config-missing code');
  assertIncludes(helper, 'PUBLIC_CACHE_REVALIDATION_TARGET_REJECTED', 'Functions public cache target-rejected code');
  assertIncludes(helper, 'PUBLIC_CACHE_REVALIDATION_REQUEST_FAILED', 'Functions public cache request-failed code');
  assertIncludes(helper, 'PUBLIC_CACHE_REVALIDATION_REQUEST_ERRORED', 'Functions public cache request-errored code');
  assertIncludes(helper, 'PUBLIC_CACHE_SCREEN_TOUCH_FAILED', 'Functions public cache screen-touch failure code');
  assertIncludes(helper, 'validateNetworkTargetUrl(revalidateUrl', 'Functions public cache validates revalidation network target before fetch');
  assertIncludes(helper, 'fetch(targetValidation.normalizedUrl', 'Functions public cache fetches normalized validated revalidation target');
  assertIncludes(helper, 'getPublicCacheErrorContext', 'Functions public cache bounded source metadata');
  assertIncludes(helper, 'getPublicCacheRequestContext', 'Functions public cache bounded request metadata');
  assertIncludes(helper, 'getPublicCacheTargetContext', 'Functions public cache bounded target rejection metadata');
  assertIncludes(helper, 'touchDigitalScreenContentVersionForStore', 'Functions public cache screen version touch helper');
  assertIncludes(helper, 'cacheRevalidated: boolean;', 'Functions public cache reports cache refresh acknowledgement');
  assertIncludes(helper, 'screenTouchAttempted: boolean;', 'Functions public cache reports screen touch attempt');
  assertIncludes(helper, 'screenTouchSucceeded: boolean;', 'Functions public cache reports screen touch acknowledgement');
  assertIncludes(helper, 'cacheRevalidated = true;', 'Functions public cache records successful refresh response');
  assertOrder(helper, "if (!appBaseUrl || !revalidationSecret) {", "if (options.touchDigitalScreen === true) {", 'Functions screen touch remains independent of cache configuration');
  assertIncludes(helper, 'storeIdLength: normalizedStoreId.length', 'Functions public cache bounded store context');
  assertIncludes(helper, 'contextLength: context.length', 'Functions public cache bounded context metadata');
  assertIncludes(helper, 'sourceErrorName: context.sourceErrorName || typeof error', 'Functions public cache source error name');
  assertIncludes(helper, 'status: response.status', 'Functions public cache bounded response status');
  assertIncludes(networkTarget, "import { lookup } from 'dns/promises';", 'Functions shared network target helper resolves DNS');
  assertIncludes(networkTarget, 'export async function validateNetworkTargetUrl', 'Functions shared network target validator exported');
  assertIncludes(networkTarget, "lookup(hostname, { all: true, verbatim: true })", 'Functions shared network target helper checks all DNS answers');
  assertIncludes(networkTarget, 'isBlockedNetworkTarget(address.address)', 'Functions shared network target helper blocks private resolved addresses');
  assertIncludes(networkTarget, "metadata.google.internal", 'Functions shared network target helper blocks metadata hostname');
  assertIncludes(helper, "doc(`campaigns_${normalizedStoreId}`)", 'Functions public cache canonical screen doc touch');
  assertIncludes(helper, "doc(`screen_${normalizedStoreId}`)", 'Functions public cache public screen mirror touch');
  assertIncludes(helper, 'await firestoreAdmin.runTransaction(async (transaction) => {', 'Functions public cache screen touch transaction boundary');
  assertIncludes(helper, "'screen.contentVersion': nextContentVersion", 'Functions public cache screen content-version exact transaction-local bump');
  assertIncludes(helper, '}, { merge: false });', 'Functions public cache public screen mirror replacement');
  assertIncludes(helper, 'storeId: normalizedStoreId', 'Functions public cache public screen store projection');
  assertNotIncludes(helper, 'screenToken: screen.screenToken', 'Functions public cache must not mirror the bearer screen token');
  assertIncludes(scheduler, 'await revalidatePublicClientCacheForStore(', 'Scheduled special-menu lifecycle cache revalidation');
  assertIncludes(scheduler, '`specialMenuSwitching:${result.outcome}`', 'Scheduled special-menu lifecycle outcome cache context');
  assertIncludes(scheduler, "if (result.outcome === 'activated') smResult.activated++;", 'Scheduled special-menu activation accounting after cache revalidation');
  assertIncludes(scheduler, "if (result.outcome === 'expired') smResult.deactivated++;", 'Scheduled special-menu expiry accounting after cache revalidation');
  assertIncludes(scheduler, 'touchDigitalScreen: true', 'Scheduled special-menu screen touch');
  assertIncludes(reconciliation, 'touchDigitalScreen: true', 'Subscription reconciliation screen attribution touch');
  assertIncludes(businessAttributeDefaults, 'await revalidatePublicClientCacheForStore(storeId, params.context, {', 'Business attribute defaults public cache revalidation');
  assertIncludes(businessAttributeDefaults, 'touchDigitalScreen: params.touchDigitalScreen === true', 'Business attribute defaults screen touch passthrough');
  assertIncludes(processMenuImagesJob, 'const projectStoreId = job.sId;', 'First-extraction project save derives the revalidation store scope from the job store scope');
  assertIncludes(processMenuImagesJob, 'if (!projectStoreId) {', 'First-extraction project save fails closed when the job store scope is missing');
  assertIncludes(processMenuImagesJob, "await revalidatePublicClientCacheForStore(projectStoreId, 'processMenuImagesJob:firstExtractionProjectSave', {", 'First-extraction project save fallback cache revalidation');
  assertIncludes(processMenuImagesJob, 'touchDigitalScreen: true', 'First-extraction project save screen touch intent');
  {
    const saveIndex = processMenuImagesJob.indexOf('await saveFilesToProject(');
    const defaultsIndex = processMenuImagesJob.indexOf('businessAttributeDefaultsApplied = await applyMenuDerivedBusinessAttributeDefaultsForStore({');
    const fallbackIndex = processMenuImagesJob.indexOf("await revalidatePublicClientCacheForStore(projectStoreId, 'processMenuImagesJob:firstExtractionProjectSave', {");
    assert(
      saveIndex !== -1
      && defaultsIndex !== -1
      && fallbackIndex !== -1
      && saveIndex < defaultsIndex
      && defaultsIndex < fallbackIndex,
      'First-extraction project save must refresh public cache after project save and business-attribute defaults',
    );
  }
  assert(
    !/functions\.logger\.\w+\([^;]*storeId:\s*normalizedStoreId/s.test(helper),
    'Functions public cache logs must not include the raw store ID',
  );
  assertNotIncludes(helper, 'context,', 'Functions public cache raw caller context log');
  assertNotIncludes(helper, 'error?.message || String(error)', 'Functions public cache raw exception text');
}

function verifyMenuRevalidationRouteLoggingIsBounded() {
  const route = read('src/app/api/revalidate/menu/route.ts');
  const rateLimitConfigs = read('src/lib/rateLimit/configs.ts');
  const clientMenuFirebase = read('__docs__/client-menu/client-menu_firebase.md');

  assertIncludes(route, 'logRuntimeFailure', 'Menu revalidation route bounded runtime failure logging');
  assertIncludes(route, 'menu_cache_revalidation_failed', 'Menu revalidation route stable failure code');
  assertIncludes(route, 'getMenuRevalidationLogContext', 'Menu revalidation route bounded context helper');
  assertIncludes(route, "getBoundedRuntimeStringContext('endpoint'", 'Menu revalidation route bounded endpoint context');
  assertIncludes(route, "getBoundedRuntimeStringContext('storeId'", 'Menu revalidation route bounded store context');
  assertIncludes(route, 'tagCount', 'Menu revalidation route tag count metadata');
  assertIncludes(route, 'hasSession', 'Menu revalidation route session presence metadata');
  assertIncludes(route, 'function getStoreIdFromCacheTag', 'Menu revalidation route explicit tag store-id parser');
  assertIncludes(route, 'function deriveSingleStoreIdFromTags', 'Menu revalidation route single-store explicit tag derivation');
  assertIncludes(route, 'requestedStoreId = deriveSingleStoreIdFromTags(tags);', 'Menu revalidation route must clear assistant packet cache for single-store explicit tag arrays');
  assertIncludes(route, 'resolveMenuRevalidationSessionAccess(session)', 'Menu revalidation route exact session projection');
  assertIncludes(route, 'canMenuRevalidationSessionAccessStore(sessionAccess, storeId)', 'Menu revalidation route exact store admission');
  assertIncludes(route, 'tId: sessionAccess?.tenantId', 'Menu revalidation route exact assistant-cache tenant scope');
  assertIncludes(rateLimitConfigs, 'MENU_CACHE_REVALIDATION', 'Menu revalidation route-specific rate-limit profile');
  assertIncludes(route, "const MENU_REVALIDATE_RATE_LIMIT_KEY = 'menu-cache-revalidate';", 'Menu revalidation route stable limiter namespace');
  assertIncludes(route, 'function getMenuRevalidationRateLimitIdentity', 'Menu revalidation route bounded limiter identity helper');
  assertIncludes(route, 'async function applyMenuRevalidationRateLimit', 'Menu revalidation route limiter helper');
  assertIncludes(route, "getRateLimitForFeature('MENU_CACHE_REVALIDATION')", 'Menu revalidation route limiter profile use');
  assertIncludes(route, 'hashPublicRateLimitValue(', 'Menu revalidation route hashed limiter key material');
  assertIncludes(route, 'key: `${MENU_REVALIDATE_RATE_LIMIT_KEY}:${authMode}:${sourceRateLimitHash}`', 'Menu revalidation route hashed limiter key');
  assertIncludes(route, "logger.security('Rate Limit Exceeded - Menu Cache Revalidation'", 'Menu revalidation route bounded rate-limit security log');
  assertOrder(
    route,
    'const rateLimitResponse = await applyMenuRevalidationRateLimit(request, session, authMode);',
    'const bodyResult = await readBoundedJsonBody(request, MENU_REVALIDATE_MAX_BODY_BYTES',
    'Menu revalidation route rate limit before body parsing',
  );
  assertIncludes(clientMenuFirebase, 'Explicit single-store tag arrays derive the same store id before clearing the Owner Business Assistant packet cache.', 'Client Menu Firebase explicit tag assistant-cache boundary');
  assertIncludes(clientMenuFirebase, "Live Digital Screens content-version touches stay in the caller helpers after public-truth writes and expire the affected screen's hashed token tag.", 'Client Menu Firebase live screen-touch boundary');
  assertIncludes(clientMenuFirebase, 'Menu cache revalidation rate-limit boundary', 'Client Menu Firebase revalidation rate-limit boundary');
  assertNotIncludes(route, "secureError('[Menu Cache] Revalidation failed'", 'Menu revalidation route raw secure error');
  assertNotIncludes(route, 'secureError(', 'Menu revalidation route must not pass raw exceptions to secureError');
  assertNotIncludes(route, 'key: `menu-cache-revalidate:${session', 'Menu revalidation route raw session limiter key');
  assertNotIncludes(route, 'key: `menu-cache-revalidate:${request', 'Menu revalidation route raw request limiter key');
  assertNotIncludes(route, "session?.user?.platformRole === 'PLATFORM' || session?.platformRole === 'PLATFORM'", 'Menu revalidation route conflicting platform-role elevation');
  assertNotIncludes(route, '(session as any)?.tId || (session as any)?.user?.tenantId', 'Menu revalidation route preferred tenant alias');
}

function verifyPublicTruthWritesInvalidateScreenData() {
  const screenPage = read('src/app/screen/[token]/page.tsx');
  const revalidateAction = read('src/lib/actions/revalidateMenuCache.ts');
  const messagingPublish = read('src/lib/messaging-onboarding/publish.ts');
  const serverScreenInvalidation = read('src/lib/screen/serverScreenInvalidation.ts');
  const storePublicTruthPostCommit = read('src/lib/cache/storePublicTruthPostCommit.ts');
  const outletPolicyRoute = read('src/app/api/outlets/policy/route.ts');

  assertIncludes(screenPage, 'getPrivateScreenTokenCacheTag(token)', 'Digital screen hashed-token state cache tag');
  assertIncludes(screenPage, 'tags: [`menu-store-${storeId}`]', 'Digital screen store-scoped menu cache tag');
  assertNotIncludes(screenPage, "tags: ['screen-data']", 'Digital screen global SSR cache fan-out');
  assertIncludes(revalidateAction, 'runStorePublicTruthPostCommitEffects({', 'Canonical menu cache revalidation must independently settle every public-truth effect');
  assertIncludes(revalidateAction, 'revalidate: (tag) => revalidateTag(tag, { expire: 0 })', 'Canonical menu cache revalidation must delegate every cache tag with immediate Next 16 expiry');
  assertIncludes(revalidateAction, 'touchDigitalScreenContentVersionForStoreServer(', 'Canonical menu cache revalidation must wake live digital screens');
  assertIncludes(revalidateAction, 'if (postCommit.effectsPending)', 'Canonical menu cache revalidation must expose aggregate effect failure to its callers');
  assertIncludes(revalidateAction, 'throw postCommit.firstError', 'Canonical menu cache revalidation must preserve the original cache failure after all effects settle');
  assertIncludes(serverScreenInvalidation, 'FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED', 'Server screen invalidation feature flag guard');
  assertIncludes(serverScreenInvalidation, "doc(`campaigns_${normalizedStoreId}`)", 'Server screen invalidation canonical screen state read');
  assertIncludes(serverScreenInvalidation, 'if (!screen || typeof screen.enabled !== "boolean")', 'Server screen invalidation must not create partial screen state');
  assertIncludes(serverScreenInvalidation, 'getPrivateScreenTokenCacheTag(screenToken)', 'Server screen invalidation exact token cache tag');
  assertIncludes(serverScreenInvalidation, 'revalidateTag(result.tokenCacheTag', 'Server screen invalidation exact token cache expiry');
  assertIncludes(serverScreenInvalidation, "doc(`screen_${normalizedStoreId}`)", 'Server screen invalidation public listener mirror');
  assertIncludes(serverScreenInvalidation, 'await firestoreAdmin.runTransaction(async (transaction) => {', 'Server screen invalidation transaction boundary');
  assertIncludes(serverScreenInvalidation, '"screen.contentVersion": nextContentVersion', 'Server screen invalidation exact transaction-local content-version bump');
  assertIncludes(serverScreenInvalidation, '}, { merge: false });', 'Server screen invalidation public mirror replacement');
  assertIncludes(serverScreenInvalidation, 'SERVER_SCREEN_TOUCH_FAILED_CODE', 'Server screen invalidation bounded diagnostics');
  assertIncludes(messagingPublish, 'runStorePublicTruthPostCommitEffects({', 'Messaging onboarding publish must independently settle public-truth effects');
  assertIncludes(messagingPublish, 'revalidate: (tag) => revalidateTag(tag, { expire: 0 })', 'Messaging onboarding publish must delegate every cache tag to the shared effect runner with immediate Next 16 expiry');
  assertIncludes(messagingPublish, '"messagingOnboardingPublish",', 'Messaging onboarding publish must identify its live-screen touch');
  assertIncludes(messagingPublish, 'tagCount: 3', 'Messaging onboarding publish cache diagnostic tag count');
  assertIncludes(messagingPublish, 'failedEffectCount: postCommit.failedEffectCount', 'Messaging onboarding publish must report aggregate post-commit failures');

  const tempStatusRoute = read('src/app/api/store/temp-status/route.ts');
  assertIncludes(tempStatusRoute, 'runStorePublicTruthPostCommitEffects({', 'Temporary Status must isolate public-truth effects after commit');
  assertIncludes(tempStatusRoute, "touchDigitalScreenContentVersionForStoreServer(targetStoreId, 'storeTempStatus')", 'Temporary Status must wake live digital screens after public truth writes');
  [
    ['src/app/api/public/create-menu/claim/route.ts', "touchDigitalScreenContentVersionForStoreServer(result.storeId, 'publicCreateMenuClaim')"],
  ].forEach(([relativePath, screenTouchNeedle]) => {
    const source = read(relativePath);
    assertIncludes(source, screenTouchNeedle, `${relativePath} must wake live digital screens after public truth writes`);
    assertNotIncludes(source, "revalidateTag('screen-data'", `${relativePath} must avoid obsolete global screen cache fan-out`);
  });
  assertIncludes(outletPolicyRoute, 'runStorePublicTruthPostCommitEffects({', 'Outlet policy must isolate public-truth effects after commit');
  assertIncludes(outletPolicyRoute, 'touchDigitalScreenContentVersionForStoreServer(storeId, "outletPolicy")', 'Outlet policy must wake live digital screens after public truth writes');
  assertNotIncludes(storePublicTruthPostCommit, "params.deps.revalidate('screen-data')", 'Shared store public-truth effects must avoid obsolete global screen cache fan-out');
  [
    ['src/app/api/outlets/create/route.ts', "touchDigitalScreenContentVersionForStoreServer(\n                    effectStoreId,"],
    ['src/app/api/outlets/rename/route.ts', "touchDigitalScreenContentVersionForStoreServer(storeId, 'outletRename')"],
    ['src/app/api/outlets/deactivate/route.ts', "touchDigitalScreenContentVersionForStoreServer(effectStoreId, 'outletDeactivate')"],
    ['src/app/api/admin/subdomains/rename/route.ts', "touchDigitalScreenContentVersionForStoreServer(effectStoreId, 'adminSubdomainRename')"],
    ['src/app/api/subdomain/check/route.ts', "touchDigitalScreenContentVersionForStoreServer(storeId, 'subdomainAssign')"],
    ['src/app/api/platform/entity-blocks/route.ts', "touchDigitalScreenContentVersionForStoreServer(storeId, 'platformEntityBlocks')"],
    ['src/app/api/projects/outlet-save/route.ts', 'touchDigitalScreenContentVersionForStoreServer(storeId, reason)'],
    ['src/lib/billing/subscriptionEntitlementSync.ts', "'subscriptionEntitlementSync'"],
  ].forEach(([relativePath, screenTouchNeedle]) => {
    const source = read(relativePath);
    assertIncludes(source, 'runStorePublicTruthPostCommitEffects({', `${relativePath} must isolate public-truth effects after commit`);
    assertIncludes(source, screenTouchNeedle, `${relativePath} must wake live digital screens after public truth writes`);
  });
  const linkedOutletSaveRoute = read('src/app/api/projects/outlet-save/route.ts');
  assertIncludes(linkedOutletSaveRoute, 'reason: "linkedOutletSave"', 'Linked outlet save must identify its post-commit screen touch');

  const platformEntityBlocksClient = read('src/database/platformEntityBlocks/index.ts');
  assertIncludes(platformEntityBlocksClient, 'PLATFORM_ENTITY_BLOCK_REQUEST_POLICY', 'Platform entity block browser request policy');
  assertIncludes(platformEntityBlocksClient, "cache: 'no-store'", 'Platform entity block request must bypass browser cache');
  assertIncludes(platformEntityBlocksClient, "credentials: 'same-origin'", 'Platform entity block request must keep credentials same-origin');
  assertIncludes(platformEntityBlocksClient, "redirect: 'manual'", 'Platform entity block request must not follow redirects');
  assertIncludes(platformEntityBlocksClient, '...PLATFORM_ENTITY_BLOCK_REQUEST_POLICY', 'Platform entity block mutation must spread the shared request policy');
}

function verifyPublicMenuResolutionLoggingIsBounded() {
  const page = read('src/app/client/[[...slug]]/page.tsx');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const obpFirebaseDoc = read('__docs__/official-business-page/official-business-page_firebase.md');
  const clientMenuImplDoc = read('__docs__/client-menu/_impl.md');
  const clientMenuFirebaseDoc = read('__docs__/client-menu/client-menu_firebase.md');

  assertIncludes(page, "import { secureError } from \"@lib/security/secureLogger\";", 'Public menu resolution secure logging');
  assertIncludes(page, "import { isValidFirestoreDocumentId } from \"@lib/firebase/firestoreDocumentId\";", 'Public menu project document-ID guard import');
  assertIncludes(page, 'logPublicMenuResolutionFailure', 'Public menu resolution bounded failure logger');
  assertIncludes(page, 'buildPublicMenuResolutionLogContext', 'Public menu resolution bounded context helper');
  assertIncludes(page, 'const PUBLIC_MENU_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,200}$/;', 'Public menu project document-ID shape guard');
  assertIncludes(page, 'function normalizePublicMenuProjectDocumentScope', 'Public menu project document-ID normalizer');
  assertIncludes(page, 'PUBLIC_MENU_PROJECT_ID_PATTERN.test(projectId)', 'Public menu project ID raw shape validation');
  assertIncludes(page, 'isValidFirestoreDocumentId(projectId)', 'Public menu shared project ID guard');
  assertIncludes(page, 'const parts = projectId.split("-");', 'Public menu project ID scope parsing');
  assertIncludes(page, 'const storeDocumentId = parts[parts.length - 1];', 'Public menu final segment store scope');
  assertIncludes(page, 'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === value', 'Public menu exact positive numeric scope guard');
  assertIncludes(page, 'const projectScope = normalizePublicMenuProjectDocumentScope(projectId);', 'Public menu project data normalized scope');
  assertIncludes(page, '.doc(projectScope.tenantDocumentId)', 'Public menu normalized tenant project ref');
  assertIncludes(page, '.collection(projectScope.storeDocumentId)', 'Public menu normalized store project ref');
  assertIncludes(page, '.doc(projectScope.projectId)', 'Public menu normalized project ref');
  assertIncludes(page, 'projectIdLength: projectId.length', 'Public menu resolution bounded project context');
  assertIncludes(page, 'projectSlugLength: projectSlug.length', 'Public menu resolution bounded project-slug context');
  assertIncludes(page, 'masterProjectIdLength: masterProjectId.length', 'Public menu resolution bounded master-project context');
  assertIncludes(page, 'specialMenuIdLength: specialMenuId.length', 'Public menu resolution bounded special-menu context');
  assertIncludes(page, 'tenantIdLength: tenantId.length', 'Public menu resolution bounded tenant context');
  assertIncludes(page, 'storeIdLength: storeId.length', 'Public menu resolution bounded store context');
  assertIncludes(page, 'slugLength: slug.length', 'Public menu resolution bounded slug context');
  assertIncludes(page, 'canonicalUrlLength: canonicalUrl.length', 'Public menu resolution bounded canonical URL context');
  assertIncludes(page, 'errorName: getBoundedErrorName(metadata.error) || typeof metadata.error', 'Public menu resolution bounded error context');
  assertIncludes(page, "new Error(`public_menu_resolution_${failureType}`)", 'Public menu resolution normalized error code');
  assertIncludes(page, 'canonical_url_parse_failed', 'Public menu stored canonical URL parse diagnostics');
  assertIncludes(page, "logPublicMenuResolutionFailure('canonical_url_parse_failed'", 'Public menu stored canonical URL parse failure type');
  assertIncludes(page, 'resolveSafeStoreCanonicalUrl(metadataStore.canonicalUrl, currentUrl, canonicalBase, {', 'Public menu stored canonical URL parse context');
  assertIncludes(page, "parsedStoredUrl.protocol !== 'https:'", 'Public menu stored canonical URL must remain HTTPS-only');
  assertIncludes(page, '|| parsedStoredUrl.username', 'Public menu stored canonical URL must reject userinfo');
  assertIncludes(page, 'return allowedHosts.has(storedHost) ? parsedStoredUrl.toString() : fallbackUrl;', 'Public menu stored canonical URL must emit normalized safe URL');
  assertIncludes(page, "logPublicMenuResolutionFailure('metadata_outlet_lookup_failed'", 'Public menu metadata outlet lookup diagnostics');
  assertIncludes(page, "logPublicMenuResolutionFailure('metadata_project_lookup_failed'", 'Public menu metadata project lookup diagnostics');
  assertIncludes(page, "logPublicMenuResolutionFailure('outlet_lookup_failed'", 'Public menu outlet lookup diagnostics');
  assertNotIncludes(page, 'const [tId, , sId] = projectId.split("-")', 'Public menu must not use fixed-position unvalidated project ID split');
  assertNotIncludes(page, '.doc(String(tId))', 'Public menu must not use raw tenant project ref');
  assertNotIncludes(page, '.collection(String(sId))', 'Public menu must not use raw store project ref');
  assertNotIncludes(page, 'resolveSafeStoreCanonicalUrl(metadataStore.canonicalUrl, currentUrl, canonicalBase)\n', 'Public menu stored canonical URL parse must not omit diagnostic context');
  assertNotIncludes(page, 'return allowedHosts.has(storedHost) ? trimmed : fallbackUrl;', 'Public menu stored canonical URL must not return raw owner input');
  assertNotIncludes(page, '.catch(() => null);', 'Public menu route silent null lookup catch');
  assertNotIncludes(page, 'console.error', 'Public menu page direct error logging');
  assertNotIncludes(page, 'console.warn', 'Public menu page direct warn logging');
  assertIncludes(clientMenuImplDoc, 'Public menu project document-ID boundary', 'Client menu implementation public project document-ID boundary');
  assertIncludes(clientMenuImplDoc, 'normalizePublicMenuProjectDocumentScope', 'Client menu implementation public project normalizer evidence');
  assertIncludes(clientMenuFirebaseDoc, 'Public menu project document-ID boundary', 'Client menu Firebase public project document-ID boundary');
  assertIncludes(clientMenuFirebaseDoc, 'Whitespace-mutated, path-shaped, reserved, malformed, zero, negative, unsafe, or nonnumeric project scope', 'Client menu Firebase public project strict rejection evidence');
  assertIncludes(audit, 'Public menu project document-ID boundary checkpoint', 'Production audit public menu project document-ID checkpoint');
  assertIncludes(audit, 'Public menu/OBP canonical URL diagnostics checkpoint', 'Production audit public canonical URL diagnostics checkpoint');
  assertIncludes(changelog, 'Public Menu Project Document ID Boundary', 'Changelog public menu project document-ID checkpoint');
  assertIncludes(changelog, 'Public Menu Canonical URL Diagnostics', 'Changelog public canonical URL diagnostics checkpoint');
  assertIncludes(obpFirebaseDoc, 'Public canonical URL diagnostics', 'OBP Firebase public canonical URL diagnostics');
}

function verifyOBPAnalyticsLoggingIsBounded() {
  const component = read('src/app/client/obp/OBPAnalytics.tsx');
  const languageSwitcher = read('src/app/client/obp/OBPLanguageSwitcher.tsx');
  const implDoc = read('__docs__/official-business-page/official-business-page_impl.md');
  const firebaseDoc = read('__docs__/official-business-page/official-business-page_firebase.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  assertIncludes(component, "import { secureError } from '@lib/security/secureLogger';", 'OBP analytics secure logging');
  assertIncludes(component, 'logOBPAnalyticsFailure', 'OBP analytics bounded failure logger');
  assertIncludes(component, 'buildOBPAnalyticsLogContext', 'OBP analytics bounded context helper');
  assertIncludes(component, 'tenantIdLength: tenantId.length', 'OBP analytics bounded tenant context');
  assertIncludes(component, 'storeIdLength: storeId.length', 'OBP analytics bounded store context');
  assertIncludes(component, 'activeLanguageLength: activeLanguage.length', 'OBP analytics bounded language context');
  assertIncludes(component, 'previousLanguageLength: previousLanguage.length', 'OBP analytics bounded previous-language context');
  assertIncludes(component, 'storageOperation: metadata.storageOperation', 'OBP analytics bounded language storage operation context');
  assertIncludes(component, 'storageKeyLength: storageKey.length', 'OBP analytics bounded language storage key context');
  assertIncludes(component, 'errorName: getBoundedErrorName(metadata.error) || typeof metadata.error', 'OBP analytics bounded error context');
  assertIncludes(component, "new Error(`obp_analytics_${failureType}`)", 'OBP analytics normalized error code');
  assertIncludes(component, "}).catch((error) => {", 'OBP language adoption rejection handling');
  assertIncludes(component, "logOBPAnalyticsFailure('language_storage'", 'OBP language storage diagnostics');
  assertIncludes(component, "type OBPAnalyticsFailureType = 'view_tracking' | 'setup' | 'language_adoption' | 'language_storage';", 'OBP language storage failure type');
  assertIncludes(languageSwitcher, 'obp_language_switcher_attribution_preserve_failed', 'OBP language switch attribution diagnostics');
  assertIncludes(languageSwitcher, 'logLanguageSwitcherAttributionFailure', 'OBP language switch bounded attribution logger');
  assertIncludes(languageSwitcher, "getBoundedAnalyticsStringContext('baseUrl', context.baseUrl)", 'OBP language switch bounded base URL context');
  assertIncludes(languageSwitcher, "getBoundedAnalyticsStringContext('languageCode', context.languageCode)", 'OBP language switch bounded language context');
  assertIncludes(languageSwitcher, "getBoundedAnalyticsStringContext('languageUrl', context.languageUrl)", 'OBP language switch bounded language URL context');
  assertIncludes(languageSwitcher, 'attributionParamCount: ATTRIBUTION_PARAMS.length', 'OBP language switch attribution-param count context');
  assertIncludes(languageSwitcher, 'reportedLanguageSwitcherAttributionFailure', 'OBP language switch one-per-session diagnostic guard');
  assertNotIncludes(component, '} catch {\n            previousLanguage = null;\n        }', 'OBP language storage must not silently clear previous language on storage failure');
  assertNotIncludes(languageSwitcher, '} catch {\n            return languageUrl;\n        }', 'OBP language switch attribution must not fail silently');
  assertNotIncludes(component, 'console.error', 'OBP analytics direct error logging');
  assertNotIncludes(component, 'console.warn', 'OBP analytics direct warn logging');
  assertIncludes(implDoc, 'OBP language switch attribution diagnostics', 'OBP implementation language switch diagnostics');
  assertIncludes(firebaseDoc, 'Language switch attribution diagnostics', 'OBP Firebase language switch diagnostics');
  assertIncludes(audit, 'OBP language switch attribution diagnostics checkpoint', 'Production audit OBP language switch diagnostics checkpoint');
  assertIncludes(changelog, 'OBP Language Switch Attribution Diagnostics', 'Changelog OBP language switch diagnostics checkpoint');
}

function verifyOBPThemeStorageLoggingIsBounded() {
  const component = read('src/app/client/obp/OBPThemeToggle.tsx');
  const implDoc = read('__docs__/official-business-page/official-business-page_impl.md');
  const firebaseDoc = read('__docs__/official-business-page/official-business-page_firebase.md');
  const mobileDoc = read('__docs__/official-business-page/official-business-page_mobile-support.md');

  assertIncludes(component, "import { secureError } from '@lib/security/secureLogger';", 'OBP theme secure logging');
  assertIncludes(component, 'reportedOBPThemeStorageFailures', 'OBP theme storage one-per-operation guard');
  assertIncludes(component, 'logOBPThemeStorageFailure', 'OBP theme bounded storage logger');
  assertIncludes(component, 'new Error(`obp_theme_storage_${operation}_failed`)', 'OBP theme normalized storage failure code');
  assertIncludes(component, 'storageKeyLength: storageKey.length', 'OBP theme bounded storage-key context');
  assertIncludes(component, 'themeLength: themeValue.length', 'OBP theme bounded theme context');
  assertIncludes(component, 'errorName: getBoundedErrorName(error) || typeof error', 'OBP theme bounded error context');
  assertIncludes(component, "logOBPThemeStorageFailure('read', error)", 'OBP theme read-failure diagnostics');
  assertIncludes(component, "window.localStorage.removeItem(STORAGE_KEY)", 'OBP invalid theme eviction');
  assertIncludes(component, "logOBPThemeStorageFailure('remove', error)", 'OBP theme cleanup-failure diagnostics');
  assertIncludes(component, "logOBPThemeStorageFailure('write', error, nextTheme)", 'OBP theme write-failure diagnostics');
  assertNotIncludes(component, '} catch {\n        return null;\n    }', 'OBP theme read must not silently return null');
  assertNotIncludes(component, 'Theme switching is a visual preference; keep the page usable if storage is blocked.', 'OBP theme write must not rely on silent localStorage comment');
  assertNotIncludes(component, 'console.error', 'OBP theme direct error logging');
  assertNotIncludes(component, 'console.warn', 'OBP theme direct warn logging');
  assertIncludes(implDoc, 'OBP customer theme preference', 'OBP implementation doc theme preference boundary');
  assertIncludes(implDoc, 'not owner theme customization', 'OBP implementation doc owner-theme boundary');
  assertIncludes(implDoc, 'read/remove/write', 'OBP implementation doc storage operation boundary');
  assertIncludes(implDoc, 'obp_theme_storage_*_failed', 'OBP implementation doc storage diagnostic boundary');
  assertIncludes(firebaseDoc, 'Theme preference diagnostics', 'OBP Firebase doc theme diagnostics boundary');
  assertIncludes(firebaseDoc, 'add no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement', 'OBP Firebase doc cost-neutral theme diagnostics');
  assertIncludes(mobileDoc, 'Public customer theme mode (dark/light): `OBPThemeToggle` applies a browser-local display preference', 'OBP mobile doc public theme mode boundary');
}

function verifyOBPServerFallbackLoggingIsBounded() {
  const component = read('src/app/client/obp/OBPContent.tsx');
  const implDoc = read('__docs__/official-business-page/official-business-page_impl.md');
  const firebaseDoc = read('__docs__/official-business-page/official-business-page_firebase.md');

  for (const token of [
    'logObpServerResolutionFailure',
    'let timeoutId: ReturnType<typeof setTimeout> | undefined;',
    'if (timeoutId !== undefined) clearTimeout(timeoutId);',
    'public_obp_menu_info_lookup_failed',
    'public_obp_menu_info_resolution_failed',
    'public_obp_store_count_lookup_failed',
    "getBoundedRuntimeStringContext('storeId', context.storeId)",
    "getBoundedRuntimeStringContext('tenantId', context.tenantId)",
    "getBoundedRuntimeStringContext('tenantType', context.tenantType)",
    "getBoundedRuntimeStringContext('activeSpecialMenuId', context.activeSpecialMenuId)",
    "getBoundedRuntimeStringContext('operation', context.operation)",
    "operation: 'menu_info_lookup'",
    "operation: 'store_count_lookup'",
    "operation: 'menu_info_resolution'",
  ]) {
    assertIncludes(component, token, 'OBP server fallback bounded diagnostics');
  }

  for (const token of [
    '} catch {\n            return empty;\n        }',
    '} catch {\n            return 1;\n        }',
    '.catch(() => ({ hasMenu: false, defaultSlug: undefined, projects: [] } as ObpMenuInfo))',
    'console.error',
    'console.warn',
  ]) {
    assertNotIncludes(component, token, 'OBP server fallback silent/direct diagnostics');
  }

  assertIncludes(implDoc, 'OBP server fallback diagnostics log `public_obp_menu_info_lookup_failed`, `public_obp_menu_info_resolution_failed`, and `public_obp_store_count_lookup_failed`', 'OBP implementation doc server fallback diagnostics');
  assertIncludes(firebaseDoc, 'OBP server fallback diagnostics', 'OBP Firebase doc server fallback diagnostics');
  assertIncludes(firebaseDoc, 'add no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement', 'OBP Firebase doc cost-neutral server fallback diagnostics');
}

function verifyOBPResolvedSurfaceFallbackLoggingIsBounded() {
  const component = read('src/app/client/obp/OBPResolvedSurface.tsx');
  const freshnessTimestamp = read('src/lib/obp/freshnessTimestamp.ts');
  const implDoc = read('__docs__/official-business-page/official-business-page_impl.md');
  const firebaseDoc = read('__docs__/official-business-page/official-business-page_firebase.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  [
    'logOBPResolvedSurfaceFailure',
    'reportedOBPResolvedSurfaceFailures',
    'public_obp_today_day_key_timezone_failed',
    'public_obp_google_maps_embed_url_parse_failed',
    'public_obp_freshness_timestamp_parse_failed',
    "getBoundedRuntimeStringContext('timeZone', context.timeZone)",
    "getBoundedRuntimeStringContext('googleMapsUrl', context.googleMapsUrl)",
    "getBoundedRuntimeStringContext('modifiedOnType', getOBPResolvedSurfaceValueType(context.modifiedOn))",
    "new Error('invalid_modified_on')",
    'normalizeOBPFreshnessDate(modifiedOn)',
  ].forEach((token) => assertIncludes(component, token, 'OBP resolved surface fallback diagnostics'));

  [
    'value instanceof Date',
    "Reflect.get(value, 'toDate')",
    "Reflect.get(value, 'seconds')",
    'Number.isFinite(date.getTime())',
  ].forEach((token) => assertIncludes(freshnessTimestamp, token, 'OBP freshness timestamp normalization'));

  [
    '} catch {\n        return DAY_KEYS[new Date().getDay()];\n    }',
    '} catch {\n        return null;\n    }',
    'console.error',
    'console.warn',
  ].forEach((token) => assertNotIncludes(component, token, 'OBP resolved surface silent/direct diagnostics'));

  assertIncludes(implDoc, 'OBP resolved surface fallback diagnostics', 'OBP implementation resolved surface diagnostics');
  assertIncludes(firebaseDoc, 'Resolved surface fallback diagnostics', 'OBP Firebase resolved surface diagnostics');
  assertIncludes(audit, 'OBP resolved surface fallback diagnostics checkpoint', 'Production audit OBP resolved surface diagnostics checkpoint');
  assertIncludes(changelog, 'OBP Resolved Surface Fallback Diagnostics', 'Changelog OBP resolved surface diagnostics checkpoint');
}

function verifyOBPUpdateTimestampDoesNotClaimVerification() {
  const component = read('src/app/client/obp/OBPResolvedSurface.tsx');
  const spec = read('__docs__/official-business-page/official-business-page_spec.md');
  const impl = read('__docs__/official-business-page/official-business-page_impl.md');
  const helpdoc = read('__docs__/official-business-page/official-business-page_helpdoc.md');
  const website = read('__docs__/official-business-page/official-business-page_website.md');
  const contract = read('__docs__/canonical-truth-infrastructure/canonical-truth-infrastructure_business-truth-contract.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  [
    "return translate('menu.updatedToday');",
    "return translate('menu.updatedOn', { date: dateLabel });",
    "new Intl.DateTimeFormat(locale,",
    "new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn',",
    'dayFormatter.format(date) === dayFormatter.format(now)',
    "dateStyle: 'medium'",
    "new Error('future_modified_on')",
    'publicCustomerT,',
    'customerLocale,',
    'store?.timeZone,',
  ].forEach((token) => assertIncludes(component, token, 'OBP truthful update timestamp'));
  [
    "t('publicInfoVerifiedToday')",
    "t('publicInfoVerifiedThisWeek')",
    "t('publicInfoVerifiedThisMonth')",
  ].forEach((token) => assertNotIncludes(component, token, 'OBP generic modification timestamp verification claim'));

  assertIncludes(spec, 'This is page-update evidence, not owner verification of every fact.', 'OBP spec update semantics');
  assertIncludes(impl, 'Truthful public update semantics (July 22, 2026)', 'OBP implementation update semantics');
  assertIncludes(helpdoc, 'This does not claim that every field was separately verified on that date.', 'OBP help update semantics');
  assertIncludes(website, 'page-update signal', 'OBP website update semantics');
  assertIncludes(contract, 'A modification timestamp is not', 'Business Truth Contract modification boundary');
  assertIncludes(contract, 'It must never translate generic `modifiedOn` into `verified`.', 'Business Truth Contract public wording boundary');
  assertIncludes(audit, 'OBP Truthful Public Update Semantics - July 22, 2026', 'Production audit public update semantics checkpoint');
  assertIncludes(changelog, 'OBP Truthful Update Semantics And Business Truth Contract', 'Changelog public update semantics checkpoint');
}

function verifyMapsPlaceConfirmationStaysFlagGated() {
  const appFeatures = read('src/config/features.ts');
  const functionsFeatures = read('functions/src/constants/features.ts');
  const storesDal = read('src/database/stores/index.tsx');
  const client = read('src/lib/public-truth-tools/mapsPlaceCheckClient.ts');
  const spec = read('__docs__/menulist-tools/maps-place-check/maps-place-check_spec.md');
  const impl = read('__docs__/menulist-tools/maps-place-check/maps-place-check_impl.md');
  const firebaseDoc = read('__docs__/menulist-tools/maps-place-check/maps-place-check_firebase.md');
  const testCases = read('__docs__/menulist-tools/maps-place-check/maps-place-check_test-cases.md');
  const contract = read('__docs__/canonical-truth-infrastructure/canonical-truth-infrastructure_business-truth-contract.md');

  assertIncludes(appFeatures, 'ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK: false', 'Maps Place Check app flag default');
  assertIncludes(functionsFeatures, 'ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK: false', 'Maps Place Check Functions flag default');

  const confirmDal = storesDal.slice(
    storesDal.indexOf('export const confirmExternalLocationIdentity'),
    storesDal.indexOf('export const clearExternalLocationIdentity'),
  );
  const clearDal = storesDal.slice(
    storesDal.indexOf('export const clearExternalLocationIdentity'),
    storesDal.indexOf('export function assertExternalLocationIdentityMutationSucceeded'),
  );
  assertIncludes(confirmDal, 'if (!FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK)', 'Grounded Place-ID DAL confirmation flag gate');
  assertIncludes(confirmDal, "throw new Error('maps_place_check_not_enabled')", 'Grounded Place-ID DAL confirmation rejection');
  assertNotIncludes(clearDal, 'ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK', 'External identity removal must remain available while disabled');

  const confirmClient = client.slice(
    client.indexOf('export async function confirmMapsPlaceCheckIdentity'),
    client.indexOf('export async function removeConfirmedMapsPlaceIdentity'),
  );
  const removeClient = client.slice(client.indexOf('export async function removeConfirmedMapsPlaceIdentity'));
  assertIncludes(confirmClient, 'if (!FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK)', 'Grounded Place-ID client confirmation flag gate');
  assertNotIncludes(removeClient, 'ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK', 'Grounded Place-ID client removal must remain available while disabled');

  assertIncludes(spec, 'server-authoritative, fail-closed policy', 'Maps Place Check spec collision activation gate');
  assertIncludes(impl, 'Provider smoke is necessary but not sufficient', 'Maps Place Check implementation collision activation gate');
  assertIncludes(firebaseDoc, '## Collision Activation Gate', 'Maps Place Check Firebase collision activation gate');
  assertIncludes(testCases, 'Rejected before any Firestore read or write', 'Maps Place Check flag-disabled confirmation test case');
  assertIncludes(contract, 'no grounded-candidate confirmation UI may be released', 'Business Truth Contract collision activation gate');
}

function verifyPublicMenuSearchFocusLoggingIsBounded() {
  const component = read('src/components/templates/main-app/projects/b2cView/output/MenuSearchBar.tsx');
  const readme = read('__docs__/client-menu/README.md');
  const implDoc = read('__docs__/client-menu/_impl.md');
  const firebaseDoc = read('__docs__/client-menu/client-menu_firebase.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  [
    'public_menu_search_focus_prevent_scroll_failed',
    'public_menu_search_focus_fallback_failed',
    'reportedMenuSearchFocusFailures',
    'logMenuSearchFocusFailure',
    'preventScrollAttempted',
    'activeElementIsSearchInput',
    'hasWindow: typeof window !== \'undefined\'',
    'hasDocument: typeof document !== \'undefined\'',
  ].forEach((token) => assertIncludes(component, token, 'Public menu search focus diagnostics'));

  [
    '} catch {\n            input.focus();\n        }',
    'console.error',
    'console.warn',
  ].forEach((token) => assertNotIncludes(component, token, 'Public menu search focus silent/direct diagnostics'));

  assertIncludes(readme, 'Search focus diagnostics', 'Client menu README search focus diagnostics');
  assertIncludes(implDoc, 'Search focus fallback diagnostics', 'Client menu implementation search focus diagnostics');
  assertIncludes(firebaseDoc, 'Search focus diagnostics', 'Client menu Firebase search focus diagnostics');
  assertIncludes(audit, 'Public menu search focus diagnostics checkpoint', 'Production audit public menu search focus diagnostics checkpoint');
  assertIncludes(changelog, 'Public Menu Search Focus Diagnostics', 'Changelog public menu search focus diagnostics checkpoint');
}

function verifyPublicMenuGradientParserLoggingIsBounded() {
  const gradientUtils = read('src/components/templates/main-app/projects/b2cView/menuPage/gradientUtils.ts');
  const readme = read('__docs__/client-menu/README.md');
  const implDoc = read('__docs__/client-menu/_impl.md');
  const firebaseDoc = read('__docs__/client-menu/client-menu_firebase.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  [
    'public_menu_gradient_parse_failed',
    'MAX_GRADIENT_PARSE_DIAGNOSTICS',
    'reportedGradientParseFailures.add(failureKey)',
    'getApproximateGradientStopCount',
    'gradientStringLength: value.length',
    'hasLinearGradientToken: value.includes',
    "fallbackPolicy: 'use_existing_gradient_fallback'",
  ].forEach((token) => assertIncludes(gradientUtils, token, 'Public menu gradient parser diagnostics'));

  [
    '} catch {\n    return null;\n  }',
    'console.error',
    'console.warn',
    'Error parsing gradient:',
  ].forEach((token) => assertNotIncludes(gradientUtils, token, 'Public menu gradient parser silent/direct diagnostics'));

  assertIncludes(readme, 'Gradient parser diagnostics', 'Client menu README gradient parser diagnostics');
  assertIncludes(implDoc, 'Gradient parser diagnostics', 'Client menu implementation gradient parser diagnostics');
  assertIncludes(firebaseDoc, 'Gradient parser diagnostics', 'Client menu Firebase gradient parser diagnostics');
  assertIncludes(audit, 'Public menu gradient parser diagnostics checkpoint', 'Production audit public menu gradient parser diagnostics checkpoint');
  assertIncludes(changelog, 'Public Menu Gradient Parser Diagnostics', 'Changelog public menu gradient parser diagnostics checkpoint');
}

function verifyPublicMenuBreadcrumbLanguageLoggingIsBounded() {
  const component = read('src/app/client/[[...slug]]/MenuBreadcrumb.tsx');
  const clientMenuPage = read('src/app/client/[[...slug]]/page.tsx');
  const feedbackPage = read('src/app/feedback/[projectId]/page.tsx');
  const obpSurface = read('src/app/client/obp/OBPResolvedSurface.tsx');
  const readme = read('__docs__/client-menu/README.md');
  const firebaseDoc = read('__docs__/client-menu/client-menu_firebase.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  [
    'public_menu_breadcrumb_language_preserve_failed',
    'logBreadcrumbLanguagePreserveFailure',
    'reportedBreadcrumbLanguagePreserveFailure',
    "getBoundedRuntimeStringContext('href', context.href)",
    "getBoundedRuntimeStringContext('currentUrl', context.currentUrl)",
    'hasWindow: typeof window !== \'undefined\'',
    "const normalizedLogoUrl = typeof logoUrl === 'string' ? logoUrl.trim() : '';",
    'const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);',
    'activeLanguage?: string | null;',
    'const normalizedActiveLanguage = normalizePublicLanguageCode(activeLanguage);',
    'const [currentLanguage, setCurrentLanguage] = useState<string | null>(normalizedActiveLanguage);',
    'if (normalizedActiveLanguage) {',
    'const languageHomeHref = getCurrentLanguageHref(homeHref) || homeHref;',
    'const languageOutletHref = getCurrentLanguageHref(resolvedOutletHref);',
    'href={languageHomeHref}',
    'href={languageOutletHref || `/${outletSlug}`}',
    'const logoImageRef = useRef<HTMLImageElement | null>(null);',
    'image?.complete && image.naturalWidth === 0',
    'onError={() => setFailedLogoUrl(normalizedLogoUrl)}',
  ].forEach((token) => assertIncludes(component, token, 'Public menu breadcrumb language and logo fallback boundary'));

  [
    '} catch {\n            return href;\n        }',
    'event.currentTarget.href = nextHref',
    'console.error',
    'console.warn',
  ].forEach((token) => assertNotIncludes(component, token, 'Public menu breadcrumb language silent/direct diagnostics'));

  assertIncludes(clientMenuPage, 'activeLanguage={contentLanguage}', 'Client menu breadcrumb initial language');
  assertIncludes(feedbackPage, 'activeLanguage={storeInfo.contentLanguage}', 'Feedback breadcrumb initial language');
  assertIncludes(obpSurface, 'activeLanguage={contentLanguage}', 'OBP breadcrumb initial language');

  assertIncludes(readme, 'Breadcrumb language preservation diagnostics', 'Client menu README breadcrumb language diagnostics');
  assertIncludes(readme, 'Missing or failed logo loads fall back to the business initial', 'Client menu README public identity logo fallback');
  assertIncludes(readme, 'Failed item-image loads keep the reserved card slot', 'Client menu README item-image load fallback');
  assertIncludes(firebaseDoc, 'Breadcrumb language preservation diagnostics', 'Client menu Firebase breadcrumb language diagnostics');
  assertIncludes(audit, 'Public menu breadcrumb language preservation diagnostics checkpoint', 'Production audit public menu breadcrumb language diagnostics checkpoint');
  assertIncludes(audit, 'Public identity and item-image load fallback checkpoint', 'Production audit public media load fallback checkpoint');
  assertIncludes(changelog, 'Public Menu Breadcrumb Language Preservation Diagnostics', 'Changelog public menu breadcrumb language diagnostics checkpoint');
  assertIncludes(changelog, 'Public Media Load Fallbacks', 'Changelog public media load fallback checkpoint');
}

function verifyPublicMenuLanguageStorageLoggingIsBounded() {
  const component = read('src/components/templates/main-app/projects/b2cView/output/MenuLanguageSwitcher.tsx');
  const publicRenderer = read('src/components/templates/website/clientWebsite/index.tsx');
  const sessionState = read('src/lib/localization/publicMenuSessionState.ts');
  const readme = read('__docs__/client-menu/README.md');
  const firebaseDoc = read('__docs__/client-menu/client-menu_firebase.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  [
    'public_menu_language_storage_read_failed',
    'public_menu_language_storage_remove_failed',
    'public_menu_language_storage_write_failed',
    'logMenuLanguageStorageFailure',
    'reportedMenuLanguageStorageFailures',
    "getBoundedRuntimeStringContext('languageStorageKey', context.languageStorageKey)",
    "getBoundedRuntimeStringContext('activeLanguage', context.activeLanguage)",
    'projectLanguageCount',
    'hasWindow: typeof window !== \'undefined\'',
    'restoredStorageKeyRef.current !== languageStorageKey',
    'getPublicMenuLanguageStorageKey(projectData?.projectId)',
    'localStorage.removeItem(languageStorageKey)',
  ].forEach((token) => assertIncludes(component, token, 'Public menu language storage diagnostics'));

  [
    '} catch {\n                // Local storage may be unavailable in private browsing.\n            }',
    '} catch {\n            // Local storage may be unavailable in private browsing.\n        }',
    'console.error',
    'console.warn',
  ].forEach((token) => assertNotIncludes(component, token, 'Public menu language storage silent/direct diagnostics'));

  [
    'getPublicMenuSessionStateKey(tenantId, storeId, projectStorageId, "activeLanguage")',
    'const [restoredLanguageStorageKey, setRestoredLanguageStorageKey]',
    'if (restoredLanguageStorageKey !== languageStorageKey) return;',
    'public_menu_session_state_read_failed',
    'public_menu_session_state_remove_failed',
    'public_menu_session_state_write_failed',
    'parsePublicMenuScrollY(raw)',
    'removeSessionValue(scrollStorageKey)',
  ].forEach((token) => assertIncludes(publicRenderer, token, 'Public menu session language transition boundary'));
  assertIncludes(sessionState, 'normalizedTenantId', 'Public menu session state tenant partition');
  assertIncludes(sessionState, 'normalizedStoreId', 'Public menu session state store partition');
  assertIncludes(sessionState, 'normalizedProjectId', 'Public menu session state project partition');
  assertNotIncludes(publicRenderer, 'projectData?.id || projectData?.slug || "default"', 'Public menu unsafe session key fallback');

  assertIncludes(readme, 'Language preference storage diagnostics', 'Client menu README language storage diagnostics');
  assertIncludes(firebaseDoc, 'Language preference storage diagnostics', 'Client menu Firebase language storage diagnostics');
  assertIncludes(audit, 'Public menu language preference storage diagnostics checkpoint', 'Production audit public menu language storage diagnostics checkpoint');
  assertIncludes(changelog, 'Public Menu Language Preference Storage Diagnostics', 'Changelog public menu language storage diagnostics checkpoint');
}

function verifyPublicMenuFeedbackNudgeStorageLoggingIsBounded() {
  const component = read('src/components/templates/main-app/projects/b2cView/output/FeedbackNudge.tsx');
  const readme = read('__docs__/client-menu/README.md');
  const firebaseDoc = read('__docs__/client-menu/client-menu_firebase.md');
  const feedbackReadme = read('__docs__/projects/internal-feedback-system/README.md');
  const feedbackFirebaseDoc = read('__docs__/projects/internal-feedback-system/internal-feedback-system_firebase.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  [
    'public_menu_feedback_nudge_storage_read_failed',
    'public_menu_feedback_nudge_storage_write_failed',
    'logFeedbackNudgeStorageFailure',
    'reportedFeedbackNudgeStorageFailures',
    "getBoundedRuntimeStringContext('sessionKey', context.sessionKey)",
    "getBoundedRuntimeStringContext('projectId', context.projectId)",
    'hasWindow: typeof window !== \'undefined\'',
  ].forEach((token) => assertIncludes(component, token, 'Public menu feedback nudge storage diagnostics'));

  [
    '} catch {\n            return false;\n        }',
    '} catch {\n            // sessionStorage not available\n        }',
    'console.error',
    'console.warn',
  ].forEach((token) => assertNotIncludes(component, token, 'Public menu feedback nudge storage silent/direct diagnostics'));

  [
    'const [visibleProjectId, setVisibleProjectId]',
    'const [dismissedProjectId, setDismissedProjectId]',
    'triggeredProjectIdRef.current === normalizedProjectId',
    'visibleProjectId !== normalizedProjectId',
    'dismissedProjectId === normalizedProjectId',
  ].forEach((token) => assertIncludes(component, token, 'Public menu feedback nudge project transition isolation'));

  assertIncludes(readme, 'Feedback nudge storage diagnostics', 'Client menu README feedback nudge diagnostics');
  assertIncludes(firebaseDoc, 'Feedback nudge storage diagnostics', 'Client menu Firebase feedback nudge diagnostics');
  assertIncludes(feedbackReadme, 'Feedback nudge storage diagnostics', 'Guest Feedback README feedback nudge diagnostics');
  assertIncludes(feedbackFirebaseDoc, 'Feedback nudge storage diagnostics', 'Guest Feedback Firebase feedback nudge diagnostics');
  assertIncludes(audit, 'Public menu feedback nudge storage diagnostics checkpoint', 'Production audit public menu feedback nudge diagnostics checkpoint');
  assertIncludes(changelog, 'Public Menu Feedback Nudge Storage Diagnostics', 'Changelog public menu feedback nudge diagnostics checkpoint');
}

function verifyPublicMenuExternalLinksAreNormalized() {
  const menuFooter = read('src/components/templates/main-app/projects/b2cView/output/MenuFooter.tsx');
  const menuPage = read('src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx');
  const feedbackNudge = read('src/components/templates/main-app/projects/b2cView/output/FeedbackNudge.tsx');
  const readme = read('__docs__/client-menu/README.md');
  const firebaseDoc = read('__docs__/client-menu/client-menu_firebase.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  [
    'normalizeOBPGoogleMapsUrl(publicPresence?.googleMapsUrl)',
    'const displayPhone = callHref && storeDetails?.phoneNumber',
    '{displayPhone && (!showCall || !callHref) && (',
    'const reservationHref = normalizeOBPExternalHttpsUrl(publicPresence?.reservationUrl) || undefined;',
    'const orderHref = normalizeOBPExternalHttpsUrl(publicPresence?.orderUrl) || undefined;',
    'normalizeMenuFooterSocialUrl',
    'normalizeOBPSocialUrl(normalizedPlatform as OBPSocialPlatform, value)',
    "allowedHostBases: ['wa.me', 'whatsapp.com', 'api.whatsapp.com']",
    'href={reservationHref}',
    'href={orderHref}',
  ].forEach((token) => assertIncludes(menuFooter, token, 'Public menu footer external link normalization'));

  assertNotIncludes(
    menuFooter,
    '{storeDetails?.phoneNumber && (!showCall || !callHref) && (',
    'Public menu footer invalid raw phone fallback',
  );

  [
    'normalizeOBPGoogleMapsUrl(publicPresence?.googleMapsUrl)',
    'const reservationHref = normalizeOBPExternalHttpsUrl(publicPresence?.reservationUrl) || undefined;',
    'const orderHref = normalizeOBPExternalHttpsUrl(publicPresence?.orderUrl) || undefined;',
    'href: reservationHref',
    'href: orderHref',
  ].forEach((token) => assertIncludes(menuPage, token, 'Public menu recovery action external link normalization'));

  [
    'normalizeOBPReviewUrl(reviewUrl)',
    'normalizeGuestFeedbackProjectId(projectId)',
    'const safeReviewUrl = normalizeOBPReviewUrl(reviewUrl);',
    'href={safeReviewUrl || appendPublicLanguageParam(',
    '`/feedback/${normalizedProjectId}?source=menu_footer`,',
    'activeLanguage,',
    "target={safeReviewUrl ? '_blank' : '_self'}",
  ].forEach((token) => assertIncludes(feedbackNudge, token, 'Public menu feedback review link normalization'));

  [
    'href={publicPresence.reservationUrl}',
    'href={publicPresence.orderUrl}',
    'href: publicPresence.reservationUrl',
    'href: publicPresence.orderUrl',
    'const directionsHref = publicPresence?.googleMapsUrl ||',
    'Object.entries(storeDetails.socialMedia).filter(([_, url]) => url && url.trim())',
  ].forEach((token) => {
    assertNotIncludes(menuFooter, token, 'Public menu footer must not render raw owner-managed external URLs');
    assertNotIncludes(menuPage, token, 'Public menu recovery actions must not render raw owner-managed external URLs');
  });
  assertNotIncludes(feedbackNudge, 'href={reviewUrl || `/feedback/${projectId}?source=menu_footer`}', 'Public menu feedback nudge must not render raw review URLs');

  assertIncludes(readme, 'Public menu external link normalization', 'Client menu README external link normalization');
  assertIncludes(firebaseDoc, 'Public menu external link normalization', 'Client menu Firebase external link normalization');
  assertIncludes(audit, 'Public menu external link normalization checkpoint', 'Production audit public menu external link normalization checkpoint');
  assertIncludes(changelog, 'Public Menu External Link Normalization', 'Changelog public menu external link normalization checkpoint');
}

function verifyPublicMenuFooterFreshnessLoggingIsBounded() {
  const component = read('src/components/templates/main-app/projects/b2cView/output/MenuFooter.tsx');
  const readme = read('__docs__/client-menu/README.md');
  const firebaseDoc = read('__docs__/client-menu/client-menu_firebase.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  [
    'public_menu_footer_freshness_relative_failed',
    'public_menu_footer_freshness_iso_failed',
    'logMenuFooterFreshnessFailure',
    'reportedMenuFooterFreshnessFailures',
    'resolveMenuFooterDate(',
    'normalizeOBPFreshnessDate(timestamp)',
    'getMenuFooterUpdatedAtIso',
    "getBoundedRuntimeStringContext('timestampType', timestampType)",
    "throw new Error('invalid_last_published_at')",
    'formatRelativeDate(lastPublishedAt, activeLanguage, t)',
    'const lastUpdatedIso = lastPublishedAt ? getMenuFooterUpdatedAtIso(lastPublishedAt) : undefined;',
    'const showFreshnessText = Boolean(relativeUpdatedAt);',
    'data-last-updated={lastUpdatedIso}',
  ].forEach((token) => assertIncludes(component, token, 'Public menu footer freshness diagnostics'));

  assertIncludes(component, 'storeDetails?: Partial<StoreDataType>;', 'Public menu footer minimized store contract');
  assertIncludes(component, "lastPublishedAt?: StoreDataType['lastPublishedAt'];", 'Public menu footer canonical timestamp contract');
  assertIncludes(component, 'timestamp: unknown,', 'Public menu footer runtime timestamp boundary');
  assertNotIncludes(component, 'lastPublishedAt?: any', 'Public menu footer erased timestamp type');

  [
    'data-last-updated={lastPublishedAt?.toDate?.()?.toISOString?.() || lastPublishedAt}',
    'if (isNaN(date.getTime())) return \'\';',
    '} catch {\n        return \'\';\n    }',
    'console.error',
    'console.warn',
  ].forEach((token) => assertNotIncludes(component, token, 'Public menu footer freshness silent/direct diagnostics'));

  assertIncludes(readme, 'Footer freshness diagnostics', 'Client menu README footer freshness diagnostics');
  assertIncludes(firebaseDoc, 'Footer freshness diagnostics', 'Client menu Firebase footer freshness diagnostics');
  assertIncludes(audit, 'Public menu footer freshness diagnostics checkpoint', 'Production audit public menu footer freshness diagnostics checkpoint');
  assertIncludes(changelog, 'Public Menu Footer Freshness Diagnostics', 'Changelog public menu footer freshness diagnostics checkpoint');
}

function verifyOBPCustomerQuickAnswersAreVisibleAndBounded() {
  const obpSurface = read('src/app/client/obp/OBPResolvedSurface.tsx');
  const businessAttributes = read('src/lib/obp/businessAttributes.ts');
  const obpStyles = read('src/app/client/obp/obp.module.scss');
  const enUS = read('public/locales/menulist.ai/en-US.json');
  const hiIN = read('public/locales/menulist.ai/hi-IN.json');

  assertIncludes(obpSurface, 'customerQuickAnswers', 'OBP customer quick answers runtime');
  assertIncludes(obpSurface, "t('publicCustomerAnswersTitle')", 'OBP customer quick answers title');
  assertIncludes(obpSurface, "t('publicCustomerAnswerHoursAnswer', { hours: todayHours })", 'OBP customer quick answers visible hours fact');
  assertIncludes(obpSurface, "t('publicCustomerAnswerLocationAnswer', { address: fullAddress })", 'OBP customer quick answers visible address fact');
  assertIncludes(obpSurface, "t('publicCustomerAnswerMenuAnswer')", 'OBP customer quick answers menu answer');
  assertIncludes(obpSurface, "t('publicCustomerAnswerWhatsAppAnswer')", 'OBP customer quick answers WhatsApp answer');
  assertIncludes(obpSurface, "t('publicCustomerAnswerDirectionsAnswer')", 'OBP customer quick answers directions answer');
  assertIncludes(obpSurface, 'customerQuickAnswers.length > 0 && !isPermanentlyClosed', 'OBP customer quick answers closure guard');
  assertIncludes(obpSurface, '.filter((attribute) => attribute.active !== false)', 'OBP disabled custom business-attribute filter');
  assertIncludes(businessAttributes, 'export const MAX_CUSTOM_BUSINESS_ATTRIBUTES = 6;', 'Custom business-attribute runtime cap');
  assertIncludes(businessAttributes, 'seenIds.has(id)', 'Custom business-attribute duplicate identity guard');
  assertIncludes(obpStyles, '.customerAnswers', 'OBP customer quick answers style');
  assertIncludes(obpStyles, '.customerAnswerQuestion', 'OBP customer quick answers question style');
  assertIncludes(enUS, '"publicCustomerAnswersTitle"', 'en-US OBP customer quick answers locale');
  assertIncludes(hiIN, '"publicCustomerAnswersTitle"', 'hi-IN OBP customer quick answers locale');
  assertNotIncludes(enUS, 'It is always up to date.', 'OBP FAQ menu answer must not overclaim freshness');
  assertNotIncludes(hiIN, 'यह हमेशा अपडेट रहता है', 'OBP FAQ menu answer must not overclaim freshness');
}

function verifyOwnerPreviewProjectMetadataContractIsTyped() {
  const renderer = read('src/components/templates/website/mainContentRenderer/index.tsx');

  assertIncludes(
    renderer,
    "Project & Partial<Pick<ProjectSummaryData, 'projectImage' | 'slug'>>",
    'Owner OBP preview project/summary composition type',
  );
  assertIncludes(renderer, 'const previewProjectSlug = projectData.slug', 'Owner OBP preview typed slug read');
  assertIncludes(renderer, 'projectImage: projectData.projectImage', 'Owner OBP preview typed image read');
  assertNotIncludes(renderer, '(projectData as any)', 'Owner OBP preview broad project cast');
}

function verifyPublicFaqSchemaFreshnessCopyIsBounded() {
  const schema = read('src/lib/schema/index.ts');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const localeDir = path.join(ROOT, 'public/locales/menulist.ai');
  const stalePublicFaqFreshnessPhrases = [
    'It is always up to date',
    'Always up to date',
    'always up to date',
    'Siempre está actualizado',
    'يتم تحديثها دائماً',
    'હંમેશા અપડેટ',
    'সবসময় আপডেট',
    '始终保持最新',
    'नेहमी अद्ययावत',
    'எப்போதும் புதுப்பிக்கப்பட்டிருக்கும்',
    'ఎల్లప్పుడూ నవీకరించబడి ఉంటుంది',
  ];

  assertIncludes(
    schema,
    '`You can view the full published menu at ${catalogUrl}.`',
    'Public FAQ schema menu answer source-bound fallback',
  );
  assertNotIncludes(schema, 'It is always up to date.', 'Public FAQ schema fallback freshness overclaim');

  const localeHits = [];
  for (const filename of fs.readdirSync(localeDir).filter((entry) => entry.endsWith('.json')).sort()) {
    const relPath = `public/locales/menulist.ai/${filename}`;
    const locale = JSON.parse(read(relPath));
    const answers = collectValuesByKey(locale, 'publicFaqMenuAnswer');

    answers.forEach((answer, index) => {
      stalePublicFaqFreshnessPhrases.forEach((phrase) => {
        if (answer.includes(phrase)) {
          localeHits.push(`${relPath}:publicFaqMenuAnswer[${index}] includes stale freshness phrase ${phrase}`);
        }
      });
    });
  }

  assert(localeHits.length === 0, `Public FAQ schema locale answers must not overclaim menu freshness:\n${localeHits.join('\n')}`);
  assertIncludes(
    productionAudit,
    'Public FAQ schema freshness-copy checkpoint',
    'Production audit records public FAQ schema freshness checkpoint',
  );
  assertIncludes(
    productionAudit,
    '`npm run verify:public-business-truth` now parses every active locale JSON file and source-gates `publicFaqMenuAnswer`',
    'Production audit records public FAQ schema locale verifier boundary',
  );
  assertIncludes(changelog, 'Public FAQ Schema Freshness Copy Boundary', 'Changelog public FAQ schema freshness checkpoint');
  assertIncludes(
    changelog,
    '`npm run verify:public-business-truth` now parses every active locale JSON file and rejects stale `publicFaqMenuAnswer` freshness promises',
    'Changelog public FAQ schema locale verifier boundary',
  );
}

function verifyPublicMenuAnalyticsLoggingIsBounded() {
  const component = read('src/components/templates/website/clientWebsite/AnalyticsContext.tsx');
  const googleAnalytics = read('src/components/templates/website/clientWebsite/GoogleAnalytics.tsx');
  const facebookPixel = read('src/components/templates/website/clientWebsite/FacebookPixel.tsx');
  const analyticsPreferences = read('src/lib/analytics/preferences.ts');
  const menuPage = read('src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx');
  const analyticsUnified = read('src/lib/analytics/unified.ts');
  const diagnostics = read('src/lib/analytics/analyticsDiagnostics.ts');
  const sourceAttribution = read('src/lib/analytics/sourceAttribution.ts');
  const trackBeforeNavigate = read('src/lib/analytics/trackBeforeNavigate.ts');
  const obpMenuCta = read('src/app/client/obp/OBPMenuCTA.tsx');
  const pdpModal = read('src/components/templates/main-app/projects/b2cView/output/PDPModal.tsx');
  const obpAnalyticsAggregation = read('functions/src/analytics/obpAnalyticsAggregation.ts');
  const analyticsImplDoc = read('__docs__/client-menu/analytics-tracking/_impl.md');
  const analyticsFirebaseDoc = read('__docs__/client-menu/analytics-tracking/analytics-tracking_firebase.md');
  const obpImplDoc = read('__docs__/official-business-page/official-business-page_impl.md');
  const obpFirebaseDoc = read('__docs__/official-business-page/official-business-page_firebase.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  [
    'GA4_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/',
    'normalizeGoogleAnalyticsMeasurementId',
    'String(value || \'\').trim().toUpperCase()',
  ].forEach((token) => assertIncludes(analyticsPreferences, token, 'Shared Google Analytics ID boundary'));
  assertIncludes(googleAnalytics, 'const gaId = normalizeGoogleAnalyticsMeasurementId(storeDetails?.analytics?.googleAnalyticsId)', 'Customer menu Google Analytics shared ID boundary');
  assertNotIncludes(googleAnalytics, 'const gaId = storeDetails?.analytics?.googleAnalyticsId', 'Customer menu Google Analytics must not interpolate raw owner ID');

  [
    'META_PIXEL_ID_PATTERN = /^\\d{5,32}$/',
    'normalizeMetaPixelId',
    'String(value || \'\').trim()',
  ].forEach((token) => assertIncludes(analyticsPreferences, token, 'Shared Meta Pixel ID boundary'));
  assertIncludes(facebookPixel, 'const pixelId = normalizeMetaPixelId(storeDetails?.analytics?.facebookPixelId)', 'Customer menu Meta Pixel shared ID boundary');
  assertNotIncludes(facebookPixel, 'const pixelId = storeDetails?.analytics?.facebookPixelId', 'Customer menu Meta Pixel must not interpolate raw owner ID');

  assertIncludes(analyticsImplDoc, 'Customer menu third-party analytics ID boundary', 'Analytics implementation third-party ID boundary');
  assertIncludes(analyticsFirebaseDoc, 'External pixel ID validation rule', 'Analytics Firebase third-party ID boundary');
  assertIncludes(audit, 'Customer menu third-party analytics ID boundary checkpoint', 'Production audit customer menu third-party analytics ID checkpoint');
  assertIncludes(changelog, 'Customer Menu Third-Party Analytics ID Boundary', 'Changelog customer menu third-party analytics ID checkpoint');

  [
    'const utmSource = normalizeAnalyticsMapKey(data.utm_source);',
    'if (utmSource) updateData[`viewsBySource.${utmSource}`] = 1;',
    'const utmMedium = normalizeAnalyticsMapKey(data.utm_medium);',
    'if (utmMedium) updateData[`viewsByMedium.${utmMedium}`] = 1;',
    'const utmCampaign = normalizeAnalyticsMapKey(data.utm_campaign);',
    'if (utmCampaign) updateData[`viewsByCampaign.${utmCampaign}`] = 1;',
    'const obpUtmSource = normalizeAnalyticsMapKey(data.utm_source);',
    'if (obpUtmSource) updateData[`viewsBySource.${obpUtmSource}`] = 1;',
    'const obpUtmMedium = normalizeAnalyticsMapKey(data.utm_medium);',
    'if (obpUtmMedium) updateData[`viewsByMedium.${obpUtmMedium}`] = 1;',
    'const obpUtmCampaign = normalizeAnalyticsMapKey(data.utm_campaign);',
    'if (obpUtmCampaign) updateData[`viewsByCampaign.${obpUtmCampaign}`] = 1;',
  ].forEach((token) => assertIncludes(analyticsUnified, token, 'Customer menu UTM map-key boundary'));
  [
    'updateData[`viewsBySource.${data.utm_source}`] = 1',
    'updateData[`viewsByMedium.${data.utm_medium}`] = 1',
    'updateData[`viewsByCampaign.${data.utm_campaign}`] = 1',
  ].forEach((token) => assertNotIncludes(analyticsUnified, token, 'Customer menu UTM values must not become raw Firestore map-key suffixes'));
  assertIncludes(analyticsImplDoc, 'Customer menu UTM map-key boundary', 'Analytics implementation UTM map-key boundary');
  assertIncludes(analyticsFirebaseDoc, 'UTM map-key rule', 'Analytics Firebase UTM map-key boundary');
  assertIncludes(obpImplDoc, 'normalized through the analytics map-key guard before becoming Firestore map-key suffixes', 'OBP implementation UTM map-key boundary');
  assertIncludes(obpFirebaseDoc, 'each UTM value is normalized through the analytics map-key guard before it becomes a Firestore map-key suffix', 'OBP Firebase UTM map-key boundary');
  assertIncludes(audit, 'Customer menu UTM map-key boundary checkpoint', 'Production audit customer menu UTM map-key checkpoint');
  assertIncludes(changelog, 'Customer Menu UTM Map-Key Boundary', 'Changelog customer menu UTM map-key checkpoint');

  [
    'function normalizeOBPAnalyticsMapKey(value: string): string | null {',
    ".replace(/[^a-z0-9_-]+/g, '_')",
    'function assignOBPNumericMapValue(target: Record<string, number>, key: string, value: unknown): void {',
    'target[normalizedKey] = (target[normalizedKey] || 0) + numeric;',
    'assignOBPNumericMapValue(result, key, value);',
    'assignOBPNumericMapValue(result, key.slice(prefix.length), value);',
    'const currentMap = readAnalyticsMap(currentDaily as Record<string, any>, field);',
    'const previousMap = readAnalyticsMap(previousRow as Record<string, any>, field);',
    'function isValidOBPNumberMap(value: unknown): boolean {',
    'function normalizeOBPDailyDocument(',
    'assignNestedPathUpdate(updates, `${target}.${key}`, FieldValue.increment(delta));',
    'assignNestedPathUpdate(updates, `lifetime.obpLanguageNames.${language}`, name);',
  ].forEach((token) => assertIncludes(obpAnalyticsAggregation, token, 'OBP aggregation map-key boundary'));
  [
    'result[key.slice(prefix.length)] = numeric;',
  ].forEach((token) => assertNotIncludes(obpAnalyticsAggregation, token, 'OBP aggregation must not use raw recovered map keys as dotted field suffixes'));
  assertIncludes(analyticsImplDoc, 'OBP aggregation map-key boundary', 'Analytics implementation OBP aggregation map-key boundary');
  assertIncludes(obpImplDoc, 'OBP aggregation map-key boundary', 'OBP implementation aggregation map-key boundary');
  assertIncludes(obpFirebaseDoc, 'OBP aggregation map-key guard', 'OBP Firebase aggregation map-key boundary');
  assertIncludes(audit, 'OBP aggregation map-key boundary checkpoint', 'Production audit OBP aggregation map-key checkpoint');
  assertIncludes(changelog, 'OBP Aggregation Map-Key Boundary', 'Changelog OBP aggregation map-key checkpoint');

  assertIncludes(diagnostics, 'logAnalyticsFailure', 'Public menu analytics diagnostics helper');
  assertIncludes(sourceAttribution, 'analytics_source_attribution_url_parse_failed', 'Analytics source attribution URL parse diagnostics');
  assertIncludes(sourceAttribution, 'logSourceAttributionFailure', 'Analytics source attribution bounded failure helper');
  assertIncludes(sourceAttribution, 'MAX_SOURCE_ATTRIBUTION_DIAGNOSTICS', 'Analytics source attribution diagnostic cap');
  assertIncludes(sourceAttribution, "getBoundedAnalyticsStringContext('sourceUrl', url)", 'Analytics source attribution bounded URL context');
  assertIncludes(sourceAttribution, "getBoundedAnalyticsStringContext('entrySource', entrySource)", 'Analytics source attribution bounded source context');
  assertIncludes(sourceAttribution, 'isAbsoluteUrl: isAbsoluteAnalyticsUrl(url)', 'Analytics source attribution absolute-url metadata');
  assertIncludes(sourceAttribution, "hasQuery: url.includes('?')", 'Analytics source attribution query metadata');
  assertIncludes(sourceAttribution, "hasHash: url.includes('#')", 'Analytics source attribution hash metadata');
  assertIncludes(sourceAttribution, 'logSourceAttributionFailure(error, url, entrySource);\n        return url;', 'Analytics source attribution parse failure must preserve the original URL');
  assertIncludes(analyticsImplDoc, 'Shared source-attribution diagnostics', 'Analytics implementation source attribution diagnostics');
  assertIncludes(analyticsFirebaseDoc, 'Source attribution diagnostics rule', 'Analytics Firebase source attribution diagnostics');
  assertIncludes(audit, 'Analytics source attribution URL diagnostics checkpoint', 'Production audit analytics source attribution checkpoint');
  assertIncludes(changelog, 'Analytics Source Attribution URL Diagnostics', 'Changelog analytics source attribution checkpoint');
  assertIncludes(component, 'getPublicMenuAnalyticsContext', 'Public menu analytics bounded context helper');
  assertIncludes(component, 'getPublicMenuItemAnalyticsContext', 'Public menu item analytics bounded context helper');
  assertIncludes(component, 'const resolvePublicMenuAnalyticsScope = (', 'Public menu analytics canonical scope helper');
  assertIncludes(component, 'normalizeMenuListPublicEntityIdentityAliases([', 'Public menu analytics exact all-alias scope');
  assertIncludes(component, 'previousLanguageScopeKeyRef.current !== languageScopeKey', 'Public menu language adoption scope transition reset');
  assertNotIncludes(component, 'storeDetails.tenantId || (storeDetails as any).tId', 'Public menu analytics first-truthy tenant alias');
  assertNotIncludes(component, 'storeDetails.storeId || (storeDetails as any)._id', 'Public menu analytics first-truthy store alias');
  assertIncludes(component, 'public_menu_view_tracking_failed', 'Public menu view diagnostics');
  assertIncludes(component, 'public_menu_alias_project_switch_tracking_failed', 'Public menu alias switch diagnostics');
  assertIncludes(component, 'public_menu_analytics_setup_failed', 'Public menu setup diagnostics');
  assertIncludes(component, 'public_menu_language_adoption_tracking_failed', 'Public menu language adoption diagnostics');
  assertIncludes(component, 'public_menu_language_adoption_setup_failed', 'Public menu language setup diagnostics');
  assertIncludes(component, 'public_menu_item_view_missing_scope', 'Public menu item view missing-scope diagnostics');
  assertIncludes(component, 'public_menu_item_view_tracking_failed', 'Public menu item view diagnostics');
  assertIncludes(component, 'public_menu_item_view_setup_failed', 'Public menu item view setup diagnostics');
  assertIncludes(component, 'public_menu_item_tap_tracking_failed', 'Public menu item tap diagnostics');
  assertIncludes(component, 'public_menu_item_tap_setup_failed', 'Public menu item tap setup diagnostics');
  assertIncludes(menuPage, 'public_menu_state_restore_failed', 'Public menu state restore diagnostics');
  assertIncludes(menuPage, 'public_menu_state_save_failed', 'Public menu state save diagnostics');
  assertIncludes(menuPage, "getBoundedAnalyticsStringContext('storageKey', storageKey)", 'Public menu state bounded storage-key context');
  assertIncludes(menuPage, "getBoundedAnalyticsStringContext('activeFilter', activeFilter)", 'Public menu state bounded filter context');
  assertIncludes(menuPage, "getBoundedAnalyticsStringContext('activeCategoryId', savedCategoryId)", 'Public menu state bounded category context');
  assertIncludes(component, 'getBoundedAnalyticsStringContext', 'Public menu analytics bounded string context');
  assertIncludes(component, 'getAnalyticsTrackingContext', 'Public menu analytics shared tracking context');
  assertIncludes(trackBeforeNavigate, 'public_link_navigation_tracking_failed', 'Public link navigation tracking diagnostics');
  assertIncludes(trackBeforeNavigate, 'logTrackBeforeNavigateFailure', 'Public link navigation bounded failure helper');
  assertIncludes(trackBeforeNavigate, "getBoundedAnalyticsStringContext('href', href)", 'Public link navigation bounded href context');
  assertIncludes(trackBeforeNavigate, "getBoundedAnalyticsStringContext('target', target)", 'Public link navigation bounded target context');
  assertIncludes(trackBeforeNavigate, "'alternate_open'", 'Public link alternate-open tracking reason');
  assertIncludes(trackBeforeNavigate, "'target_blank'", 'Public link target-blank tracking reason');
  assertIncludes(trackBeforeNavigate, "'same_tab'", 'Public link same-tab tracking reason');
  assertIncludes(obpMenuCta, 'obp_menu_cta_entry_source_fallback_failed', 'OBP Menu CTA entry-source fallback diagnostics');
  assertIncludes(obpMenuCta, 'logOBPMenuCTAEntrySourceFallbackFailure', 'OBP Menu CTA bounded fallback helper');
  assertIncludes(obpMenuCta, 'MAX_OBP_MENU_CTA_ENTRY_SOURCE_DIAGNOSTICS', 'OBP Menu CTA diagnostic cap');
  assertIncludes(obpMenuCta, 'reportedOBPMenuCTAEntrySourceFallbackFailures', 'OBP Menu CTA diagnostic dedupe guard');
  assertIncludes(obpMenuCta, "getBoundedAnalyticsStringContext('menuUrl', url)", 'OBP Menu CTA bounded URL context');
  assertIncludes(obpMenuCta, 'isAbsoluteUrl: isAbsoluteOBPMenuCTAUrl(url)', 'OBP Menu CTA URL shape metadata');
  assertIncludes(obpMenuCta, "hasQuery: url.includes('?')", 'OBP Menu CTA query metadata');
  assertIncludes(obpMenuCta, "hasHash: url.includes('#')", 'OBP Menu CTA hash metadata');
  assertIncludes(obpImplDoc, 'OBP Menu CTA entry-source diagnostics', 'OBP implementation Menu CTA entry-source diagnostics');
  assertIncludes(obpFirebaseDoc, 'Menu CTA entry-source diagnostics', 'OBP Firebase Menu CTA entry-source diagnostics');
  assertIncludes(audit, 'OBP Menu CTA entry-source diagnostics checkpoint', 'Production audit OBP Menu CTA entry-source diagnostics checkpoint');
  assertIncludes(changelog, 'OBP Menu CTA Entry Source Diagnostics', 'Changelog OBP Menu CTA entry-source diagnostics checkpoint');
  assertIncludes(obpMenuCta, 'Promise.all([menuClick, projectSwitch])', 'OBP secondary project card tracking propagates failures to trackBeforeNavigate');
  assertIncludes(pdpModal, 'public_menu_pdp_item_share_copy_failed', 'Public menu PDP share-copy diagnostics');
  assertIncludes(pdpModal, 'public_menu_pdp_item_share_clipboard_unavailable', 'Public menu PDP unavailable clipboard code');
  assertIncludes(pdpModal, 'public_menu_pdp_item_share_copy_fallback_failed', 'Public menu PDP fallback copy failure code');
  assertIncludes(pdpModal, 'hasPdpItemShareClipboardWrite', 'Public menu PDP Clipboard API support helper');
  assertIncludes(pdpModal, 'hasPdpItemShareCopyFallback', 'Public menu PDP copy fallback support helper');
  assertIncludes(pdpModal, "const copied = document.execCommand('copy');", 'Public menu PDP textarea copy acknowledgement');
  assertIncludes(pdpModal, 'clipboardWriteError', 'Public menu PDP Clipboard API rejection must fall through to fallback');
  assertIncludes(pdpModal, "getBoundedRuntimeStringContext('itemShareUrl', itemShareUrl)", 'Public menu PDP bounded share URL context');
  assertIncludes(pdpModal, "getBoundedRuntimeStringContext('shareTitle', shareTitle)", 'Public menu PDP bounded share title context');
  assertIncludes(pdpModal, 'hasCopyFallback: hasPdpItemShareCopyFallback()', 'Public menu PDP fallback support metadata');
  assertNotIncludes(component, 'console.error(', 'Public menu analytics direct error logging');
  assertNotIncludes(sourceAttribution, '} catch {\n        const separator = url.includes(\'?\') ? \'&\' : \'?\';', 'Analytics source attribution URL parse must not fail silently');
  assertNotIncludes(component, 'console.warn(', 'Public menu analytics direct warn logging');
  assertNotIncludes(component, 'console.log(', 'Public menu analytics direct log logging');
  assertNotIncludes(component, 'console.debug(', 'Public menu analytics direct debug logging');
  assertNotIncludes(menuPage, 'Silent fail - state persistence is non-critical', 'Public menu state restore silent catch');
  assertNotIncludes(menuPage, 'Silent fail - quota exceeded or private browsing', 'Public menu state save silent catch');
  assertNotIncludes(trackBeforeNavigate, '.catch(() => { });', 'Public link navigation silent tracking catch');
  assertNotIncludes(obpMenuCta, "} catch {\n        const separator = url.includes('?') ? '&' : '?';\n        return `${url}${separator}entry_source=obp`;\n    }", 'OBP Menu CTA entry-source fallback must not fail silently');
  assertNotIncludes(obpMenuCta, 'Promise.allSettled([menuClick, projectSwitch])', 'OBP secondary project card tracking must not swallow analytics failures');
  assertNotIncludes(component, 'Error tracking menu page view:', 'Public menu analytics raw view logging');
  assertNotIncludes(component, 'Error tracking project switch for Layer 2 alias:', 'Public menu analytics raw alias logging');
  assertNotIncludes(component, 'Error in analytics tracking setup:', 'Public menu analytics raw setup logging');
  assertNotIncludes(component, 'Error tracking menu language adoption:', 'Public menu analytics raw language logging');
  assertNotIncludes(component, 'Item view tracking skipped: Missing tenant or store ID', 'Public menu analytics raw missing-scope logging');
  assertNotIncludes(component, 'Error tracking specific menu item view:', 'Public menu analytics raw item view logging');
  assertNotIncludes(component, 'Error in item view tracking:', 'Public menu analytics raw item view setup logging');
  assertNotIncludes(component, 'Error tracking menu item tap:', 'Public menu analytics raw item tap logging');
  assertNotIncludes(component, 'Error in item tap tracking:', 'Public menu analytics raw item tap setup logging');
  assertNotIncludes(pdpModal, "document.execCommand('copy');\n    document.body.removeChild(textArea);", 'Public menu PDP copy fallback must not assume success');
  assertNotIncludes(pdpModal, "if (navigator.clipboard?.writeText) {\n        await navigator.clipboard.writeText(text);\n        return;\n    }", 'Public menu PDP Clipboard API rejection must not skip acknowledged fallback');
  assertNotIncludes(pdpModal, "} catch {\n            setShareStatus('Could not share');", 'Public menu PDP share-copy failure must be diagnosed');
}

function verifyClientMenuErrorBoundaryLoggingIsBounded() {
  const component = read('src/app/client/error.tsx');

  assertIncludes(component, 'secureError(', 'Client menu error boundary secure logging');
  assertIncludes(component, 'buildClientMenuErrorLogContext', 'Client menu error boundary bounded context helper');
  assertIncludes(component, 'new Error("client_menu_error_boundary")', 'Client menu error boundary normalized error code');
  assertIncludes(component, '(getBoundedErrorName(error) || "Error").slice(0, 80)', 'Client menu error boundary capped error name');
  assertIncludes(component, 'hasDigest: Boolean(digest)', 'Client menu error boundary digest presence context');
  assertIncludes(component, 'digestLength: digest.length', 'Client menu error boundary bounded digest context');
  assertNotIncludes(component, 'console.error', 'Client menu error boundary direct error logging');
  assertNotIncludes(component, 'error.message', 'Client menu error boundary raw message logging');
  assertNotIncludes(component, 'errorName: error.name || "Error"', 'Client menu error boundary uncapped error name logging');
  assertNotIncludes(component, 'error.digest)', 'Client menu error boundary raw digest logging');
}

function verifyMenuHealthPublishLoggingIsBounded() {
  const helper = read('src/lib/firebase/functions.ts');
  const publishVerification = read('functions/src/monitoring/publishVerification.ts');
  const b2cView = read('src/components/templates/main-app/projects/b2cView/index.tsx');

  assertIncludes(helper, "import { secureError } from '@lib/security/secureLogger';", 'Menu health publish secure logging');
  assertIncludes(helper, 'logVerifyMenuPublishFailure', 'Menu health publish bounded failure logger');
  assertIncludes(helper, "new Error('verify_menu_publish_failed')", 'Menu health publish normalized failure code');
  assertIncludes(helper, "getBoundedFirebaseCallableStringContext('storeId', payload.storeId)", 'Menu health publish bounded store context');
  assertIncludes(helper, "getBoundedFirebaseCallableStringContext('tenantId', payload.tenantId)", 'Menu health publish bounded tenant context');
  assertIncludes(helper, "getBoundedFirebaseCallableStringContext('publicMenuUrl', payload.publicMenuUrl)", 'Menu health publish bounded URL context');
  assertIncludes(helper, 'sourceErrorName: getFirebaseCallableErrorName(error)', 'Menu health publish source error name');
  assertIncludes(helper, 'sourceErrorCode: getFirebaseCallableErrorCode(error)', 'Menu health publish source error code');
  assertIncludes(helper, 'sourceStatusCode: getFirebaseCallableErrorStatus(error)', 'Menu health publish source status code');
  assertIncludes(publishVerification, 'MENU_TARGET_REJECTED', 'Menu health publish verification rejects unsafe network targets');
  assertIncludes(publishVerification, 'validateNetworkTargetUrl(cacheBustUrl', 'Menu health publish verification validates public menu network target before fetch');
  assertIncludes(publishVerification, 'fetch(targetValidation.normalizedUrl', 'Menu health publish verification fetches normalized validated target');
  assertIncludes(publishVerification, 'PUBLISH_VERIFICATION_FAILED_ALERT_MESSAGE', 'Menu health publish verification uses fixed alert failure copy');
  assertIncludes(b2cView, "import { generateProjectUrl } from \"@lib/utils/slugify\";", 'B2C publish verification uses project URL helper');
  assertIncludes(b2cView, 'projects_b2c_publish_verification_setup_failed', 'B2C publish verification setup bounded diagnostic');
  assertIncludes(b2cView, 'verificationPublicMenuUrl = generateProjectUrl(', 'B2C publish verification targets routed public menu URL');
  assertIncludes(b2cView, 'storeDetails?.customDomain', 'B2C publish verification supports custom domain tenant URLs');
  assertIncludes(b2cView, 'Boolean(updatedProjectCopy?.isDefault ?? projectCopy.isDefault)', 'B2C publish verification preserves default-project URL semantics');
  assertIncludes(b2cView, "getBoundedProjectPageStringContext('publicMenuUrl', verificationPublicMenuUrl)", 'B2C publish verification logs bounded URL metadata');
  assertIncludes(b2cView, 'assertProjectUpdateSucceeded(', 'B2C publish project acknowledgement guard');
  assertIncludes(b2cView, 'projects_b2c_publish_project_update_rejected', 'B2C publish project rejected acknowledgement code');
  assertIncludes(b2cView, 'assertStoreUpdateSucceeded(', 'B2C Official Page store update acknowledgement guard');
  assertIncludes(b2cView, 'projects_b2c_official_page_store_update_rejected', 'B2C Official Page store rejected acknowledgement code');
  assertIncludes(b2cView, 'projects_b2c_publish_failed', 'B2C publish failure bounded diagnostic');
  assertIncludes(b2cView, "messageApi.error('Could not publish public page changes.')", 'B2C publish fixed owner failure copy');
  assertIncludes(b2cView, 'getProjectPageProjectLogContext(projectData?.projectId, projectData?.masterProjectId)', 'B2C publish verification bounded project context');
  assertIncludes(b2cView, 'getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId)', 'B2C publish verification bounded store context');
  assertIncludes(b2cView, "getBoundedProjectPageStringContext('storeSlug', storeDetails?.subdomain)", 'B2C publish verification bounded slug context');
  assertNotIncludes(b2cView, '\n                    await updateStore(storeUpdate);\n', 'B2C Official Page store update must not ignore DAL acknowledgement');
  assertNotIncludes(publishVerification, 'Menu failed verification: ${verificationResult.failureReason}', 'Menu health publish verification raw alert failure text');
  assertNotIncludes(helper, "[verifyMenuPublish] Verification failed", 'Menu health publish raw browser warning');
  assertNotIncludes(helper, 'console.warn', 'Menu health publish direct warn logging');
  assertNotIncludes(b2cView, "const { getMenuUrl } = await import('@constant/urls');", 'B2C publish verification must not target tenant root instead of menu/project URL');
  assertNotIncludes(b2cView, '} catch { /* non-blocking */ }', 'B2C publish verification setup silent catch');
}

function verifyPublicMenuGoLiveCopyMatchesPublishBoundary() {
  const publicEntryDocs = {
    readme: read('__docs__/public-menu-entry/README.md'),
    spec: read('__docs__/public-menu-entry/public-menu-entry_spec.md'),
    impl: read('__docs__/public-menu-entry/public-menu-entry_impl.md'),
    firebase: read('__docs__/public-menu-entry/public-menu-entry_firebase.md'),
    mobile: read('__docs__/public-menu-entry/public-menu-entry_mobile-support.md'),
    website: read('__docs__/public-menu-entry/public-menu-entry_website.md'),
    help: read('__docs__/public-menu-entry/public-menu-entry_helpdoc.md'),
    marketing: read('__docs__/public-menu-entry/public-menu-entry_marketing.md'),
    verification: read('__docs__/public-menu-entry/public-menu-entry_verification.md'),
  };
  const publicEntryWebsite = publicEntryDocs.website;
  const publicEntryMarketing = publicEntryDocs.marketing;
  const publicEntryHelpdoc = publicEntryDocs.help;
  const dataEditorWebsite = read('__docs__/projects/data-editor/data-editor_website.md');
  const workflowsGuide = read('__docs__/workflows-guide/README.md');
  const supportAutomation = read('__docs__/support-automation/README.md');
  const mobileDoctrine = read('__docs__/mobile-operational-support/02-mobile-ui-doctrine.md');
  const mobileScreensSpec = read('__docs__/mobile-operational-support/03-mobile-screens-spec.md');
  const clientMenuWebsite = read('__docs__/client-menu/client-menu_website.md');
  const clientMenuHelpdoc = read('__docs__/client-menu/client-menu_helpdoc.md');
  const multiOutletWebsite = read('__docs__/multi-outlet-consistency/multi-outlet-consistency_website.md');
  const multiOutletHelpdoc = read('__docs__/multi-outlet-consistency/multi-outlet-consistency_helpdoc.md');
  const posWebhookWebsite = read('__docs__/pos-webhook-sync/pos-webhook-sync_website.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const behaviorEngineeringReadme = read('__docs__/behavior-engineering/README.md');
  const behaviorEngineeringSpec = read('__docs__/behavior-engineering/behavior-engineering_spec.md');
  const behaviorEngineeringImpl = read('__docs__/behavior-engineering/behavior-engineering_impl.md');
  const behaviorEngineeringWebsite = read('__docs__/behavior-engineering/behavior-engineering_website.md');
  const behaviorEngineeringHelpdoc = read('__docs__/behavior-engineering/behavior-engineering_helpdoc.md');
  const behaviorEngineeringMarketing = read('__docs__/behavior-engineering/behavior-engineering_marketing.md');
  const imageGenerationWebsite = read('__docs__/projects/ai-image-generation/ai-image-generation_website.md');
  const imageGenerationMarketing = read('__docs__/projects/ai-image-generation/ai-image-generation_marketing.md');
  const imageGenerationHelpdoc = read('__docs__/projects/ai-image-generation/ai-image-generation_helpdoc.md');
  const msgPreviewPage = read('src/app/(global-pages)/msg-preview/[sessionId]/page.tsx');
  const menuKitLabels = read('src/lib/menu-kit/businessTypeLabels.ts');
  const desktopUseMenuList = read('src/components/templates/main-app/useMenuList/index.tsx');
  const projectShareModal = read('src/components/templates/main-app/projects/b2cView/shareModal/index.tsx');
  const menuKitSection = read('src/components/templates/main-app/projects/b2cView/shareModal/MenuKitSection.tsx');
  const projectDal = read('src/database/projects/index.ts');
  const desktopProjectHeader = read('src/components/templates/main-app/projects/ProjectsSubHeader.tsx');
  const mobileDesignEditor = read('src/components/mobile/screens/MobileDesignEditorScreen.tsx');
  const mobileUploadSheet = read('src/components/mobile/sheets/MenuUploadSheet.tsx');
  const clientMenuPage = read('src/app/client/[[...slug]]/page.tsx');
  const shareNudgeLocales = [
    'public/locales/menulist.ai/en-US.json',
    'public/locales/menulist.ai/en-GB.json',
    'public/locales/menulist.ai/hi-IN.json',
    'public/locales/menulist.ai/ta-IN.json',
    'public/locales/menulist.ai/es-ES.json',
    'public/locales/menulist.ai/bn-IN.json',
    'public/locales/menulist.ai/mr-IN.json',
    'public/locales/menulist.ai/ar-SA.json',
    'public/locales/menulist.ai/te-IN.json',
    'public/locales/menulist.ai/ks-IN.json',
    'public/locales/menulist.ai/brx-IN.json',
  ].map((file) => [read(file), file]);

  Object.entries(publicEntryDocs).forEach(([label, content]) => {
    const top = content.slice(0, 3000);
    [
      'Launch boundary:** Not current launch certification or deploy approval',
      'source-gated Public Menu Entry evidence only',
      'The publicly reachable `/create-menu` owner-onboarding route uses the canonical MenuList app host, is `noindex`, and is omitted from marketing sitemap/LLM discovery; source submission, acquisition, extraction, preview polling, claim, and publish require a signed-in owner.',
      'active production-readiness audit',
      'External Certification Runbook evidence',
      '`npm run verify:production-readiness-local`',
      '`npm run verify:menu-extraction-pipeline`',
      '`npm run verify:public-business-truth`',
      '`npm run verify:auth-security-failure-matrix`',
      'signed-in desktop/mobile browser QA',
      'physical-device camera/link/preview/claim QA',
      'Gemini extraction provider smoke',
      'Razorpay sandbox evidence where conversion is in scope',
      'applicable target Firebase/Vercel deploy evidence',
      'production-host smoke',
    ].forEach((token) => assertIncludes(top, token, `Public Menu Entry ${label} top launch/account boundary`));
  });

  assertIncludes(
    publicEntryDocs.verification,
    '**Status:** HISTORICAL SOURCE/LOCAL/QA EVIDENCE — not current launch or deploy certification',
    'Public Menu Entry verification historical status boundary',
  );
  assertIncludes(
    publicEntryDocs.verification,
    'It does not certify the current worktree, target environment, external providers, deploy state, or production host.',
    'Public Menu Entry verification current evidence exclusion',
  );
  assertNotIncludes(
    publicEntryDocs.verification,
    '**Status:** ✅ PRODUCTION AUDIT PASSED WITH EXTERNAL CONDITIONS',
    'Public Menu Entry stale production-audit status',
  );
  assertIncludes(
    publicEntryDocs.mobile,
    'the route is reachable before sign-in on the canonical app host, while all source-processing controls remain owner-authenticated',
    'Public Menu Entry mobile page-versus-processing auth boundary',
  );
  assertNotIncludes(publicEntryDocs.mobile, 'this is pre-auth, not part of the dashboard', 'Public Menu Entry stale mobile pre-auth boundary');
  assertNotIncludes(publicEntryDocs.help, '[Support number placeholder]', 'Public Menu Entry help support placeholder boundary');
  assertNotIncludes(publicEntryDocs.marketing, '"works everywhere"', 'Public Menu Entry marketing universal-placement claim');
  assertIncludes(
    publicEntryDocs.marketing,
    'One approved link the owner can place in QR, WhatsApp, and Google profile surfaces',
    'Public Menu Entry marketing owner-placement boundary',
  );
  assertIncludes(
    productionAudit,
    'Public Menu Entry active-doc account/top-boundary checkpoint',
    'Production audit Public Menu Entry active-doc boundary',
  );
  assertIncludes(
    changelog,
    'Public Menu Entry Active Docs And Account Boundary',
    'Changelog Public Menu Entry active-doc boundary',
  );

  [
    [publicEntryWebsite, 'Public Menu Entry website'],
    [publicEntryMarketing, 'Public Menu Entry marketing'],
    [publicEntryHelpdoc, 'Public Menu Entry helpdoc'],
    [dataEditorWebsite, 'Data Editor website'],
    [workflowsGuide, 'Workflows guide mobile doctrine'],
    [supportAutomation, 'Support automation templates'],
    [mobileDoctrine, 'Mobile UI doctrine'],
    [mobileScreensSpec, 'Mobile screens spec'],
    [clientMenuWebsite, 'Client Menu website'],
    [clientMenuHelpdoc, 'Client Menu helpdoc'],
    [multiOutletWebsite, 'Multi-outlet website'],
    [multiOutletHelpdoc, 'Multi-outlet helpdoc'],
    [posWebhookWebsite, 'POS webhook website'],
    [behaviorEngineeringMarketing, 'Behavior engineering marketing'],
    [imageGenerationWebsite, 'AI image generation website'],
    [imageGenerationMarketing, 'AI image generation marketing'],
    [imageGenerationHelpdoc, 'AI image generation helpdoc'],
  ].forEach(([content, label]) => {
    [
      'Changes go live instantly',
      'changes go live instantly',
      'go live instantly',
      'go live on your customer menu instantly',
      'no need to re-publish',
      'Customers see the change within seconds',
      'customers see the change within seconds',
      'Customers see the new price within seconds',
      'Customers always see the latest menu',
      'every store\'s menu updates within seconds',
      'All linked outlets receive the changes within seconds',
      'Changes sync within seconds',
      'receives the update within seconds',
      'shows immediately',
      'always current, everywhere',
      'This is your live menu — always up to date.',
      'live menu — always up to date',
      'instant updates',
      'Changes go live instantly on your digital menu',
      'Every store sees it instantly',
      'Master changes flow to all stores instantly',
      'Instant sync',
      'instant sync',
    ].forEach((stalePhrase) => {
      assertNotIncludes(content, stalePhrase, `${label} publish-boundary copy`);
		  });
  });

  [
    [behaviorEngineeringReadme, 'Behavior engineering README'],
    [behaviorEngineeringSpec, 'Behavior engineering spec'],
    [behaviorEngineeringImpl, 'Behavior engineering implementation'],
    [behaviorEngineeringWebsite, 'Behavior engineering website'],
    [behaviorEngineeringHelpdoc, 'Behavior engineering helpdoc'],
    [behaviorEngineeringMarketing, 'Behavior engineering marketing'],
    [menuKitLabels, 'Menu kit labels'],
    [desktopUseMenuList, 'Desktop Use MenuList copy'],
    [projectShareModal, 'Project share modal copy'],
    [menuKitSection, 'Menu kit section copy'],
    [msgPreviewPage, 'Post-publish preview share copy'],
  ].forEach(([content, label]) => {
    [
      'always shows',
      'always see',
      'Customers always',
      'customers always',
      'will always',
      'Always updated',
      'always updated',
      'latest menu',
      'latest prices',
      'latest items',
      'latest version',
      'latest services',
      'latest offerings',
      'sees the update instantly',
      'see it instantly',
      'see the latest',
      'always current',
      'always-current',
      'updates automatically',
      '(Always updated)',
      'It stays updated.',
    ].forEach((stalePhrase) => {
      assertNotIncludes(content, stalePhrase, `${label} behavior-link freshness copy`);
    });
  });

  assertIncludes(msgPreviewPage, 'Here is our menu link:', 'Post-publish preview WhatsApp bounded menu-link copy');
  assertIncludes(msgPreviewPage, 'It opens the approved menu.', 'Post-publish preview approved-menu helper copy');
  assertNotIncludes(msgPreviewPage, 'Here is our latest menu:', 'Post-publish preview stale latest-menu WhatsApp copy');
  for (const [content, label] of shareNudgeLocales) {
    assertNotIncludes(content, 'Customers can always access your latest menu.', `${label} stale MobileShare always-latest nudge`);
    assertNotIncludes(content, 'Customers will always see your latest menu.', `${label} stale behavior-nudge always-latest copy`);
  }
  assertIncludes(shareNudgeLocales[0][0], 'Customers can open the approved menu link.', 'en-US MobileShare approved menu-link nudge');
  assertIncludes(shareNudgeLocales[0][0], 'Customers open the owner-approved menu link.', 'en-US behavior nudge approved menu-link copy');

  assertIncludes(publicEntryWebsite, 'version the owner approved and published', 'Public Menu Entry website owner-approved version copy');
  assertIncludes(publicEntryWebsite, 'save the approved edit', 'Public Menu Entry website save boundary copy');
  assertIncludes(publicEntryWebsite, 'publish design or page changes when needed', 'Public Menu Entry website publish boundary copy');
  assertIncludes(publicEntryMarketing, 'Customers see the owner-published menu', 'Public Menu Entry marketing owner-published menu copy');
  assertIncludes(publicEntryMarketing, 'owner-controlled save and publish paths', 'Public Menu Entry marketing save/publish boundary copy');
  assertIncludes(publicEntryHelpdoc, 'If the screen shows **Publish**, click **Publish**', 'Public Menu Entry helpdoc conditional publish copy');
  assertIncludes(dataEditorWebsite, 'public truth and cache path', 'Data Editor website public truth/cache copy');
  assertIncludes(dataEditorWebsite, 'current public menu cache refresh', 'Data Editor website customer-facing cache copy');
  assertIncludes(dataEditorWebsite, 'usually within 60 seconds', 'Data Editor website cache window copy');
  assertIncludes(workflowsGuide, 'shared save/cache path', 'Workflows guide mobile save/cache boundary');
  assertIncludes(workflowsGuide, 'Screens with an explicit **Publish** action keep that action', 'Workflows guide explicit publish boundary');
  assertIncludes(supportAutomation, 'Customer menus can take up to 60 seconds to refresh', 'Support automation cache window copy');
  assertIncludes(supportAutomation, 'This opens the owner-published menu.', 'Support automation owner-published menu copy');
  assertIncludes(mobileDoctrine, 'Screens with an explicit Publish action keep it', 'Mobile doctrine explicit publish boundary');
  assertIncludes(mobileDoctrine, 'Customer menus can take up to 60 seconds to refresh', 'Mobile doctrine cache window copy');
  assertIncludes(mobileScreensSpec, 'current public cache path and can take up to 60 seconds', 'Mobile screens public cache window copy');
  assertIncludes(clientMenuWebsite, 'current cache window can be up to 60 seconds', 'Client Menu website cache window copy');
  assertIncludes(clientMenuHelpdoc, 'usually within 60 seconds', 'Client Menu helpdoc cache window copy');
  assertIncludes(multiOutletWebsite, 'outlet save/cache path', 'Multi-outlet website save/cache copy');
  assertIncludes(multiOutletWebsite, 'Customer menus can take up to 60 seconds to refresh', 'Multi-outlet website cache window copy');
  assertIncludes(multiOutletWebsite, 'saved master updates', 'Multi-outlet website saved-update boundary copy');
  assertIncludes(multiOutletHelpdoc, 'Outlet sync and customer menu cache refresh can take up to 60 seconds', 'Multi-outlet helpdoc cache window copy');
  assertIncludes(posWebhookWebsite, 'MenuList can send it a signed full-menu snapshot after approved project saves', 'POS webhook bounded delivery copy');
  assertIncludes(posWebhookWebsite, 'the receiving team remains responsible for applying it', 'POS webhook receiver-application boundary copy');
  assertNotIncludes(posWebhookWebsite, 'configured POS sync receives the owner-approved update through the integration path', 'POS webhook stale guaranteed-receipt copy');
  assertIncludes(behaviorEngineeringReadme, 'This doc is source-gated by `npm run verify:public-business-truth`', 'Behavior Engineering README source gate');
  assertIncludes(behaviorEngineeringSpec, 'This spec is source-gated by `npm run verify:public-business-truth`', 'Behavior Engineering spec source gate');
  assertIncludes(behaviorEngineeringImpl, 'This implementation doc is source-gated by `npm run verify:public-business-truth`', 'Behavior Engineering implementation source gate');
  assertIncludes(behaviorEngineeringWebsite, 'This website copy is source-gated by `npm run verify:public-business-truth`', 'Behavior Engineering website source gate');
  assertIncludes(behaviorEngineeringHelpdoc, 'This help doc is source-gated by `npm run verify:public-business-truth`', 'Behavior Engineering helpdoc source gate');
  assertIncludes(behaviorEngineeringMarketing, 'This marketing doc is source-gated by `npm run verify:public-business-truth`', 'Behavior Engineering marketing source gate');
  assertIncludes(behaviorEngineeringMarketing, 'current approved menu', 'Behavior engineering marketing update boundary copy');
  assertIncludes(menuKitLabels, 'Customers use your current approved menu link.', 'Menu kit label current-approved share subtitle');
  assertIncludes(menuKitLabels, "yourLatest: 'your current approved menu'", 'Menu kit label current-approved share noun');
  assertIncludes(desktopUseMenuList, 'points to ${labels.yourLatest}', 'Desktop Use MenuList current-approved share card copy');
  assertIncludes(projectShareModal, '? `${labels.shareMessagePrefix}\\n${urlWithUTM}`', 'Project share modal source-bounded WhatsApp message');
  assertIncludes(productionAudit, 'Support automation manual-template freshness-copy checkpoint', 'Production audit records support automation freshness checkpoint');
  assertIncludes(changelog, 'Support Automation Freshness Copy Boundary', 'Changelog records support automation freshness checkpoint');
  assertIncludes(menuKitSection, 'const msg = `${labels.shareMessagePrefix}\\n${menuUrl}`;', 'Menu kit WhatsApp message source-bounded copy');
  assertIncludes(imageGenerationWebsite, 'Source-backed website draft; not current publication or launch certification', 'AI image generation website launch boundary status');
  assertIncludes(imageGenerationWebsite, 'Current Website/Launch Boundary', 'AI image generation website launch boundary heading');
  assertIncludes(imageGenerationWebsite, '`npm run verify:ai-accounting`', 'AI image generation website AI accounting source gate');
  assertIncludes(imageGenerationWebsite, '`npm run verify:public-business-truth`', 'AI image generation website public truth source gate');
  assertIncludes(imageGenerationWebsite, 'reviewed before publishing', 'AI image generation website review-before-publish boundary');
  assertIncludes(imageGenerationWebsite, 'where plan and credits allow', 'AI image generation website plan/credit boundary');
  assertIncludes(imageGenerationMarketing, 'Source-backed marketing draft; not current sales, publication, or launch certification', 'AI image generation marketing launch boundary status');
  assertIncludes(imageGenerationMarketing, 'Current Sales/Launch Boundary', 'AI image generation marketing launch boundary heading');
  assertIncludes(imageGenerationMarketing, '`npm run verify:ai-accounting`', 'AI image generation marketing AI accounting source gate');
  assertIncludes(imageGenerationMarketing, '`npm run verify:public-business-truth`', 'AI image generation marketing public truth source gate');
  assertIncludes(imageGenerationMarketing, 'review before publishing', 'AI image generation marketing review-before-publish boundary');
  assertIncludes(imageGenerationMarketing, 'ready-to-apply updates', 'AI image generation marketing update boundary copy');
  assertIncludes(imageGenerationHelpdoc, 'Prepare image drafts for selected menu items where the feature, plan, credits, provider, and safety checks allow.', 'AI image generation helpdoc draft boundary copy');
  assertIncludes(imageGenerationHelpdoc, 'Review each draft before using it on a customer-facing menu.', 'AI image generation helpdoc review-before-use copy');
  assertIncludes(imageGenerationHelpdoc, 'Batch size, processing time, and retry behavior depend on the current release, credits, provider status, and safety checks.', 'AI image generation helpdoc bounded batch copy');
  assertIncludes(imageGenerationHelpdoc, 'Review generated drafts before applying them to the public menu', 'AI image generation helpdoc public menu review copy');
  [
    'Professional Menu Photos Without a Photographer',
    'Generate beautiful food images for every menu item',
    'One click per item, or process your entire menu at once',
    'Professional food photography costs',
    'MenuList generates professional-quality images for your menu items automatically',
    'No photographer, no studio, no waiting',
    'One click and your item has a photo',
    'One Click Per Image',
    'get a professional-looking food photo in seconds',
    'Bulk Generation for Full Menus',
    'Got 50 items without photos? Process them all at once',
    '32 of 50 items generated',
    'Consistent Style Across Your Menu',
    'No photographer needed. No expensive equipment. Just AI magic.',
    'Timeline:** 30 seconds per image',
    'Professional-quality images, consistent style, ready-to-apply updates',
    'Generate in 30 seconds',
    '$0, regenerate instantly',
    'Uniform style across all',
    '70% of customers look at menu images before ordering',
    'Poor photos reduce perceived value by up to 40%',
    'Professional menu photos, zero photography',
    'AI does the rest',
    '30-second turnaround',
    'Process entire menu overnight',
    '50+ items at once',
    'Start generating in minutes',
    '30-Second Professional Photos',
    'Process Your Entire Menu Overnight',
    '200 items? No problem',
    'Every image matches your aesthetic. Uniform quality across all items.',
    'Generate images 100x faster than traditional photography',
    'Save $50-200 per menu item on photography costs',
    'For digital menus, absolutely',
    'Regenerate as many times as you want',
    'Generated images are yours to use anywhere',
    'AI process everything. You\'ll get real-time progress updates',
    'Match your cozy brand aesthetic automatically',
    '200 items need photos? Done by tomorrow morning',
    'most people can\'t tell the difference',
    'Our AI handles everything from fusion dishes to traditional recipes',
    'AI handles that too',
    '| "Generate instantly" | Speed benefit |',
    '| Turnaround | Days/weeks | Seconds |',
    '| Style consistency | Depends on photographer | Guaranteed |',
    '| Matches your actual dish | ❌ Never | ✅ Yes |',
    '| Brand consistency | ⚠️ Hit or miss | ✅ Style control |',
    '| Time investment | Hours styling | 30 seconds |',
    'Time-saved calculator',
    'Refresh your entire menu',
    'Same Quality, Every Location',
    'Generate professional-looking photos for your menu items automatically',
    'Works for single items or your entire menu at once',
    'Wait 5-10 seconds for the image to appear',
    'How to generate images for your entire menu (bulk)',
    'A 50-item menu takes about 5 minutes',
    'You can only generate 5 images per minute',
    'Use bulk generation to save time on large menus',
    'rejected ones cost nothing extra',
  ].forEach((stalePhrase) => {
    assertNotIncludes(imageGenerationWebsite, stalePhrase, 'AI image generation website stale public claim');
    assertNotIncludes(imageGenerationMarketing, stalePhrase, 'AI image generation marketing stale public claim');
    assertNotIncludes(imageGenerationHelpdoc, stalePhrase, 'AI image generation helpdoc stale public claim');
  });
  assertIncludes(productionAudit, 'AI Image Generation website/marketing claim boundary checkpoint', 'Production audit records AI image generation website/marketing claim checkpoint');
  assertIncludes(productionAudit, 'AI Image Generation helpdoc claim boundary checkpoint', 'Production audit records AI image generation helpdoc claim checkpoint');
  assertIncludes(changelog, 'AI Image Generation Website Marketing Claim Boundary', 'Changelog records AI image generation website/marketing claim checkpoint');
  assertIncludes(changelog, 'AI Image Generation Helpdoc Claim Boundary', 'Changelog records AI image generation helpdoc claim checkpoint');

  assertIncludes(projectDal, '// INVARIANT: All customer-facing truth must pass through updateProject().', 'Project DAL public truth invariant');
  assertIncludes(projectDal, 'await revalidatePublicClientCacheForProject(data.projectId as string, "updateProject");', 'Project DAL save cache revalidation');
  assertIncludes(projectDal, 'export const publishProject = async (', 'Project DAL explicit publish path');
  assertIncludes(projectDal, 'const requestedModifiedOn = options.expectedModifiedOn', 'Project DAL publish caller-version precondition');
  assertIncludes(projectDal, '(data as Partial<Project> & { modifiedOn?: unknown }).modifiedOn;', 'Project DAL persisted modification-version projection');
  assertIncludes(projectDal, '...(expectedModifiedOnMillis !== null ? { expectedModifiedOnMillis } : {}),', 'Linked outlet publish transaction version precondition');
  assertIncludes(projectDal, "throw new Error('Project publish state changed');", 'Project DAL stale publish rejection');
  assertIncludes(projectDal, 'await revalidatePublicClientCacheForProject(operationProjectId, "publishProject");', 'Project DAL publish cache revalidation');
  assertIncludes(projectDal, 'const publishedAt = Timestamp.now();', 'Project DAL publish timestamp source');
  assertIncludes(projectDal, 'const nextMenuVersion = nextProjectMenuVersion(freshProject.menuVersion);', 'Project DAL publish menu version authority');
  assertIncludes(projectDal, 'menuVersion: nextMenuVersion,', 'Project DAL publish menu version bump');
  assertIncludes(projectDal, 'lastPublishedAt: publishedAt,', 'Project DAL publish timestamp');
  assertIncludes(desktopProjectHeader, '"No changes to publish"', 'Desktop project header explicit publish state');
  assertIncludes(mobileDesignEditor, 'const updated = await publishProject(normalizedDraft, {', 'Mobile design editor explicit publish path');
  assertIncludes(mobileDesignEditor, 'expectedModifiedOn: normalizedDraft.modifiedOn,', 'Mobile design editor stale publish precondition');
  assertIncludes(mobileDesignEditor, 'void verifyMenuPublish({', 'Mobile design editor publish verification');
  assertIncludes(mobileUploadSheet, 'draft for review before anything is published', 'Mobile menu upload review-before-publish copy');
  assertIncludes(clientMenuPage, 'hasPublishedMenu: Boolean', 'Client menu page published-menu metadata boundary');
  assertIncludes(clientMenuPage, 'menuVersion', 'Client menu page menu version metadata');
  assertIncludes(clientMenuPage, 'revalidate: 60', 'Client menu page public cache revalidation window');
}

function verifyPresenceDominanceDocsUsePublicSourceBoundaries() {
  const docs = {
    readme: read('__docs__/presence-dominance/README.md'),
    spec: read('__docs__/presence-dominance/presence-dominance_spec.md'),
    impl: read('__docs__/presence-dominance/presence-dominance_impl.md'),
    website: read('__docs__/presence-dominance/presence-dominance_website.md'),
    marketing: read('__docs__/presence-dominance/presence-dominance_marketing.md'),
    audit: read('__docs__/audits/menulist-production-readiness-audit.md'),
    changelog: read('__docs__/changelog.md'),
  };

  [
    'always updated',
    'Always Updated',
    'always accurate',
    'Always accurate',
    'Always live',
    'always live',
    'live everywhere',
    'Live everywhere',
    'correct everywhere',
    'Correct everywhere',
    'customers see the change within 60 seconds — everywhere',
    'updates automatically when you change anything',
  ].forEach((stalePhrase) => {
    assertNotIncludes(docs.readme, stalePhrase, 'Presence Dominance README stale freshness/correctness claim');
    assertNotIncludes(docs.spec, stalePhrase, 'Presence Dominance spec stale freshness/correctness claim');
    assertNotIncludes(docs.impl, stalePhrase, 'Presence Dominance implementation stale freshness/correctness claim');
    assertNotIncludes(docs.website, stalePhrase, 'Presence Dominance website stale freshness/correctness claim');
    assertNotIncludes(docs.marketing, stalePhrase, 'Presence Dominance marketing stale freshness/correctness claim');
  });

  [
    'Here is our latest menu',
    '(Always updated)',
    'It stays updated',
  ].forEach((stalePhrase) => {
    assertNotIncludes(docs.readme, stalePhrase, 'Presence Dominance README stale behavior-link claim');
    assertNotIncludes(docs.impl, stalePhrase, 'Presence Dominance implementation stale behavior-link claim');
  });

  assertIncludes(docs.readme, 'WhatsApp menu-link message', 'Presence Dominance README bounded WhatsApp copy');
  assertIncludes(docs.impl, 'Here is our menu link:\\n{url}', 'Presence Dominance implementation bounded WhatsApp copy');
  assertIncludes(docs.impl, 'It opens the approved menu.', 'Presence Dominance implementation approved-menu copy');

  [
    'owner-approved public source',
    'Public menu and Official Business Page output can take up to 60 seconds to refresh',
  ].forEach((token) => {
    assertIncludes(docs.website, token, 'Presence Dominance website public-source/cache boundary');
    assertIncludes(docs.marketing, token, 'Presence Dominance marketing public-source/cache boundary');
  });

  [
    'owner-approved public source',
    'Google/provider surfaces still require their own evidence',
    'old downloaded PDFs should be replaced',
  ].forEach((token) => {
    assertIncludes(docs.spec, token, 'Presence Dominance spec provider/artifact boundary');
  });

  assertIncludes(docs.audit, 'Presence Dominance public-source freshness checkpoint', 'Production audit records Presence Dominance checkpoint');
  assertIncludes(docs.changelog, 'Presence Dominance Public Source Boundary', 'Changelog records Presence Dominance checkpoint');
}

function verifyDigitalScreenReloadDiagnosticsAreBounded() {
  const campaignsDal = read('src/database/campaigns/index.ts');
  const desktopUploads = read('src/components/templates/main-app/settings/DigitalScreenSettings/OwnerUploads.tsx');
  const mobileDigitalScreens = read('src/components/mobile/screens/MobileDigitalScreensScreen.tsx');
  const screenUtils = read('src/lib/screen/utils.ts');
  const screenDisplay = read('src/app/screen/[token]/ScreenDisplay.tsx');
  const menuBoardDisplay = read('src/app/screen/[token]/MenuBoardDisplay.tsx');
  const seenHook = read('src/hooks/useDigitalScreenSeenSignal.ts');
  const uploadScreenSlideBlock = campaignsDal.slice(campaignsDal.indexOf('export const uploadScreenSlide'));

  assertIncludes(campaignsDal, 'export const isDigitalScreenSlideUploadResult', 'Digital screen slide upload result guard');
  assertIncludes(campaignsDal, 'export function assertDigitalScreenSlideUploadSucceeded', 'Digital screen slide upload acknowledgement guard');
  assertIncludes(campaignsDal, "'digital_screen_slide_upload_rejected'", 'Digital screen slide upload rejected acknowledgement code');
  assertIncludes(campaignsDal, "'digital_screen_slide_upload_update_rejected'", 'Digital screen internal add-slide rejected acknowledgement code');
  assertIncludes(uploadScreenSlideBlock, 'const result = await apiCallComposer(', 'Digital screen upload must capture composer result before returning');
  assertIncludes(uploadScreenSlideBlock, 'assertDigitalScreenSlideUploadSucceeded(', 'Digital screen upload must reject apiCallComposer fallback values');
  assert(
    uploadScreenSlideBlock.indexOf('const result = await apiCallComposer(') < uploadScreenSlideBlock.indexOf('assertDigitalScreenSlideUploadSucceeded('),
    'Digital screen upload must assert the composer result before returning success',
  );
  assertIncludes(desktopUploads, 'desktop_digital_screen_slide_upload_failed', 'Desktop Digital Screen upload failure diagnostic');
  assertIncludes(mobileDigitalScreens, 'mobile_digital_screen_slide_upload_failed', 'Mobile Digital Screen upload failure diagnostic');

  assertIncludes(screenUtils, "screen_guarded_reload_storage_failed", 'Digital screen guarded reload storage diagnostic');
  assertIncludes(screenUtils, "getBoundedScreenStringContext(\"componentName\", componentName)", 'Digital screen guarded reload bounded component context');
  assertIncludes(screenUtils, "reloadGuardMs: RELOAD_GUARD_MS", 'Digital screen guarded reload bounded guard window metadata');
  assertNotIncludes(screenUtils, "} catch { /* proceed anyway if localStorage fails */ }", 'Digital screen guarded reload silent localStorage catch');

  [
    [screenDisplay, 'diagnosticPrefix: "digital_screen_display"', 'Highlights display'],
    [menuBoardDisplay, 'diagnosticPrefix: "digital_screen_menuboard"', 'Menu Board display'],
  ].forEach(([content, diagnosticPrefix, label]) => {
    assertIncludes(content, diagnosticPrefix, `${label} seen-signal diagnostic prefix`);
  });
  assertIncludes(seenHook, '`${diagnosticPrefix}_seen_signal_rejected`', 'Shared screen seen-signal rejection diagnostic');
  assertIncludes(seenHook, 'SCREEN_SEEN_REQUEST_POLICY', 'Shared seen-signal request policy');
  assertIncludes(seenHook, 'cache: "no-store"', 'Shared seen-signal request bypasses browser cache');
  assertIncludes(seenHook, 'credentials: "same-origin"', 'Shared seen-signal request keeps credentials same-origin');
  assertIncludes(seenHook, 'redirect: "manual"', 'Shared seen-signal request does not follow redirects');
  assertIncludes(seenHook, '...SCREEN_SEEN_REQUEST_POLICY', 'Shared display uses seen-signal request policy');
  assertIncludes(seenHook, 'if (!response.ok)', 'Shared seen-signal response status guard');
  assertIncludes(seenHook, 'responseStatus: response.status', 'Shared seen-signal bounded response status');
  assert(
    seenHook.indexOf('if (!response.ok)') < seenHook.indexOf('localStorage.setItem(marker, "1");'),
    'Shared display must check screen seen response status before caching the daily marker',
  );
}

function verifyMenuEditorDiagnosticsAreBounded() {
  const editor = read('src/components/templates/main-app/projects/editorView/Editor.tsx');
  const editItemModal = read('src/components/templates/main-app/projects/editorView/editItemModal.tsx');
  const editCategoryModal = read('src/components/templates/main-app/projects/editorView/editCategoryModal.tsx');
  const uploadedImagesList = read('src/components/templates/main-app/projects/editorView/uploadedImagesList.tsx');
  const descriptionGeneration = read('src/components/templates/main-app/projects/editorView/descriptionGeneration.shared.ts');
  const batchImageResultView = read('src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationResultView.tsx');
  const diagnostics = read('src/components/templates/main-app/projects/utils/editorDiagnostics.ts');
  const projectDal = read('src/database/projects/index.ts');
  const linkedOutletSaveRoute = read('src/app/api/projects/outlet-save/route.ts');
  const mceDiagnostics = read('src/lib/mce/diagnostics.ts');

  assertIncludes(diagnostics, 'secureError', 'Menu editor diagnostics secure logging');
  assertIncludes(diagnostics, 'getBoundedMenuEditorStringContext', 'Menu editor diagnostics bounded context');
  assertIncludes(diagnostics, 'logMenuEditorFailure', 'Menu editor diagnostics normalized failure logger');
  assertIncludes(diagnostics, 'sourceErrorName: getMenuEditorErrorName(error)', 'Menu editor diagnostics source error name');
  assertIncludes(diagnostics, 'sourceErrorCode: getMenuEditorErrorCode(error)', 'Menu editor diagnostics source error code');
  assertIncludes(diagnostics, 'sourceStatusCode: getMenuEditorErrorStatus(error)', 'Menu editor diagnostics source error status');
  assertIncludes(editor, 'menu_editor_resolved_project_load_failed', 'Menu editor linked outlet diagnostics');
  assertIncludes(editor, 'menu_editor_publish_gate_validation_failed', 'Menu editor MCE publish-gate diagnostics');
  assertIncludes(editor, 'menu_editor_quality_signals_publish_intercept_failed', 'Menu editor quality-signals publish-intercept diagnostics');
  assertIncludes(editor, 'menu_editor_sync_changes_failed', 'Menu editor sync diagnostics');
  assertIncludes(editor, 'assertProjectUpdateSucceeded(', 'Menu editor project save acknowledgement guard');
  assertIncludes(editor, 'menu_editor_sync_changes_project_update_rejected', 'Menu editor sync rejected acknowledgement code');
  assertIncludes(editor, 'menu_editor_persist_project_update_rejected', 'Menu editor shared persist rejected acknowledgement code');
  assertIncludes(editor, 'menu_editor_project_public_content_translation_failed', 'Menu editor project public-content translation diagnostics');
  assertIncludes(editor, 'menu_editor_project_public_content_project_update_rejected', 'Menu editor project public-content project rejected acknowledgement code');
  assertIncludes(editor, 'menu_editor_project_public_content_metadata_update_rejected', 'Menu editor project public-content metadata rejected acknowledgement code');
  assertIncludes(editor, "import { getSafeUiErrorMessage } from \"@lib/errors/uiErrorMessages\";", 'Menu editor publish gate must sanitize owner-visible MCE messages');
  assertIncludes(editor, 'PUBLISH_GATE_FALLBACK_ERROR', 'Menu editor publish gate must define fixed fallback copy');
  assertIncludes(editor, 'getSafeUiErrorMessage(error.message, PUBLISH_GATE_FALLBACK_ERROR, { allowTrustedPlainText: true })', 'Menu editor publish gate must explicitly trust local MCE validation copy');
  assertIncludes(editItemModal, 'menu_editor_item_content_generation_failed', 'Menu editor item content generation diagnostics');
  assertIncludes(editCategoryModal, 'menu_editor_time_slot_preset_create_failed', 'Menu editor time-slot preset diagnostics');
  assertIncludes(editCategoryModal, 'assertTimeSlotPresetUpdateSucceeded(writeResult);', 'Menu editor time-slot preset creation must require explicit store-write acknowledgement');
  assertIncludes(uploadedImagesList, 'menu_editor_item_image_delete_failed', 'Menu editor item image deletion diagnostics');
  assertIncludes(uploadedImagesList, 'menu_editor_item_image_delete_project_update_rejected', 'Menu editor item image deletion project acknowledgement code');
  assertIncludes(uploadedImagesList, 'menu_editor_item_image_cleanup_deferred_shared_reference', 'Menu editor item image shared-reference retention diagnostic');
  assertNotIncludes(uploadedImagesList, 'deleteFileByUrl(imageToDelete.url)', 'Menu editor must not delete a persisted image using one-project reference truth');
  assertOrder(
    uploadedImagesList,
    'await onProjectDataUpdate({ ...updatedProjectData, projectId });',
    "logMenuEditorDiagnostic('menu_editor_item_image_cleanup_deferred_shared_reference'",
    'Menu editor item image parent persistence before deferred cleanup acknowledgement',
  );
  assertOrder(
    uploadedImagesList,
    'setActiveProject(removeObjRef(savedProject));',
    "logMenuEditorDiagnostic('menu_editor_item_image_cleanup_deferred_shared_reference'",
    'Menu editor item image direct persistence before deferred cleanup acknowledgement',
  );
  assertIncludes(descriptionGeneration, 'menu_editor_description_generation_project_update_rejected', 'Menu editor description generation project acknowledgement code');
  assertIncludes(descriptionGeneration, 'menu_editor_description_generation_returned_error_message', 'Menu editor description generation returned-error diagnostic');
  assertIncludes(descriptionGeneration, "getBoundedMenuEditorStringContext('resultMessage'", 'Menu editor description generation returned-error message is bounded');
  assertIncludes(descriptionGeneration, "getBoundedMenuEditorStringContext('fileId'", 'Menu editor description generation returned-error file id is bounded');
  assertIncludes(descriptionGeneration, "getBoundedMenuEditorStringContext('messageType'", 'Menu editor description generation returned-error message type is bounded');
  assertIncludes(batchImageResultView, 'await onBatchImagesPersist(selections)', 'Batch image result delegates selected-image persistence to the transactional project boundary');
  assertIncludes(projectDal, 'appendImageBatchProjectSelections', 'Batch image project persistence uses the dedicated append DAL');
  assertIncludes(projectDal, 'runTransaction(firebaseClient', 'Batch image project persistence reads and updates the latest project transactionally');
  assertIncludes(projectDal, 'firebaseStorage?.app?.options?.storageBucket', 'Standalone batch image persistence requires the configured Firebase Storage bucket');
  assertIncludes(projectDal, 'normalizeImageBatchProjectSelections(rawSelections, projectId, expectedBucket)', 'Standalone batch image persistence validates the exact configured bucket');
  assertIncludes(linkedOutletSaveRoute, 'const expectedBucket = storageAdmin.bucket().name;', 'Linked batch image persistence resolves the Admin Storage bucket');
  assertIncludes(linkedOutletSaveRoute, 'expectedBucket,', 'Linked batch image persistence validates the exact Admin Storage bucket');
  assertIncludes(projectDal, 'logMCEValidationResult(transactionResult.mceResult)', 'MCE save hook bounded validation result logging');
  assertIncludes(projectDal, 'logMCEValidationFailure(transactionResult.mceError', 'MCE save hook bounded validation failure logging');
  assertIncludes(mceDiagnostics, 'secureLog', 'MCE diagnostics secure result logging');
  assertIncludes(mceDiagnostics, 'secureError', 'MCE diagnostics secure failure logging');
  assertIncludes(mceDiagnostics, "new Error('mce_validation_failed')", 'MCE diagnostics normalized failure code');
  assertIncludes(mceDiagnostics, 'warningCount: result.warnings.length', 'MCE diagnostics bounded warning count');
  assertIncludes(mceDiagnostics, 'errorCount: result.errors.length', 'MCE diagnostics bounded error count');
  assertNotIncludes(editor, '[Multi-outlet] Failed to load resolved project:', 'Menu editor raw linked outlet logging');
  assertNotIncludes(editor, '[MCE Publish-Gate] Validation failed (non-blocking):', 'Menu editor raw MCE publish-gate logging');
  assertNotIncludes(editor, '// Silent fail — quality signals never block publish', 'Menu editor quality-signals silent publish catch');
  assertNotIncludes(editor, '} catch {\n                // Silent fail', 'Menu editor silent catch block');
  assertNotIncludes(editor, 'validationErrors.push(error.message)', 'Menu editor publish gate must not display raw MCE error messages');
  assertNotIncludes(editor, 'Syncing changes failed:', 'Menu editor raw sync logging');
  assertNotIncludes(projectDal, '[MCE] verified=${result.verified}', 'MCE save hook raw validation summary');
  assertNotIncludes(projectDal, '[MCE] Validation failed (non-blocking):', 'MCE save hook raw validation failure logging');
  assertNotIncludes(editItemModal, 'console.error(', 'Edit item modal direct error logging');
  assertNotIncludes(editItemModal, 'console.warn(', 'Edit item modal direct warn logging');
  assertNotIncludes(editItemModal, 'console.log(', 'Edit item modal direct log logging');
  assertNotIncludes(editItemModal, 'console.debug(', 'Edit item modal direct debug logging');
  assertNotIncludes(editCategoryModal, 'console.error(', 'Edit category modal direct error logging');
  assertNotIncludes(editCategoryModal, 'console.warn(', 'Edit category modal direct warn logging');
  assertNotIncludes(editCategoryModal, 'console.log(', 'Edit category modal direct log logging');
  assertNotIncludes(editCategoryModal, 'console.debug(', 'Edit category modal direct debug logging');
  assertNotIncludes(uploadedImagesList, 'console.error(', 'Uploaded images list direct error logging');
  assertNotIncludes(uploadedImagesList, 'console.warn(', 'Uploaded images list direct warn logging');
  assertNotIncludes(uploadedImagesList, 'console.log(', 'Uploaded images list direct log logging');
  assertNotIncludes(uploadedImagesList, 'console.debug(', 'Uploaded images list direct debug logging');
  assertNotIncludes(descriptionGeneration, 'console.error(', 'Description generation direct error logging');
  assertNotIncludes(descriptionGeneration, 'console.warn(', 'Description generation direct warn logging');
  assertNotIncludes(descriptionGeneration, 'console.log(', 'Description generation direct log logging');
  assertNotIncludes(descriptionGeneration, 'console.debug(', 'Description generation direct debug logging');
  assertNotIncludes(descriptionGeneration, '@lib/monitoring/logger', 'Description generation raw logger import');
  assertNotIncludes(descriptionGeneration, "logger.warn('Description generation returned error message'", 'Description generation raw returned-error logging');
  assertNotIncludes(descriptionGeneration, 'message: resultMessage', 'Description generation raw returned-error message logging');
  assertNotIncludes(descriptionGeneration, 'fileId: file.uid', 'Description generation raw file id logging');
  assertNotIncludes(editItemModal, 'Error generating content:', 'Edit item modal raw content-generation diagnostic');
  assertNotIncludes(editCategoryModal, 'Failed to persist preset:', 'Edit category modal raw preset diagnostic');
  assertNotIncludes(uploadedImagesList, 'Deleting image:', 'Uploaded images list raw delete diagnostic');
  assertNotIncludes(uploadedImagesList, 'Failed to delete image:', 'Uploaded images list raw delete-failure diagnostic');
  assertNotIncludes(uploadedImagesList, 'Image deletion cancelled', 'Uploaded images list raw cancel diagnostic');
}

function verifyMenuCorrectnessEngineDocsMatchRuntime() {
  const features = read('src/config/features.ts');
  const projectDal = read('src/database/projects/index.ts');
  const spec = read('__docs__/menu-correctness-engine/menu-correctness-engine_spec.md');
  const readme = read('__docs__/menu-correctness-engine/README.md');
  const impl = read('__docs__/menu-correctness-engine/menu-correctness-engine_impl.md');
  const website = read('__docs__/menu-correctness-engine/menu-correctness-engine_website.md');
  const marketing = read('__docs__/menu-correctness-engine/menu-correctness-engine_marketing.md');
  const helpdoc = read('__docs__/menu-correctness-engine/menu-correctness-engine_helpdoc.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  assertIncludes(features, 'ENABLE_MCE: true', 'MCE runtime feature flag');
  assertIncludes(projectDal, 'if (FEATURE_FLAGS.ENABLE_MCE)', 'MCE updateProject runtime hook');
  assertIncludes(projectDal, 'persistedUpdateData._mce = mceRuntime.toMCEMetadata(mceResult);', 'MCE metadata same-transaction hook');
  assertIncludes(readme, '| `ENABLE_MCE` | `true` | Enable Menu Correctness Engine |', 'MCE README runtime flag');
  assertIncludes(readme, '**Menu data is validated at save time before supported publishing flows continue.**', 'MCE README supported publishing-flow claim boundary');
  assertIncludes(readme, 'Supported surfaces read from the same Firestore project document through their existing refresh, download, device, or provider paths.', 'MCE README supported surface path boundary');
  assertIncludes(impl, '**Status:** ✅ IMPLEMENTED — Active (`ENABLE_MCE: true`)', 'MCE implementation runtime status');
  assertIncludes(spec, 'active runtime flag (`ENABLE_MCE: true`); not current launch certification', 'MCE spec active runtime boundary');
  assertIncludes(spec, 'Current release approval requires the active [production-readiness audit]', 'MCE spec launch boundary');
  assertIncludes(spec, 'External Certification Runbook', 'MCE spec external certification boundary');
  assertIncludes(spec, '`npm run verify:public-business-truth`', 'MCE spec source-gate boundary');
  assertIncludes(spec, 'browser/mobile save and publish-gate QA', 'MCE spec browser/mobile QA boundary');
  assertIncludes(spec, 'Treat that rating only as historical external-review evidence, not current launch certification.', 'MCE spec historical ChatGPT audit boundary');
  assertIncludes(spec, 'Current public claim boundary: MCE validates project data at save time and stamps `_mce` metadata on the existing project document.', 'MCE spec current public claim boundary');
  assertIncludes(spec, 'It does not certify every customer-facing surface, artifact, device, or provider target without separate target evidence.', 'MCE spec target evidence boundary');
  assertNotIncludes(spec, '**Status:** ✅ IMPLEMENTED — Flag OFF (ENABLE_MCE: false)', 'MCE spec stale disabled flag status');
  assertNotIncludes(spec, 'Production ready: Yes.', 'MCE spec stale external launch verdict');

  assertIncludes(website, '**Status:** Source-gated website evidence; not current launch certification', 'MCE website source-gated status');
  assertIncludes(website, 'Current website approval requires the active [production-readiness audit]', 'MCE website launch boundary');
  assertIncludes(website, 'External Certification Runbook', 'MCE website external certification boundary');
  assertIncludes(website, '`npm run verify:public-business-truth`', 'MCE website source-gate boundary');
  assertIncludes(website, 'surface updating through its own refresh, download, or provider flow', 'MCE website surface-specific timing boundary');
  assertIncludes(website, 'public menu/device QA', 'MCE website public menu/device QA boundary');
  assertIncludes(website, 'PDF artifact review', 'MCE website PDF artifact QA boundary');
  assertIncludes(website, 'POS/provider smoke', 'MCE website POS/provider QA boundary');

  assertIncludes(marketing, '**Status:** Source-gated marketing evidence; not current launch certification', 'MCE marketing source-gated status');
  assertIncludes(marketing, 'Current release approval requires the active [production-readiness audit]', 'MCE marketing launch boundary');
  assertIncludes(marketing, 'External Certification Runbook', 'MCE marketing external certification boundary');
  assertIncludes(marketing, '`npm run verify:public-business-truth`', 'MCE marketing source-gate boundary');
  assertIncludes(marketing, 'It must not promise instant sync, universal surface certification, or POS/PDF/device behavior without matching target evidence.', 'MCE marketing absolute-claim boundary');
  assertIncludes(marketing, 'Supported surfaces read the same validated project data through their audited paths', 'MCE marketing audited-surface boundary');
  assertIncludes(marketing, '### Slide 5: The Source Commitments', 'MCE marketing source commitments boundary');
  assertIncludes(marketing, 'PDF: generated artifacts should be replaced after later edits', 'MCE marketing generated artifact boundary');

  assertIncludes(helpdoc, '**Status:** Source-gated help evidence; not current launch certification', 'MCE helpdoc source-gated status');
  assertIncludes(helpdoc, 'source-gated draft evidence for the current Menu Correctness Engine runtime', 'MCE helpdoc source-gated boundary');
  assertIncludes(helpdoc, 'External Certification Runbook', 'MCE helpdoc external certification boundary');
  assertIncludes(helpdoc, '`npm run verify:public-business-truth`', 'MCE helpdoc source-gate boundary');
  assertIncludes(helpdoc, 'Supported surfaces read from the same verified project data after their normal refresh, download, or provider flow completes.', 'MCE helpdoc surface-specific timing boundary');

  const contentDocs = `${website}\n${marketing}\n${helpdoc}`;
  assertNotIncludes(contentDocs, '**Status:** ✅ IMPLEMENTED — READY FOR WEBSITE TEAM', 'MCE content docs stale website-ready status');
  assertNotIncludes(contentDocs, '**Status:** ✅ IMPLEMENTED — READY FOR INTERNAL USE', 'MCE content docs stale internal-ready status');
  assertNotIncludes(contentDocs, '**Status:** ✅ IMPLEMENTED — READY FOR HELP CENTER', 'MCE content docs stale help-ready status');
  assertNotIncludes(contentDocs, 'updates every surface — QR code, website, digital screen, PDF, POS — automatically', 'MCE content docs stale automatic all-surface update claim');
  assertNotIncludes(contentDocs, 'Only verified menu data reaches your customers', 'MCE content docs stale exposure-gate claim');
  assertNotIncludes(contentDocs, 'Your QR menu, digital screen, PDF, and POS system all show the same verified prices', 'MCE content docs stale all-surface price claim');
  assertNotIncludes(contentDocs, 'Your QR code, digital screen, PDF, POS, and website all receive the same verified menu. Automatically.', 'MCE content docs stale receive-same-menu claim');
  assertNotIncludes(contentDocs, 'MenuList now guarantees that every menu surface', 'MCE content docs stale blanket guarantee claim');
  assertNotIncludes(contentDocs, 'Only verified, correct menu data reaches customers.', 'MCE content docs stale customer-exposure claim');
  assertNotIncludes(contentDocs, 'consistency absolute — across every surface, every outlet, every time', 'MCE content docs stale absolute-consistency claim');
  assertNotIncludes(contentDocs, 'Every surface reads same validated data', 'MCE content docs stale surface path claim');
  assertNotIncludes(contentDocs, "it's correct everywhere. That's the point.", 'MCE content docs stale owner-experience claim');
  assertNotIncludes(contentDocs, 'Your QR code and website always show the latest verified menu.', 'MCE content docs stale public-menu freshness claim');
  assertNotIncludes(contentDocs, 'Your menu will be published to all surfaces once everything is correct.', 'MCE content docs stale all-surface publish claim');
  assertNotIncludes(contentDocs, 'Your digital screens refresh automatically with the verified menu. No manual action needed.', 'MCE content docs stale screen refresh claim');
  assertNotIncludes(contentDocs, 'Digital screens refresh automatically via version polling. QR/web menus update within 30 seconds of saving.', 'MCE content docs stale timing claim');

  const activeClaimDocs = `${readme}\n${spec}\n${marketing}`;
  [
    'Your menu is always correct',
    'always correct',
    'correct everywhere',
    'guaranteed to be validated',
    'disappear everywhere simultaneously',
    'Customer never sees wrong menu',
    'customers never see wrong',
    'always fresh',
    'correctness guarantees',
    'automatically inherit',
    'automatically benefit',
    'absolute correctness',
    'updates instantly',
    'Digital screen: updates in 18 seconds',
    'ready for all surfaces',
    'All surfaces show stale data',
    'All surfaces already read',
  ].forEach((stalePhrase) => {
    assertNotIncludes(activeClaimDocs, stalePhrase, 'MCE active docs stale blanket surface/correctness claim');
  });

  [
    'Menu Correctness Engine public claim boundary checkpoint',
    '`npm run verify:public-business-truth`',
  ].forEach((token) => assertIncludes(productionAudit, token, 'Production audit MCE public claim boundary'));

  [
    'Menu Correctness Engine Public Claim Boundary',
    '`npm run verify:public-business-truth`',
  ].forEach((token) => assertIncludes(changelog, token, 'Changelog MCE public claim boundary'));
}

function verifySilentCorrectionDocsUseSupportedSurfaceBoundaries() {
  const spec = read('__docs__/silent-correction-systems/silent-correction-systems_spec.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  [
    'they ensure customers never see wrong hours, wrong prices, broken menus, or inconsistent data',
    '60-second propagation guaranteed',
    'All surfaces read from same Firestore data. 60-second propagation guaranteed.',
    'propagates instantly to all surfaces',
  ].forEach((stalePhrase) => {
    assertNotIncludes(spec, stalePhrase, 'Silent Correction Systems stale blanket freshness/correctness claim');
  });

  [
    'guardrails for preventing confident wrong hours, wrong prices, broken menus, or inconsistent data from reaching customers through supported surfaces',
    'Supported live surfaces read from saved project/store truth through their own cache, refresh, listener, download, or provider paths',
    'Public menu and Official Business Page output can take up to 60 seconds to refresh',
    'generated or provider-backed artifacts require their own evidence',
    'can reach supported live surfaces before downstream artifacts, screens, or provider paths have separate evidence',
  ].forEach((token) => {
    assertIncludes(spec, token, 'Silent Correction Systems supported-surface boundary');
  });

  assertIncludes(productionAudit, 'Silent Correction supported-surface freshness checkpoint', 'Production audit records Silent Correction supported-surface checkpoint');
  assertIncludes(changelog, 'Silent Correction Supported Surface Boundary', 'Changelog records Silent Correction supported-surface checkpoint');
}

function verifyTruthAccuracyDominanceDocsMatchRuntime() {
  const features = read('src/config/features.ts');
  const docs = {
    readme: read('__docs__/truth-accuracy-dominance/README.md'),
    spec: read('__docs__/truth-accuracy-dominance/truth-accuracy-dominance_spec.md'),
    firebase: read('__docs__/truth-accuracy-dominance/truth-accuracy-dominance_firebase.md'),
    mobile: read('__docs__/truth-accuracy-dominance/truth-accuracy-dominance_mobile-support.md'),
    audit: read('__docs__/audits/menulist-production-readiness-audit.md'),
    changelog: read('__docs__/changelog.md'),
  };

  assertIncludes(features, 'ENABLE_MCE: true', 'Truth Accuracy Dominance MCE runtime flag');

  assertIncludes(docs.readme, '**Status:** Source-gated pillar reference; not current launch certification', 'Truth Accuracy README source-gated status');
  assertIncludes(docs.readme, 'supported menu, hours, availability, and business-info surfaces', 'Truth Accuracy README supported-surface boundary');
  assertIncludes(docs.readme, "each surface's normal refresh, publish, cache, download, or provider flow completes", 'Truth Accuracy README surface-specific timing boundary');
  assertIncludes(docs.readme, 'Current release approval still requires the active [production-readiness audit]', 'Truth Accuracy README launch approval boundary');
  assertIncludes(docs.readme, 'External Certification Runbook', 'Truth Accuracy README external certification boundary');
  assertIncludes(docs.readme, '`npm run verify:public-business-truth`', 'Truth Accuracy README source verifier boundary');
  assertIncludes(docs.readme, 'Public Cache Window', 'Truth Accuracy README public cache boundary');
  assertIncludes(docs.readme, 'Surface-Specific Refresh', 'Truth Accuracy README target evidence boundary');
  assertIncludes(docs.readme, '| `src/config/features.ts` | `ENABLE_MCE: true` | Active source flag |', 'Truth Accuracy README runtime flag parity');

  assertIncludes(docs.spec, '**Status:** Source-gated pillar reference; not current launch certification', 'Truth Accuracy spec source-gated status');
  assertIncludes(docs.spec, 'normal refresh, publish, cache, download, or provider flow completes', 'Truth Accuracy spec surface-specific timing boundary');
  assertIncludes(docs.spec, '## Launch Boundary', 'Truth Accuracy spec launch boundary section');
  assertIncludes(docs.spec, 'public menu/OBP/Digital Screens browser and device QA', 'Truth Accuracy spec browser/device QA boundary');
  assertIncludes(docs.spec, 'Active runtime flag: `ENABLE_MCE: true`', 'Truth Accuracy spec runtime flag parity');
  assertIncludes(docs.spec, 'Public menu/OBP follow the 60-second public cache window', 'Truth Accuracy spec public cache boundary');
  assertIncludes(docs.spec, 'Digital Screens use exact hashed-token state caching', 'Truth Accuracy spec digital screens cache boundary');
  assertIncludes(docs.spec, 'PDF artifacts, POS integrations, Google/third-party surfaces', 'Truth Accuracy spec external target boundary');
  assertIncludes(docs.spec, 'The cache window is not a universal freshness promise', 'Truth Accuracy spec freshness boundary');
  assertIncludes(docs.spec, 'External Certification Runbook', 'Truth Accuracy spec external certification boundary');
  assertIncludes(docs.spec, '`npm run verify:public-business-truth`', 'Truth Accuracy spec source verifier boundary');

  assertIncludes(docs.firebase, '**Status:** Source-gated Firebase cost reference; not current launch certification', 'Truth Accuracy Firebase source-gated status');
  assertIncludes(docs.firebase, 'adds no new feature-specific Firebase collections, Firestore reads/writes/deletes, Storage operations, Cloud Functions, indexes, rules, schedulers, provider calls, or cache invalidation jobs', 'Truth Accuracy Firebase no-new-operations boundary');
  assertIncludes(docs.firebase, '`npm run verify:public-business-truth`', 'Truth Accuracy Firebase source verifier boundary');
  assertIncludes(docs.firebase, 'Public menu/OBP cache: current public cache tags and the 60-second public cache window', 'Truth Accuracy Firebase public cache boundary');
  assertIncludes(docs.firebase, 'Digital Screens: exact hashed-token state cache, store-scoped menu cache, and content-version listener path', 'Truth Accuracy Firebase digital screens boundary');
  assertIncludes(docs.firebase, 'Downloaded or provider targets: require separate artifact/provider evidence before freshness claims', 'Truth Accuracy Firebase target evidence boundary');

  assertIncludes(docs.mobile, '**Status:** Source-gated mobile support reference; mobile QA still required', 'Truth Accuracy mobile source-gated status');
  assertIncludes(docs.mobile, 'Mobile release approval is not automatic.', 'Truth Accuracy mobile launch boundary');
  assertIncludes(docs.mobile, 'MCE runs on project update paths covered by the current source gates.', 'Truth Accuracy mobile MCE path boundary');
  assertIncludes(docs.mobile, 'Public menu/OBP output follows the current public cache window; Digital Screens use exact token/store cache tags and the content-version listener path.', 'Truth Accuracy mobile public-output boundary');
  assertIncludes(docs.mobile, 'mobile save/publish smoke, public menu/OBP viewport QA, Digital Screens device QA where relevant', 'Truth Accuracy mobile QA evidence boundary');

  assertIncludes(docs.audit, 'Truth & Accuracy Dominance source-boundary checkpoint', 'Production audit records Truth Accuracy checkpoint');
  assertIncludes(docs.audit, '`npm run verify:public-business-truth` now source-gates the Truth & Accuracy Dominance docs', 'Production audit records Truth Accuracy verifier gate');
  assertIncludes(docs.changelog, 'Truth & Accuracy Dominance Source Boundary', 'Changelog records Truth Accuracy checkpoint');
  assertIncludes(docs.changelog, '`npm run verify:public-business-truth` now rejects stale Truth & Accuracy blanket correctness and freshness claims', 'Changelog records Truth Accuracy verifier gate');

  const forbiddenTruthClaims = [
    'always correct',
    'always accurate',
    'truth guarantees',
    'structural guarantee',
    '60s propagation guarantee',
    'instant propagation',
    'all surfaces updated within 60 seconds',
    'obp, digital menu, digital screens, qr pages',
    'multi-surface sync',
    'enable_mce: false',
    'ready to activate',
    '60s propagation applies regardless of device',
    'mce runs on every save',
    'all built. this pillar is about',
    'zero additional cost',
    'real-time',
    'reflected immediately',
    'complete truth stack',
    'guarantee',
  ];

  for (const [label, content] of Object.entries({
    readme: docs.readme,
    spec: docs.spec,
    firebase: docs.firebase,
    mobile: docs.mobile,
  })) {
    const lowerContent = content.toLowerCase();
    for (const forbidden of forbiddenTruthClaims) {
      assert(
        !lowerContent.includes(forbidden),
        `${label} must not carry stale Truth & Accuracy blanket claim: ${forbidden}`,
      );
    }
  }
}

function verifyDiscoveryInfrastructureDocsMatchRuntime() {
  const features = read('src/config/features.ts');
  const functionFlags = read('functions/src/constants/features.ts');
  const indexBuilder = read('src/lib/infrastructure/discovery/indexBuilder.ts');
  const taxonomyAdapter = read('src/lib/infrastructure/taxonomy/adapter.ts');
  const menuPage = read('src/app/client/[[...slug]]/page.tsx');
  const tenantSitemap = read('src/app/client/sitemap.ts');
  const brandObp = read('src/app/client/obp/BrandOBPContent.tsx');
  const obpContent = read('src/app/client/obp/OBPContent.tsx');
  const tenantRobots = read('src/app/client/robots.ts');
  const platformSitemap = read('public/sitemap.xml');
  const discoveryPolicy = read('src/lib/seo/discoveryPolicy.ts');

  const docs = {
    seoGuide: read('__docs__/client-menu/seo-implementation-guide.md'),
    discoveryReadme: read('__docs__/discovery-infrastructure/README.md'),
    businessEntityIndex: read('__docs__/discovery-infrastructure/business-entity-index.md'),
    dataConsumers: read('__docs__/discovery-infrastructure/data-consumers-and-distribution.md'),
    gapAnalysis: read('__docs__/discovery-infrastructure/infrastructure-gap-analysis.md'),
    provenance: read('__docs__/discovery-infrastructure/provenance-metadata.md'),
    semantics: read('__docs__/discovery-infrastructure/semantic-attributes.md'),
    originalReadme: read('__docs__/discovery-infrastructure/seo-aeo-original-readme.md'),
    taxonomy: read('__docs__/discovery-infrastructure/taxonomy-system.md'),
  };
  const seoLaunchRegister = read('__docs__/menulist-seo-launch/menulist-seo-launch_action-register.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  assertIncludes(features, 'ENABLE_PUBLIC_API: true', 'Public discovery contract public API flag');
  assertIncludes(features, 'ENABLE_INFRASTRUCTURE_TAXONOMY: false', 'Discovery taxonomy disabled flag');
  assertIncludes(features, 'ENABLE_INFRASTRUCTURE_PROVENANCE: false', 'Discovery provenance disabled flag');
  assertIncludes(features, 'ENABLE_INFRASTRUCTURE_SEMANTIC_ATTRIBUTES: false', 'Discovery semantics disabled flag');
  assertIncludes(features, 'ENABLE_INFRASTRUCTURE_DISCOVERY_INDEX: false', 'Discovery index disabled flag');
  assertIncludes(features, 'no nightly scheduler task or query API is', 'Discovery index flag comment scheduler/query boundary');
  assertIncludes(functionFlags, 'ENABLE_INFRASTRUCTURE_DISCOVERY_INDEX: false', 'Functions discovery index disabled mirror flag');
  assertIncludes(functionFlags, 'Business Entity Discovery Index — disabled builder utility, PUBLIC data only', 'Functions discovery index disabled mirror comment');

  assertIncludes(indexBuilder, 'Pure functions — no Firebase calls, no side effects.', 'Business entity index builder pure-function boundary');
  assertIncludes(indexBuilder, 'active while ENABLE_INFRASTRUCTURE_DISCOVERY_INDEX remains false.', 'Business entity index no active writer boundary');
  assertIncludes(indexBuilder, 'const containsDangerousKey = (value: unknown): boolean =>', 'Business entity index recursive safety boundary');
  assertIncludes(indexBuilder, 'if (visited.has(value)) return true;', 'Business entity index cyclic-object refusal');
  assertIncludes(indexBuilder, 'catch {\n            return true;', 'Business entity index hostile-object refusal');
  assertIncludes(taxonomyAdapter, 'Reserved: AI extraction pipeline suggestions after separate audit', 'Taxonomy adapter conditional extraction boundary');
  assertIncludes(menuPage, 'export async function generateMetadata', 'Client menu metadata source');
  assertIncludes(menuPage, 'buildGeoCoordinates(storeData)', 'Client menu GeoCoordinates schema source');
  assertIncludes(menuPage, 'buildPublicCatalogStructuredData', 'Client menu category-aware catalog schema source');
  assertIncludes(menuPage, '<JsonLdScript id="client-menu-schema-jsonld" data={schemaOrgJsonLd} />', 'Client menu JSON-LD emission source');
  assertIncludes(tenantSitemap, 'evaluatePublicTruthIndexability', 'Tenant sitemap public truth indexability gate');
  assertIncludes(tenantSitemap, '.collection(DB_COLLECTIONS.STORES)', 'Tenant sitemap canonical store source');
  assertIncludes(tenantSitemap, ".where('tenantId', '==', tenantId)", 'Tenant sitemap canonical tenant predicate');
  assertIncludes(tenantSitemap, ".where('active', '==', true)", 'Tenant sitemap canonical active-store predicate');
  assertIncludes(tenantSitemap, 'storeId: d.id,', 'Tenant sitemap authoritative canonical document ID');
  assertNotIncludes(tenantSitemap, 'parseSummaryStores', 'Tenant sitemap must not trust client-writable storesSummary');
  assertNotIncludes(tenantSitemap, ".doc('storesSummary')", 'Tenant sitemap must not read storesSummary');
  assertIncludes(brandObp, '.collection(DB_COLLECTIONS.STORES)', 'Brand OBP canonical store source');
  assertIncludes(brandObp, '.where("tenantId", "==", tenantId)', 'Brand OBP canonical tenant predicate');
  assertIncludes(brandObp, 'mapCanonicalStoreToOutlet(doc.id, doc.data())', 'Brand OBP canonical document-ID mapper');
  assertIncludes(brandObp, 'normalizeMultiOutletNumericDocumentId(storeId)', 'Brand OBP strict numeric document-ID admission');
  assertNotIncludes(brandObp, 'parseSummaryStores', 'Brand OBP must not trust client-writable storesSummary');
  assertNotIncludes(brandObp, '.doc("storesSummary")', 'Brand OBP must not read storesSummary');
  assertIncludes(obpContent, 'const storesSnap = await firestoreAdmin', 'OBP mode selection canonical store read');
  assertIncludes(obpContent, '.collection(DB_COLLECTIONS.STORES)', 'OBP mode selection canonical store source');
  assertIncludes(obpContent, '.where("tenantId", "==", tenantId)', 'OBP mode selection canonical tenant predicate');
  assertIncludes(obpContent, '.where("active", "==", true)', 'OBP mode selection active-store predicate');
  assertNotIncludes(obpContent, '.doc("storesSummary")', 'OBP public mode selection must not read storesSummary');
  assertIncludes(tenantSitemap, "secureError('[Client Sitemap] Tenant sitemap generation degraded'", 'Tenant sitemap bounded failure logging');
  assertIncludes(tenantSitemap, 'TENANT_SITEMAP_FAILURE_CODES', 'Tenant sitemap stable failure-code map');
  assertIncludes(tenantSitemap, 'tenant_sitemap_master_store_lookup_failed', 'Tenant sitemap master-store lookup diagnostics');
  assertIncludes(tenantSitemap, 'tenant_sitemap_projects_lookup_failed', 'Tenant sitemap projects lookup diagnostics');
  assertIncludes(tenantSitemap, 'tenant_sitemap_outlets_lookup_failed', 'Tenant sitemap outlets lookup diagnostics');
  assertIncludes(tenantSitemap, 'getBoundedSitemapStringContext', 'Tenant sitemap bounded string context');
  assertIncludes(tenantSitemap, 'failureCode,', 'Tenant sitemap normalized failure-code context');
  assertIncludes(tenantSitemap, "getBoundedSitemapStringContext('subdomain', context.subdomain)", 'Tenant sitemap bounded subdomain metadata');
  assertIncludes(tenantSitemap, "getBoundedSitemapStringContext('customDomain', context.customDomain)", 'Tenant sitemap bounded custom-domain metadata');
  assertIncludes(tenantSitemap, "getBoundedSitemapStringContext('storeId', context.storeId)", 'Tenant sitemap bounded store metadata');
  assertIncludes(tenantSitemap, "getBoundedSitemapStringContext('masterStoreId', context.masterStoreId)", 'Tenant sitemap bounded master-store metadata');
  assertIncludes(tenantSitemap, "getBoundedSitemapStringContext('tenantId', context.tenantId)", 'Tenant sitemap bounded tenant metadata');
  assertIncludes(tenantSitemap, 'const readModifiedOn = (raw: unknown): Date | undefined =>', 'Tenant sitemap optional validated freshness projection');
  assertIncludes(tenantSitemap, 'return undefined;', 'Tenant sitemap invalid freshness omission');
  assertNotIncludes(tenantSitemap, 'return new Date();', 'Tenant sitemap must not fabricate current freshness for missing or malformed timestamps');
  assertNotIncludes(tenantSitemap, '} catch {\n            return null;\n        }', 'Tenant sitemap master-store lookup must not fail silently');
  assertNotIncludes(tenantSitemap, '} catch {\n            return [];\n        }', 'Tenant sitemap summary lookups must not fail silently');
  assertIncludes(tenantRobots, 'DISCOVERY_CRAWLERS', 'Tenant robots crawler allowlist source');
  assertIncludes(discoveryPolicy, 'PLATFORM_DISCOVERY_PAGES', 'Platform sitemap active discovery page registry');
  assertIncludes(platformSitemap, '<loc>https://menulist.ai</loc>', 'Platform sitemap canonical website root');
  assertNotIncludes(discoveryPolicy, 'lastModified: new Date()', 'Platform sitemap registry must not fabricate all-page freshness');

  assertIncludes(docs.seoGuide, 'Current Source Contract', 'Client menu SEO guide source contract');
  assertIncludes(docs.seoGuide, 'Conditional Additions (Not Current Launch Scope)', 'Client menu SEO guide conditional launch boundary');
  assertIncludes(docs.seoGuide, 'GeoCoordinates` when `store.geo` has latitude/longitude', 'Client menu SEO guide geo runtime parity');
  assertIncludes(docs.seoGuide, 'production-readiness audit and the External Certification Runbook', 'Client menu SEO guide certification boundary');
  assertIncludes(docs.seoGuide, 'Tenant sitemap read diagnostics', 'Client menu SEO guide tenant sitemap diagnostics');
  [
    'Launch boundary:** Not current launch certification or deploy approval',
    'source-gated public-menu and Official Business Page SEO/runtime evidence only',
    '`npm run verify:production-readiness-local`',
    '`npm run verify:public-business-truth`',
    '`npm run verify:agent-readiness`',
    '`npm run verify:website-resource-locales`',
    'public tenant menu and Official Business Page browser smoke',
    'canonical-host alignment',
    'applicable target Firebase/Vercel deploy evidence',
    'production-host smoke',
    'Search Console property and sitemap submission evidence',
    'external-system outcomes',
  ].forEach((token) => assertIncludes(docs.seoGuide, token, 'Client menu SEO guide top launch boundary'));
  assertNotIncludes(docs.seoGuide, '/app/(website)/menu/[projectId]/page.tsx', 'Client menu SEO guide stale route path');
  assertNotIncludes(docs.seoGuide, 'Implementation Progress: ✅ 98% Complete', 'Client menu SEO guide stale percent status');

  assertIncludes(docs.discoveryReadme, 'Conditional Activation Gates', 'Discovery README conditional activation boundary');
  assertIncludes(docs.discoveryReadme, 'no scheduler/query API active', 'Discovery README disabled index boundary');
  assertIncludes(docs.discoveryReadme, 'Tenant sitemap read diagnostics', 'Discovery README tenant sitemap diagnostics');
  assertIncludes(docs.discoveryReadme, 'tenant_sitemap_master_store_lookup_failed', 'Discovery README master-store sitemap diagnostic');
  assertIncludes(docs.discoveryReadme, 'tenant_sitemap_projects_lookup_failed', 'Discovery README project sitemap diagnostic');
  assertIncludes(docs.discoveryReadme, 'tenant_sitemap_outlets_lookup_failed', 'Discovery README outlet sitemap diagnostic');
  assertIncludes(docs.discoveryReadme, 'add no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement', 'Discovery README tenant sitemap no-side-effect boundary');
  assertIncludes(docs.businessEntityIndex, 'Builder and types exist; the scheduler writer and query API are not active.', 'Business entity index doc disabled writer/query boundary');
  assertIncludes(docs.businessEntityIndex, 'root default deny blocks every browser read and write', 'Business entity index current default-deny boundary');
  assertIncludes(docs.businessEntityIndex, 'Activation requires a separate runtime schema', 'Business entity index future activation gates');
  assertIncludes(docs.dataConsumers, 'No real-time API for AI agents to query beyond the gated Public API v1 pull endpoints', 'Data consumers doc API v1 boundary');
  assertIncludes(docs.dataConsumers, 'Conditional Work (Only With Scoped Approval)', 'Data consumers doc conditional-work boundary');
  assertIncludes(docs.gapAnalysis, 'Conditional Gap Register', 'Infrastructure gap analysis conditional register');
  assertIncludes(docs.gapAnalysis, 'not current launch scope and is not release certification', 'Infrastructure gap analysis launch-certification boundary');
  [
    'Launch boundary:** Not current launch certification or deploy approval',
    'historical 24-layer gap analysis and conditional design inventory only',
    '`npm run verify:production-readiness-local`',
    '`npm run verify:public-business-truth`',
    '`npm run verify:agent-readiness`',
    'public tenant menu/Official Business Page discovery smoke',
    'applicable target deploy evidence',
    'production-host smoke',
    'Taxonomy, provenance, semantic-attribute, and discovery-index flags remain off',
    'scoped proposal, owner-value review, security review, Firebase cost note, docs parity, and source-gate coverage',
  ].forEach((token) => assertIncludes(docs.gapAnalysis, token, 'Infrastructure gap analysis top launch boundary'));
  assertIncludes(seoLaunchRegister, 'Added verifier-enforced top launch boundaries to the public-menu SEO source guide', 'SEO launch register public SEO/discovery top-boundary checkpoint');
  assertIncludes(productionAudit, 'Public SEO/discovery top-boundary checkpoint', 'Production audit public SEO/discovery top-boundary checkpoint');
  assertIncludes(changelog, 'Public SEO and Discovery Analysis Top Boundary', 'Changelog public SEO/discovery top-boundary checkpoint');
  assertIncludes(docs.provenance, 'Conditional scheduler', 'Provenance doc scheduler boundary');
  assertIncludes(docs.semantics, 'no writer runs while `ENABLE_INFRASTRUCTURE_DISCOVERY_INDEX` is off', 'Semantic attributes doc index disabled boundary');
  assertIncludes(docs.originalReadme, 'Historical implementation evidence through Feb 22, 2026', 'Original SEO/AEO README historical-evidence boundary');
  assertIncludes(docs.originalReadme, 'Controlled Real SMB Data — Conditional Operating Work', 'Original SEO/AEO README conditional operating boundary');
  assertIncludes(docs.taxonomy, 'is not active. If the business entity index is wired later', 'Taxonomy doc cross-tenant aggregation boundary');

  const forbiddenLaunchLabels = [
    'phase 2',
    'phase 3',
    'phase 4',
    'post-launch',
    'post launch',
    'future upgrade',
    'future phase',
    'later phase',
    'next phase',
    'deferred to',
    'still deferred',
    'ready for production',
    'production-ready',
    'production ready',
  ];

  for (const [label, content] of Object.entries(docs)) {
    const lowerContent = content.toLowerCase();
    for (const forbidden of forbiddenLaunchLabels) {
      assert(
        !lowerContent.includes(forbidden),
        `${label} must not carry stale discovery launch label: ${forbidden}`,
      );
    }
  }
}

function verifyGbpSyncDocsMatchDisabledRuntime() {
  const features = read('src/config/features.ts');
  const gbpDal = read('src/database/integrations/gbp.ts');
  const integrationsTab = read('src/components/templates/main-app/businessSettings/tabs/IntegrationsTab.tsx');
  const docs = {
    readme: read('__docs__/gbp-sync/README.md'),
    spec: read('__docs__/gbp-sync/gbp-sync_spec.md'),
    impl: read('__docs__/gbp-sync/gbp-sync_impl.md'),
    firebase: read('__docs__/gbp-sync/gbp-sync_firebase.md'),
    mobile: read('__docs__/gbp-sync/gbp-sync_mobile-support.md'),
    website: read('__docs__/gbp-sync/gbp-sync_website.md'),
    helpdoc: read('__docs__/gbp-sync/gbp-sync_helpdoc.md'),
    marketing: read('__docs__/gbp-sync/gbp-sync_marketing.md'),
    validation: read('__docs__/gbp-sync/gbp-sync_validation.md'),
    criticalReview: read('__docs__/gbp-sync/gbp-chatgpt-critical-review.md'),
    docFeedbackAudit: read('__docs__/gbp-sync/gbp-sync_doc-feedback-audit.md'),
    audit: read('__docs__/audits/menulist-production-readiness-audit.md'),
    changelog: read('__docs__/changelog.md'),
  };

  assertIncludes(features, 'ENABLE_GBP_SYNC: false', 'GBP Sync feature flag disabled runtime');
  assertIncludes(gbpDal, 'GBP_TOKEN_STORE_DISABLED', 'GBP token store disabled code');
  assertIncludes(gbpDal, 'throw createGBPTokenStoreDisabledError();', 'GBP token operations fail closed');
  assertIncludes(integrationsTab, 'const publicApiEnabled = FEATURE_FLAGS.ENABLE_PUBLIC_API;', 'Integrations tab public API flag source');
  assertIncludes(integrationsTab, 'const gbpEnabled = FEATURE_FLAGS.ENABLE_GBP_SYNC;', 'GBP integrations tab feature flag source');
  assertIncludes(integrationsTab, 'if (!publicApiEnabled && !gbpEnabled)', 'Integrations tab hidden only when all integration cards are disabled');
  assertIncludes(integrationsTab, '{gbpEnabled ? (', 'GBP integrations card feature flag guard');
  assertIncludes(integrationsTab, 'Google Business Profile sync is not yet available.', 'GBP disabled-card owner-safe copy');

  [
    'src/app/api/integrations/gbp/auth-url/route.ts',
    'src/app/api/integrations/gbp/callback/route.ts',
    'src/app/api/integrations/gbp/connect-location/route.ts',
    'src/app/api/integrations/gbp/disconnect/route.ts',
    'src/app/api/integrations/gbp/apply-hours/route.ts',
    'functions/src/integrations/gbpSync.ts',
  ].forEach((relPath) => {
    assert(!fs.existsSync(path.join(ROOT, relPath)), `GBP provider route/worker must not be active while disabled: ${relPath}`);
  });

  Object.entries(docs)
    .filter(([label]) => label !== 'audit' && label !== 'changelog')
    .forEach(([label, content]) => {
      [
        'Launch boundary:** Not current launch certification or deploy approval',
        'disabled/reserved GBP Sync evidence only',
        '`ENABLE_GBP_SYNC`',
        '`GBP_TOKEN_STORE_DISABLED`',
        'manual Google handoff',
        'production-readiness audit',
        'External Certification Runbook',
        '`npm run verify:production-readiness-local`',
        '`npm run verify:public-business-truth`',
        'Google Business Profile API access',
        'OAuth and target-secret setup',
        'provider smoke',
        'scoped deploy evidence',
        'browser/device QA',
        'production-host smoke',
      ].forEach((token) => assertIncludes(content, token, `GBP ${label} top launch boundary`));
    });

  assertIncludes(docs.readme, 'Current Source Boundary', 'GBP README disabled source boundary');
  assertIncludes(docs.readme, 'token operations fail closed with `GBP_TOKEN_STORE_DISABLED`', 'GBP README fail-closed token boundary');
  assertIncludes(docs.readme, 'manual Google handoff', 'GBP README current owner handoff');
  assertIncludes(docs.spec, 'Current Runtime', 'GBP spec current runtime boundary');
  assertIncludes(docs.spec, 'Owner manually copies the link into Google Business Profile', 'GBP spec manual owner handoff');
  assertIncludes(docs.impl, 'Current Runtime Boundary', 'GBP implementation disabled source boundary');
  assertIncludes(docs.impl, 'This file is a reserved implementation blueprint', 'GBP implementation reserved blueprint boundary');
  assertIncludes(docs.firebase, 'Current GBP Firestore operations:** none', 'GBP Firebase current no-cost boundary');
  assertIncludes(docs.firebase, 'Reserved token path:** `tenants/{tId}/integrations/gbp/{sId}`', 'GBP Firebase reserved token path');
  assertIncludes(docs.mobile, 'No active GBP mobile surface while `ENABLE_GBP_SYNC` is false', 'GBP mobile disabled boundary');
  assertIncludes(docs.website, 'This is not active public website copy for a live Google sync feature.', 'GBP website disabled public-copy boundary');
  assertIncludes(docs.website, 'Owner-managed Google update', 'GBP website owner-managed wording');
  assertIncludes(docs.helpdoc, 'Google Business Profile sync is not active in MenuList today.', 'GBP helpdoc disabled runtime boundary');
  assertIncludes(docs.helpdoc, 'Owner-managed Google updates remain the current path.', 'GBP helpdoc owner-managed path');
  assertIncludes(docs.marketing, 'Reserved integration; current runtime is manual Google handoff', 'GBP marketing source boundary');
  assertIncludes(docs.marketing, 'No owner can currently connect Google', 'GBP marketing active claim boundary');
  assertIncludes(docs.validation, 'not ready for testing, ready for implementation, launch approval, or production certification', 'GBP validation release boundary');
  assertIncludes(docs.criticalReview, 'Historical ChatGPT review; not current implementation approval or launch certification', 'GBP critical review historical boundary');
  assertIncludes(docs.criticalReview, 'Current GBP Sync runtime remains disabled', 'GBP critical review disabled runtime boundary');
  assertIncludes(docs.criticalReview, '`npm run verify:public-business-truth`', 'GBP critical review source gate boundary');
  assertIncludes(docs.docFeedbackAudit, 'HISTORICAL AUDIT STATUS', 'GBP docs-feedback audit historical status boundary');
  assertIncludes(docs.docFeedbackAudit, 'It does not authorize implementation.', 'GBP docs-feedback audit implementation boundary');
  assertIncludes(docs.docFeedbackAudit, 'GBP Sync remains disabled; there is no current implementation next step', 'GBP docs-feedback audit current disabled boundary');
  assertNotIncludes(docs.docFeedbackAudit, '**NEXT STEP:** Stage 2', 'GBP docs-feedback audit stale implementation next step');
  assertIncludes(docs.audit, 'GBP Sync disabled-runtime public-claim checkpoint', 'Production audit GBP disabled-runtime checkpoint');
  assertIncludes(docs.audit, 'GBP critical review implementation-boundary checkpoint', 'Production audit GBP critical-review boundary checkpoint');
  assertIncludes(docs.audit, 'Google listing guide owner-copy boundary checkpoint', 'Production audit Google listing owner-copy checkpoint');
  assertIncludes(docs.audit, 'GBP Sync active-doc top-boundary checkpoint', 'Production audit GBP active-doc top-boundary checkpoint');
  assertIncludes(docs.changelog, 'July 2, 2026 - GBP Sync Disabled Runtime Boundary', 'Changelog GBP disabled-runtime checkpoint');
  assertIncludes(docs.changelog, 'GBP Critical Review Implementation Boundary', 'Changelog GBP critical-review boundary checkpoint');
  assertIncludes(docs.changelog, 'Google Listing Guide Owner Copy Boundary', 'Changelog Google listing owner-copy checkpoint');
  assertIncludes(docs.changelog, 'GBP Sync Active Docs Top Boundary', 'Changelog GBP active-doc top-boundary checkpoint');

  const activeDocs = [
    docs.readme,
    docs.spec,
    docs.impl,
    docs.firebase,
    docs.mobile,
    docs.website,
    docs.helpdoc,
    docs.marketing,
    docs.validation,
    docs.criticalReview,
    docs.docFeedbackAudit,
  ].join('\n');

  [
    'Automatically sync menu data to Google Business Profile',
    'MenuList automatically keeps your Google Business Profile accurate',
    'Connect your Google account once and forget about it',
    'Done — sync begins automatically',
    'MenuList now syncs your Google Business Profile automatically',
    'Your Google Listing, Always Correct',
    '## ✅ FINAL VERDICT: PHASE 0 READY FOR TESTING',
    '**Status:** ✅ PHASE 0 COMPLETE',
    '**MARKETING REVIEW STATUS:** READY FOR SALES TEAM',
    '## ✅ VALIDATED RECOMMENDATIONS (Ready to Implement)',
    '| **Ready for Implementation** | 🔶 AFTER PREREQUISITES',
    'If approved → Ready to proceed',
    '3. **Dev Action:** Prepare schema + DAL while waiting for API access',
  ].forEach((token) => assertNotIncludes(activeDocs, token, 'GBP active docs stale automatic-sync/readiness claim'));
}

function verifyProjectPersistenceDiagnosticsAreBounded() {
  const projectDal = read('src/database/projects/index.ts');
  const specialMenuLifecycle = read('src/database/projects/specialMenuLifecycle.ts');
  const diagnostics = read('src/database/projects/diagnostics.ts');
  const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const urlRoutingImpl = read('__docs__/url-routing-architecture/url-routing-architecture_impl.md');
  const urlRoutingFirebase = read('__docs__/url-routing-architecture/url-routing-architecture_firebase.md');

  assertIncludes(diagnostics, 'secureError', 'Project persistence diagnostics secure failure logging');
  assertIncludes(diagnostics, 'secureLog', 'Project persistence diagnostics secure info logging');
  assertIncludes(diagnostics, 'getBoundedProjectPersistenceStringContext', 'Project persistence diagnostics bounded string context');
  assertIncludes(diagnostics, 'logProjectPersistenceFailure', 'Project persistence diagnostics normalized failure logger');
  assertIncludes(diagnostics, 'logProjectPersistenceInfo', 'Project persistence diagnostics bounded info logger');
  assertIncludes(projectDal, "throw new Error('Project update identity mismatch');", 'Project current-state load must fail closed');
  assertNotIncludes(projectDal, 'project_current_state_load_failed', 'Project current-state load must not continue after a failed read');
  assertIncludes(projectDal, 'project_change_detection_failed', 'Project change detection diagnostics');
  assertIncludes(projectDal, 'export function assertProjectUpdateSucceeded', 'Project update acknowledgement guard');
  assertIncludes(projectDal, 'export function assertProjectDeleteSucceeded', 'Project delete acknowledgement guard');
  assertIncludes(projectDal, "'project_delete_rejected'", 'Project delete rejected acknowledgement code');
  assertIncludes(projectDal, "throw new Error(rejectionCode);", 'Project update rejected acknowledgement code');
  assertIncludes(projectDal, 'projects_list_default_project_create_rejected', 'Project list default auto-create acknowledgement code');
  assertIncludes(projectDal, 'project_master_cache_invalidation_failed', 'Project master cache invalidation diagnostics');
  assertIncludes(projectDal, 'project_snapshot_create_failed', 'Project snapshot failure diagnostics');
  assertIncludes(projectDal, 'deleted_project_slug_reservation_check_failed', 'Deleted-project slug reservation diagnostics');
  assertIncludes(projectDal, 'Treat unknown reservation state as reserved', 'Deleted-project slug reservation lookup must fail closed');
  assertIncludes(projectDal, 'slugReservationWindowDays: SLUG_RESERVATION_WINDOW_MS / (24 * 60 * 60 * 1000),\n        });\n        return true;', 'Deleted-project slug reservation lookup errors must be treated as reserved');
  assertNotIncludes(projectDal, 'Fail-open on infrastructure errors', 'Deleted-project slug reservation lookup must not fail open');
  assertIncludes(projectDal, 'project_outlet_propagation_source_ready_failed', 'Project outlet propagation source-ready diagnostics');
  assertIncludes(projectDal, 'shouldPropagateProjectAfterSourceSave({', 'Project outlet propagation waits for the first canonical source');
  assertNotIncludes(projectDal, 'project_outlet_propagation_create_failed', 'Empty project creation must not attempt rules-rejected outlet propagation');
  assertIncludes(projectDal, 'master_update_awareness_signal_update_failed', 'Master update awareness diagnostics');
  assertIncludes(projectDal, 'menu_observation_edit_log_failed', 'Menu observation edit diagnostics');
  assertIncludes(projectDal, 'menu_observation_publish_event_failed', 'Menu observation publish diagnostics');
  assertIncludes(projectDal, 'project_linked_outlet_save_rejected', 'Linked outlet save rejection diagnostics');
  assertIncludes(projectDal, 'project_linked_outlet_publish_rejected', 'Linked outlet publish rejection diagnostics');
  assertIncludes(projectDal, 'project_outlet_propagation_duplicate_failed', 'Project outlet propagation duplicate diagnostics');
  assertIncludes(projectDal, 'isCompleteSummaryProject,\n    parseSummaryProjects,', 'Project DAL uses canonical project-summary parser and completeness guard');
  assertIncludes(projectDal, 'const parsed = parseSummaryProjects(summaryDocData);', 'Project DAL summary reader must delegate to canonical parser');
  assertIncludes(projectDal, 'normalizeParsedProjectSummaryData(projectData)', 'Project DAL summary reader must normalize parsed summary rows');
  assertIncludes(projectDal, 'if (!isCompleteSummaryProject(projectData)) continue;', 'Project DAL summary reader must ignore incomplete legacy ghost rows');
  assertIncludes(projectDal, 'const projectImage: string | null | undefined', 'Project DAL summary reader must narrow project image before exposing summary data');
  assertIncludes(projectDal, 'buildSummaryProjectDeletePayload(projectId, deleteField(), summaryDoc.data())', 'Project DAL summary deletions remove the complete mixed-shape project entry');
  assertIncludes(specialMenuLifecycle, 'buildSummaryProjectFieldPayload(', 'Project lifecycle special-menu summary status uses canonical field payload');
  assertIncludes(specialMenuLifecycle, "'specialMenuStatus',\n                status,", 'Project lifecycle summary helper persists its resolved special-menu status through canonical field payload');
  assertIncludes(specialMenuLifecycle, 'buildSummaryUpdate(nextMetadata, nextStatus)', 'Project lifecycle writes the resolved next status through the canonical summary helper');
  assertIncludes(specialMenuLifecycle, "nextStatus = 'active';", 'Project lifecycle resolves active status');
  assertIncludes(specialMenuLifecycle, "nextStatus = 'expired';", 'Project lifecycle resolves expired status');
  assertIncludes(specialMenuLifecycle, "nextStatus = 'cancelled';", 'Project lifecycle resolves cancelled status');
  assertNotIncludes(projectDal, '[`projects.${projectId}`]', 'Project DAL must not build raw summary project delete paths');
  assertNotIncludes(projectDal, '[`projects.${projectId}.specialMenuStatus`]', 'Project DAL must not build raw special-menu summary status paths');
  assertNotIncludes(projectDal, 'key.replace("projects.", "")', 'Project DAL must not parse projectsSummary with local string replacement');
  assertIncludes(productionReadinessAudit, 'Project write acknowledgement source-gate checkpoint', 'Production readiness audit project write acknowledgement checkpoint');
  assertIncludes(productionReadinessAudit, 'scans every active `src` project write/create/publish call', 'Production readiness audit generic project write acknowledgement scan');
  assertIncludes(changelog, 'Project writes are source-gated globally', 'Changelog project write acknowledgement source gate');
  assertIncludes(changelog, '`npm run verify:public-business-truth` now scans every active `src` project write/create/publish call', 'Changelog generic project write acknowledgement scan');
  assertIncludes(productionReadinessAudit, 'Project lifecycle mutation acknowledgement source-gate checkpoint', 'Production readiness audit project lifecycle acknowledgement checkpoint');
  assertIncludes(productionReadinessAudit, 'scans every active `src` project delete/activate/duplicate/restore call', 'Production readiness audit generic project lifecycle acknowledgement scan');
  assertIncludes(changelog, 'Project lifecycle mutations are source-gated globally', 'Changelog project lifecycle acknowledgement source gate');
  assertIncludes(changelog, '`npm run verify:public-business-truth` now scans every active `src` project delete/activate/duplicate/restore call', 'Changelog generic project lifecycle acknowledgement scan');
  assertIncludes(productionReadinessAudit, 'Deleted-project slug reservation fail-closed checkpoint', 'Production readiness audit deleted-project slug reservation checkpoint');
  assertIncludes(changelog, 'Deleted Project Slug Reservation Fail Closed', 'Changelog deleted-project slug reservation checkpoint');
  assertIncludes(urlRoutingImpl, 'Deleted-project slug reservation fail-closed follow-up', 'URL routing implementation deleted-project slug reservation checkpoint');
  assertIncludes(urlRoutingFirebase, 'July 5, 2026 deleted-project slug reservation fail-closed update', 'URL routing Firebase deleted-project slug reservation checkpoint');
  assertNotIncludes(projectDal, 'backfillProjectsSummary', 'Project DAL temporary projects-summary backfill surface');
  assertNotIncludes(projectDal, '__backfillProjectsSummary', 'Project DAL browser-console projects-summary backfill exposure');
  assertNotIncludes(projectDal, 'projects_summary_backfill_', 'Project DAL projects-summary backfill diagnostics');
  assertNotIncludes(projectDal, 'TEMPORARY: Expose backfill to window', 'Project DAL temporary browser backfill comment');
  assertNotIncludes(projectDal, 'console.error(', 'Project DAL direct error logging');
  assertNotIncludes(projectDal, 'console.warn(', 'Project DAL direct warn logging');
  assertNotIncludes(projectDal, 'console.log(', 'Project DAL direct log logging');
  assertNotIncludes(projectDal, "Silent fail - don't block update", 'Project DAL old silent update failure comment');
  assertNotIncludes(projectDal, 'console.debug(', 'Project DAL direct debug logging');
  assertNotIncludes(projectDal, 'result.error ||', 'Project DAL raw linked-outlet response text');
  assertNotIncludes(projectDal, 'Linked outlet save failed: ${response.status}', 'Project DAL raw linked-outlet save status text');
  assertNotIncludes(projectDal, 'Linked outlet publish failed: ${response.status}', 'Project DAL raw linked-outlet publish status text');
}

function verifyProjectDefaultHandoffIsAtomic() {
  const projectDal = read('src/database/projects/index.ts');
  const desktopProjects = read('src/components/templates/main-app/projects/index.tsx');
  const mobileProjectSelector = read('src/components/mobile/components/MobileProjectSelectorSheet.tsx');
  const projectFirebaseDoc = read('__docs__/projects/project-management/project-management_firebase.md');
  const projectImplDoc = read('__docs__/projects/project-management/project-management_impl.md');
  const projectReadme = read('__docs__/projects/project-management/README.md');

  assertIncludes(projectDal, 'type ProjectDefaultHandoffOptions', 'Project DAL default handoff options');
  assertIncludes(projectDal, 'buildProjectDefaultHandoffSummaryPayload', 'Project DAL atomic default handoff payload helper');
  assertIncludes(projectDal, "buildSummaryProjectFieldPayload(unsetProjectId, 'isDefault', false)", 'Project DAL previous-default field update');
  assertIncludes(projectDal, "buildSummaryProjectFieldPayload(setProjectId, 'isDefault', true)", 'Project DAL replacement-default field update');
  assertIncludes(projectDal, 'defaultHandoffSummaryMap: freshSummaryMap', 'Project DAL validates replacement defaults from the transaction-current summary map');
  assertIncludes(projectDal, 'Replacement default project was not found.', 'Project DAL replacement-default missing guard');
  assertIncludes(projectDal, "cacheContext: \"updateProjectMetadata\"", 'Project DAL metadata handoff cache context');
  assertIncludes(projectDal, "cacheContext: \"addProject\"", 'Project DAL create handoff cache context');

  assertIncludes(desktopProjects, 'defaultHandoff: {', 'Desktop project form must pass default handoff through DAL');
  assertIncludes(desktopProjects, 'unsetProjectId: shouldBeDefault ? otherDefault?.projectId : undefined', 'Desktop project form previous-default handoff');
  assertIncludes(desktopProjects, 'setProjectId: defaultReplacement?.projectId', 'Desktop project form replacement-default handoff');
  assertNotIncludes(desktopProjects, 'const previousDefaultResult = await updateProjectMetadata(otherDefault.projectId, { isDefault: false });', 'Desktop project form must not unset previous default with a second metadata write');
  assertNotIncludes(desktopProjects, 'const replacementDefaultResult = await updateProjectMetadata(defaultReplacement.projectId, { isDefault: true });', 'Desktop project form must not set replacement default with a second metadata write');

  assertIncludes(mobileProjectSelector, 'unsetProjectId: nextIsDefault ? currentDefault?.projectId : undefined', 'Mobile project create previous-default handoff');
  assertIncludes(mobileProjectSelector, 'unsetProjectId: shouldUnsetPreviousDefault ? currentDefault?.projectId : undefined', 'Mobile project edit previous-default handoff');
  assertIncludes(mobileProjectSelector, 'setProjectId: defaultReplacement?.projectId', 'Mobile project edit replacement-default handoff');
  const mobileOpenEdit = mobileProjectSelector.slice(
    mobileProjectSelector.indexOf('const openEdit = async'),
    mobileProjectSelector.indexOf('const openDuplicate = async'),
  );
  assertIncludes(mobileOpenEdit, 'setFormIsDefault(project.isDefault === true);', 'Mobile project edit form canonical default-state initialization');
  assertNotIncludes(mobileOpenEdit, 'setFormIsDefault(false);', 'Mobile project edit form false default-state initialization');
  assertNotIncludes(mobileProjectSelector, 'const currentDefaultResult = await updateProjectMetadata(currentDefault.projectId, { isDefault: false });', 'Mobile project selector must not unset previous default with a second metadata write');
  assertNotIncludes(mobileProjectSelector, 'const replacementDefaultResult = await updateProjectMetadata(defaultReplacement.projectId, { isDefault: true });', 'Mobile project selector must not set replacement default with a second metadata write');

  assertIncludes(projectFirebaseDoc, 'Default handoff is atomic inside the project DAL', 'Project Firebase docs default handoff parity');
  assertIncludes(projectImplDoc, 'Default switching uses the same transactional summary mutation', 'Project implementation docs default handoff parity');
  assertIncludes(projectReadme, 'supports an idempotent deterministic default-menu recovery', 'Project README create/default recovery parity');
}

function verifyMenuChangeLogDiagnosticsAreBounded() {
  const menuChangeLogDal = read('src/database/menuChangeLog/index.ts');
  const menuChangeLogBoundary = read('src/database/menuChangeLog/menuChangeLogBoundary.ts');
  const legacyMolLogger = read('src/lib/pricing/molLogger.ts');
  const diagnostics = read('src/database/menuChangeLog/menuChangeLogDiagnostics.ts');
  const firestoreRules = read('firestore.rules');
  const menuDriftMetrics = read('functions/src/analytics/menuDriftMetrics.ts');
  const menuDriftBoundary = read('src/data/shared/menuDriftContribution.ts');
  const extractionLearning = read('functions/src/analytics/extractionLearning.ts');
  const extractionLearningBoundary = read('functions/src/analytics/extractionLearningBoundary.ts');
  const storeTruthConfidence = read('functions/src/analytics/storeTruthConfidence.ts');
  const projectDal = read('src/database/projects/index.ts');
  const dataEditorFirebase = read('__docs__/projects/data-editor/data-editor_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const canonicalTruthFirebase = read('__docs__/canonical-truth-infrastructure/canonical-truth-infrastructure_firebase.md');
  const discoveryReadme = read('__docs__/discovery-infrastructure/README.md');
  const changelog = read('__docs__/changelog.md');

  assertIncludes(diagnostics, 'secureError', 'Menu change log diagnostics secure logging');
  assertIncludes(diagnostics, 'secureLog', 'Menu change log bounded diagnostic logging');
  assertIncludes(diagnostics, 'getBoundedMenuChangeLogStringContext', 'Menu change log diagnostics bounded string context');
  assertIncludes(diagnostics, 'getMenuChangeLogEntryContext', 'Menu change log diagnostics bounded entry context');
  assertIncludes(diagnostics, 'logMenuChangeLogDiagnostic', 'Menu change log normalized diagnostic logger');
  assertIncludes(diagnostics, 'logMenuChangeLogFailure', 'Menu change log diagnostics normalized failure logger');
  assertIncludes(diagnostics, 'oldValuePresent', 'Menu change log diagnostics old value presence only');
  assertIncludes(diagnostics, 'newValuePresent', 'Menu change log diagnostics new value presence only');
  assertIncludes(diagnostics, 'metadataPresent', 'Menu change log diagnostics metadata presence only');
  assertIncludes(diagnostics, 'sourceErrorName: getMenuChangeLogErrorName(error)', 'Menu change log diagnostics source error name');
  assertIncludes(diagnostics, 'sourceErrorCode: getMenuChangeLogErrorCode(error)', 'Menu change log diagnostics source error code');
  assertIncludes(diagnostics, 'sourceStatusCode: getMenuChangeLogErrorStatus(error)', 'Menu change log diagnostics source error status');
  assertIncludes(menuChangeLogDal, 'menu_change_log_tracking_failed', 'Menu change log tracking diagnostics');
  assertIncludes(menuChangeLogDal, 'menu_change_log_session_missing', 'Menu change log no-session diagnostics');
  assertIncludes(menuChangeLogDal, 'menu_change_log_scoped_tracking_failed', 'Menu change log scoped tracking diagnostics');
  assertIncludes(menuChangeLogDal, 'menu_change_log_scope_invalid', 'Menu change log invalid-scope diagnostics');
  assertIncludes(menuChangeLogDal, 'menu_change_log_batch_session_failed', 'Menu change log batch session diagnostics');
  assertIncludes(menuChangeLogDal, 'menu_change_log_batch_entry_failed', 'Menu change log batch entry diagnostics');
  assertIncludes(menuChangeLogDal, 'menu_change_log_write_failed', 'Menu change log write diagnostics');
  assertIncludes(menuChangeLogDal, 'getMenuChangeLogEntryContext(entry)', 'Menu change log bounded entry context usage');
  assertIncludes(menuChangeLogDal, 'void executeLogWrite(pending.scope, pending.entry);', 'Menu change log debounced write uses queued scope');
  assertIncludes(menuChangeLogDal, 'takePendingMenuChanges(pendingData)', 'Menu change log flush drains immutable pending entries');
  assertIncludes(menuChangeLogDal, 'executeLogWrite(change.scope, change.entry)', 'Menu change log flush uses queued scope');
  assertNotIncludes(menuChangeLogDal, 'void getActiveSession().then(session => {', 'Menu change log flush must not re-resolve a mutable session');
  assertIncludes(menuChangeLogBoundary, 'String(numericId) === documentId', 'Menu change log exact positive numeric scope guard');
  assertIncludes(menuChangeLogBoundary, 'entry.categoryId ?? null', 'Menu change log category-aware debounce identity');
  assertIncludes(menuChangeLogBoundary, 'MAX_MENU_CHANGE_LOG_QUERY_LIMIT = 500', 'Menu change log bounded query cap');
  assertIncludes(menuChangeLogBoundary, "changeType !== 'MENU_REVISION_SUMMARY'", 'Menu revision summaries bypass lossy debounce replacement');
  assertIncludes(menuChangeLogBoundary, "changeType !== 'PUBLISH'", 'Publish events bypass lossy debounce replacement');
  assertIncludes(menuChangeLogDal, 'MENU_CHANGE_LOG_SCAN_PAGE_SIZE = 100', 'Menu change log bounded page size');
  assertIncludes(menuChangeLogDal, 'MAX_MENU_CHANGE_LOG_SCAN_DOCUMENTS = 5000', 'Menu change log bounded scan budget');
  assertIncludes(menuChangeLogDal, "orderBy(documentId(), 'desc')", 'Menu change log stable timestamp/document cursor');
  assertIncludes(menuChangeLogDal, 'timestamp: serverTimestamp()', 'Menu change log server-authoritative event time');
  assertIncludes(legacyMolLogger, 'createdOn: serverTimestamp()', 'Legacy MOL writer server-authoritative event time');
  assertNotIncludes(legacyMolLogger, 'createdOn: Timestamp.now()', 'Legacy MOL writer must not use browser clock time');
  assertIncludes(menuChangeLogDal, 'endTimestamp: Timestamp.now()', 'Menu change log open-ended readers exclude legacy future rows');
  assertNotIncludes(menuChangeLogDal, "where('projectId', '==', normalizedProjectId)", 'Nested menu change log queries must not require an unavailable dynamic-store composite index');
  assertIncludes(menuDriftMetrics, 'CHANGE_LOG_PAGE_SIZE = 500', 'Menu drift bounded change-log pages');
  assertIncludes(menuDriftMetrics, 'MAX_CHANGE_LOG_DOCUMENTS_PER_STORE = 50_000', 'Menu drift bounded per-store scan budget');
  assertIncludes(menuDriftMetrics, 'MAX_METRICS_DOCUMENTS_PER_PROJECT = 10_000', 'Menu drift bounded derived-metrics cleanup scan');
  assertIncludes(menuDriftMetrics, ".orderBy(FieldPath.documentId(), 'asc')", 'Menu drift stable document cursor');
  assertIncludes(menuDriftMetrics, ".where('timestamp', '<=', windowEndTimestamp)", 'Menu drift excludes future-dated ledger rows');
  assertNotIncludes(menuDriftMetrics, ".where('projectId', '==', projectId)", 'Menu drift must not require a dynamic-store composite index');
  assertIncludes(menuDriftMetrics, '.doc(tId)\n                    .collection(sId)', 'Menu drift reads nested project collections');
  assertIncludes(menuDriftMetrics, 'readStoreDriftAccumulators(', 'Menu drift scans each store ledger once');
  assertIncludes(menuDriftMetrics, 'readMenuDriftContributions(data)', 'Menu drift consumes detailed and compact summary events');
  assertIncludes(menuDriftMetrics, 'batch.delete(metricDocument.ref)', 'Menu drift removes expired rolling-window metrics');
  assertIncludes(menuDriftMetrics, 'batch.set(metricsRef.doc(itemId), metrics);', 'Menu drift exact-replaces each complete rolling-window metric');
  assertNotIncludes(menuDriftMetrics, 'batch.set(metricsRef.doc(itemId), metrics, { merge: true })', 'Menu drift must not retain unknown or retired derived fields');
  assertIncludes(menuDriftMetrics, '_priceStaleStatus', 'Menu drift explicit unavailable staleness provenance');
  assertIncludes(menuDriftBoundary, 'MENU_DRIFT_SUMMARY_MAX_ITEMS = 1000', 'Menu drift compact contribution bound');
  assertIncludes(menuDriftBoundary, "value !== '.'", 'Menu drift rejects reserved single-dot document IDs');
  assertIncludes(menuDriftBoundary, "value !== '..'", 'Menu drift rejects reserved double-dot document IDs');
  assertIncludes(projectDal, 'itemDriftChangesOverflowCount', 'Menu drift summary overflow preservation');
  assertIncludes(projectDal, 'const operationScope = normalizeMenuChangeLogScope(operationSession);', 'Project writes capture one immutable operation scope');
  assertIncludes(projectDal, 'composeRequestBody(data, operationSession, { isNew: false })', 'Project update metadata uses the captured operation session');
  assertIncludes(projectDal, 'logMenuChangesForScope(detailedEntries, scope)', 'Detailed project observations use the write operation scope');
  assertIncludes(projectDal, 'const recordPublishedMenuTruth = async (', 'Standalone and linked publish observation handoff');
  assertIncludes(projectDal, 'logMenuChangeForScope({', 'Publish observation uses the captured operation scope');
  assertIncludes(extractionLearning, 'CHANGE_LOG_PAGE_SIZE = 500', 'Extraction learning bounded change-log pages');
  assertIncludes(extractionLearning, 'MAX_CHANGE_LOG_DOCUMENTS_PER_STORE = 50_000', 'Extraction learning bounded per-store scan budget');
  assertIncludes(extractionLearning, ".orderBy(FieldPath.documentId(), 'asc')", 'Extraction learning stable document cursor');
  assertIncludes(extractionLearning, ".where('timestamp', '<=', windowEndTimestamp)", 'Extraction learning excludes future-dated ledger rows');
  assertNotIncludes(extractionLearning, ".where('changeType', '==', 'EXTRACTION_CORRECTION')", 'Extraction learning must not require a dynamic-store composite index');
  assertIncludes(projectDal, 'extractionCorrectionsByField', 'Summary-mode MOL field correction counters');
  assertIncludes(projectDal, 'extractionCorrectionsByConfidence', 'Summary-mode MOL confidence correction counters');
  assertIncludes(extractionLearning, 'readExtractionCorrectionContribution(data)', 'Extraction learning summary/detailed compatibility boundary');
  assertIncludes(extractionLearning, 'const storeByField: Record<string, number>', 'Extraction learning store-local rollback boundary');
  assertIncludes(extractionLearning, 'result.storesFailed++', 'Extraction learning partial-store failure observability');
  assertIncludes(extractionLearningBoundary, "value.changeType !== 'MENU_REVISION_SUMMARY'", 'Extraction learning compact summary parser');
  assertIncludes(extractionLearningBoundary, 'value.changeType === \'EXTRACTION_CORRECTION\'', 'Extraction learning detailed legacy parser');
  assertNotIncludes(extractionLearning, 'result.totalCorrections * 5', 'Extraction learning must not manufacture an extraction denominator');
  assertIncludes(extractionLearning, 'correctionRate: null', 'Extraction learning unavailable rate contract');
  assertIncludes(extractionLearning, "correctionRateStatus: 'unavailable_without_extraction_denominator'", 'Extraction learning unavailable rate reason');
  assertIncludes(storeTruthConfidence, "typeof storedCorrectionRate === 'number'", 'Store truth measured correction-rate guard');
  assertIncludes(storeTruthConfidence, "learningData?.correctionRateStatus === 'measured'", 'Store truth correction-rate provenance guard');
  assertIncludes(storeTruthConfidence, 'if (globalCorrectionRate === null) return score;', 'Store truth neutral extraction fallback');
  assertIncludes(firestoreRules, 'canReadMenuChangeLog(tId, sId)', 'Menu change log store-scoped read rule');
  assertIncludes(firestoreRules, 'canCreateMenuChangeLog(tId, sId)', 'Menu change log role-scoped create rule');
  assertIncludes(firestoreRules, 'isValidMenuChangeLogCreate(tId, sId, entryId, request.resource.data)', 'Menu change log payload/path validator');
  assertIncludes(firestoreRules, 'isValidMenuChangeLogDriftPayload(data)', 'Menu change log compact drift payload bound');
  assertIncludes(firestoreRules, 'isValidMenuSnapshotCreate(tId, sId, request.resource.data)', 'Menu snapshot path/payload validator');
  assertIncludes(firestoreRules, 'data.timestamp == request.time', 'Menu change log server-authoritative canonical timestamp rule');
  assertIncludes(firestoreRules, 'data.createdOn == request.time', 'Menu change log server-authoritative legacy timestamp rule');
  assertIncludes(firestoreRules, 'isCurrentMenuChangeLogActor(data.actorUserId)', 'Legacy MOL actor must match authenticated identity');
  assertIncludes(firestoreRules, 'isValidLegacyMenuChangeLogTypeEntity(data)', 'Legacy MOL type/entity agreement');
  assertIncludes(firestoreRules, 'isValidLegacyMenuChangeLogEntityScope(tId, sId, data)', 'Legacy MOL project/store entity authority');
  assertIncludes(firestoreRules, "data.changedBy in ['OWNER', 'STAFF']", 'Canonical browser events cannot claim system provenance');
  assertNotIncludes(firestoreRules, "data.changedBy in ['OWNER', 'STAFF', 'SYSTEM']", 'Canonical browser event system-provenance bypass');
  assertIncludes(firestoreRules, "data.retentionDays == 90", 'Menu snapshot exact governed retention rule');
  assertIncludes(firestoreRules, "request.time + duration.value(90, 'd')", 'Menu snapshot expiry bounded to governed retention');
  assertIncludes(projectDal, 'tId: scope.tId', 'Menu snapshot payload tenant scope');
  assertIncludes(projectDal, 'sId: scope.sId', 'Menu snapshot payload store scope');
  assertIncludes(projectDal, 'const snapshotPayload = sanitizeForFirestore({', 'Menu snapshot undefined-value sanitizer');
  assertIncludes(projectDal, 'createdAt: serverTimestamp()', 'Menu snapshot server-authoritative creation time');
  assertNotIncludes(canonicalTruthFirebase, 'after native TTL is active', 'Menu snapshot dynamic path cannot claim native TTL');
  assertIncludes(canonicalTruthFirebase, 'after bounded leased cleanup reaches steady state', 'Menu snapshot real retention mechanism');
  assertIncludes(discoveryReadme, 'Best-effort short-term immutable publish evidence', 'Discovery docs must not claim guaranteed snapshot capture');
  assertIncludes(dataEditorFirebase, 'MOL no-session diagnostics update', 'Data Editor Firebase docs MOL no-session diagnostics note');
  assertIncludes(productionAudit, 'MOL no-session diagnostics checkpoint', 'Production audit MOL no-session diagnostics checkpoint');
  assertIncludes(changelog, 'MOL No-Session Diagnostics', 'Changelog MOL no-session diagnostics entry');
  assertNotIncludes(menuChangeLogDal, 'return; // Silent return - no session', 'Menu change log no-session silent return');
  assertNotIncludes(menuChangeLogDal, 'return; // Silent return - no logging to avoid console spam', 'Menu change log feature-disabled stale silent comment');
  assertNotIncludes(menuChangeLogDal, 'console.error(', 'Menu change log direct error logging');
  assertNotIncludes(menuChangeLogDal, 'console.warn(', 'Menu change log direct warn logging');
  assertNotIncludes(menuChangeLogDal, 'console.log(', 'Menu change log direct log logging');
  assertNotIncludes(menuChangeLogDal, 'console.debug(', 'Menu change log direct debug logging');
  assertNotIncludes(menuChangeLogDal, '[MenuChangeLog] Tracking error (non-blocking):', 'Menu change log raw tracking diagnostic');
  assertNotIncludes(menuChangeLogDal, '[MenuChangeLog] Scoped tracking error (non-blocking):', 'Menu change log raw scoped tracking diagnostic');
  assertNotIncludes(menuChangeLogDal, '[MenuChangeLog] Logged:', 'Menu change log raw success diagnostic');
  assertNotIncludes(menuChangeLogDal, '[MenuChangeLog] Failed to log:', 'Menu change log raw write diagnostic');
}

function verifyProjectsPageDiagnosticsAreBounded() {
  const projectsPage = read('src/components/templates/main-app/projects/index.tsx');
  const createSpecialMenuModal = read('src/components/templates/main-app/projects/CreateSpecialMenuModal.tsx');
  const projectEditModal = read('src/components/templates/main-app/projects/ProjectDetails/ProjectEditModal.tsx');
  const projectDuplicateModal = read('src/components/templates/main-app/projects/ProjectDetails/ProjectDuplicateModal.tsx');
  const projectImageGeneration = read('src/lib/image/projectImageGeneration.ts');
  const menuQualityDashboard = read('src/components/templates/main-app/dashboard/MenuQualitySignals.tsx');
  const specialMenuCard = read('src/components/templates/main-app/projects/SpecialMenuCard.tsx');
  const diagnostics = read('src/components/templates/main-app/projects/utils/projectPageDiagnostics.ts');
  const useSpecialMenus = read('src/hooks/useSpecialMenus.ts');
  const projectDal = read('src/database/projects/index.ts');
  const mobileProjectsProvider = read('src/components/mobile/providers/MobileProjectsProvider.tsx');
  const ownerProjectSelection = read('src/lib/projects/projectSelection.ts');
  const storeDal = read('src/database/stores/index.tsx');
  const businessAttributeDefaults = read('src/data/shared/businessAttributeDefaults.ts');
  const mobileSpecialMenuScreen = read('src/components/mobile/screens/MobileSpecialMenuScreen.tsx');
  const specialMenuMobileSupportDoc = read('__docs__/special-menu-switching/special-menu-switching_mobile-support.md');
  const specialMenuReadme = read('__docs__/special-menu-switching/README.md');
  const specialMenuSpec = read('__docs__/special-menu-switching/special-menu-switching_spec.md');
  const specialMenuImpl = read('__docs__/special-menu-switching/special-menu-switching_impl.md');
  const specialMenuValidation = read('__docs__/special-menu-switching/special-menu-switching_validation.md');
  const specialMenuHelpdoc = read('__docs__/special-menu-switching/special-menu-switching_helpdoc.md');
  const specialMenuMarketing = read('__docs__/special-menu-switching/special-menu-switching_marketing.md');
  const specialMenuWebsite = read('__docs__/special-menu-switching/special-menu-switching_website.md');
  const specialMenuDoctrine = read('__docs__/constitution/14-feature-lifecycle-doctrine.md');
  const features = read('src/config/features.ts');
  const functionsFeatures = read('functions/src/constants/features.ts');

  assertIncludes(diagnostics, 'secureError', 'Projects page diagnostics secure logging');
  assertIncludes(diagnostics, 'getBoundedProjectPageStringContext', 'Projects page diagnostics bounded string context');
  assertIncludes(diagnostics, 'getProjectPageProjectLogContext', 'Projects page diagnostics bounded project context');
  assertIncludes(diagnostics, 'getProjectPageStoreLogContext', 'Projects page diagnostics bounded store context');
  assertIncludes(diagnostics, 'logProjectPageFailure', 'Projects page diagnostics normalized failure logger');
  assertIncludes(projectsPage, 'projects_page_project_save_failed', 'Projects page save diagnostics');
  assertIncludes(projectsPage, 'projects_page_modal_delete_failed', 'Projects page modal delete diagnostics');
  assertIncludes(projectsPage, 'projects_page_project_reset_failed', 'Projects page reset diagnostics');
  assertIncludes(projectsPage, 'projects_page_project_duplicate_failed', 'Projects page duplicate diagnostics');
  assertIncludes(projectsPage, 'projects_page_selector_delete_failed', 'Projects page selector delete diagnostics');
  assertIncludes(projectsPage, 'projects_page_projects_load_failed', 'Projects page list load diagnostics');
  assertIncludes(projectsPage, 'projects_page_project_load_failed', 'Projects page detail load diagnostics');
  assertIncludes(projectsPage, 'projects_page_public_content_translation_failed', 'Projects page public content translation diagnostics');
  assertIncludes(projectsPage, 'projects_page_upload_business_details_update_failed', 'Projects page upload business-details diagnostics');
  assertIncludes(projectsPage, 'projects_page_upload_business_details_store_update_rejected', 'Projects page upload business-details store rejected acknowledgement code');
  assertIncludes(projectsPage, 'projects_page_upload_new_menu_create_failed', 'Projects page upload new-menu diagnostics');
  assertIncludes(projectsPage, 'projects_page_menu_link_import_failed', 'Projects page menu-link import diagnostics');
  assertIncludes(projectsPage, 'assertStoreUpdateSucceeded(', 'Projects page business-attribute default store acknowledgement guard');
  assertIncludes(projectsPage, 'applyStoreBusinessAttributeDefaults({', 'Projects page transaction-current business-attribute default write');
  assertIncludes(projectsPage, 'businessAttributes: writeResult.businessAttributes', 'Projects page authoritative business-attribute acknowledgement projection');
  assertNotIncludes(projectsPage, 'updateStore({\n                id: storeDetails.storeId,\n                storeId: storeDetails.storeId,\n                tenantId: storeDetails.tenantId,\n                businessAttributes: nextBusinessAttributes', 'Projects page retired stale business-attribute map write');
  assertIncludes(storeDal, 'export const applyStoreBusinessAttributeDefaults = async', 'Store DAL business-attribute default boundary');
  assertIncludes(storeDal, 'const storeSnapshot = await transaction.get(storeRef);', 'Store DAL transaction-current business-attribute read');
  assertIncludes(storeDal, 'mergeMissingBusinessAttributeDefaults(', 'Store DAL current business-attribute default merge');
  assertIncludes(storeDal, "await revalidatePublicClientCache(storeId, 'applyStoreBusinessAttributeDefaults');", 'Store DAL business-attribute public cache invalidation');
  assertIncludes(businessAttributeDefaults, 'export function mergeMissingBusinessAttributeDefaults(', 'Shared business-attribute current-state merge');
  assertIncludes(businessAttributeDefaults, 'typeof current[key] === "boolean"', 'Shared business-attribute explicit owner-value preservation');
  assertIncludes(projectsPage, 'menu_upload_business_attributes_store_update_rejected', 'Projects page business-attribute default store rejected acknowledgement code');
  assertIncludes(projectsPage, 'assertProjectUpdateSucceeded(', 'Projects page extracted profile project-default acknowledgement guard');
  assertOccurrenceAtLeast(projectsPage, 'assertProjectDeleteSucceeded(', 2, 'Projects page project delete acknowledgement guard');
  assertIncludes(projectsPage, 'menu_upload_extracted_profile_defaults_project_update_rejected', 'Projects page extracted profile project-default rejected acknowledgement code');
  [
    'projects_page_project_metadata_update_rejected',
    'projects_page_project_language_update_rejected',
    'projects_page_project_active_update_rejected',
    'projects_page_create_project_update_rejected',
    'projects_page_duplicate_project_update_rejected',
    'projects_page_reset_project_update_rejected',
    'projects_page_modal_delete_rejected',
    'projects_page_selector_delete_rejected',
    'projects_page_public_content_translation_project_update_rejected',
  ].forEach((failureCode) => {
    assertIncludes(projectsPage, failureCode, 'Projects page rejected project acknowledgement code');
  });
  assertIncludes(projectsPage, 'syncPublicSummary: true,', 'Projects page atomic project/public-summary translation projection');
  assertNotIncludes(projectsPage, 'projects_page_public_content_translation_metadata_update_rejected', 'Projects page retired split translation metadata acknowledgement');
  assertIncludes(projectImageGeneration, 'assertProjectUpdateSucceeded(', 'Project image generation summary/metadata acknowledgement guard');
  assertIncludes(projectImageGeneration, 'project_image_generation_metadata_update_rejected', 'Project image generation metadata rejected acknowledgement code');
  assertIncludes(projectImageGeneration, 'const metadataResult = await updateProjectMetadata(', 'Project image generation transactional metadata-only write');
  assertIncludes(projectImageGeneration, 'expectedScope: params.expectedScope,', 'Project image generation exact owner-scope persistence request');
  assertIncludes(projectImageGeneration, 'preserveExistingProjectImage: true,', 'Project image generation current-owner-image preservation request');
  assertIncludes(projectImageGeneration, 'if (metadataResult.projectImage !== imageUrl) {', 'Project image generation authoritative acknowledgement comparison');
  assertIncludes(projectDal, 'preserveExistingProjectImageMetadata(data, freshCurrentSummary)', 'Project image generation transaction-current preservation');
  assertNotIncludes(projectImageGeneration, 'await updateProjectMetadata(projectId, { projectImage: imageUrl })', 'Project image generation retired unconditional metadata write');
  assertNotIncludes(projectImageGeneration, 'deleteFileByUrl(imageUrl)', 'Project image generation must not delete shared deterministic media after failed persistence');
  assertNotIncludes(projectImageGeneration, 'buildSummaryImageUpdate(', 'Project image stale full-summary reconstruction');
  assertIncludes(createSpecialMenuModal, 'projects_page_special_menu_name_translation_failed', 'Special menu translation diagnostics');
  assertIncludes(mobileSpecialMenuScreen, 'mobile_special_menu_name_translation_failed', 'Mobile special menu name translation diagnostics');
  assertIncludes(mobileSpecialMenuScreen, 'mobile_special_menu_project_public_content_translation_failed', 'Mobile special menu project translation diagnostics');
  assertIncludes(mobileSpecialMenuScreen, 'assertProjectUpdateSucceeded(', 'Mobile special menu project translation acknowledgement guard');
  assertIncludes(mobileSpecialMenuScreen, 'mobile_special_menu_public_content_translation_project_update_rejected', 'Mobile special menu project translation rejected acknowledgement code');
  assertIncludes(mobileSpecialMenuScreen, 'syncPublicSummary: true', 'Mobile special menu translation requests atomic project/summary persistence');
  assertNotIncludes(mobileSpecialMenuScreen, 'mobile_special_menu_public_content_translation_metadata_update_rejected', 'Mobile special menu translation retired split metadata acknowledgement path');
  assertIncludes(projectDal, 'if (options.syncPublicSummary) {', 'Project DAL optional atomic public-summary synchronization');
  assertIncludes(projectDal, 'transaction.set(operationSummaryRef, {', 'Project DAL public-summary synchronization shares the project transaction');
  assertIncludes(mobileSpecialMenuScreen, 'logMobileOwnerFailure', 'Mobile special menu bounded failure logger');
  assertIncludes(mobileSpecialMenuScreen, "getBoundedMobileOwnerStringContext('selectedLanguage'", 'Mobile special menu bounded language context');
  assertIncludes(mobileSpecialMenuScreen, 'managedLanguageCount', 'Mobile special menu bounded language count context');
  assertIncludes(specialMenuMobileSupportDoc, 'Create a special menu from an existing base menu', 'Special menu mobile create support doc');
  assertIncludes(specialMenuMobileSupportDoc, 'Edit public special-menu name, description, and schedule', 'Special menu mobile edit support doc');
  assertIncludes(specialMenuMobileSupportDoc, 'mobile_special_menu_project_public_content_translation_failed', 'Special menu mobile translation diagnostic doc');
  assertIncludes(specialMenuReadme, 'ENABLE_SPECIAL_MENU_SWITCHING: true', 'Special menu README active flag');
  assertIncludes(specialMenuValidation, 'ENABLE_SPECIAL_MENU_SWITCHING: true', 'Special menu validation active flag');
  assertIncludes(specialMenuHelpdoc, 'Active behind `ENABLE_SPECIAL_MENU_SWITCHING`', 'Special menu helpdoc active status');
  assertIncludes(specialMenuMarketing, 'Active behind `ENABLE_SPECIAL_MENU_SWITCHING`', 'Special menu marketing active status');
  assertIncludes(specialMenuWebsite, 'Active behind `ENABLE_SPECIAL_MENU_SWITCHING`', 'Special menu website active status');
  assertIncludes(specialMenuReadme, 'Public menu and OBP resolution use `activeSpecialMenuId`; configured screens use their screen data/version path', 'Special menu README surface boundary');
  assertIncludes(specialMenuSpec, 'exported PDFs/printed copies and POS/provider targets require separate export, replacement, or integration evidence', 'Special menu spec surface boundary');
  assertIncludes(specialMenuImpl, 'Exported PDFs and POS/provider targets require separate export, replacement, or integration evidence', 'Special menu implementation surface boundary');
  assertIncludes(specialMenuValidation, 'PDF/printed and POS/provider targets stay evidence-bound', 'Special menu validation surface boundary');
  assertIncludes(specialMenuHelpdoc, 'Downloaded or printed PDFs should be regenerated or replaced after changes', 'Special menu helpdoc surface boundary');
  assertIncludes(specialMenuMarketing, 'configured screens through supported refresh paths', 'Special menu marketing surface boundary');
  assertIncludes(specialMenuWebsite, 'configured screens through their supported refresh paths', 'Special menu website surface boundary');
  assertIncludes(specialMenuDoctrine, 'Active guarded runtime; expansion-frozen', 'Special menu lifecycle current status');
  assertIncludes(features, 'ENABLE_SPECIAL_MENU_SWITCHING: true', 'Special menu frontend flag enabled');
  assertIncludes(functionsFeatures, 'ENABLE_SPECIAL_MENU_SWITCHING: true', 'Special menu Functions flag enabled');
  assertIncludes(projectEditModal, 'projects_page_project_image_prepare_failed', 'Project edit modal image prepare diagnostics');
  assertIncludes(projectEditModal, 'projects_page_project_image_generation_failed', 'Project edit modal image generation diagnostics');
  assertIncludes(projectDuplicateModal, 'projects_page_duplicate_modal_submit_failed', 'Project duplicate modal submit diagnostics');
  assertIncludes(menuQualityDashboard, 'dashboard_menu_quality_signals_load_failed', 'Dashboard menu-quality signal load diagnostics');
  assertIncludes(menuQualityDashboard, 'dashboard_menu_quality_action_handoff_failed', 'Dashboard menu-quality action handoff diagnostics');
  assertIncludes(menuQualityDashboard, 'logProjectPageFailure', 'Dashboard menu-quality bounded project diagnostics');
  assertIncludes(menuQualityDashboard, "getBoundedProjectPageStringContext('signalId', signal.id)", 'Dashboard menu-quality bounded signal context');
  assertIncludes(menuQualityDashboard, "getBoundedProjectPageStringContext('actionRoute', signal.actionRoute)", 'Dashboard menu-quality bounded action route context');
  [
    'special_menu_create_failed',
    'special_menu_update_failed',
    'special_menu_activate_failed',
    'special_menu_deactivate_failed',
    'special_menu_cancel_failed',
  ].forEach((failureCode) => {
    assertIncludes(useSpecialMenus, failureCode, 'Special menu hook bounded diagnostics');
  });
  assertIncludes(useSpecialMenus, 'assertSpecialMenuCreateSucceeded(result);', 'Special menu hook create acknowledgement guard');
  assertIncludes(useSpecialMenus, 'assertSpecialMenuUpdateSucceeded(result, data.projectId);', 'Special menu hook update acknowledgement guard');
  assertIncludes(useSpecialMenus, 'result.projectId === expectedProjectId', 'Special menu lifecycle acknowledgement must match the requested project.');
  assertIncludes(useSpecialMenus, 'result.status === expectedStatus', 'Special menu lifecycle acknowledgement must include the expected status.');
  assertIncludes(useSpecialMenus, 'assertSpecialMenuLifecycleSucceeded(result, projectId, "active", "special_menu_activate_rejected");', 'Special menu hook activate acknowledgement guard');
  assertIncludes(useSpecialMenus, 'assertSpecialMenuLifecycleSucceeded(result, projectId, "expired", "special_menu_deactivate_rejected");', 'Special menu hook deactivate acknowledgement guard');
  assertIncludes(useSpecialMenus, 'assertSpecialMenuLifecycleSucceeded(result, projectId, "cancelled", "special_menu_cancel_rejected");', 'Special menu hook cancel acknowledgement guard');
  assertIncludes(useSpecialMenus, 'return getSpecialMenus(expectedScope);', 'Special menu SWR cache-key/read scope agreement');
  assertIncludes(useSpecialMenus, 'dalCreate(data, expectedScope)', 'Special menu create expected-scope handoff');
  assertIncludes(useSpecialMenus, 'dalUpdate(data, expectedScope)', 'Special menu update expected-scope handoff');
  assertIncludes(projectDal, 'assertExpectedSpecialMenuScope(scope, expectedScope);', 'Special menu DAL caller/session scope agreement');
  assertIncludes(mobileProjectsProvider, 'latestProjectsRequestRef.current', 'Mobile project latest-list settlement');
  assertIncludes(mobileProjectsProvider, 'inFlightProjectLoadsRef.current[requestKey] !== request', 'Mobile project latest-detail settlement');
  assertIncludes(mobileProjectsProvider, '? await getProjectsListWithoutLoader(true, expectedScope)', 'Mobile menu-management project list expected-scope read');
  assertIncludes(mobileProjectsProvider, ': await getExistingProjectsListWithoutLoader(true, expectedScope);', 'Mobile read-only project list expected-scope read');
  assertIncludes(mobileProjectsProvider, 'getProjectDataWithoutLoader(nextProjectId, expectedScope)', 'Mobile project detail expected-scope read');
  assertIncludes(mobileProjectsProvider, 'hydratedScopeKeyRef.current === `${currentScope.tId}:${currentScope.sId}`', 'Mobile project exact-scope output mask');
  assertIncludes(ownerProjectSelection, '`${OWNER_SELECTED_PROJECT_KEY}:${tenantScope}:${storeScope}`', 'Owner selected-project tenant/store browser-cache key');
  assertIncludes(mobileSpecialMenuScreen, 'return <MobileSpecialMenuScreenContent key={scopeKey} {...props} />;', 'Mobile special-menu exact-scope remount');
  assertIncludes(mobileSpecialMenuScreen, 'getProjectDataWithoutLoader(projectId, expectedScope)', 'Mobile special-menu exact-scope project read');
  assertIncludes(mobileSpecialMenuScreen, 'submitInFlightRef.current', 'Mobile special-menu synchronous submit admission');
  assertIncludes(mobileSpecialMenuScreen, 'translationInFlightRef.current', 'Mobile special-menu synchronous translation admission');
  assertIncludes(projectDal, 'return { success: true, projectId, status: "active" };', 'Special menu activate DAL must return project/status acknowledgement.');
  assertIncludes(projectDal, 'return { success: true, projectId, status: "expired" };', 'Special menu deactivate DAL must return project/status acknowledgement.');
  assertIncludes(projectDal, 'return { success: true, projectId, status: "cancelled" };', 'Special menu cancel DAL must return project/status acknowledgement.');
  assertIncludes(useSpecialMenus, 'logHookFailure', 'Special menu hook runtime diagnostics');
  assertNotIncludes(projectsPage, 'console.error(', 'Projects page direct error logging');
  assertNotIncludes(projectsPage, 'console.warn(', 'Projects page direct warn logging');
  assertNotIncludes(projectsPage, 'console.log(', 'Projects page direct log logging');
  assertNotIncludes(projectsPage, 'console.debug(', 'Projects page direct debug logging');
  assertNotIncludes(createSpecialMenuModal, 'console.error(', 'Special menu modal direct error logging');
  assertNotIncludes(createSpecialMenuModal, 'console.warn(', 'Special menu modal direct warn logging');
  assertNotIncludes(createSpecialMenuModal, 'console.log(', 'Special menu modal direct log logging');
  assertNotIncludes(createSpecialMenuModal, 'console.debug(', 'Special menu modal direct debug logging');
  assertNotIncludes(projectEditModal, 'console.error(', 'Project edit modal direct error logging');
  assertNotIncludes(projectEditModal, 'console.warn(', 'Project edit modal direct warn logging');
  assertNotIncludes(projectEditModal, 'console.log(', 'Project edit modal direct log logging');
  assertNotIncludes(projectEditModal, 'console.debug(', 'Project edit modal direct debug logging');
  assertNotIncludes(projectDuplicateModal, 'console.error(', 'Project duplicate modal direct error logging');
  assertNotIncludes(projectDuplicateModal, 'console.warn(', 'Project duplicate modal direct warn logging');
  assertNotIncludes(projectDuplicateModal, 'console.log(', 'Project duplicate modal direct log logging');
  assertNotIncludes(projectDuplicateModal, 'console.debug(', 'Project duplicate modal direct debug logging');
  assertNotIncludes(menuQualityDashboard, '// Silent fail — quality signals are non-critical', 'Dashboard menu-quality silent load catch');
  assertNotIncludes(projectsPage, 'Error handling project:', 'Projects page raw save diagnostic');
  assertNotIncludes(projectsPage, 'Error deleting project:', 'Projects page raw delete diagnostic');
  assertNotIncludes(projectsPage, 'Error resetting project:', 'Projects page raw reset diagnostic');
  assertNotIncludes(projectsPage, 'Error duplicating project:', 'Projects page raw duplicate diagnostic');
  assertNotIncludes(projectsPage, '[ProjectsPage] Projects error:', 'Projects page raw list-load diagnostic');
  assertNotIncludes(projectsPage, '[ProjectsPage] Project error:', 'Projects page raw detail-load diagnostic');
  assertNotIncludes(projectsPage, 'message.error(error?.message', 'Projects page raw exception-message toast');
  assertNotIncludes(createSpecialMenuModal, 'result.error ||', 'Special menu modal raw hook error toast');
  assertNotIncludes(createSpecialMenuModal, 'error?.message', 'Special menu modal raw exception-message toast');
  assertNotIncludes(specialMenuCard, 'content: result.error', 'Special menu card raw hook error modal');
  assertNotIncludes(useSpecialMenus, 'error: e.message', 'Special menu hook raw exception message return');
  assertNotIncludes(specialMenuMobileSupportDoc, 'Create new special menu (requires full editor', 'Special menu mobile doc stale create-disabled claim');
  assertNotIncludes(specialMenuMobileSupportDoc, 'Edit special menu content (requires full editor', 'Special menu mobile doc stale edit-disabled claim');
  assertNotIncludes(specialMenuReadme, 'Feature Flag OFF', 'Special menu README stale flag-off wording');
  assertNotIncludes(specialMenuValidation, 'ENABLE_SPECIAL_MENU_SWITCHING: false', 'Special menu validation stale flag-off wording');
  [
    specialMenuReadme,
    specialMenuSpec,
    specialMenuImpl,
    specialMenuValidation,
    specialMenuHelpdoc,
    specialMenuMarketing,
    specialMenuWebsite,
  ].forEach((content) => {
    [
      'All surfaces (menu, OBP, screens, PDF, POS) automatically get resolved menu',
      'Works on digital menu, OBP, screens, PDF — all surfaces automatically',
      'All surfaces auto-update',
      'Digital menu, OBP, screens, PDF — all get resolved menu automatically',
      'Works on your public page, QR code, screens — everywhere',
      'all surfaces update',
      'All surfaces update',
      'updates ALL surfaces',
      'MenuList updates ALL surfaces',
      'everything shows the right menu',
      'One change, everywhere updated',
      'shows on all your surfaces',
      'Every surface that shows your menu automatically shows the right one',
      'Everything updates automatically',
      'Customers always see the right menu',
      'QR code always points to the current active menu',
      'Auto-display active menu',
    ].forEach((staleToken) => {
      assertNotIncludes(content, staleToken, 'Special menu active docs stale all-surface/PDF/POS claim');
    });
  });
  [specialMenuHelpdoc, specialMenuMarketing, specialMenuWebsite].forEach((content) => {
    assertNotIncludes(content, 'Flag OFF', 'Special menu active docs stale flag-off wording');
  });
  assertNotIncludes(mobileSpecialMenuScreen, 'result.error ||', 'Mobile special menu raw hook error toast');
  assertNotIncludes(mobileSpecialMenuScreen, 'catch {', 'Mobile special menu silent catch');
  assertNotIncludes(projectEditModal, 'Failed to prepare project image:', 'Project edit modal raw image prepare diagnostic');
  assertNotIncludes(projectDuplicateModal, 'Duplicate failed:', 'Project duplicate modal raw submit diagnostic');
}

function verifyProjectViewDiagnosticsAreBounded() {
  const b2bView = read('src/components/templates/main-app/projects/b2bView.tsx');
  const imageGalleryDrawer = read('src/components/templates/main-app/projects/b2cView/menuPage/imageGalleryDrawer.tsx');
  const gradientUtils = read('src/components/templates/main-app/projects/b2cView/menuPage/gradientUtils.ts');
  const backgroundSettings = read('src/components/templates/main-app/projects/b2cView/menuPage/backgroundSettings.tsx');

  assertIncludes(b2bView, 'projects_page_b2b_json_edit_failed', 'B2B JSON edit diagnostics');
  assertNotIncludes(b2bView, 'console.error(', 'B2B view direct error logging');
  assertNotIncludes(b2bView, 'console.warn(', 'B2B view direct warn logging');
  assertNotIncludes(b2bView, 'console.log(', 'B2B view direct log logging');
  assertNotIncludes(b2bView, 'console.debug(', 'B2B view direct debug logging');
  assertNotIncludes(imageGalleryDrawer, 'console.error(', 'Image gallery drawer direct error logging');
  assertNotIncludes(imageGalleryDrawer, 'console.warn(', 'Image gallery drawer direct warn logging');
  assertNotIncludes(imageGalleryDrawer, 'console.log(', 'Image gallery drawer direct log logging');
  assertNotIncludes(imageGalleryDrawer, 'console.debug(', 'Image gallery drawer direct debug logging');
  assertIncludes(imageGalleryDrawer, "logRuntimeFailure('project_image_gallery_load_failed'", 'Image gallery load failure diagnostic');
  assertIncludes(imageGalleryDrawer, 'if (!cancelled && Array.isArray(res))', 'Image gallery stale async settlement guard');
  assertIncludes(imageGalleryDrawer, 'setAssetsList((current) => ({', 'Image gallery functional shared-cache update');
  assertNotIncludes(gradientUtils, 'console.error(', 'Gradient utils direct error logging');
  assertNotIncludes(gradientUtils, 'console.warn(', 'Gradient utils direct warn logging');
  assertNotIncludes(gradientUtils, 'console.log(', 'Gradient utils direct log logging');
  assertNotIncludes(gradientUtils, 'console.debug(', 'Gradient utils direct debug logging');
  assertIncludes(gradientUtils, "logRuntimeFailure('public_menu_gradient_parse_failed'", 'Gradient utils parse diagnostics');
  assertIncludes(gradientUtils, 'MAX_GRADIENT_PARSE_DIAGNOSTICS', 'Gradient utils parse diagnostic cap');
  assertIncludes(gradientUtils, 'reportedGradientParseFailures.add(failureKey)', 'Gradient utils capped parse shape guard');
  assertIncludes(gradientUtils, "fallbackPolicy: 'use_existing_gradient_fallback'", 'Gradient utils parse fallback policy');
  assertIncludes(gradientUtils, 'gradientStringLength: value.length', 'Gradient utils bounded string length metadata');
  assertIncludes(gradientUtils, 'approximateStopCount: getApproximateGradientStopCount(value)', 'Gradient utils bounded stop-count metadata');
  assertNotIncludes(backgroundSettings, 'console.error(', 'Background settings direct error logging');
  assertNotIncludes(backgroundSettings, 'console.warn(', 'Background settings direct warn logging');
  assertNotIncludes(backgroundSettings, 'console.log(', 'Background settings direct log logging');
  assertNotIncludes(backgroundSettings, 'console.debug(', 'Background settings direct debug logging');
  assertNotIncludes(b2bView, 'Invalid JSON edit:', 'B2B view raw JSON edit diagnostic');
  assertNotIncludes(b2bView, 'Reset changes cancelled', 'B2B view raw reset cancel diagnostic');
  assertNotIncludes(imageGalleryDrawer, 'console.log("images"', 'Image gallery raw assets diagnostic');
  assertNotIncludes(gradientUtils, 'Error parsing gradient:', 'Gradient utils raw parse diagnostic');
  assertNotIncludes(backgroundSettings, 'Color preset selected:', 'Background settings raw color preset diagnostic');
}

function verifyMultiOutletDiagnosticsAreBounded() {
  const diagnostics = read('src/lib/multiOutlet/diagnostics.ts');
  const outletActionGuards = read('src/lib/multiOutlet/outletActionResponseGuards.ts');
  const awarenessHook = read('src/hooks/useMasterUpdateAwareness.ts');
  const multiOutletDal = read('src/database/multiOutlet/index.ts');
  const resolver = read('src/lib/multiOutlet/resolveProject.ts');
  const molEvents = read('src/lib/multiOutlet/molEvents.ts');
  const propagation = read('src/database/multiOutlet/propagation.ts');
  const brandPropagation = read('src/database/multiOutlet/brandPropagation.ts');
  const brandPropagationRoute = read('src/app/api/outlets/brand-propagation/route.ts');
  const brandPropagationBoundary = read('src/lib/multiOutlet/brandPropagationBoundary.ts');
  const projectsDal = read('src/database/projects/index.ts');
  const linkedOutletResponseHelper = read('src/lib/multiOutlet/linkedOutletSaveResponse.ts');
  const mobileMenu = read('src/components/mobile/screens/MobileMenuScreen.tsx');
  const mobileLocations = read('src/components/mobile/screens/MobileLocationsScreen.tsx');
  const desktopLocations = read('src/app/(main)/locations/page.tsx');
  const addOutletModal = read('src/components/organisms/AddOutletModal/index.tsx');
  const outletRenameModal = read('src/components/organisms/OutletRenameModal/index.tsx');
  const outletPolicyEditor = read('src/components/organisms/OutletPolicyEditor/index.tsx');
  const linkedOutletSaveRoute = read('src/app/api/projects/outlet-save/route.ts');
  const outletPolicyRoute = read('src/app/api/outlets/policy/route.ts');
  const outletRenameRoute = read('src/app/api/outlets/rename/route.ts');
  const publicMenuPage = read('src/app/client/[[...slug]]/page.tsx');

  assertIncludes(diagnostics, 'secureError', 'Multi-outlet diagnostics secure logging');
  assertIncludes(diagnostics, 'getBoundedMultiOutletStringContext', 'Multi-outlet diagnostics bounded string context');
  assertIncludes(diagnostics, 'getMultiOutletProjectLogContext', 'Multi-outlet diagnostics bounded project context');
  assertIncludes(diagnostics, 'logMultiOutletFailure', 'Multi-outlet diagnostics normalized failure logger');
  assertIncludes(outletActionGuards, 'MULTI_OUTLET_ACTION_REQUEST_POLICY', 'Multi-outlet action request policy');
  assertIncludes(outletActionGuards, "cache: 'no-store'", 'Multi-outlet action request policy must bypass browser cache');
  assertIncludes(outletActionGuards, "credentials: 'same-origin'", 'Multi-outlet action request policy must keep credentials same-origin');
  assertIncludes(outletActionGuards, "redirect: 'manual'", 'Multi-outlet action request policy must not follow redirects to HTML');
  assertIncludes(outletActionGuards, 'MULTI_OUTLET_ACTION_RESPONSE_JSON_MAX_BYTES = 16 * 1024', 'Multi-outlet action response byte cap');
  assertIncludes(outletActionGuards, 'OUTLET_LOCATION_PAYMENT_REQUIRED_CODE', 'Multi-outlet payment-required code guard');
  assertIncludes(outletActionGuards, 'isOutletPaymentRequiredResponse', 'Multi-outlet payment-required response guard');
  assertIncludes(outletActionGuards, 'isOutletCreateResponse', 'Multi-outlet create response guard');
  assertIncludes(outletActionGuards, 'isOutletRenameResponse', 'Multi-outlet rename response guard');
  assertIncludes(outletActionGuards, 'isOutletDeactivateResponse', 'Multi-outlet deactivate response guard');
  assertIncludes(outletActionGuards, 'createMultiOutletStatusError', 'Multi-outlet browser status error helper');
  assertIncludes(awarenessHook, 'master_update_awareness_check_failed', 'Master update awareness check diagnostics');
  assertIncludes(awarenessHook, 'master_update_awareness_acknowledge_failed', 'Master update awareness acknowledge diagnostics');
  assertIncludes(awarenessHook, 'master_update_awareness_listener_failed', 'Master update awareness listener diagnostics');
  assertIncludes(multiOutletDal, 'master_update_awareness_initial_snapshot_failed', 'Master update awareness initial snapshot diagnostics');
  assertIncludes(multiOutletDal, 'master_update_awareness_switch_snapshot_failed', 'Master update awareness switch snapshot diagnostics');
  assertIncludes(multiOutletDal, 'multi_outlet_outlet_policy_response_parse_failed', 'Multi-outlet policy response parse diagnostics');
  assertIncludes(multiOutletDal, 'MULTI_OUTLET_ACTION_REQUEST_POLICY', 'Multi-outlet policy save request policy');
  assertIncludes(multiOutletDal, 'readJsonResponseWithLimit<unknown>', 'Multi-outlet policy bounded response parser');
  assertIncludes(multiOutletDal, 'OUTLET_POLICY_RESPONSE_JSON_MAX_BYTES = 16 * 1024', 'Multi-outlet policy response byte cap');
  assertIncludes(multiOutletDal, 'multi_outlet_outlet_policy_response_invalid', 'Multi-outlet policy invalid response diagnostics');
  assertIncludes(multiOutletDal, 'isOutletPolicyResponse(data)', 'Multi-outlet policy response shape guard');
  assertIncludes(multiOutletDal, 'Object.keys(DEFAULT_OUTLET_POLICY).every', 'Multi-outlet policy full-policy shape guard');
  assertIncludes(multiOutletDal, 'outlet_policy_response_parse_failed', 'Multi-outlet policy fixed parse failure code');
  assertIncludes(multiOutletDal, 'outlet_policy_response_invalid', 'Multi-outlet policy fixed invalid response code');
  assertIncludes(resolver, 'multi_outlet_master_project_missing', 'Multi-outlet missing master diagnostics');
  assertIncludes(molEvents, 'multi_outlet_mol_event_log_failed', 'Multi-outlet MOL event log diagnostics');
  assertIncludes(molEvents, 'multi_outlet_mol_event_prepare_failed', 'Multi-outlet MOL event prepare diagnostics');
  assertIncludes(propagation, 'multi_outlet_project_propagation_failed', 'Multi-outlet project propagation diagnostics');
  assertIncludes(propagation, 'const plan = normalizeProjectPropagationPlan(', 'Project propagation must derive targets from a fail-closed master-store plan');
  assertIncludes(propagation, 'sourceStoreSnap.exists() ? sourceStoreSnap.data() : null', 'Project propagation must use canonical master-store authority');
  assertIncludes(propagation, 'masterProject.projectType === "localOnly"', 'Project propagation must reject master-local-only projects');
  assertIncludes(propagation, 'masterProject.projectId !== masterProjectId', 'Project propagation must require exact source project identity');
  assertIncludes(propagation, 'multi_outlet_project_propagation_source_project_invalid', 'Project propagation must observe rejected source project authority');
  assertIncludes(propagation, 'outletProjectId = await runTransaction(firebaseClient', 'Each propagated outlet project and summary must share one transaction');
  assertIncludes(propagation, 'transaction.get(summaryRef)', 'Project propagation must read existing summary links before choosing retry identity');
  assertIncludes(propagation, 'project_propagation_target_scope_changed', 'Project propagation must revalidate each target store transactionally');
  assertIncludes(propagation, 'existingProject.masterProjectId !== masterProjectId', 'Project propagation must reject an existing project identity conflict');
  assertIncludes(propagation, 'transaction.set(outletProjectRef', 'Project propagation transaction must create the outlet project');
  assertIncludes(propagation, 'transaction.set(summaryRef', 'Project propagation transaction must write the coupled summary');
  assertNotIncludes(propagation, 'Date.now().toString(36)', 'Project propagation must not generate a new identity on retry');
  assertNotIncludes(propagation, 'await setDoc(outletProjectRef', 'Project propagation must not commit the project before its summary');
  assertIncludes(brandPropagation, 'multi_outlet_brand_propagation_failed', 'Multi-outlet brand propagation fatal diagnostics');
  assertIncludes(brandPropagationRoute, 'multi_outlet_brand_propagation_failed', 'Multi-outlet brand propagation server diagnostics');
  assertIncludes(brandPropagationBoundary, 'hasDigitalScreenBrandPropagationFields', 'Multi-outlet screen-output change guard');
  assertIncludes(brandPropagationRoute, 'storeIds: [masterStoreScope.documentId, ...propagationResult.targetOutletIds]', 'Multi-outlet propagated screen refresh uses committed target outlets');
  assertNotIncludes(brandPropagationRoute, 'includeScreenDataTag', 'Multi-outlet propagated screen refresh avoids global screen invalidation');
  assertIncludes(brandPropagationRoute, "touchDigitalScreenContentVersionForStoreServer(storeId, 'brandPropagation')", 'Multi-outlet propagated screen refresh');
  assertIncludes(mobileMenu, 'mobile_menu_linked_outlet_resolve_failed', 'Mobile linked outlet resolve diagnostics');
  [
    'mobile_location_deactivate_failed',
    'mobile_location_rename_failed',
    'mobile_location_create_failed',
    'mobile_location_policy_update_failed',
  ].forEach((failureCode) => {
    assertIncludes(mobileLocations, failureCode, 'Mobile locations multi-outlet diagnostics');
  });
  assertIncludes(mobileLocations, 'logMultiOutletFailure', 'Mobile locations bounded multi-outlet diagnostics');
  assertIncludes(mobileLocations, 'MULTI_OUTLET_ACTION_REQUEST_POLICY', 'Mobile locations outlet action request policy');
  assert((mobileLocations.match(/MULTI_OUTLET_ACTION_REQUEST_POLICY/g) || []).length >= 4, 'Mobile locations must apply request policy to create, rename, and deactivate outlet calls');
  assertIncludes(mobileLocations, 'getBoundedMultiOutletStringContext', 'Mobile locations bounded multi-outlet context');
  assertIncludes(mobileLocations, 'readMobileOutletActionResponse', 'Mobile locations bounded outlet action parser');
  assertIncludes(mobileLocations, 'readJsonResponseWithLimit<unknown>', 'Mobile locations bounded JSON response parser');
  assertIncludes(mobileLocations, 'mobile_location_outlet_action_response_parse_failed', 'Mobile locations outlet action parse diagnostics');
  assertIncludes(mobileLocations, 'mobile_location_create_response_invalid', 'Mobile locations create invalid response diagnostics');
  assertIncludes(mobileLocations, 'mobile_location_rename_response_invalid', 'Mobile locations rename invalid response diagnostics');
  assertIncludes(mobileLocations, 'mobile_location_deactivate_response_invalid', 'Mobile locations deactivate invalid response diagnostics');
  assertIncludes(mobileLocations, 'isOutletPaymentRequiredResponse(data)', 'Mobile locations payment-required response guard');
  assertIncludes(mobileLocations, 'isOutletCreateResponse(data)', 'Mobile locations create response guard');
  assertIncludes(mobileLocations, 'isOutletRenameResponse(data, submittedTarget.storeId, submittedSlug)', 'Mobile locations rename response identity guard');
  assertIncludes(mobileLocations, 'isOutletDeactivateResponse(data, outletStoreId)', 'Mobile locations deactivate response identity guard');
  [
    'desktop_location_store_switch_failed',
    'desktop_location_deactivate_failed',
  ].forEach((failureCode) => {
    assertIncludes(desktopLocations, failureCode, 'Desktop locations multi-outlet diagnostics');
  });
  assertIncludes(addOutletModal, 'desktop_location_create_failed', 'Desktop add outlet diagnostics');
  assertIncludes(addOutletModal, 'MULTI_OUTLET_ACTION_REQUEST_POLICY', 'Desktop add outlet request policy');
  assertIncludes(addOutletModal, 'readDesktopAddOutletResponse', 'Desktop add outlet bounded response parser');
  assertIncludes(addOutletModal, 'desktop_location_outlet_action_response_parse_failed', 'Desktop add outlet response parse diagnostics');
  assertIncludes(addOutletModal, 'desktop_location_create_response_invalid', 'Desktop add outlet invalid response diagnostics');
  assertIncludes(addOutletModal, 'isOutletPaymentRequiredResponse(data)', 'Desktop add outlet payment-required response guard');
  assertIncludes(addOutletModal, 'isOutletCreateResponse(data)', 'Desktop add outlet create response guard');
  assertIncludes(outletRenameModal, 'desktop_location_rename_failed', 'Desktop outlet rename diagnostics');
  assertIncludes(outletRenameModal, 'MULTI_OUTLET_ACTION_REQUEST_POLICY', 'Desktop outlet rename request policy');
  assertIncludes(outletRenameModal, 'readDesktopOutletRenameResponse', 'Desktop outlet rename bounded response parser');
  assertIncludes(outletRenameModal, 'desktop_location_outlet_action_response_parse_failed', 'Desktop outlet rename response parse diagnostics');
  assertIncludes(outletRenameModal, 'desktop_location_rename_response_invalid', 'Desktop outlet rename invalid response diagnostics');
  assertIncludes(outletRenameModal, 'isOutletRenameResponse(body, outletStoreId, proposedSlug)', 'Desktop outlet rename response identity guard');
  assertIncludes(outletPolicyEditor, 'desktop_outlet_policy_update_failed', 'Desktop outlet policy diagnostics');
  assertIncludes(desktopLocations, 'MULTI_OUTLET_ACTION_REQUEST_POLICY', 'Desktop locations outlet deactivate request policy');
  assertIncludes(linkedOutletSaveRoute, 'linked_outlet_save_validation_failed', 'Linked outlet save validation diagnostics');
  assertIncludes(linkedOutletSaveRoute, 'linked_outlet_save_route_failed', 'Linked outlet save route diagnostics');
  assertIncludes(linkedOutletSaveRoute, 'getMultiOutletProjectLogContext(body?.project?.projectId, body?.project?.masterProjectId)', 'Linked outlet save bounded project context');
  assertIncludes(linkedOutletSaveRoute, 'active: z.boolean().optional()', 'Linked outlet save active project field type guard');
  assertIncludes(linkedOutletSaveRoute, 'buildSummaryProjectFieldPayload(effectiveStandardProject.projectId, "active", effectiveStandardProject.active)', 'Linked outlet save transaction-current effective active summary projection');
  assertNotIncludes(linkedOutletSaveRoute, 'buildSummaryProjectFieldPayload(standardProject.projectId, "active", standardProject.active)', 'Linked outlet save retired pre-preservation active summary projection');
  assertIncludes(linkedOutletSaveRoute, 'savedProject = await db.runTransaction(async (transaction) => {', 'Linked outlet save project and summary transaction');
  assertIncludes(linkedOutletSaveRoute, 'transaction.set(latestOutletSnap.ref, safeProject, { merge: true });', 'Linked outlet save transaction project write');
  assertIncludes(publicMenuPage, 'if (projectData.active === false || projectData.deleted === true) return null;', 'Public menu route must fail closed on stale active/deleted project docs');
  assertIncludes(linkedOutletResponseHelper, 'readJsonResponseWithLimit<unknown>', 'Linked outlet project save bounded response parser');
  assertIncludes(linkedOutletResponseHelper, 'LINKED_OUTLET_SAVE_RESPONSE_JSON_MAX_BYTES = 2 * 1024 * 1024', 'Linked outlet project save response byte cap');
  assertIncludes(linkedOutletResponseHelper, 'LINKED_OUTLET_SAVE_REQUEST_POLICY', 'Linked outlet project save request policy');
  assertIncludes(linkedOutletResponseHelper, "cache: 'no-store'", 'Linked outlet project save request cache policy');
  assertIncludes(linkedOutletResponseHelper, "credentials: 'same-origin'", 'Linked outlet project save request credentials policy');
  assertIncludes(linkedOutletResponseHelper, "redirect: 'manual'", 'Linked outlet project save request redirect policy');
  assertIncludes(projectsDal, '@lib/multiOutlet/linkedOutletSaveResponse', 'Linked outlet project save shared response parser import');
  assertIncludes(projectsDal, 'readLinkedOutletSaveResponseJson(response)', 'Linked outlet project save shared bounded response parser call');
  assertIncludes(projectsDal, '...LINKED_OUTLET_SAVE_REQUEST_POLICY', 'Linked outlet project save/publish shared request policy');
  assertIncludes(projectsDal, 'project_linked_outlet_response_parse_failed', 'Linked outlet project save response parse diagnostics');
  assertIncludes(projectsDal, 'project_linked_outlet_save_response_invalid', 'Linked outlet project save invalid response diagnostics');
  assertIncludes(projectsDal, 'project_linked_outlet_publish_response_invalid', 'Linked outlet project publish invalid response diagnostics');
  assertIncludes(projectsDal, 'isLinkedOutletSaveResponse(result, data.projectId, storedMasterProjectId)', 'Linked outlet project save shape guard');
  assertIncludes(projectsDal, 'linked_outlet_save_response_parse_failed', 'Linked outlet save fixed parse failure code');
  assertIncludes(projectsDal, 'linked_outlet_publish_response_parse_failed', 'Linked outlet publish fixed parse failure code');
  assertIncludes(projectsDal, 'const updateData = result.project;', 'Linked outlet save must use guarded returned project');
  assertIncludes(projectsDal, 'return result.project;', 'Linked outlet publish must use guarded returned project');
  assertIncludes(outletPolicyRoute, 'outlet_policy_update_route_failed', 'Outlet policy route diagnostics');
  assertIncludes(outletRenameRoute, 'outlet_rename_route_failed', 'Outlet rename route diagnostics');
  assertIncludes(outletRenameRoute, "getBoundedMultiOutletStringContext('outletStoreId', outletStoreIdStr)", 'Outlet rename bounded outlet context');
  assertNotIncludes(awarenessHook, 'console.error(', 'Master update awareness direct error logging');
  assertNotIncludes(multiOutletDal, 'console.warn(', 'Multi-outlet DAL direct warn logging');
  assertNotIncludes(multiOutletDal, 'Silent fail', 'Multi-outlet DAL stale silent-failure comments');
  assertNotIncludes(multiOutletDal, 'data = await res.json()', 'Multi-outlet policy unbounded response parser');
  assertNotIncludes(multiOutletDal, 'res.json().catch(() => ({}))', 'Multi-outlet policy silent JSON fallback');
  assertNotIncludes(multiOutletDal, 'data.error ||', 'Multi-outlet DAL raw API response text');
  assertNotIncludes(multiOutletDal, 'throw new Error(data.error', 'Multi-outlet DAL raw API response throw');
  assertNotIncludes(resolver, 'console.warn(', 'Multi-outlet resolver direct warn logging');
  assertNotIncludes(molEvents, 'err.message', 'Multi-outlet MOL event raw error text');
  assertNotIncludes(molEvents, '{ error }', 'Multi-outlet MOL event raw error object');
  assertNotIncludes(propagation, 'Failed for outlet ${outlet.storeId}', 'Multi-outlet propagation raw outlet diagnostic');
  assertNotIncludes(brandPropagation, 'Failed for outlet ${outlet.storeId}', 'Multi-outlet brand propagation raw outlet diagnostic');
  assertNotIncludes(mobileMenu, "[MobileMenu] Failed to resolve linked outlet project:", 'Mobile linked outlet raw diagnostic');
  assertNotIncludes(mobileLocations, 'data.error ||', 'Mobile locations raw API response text');
  assertNotIncludes(mobileLocations, 'data?.error', 'Mobile locations raw API response text');
  assertNotIncludes(mobileLocations, 'error?.message', 'Mobile locations raw exception text');
  assertNotIncludes(mobileLocations, 'res.json().catch(() => ({}))', 'Mobile locations silent JSON fallback');
  assertNotIncludes(mobileLocations, 'const data = await res.json()', 'Mobile locations unbounded JSON parser');
  assertNotIncludes(linkedOutletSaveRoute, 'secureError("[Projects] Linked outlet save validation failed"', 'Linked outlet save raw validation diagnostics');
  assertNotIncludes(linkedOutletSaveRoute, 'secureError("[Projects] Linked outlet save failed"', 'Linked outlet save raw route diagnostics');
  assertNotIncludes(linkedOutletSaveRoute, 'new Error(validation.error)', 'Linked outlet save raw validation text logging');
  assertNotIncludes(projectsDal, 'response.json().catch(() => ({}))', 'Linked outlet project save silent JSON fallback');
  assertNotIncludes(projectsDal, 'const result = await response.json()', 'Linked outlet project save unbounded JSON parser');
  assertNotIncludes(projectsDal, 'result.project || data', 'Linked outlet save must not silently fall back to request data');
  assertNotIncludes(projectsDal, 'result.project || updatedData', 'Linked outlet publish must not silently fall back to request data');
  assertNotIncludes(outletPolicyRoute, 'secureError("[Outlets] Policy update failed"', 'Outlet policy raw route diagnostics');
  assertNotIncludes(outletRenameRoute, "secureError('[Outlets] Rename failed'", 'Outlet rename raw route diagnostics');
  [
    [desktopLocations, 'Desktop locations page'],
    [addOutletModal, 'Desktop add outlet modal'],
    [outletRenameModal, 'Desktop outlet rename modal'],
    [outletPolicyEditor, 'Desktop outlet policy editor'],
  ].forEach(([content, label]) => {
    assertIncludes(content, 'logMultiOutletFailure', `${label} bounded multi-outlet diagnostics`);
    assertIncludes(content, 'getBoundedMultiOutletStringContext', `${label} bounded multi-outlet context`);
    assertNotIncludes(content, 'data.error ||', `${label} raw API response text`);
    assertNotIncludes(content, 'body?.error', `${label} raw API response text`);
    assertNotIncludes(content, 'err?.message', `${label} raw exception text`);
    assertNotIncludes(content, 'error?.message', `${label} raw exception text`);
    assertNotIncludes(content, 'res.json().catch(() => ({}))', `${label} silent JSON fallback`);
    assertNotIncludes(content, 'const data = await res.json()', `${label} unbounded JSON parser`);
    assertNotIncludes(content, 'const body = await res.json()', `${label} unbounded JSON parser`);
  });
}

function verifyStoreAndUserDalDiagnosticsAreBounded() {
  const storeType = read('src/types/platform/store.ts');
  const storesDal = read('src/database/stores/index.tsx');
  const storeNestedUpdateProjection = read('src/lib/store/storeNestedUpdateProjection.ts');
  const tenantsDal = read('src/database/tenants/index.tsx');
  const usersDal = read('src/database/users/index.ts');
  const diagnostics = read('src/database/stores/storeDiagnostics.ts');
  const desktopBusinessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
  const mobileAdvancedSettings = read('src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx');
  const mobileBasicSettings = read('src/components/mobile/screens/MobileBasicSettingsScreen.tsx');
  const mobileAntd = read('src/components/mobile/antd.tsx');
  const desktopBasicInfo = read('src/components/templates/main-app/businessSettings/tabs/BasicInfoTab.tsx');
  const phoneNumberInput = read('src/components/atoms/phoneNumberInput/index.tsx');
  const mobileBusinessAttributes = read('src/components/mobile/screens/MobileBusinessAttributesScreen.tsx');
  const desktopBusinessAttributes = read('src/components/templates/main-app/businessSettings/tabs/BusinessAttributesTab.tsx');
  const iconPicker = read('src/components/atoms/IconPicker/index.tsx');
  const mobileBusinessCopySetup = read('src/components/mobile/screens/MobileBusinessCopySetupScreen.tsx');
  const mobileCustomerApp = read('src/components/mobile/screens/MobileCustomerAppScreen.tsx');
  const mobileLocaleSettings = read('src/components/mobile/screens/MobileLocaleSettingsScreen.tsx');
  const mobileOfficialPage = read('src/components/mobile/screens/MobileOfficialPageScreen.tsx');
  const mobileSeoAnalytics = read('src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx');
  const mobileDomainSettings = read('src/components/mobile/screens/MobileDomainSettingsScreen.tsx');
  const mobilePosSync = read('src/components/mobile/screens/MobilePosSyncScreen.tsx');
  const mobileWorkingHours = read('src/components/mobile/screens/MobileWorkingHoursEditScreen.tsx');
  const mobileMore = read('src/components/mobile/screens/MobileMoreScreen.tsx');
  const extractionApply = read('src/lib/extraction/applyChanges.ts');
  const businessAttributes = read('src/lib/obp/businessAttributes.ts');
  const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const domainRoute = read('src/app/api/domain/route.ts');
  const desktopDomainSettings = read('src/components/templates/main-app/businessSettings/tabs/DomainSettingsTab.tsx');
  const desktopPosSync = read('src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx');
  const desktopCustomerApp = read('src/components/templates/main-app/businessSettings/tabs/CustomerAppTab.tsx');
  const desktopBusinessCopySetup = read('src/components/templates/main-app/businessSettings/tabs/BusinessCopySetupTab.tsx');
  const dashboardGoogleListing = read('src/components/templates/main-app/dashboard/OwnerDashboard/GoogleListingCard.tsx');
  const projectsB2c = read('src/components/templates/main-app/projects/b2cView/index.tsx');
  const desktopCustomDomain = read('src/components/templates/main-app/businessSettings/tabs/CustomDomainTab.tsx');
  const updateStoreBlock = storesDal.slice(storesDal.indexOf('export const updateStore'));
  const updateStoreSummaryIndex = updateStoreBlock.indexOf('transaction.set(summaryRef, {');
  const updateStoreCacheIndex = updateStoreBlock.indexOf('await revalidatePublicClientCache(data.storeId, "updateStore", {');

  assertIncludes(storeType, 'phone?: string;', 'Store type normalized legacy phone compatibility field');
  assertIncludes(storeType, 'address?: string;', 'Store type legacy address-line compatibility field');
  assertIncludes(storeType, 'pincode?: string;', 'Store type legacy postal-code compatibility field');
  assertIncludes(diagnostics, 'secureError', 'Store data diagnostics secure logging');
  assertIncludes(diagnostics, 'getBoundedStoreStringContext', 'Store data diagnostics bounded string context');
  assertIncludes(diagnostics, 'logStoreDataFailure', 'Store data diagnostics normalized failure logger');
  assertIncludes(storesDal, 'store_subdomain_publish_status_check_failed', 'Store subdomain publish-status check diagnostics');
  assertIncludes(storesDal, 'store_subdomain_change_blocked_after_publish', 'Store subdomain block diagnostics');
  assertNotIncludes(storesDal, 'store_subdomain_block_analytics_signal_failed', 'Store subdomain block dead browser-analytics diagnostics');
  assertIncludes(storesDal, "throw new Error('store_summary_scope_invalid');", 'Store summary invalid scope fails closed');
  assertIncludes(storesDal, 'export function assertStoreUpdateSucceeded', 'Store update acknowledgement guard');
  assertIncludes(storesDal, 'projectStoreNestedUpdateEntries(\n                        transactionLogicalUpdate,', 'Store transaction changed-leaf Firestore projection');
  assertIncludes(storesDal, 'mergeStoreNestedUpdateWithCurrent(freshStore, transactionLogicalUpdate)', 'Store summary transaction-current nested merge');
  assertIncludes(storesDal, 'projectStoreNestedUpdateEntries(\n                    composedDirectStoreUpdate,', 'Store direct changed-leaf Firestore projection');
  assertIncludes(storesDal, 'const materializeStoreNestedEntry = (entry: StoreNestedUpdateEntry)', 'Store nested deletion materialization boundary');
  assertIncludes(storesDal, 'isStoreNestedDelete(entry.value) ? deleteField() : entry.value', 'Store nested Firestore deletion sentinel conversion');
  assertIncludes(storesDal, 'new FieldPath(...entry.path)', 'Store nested literal dynamic-key FieldPath projection');
  assertIncludes(storeNestedUpdateProjection, "'publicPresence'", 'Store nested public-presence patch field');
  assertIncludes(storeNestedUpdateProjection, "'workingHours'", 'Store nested working-hours patch field');
  assertIncludes(storeNestedUpdateProjection, 'assertSafeFieldSegment(key);', 'Store nested Firestore field-path admission');
  assertIncludes(storeNestedUpdateProjection, 'export function getStoreDeepDifference(', 'Store nested changed-leaf difference boundary');
  assertIncludes(storeNestedUpdateProjection, 'const keys = new Set(detectRemovedKeys', 'Store nested removal detection is mode-aware');
  assertIncludes(storeNestedUpdateProjection, '? [...Object.keys(original), ...Object.keys(updated)]', 'Store complete-map removed-field difference boundary');
  assertIncludes(storeNestedUpdateProjection, ': Object.keys(updated));', 'Store partial-root difference preserves omitted fields');
  assertIncludes(storeNestedUpdateProjection, 'difference[key] = STORE_NESTED_DELETE;', 'Store nested deletion marker');
  assertIncludes(storeNestedUpdateProjection, 'assertSafeFieldPath(field);', 'Store pre-projected field-path admission');
  assertOccurrenceAtLeast(desktopBusinessSettings, 'getStoreDeepDifference(nextStoreUpdate, expectedStoreDetails)', 2, 'Desktop business-copy captured-store changed-leaf writes');
  assertIncludes(desktopBusinessSettings, "key={`business-copy:${String(storeDetails?.tenantId ?? '')}:${String(storeDetails?.storeId ?? '')}`}", 'Desktop business-copy exact-scope remount');
  assertIncludes(desktopBusinessSettings, 'const activeBusinessSettingsScopeRef = useRef(businessSettingsScopeKey);', 'Desktop business-copy parent scope ref');
  assertOccurrenceAtLeast(desktopBusinessSettings, 'activeBusinessSettingsScopeRef.current !== expectedScopeKey', 2, 'Desktop business-copy pre-persistence scope guards');
  assertOccurrenceAtLeast(desktopBusinessSettings, "String(previous?.tenantId ?? '') === String(expectedTenantId ?? '')", 2, 'Desktop business-copy expected-tenant context guards');
  assertOccurrenceAtLeast(desktopBusinessSettings, "String(previous?.storeId ?? '') === String(expectedStoreId ?? '')", 2, 'Desktop business-copy expected-store context guards');
  assertIncludes(desktopBusinessCopySetup, 'const businessCopyActionInFlightRef = useRef(false);', 'Desktop business-copy duplicate action guard');
  assertIncludes(desktopBusinessCopySetup, 'const activeBusinessCopyScopeRef = useRef(businessCopyScopeKey);', 'Desktop business-copy exact-scope settlement ref');
  assertIncludes(desktopBusinessCopySetup, 'const componentActiveRef = useRef(true);', 'Desktop business-copy component-liveness settlement ref');
  assertOccurrenceAtLeast(desktopBusinessCopySetup, 'activeBusinessCopyScopeRef.current !== requestScopeKey', 4, 'Desktop business-copy stale async settlement guards');
  assertIncludes(desktopBusinessSettings, 'nextStoreDetails.publicPresence', 'Desktop photo retention uses merged public-presence truth');
  assertIncludes(mobileBusinessCopySetup, 'getStoreDeepDifference(nextStoreUpdate, storeDetails)', 'Mobile business-copy changed-leaf writes');
  assertIncludes(mobileBusinessCopySetup, 'function MobileBusinessCopySetupScreenContent(', 'Mobile business-copy keyed content boundary');
  assertIncludes(mobileBusinessCopySetup, '<MobileBusinessCopySetupScreenContent key={scopeKey}', 'Mobile business-copy exact-scope remount');
  assertIncludes(mobileBusinessCopySetup, 'const businessCopyActionInFlightRef = useRef(false);', 'Mobile business-copy duplicate action guard');
  assertIncludes(mobileBusinessCopySetup, 'const activeBusinessCopyScopeRef = useRef(businessCopyScopeKey);', 'Mobile business-copy exact-scope settlement ref');
  assertIncludes(mobileBusinessCopySetup, 'const componentActiveRef = useRef(true);', 'Mobile business-copy component-liveness settlement ref');
  assertOccurrenceAtLeast(mobileBusinessCopySetup, "String(previous?.tenantId ?? '') === String(expectedTenantId ?? '')", 2, 'Mobile business-copy expected-tenant context guards');
  assertOccurrenceAtLeast(mobileBusinessCopySetup, "String(previous?.storeId ?? '') === String(expectedStoreId ?? '')", 2, 'Mobile business-copy expected-store context guards');
  assertIncludes(mobileOfficialPage, 'getStoreDeepDifference(payload, storeDetails)', 'Mobile official-page changed-leaf write');
  assertIncludes(mobileOfficialPage, 'return <MobileOfficialPageScreenContent key={scopeKey} {...props} />;', 'Mobile official-page exact tenant/store keyed mount');
  assertIncludes(mobileOfficialPage, 'presenceSaveInFlightRef.current', 'Mobile official-page immediate duplicate-save guard');
  assertIncludes(mobileOfficialPage, 'previous?.storeId === expectedStoreId', 'Mobile official-page exact-store optimistic settlement guard');
  assertIncludes(mobileOfficialPage, 'previous?.tenantId === expectedTenantId', 'Mobile official-page exact-tenant optimistic settlement guard');
  assertIncludes(mobileOfficialPage, '&& previous?.publicPresence === payload.publicPresence', 'Mobile official-page attempt-owned optimistic rollback guard');
  assertIncludes(mobileOfficialPage, '|| presenceSaveInFlightRef.current', 'Mobile official-page unmount cleanup/save ordering guard');
  assertIncludes(mobileOfficialPage, 'await deleteOBPPhotos([url]);', 'Mobile official-page obsolete upload cleanup');
  assertIncludes(desktopBusinessSettings, '<BusinessSettingsStateBoundary', 'Desktop business settings scoped state boundary');
  assertIncludes(desktopBusinessSettings, 'key={scopeKey}', 'Desktop business settings exact tenant/store keyed mount');
  assertIncludes(desktopBusinessSettings, "if (typeof update === 'function')", 'Desktop business settings local functional draft updates');
  assertIncludes(desktopBusinessSettings, 'notifyStoreSaved(update);', 'Desktop business settings confirmed-record parent notification');
  assertIncludes(read('src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx'), 'await deleteOBPPhotos([url]);', 'Desktop official-page obsolete upload cleanup');
  assertIncludes(extractionApply, 'const storeResult = await applyStoreBusinessAttributeDefaults({', 'Extraction review transaction-current business-attribute default write');
  assertNotIncludes(extractionApply, 'await updateDoc(storeRef, { businessAttributes: nextBusinessAttributes });', 'Extraction review stale business-attribute replacement');
  assertIncludes(projectsB2c, 'getStoreDeepDifference(storeUpdate, storeDetails || {})', 'Projects official-page changed-leaf write');
  assertIncludes(mobileAdvancedSettings, 'getStoreDeepDifference(updates, sourceStoreDetails)', 'Mobile advanced settings captured-source changed-leaf write');
  assertIncludes(mobilePosSync, 'getStoreDeepDifference(nextPosSync, currentPosSync, {', 'Mobile POS sync complete-map changed-leaf write');
  assertIncludes(mobileWorkingHours, 'getStoreDeepDifference(workingHours, previousWorkingHours, {', 'Mobile working-hours captured complete-map changed-day write');
  assertIncludes(mobileSeoAnalytics, 'analytics: getStoreDeepDifference(nextAnalytics, previousAnalytics || {}, {', 'Mobile analytics captured-source complete-map changed-leaf write');
  assertIncludes(storeNestedUpdateProjection, 'options.detectRemovedRootKeys === true', 'Store complete-map root deletion must be explicit');
  assertIncludes(mobileCustomerApp, 'businessCopyMeta: getStoreDeepDifference(', 'Mobile customer-app metadata changed-leaf write');
  assertIncludes(desktopCustomerApp, 'businessCopyMeta: getStoreDeepDifference(', 'Desktop customer-app metadata changed-leaf write');
  assertIncludes(dashboardGoogleListing, 'publicPresence: {\n                    googleLinkUpdated: true,', 'Dashboard Google listing exact nested patch');
  assertNotIncludes(mobileLocaleSettings, '...storeDetails,\n            activeLanguages:', 'Mobile locale full-store write');
  assertNotIncludes(mobileSeoAnalytics, 'update.analytics = { ...storeDetails.analytics', 'Mobile analytics stale full-map write');
  assertNotIncludes(mobileOfficialPage, 'updateStore(payload as any)', 'Mobile official-page stale full-map write');
  assertIncludes(storesDal, "throw new Error(rejectionCode);", 'Store update rejected acknowledgement code');
  assertNotIncludes(storesDal, 'addStore = async (data: any', 'Store create must preserve its typed mutation boundary');
  assertNotIncludes(storesDal, 'updateStore = async (data: any', 'Store update must preserve its typed mutation boundary');
  assertNotIncludes(storesDal, 'const updateLogoImage = async (data)', 'Store logo upload must preserve its typed prepared-media boundary');
  assertIncludes(storesDal, 'if (Number.isSafeInteger(storeId) && isReadableStoreDocument(value, storeId))', 'Platform store lists must validate persisted rows before returning typed data');
  assertIncludes(storesDal, "throw new Error('store_list_tenant_scope_invalid');", 'Platform store lists must reject non-canonical tenant scope');
  assertIncludes(storesDal, "'store_list_document_shape_invalid'", 'Malformed platform store rows must emit bounded diagnostics');
  assertIncludes(tenantsDal, 'export function assertTenantUpdateSucceeded', 'Tenant update acknowledgement guard');
  assertIncludes(tenantsDal, "throw new Error(rejectionCode);", 'Tenant update rejected acknowledgement code');
  assertIncludes(tenantsDal, 'normalizeStorePermissionScopeDocumentId(documentId)', 'Tenant list authoritative document identity boundary');
  assertIncludes(tenantsDal, 'embeddedScope?.numericId !== documentScope.numericId', 'Tenant list embedded/document identity agreement');
  assertIncludes(tenantsDal, 'limit(MAX_TENANT_DOCUMENTS + 1)', 'Platform tenant list bounded overflow probe');
  assertIncludes(tenantsDal, "'tenant_document_limit_exceeded'", 'Platform tenant list fail-visible overflow');
  assertIncludes(usersDal, 'export function assertUserUpdateSucceeded', 'User update acknowledgement guard');
  assertIncludes(productionReadinessAudit, 'Tenant and platform-user acknowledgement source-gate checkpoint', 'Production readiness audit tenant/user acknowledgement checkpoint');
  assertIncludes(productionReadinessAudit, 'scans every active `src` tenant write/stores-list call and platform-user write call', 'Production readiness audit generic tenant/user acknowledgement scan');
  assertIncludes(changelog, 'Tenant and platform-user writes are source-gated globally', 'Changelog tenant/user acknowledgement source gate');
  assertIncludes(changelog, '`npm run verify:public-business-truth` now scans every active `src` tenant write/stores-list call and platform-user write call', 'Changelog generic tenant/user acknowledgement scan');
  assertIncludes(storesDal, 'await revalidatePublicClientCache(data.storeId, "addStore");', 'Store create public cache invalidation');
  assertIncludes(storesDal, 'const [storeSnapshot, tenantSnapshot] = await Promise.all([', 'Store create reads current tenant and store in one transaction');
  assertIncludes(storesDal, 'transaction.set(storeRef, composedStore);', 'Store create transaction writes canonical store');
  assertIncludes(storesDal, 'storesList: upsertTenantStoreListEntry(tenantSnapshot.data()?.storesList, data)', 'Store create transaction writes current tenant list');
  assertIncludes(storesDal, 'const freshStoreSnapshot = await transaction.get(storeRef);', 'Store update transaction reads current canonical store');
  assertIncludes(storesDal, 'storesList: upsertTenantStoreListEntry(tenantSnapshot.data()?.storesList, nextStore)', 'Store rename transaction updates current tenant list');
  assertNotIncludes(storesDal, 'await syncStoreToSummary(data.storeId, {', 'Store update must not split canonical and summary writes');
  assertNotIncludes(tenantsDal, 'updateTenantsStoreslist', 'Tenant DAL must not expose stale whole-list replacement');
  assertIncludes(storesDal, 'DIGITAL_SCREEN_STORE_OUTPUT_FIELDS', 'Store update digital screen output-field guard');
  assertIncludes(storesDal, 'touchScreen: hasDigitalScreenStoreOutputFieldChanges(data)', 'Store update digital screen refresh');
  assert(updateStoreSummaryIndex !== -1 && updateStoreCacheIndex !== -1 && updateStoreSummaryIndex < updateStoreCacheIndex, 'Store update must transactionally write storesSummary before public cache revalidation');
  assertNotIncludes(storesDal, 'TrackingEvent.SUBDOMAIN_MUTATION_BLOCKED', 'Store subdomain block dead browser analytics signal');
  assertNotIncludes(storesDal, 'console.error(', 'Store DAL direct error logging');
  assertNotIncludes(storesDal, 'console.warn(', 'Store DAL direct warn logging');
  assertNotIncludes(storesDal, 'console.log(', 'Store DAL direct log logging');
  assertNotIncludes(storesDal, '[G-08] Could not verify publish status; blocking subdomain update:', 'Store DAL raw publish-status diagnostic');
  assertNotIncludes(storesDal, '[G-08] Blocked subdomain change on published store', 'Store DAL raw subdomain block diagnostic');
  assertNotIncludes(storesDal, 'silent — analytics failure shouldn', 'Store DAL must not silently swallow subdomain block analytics failures');
  assertNotIncludes(storesDal, 'Skipping syncStoreToSummary: tenantId is undefined for store', 'Store DAL raw summary skip diagnostic');
  assertNotIncludes(usersDal, 'console.error(', 'Users DAL direct error logging');
  assertNotIncludes(usersDal, 'console.warn(', 'Users DAL direct warn logging');
  assertNotIncludes(usersDal, 'console.log(', 'Users DAL direct log logging');
  assertNotIncludes(usersDal, 'Users not available getUserByTenantId', 'Users DAL raw tenant empty diagnostic');
  assertNotIncludes(usersDal, 'users not available getUsersByStoreId', 'Users DAL raw store empty diagnostic');
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
  assertIncludes(
    mobileMore,
    "key: 'basicSettings'",
    'Mobile More brand settings route',
  );
  assertIncludes(
    mobileMore,
    "openSubScreen('basicSettings')",
    'Mobile More brand settings route',
  );
  assertIncludes(
    mobileBasicSettings,
    'addressLine: formData.addressLine',
    'Mobile Basic Settings public address update',
  );
  assertIncludes(
    mobileBasicSettings,
    'normalizeGeoCoordinateDraft(formData.latitude, formData.longitude)',
    'Mobile Basic Settings coordinate validation',
  );
  assertIncludes(
    mobileBasicSettings,
    'if (normalizedGeo.geo || storeDetails.geo) updates.geo = normalizedGeo.geo;',
    'Mobile Basic Settings coordinate update and clear',
  );
  assertIncludes(
    mobileBasicSettings,
    'mobile_basic_settings_save_failed',
    'Mobile Basic Settings save diagnostics',
  );
  assertIncludes(
    mobileBasicSettings,
    'assertStoreUpdateSucceeded(',
    'Mobile Basic Settings store update acknowledgement guard',
  );
  assertIncludes(
    mobileBasicSettings,
    'mobile_basic_settings_store_update_rejected',
    'Mobile Basic Settings store rejected acknowledgement code',
  );
  assertIncludes(
    mobileBasicSettings,
    'assertTenantUpdateSucceeded(',
    'Mobile Basic Settings tenant update acknowledgement guard',
  );
  assertIncludes(
    mobileBasicSettings,
    'mobile_basic_settings_tenant_update_rejected',
    'Mobile Basic Settings tenant rejected acknowledgement code',
  );
  assertIncludes(mobileBasicSettings, 'return <MobileBasicSettingsScreenContent key={scopeKey} {...props} />;', 'Mobile Basic Settings exact tenant/store keyed mount');
  assertIncludes(phoneNumberInput, 'aria-label={countryCodeAriaLabel}', 'Shared phone country selector accessible name forwarding');
  assertIncludes(phoneNumberInput, 'aria-label={phoneNumberAriaLabel}', 'Shared phone number input accessible name forwarding');
  assertIncludes(desktopBasicInfo, 'countryCodeAriaLabel="Business phone country code"', 'Desktop Business Settings phone country selector name');
  assertIncludes(desktopBasicInfo, 'phoneNumberAriaLabel="Business phone number"', 'Desktop Business Settings phone input name');
  assertIncludes(mobileAntd, "'aria-label'?: string;", 'Mobile form controls accessible-name contract');
  assertIncludes(mobileBasicSettings, 'aria-label="Business phone country code"', 'Mobile Basic Settings phone country selector name');
  assertIncludes(mobileBasicSettings, 'aria-label="Business phone number"', 'Mobile Basic Settings phone input name');
  assertIncludes(mobileBasicSettings, "aria-label={tBusiness('contactPersonName')}", 'Mobile Basic Settings contact name input');
  assertIncludes(mobileBasicSettings, "aria-label={tBusiness('contactPersonEmail')}", 'Mobile Basic Settings contact email input');
  assertIncludes(mobileBasicSettings, "aria-label={tBusiness('contactPersonNumber')}", 'Mobile Basic Settings contact phone input');
  assertIncludes(mobileBasicSettings, 'isValidOptionalContactEmail(normalizedBusinessEmail)', 'Mobile Basic Settings business email validation boundary');
  assertIncludes(mobileBasicSettings, 'isValidOptionalContactEmail(normalizedContactEmail)', 'Mobile Basic Settings contact email validation boundary');
  assertIncludes(mobileBasicSettings, 'email: normalizedBusinessEmail', 'Mobile Basic Settings normalized business email write');
  assertIncludes(mobileBasicSettings, 'contactPersonEmail: normalizedContactEmail', 'Mobile Basic Settings normalized contact email write');
  assertIncludes(mobileBasicSettings, 'basicSettingsSaveInFlightRef.current', 'Mobile Basic Settings immediate duplicate-save guard');
  assertIncludes(mobileBasicSettings, 'previous?.storeId === expectedStoreId && previous?.tenantId === expectedTenantId', 'Mobile Basic Settings exact-scope optimistic settlement');
  assertIncludes(mobileBasicSettings, 'MOBILE_BASIC_STORE_UPDATE_KEYS', 'Mobile Basic Settings exact persisted-store update key registry');
  assertIncludes(mobileBasicSettings, 'ownsMobileBasicOptimisticValues(previous, optimisticUpdates)', 'Mobile Basic Settings attempt-owned optimistic rollback');
  assertOccurrenceAtLeast(mobileBasicSettings, 'ownsMobileBasicOptimisticValues(', 4, 'Mobile Basic Settings same-store attempt ownership helper and checks');
  assertIncludes(mobileAdvancedSettings, 'ADVANCED_SETTINGS_STORE_UPDATE_KEYS', 'Mobile Advanced Settings exact persisted-store update key registry');
  assertIncludes(mobileBasicSettings, 'const currentStoreDetailsRef = useRef(storeDetails);', 'Mobile Basic Settings current-context settlement ref');
  assertIncludes(mobileBasicSettings, 'mobile_basic_settings_tenant_sync_failed', 'Mobile Basic Settings post-store tenant-sync failure diagnostics');
  assertIncludes(mobileBasicSettings, 'Business details saved, but the brand name still needs to be retried.', 'Mobile Basic Settings truthful partial-success copy');
  assertIncludes(
    desktopBusinessSettings,
    'assertStoreUpdateSucceeded(',
    'Desktop Business Settings store update acknowledgement guard',
  );
  assertIncludes(
    desktopBusinessSettings,
    'desktop_business_settings_store_update_rejected',
    'Desktop Business Settings store rejected acknowledgement code',
  );
  assertIncludes(
    desktopBusinessSettings,
    'desktop_business_settings_store_create_rejected',
    'Desktop Business Settings store create rejected acknowledgement code',
  );
  assertIncludes(
    desktopBusinessSettings,
    'desktop_business_copy_store_update_rejected',
    'Desktop Business Copy generated store rejected acknowledgement code',
  );
  assertIncludes(
    desktopBusinessSettings,
    'desktop_business_copy_translation_store_update_rejected',
    'Desktop Business Copy translation store rejected acknowledgement code',
  );
  assertIncludes(
    desktopBusinessSettings,
    'desktop_pos_sync_store_update_rejected',
    'Desktop POS Sync store rejected acknowledgement code',
  );
  assertIncludes(
    desktopBusinessSettings,
    'desktop_official_page_google_link_store_update_rejected',
    'Desktop Official Page Google link store rejected acknowledgement code',
  );
  assertIncludes(
    desktopBusinessSettings,
    'desktop_official_page_google_link_update_failed',
    'Desktop Official Page Google link bounded failure diagnostic',
  );
  assertNotIncludes(
    desktopBusinessSettings,
    'updateStore(updates).then(() =>',
    'Desktop Official Page Google link must not update local state from an unchecked store write',
  );
  assertIncludes(
    desktopBusinessSettings,
    'applyPosSyncStoreUpdates',
    'Desktop POS Sync nested state update helper',
  );
  assertIncludes(desktopPosSync, 'copyDesktopPosSyncText', 'Desktop POS Sync copy acknowledgement helper');
  assertIncludes(desktopPosSync, 'DESKTOP_POS_SYNC_COPY_UNAVAILABLE', 'Desktop POS Sync copy unavailable clipboard code');
  assertIncludes(desktopPosSync, 'DESKTOP_POS_SYNC_COPY_FALLBACK_FAILED', 'Desktop POS Sync copy fallback failure code');
  assertIncludes(desktopPosSync, 'hasClipboardWrite', 'Desktop POS Sync clipboard support metadata');
  assertIncludes(desktopPosSync, 'hasCopyFallback', 'Desktop POS Sync fallback support metadata');
  assertIncludes(desktopPosSync, "const copied = document.execCommand('copy');", 'Desktop POS Sync textarea copy acknowledgement');
  assertIncludes(desktopPosSync, 'desktop_pos_sync_secret_copy_failed', 'Desktop POS Sync secret copy diagnostic');
  assertIncludes(desktopPosSync, 'desktop_pos_sync_technical_summary_copy_failed', 'Desktop POS Sync technical-summary copy diagnostic');
  assertNotIncludes(desktopPosSync, 'await navigator.clipboard.writeText(webhookSecret);\n            message.success', 'Desktop POS Sync secret copy must not use unguarded Clipboard API success');
  assertNotIncludes(desktopPosSync, 'await navigator.clipboard.writeText(technicalSummary);\n            message.success', 'Desktop POS Sync technical-summary copy must not use unguarded Clipboard API success');
  assertNotIncludes(desktopPosSync, "document.execCommand('copy');\n            message.success", 'Desktop POS Sync textarea fallback must not assume copy success');
  assertIncludes(mobilePosSync, 'copyMobilePosSyncText', 'Mobile POS Sync copy acknowledgement helper');
  assertIncludes(mobilePosSync, 'MOBILE_POS_SYNC_COPY_UNAVAILABLE', 'Mobile POS Sync copy unavailable clipboard code');
  assertIncludes(mobilePosSync, 'MOBILE_POS_SYNC_COPY_FALLBACK_FAILED', 'Mobile POS Sync copy fallback failure code');
  assertIncludes(mobilePosSync, 'hasClipboardWrite', 'Mobile POS Sync clipboard support metadata');
  assertIncludes(mobilePosSync, 'hasCopyFallback', 'Mobile POS Sync fallback support metadata');
  assertIncludes(mobilePosSync, "const copied = document.execCommand('copy');", 'Mobile POS Sync textarea copy acknowledgement');
  assertIncludes(mobilePosSync, 'mobile_pos_sync_secret_copy_failed', 'Mobile POS Sync secret copy diagnostic');
  assertNotIncludes(mobilePosSync, 'await navigator.clipboard.writeText(webhookSecret);\n            Toast.show', 'Mobile POS Sync secret copy must not use unguarded Clipboard API success');
  assertNotIncludes(mobilePosSync, "document.execCommand('copy');\n            Toast.show", 'Mobile POS Sync textarea fallback must not assume copy success');
  assertIncludes(
    desktopBusinessSettings,
    'assertTenantUpdateSucceeded(',
    'Desktop Business Settings tenant update acknowledgement guard',
  );
  assertNotIncludes(
    desktopBusinessSettings,
    'updateTenantsStoreslist(',
    'Desktop Business Settings stale tenant stores-list replacement',
  );
  assertIncludes(
    mobileBasicSettings,
    "hasLogoUpdate: Object.prototype.hasOwnProperty.call(updates, 'logo') || Boolean(updates.imageToUpdate)",
    'Mobile Basic Settings bounded logo update context',
  );
  assertIncludes(desktopBusinessSettings, "if (isLogoRemovalRequested) {\n            changesToUpload.logo = '';", 'Desktop Business Settings persists logo removal');
  assertIncludes(desktopBusinessSettings, 'imageUrl={isLogoRemovalRequested ? undefined : selectedFile.url || storeDetails?.logo}', 'Desktop Business Settings removal draft does not fall back to persisted logo');
  assertIncludes(desktopBusinessSettings, 'onRemove={selectedFile.url || storeDetails?.logo ? () => {', 'Desktop Business Settings exposes persisted logo removal');
  assertIncludes(mobileBasicSettings, "if (isLogoRemovalRequested) {\n            updates.logo = '';", 'Mobile Basic Settings persists logo removal');
  assertIncludes(mobileBasicSettings, 'imageUrl={isLogoRemovalRequested ? undefined : selectedLogo?.url || storeDetails.logo}', 'Mobile Basic Settings removal draft does not fall back to persisted logo');
  assertIncludes(mobileBasicSettings, 'onRemove={selectedLogo?.url || storeDetails.logo ? () => {', 'Mobile Basic Settings exposes persisted logo removal');
  assertIncludes(mobileBasicSettings, "Object.prototype.hasOwnProperty.call(savedStore || {}, 'logo')", 'Mobile Basic Settings acknowledges an intentionally empty saved logo');
  assertIncludes(
    mobileBasicSettings,
    'tenantNameChanged: formData.tenantName.trim() !== tenantDetails?.name',
    'Mobile Basic Settings bounded tenant-name context',
  );
  assertIncludes(
    mobileBusinessAttributes,
    'mobile_business_attributes_save_failed',
    'Mobile Business Attributes save diagnostics',
  );
  assertIncludes(iconPicker, "ariaLabel = 'Choose icon'", 'Shared icon picker accessible trigger fallback');
  assertIncludes(iconPicker, 'aria-label={ariaLabel}', 'Shared icon picker trigger accessible name');
  assertIncludes(desktopBusinessAttributes, "ariaLabel={`${tCommon('select')} ${t('customBusinessAttributes')}`}", 'Desktop custom business-attribute icon picker accessible name');
  assertIncludes(desktopBusinessAttributes, "aria-label={`${tCommon('remove')} ${t('customBusinessAttributes')}`}", 'Desktop custom business-attribute remove accessible name');
  assertIncludes(mobileBusinessAttributes, "ariaLabel={`${tCommon('select')} ${t('customBusinessAttributes')}`}", 'Mobile custom business-attribute icon picker accessible name');
  assertIncludes(mobileBusinessAttributes, "aria-label={`${tCommon('remove')} ${t('customBusinessAttributes')}`}", 'Mobile custom business-attribute remove accessible name');
  assertIncludes(
    mobileBusinessAttributes,
    'assertStoreUpdateSucceeded(',
    'Mobile Business Attributes store update acknowledgement guard',
  );
  assertIncludes(
    mobileBusinessAttributes,
    'mobile_business_attributes_store_update_rejected',
    'Mobile Business Attributes store rejected acknowledgement code',
  );
  assertIncludes(
    mobileBusinessAttributes,
    'enabledAttributeCount: Object.values(attributes).filter(Boolean).length',
    'Mobile Business Attributes bounded enabled count context',
  );
  assertIncludes(
    mobileBusinessAttributes,
    'customAttributeCount: normalizedCustomAttributes.length',
    'Mobile Business Attributes bounded custom count context',
  );
  assertIncludes(
    mobileBusinessAttributes,
    'businessAttributes: getStoreDeepDifference(attributes, originalAttributes, {',
    'Mobile Business Attributes changed-leaf mutation projection',
  );
  assertIncludes(
    mobileBusinessAttributes,
    'customAttributes: normalizedCustomAttributes',
    'Mobile Business Attributes exact custom-attribute patch',
  );
  assertIncludes(mobileBusinessAttributes, 'return <MobileBusinessAttributesScreenContent key={scopeKey} {...props} />;', 'Mobile Business Attributes exact tenant/store keyed mount');
  assertIncludes(mobileBusinessAttributes, 'attributesSaveInFlightRef.current', 'Mobile Business Attributes immediate duplicate-save guard');
  assertIncludes(mobileBusinessAttributes, 'previous?.storeId === expectedStoreId', 'Mobile Business Attributes exact-store optimistic settlement');
  assertIncludes(mobileBusinessAttributes, 'previous?.tenantId === expectedTenantId', 'Mobile Business Attributes exact-tenant optimistic settlement');
  assertIncludes(mobileBusinessAttributes, '...(previous.publicPresence || {})', 'Mobile Business Attributes acknowledgement-time current public-presence merge');
  assertNotIncludes(mobileBusinessAttributes, 'optimisticPublicPresence', 'Mobile Business Attributes stale optimistic public-presence replacement');
  assertIncludes(mobileBusinessAttributes, 'previous?.businessAttributes === previousBusinessAttributes', 'Mobile Business Attributes same-store attribute settlement ownership');
  assertIncludes(mobileBusinessAttributes, 'previous?.publicPresence?.customAttributes === previousCustomAttributes', 'Mobile Business Attributes same-store custom-attribute settlement ownership');
  assertNotIncludes(
    mobileBusinessAttributes,
    '...(storeDetails.publicPresence || {})',
    'Mobile Business Attributes stale public-presence spread',
  );
  assertIncludes(
    desktopBusinessSettings,
    'const updatedChanges: any = applyBusinessCopyManualOverrideMetaToUpdate({',
    'Desktop Business Settings audit metadata after changed-leaf projection',
  );
  assertIncludes(
    desktopBusinessSettings,
    'update: getStoreDeepDifference(changesToUpload, storeDetails)',
    'Desktop Business Settings changed-leaf mutation projection before audit metadata',
  );
  assertOccurrenceAtLeast(
    mobileBusinessAttributes,
    'normalizeBusinessAttributes(storeDetails?.businessAttributes)',
    2,
    'Mobile Business Attributes runtime-normalized current/original state',
  );
  assertIncludes(
    desktopBusinessSettings,
    'businessAttributes: normalizeBusinessAttributes(storeDetails?.businessAttributes)',
    'Desktop Business Settings runtime-normalized controlled attributes',
  );
  assertIncludes(
    businessAttributes,
    'export function normalizeBusinessAttributes(value: unknown)',
    'Shared owner/public controlled business-attribute runtime boundary',
  );
  assertIncludes(
    mobileBusinessCopySetup,
    'assertStoreUpdateSucceeded(',
    'Mobile Business Copy store update acknowledgement guard',
  );
  assertIncludes(
    mobileBusinessCopySetup,
    'mobile_business_copy_store_update_rejected',
    'Mobile Business Copy generated store rejected acknowledgement code',
  );
  assertIncludes(
    mobileBusinessCopySetup,
    'mobile_business_copy_translation_store_update_rejected',
    'Mobile Business Copy translation store rejected acknowledgement code',
  );
  assertIncludes(
    mobileLocaleSettings,
    'mobile_locale_settings_save_failed',
    'Mobile Locale Settings save diagnostics',
  );
  assertIncludes(
    mobileLocaleSettings,
    'return <MobileLocaleSettingsScreenContent key={scopeKey} {...props} />;',
    'Mobile Locale Settings exact tenant/store keyed mount',
  );
  assertIncludes(
    mobileLocaleSettings,
    'localeSaveInFlightRef.current',
    'Mobile Locale Settings immediate duplicate-save guard',
  );
  assertIncludes(
    mobileLocaleSettings,
    'previous?.storeId === expectedStoreId && previous?.tenantId === expectedTenantId',
    'Mobile Locale Settings exact-scope optimistic settlement guard',
  );
  assertIncludes(
    mobileLocaleSettings,
    'return stillOwnsOptimisticState ? { ...previous, ...previousLocale } : previous;',
    'Mobile Locale Settings attempt-owned rollback guard',
  );
  assertIncludes(
    mobileLocaleSettings,
    'assertStoreUpdateSucceeded(',
    'Mobile Locale Settings store update acknowledgement guard',
  );
  assertIncludes(
    mobileLocaleSettings,
    'mobile_locale_settings_store_update_rejected',
    'Mobile Locale Settings store rejected acknowledgement code',
  );
  assertIncludes(
    mobileLocaleSettings,
    'activeLanguageCount: normalizedLanguagePolicy.activeLanguages.length',
    'Mobile Locale Settings bounded language count context',
  );
  assertIncludes(
    mobileLocaleSettings,
    'currencyChanged: formData.currencyCode !== storeDetails.currencyCode || formData.currencySymbol !== storeDetails.currencySymbol',
    'Mobile Locale Settings bounded currency change context',
  );
  assertIncludes(
    mobileAdvancedSettings,
    'assertStoreUpdateSucceeded(',
    'Mobile Advanced Settings store update acknowledgement guard',
  );
  assertIncludes(
    mobileAdvancedSettings,
    'mobile_advanced_settings_store_update_rejected',
    'Mobile Advanced Settings store rejected acknowledgement code',
  );
  assertIncludes(
    mobileAdvancedSettings,
    'return <MobileAdvancedSettingsScreenContent key={scopeKey} {...props} />;',
    'Mobile Advanced Settings exact tenant/store/mode keyed mount',
  );
  assertIncludes(mobileAdvancedSettings, 'saveInFlightRef.current', 'Mobile Advanced Settings immediate duplicate-save guard');
  assertIncludes(mobileAdvancedSettings, 'currentStoreDetails?.storeId !== expectedStoreId', 'Mobile Advanced Settings exact-store acknowledgement settlement');
  assertIncludes(mobileAdvancedSettings, 'currentStoreDetails?.tenantId !== expectedTenantId', 'Mobile Advanced Settings exact-tenant acknowledgement settlement');
  assertIncludes(mobileAdvancedSettings, 'currentStoreDetails[key] === sourceStoreDetails[key]', 'Mobile Advanced Settings same-store changed-leaf settlement ownership');
  assertNotIncludes(
    mobileSeoAnalytics,
    'const saveField = async',
    'Mobile SEO/Analytics dead unsafe single-field writer',
  );
  assertIncludes(
    mobileSeoAnalytics,
    'return <MobileSeoAnalyticsScreenContent key={scopeKey} {...props} />;',
    'Mobile SEO/Analytics exact tenant/store/mode keyed mount',
  );
  assertIncludes(mobileSeoAnalytics, 'saveInFlightRef.current', 'Mobile SEO/Analytics shared immediate duplicate-save guard');
  assertIncludes(mobileSeoAnalytics, 'currentDetails?.storeId === expectedStoreId', 'Mobile SEO/Analytics exact-store acknowledgement settlement');
  assertIncludes(mobileSeoAnalytics, 'currentDetails?.tenantId === expectedTenantId', 'Mobile SEO/Analytics exact-tenant acknowledgement settlement');
  assertIncludes(mobileSeoAnalytics, 'currentDetails?.analytics === previousAnalytics', 'Mobile Analytics same-store changed-leaf settlement ownership');
  assertIncludes(mobileSeoAnalytics, 'seoFields.every((field) => currentDetails[field] === sourceStoreDetails[field])', 'Mobile SEO same-store changed-leaf settlement ownership');
  assertIncludes(
    mobileSeoAnalytics,
    'mobile_analytics_settings_store_update_rejected',
    'Mobile Analytics Settings store rejected acknowledgement code',
  );
  assertIncludes(
    mobileSeoAnalytics,
    'mobile_seo_settings_store_update_rejected',
    'Mobile SEO Settings store rejected acknowledgement code',
  );
  assertIncludes(
    mobileMore,
    "subScreen === 'domainSettings') subScreenContent = <MobileDomainSettingsScreen",
    'Mobile More domain route',
  );
	  [
	    'mobile_domain_settings_status_rejected',
	    'mobile_domain_settings_status_load_failed',
	    'mobile_domain_settings_status_response_parse_failed',
	    'mobile_domain_settings_status_response_invalid',
	    'mobile_domain_settings_subdomain_check_rejected',
	    'mobile_domain_settings_subdomain_check_failed',
	    'mobile_domain_settings_subdomain_check_response_parse_failed',
	    'mobile_domain_settings_subdomain_check_response_invalid',
	    'mobile_domain_settings_subdomain_store_update_rejected',
	    'mobile_domain_settings_subdomain_save_failed',
	    'mobile_domain_settings_add_failed',
	    'mobile_domain_settings_add_rejected',
	    'mobile_domain_settings_add_response_parse_failed',
	    'mobile_domain_settings_add_response_invalid',
    'mobile_domain_settings_remove_rejected',
    'mobile_domain_settings_remove_response_parse_failed',
    'mobile_domain_settings_remove_response_invalid',
	    'mobile_domain_settings_custom_domain_check_failed',
    'mobile_domain_settings_remove_failed',
    'mobile_domain_settings_domain_copy_failed',
    'mobile_domain_settings_domain_open_failed',
    'mobile_domain_settings_dns_copy_failed',
	  ].forEach((failureCode) => {
	    assertIncludes(mobileDomainSettings, failureCode, 'Mobile domain settings diagnostics');
	  });
	  assertIncludes(mobileDomainSettings, 'readJsonResponseWithLimit<SubdomainAvailabilityResponse>', 'Mobile domain settings bounded subdomain response parser');
	  assertIncludes(mobileDomainSettings, 'MOBILE_DOMAIN_SETTINGS_RESPONSE_JSON_MAX_BYTES', 'Mobile domain settings response byte cap');
	  assertIncludes(mobileDomainSettings, 'readMobileDomainSettingsDomainResponseJson<DomainStatusResponse>', 'Mobile domain settings bounded status response parser');
	  assertIncludes(mobileDomainSettings, 'readMobileDomainSettingsDomainResponseJson<DomainAddResponse>', 'Mobile domain settings bounded add response parser');
	  assertIncludes(mobileDomainSettings, 'readMobileDomainSettingsDomainResponseJson<DomainRemoveResponse>', 'Mobile domain settings bounded remove response parser');
	  assertIncludes(mobileDomainSettings, 'MOBILE_DOMAIN_SETTINGS_DOMAIN_RESPONSE_JSON_MAX_BYTES', 'Mobile domain settings domain response byte cap');
  assertIncludes(mobileDomainSettings, 'AUTH_BROWSER_REQUEST_POLICY', 'Mobile domain settings shared authenticated browser request policy');
  assertOccurrenceAtLeast(mobileDomainSettings, "fetch('/api/domain'", 3, 'Mobile domain settings custom-domain API calls');
  assertOccurrenceAtLeast(mobileDomainSettings, 'AUTH_BROWSER_REQUEST_POLICY', 5, 'Mobile domain settings API calls share browser request policy');
  assertOccurrenceAtLeast(mobileDomainSettings, '...AUTH_BROWSER_REQUEST_POLICY', 2, 'Mobile domain settings mutations spread shared browser request policy');
  assertNotIncludes(mobileDomainSettings, "fetch('/api/domain', {\n                cache: 'no-store'", 'Mobile domain settings inline domain request policy');
  assertNotIncludes(mobileDomainSettings, "fetch(`/api/subdomain/check?subdomain=${encodeURIComponent(input.trim())}`, {\n                cache: 'no-store'", 'Mobile domain settings inline subdomain request policy');
	  assertIncludes(mobileDomainSettings, 'assertStoreUpdateSucceeded(', 'Mobile domain settings subdomain store update acknowledgement guard');
  assertIncludes(mobileDomainSettings, 'data?.success !== true || data.removed !== true', 'Mobile domain settings remove requires explicit removed acknowledgement');
  assertIncludes(mobileDomainSettings, 'removed: data?.removed === true', 'Mobile domain settings remove invalid diagnostics include removed acknowledgement');
		  assertNotIncludes(mobileDomainSettings, 'response.json().catch(() => null)', 'Mobile domain settings must not silently swallow subdomain-check parse failures');
		  assertNotIncludes(mobileDomainSettings, 'const data = await response.json()', 'Mobile domain settings must not use direct unbounded response parsing');
  assertIncludes(mobileDomainSettings, 'copyMobileDomainSettingsText', 'Mobile domain settings copy acknowledgement helper');
  assertIncludes(mobileDomainSettings, 'MOBILE_DOMAIN_SETTINGS_COPY_UNAVAILABLE', 'Mobile domain settings copy unavailable clipboard code');
  assertIncludes(mobileDomainSettings, 'MOBILE_DOMAIN_SETTINGS_COPY_FALLBACK_FAILED', 'Mobile domain settings copy fallback failure code');
  assertIncludes(mobileDomainSettings, 'hasClipboardWrite', 'Mobile domain settings clipboard support metadata');
  assertIncludes(mobileDomainSettings, 'hasCopyFallback', 'Mobile domain settings fallback support metadata');
  assertIncludes(mobileDomainSettings, "const copied = document.execCommand('copy');", 'Mobile domain settings textarea copy acknowledgement');
		  assertIncludes(mobileDomainSettings, "getBoundedStoreStringContext('copyValue', domainUrl)", 'Mobile domain settings bounded domain copy context');
  assertIncludes(mobileDomainSettings, "getBoundedStoreStringContext('openUrl', domainUrl)", 'Mobile domain settings bounded domain open context');
	  assertIncludes(mobileDomainSettings, "getBoundedStoreStringContext('dnsRecordValue', record.value)", 'Mobile domain settings bounded DNS copy context');
  [
    'createLatestRequestGuard',
    'statusRequestGuardRef.current!.isCurrent(requestId)',
    'subdomainCheckGuardRef.current!.isCurrent(requestId)',
    'domainCheckGuardRef.current!.isCurrent(requestId)',
    'domainScopeKeyRef.current !== requestScopeKey',
    'return <MobileDomainSettingsScreenContent key={scopeKey} {...props} />;',
    "String(previous?.tenantId ?? '') !== String(expectedTenantId ?? '')",
    "String(previous?.storeId ?? '') !== String(expectedStoreId)",
  ].forEach((token) => assertIncludes(mobileDomainSettings, token, 'Mobile domain settings tenant/store settlement guard'));
  assertIncludes(mobileDomainSettings, 'openIsolatedBrowserUrl(domainUrl)', 'Mobile domain settings isolated external open');
  assertNotIncludes(mobileDomainSettings, 'window.open(', 'Mobile domain settings no-opener handle acknowledgement');
  assertNotIncludes(mobileDomainSettings, 'await navigator.clipboard.writeText(domainUrl);\n            setDomainLinkCopied(true);', 'Mobile domain settings domain copy must not use unguarded Clipboard API success');
  assertNotIncludes(mobileDomainSettings, 'await navigator.clipboard.writeText(record.value);\n            setCopiedDnsValue', 'Mobile domain settings DNS copy must not use unguarded Clipboard API success');
  assertNotIncludes(mobileDomainSettings, "document.execCommand('copy');\n            setDomainLinkCopied(true);", 'Mobile domain settings textarea fallback must not assume domain-copy success');
  assertNotIncludes(mobileDomainSettings, "document.execCommand('copy');\n            setCopiedDnsValue", 'Mobile domain settings textarea fallback must not assume DNS-copy success');
  [
    [mobileDomainSettings, 'Mobile domain settings screen'],
    [desktopDomainSettings, 'Desktop domain settings tab'],
    [desktopCustomDomain, 'Desktop custom domain tab'],
  ].forEach(([content, label]) => {
    assertIncludes(content, 'logStoreDataFailure', `${label} bounded diagnostics`);
    assertIncludes(content, 'getBoundedStoreStringContext', `${label} bounded diagnostics`);
    assertNotIncludes(content, 'data?.error', `${label} raw API response text`);
    assertNotIncludes(content, 'err.response?.data?.error', `${label} raw API response text`);
    assertNotIncludes(content, 'error?.message', `${label} raw exception text`);
    assertNotIncludes(content, 'Toast.show({ content: error', `${label} raw toast text`);
  });
  [
    'desktop_domain_settings_subdomain_check_failed',
    'desktop_domain_settings_subdomain_check_rejected',
    'desktop_domain_settings_subdomain_check_response_parse_failed',
    'desktop_domain_settings_subdomain_check_response_invalid',
    'desktop_domain_settings_subdomain_save_failed',
    'desktop_domain_settings_status_load_failed',
    'desktop_domain_settings_status_load_rejected',
    'desktop_domain_settings_status_response_parse_failed',
    'desktop_domain_settings_status_response_invalid',
    'desktop_domain_settings_add_failed',
    'desktop_domain_settings_add_rejected',
    'desktop_domain_settings_add_response_parse_failed',
    'desktop_domain_settings_add_response_invalid',
    'desktop_domain_settings_custom_domain_check_failed',
    'desktop_domain_settings_remove_failed',
    'desktop_domain_settings_remove_rejected',
    'desktop_domain_settings_remove_response_parse_failed',
    'desktop_domain_settings_remove_response_invalid',
    'desktop_domain_settings_subdomain_copy_failed',
    'desktop_domain_settings_subdomain_open_failed',
    'desktop_domain_settings_domain_copy_failed',
    'desktop_domain_settings_domain_open_failed',
    'desktop_domain_settings_dns_copy_failed',
	  ].forEach((failureCode) => {
	    assertIncludes(desktopDomainSettings, failureCode, 'Desktop domain settings diagnostics');
	  });
  assertIncludes(desktopDomainSettings, 'copyDesktopDomainSettingsText', 'Desktop domain settings copy acknowledgement helper');
  assertIncludes(desktopDomainSettings, 'DESKTOP_DOMAIN_SETTINGS_COPY_UNAVAILABLE', 'Desktop domain settings copy unavailable clipboard code');
  assertIncludes(desktopDomainSettings, 'DESKTOP_DOMAIN_SETTINGS_COPY_FALLBACK_FAILED', 'Desktop domain settings copy fallback failure code');
  assertIncludes(desktopDomainSettings, 'hasClipboardWrite', 'Desktop domain settings clipboard support metadata');
  assertIncludes(desktopDomainSettings, 'hasCopyFallback', 'Desktop domain settings fallback support metadata');
  assertIncludes(desktopDomainSettings, "const copied = document.execCommand('copy');", 'Desktop domain settings textarea copy acknowledgement');
	  assertIncludes(desktopDomainSettings, "getBoundedStoreStringContext('copyValue', domainUrl)", 'Desktop domain settings bounded domain copy context');
	  assertIncludes(desktopDomainSettings, "getBoundedStoreStringContext('openUrl', domainUrl)", 'Desktop domain settings bounded domain open context');
	  assertIncludes(desktopDomainSettings, "getBoundedStoreStringContext('dnsRecordValue', record.value)", 'Desktop domain settings bounded DNS copy context');
  assertIncludes(desktopDomainSettings, 'await Promise.resolve(onStoreUpdate?.({ subdomain: nextSubdomain }));', 'Desktop domain settings waits for subdomain store persistence');
  assertIncludes(desktopBusinessSettings, 'desktop_domain_settings_subdomain_store_update_rejected', 'Desktop domain settings parent store acknowledgement code');
  assertIncludes(desktopBusinessSettings, 'assertStoreUpdateSucceeded(', 'Desktop domain settings parent store acknowledgement guard');
  [
    'createLatestRequestGuard',
    'subdomainCheckGuardRef.current!.isCurrent(requestId)',
    'domainStatusGuardRef.current!.isCurrent(requestId)',
    'domainCheckGuardRef.current!.isCurrent(requestId)',
    'domainScopeKeyRef.current !== requestScopeKey',
    'componentActiveRef.current',
  ].forEach((token) => assertIncludes(desktopDomainSettings, token, 'Desktop domain settings tenant/store settlement guard'));
  [
    '<DomainSettingsTab',
    'key={`${String(storeDetails?.tenantId ?? \'\')}:${String(storeDetails?.storeId ?? \'\')}`}',
    "String(previous?.tenantId ?? '') !== String(expectedTenantId ?? '')",
    "String(previous?.storeId ?? '') !== String(expectedStoreId ?? '')",
  ].forEach((token) => assertIncludes(desktopBusinessSettings, token, 'Desktop domain settings parent tenant/store settlement guard'));
  assertNotIncludes(desktopBusinessSettings, 'updateStore(storeUpdate).then(() =>', 'Desktop domain settings parent must not update local state from unchecked store write');
  assertIncludes(desktopDomainSettings, "openIsolatedBrowserUrl(subdomainUrl)", 'Desktop domain settings safe subdomain open');
  assertIncludes(desktopDomainSettings, "openIsolatedBrowserUrl(domainUrl)", 'Desktop domain settings safe custom-domain open');
  assertIncludes(desktopDomainSettings, 'readJsonResponseWithLimit<DesktopDomainSettingsSubdomainAvailabilityResponse>', 'Desktop domain settings bounded subdomain response parser');
  assertIncludes(desktopDomainSettings, 'DESKTOP_DOMAIN_SETTINGS_SUBDOMAIN_RESPONSE_JSON_MAX_BYTES', 'Desktop domain settings subdomain response byte cap');
  assertNotIncludes(desktopDomainSettings, "axios.get(`/api/subdomain/check", 'Desktop domain settings subdomain check must not use unbounded axios response');
  assertNotIncludes(desktopDomainSettings, "from 'axios';", 'Desktop domain settings must not keep axios for domain/subdomain response parsing');
  assertIncludes(desktopDomainSettings, 'readDesktopDomainSettingsDomainResponseJson<DesktopDomainSettingsAddResponse>', 'Desktop domain settings bounded add response parser');
  assertIncludes(desktopDomainSettings, 'readDesktopDomainSettingsDomainResponseJson<DesktopDomainSettingsStatusResponse>', 'Desktop domain settings bounded status response parser');
  assertIncludes(desktopDomainSettings, 'readDesktopDomainSettingsDomainResponseJson<DesktopDomainSettingsRemoveResponse>', 'Desktop domain settings bounded remove response parser');
  assertIncludes(desktopDomainSettings, 'DESKTOP_DOMAIN_SETTINGS_DOMAIN_RESPONSE_JSON_MAX_BYTES', 'Desktop domain settings response byte cap');
  assertIncludes(desktopDomainSettings, 'AUTH_BROWSER_REQUEST_POLICY', 'Desktop domain settings shared authenticated browser request policy');
  assertOccurrenceAtLeast(desktopDomainSettings, "fetch('/api/domain'", 3, 'Desktop domain settings custom-domain API calls');
  assertOccurrenceAtLeast(desktopDomainSettings, 'AUTH_BROWSER_REQUEST_POLICY', 5, 'Desktop domain settings API calls share browser request policy');
  assertOccurrenceAtLeast(desktopDomainSettings, '...AUTH_BROWSER_REQUEST_POLICY', 2, 'Desktop domain settings mutations spread shared browser request policy');
  assertNotIncludes(desktopDomainSettings, "fetch('/api/domain', {\n                cache: 'no-store'", 'Desktop domain settings inline domain request policy');
  assertNotIncludes(desktopDomainSettings, "fetch(`/api/subdomain/check?subdomain=${encodeURIComponent(value.trim())}`, {\n                cache: 'no-store'", 'Desktop domain settings inline subdomain request policy');
  assertIncludes(desktopDomainSettings, 'onStoreStateUpdate?.({ customDomain: nextDomain, domainVerified: data.verified === true });', 'Desktop domain settings add waits for acknowledged response domain');
	  assertIncludes(desktopDomainSettings, 'data?.success !== true || data.removed !== true', 'Desktop domain settings remove requires explicit removed acknowledgement');
	  assertIncludes(desktopDomainSettings, 'removed: data?.removed === true', 'Desktop domain settings remove invalid diagnostics include removed acknowledgement');
	  assertNotIncludes(desktopDomainSettings, "axios.post('/api/domain'", 'Desktop domain settings add must not use unbounded axios response');
	  assertNotIncludes(desktopDomainSettings, "axios.get('/api/domain'", 'Desktop domain settings status must not use unbounded axios response');
	  assertNotIncludes(desktopDomainSettings, "axios.delete('/api/domain'", 'Desktop domain settings remove must not use unbounded axios response');
  assertNotIncludes(desktopDomainSettings, 'await navigator.clipboard.writeText(subdomainUrl);\n            setSubdomainCopied(true);', 'Desktop domain settings subdomain copy must not use unguarded Clipboard API success');
  assertNotIncludes(desktopDomainSettings, 'await navigator.clipboard.writeText(domainUrl);\n            setDomainLinkCopied(true);', 'Desktop domain settings domain copy must not use unguarded Clipboard API success');
  assertNotIncludes(desktopDomainSettings, 'await navigator.clipboard.writeText(record.value);\n            setCopiedDnsValue', 'Desktop domain settings DNS copy must not use unguarded Clipboard API success');
  assertNotIncludes(desktopDomainSettings, "document.execCommand('copy');\n            setSubdomainCopied(true);", 'Desktop domain settings textarea fallback must not assume subdomain-copy success');
  assertNotIncludes(desktopDomainSettings, "document.execCommand('copy');\n            setDomainLinkCopied(true);", 'Desktop domain settings textarea fallback must not assume domain-copy success');
  assertNotIncludes(desktopDomainSettings, "document.execCommand('copy');\n            setCopiedDnsValue", 'Desktop domain settings textarea fallback must not assume DNS-copy success');
  [
    'desktop_custom_domain_add_failed',
    'desktop_custom_domain_add_rejected',
    'desktop_custom_domain_add_response_parse_failed',
    'desktop_custom_domain_add_response_invalid',
    'desktop_custom_domain_status_load_failed',
    'desktop_custom_domain_status_load_rejected',
    'desktop_custom_domain_status_response_parse_failed',
    'desktop_custom_domain_status_response_invalid',
    'desktop_custom_domain_remove_failed',
    'desktop_custom_domain_remove_rejected',
    'desktop_custom_domain_remove_response_parse_failed',
    'desktop_custom_domain_remove_response_invalid',
  ].forEach((failureCode) => {
    assertIncludes(desktopCustomDomain, failureCode, 'Desktop custom domain diagnostics');
  });
  assertIncludes(desktopCustomDomain, 'readDesktopCustomDomainResponseJson<DesktopCustomDomainAddResponse>', 'Desktop custom domain bounded add response parser');
  assertIncludes(desktopCustomDomain, 'readDesktopCustomDomainResponseJson<DesktopCustomDomainStatusResponse>', 'Desktop custom domain bounded status response parser');
  assertIncludes(desktopCustomDomain, 'readDesktopCustomDomainResponseJson<DesktopCustomDomainRemoveResponse>', 'Desktop custom domain bounded remove response parser');
  assertIncludes(desktopCustomDomain, 'DESKTOP_CUSTOM_DOMAIN_RESPONSE_JSON_MAX_BYTES', 'Desktop custom domain response byte cap');
  assertIncludes(desktopCustomDomain, 'AUTH_BROWSER_REQUEST_POLICY', 'Desktop custom domain shared authenticated browser request policy');
  assertOccurrenceAtLeast(desktopCustomDomain, "fetch('/api/domain'", 3, 'Desktop custom domain API calls');
  assertOccurrenceAtLeast(desktopCustomDomain, 'AUTH_BROWSER_REQUEST_POLICY', 7, 'Desktop custom domain domain/compliance API calls share browser request policy');
  assertOccurrenceAtLeast(desktopCustomDomain, '...AUTH_BROWSER_REQUEST_POLICY', 4, 'Desktop custom domain mutations spread shared browser request policy');
  assertNotIncludes(desktopCustomDomain, "fetch('/api/domain', {\n                cache: 'no-store'", 'Desktop custom domain inline request policy');
  assertIncludes(desktopCustomDomain, 'onStoreUpdate?.({ customDomain: data.domain, domainVerified: data.verified === true });', 'Desktop custom domain add waits for acknowledged response domain');
  assertIncludes(desktopCustomDomain, 'data?.success !== true || data.removed !== true', 'Desktop custom domain remove requires explicit removed acknowledgement');
  assertIncludes(desktopCustomDomain, 'removed: data?.removed === true', 'Desktop custom domain remove invalid diagnostics include removed acknowledgement');
  assertNotIncludes(desktopCustomDomain, "axios.post('/api/domain'", 'Desktop custom domain add must not use unbounded axios response');
  assertNotIncludes(desktopCustomDomain, "axios.get('/api/domain'", 'Desktop custom domain status must not use unbounded axios response');
  assertNotIncludes(desktopCustomDomain, "axios.delete('/api/domain'", 'Desktop custom domain remove must not use unbounded axios response');
  assertIncludes(domainRoute, 'removed: true', 'Domain remove route must return explicit removed acknowledgement');
}

function verifyMobileMenuDiagnosticsAreBounded() {
  const mobileMenu = read('src/components/mobile/screens/MobileMenuScreen.tsx');
  const diagnostics = read('src/components/mobile/utils/mobileMenuDiagnostics.ts');

  assertIncludes(diagnostics, 'secureError', 'Mobile menu diagnostics secure logging');
  assertIncludes(diagnostics, 'getBoundedMobileMenuStringContext', 'Mobile menu diagnostics bounded string context');
  assertIncludes(diagnostics, 'getMobileMenuProjectLogContext', 'Mobile menu diagnostics bounded project context');
  assertIncludes(diagnostics, 'getMobileMenuStoreLogContext', 'Mobile menu diagnostics bounded store context');
  assertIncludes(diagnostics, 'logMobileMenuFailure', 'Mobile menu diagnostics normalized failure logger');
  assertIncludes(mobileMenu, 'mobile_menu_project_image_auto_generation_failed', 'Mobile project image diagnostics');
  assertIncludes(mobileMenu, 'mobile_menu_business_attributes_default_apply_failed', 'Mobile business attributes diagnostics');
  assertIncludes(mobileMenu, 'assertStoreUpdateSucceeded(', 'Mobile menu business-attribute default store acknowledgement guard');
  assertIncludes(mobileMenu, 'applyStoreBusinessAttributeDefaults({', 'Mobile menu transaction-current business-attribute default write');
  assertIncludes(mobileMenu, 'businessAttributes: writeResult.businessAttributes', 'Mobile menu authoritative business-attribute acknowledgement projection');
  assertNotIncludes(mobileMenu, 'updateStore({\n                id: storeDetails.storeId,\n                storeId: storeDetails.storeId,\n                tenantId: storeDetails.tenantId,\n                businessAttributes: nextBusinessAttributes', 'Mobile menu retired stale business-attribute map write');
  assertIncludes(mobileMenu, 'mobile_menu_business_attributes_default_store_update_rejected', 'Mobile menu business-attribute default store rejected acknowledgement code');
  assertIncludes(mobileMenu, 'mobile_menu_project_profile_defaults_apply_failed', 'Mobile project profile defaults diagnostics');
  assertIncludes(mobileMenu, 'assertProjectUpdateSucceeded(', 'Mobile menu project-profile defaults acknowledgement guard');
  assertIncludes(mobileMenu, 'mobile_menu_project_profile_defaults_project_update_rejected', 'Mobile menu project-profile defaults rejected acknowledgement code');
  assertIncludes(mobileMenu, 'mobile_menu_project_persist_failed', 'Mobile project persistence diagnostics');
  assertIncludes(mobileMenu, 'mobile_menu_project_persist_project_update_rejected', 'Mobile project persistence rejected acknowledgement code');
  assertIncludes(mobileMenu, 'mobile_menu_item_image_upload_failed', 'Mobile item image upload diagnostics');
  assertIncludes(mobileMenu, 'mobile_menu_item_image_project_update_failed', 'Mobile item image project-update diagnostics');
  assertIncludes(mobileMenu, 'mobile_menu_item_image_project_update_rejected', 'Mobile item image rejected project acknowledgement code');
  assertIncludes(mobileMenu, 'mobile_menu_active_job_restore_failed', 'Mobile active job restore diagnostics');
  assertIncludes(mobileMenu, 'mobile_menu_comparison_engine_failed', 'Mobile comparison engine diagnostics');
  assertNotIncludes(mobileMenu, 'console.error(', 'Mobile menu direct error logging');
  assertNotIncludes(mobileMenu, 'console.warn(', 'Mobile menu direct warn logging');
  assertNotIncludes(mobileMenu, 'console.log(', 'Mobile menu direct log logging');
  assertNotIncludes(mobileMenu, 'console.debug(', 'Mobile menu direct debug logging');
  assertNotIncludes(mobileMenu, '[MobileProjectImage] Auto-generation skipped:', 'Mobile project image raw diagnostic');
  assertNotIncludes(mobileMenu, '[MobileMenu] Could not apply menu-derived business attributes', 'Mobile business attributes raw diagnostic');
  assertNotIncludes(mobileMenu, '[MobileMenu] Could not apply extracted profile defaults', 'Mobile project profile raw diagnostic');
  assertNotIncludes(mobileMenu, '[MobileMenu] Failed to persist project update:', 'Mobile persist raw diagnostic');
  assertNotIncludes(mobileMenu, '[MobileMenu] Failed to upload item image:', 'Mobile upload raw diagnostic');
  assertNotIncludes(mobileMenu, '[MobileMenu] Failed to restore active job:', 'Mobile active job raw diagnostic');
  assertNotIncludes(mobileMenu, '[MobileMenu] Comparison engine failed:', 'Mobile comparison raw diagnostic');
}

function verifyMobileProjectDiagnosticsAreBounded() {
  const mobileProjectSheet = read('src/components/mobile/components/MobileProjectSelectorSheet.tsx');
  const mobileSpecialMenu = read('src/components/mobile/screens/MobileSpecialMenuScreen.tsx');
  const mobileDesignEditor = read('src/components/mobile/screens/MobileDesignEditorScreen.tsx');
  const desktopProjects = read('src/components/templates/main-app/projects/index.tsx');
  const commandCenterModal = read('src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx');
  const desktopEditor = read('src/components/templates/main-app/projects/editorView/Editor.tsx');
  const bulkActionsSheet = read('src/components/mobile/sheets/BulkActionsSheet.tsx');
  const manageLanguagesSheet = read('src/components/mobile/sheets/ManageLanguagesSheet.tsx');
  const smartRecommendationsSheet = read('src/components/mobile/sheets/SmartRecommendationsSheet.tsx');
  const diagnostics = read('src/components/mobile/utils/mobileProjectDiagnostics.ts');

  [
    [bulkActionsSheet, 'translatedProjectContent.specialMenuDisplayName && updated._specialMenu'],
    [manageLanguagesSheet, 'translatedProjectContent.specialMenuDisplayName && updated._specialMenu'],
    [commandCenterModal, 'translatedProjectContent.specialMenuDisplayName && updated._specialMenu'],
    [desktopEditor, 'translatedProjectContent.specialMenuDisplayName && updated._specialMenu'],
    [desktopEditor, 'translatedProjectContent.specialMenuDisplayName && prevData._specialMenu'],
    [mobileProjectSheet, 'translated.specialMenuDisplayName && detailedProject?._specialMenu'],
    [mobileSpecialMenu, 'translated.specialMenuDisplayName && projectDetails?._specialMenu'],
    [desktopProjects, 'translated.specialMenuDisplayName && detailedProject?._specialMenu'],
  ].forEach(([source, token]) => {
    assertIncludes(source, token, 'Project translation must not manufacture incomplete special-menu metadata');
  });
  assertIncludes(
    desktopEditor,
    '{ code: targetLang.code, isPrimary: false, name: targetLang.name }',
    'New extracted-data translation language must include required primary-state truth',
  );

  assertIncludes(diagnostics, 'secureError', 'Mobile project diagnostics secure logging');
  assertIncludes(diagnostics, 'getBoundedMobileProjectStringContext', 'Mobile project diagnostics bounded string context');
  assertIncludes(diagnostics, 'getMobileProjectLogContext', 'Mobile project diagnostics bounded project context');
  assertIncludes(diagnostics, 'getMobileProjectStoreLogContext', 'Mobile project diagnostics bounded store context');
  assertIncludes(diagnostics, 'logMobileProjectFailure', 'Mobile project diagnostics normalized failure logger');
  assertIncludes(mobileProjectSheet, 'mobile_project_image_prepare_failed', 'Mobile project image prepare diagnostics');
  assertIncludes(mobileProjectSheet, 'mobile_project_public_content_translation_failed', 'Mobile project public-content translation diagnostics');
  assertIncludes(mobileProjectSheet, "getBoundedMobileProjectStringContext('selectedLanguage'", 'Mobile project bounded selected-language context');
  assertIncludes(mobileProjectSheet, 'nameDraftLength', 'Mobile project bounded name-draft length context');
  assertIncludes(mobileProjectSheet, 'descriptionDraftLength', 'Mobile project bounded description-draft length context');
  assertIncludes(mobileProjectSheet, 'mobile_project_delete_failed', 'Mobile project delete diagnostics');
  [
    'mobile_project_selector_save_failed',
    'mobile_project_selector_active_toggle_failed',
    'mobile_project_selector_reset_failed',
    'mobile_project_selector_link_copy_failed',
  ].forEach((failureCode) => {
    assertIncludes(mobileProjectSheet, failureCode, 'Mobile project selector mutation diagnostics');
  });
  assertIncludes(mobileProjectSheet, 'assertProjectUpdateSucceeded(', 'Mobile project selector mutation acknowledgement guard');
  assertIncludes(mobileProjectSheet, 'assertProjectDeleteSucceeded(', 'Mobile project selector delete acknowledgement guard');
  [
    'mobile_project_selector_create_project_update_rejected',
    'mobile_project_selector_duplicate_project_update_rejected',
    'mobile_project_selector_duplicate_image_metadata_update_rejected',
    'mobile_project_selector_duplicate_language_project_update_rejected',
    'mobile_project_selector_metadata_update_rejected',
    'mobile_project_selector_language_project_update_rejected',
    'mobile_project_selector_active_project_update_rejected',
    'mobile_project_selector_special_menu_project_update_rejected',
    'mobile_project_public_content_translation_project_update_rejected',
    'mobile_project_selector_active_toggle_project_update_rejected',
    'mobile_project_selector_reset_project_update_rejected',
    'mobile_project_selector_delete_project_rejected',
  ].forEach((failureCode) => {
    assertIncludes(mobileProjectSheet, failureCode, 'Mobile project selector rejected acknowledgement code');
  });
  assertIncludes(mobileProjectSheet, 'syncPublicSummary: true,', 'Mobile project atomic project/public-summary translation projection');
  assertNotIncludes(mobileProjectSheet, 'mobile_project_public_content_translation_metadata_update_rejected', 'Mobile project retired split translation metadata acknowledgement');
  assertIncludes(mobileProjectSheet, 'buildProjectSelectorMutationLogContext', 'Mobile project selector mutation context helper');
  assertIncludes(mobileProjectSheet, 'nameDraftLanguageCount', 'Mobile project selector bounded draft language count');
  assertIncludes(mobileProjectSheet, 'hasProjectImageDraft', 'Mobile project selector bounded image-draft context');
  assertIncludes(mobileProjectSheet, 'copyMobileProjectSelectorText', 'Mobile project selector copy acknowledgement helper');
  assertIncludes(mobileProjectSheet, 'MOBILE_PROJECT_SELECTOR_COPY_UNAVAILABLE', 'Mobile project selector unavailable clipboard code');
  assertIncludes(mobileProjectSheet, 'MOBILE_PROJECT_SELECTOR_COPY_FALLBACK_FAILED', 'Mobile project selector fallback failure code');
  assertIncludes(mobileProjectSheet, 'hasClipboardWrite', 'Mobile project selector clipboard support metadata');
  assertIncludes(mobileProjectSheet, 'hasCopyFallback', 'Mobile project selector fallback support metadata');
  assertIncludes(mobileProjectSheet, "getBoundedMobileProjectStringContext('sourcedShareUrl', sourcedShareUrl)", 'Mobile project selector bounded sourced share URL context');
  assertIncludes(mobileProjectSheet, "const copied = document.execCommand('copy');", 'Mobile project selector textarea copy acknowledgement');
  [
    'mobile_design_publish_failed',
    'mobile_design_publish_verification_setup_failed',
    'mobile_design_link_copy_failed',
    'mobile_design_native_share_failed',
  ].forEach((failureCode) => {
    assertIncludes(mobileDesignEditor, failureCode, 'Mobile design editor diagnostics');
  });
  assertIncludes(mobileDesignEditor, 'verificationPublicMenuUrl = generateProjectUrl(', 'Mobile design publish verification targets routed public menu URL');
  assertIncludes(mobileDesignEditor, 'storeDetails?.customDomain', 'Mobile design publish verification supports custom domain tenant URLs');
  assertIncludes(mobileDesignEditor, 'Boolean(updatedCopy?.isDefault ?? normalizedDraft.isDefault)', 'Mobile design publish verification preserves default-project URL semantics');
  assertIncludes(mobileDesignEditor, 'void verifyMenuPublish({', 'Mobile design publish verification remains fire-and-forget');
  assertIncludes(mobileDesignEditor, "}).catch((error) => {\n                        logMobileProjectFailure('mobile_design_publish_verification_failed'", 'Mobile design verification promise rejection is observed');
  assertIncludes(mobileDesignEditor, "getBoundedMobileProjectStringContext('publicMenuUrl', verificationPublicMenuUrl)", 'Mobile design verification setup logs bounded URL metadata');
  assertIncludes(mobileDesignEditor, 'assertProjectUpdateSucceeded(', 'Mobile design publish project acknowledgement guard');
  assertIncludes(mobileDesignEditor, 'mobile_design_publish_project_update_rejected', 'Mobile design publish project rejected acknowledgement code');
  assertIncludes(mobileDesignEditor, 'buildMobileDesignLogContext', 'Mobile design editor bounded context helper');
  assertIncludes(mobileDesignEditor, 'copyMobileDesignLink', 'Mobile design editor copy acknowledgement helper');
  assertIncludes(mobileDesignEditor, 'MOBILE_DESIGN_LINK_COPY_UNAVAILABLE', 'Mobile design editor unavailable clipboard code');
  assertIncludes(mobileDesignEditor, 'MOBILE_DESIGN_LINK_COPY_FALLBACK_FAILED', 'Mobile design editor fallback failure code');
  assertIncludes(mobileDesignEditor, 'hasClipboardWrite', 'Mobile design editor clipboard support metadata');
  assertIncludes(mobileDesignEditor, 'hasCopyFallback', 'Mobile design editor fallback support metadata');
  assertIncludes(mobileDesignEditor, "const copied = document.execCommand('copy');", 'Mobile design editor textarea copy acknowledgement');
  assertIncludes(mobileDesignEditor, "getBoundedMobileProjectStringContext('menuUrl', menuUrl)", 'Mobile design editor bounded menu URL context');
  assertIncludes(mobileDesignEditor, 'projectCount: projectsList.length', 'Mobile design editor bounded project count');
  assertIncludes(mobileDesignEditor, 'supportsNativeShare', 'Mobile design editor native-share support context');
  assertIncludes(commandCenterModal, 'assertProjectUpdateSucceeded(', 'Command Center metadata translation acknowledgement guard');
  assertIncludes(commandCenterModal, 'command_center_project_metadata_translation_update_rejected', 'Command Center metadata translation rejected acknowledgement code');
  assertIncludes(desktopEditor, 'assertProjectUpdateSucceeded(', 'Desktop editor metadata translation acknowledgement guard');
  assertIncludes(desktopEditor, 'menu_editor_project_public_content_metadata_update_rejected', 'Desktop editor metadata translation rejected acknowledgement code');
  assertIncludes(bulkActionsSheet, 'assertProjectUpdateSucceeded(', 'Mobile bulk actions metadata translation acknowledgement guard');
  assertIncludes(bulkActionsSheet, 'mobile_bulk_actions_project_metadata_translation_update_rejected', 'Mobile bulk actions metadata translation rejected acknowledgement code');
  [
    'mobile_manage_languages_remove_failed',
    'mobile_manage_languages_add_failed',
    'mobile_manage_languages_repair_failed',
    'mobile_manage_languages_repair_all_failed',
    'mobile_manage_languages_primary_update_failed',
  ].forEach((failureCode) => {
    assertIncludes(manageLanguagesSheet, failureCode, 'Mobile manage languages diagnostics');
  });
  assertIncludes(manageLanguagesSheet, 'buildMobileLanguageLogContext', 'Mobile manage languages bounded context helper');
  assertIncludes(manageLanguagesSheet, 'assertProjectUpdateSucceeded(', 'Mobile manage languages metadata translation acknowledgement guard');
  assertIncludes(manageLanguagesSheet, 'mobile_manage_languages_project_metadata_translation_update_rejected', 'Mobile manage languages metadata translation rejected acknowledgement code');
  assertIncludes(manageLanguagesSheet, 'languageIssueTotal', 'Mobile manage languages bounded issue count');
  assertIncludes(manageLanguagesSheet, 'filesWithDataCount', 'Mobile manage languages bounded file count');
  assertIncludes(manageLanguagesSheet, 'addableLanguages.length === 0', 'Mobile manage languages empty outlet-language state');
  assertIncludes(manageLanguagesSheet, "tMobileSettings('languageRegion')", 'Mobile manage languages language-settings recovery route');
  assertIncludes(manageLanguagesSheet, "tBusinessSettings('selectAvailableLanguages')", 'Mobile manage languages localized empty-state guidance');
  assertIncludes(manageLanguagesSheet, 'disabled={!canTranslate || !canAddLanguage(projectLanguages) || hasNoAddableLanguages}', 'Mobile manage languages empty picker disabled state');
  assertIncludes(smartRecommendationsSheet, 'mobile_smart_recommendations_save_failed', 'Mobile smart recommendations save diagnostics');
  assertIncludes(smartRecommendationsSheet, "getBoundedMobileProjectStringContext('activeLanguage'", 'Mobile smart recommendations bounded language context');
  assertIncludes(smartRecommendationsSheet, 'enabledBlockTypeCount', 'Mobile smart recommendations bounded enabled-block count');
  assertIncludes(smartRecommendationsSheet, 'itemCount', 'Mobile smart recommendations bounded item count');
  assertNotIncludes(mobileProjectSheet, 'console.error(', 'Mobile project selector direct error logging');
  assertNotIncludes(mobileProjectSheet, 'console.warn(', 'Mobile project selector direct warn logging');
  assertNotIncludes(mobileProjectSheet, 'console.log(', 'Mobile project selector direct log logging');
  assertNotIncludes(mobileProjectSheet, 'console.debug(', 'Mobile project selector direct debug logging');
  assertNotIncludes(mobileDesignEditor, 'console.error(', 'Mobile design editor direct error logging');
  assertNotIncludes(mobileDesignEditor, 'console.warn(', 'Mobile design editor direct warn logging');
  assertNotIncludes(mobileDesignEditor, 'console.log(', 'Mobile design editor direct log logging');
  assertNotIncludes(mobileDesignEditor, 'console.debug(', 'Mobile design editor direct debug logging');
  assertNotIncludes(manageLanguagesSheet, 'console.error(', 'Mobile manage languages direct error logging');
  assertNotIncludes(manageLanguagesSheet, 'console.warn(', 'Mobile manage languages direct warn logging');
  assertNotIncludes(manageLanguagesSheet, 'console.log(', 'Mobile manage languages direct log logging');
  assertNotIncludes(manageLanguagesSheet, 'console.debug(', 'Mobile manage languages direct debug logging');
  assertNotIncludes(smartRecommendationsSheet, 'console.error(', 'Mobile smart recommendations direct error logging');
  assertNotIncludes(smartRecommendationsSheet, 'console.warn(', 'Mobile smart recommendations direct warn logging');
  assertNotIncludes(smartRecommendationsSheet, 'console.log(', 'Mobile smart recommendations direct log logging');
  assertNotIncludes(smartRecommendationsSheet, 'console.debug(', 'Mobile smart recommendations direct debug logging');
  assertNotIncludes(mobileProjectSheet, 'Failed to prepare project image:', 'Mobile project selector raw image prepare diagnostic');
  assertNotIncludes(mobileProjectSheet, 'Error deleting project:', 'Mobile project selector raw delete diagnostic');
  assertNotIncludes(mobileProjectSheet, "} catch {\n            Toast.show({ content: 'Could not translate project public content.'", 'Mobile project selector silent translation catch');
  assertNotIncludes(mobileProjectSheet, "} catch {\n            Toast.show({ content: t('saveFailed')", 'Mobile project selector silent save catch');
  assertNotIncludes(mobileProjectSheet, "} catch {\n            Toast.show({\n                content: tShare('copyFailedLabel'", 'Mobile project selector silent copy catch');
  assertNotIncludes(mobileProjectSheet, "await navigator.clipboard.writeText(withSource(shareUrl, 'copy'));\n            setManagingProjectId(null);", 'Mobile project selector copy must not use unguarded Clipboard API success');
  assertNotIncludes(mobileProjectSheet, "document.execCommand('copy');\n            setManagingProjectId(null);", 'Mobile project selector textarea fallback must not assume success');
  assertNotIncludes(mobileDesignEditor, 'Publish failed:', 'Mobile design editor raw publish diagnostic');
  assertNotIncludes(mobileDesignEditor, "} catch {\n                return;", 'Mobile design editor silent publish verification catch');
  assertNotIncludes(mobileDesignEditor, "} catch {\n            Toast.show({ content: tShare('copyFailedLabel'", 'Mobile design editor silent copy catch');
  assertNotIncludes(mobileDesignEditor, 'await navigator.clipboard.writeText(value);\n            Toast.show', 'Mobile design editor copy must not use unguarded Clipboard API success');
  assertNotIncludes(mobileDesignEditor, "document.execCommand('copy');\n            Toast.show", 'Mobile design editor textarea copy must not assume success');
  assertNotIncludes(manageLanguagesSheet, "} catch {\n                    Toast.show({ content: t('languageUpdateFailed')", 'Mobile manage languages silent remove catch');
  assertNotIncludes(manageLanguagesSheet, "} catch {\n            Toast.show({ content: t('languageUpdateFailed')", 'Mobile manage languages silent primary-language catch');
  assertNotIncludes(smartRecommendationsSheet, "} catch {\n            Toast.show({ content: t('smartRecommendationsSaveFailed')", 'Mobile smart recommendations silent save catch');
}

function verifyMobileOwnerDiagnosticsAreBounded() {
  const mobileFeedback = read('src/components/mobile/screens/MobileFeedbackScreen.tsx');
  const mobileFeedbackDetail = read('src/components/mobile/screens/MobileFeedbackDetail.tsx');
  const mobileCommunicationKit = read('src/components/mobile/components/CommunicationKit.tsx');
  const mobileQrCodeSheet = read('src/components/mobile/components/MobileQrCodeSheet.tsx');
  const mobileProjectSheet = read('src/components/mobile/components/MobileProjectSelectorSheet.tsx');
  const mobileDesignEditor = read('src/components/mobile/screens/MobileDesignEditorScreen.tsx');
  const mobileMenu = read('src/components/mobile/screens/MobileMenuScreen.tsx');
  const mobileHours = read('src/components/mobile/screens/MobileHoursScreen.tsx');
  const mobileOfficialPage = read('src/components/mobile/screens/MobileOfficialPageScreen.tsx');
  const mobilePosSync = read('src/components/mobile/screens/MobilePosSyncScreen.tsx');
  const mobileSeoAnalytics = read('src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx');
  const mobileShare = read('src/components/mobile/screens/MobileShareScreen.tsx');
  const posSyncTestResponse = read('src/lib/posSync/testResponse.ts');
  const diagnostics = read('src/components/mobile/utils/mobileOwnerDiagnostics.ts');
  const openMobilePublicLink = read('src/components/mobile/utils/openMobilePublicLink.ts');

  assertIncludes(diagnostics, 'secureError', 'Mobile owner diagnostics secure logging');
  assertIncludes(diagnostics, 'getBoundedMobileOwnerStringContext', 'Mobile owner diagnostics bounded string context');
  assertIncludes(diagnostics, 'getMobileOwnerStoreLogContext', 'Mobile owner diagnostics bounded store context');
  assertIncludes(diagnostics, 'logMobileOwnerFailure', 'Mobile owner diagnostics normalized failure logger');
  assertIncludes(openMobilePublicLink, 'mobile_public_link_open_failed', 'Mobile public link helper blocked-open diagnostics');
  assertIncludes(openMobilePublicLink, 'openIsolatedBrowserUrl(url)', 'Mobile public link helper isolated blank open');
  assertIncludes(openMobilePublicLink, "getBoundedMobileOwnerStringContext('source', options.source)", 'Mobile public link helper bounded source context');
  assertIncludes(openMobilePublicLink, "getBoundedMobileOwnerStringContext('publicLinkUrl', url)", 'Mobile public link helper bounded URL context');
  assertIncludes(openMobilePublicLink, "Toast.show({ content: 'Unable to open link'", 'Mobile public link helper fixed owner feedback');
  assertNotIncludes(openMobilePublicLink, 'window.open(', 'Mobile public link helper no-opener handle acknowledgement');
  assertIncludes(mobileProjectSheet, "source: 'mobile_project_selector'", 'Mobile project selector public-link source label');
  assertIncludes(mobileFeedback, "source: 'mobile_feedback'", 'Mobile feedback public-link source label');
  assertIncludes(mobileDesignEditor, "source: 'mobile_design_editor'", 'Mobile design editor public-link source label');
  assertIncludes(mobileOfficialPage, "source: 'mobile_official_page'", 'Mobile Official Page public-link source label');
  assertIncludes(mobileMenu, "source: 'mobile_menu'", 'Mobile Menu public-link source label');
  assertIncludes(mobileHours, "source: 'mobile_today_hours'", 'Mobile Today hours public-link source label');
  assertIncludes(mobileShare, "source: 'mobile_share'", 'Mobile Share public-link source label');
  assertIncludes(mobileShare, 'if (!subdomain && !customDomain) return null;', 'Mobile Share missing tenant-address render guard');
  assertIncludes(mobileShare, 'Set up your customer link', 'Mobile Share missing tenant-address recovery title');
  assertIncludes(mobileShare, 'onOpenDomainSettings', 'Mobile Share missing tenant-address recovery action');
  [
    'mobile_feedback_load_failed',
    'mobile_feedback_link_copy_failed',
    'mobile_feedback_native_share_failed',
  ].forEach((failureCode) => {
    assertIncludes(mobileFeedback, failureCode, 'Mobile feedback diagnostics');
  });
  assertIncludes(mobileFeedback, 'assertFeedbackListLoadSucceeded(', 'Mobile feedback list acknowledgement usage');
  assertIncludes(mobileFeedback, 'mobile_feedback_list_load_rejected', 'Mobile feedback rejected list acknowledgement code');
	  assertIncludes(mobileFeedback, 'buildFeedbackLinkLogContext', 'Mobile feedback bounded link context helper');
	  assertIncludes(mobileFeedback, 'copyMobileFeedbackLinkToClipboard', 'Mobile feedback copy acknowledgement helper');
	  assertIncludes(mobileFeedback, 'MOBILE_FEEDBACK_LINK_COPY_UNAVAILABLE', 'Mobile feedback unavailable clipboard code');
	  assertIncludes(mobileFeedback, 'MOBILE_FEEDBACK_LINK_COPY_FALLBACK_FAILED', 'Mobile feedback fallback failure code');
	  assertIncludes(mobileFeedback, 'let clipboardWriteError: unknown;', 'Mobile feedback Clipboard API rejection tracking');
	  assertIncludes(mobileFeedback, 'clipboardWriteRejected: Boolean(clipboardWriteError)', 'Mobile feedback unavailable-copy rejection context');
	  assertIncludes(mobileFeedback, 'hasClipboardWrite', 'Mobile feedback clipboard support metadata');
	  assertIncludes(mobileFeedback, 'hasCopyFallback', 'Mobile feedback fallback support metadata');
	  assertIncludes(mobileFeedback, "const copied = document.execCommand('copy');", 'Mobile feedback textarea copy acknowledgement');
	  assertIncludes(mobileFeedback, "getBoundedMobileOwnerStringContext('feedbackUrl', feedbackUrl)", 'Mobile feedback bounded feedback URL context');
	  assertIncludes(mobileFeedback, "getBoundedMobileOwnerStringContext('feedbackQrUrl', feedbackQrUrl)", 'Mobile feedback bounded QR URL context');
	  assertIncludes(mobileFeedback, 'projectCount: projectsList.length', 'Mobile feedback bounded project count');
	  assertIncludes(mobileFeedback, 'supportsNativeShare', 'Mobile feedback native-share support context');
	  assertNotIncludes(mobileFeedback, 'await navigator.clipboard.writeText(feedbackUrl);\n            Toast.show', 'Mobile feedback link copy must not use unguarded Clipboard API success');
	  assertNotIncludes(mobileFeedback, "if (hasMobileFeedbackClipboardWrite()) {\n        await navigator.clipboard.writeText(feedbackUrl);\n        return;\n    }", 'Mobile feedback Clipboard API rejection must not skip acknowledged fallback');
	  assertNotIncludes(mobileFeedback, "document.execCommand('copy');\n        Toast.show", 'Mobile feedback textarea copy must not assume success');
	  assertIncludes(mobileFeedbackDetail, 'mobile_feedback_status_update_failed', 'Mobile feedback detail status diagnostics');
  assertIncludes(mobileFeedbackDetail, 'mobile_feedback_reply_copy_failed', 'Mobile feedback detail reply copy diagnostics');
  assertIncludes(mobileFeedbackDetail, 'assertFeedbackStatusUpdateSucceeded(', 'Mobile feedback detail status acknowledgement usage');
  assertIncludes(mobileFeedbackDetail, 'mobile_feedback_status_update_rejected', 'Mobile feedback detail rejected status acknowledgement code');
  assertIncludes(mobileFeedbackDetail, 'copyRuntimeTextToClipboard', 'Mobile feedback detail manual reply copy');
  assertIncludes(mobileFeedbackDetail, 'generateWhatsAppLink', 'Mobile feedback detail manual WhatsApp handoff');
  assertNotIncludes(mobileFeedbackDetail, "updateFeedbackStatus(feedback.id, 'resolved', trimmedReply)", 'Mobile feedback detail false provider send/persist path');
  assert(
    mobileFeedbackDetail.indexOf('const updated = await updateFeedbackStatus(') < mobileFeedbackDetail.indexOf('assertFeedbackStatusUpdateSucceeded(')
    && mobileFeedbackDetail.indexOf('assertFeedbackStatusUpdateSucceeded(') < mobileFeedbackDetail.indexOf("onStatusUpdate(sourceFeedback.id, 'resolved');"),
    'Mobile feedback resolve must wait for status acknowledgement before local success state advances',
  );
  assertIncludes(mobileFeedbackDetail, "getBoundedMobileOwnerStringContext('feedbackId', feedback.id)", 'Mobile feedback detail bounded feedback ID context');
  assertIncludes(mobileFeedbackDetail, "getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId)", 'Mobile feedback detail bounded store context');
  assertIncludes(mobileFeedbackDetail, 'getFeedbackWriteLogContext(sourceFeedback.status, trimmedReply.length)', 'Mobile feedback detail bounded reply length context');
  assertIncludes(mobileFeedbackDetail, 'hasReplyText: replyLength > 0', 'Mobile feedback detail reply text presence context');
  [
    'mobile_qr_sheet_generate_failed',
    'mobile_qr_sheet_copy_failed',
    'mobile_qr_sheet_download_failed',
  ].forEach((failureCode) => {
    assertIncludes(mobileQrCodeSheet, failureCode, 'Mobile QR sheet diagnostics');
  });
  assertIncludes(mobileQrCodeSheet, "getBoundedMobileOwnerStringContext('url', url)", 'Mobile QR sheet bounded URL context');
  assertIncludes(mobileQrCodeSheet, "getBoundedMobileOwnerStringContext('filename', filename)", 'Mobile QR sheet bounded filename context');
  assertIncludes(mobileQrCodeSheet, "getBoundedMobileOwnerStringContext('storeName', storeName)", 'Mobile QR sheet bounded store name context');
  assertIncludes(mobileQrCodeSheet, 'qrDataUrlLength: qrDataUrl?.length || 0', 'Mobile QR sheet bounded generated image length context');
  assertIncludes(mobileQrCodeSheet, 'copyMobileQrSheetUrlToClipboard', 'Mobile QR sheet copy acknowledgement helper');
  assertIncludes(mobileQrCodeSheet, 'MOBILE_QR_SHEET_COPY_UNAVAILABLE', 'Mobile QR sheet unavailable clipboard code');
  assertIncludes(mobileQrCodeSheet, 'MOBILE_QR_SHEET_COPY_FALLBACK_FAILED', 'Mobile QR sheet fallback failure code');
  assertIncludes(mobileQrCodeSheet, 'let clipboardWriteError: unknown;', 'Mobile QR sheet Clipboard API rejection tracking');
  assertIncludes(mobileQrCodeSheet, 'clipboardWriteRejected: Boolean(clipboardWriteError)', 'Mobile QR sheet unavailable-copy rejection context');
  assertIncludes(mobileQrCodeSheet, 'hasClipboardWrite', 'Mobile QR sheet clipboard support metadata');
  assertIncludes(mobileQrCodeSheet, 'hasCopyFallback', 'Mobile QR sheet fallback support metadata');
  assertIncludes(mobileQrCodeSheet, "const copied = document.execCommand('copy');", 'Mobile QR sheet textarea copy acknowledgement');
  assertNotIncludes(mobileQrCodeSheet, 'await navigator.clipboard.writeText(url);\n            Toast.show', 'Mobile QR sheet copy must not use unguarded Clipboard API success');
  assertNotIncludes(mobileQrCodeSheet, "if (hasMobileQrSheetClipboardWrite()) {\n        await navigator.clipboard.writeText(url);\n        return;\n    }", 'Mobile QR sheet Clipboard API rejection must not skip acknowledged fallback');
  assertNotIncludes(mobileQrCodeSheet, "document.execCommand('copy');\n            Toast.show", 'Mobile QR sheet textarea copy must not assume success');
  assertIncludes(mobileProjectSheet, 'diagnosticSource="mobile_project_selector_qr"', 'Mobile project selector QR diagnostic source');
  assertIncludes(mobileFeedback, 'diagnosticSource="mobile_feedback_qr"', 'Mobile feedback QR diagnostic source');
  assertIncludes(mobileDesignEditor, 'diagnosticSource="mobile_design_editor_qr"', 'Mobile design editor QR diagnostic source');
  assertIncludes(mobileOfficialPage, 'diagnosticSource="mobile_official_page_qr"', 'Mobile Official Page QR diagnostic source');
  assertIncludes(mobileShare, 'diagnosticSource="mobile_share_qr"', 'Mobile Share QR diagnostic source');
  [
    'mobile_share_screen_links_load_failed',
    'mobile_share_starter_signal_record_failed',
    'mobile_share_copy_failed',
    'mobile_share_printable_preview_failed',
    'mobile_share_printable_render_failed',
    'mobile_share_pdf_download_failed',
    'mobile_share_structured_export_failed',
    'mobile_share_menu_kit_download_failed',
    'mobile_share_menu_kit_asset_failed',
    'mobile_share_feedback_qr_download_failed',
    'mobile_share_native_share_failed',
  ].forEach((failureCode) => {
    assertIncludes(mobileShare, failureCode, 'Mobile Share diagnostics');
  });
  assertIncludes(mobileShare, 'buildMobileShareLogContext', 'Mobile Share bounded log context builder');
  assertIncludes(mobileShare, 'getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId)', 'Mobile Share bounded store context');
  assertIncludes(mobileShare, "getBoundedMobileOwnerStringContext('menuLink', data?.menuLink)", 'Mobile Share bounded menu URL context');
  assertIncludes(mobileShare, "getBoundedMobileOwnerStringContext('obpLink', data?.obpLink)", 'Mobile Share bounded OBP URL context');
  assertIncludes(mobileShare, "getBoundedMobileOwnerStringContext('feedbackQrLink', data?.feedbackQrLink)", 'Mobile Share bounded feedback QR URL context');
  assertIncludes(mobileShare, 'allProjectCount: data?.allProjects.length || 0', 'Mobile Share project count context');
  assertIncludes(mobileShare, 'selectedPrintableAssetId', 'Mobile Share printable asset context');
  assertIncludes(mobileShare, 'copyMobileShareText', 'Mobile Share copy acknowledgement helper');
  assertIncludes(mobileShare, 'MOBILE_SHARE_COPY_UNAVAILABLE', 'Mobile Share unavailable clipboard code');
  assertIncludes(mobileShare, 'MOBILE_SHARE_COPY_FALLBACK_FAILED', 'Mobile Share fallback failure code');
  assertIncludes(mobileShare, 'hasClipboardWrite', 'Mobile Share clipboard support metadata');
  assertIncludes(mobileShare, 'hasCopyFallback', 'Mobile Share fallback support metadata');
  assertIncludes(mobileShare, "const copied = document.execCommand('copy');", 'Mobile Share textarea copy acknowledgement');
  {
    const copyIndex = mobileShare.indexOf('await copyMobileShareText(value);');
    const starterSignalIndex = mobileShare.indexOf('recordStarterSignal(starterSignal);', copyIndex);
    assert(
      copyIndex !== -1 && starterSignalIndex > copyIndex,
      'Mobile Share starter signal must record only after acknowledged copy',
    );
  }
  assertIncludes(mobileShare, "diagnosticContext={buildMobileShareLogContext('communication_kit')}", 'Mobile Share communication kit bounded context handoff');
  [
    'mobile_communication_kit_copy_failed',
    'mobile_communication_kit_native_share_failed',
    'mobile_communication_kit_whatsapp_open_failed',
  ].forEach((failureCode) => {
    assertIncludes(mobileCommunicationKit, failureCode, 'Mobile Communication Kit diagnostics');
  });
  assertIncludes(mobileCommunicationKit, "getBoundedMobileOwnerStringContext('templateId', template.id)", 'Mobile Communication Kit bounded template ID context');
  assertIncludes(mobileCommunicationKit, "getBoundedMobileOwnerStringContext('templateTitle', template.title)", 'Mobile Communication Kit bounded title context');
  assertIncludes(mobileCommunicationKit, 'copyMessageLength: copyMessage.length', 'Mobile Communication Kit bounded copy message length');
  assertIncludes(mobileCommunicationKit, 'copyMobileCommunicationKitMessage', 'Mobile Communication Kit copy acknowledgement helper');
  assertIncludes(mobileCommunicationKit, 'MOBILE_COMMUNICATION_KIT_COPY_UNAVAILABLE', 'Mobile Communication Kit unavailable clipboard code');
  assertIncludes(mobileCommunicationKit, 'MOBILE_COMMUNICATION_KIT_COPY_FALLBACK_FAILED', 'Mobile Communication Kit fallback failure code');
  assertIncludes(mobileCommunicationKit, 'let clipboardWriteError: unknown;', 'Mobile Communication Kit Clipboard API rejection tracking');
  assertIncludes(mobileCommunicationKit, 'clipboardWriteRejected: Boolean(clipboardWriteError)', 'Mobile Communication Kit unavailable-copy rejection context');
  assertIncludes(mobileCommunicationKit, 'hasClipboardWrite', 'Mobile Communication Kit clipboard support metadata');
  assertIncludes(mobileCommunicationKit, 'hasCopyFallback', 'Mobile Communication Kit fallback support metadata');
  assertIncludes(mobileCommunicationKit, "const copied = document.execCommand('copy');", 'Mobile Communication Kit textarea copy acknowledgement');
  assertIncludes(mobileCommunicationKit, 'nativeShareMessageLength: nativeShareMessage.length', 'Mobile Communication Kit bounded native share message length');
  assertIncludes(mobileCommunicationKit, 'whatsappMessageLength: whatsappMessage.length', 'Mobile Communication Kit bounded WhatsApp message length');
  assertIncludes(mobileCommunicationKit, 'whatsappUrlLength: whatsappUrl.length', 'Mobile Communication Kit bounded WhatsApp URL length');
  assertIncludes(mobileCommunicationKit, 'openIsolatedBrowserUrl(whatsappUrl)', 'Mobile Communication Kit isolated WhatsApp open');
  [
    'mobile_official_page_save_failed',
    'mobile_official_page_cover_upload_failed',
    'mobile_official_page_cover_prepare_failed',
    'mobile_official_page_cover_generate_failed',
    'mobile_official_page_photo_upload_failed',
    'mobile_official_page_photo_prepare_failed',
    'mobile_official_page_link_copy_failed',
    'mobile_official_page_native_share_failed',
    'mobile_official_page_store_update_rejected',
  ].forEach((failureCode) => {
    assertIncludes(mobileOfficialPage, failureCode, 'Mobile Official Page diagnostics');
  });
  assertIncludes(mobileOfficialPage, 'assertStoreUpdateSucceeded(', 'Mobile Official Page store update acknowledgement guard');
  assertIncludes(mobileOfficialPage, 'buildMobileOfficialPageLinkLogContext', 'Mobile Official Page bounded link context helper');
  assertIncludes(mobileOfficialPage, 'copyMobileOfficialPageLink', 'Mobile Official Page copy acknowledgement helper');
  assertIncludes(mobileOfficialPage, 'MOBILE_OFFICIAL_PAGE_LINK_COPY_UNAVAILABLE', 'Mobile Official Page unavailable clipboard code');
  assertIncludes(mobileOfficialPage, 'MOBILE_OFFICIAL_PAGE_LINK_COPY_FALLBACK_FAILED', 'Mobile Official Page fallback failure code');
  assertIncludes(mobileOfficialPage, 'hasClipboardWrite', 'Mobile Official Page clipboard support metadata');
  assertIncludes(mobileOfficialPage, 'hasCopyFallback', 'Mobile Official Page fallback support metadata');
  assertIncludes(mobileOfficialPage, "const copied = document.execCommand('copy');", 'Mobile Official Page textarea copy acknowledgement');
  assertIncludes(mobileOfficialPage, "getBoundedMobileOwnerStringContext('officialPageUrl', officialPageUrl)", 'Mobile Official Page bounded OBP URL context');
  assertIncludes(mobileOfficialPage, "getBoundedMobileOwnerStringContext('selectedProjectId', selectedProjectId)", 'Mobile Official Page bounded selected project context');
  assertIncludes(mobileOfficialPage, 'projectCount: projectsList.length', 'Mobile Official Page bounded project count');
  assertIncludes(mobileOfficialPage, 'supportsNativeShare', 'Mobile Official Page native-share support context');
  assertIncludes(mobileOfficialPage, 'photoDeleteCount: photoDeleteQueue.length', 'Mobile Official Page bounded photo delete context');
  assertIncludes(mobileOfficialPage, 'hasExistingCover: Boolean(formData.businessCover)', 'Mobile Official Page bounded cover context');
  assertIncludes(mobileOfficialPage, 'existingPhotoCount: formData.photos.filter(Boolean).length', 'Mobile Official Page bounded photo context');
  assertNotIncludes(mobileOfficialPage, 'await navigator.clipboard.writeText(value);\n            Toast.show', 'Mobile Official Page copy must not use unguarded Clipboard API success');
  assertNotIncludes(mobileOfficialPage, "document.execCommand('copy');\n            Toast.show", 'Mobile Official Page textarea copy must not assume success');
  [
    'mobile_analytics_settings_save_failed',
    'mobile_seo_settings_save_failed',
    'mobile_seo_analytics_external_link_open_failed',
  ].forEach((failureCode) => {
    assertIncludes(mobileSeoAnalytics, failureCode, 'Mobile SEO/analytics settings diagnostics');
  });
  assertNotIncludes(mobileSeoAnalytics, 'mobile_seo_analytics_field_save_failed', 'Mobile SEO/analytics retired dead field-save diagnostics');
  assertIncludes(mobileSeoAnalytics, "getBoundedMobileOwnerStringContext('googleAnalyticsId', analyticsDraft.googleAnalyticsId)", 'Mobile analytics GA bounded context');
  assertIncludes(mobileSeoAnalytics, 'normalizeGoogleAnalyticsMeasurementId(analyticsDraft.googleAnalyticsId)', 'Mobile analytics GA validation boundary');
  assertIncludes(mobileSeoAnalytics, 'normalizeMetaPixelId(analyticsDraft.facebookPixelId)', 'Mobile analytics Meta Pixel validation boundary');
  assertIncludes(mobileSeoAnalytics, 'normalizeGoogleSearchConsoleVerification(analyticsDraft.googleSearchConsole)', 'Mobile analytics Search Console validation boundary');
  assertIncludes(mobileSeoAnalytics, '!areAnalyticsDraftsEqual(analyticsDraft, originalAnalyticsState)', 'Mobile analytics stable dirty-state comparison');
  assertIncludes(mobileSeoAnalytics, 'These are draft choices. Close this guide and choose Save Changes to apply them to your store.', 'Mobile analytics wizard draft truth');
  assertIncludes(mobileSeoAnalytics, 'Review your analytics settings.', 'Mobile analytics wizard review truth');
  assertIncludes(mobileSeoAnalytics, "'Choose Save Changes on Analytics Settings'", 'Mobile analytics wizard explicit save recovery');
  assertIncludes(mobileSeoAnalytics, "? 'Close Guide' : 'Next Step'", 'Mobile analytics wizard truthful completion action');
  assertIncludes(mobileSeoAnalytics, 'Keep Menu activity on to measure menu, item, search, and action demand', 'Mobile analytics quick-guide supported activity truth');
  assertIncludes(mobileSeoAnalytics, 'MenuList internal analytics reports menu opens, item and search demand, unavailable-item interest, Featured usage, Official Business Page actions, customer-app activity, entry source, and anonymous session totals.', 'Mobile analytics complete-guide internal activity truth');
  assertNotIncludes(mobileSeoAnalytics, 'Everything is running normally.', 'Mobile analytics wizard unverified health claim');
  assertNotIncludes(mobileSeoAnalytics, 'Your analytics setup is ready.', 'Mobile analytics wizard false completion claim');
  assertNotIncludes(mobileSeoAnalytics, 'Enable sales tracking for order and revenue visibility', 'Mobile analytics quick-guide unsupported sales claim');
  assertNotIncludes(mobileSeoAnalytics, 'add-to-cart actions, and purchases', 'Mobile analytics unsupported commerce-event claim');
  assertNotIncludes(mobileSeoAnalytics, 'Enhanced E-commerce Features', 'Mobile analytics unsupported e-commerce section');
  assertNotIncludes(mobileSeoAnalytics, 'GA4 E-commerce Guide', 'Mobile analytics unsupported e-commerce resource');
  assertIncludes(mobileSeoAnalytics, "googleAnalyticsId: normalizedGoogleAnalyticsId || ''", 'Mobile analytics normalized GA write');
  assertIncludes(mobileSeoAnalytics, "facebookPixelId: normalizedFacebookPixelId || ''", 'Mobile analytics normalized Meta Pixel write');
  assertIncludes(mobileSeoAnalytics, "getBoundedMobileOwnerStringContext('canonicalUrl', canonicalUrl)", 'Mobile SEO canonical URL bounded context');
  assertIncludes(mobileSeoAnalytics, 'enabledTrackingCount: countEnabledAnalyticsTracking(analyticsDraft)', 'Mobile analytics enabled tracking count context');
  assertIncludes(mobileSeoAnalytics, 'localizedDraftLanguageCount: Object.keys(localizedSeoDrafts).length', 'Mobile SEO localized draft count context');
  assertIncludes(mobileSeoAnalytics, 'filledSeoDraftLanguageCount: countFilledSeoDraftLanguages(localizedSeoDrafts)', 'Mobile SEO filled language count context');
  assertIncludes(mobileSeoAnalytics, 'openIsolatedBrowserUrl(url)', 'Mobile SEO/analytics isolated external link open');
  assertIncludes(mobileSeoAnalytics, "getBoundedMobileOwnerStringContext('source', source)", 'Mobile SEO/analytics external link bounded source context');
  assertIncludes(mobileSeoAnalytics, "getBoundedMobileOwnerStringContext('externalLinkUrl', url)", 'Mobile SEO/analytics external link bounded URL context');
  assertNotIncludes(mobileSeoAnalytics, 'function openExternalLink(url: string)', 'Mobile SEO/analytics external link opens must use the bounded handler');
  assertIncludes(mobilePosSync, 'mobile_pos_sync_settings_save_failed', 'Mobile POS Sync settings save diagnostics');
  assertIncludes(mobilePosSync, 'assertStoreUpdateSucceeded(', 'Mobile POS Sync store update acknowledgement guard');
  assertIncludes(mobilePosSync, 'mobile_pos_sync_store_update_rejected', 'Mobile POS Sync store rejected acknowledgement code');
  assertIncludes(mobilePosSync, 'mobile_pos_sync_secret_copy_failed', 'Mobile POS Sync secret-copy diagnostics');
  assertIncludes(posSyncTestResponse, 'POS_SYNC_TEST_RESPONSE_JSON_MAX_BYTES = 16 * 1024', 'POS Sync test response byte cap');
  assertIncludes(posSyncTestResponse, 'isPosSyncTestResponse', 'POS Sync test response shape guard');
  assertIncludes(posSyncTestResponse, 'isSuccessfulPosSyncTestResponse', 'POS Sync successful test response acknowledgement guard');
  assertIncludes(posSyncTestResponse, 'export const POS_SYNC_TEST_REQUEST_POLICY', 'POS Sync shared test request policy export');
  assertIncludes(posSyncTestResponse, "cache: 'no-store'", 'POS Sync shared test request bypasses browser cache');
  assertIncludes(posSyncTestResponse, "credentials: 'same-origin'", 'POS Sync shared test request keeps credentials same-origin');
  assertIncludes(posSyncTestResponse, "redirect: 'manual'", 'POS Sync shared test request does not follow redirects');
  assertIncludes(mobilePosSync, 'POS_SYNC_TEST_REQUEST_POLICY', 'Mobile POS Sync test request policy');
  assertIncludes(mobilePosSync, 'from \'@lib/posSync/testResponse\'', 'Mobile POS Sync imports shared test response helper');
  assertIncludes(mobilePosSync, '...POS_SYNC_TEST_REQUEST_POLICY', 'Mobile POS Sync uses test request policy');
  assertIncludes(mobilePosSync, 'readJsonResponseWithLimit<unknown>', 'Mobile POS Sync bounded test response parser');
  assertIncludes(mobilePosSync, 'mobile_pos_sync_test_response_parse_failed', 'Mobile POS Sync test response parse diagnostics');
  assertIncludes(mobilePosSync, 'mobile_pos_sync_test_response_invalid', 'Mobile POS Sync test response invalid diagnostics');
  assertIncludes(mobilePosSync, 'response.ok && isSuccessfulPosSyncTestResponse(data)', 'Mobile POS Sync success requires HTTP and shaped acknowledgement');
  assertIncludes(mobilePosSync, "getBoundedMobileOwnerStringContext('status', nextPosSync.status)", 'Mobile POS Sync status bounded context');
  assertIncludes(mobilePosSync, 'webhookUrlLength: String(nextPosSync.webhookUrl || \'\').length', 'Mobile POS Sync webhook URL bounded length context');
  assertIncludes(mobilePosSync, 'hasWebhookSecret: Boolean(webhookSecret)', 'Mobile POS Sync protected secret presence context');
  assertIncludes(mobilePosSync, 'webhookSecretLength: webhookSecret.length', 'Mobile POS Sync secret-copy bounded secret length context');
  assertNotIncludes(mobilePosSync, 'nextPosSync.webhookSecret', 'Mobile POS Sync must not persist or diagnose a store-document secret');
  assertNotIncludes(mobilePosSync, 'pendingSecretRotationAudit', 'Mobile POS Sync rotation must be server-acknowledged immediately');
  assertNotIncludes(mobileFeedback, 'console.error(', 'Mobile feedback direct error logging');
  assertNotIncludes(mobileFeedback, 'console.warn(', 'Mobile feedback direct warn logging');
  assertNotIncludes(mobileFeedback, 'console.log(', 'Mobile feedback direct log logging');
  assertNotIncludes(mobileFeedback, 'console.debug(', 'Mobile feedback direct debug logging');
  assertNotIncludes(mobileFeedbackDetail, 'catch {', 'Mobile feedback detail silent catch');
  assertNotIncludes(mobilePosSync, "} catch {\n            Toast.show({ content: 'Unable to copy secret.'", 'Mobile POS Sync secret-copy silent catch');
  assertNotIncludes(mobilePosSync, 'const data = await response.json()', 'Mobile POS Sync test direct JSON parsing');
  assertNotIncludes(mobilePosSync, 'if (data?.success)', 'Mobile POS Sync test must not use loose success acknowledgement');
  assertNotIncludes(mobilePosSync, 'const POS_SYNC_TEST_REQUEST_POLICY = {', 'Mobile POS Sync must use shared test request policy');
  assertNotIncludes(mobileFeedbackDetail, 'console.error(', 'Mobile feedback detail direct error logging');
  assertNotIncludes(mobileFeedbackDetail, 'console.warn(', 'Mobile feedback detail direct warn logging');
  assertNotIncludes(mobileFeedbackDetail, 'console.log(', 'Mobile feedback detail direct log logging');
  assertNotIncludes(mobileFeedbackDetail, 'console.debug(', 'Mobile feedback detail direct debug logging');
  assertNotIncludes(mobileQrCodeSheet, 'catch {', 'Mobile QR sheet silent catch');
  assertNotIncludes(mobileQrCodeSheet, 'console.error(', 'Mobile QR sheet direct error logging');
  assertNotIncludes(mobileQrCodeSheet, 'console.warn(', 'Mobile QR sheet direct warn logging');
  assertNotIncludes(mobileQrCodeSheet, 'console.log(', 'Mobile QR sheet direct log logging');
  assertNotIncludes(mobileQrCodeSheet, 'console.debug(', 'Mobile QR sheet direct debug logging');
  assertNotIncludes(mobileShare, 'catch {', 'Mobile Share silent catch');
  assertNotIncludes(mobileShare, 'console.error(', 'Mobile Share direct error logging');
  assertNotIncludes(mobileShare, 'console.warn(', 'Mobile Share direct warn logging');
  assertNotIncludes(mobileShare, 'console.log(', 'Mobile Share direct log logging');
  assertNotIncludes(mobileShare, 'console.debug(', 'Mobile Share direct debug logging');
  assertNotIncludes(mobileShare, 'recordStarterActivationSignal(storeDetails.storeId, signal).catch(() =>', 'Mobile Share silent starter-signal catch');
  assertNotIncludes(mobileShare, 'await navigator.clipboard.writeText(value);\n            Toast.show', 'Mobile Share copy must not use unguarded Clipboard API success');
  assertNotIncludes(mobileShare, "document.execCommand('copy');\n            Toast.show", 'Mobile Share textarea fallback must not assume success');
	  assertNotIncludes(mobileCommunicationKit, 'catch {', 'Mobile Communication Kit silent catch');
	  assertNotIncludes(mobileCommunicationKit, 'await navigator.clipboard.writeText(copyMessage);\n            setCopied(true);', 'Mobile Communication Kit copy must not use unguarded Clipboard API success');
	  assertNotIncludes(mobileCommunicationKit, "if (hasMobileCommunicationKitClipboardWrite()) {\n        await navigator.clipboard.writeText(copyMessage);\n        return;\n    }", 'Mobile Communication Kit Clipboard API rejection must not skip acknowledged fallback');
	  assertNotIncludes(mobileCommunicationKit, "document.execCommand('copy');\n        setCopied(true);", 'Mobile Communication Kit textarea copy must not assume success');
	  assertNotIncludes(mobileCommunicationKit, "window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, '_blank')", 'Mobile Communication Kit unsafe WhatsApp open');
  assertNotIncludes(mobileCommunicationKit, 'console.error(', 'Mobile Communication Kit direct error logging');
  assertNotIncludes(mobileCommunicationKit, 'console.warn(', 'Mobile Communication Kit direct warn logging');
  assertNotIncludes(mobileCommunicationKit, 'console.log(', 'Mobile Communication Kit direct log logging');
  assertNotIncludes(mobileCommunicationKit, 'console.debug(', 'Mobile Communication Kit direct debug logging');
  assertNotIncludes(mobileSeoAnalytics, 'console.error(', 'Mobile SEO/analytics direct error logging');
  assertNotIncludes(mobileSeoAnalytics, 'console.warn(', 'Mobile SEO/analytics direct warn logging');
  assertNotIncludes(mobileSeoAnalytics, 'console.log(', 'Mobile SEO/analytics direct log logging');
  assertNotIncludes(mobileSeoAnalytics, 'console.debug(', 'Mobile SEO/analytics direct debug logging');
  assertNotIncludes(mobilePosSync, 'console.error(', 'Mobile POS Sync direct error logging');
  assertNotIncludes(mobilePosSync, 'console.warn(', 'Mobile POS Sync direct warn logging');
  assertNotIncludes(mobilePosSync, 'console.log(', 'Mobile POS Sync direct log logging');
  assertNotIncludes(mobilePosSync, 'console.debug(', 'Mobile POS Sync direct debug logging');
  assertNotIncludes(mobileFeedback, 'Failed to load feedback:', 'Mobile feedback raw load diagnostic');
  assertNotIncludes(mobileFeedback, "} catch {\n            Toast.show({ content: t('failedToUpdate')", 'Mobile feedback silent copy/share catch');
  assertNotIncludes(mobileOfficialPage, "} catch {\n            Toast.show({ content: tShare('copyFailedLabel'", 'Mobile Official Page silent copy catch');
}

function verifyOfficialBusinessPageOwnerDiagnosticsAreBounded() {
  const businessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
  const obpLinkCard = read('src/components/templates/main-app/businessSettings/OBPLinkCard.tsx');
  const googleListingGuide = read('src/components/templates/main-app/businessSettings/tabs/GoogleListingGuide.tsx');
  const googleListingCard = read('src/components/templates/main-app/dashboard/OwnerDashboard/GoogleListingCard.tsx');
  const ownerDashboard = read('src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx');
  const menuListEnUsLocale = read('public/locales/menulist.ai/en-US.json');
  const projectShareModal = read('src/components/templates/main-app/projects/b2cView/shareModal/index.tsx');
  const mobileShareScreen = read('src/components/mobile/screens/MobileShareScreen.tsx');

  assertIncludes(
    businessSettings,
    "messageApi.success('Business settings saved')",
    'Desktop Business Settings successful-write acknowledgement',
  );
  assertIncludes(
    businessSettings,
    'const [messageApi, messageContextHolder] = message.useMessage();',
    'Desktop Business Settings context-bound feedback API',
  );
  assertIncludes(
    businessSettings,
    '{messageContextHolder}',
    'Desktop Business Settings feedback context holder',
  );

  [
    'obp_link_card_default_project_load_failed',
    'obp_link_card_copy_failed',
    'obp_link_card_copy_message_failed',
    'obp_link_card_whatsapp_open_failed',
    'obp_link_card_open_failed',
    'obp_link_card_qr_download_failed',
    'obp_link_card_share_tracking_failed',
  ].forEach((failureCode) => {
    assertIncludes(obpLinkCard, failureCode, 'OBPLinkCard diagnostics');
  });
  assertIncludes(obpLinkCard, 'buildOBPLinkCardLogContext', 'OBPLinkCard bounded context helper');
  assertIncludes(obpLinkCard, "getBoundedStoreStringContext('obpUrl', obpUrl)", 'OBPLinkCard bounded OBP URL context');
  assertIncludes(obpLinkCard, "getBoundedStoreStringContext('menuUrl', menuUrl)", 'OBPLinkCard bounded menu URL context');
  assertIncludes(obpLinkCard, "getBoundedStoreStringContext('copyUrl', obpCopyUrl)", 'OBPLinkCard bounded copy URL context');
  assertIncludes(obpLinkCard, 'copyMessageLength: msg.length', 'OBPLinkCard bounded copy-message length');
  assertIncludes(obpLinkCard, 'copyOBPLinkCardText', 'OBPLinkCard copy acknowledgement helper');
  assertIncludes(obpLinkCard, 'if (!storeId || !tenantId || !obpTrackingEnabled) return;', 'OBPLinkCard share analytics complete scope guard');
  assertIncludes(obpLinkCard, 'tenantId: String(tenantId),', 'OBPLinkCard share analytics tenant scope');
  assertIncludes(obpLinkCard, 'OBP_LINK_CARD_COPY_UNAVAILABLE', 'OBPLinkCard copy unavailable clipboard code');
  assertIncludes(obpLinkCard, 'OBP_LINK_CARD_COPY_FALLBACK_FAILED', 'OBPLinkCard copy fallback failure code');
  assertIncludes(obpLinkCard, 'OBP_LINK_CARD_MESSAGE_COPY_UNAVAILABLE', 'OBPLinkCard message-copy unavailable clipboard code');
  assertIncludes(obpLinkCard, 'OBP_LINK_CARD_MESSAGE_COPY_FALLBACK_FAILED', 'OBPLinkCard message-copy fallback failure code');
  assertIncludes(obpLinkCard, 'hasClipboardWrite', 'OBPLinkCard clipboard support metadata');
  assertIncludes(obpLinkCard, 'hasCopyFallback', 'OBPLinkCard fallback support metadata');
  assertIncludes(obpLinkCard, "const copied = document.execCommand('copy');", 'OBPLinkCard textarea copy acknowledgement');
  assertIncludes(obpLinkCard, 'whatsappMessageLength: msg.length', 'OBPLinkCard bounded WhatsApp message length');
  assertIncludes(obpLinkCard, 'whatsappUrlLength: whatsappUrl.length', 'OBPLinkCard bounded WhatsApp URL length');
  assertIncludes(obpLinkCard, "openIsolatedBrowserUrl(whatsappUrl)", 'OBPLinkCard safe WhatsApp open');
  assertIncludes(obpLinkCard, "openIsolatedBrowserUrl(obpOpenUrl)", 'OBPLinkCard safe direct open');
  assertIncludes(businessSettings, 'business_settings_presence_screen_links_load_failed', 'Business Settings embedded presence screen-link diagnostics');
  assertIncludes(businessSettings, "getBoundedBusinessSettingsStringContext('obpLink', obpLink)", 'Business Settings embedded presence bounded OBP context');
  assertNotIncludes(businessSettings, 'business_settings_presence_copy_failed', 'Business Settings must not keep obsolete embedded presence copy fallback diagnostics');
  assertNotIncludes(businessSettings, 'onCopyLink={async', 'Business Settings must not pass an embedded direct-copy fallback');
  assertNotIncludes(businessSettings, 'navigator.clipboard.writeText(url)', 'Business Settings embedded presence copy must stay in shared PresenceMonitor');

  [
    'google_listing_guide_link_copy_failed',
    'google_listing_guide_profile_kit_copy_failed',
    'google_listing_guide_open_failed',
  ].forEach((failureCode) => {
    assertIncludes(googleListingGuide, failureCode, 'GoogleListingGuide diagnostics');
  });
  assertIncludes(googleListingGuide, 'buildGoogleListingGuideLogContext', 'GoogleListingGuide bounded context helper');
  assertIncludes(googleListingGuide, "getBoundedStoreStringContext('obpUrl', obpUrl)", 'GoogleListingGuide bounded OBP URL context');
  assertIncludes(googleListingGuide, 'copyGoogleListingGuideLink', 'GoogleListingGuide copy acknowledgement helper');
  assertIncludes(googleListingGuide, 'GOOGLE_LISTING_GUIDE_COPY_UNAVAILABLE', 'GoogleListingGuide copy unavailable clipboard code');
  assertIncludes(googleListingGuide, 'GOOGLE_LISTING_GUIDE_COPY_FALLBACK_FAILED', 'GoogleListingGuide copy fallback failure code');
  assertIncludes(googleListingGuide, 'hasClipboardWrite', 'GoogleListingGuide clipboard support metadata');
  assertIncludes(googleListingGuide, 'hasCopyFallback', 'GoogleListingGuide fallback support metadata');
  assertIncludes(googleListingGuide, 'kitLineCount: profileKitRows.length', 'GoogleListingGuide profile-kit bounded line-count metadata');
  assertIncludes(googleListingGuide, 'Google profile handoff kit', 'GoogleListingGuide profile-kit owner copy');
  assertIncludes(googleListingGuide, 'So Google points customers to your MenuList-approved page.', 'GoogleListingGuide owner-managed Google handoff copy');
  assertIncludes(googleListingGuide, 'Google controls when profile edits appear.', 'GoogleListingGuide bounded Google profile edit timing copy');
  assertIncludes(googleListingGuide, "const copied = document.execCommand('copy');", 'GoogleListingGuide textarea copy acknowledgement');
  assertIncludes(googleListingGuide, "openIsolatedBrowserUrl('https://business.google.com/')", 'GoogleListingGuide safe Google open');
  assertNotIncludes(
    googleListingGuide,
    'So customers always see the correct menu and information when they find you on Google.',
    'GoogleListingGuide stale Google correctness overclaim',
  );
  assertNotIncludes(
    googleListingGuide,
    'Takes less than 30 seconds. Customers clicking &quot;Website&quot; on Google will see your latest published menu and info.',
    'GoogleListingGuide stale fixed-time latest-menu overclaim',
  );

  [
    'owner_dashboard_google_listing_copy_failed',
    'owner_dashboard_google_listing_open_failed',
    'owner_dashboard_google_listing_mark_done_failed',
    'owner_dashboard_google_listing_store_update_rejected',
  ].forEach((failureCode) => {
    assertIncludes(googleListingCard, failureCode, 'Owner dashboard Google listing diagnostics');
  });
  assertIncludes(googleListingCard, 'assertStoreUpdateSucceeded(', 'Owner dashboard Google listing store acknowledgement guard');
  assertIncludes(googleListingCard, 'buildGoogleListingCardLogContext', 'Owner dashboard Google listing bounded context helper');
  assertIncludes(googleListingCard, "getBoundedStoreStringContext('obpUrl', obpUrl)", 'Owner dashboard Google listing bounded OBP URL context');
  assertIncludes(googleListingCard, 'copyOwnerGoogleListingLink', 'Owner dashboard Google listing copy acknowledgement helper');
  assertIncludes(googleListingCard, 'OWNER_GOOGLE_LISTING_COPY_UNAVAILABLE', 'Owner dashboard Google listing copy unavailable clipboard code');
  assertIncludes(googleListingCard, 'OWNER_GOOGLE_LISTING_COPY_FALLBACK_FAILED', 'Owner dashboard Google listing copy fallback failure code');
  assertIncludes(googleListingCard, 'hasClipboardWrite', 'Owner dashboard Google listing clipboard support metadata');
  assertIncludes(googleListingCard, 'hasCopyFallback', 'Owner dashboard Google listing fallback support metadata');
  assertIncludes(googleListingCard, "const copied = document.execCommand('copy');", 'Owner dashboard Google listing textarea copy acknowledgement');
  assertIncludes(googleListingCard, "openIsolatedBrowserUrl('https://business.google.com/')", 'Owner dashboard Google listing safe Google open');

  assertIncludes(ownerDashboard, "t('publicTruthStatus.title.active')", 'Owner Dashboard localized official-source behavior framing');
  assertIncludes(ownerDashboard, "t('publicTruthStatus.description.readyToPlace')", 'Owner Dashboard localized customer-link adoption guidance');
  assertIncludes(menuListEnUsLocale, '"active": "Official customer source is active"', 'Owner Dashboard official-source behavior framing');
  assertIncludes(menuListEnUsLocale, '"readyToPlace": "Your customer link is ready.', 'Owner Dashboard customer-link adoption guidance');
  assertIncludes(projectShareModal, 'FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES', 'Desktop share behavior-copy gate');
  assertIncludes(mobileShareScreen, 'FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES', 'Mobile share behavior-copy gate');
  assert(!fs.existsSync(path.join(ROOT, 'src/components/templates/main-app/dashboard/OwnerDashboard/BehaviorNudgeCard.tsx')), 'Retired duplicate dashboard behavior nudge card must stay absent');
  assertNotIncludes(businessSettings, "} catch {\n                screenToken = null;", 'Business Settings embedded presence silent screen-link catch');
  assertNotIncludes(businessSettings, "} catch {\n                    message.error(`Could not copy ${label.toLowerCase()}`);", 'Business Settings embedded presence silent copy catch');

  [
    ['OBPLinkCard', obpLinkCard],
    ['GoogleListingGuide', googleListingGuide],
    ['Owner dashboard Google listing card', googleListingCard],
  ].forEach(([label, content]) => {
    assertNotIncludes(content, 'catch {', `${label} silent catch`);
    assertNotIncludes(content, 'console.error(', `${label} direct error logging`);
    assertNotIncludes(content, 'console.warn(', `${label} direct warn logging`);
    assertNotIncludes(content, 'console.log(', `${label} direct log logging`);
    assertNotIncludes(content, 'console.debug(', `${label} direct debug logging`);
  });
  assertNotIncludes(obpLinkCard, 'await navigator.clipboard.writeText(obpCopyUrl);\n            setCopied(true);', 'OBPLinkCard link copy must not use unguarded Clipboard API success');
  assertNotIncludes(obpLinkCard, 'await navigator.clipboard.writeText(msg);\n            message.success', 'OBPLinkCard message copy must not use unguarded Clipboard API success');
  assertNotIncludes(obpLinkCard, "document.execCommand('copy');\n            setCopied(true);", 'OBPLinkCard textarea fallback must not assume link-copy success');
  assertNotIncludes(obpLinkCard, "document.execCommand('copy');\n            message.success", 'OBPLinkCard textarea fallback must not assume message-copy success');
  assertNotIncludes(googleListingGuide, 'await navigator.clipboard.writeText(obpUrl);\n            setCopied(true);', 'GoogleListingGuide copy must not use unguarded Clipboard API success');
  assertNotIncludes(googleListingCard, 'await navigator.clipboard.writeText(obpUrl);\n            setCopied(true);', 'Owner dashboard Google listing copy must not use unguarded Clipboard API success');
  assertNotIncludes(googleListingGuide, "document.execCommand('copy');\n            setCopied(true);", 'GoogleListingGuide textarea fallback must not assume copy success');
  assertNotIncludes(googleListingCard, "document.execCommand('copy');\n            setCopied(true);", 'Owner dashboard Google listing textarea fallback must not assume copy success');
}

function verifyUseMenuListOutputDiagnosticsAreBounded() {
  const useMenuListDiagnostics = read('src/components/templates/main-app/useMenuList/useMenuListDiagnostics.ts');
  const desktopUseMenuList = read('src/components/templates/main-app/useMenuList/index.tsx');
  const shareLinkCard = read('src/components/templates/main-app/ShareLinkCard.tsx');
  const desktopCommunicationKit = read('src/components/templates/main-app/useMenuList/CommunicationKit.tsx');
  const desktopPresence = read('src/components/templates/main-app/useMenuList/PresenceMonitor.tsx');
  const mobilePresence = read('src/components/mobile/components/PresenceMonitor.tsx');
  const storesDal = read('src/database/stores/index.tsx');

  assertIncludes(useMenuListDiagnostics, 'secureError', 'Use MenuList diagnostics secure logging');
  assertIncludes(useMenuListDiagnostics, 'export type UseMenuListLogContext', 'Use MenuList diagnostics typed bounded context');
  assertIncludes(useMenuListDiagnostics, 'getBoundedUseMenuListStringContext', 'Use MenuList diagnostics bounded string context');
  assertIncludes(useMenuListDiagnostics, 'logUseMenuListFailure', 'Use MenuList diagnostics normalized failure logger');
  assertIncludes(desktopUseMenuList, "import { hasValidSubscriptionAccess } from '@util/razorpay';", 'Desktop Use MenuList paid-access authority');
  assertIncludes(desktopUseMenuList, 'hasStarterWorkspaceAccess,', 'Desktop Use MenuList starter-workspace authority');
  assertIncludes(desktopUseMenuList, "import NoSubscriptionView from '../billing/NoSubscriptionView';", 'Desktop Use MenuList honest no-subscription state');
  assertIncludes(desktopUseMenuList, 'data.hasPublishedMenu', 'Desktop Use MenuList publication-aware header copy');
  assertIncludes(desktopUseMenuList, 'Publish your ${labels.offeringLower} before sharing it with customers', 'Desktop Use MenuList unpublished recovery copy');
  assertNotIncludes(desktopUseMenuList, '<Text type="secondary">\n                    Your {labels.offeringLower} is live and ready to share', 'Desktop Use MenuList must not claim every active project is live');
  assertIncludes(desktopUseMenuList, '|| activeSubscriptionLoading', 'Desktop Use MenuList must wait for settled entitlement before project reads');
  assertIncludes(desktopUseMenuList, '|| (!hasPaidAccess && !hasStarterAccess)', 'Desktop Use MenuList must not read project summaries without paid or starter access');
  assertIncludes(desktopUseMenuList, 'if (!hasPaidAccess && !hasStarterAccess) {', 'Desktop Use MenuList no-subscription render gate');
  assertIncludes(desktopUseMenuList, 'return <NoSubscriptionView />;', 'Desktop Use MenuList no-subscription owner copy');
  assertIncludes(desktopUseMenuList, 'use_menulist_copy_failed', 'Desktop Use MenuList page-level copy diagnostics');
  assertIncludes(desktopUseMenuList, 'copyUseMenuListText', 'Desktop Use MenuList page-level copy acknowledgement helper');
  assertIncludes(desktopUseMenuList, 'USE_MENULIST_COPY_UNAVAILABLE', 'Desktop Use MenuList unavailable clipboard code');
  assertIncludes(desktopUseMenuList, 'USE_MENULIST_COPY_FALLBACK_FAILED', 'Desktop Use MenuList fallback failure code');
  assertIncludes(desktopUseMenuList, 'hasClipboardWrite', 'Desktop Use MenuList page-level copy support metadata');
  assertIncludes(desktopUseMenuList, 'hasCopyFallback', 'Desktop Use MenuList page-level fallback support metadata');
  assertIncludes(desktopUseMenuList, "const copied = document.execCommand('copy');", 'Desktop Use MenuList page-level textarea copy acknowledgement');
  {
    const copyIndex = desktopUseMenuList.indexOf('await copyUseMenuListText(text);');
    const starterSignalIndex = desktopUseMenuList.indexOf('recordStarterSignal(starterSignal);', copyIndex);
    assert(
      copyIndex !== -1 && starterSignalIndex > copyIndex,
      'Desktop Use MenuList starter signal must record only after acknowledged copy',
    );
  }
  assertIncludes(desktopUseMenuList, 'use_menulist_screen_links_load_failed', 'Desktop Use MenuList screen-link diagnostics');
  assertIncludes(desktopUseMenuList, 'use_menulist_open_failed', 'Desktop Use MenuList direct-open diagnostics');
  assertIncludes(desktopUseMenuList, "openIsolatedBrowserUrl(url)", 'Desktop Use MenuList safe output link open');
  assertIncludes(desktopUseMenuList, "getBoundedUseMenuListStringContext('url', url)", 'Desktop Use MenuList bounded direct-open URL context');
  assertIncludes(desktopUseMenuList, "getBoundedUseMenuListStringContext('label', label)", 'Desktop Use MenuList bounded direct-open label context');
  assertNotIncludes(desktopUseMenuList, "window.open(url, '_blank');", 'Desktop Use MenuList unsafe direct output open');
  assertIncludes(desktopUseMenuList, "getBoundedUseMenuListStringContext('obpLink', obpLink)", 'Desktop Use MenuList bounded screen-link OBP context');
  assertIncludes(desktopUseMenuList, "getBoundedUseMenuListStringContext('menuLink', menuLink)", 'Desktop Use MenuList bounded screen-link menu context');
  assertIncludes(desktopUseMenuList, "getBoundedUseMenuListStringContext('projectId', defaultProject.projectId)", 'Desktop Use MenuList bounded screen-link project context');
  assertIncludes(desktopUseMenuList, "cardKind: 'business_profile'", 'Desktop Use MenuList business-profile share-card context');
  assertIncludes(desktopUseMenuList, "cardKind: 'project_menu'", 'Desktop Use MenuList project-menu share-card context');
  assertIncludes(desktopUseMenuList, "cardKind: 'customer_app_install'", 'Desktop Use MenuList customer-app share-card context');
  [
    'share_link_card_copy_failed',
    'share_link_card_copy_message_failed',
    'share_link_card_whatsapp_open_failed',
    'share_link_card_open_failed',
  ].forEach((failureCode) => {
    assertIncludes(shareLinkCard, failureCode, 'ShareLinkCard diagnostics');
  });
  assertIncludes(shareLinkCard, 'secureError', 'ShareLinkCard secure logging');
  assertIncludes(shareLinkCard, 'getBoundedShareLinkStringContext', 'ShareLinkCard bounded string context');
  assertIncludes(shareLinkCard, "getBoundedShareLinkStringContext('url', url)", 'ShareLinkCard bounded URL context');
  assertIncludes(shareLinkCard, "getBoundedShareLinkStringContext('sharePrefix', sharePrefix)", 'ShareLinkCard bounded share-prefix context');
  assertIncludes(shareLinkCard, 'copyMessageLength: msg.length', 'ShareLinkCard bounded copy-message length');
  assertIncludes(shareLinkCard, 'copyShareLinkCardTextToClipboard', 'ShareLinkCard copy acknowledgement helper');
  assertIncludes(shareLinkCard, 'SHARE_LINK_CARD_COPY_UNAVAILABLE', 'ShareLinkCard copy unavailable clipboard code');
  assertIncludes(shareLinkCard, 'SHARE_LINK_CARD_COPY_FALLBACK_FAILED', 'ShareLinkCard copy fallback failure code');
  assertIncludes(shareLinkCard, 'SHARE_LINK_CARD_MESSAGE_COPY_UNAVAILABLE', 'ShareLinkCard message-copy unavailable clipboard code');
  assertIncludes(shareLinkCard, 'SHARE_LINK_CARD_MESSAGE_COPY_FALLBACK_FAILED', 'ShareLinkCard message-copy fallback failure code');
  assertIncludes(shareLinkCard, 'hasClipboardWrite', 'ShareLinkCard clipboard support metadata');
  assertIncludes(shareLinkCard, 'hasCopyFallback', 'ShareLinkCard fallback support metadata');
  assertIncludes(shareLinkCard, "const copied = document.execCommand('copy');", 'ShareLinkCard textarea copy acknowledgement');
  assertIncludes(shareLinkCard, 'whatsappMessageLength: msg.length', 'ShareLinkCard bounded WhatsApp message length');
  assertIncludes(shareLinkCard, 'whatsappUrlLength: whatsappUrl.length', 'ShareLinkCard bounded WhatsApp URL length');
  assertIncludes(shareLinkCard, "openIsolatedBrowserUrl(whatsappUrl)", 'ShareLinkCard safe WhatsApp open');
  assertIncludes(shareLinkCard, 'directUrlLength: directUrl.length', 'ShareLinkCard bounded direct URL length');
  assertIncludes(desktopUseMenuList, 'diagnosticContext={getOutputDiagnosticContext()}', 'Desktop Use MenuList communication kit bounded context handoff');
  [
    'use_menulist_communication_kit_copy_failed',
    'use_menulist_communication_kit_whatsapp_open_failed',
  ].forEach((failureCode) => {
    assertIncludes(desktopCommunicationKit, failureCode, 'Desktop Communication Kit diagnostics');
  });
  assertIncludes(desktopCommunicationKit, 'buildCommunicationKitLogContext', 'Desktop Communication Kit bounded context helper');
  assertIncludes(desktopCommunicationKit, "getBoundedUseMenuListStringContext('templateId', template.id)", 'Desktop Communication Kit bounded template ID context');
  assertIncludes(desktopCommunicationKit, "getBoundedUseMenuListStringContext('templateTitle', template.title)", 'Desktop Communication Kit bounded template title context');
  assertIncludes(desktopCommunicationKit, 'copyMessageLength: copyMessage.length', 'Desktop Communication Kit bounded copy message length');
  assertIncludes(desktopCommunicationKit, 'copyUseMenuListCommunicationKitMessage', 'Desktop Communication Kit copy acknowledgement helper');
  assertIncludes(desktopCommunicationKit, 'USE_MENULIST_COMMUNICATION_KIT_COPY_UNAVAILABLE', 'Desktop Communication Kit unavailable clipboard code');
  assertIncludes(desktopCommunicationKit, 'USE_MENULIST_COMMUNICATION_KIT_COPY_FALLBACK_FAILED', 'Desktop Communication Kit fallback failure code');
  assertIncludes(desktopCommunicationKit, 'let clipboardWriteError: unknown;', 'Desktop Communication Kit Clipboard API rejection tracking');
  assertIncludes(desktopCommunicationKit, 'clipboardWriteRejected: Boolean(clipboardWriteError)', 'Desktop Communication Kit unavailable-copy rejection context');
  assertIncludes(desktopCommunicationKit, 'hasClipboardWrite', 'Desktop Communication Kit clipboard support metadata');
  assertIncludes(desktopCommunicationKit, 'hasCopyFallback', 'Desktop Communication Kit fallback support metadata');
	  assertIncludes(desktopCommunicationKit, "const copied = document.execCommand('copy');", 'Desktop Communication Kit textarea copy acknowledgement');
	  assertIncludes(desktopCommunicationKit, 'whatsappMessageLength: whatsappMessage.length', 'Desktop Communication Kit bounded WhatsApp message length');
  assertIncludes(desktopCommunicationKit, 'whatsappUrlLength: whatsappUrl.length', 'Desktop Communication Kit bounded WhatsApp URL length');
  assertIncludes(desktopCommunicationKit, "openIsolatedBrowserUrl(whatsappUrl)", 'Desktop Communication Kit safe WhatsApp open');
  [
    'use_menulist_presence_official_link_copy_failed',
    'use_menulist_presence_external_open_failed',
    'use_menulist_presence_confirm_failed',
    'use_menulist_presence_remove_failed',
  ].forEach((failureCode) => {
    assertIncludes(desktopPresence, failureCode, 'Desktop Use MenuList presence diagnostics');
  });
  [
    'mobile_presence_official_link_copy_failed',
    'mobile_presence_external_open_failed',
    'mobile_presence_confirm_failed',
    'mobile_presence_remove_failed',
  ].forEach((failureCode) => {
    assertIncludes(mobilePresence, failureCode, 'Mobile Presence Monitor diagnostics');
  });
  assertIncludes(desktopPresence, 'buildPresenceLogContext', 'Desktop Presence Monitor bounded context helper');
  assertIncludes(desktopPresence, "getBoundedUseMenuListStringContext('obpLink', data.obpLink)", 'Desktop Presence Monitor bounded OBP URL context');
  assertIncludes(desktopPresence, "getBoundedUseMenuListStringContext('openUrl', surface?.openUrl)", 'Desktop Presence Monitor bounded external URL context');
  assertIncludes(desktopPresence, "getBoundedUseMenuListStringContext('surfaceKey', surface?.dalKey)", 'Desktop Presence Monitor bounded surface key context');
  assertIncludes(desktopPresence, "openIsolatedBrowserUrl(surface.openUrl)", 'Desktop Presence Monitor safe external open');
  assertIncludes(desktopPresence, 'manualActiveCount', 'Desktop Presence Monitor bounded surface count context');
  assertIncludes(desktopPresence, 'copyUseMenuListPresenceLink', 'Desktop Presence Monitor copy acknowledgement helper');
  assertIncludes(desktopPresence, 'USE_MENULIST_PRESENCE_COPY_UNAVAILABLE', 'Desktop Presence Monitor unavailable clipboard code');
  assertIncludes(desktopPresence, 'USE_MENULIST_PRESENCE_COPY_FALLBACK_FAILED', 'Desktop Presence Monitor fallback failure code');
  assertIncludes(desktopPresence, 'hasClipboardWrite', 'Desktop Presence Monitor clipboard support metadata');
  assertIncludes(desktopPresence, 'hasCopyFallback', 'Desktop Presence Monitor fallback support metadata');
  assertIncludes(desktopPresence, "const copied = document.execCommand('copy');", 'Desktop Presence Monitor textarea copy acknowledgement');
  assertIncludes(mobilePresence, 'buildMobilePresenceLogContext', 'Mobile Presence Monitor bounded context helper');
  assertIncludes(mobilePresence, "getBoundedMobileOwnerStringContext('obpLink', obpLink)", 'Mobile Presence Monitor bounded OBP URL context');
  assertIncludes(mobilePresence, "getBoundedMobileOwnerStringContext('openUrl', surface?.openUrl)", 'Mobile Presence Monitor bounded external URL context');
  assertIncludes(mobilePresence, "getBoundedMobileOwnerStringContext('surfaceKey', surface?.dalKey)", 'Mobile Presence Monitor bounded surface key context');
  assertIncludes(mobilePresence, 'openIsolatedBrowserUrl(surface.openUrl)', 'Mobile Presence Monitor isolated external open');
  assertIncludes(mobilePresence, 'manualActiveCount', 'Mobile Presence Monitor bounded surface count context');
  assertIncludes(mobilePresence, 'copyMobilePresenceLink', 'Mobile Presence Monitor copy acknowledgement helper');
  assertIncludes(mobilePresence, 'MOBILE_PRESENCE_COPY_UNAVAILABLE', 'Mobile Presence Monitor unavailable clipboard code');
  assertIncludes(mobilePresence, 'MOBILE_PRESENCE_COPY_FALLBACK_FAILED', 'Mobile Presence Monitor fallback failure code');
  assertIncludes(mobilePresence, 'hasClipboardWrite', 'Mobile Presence Monitor clipboard support metadata');
  assertIncludes(mobilePresence, 'hasCopyFallback', 'Mobile Presence Monitor fallback support metadata');
  assertIncludes(mobilePresence, "const copied = document.execCommand('copy');", 'Mobile Presence Monitor textarea copy acknowledgement');
  assertIncludes(storesDal, 'export type MenuPresenceUpdateResult', 'Menu presence typed update acknowledgement result');
  assertIncludes(storesDal, 'const assertActiveSessionStore = async', 'Menu presence store writes must assert active session store scope');
  assertIncludes(storesDal, "throw new Error(rejectionCode);", 'Menu presence store scope mismatch must reject before write');
  assertIncludes(storesDal, "await assertActiveSessionStore(storeId, 'menu_presence_store_scope_mismatch');", 'Menu presence updates must verify active session store before writing');
  assertIncludes(storesDal, "await assertActiveSessionStore(storeId, 'starter_activation_signal_store_scope_mismatch');", 'Starter activation signals must verify active session store before writing');
  assertIncludes(storesDal, 'assertMenuPresenceUpdateSucceeded', 'Menu presence DAL acknowledgement guard');
  assertIncludes(storesDal, 'success: true', 'Menu presence DAL returns explicit success acknowledgement');
  assertIncludes(desktopPresence, 'assertMenuPresenceUpdateSucceeded', 'Desktop Presence Monitor checks update acknowledgement');
  assertIncludes(desktopPresence, 'use_menulist_presence_confirm_update_rejected', 'Desktop Presence Monitor confirm rejection code');
  assertIncludes(desktopPresence, 'use_menulist_presence_remove_update_rejected', 'Desktop Presence Monitor remove rejection code');
  assertIncludes(mobilePresence, 'assertMenuPresenceUpdateSucceeded', 'Mobile Presence Monitor checks update acknowledgement');
  assertIncludes(mobilePresence, 'mobile_presence_confirm_update_rejected', 'Mobile Presence Monitor confirm rejection code');
  assertIncludes(mobilePresence, 'mobile_presence_remove_update_rejected', 'Mobile Presence Monitor remove rejection code');
  assertNotIncludes(desktopUseMenuList, 'catch {', 'Desktop Use MenuList silent catch');
  assertNotIncludes(desktopUseMenuList, 'await navigator.clipboard.writeText(text);\n            message.success', 'Desktop Use MenuList page-level copy must not use unguarded Clipboard API success');
  assertNotIncludes(shareLinkCard, 'catch {', 'ShareLinkCard silent catch');
  assertNotIncludes(shareLinkCard, 'await navigator.clipboard.writeText(copyUrl);\n            message.success', 'ShareLinkCard copy must not use unguarded Clipboard API success');
  assertNotIncludes(shareLinkCard, 'await navigator.clipboard.writeText(msg);\n            message.success', 'ShareLinkCard message copy must not use unguarded Clipboard API success');
  assertNotIncludes(shareLinkCard, "document.execCommand('copy');\n            message.success", 'ShareLinkCard textarea fallback must not assume success');
  assertNotIncludes(shareLinkCard, "window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')", 'ShareLinkCard unsafe WhatsApp open');
  assertNotIncludes(shareLinkCard, 'console.error(', 'ShareLinkCard direct error logging');
  assertNotIncludes(shareLinkCard, 'console.warn(', 'ShareLinkCard direct warn logging');
  assertNotIncludes(shareLinkCard, 'console.log(', 'ShareLinkCard direct log logging');
  assertNotIncludes(shareLinkCard, 'console.debug(', 'ShareLinkCard direct debug logging');
	  assertNotIncludes(desktopCommunicationKit, 'catch {', 'Desktop Communication Kit silent catch');
	  assertNotIncludes(desktopCommunicationKit, 'await navigator.clipboard.writeText(copyMessage);\n            setCopied(true);', 'Desktop Communication Kit copy must not use unguarded Clipboard API success');
	  assertNotIncludes(desktopCommunicationKit, "if (hasUseMenuListCommunicationKitClipboardWrite()) {\n        await navigator.clipboard.writeText(copyMessage);\n        return;\n    }", 'Desktop Communication Kit Clipboard API rejection must not skip acknowledged fallback');
	  assertNotIncludes(desktopCommunicationKit, "document.execCommand('copy');\n        setCopied(true);", 'Desktop Communication Kit textarea copy must not assume success');
	  assertNotIncludes(desktopCommunicationKit, "window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, '_blank')", 'Desktop Communication Kit unsafe WhatsApp open');
  assertNotIncludes(desktopCommunicationKit, 'console.error(', 'Desktop Communication Kit direct error logging');
  assertNotIncludes(desktopCommunicationKit, 'console.warn(', 'Desktop Communication Kit direct warn logging');
  assertNotIncludes(desktopCommunicationKit, 'console.log(', 'Desktop Communication Kit direct log logging');
  assertNotIncludes(desktopCommunicationKit, 'console.debug(', 'Desktop Communication Kit direct debug logging');
  assertNotIncludes(desktopPresence, 'catch {', 'Desktop Presence Monitor silent catch');
  assertNotIncludes(desktopPresence, 'await navigator.clipboard.writeText(sourcedObpLink);\n            message.success', 'Desktop Presence Monitor copy must not use unguarded Clipboard API success');
  assertNotIncludes(desktopPresence, 'onCopyLink(sourcedObpLink', 'Desktop Presence Monitor must not delegate failed copy to parent fallback');
  assertNotIncludes(desktopPresence, 'console.error(', 'Desktop Presence Monitor direct error logging');
  assertNotIncludes(desktopPresence, 'console.warn(', 'Desktop Presence Monitor direct warn logging');
  assertNotIncludes(desktopPresence, 'console.log(', 'Desktop Presence Monitor direct log logging');
  assertNotIncludes(desktopPresence, 'console.debug(', 'Desktop Presence Monitor direct debug logging');
  assertNotIncludes(desktopPresence, "window.open(surface.openUrl, '_blank')", 'Desktop Presence Monitor unsafe external open');
  assertNotIncludes(mobilePresence, 'catch {', 'Mobile Presence Monitor silent catch');
  assertNotIncludes(mobilePresence, "await navigator.clipboard.writeText(withAnalyticsSource(obpLink, 'copy_link'));\n            Toast.show", 'Mobile Presence Monitor copy must not use unguarded Clipboard API success');
  assertNotIncludes(mobilePresence, 'console.error(', 'Mobile Presence Monitor direct error logging');
  assertNotIncludes(mobilePresence, 'console.warn(', 'Mobile Presence Monitor direct warn logging');
  assertNotIncludes(mobilePresence, 'console.log(', 'Mobile Presence Monitor direct log logging');
  assertNotIncludes(mobilePresence, 'console.debug(', 'Mobile Presence Monitor direct debug logging');
  assertNotIncludes(mobilePresence, "window.open(selectedSurface.openUrl, '_blank')", 'Mobile Presence Monitor unsafe external open');
}

function verifyProjectShareModalDiagnosticsAreBounded() {
  const exportDiagnostics = read('src/lib/export/exportDiagnostics.ts');
  const shareModal = read('src/components/templates/main-app/projects/b2cView/shareModal/index.tsx');
  const menuKitSection = read('src/components/templates/main-app/projects/b2cView/shareModal/MenuKitSection.tsx');
  const legacyQrView = read('src/components/templates/main-app/projects/b2cView/shareModal/qrCodeView.tsx');
  const legacyLinkShare = read('src/components/templates/main-app/projects/b2cView/shareModal/linkView.tsx');
  const legacySocialShare = read('src/components/templates/main-app/projects/b2cView/shareModal/socialShareView.tsx');
  const clientMenuReadme = read('__docs__/client-menu/README.md');
  const clientMenuImpl = read('__docs__/client-menu/_impl.md');
  const clientMenuFirebase = read('__docs__/client-menu/client-menu_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  assertIncludes(exportDiagnostics, 'copyExportTextToClipboard', 'Export clipboard copy acknowledgement helper');
  assertIncludes(exportDiagnostics, 'EXPORT_CLIPBOARD_COPY_UNAVAILABLE', 'Export unavailable clipboard code');
  assertIncludes(exportDiagnostics, 'EXPORT_CLIPBOARD_COPY_FALLBACK_FAILED', 'Export fallback failure code');
  assertIncludes(exportDiagnostics, 'hasExportClipboardWrite', 'Export clipboard support helper');
  assertIncludes(exportDiagnostics, 'hasExportCopyFallback', 'Export fallback support helper');
  assertIncludes(exportDiagnostics, "const copied = document.execCommand('copy');", 'Export textarea copy acknowledgement');
  [
    'project_share_qr_download_failed',
    'project_share_social_handoff_failed',
    'project_share_direct_open_failed',
    'project_share_direct_copy_failed',
  ].forEach((failureCode) => {
    assertIncludes(shareModal, failureCode, 'Project share modal diagnostics');
  });
  assertIncludes(shareModal, 'getShareModalLogContext', 'Project share modal bounded context helper');
  assertIncludes(shareModal, "getBoundedExportStringContext('projectId', projectId)", 'Project share modal bounded project context');
  assertIncludes(shareModal, "getBoundedExportStringContext('shareUrl', shareUrl)", 'Project share modal bounded share URL context');
  assertIncludes(shareModal, "getBoundedExportStringContext('qrShareUrl', qrShareUrl)", 'Project share modal bounded QR URL context');
  assertIncludes(shareModal, "getBoundedExportStringContext('platform', platform)", 'Project share modal bounded platform context');
  assertIncludes(shareModal, 'shareMessageLength: urls[platform].length', 'Project share modal bounded social message length');
  assertIncludes(shareModal, 'shareUrlLength: urls[platform].length', 'Project share modal bounded social URL length');
  assertIncludes(shareModal, 'copyExportTextToClipboard(urlWithUTM)', 'Project share modal social copy acknowledgement');
  assertIncludes(shareModal, 'copyExportTextToClipboard(copyUrl)', 'Project share modal direct copy acknowledgement');
  assertIncludes(shareModal, 'hasClipboardWrite: hasExportClipboardWrite()', 'Project share modal clipboard support metadata');
  assertIncludes(shareModal, 'hasCopyFallback: hasExportCopyFallback()', 'Project share modal fallback support metadata');
  assertIncludes(shareModal, "openIsolatedBrowserUrl(socialShareUrl)", 'Project share modal safe social open');
  assertIncludes(shareModal, "openIsolatedBrowserUrl(directUrl)", 'Project share modal safe direct open');
  assert(!shareModal.includes('window.location.assign(directUrl)'), 'Project share modal must not replace the owner workflow with the public link');
  assertIncludes(shareModal, 'directUrlLength: directUrl.length', 'Project share modal bounded direct URL length');
  assertIncludes(shareModal, 'copyUrlLength: copyUrl.length', 'Project share modal bounded copy URL length');
  assertIncludes(shareModal, 'onClick={handleOpenDirectLink}', 'Project share modal direct-open handler');
  assertIncludes(shareModal, 'onClick={() => void handleCopyDirectLink()}', 'Project share modal direct-copy handler');

  [
    'project_share_menu_kit_message_copy_failed',
    'project_share_menu_kit_staff_script_copy_failed',
    'project_share_menu_kit_whatsapp_open_failed',
  ].forEach((failureCode) => {
    assertIncludes(menuKitSection, failureCode, 'Project share Menu Kit helper diagnostics');
  });
  assertIncludes(menuKitSection, 'messageLength: msg.length', 'Project share Menu Kit bounded message length');
  assertIncludes(menuKitSection, 'copyExportTextToClipboard(msg)', 'Project share Menu Kit message copy acknowledgement');
  assertIncludes(menuKitSection, 'copyExportTextToClipboard(labels.staffScript)', 'Project share Menu Kit staff script copy acknowledgement');
  assertIncludes(menuKitSection, 'hasClipboardWrite: hasExportClipboardWrite()', 'Project share Menu Kit clipboard support metadata');
  assertIncludes(menuKitSection, 'hasCopyFallback: hasExportCopyFallback()', 'Project share Menu Kit fallback support metadata');
  assertIncludes(menuKitSection, 'whatsappUrlLength: whatsappUrl.length', 'Project share Menu Kit bounded WhatsApp URL length');
  assertIncludes(menuKitSection, "openIsolatedBrowserUrl(whatsappUrl)", 'Project share Menu Kit safe WhatsApp open');
  assertIncludes(menuKitSection, 'staffScriptLength: labels.staffScript.length', 'Project share Menu Kit bounded staff-script length');
  assertIncludes(legacyQrView, 'project_share_legacy_qr_download_failed', 'Legacy project QR download diagnostics');
  assertIncludes(legacyQrView, 'getLegacyQrDownloadLogContext', 'Legacy project QR bounded context helper');
  assertIncludes(legacyQrView, "getBoundedExportStringContext('shareUrl', shareUrl)", 'Legacy project QR bounded share URL');
  assertIncludes(legacyQrView, "getBoundedExportStringContext('qrShareUrl', qrShareUrl)", 'Legacy project QR bounded QR URL');
  assertIncludes(legacyQrView, "getBoundedExportStringContext('storeName', storeName)", 'Legacy project QR bounded store name');
  assertIncludes(legacyQrView, "getBoundedExportStringContext('logoUrl', logoUrl)", 'Legacy project QR bounded logo URL');
  assertIncludes(legacyQrView, "fallbackPolicy: 'show_qr_download_failed_message'", 'Legacy project QR fallback policy');
  assertIncludes(legacyQrView, 'qrColorLength: qrColor.length', 'Legacy project QR bounded color metadata');
  assertIncludes(legacyQrView, 'qrBgColorLength: qrBgColor.length', 'Legacy project QR bounded background metadata');
  assertIncludes(legacyQrView, 'qrSize,', 'Legacy project QR bounded size metadata');
  assertIncludes(clientMenuReadme, 'Legacy QR download diagnostics', 'Client Menu README legacy QR diagnostics');
  assertIncludes(clientMenuImpl, 'Legacy QR download diagnostics', 'Client Menu implementation legacy QR diagnostics');
  assertIncludes(clientMenuFirebase, 'Legacy QR download diagnostics', 'Client Menu Firebase legacy QR diagnostics');
  assertIncludes(productionAudit, 'Legacy project QR download diagnostics checkpoint', 'production audit legacy QR checkpoint');
  assertIncludes(changelog, 'Legacy Project QR Download Diagnostics', 'changelog legacy QR checkpoint');
  assertIncludes(legacyLinkShare, 'project_share_legacy_link_copy_failed', 'Legacy project link share copy diagnostics');
  assertIncludes(legacyLinkShare, 'copyExportTextToClipboard(copyUrl)', 'Legacy project link share copy acknowledgement');
  assertIncludes(legacyLinkShare, 'hasClipboardWrite: hasExportClipboardWrite()', 'Legacy project link share clipboard support metadata');
  assertIncludes(legacyLinkShare, 'hasCopyFallback: hasExportCopyFallback()', 'Legacy project link share fallback support metadata');
  assertIncludes(legacyLinkShare, "getBoundedExportStringContext('shareUrl', shareUrl)", 'Legacy project link share bounded share URL');
  assertIncludes(legacyLinkShare, 'copyUrlLength: copyUrl.length', 'Legacy project link share bounded copy URL length');
  assertIncludes(legacySocialShare, 'project_share_legacy_social_copy_failed', 'Legacy project social share copy diagnostics');
  assertIncludes(legacySocialShare, 'copyExportTextToClipboard(urlWithUTM)', 'Legacy project social share copy acknowledgement');
  assertIncludes(legacySocialShare, 'hasClipboardWrite: hasExportClipboardWrite()', 'Legacy project social share clipboard support metadata');
  assertIncludes(legacySocialShare, 'hasCopyFallback: hasExportCopyFallback()', 'Legacy project social share fallback support metadata');
  assertIncludes(legacySocialShare, 'project_share_legacy_social_open_failed', 'Legacy project social share bounded diagnostics');
  assertIncludes(legacySocialShare, "openIsolatedBrowserUrl(socialShareUrl)", 'Legacy project social share safe browser open');
  assertIncludes(legacySocialShare, "getBoundedExportStringContext('platform', platform.name)", 'Legacy project social share bounded platform');
  assertIncludes(legacySocialShare, "getBoundedExportStringContext('platform', platform)", 'Legacy project social share bounded copy platform');
  assertIncludes(legacySocialShare, "getBoundedExportStringContext('shareUrl', shareUrl)", 'Legacy project social share bounded share URL');
  assertIncludes(legacySocialShare, 'copyUrlLength: urlWithUTM.length', 'Legacy project social share bounded copy URL length');
  assertIncludes(legacySocialShare, 'socialShareUrlLength: socialShareUrl.length', 'Legacy project social share bounded social URL length');
  assertNotIncludes(shareModal, 'catch {', 'Project share modal silent catch');
  assertNotIncludes(shareModal, "window.open(urls[platform], '_blank')", 'Project share modal unsafe social open');
  assertNotIncludes(shareModal, 'navigator.clipboard.writeText', 'Project share modal direct Clipboard API copy');
  assertNotIncludes(shareModal, "document.execCommand('copy');\n            message.success", 'Project share modal textarea copy must not assume success');
  assertNotIncludes(menuKitSection, 'catch {', 'Project share Menu Kit section silent catch');
  assertNotIncludes(menuKitSection, "window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')", 'Project share Menu Kit unsafe WhatsApp open');
  assertNotIncludes(menuKitSection, 'navigator.clipboard.writeText', 'Project share Menu Kit direct Clipboard API copy');
  assertNotIncludes(menuKitSection, "document.execCommand('copy');\n            message.success", 'Project share Menu Kit textarea copy must not assume success');
  assertNotIncludes(legacyQrView, 'catch {', 'Legacy project QR silent catch');
  assertNotIncludes(legacyLinkShare, "catch (err) {\n            message.error('Failed to copy link');\n        }", 'Legacy project link share unbounded copy failure');
  assertNotIncludes(legacyLinkShare, 'navigator.clipboard.writeText', 'Legacy project link share direct Clipboard API copy');
  assertNotIncludes(legacySocialShare, "catch (err) {\n            message.error('Failed to copy link');\n        }", 'Legacy project social share unbounded copy failure');
  assertNotIncludes(legacySocialShare, 'navigator.clipboard.writeText', 'Legacy project social share direct Clipboard API copy');
  assertNotIncludes(legacySocialShare, "window.open(platform.shareUrl(urlWithUTM), '_blank', 'noopener,noreferrer')", 'Legacy project social share raw browser open');
  assertNotIncludes(shareModal, 'console.error(', 'Project share modal direct error logging');
  assertNotIncludes(shareModal, 'console.warn(', 'Project share modal direct warn logging');
  assertNotIncludes(shareModal, 'console.log(', 'Project share modal direct log logging');
  assertNotIncludes(shareModal, 'console.debug(', 'Project share modal direct debug logging');
  assertNotIncludes(menuKitSection, 'console.error(', 'Project share Menu Kit direct error logging');
  assertNotIncludes(menuKitSection, 'console.warn(', 'Project share Menu Kit direct warn logging');
  assertNotIncludes(menuKitSection, 'console.log(', 'Project share Menu Kit direct log logging');
  assertNotIncludes(menuKitSection, 'console.debug(', 'Project share Menu Kit direct debug logging');
  assertNotIncludes(legacyQrView, 'console.error(', 'Legacy project QR direct error logging');
  assertNotIncludes(legacyQrView, 'console.warn(', 'Legacy project QR direct warn logging');
  assertNotIncludes(legacyQrView, 'console.log(', 'Legacy project QR direct log logging');
  assertNotIncludes(legacyQrView, 'console.debug(', 'Legacy project QR direct debug logging');
}

function verifyMobileTodayDiagnosticsAreBounded() {
  const mobileHours = read('src/components/mobile/screens/MobileHoursScreen.tsx');
  const mobileOwnerDiagnostics = read('src/components/mobile/utils/mobileOwnerDiagnostics.ts');
  const campaignDiagnostics = read('src/lib/campaigns/campaignDiagnostics.ts');

  assertIncludes(mobileOwnerDiagnostics, 'logMobileOwnerFailure', 'Mobile owner diagnostics failure logger');
  assertIncludes(campaignDiagnostics, 'logCampaignFailure', 'Campaign diagnostics failure logger');
  assertIncludes(mobileHours, 'mobile_today_close_today_failed', 'Mobile Today close-today diagnostics');
  assertIncludes(mobileHours, 'mobile_today_campaign_complete_failed', 'Mobile Today campaign complete diagnostics');
  assertIncludes(mobileHours, 'mobile_today_campaign_skip_failed', 'Mobile Today campaign skip diagnostics');
  assertIncludes(mobileHours, 'mobile_today_hours_update_failed', 'Mobile Today hours update diagnostics');
  assertIncludes(mobileHours, 'mobile_today_temp_status_set_failed', 'Mobile Today temp-status set diagnostics');
  assertIncludes(mobileHours, 'mobile_today_temp_status_clear_failed', 'Mobile Today temp-status clear diagnostics');
  assertIncludes(mobileHours, 'mobile_today_tent_card_download_failed', 'Mobile Today tent-card download diagnostics');
  assertIncludes(mobileHours, 'mobile_today_sticker_download_failed', 'Mobile Today sticker download diagnostics');
  assertIncludes(mobileHours, 'getMobileOwnerStoreLogContext', 'Mobile Today bounded store context');
  assertIncludes(mobileHours, 'getBoundedCampaignStringContext', 'Mobile Today bounded campaign context');
  assertIncludes(mobileHours, 'hasMenuLink: Boolean(menuLink)', 'Mobile Today campaign link presence context');
  assertIncludes(mobileHours, 'hasCampaignImage', 'Mobile Today campaign image presence context');
  assertNotIncludes(mobileHours, 'console.error(', 'Mobile Today direct error logging');
  assertNotIncludes(mobileHours, 'console.warn(', 'Mobile Today direct warn logging');
  assertNotIncludes(mobileHours, 'console.log(', 'Mobile Today direct log logging');
  assertNotIncludes(mobileHours, 'console.debug(', 'Mobile Today direct debug logging');
}

function verifyFeedbackInboxDiagnosticsAreBounded() {
  const feedbackInbox = read('src/components/templates/main-app/feedback/index.tsx');
  const feedbackQrDownload = read('src/components/templates/main-app/feedback/FeedbackQrDownload.tsx');
  const diagnostics = read('src/components/templates/main-app/feedback/feedbackInboxDiagnostics.ts');
  const guestFeedbackDal = read('src/database/guestFeedback/index.ts');

  assertIncludes(diagnostics, 'secureError', 'Feedback inbox diagnostics secure logging');
  assertIncludes(diagnostics, 'getBoundedFeedbackInboxStringContext', 'Feedback inbox diagnostics bounded string context');
  assertIncludes(diagnostics, 'logFeedbackInboxFailure', 'Feedback inbox diagnostics normalized failure logger');
  assertIncludes(diagnostics, 'sourceErrorName: getFeedbackInboxErrorName(error)', 'Feedback inbox diagnostics source error name');
  assertIncludes(diagnostics, 'sourceErrorCode: getFeedbackInboxErrorCode(error)', 'Feedback inbox diagnostics source error code');
  assertIncludes(diagnostics, 'sourceStatusCode: getFeedbackInboxErrorStatus(error)', 'Feedback inbox diagnostics source error status');
  assertIncludes(feedbackInbox, 'feedback_inbox_load_failed', 'Feedback inbox load diagnostics');
  assertIncludes(feedbackInbox, 'feedback_inbox_status_update_failed', 'Feedback inbox status update diagnostics');
  assertIncludes(guestFeedbackDal, 'assertFeedbackStatusUpdateSucceeded', 'Guest feedback status acknowledgement guard');
  assertIncludes(guestFeedbackDal, 'assertFeedbackListLoadSucceeded', 'Guest feedback list acknowledgement guard');
  assertIncludes(guestFeedbackDal, 'assertFeedbackCountLoadSucceeded', 'Guest feedback count acknowledgement guard');
  assertIncludes(guestFeedbackDal, 'return runTransaction(firebaseClient, async (transaction) => {', 'Guest feedback status update transaction boundary');
  assertIncludes(guestFeedbackDal, 'normalizeGuestFeedbackRecord(snapshot.data(), snapshot.id)', 'Guest feedback status update persisted shape guard');
  assertIncludes(guestFeedbackDal, 'existing.tId !== scope.tenantId || existing.sId !== scope.storeId', 'Guest feedback status update active-store guard');
  assertIncludes(feedbackInbox, 'assertFeedbackListLoadSucceeded(', 'Feedback inbox list acknowledgement usage');
  assertIncludes(feedbackInbox, 'feedback_inbox_list_load_rejected', 'Feedback inbox rejected list acknowledgement code');
  assertIncludes(feedbackInbox, 'assertFeedbackCountLoadSucceeded(', 'Feedback inbox count acknowledgement usage');
  assertIncludes(feedbackInbox, 'feedback_inbox_count_load_rejected', 'Feedback inbox rejected count acknowledgement code');
  assertIncludes(feedbackInbox, 'assertFeedbackStatusUpdateSucceeded(', 'Feedback inbox status acknowledgement usage');
  assertIncludes(feedbackInbox, 'feedback_inbox_status_update_rejected', 'Feedback inbox rejected status acknowledgement code');
  assertIncludes(feedbackInbox, 'getBoundedFeedbackInboxStringContext', 'Feedback inbox bounded context usage');
  [
    'desktop_feedback_qr_generate_failed',
    'desktop_feedback_qr_download_failed',
    'desktop_feedback_link_copy_failed',
    'desktop_feedback_link_open_failed',
    'desktop_feedback_whatsapp_open_failed',
    'desktop_feedback_message_copy_failed',
  ].forEach((failureCode) => {
    assertIncludes(feedbackQrDownload, failureCode, 'Feedback QR handoff diagnostics');
  });
	  assertIncludes(feedbackQrDownload, 'buildFeedbackQrLogContext', 'Feedback QR bounded context helper');
	  assertIncludes(feedbackQrDownload, 'copyFeedbackTextToClipboard', 'Feedback QR copy acknowledgement helper');
	  assertIncludes(feedbackQrDownload, 'DESKTOP_FEEDBACK_LINK_COPY_UNAVAILABLE', 'Feedback QR link copy unavailable code');
	  assertIncludes(feedbackQrDownload, 'DESKTOP_FEEDBACK_LINK_COPY_FALLBACK_FAILED', 'Feedback QR link copy fallback failure code');
	  assertIncludes(feedbackQrDownload, 'DESKTOP_FEEDBACK_MESSAGE_COPY_UNAVAILABLE', 'Feedback QR message copy unavailable code');
	  assertIncludes(feedbackQrDownload, 'DESKTOP_FEEDBACK_MESSAGE_COPY_FALLBACK_FAILED', 'Feedback QR message copy fallback failure code');
	  assertIncludes(feedbackQrDownload, 'let clipboardWriteError: unknown;', 'Feedback QR Clipboard API rejection tracking');
	  assertIncludes(feedbackQrDownload, 'clipboardWriteRejected: Boolean(clipboardWriteError)', 'Feedback QR unavailable-copy rejection context');
	  assertIncludes(feedbackQrDownload, 'hasClipboardWrite', 'Feedback QR copy support metadata');
	  assertIncludes(feedbackQrDownload, 'hasCopyFallback', 'Feedback QR fallback support metadata');
	  assertIncludes(feedbackQrDownload, "const copied = document.execCommand('copy');", 'Feedback QR textarea copy acknowledgement');
	  assertIncludes(feedbackQrDownload, "getBoundedFeedbackInboxStringContext('feedbackUrl', feedbackUrl)", 'Feedback QR bounded feedback URL context');
	  assertIncludes(feedbackQrDownload, "getBoundedFeedbackInboxStringContext('projectId', projectId)", 'Feedback QR bounded project context');
	  assertIncludes(feedbackQrDownload, 'qrDataUrlLength: qrDataUrl?.length || 0', 'Feedback QR bounded QR data length');
  assertIncludes(feedbackQrDownload, "openIsolatedBrowserUrl(directUrl)", 'Feedback QR direct open safe flags');
  assertIncludes(feedbackQrDownload, "openIsolatedBrowserUrl(whatsappUrl)", 'Feedback QR WhatsApp open safe flags');
  assertNotIncludes(feedbackQrDownload, "if (hasFeedbackClipboardWrite()) {\n            await navigator.clipboard.writeText(value);\n            return;\n        }", 'Feedback QR Clipboard API rejection must not skip acknowledged fallback');
  assertNotIncludes(feedbackInbox, 'console.error(', 'Feedback inbox direct error logging');
  assertNotIncludes(feedbackInbox, 'console.warn(', 'Feedback inbox direct warn logging');
  assertNotIncludes(feedbackInbox, 'console.log(', 'Feedback inbox direct log logging');
  assertNotIncludes(feedbackInbox, 'console.debug(', 'Feedback inbox direct debug logging');
  assertNotIncludes(feedbackQrDownload, 'console.error(', 'Feedback QR direct error logging');
  assertNotIncludes(feedbackQrDownload, 'console.warn(', 'Feedback QR direct warn logging');
  assertNotIncludes(feedbackQrDownload, 'console.log(', 'Feedback QR direct log logging');
  assertNotIncludes(feedbackQrDownload, 'console.debug(', 'Feedback QR direct debug logging');
	  assertNotIncludes(feedbackQrDownload, "window.open(withSrc('direct'), '_blank')", 'Feedback QR direct open must use guarded helper');
	  assertNotIncludes(feedbackQrDownload, "window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank')", 'Feedback QR WhatsApp open must use guarded helper');
	  assertNotIncludes(feedbackQrDownload, 'await navigator.clipboard.writeText(copyUrl);\n            message.success', 'Feedback QR link copy must not use unguarded Clipboard API success');
	  assertNotIncludes(feedbackQrDownload, 'await navigator.clipboard.writeText(shareMessage);\n            message.success', 'Feedback QR message copy must not use unguarded Clipboard API success');
	  assertNotIncludes(feedbackQrDownload, "document.execCommand('copy');\n            message.success", 'Feedback QR textarea copy must not assume success');
	  assertNotIncludes(feedbackQrDownload, "} catch {\n            message.error('Failed to copy feedback link');", 'Feedback QR link copy must not silently swallow failures');
  assertNotIncludes(feedbackQrDownload, "} catch {\n            message.error('Could not copy message');", 'Feedback QR message copy must not silently swallow failures');
  assertNotIncludes(feedbackInbox, '[FeedbackInbox] Fetch error:', 'Feedback inbox raw fetch diagnostic');
  assertNotIncludes(feedbackInbox, '[FeedbackInbox] Update error:', 'Feedback inbox raw update diagnostic');
}

function verifyPublicFeedbackPageDiagnosticsAreBounded() {
  const feedbackPage = read('src/app/feedback/[projectId]/page.tsx');
  const feedbackForm = read('src/components/atoms/GuestFeedbackForm/index.tsx');
  const submitResponse = read('src/lib/feedback/guestFeedbackSubmitResponse.ts');
  const diagnostics = read('src/lib/feedback/publicFeedbackDiagnostics.ts');

  assertIncludes(diagnostics, 'secureError', 'Public feedback page diagnostics secure logging');
  assertIncludes(diagnostics, 'getBoundedPublicFeedbackStringContext', 'Public feedback page diagnostics bounded string context');
  assertIncludes(diagnostics, 'logPublicFeedbackPageFailure', 'Public feedback page diagnostics normalized failure logger');
  assertIncludes(diagnostics, 'logPublicFeedbackFormFailure', 'Public feedback form diagnostics normalized failure logger');
  assertIncludes(diagnostics, 'sourceErrorName: getPublicFeedbackErrorName(error)', 'Public feedback page diagnostics source error name');
  assertIncludes(diagnostics, 'sourceErrorCode: getPublicFeedbackErrorCode(error)', 'Public feedback page diagnostics source error code');
  assertIncludes(diagnostics, 'sourceStatusCode: getPublicFeedbackErrorStatus(error)', 'Public feedback page diagnostics source error status');
  assertIncludes(feedbackPage, 'logPublicFeedbackPageFailure', 'Public feedback page diagnostic usage');
  assertIncludes(feedbackPage, 'public_feedback_page_project_fetch_failed', 'Public feedback page project fetch diagnostic');
  assertIncludes(feedbackPage, 'public_feedback_page_store_fetch_failed', 'Public feedback page store fetch diagnostic');
  assertIncludes(feedbackPage, 'getBoundedPublicFeedbackStringContext', 'Public feedback page bounded context usage');
  assertIncludes(submitResponse, 'GUEST_FEEDBACK_SUBMIT_RESPONSE_JSON_MAX_BYTES = 16 * 1024', 'Public feedback submit response byte cap');
  assertIncludes(submitResponse, 'isGuestFeedbackSubmitResponse', 'Public feedback submit response shape guard');
  assertIncludes(submitResponse, 'isSuccessfulGuestFeedbackSubmitResponse', 'Public feedback submit successful acknowledgement guard');
  assertIncludes(submitResponse, 'isNonEmptyString(value.feedbackId)', 'Public feedback submit success requires non-empty feedback id');
  assertIncludes(feedbackForm, 'readJsonResponseWithLimit<unknown>', 'Public feedback form bounded submit response parser');
  assertIncludes(feedbackForm, 'GUEST_FEEDBACK_SUBMIT_REQUEST_POLICY', 'Public feedback form submit request policy');
  assertIncludes(feedbackForm, "cache: 'no-store'", 'Public feedback form submit request bypasses browser cache');
  assertIncludes(feedbackForm, "credentials: 'same-origin'", 'Public feedback form submit request keeps credentials same-origin');
  assertIncludes(feedbackForm, "redirect: 'manual'", 'Public feedback form submit request does not follow redirects');
  assertIncludes(feedbackForm, '...GUEST_FEEDBACK_SUBMIT_REQUEST_POLICY', 'Public feedback form uses submit request policy');
  assertIncludes(feedbackForm, 'public_guest_feedback_submit_response_parse_failed', 'Public feedback form response parse diagnostics');
  assertIncludes(feedbackForm, 'public_guest_feedback_submit_response_invalid', 'Public feedback form invalid response diagnostics');
  assertIncludes(feedbackForm, 'public_guest_feedback_submit_request_failed', 'Public feedback form request failure diagnostics');
  assertIncludes(feedbackForm, 'response.ok && isSuccessfulGuestFeedbackSubmitResponse(data)', 'Public feedback form success requires HTTP and shaped acknowledgement');
  assertIncludes(feedbackForm, "getBoundedPublicFeedbackStringContext('projectId', projectId)", 'Public feedback form bounded project context');
  assertNotIncludes(feedbackForm, 'const data = await response.json()', 'Public feedback form direct response parsing');
  assertNotIncludes(feedbackForm, 'response.ok && data?.success', 'Public feedback form must not use loose success acknowledgement');
  assertNotIncludes(feedbackForm, 'data.error', 'Public feedback form raw API error text');
  assertNotIncludes(feedbackPage, 'console.error(', 'Public feedback page direct error logging');
  assertNotIncludes(feedbackPage, 'console.warn(', 'Public feedback page direct warn logging');
  assertNotIncludes(feedbackPage, 'console.log(', 'Public feedback page direct log logging');
  assertNotIncludes(feedbackPage, 'console.debug(', 'Public feedback page direct debug logging');
  assertNotIncludes(feedbackPage, '[FeedbackPage] Invalid projectId format:', 'Public feedback page raw project ID diagnostic');
  assertNotIncludes(feedbackPage, '[FeedbackPage] Error fetching project:', 'Public feedback page raw project fetch diagnostic');
  assertNotIncludes(feedbackPage, '[FeedbackPage] Error fetching store info:', 'Public feedback page raw store fetch diagnostic');
}

function verifyGuestFeedbackMolDiagnosticsAreBounded() {
  const guestFeedbackDal = read('src/database/guestFeedback/index.ts');
  const guestFeedbackServerDal = read('src/database/guestFeedback/server.ts');
  const diagnostics = read('src/database/guestFeedback/guestFeedbackDiagnostics.ts');

  assertIncludes(diagnostics, 'secureError', 'Guest feedback diagnostics secure logging');
  assertIncludes(diagnostics, 'getBoundedGuestFeedbackStringContext', 'Guest feedback diagnostics bounded string context');
  assertIncludes(diagnostics, 'logGuestFeedbackFailure', 'Guest feedback diagnostics normalized failure logger');
  assertIncludes(diagnostics, 'sourceErrorName: getGuestFeedbackErrorName(error)', 'Guest feedback diagnostics source error name');
  assertIncludes(diagnostics, 'sourceErrorCode: getGuestFeedbackErrorCode(error)', 'Guest feedback diagnostics source error code');
  assertIncludes(diagnostics, 'sourceStatusCode: getGuestFeedbackErrorStatus(error)', 'Guest feedback diagnostics source error status');
  assertNotIncludes(guestFeedbackDal, 'guest_feedback_mol_event_log_failed', 'Guest feedback removed browser MOL event diagnostics');
  assertNotIncludes(guestFeedbackDal, 'export const logFeedbackMOLEvent = async', 'Guest feedback removed browser MOL writer');
  assertIncludes(guestFeedbackServerDal, 'guest_feedback_admin_mol_event_log_failed', 'Guest feedback admin MOL event diagnostics');
  assertIncludes(guestFeedbackServerDal, 'logGuestFeedbackFailure', 'Guest feedback admin DAL bounded failure logging');
  assertIncludes(guestFeedbackServerDal, 'getBoundedGuestFeedbackStringContext', 'Guest feedback admin DAL bounded context usage');
  assertNotIncludes(guestFeedbackDal, 'console.error(', 'Guest feedback DAL direct error logging');
  assertNotIncludes(guestFeedbackDal, 'console.warn(', 'Guest feedback DAL direct warn logging');
  assertNotIncludes(guestFeedbackDal, 'console.log(', 'Guest feedback DAL direct log logging');
  assertNotIncludes(guestFeedbackDal, 'console.debug(', 'Guest feedback DAL direct debug logging');
  assertNotIncludes(guestFeedbackServerDal, 'console.error(', 'Guest feedback admin DAL direct error logging');
  assertNotIncludes(guestFeedbackServerDal, 'console.warn(', 'Guest feedback admin DAL direct warn logging');
  assertNotIncludes(guestFeedbackServerDal, 'console.log(', 'Guest feedback admin DAL direct log logging');
  assertNotIncludes(guestFeedbackServerDal, 'console.debug(', 'Guest feedback admin DAL direct debug logging');
  assertNotIncludes(guestFeedbackServerDal, '} catch {\n        // Non-blocking operational signal. Feedback submission must not fail.\n    }', 'Guest feedback admin DAL silent MOL catch');
  assertNotIncludes(guestFeedbackDal, '[MOL] Failed to log feedback event:', 'Guest feedback raw MOL diagnostic');
}

function verifyHelpChatDiagnosticsAreBounded() {
  const chatInput = read('src/components/templates/main-app/helpChat/ChatInput.tsx');
  const chatUtils = read('src/components/templates/main-app/helpChat/chatUtils.ts');
  const chatErrorBoundary = read('src/components/templates/main-app/helpChat/ChatErrorBoundary.tsx');
  const chatHandlers = read('src/components/templates/main-app/helpChat/hooks/useChatHandlers.ts');
  const diagnostics = read('src/components/templates/main-app/helpChat/helpChatDiagnostics.ts');
  const messageBubble = read('src/components/templates/main-app/helpChat/MessageBubble.tsx');
  const articleView = read('src/components/organisms/ArticleView/index.tsx');
  const answerlatticeSupportClipboard = read('src/lib/answerlattice/supportClipboard.ts');

  assertIncludes(diagnostics, 'secureError', 'HelpChat diagnostics secure logging');
  assertIncludes(diagnostics, 'getBoundedHelpChatStringContext', 'HelpChat diagnostics bounded string context');
  assertIncludes(diagnostics, 'logHelpChatFailure', 'HelpChat diagnostics normalized failure logger');
  assertIncludes(diagnostics, 'sourceErrorName: getHelpChatErrorName(error)', 'HelpChat diagnostics source error name');
  assertIncludes(diagnostics, 'sourceErrorCode: getHelpChatErrorCode(error)', 'HelpChat diagnostics source error code');
  assertIncludes(diagnostics, 'sourceStatusCode: getHelpChatErrorStatus(error)', 'HelpChat diagnostics source error status');
  assertIncludes(chatInput, 'clearDraft(sessionId, draftScope)', 'HelpChat input failure-contained draft clear');
  assertIncludes(chatInput, 'help_chat_draft_cleanup_failed', 'HelpChat input draft cleanup diagnostics');
  assertIncludes(chatInput, 'help_chat_draft_load_failed', 'HelpChat input draft load diagnostics');
  assertIncludes(chatInput, 'help_chat_draft_save_failed', 'HelpChat input draft save diagnostics');
  assertIncludes(chatUtils, 'help_chat_draft_clear_failed', 'HelpChat utility draft clear diagnostics');
  assertIncludes(chatHandlers, 'help_chat_search_failed', 'HelpChat search diagnostics');
  assertIncludes(chatHandlers, 'help_chat_retry_failed', 'HelpChat retry diagnostics');
  assertIncludes(chatHandlers, 'help_chat_session_persist_failed', 'HelpChat session persist diagnostics');
  assertIncludes(chatHandlers, 'logChatSessionPersistFailure', 'HelpChat session persist bounded failure helper');
  assertIncludes(chatHandlers, 'message_append_mode_transition', 'HelpChat mode-transition persist failure reason');
  assertIncludes(chatHandlers, 'retry_regenerate_replace', 'HelpChat retry persist failure reason');
  assertIncludes(chatHandlers, 'help_chat_message_copy_failed', 'HelpChat message copy diagnostics');
  assertIncludes(chatHandlers, 'copyHelpChatMessageToClipboard', 'HelpChat message copy acknowledgement helper');
  assertIncludes(chatHandlers, 'help_chat_message_copy_clipboard_unavailable', 'HelpChat message copy unavailable clipboard code');
  assertIncludes(chatHandlers, 'help_chat_message_copy_fallback_failed', 'HelpChat message copy failed fallback clipboard code');
  assertIncludes(chatHandlers, 'copyAnswerlatticeSupportTextToClipboard', 'HelpChat message copy shared fallback helper');
  assertIncludes(chatHandlers, 'hasClipboardWrite', 'HelpChat message copy clipboard support metadata');
  assertIncludes(chatHandlers, 'hasCopyFallback', 'HelpChat message copy fallback support metadata');
  assertIncludes(chatHandlers, 'help_chat_feedback_duplicate_ignored', 'HelpChat duplicate feedback diagnostics');
  assertIncludes(chatHandlers, 'help_chat_feedback_up_submit_failed', 'HelpChat positive feedback diagnostics');
  assertIncludes(chatHandlers, 'help_chat_feedback_down_submit_failed', 'HelpChat detailed feedback diagnostics');
  assertIncludes(chatHandlers, "getBoundedHelpChatStringContext('copiedMessageText'", 'HelpChat message copy diagnostics bounded text context');
  assertIncludes(chatErrorBoundary, 'help_chat_error_boundary_triggered', 'HelpChat error boundary diagnostics');
  assertIncludes(chatErrorBoundary, 'logHelpChatFailure(HELP_CHAT_ERROR_BOUNDARY_TRIGGERED', 'HelpChat error boundary bounded failure logging');
  assertIncludes(chatErrorBoundary, "getBoundedHelpChatStringContext('componentStack'", 'HelpChat error boundary bounded component stack context');
  assertIncludes(chatErrorBoundary, 'componentStackFrameCount', 'HelpChat error boundary component stack count metadata');
  assertNotIncludes(chatHandlers, 'navigator.clipboard.writeText(textToCopy)\n                .then', 'HelpChat message copy direct clipboard promise chain');
  assertIncludes(messageBubble, 'help_chat_related_article_open_failed', 'HelpChat related article open diagnostics');
  assertIncludes(messageBubble, "openIsolatedBrowserUrl(helpCenterArticleRouting(articleId))", 'HelpChat related article safe internal route open');
  assertIncludes(messageBubble, "getBoundedHelpChatStringContext('messageId', message.id)", 'HelpChat related article bounded message context');
  assertIncludes(messageBubble, "getBoundedHelpChatStringContext('articleId', article?.id)", 'HelpChat related article bounded article context');
  assertIncludes(messageBubble, 'articleRoutePresent: true', 'HelpChat related article route-presence context');
  assertIncludes(articleView, 'article_view_link_copy_failed', 'ArticleView link copy diagnostics');
  assertIncludes(articleView, 'logArticleViewFailure', 'ArticleView bounded failure logger');
  assertIncludes(articleView, "getBoundedArticleViewStringContext('articleUrl', url)", 'ArticleView bounded link URL context');
  assertIncludes(articleView, "getBoundedArticleViewStringContext('articleRouteSegment', articleRouteSegment)", 'ArticleView bounded route segment context');
  assertIncludes(articleView, 'article_view_link_copy_document_unavailable', 'ArticleView document fallback guard code');
  assertIncludes(articleView, 'article_view_link_copy_fallback_failed', 'ArticleView failed fallback copy rejection code');
  assertIncludes(articleView, 'copyAnswerlatticeSupportTextToClipboard', 'ArticleView shared fallback copy helper');
  assertIncludes(articleView, 'hasClipboardWrite', 'ArticleView copy clipboard support metadata');
  assertIncludes(articleView, 'hasCopyFallback', 'ArticleView copy fallback support metadata');
  assertIncludes(answerlatticeSupportClipboard, 'hasAnswerlatticeSupportClipboardWrite', 'Answerlattice support clipboard helper clipboard support guard');
  assertIncludes(answerlatticeSupportClipboard, 'hasAnswerlatticeSupportCopyFallback', 'Answerlattice support clipboard helper fallback support guard');
  assertIncludes(answerlatticeSupportClipboard, "const copied = document.execCommand('copy');", 'Answerlattice support clipboard helper textarea copy acknowledgement check');
  assertIncludes(answerlatticeSupportClipboard, 'new Error(failureCodes.unavailable)', 'Answerlattice support clipboard helper unavailable rejection');
  assertIncludes(answerlatticeSupportClipboard, 'new Error(failureCodes.fallbackFailed)', 'Answerlattice support clipboard helper fallback rejection');
  [
    ['HelpChat input', chatInput],
    ['HelpChat utility', chatUtils],
    ['HelpChat error boundary', chatErrorBoundary],
    ['HelpChat handlers', chatHandlers],
    ['HelpChat diagnostics helper', diagnostics],
    ['HelpChat message bubble', messageBubble],
    ['ArticleView shared renderer', articleView],
    ['Answerlattice support clipboard helper', answerlatticeSupportClipboard],
  ].forEach(([label, content]) => {
    assertNotIncludes(content, 'console.error(', `${label} direct error logging`);
    assertNotIncludes(content, 'console.warn(', `${label} direct warn logging`);
    assertNotIncludes(content, 'console.log(', `${label} direct log logging`);
    assertNotIncludes(content, 'console.debug(', `${label} direct debug logging`);
  });
  assertNotIncludes(chatInput, 'Failed to clear draft from localStorage:', 'HelpChat input raw draft clear diagnostic');
  assertNotIncludes(chatInput, 'Failed to load draft from localStorage:', 'HelpChat input raw draft load diagnostic');
  assertNotIncludes(chatInput, 'Failed to save draft to localStorage:', 'HelpChat input raw draft save diagnostic');
  assertNotIncludes(chatUtils, 'Failed to clear draft from localStorage:', 'HelpChat utility raw draft clear diagnostic');
  assertNotIncludes(chatHandlers, 'Feedback already in progress for message:', 'HelpChat raw duplicate feedback diagnostic');
  assertNotIncludes(chatHandlers, ".catch(() => antMessage.error('Failed to copy'))", 'HelpChat silent copy failure catch');
  assertNotIncludes(chatHandlers, 'updateChatSession(activeSession.id, updateData).catch(() => { });', 'HelpChat silent session append persist catch');
  assertNotIncludes(chatHandlers, '}).catch(() => { });', 'HelpChat silent session retry persist catch');
  assertNotIncludes(chatHandlers, 'const errorMessage = error?.message', 'HelpChat raw search error message');
  assertNotIncludes(chatHandlers, 'Search failed: ${errorMessage}', 'HelpChat raw search toast text');
  assertNotIncludes(chatErrorBoundary, "import { logger }", 'HelpChat error boundary raw logger import');
  assertNotIncludes(chatErrorBoundary, "logger.error('Help chat error boundary triggered'", 'HelpChat error boundary raw logger diagnostic');
  assertNotIncludes(chatErrorBoundary, 'componentStack: errorInfo.componentStack', 'HelpChat error boundary raw component stack diagnostic');
  assert(!/window\.open\(article\.url, '_blank', 'noopener,noreferrer'\)/.test(messageBubble), 'HelpChat related article open must use bounded handler');
  assertNotIncludes(articleView, "document.execCommand('copy');\n                    setLinkCopied(true);", 'ArticleView must not assume textarea copy success');
  assertNotIncludes(articleView, "catch (err) {\n                    message.error('Failed to copy link.');", 'ArticleView must not keep UI-only fallback copy catch');
}

function verifyBusinessSettingsDiagnosticsAreBounded() {
  const storesDal = read('src/database/stores/index.tsx');
  const projectsDal = read('src/database/projects/index.ts');
  const businessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
  const seoTab = read('src/components/templates/main-app/businessSettings/tabs/SeoTab.tsx');
  const mobileSeoAnalytics = read('src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx');
  const publicMetadata = read('src/lib/seo/publicMetadata.ts');
  const timeSlotCascadeReconciler = read('src/lib/menu/reconcileTimeSlotPresetCascade.ts');
  const timeSlotPresets = read('src/components/templates/main-app/businessSettings/tabs/TimeSlotPresetsTab.tsx');
  const tempStatusCard = read('src/components/templates/main-app/businessSettings/TempStatusCard.tsx');
  const mobileTempStatus = read('src/components/mobile/screens/MobileTempStatusScreen.tsx');
  const mobileHours = read('src/components/mobile/screens/MobileHoursScreen.tsx');
  const mobileWorkingHours = read('src/components/mobile/screens/MobileWorkingHoursEditScreen.tsx');
  const mobileTimeSlots = read('src/components/mobile/screens/MobileTimeSlotsScreen.tsx');
  const mobileAdvancedSettings = read('src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx');
  const compliancePages = read('src/components/templates/main-app/businessSettings/tabs/CompliancePagesSection.tsx');
  const complianceRoute = read('src/app/api/compliance/route.ts');
  const complianceRenderer = read('src/app/client/compliance/CompliancePageContent.tsx');
  const customDomainTab = read('src/components/templates/main-app/businessSettings/tabs/CustomDomainTab.tsx');
  const posSyncTab = read('src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx');
  const posSyncTestResponse = read('src/lib/posSync/testResponse.ts');
  const mobileCompliancePages = read('src/components/mobile/components/MobileCompliancePagesEditor.tsx');
  const authBrowserRequestPolicy = read('src/lib/auth/browserRequestPolicy.ts');
  const diagnostics = read('src/components/templates/main-app/businessSettings/utils/businessSettingsDiagnostics.ts');

  assertIncludes(publicMetadata, 'export function normalizePublicCanonicalUrl(value: unknown): string | null', 'Shared public canonical URL normalizer');
  assertIncludes(publicMetadata, "parsed.protocol !== 'https:' || parsed.username || parsed.password", 'Public canonical URL HTTPS and credential boundary');
  assertIncludes(businessSettings, 'normalizePublicCanonicalUrl(changesToUpload.canonicalUrl)', 'Desktop business settings canonical URL write admission');
  assertIncludes(businessSettings, 'mergeCurrentLocalizedSeoDraft(', 'Desktop SEO submit synchronously captures the visible localized draft');
  assertIncludes(businessSettings, 'Array.isArray(submittedSeoKeywordsSnapshot)', 'Desktop SEO save consumes the explicit visible keyword snapshot');
  assertIncludes(businessSettings, 'updateLocalizedStringList(\n                draftedSeoKeywords,', 'Desktop SEO applies the submitted language keyword snapshot last');
  assertIncludes(seoTab, 'normalizePublicCanonicalUrl(value)', 'Desktop SEO canonical URL field admission');
  assertIncludes(seoTab, 'onChange={handleKeywordsChange}', 'Desktop SEO keyword changes synchronously update the submitted localized draft');
  assertIncludes(seoTab, 'onBeforeSaveKeywords?.(', 'Desktop SEO save snapshots the current tag control value outside Ant form collection');
  assertIncludes(seoTab, 'onSelect={handleKeywordSelect}', 'Desktop SEO tag additions use the Select event that Ant Form does not replace');
  assertIncludes(seoTab, 'onDeselect={handleKeywordDeselect}', 'Desktop SEO tag removals update the submit snapshot');
  assertIncludes(seoTab, 'onInputKeyDown={handleKeywordInputKeyDown}', 'Desktop SEO free-form tags are captured from the raw input commit event');
  assertIncludes(mobileSeoAnalytics, 'const normalizedCanonicalUrl = normalizePublicCanonicalUrl(canonicalUrl);', 'Mobile SEO canonical URL write admission');
  assertIncludes(mobileSeoAnalytics, 'canonicalUrl: normalizedCanonicalUrl,', 'Mobile SEO persists only normalized canonical URL truth');
  assertIncludes(diagnostics, 'secureError', 'Business settings diagnostics secure logging');
  assertIncludes(diagnostics, 'getBoundedBusinessSettingsStringContext', 'Business settings diagnostics bounded string context');
  assertIncludes(diagnostics, 'logBusinessSettingsFailure', 'Business settings diagnostics normalized failure logger');
  assertIncludes(diagnostics, 'sourceErrorName: getBusinessSettingsErrorName(error)', 'Business settings diagnostics source error name');
  assertIncludes(diagnostics, 'sourceErrorCode: getBusinessSettingsErrorCode(error)', 'Business settings diagnostics source error code');
  assertIncludes(diagnostics, 'sourceStatusCode: getBusinessSettingsErrorStatus(error)', 'Business settings diagnostics source error status');
  assertIncludes(complianceRenderer, 'function normalizePublicComplianceStoreDocumentId(value: unknown): string | null', 'Public compliance store document ID normalizer');
  assertIncludes(complianceRenderer, 'const complianceStoreDocumentId = normalizePublicComplianceStoreDocumentId(sId);', 'Public compliance normalizes store document ID before override read');
  assertIncludes(complianceRenderer, 'getCachedComplianceOverridesServer(', 'Public compliance uses normalized cached override document ID');
  assertIncludes(complianceRenderer, 'complianceTenantDocumentId,', 'Public compliance proves expected tenant scope');
  assertIncludes(complianceRenderer, 'public_compliance_invalid_store_scope', 'Public compliance invalid store scope diagnostic');
  assertIncludes(complianceRenderer, 'public_compliance_override_read_failed', 'Public compliance override read diagnostics');
  assertIncludes(complianceRenderer, "getBoundedRuntimeStringContext('storeId', context.storeId)", 'Public compliance bounded store context');
  assertIncludes(complianceRenderer, "getBoundedRuntimeStringContext('pageType', context.type)", 'Public compliance bounded page type context');
  assertNotIncludes(complianceRenderer, '.doc(String(sId))', 'Public compliance must not build override refs from raw String(sId)');
  assertNotIncludes(complianceRenderer, '} catch {\n        // Firestore error', 'Public compliance override read must not silently fall back');
  assertNotIncludes(complianceRenderer, 'console.error', 'Public compliance direct error logging');
  assertNotIncludes(complianceRenderer, 'console.warn', 'Public compliance direct warn logging');
  assertIncludes(authBrowserRequestPolicy, "cache: 'no-store' as RequestCache", 'Shared auth browser request policy cache bypass');
  assertIncludes(authBrowserRequestPolicy, "credentials: 'same-origin' as RequestCredentials", 'Shared auth browser request policy credential scope');
  assertIncludes(authBrowserRequestPolicy, "redirect: 'manual' as RequestRedirect", 'Shared auth browser request policy redirect boundary');
  assertIncludes(storesDal, 'export function assertTimeSlotPresetUpdateSucceeded', 'Store time-slot preset write acknowledgement guard');
  assertIncludes(storesDal, "throw new Error('time_slot_preset_update_rejected');", 'Store time-slot preset rejected write code');
  assertIncludes(storesDal, 'await revalidatePublicClientCache(storeId, "updateTimeSlotPresets");', 'Store time-slot preset writes must refresh public cache');
  assertIncludes(storesDal, 'timeSlotPresetCascadePending: pendingCascade', 'Store time-slot preset edit/delete must atomically persist its project-cascade marker');
  assertIncludes(storesDal, "throw new Error('time_slot_preset_cascade_pending');", 'Store time-slot preset writes must reject while an earlier cascade remains pending');
  assertIncludes(storesDal, 'timeSlotPresetCascadePending: deleteField(),', 'Store time-slot preset cascade completion must clear its durable marker');
  assertIncludes(storesDal, "throw new Error('time_slot_preset_cascade_operation_conflict');", 'Store time-slot preset cascade completion must be operation-owned');
  assertIncludes(projectsDal, 'export function assertProjectPresetCascadeSucceeded', 'Project preset cascade acknowledgement guard');
  assertIncludes(projectsDal, 'project_preset_cascade_update_rejected', 'Project preset cascade rejected write code');
  assertIncludes(projectsDal, 'mutation.type === "remove"', 'Project preset delete retry must retain the complete exact-store cache recovery set');
  assertIncludes(projectsDal, '|| projectReferencesTimeSlotPreset(project, presetId)', 'Project preset update may retain the referenced-project cache recovery set');
  assertIncludes(projectsDal, 'await revalidatePublicClientCacheForProject(projectDoc.id, cacheContext);', 'Every admitted preset reconciliation candidate must revalidate cache even when its data was already projected');
  assertIncludes(timeSlotCascadeReconciler, 'export async function reconcileTimeSlotPresetCascade(', 'Time-slot preset durable reconciliation entry point');
  assertIncludes(timeSlotCascadeReconciler, 'assertProjectPresetCascadeSucceeded(', 'Time-slot preset durable reconciliation requires project acknowledgement');
  assertIncludes(timeSlotCascadeReconciler, 'assertTimeSlotPresetCascadeCompleted(completionResult);', 'Time-slot preset durable reconciliation requires marker-clear acknowledgement');
  assertIncludes(timeSlotPresets, 'assertTimeSlotPresetUpdateSucceeded(writeResult);', 'Business settings time-slot writes must require explicit success acknowledgement');
  assertIncludes(timeSlotPresets, 'await reconcileTimeSlotPresetCascade(expectedScope, writeResult.pendingCascade);', 'Business settings time-slot cascade writes must use durable reconciliation');
  assertIncludes(timeSlotPresets, 'business_settings_time_slot_preset_recovery_failed', 'Business settings time-slot pending cascade recovery diagnostics');
  assertIncludes(timeSlotPresets, 'recoveryAttemptedOperationRef.current = pendingCascade.operationId;', 'Business settings time-slot pending cascade recovery must be bounded per mount');
  assertIncludes(timeSlotPresets, 'business_settings_time_slot_preset_cascade_update_rejected', 'Business settings time-slot cascade update rejected code');
  assertIncludes(timeSlotPresets, 'business_settings_time_slot_preset_cascade_delete_rejected', 'Business settings time-slot cascade delete rejected code');
  assertIncludes(timeSlotPresets, 'business_settings_time_slot_preset_save_failed', 'Business settings time-slot save diagnostics');
  assertIncludes(timeSlotPresets, 'business_settings_time_slot_preset_delete_failed', 'Business settings time-slot delete diagnostics');
  assertIncludes(timeSlotPresets, 'getTimeSlotPresetDraftIssue(formData, presets, editingPreset?.id);', 'Desktop time-slot draft validation boundary');
  assertIncludes(timeSlotPresets, 'okButtonProps={{ disabled: Boolean(formIssue) }}', 'Desktop invalid time-slot action lock');
  assertIncludes(businessSettings, 'function BusinessSettingsContent(', 'Desktop Business Settings keyed content boundary');
  assertIncludes(businessSettings, '<BusinessSettingsStateBoundary', 'Desktop Business Settings local state boundary');
  assertIncludes(businessSettings, 'key={scopeKey}', 'Desktop Business Settings exact tenant/store remount');
  assertIncludes(businessSettings, 'const settingsSaveInFlightRef = useRef(false);', 'Desktop Business Settings duplicate save guard');
  assertIncludes(businessSettings, 'activeBusinessSettingsScopeRef.current !== requestScopeKey', 'Desktop Business Settings save admission scope guard');
  assertIncludes(businessSettings, 'activeBusinessSettingsScopeRef.current === requestScopeKey', 'Desktop Business Settings settlement scope guard');
  assertIncludes(seoTab, 'aria-label="Reset SEO and AEO"', 'Desktop SEO and AEO reset action accessible name');
  assertIncludes(seoTab, 'aria-label="Save SEO and AEO"', 'Desktop SEO and AEO save action accessible name');
  assertIncludes(mobileTimeSlots, 'assertTimeSlotPresetUpdateSucceeded(writeResult);', 'Mobile time-slot writes must require explicit success acknowledgement');
  assertIncludes(mobileTimeSlots, 'await reconcileTimeSlotPresetCascade(', 'Mobile time-slot cascade writes must use durable reconciliation');
  assertIncludes(mobileTimeSlots, 'mobile_time_slot_preset_recovery_failed', 'Mobile time-slot pending cascade recovery diagnostics');
  assertIncludes(mobileTimeSlots, 'recoveryAttemptedOperationRef.current = pendingCascade.operationId;', 'Mobile time-slot pending cascade recovery must be bounded per mount');
  assertIncludes(mobileTimeSlots, 'mobile_time_slot_preset_cascade_update_rejected', 'Mobile time-slot cascade update rejected code');
  assertIncludes(mobileTimeSlots, 'mobile_time_slot_preset_cascade_delete_rejected', 'Mobile time-slot cascade delete rejected code');
  assertIncludes(mobileTimeSlots, 'mobile_time_slot_preset_save_failed', 'Mobile time-slot save diagnostics');
  assertIncludes(mobileTimeSlots, 'mobile_time_slot_preset_delete_failed', 'Mobile time-slot delete diagnostics');
  assertIncludes(mobileTimeSlots, "getBoundedMobileOwnerStringContext('presetLabel'", 'Mobile time-slot bounded preset label context');
  assertIncludes(mobileTimeSlots, 'presetCount: presets.length', 'Mobile time-slot bounded preset count context');
  assertIncludes(mobileTimeSlots, 'remainingPresetCount: Math.max(presets.length - 1, 0)', 'Mobile time-slot bounded remaining preset context');
  assertIncludes(mobileTimeSlots, 'getTimeSlotPresetDraftIssue({', 'Mobile time-slot draft validation boundary');
  assertIncludes(mobileTimeSlots, 'id="mobile-time-slot-draft-error" role="alert"', 'Mobile time-slot persistent draft feedback');
  assertIncludes(mobileTimeSlots, 'disabled={Boolean(formIssue)}', 'Mobile invalid time-slot action lock');
	[
    'desktop_temp_status_set_failed',
    'desktop_temp_status_clear_failed',
  ].forEach((failureCode) => {
    assertIncludes(tempStatusCard, failureCode, 'Desktop temporary status diagnostics');
  });
  assertIncludes(tempStatusCard, 'AUTH_BROWSER_REQUEST_POLICY', 'Desktop temporary status shared authenticated browser request policy');
  assertOccurrenceAtLeast(tempStatusCard, "fetch('/api/store/temp-status'", 2, 'Desktop temporary status API calls');
  assertOccurrenceAtLeast(tempStatusCard, '...AUTH_BROWSER_REQUEST_POLICY', 2, 'Desktop temporary status mutations spread shared browser request policy');
  assertOccurrenceAtLeast(tempStatusCard, 'expectedStoreId: String(expectedStoreId)', 2, 'Desktop temporary status initiating-store corroboration');
  assertOccurrenceAtLeast(tempStatusCard, 'expectedTenantId: String(expectedTenantId)', 2, 'Desktop temporary status initiating-tenant corroboration');
  assertIncludes(tempStatusCard, 'actionInFlightRef.current', 'Desktop temporary status immediate duplicate-action guard');
  assertIncludes(tempStatusCard, 'isExpectedScope(expectedTenantId, expectedStoreId)', 'Desktop temporary status exact-scope async settlement');
  assertIncludes(tempStatusCard, 'getTempStatusDraftIssue({', 'Desktop temporary status uses shared draft validation');
  assertIncludes(tempStatusCard, 'disabled={Boolean(draftIssue)}', 'Desktop temporary status locks invalid publication');
  assertIncludes(tempStatusCard, 'role="alert" type="danger"', 'Desktop temporary status announces validation and mutation errors');
  assertNotIncludes(tempStatusCard, "customMessage.trim() || 'Temporary notice'", 'Desktop temporary status must not silently publish generic custom copy');
  assertNotIncludes(tempStatusCard, "fetch('/api/store/temp-status', {\n                cache: 'no-store'", 'Desktop temporary status inline request policy');
  [
    'mobile_temp_status_set_failed',
    'mobile_temp_status_set_rejected',
    'mobile_temp_status_clear_failed',
    'mobile_temp_status_clear_rejected',
  ].forEach((failureCode) => {
    assertIncludes(mobileTempStatus, failureCode, 'Mobile temporary status diagnostics');
  });
  assertIncludes(mobileTempStatus, 'AUTH_BROWSER_REQUEST_POLICY', 'Mobile temporary status shared authenticated browser request policy');
  assertOccurrenceAtLeast(mobileTempStatus, "fetch('/api/store/temp-status'", 2, 'Mobile temporary status API calls');
  assertOccurrenceAtLeast(mobileTempStatus, '...AUTH_BROWSER_REQUEST_POLICY', 2, 'Mobile temporary status mutations spread shared browser request policy');
  assertOccurrenceAtLeast(mobileTempStatus, 'expectedStoreId: String(expectedStoreId)', 2, 'Mobile temporary status initiating-store corroboration');
  assertOccurrenceAtLeast(mobileTempStatus, 'expectedTenantId: String(expectedTenantId)', 2, 'Mobile temporary status initiating-tenant corroboration');
  assertNotIncludes(mobileTempStatus, "fetch('/api/store/temp-status', {\n                cache: 'no-store'", 'Mobile temporary status inline request policy');
  assertIncludes(mobileTempStatus, 'return <MobileTempStatusScreenContent key={scopeKey} {...props} />;', 'Mobile temporary status exact tenant/store keyed mount');
  assertIncludes(mobileTempStatus, 'tempStatusActionInFlightRef.current', 'Mobile temporary status immediate duplicate-action guard');
  assertIncludes(mobileTempStatus, 'getTempStatusDraftIssue({', 'Mobile temporary-status screen uses shared draft validation');
  assertIncludes(mobileTempStatus, 'draftIssue={draftIssue}', 'Mobile temporary-status screen exposes persistent draft feedback');
  assertIncludes(mobileTempStatus, 'isExpectedStoreScope(expectedTenantId, expectedStoreId)', 'Mobile temporary status exact-scope async settlement');
  assertOccurrenceAtLeast(mobileTempStatus, 'prev === optimisticStoreDetails', 2, 'Mobile temporary status attempt-owned rollback');
  assertIncludes(mobileHours, 'AUTH_BROWSER_REQUEST_POLICY', 'Mobile Today temporary status shared authenticated browser request policy');
  assertOccurrenceAtLeast(mobileHours, "fetch('/api/store/temp-status'", 3, 'Mobile Today temporary status API calls');
  assertOccurrenceAtLeast(mobileHours, '...AUTH_BROWSER_REQUEST_POLICY', 3, 'Mobile Today temporary status mutations spread shared browser request policy');
  assertOccurrenceAtLeast(mobileHours, 'expectedStoreId: String(expectedStoreId)', 3, 'Mobile Today temporary status initiating-store corroboration');
  assertOccurrenceAtLeast(mobileHours, 'expectedTenantId: String(expectedTenantId)', 3, 'Mobile Today temporary status initiating-tenant corroboration');
  assertIncludes(mobileHours, 'tempStatusActionInFlightRef.current', 'Mobile Today temporary status immediate duplicate-action guard');
  assertIncludes(mobileHours, 'getTempStatusDraftIssue({', 'Mobile Today uses shared draft validation');
  assertIncludes(mobileHours, 'draftIssue={tempStatusDraftIssue}', 'Mobile Today exposes persistent draft feedback');
  assertIncludes(mobileHours, 'isExpectedTempStatusScope(expectedTenantId, expectedStoreId)', 'Mobile Today temporary status exact-scope async settlement');
  assertNotIncludes(mobileHours, "fetch('/api/store/temp-status', {\n                cache: 'no-store'", 'Mobile Today temporary status inline request policy');
  assertIncludes(mobileTempStatus, 'logMobileOwnerFailure', 'Mobile temporary status bounded failure logger');
  assertNotIncludes(mobileTempStatus, "throw new Error('Failed to set status')", 'Mobile temporary status raw set error');
  assertNotIncludes(mobileTempStatus, "throw new Error('Failed to clear status')", 'Mobile temporary status raw clear error');
  assertIncludes(mobileWorkingHours, 'mobile_working_hours_save_failed', 'Mobile working hours save diagnostics');
  assertIncludes(mobileWorkingHours, 'assertStoreUpdateSucceeded(', 'Mobile working hours store update acknowledgement guard');
  assertIncludes(mobileWorkingHours, 'mobile_working_hours_store_update_rejected', 'Mobile working hours rejected acknowledgement code');
  assertIncludes(mobileWorkingHours, 'changedDayCount: DAYS.filter', 'Mobile working hours bounded changed-day count context');
  assertIncludes(mobileWorkingHours, 'closedDayCount: DAYS.filter', 'Mobile working hours bounded closed-day count context');
  assertIncludes(mobileWorkingHours, 'hasPreviousWorkingHours: Object.keys(previousWorkingHours).length > 0', 'Mobile working hours previous state context');
  assertIncludes(mobileWorkingHours, '<MobileWorkingHoursEditScreenContent key={scopeKey}', 'Mobile working hours exact tenant/store remount');
  assertIncludes(mobileWorkingHours, "String(previous?.tenantId ?? '') === String(expectedTenantId)", 'Mobile working hours optimistic/rollback tenant guard');
  assertIncludes(mobileWorkingHours, "String(previous?.storeId ?? '') === String(expectedStoreId)", 'Mobile working hours optimistic/rollback store guard');
  assertIncludes(mobileWorkingHours, 'previous?.hoursLastUpdatedAt === hoursLastUpdatedAt', 'Mobile working hours rollback ownership marker');
  assertIncludes(mobileHours, 'assertStoreUpdateSucceeded(', 'Mobile Today hours store update acknowledgement guard');
  assertIncludes(mobileHours, 'mobile_today_hours_store_update_rejected', 'Mobile Today hours rejected acknowledgement code');
  assertIncludes(mobileHours, 'mobile_today_hours_update_failed', 'Mobile Today hours update diagnostics');
  assertIncludes(mobileHours, '<MobileHoursScreenContent key={scopeKey}', 'Mobile Today exact tenant/store remount');
  assertIncludes(mobileHours, 'const hoursActionInFlightRef = useRef(false);', 'Mobile Today duplicate hours-write guard');
  assertIncludes(mobileHours, "String(previous?.tenantId ?? '') === String(expectedTenantId)", 'Mobile Today optimistic/rollback tenant guard');
  assertIncludes(mobileHours, "String(previous?.storeId ?? '') === String(expectedStoreId)", 'Mobile Today optimistic/rollback store guard');
  assertIncludes(mobileHours, 'previous?.hoursLastUpdatedAt === hoursLastUpdatedAt', 'Mobile Today rollback ownership marker');
  assertIncludes(mobileAdvancedSettings, 'mobile_advanced_settings_save_failed', 'Mobile advanced settings save diagnostics');
  assertIncludes(mobileAdvancedSettings, 'mobile_advanced_settings_external_link_open_failed', 'Mobile advanced settings external-link diagnostics');
  assertIncludes(mobileAdvancedSettings, 'hasSocialMediaUpdate: Boolean(updates.socialMedia)', 'Mobile advanced settings bounded social update context');
  assertIncludes(mobileAdvancedSettings, "hasFeedbackEnabledUpdate: Object.prototype.hasOwnProperty.call(updates, 'feedbackEnabled')", 'Mobile advanced settings bounded feedback toggle context');
  assertIncludes(mobileAdvancedSettings, 'hasFeedbackDefaultsUpdate: Boolean(updates.feedbackDefaults)', 'Mobile advanced settings bounded feedback defaults context');
  assertIncludes(mobileAdvancedSettings, 'openIsolatedBrowserUrl(normalized)', 'Mobile advanced settings isolated social link open');
  assertIncludes(mobileAdvancedSettings, 'formatOwnerSocialPlatformLabel(key)', 'Mobile advanced settings customer-readable custom social label');
  assertIncludes(mobileAdvancedSettings, 'formatOwnerSocialPlatformLabel(platformKey)', 'Mobile advanced settings custom social edit label recovery');
  assertIncludes(mobileAdvancedSettings, "getBoundedMobileOwnerStringContext('platformKey', platformKey)", 'Mobile advanced settings social link bounded platform context');
  assertIncludes(mobileAdvancedSettings, "getBoundedMobileOwnerStringContext('socialUrl', normalized)", 'Mobile advanced settings social link bounded URL context');
  assertNotIncludes(mobileAdvancedSettings, 'window.open(', 'Mobile advanced settings no-opener handle acknowledgement');
	[
    [compliancePages, 'standalone compliance pages section'],
    [customDomainTab, 'custom domain compliance section'],
  ].forEach(([content, label]) => {
    assertIncludes(content, 'desktop_compliance_page_save_failed', `${label} save diagnostics`);
    assertIncludes(content, 'desktop_compliance_page_reset_failed', `${label} reset diagnostics`);
    assertIncludes(content, 'desktop_compliance_page_open_failed', `${label} open diagnostics`);
    assertIncludes(content, 'desktop_compliance_pages_load_failed', `${label} load diagnostics`);
    assertIncludes(content, 'desktop_compliance_pages_load_rejected', `${label} load rejection code`);
    assertIncludes(content, 'desktop_compliance_pages_load_response_parse_failed', `${label} load response parse diagnostics`);
    assertIncludes(content, 'desktop_compliance_pages_load_response_invalid', `${label} load response invalid diagnostics`);
    assertIncludes(content, 'desktop_compliance_page_response_parse_failed', `${label} mutation response parse diagnostics`);
    assertIncludes(content, 'desktop_compliance_page_response_invalid', `${label} mutation response invalid diagnostics`);
    assertIncludes(content, 'desktop_compliance_page_save_response_invalid', `${label} save invalid response code`);
    assertIncludes(content, 'desktop_compliance_page_reset_response_invalid', `${label} reset invalid response code`);
    assertIncludes(content, 'isSuccessfulComplianceMutationResponse', `${label} shaped compliance mutation acknowledgement guard`);
    assertIncludes(content, "value.type === type", `${label} mutation acknowledgement must match compliance page type`);
    assertIncludes(content, "value.action === getExpectedComplianceApiMutationAction(action)", `${label} mutation acknowledgement must match API action`);
    assertIncludes(content, 'hasExpectedAction', `${label} invalid mutation acknowledgement diagnostics include action match`);
    assertIncludes(content, 'hasExpectedType', `${label} invalid mutation acknowledgement diagnostics include type match`);
    assertIncludes(content, 'readDesktopComplianceMutationResponseJson', `${label} mutation response helper`);
    assertIncludes(content, 'readDesktopComplianceLoadResponseJson', `${label} load response helper`);
    assertIncludes(content, 'readJsonResponseWithLimit<ComplianceMutationResponse>', `${label} bounded mutation response parser`);
    assertIncludes(content, 'readJsonResponseWithLimit<unknown>', `${label} bounded load response parser`);
    assertIncludes(content, 'DESKTOP_COMPLIANCE_MUTATION_RESPONSE_JSON_MAX_BYTES', `${label} mutation response byte cap`);
	    assertIncludes(content, 'DESKTOP_COMPLIANCE_LOAD_RESPONSE_JSON_MAX_BYTES', `${label} load response byte cap`);
	    assertIncludes(content, 'AUTH_BROWSER_REQUEST_POLICY', `${label} shared authenticated browser request policy`);
	    assertOccurrenceAtLeast(content, "fetch('/api/compliance'", 2, `${label} compliance mutation calls`);
	    assertIncludes(content, 'api/compliance?storeId=${encodeURIComponent(', `${label} compliance load active-store scope`);
	    assertOccurrenceAtLeast(content, 'AUTH_BROWSER_REQUEST_POLICY', 4, `${label} compliance API calls share browser request policy`);
	    assertOccurrenceAtLeast(content, '...AUTH_BROWSER_REQUEST_POLICY', 2, `${label} compliance mutations spread shared browser request policy`);
	    assertIncludes(content, "getBoundedBusinessSettingsStringContext('pageUrl', pageUrl)", `${label} bounded page URL context`);
	    assertIncludes(content, "openIsolatedBrowserUrl(pageUrl)", `${label} safe page open`);
    assertNotIncludes(content, "fetch('/api/compliance', {\n                cache: 'no-store'", `${label} inline compliance request policy`);
    assertNotIncludes(content, 'if (!result?.success)', `${label} must not accept generic compliance mutation success`);
    assertNotIncludes(content, 'err.response?.data?.error', `${label} raw API response text`);
    assertNotIncludes(content, "axios.get('/api/compliance')", `${label} unbounded compliance load`);
    assertNotIncludes(content, "axios.post('/api/compliance'", `${label} unbounded compliance mutation`);
    assertNotIncludes(content, "window.open(pageUrl, '_blank')", `${label} unsafe page open`);
  });
  assertIncludes(customDomainTab, 'desktop_custom_domain_open_failed', 'Custom domain active-domain open diagnostics');
  assertIncludes(customDomainTab, 'desktop_custom_domain_link_copy_failed', 'Custom domain active-domain copy diagnostics');
  assertIncludes(customDomainTab, 'desktop_custom_domain_dns_copy_failed', 'Custom domain DNS copy diagnostics');
  assertIncludes(customDomainTab, "getBoundedStoreStringContext('openUrl', activeDomainUrl)", 'Custom domain active-domain bounded open URL context');
  assertIncludes(customDomainTab, "getBoundedStoreStringContext('copyValue', text)", 'Custom domain active-domain bounded copy URL context');
  assertIncludes(customDomainTab, "getBoundedStoreStringContext('dnsRecordValue', record?.value)", 'Custom domain DNS bounded copy value context');
  assertIncludes(customDomainTab, "openIsolatedBrowserUrl(activeDomainUrl)", 'Custom domain active-domain safe open');
  assertIncludes(customDomainTab, "await navigator.clipboard.writeText(text);", 'Custom domain copy waits for clipboard acknowledgement');
  assertIncludes(customDomainTab, 'copyDesktopCustomDomainTextToClipboard(text)', 'Custom domain copy uses acknowledgement helper');
  assertIncludes(customDomainTab, 'desktop_custom_domain_copy_clipboard_unavailable', 'Custom domain copy unavailable failure code');
  assertIncludes(customDomainTab, 'desktop_custom_domain_copy_fallback_failed', 'Custom domain copy fallback failure code');
  assertIncludes(customDomainTab, 'hasDesktopCustomDomainClipboardWrite', 'Custom domain copy Clipboard support helper');
  assertIncludes(customDomainTab, 'hasDesktopCustomDomainCopyFallback', 'Custom domain copy fallback support helper');
  assertIncludes(customDomainTab, "const copied = document.execCommand('copy');", 'Custom domain textarea copy acknowledgement');
  assertIncludes(customDomainTab, 'hasClipboardWrite: hasDesktopCustomDomainClipboardWrite()', 'Custom domain copy Clipboard support metadata');
  assertIncludes(customDomainTab, 'hasCopyFallback: hasDesktopCustomDomainCopyFallback()', 'Custom domain copy fallback support metadata');
  assertNotIncludes(customDomainTab, "window.open(activeDomainUrl, '_blank')", 'Custom domain active-domain unsafe open');
  assertNotIncludes(customDomainTab, "navigator.clipboard.writeText(text);\n        setCopied(label);", 'Custom domain copy must not show copied state before clipboard acknowledgement');
  assertNotIncludes(customDomainTab, "await navigator.clipboard.writeText(text);\n            setCopied(label);", 'Custom domain copy must not skip fallback after Clipboard API rejection');
  [
    'desktop_pos_sync_delivery_history_load_failed',
    'desktop_pos_sync_toggle_save_failed',
    'desktop_pos_sync_url_save_failed',
    'desktop_pos_sync_secret_rotation_save_failed',
    'desktop_pos_sync_secret_copy_failed',
    'desktop_pos_sync_instructions_prepare_failed',
    'desktop_pos_sync_technical_summary_copy_failed',
    'desktop_pos_sync_sample_download_failed',
  ].forEach((failureCode) => {
    assertIncludes(posSyncTab, failureCode, 'Desktop POS Sync handoff diagnostics');
  });
  assertIncludes(posSyncTestResponse, 'POS_SYNC_TEST_RESPONSE_JSON_MAX_BYTES = 16 * 1024', 'POS Sync test response byte cap');
  assertIncludes(posSyncTestResponse, 'isPosSyncTestResponse', 'POS Sync test response shape guard');
  assertIncludes(posSyncTestResponse, 'isSuccessfulPosSyncTestResponse', 'POS Sync successful test response acknowledgement guard');
  assertIncludes(posSyncTestResponse, 'export const POS_SYNC_TEST_REQUEST_POLICY', 'POS Sync shared test request policy export');
  assertIncludes(posSyncTestResponse, "cache: 'no-store'", 'POS Sync shared test request bypasses browser cache');
  assertIncludes(posSyncTestResponse, "credentials: 'same-origin'", 'POS Sync shared test request keeps credentials same-origin');
  assertIncludes(posSyncTestResponse, "redirect: 'manual'", 'POS Sync shared test request does not follow redirects');
  assertIncludes(posSyncTab, 'POS_SYNC_TEST_REQUEST_POLICY', 'Desktop POS Sync test request policy');
  assertIncludes(posSyncTab, 'from "@lib/posSync/testResponse"', 'Desktop POS Sync imports shared test response helper');
  assertIncludes(posSyncTab, '...POS_SYNC_TEST_REQUEST_POLICY', 'Desktop POS Sync uses test request policy');
  assertIncludes(posSyncTab, 'readJsonResponseWithLimit<unknown>', 'Desktop POS Sync bounded test response parser');
  assertIncludes(posSyncTab, 'desktop_pos_sync_test_response_parse_failed', 'Desktop POS Sync test response parse diagnostics');
  assertIncludes(posSyncTab, 'desktop_pos_sync_test_response_invalid', 'Desktop POS Sync test response invalid diagnostics');
  assertIncludes(posSyncTab, 'res.ok && isSuccessfulPosSyncTestResponse(data)', 'Desktop POS Sync success requires HTTP and shaped acknowledgement');
  assertIncludes(posSyncTab, 'buildPosSyncLogContext', 'Desktop POS Sync bounded context helper');
  assertIncludes(posSyncTab, "getBoundedBusinessSettingsStringContext('tenantId', tenantId)", 'Desktop POS Sync bounded tenant context');
  assertIncludes(posSyncTab, "throw createPosSyncStatusError('desktop_pos_sync_settings_missing_store_update_handler')", 'Desktop POS Sync settings missing update handler diagnostic');
  assertIncludes(posSyncTab, 'await Promise.resolve(onStoreUpdate(updates));', 'Desktop POS Sync toggle waits for store persistence');
  assertIncludes(posSyncTab, 'if (checked) {\n            const validation = validatePosSyncWebhookUrl(normalizedWebhookUrl);', 'Desktop POS Sync validates the provider URL before enablement');
  assertIncludes(posSyncTab, "if (checked) updates['posSync.webhookUrl'] = normalizedWebhookUrl;", 'Desktop POS Sync atomically persists its validated URL when enabling');
  assertIncludes(posSyncTab, "'posSync.webhookUrl': validation.normalizedUrl,\n                'posSync.status': enabled ? 'healthy' : 'disabled',", 'Desktop POS Sync URL save waits for store persistence and clears stale connection status');
  assertIncludes(posSyncTab, "requestPosSyncSecret({ action: 'rotate', storeId, tenantId })", 'Desktop POS Sync rotation waits for protected server persistence');
  assertIncludes(posSyncTab, 'disabled={!webhookSecret || secretLoading}', 'Desktop POS Sync only offers secret rotation for an existing secret');
  assertIncludes(posSyncTab, "'posSync.secretVersion': result.version", 'Desktop POS Sync rotation projects the acknowledged secret version');
  assertIncludes(posSyncTab, 'confirmLoading={regeneratingSecret}', 'Desktop POS Sync secret rotation modal save loading state');
  assertIncludes(posSyncTab, 'previousWebhookSecretLength: webhookSecret.length', 'Desktop POS Sync bounded previous secret length context');
  assertNotIncludes(posSyncTab, 'generateWebhookSecret()', 'Desktop POS Sync must not generate signing secrets in the browser');
  assertIncludes(posSyncTab, 'webhookSecretLength: webhookSecret.length', 'Desktop POS Sync bounded secret length context');
  assertIncludes(posSyncTab, 'technicalSummaryLength: technicalSummary.length', 'Desktop POS Sync bounded technical summary length context');
  assertIncludes(posSyncTab, 'sampleJsonLength: sampleJson.length', 'Desktop POS Sync bounded sample payload length context');
  assertNotIncludes(posSyncTab, 'const POS_SYNC_TEST_REQUEST_POLICY = {', 'Desktop POS Sync must use shared test request policy');
  assertIncludes(mobileCompliancePages, 'mobile_compliance_pages_load_failed', 'Mobile compliance page load diagnostics');
  assertIncludes(mobileCompliancePages, 'mobile_compliance_pages_load_rejected', 'Mobile compliance page load rejection code');
  assertIncludes(mobileCompliancePages, 'mobile_compliance_pages_load_response_parse_failed', 'Mobile compliance page load response parse diagnostics');
  assertIncludes(mobileCompliancePages, 'mobile_compliance_pages_load_response_invalid', 'Mobile compliance page load response invalid diagnostics');
  assertIncludes(mobileCompliancePages, 'mobile_compliance_pages_load_scope_invalid', 'Mobile compliance page load scope mismatch diagnostics');
  assertIncludes(mobileCompliancePages, 'mobile_compliance_page_save_failed', 'Mobile compliance page save diagnostics');
  assertIncludes(mobileCompliancePages, 'mobile_compliance_page_reset_failed', 'Mobile compliance page reset diagnostics');
  assertIncludes(mobileCompliancePages, 'mobile_compliance_page_open_failed', 'Mobile compliance page open diagnostics');
  assertIncludes(mobileCompliancePages, 'mobile_compliance_page_save_rejected', 'Mobile compliance page save rejection code');
  assertIncludes(mobileCompliancePages, 'mobile_compliance_page_reset_rejected', 'Mobile compliance page reset rejection code');
  assertIncludes(mobileCompliancePages, 'readJsonResponseWithLimit<ComplianceMutationResponse>', 'Mobile compliance mutation response bounded parser');
  assertIncludes(mobileCompliancePages, 'readJsonResponseWithLimit<unknown>', 'Mobile compliance load response bounded parser');
  assertIncludes(mobileCompliancePages, 'MOBILE_COMPLIANCE_MUTATION_RESPONSE_JSON_MAX_BYTES', 'Mobile compliance mutation response byte cap');
  assertIncludes(mobileCompliancePages, 'MOBILE_COMPLIANCE_LOAD_RESPONSE_JSON_MAX_BYTES', 'Mobile compliance load response byte cap');
  assertIncludes(mobileCompliancePages, 'AUTH_BROWSER_REQUEST_POLICY', 'Mobile compliance shared authenticated browser request policy');
  assertOccurrenceAtLeast(mobileCompliancePages, "fetch('/api/compliance'", 2, 'Mobile compliance mutation calls');
  assertIncludes(mobileCompliancePages, 'api/compliance?storeId=${encodeURIComponent(', 'Mobile compliance load active-store scope');
  assertOccurrenceAtLeast(mobileCompliancePages, 'AUTH_BROWSER_REQUEST_POLICY', 4, 'Mobile compliance API calls share browser request policy');
  assertOccurrenceAtLeast(mobileCompliancePages, '...AUTH_BROWSER_REQUEST_POLICY', 2, 'Mobile compliance mutations spread shared browser request policy');
  assertIncludes(mobileCompliancePages, 'mobile_compliance_page_response_parse_failed', 'Mobile compliance mutation response parse diagnostics');
  assertIncludes(mobileCompliancePages, 'mobile_compliance_page_response_invalid', 'Mobile compliance mutation response invalid diagnostics');
  assertIncludes(mobileCompliancePages, 'mobile_compliance_page_save_response_invalid', 'Mobile compliance save invalid response code');
  assertIncludes(mobileCompliancePages, 'mobile_compliance_page_reset_response_invalid', 'Mobile compliance reset invalid response code');
  assertIncludes(mobileCompliancePages, 'isSuccessfulComplianceMutationResponse', 'Mobile compliance shaped mutation acknowledgement guard');
  assertIncludes(mobileCompliancePages, "value.type === type", 'Mobile compliance mutation acknowledgement must match compliance page type');
  assertIncludes(mobileCompliancePages, "value.action === getExpectedComplianceApiMutationAction(action)", 'Mobile compliance mutation acknowledgement must match API action');
  assertIncludes(mobileCompliancePages, 'hasExpectedAction', 'Mobile compliance invalid mutation acknowledgement diagnostics include action match');
  assertIncludes(mobileCompliancePages, 'hasExpectedType', 'Mobile compliance invalid mutation acknowledgement diagnostics include type match');
  assertIncludes(mobileCompliancePages, 'normalizeOwnerComplianceLoadResponse(data, scope)', 'Mobile compliance exact tenant/store response admission');
  assertIncludes(mobileCompliancePages, 'compliancePagesRequests.get(scope.key) === request', 'Mobile compliance exact in-flight request ownership');
  assertIncludes(mobileCompliancePages, 'compliancePagesRequests.get(scope.key) !== request', 'Mobile compliance stale same-scope response rejection');
  assertIncludes(mobileCompliancePages, 'currentScopeKeyRef.current !== scope.key', 'Mobile compliance stale tenant mutation settlement guard');
  assertIncludes(mobileCompliancePages, "getBoundedBusinessSettingsStringContext('pageUrl', pageUrl)", 'Mobile compliance bounded page URL context');
  assertIncludes(mobileCompliancePages, "openIsolatedBrowserUrl(pageUrl)", 'Mobile compliance safe page open');
  assertNotIncludes(mobileCompliancePages, 'if (!response.ok) return null;', 'Mobile compliance silent load rejection');
  assertNotIncludes(mobileCompliancePages, "fetch('/api/compliance', {\n        cache: 'no-store'", 'Mobile compliance inline load request policy');
  assertNotIncludes(mobileCompliancePages, "fetch('/api/compliance', {\n                cache: 'no-store'", 'Mobile compliance inline mutation request policy');
  assertNotIncludes(mobileCompliancePages, 'if (!result?.success)', 'Mobile compliance must not accept generic mutation success');
  assertNotIncludes(mobileCompliancePages, 'response.json().catch(() => null)', 'Mobile compliance mutation responses must not silently swallow parse failures');
  assertOccurrenceAtLeast(complianceRoute, 'action,\n            storeId: sId,\n            success: true,\n            tenantId: tId,\n            type,', 2, 'Compliance route mutation acknowledgements must include action/type and authenticated scope.');
  assertNotIncludes(mobileCompliancePages, 'const data = await response.json()', 'Mobile compliance must not use direct unbounded response parsing');
  assertNotIncludes(mobileCompliancePages, 'data?.error ||', 'Mobile compliance raw API response text');
  assertNotIncludes(mobileCompliancePages, 'error?.message', 'Mobile compliance raw exception text');
  assertNotIncludes(mobileCompliancePages, "window.open(pageUrl, '_blank')", 'Mobile compliance unsafe page open');
  assertNotIncludes(timeSlotPresets, 'console.error(', 'Time slot presets direct error logging');
  assertNotIncludes(timeSlotPresets, 'console.warn(', 'Time slot presets direct warn logging');
  assertNotIncludes(timeSlotPresets, 'console.log(', 'Time slot presets direct log logging');
  assertNotIncludes(timeSlotPresets, 'console.debug(', 'Time slot presets direct debug logging');
  assertNotIncludes(mobileTimeSlots, '} catch {', 'Mobile time-slot silent catch');
  assertNotIncludes(posSyncTab, '// Silent failure', 'Desktop POS Sync silent delivery-history catch');
  assertNotIncludes(posSyncTab, '.catch(() => undefined)', 'Desktop POS Sync silent async catch');
  assertNotIncludes(posSyncTab, 'const data = await res.json()', 'Desktop POS Sync test direct JSON parsing');
  assertNotIncludes(posSyncTab, 'if (data?.success)', 'Desktop POS Sync test must not use loose success acknowledgement');
  assertNotIncludes(posSyncTab, 'navigator.clipboard.writeText(webhookSecret);\n        message.success', 'Desktop POS Sync unguarded secret copy');
  assertNotIncludes(posSyncTab, 'navigator.clipboard.writeText(buildTechnicalSummary())', 'Desktop POS Sync unguarded technical summary copy');
  assertNotIncludes(posSyncTab, "} catch {\n            message.error('Failed to prepare instructions');", 'Desktop POS Sync instructions silent catch');
  assertNotIncludes(diagnostics, 'console.error(', 'Business settings diagnostics direct error logging');
  assertNotIncludes(diagnostics, 'console.warn(', 'Business settings diagnostics direct warn logging');
  assertNotIncludes(diagnostics, 'console.log(', 'Business settings diagnostics direct log logging');
  assertNotIncludes(diagnostics, 'console.debug(', 'Business settings diagnostics direct debug logging');
  assertNotIncludes(tempStatusCard, 'err.message ||', 'Temporary status raw exception text');
  assertNotIncludes(tempStatusCard, 'data.error ||', 'Temporary status raw API response text');
}

function verifyTodayCampaignDiagnosticsAreBounded() {
  const todayScreen = read('src/components/templates/main-app/today/index.tsx');
  const campaignActions = read('src/components/templates/main-app/today/hooks/useCampaignActions.ts');
  const campaignsDal = read('src/database/campaigns/index.ts');
  const campaignActionStateSource = read('src/lib/campaigns/campaignActionState.ts');
  const {
    buildCampaignCompletionState,
    buildCampaignSkipState,
  } = require(path.join(ROOT, 'src/lib/campaigns/campaignActionState.ts'));
  const actionExecutor = read('src/lib/campaigns/todayActionExecutor.ts');
  const executionSurfaces = read('src/lib/campaigns/executionSurfaces.ts');
  const diagnostics = read('src/lib/campaigns/campaignDiagnostics.ts');
  const mobileHoursScreen = read('src/components/mobile/screens/MobileHoursScreen.tsx');
  const weeklyGrowthPack = read('src/lib/today/weeklyGrowthPack.ts');
  const desktopWeeklyGrowthPack = read('src/components/templates/main-app/today/components/WeeklyGrowthPack/index.tsx');
  const mobileWeeklyGrowthPack = read('src/components/mobile/components/TodayWeeklyGrowthPackCard.tsx');

  assertIncludes(diagnostics, 'secureError', 'Today campaign diagnostics secure logging');
  assertIncludes(diagnostics, 'getBoundedCampaignStringContext', 'Today campaign diagnostics bounded string context');
  assertIncludes(diagnostics, 'logCampaignFailure', 'Today campaign diagnostics normalized failure logger');
  assertIncludes(diagnostics, 'sourceErrorName: getCampaignErrorName(error)', 'Today campaign diagnostics source error name');
  assertIncludes(diagnostics, 'sourceErrorCode: getCampaignErrorCode(error)', 'Today campaign diagnostics source error code');
  assertIncludes(diagnostics, 'sourceStatusCode: getCampaignErrorStatus(error)', 'Today campaign diagnostics source error status');
  assertIncludes(campaignActions, 'today_campaign_complete_failed', 'Today campaign complete diagnostics');
  assertIncludes(campaignActions, 'today_campaign_skip_failed', 'Today campaign skip diagnostics');
  assertIncludes(campaignActions, 'assertCampaignCompleteSucceeded(result, {', 'Desktop Today campaign completion must require a shaped acknowledgement.');
  assertIncludes(campaignActions, 'assertCampaignSkipSucceeded(result, {', 'Desktop Today campaign skip must require a shaped acknowledgement.');
  assertIncludes(mobileHoursScreen, 'assertCampaignCompleteSucceeded(result, {', 'Mobile Today campaign completion must require a shaped acknowledgement.');
  assertIncludes(mobileHoursScreen, 'assertCampaignSkipSucceeded(result, {', 'Mobile Today campaign skip must require a shaped acknowledgement.');
  assertIncludes(campaignsDal, 'export type CampaignCompleteResult', 'Campaign DAL must expose a shaped completion result.');
  assertIncludes(campaignsDal, 'export type CampaignSkipResult', 'Campaign DAL must expose a shaped skip result.');
  assertIncludes(campaignsDal, 'isCampaignTodayState,', 'Campaign DAL must import the shared Today summary shape guard.');
  assertIncludes(campaignsDal, 'export function assertCampaignCompleteSucceeded', 'Campaign DAL must expose completion acknowledgement assertion.');
  assertIncludes(campaignsDal, 'export function assertCampaignSkipSucceeded', 'Campaign DAL must expose skip acknowledgement assertion.');
  assertIncludes(campaignsDal, "status: 'completed'", 'Campaign completion acknowledgement must include completed status.');
  assertIncludes(campaignsDal, 'data.exportEvent?.id === data.exportId', 'Campaign completion acknowledgement must tie export event to export id.');
  assertIncludes(campaignsDal, 'skipCount: nextSkipCount', 'Campaign skip acknowledgement must include the resulting skip count.');
  assertIncludes(campaignsDal, 'runTransaction(firebaseClient', 'Campaign complete/skip mutations must use Firestore transactions.');
  assertIncludes(campaignsDal, 'const exportId = `complete_${normalizedCampaignId}`;', 'Campaign completion must use the validated campaign id for its deterministic export id.');
  assertIncludes(campaignsDal, "campaign.status === 'completed'", 'Campaign completion must expose an idempotent completed-state branch.');
  assertIncludes(campaignsDal, "campaign.status === 'skipped' || campaign.status === 'suppressed'", 'Campaign skip must expose an idempotent resolved-state branch.');
  assertIncludes(campaignsDal, "throw new Error('campaign_action_identity_mismatch')", 'Campaign action must verify persisted identity against the active scope and request.');
  assertIncludes(campaignsDal, "throw new Error('campaign_action_surface_mismatch')", 'Campaign completion must verify the requested surface against persisted campaign truth.');
  assertIncludes(campaignsDal, 'transaction.set(exportRef, exportEvent);', 'Campaign completion export must be in the same transaction.');
  assertIncludes(campaignsDal, 'suppressedUntil: shouldSuppress', 'Campaign skip must explicitly update or clear suppression expiry.');
  assertIncludes(campaignsDal, ': deleteField(),', 'Campaign skip must delete stale suppression expiry when not suppressed.');
  assertIncludes(campaignActionStateSource, 'buildCampaignCompletionState', 'Campaign completion summary transition helper.');
  assertIncludes(campaignActionStateSource, 'buildCampaignSkipState', 'Campaign skip summary transition helper.');

  const campaignSummaryFixture = (campaignId) => ({
    campaignId,
    projectId: 'project-1',
    type: 'meal_push',
    kind: 'active',
    subject: {},
    intent: 'broadcast_attention',
    primarySurface: 'whatsapp_status',
    status: 'suggested',
    confidence: 0.8,
  });
  const fixtureSummary = {
    today: {
      date: '2026-07-10',
      primary: campaignSummaryFixture('campaign-a'),
      operational: [
        campaignSummaryFixture('campaign-b'),
        campaignSummaryFixture('campaign-a'),
      ],
      isEmpty: false,
    },
    stats: {
      totalCompleted: 2,
      totalSkipped: 3,
      typeSkipCounts: { meal_push: 1 },
    },
  };
  const completedState = buildCampaignCompletionState(fixtureSummary, '2026-07-10', 'campaign-a');
  assert(completedState.stats.totalCompleted === 3, 'Campaign completion transition must increment completion exactly once.');
  assert(completedState.stats.totalSkipped === 3, 'Campaign completion transition must preserve skip count.');
  assert(!completedState.today.primary, 'Campaign completion transition must remove matching primary campaign.');
  assert(completedState.today.operational.length === 1 && completedState.today.operational[0].campaignId === 'campaign-b', 'Campaign completion transition must remove all matching operational entries.');
  const skippedState = buildCampaignSkipState(fixtureSummary, '2026-07-10', 'campaign-a', 'meal_push');
  assert(skippedState.stats.totalCompleted === 2, 'Campaign skip transition must preserve completion count.');
  assert(skippedState.stats.totalSkipped === 4, 'Campaign skip transition must increment skip count exactly once.');
  assert(skippedState.stats.typeSkipCounts.meal_push === 2, 'Campaign skip transition must increment the matching type count exactly once.');
  assertIncludes(todayScreen, 'today_campaign_action_flow_failed', 'Today campaign action-flow diagnostics');
  assertIncludes(todayScreen, 'today_campaign_skip_flow_failed', 'Today campaign skip-flow diagnostics');
  assertIncludes(actionExecutor, 'today_campaign_project_link_build_failed', 'Today campaign project-link diagnostics');
  assertIncludes(actionExecutor, 'today_campaign_whatsapp_open_failed', 'Today WhatsApp open diagnostics');
  assertIncludes(actionExecutor, 'today_campaign_whatsapp_message_copy_failed', 'Today WhatsApp copy diagnostics');
  assertIncludes(actionExecutor, 'isAcknowledgedTodayDownloadSurfaceResult', 'Today download surface execution must require a shaped acknowledgement.');
  assertIncludes(actionExecutor, 'result.surface === expectedSurface', 'Today download surface acknowledgement must match the requested surface.');
  assertIncludes(actionExecutor, "result.method === 'download'", 'Today download surface acknowledgement must match the download method.');
  assertIncludes(actionExecutor, 'today_campaign_surface_acknowledgement_invalid', 'Today download surface invalid acknowledgement diagnostic.');
  assertIncludes(actionExecutor, 'copyCampaignTextToClipboard', 'Today WhatsApp copy shared campaign clipboard helper');
  assertIncludes(actionExecutor, "documentUnavailable: 'today_campaign_clipboard_document_unavailable'", 'Today WhatsApp copy fallback document guard');
  assertIncludes(actionExecutor, "fallbackFailed: 'today_campaign_textarea_copy_returned_false'", 'Today WhatsApp failed fallback copy rejection');
  assertIncludes(actionExecutor, '...getCampaignClipboardSupportContext()', 'Today WhatsApp copy support metadata');
  assertIncludes(actionExecutor, "throw new Error('Campaign action failed')", 'Today campaign surface failure uses fixed local text');
  assertNotIncludes(actionExecutor, 'if (!result.success)', 'Today campaign surface actions must not accept generic success without surface and method acknowledgement.');
  assertIncludes(actionExecutor, "openIsolatedBrowserUrl(shareUrl)", 'Today WhatsApp open safe flags');
  assertIncludes(actionExecutor, 'shareUrlLength: shareUrl.length', 'Today WhatsApp bounded share URL length');
  assertIncludes(executionSurfaces, 'campaign_whatsapp_status_share_failed', 'Campaign WhatsApp status diagnostics');
  assertIncludes(executionSurfaces, 'campaign_whatsapp_message_copy_failed', 'Campaign WhatsApp message diagnostics');
  assertIncludes(executionSurfaces, 'hasCampaignClipboardWrite', 'Campaign surface copy Clipboard API support helper');
  assertIncludes(executionSurfaces, 'hasCampaignCopyFallback', 'Campaign surface copy textarea fallback support helper');
  assertIncludes(executionSurfaces, 'hasClipboardWrite: hasCampaignClipboardWrite()', 'Campaign surface copy Clipboard API support metadata');
  assertIncludes(executionSurfaces, 'hasCopyFallback: hasCampaignCopyFallback()', 'Campaign surface copy textarea fallback support metadata');
  assertIncludes(executionSurfaces, "documentUnavailable: CAMPAIGN_SURFACE_CLIPBOARD_DOCUMENT_UNAVAILABLE", 'Campaign surface default document-unavailable code');
  assertIncludes(executionSurfaces, "fallbackFailed: CAMPAIGN_SURFACE_TEXTAREA_COPY_RETURNED_FALSE", 'Campaign surface default fallback-failed code');
  assertIncludes(executionSurfaces, 'await navigator.clipboard.writeText(text);', 'Campaign surface copy tries Clipboard API first');
  assertIncludes(executionSurfaces, 'Fall through to the acknowledged textarea fallback', 'Campaign surface copy falls through after rejected Clipboard API writes');
  assertIncludes(executionSurfaces, 'throw new Error(failureCodes.documentUnavailable)', 'Campaign surface copy fallback document guard');
  assertIncludes(executionSurfaces, "const copied = document.execCommand('copy');", 'Campaign surface copy fallback acknowledgement check');
  assertIncludes(executionSurfaces, 'throw new Error(failureCodes.fallbackFailed)', 'Campaign surface failed fallback copy rejection');
  assertIncludes(executionSurfaces, '...getCampaignClipboardSupportContext()', 'Campaign surface copy support metadata');
  assertIncludes(executionSurfaces, 'campaign_poster_download_failed', 'Campaign poster diagnostics');
  assertIncludes(executionSurfaces, 'campaign_qr_tent_download_failed', 'Campaign QR tent diagnostics');
  assertIncludes(executionSurfaces, 'campaign_digital_screen_download_failed', 'Campaign digital screen diagnostics');
  assertIncludes(executionSurfaces, 'CAMPAIGN_SURFACE_IMAGE_MAX_BYTES = 10 * 1024 * 1024', 'Campaign execution image blob size cap');
  assertIncludes(executionSurfaces, 'CAMPAIGN_SURFACE_IMAGE_MIME_TYPES', 'Campaign execution image MIME allowlist');
  assertIncludes(executionSurfaces, 'CAMPAIGN_SURFACE_STORAGE_HOSTS', 'Campaign execution image host allowlist');
  assertIncludes(executionSurfaces, 'resolveCampaignSurfaceImageUrl', 'Campaign execution image URL resolver');
  assertIncludes(executionSurfaces, 'fetchCampaignSurfaceImageBlob', 'Campaign execution image fetch helper');
  assertIncludes(executionSurfaces, 'const targetUrl = resolveCampaignSurfaceImageUrl(imageUrl);', 'Campaign execution image URL resolution before fetch');
  assertIncludes(executionSurfaces, "const response = await fetch(targetUrl, { redirect: 'manual' });", 'Campaign execution image normalized fetch target and manual redirect boundary');
  assertIncludes(executionSurfaces, 'if (!response.ok)', 'Campaign execution image response status check');
  assertIncludes(executionSurfaces, "response.headers.get('content-length')", 'Campaign execution image content-length check');
  assertIncludes(executionSurfaces, "response.headers.get('content-type')", 'Campaign execution image content-type check');
  assertIncludes(executionSurfaces, 'readResponseUint8ArrayWithLimit(response, CAMPAIGN_SURFACE_IMAGE_MAX_BYTES)', 'Campaign execution image streaming response cap');
  assertIncludes(executionSurfaces, 'blob.size > CAMPAIGN_SURFACE_IMAGE_MAX_BYTES', 'Campaign execution image blob size check');
  assertIncludes(executionSurfaces, 'CAMPAIGN_SURFACE_IMAGE_MIME_TYPES.has(blobMimeType)', 'Campaign execution image blob MIME check');
  assertIncludes(weeklyGrowthPack, 'TodayGrowthPackCopyFailureStage', 'Today weekly growth pack copy failure stage contract');
  assertIncludes(weeklyGrowthPack, 'hasTodayGrowthPackClipboardWrite', 'Today weekly growth pack Clipboard API support helper');
  assertIncludes(weeklyGrowthPack, 'hasTodayGrowthPackCopyFallback', 'Today weekly growth pack textarea fallback support helper');
  assertIncludes(weeklyGrowthPack, 'getTodayGrowthPackCopyLogContext', 'Today weekly growth pack bounded copy context helper');
  assertIncludes(weeklyGrowthPack, "getBoundedCampaignStringContext('assetCopy', asset.copy)", 'Today weekly growth pack bounded copy text context');
  assertIncludes(weeklyGrowthPack, 'hasClipboardWrite: hasTodayGrowthPackClipboardWrite()', 'Today weekly growth pack Clipboard API support metadata');
  assertIncludes(weeklyGrowthPack, 'hasCopyFallback: hasTodayGrowthPackCopyFallback()', 'Today weekly growth pack textarea fallback support metadata');
  assertIncludes(weeklyGrowthPack, 'if (!hasTodayGrowthPackCopyFallback())', 'Today weekly growth pack fallback availability guard');
  assertIncludes(weeklyGrowthPack, "new Error('today_growth_pack_textarea_copy_returned_false')", 'Today weekly growth pack fixed textarea failure error');
  assertIncludes(desktopWeeklyGrowthPack, 'today_weekly_growth_pack_copy_failed', 'Desktop Today weekly growth pack copy diagnostics');
  assertIncludes(desktopWeeklyGrowthPack, 'getTodayGrowthPackCopyLogContext(pack, asset, failureStage)', 'Desktop Today weekly growth pack bounded context');
  assertIncludes(mobileWeeklyGrowthPack, 'today_weekly_growth_pack_copy_failed', 'Mobile Today weekly growth pack copy diagnostics');
  assertIncludes(mobileWeeklyGrowthPack, 'getTodayGrowthPackCopyLogContext(pack, asset, failureStage)', 'Mobile Today weekly growth pack bounded context');

  [
    ['Today screen', todayScreen],
    ['Today campaign action hook', campaignActions],
    ['Today campaign DAL', campaignsDal],
    ['Today action executor', actionExecutor],
    ['Campaign execution surfaces', executionSurfaces],
    ['Campaign diagnostics helper', diagnostics],
    ['Mobile Today hours screen', mobileHoursScreen],
    ['Today weekly growth pack helper', weeklyGrowthPack],
    ['Desktop Today weekly growth pack', desktopWeeklyGrowthPack],
    ['Mobile Today weekly growth pack', mobileWeeklyGrowthPack],
  ].forEach(([label, content]) => {
    assertNotIncludes(content, 'console.error(', `${label} direct error logging`);
    assertNotIncludes(content, 'console.warn(', `${label} direct warn logging`);
    assertNotIncludes(content, 'console.log(', `${label} direct log logging`);
    assertNotIncludes(content, 'console.debug(', `${label} direct debug logging`);
  });

  assertNotIncludes(campaignActions, 'Failed to complete campaign:', 'Today campaign action hook raw complete diagnostic');
  assertNotIncludes(campaignActions, 'Failed to skip campaign:', 'Today campaign action hook raw skip diagnostic');
  assertNotIncludes(todayScreen, 'if (result?.today)', 'Desktop Today screen must not treat optional campaign Today state as success.');
  assertNotIncludes(mobileHoursScreen, 'if (result?.today)', 'Mobile Today screen must not treat optional campaign Today state as success.');
  assertNotIncludes(todayScreen, 'Failed to complete campaign:', 'Today screen raw complete diagnostic');
  assertNotIncludes(todayScreen, 'Failed to skip campaign:', 'Today screen raw skip diagnostic');
  assertNotIncludes(actionExecutor, '[TodayActionExecutor] Failed to build project link:', 'Today action executor raw project-link diagnostic');
  assertNotIncludes(actionExecutor, '[TodayActionExecutor] Failed to copy WhatsApp message:', 'Today action executor raw copy diagnostic');
  assertNotIncludes(actionExecutor, "window.open(shareUrl, '_blank')", 'Today action executor unsafe WhatsApp open');
  assertNotIncludes(actionExecutor, 'result.error ||', 'Today action executor raw surface failure text');
  assertNotIncludes(actionExecutor, 'navigator.clipboard.writeText', 'Today action executor direct Clipboard API write');
  assertNotIncludes(actionExecutor, "document.execCommand('copy');\n    document.body.removeChild(textArea);", 'Today action executor must not assume textarea copy success');
  assertNotIncludes(executionSurfaces, 'WhatsApp Status share failed:', 'Campaign execution raw WhatsApp status diagnostic');
  assertNotIncludes(executionSurfaces, 'Copy to clipboard failed:', 'Campaign execution raw clipboard diagnostic');
  assertNotIncludes(executionSurfaces, 'Poster download failed:', 'Campaign execution raw poster diagnostic');
  assertNotIncludes(executionSurfaces, 'QR tent download failed:', 'Campaign execution raw QR tent diagnostic');
  assertNotIncludes(executionSurfaces, 'Digital screen download failed:', 'Campaign execution raw digital-screen diagnostic');
  assertNotIncludes(executionSurfaces, 'fetch(imageUrl)', 'Campaign execution must not fetch raw image URLs directly');
  assertNotIncludes(executionSurfaces, 'const blob = await response.blob()', 'Campaign execution must not fully buffer image blobs before enforcing the response cap');
  assertNotIncludes(executionSurfaces, "await navigator.clipboard.writeText(text);\n    } else", 'Campaign execution surfaces must not stop at rejected Clipboard API writes');
  assertNotIncludes(executionSurfaces, "document.execCommand('copy');\n        document.body.removeChild(textArea);", 'Campaign execution surfaces must not assume textarea copy success');
  assertNotIncludes(weeklyGrowthPack, 'catch {', 'Today weekly growth pack helper silent catch');
}

function verifyPublicContactUsesBoundedServerRoute() {
  const route = read('src/app/api/public/contact/route.ts');
  const contactPage = read('src/components/website/contact/ContactPage.tsx');
  const contactResponseHelper = read('src/lib/publicContact/contactClientResponse.ts');
  const contactBoundary = read('src/lib/publicContact/contactBoundary.ts');
  const publicApiMiddleware = read('src/middleware/publicApi.ts');
  const rules = read('firestore.rules');
  const rateLimitConfigs = read('src/lib/rateLimit/configs.ts');
  const publicToolInputBoundary = read('src/lib/public-truth-tools/publicTruthToolInputLimits.ts');
  const publicToolContactPages = [
    'src/components/website/bookingInquiryReadinessCheck/BookingInquiryReadinessCheckPage.tsx',
    'src/components/website/businessFactsCopyPack/BusinessFactsCopyPackPage.tsx',
    'src/components/website/customerFaqReplyPack/CustomerFaqReplyPackPage.tsx',
    'src/components/website/customerLinkPreview/CustomerLinkPreviewPage.tsx',
    'src/components/website/customerQuestionCoverageCheck/CustomerQuestionCoverageCheckPage.tsx',
    'src/components/website/googleProfileBasicsChecklist/GoogleProfileBasicsChecklistPage.tsx',
    'src/components/website/hoursCheck/HoursCheckPage.tsx',
    'src/components/website/menuPdfCleanupCheck/MenuPdfCleanupCheckPage.tsx',
    'src/components/website/menuReadabilityCheck/MenuReadabilityCheckPage.tsx',
    'src/components/website/photoGapCheck/PhotoGapCheckPage.tsx',
    'src/components/website/priceAvailabilityGapCheck/PriceAvailabilityGapCheckPage.tsx',
    'src/components/website/publicTruthCheck/PublicTruthCheckPage.tsx',
    'src/components/website/qrLinkHealthCheck/QrLinkHealthCheckPage.tsx',
    'src/components/website/socialBioLinkCheck/SocialBioLinkCheckPage.tsx',
    'src/components/website/whatsappActionLinkCheck/WhatsAppActionLinkCheckPage.tsx',
    'src/components/website/whatsappReplyPack/WhatsAppReplyPackPage.tsx',
  ].map((relativePath) => [relativePath, read(relativePath)]);
  const publicToolReportBuilders = [
    'bookingInquiryReadinessReport.ts',
    'businessFactsCopyPackReport.ts',
    'customerFaqReplyPackReport.ts',
    'customerLinkPreviewReport.ts',
    'customerQuestionCoverageReport.ts',
    'googleProfileBasicsReport.ts',
    'hoursCheckReport.ts',
    'menuPdfCleanupReport.ts',
    'menuReadabilityReport.ts',
    'photoGapCheckReport.ts',
    'priceAvailabilityGapReport.ts',
    'publicTruthCheckReport.ts',
    'qrLinkHealthReport.ts',
    'socialBioLinkCheckReport.ts',
    'whatsappActionLinkReport.ts',
    'whatsappReplyPackReport.ts',
  ].map((fileName) => [fileName, read(`src/lib/public-truth-tools/${fileName}`)]);

  assertIncludes(route, 'readBoundedJsonBody(request, MENULIST_PUBLIC_CONTACT_MAX_BODY_BYTES', 'MenuList contact bounded body parsing');
  assertIncludes(route, "checkPublicRateLimit(request, 'MENULIST_CONTACT_FORM', {", 'MenuList contact public rate limit');
  assertIncludes(route, 'failClosed: true,', 'MenuList contact limiter outage fail-closed policy');
  assertIncludes(route, 'hashPublicRateLimitValue', 'MenuList contact centralized public IP hashing');
  assertIncludes(route, 'ipHash: hashPublicRateLimitValue(ip)', 'MenuList contact HMAC hashed stored IP context');
  assertIncludes(route, 'validateHoneypot(body.website || undefined)', 'MenuList contact honeypot');
  assertIncludes(route, 'verifyTurnstileToken(body.captchaToken, request)', 'MenuList contact Turnstile verification');
  assertIncludes(route, 'firestoreAdmin.collection(DB_COLLECTIONS.LANDING_PAGE_ENQUIRIES).add', 'MenuList contact Admin SDK write');
  assertIncludes(route, "source: 'menulist_public_contact'", 'MenuList contact source marker');
  assertIncludes(route, "status: 'accepted'", 'MenuList contact accepted acknowledgement marker');
  assertIncludes(route, "status: 'ignored'", 'MenuList contact honeypot acknowledgement marker');
  assertIncludes(route, 'helpTopic,', 'MenuList contact success acknowledgement includes help topic');
  assertIncludes(route, "logSecurityFailure('menulist_contact_submission_failed', error", 'MenuList contact normalized failure logging');
  assertIncludes(route, "getBoundedSecurityStringContext('sourcePath', body.sourcePath)", 'MenuList contact bounded source-path context');
  assertIncludes(route, "getBoundedSecurityStringContext('referrer', request.headers.get('referer'))", 'MenuList contact bounded referrer context');
  assertIncludes(route, 'normalizePublicContactSourcePath(body.sourcePath)', 'MenuList contact query-free source path');
  assertIncludes(route, "normalizePublicContactReferrer(request.headers.get('referer'))", 'MenuList contact query-free referrer');
  assertIncludes(route, 'preserveOptionalPublicContactCount(sourceContext?.primaryNumber)', 'MenuList contact zero-safe source count');
  assertIncludes(contactBoundary, 'return `${parsed.origin}${parsed.pathname}`', 'MenuList contact referrer query stripping');
  assertIncludes(contactBoundary, 'return value ?? null;', 'MenuList contact optional zero preservation');
  assertIncludes(publicApiMiddleware, 'const TURNSTILE_PROVIDER_TIMEOUT_MS = 8_000;', 'Public Turnstile timeout');
  assertIncludes(publicApiMiddleware, "redirect: 'manual'", 'Public Turnstile redirect boundary');
  assertIncludes(publicApiMiddleware, 'signal: controller.signal', 'Public Turnstile abort signal');
  assertIncludes(publicApiMiddleware, 'clearTimeout(timeout)', 'Public Turnstile timeout cleanup');
  assertNotIncludes(route, 'request.json()', 'MenuList contact route direct unbounded JSON parsing');
  assertNotIncludes(route, "createHash('sha256').update(ip", 'MenuList contact route local plain IP hashing');
  assertNotIncludes(route, "secureError('[MenuList Contact] Submission failed'", 'MenuList contact route direct secureError logging');
  assertNotIncludes(route, "new Error('menulist_contact_submission_failed')", 'MenuList contact route should use security diagnostics helper');
  assertNotIncludes(route, "errorName: error instanceof Error ? error.name : typeof error", 'MenuList contact route inline raw error context');
  assertNotIncludes(route, 'console.error', 'MenuList contact route direct console logging');
  assertNotIncludes(route, 'sourceContext?.primaryNumber || null', 'MenuList contact must not collapse zero to null');
  assertNotIncludes(route, "referrer: clean(request.headers.get('referer')", 'MenuList contact must not persist referrer query strings');

  assertIncludes(contactPage, "fetch('/api/public/contact'", 'MenuList contact page server submission path');
  assertIncludes(contactPage, "cache: 'no-store'", 'MenuList contact page disables browser cache for submissions');
  assertIncludes(contactPage, "credentials: 'same-origin'", 'MenuList contact page keeps submissions same-origin');
  assertIncludes(contactPage, "redirect: 'manual'", 'MenuList contact page does not follow redirected submission handoffs');
  assertIncludes(contactPage, 'TurnstileWidget', 'MenuList contact page Turnstile widget');
  assertIncludes(contactPage, "{...register('website')}", 'MenuList contact page honeypot field');
  assertIncludes(contactPage, "const submitFailedMessage = t('Contact.submitFailed')", 'MenuList contact page fixed localized failure copy');
  assertIncludes(contactPage, "const securityCheckMessage = t('Contact.securityCheckRequired')", 'MenuList contact page fixed localized captcha copy');
  assertIncludes(contactPage, 'readMenulistPublicContactResponseJson(', 'MenuList contact page shared bounded response parsing');
  assertIncludes(contactPage, 'isAcceptedMenulistPublicContactResponse(result, expectedHelpTopic)', 'MenuList contact page shaped accepted acknowledgement guard');
  assertIncludes(contactPage, 'logInvalidMenulistPublicContactResponse', 'MenuList contact page invalid acknowledgement diagnostic helper');
  assertIncludes(contactPage, 'website_contact_response_parse_failed', 'MenuList contact page response parse diagnostic');
  assertIncludes(contactPage, 'website_contact_response_invalid', 'MenuList contact page invalid response diagnostic');
  assertIncludes(contactPage, 'if (submissionInFlightRef.current) return;', 'MenuList contact page synchronous duplicate-submit refusal');
  assertIncludes(contactPage, 'submissionInFlightRef.current = true;', 'MenuList contact page claims the contact request before fetch');
  assertIncludes(contactPage, 'submissionInFlightRef.current = false;', 'MenuList contact page releases the contact request after settlement');
  assertIncludes(contactPage, "logRuntimeFailure('website_contact_submit_failed'", 'MenuList contact page contained network failure diagnostic');
  assertIncludes(contactPage, '.max(120)', 'MenuList contact page name bound matches the route');
  assertIncludes(contactPage, '.max(180)', 'MenuList contact page email bound matches the route');
  assertIncludes(contactPage, '.max(40)', 'MenuList contact page phone bound matches the route');
  assertIncludes(contactPage, '.max(2000)', 'MenuList contact page message bound matches the route');
  assertIncludes(contactPage, "{t('Contact.formAgree')}\n                      </label>\n                      <WebsiteLink", 'MenuList contact policy links stay outside the checkbox label activation boundary');
  assertIncludes(contactPage, 'href="/privacy-policy"\n                        target="_blank"\n                        rel="noopener noreferrer"', 'MenuList contact privacy link preserves unfinished form state');
  assertIncludes(contactPage, 'href="/terms-of-service"\n                        target="_blank"\n                        rel="noopener noreferrer"', 'MenuList contact terms link preserves unfinished form state');
  assertNotIncludes(contactPage, '!result?.accepted', 'MenuList contact page must not accept generic accepted flag.');
  assertNotIncludes(contactPage, 'response.json().catch(() => null)', 'MenuList contact page must not silently swallow response parse failures');
  assertNotIncludes(contactPage, "import('@/database/landingPage/enquiries')", 'MenuList contact page direct DAL import');
  assertNotIncludes(contactPage, 'addEnquiry(values)', 'MenuList contact page direct Firestore write');
  assertNotIncludes(contactPage, "throw new Error(result?.error", 'MenuList contact page must not throw raw API response text');
  assertNotIncludes(contactPage, 'e instanceof Error ? e.message', 'MenuList contact page must not show raw exception messages');
  assertNotIncludes(contactPage, 'console.error', 'MenuList contact page direct console logging');

  assertIncludes(publicToolInputBoundary, 'longText: 8_000', 'Public-tool long-text runtime cap');
  assertIncludes(publicToolInputBoundary, 'url: 2_048', 'Public-tool URL runtime cap');
  assertIncludes(publicToolInputBoundary, 'value.slice(0, maxLength)', 'Public-tool pre-normalization runtime bound');

  publicToolContactPages.forEach(([relativePath, source]) => {
    assertIncludes(source, 'const handoffSubmissionInFlightRef = useRef(false);', `${relativePath} synchronous submission lock`);
    assertIncludes(source, 'if (handoffSubmissionInFlightRef.current) return;', `${relativePath} duplicate submission refusal`);
    assertIncludes(source, 'handoffSubmissionInFlightRef.current = true;', `${relativePath} submission claim`);
    assertIncludes(source, 'handoffSubmissionInFlightRef.current = false;', `${relativePath} submission release`);
    assertIncludes(source, 'key={report.generatedAt} report={report}', `${relativePath} report-revision keyed handoff state`);
    assertIncludes(source, 'logRuntimeFailure(', `${relativePath} contained network failure diagnostic`);
    assertIncludes(source, 'responseLogContext', `${relativePath} bounded contact diagnostic context`);
    assertIncludes(source, "setHandoffStatus((current) => (current === 'submitted' ? 'idle' : current));", `${relativePath} edited handoff state clears prior success`);
    assertIncludes(source, 'maxLength={120}', `${relativePath} route-parity name bound`);
    assertIncludes(source, 'maxLength={180}', `${relativePath} route-parity email bound`);
    assertIncludes(source, 'maxLength={40}', `${relativePath} route-parity phone bound`);
    assertIncludes(source, 'maxLength={500}', `${relativePath} bounded honeypot input`);
    assertIncludes(source, 'PUBLIC_TRUTH_TOOL_INPUT_LIMITS', `${relativePath} shared primary-input bounds`);
    const unboundedTextControls = [...source.matchAll(/<(?:input|textarea)\b[\s\S]*?\/>/g)]
      .map((match) => match[0])
      .filter((tag) => !/type="(?:checkbox|radio)"/.test(tag))
      .filter((tag) => !/maxLength=/.test(tag));
    assert(
      unboundedTextControls.length === 0,
      `${relativePath} text controls must declare a maxLength; found ${unboundedTextControls.length}`,
    );
    assertNotIncludes(source, "} catch {\n      setHandoffStatus('error');", `${relativePath} silent handoff failure`);
  });

  const customerFaqReplyPackPage = publicToolContactPages.find(([relativePath]) => (
    relativePath.endsWith('/customerFaqReplyPack/CustomerFaqReplyPackPage.tsx')
  ))?.[1] || '';
  assertIncludes(customerFaqReplyPackPage, "throw new Error('customer_faq_reply_pack_download_unavailable')", 'Customer FAQ download runtime guard');
  assertIncludes(customerFaqReplyPackPage, 'window.URL.revokeObjectURL(url);', 'Customer FAQ download object URL cleanup');
  assertOrder(customerFaqReplyPackPage, 'try {', 'window.URL.revokeObjectURL(url);', 'Customer FAQ download cleanup ownership');

  publicToolReportBuilders.forEach(([fileName, source]) => {
    assertIncludes(source, 'boundPublicTruthToolInput', `${fileName} runtime input bound`);
    assertIncludes(source, 'PUBLIC_TRUTH_TOOL_INPUT_LIMITS', `${fileName} shared runtime input limits`);
  });

  assertIncludes(rateLimitConfigs, 'MENULIST_CONTACT_FORM', 'MenuList contact rate-limit config');
  assertIncludes(contactResponseHelper, 'MENULIST_PUBLIC_CONTACT_RESPONSE_JSON_MAX_BYTES = 8 * 1024', 'MenuList public contact helper response byte cap');
  assertIncludes(contactResponseHelper, 'readJsonResponseWithLimit<unknown>', 'MenuList public contact helper bounded response parsing');
  assertIncludes(contactResponseHelper, 'MENULIST_PUBLIC_CONTACT_RESPONSE_SOURCE', 'MenuList public contact helper source marker constant');
  assertIncludes(contactResponseHelper, "value.status === 'accepted'", 'MenuList public contact helper accepted status guard');
  assertIncludes(contactResponseHelper, 'value.helpTopic === expectedHelpTopic', 'MenuList public contact helper help-topic acknowledgement guard');
  assertIncludes(rules, 'allow create: if isAuthenticated() && isPlatformAdmin();', 'Landing page enquiries direct browser create rule');
  assertNotIncludes(rules, 'allow create: if true;', 'Landing page enquiries public Firestore create rule');
}

function verifyResellerDashboardResponseDiagnosticsAreBounded() {
  const hook = read('src/hooks/useResellerDashboard.ts');
  const diagnostics = read('src/components/templates/main-app/reseller/resellerDiagnostics.ts');
  const desktopDashboard = read('src/components/templates/main-app/reseller/ResellerDashboard.tsx');
  const desktopManagement = read('src/components/templates/main-app/reseller/ResellerManagement.tsx');
  const desktopOnboarding = read('src/components/templates/main-app/reseller/OnboardingWizard.tsx');
  const mobileDashboard = read('src/components/mobile/screens/MobileResellerDashboardScreen.tsx');
  const mobileManagement = read('src/components/mobile/screens/MobileResellerManagementScreen.tsx');
  const mobileOnboarding = read('src/components/mobile/screens/MobileResellerOnboardingScreen.tsx');
  const addLocationRoute = read('src/app/api/reseller/add-location-capacity/route.ts');

  assertIncludes(diagnostics, 'RESELLER_REQUEST_POLICY', 'Reseller diagnostics must expose the shared request policy');
  assertIncludes(diagnostics, "cache: 'no-store'", 'Reseller request policy must bypass browser cache');
  assertIncludes(diagnostics, "credentials: 'same-origin'", 'Reseller request policy must keep credentials same-origin');
  assertIncludes(diagnostics, "redirect: 'manual'", 'Reseller request policy must not follow redirects');

  assertIncludes(hook, 'readJsonResponseWithLimit', 'Reseller dashboard hook bounded response parser');
  assertIncludes(hook, 'RESELLER_DASHBOARD_RESPONSE_JSON_MAX_BYTES = 64 * 1024', 'Reseller dashboard response byte cap');
  assertIncludes(hook, 'reseller_dashboard_response_parse_failed', 'Reseller dashboard response parse diagnostics');
  assertIncludes(hook, 'reseller_dashboard_response_invalid', 'Reseller dashboard invalid response diagnostics');
  assertIncludes(hook, 'reseller_dashboard_monthly_summary_response_invalid', 'Reseller dashboard monthly summary invalid response code');
  assertIncludes(hook, 'reseller_dashboard_profile_response_invalid', 'Reseller dashboard profile invalid response code');
  assertIncludes(hook, 'reseller_dashboard_clients_response_invalid', 'Reseller dashboard clients invalid response code');
  assertIncludes(hook, 'responseStatus: response.status', 'Reseller dashboard bounded response status context');
  assertIncludes(hook, 'responseOk: response.ok', 'Reseller dashboard bounded response ok context');
  assertIncludes(hook, 'isResellerMonthlySummary(data)', 'Reseller dashboard exact monthly summary shape guard');
  assertIncludes(hook, 'isResellerSelfProfile(data?.profile)', 'Reseller dashboard exact self-profile shape guard');
  assertIncludes(hook, 'isResellerClientsResponse(data)', 'Reseller dashboard exact clients shape guard');
  assertNotIncludes(hook, 'response.json().catch(() => ({}))', 'Reseller dashboard silent JSON fallback');
  assertNotIncludes(hook, 'return Array.isArray(data.transactions) ? data.transactions : []', 'Reseller dashboard silent clients fallback');
  assertNotIncludes(hook, 'throw new Error(data', 'Reseller dashboard raw API response error text');
  assertNotIncludes(hook, 'error?.message', 'Reseller dashboard raw exception message');

  assertIncludes(desktopDashboard, 'readJsonResponseWithLimit<ResellerAddLocationCapacityResponse>', 'Desktop reseller add-location bounded response parser');
  assertIncludes(desktopDashboard, 'RESELLER_REQUEST_POLICY', 'Desktop reseller add-location must use the shared request policy');
  assertIncludes(desktopDashboard, 'RESELLER_ADD_LOCATION_RESPONSE_JSON_MAX_BYTES = 8 * 1024', 'Desktop reseller add-location response byte cap');
  assertIncludes(desktopDashboard, 'desktop_reseller_dashboard_add_location_response_parse_failed', 'Desktop reseller add-location response parse diagnostics');
  assertIncludes(desktopDashboard, 'desktop_reseller_dashboard_add_location_response_invalid', 'Desktop reseller add-location invalid response diagnostics');
  assertIncludes(desktopDashboard, 'isValidAddLocationCapacityResponse(data, expectedAddLocationResponse)', 'Desktop reseller add-location shape guard');
  assertIncludes(desktopDashboard, 'data?.success === true', 'Desktop reseller add-location success acknowledgement guard');
  assertIncludes(desktopDashboard, "typeof data.amountExpected === 'number'", 'Desktop reseller add-location amount guard');
  assertIncludes(desktopDashboard, 'data.locationCount === expected.locationCount', 'Desktop reseller add-location location-count acknowledgement guard');
  assertIncludes(desktopDashboard, 'isMatchingResellerEntityId(data.storeId, expected.storeId)', 'Desktop reseller add-location store acknowledgement guard');
  assertIncludes(desktopDashboard, 'isMatchingResellerEntityId(data.tenantId, expected.tenantId)', 'Desktop reseller add-location tenant acknowledgement guard');
  assertIncludes(desktopDashboard, 'hasExpectedLocationCount', 'Desktop reseller add-location invalid diagnostics include location-count match');
  assertIncludes(desktopDashboard, 'hasExpectedStoreId', 'Desktop reseller add-location invalid diagnostics include store match');
  assertIncludes(desktopDashboard, 'hasExpectedTenantId', 'Desktop reseller add-location invalid diagnostics include tenant match');
  assertNotIncludes(desktopDashboard, 'response.json().catch(() => ({}))', 'Desktop reseller add-location silent JSON fallback');

  assertIncludes(mobileDashboard, 'readJsonResponseWithLimit<MobileResellerAddLocationCapacityResponse>', 'Mobile reseller add-location bounded response parser');
  assertIncludes(mobileDashboard, 'RESELLER_REQUEST_POLICY', 'Mobile reseller add-location must use the shared request policy');
  assertIncludes(mobileDashboard, 'MOBILE_RESELLER_ADD_LOCATION_RESPONSE_JSON_MAX_BYTES = 8 * 1024', 'Mobile reseller add-location response byte cap');
  assertIncludes(mobileDashboard, 'mobile_reseller_dashboard_add_location_response_parse_failed', 'Mobile reseller add-location response parse diagnostics');
  assertIncludes(mobileDashboard, 'mobile_reseller_dashboard_add_location_response_invalid', 'Mobile reseller add-location invalid response diagnostics');
  assertIncludes(mobileDashboard, 'isValidMobileAddLocationCapacityResponse(data, expectedAddLocationResponse)', 'Mobile reseller add-location shape guard');
  assertIncludes(mobileDashboard, 'data?.success === true', 'Mobile reseller add-location success acknowledgement guard');
  assertIncludes(mobileDashboard, "typeof data.amountExpected === 'number'", 'Mobile reseller add-location amount guard');
  assertIncludes(mobileDashboard, 'data.locationCount === expected.locationCount', 'Mobile reseller add-location location-count acknowledgement guard');
  assertIncludes(mobileDashboard, 'isMatchingMobileResellerEntityId(data.storeId, expected.storeId)', 'Mobile reseller add-location store acknowledgement guard');
  assertIncludes(mobileDashboard, 'isMatchingMobileResellerEntityId(data.tenantId, expected.tenantId)', 'Mobile reseller add-location tenant acknowledgement guard');
  assertIncludes(mobileDashboard, 'hasExpectedLocationCount', 'Mobile reseller add-location invalid diagnostics include location-count match');
  assertIncludes(mobileDashboard, 'hasExpectedStoreId', 'Mobile reseller add-location invalid diagnostics include store match');
  assertIncludes(mobileDashboard, 'hasExpectedTenantId', 'Mobile reseller add-location invalid diagnostics include tenant match');
  assertNotIncludes(mobileDashboard, 'response.json().catch(() => ({}))', 'Mobile reseller add-location silent JSON fallback');
  assertIncludes(addLocationRoute, 'storeId,', 'Reseller add-location acknowledgement must return storeId');
  assertIncludes(addLocationRoute, 'tenantId,', 'Reseller add-location acknowledgement must return tenantId');

  assertIncludes(desktopOnboarding, 'readJsonResponseWithLimit<unknown>', 'Desktop reseller onboarding bounded response parser');
  assertIncludes(desktopOnboarding, 'RESELLER_REQUEST_POLICY', 'Desktop reseller onboarding must use the shared request policy');
  assertIncludes(desktopOnboarding, 'RESELLER_ONBOARD_RESPONSE_JSON_MAX_BYTES = 16 * 1024', 'Desktop reseller onboarding response byte cap');
  assertIncludes(desktopOnboarding, 'desktop_reseller_onboard_response_parse_failed', 'Desktop reseller onboarding response parse diagnostics');
  assertIncludes(desktopOnboarding, 'desktop_reseller_onboard_response_invalid', 'Desktop reseller onboarding invalid response diagnostics');
  assertIncludes(desktopOnboarding, 'isResellerOnboardingResponse(data, operationId)', 'Desktop reseller onboarding exact shared shape guard');
  assertNotIncludes(desktopOnboarding, 'response.json().catch(() => ({}))', 'Desktop reseller onboarding silent JSON fallback');
  assertNotIncludes(desktopOnboarding, 'const data = await response.json()', 'Desktop reseller onboarding unbounded success JSON parsing');

  assertIncludes(mobileOnboarding, 'readJsonResponseWithLimit<unknown>', 'Mobile reseller onboarding bounded response parser');
  assertIncludes(mobileOnboarding, 'RESELLER_REQUEST_POLICY', 'Mobile reseller onboarding must use the shared request policy');
  assertIncludes(mobileOnboarding, 'MOBILE_RESELLER_ONBOARD_RESPONSE_JSON_MAX_BYTES = 16 * 1024', 'Mobile reseller onboarding response byte cap');
  assertIncludes(mobileOnboarding, 'mobile_reseller_onboard_response_parse_failed', 'Mobile reseller onboarding response parse diagnostics');
  assertIncludes(mobileOnboarding, 'mobile_reseller_onboard_response_invalid', 'Mobile reseller onboarding invalid response diagnostics');
  assertIncludes(mobileOnboarding, 'isResellerOnboardingResponse(data, operationId)', 'Mobile reseller onboarding exact shared shape guard');
  assertNotIncludes(mobileOnboarding, 'response.json().catch(() => ({}))', 'Mobile reseller onboarding silent JSON fallback');
  assertNotIncludes(mobileOnboarding, 'const data = await response.json()', 'Mobile reseller onboarding unbounded success JSON parsing');

  assertIncludes(desktopManagement, 'readJsonResponseWithLimit<unknown>', 'Desktop reseller management bounded response parser');
  assertIncludes(desktopManagement, 'RESELLER_REQUEST_POLICY', 'Desktop reseller management must use the shared request policy');
  assertIncludes(desktopManagement, "fetch('/api/reseller/manage', RESELLER_REQUEST_POLICY)", 'Desktop reseller profile reads must use the shared request policy');
  assertIncludes(desktopManagement, "fetch('/api/reseller/monthly-summary', RESELLER_REQUEST_POLICY)", 'Desktop reseller monthly summary reads must use the shared request policy');
  assertIncludes(desktopManagement, 'RESELLER_MANAGEMENT_RESPONSE_JSON_MAX_BYTES = 64 * 1024', 'Desktop reseller management response byte cap');
  assertIncludes(desktopManagement, 'desktop_reseller_management_response_parse_failed', 'Desktop reseller management response parse diagnostics');
  assertIncludes(desktopManagement, 'desktop_reseller_management_profiles_response_invalid', 'Desktop reseller management profile-list invalid response diagnostics');
  assertIncludes(desktopManagement, 'desktop_reseller_management_monthly_summary_response_invalid', 'Desktop reseller management monthly-summary invalid response diagnostics');
  assertIncludes(desktopManagement, 'desktop_reseller_management_save_response_invalid', 'Desktop reseller management save invalid response diagnostics');
  assertIncludes(desktopManagement, 'isResellerManagementProfilesResponse(data)', 'Desktop reseller management exact shared profiles shape guard');
  assertIncludes(desktopManagement, 'isResellerMonthlySummary(data)', 'Desktop reseller management exact shared monthly-summary shape guard');
  assertIncludes(desktopManagement, 'isExpectedResellerManagementSaveResponse(result, editingProfile?.id)', 'Desktop reseller management save acknowledgement shape guard');
  assertIncludes(desktopManagement, 'data.profileId === expectedProfileId', 'Desktop reseller management update acknowledgement must match edited profile id');
  assertIncludes(desktopManagement, 'hasExpectedProfileId', 'Desktop reseller management invalid save diagnostics include profile id match');
  assertIncludes(desktopManagement, 'profileEvidence?.isPartial', 'Desktop reseller management partial profile evidence');
  assertIncludes(desktopManagement, "(data.action === 'created' || data.action === 'updated')", 'Desktop reseller management save action guard');
  assertNotIncludes(desktopManagement, 'response.json().catch(() => ({}))', 'Desktop reseller management silent JSON fallback');
  assertNotIncludes(desktopManagement, 'res.json().catch(() => ({}))', 'Desktop reseller management silent res JSON fallback');
  assertNotIncludes(desktopManagement, 'const data = await res.json()', 'Desktop reseller management unbounded load JSON parsing');
  assertNotIncludes(desktopManagement, 'const result = await res.json()', 'Desktop reseller management unbounded save JSON parsing');

  assertIncludes(mobileManagement, 'readJsonResponseWithLimit<unknown>', 'Mobile reseller management bounded response parser');
  assertIncludes(mobileManagement, 'RESELLER_REQUEST_POLICY', 'Mobile reseller management must use the shared request policy');
  assertIncludes(mobileManagement, "fetch('/api/reseller/manage', RESELLER_REQUEST_POLICY)", 'Mobile reseller profile reads must use the shared request policy');
  assertIncludes(mobileManagement, "fetch('/api/reseller/monthly-summary', RESELLER_REQUEST_POLICY)", 'Mobile reseller monthly summary reads must use the shared request policy');
  assertIncludes(mobileManagement, 'MOBILE_RESELLER_MANAGEMENT_RESPONSE_JSON_MAX_BYTES = 64 * 1024', 'Mobile reseller management response byte cap');
  assertIncludes(mobileManagement, 'mobile_reseller_management_response_parse_failed', 'Mobile reseller management response parse diagnostics');
  assertIncludes(mobileManagement, 'mobile_reseller_management_profiles_response_invalid', 'Mobile reseller management profile-list invalid response diagnostics');
  assertIncludes(mobileManagement, 'mobile_reseller_management_monthly_summary_response_invalid', 'Mobile reseller management monthly-summary invalid response diagnostics');
  assertIncludes(mobileManagement, 'mobile_reseller_management_save_response_invalid', 'Mobile reseller management save invalid response diagnostics');
  assertIncludes(mobileManagement, 'isResellerManagementProfilesResponse(data)', 'Mobile reseller management exact shared profiles shape guard');
  assertIncludes(mobileManagement, 'isResellerMonthlySummary(data)', 'Mobile reseller management exact shared monthly-summary shape guard');
  assertIncludes(mobileManagement, 'isExpectedMobileResellerManagementSaveResponse(data, editingProfile?.id)', 'Mobile reseller management save acknowledgement shape guard');
  assertIncludes(mobileManagement, 'data.profileId === expectedProfileId', 'Mobile reseller management update acknowledgement must match edited profile id');
  assertIncludes(mobileManagement, 'hasExpectedProfileId', 'Mobile reseller management invalid save diagnostics include profile id match');
  assertIncludes(mobileManagement, 'profileEvidence?.isPartial', 'Mobile reseller management partial profile evidence');
  assertIncludes(mobileManagement, "(data.action === 'created' || data.action === 'updated')", 'Mobile reseller management save action guard');
  assertNotIncludes(mobileManagement, 'response.json().catch(() => ({}))', 'Mobile reseller management silent JSON fallback');
  assertNotIncludes(mobileManagement, 'const data = await response.json()', 'Mobile reseller management unbounded JSON parsing');
}

verifyPublicMenuApiSourceOfTruth();
verifyMenuListBrowserSurfacesDoNotWriteFirestoreDirectly();
verifyMenuListBrowserSurfacesUseAllowedFirestoreReadsOnly();
verifyStoreUpdatesRequireAcknowledgement();
verifyTenantWritesRequireAcknowledgement();
verifyPlatformUserWritesRequireAcknowledgement();
verifyProjectWritesRequireAcknowledgement();
verifyProjectLifecycleMutationsRequireAcknowledgement();
verifyPublicCreateMenuRoutePrivacy();
verifyHoursDoNotInventOpenState();
verifyTimedCategoriesUseStoreTruth();
verifyPublicMenuPublicationIndicatorUsesPublishedTruth();
verifyDomainOwnershipComparisonIsTypeSafe();
verifyVercelDomainPathSegmentsAreEncoded();
verifyCustomDomainDocsMatchVerificationBoundary();
verifyClaimAccountStoreEmailInvalidatesPublicCache();
verifyTenantHeaderLoggingIsBounded();
verifyTenantDomainLookupLoggingIsBounded();
verifyPublicClientCacheLoggingIsBounded();
verifyPublicStoreLookupUsesCurrentTenantLifecycleState();
verifyFunctionsPublicCacheRevalidationLoggingIsBounded();
verifyMenuRevalidationRouteLoggingIsBounded();
verifyPublicTruthWritesInvalidateScreenData();
verifyPublicMenuResolutionLoggingIsBounded();
verifyOBPAnalyticsLoggingIsBounded();
verifyOBPThemeStorageLoggingIsBounded();
verifyOBPServerFallbackLoggingIsBounded();
verifyOBPResolvedSurfaceFallbackLoggingIsBounded();
verifyOBPUpdateTimestampDoesNotClaimVerification();
verifyMapsPlaceConfirmationStaysFlagGated();
verifyPublicMenuSearchFocusLoggingIsBounded();
verifyPublicMenuGradientParserLoggingIsBounded();
verifyPublicMenuBreadcrumbLanguageLoggingIsBounded();
verifyPublicMenuLanguageStorageLoggingIsBounded();
verifyPublicMenuFeedbackNudgeStorageLoggingIsBounded();
verifyPublicMenuExternalLinksAreNormalized();
verifyPublicMenuFooterFreshnessLoggingIsBounded();
verifyOBPCustomerQuickAnswersAreVisibleAndBounded();
verifyOwnerPreviewProjectMetadataContractIsTyped();
verifyPublicFaqSchemaFreshnessCopyIsBounded();
verifyPublicMenuAnalyticsLoggingIsBounded();
verifyClientMenuErrorBoundaryLoggingIsBounded();
verifyMenuHealthPublishLoggingIsBounded();
verifyPublicMenuGoLiveCopyMatchesPublishBoundary();
verifyPresenceDominanceDocsUsePublicSourceBoundaries();
verifyDigitalScreenReloadDiagnosticsAreBounded();
verifyMenuEditorDiagnosticsAreBounded();
verifyMenuCorrectnessEngineDocsMatchRuntime();
verifySilentCorrectionDocsUseSupportedSurfaceBoundaries();
verifyTruthAccuracyDominanceDocsMatchRuntime();
verifyDiscoveryInfrastructureDocsMatchRuntime();
verifyGbpSyncDocsMatchDisabledRuntime();
verifyProjectPersistenceDiagnosticsAreBounded();
verifyProjectDefaultHandoffIsAtomic();
verifyMenuChangeLogDiagnosticsAreBounded();
verifyProjectsPageDiagnosticsAreBounded();
verifyProjectViewDiagnosticsAreBounded();
verifyMultiOutletDiagnosticsAreBounded();
verifyStoreAndUserDalDiagnosticsAreBounded();
verifyMobileMenuDiagnosticsAreBounded();
verifyMobileProjectDiagnosticsAreBounded();
verifyOfficialBusinessPageOwnerDiagnosticsAreBounded();
verifyUseMenuListOutputDiagnosticsAreBounded();
verifyProjectShareModalDiagnosticsAreBounded();
verifyMobileOwnerDiagnosticsAreBounded();
verifyMobileTodayDiagnosticsAreBounded();
verifyFeedbackInboxDiagnosticsAreBounded();
verifyPublicFeedbackPageDiagnosticsAreBounded();
verifyGuestFeedbackMolDiagnosticsAreBounded();
verifyHelpChatDiagnosticsAreBounded();
verifyBusinessSettingsDiagnosticsAreBounded();
verifyTodayCampaignDiagnosticsAreBounded();
verifyPublicContactUsesBoundedServerRoute();
verifyResellerDashboardResponseDiagnosticsAreBounded();

console.log('Public business truth verifier passed');
