#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
  require: ['tsconfig-paths/register'],
});

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

function forbidToken(source, token, label) {
  if (source.includes(token)) {
    failures.push(`${label} must not include token: ${token}`);
  }
}

function requireOccurrenceAtLeast(source, token, minimum, label) {
  const count = source.split(token).length - 1;
  if (count < minimum) {
    failures.push(`${label} requires ${token} at least ${minimum} times; found ${count}`);
  }
}

function requireOrder(source, tokens, label) {
  let previousIndex = -1;
  for (const token of tokens) {
    const index = source.indexOf(token, previousIndex + 1);
    if (index === -1) {
      failures.push(`${label} missing ordered token: ${token}`);
      return;
    }
    if (index <= previousIndex) {
      failures.push(`${label} token out of order: ${token}`);
      return;
    }
    previousIndex = index;
  }
}

const packageJson = read('package.json');
const designSystem = read('src/components/templates/main-app/projects/b2cView/designSystem/index.ts');
const designPresets = read('src/lib/menu/menuDesignPresets.ts');
const stylePresetPreview = read('src/components/shared/menuDesign/MenuStylePresetPreview.tsx');
const desktopSettings = read('src/components/templates/main-app/projects/b2cView/menuPage/menuPageSettingsNew.tsx');
const mobileDesign = read('src/components/mobile/screens/MobileDesignEditorScreen.tsx');
const publicMenu = read('src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx');
const exportedMenuOutput = read('src/components/templates/main-app/projects/b2cView/output/MenuPage.tsx');
const pdpModal = read('src/components/templates/main-app/projects/b2cView/output/PDPModal.tsx');
const publicPricePresentation = read('src/lib/pricing/publicItemPricePresentation.ts');
const publicMenuBackground = read('src/lib/menu/publicMenuBackground.ts');
const b2cContainer = read('src/components/templates/main-app/projects/b2cView/index.tsx');
const projectDatabase = read('src/database/projects/index.ts');
const firebaseFunctions = read('src/lib/firebase/functions.ts');
const readme = read('__docs__/projects/b2c-view/README.md');
const spec = read('__docs__/projects/b2c-view/b2c-view_spec.md');
const impl = read('__docs__/projects/b2c-view/b2c-view_impl.md');
const firebaseDoc = read('__docs__/projects/b2c-view/b2c-view_firebase.md');
const mobileDoc = read('__docs__/projects/b2c-view/b2c-view_mobile-support.md');
const helpDoc = read('__docs__/projects/b2c-view/b2c-view_helpdoc.md');
const websiteDoc = read('__docs__/projects/b2c-view/b2c-view_website.md');
const marketingDoc = read('__docs__/projects/b2c-view/b2c-view_marketing.md');
const constitutionNote = read('__docs__/projects/menu-editor/b2c-menu-layout-constitution-implementation.md');
const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');

requireToken(
  packageJson,
  '"verify:menu-design-presentation-boundary": "node scripts/verification/verify-menu-design-presentation-boundary.js"',
  'package scripts',
);

