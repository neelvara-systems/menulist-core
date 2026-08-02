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

function hasSingleFieldExemption(indexConfig, collectionGroup, fieldPath) {
  return indexConfig.fieldOverrides?.some((entry) => (
    entry.collectionGroup === collectionGroup
    && entry.fieldPath === fieldPath
    && Array.isArray(entry.indexes)
    && entry.indexes.length === 0
  ));
}

[
  'src/config/features.ts',
  'src/components/templates/main-app/useMenuList/PresenceMonitor.tsx',
  'src/components/templates/main-app/useMenuList/index.tsx',
  'src/components/templates/main-app/useMenuList/presenceTypes.ts',
  'src/components/templates/main-app/businessSettings/index.tsx',
  'src/components/mobile/components/PresenceMonitor.tsx',
  'src/components/mobile/screens/MobilePresenceMonitorScreen.tsx',
  'src/components/mobile/screens/MobileShareScreen.tsx',
  'src/components/mobile/screens/MobileDesignEditorScreen.tsx',
  'src/components/templates/main-app/projects/b2cView/index.tsx',
  'src/components/mobile/screens/MobileMoreScreen.tsx',
  'src/database/stores/index.tsx',
  'src/database/projects/index.ts',
  'src/app/api/public/create-menu/claim/route.ts',
  'src/app/api/projects/outlet-save/route.ts',
  'src/lib/menuPresence/presenceReadiness.ts',
  'scripts/verification/test-menu-presence-readiness.ts',
  'scripts/backfill-public-routing-project-summaries.ts',
  'src/lib/onboarding/starterActivation.ts',
  '__docs__/menu-presence-monitor/README.md',
  '__docs__/menu-presence-monitor/menu-presence-monitor_impl.md',
  '__docs__/menu-presence-monitor/menu-presence-monitor_firebase.md',
  '__docs__/menu-presence-monitor/menu-presence-monitor_mobile-support.md',
  'FEATURE_SWEEP_MASTER_INVENTORY.md',
  'FEATURE_SWEEP_MASTER_REPORT.md',
  '__docs__/audits/menulist-production-readiness-audit.md',
  '__docs__/changelog.md',
  'firestore.indexes.json',
].forEach(read);

const firestoreIndexes = JSON.parse(read('firestore.indexes.json'));
if (!hasSingleFieldExemption(firestoreIndexes, 'stores', 'menuPresence')) {
  failures.push('stores.menuPresence must be exempt from automatic single-field indexing');
}

const packageJson = read('package.json');
requireToken(
  packageJson,
  '"verify:menu-presence-monitor-boundary": "node scripts/verification/verify-menu-presence-monitor-boundary.js && npm run test:menu-presence-readiness"',
  'package scripts',
);
requireToken(
  packageJson,
  '"test:menu-presence-readiness": "ts-node',
  'package scripts',
);

const features = read('src/config/features.ts');
requireToken(features, 'ENABLE_MENU_PRESENCE_MONITOR', 'feature flags');

const desktopPresence = read('src/components/templates/main-app/useMenuList/PresenceMonitor.tsx');
[
  'updateMenuPresence',
  'assertMenuPresenceUpdateSucceeded',
  'copyUseMenuListPresenceLink',
  'USE_MENULIST_PRESENCE_COPY_UNAVAILABLE',
  'USE_MENULIST_PRESENCE_COPY_FALLBACK_FAILED',
  "const copied = document.execCommand('copy');",
  "logUseMenuListFailure('use_menulist_presence_official_link_copy_failed'",
  "logUseMenuListFailure('use_menulist_presence_confirm_failed'",
  "logUseMenuListFailure('use_menulist_presence_remove_failed'",
  'use_menulist_presence_confirm_update_rejected',
  'use_menulist_presence_remove_update_rejected',
  'openIsolatedBrowserUrl(surface.openUrl)',
  "withAnalyticsSource(data.obpLink, 'copy_link')",
  "getBoundedUseMenuListStringContext('obpLink', data.obpLink)",
  "getBoundedUseMenuListStringContext('surfaceKey', surface?.dalKey)",
  'buildStarterActivationSummary',
  'applyStarterPresenceUpdateToStoreDetails',
  'setStoreDetails',
  'shouldRecordStarterActivationSignal',
  'STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE',
  "action: 'confirm' | 'copy' | 'open' | 'remove'",
  "id: 'appleBusiness'",
  "id: 'bingPlaces'",
].forEach((token) => requireToken(desktopPresence, token, 'desktop Presence Monitor'));
[
  'catch {',
  'console.error',
  'console.warn',
  'console.log',
  'console.debug',
  'await navigator.clipboard.writeText(sourcedObpLink);\n            message.success',
  "document.execCommand('copy');\n            message.success",
  "openIsolatedBrowserUrl(surface.openUrl, '_blank')",
].forEach((token) => forbidToken(desktopPresence, token, 'desktop Presence Monitor'));

