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

const ROUTE_PATH = 'src/app/(website)/tools/google-profile-basics-checklist/page.tsx';
const COMPONENT_PATH = 'src/components/website/googleProfileBasicsChecklist/GoogleProfileBasicsChecklistPage.tsx';
const REPORT_PATH = 'src/lib/public-truth-tools/googleProfileBasicsReport.ts';
const TYPES_PATH = 'src/lib/public-truth-tools/googleProfileBasicsTypes.ts';
const OWNER_REPORT_PATH = 'src/lib/public-truth-tools/ownerPublicTruthReadiness.ts';
const DOC_ROOT_PATH = '__docs__/menulist-tools/google-profile-basics-checklist';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/google-profile-basics-checklist_spec.md`,
  `${DOC_ROOT_PATH}/google-profile-basics-checklist_impl.md`,
  `${DOC_ROOT_PATH}/google-profile-basics-checklist_marketing.md`,
  `${DOC_ROOT_PATH}/google-profile-basics-checklist_website.md`,
  `${DOC_ROOT_PATH}/google-profile-basics-checklist_helpdoc.md`,
  `${DOC_ROOT_PATH}/google-profile-basics-checklist_firebase.md`,
  `${DOC_ROOT_PATH}/google-profile-basics-checklist_mobile-support.md`,
  `${DOC_ROOT_PATH}/google-profile-basics-checklist_test-cases.md`,
  `${DOC_ROOT_PATH}/google-profile-basics-checklist_validation.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  REPORT_PATH,
  TYPES_PATH,
  OWNER_REPORT_PATH,
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `Google Profile Basics Checklist file missing: ${file}`);
}

