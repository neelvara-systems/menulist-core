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

const ROUTE_PATH = 'src/app/(website)/tools/customer-question-coverage-check/page.tsx';
const COMPONENT_PATH = 'src/components/website/customerQuestionCoverageCheck/CustomerQuestionCoverageCheckPage.tsx';
const REPORT_PATH = 'src/lib/public-truth-tools/customerQuestionCoverageReport.ts';
const TYPES_PATH = 'src/lib/public-truth-tools/customerQuestionCoverageTypes.ts';
const OWNER_REPORT_PATH = 'src/lib/public-truth-tools/ownerPublicTruthReadiness.ts';
const DOC_ROOT_PATH = '__docs__/menulist-tools/customer-question-coverage-check';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/customer-question-coverage-check_spec.md`,
  `${DOC_ROOT_PATH}/customer-question-coverage-check_impl.md`,
  `${DOC_ROOT_PATH}/customer-question-coverage-check_marketing.md`,
  `${DOC_ROOT_PATH}/customer-question-coverage-check_website.md`,
  `${DOC_ROOT_PATH}/customer-question-coverage-check_helpdoc.md`,
  `${DOC_ROOT_PATH}/customer-question-coverage-check_firebase.md`,
  `${DOC_ROOT_PATH}/customer-question-coverage-check_mobile-support.md`,
  `${DOC_ROOT_PATH}/customer-question-coverage-check_test-cases.md`,
  `${DOC_ROOT_PATH}/customer-question-coverage-check_validation.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  REPORT_PATH,
  TYPES_PATH,
  OWNER_REPORT_PATH,
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `Customer Question Coverage Check file missing: ${file}`);
}

