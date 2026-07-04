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

const ROUTE_PATH = 'src/app/(website)/tools/customer-faq-reply-pack/page.tsx';
const COMPONENT_PATH = 'src/components/website/customerFaqReplyPack/CustomerFaqReplyPackPage.tsx';
const REPORT_PATH = 'src/lib/public-truth-tools/customerFaqReplyPackReport.ts';
const TYPES_PATH = 'src/lib/public-truth-tools/customerFaqReplyPackTypes.ts';
const DOC_ROOT_PATH = '__docs__/menulist-tools/customer-faq-reply-pack';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/customer-faq-reply-pack_spec.md`,
  `${DOC_ROOT_PATH}/customer-faq-reply-pack_impl.md`,
  `${DOC_ROOT_PATH}/customer-faq-reply-pack_marketing.md`,
  `${DOC_ROOT_PATH}/customer-faq-reply-pack_website.md`,
  `${DOC_ROOT_PATH}/customer-faq-reply-pack_helpdoc.md`,
  `${DOC_ROOT_PATH}/customer-faq-reply-pack_firebase.md`,
  `${DOC_ROOT_PATH}/customer-faq-reply-pack_mobile-support.md`,
  `${DOC_ROOT_PATH}/customer-faq-reply-pack_test-cases.md`,
  `${DOC_ROOT_PATH}/customer-faq-reply-pack_validation.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  REPORT_PATH,
  TYPES_PATH,
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `Customer FAQ Reply Pack file missing: ${file}`);
}

