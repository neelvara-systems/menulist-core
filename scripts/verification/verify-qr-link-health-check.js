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

const ROUTE_PATH = 'src/app/(website)/tools/qr-link-health-check/page.tsx';
const COMPONENT_PATH = 'src/components/website/qrLinkHealthCheck/QrLinkHealthCheckPage.tsx';
const REPORT_PATH = 'src/lib/public-truth-tools/qrLinkHealthReport.ts';
const TYPES_PATH = 'src/lib/public-truth-tools/qrLinkHealthTypes.ts';
const DOC_ROOT_PATH = '__docs__/menulist-tools/qr-link-health-check';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/qr-link-health-check_spec.md`,
  `${DOC_ROOT_PATH}/qr-link-health-check_impl.md`,
  `${DOC_ROOT_PATH}/qr-link-health-check_marketing.md`,
  `${DOC_ROOT_PATH}/qr-link-health-check_website.md`,
  `${DOC_ROOT_PATH}/qr-link-health-check_helpdoc.md`,
  `${DOC_ROOT_PATH}/qr-link-health-check_firebase.md`,
  `${DOC_ROOT_PATH}/qr-link-health-check_mobile-support.md`,
  `${DOC_ROOT_PATH}/qr-link-health-check_test-cases.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  REPORT_PATH,
  TYPES_PATH,
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `QR Link Health Check file missing: ${file}`);
}

