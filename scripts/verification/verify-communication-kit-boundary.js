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
  'src/lib/communication/messageTemplates.ts',
  'src/components/templates/main-app/useMenuList/index.tsx',
  'src/components/templates/main-app/useMenuList/CommunicationKit.tsx',
  'src/components/mobile/components/CommunicationKit.tsx',
  'src/components/mobile/screens/MobileShareScreen.tsx',
  'src/components/templates/main-app/projects/b2cView/shareModal/MenuKitSection.tsx',
  'src/lib/export/exportDiagnostics.ts',
  'src/lib/export/browserFileShare.ts',
  'src/lib/menu-kit/menuKitGenerator.ts',
  'src/lib/printable-asset-templates/renderPrintableAsset.ts',
  '__docs__/customer-communication-kit/README.md',
  '__docs__/customer-communication-kit/customer-communication-kit_impl.md',
  '__docs__/customer-communication-kit/customer-communication-kit_firebase.md',
  '__docs__/customer-communication-kit/customer-communication-kit_mobile-support.md',
  '__docs__/menu-kit/README.md',
  '__docs__/menu-kit/menu-kit_firebase.md',
  '__docs__/print-assets/README.md',
  '__docs__/print-assets/print-assets_firebase.md',
  '__docs__/printable-asset-templates/printable-asset-templates_firebase.md',
  '__docs__/physical-surfaces/README.md',
  '__docs__/physical-surfaces/physical-surfaces_validation.md',
  'FEATURE_SWEEP_MASTER_INVENTORY.md',
  'FEATURE_SWEEP_MASTER_REPORT.md',
  '__docs__/audits/menulist-production-readiness-audit.md',
  '__docs__/changelog.md',
].forEach(read);

const packageJson = read('package.json');
requireToken(
  packageJson,
  '"verify:communication-kit-boundary": "node scripts/verification/verify-communication-kit-boundary.js"',
  'package scripts',
);

const features = read('src/config/features.ts');
[
  'ENABLE_CUSTOMER_COMMUNICATION_KIT',
  'ENABLE_MENU_KIT',
  'ENABLE_MENU_CARD_EXPORT',
  'ENABLE_PRINT_ASSETS_ROUTE',
  'ENABLE_PRINTABLE_ASSET_TEMPLATES',
].forEach((token) => requireToken(features, token, 'feature flags'));

const messageTemplates = read('src/lib/communication/messageTemplates.ts');
[
  'export function generateMessageTemplates',
  'export function getTodayHours',
  'isClosedToday',
  'activeProjects',
  'staff_daily_replies',
  'Staff Daily Replies',
  'getOfferingLabels',
  'getLocalizedText',
  'communication_kit_today_hours_range_invalid',
  'MAX_COMMUNICATION_KIT_TODAY_HOURS_DIAGNOSTICS',
  'reportedCommunicationKitTodayHoursRangeFailures',
  'parseCommunicationKitTimeToMinutes',
  'getStoreDayKey',
  'getStoreLocalDateKey',
  'getSpecialHoursEntry',
  'specialHours?: StoreSpecialHours',
  'const specialEntry = getSpecialHoursEntry(specialHours, getStoreLocalDateKey(timeZone, now));',
  "getBoundedRuntimeStringContext('dayKey', dayKey)",
  'todayValueLength: todayValue.length',
  'return { hours: null, isClosed: false };',
].forEach((token) => requireToken(messageTemplates, token, 'message templates'));
[
  'fetch(',
  'firebase/firestore',
  'setDoc(',
  'addDoc(',
  'updateDoc(',
  'reportedCommunicationKitTodayHoursTimezoneFailures',
  "fallbackPolicy: 'browser_local_day'",
  '    } catch {\n        dayIndex = new Date().getDay();\n    }',
].forEach((token) => forbidToken(messageTemplates, token, 'message templates'));

