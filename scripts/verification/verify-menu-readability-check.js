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

const ROUTE_PATH = 'src/app/(website)/tools/menu-readability-check/page.tsx';
const COMPONENT_PATH = 'src/components/website/menuReadabilityCheck/MenuReadabilityCheckPage.tsx';
const REPORT_PATH = 'src/lib/public-truth-tools/menuReadabilityReport.ts';
const TYPES_PATH = 'src/lib/public-truth-tools/menuReadabilityTypes.ts';
const DOC_ROOT_PATH = '__docs__/menulist-tools/menu-readability-check';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/menu-readability-check_spec.md`,
  `${DOC_ROOT_PATH}/menu-readability-check_impl.md`,
  `${DOC_ROOT_PATH}/menu-readability-check_marketing.md`,
  `${DOC_ROOT_PATH}/menu-readability-check_website.md`,
  `${DOC_ROOT_PATH}/menu-readability-check_helpdoc.md`,
  `${DOC_ROOT_PATH}/menu-readability-check_firebase.md`,
  `${DOC_ROOT_PATH}/menu-readability-check_mobile-support.md`,
  `${DOC_ROOT_PATH}/menu-readability-check_test-cases.md`,
  `${DOC_ROOT_PATH}/menu-readability-check_validation.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  REPORT_PATH,
  TYPES_PATH,
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `Menu Readability Check file missing: ${file}`);
}

