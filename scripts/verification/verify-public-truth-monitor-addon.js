const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
}

function assertOrder(content, orderedNeedles, label) {
  let cursor = -1;
  const missingOrOutOfOrder = [];

  for (const needle of orderedNeedles) {
    const nextIndex = content.indexOf(needle, cursor + 1);
    if (nextIndex === -1) {
      missingOrOutOfOrder.push(needle);
      continue;
    }
    cursor = nextIndex;
  }

  assert(
    missingOrOutOfOrder.length === 0,
    `${label} missing or out of order: ${missingOrOutOfOrder.join(', ')}`,
  );
}

const REQUIRED_FILES = [
  'src/constants/publicTruthMonitor.ts',
  'src/types/publicTruthMonitor.ts',
  'src/lib/public-truth-tools/publicTruthMonitorDiagnostics.ts',
  'src/lib/public-truth-tools/publicTruthMonitorApiResponse.ts',
  'src/lib/public-truth-tools/publicTruthMonitorEntitlements.ts',
  'src/lib/public-truth-tools/publicTruthMonitorServerScope.ts',
  'src/lib/public-truth-tools/serverPublicTruthMonitorEntitlements.ts',
  'src/lib/public-truth-tools/publicTruthMonitorReport.ts',
  'src/lib/public-truth-tools/publicTruthMonitorClientContracts.ts',
  'src/lib/validation/publicTruthMonitorSchemas.ts',
  'src/database/publicTruthMonitor/server.ts',
  'src/database/publicTruthMonitor/index.ts',
  'src/hooks/publicTruthTools/usePublicTruthMonitor.ts',
  'src/app/api/public-truth-monitor/summary/route.ts',
  'src/app/api/public-truth-monitor/refresh/route.ts',
  'src/components/templates/main-app/ownerBusinessAssistant/PublicTruthMonitorPanel.tsx',
  'src/components/mobile/components/MobilePublicTruthMonitorCard.tsx',
  'scripts/verification/test-public-truth-monitor-server-scope.ts',
  'scripts/verification/test-public-truth-monitor-client-contracts.ts',
  'scripts/verification/verify-public-truth-monitor-addon.js',
  '__docs__/menulist-tools/public-truth-monitor-addon/README.md',
  '__docs__/menulist-tools/public-truth-monitor-addon/public-truth-monitor-addon_spec.md',
  '__docs__/menulist-tools/public-truth-monitor-addon/public-truth-monitor-addon_impl.md',
  '__docs__/menulist-tools/public-truth-monitor-addon/public-truth-monitor-addon_firebase.md',
  '__docs__/menulist-tools/public-truth-monitor-addon/public-truth-monitor-addon_mobile-support.md',
  '__docs__/menulist-tools/public-truth-monitor-addon/public-truth-monitor-addon_test-cases.md',
];

for (const file of REQUIRED_FILES) {
  assert(exists(file), `Public Truth Monitor Add-On required file missing: ${file}`);
}

const packageJson = JSON.parse(read('package.json'));
const features = read('src/config/features.ts');
const constants = read('src/constants/publicTruthMonitor.ts');
const types = read('src/types/publicTruthMonitor.ts');
const entitlement = read('src/lib/public-truth-tools/publicTruthMonitorEntitlements.ts');
const apiResponse = read('src/lib/public-truth-tools/publicTruthMonitorApiResponse.ts');
const serverScope = read('src/lib/public-truth-tools/publicTruthMonitorServerScope.ts');
const serverEntitlement = read('src/lib/public-truth-tools/serverPublicTruthMonitorEntitlements.ts');
const report = read('src/lib/public-truth-tools/publicTruthMonitorReport.ts');
const clientContracts = read('src/lib/public-truth-tools/publicTruthMonitorClientContracts.ts');
const validation = read('src/lib/validation/publicTruthMonitorSchemas.ts');
const serverDal = read('src/database/publicTruthMonitor/server.ts');
const clientDal = read('src/database/publicTruthMonitor/index.ts');
const hook = read('src/hooks/publicTruthTools/usePublicTruthMonitor.ts');
const summaryRoute = read('src/app/api/public-truth-monitor/summary/route.ts');
const refreshRoute = read('src/app/api/public-truth-monitor/refresh/route.ts');
const desktopPage = read('src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthPage.tsx');
const desktopPanel = read('src/components/templates/main-app/ownerBusinessAssistant/PublicTruthMonitorPanel.tsx');
const mobileScreen = read('src/components/mobile/screens/MobileBusinessHealthScreen.tsx');
const mobileCard = read('src/components/mobile/components/MobilePublicTruthMonitorCard.tsx');
const implDoc = read('__docs__/menulist-tools/public-truth-monitor-addon/public-truth-monitor-addon_impl.md');
const firebaseDoc = read('__docs__/menulist-tools/public-truth-monitor-addon/public-truth-monitor-addon_firebase.md');
const testsDoc = read('__docs__/menulist-tools/public-truth-monitor-addon/public-truth-monitor-addon_test-cases.md');
const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');
const aggregateVerifier = read('scripts/verification/verify-public-truth-tools.js');