assert(!exists('__docs__/google-profile-basics-checklist'), 'Google Profile Basics Checklist docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/google-profile-basics-checklist/report/route.ts'), 'Google Profile Basics Checklist must not add a report API route in V0');
assert(!exists('src/app/api/public-truth-tools/google-profile-basics-checklist/route.ts'), 'Google Profile Basics Checklist must not add a report API route in V0');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const report = read(REPORT_PATH);
const types = read(TYPES_PATH);
const ownerReport = read(OWNER_REPORT_PATH);
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/google-profile-basics-checklist_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/google-profile-basics-checklist_impl.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/google-profile-basics-checklist_firebase.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/google-profile-basics-checklist_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/google-profile-basics-checklist_test-cases.md`);
const validationDoc = read(`${DOC_ROOT_PATH}/google-profile-basics-checklist_validation.md`);
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
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_GOOGLE_PROFILE_BASICS_CHECKLIST: true', 'Google Profile Basics Checklist feature flag');
assertIncludes(features, '__docs__/menulist-tools/google-profile-basics-checklist/google-profile-basics-checklist_impl.md', 'Google Profile Basics Checklist doc pointer');
assertIncludes(packageJson, '"verify:google-profile-basics-checklist"', 'Google Profile Basics Checklist package verifier');
assertIncludes(aggregateVerifier, 'verify-google-profile-basics-checklist.js', 'Public Truth Tools aggregate verifier');

assertIncludes(readmeDoc, '## Version Ladder', 'Google Profile Basics Checklist README');
assertIncludes(specDoc, 'Every row includes `evidenceText`', 'Google Profile Basics Checklist report evidence contract');
assertIncludes(specDoc, 'V0 does not open Google, fetch Google Search, fetch Google Maps, inspect a Business Profile, verify profile ownership, update Google, check rankings, inspect reviews, call AI providers, scan search results, or update external platforms', 'Google Profile Basics Checklist runtime boundary');
assertIncludes(implDoc, 'evidenceText: string', 'Google Profile Basics Checklist implementation evidence contract');
assertIncludes(implDoc, 'Do not add Google crawling, profile opening, Maps scraping, Search scraping, review inspection, ranking checks, profile ownership verification, external URL fetches, AI/search provider calls, or report storage in V0', 'Google Profile Basics Checklist provider boundary');
assertIncludes(firebaseDoc, 'Google fetches | 0', 'Google Profile Basics Checklist Google fetch cost boundary');
assertIncludes(firebaseDoc, 'Google profile updates | 0', 'Google Profile Basics Checklist Google update cost boundary');
assertIncludes(firebaseDoc, 'Google/Maps/Search inspection | 0', 'Google Profile Basics Checklist inspection cost boundary');
assertIncludes(firebaseDoc, 'AI/provider calls | 0', 'Google Profile Basics Checklist AI/provider boundary');
assertIncludes(mobileDoc, 'Owner PWA | Included through existing Business Health card', 'Google Profile Basics Checklist mobile V1 boundary');
assertIncludes(testCasesDoc, 'No Google fetch', 'Google Profile Basics Checklist Google fetch test boundary');
assertIncludes(validationDoc, 'V0 validation evidence; not current launch certification', 'Google Profile Basics Checklist validation launch boundary');
assertIncludes(validationDoc, 'Current release approval still requires the active production-readiness audit', 'Google Profile Basics Checklist validation release boundary');
assertIncludes(validationDoc, 'npm run verify:google-profile-basics-checklist', 'Google Profile Basics Checklist validation source gate');
assertIncludes(toolsReadmeDoc, '[google-profile-basics-checklist](./google-profile-basics-checklist/README.md)', 'MenuList Tools README');
assertIncludes(familyReadmeDoc, '[Google Profile Basics Checklist](../google-profile-basics-checklist/README.md)', 'Public Truth Tools family docs');
assertIncludes(familyReadmeDoc, 'sixteen public tools, five public asset makers, a public shareable report layer, and eighteen owner readiness modules', 'Public Truth Tools family status');
assertIncludes(familyReadmeDoc, '/tools/google-profile-basics-checklist', 'Public Truth Tools route list');
assertIncludes(familySpecDoc, 'Google Profile Basics Checklist V0/V1', 'Public Truth Tools spec implementation summary');
assertIncludes(familyImplDoc, 'googleProfileBasicsReport.ts', 'Public Truth Tools implementation docs');
assertIncludes(familyFirebaseDoc, 'Google Profile Basics Checklist', 'Public Truth Tools Firebase docs');
assertIncludes(familyTestsDoc, 'PTT-015E', 'Public Truth Tools test boundary');

assertIncludes(route, 'WebsitePageStructuredData', 'Google Profile Basics Checklist route structured data');
assertIncludes(route, 'path="/tools/google-profile-basics-checklist"', 'Google Profile Basics Checklist structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'Google Profile Basics Checklist route feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_GOOGLE_PROFILE_BASICS_CHECKLIST', 'Google Profile Basics Checklist route feature flag');

assertIncludes(component, "useTranslations('Website.GoogleProfileBasicsChecklistPage')", 'Google Profile Basics Checklist localized copy');
assertIncludes(component, 'buildGoogleProfileBasicsReport(form)', 'Google Profile Basics Checklist browser-local report builder');
assertIncludes(component, 'check.evidenceText', 'Google Profile Basics Checklist explicit evidence text rendering');
assertIncludes(component, 'href={report.nextAction.href}', 'Google Profile Basics Checklist MenuList next action');
assertIncludes(component, "fetch('/api/public/contact'", 'Google Profile Basics Checklist consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'Google Profile Basics Checklist contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'Google Profile Basics Checklist contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'Google Profile Basics Checklist contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'Google Profile Basics Checklist bounded contact response parsing');
assertIncludes(component, "isAcceptedMenulistPublicContactResponse(result, 'general')", 'Google Profile Basics Checklist shaped contact acknowledgement guard');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse', 'Google Profile Basics Checklist invalid contact acknowledgement diagnostic helper');
assertIncludes(component, 'TurnstileWidget', 'Google Profile Basics Checklist contact handoff security check');
assertNotIncludes(component, '!result?.accepted', 'Google Profile Basics Checklist must not accept generic contact accepted flag');
assertIncludes(component, 'copyRuntimeTextToClipboard(reportText)', 'Google Profile Basics Checklist report copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'Google Profile Basics Checklist report download action');
assertIncludes(component, "trackWebsiteMarketingEvent('google_profile_basics_checklist_completed'", 'Google Profile Basics Checklist completion analytics');
assertIncludes(component, "mode: 'self_report'", 'Google Profile Basics Checklist input contract');

assertIncludes(types, 'evidenceText: string', 'Google Profile Basics Checklist evidence text type');
assertIncludes(types, 'googleFetched: false', 'Google Profile Basics Checklist Google fetch boundary type');
assertIncludes(types, 'googleProfileOpened: false', 'Google Profile Basics Checklist Google open boundary type');
assertIncludes(types, 'googleProfileUpdated: false', 'Google Profile Basics Checklist Google update boundary type');
assertIncludes(types, 'externalUrlFetched: false', 'Google Profile Basics Checklist external URL boundary type');
assertIncludes(types, 'reportStored: false', 'Google Profile Basics Checklist report storage boundary type');
assertIncludes(types, 'externalPlatformUpdated: false', 'Google Profile Basics Checklist external mutation boundary type');
assertIncludes(types, 'aiOrSearchChecked: false', 'Google Profile Basics Checklist AI/search boundary type');
assertIncludes(types, 'rankingPromise: false', 'Google Profile Basics Checklist ranking boundary type');

assertIncludes(report, 'googleFetched: false', 'Google Profile Basics Checklist report Google fetch boundary');
assertIncludes(report, 'googleProfileOpened: false', 'Google Profile Basics Checklist report Google open boundary');
assertIncludes(report, 'googleProfileUpdated: false', 'Google Profile Basics Checklist report Google update boundary');
assertIncludes(report, 'externalUrlFetched: false', 'Google Profile Basics Checklist report external URL boundary');
assertIncludes(report, 'reportStored: false', 'Google Profile Basics Checklist report storage boundary');
assertIncludes(report, 'externalPlatformUpdated: false', 'Google Profile Basics Checklist report external mutation boundary');
assertIncludes(report, 'aiOrSearchChecked: false', 'Google Profile Basics Checklist report AI/search boundary');
assertIncludes(report, 'rankingPromise: false', 'Google Profile Basics Checklist report ranking boundary');
assertIncludes(report, 'getGoogleProfileBasicsEvidenceText', 'Google Profile Basics Checklist explicit evidence text');
assertIncludes(report, 'Public HTTPS customer-link format was checked locally. The link was not opened or fetched.', 'Google Profile Basics Checklist public HTTPS customer-link evidence boundary');
assertIncludes(report, 'Google was not opened, scanned, or changed.', 'Google Profile Basics Checklist Google evidence boundary');
assertIncludes(report, 'Google Search, Google Maps, Business Profile, external URLs, rankings, and AI answers were not inspected.', 'Google Profile Basics Checklist external inspection evidence boundary');
assertIncludes(ownerReport, "'google_profile_handoff'", 'Google Profile Basics Checklist owner module id');
assertIncludes(ownerReport, 'Google profile handoff', 'Google Profile Basics Checklist owner module title');
assertIncludes(ownerReport, 'Google was not scanned', 'Google Profile Basics Checklist owner evidence boundary');

for (const content of [route, report, types]) {
  assertNotIncludes(content, 'fetch(', 'Google Profile Basics Checklist default runtime');
  assertNotIncludes(content, 'firebase', 'Google Profile Basics Checklist default runtime');
  assertNotIncludes(content, 'firestore', 'Google Profile Basics Checklist default runtime');
  assertNotIncludes(content, 'addDoc', 'Google Profile Basics Checklist default runtime');
  assertNotIncludes(content, 'setDoc', 'Google Profile Basics Checklist default runtime');
  assertNotIncludes(content, 'updateDoc', 'Google Profile Basics Checklist default runtime');
}

for (const content of [component, route, report, types]) {
  assertNotIncludes(content, 'fetch(form.websiteOrCustomerLink', 'Google Profile Basics Checklist external source boundary');
  assertNotIncludes(content, 'fetch(websiteOrCustomerLink', 'Google Profile Basics Checklist external source boundary');
  assertNotIncludes(content, 'fetch(input.websiteOrCustomerLink', 'Google Profile Basics Checklist external source boundary');
  assertNotIncludes(content, 'fetch(report.', 'Google Profile Basics Checklist external source boundary');
  assertNotIncludes(content, 'businessinformation.googleapis.com', 'Google Profile Basics Checklist Google API boundary');
  assertNotIncludes(content, 'google.maps.places', 'Google Profile Basics Checklist Maps boundary');
  assertNotIncludes(content, 'maps.googleapis.com', 'Google Profile Basics Checklist Maps boundary');
  assertNotIncludes(content, 'googleReview', 'Google Profile Basics Checklist review boundary');
  assertNotIncludes(content, 'rankTracker', 'Google Profile Basics Checklist ranking boundary');
  assertNotIncludes(content, 'firebase/firestore', 'Google Profile Basics Checklist browser write boundary');
  assertNotIncludes(content, 'addDoc(', 'Google Profile Basics Checklist browser write boundary');
  assertNotIncludes(content, 'setDoc(', 'Google Profile Basics Checklist browser write boundary');
  assertNotIncludes(content, 'updateDoc(', 'Google Profile Basics Checklist browser write boundary');
  assertNotIncludes(content, 'openai', 'Google Profile Basics Checklist V0 AI boundary');
  assertNotIncludes(content, '@google/genai', 'Google Profile Basics Checklist V0 AI boundary');
  assertNotIncludes(content, 'chatCompletion', 'Google Profile Basics Checklist chatbot boundary');
  assertNotIncludes(content, 'window.open', 'Google Profile Basics Checklist must not open external links');
  assertNotIncludes(content, 'location.href', 'Google Profile Basics Checklist must not navigate to external links');
  assertNotIncludes(content, 'location.assign', 'Google Profile Basics Checklist must not navigate to external links');
}

for (const content of [route, component, report, types, llms, llmsFull]) {
  assertNotIncludes(content, 'we checked your Google profile', 'Google Profile Basics Checklist Google inspection claim');
  assertNotIncludes(content, 'Google verified', 'Google Profile Basics Checklist verification claim');
  assertNotIncludes(content, 'updated your Google profile', 'Google Profile Basics Checklist update claim');
  assertNotIncludes(content, 'rank higher', 'Google Profile Basics Checklist ranking claim');
  assertNotIncludes(content, 'guaranteed ranking', 'Google Profile Basics Checklist ranking claim');
  assertNotIncludes(content, 'guaranteed citation', 'Google Profile Basics Checklist citation claim');
  assertNotIncludes(content, 'guaranteed AI visibility', 'Google Profile Basics Checklist AI visibility claim');
}

assertIncludes(discoveryPolicy, "path: '/tools/google-profile-basics-checklist'", 'Google Profile Basics Checklist discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/google-profile-basics-checklist', 'Google Profile Basics Checklist sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/google-profile-basics-checklist', 'Google Profile Basics Checklist llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/google-profile-basics-checklist', 'Google Profile Basics Checklist llms-full.txt');

assert(enUS.Website?.GoogleProfileBasicsChecklistPage, 'en-US GoogleProfileBasicsChecklistPage locale keys must exist');
assert(hiIN.Website?.GoogleProfileBasicsChecklistPage, 'hi-IN GoogleProfileBasicsChecklistPage locale keys must exist');
assert(enUS.Website.GoogleProfileBasicsChecklistPage.checks.profile_access, 'en-US profile access copy must exist');
assert(hiIN.Website.GoogleProfileBasicsChecklistPage.checks.profile_access, 'hi-IN profile access copy must exist');
assert(enUS.Website.GoogleProfileBasicsChecklistPage.checks.google_profile_inspection, 'en-US Google inspection copy must exist');
assert(hiIN.Website.GoogleProfileBasicsChecklistPage.checks.google_profile_inspection, 'hi-IN Google inspection copy must exist');
assert(enUS.Website.GoogleProfileBasicsChecklistPage.reportActions?.copy, 'en-US report copy key must exist');
assert(enUS.Website.GoogleProfileBasicsChecklistPage.handoff?.submit, 'en-US handoff submit key must exist');
assert(hiIN.Website.GoogleProfileBasicsChecklistPage.reportActions?.copy, 'hi-IN report copy key must exist');
assert(hiIN.Website.GoogleProfileBasicsChecklistPage.handoff?.submit, 'hi-IN handoff submit key must exist');

console.log('Google Profile Basics Checklist verification passed');
