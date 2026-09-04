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
  'src/components/shared/printableAssets/CampaignPosterModal.tsx',
  'src/components/shared/printableAssets/AssetBusinessProfileEditor.tsx',
  'src/components/shared/printableAssets/ItemProductTagModal.tsx',
  'src/components/shared/printableAssets/PrintableAssetWorkflowModal.tsx',
  'src/components/templates/main-app/projects/editorView/DecisionBlocksSettingsModal.tsx',
  'src/components/mobile/sheets/SmartRecommendationsSheet.tsx',
  'src/components/templates/main-app/projects/editorView/Editor.tsx',
  'src/components/mobile/screens/MobileMenuScreen.tsx',
  'src/components/shared/printableAssets/PostcardContentFields.tsx',
  'src/components/shared/printableAssets/PersonalizedAssetFields.tsx',
  'src/components/shared/printableAssets/PrintableTemplatePreview.tsx',
  'src/components/templates/platform/assetTemplates/index.tsx',
  'src/lib/printable-asset-templates/types.ts',
  'src/lib/printable-asset-templates/assetTypes.ts',
  'src/lib/printable-asset-templates/editorDocumentAdapter.ts',
  'src/lib/printable-asset-templates/campaignPoster.ts',
  'src/lib/printable-asset-templates/itemProductTag.ts',
  'src/lib/printable-asset-templates/giftCertificateArtwork.ts',
  'src/lib/printable-asset-templates/printableIconArtwork.ts',
  'src/lib/printable-asset-templates/staffBadgePerson.ts',
  'src/hooks/usePrintableStaffBadgePeople.ts',
  'src/lib/printable-asset-templates/businessThemeRecommendations.ts',
  'src/lib/printable-asset-templates/businessProfile.ts',
  'src/lib/printable-asset-templates/templateFamilies.ts',
  'src/lib/printable-asset-templates/templateStyles.ts',
  'src/lib/printable-asset-templates/stylePreferences.ts',
  'src/lib/printable-asset-templates/renderPrintableAsset.ts',
  'src/database/printableAssetStylePreferences/index.ts',
  'src/lib/print-menu-surfaces/templates/tableTentTemplate.ts',
  'src/lib/print-menu-surfaces/templates/singleTableCardTemplate.ts',
  'src/lib/menu-kit/templates/entrancePosterTemplate.ts',
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
  'ENABLE_PRINTABLE_ASSET_STYLE_DEFAULTS',
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

const printableAssetsRoute = read('src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx');
[
  "import { hasValidSubscriptionAccess } from '@util/razorpay';",
  "import NoSubscriptionView from '../billing/NoSubscriptionView';",
  '|| activeSubscriptionLoading',
  '|| !hasPaidAccess',
  'if (!hasPaidAccess) {',
  'return <NoSubscriptionView />;',
].forEach((token) => requireToken(printableAssetsRoute, token, 'printable assets entitlement boundary'));
[
  'storeTagline:',
  'storeDetails.tagline',
  'tagline: sourceTagline || undefined',
].forEach((token) => requireToken(printableAssetsRoute, token, 'printable assets business tagline boundary'));
[
  'AssetBusinessProfileEditor',
  'getAssetBusinessProfileReadiness',
  'Complete details',
  'handleBusinessProfileSaved',
  'profileStoreOverrideRef',
].forEach((token) => requireToken(printableAssetsRoute, token, 'desktop asset business profile flow'));

const assetBusinessProfileEditorSaveBoundary = read('src/components/shared/printableAssets/AssetBusinessProfileEditor.tsx');
[
  "if (showContactFields && !isValidOptionalContactEmail(normalizedEmail))",
  "if (showContactFields && normalizedPhone)",
  "tagline: nextTagline ?? null",
  "updateLocalizedText(",
].forEach((token) => requireToken(assetBusinessProfileEditorSaveBoundary, token, 'asset business profile save boundary'));

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
  'botanical-heritage',
  'craft-kitchen',
  'ember-house',
  'coastal-table',
  'sunday-table',
  'counter-rush',
  'roastery-ledger',
  'patisserie-conservatory',
  'gelateria-riviera',
  'salon-atelier',
  'petal-studio',
  'pearl-veil',
  'terracotta-glow',
  'glasshouse-beauty',
  'ritual-sanctuary',
  'eucalyptus-retreat',
  'mineral-spring',
  'lotus-stillness',
  'sunlit-ritual',
  'performance-circuit',
  'ink-vine',
  'midnight-gold',
  'sunset-atelier',
  'rosewater-editorial',
  'mineral-sanctuary',
  'noir-studio',
  'bombay-chronicle',
  'indian-atelier',
  'art-deco-garden',
  'japanese-night-luxe',
  'tea-salon-heritage',
  'lankan-block-print',
  'gallery-ledger',
  'vital-current',
  'workshop-atlas',
  'neighbourhood-standard',
  'field-notes',
  'boutique-window',
  'market-label',
  'civic-letterpress',
  'modern-practice',
  'studio-contact-sheet',
  'maker-ledger',
  'clinical-calm',
  'mindful-motion',
  'hospitality-house',
  'future-workshop',
  'getPrintableTemplateFamiliesForAsset',
  'isPrintableTemplateFamilyVisibleForBusiness',
  'resolveStoreBusinessCategory',
  "visibility: { scope: 'common' }",
  "scope: 'business-category'",
  'PRINTABLE_THEME_FAMILY_IDS',
  'LEGACY_PRINTABLE_TEMPLATE_FAMILY_ALIASES',
].forEach((id) => requireToken(families, id, 'template family catalog'));

const familyIdMatches = families.match(/id: '[a-z-]+'/g) || [];
if (familyIdMatches.length !== 47) {
  failures.push(`Expected 47 canonical parent themes, found ${familyIdMatches.length}`);
}

