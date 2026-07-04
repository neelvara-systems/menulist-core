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

const DOC_ROOT = '__docs__/menulist-tools/print-share-tools';
const COMPONENT_PATH = 'src/components/website/printShareTools/PrintShareToolPage.tsx';
const CONFIG_PATH = 'src/lib/public-asset-tools/printShareToolConfig.ts';
const REPORT_PATH = 'src/lib/public-asset-tools/printShareToolReport.ts';
const RENDER_PATH = 'src/lib/public-asset-tools/printShareToolRender.ts';
const TYPES_PATH = 'src/lib/public-asset-tools/printShareToolTypes.ts';

const PRINT_SHARE_TOOLS = [
  {
    slug: 'qr-poster-maker',
    label: 'QR Poster Maker',
    key: 'qrPosterMaker',
    eventPrefix: 'qr_poster_maker',
    featureFlag: 'ENABLE_PUBLIC_ASSET_QR_POSTER_MAKER',
  },
  {
    slug: 'whatsapp-menu-status-maker',
    label: 'WhatsApp Menu Status Maker',
    key: 'whatsappMenuStatusMaker',
    eventPrefix: 'whatsapp_menu_status_maker',
    featureFlag: 'ENABLE_PUBLIC_ASSET_WHATSAPP_MENU_STATUS_MAKER',
  },
  {
    slug: 'holiday-hours-poster-maker',
    label: 'Holiday Hours Poster Maker',
    key: 'holidayHoursPosterMaker',
    eventPrefix: 'holiday_hours_poster_maker',
    featureFlag: 'ENABLE_PUBLIC_ASSET_HOLIDAY_HOURS_POSTER_MAKER',
  },
  {
    slug: 'customer-link-card-maker',
    label: 'Customer Link Card Maker',
    key: 'customerLinkCardMaker',
    eventPrefix: 'customer_link_card_maker',
    featureFlag: 'ENABLE_PUBLIC_ASSET_CUSTOMER_LINK_CARD_MAKER',
  },
  {
    slug: 'feedback-qr-card-maker',
    label: 'Feedback QR Card Maker',
    key: 'feedbackQrCardMaker',
    eventPrefix: 'feedback_qr_card_maker',
    featureFlag: 'ENABLE_PUBLIC_ASSET_FEEDBACK_QR_CARD_MAKER',
  },
];

const REQUIRED_DOCS = [
  `${DOC_ROOT}/README.md`,
  `${DOC_ROOT}/print-share-tools_spec.md`,
  `${DOC_ROOT}/print-share-tools_impl.md`,
  `${DOC_ROOT}/print-share-tools_marketing.md`,
  `${DOC_ROOT}/print-share-tools_website.md`,
  `${DOC_ROOT}/print-share-tools_helpdoc.md`,
  `${DOC_ROOT}/print-share-tools_firebase.md`,
  `${DOC_ROOT}/print-share-tools_mobile-support.md`,
  `${DOC_ROOT}/print-share-tools_test-cases.md`,
  `${DOC_ROOT}/print-share-tools_validation.md`,
];

for (const file of [
  COMPONENT_PATH,
  CONFIG_PATH,
  REPORT_PATH,
  RENDER_PATH,
  TYPES_PATH,
  'src/styles/website.css',
  ...REQUIRED_DOCS,
  ...PRINT_SHARE_TOOLS.map((tool) => `src/app/(website)/tools/${tool.slug}/page.tsx`),
]) {
  assert(exists(file), `Print & Share Tools file missing: ${file}`);
}

