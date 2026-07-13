const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing required file: ${file}`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function requireToken(source, token, label) {
  if (!source.includes(token)) {
    failures.push(`${label} missing token: ${token}`);
  }
}

[
  'src/app/(main)/assets/page.tsx',
  'src/app/(main)/use-menulist/print-assets/page.tsx',
  'src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx',
  'src/components/shared/printableAssets/PrintableTemplatePreview.tsx',
  'src/lib/printable-asset-templates/types.ts',
  'src/lib/printable-asset-templates/assetTypes.ts',
  'src/lib/printable-asset-templates/editorDocumentAdapter.ts',
  'src/lib/printable-asset-templates/templateFamilies.ts',
  'src/lib/printable-asset-templates/templateStyles.ts',
  'src/lib/printable-asset-templates/renderPrintableAsset.ts',
  'src/lib/creative-editor/templateRegistryDal.ts',
  'src/lib/validation/creativeEditorTemplateSchemas.ts',
  'src/modules/creative-editor/export.ts',
  'firestore.rules',
  'storage.rules',
  'src/lib/printable-asset-templates/navigation.ts',
  'src/components/mobile/MobileShell.tsx',
  'src/components/mobile/screens/MobileMoreScreen.tsx',
  'src/components/mobile/screens/MobileShareScreen.tsx',
  '__docs__/printable-asset-templates/README.md',
  '__docs__/printable-asset-templates/printable-asset-templates_spec.md',
  '__docs__/printable-asset-templates/printable-asset-templates_impl.md',
  '__docs__/printable-asset-templates/printable-asset-templates_mobile-support.md',
  '__docs__/printable-asset-templates/printable-asset-templates_firebase.md',
  '__docs__/printable-asset-templates/printable-asset-templates_test-cases.md',
  '__docs__/creative-editor-template-registry/README.md',
  '__docs__/creative-editor-template-registry/creative-editor-template-registry_spec.md',
  '__docs__/creative-editor-template-registry/creative-editor-template-registry_impl.md',
  '__docs__/creative-editor-template-registry/creative-editor-template-registry_firebase.md',
  '__docs__/creative-editor-template-registry/creative-editor-template-registry_test-cases.md',
  '__docs__/creative-editor-template-registry/creative-editor-template-registry_validation.md',
].forEach(read);

const features = read('src/config/features.ts');
[
  'ENABLE_PRINTABLE_ASSET_TEMPLATES',
  'ENABLE_PRINTABLE_ASSET_EDITOR_RENDERER',
  'ENABLE_PRINTABLE_ASSET_EDITOR_CUSTOMIZE',
  'ENABLE_CREATIVE_EDITOR_TEMPLATE_REGISTRY',
  'ENABLE_CREATIVE_EDITOR_USER_TEMPLATES',
  'ENABLE_PRINTABLE_ASSET_USER_TEMPLATES',
  'PRINTABLE_ASSET_TEMPLATE_PLAN_IDS',
  'PRINTABLE_ASSET_TEMPLATE_FULL_CATALOG_PLAN_IDS',
].forEach((token) => requireToken(features, token, 'feature flags'));

const navigation = read('src/constants/navigations.ts');
requireToken(navigation, 'ASSETS: `/assets`', 'desktop navigation');
requireToken(navigation, "label: 'Assets'", 'desktop navigation');
requireToken(navigation, 'LuPrinter', 'desktop navigation');

const localeDir = path.join(root, 'public/locales/menulist.ai');
for (const localeFile of fs.readdirSync(localeDir).filter((file) => file.endsWith('.json'))) {
  const relativePath = `public/locales/menulist.ai/${localeFile}`;
  const source = read(relativePath);
  try {
    const messages = JSON.parse(source);
    if (messages.Navigation && !messages.Navigation.Assets) {
      failures.push(`${relativePath} missing Navigation.Assets`);
    }
  } catch (error) {
    failures.push(`${relativePath} is not valid JSON`);
  }
}

const route = read('src/app/(main)/assets/page.tsx');
requireToken(route, 'PrintableAssetTemplatesRoute', 'assets route');
requireToken(route, 'FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_TEMPLATES', 'assets route');

const legacyRoute = read('src/app/(main)/use-menulist/print-assets/page.tsx');
requireToken(legacyRoute, 'PrintableAssetTemplatesRoute', 'legacy print-assets route');
requireToken(legacyRoute, 'view="print-assets"', 'legacy print-assets fallback');

const assetTypes = read('src/lib/printable-asset-templates/assetTypes.ts');
[
  'print_menu',
  'table_tent',
  'single_table_card',
  'counter_sticker',
  'entrance_poster',
  'feedback_qr',
  'campaign_flyer',
  'gift_certificate',
  'business_card',
  'staff_id_card',
  'event_invitation',
  'postcard',
  'product_tag',
  'campaign_poster',
  'complete_menu_kit',
].forEach((id) => requireToken(assetTypes, id, 'asset type catalog'));

const menuKitGenerator = read('src/lib/menu-kit/menuKitGenerator.ts');
[
  'generatePrintMenuTableTentImage',
  'generatePrintMenuSingleTableCardImage',
  'generateEntrancePosterImage',
  'generateImage',
  'imageSuffix',
  "options?: { outputFormat?: 'pdf' | 'png' }",
].forEach((token) => requireToken(menuKitGenerator, token, 'menu kit single asset image preview path'));

const families = read('src/lib/printable-asset-templates/templateFamilies.ts');
[
  'classic-luxe',
  'executive-dark',
  'botanical-heritage',
  'modern-calm',
  'brand-banner',
  'soft-curve',
  'qr-first',
  'local-bold',
  'clean-utility',
  'getPrintableTemplateFamiliesForAsset',
  'FULL_MENU_TEMPLATE_FAMILY_IDS',
].forEach((id) => requireToken(families, id, 'template family catalog'));

const familyIdMatches = families.match(/id: '[a-z-]+'/g) || [];
if (familyIdMatches.length !== 9) {
  failures.push(`Expected 9 template families, found ${familyIdMatches.length}`);
}

const renderer = read('src/lib/printable-asset-templates/renderPrintableAsset.ts');
[
  'FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_EDITOR_RENDERER',
  'isPrintableAssetEditorRenderable',
  'renderPrintableAssetEditorTemplate',
  'renderPrintableAssetDownloadFiles',
  'renderPrintableAssetEditorTemplateFiles',
  "input.assetTypeId === 'print_menu'",
  "input.assetTypeId === 'feedback_qr'",
  "input.assetTypeId === 'complete_menu_kit'",
  'requestedFormat',
  'renderPdfFirstPageToPng',
  'PDFJS_CDN_SRC',
  'loadPdfJsFromCdn',
  'wrapImageBlobInPdf',
  'generateMenuKitAsset',
  "outputFormat: requestedFormat === 'png' ? 'png' : 'pdf'",
  'mapPrintableTemplateToMenuCardStyle',
].forEach((token) => requireToken(renderer, token, 'printable asset renderer'));

const editorAdapter = read('src/lib/printable-asset-templates/editorDocumentAdapter.ts');
[
  'EDITOR_RENDERABLE_ASSETS',
  'table_tent',
  'single_table_card',
  'counter_sticker',
  'entrance_poster',
  'feedback_qr',
  'campaign_flyer',
  'gift_certificate',
  'business_card',
  'staff_id_card',
  'event_invitation',
  'postcard',
  'product_tag',
  'campaign_poster',
  'buildPrintableAssetEditorDocument',
  'renderPrintableAssetEditorDocument',
  'renderPrintableAssetEditorDocumentFiles',
  'renderPrintableAssetEditorDocumentFile',
  'getBusinessCardFaceDocument',
  'getBusinessCardPrintFrames',
  'BUSINESS_CARD_BACK_FACE_OFFSET',
  'BusinessCardFace',
  'normalizeBusinessCardEditorDocument',
  'preparePrintableAssetDocumentForExport',
  'clampElementToFrame',
  'inferBusinessCardPrintFrame',
  'isNonExportEditorGuide',
  'rehydratePrintableAssetEditorDocument',
  'renderPrintableAssetEditorTemplate',
  'renderPrintableAssetEditorTemplateFiles',
  'stripPrintableAssetEditorAttributionLayers',
  'applyRuntimeMenuListAttribution',
  'drawMenuListAttribution',
  'isPrintableAssetPlatformAttribution',
  'resolveMenuListAttributionPolicy({ activePlanType: params.activePlanType }).showAttribution',
  'CreativeEditorDocument',
  'locked: true',
  'printFrameId',
  'printFrameLocked',
  'editorGuide: true',
  'excludeFromExport: true',
  'printFrames: input.assetTypeId === "business_card"',
  'resolveMenuListAttributionPolicy',
  'errorCorrectionLevel: "H"',
  'jsPDF',
].forEach((token) => requireToken(editorAdapter, token, 'editor-backed printable asset adapter'));
requireToken(editorAdapter, 'margin: 4', 'editor-backed printable asset QR quiet zone');
if (/margin:\s*[123]\b/.test(editorAdapter)) {
  failures.push('editor-backed printable asset adapter uses a QR quiet zone below four modules');
}

const creativeEditorTypes = read('src/modules/creative-editor/types.ts');
[
  'CreativeEditorPrintFrame',
  'printFrameId?: string',
  'printFrameLocked?: boolean',
  'printFrames?: CreativeEditorPrintFrame[]',
].forEach((token) => requireToken(creativeEditorTypes, token, 'shared creative editor print-frame types'));

const creativeEditorFabricAdapter = read('src/modules/creative-editor/fabricAdapter.ts');
[
  '"printFrameId"',
  '"printFrameLocked"',
  '"editorGuide"',
  '"excludeFromExport"',
  'object.printFrameLocked',
].forEach((token) => requireToken(creativeEditorFabricAdapter, token, 'shared creative editor fabric print-frame persistence'));

const creativeExport = read('src/modules/creative-editor/export.ts');
[
  'renderCreativeEditorPngBlob',
  'renderCreativeEditorSvgBlob',
  'downloadCreativeEditorPng',
  'downloadCreativeEditorSvg',
  'element.errorCorrectionLevel',
  'element.margin',
].forEach((token) => requireToken(creativeExport, token, 'creative editor export helpers'));

const mobileShell = read('src/components/mobile/MobileShell.tsx');
requireToken(mobileShell, "'/assets': { tab: 'more'", 'mobile shell route map');
requireToken(mobileShell, "'/use-menulist/print-assets': { tab: 'more'", 'mobile legacy route map');

const mobileMore = read('src/components/mobile/screens/MobileMoreScreen.tsx');
requireToken(mobileMore, "label: 'QR and print assets'", 'mobile more screen');
requireToken(mobileMore, 'ENABLE_PRINTABLE_ASSET_TEMPLATES', 'mobile more screen');
requireToken(mobileMore, "openSubScreen('printAssets')", 'mobile more screen');

const mobileShare = read('src/components/mobile/screens/MobileShareScreen.tsx');
[
  'PRINTABLE_ASSET_TYPES',
  'getPrintableTemplateFamiliesForAsset',
  'renderPrintableAsset',
  'renderPrintableAssetDownloadFiles',
  'selectedPrintableAssetId',
  'availablePrintableTemplateFamilies',
  'printableActionTemplateId',
  'printablePreviewState',
  'PrintableTemplateActionSheet',
  'getMobilePrintableDownloadActionLabel',
  'getMobilePrintableActionFormats',
  'renderPrintableTemplatePreview',
  'supportedOutputFormats',
  'TemplateFamilySwatch',
  'templateRowPreviewWidth',
  'templateRowPreviewHeight',
  'aria-pressed={active}',
  'brandColor: storeBrandColor',
].forEach((token) => requireToken(mobileShare, token, 'mobile assets screen'));

const useMenuList = read('src/components/templates/main-app/useMenuList/index.tsx');
requireToken(useMenuList, 'buildPrintableAssetsUrl', 'Use MenuList shortcut');
requireToken(useMenuList, "title=\"Assets\"", 'Use MenuList shortcut');
requireToken(useMenuList, 'Print for Your Business', 'Use MenuList print shortcut');
requireToken(useMenuList, 'brandColor: storeBrandColor', 'Use MenuList print shortcut');

const desktopAssetsRoute = read('src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx');
[
  'menuModifiedOn: storeDetails.lastPublishedAt',
  'menuModifiedOn: project.menuModifiedOn',
  'aria-pressed={active}',
  'activeTemplateId',
  'selectedAssetActionFormats',
  'availableTemplateFamilies',
  'getPrintableTemplateFamiliesForAsset',
  'getPrintableDownloadActionLabel',
  'getPrintableActionFormats',
  'renderPrintableAssetDownloadFiles',
  'renderTemplatePreview',
  'getExistingProjectsListWithoutLoader',
  'getProjectDataWithoutLoader',
  'projectDataCacheRef',
  'getCachedProjectData',
  "return 'png';",
  'Ready-to-print assets',
  'Use this style',
  'Customize in editor',
  'CreativeEditor',
  'chromeMode="embedded"',
  'productLabel="MenuList Assets"',
  'sourceLabel="Print assets"',
  'editorDocumentRef',
  'buildPrintableAssetEditorDocument',
  'renderPrintableAssetEditorDocument',
  'renderPrintableAssetEditorDocumentFiles',
  'downloadPrintableResults',
  'PrintableTemplatePreview',
  'setPreviewAsset',
  'Saved designs',
  'shouldShowSavedDesigns',
  'Save as template',
  'templateSaveLabel="Save as template"',
  'templateSavePreview',
  'thumbnailDataUrl: previewDataUrl',
  'stripPrintableAssetEditorAttributionLayers',
  'activePlanType: input.activePlanType',
  'activePlanType: editorState.activePlanType',
  'listCreativeEditorTemplates',
  'saveCreativeEditorTemplate',
  'getCreativeEditorTemplate',
  'deleteCreativeEditorTemplate',
  'resolveCreativeEditorTemplateScope',
  'templateRegistryScope',
  'selectedPlatformTemplates',
  'selectedUserTemplates',
  'template.productId === templateRegistryContext.productId',
  'template.sourceSurface === templateRegistryContext.sourceSurface',
  'canLoadUserTemplates',
  'rehydratePrintableAssetEditorDocument',
  'resolveBusinessCategory',
  "|| 'generic'",
  'platformTemplateRegistryContext',
  'businessCategory: platformBusinessCategory',
  'secondaryLabel: project.url.replace',
].forEach((token) => requireToken(desktopAssetsRoute, token, 'desktop assets route'));
if (desktopAssetsRoute.includes('menuModifiedOn: project.modifiedOn') || desktopAssetsRoute.includes('menuModifiedOn: defaultProject.modifiedOn')) {
  failures.push('desktop assets route must use the store publish timestamp instead of project edit time for printable freshness');
}
if (!mobileShare.includes('menuModifiedOn: storeDetails.lastPublishedAt')) {
  failures.push('mobile share must use the store publish timestamp for printable freshness');
}
if (mobileShare.includes('menuModifiedOn: defaultProject.modifiedOn')) {
  failures.push('mobile share must not use project edit time as the printable publish timestamp');
}

const templateRegistryDal = read('src/lib/creative-editor/templateRegistryDal.ts');
[
  'CREATIVE_EDITOR_PLATFORM_ASSET_TEMPLATES',
  'STORE_ASSET_TEMPLATES',
  'PLATFORM_TEMPLATE_GENERIC_CATEGORY',
  'PLATFORM_TEMPLATE_CATALOG_KEYS',
  'getPlatformCatalogKeysForMutation',
  'findPlatformTemplateMutationTarget',
  'readPlatformCatalogMutationSnapshot',
  'BUSINESS_CATEGORIES',
  'STORE_TEMPLATE_DOC_ID',
  'MAX_DOCUMENT_BYTES',
  'MAX_INDEX_TEMPLATES',
  'firebaseClient',
  'firebaseStorage',
  'documentStorage',
  'STORE_TEMPLATE_DOC_ID = "default"',
  'buildPlatformCategoryKey',
  'businessCategory',
  'businessCategory: catalogKey',
  'buildUserDocumentPath',
  'buildUserPreviewPath',
  'getBlob',
  'uploadString',
  'deleteObject',
  'resolveCreativeEditorTemplateScope',
  'listCreativeEditorPlatformTemplates',
  'listCreativeEditorUserTemplates',
  'listCreativeEditorTemplates',
  'saveCreativeEditorTemplate',
  'getCreativeEditorPlatformTemplate',
  'getCreativeEditorTemplate',
  'getCreativeEditorUserTemplate',
  'deleteCreativeEditorTemplate',
  'requestBodyComposer',
  'readIndexRecords',
  'recordMatchesRequest',
  'filterRecordsForRequest',
  'getTemplateRegistryErrorMessage',
  'getTemplateRegistryErrorIndicators',
  'getTemplateRegistryLocalErrorMessage',
  'isTemplateRegistryLocalErrorCode',
  'creative_editor_template_storage_cleanup_failed',
  'getBoundedRuntimeStringContext("storagePath", path)',
  'isMissingStorageObjectError',
  'cleanupTarget: "document"',
  'cleanupTarget: "preview"',
  'payloadBlob.size > MAX_DOCUMENT_BYTES',
  'storage/quota-exceeded',
].forEach((token) => requireToken(templateRegistryDal, token, 'creative editor template registry DAL'));
if (templateRegistryDal.includes('return JSON.parse(await payloadBlob.text())')) {
  failures.push('creative editor template registry DAL must size-check stored documents before reading blob text');
}
if (templateRegistryDal.includes(']).catch(() => undefined);')) {
  failures.push('creative editor template registry DAL must log best-effort Storage cleanup failures instead of swallowing them');
}
[
  'String(error)',
  'Quota for bucket',
  'Missing or insufficient permissions',
].forEach((token) => {
  if (templateRegistryDal.includes(token)) {
    failures.push(`creative editor template registry DAL must not classify Storage provider errors from raw message text: ${token}`);
  }
});

const platformListFunction = templateRegistryDal.match(/async function listCreativeEditorPlatformTemplates[\s\S]*?async function listCreativeEditorUserTemplates/);
if (!platformListFunction || !platformListFunction[0].includes('filterRecordsForRequest(')) {
  failures.push('platform template list must filter the single category document by product, source surface, and asset type');
}

const userListFunction = templateRegistryDal.match(/async function listCreativeEditorUserTemplates[\s\S]*?async function listCreativeEditorTemplatesRaw/);
if (!userListFunction || !userListFunction[0].includes('filterRecordsForRequest(')) {
  failures.push('store template list must filter the single store document by product, source surface, and asset type');
}

const listTemplateFunction = templateRegistryDal.match(/export async function listCreativeEditorTemplates[\s\S]*?\n}\n/);
if (listTemplateFunction && listTemplateFunction[0].includes('showErrorToast')) {
  failures.push('creative editor template registry list reads must stay route-managed and must not trigger global app errors');
}

if (templateRegistryDal.includes('apiCallComposer')) {
  failures.push('creative editor template registry DAL should preserve inline feature errors instead of using apiCallComposer fallback arrays');
}

[
  'contextKey',
  'productId}__{sourceSurface}',
  'assetTypeId}',
  'platformRecordMatchesRequest',
].forEach((token) => {
  if (templateRegistryDal.includes(token)) {
    failures.push(`creative editor template registry DAL must not use per-context registry logic: ${token}`);
  }
});

const templateSchemas = read('src/lib/validation/creativeEditorTemplateSchemas.ts');
[
  'BUSINESS_CATEGORIES',
  'creativeEditorPlatformBusinessCategorySchema',
  '"generic"',
  'BUSINESS_CATEGORIES.some',
  'businessCategory',
  'Element must have width or height',
].forEach((token) => requireToken(templateSchemas, token, 'creative editor template registry schemas'));

[
  'thumbnailDataUrl',
  'CreativeEditorTemplateScope',
  'requireStoreScope',
].forEach((token) => {
  if (!templateRegistryDal.includes(token)) {
    failures.push(`creative editor template registry DAL missing Storage-first guardrail: ${token}`);
  }
});

const firestoreRules = read('firestore.rules');
[
  'match /platformAssetTemplates/{businessCategory}',
  'match /storeAssetTemplates/{tId}/{sId}/{docId}',
  "docId == 'default'",
  "data.data is list",
  "allow delete: if false",
  'canAccessCreativeEditorTemplateStore',
  'isValidCreativeEditorPlatformTemplateCatalog',
  'isValidCreativeEditorTemplateIndex',
].forEach((token) => requireToken(firestoreRules, token, 'creative editor template registry Firestore rules'));

[
  'productId',
  'sourceSurface',
  'assetTypeId',
].forEach((token) => {
  const indexRuleStart = firestoreRules.indexOf('function isValidCreativeEditorTemplateIndex');
  const indexRuleEnd = firestoreRules.indexOf('function isAnswerlatticePlatformSummaryDoc');
  const indexRule = indexRuleStart >= 0 && indexRuleEnd > indexRuleStart
    ? firestoreRules.slice(indexRuleStart, indexRuleEnd)
    : '';
  if (indexRule.includes(token)) {
    failures.push(`creative editor template index rule must stay store-level, not per-${token}`);
  }
});

const storageRules = read('storage.rules');
[
  'match /creative-editor/templates/platform/{businessCategory}/{templateId}/{fileName}',
  'match /creative-editor/templates/user/{tId}/{sId}/{templateId}/{fileName}',
  'canAccessCreativeEditorTemplateStore',
  'isValidCreativeEditorTemplateUpload',
  'document.json',
  '^preview\\\\.(png|jpg|jpeg|webp)$',
].forEach((token) => requireToken(storageRules, token, 'creative editor template registry Storage rules'));

const creativeEditor = read('src/modules/creative-editor/CreativeEditor.tsx');
[
  'onTemplateSave',
  'templateSaveLabel',
  'templateSavePreview',
  'previewDataUrl',
  'Save as template',
  'showInternalExportTools',
  'const showInternalExportTools = chromeMode === "full"',
  'showCanvasWatermark: chromeMode === "full"',
].forEach((token) => requireToken(creativeEditor, token, 'shared creative editor template save callback'));

if (desktopAssetsRoute.includes('getProjectData(data.projectId)')) {
  failures.push('desktop assets route must not refetch Print Menu data with the loader-backed getProjectData on every preview');
}
[
  'CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTIONS',
  'CAMPAIGNCUE_DESIGN_CUE_COMMANDS',
  'runCampaignCue',
  'productLabel="CampaignCue"',
  'sourceSurface: "campaigncue',
].forEach((token) => {
  if (desktopAssetsRoute.includes(token)) {
    failures.push(`desktop assets route must stay separated from CampaignCue editor wiring: ${token}`);
  }
});

const printMenuCardFace = read('src/lib/print-menu-surfaces/templates/printMenuCardFace.ts');
[
  'drawHeaderTreatment',
  "const hasOuterBand = templateFamilyId === 'brand-banner'",
  "templateFamilyId === 'brand-banner'",
  "templateFamilyId === 'local-bold'",
  "templateFamilyId === 'botanical-heritage'",
  "templateFamilyId === 'qr-first'",
].forEach((token) => requireToken(printMenuCardFace, token, 'print menu card face variants'));

const qrCode = read('src/lib/utils/qrCode.ts');
[
  'drawQrHeaderTreatment',
  "const hasOuterBand = templateFamilyId === 'brand-banner'",
  "templateFamilyId === 'brand-banner'",
  "templateFamilyId === 'local-bold'",
  "templateFamilyId === 'botanical-heritage'",
  "templateFamilyId === 'qr-first'",
].forEach((token) => requireToken(qrCode, token, 'branded QR variants'));

if (printMenuCardFace.includes("templateFamilyId === 'brand-banner' || templateFamilyId === 'local-bold'")) {
  failures.push('print menu card face must not share the full banner branch between brand-banner and local-bold');
}
if (qrCode.includes("templateFamilyId === 'brand-banner' || templateFamilyId === 'local-bold'")) {
  failures.push('branded QR must not share the full banner branch between brand-banner and local-bold');
}

if (desktopAssetsRoute.includes('window.open(')) {
  failures.push('desktop assets route should preview in a modal, not window.open');
}
if (desktopAssetsRoute.includes('Preview was blocked')) {
  failures.push('desktop assets route should not download as a preview fallback');
}
if (desktopAssetsRoute.includes('<iframe')) {
  failures.push('desktop assets route should show image previews, not embedded PDF iframes');
}
if (desktopAssetsRoute.includes('Preview could not be created')) {
  failures.push('desktop assets route should show a template fallback, not a dead preview error');
}
if (desktopAssetsRoute.includes("asset.id === 'print_menu' || asset.id === 'entrance_poster'")) {
  failures.push('desktop assets route must not exclude Print Menu or Entrance Poster from real PNG preview generation');
}
if (desktopAssetsRoute.includes('destroyOnClose')) {
  failures.push('desktop assets route should use destroyOnHidden for Ant Design Modal previews');
}
requireToken(desktopAssetsRoute, 'destroyOnHidden', 'desktop assets preview modal');

if (desktopAssetsRoute.includes('card.tier') || desktopAssetsRoute.includes('<Tag')) {
  failures.push('desktop assets route must not show plan tier chips unless it also enforces plan gating');
}

if (mobileShare.includes('<iframe')) {
  failures.push('mobile assets sheet should show image previews, not embedded PDF iframes');
}
if (mobileShare.includes('previewAsset?.isPdf') || mobileShare.includes('isPdf:')) {
  failures.push('mobile assets sheet should not keep PDF iframe preview state');
}
if (mobileShare.includes('Preview could not be created')) {
  failures.push('mobile assets sheet should show a template fallback, not a dead preview error');
}
if (mobileShare.includes("asset.id === 'print_menu' || asset.id === 'entrance_poster'")) {
  failures.push('mobile assets sheet must not exclude Print Menu or Entrance Poster from real PNG preview generation');
}

const sharedPreview = read('src/components/shared/printableAssets/PrintableTemplatePreview.tsx');
[
  'DecorativeLayer',
  'LeafSpray',
  'OrnamentDots',
  'CornerLines',
  'DiagonalStrips',
  "aspectRatio: '1.42 / 1'",
  "height: compact ? '78%' : '76%'",
  'storeLogo',
  'storeName',
  'assetTypeId',
].forEach((token) => requireToken(sharedPreview, token, 'shared printable template preview'));

if (sharedPreview.includes("aspectRatio: '1.95 / 1'")) {
  failures.push('table tent preview must use print-ratio sizing, not a flattened 1.95:1 thumbnail');
}

const sourceFilesToCheck = [
  'src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx',
  'src/components/templates/main-app/useMenuList/index.tsx',
  'src/lib/printable-asset-templates/assetTypes.ts',
  'src/lib/printable-asset-templates/editorDocumentAdapter.ts',
  'src/lib/printable-asset-templates/templateFamilies.ts',
  'src/lib/printable-asset-templates/renderPrintableAsset.ts',
  'src/components/mobile/screens/MobileShareScreen.tsx',
];
const forbiddenSamples = ['Habibis', 'Restaurant Zilla', 'HZ', 'Print for Your Restaurant', 'restaurant entrance'];
sourceFilesToCheck.forEach((file) => {
  const source = read(file);
  forbiddenSamples.forEach((sample) => {
    if (source.includes(sample)) {
      failures.push(`Hardcoded sample output found in ${file}: ${sample}`);
    }
  });
});

const firebaseDoc = read('__docs__/printable-asset-templates/printable-asset-templates_firebase.md');
[
  '0-1',
  'selected-project reads',
  'caches it for subsequent preview/download actions',
  'storeAssetTemplates/{tenantId}/{storeId}/default',
  'one platform metadata read',
  'one store metadata read',
  'No new Cloud Functions',
  'No new Firestore indexes',
].forEach((token) => requireToken(firebaseDoc, token, 'firebase cost doc'));

const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');
requireToken(
  productionReadinessAudit,
  'Printable asset publish-timestamp verifier parity checkpoint',
  'production readiness audit printable publish timestamp boundary',
);
requireToken(
  changelog,
  'Printable Asset Publish Timestamp Verifier Parity',
  'changelog printable publish timestamp boundary',
);

if (failures.length) {
  console.error('Printable Asset Templates verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Printable Asset Templates verification passed.');
