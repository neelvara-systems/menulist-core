const { spawnSync } = require('child_process');
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

function assertSameSet(actual, expected, label) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter((value) => !actualSet.has(value));
  const extra = actual.filter((value) => !expectedSet.has(value));

  assert(
    missing.length === 0 && extra.length === 0,
    `${label} mismatch. Missing: ${missing.join(', ') || 'none'}. Extra: ${extra.join(', ') || 'none'}.`,
  );
}

function listPublicTruthToolModules() {
  return fs.readdirSync(path.join(ROOT, 'src', 'lib', 'public-truth-tools'), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('.ts'))
    .sort();
}

const PUBLIC_TOOL_MANIFEST = [
  {
    slug: 'public-truth-check',
    label: 'Public Truth Check',
    key: 'publicTruthCheck',
    localePage: 'PublicTruthCheckPage',
    verifier: 'verify-public-truth-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_CHECK',
    componentPath: 'src/components/website/publicTruthCheck/PublicTruthCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/publicTruthCheckReport.ts',
    typesPath: 'src/lib/public-truth-tools/publicTruthCheckTypes.ts',
  },
  {
    slug: 'qr-link-health-check',
    label: 'QR Link Health Check',
    key: 'qrLinkHealthCheck',
    localePage: 'QrLinkHealthCheckPage',
    verifier: 'verify-qr-link-health-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_QR_LINK_HEALTH_CHECK',
    componentPath: 'src/components/website/qrLinkHealthCheck/QrLinkHealthCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/qrLinkHealthReport.ts',
    typesPath: 'src/lib/public-truth-tools/qrLinkHealthTypes.ts',
  },
  {
    slug: 'menu-readability-check',
    label: 'Menu Readability Check',
    key: 'menuReadabilityCheck',
    localePage: 'MenuReadabilityCheckPage',
    verifier: 'verify-menu-readability-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_MENU_READABILITY_CHECK',
    componentPath: 'src/components/website/menuReadabilityCheck/MenuReadabilityCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/menuReadabilityReport.ts',
    typesPath: 'src/lib/public-truth-tools/menuReadabilityTypes.ts',
  },
  {
    slug: 'customer-question-coverage-check',
    label: 'Customer Question Coverage Check',
    key: 'customerQuestionCoverageCheck',
    localePage: 'CustomerQuestionCoverageCheckPage',
    verifier: 'verify-customer-question-coverage-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_CUSTOMER_QUESTION_COVERAGE_CHECK',
    componentPath: 'src/components/website/customerQuestionCoverageCheck/CustomerQuestionCoverageCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/customerQuestionCoverageReport.ts',
    typesPath: 'src/lib/public-truth-tools/customerQuestionCoverageTypes.ts',
  },
  {
    slug: 'customer-faq-reply-pack',
    label: 'Customer FAQ Reply Pack',
    key: 'customerFaqReplyPack',
    localePage: 'CustomerFaqReplyPackPage',
    verifier: 'verify-customer-faq-reply-pack.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_CUSTOMER_FAQ_REPLY_PACK',
    componentPath: 'src/components/website/customerFaqReplyPack/CustomerFaqReplyPackPage.tsx',
    reportPath: 'src/lib/public-truth-tools/customerFaqReplyPackReport.ts',
    typesPath: 'src/lib/public-truth-tools/customerFaqReplyPackTypes.ts',
  },
  {
    slug: 'booking-inquiry-readiness-check',
    label: 'Booking Inquiry Readiness Check',
    key: 'bookingInquiryReadinessCheck',
    localePage: 'BookingInquiryReadinessCheckPage',
    verifier: 'verify-booking-inquiry-readiness-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_BOOKING_INQUIRY_READINESS_CHECK',
    componentPath: 'src/components/website/bookingInquiryReadinessCheck/BookingInquiryReadinessCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/bookingInquiryReadinessReport.ts',
    typesPath: 'src/lib/public-truth-tools/bookingInquiryReadinessTypes.ts',
  },
  {
    slug: 'price-availability-gap-check',
    label: 'Price Availability Gap Check',
    key: 'priceAvailabilityGapCheck',
    localePage: 'PriceAvailabilityGapCheckPage',
    verifier: 'verify-price-availability-gap-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_PRICE_AVAILABILITY_GAP_CHECK',
    componentPath: 'src/components/website/priceAvailabilityGapCheck/PriceAvailabilityGapCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/priceAvailabilityGapReport.ts',
    typesPath: 'src/lib/public-truth-tools/priceAvailabilityGapTypes.ts',
  },
  {
    slug: 'menu-pdf-cleanup-check',
    label: 'Menu PDF Cleanup Check',
    key: 'menuPdfCleanupCheck',
    localePage: 'MenuPdfCleanupCheckPage',
    verifier: 'verify-menu-pdf-cleanup-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_MENU_PDF_CLEANUP_CHECK',
    componentPath: 'src/components/website/menuPdfCleanupCheck/MenuPdfCleanupCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/menuPdfCleanupReport.ts',
    typesPath: 'src/lib/public-truth-tools/menuPdfCleanupTypes.ts',
  },
  {
    slug: 'google-profile-basics-checklist',
    label: 'Google Profile Basics Checklist',
    key: 'googleProfileBasicsChecklist',
    localePage: 'GoogleProfileBasicsChecklistPage',
    verifier: 'verify-google-profile-basics-checklist.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_GOOGLE_PROFILE_BASICS_CHECKLIST',
    componentPath: 'src/components/website/googleProfileBasicsChecklist/GoogleProfileBasicsChecklistPage.tsx',
    reportPath: 'src/lib/public-truth-tools/googleProfileBasicsReport.ts',
    typesPath: 'src/lib/public-truth-tools/googleProfileBasicsTypes.ts',
  },
  {
    slug: 'business-facts-copy-pack',
    label: 'Business Facts Copy Pack',
    key: 'businessFactsCopyPack',
    localePage: 'BusinessFactsCopyPackPage',
    verifier: 'verify-business-facts-copy-pack.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_BUSINESS_FACTS_COPY_PACK',
    componentPath: 'src/components/website/businessFactsCopyPack/BusinessFactsCopyPackPage.tsx',
    reportPath: 'src/lib/public-truth-tools/businessFactsCopyPackReport.ts',
    typesPath: 'src/lib/public-truth-tools/businessFactsCopyPackTypes.ts',
  },
  {
    slug: 'customer-link-preview',
    label: 'One Customer Link Preview',
    key: 'customerLinkPreview',
    localePage: 'CustomerLinkPreviewPage',
    verifier: 'verify-customer-link-preview.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_CUSTOMER_LINK_PREVIEW',
    componentPath: 'src/components/website/customerLinkPreview/CustomerLinkPreviewPage.tsx',
    reportPath: 'src/lib/public-truth-tools/customerLinkPreviewReport.ts',
    typesPath: 'src/lib/public-truth-tools/customerLinkPreviewTypes.ts',
  },
  {
    slug: 'social-bio-link-check',
    label: 'Social Bio Link Consistency Check',
    key: 'socialBioLinkCheck',
    localePage: 'SocialBioLinkCheckPage',
    verifier: 'verify-social-bio-link-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_SOCIAL_BIO_LINK_CHECK',
    componentPath: 'src/components/website/socialBioLinkCheck/SocialBioLinkCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/socialBioLinkCheckReport.ts',
    typesPath: 'src/lib/public-truth-tools/socialBioLinkCheckTypes.ts',
  },
  {
    slug: 'whatsapp-action-link-check',
    label: 'WhatsApp Action Link Check',
    key: 'whatsappActionLinkCheck',
    localePage: 'WhatsAppActionLinkCheckPage',
    verifier: 'verify-whatsapp-action-link-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_WHATSAPP_ACTION_LINK_CHECK',
    componentPath: 'src/components/website/whatsappActionLinkCheck/WhatsAppActionLinkCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/whatsappActionLinkReport.ts',
    typesPath: 'src/lib/public-truth-tools/whatsappActionLinkTypes.ts',
  },
  {
    slug: 'whatsapp-reply-pack',
    label: 'WhatsApp Reply Pack',
    key: 'whatsappReplyPack',
    localePage: 'WhatsAppReplyPackPage',
    verifier: 'verify-whatsapp-reply-pack.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_WHATSAPP_REPLY_PACK',
    componentPath: 'src/components/website/whatsappReplyPack/WhatsAppReplyPackPage.tsx',
    reportPath: 'src/lib/public-truth-tools/whatsappReplyPackReport.ts',
    typesPath: 'src/lib/public-truth-tools/whatsappReplyPackTypes.ts',
  },
  {
    slug: 'hours-check',
    label: 'Hours Check',
    key: 'hoursCheck',
    localePage: 'HoursCheckPage',
    verifier: 'verify-hours-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_HOURS_CHECK',
    componentPath: 'src/components/website/hoursCheck/HoursCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/hoursCheckReport.ts',
    typesPath: 'src/lib/public-truth-tools/hoursCheckTypes.ts',
  },
  {
    slug: 'photo-gap-check',
    label: 'Photo Gap Check',
    key: 'photoGapCheck',
    localePage: 'PhotoGapCheckPage',
    verifier: 'verify-photo-gap-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_PHOTO_GAP_CHECK',
    componentPath: 'src/components/website/photoGapCheck/PhotoGapCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/photoGapCheckReport.ts',
    typesPath: 'src/lib/public-truth-tools/photoGapCheckTypes.ts',
  },
];

