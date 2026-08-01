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

const ROUTE_PATH = 'src/app/(website)/tools/public-truth-check/page.tsx';
const COMPONENT_PATH = 'src/components/website/publicTruthCheck/PublicTruthCheckPage.tsx';
const REPORT_PATH = 'src/lib/public-truth-tools/publicTruthCheckReport.ts';
const TYPES_PATH = 'src/lib/public-truth-tools/publicTruthCheckTypes.ts';
const OWNER_REPORT_PATH = 'src/lib/public-truth-tools/ownerPublicTruthReadiness.ts';
const OWNER_HOOK_PATH = 'src/hooks/publicTruthTools/useOwnerPublicTruthReadiness.ts';
const OWNER_DESKTOP_CARD_PATH = 'src/components/templates/main-app/ownerBusinessAssistant/PublicTruthOwnerCheckCard.tsx';
const OWNER_MOBILE_CARD_PATH = 'src/components/mobile/components/MobilePublicTruthOwnerCheckCard.tsx';
const BUSINESS_HEALTH_PAGE_PATH = 'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthPage.tsx';
const MOBILE_BUSINESS_HEALTH_SCREEN_PATH = 'src/components/mobile/screens/MobileBusinessHealthScreen.tsx';
const BUSINESS_SETTINGS_PATH = 'src/components/templates/main-app/businessSettings/index.tsx';
const PROJECTS_PAGE_PATH = 'src/components/templates/main-app/projects/index.tsx';
const USE_MENULIST_PATH = 'src/components/templates/main-app/useMenuList/index.tsx';
const MOBILE_SHELL_PATH = 'src/components/mobile/MobileShell.tsx';
const MOBILE_MORE_SCREEN_PATH = 'src/components/mobile/screens/MobileMoreScreen.tsx';
const DOC_ROOT_PATH = '__docs__/menulist-tools';
const TOOLS_DOC_PATH = `${DOC_ROOT_PATH}/public-truth-tools/README.md`;
const CHECK_DOC_PATH = `${DOC_ROOT_PATH}/public-truth-check/README.md`;
const CHECK_SPEC_DOC_PATH = `${DOC_ROOT_PATH}/public-truth-check/public-truth-check_spec.md`;
const CHECK_IMPL_DOC_PATH = `${DOC_ROOT_PATH}/public-truth-check/public-truth-check_impl.md`;
const CHECK_FIREBASE_DOC_PATH = `${DOC_ROOT_PATH}/public-truth-check/public-truth-check_firebase.md`;
const CHECK_VALIDATION_DOC_PATH = `${DOC_ROOT_PATH}/public-truth-check/public-truth-check_validation.md`;
const TOOLS_IMPL_DOC_PATH = `${DOC_ROOT_PATH}/public-truth-tools/public-truth-tools_impl.md`;
const TOOLS_TEST_CASES_DOC_PATH = `${DOC_ROOT_PATH}/public-truth-tools/public-truth-tools_test-cases.md`;
const TOOL_INTAKE_DOC_PATH = `${DOC_ROOT_PATH}/tool-intake-template.md`;
const REQUIRED_CHECK_DOCS = [
  `${DOC_ROOT_PATH}/public-truth-check/README.md`,
  `${DOC_ROOT_PATH}/public-truth-check/public-truth-check_spec.md`,
  `${DOC_ROOT_PATH}/public-truth-check/public-truth-check_impl.md`,
  `${DOC_ROOT_PATH}/public-truth-check/public-truth-check_marketing.md`,
  `${DOC_ROOT_PATH}/public-truth-check/public-truth-check_website.md`,
  `${DOC_ROOT_PATH}/public-truth-check/public-truth-check_helpdoc.md`,
  `${DOC_ROOT_PATH}/public-truth-check/public-truth-check_firebase.md`,
  `${DOC_ROOT_PATH}/public-truth-check/public-truth-check_mobile-support.md`,
  `${DOC_ROOT_PATH}/public-truth-check/public-truth-check_test-cases.md`,
  `${DOC_ROOT_PATH}/public-truth-check/public-truth-check_validation.md`,
];
const REQUIRED_TOOLS_DOCS = [
  `${DOC_ROOT_PATH}/public-truth-tools/README.md`,
  `${DOC_ROOT_PATH}/public-truth-tools/public-truth-tools_spec.md`,
  `${DOC_ROOT_PATH}/public-truth-tools/public-truth-tools_impl.md`,
  `${DOC_ROOT_PATH}/public-truth-tools/public-truth-tools_marketing.md`,
  `${DOC_ROOT_PATH}/public-truth-tools/public-truth-tools_website.md`,
  `${DOC_ROOT_PATH}/public-truth-tools/public-truth-tools_helpdoc.md`,
  `${DOC_ROOT_PATH}/public-truth-tools/public-truth-tools_firebase.md`,
  `${DOC_ROOT_PATH}/public-truth-tools/public-truth-tools_mobile-support.md`,
  `${DOC_ROOT_PATH}/public-truth-tools/public-truth-tools_test-cases.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  REPORT_PATH,
  TYPES_PATH,
  OWNER_REPORT_PATH,
  OWNER_HOOK_PATH,
  OWNER_DESKTOP_CARD_PATH,
  OWNER_MOBILE_CARD_PATH,
  BUSINESS_HEALTH_PAGE_PATH,
  MOBILE_BUSINESS_HEALTH_SCREEN_PATH,
  BUSINESS_SETTINGS_PATH,
  PROJECTS_PAGE_PATH,
  USE_MENULIST_PATH,
  MOBILE_SHELL_PATH,
  MOBILE_MORE_SCREEN_PATH,
  TOOLS_DOC_PATH,
  CHECK_DOC_PATH,
  TOOL_INTAKE_DOC_PATH,
  ...REQUIRED_CHECK_DOCS,
  ...REQUIRED_TOOLS_DOCS,
]) {
  assert(exists(file), `Public Truth Check file missing: ${file}`);
}

assert(!exists('__docs__/public-truth-tools'), 'Public Truth Tools docs must live under __docs__/menulist-tools/');
assert(!exists('__docs__/public-truth-check'), 'Public Truth Check docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/public-truth-check/report/route.ts'), 'Public Truth Check must not add a report API route in V0/V1');
assert(!exists('src/app/api/public-truth-tools/report/route.ts'), 'Public Truth Tools must not add a report API route in V0/V1');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const report = read(REPORT_PATH);
const types = read(TYPES_PATH);
const ownerReport = read(OWNER_REPORT_PATH);
const ownerHook = read(OWNER_HOOK_PATH);
const ownerDesktopCard = read(OWNER_DESKTOP_CARD_PATH);
const ownerMobileCard = read(OWNER_MOBILE_CARD_PATH);
const businessHealthPage = read(BUSINESS_HEALTH_PAGE_PATH);
const mobileBusinessHealthScreen = read(MOBILE_BUSINESS_HEALTH_SCREEN_PATH);
const businessSettings = read(BUSINESS_SETTINGS_PATH);
const projectsPage = read(PROJECTS_PAGE_PATH);
const useMenuList = read(USE_MENULIST_PATH);
const mobileShell = read(MOBILE_SHELL_PATH);
const mobileMoreScreen = read(MOBILE_MORE_SCREEN_PATH);
const toolsDoc = read(TOOLS_DOC_PATH);
const checkDoc = read(CHECK_DOC_PATH);
const checkSpecDoc = read(CHECK_SPEC_DOC_PATH);
const checkImplDoc = read(CHECK_IMPL_DOC_PATH);
const checkFirebaseDoc = read(CHECK_FIREBASE_DOC_PATH);
const checkValidationDoc = read(CHECK_VALIDATION_DOC_PATH);
const toolsImplDoc = read(TOOLS_IMPL_DOC_PATH);
const toolsTestCasesDoc = read(TOOLS_TEST_CASES_DOC_PATH);
const toolIntakeDoc = read(TOOL_INTAKE_DOC_PATH);
const features = read('src/config/features.ts');
const discoveryPolicy = read('src/lib/seo/discoveryPolicy.ts');
const sitemap = read('public/sitemap.xml');
const llms = read('public/llms.txt');
const llmsFull = read('public/llms-full.txt');
const enUS = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
const hiIN = JSON.parse(read('public/locales/menulist.ai/hi-IN.json'));

assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_TOOLS: true', 'Public Truth Tools feature flag');
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_CHECK: true', 'Public Truth Check feature flag');
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_OWNER_CHECK: true', 'Public Truth owner check feature flag');
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_CHECK_EXTERNAL_ADAPTERS: false', 'External adapter feature flag');
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_CHECK_AI_READABILITY: false', 'AI readability feature flag');
assertIncludes(features, '__docs__/menulist-tools/public-truth-tools/public-truth-tools_impl.md', 'Public Truth Tools doc pointer');
assertIncludes(features, '__docs__/menulist-tools/public-truth-check/public-truth-check_impl.md', 'Public Truth Check doc pointer');

assertIncludes(toolsDoc, '## Growth Ladder', 'Public Truth Tools documentation namespace');
assertIncludes(checkDoc, '## Version Ladder', 'Public Truth Check documentation namespace');
assertIncludes(checkDoc, 'exact V1 owner fix targets', 'Public Truth Check owner fix target documentation');
assertIncludes(toolIntakeDoc, '## 2. V0/V1/V2 Lane', 'MenuList tool intake template');
assertIncludes(checkSpecDoc, 'V0 does not store uploaded files', 'Public Truth Check V0 upload-storage boundary');
assertIncludes(checkSpecDoc, 'explicit evidence text for every row', 'Public Truth Check report evidence contract');
assertIncludes(checkImplDoc, 'evidenceText: string', 'Public Truth Check implementation evidence contract');
assertIncludes(checkImplDoc, 'V1 Exact Fix Targets', 'Public Truth Check implementation fix target contract');
assertIncludes(checkImplDoc, 'no uploaded-file storage exists in V0', 'Public Truth Check implementation upload-storage verifier gate');
assertIncludes(checkFirebaseDoc, 'V0 does not store uploaded files', 'Public Truth Check Firebase upload-storage boundary');
assertIncludes(checkFirebaseDoc, 'navigation-only', 'Public Truth Check Firebase fix-target cost boundary');
assertIncludes(checkValidationDoc, 'eighteen read-only module rows', 'Public Truth Check V1 validation module boundary');
assertIncludes(checkValidationDoc, 'Owner report derives setup jobs', 'Public Truth Check V1 setup job validation');
assertIncludes(checkValidationDoc, 'Desktop Business Health renders fix list', 'Public Truth Check desktop setup job validation');
assertIncludes(checkValidationDoc, 'Mobile Business Health renders fix list', 'Public Truth Check mobile setup job validation');
assertIncludes(checkValidationDoc, 'Mobile rows route through shell callbacks', 'Public Truth Check validation fix-target boundary');
assertIncludes(checkValidationDoc, 'No V1 report storage', 'Public Truth Check V1 validation storage boundary');
assertIncludes(toolsImplDoc, 'not part of Public Truth Check V0', 'Public Truth Tools upload source policy boundary');
assertIncludes(toolsImplDoc, 'Owner Fix Target Contract', 'Public Truth Tools owner fix target contract');
assertIncludes(toolsTestCasesDoc, 'Not allowed in Public Truth Check V0', 'Public Truth Tools upload source policy test');
assertIncludes(toolsTestCasesDoc, 'PTT-020', 'Public Truth Tools owner fix target test');

assertIncludes(route, 'WebsitePageStructuredData', 'Public Truth Check route structured data');
assertIncludes(route, 'path="/tools/public-truth-check"', 'Public Truth Check structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'Public Truth Check route feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_CHECK', 'Public Truth Check route feature flag');

assertIncludes(component, "useTranslations('Website.PublicTruthCheckPage')", 'Public Truth Check localized copy');
assertIncludes(component, 'buildPublicTruthCheckReport(form)', 'Public Truth Check browser-local report builder');
assertIncludes(component, 'check.evidenceText', 'Public Truth Check explicit evidence text rendering');
assertIncludes(component, 'href={report.nextAction.href}', 'Public Truth Check MenuList next action');
assertIncludes(component, "fetch('/api/public/contact'", 'Public Truth Check consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'Public Truth Check contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'Public Truth Check contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'Public Truth Check contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'Public Truth Check bounded contact response parsing');
assertIncludes(component, "isAcceptedMenulistPublicContactResponse(result, 'general')", 'Public Truth Check shaped contact acknowledgement guard');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse', 'Public Truth Check invalid contact acknowledgement diagnostic helper');
assertIncludes(component, 'TurnstileWidget', 'Public Truth Check contact handoff security check');
assertNotIncludes(component, '!result?.accepted', 'Public Truth Check must not accept generic contact accepted flag');
assertIncludes(component, 'copyRuntimeTextToClipboard(reportText)', 'Public Truth Check report copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'Public Truth Check report download action');
assertIncludes(component, "trackWebsiteMarketingEvent('public_truth_check_completed'", 'Public Truth Check completion analytics');

assertIncludes(ownerReport, "mode: 'menulist_owner'", 'Public Truth Check owner report mode');
assertIncludes(ownerReport, 'OwnerPublicTruthReadinessModule', 'Public Truth Check owner module contract');
assertIncludes(ownerReport, 'OwnerPublicTruthSetupJob', 'Public Truth Check owner setup job contract');
assertIncludes(ownerReport, 'OWNER_PUBLIC_TRUTH_MAX_SETUP_JOBS = 6', 'Public Truth Check owner setup job cap');
assertIncludes(ownerReport, 'buildOwnerPublicTruthSetupJobList', 'Public Truth Check owner setup job builder');
assertIncludes(ownerReport, "'public_truth_basics'", 'Public Truth Check owner basics module');
assertIncludes(ownerReport, "'qr_link_health'", 'Public Truth Check owner QR module');
assertIncludes(ownerReport, "'menu_service_readability'", 'Public Truth Check owner menu readability module');
assertIncludes(ownerReport, "'price_availability_gap'", 'Public Truth Check owner price availability module');
assertIncludes(ownerReport, "'menu_pdf_cleanup'", 'Public Truth Check owner PDF cleanup module');
assertIncludes(ownerReport, "'whatsapp_action_link'", 'Public Truth Check owner WhatsApp action module');
assertIncludes(ownerReport, "'hours_readiness'", 'Public Truth Check owner hours module');
assertIncludes(ownerReport, "'photo_visual_identity'", 'Public Truth Check owner photo module');
assertIncludes(ownerReport, "'customer_question_coverage'", 'Public Truth Check owner customer question module');
assertIncludes(ownerReport, "'booking_inquiry_readiness'", 'Public Truth Check owner booking inquiry module');
assertIncludes(ownerReport, "'google_profile_handoff'", 'Public Truth Check owner Google profile handoff module');
assertIncludes(ownerReport, "'menu_freshness'", 'Public Truth Check owner menu freshness module');
assertIncludes(ownerReport, 'getMenuFreshnessEvidenceText', 'Public Truth Check owner menu freshness evidence');
assertIncludes(ownerReport, 'Google was not scanned', 'Public Truth Check owner Google boundary copy');
assertIncludes(ownerReport, 'modules,', 'Public Truth Check owner report modules field');
assertIncludes(ownerReport, 'setupJobList,', 'Public Truth Check owner report setup job field');
assertIncludes(ownerReport, 'mobileFixTarget:', 'Public Truth Check owner mobile fix target contract');
assertIncludes(ownerReport, 'buildBusinessSettingsFixHref', 'Public Truth Check owner Business Settings deep-link builder');
assertIncludes(ownerReport, 'buildProjectFixHref', 'Public Truth Check owner project deep-link builder');
assertIncludes(ownerReport, "'/qr-code?focus=qr'", 'Public Truth Check owner QR deep link');
assertIncludes(ownerReport, "'domain_settings'", 'Public Truth Check owner mobile domain target');
assertIncludes(ownerReport, "'menu_tab'", 'Public Truth Check owner mobile menu target');
assertIncludes(ownerReport, "'official_page'", 'Public Truth Check owner mobile official page target');
assertIncludes(ownerReport, "'hours_edit'", 'Public Truth Check owner mobile hours target');
assertIncludes(ownerReport, "'presence_monitor'", 'Public Truth Check owner mobile presence target');
assertIncludes(ownerReport, "'share_tab'", 'Public Truth Check owner mobile share target');
assertIncludes(ownerReport, 'getOwnerEvidenceText', 'Public Truth Check owner explicit evidence text');
assertIncludes(ownerReport, 'evaluatePublicTruthIndexability', 'Public Truth Check owner index gate reuse');
assertIncludes(ownerReport, 'generateOBPUrl', 'Public Truth Check owner OBP URL reuse');
assertIncludes(ownerReport, 'generateProjectUrl', 'Public Truth Check owner project URL reuse');
assertIncludes(ownerReport, 'externalSourcesFetched: false', 'Public Truth Check owner external source boundary');
assertIncludes(ownerReport, 'aiOrSearchChecked: false', 'Public Truth Check owner AI/search boundary');
assertIncludes(ownerReport, 'rankingPromise: false', 'Public Truth Check owner ranking boundary');
assertIncludes(ownerHook, 'getExistingProjectsListWithoutLoader(true)', 'Public Truth Check owner project summary DAL read');
assertIncludes(ownerHook, 'getProjectDataWithoutLoader', 'Public Truth Check owner selected project DAL read');
assertIncludes(ownerHook, "['businessHealthProjectScope', tenantId, storeId]", 'Public Truth Check owner summary read cache sharing');
assertIncludes(ownerHook, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_OWNER_CHECK', 'Public Truth Check owner feature flag gate');
assertIncludes(ownerDesktopCard, 'External platforms stay owner-confirmed', 'Public Truth Check desktop boundary copy');
assertIncludes(ownerDesktopCard, 'check.evidenceText', 'Public Truth Check desktop explicit evidence text');
assertIncludes(ownerDesktopCard, 'report.modules.map', 'Public Truth Check desktop module summary');
assertIncludes(ownerDesktopCard, 'report.setupJobList', 'Public Truth Check desktop setup job list');
assertIncludes(ownerDesktopCard, 'Next public fixes', 'Public Truth Check desktop setup job copy');
assertIncludes(ownerDesktopCard, 'job.fixHref', 'Public Truth Check desktop setup job fix path');
assertIncludes(ownerDesktopCard, 'job.actionLabel', 'Public Truth Check desktop setup job action label');
assertIncludes(ownerDesktopCard, 'module.fixHref', 'Public Truth Check desktop module fix path');
assertIncludes(ownerDesktopCard, 'module.actionLabel', 'Public Truth Check desktop module action label');
assertIncludes(ownerDesktopCard, 'moduleAction = report.modules.find', 'Public Truth Check desktop primary action uses module fix path');
assertIncludes(ownerDesktopCard, 'section=business-profile&focus=identity', 'Public Truth Check desktop business identity deep link');
assertIncludes(ownerDesktopCard, 'section=search-discovery&focus=customer-link', 'Public Truth Check desktop customer link deep link');
assertIncludes(ownerDesktopCard, 'view=editor&focus=menu-readiness&qualityAction=prices', 'Public Truth Check desktop project quality deep link');
assertIncludes(ownerDesktopCard, 'Official customer source', 'Public Truth Check desktop owner title');
assertIncludes(ownerMobileCard, 'External platforms stay owner-confirmed', 'Public Truth Check mobile boundary copy');
assertIncludes(ownerMobileCard, 'check.evidenceText', 'Public Truth Check mobile explicit evidence text');
assertIncludes(ownerMobileCard, 'report.modules.map', 'Public Truth Check mobile module summary');
assertIncludes(ownerMobileCard, 'report?.setupJobList', 'Public Truth Check mobile setup job list');
assertIncludes(ownerMobileCard, 'Next public fixes', 'Public Truth Check mobile setup job copy');
assertIncludes(ownerMobileCard, 'job.mobileFixTarget', 'Public Truth Check mobile setup job target');
assertIncludes(ownerMobileCard, 'job.actionLabel', 'Public Truth Check mobile setup job action label');
assertIncludes(ownerMobileCard, 'onFixTarget', 'Public Truth Check mobile module action callback');
assertIncludes(ownerMobileCard, 'module.mobileFixTarget', 'Public Truth Check mobile module target use');
assertIncludes(ownerMobileCard, 'module.actionLabel', 'Public Truth Check mobile module action label');
assertIncludes(businessHealthPage, 'useOwnerPublicTruthReadiness', 'Business Health desktop owner check hook');
assertIncludes(businessHealthPage, 'PublicTruthOwnerCheckCard', 'Business Health desktop owner check card');
assertIncludes(mobileBusinessHealthScreen, 'useOwnerPublicTruthReadiness', 'Business Health mobile owner check hook');
assertIncludes(mobileBusinessHealthScreen, 'MobilePublicTruthOwnerCheckCard', 'Business Health mobile owner check card');
assertIncludes(mobileBusinessHealthScreen, 'handlePublicTruthFixTarget', 'Business Health mobile public truth fix handler');
assertIncludes(mobileBusinessHealthScreen, 'onOpenMenuTab?.()', 'Business Health mobile menu-tab fix target');
assertIncludes(mobileBusinessHealthScreen, 'onOpenShareTab?.()', 'Business Health mobile share-tab fix target');
assertIncludes(mobileBusinessHealthScreen, 'onOpenMoreScreen?.(moreTarget)', 'Business Health mobile More-screen fix target');
assertIncludes(mobileShell, 'handleOpenShareTab', 'Mobile shell share-tab callback');
assertIncludes(mobileShell, 'onOpenShareTab={handleOpenShareTab}', 'Mobile shell passes share callback to More');
assertIncludes(mobileMoreScreen, 'onOpenShareTab', 'Mobile More screen accepts share callback');
assertIncludes(mobileMoreScreen, 'onOpenMoreScreen={openSubScreen}', 'Mobile More passes sub-screen callback to Business Health');
assertIncludes(businessSettings, 'BUSINESS_SETTINGS_FOCUS_SECTION', 'Business Settings deep-link section map');
assertIncludes(businessSettings, "searchParams?.get('section')", 'Business Settings section query handling');
assertIncludes(businessSettings, "searchParams?.get('focus')", 'Business Settings focus query handling');
assertIncludes(businessSettings, "'customer-link'", 'Business Settings customer-link focus target');
assertIncludes(businessSettings, "'official-page-actions'", 'Business Settings official page actions focus target');
assertIncludes(businessSettings, 'officialPageActions: createRef<HTMLDivElement>()', 'Business Settings official page actions dedicated focus ref');
assertIncludes(businessSettings, 'actionsScrollRef={publicTruthFocusRefs.current.officialPageActions}', 'Business Settings passes official page actions focus ref');
assertIncludes(businessSettings, "'presence-monitor'", 'Business Settings presence monitor focus target');
assertIncludes(businessSettings, 'officialPagePhotos: createRef<HTMLDivElement>()', 'Business Settings official page photos dedicated focus ref');
assertIncludes(businessSettings, 'photosScrollRef={publicTruthFocusRefs.current.officialPagePhotos}', 'Business Settings passes official page photos focus ref');
assertIncludes(projectsPage, 'useSearchParams', 'Projects deep-link query handling');
assertIncludes(projectsPage, 'qualityActionQuery', 'Projects quality action query handling');
assertIncludes(projectsPage, "focusQuery === 'menu-readiness'", 'Projects menu-readiness focus handling');
assertIncludes(projectsPage, 'setCurrentView(2)', 'Projects deep link opens editor view');
assertIncludes(projectsPage, 'PENDING_QUALITY_ACTION_STORAGE_KEY', 'Projects deep link reuses quality action handoff');
assertIncludes(useMenuList, 'focusQuery', 'Use MenuList focus query handling');
assertIncludes(useMenuList, 'qrSectionRef', 'Use MenuList QR focus ref');
assertIncludes(useMenuList, "focusQuery !== 'qr'", 'Use MenuList QR focus guard');

assertIncludes(types, "externalSourcesFetched: false", 'Public Truth Check boundary type');
assertIncludes(types, "aiOrSearchChecked: false", 'Public Truth Check boundary type');
assertIncludes(types, "rankingPromise: false", 'Public Truth Check boundary type');
assertIncludes(types, 'evidenceText: string', 'Public Truth Check evidence text type');
assertIncludes(report, 'externalSourcesFetched: false', 'Public Truth Check report boundary');
assertIncludes(report, 'aiOrSearchChecked: false', 'Public Truth Check report boundary');
assertIncludes(report, 'rankingPromise: false', 'Public Truth Check report boundary');
assertIncludes(report, 'getSelfReportEvidenceText', 'Public Truth Check self-report explicit evidence text');
assertIncludes(report, 'Public HTTPS URL format was checked locally. The URL was not fetched and no Google profile was inspected.', 'Public Truth Check public HTTPS URL evidence boundary');
assertIncludes(component, "mode: 'self_report'", 'Public Truth Check input contract');

for (const content of [route, report, types]) {
  assertNotIncludes(content, 'fetch(', 'Public Truth Check default runtime');
  assertNotIncludes(content, 'firebase', 'Public Truth Check default runtime');
  assertNotIncludes(content, 'firestore', 'Public Truth Check default runtime');
  assertNotIncludes(content, 'addDoc', 'Public Truth Check default runtime');
  assertNotIncludes(content, 'setDoc', 'Public Truth Check default runtime');
  assertNotIncludes(content, 'updateDoc', 'Public Truth Check default runtime');
}

for (const content of [component, route, report, types]) {
  assertNotIncludes(content, 'fetch(form.publicUrl', 'Public Truth Check external source boundary');
  assertNotIncludes(content, 'fetch(publicUrl', 'Public Truth Check external source boundary');
  assertNotIncludes(content, 'fetch(input.publicUrl', 'Public Truth Check external source boundary');
  assertNotIncludes(content, 'fetch(report.', 'Public Truth Check external source boundary');
  assertNotIncludes(content, 'firebase/firestore', 'Public Truth Check browser write boundary');
  assertNotIncludes(content, 'addDoc(', 'Public Truth Check browser write boundary');
  assertNotIncludes(content, 'setDoc(', 'Public Truth Check browser write boundary');
  assertNotIncludes(content, 'updateDoc(', 'Public Truth Check browser write boundary');
  assertNotIncludes(content, 'FileReader', 'Public Truth Check V0 upload-storage boundary');
  assertNotIncludes(content, 'type="file"', 'Public Truth Check V0 upload-storage boundary');
  assertNotIncludes(content, 'storageRef', 'Public Truth Check V0 upload-storage boundary');
  assertNotIncludes(content, 'uploadBytes', 'Public Truth Check V0 upload-storage boundary');
}

for (const content of [ownerReport, ownerHook, ownerDesktopCard, ownerMobileCard]) {
  assertNotIncludes(content, 'fetch(', 'Public Truth Check owner mode must not fetch external sources');
  assertNotIncludes(content, 'addDoc(', 'Public Truth Check owner mode must not write report state');
  assertNotIncludes(content, 'setDoc(', 'Public Truth Check owner mode must not write report state');
  assertNotIncludes(content, 'updateDoc(', 'Public Truth Check owner mode must not write report state');
  assertNotIncludes(content, 'deleteDoc(', 'Public Truth Check owner mode must not write report state');
  assertNotIncludes(content, 'platformSummary/publicTruthTools_', 'Public Truth Check owner mode must not persist V2 history');
}

for (const content of [route, component, report, types, llms, llmsFull]) {
  assertNotIncludes(content, 'guaranteed ranking', 'Public Truth Check claims');
  assertNotIncludes(content, 'guaranteed citation', 'Public Truth Check claims');
  assertNotIncludes(content, 'guaranteed AI visibility', 'Public Truth Check claims');
}

assertIncludes(discoveryPolicy, "path: '/tools/public-truth-check'", 'Public Truth Check discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/public-truth-check', 'Public Truth Check sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/public-truth-check', 'Public Truth Check llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/public-truth-check', 'Public Truth Check llms-full.txt');

assert(enUS.Website?.PublicTruthCheckPage, 'en-US PublicTruthCheckPage locale keys must exist');
assert(hiIN.Website?.PublicTruthCheckPage, 'hi-IN PublicTruthCheckPage locale keys must exist');
assert(enUS.Website.PublicTruthCheckPage.checks.machine_readable_source, 'en-US machine-readable boundary copy must exist');
assert(hiIN.Website.PublicTruthCheckPage.checks.machine_readable_source, 'hi-IN machine-readable boundary copy must exist');
assert(enUS.Website.PublicTruthCheckPage.reportActions?.copy, 'en-US report copy key must exist');
assert(enUS.Website.PublicTruthCheckPage.handoff?.submit, 'en-US handoff submit key must exist');
assert(hiIN.Website.PublicTruthCheckPage.reportActions?.copy, 'hi-IN report copy key must exist');
assert(hiIN.Website.PublicTruthCheckPage.handoff?.submit, 'hi-IN handoff submit key must exist');

console.log('Public Truth Check verification passed');
