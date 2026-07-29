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
const firestoreRules = read('firestore.rules');
const pricingPlansDal = read('src/database/pricingPlans/index.ts');
const pricingPlansUi = read('src/components/templates/platform/pricingPlans/index.tsx');
const staticPlatformPlans = read('src/data/PlatformPlansList.ts');
const projectsDatabase = read('src/database/projects/index.ts');
const publicClientCache = read('src/lib/cache/publicClientCache.ts');
const screenInvalidation = read('src/lib/screen/serverScreenInvalidation.ts');
const revalidateMenuRoute = read('src/app/api/revalidate/menu/route.ts');
const pricingEngine = read('src/lib/pricing/integrityEngine.ts');
const pricingPdfQueue = read('src/lib/pricing/pdfQueue.ts');
const pricingIndex = read('src/lib/pricing/index.ts');
const pricingFormatter = read('src/lib/pricing/formatMenuPrice.ts');
const pricingSchema = read('src/lib/validation/pricing.schema.ts');
const projectPriceTruth = read('src/lib/pricing/projectPriceTruth.ts');
const outletSaveRoute = read('src/app/api/projects/outlet-save/route.ts');
const desktopItemEditor = read('src/components/templates/main-app/projects/editorView/editItemModal.tsx');
const mobileItemEditor = read('src/components/mobile/sheets/ItemEditSheet.tsx');
const mobileMenuScreen = read('src/components/mobile/screens/MobileMenuScreen.tsx');
const mobileCategoryManager = read('src/components/mobile/sheets/CategoryManagerSheet.tsx');
const mobileBulkActions = read('src/components/mobile/sheets/BulkActionsSheet.tsx');
const mobileTypes = read('src/components/mobile/types.ts');
const bulkOperations = read('src/components/templates/main-app/projects/editorView/CommandCenterModal/utils/bulkOperations.ts');
const commandCenter = read('src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx');
const editorFilters = read('src/components/templates/main-app/projects/editorView/utils/itemFilters.ts');
const editorLogic = read('src/components/templates/main-app/projects/editorView/hooks/useEditorLogic.ts');
const aiMenuManagerResolver = read('src/lib/ai-menu-manager/commandResolver.ts');
const aiMenuManagerHints = read('src/lib/ai-menu-manager/projectPromptHints.ts');
const aiMenuManagerContext = read('src/lib/ai-menu-manager/contextPacket.ts');
const aiMenuManagerConversation = read('src/lib/ai-menu-manager/domainConversationRouter.ts');
const screenContent = read('src/lib/screen/screenContent.ts');
const screenTypes = read('src/types/campaigns.ts');
const screenDisplay = read('src/app/screen/[token]/ScreenDisplay.tsx');
const menuBoardDisplay = read('src/app/screen/[token]/MenuBoardDisplay.tsx');
const printSanitizer = read('src/lib/menu-card-export/source/sanitizeMenuForPrint.ts');
const priceBoundaryTest = read('scripts/verification/test-menu-price-boundary.ts');
const projectShareModal = read('src/components/templates/main-app/projects/b2cView/shareModal/index.tsx');
const menuPdfGenerator = read('src/lib/export/menuPdfGenerator.ts');
const readme = read('__docs__/pricing-integrity-system/README.md');
const spec = read('__docs__/pricing-integrity-system/pricing-integrity-system_spec.md');
const impl = read('__docs__/pricing-integrity-system/pricing-integrity-system_impl.md');
const firebaseDoc = read('__docs__/pricing-integrity-system/pricing-integrity-system_firebase.md');
const mobileDoc = read('__docs__/pricing-integrity-system/pricing-integrity-system_mobile-support.md');
const websiteDoc = read('__docs__/pricing-integrity-system/pricing-integrity-system_website.md');
const helpDoc = read('__docs__/pricing-integrity-system/pricing-integrity-system_helpdoc.md');
const marketingDoc = read('__docs__/pricing-integrity-system/pricing-integrity-system_marketing.md');
const validationDoc = read('__docs__/pricing-integrity-system/pricing-integrity-system_validation.md');
const verificationDoc = read('__docs__/pricing-integrity-system/pricing-integrity-system_verification-2026-07-16.md');
const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');