const component = read(COMPONENT_PATH);
const config = read(CONFIG_PATH);
const report = read(REPORT_PATH);
const render = read(RENDER_PATH);
const types = read(TYPES_PATH);
const css = read('src/styles/website.css');
const features = read('src/config/features.ts');
const discoveryPolicy = read('src/lib/seo/discoveryPolicy.ts');
const sitemap = read('public/sitemap.xml');
const llms = read('public/llms.txt');
const llmsFull = read('public/llms-full.txt');
const packageJson = read('package.json');
const toolsReadme = read('__docs__/menulist-tools/README.md');
const toolsHubDoc = read('__docs__/menulist-tools/tools-hub/README.md');
const toolsHubVerifier = read('scripts/verification/verify-tools-hub.js');
const aggregateVerifier = read('scripts/verification/verify-public-truth-tools.js');
const shareableVerifier = read('scripts/verification/verify-shareable-tool-reports.js');
const enUS = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
const hiIN = JSON.parse(read('public/locales/menulist.ai/hi-IN.json'));
const docs = REQUIRED_DOCS.map((docPath) => [docPath, read(docPath)]);

assertIncludes(features, 'ENABLE_PUBLIC_ASSET_TOOLS: true', 'Print & Share Tools family feature flag');
assertIncludes(features, '__docs__/menulist-tools/print-share-tools/print-share-tools_impl.md', 'Print & Share Tools doc pointer');
assertIncludes(packageJson, '"verify:print-share-tools"', 'Print & Share Tools package verifier');
assertIncludes(aggregateVerifier, 'verify-print-share-tools.js', 'Print & Share Tools aggregate verifier');
assertIncludes(shareableVerifier, COMPONENT_PATH, 'Shareable Tool Reports source-tool verifier');

assertIncludes(component, "useTranslations('Website.PrintShareToolPage')", 'Print & Share Tools localized page');
assertIncludes(component, 'renderPrintShareToolAsset(nextReport)', 'Print & Share Tools browser-local render action');
assertIncludes(component, 'svgToPngBlob(renderedAsset.svg', 'Print & Share Tools PNG download');
assertIncludes(component, 'svgToPdfBlob(renderedAsset.svg', 'Print & Share Tools PDF download');
assertIncludes(component, 'printSvgAsset(renderedAsset.svg', 'Print & Share Tools print action');
assertIncludes(component, 'createShareableToolReportUrl(shareableReportPayload)', 'Print & Share Tools shareable report link');
assertIncludes(component, "primaryLabel: sharedT('primaryLabel')", 'Print & Share Tools shared summary primary label');
assertIncludes(component, 'value={shareableReportUrl}', 'Print & Share Tools visible shareable report URL field');
assertIncludes(component, 'ws-print-share-tool-report-link', 'Print & Share Tools public report open link');
assertIncludes(component, 'onFocus={(event) => event.currentTarget.select()}', 'Print & Share Tools manual copy fallback selection');
assertIncludes(component, 'WebsiteButton href="/create-menu"', 'Print & Share Tools MenuList fix path');
assertIncludes(component, 'href="/tools"', 'Print & Share Tools hub path');
assertIncludes(css, '.ws-print-share-tool-preview', 'Print & Share Tools preview styles');
assertIncludes(css, '.ws-print-share-tool-mini-grid', 'Print & Share Tools route switcher styles');
assertIncludes(css, '.ws-print-share-tool-report-link-box', 'Print & Share Tools visible report-link field styles');
assertIncludes(css, '.ws-print-share-tool-report-link', 'Print & Share Tools open report-link styles');

