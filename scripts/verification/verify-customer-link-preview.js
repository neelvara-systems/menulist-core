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

const ROUTE_PATH = 'src/app/(website)/tools/customer-link-preview/page.tsx';
const COMPONENT_PATH = 'src/components/website/customerLinkPreview/CustomerLinkPreviewPage.tsx';
const REPORT_PATH = 'src/lib/public-truth-tools/customerLinkPreviewReport.ts';
const TYPES_PATH = 'src/lib/public-truth-tools/customerLinkPreviewTypes.ts';
const DOC_ROOT_PATH = '__docs__/menulist-tools/customer-link-preview';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/customer-link-preview_spec.md`,
  `${DOC_ROOT_PATH}/customer-link-preview_impl.md`,
  `${DOC_ROOT_PATH}/customer-link-preview_marketing.md`,
  `${DOC_ROOT_PATH}/customer-link-preview_website.md`,
  `${DOC_ROOT_PATH}/customer-link-preview_helpdoc.md`,
  `${DOC_ROOT_PATH}/customer-link-preview_firebase.md`,
  `${DOC_ROOT_PATH}/customer-link-preview_mobile-support.md`,
  `${DOC_ROOT_PATH}/customer-link-preview_test-cases.md`,
  `${DOC_ROOT_PATH}/customer-link-preview_validation.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  REPORT_PATH,
  TYPES_PATH,
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `One Customer Link Preview file missing: ${file}`);
}

