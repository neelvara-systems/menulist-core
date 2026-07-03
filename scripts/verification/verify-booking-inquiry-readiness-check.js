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

const ROUTE_PATH = 'src/app/(website)/tools/booking-inquiry-readiness-check/page.tsx';
const COMPONENT_PATH = 'src/components/website/bookingInquiryReadinessCheck/BookingInquiryReadinessCheckPage.tsx';
const REPORT_PATH = 'src/lib/public-truth-tools/bookingInquiryReadinessReport.ts';
const TYPES_PATH = 'src/lib/public-truth-tools/bookingInquiryReadinessTypes.ts';
const OWNER_REPORT_PATH = 'src/lib/public-truth-tools/ownerPublicTruthReadiness.ts';
const DOC_ROOT_PATH = '__docs__/menulist-tools/booking-inquiry-readiness-check';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/booking-inquiry-readiness-check_spec.md`,
  `${DOC_ROOT_PATH}/booking-inquiry-readiness-check_impl.md`,
  `${DOC_ROOT_PATH}/booking-inquiry-readiness-check_marketing.md`,
  `${DOC_ROOT_PATH}/booking-inquiry-readiness-check_website.md`,
  `${DOC_ROOT_PATH}/booking-inquiry-readiness-check_helpdoc.md`,
  `${DOC_ROOT_PATH}/booking-inquiry-readiness-check_firebase.md`,
  `${DOC_ROOT_PATH}/booking-inquiry-readiness-check_mobile-support.md`,
  `${DOC_ROOT_PATH}/booking-inquiry-readiness-check_test-cases.md`,
  `${DOC_ROOT_PATH}/booking-inquiry-readiness-check_validation.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  REPORT_PATH,
  TYPES_PATH,
  OWNER_REPORT_PATH,
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `Booking Inquiry Readiness Check file missing: ${file}`);
}