[
  "import { enforceContrast } from '@lib/colorEnforcement';",
  "export enum MenuMood",
  "export enum MenuLayout",
  "export const MENU_MOODS: Record<MenuMood, MenuMoodConfig>",
  "export const MENU_LAYOUTS: Record<MenuLayout, MenuLayoutConfig>",
  "export const MOOD_LAYOUT_COMPATIBILITY: Record<MenuMood, MenuLayout[]>",
  "[MenuMood.CLEAN]: [MenuLayout.LIST, MenuLayout.GRID]",
  "[MenuMood.WARM]: [MenuLayout.LIST, MenuLayout.CARD, MenuLayout.GRID]",
  "[MenuMood.PREMIUM]: [MenuLayout.LIST, MenuLayout.CARD]",
  "[MenuMood.BOLD]: [MenuLayout.CARD, MenuLayout.GRID]",
  "[MenuMood.FAST]: [MenuLayout.LIST]",
  "export function normalizeMenuMood(value: unknown): MenuMood",
  "Object.prototype.hasOwnProperty.call(MENU_MOODS, normalizedValue)",
  "export function normalizeMenuLayout(value: unknown, mood: MenuMood): MenuLayout",
  "Object.prototype.hasOwnProperty.call(MENU_LAYOUTS, normalizedValue)",
  "return getDefaultLayout(mood);",
  "const hasLegacyTabsLayout = typeof rawConfig.layout === 'string'",
  "const safeAccent = enforceContrast(",
  "const safePriceColor = enforceContrast(",
].forEach((token) => requireToken(designSystem, token, 'B2C design system'));
[
  "showItemPrices: typeof rawConfig.showItemPrices === 'boolean' ? rawConfig.showItemPrices : true",
  "showImages: typeof rawConfig.showImages === 'boolean' ? rawConfig.showImages : true",
  "showCategoryIcons: typeof rawConfig.showCategoryIcons === 'boolean' ? rawConfig.showCategoryIcons : true",
  "showCategoryTabs: typeof rawConfig.showCategoryTabs === 'boolean' ? rawConfig.showCategoryTabs : hasLegacyTabsLayout",
].forEach((token) => requireToken(designSystem, token, 'B2C design boolean normalization'));
forbidToken(designSystem, 'showCategoryTabs: rawConfig.showCategoryTabs ?? hasLegacyTabsLayout', 'B2C design loose boolean normalization');
requireOrder(
  designSystem,
  [
    "const compatibleLayouts = getCompatibleLayouts(mood);",
    "if (typeof value === 'string')",
    "Object.prototype.hasOwnProperty.call(MENU_LAYOUTS, normalizedValue)",
    "return getDefaultLayout(mood);",
  ],
  'B2C layout normalization order',
);

[
  "export const OWNER_SELECTABLE_MENU_LAYOUTS: MenuLayout[] = [",
  "MenuLayout.LIST,",
  "MenuLayout.GRID,",
  "MenuLayout.CARD,",
  "export const getOwnerSelectableMenuLayouts = (mood?: MenuMood): MenuLayout[] =>",
  "return OWNER_SELECTABLE_MENU_LAYOUTS.filter((layout) => compatibleLayouts.includes(layout));",
  "export const getPreferredMenuLayoutForMood = (mood: MenuMood): MenuLayout =>",
  "export const getMenuDesignPresetPatch = (preset: MenuDesignPreset) => ({",
].forEach((token) => requireToken(designPresets, token, 'B2C design preset helpers'));
forbidToken(designPresets, "MenuLayout.TABS,", 'Owner selectable design preset helpers');

[
  "interface MenuStylePresetPreviewProps",
  "preset: MenuDesignPreset;",
  "const mood = MENU_MOODS[preset.mood];",
  "const isGrid = preset.layout === MenuLayout.GRID;",
  "preset.showCategoryTabs",
  "preset.showImages",
  "preset.showCategoryIcons",
  "preset.showItemPrices",
].forEach((token) => requireToken(stylePresetPreview, token, 'B2C visual style preset preview'));

[
  'export function getActivePublicItemPriceAttributes',
  'attribute as ActivePublicItemPriceAttribute).active !== false',
  'export function getPublicItemListPriceLabel',
  'const minPrice = Math.min(...numericPrices);',
  'const maxPrice = Math.max(...numericPrices);',
].forEach((token) => requireToken(publicPricePresentation, token, 'Public item price presentation'));
[
  'export function normalizePublicMenuBackground',
  'options: { allowDataPreview?: boolean } = {}',
  "parsed.protocol !== 'https:'",
  'parsed.username || parsed.password',
].forEach((token) => requireToken(publicMenuBackground, token, 'Public menu background boundary'));

