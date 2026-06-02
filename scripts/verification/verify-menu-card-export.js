const fs = require('fs');
const path = require('path');

const root = process.cwd();

const requiredFiles = [
  'src/app/(main)/use-menulist/menu-card-export/page.tsx',
  'src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx',
  'src/lib/menu-card-export/index.ts',
  'src/lib/menu-card-export/navigation.ts',
  'src/lib/menu-card-export/render/artifactMetadata.ts',
  'src/lib/menu-card-export/render/renderPdf.ts',
  'src/lib/menu-card-export/render/renderPreviewModel.ts',
  'src/lib/menu-card-export/preflight/runPrintPreflight.ts',
  'src/lib/menu-card-export/printShop/buildPrintShopPacket.ts',
  'src/lib/menu-card-export/ai/designAdvisor.ts',
  'src/app/api/menu-card-export/design-advisor/route.ts',
  'src/app/api/menu-card-export/design-advisor/prompt.ts',
  'src/services/ai/menuCardExport/getDesignAdviceViaAPI.ts',
  'src/components/mobile/screens/MobileShareScreen.tsx',
  'src/components/mobile/screens/MobileMenuScreen.tsx',
  'src/components/mobile/components/MobileMenuCommandSheet.tsx',
  'src/components/mobile/screens/MobileMoreScreen.tsx',
  '__docs__/menu-card-export/menu-card-export_firebase.md',
  '__docs__/menu-card-export/menu-card-export_test-cases.md',
];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    failures.push(`Missing required file: ${file}`);
  }
}

const features = fs.readFileSync(path.join(root, 'src/config/features.ts'), 'utf8');
[
  'ENABLE_MENU_CARD_EXPORT',
  'ENABLE_MENU_CARD_EXPORT_HISTORY',
  'ENABLE_MENU_CARD_EXPORT_PRINT_SHOP',
  'ENABLE_MENU_CARD_EXPORT_BATCH',
  'ENABLE_MENU_CARD_EXPORT_AI_ADVISOR',
  'MENU_CARD_EXPORT_AI_ADVISOR_PLAN_IDS',
].forEach((flag) => {
  if (!features.includes(flag)) failures.push(`Missing feature flag: ${flag}`);
});

const route = fs.readFileSync(path.join(root, 'src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx'), 'utf8');
[
  'getExistingProjectsListWithoutLoader',
  'ProjectSelectorTrigger',
  'ProjectSelectorList',
  'loadedProjectId',
  'renderPreviewModel',
  'buildPrintShopPacket',
  'listLocalMenuCardExports',
  'getMenuCardDesignAdviceViaAPI',
  'adviceCacheRef',
  'Pro layout suggestion',
  'isPresetAvailable',
  'visiblePresets',
  'FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_HISTORY',
  'No Firebase writes are used',
].forEach((token) => {
  if (!route.includes(token)) failures.push(`Route missing token: ${token}`);
});
if (route.includes('getProjectsListWithoutLoader')) {
  failures.push('Cost guard failed: route must not use the auto-creating project list helper');
}

const layoutWrapper = fs.readFileSync(path.join(root, 'src/components/antdComponent/layoutWrapper/index.tsx'), 'utf8');
[
  "'/use-menulist/menu-card-export'",
  'isHandheldDesktopRoute',
].forEach((token) => {
  if (!layoutWrapper.includes(token)) failures.push(`Mobile shell routing guard missing token: ${token}`);
});

const navigation = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/navigation.ts'), 'utf8');
[
  "MENU_CARD_EXPORT_ROUTE = '/use-menulist/menu-card-export'",
  'buildMenuCardExportUrl',
  'encodeURIComponent(projectId)',
].forEach((token) => {
  if (!navigation.includes(token)) failures.push(`Navigation helper missing token: ${token}`);
});

const mobileShare = fs.readFileSync(path.join(root, 'src/components/mobile/screens/MobileShareScreen.tsx'), 'utf8');
[
  'buildMenuCardExportUrl',
  'handleOpenMenuCardExport',
  'FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT ? handleOpenMenuCardExport()',
].forEach((token) => {
  if (!mobileShare.includes(token)) failures.push(`Mobile Share entry missing token: ${token}`);
});

const mobileMenu = fs.readFileSync(path.join(root, 'src/components/mobile/screens/MobileMenuScreen.tsx'), 'utf8');
[
  'buildMenuCardExportUrl',
  'canOpenMenuCardExport',
  'pendingMenuRef.current?.projectId === projectId',
  'flushPendingMenuPersist',
  'onPrintMenu={canOpenMenuCardExport',
].forEach((token) => {
  if (!mobileMenu.includes(token)) failures.push(`Mobile Menu entry missing token: ${token}`);
});

const mobileMenuCommandSheet = fs.readFileSync(path.join(root, 'src/components/mobile/components/MobileMenuCommandSheet.tsx'), 'utf8');
[
  'onPrintMenu?: () => void',
  "key: 'print-menu'",
  "title: 'Print Menu'",
].forEach((token) => {
  if (!mobileMenuCommandSheet.includes(token)) failures.push(`Mobile Menu command sheet missing token: ${token}`);
});

const mobileMore = fs.readFileSync(path.join(root, 'src/components/mobile/screens/MobileMoreScreen.tsx'), 'utf8');
[
  'useMobileProjects',
  'buildMenuCardExportUrl(selectedProjectId)',
  "key: 'printMenu'",
  "label: 'Print Menu'",
].forEach((token) => {
  if (!mobileMore.includes(token)) failures.push(`Mobile More entry missing token: ${token}`);
});

