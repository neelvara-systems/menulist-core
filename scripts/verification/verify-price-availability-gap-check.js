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

const ROUTE_PATH = 'src/app/(website)/tools/price-availability-gap-check/page.tsx';
const COMPONENT_PATH = 'src/components/website/priceAvailabilityGapCheck/PriceAvailabilityGapCheckPage.tsx';
const REPORT_PATH = 'src/lib/public-truth-tools/priceAvailabilityGapReport.ts';
const TYPES_PATH = 'src/lib/public-truth-tools/priceAvailabilityGapTypes.ts';
const OWNER_REPORT_PATH = 'src/lib/public-truth-tools/ownerPublicTruthReadiness.ts';
const DOC_ROOT_PATH = '__docs__/menulist-tools/price-availability-gap-check';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/price-availability-gap-check_spec.md`,
  `${DOC_ROOT_PATH}/price-availability-gap-check_impl.md`,
  `${DOC_ROOT_PATH}/price-availability-gap-check_marketing.md`,
  `${DOC_ROOT_PATH}/price-availability-gap-check_website.md`,
  `${DOC_ROOT_PATH}/price-availability-gap-check_helpdoc.md`,
  `${DOC_ROOT_PATH}/price-availability-gap-check_firebase.md`,
  `${DOC_ROOT_PATH}/price-availability-gap-check_mobile-support.md`,
  `${DOC_ROOT_PATH}/price-availability-gap-check_test-cases.md`,
  `${DOC_ROOT_PATH}/price-availability-gap-check_validation.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  REPORT_PATH,
  TYPES_PATH,
  OWNER_REPORT_PATH,
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `Price Availability Gap Check file missing: ${file}`);
}