assertIncludes(config, "templateId: 'poster'", 'Print & Share Tools poster template use');
assertIncludes(config, "templateId: 'story'", 'Print & Share Tools story template use');
assertIncludes(config, "templateId: 'wide-banner'", 'Print & Share Tools card template use');
assertIncludes(report, 'createCreativeEditorDocument', 'Print & Share Tools creative editor document contract');
assertIncludes(report, 'buildCreativeEditorQrElement', 'Print & Share Tools creative QR element contract');
assertIncludes(report, 'CREATIVE_EDITOR_SCHEMA_VERSION', 'Print & Share Tools creative editor schema version');
assertIncludes(report, 'templateSaved: false', 'Print & Share Tools no saved template boundary');
assertIncludes(report, 'fullEditorExposed: false', 'Print & Share Tools no full editor boundary');
assertIncludes(report, 'fileStored: false', 'Print & Share Tools no file storage boundary');
assertIncludes(report, 'reportStored: false', 'Print & Share Tools no report storage boundary');
assertIncludes(report, 'externalSourcesFetched: false', 'Print & Share Tools no external fetch boundary');
assertIncludes(report, 'aiOrSearchChecked: false', 'Print & Share Tools no AI/search boundary');
assertIncludes(report, 'externalPlatformUpdated: false', 'Print & Share Tools no external mutation boundary');
assertIncludes(report, 'evidenceText: getEvidenceText(evidence)', 'Print & Share Tools evidence text contract');
assertIncludes(report, 'function parsePublicHttpsUrl', 'Print & Share Tools public HTTPS URL parser');
assertIncludes(report, "url.protocol !== 'https:'", 'Print & Share Tools must reject insecure URL protocols');
assertIncludes(report, "normalized === 'localhost'", 'Print & Share Tools must reject localhost links');
assertIncludes(report, "normalized.endsWith('.local')", 'Print & Share Tools must reject local network hostnames');
assertIncludes(report, 'isPrivateIpv4', 'Print & Share Tools must reject private IPv4 links');
assertIncludes(report, 'url.username || url.password', 'Print & Share Tools must reject credentialed URLs');
assertIncludes(report, 'customerLink: normalizedCustomerLink', 'Print & Share Tools must not render invalid links into QR targets');
assertIncludes(report, 'HTTPS public URL format was checked locally. The destination page was not opened or fetched.', 'Print & Share Tools URL evidence boundary');
assertIncludes(report, 'Local, private, or insecure URLs are not ready for customer QR assets.', 'Print & Share Tools invalid URL evidence boundary');
assertIncludes(report, 'No file was uploaded, saved, or added to the owner template registry.', 'Print & Share Tools file/template storage evidence');
assertIncludes(render, 'generateQrCodeDataUrl', 'Print & Share Tools local QR generation');
assertIncludes(render, 'jsPDF', 'Print & Share Tools PDF export');
assertIncludes(render, "document.createElement('iframe')", 'Print & Share Tools owned print frame');
assertIncludes(render, "printFrame.referrerPolicy = 'no-referrer'", 'Print & Share Tools print frame referrer boundary');
assertIncludes(render, 'printWindow.print()', 'Print & Share Tools browser print action');
assertIncludes(render, 'print_share_tool_print_frame_unavailable', 'Print & Share Tools print frame failure sentinel');
assertIncludes(types, 'CreativeEditorDocument', 'Print & Share Tools report type stores creative editor document contract');

for (const content of [component, config, report, render, types]) {
  assertNotIncludes(content, 'firebase/firestore', 'Print & Share Tools Firestore boundary');
  assertNotIncludes(content, 'firebase/storage', 'Print & Share Tools Storage boundary');
  assertNotIncludes(content, 'addDoc(', 'Print & Share Tools write boundary');
  assertNotIncludes(content, 'setDoc(', 'Print & Share Tools write boundary');
  assertNotIncludes(content, 'updateDoc(', 'Print & Share Tools write boundary');
  assertNotIncludes(content, 'uploadBytes', 'Print & Share Tools upload boundary');
  assertNotIncludes(content, 'getServerSession', 'Print & Share Tools public/no-login boundary');
  assertNotIncludes(content, 'withAuth', 'Print & Share Tools public/no-login boundary');
  assertNotIncludes(content, '@google/genai', 'Print & Share Tools AI/provider boundary');
  assertNotIncludes(content, 'openai', 'Print & Share Tools AI/provider boundary');
  assertNotIncludes(content, 'businessinformation.googleapis.com', 'Print & Share Tools Google API boundary');
  assertNotIncludes(content, 'maps.googleapis.com', 'Print & Share Tools Maps API boundary');
  assertNotIncludes(content, '/api/public/contact', 'Print & Share Tools no direct contact form boundary');
  assertNotIncludes(content, '/api/tools', 'Print & Share Tools no report API boundary');
}