requireToken(
  packageJson,
  '"verify:pricing-integrity-boundary": "node scripts/verification/verify-pricing-integrity-boundary.js && npm run test:menu-price-boundary"',
  'package scripts',
);
requireToken(packageJson, '"test:menu-price-boundary":', 'menu price behavioral test script');
requireToken(
  packageJson,
  '"test:pricing-plans:rules": "GCLOUD_PROJECT=demo-pricing-plans-rules firebase emulators:exec --only firestore',
  'pricing plan rules test script',
);

[
  'export type PricingPlanMutationInput',
  'const normalizePricingPlanFields = (value: unknown): PricingPlanMutationInput | null => {',
  '!Number.isSafeInteger(plan.price)',
  'plan.features.length > PLAN_FEATURE_MAX_ITEMS',
  'export const normalizePricingPlan = (value: unknown, id: string): PricingPlan | null => {',
  'return { ...fields, id, version: Number(version) };',
  'export const PRICING_PLAN_QUERY_MAX_RESULTS = 100;',
  'limit(PRICING_PLAN_QUERY_MAX_RESULTS + 1)',
  'assertPricingPlanQueryWithinLimit(querySnapshot.size)',
  'where("publicSafe", "==", true)',
  'publicSafe: true',
  'if (planType !== undefined && planType !== \'B2C\' && planType !== \'B2B\')',
  'return runTransaction(firebaseClient, async (transaction) => {',
  'currentPlan.version >= Number.MAX_SAFE_INTEGER',
  'transaction.set(planRef, {',
  '}, { merge: false });',
].forEach((token) => requireToken(pricingPlansDal, token, 'Pricing plan DAL public/version boundary'));
[
  'requestBodyComposer',
  'return { ...plan, id }',
  'seedInitialPlans',
  'updateDoc(getDocRef',
  'transaction.update(planRef, {',
].forEach((token) => forbidToken(pricingPlansDal, token, 'Pricing plan DAL public/version boundary'));
requireToken(pricingPlansUi, 'PricingPlanMutationInput', 'Pricing plan editor typed mutation boundary');
forbidToken(pricingPlansUi, 'handleSavePlan = async (values: any)', 'Pricing plan editor typed mutation boundary');
[
  'const getB2CPlansList = (): Plan[] => {',
  'const getB2BPlansList = (): Plan[] => {',
  'return { ...plan, featuresList: planFeaturesList };',
].forEach((token) => requireToken(staticPlatformPlans, token, 'Static platform plan typed projection'));
[
  'removeObjRef',
  'plan: any',
  'CustomePlanForB2B: any',
].forEach((token) => forbidToken(staticPlatformPlans, token, 'Static platform plan typed projection'));

[
  'allow get: if isPlatformAdmin()',
  'isPublicPricingPlan(resource.data) && resource.data.active == true',
  'allow list: if request.query.limit != null',
  '&& request.query.limit <= 101',
  '&& resource.data.publicSafe == true',
  '&& request.resource.data.publicSafe == true',
  'allow delete: if false;',
  'function isPublicPricingPlan(data) {',
  "data.keys().hasOnly([",
  '&& data.price is int',
  '&& data.version is int',
].forEach((token) => requireToken(firestoreRules, token, 'Pricing plan public Firestore contract'));
[
  'match /projectsMetadata/{tId}/{sId}/{projectId} {',
  '// Retired pricing-integrity scaffold only.',
  'match /projectsData/{tId}/{sId}/{projectId} {',
  '// Read-only compatibility. Browser writes would create a parallel menu',
].forEach((token) => requireToken(firestoreRules, token, 'Retired pricing collection write boundary'));
requireOccurrenceAtLeast(
  firestoreRules.slice(
    firestoreRules.indexOf('match /projectsMetadata/{tId}/{sId}/{projectId} {'),
    firestoreRules.indexOf('// Legacy flat Projects Data'),
  ) + firestoreRules.slice(
    firestoreRules.indexOf('match /projectsData/{tId}/{sId}/{projectId} {'),
    firestoreRules.indexOf('// Changelog Pages'),
  ),
  '&& belongsToStoreById(sId);',
  2,
  'Retired project aliases exact store read boundary',
);
requireOccurrenceAtLeast(
  firestoreRules,
  'allow write: if false;',
  3,
  'Retired project aliases and legacy flat project deny browser writes',
);

