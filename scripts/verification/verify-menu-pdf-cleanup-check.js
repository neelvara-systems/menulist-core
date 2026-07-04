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

const ROUTE_PATH = 'src/app/(website)/tools/menu-pdf-cleanup-check/page.tsx';
const COMPONENT_PATH = 'src/components/website/menuPdfCleanupCheck/MenuPdfCleanupCheckPage.tsx';
const REPORT_PATH = 'src/lib/public-truth-tools/menuPdfCleanupReport.ts';
const TYPES_PATH = 'src/lib/public-truth-tools/menuPdfCleanupTypes.ts';
const OWNER_REPORT_PATH = 'src/lib/public-truth-tools/ownerPublicTruthReadiness.ts';
const DOC_ROOT_PATH = '__docs__/menulist-tools/menu-pdf-cleanup-check';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/menu-pdf-cleanup-check_spec.md`,
  `${DOC_ROOT_PATH}/menu-pdf-cleanup-check_impl.md`,
  `${DOC_ROOT_PATH}/menu-pdf-cleanup-check_marketing.md`,
  `${DOC_ROOT_PATH}/menu-pdf-cleanup-check_website.md`,
  `${DOC_ROOT_PATH}/menu-pdf-cleanup-check_helpdoc.md`,
  `${DOC_ROOT_PATH}/menu-pdf-cleanup-check_firebase.md`,
  `${DOC_ROOT_PATH}/menu-pdf-cleanup-check_mobile-support.md`,
  `${DOC_ROOT_PATH}/menu-pdf-cleanup-check_test-cases.md`,
  `${DOC_ROOT_PATH}/menu-pdf-cleanup-check_validation.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  REPORT_PATH,
  TYPES_PATH,
  OWNER_REPORT_PATH,
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `Menu PDF Cleanup Check file missing: ${file}`);
}

