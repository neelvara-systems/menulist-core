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

function assertDocsNotInclude(relPaths, needle, label) {
  for (const relPath of relPaths) {
    assertNotIncludes(read(relPath), needle, `${label} (${relPath})`);
  }
}

function assertSameSet(actual, expected, label) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter((value) => !actualSet.has(value));
  const extra = actual.filter((value) => !expectedSet.has(value));

  assert(
    missing.length === 0 && extra.length === 0,
    `${label} mismatch. Missing: ${missing.join(', ') || 'none'}. Extra: ${extra.join(', ') || 'none'}.`,
  );
}

function collectComponentLiteralValues(content, field) {
  const regex = new RegExp(`${field}: '([^']+)'`, 'g');
  return Array.from(content.matchAll(regex), (match) => match[1]).sort();
}

const ROUTE_PATH = 'src/app/(website)/tools/page.tsx';
const COMPONENT_PATH = 'src/components/website/toolsHub/ToolsHubPage.tsx';
const DOC_ROOT_PATH = '__docs__/menulist-tools/tools-hub';
const REQUIRED_DOCS = [
  `${DOC_ROOT_PATH}/README.md`,
  `${DOC_ROOT_PATH}/tools-hub_spec.md`,
  `${DOC_ROOT_PATH}/tools-hub_impl.md`,
  `${DOC_ROOT_PATH}/tools-hub_marketing.md`,
  `${DOC_ROOT_PATH}/tools-hub_website.md`,
  `${DOC_ROOT_PATH}/tools-hub_helpdoc.md`,
  `${DOC_ROOT_PATH}/tools-hub_firebase.md`,
  `${DOC_ROOT_PATH}/tools-hub_mobile-support.md`,
  `${DOC_ROOT_PATH}/tools-hub_test-cases.md`,
  `${DOC_ROOT_PATH}/tools-hub_validation.md`,
];

const TOOL_ROUTES = [
  '/tools/public-truth-check',
  '/tools/business-facts-copy-pack',
  '/tools/customer-question-coverage-check',
  '/tools/customer-faq-reply-pack',
  '/tools/customer-link-preview',
  '/tools/social-bio-link-check',
  '/tools/google-profile-basics-checklist',
  '/tools/menu-readability-check',
  '/tools/price-availability-gap-check',
  '/tools/menu-pdf-cleanup-check',
  '/tools/qr-link-health-check',
  '/tools/booking-inquiry-readiness-check',
  '/tools/whatsapp-action-link-check',
  '/tools/whatsapp-reply-pack',
  '/tools/hours-check',
  '/tools/photo-gap-check',
  '/tools/qr-poster-maker',
  '/tools/whatsapp-menu-status-maker',
  '/tools/holiday-hours-poster-maker',
  '/tools/customer-link-card-maker',
  '/tools/feedback-qr-card-maker',
];

const TOOL_KEYS = [
  'publicTruthCheck',
  'businessFactsCopyPack',
  'customerQuestionCoverageCheck',
  'customerFaqReplyPack',
  'customerLinkPreview',
  'socialBioLinkCheck',
  'googleProfileBasicsChecklist',
  'menuReadabilityCheck',
  'priceAvailabilityGapCheck',
  'menuPdfCleanupCheck',
  'qrLinkHealthCheck',
  'bookingInquiryReadinessCheck',
  'whatsappActionLinkCheck',
  'whatsappReplyPack',
  'hoursCheck',
  'photoGapCheck',
  'qrPosterMaker',
  'whatsappMenuStatusMaker',
  'holidayHoursPosterMaker',
  'customerLinkCardMaker',
  'feedbackQrCardMaker',
];

for (const file of [
  ROUTE_PATH,
  COMPONENT_PATH,
  'src/styles/website.css',
  'src/components/website/Header.tsx',
  'src/components/website/Footer.tsx',
  ...REQUIRED_DOCS,
]) {
  assert(exists(file), `Tools Hub file missing: ${file}`);
}

assert(!exists('__docs__/tools-hub'), 'Tools Hub docs must live under __docs__/menulist-tools/');
assert(!exists('src/app/api/tools/route.ts'), 'Tools Hub must not add an API route');
assert(!exists('src/app/api/public-truth-tools/tools-hub/route.ts'), 'Tools Hub must not add a report API route');