[
  'await revalidatePublicClientCacheForProject(data.projectId as string, "updateProject");',
  'void detectAndLogChanges(\n                data.projectId,\n                oldProject,\n                buildProjectAfterPartialUpdate(oldProject, updateData),\n                operationScope,',
  'void detectAndLogChanges(\n            data.projectId,\n            previousProject,\n            savedProject,\n            operationScope,',
].forEach((token) => requireToken(projectsDatabase, token, 'Project save path'));
forbidToken(
  projectsDatabase,
  'void detectAndLogChanges(data.projectId, oldProject, data, operationScope);',
  'Project save path stale partial-project change logging',
);
forbidToken(projectsDatabase, 'runPricingIntegrity', 'Project save path');
requireOccurrenceAtLeast(
  projectsDatabase,
  'normalizeProjectPriceTruth(data);',
  2,
  'Project update and publish canonical price normalization',
);

[
  'export const MENU_PRICE_TEXT_MAX_LENGTH = 40;',
  'export const priceStringSchema = z',
  'Price cannot be negative',
  'export function normalizeOptionalMenuPrice(price: unknown)',
  "if (!normalized) return { success: true, data: '' };",
].forEach((token) => requireToken(pricingSchema, token, 'Canonical menu price schema'));
[
  'export function normalizeProjectPriceTruth<T extends object>(project: T): T',
  "for (const bucketName of ['items', 'attributes'] as const)",
  "if (!result.success) throw new Error('Invalid menu price');",
].forEach((token) => requireToken(projectPriceTruth, token, 'Canonical project price truth'));
[
  'normalizeProjectPriceTruth(project);',
  '.transform((value) => normalizeOptionalMenuPrice(value))',
  ".transform((result) => result.data || '')",
].forEach((token) => requireToken(outletSaveRoute, token, 'Linked outlet price boundary'));

[
  'export const revalidatePublicClientCacheForProject = async (',
  'invalidateOwnerBusinessAssistantBrowserCache({ storeId, projectId });',
  'await revalidatePublicClientCache(storeId, context, {',
  'projectId,',
  'touchScreen: true,',
  'const pendingRevalidations = new Map<string, PendingPublicCacheRevalidation>();',
  'pending.rerunRequested = true;',
  '} while (entry.rerunRequested);',
].forEach((token) => requireToken(publicClientCache, token, 'Public client cache helper'));
forbidToken(publicClientCache, 'const pendingRevalidations = new Map<string, Promise<void>>();', 'Public client cache helper');

[
  'if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED || !normalizedStoreId)',
  'await firestoreAdmin.runTransaction(async (transaction) => {',
  '"screen.contentVersion": nextContentVersion',
  '"screen.lastContentChangeAt": now',
  'transaction.set(publicScreenRef, {',
  'getPrivateScreenTokenCacheTag(screenToken)',
  'revalidateTag(result.tokenCacheTag, { expire: 0 });',
].forEach((token) => requireToken(screenInvalidation, token, 'Digital Screens invalidation path'));
requireOrder(
  screenInvalidation,
  [
    'await firestoreAdmin.runTransaction(async (transaction) => {',
    'const nextContentVersion = Number(screen.contentVersion || 0) + 1;',
    'transaction.update(screenRef, {',
    '"screen.contentVersion": nextContentVersion',
    'transaction.set(publicScreenRef, {',
  ],
  'Digital Screens invalidation order',
);
[
  'touchDigitalScreenContentVersionForStoreServer(',
  'body.touchScreen === true',
].forEach((token) => requireToken(revalidateMenuRoute, token, 'Protected screen invalidation route'));
forbidToken(revalidateMenuRoute, "'screen-data'", 'Protected screen invalidation route');

[
  'export async function runPricingIntegrity',
  'const PRICING_PDF_FAILURE_REASON_FALLBACK = "pricing_pdf_generation_failed";',
  'const PRICING_PDF_FAILURE_REASON_PATTERN = /^[a-z0-9_:-]{1,80}$/i;',
  'function normalizePricingPdfFailureReason(reason: string): string',
  'transaction.update(dataRef,',
  'pricingIntegrity: updatedIntegrity',
  'logPriceChange({',
  'if (isBackgroundPDFRegenEnabled())',
  'enqueuePDFRegen({',
  'const failureReason = normalizePricingPdfFailureReason(error);',
  '"pricingIntegrity.pdf.lastFailureReason": failureReason',
  'failureReason,',
].forEach((token) => requireToken(pricingEngine, token, 'Dormant pricing engine scaffold'));
forbidToken(pricingEngine, '"pricingIntegrity.pdf.lastFailureReason": error', 'Pricing PDF failure reason persistence');
requireToken(readme, 'The retired `projectsMetadata` and `projectsData` aliases are authenticated', 'Pricing README retired alias boundary');
requireToken(firebaseDoc, 'Browser writes to retired `projectsMetadata/{tId}/{sId}/{projectId}` and', 'Pricing Firebase retired alias boundary');

