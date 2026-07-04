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

const ROUTE_PATH = 'src/app/(website)/tools/social-bio-link-check/page.tsx';
const COMPONENT_PATH = 'src/components/website/socialBioLinkCheck/SocialBioLinkCheckPage.tsx';
const REPORT_PATH = 'src/lib/public-truth-tools/socialBioLinkCheckReport.ts';
const TYPES_PATH = 'src/lib/public-truth-tools/socialBioLinkCheckTypes.ts';
const DOC_ROOT_PATH = '__docs__/menulist-tools/social-bio-link-check';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/social-bio-link-check_spec.md`,
  `${DOC_ROOT_PATH}/social-bio-link-check_impl.md`,
  `${DOC_ROOT_PATH}/social-bio-link-check_marketing.md`,
  `${DOC_ROOT_PATH}/social-bio-link-check_website.md`,
  `${DOC_ROOT_PATH}/social-bio-link-check_helpdoc.md`,
  `${DOC_ROOT_PATH}/social-bio-link-check_firebase.md`,
  `${DOC_ROOT_PATH}/social-bio-link-check_mobile-support.md`,
  `${DOC_ROOT_PATH}/social-bio-link-check_test-cases.md`,
  `${DOC_ROOT_PATH}/social-bio-link-check_validation.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  REPORT_PATH,
  TYPES_PATH,
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `Social Bio Link Consistency Check file missing: ${file}`);
}