const mobilePresence = read('src/components/mobile/components/PresenceMonitor.tsx');
[
  'FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR',
  'updateMenuPresence',
  'assertMenuPresenceUpdateSucceeded',
  'copyMobilePresenceLink',
  'MOBILE_PRESENCE_COPY_UNAVAILABLE',
  'MOBILE_PRESENCE_COPY_FALLBACK_FAILED',
  "const copied = document.execCommand('copy');",
  "logMobileOwnerFailure('mobile_presence_official_link_copy_failed'",
  "logMobileOwnerFailure('mobile_presence_confirm_failed'",
  "logMobileOwnerFailure('mobile_presence_remove_failed'",
  'mobile_presence_confirm_update_rejected',
  'mobile_presence_remove_update_rejected',
  'openIsolatedBrowserUrl(surface.openUrl)',
  "withAnalyticsSource(obpLink, 'copy_link')",
  "getBoundedMobileOwnerStringContext('obpLink', obpLink)",
  "getBoundedMobileOwnerStringContext('surfaceKey', surface?.dalKey)",
  'buildStarterActivationSummary',
  'applyStarterPresenceUpdateToStoreDetails',
  'setStoreDetails',
  'shouldRecordStarterActivationSignal',
  'STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE',
  'List.Item',
  'Popup',
  'NavBar',
  'minHeight: 44',
  "id: 'appleBusiness'",
  "id: 'bingPlaces'",
].forEach((token) => requireToken(mobilePresence, token, 'mobile Presence Monitor'));
forbidToken(mobilePresence, 'window.open(', 'mobile Presence Monitor no-opener handle acknowledgement');
[
  'catch {',
  'console.error',
  'console.warn',
  'console.log',
  'console.debug',
  'await navigator.clipboard.writeText(sourcedObpLink);\n            Toast.show',
  "document.execCommand('copy');\n            Toast.show",
  "openIsolatedBrowserUrl(surface.openUrl, '_blank')",
  'SwipeAction',
  'CheckList',
  '<Switch',
].forEach((token) => forbidToken(mobilePresence, token, 'mobile Presence Monitor'));

const useMenuList = read('src/components/templates/main-app/useMenuList/index.tsx');
[
  'PresenceMonitor',
  'FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR',
  '<PresenceMonitor',
  'data={data}',
  'storeDetails={storeDetails}',
  'hasPublishedMenuProject(projects)',
  'hasFeedbackPresenceReadiness({',
].forEach((token) => requireToken(useMenuList, token, 'Use MenuList presence wiring'));
forbidToken(
  useMenuList,
  'projects.some((project: any) => project.deleted !== true && project.active !== false)',
  'Use MenuList published readiness',
);

const businessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
[
  'BusinessSettingsPresenceMonitorCard',
  'PresenceMonitor',
  "'presence-monitor': 'search-discovery'",
  'business_settings_presence_screen_links_load_failed',
  'FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR',
  'publicTruthFocusRefs.current.presenceMonitor',
  'hasPublishedStoreMenu(storeDetails)',
  'hasFeedbackPresenceReadiness({',
].forEach((token) => requireToken(businessSettings, token, 'Business Settings presence wiring'));
[
  'navigator.clipboard.writeText(url)',
  'console.error(',
  'console.warn(',
  'console.log(',
  'console.debug(',
].forEach((token) => forbidToken(businessSettings, token, 'Business Settings presence wiring'));

const mobilePresenceScreen = read('src/components/mobile/screens/MobilePresenceMonitorScreen.tsx');
[
  'MobilePresenceMonitor',
  'generateOBPUrl',
  'hasPublishedMenuProject(projectsList)',
  'hasFeedbackPresenceReadiness({',
  'FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR',
  'hidePageSummary',
].forEach((token) => requireToken(mobilePresenceScreen, token, 'Mobile Presence Monitor screen'));