const PUBLIC_ASSET_TOOL_MANIFEST = [
  {
    slug: 'qr-poster-maker',
    label: 'QR Poster Maker',
    key: 'qrPosterMaker',
    featureFlag: 'ENABLE_PUBLIC_ASSET_QR_POSTER_MAKER',
  },
  {
    slug: 'whatsapp-menu-status-maker',
    label: 'WhatsApp Menu Status Maker',
    key: 'whatsappMenuStatusMaker',
    featureFlag: 'ENABLE_PUBLIC_ASSET_WHATSAPP_MENU_STATUS_MAKER',
  },
  {
    slug: 'holiday-hours-poster-maker',
    label: 'Holiday Hours Poster Maker',
    key: 'holidayHoursPosterMaker',
    featureFlag: 'ENABLE_PUBLIC_ASSET_HOLIDAY_HOURS_POSTER_MAKER',
  },
  {
    slug: 'customer-link-card-maker',
    label: 'Customer Link Card Maker',
    key: 'customerLinkCardMaker',
    featureFlag: 'ENABLE_PUBLIC_ASSET_CUSTOMER_LINK_CARD_MAKER',
  },
  {
    slug: 'feedback-qr-card-maker',
    label: 'Feedback QR Card Maker',
    key: 'feedbackQrCardMaker',
    featureFlag: 'ENABLE_PUBLIC_ASSET_FEEDBACK_QR_CARD_MAKER',
  },
];

const VERIFIERS = [
  'verify-tools-hub.js',
  'verify-shareable-tool-reports.js',
  'verify-report-leads-boundary.js',
  'verify-print-share-tools.js',
  'verify-public-truth-monitor-addon.js',
  ...PUBLIC_TOOL_MANIFEST.map((tool) => tool.verifier),
];

