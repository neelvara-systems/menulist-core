#!/usr/bin/env node

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

function forbidToken(source, token, label) {
  if (source.includes(token)) {
    failures.push(`${label} must not include token: ${token}`);
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
const desktopSettings = read('src/components/templates/main-app/projects/b2cView/menuPage/menuPageSettingsNew.tsx');
const mobileDesign = read('src/components/mobile/screens/MobileDesignEditorScreen.tsx');
const publicMenu = read('src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx');
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
const changelog = read('__docs__/CHANGELOG.md');

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
  "export function normalizeMenuMood(value: unknown): MenuMood",
  "export function normalizeMenuLayout(value: unknown, mood: MenuMood): MenuLayout",
  "if (normalizedValue in MENU_LAYOUTS && compatibleLayouts.includes(normalizedValue))",
  "return getDefaultLayout(mood);",
  "const hasLegacyTabsLayout = typeof menuConfig?.layout === 'string'",
  "showCategoryTabs: rawConfig.showCategoryTabs ?? hasLegacyTabsLayout",
  "const safeAccent = enforceContrast(",
  "const safePriceColor = enforceContrast(",
].forEach((token) => requireToken(designSystem, token, 'B2C design system'));
requireOrder(
  designSystem,
  [
    "const compatibleLayouts = getCompatibleLayouts(mood);",
    "if (typeof value === 'string')",
    "if (normalizedValue in MENU_LAYOUTS && compatibleLayouts.includes(normalizedValue))",
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
  "const menuDesign = resolveMenuDesignConfig(projectData?.config?.design?.menu);",
  "const recommendedPresets = getRecommendedMenuDesignPresets({ businessType, businessCategory });",
  "layout: getPreferredMenuLayoutForMood(mood),",
  "if (!getOwnerSelectableMenuLayouts(currentMood).includes(layout)) return;",
  "const patch = getMenuDesignPresetPatch(preset);",
  "const SERVICE_CHARGE_MAX_LENGTH = 140;",
  "const normalizedNote = note.slice(0, SERVICE_CHARGE_MAX_LENGTH).trim();",
  "maxLength={SERVICE_CHARGE_MAX_LENGTH}",
].forEach((token) => requireToken(desktopSettings, token, 'Desktop B2C design controls'));

[
  "const menuDesign = resolveMenuDesignConfig(draftProjectData?.config?.design?.menu);",
  "const compatibleLayouts = useMemo(() => getOwnerSelectableMenuLayouts(menuMood), [menuMood]);",
  "copy.config.design.menu.layout = getPreferredMenuLayoutForMood(mood);",
  "if (!compatibleLayouts.includes(layout)) return;",
  "normalizedDraft.config.design.menu = resolveMenuDesignConfig(normalizedDraft.config.design.menu);",
  "const updated = await publishProject(normalizedDraft);",
  "assertProjectUpdateSucceeded(",
  "void verifyMenuPublish({",
  "onEmbeddedProjectDataChange?.(cloneProjectData(project))",
].forEach((token) => requireToken(mobileDesign, token, 'Mobile B2C design controls'));

[
  "const resolvedMood = normalizeMenuMood(mood);",
  "const resolvedLayout = normalizeMenuLayout(layout, resolvedMood);",
  "const moodConfig = getMoodWithBrandColor(resolvedMood, brandAccentColor);",
  "const layoutConfig = MENU_LAYOUTS[resolvedLayout];",
  "const shouldShowItemImages = showImages && layoutAllowsImages;",
  "const showTabsBar = !isDesktop && showCategoryTabs;",
  "const enableScrollSpy = isDesktop || isTablet || showCategoryTabs;",
  "const reserveItemImageSlot = shouldShowItemImages && !!itemImageUrl && itemIndex < layoutConfig.maxImagesPerCategory;",
  "{showItemPrices && !item.attributes?.length && hasDisplayPrice(item.price) && (",
  "formatMenuPrice(item.price, currencySymbol, { fractionDigits: 2 })",
].forEach((token) => requireToken(publicMenu, token, 'Public B2C menu output'));

[
  "projectCopy.config.design.menu = resolveMenuDesignConfig(projectCopy.config.design.menu);",
  "const updatedProject: Project = await publishProject(projectCopy);",
  "assertProjectUpdateSucceeded(",
  "verifyMenuPublish({",
].forEach((token) => requireToken(b2cContainer, token, 'Desktop B2C publish flow'));

[
  "await revalidatePublicClientCacheForProject(data.projectId, \"publishProject\");",
  "await revalidatePublicClientCacheForProject(data.projectId as string, \"updateProject\");",
  "publish: true,",
  "linked_outlet_publish_response_invalid",
].forEach((token) => requireToken(projectDatabase, token, 'Project design publish/cache path'));

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
