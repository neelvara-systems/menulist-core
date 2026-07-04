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

const ROUTE_PATH = 'src/app/(website)/tools/whatsapp-reply-pack/page.tsx';
const COMPONENT_PATH = 'src/components/website/whatsappReplyPack/WhatsAppReplyPackPage.tsx';
const REPORT_PATH = 'src/lib/public-truth-tools/whatsappReplyPackReport.ts';
const TYPES_PATH = 'src/lib/public-truth-tools/whatsappReplyPackTypes.ts';
const DOC_ROOT_PATH = '__docs__/menulist-tools/whatsapp-reply-pack';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/whatsapp-reply-pack_spec.md`,
  `${DOC_ROOT_PATH}/whatsapp-reply-pack_impl.md`,
  `${DOC_ROOT_PATH}/whatsapp-reply-pack_marketing.md`,
  `${DOC_ROOT_PATH}/whatsapp-reply-pack_website.md`,
  `${DOC_ROOT_PATH}/whatsapp-reply-pack_helpdoc.md`,
  `${DOC_ROOT_PATH}/whatsapp-reply-pack_firebase.md`,
  `${DOC_ROOT_PATH}/whatsapp-reply-pack_mobile-support.md`,
  `${DOC_ROOT_PATH}/whatsapp-reply-pack_test-cases.md`,
  `${DOC_ROOT_PATH}/whatsapp-reply-pack_validation.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  REPORT_PATH,
  TYPES_PATH,
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `WhatsApp Reply Pack file missing: ${file}`);
}

