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

function readJson(file) {
  const source = read(file);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    failures.push(`Invalid JSON in ${file}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function getSimplePlaceholders(value) {
  return (value.match(/\{[A-Za-z][A-Za-z0-9]*\}/g) || []).sort();
}

function countToken(value, token) {
  return value.split(token).length - 1;
}

function requireToken(source, token, label) {
  if (!source.includes(token)) failures.push(`${label} missing token: ${token}`);
}

function forbidToken(source, token, label) {
  if (source.includes(token)) failures.push(`${label} must not include token: ${token}`);
}

function requireOrder(source, tokens, label) {
  let previousIndex = -1;
  for (const token of tokens) {
    const index = source.indexOf(token, previousIndex + 1);
    if (index === -1) {
      failures.push(`${label} missing ordered token: ${token}`);
      return;
    }
    previousIndex = index;
  }
}

const packageJson = read('package.json');
const firestoreIndexes = JSON.parse(read('firestore.indexes.json'));
const rateLimits = read('src/lib/rateLimit/configs.ts');
const createRoute = read('src/app/api/public/create-menu/route.ts');
const claimRoute = read('src/app/api/public/create-menu/claim/route.ts');
const createMenuFeatures = read('src/config/features.ts');
const createMenuLimits = read('src/data/shared/menuExtractionJob.ts');
const publicDraftSource = read('src/data/shared/publicMenuDraftSource.ts');
const publicDraftSourceFunctions = read('functions/src/sharedData/publicMenuDraftSource.ts');
const publicDraftSourceProjector = read('src/lib/public-menu-entry/publicDraftSource.ts');
const publicDraftData = read('src/data/shared/publicMenuDraftData.ts');
const extractionWorker = read('functions/src/logic/processMenuImagesJob.ts');
const claimUserAuthority = read('src/lib/public-menu-entry/claimUserAuthority.ts');
const priceTruth = read('src/lib/pricing/projectPriceTruth.ts');
const slugBoundary = read('src/lib/public-menu-entry/claimProjectSlug.ts');
const createPage = read('src/app/(website)/create-menu/page.tsx');
const websiteLayout = read('src/app/(website)/layout.tsx');
const websiteHeader = read('src/components/website/Header.tsx');
const createClient = read('src/app/(website)/create-menu/CreateMenuClient.tsx');
const publicDraftId = read('src/lib/public-menu-entry/publicDraftId.ts');
const previewPage = read('src/app/(website)/create-menu/preview/[draftId]/page.tsx');
const previewClient = read('src/app/(website)/create-menu/PreviewClient.tsx');
const successClient = read('src/app/(website)/create-menu/success/CreateMenuSuccessClient.tsx');
const starterActivationBanner = read('src/components/onboarding/StarterActivationBanner.tsx');
const noSubscriptionView = read('src/components/templates/main-app/billing/NoSubscriptionView.tsx');
const mobileShell = read('src/components/mobile/MobileShell.tsx');
const websiteStyles = read('src/styles/website.css');
const websiteLanguageConfig = read('src/config/websiteLanguages.ts');
const successUrl = read('src/lib/publicCreateMenu/successUrl.ts');
const previewDraftResponse = read('src/lib/publicCreateMenu/previewDraftResponse.ts');
const lastClaimHandoff = read('src/lib/publicCreateMenu/lastClaimHandoff.ts');
const maintenance = read('functions/src/schedulers/menulistMaintenanceScheduler.ts');
const readme = read('__docs__/public-menu-entry/README.md');
const spec = read('__docs__/public-menu-entry/public-menu-entry_spec.md');
const impl = read('__docs__/public-menu-entry/public-menu-entry_impl.md');
const firebaseDoc = read('__docs__/public-menu-entry/public-menu-entry_firebase.md');
const mobileDoc = read('__docs__/public-menu-entry/public-menu-entry_mobile-support.md');
const websiteDoc = read('__docs__/public-menu-entry/public-menu-entry_website.md');
const helpDoc = read('__docs__/public-menu-entry/public-menu-entry_helpdoc.md');
const marketingDoc = read('__docs__/public-menu-entry/public-menu-entry_marketing.md');
const verificationDoc = read('__docs__/public-menu-entry/public-menu-entry_verification.md');
const tracker = read('__docs__/audits/menulist-feature-flow-audit-tracker.md');
const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');
const enUsLocale = read('public/locales/menulist.ai/en-US.json');
const hiInLocale = read('public/locales/menulist.ai/hi-IN.json');

[
  'verify:public-menu-entry-boundary',
  'test:public-menu-entry-boundary',
  'scripts/verification/test-public-menu-entry-boundary.ts',
].forEach((token) => requireToken(packageJson, token, 'package scripts'));

const publicDraftComposites = (firestoreIndexes.indexes || []).filter((entry) => (
  entry.collectionGroup === 'publicMenuDrafts'
));
if (publicDraftComposites.some((entry) => (
  (entry.fields || []).some((field) => field.fieldPath === 'claimed')
  && (entry.fields || []).some((field) => field.fieldPath === 'expiresAt')
))) {
  failures.push('Public Menu Entry must not retain the obsolete claimed + expiresAt composite index');
}
const publicDraftIndexExemptions = new Set(
  (firestoreIndexes.fieldOverrides || [])
    .filter((entry) => entry.collectionGroup === 'publicMenuDrafts' && Array.isArray(entry.indexes) && entry.indexes.length === 0)
    .map((entry) => entry.fieldPath),
);
for (const fieldPath of ['extractedData', 'extractedBusinessProfile', 'sourceMetadata', 'growthAcquisition', 'sourceFiles']) {
  if (!publicDraftIndexExemptions.has(fieldPath)) {
    failures.push(`publicMenuDrafts.${fieldPath} must stay exempt from unused automatic single-field indexes`);
  }
}

[
  'PUBLIC_MENU_ENTRY_ADMISSION:',
  'limit: 30',
  'window: 300',
  'PUBLIC_MENU_ENTRY_AUTH:',
  'limit: 5',
  'window: 86400',
].forEach((token) => requireToken(rateLimits, token, 'Public Menu Entry rate-limit config'));

[
  "getRateLimitForFeature('PUBLIC_MENU_ENTRY_ADMISSION')",
  'key: `public-menu-entry-admission:${userRateLimitHash}`',
  'failClosedOnProviderError: true',
  'const sessionTenantPresent = hasSessionScopeValue(session?.user?.tenantId);',
  'if (sessionTenantPresent !== sessionStorePresent)',
  '[PERMISSIONS.USE_MENU_EXTRACTION]',
  'const safeModeResponse = await checkSafeMode();',
  "getRateLimitForFeature('PUBLIC_MENU_ENTRY_AUTH')",
  'const reusableDraft = await findReusableDraftForUser(userId, { contentHash });',
  'const reusableDraft = await findReusableDraftForUser(userId, { sourceInputHash });',
  'const statusOnly = searchParams.get(\'statusOnly\')',
  'key: `public-menu-entry-status:${userRateLimitHash}:${draftRateLimitHash}`',
  "providerUnavailable\n            ? { status: 503 }",
  'extractedData = normalizeExtractedMenuPriceTruth(extractedData);',
  "const responseStatus = draft.extractionStatus === 'completed' && !extractedData",
  "error: responseStatus === 'failed' ? PUBLIC_CREATE_MENU_DRAFT_FAILED_MESSAGE : null",
  'withPublicMenuEntryPrivateResponse',
  "const imageValues = formData.getAll('images');",
  'PUBLIC_CREATE_MENU_UPLOAD_LIMITS.MAX_FILES',
  'PUBLIC_CREATE_MENU_UPLOAD_LIMITS.MAX_TOTAL_SIZE_BYTES',
  'sourceFilesVersion: PUBLIC_MENU_DRAFT_SOURCE_FILES_VERSION',
  "formData.get('uploadSourceType') === 'pdf'",
  'normalizePublicDraftSourceForProject(draft, normalizedDraftId, {',
  'const normalizedPreview = normalizePublicCreateMenuPreviewDraft({',
  'if (!normalizedPreview || !draftSource)',
].forEach((token) => requireToken(createRoute, token, 'Public Menu Entry intake/poll route'));
requireOrder(createRoute, [
  'const admissionResponse = await checkAuthenticatedPublicMenuEntryAdmission(userId);',
  'const sessionTenantPresent = hasSessionScopeValue(session?.user?.tenantId);',
  '[PERMISSIONS.USE_MENU_EXTRACTION]',
  'const safeModeResponse = await checkSafeMode();',
  "req.headers.get('content-length')",
], 'Public Menu Entry cheap admission order');
requireOrder(createRoute, [
  'const fileHashes = preparedFiles.map',
  'const contentHash = preparedFiles.length === 1',
  'const reusableDraft = await findReusableDraftForUser(userId, { contentHash });',
  'const rateLimitResponse = await checkAuthenticatedPublicMenuEntryLimit(userId);',
], 'Public Menu Entry image dedupe before daily quota');
requireOrder(createRoute, [
  'const sourceInputHash = hashString(requestedSourceUrl);',
  'const reusableDraft = await findReusableDraftForUser(userId, { sourceInputHash });',
  'const rateLimitResponse = await checkAuthenticatedPublicMenuEntryLimit(userId);',
], 'Public Menu Entry link dedupe before daily quota');

[
  'export function normalizeExtractedMenuPriceTruth',
  "const attributes = readRecordField(item, 'attributes');",
  'if (!Array.isArray(attributes)) continue;',
  'applyPriceAssignments(assignments);',
  'return menuData;',
].forEach((token) => requireToken(priceTruth, token, 'Extracted menu price boundary'));

[
  'if (sessionTenantPresent !== sessionStorePresent)',
  'const hasExistingAccount = sessionTenantPresent && sessionStorePresent;',
  'normalizePhoneNumberForStorage({ phoneNumber: phone })',
  'normalizedPhone.internationalDigits.length < 8',
  'normalizedPhone.internationalDigits.length > 15',
  'normalizeExtractedMenuPriceTruth(extractedData);',
  'normalizePublicDraftSourcesForProject(draft, draftId, {',
  'redistributeExtractedData({',
  'const fileEntries = draftSources.map',
  'getBusinessTypeConfig(',
  '[PERMISSIONS.PUBLISH_MENU]',
  'resolvePublicMenuEntryProjectSlug(',
  'projectId,',
  'deleted: false,',
  'slug: projectSlug,',
  'projectData._mce = toMCEMetadata(mceValidate({',
  'transaction.set(projectRef, safeProjectData);',
  'const cacheResults = await Promise.allSettled',
  "revalidateTag(`menu-store-${result.storeId}`, { expire: 0 })",
  "revalidateTag(`store-${result.storeId}`, { expire: 0 })",
  "revalidateTag('client-stores', { expire: 0 })",
  "touchDigitalScreenContentVersionForStoreServer(result.storeId, 'publicCreateMenuClaim')",
  'withPublicMenuClaimPrivateResponse',
  'assertCurrentUserAvailableForOnboardingInTransaction(',
  'resolvePublicMenuClaimUserAuthority({',
  'currentAuthoritySession',
  'providerUnavailable\n                    ? { status: 503 }',
].forEach((token) => requireToken(claimRoute, token, 'Public Menu Entry claim route'));
requireOrder(claimRoute, [
  'const storeDoc = await transaction.get(storeRef);',
  'const storeData = storeDoc.data() || {};',
  'resolvePublicMenuClaimUserAuthority({',
  'requireAnyStorePermissionForStoreData(',
  '[PERMISSIONS.PUBLISH_MENU]',
  'transaction.set(projectRef, safeProjectData);',
], 'Public Menu Entry current publish permission and write order');
requireOrder(claimRoute, [
  'assertCurrentUserAvailableForOnboardingInTransaction(',
  'createTenantStoreInTransaction(transaction, db, {',
], 'Public Menu Entry new-account current-user lock before allocation');
requireOrder(claimRoute, [
  'projectData._mce = toMCEMetadata(mceValidate({',
  'transaction.set(projectRef, safeProjectData);',
], 'Public Menu Entry MCE stamp stays in project transaction');

[
  'isCurrentUserRecordEligible({',
  'normalizeAuthSessionStoreScope(params.userData)',
  'scope.tenantId !== params.expectedTenantId',
  'scope.storeId !== params.expectedStoreId',
  'candidate.role.length > 0',
].forEach((token) => requireToken(claimUserAuthority, token, 'Public Menu Entry current-user authority boundary'));

[
  'isReservedProjectSlug(proposedSlug)',
  'proposedSlug = `${proposedSlug}-menu`',
  'resolveAvailableProjectSlug(projects, proposedSlug, projectId)',
].forEach((token) => requireToken(slugBoundary, token, 'Public Menu Entry project slug boundary'));

[
  'OWNER_APP_URL',
  'canonical: `${OWNER_APP_URL}/create-menu`',
  'index: false',
  'follow: false',
  'nocache: true',
].forEach((token) => requireToken(createPage, token, 'Public Menu Entry canonical owner-app metadata'));
forbidToken(createPage, 'WebsitePageStructuredData', 'Public Menu Entry noindex owner-app metadata');

[
  'event.currentTarget.value = \'\';',
  "await import('@template/main-app/projects/utils/pdfUtils')",
  'requireAllPages: true',
  "formData.append('images', uploadFile, uploadFile.name)",
  "formData.append('uploadSourceType', isPdf ? 'pdf' : 'image')",
  "'image/jpeg,image/png,image/webp,application/pdf,.pdf'",
  "t('CreateMenu.uploadFormatHint', {",
  'PUBLIC_CREATE_MENU_UPLOAD_LIMITS.MAX_TOTAL_SIZE_BYTES',
  'submissionInFlightRef.current',
  'normalizePublicMenuDraftId(payload?.draftId)',
  'public_create_menu_request_failed',
  'buildWebsiteSignInPath(createMenuPath)',
  "textAlign: 'start'",
].forEach((token) => requireToken(createClient, token, 'Public Menu Entry source chooser'));
forbidToken(createClient, 'capture="environment"', 'Public Menu Entry source chooser');
forbidToken(createClient, "formData.append('pdf'", 'Public Menu Entry browser-only PDF transport');
forbidToken(createClient, 'isNonEmptyString(payload?.draftId)', 'Public Menu Entry draft response boundary');
forbidToken(createClient, "textAlign: 'left'", 'Public Menu Entry RTL-safe source chooser');

requireToken(createMenuFeatures, 'ENABLE_PUBLIC_MENU_PDF_UPLOAD: true', 'Public Menu Entry PDF feature flag');
[
  'MAX_FILES: MENU_EXTRACTION_JOB_LIMITS.MAX_FILES',
  'MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024',
  'MAX_TOTAL_SIZE_BYTES: 30 * 1024 * 1024',
].forEach((token) => requireToken(createMenuLimits, token, 'Public Menu Entry shared PDF limits'));
[
  'PUBLIC_MENU_DRAFT_SOURCE_FILES_VERSION = 1',
  'normalizePublicMenuDraftSourceFiles',
  'value.length > options.maxFiles',
  'totalSizeBytes > options.maxTotalSizeBytes',
  'seenPaths.has(storagePath)',
  'parsedStoragePath !== storagePath',
].forEach((token) => requireToken(publicDraftSource, token, 'Public Menu Entry ordered source contract'));
if (publicDraftSource !== publicDraftSourceFunctions) {
  failures.push('Public Menu Entry source contract must stay byte-for-byte mirrored into Functions');
}
[
  'normalizePublicDraftSourcesForProject',
  'hasVersionedEnvelope ? draft.sourceFiles : getLegacySourceCandidate(draft)',
  'draft.imagePath !== primary.storagePath',
].forEach((token) => requireToken(publicDraftSourceProjector, token, 'Public Menu Entry project source projector'));
[
  'normalizePublicMenuDraftSourceFiles(sourceCandidates, {',
  'sourceMetadataStoragePaths.length !== fileStoragePaths.length',
  'draftSources!.length === job.files.length',
  'sourceFile.storagePath === fileStoragePaths[index]',
].forEach((token) => requireToken(extractionWorker, token, 'Public Menu Entry worker source binding'));
[
  'hasCompletePublicMenuDraftSourceAttribution',
  'preserveSourceFileIndex?: boolean',
  'numeric < maxSourceFiles',
  'options.preserveSourceFileIndex !== true',
].forEach((token) => requireToken(publicDraftData, token, 'Public Menu Entry private source-index boundary'));
[
  'normalizePublicMenuDraftExtractedData(draft.extractedData, {',
  'hasCompletePublicMenuDraftSourceAttribution(extractedData, draftSources.length)',
  'maxSourceFiles: draftSources.length',
  'preserveSourceFileIndex: true',
].forEach((token) => requireToken(claimRoute, token, 'Public Menu Entry claim source redistribution input'));
[
  'hasCompleteRedistribution',
  'data.categories.map((category: any) => ({ ...category, sourceFileIndex }))',
  'data.items.map((item: any) => ({ ...item, sourceFileIndex }))',
  'hasCompletePublicMenuDraftSourceAttribution(normalized, sourceFiles.length)',
  'normalizePublicMenuDraftExtractedData(sourceData, {',
  'maxSourceFiles: sourceFiles.length',
  'preserveSourceFileIndex: true',
].forEach((token) => requireToken(extractionWorker, token, 'Public Menu Entry worker private source-index persistence'));
[
  'PUBLIC_MENU_DRAFT_ID_PATTERN',
  'value !== value.trim()',
].forEach((token) => requireToken(publicDraftId, token, 'Public Menu Entry draft ID boundary'));
requireToken(createRoute, 'normalizePublicMenuDraftId(draftId)', 'Public Menu Entry poll draft ID boundary');
requireToken(claimRoute, 'normalizePublicMenuDraftId(value) === value', 'Public Menu Entry claim draft ID boundary');
requireToken(previewPage, 'if (!draftId) notFound();', 'Public Menu Entry preview route draft ID boundary');

[
  'CREATE_MENU_PREVIEW_POLL_INTERVAL_MS = 5_000',
  'CREATE_MENU_PREVIEW_MAX_POLLS = 36',
  'CREATE_MENU_SESSION_REFRESH_TIMEOUT_MS = 3_000',
  'let attempts = 0;',
  'if (attempts >= CREATE_MENU_PREVIEW_MAX_POLLS)',
  'timer = setTimeout(poll, CREATE_MENU_PREVIEW_POLL_INTERVAL_MS);',
  '}, [fetchDraft, pollCycle, router, sessionStatus, signInUrl]);',
  'setPollCycle((cycle) => cycle + 1);',
  'const hasExistingAccount = Boolean(session?.user?.tenantId && session?.user?.storeId);',
  'if (!hasExistingAccount && (!city.trim()',
  'city: hasExistingAccount ? undefined : city.trim()',
  '{!hasExistingAccount ? <AnimateStaggerChild',
  'await Promise.race([',
  'public_create_menu_claim_session_refresh_failed',
  'serializePublicCreateMenuLastClaimHandoff({',
  'public_create_menu_claim_handoff_storage_failed',
  'const claimInFlightRef = useRef(false);',
  'if (claimInFlightRef.current) return;',
  'const controller = new AbortController();',
  'controller.abort();',
  'if (refreshTimer !== null) clearTimeout(refreshTimer);',
  'normalizePublicCreateMenuPreviewDraft(payload)',
  'extractedData?.languages?.find((language) => language.isPrimary)?.code',
  'getLocaleDirection(menuLanguage)',
  'getLocalizedText(cat.name, menuLanguage, menuLanguage, cat.id)',
  'getLocalizedText(item.name, menuLanguage, menuLanguage, item.id)',
  'getLocalizedText(item.description, menuLanguage, menuLanguage)',
  'getLocalizedText(attr.name, menuLanguage, menuLanguage, attr.id)',
  'dir={menuDirection}',
  'lang={menuLanguage}',
  '<bdi>{item.price}</bdi>',
].forEach((token) => requireToken(previewClient, token, 'Public Menu Entry preview/claim client'));
requireOrder(previewClient, [
  'if (attempts >= CREATE_MENU_PREVIEW_MAX_POLLS)',
  'attempts += 1;',
  'setPollCount(attempts);',
  'const status = await fetchDraft(controller.signal);',
], 'Public Menu Entry poll cap before each status read');
forbidToken(previewClient, '[fetchDraft, pollCount', 'Public Menu Entry preview polling');
forbidToken(previewClient, 'extractedBusinessProfile?: any', 'Public Menu Entry preview response contract');
forbidToken(previewClient, 'const lang = extractedData?.languages?.[0]?.code', 'Public Menu Entry primary menu language boundary');
forbidToken(previewClient, 'item.name?.[lang]', 'Public Menu Entry localized menu preview read path');
forbidToken(previewClient, 'item.description?.[lang]', 'Public Menu Entry localized menu preview read path');

[
  'text-align: start;',
  'padding-inline-end: var(--ws-space-3);',
  'inset-inline-end: 0.375rem;',
].forEach((token) => requireToken(websiteStyles, token, 'Public Menu Entry direction-aware website styles'));

[
  'export function normalizePublicCreateMenuPreviewDraft',
  'normalizePublicMenuDraftExtractedData(source.extractedData)',
  'normalizeExtractedBusinessProfile(source.extractedBusinessProfile)',
  'normalizeHexColor(source.detectedBrandAccentColor)',
].forEach((token) => requireToken(previewDraftResponse, token, 'Public Menu Entry browser response boundary'));

[
  'CREATE_MENU_SUCCESS_SESSION_REFRESH_TIMEOUT_MS = 3_000',
  'await Promise.race([',
  'public_create_menu_success_session_refresh_failed',
  'parsePublicCreateMenuLastClaimHandoff(rawClaim)',
  'resolveStorePermissionSessionScope(session)',
  'claim.tenantId !== sessionScope.tenantScope.numericId',
  'claim.storeId !== sessionScope.storeScope.numericId',
  'isPublicCreateMenuSuccessHostname(parsed.hostname)',
  "'unexpected_host'",
  'const signalKey = `${claim.tenantId}:${claim.storeId}:${signal}`;',
  'recordedSignalsRef.current.add(signalKey);',
  'recordedSignalsRef.current.delete(signalKey);',
  'window.sessionStorage.removeItem(PUBLIC_CREATE_MENU_LAST_CLAIM_KEY);',
  'const copiedTimerRef = useRef<number | null>(null);',
  'window.clearTimeout(copiedTimerRef.current);',
  'const authenticatedHandoffInFlightRef = useRef(false);',
  "handleAuthenticatedHandoff('/billing')",
  "handleAuthenticatedHandoff('/use-menulist')",
  "trackWebsiteMarketingEvent('create_menu_keep_live_clicked'",
  "t('CreateMenuSuccess.keepLiveCta')",
  "? t('CreateMenuSuccess.title')",
  ": t('CreateMenuSuccess.pendingTitle')",
  "? t('CreateMenuSuccess.titleHighlight')",
  ": t('CreateMenuSuccess.pendingTitleHighlight')",
  "{hasMenuUrl && <AnimateOnScroll delay={0.22}>",
  "{hasMenuUrl && <AnimateOnScroll delay={0.28}>",
  'dir="ltr"',
  "unicodeBidi: 'isolate'",
  'if (refreshTimer !== null) clearTimeout(refreshTimer);',
].forEach((token) => requireToken(successClient, token, 'Public Menu Entry success handoff'));
if ((successClient.match(/dir="ltr"/g) || []).length < 2) {
  failures.push('Public Menu Entry success URLs must both force LTR direction');
}
if ((successClient.match(/unicodeBidi: 'isolate'/g) || []).length < 2) {
  failures.push('Public Menu Entry success URLs must both isolate bidi rendering');
}
if ((successClient.match(/textAlign: 'start'/g) || []).length < 3) {
  failures.push('Public Menu Entry success content blocks must use direction-aware start alignment');
}
forbidToken(successClient, "textAlign: 'left'", 'Public Menu Entry RTL-safe success presentation');
[
  'const isEndingSoon = remainingDays !== null && remainingDays <= 3;',
  "useTranslations('StarterActivation')",
  "t('daysRemaining', { days: remainingDays })",
  "t('sharingComplete')",
  "t('sharingProgress', {",
  "t('evidenceRecorded', {",
  "t('evidenceEmpty')",
  "t('publicMenuQrActive')",
  "message={isEndingSoon ? t('endingSoonTitle') : t('activeTitle')}",
  "minHeight: 44",
  "type={isEndingSoon ? 'warning' : 'info'}",
].forEach((token) => requireToken(starterActivationBanner, token, 'Public Menu Entry starter deadline presentation'));
[
  'Starter setup is active.',
  'Starter setup ends today.',
  'days left in starter setup.',
  'Sharing steps are set.',
  'How we know: MenuList recorded',
  'Keep live',
].forEach((token) => forbidToken(starterActivationBanner, token, 'Public Menu Entry localized starter banner'));
[
  "useTranslations('Billing')",
  "useTranslations('StarterActivation')",
  "starterT('noSubscriptionDescription')",
  "starterT('choosePlanDescription')",
  "billingT('viewPlans')",
].forEach((token) => requireToken(noSubscriptionView, token, 'Public Menu Entry localized Billing state'));
[
  'Keep Your Menu Live',
  'customer-facing surfaces available',
  'Choose a plan to keep your official menu live and updated.',
  'View Plans',
].forEach((token) => forbidToken(noSubscriptionView, token, 'Public Menu Entry localized Billing state'));
[
  "useTranslations('StarterActivation')",
  'isStarterActivationStore(storeDetails)',
  "isStarterStore ? starterT('endingSoonTitle') : t('subscribeTitle')",
  "isStarterStore ? starterT('noSubscriptionDescription') : t('subscribeDescription')",
].forEach((token) => requireToken(mobileShell, token, 'Public Menu Entry starter-aware mobile subscription state'));
[
  '"keepLiveTitle"',
  '"keepLiveBody"',
  '"keepLiveCta"',
  '"pendingTitle"',
  '"pendingTitleHighlight"',
].forEach((token) => {
  requireToken(enUsLocale, token, 'Public Menu Entry English success copy');
  requireToken(hiInLocale, token, 'Public Menu Entry Hindi success copy');
});

const websiteLocaleCodes = [...websiteLanguageConfig.matchAll(/code:\s*'([^']+)'/g)]
  .map((match) => match[1]);
if (websiteLocaleCodes.length !== 8 || new Set(websiteLocaleCodes).size !== websiteLocaleCodes.length) {
  failures.push(`Public Menu Entry expected 8 unique configured website locales, found ${websiteLocaleCodes.length}`);
}
const websiteSourcePack = readJson('public/locales/menulist.ai/en-US.json');
const createMenuNamespaceCounts = {
  Header: 61,
  Footer: 56,
  ThemeSwitcher: 7,
  LanguageSwitcher: 1,
  Accessibility: 1,
  AnalyticsConsent: 11,
  CreateMenu: 115,
  CreateMenuPreview: 32,
  CreateMenuSuccess: 23,
};
const createMenuHeadlinePairs = {
  CreateMenu: [
    ['title', 'titleHighlight'],
    ['disabledTitle', 'disabledHighlight'],
    ['previewDisabledTitle', 'previewDisabledHighlight'],
  ],
  CreateMenuPreview: [['title', 'highlight']],
  CreateMenuSuccess: [
    ['title', 'titleHighlight'],
    ['pendingTitle', 'pendingTitleHighlight'],
  ],
};
const createMenuExactLocaleValues = {
  CreateMenu: ['phonePlaceholder', 'linkPlaceholder'],
  CreateMenuPreview: ['previewUrl'],
};
const createMenuProtectedTokens = [
  'MenuList',
  'WhatsApp',
  'Google',
  'Instagram',
  'QR',
  'PDF',
  'JPEG',
  'JPG',
  'PNG',
  'WebP',
  'AI',
  'FAQ',
];
const sharedChromeNamespaces = new Set([
  'Header',
  'Footer',
  'ThemeSwitcher',
  'LanguageSwitcher',
  'Accessibility',
  'AnalyticsConsent',
]);
const sharedChromeEnglishAllowlist = new Set([
  'Header.aiMenuManager',
  'Header.featureAiMenuManager',
  'Footer.aiMenuManager',
  'Footer.faq',
  'Footer.legalHeading:es-ES',
]);
for (const locale of websiteLocaleCodes) {
  const pack = readJson(`public/locales/menulist.ai/${locale}.json`);
  for (const [namespace, expectedCount] of Object.entries(createMenuNamespaceCounts)) {
    const sourceMessages = websiteSourcePack?.Website?.[namespace];
    const localeMessages = pack?.Website?.[namespace];
    if (!sourceMessages || !localeMessages) {
      failures.push(`Public Menu Entry ${locale} missing Website.${namespace}`);
      continue;
    }
    const sourceKeys = Object.keys(sourceMessages).sort();
    const localeKeys = Object.keys(localeMessages).sort();
    if (sourceKeys.length !== expectedCount) {
      failures.push(`Public Menu Entry en-US Website.${namespace} expected ${expectedCount} keys, found ${sourceKeys.length}`);
    }
    if (JSON.stringify(sourceKeys) !== JSON.stringify(localeKeys)) {
      failures.push(`Public Menu Entry ${locale} Website.${namespace} must exactly match en-US keys`);
      continue;
    }
    for (const key of sourceKeys) {
      const sourceValue = sourceMessages[key];
      const localeValue = localeMessages[key];
      if (typeof localeValue !== 'string' || localeValue.trim().length === 0) {
        failures.push(`Public Menu Entry ${locale} Website.${namespace}.${key} must be a non-empty string`);
        continue;
      }
      if (JSON.stringify(getSimplePlaceholders(sourceValue)) !== JSON.stringify(getSimplePlaceholders(localeValue))) {
        failures.push(`Public Menu Entry ${locale} Website.${namespace}.${key} changed interpolation placeholders`);
      }
      const sharedChromeKey = `${namespace}.${key}`;
      if (
        locale !== 'en-US'
        && sharedChromeNamespaces.has(namespace)
        && localeValue === sourceValue
        && !sharedChromeEnglishAllowlist.has(sharedChromeKey)
        && !sharedChromeEnglishAllowlist.has(`${sharedChromeKey}:${locale}`)
      ) {
        failures.push(`Public Menu Entry ${locale} Website.${sharedChromeKey} must not fall back to English`);
      }
      for (const token of createMenuProtectedTokens) {
        if (countToken(sourceValue, token) !== countToken(localeValue, token)) {
          failures.push(`Public Menu Entry ${locale} Website.${namespace}.${key} changed protected token ${token}`);
        }
      }
      if (/[\r\n]|%\d+\$s|__ML_|GOOGTRANS|TRANSLATE_TOKEN/i.test(localeValue)) {
        failures.push(`Public Menu Entry ${locale} Website.${namespace}.${key} contains translation-workflow residue`);
      }
    }
    for (const key of createMenuExactLocaleValues[namespace] || []) {
      if (localeMessages[key] !== sourceMessages[key]) {
        failures.push(`Public Menu Entry ${locale} Website.${namespace}.${key} must preserve the exact source sample`);
      }
    }
  }
  for (const [namespace, pairs] of Object.entries(createMenuHeadlinePairs)) {
    const localeMessages = pack?.Website?.[namespace];
    if (!localeMessages) continue;
    for (const [titleKey, highlightKey] of pairs) {
      const title = localeMessages[titleKey];
      const highlight = localeMessages[highlightKey];
      if (
        typeof title !== 'string'
        || typeof highlight !== 'string'
        || !title.toLocaleLowerCase(locale).includes(highlight.toLocaleLowerCase(locale))
      ) {
        failures.push(`Public Menu Entry ${locale} Website.${namespace}.${highlightKey} must occur in ${titleKey}`);
      }
    }
  }
}
[
  "getTranslations('Website')",
  "<SkipToContentLink>{t('Accessibility.skipToContent')}</SkipToContentLink>",
].forEach((token) => requireToken(websiteLayout, token, 'Public Menu Entry localized website accessibility'));
forbidToken(websiteLayout, '<SkipToContentLink />', 'Public Menu Entry localized website accessibility');
[
  'ws-desktop-nav ws-desktop-nav--primary',
  'ws-desktop-nav ws-desktop-nav--actions',
].forEach((token) => requireToken(websiteHeader, token, 'Public Menu Entry localized header fit'));
[
  '.ws-desktop-nav--primary',
  '.ws-desktop-nav--actions',
  '@media (max-width: 1279px)',
  'inset-inline-end: 0;',
  '[dir="rtl"] .ws-drawer-panel',
  '[dir="rtl"] .ws-drawer-panel--open',
  'transform: translateX(-100%);',
].forEach((token) => requireToken(websiteStyles, token, 'Public Menu Entry localized header and RTL drawer layout'));
[
  '"StarterActivation"',
  '"daysRemaining"',
  '"sharingProgress"',
  '"evidenceRecorded"',
  '"noSubscriptionDescription"',
  '"choosePlanDescription"',
].forEach((token) => requireToken(enUsLocale, token, 'Public Menu Entry owner starter copy'));
[
  'MENULIST_TENANT_BASE_DOMAINS',
  'PLATFORM_DOMAIN_ALIASES',
  'trustedPlatformHosts.includes(normalizedHostname)',
  'normalizedHostname.endsWith(`.${tenantBaseDomain}`)',
].forEach((token) => requireToken(successUrl, token, 'Public Menu Entry success URL host boundary'));
[
  'PUBLIC_CREATE_MENU_LAST_CLAIM_KEY',
  'version: 1',
  'LAST_CLAIM_MAX_AGE_MS',
  'normalizeStorePermissionScopeDocumentId(record.tenantId)',
  'normalizeStorePermissionScopeDocumentId(record.storeId)',
  'normalizeStorePermissionScopeDocumentId(record.projectId)',
  'Object.keys(record).some',
].forEach((token) => requireToken(lastClaimHandoff, token, 'Public Menu Entry exact last-claim handoff'));
forbidToken(successClient, 'const claim = rawClaim ? JSON.parse(rawClaim) : null;', 'Public Menu Entry unvalidated browser handoff');

[
  ".collection(DB_COLLECTIONS.PUBLIC_MENU_DRAFTS)",
  ".where('expiresAt', '<', Timestamp.now())",
  'const claimed = data.claimed === true;',
  'normalizePublicMenuDraftSourceFiles(data.sourceFiles, {',
  'if (claimed && sourcePaths.length > 0)',
  'preservedClaimedFiles += sourcePaths.length;',
  'for (const sourcePath of sourcePaths)',
  'await bucket.file(sourcePath).delete({ ignoreNotFound: true });',
  'Preserve the draft as the durable retry record.',
  'batch.delete(doc.ref);',
].forEach((token) => requireToken(maintenance, token, 'Public Menu Entry draft cleanup'));
const cleanupStart = maintenance.indexOf('async function runPublicMenuDraftCleanup');
const cleanupEnd = maintenance.indexOf('async function deleteExpiredDocs', cleanupStart);
const cleanupSource = maintenance.slice(cleanupStart, cleanupEnd);
forbidToken(cleanupSource, ".where('claimed', '==', false)", 'Public Menu Entry draft cleanup');
forbidToken(cleanupSource, "isFunctionFeatureEnabled('ENABLE_PUBLIC_MENU_ENTRY')", 'Public Menu Entry retention-independent draft cleanup');

for (const [source, label] of [
  [readme, 'Public Menu Entry README'],
  [spec, 'Public Menu Entry spec'],
  [impl, 'Public Menu Entry implementation doc'],
  [firebaseDoc, 'Public Menu Entry Firebase doc'],
  [mobileDoc, 'Public Menu Entry mobile doc'],
  [verificationDoc, 'Public Menu Entry verification doc'],
]) {
  [
    'Local source complete',
    'signed-in',
    '5 seconds',
    '36',
    'claimed draft',
    'Approved app release',
  ].forEach((token) => requireToken(source, token, label));
  requireToken(source, 'PDF', label);
}

[
  [readme, 'Public Menu Entry README'],
  [spec, 'Public Menu Entry spec'],
  [impl, 'Public Menu Entry implementation doc'],
  [websiteDoc, 'Public Menu Entry website doc'],
  [helpDoc, 'Public Menu Entry help doc'],
  [marketingDoc, 'Public Menu Entry marketing doc'],
  [changelog, 'changelog'],
].forEach(([source, label]) => requireToken(source, 'Keep this menu online', label));
[
  [readme, 'Public Menu Entry README'],
  [spec, 'Public Menu Entry spec'],
  [impl, 'Public Menu Entry implementation doc'],
  [websiteDoc, 'Public Menu Entry website doc'],
  [helpDoc, 'Public Menu Entry help doc'],
  [mobileDoc, 'Public Menu Entry mobile doc'],
].forEach(([source, label]) => requireToken(source, 'QR Code', label));

[
  '| 23 | Public Menu Entry and create-menu claim flow | Large | Local source complete |',
  '## Completed item 23 source boundary',
].forEach((token) => requireToken(tracker, token, 'strict feature tracker'));
[
  'Public Menu Entry and Create-Menu Claim Boundary',
].forEach((token) => {
  requireToken(inventory, token, 'feature inventory');
  requireToken(report, token, 'feature report');
  requireToken(audit, token, 'production-readiness audit');
  requireToken(changelog, token, 'changelog');
});

if (failures.length > 0) {
  console.error(`Public Menu Entry boundary verification failed (${failures.length} issue(s)):`);
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exit(1);
}

console.log('Public Menu Entry boundary verification passed.');