[
  "const menuDesign = resolveMenuDesignConfig(projectData?.config?.design?.menu);",
  "const recommendedPresets = getRecommendedMenuDesignPresets({ businessType, businessCategory });",
  "layout: getPreferredMenuLayoutForMood(mood),",
  "if (!getOwnerSelectableMenuLayouts(currentMood).includes(layout)) return;",
  "const patch = getMenuDesignPresetPatch(preset);",
  "import MenuStylePresetPreview from '@/components/shared/menuDesign/MenuStylePresetPreview';",
  "<MenuStylePresetPreview compact preset={preset} selected={isSelected} />",
  "const SERVICE_CHARGE_MAX_LENGTH = 140;",
  "const normalizedNote = note.slice(0, SERVICE_CHARGE_MAX_LENGTH);",
  "maxLength={SERVICE_CHARGE_MAX_LENGTH}",
].forEach((token) => requireToken(desktopSettings, token, 'Desktop B2C design controls'));
forbidToken(desktopSettings, 'note.slice(0, SERVICE_CHARGE_MAX_LENGTH).trim()', 'Desktop B2C controlled pricing-note spacing');

[
  "const menuDesign = resolveMenuDesignConfig(draftProjectData?.config?.design?.menu);",
  "const compatibleLayouts = useMemo(() => getOwnerSelectableMenuLayouts(menuMood), [menuMood]);",
  "copy.config.design.menu.layout = getPreferredMenuLayoutForMood(mood);",
  "if (!compatibleLayouts.includes(layout)) return;",
  "normalizedDraft.config.design.menu = resolveMenuDesignConfig(normalizedDraft.config.design.menu);",
  "const updated = await publishProject(normalizedDraft, {",
  "expectedModifiedOn: normalizedDraft.modifiedOn,",
  "assertProjectUpdateSucceeded(",
  "void verifyMenuPublish({",
  "mobile_design_publish_verification_failed",
  "import MenuStylePresetPreview from '@/components/shared/menuDesign/MenuStylePresetPreview';",
  "<MenuStylePresetPreview compact preset={preset} selected={isSelected} />",
  "onEmbeddedProjectDataChange?.(cloneProjectData(project))",
].forEach((token) => requireToken(mobileDesign, token, 'Mobile B2C design controls'));
requireToken(mobileDesign, 'const normalized = note.slice(0, SERVICE_CHARGE_MAX_LENGTH);', 'Mobile B2C controlled pricing-note length');
forbidToken(mobileDesign, 'note.slice(0, SERVICE_CHARGE_MAX_LENGTH).trim()', 'Mobile B2C controlled pricing-note spacing');
[
  "selectedRecommendedPreset.mood",
  "selectedRecommendedPreset.layout",
  "selectedRecommendedPreset.accentColor",
  "selectedRecommendedPreset.showItemPrices",
  "selectedRecommendedPreset.showImages",
  "selectedRecommendedPreset.showCategoryIcons",
  "selectedRecommendedPreset.showCategoryTabs",
].forEach((token) => forbidToken(mobileDesign, token, 'Mobile recommended style low-stress sheet boundary'));

