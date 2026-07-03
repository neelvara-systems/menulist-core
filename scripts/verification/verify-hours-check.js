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

const ROUTE_PATH = 'src/app/(website)/tools/hours-check/page.tsx';
const COMPONENT_PATH = 'src/components/website/hoursCheck/HoursCheckPage.tsx';
const REPORT_PATH = 'src/lib/public-truth-tools/hoursCheckReport.ts';
const TYPES_PATH = 'src/lib/public-truth-tools/hoursCheckTypes.ts';
const DOC_ROOT_PATH = '__docs__/menulist-tools/hours-check';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/hours-check_spec.md`,
  `${DOC_ROOT_PATH}/hours-check_impl.md`,
  `${DOC_ROOT_PATH}/hours-check_marketing.md`,
  `${DOC_ROOT_PATH}/hours-check_website.md`,
  `${DOC_ROOT_PATH}/hours-check_helpdoc.md`,
  `${DOC_ROOT_PATH}/hours-check_firebase.md`,
  `${DOC_ROOT_PATH}/hours-check_mobile-support.md`,
  `${DOC_ROOT_PATH}/hours-check_test-cases.md`,
  `${DOC_ROOT_PATH}/hours-check_validation.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  REPORT_PATH,
  TYPES_PATH,
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `Hours Check file missing: ${file}`);
}