const ACTIVE_TOOL_DOC_DIRS = [
  '__docs__/menulist-tools',
  '__docs__/menulist-tools/public-truth-tools',
  '__docs__/menulist-tools/public-truth-monitor-addon',
  '__docs__/menulist-tools/tools-hub',
  '__docs__/menulist-tools/shareable-tool-reports',
  '__docs__/menulist-tools/print-share-tools',
  ...PUBLIC_TOOL_MANIFEST.map((tool) => `__docs__/menulist-tools/${tool.slug}`),
];

const CURRENT_DOC_DATE = 'July 4, 2026';
const DOC_DATE_OVERRIDES = {
  '__docs__/menulist-tools/public-truth-tools': 'July 16, 2026',
  '__docs__/menulist-tools/public-truth-monitor-addon': 'July 16, 2026',
  '__docs__/menulist-tools/shareable-tool-reports': 'July 16, 2026',
  '__docs__/menulist-tools/print-share-tools': 'July 16, 2026',
  '__docs__/menulist-tools/public-truth-check': 'July 16, 2026',
  '__docs__/menulist-tools/booking-inquiry-readiness-check': 'July 16, 2026',
  '__docs__/menulist-tools/business-facts-copy-pack': 'July 16, 2026',
  '__docs__/menulist-tools/tools-hub': 'July 9, 2026',
  '__docs__/menulist-tools/whatsapp-action-link-check': 'July 16, 2026',
  '__docs__/menulist-tools/whatsapp-reply-pack': 'July 16, 2026',
};

function getActualToolRoutes() {
  const toolsRoot = path.join(ROOT, 'src', 'app', '(website)', 'tools');

  return fs.readdirSync(toolsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name !== 'reports')
    .filter((name) => exists(`src/app/(website)/tools/${name}/page.tsx`))
    .sort();
}