const mobileShare = read('src/components/mobile/screens/MobileShareScreen.tsx');
[
  'hasPublishedMenuProject(projects)',
  'hasFeedbackPresenceReadiness({',
].forEach((token) => requireToken(mobileShare, token, 'Mobile Share presence readiness'));
forbidToken(
  mobileShare,
  'projects.some((project: any) => project.deleted !== true && project.active !== false)',
  'Mobile Share published readiness',
);

const mobileMore = read('src/components/mobile/screens/MobileMoreScreen.tsx');
[
  "dynamic(() => import('./MobilePresenceMonitorScreen')",
  '| \'presenceMonitor\'',
  'searchDiscoveryHub',
  'FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR',
  "key: 'presenceMonitor'",
  "openSubScreen('presenceMonitor')",
  "if (['officialPage', 'businessCopySetup', 'seoSettings', 'socialSettings', 'customerApp', 'presenceMonitor', 'domainSettings'].includes(screen)) return canManagePublicPresence;",
  "subScreen === 'presenceMonitor'",
].forEach((token) => requireToken(mobileMore, token, 'Mobile More presence routing'));

const storesDal = read('src/database/stores/index.tsx');
[
  'export type MenuPresenceSurface',
  'export type MenuPresenceUpdateResult',
  'const assertActiveSessionStore = async',
  "await assertActiveSessionStore(storeId, 'starter_activation_signal_store_scope_mismatch');",
  'updateMenuPresence',
  'recordStarterActivationSignal',
  'success: true',
  'storeId,',
  'surface,',
  'confirmed,',
  'recordedAt:',
  'assertStarterActivationSignalUpdateSucceeded',
  'assertMenuPresenceUpdateSucceeded',
].forEach((token) => requireToken(storesDal, token, 'stores DAL presence guard'));

const updateMenuPresenceStart = storesDal.indexOf('export const updateMenuPresence');
const updateMenuPresenceEnd = storesDal.indexOf('export function assertMenuPresenceUpdateSucceeded', updateMenuPresenceStart);
if (updateMenuPresenceStart < 0 || updateMenuPresenceEnd < 0) {
  fail('stores DAL presence transaction boundary is missing');
}
const updateMenuPresenceBlock = storesDal.slice(updateMenuPresenceStart, updateMenuPresenceEnd);
[
  "const session = await assertActiveSessionStore(storeId, 'menu_presence_store_scope_mismatch');",
  'MENU_PRESENCE_SURFACES.has(surface)',
  'isStarterActivationSignal(options.starterSignal)',
  'options.starterSignal !== canonicalStarterSignal',
  "throw new Error('menu_presence_input_invalid');",
  'const tenantId = Number(sessionTenantId);',
  'Number.isSafeInteger(tenantId)',
  'await runTransaction(firebaseClient, async (transaction) => {',
  'const storeSnapshot = await transaction.get(storeRef);',
  'shouldRecordStarterActivationSignal(store as StoreDataType)',
  '[`starterActivationSignals.actions.${canonicalStarterSignal}`] = deleteField();',
  "throw new Error('menu_presence_store_scope_changed');",
  "throw new Error('menu_presence_store_unavailable');",
  'isPlatformEntityBlocked(store)',
  'transaction.update(storeRef, storeUpdate);',
  'transaction.set(summaryRef, {',
  'menuPresence: { [surface]: confirmed ? now : null },',
  'tId: tenantId,',
].forEach((token) => requireToken(updateMenuPresenceBlock, token, 'stores DAL atomic presence projection'));
[
  'await updateDoc(',
  'mergeStoreSummaryFields(',
  "revalidatePublicClientCache(storeId, 'updateMenuPresence')",
].forEach((token) => forbidToken(updateMenuPresenceBlock, token, 'stores DAL atomic presence projection'));

const readiness = read('src/lib/menuPresence/presenceReadiness.ts');
[
  'isPublishedMenuProject',
  'hasPublishedMenuProject',
  'hasPublishedStoreMenu',
  'hasFeedbackPresenceReadiness',
  'isMenuPresenceConfirmed',
  'normalizeStarterActivationTimestamp(project.lastPublishedAt)',
  "typeof project?.projectId === 'string'",
  'project?.active !== false',
  'project?.deleted !== true',
].forEach((token) => requireToken(readiness, token, 'canonical presence readiness boundary'));