assert(!exists('__docs__/hours-check'), 'Hours Check docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/hours-check/report/route.ts'), 'Hours Check must not add a report API route in V0');
assert(!exists('src/app/api/public-truth-tools/hours-check/route.ts'), 'Hours Check must not add a report API route in V0');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const report = read(REPORT_PATH);
const types = read(TYPES_PATH);
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/hours-check_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/hours-check_impl.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/hours-check_firebase.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/hours-check_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/hours-check_test-cases.md`);
const validationDoc = read(`${DOC_ROOT_PATH}/hours-check_validation.md`);
const familyReadmeDoc = read('__docs__/menulist-tools/public-truth-tools/README.md');
const familyImplDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_impl.md');
const familyFirebaseDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_firebase.md');
const toolsReadmeDoc = read('__docs__/menulist-tools/README.md');
const features = read('src/config/features.ts');
const discoveryPolicy = read('src/lib/seo/discoveryPolicy.ts');
const sitemap = read('public/sitemap.xml');
const llms = read('public/llms.txt');
const llmsFull = read('public/llms-full.txt');
const packageJson = read('package.json');
const enUS = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
const hiIN = JSON.parse(read('public/locales/menulist.ai/hi-IN.json'));

assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_TOOLS: true', 'Public Truth Tools feature flag');
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_HOURS_CHECK: true', 'Hours Check feature flag');
assertIncludes(features, '__docs__/menulist-tools/hours-check/hours-check_impl.md', 'Hours Check doc pointer');
assertIncludes(packageJson, '"verify:hours-check"', 'Hours Check package verifier');

assertIncludes(readmeDoc, '## Version Ladder', 'Hours Check README');
assertIncludes(specDoc, 'Every row includes `evidenceText`', 'Hours Check report evidence contract');
assertIncludes(specDoc, 'call a holiday calendar API', 'Hours Check holiday API boundary');
assertIncludes(implDoc, 'evidenceText: string', 'Hours Check implementation evidence contract');
assertIncludes(implDoc, 'Do not add Google Business Profile API, Maps API, website crawling, social crawling, holiday calendar API, or AI/search sampling in V0', 'Hours Check provider boundary');
assertIncludes(firebaseDoc, 'Holiday API calls | 0', 'Hours Check holiday API cost boundary');
assertIncludes(firebaseDoc, 'Storage reads | 0', 'Hours Check storage boundary');
assertIncludes(mobileDoc, 'Holiday calendar lookup | Not implemented', 'Hours Check mobile holiday boundary');
assertIncludes(testCasesDoc, 'External verification', 'Hours Check external verification test boundary');
assertIncludes(validationDoc, 'No Google or maps inspection', 'Hours Check validation boundary');
assertIncludes(toolsReadmeDoc, '[hours-check](./hours-check/README.md)', 'MenuList Tools README');
assertIncludes(familyReadmeDoc, '[Hours Check](../hours-check/README.md)', 'Public Truth Tools family docs');
assertIncludes(familyImplDoc, 'hoursCheckReport.ts', 'Public Truth Tools implementation docs');
assertIncludes(familyFirebaseDoc, 'Hours Check', 'Public Truth Tools Firebase docs');

assertIncludes(route, 'WebsitePageStructuredData', 'Hours Check route structured data');
assertIncludes(route, 'path="/tools/hours-check"', 'Hours Check structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'Hours Check route feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_HOURS_CHECK', 'Hours Check route feature flag');

assertIncludes(component, "useTranslations('Website.HoursCheckPage')", 'Hours Check localized copy');
assertIncludes(component, 'buildHoursCheckReport(form)', 'Hours Check browser-local report builder');
assertIncludes(component, 'check.evidenceText', 'Hours Check explicit evidence text rendering');
assertIncludes(component, 'href={report.nextAction.href}', 'Hours Check MenuList next action');
assertIncludes(component, "fetch('/api/public/contact'", 'Hours Check consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'Hours Check contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'Hours Check contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'Hours Check contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'Hours Check bounded contact response parsing');
assertIncludes(component, "isAcceptedMenulistPublicContactResponse(result, 'general')", 'Hours Check shaped contact acknowledgement guard');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse', 'Hours Check invalid contact acknowledgement diagnostic helper');
assertIncludes(component, 'TurnstileWidget', 'Hours Check contact handoff security check');
assertNotIncludes(component, '!result?.accepted', 'Hours Check must not accept generic contact accepted flag');
assertIncludes(component, 'copyRuntimeTextToClipboard(reportText)', 'Hours Check report copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'Hours Check report download action');
assertIncludes(component, "trackWebsiteMarketingEvent('hours_check_completed'", 'Hours Check completion analytics');
assertIncludes(component, "mode: 'self_report'", 'Hours Check input contract');

assertIncludes(types, 'evidenceText: string', 'Hours Check evidence text type');
assertIncludes(types, 'externalUrlFetched: false', 'Hours Check URL fetch boundary type');
assertIncludes(types, 'googleProfileInspected: false', 'Hours Check Google boundary type');
assertIncludes(types, 'holidayCalendarFetched: false', 'Hours Check holiday boundary type');
assertIncludes(types, 'reportStored: false', 'Hours Check storage boundary type');
assertIncludes(types, 'externalPlatformUpdated: false', 'Hours Check external mutation boundary type');
assertIncludes(types, 'aiOrSearchChecked: false', 'Hours Check AI/search boundary type');
assertIncludes(types, 'rankingPromise: false', 'Hours Check ranking boundary type');

assertIncludes(report, 'externalUrlFetched: false', 'Hours Check report URL fetch boundary');
assertIncludes(report, 'googleProfileInspected: false', 'Hours Check report Google boundary');
assertIncludes(report, 'holidayCalendarFetched: false', 'Hours Check report holiday boundary');
assertIncludes(report, 'reportStored: false', 'Hours Check report storage boundary');
assertIncludes(report, 'externalPlatformUpdated: false', 'Hours Check report external mutation boundary');
assertIncludes(report, 'aiOrSearchChecked: false', 'Hours Check report AI/search boundary');
assertIncludes(report, 'rankingPromise: false', 'Hours Check report ranking boundary');
assertIncludes(report, 'getHoursEvidenceText', 'Hours Check explicit evidence text');
assertIncludes(report, 'The URL was not opened or fetched', 'Hours Check URL evidence boundary');
assertIncludes(report, 'Google, maps, websites, holiday calendars, and AI/search answers were not inspected', 'Hours Check external inspection evidence boundary');

for (const content of [route, report, types]) {
  assertNotIncludes(content, 'fetch(', 'Hours Check default runtime');
  assertNotIncludes(content, 'firebase', 'Hours Check default runtime');
  assertNotIncludes(content, 'firestore', 'Hours Check default runtime');
  assertNotIncludes(content, 'addDoc', 'Hours Check default runtime');
  assertNotIncludes(content, 'setDoc', 'Hours Check default runtime');
  assertNotIncludes(content, 'updateDoc', 'Hours Check default runtime');
}

for (const content of [component, route, report, types]) {
  assertNotIncludes(content, 'fetch(form.currentCustomerLink', 'Hours Check external source boundary');
  assertNotIncludes(content, 'fetch(currentCustomerLink', 'Hours Check external source boundary');
  assertNotIncludes(content, 'fetch(input.currentCustomerLink', 'Hours Check external source boundary');
  assertNotIncludes(content, 'fetch(report.', 'Hours Check external source boundary');
  assertNotIncludes(content, 'firebase/firestore', 'Hours Check browser write boundary');
  assertNotIncludes(content, 'addDoc(', 'Hours Check browser write boundary');
  assertNotIncludes(content, 'setDoc(', 'Hours Check browser write boundary');
  assertNotIncludes(content, 'updateDoc(', 'Hours Check browser write boundary');
  assertNotIncludes(content, 'FileReader', 'Hours Check V0 upload boundary');
  assertNotIncludes(content, 'type="file"', 'Hours Check V0 upload boundary');
  assertNotIncludes(content, 'storageRef', 'Hours Check V0 upload boundary');
  assertNotIncludes(content, 'uploadBytes', 'Hours Check V0 upload boundary');
  assertNotIncludes(content, 'openai', 'Hours Check V0 AI boundary');
  assertNotIncludes(content, '@googlemaps', 'Hours Check Google boundary');
  assertNotIncludes(content, 'googleapis', 'Hours Check Google boundary');
  assertNotIncludes(content, 'holidayapi', 'Hours Check holiday API boundary');
  assertNotIncludes(content, 'calendarific', 'Hours Check holiday API boundary');
  assertNotIncludes(content, 'window.open', 'Hours Check must not open external links');
  assertNotIncludes(content, 'location.href', 'Hours Check must not navigate to external links');
  assertNotIncludes(content, 'location.assign', 'Hours Check must not navigate to external links');
}

for (const content of [route, component, report, types, llms, llmsFull]) {
  assertNotIncludes(content, 'guaranteed ranking', 'Hours Check claims');
  assertNotIncludes(content, 'guaranteed citation', 'Hours Check claims');
  assertNotIncludes(content, 'guaranteed AI visibility', 'Hours Check claims');
  assertNotIncludes(content, 'verified your Google', 'Hours Check verification claim');
  assertNotIncludes(content, 'scanned your website', 'Hours Check crawl claim');
  assertNotIncludes(content, 'updated your Google', 'Hours Check external mutation claim');
}

assertIncludes(discoveryPolicy, "path: '/tools/hours-check'", 'Hours Check discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/hours-check', 'Hours Check sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/hours-check', 'Hours Check llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/hours-check', 'Hours Check llms-full.txt');

assert(enUS.Website?.HoursCheckPage, 'en-US HoursCheckPage locale keys must exist');
assert(hiIN.Website?.HoursCheckPage, 'hi-IN HoursCheckPage locale keys must exist');
assert(enUS.Website.HoursCheckPage.checks.external_hours_verification, 'en-US external verification boundary copy must exist');
assert(hiIN.Website.HoursCheckPage.checks.external_hours_verification, 'hi-IN external verification boundary copy must exist');
assert(enUS.Website.HoursCheckPage.reportActions?.copy, 'en-US report copy key must exist');
assert(enUS.Website.HoursCheckPage.handoff?.submit, 'en-US handoff submit key must exist');
assert(hiIN.Website.HoursCheckPage.reportActions?.copy, 'hi-IN report copy key must exist');
assert(hiIN.Website.HoursCheckPage.handoff?.submit, 'hi-IN handoff submit key must exist');

console.log('Hours Check verification passed');