[
  'const ENABLE_BACKGROUND_PDF_REGEN = false;',
  'logPricingDiagnostic("pricing_pdf_regen_disabled"',
  'export function isBackgroundPDFRegenEnabled(): boolean',
].forEach((token) => requireToken(pricingPdfQueue, token, 'Pricing PDF queue'));
['firebase/firestore', 'createRegenJob', 'setDoc(', '"jobs"'].forEach((token) => (
  forbidToken(pricingPdfQueue, token, 'Disabled background pricing PDF regeneration persistence')
));
forbidToken(pricingPdfQueue, 'const ENABLE_BACKGROUND_PDF_REGEN = true;', 'Pricing PDF queue');

[
  "export { formatMenuPrice, normalizeMenuPrice, parseSingleMenuPrice } from './formatMenuPrice';",
  'getActivePublicItemPriceAttributes,',
  'getPublicItemListPriceLabel,',
  'hasPublicItemDisplayPrice,',
].forEach((token) => requireToken(pricingIndex, token, 'Active pricing module exports'));
[
  'runPricingIntegrity',
  'markPDFFailed',
  'logPriceChange',
  'enqueuePDFRegen',
  'isBackgroundPDFRegenEnabled',
].forEach((token) => forbidToken(pricingIndex, token, 'Dormant pricing barrel isolation'));

[
  "if (typeof price === 'string')",
  'const rawPrice = price.trim();',
  'if (rawPrice && !isSingleNumericPrice)',
  "return rawPrice;",
  "return `${currencySymbol || ''}${rangeCandidate.replace(/\\s*([-\\/–—])\\s*/g, '$1')}`;",
].forEach((token) => requireToken(pricingFormatter, token, 'Menu price formatter'));

[
  'normalizeOptionalMenuPrice(itemData.price)',
  'normalizeOptionalMenuPrice(attribute.price)',
  'maxLength: MENU_PRICE_TEXT_MAX_LENGTH',
  'getPublicItemListPriceLabel(itemData',
].forEach((token) => requireToken(desktopItemEditor, token, 'Desktop item price editor'));
[
  'normalizeOptionalMenuPrice(draftItem.price)',
  'price: attribute.priceResult.data ||',
  'price: normalizedItemPrice.data ||',
  'maxLength={MENU_PRICE_TEXT_MAX_LENGTH}',
  'getPublicItemListPriceLabel(draftItem',
].forEach((token) => requireToken(mobileItemEditor, token, 'Mobile item price editor'));
forbidToken(mobileItemEditor, 'parseFloat(attribute.priceValue', 'Mobile option price coercion');
forbidToken(mobileItemEditor, 'parseFloat(String(draftItem.price', 'Mobile base price coercion');
[
  'price: string | number;',
].forEach((token) => requireOccurrenceAtLeast(mobileTypes, token, 2, 'Mobile canonical price type'));
[
  'function normalizeExtractedPriceDisplay(price: unknown): string | number',
  'function hasMobileMenuPrice(item: MenuItemType): boolean',
  'const numericPrice = parseSingleMenuPrice(item.price);',
  'const price = normalizeExtractedPriceDisplay(item.price);',
  'hasMobileMenuPrice(item)',
  'attribute?.active !== false',
].forEach((token) => requireToken(mobileMenuScreen, token, 'Mobile price display/quality parity'));
[
  'price: normalizeExtractedPriceDisplay(item.price)',
  'currencySymbol={currencySymbol}',
  'attribute.active !== false',
].forEach((token) => requireToken(mobileMenuScreen, token, 'Mobile category price projection'));
[
  'price?: string | number;',
  'hasPublicItemDisplayPrice(item)',
  'getPublicItemListPriceLabel(item, currencySymbol)',
].forEach((token) => requireToken(mobileCategoryManager, token, 'Mobile category price truth'));
[
  'hasPublicItemDisplayPrice(item)',
  'price: String(item.price ?? \'\')',
  'active: attr.active !== false',
].forEach((token) => requireToken(mobileBulkActions, token, 'Mobile bulk price truth'));

