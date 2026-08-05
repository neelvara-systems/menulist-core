require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
  require: ['tsconfig-paths/register'],
});

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const EXTERNAL_ONLY_VERIFICATION_FILES = [
  'verify-customer-pwa-offline.mjs',
  'verify-mobile-owner-menu.mjs',
  'verify-mobile-upload-extraction.mjs',
  'verify-public-routing-summary-backfill.mjs',
  'verify-razorpay-sandbox-readiness.mjs',
];

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
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

function assertNodeCheck(relPath) {
  const result = spawnSync(process.execPath, ['--check', relPath], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert(
    result.status === 0 && !result.signal,
    `${relPath} must pass node --check${result.stderr ? `: ${result.stderr.trim()}` : ''}`,
  );
}

function listMarkdownFiles(relDir) {
  const absoluteDir = path.join(ROOT, relDir);
  const files = [];

  function walk(dir) {
    for (const entryName of fs.readdirSync(dir)) {
      const absolutePath = path.join(dir, entryName);
      const stat = fs.statSync(absolutePath);
      if (stat.isDirectory()) {
        walk(absolutePath);
      } else if (absolutePath.endsWith('.md')) {
        files.push(path.relative(ROOT, absolutePath).split(path.sep).join('/'));
      }
    }
  }

  walk(absoluteDir);
  return files.sort();
}

function listArchivedMarkdownFiles() {
  return listMarkdownFiles('__docs__').filter((relPath) => (
    relPath.startsWith('__docs__/archive/') || relPath.includes('/_archive/')
  ));
}

function verifyArchiveLaunchCertificationBoundaries() {
  const staleLaunchPattern = /production ready|production-ready|certified production ready|ready for testing|ready for production|ready for deployment|ship approved|deploy all|launch ready|ship ready/i;
  const missingBoundary = [];

  for (const relPath of listArchivedMarkdownFiles()) {
    const content = read(relPath);
    if (!staleLaunchPattern.test(content)) continue;

    const topBoundary = content.split(/\r?\n/).slice(0, 8).join('\n');
    if (!/not current launch certification/i.test(topBoundary)) {
      missingBoundary.push(relPath);
    }
  }

  assert(
    missingBoundary.length === 0,
    `Archived docs with launch/certification wording must start with a historical launch-certification boundary: ${missingBoundary.join(', ')}`,
  );
}

function verifyVerificationRegistryCoverage() {
  const packageJson = JSON.parse(read('package.json'));
  const scriptEntries = Object.entries(packageJson.scripts || {});
  const rootVerifyScriptEntries = scriptEntries.filter(([name]) => name.startsWith('verify:'));
  const verificationFiles = fs
    .readdirSync(path.join(ROOT, 'scripts/verification'))
    .filter((filename) => /^verify-.*\.(?:js|mjs|ts)$/.test(filename))
    .sort();
  const referencedFiles = new Set();

  for (const [, command] of rootVerifyScriptEntries) {
    for (const file of verificationFiles) {
      if (command.includes(`scripts/verification/${file}`)) {
        referencedFiles.add(file);
      }
    }
  }

  const uncoveredFiles = verificationFiles.filter((file) => !referencedFiles.has(file));
  assert(
    uncoveredFiles.join('\n') === EXTERNAL_ONLY_VERIFICATION_FILES.join('\n'),
    `Root verify registry coverage drift. Expected only external files ${EXTERNAL_ONLY_VERIFICATION_FILES.join(', ')} to be outside root verify:* coverage, found ${uncoveredFiles.join(', ') || 'none'}.`,
  );

  const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const productionCertificationRunbook = read('__docs__/production-readiness/external-certification-runbook.md');
  const docsReadme = read('__docs__/README.md');
  const systemDataFlowAudit = read('__docs__/system-strengthening/menulist-system-data-flow-audit-2026-06-20.md');
  const masterProductionAuditGovernance = read('__docs__/testing-and-audit-prompts/00-master-production-audit-governance.md');
  const finalProductionReadinessVerdict = read('__docs__/testing-and-audit-prompts/12-final-production-readiness-verdict.md');
  const archivedProductionReadinessCertificate = read('__docs__/archive/PRODUCTION-READINESS-CERTIFICATE.md');
  const archivedChatgptSsotTranscript = read('__docs__/archive/Single Source of Truth (SSOT) - ChatGPT/conversastion.md');
  const trackedChangelogResult = spawnSync('git', ['ls-files', '__docs__/CHANGELOG.md', '__docs__/changelog.md'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert(
    trackedChangelogResult.status === 0 && !trackedChangelogResult.signal,
    `git ls-files changelog casing check must pass${trackedChangelogResult.stderr ? `: ${trackedChangelogResult.stderr.trim()}` : ''}`,
  );
  assert(
    trackedChangelogResult.stdout.trim() === '__docs__/changelog.md',
    `Canonical changelog path must be tracked as __docs__/changelog.md only, found: ${trackedChangelogResult.stdout.trim() || 'none'}`,
  );
  assertIncludes(changelog, 'Release Certification Boundary', 'Changelog historical release certification boundary heading');
  assertIncludes(changelog, 'This changelog is chronological history, not current launch approval.', 'Changelog historical release certification boundary');
  assertIncludes(changelog, 'Current MenuList production readiness is decided only by the active', 'Changelog current launch authority boundary');
  assertIncludes(docsReadme, '[changelog.md](./changelog.md)', 'Documentation README canonical lowercase changelog link');
  assertIncludes(docsReadme, 'not current launch certification', 'Documentation archive index launch-certification boundary');
  assertIncludes(masterProductionAuditGovernance, 'Launch Authority Boundary', 'Master production audit governance launch boundary heading');
  assertIncludes(masterProductionAuditGovernance, 'A high score cannot override missing [External Certification Runbook]', 'Master production audit governance external evidence boundary');
  assertIncludes(masterProductionAuditGovernance, 'Do not mark MenuList launch ready, production approved, release certified, or deploy approved', 'Master production audit governance launch approval boundary');
  assertIncludes(finalProductionReadinessVerdict, 'Launch Authority Boundary', 'Final production-readiness verdict launch boundary heading');
  assertIncludes(finalProductionReadinessVerdict, 'A 9-10 source-confidence score is not launch-ready if any [External Certification Runbook]', 'Final production-readiness verdict external evidence boundary');
  assertIncludes(finalProductionReadinessVerdict, 'Source-ready / not launch certified', 'Final production-readiness verdict missing-external-gate label');
  assertIncludes(productionReadinessAudit, 'Production audit prompt launch-authority checkpoint', 'Production readiness audit prompt launch-authority checkpoint');
  assertIncludes(changelog, 'Production Audit Prompt Launch Boundary', 'Changelog production audit prompt launch-boundary entry');
  assertNotIncludes(systemDataFlowAudit, 'Pending scoped `git diff --check`', 'System data-flow ledger stale pending diff-check note');
  assertIncludes(productionReadinessAudit, 'System ledger pending-validation cleanup checkpoint', 'Production readiness audit system ledger pending-validation checkpoint');
  assertIncludes(changelog, 'System Ledger Pending Validation Cleanup', 'Changelog system ledger pending-validation entry');
  assertIncludes(productionReadinessAudit, 'Changelog canonical path casing checkpoint:', 'Production readiness audit changelog path casing checkpoint');
  assertIncludes(changelog, 'Changelog canonical path is lowercase', 'Changelog canonical lowercase path entry');
  verifyArchiveLaunchCertificationBoundaries();
  assertIncludes(archivedProductionReadinessCertificate, 'Historical archive evidence; not current launch certification.', 'Archived production-readiness certificate launch boundary status');
  assertIncludes(archivedProductionReadinessCertificate, 'Current Launch Boundary', 'Archived production-readiness certificate launch boundary section');
  assertIncludes(archivedProductionReadinessCertificate, 'This January 11, 2026 certificate is preserved only as historical context', 'Archived production-readiness certificate historical context boundary');
  assertIncludes(archivedProductionReadinessCertificate, 'It is not current MenuList production approval, deploy approval, launch approval, or release certification.', 'Archived production-readiness certificate current approval boundary');
  assertIncludes(archivedChatgptSsotTranscript, 'Historical ChatGPT transcript; not current launch certification.', 'Archived ChatGPT SSOT transcript launch boundary status');
  assertIncludes(archivedChatgptSsotTranscript, 'Current Launch Boundary', 'Archived ChatGPT SSOT transcript launch boundary section');
  assertIncludes(archivedChatgptSsotTranscript, 'It is not current MenuList source of truth, production approval, deploy approval, launch approval, or release certification.', 'Archived ChatGPT SSOT transcript current approval boundary');
  assertIncludes(productionReadinessAudit, 'Archive launch-certification boundary checkpoint', 'Production readiness audit archive launch-certification boundary checkpoint');
  assertIncludes(productionReadinessAudit, 'Nested archive launch-certification boundary coverage checkpoint:', 'Production readiness audit nested archive launch-certification boundary checkpoint');
  assertIncludes(changelog, 'Archive Launch Certification Boundary', 'Changelog archive launch-certification boundary entry');
  assertIncludes(changelog, 'Nested archive launch-boundary coverage is source-gated', 'Changelog nested archive launch-boundary coverage entry');
  assertIncludes(productionReadinessAudit, 'Changelog historical entry boundary checkpoint', 'Production readiness audit changelog historical boundary checkpoint');
  assertIncludes(changelog, 'Recycle-Bin Verifier Boundary', 'Changelog recycle-bin verifier boundary entry');
  assertIncludes(changelog, '`npm run verify:recycle-bin` no longer prints manual-testing readiness or dev-server next steps', 'Changelog recycle-bin local-only output boundary');
  for (const file of EXTERNAL_ONLY_VERIFICATION_FILES) {
    assertIncludes(productionReadinessAudit, file, `Production readiness audit external verification allowlist ${file}`);
    assertIncludes(changelog, file, `Changelog external verification allowlist ${file}`);
    assertIncludes(
      productionCertificationRunbook,
      `node --check scripts/verification/${file}`,
      `External certification runbook syntax preflight ${file}`,
    );
    assertNodeCheck(`scripts/verification/${file}`);
  }
}

function verifyRuntimeLogTrackingBoundary() {
  const gitignore = read('.gitignore');
  const secureLoggingGuide = read('__docs__/security/secure-logging-guide.md');
  const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  assertIncludes(gitignore, '/logs/*.log', '.gitignore local runtime log boundary');
  assertIncludes(
    secureLoggingGuide,
    'Local runtime log files (`logs/*.log`) are ignored development artifacts and must not be committed.',
    'Secure logging guide local runtime log tracking boundary',
  );
  assertIncludes(
    productionReadinessAudit,
    'Runtime local-log tracking boundary checkpoint:',
    'Production readiness audit runtime local-log tracking boundary',
  );
  assertIncludes(
    changelog,
    'Runtime Local-Log Tracking Boundary',
    'Changelog runtime local-log tracking boundary',
  );

  const trackedLogsResult = spawnSync('git', ['ls-files', 'logs'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert(
    trackedLogsResult.status === 0 && !trackedLogsResult.signal,
    `git ls-files logs must pass${trackedLogsResult.stderr ? `: ${trackedLogsResult.stderr.trim()}` : ''}`,
  );

  const trackedRuntimeLogs = trackedLogsResult.stdout
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter((file) => /^logs\/[^/]+\.log$/.test(file));
  const presentTrackedRuntimeLogs = trackedRuntimeLogs.filter((file) => exists(file));
  assert(
    presentTrackedRuntimeLogs.length === 0,
    `Runtime local logs must not be present as tracked files: ${presentTrackedRuntimeLogs.join(', ')}`,
  );
}

function verifyGeneratedArtifactTrackingBoundary() {
  const gitignore = read('.gitignore');
  const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  [
    '/routes-manifest.json',
    '/tmp/',
    '/tsconfig.tsbuildinfo',
  ].forEach((ignorePattern) => {
    assertIncludes(gitignore, ignorePattern, `.gitignore generated artifact boundary ${ignorePattern}`);
  });
  assertIncludes(
    productionReadinessAudit,
    'Generated artifact tracking boundary checkpoint:',
    'Production readiness audit generated artifact tracking boundary',
  );
  assertIncludes(
    changelog,
    'Generated Artifact Tracking Boundary',
    'Changelog generated artifact tracking boundary',
  );

  const trackedArtifactResult = spawnSync('git', ['ls-files', 'tsconfig.tsbuildinfo', 'routes-manifest.json', 'tmp'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert(
    trackedArtifactResult.status === 0 && !trackedArtifactResult.signal,
    `git ls-files generated artifacts must pass${trackedArtifactResult.stderr ? `: ${trackedArtifactResult.stderr.trim()}` : ''}`,
  );

  const trackedArtifacts = trackedArtifactResult.stdout
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean);
  const presentTrackedArtifacts = trackedArtifacts.filter((file) => exists(file));
  assert(
    presentTrackedArtifacts.length === 0,
    `Generated cache/QA artifacts must not be present as tracked files: ${presentTrackedArtifacts.join(', ')}`,
  );
}

function verifySharedHttpClientBoundary() {
  const axiosClient = read('src/lib/axios/axiosClient.ts');
  const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  assertIncludes(
    axiosClient,
    'const PATCH = (path: string, data: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse> =>\n    axios.patch(path, data, getAxiosConfig(config));',
    'Shared axios PATCH helper must use the PATCH HTTP verb',
  );
  assertNotIncludes(
    axiosClient,
    'const PATCH = (path: string, data: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse> =>\n    axios.post(path, data, getAxiosConfig(config));',
    'Shared axios PATCH helper must not route PATCH through POST',
  );
  assertIncludes(
    productionReadinessAudit,
    'Shared axios PATCH verb checkpoint:',
    'Production readiness audit shared axios PATCH verb checkpoint',
  );
  assertIncludes(
    changelog,
    'Shared Axios PATCH Verb Boundary',
    'Changelog shared axios PATCH verb boundary',
  );
}

function verifyMenuListStorageBucketFallbackBoundary() {
  const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const bucketResolutionFiles = [
    'src/lib/firebase/firebaseClient.ts',
    'src/lib/apiUtils/index.ts',
    'src/lib/menu-extraction/menuIntakeIdentityServer.ts',
    'functions/src/logic/processMenuImages.ts',
    'functions/src/logic/processMenuImagesJob.ts',
    'functions/src/messagingOnboarding/assetIntelligence.ts',
  ];

  for (const file of bucketResolutionFiles) {
    const content = read(file);
    assertNotIncludes(content, 'menulist-qa.appspot.com', `${file} must not fallback to the QA Storage bucket`);
    assertNotIncludes(content, 'DEFAULT_STORAGE_BUCKET', `${file} must not keep a hardcoded Storage bucket fallback`);
  }

  [
    'src/lib/apiUtils/index.ts',
    'src/lib/menu-extraction/menuIntakeIdentityServer.ts',
    'functions/src/logic/processMenuImages.ts',
    'functions/src/logic/processMenuImagesJob.ts',
    'functions/src/messagingOnboarding/assetIntelligence.ts',
  ].forEach((file) => {
    const content = read(file);
    assertIncludes(content, 'function getProjectStorageBucketFallback()', `${file} project-derived Storage bucket fallback`);
    assertIncludes(content, 'process.env.FIREBASE_STORAGE_BUCKET', `${file} server Storage bucket env`);
    assertIncludes(content, 'process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', `${file} public Storage bucket env`);
    assertIncludes(content, 'process.env.GCLOUD_PROJECT', `${file} active Firebase project fallback`);
    assertIncludes(content, 'process.env.GCP_PROJECT', `${file} active GCP project fallback`);
    assertIncludes(content, 'process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID', `${file} public Firebase project fallback`);
  });

  const firebaseClient = read('src/lib/firebase/firebaseClient.ts');
  assertIncludes(
    firebaseClient,
    'const firebaseStorageUrl = firebaseConfig.storageBucket\n    ? `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o`\n    : \'\';',
    'Firebase client Storage URL must fail closed when Storage bucket config is absent',
  );
  assertIncludes(
    productionReadinessAudit,
    'MenuList Storage bucket fallback checkpoint:',
    'Production readiness audit MenuList Storage bucket fallback checkpoint',
  );
  assertIncludes(
    changelog,
    'MenuList Storage Bucket Fallback Boundary',
    'Changelog MenuList Storage bucket fallback boundary',
  );
}

function verifyEnvironmentTargets() {
  const {
    DEPLOYMENT_TARGETS,
    getExpectedFirebaseProjectId,
    getProductDeploymentTarget,
  } = require('../../src/constants/deploymentTargets');
  const {
    ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX,
    ANSWERLATTICE_PRODUCTION_DOMAINS,
    ANSWERLATTICE_STAGING_DOMAINS,
  } = require('../../src/constants/answerlattice/domains');
  const productDomains = read('src/constants/productDomains.ts');
  const urls = read('src/constants/urls.ts');
  const envValidation = read('src/lib/env/validateEnv.ts');
  const middleware = read('src/proxy.ts');
  const deploymentTargets = read('src/constants/deploymentTargets.ts');
  const productIds = read('src/constants/product.ts');
  const myCodexAuth = read('src/lib/mycodex/auth.ts');
  const myCodexDocs = read('src/lib/mycodex/docs.ts');
  const publicApiAuth = read('src/lib/publicApi/auth.ts');
  const widgetConfigRoute = read('src/app/api/widget/config/route.ts');
  const widgetSearchRoute = read('src/app/api/widget/search/route.ts');
  const widgetFeedbackRoute = read('src/app/api/widget/feedback/route.ts');
  const predictiveHelpRoute = read('src/app/api/answerlattice/predictive-help/route.ts');
  const publicMenuRoute = read('src/app/api/public/v1/menu/route.ts');
  const publicBusinessRoute = read('src/app/api/public/v1/business/route.ts');
  const searchCore = read('src/lib/search/searchCore.ts');
  const sessionScope = read('src/lib/answerlattice/sessionScope.ts');
  const activeSession = read('src/lib/auth/getActiveSession.ts');
  const helpCenterSearchRoute = read('src/app/api/helpCenter/search-kb/route.ts');
  const documentComposer = read('src/lib/answerlattice/documentComposer.ts');
  const answerlatticeDashboardLayout = read('src/components/answerlattice/AnswerlatticeDashboardLayout.tsx');
  const setClaimsRoute = read('src/app/api/auth/set-claims/route.ts');
  const envStagingExample = read('.env.staging.example');
  const envProductionExample = read('.env.production.example');
  const functionsQaEnv = read('functions/.env.menulist-qa');
  const functionsProductionEnv = read('functions/.env.menulist');
  const functionsQaEnvExample = read('functions/.env.menulist-qa.example');
  const functionsProductionEnvExample = read('functions/.env.menulist.example');
  const productSetupDoc = read('__docs__/deployment/three-product-environment-setup.md');
  const menulistStagingQaSetup = read('__docs__/deployment/menulist-staging-qa-setup.md');
  const initialAccountSetupGuide = read('__docs__/deployment/initial-account-domain-firebase-setup-guide.md');
  const deploymentReadme = read('__docs__/deployment/README.md');
  const menulistRulesPredeployRunner = read('scripts/verification/run-menulist-firebase-rules-predeploy.mjs');
  const urlRoutingArchitecture = read('__docs__/url-routing-architecture/url-routing-architecture_impl.md');
  const productionDeploymentChecklist = read('__docs__/deployment/production-deployment-checklist.md');
  const launchPrerequisites = read('__docs__/production-readiness/launch-prerequisites.md');
  const productionReadinessReadme = read('__docs__/production-readiness/README.md');
  const devProdEnvironmentGuide = read('__docs__/production-readiness/dev-prod-environment-guide.md');
  const incidentResponseRunbook = read('__docs__/production-readiness/incident-response-runbook.md');
  const productionCertificationRunbook = read('__docs__/production-readiness/external-certification-runbook.md');
  const customerPwaOfflineHarness = read('scripts/verification/verify-customer-pwa-offline.mjs');
  const customerAppTest = read('__docs__/customer-app/customer-app_test.md');
  const razorpaySandboxReadiness = read('scripts/verification/verify-razorpay-sandbox-readiness.mjs');
  const safeModeRuntime = read('src/lib/ops/safeMode.ts');
  const productionReadinessLocalRunner = read('scripts/verification/run-production-readiness-local.js');
  const publicBusinessTruthVerifier = read('scripts/verification/verify-public-business-truth.js');
  const featureSweepMasterReport = read('FEATURE_SWEEP_MASTER_REPORT.md');
  const productionTestingGuide = read('__docs__/production-testing-guide.md');
  const rootDocsReadme = read('__docs__/README.md');
  const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const projectsReadme = read('__docs__/projects/README.md');
  const projectsOverview = read('__docs__/projects/00-overview.md');
  const projectsUtilities = read('__docs__/projects/14-utilities.md');
  const projectsOwnerDashboard = read('__docs__/projects/owner-dashboard.md');
  const projectsEditorReadme = read('__docs__/projects/editor/README.md');
  const projectsEditorAutoSaveDoc = read('__docs__/projects/editor/07-auto-save.md');
  const uploadFileProcessingReadme = read('__docs__/projects/upload-file-processing/README.md');
  const uploadFileProcessingFirebase = read('__docs__/projects/upload-file-processing/upload-file-processing_firebase.md');
  const uploadFileProcessingWebsite = read('__docs__/projects/upload-file-processing/upload-file-processing_website.md');
  const uploadFileProcessingMarketing = read('__docs__/projects/upload-file-processing/upload-file-processing_marketing.md');
  const aiDataExtractionMarketing = read('__docs__/projects/ai-data-extraction/ai-data-extraction_marketing.md');
  const aiDataExtractionWebsite = read('__docs__/projects/ai-data-extraction/ai-data-extraction_website.md');
  const aiSystemLayerWebsite = read('__docs__/ai-system-layer/ai-system-layer_website.md');
  const b2bViewFirebase = read('__docs__/projects/b2b-view/b2b-view_firebase.md');
  const projectsProductionReadinessAssessment = read('__docs__/projects/production-readiness-assessment.md');
  const projectsTestingChecklist = read('__docs__/projects/testing-checklist.md');
  const projectsMiscellaneousTask = read('__docs__/projects/miscellaneous-task.md');
  const mainWebsiteReadme = read('__docs__/main-website/README.md');
  const mobilePwaAnalysis = read('__docs__/mobile-operational-support/08-full-pwa-mobile-analysis.md');
  const trustSecurityPageDoc = read('__docs__/features/trust-security-page.md');
  const profileModalRedesignDoc = read('__docs__/features/profile-modal-redesign.md');
  const networkStatusMonitoringDoc = read('__docs__/features/network-status-monitoring.md');
  const authCompleteGuide = read('__docs__/auth/authentication-complete-guide.md');
  const authReadme = read('__docs__/auth/README.md');
  const authFirebaseDoc = read('__docs__/auth/auth_firebase.md');
  const firebaseAuthSyncDoc = read('__docs__/auth/firebase-auth-sync.md');
  const firebaseAuthNullFixDoc = read('__docs__/auth/firebase-auth-null-fix.md');
  const authOnboardingReadme = read('__docs__/auth-onboarding/README.md');
  const authOnboardingSpec = read('__docs__/auth-onboarding/auth-onboarding_spec.md');
  const authOnboardingImpl = read('__docs__/auth-onboarding/auth-onboarding_impl.md');
  const authOnboardingFirebase = read('__docs__/auth-onboarding/auth-onboarding_firebase.md');
  const authOnboardingMobileSupport = read('__docs__/auth-onboarding/auth-onboarding_mobile-support.md');
  const onboardingCentralizationReadme = read('__docs__/onboarding-centralization/README.md');
  const onboardingUserIdBoundary = read('src/lib/onboarding/onboardingUserId.ts');
  const ponrOnboardingSpec = read('__docs__/onboarding/ponr-onboarding_spec.md');
  const businessTypeDataModelReadme = read('__docs__/business-type-data-model/README.md');
  const clientMenuReadme = read('__docs__/client-menu/README.md');
  const clientMenuSpec = read('__docs__/client-menu/_spec.md');
  const clientMenuImpl = read('__docs__/client-menu/_impl.md');
  const clientMenuMarketing = read('__docs__/client-menu/_marketing.md');
  const clientMenuFirebase = read('__docs__/client-menu/client-menu_firebase.md');
  const clientMenuAutosellFirebase = read('__docs__/client-menu/autosell-features/autosell-features_firebase.md');
  const clientMenuAnalyticsFirebase = read('__docs__/client-menu/analytics-tracking/analytics-tracking_firebase.md');
  const b2cMenuLayoutConstitution = read('__docs__/projects/menu-editor/b2c-menu-layout-constitution-implementation.md');
  const physicalSurfacesSpec = read('__docs__/physical-surfaces/physical-surfaces_spec.md');
  const menuEditorPhase4Advanced = read('__docs__/projects/menu-editor/phase-4-advanced.md');
  const b2cViewReadme = read('__docs__/projects/b2c-view/README.md');
  const b2cViewSpec = read('__docs__/projects/b2c-view/b2c-view_spec.md');
  const b2cViewImpl = read('__docs__/projects/b2c-view/b2c-view_impl.md');
  const b2cViewMarketing = read('__docs__/projects/b2c-view/b2c-view_marketing.md');
  const b2cViewAssessment = read('__docs__/projects/assessments/assessment-11-b2c-view.md');
  const descriptionGenerationReadme = read('__docs__/projects/description-generation/README.md');
  const descriptionGenerationSpec = read('__docs__/projects/description-generation/description-generation_spec.md');
  const descriptionGenerationImpl = read('__docs__/projects/description-generation/description-generation_impl.md');
  const descriptionGenerationFirebase = read('__docs__/projects/description-generation/description-generation_firebase.md');
  const descriptionGenerationWebsite = read('__docs__/projects/description-generation/description-generation_website.md');
  const descriptionGenerationMarketing = read('__docs__/projects/description-generation/description-generation_marketing.md');
  const descriptionGenerationHelpdoc = read('__docs__/projects/description-generation/description-generation_helpdoc.md');
  const descriptionGenerationProductionAudit = read('__docs__/projects/description-generation/description-generation_production-audit.md');
  const descriptionGenerationAssessment = read('__docs__/projects/assessments/assessment-09-description-generation.md');
  const multiLanguageTranslationReadme = read('__docs__/projects/multi-language-translation/README.md');
  const multiLanguageTranslationSpec = read('__docs__/projects/multi-language-translation/multi-language-translation_spec.md');
  const multiLanguageTranslationImpl = read('__docs__/projects/multi-language-translation/multi-language-translation_impl.md');
  const multiLanguageTranslationWebsite = read('__docs__/projects/multi-language-translation/multi-language-translation_website.md');
  const multiLanguageTranslationMarketing = read('__docs__/projects/multi-language-translation/multi-language-translation_marketing.md');
  const dataEditorReadme = read('__docs__/projects/data-editor/README.md');
  const dataEditorSpec = read('__docs__/projects/data-editor/data-editor_spec.md');
  const dataEditorImpl = read('__docs__/projects/data-editor/data-editor_impl.md');
  const dataEditorFirebase = read('__docs__/projects/data-editor/data-editor_firebase.md');
  const dataEditorMarketing = read('__docs__/projects/data-editor/data-editor_marketing.md');
  const dataEditorAssessment = read('__docs__/projects/assessments/assessment-03-editor.md');
  const socialContentReadme = read('__docs__/social-content/README.md');
  const socialContentImpl = read('__docs__/social-content/social-content_impl.md');
  const socialContentStrategy = read('__docs__/social-content/social-content-product-strategy.md');
  const socialContentCodeReview = read('__docs__/social-content/social-content_code-review.md');
  const socialContentValidation = read('__docs__/social-content/social-content_validation.md');
  const socialContentLogicVerification = read('__docs__/social-content/social-content_logic-verification.md');
  const menuCommandCenterValidation = read('__docs__/menu-command-center/menu-command-center_validation.md');
  const itemPhotoCaptureAssistValidation = read('__docs__/item-photo-capture-assist/item-photo-capture-assist_validation.md');
  const itemPhotoCaptureAssistMobile = read('__docs__/item-photo-capture-assist/item-photo-capture-assist_mobile-support.md');
  const posWebhookSyncImpl = read('__docs__/pos-webhook-sync/pos-webhook-sync_impl.md');
  const decisionIntelligenceReadme = read('__docs__/decision-intelligence/README.md');
  const decisionIntelligenceSpec = read('__docs__/decision-intelligence/decision-intelligence_spec.md');
  const decisionIntelligenceImpl = read('__docs__/decision-intelligence/decision-intelligence_impl.md');
  const decisionIntelligenceFirebase = read('__docs__/decision-intelligence/decision-intelligence_firebase.md');
  const decisionIntelligenceMarketing = read('__docs__/decision-intelligence/decision-intelligence_marketing.md');
  const decisionIntelligenceLogicVerification = read('__docs__/decision-intelligence/decision-intelligence_logic-verification.md');
  const storesManagementFirebase = read('__docs__/stores-management/stores-management_firebase.md');
  const systemStrengtheningFirebase = read('__docs__/system-strengthening/system-strengthening_firebase.md');
  const networkStatusHook = read('src/hooks/useNetworkStatus.ts');
  const networkStatusProvider = read('src/providers/NetworkStatusProvider.tsx');
  const layoutWrapper = read('src/components/antdComponent/layoutWrapper/index.tsx');
  const campaignCueLayout = read('src/app/(campaigncue)/layout.tsx');
  const authIndex = read('src/lib/auth/index.ts');
  const onboardingCreateSubscriptionRoute = read('src/app/api/onboarding/create-subscription/route.ts');
  const onboardingCreateTenantStore = read('src/lib/onboarding/createTenantStore.ts');
  const storeTypeSource = read('src/types/platform/store.ts');
  const businessTypesSharedSource = read('src/data/shared/businessTypes.ts');
  const businessTypesFunctionsSource = read('functions/src/sharedData/businessTypes.ts');
  const businessTypeMigrationScript = read('scripts/migrate-business-type-swap.ts');
  const paymentHandlerHook = read('src/hooks/usePaymentHandler.ts');
  const razorpayVerifySubscriptionRoute = read('src/app/api/razorpay/verify-subscription/route.ts');
  const productBillingServer = read('src/lib/billing/productBillingServer.ts');
  const editorMain = read('src/components/templates/main-app/projects/editorView/Editor.tsx');
  const editorContent = read('src/components/templates/main-app/projects/editorView/EditorContent.tsx');
  const editorActionsPopover = read('src/components/templates/main-app/projects/editorView/EditorActionsPopover.tsx');
  const editorShortcutsConfig = read('src/components/templates/main-app/projects/editorView/editorShortcuts.config.ts');
  const editorKeyboardShortcutsHook = read('src/components/templates/main-app/projects/editorView/hooks/useEditorKeyboardShortcuts.ts');
  const editorLogicHook = read('src/components/templates/main-app/projects/editorView/hooks/useEditorLogic.ts');
  const editorFileImagePreview = read('src/components/templates/main-app/projects/editorView/components/FileImagePreview.tsx');
  const editorAdvancedView = read('src/components/templates/main-app/projects/editorView/views/AdvancedView.tsx');
  const editorTraditionalView = read('src/components/templates/main-app/projects/editorView/views/TraditionalView.tsx');
  const editorFocusView = read('src/components/templates/main-app/projects/editorView/views/FocusView.tsx');
  const comprehensiveSecurityAudit = read('__docs__/security/comprehensive-security-audit.md');
  const opsInfrastructureGuide = read('__docs__/ops-infrastructure-guide.md');
  const opsAlertingDeliveryImpl = read('__docs__/ops-alerting-delivery/ops-alerting-delivery_impl.md');
  const opsAlertingDeliveryFirebase = read('__docs__/ops-alerting-delivery/ops-alerting-delivery_firebase.md');
  const mobileOwnerMenuVerifier = read('scripts/verification/verify-mobile-owner-menu.mjs');
  const functionsSecrets = read('functions/src/config/secrets.ts');
  const functionsEnvSetup = read('functions/src/envSetup.md');
  const messagingOnboardingImpl = read('__docs__/messaging-onboarding/messaging-onboarding_impl.md');
  const messagingOnboardingReadme = read('__docs__/messaging-onboarding/README.md');
  const messagingOnboardingSpec = read('__docs__/messaging-onboarding/messaging-onboarding_spec.md');
  const messagingOnboardingFirebase = read('__docs__/messaging-onboarding/messaging-onboarding_firebase.md');
  const messagingOnboardingValidation = read('__docs__/messaging-onboarding/messaging-onboarding_validation.md');
  const messagingOnboardingRunbook = read('__docs__/messaging-onboarding/messaging-onboarding_runbook.md');
  const ownerActionItems = read('__docs__/owner-action-items.md');
  const menulistSignalDeskValidation = read('__docs__/menulist-signaldesk/menulist-signaldesk_validation.md');
  const nightlySchedulerArchitecture = read('__docs__/patterns/nightly-scheduler-architecture.md');
  const continuousMenuIntelligenceReadme = read('__docs__/continuous-menu-intelligence/README.md');
  const continuousMenuIntelligenceImpl = read('__docs__/continuous-menu-intelligence/continuous-menu-intelligence_impl.md');
  const continuousMenuIntelligenceFirebase = read('__docs__/continuous-menu-intelligence/continuous-menu-intelligence_firebase.md');
  const continuousMenuIntelligenceValidation = read('__docs__/continuous-menu-intelligence/continuous-menu-intelligence_validation.md');
  const continuousMenuIntelligenceLogicVerification = read('__docs__/continuous-menu-intelligence/continuous-menu-intelligence_logic-verification.md');
  const projectsDatabase = read('src/database/projects/index.ts');
  const publicClientCache = read('src/lib/cache/publicClientCache.ts');
  const pricingIntegrityEngine = read('src/lib/pricing/integrityEngine.ts');
  const pricingPdfQueue = read('src/lib/pricing/pdfQueue.ts');
  const projectShareModal = read('src/components/templates/main-app/projects/b2cView/shareModal/index.tsx');
  const menuPdfGenerator = read('src/lib/export/menuPdfGenerator.ts');
  const pricingIntegrityReadme = read('__docs__/pricing-integrity-system/README.md');
  const pricingIntegritySpec = read('__docs__/pricing-integrity-system/pricing-integrity-system_spec.md');
  const pricingIntegrityImpl = read('__docs__/pricing-integrity-system/pricing-integrity-system_impl.md');
  const pricingIntegrityFirebase = read('__docs__/pricing-integrity-system/pricing-integrity-system_firebase.md');
  const pricingIntegrityMobile = read('__docs__/pricing-integrity-system/pricing-integrity-system_mobile-support.md');
  const pricingIntegrityWebsite = read('__docs__/pricing-integrity-system/pricing-integrity-system_website.md');
  const pricingIntegrityHelpdoc = read('__docs__/pricing-integrity-system/pricing-integrity-system_helpdoc.md');
  const pricingIntegrityMarketing = read('__docs__/pricing-integrity-system/pricing-integrity-system_marketing.md');
  const pricingIntegrityValidation = read('__docs__/pricing-integrity-system/pricing-integrity-system_validation.md');
  const hoursHolidayAccuracyValidation = read('__docs__/hours-holiday-accuracy/hours-holiday-accuracy_validation.md');
  const molV0ImplementationPlan = read('__docs__/internal-tracking/mol-v0-implementation-plan.md');
  const customerAppFirebase = read('__docs__/customer-app/customer-app_firebase.md');
  const creativeEditorTemplateRegistryValidation = read('__docs__/creative-editor-template-registry/creative-editor-template-registry_validation.md');
  const maintenanceTasks = read('__docs__/maintenance-tasks.md');
  const securityAuthenticationGuide = read('__docs__/security/authentication/complete-guide.md');
  const securityEmailValidationGuide = read('__docs__/security/email-validation/complete-guide.md');
  const securityAppCheckGuide = read('__docs__/security/app-check/complete-guide.md');
  const securityPaymentAnalysis = read('__docs__/security/payment-security/payment-security-analysis.md');
  const securityObjectSanitizationPattern = read('__docs__/security/object-sanitization-pattern.md');
  const securityFirebaseCost = read('__docs__/security/security_firebase.md');
  const securityLoginSourceTracking = read('__docs__/security/login-source-tracking.md');
  const securityFileUploadGuide = read('__docs__/security/file-upload/file-upload-security.md');
  const securityWebhookGuide = read('__docs__/security/webhook/webhook-security.md');
  const securityMonitoringGuide = read('__docs__/security/monitoring/complete-guide.md');
  const securityCorsGuide = read('__docs__/security/cors/cors-implementation.md');
  const securityCorsComplete = read('__docs__/security/cors/cors-implementation-complete.md');
  const securityApiStatus = read('__docs__/security/api-security/api-security-status.md');
  const securityOwaspImplementation = read('__docs__/security/owasp/owasp-security-implementation.md');
  const internalFeedbackReadme = read('__docs__/projects/internal-feedback-system/README.md');
  const internalFeedbackValidation = read('__docs__/projects/internal-feedback-system/internal-feedback-system_validation.md');
  const internalFeedbackVerification = read('__docs__/projects/internal-feedback-system/internal-feedback-system_verification.md');
  const multiLanguageTranslationVerification = read('__docs__/projects/multi-language-translation/multi-language-translation_verification.md');
  const multiLanguageTranslationAssessment = read('__docs__/projects/assessments/assessment-13-multi-language-translation.md');
  const projectsUploadAssessment = read('__docs__/projects/assessments/assessment-01-upload.md');
  const projectsAiExtractionAssessment = read('__docs__/projects/assessments/assessment-02-ai-extraction.md');
  const projectsPerformanceAssessment = read('__docs__/projects/assessments/assessment-04-performance.md');
  const projectsSecurityAssessment = read('__docs__/projects/assessments/assessment-05-security.md');
  const projectsUxAssessment = read('__docs__/projects/assessments/assessment-06-ux-usability.md');
  const projectsAiImageGenerationAssessment = read('__docs__/projects/assessments/assessment-07-ai-image-generation.md');
  const projectsImageEditingAssessment = read('__docs__/projects/assessments/assessment-08-image-editing.md');
  const projectsB2bViewAssessment = read('__docs__/projects/assessments/assessment-10-b2b-view.md');
  const projectsManagementAssessment = read('__docs__/projects/assessments/assessment-12-project-management.md');
  const menuJobQueueAssessment = read('__docs__/projects/assessments/menu-job-queue-implementation.md');
  const serverSideDataProcessingArchitecture = read('__docs__/projects/assessments/server-side-data-processing-architecture.md');
  const developmentDoneReadme = read('__docs__/projects/development_done/README.md');
  const developmentDoneUploadImpl = read('__docs__/projects/development_done/1-implementation-upload-complete.md');
  const developmentDoneUploadCrossCheck = read('__docs__/projects/development_done/1-cross-check-upload.md');
  const uploadTestingGuide = read('__docs__/projects/development_done/1-testing-guide-upload.md');
  const developmentDoneAiExtractionImpl = read('__docs__/projects/development_done/2-implementation-ai-extraction-complete.md');
  const editorCompletionDevelopmentNote = read('__docs__/projects/development_done/3-implementation-editor-complete.md');
  const developmentDoneSecuritySummary = read('__docs__/projects/development_done/5-implementation-summary.md');
  const developmentDoneSecurityImpl = read('__docs__/projects/development_done/5-security-implementation-complete.md');
  const aiExtractionTestingGuide = read('__docs__/projects/development_done/2-testing-guide-ai-extraction.md');
  const aiMenuManagerValidation = read('__docs__/ai-menu-manager/ai-menu-manager_validation.md');
  const growthOsAddonFirebase = read('__docs__/growthos-addon/growthos-addon_firebase.md');
  const growthOsAddonValidation = read('__docs__/growthos-addon/growthos-addon_validation.md');
  const costSelfProtectionReadme = read('__docs__/cost-self-protection/README.md');
  const costSelfProtectionAudit = read('__docs__/cost-self-protection/firebase-cost-optimization-audit-2026-05-16.md');
  const fiveYearVision = read('__docs__/strategy/five-year-vision-2026-complete.md');
  const menulistCompleteFeatureSpec = read('__docs__/strategy/menulist-complete-feature-spec.md');
  const productUniverseSsot = read('__docs__/strategy/product-universe-ssot.md');
  const menulistFutureRoadmap = read('__docs__/strategy/menulist-future-roadmap-ssot.md');
  const productStrategy2026 = read('__docs__/strategy/product-strategy-2026.md');
  const productStrategyMarketResearch = read('__docs__/strategy/product-strategy-market-research.md');
  const futureIdeasBucketList = read('__docs__/strategy/future-ideas-bucket-list.md');
  const answerlatticeActionItems = read('__docs__/answerlattice/doctrine/10-implementation-action-items.md');
  const answerlatticeMultiProductTenancy = read('__docs__/answerlattice/doctrine/07-multi-product-tenancy.md');
  const answerlatticeProductSeparation = read('__docs__/answerlattice/doctrine/08-product-separation-playbook.md');
  const menuExtractionPipelineFirebase = read('__docs__/menu-extraction-pipeline/menu-extraction-pipeline_firebase.md');
  const menuHealthMonitorFirebase = read('__docs__/menu-health-monitor/menu-health-monitor_firebase.md');
  const mapsPlaceCheckValidation = read('__docs__/menulist-tools/maps-place-check/maps-place-check_validation.md');
  const aiDataExtractionImpl = read('__docs__/projects/ai-data-extraction/ai-data-extraction_impl.md');
  const aiDataExtractionFinalAudit = read('__docs__/projects/ai-data-extraction/final-production-readiness-audit.md');
  const aiDataExtractionProductionAudit = read('__docs__/projects/ai-data-extraction/production-audit-mar13-2026.md');
  const aiDataExtractionCfExecutionAudit = read('__docs__/projects/ai-data-extraction/cf-execution-audit-mar13-2026.md');
  const aiExtractionMonitoringSpec = read('__docs__/ai-extraction-monitoring/ai-extraction-monitoring_spec.md');
  const aiExtractionMonitoringImpl = read('__docs__/ai-extraction-monitoring/ai-extraction-monitoring_impl.md');
  const aiExtractionFeatureFlags = read('src/config/features.ts');
  const aiExtractionMobileMonitor = read('src/components/mobile/screens/MobileExtractionMonitorScreen.tsx');
  const aiExtractionMobileShell = read('src/components/mobile/MobileShell.tsx');
  const aiExtractionFirestoreRules = read('firestore.rules');
  const menuExtractionPipelineVerifier = read('scripts/verification/verify-menu-extraction-pipeline.js');
  const menuLinkImportValidation = read('__docs__/menu-link-import/menu-link-import_validation.md');
  const codexAnswerlatticeRules = read('.codex/rules/ANSWERLATTICE_RULES.md');
  const cascadeAnswerlatticeRules = read('.cascade/rules/ANSWERLATTICE_RULES.md');
  const rootPackageJson = JSON.parse(read('package.json'));
  const functionsPackageJson = JSON.parse(read('functions/package.json'));
  const rootTsconfig = JSON.parse(read('tsconfig.json'));
  const firebaserc = JSON.parse(read('.firebaserc'));
  const answerlatticeFunctionsPackage = JSON.parse(read('functions-answerlattice/package.json'));

  assert(DEPLOYMENT_TARGETS.local.menulist.url === 'http://localhost:3000/', 'Local MenuList URL must be localhost root');
  assert(DEPLOYMENT_TARGETS.local.neelvara.url === 'http://localhost:3000/__neelvara/', 'Local Neelvara URL must be /__neelvara');
  assert(DEPLOYMENT_TARGETS.local.answerlattice.url === 'http://localhost:3000/__answerlattice/', 'Local Answerlattice URL must be /__answerlattice');
  assert(DEPLOYMENT_TARGETS.local.campaigncue.url === 'http://localhost:3000/__campaigncue/', 'Local CampaignCue URL must be /__campaigncue');
  assert(DEPLOYMENT_TARGETS.local.mycodex.url === 'http://localhost:3000/__mycodex/', 'Local MyCodex URL must be /__mycodex');
  assert(getProductDeploymentTarget('neelvara', 'local').devPathPrefix === '/__neelvara', 'Local Neelvara dev prefix must be /__neelvara');
  assert(getProductDeploymentTarget('answerlattice', 'local').devPathPrefix === '/__answerlattice', 'Local Answerlattice dev prefix must be /__answerlattice');
  assert(getProductDeploymentTarget('campaigncue', 'local').devPathPrefix === '/__campaigncue', 'Local CampaignCue dev prefix must be /__campaigncue');
  assert(getProductDeploymentTarget('mycodex', 'local').devPathPrefix === '/__mycodex', 'Local MyCodex dev prefix must be /__mycodex');
  assert(getExpectedFirebaseProjectId('menulist', 'local') === 'menulist-qa', 'Local MenuList Firebase project must be menulist-qa');
  assert(getExpectedFirebaseProjectId('neelvara', 'local') === '', 'Local Neelvara must not require a Firebase project');
  assert(getExpectedFirebaseProjectId('answerlattice', 'local') === 'answerlattice-qa', 'Local Answerlattice Firebase project must be answerlattice-qa');
  assert(getExpectedFirebaseProjectId('campaigncue', 'local') === 'campaigncue-qa', 'Local CampaignCue Firebase project must be campaigncue-qa');
  assert(getExpectedFirebaseProjectId('mycodex', 'local') === '', 'Local MyCodex must not require a Firebase project');

  assert(DEPLOYMENT_TARGETS.preview.menulist.domains.includes('menulist.digital'), 'Preview MenuList domain must include menulist.digital staging website apex');
  assert(DEPLOYMENT_TARGETS.preview.menulist.domains.includes('www.menulist.digital'), 'Preview MenuList domain must include www.menulist.digital staging website alias');
  assert(DEPLOYMENT_TARGETS.preview.menulist.domains.includes('app.menulist.digital'), 'Preview MenuList domain must include app.menulist.digital owner app');
  assert(DEPLOYMENT_TARGETS.preview.menulist.ownerAppDomain === 'app.menulist.digital', 'Preview MenuList owner app must use app.menulist.digital');
  assert(DEPLOYMENT_TARGETS.preview.menulist.tenantDomains.includes('menulist.digital'), 'Preview MenuList tenant domain must use menulist.digital');
  assert(!(DEPLOYMENT_TARGETS.preview.menulist.redirectDomains || []).includes('menulist.digital'), 'Preview MenuList digital apex must be a staging website alias, not a redirect domain');
  assert(DEPLOYMENT_TARGETS.preview.neelvara.domains.includes('neelvara.menulist.online'), 'Preview Neelvara domain must include neelvara.menulist.online');
  assert(DEPLOYMENT_TARGETS.preview.answerlattice.domains.includes('answerlattice.menulist.online'), 'Preview Answerlattice domain must include answerlattice.menulist.online');
  assert(DEPLOYMENT_TARGETS.preview.campaigncue.domains.includes('campaigncue.menulist.online'), 'Preview CampaignCue domain must include campaigncue.menulist.online');
  assert(DEPLOYMENT_TARGETS.preview.signaldesk.domains.includes('signaldesk.menulist.online'), 'Preview SignalDesk domain must include signaldesk.menulist.online');
  assert(DEPLOYMENT_TARGETS.preview.mycodex.domains.length === 0, 'Preview MyCodex must not require a public domain');
  assert(getExpectedFirebaseProjectId('menulist', 'preview') === 'menulist-qa', 'Preview MenuList Firebase project must be menulist-qa');
  assert(getExpectedFirebaseProjectId('neelvara', 'preview') === '', 'Preview Neelvara must not require a Firebase project');
  assert(getExpectedFirebaseProjectId('answerlattice', 'preview') === 'answerlattice-qa', 'Preview Answerlattice Firebase project must be answerlattice-qa');
  assert(getExpectedFirebaseProjectId('campaigncue', 'preview') === 'campaigncue-qa', 'Preview CampaignCue Firebase project must be campaigncue-qa');
  assert(getExpectedFirebaseProjectId('mycodex', 'preview') === '', 'Preview MyCodex must not require a Firebase project');

  assert(DEPLOYMENT_TARGETS.production.menulist.domains.includes('menulist.ai'), 'Production MenuList domain must include menulist.ai');
  assert(DEPLOYMENT_TARGETS.production.menulist.domains.includes('app.menulist.ai'), 'Production MenuList owner app domain must include app.menulist.ai');
  assert(DEPLOYMENT_TARGETS.production.menulist.ownerAppDomain === 'app.menulist.ai', 'Production MenuList owner app must use app.menulist.ai');
  assert(DEPLOYMENT_TARGETS.production.menulist.tenantDomains.includes('menulist.online'), 'Production MenuList tenant domain must use menulist.online');
  assert(DEPLOYMENT_TARGETS.production.menulist.redirectDomains.includes('menulist.online'), 'Production MenuList online apex redirect domain');
  assert(!DEPLOYMENT_TARGETS.production.menulist.redirectDomains.includes('menulist.digital'), 'Production MenuList must not use menulist.digital as a redirect domain');
  assert(DEPLOYMENT_TARGETS.production.neelvara.domains.includes('neelvara.com'), 'Production Neelvara domain must include neelvara.com');
  assert(DEPLOYMENT_TARGETS.production.answerlattice.domains.includes('answerlattice.com'), 'Production Answerlattice domain must include answerlattice.com');
  assert(DEPLOYMENT_TARGETS.production.campaigncue.domains.includes('campaigncue.ai'), 'Production CampaignCue domain must include campaigncue.ai');
  assert(DEPLOYMENT_TARGETS.production.signaldesk.domains.includes('signaldesk.menulist.online'), 'Production SignalDesk domain must use signaldesk.menulist.online');
  assert(DEPLOYMENT_TARGETS.production.mycodex.domains.length === 0, 'Production MyCodex must not require a public domain');
  assert(getExpectedFirebaseProjectId('menulist', 'production') === 'menulist', 'Production MenuList Firebase project must be menulist');
  assert(getExpectedFirebaseProjectId('neelvara', 'production') === '', 'Production Neelvara must not require a Firebase project');
  assert(getExpectedFirebaseProjectId('answerlattice', 'production') === 'answerlattice', 'Production Answerlattice Firebase project must be answerlattice');
  assert(getExpectedFirebaseProjectId('campaigncue', 'production') === 'campaigncue', 'Production CampaignCue Firebase project must be campaigncue');
  assert(getExpectedFirebaseProjectId('mycodex', 'production') === '', 'Production MyCodex must not require a Firebase project');

  assert(ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX === '/__answerlattice', 'Answerlattice local dev prefix constant');
  assert(ANSWERLATTICE_STAGING_DOMAINS.includes('answerlattice.menulist.online'), 'Answerlattice staging domain constant');
  assert(ANSWERLATTICE_PRODUCTION_DOMAINS.includes('answerlattice.com'), 'Answerlattice production domain constant');
  assertIncludes(productDomains, "getActiveProductDomains('answerlattice')", 'Product domain registry');
  assertIncludes(productDomains, "getActiveProductDomains('menulist')", 'Product domain registry');
  assertIncludes(productDomains, "getActiveProductDomains('mycodex')", 'Product domain registry');
  assertIncludes(productDomains, 'Route/domain product slug, not the two-character pId code.', 'Product domain registry slug boundary');
  assertIncludes(productIds, "MYCODEX: 'MC'", 'MyCodex internal product code');
  assertIncludes(myCodexAuth, 'MYCODEX_PRODUCT_CODE = PRODUCT_IDS.MYCODEX', 'MyCodex product code boundary');
  assertIncludes(myCodexAuth, "MYCODEX_PRODUCT_SLUG = 'mycodex'", 'MyCodex product slug boundary');
  assertIncludes(myCodexAuth, 'product: MYCODEX_PRODUCT_SLUG', 'MyCodex session uses route slug');
  assertNotIncludes(myCodexAuth, 'product: MYCODEX_PRODUCT_CODE', 'MyCodex session must not use pId code');
  assertNotIncludes(myCodexDocs, 'firebase', 'MyCodex docs loader must not import Firebase');
  assertNotIncludes(myCodexDocs, 'firestore', 'MyCodex docs loader must not import Firestore');
  assertIncludes(urls, 'QA: menulist.digital + www', 'Platform URL staging website contract');
  assertIncludes(urls, 'QA: app.menulist.digital', 'Platform URL staging owner app contract');
  assertIncludes(urls, '{subdomain}.menulist.digital', 'MenuList QA tenant URL domain contract');
  assertIncludes(urls, '{subdomain}.menulist.online', 'MenuList production tenant URL domain contract');
  assertIncludes(urls, 'QA: answerlattice.menulist.online', 'Platform URL domain contract');
  assertIncludes(envValidation, 'getExpectedFirebaseProjectId', 'Environment validation');
  assertIncludes(envValidation, "'WHATSAPP_PHONE_NUMBER_ID'", 'Environment validation WhatsApp provider prerequisite warnings');
  assertIncludes(envValidation, "'WHATSAPP_ACCESS_TOKEN'", 'Environment validation WhatsApp provider prerequisite warnings');
  assertIncludes(envValidation, "'WHATSAPP_APP_SECRET'", 'Environment validation WhatsApp provider prerequisite warnings');
  assertIncludes(envValidation, "'WHATSAPP_VERIFY_TOKEN'", 'Environment validation WhatsApp provider prerequisite warnings');
  assertIncludes(deploymentTargets, 'resolveKnownProductIdByHostname', 'Deployment target helper');
  assertIncludes(middleware, 'resolveKnownProductIdByHostname', 'Inactive product-domain redirect guard');
  assertIncludes(middleware, 'NextResponse.redirect(url, 308)', 'Inactive product-domain redirect guard');
  assertIncludes(publicApiAuth, 'shouldUseAnswerlatticeDb', 'Answerlattice public API auth boundary');
  assertIncludes(publicApiAuth, 'answerlatticeFirestoreAdmin', 'Answerlattice public API auth boundary');
  assertIncludes(publicApiAuth, 'Answerlattice API key validation failed closed', 'Answerlattice public API auth boundary');
  assertIncludes(widgetConfigRoute, 'includePublicApi: false', 'Answerlattice widget config auth boundary');
  assertIncludes(widgetSearchRoute, 'includePublicApi: false', 'Answerlattice widget search auth boundary');
  assertIncludes(widgetFeedbackRoute, 'includePublicApi: false', 'Answerlattice widget feedback auth boundary');
  assertIncludes(predictiveHelpRoute, 'includePublicApi: false', 'Answerlattice predictive help auth boundary');
  assertIncludes(publicMenuRoute, "startsWith('ml_')", 'MenuList public menu auth boundary');
  assertIncludes(publicBusinessRoute, "startsWith('ml_')", 'MenuList public business auth boundary');
  assertNotIncludes(searchCore, '/v0/b/menulist-qa.appspot.com/o', 'Answerlattice search storage boundary');
  assertIncludes(searchCore, 'NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET', 'Answerlattice search storage boundary');
  assertIncludes(sessionScope, 'isAnswerlatticeSupportClientRoute', 'MenuList Answerlattice client support route boundary');
  assertIncludes(activeSession, 'shouldUseAnswerlatticeClientScopeForRoute', 'MenuList Answerlattice client session boundary');
  assertIncludes(helpCenterSearchRoute, 'const answerlatticeScope = resolveAnswerlatticeSessionScope(session);', 'MenuList Help Center Answerlattice search scope admission');
  assertIncludes(helpCenterSearchRoute, 'const searchSession = getAnswerlatticeScopedSession(session);', 'MenuList Help Center Answerlattice scoped session projection');
  assertNotIncludes(helpCenterSearchRoute, 'isAnswerlatticeSupportClientRoute', 'MenuList Help Center server route must not depend on browser pathname classification');
  assertIncludes(documentComposer, 'sessionSourceContext?.tId', 'Answerlattice source context preservation boundary');
  assertIncludes(answerlatticeDashboardLayout, 'ensureFirebaseAuthForSession', 'Answerlattice dashboard Firebase Auth sync boundary');
  assertIncludes(setClaimsRoute, 'hasDefaultPlatformAccess', 'Answerlattice platform auth sync boundary');
  assert(firebaserc.projects['menulist-qa'] === 'menulist-qa', '.firebaserc MenuList QA alias');
  assert(firebaserc.projects['menulist-prod'] === 'menulist', '.firebaserc MenuList production alias');
  assert(firebaserc.projects['answerlattice-qa'] === 'answerlattice-qa', '.firebaserc Answerlattice QA alias');
  assert(firebaserc.projects['answerlattice-prod'] === 'answerlattice', '.firebaserc Answerlattice production alias');
  assert(firebaserc.projects['campaigncue-qa'] === 'campaigncue-qa', '.firebaserc CampaignCue QA alias');
  assert(firebaserc.projects['campaigncue-prod'] === 'campaigncue', '.firebaserc CampaignCue production alias');
  assert(exists('firebase-campaigncue.json'), 'CampaignCue Firebase deploy config must exist');
  assertIncludes(read('firebase-campaigncue.json'), 'firestore-campaigncue.rules', 'CampaignCue Firebase config');
  assertIncludes(read('firebase-campaigncue.json'), 'storage-campaigncue.rules', 'CampaignCue Firebase config');
  for (const [label, content] of [
    ['Staging env template', envStagingExample],
    ['Production env template', envProductionExample],
  ]) {
    assertIncludes(content, 'MENULIST_FIREBASE_PROJECT_ID', `${label} canonical MenuList Firebase env naming`);
    assertIncludes(content, 'MENULIST_FIREBASE_API_KEY=', `${label} canonical MenuList server Firebase API key`);
    assertIncludes(content, 'NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID', `${label} canonical public MenuList Firebase env naming`);
    assertIncludes(content, 'MENULIST_GEMINI_AI_KEY', `${label} canonical MenuList Gemini env naming`);
    assertIncludes(content, 'MENULIST_RAZORPAY_KEY_ID', `${label} canonical MenuList Razorpay env naming`);
    assertIncludes(content, 'MENULIST_UPSTASH_REDIS_REST_URL', `${label} canonical MenuList Upstash env naming`);
    assertIncludes(content, 'ANSWERLATTICE_FIREBASE_PROJECT_ID', `${label} product env-key naming`);
    assertIncludes(content, 'CAMPAIGNCUE_FIREBASE_PROJECT_ID', `${label} product env-key naming`);
    assertIncludes(content, 'SIGNALDESK_FIREBASE_PROJECT_ID', `${label} SignalDesk env-key naming`);
    assertIncludes(content, 'MYCODEX_BASIC_AUTH_USER', `${label} MyCodex static auth env`);
    assertIncludes(content, 'MYCODEX_BASIC_AUTH_PASSWORD', `${label} MyCodex static auth env`);
    assertIncludes(content, 'MYCODEX_SESSION_SECRET', `${label} MyCodex static auth env`);
    assertIncludes(content, 'WHATSAPP_ACCESS_TOKEN', `${label} WhatsApp provider env naming`);
    assertIncludes(content, 'FIREBASE_PROJECT_ID=', `${label} Cloud Tasks project id prerequisite`);
    assertIncludes(content, 'FIREBASE_API_KEY=', `${label} current MenuList server Firebase API key alias`);
    assertIncludes(content, 'FIREBASE_PROJECT_LOCATION=us-central1', `${label} Cloud Tasks queue location prerequisite`);
    assertIncludes(content, 'Uses FIREBASE_PROJECT_ID and FIREBASE_PROJECT_LOCATION above to build the queue path.', `${label} Cloud Tasks project/location note`);
    assertIncludes(content, 'BATCH_IMAGE_GENERATION_WORKER_URL', `${label} Cloud Tasks worker URL prerequisite`);
    assertIncludes(content, 'BATCH_IMAGE_GENERATION_QUEUE_ID', `${label} Cloud Tasks queue id prerequisite`);
    assertIncludes(content, 'BATCH_IMAGE_GENERATION_WORKER_SECRET', `${label} Cloud Tasks worker secret prerequisite`);
    assertIncludes(content, 'ENABLE_MESSAGING_ONBOARDING=false', `${label} messaging onboarding provider processing must fail closed`);
    assertNotIncludes(content, 'WHATSAPP_API_TOKEN', `${label} must not use stale WhatsApp API token env naming`);
    assertNotIncludes(content, 'MENULIST_SIGNALDESK_', `${label} must not use stale MenuList-prefixed SignalDesk env keys`);
    assertNotIncludes(content, 'NEXT_PUBLIC_MENULIST_SIGNALDESK_', `${label} must not use stale public MenuList-prefixed SignalDesk env keys`);
    assertNotIncludes(content, 'NEXT_PUBLIC_AL_', `${label} must not use shorthand Answerlattice env keys`);
    assertNotIncludes(content, 'AL_FIREBASE_PROJECT_ID', `${label} must not use shorthand Answerlattice env keys`);
    assertNotIncludes(content, 'NEXT_PUBLIC_CC_', `${label} must not use shorthand CampaignCue env keys`);
    assertNotIncludes(content, 'CC_FIREBASE_PROJECT_ID', `${label} must not use shorthand CampaignCue env keys`);
    assertNotIncludes(content, 'NEXT_PUBLIC_MYCODEX_FIREBASE_PROJECT_ID', `${label} must not define MyCodex Firebase env keys`);
    assertNotIncludes(content, 'MYCODEX_FIREBASE_PROJECT_ID', `${label} must not define MyCodex Firebase env keys`);
    assertNotIncludes(content, 'NEXT_PUBLIC_MC_', `${label} must not use shorthand MyCodex env keys`);
    assertNotIncludes(content, 'MC_FIREBASE_PROJECT_ID', `${label} must not use shorthand MyCodex env keys`);
  }
  assertIncludes(productSetupDoc, 'Use full product names in environment variable keys', 'Product setup doc env-key naming contract');
  assert(rootPackageJson.scripts['verify:menulist-firebase-rules-predeploy'] === 'node scripts/verification/run-menulist-firebase-rules-predeploy.mjs', 'Root package must expose the MenuList Firebase rules predeploy gate');
  assertIncludes(menulistRulesPredeployRunner, "name.includes('rules')", 'MenuList Firebase rules predeploy direct rule-script discovery');
  assertIncludes(menulistRulesPredeployRunner, "command.includes('firebase emulators:exec')", 'MenuList Firebase rules predeploy emulator boundary');
  assertIncludes(menulistRulesPredeployRunner, "command.includes('--project demo-')", 'MenuList Firebase rules predeploy demo-project boundary');
  assertIncludes(menulistRulesPredeployRunner, "'firestore.rules': config.firestore?.rules", 'MenuList Firebase rules predeploy Firestore source wiring');
  assertIncludes(menulistRulesPredeployRunner, "'firestore.indexes.json': config.firestore?.indexes", 'MenuList Firebase rules predeploy index source wiring');
  assertIncludes(menulistRulesPredeployRunner, "'storage.rules': config.storage?.rules", 'MenuList Firebase rules predeploy Storage source wiring');
  assertIncludes(menulistStagingQaSetup, 'npm run verify:menulist-firebase-rules-predeploy', 'MenuList QA setup local rules predeploy gate');
  assertIncludes(menulistStagingQaSetup, 'firebase deploy --project menulist-qa --config firebase.json --only firestore:rules,firestore:indexes,storage --non-interactive', 'MenuList QA setup fresh rules/indexes/Storage deploy');
  assertIncludes(menulistStagingQaSetup, "firebase firestore:indexes --project menulist-qa --database '(default)'", 'MenuList QA setup deployed index readback');
  assertIncludes(menulistStagingQaSetup, 'Do not use Admin SDK,', 'MenuList QA setup Admin SDK rule-proof rejection');
  assertIncludes(menulistStagingQaSetup, 'Hard stop if any prohibited operation succeeds or any expected own-tenant', 'MenuList QA setup deployed rule-smoke stop condition');
  assertIncludes(menulistStagingQaSetup, 'Browser access to `geminiSpendWindows/menulist`', 'MenuList QA setup server-only spend-window smoke');
  assertIncludes(menulistStagingQaSetup, 'The maintained apex-wildcard setup uses Vercel nameservers.', 'MenuList QA setup wildcard DNS authority');
  assertIncludes(menulistStagingQaSetup, 'Assign every entry to the exact Git branch `staging`', 'MenuList QA setup exact Vercel staging branch');
  assertIncludes(menulistStagingQaSetup, 'Firestore and Storage both report `us-central1`', 'MenuList QA setup immutable Firebase resource locations');
  assertIncludes(menulistStagingQaSetup, 'never create fake secret values', 'MenuList QA setup declared Function secret binding guard');
  assertIncludes(menulistStagingQaSetup, 'No deployable env contains a template marker', 'MenuList QA setup unresolved env placeholder guard');
  assertIncludes(initialAccountSetupGuide, 'A `firestore:rules`-only command from a', 'Initial account setup fresh-project Firebase rule boundary');
  assertIncludes(productSetupDoc, 'Every product/environment must complete this lifecycle independently:', 'Product setup independent Firebase rule lifecycle');
  assertIncludes(deploymentReadme, 'Firebase rule emulator/deploy/readback/authenticated-smoke gates', 'Deployment README MenuList QA rule-gate summary');
  assertIncludes(deploymentReadme, '**Launch boundary:** Not current launch certification or deploy approval.', 'Deployment README top launch/deploy boundary');
  assertIncludes(deploymentReadme, 'current release approval requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.', 'Deployment README current release approval evidence boundary');
  assertIncludes(productSetupDoc, 'Launch boundary: not current launch certification or deploy approval.', 'Product setup doc top launch/deploy boundary');
  assertIncludes(productSetupDoc, 'production deployment approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.', 'Product setup doc current release approval evidence boundary');
  assertIncludes(productSetupDoc, 'CampaignCue uses `CC` as its internal product code and `campaigncue` as its runtime product slug', 'Product setup doc CampaignCue product-code boundary');
  assertIncludes(productSetupDoc, 'MyCodex uses `MC` as its reserved internal product code and `mycodex` as its runtime product slug', 'Product setup doc MyCodex product-code boundary');
  assert(
    productSetupDoc.indexOf('| Optional webhooks |') < productSetupDoc.indexOf('Firebase Admin credential and local ADC diagnostics'),
    'Product setup doc environment variable table must stay contiguous before diagnostic notes',
  );
  assertIncludes(productSetupDoc, '| Cloud Tasks | `FIREBASE_PROJECT_ID`, `FIREBASE_PROJECT_LOCATION`, `BATCH_IMAGE_GENERATION_WORKER_URL`, `BATCH_IMAGE_GENERATION_QUEUE_ID`, `BATCH_IMAGE_GENERATION_WORKER_SECRET` | Google Cloud Tasks |', 'Product setup doc Cloud Tasks readiness variables');
  assertIncludes(productSetupDoc, 'Do not substitute a retired legacy MenuList project', 'Product setup doc active Firebase target guard');
  assertIncludes(productSetupDoc, 'Do not reuse the older command shape from that attempt; the current scoped retry command is listed in the owner action register below.', 'Product setup doc historical MenuList QA deploy boundary');
  assertIncludes(productSetupDoc, 'npm --prefix functions run deploy:menulist-qa', 'Product setup doc latest MenuList QA function deploy command');
  assertIncludes(productSetupDoc, 'HTTP Error: 403, The caller does not have permission.', 'Product setup doc latest Cloud Resource Manager blocker');
  assertNotIncludes(productSetupDoc, 'firebase deploy --only functions:menulistMaintenanceScheduler --project menulist-qa --config firebase.json', 'Product setup doc stale MenuList QA deploy command shape');
  assert(rootPackageJson.scripts.typecheck === 'tsc --noEmit --incremental false --pretty false', 'Root package must expose an incremental-safe typecheck script');
  assert(
    rootPackageJson.scripts['build:verify'] === 'npm run verify:next-build-compatibility && npm run typecheck && npm run lint',
    'Root build:verify must guard the Next deployment configuration before typecheck and flat-config lint',
  );
  assert(rootTsconfig.compilerOptions?.tsBuildInfoFile === '.next/cache/tsconfig.tsbuildinfo', 'Root TypeScript build-info cache must stay under ignored .next/cache');
  assert(
    rootPackageJson.scripts['verify:mycodex-pwa-assets']
      === 'node scripts/verification/verify-mycodex-pwa-assets.js && npm run test:mycodex-auth-boundary',
    'Root package must expose the MyCodex PWA static and auth boundary verifier',
  );
  assert(rootPackageJson.scripts['verify:signaldesk-security-rules'] === 'node scripts/verification/verify-signaldesk-security-rules.js', 'Root package must expose the SignalDesk security rules static verifier');
  const recycleBinVerifier = read('scripts/verification/verify-recycle-bin.js');
  const verificationReadme = read('scripts/verification/README.md');
  assertIncludes(recycleBinVerifier, 'recycle-bin source gate passed', 'Recycle-bin verifier source-gate output');
  assertIncludes(recycleBinVerifier, 'Not covered: authenticated browser smoke, visual QA, live Firestore reads/writes, Firebase deploy, Vercel deploy, or production-host behavior.', 'Recycle-bin verifier local-only proof boundary');
  assertNotIncludes(recycleBinVerifier, 'Ready for manual testing', 'Recycle-bin verifier must not imply aggregate readiness for manual QA');
  assertNotIncludes(recycleBinVerifier, 'Start dev server: npm run dev', 'Recycle-bin verifier must not print dev-server manual QA instructions');
  assertIncludes(productionReadinessLocalRunner, 'local source gate only; does not run Next.js production build, Firebase deploy, Vercel deploy, provider smoke, browser/device QA, live Firestore/Storage writes, or production-host behavior.', 'Local readiness runner aggregate proof boundary');
  assertIncludes(productionReadinessLocalRunner, '[local-readiness] boundary:', 'Local readiness runner must print boundary before checks');
  assertIncludes(productionReadinessLocalRunner, '[local-readiness-summary] boundary:', 'Local readiness runner must print boundary in summary');
  assertIncludes(productionReadinessLocalRunner, "process.argv.slice(2).includes('--list')", 'Local readiness runner must expose list-only mode');
  assertIncludes(productionReadinessLocalRunner, '[local-readiness-list]', 'Local readiness runner must print a list-only section');
  assertIncludes(productionReadinessLocalRunner, 'formatCommand(check.command, check.args)', 'Local readiness runner list mode must print the child command');
  assertIncludes(productionReadinessLocalRunner, 'process.exit(0);', 'Local readiness runner list mode must exit before running checks');
  assertIncludes(productionReadinessLocalRunner, "const SELF_SCRIPT = 'verify:production-readiness-local';", 'Local readiness runner must name its self-recursion guard');
  assertIncludes(productionReadinessLocalRunner, 'Object.keys(packageJson.scripts || {})', 'Local readiness runner must derive root verify scripts from package.json');
  assertIncludes(productionReadinessLocalRunner, ".filter((name) => name.startsWith('verify:') && name !== SELF_SCRIPT)", 'Local readiness runner must include every root verify script except itself');
  assertIncludes(productionReadinessLocalRunner, '...verifyScripts.map((scriptName) => ({', 'Local readiness runner must map child verify scripts into checks');
  assertIncludes(productionReadinessLocalRunner, "args: ['run', scriptName]", 'Local readiness runner must execute child verify scripts through npm');
  assertIncludes(productionReadinessLocalRunner, "args: ['run', 'docs:check-links']", 'Local readiness runner must include documentation link health');
  assertIncludes(productionReadinessLocalRunner, "args: ['run', 'typecheck']", 'Local readiness runner must use root typecheck script');
  assertNotIncludes(productionReadinessLocalRunner, "args: ['tsc', '--noEmit'", 'Local readiness runner must not bypass root typecheck script');
  assertIncludes(productionReadinessLocalRunner, "args: ['run', 'lint']", 'Local readiness runner must include root lint');
  assertIncludes(productionReadinessLocalRunner, "args: ['diff', '--check']", 'Local readiness runner must include whitespace diff hygiene');
  assertIncludes(productionReadinessLocalRunner, 'delete environment.GOOGLE_APPLICATION_CREDENTIALS;', 'Local readiness runner must isolate demo emulator checks from inherited Google credentials');
  assertIncludes(productionReadinessLocalRunner, 'env: getLocalReadinessEnvironment()', 'Local readiness runner must use the isolated local-check environment');
  assertIncludes(publicBusinessTruthVerifier, 'function verifyStoreUpdatesRequireAcknowledgement()', 'Public business truth verifier generic store-update acknowledgement gate');
  assertIncludes(publicBusinessTruthVerifier, 'Every src updateStore() call must require assertStoreUpdateSucceeded()', 'Public business truth verifier generic store-update failure copy');
  assertIncludes(verificationReadme, 'Explicit local source-gate scope and the browser/cloud/deploy gates it does not prove', 'Verification README recycle-bin source-gate output boundary');
  assertIncludes(verificationReadme, 'Prints the local-only boundary so a green aggregate is not mistaken for browser QA, provider smoke, deploy, or production-host certification', 'Verification README aggregate source-gate output boundary');
  assertNotIncludes(verificationReadme, 'Next steps for manual testing', 'Verification README recycle-bin stale manual-testing output');
  assertIncludes(featureSweepMasterReport, '`npm run verify:recycle-bin` | Passed | 6 passed; source gate only, with browser/cloud/deploy/production-host gates explicitly not covered', 'Feature sweep report recycle-bin source-gate boundary');
  assertNotIncludes(featureSweepMasterReport, '`npm run verify:recycle-bin` | Passed | 6 passed, manual testing still required', 'Feature sweep report stale recycle-bin manual-testing wording');
  assertIncludes(productionCertificationRunbook, 'Latest local boundary evidence on July 11, 2026: `npm run verify:production-readiness-local` passed with 98/98 checks, including 94 child root `verify:*` scripts.', 'Production certification runbook historical passing aggregate count');
  assertIncludes(productionCertificationRunbook, 'Current local boundary evidence on August 1, 2026: a complete `npm run verify:production-readiness-local` replay finished with 178/179 checks passing, including all 175 child root `verify:*` scripts plus documentation links, root typecheck, lint, and `git diff --check`.', 'Production certification runbook current aggregate result');
  assertIncludes(productionCertificationRunbook, 'The only non-pass is `verify:upstash-readiness`, which exited with its dedicated status `2` because this shell has no admissible Upstash URL/token; the aggregate classified that exact no-credential state as `BLOCKED_EXTERNAL` and continued through every remaining gate.', 'Production certification runbook exact external blocker classification');
  assertIncludes(productionCertificationRunbook, 'This proves the current local source boundary only. It does not prove Upstash reachability, authenticated browser/device behavior, provider behavior, Firebase or Vercel deployment, live Firestore/Storage effects, production-host behavior, launch approval, or release certification.', 'Production certification runbook current local-only proof boundary');
  assertIncludes(productionCertificationRunbook, 'The aggregate includes Answerlattice runtime truth, the public menu rate-limit fail-closed gate, Owner Action Layer source gate, CampaignCue operating-loop verification, dependency freeze verifier, System Strengthening SS-1 through SS-9, production-testing-guide launch-boundary guard, recycle-bin source-gate output boundary, customer PWA source-contract coverage, and documentation health with 0 broken links and 0 naming violations.', 'Production certification runbook latest local aggregate evidence coverage');
  assertIncludes(productionCertificationRunbook, 'The aggregate runner prints its own local-only boundary, supports `npm run verify:production-readiness-local -- --list` for a no-execution gate inventory, and uses the root `npm run typecheck` script; `npm run build:verify` first guards the Next deployment configuration and frozen Firebase Admin dependency chain, then runs the same typecheck and lint scripts, so green output cannot be mistaken for authenticated browser/manual QA or deploy certification.', 'Production certification runbook latest aggregate source-gate boundary');
  assertIncludes(productionCertificationRunbook, '**Launch boundary:** Not current launch certification or deploy approval.', 'Production certification runbook top launch/deploy boundary');
  assertIncludes(productionCertificationRunbook, 'This runbook defines the external evidence required before launch; it does not pass any gate without recorded target evidence, explicit deploy approval where relevant, provider/browser/device QA, and production-host smoke.', 'Production certification runbook top current evidence boundary');
  assertIncludes(productionCertificationRunbook, 'Historical authenticated evidence remains relevant but is not the current operator state: the default package-local scoped set was last retried on July 9 with `npm --prefix functions run deploy:menulist-qa`', 'Production certification runbook default Functions retry date and current-operator boundary');
  assertIncludes(productionCertificationRunbook, 'The July 11 shared AI-gateway 13-target subset above reached the same pre-upload blocker after configured lint/build.', 'Production certification runbook AI-gateway Functions subset blocker');
  assertIncludes(productionCertificationRunbook, 'Current blocker refreshed July 11, 2026: `npm run verify:storage-paths` passed, and `npm run verify:production-readiness-local` includes `verify:storage-paths` and passes with 98/98 checks', 'Production certification runbook historical Storage blocker local evidence');
  assertIncludes(productionCertificationRunbook, 'The latest scoped retry remains the July 9 command', 'Production certification runbook Storage deploy attempt date boundary');
  assertIncludes(productionCertificationRunbook, 'These five syntax checks prove only that the external-only harness files still load as JavaScript modules.', 'Production certification runbook external harness inventory count');
  assertIncludes(productionCertificationRunbook, 'node --check scripts/verification/verify-razorpay-sandbox-readiness.mjs', 'Production certification runbook Razorpay external harness syntax inventory');
  assertNotIncludes(productionCertificationRunbook, 'Latest local boundary evidence on July 9, 2026:', 'Production certification runbook stale current aggregate date');
  assertNotIncludes(productionCertificationRunbook, 'Current blocker refreshed July 9, 2026: local readiness now passes with 95/95 checks.', 'Production certification runbook stale Functions current baseline');
  assertIncludes(productionReadinessAudit, 'Tools Hub route-count source-gate checkpoint:', 'Production readiness audit Tools Hub route-count source-gate checkpoint');
  assertIncludes(productionReadinessAudit, 'The Tools Hub runtime registry currently exposes 21 public tool routes', 'Production readiness audit Tools Hub current route count evidence');
  assertIncludes(changelog, 'Tools Hub docs use the current tool count', 'Changelog Tools Hub current route count entry');
  assertIncludes(productionReadinessAudit, 'Answerlattice website integrations readiness wording checkpoint:', 'Production readiness audit Answerlattice website readiness wording checkpoint');
  assertIncludes(changelog, 'Answerlattice website integrations wording stays source-verified', 'Changelog Answerlattice website readiness wording entry');
  assertIncludes(productionReadinessAudit, 'Current local production-readiness boundary refresh: after the customer-worker contract smoke, Answerlattice read-only Support Assistant reconciliation, atomic menu-presence projection coverage, external-certification ledger refresh, CampaignCue operating-loop registry addition, and concurrent source-gate reconciliation, `npm run verify:production-readiness-local` passed 98/98 checks across 94 child root `verify:*` scripts plus docs links, root typecheck, lint, and `git diff --check`.', 'Production readiness audit historical local aggregate refresh scope');
  assertIncludes(productionReadinessAudit, 'External certification runbook local-boundary evidence checkpoint: refreshed in docs/source gate on July 11, 2026.', 'Production readiness audit current runbook baseline checkpoint');
  assertIncludes(changelog, 'External Certification Ledger Baseline Refresh', 'Changelog external certification ledger refresh');
  assertIncludes(productionReadinessAudit, 'The latest `npm run docs:check-links` run passed with 0 broken links and 0 naming violations.', 'Production readiness audit latest docs health evidence');
  assertIncludes(verificationReadme, 'npm run verify:production-readiness-local -- --list', 'Verification README must document local readiness list mode');
  assertIncludes(urlRoutingArchitecture, '| Preview     | `https://menulist.digital`', 'URL routing architecture current MenuList preview URL');
  assertIncludes(urlRoutingArchitecture, '`menulist.digital`, `www.menulist.digital`, `app.menulist.digital`, `*.menulist.digital`', 'URL routing architecture current MenuList staging domains');
  assertNotIncludes(urlRoutingArchitecture, '| Preview     | `https://menulist-ai.vercel.app`', 'URL routing architecture stale MenuList preview Vercel URL');
  assertIncludes(productionReadinessReadme, 'External Certification Runbook', 'Production readiness checklist external certification link');
  assertIncludes(productionReadinessReadme, '[MenuList Incident Response Runbook](./incident-response-runbook.md)', 'Production readiness checklist incident response runbook link');
  assertIncludes(productionReadinessReadme, '**Launch boundary:** Not current launch certification or deploy approval.', 'Production readiness checklist top launch/deploy boundary');
  assertIncludes(productionReadinessReadme, 'the current launch verdict still requires External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.', 'Production readiness checklist top current evidence boundary');
  assertIncludes(
    productionReadinessReadme,
    'Status meaning: ✅ means the repository, static configuration, or documented platform capability is currently confirmed for that row.',
    'Production readiness checklist status semantics boundary',
  );
  assertIncludes(
    productionReadinessReadme,
    'It does not override missing deploy, provider, browser/device, owner-controlled setup, or production-host evidence.',
    'Production readiness checklist status semantics external evidence boundary',
  );
  assertIncludes(productionReadinessReadme, '## Current External Certification Snapshot (July 11, 2026)', 'Production readiness checklist current external gate snapshot');
  assertIncludes(productionReadinessReadme, 'local source boundary passes', 'Production readiness checklist current local aggregate evidence');
  assertIncludes(productionReadinessReadme, 'but this is not launch approval', 'Production readiness checklist local-versus-launch boundary');
  assertIncludes(productionReadinessReadme, '| Gate 3 True mobile/browser QA | Blocked | The local loopback customer-worker smoke passed with only `/offline` cached and no stale menu, while the owner harness covers Today, Menu, Share, More, MobileShell containment, screenshots, overflow/clipping, active state, and 44x44px targets. Production worker registration/install, an eligible owner fixture, authenticated owner-shell execution, and real-device QA remain pending. |', 'Production readiness checklist mobile/browser current gate snapshot');
  assertIncludes(productionReadinessReadme, '| Gate 4 Razorpay sandbox smoke | Partial only | The maintained read-only preflight passes for payments, orders, plans, and subscriptions plus synthetic raw-body webhook signature validation; full checkout, payment verification, real webhook delivery, compensation, top-up, reseller, state-parity, and no-real-charge smoke remains pending. |', 'Production readiness checklist Razorpay current gate snapshot');
  assertIncludes(productionReadinessReadme, '| Gate 5 WhatsApp provider smoke | Blocked | Checked local/functions dotenv files keep messaging onboarding absent or disabled and contain no WhatsApp provider secrets; non-production Meta app, secrets, deployed webhook, registration, and target enablement remain pending. |', 'Production readiness checklist WhatsApp current gate snapshot');
  assertIncludes(productionReadinessReadme, '| Gate 6 POS webhook provider smoke | Blocked | `npm run verify:pos-sync-boundary` passes, but controlled public HTTPS receiver, receiver-side signature verification, test delivery, publish delivery, failed-endpoint evidence, and secret-rotation proof remain pending. |', 'Production readiness checklist POS current gate snapshot');
  assertIncludes(productionReadinessReadme, '| Gate 7 Batch image worker | Blocked | Root `.env` has project/location/queue/HTTPS worker URL but lacks `BATCH_IMAGE_GENERATION_WORKER_SECRET`; worker deploy, captured queue dispatch/retry/backoff policy, and controlled Cloud Tasks enqueue/worker smoke remain pending. |', 'Production readiness checklist batch worker current gate snapshot');
  assertIncludes(productionReadinessReadme, '| Gate 8 Production host smoke | Blocked | Vercel deploy, production-host smoke, production env verification, custom-domain routing, CDN behavior, and production Firebase access require explicit owner approval and evidence. |', 'Production readiness checklist production host current gate snapshot');
  assertIncludes(productionReadinessReadme, 'Do not convert this table into ✅ status until the corresponding runbook gate has pass evidence recorded in `__docs__/audits/menulist-production-readiness-audit.md`.', 'Production readiness checklist current gate snapshot status guard');
  assertIncludes(productionReadinessReadme, '| 1.55 | July 9, 2026 | Clarified checklist status semantics:', 'Production readiness checklist status semantics version history');
  assertIncludes(productionReadinessReadme, '| 1.57 | July 11, 2026 | Expanded the authenticated owner-shell harness', 'Production readiness checklist mobile harness version history');
  assertIncludes(productionReadinessReadme, '| 1.58 | July 11, 2026 | Replaced the ad-hoc Razorpay credential probe', 'Production readiness checklist Razorpay preflight version history');
  assertIncludes(productionReadinessReadme, '| 1.59 | July 11, 2026 | Corrected six externally dependent checklist rows:', 'Production readiness checklist external-evidence truth version history');
  assertIncludes(productionReadinessReadme, '| 1.60 | July 11, 2026 | Recorded a passing local loopback customer-worker smoke', 'Production readiness checklist customer-worker evidence version history');
  assertIncludes(productionReadinessReadme, '| 1.61 | July 11, 2026 | Refreshed the External Certification Runbook to the verified 98/98 local boundary', 'Production readiness checklist external ledger refresh version history');
  assertIncludes(productionReadinessReadme, '| 1.54 | July 9, 2026 | Added the current external certification snapshot:', 'Production readiness checklist current snapshot version history');
  assertIncludes(productionReadinessReadme, '| CDN caching active for public pages | ☐ | Source cache headers and Vercel-compatible cache policy exist; Gate 8 must verify production response headers, cache hits, invalidation, and CDN behavior. |', 'Production readiness checklist CDN external evidence boundary');
  assertIncludes(productionReadinessReadme, '| SSL auto-renewal | ☐ | Vercel-managed certificates are expected only after the production custom domain is active; Gate 8 must verify the certificate chain and renewal state. |', 'Production readiness checklist TLS renewal external evidence boundary');
  assertIncludes(productionReadinessReadme, '| Rate limiting active (Upstash) | ☐ | Atomic sliding-window logic, bounded timeout/circuit breaker, and fail-closed expensive/mutation paths are source-gated by `npm run verify:provider-resilience`. Run `npm run verify:upstash-readiness` with target credentials and confirm Marketplace origin in the Upstash console. |', 'Production readiness checklist Upstash external evidence boundary');
  assertIncludes(productionReadinessReadme, '| Sentry configured (prod project) | ☐ | Source integration and production env templates exist; the production DSN, release/source-map association, and captured test event still need target verification. |', 'Production readiness checklist Sentry external evidence boundary');
  assertIncludes(productionReadinessReadme, '| HTTPS enforced | ☐ | Middleware configures HSTS for production responses, but Gate 8 must verify production HTTP-to-HTTPS behavior, TLS, and the delivered HSTS header. |', 'Production readiness checklist HTTPS external evidence boundary');
  assertIncludes(productionReadinessReadme, '| Customer app shows an offline fallback without cached menu content | ☐ | A July 11 local loopback smoke manually registered the development worker, severed the harness proxy upstream, rendered `/offline`, and found no cached menu content. Production registration/install and physical-device airplane-mode evidence still need Gate 3/Gate 8 verification. |', 'Production readiness checklist offline PWA external evidence boundary');
  assertNotIncludes(productionReadinessReadme, '| CDN caching active for public pages | ✅ |', 'Production readiness checklist stale certified CDN claim');
  assertNotIncludes(productionReadinessReadme, '| SSL auto-renewal | ✅ |', 'Production readiness checklist stale certified TLS renewal claim');
  assertNotIncludes(productionReadinessReadme, '| Rate limiting active (Upstash) | ✅ |', 'Production readiness checklist stale certified Upstash claim');
  assertNotIncludes(productionReadinessReadme, '| Sentry configured (prod project) | ✅ |', 'Production readiness checklist stale certified Sentry claim');
  assertNotIncludes(productionReadinessReadme, '| HTTPS enforced | ✅ |', 'Production readiness checklist stale certified HTTPS claim');
  assertNotIncludes(productionReadinessReadme, '| Menu works offline (CDN cached) | ✅ |', 'Production readiness checklist stale certified offline-menu claim');
  assertNotIncludes(productionReadinessReadme, '| Menu works offline (PWA cached) |', 'Production readiness checklist must not imply cached menu content');
  assert(
    rootPackageJson.scripts?.['smoke:customer-pwa-offline'] === 'node scripts/verification/verify-customer-pwa-offline.mjs',
    'Root package must expose the customer PWA offline browser smoke',
  );
  [
    "const tenantHostname = process.env.CUSTOMER_PWA_QA_TENANT_HOST || 'habibis.menulist.digital';",
    "const upstreamUrl = new URL(process.env.CUSTOMER_PWA_QA_UPSTREAM_URL || 'http://127.0.0.1:3000');",
    'function createLoopbackTenantProxy()',
    'tenantProxy.setOffline(true);',
    "await navigator.serviceWorker.register('/sw-customer.js', { scope: '/' });",
    "caches.open('customer-app-offline-v1')",
    "const offlineUrl = new URL('/offline', baseUrl).href;",
    "boundary: 'local_loopback_customer_worker_contract_only'",
    'productionRegistrationCertified: false',
    'pwaInstallCertified: false',
    'realDeviceCertified: false',
    'menuContentCached: !offlineCacheIsOfflineOnly',
  ].forEach((token) => assertIncludes(customerPwaOfflineHarness, token, 'Customer PWA offline browser harness'));
  assertNotIncludes(customerPwaOfflineHarness, 'Network.emulateNetworkConditions', 'Customer PWA offline harness deprecated CDP network emulation');
  assertNotIncludes(customerPwaOfflineHarness, 'Network.emulateNetworkConditionsByRule', 'Customer PWA offline harness CDP network emulation');
  assertIncludes(productionCertificationRunbook, 'harness-owned loopback tenant proxy', 'Production certification runbook customer PWA proxy contract');
  assertIncludes(productionCertificationRunbook, 'This proves the local loopback customer-worker contract only.', 'Production certification runbook customer PWA local-only boundary');
  assertNotIncludes(productionCertificationRunbook, 'after network emulation goes offline', 'Production certification runbook stale customer PWA network-emulation description');
  assertIncludes(customerAppTest, 'Local Customer-Worker Browser Smoke', 'Customer App customer-worker smoke guide');
  assertIncludes(customerAppTest, 'Keep the installed-device airplane-mode step below open', 'Customer App physical-device boundary');
  assertIncludes(productionReadinessAudit, 'External Certification Gate 3 Local Customer-Worker Offline Evidence - July 11, 2026', 'Production readiness audit customer PWA local evidence');
  assertIncludes(productionReadinessAudit, 'menuContentCached: false', 'Production readiness audit customer PWA no-menu-cache evidence');
  assertIncludes(changelog, 'Local Customer-Worker Offline Contract Evidence', 'Changelog customer PWA local evidence');
  assertIncludes(productionReadinessReadme, 'Firebase Functions deploy evidence captured', 'Production readiness checklist Functions deploy evidence wording');
  assertIncludes(productionReadinessReadme, 'run `npm run verify:functions-deploy-preflight` before the scoped Firebase deploy retry', 'Production readiness checklist scoped Functions deploy preflight');
  assertIncludes(productionReadinessReadme, 'latest scheduler-only retry on July 15 used `firebase deploy --project menulist-qa --config firebase.json --only functions:menulistMaintenanceScheduler --non-interactive`, completed predeploy lint/build', 'Production readiness checklist latest Functions deploy blocker evidence');
  assertIncludes(productionReadinessReadme, 'Firebase Storage rules cutover deployed', 'Production readiness checklist Storage deploy evidence wording');
  assertIncludes(productionReadinessReadme, 'Gate 2A in [External Certification Runbook](./external-certification-runbook.md): `npm run verify:storage-paths` passes, but the latest scoped `menulist-qa` deploy failed before rules upload while checking/enabling `firebasestorage.googleapis.com` with Service Usage HTTP 403 project access/availability blocker', 'Production readiness checklist Storage deploy blocker evidence');
  assertIncludes(productionReadinessReadme, 'firebase deploy --only firestore:indexes --project menulist-qa --config firebase.json', 'Production readiness checklist scoped QA index deploy command');
  assertIncludes(productionReadinessReadme, 'firebase deploy --only firestore:rules --project menulist-qa --config firebase.json', 'Production readiness checklist scoped QA rules deploy command');
  assertIncludes(productionReadinessReadme, 'production rules deploy requires QA evidence and explicit production approval', 'Production readiness checklist production rules approval gate');
  assertIncludes(productionReadinessReadme, 'Every [External Certification Runbook](./external-certification-runbook.md) gate has evidence recorded in `__docs__/audits/menulist-production-readiness-audit.md`', 'Production readiness checklist launch verdict external evidence requirement');
  assertIncludes(productionReadinessReadme, 'Any external certification gate is blocked or missing evidence', 'Production readiness checklist not-ready external gate boundary');
  assertNotIncludes(productionReadinessReadme, '| Firebase Functions deployed | ☐ | `firebase deploy --only functions` |', 'Production readiness checklist broad Functions deploy command');
  assertNotIncludes(productionReadinessReadme, '| Firestore indexes deployed | ☐ | `firebase deploy --only firestore:indexes` |', 'Production readiness checklist broad Firestore indexes deploy command');
  assertNotIncludes(productionReadinessReadme, '| Firestore security rules deployed | ☐ | `firebase deploy --only firestore:rules` |', 'Production readiness checklist broad Firestore rules deploy command');
  assert(functionsPackageJson.scripts.deploy.includes('Use npm run deploy:menulist-qa after root npm run verify:functions-deploy-preflight'), 'Functions package default deploy script must fail closed with the scoped QA deploy instruction');
  assert(functionsPackageJson.scripts['deploy:menulist-qa'] === 'firebase deploy --project menulist-qa --config ../firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:messagingOnboarding,functions:backfillStoresSummary,functions:mapsPlaceCheck,functions:verifyMenuPublish --non-interactive', 'Functions package scoped QA deploy script must match Gate 1 current target set');
  assert(!functionsPackageJson.scripts.deploy.includes('firebase deploy --only functions'), 'Functions package default deploy script must not run a broad Functions deploy');
  assertIncludes(productionTestingGuide, 'Companion manual checklist only', 'Production testing guide manual companion boundary');
  assertIncludes(productionTestingGuide, '**Launch boundary:** Not current launch certification or deploy approval.', 'Production testing guide top launch/deploy boundary');
  assertIncludes(productionTestingGuide, 'This manual testing guide collects supplementary QA evidence only; production readiness still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.', 'Production testing guide top current evidence boundary');
  assertIncludes(productionTestingGuide, 'The active launch authority is [External Certification Runbook](./production-readiness/external-certification-runbook.md)', 'Production testing guide external certification authority');
  assertIncludes(productionTestingGuide, 'do not force all flags on', 'Production testing guide feature flag governance');
  assertIncludes(productionTestingGuide, 'Do not use this manual guide to approve Firebase deploys, Vercel deploys, or full production launch.', 'Production testing guide launch approval boundary');
  assertNotIncludes(productionTestingGuide, 'All flags `true`', 'Production testing guide stale all-flags instruction');
  assertNotIncludes(productionTestingGuide, 'FINAL PRODUCTION CHECKLIST', 'Production testing guide stale final launch checklist heading');
  assertNotIncludes(productionTestingGuide, 'PRODUCTION READY: [ ] YES', 'Production testing guide stale production-ready signoff');
  assertIncludes(rootDocsReadme, 'Active documentation index; not current launch certification', 'Root docs README launch boundary status');
  assertIncludes(rootDocsReadme, 'This file is a documentation map only. It is not MenuList production-launch approval.', 'Root docs README launch approval boundary');
  assertNotIncludes(rootDocsReadme, '**Status**: Production Ready', 'Root docs README stale production-ready status');
  for (const [label, content] of [
    ['Upload file processing README', uploadFileProcessingReadme],
    ['Upload file processing Firebase doc', uploadFileProcessingFirebase],
    ['B2B view Firebase doc', b2bViewFirebase],
    ['Multi-language translation README', multiLanguageTranslationReadme],
    ['Decision Intelligence spec', decisionIntelligenceSpec],
    ['Auth Firebase cost doc', authFirebaseDoc],
    ['Firebase Auth sync note', firebaseAuthSyncDoc],
    ['Firebase Auth null-fix note', firebaseAuthNullFixDoc],
    ['Stores Management Firebase doc', storesManagementFirebase],
    ['System Strengthening Firebase doc', systemStrengtheningFirebase],
  ]) {
    assertIncludes(content, 'not current launch certification', `${label} launch boundary status`);
    assertIncludes(content, 'production-readiness audit', `${label} audit launch boundary`);
    assertIncludes(content, 'External Certification Runbook', `${label} external certification boundary`);
  }
  assertIncludes(uploadFileProcessingReadme, 'verify:menu-extraction-pipeline', 'Upload README menu extraction source gate');
  assertIncludes(uploadFileProcessingFirebase, 'Storage quota/rules evidence', 'Upload Firebase storage launch gate');
  assertIncludes(uploadFileProcessingWebsite, 'Source-backed website draft; not current publication or launch certification', 'Upload website launch boundary status');
  assertIncludes(uploadFileProcessingWebsite, 'Current Website/Launch Boundary', 'Upload website current launch boundary heading');
  assertIncludes(uploadFileProcessingWebsite, 'External Certification Runbook evidence', 'Upload website external certification boundary');
  assertIncludes(uploadFileProcessingWebsite, '`npm run verify:menu-extraction-pipeline`', 'Upload website extraction source gate');
  assertIncludes(uploadFileProcessingWebsite, 'release-specific evidence for any speed, page-count, file-size, or volume claim', 'Upload website numeric-claim boundary');
  assertIncludes(uploadFileProcessingWebsite, 'Review Before Publishing', 'Upload website review-before-publish section');
  assertIncludes(uploadFileProcessingWebsite, 'publish only the approved menu', 'Upload website approved-menu boundary');
  for (const [label, content] of [
    ['Upload file processing marketing doc', uploadFileProcessingMarketing],
    ['AI data extraction marketing doc', aiDataExtractionMarketing],
  ]) {
    assertIncludes(content, 'Historical marketing draft; not current sales, publication, or launch certification', `${label} launch boundary status`);
    assertIncludes(content, 'Current Sales/Launch Boundary', `${label} current sales boundary heading`);
    assertIncludes(content, 'External Certification Runbook', `${label} external certification boundary`);
    assertIncludes(content, 'npm run verify:menu-extraction-pipeline', `${label} extraction source gate`);
    assertIncludes(content, 'Release-specific evidence', `${label} release-specific claim boundary`);
    assertNotIncludes(content, '_Document Status: ✅ READY FOR USE_', `${label} stale ready-for-use status`);
  }
  assertIncludes(uploadFileProcessingMarketing, 'Storage quota/rules/deploy evidence', 'Upload marketing storage deploy evidence boundary');
  assertIncludes(uploadFileProcessingMarketing, 'Extraction-job evidence for the target worker path', 'Upload marketing extraction-job evidence boundary');
  assertIncludes(uploadFileProcessingMarketing, 'system prepares a structured draft after processing', 'Upload marketing review-draft boundary');
  assertIncludes(uploadFileProcessingMarketing, 'Owner review before publishing', 'Upload marketing owner-review boundary');
  [
    'From Paper Menu to Digital in 60 Seconds',
    'We handle the rest',
    'no retyping, no manual entry',
    'MenuList converts it to a structured digital menu automatically',
    'Any Format Works',
    'Ready in Under a Minute',
    'wait about 30 seconds',
    'Most owners are live within 5 minutes',
    'Ready in 60 seconds',
    'ready in seconds',
    'AI does the work',
    'Menu items, prices, categories extracted automatically',
    'AI-verified',
    'Smart page-by-page conversion',
    'Handled automatically',
    'Demo Script (3 minutes)',
    '20 pages, multiple categories',
    'all 20 pages',
    'each file goes to our AI',
    'finding items, prices, categories',
    '20 pages done in seconds',
    'all items extracted',
    'What took 4 hours is done in 4 minutes',
  ].forEach((staleClaim) => {
    assertNotIncludes(uploadFileProcessingWebsite, staleClaim, 'Upload website stale speed/all-field claim');
    assertNotIncludes(uploadFileProcessingMarketing, staleClaim, 'Upload marketing stale speed/all-field claim');
  });
  assertIncludes(productionReadinessAudit, 'Upload File Processing website speed/all-field copy checkpoint', 'Production readiness audit upload website speed/all-field checkpoint');
  assertIncludes(changelog, 'Upload File Processing Website Speed All-Field Copy Boundary', 'Changelog upload website speed/all-field checkpoint');
  assertIncludes(aiDataExtractionMarketing, 'npm run verify:ai-accounting', 'AI extraction marketing AI accounting source gate');
  assertIncludes(aiDataExtractionMarketing, 'Provider smoke for the target extraction model and environment', 'AI extraction marketing provider smoke boundary');
  assertIncludes(aiDataExtractionMarketing, 'Upload a clear menu photo or PDF, review the extracted draft', 'AI extraction marketing review-draft pitch');
  assertIncludes(aiDataExtractionMarketing, 'Publish only the approved menu', 'AI extraction marketing approved-menu copy');
  assertIncludes(aiDataExtractionMarketing, 'Speed, accuracy, provider, and volume claims require release-specific proof', 'AI extraction marketing evidence-bound copy');
  [
    'Our AI reads your menu and types it all out for you—in seconds',
    'Our AI does it in seconds',
    'Gemini-powered system reads every item, every price, every description',
    'No more data entry. No more typos',
    'AI extraction eliminates manual data entry',
    'Photo → Data',
    'AI reads your menu image automatically',
    'Captured accurately from the image',
    'A complete digital menu in **minutes instead of hours**',
    '| Time for 50-item menu | 2-4 hours       | 5 minutes',
    '| Typo risk             | High            | Low (AI reads directly)',
    '| Descriptions          | Often skipped   | Automatically captured',
    '| Multi-language        | Double the work | Same effort',
    'AI extracts everything (30 seconds)',
    '**"Powered by Google Gemini"**',
    'State-of-the-art vision AI',
    'Trained to understand menu layouts',
    '50-item menu: 4 hours manual → 5 minutes with AI',
    '95%+ extraction accuracy on clear menus',
    'Watch the magic happen',
    'Your menu, digitized in seconds',
    'Our AI reads every item, price, and description',
    '**🤖 AI-Powered**',
    '**⚡ Instant Results**',
    '30 seconds, not 3 hours',
    'I uploaded our entire 45-item menu and it got every single price right',
    '**Focus:** Speed, accuracy, no typing needed',
    'AI menu digitization that actually works',
    'we often capture 60-70% correctly',
    'accuracy is typically above 95%',
    'detects Hindi, English, Tamil, and more automatically',
    'all languages in one extraction',
    '- "In seconds" (speed benefit)',
    'Demo Script (2 minutes)',
    'about 40 items across 6 categories',
    'Done—30 seconds',
    'Most items look perfect',
    'What would have taken 3 hours took 3 minutes',
    'AI "reading" the menu',
    '5-10 sec video',
    '| Time to extract 50 items  | ~30 seconds',
    '| Accuracy on printed menus | >95%',
  ].forEach((staleClaim) => {
    assertNotIncludes(aiDataExtractionMarketing, staleClaim, 'AI extraction marketing stale speed/provider/every-field claim');
  });
  assertIncludes(productionReadinessAudit, 'AI Data Extraction marketing speed/every-field copy checkpoint', 'Production readiness audit AI extraction marketing speed/every-field checkpoint');
  assertIncludes(changelog, 'AI Data Extraction Marketing Speed Every-Field Copy Boundary', 'Changelog AI extraction marketing speed/every-field checkpoint');
  assertIncludes(aiDataExtractionWebsite, 'Source-backed website draft; not current publication or launch certification', 'AI extraction website launch boundary status');
  assertIncludes(aiDataExtractionWebsite, 'Current Website/Launch Boundary', 'AI extraction website boundary heading');
  assertIncludes(aiDataExtractionWebsite, 'External Certification Runbook', 'AI extraction website external certification boundary');
  assertIncludes(aiDataExtractionWebsite, 'npm run verify:menu-extraction-pipeline', 'AI extraction website extraction source gate');
  assertIncludes(aiDataExtractionWebsite, 'npm run verify:ai-accounting', 'AI extraction website AI accounting source gate');
  assertIncludes(aiDataExtractionWebsite, 'Provider smoke for the target extraction model and environment', 'AI extraction website provider smoke boundary');
  assertIncludes(aiDataExtractionWebsite, 'Release-specific evidence for numeric speed, accuracy, page-count, language-count, or volume claims', 'AI extraction website numeric-claim boundary');
  assertIncludes(aiDataExtractionWebsite, 'review and edit before publishing', 'AI extraction website review-before-publish copy');
  assertIncludes(aiSystemLayerWebsite, 'Source-backed internal website reference; not current publication or launch certification', 'AI System Layer website launch boundary status');
  assertIncludes(aiSystemLayerWebsite, 'Current Website/Launch Boundary', 'AI System Layer website boundary heading');
  assertIncludes(aiSystemLayerWebsite, 'External Certification Runbook', 'AI System Layer website external certification boundary');
  assertIncludes(aiSystemLayerWebsite, 'npm run verify:menu-extraction-pipeline', 'AI System Layer website extraction source gate');
  assertIncludes(aiSystemLayerWebsite, 'npm run verify:ai-accounting', 'AI System Layer website AI accounting source gate');
  assertIncludes(aiSystemLayerWebsite, 'Provider smoke for the target extraction model and environment', 'AI System Layer website provider smoke boundary');
  assertIncludes(aiSystemLayerWebsite, 'release-specific evidence before using numeric speed, accuracy, page-count, language-count, or volume claims', 'AI System Layer website numeric-claim boundary');
  assertIncludes(aiSystemLayerWebsite, 'Review and publish the approved menu before customers see it.', 'AI System Layer website review-before-publish copy');
  assertIncludes(aiSystemLayerWebsite, 'Check the draft, edit what needs fixing, then publish the approved menu.', 'AI System Layer website owner-review copy');
  [
    'live digital menu in seconds',
    'ready in under a minute',
    'Photo to Menu in Seconds',
    'get a digital menu in seconds',
    'extracted in seconds',
    'creates your digital menu in seconds',
    'Handles Any Menu Format',
    'Every item, every price, every category is extracted automatically',
    'reads every item, price, and category automatically',
  ].forEach((staleClaim) => {
    assertNotIncludes(aiDataExtractionWebsite, staleClaim, 'AI extraction website stale speed/provider claim');
    assertNotIncludes(aiSystemLayerWebsite, staleClaim, 'AI System Layer website stale speed/provider claim');
  });
  assertIncludes(productionReadinessAudit, 'AI Data Extraction website speed/provider claim boundary checkpoint', 'Production readiness audit AI extraction website claim boundary');
  assertIncludes(productionReadinessAudit, 'AI System Layer website reference claim boundary checkpoint', 'Production readiness audit AI System Layer website claim boundary');
  assertIncludes(changelog, 'AI Data Extraction Website Claim Boundary', 'Changelog AI extraction website claim boundary entry');
  assertIncludes(changelog, 'AI System Layer Website Reference Claim Boundary', 'Changelog AI System Layer website claim boundary entry');
  assertIncludes(productionReadinessAudit, 'Projects marketing collateral boundary checkpoint', 'Production readiness audit Projects marketing collateral checkpoint');
  assertIncludes(productionReadinessAudit, 'no longer present January/February 2026 positioning drafts as ready for use', 'Production readiness audit Projects marketing stale ready-for-use boundary');
  assertIncludes(productionReadinessAudit, 'release-specific evidence for numeric speed, accuracy, language-count, quality, or customer-behavior claims', 'Production readiness audit Projects marketing numeric-claim boundary');
  assertIncludes(changelog, 'Projects Marketing Collateral Boundary', 'Changelog Projects marketing collateral boundary entry');
  assertIncludes(productionReadinessReadme, 'Clarified Projects marketing collateral docs', 'Production readiness README Projects marketing collateral boundary version row');
  assertIncludes(productionReadinessAudit, 'PONR, Physical Surfaces, and Image Editing historical-readiness checkpoint', 'Production readiness audit historical-readiness checkpoint');
  assertIncludes(productionReadinessAudit, 'no longer present January/November 2025-2026 planning and assessment labels as current implementation approval', 'Production readiness audit historical-readiness stale label boundary');
  assertIncludes(changelog, 'Historical Readiness Label Boundary', 'Changelog historical-readiness boundary entry');
  assertIncludes(productionReadinessReadme, 'Clarified PONR onboarding, Physical Surfaces, and Image Editing historical readiness labels', 'Production readiness README historical-readiness boundary version row');
  assertIncludes(productionReadinessAudit, 'Mobile, strategy, and multi-outlet reference-boundary checkpoint', 'Production readiness audit mobile/strategy/multi-outlet reference-boundary checkpoint');
  assertIncludes(changelog, 'Mobile Strategy And Multi-Outlet Reference Boundary', 'Changelog mobile/strategy/multi-outlet reference-boundary entry');
  assertIncludes(productionReadinessReadme, 'Clarified mobile operational specs, strategy bucket-list, and Multi-Outlet AI extraction analysis', 'Production readiness README mobile/strategy/multi-outlet reference-boundary row');
  assertIncludes(physicalSurfacesSpec, 'Historical legacy spec; not current implementation approval', 'Physical Surfaces spec historical legacy footer boundary');
  assertIncludes(physicalSurfacesSpec, 'Current Release Boundary', 'Physical Surfaces spec current release boundary heading');
  assertIncludes(physicalSurfacesSpec, 'current Menu Kit and Menu Card Export source truth', 'Physical Surfaces spec Menu Kit/Menu Card Export boundary');
  assertIncludes(physicalSurfacesSpec, 'npm run verify:menu-card-export', 'Physical Surfaces spec menu-card-export source gate');
  assertNotIncludes(physicalSurfacesSpec, '**Document Status:** Ready for implementation', 'Physical Surfaces spec stale implementation-ready footer');
  assertIncludes(b2bViewFirebase, 'API/export security review', 'B2B Firebase API/export launch gate');
  assertIncludes(multiLanguageTranslationReadme, 'public renderer fallback/RTL evidence', 'Multi-language README renderer/RTL launch gate');
  assertIncludes(decisionIntelligenceReadme, '**Launch boundary:** Not current launch certification or deploy approval.', 'Decision Intelligence README top launch/deploy boundary');
  assertIncludes(decisionIntelligenceReadme, 'scoped scheduler deploy evidence', 'Decision Intelligence README scoped deploy boundary');
  assertIncludes(decisionIntelligenceReadme, 'browser/mobile customer-menu QA', 'Decision Intelligence README customer QA boundary');
  assertIncludes(decisionIntelligenceSpec, 'scoped scheduler deploy evidence', 'Decision Intelligence spec scheduler deploy launch gate');
  assertIncludes(decisionIntelligenceImpl, '**Launch boundary:** Not current launch certification or deploy approval.', 'Decision Intelligence implementation top launch/deploy boundary');
  assertIncludes(decisionIntelligenceImpl, 'scoped scheduler deploy evidence', 'Decision Intelligence implementation scoped deploy boundary');
  assertIncludes(decisionIntelligenceImpl, 'browser/mobile customer-menu QA', 'Decision Intelligence implementation customer QA boundary');
  assertIncludes(decisionIntelligenceFirebase, '**Launch boundary:** Not current launch certification or deploy approval.', 'Decision Intelligence Firebase top launch/deploy boundary');
  assertIncludes(decisionIntelligenceFirebase, 'This Firebase cost doc is source-gated scheduler/cost evidence only; Decision Intelligence release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:agent-readiness`, scoped Functions deploy evidence for the scheduler bundle, browser/mobile customer-menu QA, public-cache evidence, provider/runtime smoke where relevant, and production-host smoke.', 'Decision Intelligence Firebase top current evidence boundary');
  assertIncludes(authCompleteGuide, 'Historical architecture reference; not current runtime truth or launch certification', 'Auth complete guide historical launch boundary status');
  assertIncludes(authCompleteGuide, 'old 30-day session contract', 'Auth complete guide historical session warning');
  assertIncludes(authCompleteGuide, '[Auth and Onboarding](../auth-onboarding/README.md)', 'Auth complete guide current flow handoff');
  assertIncludes(authCompleteGuide, '[Auth hub](./README.md)', 'Auth complete guide current hub handoff');
  assertIncludes(authReadme, 'Auth documentation hub; not current launch certification', 'Auth README launch boundary status');
  assertIncludes(authReadme, 'npm run verify:auth-security-failure-matrix', 'Auth README auth-security source gate');
  assertIncludes(authReadme, 'auth browser/API smoke', 'Auth README browser/API launch gate');
  assertIncludes(authReadme, 'Firebase Auth custom-claims/token smoke', 'Auth README custom-claims launch gate');
  assertIncludes(authReadme, 'App Check/session-cookie review', 'Auth README App Check/session-cookie launch gate');
  assertIncludes(authFirebaseDoc, 'auth browser/API smoke', 'Auth Firebase browser/API launch gate');
  assertIncludes(firebaseAuthSyncDoc, 'Firebase Auth custom-claims evidence', 'Firebase Auth sync custom-claims launch gate');
  assertIncludes(firebaseAuthNullFixDoc, 'Historical fix note; not current launch certification', 'Firebase Auth null-fix historical boundary');
  assertIncludes(storesManagementFirebase, 'public cache evidence for store-output writes', 'Stores Management Firebase public cache launch gate');
  assertIncludes(systemStrengtheningFirebase, 'verify:system-strengthening', 'System Strengthening Firebase source gate');
  assertNotIncludes(uploadFileProcessingReadme, '**Status:** ✅ Production Ready', 'Upload README stale production-ready status');
  assertNotIncludes(uploadFileProcessingFirebase, '**Status:** ✅ Production Ready', 'Upload Firebase stale production-ready status');
  assertNotIncludes(b2bViewFirebase, '**Status:** ✅ Production Ready', 'B2B Firebase stale production-ready status');
  assertNotIncludes(multiLanguageTranslationReadme, '> **Status:** ✅ COMPLETE (Production Ready)', 'Multi-language README stale production-ready status');
  assertNotIncludes(decisionIntelligenceSpec, '**Status:** 🔒 **LOCKED — Production Ready**', 'Decision Intelligence spec stale production-ready status');
  assertNotIncludes(authCompleteGuide, '**Status:** Production Active', 'Auth complete guide stale production-active status');
  assertNotIncludes(authReadme, '**Status:** ✅ Production Active', 'Auth README stale production-active footer');
  assertNotIncludes(authFirebaseDoc, '**Status:** ✅ Production Ready', 'Auth Firebase stale production-ready status');
  assertNotIncludes(firebaseAuthSyncDoc, '**Status:** ✅ Production Ready', 'Firebase Auth sync stale production-ready status');
  assertNotIncludes(firebaseAuthSyncDoc, '**Status:** ✅ Production Active', 'Firebase Auth sync stale production-active footer');
  assertNotIncludes(firebaseAuthNullFixDoc, '**Status:** ✅ Production Ready', 'Firebase Auth null-fix stale production-ready status');
  assertNotIncludes(storesManagementFirebase, '**Status:** ✅ Production Ready', 'Stores Management Firebase stale production-ready status');
  assertNotIncludes(systemStrengtheningFirebase, '**Status:** ✅ Production Ready', 'System Strengthening Firebase stale production-ready status');
  assertIncludes(productionReadinessAudit, 'Active cost/source doc launch-boundary checkpoint', 'Production readiness audit active cost/source doc checkpoint');
  assertIncludes(productionReadinessAudit, 'no longer present upload, B2B, translation, auth, store, system-strengthening, or Decision Intelligence source/cost evidence as current production certification', 'Production readiness audit active cost/source doc boundary summary');
  assertIncludes(productionReadinessAudit, 'Auth guide production-active boundary checkpoint', 'Production readiness audit auth production-active checkpoint');
  assertIncludes(productionReadinessAudit, 'no longer present auth architecture, the auth hub, or Firebase Auth sync as current "Production Active" launch approval', 'Production readiness audit auth production-active stale-label boundary');
  assertIncludes(productionReadinessAudit, 'Onboarding Centralization status-boundary checkpoint', 'Production readiness audit onboarding centralization checkpoint');
  assertIncludes(changelog, 'Auth Guide Production-Active Boundary', 'Changelog auth production-active boundary entry');
  assertIncludes(changelog, 'Onboarding Centralization Status Boundary', 'Changelog onboarding centralization boundary entry');
  for (const gate of [
    'browser/mobile upload QA',
    'Storage quota/rules evidence',
    'API/export security review',
    'auth browser/API smoke',
    'store CRUD/browser QA',
    'scoped scheduler deploy evidence',
    '`npm run verify:system-strengthening`',
  ]) {
    assertIncludes(productionReadinessAudit, gate, `Production readiness audit active cost/source external gate ${gate}`);
  }
  for (const [label, content] of [
    ['Five-year vision strategy note', fiveYearVision],
    ['MenuList complete feature spec', menulistCompleteFeatureSpec],
    ['MenuList future roadmap SSOT', menulistFutureRoadmap],
    ['Product strategy 2026 doc', productStrategy2026],
    ['Product strategy market research doc', productStrategyMarketResearch],
    ['MOL v0 implementation plan', molV0ImplementationPlan],
    ['Upload implementation completion note', developmentDoneUploadImpl],
    ['Upload cross-check note', developmentDoneUploadCrossCheck],
    ['Upload testing guide', uploadTestingGuide],
    ['Security implementation summary', developmentDoneSecuritySummary],
  ]) {
    assertIncludes(content, 'not current launch certification', `${label} launch boundary status`);
    assertIncludes(content, 'production-readiness audit', `${label} audit launch boundary`);
    assertIncludes(content, 'External Certification Runbook', `${label} external certification boundary`);
  }
  assertIncludes(fiveYearVision, 'Current Launch Certification: NO - see active audit/runbook evidence', 'Five-year vision current launch certification boundary');
  assertIncludes(menulistCompleteFeatureSpec, 'Codebase-derived feature map; not current launch certification', 'MenuList complete feature spec source-map boundary');
  assertIncludes(productUniverseSsot, 'Historical product-universe/source-state reference; not current launch certification', 'Product Universe SSOT historical source-state boundary');
  assertIncludes(productUniverseSsot, 'This file preserves February 2026 product-universe and source-state strategy', 'Product Universe SSOT launch-boundary wording');
  assertIncludes(productUniverseSsot, 'Current MenuList readiness is decided only by the active [production-readiness audit]', 'Product Universe SSOT active audit routing');
  assertIncludes(productUniverseSsot, 'For live feature flags, inspect `src/config/features.ts`.', 'Product Universe SSOT live flag source pointer');
  assertIncludes(productUniverseSsot, 'Historical source-state label', 'Product Universe SSOT historical source-state table heading');
  assertIncludes(productUniverseSsot, 'Source evidence present; current release approval requires active gates', 'Product Universe SSOT source evidence row wording');
  assertIncludes(productUniverseSsot, 'External platforms, printed artifacts, and cached third-party surfaces still require their own integration or refresh evidence.', 'Product Universe SSOT external-surface boundary');
  assertIncludes(productUniverseSsot, 'Current production readiness still requires the active audit, External Certification Runbook evidence, current source verifiers, browser/device QA, provider smoke where relevant, target deploy evidence, and production-host smoke.', 'Product Universe SSOT current readiness boundary');
  assertIncludes(menulistFutureRoadmap, 'Historical roadmap/source-state reference; not current launch certification', 'MenuList future roadmap historical roadmap boundary');
  assertIncludes(menulistFutureRoadmap, 'FEBRUARY 2026 SOURCE-STATE SNAPSHOT', 'MenuList future roadmap historical source-state heading');
  assertIncludes(menulistFutureRoadmap, 'Implemented Source Evidence (Not Launch Certification)', 'MenuList future roadmap implemented-source boundary heading');
  assertIncludes(menulistFutureRoadmap, 'Historical Flag-Off / Activation Candidates (Not Testing Approval)', 'MenuList future roadmap flag-off testing boundary heading');
  assertIncludes(menulistFutureRoadmap, 'For live feature flags, inspect `src/config/features.ts`.', 'MenuList future roadmap live flag source pointer');
  assertIncludes(menulistFutureRoadmap, 'What customers see from supported MenuList surfaces has a single owner-approved source', 'MenuList future roadmap supported-surface truth wording');
  assertIncludes(menulistFutureRoadmap, 'What customers experience is consistent where MenuList owns the surface', 'MenuList future roadmap owned-surface consistency wording');
  assertIncludes(menulistFutureRoadmap, 'supported MenuList surfaces follow their verified refresh paths. External platforms and printed/downloaded artifacts need placement or replacement', 'MenuList future roadmap supported-refresh external-artifact boundary');
  assertIncludes(productStrategy2026, 'Historical founder strategy reference; not current launch certification', 'Product strategy 2026 historical strategy boundary');
  assertIncludes(productStrategy2026, 'January 2026 Source-State Snapshot', 'Product strategy 2026 historical source-state heading');
  assertIncludes(productStrategyMarketResearch, 'Historical market-research reference; not current launch certification', 'Product strategy market research historical strategy boundary');
  assertIncludes(productStrategyMarketResearch, 'Historical MVP filter', 'Product strategy market research historical MVP boundary');
  assertIncludes(futureIdeasBucketList, 'High-priority historical strategy candidate; not current implementation approval or launch certification', 'Future ideas bucket list historical strategy candidate boundary');
  assertNotIncludes(futureIdeasBucketList, 'Ready for implementation', 'Future ideas bucket list stale implementation-ready priority');
  assertIncludes(productionReadinessAudit, 'Future roadmap SSOT launch-boundary checkpoint', 'Production readiness audit Future Roadmap SSOT boundary checkpoint');
  assertIncludes(productionReadinessAudit, 'no longer presents its February 2026 roadmap/source-state snapshot as current codebase truth, production-ready status, testing approval, activation approval, or launch certification', 'Production readiness audit Future Roadmap SSOT stale readiness summary');
  assertIncludes(productionReadinessAudit, 'Future roadmap supported-surface correctness checkpoint', 'Production readiness audit Future Roadmap supported-surface correctness checkpoint');
  assertIncludes(productionReadinessAudit, '`npm run verify:agent-readiness` now rejects stale blanket correctness doctrine', 'Production readiness audit Future Roadmap supported-surface verifier summary');
  assertIncludes(productionReadinessAudit, 'Product Universe SSOT launch-boundary checkpoint', 'Production readiness audit Product Universe SSOT boundary checkpoint');
  assertIncludes(productionReadinessAudit, 'no longer presents February 2026 product-universe source-state strategy as current production status, universal correctness, external-platform freshness, or launch certification', 'Production readiness audit Product Universe SSOT stale readiness summary');
  assertIncludes(changelog, 'Future Roadmap SSOT Boundary', 'Changelog Future Roadmap SSOT boundary entry');
  assertIncludes(changelog, 'The old production-ready heading, testing/activation heading, and ready-to-test action statuses are replaced with historical source-evidence wording.', 'Changelog Future Roadmap SSOT stale label summary');
  assertIncludes(changelog, 'Future Roadmap Supported-Surface Correctness Boundary', 'Changelog Future Roadmap supported-surface correctness boundary entry');
  assertIncludes(changelog, 'Product Universe SSOT Launch Boundary', 'Changelog Product Universe SSOT boundary entry');
  assertIncludes(molV0ImplementationPlan, 'Firestore/cost evidence', 'MOL v0 Firestore/cost launch gate');
  assertIncludes(molV0ImplementationPlan, 'scoped scheduler/deploy evidence', 'MOL v0 scoped scheduler/deploy launch gate');
  assertIncludes(molV0ImplementationPlan, 'Historical Sprint 1 and 2 implementation evidence only; current testing or deploy approval requires', 'MOL v0 footer current approval boundary');
  assertIncludes(developmentDoneUploadImpl, 'browser/mobile upload QA', 'Upload implementation completion browser/mobile launch gate');
  assertIncludes(developmentDoneUploadImpl, 'Storage quota/rules evidence', 'Upload implementation completion Storage launch gate');
  assertIncludes(developmentDoneUploadCrossCheck, 'Historical upload cross-check evidence; not current testing approval and not current launch certification', 'Upload cross-check historical testing boundary');
  assertIncludes(developmentDoneUploadCrossCheck, 'Current upload testing, deploy, or release approval requires', 'Upload cross-check current approval routing');
  assertIncludes(developmentDoneUploadCrossCheck, 'browser/mobile upload QA', 'Upload cross-check browser/mobile launch gate');
  assertIncludes(developmentDoneUploadCrossCheck, 'Storage quota/rules evidence', 'Upload cross-check Storage launch gate');
  assertIncludes(uploadTestingGuide, 'upload/browser/mobile/Storage results', 'Upload testing guide current evidence routing');
  assertIncludes(developmentDoneSecuritySummary, 'current Projects API/security verifiers', 'Security implementation summary source verifier launch gate');
  assertIncludes(developmentDoneSecuritySummary, 'browser/API smoke', 'Security implementation summary browser/API launch gate');
  assertIncludes(developmentDoneSecuritySummary, 'Historical status**: Source evidence only; not current deploy approval', 'Security implementation summary historical deploy-status boundary');
  assertNotIncludes(fiveYearVision, '**Status:** ✅ Complete & Production Ready', 'Five-year vision stale production-ready status');
  assertNotIncludes(fiveYearVision, 'Production Ready:            YES', 'Five-year vision stale production-ready table value');
  assertNotIncludes(menulistCompleteFeatureSpec, '**Status:** ✅ Production Ready', 'MenuList complete feature spec stale production-ready status');
  assertNotIncludes(productUniverseSsot, '| ✅ Production |', 'Product Universe SSOT stale production table status');
  assertNotIncludes(productUniverseSsot, '**Core product is done.**', 'Product Universe SSOT stale core-product-done wording');
  assertNotIncludes(productUniverseSsot, 'everything customers see about a small business is always correct and consistent', 'Product Universe SSOT stale universal-correctness positioning');
  assertNotIncludes(productUniverseSsot, 'it automatically becomes correct on their QR code, digital screen, official business page, Google listing, and printed PDF', 'Product Universe SSOT stale automatic all-surface correction claim');
  assertNotIncludes(productUniverseSsot, 'WHY:      "Everything customers see is always correct"', 'Product Universe SSOT stale quick-card correctness claim');
  assertNotIncludes(productUniverseSsot, 'STATUS:   ✅ BUILT | PRIORITY: 🥇 #1 Always', 'Product Universe SSOT stale quick-card built status');
  assertNotIncludes(menulistFutureRoadmap, 'FULLY BUILT & PRODUCTION-READY', 'MenuList future roadmap stale production-ready heading');
  assertNotIncludes(menulistFutureRoadmap, 'BUILT BUT FLAG OFF (Ready for Testing/Activation)', 'MenuList future roadmap stale testing/activation heading');
  assertNotIncludes(menulistFutureRoadmap, 'Ready to test', 'MenuList future roadmap stale ready-to-test action status');
  assertNotIncludes(menulistFutureRoadmap, 'What customers see is always correct', 'MenuList future roadmap stale blanket customer correctness claim');
  assertNotIncludes(menulistFutureRoadmap, 'MenuList pages are always accurate', 'MenuList future roadmap stale blanket page-accuracy claim');
  assertNotIncludes(menulistFutureRoadmap, 'Owner updates once → correct everywhere', 'MenuList future roadmap stale correct-everywhere doctrine');
  assertNotIncludes(productStrategy2026, '✅ Production |', 'Product strategy 2026 stale production status rows');
  assertNotIncludes(productStrategy2026, '**Core product is DONE.** No major new features needed.', 'Product strategy 2026 stale done/launch wording');
  assertNotIncludes(productStrategyMarketResearch, 'Only these 4 features are allowed before public beta. Everything else is Phase 2+.', 'Product strategy market research stale public-beta strict rule');
  assertNotIncludes(molV0ImplementationPlan, '> **Status**: ✅ COMPLETE - Sprint 1 & 2 Production Ready', 'MOL v0 stale production-ready status');
  assertNotIncludes(molV0ImplementationPlan, '**Status**: ✅ COMPLETE — Ready for testing and deployment', 'MOL v0 stale testing/deployment approval status');
  assertNotIncludes(developmentDoneUploadImpl, '**Production Ready:** ✅ YES (after testing)', 'Upload implementation completion stale production-ready status');
  assertNotIncludes(developmentDoneUploadCrossCheck, '**Confidence Level**: 🟢 **HIGH** - Ready for testing phase', 'Upload cross-check stale ready-for-testing confidence');
  assertNotIncludes(developmentDoneSecuritySummary, '**Status**: ✅ **COMPLETE** - Production Ready', 'Security implementation summary stale production-ready status');
  assertNotIncludes(developmentDoneSecuritySummary, '**Status**: ✅ Ready to Deploy', 'Security implementation summary stale ready-to-deploy status');
  assertNotIncludes(developmentDoneSecuritySummary, '4. **Production Ready** - All security measures in place', 'Security implementation summary stale production-ready achievement');
  assertNotIncludes(uploadTestingGuide, '**Ready for Production:** Yes / No', 'Upload testing guide stale ready-for-production checkbox');
  assertIncludes(productionReadinessAudit, 'Active strategy and legacy implementation launch-boundary checkpoint', 'Production readiness audit active strategy/legacy checkpoint');
  assertIncludes(productionReadinessAudit, 'no longer present strategic feature maps, founder strategy notes, market-research scope filters, MOL v0 history, upload implementation notes, upload testing checklist, or security implementation summaries as current production certification', 'Production readiness audit strategy/legacy boundary summary');
  assertIncludes(productionReadinessAudit, 'Upload cross-check testing-phase boundary checkpoint', 'Production readiness audit upload cross-check testing boundary');
  assertIncludes(productionReadinessAudit, 'MOL v0 footer testing/deploy boundary checkpoint', 'Production readiness audit MOL v0 footer boundary checkpoint');
  assertIncludes(changelog, 'MOL V0 Footer Testing Deploy Boundary', 'Changelog MOL v0 footer boundary entry');
  for (const gate of [
    'current source verifiers',
    'browser/mobile upload QA',
    'Storage quota/rules evidence',
    'current Projects API/security verifiers',
    'Firestore/cost evidence',
    'scoped scheduler/deploy evidence',
  ]) {
    assertIncludes(productionReadinessAudit, gate, `Production readiness audit strategy/legacy external gate ${gate}`);
  }
  assertIncludes(projectsReadme, 'Complete source documentation; not current launch certification', 'Projects README launch boundary status');
  assertIncludes(projectsReadme, 'Current release readiness must be decided from the active [production-readiness audit]', 'Projects README launch authority boundary');
  assertIncludes(projectsReadme, 'Historical Readiness assessments', 'Projects README historical readiness assessments heading');
  assertNotIncludes(projectsReadme, '**Status**: ✅ Complete & Production Ready', 'Projects README stale production-ready status');
  assertNotIncludes(projectsReadme, '✅ **PRODUCTION READY**', 'Projects README stale production-ready assessment row');
  assertNotIncludes(projectsReadme, '✅ Production |', 'Projects README stale production status table rows');
  assertIncludes(projectsOverview, 'Implemented reference; not current launch certification', 'Projects overview launch boundary status');
  assertIncludes(projectsOverview, 'It is not current production-launch approval.', 'Projects overview launch approval boundary');
  assertNotIncludes(projectsOverview, '**Status:** ✅ Production Ready', 'Projects overview stale production-ready status');
  assertIncludes(projectsUtilities, 'Implemented reference; not current launch certification', 'Projects utilities launch boundary status');
  assertIncludes(projectsUtilities, 'It is not production-launch approval.', 'Projects utilities launch approval boundary');
  assertNotIncludes(projectsUtilities, '**Status**: ✅ Production Ready', 'Projects utilities stale production-ready status');
  assertIncludes(projectsOwnerDashboard, 'Implemented reference; not current launch certification', 'Projects owner-dashboard launch boundary status');
  assertIncludes(projectsOwnerDashboard, 'It is not production approval.', 'Projects owner-dashboard launch approval boundary');
  assertIncludes(projectsOwnerDashboard, 'scoped SWR + localStorage cache', 'Projects owner-dashboard current cache boundary');
  assertNotIncludes(projectsOwnerDashboard, '**Status:** Production Ready', 'Projects owner-dashboard stale production-ready status');
  assertIncludes(projectsEditorReadme, 'Implemented source documentation; not current launch certification', 'Projects Editor README launch boundary status');
  assertIncludes(projectsEditorReadme, 'browser/mobile editor QA', 'Projects Editor README browser/mobile QA launch gate');
  assertIncludes(projectsEditorReadme, 'publish/cache evidence for edited public truth', 'Projects Editor README publish/cache launch gate');
  assertIncludes(projectsEditorReadme, 'upload/image/editor regression smoke', 'Projects Editor README regression smoke launch gate');
  assertNotIncludes(projectsEditorReadme, '**Status**: ✅ Production Ready', 'Projects Editor README stale production-ready status');
  assertIncludes(projectsEditorAutoSaveDoc, 'implementation evidence, not current launch certification', 'Projects Editor auto-save doc launch boundary');
  assertNotIncludes(projectsEditorAutoSaveDoc, 'production-ready auto-save system', 'Projects Editor auto-save stale production-ready wording');
  assertIncludes(projectsEditorAutoSaveDoc, 'Implemented source documentation; not current launch certification', 'Projects Editor auto-save doc launch boundary status');
  assertIncludes(projectsEditorAutoSaveDoc, 'browser/mobile editor QA', 'Projects Editor auto-save doc browser/mobile launch gate');
  assertIncludes(projectsEditorAutoSaveDoc, 'Firestore write observation for the target environment', 'Projects Editor auto-save doc Firestore observation gate');
  assertNotIncludes(projectsEditorAutoSaveDoc, 'production-ready auto-save system', 'Projects Editor auto-save doc stale production-ready wording');
  assertIncludes(editorMain, 'import EditorActionsPopover', 'Projects Editor source imports actions popover');
  assertIncludes(editorMain, 'useEditorKeyboardShortcuts', 'Projects Editor source wires keyboard shortcuts hook');
  assertIncludes(editorMain, 'AUTOSAVE_DEBOUNCE_MS', 'Projects Editor source imports auto-save debounce');
  assertIncludes(editorMain, 'AUTOSAVE_MIN_INTERVAL_MS', 'Projects Editor source imports auto-save min interval');
  assertIncludes(editorMain, 'lastAutoSaveRef', 'Projects Editor source tracks last auto-save time');
  assertIncludes(editorMain, 'window.addEventListener("beforeunload"', 'Projects Editor source warns on unsaved changes');
  assertIncludes(editorMain, '<AdvancedView', 'Projects Editor source renders AdvancedView');
  assertIncludes(editorMain, '<TraditionalView', 'Projects Editor source renders TraditionalView');
  assertIncludes(editorMain, '<FocusView', 'Projects Editor source renders FocusView');
  assertIncludes(editorMain, '<KeyboardShortcutsHelp', 'Projects Editor source renders keyboard help');
  assertIncludes(editorContent, 'useEditorLogic({', 'Projects Editor content uses shared editor logic');
  assertIncludes(editorActionsPopover, 'export default function EditorActionsPopover', 'Projects Editor actions popover source gate');
  assertIncludes(editorShortcutsConfig, 'export const EDITOR_SHORTCUTS', 'Projects Editor shortcut config source gate');
  assertIncludes(editorKeyboardShortcutsHook, 'EDITOR_SHORTCUTS', 'Projects Editor keyboard shortcut hook source gate');
  assertIncludes(editorLogicHook, 'export const useEditorLogic', 'Projects Editor logic hook source gate');
  assertIncludes(editorFileImagePreview, '<ZoomableImage', 'Projects Editor file image preview source gate');
  assertIncludes(editorAdvancedView, '<FileImagePreview', 'Projects Editor AdvancedView image preview source gate');
  assertIncludes(editorTraditionalView, 'export const TraditionalView', 'Projects Editor TraditionalView source gate');
  assertIncludes(editorFocusView, '<FileImagePreview', 'Projects Editor FocusView image preview source gate');
  assertIncludes(projectsProductionReadinessAssessment, 'Historical assessment snapshot - not current launch certification', 'Projects production-readiness assessment historical boundary');
  assertIncludes(projectsProductionReadinessAssessment, 'Do not treat it as current MenuList production-launch approval.', 'Projects production-readiness assessment current launch approval boundary');
  assertIncludes(projectsProductionReadinessAssessment, 'Current Launch Boundary', 'Projects production-readiness assessment current launch boundary section');
  assertIncludes(projectsProductionReadinessAssessment, "Outside this historical assessment's launch-blocker scope", 'Projects production-readiness assessment medium-priority boundary wording');
  assertNotIncludes(projectsProductionReadinessAssessment, '**Status**: ✅ **PRODUCTION READY**', 'Projects production-readiness assessment stale production-ready status');
  assertNotIncludes(projectsProductionReadinessAssessment, '**Launch Status**: Ready for Production Deployment', 'Projects production-readiness assessment stale launch status');
  assertNotIncludes(projectsProductionReadinessAssessment, 'Readiness Scorecard ✅ PRODUCTION READY', 'Projects production-readiness assessment stale production-ready scorecard heading');
  assertNotIncludes(projectsProductionReadinessAssessment, 'System ready for production launch', 'Projects production-readiness assessment stale launch progress wording');
  assertNotIncludes(projectsProductionReadinessAssessment, 'The Projects feature is now **production-ready** and can be deployed for live users.', 'Projects production-readiness assessment stale deploy approval wording');
  assertNotIncludes(projectsProductionReadinessAssessment, 'post-launch', 'Projects production-readiness assessment stale post-launch wording');
  assertIncludes(projectsTestingChecklist, 'active production-readiness audit accepts the risk', 'Projects testing checklist launch-risk boundary');
  assertNotIncludes(projectsTestingChecklist, 'fixed post-launch', 'Projects testing checklist stale post-launch wording');
  assertIncludes(projectsMiscellaneousTask, 'Historical backlog evidence; not current launch certification', 'Projects miscellaneous backlog launch boundary status');
  assertIncludes(projectsMiscellaneousTask, 'Do not use it as approval to defer current launch blockers.', 'Projects miscellaneous backlog launch-blocker boundary');
  assertIncludes(projectsMiscellaneousTask, 'Current Use Boundary', 'Projects miscellaneous backlog current use boundary');
  assertIncludes(projectsMiscellaneousTask, 'Conditional / Not Current Launch Gates', 'Projects miscellaneous backlog conditional summary');
  assertNotIncludes(projectsMiscellaneousTask, 'Phase 2', 'Projects miscellaneous backlog stale phase-2 wording');
  assertNotIncludes(projectsMiscellaneousTask, 'Phase 3', 'Projects miscellaneous backlog stale phase-3 wording');
  assertNotIncludes(projectsMiscellaneousTask, 'post-launch', 'Projects miscellaneous backlog stale post-launch wording');
  assertNotIncludes(projectsMiscellaneousTask, 'Deferred To', 'Projects miscellaneous backlog stale deferred-to wording');
  assertNotIncludes(projectsMiscellaneousTask, 'Still Deferred', 'Projects miscellaneous backlog stale still-deferred wording');
  assertIncludes(mainWebsiteReadme, 'source-gated Menu Link Import', 'Main website README menu-link source-gated wording');
  assertNotIncludes(mainWebsiteReadme, 'production-ready Menu Link Import', 'Main website README stale menu-link production-ready wording');
  assertIncludes(mobilePwaAnalysis, 'Implemented source analysis; not current launch certification', 'Mobile PWA analysis launch boundary status');
  assertIncludes(mobilePwaAnalysis, 'Current Operational Baseline', 'Mobile PWA analysis current baseline wording');
  assertIncludes(mobilePwaAnalysis, 'Conditional Additions (Only If PWA Adoption Proves Need)', 'Mobile PWA analysis conditional-additions wording');
  assertIncludes(mobilePwaAnalysis, 'Separate scoped audit', 'Mobile PWA analysis scoped-audit wording');
  assertNotIncludes(mobilePwaAnalysis, '3 months post-launch', 'Mobile PWA analysis stale post-launch timing');
  assertNotIncludes(mobilePwaAnalysis, 'After launch', 'Mobile PWA analysis stale after-launch timing');
  assertNotIncludes(mobilePwaAnalysis, 'Phase 3', 'Mobile PWA analysis stale phase-3 wording');
  assertNotIncludes(mobilePwaAnalysis, 'Keep Phase 2', 'Mobile PWA analysis stale phase-2 action item');
  assertNotIncludes(mobilePwaAnalysis, 'phased approach', 'Mobile PWA analysis stale phased-approach wording');
  assertNotIncludes(mobilePwaAnalysis, '✅ IMPLEMENTED', 'Mobile PWA analysis stale implemented launch badge');
  for (const [label, content] of [
    ['Projects upload assessment', projectsUploadAssessment],
    ['Projects AI extraction assessment', projectsAiExtractionAssessment],
    ['Projects performance assessment', projectsPerformanceAssessment],
    ['Projects security assessment', projectsSecurityAssessment],
    ['Projects UX assessment', projectsUxAssessment],
    ['Projects AI image generation assessment', projectsAiImageGenerationAssessment],
    ['Projects image editing assessment', projectsImageEditingAssessment],
    ['Projects B2B view assessment', projectsB2bViewAssessment],
    ['Projects management assessment', projectsManagementAssessment],
    ['Projects menu job queue implementation', menuJobQueueAssessment],
  ]) {
    assertIncludes(content, 'Historical assessment result only; not current launch certification', `${label} historical launch boundary`);
    assertIncludes(content, 'External Certification Runbook', `${label} external certification boundary`);
  }
  assertIncludes(projectsUploadAssessment, 'Storage rules/deploy evidence', 'Projects upload assessment storage deploy boundary');
  assertIncludes(projectsAiExtractionAssessment, 'AI accounting/source gates', 'Projects AI extraction assessment AI accounting boundary');
  assertIncludes(projectsPerformanceAssessment, 'browser/device performance QA', 'Projects performance assessment runtime QA boundary');
  assertIncludes(projectsSecurityAssessment, 'auth/tenant-isolation review', 'Projects security assessment tenant-isolation boundary');
  assertIncludes(projectsUxAssessment, 'owner desktop/mobile QA', 'Projects UX assessment owner QA boundary');
  assertIncludes(projectsAiImageGenerationAssessment, 'provider smoke', 'Projects AI image generation assessment provider smoke boundary');
  assertIncludes(projectsImageEditingAssessment, 'Storage rules/deploy evidence', 'Projects image editing assessment storage deploy boundary');
  assertIncludes(projectsImageEditingAssessment, 'Historical Production-Readiness Assessment (Not Current Launch Approval)', 'Projects image editing assessment historical production-readiness heading');
  assertIncludes(projectsImageEditingAssessment, 'not current production-ready approval', 'Projects image editing assessment production-ready approval boundary');
  assertIncludes(projectsB2bViewAssessment, 'API/export security review', 'Projects B2B view assessment API security boundary');
  assertIncludes(b2cViewAssessment, 'require current launch-boundary review before release', 'B2C view assessment current launch-boundary review wording');
  assertIncludes(projectsManagementAssessment, 'public cache evidence for publish-state writes', 'Projects management assessment public cache boundary');
  assertIncludes(menuJobQueueAssessment, 'Cloud Function/deploy evidence', 'Projects menu job queue assessment function deploy boundary');
  assertIncludes(serverSideDataProcessingArchitecture, 'architecture discussion evidence, not production launch certification', 'Projects server-side data processing ADR launch boundary');
  assertIncludes(serverSideDataProcessingArchitecture, 'queue/runtime QA', 'Projects server-side data processing ADR queue QA boundary');
  assertNotIncludes(projectsUploadAssessment, '**Production Ready**: ❌ NO → ✅ YES (after testing)', 'Projects upload assessment stale production-ready metadata');
  assertNotIncludes(projectsAiExtractionAssessment, '**Production Ready**: ❌ NO → ✅ YES (after testing)', 'Projects AI extraction assessment stale production-ready metadata');
  assertNotIncludes(projectsPerformanceAssessment, '**Production Ready**: ❌ NO → ✅ YES (optimized for production)', 'Projects performance assessment stale production-ready metadata');
  assertNotIncludes(projectsSecurityAssessment, '**Production Ready**: ❌ NO → ✅ YES (security hardened)', 'Projects security assessment stale production-ready metadata');
  assertNotIncludes(projectsUxAssessment, '**Production Ready**: ⚠️ NEEDS IMPROVEMENT → ✅ YES (UX polished)', 'Projects UX assessment stale production-ready metadata');
  assertNotIncludes(projectsAiImageGenerationAssessment, '**Production Ready**: ✅ YES', 'Projects AI image generation assessment stale production-ready metadata');
  assertNotIncludes(projectsAiImageGenerationAssessment, '| **Code Quality**       | ✅ PRODUCTION READY |', 'Projects AI image generation assessment stale production-ready code-quality row');
  assertNotIncludes(projectsAiImageGenerationAssessment, '**Status**: ✅ **PRODUCTION READY** - Feature can launch immediately', 'Projects AI image generation assessment stale launch approval footer');
  assertNotIncludes(projectsAiImageGenerationAssessment, 'post-launch implementation', 'Projects AI image generation assessment stale post-launch wording');
  assertNotIncludes(projectsImageEditingAssessment, '**Production Ready**: ✅ **YES** (After Firebase rules deployment)', 'Projects image editing assessment stale production-ready metadata');
  assertNotIncludes(projectsImageEditingAssessment, '**Status**: ✅ **PRODUCTION READY**', 'Projects image editing assessment stale production-ready section status');
  assertNotIncludes(projectsImageEditingAssessment, '**After deployment**: Feature is 100% production ready! ✅', 'Projects image editing assessment stale post-deploy launch claim');
  assertNotIncludes(projectsImageEditingAssessment, '**Grade**: **A-** (Production Ready after deployment)', 'Projects image editing assessment stale production-ready grade');
  assertNotIncludes(projectsImageEditingAssessment, '**Overall Grade**: **A-** - Production ready with minor enhancements needed', 'Projects image editing assessment stale production-ready overall grade');
  assertNotIncludes(projectsB2bViewAssessment, '**Production Ready**: ⚠️ NEEDS REVIEW', 'Projects B2B view assessment stale production-ready metadata');
  assertNotIncludes(projectsManagementAssessment, '**Production Ready**: ✅ **YES** (All P0 items completed)', 'Projects management assessment stale production-ready metadata');
  assertNotIncludes(projectsManagementAssessment, '**Ready for Production**: ✅ **YES**', 'Projects management assessment stale ready-for-production section');
  assertNotIncludes(projectsManagementAssessment, '**Grade**: **A-** (Production Ready)', 'Projects management assessment stale production-ready grade');
  assertNotIncludes(projectsManagementAssessment, '**Final Status**: ✅ **PRODUCTION READY**', 'Projects management assessment stale final production-ready status');
  assertNotIncludes(menuJobQueueAssessment, '> **Status:** Production Ready', 'Projects menu job queue implementation stale production-ready status');
  assertNotIncludes(serverSideDataProcessingArchitecture, 'make it production-ready', 'Projects server-side data processing ADR stale production-ready implementation claim');
  assertIncludes(developmentDoneReadme, 'Historical implementation ledger; not current launch certification', 'Projects development_done README historical launch boundary');
  assertIncludes(developmentDoneReadme, 'current Projects source verifiers', 'Projects development_done README current verifier launch gate');
  assertNotIncludes(developmentDoneReadme, '**Production Ready**: Yes', 'Projects development_done README stale production-ready status');
  assertNotIncludes(developmentDoneReadme, '**Production Ready**: ✅ Yes', 'Projects development_done README stale production-ready checked status');
  assertIncludes(developmentDoneUploadImpl, 'Historical upload implementation evidence; not current launch certification', 'Projects development_done upload implementation historical boundary');
  assertIncludes(developmentDoneUploadImpl, 'Current upload release approval requires the active [production-readiness audit]', 'Projects development_done upload implementation current release gate');
  assertIncludes(developmentDoneUploadImpl, '`npm run verify:menu-extraction-pipeline`', 'Projects development_done upload implementation source gate');
  assertIncludes(developmentDoneUploadCrossCheck, 'production-readiness audit', 'Projects development_done upload cross-check audit boundary');
  assertIncludes(developmentDoneUploadCrossCheck, 'External Certification Runbook', 'Projects development_done upload cross-check external certification boundary');
  assertIncludes(uploadTestingGuide, 'Historical upload manual-testing guide; not current launch certification', 'Projects development_done upload testing guide historical boundary');
  assertIncludes(uploadTestingGuide, 'current release approval comes from the active audit/runbook gates', 'Projects development_done upload testing guide current release gate');
  assertIncludes(uploadTestingGuide, '`npm run verify:menu-extraction-pipeline`', 'Projects development_done upload testing guide source gate');
  assertIncludes(developmentDoneAiExtractionImpl, 'Historical AI extraction implementation evidence; not current launch certification', 'Projects development_done AI extraction historical boundary');
  assertIncludes(developmentDoneAiExtractionImpl, '`npm run verify:menu-extraction-pipeline`', 'Projects development_done AI extraction current verifier gate');
  assertNotIncludes(developmentDoneAiExtractionImpl, '**Production Ready**: ✅ YES (after testing)', 'Projects development_done AI extraction stale production-ready status');
  assertIncludes(editorCompletionDevelopmentNote, 'Historical editor UX implementation evidence; not current launch certification', 'Editor completion development note launch boundary status');
  assertIncludes(editorCompletionDevelopmentNote, 'browser/mobile editor QA', 'Editor completion development note editor QA launch gate');
  assertIncludes(editorCompletionDevelopmentNote, 'publish/cache evidence for edited public truth', 'Editor completion development note public truth cache launch gate');
  assertNotIncludes(editorCompletionDevelopmentNote, '**Status**: 🟢 **PRODUCTION READY**', 'Editor completion development note stale production-ready section status');
  assertNotIncludes(editorCompletionDevelopmentNote, '**Status**: ✅ **READY FOR PRODUCTION**', 'Editor completion development note stale ready-for-production footer');
  assertNotIncludes(editorCompletionDevelopmentNote, 'bulk ops post-launch', 'Editor completion development note stale post-launch wording');
  assertIncludes(developmentDoneSecurityImpl, 'Historical security implementation evidence; not current launch certification', 'Projects development_done security historical boundary');
  assertIncludes(developmentDoneSecurityImpl, 'current Projects API/security verifiers', 'Projects development_done security current verifier gate');
  assertNotIncludes(developmentDoneSecurityImpl, '**Production Ready**: ✅ **YES**', 'Projects development_done security stale production-ready status');
  assertNotIncludes(developmentDoneSecurityImpl, 'Ready for immediate deployment', 'Projects development_done security stale immediate deployment claim');
  assertNotIncludes(developmentDoneSecurityImpl, '**Status**: ✅ Production Ready', 'Projects development_done security stale footer production-ready status');
  assertIncludes(aiExtractionTestingGuide, 'Launch Certification Testing Checklist', 'AI extraction testing guide launch certification checklist heading');
  assertNotIncludes(aiExtractionTestingGuide, 'Before marking as production-ready:', 'AI extraction testing guide stale production-ready checklist intro');
  assertIncludes(trustSecurityPageDoc, 'Historical page-build record; not current launch certification', 'Trust/security page historical evidence boundary');
  assertIncludes(trustSecurityPageDoc, 'Do not treat this page-build note as proof of full MenuList launch readiness.', 'Trust/security page launch approval boundary');
  assertNotIncludes(trustSecurityPageDoc, '**Status:** ✅ **COMPLETE & PRODUCTION READY**', 'Trust/security page stale production-ready status');
  assertNotIncludes(trustSecurityPageDoc, '**Ready for Production: YES!**', 'Trust/security page stale footer production-ready status');
  assertNotIncludes(trustSecurityPageDoc, 'production-ready React/TypeScript', 'Trust/security page stale production-ready implementation claim');
  assertIncludes(profileModalRedesignDoc, 'Implemented source evidence; not current launch certification', 'Profile modal redesign launch boundary status');
  assertIncludes(profileModalRedesignDoc, 'auth/profile API source review', 'Profile modal redesign auth/profile launch gate');
  assertIncludes(profileModalRedesignDoc, 'permission-boundary checks', 'Profile modal redesign permission-boundary launch gate');
  assertNotIncludes(profileModalRedesignDoc, 'The profile modal is now production-ready!', 'Profile modal redesign stale production-ready footer');
  assertIncludes(networkStatusMonitoringDoc, 'Implemented source evidence; not current launch certification', 'Network status monitoring launch boundary status');
  assertIncludes(networkStatusMonitoringDoc, 'browser/device QA for offline and slow-network behavior', 'Network status monitoring browser/device QA boundary');
  assertIncludes(networkStatusMonitoringDoc, 'target-shell smoke for every product that mounts the provider', 'Network status monitoring product-shell launch boundary');
  assertNotIncludes(networkStatusMonitoringDoc, '**Status**: ✅ Production Ready', 'Network status monitoring stale production-ready status');
  assertNotIncludes(networkStatusMonitoringDoc, 'Network monitoring is now active! The app will automatically handle poor connectivity.', 'Network status monitoring stale launch-certification footer');
  assertIncludes(networkStatusHook, 'navigator.onLine', 'Network status hook online/offline source evidence');
  assertIncludes(networkStatusHook, "connection.addEventListener('change', updateNetworkStatus);", 'Network status hook connection-change source evidence');
  assertIncludes(networkStatusHook, 'downlink !== undefined && downlink < 1', 'Network status hook slow downlink threshold');
  assertIncludes(networkStatusHook, 'rtt !== undefined && rtt > 500', 'Network status hook slow RTT threshold');
  assertIncludes(networkStatusProvider, 'role="status"', 'Network status provider non-blocking status notice');
  assertIncludes(networkStatusProvider, 'You can keep reviewing this screen.', 'Network status provider offline continuation boundary');
  assertIncludes(networkStatusProvider, 'You can keep working.', 'Network status provider slow-network continuation boundary');
  assertNotIncludes(networkStatusProvider, '<Modal', 'Network status provider must not block owner workflows');
  assertNotIncludes(networkStatusProvider, "fetch('/favicon.ico'", 'Network status provider must not trust a cacheable favicon probe');
  assertIncludes(layoutWrapper, '<NetworkStatusProvider>', 'MenuList layout mounts network status provider');
  assertIncludes(campaignCueLayout, '<NetworkStatusProvider>', 'CampaignCue layout mounts shared network status provider');
  assertIncludes(clientMenuReadme, 'Implemented customer-facing menu documentation; not current launch certification', 'Client menu README launch boundary status');
  assertIncludes(clientMenuReadme, 'Digital Menu Output Constitution checks', 'Client menu README digital menu output launch gate');
  assertNotIncludes(clientMenuReadme, '**Status:** ✅ Production Ready', 'Client menu README stale production-ready status');
  assertIncludes(clientMenuSpec, 'not current production certification', 'Client menu spec launch certification boundary');
  assertIncludes(clientMenuSpec, 'Digital Menu Output Constitution checks', 'Client menu spec digital menu output launch gate');
  assertNotIncludes(clientMenuSpec, '**Status:** ✅ Production Ready', 'Client menu spec stale header production-ready status');
  assertNotIncludes(clientMenuSpec, '_Document Status: ✅ PRODUCTION READY_', 'Client menu spec stale production-ready status');
  assertIncludes(clientMenuImpl, 'P0 manual/device verification criteria before client-menu launch approval', 'Client menu implementation P0 launch approval boundary');
  assertIncludes(clientMenuImpl, 'External Certification Runbook evidence', 'Client menu implementation external certification boundary');
  assertIncludes(clientMenuImpl, 'Digital Menu Output Constitution checks', 'Client menu implementation digital menu output launch gate');
  assertNotIncludes(clientMenuImpl, '**Status:** ✅ Production Ready', 'Client menu implementation stale header production-ready status');
  assertNotIncludes(clientMenuImpl, 'These are the ONLY verification criteria before declaring production-ready.', 'Client menu implementation stale only-verification claim');
  assertNotIncludes(clientMenuImpl, '_Document Status: ✅ PRODUCTION READY_', 'Client menu implementation stale production-ready status');
  assertIncludes(clientMenuMarketing, 'Marketing evidence - not current launch certification', 'Client menu marketing launch boundary status');
  assertIncludes(clientMenuMarketing, 'External Certification Runbook', 'Client menu marketing external certification boundary');
  assertIncludes(clientMenuMarketing, 'Digital Menu Output Constitution checks', 'Client menu marketing output launch gate');
  assertNotIncludes(clientMenuMarketing, '**Status:** ✅ Ready for Use', 'Client menu marketing stale ready-for-use header status');
  assertNotIncludes(clientMenuMarketing, '_Document Status: ✅ READY FOR USE_', 'Client menu marketing stale ready-for-use footer status');
  assertNotIncludes(clientMenuMarketing, 'Smart recommendations', 'Client menu marketing stale smart-recommendations copy');
  assertNotIncludes(clientMenuMarketing, 'Our AI extracts items and prices', 'Client menu marketing stale AI extraction setup copy');
  for (const [label, content] of [
    ['Client menu Firebase cost doc', clientMenuFirebase],
    ['Client menu AutoSell Firebase cost doc', clientMenuAutosellFirebase],
    ['Client menu analytics Firebase cost doc', clientMenuAnalyticsFirebase],
  ]) {
    assertIncludes(content, 'not current launch certification', `${label} launch boundary status`);
    assertIncludes(content, 'External Certification Runbook', `${label} external certification boundary`);
    assertNotIncludes(content, '**Status:** ✅ Production Ready', `${label} stale production-ready status`);
  }
  assertIncludes(b2cMenuLayoutConstitution, 'Historical implementation note; not current launch certification', 'B2C menu layout constitution historical launch boundary');
  assertIncludes(b2cMenuLayoutConstitution, 'Digital Menu Output Constitution checks', 'B2C menu layout constitution output launch gate');
  assertNotIncludes(b2cMenuLayoutConstitution, '**Status:** ✅ PRODUCTION READY', 'B2C menu layout constitution stale production-ready status');
  assertIncludes(menuEditorPhase4Advanced, 'historical implementation evidence only', 'Menu editor Phase 4 historical launch boundary');
  assertIncludes(menuEditorPhase4Advanced, 'Digital Menu Output Constitution checks', 'Menu editor Phase 4 output launch gate');
  assertNotIncludes(menuEditorPhase4Advanced, '**Phase 4 = SHIP READY** ✅', 'Menu editor Phase 4 stale ship-ready status');
  for (const [label, content] of [
    ['B2C view README', b2cViewReadme],
    ['B2C view spec', b2cViewSpec],
    ['B2C view implementation', b2cViewImpl],
  ]) {
    assertIncludes(content, 'not current launch certification', `${label} launch boundary status`);
    assertIncludes(content, 'External Certification Runbook', `${label} external certification boundary`);
    assertIncludes(content, 'Digital Menu Output Constitution checks', `${label} digital menu output launch gate`);
    assertNotIncludes(content, '**Status:** ✅ Production Ready', `${label} stale header production-ready status`);
    assertNotIncludes(content, '_Document Status: ✅ PRODUCTION READY_', `${label} stale footer production-ready status`);
  }
  assertIncludes(b2cViewMarketing, 'Marketing evidence - not current launch certification', 'B2C view marketing launch boundary status');
  assertIncludes(b2cViewMarketing, 'Digital Menu Output Constitution checks', 'B2C view marketing output launch gate');
  assertNotIncludes(b2cViewMarketing, '_Document Status: ✅ READY FOR USE_', 'B2C view marketing stale ready-for-use status');
  assertIncludes(b2cViewAssessment, 'Historical assessment result only; not current launch certification', 'B2C view assessment historical boundary');
  assertIncludes(b2cViewAssessment, 'browser/mobile customer-menu QA', 'B2C view assessment browser/mobile QA boundary');
  assertNotIncludes(b2cViewAssessment, '**Production Ready**: ✅ READY', 'B2C view assessment stale production-ready status');
  assertNotIncludes(b2cViewAssessment, 'Core functionality is production-ready.', 'B2C view assessment stale production-ready result');
  assertNotIncludes(b2cViewAssessment, '**Result**: ✅ **PRODUCTION READY**', 'B2C view assessment stale production-ready final result');
  assertNotIncludes(b2cViewAssessment, 'P1 post-launch', 'B2C view assessment stale post-launch wording');
  for (const [label, content] of [
    ['Description generation spec', descriptionGenerationSpec],
    ['Description generation implementation', descriptionGenerationImpl],
  ]) {
    assertIncludes(content, 'not current launch certification', `${label} launch boundary status`);
    assertIncludes(content, 'External Certification Runbook', `${label} external certification boundary`);
    assertIncludes(content, 'target feature-flag/provider review', `${label} feature/provider launch gate`);
    assertIncludes(content, 'AI accounting/source gates', `${label} AI accounting launch gate`);
    assertNotIncludes(content, '**Status:** ✅ Production Ready', `${label} stale header production-ready status`);
    assertNotIncludes(content, '_Document Status: ✅ PRODUCTION READY_', `${label} stale footer production-ready status`);
  }
  assertIncludes(descriptionGenerationReadme, 'Implemented source evidence; not current launch certification', 'Description generation README launch boundary status');
  assertIncludes(descriptionGenerationReadme, 'AI accounting/source gates', 'Description generation README AI accounting launch gate');
  assertNotIncludes(descriptionGenerationReadme, '> **Status:** ✅ Production Ready', 'Description generation README stale production-ready status');
  assertIncludes(descriptionGenerationFirebase, 'Firebase cost evidence; not current launch certification', 'Description generation Firebase launch boundary status');
  assertIncludes(descriptionGenerationFirebase, 'provider smoke', 'Description generation Firebase provider smoke boundary');
  assertNotIncludes(descriptionGenerationFirebase, '**Status:** ✅ Production Ready', 'Description generation Firebase stale production-ready status');
  assertIncludes(descriptionGenerationWebsite, 'Source-backed website draft; not current publication or launch certification', 'Description generation website launch boundary status');
  assertIncludes(descriptionGenerationWebsite, 'Current Website/Launch Boundary', 'Description generation website current launch boundary heading');
  assertIncludes(descriptionGenerationWebsite, 'External Certification Runbook evidence', 'Description generation website external certification boundary');
  assertIncludes(descriptionGenerationWebsite, '`npm run verify:agent-readiness`', 'Description generation website agent-readiness source gate');
  assertIncludes(descriptionGenerationWebsite, '`npm run verify:ai-accounting`', 'Description generation website AI accounting source gate');
  assertIncludes(descriptionGenerationWebsite, 'Description suggestions for selected menu items', 'Description generation website selected-items copy');
  assertIncludes(descriptionGenerationWebsite, 'save the approved descriptions before publishing', 'Description generation website approved-description boundary');
  assertIncludes(descriptionGenerationMarketing, 'Historical marketing draft; not current sales, publication, or launch certification', 'Description generation marketing launch boundary status');
  assertIncludes(descriptionGenerationMarketing, 'Current Sales/Launch Boundary', 'Description generation marketing current sales boundary heading');
  assertIncludes(descriptionGenerationMarketing, 'npm run verify:agent-readiness', 'Description generation marketing agent-readiness source gate');
  assertIncludes(descriptionGenerationMarketing, 'npm run verify:ai-accounting', 'Description generation marketing AI accounting source gate');
  assertIncludes(descriptionGenerationMarketing, 'Target feature-flag/provider review', 'Description generation marketing provider review boundary');
  assertIncludes(descriptionGenerationMarketing, 'Authenticated desktop/mobile editor QA', 'Description generation marketing browser/mobile editor QA boundary');
  assertIncludes(descriptionGenerationMarketing, 'menu description drafts for owner review before publishing', 'Description generation marketing review-draft boundary');
  assertIncludes(descriptionGenerationMarketing, 'Owner-reviewed wording', 'Description generation marketing owner-review wording');
  assertIncludes(descriptionGenerationHelpdoc, 'Prepare description drafts for selected menu items.', 'Description generation helpdoc draft boundary');
  assertIncludes(descriptionGenerationHelpdoc, 'save only the approved descriptions before publishing', 'Description generation helpdoc approved publish boundary');
  assertIncludes(descriptionGenerationHelpdoc, 'timing depends on provider status, item count, and current system conditions', 'Description generation helpdoc timing boundary');
  assertIncludes(descriptionGenerationHelpdoc, 'Description drafts follow the languages configured for the project and the current release behavior', 'Description generation helpdoc language boundary');
  assertIncludes(descriptionGenerationHelpdoc, 'The route is rate-limited to protect credits and provider capacity.', 'Description generation helpdoc rate-limit boundary');
  [
    'Professional, appetizing descriptions for every item',
    'Generated in seconds',
    'generated in seconds',
    'Professional, appetizing text for every item',
    'Click once, and every item gets',
    'Descriptions are generated in all your menu',
    'Consistent, appetizing language across your entire menu',
    'Generate professional menu item descriptions automatically',
    'instantly ready',
    'automatically prepares professional descriptions',
    'your entire menu',
    '50 menu items',
    '5-10 minutes per item',
    'Descriptions prepared in seconds',
    'Copywriter-quality',
    'Same quality in all your project languages',
    'Descriptions ready in seconds',
    'All languages at once',
    'All generated simultaneously',
    '50 items prepared in minutes',
    'Professional descriptions in three languages',
    "I didn't have to write a word",
    'Demo Script (90 seconds)',
    '20 items',
    'every item now has a professional description',
    'same quality, culturally appropriate',
    'ready as-is',
    'Seconds per item',
    'ready-to-use',
    'Automatically generate professional descriptions for your menu items',
    'Works for items without descriptions or to rewrite all descriptions at once',
    'descriptions are generated in ALL languages at once',
    'No extra steps needed',
    'Limit is 5 requests per minute',
    "they're created simultaneously",
    'Translate your entire menu',
  ].forEach((staleClaim) => {
    assertNotIncludes(descriptionGenerationWebsite, staleClaim, 'Description generation website stale speed/every-item claim');
    assertNotIncludes(descriptionGenerationMarketing, staleClaim, 'Description generation marketing stale speed/every-item claim');
    assertNotIncludes(descriptionGenerationHelpdoc, staleClaim, 'Description generation helpdoc stale speed/every-item claim');
  });
  assertIncludes(productionReadinessAudit, 'Description Generation website speed/every-item copy checkpoint', 'Production readiness audit description generation website checkpoint');
  assertIncludes(productionReadinessAudit, 'Description Generation helpdoc speed/language/full-rewrite copy checkpoint', 'Production readiness audit description generation helpdoc checkpoint');
  assertIncludes(changelog, 'Description Generation Website Speed Every-Item Copy Boundary', 'Changelog description generation website checkpoint');
  assertIncludes(changelog, 'Description Generation Helpdoc Speed Language Full-Rewrite Copy Boundary', 'Changelog description generation helpdoc checkpoint');
  assertNotIncludes(descriptionGenerationMarketing, '_Document Status: ✅ READY FOR USE_', 'Description generation marketing stale ready-for-use status');
  assertIncludes(descriptionGenerationProductionAudit, 'Historical code-audit evidence; not current launch certification', 'Description generation production audit historical boundary');
  assertIncludes(descriptionGenerationProductionAudit, 'Historical Code-Audit Result', 'Description generation production audit historical result section');
  assertIncludes(descriptionGenerationProductionAudit, '| Overall               | 9.5/10 | Historical code-audit score; not current launch certification |', 'Description generation production audit table historical boundary');
  assertNotIncludes(descriptionGenerationProductionAudit, '**Verdict: GO - Production Ready**', 'Description generation production audit stale production-ready verdict');
  assertNotIncludes(descriptionGenerationProductionAudit, '| Overall               | 9.5/10 | Production ready', 'Description generation production audit stale production-ready table verdict');
  assertIncludes(descriptionGenerationAssessment, 'Historical assessment result only; not current launch certification', 'Description generation assessment historical boundary');
  assertIncludes(descriptionGenerationAssessment, 'Do not treat this assessment as current production deployment approval', 'Description generation assessment launch approval boundary');
  assertNotIncludes(descriptionGenerationAssessment, 'Ready for production testing ✅', 'Description generation assessment stale production-testing status');
  assertNotIncludes(descriptionGenerationAssessment, '**Ready for Production**: ✅ **YES**', 'Description generation assessment stale ready-for-production verdict');
  assertNotIncludes(descriptionGenerationAssessment, '**Final Status**: ✅ **PRODUCTION READY**', 'Description generation assessment stale final production-ready status');
  for (const [label, content] of [
    ['Multi-language translation spec', multiLanguageTranslationSpec],
    ['Multi-language translation implementation', multiLanguageTranslationImpl],
  ]) {
    assertIncludes(content, 'not current launch certification', `${label} launch boundary status`);
    assertIncludes(content, 'External Certification Runbook', `${label} external certification boundary`);
    assertIncludes(content, 'translated menu flows', `${label} translated-flow launch gate`);
    assertIncludes(content, 'public renderer fallback/RTL evidence', `${label} renderer/RTL launch gate`);
    assertNotIncludes(content, '> **Status:** ✅ Production Ready', `${label} stale header production-ready status`);
    assertNotIncludes(content, '_Document Status: ✅ PRODUCTION READY_', `${label} stale footer production-ready status`);
  }
  assertIncludes(multiLanguageTranslationMarketing, 'Historical marketing draft; not current sales, publication, or launch certification', 'Multi-language translation marketing launch boundary status');
  assertIncludes(multiLanguageTranslationMarketing, 'Current Sales/Launch Boundary', 'Multi-language translation marketing current sales boundary heading');
  assertIncludes(multiLanguageTranslationMarketing, 'npm run verify:agent-readiness', 'Multi-language translation marketing source gate');
  assertIncludes(multiLanguageTranslationMarketing, 'Public renderer fallback/RTL evidence', 'Multi-language translation marketing renderer/RTL boundary');
  assertIncludes(multiLanguageTranslationMarketing, 'Customer-menu browser/device QA', 'Multi-language translation marketing customer-menu QA boundary');
  assertIncludes(multiLanguageTranslationWebsite, 'Source-backed website draft; not current publication or launch certification', 'Multi-language translation website launch boundary status');
  assertIncludes(multiLanguageTranslationWebsite, 'Current Website/Launch Boundary', 'Multi-language translation website launch boundary heading');
  assertIncludes(multiLanguageTranslationWebsite, '`npm run verify:agent-readiness`', 'Multi-language translation website source gate');
  assertIncludes(multiLanguageTranslationWebsite, 'public renderer fallback/RTL evidence', 'Multi-language translation website renderer/RTL boundary');
  assertIncludes(multiLanguageTranslationWebsite, 'customer-menu browser/device QA', 'Multi-language translation website customer-menu QA boundary');
  assertIncludes(multiLanguageTranslationWebsite, 'Prepare customer-language menu drafts from the approved source', 'Multi-language translation website approved-source copy');
  assertIncludes(multiLanguageTranslationWebsite, 'publish only the approved output', 'Multi-language translation website review-before-publish copy');
  assertIncludes(multiLanguageTranslationMarketing, 'Prepare customer-language menu drafts from the approved menu source', 'Multi-language translation marketing approved-source copy');
  assertIncludes(multiLanguageTranslationMarketing, 'Translated drafts for supported project languages', 'Multi-language translation marketing supported-language boundary');
  [
    'Your menu in 90+ languages',
    'translated in seconds',
    'translates your entire menu',
    '90+ languages automatically',
    'Add Spanish, Arabic, Hindi—any language—with one click',
    'Add a language in seconds',
    'Same quality across all languages',
    'Serve **every customer in their language**',
    '| Time              | Days/weeks       | Seconds',
    '| Updates           | Re-hire          | One click',
    '| Consistency       | Varies           | Uniform',
    '| Effort       | Copy each item    | One click for all',
    '41 languages, one click',
    'AI translation in seconds',
    'AI translation into 41 languages',
    'Add Spanish, Arabic, Hindi—in seconds',
    '41 Languages',
    'All languages at once',
    'tourist orders doubled',
    'customers order 20-30% more',
    'Demo Script (90 seconds)',
    'complete menu with 20 items',
    '10 seconds for 20 items',
    'every item translated',
    '41 languages, one click each',
    'Show 41 languages',
    '10-15 sec video',
    '| Languages supported    | 41',
    '| Translation time       | 10 seconds/file',
    'Add languages to your digital menu with one click',
    'localizes your digital menu into any language automatically',
    'Your entire menu — every item, every description, every category',
    'Translating 48 items',
    'switch instantly',
    'Translate your restaurant menu into any language automatically',
    'Translates automatically',
  ].forEach((staleClaim) => {
    assertNotIncludes(multiLanguageTranslationWebsite, staleClaim, 'Multi-language translation website stale speed/language-count claim');
    assertNotIncludes(multiLanguageTranslationMarketing, staleClaim, 'Multi-language translation marketing stale speed/language-count claim');
  });
  assertIncludes(productionReadinessAudit, 'Multi-Language Translation website speed/language-count copy checkpoint', 'Production readiness audit multi-language website checkpoint');
  assertIncludes(changelog, 'Multi-Language Translation Website Speed Language-Count Copy Boundary', 'Changelog multi-language website checkpoint');
  assertNotIncludes(multiLanguageTranslationMarketing, '_Document Status: ✅ READY FOR USE_', 'Multi-language translation marketing stale ready-for-use status');
  for (const [label, content] of [
    ['Data editor README', dataEditorReadme],
    ['Data editor spec', dataEditorSpec],
    ['Data editor implementation', dataEditorImpl],
    ['Data editor Firebase cost doc', dataEditorFirebase],
  ]) {
    assertIncludes(content, 'not current launch certification', `${label} launch boundary status`);
    assertIncludes(content, 'External Certification Runbook', `${label} external certification boundary`);
    assertIncludes(content, 'browser/mobile editor QA', `${label} editor QA launch gate`);
    assertIncludes(content, 'publish/cache evidence for edited public truth', `${label} public truth cache launch gate`);
    assertNotIncludes(content, '**Status:** ✅ Production Ready', `${label} stale header production-ready status`);
    assertNotIncludes(content, '_Document Status: ✅ PRODUCTION READY_', `${label} stale footer production-ready status`);
  }
  assertIncludes(dataEditorMarketing, 'Marketing evidence - not current launch certification', 'Data editor marketing launch boundary status');
  assertIncludes(dataEditorMarketing, 'publish/cache evidence for edited public truth', 'Data editor marketing public truth launch gate');
  assertNotIncludes(dataEditorMarketing, '_Document Status: ✅ READY FOR USE_', 'Data editor marketing stale ready-for-use status');
  assertIncludes(dataEditorAssessment, 'Historical assessment result only; not current launch certification', 'Data editor assessment historical boundary');
  assertIncludes(dataEditorAssessment, 'publish/cache evidence for edited public truth', 'Data editor assessment public truth launch gate');
  assertNotIncludes(dataEditorAssessment, '**Production Ready**: ✅ YES', 'Data editor assessment stale production-ready status');
  assertNotIncludes(dataEditorAssessment, '**Status**: ✅ **PRODUCTION READY**', 'Data editor assessment stale production-ready section status');
  assertNotIncludes(dataEditorAssessment, 'post-launch', 'Data editor assessment stale post-launch wording');
  assertIncludes(socialContentReadme, 'Owner generation path: deleted', 'Social content README owner-generation deletion boundary');
  assertIncludes(socialContentImpl, 'not current launch certification', 'Social content implementation launch boundary status');
  assertIncludes(socialContentImpl, 'External Certification Runbook', 'Social content implementation external certification boundary');
  assertIncludes(socialContentImpl, 'Today/mobile/browser QA', 'Social content implementation Today/mobile QA gate');
  assertNotIncludes(socialContentImpl, '**Document Status:** ✅ PRODUCTION READY', 'Social content implementation stale production-ready status');
  assertIncludes(socialContentCodeReview, 'Historical source-review evidence only; not current launch certification', 'Social content code review launch boundary status');
  assertIncludes(socialContentCodeReview, 'External Certification Runbook evidence', 'Social content code review external certification boundary');
  assertIncludes(socialContentCodeReview, 'npm run verify:public-business-truth', 'Social content code review source gate boundary');
  assertIncludes(socialContentCodeReview, 'Today desktop/mobile/browser QA', 'Social content code review Today/browser QA boundary');
  assertNotIncludes(socialContentCodeReview, 'Code is clean and spec-compliant. Production ready.', 'Social content code review stale production-ready signoff');
  assertIncludes(socialContentValidation, 'Historical Validation Report - Social Content (Today Tab)', 'Social content validation historical heading');
  assertIncludes(socialContentValidation, 'Current Release Boundary:', 'Social content validation current release boundary');
  assertIncludes(socialContentValidation, 'Today desktop/mobile/browser QA', 'Social content validation Today/browser QA boundary');
  assertIncludes(socialContentValidation, 'npm run verify:public-business-truth', 'Social content validation source gate boundary');
  assertNotIncludes(socialContentValidation, '# ✅ FINAL PRODUCTION VALIDATION REPORT - Social Content (Today Tab)', 'Social content validation stale final production heading');
  assertNotIncludes(socialContentValidation, '**Status:** ✅ SHIP READY', 'Social content validation stale ship-ready status');
  assertNotIncludes(socialContentValidation, '## 🚀 PRODUCTION QUALITY GATE: PASS', 'Social content validation stale production quality gate');
  assertNotIncludes(socialContentValidation, '**Ready For:** Vercel deploy + SMB testing', 'Social content validation stale Vercel/SMB readiness line');
  assertNotIncludes(socialContentValidation, '**Status:** SHIP READY', 'Social content validation stale final ship-ready status');
  assertIncludes(socialContentStrategy, 'not current launch certification', 'Social content strategy launch boundary status');
  assertIncludes(socialContentStrategy, 'External Certification Runbook', 'Social content strategy external certification boundary');
  assertIncludes(socialContentStrategy, 'npm run verify:agent-readiness', 'Social content strategy agent-readiness source gate');
  assertIncludes(socialContentStrategy, 'npm run verify:public-business-truth', 'Social content strategy public-business-truth source gate');
  assertIncludes(socialContentStrategy, 'Today desktop/mobile/browser QA', 'Social content strategy Today/browser QA boundary');
  assertIncludes(socialContentStrategy, 'Owner generation path: deleted', 'Social content strategy owner-generation deletion boundary');
  assertIncludes(socialContentStrategy, 'Treat QR tent and TV image as separate scoped additions', 'Social content strategy separate-scope wording');
  assertNotIncludes(socialContentStrategy, 'Add QR tent + TV image **post-launch**', 'Social content strategy stale post-launch wording');
  assertNotIncludes(socialContentStrategy, '**Status:** 🔒 **LOCKED — Ready for Implementation**', 'Social content strategy stale locked implementation status');
  assertNotIncludes(socialContentStrategy, '**Document Status:** ✅ Ready for Implementation (3-Year Architecture Freeze)', 'Social content strategy stale implementation-ready footer');
  assertIncludes(socialContentLogicVerification, 'Historical Logic Verification Result: Source Evidence Only', 'Social content logic verification historical verdict boundary');
  assertIncludes(socialContentLogicVerification, 'not current launch certification', 'Social content logic verification launch boundary status');
  assertIncludes(socialContentLogicVerification, 'External Certification Runbook', 'Social content logic verification external certification boundary');
  assertIncludes(socialContentLogicVerification, 'npm run verify:agent-readiness', 'Social content logic verification agent-readiness source gate');
  assertIncludes(socialContentLogicVerification, 'npm run verify:public-business-truth', 'Social content logic verification public-business-truth source gate');
  assertIncludes(socialContentLogicVerification, 'Today desktop/mobile/browser QA', 'Social content logic verification Today/browser QA boundary');
  assertIncludes(socialContentLogicVerification, 'Owner generation path: deleted', 'Social content logic verification owner-generation deletion boundary');
  assertIncludes(socialContentLogicVerification, 'HISTORICAL CODE-READINESS RESULT: SAFE IN JANUARY 2026 REVIEW ONLY', 'Social content logic verification historical code-readiness label');
  assertNotIncludes(socialContentLogicVerification, 'PRODUCTION READINESS: SAFE', 'Social content logic verification stale production-readiness line');
  assertNotIncludes(socialContentLogicVerification, '**Status:** ✅ **DEPLOYABLE**', 'Social content logic verification stale deployable status');
  assertNotIncludes(socialContentLogicVerification, '## FINAL VERDICT: ✅ DEPLOYABLE', 'Social content logic verification stale deployable verdict');
  assertNotIncludes(socialContentLogicVerification, 'Social Content logic verification complete. All 6 flows verified. Zero critical issues.', 'Social content logic verification stale zero-issues certification');
  assertIncludes(posWebhookSyncImpl, 'No unused queue collection or queue type remains in active source', 'POS webhook sync current bounded-delivery scope');
  assertNotIncludes(posWebhookSyncImpl, 'Deferred to post-launch', 'POS webhook sync stale post-launch wording');
  assertIncludes(decisionIntelligenceMarketing, 'not current launch certification', 'Decision Intelligence marketing launch boundary status');
  assertIncludes(decisionIntelligenceMarketing, 'External Certification Runbook', 'Decision Intelligence marketing external certification boundary');
  assertIncludes(decisionIntelligenceMarketing, 'scoped scheduler deploy evidence', 'Decision Intelligence marketing scheduler deploy gate');
  assertNotIncludes(decisionIntelligenceMarketing, '**Status:** ✅ **PRODUCTION READY**', 'Decision Intelligence marketing stale production-ready status');
  assertIncludes(decisionIntelligenceLogicVerification, 'Historical Logic Verification Result: Source Evidence Only', 'Decision Intelligence logic verification historical result boundary');
  assertIncludes(decisionIntelligenceLogicVerification, 'not current launch certification', 'Decision Intelligence logic verification launch boundary status');
  assertIncludes(decisionIntelligenceLogicVerification, 'External Certification Runbook', 'Decision Intelligence logic verification external certification boundary');
  assertIncludes(decisionIntelligenceLogicVerification, 'npm run verify:agent-readiness', 'Decision Intelligence logic verification agent-readiness source gate');
  assertIncludes(decisionIntelligenceLogicVerification, 'npm run verify:functions-deploy-preflight', 'Decision Intelligence logic verification Functions preflight source gate');
  assertIncludes(decisionIntelligenceLogicVerification, 'scoped scheduler deploy evidence', 'Decision Intelligence logic verification scoped scheduler deploy boundary');
  assertIncludes(decisionIntelligenceLogicVerification, 'browser/mobile customer-menu QA', 'Decision Intelligence logic verification browser/mobile QA boundary');
  assertNotIncludes(decisionIntelligenceLogicVerification, '**Status:** ✅ **DEPLOYABLE**', 'Decision Intelligence logic verification stale deployable status');
  assertNotIncludes(decisionIntelligenceLogicVerification, 'PRODUCTION READINESS: SAFE', 'Decision Intelligence logic verification stale production-readiness line');
  assertNotIncludes(decisionIntelligenceLogicVerification, '## FINAL VERDICT: ✅ DEPLOYABLE', 'Decision Intelligence logic verification stale deployable verdict');
  assertNotIncludes(decisionIntelligenceLogicVerification, 'Decision Blocks logic verification complete. All 7 flows verified. Zero critical issues.', 'Decision Intelligence logic verification stale zero-issues certification');
  assertIncludes(internalFeedbackVerification, 'source-verified evidence for the Guest Feedback feature, not standalone production deployment approval', 'Internal feedback verification launch boundary');
  assertIncludes(internalFeedbackVerification, 'Current Launch Boundary', 'Internal feedback verification current launch boundary section');
  assertIncludes(internalFeedbackReadme, 'load claims require current audit evidence before release', 'Internal feedback README load-claim launch boundary');
  assertNotIncludes(internalFeedbackReadme, 'Hardening deferred to post-launch', 'Internal feedback README stale post-launch wording');
  assertNotIncludes(internalFeedbackVerification, 'feature production-ready', 'Internal feedback verification stale production-ready status');
  assertNotIncludes(internalFeedbackVerification, '### Ready for Production', 'Internal feedback verification stale ready-for-production heading');
  assertNotIncludes(internalFeedbackVerification, 'The Internal Feedback System is **ready for production deployment**', 'Internal feedback verification stale deployment approval wording');
  assertIncludes(multiLanguageTranslationVerification, 'source-verified feature evidence, not standalone production deployment approval', 'Multi-language verification launch boundary');
  assertIncludes(multiLanguageTranslationVerification, 'translated menu flows', 'Multi-language verification translated-flow QA boundary');
  assertNotIncludes(multiLanguageTranslationVerification, 'feature is **production-ready** and **well-implemented**', 'Multi-language verification stale production-ready conclusion');
  assertIncludes(multiLanguageTranslationAssessment, 'Historical assessment result only; not current launch certification', 'Multi-language assessment historical launch boundary');
  assertIncludes(multiLanguageTranslationAssessment, 'translated menu flows', 'Multi-language assessment translated-flow QA boundary');
  assertNotIncludes(multiLanguageTranslationAssessment, 'The Multi-Language feature is now **production-ready**', 'Multi-language assessment stale production-ready conclusion');
  assertIncludes(comprehensiveSecurityAudit, 'Historical code-audit snapshot — not current launch certification', 'Comprehensive security audit historical evidence boundary');
  assertIncludes(comprehensiveSecurityAudit, 'Current production approval requires the active production-readiness audit, External Certification Runbook evidence', 'Comprehensive security audit current launch approval boundary');
  assertNotIncludes(comprehensiveSecurityAudit, '**Overall Status**: ✅ **PRODUCTION READY**', 'Comprehensive security audit stale production-ready overall status');
  assertNotIncludes(comprehensiveSecurityAudit, '**Status**: ✅ **PRODUCTION READY**', 'Comprehensive security audit stale production-ready final status');
  assertNotIncludes(comprehensiveSecurityAudit, '**Recommendation**: **APPROVED FOR PRODUCTION**', 'Comprehensive security audit stale approved-for-production recommendation');
  assertIncludes(launchPrerequisites, '**Launch boundary:** Not current launch certification or deploy approval.', 'Launch prerequisites top launch/deploy boundary');
  assertIncludes(launchPrerequisites, '[MenuList Incident Response Runbook](./incident-response-runbook.md)', 'Launch prerequisites incident response stop path');
  assertIncludes(launchPrerequisites, 'production readiness still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.', 'Launch prerequisites top current evidence boundary');
  assertIncludes(launchPrerequisites, 'Current operator blocker refreshed August 1, 2026: Firebase CLI is not authenticated', 'Launch prerequisites current Firebase deploy blocker timestamp and class');
  assertIncludes(launchPrerequisites, 'Historical July 9, 2026 evidence: the last authenticated package-local scoped retry `npm --prefix functions run deploy:menulist-qa` targeted `functions:processMenuImages,functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:messagingOnboarding,functions:backfillStoresSummary,functions:mapsPlaceCheck,functions:verifyMenuPublish`, passed predeploy lint/build', 'Launch prerequisites historical scoped deploy blocker set');
  assertIncludes(launchPrerequisites, 'firebase deploy --project menulist-qa --config firebase.json --only functions:menulistMaintenanceScheduler --non-interactive', 'Launch prerequisites latest scoped scheduler deploy retry command');
  assertNotIncludes(launchPrerequisites, 'firebase deploy --only functions:menulistMaintenanceScheduler --project menulist-qa\n', 'Launch prerequisites stale scheduler deploy command without config/non-interactive');
  assertIncludes(launchPrerequisites, 'Error: Request to https://cloudresourcemanager.googleapis.com/v1/projects/menulist-qa had HTTP Error: 403, The caller does not have permission', 'Launch prerequisites latest Cloud Resource Manager blocker');
  assertIncludes(launchPrerequisites, 'Deploy Functions blocker set', 'Launch prerequisites summary scoped Functions deploy wording');
  assertIncludes(launchPrerequisites, 'the current August 1 operator attempt stops before predeploy because Firebase CLI is not authenticated', 'Launch prerequisites summary current Functions blocker evidence');
  assertIncludes(launchPrerequisites, 'The last authenticated package-local scoped retry `npm --prefix functions run deploy:menulist-qa` targeted the current Gate 1 function set, completed predeploy lint/build', 'Launch prerequisites summary historical Functions blocker evidence');
  assertIncludes(launchPrerequisites, 'then retry the documented scoped Firebase Functions target set or the exact changed subset being certified', 'Launch prerequisites summary scoped Functions deploy target');
  assertIncludes(launchPrerequisites, 'Deploy Storage rules cutover', 'Launch prerequisites summary Storage deploy wording');
  assertIncludes(launchPrerequisites, 'the current August 1 operator attempt stops before upload because Firebase CLI is not authenticated; the last authenticated `menulist-qa` deploy failed before rules upload with Service Usage HTTP 403 project access/availability blocker', 'Launch prerequisites summary current and historical Storage blocker evidence');
  assertNotIncludes(launchPrerequisites, '| Deploy functions              | ❌ Manual  | `firebase deploy --only functions`             |', 'Launch prerequisites broad Functions deploy summary row');
  assertIncludes(launchPrerequisites, '| Confirm feature flag evidence | ☐ Pre-prod verify | Check current `src/config/features.ts` source state, target secrets/provider setup, scoped deploy evidence, and External Certification Runbook evidence. Do not treat three code lines as launch approval. |', 'Launch prerequisites feature flag evidence row');
  assertNotIncludes(launchPrerequisites, '| Enable feature flags          | ❌ Manual  | 3 lines in features.ts                         |', 'Launch prerequisites stale feature flag activation row');
  assertIncludes(launchPrerequisites, 'firebase deploy --only firestore:indexes --project menulist-qa --config firebase.json', 'Launch prerequisites scoped QA Firestore indexes deploy command');
  assertIncludes(launchPrerequisites, 'Production index deploy requires QA evidence and explicit production approval.', 'Launch prerequisites production index approval gate');
  assertNotIncludes(launchPrerequisites, 'firebase deploy --only firestore:indexes\n', 'Launch prerequisites broad Firestore indexes deploy command');
  assertIncludes(launchPrerequisites, 'production send-out still needs final channel configuration and deploy evidence before launch', 'Launch prerequisites platform alert deploy evidence boundary');
  assertIncludes(launchPrerequisites, 'Store Telegram secrets in QA first.', 'Launch prerequisites top Telegram QA-first secret setup');
  assertIncludes(launchPrerequisites, 'Store SMTP secrets in QA first.', 'Launch prerequisites top SMTP QA-first secret setup');
  assertIncludes(launchPrerequisites, 'Create the missing Secret Manager values in QA first', 'Launch prerequisites platform alert QA-first secret setup');
  assertIncludes(launchPrerequisites, 'firebase functions:secrets:set TELEGRAM_BOT_TOKEN --project menulist-qa', 'Launch prerequisites platform alert QA Telegram secret command');
  assertIncludes(launchPrerequisites, 'firebase functions:secrets:set SMTP_PASS --project menulist-qa', 'Launch prerequisites platform alert QA SMTP secret command');
  assertIncludes(launchPrerequisites, 'After QA alert delivery evidence and explicit production secret approval, repeat', 'Launch prerequisites platform alert production secret approval gate');
  assertNotIncludes(launchPrerequisites, 'firebase functions:secrets:set TELEGRAM_BOT_TOKEN\n', 'Launch prerequisites unscoped Telegram bot secret command');
  assertNotIncludes(launchPrerequisites, 'firebase functions:secrets:set TELEGRAM_CHAT_ID\n', 'Launch prerequisites unscoped Telegram chat secret command');
  assertNotIncludes(launchPrerequisites, 'firebase functions:secrets:set SMTP_HOST\n', 'Launch prerequisites unscoped SMTP host secret command');
  assertNotIncludes(launchPrerequisites, 'firebase functions:secrets:set SMTP_PASS\n', 'Launch prerequisites unscoped SMTP password secret command');
  assertNotIncludes(launchPrerequisites, 'firebase functions:secrets:set TELEGRAM_BOT_TOKEN --project menulist\nfirebase functions:secrets:set TELEGRAM_CHAT_ID --project menulist\nfirebase functions:secrets:set SMTP_HOST --project menulist\nfirebase functions:secrets:set SMTP_PORT --project menulist\nfirebase functions:secrets:set SMTP_USER --project menulist\nfirebase functions:secrets:set SMTP_PASS --project menulist', 'Launch prerequisites direct production platform alert secret block');
  assertIncludes(launchPrerequisites, 'Redeploy the affected Firebase Functions to QA first, then production only after QA evidence and explicit production deploy approval', 'Launch prerequisites platform alert QA-first deploy wording');
  assertIncludes(launchPrerequisites, 'npm run verify:functions-deploy-preflight', 'Launch prerequisites platform alert Functions preflight');
  assertIncludes(launchPrerequisites, 'firebase deploy --project menulist-qa --config firebase.json --only functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler,functions:triggerDecisionBlocksScoring,functions:verifyMenuPublish,functions:forceRepublish,functions:gcpBudgetAlertWebhook,functions:messagingOnboarding,functions:msgExtractionWatcher --non-interactive', 'Launch prerequisites platform alert QA deploy command');
  assertIncludes(launchPrerequisites, 'After QA evidence and explicit production deploy approval', 'Launch prerequisites platform alert production approval gate');
  assertIncludes(launchPrerequisites, 'Record the exact widened target list and reason in `__docs__/audits/menulist-production-readiness-audit.md` if this Step 7B list differs from Gate 1', 'Launch prerequisites platform alert widened target audit requirement');
  assertNotIncludes(launchPrerequisites, 'firebase deploy --only functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler,functions:triggerDecisionBlocksScoring,functions:verifyMenuPublish,functions:forceRepublish,functions:gcpBudgetAlertWebhook,functions:messagingOnboarding,functions:msgExtractionWatcher --project menulist\n', 'Launch prerequisites direct production platform alert deploy command');
  for (const [label, content] of [
    ['Ops infrastructure guide', opsInfrastructureGuide],
    ['Ops alerting delivery implementation', opsAlertingDeliveryImpl],
  ]) {
    assertIncludes(content, 'firebase functions:secrets:set TELEGRAM_BOT_TOKEN --project menulist-qa', `${label} QA Telegram bot secret command`);
    assertIncludes(content, 'firebase functions:secrets:set TELEGRAM_CHAT_ID --project menulist-qa', `${label} QA Telegram chat secret command`);
    assertIncludes(content, 'Production values require QA alert-delivery evidence and explicit production secret approval', `${label} production Telegram secret approval gate`);
    assertNotIncludes(content, 'firebase functions:secrets:set TELEGRAM_BOT_TOKEN\n', `${label} unscoped Telegram bot secret command`);
    assertNotIncludes(content, 'firebase functions:secrets:set TELEGRAM_CHAT_ID\n', `${label} unscoped Telegram chat secret command`);
  }
  assertIncludes(productionCertificationRunbook, 'firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:messagingOnboarding,functions:backfillStoresSummary,functions:mapsPlaceCheck,functions:verifyMenuPublish --non-interactive', 'Production certification runbook current blocked function deploy set');
  assertIncludes(productionCertificationRunbook, 'source-file path hardening slice changes the shared Functions temp-file helper', 'Production certification runbook source-file path hardening subset note');
  assertIncludes(productionCertificationRunbook, 'firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:startGeneration,functions:embedArticleWorker,functions:regenerateEmbedding --non-interactive', 'Production certification runbook source-file path hardening scoped retry command');
  assertIncludes(productionCertificationRunbook, 'Founder Monitor scheduler slice changes `functions/src/schedulers/founderMonitorSnapshot.ts` and `functions/src/schedulers/menulistMaintenanceScheduler.ts`', 'Production certification runbook Founder Monitor scheduler subset note');
  assertIncludes(productionCertificationRunbook, 'menu extraction SAFE_MODE worker guard changes `functions/src/logic/processMenuImagesJob.ts`', 'Production certification runbook SAFE_MODE worker subset note');
  assertIncludes(productionCertificationRunbook, 'firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImagesJob --non-interactive', 'Production certification runbook SAFE_MODE worker scoped retry command');
  assertIncludes(productionCertificationRunbook, 'scheduler-hour timezone diagnostics slice changes `functions/src/utils/schedulerHour.ts`, which is imported by `functions:messagingOnboarding` and `functions:backfillStoresSummary`', 'Production certification runbook scheduler-hour diagnostics subset note');
  assertIncludes(productionCertificationRunbook, 'firebase deploy --project menulist-qa --config firebase.json --only functions:messagingOnboarding,functions:backfillStoresSummary --non-interactive', 'Production certification runbook scheduler-hour diagnostics scoped retry command');
  assertIncludes(productionCertificationRunbook, 'Maps Place Check raw provider output slice changes `functions/src/logic/mapsPlaceCheck.ts`, which is exported by `functions:mapsPlaceCheck`', 'Production certification runbook Maps Place Check raw provider output subset note');
  assertIncludes(productionCertificationRunbook, 'firebase deploy --project menulist-qa --config firebase.json --only functions:mapsPlaceCheck --non-interactive', 'Production certification runbook Maps Place Check scoped retry command');
  assertIncludes(productionCertificationRunbook, 'owner-notification template-output slice changes `functions/src/messaging/templates.ts`, which is imported by `functions/src/messaging/messagingEngine.ts`', 'Production certification runbook owner-notification template-output subset note');
  assertIncludes(productionCertificationRunbook, 'owner-notification flag/trigger diagnostics slice changes `functions/src/ownerNotifications/processor.ts`, which is dynamically imported by `functions/src/messaging/messagingEngine.ts`', 'Production certification runbook owner-notification flag/trigger diagnostics subset note');
  assertIncludes(productionCertificationRunbook, 'legacy lifecycle event/status diagnostics slice changes `functions/src/messaging/messagingEngine.ts` and is reached by the same exports', 'Production certification runbook legacy lifecycle event/status diagnostics subset note');
  assertIncludes(productionCertificationRunbook, 'firebase deploy --project menulist-qa --config firebase.json --only functions:verifyMenuPublish,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler --non-interactive', 'Production certification runbook owner-notification template-output scoped retry command');
  assertIncludes(productionCertificationRunbook, 'Current operator boundary refreshed August 1, 2026: Firebase CLI is not authenticated', 'Production certification runbook current Functions deploy blocker evidence');
  assertIncludes(productionCertificationRunbook, 'Historical authenticated evidence remains relevant but is not the current operator state: the default package-local scoped set was last retried on July 9 with `npm --prefix functions run deploy:menulist-qa`', 'Production certification runbook historical Functions deploy blocker evidence');
  assertIncludes(productionReadinessAudit, 'External Certification Gate 1 Firebase Functions Deploy Evidence - July 9, 2026', 'Production readiness audit current Functions deploy evidence heading');
  assertIncludes(productionReadinessAudit, 'Command or manual path: `npm run verify:functions-deploy-preflight`; `npm --prefix functions run deploy:menulist-qa`.', 'Production readiness audit current Functions deploy command evidence');
  assertIncludes(productionReadinessAudit, 'Result: blocked by Firebase project/IAM access before function upload, not by local Functions lint/build or source verification.', 'Production readiness audit current Functions deploy blocker classification');
  assertIncludes(productionCertificationRunbook, 'No Cloud Resource Manager, IAM, billing, or Secret Manager blocker.', 'Production certification runbook cloud-blocker evidence split');
  assertIncludes(productionCertificationRunbook, 'npm run verify:functions-deploy-preflight', 'Production certification runbook Functions deploy local preflight source gate');
  assertIncludes(productionCertificationRunbook, 'It does not prove Firebase CLI authentication, project IAM, enabled Google Cloud APIs, Secret Manager access, function upload, deployed revisions, scheduler execution, callable behavior, trigger delivery, or live production effect.', 'Production certification runbook Functions deploy external-proof boundary');
  assertIncludes(productionCertificationRunbook, '## Gate 2A: Firebase Storage Rules Deployment', 'Production certification runbook Storage rules gate heading');
  assertIncludes(productionCertificationRunbook, 'npm run verify:storage-paths', 'Production certification runbook Storage rules local preflight source gate');
  assertIncludes(productionCertificationRunbook, 'firebase deploy --project menulist-qa --config firebase.json --only storage --non-interactive', 'Production certification runbook scoped QA Storage deploy command');
  assertIncludes(productionCertificationRunbook, 'Service Usage HTTP 403: project `menulist-qa` not found or permission denied', 'Production certification runbook current Storage deploy blocker evidence');
  assertIncludes(productionCertificationRunbook, 'Production Storage rules deploy requires QA evidence and explicit production approval', 'Production certification runbook Storage production approval gate');
  assertIncludes(productionCertificationRunbook, 'It does not prove Firebase CLI authentication, project IAM, Storage rules upload, deployed rules propagation, or live bucket behavior.', 'Production certification runbook Storage deploy external-proof boundary');
  assertIncludes(productionCertificationRunbook, 'npm run verify:tenant-block-backfill-safety', 'Production certification runbook tenant-block backfill local preflight source gate');
  assertIncludes(productionCertificationRunbook, 'It does not prove Firestore read access, target dataset review, dry-run candidate counts, write mutation success, or production data parity.', 'Production certification runbook tenant-block backfill external-proof boundary');
  assertIncludes(productionCertificationRunbook, 'Current blocker refreshed July 9, 2026: `npm run verify:tenant-block-backfill-safety` passed, and the bounded read-only dry run', 'Production certification runbook tenant-block current dry-run blocker evidence');
  assertIncludes(productionCertificationRunbook, 'Permission denied on resource project menulist-qa', 'Production certification runbook tenant-block current project-access blocker');
  assertIncludes(productionReadinessAudit, 'External Certification Gate 2 Tenant-Block Mirror Backfill Evidence - July 9, 2026', 'Production readiness audit current tenant-block gate evidence heading');
  assertIncludes(productionReadinessAudit, 'npx ts-node --compiler-options \'{\"module\":\"CommonJS\"}\' scripts/backfill-store-tenant-block-state.ts --project-id menulist-qa --limit 25', 'Production readiness audit current tenant-block dry-run command evidence');
  assertIncludes(productionReadinessAudit, 'Result: blocked for target dataset review by Firebase project access, not by a script safety failure.', 'Production readiness audit current tenant-block blocker classification');
  assertIncludes(productionCertificationRunbook, 'npm run verify:billing-entitlement-boundary', 'Production certification runbook Razorpay local preflight source gate');
  assertIncludes(productionCertificationRunbook, 'subscription/top-up sequencing, webhook cheap-fail/idempotency, browser acknowledgement, and entitlement/cache sync guard coverage only', 'Production certification runbook Razorpay preflight boundary');
  assertIncludes(productionCertificationRunbook, 'npm run smoke:razorpay-sandbox-readonly', 'Production certification runbook Razorpay maintained read-only command');
  assertIncludes(productionCertificationRunbook, 'performs four bounded GET-only provider inventory calls', 'Production certification runbook Razorpay read-only provider operation set');
  assertIncludes(productionCertificationRunbook, 'Current partial evidence refreshed July 14, 2026 after the final billing cross-check:', 'Production certification runbook Razorpay current read-only provider evidence');
  assertIncludes(productionCertificationRunbook, 'It does not prove the secret matches a deployed Razorpay webhook endpoint, checkout, subscription creation, payment verification, top-up purchase, webhook delivery, provider failure compensation, local/provider state parity, deployed Functions secrets, or no-real-charge behavior.', 'Production certification runbook Razorpay read-only evidence boundary');
  assert(
    rootPackageJson.scripts?.['smoke:razorpay-sandbox-readonly'] === 'node scripts/verification/verify-razorpay-sandbox-readiness.mjs',
    'Root package must expose Razorpay read-only sandbox preflight',
  );
  [
    "const LIVE_KEY_ID_PATTERN = /^rzp_live_/;",
    "readCollection('payments.all', () => razorpay.payments.all({ count: 1 }))",
    "readCollection('orders.all', () => razorpay.orders.all({ count: 1 }))",
    "readCollection('plans.all', () => razorpay.plans.all({ count: 1 }))",
    "readCollection('subscriptions.all', () => razorpay.subscriptions.all({ count: 1 }))",
    'Razorpay.validateWebhookSignature(',
    'mutationAllowed: false',
  ].forEach((token) => assertIncludes(razorpaySandboxReadiness, token, 'Razorpay maintained read-only sandbox preflight'));
  assertIncludes(productionReadinessAudit, 'External Certification Gate 4 Razorpay Read-Only Provider Credential Evidence - July 9, 2026', 'Production readiness audit Razorpay read-only provider credential evidence heading');
  assertIncludes(productionReadinessAudit, 'Operation: read-only Razorpay SDK `payments.all({ count: 1 })`; no order, subscription, capture, refund, webhook, checkout session, Firestore write, Firebase deploy, Vercel deploy, or production build was performed.', 'Production readiness audit Razorpay read-only provider operation boundary');
  assertIncludes(productionReadinessAudit, '"gate":"razorpay-readonly-provider-auth","mode":"test","operation":"payments.all","requestedCount":1,"returnedCount":1,"entity":"collection","result":"passed"', 'Production readiness audit Razorpay read-only provider output');
  assertIncludes(productionReadinessAudit, 'The aggregate local boundary passed 95/95 checks across 91 child root `verify:*` scripts plus docs links, root typecheck, lint, and `git diff --check`.', 'Production readiness audit Razorpay read-only evidence local aggregate trail');
  assertIncludes(productionReadinessAudit, 'External Certification Gate 4 Maintained Read-Only Preflight Evidence - July 11, 2026', 'Production readiness audit Razorpay maintained read-only evidence heading');
  assertIncludes(productionReadinessAudit, 'razorpay_key_id_live_key_refused', 'Production readiness audit Razorpay live-key refusal evidence');
  assertIncludes(changelog, 'Razorpay Read-Only Sandbox Preflight', 'Changelog Razorpay maintained read-only evidence');
  assertIncludes(ownerActionItems, 'Read-only Razorpay test-mode credential auth is recorded as partial Gate 4 evidence only.', 'Owner action items Razorpay read-only partial evidence boundary');
  assertIncludes(changelog, 'Razorpay Gate 4 has read-only test-mode credential evidence', 'Changelog Razorpay read-only Gate 4 evidence entry');
  assertIncludes(productionCertificationRunbook, 'npm run verify:messaging-onboarding-monitor-boundary', 'Production certification runbook WhatsApp messaging monitor local preflight source gate');
  assertIncludes(productionCertificationRunbook, 'npm run verify:menu-extraction-pipeline', 'Production certification runbook WhatsApp messaging publish local preflight source gate');
  assertIncludes(productionCertificationRunbook, 'platform-only messaging onboarding monitor coverage, preview/fix/publish source gates, messaging extraction destination routing, public cache-tag writes', 'Production certification runbook WhatsApp provider local-only boundary');
  assertIncludes(productionCertificationRunbook, 'It does not prove Meta webhook delivery, provider media download, outbound WhatsApp delivery, provider asset configuration, or provider-mode correctness.', 'Production certification runbook WhatsApp provider external-proof boundary');
  assertIncludes(productionCertificationRunbook, 'Current blocker refreshed July 9, 2026: checked-in root and MenuList Functions dotenv files keep `ENABLE_MESSAGING_ONBOARDING` absent or `false`, and local presence checks found no WhatsApp provider secret values', 'Production certification runbook WhatsApp provider current blocker evidence');
  assertIncludes(productionCertificationRunbook, 'Gate 5 remains blocked until the owner provisions real non-production Meta assets, sets matching Firebase secrets on the smoke target, deploys the webhook function, registers the webhook URL, and enables only that target.', 'Production certification runbook WhatsApp provider owner-side blocker');
  assertIncludes(productionReadinessAudit, 'External Certification Gate 5 WhatsApp Provider Prerequisite Evidence - July 9, 2026', 'Production readiness audit WhatsApp provider prerequisite evidence heading');
  assertIncludes(productionReadinessAudit, 'Command or manual path: inline Node presence check for `ENABLE_MESSAGING_ONBOARDING`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, and `WHATSAPP_APP_SECRET`; values were reported only as missing, false, placeholder-or-empty, or set.', 'Production readiness audit WhatsApp provider prerequisite command boundary');
  assertIncludes(productionReadinessAudit, 'Result: blocked for real Gate 5 provider smoke by missing non-production provider setup evidence; the local fail-closed env posture is correct.', 'Production readiness audit WhatsApp provider prerequisite blocker classification');
  assertIncludes(productionReadinessAudit, 'Evidence: no provider secret values were printed or present in the checked files; provider processing remains absent/disabled in checked-in local dotenv state.\nVerification after recording evidence: `node --check scripts/verification/verify-agent-readiness.js`, `npm run verify:agent-readiness`, `npm run docs:check-links`, `git diff --check`, and `npm run verify:production-readiness-local` passed.', 'Production readiness audit WhatsApp provider prerequisite verification trail');
  assertIncludes(ownerActionItems, 'A July 9, 2026 presence check confirmed checked-in local/functions dotenv files remain absent/false with no WhatsApp provider secret values.', 'Owner action items WhatsApp provider current blocker evidence');
  assertIncludes(changelog, 'WhatsApp Gate 5 setup blocker is current', 'Changelog WhatsApp Gate 5 current blocker entry');
  assertIncludes(productionCertificationRunbook, 'npm run verify:mobile-shell-route-map', 'Production certification runbook mobile shell local preflight source gate');
  assertIncludes(productionCertificationRunbook, 'npm run verify:staff-roles-route-parity', 'Production certification runbook Staff/Roles mobile local preflight source gate');
  assertIncludes(productionCertificationRunbook, 'npm run verify:customer-app-pwa', 'Production certification runbook customer app local preflight source gate');
  assertIncludes(productionCertificationRunbook, 'npm run verify:public-business-truth', 'Production certification runbook public business truth local preflight source gate');
  assertIncludes(productionCertificationRunbook, 'npm run verify:menu-extraction-pipeline', 'Production certification runbook menu extraction local preflight source gate');
  assertIncludes(productionCertificationRunbook, 'npm run verify:public-truth-tools', 'Production certification runbook public truth tools local preflight source gate');
  assertIncludes(productionCertificationRunbook, 'It does not prove real device rendering, authenticated owner-shell visual behavior, touch ergonomics, browser console cleanliness, or public route runtime rendering.', 'Production certification runbook mobile/browser external-proof boundary');
  assertIncludes(productionCertificationRunbook, 'npm run verify:pos-sync-boundary', 'Production certification runbook POS local preflight source gate');
  assertIncludes(productionCertificationRunbook, 'Passing preflight proves the maintained source-only POS boundary gate', 'Production certification runbook POS maintained verifier boundary');
  assertNotIncludes(productionCertificationRunbook, 'npx tsx -e "import { validatePosSyncWebhookUrl', 'Production certification runbook must not use ad hoc inline POS URL probe');
  assertIncludes(productionCertificationRunbook, 'Current blocker refreshed July 9, 2026: `npm run verify:pos-sync-boundary` passed, but no controlled public HTTPS POS receiver endpoint', 'Production certification runbook POS receiver current blocker evidence');
  assertIncludes(productionCertificationRunbook, 'Gate 6 remains blocked until the owner provides or provisions a staging receiver endpoint that can verify MenuList signatures and accept a signed full-menu snapshot without exposing secrets.', 'Production certification runbook POS receiver owner-side blocker');
  assertIncludes(productionReadinessAudit, 'External Certification Gate 6 POS Receiver Prerequisite Evidence - July 9, 2026', 'Production readiness audit POS receiver prerequisite evidence heading');
  assertIncludes(productionReadinessAudit, 'Command or manual path: `npm run verify:pos-sync-boundary`; review of the active External Certification Runbook Gate 6 evidence requirements.', 'Production readiness audit POS receiver prerequisite command boundary');
  assertIncludes(productionReadinessAudit, 'Result: blocked for real Gate 6 POS provider smoke by missing controlled receiver endpoint and receiver-side evidence; local POS source-gate coverage remains green.', 'Production readiness audit POS receiver prerequisite blocker classification');
  assertIncludes(productionReadinessAudit, 'Evidence: `POS sync boundary verifier passed`; active runbook still requires endpoint domain, receiver signature verification, delivery payload acceptance, and failed endpoint evidence before Gate 6 can pass.\nVerification after recording evidence: `node --check scripts/verification/verify-agent-readiness.js`, `npm run verify:agent-readiness`, `npm run docs:check-links`, `git diff --check`, and `npm run verify:production-readiness-local` passed.', 'Production readiness audit POS receiver prerequisite verification trail');
  assertIncludes(ownerActionItems, 'Provision a controlled public HTTPS POS receiver for Gate 6', 'Owner action items POS receiver task');
  assertIncludes(changelog, 'POS Gate 6 receiver blocker is current', 'Changelog POS Gate 6 current blocker entry');
  assertIncludes(productionCertificationRunbook, 'npm run verify:agent-readiness', 'Production certification runbook batch worker env setup preflight source gate');
  assertIncludes(productionCertificationRunbook, 'It does not prove Cloud Tasks enqueue, worker invocation, worker secret acceptance, provider image generation, review state, or project persistence.', 'Production certification runbook batch worker external-proof boundary');
  assertIncludes(productionCertificationRunbook, 'Current blocker refreshed July 15, 2026: local `.env` has `FIREBASE_PROJECT_ID`, `FIREBASE_PROJECT_LOCATION`, `BATCH_IMAGE_GENERATION_QUEUE_ID`, and an HTTPS `BATCH_IMAGE_GENERATION_WORKER_URL`, but `BATCH_IMAGE_GENERATION_WORKER_SECRET` is missing.', 'Production certification runbook batch worker current secret blocker');
  assertIncludes(productionCertificationRunbook, 'Gate 7 remains blocked until the worker secret is configured for the target, the worker target is deployed, the existing queue policy is captured, and a controlled Cloud Tasks enqueue/worker smoke is run.', 'Production certification runbook batch worker owner-side blocker');
  assertIncludes(productionReadinessAudit, 'External Certification Gate 7 Batch Worker Secret Prerequisite Evidence - July 9, 2026', 'Production readiness audit batch worker secret prerequisite evidence heading');
  assertIncludes(productionReadinessAudit, 'Command or manual path: inline Node presence check for `FIREBASE_PROJECT_ID`, `FIREBASE_PROJECT_LOCATION`, `BATCH_IMAGE_GENERATION_QUEUE_ID`, `BATCH_IMAGE_GENERATION_WORKER_URL`, and `BATCH_IMAGE_GENERATION_WORKER_SECRET`; then a no-enqueue `getImageGenerationTaskConfigStatus()` probe with root `.env` loaded.', 'Production readiness audit batch worker secret prerequisite command boundary');
  assertIncludes(productionReadinessAudit, 'The app helper emitted `cloud_tasks_batch_image_config_missing` and returned `{"ready":false,"hasProjectId":true,"hasQueueLocation":true,"hasQueueId":true,"hasWorkerUrl":true,"hasWorkerSecret":false}`.', 'Production readiness audit batch worker no-enqueue status evidence');
  assertIncludes(productionReadinessAudit, 'Evidence: no worker secret value was printed or present in the checked files; the app helper classified the configured root env as not ready before enqueue.\nVerification after recording evidence: `node --check scripts/verification/verify-agent-readiness.js`, `npm run verify:agent-readiness`, `npm run docs:check-links`, `git diff --check`, and `npm run verify:production-readiness-local` passed.', 'Production readiness audit batch worker secret prerequisite verification trail');
  assertIncludes(ownerActionItems, 'Configure and smoke the batch image Cloud Tasks worker secret', 'Owner action items batch worker secret task');
  assertIncludes(changelog, 'Batch worker Gate 7 secret blocker is current', 'Changelog batch worker Gate 7 current blocker entry');
  assertIncludes(productionCertificationRunbook, 'npm run verify:production-readiness-local', 'Production certification runbook production-host local preflight aggregate');
  assertIncludes(productionCertificationRunbook, 'It does not prove a Vercel build, deployed artifact, production environment variables, custom-domain routing, CDN behavior, Firebase production access, or production-host runtime behavior.', 'Production certification runbook production-host external-proof boundary');
  assertIncludes(productionCertificationRunbook, 'Do not run Vercel deploy, preview deploy, production deploy, or production-host smoke from this runbook unless that approval exists in the active session.', 'Production certification runbook explicit Vercel approval guard');
  assertIncludes(productionDeploymentChecklist, '**Launch boundary:** Not current launch certification or deploy approval.', 'Production deployment checklist top launch/deploy boundary');
  assertIncludes(productionDeploymentChecklist, 'production deployment approval still requires current production-readiness audit evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, required provider/browser/device QA, and production-host smoke.', 'Production deployment checklist top current evidence boundary');
  assertIncludes(productionDeploymentChecklist, 'Do not run Vercel deploys, preview deploys, production deploys, Vercel remote builds, or production-host smoke from this checklist unless the user explicitly asks for a Vercel deploy in the active session.', 'Production deployment checklist explicit Vercel approval guard');
  assertIncludes(productionDeploymentChecklist, 'Firebase infrastructure auto-deploy applies only to Firebase rules, indexes, Storage rules, and Firebase Cloud Function logic.', 'Production deployment checklist Firebase auto-deploy boundary');
  assertIncludes(productionDeploymentChecklist, 'npm run verify:production-readiness-local', 'Production deployment checklist aggregate local preflight');
  assertIncludes(productionDeploymentChecklist, 'firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:messagingOnboarding,functions:backfillStoresSummary,functions:mapsPlaceCheck,functions:verifyMenuPublish --non-interactive', 'Production deployment checklist scoped MenuList QA Functions target');
  assertIncludes(productionDeploymentChecklist, 'If certification is retrying only the July 2 source-file path hardening slice', 'Production deployment checklist source-file subset boundary');
  assertIncludes(productionDeploymentChecklist, 'firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:startGeneration,functions:embedArticleWorker,functions:regenerateEmbedding --non-interactive', 'Production deployment checklist source-file subset target');
  assertIncludes(productionDeploymentChecklist, 'Storage rules cutover: run `npm run verify:storage-paths`, then retry `firebase deploy --project menulist-qa --config firebase.json --only storage --non-interactive`', 'Production deployment checklist scoped Storage deploy command');
  assertIncludes(productionDeploymentChecklist, 'production Storage rules deploy requires QA evidence and explicit production approval', 'Production deployment checklist Storage production approval gate');
  assertIncludes(productionDeploymentChecklist, 'If approval is missing, do not deploy. Record the deploy command as pending instead.', 'Production deployment checklist missing-approval stop rule');
  assertNotIncludes(productionDeploymentChecklist, 'vercel --prod', 'Production deployment checklist stale Vercel production command');
  assertNotIncludes(productionDeploymentChecklist, 'git push origin main', 'Production deployment checklist stale push-to-main deploy instruction');
  assertNotIncludes(productionDeploymentChecklist, 'firebase deploy --only functions\n', 'Production deployment checklist broad Functions deploy command');
  assertNotIncludes(productionDeploymentChecklist, 'cd ~/Projects/MenuListAi/dashboard', 'Production deployment checklist stale dashboard path');
  assertNotIncludes(productionDeploymentChecklist, 'firestore-indexes-auth.json', 'Production deployment checklist stale auth index config');
  assertIncludes(productionReadinessAudit, 'The current Firebase CLI environment is not authenticated, so current MenuList QA deploy attempts stop before predeploy or upload with `Error: Failed to authenticate, have you run firebase login?`.', 'Production readiness audit current Firebase Function deploy blocker summary');
  assertIncludes(productionReadinessAudit, 'The last authenticated package-local scoped retry on July 9, 2026 targeted `functions:processMenuImages,functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:messagingOnboarding,functions:backfillStoresSummary,functions:mapsPlaceCheck,functions:verifyMenuPublish`, completed predeploy lint/build', 'Production readiness audit historical authenticated Firebase Function deploy evidence');
  assertIncludes(productionReadinessAudit, 'The current August 1, 2026 operator attempt stops before predeploy or upload because Firebase CLI is not authenticated.', 'Production readiness audit remaining-risk current Functions blocker summary');
  assertIncludes(productionReadinessAudit, 'The last authenticated package-local scoped staging retry on July 9, 2026 against `menulist-qa` targeted the full Gate 1 function set, passed predeploy lint/build', 'Production readiness audit remaining-risk historical Functions evidence');
  assertIncludes(productionReadinessAudit, 'Cloud Resource Manager HTTP 403 caller permission before upload', 'Production readiness audit latest Cloud Resource Manager blocker');
  assertIncludes(productionReadinessAudit, 'External Certification Gate 2A Firebase Storage Rules Deploy Evidence - July 9, 2026', 'Production readiness audit current Storage gate evidence heading');
  assertIncludes(productionReadinessAudit, 'Result: blocked by Firebase project/API access before Storage rules upload, not by the local storage-path source gate.', 'Production readiness audit latest Storage deploy blocker summary');
  assertIncludes(productionReadinessAudit, 'Storage rules legacy-project cutover checkpoint', 'Production readiness audit Storage cutover checkpoint');
  assertIncludes(productionReadinessAudit, 'firebase deploy --project menulist-qa --config firebase.json --only storage --non-interactive', 'Production readiness audit scoped Storage deploy command');
  const docsLinkChecker = read('scripts/check-docs-links.js');
  assertIncludes(docsLinkChecker, 'HYPERFRAMES_CONVENTION_FILES', 'Docs link checker HyperFrames convention allowlist');
  assertIncludes(docsLinkChecker, 'relativePath.startsWith("videos/hyperframes/")', 'Docs link checker HyperFrames convention scope');
  assertIncludes(docsLinkChecker, 'isHyperFramesConventionFile(filePath)', 'Docs link checker HyperFrames convention naming bypass');
  assertIncludes(docsLinkChecker, 'function getTrackedMarkdownFiles()', 'Docs link checker Git tracked markdown helper');
  assertIncludes(docsLinkChecker, 'Tracked filename contains uppercase or spaces', 'Docs link checker tracked filename casing guard');
  assertIncludes(docsLinkChecker, 'function existsWithExactCase(targetPath)', 'Docs link checker exact-case path helper');
  assertIncludes(docsLinkChecker, 'const entries = fs.readdirSync(currentPath);', 'Docs link checker segment-level case validation');
  assertIncludes(docsLinkChecker, 'if (!existsWithExactCase(targetPath))', 'Docs link checker must use exact-case existence check');
  assertIncludes(productionReadinessAudit, 'HyperFrames convention filenames are still link-scanned but exempted from active-doc kebab-case naming violations', 'Production readiness audit HyperFrames docs naming exception');
  assertIncludes(productionReadinessAudit, 'Documentation tracked filename casing checkpoint:', 'Production readiness audit docs tracked filename casing checkpoint');
  assertIncludes(productionReadinessAudit, 'Documentation link casing checkpoint:', 'Production readiness audit docs link exact-case checkpoint');
  assertIncludes(productionReadinessAudit, 'The latest `npm run docs:check-links` run scanned 2,451 documentation files and 4,348 internal links, passed with 0 broken links, and reported 27 naming violations', 'Production readiness audit current docs link health summary');
  assertNotIncludes(productionReadinessAudit, 'across 1,995 active docs files', 'Production readiness audit stale docs link file count');
  assertIncludes(productionReadinessAudit, 'AI extraction historical-audit boundary checkpoint', 'Production readiness audit AI extraction historical boundary checkpoint');
  assertIncludes(productionReadinessAudit, 'historical code-readiness evidence, not current MenuList launch certification', 'Production readiness audit AI extraction historical boundary wording');
  assertIncludes(productionReadinessAudit, 'AI extraction monitoring enabled-runtime and active-doc checkpoint', 'Production readiness audit AI extraction monitoring enabled-runtime checkpoint');
  assertIncludes(changelog, 'AI Extraction Monitoring Enabled Runtime And Active Docs Boundary', 'Changelog AI extraction monitoring enabled-runtime checkpoint');
  assertIncludes(menuExtractionPipelineVerifier, 'source-gated AI Extraction Monitoring evidence only', 'Menu extraction verifier AI extraction monitoring source boundary');
  assertIncludes(menuExtractionPipelineVerifier, 'ENABLE_EXTRACTION_MONITORING_DASHBOARD: true,', 'Menu extraction verifier current enabled flag boundary');
  assertIncludes(menuExtractionPipelineVerifier, 'Feature flag OFF', 'Menu extraction verifier stale flag-off wording rejection');
  assertIncludes(menuExtractionPipelineVerifier, 'ENABLE_EXTRACTION_MONITORING_DASHBOARD: false', 'Menu extraction verifier stale disabled flag rejection');
  assertIncludes(aiExtractionFeatureFlags, 'ENABLE_EXTRACTION_MONITORING_DASHBOARD: true,', 'AI extraction monitoring current enabled feature flag');
  assertNotIncludes(aiExtractionFeatureFlags, 'ENABLE_EXTRACTION_MONITORING_DASHBOARD: false,', 'AI extraction monitoring stale disabled feature flag');
  assertIncludes(aiExtractionMobileMonitor, "const isPlatform = platformRole === 'PLATFORM';", 'AI extraction monitoring mobile platform guard');
  assertIncludes(aiExtractionMobileMonitor, 'getExtractionDashboardSnapshot({ status: filterToStatus(jobFilter), pageSize: 20 })', 'AI extraction monitoring bounded mobile snapshot');
  assertIncludes(aiExtractionMobileShell, "'/ops/extraction': 'extractionMonitor'", 'AI extraction monitoring ops route maps into MobileShell');
  assertIncludes(aiExtractionMobileShell, "'/platform/extraction-monitor': 'extractionMonitor'", 'AI extraction monitoring platform route maps into MobileShell');
  assertIncludes(aiExtractionFirestoreRules, 'match /MENULIST_AI_OPERATIONS/{docId}', 'AI extraction monitoring cost ledger Firestore rule');
  assertIncludes(aiExtractionFirestoreRules, 'match /menuImageProcessingJobs/{jobId}', 'AI extraction monitoring job Firestore rule');
  assert(
    /match \/menuImageProcessingJobs\/\{jobId\}[\s\S]{0,500}isPlatformAdmin\(\)[\s\S]{0,500}isMenuProcessingJobOwner\(\)[\s\S]{0,200}isMenuProcessingJobScopeMember\(\)/.test(aiExtractionFirestoreRules),
    'AI extraction monitoring job rule must retain the platform bypass and owner-plus-current-scope boundary',
  );
  for (const [label, content] of [
    ['AI extraction monitoring spec', aiExtractionMonitoringSpec],
    ['AI extraction monitoring implementation', aiExtractionMonitoringImpl],
  ]) {
    assertIncludes(content, 'Launch boundary:** Not current launch certification or deploy approval', `${label} launch boundary`);
    assertIncludes(content, 'source-gated AI Extraction Monitoring evidence only', `${label} source boundary`);
    assertIncludes(content, '`ENABLE_EXTRACTION_MONITORING_DASHBOARD=true`', `${label} enabled flag boundary`);
    assertIncludes(content, '`MobileExtractionMonitorScreen` inside `MobileShell`', `${label} mobile surface boundary`);
    assertIncludes(content, 'Cross-tenant job reads and `MENULIST_AI_OPERATIONS` reads are Firestore-rule-gated to platform admins', `${label} Firestore role boundary`);
    assertIncludes(content, 'External Certification Runbook', `${label} external certification gate`);
    assertIncludes(content, 'active production-readiness audit', `${label} audit gate`);
    assertNotIncludes(content, 'Feature flag OFF', `${label} stale flag-off wording`);
    assertNotIncludes(content, 'ENABLE_EXTRACTION_MONITORING_DASHBOARD: false', `${label} stale disabled flag wording`);
  }
  assertIncludes(productionReadinessAudit, 'Store update acknowledgement source-gate checkpoint', 'Production readiness audit store update acknowledgement checkpoint');
  assertIncludes(productionReadinessAudit, 'scans every active `src` `updateStore()` call', 'Production readiness audit generic store update acknowledgement scan');
  assertIncludes(productionReadinessAudit, 'Aggregate local readiness output boundary checkpoint', 'Production readiness audit local aggregate output boundary checkpoint');
  assertIncludes(productionReadinessAudit, 'does not run a Next.js production build, Firebase deploy, Vercel deploy, provider smoke, browser/device QA, live Firestore/Storage writes, or production-host behavior', 'Production readiness audit local aggregate output boundary details');
  assertIncludes(productionReadinessAudit, 'Recycle-bin verifier output boundary checkpoint', 'Production readiness audit recycle-bin output boundary checkpoint');
  assertIncludes(productionReadinessAudit, 'aggregate verifier text cannot be mistaken for a manual/browser certification pass', 'Production readiness audit recycle-bin aggregate wording guard');
  assertIncludes(productionReadinessAudit, 'Aggregate verifier coverage checkpoint', 'Production readiness audit current aggregate verifier checkpoint');
  assertIncludes(productionReadinessAudit, 'Aggregate verifier registry coverage checkpoint', 'Production readiness audit aggregate registry coverage checkpoint');
  assertIncludes(productionReadinessAudit, 'derives the child list from every root `verify:*` package script except `verify:production-readiness-local` itself', 'Production readiness audit aggregate registry dynamic coverage');
  assertIncludes(productionReadinessAudit, 'Upload development-done top-boundary checkpoint', 'Production readiness audit upload development-done top-boundary checkpoint');
  assertIncludes(productionReadinessAudit, '`__docs__/projects/development_done/1-implementation-upload-complete.md` and `__docs__/projects/development_done/1-testing-guide-upload.md` now carry top-level historical/source-evidence launch boundaries', 'Production readiness audit upload development-done top-boundary evidence');
  assertIncludes(productionReadinessAudit, 'External-runtime checklist truth checkpoint', 'Production readiness audit external checklist truth checkpoint');
  assertIncludes(productionReadinessAudit, 'Each row now separates implemented source capability from missing runtime evidence and remains unchecked', 'Production readiness audit external checklist evidence boundary');
  assertIncludes(changelog, 'Aggregate verifier registry coverage is source-gated', 'Changelog aggregate verifier registry coverage entry');
  assertIncludes(changelog, 'Upload development-done notes carry top-level launch boundaries', 'Changelog upload development-done top-boundary entry');
  assertIncludes(changelog, 'Production Checklist External-Evidence Truth Boundary', 'Changelog external checklist truth entry');
  assertIncludes(changelog, 'Externally dependent rows no longer appear certified from source configuration alone', 'Changelog external checklist truth details');
  assertIncludes(productionReadinessAudit, '`verify:owner-business-health-boundary`', 'Production readiness audit Owner Business Health aggregate alias evidence');
  assertIncludes(productionReadinessAudit, '`verify:campaigncue-operating-loop`', 'Production readiness audit CampaignCue operating-loop aggregate alias evidence');
  assertIncludes(productionReadinessAudit, 'are now exposed as root `verify:*` scripts', 'Production readiness audit aggregate alias exposure evidence');
  assertIncludes(productionReadinessAudit, 'Menu Project Editor route/save/cache/mobile/docs parity', 'Production readiness audit Menu Project Editor aggregate coverage evidence');
  assertIncludes(productionReadinessAudit, 'Owner Business Health route/API/mobile/docs parity, and CampaignCue operating-loop contract coverage by default', 'Production readiness audit Owner Business Health and CampaignCue aggregate coverage evidence');
  assertIncludes(productionReadinessAudit, '`npm run verify:menu-project-editor-boundary` guards Projects route, editor save/publish, project DAL cache/screen invalidation, mobile persistence, mobile project mutations, and docs parity', 'Production readiness audit Menu Project Editor verifier detail');
  assertIncludes(productionReadinessAudit, '`npm run verify:owner-business-health-boundary` guards Business Health route, API read/answer/feedback admission, bounded response parsing, MobileShell read-only behavior, removed action surfaces, and docs parity.', 'Production readiness audit Owner Business Health verifier detail');
  assertIncludes(productionReadinessAudit, 'Current aggregate source gate: `npm run verify:production-readiness-local` passed with 98/98 checks, including 94 child root `verify:*` scripts.', 'Production readiness audit retained July 11 aggregate verifier evidence');
  assertIncludes(productionReadinessAudit, 'At that baseline checkpoint, the aggregate local boundary passed 56/56 checks', 'Production readiness audit historical aggregate baseline wording');
  assertNotIncludes(productionReadinessAudit, 'The latest aggregate local boundary passed 56/56', 'Production readiness audit stale latest aggregate wording');
  assertIncludes(opsInfrastructureGuide, '**Launch boundary:** Not current launch certification or deploy approval.', 'Ops infrastructure guide top launch/deploy boundary');
  assertIncludes(opsInfrastructureGuide, 'This ops guide documents implemented source systems and manual use; production readiness still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.', 'Ops infrastructure guide top current evidence boundary');
  assertIncludes(opsInfrastructureGuide, 'npm run verify:functions-deploy-preflight', 'Ops infrastructure guide Functions deploy preflight');
  assertIncludes(opsInfrastructureGuide, 'External Certification Runbook', 'Ops infrastructure guide external certification routing');
  assertIncludes(opsInfrastructureGuide, 'Code flags are not a launch approval signal.', 'Ops infrastructure guide feature-flag launch boundary');
  assertIncludes(opsInfrastructureGuide, 'Do not turn every flag on as a generic launch step.', 'Ops infrastructure guide blanket flag activation guard');
  assertNotIncludes(opsInfrastructureGuide, 'Deploy Cloud Functions: `firebase deploy --only functions`', 'Ops infrastructure guide broad Functions deploy inline command');
  assertNotIncludes(opsInfrastructureGuide, 'firebase deploy --only functions\n', 'Ops infrastructure guide broad Functions deploy block command');
  assertNotIncludes(opsInfrastructureGuide, '**All flags are OFF by default.** Enable when ready for production.', 'Ops infrastructure guide stale all-flags-off instruction');
  assertNotIncludes(opsInfrastructureGuide, '| SAFE_MODE | `ENABLE_COST_PROTECTION` | OFF |', 'Ops infrastructure guide stale SAFE_MODE source state');
  assertIncludes(opsAlertingDeliveryFirebase, 'Do not reuse the older command shapes from those historical attempts.', 'Ops alerting Firebase doc stale deploy-command boundary');
  assertIncludes(opsAlertingDeliveryFirebase, 'npm run verify:functions-deploy-preflight', 'Ops alerting Firebase doc Functions deploy preflight');
  assertIncludes(opsAlertingDeliveryFirebase, 'firebase deploy --project menulist-qa --config firebase.json --only functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler,functions:triggerDecisionBlocksScoring,functions:verifyMenuPublish,functions:forceRepublish,functions:gcpBudgetAlertWebhook,functions:messagingOnboarding,functions:msgExtractionWatcher --non-interactive', 'Ops alerting Firebase doc scoped platform-alert deploy command');
  assertIncludes(opsAlertingDeliveryFirebase, 'Production deploys require QA evidence and explicit production deploy approval.', 'Ops alerting Firebase doc production approval gate');
  assertNotIncludes(opsAlertingDeliveryFirebase, 'firebase deploy --only functions:', 'Ops alerting Firebase doc stale broad Functions deploy command shape');
  assertNotIncludes(opsAlertingDeliveryFirebase, 'PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" firebase deploy --only functions', 'Ops alerting Firebase doc stale local PATH deploy wrapper');
  assertIncludes(ownerActionItems, 'Confirm local and preview MenuList env vars point to `menulist-qa`', 'Owner action items current MenuList QA target task');
  assertIncludes(ownerActionItems, '**Launch boundary:** Not current launch certification or deploy approval.', 'Owner action items top launch/deploy boundary');
  assertIncludes(ownerActionItems, 'This tracker lists owner/manual tasks; production readiness still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.', 'Owner action items top current evidence boundary');
  assertIncludes(ownerActionItems, 'menu extraction worker updates, source-file path hardening updates, and the consolidated maintenance scheduler', 'Owner action items current Functions blocker scope');
  assertIncludes(ownerActionItems, 'The latest scoped `menulist-qa` retry on July 16, 2026 (`menulistMaintenanceScheduler,computeDecisionBlocksScores`) completed predeploy lint/build and then failed before upload with Cloud Resource Manager HTTP 403 caller permission', 'Owner action items latest Functions blocker evidence');
  assertIncludes(ownerActionItems, 'Deploy MenuList Storage rules cutover to QA', 'Owner action items Storage deploy task');
  assertIncludes(ownerActionItems, 'Gate 2A requires `npm run verify:storage-paths`, then `firebase deploy --project menulist-qa --config firebase.json --only storage --non-interactive` before production approval', 'Owner action items Storage deploy preflight and command');
  assertIncludes(ownerActionItems, 'Local Storage emulation passes; prior target attempts were blocked while checking/enabling `firebasestorage.googleapis.com` with Service Usage HTTP 403: project `menulist-qa` not found or permission denied', 'Owner action items latest Storage deploy blocker evidence');
  assertIncludes(ownerActionItems, 'Confirm Vercel Production MenuList env vars point to `menulist`', 'Owner action items current MenuList production target task');
  assertIncludes(ownerActionItems, 'Confirm monitoring feature flag evidence', 'Owner action items monitoring flag evidence task');
  assertIncludes(ownerActionItems, 'Confirm production feature flag evidence before launch', 'Owner action items production flag evidence task');
  assertIncludes(ownerActionItems, 'No blanket activation order', 'Owner action items feature flag activation boundary');
  assertIncludes(ownerActionItems, 'firebase functions:secrets:set GEMINI_AI_KEY_2 --project menulist-qa', 'Owner action items Gemini rotation QA secret command');
  assertIncludes(ownerActionItems, 'Repeat for production values only after QA evidence and explicit production secret/deploy approval', 'Owner action items Gemini rotation production approval gate');
  assertIncludes(ownerActionItems, 'firebase deploy --only firestore:indexes --project menulist-qa --config firebase.json', 'Owner action items current QA index deploy command');
  assertIncludes(ownerActionItems, 'firebase deploy --only firestore:rules --project menulist-qa --config firebase.json', 'Owner action items current QA rules deploy command');
  assertIncludes(ownerActionItems, 'Production requires QA evidence and explicit production approval.', 'Owner action items production approval gate');
  assertNotIncludes(ownerActionItems, 'run `firebase deploy --only firestore:indexes`', 'Owner action items broad Firestore index deploy instruction');
  assertNotIncludes(ownerActionItems, 'Deploy updated Firestore rules: `firebase deploy --only firestore:rules`', 'Owner action items broad Firestore rules task title');
  assertNotIncludes(ownerActionItems, 'firebase deploy --only firestore:rules\n', 'Owner action items broad Firestore rules deploy command block');
  assertNotIncludes(ownerActionItems, 'cd functions && npm run deploy', 'Owner action items broad Functions package deploy command');
  assertNotIncludes(ownerActionItems, 'Create `menulist-dev` Firebase project', 'Owner action items stale MenuList dev project task');
  assertNotIncludes(ownerActionItems, '--project menulist-dev', 'Owner action items stale MenuList dev deploy command');
  assertNotIncludes(ownerActionItems, 'Enable monitoring feature flags', 'Owner action items stale monitoring flag enable task');
  assertNotIncludes(ownerActionItems, 'Enable production feature flags in order', 'Owner action items stale production flag enable task');
  assertNotIncludes(ownerActionItems, 'firebase functions:secrets:set GEMINI_AI_KEY_2\n', 'Owner action items unscoped Gemini rotation key 2 command');
  assertNotIncludes(ownerActionItems, 'firebase functions:secrets:set GEMINI_AI_KEY_3\n', 'Owner action items unscoped Gemini rotation key 3 command');
  assertNotIncludes(ownerActionItems, 'firebase functions:secrets:set GEMINI_AI_KEY_4\n', 'Owner action items unscoped Gemini rotation key 4 command');
  assertNotIncludes(ownerActionItems, '# 4. Redeploy CF + Vercel', 'Owner action items stale broad deploy instruction');
  assertIncludes(menulistSignalDeskValidation, 'Local ignored MenuList env files are sanitized to the current `menulist-qa` project contract', 'SignalDesk validation current MenuList QA target');
  assertIncludes(menulistSignalDeskValidation, 'must never point to a retired Firebase project', 'SignalDesk validation retired project guard');
  assertNotIncludes(menulistSignalDeskValidation, 'Current `.env` points the default Firebase project at `ecomsai`', 'SignalDesk validation stale current env wording');
  for (const [label, content] of [
    ['Nightly scheduler architecture', nightlySchedulerArchitecture],
    ['Continuous Menu Intelligence implementation', continuousMenuIntelligenceImpl],
    ['Continuous Menu Intelligence validation', continuousMenuIntelligenceValidation],
    ['MOL V0 implementation plan', molV0ImplementationPlan],
    ['Customer App Firebase doc', customerAppFirebase],
    ['Messaging onboarding implementation', messagingOnboardingImpl],
    ['Messaging onboarding validation', messagingOnboardingValidation],
    ['Menu job queue assessment', menuJobQueueAssessment],
  ]) {
    assertIncludes(content, 'npm run verify:functions-deploy-preflight', `${label} Functions deploy preflight`);
    assertNotIncludes(content, 'cd functions && npm run deploy', `${label} broad Functions package deploy command`);
  }
  assertIncludes(nightlySchedulerArchitecture, 'external-certification-runbook.md` Gate 1', 'Nightly scheduler architecture external certification routing');
  assertIncludes(nightlySchedulerArchitecture, '**Launch boundary:** Not current launch certification or deploy approval.', 'Nightly scheduler architecture top launch/deploy boundary');
  assertIncludes(nightlySchedulerArchitecture, 'production readiness still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped Functions deploy evidence, scheduler runtime evidence, and production-host smoke where relevant.', 'Nightly scheduler architecture top current evidence boundary');
  assertNotIncludes(nightlySchedulerArchitecture, 'Deploy: `firebase deploy --only functions:computeDecisionBlocksScores`', 'Nightly scheduler architecture broad computeDecisionBlocksScores deploy instruction');
  assertIncludes(continuousMenuIntelligenceReadme, '**Launch boundary:** Not current launch certification or deploy approval.', 'CMI README top launch/deploy boundary');
  assertIncludes(continuousMenuIntelligenceReadme, 'scoped Functions deploy evidence for the scheduler bundle', 'CMI README scoped deploy boundary');
  assertIncludes(continuousMenuIntelligenceReadme, 'downstream-consumer certification', 'CMI README downstream certification boundary');
  assertIncludes(continuousMenuIntelligenceImpl, '**Launch boundary:** Not current launch certification or deploy approval.', 'CMI implementation top launch/deploy boundary');
  assertIncludes(continuousMenuIntelligenceImpl, 'scoped Functions deploy evidence for the scheduler bundle', 'CMI implementation scoped deploy boundary');
  assertIncludes(continuousMenuIntelligenceImpl, 'downstream-consumer certification', 'CMI implementation downstream certification boundary');
  assertIncludes(continuousMenuIntelligenceFirebase, '**Launch boundary:** Not current launch certification or deploy approval.', 'CMI Firebase top launch/deploy boundary');
  assertIncludes(continuousMenuIntelligenceFirebase, 'This Firebase cost doc is source-gated scheduler/cost evidence only; CMI release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:agent-readiness`, scoped Functions deploy evidence for `computeDecisionBlocksScores` and related scheduler triggers, runtime/provider smoke where relevant, downstream consumer certification, and production-host smoke.', 'CMI Firebase top current evidence boundary');
  assertIncludes(continuousMenuIntelligenceImpl, 'Current retry evidence must use `npm run verify:functions-deploy-preflight`', 'CMI implementation current retry preflight boundary');
  assertIncludes(continuousMenuIntelligenceImpl, 'scoped `menulist-qa` Firebase Functions target', 'CMI implementation current QA target boundary');
  assertNotIncludes(continuousMenuIntelligenceImpl, 'Deploy function to staging: `firebase deploy --only functions:computeDecisionBlocksScores`', 'CMI implementation broad staging function deploy command');
  assertIncludes(continuousMenuIntelligenceValidation, 'historical implementation-validation evidence', 'CMI validation historical evidence boundary');
  assertIncludes(continuousMenuIntelligenceValidation, 'Historical Validation Result: Source Evidence Only', 'CMI validation residual historical result heading');
  assertIncludes(continuousMenuIntelligenceValidation, 'Current Release Boundary:', 'CMI validation residual current release boundary');
  assertIncludes(continuousMenuIntelligenceValidation, 'Current launch approval remains gated by the active production-readiness audit and External Certification Runbook evidence.', 'CMI validation current launch approval boundary');
  assertNotIncludes(continuousMenuIntelligenceValidation, 'ChatGPT feedback validated the implementation as production-ready.', 'CMI validation stale ChatGPT production-ready claim');
  assertNotIncludes(continuousMenuIntelligenceValidation, '## FINAL STATUS: READY FOR PRODUCTION', 'CMI validation stale ready-for-production heading');
  assertNotIncludes(continuousMenuIntelligenceValidation, '**Status:** ✅ **READY FOR TESTING**', 'CMI validation stale ready-for-testing status');
  assertNotIncludes(continuousMenuIntelligenceValidation, '## ✅ FINAL VERDICT: READY FOR TESTING', 'CMI validation stale ready-for-testing verdict');
  assertNotIncludes(continuousMenuIntelligenceValidation, '**Status:** ✅ SHIP READY', 'CMI validation stale ship-ready status');
  assertNotIncludes(continuousMenuIntelligenceValidation, '## 🚀 PRODUCTION QUALITY GATE: PASS', 'CMI validation stale production quality gate');
  assertNotIncludes(continuousMenuIntelligenceValidation, '**Ready For:** Cloud Functions deploy + SMB testing', 'CMI validation stale deploy and SMB-testing readiness line');
  assertNotIncludes(continuousMenuIntelligenceValidation, '**Status:** SHIP READY', 'CMI validation stale final ship-ready status');
  assertIncludes(continuousMenuIntelligenceValidation, 'firebase deploy --project menulist-qa --config firebase.json --only functions:computeDecisionBlocksScores --non-interactive', 'CMI validation scoped QA function deploy command');
  assertIncludes(continuousMenuIntelligenceValidation, 'Production deploy requires QA evidence and explicit production deploy approval.', 'CMI validation production approval gate');
  assertNotIncludes(continuousMenuIntelligenceValidation, 'firebase deploy --only functions:computeDecisionBlocksScores\n', 'CMI validation broad function deploy command');
  assertIncludes(continuousMenuIntelligenceLogicVerification, 'Historical Logic Verification Result: Source Evidence Only', 'CMI logic verification historical result boundary');
  assertIncludes(continuousMenuIntelligenceLogicVerification, 'not current launch certification', 'CMI logic verification launch boundary status');
  assertIncludes(continuousMenuIntelligenceLogicVerification, 'External Certification Runbook', 'CMI logic verification external certification boundary');
  assertIncludes(continuousMenuIntelligenceLogicVerification, 'npm run verify:agent-readiness', 'CMI logic verification agent-readiness source gate');
  assertIncludes(continuousMenuIntelligenceLogicVerification, 'npm run verify:functions-deploy-preflight', 'CMI logic verification Functions preflight source gate');
  assertIncludes(continuousMenuIntelligenceLogicVerification, 'scoped `menulist-qa` deploy evidence', 'CMI logic verification scoped deploy boundary');
  assertNotIncludes(continuousMenuIntelligenceLogicVerification, '**Status:** ✅ **DEPLOYABLE**', 'CMI logic verification stale deployable status');
  assertNotIncludes(continuousMenuIntelligenceLogicVerification, 'PRODUCTION READINESS: SAFE', 'CMI logic verification stale production-readiness line');
  assertNotIncludes(continuousMenuIntelligenceLogicVerification, '## FINAL VERDICT: ✅ DEPLOYABLE', 'CMI logic verification stale deployable verdict');
  assertNotIncludes(continuousMenuIntelligenceLogicVerification, 'CMI logic verification complete. All 6 flows verified. Zero critical issues.', 'CMI logic verification stale zero-issues certification');
  assertIncludes(projectsDatabase, 'await revalidatePublicClientCacheForProject(data.projectId as string, "updateProject");', 'Pricing current project save public cache invalidation');
  assertNotIncludes(projectsDatabase, 'runPricingIntegrity', 'Pricing dormant engine must not be wired into updateProject');
  assertIncludes(publicClientCache, 'touchScreen: true,', 'Pricing current screen content-version touch path');
  assertIncludes(pricingIntegrityEngine, 'export async function runPricingIntegrity', 'Pricing dormant engine source scaffold');
  assertIncludes(pricingPdfQueue, 'const ENABLE_BACKGROUND_PDF_REGEN = false;', 'Pricing background PDF queue disabled source');
  assertIncludes(projectShareModal, "const { generateMenuPdf, downloadPdf } = await import('@lib/export/menuPdfGenerator');", 'Pricing current on-demand PDF share path');
  assertIncludes(menuPdfGenerator, 'snapshotHash: artifact.sourceHash', 'Pricing current PDF snapshot hash source');
  assertIncludes(pricingIntegrityReadme, 'Current source-boundary documentation, not current launch certification', 'Pricing README current source boundary');
  for (const [label, content] of [
    ['Pricing Integrity README', pricingIntegrityReadme],
    ['Pricing Integrity spec', pricingIntegritySpec],
    ['Pricing Integrity implementation plan', pricingIntegrityImpl],
    ['Pricing Integrity Firebase cost doc', pricingIntegrityFirebase],
    ['Pricing Integrity mobile support doc', pricingIntegrityMobile],
    ['Pricing Integrity website doc', pricingIntegrityWebsite],
    ['Pricing Integrity helpdoc', pricingIntegrityHelpdoc],
    ['Pricing Integrity marketing doc', pricingIntegrityMarketing],
    ['Pricing Integrity validation report', pricingIntegrityValidation],
  ]) {
    assertIncludes(content, 'not current launch certification', `${label} launch boundary status`);
    assertIncludes(content, 'External Certification Runbook evidence', `${label} external certification boundary`);
    assertIncludes(content, '`npm run verify:agent-readiness`', `${label} agent-readiness source gate boundary`);
    assertIncludes(content, '`npm run verify:menulist-api-tenant-safety`', `${label} tenant-safety source gate boundary`);
    assertIncludes(content, 'public menu and PDF artifact QA', `${label} public/PDF QA boundary`);
    assertNotIncludes(content, 'READY FOR IMPLEMENTATION', `${label} stale ready-for-implementation status`);
    assertNotIncludes(content, 'Ready for Implementation', `${label} stale ready-for-implementation title-case status`);
    assertNotIncludes(content, 'PDF regenerates automatically', `${label} stale automatic PDF claim`);
    assertNotIncludes(content, 'The PDF stays fresh automatically', `${label} stale automatic PDF claim`);
    assertNotIncludes(content, 'Menu PDF automatic update hota hai', `${label} stale automatic PDF claim`);
    assertNotIncludes(content, 'all update automatically', `${label} stale all-surfaces automatic claim`);
    assertNotIncludes(content, 'all show the same price, always', `${label} stale all-surfaces certainty claim`);
  }
  assertIncludes(pricingIntegritySpec, '`runPricingIntegrity()` has no current caller', 'Pricing spec dormant engine boundary');
  assertIncludes(pricingIntegrityImpl, 'No background PDF job is created by this share path.', 'Pricing implementation on-demand PDF boundary');
  assertIncludes(pricingIntegrityFirebase, 'There is no active background PDF queue cost.', 'Pricing Firebase disabled queue cost boundary');
  assertIncludes(pricingIntegrityMobile, 'Mobile does not have a separate Pricing Integrity UI.', 'Pricing mobile source boundary');
  assertIncludes(pricingIntegrityWebsite, 'Background PDF regeneration is not active runtime.', 'Pricing website public claim boundary');
  assertIncludes(pricingIntegrityHelpdoc, 'MenuList does not currently run a background PDF regeneration job after every price edit.', 'Pricing helpdoc disabled background PDF boundary');
  assertIncludes(pricingIntegrityMarketing, '`ENABLE_BACKGROUND_PDF_REGEN` is false.', 'Pricing marketing disabled background PDF boundary');
  assertIncludes(pricingIntegrityValidation, '## Current result', 'Pricing Integrity validation current result heading');
  assertIncludes(pricingIntegrityValidation, '**Status:** Local source complete, not current launch certification', 'Pricing Integrity validation local source boundary');
  assertIncludes(pricingIntegrityValidation, 'Current release approval still requires the active production-readiness audit', 'Pricing Integrity validation current release boundary');
  assertIncludes(pricingIntegrityValidation, 'authenticated desktop/mobile editor price-change QA', 'Pricing Integrity validation editor/mobile QA boundary');
  assertIncludes(pricingIntegrityValidation, 'public menu and PDF artifact QA', 'Pricing Integrity validation public/PDF QA boundary');
  assertIncludes(pricingIntegrityValidation, '`runPricingIntegrity()` is dormant source scaffold with no current caller.', 'Pricing validation dormant engine source boundary');
  assertNotIncludes(pricingIntegrityValidation, '**Status:** ✅ READY FOR TESTING', 'Pricing Integrity validation stale ready-for-testing status');
  assertNotIncludes(pricingIntegrityValidation, '## ✅ FINAL VERDICT: READY FOR TESTING', 'Pricing Integrity validation stale ready-for-testing verdict');
  assertNotIncludes(pricingIntegrityValidation, '**Verdict:** ✅ "Completed enough to lock for 3 years"', 'Pricing Integrity validation stale external-review launch verdict');
  assertIncludes(hoursHolidayAccuracyValidation, '**Result:** Local source complete', 'Hours validation current result heading');
  assertIncludes(hoursHolidayAccuracyValidation, '**Release status:** Owner/deployment/browser/device evidence pending', 'Hours validation current release boundary');
  assertIncludes(hoursHolidayAccuracyValidation, 'Authenticated desktop and MobileShell mutation/rollback smoke.', 'Hours validation desktop/mobile QA boundary');
  assertIncludes(hoursHolidayAccuracyValidation, 'Real public menu and OBP boundary smoke in multiple timezones.', 'Hours validation public output QA boundary');
  assertNotIncludes(hoursHolidayAccuracyValidation, '**Status:** ✅ READY FOR TESTING', 'Hours validation stale ready-for-testing status');
  assertNotIncludes(hoursHolidayAccuracyValidation, '## ✅ FINAL VERDICT: READY FOR TESTING', 'Hours validation stale ready-for-testing verdict');
  assertNotIncludes(hoursHolidayAccuracyValidation, '**Ready For:** Manual QA Testing', 'Hours validation stale manual-QA readiness line');
  assertIncludes(menuCommandCenterValidation, 'Historical Validation Result: Source Evidence Only', 'Menu Command Center validation historical result heading');
  assertIncludes(menuCommandCenterValidation, 'Current Release Boundary', 'Menu Command Center validation current release boundary heading');
  assertIncludes(menuCommandCenterValidation, 'authenticated desktop editor QA', 'Menu Command Center validation desktop QA boundary');
  assertIncludes(menuCommandCenterValidation, 'mobile bulk availability/show-hide parity QA', 'Menu Command Center validation mobile QA boundary');
  assertNotIncludes(menuCommandCenterValidation, '## FINAL VERDICT: READY FOR TESTING', 'Menu Command Center validation stale ready-for-testing verdict');
  assertNotIncludes(menuCommandCenterValidation, '**FINAL STATUS:** READY', 'Menu Command Center validation stale final ready status');
  assertIncludes(itemPhotoCaptureAssistValidation, 'Historical validation/source evidence; not current launch certification', 'Item photo capture validation historical boundary status');
  assertIncludes(itemPhotoCaptureAssistValidation, 'Current Release Boundary', 'Item photo capture validation current release boundary heading');
  assertIncludes(itemPhotoCaptureAssistValidation, 'Authenticated desktop owner browser QA', 'Item photo capture validation desktop owner browser QA boundary');
  assertIncludes(itemPhotoCaptureAssistValidation, 'Authenticated mobile owner-shell QA inside `MobileShell`', 'Item photo capture validation mobile shell QA boundary');
  assertIncludes(itemPhotoCaptureAssistValidation, "prepareMediaImage(file, 'menuItem')", 'Item photo capture validation media preparation boundary');
  assertIncludes(itemPhotoCaptureAssistValidation, 'Real-device camera QA on at least one iOS Safari device and one mid-range Android Chrome device', 'Item photo capture validation real-device QA boundary');
  assertNotIncludes(itemPhotoCaptureAssistValidation, 'READY FOR OWNER-SIDE BROWSER SMOKE', 'Item photo capture validation stale owner-side browser smoke verdict');
  assertIncludes(itemPhotoCaptureAssistMobile, 'Implemented mobile support evidence; not current launch certification', 'Item photo capture mobile support launch boundary status');
  assertIncludes(itemPhotoCaptureAssistMobile, 'Current Release Boundary (July 2, 2026)', 'Item photo capture mobile support current release boundary heading');
  assertIncludes(itemPhotoCaptureAssistMobile, 'authenticated mobile owner-shell QA inside `MobileShell`', 'Item photo capture mobile support owner-shell QA boundary');
  assertIncludes(itemPhotoCaptureAssistMobile, 'real-device camera QA on iOS Safari and mid-range Android Chrome', 'Item photo capture mobile support real-device camera QA boundary');
  assertIncludes(itemPhotoCaptureAssistMobile, "media preparation/upload QA through `prepareMediaImage(file, 'menuItem')`", 'Item photo capture mobile support media preparation boundary');
  assertNotIncludes(itemPhotoCaptureAssistMobile, '**Status:** Approved for mobile implementation', 'Item photo capture mobile support stale implementation approval status');
  assertIncludes(productionReadinessAudit, 'Item Photo Capture Assist validation boundary checkpoint', 'Production readiness audit item-photo validation boundary checkpoint');
  assertIncludes(productionReadinessAudit, 'Item Photo Capture Assist mobile-support boundary checkpoint', 'Production readiness audit item-photo mobile-support boundary checkpoint');
  assertIncludes(productionReadinessAudit, 'authenticated mobile owner-shell QA inside `MobileShell`', 'Production readiness audit item-photo mobile owner-shell QA boundary');
  assertIncludes(changelog, 'Item Photo Capture Assist Validation Boundary', 'Changelog item-photo validation boundary entry');
  assertIncludes(changelog, 'Item Photo Capture Assist Mobile Boundary', 'Changelog item-photo mobile boundary entry');
  assertIncludes(productionReadinessReadme, 'Clarified Item Photo Capture Assist validation report', 'Production readiness README item-photo validation boundary version row');
  assertIncludes(molV0ImplementationPlan, 'firebase deploy --project menulist-qa --config firebase.json --only functions:computeDecisionBlocksScores --non-interactive', 'MOL V0 implementation plan scoped QA function deploy command');
  assertNotIncludes(molV0ImplementationPlan, 'Then deploy: `firebase deploy --only functions:computeDecisionBlocksScores`', 'MOL V0 implementation plan broad function deploy instruction');
  assertIncludes(customerAppFirebase, '**Launch boundary:** Not current launch certification or deploy approval.', 'Customer App Firebase top launch/deploy boundary');
  assertIncludes(customerAppFirebase, 'This Firebase cost doc is source-gated runtime/cost evidence; Customer App release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:customer-app-pwa`, real browser/device Customer App QA, scoped scheduler deploy evidence where relevant, analytics rollup evidence, and production-host smoke.', 'Customer App Firebase top current evidence boundary');
  assertIncludes(customerAppFirebase, 'firebase deploy --project menulist-qa --config firebase.json --only functions:computeDecisionBlocksScores --non-interactive', 'Customer App Firebase scoped QA function deploy command');
  assertNotIncludes(customerAppFirebase, '**Deployment:** `firebase deploy --only functions:computeDecisionBlocksScores`', 'Customer App Firebase broad function deploy instruction');
  assertIncludes(messagingOnboardingValidation, 'firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN --project menulist-qa', 'Messaging onboarding validation QA secret setup');
  assertIncludes(messagingOnboardingValidation, 'firebase deploy --only firestore:indexes --project menulist-qa --config firebase.json', 'Messaging onboarding validation scoped QA index deploy command');
  assertIncludes(messagingOnboardingValidation, 'firebase deploy --only firestore:rules --project menulist-qa --config firebase.json', 'Messaging onboarding validation scoped QA rules deploy command');
  assertNotIncludes(messagingOnboardingValidation, 'Deploy Firestore indexes: `firebase deploy --only firestore:indexes`', 'Messaging onboarding validation broad index deploy instruction');
  assertNotIncludes(messagingOnboardingValidation, 'Deploy Firestore rules: `firebase deploy --only firestore:rules`', 'Messaging onboarding validation broad rules deploy instruction');
  assertIncludes(maintenanceTasks, 'Do not run Vercel deploys from this maintenance checklist unless the user', 'Maintenance tasks Vercel approval guard');
  assertNotIncludes(maintenanceTasks, 'vercel --prod', 'Maintenance tasks direct Vercel production deploy command');
  assertIncludes(securityAuthenticationGuide, 'firebase deploy --only firestore:indexes --project menulist-qa --config firebase.json', 'Security authentication guide scoped QA index deploy command');
  assertIncludes(securityAuthenticationGuide, 'Production index deploy requires QA evidence and explicit production approval.', 'Security authentication guide production approval gate');
  assertIncludes(securityAuthenticationGuide, 'Security implementation guide; not current launch certification', 'Security authentication guide launch boundary status');
  assertIncludes(securityAuthenticationGuide, 'auth browser/API smoke', 'Security authentication guide browser/API launch gate');
  assertIncludes(securityAuthenticationGuide, 'Reconfirm the current route inventory before launch.', 'Security authentication guide route inventory recertification');
  assertNotIncludes(securityAuthenticationGuide, '**Status**: ✅ Production Ready', 'Security authentication guide stale production-ready status');
  assertNotIncludes(securityAuthenticationGuide, '✅ **Production-ready authentication system**', 'Security authentication guide stale production-ready summary');
  assertNotIncludes(securityAuthenticationGuide, '**0 security gaps**', 'Security authentication guide stale zero-gap claim');
  assertNotIncludes(securityAuthenticationGuide, 'firebase deploy --only firestore:indexes\n', 'Security authentication guide broad index deploy command');
  assertIncludes(securityEmailValidationGuide, 'Security implementation guide; not current launch certification', 'Security email validation guide launch boundary status');
  assertIncludes(securityEmailValidationGuide, 'disposable-domain update evidence', 'Security email validation guide disposable-domain launch gate');
  assertIncludes(securityEmailValidationGuide, 'Do not run a Vercel deploy from this guide unless the user explicitly approves', 'Security email validation guide Vercel approval guard');
  assertNotIncludes(securityEmailValidationGuide, '**Status:** ✅ Production Ready', 'Security email validation guide stale production-ready status');
  assertNotIncludes(securityEmailValidationGuide, '✅ **Production ready** (tested and deployed)', 'Security email validation guide stale production-ready deployment claim');
  assertNotIncludes(securityEmailValidationGuide, 'vercel --prod', 'Security email validation guide direct Vercel production deploy command');
  assertIncludes(securityAppCheckGuide, '`menulist-qa` (MenuList QA/staging Firebase project)', 'Security App Check guide current QA project example');
  assertIncludes(securityAppCheckGuide, '`menulist` (MenuList production Firebase project)', 'Security App Check guide current production project example');
  assertIncludes(securityAppCheckGuide, 'Code/setup guide; not current launch certification', 'Security App Check guide launch boundary status');
  assertIncludes(securityAppCheckGuide, 'provider token smoke', 'Security App Check guide provider-token launch gate');
  assertNotIncludes(securityAppCheckGuide, 'Code Ready → Needs 15min Setup → Production Ready', 'Security App Check guide stale production-ready progression');
  assertNotIncludes(securityAppCheckGuide, 'Don\'t launch without this!', 'Security App Check guide stale direct launch instruction');
  assertNotIncludes(securityAppCheckGuide, '`ecomsai` (Firebase project name)', 'Security App Check guide stale Firebase project example');
  assertIncludes(securityPaymentAnalysis, 'Historical payment/onboarding security analysis; implemented source evidence only; not current launch certification', 'Payment security analysis launch boundary status');
  assertIncludes(securityPaymentAnalysis, 'Current Release Boundary (July 3, 2026)', 'Payment security analysis current release boundary');
  assertIncludes(securityPaymentAnalysis, 'server-owned onboarding route `src/app/api/onboarding/create-subscription/route.ts`', 'Payment security analysis source baseline onboarding route');
  assertIncludes(securityPaymentAnalysis, '`npm run verify:billing-entitlement-boundary`', 'Payment security analysis billing source gate');
  assertIncludes(securityPaymentAnalysis, 'Razorpay sandbox subscription/top-up/webhook smoke', 'Payment security analysis provider smoke launch gate');
  assertIncludes(securityPaymentAnalysis, 'Provider-failure compensation evidence for tenant/store creation and subscription creation.', 'Payment security analysis compensation launch gate');
  assertIncludes(securityPaymentAnalysis, 'not current testing approval and not current launch certification', 'Payment security analysis testing-footer boundary');
  assertNotIncludes(securityPaymentAnalysis, '**Status:** Analysis Complete - Ready for Implementation', 'Payment security analysis stale implementation-ready status');
  assertNotIncludes(securityPaymentAnalysis, '**If everything works:** We proceed to **Phase 2**', 'Payment security analysis stale phase-2 proceed instruction');
  assertNotIncludes(securityPaymentAnalysis, '**Phase 1 is complete and ready for testing!** 🎉', 'Payment security analysis stale ready-for-testing footer');
  assertIncludes(securityObjectSanitizationPattern, 'Security pattern guide; not current launch certification', 'Security object sanitization pattern launch boundary status');
  assertIncludes(securityObjectSanitizationPattern, 'dangerous-key filtering and Firestore undefined-value sanitization', 'Security object sanitization source review gate');
  assertNotIncludes(securityObjectSanitizationPattern, '**Status:** ✅ Production Ready', 'Security object sanitization stale production-ready status');
  assertNotIncludes(securityObjectSanitizationPattern, '**Pattern Status:** ✅ Production Standard', 'Security object sanitization stale production-standard footer');
  assertIncludes(securityFirebaseCost, 'Firebase cost evidence; not current launch certification', 'Security Firebase cost doc launch boundary status');
  assertIncludes(securityFirebaseCost, 'cost monitoring covers any security path that now writes Firebase data', 'Security Firebase cost doc launch cost-monitoring gate');
  assertNotIncludes(securityFirebaseCost, '**Status:** ✅ Production Ready', 'Security Firebase cost doc stale production-ready status');
  assertIncludes(securityLoginSourceTracking, 'Security implementation guide; not current launch certification', 'Security login-source tracking launch boundary status');
  assertIncludes(securityLoginSourceTracking, 'privacy-safe logging review', 'Security login-source tracking privacy launch gate');
  assertIncludes(securityLoginSourceTracking, 'Source tracking documented - verify current deployment before launch', 'Security login-source tracking footer boundary');
  assertNotIncludes(securityLoginSourceTracking, '**Status:** ✅ Production Ready', 'Security login-source tracking stale production-ready status');
  assertNotIncludes(securityLoginSourceTracking, '**Status:** ✅ Production Active', 'Security login-source tracking stale production-active status');
  assertIncludes(authOnboardingReadme, 'Local source complete; external certification pending', 'Auth onboarding README source/external boundary status');
  assertIncludes(authOnboardingReadme, 'External evidence still pending', 'Auth onboarding README external evidence boundary');
  assertIncludes(authOnboardingReadme, 'Razorpay sandbox checkout', 'Auth onboarding README Razorpay sandbox gate');
  assertIncludes(authOnboardingReadme, 'Narrow mobile browser and PWA handoff QA', 'Auth onboarding README mobile browser gate');
  assertIncludes(authOnboardingSpec, 'Implemented source contract', 'Auth onboarding spec source-contract status');
  assertIncludes(authOnboardingSpec, 'No promise that local source verification certifies providers or deployed production', 'Auth onboarding spec external-certification boundary');
  assertIncludes(authOnboardingImpl, 'Current source map', 'Auth onboarding implementation source-map status');
  assertIncludes(authOnboardingImpl, 'Do not replace provider, device, or deployed-host smoke with these source gates', 'Auth onboarding implementation external-smoke boundary');
  for (const [label, content] of [
    ['Auth onboarding README', authOnboardingReadme],
    ['Auth onboarding spec', authOnboardingSpec],
    ['Auth onboarding implementation', authOnboardingImpl],
  ]) {
    assertNotIncludes(content, '**Status:** ✅ Production Ready', `${label} stale production-ready status`);
    assertNotIncludes(content, '**DOCUMENT STATUS:** ✅ Production Ready', `${label} stale production-ready footer`);
  }
  assertIncludes(ponrOnboardingSpec, 'Historical PONR strategy draft; not current implementation approval or launch certification', 'PONR onboarding spec historical strategy boundary status');
  assertIncludes(ponrOnboardingSpec, 'Current Release Boundary', 'PONR onboarding spec current release boundary heading');
  assertIncludes(ponrOnboardingSpec, 'current onboarding/auth/payment source gates', 'PONR onboarding spec auth/payment source-gate boundary');
  assertIncludes(ponrOnboardingSpec, 'Historical January 2026 planning checklist only; not current implementation approval.', 'PONR onboarding spec historical checklist boundary');
  assertNotIncludes(ponrOnboardingSpec, '**Status:** 🔒 **LOCKED — READY FOR IMPLEMENTATION**', 'PONR onboarding spec stale implementation-ready status');
  assertNotIncludes(ponrOnboardingSpec, '**Document Status:** Ready for implementation', 'PONR onboarding spec stale implementation-ready footer');
  assertIncludes(authOnboardingFirebase, 'Current source contract', 'Auth onboarding Firebase source-contract status');
  assertIncludes(authOnboardingFirebase, 'Firebase Auth operations', 'Auth onboarding Firebase claim/provider operation boundary');
  assertIncludes(authOnboardingFirebase, 'Provider-failure compensation accepts only a normalized user ID and exact positive numeric tenant/store document IDs', 'Auth onboarding Firebase compensation boundary');
  assertIncludes(authOnboardingFirebase, 'A Vercel deploy remains pending until explicitly requested', 'Auth onboarding Firebase deploy boundary');
  assertNotIncludes(authOnboardingFirebase, '**Status:** ✅ Production Ready', 'Auth onboarding Firebase stale production-ready status');
  assertIncludes(authOnboardingMobileSupport, 'Responsive sign-in and website onboarding surface', 'Auth onboarding mobile support surface status');
  assertIncludes(authOnboardingMobileSupport, 'These device/provider checks remain pending until run on the target environment', 'Auth onboarding mobile evidence boundary');
  assertIncludes(authOnboardingMobileSupport, 'Razorpay open, dismissal, return to Pricing, pending recovery, and Billing recovery', 'Auth onboarding mobile browser QA gate');
  assertIncludes(onboardingCentralizationReadme, 'Implemented source evidence; not current launch certification', 'Onboarding centralization launch boundary status');
  assertIncludes(onboardingCentralizationReadme, 'Current Release Boundary (July 2, 2026)', 'Onboarding centralization current release boundary heading');
  assertIncludes(onboardingCentralizationReadme, 'createTenantStoreInTransaction', 'Onboarding centralization source helper reference');
  assertIncludes(onboardingCentralizationReadme, 'npm run verify:agent-readiness', 'Onboarding centralization source gate');
  assertIncludes(onboardingCentralizationReadme, 'npm run verify:auth-security-failure-matrix', 'Onboarding centralization auth-security source gate');
  assertIncludes(onboardingCentralizationReadme, 'Razorpay sandbox evidence where subscription creation is in release scope', 'Onboarding centralization Razorpay launch gate');
  assertIncludes(onboardingCentralizationReadme, 'provider-failure compensation evidence for create-subscription and public claim flows', 'Onboarding centralization compensation launch gate');
  assertNotIncludes(onboardingCentralizationReadme, '> **Status:** Implementation Ready', 'Onboarding centralization stale implementation-ready status');
  assertIncludes(authIndex, 'maxAge: 7 * 24 * 60 * 60', 'Auth options seven-day session source gate');
  assertIncludes(authIndex, 'const emailValidation = validateEmail(email);', 'Auth options disposable email validation source gate');
  assertIncludes(authIndex, 'dbUser = await addAuthPlatformUser(newUser);', 'Auth options OAuth user creation source gate');
  assertIncludes(authIndex, 'tenantId: null', 'Auth options new OAuth tenant unset source gate');
  assertIncludes(authIndex, 'storeId: null', 'Auth options new OAuth store unset source gate');
  assertIncludes(authIndex, "platformRole: 'OWNER'", 'Auth options first OAuth platform role source gate');
  assertIncludes(onboardingCreateSubscriptionRoute, 'const authenticatedHandler = withAuth(handler);', 'Onboarding create-subscription private-response wrapper withAuth source gate');
  assertIncludes(onboardingCreateSubscriptionRoute, 'export const POST = withOnboardingPrivateResponse', 'Onboarding create-subscription withAuth private-response export source gate');
  assertIncludes(onboardingCreateSubscriptionRoute, "getRateLimitForFeature('PAYMENT_ONBOARDING')", 'Onboarding create-subscription rate limit source gate');
  assertIncludes(onboardingCreateSubscriptionRoute, 'readBoundedJsonBody(request, ONBOARDING_SUBSCRIPTION_MAX_BODY_BYTES', 'Onboarding create-subscription bounded body source gate');
  assertIncludes(onboardingCreateSubscriptionRoute, 'validateAPIInput(OnboardingSubscriptionSchema, body)', 'Onboarding create-subscription Zod validation source gate');
  assertIncludes(onboardingCreateSubscriptionRoute, 'createTenantStoreInTransaction(transaction, db, {', 'Onboarding create-subscription atomic tenant/store helper source gate');
  assertIncludes(onboardingCreateSubscriptionRoute, 'updateUserWithTenantStore(transaction, db, userId, core);', 'Onboarding create-subscription user update source gate');
  assertIncludes(onboardingCreateSubscriptionRoute, 'revalidateMenuCache(result.storeId, { tId: result.tenantId })', 'Onboarding create-subscription public cache revalidation source gate');
  assertIncludes(onboardingCreateSubscriptionRoute, 'compensateFailedTenantStoreOnboarding', 'Onboarding create-subscription provider-failure compensation source gate');
  assertIncludes(onboardingCreateSubscriptionRoute, 'razorpayClient.subscriptions.create', 'Onboarding create-subscription Razorpay subscription source gate');
  assertIncludes(onboardingCreateSubscriptionRoute, 'createInitialSubscription(razorpaySubscription.id, subscriptionPayload)', 'Onboarding create-subscription initial subscription source gate');
  assertIncludes(onboardingUserIdBoundary, 'normalizeOnboardingUserId', 'Onboarding user ID boundary helper source gate');
  assertIncludes(onboardingUserIdBoundary, 'const raw = value;', 'Onboarding user ID helper preserves raw helper input before normalization');
  assertIncludes(onboardingUserIdBoundary, 'userId === raw && userId.length > 0 && userId.length <= 160 && isValidFirestoreDocumentId(userId)', 'Onboarding user ID helper rejects whitespace-mutated, empty, oversized, path-shaped, or reserved user IDs');
  assertIncludes(onboardingUserIdBoundary, 'isValidFirestoreDocumentId(userId)', 'Onboarding user ID helper rejects unsafe Firestore document IDs');
  assertIncludes(onboardingCreateTenantStore, 'const normalizedUserId = requireOnboardingUserId(userId);', 'Onboarding user update helper normalizes user IDs before document refs');
  assertIncludes(onboardingCreateTenantStore, '.doc(normalizedUserId)', 'Onboarding user update helper uses normalized user document refs');
  assertNotIncludes(onboardingCreateTenantStore, '.doc(userId);', 'Onboarding user update helper must not use raw user IDs in document refs');
  assertIncludes(businessTypeDataModelReadme, 'Implemented source evidence; migration guarded; not current launch certification', 'Business type data model launch boundary status');
  assertIncludes(businessTypeDataModelReadme, 'Local Source Gate', 'Business type data model source gate documentation');
  assertIncludes(businessTypeDataModelReadme, 'scripts/migrate-business-type-swap.ts', 'Business type data model migration script documentation');
  assertIncludes(businessTypeDataModelReadme, '--write --confirm-project <projectId> --all-stores-and-tenants', 'Business type migration live command boundary');
  assertIncludes(businessTypeDataModelReadme, 'The local source gate verifies code and documentation contracts only.', 'Business type data model local-only boundary');
  assertNotIncludes(businessTypeDataModelReadme, 'Planning — Pre-Implementation', 'Business type data model stale planning status');
  assertNotIncludes(businessTypeDataModelReadme, 'Phase 2', 'Business type data model stale phase-2 wording');
  assertNotIncludes(businessTypeDataModelReadme, 'Phase 3', 'Business type data model stale phase-3 wording');
  assertNotIncludes(businessTypeDataModelReadme, 'DRY_RUN=false', 'Business type data model stale live migration command');
  assertNotIncludes(businessTypeDataModelReadme, 'businessType: userType', 'Business type data model stale userType businessType write');
  assertNotIncludes(authOnboardingSpec, "businessType: 'B2C'", 'Auth onboarding spec stale tenant/store businessType example');
  assertNotIncludes(authOnboardingSpec, "businessIndustry: 'Restaurant'", 'Auth onboarding spec stale tenant businessIndustry example');
  assertNotIncludes(authOnboardingSpec, "businessCategory: 'food_beverage'", 'Auth onboarding spec stale businessCategory example');
  assertIncludes(authOnboardingSpec, 'Tenant/store IDs are server allocated positive numeric document IDs', 'Auth onboarding spec canonical allocation boundary');
  assertIncludes(authOnboardingSpec, 'Plan, interval, currency, price, and credit allowance come from current server plan data', 'Auth onboarding spec server plan authority');
  assertNotIncludes(authOnboardingImpl, 'businessType: userType', 'Auth onboarding implementation stale userType businessType example');
  assertNotIncludes(authOnboardingImpl, 'getBusinessCategory(userType)', 'Auth onboarding implementation stale category derivation example');
  assertIncludes(authOnboardingImpl, 'canonical business type/category fields', 'Auth onboarding implementation canonical business classification contract');
  assertIncludes(onboardingCreateSubscriptionRoute, 'businessType: businessIndustry || FALLBACK_BUSINESS_TYPE,', 'Onboarding route actual business type source gate');
  assertIncludes(onboardingCreateSubscriptionRoute, 'businessIndustry: userType,', 'Onboarding route plan-type marker source gate');
  assertIncludes(onboardingCreateTenantStore, 'businessType: string;', 'Central tenant/store creator actual business type input');
  assertIncludes(onboardingCreateTenantStore, 'businessIndustry?: string;', 'Central tenant/store creator plan-type input');
  assertIncludes(onboardingCreateTenantStore, 'const businessCategory = resolveStoreBusinessCategory(businessType, explicitBusinessCategory);', 'Central tenant/store creator shared category resolver');
  assertIncludes(onboardingCreateTenantStore, 'businessType,', 'Central tenant/store creator writes businessType');
  assertIncludes(onboardingCreateTenantStore, 'businessIndustry,', 'Central tenant/store creator writes businessIndustry');
  assertIncludes(storeTypeSource, "businessIndustry?: string; // Plan type marker: 'B2C' | 'B2B'.", 'StoreDataType businessIndustry source contract');
  assert(businessTypesSharedSource === businessTypesFunctionsSource, 'Business type shared data must match Functions mirror byte-for-byte');
  assertIncludes(businessTypeMigrationScript, "const DRY_RUN = !args.includes('--write');", 'Business type migration dry-run default');
  assertIncludes(businessTypeMigrationScript, "getArg('--project-id') || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT", 'Business type migration explicit project selection');
  assertIncludes(businessTypeMigrationScript, 'Refusing write: pass --confirm-project', 'Business type migration project confirmation guard');
  assertIncludes(businessTypeMigrationScript, 'Refusing write: pass --all-stores-and-tenants', 'Business type migration broad-scope confirmation guard');
  assertIncludes(businessTypeMigrationScript, 'getBusinessCategoryFromSharedData(businessType)', 'Business type migration shared category resolver');
  assertNotIncludes(businessTypeMigrationScript, 'BUSINESS_TYPE_TO_CATEGORY', 'Business type migration must not duplicate business type category map');
  assertNotIncludes(businessTypeMigrationScript, 'DRY_RUN=false', 'Business type migration stale env live command');
  assertIncludes(setClaimsRoute, 'export const POST = withAuth', 'Set claims route withAuth source gate');
  assertIncludes(setClaimsRoute, 'readOptionalBoundedJsonBody(request, SET_CLAIMS_MAX_BODY_BYTES', 'Set claims bounded body source gate');
  assertIncludes(setClaimsRoute, 'validateAPIInput(setClaimsSchema, body)', 'Set claims validation source gate');
  assertIncludes(setClaimsRoute, 'authAdmin.setCustomUserClaims(uid, customClaims)', 'Set claims custom claims source gate');
  assertIncludes(setClaimsRoute, 'authAdmin.createCustomToken(uid, customClaims)', 'Set claims custom token source gate');
  assertIncludes(setClaimsRoute, 'const canonicalWorkspace = canonicalStoreSnapshot.exists', 'Set claims canonical store workspace source gate');
  assertIncludes(setClaimsRoute, 'const claimTenantScope = canonicalWorkspace.tenantScope;', 'Set claims tenant claim derives from canonical workspace');
  assertIncludes(setClaimsRoute, "storeIds: productId === PRODUCT_IDS.ANSWERLATTICE\n                ? [claimStoreScope.documentId]", 'Set claims scopes Answerlattice tokens to the selected canonical membership');
  assertIncludes(setClaimsRoute, '...getStoreIdsClaim(dbUser),', 'Set claims retains valid non-Answerlattice product-profile memberships');
  assertIncludes(setClaimsRoute, 'claimStoreScope.documentId,', 'Set claims includes the canonical selected store in membership claims');
  assertIncludes(paymentHandlerHook, 'const executePostOnboarding = useCallback(async (purchaseIntent: PurchaseIntent) => {', 'Payment handler post-onboarding source gate');
  assertIncludes(paymentHandlerHook, "fetch('/api/onboarding/create-subscription'", 'Payment handler onboarding API source gate');
  assertIncludes(paymentHandlerHook, "readPaymentResponseJson<unknown>(response, 'post_onboarding_subscription_create_response'", 'Payment handler bounded unknown response parsing source gate');
  assertIncludes(paymentHandlerHook, 'isRecord(onboardingPayload) && isRecord(onboardingPayload.subscription)', 'Payment handler onboarding subscription runtime shape guard');
  assertIncludes(paymentHandlerHook, 'isScopeIdentifier(tenantId)', 'Payment handler tenant scope runtime validation source gate');
  assertIncludes(paymentHandlerHook, 'isScopeIdentifier(storeId)', 'Payment handler store scope runtime validation source gate');
  assertIncludes(paymentHandlerHook, 'await update({', 'Payment handler session update source gate');
  assertIncludes(paymentHandlerHook, 'razorpay_signature: paymentResponse.razorpay_signature', 'Payment handler Razorpay signature forwarding source gate');
  assertIncludes(razorpayVerifySubscriptionRoute, 'verifyRazorpaySubscriptionSignature', 'Razorpay verify subscription signature function source gate');
  assertIncludes(razorpayVerifySubscriptionRoute, 'timingSafeEqual', 'Razorpay verify subscription timing-safe comparison source gate');
  assertIncludes(razorpayVerifySubscriptionRoute, 'validateAPIInput(VerifyPaymentRequestSchema, rawData)', 'Razorpay verify subscription validation source gate');
  assertIncludes(razorpayVerifySubscriptionRoute, 'verifyTenantAccess(session, tenantId, storeId, request)', 'Razorpay verify subscription tenant access source gate');
  assertIncludes(razorpayVerifySubscriptionRoute, "canManageBillingMutation(session, request, '/api/razorpay/verify-subscription')", 'Razorpay verify subscription billing mutation access source gate');
  assertIncludes(razorpayVerifySubscriptionRoute, 'providerSubscription?.id !== razorpay_subscription_id', 'Razorpay verify subscription provider id mismatch source gate');
  assertIncludes(razorpayVerifySubscriptionRoute, "payment.status !== 'captured'", 'Razorpay verify subscription captured-payment source gate');
  assertIncludes(razorpayVerifySubscriptionRoute, 'const subscriptionMatchesScope = Number(internalSub.tenantId) === Number(tenantId)', 'Razorpay verify subscription scope match source gate');
  assertIncludes(razorpayVerifySubscriptionRoute, 'applyProductSubscriptionPayment(productId, {', 'Razorpay verify subscription transactional payment application source gate');
  assertIncludes(productBillingServer, "validateTransition(current.status, 'active', 'payment:captured')", 'Razorpay captured-payment state transition source gate');
  assertNotIncludes(razorpayVerifySubscriptionRoute, 'updateProductSubscription(productId, razorpay_subscription_id, updatePayload)', 'Razorpay verify subscription direct update bypass source gate');
  assertIncludes(securityFileUploadGuide, 'Implementation guide; not current launch certification', 'Security file-upload guide launch boundary status');
  assertIncludes(securityFileUploadGuide, 'Storage rules/deploy evidence where changed', 'Security file-upload guide storage/deploy launch gate');
  assertNotIncludes(securityFileUploadGuide, '**Status**: ✅ Fully Implemented & Consolidated', 'Security file-upload guide stale fully-implemented status');
  assertNotIncludes(securityFileUploadGuide, '**Status**: ✅ Production Ready', 'Security file-upload guide stale production-ready status');
  assertIncludes(securityWebhookGuide, 'Implementation guide; not current launch certification', 'Security webhook guide launch boundary status');
  assertIncludes(securityWebhookGuide, 'QA/provider webhook smoke', 'Security webhook guide provider smoke gate');
  assertIncludes(securityWebhookGuide, 'replay/idempotency evidence', 'Security webhook guide replay/idempotency launch gate');
  assertNotIncludes(securityWebhookGuide, '**Status**: ✅ Fully Implemented', 'Security webhook guide stale fully-implemented status');
  assertNotIncludes(securityWebhookGuide, '**Status**: ✅ Production Ready', 'Security webhook guide stale production-ready status');
  assertIncludes(securityMonitoringGuide, 'Implementation guide; not current launch certification', 'Security monitoring guide launch boundary status');
  assertIncludes(securityMonitoringGuide, 'target Sentry/alert destination verification', 'Security monitoring guide alert destination launch gate');
  assertNotIncludes(securityMonitoringGuide, '**Status**: ✅ Fully Implemented', 'Security monitoring guide stale fully-implemented status');
  assertNotIncludes(securityMonitoringGuide, '**Status**: ✅ Production Ready', 'Security monitoring guide stale production-ready status');
  assertNotIncludes(securityMonitoringGuide, '**Coverage**: 100% of security-critical paths', 'Security monitoring guide stale 100 percent coverage claim');
  assertIncludes(securityCorsGuide, 'Implementation guide; not current launch certification', 'Security CORS guide launch boundary status');
  assertIncludes(securityCorsGuide, 'current allowed-origin review', 'Security CORS guide allowed-origin launch gate');
  assertIncludes(securityCorsGuide, 'CORS failure-mode evidence', 'Security CORS guide failure-mode launch gate');
  assertNotIncludes(securityCorsGuide, '**Status**: ✅ Fully Implemented', 'Security CORS guide stale fully-implemented status');
  assertNotIncludes(securityCorsGuide, '**Status**: ✅ Production Ready', 'Security CORS guide stale production-ready status');
  assertIncludes(securityCorsComplete, 'Historical implementation note; not current launch certification', 'Security CORS completion note launch boundary status');
  assertIncludes(securityCorsComplete, 'Launch Certification', 'Security CORS completion note launch certification boundary');
  assertNotIncludes(securityCorsComplete, '**Status**: ✅ **IMPLEMENTED**', 'Security CORS completion note stale implemented status');
  assertNotIncludes(securityCorsComplete, '**Production Ready**: ✅ **YES**', 'Security CORS completion note stale production-ready signoff');
  assertIncludes(securityApiStatus, 'Historical implementation checklist; not current launch certification', 'Security API status launch boundary status');
  assertIncludes(securityApiStatus, 'current API route inventory', 'Security API status current route inventory gate');
  assertNotIncludes(securityApiStatus, '✅ **Production-ready** - Enterprise-grade security', 'Security API status stale production-ready enterprise claim');
  assertIncludes(securityOwaspImplementation, 'Historical OWASP implementation evidence; not current launch certification', 'Security OWASP implementation launch boundary status');
  assertIncludes(securityOwaspImplementation, 'OWASP gap review for touched routes', 'Security OWASP implementation gap-review gate');
  assertNotIncludes(securityOwaspImplementation, '**Security Status:** Production Ready', 'Security OWASP implementation stale production-ready footer');
  assertIncludes(comprehensiveSecurityAudit, 'Historical Source Evidence', 'Comprehensive security audit historical evidence heading');
  assertIncludes(comprehensiveSecurityAudit, '95% source-coverage snapshot', 'Comprehensive security audit historical coverage boundary');
  assertNotIncludes(comprehensiveSecurityAudit, '## ✅ What\'s Production Ready', 'Comprehensive security audit stale production-ready heading');
  assertNotIncludes(comprehensiveSecurityAudit, '**Current Status**: **95% Ready**', 'Comprehensive security audit stale current-ready status');
  assertIncludes(internalFeedbackValidation, 'Firebase deployment evidence when rules/index/function source changes', 'Internal feedback validation Firebase deploy evidence boundary');
  assertIncludes(internalFeedbackValidation, 'Vercel deployment and production-host smoke only after explicit deploy approval', 'Internal feedback validation Vercel deploy approval boundary');
  assertNotIncludes(internalFeedbackValidation, 'firebase deploy --only firestore:indexes\n', 'Internal feedback validation broad index deploy command');
  assertNotIncludes(internalFeedbackValidation, 'firebase deploy --only firestore:rules\n', 'Internal feedback validation broad rules deploy command');
  assertIncludes(aiDataExtractionFinalAudit, 'historical code-readiness evidence, not current MenuList launch certification', 'AI data extraction final audit historical launch boundary');
  assertIncludes(aiDataExtractionFinalAudit, 'What\'s Needed Before Launch Certification', 'AI data extraction final audit current launch certification checklist');
  assertIncludes(aiDataExtractionFinalAudit, 'firebase deploy --only firestore:indexes --project menulist-qa --config firebase.json', 'AI data extraction final audit scoped QA index deploy command');
  assertIncludes(aiDataExtractionFinalAudit, 'Production index deploy requires QA evidence and explicit production approval.', 'AI data extraction final audit production approval gate');
  assertNotIncludes(aiDataExtractionFinalAudit, '# ✅ READY FOR PRODUCTION', 'AI data extraction final audit stale ready-for-production verdict');
  assertIncludes(aiDataExtractionProductionAudit, 'historical code-audit evidence, not current MenuList launch certification', 'AI data extraction production audit historical launch boundary');
  assertNotIncludes(aiDataExtractionProductionAudit, 'The AI Data Extraction feature is production-ready.', 'AI data extraction production audit stale production-ready claim');
  assertIncludes(aiDataExtractionCfExecutionAudit, 'historical Cloud Functions code-audit evidence, not current MenuList launch certification', 'AI data extraction CF audit historical launch boundary');
  assertNotIncludes(aiDataExtractionCfExecutionAudit, 'The extraction pipeline Cloud Functions are **production-ready**.', 'AI data extraction CF audit stale production-ready claim');
  assertIncludes(menuExtractionPipelineVerifier, 'AI extraction final audit is marked as historical code-readiness evidence', 'Menu extraction verifier AI historical audit source gate');
  assertNotIncludes(aiDataExtractionFinalAudit, 'Deploy Firestore indexes: `firebase deploy --only firestore:indexes`', 'AI data extraction final audit broad index deploy instruction');
  assertIncludes(creativeEditorTemplateRegistryValidation, 'Historical deployment evidence only for the retired shared MenuList project', 'Creative editor registry historical ecomsai boundary');
  assertIncludes(creativeEditorTemplateRegistryValidation, 'current MenuList rules/storage deploy evidence must target `menulist-qa` first with `firebase.json`', 'Creative editor registry current QA target boundary');
  assertIncludes(aiMenuManagerValidation, 'firebase deploy --only firestore:rules --project menulist-qa --config firebase.json', 'AI Menu Manager validation current QA rules command');
  assertIncludes(aiMenuManagerValidation, 'Historical `ecomsai` deploy evidence from June 18, 2026 is retained as past validation only.', 'AI Menu Manager validation historical ecomsai boundary');
  assertNotIncludes(aiMenuManagerValidation, 'firebase deploy --only firestore:rules --project ecomsai\n', 'AI Menu Manager validation stale active ecomsai rules command');
  assertIncludes(growthOsAddonFirebase, 'Historical deployment evidence:', 'GrowthOS Firebase doc historical deployment heading');
  assertIncludes(growthOsAddonFirebase, 'This is historical evidence only; do not reuse it as current deployment guidance. Current MenuList rules deploy evidence must target `menulist-qa` first with `firebase.json`', 'GrowthOS Firebase doc current QA target boundary');
  assertIncludes(growthOsAddonValidation, 'This is historical evidence only; do not reuse it as current deployment guidance. Current MenuList rules deploy evidence must target `menulist-qa` first with `firebase.json`', 'GrowthOS validation current QA target boundary');
  assertIncludes(costSelfProtectionReadme, '**Launch boundary:** Not current launch certification or deploy approval.', 'Cost self-protection README top launch/deploy boundary');
  assertIncludes(costSelfProtectionReadme, 'This README documents source-built SAFE_MODE protection; production readiness still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, SAFE_MODE browser/provider/Functions smoke, and production-host smoke.', 'Cost self-protection README top current evidence boundary');
  assertIncludes(costSelfProtectionAudit, 'FIREBASE_PROJECT_ID=menulist-qa node scripts/verification/verify-public-routing-summary-backfill.mjs', 'Cost self-protection audit current QA backfill verifier command');
  assertIncludes(costSelfProtectionAudit, 'Historical MenuList Functions deploy evidence targeted the retired shared project `ecomsai`', 'Cost self-protection audit historical ecomsai deploy boundary');
  assertNotIncludes(costSelfProtectionAudit, 'FIREBASE_PROJECT_ID=ecomsai node scripts/verification/verify-public-routing-summary-backfill.mjs', 'Cost self-protection audit stale ecomsai backfill verifier command');
  assertIncludes(devProdEnvironmentGuide, 'Do not use `menulist-dev` for the current local/preview path.', 'Dev/prod guide current MenuList QA target warning');
  assertIncludes(devProdEnvironmentGuide, '**Launch boundary:** Not current launch certification or deploy approval.', 'Dev/prod guide top launch/deploy boundary');
  assertIncludes(devProdEnvironmentGuide, 'This environment guide cannot approve go-live by itself; production readiness still requires External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.', 'Dev/prod guide top current evidence boundary');
  assertIncludes(devProdEnvironmentGuide, 'Create or confirm a test tenant/store in `menulist-qa`.', 'Dev/prod guide current QA fixture task');
  assertIncludes(devProdEnvironmentGuide, 'Local/preview Firebase targets confirmed for `menulist-qa` and `answerlattice-qa`', 'Dev/prod guide current local/preview target checklist');
  assertIncludes(devProdEnvironmentGuide, 'Firebase QA Project Access', 'Dev/prod guide current Firebase account summary');
  assertIncludes(devProdEnvironmentGuide, 'Feature Flags: Target-Environment Review', 'Dev/prod guide feature-flag target review heading');
  assertIncludes(devProdEnvironmentGuide, 'This guide does not authorize blanket env-specific overrides or a "turn everything on" launch ritual.', 'Dev/prod guide feature-flag launch boundary');
  assertIncludes(devProdEnvironmentGuide, 'Do not flip every operational flag as a launch ritual.', 'Dev/prod guide blanket operational flag guard');
  assertIncludes(devProdEnvironmentGuide, 'Every External Certification Runbook gate relevant to the release has audit evidence', 'Dev/prod guide launch verdict external evidence requirement');
  assertIncludes(devProdEnvironmentGuide, 'Deploy MenuList production rules/indexes/functions explicitly with `--project menulist` only after QA evidence and explicit production approval.', 'Dev/prod guide production infrastructure approval gate');
  assertIncludes(devProdEnvironmentGuide, 'Do not copy `.env.local` or `.env.prod` wholesale into Vercel.', 'Dev/prod guide legacy env file Vercel guard');
  assertIncludes(devProdEnvironmentGuide, 'Configure MenuList QA secrets first with commands that include `--project menulist-qa`.', 'Dev/prod guide QA-first Functions secret setup');
  assertIncludes(devProdEnvironmentGuide, 'Repeat for `--project menulist` only after QA evidence and explicit production secret approval.', 'Dev/prod guide production secret approval gate');
  assertIncludes(devProdEnvironmentGuide, '**RESOLVED**', 'Dev/prod guide incident playbook resolved status');
  assertIncludes(devProdEnvironmentGuide, '[MenuList Incident Response Runbook](./incident-response-runbook.md)', 'Dev/prod guide maintained incident response runbook link');
  assertIncludes(devProdEnvironmentGuide, 'Expensive-work circuit breaker', 'Dev/prod guide SAFE_MODE capability boundary');
  assertIncludes(devProdEnvironmentGuide, 'Runtime Environment Validation', 'Dev/prod guide runtime environment validation capability');
  assertIncludes(devProdEnvironmentGuide, 'Pre-deploy Source Gate', 'Dev/prod guide pre-deploy source gate capability');
  assertIncludes(devProdEnvironmentGuide, 'Incident Response', 'Dev/prod guide incident response capability');
  assertNotIncludes(devProdEnvironmentGuide, 'Firebase dev project created and configured', 'Dev/prod guide stale Firebase dev checklist');
  assertNotIncludes(devProdEnvironmentGuide, 'Create test tenant/store in dev project', 'Dev/prod guide stale dev fixture wording');
  assertNotIncludes(devProdEnvironmentGuide, '--project menulist-dev', 'Dev/prod guide stale MenuList dev deploy command');
  assertNotIncludes(devProdEnvironmentGuide, 'Feature Flags: Dev vs Prod Recommended State', 'Dev/prod guide stale env-specific flag heading');
  assertNotIncludes(devProdEnvironmentGuide, 'When ready for production, change these flags to `true` in order:', 'Dev/prod guide stale blanket production flag instruction');
  assertNotIncludes(devProdEnvironmentGuide, '## Production Go-Live Checklist', 'Dev/prod guide stale go-live checklist heading');
  assertNotIncludes(devProdEnvironmentGuide, 'You go LIVE only when:', 'Dev/prod guide stale direct launch approval wording');
  assertNotIncludes(devProdEnvironmentGuide, 'Set "Production" scope for prod values (.env.prod)', 'Dev/prod guide stale .env.prod Vercel scope instruction');
  assertNotIncludes(devProdEnvironmentGuide, 'Copy ALL variables from `.env.local`', 'Dev/prod guide stale .env.local bulk Vercel copy instruction');
  assertNotIncludes(devProdEnvironmentGuide, 'Copy ALL variables from `.env.prod`', 'Dev/prod guide stale .env.prod bulk Vercel copy instruction');
  assertNotIncludes(devProdEnvironmentGuide, 'Update `[CHANGE FOR PROD]` marked variables', 'Dev/prod guide stale .env.prod production marker instruction');
  assertNotIncludes(devProdEnvironmentGuide, 'firebase functions:secrets:set GEMINI_AI_KEY\n', 'Dev/prod guide unscoped GEMINI secret command');
  assertNotIncludes(devProdEnvironmentGuide, 'firebase functions:secrets:set TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`', 'Dev/prod guide unscoped Telegram secret summary');
  assertNotIncludes(devProdEnvironmentGuide, 'No documented runbook for production incidents. Need to create', 'Dev/prod guide stale missing incident runbook claim');
  assertNotIncludes(devProdEnvironmentGuide, '**Incident response playbook**                 |', 'Dev/prod guide stale incident response gap row');
  assertNotIncludes(devProdEnvironmentGuide, 'Global kill switch', 'Dev/prod guide stale global SAFE_MODE claim');
  assertNotIncludes(devProdEnvironmentGuide, 'but no hard startup assertion', 'Dev/prod guide stale runtime validation gap claim');
  assertNotIncludes(devProdEnvironmentGuide, 'but no pre-deploy invariant checker', 'Dev/prod guide stale pre-deploy gate gap claim');
  assertIncludes(incidentResponseRunbook, '**Launch boundary:** This runbook closes the missing codebase-side operating procedure.', 'Incident response runbook launch boundary');
  assertIncludes(incidentResponseRunbook, 'SAFE_MODE is not a global read/write kill switch', 'Incident response runbook SAFE_MODE scope boundary');
  assertIncludes(incidentResponseRunbook, 'The app helper fails open if its config read fails', 'Incident response runbook SAFE_MODE failure boundary');
  assertIncludes(incidentResponseRunbook, 'Do not mute alerts during active P0 or P1 response.', 'Incident response runbook alert mute boundary');
  assertIncludes(incidentResponseRunbook, 'previous known-good deployment', 'Incident response runbook deployment rollback evidence');
  assertIncludes(incidentResponseRunbook, 'previous known-good commit', 'Incident response runbook source rollback evidence');
  assertIncludes(incidentResponseRunbook, 'Answerlattice incidents use its separate Firebase configuration', 'Incident response runbook product separation');
  assertIncludes(incidentResponseRunbook, '__docs__/audits/incidents/', 'Incident response runbook durable evidence location');
  assertIncludes(incidentResponseRunbook, 'YYYY-MM-DD-incident-slug.md', 'Incident response runbook durable evidence filename convention');
  assertIncludes(incidentResponseRunbook, 'npm run verify:agent-readiness', 'Incident response runbook maintained source gate');
  assertIncludes(safeModeRuntime, 'if (!FEATURE_FLAGS.ENABLE_COST_PROTECTION) return null;', 'SAFE_MODE feature flag gate');
  assertIncludes(safeModeRuntime, 'failOpen: true', 'SAFE_MODE runtime fail-open diagnostic');
  assertIncludes(productionReadinessAudit, 'Incident response operating boundary checkpoint', 'Production readiness audit incident response checkpoint');
  assertIncludes(productionReadinessAudit, 'the final `npm run verify:production-readiness-local` run passes 97/97 checks, including all 93 child root `verify:*` scripts', 'Production readiness audit incident response aggregate evidence');
  assertIncludes(changelog, 'MenuList Incident Response Operating Boundary', 'Changelog incident response operating boundary entry');
  for (const [label, content] of [
    ['MenuList QA Functions env', functionsQaEnv],
    ['MenuList production Functions env', functionsProductionEnv],
    ['MenuList QA Functions env template', functionsQaEnvExample],
    ['MenuList production Functions env template', functionsProductionEnvExample],
  ]) {
    assertIncludes(content, 'ENABLE_MESSAGING_ONBOARDING=false', `${label} messaging onboarding provider processing must fail closed`);
    assertIncludes(content, 'MESSAGING_ONBOARDING_PROVIDERS=whatsapp', `${label} messaging onboarding provider list`);
    assertIncludes(content, 'ENABLE_MESSAGING_ONBOARDING_TRACKING=true', `${label} messaging onboarding tracking default`);
  }
  assertIncludes(functionsEnvSetup, 'Messaging onboarding processing is disabled by default in those files.', 'Functions env setup messaging onboarding fail-closed docs');
  assertIncludes(functionsEnvSetup, 'ENABLE_MESSAGING_ONBOARDING=false', 'Functions env setup messaging onboarding disabled default');
  [
    'ANSWERLATTICE_CRON_SECRET',
    'ANSWERLATTICE_GEMINI_AI_KEY',
    'ANSWERLATTICE_GEMINI_AI_KEY_2',
    'ANSWERLATTICE_GEMINI_AI_KEY_3',
    'ANSWERLATTICE_GEMINI_AI_KEY_4',
    'ANSWERLATTICE_PUBLIC_BUNDLE_SALT',
    'ANSWERLATTICE_SMTP_HOST',
    'ANSWERLATTICE_SMTP_PORT',
    'ANSWERLATTICE_SMTP_USER',
    'ANSWERLATTICE_SMTP_PASS',
  ].forEach((secretName) => {
    assertIncludes(functionsEnvSetup, secretName, `Functions env setup Answerlattice secret ${secretName}`);
  });
  assertIncludes(productSetupDoc, 'Keep `ENABLE_MESSAGING_ONBOARDING=false` until real WhatsApp secrets', 'Product setup doc messaging onboarding fail-closed setup');
  assertIncludes(productSetupDoc, 'Set `ENABLE_MESSAGING_ONBOARDING=true` only for the target being smoked', 'Product setup doc messaging onboarding targeted enable step');
  assertIncludes(messagingOnboardingReadme, '**Status:** Source-implemented, provider-disabled — not a current launch or deploy certification', 'Messaging onboarding README status fail-closed wording');
  assertIncludes(messagingOnboardingReadme, 'repo env files default false until real Meta secrets and webhook registration exist', 'Messaging onboarding README fail-closed runtime gate');
  assertIncludes(messagingOnboardingReadme, '`/whatsapp` is informational and routes its actions to the signed-in `/create-menu` photo or public-link intake.', 'Messaging onboarding README public intake fail-closed wording');
  assertIncludes(messagingOnboardingImpl, '**Status:** Source-implemented, provider-disabled — not a current launch or deploy certification', 'Messaging onboarding impl status fail-closed wording');
  assertIncludes(messagingOnboardingImpl, '`false` in checked-in MenuList Functions env files/templates', 'Messaging onboarding impl fail-closed runtime gate');
  assertIncludes(messagingOnboardingSpec, '**Status:** Source-implemented, provider-disabled — not a current launch or deploy certification', 'Messaging onboarding spec status fail-closed wording');
  assertIncludes(messagingOnboardingSpec, 'checked-in Cloud Function runtime env templates default `false`', 'Messaging onboarding spec fail-closed runtime gate');
  assertIncludes(messagingOnboardingFirebase, '**Status:** Source-implemented, provider-disabled — not a current launch or deploy certification', 'Messaging onboarding firebase doc status fail-closed wording');
  assertIncludes(messagingOnboardingFirebase, 'checked-in Functions targets remain disabled', 'Messaging onboarding Firebase public intake fail-closed wording');
  assertIncludes(messagingOnboardingFirebase, '**Launch boundary:** Not current launch certification or deploy approval.', 'Messaging onboarding Firebase doc top launch/deploy boundary');
  assertIncludes(messagingOnboardingFirebase, 'production readiness still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped Functions deploy evidence, real non-production Meta provider smoke, browser/device QA where relevant, and production-host smoke.', 'Messaging onboarding Firebase doc top current evidence boundary');
  assertIncludes(messagingOnboardingValidation, 'Checked-in runtime env files default `ENABLE_MESSAGING_ONBOARDING=false`', 'Messaging onboarding validation fail-closed setup');
  assertIncludes(messagingOnboardingRunbook, 'Checked-in MenuList Functions env files default `false`', 'Messaging onboarding runbook fail-closed setup');
  assertIncludes(ownerActionItems, 'Keep `ENABLE_MESSAGING_ONBOARDING=false` until real Firebase secrets and Meta webhook registration are in place', 'Owner action items messaging onboarding fail-closed task');
  assertIncludes(productionCertificationRunbook, '`ENABLE_MESSAGING_ONBOARDING=true` only after real secrets and Meta webhook registration exist for the target.', 'Production certification runbook WhatsApp targeted enable prerequisite');
  assertIncludes(productSetupDoc, 'npm run verify:functions-deploy-preflight', 'Product setup doc MenuList Functions deploy preflight');
  assertIncludes(productSetupDoc, 'firebase deploy --project menulist-qa --config firebase.json --only firestore:rules,firestore:indexes,storage --non-interactive', 'Product setup doc MenuList QA rules/indexes/storage deploy command');
  assertIncludes(productSetupDoc, 'MenuList production Firebase infrastructure deploys require staging evidence and explicit production approval in the active session.', 'Product setup doc MenuList production infrastructure approval gate');
  assertIncludes(productSetupDoc, 'For the current Storage rules cutover, record Gate 2A QA evidence in `__docs__/production-readiness/external-certification-runbook.md` before production Storage rules deploy approval.', 'Product setup doc MenuList Storage Gate 2A production approval gate');
  assertIncludes(productSetupDoc, 'firebase deploy --project menulist --config firebase.json --only firestore:rules,firestore:indexes,storage --non-interactive', 'Product setup doc MenuList production rules/indexes/storage deploy command');
  assertIncludes(productSetupDoc, 'Do not replace the scoped target list with a broad `--only functions` deploy', 'Product setup doc broad MenuList Functions deploy guard');
  assertNotIncludes(productSetupDoc, 'firebase deploy --project menulist-qa --config firebase.json --only functions\n', 'Product setup doc broad MenuList QA Functions deploy command');
  assertNotIncludes(productSetupDoc, 'firebase deploy --project menulist --config firebase.json --only functions\n', 'Product setup doc broad MenuList production Functions deploy command');
  assertIncludes(fiveYearVision, 'Use production Functions deploys only through `__docs__/production-readiness/external-certification-runbook.md` Gate 1 after QA evidence and explicit production deploy approval.', 'Five-year vision MenuList Functions Gate 1 deploy boundary');
  assertIncludes(fiveYearVision, 'Do not replace the scoped target list with a broad `--only functions` deploy.', 'Five-year vision broad Functions deploy guard');
  assertIncludes(answerlatticeActionItems, 'Use External Certification Gate 1; do not run a broad --only functions deploy.', 'Answerlattice action items MenuList deploy boundary');
  assertIncludes(answerlatticeMultiProductTenancy, 'MenuList production Functions require QA evidence and explicit production deploy approval.', 'Answerlattice multi-product tenancy MenuList production deploy boundary');
  assertIncludes(answerlatticeProductSeparation, 'MenuList production Functions require QA evidence and explicit production deploy approval.', 'Answerlattice product separation MenuList production deploy boundary');
  assertIncludes(menuExtractionPipelineFirebase, 'Current retry evidence must not target `ecomsai`: treat that project as historical only.', 'Menu extraction pipeline historical ecomsai boundary');
  assertIncludes(menuExtractionPipelineFirebase, 'Do not reuse the older command shapes from those historical attempts.', 'Menu extraction pipeline stale deploy-command boundary');
  assertIncludes(menuExtractionPipelineFirebase, 'Current Menu Extraction retry evidence must start with `npm run verify:functions-deploy-preflight`', 'Menu extraction pipeline Functions deploy preflight boundary');
  assertIncludes(menuExtractionPipelineFirebase, 'record the exact scoped target list and reason in the production-readiness audit before deploy retry', 'Menu extraction pipeline subset audit boundary');
  assertIncludes(menuExtractionPipelineFirebase, 'External Certification Runbook Gate 1 scoped deploy against `menulist-qa`', 'Menu extraction pipeline current MenuList QA deploy boundary');
  assertIncludes(menuHealthMonitorFirebase, 'Do not reuse the older command shape from that attempt.', 'Menu health monitor stale deploy-command boundary');
  assertIncludes(menuHealthMonitorFirebase, '**Launch boundary:** Not current launch certification or deploy approval.', 'Menu health monitor Firebase doc top launch/deploy boundary');
  assertIncludes(menuHealthMonitorFirebase, 'production readiness still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped Functions deploy evidence, post-publish smoke, browser/device QA where relevant, and production-host smoke.', 'Menu health monitor Firebase doc top current evidence boundary');
  assertIncludes(menuHealthMonitorFirebase, 'Current Menu Health Monitor retry evidence must start with `npm run verify:functions-deploy-preflight`', 'Menu health monitor Functions deploy preflight boundary');
  assertIncludes(menuHealthMonitorFirebase, 'record the exact scoped `menulist-qa` target list and reason in the production-readiness audit before deploy retry', 'Menu health monitor subset audit boundary');
  assertIncludes(menuHealthMonitorFirebase, 'Production deploys require QA evidence and explicit production deploy approval.', 'Menu health monitor production approval boundary');
  assertNotIncludes(menuHealthMonitorFirebase, 'firebase deploy --only functions:', 'Menu health monitor stale broad Functions deploy command shape');
  assertNotIncludes(menuHealthMonitorFirebase, 'triggerSchedulerManually --project menulist-qa', 'Menu health monitor stale scheduler manual deploy target');
  assertIncludes(mapsPlaceCheckValidation, 'Do not reuse the older command shape from that attempt.', 'Maps Place Check stale deploy-command boundary');
  assertIncludes(mapsPlaceCheckValidation, 'Current Maps Place Check retry evidence must start with `npm run verify:functions-deploy-preflight`', 'Maps Place Check Functions deploy preflight boundary');
  assertIncludes(mapsPlaceCheckValidation, 'firebase deploy --project menulist-qa --config firebase.json --only functions:mapsPlaceCheck --non-interactive', 'Maps Place Check current scoped QA deploy command');
  assertIncludes(mapsPlaceCheckValidation, 'Latest July 5 raw-provider-output retry completed predeploy lint/build, then failed before upload with Cloud Resource Manager HTTP 403 caller permission', 'Maps Place Check latest scoped deploy blocker evidence');
  assertIncludes(mapsPlaceCheckValidation, 'The July 5, 2026 raw-provider-output boundary retry also completed predeploy lint/build and failed before upload with Cloud Resource Manager HTTP 403 caller permission for `menulist-qa`.', 'Maps Place Check latest scoped deploy runtime note');
  assertIncludes(mapsPlaceCheckValidation, 'Production deploys require QA evidence and explicit production deploy approval.', 'Maps Place Check production approval boundary');
  assertNotIncludes(mapsPlaceCheckValidation, 'firebase deploy --only functions:mapsPlaceCheck --project menulist-qa', 'Maps Place Check stale broad Functions deploy command shape');
  assertIncludes(aiDataExtractionImpl, 'That `ecomsai` target is historical evidence only', 'AI data extraction historical ecomsai boundary');
  assertIncludes(aiDataExtractionImpl, 'do not reuse that retired target or command shape', 'AI data extraction retired command-shape boundary');
  assertIncludes(aiDataExtractionImpl, 'External Certification Runbook Gate 1 flow with `menulist-qa`', 'AI data extraction current MenuList QA deploy boundary');
  assertIncludes(aiDataExtractionImpl, 'Historical production-readiness code-audit category', 'AI data extraction historical production-readiness score label');
  assertNotIncludes(aiDataExtractionImpl, 'firebase deploy --only functions:processMenuImages --project ecomsai', 'AI data extraction stale ecomsai Functions deploy command');
  assertNotIncludes(aiDataExtractionImpl, '| Production Readiness | 10/10 |', 'AI data extraction stale production-readiness score row');
  assertIncludes(productionReadinessAudit, 'AI Data Extraction retired deploy-command boundary checkpoint', 'Production readiness audit AI Data Extraction retired deploy-command checkpoint');
  assertIncludes(productionReadinessAudit, 'Historical readiness-score wording checkpoint', 'Production readiness audit historical readiness-score checkpoint');
  assertIncludes(changelog, 'AI Data Extraction Retired Deploy Command Boundary', 'Changelog AI Data Extraction retired deploy-command boundary entry');
  assertIncludes(changelog, 'Historical Readiness Score Wording Boundary', 'Changelog historical readiness-score boundary entry');
  assertIncludes(menuLinkImportValidation, 'This `ecomsai` deployment is historical validation evidence only', 'Menu link import historical ecomsai boundary');
  assertIncludes(menuLinkImportValidation, 'do not reuse that retired target or command shape', 'Menu link import retired target command-shape boundary');
  assertIncludes(menuLinkImportValidation, 'Current Menu Link Import retry evidence must start with `npm run verify:functions-deploy-preflight`', 'Menu link import Functions deploy preflight boundary');
  assertIncludes(menuLinkImportValidation, 'External Certification Runbook Gate 1 flow against `menulist-qa`', 'Menu link import current MenuList QA deploy boundary');
  assertNotIncludes(menuLinkImportValidation, 'firebase deploy --only functions:processMenuImagesJob --project ecomsai', 'Menu link import stale ecomsai Functions deploy command');
  assertNotIncludes(menuExtractionPipelineFirebase, 'Retry the same scoped deploy after billing/project access is restored.', 'Menu extraction pipeline stale ecomsai retry instruction');
  assertNotIncludes(menuExtractionPipelineFirebase, 'firebase deploy --only functions:', 'Menu extraction pipeline stale broad Functions deploy command shape');
  assertNotIncludes(menuExtractionPipelineFirebase, 'PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" firebase deploy --only functions', 'Menu extraction pipeline stale local PATH deploy wrapper');
  assertNotIncludes(menuExtractionPipelineFirebase, '--project ecomsai', 'Menu extraction pipeline stale ecomsai deploy command');
  for (const [label, content] of [
    ['Codex Answerlattice rules', codexAnswerlatticeRules],
    ['Cascade Answerlattice rules', cascadeAnswerlatticeRules],
  ]) {
    assertIncludes(content, "separate from MenuList's current `menulist-qa` local/preview target and `menulist` production target", `${label} current MenuList target wording`);
    assertNotIncludes(content, "MenuList's `ecomsai`", `${label} stale MenuList project wording`);
  }
  for (const [label, content] of [
    ['Five-year vision', fiveYearVision],
    ['Answerlattice implementation action items', answerlatticeActionItems],
    ['Answerlattice multi-product tenancy', answerlatticeMultiProductTenancy],
    ['Answerlattice product separation playbook', answerlatticeProductSeparation],
  ]) {
    assertNotIncludes(content, 'firebase deploy --only functions --project menulist-qa', `${label} broad MenuList QA Functions deploy command`);
    assertNotIncludes(content, 'firebase deploy --only functions --project menulist', `${label} broad MenuList production Functions deploy command`);
  }
  assertIncludes(productSetupDoc, '`MOBILE_QA_REQUIRE_EXPLICIT_FIXTURE`', 'Product setup doc mobile QA verification-only env boundary');
  assertIncludes(envStagingExample, 'RAZORPAY_KEY_ID=rzp_test_<id>', 'Staging env template Razorpay test key prefix');
  assertIncludes(envStagingExample, 'NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_<id>', 'Staging env template Razorpay public test key prefix');
  assertIncludes(envProductionExample, 'RAZORPAY_KEY_ID=rzp_live_<id>', 'Production env template Razorpay live key prefix');
  assertIncludes(envProductionExample, 'NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_<id>', 'Production env template Razorpay public live key prefix');
  assertIncludes(productionCertificationRunbook, '`RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID` both start with `rzp_test_`', 'Production certification runbook Razorpay sandbox public/private key prefix');
  assertIncludes(productionCertificationRunbook, '`RAZORPAY_KEY_SECRET` belongs to the same Razorpay test account as `RAZORPAY_KEY_ID`', 'Production certification runbook Razorpay same-account secret');
  assertIncludes(productionCertificationRunbook, '`RAZORPAY_WEBHOOK_SECRET` belongs to the same Razorpay test webhook endpoint used for this smoke', 'Production certification runbook Razorpay webhook secret scope');
  assertIncludes(productionCertificationRunbook, 'MOBILE_QA_REQUIRE_EXPLICIT_FIXTURE=1', 'Production certification runbook mobile owner explicit fixture mode');
  assertIncludes(productionCertificationRunbook, 'MOBILE_QA_PROJECT_ID=<non-production-project-id>', 'Production certification runbook mobile owner project id prerequisite');
  assertIncludes(productionCertificationRunbook, 'MOBILE_QA_PROJECT_NAME="<expected menu/project name>"', 'Production certification runbook mobile owner project name prerequisite');
  assertIncludes(productionCertificationRunbook, 'The selected owner store has active subscription access or unexpired starter activation', 'Production certification runbook mobile owner eligible fixture prerequisite');
  assertIncludes(mobileOwnerMenuVerifier, "MOBILE_QA_ENV_FILE || '.env'", 'Mobile owner verifier env-file override');
  assertIncludes(mobileOwnerMenuVerifier, "MOBILE_QA_REQUIRE_EXPLICIT_FIXTURE === '1'", 'Mobile owner verifier explicit fixture mode');
  assertIncludes(mobileOwnerMenuVerifier, "MOBILE_QA_CDP_TIMEOUT_MS", 'Mobile owner verifier CDP timeout env');
  assertIncludes(mobileOwnerMenuVerifier, 'await mkdir(outputDir, { recursive: true });', 'Mobile owner verifier screenshot output directory creation');
  assertIncludes(mobileOwnerMenuVerifier, 'const MOBILE_REQUIRED_NAV_TABS = [', 'Mobile owner verifier required navigation set');
  assertIncludes(mobileOwnerMenuVerifier, 'exerciseMobileNavigationTab(', 'Mobile owner verifier tab traversal');
  assertIncludes(mobileOwnerMenuVerifier, 'hasPrimaryNavigationLandmark', 'Mobile owner verifier navigation landmark evidence');
  assertIncludes(mobileOwnerMenuVerifier, 'hasPageOverflow: documentWidth > innerWidth + 1', 'Mobile owner verifier page overflow evidence');
  assertIncludes(mobileOwnerMenuVerifier, 'clippedInteractiveLabels', 'Mobile owner verifier clipped-control evidence');
  assertIncludes(mobileOwnerMenuVerifier, 'navTouchTargetsMeetMinimum', 'Mobile owner verifier touch-target evidence');
  assertIncludes(productionCertificationRunbook, 'traverses Today, Menu, Share, and More', 'Production certification runbook complete owner navigation coverage');
  assertIncludes(functionsSecrets, "WHATSAPP_ACCESS_TOKEN: 'WHATSAPP_ACCESS_TOKEN'", 'Functions WhatsApp secret registry');
  assertIncludes(functionsSecrets, 'SECRETS.WHATSAPP_ACCESS_TOKEN', 'Functions WhatsApp secret group');
  assertNotIncludes(functionsSecrets, 'WHATSAPP_API_TOKEN', 'Functions WhatsApp secret registry must not use stale token naming');
  assertIncludes(messagingOnboardingImpl, 'firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN --project menulist-qa', 'Messaging onboarding active QA access token secret setup docs');
  assertIncludes(messagingOnboardingImpl, 'firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID --project menulist-qa', 'Messaging onboarding active QA phone number secret setup docs');
  assertIncludes(messagingOnboardingImpl, 'firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN --project menulist-qa', 'Messaging onboarding active QA verify token secret setup docs');
  assertIncludes(messagingOnboardingImpl, 'firebase functions:secrets:set WHATSAPP_APP_SECRET --project menulist-qa', 'Messaging onboarding active QA app secret setup docs');
  assertIncludes(messagingOnboardingImpl, 'Production values require QA provider smoke evidence and explicit production secret approval', 'Messaging onboarding active production secret approval gate');
  assertNotIncludes(messagingOnboardingImpl, 'firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN\n', 'Messaging onboarding active unscoped access token secret command');
  assertNotIncludes(messagingOnboardingImpl, 'firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID\n', 'Messaging onboarding active unscoped phone number secret command');
  assertNotIncludes(messagingOnboardingImpl, 'firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN\n', 'Messaging onboarding active unscoped verify token secret command');
  assertNotIncludes(messagingOnboardingImpl, 'firebase functions:secrets:set WHATSAPP_APP_SECRET\n', 'Messaging onboarding active unscoped app secret command');
  assertNotIncludes(messagingOnboardingImpl, 'WHATSAPP_API_TOKEN', 'Messaging onboarding active docs must not use stale WhatsApp API token naming');
  assertIncludes(answerlatticeFunctionsPackage.scripts['deploy:qa'], '--project answerlattice-qa', 'Answerlattice Functions QA deploy script');
  assertIncludes(answerlatticeFunctionsPackage.scripts['deploy:prod'], '--project answerlattice', 'Answerlattice Functions production deploy script');
}

function platformPagePathToFile(pagePath) {
  if (pagePath === '/') return 'src/app/(website)/page.tsx';
  if (/^\/[^/]+\/resources\/[^/]+$/.test(pagePath)) {
    return 'src/app/(website)/[locale]/resources/[slug]/page.tsx';
  }
  if (/^\/[^/]+\/resources$/.test(pagePath)) {
    return 'src/app/(website)/[locale]/resources/page.tsx';
  }
  if (pagePath.startsWith('/resources/') && pagePath !== '/resources') {
    return 'src/app/(website)/resources/[slug]/page.tsx';
  }
  return `src/app/(website)${pagePath}/page.tsx`;
}

function collectPageFiles(absDir) {
  const files = [];
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const absPath = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectPageFiles(absPath));
    } else if (entry.name === 'page.tsx') {
      files.push(absPath);
    }
  }
  return files;
}

function listWebsiteConcreteChildRoutes(segment) {
  const segmentRoot = path.join(ROOT, 'src/app/(website)', segment);
  return fs
    .readdirSync(segmentRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `/${segment}/${entry.name}`)
    .filter((routePath) => exists(platformPagePathToFile(routePath)))
    .sort();
}

function answerlatticePagePathToFile(pagePath) {
  if (pagePath === '/') return 'src/app/sites/answerlattice/page.tsx';
  return `src/app/sites/answerlattice${pagePath}/page.tsx`;
}

function verifyMenuListDiscovery() {
  const {
    DISCOVERY_CRAWLERS,
    PLATFORM_DISCOVERY_PAGES,
    PUBLIC_DISCOVERY_DISALLOWED_PATHS,
    getPlatformDiscoveryBaseUrl,
  } = require('../../src/lib/seo/discoveryPolicy');
  const {
    getWebsiteResourceArticles,
    WEBSITE_RESOURCE_REVIEWED_ROUTE_LOCALES,
  } = require('../../src/content/websiteResources');
  const {
    WEBSITE_RESOURCE_PLANNED_INDIAN_LOCALES,
  } = require('../../src/content/websiteResources/locales');
  const sitemap = read('public/sitemap.xml');
  const robots = read('public/robots.txt');
  const llms = read('public/llms.txt');
  const llmsFull = read('public/llms-full.txt');
  const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const mainWebsiteImpl = read('__docs__/main-website/main-website_impl.md');
  const featureConfig = read('src/config/features.ts');
  const agentReadinessReadme = read('__docs__/agent-readiness-strategy/README.md');
  const agentReadinessSpec = read('__docs__/agent-readiness-strategy/agent-readiness-strategy_spec.md');
  const agentReadinessImpl = read('__docs__/agent-readiness-strategy/agent-readiness-strategy_impl.md');
  const agentReadinessWebsite = read('__docs__/agent-readiness-strategy/agent-readiness-strategy_website.md');
  const agentReadinessMarketing = read('__docs__/agent-readiness-strategy/agent-readiness-strategy_marketing.md');
  const agentReadinessHelpdoc = read('__docs__/agent-readiness-strategy/agent-readiness-strategy_helpdoc.md');
  const agentReadinessFirebase = read('__docs__/agent-readiness-strategy/agent-readiness-strategy_firebase.md');
  const agentReadinessMobile = read('__docs__/agent-readiness-strategy/agent-readiness-strategy_mobile-support.md');
  const menulistWebsiteConstants = read('src/constants/menulist/website.ts');
  const schemaMarkup = read('src/components/website/SchemaMarkup.tsx');
  const pageStructuredData = read('src/components/website/WebsitePageStructuredData.tsx');
  const languageSwitcher = read('src/components/website/shared/WebsiteLanguageSwitcher.tsx');
  const localizedResourceLayout = read('src/app/(website)/[locale]/layout.tsx');
  const resourceShell = read('src/components/website/resources/ResourcePageShell.tsx');
  const rootLayout = read('src/app/layout.tsx');
  const websiteLayout = read('src/app/(website)/layout.tsx');
  const createMenuSuccessPage = read('src/app/(website)/create-menu/success/page.tsx');
  const ownerReferralInvitePage = read('src/app/(website)/invite/page.tsx');
  const signinPage = read('src/app/(global-pages)/signin/page.tsx');
  const forgotPasswordPage = read('src/app/(global-pages)/forgot-password/page.tsx');
  const clientMenuPage = read('src/app/client/[[...slug]]/page.tsx');
  const homepage = read('src/app/(website)/page.tsx');
  const nextConfig = read('next.config.js');
  const middleware = read('src/proxy.ts');
  assertIncludes(featureConfig, 'ENABLE_AGENT_DISCOVERY: false', 'MenuList agent discovery reserved flag default');
  assertIncludes(featureConfig, 'RESERVED ONLY — No code is connected to this flag', 'MenuList agent discovery reserved flag source comment');
  assertIncludes(featureConfig, 'Production: Keep false until an approved endpoint reads it', 'MenuList agent discovery reserved flag production boundary');
  assertNotIncludes(featureConfig, 'ENABLE_AGENT_DISCOVERY: true', 'MenuList agent discovery reserved flag must stay disabled until source-backed endpoint exists');
  assert(!exists('src/app/api/agent-discovery/route.ts'), 'MenuList must not expose an unapproved agent-discovery API route');
  assert(!exists('src/app/api/agents/route.ts'), 'MenuList must not expose an unapproved agents API route');
  [
    ['Agent readiness README', agentReadinessReadme],
    ['Agent readiness spec', agentReadinessSpec],
    ['Agent readiness implementation doc', agentReadinessImpl],
    ['Agent readiness Firebase doc', agentReadinessFirebase],
    ['Agent readiness mobile doc', agentReadinessMobile],
  ].forEach(([label, doc]) => {
    [
      'Phase 2',
      'Phase 3',
      'PHASE 2',
      'PHASE 3',
      'post-launch',
      'future',
      'Future',
      'DEFER',
      'deferred',
      'placeholder',
      'Placeholder',
      'Current Phase',
    ].forEach((token) => {
      assertNotIncludes(doc, token, `${label} stale agent-roadmap wording`);
    });
  });
  [
    'reserved disabled flag only',
    'No current MenuList route, API, or Cloud Function reads `ENABLE_AGENT_DISCOVERY`',
  ].forEach((token) => {
    assertIncludes(agentReadinessReadme, token, `Agent readiness README source contract ${token}`);
  });
  [
    'STATIC DISCOVERY LAYER COMPLETE — no dynamic agent endpoint',
    'NOT CURRENT RUNTIME — keep reserved flag disabled',
    'Not connected to any current route, API, Cloud Function, or client workflow',
    'Conditional Agent Endpoint Candidates (Not Current Runtime)',
  ].forEach((token) => {
    assertIncludes(agentReadinessImpl, token, `Agent readiness implementation source contract ${token}`);
  });
  [
    'Current Static Discovery Layer',
    'disabled and not connected to any current route, API, Cloud Function, or client workflow',
    'reserved for a separate source-backed implementation decision',
  ].forEach((token) => {
    assertIncludes(agentReadinessSpec, token, `Agent readiness spec source contract ${token}`);
  });
  assertIncludes(agentReadinessFirebase, '`ENABLE_AGENT_DISCOVERY` is disabled and unused', 'Agent readiness Firebase disabled flag boundary');
  [
    ['Agent readiness spec', agentReadinessSpec],
    ['Agent readiness website', agentReadinessWebsite],
    ['Agent readiness marketing', agentReadinessMarketing],
    ['Agent readiness helpdoc', agentReadinessHelpdoc],
  ].forEach(([label, doc]) => {
    assertIncludes(doc, 'npm run verify:agent-readiness', `${label} source gate`);
  });
  [
    ['Agent readiness README', agentReadinessReadme],
    ['Agent readiness spec', agentReadinessSpec],
    ['Agent readiness website', agentReadinessWebsite],
    ['Agent readiness marketing', agentReadinessMarketing],
    ['Agent readiness helpdoc', agentReadinessHelpdoc],
  ].forEach(([label, doc]) => {
    assert(doc.toLowerCase().includes('external'), `${label} must include external-system claim boundary marker`);
  });
  const agentReadinessClaimSurface = [
    agentReadinessReadme,
    agentReadinessSpec,
    agentReadinessWebsite,
    agentReadinessMarketing,
    agentReadinessHelpdoc,
    llmsFull,
  ].join('\n');
  [
    'MenuList automatically makes your business discoverable',
    'makes sure the answer is accurate',
    'every AI assistant understands',
    'instantly readable',
    'every search engine',
    'the answer is always accurate',
    'discoverable by every AI assistant',
    'Structured for every AI assistant',
    'naturally discover and trust',
    'naturally prefer',
    'AI assistants prefer MenuList data',
    'agents read and trust',
    'Data is updated in real-time by business owners',
    'Owner updates menu → instantly structured for AI',
    'The businesses with structured data get found first',
    'AI trusts it',
    'The AI gives the customer accurate, up-to-date information',
    'ensures the business shows up',
    'Real-time accuracy',
    'Instant publish',
    'always accurate',
    'always current',
  ].forEach((phrase) => {
    assertNotIncludes(agentReadinessClaimSurface, phrase, `Agent readiness external claim boundary ${phrase}`);
  });
  [
    'External AI and search systems decide what they crawl, cite, show, or summarize',
    'not a ranking, citation, or answer-placement guarantee',
  ].forEach((token) => {
    assertIncludes(agentReadinessReadme, token, `Agent readiness README claim boundary ${token}`);
  });
  assertIncludes(
    agentReadinessSpec,
    'it does not guarantee crawler access, ranking, citation, or answer placement',
    'Agent readiness spec external guarantee boundary',
  );
  assertIncludes(
    agentReadinessWebsite,
    'those external systems decide what they show, cite, or summarize',
    'Agent readiness website external decision boundary',
  );
  assertIncludes(
    agentReadinessMarketing,
    'not a guarantee that any external system will show, cite, rank, or refresh the business',
    'Agent readiness marketing external guarantee boundary',
  );
  assertIncludes(
    agentReadinessHelpdoc,
    'they decide what they show, cite, or refresh',
    'Agent readiness helpdoc external decision boundary',
  );
  assertIncludes(
    llms,
    'Search engines and AI systems decide what they crawl, index, show, cite, or summarize.',
    'MenuList llms.txt external crawl/citation boundary',
  );
  assertIncludes(
    llmsFull,
    'Data reflects owner-approved saves after the public cache refresh path settles',
    'MenuList llms-full freshness boundary',
  );
  assertIncludes(
    llmsFull,
    'should not be interpreted as a guarantee that Google, Bing, ChatGPT, Perplexity, Claude, or any other external system will crawl, rank, cite, show, or refresh MenuList content.',
    'MenuList llms-full external guarantee boundary',
  );
  assertIncludes(
    productionReadinessAudit,
    'Agent Readiness external-system claim-boundary checkpoint',
    'Production readiness audit Agent Readiness external claim checkpoint',
  );
  assertIncludes(
    changelog,
    'Agent Readiness External Claim Boundary',
    'Changelog Agent Readiness external claim checkpoint',
  );
  if (exists('.env')) {
    const localEnv = read('.env');
    assertIncludes(localEnv, 'NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.digital', 'Local/QA platform domain config');
    assertIncludes(localEnv, 'NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID=menulist-qa', 'Local/QA public MenuList Firebase project');
    assertIncludes(localEnv, 'MENULIST_FIREBASE_PROJECT_ID=menulist-qa', 'Local/QA server MenuList Firebase project');
    assertNotIncludes(localEnv.toLowerCase(), 'ecomsai', 'Local/QA ignored env retired project');
  }
  if (exists('.env.prod')) {
    const productionEnv = read('.env.prod');
    assertIncludes(productionEnv, 'NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.ai', 'Production platform domain config');
    assertIncludes(productionEnv, 'NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID=menulist', 'Production public MenuList Firebase project');
    assertIncludes(productionEnv, 'MENULIST_FIREBASE_PROJECT_ID=menulist', 'Production server MenuList Firebase project');
    assertNotIncludes(productionEnv.toLowerCase(), 'ecomsai', 'Production ignored env retired project');
  }
  assert(getPlatformDiscoveryBaseUrl() === 'https://menulist.ai', 'MenuList discovery base URL must default to https://menulist.ai');
  assertIncludes(menulistWebsiteConstants, 'getProductDeploymentTarget("menulist", "production").url', 'MenuList website canonical URL constant');
  assertIncludes(menulistWebsiteConstants, 'MenuList - One Official Customer Link for Menus and Services', 'MenuList website title constant');
  assertIncludes(rootLayout, 'MENULIST_SITE_TITLE', 'MenuList root layout metadata');
  assertIncludes(rootLayout, 'MENULIST_SITE_DESCRIPTION', 'MenuList root layout metadata');
  assertIncludes(rootLayout, 'MENULIST_SITE_URL', 'MenuList root layout metadata');
  assertIncludes(rootLayout, 'canonical: siteUrl', 'MenuList root layout canonical metadata');
  assertIncludes(websiteLayout, 'MENULIST_SITE_TITLE', 'MenuList website layout metadata');
  assertIncludes(websiteLayout, 'MENULIST_SITE_DESCRIPTION', 'MenuList website layout metadata');
  assertIncludes(websiteLayout, 'MENULIST_SITE_URL', 'MenuList website layout metadata');
  assertIncludes(websiteLayout, 'canonical: siteUrl', 'MenuList website layout canonical metadata');
  assertNotIncludes(rootLayout, 'MenuList - Upload Your Menu Online', 'MenuList root layout metadata');
  assertNotIncludes(homepage, "'use client'", 'MenuList homepage');
  assertNotIncludes(schemaMarkup, 'next/script', 'MenuList schema markup');
  assertNotIncludes(schemaMarkup, '/logo.png', 'MenuList schema markup');
  assertNotIncludes(schemaMarkup, 'NEXT_PUBLIC_APP_URL', 'MenuList schema markup');
  assertIncludes(schemaMarkup, 'MENULIST_SITE_URL', 'MenuList schema markup canonical URL');
  assertIncludes(pageStructuredData, 'MENULIST_SITE_URL', 'MenuList page structured data canonical URL');
  assertNotIncludes(pageStructuredData, 'NEXT_PUBLIC_APP_URL', 'MenuList page structured data');
  assertNotIncludes(rootLayout, 'NEXT_PUBLIC_APP_URL', 'MenuList root layout metadata');
  assertNotIncludes(websiteLayout, 'NEXT_PUBLIC_APP_URL', 'MenuList website layout metadata');
  assertIncludes(schemaMarkup, 'JsonLdScript', 'MenuList schema markup');
  assertNotIncludes(createMenuSuccessPage, "'use client'", 'MenuList create-menu success metadata wrapper');
  assertIncludes(createMenuSuccessPage, 'CreateMenuSuccessClient', 'MenuList create-menu success metadata wrapper');
  assertIncludes(createMenuSuccessPage, "canonical: '/create-menu/success'", 'MenuList create-menu success canonical metadata');
  assertIncludes(createMenuSuccessPage, 'index: false', 'MenuList create-menu success robots');
  assertIncludes(createMenuSuccessPage, 'follow: false', 'MenuList create-menu success robots');
  assertIncludes(createMenuSuccessPage, 'nocache: true', 'MenuList create-menu success robots');
  assertIncludes(signinPage, 'index: false', 'MenuList signin page noindex metadata');
  assertIncludes(signinPage, 'follow: false', 'MenuList signin page noindex metadata');
  assertIncludes(forgotPasswordPage, 'index: false', 'MenuList forgot-password page noindex metadata');
  assertIncludes(forgotPasswordPage, 'follow: false', 'MenuList forgot-password page noindex metadata');
  assertIncludes(clientMenuPage, 'let hasUnsafeProjectPath = Boolean(slugSegments[0] && !projectSlugForLookup);', 'MenuList unsafe public menu path noindex guard');
  assertIncludes(clientMenuPage, 'hasUnsafeProjectPath = Boolean(slugSegments[1] && !projectSlugForLookup);', 'MenuList outlet unsafe public menu path noindex guard');
  assertIncludes(clientMenuPage, 'const missingProjectPath = hasUnsafeProjectPath || (', 'MenuList stale public menu noindex guard');
  assertIncludes(clientMenuPage, 'shouldLoadProjectMetadata', 'MenuList stale public menu noindex guard');
  assertIncludes(clientMenuPage, '&& !metadataProjectResult', 'MenuList stale public menu noindex guard');
  assertIncludes(clientMenuPage, "reason: 'missing_menu_content' as const", 'MenuList stale public menu noindex reason');
  assertIncludes(clientMenuPage, 'missingProjectFallbackCanonical', 'MenuList stale public menu canonical fallback');
  assertIncludes(clientMenuPage, "metadataT('menu.metadataUnavailableTitle', { businessName: resolvedStoreName })", 'MenuList localized stale public menu title');
  assertIncludes(clientMenuPage, 'let resolvedPublicTruthRobots = publicTruthRobots', 'MenuList stale public menu detail noindex guard');
  assertIncludes(clientMenuPage, 'contextSegments.length >= 2', 'MenuList stale public menu detail noindex guard');
  assertIncludes(clientMenuPage, 'Menu detail not available | ${resolvedStoreName}', 'MenuList stale public menu detail title');
  assertIncludes(middleware, 'NOINDEX_PATH_PREFIXES', 'MenuList middleware noindex path registry');
  assertIncludes(middleware, "response.headers.set('X-Robots-Tag', 'noindex, nofollow')", 'MenuList middleware X-Robots-Tag noindex header');
  for (const noindexPrefix of [
    '/signin',
    '/forgot-password',
    '/error',
    '/dashboard',
    '/app',
    '/account',
    '/billing',
    '/settings',
    '/api',
    '/client',
    '/create-menu/success',
    '/create-menu/preview',
  ]) {
    assertIncludes(middleware, `'${noindexPrefix}'`, `MenuList middleware noindex prefix ${noindexPrefix}`);
  }
  assertNotIncludes(nextConfig, "source: '/product', destination: '/how-it-works', permanent: true", 'MenuList global redirects');
  assertIncludes(middleware, "pathname === '/product'", 'MenuList legacy product redirect');
  assertIncludes(middleware, "url.pathname = '/how-it-works'", 'MenuList legacy product redirect');
  assertIncludes(middleware, "domainInfo.type === 'platform' || domainInfo.type === 'localhost'", 'MenuList legacy product redirect host guard');

  assertIncludes(robots, 'https://menulist.ai/llms.txt', 'MenuList robots');
  assertIncludes(robots, 'https://menulist.ai/llms-full.txt', 'MenuList robots');
  assertIncludes(robots, 'Sitemap: https://menulist.ai/sitemap.xml', 'MenuList robots');
  assertNotIncludes(robots, 'www.menulist.ai', 'MenuList robots');
  for (const crawler of DISCOVERY_CRAWLERS) {
    assertIncludes(robots, `User-agent: ${crawler}`, `MenuList robots crawler ${crawler}`);
  }
  for (const disallowedPath of PUBLIC_DISCOVERY_DISALLOWED_PATHS) {
    assertIncludes(robots, `Disallow: ${disallowedPath}`, `MenuList robots disallow ${disallowedPath}`);
  }

  assertNotIncludes(sitemap, 'www.menulist.ai', 'MenuList sitemap');
  assertNotIncludes(sitemap, 'https://menulist.ai/product', 'MenuList sitemap');
  for (const plannedLocale of WEBSITE_RESOURCE_PLANNED_INDIAN_LOCALES) {
    assertNotIncludes(
      sitemap,
      `https://menulist.ai/${plannedLocale}/resources`,
      `MenuList sitemap planned ${plannedLocale} resources`,
    );
  }
  for (const reviewedLocale of WEBSITE_RESOURCE_REVIEWED_ROUTE_LOCALES) {
    assertIncludes(sitemap, `hreflang="${reviewedLocale}"`, `MenuList sitemap ${reviewedLocale} hreflang`);
    assertIncludes(localizedResourceLayout, `'${reviewedLocale}'`, `MenuList localized resource layout messages ${reviewedLocale}`);
  }
  assertIncludes(localizedResourceLayout, 'dir={language?.direction', 'MenuList localized resource layout direction support');
  assertIncludes(languageSwitcher, 'usePathname', 'MenuList website language switcher localized resource routing');
  assertIncludes(languageSwitcher, 'buildWebsiteResourcePath', 'MenuList website language switcher localized resource routing');
  assertIncludes(languageSwitcher, 'isReviewedWebsiteResourceLocale', 'MenuList website language switcher localized resource routing');
  assertIncludes(languageSwitcher, 'router.push(localizedResourcePath)', 'MenuList website language switcher localized resource routing');
  assertNotIncludes(llms, 'https://menulist.ai/product', 'MenuList llms.txt');

  const discoveryPagePaths = new Set(PLATFORM_DISCOVERY_PAGES.map((page) => page.path));
  const concreteWebsiteRouteFamilies = [
    '/tools',
    ...listWebsiteConcreteChildRoutes('tools'),
    ...listWebsiteConcreteChildRoutes('industries'),
  ];
  for (const routePath of concreteWebsiteRouteFamilies) {
    assert(discoveryPagePaths.has(routePath), `MenuList discovery policy missing concrete website route ${routePath}`);
    assertIncludes(mainWebsiteImpl, `\`${routePath}\``, `Main website implementation route table ${routePath}`);
  }

  const dynamicRouteFiles = new Set([
    'src/app/(website)/resources/[slug]/page.tsx',
    'src/app/(website)/[locale]/resources/page.tsx',
    'src/app/(website)/[locale]/resources/[slug]/page.tsx',
  ]);
  const websitePageFiles = collectPageFiles(path.join(ROOT, 'src/app/(website)'))
    .map((filePath) => path.relative(ROOT, filePath).split(path.sep).join('/'));
  const concreteRouteFileCount = websitePageFiles.filter((filePath) => !dynamicRouteFiles.has(filePath)).length;
  const englishResourceArticleCount = getWebsiteResourceArticles('en-US').length;
  const localizedResourceHubCount = WEBSITE_RESOURCE_REVIEWED_ROUTE_LOCALES.length;
  const localizedResourceArticleCount = localizedResourceHubCount * englishResourceArticleCount;
  const implementedWebsiteRouteCount = concreteRouteFileCount
    + englishResourceArticleCount
    + localizedResourceHubCount
    + localizedResourceArticleCount;
  assertIncludes(
    mainWebsiteImpl,
    `**Total: ${implementedWebsiteRouteCount} implemented website routes`,
    'Main website implementation route inventory total',
  );
  assertIncludes(
    mainWebsiteImpl,
    `${concreteRouteFileCount} concrete route files`,
    'Main website implementation concrete route inventory total',
  );
  assertIncludes(
    mainWebsiteImpl,
    `${englishResourceArticleCount} generated English resource articles`,
    'Main website implementation English resource route inventory total',
  );
  assertIncludes(
    mainWebsiteImpl,
    `${localizedResourceHubCount} reviewed localized resource hubs`,
    'Main website implementation localized resource hub route inventory total',
  );
  assertIncludes(
    mainWebsiteImpl,
    `${localizedResourceArticleCount} reviewed localized resource articles`,
    'Main website implementation localized resource article route inventory total',
  );
  assertIncludes(mainWebsiteImpl, '| `/invite` |', 'Main website implementation private invite route inventory');
  assertIncludes(mainWebsiteImpl, 'Private utility; `noindex`, omitted from sitemap/LLM discovery', 'Main website implementation private invite discovery boundary');
  assertIncludes(ownerReferralInvitePage, 'robots: { index: false, follow: false, nocache: true }', 'Owner Referral invite route noindex boundary');
  assertNotIncludes(sitemap, 'https://menulist.ai/invite', 'MenuList sitemap private invite route');
  assertNotIncludes(llms, 'https://menulist.ai/invite', 'MenuList llms.txt private invite route');
  assertNotIncludes(llmsFull, 'https://menulist.ai/invite', 'MenuList llms-full.txt private invite route');
  assertIncludes(
    productionReadinessAudit,
    'Main website route inventory checkpoint',
    'Production readiness audit main website route inventory checkpoint',
  );
  assertIncludes(
    productionReadinessAudit,
    'Main website invite route inventory checkpoint',
    'Production readiness audit private invite route inventory checkpoint',
  );
  assertIncludes(
    changelog,
    'Main Website Route Inventory Boundary',
    'Changelog main website route inventory checkpoint',
  );
  assertIncludes(
    changelog,
    'Main Website Invite Route Inventory',
    'Changelog private invite route inventory checkpoint',
  );

  for (const page of PLATFORM_DISCOVERY_PAGES) {
    const routeFile = platformPagePathToFile(page.path);
    assert(exists(routeFile), `MenuList route file missing for ${page.path}: ${routeFile}`);
    assertIncludes(sitemap, `https://menulist.ai${page.path === '/' ? '/' : page.path}`, `MenuList sitemap ${page.path}`);

    const content = read(routeFile);
    if (page.path === '/') {
      assertIncludes(content, '<SchemaMarkup />', 'MenuList homepage structured data');
    } else if (page.path === '/resources') {
      assertIncludes(content, 'ResourceHubPageShell', 'MenuList resources hub route shell');
      assertIncludes(resourceShell, 'ResourceStructuredData', 'MenuList resources hub structured data');
      assertIncludes(resourceShell, 'type="hub"', 'MenuList resources hub structured data');
      assertIncludes(llms, 'https://menulist.ai/resources', 'MenuList llms.txt resources hub');
    } else if (page.path.startsWith('/resources/')) {
      const slug = page.path.replace('/resources/', '');
      const resourceContent = read('src/content/websiteResources/en-US.ts');
      assertIncludes(content, 'generateStaticParams', `MenuList resource dynamic params ${page.path}`);
      assertIncludes(content, 'ResourceArticlePageShell', `MenuList resource route shell ${page.path}`);
      assertIncludes(resourceShell, 'ResourceStructuredData', `MenuList resource structured data ${page.path}`);
      assertIncludes(resourceShell, 'type="article"', `MenuList resource article structured data ${page.path}`);
      assertIncludes(resourceContent, `slug: '${slug}'`, `MenuList resource content ${page.path}`);
      assertIncludes(llms, `https://menulist.ai${page.path}`, `MenuList llms.txt ${page.path}`);
    } else if (/^\/[^/]+\/resources(?:\/[^/]+)?$/.test(page.path)) {
      const {
        getWebsiteResourceArticle,
        getWebsiteResourcesCopy,
        isReviewedWebsiteResourceLocale,
      } = require('../../src/content/websiteResources');
      const [, locale, slug] = page.path.match(/^\/([^/]+)\/resources(?:\/([^/]+))?$/);
      assert(isReviewedWebsiteResourceLocale(locale), `MenuList localized resource locale must be reviewed: ${locale}`);
      assert(getWebsiteResourcesCopy(locale).localeStatus === 'reviewed', `MenuList localized resource copy must be reviewed: ${locale}`);
      assertIncludes(content, 'generateStaticParams', `MenuList localized resource dynamic params ${page.path}`);
      assertIncludes(content, slug ? 'ResourceArticlePageShell' : 'ResourceHubPageShell', `MenuList localized resource shell ${page.path}`);
      assertIncludes(content, 'buildResource', `MenuList localized resource metadata ${page.path}`);
      assertIncludes(sitemap, `https://menulist.ai${page.path}`, `MenuList sitemap ${page.path}`);
      assertIncludes(sitemap, `hreflang="${locale}" href="https://menulist.ai${page.path}"`, `MenuList sitemap hreflang ${page.path}`);
      assertIncludes(llmsFull, `https://menulist.ai${page.path}`, `MenuList llms-full.txt ${page.path}`);
      if (!slug) {
        assertIncludes(llms, `https://menulist.ai${page.path}`, `MenuList llms.txt ${page.path}`);
      } else {
        assert(getWebsiteResourceArticle(slug, locale), `MenuList localized resource content ${page.path}`);
      }
    } else {
      assertIncludes(content, 'WebsitePageStructuredData', `MenuList page structured data ${page.path}`);
      assertIncludes(content, `path="${page.path}"`, `MenuList structured data path ${page.path}`);
    }
  }
}

function verifyAnswerlatticeDiscovery() {
  const { ANSWERLATTICE_PUBLIC_PAGES } = require('../../src/app/sites/answerlattice/siteConfig');
  const answerlatticeInstallContract = require('../../src/lib/answerlattice/installContract/contract');
  const {
    ANSWERLATTICE_PUBLIC_BRAND,
    ANSWERLATTICE_PUBLIC_CLAIM_GUARDRAILS,
    ANSWERLATTICE_PUBLIC_DOMAIN_DECISION,
    ANSWERLATTICE_RESOURCE_ARTICLES,
  } = require('../../src/app/sites/answerlattice/publicContent');
  const robotsRoute = read('src/app/sites/answerlattice/robots.txt/route.ts');
  const robotsPolicy = read('src/lib/seo/answerlatticeRobotsPolicy.ts');
  const homepageStructuredData = read('src/app/sites/answerlattice/components/StructuredData.tsx');
  const pageStructuredData = read('src/app/sites/answerlattice/components/PageStructuredData.tsx');
  const resourceStructuredData = read('src/app/sites/answerlattice/resources/ResourceStructuredData.tsx');
  const resourceArticlePage = read('src/app/sites/answerlattice/resources/ResourceArticlePage.tsx');
  const resourceAnalytics = read('src/app/sites/answerlattice/components/AnswerlatticeResourceAnalytics.tsx');
  const productFeatureRoute = read('src/app/sites/answerlattice/product/ProductFeatureRoutePage.tsx');
  const siteConfig = read('src/app/sites/answerlattice/siteConfig.ts');
  const layout = read('src/app/sites/answerlattice/layout.tsx');
  const middleware = read('src/proxy.ts');
  const productDomains = read('src/constants/productDomains.ts');
  const llmsContract = read('src/lib/answerlattice/installContract/contract.ts');
  const renderedLlms = answerlatticeInstallContract.renderAnswerlatticeLlmsTxt();
  const renderedLlmsFull = answerlatticeInstallContract.renderAnswerlatticeLlmsFullTxt();

  assert(ANSWERLATTICE_PUBLIC_BRAND === 'AnswerLattice', 'AnswerLattice public brand casing must stay locked');
  assert(ANSWERLATTICE_PUBLIC_DOMAIN_DECISION.canonicalHost === 'answerlattice.com', 'AnswerLattice production canonical host must remain answerlattice.com');
  assert(ANSWERLATTICE_PUBLIC_DOMAIN_DECISION.previewHost === 'answerlattice.menulist.online', 'AnswerLattice preview host must remain answerlattice.menulist.online');
  assertIncludes(siteConfig, 'ANSWERLATTICE_COMPARISONS', 'AnswerLattice site registry comparisons');
  assertIncludes(siteConfig, 'ANSWERLATTICE_DEVELOPER_DOCS', 'AnswerLattice site registry developer docs');
  assertIncludes(siteConfig, 'ANSWERLATTICE_RESOURCE_ARTICLES', 'AnswerLattice site registry resource articles');
  assertIncludes(layout, "applicationName: 'AnswerLattice'", 'AnswerLattice layout metadata brand casing');
  assertIncludes(productDomains, "name: 'AnswerLattice'", 'AnswerLattice product domain display name');
  assertIncludes(middleware, 'buildAnswerlatticeWebsiteRewritePath', 'AnswerLattice homepage internal rewrite helper');
  assertIncludes(middleware, "(publicPath === '/' || publicPath === '/home') ? basePath", 'AnswerLattice homepage internal rewrite target');
  assertIncludes(middleware, 'isLegacyAnswerlatticePublicHostname', 'AnswerLattice legacy public host redirect');
  assertIncludes(middleware, "'canonica.app'", 'AnswerLattice legacy public host redirect');
  assertIncludes(middleware, "getProductDeploymentTarget('answerlattice', 'production')", 'AnswerLattice legacy public host canonical target');
  assertIncludes(llmsContract, '/developers', 'AnswerLattice llms.txt developer hub');
  assertIncludes(llmsContract, '/comparisons', 'AnswerLattice llms.txt comparisons hub');
  assertIncludes(renderedLlms, '/resources', 'AnswerLattice llms.txt resources hub');
  assertIncludes(renderedLlmsFull, '/resources/launch-support-checklist', 'AnswerLattice llms-full.txt resource articles');
  assertIncludes(renderedLlmsFull, '/resources/support-runtime-safety', 'AnswerLattice llms-full.txt resource articles');

  assertIncludes(robotsRoute, 'renderAnswerlatticeRobotsTxt(ANSWERLATTICE_SITE_URL)', 'Answerlattice robots route renderer');
  assertIncludes(robotsPolicy, 'DISCOVERY_CRAWLERS', 'Answerlattice robots policy');
  assertIncludes(robotsPolicy, '/llms.txt', 'Answerlattice robots policy');
  assertIncludes(robotsPolicy, '/llms-full.txt', 'Answerlattice robots policy');
  assertIncludes(homepageStructuredData, 'JsonLdScript', 'Answerlattice homepage structured data');
  assertIncludes(homepageStructuredData, 'hasPart', 'Answerlattice homepage route graph');
  assertIncludes(homepageStructuredData, 'buildAnswerlatticePageId', 'Answerlattice homepage structured data ID helper');
  assertIncludes(pageStructuredData, 'BreadcrumbList', 'Answerlattice page structured data');
  assertIncludes(pageStructuredData, 'buildPageId', 'Answerlattice page structured data ID helper');
  assertIncludes(resourceStructuredData, "'Article'", 'AnswerLattice resource article schema');
  assertIncludes(resourceStructuredData, "'FAQPage'", 'AnswerLattice resource FAQ schema');
  assertIncludes(resourceStructuredData, 'ANSWERLATTICE_RESOURCE_ARTICLES', 'AnswerLattice resource hub item list');
  assertIncludes(resourceArticlePage, 'AnswerlatticeResourceStructuredData', 'AnswerLattice resource article renderer structured data');
  assertIncludes(resourceArticlePage, 'AnswerlatticeResourceAnalytics', 'AnswerLattice resource article analytics');
  assertIncludes(resourceAnalytics, 'answerlattice_resource_page_view', 'AnswerLattice resource analytics page view');
  assertIncludes(resourceAnalytics, 'chat.openai.com', 'AnswerLattice resource analytics AI referrer coverage');
  assertIncludes(productFeatureRoute, 'AnswerlatticePageStructuredData', 'Answerlattice product feature route wrapper');

  for (const article of ANSWERLATTICE_RESOURCE_ARTICLES) {
    assert(article.path.startsWith('/resources/'), `AnswerLattice resource article path must stay under /resources: ${article.path}`);
    assert(article.title.includes('Answerlattice') === false, `AnswerLattice resource article title must use public brand casing: ${article.path}`);
  }

  for (const page of ANSWERLATTICE_PUBLIC_PAGES) {
    for (const privatePrefix of ANSWERLATTICE_PUBLIC_CLAIM_GUARDRAILS.privateRoutePrefixes) {
      assert(
        !page.path.startsWith(privatePrefix),
        `AnswerLattice public registry must not include private/runtime route ${page.path}`,
      );
    }

    const routeFile = answerlatticePagePathToFile(page.path);
    assert(exists(routeFile), `Answerlattice route file missing for ${page.path}: ${routeFile}`);

    const content = read(routeFile);
    if (page.path === '/') {
      assertIncludes(content, '<AnswerlatticeStructuredData />', 'Answerlattice homepage structured data');
      continue;
    }

    if (page.path === '/resources') {
      assertIncludes(content, 'AnswerlatticeResourceStructuredData', 'AnswerLattice resources hub structured data');
      assertIncludes(content, 'type="hub"', 'AnswerLattice resources hub structured data');
      assertIncludes(content, 'AnswerlatticeResourceAnalytics', 'AnswerLattice resources hub analytics');
      continue;
    }

    if (content.includes('ProductCapabilityLandingPage') || content.includes('SeoLandingPage') || content.includes('UseCaseLandingPage')) {
      assertIncludes(content, `canonicalPath="${page.path}"`, `Answerlattice structured data path ${page.path}`);
      continue;
    }

    if (page.path.startsWith('/product/') && content.includes('ProductFeatureRoutePage')) {
      continue;
    }

    if (content.includes('AnswerlatticeComparisonDetailPage')) {
      assertIncludes(content, `const comparisonPath = '${page.path}'`, `AnswerLattice comparison structured data path ${page.path}`);
      continue;
    }

    if (content.includes('AnswerlatticeDeveloperDocPage')) {
      const hasSharedPathConstant = content.includes(`const docPath = '${page.path}'`);
      const hasDirectPathProp = content.includes(`<AnswerlatticeDeveloperDocPage docPath="${page.path}" />`);
      assert(
        hasSharedPathConstant || hasDirectPathProp,
        `AnswerLattice developer structured data path ${page.path} must use the registry path as a shared constant or direct docPath prop`,
      );
      continue;
    }

    if (content.includes('AnswerlatticeResourceArticlePage')) {
      assertIncludes(content, `const articlePath = '${page.path}'`, `AnswerLattice resource structured data path ${page.path}`);
      continue;
    }

    assertIncludes(content, 'AnswerlatticePageStructuredData', `Answerlattice page structured data ${page.path}`);
    assertIncludes(content, `path="${page.path}"`, `Answerlattice structured data path ${page.path}`);
  }

  const publicClaimFiles = [
    ...fs.readdirSync(path.join(ROOT, 'src/app/sites/answerlattice'), { recursive: true })
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => file !== 'publicContent.ts')
      .map((file) => `src/app/sites/answerlattice/${file}`),
    ...fs.readdirSync(path.join(ROOT, 'src/content/answerlatticePublic'), { recursive: true })
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => file !== 'guardrails.ts')
      .map((file) => `src/content/answerlatticePublic/${file}`),
    'src/lib/answerlattice/installContract/contract.ts',
    'public/answerlattice.webmanifest',
    'public/widget/answerlattice-widget.js',
    'src/app/widget/v1/answerlattice-widget.js/route.ts',
  ].filter((file) => exists(file));
  const publicClaimCopy = publicClaimFiles.map((file) => read(file)).join('\n');
  const publicBrandCopy = publicClaimCopy.replaceAll('X-Answerlattice-Widget-Runtime', '');

  assert(!/\bCanonica\b/.test(publicBrandCopy), 'AnswerLattice public copy must not use Canonica as the standalone public brand');
  assert(!/\bAnswerlattice\b/.test(publicBrandCopy), 'AnswerLattice public copy must use AnswerLattice as the standalone public brand');
  for (const phrase of ANSWERLATTICE_PUBLIC_CLAIM_GUARDRAILS.forbiddenPhrases.filter((phrase) => phrase !== 'Canonica')) {
    assertNotIncludes(publicClaimCopy.toLowerCase(), phrase.toLowerCase(), `AnswerLattice public forbidden claim ${phrase}`);
  }
  for (const schemaType of ANSWERLATTICE_PUBLIC_CLAIM_GUARDRAILS.forbiddenSchemaTypes) {
    assert(!new RegExp(`['"]@type['"]\\s*:\\s*['"]${schemaType}['"]`).test(publicClaimCopy), `AnswerLattice public schema must not include ${schemaType}`);
  }
}

function verifyAnswerlatticeInstallContract() {
  const contract = require('../../src/lib/answerlattice/installContract/contract');
  const constants = require('../../src/lib/answerlattice/installContract/constants');
  const { AnswerlatticeContextSchema } = require('../../src/lib/validation/contextSchema');
  const publicWidget = read('public/widget/answerlattice-widget.js');
  const widgetV1Route = read('src/app/widget/v1/answerlattice-widget.js/route.ts');
  const widgetManagement = read('src/components/templates/answerlattice/widgetManagement/AnswerlatticeWidgetManagement.tsx');
  const installCenter = read('src/components/templates/answerlattice/install/AnswerlatticeInstallCenter.tsx');
  const answerlatticeSupportClipboard = read('src/lib/answerlattice/supportClipboard.ts');
  const routePermissions = read('src/constants/answerlattice/permissions.ts');
  const answerlatticeRoutes = read('src/constants/answerlattice/routes.ts');
  const answerlatticeDomains = read('src/constants/answerlattice/domains.ts');
  const answerlatticeNavigations = read('src/constants/answerlattice/navigations.ts');
  const answerlatticeQuickstarts = read('src/app/sites/answerlattice/quickstarts/page.tsx');
  const answerlatticeResources = read('src/app/sites/answerlattice/resources/page.tsx');
  const answerlatticeDayOneLaunchPack = read('src/app/sites/answerlattice/components/DayOneLaunchPackSection.tsx');
  const answerlatticeSiteConfig = read('src/app/sites/answerlattice/siteConfig.ts');

  assert(constants.ANSWERLATTICE_WIDGET_SCRIPT_URL === 'https://answerlattice.com/widget/v1/answerlattice-widget.js', 'Answerlattice v1 widget URL must stay stable');
  assert(constants.ANSWERLATTICE_WIDGET_SCRIPT_CACHE_CONTROL === 'public, max-age=300, stale-while-revalidate=86400', 'Answerlattice v1 widget cache policy must stay bounded and non-immutable');
  assert(contract.ANSWERLATTICE_AGENT_FILE_TARGETS.includes('.cursor/rules/answerlattice/RULE.md'), 'Answerlattice agent file targets must include Cursor RULE.md');
  assert(contract.ANSWERLATTICE_AGENT_FILE_TARGETS.includes('.cursor/rules/answerlattice.mdc'), 'Answerlattice agent file targets must include Cursor .mdc fallback');
  assert(contract.ANSWERLATTICE_PUBLIC_DOC_ROUTES.includes('/install/contracts.md'), 'Answerlattice public docs routes must include contracts Markdown');
  assertIncludes(widgetV1Route, 'ANSWERLATTICE_WIDGET_SCRIPT_CACHE_CONTROL', 'Answerlattice v1 widget route cache policy');
  assertIncludes(widgetV1Route, 'X-AnswerLattice-Widget-Contract', 'Answerlattice v1 widget route contract header');
  assertIncludes(publicWidget, 'AnswerLattice Help Widget — Public Contract v1', 'Answerlattice public widget script');
  assertIncludes(publicWidget, 'data-answerlattice-key', 'Answerlattice public widget key attribute');
  assertIncludes(publicWidget, 'setContext', 'Answerlattice public widget global API');
  assertIncludes(publicWidget, 'page:', 'Answerlattice public widget page API');
  assertIncludes(publicWidget, 'sensitiveContextPattern', 'Answerlattice public widget context PII guard');
  assertIncludes(widgetManagement, 'answerlattice_widget_management_copy_failed', 'Answerlattice widget management copy failure diagnostics');
  assertIncludes(widgetManagement, 'answerlattice_widget_management_copy_clipboard_unavailable', 'Answerlattice widget management unavailable clipboard code');
  assertIncludes(widgetManagement, 'answerlattice_widget_management_copy_fallback_failed', 'Answerlattice widget management failed fallback clipboard code');
  assertIncludes(widgetManagement, 'copyAnswerlatticeSupportTextToClipboard', 'Answerlattice widget management shared clipboard helper');
  assertIncludes(widgetManagement, 'hasClipboardWrite', 'Answerlattice widget management clipboard support metadata');
  assertIncludes(widgetManagement, 'hasCopyFallback', 'Answerlattice widget management fallback support metadata');
  assertIncludes(installCenter, 'answerlattice_install_copy_failed', 'Answerlattice install center copy failure diagnostics');
  assertIncludes(installCenter, 'answerlattice_install_copy_clipboard_unavailable', 'Answerlattice install center unavailable clipboard code');
  assertIncludes(installCenter, 'answerlattice_install_copy_fallback_failed', 'Answerlattice install center failed fallback clipboard code');
  assertIncludes(installCenter, 'copyAnswerlatticeSupportTextToClipboard', 'Answerlattice install center shared clipboard helper');
  assertIncludes(installCenter, 'hasClipboardWrite', 'Answerlattice install center clipboard support metadata');
  assertIncludes(installCenter, 'hasCopyFallback', 'Answerlattice install center fallback support metadata');
  assertIncludes(answerlatticeSupportClipboard, "const copied = document.execCommand('copy');", 'Answerlattice support clipboard helper acknowledged fallback copy result');
  assertNotIncludes(widgetManagement, 'await navigator.clipboard.writeText(value);', 'Answerlattice widget management direct Clipboard copy');
  assertNotIncludes(installCenter, 'await navigator.clipboard.writeText(value);', 'Answerlattice install center direct Clipboard copy');

  assert(exists('src/app/sites/answerlattice/install/page.tsx'), 'Answerlattice public install page must exist');
  [
    'install.md',
    'install/ai-agent.md',
    'install/manual.md',
    'install/frameworks/nextjs.md',
    'install/frameworks/react.md',
    'install/frameworks/vue.md',
    'install/frameworks/plain-html.md',
    'install/frameworks/shopify.md',
    'install/frameworks/webflow.md',
    'install/contracts.md',
  ].forEach((routePath) => {
    assert(exists(`src/app/sites/answerlattice/${routePath}/route.ts`), `Answerlattice Markdown route missing: ${routePath}`);
  });
  [
    'install/verify/page.tsx',
    'install/verify.md/route.ts',
    'install/security/page.tsx',
    'install/security.md/route.ts',
    'install/changelog/page.tsx',
    'install/changelog.md/route.ts',
    'install/contracts/page.tsx',
  ].forEach((routePath) => {
    assert(!exists(`src/app/sites/answerlattice/${routePath}`), `Answerlattice public install route should not exist: ${routePath}`);
  });

  const llms = contract.renderAnswerlatticeLlmsTxt();
  assertIncludes(llms, '/install/ai-agent.md', 'Answerlattice llms.txt');
  assertIncludes(llms, '/install/contracts.md', 'Answerlattice llms.txt');
  assertNotIncludes(llms, '/install/verify.md', 'Answerlattice llms.txt');
  assertNotIncludes(llms, '/install/security.md', 'Answerlattice llms.txt');

  const escapedSnippet = contract.buildAnswerlatticeWidgetEmbedSnippet('al_"<&', {
    blockedRoutes: ['/billing" data-unsafe="1', '/settings/<security>'],
  });
  assertIncludes(escapedSnippet, 'data-answerlattice-key="al_&quot;&lt;&amp;"', 'Answerlattice generated widget key HTML attribute escaping');
  assertIncludes(escapedSnippet, '/billing&quot; data-unsafe=&quot;1', 'Answerlattice generated blocked-route quote escaping');
  assertIncludes(escapedSnippet, '/settings/&lt;security&gt;', 'Answerlattice generated blocked-route angle-bracket escaping');
  assertNotIncludes(escapedSnippet, 'data-unsafe="1"', 'Answerlattice generated widget snippet raw attribute injection');

  assertIncludes(
    contract.ANSWERLATTICE_FRAMEWORK_SNIPPETS.nextjs,
    'onLoad={updateContext}',
    'Answerlattice Next.js initial context waits for widget load',
  );
  assertIncludes(
    contract.ANSWERLATTICE_FRAMEWORK_SNIPPETS.react,
    "script.addEventListener('load', updateContext, { once: true });",
    'Answerlattice React initial context waits for widget load',
  );
  assertIncludes(
    contract.ANSWERLATTICE_FRAMEWORK_SNIPPETS.vue,
    "script.addEventListener('load', updateContext, { once: true });",
    'Answerlattice Vue initial context waits for widget load',
  );

  const secretKey = 'al_test_raw_secret_value_123456789';
  const kitFiles = contract.buildAnswerlatticeAgentKitFiles({
    widgetKey: secretKey,
    widgetKeyPrefix: 'al_test',
    allowedOrigins: ['https://app.example.com'],
    blockedRoutes: ['/login', '/billing'],
  });
  const kitText = JSON.stringify(kitFiles);
  assertNotIncludes(kitText, secretKey, 'Answerlattice agent kit default contents');
  assert(kitFiles['.cursor/rules/answerlattice/RULE.md'], 'Answerlattice agent kit must include Cursor RULE.md');
  assert(kitFiles['.cursor/rules/answerlattice.mdc'], 'Answerlattice agent kit must include Cursor .mdc fallback');
  assertIncludes(kitFiles['packet.json'], '"rawWidgetKeyIncluded": false', 'Answerlattice agent kit packet');
  assertIncludes(kitFiles['answerlattice-context-contract-v1.md'], 'Allowed context fields', 'Answerlattice context contract docs');
  assertNotIncludes(kitFiles['answerlattice-context-contract-v1.md'], 'Legacy compatibility', 'Answerlattice context contract docs');

  const packet = contract.buildAnswerlatticeAgentPacketJson({ widgetKey: secretKey, widgetKeyPrefix: 'al_test' });
  assert(packet.rawWidgetKeyIncluded === false, 'Answerlattice dashboard packet must not include raw widget key by default');
  assert(JSON.stringify(packet).indexOf(secretKey) === -1, 'Answerlattice dashboard packet must mask raw widget key by default');
  assert(packet.dashboardOwnsAllowedOrigins === true, 'Answerlattice dashboard packet must mark allowed origins as dashboard-owned');
  assert(packet.dashboardOwnsBlockedRoutes === true, 'Answerlattice dashboard packet must mark blocked routes as dashboard-owned');
  assert(!('legacyContextFieldMap' in packet), 'Answerlattice dashboard packet must not expose legacy context guidance before launch');

  const parsedContext = AnswerlatticeContextSchema.parse({
    path: '/settings/team',
    title: 'Team settings',
    feature: 'settings',
    workflow: 'invite_teammate',
    role: 'owner',
    locale: 'en',
    tenantId: '123',
  });
  assert(parsedContext.path === '/settings/team', 'Answerlattice context schema must accept canonical path');
  assert(parsedContext.tenantId === undefined, 'Answerlattice context schema must strip forbidden tenantId');
  assert(!AnswerlatticeContextSchema.safeParse({ title: 'owner@example.com' }).success, 'Answerlattice context schema must reject PII-like titles');

  assert(exists('src/app/sites/answerlattice/agents/answerlattice/cursor/RULE.md/route.ts'), 'Answerlattice public Cursor RULE.md route must exist');
  assertIncludes(installCenter, 'renderAnswerlatticeCursorRuleMd', 'Answerlattice Install Center Cursor current rule copy');
  assertIncludes(installCenter, 'renderAnswerlatticeCursorRule', 'Answerlattice Install Center Cursor legacy fallback copy');
  assertIncludes(answerlatticeRoutes, 'INSTALL_CENTER', 'Answerlattice install center route constant');
  assertIncludes(answerlatticeDomains, "'install-center'", 'Answerlattice product-host dashboard route roots');
  assertIncludes(routePermissions, 'ANSWERLATTICE_ROUTES.INSTALL_CENTER', 'Answerlattice install center route permission');
  assertIncludes(widgetManagement, 'ANSWERLATTICE_ROUTES.INSTALL_CENTER', 'Answerlattice widget route must link to install center');
  assert((answerlatticeNavigations.match(/ANSWERLATTICE_ROUTES\.INSTALL_CENTER/g) || []).length === 1, 'Answerlattice sidebar must not duplicate the Install Center route');
  assertNotIncludes(answerlatticeNavigations, 'widget-install-center', 'Answerlattice widget sidebar must not duplicate Install Center');

  const publicInstallCopy = [
    widgetManagement,
    installCenter,
    answerlatticeQuickstarts,
    answerlatticeResources,
    answerlatticeDayOneLaunchPack,
    answerlatticeSiteConfig,
    JSON.stringify(kitFiles),
    contract.renderAnswerlatticeMarkdownDoc('overview'),
    contract.renderAnswerlatticeMarkdownDoc('ai-agent'),
  ].join('\n');
  assertNotIncludes(publicInstallCopy, '@answerlattice/web', 'Answerlattice public install copy');
  assertNotIncludes(publicInstallCopy, 'createAnswerlatticeWebClient', 'Answerlattice public install copy');
  assertNotIncludes(publicInstallCopy, 'Typed SDK', 'Answerlattice public install copy');
  assertNotIncludes(publicInstallCopy, 'optional typed helper', 'Answerlattice public install copy');
  assertNotIncludes(publicInstallCopy, 'Legacy compatibility', 'Answerlattice public install copy');
  assertNotIncludes(publicInstallCopy, 'BLOCKED_ROUTES=', 'Answerlattice public install copy');
  assertNotIncludes(publicInstallCopy, 'ALLOWED_ORIGINS=', 'Answerlattice public install copy');
  assertNotIncludes(widgetManagement, "value: 'sdk'", 'Answerlattice widget install snippet picker');
}

function main() {
  const retiredMcpConfig = JSON.parse(read('.windsurf/mcp-config.json'));
  const serwistRoute = read('src/app/serwist/[path]/route.ts');
  assert(
    retiredMcpConfig
      && typeof retiredMcpConfig === 'object'
      && !Array.isArray(retiredMcpConfig)
      && Object.keys(retiredMcpConfig.mcpServers || {}).length === 0,
    'Windsurf MCP config must not execute unpinned remote npx packages',
  );
  assert(!exists('package-old.json'), 'retired alternate package manifest must not remain at the repository root');
  assert(exists('__docs__/_archive/package-old.json'), 'retired alternate package manifest must remain preserved in the documentation archive');
  assert(!exists('projectSampleData_oldway.json'), 'retired alternate project sample must not remain at the repository root');
  assert(exists('__docs__/_archive/project-sample-data-oldway.json'), 'retired alternate project sample must remain preserved in the documentation archive');
  assert(!exists('windsurfTheme.json'), 'retired JSONC Windsurf theme must not masquerade as root JSON');
  assert(exists('__docs__/_archive/windsurf-theme-retired.jsonc'), 'retired Windsurf theme must remain preserved with its JSONC format explicit');
  assert(!exists('public/platform.webmanifest'), 'retired cross-product platform manifest must not remain publicly addressable');
  assert(exists('__docs__/_archive/platform.webmanifest'), 'retired platform manifest must remain preserved in the documentation archive');
  assertNotIncludes(serwistRoute, 'public/platform.webmanifest', 'MenuList owner service-worker precache product separation');
  verifyEnvironmentTargets();
  if (process.argv.includes('--env-targets-only')) {
    console.log('Environment target matrix verified');
    return;
  }
  verifyVerificationRegistryCoverage();
  verifyRuntimeLogTrackingBoundary();
  verifyGeneratedArtifactTrackingBoundary();
  verifySharedHttpClientBoundary();
  verifyMenuListStorageBucketFallbackBoundary();
  verifyMenuListDiscovery();
  verifyAnswerlatticeDiscovery();
  verifyAnswerlatticeInstallContract();
  console.log('Agent-readiness discovery surfaces verified');
}

main();
