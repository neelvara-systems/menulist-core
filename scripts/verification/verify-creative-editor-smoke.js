const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const checks = [];
const OLD_EDITOR_TEST_ENV_NAME = ["CAMPAIGNCUE", "ENABLE", "EDITOR", "TEST", "ROUTE"].join("_");
const OLD_EDITOR_TEST_ENV_GATE = `process.env.${OLD_EDITOR_TEST_ENV_NAME}`;

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
  checks.push(message);
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} includes ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} excludes ${needle}`);
}

function verifySmokeRoute() {
  const features = read("src/config/features.ts");
  const page = read("src/app/(internal)/creative-editor-smoke/page.tsx");
  const client = read("src/app/(internal)/creative-editor-smoke/CreativeEditorSmokeClient.tsx");
  const mycodexPreviewRoute = read("src/app/sites/mycodex/creative-editor-test/page.tsx");
  const campaigncueLocalTestPage = read("src/app/(campaigncue)/campaigncue/app/editor-test/page.tsx");
  const campaigncuePreviewClient = read("src/components/templates/campaigncue/CampaignCueEditorPreviewClient.tsx");
  const campaigncueLocalTestClient = read("src/app/(campaigncue)/campaigncue/app/editor-test/CampaignCueEditorTestClient.tsx");

  assertIncludes(page, "process.env.NODE_ENV === \"production\"", "Smoke route production guard");
  assertIncludes(page, "notFound()", "Smoke route fails closed in production");
  assertIncludes(page, "searchParams", "Smoke route query-driven QA mode");
  assertIncludes(page, "variant === \"stress\"", "Smoke route stress variant");
  assertIncludes(page, "buildStressElements", "Smoke route large-design fixture");
  assertIncludes(page, "enableQaProbe", "Smoke route QA probe toggle");

  assertIncludes(client, "data-creative-editor-qa-status", "Smoke client visible QA status");
  assertIncludes(client, "__creativeEditorSmokeQa", "Smoke client machine-readable QA state");
  assertIncludes(client, "sampleCanvasColorCount", "Smoke client visual canvas pixel check");
  assertIncludes(client, "Shortcut dialog traps focus", "Smoke client shortcut focus regression");
  assertIncludes(client, "Preview export opens as a PNG", "Smoke client export visual regression");
  assertIncludes(client, "Top-bar toggles keep the viewport stable", "Smoke client top-bar toggle regression");
  assertIncludes(client, "Rail tabs and drawer insertions create editable layers", "Smoke client rail and drawer regression");
  assertIncludes(client, "Keyboard creation shortcuts use normal history", "Smoke client keyboard creation regression");
  assertIncludes(client, "Floating toolbar stays below selection border", "Smoke client floating toolbar bottom-anchor regression");
  assertIncludes(client, "dataset.selectionBottom", "Smoke client reads floating toolbar selection-bottom QA data");
  assertIncludes(client, "Layer panel opens with draggable layer rows", "Smoke client layer drawer regression");
  assertIncludes(client, "Text inspector fields keep focus", "Smoke client focus regression");
  assertIncludes(client, "Escape clears selection first", "Smoke client staged Escape regression");

  assertIncludes(features, "ENABLE_CAMPAIGNCUE_EDITOR_TEST_ROUTE", "Feature flags expose editor test route gate");
  assertIncludes(mycodexPreviewRoute, "FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_EDITOR_TEST_ROUTE", "MyCodex editor preview is feature-flag gated");
  assertIncludes(campaigncueLocalTestPage, "FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_EDITOR_TEST_ROUTE", "CampaignCue local editor test is feature-flag gated");
  assertNotIncludes(mycodexPreviewRoute, OLD_EDITOR_TEST_ENV_GATE, "MyCodex editor preview");
  assertNotIncludes(campaigncueLocalTestPage, OLD_EDITOR_TEST_ENV_GATE, "CampaignCue local editor test");
  assertIncludes(mycodexPreviewRoute, "notFound()", "MyCodex editor preview fails closed");
  assertIncludes(mycodexPreviewRoute, "robots", "MyCodex editor preview is noindex");
  assertIncludes(mycodexPreviewRoute, "CampaignCueEditorPreviewClient", "MyCodex editor preview reuses editor fixture");
  assertIncludes(campaigncuePreviewClient, "CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTIONS", "Editor preview includes AI tool actions");
  assertIncludes(campaigncuePreviewClient, "CAMPAIGNCUE_DESIGN_CUE_COMMANDS", "Editor preview includes Design Cue actions");
  assertIncludes(campaigncuePreviewClient, "sourceSurface: \"campaigncue-editor-test\"", "Editor preview uses test-only source surface");
  assertIncludes(campaigncueLocalTestClient, "CampaignCueEditorPreviewClient", "Local editor test reuses preview client");
}

function verifyEditorQaHooks() {
  const editor = read("src/modules/creative-editor/CreativeEditor.tsx");

  assertIncludes(editor, "shortcutButtonRef", "Editor shortcut focus restore ref");
  assertIncludes(editor, "previewButtonRef", "Editor preview focus restore ref");
  assertIncludes(editor, "trapDialogFocus", "Editor dialog focus trap");
  assertIncludes(editor, "closeShortcutPanel", "Editor shortcut close helper");
  assertIncludes(editor, "closePreviewPanel", "Editor preview close helper");
  assertIncludes(editor, "data-creative-editor-root", "Editor root QA selector");
  assertIncludes(editor, "data-creative-editor-active-tool", "Editor active tool QA selector");
  assertIncludes(editor, "data-creative-editor-body", "Editor body QA selector");
  assertIncludes(editor, "data-creative-editor-canvas", "Editor canvas QA selector");
  assertIncludes(editor, "data-creative-editor-stage", "Editor stage QA selector");
  assertIncludes(editor, "data-creative-editor-floating-toolbar", "Editor floating toolbar QA selector");
  assertIncludes(editor, "data-creative-editor-action=\"toggle-grid\"", "Editor grid action QA selector");
  assertIncludes(editor, "data-creative-editor-action=\"toggle-safe-area\"", "Editor safe area action QA selector");
  assertIncludes(editor, "data-creative-editor-action=\"review\"", "Editor review action QA selector");
  assertIncludes(editor, "data-creative-editor-action=\"toggle-theme\"", "Editor theme action QA selector");
  assertIncludes(editor, "data-creative-editor-tool={tool.id}", "Editor rail tool QA selector");
  assertIncludes(editor, "data-creative-editor-dialog=\"shortcuts\"", "Editor shortcut dialog QA selector");
  assertIncludes(editor, "data-creative-editor-dialog=\"preview\"", "Editor preview dialog QA selector");
  assertIncludes(editor, "data-creative-editor-action=\"layers\"", "Editor layer panel action selector");
  assertIncludes(editor, "data-creative-editor-action=\"edit-selected-layer\"", "Editor layer edit action selector");
  assertIncludes(editor, "data-creative-layer-id", "Editor layer row QA selector");
  assertIncludes(editor, "data-creative-editor-field=\"selected-text\"", "Editor text field QA selector");
  assertIncludes(editor, "data-creative-editor-field=\"selected-font-size\"", "Editor text size field QA selector");
  assertIncludes(editor, 'chromeMode?: "embedded" | "full"', "Editor exposes explicit chrome mode contract");
  assertIncludes(editor, 'chromeMode = "full"', "Editor defaults to full product chrome");
  assertIncludes(editor, 'const browserDraftsEnabled = chromeMode === "full"', "Editor disables browser drafts in embedded mode");
  assertIncludes(editor, 'const showInternalExportTools = chromeMode === "full"', "Editor hides internal export shortcuts in embedded mode");
  assertIncludes(editor, 'data-chrome-mode={chromeMode}', "Editor root exposes chrome mode for layout verification");
  assertIncludes(editor, 'chromeMode === "full"', "Editor top chrome is full-mode only");
  assertIncludes(editor, "QR_ACTION_PRESETS", "Editor exposes guided QR action presets");
  assertIncludes(editor, "Add action card", "Editor QR drawer prioritizes action-card insertion");
  assertIncludes(editor, "QR quiet-zone panel", "Editor QR action card includes a white quiet-zone panel");
  assertIncludes(editor, 'errorCorrectionLevel: "H"', "Editor QR defaults use high error correction");
  assertIncludes(editor, "margin: 4", "Editor QR defaults use four-module quiet-zone margin");
  assertIncludes(editor, 'lightColor: "#ffffff"', "Editor QR action cards preserve white QR panels");
  assertNotIncludes(editor, "templateRegistryDal", "Shared editor does not import product template registry DAL");
  assertNotIncludes(editor, "storeAssetTemplates", "Shared editor does not import MenuList store template collection");
}

function verifyDocsAndScripts() {
  const packageJson = read("package.json");
  const readme = read("__docs__/shared-creative-editor/README.md");
  const impl = read("__docs__/shared-creative-editor/shared-creative-editor_impl.md");
  const tests = read("__docs__/shared-creative-editor/shared-creative-editor_test-cases.md");
  const validation = read("__docs__/shared-creative-editor/shared-creative-editor_validation.md");
  const brandedQrReadme = read("__docs__/branded-qr-action-templates/README.md");
  const brandedQrImpl = read("__docs__/branded-qr-action-templates/branded-qr-action-templates_impl.md");
  const brandedQrTests = read("__docs__/branded-qr-action-templates/branded-qr-action-templates_test-cases.md");

  assertIncludes(packageJson, "verify:creative-editor-smoke", "Package exposes creative editor smoke verifier");
  assertIncludes(readme, "/creative-editor-smoke?qa=1", "Shared editor README documents QA smoke route");
  assertIncludes(readme, "https://www.menulist.digital/creative-editor-test", "Shared editor README documents deployed preview route");
  assertIncludes(impl, "focus restoration", "Shared editor impl documents focus restoration");
  assertIncludes(impl, "stress variant", "Shared editor impl documents stress variant");
  assertIncludes(impl, "ENABLE_CAMPAIGNCUE_EDITOR_TEST_ROUTE", "Shared editor impl documents deployed preview gate");
  assertNotIncludes(readme, OLD_EDITOR_TEST_ENV_NAME, "Shared editor README");
  assertNotIncludes(impl, OLD_EDITOR_TEST_ENV_NAME, "Shared editor impl");
  assertNotIncludes(tests, OLD_EDITOR_TEST_ENV_NAME, "Shared editor tests");
  assertNotIncludes(validation, OLD_EDITOR_TEST_ENV_NAME, "Shared editor validation");
  assertIncludes(tests, "verify:creative-editor-smoke", "Shared editor tests include static verifier");
  assertIncludes(tests, "/creative-editor-test", "Shared editor tests include deployed preview route");
  assertIncludes(tests, "Keyboard traversal", "Shared editor tests include accessibility traversal");
  assertIncludes(validation, "Creative Editor Smoke QA", "Shared editor validation documents browser QA");
  assertIncludes(validation, "MyCodex Deployed Editor Preview", "Shared editor validation documents deployed preview route");
  assertIncludes(brandedQrReadme, "The shared Creative Editor QR drawer provides guided action-card presets", "Branded QR README documents editor QR action presets");
  assertIncludes(brandedQrImpl, "Project style changes and campaign starters must preserve those QR safety fields", "Branded QR impl documents QR safety preservation");
  assertIncludes(brandedQrTests, "QR drawer shows guided action presets", "Branded QR tests include editor QR action presets");
}

verifySmokeRoute();
verifyEditorQaHooks();
verifyDocsAndScripts();

console.log(`verify-creative-editor-smoke: ${checks.length} checks passed`);