[
  'const currentPrice = parseSingleMenuPrice(item.price);',
  'if (!canForceFixedPrice && (currentPrice === null || currentPrice <= 0))',
  'const attrPrice = parseSingleMenuPrice(attr.price);',
].forEach((token) => requireToken(bulkOperations, token, 'Bulk price arithmetic boundary'));
requireToken(commandCenter, 'if (!hasPublicItemDisplayPrice(item))', 'Desktop quality price truth');
[
  'parseSingleMenuPrice(item.price)',
  'hasPublicItemDisplayPrice(item)',
  '.filter((attribute) => attribute.active !== false)',
].forEach((token) => {
  requireToken(editorFilters, token, 'Desktop filter price boundary');
  requireToken(editorLogic, token, 'Desktop editor price boundary');
});

[
  'const currentPrice = parseSingleMenuPrice(item.price);',
  'const items = params.setExact',
  'text, range, or missing price',
].forEach((token) => requireToken(aiMenuManagerResolver, token, 'AI Menu Manager price mutation boundary'));
[
  'parseSingleMenuPrice(item.price)',
  '!hasPublicItemDisplayPrice(item)',
].forEach((token) => requireToken(aiMenuManagerHints, token, 'AI Menu Manager price suggestion boundary'));
requireToken(aiMenuManagerContext, 'hasDisplayPrice: hasPublicItemDisplayPrice(item)', 'AI Menu Manager context price truth');
[
  'parseSingleMenuPrice(value)',
  "typeof item.hasDisplayPrice === 'boolean'",
].forEach((token) => requireToken(aiMenuManagerConversation, token, 'AI Menu Manager diagnostic price truth'));

[
  'export function parseScreenPrice(value: unknown): number | string | undefined',
  'export function hasScreenPrice(price: unknown): boolean',
  'export function getScreenItemPrice(item: unknown): number | string | undefined',
  'const parsedPrice = getScreenItemPrice(item);',
].forEach((token) => requireToken(screenContent, token, 'Digital Screen price projection'));
requireOccurrenceAtLeast(screenTypes, 'price?: number | string;', 2, 'Digital Screen canonical price types');
requireToken(screenDisplay, 'hasScreenPrice(slide.price)', 'Highlights price display parity');
requireToken(menuBoardDisplay, 'hasScreenPrice(item.price)', 'Menu Board price display parity');
[
  'if (!price && !attributes.some((attribute) => Boolean(attribute.price)))',
  'normalizeOptionalMenuPrice(price)',
].forEach((token) => requireToken(printSanitizer, token, 'Print/PDF variant price boundary'));
[
  "normalizeOptionalMenuPrice('Market Price')",
  'normalizeProjectPriceTruth({',
  'getScreenItemPrice({',
  'missingPriceCount, 0',
  "price: 'Market Price'",
  'itemsSkipped, 2',
].forEach((token) => requireToken(priceBoundaryTest, token, 'Menu price behavioral coverage'));

[
  "const { generateMenuPdf, downloadPdf } = await import('@lib/export/menuPdfGenerator');",
  'const pdfResult = await generateMenuPdf({',
  'downloadPdf(pdfResult);',
  'resolveLocalExportStorageScope(storeData)',
  'readLocalPdfDownloadAt(pdfHistoryScope, projectId)',
  'recordLocalPdfDownload(pdfHistoryScope, projectId, pdfResult.snapshotHash);',
].forEach((token) => requireToken(projectShareModal, token, 'Project share PDF path'));
[
  'localStorage.setItem(PDF_DOWNLOAD_KEY',
  'menulist_last_pdf_version_${projectId}',
].forEach((token) => forbidToken(projectShareModal, token, 'Project share PDF path unscoped legacy freshness key'));

[
  'export async function generateMenuPdf(options: MenuPdfOptions): Promise<GeneratedPdf>',
  'const artifact = await renderPdf(source, settings);',
  'snapshotHash: artifact.sourceHash',
  'export function downloadPdf(pdfResult: GeneratedPdf): void',
].forEach((token) => requireToken(menuPdfGenerator, token, 'Menu PDF generator'));

const activeDocs = [
  ['Pricing Integrity README', readme],
  ['Pricing Integrity spec', spec],
  ['Pricing Integrity implementation plan', impl],
  ['Pricing Integrity Firebase cost doc', firebaseDoc],
  ['Pricing Integrity mobile support doc', mobileDoc],
  ['Pricing Integrity website doc', websiteDoc],
  ['Pricing Integrity helpdoc', helpDoc],
  ['Pricing Integrity marketing doc', marketingDoc],
  ['Pricing Integrity validation report', validationDoc],
];