assert(
  packageJson.scripts['verify:public-truth-monitor-addon'] === 'node scripts/verification/verify-public-truth-monitor-addon.js && npm run test:public-truth-monitor-client-contracts',
  'verify:public-truth-monitor-addon package script must be registered',
);

[
  'ENABLE_PUBLIC_TRUTH_MONITOR_ADDON: true',
  'PUBLIC_TRUTH_MONITOR_ACCESS: "paid"',
  'PUBLIC_TRUTH_MONITOR_HISTORY_LIMIT: 6',
  'PUBLIC_TRUTH_MONITOR_MULTI_LOCATION_LIMIT: 10',
  'PUBLIC_TRUTH_MONITOR_SCHEDULER_MODE: "manual"',
].forEach((needle) => assertIncludes(features, needle, `feature flag ${needle}`));

assertIncludes(constants, 'PUBLIC_TRUTH_MONITOR_SUMMARY_DOC_PREFIX = "publicTruthMonitor"', 'summary doc prefix');
assertIncludes(constants, 'PUBLIC_TRUTH_MONITOR_SOURCE_BOUNDARY', 'source boundary constant');
assertIncludes(types, 'PublicTruthMonitorSummaryDocument', 'summary type');
assertIncludes(types, 'PublicTruthMonitorHistoryEntry', 'history entry type');
assertIncludes(entitlement, 'hasValidSubscriptionAccess', 'paid plan entitlement');
assertIncludes(entitlement, 'isMenuListSubscriptionEntitledForTenant(subscription, tenantId)', 'paid plan exact MenuList tenant entitlement');
assertIncludes(entitlement, 'getPublicTruthMonitorPaidPlanIds', 'paid plan list helper');
assertIncludes(serverEntitlement, 'getActiveSubscriptionForStoreServer', 'server subscription check');
assertIncludes(serverEntitlement, 'tenantId: sessionScope?.tenantScope.numericId', 'server exact tenant entitlement input');
assertIncludes(serverEntitlement, 'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";', 'server entitlement session scope document-ID guard import');
assertIncludes(serverEntitlement, 'export function normalizePublicTruthMonitorSessionScopeDocumentId(', 'server entitlement session scope normalizer');
assertIncludes(serverEntitlement, 'documentId !== raw || !/^[1-9]\\d*$/.test(documentId) || !isValidFirestoreDocumentId(documentId)', 'server entitlement exact numeric scope guard');
assertIncludes(serverEntitlement, 'export function getPublicTruthMonitorSessionScope(session: any): PublicTruthMonitorSessionScope | null', 'server entitlement session scope helper');
assertIncludes(serverEntitlement, 'return resolveStorePermissionSessionScope(session);', 'server entitlement exact root and nested session alias agreement');
assertIncludes(serverEntitlement, 'export async function evaluatePublicTruthMonitorServerEntitlementWithAuthority(', 'server entitlement exposes exact subscription authority');
assertIncludes(serverEntitlement, 'activeSubscription,', 'server entitlement returns the admitted subscription');
assertIncludes(serverEntitlement, 'const sessionScope = getPublicTruthMonitorSessionScope(params.session);', 'server entitlement normalized session scope');
assertIncludes(serverEntitlement, 'readPublicTruthMonitorStoreDataServer(sessionScope.storeScope.documentId)', 'server entitlement normalized store read');
assertIncludes(serverEntitlement, 'getActiveSubscriptionForStoreServer(sessionScope.tenantScope.numericId, sessionScope.storeScope.numericId)', 'server entitlement normalized subscription lookup');
assertNotIncludes(serverEntitlement, 'const tenantId = Number(params.session?.tId);', 'server entitlement must not loose-coerce tenant scope');
assertNotIncludes(serverEntitlement, 'const storeId = Number(params.session?.sId);', 'server entitlement must not loose-coerce store scope');
assertIncludes(serverScope, 'export function isCurrentPublicTruthMonitorStoreScope(', 'current monitor store scope helper');
assertIncludes(serverScope, 'persistedTenantId === params.tenantDocumentId', 'current monitor exact store ownership');
assertIncludes(serverScope, '!isPlatformEntityBlocked(params.storeData)', 'current monitor store block guard');
assertIncludes(serverScope, '!isPlatformEntityBlocked(params.tenantData)', 'current monitor tenant block guard');