assert(!exists('__docs__/menu-readability-check'), 'Menu Readability Check docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/menu-readability-check/report/route.ts'), 'Menu Readability Check must not add a report API route in V0');
assert(!exists('src/app/api/public-truth-tools/menu-readability-check/route.ts'), 'Menu Readability Check must not add a report API route in V0');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const report = read(REPORT_PATH);
const types = read(TYPES_PATH);
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/menu-readability-check_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/menu-readability-check_impl.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/menu-readability-check_firebase.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/menu-readability-check_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/menu-readability-check_test-cases.md`);
const validationDoc = read(`${DOC_ROOT_PATH}/menu-readability-check_validation.md`);
const familyReadmeDoc = read('__docs__/menulist-tools/public-truth-tools/README.md');
const familyImplDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_impl.md');
const features = read('src/config/features.ts');
const discoveryPolicy = read('src/lib/seo/discoveryPolicy.ts');
const sitemap = read('public/sitemap.xml');
const llms = read('public/llms.txt');
const llmsFull = read('public/llms-full.txt');
const packageJson = read('package.json');
const enUS = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
const hiIN = JSON.parse(read('public/locales/menulist.ai/hi-IN.json'));

assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_TOOLS: true', 'Public Truth Tools feature flag');
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_MENU_READABILITY_CHECK: true', 'Menu Readability Check feature flag');
assertIncludes(features, '__docs__/menulist-tools/menu-readability-check/menu-readability-check_impl.md', 'Menu Readability Check doc pointer');
assertIncludes(packageJson, '"verify:menu-readability-check"', 'Menu Readability Check package verifier');

assertIncludes(readmeDoc, '## Version Ladder', 'Menu Readability Check README');
assertIncludes(specDoc, 'V0 does not store uploaded files', 'Menu Readability Check upload-storage boundary');
assertIncludes(specDoc, 'Evidence text', 'Menu Readability Check report evidence contract');
assertIncludes(implDoc, 'evidenceText: string', 'Menu Readability Check implementation evidence contract');
assertIncludes(implDoc, 'Do not add file upload, PDF parsing, OCR, or AI rewrite in V0', 'Menu Readability Check upload/AI boundary');
assertIncludes(firebaseDoc, 'Storage operations | 0', 'Menu Readability Check storage boundary');
assertIncludes(mobileDoc, 'File upload | Not implemented', 'Menu Readability Check mobile upload boundary');
assertIncludes(testCasesDoc, 'No file input', 'Menu Readability Check upload test boundary');
assertIncludes(validationDoc, 'V0 validation evidence; not current launch certification', 'Menu Readability Check validation launch boundary');
assertIncludes(validationDoc, 'Current release approval still requires the active production-readiness audit', 'Menu Readability Check validation release boundary');
assertIncludes(validationDoc, 'npm run verify:menu-readability-check', 'Menu Readability Check validation source gate');
assertNotIncludes(validationDoc, '**Status:** Ready for testing', 'Menu Readability Check stale ready-for-testing status');
assertNotIncludes(validationDoc, 'Ready for testing after:', 'Menu Readability Check stale ready-for-testing verdict');
assertIncludes(familyReadmeDoc, '[Menu Readability Check](../menu-readability-check/README.md)', 'Public Truth Tools family docs');
assertIncludes(familyImplDoc, 'menuReadabilityReport.ts', 'Public Truth Tools implementation docs');

assertIncludes(route, 'WebsitePageStructuredData', 'Menu Readability Check route structured data');
assertIncludes(route, 'path="/tools/menu-readability-check"', 'Menu Readability Check structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'Menu Readability Check route feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_MENU_READABILITY_CHECK', 'Menu Readability Check route feature flag');

assertIncludes(component, "useTranslations('Website.MenuReadabilityCheckPage')", 'Menu Readability Check localized copy');
assertIncludes(component, 'buildMenuReadabilityReport(form)', 'Menu Readability Check browser-local report builder');
assertIncludes(component, 'check.evidenceText', 'Menu Readability Check explicit evidence text rendering');
assertIncludes(component, 'href={report.nextAction.href}', 'Menu Readability Check MenuList next action');
assertIncludes(component, "fetch('/api/public/contact'", 'Menu Readability Check consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'Menu Readability Check contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'Menu Readability Check contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'Menu Readability Check contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'Menu Readability Check bounded contact response parsing');
assertIncludes(component, "isAcceptedMenulistPublicContactResponse(result, 'general')", 'Menu Readability Check shaped contact acknowledgement guard');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse', 'Menu Readability Check invalid contact acknowledgement diagnostic helper');
assertIncludes(component, 'TurnstileWidget', 'Menu Readability Check contact handoff security check');
assertNotIncludes(component, '!result?.accepted', 'Menu Readability Check must not accept generic contact accepted flag');
assertIncludes(component, 'copyRuntimeTextToClipboard(reportText)', 'Menu Readability Check report copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'Menu Readability Check report download action');
assertIncludes(component, "trackWebsiteMarketingEvent('menu_readability_check_completed'", 'Menu Readability Check completion analytics');
assertIncludes(component, "mode: 'self_report'", 'Menu Readability Check input contract');

assertIncludes(types, 'evidenceText: string', 'Menu Readability Check evidence text type');
assertIncludes(types, 'uploadedFileParsed: false', 'Menu Readability Check upload boundary type');
assertIncludes(types, 'externalUrlFetched: false', 'Menu Readability Check target fetch boundary type');
assertIncludes(types, 'aiRewriteGenerated: false', 'Menu Readability Check AI rewrite boundary type');
assertIncludes(types, 'aiOrSearchChecked: false', 'Menu Readability Check AI/search boundary type');
assertIncludes(types, 'externalPlatformUpdated: false', 'Menu Readability Check external mutation boundary type');
assertIncludes(types, 'rankingPromise: false', 'Menu Readability Check ranking boundary type');

assertIncludes(report, 'uploadedFileParsed: false', 'Menu Readability Check report upload boundary');
assertIncludes(report, 'externalUrlFetched: false', 'Menu Readability Check report target fetch boundary');
assertIncludes(report, 'aiRewriteGenerated: false', 'Menu Readability Check report AI rewrite boundary');
assertIncludes(report, 'aiOrSearchChecked: false', 'Menu Readability Check report AI/search boundary');
assertIncludes(report, 'externalPlatformUpdated: false', 'Menu Readability Check report external mutation boundary');
assertIncludes(report, 'rankingPromise: false', 'Menu Readability Check report ranking boundary');
assertIncludes(report, 'getMenuReadabilityEvidenceText', 'Menu Readability Check explicit evidence text');
assertIncludes(report, 'URL format was checked locally. The URL was not opened or fetched.', 'Menu Readability Check URL evidence boundary');
assertIncludes(report, 'Files are not uploaded, links are not opened, and AI rewrite is not generated.', 'Menu Readability Check upload/AI evidence boundary');

for (const content of [route, report, types]) {
  assertNotIncludes(content, 'fetch(', 'Menu Readability Check default runtime');
  assertNotIncludes(content, 'firebase', 'Menu Readability Check default runtime');
  assertNotIncludes(content, 'firestore', 'Menu Readability Check default runtime');
  assertNotIncludes(content, 'addDoc', 'Menu Readability Check default runtime');
  assertNotIncludes(content, 'setDoc', 'Menu Readability Check default runtime');
  assertNotIncludes(content, 'updateDoc', 'Menu Readability Check default runtime');
}

for (const content of [component, route, report, types]) {
  assertNotIncludes(content, 'fetch(form.publicUrl', 'Menu Readability Check external source boundary');
  assertNotIncludes(content, 'fetch(publicUrl', 'Menu Readability Check external source boundary');
  assertNotIncludes(content, 'fetch(input.publicUrl', 'Menu Readability Check external source boundary');
  assertNotIncludes(content, 'fetch(report.', 'Menu Readability Check external source boundary');
  assertNotIncludes(content, 'firebase/firestore', 'Menu Readability Check browser write boundary');
  assertNotIncludes(content, 'addDoc(', 'Menu Readability Check browser write boundary');
  assertNotIncludes(content, 'setDoc(', 'Menu Readability Check browser write boundary');
  assertNotIncludes(content, 'updateDoc(', 'Menu Readability Check browser write boundary');
  assertNotIncludes(content, 'FileReader', 'Menu Readability Check V0 upload boundary');
  assertNotIncludes(content, 'type="file"', 'Menu Readability Check V0 upload boundary');
  assertNotIncludes(content, 'storageRef', 'Menu Readability Check V0 upload boundary');
  assertNotIncludes(content, 'uploadBytes', 'Menu Readability Check V0 upload boundary');
  assertNotIncludes(content, 'pdfjs', 'Menu Readability Check V0 PDF boundary');
  assertNotIncludes(content, 'tesseract', 'Menu Readability Check V0 OCR boundary');
  assertNotIncludes(content, 'openai', 'Menu Readability Check V0 AI boundary');
}

for (const content of [route, component, report, types, llms, llmsFull]) {
  assertNotIncludes(content, 'guaranteed ranking', 'Menu Readability Check claims');
  assertNotIncludes(content, 'guaranteed citation', 'Menu Readability Check claims');
  assertNotIncludes(content, 'guaranteed AI visibility', 'Menu Readability Check claims');
  assertNotIncludes(content, 'scanned your website', 'Menu Readability Check crawl claim');
  assertNotIncludes(content, 'read your PDF', 'Menu Readability Check file claim');
  assertNotIncludes(content, 'rewrote your menu', 'Menu Readability Check AI rewrite claim');
}

assertIncludes(discoveryPolicy, "path: '/tools/menu-readability-check'", 'Menu Readability Check discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/menu-readability-check', 'Menu Readability Check sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/menu-readability-check', 'Menu Readability Check llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/menu-readability-check', 'Menu Readability Check llms-full.txt');

assert(enUS.Website?.MenuReadabilityCheckPage, 'en-US MenuReadabilityCheckPage locale keys must exist');
assert(hiIN.Website?.MenuReadabilityCheckPage, 'hi-IN MenuReadabilityCheckPage locale keys must exist');
assert(enUS.Website.MenuReadabilityCheckPage.checks.current_customer_link, 'en-US current customer link copy must exist');
assert(hiIN.Website.MenuReadabilityCheckPage.checks.current_customer_link, 'hi-IN current customer link copy must exist');
assert(enUS.Website.MenuReadabilityCheckPage.reportActions?.copy, 'en-US report copy key must exist');
assert(enUS.Website.MenuReadabilityCheckPage.handoff?.submit, 'en-US handoff submit key must exist');
assert(hiIN.Website.MenuReadabilityCheckPage.reportActions?.copy, 'hi-IN report copy key must exist');
assert(hiIN.Website.MenuReadabilityCheckPage.handoff?.submit, 'hi-IN handoff submit key must exist');

console.log('Menu Readability Check verification passed');