for (const [label, content] of activeDocs) {
  requireToken(content, 'not current launch certification', `${label} launch boundary`);
  requireToken(content, 'External Certification Runbook evidence', `${label} external certification boundary`);
  requireToken(content, '`npm run verify:pricing-integrity-boundary`', `${label} focused source gate`);
  requireToken(content, '`npm run verify:agent-readiness`', `${label} aggregate source gate`);
  requireToken(content, '`npm run verify:menulist-api-tenant-safety`', `${label} tenant source gate`);
  requireToken(content, 'public menu and PDF artifact QA', `${label} public/PDF QA boundary`);
  forbidToken(content, 'READY FOR IMPLEMENTATION', `${label} stale ready-for-implementation status`);
  forbidToken(content, 'Ready for Implementation', `${label} stale ready-for-implementation title-case status`);
  forbidToken(content, 'PDF regenerates automatically', `${label} stale automatic PDF claim`);
  forbidToken(content, 'The PDF stays fresh automatically', `${label} stale automatic PDF claim`);
  forbidToken(content, 'Menu PDF automatic update hota hai', `${label} stale automatic PDF claim`);
  forbidToken(content, 'all update automatically', `${label} stale all-surfaces automatic claim`);
  forbidToken(content, 'all show the same price, always', `${label} stale all-surfaces certainty claim`);
}

[
  ['Pricing README', readme, '`runPricingIntegrity()` has no current caller'],
  ['Pricing spec', spec, '`runPricingIntegrity()` has no current caller'],
  ['Pricing implementation', impl, 'No background PDF job is created by this share path.'],
  ['Pricing implementation', impl, '`pricingIntegrity.pdf.lastFailureReason`'],
  ['Pricing Firebase', firebaseDoc, 'There is no active background PDF queue cost.'],
  ['Pricing mobile', mobileDoc, 'Mobile does not have a separate Pricing Integrity UI.'],
  ['Pricing website', websiteDoc, 'Background PDF regeneration is not active runtime.'],
  ['Pricing helpdoc', helpDoc, 'MenuList does not currently run a background PDF regeneration job after every price edit.'],
  ['Pricing marketing', marketingDoc, '`ENABLE_BACKGROUND_PDF_REGEN` is false.'],
  ['Pricing validation', validationDoc, '`runPricingIntegrity()` is dormant source scaffold with no current caller.'],
].forEach(([label, content, token]) => requireToken(content, token, label));

[
  '## Audited flows',
  'No read, write, delete, collection, index, Storage object, Function, scheduler, queue, or polling path was added.',
  '`npm run verify:pricing-integrity-boundary`',
  'External Certification Runbook evidence',
].forEach((token) => requireToken(verificationDoc, token, 'Pricing verification evidence'));

[
  ['inventory', inventory, 'pricing_integrity'],
  ['inventory', inventory, 'July 16 price-boundary behavior/source gates passed'],
  ['report', report, '## Pricing Integrity Boundary'],
  ['report', report, '`npm run verify:pricing-integrity-boundary`'],
  ['report', report, 'July 16 deep audit'],
  ['audit', audit, 'Pricing Integrity current-runtime public-claim checkpoint'],
  ['audit', audit, '`npm run verify:pricing-integrity-boundary`'],
  ['audit', audit, 'Pricing Integrity Runtime Deep Audit'],
  ['audit', audit, 'Pricing Integrity PDF failure reason persistence checkpoint'],
  ['audit', audit, 'Pricing-plan public contract and atomic version checkpoint'],
  ['changelog', changelog, 'Pricing Integrity Current Runtime Boundary'],
  ['changelog', changelog, '`npm run verify:pricing-integrity-boundary`'],
  ['changelog', changelog, 'Pricing Integrity Runtime Hardening'],
  ['changelog', changelog, 'Pricing Integrity PDF Failure Reason Persistence'],
  ['changelog', changelog, 'Pricing Plan Public Contract and Versioning'],
].forEach(([label, source, token]) => requireToken(source, token, `Pricing ledger ${label}`));

if (failures.length > 0) {
  console.error('FAIL verify-pricing-integrity-boundary');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('PASS verify-pricing-integrity-boundary');
console.log('Validated Pricing Integrity saved-truth, disabled background PDF, on-demand PDF, public cache, Digital Screens, and docs parity.');