assert(!exists('__docs__/customer-question-coverage-check'), 'Customer Question Coverage Check docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/customer-question-coverage-check/report/route.ts'), 'Customer Question Coverage Check must not add a report API route in V0');
assert(!exists('src/app/api/public-truth-tools/customer-question-coverage-check/route.ts'), 'Customer Question Coverage Check must not add a report API route in V0');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const report = read(REPORT_PATH);
const types = read(TYPES_PATH);
const ownerReport = read(OWNER_REPORT_PATH);
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/customer-question-coverage-check_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/customer-question-coverage-check_impl.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/customer-question-coverage-check_firebase.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/customer-question-coverage-check_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/customer-question-coverage-check_test-cases.md`);
const validationDoc = read(`${DOC_ROOT_PATH}/customer-question-coverage-check_validation.md`);
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
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_CUSTOMER_QUESTION_COVERAGE_CHECK: true', 'Customer Question Coverage Check feature flag');
assertIncludes(features, '__docs__/menulist-tools/customer-question-coverage-check/customer-question-coverage-check_impl.md', 'Customer Question Coverage Check doc pointer');
assertIncludes(packageJson, '"verify:customer-question-coverage-check"', 'Customer Question Coverage Check package verifier');

assertIncludes(readmeDoc, '## Version Ladder', 'Customer Question Coverage Check README');
assertIncludes(specDoc, 'Every row includes `evidenceText`', 'Customer Question Coverage Check report evidence contract');
assertIncludes(specDoc, 'V0 does not open links, read chats, call AI providers, or generate chatbot answers', 'Customer Question Coverage Check runtime boundary');
assertIncludes(implDoc, 'evidenceText: string', 'Customer Question Coverage Check implementation evidence contract');
assertIncludes(implDoc, 'Do not add chatbot generation, customer-chat ingestion, external source crawling, provider calls, file upload, or report storage in V0', 'Customer Question Coverage Check provider boundary');
assertIncludes(firebaseDoc, 'Conversation reads | 0', 'Customer Question Coverage Check conversation read boundary');
assertIncludes(firebaseDoc, 'AI/provider calls | 0', 'Customer Question Coverage Check provider cost boundary');
assertIncludes(mobileDoc, 'Owner PWA | Included through existing Business Health card', 'Customer Question Coverage Check mobile V1 boundary');
assertIncludes(testCasesDoc, 'No chatbot answers', 'Customer Question Coverage Check chatbot test boundary');
assertIncludes(validationDoc, 'V0 validation evidence; not current launch certification', 'Customer Question Coverage Check validation launch boundary');
assertIncludes(validationDoc, 'Current release approval still requires the active production-readiness audit', 'Customer Question Coverage Check validation release boundary');
assertIncludes(validationDoc, 'npm run verify:customer-question-coverage-check', 'Customer Question Coverage Check validation source gate');
assertNotIncludes(validationDoc, '**Status:** Ready for testing', 'Customer Question Coverage Check stale ready-for-testing status');
assertNotIncludes(validationDoc, 'Ready for testing after:', 'Customer Question Coverage Check stale ready-for-testing verdict');
assertIncludes(toolsReadmeDoc, '[customer-question-coverage-check](./customer-question-coverage-check/README.md)', 'MenuList Tools README');
assertIncludes(familyReadmeDoc, '[Customer Question Coverage Check](../customer-question-coverage-check/README.md)', 'Public Truth Tools family docs');
assertIncludes(familyImplDoc, 'customerQuestionCoverageReport.ts', 'Public Truth Tools implementation docs');
assertIncludes(familyFirebaseDoc, 'Customer Question Coverage Check', 'Public Truth Tools Firebase docs');

assertIncludes(route, 'WebsitePageStructuredData', 'Customer Question Coverage Check route structured data');
assertIncludes(route, 'path="/tools/customer-question-coverage-check"', 'Customer Question Coverage Check structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'Customer Question Coverage Check route feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_CUSTOMER_QUESTION_COVERAGE_CHECK', 'Customer Question Coverage Check route feature flag');

assertIncludes(component, "useTranslations('Website.CustomerQuestionCoverageCheckPage')", 'Customer Question Coverage Check localized copy');
assertIncludes(component, 'buildCustomerQuestionCoverageReport(form)', 'Customer Question Coverage Check browser-local report builder');
assertIncludes(component, 'check.evidenceText', 'Customer Question Coverage Check explicit evidence text rendering');
assertIncludes(component, 'href={report.nextAction.href}', 'Customer Question Coverage Check MenuList next action');
assertIncludes(component, "fetch('/api/public/contact'", 'Customer Question Coverage Check consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'Customer Question Coverage Check contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'Customer Question Coverage Check contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'Customer Question Coverage Check contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'Customer Question Coverage Check bounded contact response parsing');
assertIncludes(component, "isAcceptedMenulistPublicContactResponse(result, 'general')", 'Customer Question Coverage Check shaped contact acknowledgement guard');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse', 'Customer Question Coverage Check invalid contact acknowledgement diagnostic helper');
assertIncludes(component, 'TurnstileWidget', 'Customer Question Coverage Check contact handoff security check');
assertNotIncludes(component, '!result?.accepted', 'Customer Question Coverage Check must not accept generic contact accepted flag');
assertIncludes(component, 'copyRuntimeTextToClipboard(reportText)', 'Customer Question Coverage Check report copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'Customer Question Coverage Check report download action');
assertIncludes(component, "trackWebsiteMarketingEvent('customer_question_coverage_check_completed'", 'Customer Question Coverage Check completion analytics');
assertIncludes(component, "mode: 'self_report'", 'Customer Question Coverage Check input contract');

assertIncludes(types, 'evidenceText: string', 'Customer Question Coverage Check evidence text type');
assertIncludes(types, 'externalUrlFetched: false', 'Customer Question Coverage Check target fetch boundary type');
assertIncludes(types, 'aiAnswerGenerated: false', 'Customer Question Coverage Check chatbot boundary type');
assertIncludes(types, 'aiOrSearchChecked: false', 'Customer Question Coverage Check AI/search boundary type');
assertIncludes(types, 'customerConversationLogsRead: false', 'Customer Question Coverage Check conversation boundary type');
assertIncludes(types, 'externalPlatformUpdated: false', 'Customer Question Coverage Check external mutation boundary type');
assertIncludes(types, 'rankingPromise: false', 'Customer Question Coverage Check ranking boundary type');

assertIncludes(report, 'externalUrlFetched: false', 'Customer Question Coverage Check report target fetch boundary');
assertIncludes(report, 'aiAnswerGenerated: false', 'Customer Question Coverage Check report chatbot boundary');
assertIncludes(report, 'aiOrSearchChecked: false', 'Customer Question Coverage Check report AI/search boundary');
assertIncludes(report, 'customerConversationLogsRead: false', 'Customer Question Coverage Check report conversation boundary');
assertIncludes(report, 'externalPlatformUpdated: false', 'Customer Question Coverage Check report external mutation boundary');
assertIncludes(report, 'rankingPromise: false', 'Customer Question Coverage Check report ranking boundary');
assertIncludes(report, 'getCustomerQuestionCoverageEvidenceText', 'Customer Question Coverage Check explicit evidence text');
assertIncludes(report, 'URL format was checked locally. The URL was not opened or fetched.', 'Customer Question Coverage Check URL evidence boundary');
assertIncludes(report, 'Links are not opened, customer conversations are not read, and AI answers are not generated.', 'Customer Question Coverage Check chatbot/conversation evidence boundary');
assertIncludes(ownerReport, "'customer_question_coverage'", 'Customer Question Coverage Check owner module id');
assertIncludes(ownerReport, 'Customer question coverage', 'Customer Question Coverage Check owner module title');
assertIncludes(ownerReport, 'Customer chats, external search, and AI answers were not checked.', 'Customer Question Coverage Check owner evidence boundary');

for (const content of [route, report, types]) {
  assertNotIncludes(content, 'fetch(', 'Customer Question Coverage Check default runtime');
  assertNotIncludes(content, 'firebase', 'Customer Question Coverage Check default runtime');
  assertNotIncludes(content, 'firestore', 'Customer Question Coverage Check default runtime');
  assertNotIncludes(content, 'addDoc', 'Customer Question Coverage Check default runtime');
  assertNotIncludes(content, 'setDoc', 'Customer Question Coverage Check default runtime');
  assertNotIncludes(content, 'updateDoc', 'Customer Question Coverage Check default runtime');
}

for (const content of [component, route, report, types]) {
  assertNotIncludes(content, 'fetch(form.publicUrl', 'Customer Question Coverage Check external source boundary');
  assertNotIncludes(content, 'fetch(publicUrl', 'Customer Question Coverage Check external source boundary');
  assertNotIncludes(content, 'fetch(input.publicUrl', 'Customer Question Coverage Check external source boundary');
  assertNotIncludes(content, 'fetch(report.', 'Customer Question Coverage Check external source boundary');
  assertNotIncludes(content, 'firebase/firestore', 'Customer Question Coverage Check browser write boundary');
  assertNotIncludes(content, 'addDoc(', 'Customer Question Coverage Check browser write boundary');
  assertNotIncludes(content, 'setDoc(', 'Customer Question Coverage Check browser write boundary');
  assertNotIncludes(content, 'updateDoc(', 'Customer Question Coverage Check browser write boundary');
  assertNotIncludes(content, 'FileReader', 'Customer Question Coverage Check V0 upload boundary');
  assertNotIncludes(content, 'type="file"', 'Customer Question Coverage Check V0 upload boundary');
  assertNotIncludes(content, 'storageRef', 'Customer Question Coverage Check V0 upload boundary');
  assertNotIncludes(content, 'uploadBytes', 'Customer Question Coverage Check V0 upload boundary');
  assertNotIncludes(content, 'openai', 'Customer Question Coverage Check V0 AI boundary');
  assertNotIncludes(content, '@google/genai', 'Customer Question Coverage Check V0 AI boundary');
  assertNotIncludes(content, 'chatCompletion', 'Customer Question Coverage Check chatbot boundary');
  assertNotIncludes(content, 'conversationId', 'Customer Question Coverage Check conversation-log boundary');
  assertNotIncludes(content, 'window.open', 'Customer Question Coverage Check must not open external links');
  assertNotIncludes(content, 'location.href', 'Customer Question Coverage Check must not navigate to external links');
  assertNotIncludes(content, 'location.assign', 'Customer Question Coverage Check must not navigate to external links');
}

for (const content of [route, component, report, types, llms, llmsFull]) {
  assertNotIncludes(content, 'guaranteed ranking', 'Customer Question Coverage Check claims');
  assertNotIncludes(content, 'guaranteed citation', 'Customer Question Coverage Check claims');
  assertNotIncludes(content, 'guaranteed AI visibility', 'Customer Question Coverage Check claims');
  assertNotIncludes(content, 'generated chatbot answers', 'Customer Question Coverage Check chatbot claim');
  assertNotIncludes(content, 'read your customer chats', 'Customer Question Coverage Check conversation claim');
  assertNotIncludes(content, 'scanned your website', 'Customer Question Coverage Check crawl claim');
}

assertIncludes(discoveryPolicy, "path: '/tools/customer-question-coverage-check'", 'Customer Question Coverage Check discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/customer-question-coverage-check', 'Customer Question Coverage Check sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/customer-question-coverage-check', 'Customer Question Coverage Check llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/customer-question-coverage-check', 'Customer Question Coverage Check llms-full.txt');

assert(enUS.Website?.CustomerQuestionCoverageCheckPage, 'en-US CustomerQuestionCoverageCheckPage locale keys must exist');
assert(hiIN.Website?.CustomerQuestionCoverageCheckPage, 'hi-IN CustomerQuestionCoverageCheckPage locale keys must exist');
assert(enUS.Website.CustomerQuestionCoverageCheckPage.checks.customer_questions, 'en-US customer questions copy must exist');
assert(hiIN.Website.CustomerQuestionCoverageCheckPage.checks.customer_questions, 'hi-IN customer questions copy must exist');
assert(enUS.Website.CustomerQuestionCoverageCheckPage.reportActions?.copy, 'en-US report copy key must exist');
assert(enUS.Website.CustomerQuestionCoverageCheckPage.handoff?.submit, 'en-US handoff submit key must exist');
assert(hiIN.Website.CustomerQuestionCoverageCheckPage.reportActions?.copy, 'hi-IN report copy key must exist');
assert(hiIN.Website.CustomerQuestionCoverageCheckPage.handoff?.submit, 'hi-IN handoff submit key must exist');

console.log('Customer Question Coverage Check verification passed');
