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
  'src/lib/printable-asset-templates/templateFamilies.ts',
  'src/lib/printable-asset-templates/templateStyles.ts',
  'src/lib/printable-asset-templates/renderPrintableAsset.ts',
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
].forEach(read);

const features = read('src/config/features.ts');
[
  'ENABLE_PRINTABLE_ASSET_TEMPLATES',
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

const mobileShell = read('src/components/mobile/MobileShell.tsx');
requireToken(mobileShell, "'/assets': { tab: 'more'", 'mobile shell route map');
requireToken(mobileShell, "'/use-menulist/print-assets': { tab: 'more'", 'mobile legacy route map');

const mobileMore = read('src/components/mobile/screens/MobileMoreScreen.tsx');
requireToken(mobileMore, "label: 'Assets'", 'mobile more screen');
requireToken(mobileMore, 'ENABLE_PRINTABLE_ASSET_TEMPLATES', 'mobile more screen');
requireToken(mobileMore, "openSubScreen('printAssets')", 'mobile more screen');

const mobileShare = read('src/components/mobile/screens/MobileShareScreen.tsx');
[
  'PRINTABLE_ASSET_TYPES',
  'getPrintableTemplateFamiliesForAsset',
  'renderPrintableAsset',
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
  'menuModifiedOn: project.modifiedOn',
  'menuModifiedOn: project.menuModifiedOn',
  'aria-pressed={active}',
  'activeTemplateId',
  'selectedAssetActionFormats',
  'availableTemplateFamilies',
  'getPrintableTemplateFamiliesForAsset',
  'getPrintableDownloadActionLabel',
  'getPrintableActionFormats',
  'renderTemplatePreview',
  'getExistingProjectsListWithoutLoader',
  'getProjectDataWithoutLoader',
  'projectDataCacheRef',
  'getCachedProjectData',
  "return 'png';",
  'Open download options',
  'PrintableTemplatePreview',
  'setPreviewAsset',
  'secondaryLabel: project.url.replace',
].forEach((token) => requireToken(desktopAssetsRoute, token, 'desktop assets route'));

if (desktopAssetsRoute.includes('getProjectData(data.projectId)')) {
  failures.push('desktop assets route must not refetch Print Menu data with the loader-backed getProjectData on every preview');
}

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
  'No new Cloud Functions',
  'No new Firestore indexes',
].forEach((token) => requireToken(firebaseDoc, token, 'firebase cost doc'));

if (failures.length) {
  console.error('Printable Asset Templates verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Printable Asset Templates verification passed.');