function assertPublicToolInventoryBoundary() {
  const manifestSlugs = PUBLIC_TOOL_MANIFEST.map((tool) => tool.slug).sort();
  const publicToolRouteSlugs = [
    ...manifestSlugs,
    ...PUBLIC_ASSET_TOOL_MANIFEST.map((tool) => tool.slug),
  ].sort();
  const actualSlugs = getActualToolRoutes();
  const expectedToolModules = [
    'externalLocationIdentity.ts',
    'mapsPlaceCheckClient.ts',
    'ownerPublicTruthPresentation.ts',
    'ownerPublicTruthReadiness.ts',
    'phoneValidation.ts',
    'publicTruthMonitorApiResponse.ts',
    'publicTruthMonitorClientContracts.ts',
    'publicTruthMonitorDiagnostics.ts',
    'publicTruthMonitorEntitlements.ts',
    'publicTruthMonitorReport.ts',
    'publicTruthMonitorServerScope.ts',
    'publicTruthToolInputLimits.ts',
    'publicUrlValidation.ts',
    'serverPublicTruthMonitorEntitlements.ts',
    'shareableToolReport.ts',
    ...PUBLIC_TOOL_MANIFEST.flatMap((tool) => [
      path.basename(tool.reportPath),
      path.basename(tool.typesPath),
    ]),
  ].sort();
  const actualToolModules = listPublicTruthToolModules();

  assertSameSet(actualSlugs, publicToolRouteSlugs, 'MenuList public tools route inventory');
  assertSameSet(actualToolModules, expectedToolModules, 'Public Truth Tools report/type module inventory');
  assertSameSet(
    PUBLIC_TOOL_MANIFEST.map((tool) => tool.verifier).sort(),
    VERIFIERS.filter((verifier) => verifier.startsWith('verify-') && ![
      'verify-tools-hub.js',
      'verify-shareable-tool-reports.js',
      'verify-report-leads-boundary.js',
      'verify-print-share-tools.js',
      'verify-public-truth-monitor-addon.js',
    ].includes(verifier)).sort(),
    'Public Truth Tools verifier inventory',
  );

  const packageJson = JSON.parse(read('package.json'));
  const packageScripts = packageJson.scripts || {};
  const features = read('src/config/features.ts');
  const discoveryPolicy = read('src/lib/seo/discoveryPolicy.ts');
  const sitemap = read('public/sitemap.xml');
  const llms = read('public/llms.txt');
  const llmsFull = read('public/llms-full.txt');
  const toolsReadme = read('__docs__/menulist-tools/README.md');
  const familyReadme = read('__docs__/menulist-tools/public-truth-tools/README.md');
  const familySpec = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_spec.md');
  const familyImpl = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_impl.md');
  const familyFirebase = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_firebase.md');
  const familyTests = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_test-cases.md');
  const headerComponent = read('src/components/website/Header.tsx');
  const footerComponent = read('src/components/website/Footer.tsx');
  const websiteCss = read('src/styles/website.css');
  const toolsHubComponent = read('src/components/website/toolsHub/ToolsHubPage.tsx');
  const toolsHubVerifier = read('scripts/verification/verify-tools-hub.js');
  const shareableVerifier = read('scripts/verification/verify-shareable-tool-reports.js');
  const enUS = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
  const hiIN = JSON.parse(read('public/locales/menulist.ai/hi-IN.json'));
  const publicUrlValidation = read('src/lib/public-truth-tools/publicUrlValidation.ts');
  const phoneValidation = read('src/lib/public-truth-tools/phoneValidation.ts');
  const mapsPlaceCheck = read('functions/src/logic/mapsPlaceCheck.ts');
  const mapsPlaceIdentityBoundary = read('functions/src/logic/mapsPlaceIdentityBoundary.ts');
  const mapsPlaceCheckSpec = read('__docs__/menulist-tools/maps-place-check/maps-place-check_spec.md');
  const mapsPlaceCheckImpl = read('__docs__/menulist-tools/maps-place-check/maps-place-check_impl.md');
  const mapsPlaceCheckFirebase = read('__docs__/menulist-tools/maps-place-check/maps-place-check_firebase.md');
  const mapsPlaceCheckTests = read('__docs__/menulist-tools/maps-place-check/maps-place-check_test-cases.md');
  const mapsPlaceCheckValidation = read('__docs__/menulist-tools/maps-place-check/maps-place-check_validation.md');
  const externalLocationIdentity = read('src/lib/public-truth-tools/externalLocationIdentity.ts');
  const mapsPlaceCheckClient = read('src/lib/public-truth-tools/mapsPlaceCheckClient.ts');
  const storeTypes = read('src/types/platform/store.ts');
  const storesDal = read('src/database/stores/index.tsx');
  const storeNestedProjection = read('src/lib/store/storeNestedUpdateProjection.ts');
  const mobileOfficialPage = read('src/components/mobile/screens/MobileOfficialPageScreen.tsx');
  const desktopBusinessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
  const embeddedOfficialPage = read('src/components/templates/main-app/projects/b2cView/index.tsx');
  const brandPropagationBoundary = read('src/lib/multiOutlet/brandPropagationBoundary.ts');
  const platformPullBusinessRoute = read('src/app/api/public/v1/business/route.ts');
  const publicClientStoreProjection = read('src/lib/publicTruth/clientStoreProjection.ts');
  const masterInventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
  const masterReport = read('FEATURE_SWEEP_MASTER_REPORT.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_TOOLS: true', 'Public Truth Tools family feature flag');
  assertIncludes(features, 'ENABLE_PUBLIC_ASSET_TOOLS: true', 'Public asset tools family feature flag');
  assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_MONITOR_ADDON: true', 'Public Truth Monitor Add-On feature flag');
  assertIncludes(packageScripts['test:public-truth-tools-runtime'], 'test-public-truth-tools-runtime.ts', 'Public Truth Tools runtime test registry');
  assertIncludes(masterInventory, '| public_truth_tools |', 'Public Truth Tools master inventory row');
  assertIncludes(masterInventory, 'item 27 local source complete', 'Public Truth Tools master inventory status');
  assertIncludes(masterReport, '## Public Truth Tools Boundary', 'Public Truth Tools master report boundary');
  assertIncludes(productionAudit, '## Public Truth Tools End-to-End Boundary - July 16, 2026', 'Public Truth Tools production audit boundary');
  assertIncludes(changelog, '## July 16, 2026 - Public Truth Tools End-to-End Hardening', 'Public Truth Tools changelog boundary');
  assertIncludes(familyReadme, 'sixteen public tools', 'Public Truth Tools family count');
  assertIncludes(familyReadme, 'eighteen owner readiness modules', 'Public Truth Tools owner module count');
  assertIncludes(familyReadme, 'owner fix lists', 'Public Truth Tools owner fix-list boundary');
  assertIncludes(familyImpl, 'buildOwnerPublicTruthSetupJobList', 'Public Truth Tools owner fix-list implementation');
  assertIncludes(familyTests, 'PTT-021', 'Public Truth Tools owner fix-list test boundary');
  assertIncludes(familyTests, 'PTT-022', 'Public Truth Tools V2 paid add-on test boundary');
  assertIncludes(familyTests, 'PTT-023', 'Public Truth Tools public HTTPS URL boundary test');
  assertIncludes(familyTests, 'PTT-024', 'Public Truth Tools public HTTPS URL evidence text boundary test');
  assertIncludes(familyReadme, 'shared public HTTPS URL validation', 'Public Truth Tools README shared URL boundary');
  assertIncludes(familyImpl, '## 1.1C Public URL Boundary', 'Public Truth Tools implementation shared URL boundary');
  assertIncludes(familySpec, 'shared public HTTPS URL boundary', 'Public Truth Tools spec shared URL boundary');
  assertIncludes(publicUrlValidation, 'parsePublicHttpsUrl', 'Public Truth Tools shared public HTTPS URL parser');
  assertIncludes(publicUrlValidation, "url.protocol !== 'https:'", 'Public Truth Tools shared URL parser must reject insecure protocols');
  assertIncludes(publicUrlValidation, "normalized === 'localhost'", 'Public Truth Tools shared URL parser must reject localhost');
  assertIncludes(publicUrlValidation, "normalized.endsWith('.local')", 'Public Truth Tools shared URL parser must reject local hostnames');
  assertIncludes(publicUrlValidation, 'isPrivateIpv4', 'Public Truth Tools shared URL parser must reject private IPv4');
  assertIncludes(publicUrlValidation, 'url.username || url.password', 'Public Truth Tools shared URL parser must reject credentialed URLs');
  assertIncludes(publicUrlValidation, "normalized.includes(':')", 'Public Truth Tools shared URL parser must reject raw IPv6 hosts');
  assertIncludes(publicUrlValidation, "normalized.split('.').some((label) => !label)", 'Public Truth Tools shared URL parser must reject empty host labels');
  assertIncludes(phoneValidation, 'PHONE_INPUT_PATTERN', 'Public Truth Tools shared phone boundary');
  assertIncludes(phoneValidation, 'getWhatsAppSchemePhoneDigits', 'Public Truth Tools WhatsApp scheme boundary');
  assertIncludes(publicUrlValidation, "logRuntimeFailure('public_truth_tool_url_parse_failed'", 'Public Truth Tools shared URL parser parse diagnostics');
  assertIncludes(publicUrlValidation, 'MAX_PUBLIC_TRUTH_URL_PARSE_DIAGNOSTICS', 'Public Truth Tools shared URL parser diagnostic cap');
  assertIncludes(publicUrlValidation, 'reportedPublicTruthUrlParseFailures.add(failureKey)', 'Public Truth Tools shared URL parser capped shape guard');
  assertIncludes(publicUrlValidation, "fallbackPolicy: 'treat_as_missing_public_url'", 'Public Truth Tools shared URL parser fallback policy');
  assertIncludes(publicUrlValidation, 'valueStringLength', 'Public Truth Tools shared URL parser bounded value metadata');
  assertIncludes(publicUrlValidation, 'candidateLength', 'Public Truth Tools shared URL parser bounded candidate metadata');
  assertIncludes(familyReadme, 'bounded parse diagnostics', 'Public Truth Tools README URL parse diagnostics');
  assertIncludes(familyImpl, 'public_truth_tool_url_parse_failed', 'Public Truth Tools implementation URL parse diagnostics');
  assertIncludes(familyFirebase, 'public_truth_tool_url_parse_failed', 'Public Truth Tools Firebase URL parse diagnostics');
  assertIncludes(familyTests, 'PTT-025', 'Public Truth Tools URL parse diagnostic test boundary');
  assertIncludes(mapsPlaceCheck, 'responseTextLength: responseText.length', 'Maps Place Check response diagnostics');
  assertIncludes(mapsPlaceCheck, 'parsedResponse: Boolean(parsed)', 'Maps Place Check parse diagnostics');
  assertNotIncludes(mapsPlaceCheck, 'rawText', 'Maps Place Check callable output boundary');
  assertNotIncludes(mapsPlaceCheck, 'MAX_RAW_TEXT_LENGTH', 'Maps Place Check callable output boundary');
  assertIncludes(mapsPlaceIdentityBoundary, 'MAX_MAPS_PLACE_ID_LENGTH = 2048', 'Maps Place Check bounded non-truncating Place ID contract');
  assertIncludes(mapsPlaceIdentityBoundary, 'normalized.length > MAX_MAPS_PLACE_ID_LENGTH', 'Maps Place Check over-cap Place ID rejection');
  assertIncludes(mapsPlaceIdentityBoundary, 'normalizeMapsGroundingSourceUri', 'Maps Place Check source URI validation');
  assertNotIncludes(mapsPlaceCheck, 'cleanOptionalText(maps?.placeId', 'Maps Place Check must not truncate source Place IDs');
  assertNotIncludes(mapsPlaceCheck, 'cleanOptionalText(parsed?.placeId', 'Maps Place Check must not trust model-parsed Place IDs');
  assertNotIncludes(mapsPlaceCheck, 'cleanOptionalText(parsed?.uri', 'Maps Place Check must not trust model-parsed source URIs');
  assertNotIncludes(mapsPlaceCheckImpl, 'rawText?: string', 'Maps Place Check implementation output contract');
  assertIncludes(mapsPlaceCheckImpl, 'The response is returned to the caller without raw provider response text.', 'Maps Place Check implementation raw provider output boundary');
  assertIncludes(mapsPlaceCheckImpl, 'return raw provider response text', 'Maps Place Check implementation disallowed output boundary');
  assertIncludes(mapsPlaceCheckSpec, 'No raw provider response text in callable output.', 'Maps Place Check spec raw provider output boundary');
  assertIncludes(mapsPlaceCheckSpec, 'Results never include raw provider response text.', 'Maps Place Check acceptance raw provider output boundary');
  assertIncludes(mapsPlaceCheckFirebase, 'No raw provider response text is returned to the callable client.', 'Maps Place Check Firebase raw provider output boundary');
  assertIncludes(mapsPlaceCheckTests, 'No raw provider response text is returned', 'Maps Place Check tests raw provider output boundary');
  assertIncludes(mapsPlaceCheckValidation, 'No raw provider response in callable output', 'Maps Place Check validation raw provider output boundary');
  assertIncludes(
    storeTypes,
    'externalLocationIdentity?: StoreExternalLocationIdentity;',
    'Store external location identity contract',
  );
  assertIncludes(
    externalLocationIdentity,
    "EXTERNAL_LOCATION_IDENTITY_SCHEMA_VERSION = 'menulist.external-location-identity.v1'",
    'External location identity version',
  );
  assertIncludes(
    externalLocationIdentity,
    "confirmationStatus: 'owner_confirmed'",
    'External location identity owner-confirmation boundary',
  );
  assertIncludes(
    externalLocationIdentity,
    'const attributableSource = sources.find',
    'Maps Place Check stable identity attributable source boundary',
  );
  assertIncludes(
    externalLocationIdentity,
    "normalizeProviderLocationId(\n    readOwnDataField(attributableSource, 'placeId'),",
    'Maps Place Check stable identity must use grounding source Place ID',
  );
  assertIncludes(
    externalLocationIdentity,
    "normalizeOBPGoogleMapsUrl(readOwnDataField(attributableSource, 'uri'))",
    'Maps Place Check stable identity must use grounding source URI',
  );
  assertIncludes(
    storeNestedProjection,
    "'externalLocationIdentity'",
    'External location identity concurrent nested patch boundary',
  );
  assertIncludes(
    storesDal,
    'mirrorOwnerGoogleMapsLinkIdentity(data);',
    'Existing owner Maps-link update identity mirror',
  );
  assertIncludes(
    storesDal,
    "throw new Error('store_external_location_identity_direct_update_forbidden');",
    'Generic store updates must reject caller-supplied external identity metadata',
  );
  assertIncludes(
    storesDal,
    "new FieldPath('externalLocationIdentity', 'bindings', binding.provider)",
    'Explicit confirmed external identity write path',
  );
  assertIncludes(
    storesDal,
    "new FieldPath('externalLocationIdentity', 'bindings', data.provider)",
    'Reversible external identity removal path',
  );
  assertIncludes(
    storesDal,
    "'external_location_identity_store_scope_mismatch',",
    'External location identity active-store scope guard',
  );
  assertIncludes(
    storesDal,
    "requestedBinding.provider !== 'google_maps'",
    'Browser confirmation must not manufacture non-Maps provider connections',
  );
  assertIncludes(
    storesDal,
    'assertExternalLocationIdentityStoreAvailable(',
    'External location identity transaction scope and availability guard',
  );
  assertIncludes(
    mobileOfficialPage,
    '...getStoreDeepDifference(payload, storeDetails)',
    'Mobile Official Page must omit unchanged Maps links from unrelated writes',
  );
  assertIncludes(
    mobileOfficialPage,
    "'mobile_official_page_store_update_rejected'",
    'Mobile Official Page store-write result guard',
  );
  assertIncludes(
    desktopBusinessSettings,
    'const updatedChanges: any = applyBusinessCopyManualOverrideMetaToUpdate({',
    'Desktop Business Settings must preserve manual business-copy override metadata',
  );
  assertIncludes(
    desktopBusinessSettings,
    'update: getStoreDeepDifference(changesToUpload, storeDetails),',
    'Desktop Business Settings must omit unchanged Maps links from unrelated writes',
  );
  assertIncludes(
    desktopBusinessSettings,
    "'desktop_business_settings_store_update_rejected'",
    'Desktop Business Settings store-write result guard',
  );
  assertIncludes(
    embeddedOfficialPage,
    '...getStoreDeepDifference(storeUpdate, storeDetails || {})',
    'Embedded Official Page must omit unchanged Maps links from unrelated writes',
  );
  assertIncludes(
    embeddedOfficialPage,
    "'projects_b2c_official_page_store_update_rejected'",
    'Embedded Official Page store-write result guard',
  );
  assertIncludes(
    mapsPlaceCheckClient,
    "if (!FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK)",
    'Maps Place Check client feature gate',
  );
  assertIncludes(
    mapsPlaceCheckClient,
    "'mapsPlaceCheck'",
    'Maps Place Check client callable',
  );
  assertIncludes(
    mapsPlaceCheckClient,
    'confirmMapsPlaceCheckIdentity',
    'Maps Place Check explicit confirmation client path',
  );
  assertNotIncludes(
    platformPullBusinessRoute,
    'externalLocationIdentity',
    'Platform Pull business response internal identity exclusion',
  );
  assertNotIncludes(
    publicClientStoreProjection,
    "'externalLocationIdentity'",
    'Public client store projection internal identity exclusion',
  );
  assertNotIncludes(
    brandPropagationBoundary,
    "'externalLocationIdentity'",
    'External location identity must remain location-scoped and non-propagating',
  );
  assertIncludes(
    mapsPlaceCheckImpl,
    'The confirmed binding stays internal and is not added to Platform Pull or public structured data.',
    'Maps Place Check internal binding output boundary',
  );
  assertIncludes(
    mapsPlaceCheckFirebase,
    'The internal URI binding is mirrored inside the existing store write.',
    'Maps Place Check zero-additional-write owner-link boundary',
  );
  assertIncludes(
    mapsPlaceCheckTests,
    'Removing one provider binding preserves every other provider binding',
    'Maps Place Check reversible provider binding test boundary',
  );
  assertIncludes(toolsReadme, '16 | Social Bio Link Consistency Check', 'MenuList Tools ranked tool count');
  assertIncludes(toolsReadme, '[public-truth-monitor-addon](./public-truth-monitor-addon/README.md)', 'MenuList Tools V2 paid add-on docs link');
  const ownerReadiness = read('src/lib/public-truth-tools/ownerPublicTruthReadiness.ts');
  assertIncludes(ownerReadiness, "logRuntimeFailure('public_truth_owner_menu_url_generation_failed'", 'Public Truth Tools owner menu URL generation diagnostics');
  assertIncludes(ownerReadiness, 'MAX_OWNER_MENU_URL_DIAGNOSTICS', 'Public Truth Tools owner menu URL diagnostic cap');
  assertIncludes(ownerReadiness, 'reportedOwnerMenuUrlGenerationFailures.add(failureKey)', 'Public Truth Tools owner menu URL capped shape guard');
  assertIncludes(ownerReadiness, "fallbackPolicy: 'omit_menu_url'", 'Public Truth Tools owner menu URL fallback policy');
  assertIncludes(ownerReadiness, 'projectSlugLength', 'Public Truth Tools owner menu URL bounded project slug metadata');
  assertIncludes(ownerReadiness, 'projectNameKind', 'Public Truth Tools owner menu URL bounded project name metadata');
  assertIncludes(familyReadme, 'owner menu URL generation diagnostics', 'Public Truth Tools README owner menu URL diagnostics');
  assertIncludes(familyImpl, 'public_truth_owner_menu_url_generation_failed', 'Public Truth Tools implementation owner menu URL diagnostics');
  assertIncludes(familyFirebase, 'public_truth_owner_menu_url_generation_failed', 'Public Truth Tools Firebase owner menu URL diagnostics');
  assertIncludes(familyTests, 'PTT-026', 'Public Truth Tools owner menu URL diagnostic test boundary');
  [
    'business_facts_copy_pack',
    'customer_faq_reply_pack',
    'customer_link_preview',
    'social_bio_link_consistency',
    'whatsapp_reply_pack',
    'print_share_assets',
  ].forEach((moduleId) => assertIncludes(ownerReadiness, moduleId, `Owner readiness module ${moduleId}`));

  assertIncludes(headerComponent, '{ href: "/tools", key: "resourceToolsHub", icon: LuWrench }', 'desktop Resources dropdown Tools Hub link');
  assertIncludes(headerComponent, 'resourceDropdownLinks.map', 'shared resource dropdown renderer');
  assertIncludes(headerComponent, 'ws-header-resource-menu__panel', 'desktop resource dropdown panel');
  assertIncludes(headerComponent, 'key: "mobileLearnLabel",\n    links: resourceDropdownLinks,', 'mobile hamburger resource links');
  assertIncludes(headerComponent, 'group.links.map', 'mobile hamburger shared group renderer');
  assertIncludes(headerComponent, 'className="ws-mobile-nav-link"', 'mobile hamburger resource link item');
  assertIncludes(headerComponent, 'const isActive = isCurrentPath(item.href);', 'mobile hamburger marks active resource and tools routes');
  assertIncludes(footerComponent, "{ href: '/tools', key: 'toolsHub' }", 'footer Tools Hub source link');
  assertIncludes(footerComponent, 'sourceLinks.map', 'footer source link renderer');
  assertIncludes(websiteCss, '@media (max-width: 960px)', 'mobile hamburger breakpoint');
  assertIncludes(websiteCss, '.ws-mobile-nav-toggle', 'mobile hamburger toggle style');
  assertIncludes(websiteCss, '.ws-mobile-nav-link', 'mobile resource link style');
  assertIncludes(websiteCss, '.ws-footer-link-grid a', 'footer link mobile touch style');

  for (const docDir of ACTIVE_TOOL_DOC_DIRS) {
    const expectedDocDate = DOC_DATE_OVERRIDES[docDir] || CURRENT_DOC_DATE;
    const absoluteDocDir = path.join(ROOT, docDir);
    const docFiles = fs.readdirSync(absoluteDocDir)
      .filter((fileName) => fileName.endsWith('.md'))
      .sort();

    for (const docFile of docFiles) {
      assertIncludes(
        read(`${docDir}/${docFile}`),
        `Last Updated:** ${expectedDocDate}`,
        `${docDir}/${docFile} current documentation date`,
      );
    }
  }

  for (const tool of PUBLIC_TOOL_MANIFEST) {
    const routePath = `/tools/${tool.slug}`;
    const routeFile = `src/app/(website)/tools/${tool.slug}/page.tsx`;
    const docRoot = `__docs__/menulist-tools/${tool.slug}`;
    const packageScript = `verify:${tool.slug}`;
    const packageCommand = `node scripts/verification/${tool.verifier}`;

    for (const file of [
      routeFile,
      tool.componentPath,
      tool.reportPath,
      tool.typesPath,
      `scripts/verification/${tool.verifier}`,
      `${docRoot}/README.md`,
      `${docRoot}/${tool.slug}_spec.md`,
      `${docRoot}/${tool.slug}_impl.md`,
      `${docRoot}/${tool.slug}_marketing.md`,
      `${docRoot}/${tool.slug}_website.md`,
      `${docRoot}/${tool.slug}_helpdoc.md`,
      `${docRoot}/${tool.slug}_firebase.md`,
      `${docRoot}/${tool.slug}_mobile-support.md`,
      `${docRoot}/${tool.slug}_test-cases.md`,
    ]) {
      assert(exists(file), `Public Truth Tools inventory file missing for ${tool.slug}: ${file}`);
    }

    assert(packageScripts[packageScript] === packageCommand, `${packageScript} must run ${packageCommand}`);
    assertIncludes(features, `${tool.featureFlag}: true`, `${tool.slug} feature flag`);
    assertIncludes(features, `${docRoot}/${tool.slug}_impl.md`, `${tool.slug} feature flag doc pointer`);

    const route = read(routeFile);
    const report = read(tool.reportPath);
    assertIncludes(route, `path="${routePath}"`, `${tool.slug} structured data path`);
    assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', `${tool.slug} family feature flag route guard`);
    assertIncludes(route, `FEATURE_FLAGS.${tool.featureFlag}`, `${tool.slug} feature flag route guard`);

    assertIncludes(discoveryPolicy, `path: '${routePath}'`, `${tool.slug} discovery policy`);
    assertIncludes(sitemap, `https://menulist.ai${routePath}`, `${tool.slug} sitemap`);
    assertIncludes(llms, `https://menulist.ai${routePath}`, `${tool.slug} llms.txt`);
    assertIncludes(llmsFull, `https://menulist.ai${routePath}`, `${tool.slug} llms-full.txt`);

    assertIncludes(toolsReadme, `[${tool.slug}](./${tool.slug}/README.md)`, `${tool.slug} MenuList Tools README`);
    assertIncludes(familyReadme, routePath, `${tool.slug} Public Truth Tools README route list`);
    assertIncludes(familyImpl, tool.reportPath.split('/').pop(), `${tool.slug} Public Truth Tools implementation docs`);
    assertIncludes(familyFirebase, `${docRoot}/${tool.slug}_firebase.md`, `${tool.slug} Public Truth Tools Firebase docs`);
    assertIncludes(familyTests, tool.label, `${tool.slug} Public Truth Tools test docs`);

    assertIncludes(toolsHubComponent, `href: '${routePath}'`, `${tool.slug} Tools Hub route`);
    assertIncludes(toolsHubComponent, `key: '${tool.key}'`, `${tool.slug} Tools Hub key`);
    assertIncludes(toolsHubVerifier, routePath, `${tool.slug} Tools Hub verifier route`);
    assertIncludes(toolsHubVerifier, tool.key, `${tool.slug} Tools Hub verifier key`);

    assertIncludes(shareableVerifier, tool.componentPath, `${tool.slug} shareable report source component`);
    assertIncludes(shareableVerifier, `'${tool.slug}'`, `${tool.slug} shareable report tool id`);
    assertIncludes(report, 'publicUrlValidation', `${tool.slug} report must use the shared public URL boundary helper`);
    const sharedPublicUrlCalls = report.match(/(?:isValidHttpUrl|parsePublicHttpsUrl)\([^)]*\)/g) || [];
    assert(
      sharedPublicUrlCalls.every((call) => /,\s*(?:'[^']+'|diagnosticSource)\)/.test(call)),
      `${tool.slug} shared public URL calls must pass a bounded diagnostic source label`,
    );
    assertIncludes(report, 'Public HTTPS', `${tool.slug} report must disclose the public HTTPS URL evidence boundary`);
    assert(!report.includes("url.protocol === 'http:' || url.protocol === 'https:'"), `${tool.slug} report must not accept insecure HTTP URL protocols`);
    assert(!report.includes("url.hostname === 'localhost'"), `${tool.slug} report must not treat localhost as a valid public URL`);
    assert(!report.includes("url.hostname === '127.0.0.1'"), `${tool.slug} report must not treat loopback as a valid public URL`);
    assert(!report.includes('hostLooksUsable'), `${tool.slug} report must not use the old local/HTTP URL helper`);
    assert(!report.includes("return 'URL format was checked locally. The URL was not opened or fetched.'"), `${tool.slug} report must not use generic URL evidence text`);
    assert(!report.includes("return 'Customer-link format was checked locally. The link was not opened or fetched.'"), `${tool.slug} report must not use generic customer-link evidence text`);
    assert(!report.includes("return 'Customer link format was checked locally. The URL was not opened or fetched.'"), `${tool.slug} report must not use generic customer link evidence text`);
    assert(!report.includes("return 'URL format was checked. The URL was not fetched and no Google profile was inspected.'"), `${tool.slug} report must not use generic public truth URL evidence text`);

    assert(enUS.Website?.[tool.localePage], `en-US ${tool.localePage} locale namespace must exist`);
    assert(hiIN.Website?.[tool.localePage], `hi-IN ${tool.localePage} locale namespace must exist`);
    assert(enUS.Website.ToolsHubPage?.tools?.[tool.key], `en-US Tools Hub ${tool.key} locale card must exist`);
    assert(hiIN.Website.ToolsHubPage?.tools?.[tool.key], `hi-IN Tools Hub ${tool.key} locale card must exist`);
  }

  for (const tool of PUBLIC_ASSET_TOOL_MANIFEST) {
    const routePath = `/tools/${tool.slug}`;
    const routeFile = `src/app/(website)/tools/${tool.slug}/page.tsx`;

    assert(exists(routeFile), `Public asset tool route missing for ${tool.slug}: ${routeFile}`);
    assert(packageScripts['verify:print-share-tools'] === 'node scripts/verification/verify-print-share-tools.js', 'verify:print-share-tools must run node scripts/verification/verify-print-share-tools.js');
    assertIncludes(features, `${tool.featureFlag}: true`, `${tool.slug} feature flag`);

    const route = read(routeFile);
    assertIncludes(route, `path="${routePath}"`, `${tool.slug} structured data path`);
    assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', `${tool.slug} public tools family feature flag route guard`);
    assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_ASSET_TOOLS', `${tool.slug} public asset tools feature flag route guard`);
    assertIncludes(route, `FEATURE_FLAGS.${tool.featureFlag}`, `${tool.slug} feature flag route guard`);

    assertIncludes(discoveryPolicy, `path: '${routePath}'`, `${tool.slug} discovery policy`);
    assertIncludes(sitemap, `https://menulist.ai${routePath}`, `${tool.slug} sitemap`);
    assertIncludes(llms, `https://menulist.ai${routePath}`, `${tool.slug} llms.txt`);
    assertIncludes(llmsFull, `https://menulist.ai${routePath}`, `${tool.slug} llms-full.txt`);
    assertIncludes(toolsReadme, '[print-share-tools](./print-share-tools/README.md)', `${tool.slug} MenuList Tools README family link`);

    assertIncludes(toolsHubComponent, `href: '${routePath}'`, `${tool.slug} Tools Hub route`);
    assertIncludes(toolsHubComponent, `key: '${tool.key}'`, `${tool.slug} Tools Hub key`);
    assertIncludes(toolsHubVerifier, routePath, `${tool.slug} Tools Hub verifier route`);
    assertIncludes(toolsHubVerifier, tool.key, `${tool.slug} Tools Hub verifier key`);
    assertIncludes(shareableVerifier, 'src/components/website/printShareTools/PrintShareToolPage.tsx', `${tool.slug} shareable report source component`);

    assert(enUS.Website.ToolsHubPage?.tools?.[tool.key], `en-US Tools Hub ${tool.key} locale card must exist`);
    assert(hiIN.Website.ToolsHubPage?.tools?.[tool.key], `hi-IN Tools Hub ${tool.key} locale card must exist`);
    assert(enUS.Website.PrintShareToolPage?.tools?.[tool.slug], `en-US PrintShareToolPage ${tool.slug} locale must exist`);
    assert(hiIN.Website.PrintShareToolPage?.tools?.[tool.slug], `hi-IN PrintShareToolPage ${tool.slug} locale must exist`);
  }

  console.log(`MenuList public tools inventory verification passed (${PUBLIC_TOOL_MANIFEST.length} truth tools, ${PUBLIC_ASSET_TOOL_MANIFEST.length} asset tools)`);
}

assertPublicToolInventoryBoundary();

for (const verifier of VERIFIERS) {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'verification', verifier)], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const runtimeResult = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'test:public-truth-tools-runtime'],
  {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  },
);

if (runtimeResult.error) {
  throw runtimeResult.error;
}

if (runtimeResult.status !== 0) {
  process.exit(runtimeResult.status || 1);
}

console.log('Public Truth Tools verification passed');