assert(!exists('__docs__/customer-link-preview'), 'One Customer Link Preview docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/customer-link-preview/report/route.ts'), 'One Customer Link Preview must not add a report API route in V0');
assert(!exists('src/app/api/public-truth-tools/customer-link-preview/route.ts'), 'One Customer Link Preview must not add a report API route in V0');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const report = read(REPORT_PATH);
const types = read(TYPES_PATH);
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/customer-link-preview_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/customer-link-preview_impl.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/customer-link-preview_firebase.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/customer-link-preview_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/customer-link-preview_test-cases.md`);
const validationDoc = read(`${DOC_ROOT_PATH}/customer-link-preview_validation.md`);
const familyReadmeDoc = read('__docs__/menulist-tools/public-truth-tools/README.md');
const familySpecDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_spec.md');
const familyImplDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_impl.md');
const familyFirebaseDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_firebase.md');
const familyTestsDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_test-cases.md');
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
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_CUSTOMER_LINK_PREVIEW: true', 'One Customer Link Preview feature flag');
assertIncludes(features, '__docs__/menulist-tools/customer-link-preview/customer-link-preview_impl.md', 'One Customer Link Preview doc pointer');
assertIncludes(packageJson, '"verify:customer-link-preview"', 'One Customer Link Preview package verifier');
assertIncludes(aggregateVerifier, 'verify-customer-link-preview.js', 'Public Truth Tools aggregate verifier');

assertIncludes(readmeDoc, '## Version Ladder', 'One Customer Link Preview README');
assertIncludes(specDoc, 'Every row includes `evidenceText`', 'One Customer Link Preview report evidence contract');
assertIncludes(specDoc, 'V0 does not open links, fetch customer pages, inspect websites, inspect Google profiles, inspect social profiles, verify link content, check uptime, store reports, call AI providers, scan search results, promise rankings, promise citations, or update external platforms', 'One Customer Link Preview runtime boundary');
assertIncludes(implDoc, 'evidenceText: string', 'One Customer Link Preview implementation evidence contract');
assertIncludes(implDoc, 'Do not add external URL fetches, website crawling, Google crawling, profile opening, social profile scraping, uptime monitoring, AI/search provider calls, report storage, or external platform updates in V0', 'One Customer Link Preview provider boundary');
assertIncludes(firebaseDoc, 'External URL fetches | 0', 'One Customer Link Preview external fetch cost boundary');
assertIncludes(firebaseDoc, 'AI/provider calls | 0', 'One Customer Link Preview AI/provider boundary');
assertIncludes(firebaseDoc, 'Report storage | 0', 'One Customer Link Preview report storage boundary');
assertIncludes(mobileDoc, 'V1 maps to existing owner mobile Business Health surfaces', 'One Customer Link Preview mobile V1 boundary');
assertIncludes(testCasesDoc, 'Tool claims it fetched links', 'One Customer Link Preview fetch test boundary');
assertIncludes(validationDoc, 'V0 validation evidence; not current launch certification', 'One Customer Link Preview validation launch boundary');
assertIncludes(validationDoc, 'Current release approval still requires the active production-readiness audit', 'One Customer Link Preview validation release boundary');
assertIncludes(validationDoc, 'npm run verify:customer-link-preview', 'One Customer Link Preview validation source gate');
assertIncludes(toolsReadmeDoc, '[customer-link-preview](./customer-link-preview/README.md)', 'MenuList Tools README');
assertIncludes(familyReadmeDoc, '[One Customer Link Preview](../customer-link-preview/README.md)', 'Public Truth Tools family docs');
assertIncludes(familyReadmeDoc, 'sixteen public tools, five public asset makers, a public shareable report layer, and eighteen owner readiness modules', 'Public Truth Tools family status');
assertIncludes(familyReadmeDoc, '/tools/customer-link-preview', 'Public Truth Tools route list');
assertIncludes(familySpecDoc, 'One Customer Link Preview V0', 'Public Truth Tools spec implementation summary');
assertIncludes(familyImplDoc, 'customerLinkPreviewReport.ts', 'Public Truth Tools implementation docs');
assertIncludes(familyFirebaseDoc, 'One Customer Link Preview', 'Public Truth Tools Firebase docs');
assertIncludes(familyTestsDoc, 'PTT-015F', 'Public Truth Tools test boundary');

assertIncludes(route, 'WebsitePageStructuredData', 'One Customer Link Preview route structured data');
assertIncludes(route, 'path="/tools/customer-link-preview"', 'One Customer Link Preview structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'One Customer Link Preview route feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_CUSTOMER_LINK_PREVIEW', 'One Customer Link Preview route feature flag');

assertIncludes(component, "useTranslations('Website.CustomerLinkPreviewPage')", 'One Customer Link Preview localized copy');
assertIncludes(component, 'buildCustomerLinkPreviewReport(form)', 'One Customer Link Preview browser-local report builder');
assertIncludes(component, 'check.evidenceText', 'One Customer Link Preview explicit evidence text rendering');
assertIncludes(component, 'href={report.nextAction.href}', 'One Customer Link Preview MenuList next action');
assertIncludes(component, "fetch('/api/public/contact'", 'One Customer Link Preview consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'One Customer Link Preview contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'One Customer Link Preview contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'One Customer Link Preview contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'One Customer Link Preview bounded contact response parsing');
assertIncludes(component, "isAcceptedMenulistPublicContactResponse(result, 'general')", 'One Customer Link Preview shaped contact acknowledgement guard');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse', 'One Customer Link Preview invalid contact acknowledgement diagnostic helper');
assertIncludes(component, 'TurnstileWidget', 'One Customer Link Preview contact handoff security check');
assertNotIncludes(component, '!result?.accepted', 'One Customer Link Preview must not accept generic contact accepted flag');
assertIncludes(component, 'copyRuntimeTextToClipboard(reportText)', 'One Customer Link Preview report copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'One Customer Link Preview report download action');
assertIncludes(component, "trackWebsiteMarketingEvent('customer_link_preview_completed'", 'One Customer Link Preview completion analytics');
assertIncludes(component, "mode: 'self_report'", 'One Customer Link Preview input contract');

assertIncludes(types, 'evidenceText: string', 'One Customer Link Preview evidence text type');
assertIncludes(types, 'customerLinkFetched: false', 'One Customer Link Preview customer-link fetch boundary type');
assertIncludes(types, 'previewRenderedFromExternalSource: false', 'One Customer Link Preview external preview boundary type');
assertIncludes(types, 'externalUrlFetched: false', 'One Customer Link Preview external URL boundary type');
assertIncludes(types, 'reportStored: false', 'One Customer Link Preview report storage boundary type');
assertIncludes(types, 'externalPlatformUpdated: false', 'One Customer Link Preview external mutation boundary type');
assertIncludes(types, 'aiOrSearchChecked: false', 'One Customer Link Preview AI/search boundary type');
assertIncludes(types, 'rankingPromise: false', 'One Customer Link Preview ranking boundary type');

assertIncludes(report, 'customerLinkFetched: false', 'One Customer Link Preview report customer-link fetch boundary');
assertIncludes(report, 'previewRenderedFromExternalSource: false', 'One Customer Link Preview report external preview boundary');
assertIncludes(report, 'externalUrlFetched: false', 'One Customer Link Preview report external URL boundary');
assertIncludes(report, 'reportStored: false', 'One Customer Link Preview report storage boundary');
assertIncludes(report, 'externalPlatformUpdated: false', 'One Customer Link Preview report external mutation boundary');
assertIncludes(report, 'aiOrSearchChecked: false', 'One Customer Link Preview report AI/search boundary');
assertIncludes(report, 'rankingPromise: false', 'One Customer Link Preview report ranking boundary');
assertIncludes(report, 'getCustomerLinkPreviewEvidenceText', 'One Customer Link Preview explicit evidence text');
assertIncludes(report, 'getNextActionType(status, validCurrentCustomerLink)', 'One Customer Link Preview existing-link next action');
assertIncludes(report, "if (validCurrentCustomerLink) return 'complete_customer_facts';", 'One Customer Link Preview fact-completion routing');
assertIncludes(report, "case 'owner_business_kind':", 'One Customer Link Preview clinic exception evidence source');
assertIncludes(report, 'Price or rate visibility was not required for the owner-selected clinic business type.', 'One Customer Link Preview clinic exception evidence text');
assertIncludes(report, 'The customer link was not opened or fetched.', 'One Customer Link Preview link evidence boundary');
assertIncludes(report, 'Public HTTPS customer-link format was checked locally. The link was not opened or fetched.', 'One Customer Link Preview public HTTPS customer-link evidence boundary');
assertIncludes(report, 'External links, websites, profiles, search results, and AI answers were not inspected.', 'One Customer Link Preview external inspection evidence boundary');

for (const content of [route, report, types]) {
  assertNotIncludes(content, 'fetch(', 'One Customer Link Preview default runtime');
  assertNotIncludes(content, 'firebase', 'One Customer Link Preview default runtime');
  assertNotIncludes(content, 'firestore', 'One Customer Link Preview default runtime');
  assertNotIncludes(content, 'addDoc', 'One Customer Link Preview default runtime');
  assertNotIncludes(content, 'setDoc', 'One Customer Link Preview default runtime');
  assertNotIncludes(content, 'updateDoc', 'One Customer Link Preview default runtime');
}

for (const content of [component, route, report, types]) {
  assertNotIncludes(content, 'fetch(form.currentCustomerLink', 'One Customer Link Preview external source boundary');
  assertNotIncludes(content, 'fetch(currentCustomerLink', 'One Customer Link Preview external source boundary');
  assertNotIncludes(content, 'fetch(input.currentCustomerLink', 'One Customer Link Preview external source boundary');
  assertNotIncludes(content, 'fetch(report.', 'One Customer Link Preview external source boundary');
  assertNotIncludes(content, 'firebase/firestore', 'One Customer Link Preview browser write boundary');
  assertNotIncludes(content, 'addDoc(', 'One Customer Link Preview browser write boundary');
  assertNotIncludes(content, 'setDoc(', 'One Customer Link Preview browser write boundary');
  assertNotIncludes(content, 'updateDoc(', 'One Customer Link Preview browser write boundary');
  assertNotIncludes(content, 'businessinformation.googleapis.com', 'One Customer Link Preview Google API boundary');
  assertNotIncludes(content, 'maps.googleapis.com', 'One Customer Link Preview Maps boundary');
  assertNotIncludes(content, 'google.maps.places', 'One Customer Link Preview Maps boundary');
  assertNotIncludes(content, 'openai', 'One Customer Link Preview V0 AI boundary');
  assertNotIncludes(content, '@google/genai', 'One Customer Link Preview V0 AI boundary');
  assertNotIncludes(content, 'chatCompletion', 'One Customer Link Preview chatbot boundary');
  assertNotIncludes(content, 'rankTracker', 'One Customer Link Preview ranking boundary');
  assertNotIncludes(content, 'window.open', 'One Customer Link Preview must not open external links');
  assertNotIncludes(content, 'location.href', 'One Customer Link Preview must not navigate to external links');
  assertNotIncludes(content, 'location.assign', 'One Customer Link Preview must not navigate to external links');
}

for (const content of [route, component, report, types, llms, llmsFull]) {
  assertNotIncludes(content, 'we opened your link', 'One Customer Link Preview external inspection claim');
  assertNotIncludes(content, 'we scanned your website', 'One Customer Link Preview crawl claim');
  assertNotIncludes(content, 'we checked your Google profile', 'One Customer Link Preview profile inspection claim');
  assertNotIncludes(content, 'stored your report', 'One Customer Link Preview report storage claim');
  assertNotIncludes(content, 'rank higher', 'One Customer Link Preview ranking claim');
  assertNotIncludes(content, 'guaranteed ranking', 'One Customer Link Preview ranking claim');
  assertNotIncludes(content, 'guaranteed citation', 'One Customer Link Preview citation claim');
  assertNotIncludes(content, 'guaranteed AI visibility', 'One Customer Link Preview AI visibility claim');
}

assertIncludes(discoveryPolicy, "path: '/tools/customer-link-preview'", 'One Customer Link Preview discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/customer-link-preview', 'One Customer Link Preview sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/customer-link-preview', 'One Customer Link Preview llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/customer-link-preview', 'One Customer Link Preview llms-full.txt');

assert(enUS.Website?.CustomerLinkPreviewPage, 'en-US CustomerLinkPreviewPage locale keys must exist');
assert(hiIN.Website?.CustomerLinkPreviewPage, 'hi-IN CustomerLinkPreviewPage locale keys must exist');
assert(enUS.Website.CustomerLinkPreviewPage.checks.customer_link_present, 'en-US customer link copy must exist');
assert(hiIN.Website.CustomerLinkPreviewPage.checks.customer_link_present, 'hi-IN customer link copy must exist');
assert(enUS.Website.CustomerLinkPreviewPage.checks.external_link_inspection, 'en-US external inspection copy must exist');
assert(hiIN.Website.CustomerLinkPreviewPage.checks.external_link_inspection, 'hi-IN external inspection copy must exist');
assert(enUS.Website.CustomerLinkPreviewPage.preview?.visibleFacts, 'en-US preview copy must exist');
assert(hiIN.Website.CustomerLinkPreviewPage.preview?.visibleFacts, 'hi-IN preview copy must exist');
assert(enUS.Website.CustomerLinkPreviewPage.reportActions?.copy, 'en-US report copy key must exist');
assert(enUS.Website.CustomerLinkPreviewPage.handoff?.submit, 'en-US handoff submit key must exist');
assert(hiIN.Website.CustomerLinkPreviewPage.reportActions?.copy, 'hi-IN report copy key must exist');
assert(hiIN.Website.CustomerLinkPreviewPage.handoff?.submit, 'hi-IN handoff submit key must exist');

console.log('One Customer Link Preview verification passed');
