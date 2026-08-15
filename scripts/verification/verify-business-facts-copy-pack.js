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

const ROUTE_PATH = 'src/app/(website)/tools/business-facts-copy-pack/page.tsx';
const COMPONENT_PATH = 'src/components/website/businessFactsCopyPack/BusinessFactsCopyPackPage.tsx';
const REPORT_PATH = 'src/lib/public-truth-tools/businessFactsCopyPackReport.ts';
const TYPES_PATH = 'src/lib/public-truth-tools/businessFactsCopyPackTypes.ts';
const DOC_ROOT_PATH = '__docs__/menulist-tools/business-facts-copy-pack';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/business-facts-copy-pack_spec.md`,
  `${DOC_ROOT_PATH}/business-facts-copy-pack_impl.md`,
  `${DOC_ROOT_PATH}/business-facts-copy-pack_marketing.md`,
  `${DOC_ROOT_PATH}/business-facts-copy-pack_website.md`,
  `${DOC_ROOT_PATH}/business-facts-copy-pack_helpdoc.md`,
  `${DOC_ROOT_PATH}/business-facts-copy-pack_firebase.md`,
  `${DOC_ROOT_PATH}/business-facts-copy-pack_mobile-support.md`,
  `${DOC_ROOT_PATH}/business-facts-copy-pack_test-cases.md`,
  `${DOC_ROOT_PATH}/business-facts-copy-pack_validation.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  REPORT_PATH,
  TYPES_PATH,
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `Business Facts Copy Pack file missing: ${file}`);
}