assert(!exists('__docs__/price-availability-gap-check'), 'Price Availability Gap Check docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/price-availability-gap-check/report/route.ts'), 'Price Availability Gap Check must not add a report API route in V0');
assert(!exists('src/app/api/public-truth-tools/price-availability-gap-check/route.ts'), 'Price Availability Gap Check must not add a report API route in V0');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const report = read(REPORT_PATH);
const types = read(TYPES_PATH);
const ownerReport = read(OWNER_REPORT_PATH);
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/price-availability-gap-check_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/price-availability-gap-check_impl.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/price-availability-gap-check_firebase.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/price-availability-gap-check_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/price-availability-gap-check_test-cases.md`);
const validationDoc = read(`${DOC_ROOT_PATH}/price-availability-gap-check_validation.md`);
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
const aggregateVerifier = read('scripts/verification/verify-public-truth-tools.js');
const enUS = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
const hiIN = JSON.parse(read('public/locales/menulist.ai/hi-IN.json'));

assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_TOOLS: true', 'Public Truth Tools feature flag');
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_PRICE_AVAILABILITY_GAP_CHECK: true', 'Price Availability Gap Check feature flag');
assertIncludes(features, '__docs__/menulist-tools/price-availability-gap-check/price-availability-gap-check_impl.md', 'Price Availability Gap Check doc pointer');
assertIncludes(packageJson, '"verify:price-availability-gap-check"', 'Price Availability Gap Check package verifier');
assertIncludes(aggregateVerifier, 'verify-price-availability-gap-check.js', 'Public Truth Tools aggregate verifier');

assertIncludes(readmeDoc, '## Version Ladder', 'Price Availability Gap Check README');
assertIncludes(specDoc, 'Every row includes `evidenceText`', 'Price Availability Gap Check report evidence contract');
assertIncludes(specDoc, 'V0 does not open links, verify external prices, check live inventory, inspect POS systems, inspect ordering providers, call AI providers, scan search results, or update external platforms', 'Price Availability Gap Check runtime boundary');
assertIncludes(implDoc, 'evidenceText: string', 'Price Availability Gap Check implementation evidence contract');
assertIncludes(implDoc, 'Do not add external price verification, live inventory checks, POS checks, ordering-provider checks, external source crawling, AI/search provider calls, file upload, or report storage in V0', 'Price Availability Gap Check provider boundary');
assertIncludes(firebaseDoc, 'POS checks | 0', 'Price Availability Gap Check POS cost boundary');
assertIncludes(firebaseDoc, 'Ordering provider checks | 0', 'Price Availability Gap Check provider cost boundary');
assertIncludes(firebaseDoc, 'Live inventory checks | 0', 'Price Availability Gap Check live inventory boundary');
assertIncludes(firebaseDoc, 'AI/provider calls | 0', 'Price Availability Gap Check AI/provider boundary');
assertIncludes(mobileDoc, 'Owner PWA | Included through existing Business Health card', 'Price Availability Gap Check mobile V1 boundary');
assertIncludes(testCasesDoc, 'No POS checks', 'Price Availability Gap Check POS test boundary');
assertIncludes(validationDoc, 'V0 validation evidence; not current launch certification', 'Price Availability Gap Check validation launch boundary');
assertIncludes(validationDoc, 'Current release approval still requires the active production-readiness audit', 'Price Availability Gap Check validation release boundary');
assertIncludes(validationDoc, 'npm run verify:price-availability-gap-check', 'Price Availability Gap Check validation source gate');
assertIncludes(toolsReadmeDoc, '[price-availability-gap-check](./price-availability-gap-check/README.md)', 'MenuList Tools README');
assertIncludes(familyReadmeDoc, '[Price Availability Gap Check](../price-availability-gap-check/README.md)', 'Public Truth Tools family docs');
assertIncludes(familyImplDoc, 'priceAvailabilityGapReport.ts', 'Public Truth Tools implementation docs');
assertIncludes(familyFirebaseDoc, 'Price Availability Gap Check', 'Public Truth Tools Firebase docs');

assertIncludes(route, 'WebsitePageStructuredData', 'Price Availability Gap Check route structured data');
assertIncludes(route, 'path="/tools/price-availability-gap-check"', 'Price Availability Gap Check structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'Price Availability Gap Check route feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_PRICE_AVAILABILITY_GAP_CHECK', 'Price Availability Gap Check route feature flag');

assertIncludes(component, "useTranslations('Website.PriceAvailabilityGapCheckPage')", 'Price Availability Gap Check localized copy');
assertIncludes(component, 'buildPriceAvailabilityGapReport(form)', 'Price Availability Gap Check browser-local report builder');
assertIncludes(component, 'check.evidenceText', 'Price Availability Gap Check explicit evidence text rendering');
assertIncludes(component, 'href={report.nextAction.href}', 'Price Availability Gap Check MenuList next action');
assertIncludes(component, "fetch('/api/public/contact'", 'Price Availability Gap Check consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'Price Availability Gap Check contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'Price Availability Gap Check contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'Price Availability Gap Check contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'Price Availability Gap Check bounded contact response parsing');
assertIncludes(component, "isAcceptedMenulistPublicContactResponse(result, 'general')", 'Price Availability Gap Check shaped contact acknowledgement guard');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse', 'Price Availability Gap Check invalid contact acknowledgement diagnostic helper');
assertIncludes(component, 'TurnstileWidget', 'Price Availability Gap Check contact handoff security check');
assertNotIncludes(component, '!result?.accepted', 'Price Availability Gap Check must not accept generic contact accepted flag');
assertIncludes(component, 'copyRuntimeTextToClipboard(reportText)', 'Price Availability Gap Check report copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'Price Availability Gap Check report download action');
assertIncludes(component, "trackWebsiteMarketingEvent('price_availability_gap_check_completed'", 'Price Availability Gap Check completion analytics');
assertIncludes(component, "mode: 'self_report'", 'Price Availability Gap Check input contract');

assertIncludes(types, 'evidenceText: string', 'Price Availability Gap Check evidence text type');
assertIncludes(types, 'externalUrlFetched: false', 'Price Availability Gap Check target fetch boundary type');
assertIncludes(types, 'pricesVerifiedExternally: false', 'Price Availability Gap Check price verification boundary type');
assertIncludes(types, 'liveInventoryChecked: false', 'Price Availability Gap Check live inventory boundary type');
assertIncludes(types, 'posChecked: false', 'Price Availability Gap Check POS boundary type');
assertIncludes(types, 'orderingProviderChecked: false', 'Price Availability Gap Check ordering provider boundary type');
assertIncludes(types, 'reportStored: false', 'Price Availability Gap Check report storage boundary type');
assertIncludes(types, 'externalPlatformUpdated: false', 'Price Availability Gap Check external mutation boundary type');
assertIncludes(types, 'aiOrSearchChecked: false', 'Price Availability Gap Check AI/search boundary type');
assertIncludes(types, 'rankingPromise: false', 'Price Availability Gap Check ranking boundary type');

assertIncludes(report, 'externalUrlFetched: false', 'Price Availability Gap Check report target fetch boundary');
assertIncludes(report, 'pricesVerifiedExternally: false', 'Price Availability Gap Check report price verification boundary');
assertIncludes(report, 'liveInventoryChecked: false', 'Price Availability Gap Check report live inventory boundary');
assertIncludes(report, 'posChecked: false', 'Price Availability Gap Check report POS boundary');
assertIncludes(report, 'orderingProviderChecked: false', 'Price Availability Gap Check report ordering provider boundary');
assertIncludes(report, 'reportStored: false', 'Price Availability Gap Check report storage boundary');
assertIncludes(report, 'externalPlatformUpdated: false', 'Price Availability Gap Check report external mutation boundary');
assertIncludes(report, 'aiOrSearchChecked: false', 'Price Availability Gap Check report AI/search boundary');
assertIncludes(report, 'rankingPromise: false', 'Price Availability Gap Check report ranking boundary');
assertIncludes(report, 'getPriceAvailabilityEvidenceText', 'Price Availability Gap Check explicit evidence text');
assertIncludes(report, 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.', 'Price Availability Gap Check URL evidence boundary');
assertIncludes(report, 'External URLs, POS systems, ordering providers, live inventory, and AI/search answers were not inspected.', 'Price Availability Gap Check external provider evidence boundary');
assertIncludes(ownerReport, "'price_availability_gap'", 'Price Availability Gap Check owner module id');
assertIncludes(ownerReport, 'Price and availability clarity', 'Price Availability Gap Check owner module title');
assertIncludes(ownerReport, 'POS, live inventory, ordering providers, external menus, and AI/search were not checked.', 'Price Availability Gap Check owner evidence boundary');

for (const content of [route, report, types]) {
  assertNotIncludes(content, 'fetch(', 'Price Availability Gap Check default runtime');
  assertNotIncludes(content, 'firebase', 'Price Availability Gap Check default runtime');
  assertNotIncludes(content, 'firestore', 'Price Availability Gap Check default runtime');
  assertNotIncludes(content, 'addDoc', 'Price Availability Gap Check default runtime');
  assertNotIncludes(content, 'setDoc', 'Price Availability Gap Check default runtime');
  assertNotIncludes(content, 'updateDoc', 'Price Availability Gap Check default runtime');
}

for (const content of [component, route, report, types]) {
  assertNotIncludes(content, 'fetch(form.publicUrl', 'Price Availability Gap Check external source boundary');
  assertNotIncludes(content, 'fetch(publicUrl', 'Price Availability Gap Check external source boundary');
  assertNotIncludes(content, 'fetch(input.publicUrl', 'Price Availability Gap Check external source boundary');
  assertNotIncludes(content, 'fetch(form.sourceText', 'Price Availability Gap Check source crawl boundary');
  assertNotIncludes(content, 'fetch(sourceText', 'Price Availability Gap Check source crawl boundary');
  assertNotIncludes(content, 'fetch(input.sourceText', 'Price Availability Gap Check source crawl boundary');
  assertNotIncludes(content, 'fetch(report.', 'Price Availability Gap Check external source boundary');
  assertNotIncludes(content, 'firebase/firestore', 'Price Availability Gap Check browser write boundary');
  assertNotIncludes(content, 'addDoc(', 'Price Availability Gap Check browser write boundary');
  assertNotIncludes(content, 'setDoc(', 'Price Availability Gap Check browser write boundary');
  assertNotIncludes(content, 'updateDoc(', 'Price Availability Gap Check browser write boundary');
  assertNotIncludes(content, 'FileReader', 'Price Availability Gap Check V0 upload boundary');
  assertNotIncludes(content, 'type="file"', 'Price Availability Gap Check V0 upload boundary');
  assertNotIncludes(content, 'storageRef', 'Price Availability Gap Check V0 upload boundary');
  assertNotIncludes(content, 'uploadBytes', 'Price Availability Gap Check V0 upload boundary');
  assertNotIncludes(content, 'openai', 'Price Availability Gap Check V0 AI boundary');
  assertNotIncludes(content, '@google/genai', 'Price Availability Gap Check V0 AI boundary');
  assertNotIncludes(content, 'chatCompletion', 'Price Availability Gap Check chatbot boundary');
  assertNotIncludes(content, 'posSync', 'Price Availability Gap Check POS boundary');
  assertNotIncludes(content, 'inventoryApi', 'Price Availability Gap Check live inventory boundary');
  assertNotIncludes(content, 'orderingProviderApi', 'Price Availability Gap Check ordering-provider boundary');
  assertNotIncludes(content, 'orderingProviderClient', 'Price Availability Gap Check ordering-provider boundary');
  assertNotIncludes(content, 'stripe.checkout', 'Price Availability Gap Check payment boundary');
  assertNotIncludes(content, 'window.open', 'Price Availability Gap Check must not open external links');
  assertNotIncludes(content, 'location.href', 'Price Availability Gap Check must not navigate to external links');
  assertNotIncludes(content, 'location.assign', 'Price Availability Gap Check must not navigate to external links');
}

for (const content of [route, component, report, types, llms, llmsFull]) {
  assertNotIncludes(content, 'guaranteed ranking', 'Price Availability Gap Check claims');
  assertNotIncludes(content, 'guaranteed citation', 'Price Availability Gap Check claims');
  assertNotIncludes(content, 'guaranteed AI visibility', 'Price Availability Gap Check claims');
  assertNotIncludes(content, 'live inventory verified', 'Price Availability Gap Check live inventory claim');
  assertNotIncludes(content, 'prices verified externally', 'Price Availability Gap Check external price verification claim');
  assertNotIncludes(content, 'scanned your website', 'Price Availability Gap Check crawl claim');
}

assertIncludes(discoveryPolicy, "path: '/tools/price-availability-gap-check'", 'Price Availability Gap Check discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/price-availability-gap-check', 'Price Availability Gap Check sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/price-availability-gap-check', 'Price Availability Gap Check llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/price-availability-gap-check', 'Price Availability Gap Check llms-full.txt');

assert(enUS.Website?.PriceAvailabilityGapCheckPage, 'en-US PriceAvailabilityGapCheckPage locale keys must exist');
assert(hiIN.Website?.PriceAvailabilityGapCheckPage, 'hi-IN PriceAvailabilityGapCheckPage locale keys must exist');
assert(enUS.Website.PriceAvailabilityGapCheckPage.checks.source_material, 'en-US source material copy must exist');
assert(hiIN.Website.PriceAvailabilityGapCheckPage.checks.source_material, 'hi-IN source material copy must exist');
assert(enUS.Website.PriceAvailabilityGapCheckPage.checks.external_price_availability_inspection, 'en-US external inspection copy must exist');
assert(hiIN.Website.PriceAvailabilityGapCheckPage.checks.external_price_availability_inspection, 'hi-IN external inspection copy must exist');
assert(enUS.Website.PriceAvailabilityGapCheckPage.reportActions?.copy, 'en-US report copy key must exist');
assert(enUS.Website.PriceAvailabilityGapCheckPage.handoff?.submit, 'en-US handoff submit key must exist');
assert(hiIN.Website.PriceAvailabilityGapCheckPage.reportActions?.copy, 'hi-IN report copy key must exist');
assert(hiIN.Website.PriceAvailabilityGapCheckPage.handoff?.submit, 'hi-IN handoff submit key must exist');

console.log('Price Availability Gap Check verification passed');