assertIncludes(report, 'buildPublicTruthMonitorHistoryEntry', 'history builder');
assertIncludes(report, 'buildPublicTruthMonitorExportText', 'export renderer');
assertIncludes(report, 'slice(0, historyLimit)', 'capped history');
assertIncludes(report, 'No external websites, social profiles, Google profiles, AI answers, search rankings, QR scans, or third-party platforms were inspected or changed.', 'explicit not-checked evidence');

assertIncludes(validation, 'readBoundedJsonBody', 'bounded request body parser');
assertIncludes(validation, 'PUBLIC_TRUTH_MONITOR_API_MAX_BODY_BYTES', 'request body size cap');
assertIncludes(validation, 'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";', 'refresh request schema document-ID guard import');
assertIncludes(validation, 'const publicTruthMonitorProjectIdSchema = z.string()', 'refresh request project ID schema');
assertIncludes(validation, '.refine(isValidFirestoreDocumentId, "Invalid project ID")', 'refresh request project ID document-ID guard');
assertIncludes(validation, 'selectedProjectId: publicTruthMonitorProjectIdSchema.optional()', 'refresh request selected project ID schema usage');
assertNotIncludes(validation, '.trim()', 'refresh request project ID schema must not trim selected project IDs before validation');
assertNotIncludes(validation, 'selectedProjectId: z.string().min(1).max(140).optional()', 'refresh request must not keep max-only selected project validation');

assertIncludes(serverDal, 'DB_COLLECTIONS.PLATFORM_SUMMARY', 'platform summary storage through DB collection constant');
assertIncludes(serverDal, 'buildPublicTruthMonitorSummaryDocId', 'summary doc id helper');
assertIncludes(serverDal, 'parseSummaryProjects', 'summary project parser');
assertIncludes(serverDal, 'sanitizeForAdminFirestore', 'admin write sanitizer');
assertIncludes(serverDal, 'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";', 'server DAL document-ID guard import');
assertIncludes(serverDal, 'function normalizePublicTruthMonitorDocumentId(value: unknown): string | null', 'server DAL document-ID normalizer');
assertIncludes(serverDal, 'const raw = typeof value === "string" ? value : "";', 'server DAL document-ID raw value');
assertIncludes(serverDal, 'return documentId === raw && isValidFirestoreDocumentId(documentId) ? documentId : null;', 'server DAL document-ID raw equality guard');
assertIncludes(serverDal, 'const projectId = normalizePublicTruthMonitorDocumentId(project.projectId);', 'project picker normalizes persisted summary project IDs');
assertIncludes(serverDal, 'const selectedProjectIdDocumentId = normalizePublicTruthMonitorDocumentId(selectedProjectId);', 'project picker normalizes selected project ID');
assertIncludes(serverDal, 'const projectId = normalizePublicTruthMonitorDocumentId(params.projectId);', 'project reader normalizes project IDs before Firestore reads');
assertIncludes(serverDal, 'normalizePublicTruthMonitorScopeAliases(tenantAliases)', 'legacy project reader rejects conflicting tenant aliases');
assertIncludes(serverDal, 'normalizePublicTruthMonitorScopeAliases(storeAliases)', 'legacy project reader rejects conflicting store aliases');
assertNotIncludes(serverDal, 'params.projectData?.tId ?? params.projectData?.tenantId', 'legacy project reader must not prefer one conflicting tenant alias');
assertNotIncludes(serverDal, 'params.projectData?.sId ?? params.projectData?.storeId', 'legacy project reader must not prefer one conflicting store alias');
assertIncludes(serverDal, 'if (!projectId) return null;', 'project reader rejects malformed project IDs before Firestore reads');
assertNotIncludes(serverDal, '.doc(params.projectId)', 'project reader must not use raw request project ID in document refs');
assertOrder(
  serverDal,
  [
    'const projectId = normalizePublicTruthMonitorDocumentId(params.projectId);',
    '.doc(projectId)',
  ],
  'project reader document-ID normalizer must run before project document reads',
);