assert(!exists('__docs__/business-facts-copy-pack'), 'Business Facts Copy Pack docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/business-facts-copy-pack/report/route.ts'), 'Business Facts Copy Pack must not add a report API route in V0');
assert(!exists('src/app/api/public-truth-tools/business-facts-copy-pack/route.ts'), 'Business Facts Copy Pack must not add a report API route in V0');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const report = read(REPORT_PATH);
const types = read(TYPES_PATH);
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/business-facts-copy-pack_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/business-facts-copy-pack_impl.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/business-facts-copy-pack_firebase.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/business-facts-copy-pack_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/business-facts-copy-pack_test-cases.md`);
const validationDoc = read(`${DOC_ROOT_PATH}/business-facts-copy-pack_validation.md`);
const familyReadmeDoc = read('__docs__/menulist-tools/public-truth-tools/README.md');
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
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_BUSINESS_FACTS_COPY_PACK: true', 'Business Facts Copy Pack feature flag');
assertIncludes(features, '__docs__/menulist-tools/business-facts-copy-pack/business-facts-copy-pack_impl.md', 'Business Facts Copy Pack doc pointer');
assertIncludes(packageJson, '"verify:business-facts-copy-pack"', 'Business Facts Copy Pack package verifier');
assertIncludes(aggregateVerifier, 'verify-business-facts-copy-pack.js', 'Public Truth Tools aggregate verifier');

assertIncludes(readmeDoc, '## Version Ladder', 'Business Facts Copy Pack README');
assertIncludes(readmeDoc, 'npm run verify:business-facts-copy-pack', 'Business Facts Copy Pack README source gate');
assertIncludes(specDoc, 'All copy is deterministic string assembly from owner-entered facts plus explicit missing-fact placeholders. No AI rewrite is generated.', 'Business Facts Copy Pack deterministic copy boundary');
assertIncludes(validationDoc, 'copy blocks are generated from owner-entered facts plus explicit missing-fact placeholders', 'Business Facts Copy Pack validation placeholder boundary');
assertIncludes(specDoc, 'V0 must not:', 'Business Facts Copy Pack V0 forbidden scope');
assertIncludes(implDoc, 'evidenceText: string', 'Business Facts Copy Pack implementation evidence contract');
assertIncludes(implDoc, 'Boundary flags are all false', 'Business Facts Copy Pack implementation boundary flags');
assertIncludes(implDoc, 'The only allowed network write is the optional consented `/api/public/contact` handoff.', 'Business Facts Copy Pack contact boundary');
assertIncludes(firebaseDoc, 'External fetches | 0', 'Business Facts Copy Pack external fetch cost boundary');
assertIncludes(firebaseDoc, 'AI/provider calls | 0', 'Business Facts Copy Pack AI/provider cost boundary');
assertIncludes(firebaseDoc, 'Google/Instagram/Facebook/WhatsApp API calls | 0', 'Business Facts Copy Pack external API cost boundary');
assertIncludes(mobileDoc, 'public route works without login', 'Business Facts Copy Pack mobile V0 route boundary');
assertIncludes(testCasesDoc, 'Tool claims it fetched links, inspected profiles, updated platforms, stored reports, checked rankings, or called AI/search providers', 'Business Facts Copy Pack forbidden-claim test boundary');
assertIncludes(validationDoc, 'V0 validation evidence; not current launch certification', 'Business Facts Copy Pack validation launch boundary');
assertIncludes(validationDoc, 'npm run verify:business-facts-copy-pack', 'Business Facts Copy Pack validation source gate');
assertIncludes(toolsReadmeDoc, '[business-facts-copy-pack](./business-facts-copy-pack/README.md)', 'MenuList Tools README');
assertIncludes(familyReadmeDoc, '[Business Facts Copy Pack](../business-facts-copy-pack/README.md)', 'Public Truth Tools family docs');
assertIncludes(familyReadmeDoc, '/tools/business-facts-copy-pack', 'Public Truth Tools route list');
assertIncludes(familyImplDoc, 'businessFactsCopyPackReport.ts', 'Public Truth Tools implementation docs');
assertIncludes(familyFirebaseDoc, 'Business Facts Copy Pack', 'Public Truth Tools Firebase docs');
assertIncludes(familyTestsDoc, 'PTT-014A', 'Public Truth Tools test boundary');

assertIncludes(route, 'WebsitePageStructuredData', 'Business Facts Copy Pack route structured data');
assertIncludes(route, 'path="/tools/business-facts-copy-pack"', 'Business Facts Copy Pack structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'Business Facts Copy Pack route feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_BUSINESS_FACTS_COPY_PACK', 'Business Facts Copy Pack route feature flag');

assertIncludes(component, "useTranslations('Website.BusinessFactsCopyPackPage')", 'Business Facts Copy Pack localized copy');
assertIncludes(component, 'buildBusinessFactsCopyPackReport(form)', 'Business Facts Copy Pack browser-local report builder');
assertIncludes(component, 'check.evidenceText', 'Business Facts Copy Pack explicit evidence text rendering');
assertIncludes(component, 'block.evidenceText', 'Business Facts Copy Pack copy-block evidence text rendering');
assertIncludes(component, 'buildShareablePublicTruthToolReportPayload', 'Business Facts Copy Pack shareable report payload');
assertIncludes(component, "toolId: 'business-facts-copy-pack'", 'Business Facts Copy Pack shareable report tool id');
assertIncludes(component, 'copyRuntimeTextToClipboard(buildCopyBlockText(block))', 'Business Facts Copy Pack copy-block action');
assertIncludes(component, 'copyRuntimeTextToClipboard(reportText)', 'Business Facts Copy Pack report copy action');
assertIncludes(component, 'copyRuntimeTextToClipboard(shareableReportUrl)', 'Business Facts Copy Pack share-link copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'Business Facts Copy Pack report download action');
assertIncludes(component, "fetch('/api/public/contact'", 'Business Facts Copy Pack consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'Business Facts Copy Pack contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'Business Facts Copy Pack contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'Business Facts Copy Pack contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'Business Facts Copy Pack bounded contact response parsing');
assertIncludes(component, "isAcceptedMenulistPublicContactResponse(result, 'general')", 'Business Facts Copy Pack shaped contact acknowledgement guard');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse', 'Business Facts Copy Pack invalid contact acknowledgement diagnostic helper');
assertIncludes(component, 'TurnstileWidget', 'Business Facts Copy Pack contact handoff security check');
assertNotIncludes(component, '!result?.accepted', 'Business Facts Copy Pack must not accept generic contact accepted flag');
assertIncludes(component, "trackWebsiteMarketingEvent('business_facts_copy_pack_completed'", 'Business Facts Copy Pack completion analytics');
assertIncludes(component, "mode: 'self_report'", 'Business Facts Copy Pack input contract');

assertIncludes(types, 'evidenceText: string', 'Business Facts Copy Pack evidence text type');
assertIncludes(types, 'externalUrlFetched: false', 'Business Facts Copy Pack external URL boundary type');
assertIncludes(types, 'externalProfilesOpened: false', 'Business Facts Copy Pack external profile boundary type');
assertIncludes(types, 'externalPlatformUpdated: false', 'Business Facts Copy Pack external mutation boundary type');
assertIncludes(types, 'reportStored: false', 'Business Facts Copy Pack report storage boundary type');
assertIncludes(types, 'aiRewriteGenerated: false', 'Business Facts Copy Pack AI rewrite boundary type');
assertIncludes(types, 'aiOrSearchChecked: false', 'Business Facts Copy Pack AI/search boundary type');
assertIncludes(types, 'rankingPromise: false', 'Business Facts Copy Pack ranking boundary type');

assertIncludes(report, 'externalUrlFetched: false', 'Business Facts Copy Pack report external URL boundary');
assertIncludes(report, 'externalProfilesOpened: false', 'Business Facts Copy Pack report external profile boundary');
assertIncludes(report, 'externalPlatformUpdated: false', 'Business Facts Copy Pack report external mutation boundary');
assertIncludes(report, 'reportStored: false', 'Business Facts Copy Pack report storage boundary');
assertIncludes(report, 'aiRewriteGenerated: false', 'Business Facts Copy Pack report AI rewrite boundary');
assertIncludes(report, 'aiOrSearchChecked: false', 'Business Facts Copy Pack report AI/search boundary');
assertIncludes(report, 'rankingPromise: false', 'Business Facts Copy Pack report ranking boundary');
assertIncludes(report, 'getBusinessFactsCopyPackEvidenceText', 'Business Facts Copy Pack explicit evidence text');
assertIncludes(report, 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.', 'Business Facts Copy Pack URL evidence boundary');
assertIncludes(report, 'Copy uses owner-entered facts and explicit missing-fact placeholders only. No AI rewrite was generated.', 'Business Facts Copy Pack deterministic copy evidence boundary');
assertNotIncludes(report, 'Copy was generated from owner-entered facts only.', 'Business Facts Copy Pack stale deterministic copy evidence');
assertIncludes(report, 'return `${label}: add the best customer action`;', 'Business Facts Copy Pack fallback action punctuation');
assertIncludes(report, '`Best action: ${actionSentence}.`', 'Business Facts Copy Pack staff action punctuation');
assertIncludes(report, 'External profiles and platforms were not opened, inspected, or updated.', 'Business Facts Copy Pack external platform evidence boundary');

for (const content of [route, report, types]) {
  assertNotIncludes(content, 'fetch(', 'Business Facts Copy Pack default runtime');
  assertNotIncludes(content, 'firebase', 'Business Facts Copy Pack default runtime');
  assertNotIncludes(content, 'firestore', 'Business Facts Copy Pack default runtime');
  assertNotIncludes(content, 'addDoc', 'Business Facts Copy Pack default runtime');
  assertNotIncludes(content, 'setDoc', 'Business Facts Copy Pack default runtime');
  assertNotIncludes(content, 'updateDoc', 'Business Facts Copy Pack default runtime');
}

for (const content of [component, route, report, types]) {
  assertNotIncludes(content, 'fetch(form.currentCustomerLink', 'Business Facts Copy Pack external source boundary');
  assertNotIncludes(content, 'fetch(currentCustomerLink', 'Business Facts Copy Pack external source boundary');
  assertNotIncludes(content, 'fetch(input.currentCustomerLink', 'Business Facts Copy Pack external source boundary');
  assertNotIncludes(content, 'fetch(form.actionLink', 'Business Facts Copy Pack external action-link boundary');
  assertNotIncludes(content, 'fetch(actionLink', 'Business Facts Copy Pack external action-link boundary');
  assertNotIncludes(content, 'fetch(input.actionLink', 'Business Facts Copy Pack external action-link boundary');
  assertNotIncludes(content, 'fetch(report.', 'Business Facts Copy Pack external source boundary');
  assertNotIncludes(content, 'firebase/firestore', 'Business Facts Copy Pack browser write boundary');
  assertNotIncludes(content, 'businessinformation.googleapis.com', 'Business Facts Copy Pack Google API boundary');
  assertNotIncludes(content, 'maps.googleapis.com', 'Business Facts Copy Pack Maps boundary');
  assertNotIncludes(content, 'openai', 'Business Facts Copy Pack V0 AI boundary');
  assertNotIncludes(content, '@google/genai', 'Business Facts Copy Pack V0 AI boundary');
  assertNotIncludes(content, 'chatCompletion', 'Business Facts Copy Pack chatbot boundary');
  assertNotIncludes(content, 'rankTracker', 'Business Facts Copy Pack ranking boundary');
  assertNotIncludes(content, 'window.open', 'Business Facts Copy Pack must not open external links');
  assertNotIncludes(content, 'location.href', 'Business Facts Copy Pack must not navigate to external links');
  assertNotIncludes(content, 'location.assign', 'Business Facts Copy Pack must not navigate to external links');
}

for (const content of [route, component, report, types, llms, llmsFull]) {
  assertNotIncludes(content, 'we opened your link', 'Business Facts Copy Pack external inspection claim');
  assertNotIncludes(content, 'we scanned your website', 'Business Facts Copy Pack crawl claim');
  assertNotIncludes(content, 'we checked your Google profile', 'Business Facts Copy Pack profile inspection claim');
  assertNotIncludes(content, 'stored your report', 'Business Facts Copy Pack report storage claim');
  assertNotIncludes(content, 'rank higher', 'Business Facts Copy Pack ranking claim');
  assertNotIncludes(content, 'guaranteed ranking', 'Business Facts Copy Pack ranking claim');
  assertNotIncludes(content, 'guaranteed citation', 'Business Facts Copy Pack citation claim');
  assertNotIncludes(content, 'guaranteed AI visibility', 'Business Facts Copy Pack AI visibility claim');
}

assertIncludes(discoveryPolicy, "path: '/tools/business-facts-copy-pack'", 'Business Facts Copy Pack discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/business-facts-copy-pack', 'Business Facts Copy Pack sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/business-facts-copy-pack', 'Business Facts Copy Pack llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/business-facts-copy-pack', 'Business Facts Copy Pack llms-full.txt');

assert(enUS.Website?.BusinessFactsCopyPackPage, 'en-US BusinessFactsCopyPackPage locale keys must exist');
assert(hiIN.Website?.BusinessFactsCopyPackPage, 'hi-IN BusinessFactsCopyPackPage locale keys must exist');
assert(enUS.Website.ToolsHubPage.tools.businessFactsCopyPack, 'en-US Tools Hub Business Facts Copy Pack card must exist');
assert(hiIN.Website.ToolsHubPage.tools.businessFactsCopyPack, 'hi-IN Tools Hub Business Facts Copy Pack card must exist');
assert(enUS.Website.BusinessFactsCopyPackPage.checks.business_identity, 'en-US business identity copy must exist');
assert(hiIN.Website.BusinessFactsCopyPackPage.checks.business_identity, 'hi-IN business identity copy must exist');
assert(enUS.Website.BusinessFactsCopyPackPage.copyBlocks.google_profile_description, 'en-US copy-block copy must exist');
assert(hiIN.Website.BusinessFactsCopyPackPage.copyBlocks.google_profile_description, 'hi-IN copy-block copy must exist');
assert(enUS.Website.BusinessFactsCopyPackPage.handoff?.submit, 'en-US handoff submit key must exist');
assert(hiIN.Website.BusinessFactsCopyPackPage.handoff?.submit, 'hi-IN handoff submit key must exist');

console.log('Business Facts Copy Pack verification passed');