[
  "const resolvedMood = normalizeMenuMood(mood);",
  "const resolvedLayout = normalizeMenuLayout(layout, resolvedMood);",
  "const moodConfig = getMoodWithBrandColor(resolvedMood, brandAccentColor);",
  "const layoutConfig = MENU_LAYOUTS[resolvedLayout];",
  "const shouldShowItemImages = showImages && layoutAllowsImages;",
  "const showTabsBar = !isDesktop && showCategoryTabs;",
  "const enableScrollSpy = isDesktop || isTablet || showCategoryTabs;",
  "const reserveItemImageSlot = shouldShowItemImages && !!itemImageUrl && itemIndex < layoutConfig.maxImagesPerCategory;",
  "data-image-fallback={item.id}",
  "fallback.style.opacity = '0.28'",
  "formatMenuPrice(attribute.price as string | number, currencySymbol, { fractionDigits: 2 })",
  "parseSingleMenuPrice(item.price) ?? undefined",
  "aria-label={isAvailable ? itemName : `${itemName}, ${unavailableLabel}`}",
].forEach((token) => requireToken(publicMenu, token, 'Public B2C menu output'));
[
  'const activePriceAttributes = getActivePublicItemPriceAttributes(item);',
  'const itemListPriceLabel = getPublicItemListPriceLabel(item, currencySymbol);',
  '{showItemPrices && itemListPriceLabel && (',
  "aria-label={t('menu.availableOptionPrices')}",
  'activePriceAttributes.map((attribute, attributeIndex)',
  'normalizePublicMenuBackground(backgroundImage, {',
  'allowDataPreview: previewMode,',
  "backgroundAttachment: 'scroll'",
].forEach((token) => requireToken(publicMenu, token, 'Public B2C upfront option prices'));
forbidToken(publicMenu, "backgroundAttachment: previewMode ? 'scroll' : 'fixed'", 'Public B2C fixed background effect');
forbidToken(publicMenu, 'showItemPrices && !item.attributes?.length', 'Public B2C modal-only variant pricing');
forbidToken(publicMenu, 'height: items.length * 88', 'Public B2C unstable large-menu placeholder');
forbidToken(publicMenu, 'visibleCategoryIds', 'Public B2C category deep-link placeholder state');
forbidToken(publicMenu, 'opacity: 0.88', 'Public B2C price contrast reduction');
[
  'const activePriceAttributes = useMemo(',
  'getActivePublicItemPriceAttributes(item)',
  'getPublicItemListPriceLabel(item, currencySymbol)',
  'activePriceAttributes.map((attr: any, idx: number)',
  'price: showItemPrices && activePriceAttributes.length === 0',
].forEach((token) => requireToken(pdpModal, token, 'Public PDP active option price boundary'));
forbidToken(pdpModal, 'item.attributes.map((attr: any, idx: number)', 'Public PDP inactive/unpriced attributes');
forbidToken(pdpModal, "background: '#ef444420'", 'Public PDP low-contrast unavailable/spice badge');
forbidToken(pdpModal, "color: '#d97706'", 'Public PDP low-contrast allergen badge');
requireToken(pdpModal, "color: moodConfig.headingColor", 'Public PDP readable mood tag text');

[
  "import { normalizePublicMenuBackground } from '@lib/menu/publicMenuBackground';",
  'const safeBackgroundImage = normalizePublicMenuBackground(backgroundImage);',
  '`url("${safeBackgroundImage}") center/cover no-repeat scroll`',
].forEach((token) => requireToken(exportedMenuOutput, token, 'Exported B2C menu output background boundary'));
forbidToken(exportedMenuOutput, 'no-repeat fixed', 'Exported B2C menu output fixed background effect');

[
  "projectCopy.config.design.menu = resolveMenuDesignConfig(projectCopy.config.design.menu);",
  "const updatedProject: Project = await publishProject(projectCopy, {",
  "expectedModifiedOn: (projectCopy as Project & { modifiedOn?: unknown }).modifiedOn,",
  "assertProjectUpdateSucceeded(",
  "void verifyMenuPublish({",
  "projects_b2c_publish_verification_failed",
].forEach((token) => requireToken(b2cContainer, token, 'Desktop B2C publish flow'));

[
  "await revalidatePublicClientCacheForProject(data.projectId as string, \"updateProject\");",
  "publish: true,",
  "linked_outlet_publish_response_invalid",
].forEach((token) => requireToken(projectDatabase, token, 'Project design publish/cache path'));
requireToken(
  projectDatabase,
  "const operationProjectId = normalizeMenuChangeLogIdentifier(data.projectId, 'projectId');",
  'Project design publish canonical project identity',
);
requireOccurrenceAtLeast(
  projectDatabase,
  'await revalidatePublicClientCacheForProject(operationProjectId, "publishProject");',
  2,
  'Project design linked and standalone publish cache invalidation',
);
requireOccurrenceAtLeast(
  projectDatabase,
  'await recordPublishedMenuTruth(',
  2,
  'Project design linked and standalone publish truth recording',
);
requireToken(projectDatabase, 'publishedTruthProject,', 'Project design linked resolved publish truth');
requireToken(projectDatabase, 'publishedProject,', 'Project design standalone publish truth');
[
  'let hasOperationalChange = false;',
  'project_operational_change_detection_failed',
  '(FEATURE_FLAGS.ENABLE_MASTER_UPDATE_AWARENESS || FEATURE_FLAGS.ENABLE_MENU_OBSERVATION)',
  '&& hasOperationalChange',
].forEach((token) => requireToken(projectDatabase, token, 'Project design operational-write cost gate'));

