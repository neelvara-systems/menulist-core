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
  'src/lib/public-truth-tools/publicTruthMonitorEntitlements.ts',
  'src/lib/public-truth-tools/serverPublicTruthMonitorEntitlements.ts',
  'src/lib/public-truth-tools/publicTruthMonitorReport.ts',
  'src/lib/validation/publicTruthMonitorSchemas.ts',
  'src/database/publicTruthMonitor/server.ts',
  'src/database/publicTruthMonitor/index.ts',
  'src/hooks/publicTruthTools/usePublicTruthMonitor.ts',
  'src/app/api/public-truth-monitor/summary/route.ts',
  'src/app/api/public-truth-monitor/refresh/route.ts',
  'src/components/templates/main-app/ownerBusinessAssistant/PublicTruthMonitorPanel.tsx',
  'src/components/mobile/components/MobilePublicTruthMonitorCard.tsx',
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
const serverEntitlement = read('src/lib/public-truth-tools/serverPublicTruthMonitorEntitlements.ts');
const report = read('src/lib/public-truth-tools/publicTruthMonitorReport.ts');
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
const changelog = read('__docs__/CHANGELOG.md');
const aggregateVerifier = read('scripts/verification/verify-public-truth-tools.js');

assert(
  packageJson.scripts['verify:public-truth-monitor-addon'] === 'node scripts/verification/verify-public-truth-monitor-addon.js',
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
assertIncludes(entitlement, 'getPublicTruthMonitorPaidPlanIds', 'paid plan list helper');
assertIncludes(serverEntitlement, 'getActiveSubscriptionForStoreServer', 'server subscription check');

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
assertNotIncludes(validation, 'selectedProjectId: z.string().min(1).max(140).optional()', 'refresh request must not keep max-only selected project validation');

assertIncludes(serverDal, 'DB_COLLECTIONS.PLATFORM_SUMMARY', 'platform summary storage through DB collection constant');
assertIncludes(serverDal, 'buildPublicTruthMonitorSummaryDocId', 'summary doc id helper');
assertIncludes(serverDal, 'parseSummaryProjects', 'summary project parser');
assertIncludes(serverDal, 'sanitizeForAdminFirestore', 'admin write sanitizer');
assertIncludes(serverDal, 'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";', 'server DAL document-ID guard import');
assertIncludes(serverDal, 'function normalizePublicTruthMonitorDocumentId(value: unknown): string | null', 'server DAL document-ID normalizer');
assertIncludes(serverDal, 'const documentId = typeof value === "string" ? value.trim() : "";', 'server DAL document-ID trim');
assertIncludes(serverDal, 'const projectId = normalizePublicTruthMonitorDocumentId(project.projectId);', 'project picker normalizes persisted summary project IDs');
assertIncludes(serverDal, 'const selectedProjectIdDocumentId = normalizePublicTruthMonitorDocumentId(selectedProjectId);', 'project picker normalizes selected project ID');
assertIncludes(serverDal, 'const projectId = normalizePublicTruthMonitorDocumentId(params.projectId);', 'project reader normalizes project IDs before Firestore reads');
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
assertIncludes(summaryRoute, 'verifyTenantAccess', 'summary route tenant check');
assertIncludes(summaryRoute, 'requireAnyStorePermissionForStoreData', 'summary route store permission check');
assertIncludes(summaryRoute, 'PERMISSIONS.VIEW_ANALYTICS', 'summary route Business Health permission');
assertIncludes(summaryRoute, 'evaluatePublicTruthMonitorServerEntitlement', 'summary route entitlement');
assertIncludes(refreshRoute, 'withAuth', 'refresh route auth');
assertIncludes(refreshRoute, 'checkDataWriteLimit', 'refresh route write rate limit');
assertIncludes(refreshRoute, 'validateAPIInput', 'refresh route input validation');
assertIncludes(refreshRoute, 'parsePublicTruthMonitorJsonBody', 'refresh route bounded parser');
assertIncludes(refreshRoute, 'verifyTenantAccess', 'refresh route tenant check');
assertIncludes(refreshRoute, 'requireAnyStorePermissionForStoreData', 'refresh route store permission check');
assertIncludes(refreshRoute, 'PERMISSIONS.VIEW_ANALYTICS', 'refresh route Business Health permission');
assertIncludes(refreshRoute, 'writePublicTruthMonitorSummaryServer', 'refresh route summary write');
assertIncludes(refreshRoute, 'buildOwnerPublicTruthReadinessReport', 'refresh route owner readiness reuse');

assertIncludes(clientDal, '/api/public-truth-monitor/summary', 'client summary endpoint');
assertIncludes(clientDal, '/api/public-truth-monitor/refresh', 'client refresh endpoint');
assertIncludes(clientDal, 'readJsonResponseWithLimit', 'bounded client response parser');
assertNotIncludes(clientDal, 'getDoc(', 'client monitor DAL must not read Firestore directly');
assertNotIncludes(clientDal, 'firebaseClient', 'client monitor DAL must not use Firebase client directly');
assertIncludes(hook, 'useSWR', 'shared hook');

assertIncludes(desktopPage, 'PublicTruthMonitorPanel', 'Business Health desktop panel mount');
assertIncludes(desktopPanel, 'Public truth history', 'desktop owner copy');
assertIncludes(desktopPanel, 'Download report', 'desktop export action');
assertIncludes(desktopPanel, 'Run check', 'desktop refresh action');
assertIncludes(mobileScreen, 'MobilePublicTruthMonitorCard', 'Business Health mobile card mount');
assertIncludes(mobileCard, 'Public truth history', 'mobile owner copy');
assertIncludes(mobileCard, 'minHeight: 44', 'mobile touch target');

assertIncludes(implDoc, 'Status:** Runtime implemented', 'implementation doc status');
assertIncludes(implDoc, 'Public Truth Monitor project and scope ID boundary', 'implementation doc project and scope ID boundary');
assertIncludes(implDoc, 'trims and normalizes', 'implementation doc server DAL project ID normalization');
assertIncludes(firebaseDoc, 'platformSummary/publicTruthMonitor_{storeId}', 'Firebase doc summary path');
assertIncludes(firebaseDoc, 'maximum 6 reports', 'Firebase doc retention cap');
assertIncludes(firebaseDoc, 'Public Truth Monitor project/scope-ID admission is cost-neutral', 'Firebase doc project and scope ID boundary');
assertIncludes(firebaseDoc, 'normalized document ID', 'Firebase doc normalized document ID boundary');
assertIncludes(testsDoc, 'PTM-API-001', 'API acceptance test');
assertIncludes(testsDoc, 'PTM-MOB-001', 'mobile acceptance test');
assertIncludes(productionAudit, 'Public Truth Monitor project and scope ID boundary checkpoint', 'production audit project and scope ID boundary');
assertIncludes(productionAudit, 'Public Truth Monitor server DAL ID normalization checkpoint', 'production audit server DAL ID normalization');
assertIncludes(changelog, 'Public Truth Monitor Project ID Boundary', 'changelog project ID boundary');
assertIncludes(changelog, 'Public Truth Monitor Server DAL ID Normalization', 'changelog server DAL ID normalization');
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
