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

const ROUTE_PATH = 'src/app/(website)/tools/whatsapp-action-link-check/page.tsx';
const COMPONENT_PATH = 'src/components/website/whatsappActionLinkCheck/WhatsAppActionLinkCheckPage.tsx';
const REPORT_PATH = 'src/lib/public-truth-tools/whatsappActionLinkReport.ts';
const TYPES_PATH = 'src/lib/public-truth-tools/whatsappActionLinkTypes.ts';
const DOC_ROOT_PATH = '__docs__/menulist-tools/whatsapp-action-link-check';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/whatsapp-action-link-check_spec.md`,
  `${DOC_ROOT_PATH}/whatsapp-action-link-check_impl.md`,
  `${DOC_ROOT_PATH}/whatsapp-action-link-check_marketing.md`,
  `${DOC_ROOT_PATH}/whatsapp-action-link-check_website.md`,
  `${DOC_ROOT_PATH}/whatsapp-action-link-check_helpdoc.md`,
  `${DOC_ROOT_PATH}/whatsapp-action-link-check_firebase.md`,
  `${DOC_ROOT_PATH}/whatsapp-action-link-check_mobile-support.md`,
  `${DOC_ROOT_PATH}/whatsapp-action-link-check_test-cases.md`,
  `${DOC_ROOT_PATH}/whatsapp-action-link-check_validation.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  REPORT_PATH,
  TYPES_PATH,
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `WhatsApp Action Link Check file missing: ${file}`);
}