function verifyRuntimeDesignBoundary() {
  const {
    MenuLayout,
    MenuMood,
    MOOD_LAYOUT_COMPATIBILITY,
    MENU_MOODS,
    getMoodWithBrandColor,
    resolveMenuDesignConfig,
  } = require(path.join(root, 'src/components/templates/main-app/projects/b2cView/designSystem/index.ts'));
  const {
    MENU_DESIGN_PRESETS,
    getPreferredMenuLayoutForMood,
  } = require(path.join(root, 'src/lib/menu/menuDesignPresets.ts'));
  const { getContrastRatio } = require(path.join(root, 'src/lib/colorEnforcement.ts'));
  const {
    getActivePublicItemPriceAttributes,
    getPublicItemListPriceLabel,
  } = require(path.join(root, 'src/lib/pricing/publicItemPricePresentation.ts'));
  const { normalizePublicMenuBackground } = require(path.join(root, 'src/lib/menu/publicMenuBackground.ts'));
  const { detectOperationalChange } = require(path.join(root, 'src/lib/multiOutlet/masterUpdateDiff.ts'));

  const expectedCompatibility = {
    [MenuMood.CLEAN]: [MenuLayout.LIST, MenuLayout.GRID],
    [MenuMood.WARM]: [MenuLayout.LIST, MenuLayout.CARD, MenuLayout.GRID],
    [MenuMood.PREMIUM]: [MenuLayout.LIST, MenuLayout.CARD],
    [MenuMood.BOLD]: [MenuLayout.CARD, MenuLayout.GRID],
    [MenuMood.FAST]: [MenuLayout.LIST],
  };

  const operationalProject = {
    files: [{
      extractedData: {
        data: {
          categories: [{ id: 'c1', active: true }],
          items: [{ id: 'i1', active: true, available: true, attributes: [], category: 'c1', price: '100' }],
        },
      },
    }],
  };
  if (detectOperationalChange(operationalProject, { config: { design: { menu: { layout: 'grid' } } } })) {
    failures.push('Design-only project updates must not be classified as operational writes');
  }
  const changedOperationalProject = JSON.parse(JSON.stringify(operationalProject));
  changedOperationalProject.files[0].extractedData.data.items[0].price = '120';
  if (!detectOperationalChange(operationalProject, { files: changedOperationalProject.files })) {
    failures.push('Price changes must remain classified as operational writes');
  }
  for (const mood of Object.values(MenuMood)) {
    if (JSON.stringify(MOOD_LAYOUT_COMPATIBILITY[mood]) !== JSON.stringify(expectedCompatibility[mood])) {
      failures.push(`Runtime compatibility mismatch for ${mood}`);
    }
    if (!MOOD_LAYOUT_COMPATIBILITY[mood].includes(getPreferredMenuLayoutForMood(mood))) {
      failures.push(`Preferred layout is incompatible for ${mood}`);
    }
    for (const colorKey of ['accentColor', 'priceColor']) {
      const ratio = getContrastRatio(MENU_MOODS[mood][colorKey], MENU_MOODS[mood].background);
      if (ratio < 4.5) failures.push(`${mood} ${colorKey} contrast is ${ratio.toFixed(2)}:1`);
    }
    const whiteOverride = getMoodWithBrandColor(mood, '#ffffff');
    if (getContrastRatio(whiteOverride.accentColor, whiteOverride.background) < 4.5) {
      failures.push(`${mood} brand accent fallback is not WCAG AA`);
    }
  }
  for (const preset of MENU_DESIGN_PRESETS) {
    if (!MOOD_LAYOUT_COMPATIBILITY[preset.mood].includes(preset.layout)) {
      failures.push(`Preset ${preset.key} uses an incompatible mood/layout pair`);
    }
  }

  const malformedConfig = resolveMenuDesignConfig({
    layout: 'card',
    mood: 'fast',
    showCategoryIcons: 'false',
    showCategoryTabs: 1,
    showImages: null,
    showItemPrices: 'false',
  });
  if (
    malformedConfig.layout !== MenuLayout.LIST
    || malformedConfig.showCategoryIcons !== true
    || malformedConfig.showCategoryTabs !== false
    || malformedConfig.showImages !== true
    || malformedConfig.showItemPrices !== true
  ) {
    failures.push('Malformed design booleans/layout must normalize to safe defaults');
  }
  const prototypeMood = resolveMenuDesignConfig({ mood: 'toString', layout: 'grid' });
  if (prototypeMood.mood !== MenuMood.CLEAN || prototypeMood.layout !== MenuLayout.GRID) {
    failures.push('Prototype-chain mood names must normalize to safe owned values');
  }
  const legacyTabs = resolveMenuDesignConfig({ layout: 'tabs', mood: 'warm' });
  if (legacyTabs.layout !== MenuLayout.LIST || legacyTabs.showCategoryTabs !== true) {
    failures.push('Legacy tabs must preserve navigation intent while normalizing structural layout');
  }

  const priceItem = {
    price: 999,
    attributes: [
      { id: 'small', active: true, price: 100 },
      { id: 'large', price: 200 },
      { id: 'retired', active: false, price: 1 },
      { id: 'missing' },
    ],
  };
  if (getActivePublicItemPriceAttributes(priceItem).length !== 2) {
    failures.push('Public option prices must exclude inactive and unpriced attributes');
  }
  if (getPublicItemListPriceLabel(priceItem, '₹') !== '₹100.00–₹200.00') {
    failures.push('Public numeric option price summary must expose the active range');
  }
  if (getActivePublicItemPriceAttributes({ attributes: [{ price: Number.NaN }] }).length !== 0) {
    failures.push('Public option prices must exclude non-finite numeric values');
  }
  if (normalizePublicMenuBackground('https://cdn.example.com/menu.webp') !== 'https://cdn.example.com/menu.webp') {
    failures.push('Public HTTPS menu background must remain usable');
  }
  if (normalizePublicMenuBackground('http://cdn.example.com/menu.webp') !== null) {
    failures.push('Public HTTP menu background must fail closed');
  }
  if (normalizePublicMenuBackground('javascript:alert(1)') !== null) {
    failures.push('Executable menu background scheme must fail closed');
  }
  if (normalizePublicMenuBackground('data:image/png;base64,AAAA') !== null) {
    failures.push('Persisted public menu data backgrounds must fail closed');
  }
  if (normalizePublicMenuBackground('data:image/png;base64,AAAA', { allowDataPreview: true }) === null) {
    failures.push('Owner preview menu data background must remain usable before upload');
  }
}

