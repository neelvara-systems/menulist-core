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

const ROUTE_PATH = 'src/app/(website)/tools/reports/page.tsx';
const COMPONENT_PATH = 'src/components/website/toolReports/ToolReportPage.tsx';
const SHARED_PATH = 'src/lib/public-truth-tools/shareableToolReport.ts';
const CONTACT_ROUTE_PATH = 'src/app/api/public/contact/route.ts';
const SOCIAL_COMPONENT_PATH = 'src/components/website/socialBioLinkCheck/SocialBioLinkCheckPage.tsx';
const SOURCE_TOOL_COMPONENTS = [
  ['src/components/website/publicTruthCheck/PublicTruthCheckPage.tsx', 'public-truth-check', 'public_truth_check', true],
  ['src/components/website/qrLinkHealthCheck/QrLinkHealthCheckPage.tsx', 'qr-link-health-check', 'qr_link_health_check', true],
  ['src/components/website/menuReadabilityCheck/MenuReadabilityCheckPage.tsx', 'menu-readability-check', 'menu_readability_check', true],
  ['src/components/website/customerQuestionCoverageCheck/CustomerQuestionCoverageCheckPage.tsx', 'customer-question-coverage-check', 'customer_question_coverage_check', true],
  ['src/components/website/bookingInquiryReadinessCheck/BookingInquiryReadinessCheckPage.tsx', 'booking-inquiry-readiness-check', 'booking_inquiry_readiness_check', true],
  ['src/components/website/priceAvailabilityGapCheck/PriceAvailabilityGapCheckPage.tsx', 'price-availability-gap-check', 'price_availability_gap_check', true],
  ['src/components/website/menuPdfCleanupCheck/MenuPdfCleanupCheckPage.tsx', 'menu-pdf-cleanup-check', 'menu_pdf_cleanup_check', true],
  ['src/components/website/googleProfileBasicsChecklist/GoogleProfileBasicsChecklistPage.tsx', 'google-profile-basics-checklist', 'google_profile_basics_checklist', true],
  ['src/components/website/customerLinkPreview/CustomerLinkPreviewPage.tsx', 'customer-link-preview', 'customer_link_preview', true],
  [SOCIAL_COMPONENT_PATH, 'social-bio-link-check', 'social_bio_link_check', false],
  ['src/components/website/whatsappActionLinkCheck/WhatsAppActionLinkCheckPage.tsx', 'whatsapp-action-link-check', 'whatsapp_action_link_check', true],
  ['src/components/website/hoursCheck/HoursCheckPage.tsx', 'hours-check', 'hours_check', true],
  ['src/components/website/photoGapCheck/PhotoGapCheckPage.tsx', 'photo-gap-check', 'photo_gap_check', true],
];
const DOC_ROOT_PATH = '__docs__/menulist-tools/shareable-tool-reports';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/shareable-tool-reports_spec.md`,
  `${DOC_ROOT_PATH}/shareable-tool-reports_impl.md`,
  `${DOC_ROOT_PATH}/shareable-tool-reports_marketing.md`,
  `${DOC_ROOT_PATH}/shareable-tool-reports_website.md`,
  `${DOC_ROOT_PATH}/shareable-tool-reports_helpdoc.md`,
  `${DOC_ROOT_PATH}/shareable-tool-reports_firebase.md`,
  `${DOC_ROOT_PATH}/shareable-tool-reports_follow-up-playbook.md`,
  `${DOC_ROOT_PATH}/shareable-tool-reports_mobile-support.md`,
  `${DOC_ROOT_PATH}/shareable-tool-reports_test-cases.md`,
  `${DOC_ROOT_PATH}/shareable-tool-reports_validation.md`,
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  SHARED_PATH,
  CONTACT_ROUTE_PATH,
  ...SOURCE_TOOL_COMPONENTS.map(([sourceToolPath]) => sourceToolPath),
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `Shareable Tool Reports file missing: ${file}`);
}

const forbiddenApiRoutes = [
  'src/app/api/tools/reports/route.ts',
  'src/app/api/public-truth-tools/reports/route.ts',
  'src/app/api/public-truth-tools/report/route.ts',
  'src/app/api/shareable-tool-reports/route.ts',
];

for (const file of forbiddenApiRoutes) {
  assert(!exists(file), `Shareable Tool Reports V0 must not add report API route: ${file}`);
}

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const shared = read(SHARED_PATH);
const contactRoute = read(CONTACT_ROUTE_PATH);
const socialComponent = read(SOCIAL_COMPONENT_PATH);
const sourceToolComponents = SOURCE_TOOL_COMPONENTS.map(([sourceToolPath, toolId, eventPrefix, usesSharedBuilder]) => ({
  content: read(sourceToolPath),
  eventPrefix,
  path: sourceToolPath,
  toolId,
  usesSharedBuilder,
}));
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/shareable-tool-reports_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/shareable-tool-reports_impl.md`);
const websiteDoc = read(`${DOC_ROOT_PATH}/shareable-tool-reports_website.md`);
const helpDoc = read(`${DOC_ROOT_PATH}/shareable-tool-reports_helpdoc.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/shareable-tool-reports_firebase.md`);
const followUpPlaybookDoc = read(`${DOC_ROOT_PATH}/shareable-tool-reports_follow-up-playbook.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/shareable-tool-reports_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/shareable-tool-reports_test-cases.md`);
const validationDoc = read(`${DOC_ROOT_PATH}/shareable-tool-reports_validation.md`);
const toolsReadmeDoc = read('__docs__/menulist-tools/README.md');
const familyReadmeDoc = read('__docs__/menulist-tools/public-truth-tools/README.md');
const familyImplDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_impl.md');
const familyFirebaseDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_firebase.md');
const familyTestsDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_test-cases.md');
const features = read('src/config/features.ts');
const discoveryPolicy = read('src/lib/seo/discoveryPolicy.ts');
const sitemap = read('public/sitemap.xml');
const llms = read('public/llms.txt');
const llmsFull = read('public/llms-full.txt');
const packageJson = read('package.json');
const aggregateVerifier = read('scripts/verification/verify-public-truth-tools.js');
const socialVerifier = read('scripts/verification/verify-social-bio-link-check.js');
const enUS = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
const hiIN = JSON.parse(read('public/locales/menulist.ai/hi-IN.json'));

assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_SHAREABLE_REPORTS: true', 'Shareable Tool Reports feature flag');
assertIncludes(features, '__docs__/menulist-tools/shareable-tool-reports/shareable-tool-reports_impl.md', 'Shareable Tool Reports doc pointer');
assertIncludes(packageJson, '"verify:shareable-tool-reports"', 'Shareable Tool Reports package verifier');
assertIncludes(aggregateVerifier, 'verify-shareable-tool-reports.js', 'Public Truth Tools aggregate verifier');

assertIncludes(route, 'path="/tools/reports"', 'Shareable Tool Reports structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'Shareable Tool Reports route family feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_SHAREABLE_REPORTS', 'Shareable Tool Reports route feature flag');
assertIncludes(route, 'ToolReportPage', 'Shareable Tool Reports route component');

assertIncludes(shared, 'SHAREABLE_TOOL_REPORT_SCHEMA_VERSION = 1', 'Shareable Tool Reports schema version');
assertIncludes(shared, "SHAREABLE_TOOL_REPORT_ROUTE = '/tools/reports'", 'Shareable Tool Reports route constant');
assertIncludes(shared, "SHAREABLE_TOOL_REPORT_HASH_KEY = 'r'", 'Shareable Tool Reports hash key');
assertIncludes(shared, 'SHAREABLE_TOOL_REPORT_MAX_JSON_LENGTH', 'Shareable Tool Reports JSON cap');
assertIncludes(shared, 'SHAREABLE_TOOL_REPORT_MAX_ENCODED_LENGTH', 'Shareable Tool Reports encoded cap');
assertIncludes(shared, 'SHAREABLE_TOOL_REPORT_MAX_CHECKS', 'Shareable Tool Reports check cap');
assertIncludes(shared, 'SHAREABLE_TOOL_REPORT_MAX_BOUNDARIES', 'Shareable Tool Reports boundary cap');
assertIncludes(shared, "| 'not_applicable'", 'Shareable Tool Reports not-applicable result preservation');
assertIncludes(shared, 'evidenceText: string', 'Shareable Tool Reports evidence text type');
assertIncludes(shared, 'buildShareablePublicTruthToolReportPayload', 'Shareable Tool Reports shared source-tool builder');
assertIncludes(shared, 'coerceInternalHref', 'Shareable Tool Reports internal href guard');
assertIncludes(shared, "return '/create-menu'", 'Shareable Tool Reports unsafe href fallback');
assertIncludes(shared, 'encodeShareableToolReportPayload', 'Shareable Tool Reports encoder');
assertIncludes(shared, 'decodeShareableToolReportPayload', 'Shareable Tool Reports decoder');
assertIncludes(shared, 'createShareableToolReportUrl', 'Shareable Tool Reports URL builder');
assertIncludes(shared, 'TextEncoder', 'Shareable Tool Reports UTF-8 encoder');
assertIncludes(shared, 'TextDecoder', 'Shareable Tool Reports UTF-8 decoder');
assertIncludes(shared, 'toBase64Url', 'Shareable Tool Reports base64url encoder');
assertIncludes(shared, 'fromBase64Url', 'Shareable Tool Reports base64url decoder');

assertIncludes(component, "useTranslations('Website.ToolReportPage')", 'Shareable Tool Reports localized viewer copy');
assertIncludes(component, 'window.location.hash', 'Shareable Tool Reports hash-fragment reader');
assertIncludes(component, 'decodeShareableToolReportPayload(window.location.hash)', 'Shareable Tool Reports hash decoder');
assertIncludes(component, 'window.addEventListener(\'hashchange\'', 'Shareable Tool Reports hashchange support');
assertIncludes(component, 'check.evidenceText', 'Shareable Tool Reports evidence renderer');
assertIncludes(component, 'report.checkedSourceText', 'Shareable Tool Reports checked text renderer');
assertIncludes(component, 'report.notCheckedText', 'Shareable Tool Reports not-checked text renderer');
assertIncludes(component, 'report.publicBoundary', 'Shareable Tool Reports boundary renderer');
assertIncludes(component, 'href={report.nextAction.href}', 'Shareable Tool Reports next action renderer');
assertIncludes(component, 'copyRuntimeTextToClipboard(window.location.href)', 'Shareable Tool Reports link copy action');
assertIncludes(component, 'downloadTextFile(getSafeReportFilename(report), reportText)', 'Shareable Tool Reports download action');
assertIncludes(component, "fetch('/api/public/contact'", 'Shareable Tool Reports consented contact handoff');
assertIncludes(component, "redirect: 'manual'", 'Shareable Tool Reports contact handoff request policy');
assertIncludes(component, "cache: 'no-store'", 'Shareable Tool Reports contact handoff request policy');
assertIncludes(component, "credentials: 'same-origin'", 'Shareable Tool Reports contact handoff request policy');
assertIncludes(component, 'readMenulistPublicContactResponseJson(', 'Shareable Tool Reports bounded contact response parsing');
assertIncludes(component, 'isAcceptedMenulistPublicContactResponse(result, \'general\')', 'Shareable Tool Reports contact response acknowledgement');
assertIncludes(component, 'logInvalidMenulistPublicContactResponse(', 'Shareable Tool Reports invalid contact response diagnostic');
assertIncludes(component, "sourceKind: 'shareable_tool_report'", 'Shareable Tool Reports contact source kind');
assertIncludes(component, 'toolId: report.toolId', 'Shareable Tool Reports contact tool id');
assertIncludes(component, 'reportStatus: report.status', 'Shareable Tool Reports contact report status');
assertIncludes(component, 'missingCount: report.summary.missing', 'Shareable Tool Reports contact missing count');
assertIncludes(component, 'unclearCount: report.summary.unclear', 'Shareable Tool Reports contact unclear count');
assertIncludes(component, 'notCheckedCount: report.summary.notChecked', 'Shareable Tool Reports contact not-checked count');
assertIncludes(component, 'primaryNumber: report.summary.primaryNumber', 'Shareable Tool Reports contact primary number');
assertIncludes(component, 'sourceContext,', 'Shareable Tool Reports contact source metadata submission');
assertIncludes(component, 'TurnstileWidget', 'Shareable Tool Reports contact handoff security check');
assertIncludes(component, 'menulist_shareable_tool_report', 'Shareable Tool Reports Turnstile action');
assertIncludes(component, 'TOOL_REPORT_CONTACT_MESSAGE_MAX_LENGTH', 'Shareable Tool Reports contact message cap');
assertIncludes(component, "trackWebsiteMarketingEvent('shareable_tool_report_loaded'", 'Shareable Tool Reports load analytics');
assertIncludes(component, "trackWebsiteMarketingEvent('shareable_tool_report_delivery_submitted'", 'Shareable Tool Reports delivery submit analytics');
assertIncludes(component, "trackWebsiteMarketingEvent('shareable_tool_report_delivery_accepted'", 'Shareable Tool Reports delivery accepted analytics');
assertNotIncludes(component, 'window.location.search', 'Shareable Tool Reports must use hash, not query string');
assertNotIncludes(component, 'useSearchParams', 'Shareable Tool Reports must not use query payloads');
assertNotIncludes(component, '/api/tools/reports', 'Shareable Tool Reports must not submit to report API');
assertNotIncludes(component, '/api/public-truth-tools/reports', 'Shareable Tool Reports must not submit to report API');
assertNotIncludes(component, '/api/shareable-tool-reports', 'Shareable Tool Reports must not submit to report API');

assertIncludes(contactRoute, 'ShareableToolReportSourceContextSchema', 'MenuList public contact source-context schema');
assertIncludes(contactRoute, "sourceKind: z.literal('shareable_tool_report')", 'MenuList public contact source-context kind');
assertIncludes(contactRoute, 'sourceContext: ShareableToolReportSourceContextSchema.optional().nullable()', 'MenuList public contact request source-context field');
assertIncludes(contactRoute, 'cleanShareableToolReportSourceContext', 'MenuList public contact source-context sanitizer');
assertIncludes(contactRoute, 'sanitizeForFirestore', 'MenuList public contact Firestore sanitization');
assertIncludes(contactRoute, 'sourceKind: sourceContext?.sourceKind || null', 'MenuList public contact source-kind write');
assertIncludes(contactRoute, 'sourceToolId: sourceContext?.toolId || null', 'MenuList public contact source-tool write');
assertIncludes(contactRoute, 'sourceReportStatus: sourceContext?.reportStatus || null', 'MenuList public contact source-status write');
assertIncludes(contactRoute, 'sourcePrimaryNumber: sourceContext?.primaryNumber || null', 'MenuList public contact source-primary write');
assertIncludes(contactRoute, 'sourceContext,', 'MenuList public contact nested source-context write');
assertIncludes(contactRoute, 'firestoreAdmin.collection(DB_COLLECTIONS.LANDING_PAGE_ENQUIRIES).add(enquiryPayload)', 'MenuList public contact existing enquiry write');
assertNotIncludes(contactRoute, 'DB_COLLECTIONS.SHAREABLE_TOOL_REPORTS', 'MenuList public contact must not create report storage');
assertNotIncludes(contactRoute, 'toolReports', 'MenuList public contact must not reference report collection');

for (const content of [route, component, shared]) {
  assertNotIncludes(content, 'firebase/firestore', 'Shareable Tool Reports report storage boundary');
  assertNotIncludes(content, 'addDoc(', 'Shareable Tool Reports report storage boundary');
  assertNotIncludes(content, 'setDoc(', 'Shareable Tool Reports report storage boundary');
  assertNotIncludes(content, 'updateDoc(', 'Shareable Tool Reports report storage boundary');
  assertNotIncludes(content, 'collection(', 'Shareable Tool Reports report storage boundary');
  assertNotIncludes(content, '@google/genai', 'Shareable Tool Reports AI/provider boundary');
  assertNotIncludes(content, 'openai', 'Shareable Tool Reports AI/provider boundary');
  assertNotIncludes(content, 'businessinformation.googleapis.com', 'Shareable Tool Reports Google API boundary');
  assertNotIncludes(content, 'maps.googleapis.com', 'Shareable Tool Reports Maps API boundary');
}

assertIncludes(socialComponent, 'createShareableToolReportUrl(shareableReportPayload)', 'Social Bio Link Check share URL builder');
assertIncludes(socialComponent, "toolId: 'social-bio-link-check'", 'Social Bio Link Check share payload tool id');
assertIncludes(socialComponent, 'checkedSourceText', 'Social Bio Link Check share checked text');
assertIncludes(socialComponent, 'notCheckedText', 'Social Bio Link Check share not-checked text');
assertIncludes(socialComponent, 'evidenceText: check.evidenceText', 'Social Bio Link Check share evidence preservation');
assertIncludes(socialComponent, 'handleCopyShareLink', 'Social Bio Link Check share link handler');
assertIncludes(socialComponent, "t('reportActions.shareLink')", 'Social Bio Link Check share link copy');
assertIncludes(socialVerifier, 'shareLink', 'Social Bio Link Check verifier share key');

for (const sourceTool of sourceToolComponents) {
  assertIncludes(sourceTool.content, 'createShareableToolReportUrl(shareableReportPayload)', `${sourceTool.toolId} share URL builder`);
  assertIncludes(sourceTool.content, `toolId: '${sourceTool.toolId}'`, `${sourceTool.toolId} share payload tool id`);
  assertIncludes(sourceTool.content, 'handleCopyShareLink', `${sourceTool.toolId} share link handler`);
  assertIncludes(sourceTool.content, `${sourceTool.eventPrefix}_share_link_copy_clicked`, `${sourceTool.toolId} share click analytics`);
  assertIncludes(sourceTool.content, `${sourceTool.eventPrefix}_share_link_copied`, `${sourceTool.toolId} share copied analytics`);
  assertIncludes(sourceTool.content, `${sourceTool.eventPrefix}_share_link_copy_failed`, `${sourceTool.toolId} share copy failure diagnostic`);
  assertIncludes(sourceTool.content, "setReportActionStatus('share_copied')", `${sourceTool.toolId} share copied status`);
  assertIncludes(sourceTool.content, "setReportActionStatus('share_copy_failed')", `${sourceTool.toolId} share failure status`);

  if (sourceTool.usesSharedBuilder) {
    assertIncludes(sourceTool.content, 'buildShareablePublicTruthToolReportPayload({', `${sourceTool.toolId} shared report payload builder`);
    assertIncludes(sourceTool.content, "useTranslations('Website.PublicTruthToolSharedReport')", `${sourceTool.toolId} shared report locale namespace`);
    assertIncludes(sourceTool.content, "sharedReportT('reportActions.shareLink')", `${sourceTool.toolId} shared report button copy`);
    assertIncludes(sourceTool.content, 'sharedReportT(`reportActions.statuses.${reportActionStatus}`)', `${sourceTool.toolId} shared report status copy`);
  }
}

assertIncludes(readmeDoc, '/tools/reports', 'Shareable Tool Reports README route');
assertIncludes(readmeDoc, 'all current public MenuList Tools can copy a public report link', 'Shareable Tool Reports README coverage');
assertIncludes(readmeDoc, 'optional consented report follow-up capture', 'Shareable Tool Reports README follow-up coverage');
assertIncludes(specDoc, 'URL hash fragment', 'Shareable Tool Reports spec hash boundary');
assertIncludes(specDoc, 'The user must not need to be a MenuList user to open a report link', 'Shareable Tool Reports public access rule');
assertIncludes(specDoc, 'all current public MenuList Tool report-card integrations', 'Shareable Tool Reports spec coverage');
assertIncludes(specDoc, 'consented follow-up request through the existing `/api/public/contact` route', 'Shareable Tool Reports spec contact boundary');
assertIncludes(implDoc, '/tools/reports#r=', 'Shareable Tool Reports implementation hash format');
assertIncludes(implDoc, 'Do not add a report API route', 'Shareable Tool Reports implementation API boundary');
assertIncludes(implDoc, 'All current public MenuList Tools are source-tool integrations', 'Shareable Tool Reports implementation coverage');
assertIncludes(implDoc, 'The accepted write is one existing public contact enquiry', 'Shareable Tool Reports implementation contact boundary');
assertIncludes(websiteDoc, 'Send report for follow-up', 'Shareable Tool Reports website follow-up copy');
assertIncludes(websiteDoc, 'Do not say the report was emailed or delivered automatically', 'Shareable Tool Reports website delivery boundary');
assertIncludes(helpDoc, 'not as a saved report record', 'Shareable Tool Reports helpdoc storage boundary');
assertIncludes(firebaseDoc, 'Firestore reads | 0', 'Shareable Tool Reports Firebase reads boundary');
assertIncludes(firebaseDoc, '0 for report viewing; 1 existing contact enquiry write per accepted follow-up', 'Shareable Tool Reports Firebase writes boundary');
assertIncludes(firebaseDoc, 'Report storage | 0', 'Shareable Tool Reports Firebase report storage boundary');
assertIncludes(firebaseDoc, 'The submitted message contains a bounded report summary', 'Shareable Tool Reports Firebase contact boundary');
assertIncludes(firebaseDoc, 'sourceKind: shareable_tool_report', 'Shareable Tool Reports Firebase source kind metadata');
assertIncludes(followUpPlaybookDoc, 'sourceKind', 'Shareable Tool Reports follow-up playbook metadata');
assertIncludes(followUpPlaybookDoc, 'The paid value is the work, recurrence, history, multi-location reporting, or partner reporting.', 'Shareable Tool Reports follow-up playbook upgrade boundary');
assertIncludes(mobileDoc, 'keep the follow-up form usable with 44px controls', 'Shareable Tool Reports mobile follow-up boundary');
assertIncludes(testCasesDoc, 'STR-004', 'Shareable Tool Reports test case coverage');
assertIncludes(testCasesDoc, 'STR-012', 'Shareable Tool Reports follow-up test case coverage');
assertIncludes(testCasesDoc, 'STR-014', 'Shareable Tool Reports source metadata test case coverage');
assertIncludes(validationDoc, 'npm run verify:shareable-tool-reports', 'Shareable Tool Reports validation gate');
assertIncludes(validationDoc, 'consented follow-up uses only `/api/public/contact`', 'Shareable Tool Reports validation contact boundary');
assertIncludes(validationDoc, 'follow-up request includes bounded `shareable_tool_report` source metadata', 'Shareable Tool Reports validation source metadata boundary');
assertIncludes(toolsReadmeDoc, '[shareable-tool-reports](./shareable-tool-reports/README.md)', 'MenuList Tools README');
assertIncludes(familyReadmeDoc, '[Shareable Tool Reports](../shareable-tool-reports/README.md)', 'Public Truth Tools README');
assertIncludes(familyReadmeDoc, '/tools/reports', 'Public Truth Tools routes');
assertIncludes(familyImplDoc, 'Shareable Tool Reports', 'Public Truth Tools implementation docs');
assertIncludes(familyFirebaseDoc, 'Shareable Tool Reports note', 'Public Truth Tools Firebase docs');
assertIncludes(familyTestsDoc, 'PTT-015H', 'Public Truth Tools test boundary');

assertIncludes(discoveryPolicy, "path: '/tools/reports'", 'Shareable Tool Reports discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools/reports', 'Shareable Tool Reports sitemap');
assertIncludes(llms, 'https://menulist.ai/tools/reports', 'Shareable Tool Reports llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools/reports', 'Shareable Tool Reports llms-full.txt');

assert(enUS.Website?.ToolReportPage, 'en-US ToolReportPage locale keys must exist');
assert(hiIN.Website?.ToolReportPage, 'hi-IN ToolReportPage locale keys must exist');
assert(enUS.Website.ToolReportPage.reportActions?.copyLink, 'en-US report copy-link key must exist');
assert(hiIN.Website.ToolReportPage.reportActions?.copyLink, 'hi-IN report copy-link key must exist');
assert(enUS.Website.ToolReportPage.delivery?.submit, 'en-US report delivery submit key must exist');
assert(hiIN.Website.ToolReportPage.delivery?.submit, 'hi-IN report delivery submit key must exist');
assert(enUS.Website.ToolReportPage.delivery?.securityCheckRequired, 'en-US report delivery security key must exist');
assert(hiIN.Website.ToolReportPage.delivery?.securityCheckRequired, 'hi-IN report delivery security key must exist');
assert(enUS.Website.ToolReportPage.results?.not_applicable, 'en-US report not-applicable result key must exist');
assert(hiIN.Website.ToolReportPage.results?.not_applicable, 'hi-IN report not-applicable result key must exist');
assert(enUS.Website.PublicTruthToolSharedReport?.reportActions?.shareLink, 'en-US shared public tool report share-link key must exist');
assert(hiIN.Website.PublicTruthToolSharedReport?.reportActions?.shareLink, 'hi-IN shared public tool report share-link key must exist');
assert(enUS.Website.PublicTruthToolSharedReport?.checkedSourceText, 'en-US shared public tool report checked-source key must exist');
assert(hiIN.Website.PublicTruthToolSharedReport?.checkedSourceText, 'hi-IN shared public tool report checked-source key must exist');
assert(enUS.Website.SocialBioLinkCheckPage.reportActions?.shareLink, 'en-US Social Bio share-link key must exist');
assert(hiIN.Website.SocialBioLinkCheckPage.reportActions?.shareLink, 'hi-IN Social Bio share-link key must exist');
assert(enUS.Website.SocialBioLinkCheckPage.shareReport?.checkedSourceText, 'en-US Social Bio share report checked text must exist');
assert(hiIN.Website.SocialBioLinkCheckPage.shareReport?.checkedSourceText, 'hi-IN Social Bio share report checked text must exist');

for (const content of [route, component, shared, socialComponent, llms, llmsFull]) {
  assertNotIncludes(content, 'guaranteed ranking', 'Shareable Tool Reports ranking claim');
  assertNotIncludes(content, 'guaranteed citation', 'Shareable Tool Reports citation claim');
  assertNotIncludes(content, 'guaranteed AI visibility', 'Shareable Tool Reports AI visibility claim');
  assertNotIncludes(content, 'we scanned your social', 'Shareable Tool Reports external inspection claim');
  assertNotIncludes(content, 'we checked your Google profile', 'Shareable Tool Reports external inspection claim');
  assertNotIncludes(content, 'stored your report', 'Shareable Tool Reports storage claim');
}

console.log('Shareable Tool Reports verification passed');