const categoryVisibilityMatches = families.match(/visibility: \{ businessCategories:/g) || [];
if (categoryVisibilityMatches.length !== 5) {
  failures.push(`Expected five food-category theme families, found ${categoryVisibilityMatches.length}`);
}
['craft-kitchen', 'ember-house', 'coastal-table', 'sunday-table', 'counter-rush'].forEach((themeId) => {
  const pattern = new RegExp(`id: '${themeId}'[\\s\\S]{0,420}?visibility: \\{ businessCategories: \\['food'\\], scope: 'business-category' \\}`);
  if (!pattern.test(families)) failures.push(`${themeId} must remain food-category restricted`);
});
const commonVisibilityMatches = families.match(/visibility: \{ scope: 'common' \}/g) || [];
if (commonVisibilityMatches.length !== 34) {
  failures.push(`Expected 34 common themes, found ${commonVisibilityMatches.length}`);
}
[
  'pearl-veil', 'terracotta-glow', 'glasshouse-beauty',
  'mineral-spring', 'lotus-stillness', 'sunlit-ritual',
  'neighbourhood-standard', 'field-notes',
  'boutique-window', 'market-label',
  'civic-letterpress', 'modern-practice',
  'studio-contact-sheet', 'maker-ledger',
  'clinical-calm', 'mindful-motion',
  'hospitality-house', 'future-workshop',
].forEach((themeId) => {
  const pattern = new RegExp(`id: '${themeId}'[\\s\\S]{0,260}?visibility: \\{ scope: 'common' \\}`);
  if (!pattern.test(families)) failures.push(`${themeId} must remain common to every business`);
});
const businessTypeVisibilityMatches = families.match(/businessTypes:/g) || [];
if (businessTypeVisibilityMatches.length !== 8) {
  failures.push(`Expected eight exact business-type themes, found ${businessTypeVisibilityMatches.length}`);
}
[
  [/id: 'roastery-ledger'[\s\S]*?businessTypes: \['Cafe', 'Coffee Shop', 'Specialty Coffee Shop'\][\s\S]*?scope: 'business-type'/, 'Roastery Ledger must be restricted to the three approved coffee types'],
  [/id: 'patisserie-conservatory'[\s\S]*?businessTypes: \['Cake Shop', 'Bakery'\][\s\S]*?scope: 'business-type'/, 'Patisserie Conservatory must be restricted to Cake Shop and Bakery'],
  [/id: 'gelateria-riviera'[\s\S]*?businessTypes: \['Ice Cream Shop'\][\s\S]*?scope: 'business-type'/, 'Gelateria Riviera must be restricted to Ice Cream Shop'],
  [/id: 'salon-atelier'[\s\S]*?businessTypes: \['Salon', 'Makeup Studio'\][\s\S]*?scope: 'business-type'/, 'Salon Atelier must be restricted to Salon and Makeup Studio'],
  [/id: 'petal-studio'[\s\S]*?businessTypes: \['Salon', 'Makeup Studio'\][\s\S]*?scope: 'business-type'/, 'Petal Studio must be restricted to Salon and Makeup Studio'],
  [/id: 'ritual-sanctuary'[\s\S]*?businessTypes: \['Spa', 'Spa Resort'\][\s\S]*?scope: 'business-type'/, 'Ritual Sanctuary must be restricted to Spa and Spa Resort'],
  [/id: 'eucalyptus-retreat'[\s\S]*?businessTypes: \['Spa', 'Spa Resort'\][\s\S]*?scope: 'business-type'/, 'Eucalyptus Retreat must be restricted to Spa and Spa Resort'],
  [/id: 'performance-circuit'[\s\S]*?businessTypes: \['Gym', 'Fitness Center', 'Fitness Bootcamp', 'Personal Trainer'\][\s\S]*?scope: 'business-type'/, 'Performance Circuit must be restricted to the four approved fitness types'],
].forEach(([pattern, failure]) => {
  if (!pattern.test(families)) failures.push(failure);
});

const themeArtwork = read('src/lib/printable-asset-templates/themeArtwork.ts');
const responsiveEditorAdapter = read('src/lib/printable-asset-templates/editorDocumentAdapter.ts');
[
  '/images/printable-themes/ember-house/universal-background.png',
  '/images/printable-themes/coastal-table/universal-background.png',
  '/images/printable-themes/sunday-table/universal-background.png',
  '/images/printable-themes/counter-rush/universal-background.png',
  '/images/printable-themes/roastery-ledger/universal-background.png',
  '/images/printable-themes/patisserie-conservatory/universal-background.png',
  '/images/printable-themes/gelateria-riviera/universal-background.png',
  '/images/printable-themes/salon-atelier/editorial-page-background.png',
  '/images/printable-themes/salon-atelier/compact-background.png',
  '/images/printable-themes/petal-studio/universal-background.png',
  '/images/printable-themes/pearl-veil/universal-background.png',
  '/images/printable-themes/terracotta-glow/universal-background.png',
  '/images/printable-themes/glasshouse-beauty/universal-background.png',
  '/images/printable-themes/ritual-sanctuary/editorial-page-background.png',
  '/images/printable-themes/ritual-sanctuary/compact-background.png',
  '/images/printable-themes/eucalyptus-retreat/universal-background.png',
  '/images/printable-themes/mineral-spring/universal-background.png',
  '/images/printable-themes/lotus-stillness/universal-background.png',
  '/images/printable-themes/sunlit-ritual/universal-background.png',
  '/images/printable-themes/performance-circuit/editorial-page-background.png',
  '/images/printable-themes/performance-circuit/compact-background.png',
  '/images/printable-themes/neighbourhood-standard/universal-background.png',
  '/images/printable-themes/field-notes/universal-background.png',
  '/images/printable-themes/boutique-window/universal-background.png',
  '/images/printable-themes/market-label/universal-background.png',
  '/images/printable-themes/civic-letterpress/universal-background.png',
  '/images/printable-themes/modern-practice/universal-background.png',
  '/images/printable-themes/studio-contact-sheet/universal-background.png',
  '/images/printable-themes/maker-ledger/universal-background.png',
  '/images/printable-themes/clinical-calm/universal-background.png',
  '/images/printable-themes/mindful-motion/universal-background.png',
  '/images/printable-themes/hospitality-house/universal-background.png',
  '/images/printable-themes/future-workshop/universal-background.png',
].forEach((token) => requireToken(themeArtwork, token, 'vertical theme responsive artwork catalog'));
[
  'const isLandscape = ctx.canvasWidth / Math.max(1, ctx.canvasHeight) >= 1.15',
  'isLandscape && themePaths.compact',
  'src: responsiveBackground',
  'VERTICAL_STORY_THEME_VEIL_OPACITY',
  '"ember-house": 0.72',
  '"coastal-table": 0.70',
  '"sunday-table": 0.72',
  '"counter-rush": 0.78',
  '"roastery-ledger": 0.64',
  '"patisserie-conservatory": 0.70',
  '"gelateria-riviera": 0.74',
  '"salon-atelier": 0.62',
  '"petal-studio": 0.62',
  '"pearl-veil": 0.54',
  '"terracotta-glow": 0.64',
  '"glasshouse-beauty": 0.66',
  '"ritual-sanctuary": 0.64',
  '"eucalyptus-retreat": 0.62',
  '"mineral-spring": 0.58',
  '"lotus-stillness": 0.62',
  '"sunlit-ritual": 0.64',
  '"performance-circuit": 0.56',
  '"neighbourhood-standard": 0.62',
  '"field-notes": 0.62',
  '"boutique-window": 0.62',
  '"market-label": 0.66',
  '"civic-letterpress": 0.60',
  '"modern-practice": 0.60',
  '"studio-contact-sheet": 0.72',
  '"maker-ledger": 0.66',
  '"clinical-calm": 0.62',
  '"mindful-motion": 0.62',
  '"hospitality-house": 0.62',
  '"future-workshop": 0.64',
  'name: `${family} compact content veil`',
  'const insetX = Math.round(ctx.canvasWidth * 0.035)',
  'const insetY = Math.round(ctx.canvasHeight * 0.032)',
].forEach((token) => requireToken(responsiveEditorAdapter, token, 'vertical theme responsive artwork selection'));

const businessThemeRecommendations = read('src/lib/printable-asset-templates/businessThemeRecommendations.ts');
[
  'getBusinessTypeConfig',
  'resolveStoreBusinessCategory',
  'resolvePrintableBusinessThemeRecommendation',
  'getPrintableThemeFamiliesForBusiness',
  'BUSINESS_CATEGORY_THEME_RECOMMENDATIONS',
  "matchedBy: 'business-category'",
  "primaryThemeId: 'craft-kitchen'",
  "'ember-house'",
  "'coastal-table'",
  "'sunday-table'",
  "'counter-rush'",
  "primaryThemeId: 'roastery-ledger'",
  "primaryThemeId: 'patisserie-conservatory'",
  "primaryThemeId: 'gelateria-riviera'",
  "'Specialty Coffee Shop'",
  "'Cake Shop'",
  "'Ice Cream Shop'",
  "primaryThemeId: 'salon-atelier'",
  "primaryThemeId: 'ritual-sanctuary'",
  "primaryThemeId: 'performance-circuit'",
  'Salon:',
  "'Makeup Studio'",
  'Spa:',
  "'Spa Resort'",
  'Gym:',
  "'Fitness Center'",
  "'Fitness Bootcamp'",
  "'Personal Trainer'",
  "primaryThemeId: 'gallery-ledger'",
  "primaryThemeId: 'vital-current'",
  "primaryThemeId: 'workshop-atlas'",
  "primaryThemeId: 'neighbourhood-standard'",
  "primaryThemeId: 'field-notes'",
  "primaryThemeId: 'boutique-window'",
  "primaryThemeId: 'market-label'",
  "primaryThemeId: 'civic-letterpress'",
  "primaryThemeId: 'modern-practice'",
  "primaryThemeId: 'studio-contact-sheet'",
  "primaryThemeId: 'maker-ledger'",
  "primaryThemeId: 'clinical-calm'",
  "primaryThemeId: 'mindful-motion'",
  "primaryThemeId: 'hospitality-house'",
  "primaryThemeId: 'future-workshop'",
  "audienceLabel: 'Recommended for retail businesses'",
  "audienceLabel: 'Recommended for health and wellness businesses'",
  "audienceLabel: 'Recommended for specialty businesses'",
  "matchedBy: 'fallback'",
].forEach((token) => requireToken(businessThemeRecommendations, token, 'business-type theme recommendations'));

const renderer = read('src/lib/printable-asset-templates/renderPrintableAsset.ts');
[
  'FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_EDITOR_RENDERER',
  'isPrintableAssetEditorRenderable',
  'renderPrintableAssetEditorTemplate',
  'renderPrintableAssetDownloadFiles',
  'renderPrintableAssetEditorTemplateFiles',
  "admittedInput.assetTypeId === 'print_menu'",
  "admittedInput.assetTypeId === 'feedback_qr'",
  "admittedInput.assetTypeId === 'complete_menu_kit'",
  'requestedFormat',
  'renderPdfFirstPageToPng',
  'PDFJS_CDN_SRC',
  'PDFJS_CDN_TIMEOUT_MS = 5000',
  'loadPdfJsFromCdn',
  'PDF preview library load timed out',
  'wrapImageBlobInPdf',
  'generateMenuKitAsset',
  "outputFormat: requestedFormat === 'png' ? 'png' : 'pdf'",
  'mapPrintableTemplateToMenuCardStyle',
].forEach((token) => requireToken(renderer, token, 'printable asset renderer'));

const stylePreferences = read('src/lib/printable-asset-templates/stylePreferences.ts');
[
  'businessDefaults',
  'businessThemeId',
  'projectOverrides',
  'projectThemeOverrides',
  'resolvePrintableAssetStyle',
  'buildMenuKitAssetStyleMap',
  'normalizePrintableAssetStylePreferences',
  'applyPrintableAssetStylePreference',
  'applyPrintableThemePreference',
  'removePrintableAssetProjectStyleOverride',
  'PROJECT_PREFERENCE_ID_PATTERN',
  'normalized !== value',
  "normalized === '__proto__'",
  'printable_asset_style_project_limit_reached',
  "source: 'project-theme'",
  "source: 'business-theme'",
  "source: 'recommended'",
  'readMigratedThemeFromAssetMap',
  'maps are never returned',
  'resolvePrintableBusinessThemeRecommendation',
  'isPrintableTemplateFamilyVisibleForBusiness',
  'printable_asset_theme_not_available_for_business',
].forEach((token) => requireToken(stylePreferences, token, 'printable asset style preferences'));

[
  'resolveMenuKitAssetTemplateFamilyId',
  'resolveMenuKitZipTemplateFamilyId',
  'normalizePrintableTemplateFamilyId',
  'templateFamilyIds: undefined',
  'resolveMenuKitZipTemplateFamilyId(prepared.enrichedInput)',
].forEach((token) => requireToken(menuKitGenerator, token, 'prepared Menu Kit style resolution'));

const stylePreferenceDal = read('src/database/printableAssetStylePreferences/index.ts');
[
  'savePrintableAssetStylePreference',
  'savePrintableThemePreference',
  'businessCategory?: string | null;',
  'businessType?: string | null;',
  'clearPrintableAssetProjectStyleOverride',
  'clearPrintableProjectThemeOverride',
  'const savedPreferences = removePrintableAssetProjectStyleOverride(input);',
  'const normalizedProjectId = input.projectId.trim();',
  'const remainingProjectPreferences = savedPreferences.projectOverrides?.[normalizedProjectId];',
  ': STORE_NESTED_DELETE',
  '[normalizedProjectId]',
  "privateConfigurationField: 'printableAssetStylePreferences'",
  'assertStoreUpdateSucceeded',
  'STORE_NESTED_DELETE',
].forEach((token) => requireToken(stylePreferenceDal, token, 'printable asset style preference DAL'));

const storeDal = read('src/database/stores/index.tsx');
[
  "privateConfigurationField?: 'printableAssetStylePreferences'",
  "throw new Error('store_private_configuration_update_invalid')",
  'delete directStoreUpdate.storeId',
  'delete directStoreUpdate.id',
  ': await requestBodyComposer(directStoreUpdate, { isNew: false })',
  'data.storeId && !privateConfigurationField',
].forEach((token) => requireToken(storeDal, token, 'private store configuration update boundary'));

[
  'src/lib/printable-asset-templates/renderPrintableAsset.ts',
  'src/lib/printable-asset-templates/editorDocumentAdapter.ts',
  'src/lib/print-menu-surfaces/templates/tableTentTemplate.ts',
  'src/lib/print-menu-surfaces/templates/singleTableCardTemplate.ts',
  'src/lib/menu-kit/templates/entrancePosterTemplate.ts',
].forEach((file) => {
  const source = read(file);
  requireToken(source, 'compress: true', `${file} raster PDF compression`);
  if (!/addImage\([\s\S]*?undefined,\s*["']FAST["']\)/.test(source)) {
    failures.push(`${file} must use FAST lossless raster-image compression for PDF export`);
  }
});

const editorAdapter = read('src/lib/printable-asset-templates/editorDocumentAdapter.ts');
const giftCertificateArtwork = read('src/lib/printable-asset-templates/giftCertificateArtwork.ts');
const printableIconArtwork = read('src/lib/printable-asset-templates/printableIconArtwork.ts');
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
  'admitPrintableAssetEditorDocument',
  'creativeEditorDocumentSchema.safeParse(documentValue)',
  'parsed.data.productContext.productId !== "menulist"',
  'MIN_PRINTABLE_EDITOR_CANVAS_DIMENSION = 120',
  'MAX_PRINTABLE_EDITOR_CANVAS_DIMENSION = 4096',
  'parsed.data.canvas.width < MIN_PRINTABLE_EDITOR_CANVAS_DIMENSION',
  'parsed.data.canvas.height > MAX_PRINTABLE_EDITOR_CANVAS_DIMENSION',
  'renderPrintableAssetEditorDocument',
  'renderPrintableAssetEditorDocumentFiles',
  'renderPrintableAssetEditorDocumentFile',
  'getBusinessCardFaceDocument',
  'getBusinessCardPrintFrames',
  'buildPremiumThemedBusinessCardFrontFace',
  'buildPremiumThemedBusinessCardBackFace',
  'buildPremiumThemedStaffNameBadge',
  'getStaffBadgePerson',
  'STAFF BADGE',
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
  'printFrames: admittedInput.assetTypeId === "business_card"',
  'resolveMenuListAttributionPolicy',
  'errorCorrectionLevel: "H"',
  'getPrintableAssetDisplayHost',
  'variant: "premium-scan-card"',
  'const isFeedbackCard = ctx.input.assetTypeId === "feedback_qr"',
  'buildPremiumFeedbackQr(ctx)',
  'buildPremiumEntrancePoster(ctx)',
  'buildPremiumCampaignFlyer(ctx)',
  'Campaign headline',
  'Campaign offer',
  'Campaign details',
  'Campaign validity',
  'Campaign terms',
  'useBrandMark: true',
  'subtitleName: "Business tagline"',
  'layoutCenteredPrintableText',
  'preferSingleLine',
  'widthSafetyFactor',
  'businessNameFontFamily === "Georgia, serif" ? 1.12 : 1.04',
  'getPrintableTextBreakUnits',
  'splitPrintableTextUnitAtSize',
  'character === "." || character === "-" || character === "/"',
  'scanToViewCompactUpper',
  'padding: 24',
  'jsPDF',
].forEach((token) => requireToken(editorAdapter, token, 'editor-backed printable asset adapter'));
if (editorAdapter.includes('usePremiumPilot')) {
  failures.push('Business Card adapter still contains a per-theme premium-pilot fallback');
}
const printableInputBoundary = read('src/lib/printable-asset-templates/inputBoundary.ts');
[
  'normalizePrintableAssetRenderInput',
  'normalizeMenuKitInput(value)',
  'normalizeMenuCardLogoUrl',
  'isPrintableAssetTypeId',
  'isPrintableTemplateFamilyId',
  "parsed.protocol !== 'https:'",
  'parsed.username',
  'parsed.password',
  "normalizeText(readOwnField(value, 'tagline'))",
  'normalizePrintableFlyerCampaignContent',
  "assetTypeId === 'campaign_flyer' && campaignContent",
  'normalizePrintablePostcardContent',
  "assetTypeId === 'postcard' && postcardContent",
  'normalizePrintableGiftCertificateContent',
  "assetTypeId === 'gift_certificate' && giftCertificateContent",
  'normalizePrintableInvitationContent',
  "assetTypeId === 'event_invitation' && invitationContent",
  'normalizePrintableProductTagContent',
  "assetTypeId === 'product_tag' && productTagContent",
].forEach((token) => requireToken(printableInputBoundary, token, 'printable asset input boundary'));
if (printableInputBoundary.includes("normalizedTemplateFamilyId === 'terracotta-glow' && postcardContent")) {
  failures.push('Postcard input boundary still limits owner content to Terracotta Glow');
}
requireToken(renderer, 'admitPrintableAssetRenderInput(input)', 'printable asset renderer input admission');
requireToken(editorAdapter, 'admitPrintableAssetRenderInput(input)', 'editor-backed printable asset input admission');
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
  'resolveExportImageSource',
  'readBlobAsDataUrl',
  'sourceUrl.pathname.startsWith("/images/printable-themes/")',
  'sourceUrl.pathname.startsWith("/images/menu-card-export/")',
  'Required local export image could not be embedded',
  'renderElement(element, resolveImageSource)',
].forEach((token) => requireToken(creativeExport, token, 'creative editor export helpers'));

const mobileShell = read('src/components/mobile/MobileShell.tsx');
requireToken(mobileShell, "'/assets': { tab: 'more'", 'mobile shell route map');
requireToken(mobileShell, "'/use-menulist/print-assets': { tab: 'more'", 'mobile legacy route map');

const mobileMore = read('src/components/mobile/screens/MobileMoreScreen.tsx');
requireToken(mobileMore, "label: 'QR and print assets'", 'mobile more screen');
requireToken(mobileMore, 'ENABLE_PRINTABLE_ASSET_TEMPLATES', 'mobile more screen');
requireToken(mobileMore, "openSubScreen('printAssets')", 'mobile more screen');
requireToken(mobileMore, "printMenuBackTarget === 'printAssets'", 'mobile nested print navigation');
requireToken(mobileMore, "setPrintMenuBackTarget('printAssets')", 'mobile nested print navigation');

const mobileShare = read('src/components/mobile/screens/MobileShareScreen.tsx');
[
  'PRINTABLE_ASSET_CATALOG_TYPES',
  'storeTagline:',
  'storeDetails.tagline',
  'tagline: sourceTagline || undefined',
  '[getPrintableTemplateFamily(effectiveThemeId)]',
  'renderPrintableAsset',
  'renderPrintableAssetDownloadFiles',
  'selectedPrintableAssetId',
  'availablePrintableTemplateFamilies',
  'printableActionTemplateIndex',
  'printableActionTemplateId',
  'printablePreviewState',
  'PrintableTemplateActionSheet',
  'getMobilePrintableDownloadActionLabel',
  'getMobilePrintableActionFormats',
  'renderPrintableTemplatePreview',
  'navigatePrintableTemplate',
  'handlePreviewTouchStart',
  'handlePreviewTouchEnd',
  'aria-label="Previous style"',
  'aria-label="Next style"',
  'aria-live="polite"',
  'role="status"',
  'touchAction: hasMultipleStyles',
  'height: 44',
  'width: 44',
  'supportedOutputFormats',
  'TemplateFamilySwatch',
  'templateRowPreviewWidth',
  'templateRowPreviewHeight',
  "display: 'flex'",
  "flexDirection: 'column'",
  "height: 170",
  "minWidth: 142",
  "maxWidth: 142",
  "minHeight: 32",
  "alignSelf: 'flex-start'",
  'aria-pressed={selected}',
  'aria-current={current',
  'showAllThemeFamilies',
  'visibleThemeFamilies',
  'View all themes',
  'Show recommended',
  'value === family.id || current ? null : family.id',
  "buildPrintableRenderInput('feedback_qr', effectiveThemeId)",
  'printableThemeId: effectiveThemeId',
  'brandColor: storeBrandColor',
  "shortLink: (assetTypeId === 'feedback_qr' ? data.feedbackQrLink : data.menuLink).replace",
  'AssetBusinessProfileEditor',
  'getAssetBusinessProfileReadiness',
  'Complete business details',
  'handleAssetBusinessProfileSaved',
  'profileStoreOverrideRef',
].forEach((token) => requireToken(mobileShare, token, 'mobile assets screen'));

const assetBusinessProfile = read('src/lib/printable-asset-templates/businessProfile.ts');
[
  'getAssetBusinessProfileFieldIds',
  'getAssetBusinessProfileReadiness',
  'buildAssetBusinessProfileDraft',
  "if (!assetTypeId || assetTypeId === 'complete_menu_kit')",
  "if (assetTypeId === 'business_card')",
].forEach((token) => requireToken(assetBusinessProfile, token, 'asset business profile readiness contract'));

const assetBusinessProfileEditor = read('src/components/shared/printableAssets/AssetBusinessProfileEditor.tsx');
[
  'updateStore(updates as any)',
  'updateTenant({ name: brandName, tenantId: expectedTenantId })',
  "prepareMediaImage(file, 'businessLogo')",
  'Save and update assets',
  'setStoreDetails',
  'setTenantDetails',
].forEach((token) => requireToken(assetBusinessProfileEditor, token, 'asset business profile canonical save flow'));
if ((storeDal.match(/delete data\.preparedMedia;/g) || []).length < 2) {
  failures.push('store logo writes must remove browser-only prepared media before add/update persistence');
}
if (mobileShare.includes('minHeight: 142')) {
  failures.push('mobile theme cards must use a fixed column layout instead of allowing labels to collapse vertically');
}

[
  'family === "lankan-block-print"',
  'name: "Lankan compact content safe field"',
  'opacity: 0.94',
  'ctx.canvasWidth * 0.065',
  'ctx.canvasHeight * 0.075',
].forEach((token) => requireToken(editorAdapter, token, 'Lankan compact safe field'));

const printableThemeArtworkTest = read('scripts/verification/test-printable-theme-artwork.ts');
const finalPolishLedger = read('__docs__/printable-asset-templates/printable-asset-templates_final-polish-ledger.md');
[
  'Asset-by-Asset Final Polish Rules Ledger',
  '`G-CENTER-01`',
  '`G-CENTER-02`',
  '`A-TABLE-TENT-02`',
  '`A-TABLE-TENT-03`',
  '`A-TABLE-TENT-07`',
  '`A-SINGLE-CARD-01`',
  '`A-SINGLE-CARD-08`',
  '`A-COUNTER-STICKER-01`',
  '`A-COUNTER-STICKER-07`',
  '`A-ENTRANCE-POSTER-01`',
  '`A-ENTRANCE-POSTER-07`',
  '`A-FEEDBACK-QR-01`',
  '`A-FEEDBACK-QR-07`',
  '`A-FLYER-01`',
  '`A-FLYER-08`',
  'tagline-to-CTA breathing room is 4.4%',
  'target 3.6% of face height, bounded between 2.8% and 4.4%',
  '47 of 47 Single Table Card fixtures rendered from current source',
  '02-all-themes-3-of-3.png',
  'How to add the next asset decision',
].forEach((token) => requireToken(finalPolishLedger, token, 'asset-by-asset final polish ledger'));
[
  'assertLankanGiftCertificateHeadlineBounds',
  'assertLankanAffectedAssetTextGeometry',
  "['business_card', 'gift_certificate', 'postcard', 'product_tag'] as const",
  'Rendered voucher headline ends inside its declared text box',
  'text box ends inside the safe field',
  'rendered glyphs end inside the text box',
].forEach((token) => requireToken(printableThemeArtworkTest, token, 'Lankan compact text geometry regression'));
[
  'assertPremiumTableTentIdentityAndGeometry',
  'assertAllThemeTableTentRulebookGeometry',
  'for (const themeId of PRINTABLE_THEME_FAMILY_IDS)',
  'Table Tent keeps ${name} identical across both physical faces',
  'Table Tent ${rotation} degree badge clears the top artwork/frame zone',
  'Table Tent ${rotation} degree face preserves the 4.4% tagline-to-CTA interval',
  'Table Tent ${rotation} degree CTA stays grouped with the QR panel',
  'Table Tent ${rotation} degree QR panel keeps 24px horizontal padding',
  'Table Tent ${rotation} degree public hostname stays grouped with the QR',
  'Table Tent uses the real business logo on both folded faces',
  'Table Tent displays only the canonical public host',
  'Table Tent QR codes retain the complete canonical project URL',
  'limits QR panel padding to 24px per side',
  'Table Tent does not substitute a platform logo when the client has no logo',
  'Table Tent uses business initials on both folded faces when the client has no logo',
  "{ businessCategory: 'food', businessType: 'Restaurant', expected: 'SCAN TO VIEW MENU' }",
  "{ businessCategory: 'service', businessType: 'Salon', expected: 'SCAN TO VIEW SERVICES' }",
  "{ businessCategory: 'retail', businessType: 'Fashion Boutique', expected: 'SCAN TO VIEW CATALOG' }",
  "{ businessCategory: 'creative', businessType: 'Photography Studio', expected: 'SCAN TO VIEW OFFERINGS' }",
  'Table Tent wraps genuinely oversized centered copy instead of compressing it horizontally',
  'assertCenteredPrintableTextLayerGeometry',
  'within the rendered-glyph tolerance of its centered text box',
  'Long creative-business CTAs stay on one centered line when a readable font size fits',
  "['Business name', 'Business tagline', 'Call to action', 'Short link']",
  'Long-copy Table Tent keeps the wrapped public host below the QR panel',
  'preserves the governed tagline-to-CTA breathing room',
  'preserves the scan-safe CTA-to-QR gap',
  'keeps the CTA visually grouped with the QR panel',
  'No-tagline Table Tent still keeps the CTA visually grouped with the QR panel',
  'preserves the governed QR-to-host breathing room',
  'keeps the public host visually connected to the scan group',
  'Craft Kitchen Table Tent keeps the logo below the top border with a visible safe gap',
  'Craft Kitchen Table Tent keeps every text box inside the framed safe field',
  'Long creative-business CTAs use one centered line when a readable smaller size fits',
].forEach((token) => requireToken(printableThemeArtworkTest, token, 'premium Table Tent identity and spacing regression'));
[
  'assertPremiumSingleTableCardIdentityAndGeometry',
  'Single Table Card exposes its complete one-face identity and scan hierarchy',
  'Single Table Card removes the redundant secondary scan instruction',
  'Single Table Card keeps its compact CTA on one readable line',
  'Single Table Card prints only the truthful canonical hostname',
  'Single Table Card QR retains the complete canonical destination',
  'Single Table Card preserves the 4.4% tagline-to-CTA interval',
  'Single Table Card CTA stays grouped with the QR panel',
  'Single Table Card QR panel keeps 24px horizontal padding',
  'Single Table Card hostname stays connected to the scan group',
  'Single Table Card uses the real business logo when supplied',
  'Single Table Card omits an absent tagline instead of inventing brand copy',
  'Terracotta Glow Single Table Card preserves its full-background artwork and calm content veil',
  'Terracotta Glow Single Table Card covers the full portrait without stretching its artwork',
  'Feedback QR propagation removes the redundant secondary instruction',
  'Feedback QR propagation preserves one distinct feedback action',
].forEach((token) => requireToken(printableThemeArtworkTest, token, 'premium Single Table Card identity and spacing regression'));
[
  'assertAllThemeCounterStickerRulebookGeometry',
  'Terracotta Glow Counter Sticker exposes its complete close-range scan hierarchy',
  'Terracotta Glow Counter Sticker removes the oversized generic accent circle',
  'Counter Sticker intentionally omits the tagline to preserve close-range scan hierarchy',
  'Counter Sticker uses the shorter governed business-aware view action',
  'Counter Sticker keeps the business name typographically dominant over the CTA',
  'Counter Sticker QR panel keeps 24px horizontal padding',
  'Counter Sticker prints only the truthful public hostname',
  'Terracotta Glow Counter Sticker uses the real client logo when supplied',
  'Counter Sticker rulebook geometry passed for all',
  'Counter Sticker removes the legacy oversized accent circle',
  'Counter Sticker omits the tagline to protect the compact scan hierarchy',
  'Counter Sticker uses the governed compact view action',
  'Counter Sticker prints only the canonical hostname',
].forEach((token) => requireToken(printableThemeArtworkTest, token, 'all-theme Counter Sticker rulebook regression'));
[
  'assertTerracottaEntrancePosterPilotGeometry',
  'Terracotta Glow Entrance Poster exposes its complete distance-view identity and scan hierarchy',
  'Terracotta Glow Entrance Poster removes the redundant OUR SERVICES headline',
  'Entrance Poster retains the explicit distance-readable scan action',
  'Entrance Poster keeps the business name typographically dominant',
  'Entrance Poster QR panel keeps 24px horizontal padding',
  'Entrance Poster prints only the truthful public hostname',
  'Terracotta Glow Entrance Poster uses the real client logo when supplied',
  'Entrance Poster rulebook replaces the legacy headline hierarchy in every theme',
].forEach((token) => requireToken(printableThemeArtworkTest, token, 'Terracotta Glow Entrance Poster pilot regression'));
[
  'assertTerracottaFeedbackQrPilotGeometry',
  'Terracotta Glow Feedback QR exposes its complete feedback-specific hierarchy',
  'Terracotta Glow Feedback QR removes the redundant scan instruction',
  'Feedback QR preserves the real optional business tagline without inventing copy',
  'Feedback QR preserves the governed tagline-to-conversation breathing room',
  'Feedback QR omits the tagline row and reflows safely when the owner has not supplied one',
  'Feedback QR uses one warm and explicit feedback action',
  'Feedback QR explains why an honest response is useful',
  'Feedback QR review artwork preserves its governed Koboyo source provenance',
  'Feedback QR uses one governed rating-neutral Koboyo review symbol',
  'Feedback QR removes the subtle generic sparkle motif',
  'Feedback QR contains no star rating or score solicitation',
  'Feedback QR conversation artwork stays behind its readable copy',
  'Feedback QR review artwork has a deliberate panel-to-purpose layer order',
  'Feedback QR action copy clears the review artwork',
  'Feedback QR removes the retired hand-built smile and response-ray motif',
  'Feedback QR decorative artwork remains outside the protected QR panel',
  'Feedback QR moves the invitation upward when the optional tagline is absent',
  'Feedback QR cannot be confused with a menu or services action',
  'Feedback QR encodes the complete feedback destination rather than the menu URL',
  'Feedback QR panel keeps 24px horizontal padding',
  'Feedback QR prints only the truthful feedback hostname',
  'Feedback QR rulebook replaces the redundant instruction hierarchy in every theme',
].forEach((token) => requireToken(printableThemeArtworkTest, token, 'Terracotta Glow Feedback QR pilot regression'));
[
  'assertTerracottaCampaignFlyerPilotGeometry',
  'Terracotta Glow Flyer exposes its complete truthful identity and scan hierarchy',
  'Flyer removes unsupported weekend-offer, special-offer, and terms claims',
  'Flyer preserves the real optional business tagline',
  'Flyer uses one business-aware scan action without CURRENT',
  'Flyer limits its centered CTA to at most two lines',
  'Flyer keeps CTA, divider, and QR in separate scan-panel columns',
  'Flyer QR panel keeps 24px horizontal padding',
  'Flyer prints only the truthful canonical hostname',
  'Flyer omits the tagline row instead of inventing campaign or brand copy',
  'Flyer rulebook removes synthetic offer claims in every theme',
].forEach((token) => requireToken(printableThemeArtworkTest, token, 'Terracotta Glow Flyer pilot regression'));
[
  'assertTerracottaBusinessCardPilotGeometry',
  'Terracotta Glow Business Card preserves two exact protected 90 x 55 mm print faces',
  'Terracotta Glow Business Card exposes its complete premium brand-front and contact-back hierarchy',
  'Business Card keeps the brand-led front free of QR utility clutter',
  'Business Card uses the real contact person instead of repeating the business name',
  'Business Card omits designation even when a role is supplied',
  'Business Card omits the social handle even when it is supplied',
  'Business Card replaces redundant contact labels with one restrained semantic SVG icon per fact',
  'Business Card contact SVG icons inherit the Terracotta Glow parent-theme accent',
  'Business Card removes the visible PHONE, EMAIL, and VISIT labels',
  'Business Card prints only the admitted contact facts',
  'Business Card uses one short business-aware QR action',
  'Business Card prints only the truthful canonical hostname',
  'Business Card QR panel keeps 24px horizontal padding',
  'Business Card removes invented placeholders and the legacy generic scan language',
  'Business Card omits unavailable contact rows instead of printing placeholders',
  'Business Card rejects a placeholder-like contact name',
  'Business Card rejects malformed or placeholder-like contact facts',
  'Business Card excludes designation independently of other supplied fields',
  'Terracotta Glow Business Card uses the real client logo on both brand lockups when supplied',
  'Business Card approved premium composition propagates to adjacent parent themes',
  'assertAllThemeBusinessCardRulebookGeometry',
  'uses one semantic SVG icon per admitted contact fact',
  'contact SVG icons inherit the selected parent-theme accent',
  'excludes designation and social handle',
].forEach((token) => requireToken(printableThemeArtworkTest, token, 'Business Card cross-theme rulebook regression'));
[
  'assertTerracottaStaffNameBadgePilotGeometry',
  'Terracotta Glow Staff Name Badge exposes its complete premium identity hierarchy',
  'Staff Name Badge derives its central monogram from the real staff name',
  'Staff Name Badge uses the explicitly supplied staff name',
  'Staff Name Badge uses only the selected staff record role',
  'Staff Name Badge ignores unrelated store contact-person fields',
  'Staff Name Badge states its non-credential purpose once',
  'Staff Name Badge contains no unavailable photo affordance',
  'Staff Name Badge adds no unexplained QR',
  'Staff Name Badge does not expose the supplied phone number',
  'Staff Name Badge does not expose the supplied business address',
  'Staff Name Badge removes the unrelated menu or services URL',
  'Staff Name Badge invents no employee or certificate number field',
  'Staff Name Badge rejects a placeholder-like staff name',
  'Staff Name Badge rejects a placeholder-like role and never renders a role without a real staff name',
  'Staff Name Badge minimal state invents no staff monogram without a real staff name',
  'Terracotta Glow Staff Name Badge uses the real client logo when supplied',
  'Staff Name Badge premium hierarchy propagates beyond the Terracotta Glow pilot',
  'assertAllThemeStaffNameBadgeRulebookGeometry',
  'keeps the complete approved premium hierarchy',
  'Staff Name Badge rulebook geometry passed for all',
].forEach((token) => requireToken(printableThemeArtworkTest, token, 'Terracotta Glow Staff Name Badge pilot regression'));

[
  'assertTerracottaEventInvitationPilotGeometry',
  'Terracotta Glow Invitation exposes its complete print-and-write hierarchy',
  'Invitation provides a blank occasion field instead of a sample event',
  'Invitation provides only relevant physical write-in labels',
  'Invitation emits no irrelevant QR',
  'Invitation emits no reply-by claim',
  'Invitation emits no sample event name',
  'Invitation contains no fixture copy, reply request, destination action, or invented occasion',
  'Invitation keeps the business identity separate from the top garland',
  'Invitation keeps one generous location line without a redundant continuation',
  'assertAllThemeEventInvitationRulebookGeometry',
  'keeps the complete approved premium hierarchy',
  'Event Invitation rulebook geometry covers every governed theme',
  'Event Invitation rulebook geometry passed for all',
  'emits one location line',
].forEach((token) => requireToken(printableThemeArtworkTest, token, 'Event Invitation all-theme rulebook regression'));
[
  'buildPremiumThemedEventInvitation',
  'addInvitationWriteInField',
  'addInvitationLibraryIconMotif',
  'Invitation stationery field',
  'Invitation top garland ornament',
  'Invitation closing celebration mark',
  'getPrintableLibraryIconDataUri',
  'getPrintableLibraryIconSymbolMarkup',
  'getInvitationBotanicalOrnamentDataUri',
  'Invitation botanical ornament',
  'data-icon-library="koboyo"',
  'data-copy-safe-center',
  'name: "Invitation occasion"',
  'Invitation write-in panel',
  'name: "Invitation date"',
  'name: "Invitation time"',
  'name: "Invitation location"',
  'Bodoni MT, Didot, Georgia, serif',
].forEach((token) => requireToken(editorAdapter, token, 'Event Invitation shared renderer boundary'));
[
  'koboyo-may-garland',
  'koboyo-grateful',
  'koboyo-flower',
  'koboyo-celebration-burst',
  'koboyo-gift',
  'koboyo-review-quote',
  'https://koboyo.com/icons/may-garland',
  'https://koboyo.com/icons/grateful',
  'https://koboyo.com/icons/flower',
  'https://koboyo.com/icons/celebration-burst',
  'https://koboyo.com/icons/gift',
  'https://koboyo.com/icons/review-quote',
  'https://koboyo.com/icons/license',
  'not exposed as a picker',
  'PRINTABLE_ASSET_KOBOYO_ARTWORK_POLICY',
  'requires-content-contract',
  'data-icon-accessed',
].forEach((token) => requireToken(printableIconArtwork, token, 'governed printable icon artwork boundary'));
[
  'getPrintableLibraryIconSymbolMarkup',
  "getPrintableLibraryIconSymbolMarkup('koboyo-gift', 'gift-certificate-purpose-art')",
  'data-icon-library="koboyo"',
  'data-purpose-art="gift"',
  'gift-certificate-purpose-art',
].forEach((token) => requireToken(giftCertificateArtwork, token, 'Gift Certificate governed Koboyo artwork boundary'));
[
  'getPrintableLibraryIconDataUri("koboyo-review-quote", ctx.accent)',
  'Feedback review quote artwork',
].forEach((token) => requireToken(editorAdapter, token, 'Feedback QR governed Koboyo artwork boundary'));
[
  'getPrintableLibraryIconDataUri("koboyo-flower", ctx.accent)',
  'Postcard appreciation flower left',
  'Postcard appreciation flower center',
  'Postcard appreciation flower right',
  'alt: "Hand-drawn appreciation flower"',
].forEach((token) => requireToken(editorAdapter, token, 'Terracotta Glow Postcard governed Koboyo artwork boundary'));
if (editorAdapter.includes('getPrintableLibraryIconDataUri("koboyo-grateful"')) {
  failures.push('Terracotta Glow Postcard must not render human or face artwork');
}
[
  'Feedback smile seal',
  'Feedback smile eye',
  'Feedback response ray',
].forEach((token) => {
  if (editorAdapter.includes(token)) failures.push(`Feedback QR must not restore retired hand-built artwork: ${token}`);
});
if (editorAdapter.includes('Invitation closing divider')) {
  failures.push('Event Invitation must not restore the rejected bottom closing ornament');
}
if (editorAdapter.includes('buildLegacyEventInvitation')) {
  failures.push('Event Invitation must not restore a legacy per-theme renderer path');
}
[
  'name: "Invitation venue"',
  'name: "Invitation address"',
  'Invitation location continuation line',
].forEach((token) => {
  if (editorAdapter.includes(token)) failures.push(`Event Invitation shared renderer must not restore a redundant field: ${token}`);
});
if (!editorAdapter.includes('function buildEventInvitation(ctx: BuildContext) {\n    buildPremiumThemedEventInvitation(ctx);\n}')) {
  failures.push('Every Event Invitation theme must route through the approved shared premium renderer');
}
[
  'Autumn Open House',
  'Please reply by',
  'VIEW EVENT',
  'SCAN FOR DETAILS',
  'Private event · New launch · Special evening',
].forEach((token) => {
  if (editorAdapter.includes(token) || read('scripts/verification/render-printable-theme-visual-fixtures.ts').includes(token)) {
    failures.push(`Invitation renderer and fixtures must not contain hardcoded event output: ${token}`);
  }
});
[
  read('src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx'),
  read('src/components/mobile/screens/MobileShareScreen.tsx'),
].forEach((source) => {
  requireToken(source, 'GiftCertificateContentFields', 'Gift Certificate runtime content parity');
  requireToken(source, 'InvitationContentFields', 'Invitation runtime content parity');
  requireToken(source, 'buildPrintableGiftCertificateContent', 'Gift Certificate render input parity');
  requireToken(source, 'buildPrintableInvitationContent', 'Invitation render input parity');
});

[
  'resolvePrintableStaffBadgePerson',
  'role.id === roleId && role.active !== false',
  'user.active === false',
  'user.authDisabled === true',
  'user.deleted === true',
].forEach((token) => requireToken(
  read('src/lib/printable-asset-templates/staffBadgePerson.ts'),
  token,
  'Staff Name Badge staff-record admission boundary',
));
[
  'usePrintableStaffBadgePeople',
  'fetchStaffUsers',
  'canReadStaff',
].forEach((token) => requireToken(
  read('src/hooks/usePrintableStaffBadgePeople.ts'),
  token,
  'Staff Name Badge shared staff-loading boundary',
));
[
  'usePrintableStaffBadgePeople',
  'selectedStaffBadgePersonId',
  'staffName: staffBadgePerson.name',
  'staffRole: staffBadgePerson.role',
  'You need staff-management access to create a personalized badge.',
].forEach((token) => requireToken(
  read('src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx'),
  token,
  'desktop Staff Name Badge selection boundary',
));
[
  'usePrintableStaffBadgePeople',
  'selectedStaffBadgePersonId',
  'staffName: staffBadgePerson.name',
  'staffRole: staffBadgePerson.role',
  'canSelectStaffBadgePerson={userPermissions?.canManageUsers === true}',
  'You need staff-management access to create a staff badge.',
].forEach((token) => requireToken(
  read('src/components/mobile/screens/MobileShareScreen.tsx'),
  token,
  'mobile Staff Name Badge selection boundary',
));

if (editorAdapter.includes('ADD STAFF PHOTO')) {
  failures.push('Staff Name Badge source must not expose an unavailable photo affordance');
}
[
  'assertTerracottaGiftCertificatePilotGeometry',
  'Terracotta Glow Gift Certificate exposes a complete premium write-in and scan hierarchy',
  'Gift Certificate provides separate truthful recipient, sender, and message write-in fields',
  'Gift Certificate provides separate value, validity, and certificate-number write-in fields',
  'Gift Certificate removes the ambiguous combined Value / valid until placeholder',
  'Gift Certificate invents no amount, currency, expiry, or redemption capability',
  'Gift Certificate uses a truthful business-aware discovery action',
  'Gift Certificate QR panel keeps 24px horizontal padding',
  'Gift Certificate prints only the canonical hostname',
  'Gift Certificate omits the tagline row instead of inventing brand copy',
  'Gift Certificate uses its governed Koboyo gift artwork',
  'Gift Certificate identifies Koboyo as its governed purpose-art library',
  'Gift Certificate preserves the official Koboyo gift source in its master',
  'assertAllThemeGiftCertificateRulebookGeometry',
  'uses its own governed gift-wrap master',
  'keeps the complete approved certificate hierarchy',
  'overlay is current with its governed theme tokens',
  'Gift Certificate rulebook geometry passed for all',
].forEach((token) => requireToken(printableThemeArtworkTest, token, 'All-theme Gift Certificate rulebook regression'));
[
  'assertAllThemePosterFeedbackAndFlyerRulebookGeometry',
  'preserves its governed theme artwork',
  'artwork preserves aspect ratio without horizontal stretching',
  'responsive artwork covers the complete canvas',
  'keeps real identity and optional tagline hierarchy',
  'keeps 24px horizontal QR padding',
  'prints a truthful path-free hostname',
  'contains no legacy redundant or synthetic copy layers',
  'keeps its distinct conversation invitation',
  'preserves owner-supplied ${layerName.toLowerCase()}',
  'fallback invents no campaign content',
].forEach((token) => requireToken(printableThemeArtworkTest, token, 'all-theme Poster Feedback QR and Flyer regression'));
[
  'buildPremiumThemedPostcard',
  'function buildPostcard(ctx: BuildContext) {\n    buildPremiumThemedPostcard(ctx);\n}',
  'Postcard stationery field',
  'Postcard editorial rule',
  'const dividerWidth = Math.round(messageWidth * 0.27)',
  'x: messageX + Math.round((messageWidth - dividerWidth) / 2)',
  'Postcard action panel',
  'ctx.input.postcardContent',
  'getPrintableAssetDisplayHost(ctx.input)',
].forEach((token) => requireToken(editorAdapter, token, 'all-theme Postcard renderer boundary'));
for (const token of ['buildLegacyPostcard', 'Postcard accent panel', 'A thank-you, update, or special offer.', 'SCAN FOR LATEST']) {
  if (editorAdapter.includes(token)) failures.push(`Postcard renderer still contains retired legacy behavior: ${token}`);
}
[
  'assertAllThemePostcardRulebookGeometry',
  'for (const themeId of PRINTABLE_THEME_FAMILY_IDS)',
  'fallback invents no headline',
  'keeps 12px horizontal decorative QR padding',
  'Postcard keeps one deliberate left-center-right appreciation flower row',
  'Postcard renders no human or face illustration',
  'Postcard logo or initials and business name share one horizontal center',
  'Postcard business name and tagline share one horizontal center',
  'Postcard editorial rule shares the identity stack horizontal center',
  'Postcard stationery adds no redundant outer border over the theme background',
  'Postcard real logo and business name share one horizontal center',
  'Postcard contains no legacy synthetic campaign copy',
].forEach((token) => requireToken(printableThemeArtworkTest, token, 'all-theme Postcard rulebook regression'));
const printableThemeVisualFixtures = read('scripts/verification/render-printable-theme-visual-fixtures.ts');
[
  'toMenuListFixtureLink',
  "'.menulist.online'",
  'exposed a reserved .example hostname',
].forEach((token) => requireToken(printableThemeVisualFixtures, token, 'printable visual fixture link contract'));

const useMenuList = read('src/components/templates/main-app/useMenuList/index.tsx');
const menuKitShareSection = read('src/components/templates/main-app/projects/b2cView/shareModal/MenuKitSection.tsx');
requireToken(useMenuList, 'buildPrintableAssetsUrl', 'Use MenuList shortcut');
requireToken(useMenuList, "title=\"Assets\"", 'Use MenuList shortcut');
requireToken(useMenuList, 'Print for Your Business', 'Use MenuList print shortcut');
requireToken(useMenuList, 'brandColor: storeBrandColor', 'Use MenuList print shortcut');

const desktopAssetsRoute = read('src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx');
const desktopAssetsStyles = read('src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.module.scss');
const desktopItemEditor = read('src/components/templates/main-app/projects/editorView/editItemModal.tsx');
const mobileItemEditor = read('src/components/mobile/sheets/ItemEditSheet.tsx');
const itemProductTag = read('src/lib/printable-asset-templates/itemProductTag.ts');
const itemProductTagModal = read('src/components/shared/printableAssets/ItemProductTagModal.tsx');
const printableAssetWorkflowModal = read('src/components/shared/printableAssets/PrintableAssetWorkflowModal.tsx');
const printableAssetDelivery = read('src/lib/printable-asset-templates/assetDelivery.ts');
const campaignPoster = read('src/lib/printable-asset-templates/campaignPoster.ts');
const campaignPosterModal = read('src/components/shared/printableAssets/CampaignPosterModal.tsx');
const desktopToday = read('src/components/templates/main-app/today/index.tsx');
const mobileToday = read('src/components/mobile/screens/MobileHoursScreen.tsx');
const desktopDecisionChoices = read('src/components/templates/main-app/projects/editorView/DecisionBlocksSettingsModal.tsx');
const mobileDecisionChoices = read('src/components/mobile/sheets/SmartRecommendationsSheet.tsx');
const desktopMenuEditor = read('src/components/templates/main-app/projects/editorView/Editor.tsx');
const mobileMenuScreen = read('src/components/mobile/screens/MobileMenuScreen.tsx');
const publicMenuView = read('src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx');
const flyerCampaignFields = read('src/components/shared/printableAssets/FlyerCampaignFields.tsx');
const postcardContentFields = read('src/components/shared/printableAssets/PostcardContentFields.tsx');
[
  'preparePrintableAssetDelivery',
  'downloadPrintableAssetFiles',
  "zip.file(file.filename, await file.blob.arrayBuffer())",
  "filename: `${normalizeArchiveName(archiveName)}.zip`",
].forEach((token) => requireToken(printableAssetDelivery, token, 'single-file and multi-file printable delivery'));
[
  'editorBaselineRef',
  'editorDirty',
  'beforeunload',
  'Discard unsaved design changes?',
  'Retry preview',
  "previewState !== 'ready'",
  'downloadPrintableAssetFiles',
].forEach((token) => requireToken(printableAssetWorkflowModal, token, 'shared printable workflow safety'));
[
  'Campaign headline',
  'Offer or benefit (optional)',
  'Supporting details (optional)',
  'Valid until (optional)',
  'Terms (optional)',
  'Update preview',
  'buildPrintableFlyerCampaignContent',
].forEach((token) => requireToken(flyerCampaignFields, token, 'shared owner-authored Flyer content fields'));
[
  'FlyerCampaignFields',
  'flyerCampaignDraft',
  "selectedAssetId === 'campaign_flyer'",
].forEach((token) => requireToken(desktopAssetsRoute, token, 'desktop Flyer content flow'));
[
  'FlyerCampaignFields',
  'flyerCampaignDraft',
  "assetTypeId === 'campaign_flyer'",
].forEach((token) => requireToken(mobileShare, token, 'mobile Flyer content flow'));
[
  'Headline',
  'Supporting message (optional)',
  'Leave the headline empty for a clean brand postcard',
  'Update preview',
  'buildPrintablePostcardContent',
].forEach((token) => requireToken(postcardContentFields, token, 'shared owner-authored Postcard content fields'));
[
  'PostcardContentFields',
  'postcardContentDraft',
  "selectedAssetId === 'postcard'",
].forEach((token) => requireToken(desktopAssetsRoute, token, 'desktop all-theme Postcard content flow'));
if (desktopAssetsRoute.includes("selectedAssetId === 'postcard' && activeTemplateFamily.id === 'terracotta-glow'")) {
  failures.push('Desktop Postcard fields still depend on Terracotta Glow');
}
[
  'PostcardContentFields',
  'postcardContentDraft',
  "assetTypeId === 'postcard'",
].forEach((token) => requireToken(mobileShare, token, 'mobile all-theme Postcard content flow'));
if (mobileShare.includes("asset.id === 'postcard' && family?.id === 'terracotta-glow'")) {
  failures.push('Mobile Postcard fields still depend on Terracotta Glow');
}
[
  'PRINTABLE_ASSET_CATALOG_TYPES',
  "asset.id !== 'product_tag'",
].forEach((token) => requireToken(assetTypes, token, 'context-first printable asset catalogue'));
[
  'ASSET_PURPOSE_GROUPS',
  'visiblePurposeAssets.map',
  "assetIds: ['print_menu', 'table_tent', 'single_table_card', 'counter_sticker', 'entrance_poster', 'feedback_qr']",
  "assetIds: ['campaign_flyer', 'gift_certificate', 'event_invitation', 'postcard', 'campaign_poster']",
  "assetIds: ['business_card', 'staff_id_card']",
].forEach((token) => requireToken(desktopAssetsRoute, token, 'desktop context-first printable asset catalogue'));
requireToken(mobileShare, 'PRINTABLE_ASSET_CATALOG_TYPES.map', 'mobile context-first printable asset catalogue');
[
  'buildItemProductTagRenderInput',
  "assetTypeId: 'product_tag'",
  "target.searchParams.set('item', itemId)",
  'resolvePrintableAssetStyle',
  'printableAssetStylePreferences',
  'productTagContent',
  'options.length > 0 ? { options } : {}',
  'templateFamilyId: resolvedStyle.templateFamilyId',
].forEach((token) => requireToken(itemProductTag, token, 'item-derived Product Tag input contract'));
[
  "const canonicalItemId = params.get('item')",
  'const urlSegment = canonicalItemId || legacyUrlSegment',
  'setSelectedItem(item)',
  'applyClientDocumentMeta(item, buildItemUrl(item))',
].forEach((token) => requireToken(publicMenuView, token, 'public exact-item Product Tag destination'));
[
  'renderPrintableAsset',
  'buildPrintableAssetEditorDocument',
  'renderPrintableAssetEditorDocumentFiles',
  'Edit design',
  'Download image',
  'Download PDF',
].forEach((token) => requireToken(printableAssetWorkflowModal, token, 'shared printable preview-edit-download flow'));
[
  'PrintableAssetWorkflowModal',
  'QR opens this exact item.',
].forEach((token) => requireToken(itemProductTagModal, token, 'shared Product Tag workflow wrapper'));
[
  'buildItemProductTagRenderInput',
  'ItemProductTagModal',
  'setIsProductTagOpen(true)',
  'Save item changes before creating the Product Tag.',
].forEach((token) => requireToken(desktopItemEditor, token, 'desktop item Product Tag flow'));
[
  'buildItemProductTagRenderInput',
  'ItemProductTagModal',
  'setIsProductTagOpen(true)',
  'Save item changes before creating the Product Tag.',
].forEach((token) => requireToken(mobileItemEditor, token, 'mobile item Product Tag flow'));
[
  'buildTodayCampaignPosterRenderInput',
  "assetTypeId: 'campaign_poster'",
  'appendItemQuery(menuUrl, itemId)',
  'expectedProjectId',
  'resolvePrintableAssetStyle',
  'const campaignContent = buildCampaignContent(campaign, params.project)',
  'campaignContent,',
].forEach((token) => requireToken(campaignPoster, token, 'Today-derived Campaign Poster input contract'));
[
  'buildDecisionChoiceCampaignPosterRenderInput',
  'DECISION_CHOICE_SETTING_KEYS',
  'Automatic choices deliberately fail closed',
  'getBlockLabels(',
  'generateProjectUrl(',
  'appendItemQuery(menuUrl, item.id)',
].forEach((token) => requireToken(campaignPoster, token, 'saved Featured-choice Campaign Poster input contract'));
[
  'PrintableAssetWorkflowModal',
  "isExactItemDestination ? 'this exact item' : 'the selected customer page'",
].forEach((token) => requireToken(campaignPosterModal, token, 'Campaign Poster preview-edit-download wrapper'));
[
  'buildDecisionChoiceCampaignPosterRenderInput',
  'Preview &amp; download poster',
  'pinnedId === savedPinnedId',
  '!hasUnsavedProjectChanges',
  'store: storeDetails',
  'Saved ${posterChoiceTitle}',
].forEach((token) => requireToken(desktopDecisionChoices, token, 'desktop saved Featured-choice poster workflow'));
[
  'buildDecisionChoiceCampaignPosterRenderInput',
  'visible={visible && !posterInput}',
  "tCommon('download')",
  'await onSaved(updatedProject)',
  'pinnedId === savedPinnedId',
  'store: storeDetails',
].forEach((token) => requireToken(mobileDecisionChoices, token, 'mobile saved Featured-choice poster workflow'));
[
  'hasUnsavedProjectChanges={hasChanges || isSaving}',
].forEach((token) => requireToken(desktopMenuEditor, token, 'desktop Featured-choice persisted-truth gate'));
[
  'await persistMenuProjectImmediately(updatedProject)',
  'applyLocalMenuUpdate(removeObjRef(savedProject || updatedProject))',
].forEach((token) => requireToken(mobileMenuScreen, token, 'mobile Featured-choice immediate persistence gate'));
[
  'buildTodayCampaignPosterRenderInput',
  'CampaignPosterModal',
  "surface === 'print_poster'",
  'handleCampaignPosterDownloaded',
].forEach((token) => requireToken(desktopToday, token, 'desktop Today Campaign Poster workflow'));
[
  'buildTodayCampaignPosterRenderInput',
  'CampaignPosterModal',
  "campaign.primarySurface === 'print_poster'",
  'handleCampaignPosterDownloaded',
].forEach((token) => requireToken(mobileToday, token, 'mobile Today Campaign Poster workflow'));
[
  "selectedAssetId === 'campaign_poster'",
  'posterCampaignDraft',
  'Add a real campaign headline before downloading the Campaign Poster.',
].forEach((token) => requireToken(desktopAssetsRoute, token, 'desktop manual Campaign Poster truth gate'));
[
  "selectedPrintableAssetId === 'campaign_poster'",
  'posterCampaignDraft',
  'Add a real campaign headline before downloading the Campaign Poster.',
].forEach((token) => requireToken(mobileShare, token, 'mobile manual Campaign Poster truth gate'));
if (/TODAY'S SPECIAL|Fresh offer available now|SCAN FOR OFFER/.test(editorAdapter)) {
  failures.push('Campaign Poster renderer still contains invented legacy campaign copy');
}
[
  'buildPremiumCampaignPoster',
  'Campaign poster identity rule',
  'Campaign poster headline rule left',
  'Campaign poster headline rule right',
  'Campaign poster scan ticket',
  'function buildCampaignPoster(ctx: BuildContext) {\n    buildPremiumCampaignPoster(ctx);\n}',
].forEach((token) => requireToken(editorAdapter, token, 'all-theme Campaign Poster rulebook'));
if (editorAdapter.includes('buildTerracottaCampaignPosterPilot')) {
  failures.push('Campaign Poster renderer still contains the retired Terracotta-only pilot branch');
}
if (editorAdapter.includes('Campaign poster scan divider')) {
  failures.push('Campaign Poster still contains the retired horizontal scan-group divider');
}
[
  'resolveCurrentCampaignItem',
  'candidate.id === itemId || candidate.extractionIdAliases?.includes(itemId)',
  'item.active === false || item.available === false',
  'details: item.description',
].forEach((token) => requireToken(campaignPoster, token, 'current-item Campaign Poster source'));
[
  'project: activeProject',
].forEach((token) => requireToken(desktopToday, token, 'desktop Campaign Poster current-item source'));
[
  'project: selectedProject',
].forEach((token) => requireToken(mobileToday, token, 'mobile Campaign Poster current-item source'));
[
  'buildPremiumThemedProductTag',
  'Product tag stationery field',
  'Product tag action panel',
  'Product tag editorial divider',
  'ctx.input.productTagContent',
  'Product options',
  'Product tag call to action',
  'const ctaText = "VIEW DETAILS"',
  'getPrintableAssetDisplayHost(ctx.input)',
].forEach((token) => requireToken(editorAdapter, token, 'all-theme Product Tag renderer'));
if (/Customer favorite|name: "Tag headline"|text: "NEW"/.test(editorAdapter)) {
  failures.push('Product Tag renderer still contains invented legacy promotion copy');
}
[
  'assertProductTagRulebookGeometry',
  'Product Tag preserves the exact owner-authored product name',
  'Product Tag summarizes valid active options without inventing add-on semantics',
  'Product Tag contains no invented legacy promotion copy',
  'Product Tag fallback invents no product name',
  'Product Tag rulebook geometry passed for all',
].forEach((token) => requireToken(printableThemeArtworkTest, token, 'all-theme Product Tag regression'));
[
  'menuModifiedOn: storeDetails.lastPublishedAt',
  'menuModifiedOn: project.menuModifiedOn',
  'aria-pressed={active}',
  'activeTemplateId',
  'selectedAssetActionFormats',
  'availableTemplateFamilies',
  '[getPrintableTemplateFamily(effectiveThemeId)]',
  'getPrintableDownloadActionLabel',
  'getPrintableActionFormats',
  'renderPrintableAssetDownloadFiles',
  'renderTemplatePreview',
  'getExistingProjectsListWithoutLoader',
  'getProjectDataWithoutLoader',
  'projectDataCacheRef',
  'getCachedProjectData',
  "return 'png';",
  'Your Brand Kit',
  'brandHeroToolbar',
  'brandKitStatus',
  "'--assets-card-bg': token.colorBgElevated",
  'Download complete kit',
  'Change brand look',
  'Place in your business',
  'Promote & share',
  'Business identity',
  'getPurposeGroupIcon',
  'Choose an asset',
  'Select one to preview, edit, or download.',
  '{visiblePurposeAssets.length} assets',
  'LuChevronRight',
  'Preview & edit',
  'const openAssetActions = (assetId: PrintableAssetTypeId)',
  'onClick={() => openAssetActions(assetId)}',
  'onClick={() => handleSelectAsset(asset.id)}',
  'onClick={openCurrentAssetActions}',
  'aria-label={`Preview ${asset.title}`}',
  'aria-label={`Open ${selectedAsset.title} preview`}',
  'aria-haspopup="dialog"',
  'You can inspect the design now. Downloads stay unavailable until its QR destination is active.',
  "previewState !== 'ready'",
  'openCompleteKitActions',
  'handleQuickDownload',
  'MENU_KIT_ASSET_KEYS.length',
  ": 'table_tent';",
  'Customize',
  'CreativeEditor',
  'chromeMode="embedded"',
  'productLabel="MenuList Assets"',
  'sourceLabel="Print assets"',
  'editorDocumentRef',
  'buildPrintableAssetEditorDocument',
  'renderPrintableAssetEditorDocument',
  'renderPrintableAssetEditorDocumentFiles',
  'downloadPrintableAssetFiles',
  'PrintableTemplatePreview',
  'isThemeLibraryOpen',
  'visibleThemeFamilies.map',
  'const current = effectiveThemeId === family.id',
  "current ? 'Current' : 'Previewing'",
  'data.projectName || \'this menu\'',
  'Choose a look to preview it. Nothing changes until you apply it.',
  "themeBrowseMode === 'recommended'",
  'className={styles.themeLibraryModal}',
  'closable={!stylePreferenceBusyKey}',
  'keyboard={!stylePreferenceBusyKey}',
  'maskClosable={!stylePreferenceBusyKey}',
  'width="100vw"',
  'zIndex={2300}',
  'Choose a look to preview it. Nothing changes until you apply it.',
  'setPreviewAsset',
  'Saved designs',
  'shouldShowSavedDesigns',
  'Save reusable design',
  'templateSaveLabel="Save reusable design"',
  "availableToolIds={['background', 'images', 'text', 'styles', 'brandKit']}",
  'enableBrowserDrafts',
  'initialDrawerCollapsed',
  'initialSelectedLayerId={null}',
  "workspaceControls={['preview']}",
  'requiresReadiness: true',
  'requestCloseEditor',
  'Discard unsaved design changes?',
  'zIndex: 2200',
  "createPortal((",
  'pendingTemplateSaveReservationRef',
  'createReservedTemplateId()',
  'reservation.inFlight += 1',
  'templateId: reservedTemplateId',
  'title: documentTitle || editorState.title',
  "setEditorBusyKey('editor-template-save')",
  'templateSavePreview',
  'thumbnailDataUrl: previewDataUrl',
  'stripPrintableAssetEditorAttributionLayers',
  'activePlanType: input.activePlanType',
  'activePlanType: editorState.activePlanType',
  'listCreativeEditorTemplates',
  'saveCreativeEditorTemplate',
  'getCreativeEditorTemplate',
  'deleteCreativeEditorTemplate',
  'title: labelConfirmDialogTitle(confirmationTitle)',
  'resolveCreativeEditorTemplateScope',
  'templateRegistryScope',
  'selectedPlatformTemplates',
  'selectedUserTemplates',
  'template.productId === templateRegistryContext.productId',
  'template.sourceSurface === templateRegistryContext.sourceSurface',
  'canLoadUserTemplates',
  'rehydratePrintableAssetEditorDocument',
  'resolveStoreBusinessCategory',
  'platformTemplateRegistryContext',
  'businessCategory: platformBusinessCategory',
  'secondaryLabel: project.url.replace',
  "shortLink: (assetTypeId === 'feedback_qr' ? data.feedbackQrLink : data.menuLink).replace",
  "setPageState('missing_public_link')",
  "setPageState('load_error')",
  'Set up your customer link',
  'Open Domain settings',
  'Assets could not be loaded',
  'Try again',
  'getExistingProjectsListWithoutLoader(true, {',
].forEach((token) => requireToken(desktopAssetsRoute, token, 'desktop assets route'));

[
  'Owner downloads must always',
  'await handleRender(effectiveThemeId, outputFormat);',
  'void renderTemplatePreview(effectiveThemeId, selectedStaffBadgePerson, assetId);',
  'onClick={() => void handleRender(activeTemplateFamily.id, format)}',
  'onClick={() => void openEditorForTemplate(activeTemplateFamily.id)}',
].forEach((token) => requireToken(desktopAssetsRoute, token, 'governed preview and export parity'));
[
  'handleRenderPlatformTemplate',
  'openEditorForPlatformTemplate',
  'download-platform:',
  'customize-platform:',
].forEach((token) => {
  if (desktopAssetsRoute.includes(token)) {
    failures.push(`desktop owner downloads must not render stale prepared platform documents: ${token}`);
  }
});

if (desktopAssetsRoute.includes('onClick={() => openAssetActions(asset.id)}')) {
  failures.push('desktop purpose-list asset rows must select the focused asset without opening the preview modal');
}

const brandKitPreviewIds = assetTypes.match(
  /PRINTABLE_BRAND_KIT_PREVIEW_ASSET_IDS:[\s\S]*?= Object\.freeze\(\[([\s\S]*?)\]\);/,
);
if (!brandKitPreviewIds) {
  failures.push('desktop Brand Kit must declare its governed bento preview assets');
} else {
  const previewIds = [...brandKitPreviewIds[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  const expectedPreviewIds = [
    'print_menu',
    'table_tent',
    'feedback_qr',
    'entrance_poster',
    'gift_certificate',
    'business_card',
  ];
  if (JSON.stringify(previewIds) !== JSON.stringify(expectedPreviewIds)) {
    failures.push(`desktop Brand Kit bento preview mismatch: ${previewIds.join(', ')}`);
  }
}
if (desktopAssetsRoute.includes('className={styles.brandSummary}')) {
  failures.push('desktop Brand Kit must not restore the retired theme-description side column');
}
[
  '.brandHero',
  '.brandHeroToolbar',
  '.brandMosaic',
  '.brandMosaicAction',
  '.brandMosaicItem:hover',
  '.assetPreviewTrigger',
  '.assetPreviewOpenHint',
  'grid-template-columns: 1.12fr 0.88fr 1.12fr 0.88fr',
  '.assetWorkspace',
  'grid-template-columns: minmax(520px, 1.12fr) minmax(390px, 0.88fr)',
  '.brandKitSection',
  'background: var(--assets-card-bg)',
  'display: grid !important',
  '.purposeTabLabel',
  '.assetListHeader',
  '@media (hover: hover)',
  'transform: translateY(-2px)',
  '.assetRowActive .assetRowIcon',
  '.assetRowActive:hover .assetRowIcon',
  '.assetSize:global(.ant-typography)',
  '.statusReady',
  '.assetRowChevron',
  'text-align: left',
  'justify-self: end',
  '.assetPreviewPane',
  'position: sticky',
  '@media (max-width: 960px)',
].forEach((token) => requireToken(desktopAssetsStyles, token, 'desktop Brand Kit split workspace'));
if (desktopAssetsStyles.includes('border-bottom-color: var(--ant-color-border-secondary)')) {
  failures.push('desktop asset browser must not regress to the retired static divider-row treatment');
}
[
  '.themeChoice',
  'display: flex !important',
  'flex-direction: column',
  'align-items: stretch',
  '.themeChoicePreview',
  'position: relative',
  '.themeChoiceCopy',
  'text-align: center',
  'text-wrap: balance',
  '.themeSelectedMark',
  'position: absolute',
  '.themeCurrentMark',
  '.themePendingMark',
  '.themeLibraryWorkspace',
  '.themeSetPreview',
  '.themeSetMosaic',
  '.themePreviewStateCurrent',
  '.themePreviewStateSelected',
  'grid-template-columns: minmax(0, 1.18fr) minmax(430px, 0.82fr)',
  'border-color: var(--theme-library-success)',
  'border-color: var(--theme-library-primary-border)',
  '.themeMenuContext',
  '.themeMenuAction:global(.ant-btn)',
  '.themeLibraryModal:global(.ant-modal)',
  'height: 100dvh',
  'overflow-y: auto',
  'grid-template-columns: repeat(auto-fill, minmax(190px, 1fr))',
].forEach((token) => requireToken(desktopAssetsStyles, token, 'desktop theme-choice visual hierarchy'));
[
  'const themeLibraryPreviewFamily = useMemo(',
  "'--theme-library-primary': token.colorPrimary",
  "'--theme-library-success': token.colorSuccess",
  'setPendingThemeId(null)',
  'currentId === family.id || current ? null : family.id',
  'PRINTABLE_BRAND_KIT_PREVIEW_ASSET_IDS.map((assetId)',
  "pendingThemeId ? 'Previewing — not applied yet' : 'Current brand look'",
  "pendingThemeId ? 'Previewing' : 'Current'",
].forEach((token) => requireToken(desktopAssetsRoute, token, 'desktop inspect-first theme bento'));
[
  'const stylePreferenceBusyRef = useRef(false)',
  'if (stylePreferenceBusyRef.current) return false',
  'stylePreferenceBusyRef.current = true',
  'stylePreferenceBusyRef.current = false',
  'disabled={!pendingThemeId || Boolean(stylePreferenceBusyKey)',
].forEach((token) => requireToken(desktopAssetsRoute, token, 'desktop theme preference write lock'));
for (const [source, label] of [[mobileShare, 'mobile']]) {
  [
    'const stylePreferenceBusyRef = useRef(false)',
    'if (stylePreferenceBusyRef.current) return false',
    'stylePreferenceBusyRef.current = true',
    'stylePreferenceBusyRef.current = false',
    'setPendingThemeId((value) => value === family.id || current ? null : family.id)',
    'PRINTABLE_BRAND_KIT_PREVIEW_ASSET_IDS.map((assetId, index)',
    "pendingThemeId ? 'Not applied yet' : 'Current brand look'",
    "'Apply to this menu'",
    "'Apply to all menus'",
  ].forEach((token) => requireToken(source, token, `${label} theme preference write lock`));
}
[
  [mobileShare, 'templateFamilyId: effectiveThemeId', 'mobile Share parent theme input'],
  [useMenuList, "assetTypeId: 'print_menu'", 'Use MenuList parent theme resolution'],
  [menuKitShareSection, 'const templateFamilyId = resolvePrintableAssetStyle({', 'project Share parent theme resolution'],
  [menuKitShareSection, 'templateFamilyId,', 'project Share generated assets'],
  [renderer, 'templateFamilyId: admittedInput.templateFamilyId', 'printable complete-kit parent theme'],
  [desktopAssetsRoute, 'Download complete kit', 'desktop bundle copy'],
  [desktopAssetsRoute, "handleSelectAsset('complete_menu_kit')", 'desktop bundle action'],
  [mobileShare, "selectedPrintableAssetId === 'complete_menu_kit' ? 'Themed Asset Set' : 'Current Theme'", 'mobile bundle heading'],
].forEach(([source, token, label]) => requireToken(source, token, label));
[
  'normalizeTemplateThumbnailUrl(template.thumbnailUrl)',
  'normalizeTemplateDimension(template.width)',
  'normalizeTemplateDimension(template.height)',
  "typeof template.description === 'string'",
].forEach((token) => requireToken(desktopAssetsRoute, token, 'desktop persisted template summary boundary'));
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
  'resolveCreativeEditorTemplateScopeBoundary',
  'creativeEditorDocumentSchema.parse(await readStorageJson(path))',
  'isOwnedCreativeEditorTemplateStoragePath(record.documentPath',
  'listCreativeEditorPlatformTemplates',
  'listCreativeEditorUserTemplates',
  'listCreativeEditorTemplates',
  'saveCreativeEditorTemplate',
  'getCreativeEditorPlatformTemplate',
  'getCreativeEditorTemplate',
  'getCreativeEditorUserTemplate',
  'deleteCreativeEditorTemplate',
  'composeRequestBody',
  'getActiveSession',
  'runTransaction',
  'transaction.get',
  'transaction.set',
  'buildCreativeEditorTemplateVersionId',
  'matchesCreativeEditorTemplateRecord',
  'upsertCreativeEditorTemplateRecord',
  'removeCreativeEditorTemplateRecord',
  'creative_editor_template_ambiguous_user_save_retained',
  'creative_editor_template_ambiguous_platform_save_retained',
  'creative_editor_template_ambiguous_user_delete_retained',
  'creative_editor_template_ambiguous_platform_delete_retained',
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
if (templateRegistryDal.includes('await setDoc(')) {
  failures.push('creative editor template registry writes must use transactions instead of read-then-set mutations');
}

const templateRegistryIndexBoundary = read('src/lib/creative-editor/templateRegistryIndexBoundary.ts');
[
  'matchesCreativeEditorTemplateRecord',
  'upsertCreativeEditorTemplateRecord',
  'removeCreativeEditorTemplateRecord',
  'Template index limit must be a positive safe integer',
].forEach((token) => requireToken(templateRegistryIndexBoundary, token, 'creative editor template registry index boundary'));

const templateRegistryStorageBoundary = read('src/lib/creative-editor/templateRegistryStorageBoundary.ts');
[
  'buildCreativeEditorTemplateVersionId',
  'buildCreativeEditorTemplateFileName',
  'isOwnedCreativeEditorTemplateStoragePath',
  'document-',
  'preview-',
  'document.json',
].forEach((token) => requireToken(templateRegistryStorageBoundary, token, 'creative editor template registry Storage boundary'));

const templateRegistryBoundaryTest = read('scripts/verification/test-creative-editor-template-registry-boundaries.ts');
[
  'creative-editor/templates/user/1/101/tpl_2',
  'Creative Editor template registry boundary tests passed.',
  'upsertCreativeEditorTemplateRecord',
  'isOwnedCreativeEditorTemplateStoragePath',
].forEach((token) => requireToken(templateRegistryBoundaryTest, token, 'creative editor template registry boundary test'));
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

[
  'admitPrintableAssetEditorDocument(cleanDocument, editorState.assetTypeId)',
  'document: admittedDocument',
  'editorDocumentRef.current = admittedDocument',
  'editorBaselineRef.current = JSON.stringify(admittedDocument)',
].forEach((token) => requireToken(
  desktopAssetsRoute,
  token,
  'desktop printable reusable-design persistence admission',
));

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

const platformTemplateManager = read('src/components/templates/platform/assetTemplates/index.tsx');
[
  'isPrintableAssetTypeId(template.assetTypeId)',
  'normalizePrintableTemplateFamilyId(template.templateFamilyId)',
  'normalizePreviewDimension(template.width)',
  'normalizePreviewDimension(template.height)',
  'formatTemplateUpdatedAt(template.updatedAt)',
  "typeof template.thumbnailUrl === 'string'",
  "typeof template.description === 'string'",
  'Number.isSafeInteger(template.version)',
].forEach((token) => requireToken(platformTemplateManager, token, 'platform template persisted-summary boundary'));
[
  "setAssetTypeId((template.assetTypeId || 'single_table_card') as PrintableAssetTypeId)",
  "setTemplateFamilyId((template.templateFamilyId || 'modern-calm') as PrintableTemplateFamilyId)",
  'new Date(template.updatedAt).toLocaleDateString()',
].forEach((token) => {
  if (platformTemplateManager.includes(token)) {
    failures.push(`platform template persisted-summary boundary retains unsafe token: ${token}`);
  }
});

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
  '^document-[a-zA-Z0-9_-]{8,64}\\\\.json$',
  '^preview\\\\.(png|jpg|jpeg|webp)$',
  '^preview-[a-zA-Z0-9_-]{8,64}\\\\.(png|jpg|jpeg|webp)$',
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

if (desktopAssetsRoute.includes('openIsolatedBrowserUrl(')) {
  failures.push('desktop assets route should preview in a modal, not window.open');
}
if (desktopAssetsRoute.includes('Preview was blocked')) {
  failures.push('desktop assets route should not download as a preview fallback');
}
if (desktopAssetsRoute.includes('<iframe')) {
  failures.push('desktop assets route should show image previews, not embedded PDF iframes');
}
requireToken(desktopAssetsRoute, 'Retry preview', 'desktop fail-closed preview recovery');
requireToken(desktopAssetsRoute, 'Downloads and Customize stay unavailable until it succeeds.', 'desktop fail-closed preview recovery');
if (desktopAssetsRoute.includes("asset.id === 'print_menu' || asset.id === 'entrance_poster'")) {
  failures.push('desktop assets route must not exclude Print Menu or Entrance Poster from real PNG preview generation');
}
if (desktopAssetsRoute.includes('destroyOnClose')) {
  failures.push('desktop assets route should use destroyOnHidden for Ant Design Modal previews');
}
requireToken(desktopAssetsRoute, 'destroyOnHidden', 'desktop assets preview modal');
[
  'previewModalActions',
  'previewModalAction',
  'previewModalStage',
  'previewModalImage',
  'previewModalSizeBadge',
  'previewModalDescription',
  'getPrintableModalDownloadActionLabel',
  '`${activeTemplateFamily.label} · ${selectedAssetId',
  'Download ZIP',
  'Customize',
].forEach((token) => requireToken(desktopAssetsRoute, token, 'desktop preview modal action row'));

if ((desktopAssetsRoute.match(/className=\{styles\.previewModalAction\}/g) || []).length < 3) {
  failures.push('desktop preview modal must keep download formats and customization in the shared responsive action row');
}
[
  '.previewModalActions',
  'display: flex',
  'flex-wrap: wrap',
  '.previewModalStage',
  'height: min(var(--preview-modal-height), 42vh)',
  'padding: 0',
  'background: transparent',
  'border: 0',
  '.previewModalImage',
  'width: auto',
  'height: auto',
  'object-fit: contain',
  '.previewModalSizeBadge:global(.ant-typography)',
  'right: 10px',
  'bottom: 10px',
  '.previewModalAction:global(.ant-btn)',
  'flex: 1 1 150px',
  'height: 44px',
  ':global(.ant-btn-icon svg)',
  'flex-basis: 100%',
].forEach((token) => requireToken(desktopAssetsStyles, token, 'desktop preview modal responsive action geometry'));

if (desktopAssetsStyles.includes('inset 3px 0 0 var(--assets-primary)')) {
  failures.push('desktop selected asset row must not restore the asymmetric left active rail');
}

if (desktopAssetsRoute.includes('card.tier') || desktopAssetsRoute.includes('family.tier')) {
  failures.push('desktop assets route must not show plan tier chips unless it also enforces plan gating');
}

if (stylePreferenceDal.indexOf('const savedPreferences = removePrintableAssetProjectStyleOverride(input);')
    > stylePreferenceDal.indexOf('const result = await updateStore({', stylePreferenceDal.indexOf('clearPrintableAssetProjectStyleOverride'))) {
  failures.push('printable project-style clear must validate the dynamic project key before the Firestore write');
}

[
  'handleSaveThemePreference',
  'handleClearProjectThemeOverride',
  'Already applied to all menus',
  'Apply to all menus',
  "data.projectName || 'this menu'",
  'Choose a look to preview it. Nothing changes until you apply it.',
  "current ? 'Current' : 'Previewing'",
  'themeMenuContext',
  'themeMenuAction',
].forEach((token) => requireToken(desktopAssetsRoute, token, 'desktop printable style defaults'));
[
  'handleSaveThemePreference',
  'handleClearProjectThemeOverride',
  'Apply to this menu',
  'Apply to all menus',
  'Selecting a card only changes this preview',
].forEach((token) => requireToken(mobileShare, token, 'mobile printable style defaults'));

for (const [source, label] of [[desktopAssetsRoute, 'desktop'], [mobileShare, 'mobile']]) {
  ['Menu exception', 'Business exception', 'handleSaveStylePreference', 'handleClearProjectStyleOverride'].forEach((token) => {
    if (source.includes(token)) failures.push(`${label} assets must not retain per-asset style control: ${token}`);
  });
}

if (mobileShare.includes('<iframe')) {
  failures.push('mobile assets sheet should show image previews, not embedded PDF iframes');
}
if (mobileShare.includes('previewAsset?.isPdf') || mobileShare.includes('isPdf:')) {
  failures.push('mobile assets sheet should not keep PDF iframe preview state');
}
requireToken(mobileShare, 'Retry preview', 'mobile fail-closed preview recovery');
requireToken(mobileShare, 'Download and Share stay unavailable until it succeeds.', 'mobile fail-closed preview recovery');
if (mobileShare.includes("asset.id === 'print_menu' || asset.id === 'entrance_poster'")) {
  failures.push('mobile assets sheet must not exclude Print Menu or Entrance Poster from real PNG preview generation');
}

const sharedPreview = read('src/components/shared/printableAssets/PrintableTemplatePreview.tsx');
[
  'DecorativeLayer',
  '/images/printable-themes/craft-kitchen/culinary-corner.png',
  '/images/menu-card-export/botanical-corner-watercolor.png',
  'OrnamentDots',
  'CornerLines',
  'DiagonalStrips',
  "aspectRatio: '1.42 / 1'",
  "height: compact ? '78%' : '78%'",
  'maxHeight: compact ? 176 : 286',
  'maxHeight: compact ? 212 : 330',
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
