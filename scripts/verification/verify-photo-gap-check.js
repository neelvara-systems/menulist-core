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

const ROUTE_PATH = 'src/app/(website)/tools/photo-gap-check/page.tsx';
const COMPONENT_PATH = 'src/components/website/photoGapCheck/PhotoGapCheckPage.tsx';
const REPORT_PATH = 'src/lib/public-truth-tools/photoGapCheckReport.ts';
const TYPES_PATH = 'src/lib/public-truth-tools/photoGapCheckTypes.ts';
const DOC_ROOT_PATH = '__docs__/menulist-tools/photo-gap-check';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/photo-gap-check_spec.md`,
  `${DOC_ROOT_PATH}/photo-gap-check_impl.md`,
  `${DOC_ROOT_PATH}/photo-gap-check_marketing.md`,
  `${DOC_ROOT_PATH}/photo-gap-check_website.md`,
  `${DOC_ROOT_PATH}/photo-gap-check_helpdoc.md`,
  `${DOC_ROOT_PATH}/photo-gap-check_firebase.md`,
  `${DOC_ROOT_PATH}/photo-gap-check_mobile-support.md`,
  `${DOC_ROOT_PATH}/photo-gap-check_test-cases.md`,
  `${DOC_ROOT_PATH}/photo-gap-check_validation.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  REPORT_PATH,
  TYPES_PATH,
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `Photo Gap Check file missing: ${file}`);
}