assertIncludes(summaryRoute, 'withAuth', 'summary route auth');
assertIncludes(summaryRoute, 'checkAIRateLimit("DATA_READ"', 'summary route read rate limit');
assertIncludes(summaryRoute, 'failClosedOnProviderError: true,\n            session,', 'summary route reuses withAuth session for rate limiting');
assertIncludes(summaryRoute, 'verifyTenantAccess', 'summary route tenant check');
assertIncludes(summaryRoute, 'requireAnyStorePermissionForStoreData', 'summary route store permission check');
assertIncludes(summaryRoute, 'PERMISSIONS.VIEW_ANALYTICS', 'summary route Business Health permission');
assertIncludes(summaryRoute, 'evaluatePublicTruthMonitorServerEntitlement', 'summary route entitlement');
assertIncludes(summaryRoute, 'getPublicTruthMonitorSessionScope', 'summary route session scope normalizer');
assertIncludes(summaryRoute, 'const sessionScope = getPublicTruthMonitorSessionScope(session);', 'summary route normalized session scope');
assertIncludes(summaryRoute, 'verifyTenantAccess(session, sessionScope.tenantScope.numericId, sessionScope.storeScope.numericId, request)', 'summary route normalized tenant access');
assertIncludes(summaryRoute, 'readAuthorizedPublicTruthMonitorSummaryServer({', 'summary route transaction-authorized summary read');
assertIncludes(summaryRoute, 'authorizeStore: async (storeData) => {', 'summary route transaction-current permission callback');
assertIncludes(summaryRoute, 'sessionScope.storeScope.numericId', 'summary route normalized store permission scope');
assertIncludes(summaryRoute, 'tenantId: sessionScope.tenantScope.documentId', 'summary route transaction-current tenant scope');
assertNotIncludes(summaryRoute, 'Number(session.sId)', 'summary route must not loose-coerce store scope');
assertNotIncludes(summaryRoute, 'Number(session.tId)', 'summary route must not loose-coerce tenant scope');
assertIncludes(refreshRoute, 'withAuth', 'refresh route auth');
assertIncludes(refreshRoute, 'checkDataWriteLimit', 'refresh route write rate limit');
assertIncludes(refreshRoute, 'failClosedOnProviderError: true,\n            session,', 'refresh route reuses withAuth session for rate limiting');
assertIncludes(refreshRoute, 'validateAPIInput', 'refresh route input validation');
assertIncludes(refreshRoute, 'parsePublicTruthMonitorJsonBody', 'refresh route bounded parser');
assertIncludes(refreshRoute, 'verifyTenantAccess', 'refresh route tenant check');
assertIncludes(refreshRoute, 'requireAnyStorePermissionForStoreData', 'refresh route store permission check');
assertIncludes(refreshRoute, 'PERMISSIONS.VIEW_ANALYTICS', 'refresh route Business Health permission');
assertIncludes(refreshRoute, 'updatePublicTruthMonitorSummaryServer', 'refresh route atomic summary write');
assertIncludes(refreshRoute, 'evaluatePublicTruthMonitorServerEntitlementWithAuthority({', 'refresh route retains admitted subscription authority');
assertIncludes(refreshRoute, 'authorizeSubscription: (subscriptionData, currentStoreData) => (', 'refresh route transaction-current subscription callback');
assertIncludes(refreshRoute, 'subscriptionId: activeSubscription.id', 'refresh route exact admitted subscription ref');
assertIncludes(refreshRoute, 'buildSummary: (current) => buildPublicTruthMonitorSummary({', 'refresh route atomic current-summary merge');
assertIncludes(refreshRoute, 'failClosedOnProviderError: true', 'refresh route fail-closed rate limit');
assertIncludes(refreshRoute, 'const actorId = resolveCurrentSessionUserDocumentId(session);', 'refresh route exact current actor attribution');
assertIncludes(refreshRoute, 'generatedByUserId: actorId', 'refresh route persists the admitted actor');
assertNotIncludes(refreshRoute, 'generatedByUserId: session.uId || session.user?.id', 'refresh route first-alias actor attribution');
assertIncludes(refreshRoute, 'buildOwnerPublicTruthReadinessReport', 'refresh route owner readiness reuse');
assertIncludes(refreshRoute, 'getPublicTruthMonitorSessionScope', 'refresh route session scope normalizer');
assertIncludes(refreshRoute, 'const sessionScope = getPublicTruthMonitorSessionScope(session);', 'refresh route normalized session scope');
assertIncludes(refreshRoute, 'verifyTenantAccess(session, sessionScope.tenantScope.numericId, sessionScope.storeScope.numericId, request)', 'refresh route normalized tenant access');
assertIncludes(refreshRoute, 'readPublicTruthMonitorStoreDataServer(sessionScope.storeScope.documentId)', 'refresh route normalized store read');
assertIncludes(refreshRoute, 'readPublicTruthMonitorProjectSummariesServer(sessionScope.storeScope.documentId)', 'refresh route normalized project summary read');
assertIncludes(refreshRoute, 'tId: sessionScope.tenantScope.documentId', 'refresh route normalized project read tenant scope');
assertIncludes(refreshRoute, 'storeId: sessionScope.storeScope.documentId', 'refresh route normalized summary write scope');
assertIncludes(refreshRoute, 'tenantId: sessionScope.tenantScope.documentId', 'refresh route transaction-current tenant scope');
assertIncludes(refreshRoute, 'authorizeStore: async (currentStoreData) => {', 'refresh route transaction-current permission callback');
assertNotIncludes(refreshRoute, 'Number(session.sId)', 'refresh route must not loose-coerce store scope');
assertNotIncludes(refreshRoute, 'Number(session.tId)', 'refresh route must not loose-coerce tenant scope');
assertIncludes(summaryRoute, 'failClosedOnProviderError: true', 'summary route fail-closed rate limit');
assertIncludes(apiResponse, '"Cache-Control": "private, no-store, max-age=0"', 'shared private no-store response policy');
assertIncludes(apiResponse, '"X-Content-Type-Options": "nosniff"', 'shared response sniffing protection');
assertIncludes(apiResponse, 'const headers = new Headers(init.headers);', 'shared protected response header precedence');
assertIncludes(apiResponse, 'export function withPublicTruthMonitorPrivateHeaders', 'shared helper-response stamper');
[summaryRoute, refreshRoute].forEach((route, index) => {
  assertIncludes(route, 'publicTruthMonitorJson', `route ${index + 1} shared private JSON boundary`);
  assertIncludes(route, 'withPublicTruthMonitorPrivateHeaders', `route ${index + 1} shared helper-response boundary`);
  assertNotIncludes(route, 'NextResponse.json(', `route ${index + 1} direct JSON response bypass`);
});
assertIncludes(serverDal, 'export async function updatePublicTruthMonitorSummaryServer(', 'server DAL atomic summary updater');
assertIncludes(serverDal, 'export async function readAuthorizedPublicTruthMonitorSummaryServer(', 'server DAL transaction-authorized summary reader');
assertIncludes(serverDal, 'firestoreAdmin.runTransaction', 'server DAL transaction boundary');
assertIncludes(serverDal, 'transaction.get(storeRef)', 'server DAL reads current store inside transaction');
assertIncludes(serverDal, 'transaction.get(subscriptionRef)', 'server DAL reads current subscription inside refresh transaction');
assertIncludes(serverDal, 'transaction.get(tenantRef)', 'server DAL reads current tenant inside transaction');
assertIncludes(serverDal, 'transaction.get(summaryRef)', 'server DAL reads current summary inside transaction');
assertIncludes(serverDal, 'isCurrentPublicTruthMonitorStoreScope({', 'server DAL current ownership and lifecycle guard');
assertIncludes(serverDal, '|| !await params.authorizeStore(storeData!)', 'server DAL current permission guard');
assertIncludes(serverDal, '|| !params.authorizeSubscription(subscriptionData, storeData!)', 'server DAL current entitlement guard');
assertIncludes(serverDal, 'transaction.set(summaryRef', 'server DAL writes summary inside transaction');