const readinessTest = read('scripts/verification/test-menu-presence-readiness.ts');
[
  'isPublishedMenuProject({ ...publishedProject, active: false })',
  "isPublishedMenuProject({ active: true, deleted: false, projectId: '1-draft-1' })",
  'hasFeedbackPresenceReadiness({ feedbackEnabled: false, hasPublishedMenu: true })',
  'isMenuPresenceConfirmed(true)',
  "throw new Error('bad timestamp')",
].forEach((token) => requireToken(readinessTest, token, 'presence readiness runtime regression'));

const projectsDal = read('src/database/projects/index.ts');
[
  "buildSummaryProjectFieldPayload(operationProjectId, 'lastPublishedAt', publishedAt)",
  'lastPublishedAt: publishedAt,',
  'transaction.update(publishStoreRef, {',
  "throw new Error('Project publish store state changed');",
  'isPlatformEntityBlocked(freshStoreDoc.data())',
  'normalized.lastPublishedAt = projectData.lastPublishedAt',
].forEach((token) => requireToken(projectsDal, token, 'standard publish presence truth'));

const publicClaim = read('src/app/api/public/create-menu/claim/route.ts');
[
  'lastPublishedAt: now,',
  'buildSummaryProjectPayload(projectId, {',
].forEach((token) => requireToken(publicClaim, token, 'public create-menu publish presence truth'));

const outletSave = read('src/app/api/projects/outlet-save/route.ts');
[
  "'lastPublishedAt',",
  'transaction.update(outletStoreDocumentRef, {',
  'const outletSummaryUpdate: Record<string, unknown>',
  'Object.keys(outletSummaryUpdate).length > 1',
].forEach((token) => requireToken(outletSave, token, 'linked-outlet publish presence truth'));

const publishTruthBackfill = read('scripts/backfill-public-routing-project-summaries.ts');
[
  'function normalizeTimestamp(value: unknown)',
  'const lastPublishedAt = normalizeTimestamp(data.lastPublishedAt);',
  'projectData.active === false',
  'batch.set(storeDoc.ref, {',
  'lastPublishedAt: latestPublishedAt,',
  'await batch.commit();',
  "hasFlag('--force')",
  "throw new Error('Pass exactly one of --store-id, --tenant-id, or --all-stores.');",
  'Refusing write: pass --confirm-project',
  'Refusing forced overwrite: pass --confirm-force',
  'repair canonical truth before rebuilding its summary',
].forEach((token) => requireToken(publishTruthBackfill, token, 'historical publish truth backfill'));

const desktopPublisher = read('src/components/templates/main-app/projects/b2cView/index.tsx');
const mobilePublisher = read('src/components/mobile/screens/MobileDesignEditorScreen.tsx');
[
  'updatedProjectCopy.lastPublishedAt',
  'setStoreDetails((current: StoreDataType | null)',
].forEach((token) => requireToken(desktopPublisher, token, 'desktop publish loaded-store refresh'));
[
  'updatedCopy.lastPublishedAt',
  'setStoreDetails((current: any)',
].forEach((token) => requireToken(mobilePublisher, token, 'mobile publish loaded-store refresh'));

[
  ['desktop Presence Monitor', desktopPresence],
  ['mobile Presence Monitor', mobilePresence],
].forEach(([label, source]) => {
  [
    'isMenuPresenceConfirmed',
    'currentStoreIdRef',
    'setLocalPresence(storeDetails.menuPresence || {})',
  ].forEach((token) => requireToken(source, token, `${label} refresh boundary`));
});

const recordStarterSignalStart = storesDal.indexOf('export const recordStarterActivationSignal');
const recordStarterSignalEnd = storesDal.indexOf('/**\n * Update a manual presence confirmation', recordStarterSignalStart);
if (recordStarterSignalStart < 0 || recordStarterSignalEnd < 0) {
  fail('stores DAL starter activation signal boundary is missing');
}
const recordStarterSignalBlock = storesDal.slice(recordStarterSignalStart, recordStarterSignalEnd);
[
  '!Number.isSafeInteger(storeId)',
  'storeId <= 0',
  '!isStarterActivationSignal(signal)',
  "throw new Error('starter_activation_signal_input_invalid');",
  "await assertActiveSessionStore(storeId, 'starter_activation_signal_store_scope_mismatch');",
  '[`starterActivationSignals.actions.${signal}`]: now,',
  'recordedAt: now',
  'normalizeStarterActivationTimestamp(updateResult.recordedAt)',
].forEach((token) => requireToken(recordStarterSignalBlock, token, 'stores DAL starter activation runtime input guard'));