assert(!exists('__docs__/customer-faq-reply-pack'), 'Customer FAQ Reply Pack docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/customer-faq-reply-pack/report/route.ts'), 'Customer FAQ Reply Pack must not add a report API route in V0');
assert(!exists('src/app/api/public-truth-tools/customer-faq-reply-pack/route.ts'), 'Customer FAQ Reply Pack must not add a report API route in V0');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const report = read(REPORT_PATH);
const types = read(TYPES_PATH);
const features = read('src/config/features.ts');
const packageJson = read('package.json');
const aggregateVerifier = read('scripts/verification/verify-public-truth-tools.js');
const toolsHubVerifier = read('scripts/verification/verify-tools-hub.js');
const shareableVerifier = read('scripts/verification/verify-shareable-tool-reports.js');
const discoveryPolicy = read('src/lib/seo/discoveryPolicy.ts');
const sitemap = read('public/sitemap.xml');
const llms = read('public/llms.txt');
const llmsFull = read('public/llms-full.txt');
const toolsReadmeDoc = read('__docs__/menulist-tools/README.md');
const familyReadmeDoc = read('__docs__/menulist-tools/public-truth-tools/README.md');
const familyImplDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_impl.md');
const familyFirebaseDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_firebase.md');
const familyTestsDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_test-cases.md');
const shareableReadmeDoc = read('__docs__/menulist-tools/shareable-tool-reports/README.md');
const toolsHubReadmeDoc = read('__docs__/menulist-tools/tools-hub/README.md');
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/customer-faq-reply-pack_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/customer-faq-reply-pack_impl.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/customer-faq-reply-pack_firebase.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/customer-faq-reply-pack_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/customer-faq-reply-pack_test-cases.md`);
const validationDoc = read(`${DOC_ROOT_PATH}/customer-faq-reply-pack_validation.md`);
const enUS = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
const hiIN = JSON.parse(read('public/locales/menulist.ai/hi-IN.json'));

assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_CUSTOMER_FAQ_REPLY_PACK: true', 'Customer FAQ Reply Pack feature flag');
assertIncludes(features, '__docs__/menulist-tools/customer-faq-reply-pack/customer-faq-reply-pack_impl.md', 'Customer FAQ Reply Pack doc pointer');
assertIncludes(packageJson, '"verify:customer-faq-reply-pack"', 'Customer FAQ Reply Pack package verifier');
assertIncludes(aggregateVerifier, 'verify-customer-faq-reply-pack.js', 'Public Truth Tools aggregate verifier');
assertIncludes(aggregateVerifier, "slug: 'customer-faq-reply-pack'", 'Public Truth Tools manifest');
assertIncludes(toolsHubVerifier, "'/tools/customer-faq-reply-pack'", 'Tools Hub verifier route list');
assertIncludes(shareableVerifier, "'customer-faq-reply-pack'", 'Shareable Tool Reports source list');

assertIncludes(readmeDoc, '## Version Ladder', 'Customer FAQ Reply Pack README');
assertIncludes(readmeDoc, 'npm run verify:customer-faq-reply-pack', 'Customer FAQ Reply Pack README source gate');
assertIncludes(specDoc, 'V0 must not:', 'Customer FAQ Reply Pack V0 forbidden scope');
assertIncludes(specDoc, 'No AI answer is generated.', 'Customer FAQ Reply Pack deterministic copy boundary');
assertIncludes(implDoc, 'evidenceText: string', 'Customer FAQ Reply Pack implementation evidence contract');
assertIncludes(implDoc, 'Boundary flags are all false', 'Customer FAQ Reply Pack implementation boundary flags');
assertIncludes(implDoc, 'The only allowed network write is the optional consented `/api/public/contact` handoff.', 'Customer FAQ Reply Pack contact boundary');
assertIncludes(firebaseDoc, 'External fetches | 0', 'Customer FAQ Reply Pack external fetch cost boundary');
assertIncludes(firebaseDoc, 'AI/provider calls | 0', 'Customer FAQ Reply Pack AI/provider cost boundary');
assertIncludes(mobileDoc, 'without login', 'Customer FAQ Reply Pack mobile V0 route boundary');
assertIncludes(testCasesDoc, 'read customer conversations, created a chatbot, configured automation, sent a message, fetched links, stored reports, checked rankings, or called AI/search providers', 'Customer FAQ Reply Pack forbidden-claim test boundary');
assertIncludes(validationDoc, 'V0 validation evidence; not current launch certification', 'Customer FAQ Reply Pack validation launch boundary');

assertIncludes(toolsReadmeDoc, '[customer-faq-reply-pack](./customer-faq-reply-pack/README.md)', 'MenuList Tools README');
assertIncludes(familyReadmeDoc, '[Customer FAQ Reply Pack](../customer-faq-reply-pack/README.md)', 'Public Truth Tools family docs');
assertIncludes(familyReadmeDoc, '/tools/customer-faq-reply-pack', 'Public Truth Tools route list');
assertIncludes(familyImplDoc, 'customerFaqReplyPackReport.ts', 'Public Truth Tools implementation docs');
assertIncludes(familyFirebaseDoc, 'customer-faq-reply-pack/customer-faq-reply-pack_firebase.md', 'Public Truth Tools Firebase docs');
assertIncludes(familyTestsDoc, 'Customer FAQ Reply Pack', 'Public Truth Tools test docs');
assertIncludes(shareableReadmeDoc, '| Customer FAQ Reply Pack | `/tools/customer-faq-reply-pack` | Implemented: Copy public report link |', 'Shareable Tool Reports docs');
assertIncludes(toolsHubReadmeDoc, 'Customer FAQ Reply Pack', 'Tools Hub docs');

assertIncludes(route, 'WebsitePageStructuredData', 'Customer FAQ Reply Pack route structured data');
assertIncludes(route, 'path="/tools/customer-faq-reply-pack"', 'Customer FAQ Reply Pack structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'Customer FAQ Reply Pack route feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_CUSTOMER_FAQ_REPLY_PACK', 'Customer FAQ Reply Pack route feature flag');

assertIncludes(component, "useTranslations('Website.CustomerFaqReplyPackPage')", 'Customer FAQ Reply Pack localized copy');
assertIncludes(component, 'buildCustomerFaqReplyPackReport(form)', 'Customer FAQ Reply Pack browser-local report builder');
assertIncludes(component, 'check.evidenceText', 'Customer FAQ Reply Pack explicit evidence text rendering');
assertIncludes(component, 'block.evidenceText', 'Customer FAQ Reply Pack reply-block evidence text rendering');
assertIncludes(component, 'buildShareablePublicTruthToolReportPayload', 'Customer FAQ Reply Pack shareable report payload');
assertIncludes(component, "toolId: 'customer-faq-reply-pack'", 'Customer FAQ Reply Pack shareable report tool id');
assertIncludes(component, 'copyRuntimeTextToClipboard(buildCopyBlockText(block))', 'Customer FAQ Reply Pack copy-block action');
assertIncludes(component, 'copyRuntimeTextToClipboard(reportText)', 'Customer FAQ Reply Pack report copy action');
assertIncludes(component, 'copyRuntimeTextToClipboard(shareableReportUrl)', 'Customer FAQ Reply Pack share-link copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'Customer FAQ Reply Pack report download action');
assertIncludes(component, "fetch('/api/public/contact'", 'Customer FAQ Reply Pack consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'Customer FAQ Reply Pack contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'Customer FAQ Reply Pack contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'Customer FAQ Reply Pack contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'Customer FAQ Reply Pack bounded contact response parsing');
assertIncludes(component, "isAcceptedMenulistPublicContactResponse(result, 'general')", 'Customer FAQ Reply Pack shaped contact acknowledgement guard');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse', 'Customer FAQ Reply Pack invalid contact acknowledgement diagnostic helper');
assertIncludes(component, 'TurnstileWidget', 'Customer FAQ Reply Pack contact handoff security check');
assertNotIncludes(component, '!result?.accepted', 'Customer FAQ Reply Pack must not accept generic contact accepted flag');
assertIncludes(component, "trackWebsiteMarketingEvent('customer_faq_reply_pack_completed'", 'Customer FAQ Reply Pack completion analytics');
assertIncludes(component, "mode: 'self_report'", 'Customer FAQ Reply Pack input contract');

assertIncludes(types, 'evidenceText: string', 'Customer FAQ Reply Pack evidence text type');
for (const needle of [
  'conversationLogsRead: false',
  'chatbotCreated: false',
  'messageSent: false',
  'automationConfigured: false',
  'externalUrlFetched: false',
  'externalPlatformUpdated: false',
  'reportStored: false',
  'aiAnswerGenerated: false',
  'aiOrSearchChecked: false',
  'rankingPromise: false',
]) {
  assertIncludes(types, needle, `Customer FAQ Reply Pack boundary type ${needle}`);
  assertIncludes(report, needle, `Customer FAQ Reply Pack report boundary ${needle}`);
}

assertIncludes(report, 'getCustomerFaqReplyPackEvidenceText', 'Customer FAQ Reply Pack explicit evidence text');
assertIncludes(report, 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.', 'Customer FAQ Reply Pack URL evidence boundary');
assertIncludes(report, 'FAQ replies were generated from owner-entered facts only. No AI answer was generated.', 'Customer FAQ Reply Pack deterministic reply evidence boundary');
assertIncludes(report, 'No customer conversation logs were read, no chatbot was created, no automation was configured, and no message was sent.', 'Customer FAQ Reply Pack automation evidence boundary');

for (const content of [route, report, types]) {
  assertNotIncludes(content, 'fetch(', 'Customer FAQ Reply Pack default runtime');
  assertNotIncludes(content, 'firebase', 'Customer FAQ Reply Pack default runtime');
  assertNotIncludes(content, 'firestore', 'Customer FAQ Reply Pack default runtime');
  assertNotIncludes(content, 'addDoc', 'Customer FAQ Reply Pack default runtime');
  assertNotIncludes(content, 'setDoc', 'Customer FAQ Reply Pack default runtime');
  assertNotIncludes(content, 'updateDoc', 'Customer FAQ Reply Pack default runtime');
}

for (const content of [route, component, report, types]) {
  assertNotIncludes(content, 'fetch(form.currentCustomerLink', 'Customer FAQ Reply Pack external source boundary');
  assertNotIncludes(content, 'fetch(currentCustomerLink', 'Customer FAQ Reply Pack external source boundary');
  assertNotIncludes(content, 'fetch(input.currentCustomerLink', 'Customer FAQ Reply Pack external source boundary');
  assertNotIncludes(content, 'fetch(form.actionLink', 'Customer FAQ Reply Pack external action-link boundary');
  assertNotIncludes(content, 'fetch(actionLink', 'Customer FAQ Reply Pack external action-link boundary');
  assertNotIncludes(content, 'fetch(input.actionLink', 'Customer FAQ Reply Pack external action-link boundary');
  assertNotIncludes(content, 'firebase/firestore', 'Customer FAQ Reply Pack browser write boundary');
  assertNotIncludes(content, 'businessinformation.googleapis.com', 'Customer FAQ Reply Pack Google API boundary');
  assertNotIncludes(content, 'maps.googleapis.com', 'Customer FAQ Reply Pack Maps boundary');
  assertNotIncludes(content, 'whatsapp_business_messaging', 'Customer FAQ Reply Pack WhatsApp API boundary');
  assertNotIncludes(content, 'messages.send', 'Customer FAQ Reply Pack send boundary');
  assertNotIncludes(content, 'openai', 'Customer FAQ Reply Pack V0 AI boundary');
  assertNotIncludes(content, '@google/genai', 'Customer FAQ Reply Pack V0 AI boundary');
  assertNotIncludes(content, 'chatCompletion', 'Customer FAQ Reply Pack chatbot boundary');
  assertNotIncludes(content, 'rankTracker', 'Customer FAQ Reply Pack ranking boundary');
  assertNotIncludes(content, 'window.open', 'Customer FAQ Reply Pack must not open external links');
  assertNotIncludes(content, 'location.href', 'Customer FAQ Reply Pack must not navigate to external links');
  assertNotIncludes(content, 'location.assign', 'Customer FAQ Reply Pack must not navigate to external links');
  assertNotIncludes(content, 'we created a chatbot', 'Customer FAQ Reply Pack chatbot claim');
  assertNotIncludes(content, 'we sent your message', 'Customer FAQ Reply Pack message-send claim');
  assertNotIncludes(content, 'we scanned your website', 'Customer FAQ Reply Pack crawl claim');
  assertNotIncludes(content, 'stored your report', 'Customer FAQ Reply Pack report storage claim');
  assertNotIncludes(content, 'rank higher', 'Customer FAQ Reply Pack ranking claim');
  assertNotIncludes(content, 'guaranteed ranking', 'Customer FAQ Reply Pack ranking claim');
  assertNotIncludes(content, 'guaranteed citation', 'Customer FAQ Reply Pack citation claim');
  assertNotIncludes(content, 'guaranteed AI visibility', 'Customer FAQ Reply Pack AI visibility claim');
}

assertIncludes(discoveryPolicy, "path: '/tools/customer-faq-reply-pack'", 'Customer FAQ Reply Pack discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/customer-faq-reply-pack', 'Customer FAQ Reply Pack sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/customer-faq-reply-pack', 'Customer FAQ Reply Pack llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/customer-faq-reply-pack', 'Customer FAQ Reply Pack llms-full.txt');
assert(enUS.Website.CustomerFaqReplyPackPage, 'en-US CustomerFaqReplyPackPage locale namespace must exist');
assert(hiIN.Website.CustomerFaqReplyPackPage, 'hi-IN CustomerFaqReplyPackPage locale namespace must exist');
assert(enUS.Website.ToolsHubPage.tools.customerFaqReplyPack, 'en-US Tools Hub Customer FAQ Reply Pack card must exist');
assert(hiIN.Website.ToolsHubPage.tools.customerFaqReplyPack, 'hi-IN Tools Hub Customer FAQ Reply Pack card must exist');

console.log('Customer FAQ Reply Pack verification passed');