const route = read(ROUTE_PATH);
const component = read(COMPONENT_PATH);
const css = read('src/styles/website.css');
const header = read('src/components/website/Header.tsx');
const footer = read('src/components/website/Footer.tsx');
const features = read('src/config/features.ts');
const discoveryPolicy = read('src/lib/seo/discoveryPolicy.ts');
const sitemap = read('public/sitemap.xml');
const llms = read('public/llms.txt');
const llmsFull = read('public/llms-full.txt');
const packageJson = read('package.json');
const aggregateVerifier = read('scripts/verification/verify-public-truth-tools.js');
const toolsReadmeDoc = read('__docs__/menulist-tools/README.md');
const familyReadmeDoc = read('__docs__/menulist-tools/public-truth-tools/README.md');
const familyImplDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_impl.md');
const familyFirebaseDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_firebase.md');
const familyTestsDoc = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_test-cases.md');
const mainWebsiteContent = read('__docs__/main-website/main-website_content.md');
const mainWebsiteImpl = read('__docs__/main-website/main-website_impl.md');
const readmeDoc = read(`${DOC_ROOT_PATH}/README.md`);
const specDoc = read(`${DOC_ROOT_PATH}/tools-hub_spec.md`);
const implDoc = read(`${DOC_ROOT_PATH}/tools-hub_impl.md`);
const firebaseDoc = read(`${DOC_ROOT_PATH}/tools-hub_firebase.md`);
const mobileDoc = read(`${DOC_ROOT_PATH}/tools-hub_mobile-support.md`);
const testCasesDoc = read(`${DOC_ROOT_PATH}/tools-hub_test-cases.md`);
const validationDoc = read(`${DOC_ROOT_PATH}/tools-hub_validation.md`);
const enUS = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
const hiIN = JSON.parse(read('public/locales/menulist.ai/hi-IN.json'));

assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_TOOLS: true', 'Public Truth Tools feature flag');
assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_TOOLS_HUB: true', 'Tools Hub feature flag');
assertIncludes(features, '__docs__/menulist-tools/tools-hub/tools-hub_impl.md', 'Tools Hub doc pointer');
assertIncludes(packageJson, '"verify:tools-hub"', 'Tools Hub package verifier');
assertIncludes(aggregateVerifier, 'verify-tools-hub.js', 'Public Truth Tools aggregate verifier');

assertIncludes(route, 'WebsitePageStructuredData', 'Tools Hub route structured data');
assertIncludes(route, 'path="/tools"', 'Tools Hub structured data path');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', 'Tools Hub route family feature flag');
assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS_HUB', 'Tools Hub route feature flag');
assertIncludes(route, 'notFound()', 'Tools Hub route flag guard');

assertIncludes(component, "useTranslations('Website.ToolsHubPage')", 'Tools Hub localized copy');
assertIncludes(component, 'TOOLS_HUB_GROUPS', 'Tools Hub group registry');
assertIncludes(component, 'WebsiteButton href="/tools/public-truth-check"', 'Tools Hub primary check CTA');
assertIncludes(component, 'WebsiteButton href="/create-menu"', 'Tools Hub fix path CTA');
assertIncludes(component, 'href="/features/business-health"', 'Tools Hub owner health CTA');
assertIncludes(css, '.ws-tools-hub', 'Tools Hub styles');
assertSameSet(
  collectComponentLiteralValues(component, 'href').filter((href) => href.startsWith('/tools/')),
  TOOL_ROUTES.slice().sort(),
  'Tools Hub component route registry',
);
assertSameSet(
  collectComponentLiteralValues(component, 'key').filter((key) => TOOL_KEYS.includes(key)),
  TOOL_KEYS.slice().sort(),
  'Tools Hub component key registry',
);

for (const routePath of TOOL_ROUTES) {
  assertIncludes(component, `href: '${routePath}'`, `Tools Hub component route ${routePath}`);
  assertIncludes(llmsFull, `https://menulist.ai${routePath}`, `Tools Hub llms-full tool route ${routePath}`);
}

for (const content of [route, component]) {
  assertNotIncludes(content, 'fetch(', 'Tools Hub static runtime');
  assertNotIncludes(content, '/api/public/contact', 'Tools Hub must not submit contact handoff');
  assertNotIncludes(content, 'TurnstileWidget', 'Tools Hub must not render a contact/security form');
  assertNotIncludes(content, 'firebase', 'Tools Hub static runtime');
  assertNotIncludes(content, 'firestore', 'Tools Hub static runtime');
  assertNotIncludes(content, 'addDoc', 'Tools Hub static runtime');
  assertNotIncludes(content, 'setDoc', 'Tools Hub static runtime');
  assertNotIncludes(content, 'updateDoc', 'Tools Hub static runtime');
  assertNotIncludes(content, 'window.open', 'Tools Hub must not open external links');
  assertNotIncludes(content, 'location.href', 'Tools Hub must not manually navigate');
  assertNotIncludes(content, '@google/genai', 'Tools Hub AI/provider boundary');
  assertNotIncludes(content, 'businessinformation.googleapis.com', 'Tools Hub external platform boundary');
  assertNotIncludes(content, 'maps.googleapis.com', 'Tools Hub external platform boundary');
}

for (const content of [route, component, llms, llmsFull]) {
  assertNotIncludes(content, 'guaranteed ranking', 'Tools Hub ranking boundary');
  assertNotIncludes(content, 'guaranteed citation', 'Tools Hub citation boundary');
  assertNotIncludes(content, 'guaranteed AI visibility', 'Tools Hub AI visibility boundary');
  assertNotIncludes(content, 'we scanned your website', 'Tools Hub crawl claim boundary');
  assertNotIncludes(content, 'we checked your Google profile', 'Tools Hub external profile claim boundary');
}