const starterActivation = read('src/lib/onboarding/starterActivation.ts');
[
  'buildStarterActivationSummary',
  'STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE',
  'APPLE_BUSINESS_MARKED',
  'BING_PLACES_MARKED',
  'ownerConfirmedCount',
  'systemRecordedCount',
  "evidenceType === 'menulist_recorded'",
  "evidenceType === 'owner_confirmed_external'",
  'storeDetails?.menuPresence?.[surface as keyof NonNullable<StoreDataType',
].forEach((token) => requireToken(starterActivation, token, 'starter activation summary'));

const readme = read('__docs__/menu-presence-monitor/README.md');
[
  'Source Gate',
  'npm run verify:menu-presence-monitor-boundary',
  'Presence confirmations and starter activation signals are owner-local writes.',
  'matches the active session before writing',
  'transactionally updates the canonical `stores` row and its `storesSummary` projection',
  '`recordStarterActivationSignal()` rejects values outside the shared signal allowlist',
].forEach((token) => requireToken(readme, token, 'Menu Presence Monitor README'));
forbidToken(readme, 'Key Files (Planned)', 'Menu Presence Monitor README');

const spec = read('__docs__/menu-presence-monitor/menu-presence-monitor_spec.md');
[
  'source-derived readiness and owner-confirmed external placement status',
  'External platform placement verification by crawling or provider APIs',
  'valid explicit publish for Table QR, screen-token setup for Screens, and valid publish plus enabled feedback for Feedback QR',
  'No fixed timing claim; release-specific browser/device QA is required before quoting speed',
].forEach((token) => requireToken(spec, token, 'Menu Presence Monitor spec'));
[
  'Owner can see presence status in under 3 seconds',
  'Confirming a surface takes 1 tap',
  'Automatic surfaces (QR, Screens, Feedback) already show correct status',
].forEach((token) => forbidToken(spec, token, 'Menu Presence Monitor spec'));

const marketing = read('__docs__/menu-presence-monitor/menu-presence-monitor_marketing.md');
[
  'Current Sales/Launch Boundary',
  'MenuList records owner actions where the product can observe them and stores owner confirmations for external placements.',
  'Do not claim instant visibility, zero setup for external placement, automatic Google/Apple/Bing/Instagram/WhatsApp verification, one-tap external deployment, or every-surface visibility without release-specific evidence.',
  'MenuList recorded',
  'Owner confirmed',
].forEach((token) => requireToken(marketing, token, 'Menu Presence Monitor marketing doc'));
[
  'This shows you instantly.',
  'Zero setup — it works automatically',
  'no customer ever searches',
  'Most owners miss 2-3 key surfaces',
  'takes one tap to confirm the rest',
].forEach((token) => forbidToken(marketing, token, 'Menu Presence Monitor marketing doc'));

const website = read('__docs__/menu-presence-monitor/menu-presence-monitor_website.md');
[
  'publish-backed QR/feedback readiness, screen setup',
  'owner-confirmed external placements',
  'See recorded and confirmed menu placement status in one place.',
].forEach((token) => requireToken(website, token, 'Menu Presence Monitor website doc'));
[
  'every QR surface',
  'One tap to confirm each one',
  'deploy your menu everywhere customers look',
].forEach((token) => forbidToken(website, token, 'Menu Presence Monitor website doc'));

const helpdoc = read('__docs__/menu-presence-monitor/menu-presence-monitor_helpdoc.md');
[
  'does not crawl or verify Google Business, Apple Business Connect, Bing Places, Instagram, or WhatsApp for you',
  'Review the status as MenuList-recorded or owner-confirmed',
  'MenuList recorded the action/readiness, or you confirmed an external placement',
].forEach((token) => requireToken(helpdoc, token, 'Menu Presence Monitor help doc'));
[
  'checks 6 key surfaces',
  'No setup needed.',
  'Your menu link appears when customers search',
].forEach((token) => forbidToken(helpdoc, token, 'Menu Presence Monitor help doc'));