assert(!exists('__docs__/photo-gap-check'), 'Photo Gap Check docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/photo-gap-check/report/route.ts'), 'Photo Gap Check must not add a report API route in V0');
assert(!exists('src/app/api/public-truth-tools/photo-gap-check/route.ts'), 'Photo Gap Check must not add a report API route in V0');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const report = read(REPORT_PATH);
const types = read(TYPES_PATH);
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/photo-gap-check_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/photo-gap-check_impl.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/photo-gap-check_firebase.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/photo-gap-check_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/photo-gap-check_test-cases.md`);
const validationDoc = read(`${DOC_ROOT_PATH}/photo-gap-check_validation.md`);
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
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_PHOTO_GAP_CHECK: true', 'Photo Gap Check feature flag');
assertIncludes(features, '__docs__/menulist-tools/photo-gap-check/photo-gap-check_impl.md', 'Photo Gap Check doc pointer');
assertIncludes(packageJson, '"verify:photo-gap-check"', 'Photo Gap Check package verifier');

assertIncludes(readmeDoc, '## Version Ladder', 'Photo Gap Check README');
assertIncludes(specDoc, 'Every row includes `evidenceText`', 'Photo Gap Check report evidence contract');
assertIncludes(specDoc, 'V0 does not upload, fetch, inspect, store, or analyze images', 'Photo Gap Check image boundary');
assertIncludes(implDoc, 'evidenceText: string', 'Photo Gap Check implementation evidence contract');
assertIncludes(implDoc, 'Do not add file upload, local image parsing, computer vision, Google Business Profile API, Instagram inspection, website crawling, social crawling, or AI/search sampling in V0', 'Photo Gap Check provider boundary');
assertIncludes(firebaseDoc, 'Image uploads | 0', 'Photo Gap Check upload cost boundary');
assertIncludes(firebaseDoc, 'Image analysis calls | 0', 'Photo Gap Check image analysis cost boundary');
assertIncludes(mobileDoc, 'Image upload | Not implemented', 'Photo Gap Check mobile upload boundary');
assertIncludes(testCasesDoc, 'No image analysis', 'Photo Gap Check image analysis test boundary');
assertIncludes(validationDoc, 'No image analysis', 'Photo Gap Check validation boundary');
assertIncludes(toolsReadmeDoc, '[photo-gap-check](./photo-gap-check/README.md)', 'MenuList Tools README');
assertIncludes(familyReadmeDoc, '[Photo Gap Check](../photo-gap-check/README.md)', 'Public Truth Tools family docs');
assertIncludes(familyImplDoc, 'photoGapCheckReport.ts', 'Public Truth Tools implementation docs');
assertIncludes(familyFirebaseDoc, 'Photo Gap Check', 'Public Truth Tools Firebase docs');

assertIncludes(route, 'WebsitePageStructuredData', 'Photo Gap Check route structured data');
assertIncludes(route, 'path="/tools/photo-gap-check"', 'Photo Gap Check structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'Photo Gap Check route feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_PHOTO_GAP_CHECK', 'Photo Gap Check route feature flag');

assertIncludes(component, "useTranslations('Website.PhotoGapCheckPage')", 'Photo Gap Check localized copy');
assertIncludes(component, 'buildPhotoGapCheckReport(form)', 'Photo Gap Check browser-local report builder');
assertIncludes(component, 'check.evidenceText', 'Photo Gap Check explicit evidence text rendering');
assertIncludes(component, 'href={report.nextAction.href}', 'Photo Gap Check MenuList next action');
assertIncludes(component, "fetch('/api/public/contact'", 'Photo Gap Check consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'Photo Gap Check contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'Photo Gap Check contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'Photo Gap Check contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'Photo Gap Check bounded contact response parsing');
assertIncludes(component, "isAcceptedMenulistPublicContactResponse(result, 'general')", 'Photo Gap Check shaped contact acknowledgement guard');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse', 'Photo Gap Check invalid contact acknowledgement diagnostic helper');
assertIncludes(component, 'TurnstileWidget', 'Photo Gap Check contact handoff security check');
assertNotIncludes(component, '!result?.accepted', 'Photo Gap Check must not accept generic contact accepted flag');
assertIncludes(component, 'copyRuntimeTextToClipboard(reportText)', 'Photo Gap Check report copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'Photo Gap Check report download action');
assertIncludes(component, "trackWebsiteMarketingEvent('photo_gap_check_completed'", 'Photo Gap Check completion analytics');
assertIncludes(component, "mode: 'self_report'", 'Photo Gap Check input contract');

assertIncludes(types, 'evidenceText: string', 'Photo Gap Check evidence text type');
assertIncludes(types, 'imageUploaded: false', 'Photo Gap Check upload boundary type');
assertIncludes(types, 'imageAnalyzed: false', 'Photo Gap Check image analysis boundary type');
assertIncludes(types, 'externalUrlFetched: false', 'Photo Gap Check target fetch boundary type');
assertIncludes(types, 'googleProfileInspected: false', 'Photo Gap Check Google boundary type');
assertIncludes(types, 'instagramInspected: false', 'Photo Gap Check Instagram boundary type');
assertIncludes(types, 'reportStored: false', 'Photo Gap Check storage boundary type');
assertIncludes(types, 'externalPlatformUpdated: false', 'Photo Gap Check external mutation boundary type');
assertIncludes(types, 'aiOrSearchChecked: false', 'Photo Gap Check AI/search boundary type');
assertIncludes(types, 'rankingPromise: false', 'Photo Gap Check ranking boundary type');

assertIncludes(report, 'imageUploaded: false', 'Photo Gap Check report upload boundary');
assertIncludes(report, 'imageAnalyzed: false', 'Photo Gap Check report image analysis boundary');
assertIncludes(report, 'externalUrlFetched: false', 'Photo Gap Check report target fetch boundary');
assertIncludes(report, 'googleProfileInspected: false', 'Photo Gap Check report Google boundary');
assertIncludes(report, 'instagramInspected: false', 'Photo Gap Check report Instagram boundary');
assertIncludes(report, 'reportStored: false', 'Photo Gap Check report storage boundary');
assertIncludes(report, 'externalPlatformUpdated: false', 'Photo Gap Check report external mutation boundary');
assertIncludes(report, 'aiOrSearchChecked: false', 'Photo Gap Check report AI/search boundary');
assertIncludes(report, 'rankingPromise: false', 'Photo Gap Check report ranking boundary');
assertIncludes(report, 'getPhotoGapEvidenceText', 'Photo Gap Check explicit evidence text');
assertIncludes(report, 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.', 'Photo Gap Check URL evidence boundary');
assertIncludes(report, 'Images were not uploaded, analyzed, fetched, or inspected on external platforms.', 'Photo Gap Check image inspection evidence boundary');

for (const content of [route, report, types]) {
  assertNotIncludes(content, 'fetch(', 'Photo Gap Check default runtime');
  assertNotIncludes(content, 'firebase', 'Photo Gap Check default runtime');
  assertNotIncludes(content, 'firestore', 'Photo Gap Check default runtime');
  assertNotIncludes(content, 'addDoc', 'Photo Gap Check default runtime');
  assertNotIncludes(content, 'setDoc', 'Photo Gap Check default runtime');
  assertNotIncludes(content, 'updateDoc', 'Photo Gap Check default runtime');
}

for (const content of [component, route, report, types]) {
  assertNotIncludes(content, 'fetch(form.currentCustomerLink', 'Photo Gap Check external source boundary');
  assertNotIncludes(content, 'fetch(currentCustomerLink', 'Photo Gap Check external source boundary');
  assertNotIncludes(content, 'fetch(input.currentCustomerLink', 'Photo Gap Check external source boundary');
  assertNotIncludes(content, 'fetch(report.', 'Photo Gap Check external source boundary');
  assertNotIncludes(content, 'firebase/firestore', 'Photo Gap Check browser write boundary');
  assertNotIncludes(content, 'addDoc(', 'Photo Gap Check browser write boundary');
  assertNotIncludes(content, 'setDoc(', 'Photo Gap Check browser write boundary');
  assertNotIncludes(content, 'updateDoc(', 'Photo Gap Check browser write boundary');
  assertNotIncludes(content, 'FileReader', 'Photo Gap Check V0 upload boundary');
  assertNotIncludes(content, 'type="file"', 'Photo Gap Check V0 upload boundary');
  assertNotIncludes(content, 'storageRef', 'Photo Gap Check V0 upload boundary');
  assertNotIncludes(content, 'uploadBytes', 'Photo Gap Check V0 upload boundary');
  assertNotIncludes(content, 'openai', 'Photo Gap Check V0 AI boundary');
  assertNotIncludes(content, '@google/genai', 'Photo Gap Check V0 AI boundary');
  assertNotIncludes(content, '@googlemaps', 'Photo Gap Check Google boundary');
  assertNotIncludes(content, 'googleapis', 'Photo Gap Check Google boundary');
  assertNotIncludes(content, 'instagram.com', 'Photo Gap Check Instagram boundary');
  assertNotIncludes(content, '@instagram', 'Photo Gap Check Instagram boundary');
  assertNotIncludes(content, 'graph.instagram', 'Photo Gap Check Instagram boundary');
  assertNotIncludes(content, 'vision', 'Photo Gap Check image-analysis boundary');
  assertNotIncludes(content, 'window.open', 'Photo Gap Check must not open external links');
  assertNotIncludes(content, 'location.href', 'Photo Gap Check must not navigate to external links');
  assertNotIncludes(content, 'location.assign', 'Photo Gap Check must not navigate to external links');
}

for (const content of [route, component, report, types, llms, llmsFull]) {
  assertNotIncludes(content, 'guaranteed ranking', 'Photo Gap Check claims');
  assertNotIncludes(content, 'guaranteed citation', 'Photo Gap Check claims');
  assertNotIncludes(content, 'guaranteed AI visibility', 'Photo Gap Check claims');
  assertNotIncludes(content, 'verified your photos', 'Photo Gap Check verification claim');
  assertNotIncludes(content, 'scanned your photos', 'Photo Gap Check scan claim');
  assertNotIncludes(content, 'scanned your website', 'Photo Gap Check crawl claim');
  assertNotIncludes(content, 'updated your Google', 'Photo Gap Check external mutation claim');
}

assertIncludes(discoveryPolicy, "path: '/tools/photo-gap-check'", 'Photo Gap Check discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/photo-gap-check', 'Photo Gap Check sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/photo-gap-check', 'Photo Gap Check llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/photo-gap-check', 'Photo Gap Check llms-full.txt');

assert(enUS.Website?.PhotoGapCheckPage, 'en-US PhotoGapCheckPage locale keys must exist');
assert(hiIN.Website?.PhotoGapCheckPage, 'hi-IN PhotoGapCheckPage locale keys must exist');
assert(enUS.Website.PhotoGapCheckPage.checks.external_photo_verification, 'en-US external photo boundary copy must exist');
assert(hiIN.Website.PhotoGapCheckPage.checks.external_photo_verification, 'hi-IN external photo boundary copy must exist');
assert(enUS.Website.PhotoGapCheckPage.reportActions?.copy, 'en-US report copy key must exist');
assert(enUS.Website.PhotoGapCheckPage.handoff?.submit, 'en-US handoff submit key must exist');
assert(hiIN.Website.PhotoGapCheckPage.reportActions?.copy, 'hi-IN report copy key must exist');
assert(hiIN.Website.PhotoGapCheckPage.handoff?.submit, 'hi-IN handoff submit key must exist');

console.log('Photo Gap Check verification passed');