assert(!exists('__docs__/whatsapp-action-link-check'), 'WhatsApp Action Link Check docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/whatsapp-action-link-check/report/route.ts'), 'WhatsApp Action Link Check must not add a report API route in V0');
assert(!exists('src/app/api/public-truth-tools/whatsapp-action-link-check/route.ts'), 'WhatsApp Action Link Check must not add a report API route in V0');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const report = read(REPORT_PATH);
const types = read(TYPES_PATH);
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/whatsapp-action-link-check_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/whatsapp-action-link-check_impl.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/whatsapp-action-link-check_firebase.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/whatsapp-action-link-check_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/whatsapp-action-link-check_test-cases.md`);
const validationDoc = read(`${DOC_ROOT_PATH}/whatsapp-action-link-check_validation.md`);
const familyReadmeDoc = read('__docs__/menulist-tools/public-truth-tools/README.md');
const familyImplDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_impl.md');
const familyFirebaseDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_firebase.md');
const features = read('src/config/features.ts');
const discoveryPolicy = read('src/lib/seo/discoveryPolicy.ts');
const sitemap = read('public/sitemap.xml');
const llms = read('public/llms.txt');
const llmsFull = read('public/llms-full.txt');
const packageJson = read('package.json');
const enUS = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
const hiIN = JSON.parse(read('public/locales/menulist.ai/hi-IN.json'));

assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_TOOLS: true', 'Public Truth Tools feature flag');
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_WHATSAPP_ACTION_LINK_CHECK: true', 'WhatsApp Action Link Check feature flag');
assertIncludes(features, '__docs__/menulist-tools/whatsapp-action-link-check/whatsapp-action-link-check_impl.md', 'WhatsApp Action Link Check doc pointer');
assertIncludes(packageJson, '"verify:whatsapp-action-link-check"', 'WhatsApp Action Link Check package verifier');

assertIncludes(readmeDoc, '## Version Ladder', 'WhatsApp Action Link Check README');
assertIncludes(specDoc, 'Every row includes `evidenceText`', 'WhatsApp Action Link Check report evidence contract');
assertIncludes(specDoc, 'send a WhatsApp message', 'WhatsApp Action Link Check send boundary');
assertIncludes(implDoc, 'evidenceText: string', 'WhatsApp Action Link Check implementation evidence contract');
assertIncludes(implDoc, 'Do not add WhatsApp Business API, click-to-send, deep-link opening, phone verification, or account lookup in V0', 'WhatsApp Action Link Check provider boundary');
assertIncludes(firebaseDoc, 'WhatsApp API calls | 0', 'WhatsApp Action Link Check WhatsApp API cost boundary');
assertIncludes(firebaseDoc, 'Storage operations | 0', 'WhatsApp Action Link Check storage boundary');
assertIncludes(firebaseDoc, 'malformed WhatsApp link parse diagnostic is cost-neutral', 'WhatsApp Action Link Check parse diagnostic cost boundary');
assertIncludes(mobileDoc, 'Message sending | Not implemented', 'WhatsApp Action Link Check mobile send boundary');
assertIncludes(testCasesDoc, 'Message is not sent', 'WhatsApp Action Link Check send test boundary');
assertIncludes(testCasesDoc, 'whatsapp_action_link_url_parse_failed', 'WhatsApp Action Link Check parse diagnostic test case');
assertIncludes(validationDoc, 'No WhatsApp API integration', 'WhatsApp Action Link Check validation boundary');
assertIncludes(readmeDoc, 'whatsapp_action_link_url_parse_failed', 'WhatsApp Action Link Check parse diagnostic README boundary');
assertIncludes(implDoc, 'treat_as_invalid_whatsapp_link', 'WhatsApp Action Link Check parse diagnostic implementation boundary');
assertIncludes(familyReadmeDoc, '[WhatsApp Action Link Check](../whatsapp-action-link-check/README.md)', 'Public Truth Tools family docs');
assertIncludes(familyImplDoc, 'whatsappActionLinkReport.ts', 'Public Truth Tools implementation docs');
assertIncludes(familyFirebaseDoc, 'WhatsApp Action Link Check', 'Public Truth Tools Firebase docs');

assertIncludes(route, 'WebsitePageStructuredData', 'WhatsApp Action Link Check route structured data');
assertIncludes(route, 'path="/tools/whatsapp-action-link-check"', 'WhatsApp Action Link Check structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'WhatsApp Action Link Check route feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_WHATSAPP_ACTION_LINK_CHECK', 'WhatsApp Action Link Check route feature flag');

assertIncludes(component, "useTranslations('Website.WhatsAppActionLinkCheckPage')", 'WhatsApp Action Link Check localized copy');
assertIncludes(component, 'buildWhatsAppActionLinkReport(form)', 'WhatsApp Action Link Check browser-local report builder');
assertIncludes(component, "messageIntent: 'other'", 'WhatsApp Action Link Check honest untouched intent default');
assertIncludes(component, 'check.evidenceText', 'WhatsApp Action Link Check explicit evidence text rendering');
assertIncludes(component, 'href={report.nextAction.href}', 'WhatsApp Action Link Check MenuList next action');
assertIncludes(component, "fetch('/api/public/contact'", 'WhatsApp Action Link Check consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'WhatsApp Action Link Check contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'WhatsApp Action Link Check contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'WhatsApp Action Link Check contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'WhatsApp Action Link Check bounded contact response parsing');
assertIncludes(component, "isAcceptedMenulistPublicContactResponse(result, 'general')", 'WhatsApp Action Link Check shaped contact acknowledgement guard');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse', 'WhatsApp Action Link Check invalid contact acknowledgement diagnostic helper');
assertIncludes(component, 'TurnstileWidget', 'WhatsApp Action Link Check contact handoff security check');
assertNotIncludes(component, '!result?.accepted', 'WhatsApp Action Link Check must not accept generic contact accepted flag');
assertIncludes(component, 'copyRuntimeTextToClipboard(reportText)', 'WhatsApp Action Link Check report copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'WhatsApp Action Link Check report download action');
assertIncludes(component, "trackWebsiteMarketingEvent('whatsapp_action_link_check_completed'", 'WhatsApp Action Link Check completion analytics');
assertIncludes(component, "mode: 'self_report'", 'WhatsApp Action Link Check input contract');

assertIncludes(types, 'evidenceText: string', 'WhatsApp Action Link Check evidence text type');
assertIncludes(types, 'messageSent: false', 'WhatsApp Action Link Check message-send boundary type');
assertIncludes(types, 'phoneNumberVerified: false', 'WhatsApp Action Link Check phone verification boundary type');
assertIncludes(types, 'whatsappLinkOpened: false', 'WhatsApp Action Link Check link-open boundary type');
assertIncludes(types, 'externalUrlFetched: false', 'WhatsApp Action Link Check target fetch boundary type');
assertIncludes(types, 'externalPlatformUpdated: false', 'WhatsApp Action Link Check external mutation boundary type');
assertIncludes(types, 'aiOrSearchChecked: false', 'WhatsApp Action Link Check AI/search boundary type');
assertIncludes(types, 'rankingPromise: false', 'WhatsApp Action Link Check ranking boundary type');

assertIncludes(report, 'messageSent: false', 'WhatsApp Action Link Check report message-send boundary');
assertIncludes(report, 'phoneNumberVerified: false', 'WhatsApp Action Link Check report phone verification boundary');
assertIncludes(report, 'whatsappLinkOpened: false', 'WhatsApp Action Link Check report link-open boundary');
assertIncludes(report, 'externalUrlFetched: false', 'WhatsApp Action Link Check report target fetch boundary');
assertIncludes(report, 'externalPlatformUpdated: false', 'WhatsApp Action Link Check report external mutation boundary');
assertIncludes(report, 'aiOrSearchChecked: false', 'WhatsApp Action Link Check report AI/search boundary');
assertIncludes(report, 'rankingPromise: false', 'WhatsApp Action Link Check report ranking boundary');
assertIncludes(report, 'getWhatsAppActionLinkEvidenceText', 'WhatsApp Action Link Check explicit evidence text');
assertIncludes(report, 'The number was not verified with WhatsApp', 'WhatsApp Action Link Check number verification evidence boundary');
assertIncludes(report, 'Use digits only and include the country code for the customer WhatsApp number.', 'WhatsApp Action Link Check invalid phone guidance');
assertIncludes(report, 'const hasWhatsappNumber = Boolean(whatsappNumber);', 'WhatsApp Action Link Check phone evidence provenance');
assertIncludes(report, 'const hasExistingWhatsappLink = Boolean(existingWhatsappLink);', 'WhatsApp Action Link Check link evidence provenance');
assertIncludes(report, 'no message was sent', 'WhatsApp Action Link Check message send evidence boundary');
assertIncludes(report, 'Public HTTPS customer link format was checked locally. The link was not opened or fetched.', 'WhatsApp Action Link Check public HTTPS URL evidence boundary');
assertIncludes(report, "logRuntimeFailure('whatsapp_action_link_url_parse_failed'", 'WhatsApp Action Link Check parse diagnostic');
assertIncludes(report, 'MAX_WHATSAPP_ACTION_LINK_PARSE_DIAGNOSTICS', 'WhatsApp Action Link Check parse diagnostic cap');
assertIncludes(report, 'reportedWhatsAppActionLinkParseFailures.add(failureKey)', 'WhatsApp Action Link Check parse diagnostic shape guard');
assertIncludes(report, "fallbackPolicy: 'treat_as_invalid_whatsapp_link'", 'WhatsApp Action Link Check parse diagnostic fallback policy');
assertIncludes(report, 'candidateLooksLikeWhatsAppScheme', 'WhatsApp Action Link Check parse diagnostic bounded shape metadata');
assertIncludes(report, 'candidateLooksLikeWhatsAppHost', 'WhatsApp Action Link Check parse diagnostic bounded shape metadata');

for (const content of [route, report, types]) {
  assertNotIncludes(content, 'fetch(', 'WhatsApp Action Link Check default runtime');
  assertNotIncludes(content, 'firebase', 'WhatsApp Action Link Check default runtime');
  assertNotIncludes(content, 'firestore', 'WhatsApp Action Link Check default runtime');
  assertNotIncludes(content, 'addDoc', 'WhatsApp Action Link Check default runtime');
  assertNotIncludes(content, 'setDoc', 'WhatsApp Action Link Check default runtime');
  assertNotIncludes(content, 'updateDoc', 'WhatsApp Action Link Check default runtime');
}

for (const content of [component, route, report, types]) {
  assertNotIncludes(content, 'fetch(form.currentCustomerLink', 'WhatsApp Action Link Check external source boundary');
  assertNotIncludes(content, 'fetch(currentCustomerLink', 'WhatsApp Action Link Check external source boundary');
  assertNotIncludes(content, 'fetch(input.currentCustomerLink', 'WhatsApp Action Link Check external source boundary');
  assertNotIncludes(content, 'fetch(report.', 'WhatsApp Action Link Check external source boundary');
  assertNotIncludes(content, 'firebase/firestore', 'WhatsApp Action Link Check browser write boundary');
  assertNotIncludes(content, 'addDoc(', 'WhatsApp Action Link Check browser write boundary');
  assertNotIncludes(content, 'setDoc(', 'WhatsApp Action Link Check browser write boundary');
  assertNotIncludes(content, 'updateDoc(', 'WhatsApp Action Link Check browser write boundary');
  assertNotIncludes(content, 'FileReader', 'WhatsApp Action Link Check V0 upload boundary');
  assertNotIncludes(content, 'type="file"', 'WhatsApp Action Link Check V0 upload boundary');
  assertNotIncludes(content, 'storageRef', 'WhatsApp Action Link Check V0 upload boundary');
  assertNotIncludes(content, 'uploadBytes', 'WhatsApp Action Link Check V0 upload boundary');
  assertNotIncludes(content, 'openai', 'WhatsApp Action Link Check V0 AI boundary');
  assertNotIncludes(content, 'window.open', 'WhatsApp Action Link Check must not open WhatsApp links');
  assertNotIncludes(content, 'location.href', 'WhatsApp Action Link Check must not navigate to WhatsApp links');
  assertNotIncludes(content, 'location.assign', 'WhatsApp Action Link Check must not navigate to WhatsApp links');
  assertNotIncludes(content, 'href={report.previewLink}', 'WhatsApp Action Link Check preview link must not be clickable');
}

for (const content of [route, component, report, types, llms, llmsFull]) {
  assertNotIncludes(content, 'guaranteed ranking', 'WhatsApp Action Link Check claims');
  assertNotIncludes(content, 'guaranteed citation', 'WhatsApp Action Link Check claims');
  assertNotIncludes(content, 'guaranteed AI visibility', 'WhatsApp Action Link Check claims');
  assertNotIncludes(content, 'verified your WhatsApp', 'WhatsApp Action Link Check verification claim');
  assertNotIncludes(content, 'test message sent', 'WhatsApp Action Link Check send claim');
  assertNotIncludes(content, 'scanned your website', 'WhatsApp Action Link Check crawl claim');
}

assertIncludes(discoveryPolicy, "path: '/tools/whatsapp-action-link-check'", 'WhatsApp Action Link Check discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/whatsapp-action-link-check', 'WhatsApp Action Link Check sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/whatsapp-action-link-check', 'WhatsApp Action Link Check llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/whatsapp-action-link-check', 'WhatsApp Action Link Check llms-full.txt');

assert(enUS.Website?.WhatsAppActionLinkCheckPage, 'en-US WhatsAppActionLinkCheckPage locale keys must exist');
assert(hiIN.Website?.WhatsAppActionLinkCheckPage, 'hi-IN WhatsAppActionLinkCheckPage locale keys must exist');
assert(enUS.Website.WhatsAppActionLinkCheckPage.checks.message_delivery, 'en-US message delivery boundary copy must exist');
assert(hiIN.Website.WhatsAppActionLinkCheckPage.checks.message_delivery, 'hi-IN message delivery boundary copy must exist');
assert(enUS.Website.WhatsAppActionLinkCheckPage.reportActions?.copy, 'en-US report copy key must exist');
assert(enUS.Website.WhatsAppActionLinkCheckPage.handoff?.submit, 'en-US handoff submit key must exist');
assert(hiIN.Website.WhatsAppActionLinkCheckPage.reportActions?.copy, 'hi-IN report copy key must exist');
assert(hiIN.Website.WhatsAppActionLinkCheckPage.handoff?.submit, 'hi-IN handoff submit key must exist');

console.log('WhatsApp Action Link Check verification passed');