assertIncludes(header, '{ href: "/tools", key: "resourceToolsHub"', 'Tools Hub header Resources link');
assertIncludes(header, 'isToolsPath', 'Tools Hub header active path');
assertIncludes(footer, "{ href: '/tools', key: 'toolsHub' }", 'Tools Hub footer link');
assertIncludes(discoveryPolicy, "path: '/tools'", 'Tools Hub discovery policy');
assertIncludes(sitemap, 'https://menulist.ai/tools', 'Tools Hub sitemap');
assertIncludes(llms, '[MenuList Tools](https://menulist.ai/tools)', 'Tools Hub llms.txt');
assertIncludes(llmsFull, 'https://menulist.ai/tools', 'Tools Hub llms-full.txt');

assert(enUS.Website?.ToolsHubPage, 'en-US ToolsHubPage locale keys must exist');
assert(hiIN.Website?.ToolsHubPage, 'hi-IN ToolsHubPage locale keys must exist');
assert(enUS.Website.Header?.resourceToolsHub, 'en-US Header Tools Hub key must exist');
assert(hiIN.Website.Header?.resourceToolsHub, 'hi-IN Header Tools Hub key must exist');
assert(enUS.Website.Footer?.toolsHub, 'en-US Footer Tools Hub key must exist');
assert(hiIN.Website.Footer?.toolsHub, 'hi-IN Footer Tools Hub key must exist');

for (const locale of [enUS, hiIN]) {
  assert(locale.Website.ToolsHubPage.groups.publicTruth, 'Tools Hub publicTruth group locale must exist');
  assert(locale.Website.ToolsHubPage.groups.menuServiceClarity, 'Tools Hub menuServiceClarity group locale must exist');
  assert(locale.Website.ToolsHubPage.groups.customerActionReadiness, 'Tools Hub customerActionReadiness group locale must exist');
  assert(locale.Website.ToolsHubPage.groups.printShareAssets, 'Tools Hub printShareAssets group locale must exist');
  assert(locale.Website.ToolsHubPage.groups.trustSetup, 'Tools Hub trustSetup group locale must exist');
  for (const key of TOOL_KEYS) {
    assert(locale.Website.ToolsHubPage.tools[key], `Tools Hub locale tool copy missing: ${key}`);
    assert(locale.Website.ToolsHubPage.tools[key].title, `Tools Hub locale tool title missing: ${key}`);
    assert(locale.Website.ToolsHubPage.tools[key].description, `Tools Hub locale tool description missing: ${key}`);
  }
}

assertIncludes(readmeDoc, '## Version Ladder', 'Tools Hub README');
assertIncludes(specDoc, 'The hub is an index, not a report runner', 'Tools Hub spec boundary');
assertIncludes(specDoc, `All ${TOOL_ROUTES.length} current public tool routes are visible.`, 'Tools Hub spec current route count');
assertIncludes(implDoc, 'No report builder, API route, Firebase read/write, provider call, crawler, upload, or contact handoff is added', 'Tools Hub implementation boundary');
assertIncludes(implDoc, `expected ${TOOL_ROUTES.length} public routes`, 'Tools Hub implementation current route count');
assertIncludes(implDoc, `all ${TOOL_ROUTES.length} current tool routes are listed`, 'Tools Hub verification current route count');
assertIncludes(firebaseDoc, 'Firestore reads | 0', 'Tools Hub Firebase reads boundary');
assertIncludes(firebaseDoc, 'External URL fetches | 0', 'Tools Hub external fetch boundary');
assertIncludes(firebaseDoc, 'AI/provider calls | 0', 'Tools Hub provider boundary');
assertIncludes(mobileDoc, 'The public hub is responsive website UI only', 'Tools Hub mobile boundary');
assertIncludes(testCasesDoc, 'TH-001', 'Tools Hub test cases');
assertIncludes(testCasesDoc, `All ${TOOL_ROUTES.length} current public tool routes are present`, 'Tools Hub test cases current route count');
assertIncludes(validationDoc, 'npm run verify:tools-hub', 'Tools Hub validation source gate');
assertDocsNotInclude(REQUIRED_DOCS, 'All 13 current public tool routes', 'Tools Hub active docs stale 13-route count');
assertDocsNotInclude(REQUIRED_DOCS, 'expected sixteen public routes', 'Tools Hub active docs stale sixteen-route count');
assertDocsNotInclude(REQUIRED_DOCS, 'all 16 current tool routes', 'Tools Hub active docs stale 16-route count');
assertIncludes(toolsReadmeDoc, '[tools-hub](./tools-hub/README.md)', 'MenuList Tools README link');
assertIncludes(familyReadmeDoc, '/tools', 'Public Truth Tools family hub route');
assertIncludes(familyImplDoc, 'Tools Hub', 'Public Truth Tools implementation hub note');
assertIncludes(familyFirebaseDoc, 'Tools Hub', 'Public Truth Tools Firebase hub note');
assertIncludes(familyTestsDoc, 'TH-001', 'Public Truth Tools family tests hub note');
assertIncludes(mainWebsiteContent, 'MenuList Tools hub route note', 'Main website content Tools Hub note');
assertIncludes(mainWebsiteImpl, 'Tools Hub website index', 'Main website implementation Tools Hub note');

console.log('Tools Hub verification passed');