assert(!exists('__docs__/social-bio-link-check'), 'Social Bio Link Consistency Check docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/social-bio-link-check/report/route.ts'), 'Social Bio Link Consistency Check must not add a report API route in V0');
assert(!exists('src/app/api/public-truth-tools/social-bio-link-check/route.ts'), 'Social Bio Link Consistency Check must not add a report API route in V0');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const report = read(REPORT_PATH);
const types = read(TYPES_PATH);
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/social-bio-link-check_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/social-bio-link-check_impl.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/social-bio-link-check_firebase.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/social-bio-link-check_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/social-bio-link-check_test-cases.md`);
const validationDoc = read(`${DOC_ROOT_PATH}/social-bio-link-check_validation.md`);
const familyReadmeDoc = read('__docs__/menulist-tools/public-truth-tools/README.md');
const familySpecDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_spec.md');
const familyImplDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_impl.md');
const familyFirebaseDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_firebase.md');
const familyTestsDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_test-cases.md');
const toolsReadmeDoc = read('__docs__/menulist-tools/README.md');
const toolsHubComponent = read('src/components/website/toolsHub/ToolsHubPage.tsx');
const toolsHubVerifier = read('scripts/verification/verify-tools-hub.js');
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
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_SOCIAL_BIO_LINK_CHECK: true', 'Social Bio Link Consistency Check feature flag');
assertIncludes(features, '__docs__/menulist-tools/social-bio-link-check/social-bio-link-check_impl.md', 'Social Bio Link Consistency Check doc pointer');
assertIncludes(packageJson, '"verify:social-bio-link-check"', 'Social Bio Link Consistency Check package verifier');
assertIncludes(aggregateVerifier, 'verify-social-bio-link-check.js', 'Public Truth Tools aggregate verifier');

assertIncludes(readmeDoc, '## Version Ladder', 'Social Bio Link Consistency Check README');
assertIncludes(specDoc, 'Every row includes `evidenceText`', 'Social Bio Link Consistency Check report evidence contract');
assertIncludes(specDoc, 'V0 does not open social profiles, fetch social profiles, inspect websites, inspect Google profiles, inspect QR destinations, inspect print materials, verify external link content, store reports, call AI providers, scan search results, promise rankings, promise citations, or update external platforms', 'Social Bio Link Consistency Check runtime boundary');
assertIncludes(implDoc, 'evidenceText: string', 'Social Bio Link Consistency Check implementation evidence contract');
assertIncludes(implDoc, 'Do not add social profile fetching, profile opening, website crawling, Google crawling, QR destination fetching, AI/search provider calls, report storage, or external platform updates in V0', 'Social Bio Link Consistency Check provider boundary');
assertIncludes(firebaseDoc, 'External URL fetches | 0', 'Social Bio Link Consistency Check external fetch cost boundary');
assertIncludes(firebaseDoc, 'AI/provider calls | 0', 'Social Bio Link Consistency Check AI/provider boundary');
assertIncludes(firebaseDoc, 'Report storage | 0', 'Social Bio Link Consistency Check report storage boundary');
assertIncludes(mobileDoc, 'V1 maps to existing owner mobile Share, Public Discovery, and Business Health surfaces', 'Social Bio Link Consistency Check mobile V1 boundary');
assertIncludes(testCasesDoc, 'Tool claims it inspected social profiles', 'Social Bio Link Consistency Check social inspection test boundary');
assertIncludes(validationDoc, 'V0 validation evidence; not current launch certification', 'Social Bio Link Consistency Check validation launch boundary');
assertIncludes(validationDoc, 'Current release approval still requires the active production-readiness audit', 'Social Bio Link Consistency Check validation release boundary');
assertIncludes(validationDoc, 'npm run verify:social-bio-link-check', 'Social Bio Link Consistency Check validation source gate');
assertIncludes(toolsReadmeDoc, '[social-bio-link-check](./social-bio-link-check/README.md)', 'MenuList Tools README');
assertIncludes(familyReadmeDoc, '[Social Bio Link Consistency Check](../social-bio-link-check/README.md)', 'Public Truth Tools family docs');
assertIncludes(familyReadmeDoc, 'sixteen public tools, five public asset makers, a public shareable report layer, and eighteen owner readiness modules', 'Public Truth Tools family status');
assertIncludes(familyReadmeDoc, '/tools/social-bio-link-check', 'Public Truth Tools route list');
assertIncludes(familySpecDoc, 'Social Bio Link Consistency Check V0', 'Public Truth Tools spec implementation summary');
assertIncludes(familyImplDoc, 'socialBioLinkCheckReport.ts', 'Public Truth Tools implementation docs');
assertIncludes(familyFirebaseDoc, 'Social Bio Link Consistency Check', 'Public Truth Tools Firebase docs');
assertIncludes(familyTestsDoc, 'PTT-015G', 'Public Truth Tools test boundary');

assertIncludes(route, 'WebsitePageStructuredData', 'Social Bio Link Consistency Check route structured data');
assertIncludes(route, 'path="/tools/social-bio-link-check"', 'Social Bio Link Consistency Check structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'Social Bio Link Consistency Check route feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_SOCIAL_BIO_LINK_CHECK', 'Social Bio Link Consistency Check route feature flag');

assertIncludes(component, "useTranslations('Website.SocialBioLinkCheckPage')", 'Social Bio Link Consistency Check localized copy');
assertIncludes(component, 'buildSocialBioLinkCheckReport(form)', 'Social Bio Link Consistency Check browser-local report builder');
assertIncludes(component, 'check.evidenceText', 'Social Bio Link Consistency Check explicit evidence text rendering');
assertIncludes(component, 'href={report.nextAction.href}', 'Social Bio Link Consistency Check MenuList next action');
assertIncludes(component, "fetch('/api/public/contact'", 'Social Bio Link Consistency Check consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'Social Bio Link Consistency Check contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'Social Bio Link Consistency Check contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'Social Bio Link Consistency Check contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'Social Bio Link Consistency Check bounded contact response parsing');
assertIncludes(component, "isAcceptedMenulistPublicContactResponse(result, 'general')", 'Social Bio Link Consistency Check shaped contact acknowledgement guard');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse', 'Social Bio Link Consistency Check invalid contact acknowledgement diagnostic helper');
assertIncludes(component, 'TurnstileWidget', 'Social Bio Link Consistency Check contact handoff security check');
assertNotIncludes(component, '!result?.accepted', 'Social Bio Link Consistency Check must not accept generic contact accepted flag');
assertIncludes(component, 'copyRuntimeTextToClipboard(reportText)', 'Social Bio Link Consistency Check report copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'Social Bio Link Consistency Check report download action');
assertIncludes(component, 'createShareableToolReportUrl(shareableReportPayload)', 'Social Bio Link Consistency Check shareable report URL builder');
assertIncludes(component, "toolId: 'social-bio-link-check'", 'Social Bio Link Consistency Check shareable report tool id');
assertIncludes(component, 'evidenceText: check.evidenceText', 'Social Bio Link Consistency Check shareable report evidence preservation');
assertIncludes(component, 'handleCopyShareLink', 'Social Bio Link Consistency Check shareable report copy handler');
assertIncludes(component, "t('reportActions.shareLink')", 'Social Bio Link Consistency Check shareable report action copy');
assertIncludes(component, "trackWebsiteMarketingEvent('social_bio_link_check_completed'", 'Social Bio Link Consistency Check completion analytics');
assertIncludes(component, "mode: 'self_report'", 'Social Bio Link Consistency Check input contract');

assertIncludes(types, 'evidenceText: string', 'Social Bio Link Consistency Check evidence text type');
assertIncludes(types, 'customerLinkFetched: false', 'Social Bio Link Consistency Check customer-link fetch boundary type');
assertIncludes(types, 'socialProfileFetched: false', 'Social Bio Link Consistency Check social profile fetch boundary type');
assertIncludes(types, 'socialProfileOpened: false', 'Social Bio Link Consistency Check social profile opening boundary type');
assertIncludes(types, 'externalUrlFetched: false', 'Social Bio Link Consistency Check external URL boundary type');
assertIncludes(types, 'reportStored: false', 'Social Bio Link Consistency Check report storage boundary type');
assertIncludes(types, 'externalPlatformUpdated: false', 'Social Bio Link Consistency Check external mutation boundary type');
assertIncludes(types, 'aiOrSearchChecked: false', 'Social Bio Link Consistency Check AI/search boundary type');
assertIncludes(types, 'rankingPromise: false', 'Social Bio Link Consistency Check ranking boundary type');

assertIncludes(report, 'customerLinkFetched: false', 'Social Bio Link Consistency Check report customer-link fetch boundary');
assertIncludes(report, 'socialProfileFetched: false', 'Social Bio Link Consistency Check report social profile fetch boundary');
assertIncludes(report, 'socialProfileOpened: false', 'Social Bio Link Consistency Check report social profile open boundary');
assertIncludes(report, 'externalUrlFetched: false', 'Social Bio Link Consistency Check report external URL boundary');
assertIncludes(report, 'reportStored: false', 'Social Bio Link Consistency Check report storage boundary');
assertIncludes(report, 'externalPlatformUpdated: false', 'Social Bio Link Consistency Check report external mutation boundary');
assertIncludes(report, 'aiOrSearchChecked: false', 'Social Bio Link Consistency Check report AI/search boundary');
assertIncludes(report, 'rankingPromise: false', 'Social Bio Link Consistency Check report ranking boundary');
assertIncludes(report, 'getSocialBioLinkCheckEvidenceText', 'Social Bio Link Consistency Check explicit evidence text');
assertIncludes(report, 'Public HTTPS customer-link format was checked locally. The link was not opened or fetched.', 'Social Bio Link Consistency Check public HTTPS customer-link evidence boundary');
assertIncludes(report, 'No social profile was opened, fetched, inspected, or changed.', 'Social Bio Link Consistency Check profile evidence boundary');
assertIncludes(report, 'Instagram, Facebook, WhatsApp, Google, websites, QR codes, print materials, search results, and AI answers were not inspected.', 'Social Bio Link Consistency Check external inspection evidence boundary');

for (const content of [route, report, types]) {
  assertNotIncludes(content, 'fetch(', 'Social Bio Link Consistency Check default runtime');
  assertNotIncludes(content, 'firebase', 'Social Bio Link Consistency Check default runtime');
  assertNotIncludes(content, 'firestore', 'Social Bio Link Consistency Check default runtime');
  assertNotIncludes(content, 'addDoc', 'Social Bio Link Consistency Check default runtime');
  assertNotIncludes(content, 'setDoc', 'Social Bio Link Consistency Check default runtime');
  assertNotIncludes(content, 'updateDoc', 'Social Bio Link Consistency Check default runtime');
}

for (const content of [component, route, report, types]) {
  assertNotIncludes(content, 'fetch(form.currentCustomerLink', 'Social Bio Link Consistency Check external source boundary');
  assertNotIncludes(content, 'fetch(currentCustomerLink', 'Social Bio Link Consistency Check external source boundary');
  assertNotIncludes(content, 'fetch(input.currentCustomerLink', 'Social Bio Link Consistency Check external source boundary');
  assertNotIncludes(content, 'fetch(report.', 'Social Bio Link Consistency Check external source boundary');
  assertNotIncludes(content, 'firebase/firestore', 'Social Bio Link Consistency Check browser write boundary');
  assertNotIncludes(content, 'addDoc(', 'Social Bio Link Consistency Check browser write boundary');
  assertNotIncludes(content, 'setDoc(', 'Social Bio Link Consistency Check browser write boundary');
  assertNotIncludes(content, 'updateDoc(', 'Social Bio Link Consistency Check browser write boundary');
  assertNotIncludes(content, 'businessinformation.googleapis.com', 'Social Bio Link Consistency Check Google API boundary');
  assertNotIncludes(content, 'maps.googleapis.com', 'Social Bio Link Consistency Check Maps boundary');
  assertNotIncludes(content, 'google.maps.places', 'Social Bio Link Consistency Check Maps boundary');
  assertNotIncludes(content, 'graph.facebook.com', 'Social Bio Link Consistency Check Facebook API boundary');
  assertNotIncludes(content, 'instagram.com/oauth', 'Social Bio Link Consistency Check Instagram API boundary');
  assertNotIncludes(content, 'openai', 'Social Bio Link Consistency Check V0 AI boundary');
  assertNotIncludes(content, '@google/genai', 'Social Bio Link Consistency Check V0 AI boundary');
  assertNotIncludes(content, 'chatCompletion', 'Social Bio Link Consistency Check chatbot boundary');
  assertNotIncludes(content, 'rankTracker', 'Social Bio Link Consistency Check ranking boundary');
  assertNotIncludes(content, 'window.open', 'Social Bio Link Consistency Check must not open external links');
  assertNotIncludes(content, 'location.href', 'Social Bio Link Consistency Check must not navigate to external links');
  assertNotIncludes(content, 'location.assign', 'Social Bio Link Consistency Check must not navigate to external links');
}

for (const content of [route, component, report, types, llms, llmsFull]) {
  assertNotIncludes(content, 'we opened your profile', 'Social Bio Link Consistency Check external inspection claim');
  assertNotIncludes(content, 'we scanned your social', 'Social Bio Link Consistency Check crawl claim');
  assertNotIncludes(content, 'we checked your Google profile', 'Social Bio Link Consistency Check profile inspection claim');
  assertNotIncludes(content, 'stored your report', 'Social Bio Link Consistency Check report storage claim');
  assertNotIncludes(content, 'rank higher', 'Social Bio Link Consistency Check ranking claim');
  assertNotIncludes(content, 'guaranteed ranking', 'Social Bio Link Consistency Check ranking claim');
  assertNotIncludes(content, 'guaranteed citation', 'Social Bio Link Consistency Check citation claim');
  assertNotIncludes(content, 'guaranteed AI visibility', 'Social Bio Link Consistency Check AI visibility claim');
}

assertIncludes(discoveryPolicy, "path: '/tools/social-bio-link-check'", 'Social Bio Link Consistency Check discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/social-bio-link-check', 'Social Bio Link Consistency Check sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/social-bio-link-check', 'Social Bio Link Consistency Check llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/social-bio-link-check', 'Social Bio Link Consistency Check llms-full.txt');
assertIncludes(toolsHubComponent, "href: '/tools/social-bio-link-check'", 'Tools Hub Social Bio route');
assertIncludes(toolsHubComponent, "key: 'socialBioLinkCheck'", 'Tools Hub Social Bio key');
assertIncludes(toolsHubVerifier, '/tools/social-bio-link-check', 'Tools Hub verifier Social Bio route');
assertIncludes(toolsHubVerifier, 'socialBioLinkCheck', 'Tools Hub verifier Social Bio key');

assert(enUS.Website?.SocialBioLinkCheckPage, 'en-US SocialBioLinkCheckPage locale keys must exist');
assert(hiIN.Website?.SocialBioLinkCheckPage, 'hi-IN SocialBioLinkCheckPage locale keys must exist');
assert(enUS.Website.SocialBioLinkCheckPage.checks.customer_link_present, 'en-US customer link copy must exist');
assert(hiIN.Website.SocialBioLinkCheckPage.checks.customer_link_present, 'hi-IN customer link copy must exist');
assert(enUS.Website.SocialBioLinkCheckPage.checks.external_social_inspection, 'en-US external inspection copy must exist');
assert(hiIN.Website.SocialBioLinkCheckPage.checks.external_social_inspection, 'hi-IN external inspection copy must exist');
assert(enUS.Website.SocialBioLinkCheckPage.placementPreview?.placementCount, 'en-US placement preview copy must exist');
assert(hiIN.Website.SocialBioLinkCheckPage.placementPreview?.placementCount, 'hi-IN placement preview copy must exist');
assert(enUS.Website.SocialBioLinkCheckPage.reportActions?.copy, 'en-US report copy key must exist');
assert(enUS.Website.SocialBioLinkCheckPage.reportActions?.shareLink, 'en-US report share link key must exist');
assert(enUS.Website.SocialBioLinkCheckPage.handoff?.submit, 'en-US handoff submit key must exist');
assert(hiIN.Website.SocialBioLinkCheckPage.reportActions?.copy, 'hi-IN report copy key must exist');
assert(hiIN.Website.SocialBioLinkCheckPage.reportActions?.shareLink, 'hi-IN report share link key must exist');
assert(hiIN.Website.SocialBioLinkCheckPage.handoff?.submit, 'hi-IN handoff submit key must exist');
assert(enUS.Website.SocialBioLinkCheckPage.shareReport?.checkedSourceText, 'en-US share report checked-source copy must exist');
assert(hiIN.Website.SocialBioLinkCheckPage.shareReport?.checkedSourceText, 'hi-IN share report checked-source copy must exist');
assert(enUS.Website.ToolsHubPage.tools.socialBioLinkCheck, 'en-US Tools Hub Social Bio copy must exist');
assert(hiIN.Website.ToolsHubPage.tools.socialBioLinkCheck, 'hi-IN Tools Hub Social Bio copy must exist');

console.log('Social Bio Link Consistency Check verification passed');