const desktopCommunicationKit = read('src/components/templates/main-app/useMenuList/CommunicationKit.tsx');
[
  'copyUseMenuListCommunicationKitMessage',
  'hasUseMenuListCommunicationKitClipboardWrite',
  'hasUseMenuListCommunicationKitCopyFallback',
  "document.execCommand('copy')",
  "logUseMenuListFailure('use_menulist_communication_kit_copy_failed'",
  "logUseMenuListFailure('use_menulist_communication_kit_whatsapp_open_failed'",
  'openIsolatedBrowserUrl(whatsappUrl)',
  'whatsappUrlLength',
  'copyMessageLength',
  'whatsappMessageLength',
  "withAnalyticsSource(input.menuLink, entrySource)",
  "getBoundedUseMenuListStringContext('menuLink'",
  "getBoundedUseMenuListStringContext('address'",
  "getBoundedUseMenuListStringContext('phone'",
].forEach((token) => requireToken(desktopCommunicationKit, token, 'desktop communication kit'));
[
  'console.error',
  'fetch(',
  'firebase/firestore',
].forEach((token) => forbidToken(desktopCommunicationKit, token, 'desktop communication kit'));

const mobileCommunicationKit = read('src/components/mobile/components/CommunicationKit.tsx');
[
  'copyMobileCommunicationKitMessage',
  'hasMobileCommunicationKitClipboardWrite',
  'hasMobileCommunicationKitCopyFallback',
  "document.execCommand('copy')",
  "logMobileOwnerFailure('mobile_communication_kit_copy_failed'",
  "logMobileOwnerFailure('mobile_communication_kit_native_share_failed'",
  "logMobileOwnerFailure('mobile_communication_kit_whatsapp_open_failed'",
  "if (error instanceof DOMException && error.name === 'AbortError') return;",
  'openIsolatedBrowserUrl(whatsappUrl)',
  'whatsappUrlLength',
  'copyMessageLength',
  'nativeShareMessageLength',
  'whatsappMessageLength',
  "withAnalyticsSource(input.menuLink, source)",
  'minHeight: 48',
].forEach((token) => requireToken(mobileCommunicationKit, token, 'mobile communication kit'));
forbidToken(mobileCommunicationKit, 'window.open(', 'mobile communication kit no-opener handle acknowledgement');
[
  'console.error',
  'fetch(',
  'firebase/firestore',
].forEach((token) => forbidToken(mobileCommunicationKit, token, 'mobile communication kit'));

const useMenuList = read('src/components/templates/main-app/useMenuList/index.tsx');
[
  'CommunicationKit',
  'FEATURE_FLAGS.ENABLE_CUSTOMER_COMMUNICATION_KIT',
  'diagnosticContext={getOutputDiagnosticContext()}',
  'generateMenuKit(input)',
  'generateMenuKitAsset(input, assetKey)',
  'buildPrintableAssetsUrl(data?.projectId)',
  'recordStarterActivationSignal',
  "getBoundedUseMenuListStringContext('copiedText'",
  "openIsolatedBrowserUrl(url)",
  'FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT ? handleOpenMenuCardExport : handleDownloadPdf',
].forEach((token) => requireToken(useMenuList, token, 'Use MenuList output center'));
[
  'window.location',
  'console.error',
].forEach((token) => forbidToken(useMenuList, token, 'Use MenuList output center'));

const mobileShare = read('src/components/mobile/screens/MobileShareScreen.tsx');
[
  'MobileCommunicationKit',
  'FEATURE_FLAGS.ENABLE_CUSTOMER_COMMUNICATION_KIT',
  '.filter((project) => project.active !== false && project.deleted !== true)',
  "diagnosticContext={buildMobileShareLogContext('communication_kit')}",
  'copyMobileShareText',
  'generateMenuKit(input)',
  'generateMenuKitAsset(input, assetKey)',
  'renderPrintableAssetDownloadFiles',
  'shareBlob(asset.blob, asset.filename, label)',
  "getBoundedMobileOwnerStringContext('copyValue'",
  "if (error instanceof DOMException && error.name === 'AbortError') return;",
  'minHeight: compact ? 86 : 94',
].forEach((token) => requireToken(mobileShare, token, 'mobile share screen'));
[
  'window.location',
  'console.error',
].forEach((token) => forbidToken(mobileShare, token, 'mobile share screen'));

