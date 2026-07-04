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

[
  'src/config/features.ts',
  'src/components/templates/main-app/useMenuList/PresenceMonitor.tsx',
  'src/components/templates/main-app/useMenuList/index.tsx',
  'src/components/templates/main-app/useMenuList/presenceTypes.ts',
  'src/components/templates/main-app/businessSettings/index.tsx',
  'src/components/mobile/components/PresenceMonitor.tsx',
  'src/components/mobile/screens/MobilePresenceMonitorScreen.tsx',
  'src/components/mobile/screens/MobileMoreScreen.tsx',
  'src/database/stores/index.tsx',
  'src/lib/onboarding/starterActivation.ts',
  '__docs__/menu-presence-monitor/README.md',
  '__docs__/menu-presence-monitor/menu-presence-monitor_impl.md',
  '__docs__/menu-presence-monitor/menu-presence-monitor_firebase.md',
  '__docs__/menu-presence-monitor/menu-presence-monitor_mobile-support.md',
  'FEATURE_SWEEP_MASTER_INVENTORY.md',
  'FEATURE_SWEEP_MASTER_REPORT.md',
  '__docs__/audits/menulist-production-readiness-audit.md',
  '__docs__/CHANGELOG.md',
].forEach(read);

const packageJson = read('package.json');
requireToken(
  packageJson,
  '"verify:menu-presence-monitor-boundary": "node scripts/verification/verify-menu-presence-monitor-boundary.js"',
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
  "window.open(surface.openUrl, '_blank', 'noopener,noreferrer')",
  "withAnalyticsSource(data.obpLink, 'copy_link')",
  "getBoundedUseMenuListStringContext('obpLink', data.obpLink)",
  "getBoundedUseMenuListStringContext('surfaceKey', surface?.dalKey)",
  'buildStarterActivationSummary',
  'shouldRecordStarterActivationSignal',
  'STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE',
  "action: 'confirm' | 'copy' | 'open' | 'remove'",
].forEach((token) => requireToken(desktopPresence, token, 'desktop Presence Monitor'));
[
  'catch {',
  'console.error',
  'console.warn',
  'console.log',
  'console.debug',
  'await navigator.clipboard.writeText(sourcedObpLink);\n            message.success',
  "document.execCommand('copy');\n            message.success",
  "window.open(surface.openUrl, '_blank')",
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
  "window.open(surface.openUrl, '_blank', 'noopener,noreferrer')",
  "withAnalyticsSource(obpLink, 'copy_link')",
  "getBoundedMobileOwnerStringContext('obpLink', obpLink)",
  "getBoundedMobileOwnerStringContext('surfaceKey', surface?.dalKey)",
  'buildStarterActivationSummary',
  'shouldRecordStarterActivationSignal',
  'STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE',
  'List.Item',
  'Popup',
  'NavBar',
  'minHeight: 44',
].forEach((token) => requireToken(mobilePresence, token, 'mobile Presence Monitor'));
[
  'catch {',
  'console.error',
  'console.warn',
  'console.log',
  'console.debug',
  'await navigator.clipboard.writeText(sourcedObpLink);\n            Toast.show',
  "document.execCommand('copy');\n            Toast.show",
  "window.open(surface.openUrl, '_blank')",
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
].forEach((token) => requireToken(useMenuList, token, 'Use MenuList presence wiring'));

const businessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
[
  'BusinessSettingsPresenceMonitorCard',
  'PresenceMonitor',
  "'presence-monitor': 'search-discovery'",
  'business_settings_presence_screen_links_load_failed',
  'FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR',
  'publicTruthFocusRefs.current.presenceMonitor',
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
  'projectsList.some((project: any) => project.deleted !== true && project.active !== false)',
  'FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR',
  'hasFeedbackEnabled={storeDetails.feedbackEnabled !== false}',
  'hidePageSummary',
].forEach((token) => requireToken(mobilePresenceScreen, token, 'Mobile Presence Monitor screen'));

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
  "await assertActiveSessionStore(storeId, 'menu_presence_store_scope_mismatch');",
  "await assertActiveSessionStore(storeId, 'starter_activation_signal_store_scope_mismatch');",
  'updateMenuPresence',
  'recordStarterActivationSignal',
  'success: true',
  'storeId,',
  'surface,',
  'confirmed,',
  'assertMenuPresenceUpdateSucceeded',
].forEach((token) => requireToken(storesDal, token, 'stores DAL presence guard'));

const starterActivation = read('src/lib/onboarding/starterActivation.ts');
[
  'buildStarterActivationSummary',
  'STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE',
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
  'active session store',
].forEach((token) => requireToken(readme, token, 'Menu Presence Monitor README'));
forbidToken(readme, 'Key Files (Planned)', 'Menu Presence Monitor README');

const spec = read('__docs__/menu-presence-monitor/menu-presence-monitor_spec.md');
[
  'source-derived readiness and owner-confirmed external placement status',
  'External platform placement verification by crawling or provider APIs',
  'MenuList-recorded surfaces (QR, Screens, Feedback) show source-derived readiness status',
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
  'Do not claim instant visibility, zero setup for external placement, automatic Google/Instagram/WhatsApp verification, one-tap external deployment, or every-surface visibility without release-specific evidence.',
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
  'MenuList-recorded QR/screen/feedback readiness',
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
  'does not crawl or verify Google Business, Instagram, or WhatsApp for you',
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
].forEach((token) => requireToken(impl, token, 'Menu Presence Monitor implementation doc'));
[
  'SwipeAction for remove',
  'Switch` or `CheckList',
].forEach((token) => forbidToken(impl, token, 'Menu Presence Monitor implementation doc'));

const firebase = read('__docs__/menu-presence-monitor/menu-presence-monitor_firebase.md');
[
  'npm run verify:menu-presence-monitor-boundary',
  'Valid owner flows add no Firestore read/write beyond the existing write',
  'menu_presence_store_scope_mismatch',
  'starter_activation_signal_store_scope_mismatch',
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
requireToken(inventory, 'menu presence boundary source gate passed; browser/manual mutation pending', 'feature sweep inventory');

const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
[
  'Menu Presence Monitor Boundary',
  'npm run verify:menu-presence-monitor-boundary',
  'source/docs verification only',
].forEach((token) => requireToken(report, token, 'feature sweep report'));

const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
[
  'Menu Presence Monitor boundary checkpoint',
  'Menu Presence Monitor copy claim boundary checkpoint',
  'npm run verify:menu-presence-monitor-boundary',
  'No Menu Presence Monitor runtime behavior',
].forEach((token) => requireToken(audit, token, 'production readiness audit'));

const changelog = read('__docs__/CHANGELOG.md');
[
  'July 2, 2026 - Menu Presence Monitor Boundary',
  'Menu Presence Monitor Copy Claim Boundary',
  'verify:menu-presence-monitor-boundary',
  'source/docs verification only',
].forEach((token) => requireToken(changelog, token, 'changelog'));

if (failures.length > 0) {
  console.error('FAIL verify-menu-presence-monitor-boundary');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PASS verify-menu-presence-monitor-boundary');
console.log('Validated Menu Presence Monitor active-store writes, desktop/mobile acknowledgement, route wiring, and docs parity.');