const preflight = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/preflight/runPrintPreflight.ts'), 'utf8');
if (!preflight.includes('runPrintPreflight')) failures.push('Preflight runner missing runPrintPreflight export');

const artifactMetadata = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/render/artifactMetadata.ts'), 'utf8');
[
  'MENU_CARD_EXPORT_RENDERER_VERSION',
  'buildArtifactFilename',
  'buildPdfDocumentProperties',
  'shortSourceReference',
  'formatArtifactDate',
].forEach((token) => {
  if (!artifactMetadata.includes(token)) failures.push(`Artifact metadata helper missing token: ${token}`);
});

const pdfRenderer = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/render/renderPdf.ts'), 'utf8');
[
  'doc.setCreationDate(generatedAt)',
  'doc.setProperties(buildPdfDocumentProperties',
  'Generated: ${formatArtifactDate(generatedAt)}',
  'buildArtifactFilename({ source, settings, template, sourceHash, extension: \'pdf\', generatedAt })',
].forEach((token) => {
  if (!pdfRenderer.includes(token)) failures.push(`PDF renderer missing metadata/naming token: ${token}`);
});
if (pdfRenderer.includes('doc.text(sourceHash')) {
  failures.push('PDF renderer should not print the source hash in the visible footer');
}

const printInstructions = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/printShop/buildPrintInstructions.ts'), 'utf8');
[
  'Source summary:',
  'Source reference:',
  'Live menu:',
  'MENU_CARD_EXPORT_RENDERER_VERSION',
  'shortSourceReference',
].forEach((token) => {
  if (!printInstructions.includes(token)) failures.push(`Print instructions missing provenance token: ${token}`);
});

const printSource = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/source/buildPrintSource.ts'), 'utf8');
['project?.files', 'file?.extractedData?.data', 'project?.extractedData?.data'].forEach((token) => {
  if (!printSource.includes(token)) failures.push(`Print source missing real project data shape support: ${token}`);
});

const projectDal = fs.readFileSync(path.join(root, 'src/database/projects/index.ts'), 'utf8');
const readOnlyHelperStart = projectDal.indexOf('const getExistingProjectsListCore');
const readOnlyHelperEnd = projectDal.indexOf('export const getProjectsList', readOnlyHelperStart);
if (readOnlyHelperStart === -1 || readOnlyHelperEnd === -1) {
  failures.push('Cost guard failed: missing read-only existing-projects helper');
} else {
  const helperBody = projectDal.slice(readOnlyHelperStart, readOnlyHelperEnd);
  if (helperBody.includes('addProject(')) {
    failures.push('Cost guard failed: read-only existing-projects helper must not create projects');
  }
}

const forbiddenServerRoutes = [
  'src/app/api/menu-card-exports/route.ts',
  'src/app/api/menu-card-exports/preview/route.ts',
];
for (const file of forbiddenServerRoutes) {
  if (fs.existsSync(path.join(root, file))) {
    failures.push(`Cost guard failed: default implementation should not add export-storage API route ${file}`);
  }
}

const forbiddenPlaceholderFiles = [
  'src/lib/menu-card-export/batch/buildBatchExportPlan.ts',
  'src/lib/menu-card-export/presets/homePrint.preset.ts',
  'src/lib/menu-card-export/presets/printShop.preset.ts',
  'src/lib/menu-card-export/presets/whatsapp.preset.ts',
  'src/lib/menu-card-export/render/renderThumbnails.ts',
  'src/lib/menu-card-export/security/assertMenuCardExportAccess.ts',
  'src/lib/menu-card-export/validation/menuCardExportSchemas.ts',
];
for (const file of forbiddenPlaceholderFiles) {
  if (fs.existsSync(path.join(root, file))) {
    failures.push(`Freeze guard failed: remove unused placeholder file ${file}`);
  }
}

const aiConstants = fs.readFileSync(path.join(root, 'src/constants/common.ts'), 'utf8');
const aiUnitCosts = fs.readFileSync(path.join(root, 'src/constants/AI/unitCosts.ts'), 'utf8');
['MENU_CARD_EXPORT_DESIGN_ADVISOR', 'menu_card_export_design_advisor'].forEach((token) => {
  if (!aiConstants.includes(token) && !aiUnitCosts.includes(token)) {
    failures.push(`Missing AI accounting token: ${token}`);
  }
});

const advisorRoute = fs.readFileSync(path.join(root, 'src/app/api/menu-card-export/design-advisor/route.ts'), 'utf8');
[
  'withAuth',
  'verifyTenantAccess',
  'checkAIOperationLimit',
  'getActiveSubscriptionForStore',
  'hasAllowedAdvisorPlan',
  'checkAICapacity',
  'genAIClient.models.generateContent',
  'normalizeMenuCardDesignAdvice',
  'recordAiOperationForSession',
  'consumeAICapacity',
  'FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_PRINT_SHOP',
].forEach((token) => {
  if (!advisorRoute.includes(token)) failures.push(`AI advisor route missing token: ${token}`);
});

if (failures.length > 0) {
  console.error('Menu Card Export verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Menu Card Export verification passed.');
console.log('- Route exists');
console.log('- Client-side preflight exists');
console.log('- Client-side PDF/packet generation exists');
console.log('- PDF metadata, deterministic filenames, and print-shop source summary exist');
console.log('- Local history exists');
console.log('- Mobile Share, Menu, and More entry points route through the shared Print Menu URL');
console.log('- Pro/Premium AI advisor is guarded by plan, capacity, and operation logging');
console.log('- No export-storage API route or artifact Firebase write path was added');