const menuKitSection = read('src/components/templates/main-app/projects/b2cView/shareModal/MenuKitSection.tsx');
const projectShareModal = read('src/components/templates/main-app/projects/b2cView/shareModal/index.tsx');
[
  'copyExportTextToClipboard(msg)',
  'copyExportTextToClipboard(labels.staffScript)',
  'aria-label="Copy staff line"',
  'project_share_menu_kit_generation_failed',
  'project_share_menu_kit_asset_generation_failed',
  'project_share_menu_kit_message_copy_failed',
  'project_share_menu_kit_staff_script_copy_failed',
  'project_share_menu_kit_whatsapp_open_failed',
  "getBoundedExportStringContext('menuUrl'",
  'hasClipboardWrite',
  'hasCopyFallback',
  "openIsolatedBrowserUrl(whatsappUrl)",
  'const date = toDate(value);',
  'return Number.isFinite(date.getTime()) ? date : undefined;',
].forEach((token) => requireToken(menuKitSection, token, 'Menu Kit share modal section'));
forbidToken(menuKitSection, 'console.error', 'Menu Kit share modal section');
forbidToken(menuKitSection, '(ts as any)?.seconds', 'Menu Kit share modal timestamp boundary');

[
  'aria-label="QR foreground color"',
  'aria-label="QR background color"',
  'background: qrColor',
  'background: qrBgColor',
].forEach((token) => requireToken(projectShareModal, token, 'Project Share QR color controls'));

const exportDiagnostics = read('src/lib/export/exportDiagnostics.ts');
[
  'secureError',
  'getBoundedExportStringContext',
  'copyExportTextToClipboard',
  'EXPORT_CLIPBOARD_COPY_UNAVAILABLE',
  'EXPORT_CLIPBOARD_COPY_FALLBACK_FAILED',
  'hasExportClipboardWrite',
  'hasExportCopyFallback',
  "document.execCommand('copy')",
  'sourceErrorName',
  'sourceErrorCode',
  'sourceStatusCode',
].forEach((token) => requireToken(exportDiagnostics, token, 'export diagnostics'));

const menuKitGenerator = read('src/lib/menu-kit/menuKitGenerator.ts');
[
  'JSZip',
  'generateMenuKitAsset',
  'generateMenuKit',
  'downloadBlob',
  'shareBlob',
  'shareBrowserFile',
  'Promise<BrowserFileShareResult>',
  'MENU_KIT_ASSET_DEFINITIONS',
  'normalizeMenuKitInput',
  'enrichedInput: { ...normalizedInput, menuUrl: validatedUrl, _logo: logo }',
  'buildPrintInstructions(prepared.enrichedInput.storeName, labels)',
].forEach((token) => requireToken(menuKitGenerator, token, 'Menu Kit generator'));
[
  'enrichedInput: { ...input, menuUrl: validatedUrl, _logo: logo }',
  'buildPrintInstructions(input.storeName, labels)',
].forEach((token) => forbidToken(menuKitGenerator, token, 'Menu Kit generator'));

const browserFileShare = read('src/lib/export/browserFileShare.ts');
[
  "BrowserFileShareResult = 'shared' | 'unsupported' | 'cancelled'",
  'navigator.canShare',
  "error.name === 'AbortError'",
  'throw error',
].forEach((token) => requireToken(browserFileShare, token, 'browser file-share boundary'));
[
  'firebase/firestore',
  'addDoc(',
  'setDoc(',
  'updateDoc(',
  'uploadBytes',
].forEach((token) => forbidToken(menuKitGenerator, token, 'Menu Kit generator'));

const printableRenderer = read('src/lib/printable-asset-templates/renderPrintableAsset.ts');
[
  'renderPrintableAssetDownloadFiles',
  'generateMenuKitAsset',
  'generateMenuKit',
  "admittedInput.assetTypeId === 'complete_menu_kit'",
  "admittedInput.assetTypeId === 'print_menu'",
].forEach((token) => requireToken(printableRenderer, token, 'printable asset renderer'));

const customerReadme = read('__docs__/customer-communication-kit/README.md');
[
  '**Launch boundary:** Not current launch certification or deploy approval.',
  'This README is source-gated browser-local template evidence only; Customer Communication Kit release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:communication-kit-boundary`, browser/device output QA, WhatsApp/copy/share smoke where release scope requires it, print artifact review for related Menu Kit/printable output, and production-host smoke.',
  '**Pure UI + string templates.**',
  'Zero new collections. Zero new API routes. Zero Firebase cost.',
  'raw generated messages and raw public URLs must not be logged',
  'Staff Daily Replies',
  'npm run verify:communication-kit-boundary',
].forEach((token) => requireToken(customerReadme, token, 'Customer Communication Kit README'));