assertNotIncludes(component, 'type="file"', 'Print & Share Tools must not expose V0 upload control');
assertNotIncludes(component, "sharedT('summary.primaryLabel')", 'Print & Share Tools must not use stale shared summary primary label path');
assertNotIncludes(render, 'fetch(', 'Print & Share Tools render path must not fetch external pages');
assertNotIncludes(report, 'fetch(', 'Print & Share Tools report path must not fetch external pages');
assertNotIncludes(report, "url.protocol === 'http:' || url.protocol === 'https:'", 'Print & Share Tools must not accept insecure URL protocols');
assertNotIncludes(report, "url.hostname === 'localhost'", 'Print & Share Tools must not accept localhost links');
assertNotIncludes(render, "window.open('', '_blank'", 'Print & Share Tools render path must not use unsafe blank popup print windows');

assert(enUS.Website?.PrintShareToolPage, 'en-US PrintShareToolPage locale namespace must exist');
assert(hiIN.Website?.PrintShareToolPage, 'hi-IN PrintShareToolPage locale namespace must exist');
assert(enUS.Website.PrintShareToolPage.reportActions?.shareUrlLabel, 'en-US Print Share report URL label must exist');
assert(hiIN.Website.PrintShareToolPage.reportActions?.shareUrlLabel, 'hi-IN Print Share report URL label must exist');
assert(enUS.Website.PrintShareToolPage.reportActions?.openPublicReport, 'en-US Print Share open report label must exist');
assert(hiIN.Website.PrintShareToolPage.reportActions?.openPublicReport, 'hi-IN Print Share open report label must exist');
assert(enUS.Website?.ToolsHubPage?.groups?.printShareAssets, 'en-US Tools Hub printShareAssets locale group must exist');
assert(hiIN.Website?.ToolsHubPage?.groups?.printShareAssets, 'hi-IN Tools Hub printShareAssets locale group must exist');

for (const tool of PRINT_SHARE_TOOLS) {
  const routePath = `/tools/${tool.slug}`;
  const routeFile = `src/app/(website)/tools/${tool.slug}/page.tsx`;
  const route = read(routeFile);

  assertIncludes(config, `'${tool.slug}'`, `${tool.slug} config slug`);
  assertIncludes(config, `route: '${routePath}'`, `${tool.slug} config route`);
  assertIncludes(config, `eventPrefix: '${tool.eventPrefix}'`, `${tool.slug} event prefix`);
  assertIncludes(config, `featureFlag: '${tool.featureFlag}'`, `${tool.slug} config feature flag`);
  assertIncludes(features, `${tool.featureFlag}: true`, `${tool.slug} feature flag`);
  assertIncludes(route, `path="${routePath}"`, `${tool.slug} route structured-data path`);
  assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', `${tool.slug} public tools family route guard`);
  assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_ASSET_TOOLS', `${tool.slug} public asset family route guard`);
  assertIncludes(route, `FEATURE_FLAGS.${tool.featureFlag}`, `${tool.slug} route feature guard`);
  assertIncludes(route, 'PrintShareToolPage', `${tool.slug} shared component`);
  assertNotIncludes(route, 'getServerSession', `${tool.slug} route must be public`);
  assertNotIncludes(route, 'withAuth', `${tool.slug} route must be public`);

  assertIncludes(discoveryPolicy, `path: '${routePath}'`, `${tool.slug} discovery policy`);
  assertIncludes(sitemap, `https://menulist.ai${routePath}`, `${tool.slug} sitemap`);
  assertIncludes(llms, `https://menulist.ai${routePath}`, `${tool.slug} llms.txt`);
  assertIncludes(llmsFull, `https://menulist.ai${routePath}`, `${tool.slug} llms-full.txt`);
  assertIncludes(toolsHubVerifier, routePath, `${tool.slug} Tools Hub verifier route`);
  assertIncludes(toolsHubVerifier, tool.key, `${tool.slug} Tools Hub verifier key`);

  assert(enUS.Website.PrintShareToolPage.tools?.[tool.slug], `en-US PrintShareToolPage copy missing for ${tool.slug}`);
  assert(hiIN.Website.PrintShareToolPage.tools?.[tool.slug], `hi-IN PrintShareToolPage copy missing for ${tool.slug}`);
  assert(enUS.Website.ToolsHubPage.tools?.[tool.key], `en-US Tools Hub card missing for ${tool.key}`);
  assert(hiIN.Website.ToolsHubPage.tools?.[tool.key], `hi-IN Tools Hub card missing for ${tool.key}`);
}