verifyRuntimeDesignBoundary();

[
  "export const verifyMenuPublish = async (payload:",
  "if (!FEATURE_FLAGS.ENABLE_MENU_HEALTH_MONITOR) return null;",
  "logVerifyMenuPublishFailure(error, payload);",
  "return null;",
].forEach((token) => requireToken(firebaseFunctions, token, 'Menu publish verification callable boundary'));

const docs = [
  ['B2C README', readme],
  ['B2C spec', spec],
  ['B2C implementation', impl],
  ['B2C Firebase', firebaseDoc],
  ['B2C mobile support', mobileDoc],
  ['B2C helpdoc', helpDoc],
  ['B2C website', websiteDoc],
  ['B2C marketing', marketingDoc],
  ['B2C constitution implementation note', constitutionNote],
];

for (const [label, content] of docs) {
  requireToken(content, 'not current launch certification', `${label} launch boundary`);
  requireToken(content, 'External Certification Runbook', `${label} external certification boundary`);
  requireToken(content, 'Digital Menu Output Constitution', `${label} constitution boundary`);
  requireToken(content, '`npm run verify:menu-design-presentation-boundary`', `${label} focused source gate`);
  requireToken(content, 'browser/mobile customer-menu QA', `${label} browser/mobile QA boundary`);
  forbidToken(content, 'custom colors, fonts', `${label} stale free-form font claim`);
  forbidToken(content, 'choose colors, fonts', `${label} stale free-form font claim`);
  forbidToken(content, 'Vertical', `${label} stale vertical layout copy`);
  forbidToken(content, 'Horizontal', `${label} stale horizontal layout copy`);
  forbidToken(content, 'Tabs (sticky category navigation)', `${label} stale owner-selectable tabs layout copy`);
  forbidToken(content, 'AI-powered design', `${label} forbidden public wording`);
  forbidToken(content, 'Smart theming', `${label} forbidden public wording`);
  forbidToken(content, 'Dynamic layouts', `${label} forbidden public wording`);
}