assert(!exists('__docs__/booking-inquiry-readiness-check'), 'Booking Inquiry Readiness Check docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/booking-inquiry-readiness-check/report/route.ts'), 'Booking Inquiry Readiness Check must not add a report API route in V0');
assert(!exists('src/app/api/public-truth-tools/booking-inquiry-readiness-check/route.ts'), 'Booking Inquiry Readiness Check must not add a report API route in V0');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const report = read(REPORT_PATH);
const types = read(TYPES_PATH);
const ownerReport = read(OWNER_REPORT_PATH);
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/booking-inquiry-readiness-check_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/booking-inquiry-readiness-check_impl.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/booking-inquiry-readiness-check_firebase.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/booking-inquiry-readiness-check_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/booking-inquiry-readiness-check_test-cases.md`);
const validationDoc = read(`${DOC_ROOT_PATH}/booking-inquiry-readiness-check_validation.md`);
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
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_BOOKING_INQUIRY_READINESS_CHECK: true', 'Booking Inquiry Readiness Check feature flag');
assertIncludes(features, '__docs__/menulist-tools/booking-inquiry-readiness-check/booking-inquiry-readiness-check_impl.md', 'Booking Inquiry Readiness Check doc pointer');
assertIncludes(packageJson, '"verify:booking-inquiry-readiness-check"', 'Booking Inquiry Readiness Check package verifier');

assertIncludes(readmeDoc, '## Version Ladder', 'Booking Inquiry Readiness Check README');
assertIncludes(specDoc, 'Every row includes `evidenceText`', 'Booking Inquiry Readiness Check report evidence contract');
assertIncludes(specDoc, 'V0 does not open links, inspect booking providers, inspect calendars, check payments, send messages, call AI providers, scan search results, or update external platforms', 'Booking Inquiry Readiness Check runtime boundary');
assertIncludes(implDoc, 'evidenceText: string', 'Booking Inquiry Readiness Check implementation evidence contract');
assertIncludes(implDoc, 'Do not add provider login, booking-provider checks, calendar checks, payment checks, message sending, external source crawling, AI/search provider calls, file upload, or report storage in V0', 'Booking Inquiry Readiness Check provider boundary');
assertIncludes(firebaseDoc, 'Booking provider calls | 0', 'Booking Inquiry Readiness Check provider cost boundary');
assertIncludes(firebaseDoc, 'Calendar/payment checks | 0', 'Booking Inquiry Readiness Check calendar/payment boundary');
assertIncludes(firebaseDoc, 'Message sends | 0', 'Booking Inquiry Readiness Check message boundary');
assertIncludes(mobileDoc, 'Owner PWA | Included through existing Business Health card', 'Booking Inquiry Readiness Check mobile V1 boundary');
assertIncludes(testCasesDoc, 'No booking-provider calls', 'Booking Inquiry Readiness Check provider test boundary');
assertIncludes(validationDoc, 'V0 validation evidence; not current launch certification', 'Booking Inquiry Readiness Check validation launch boundary');
assertIncludes(validationDoc, 'Current release approval still requires the active production-readiness audit', 'Booking Inquiry Readiness Check validation release boundary');
assertIncludes(validationDoc, 'npm run verify:booking-inquiry-readiness-check', 'Booking Inquiry Readiness Check validation source gate');
assertIncludes(toolsReadmeDoc, '[booking-inquiry-readiness-check](./booking-inquiry-readiness-check/README.md)', 'MenuList Tools README');
assertIncludes(familyReadmeDoc, '[Booking Inquiry Readiness Check](../booking-inquiry-readiness-check/README.md)', 'Public Truth Tools family docs');
assertIncludes(familyImplDoc, 'bookingInquiryReadinessReport.ts', 'Public Truth Tools implementation docs');
assertIncludes(familyFirebaseDoc, 'Booking Inquiry Readiness Check', 'Public Truth Tools Firebase docs');

assertIncludes(route, 'WebsitePageStructuredData', 'Booking Inquiry Readiness Check route structured data');
assertIncludes(route, 'path="/tools/booking-inquiry-readiness-check"', 'Booking Inquiry Readiness Check structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'Booking Inquiry Readiness Check route feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_BOOKING_INQUIRY_READINESS_CHECK', 'Booking Inquiry Readiness Check route feature flag');

assertIncludes(component, "useTranslations('Website.BookingInquiryReadinessCheckPage')", 'Booking Inquiry Readiness Check localized copy');
assertIncludes(component, 'buildBookingInquiryReadinessReport(form)', 'Booking Inquiry Readiness Check browser-local report builder');
assertIncludes(component, 'check.evidenceText', 'Booking Inquiry Readiness Check explicit evidence text rendering');
assertIncludes(component, 'href={report.nextAction.href}', 'Booking Inquiry Readiness Check MenuList next action');
assertIncludes(component, "fetch('/api/public/contact'", 'Booking Inquiry Readiness Check consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'Booking Inquiry Readiness Check contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'Booking Inquiry Readiness Check contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'Booking Inquiry Readiness Check contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'Booking Inquiry Readiness Check bounded contact response parsing');
assertIncludes(component, "isAcceptedMenulistPublicContactResponse(result, 'general')", 'Booking Inquiry Readiness Check shaped contact acknowledgement guard');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse', 'Booking Inquiry Readiness Check invalid contact acknowledgement diagnostic helper');
assertIncludes(component, 'TurnstileWidget', 'Booking Inquiry Readiness Check contact handoff security check');
assertNotIncludes(component, '!result?.accepted', 'Booking Inquiry Readiness Check must not accept generic contact accepted flag');
assertIncludes(component, 'copyRuntimeTextToClipboard(reportText)', 'Booking Inquiry Readiness Check report copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'Booking Inquiry Readiness Check report download action');
assertIncludes(component, "trackWebsiteMarketingEvent('booking_inquiry_readiness_check_completed'", 'Booking Inquiry Readiness Check completion analytics');
assertIncludes(component, "mode: 'self_report'", 'Booking Inquiry Readiness Check input contract');

assertIncludes(types, 'evidenceText: string', 'Booking Inquiry Readiness Check evidence text type');
assertIncludes(types, 'externalUrlFetched: false', 'Booking Inquiry Readiness Check target fetch boundary type');
assertIncludes(types, 'bookingProviderChecked: false', 'Booking Inquiry Readiness Check provider boundary type');
assertIncludes(types, 'calendarChecked: false', 'Booking Inquiry Readiness Check calendar boundary type');
assertIncludes(types, 'paymentChecked: false', 'Booking Inquiry Readiness Check payment boundary type');
assertIncludes(types, 'messageSent: false', 'Booking Inquiry Readiness Check message boundary type');
assertIncludes(types, 'externalPlatformUpdated: false', 'Booking Inquiry Readiness Check external mutation boundary type');
assertIncludes(types, 'aiOrSearchChecked: false', 'Booking Inquiry Readiness Check AI/search boundary type');
assertIncludes(types, 'rankingPromise: false', 'Booking Inquiry Readiness Check ranking boundary type');

assertIncludes(report, 'externalUrlFetched: false', 'Booking Inquiry Readiness Check report target fetch boundary');
assertIncludes(report, 'bookingProviderChecked: false', 'Booking Inquiry Readiness Check report provider boundary');
assertIncludes(report, 'calendarChecked: false', 'Booking Inquiry Readiness Check report calendar boundary');
assertIncludes(report, 'paymentChecked: false', 'Booking Inquiry Readiness Check report payment boundary');
assertIncludes(report, 'messageSent: false', 'Booking Inquiry Readiness Check report message boundary');
assertIncludes(report, 'externalPlatformUpdated: false', 'Booking Inquiry Readiness Check report external mutation boundary');
assertIncludes(report, 'aiOrSearchChecked: false', 'Booking Inquiry Readiness Check report AI/search boundary');
assertIncludes(report, 'rankingPromise: false', 'Booking Inquiry Readiness Check report ranking boundary');
assertIncludes(report, 'getBookingInquiryEvidenceText', 'Booking Inquiry Readiness Check explicit evidence text');
assertIncludes(report, 'Action destination format was checked locally. The link, phone number, inbox, calendar, or provider was not opened.', 'Booking Inquiry Readiness Check action destination evidence boundary');
assertIncludes(report, 'Booking providers, calendars, payments, inboxes, external pages, and messages were not inspected.', 'Booking Inquiry Readiness Check external provider evidence boundary');
assertIncludes(ownerReport, "'booking_inquiry_readiness'", 'Booking Inquiry Readiness Check owner module id');
assertIncludes(ownerReport, 'Booking and inquiry readiness', 'Booking Inquiry Readiness Check owner module title');
assertIncludes(ownerReport, 'Booking providers, calendars, messages, and payment systems were not checked.', 'Booking Inquiry Readiness Check owner evidence boundary');

for (const content of [route, report, types]) {
  assertNotIncludes(content, 'fetch(', 'Booking Inquiry Readiness Check default runtime');
  assertNotIncludes(content, 'firebase', 'Booking Inquiry Readiness Check default runtime');
  assertNotIncludes(content, 'firestore', 'Booking Inquiry Readiness Check default runtime');
  assertNotIncludes(content, 'addDoc', 'Booking Inquiry Readiness Check default runtime');
  assertNotIncludes(content, 'setDoc', 'Booking Inquiry Readiness Check default runtime');
  assertNotIncludes(content, 'updateDoc', 'Booking Inquiry Readiness Check default runtime');
}

for (const content of [component, route, report, types]) {
  assertNotIncludes(content, 'fetch(form.publicUrl', 'Booking Inquiry Readiness Check external source boundary');
  assertNotIncludes(content, 'fetch(publicUrl', 'Booking Inquiry Readiness Check external source boundary');
  assertNotIncludes(content, 'fetch(input.publicUrl', 'Booking Inquiry Readiness Check external source boundary');
  assertNotIncludes(content, 'fetch(form.actionLinkOrNumber', 'Booking Inquiry Readiness Check provider boundary');
  assertNotIncludes(content, 'fetch(actionLinkOrNumber', 'Booking Inquiry Readiness Check provider boundary');
  assertNotIncludes(content, 'fetch(input.actionLinkOrNumber', 'Booking Inquiry Readiness Check provider boundary');
  assertNotIncludes(content, 'fetch(report.', 'Booking Inquiry Readiness Check external source boundary');
  assertNotIncludes(content, 'firebase/firestore', 'Booking Inquiry Readiness Check browser write boundary');
  assertNotIncludes(content, 'addDoc(', 'Booking Inquiry Readiness Check browser write boundary');
  assertNotIncludes(content, 'setDoc(', 'Booking Inquiry Readiness Check browser write boundary');
  assertNotIncludes(content, 'updateDoc(', 'Booking Inquiry Readiness Check browser write boundary');
  assertNotIncludes(content, 'FileReader', 'Booking Inquiry Readiness Check V0 upload boundary');
  assertNotIncludes(content, 'type="file"', 'Booking Inquiry Readiness Check V0 upload boundary');
  assertNotIncludes(content, 'storageRef', 'Booking Inquiry Readiness Check V0 upload boundary');
  assertNotIncludes(content, 'uploadBytes', 'Booking Inquiry Readiness Check V0 upload boundary');
  assertNotIncludes(content, 'openai', 'Booking Inquiry Readiness Check V0 AI boundary');
  assertNotIncludes(content, '@google/genai', 'Booking Inquiry Readiness Check V0 AI boundary');
  assertNotIncludes(content, 'chatCompletion', 'Booking Inquiry Readiness Check chatbot boundary');
  assertNotIncludes(content, 'calendar.events', 'Booking Inquiry Readiness Check calendar boundary');
  assertNotIncludes(content, 'stripe.checkout', 'Booking Inquiry Readiness Check payment boundary');
  assertNotIncludes(content, 'sendMessage(', 'Booking Inquiry Readiness Check message boundary');
  assertNotIncludes(content, 'window.open', 'Booking Inquiry Readiness Check must not open external links');
  assertNotIncludes(content, 'location.href', 'Booking Inquiry Readiness Check must not navigate to external links');
  assertNotIncludes(content, 'location.assign', 'Booking Inquiry Readiness Check must not navigate to external links');
}

for (const content of [route, component, report, types, llms, llmsFull]) {
  assertNotIncludes(content, 'guaranteed ranking', 'Booking Inquiry Readiness Check claims');
  assertNotIncludes(content, 'guaranteed citation', 'Booking Inquiry Readiness Check claims');
  assertNotIncludes(content, 'guaranteed AI visibility', 'Booking Inquiry Readiness Check claims');
  assertNotIncludes(content, 'booking completion guaranteed', 'Booking Inquiry Readiness Check completion claim');
  assertNotIncludes(content, 'payment verified', 'Booking Inquiry Readiness Check payment claim');
  assertNotIncludes(content, 'scanned your website', 'Booking Inquiry Readiness Check crawl claim');
}

assertIncludes(discoveryPolicy, "path: '/tools/booking-inquiry-readiness-check'", 'Booking Inquiry Readiness Check discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/booking-inquiry-readiness-check', 'Booking Inquiry Readiness Check sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/booking-inquiry-readiness-check', 'Booking Inquiry Readiness Check llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/booking-inquiry-readiness-check', 'Booking Inquiry Readiness Check llms-full.txt');

assert(enUS.Website?.BookingInquiryReadinessCheckPage, 'en-US BookingInquiryReadinessCheckPage locale keys must exist');
assert(hiIN.Website?.BookingInquiryReadinessCheckPage, 'hi-IN BookingInquiryReadinessCheckPage locale keys must exist');
assert(enUS.Website.BookingInquiryReadinessCheckPage.checks.primary_action, 'en-US primary action copy must exist');
assert(hiIN.Website.BookingInquiryReadinessCheckPage.checks.primary_action, 'hi-IN primary action copy must exist');
assert(enUS.Website.BookingInquiryReadinessCheckPage.reportActions?.copy, 'en-US report copy key must exist');
assert(enUS.Website.BookingInquiryReadinessCheckPage.handoff?.submit, 'en-US handoff submit key must exist');
assert(hiIN.Website.BookingInquiryReadinessCheckPage.reportActions?.copy, 'hi-IN report copy key must exist');
assert(hiIN.Website.BookingInquiryReadinessCheckPage.handoff?.submit, 'hi-IN handoff submit key must exist');

console.log('Booking Inquiry Readiness Check verification passed');