assert(!exists('__docs__/whatsapp-reply-pack'), 'WhatsApp Reply Pack docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/whatsapp-reply-pack/report/route.ts'), 'WhatsApp Reply Pack must not add a report API route in V0');
assert(!exists('src/app/api/public-truth-tools/whatsapp-reply-pack/route.ts'), 'WhatsApp Reply Pack must not add a report API route in V0');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const report = read(REPORT_PATH);
const types = read(TYPES_PATH);
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/whatsapp-reply-pack_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/whatsapp-reply-pack_impl.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/whatsapp-reply-pack_firebase.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/whatsapp-reply-pack_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/whatsapp-reply-pack_test-cases.md`);
const validationDoc = read(`${DOC_ROOT_PATH}/whatsapp-reply-pack_validation.md`);
const familyReadmeDoc = read('__docs__/menulist-tools/public-truth-tools/README.md');
const familyImplDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_impl.md');
const familyFirebaseDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_firebase.md');
const familyTestsDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_test-cases.md');
const toolsReadmeDoc = read('__docs__/menulist-tools/README.md');
const shareableReadmeDoc = read('__docs__/menulist-tools/shareable-tool-reports/README.md');
const toolsHubReadmeDoc = read('__docs__/menulist-tools/tools-hub/README.md');
const features = read('src/config/features.ts');
const discoveryPolicy = read('src/lib/seo/discoveryPolicy.ts');
const sitemap = read('public/sitemap.xml');
const llms = read('public/llms.txt');
const llmsFull = read('public/llms-full.txt');
const packageJson = read('package.json');
const aggregateVerifier = read('scripts/verification/verify-public-truth-tools.js');
const toolsHubVerifier = read('scripts/verification/verify-tools-hub.js');
const shareableVerifier = read('scripts/verification/verify-shareable-tool-reports.js');
const enUS = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
const hiIN = JSON.parse(read('public/locales/menulist.ai/hi-IN.json'));

assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_TOOLS: true', 'Public Truth Tools feature flag');
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_WHATSAPP_REPLY_PACK: true', 'WhatsApp Reply Pack feature flag');
assertIncludes(features, '__docs__/menulist-tools/whatsapp-reply-pack/whatsapp-reply-pack_impl.md', 'WhatsApp Reply Pack doc pointer');
assertIncludes(packageJson, '"verify:whatsapp-reply-pack"', 'WhatsApp Reply Pack package verifier');
assertIncludes(aggregateVerifier, 'verify-whatsapp-reply-pack.js', 'Public Truth Tools aggregate verifier');
assertIncludes(aggregateVerifier, "slug: 'whatsapp-reply-pack'", 'Public Truth Tools manifest');
assertIncludes(toolsHubVerifier, "'/tools/whatsapp-reply-pack'", 'Tools Hub verifier route list');
assertIncludes(shareableVerifier, "'whatsapp-reply-pack'", 'Shareable Tool Reports source list');

assertIncludes(readmeDoc, '## Version Ladder', 'WhatsApp Reply Pack README');
assertIncludes(readmeDoc, 'npm run verify:whatsapp-reply-pack', 'WhatsApp Reply Pack README source gate');
assertIncludes(specDoc, 'V0 must not:', 'WhatsApp Reply Pack V0 forbidden scope');
assertIncludes(specDoc, 'No AI rewrite is generated.', 'WhatsApp Reply Pack deterministic copy boundary');
assertIncludes(implDoc, 'evidenceText: string', 'WhatsApp Reply Pack implementation evidence contract');
assertIncludes(implDoc, 'Boundary flags are all false', 'WhatsApp Reply Pack implementation boundary flags');
assertIncludes(implDoc, 'The only allowed network write is the optional consented `/api/public/contact` handoff.', 'WhatsApp Reply Pack contact boundary');
assertIncludes(firebaseDoc, 'External fetches | 0', 'WhatsApp Reply Pack external fetch cost boundary');
assertIncludes(firebaseDoc, 'WhatsApp API calls | 0', 'WhatsApp Reply Pack external API cost boundary');
assertIncludes(firebaseDoc, 'AI/provider calls | 0', 'WhatsApp Reply Pack AI/provider cost boundary');
assertIncludes(mobileDoc, 'public route works without login', 'WhatsApp Reply Pack mobile V0 route boundary');
assertIncludes(testCasesDoc, 'sent a WhatsApp message, verified the number, opened WhatsApp, fetched links, stored reports, checked rankings, or called AI/search providers', 'WhatsApp Reply Pack forbidden-claim test boundary');
assertIncludes(validationDoc, 'V0 validation evidence; not current launch certification', 'WhatsApp Reply Pack validation launch boundary');
assertIncludes(validationDoc, 'npm run verify:whatsapp-reply-pack', 'WhatsApp Reply Pack validation source gate');
assertIncludes(toolsReadmeDoc, '[whatsapp-reply-pack](./whatsapp-reply-pack/README.md)', 'MenuList Tools README');
assertIncludes(familyReadmeDoc, '[WhatsApp Reply Pack](../whatsapp-reply-pack/README.md)', 'Public Truth Tools family docs');
assertIncludes(familyReadmeDoc, '/tools/whatsapp-reply-pack', 'Public Truth Tools route list');
assertIncludes(familyImplDoc, 'whatsappReplyPackReport.ts', 'Public Truth Tools implementation docs');
assertIncludes(familyFirebaseDoc, 'WhatsApp Reply Pack', 'Public Truth Tools Firebase docs');
assertIncludes(familyTestsDoc, 'PTT-014B', 'Public Truth Tools test boundary');
assertIncludes(shareableReadmeDoc, '| WhatsApp Reply Pack | `/tools/whatsapp-reply-pack` | Implemented: Copy public report link |', 'Shareable Tool Reports docs');
assertIncludes(toolsHubReadmeDoc, 'WhatsApp Reply Pack', 'Tools Hub docs');

assertIncludes(route, 'WebsitePageStructuredData', 'WhatsApp Reply Pack route structured data');
assertIncludes(route, 'path="/tools/whatsapp-reply-pack"', 'WhatsApp Reply Pack structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'WhatsApp Reply Pack route feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_WHATSAPP_REPLY_PACK', 'WhatsApp Reply Pack route feature flag');

assertIncludes(component, "useTranslations('Website.WhatsAppReplyPackPage')", 'WhatsApp Reply Pack localized copy');
assertIncludes(component, 'buildWhatsAppReplyPackReport(form)', 'WhatsApp Reply Pack browser-local report builder');
assertIncludes(component, 'check.evidenceText', 'WhatsApp Reply Pack explicit evidence text rendering');
assertIncludes(component, 'block.evidenceText', 'WhatsApp Reply Pack reply-block evidence text rendering');
assertIncludes(component, 'buildShareablePublicTruthToolReportPayload', 'WhatsApp Reply Pack shareable report payload');
assertIncludes(component, "toolId: 'whatsapp-reply-pack'", 'WhatsApp Reply Pack shareable report tool id');
assertIncludes(component, 'copyRuntimeTextToClipboard(buildCopyBlockText(block))', 'WhatsApp Reply Pack copy-block action');
assertIncludes(component, 'copyRuntimeTextToClipboard(reportText)', 'WhatsApp Reply Pack report copy action');
assertIncludes(component, 'copyRuntimeTextToClipboard(shareableReportUrl)', 'WhatsApp Reply Pack share-link copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'WhatsApp Reply Pack report download action');
assertIncludes(component, "fetch('/api/public/contact'", 'WhatsApp Reply Pack consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'WhatsApp Reply Pack contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'WhatsApp Reply Pack contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'WhatsApp Reply Pack contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'WhatsApp Reply Pack bounded contact response parsing');
assertIncludes(component, "isAcceptedMenulistPublicContactResponse(result, 'general')", 'WhatsApp Reply Pack shaped contact acknowledgement guard');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse', 'WhatsApp Reply Pack invalid contact acknowledgement diagnostic helper');
assertIncludes(component, 'TurnstileWidget', 'WhatsApp Reply Pack contact handoff security check');
assertNotIncludes(component, '!result?.accepted', 'WhatsApp Reply Pack must not accept generic contact accepted flag');
assertIncludes(component, "trackWebsiteMarketingEvent('whatsapp_reply_pack_completed'", 'WhatsApp Reply Pack completion analytics');
assertIncludes(component, "mode: 'self_report'", 'WhatsApp Reply Pack input contract');

assertIncludes(types, 'evidenceText: string', 'WhatsApp Reply Pack evidence text type');
assertIncludes(types, 'messageSent: false', 'WhatsApp Reply Pack message boundary type');
assertIncludes(types, 'whatsappApiCalled: false', 'WhatsApp Reply Pack API boundary type');
assertIncludes(types, 'phoneNumberVerified: false', 'WhatsApp Reply Pack phone verification boundary type');
assertIncludes(types, 'whatsappLinkOpened: false', 'WhatsApp Reply Pack link open boundary type');
assertIncludes(types, 'externalUrlFetched: false', 'WhatsApp Reply Pack external URL boundary type');
assertIncludes(types, 'externalPlatformUpdated: false', 'WhatsApp Reply Pack external mutation boundary type');
assertIncludes(types, 'reportStored: false', 'WhatsApp Reply Pack report storage boundary type');
assertIncludes(types, 'aiRewriteGenerated: false', 'WhatsApp Reply Pack AI rewrite boundary type');
assertIncludes(types, 'aiOrSearchChecked: false', 'WhatsApp Reply Pack AI/search boundary type');
assertIncludes(types, 'rankingPromise: false', 'WhatsApp Reply Pack ranking boundary type');

for (const needle of [
  'messageSent: false',
  'whatsappApiCalled: false',
  'phoneNumberVerified: false',
  'whatsappLinkOpened: false',
  'externalUrlFetched: false',
  'externalPlatformUpdated: false',
  'reportStored: false',
  'aiRewriteGenerated: false',
  'aiOrSearchChecked: false',
  'rankingPromise: false',
]) {
  assertIncludes(report, needle, `WhatsApp Reply Pack report boundary ${needle}`);
}

assertIncludes(report, 'getWhatsAppReplyPackEvidenceText', 'WhatsApp Reply Pack explicit evidence text');
assertIncludes(report, 'Phone number shape was checked locally. The number was not verified with WhatsApp.', 'WhatsApp Reply Pack phone evidence boundary');
assertIncludes(report, 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.', 'WhatsApp Reply Pack URL evidence boundary');
assertIncludes(report, 'Replies were generated from owner-entered facts only. No AI rewrite was generated.', 'WhatsApp Reply Pack deterministic reply evidence boundary');
assertIncludes(report, 'WhatsApp was not opened, no API was called, and no message was sent.', 'WhatsApp Reply Pack message evidence boundary');

for (const content of [route, report, types]) {
  assertNotIncludes(content, 'fetch(', 'WhatsApp Reply Pack default runtime');
  assertNotIncludes(content, 'firebase', 'WhatsApp Reply Pack default runtime');
  assertNotIncludes(content, 'firestore', 'WhatsApp Reply Pack default runtime');
  assertNotIncludes(content, 'addDoc', 'WhatsApp Reply Pack default runtime');
  assertNotIncludes(content, 'setDoc', 'WhatsApp Reply Pack default runtime');
  assertNotIncludes(content, 'updateDoc', 'WhatsApp Reply Pack default runtime');
}

for (const content of [component, route, report, types]) {
  assertNotIncludes(content, 'fetch(form.currentCustomerLink', 'WhatsApp Reply Pack external source boundary');
  assertNotIncludes(content, 'fetch(currentCustomerLink', 'WhatsApp Reply Pack external source boundary');
  assertNotIncludes(content, 'fetch(input.currentCustomerLink', 'WhatsApp Reply Pack external source boundary');
  assertNotIncludes(content, 'fetch(form.actionLink', 'WhatsApp Reply Pack external action-link boundary');
  assertNotIncludes(content, 'fetch(actionLink', 'WhatsApp Reply Pack external action-link boundary');
  assertNotIncludes(content, 'fetch(input.actionLink', 'WhatsApp Reply Pack external action-link boundary');
  assertNotIncludes(content, 'fetch(report.', 'WhatsApp Reply Pack external source boundary');
  assertNotIncludes(content, 'firebase/firestore', 'WhatsApp Reply Pack browser write boundary');
  assertNotIncludes(content, 'businessinformation.googleapis.com', 'WhatsApp Reply Pack Google API boundary');
  assertNotIncludes(content, 'maps.googleapis.com', 'WhatsApp Reply Pack Maps boundary');
  assertNotIncludes(content, 'whatsapp_business_messaging', 'WhatsApp Reply Pack WhatsApp API boundary');
  assertNotIncludes(content, 'messages.send', 'WhatsApp Reply Pack WhatsApp send boundary');
  assertNotIncludes(content, 'openai', 'WhatsApp Reply Pack V0 AI boundary');
  assertNotIncludes(content, '@google/genai', 'WhatsApp Reply Pack V0 AI boundary');
  assertNotIncludes(content, 'chatCompletion', 'WhatsApp Reply Pack chatbot boundary');
  assertNotIncludes(content, 'rankTracker', 'WhatsApp Reply Pack ranking boundary');
  assertNotIncludes(content, 'window.open', 'WhatsApp Reply Pack must not open WhatsApp or external links');
  assertNotIncludes(content, 'location.href', 'WhatsApp Reply Pack must not navigate to external links');
  assertNotIncludes(content, 'location.assign', 'WhatsApp Reply Pack must not navigate to external links');
  assertNotIncludes(content, 'href={report.previewLink}', 'WhatsApp Reply Pack must not make preview auto-open from report');
}

for (const content of [route, component, report, types, llms, llmsFull]) {
  assertNotIncludes(content, 'we sent your message', 'WhatsApp Reply Pack message-send claim');
  assertNotIncludes(content, 'verified your WhatsApp', 'WhatsApp Reply Pack verification claim');
  assertNotIncludes(content, 'we opened WhatsApp', 'WhatsApp Reply Pack external open claim');
  assertNotIncludes(content, 'we scanned your website', 'WhatsApp Reply Pack crawl claim');
  assertNotIncludes(content, 'stored your report', 'WhatsApp Reply Pack report storage claim');
  assertNotIncludes(content, 'rank higher', 'WhatsApp Reply Pack ranking claim');
  assertNotIncludes(content, 'guaranteed ranking', 'WhatsApp Reply Pack ranking claim');
  assertNotIncludes(content, 'guaranteed citation', 'WhatsApp Reply Pack citation claim');
  assertNotIncludes(content, 'guaranteed AI visibility', 'WhatsApp Reply Pack AI visibility claim');
}

assertIncludes(discoveryPolicy, "path: '/tools/whatsapp-reply-pack'", 'WhatsApp Reply Pack discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/whatsapp-reply-pack', 'WhatsApp Reply Pack sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/whatsapp-reply-pack', 'WhatsApp Reply Pack llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/whatsapp-reply-pack', 'WhatsApp Reply Pack llms-full.txt');

assert(enUS.Website?.WhatsAppReplyPackPage, 'en-US WhatsAppReplyPackPage locale keys must exist');
assert(hiIN.Website?.WhatsAppReplyPackPage, 'hi-IN WhatsAppReplyPackPage locale keys must exist');
assert(enUS.Website.ToolsHubPage.tools.whatsappReplyPack, 'en-US Tools Hub WhatsApp Reply Pack card must exist');
assert(hiIN.Website.ToolsHubPage.tools.whatsappReplyPack, 'hi-IN Tools Hub WhatsApp Reply Pack card must exist');
assert(enUS.Website.WhatsAppReplyPackPage.checks.whatsapp_number, 'en-US WhatsApp number copy must exist');
assert(hiIN.Website.WhatsAppReplyPackPage.checks.whatsapp_number, 'hi-IN WhatsApp number copy must exist');
assert(enUS.Website.WhatsAppReplyPackPage.copyBlocks.greeting_reply, 'en-US reply-block copy must exist');
assert(hiIN.Website.WhatsAppReplyPackPage.copyBlocks.greeting_reply, 'hi-IN reply-block copy must exist');
assert(enUS.Website.WhatsAppReplyPackPage.handoff?.submit, 'en-US handoff submit key must exist');
assert(hiIN.Website.WhatsAppReplyPackPage.handoff?.submit, 'hi-IN handoff submit key must exist');

console.log('WhatsApp Reply Pack verification passed');