const impl = read('__docs__/menu-presence-monitor/menu-presence-monitor_impl.md');
[
  'npm run verify:menu-presence-monitor-boundary',
  'assertMenuPresenceUpdateSucceeded()',
  'menu_presence_store_scope_mismatch',
  'starter_activation_signal_store_scope_mismatch',
  'antd-mobile `List` plus a bottom-sheet `Popup`',
  'transactionally updates the canonical store and current `storesSummary` slot',
  'revalidatePublicClientCache',
  'Presence confirmation is owner-private distribution evidence',
  'valid `lastPublishedAt`',
  'starter_activation_signal_input_invalid',
].forEach((token) => requireToken(impl, token, 'Menu Presence Monitor implementation doc'));
[
  'SwipeAction for remove',
  'Switch` or `CheckList',
].forEach((token) => forbidToken(impl, token, 'Menu Presence Monitor implementation doc'));

const firebase = read('__docs__/menu-presence-monitor/menu-presence-monitor_firebase.md');
[
  'npm run verify:menu-presence-monitor-boundary',
  'one transactional store read and two transactional document writes',
  'menu_presence_store_scope_mismatch',
  'starter_activation_signal_store_scope_mismatch',
  'do not use public client cache invalidation',
  'Standard explicit publish adds one transaction-time store point read and two necessary writes',
  'starter_activation_signal_input_invalid',
].forEach((token) => requireToken(firebase, token, 'Menu Presence Monitor Firebase doc'));

const mobileDoc = read('__docs__/menu-presence-monitor/menu-presence-monitor_mobile-support.md');
[
  'antd-mobile `List` + `Popup` + explicit buttons',
  'Tap a row to open the bottom sheet',
  'assertMenuPresenceUpdateSucceeded()',
  'active-session store guard',
  'npm run verify:menu-presence-monitor-boundary',
  'No fixed timing claim is approved from this source gate.',
].forEach((token) => requireToken(mobileDoc, token, 'Menu Presence Monitor mobile doc'));
[
  'Switch` or `CheckList',
  'swipe to remove',
  'Completes in <5 seconds?',
  'View + confirm = 2 seconds',
  'Single tap to confirm',
].forEach((token) => forbidToken(mobileDoc, token, 'Menu Presence Monitor mobile doc'));

const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
requireToken(inventory, 'item 25 local source complete', 'feature sweep inventory');
requireToken(inventory, 'no presence-only public-cache invalidation', 'feature sweep inventory');

const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
[
  'Menu Presence Monitor Boundary',
  'npm run verify:menu-presence-monitor-boundary',
  'source/docs verification only',
  'Item 25 is locally source complete.',
  'valid explicit publish timestamp',
].forEach((token) => requireToken(report, token, 'feature sweep report'));

const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
[
  'Menu Presence Monitor boundary checkpoint',
  'Menu Presence Monitor copy claim boundary checkpoint',
  'npm run verify:menu-presence-monitor-boundary',
  'No Menu Presence Monitor runtime behavior',
  'Item 25 is locally source complete.',
  'Menu Presence and Public-Truth Monitoring Boundary',
].forEach((token) => requireToken(audit, token, 'production readiness audit'));

const changelog = read('__docs__/changelog.md');
[
  'July 2, 2026 - Menu Presence Monitor Boundary',
  'Menu Presence Monitor Copy Claim Boundary',
  'verify:menu-presence-monitor-boundary',
  'source/docs verification only',
  'July 16, 2026 - Menu Presence and Public-Truth Monitoring',
].forEach((token) => requireToken(changelog, token, 'changelog'));

const tracker = read('__docs__/audits/menulist-feature-flow-audit-tracker.md');
[
  '| 25 | Menu presence and public-truth monitoring | Medium | Local source complete |',
  '| 26 | Owner referral | Medium | Local source complete; rollout flags off |',
  '## Completed item 25 source boundary',
].forEach((token) => requireToken(tracker, token, 'strict feature tracker'));

if (failures.length > 0) {
  console.error('FAIL verify-menu-presence-monitor-boundary');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PASS verify-menu-presence-monitor-boundary');
console.log('Validated canonical publish readiness, active-store presence writes, stale-store UI safety, bounded cost, route wiring, and docs parity.');