assertIncludes(toolsReadme, '[print-share-tools](./print-share-tools/README.md)', 'MenuList Tools README link');
assertIncludes(toolsHubDoc, 'Print & Share Assets', 'Tools Hub docs group');
assertIncludes(toolsHubDoc, 'QR Poster Maker', 'Tools Hub docs asset route list');

for (const [docPath, docContent] of docs) {
  assertIncludes(docContent, 'Last Updated:** July 4, 2026', `${docPath} current documentation date`);
  assertIncludes(docContent, 'public', `${docPath} public access boundary`);
  assertIncludes(docContent, 'browser-local', `${docPath} browser-local boundary`);
}

assertIncludes(read(`${DOC_ROOT}/README.md`), '/tools/qr-poster-maker', 'Print & Share Tools README route list');
assertIncludes(read(`${DOC_ROOT}/README.md`), 'visible in a readonly field', 'Print & Share Tools README visible report URL fallback');
assertIncludes(read(`${DOC_ROOT}/README.md`), 'public HTTPS customer link', 'Print & Share Tools README public HTTPS URL boundary');
assertIncludes(read(`${DOC_ROOT}/print-share-tools_spec.md`), 'These tools are public-use tools, not restricted to MenuList users', 'Print & Share Tools spec public access rule');
assertIncludes(read(`${DOC_ROOT}/print-share-tools_spec.md`), 'public HTTPS customer link', 'Print & Share Tools spec public HTTPS URL boundary');
assertIncludes(read(`${DOC_ROOT}/print-share-tools_impl.md`), 'No API route is added', 'Print & Share Tools implementation API boundary');
assertIncludes(read(`${DOC_ROOT}/print-share-tools_impl.md`), 'public HTTPS URL', 'Print & Share Tools implementation public HTTPS URL boundary');
assertIncludes(read(`${DOC_ROOT}/print-share-tools_impl.md`), 'visible readonly public report URL field', 'Print & Share Tools implementation visible report URL fallback');
assertIncludes(read(`${DOC_ROOT}/print-share-tools_firebase.md`), 'Firestore reads | 0', 'Print & Share Tools Firebase reads boundary');
assertIncludes(read(`${DOC_ROOT}/print-share-tools_firebase.md`), 'Storage operations | 0', 'Print & Share Tools Storage boundary');
assertIncludes(read(`${DOC_ROOT}/print-share-tools_mobile-support.md`), '44px', 'Print & Share Tools mobile touch target note');
assertIncludes(read(`${DOC_ROOT}/print-share-tools_test-cases.md`), 'PST-003A', 'Print & Share Tools insecure/local URL test case coverage');
assertIncludes(read(`${DOC_ROOT}/print-share-tools_test-cases.md`), 'falls back instead of encoding that URL in the QR', 'Print & Share Tools invalid URL QR fallback coverage');
assertIncludes(read(`${DOC_ROOT}/print-share-tools_test-cases.md`), 'PST-007A', 'Print & Share Tools manual copy fallback test case coverage');
assertIncludes(read(`${DOC_ROOT}/print-share-tools_validation.md`), 'npm run verify:print-share-tools', 'Print & Share Tools validation gate');
assertIncludes(read(`${DOC_ROOT}/print-share-tools_validation.md`), 'visible readonly public report URL', 'Print & Share Tools validation manual copy fallback');

console.log('Print & Share Tools verification passed');