assertIncludes(clientDal, '/api/public-truth-monitor/summary', 'client summary endpoint');
assertIncludes(clientDal, '/api/public-truth-monitor/refresh', 'client refresh endpoint');
assertIncludes(clientDal, 'readJsonResponseWithLimit', 'bounded client response parser');
assertIncludes(clientDal, 'parsePublicTruthMonitorClientData', 'runtime client response validator');
assertNotIncludes(clientDal, 'payload as T', 'client response must not use unchecked generic assertion');
assertNotIncludes(clientDal, 'getDoc(', 'client monitor DAL must not read Firestore directly');
assertNotIncludes(clientDal, 'firebaseClient', 'client monitor DAL must not use Firebase client directly');
assertIncludes(hook, 'useSWR', 'shared hook');
assertIncludes(hook, 'getPublicTruthMonitorClientCacheKey(scope)', 'tenant and store scoped SWR key');
assertIncludes(clientContracts, 'return ["publicTruthMonitorSummary", scope.tenantId, scope.storeId] as const;', 'tenant and store cache identity');
assertIncludes(clientContracts, 'parsed.summary.tId !== expectedScope.tenantId', 'response tenant scope match');
assertIncludes(clientContracts, 'parsed.summary.sId !== expectedScope.storeId', 'response store scope match');

