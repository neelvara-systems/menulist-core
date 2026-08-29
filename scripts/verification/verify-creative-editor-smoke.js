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
  assertIncludes(client, "Background panel exposes status and real actions only", "Smoke client background action regression");
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
  assertIncludes(mycodexPreviewRoute, "!explicitTestRouteEnabled || !isLocalHost(host)", "MyCodex editor preview requires both the feature flag and a loopback host");
  assertIncludes(campaigncueLocalTestPage, "!explicitTestRouteEnabled || !isLocalHost(host)", "CampaignCue editor preview requires both the feature flag and a loopback host");
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
  const editorStyles = read("src/modules/creative-editor/CreativeEditor.module.scss");

  assertNotIncludes(editor, "Magic Write", "Editor excludes unimplemented interactive placeholders");
  assertNotIncludes(editor, "product-owned AI contract", "Editor excludes unimplemented interactive placeholders");
  assertIncludes(editor, "shortcutButtonRef", "Editor shortcut focus restore ref");
  assertIncludes(editor, "previewButtonRef", "Editor preview focus restore ref");
  assertIncludes(editor, "trapDialogFocus", "Editor dialog focus trap");
  assertIncludes(editor, "closeShortcutPanel", "Editor shortcut close helper");
  assertIncludes(editor, "closePreviewPanel", "Editor preview close helper");
  assertIncludes(editor, "data-creative-editor-root", "Editor root QA selector");
  assertIncludes(editor, "data-creative-editor-selected-layer-id", "Editor selected-layer QA selector");
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
  assertIncludes(
    editor,
    "if ((patch.from || patch.to) && !patch.stops) {",
    "Editor preserves explicit gradient-stop patches while synchronizing endpoint-only color changes",
  );
  for (const accessibleAction of [
    'aria-label={selectedLayerFrameLocked ? "Selected layer is protected" : selectedLayerLocked ? "Unlock selected layer" : "Lock selected layer"}',
    'aria-label="Duplicate selected layer"',
    'aria-label="Delete selected layer"',
    'aria-label="Align selected layer to left edge"',
    'aria-label="Center selected layer horizontally"',
    'aria-label="Align selected layer to right edge"',
    'aria-label="Center selected layer on background"',
    'aria-label="Align selected layer to top edge"',
    'aria-label="Center selected layer vertically"',
    'aria-label="Align selected layer to bottom edge"',
    'aria-label="Close download check"',
    'aria-label={`Remove gradient stop ${index + 1}`}',
    'aria-label="Bold"',
    'aria-label="Italic"',
    'aria-label="Underline"',
    'aria-label="Strikethrough"',
  ]) {
    assertIncludes(editor, accessibleAction, `Editor inspector action is named: ${accessibleAction}`);
  }
  for (const textStyleState of [
    'aria-pressed={selectedElement.fontWeight === "bold" || selectedElement.fontWeight === "800"}',
    'aria-pressed={selectedElement.fontStyle === "italic"}',
    'aria-pressed={Boolean(selectedElement.underline)}',
    'aria-pressed={Boolean(selectedElement.linethrough)}',
  ]) {
    assertIncludes(editor, textStyleState, `Editor text style exposes pressed state: ${textStyleState}`);
  }
  assert(
    editor.split('onClick={() => updateSelected({ fontWeight: selectedElement.fontWeight === "bold" || selectedElement.fontWeight === "800" || selectedElement.fontWeight === "700" ? "normal" : "bold" } as Partial<CreativeEditorElement>)}').length - 1 === 2,
    "Editor inspector bold toggles deactivate every weight rendered as pressed",
  );
  assertIncludes(editor, 'aria-label="Image filter"', "Editor names the priority image-filter selector");
  assertIncludes(editor, 'aria-label="Image filter adjustments"', "Editor names the advanced image-filter selector");
  assertIncludes(editor, "onClick={runReadinessCheck}", "Editor exposes the governed readiness check action");
  assert(
    editor.split('className={styles.contextualToolbar} onMouseDown={(event) => event.stopPropagation()} role="toolbar"').length - 1 === 5,
    "Editor contextual toolbars retain the active Fabric selection during pointer interaction",
  );
  assertIncludes(editorStyles, ".contextualToolbar {\n  position: relative;\n  z-index: 5;\n  grid-column: 1;\n  grid-row: 1;", "Editor contextual toolbar stays above the full-grid Fabric stage for pointer interaction");
  const hiddenFileInputs = [...editor.matchAll(/<input\s+accept=[\s\S]*?className=\{styles\.hiddenFileInput\}[\s\S]*?\/>/g)];
  assert(hiddenFileInputs.length === 3, "Editor keeps exactly three programmatic file inputs");
  for (const [index, match] of hiddenFileInputs.entries()) {
    assertIncludes(match[0], 'aria-hidden="true"', `Editor hidden file input ${index + 1} is absent from the accessibility tree`);
    assertIncludes(match[0], "\n                hidden\n", `Editor hidden file input ${index + 1} is not visually or semantically exposed`);
    assertIncludes(match[0], "tabIndex={-1}", `Editor hidden file input ${index + 1} is absent from keyboard traversal`);
  }
  assertNotIncludes(editor, '<input checked readOnly type="checkbox" />', "Editor excludes the false Show background checkbox");
  assertIncludes(editor, "Color background", "Editor exposes current background type as status text");
  assertIncludes(editor, 'data-creative-editor-background-status="color"', "Editor exposes background status QA semantics");
  assertIncludes(editor, "Add image layer", "Editor names the image-layer navigation action truthfully");
  assertIncludes(editor, "const SEARCHABLE_EDITOR_TOOL_IDS = new Set<EditorToolId>([", "Editor declares the bounded searchable-drawer contract");
  for (const searchableTool of [
    '"templates"',
    '"illustrations"',
    '"graphics"',
    '"characters"',
    '"images"',
    '"text"',
    '"styles"',
    '"shapes"',
    '"myStuff"',
    '"brandKit"',
  ]) {
    assertIncludes(editor, searchableTool, `Editor searchable-drawer contract includes ${searchableTool}`);
  }
  assertIncludes(editor, "hidden={!SEARCHABLE_EDITOR_TOOL_IDS.has(activeTool)}", "Editor hides inert search fields on non-searchable drawers");
  assertIncludes(editor, '["Sale", "New", "Offer", "Callout", "Graphic", "Sticker"]', "Editor popular graphic searches resolve current approved assets");
  assertNotIncludes(editor, '["Frame", "Shape", "Line", "Rectangle", "Arrow", "Sticker"]', "Editor excludes obsolete empty-result graphic searches");
  assertIncludes(editor, 'setNotice(`Applied ${template?.label || "template"} template.`)', "Editor acknowledges the template that replaced the active page");
  assertIncludes(editor, 'chromeMode?: "embedded" | "full"', "Editor exposes explicit chrome mode contract");
  assertIncludes(editor, 'chromeMode = "full"', "Editor defaults to full product chrome");
  assertIncludes(editor, 'const browserDraftsEnabled = enableBrowserDrafts ?? chromeMode === "full"', "Editor lets product adapters opt embedded flows into browser draft recovery");
  assertIncludes(editor, 'availableToolIds?: CreativeEditorToolId[]', "Editor exposes a product-scoped tool allowlist");
  assertIncludes(editor, 'initialSelectedLayerId?: string | null', "Editor lets product adapters start without selecting a protected layer");
  assertIncludes(editor, 'requiresReadiness?: boolean', "Editor header actions can enforce the shared download readiness gate");
  assertIncludes(editor, 'inspectorRef.current.scrollTop = 0', "Editor reveals the readiness panel after switching from a scrolled inspector state");
  assertIncludes(editor, 'workspaceControls?: CreativeEditorWorkspaceControl[]', "Editor lets embedded products reduce generic workspace controls");
  assertIncludes(editor, "getCreativeEditorDraftStorageKey({", "Editor constructs collision-safe browser draft keys");
  assertIncludes(editor, "creativeEditorDocumentSchema.safeParse(value)", "Editor validates imported and browser draft documents at runtime");
  assertIncludes(editor, "const validated = parseCreativeEditorDocument(stamped);", "Editor validates every document mutation before committing it");
  assertIncludes(editor, "const validatedCandidate = parseCreativeEditorDocument(candidate);", "Editor validates selected-layer patches before mutating Fabric state");
  assertIncludes(editor, "That change contains an invalid value and was not applied.", "Editor rejects invalid document mutations without corrupting current state");
  assertIncludes(editor, "The canvas produced an invalid value. The last valid design was restored.", "Editor restores authoritative state when Fabric serialization is invalid");
  assertIncludes(editor, "payload.id !== initialEditorDocument.id", "Editor rejects a different-document browser draft");
  assertIncludes(editor, "payload.productContext.productId !== documentRef.current.productContext.productId", "Editor rejects a cross-product browser draft");
  assertIncludes(editor, "payload.productContext.workspaceId || undefined", "Editor compares browser draft workspace identity");
  assertIncludes(editor, "creative_editor_browser_draft_storage_failed", "Editor reports bounded browser draft storage failures");
  assertIncludes(editor, "CREATIVE_EDITOR_JSON_IMPORT_MAX_BYTES = 5 * 1024 * 1024", "Editor bounds JSON design imports");
  assertIncludes(editor, "CREATIVE_EDITOR_RASTER_IMPORT_MAX_BYTES = 1_400_000", "Editor keeps raster data URLs within the persisted document limit");
  assertIncludes(editor, "validateMagicBytes(dataUrl, file.type)", "Editor verifies raster import content instead of trusting file metadata");
  assertIncludes(editor, "CREATIVE_EDITOR_FABRIC_IMPORT_MAX_OBJECTS = 300", "Editor bounds legacy Fabric object counts");
  assertIncludes(editor, "CREATIVE_EDITOR_FABRIC_IMPORT_MAX_NODES = 5_000", "Editor bounds legacy Fabric payload traversal");
  assertIncludes(editor, "importedDocumentHasUnsafeImageSource(parsedDocument)", "Editor rejects unsafe image sources in imported native documents");
  assertIncludes(editor, "isSafeFabricImportPayload(payload)", "Editor validates legacy Fabric payload complexity and image sources before deserialization");
  assertIncludes(editor, "isSafeCreativeEditorNetworkImageSource(trimmed, window.location.origin)", "Imported editor documents use the shared HTTP(S) image-source boundary");
  assertIncludes(editor, "isSafeCurrentImageSource(element.src)", "Editor treats allowed raster data URLs as valid readiness sources");
  assertIncludes(editor, "const importCanvas = new fabricApi.Canvas(importCanvasElement", "Editor parses legacy Fabric JSON in an isolated canvas");
  assertIncludes(editor, "await importCanvas.loadFromJSON(payload as Record<string, unknown>);", "Editor awaits complete Fabric 7 JSON deserialization");
  assertNotIncludes(editor, "importCanvas.loadFromJSON(payload, () =>", "Editor does not treat the Fabric 7 reviver callback as load completion");
  assertIncludes(editor, "parseCreativeEditorDocument(serializeFabricCanvasToDocument(importCanvas", "Editor validates isolated Fabric imports before committing them");
  assertIncludes(editor, "importCanvas.dispose();", "Editor disposes isolated Fabric import resources");
  assertIncludes(editor, "const targetElementId = selectedElement.id", "Editor image replacement captures its initiating layer");
  assertIncludes(editor, "selectedIdRef.current !== targetElementId", "Editor image replacement rejects a stale selected layer");
  assertIncludes(editor, "documentRef.current.activePageId !== startingPageId", "Editor image imports reject a stale page");
  assertIncludes(editor, "loadDocumentQueueRef.current", "Editor serializes Fabric document loads");
  assertIncludes(editor, "generation !== loadDocumentGenerationRef.current", "Editor rejects superseded Fabric load completions");
  assertIncludes(editor, "const bootstrapDocument = documentRef.current", "Editor Fabric bootstrap loads current rather than mount-stale document truth");
  assertIncludes(editor, "if (aiToolOperationRef.current)", "Editor AI tools use an immediate single-flight boundary");
  assertIncludes(editor, "documentRevisionRef.current !== requestRevision", "Editor AI and Design Cue results reject stale document revisions");
  assertIncludes(editor, "if (designCueOperationRef.current || designCueApplyOperationRef.current)", "Editor Design Cue request/apply operations are mutually exclusive");
  assertIncludes(editor, "if (exportOperationRef.current)", "Editor export workflows use an immediate single-flight boundary");
  assertIncludes(editor, "if (exportOperationRef.current !== operationId) return;", "Editor rejects stale export-bundle download completions");
  assertIncludes(editor, "if (templateSaveOperationRef.current)", "Editor template saves use an immediate single-flight boundary");
  assertIncludes(editor, "if (clipboardOperationRef.current)", "Editor clipboard exports use an immediate single-flight boundary");
  assertNotIncludes(editor, "const isCreativeEditorDocument =", "Editor does not restore the retired shallow document check");
  assertIncludes(editor, 'const showInternalExportTools = chromeMode === "full"', "Editor hides internal export shortcuts in embedded mode");
  assertIncludes(editor, 'data-chrome-mode={chromeMode}', "Editor root exposes chrome mode for layout verification");
  assertIncludes(editor, 'chromeMode === "full"', "Editor top chrome is full-mode only");
  assertIncludes(editor, "QR_ACTION_PRESETS", "Editor exposes guided QR action presets");
  assertIncludes(editor, "Add action card", "Editor QR drawer prioritizes action-card insertion");
  assertIncludes(editor, "QR quiet-zone panel", "Editor QR action card includes a white quiet-zone panel");
  assertIncludes(editor, 'errorCorrectionLevel: "H"', "Editor QR defaults use high error correction");
  assertIncludes(editor, "margin: 4", "Editor QR defaults use four-module quiet-zone margin");
  assertIncludes(editor, 'lightColor: "#ffffff"', "Editor QR action cards preserve white QR panels");
  assertIncludes(editor, "Reset white scan panel", "Editor can repair legacy non-white QR scan panels");
  assertIncludes(editor, 'preset.label.toLowerCase().endsWith("style") ? "" : " style"', "Editor style feedback avoids duplicate style wording");
  assertNotIncludes(editor, '`${preset.label} style applied.`', "Editor excludes duplicate brand style feedback");
  assertIncludes(editor, "Select text, a shape, a line, or a QR code before applying a brand color.", "Editor explains unsupported Brand Kit color targets");
  assertIncludes(editor, "setNotice(`${historyLabel}.`)", "Editor confirms successful inspector property changes instead of retaining stale status");
  assertIncludes(editor, '"Layer flipped horizontally."', "Editor confirms horizontal flip actions");
  assertIncludes(editor, '"Layer flipped vertically."', "Editor confirms vertical flip actions");
  for (const layerMoveNotice of [
    "Layer moved forward.",
    "Layer moved to front.",
    "Layer moved backward.",
    "Layer moved to back.",
  ]) assertIncludes(editor, layerMoveNotice, `Editor confirms layer order action: ${layerMoveNotice}`);
  for (const layerAlignmentNotice of [
    "Layer aligned left.",
    "Layer centered horizontally.",
    "Layer aligned right.",
    "Layer centered on background.",
    "Layer aligned top.",
    "Layer centered vertically.",
    "Layer aligned bottom.",
  ]) assertIncludes(editor, layerAlignmentNotice, `Editor confirms layer alignment action: ${layerAlignmentNotice}`);
  assertIncludes(editor, 'Visible watermark ${patch.enabled ? "enabled" : "disabled"}.', "Editor confirms visible-watermark enablement changes");
  assertIncludes(editor, '"Visible watermark updated."', "Editor confirms visible-watermark property changes");
  for (const inspectorMutation of [
    'updateSelectedShadow({ blur: Number(event.target.value) })',
    'updateSelectedShadow({ offsetX: Number(event.target.value) })',
    'updateSelectedShadow({ offsetY: Number(event.target.value) })',
    'updateImageAdjustment(adjustment.key, Number(event.target.value))',
    'updateImageAdjustment("grayscaleMode", event.target.value',
    'updateImageAdjustment("gammaRed", Number(event.target.value))',
    'updateImageAdjustment("gammaGreen", Number(event.target.value))',
    'updateImageAdjustment("gammaBlue", Number(event.target.value))',
    'updateSelected({ outlineEnabled: event.target.checked }',
    'updateSelected({ outlineWidth: Number(event.target.value) }',
    'updateSelected({ outlineOnly: event.target.checked }',
    'updateSelected({ strokeStyle: event.target.value',
    'updateSelected({ strokeLineCap: event.target.value',
    'updateSelected({ strokeWidth: Number(event.target.value) }',
  ]) assertIncludes(editor, inspectorMutation, `Editor advanced inspector control uses governed selected-property history: ${inspectorMutation}`);
  for (const repeatedDetailMutation of [
    'updateSelected({ x: Number(event.target.value) })',
    'updateSelected({ y: Number(event.target.value) })',
    'updateSelected({ width: Number(event.target.value) })',
    'updateSelected({ height: Number(event.target.value) })',
    'updateSelected({ opacity: Number(event.target.value) })',
  ]) assert(
    editor.split(repeatedDetailMutation).length - 1 >= 2,
    `Editor exposes both priority and detail inspector mutations for ${repeatedDetailMutation}`,
  );
  for (const imageNotice of [
    "Image set to crop.",
    "Image fit inside frame.",
    "Image flipped horizontally.",
    "Image filled the frame.",
    "Image enlarged.",
  ]) assertIncludes(editor, imageNotice, `Editor confirms image action: ${imageNotice}`);
  assertIncludes(editor, "copyRuntimeTextToClipboard(suggestionValue.text)", "Editor AI suggestion copy uses acknowledged text clipboard helper");
  assertIncludes(editor, "copyRuntimeTextToClipboard(dataUrl)", "Editor base64 copy uses acknowledged text clipboard helper");
  assertIncludes(editor, "hasClipboardWrite: hasRuntimeClipboardWrite()", "Editor text-copy diagnostics include Clipboard API support");
  assertIncludes(editor, "hasCopyFallback: hasRuntimeCopyFallback()", "Editor text-copy diagnostics include fallback support");
  assertNotIncludes(editor, "await navigator.clipboard.writeText(suggestionValue.text)", "Editor AI suggestion copy must not use direct Clipboard API success");
  assertNotIncludes(editor, "await navigator.clipboard.writeText(dataUrl)", "Editor base64 copy must not use direct Clipboard API success");
  assertNotIncludes(editor, "setQrLightColor", "Editor does not expose QR background color state");
  assertNotIncludes(editor, "QR background color", "Editor does not expose raw QR background color controls");
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
  assertIncludes(readme, "http://localhost:3000/__mycodex/creative-editor-test", "Shared editor README documents local MyCodex preview route");
  assertIncludes(impl, "focus restoration", "Shared editor impl documents focus restoration");
  assertIncludes(impl, "stress variant", "Shared editor impl documents stress variant");
  assertIncludes(impl, "ENABLE_CAMPAIGNCUE_EDITOR_TEST_ROUTE", "Shared editor impl documents deployed preview gate");
  assertIncludes(impl, "collision-safe segments", "Shared editor impl documents browser draft key isolation");
  assertIncludes(tests, "Local autosave scope and corruption", "Shared editor tests document adversarial draft recovery");
  assertNotIncludes(readme, OLD_EDITOR_TEST_ENV_NAME, "Shared editor README");
  assertNotIncludes(impl, OLD_EDITOR_TEST_ENV_NAME, "Shared editor impl");
  assertNotIncludes(tests, OLD_EDITOR_TEST_ENV_NAME, "Shared editor tests");
  assertNotIncludes(validation, OLD_EDITOR_TEST_ENV_NAME, "Shared editor validation");
  assertIncludes(tests, "verify:creative-editor-smoke", "Shared editor tests include static verifier");
  assertIncludes(tests, "/creative-editor-test", "Shared editor tests include local preview route");
  assertIncludes(tests, "Keyboard traversal", "Shared editor tests include accessibility traversal");
  assertIncludes(validation, "Creative Editor Smoke QA", "Shared editor validation documents browser QA");
  assertIncludes(validation, "MyCodex Editor Preview", "Shared editor validation documents local preview route");
  assertIncludes(brandedQrReadme, "The shared Creative Editor QR drawer provides guided action-card presets", "Branded QR README documents editor QR action presets");
  assertIncludes(brandedQrImpl, "Project style changes and campaign starters must preserve those QR safety fields", "Branded QR impl documents QR safety preservation");
  assertIncludes(brandedQrTests, "QR drawer shows guided action presets", "Branded QR tests include editor QR action presets");
}

verifySmokeRoute();
verifyEditorQaHooks();
verifyDocsAndScripts();

console.log(`verify-creative-editor-smoke: ${checks.length} checks passed`);