[
  ['B2C README', readme],
  ['B2C implementation', impl],
  ['B2C mobile support', mobileDoc],
  ['B2C helpdoc', helpDoc],
].forEach(([label, content]) => requireToken(content, 'visual preset preview', `${label} visual preset preview boundary`));
requireToken(mobileDoc, 'avoids technical mood/color/toggle breakdowns', 'B2C mobile low-stress recommended style boundary');

[
  'Performance, device-coverage, QR adoption, indexing, sharing, and customer-behavior claims need release-specific evidence',
  'supported browser',
  'Preview before publish',
  'Performance claims follow QA evidence',
  'Do not use testimonials, QR adoption stats, load-time stats, or customer-behavior claims without approved evidence.',
  'Requires target-run evidence',
].forEach((token) => requireToken(marketingDoc, token, 'B2C marketing performance/device boundary'));

[
  'Customers scan a QR code and see your full menu instantly',
  'loads fast, looks professional, and works on every phone',
  'Instant loading',
  'Under 2 seconds on mobile',
  'customers can access instantly',
  '| Load time         | 5-10 seconds | < 2 seconds',
  '| Updates           | Re-upload    | Instant',
  'Beautiful menus, instant access',
  'Menu loads instantly',
  'First paint: < 1.8 seconds',
  'Full load: < 2.5 seconds',
  'Works offline (cached)',
  'Google-discoverable',
  'Loads in under 2 seconds',
  'Customers love it. No more zooming on PDFs.',
  'QR adoption has skyrocketed',
  'Most people are comfortable scanning now',
  'Demo Script (90 seconds)',
  'Watch... 1 second, 2 seconds',
  'sharing is one click',
  'Scan → Menu',
  'Speed comparison',
  '| First Contentful Paint | < 1.8 seconds',
  '| Full load time         | < 2.5 seconds',
  '| Mobile users           | 70%+',
  '| QR code adoption       | 94% of US consumers',
].forEach((token) => forbidToken(marketingDoc, token, 'B2C marketing stale performance/device claim'));

[
  ['inventory', inventory, 'design_presentation'],
  ['inventory', inventory, 'menu-design-presentation boundary source gate passed'],
  ['report', report, '## Menu Design Presentation Boundary'],
  ['report', report, '`npm run verify:menu-design-presentation-boundary`'],
  ['audit', audit, 'Menu Design Presentation boundary checkpoint'],
  ['audit', audit, '`npm run verify:menu-design-presentation-boundary`'],
  ['changelog', changelog, 'Menu Design Presentation Boundary'],
  ['changelog', changelog, '`npm run verify:menu-design-presentation-boundary`'],
  ['audit', audit, 'B2C View marketing performance/device-coverage copy checkpoint'],
  ['changelog', changelog, 'B2C View Marketing Performance Device-Coverage Copy Boundary'],
].forEach(([label, source, token]) => requireToken(source, token, `B2C design ledger ${label}`));

if (failures.length > 0) {
  console.error('FAIL verify-menu-design-presentation-boundary');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('PASS verify-menu-design-presentation-boundary');
console.log('Validated B2C menu design controls, compatibility guards, public output, publish/cache path, mobile parity, and docs boundary.');