assert(!exists('__docs__/qr-link-health-check'), 'QR Link Health Check docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/qr-link-health-check/report/route.ts'), 'QR Link Health Check must not add a report API route in V0');
assert(!exists('src/app/api/public-truth-tools/qr-link-health-check/route.ts'), 'QR Link Health Check must not add a report API route in V0');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const report = read(REPORT_PATH);
const types = read(TYPES_PATH);
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/qr-link-health-check_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/qr-link-health-check_impl.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/qr-link-health-check_firebase.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/qr-link-health-check_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/qr-link-health-check_test-cases.md`);
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
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_QR_LINK_HEALTH_CHECK: true', 'QR Link Health Check feature flag');
assertIncludes(features, '__docs__/menulist-tools/qr-link-health-check/qr-link-health-check_impl.md', 'QR Link Health Check doc pointer');
assertIncludes(packageJson, '"verify:qr-link-health-check"', 'QR Link Health Check package verifier');

assertIncludes(readmeDoc, '## Version Ladder', 'QR Link Health Check README');
assertIncludes(specDoc, 'The owner can scan the QR with their phone or camera app and paste the opened URL', 'QR Link Health Check paste-only spec');
assertIncludes(specDoc, 'Evidence text', 'QR Link Health Check report evidence contract');
assertIncludes(implDoc, 'evidenceText: string', 'QR Link Health Check implementation evidence contract');
assertIncludes(implDoc, 'Do not add QR image decoding in V0', 'QR Link Health Check decoder boundary');
assertIncludes(firebaseDoc, 'Storage operations | 0', 'QR Link Health Check storage boundary');
assertIncludes(mobileDoc, 'Camera/scan integration | Not implemented', 'QR Link Health Check mobile decoder boundary');
assertIncludes(testCasesDoc, 'No file input', 'QR Link Health Check upload test boundary');
assertIncludes(familyReadmeDoc, '[QR Link Health Check](../qr-link-health-check/README.md)', 'Public Truth Tools family docs');
assertIncludes(familyImplDoc, 'qrLinkHealthReport.ts', 'Public Truth Tools implementation docs');

assertIncludes(route, 'WebsitePageStructuredData', 'QR Link Health Check route structured data');
assertIncludes(route, 'path="/tools/qr-link-health-check"', 'QR Link Health Check structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'QR Link Health Check route feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_QR_LINK_HEALTH_CHECK', 'QR Link Health Check route feature flag');

assertIncludes(component, "useTranslations('Website.QrLinkHealthCheckPage')", 'QR Link Health Check localized copy');
assertIncludes(component, 'buildQrLinkHealthReport(form)', 'QR Link Health Check browser-local report builder');
assertIncludes(component, 'check.evidenceText', 'QR Link Health Check explicit evidence text rendering');
assertIncludes(component, 'href={report.nextAction.href}', 'QR Link Health Check MenuList next action');
assertIncludes(component, "fetch('/api/public/contact'", 'QR Link Health Check consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'QR Link Health Check contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'QR Link Health Check contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'QR Link Health Check contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'QR Link Health Check bounded contact response parsing');
assertIncludes(component, "isAcceptedMenulistPublicContactResponse(result, 'general')", 'QR Link Health Check shaped contact acknowledgement guard');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse', 'QR Link Health Check invalid contact acknowledgement diagnostic helper');
assertIncludes(component, 'TurnstileWidget', 'QR Link Health Check contact handoff security check');
assertNotIncludes(component, '!result?.accepted', 'QR Link Health Check must not accept generic contact accepted flag');
assertIncludes(component, 'copyRuntimeTextToClipboard(reportText)', 'QR Link Health Check report copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'QR Link Health Check report download action');
assertIncludes(component, "trackWebsiteMarketingEvent('qr_link_health_check_completed'", 'QR Link Health Check completion analytics');
assertIncludes(component, "mode: 'self_report'", 'QR Link Health Check input contract');

assertIncludes(types, 'evidenceText: string', 'QR Link Health Check evidence text type');
assertIncludes(types, 'qrImageDecoded: false', 'QR Link Health Check QR decode boundary type');
assertIncludes(types, 'targetPageFetched: false', 'QR Link Health Check target fetch boundary type');
assertIncludes(types, 'externalSourcesFetched: false', 'QR Link Health Check external source boundary type');
assertIncludes(types, 'aiOrSearchChecked: false', 'QR Link Health Check AI/search boundary type');
assertIncludes(types, 'externalPlatformUpdated: false', 'QR Link Health Check external mutation boundary type');
assertIncludes(types, 'rankingPromise: false', 'QR Link Health Check ranking boundary type');

assertIncludes(report, 'qrImageDecoded: false', 'QR Link Health Check report QR decode boundary');
assertIncludes(report, 'targetPageFetched: false', 'QR Link Health Check report target fetch boundary');
assertIncludes(report, 'externalSourcesFetched: false', 'QR Link Health Check report external source boundary');
assertIncludes(report, 'aiOrSearchChecked: false', 'QR Link Health Check report AI/search boundary');
assertIncludes(report, 'externalPlatformUpdated: false', 'QR Link Health Check report external mutation boundary');
assertIncludes(report, 'rankingPromise: false', 'QR Link Health Check report ranking boundary');
assertIncludes(report, 'getQrLinkHealthEvidenceText', 'QR Link Health Check explicit evidence text');
assertIncludes(report, 'The target page was not opened or fetched', 'QR Link Health Check target evidence boundary');
assertIncludes(report, 'QR images are not decoded and target pages are not opened', 'QR Link Health Check QR decode evidence boundary');

for (const content of [route, report, types]) {
  assertNotIncludes(content, 'fetch(', 'QR Link Health Check default runtime');
  assertNotIncludes(content, 'firebase', 'QR Link Health Check default runtime');
  assertNotIncludes(content, 'firestore', 'QR Link Health Check default runtime');
  assertNotIncludes(content, 'addDoc', 'QR Link Health Check default runtime');
  assertNotIncludes(content, 'setDoc', 'QR Link Health Check default runtime');
  assertNotIncludes(content, 'updateDoc', 'QR Link Health Check default runtime');
}

for (const content of [component, route, report, types]) {
  assertNotIncludes(content, 'fetch(form.qrTargetUrl', 'QR Link Health Check external source boundary');
  assertNotIncludes(content, 'fetch(qrTargetUrl', 'QR Link Health Check external source boundary');
  assertNotIncludes(content, 'fetch(input.qrTargetUrl', 'QR Link Health Check external source boundary');
  assertNotIncludes(content, 'fetch(report.', 'QR Link Health Check external source boundary');
  assertNotIncludes(content, 'firebase/firestore', 'QR Link Health Check browser write boundary');
  assertNotIncludes(content, 'addDoc(', 'QR Link Health Check browser write boundary');
  assertNotIncludes(content, 'setDoc(', 'QR Link Health Check browser write boundary');
  assertNotIncludes(content, 'updateDoc(', 'QR Link Health Check browser write boundary');
  assertNotIncludes(content, 'FileReader', 'QR Link Health Check V0 upload boundary');
  assertNotIncludes(content, 'type="file"', 'QR Link Health Check V0 upload boundary');
  assertNotIncludes(content, 'storageRef', 'QR Link Health Check V0 upload boundary');
  assertNotIncludes(content, 'uploadBytes', 'QR Link Health Check V0 upload boundary');
  assertNotIncludes(content, 'jsQR', 'QR Link Health Check V0 decoder boundary');
  assertNotIncludes(content, '@zxing', 'QR Link Health Check V0 decoder boundary');
}

for (const content of [route, component, report, types, llms, llmsFull]) {
  assertNotIncludes(content, 'guaranteed ranking', 'QR Link Health Check claims');
  assertNotIncludes(content, 'guaranteed citation', 'QR Link Health Check claims');
  assertNotIncludes(content, 'guaranteed AI visibility', 'QR Link Health Check claims');
  assertNotIncludes(content, 'scanned your QR', 'QR Link Health Check scan claim');
  assertNotIncludes(content, 'checked your website', 'QR Link Health Check crawl claim');
  assertNotIncludes(content, 'tracked QR scans', 'QR Link Health Check analytics claim');
}

assertIncludes(discoveryPolicy, "path: '/tools/qr-link-health-check'", 'QR Link Health Check discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/qr-link-health-check', 'QR Link Health Check sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/qr-link-health-check', 'QR Link Health Check llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/qr-link-health-check', 'QR Link Health Check llms-full.txt');

assert(enUS.Website?.QrLinkHealthCheckPage, 'en-US QrLinkHealthCheckPage locale keys must exist');
assert(hiIN.Website?.QrLinkHealthCheckPage, 'hi-IN QrLinkHealthCheckPage locale keys must exist');
assert(enUS.Website.QrLinkHealthCheckPage.checks.target_page_inspection, 'en-US target page boundary copy must exist');
assert(hiIN.Website.QrLinkHealthCheckPage.checks.target_page_inspection, 'hi-IN target page boundary copy must exist');
assert(enUS.Website.QrLinkHealthCheckPage.reportActions?.copy, 'en-US report copy key must exist');
assert(enUS.Website.QrLinkHealthCheckPage.handoff?.submit, 'en-US handoff submit key must exist');
assert(hiIN.Website.QrLinkHealthCheckPage.reportActions?.copy, 'hi-IN report copy key must exist');
assert(hiIN.Website.QrLinkHealthCheckPage.handoff?.submit, 'hi-IN handoff submit key must exist');

console.log('QR Link Health Check verification passed');