assertIncludes(desktopPage, 'PublicTruthMonitorPanel', 'Business Health desktop panel mount');
assertIncludes(desktopPage, 'tenantId={tenantDetails?.tenantId || storeDetails?.tenantId}', 'desktop tenant scope propagation');
assertIncludes(desktopPanel, 'Public truth history', 'desktop owner copy');
assertIncludes(desktopPanel, 'Download report', 'desktop export action');
assertIncludes(desktopPanel, 'Run check', 'desktop refresh action');
assertIncludes(mobileScreen, 'MobilePublicTruthMonitorCard', 'Business Health mobile card mount');
assertIncludes(mobileScreen, 'tenantId={tenantDetails?.tenantId || storeDetails?.tenantId}', 'mobile tenant scope propagation');
assertIncludes(mobileCard, 'Public truth history', 'mobile owner copy');
assertIncludes(mobileCard, 'minHeight: 44', 'mobile touch target');

assertIncludes(implDoc, 'Status:** Runtime implemented', 'implementation doc status');
assertIncludes(implDoc, 'Public Truth Monitor project and scope ID boundary', 'implementation doc project and scope ID boundary');
assertIncludes(implDoc, 'whitespace-mutated selected project IDs fail', 'implementation doc strict selected project ID boundary');
assertIncludes(implDoc, 'Public Truth Monitor session scope boundary', 'implementation doc session scope boundary');
assertIncludes(firebaseDoc, 'platformSummary/publicTruthMonitor_{storeId}', 'Firebase doc summary path');
assertIncludes(firebaseDoc, 'maximum 6 reports', 'Firebase doc retention cap');
assertIncludes(firebaseDoc, 'Public Truth Monitor project/scope-ID admission is cost-neutral', 'Firebase doc project and scope ID boundary');
assertIncludes(firebaseDoc, 'whitespace-mutated selected project IDs fail', 'Firebase doc strict project ID boundary');
assertIncludes(firebaseDoc, 'Public Truth Monitor session-scope admission is cost-neutral', 'Firebase doc session scope boundary');
assertIncludes(testsDoc, 'PTM-API-001', 'API acceptance test');
assertIncludes(testsDoc, 'PTM-MOB-001', 'mobile acceptance test');
assertIncludes(productionAudit, 'Public Truth Monitor project and scope ID boundary checkpoint', 'production audit project and scope ID boundary');
assertIncludes(productionAudit, 'Public Truth Monitor session scope boundary checkpoint', 'production audit session scope boundary');
assertIncludes(productionAudit, 'Public Truth Monitor server DAL ID normalization checkpoint', 'production audit server DAL ID normalization');
assertIncludes(productionAudit, 'whitespace-mutated selected project IDs', 'production audit strict selected project ID boundary');
assertIncludes(changelog, 'Public Truth Monitor Project ID Boundary', 'changelog project ID boundary');
assertIncludes(changelog, 'Public Truth Monitor Session Scope Boundary', 'changelog session scope boundary');
assertIncludes(changelog, 'Public Truth Monitor Server DAL ID Normalization', 'changelog server DAL ID normalization');
assertIncludes(changelog, 'Public Truth Monitor Strict Project ID Boundary', 'changelog strict project ID boundary');
assertIncludes(aggregateVerifier, 'verify-public-truth-monitor-addon.js', 'aggregate verifier includes monitor verifier');

[
  summaryRoute,
  refreshRoute,
  serverDal,
  report,
].forEach((content, index) => {
  assertNotIncludes(content, 'fetch("http', `server/monitor source ${index} external fetch guard`);
  assertNotIncludes(content, 'openai', `server/monitor source ${index} OpenAI provider guard`);
  assertNotIncludes(content, 'googleapis', `server/monitor source ${index} Google provider guard`);
});

console.log('Public Truth Monitor Add-On verification passed');