assert(!exists('__docs__/menu-pdf-cleanup-check'), 'Menu PDF Cleanup Check docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/menu-pdf-cleanup-check/report/route.ts'), 'Menu PDF Cleanup Check must not add a report API route in V0');
assert(!exists('src/app/api/public-truth-tools/menu-pdf-cleanup-check/route.ts'), 'Menu PDF Cleanup Check must not add a report API route in V0');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const report = read(REPORT_PATH);
const types = read(TYPES_PATH);
const ownerReport = read(OWNER_REPORT_PATH);
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/menu-pdf-cleanup-check_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/menu-pdf-cleanup-check_impl.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/menu-pdf-cleanup-check_firebase.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/menu-pdf-cleanup-check_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/menu-pdf-cleanup-check_test-cases.md`);
const validationDoc = read(`${DOC_ROOT_PATH}/menu-pdf-cleanup-check_validation.md`);
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
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_MENU_PDF_CLEANUP_CHECK: true', 'Menu PDF Cleanup Check feature flag');
assertIncludes(features, '__docs__/menulist-tools/menu-pdf-cleanup-check/menu-pdf-cleanup-check_impl.md', 'Menu PDF Cleanup Check doc pointer');
assertIncludes(packageJson, '"verify:menu-pdf-cleanup-check"', 'Menu PDF Cleanup Check package verifier');
assertIncludes(aggregateVerifier, 'verify-menu-pdf-cleanup-check.js', 'Public Truth Tools aggregate verifier');

assertIncludes(readmeDoc, '## Version Ladder', 'Menu PDF Cleanup Check README');
assertIncludes(specDoc, 'Every row includes `evidenceText`', 'Menu PDF Cleanup Check report evidence contract');
assertIncludes(specDoc, 'V0 does not upload files, parse PDFs, run OCR, open links, fetch external URLs, call AI providers, scan search results, or update external platforms', 'Menu PDF Cleanup Check runtime boundary');
assertIncludes(implDoc, 'evidenceText: string', 'Menu PDF Cleanup Check implementation evidence contract');
assertIncludes(implDoc, 'Do not add file upload, PDF parsing, OCR, external URL fetches, QR image decoding, external source crawling, AI/search provider calls, or report storage in V0', 'Menu PDF Cleanup Check provider boundary');
assertIncludes(firebaseDoc, 'PDF uploads | 0', 'Menu PDF Cleanup Check upload cost boundary');
assertIncludes(firebaseDoc, 'PDF parsing | 0', 'Menu PDF Cleanup Check parser cost boundary');
assertIncludes(firebaseDoc, 'OCR calls | 0', 'Menu PDF Cleanup Check OCR cost boundary');
assertIncludes(firebaseDoc, 'AI/provider calls | 0', 'Menu PDF Cleanup Check AI/provider boundary');
assertIncludes(mobileDoc, 'Owner PWA | Included through existing Business Health card', 'Menu PDF Cleanup Check mobile V1 boundary');
assertIncludes(testCasesDoc, 'No PDF parsing', 'Menu PDF Cleanup Check parser test boundary');
assertIncludes(validationDoc, 'V0 validation evidence; not current launch certification', 'Menu PDF Cleanup Check validation launch boundary');
assertIncludes(validationDoc, 'Current release approval still requires the active production-readiness audit', 'Menu PDF Cleanup Check validation release boundary');
assertIncludes(validationDoc, 'npm run verify:menu-pdf-cleanup-check', 'Menu PDF Cleanup Check validation source gate');
assertIncludes(toolsReadmeDoc, '[menu-pdf-cleanup-check](./menu-pdf-cleanup-check/README.md)', 'MenuList Tools README');
assertIncludes(familyReadmeDoc, '[Menu PDF Cleanup Check](../menu-pdf-cleanup-check/README.md)', 'Public Truth Tools family docs');
assertIncludes(familyReadmeDoc, 'sixteen public tools, five public asset makers, a public shareable report layer, and eighteen owner readiness modules', 'Public Truth Tools family status');
assertIncludes(familyReadmeDoc, '/tools/menu-pdf-cleanup-check', 'Public Truth Tools route list');
assertIncludes(familyReadmeDoc, 'PDF cleanup readiness', 'Public Truth Tools owner module list');
assertIncludes(familySpecDoc, 'Menu PDF Cleanup Check V0/V1', 'Public Truth Tools spec implementation summary');
assertIncludes(familyImplDoc, 'menuPdfCleanupReport.ts', 'Public Truth Tools implementation docs');
assertIncludes(familyFirebaseDoc, 'Menu PDF Cleanup Check', 'Public Truth Tools Firebase docs');
assertIncludes(familyTestsDoc, 'PTT-015D', 'Public Truth Tools test boundary');

assertIncludes(route, 'WebsitePageStructuredData', 'Menu PDF Cleanup Check route structured data');
assertIncludes(route, 'path="/tools/menu-pdf-cleanup-check"', 'Menu PDF Cleanup Check structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'Menu PDF Cleanup Check route feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_MENU_PDF_CLEANUP_CHECK', 'Menu PDF Cleanup Check route feature flag');

assertIncludes(component, "useTranslations('Website.MenuPdfCleanupCheckPage')", 'Menu PDF Cleanup Check localized copy');
assertIncludes(component, 'buildMenuPdfCleanupReport(form)', 'Menu PDF Cleanup Check browser-local report builder');
assertIncludes(component, 'check.evidenceText', 'Menu PDF Cleanup Check explicit evidence text rendering');
assertIncludes(component, 'href={report.nextAction.href}', 'Menu PDF Cleanup Check MenuList next action');
assertIncludes(component, "fetch('/api/public/contact'", 'Menu PDF Cleanup Check consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'Menu PDF Cleanup Check contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'Menu PDF Cleanup Check contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'Menu PDF Cleanup Check contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'Menu PDF Cleanup Check bounded contact response parsing');
assertIncludes(component, "isAcceptedMenulistPublicContactResponse(result, 'general')", 'Menu PDF Cleanup Check shaped contact acknowledgement guard');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse', 'Menu PDF Cleanup Check invalid contact acknowledgement diagnostic helper');
assertIncludes(component, 'TurnstileWidget', 'Menu PDF Cleanup Check contact handoff security check');
assertNotIncludes(component, '!result?.accepted', 'Menu PDF Cleanup Check must not accept generic contact accepted flag');
assertIncludes(component, 'copyRuntimeTextToClipboard(reportText)', 'Menu PDF Cleanup Check report copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'Menu PDF Cleanup Check report download action');
assertIncludes(component, "trackWebsiteMarketingEvent('menu_pdf_cleanup_check_completed'", 'Menu PDF Cleanup Check completion analytics');
assertIncludes(component, "mode: 'self_report'", 'Menu PDF Cleanup Check input contract');

assertIncludes(types, 'evidenceText: string', 'Menu PDF Cleanup Check evidence text type');
assertIncludes(types, 'pdfUploaded: false', 'Menu PDF Cleanup Check upload boundary type');
assertIncludes(types, 'pdfParsed: false', 'Menu PDF Cleanup Check parser boundary type');
assertIncludes(types, 'ocrUsed: false', 'Menu PDF Cleanup Check OCR boundary type');
assertIncludes(types, 'externalUrlFetched: false', 'Menu PDF Cleanup Check external URL boundary type');
assertIncludes(types, 'fileStored: false', 'Menu PDF Cleanup Check file storage boundary type');
assertIncludes(types, 'reportStored: false', 'Menu PDF Cleanup Check report storage boundary type');
assertIncludes(types, 'externalPlatformUpdated: false', 'Menu PDF Cleanup Check external mutation boundary type');
assertIncludes(types, 'aiOrSearchChecked: false', 'Menu PDF Cleanup Check AI/search boundary type');
assertIncludes(types, 'rankingPromise: false', 'Menu PDF Cleanup Check ranking boundary type');

assertIncludes(report, 'pdfUploaded: false', 'Menu PDF Cleanup Check report upload boundary');
assertIncludes(report, 'pdfParsed: false', 'Menu PDF Cleanup Check report parser boundary');
assertIncludes(report, 'ocrUsed: false', 'Menu PDF Cleanup Check report OCR boundary');
assertIncludes(report, 'externalUrlFetched: false', 'Menu PDF Cleanup Check report URL fetch boundary');
assertIncludes(report, 'fileStored: false', 'Menu PDF Cleanup Check report file storage boundary');
assertIncludes(report, 'reportStored: false', 'Menu PDF Cleanup Check report storage boundary');
assertIncludes(report, 'externalPlatformUpdated: false', 'Menu PDF Cleanup Check report external mutation boundary');
assertIncludes(report, 'aiOrSearchChecked: false', 'Menu PDF Cleanup Check report AI/search boundary');
assertIncludes(report, 'rankingPromise: false', 'Menu PDF Cleanup Check report ranking boundary');
assertIncludes(report, 'getMenuPdfCleanupEvidenceText', 'Menu PDF Cleanup Check explicit evidence text');
assertIncludes(report, 'Public HTTPS customer-link format was checked locally. The link was not opened or fetched.', 'Menu PDF Cleanup Check public HTTPS customer-link evidence boundary');
assertIncludes(report, 'The PDF was not uploaded, opened, fetched, parsed, OCRed, or stored.', 'Menu PDF Cleanup Check upload/parser/OCR evidence boundary');
assertIncludes(report, 'PDF files, external URLs, QR scans, print materials, search results, and AI answers were not inspected.', 'Menu PDF Cleanup Check external inspection evidence boundary');
assertIncludes(report, 'replacementDependencyClear', 'Menu PDF Cleanup Check replacement dependency logic');
assertIncludes(ownerReport, "'menu_pdf_cleanup'", 'Menu PDF Cleanup Check owner module id');
assertIncludes(ownerReport, 'PDF cleanup readiness', 'Menu PDF Cleanup Check owner module title');
assertIncludes(ownerReport, 'External PDFs, file uploads, QR scans, print materials, Google, websites, social links, OCR, and AI/search were not checked.', 'Menu PDF Cleanup Check owner evidence boundary');

for (const content of [route, report, types]) {
  assertNotIncludes(content, 'fetch(', 'Menu PDF Cleanup Check default runtime');
  assertNotIncludes(content, 'firebase', 'Menu PDF Cleanup Check default runtime');
  assertNotIncludes(content, 'firestore', 'Menu PDF Cleanup Check default runtime');
  assertNotIncludes(content, 'addDoc', 'Menu PDF Cleanup Check default runtime');
  assertNotIncludes(content, 'setDoc', 'Menu PDF Cleanup Check default runtime');
  assertNotIncludes(content, 'updateDoc', 'Menu PDF Cleanup Check default runtime');
}

for (const content of [component, route, report, types]) {
  assertNotIncludes(content, 'fetch(form.currentCustomerLink', 'Menu PDF Cleanup Check external source boundary');
  assertNotIncludes(content, 'fetch(currentCustomerLink', 'Menu PDF Cleanup Check external source boundary');
  assertNotIncludes(content, 'fetch(input.currentCustomerLink', 'Menu PDF Cleanup Check external source boundary');
  assertNotIncludes(content, 'fetch(form.pdfReference', 'Menu PDF Cleanup Check PDF reference boundary');
  assertNotIncludes(content, 'fetch(pdfReference', 'Menu PDF Cleanup Check PDF reference boundary');
  assertNotIncludes(content, 'fetch(input.pdfReference', 'Menu PDF Cleanup Check PDF reference boundary');
  assertNotIncludes(content, 'fetch(report.', 'Menu PDF Cleanup Check external source boundary');
  assertNotIncludes(content, 'firebase/firestore', 'Menu PDF Cleanup Check browser write boundary');
  assertNotIncludes(content, 'addDoc(', 'Menu PDF Cleanup Check browser write boundary');
  assertNotIncludes(content, 'setDoc(', 'Menu PDF Cleanup Check browser write boundary');
  assertNotIncludes(content, 'updateDoc(', 'Menu PDF Cleanup Check browser write boundary');
  assertNotIncludes(content, 'FileReader', 'Menu PDF Cleanup Check V0 upload boundary');
  assertNotIncludes(content, 'type="file"', 'Menu PDF Cleanup Check V0 upload boundary');
  assertNotIncludes(content, 'storageRef', 'Menu PDF Cleanup Check V0 upload boundary');
  assertNotIncludes(content, 'uploadBytes', 'Menu PDF Cleanup Check V0 upload boundary');
  assertNotIncludes(content, 'pdfjs', 'Menu PDF Cleanup Check V0 PDF parser boundary');
  assertNotIncludes(content, 'pdf-parse', 'Menu PDF Cleanup Check V0 PDF parser boundary');
  assertNotIncludes(content, 'PDFDocument', 'Menu PDF Cleanup Check V0 PDF parser boundary');
  assertNotIncludes(content, 'Tesseract', 'Menu PDF Cleanup Check V0 OCR boundary');
  assertNotIncludes(content, 'openai', 'Menu PDF Cleanup Check V0 AI boundary');
  assertNotIncludes(content, '@google/genai', 'Menu PDF Cleanup Check V0 AI boundary');
  assertNotIncludes(content, 'chatCompletion', 'Menu PDF Cleanup Check chatbot boundary');
  assertNotIncludes(content, 'jsQR', 'Menu PDF Cleanup Check QR image decoding boundary');
  assertNotIncludes(content, 'qr-scanner', 'Menu PDF Cleanup Check QR image decoding boundary');
  assertNotIncludes(content, 'window.open', 'Menu PDF Cleanup Check must not open external links');
  assertNotIncludes(content, 'location.href', 'Menu PDF Cleanup Check must not navigate to external links');
  assertNotIncludes(content, 'location.assign', 'Menu PDF Cleanup Check must not navigate to external links');
}

for (const content of [route, component, report, types, llms, llmsFull]) {
  assertNotIncludes(content, 'uploaded your PDF', 'Menu PDF Cleanup Check upload claim');
  assertNotIncludes(content, 'read your PDF', 'Menu PDF Cleanup Check parser claim');
  assertNotIncludes(content, 'parsed your PDF', 'Menu PDF Cleanup Check parser claim');
  assertNotIncludes(content, 'scanned your website', 'Menu PDF Cleanup Check crawl claim');
  assertNotIncludes(content, 'guaranteed ranking', 'Menu PDF Cleanup Check ranking claim');
  assertNotIncludes(content, 'guaranteed citation', 'Menu PDF Cleanup Check citation claim');
  assertNotIncludes(content, 'guaranteed AI visibility', 'Menu PDF Cleanup Check AI visibility claim');
}

assertIncludes(discoveryPolicy, "path: '/tools/menu-pdf-cleanup-check'", 'Menu PDF Cleanup Check discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/menu-pdf-cleanup-check', 'Menu PDF Cleanup Check sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/menu-pdf-cleanup-check', 'Menu PDF Cleanup Check llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/menu-pdf-cleanup-check', 'Menu PDF Cleanup Check llms-full.txt');

assert(enUS.Website?.MenuPdfCleanupCheckPage, 'en-US MenuPdfCleanupCheckPage locale keys must exist');
assert(hiIN.Website?.MenuPdfCleanupCheckPage, 'hi-IN MenuPdfCleanupCheckPage locale keys must exist');
assert(enUS.Website.MenuPdfCleanupCheckPage.checks.pdf_source_present, 'en-US PDF source copy must exist');
assert(hiIN.Website.MenuPdfCleanupCheckPage.checks.pdf_source_present, 'hi-IN PDF source copy must exist');
assert(enUS.Website.MenuPdfCleanupCheckPage.checks.external_pdf_inspection, 'en-US external inspection copy must exist');
assert(hiIN.Website.MenuPdfCleanupCheckPage.checks.external_pdf_inspection, 'hi-IN external inspection copy must exist');
assert(enUS.Website.MenuPdfCleanupCheckPage.reportActions?.copy, 'en-US report copy key must exist');
assert(enUS.Website.MenuPdfCleanupCheckPage.handoff?.submit, 'en-US handoff submit key must exist');
assert(hiIN.Website.MenuPdfCleanupCheckPage.reportActions?.copy, 'hi-IN report copy key must exist');
assert(hiIN.Website.MenuPdfCleanupCheckPage.handoff?.submit, 'hi-IN handoff submit key must exist');

console.log('Menu PDF Cleanup Check verification passed');