const customerImpl = read('__docs__/customer-communication-kit/customer-communication-kit_impl.md');
[
  'bounded Use MenuList diagnostics',
  'bounded mobile owner diagnostics',
  'Today-hours diagnostics',
  'Do not log raw generated messages',
  'npm run verify:communication-kit-boundary',
].forEach((token) => requireToken(customerImpl, token, 'Customer Communication Kit implementation doc'));

const customerFirebase = read('__docs__/customer-communication-kit/customer-communication-kit_firebase.md');
[
  'Zero new reads, zero new writes',
  'Firebase deploy requirement',
  'browser-local owner actions',
  'Today-hours diagnostics',
  'npm run verify:communication-kit-boundary',
].forEach((token) => requireToken(customerFirebase, token, 'Customer Communication Kit Firebase doc'));

const menuKitReadme = read('__docs__/menu-kit/README.md');
[
  'Menu Kit **supersedes** it for all identity/infrastructure surface needs.',
  'maintenance-only',
  'Print Assets',
  'Menu Card Export',
].forEach((token) => requireToken(menuKitReadme, token, 'Menu Kit README'));

const physicalReadme = read('__docs__/physical-surfaces/README.md');
[
  'LEGACY',
  'For all new physical surface work, use Menu Kit.',
  'Maintenance note: the legacy Today/mobile Hours download buttons remain as a read-only compatibility surface',
  'Current source has no active writer that computes or persists that field',
].forEach((token) => requireToken(physicalReadme, token, 'Physical Surfaces README'));

const physicalValidation = read('__docs__/physical-surfaces/physical-surfaces_validation.md');
[
  'not current launch certification',
  'Current release approval for active physical/print output requires the active [production-readiness audit]',
  'npm run verify:menu-card-export',
  'Digital Menu Output Constitution checks',
].forEach((token) => requireToken(physicalValidation, token, 'Physical Surfaces validation doc'));

const printAssetsFirebase = read('__docs__/print-assets/print-assets_firebase.md');
[
  'Print Assets adds no Firestore collection, Storage path, Cloud Function, API route, rule, or index.',
  'Download Menu Kit ZIP',
].forEach((token) => requireToken(printAssetsFirebase, token, 'Print Assets Firebase doc'));

const printableFirebase = read('__docs__/printable-asset-templates/printable-asset-templates_firebase.md');
[
  'Saved editor templates pass the current editor preview to the registry only on explicit **Save as template**.',
  'Preview, download, and editor-open flows remain browser-local',
  'Download Menu Kit ZIP',
].forEach((token) => requireToken(printableFirebase, token, 'Printable Asset Templates Firebase doc'));

const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
requireToken(inventory, 'communication kit boundary source gate passed; browser/output QA pending', 'feature sweep inventory');

const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
[
  'Communication Kit and Physical Surface Output Boundary',
  'npm run verify:communication-kit-boundary',
  'source/docs verification only',
].forEach((token) => requireToken(report, token, 'feature sweep report'));

const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
[
  'Communication Kit and physical-surface output boundary checkpoint',
  'Communication Kit today-hours diagnostics checkpoint',
  'Customer Communication Kit README top-boundary checkpoint',
  'npm run verify:communication-kit-boundary',
].forEach((token) => requireToken(audit, token, 'production readiness audit'));

const changelog = read('__docs__/changelog.md');
[
  'Customer Communication Kit README has a top launch boundary',
  'Customer Communication Kit Today-Hours Diagnostics',
  'July 2, 2026 - Communication Kit and Physical Surface Output Boundary',
  'verify:communication-kit-boundary',
  'source/docs verification only',
].forEach((token) => requireToken(changelog, token, 'changelog'));

if (failures.length > 0) {
  console.error('FAIL verify-communication-kit-boundary');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PASS verify-communication-kit-boundary');
console.log('Validated Customer Communication Kit, Menu Kit, printable asset, mobile Share, and legacy Physical Surfaces source/docs boundaries.');
