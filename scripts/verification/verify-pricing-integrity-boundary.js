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
const projectsDatabase = read('src/database/projects/index.ts');
const publicClientCache = read('src/lib/cache/publicClientCache.ts');
const screenInvalidation = read('src/lib/screen/screenInvalidation.ts');
const pricingEngine = read('src/lib/pricing/integrityEngine.ts');
const pricingPdfQueue = read('src/lib/pricing/pdfQueue.ts');
const pricingIndex = read('src/lib/pricing/index.ts');
const pricingFormatter = read('src/lib/pricing/formatMenuPrice.ts');
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
const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/CHANGELOG.md');

requireToken(
  packageJson,
  '"verify:pricing-integrity-boundary": "node scripts/verification/verify-pricing-integrity-boundary.js"',
  'package scripts',
);

[
  'await revalidatePublicClientCacheForProject(data.projectId as string, "updateProject");',
  'detectAndLogChanges(data.projectId, oldProject, data);',
].forEach((token) => requireToken(projectsDatabase, token, 'Project save path'));
forbidToken(projectsDatabase, 'runPricingIntegrity', 'Project save path');

[
  'export const revalidatePublicClientCacheForProject = async (',
  'invalidateOwnerBusinessAssistantBrowserCache({ storeId, projectId });',
  'await revalidatePublicClientCache(storeId, context);',
  'await touchDigitalScreenContentVersion(storeId, context, { projectId });',
].forEach((token) => requireToken(publicClientCache, token, 'Public client cache helper'));

[
  'if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED || !normalizedStoreId || typeof window === "undefined")',
  'if (!screen?.screenToken)',
  '"screen.contentVersion": increment(1)',
  '"screen.lastContentChangeAt": now',
  'await syncPublicScreenState(normalizedStoreId',
].forEach((token) => requireToken(screenInvalidation, token, 'Digital Screens invalidation path'));
requireOrder(
  screenInvalidation,
  [
    'if (!screen?.screenToken)',
    'const nextContentVersion = Number(screen.contentVersion || 0) + 1;',
    'await updateDoc(screenRef, {',
    '"screen.contentVersion": increment(1)',
    'await syncPublicScreenState(normalizedStoreId',
  ],
  'Digital Screens invalidation order',
);

[
  'export async function runPricingIntegrity',
  'transaction.update(dataRef,',
  'pricingIntegrity: updatedIntegrity',
  'logPriceChange({',
  'if (isBackgroundPDFRegenEnabled())',
  'enqueuePDFRegen({',
].forEach((token) => requireToken(pricingEngine, token, 'Dormant pricing engine scaffold'));

[
  'const ENABLE_BACKGROUND_PDF_REGEN = false;',
  'if (!ENABLE_BACKGROUND_PDF_REGEN) {',
  'logPricingDiagnostic("pricing_pdf_regen_disabled"',
  'return;',
  'await setDoc(jobRef, jobData);',
  'export function isBackgroundPDFRegenEnabled(): boolean',
].forEach((token) => requireToken(pricingPdfQueue, token, 'Pricing PDF queue'));
requireOrder(
  pricingPdfQueue,
  [
    'if (!ENABLE_BACKGROUND_PDF_REGEN) {',
    'return;',
    'const existingTimer = debounceTimers.get(key);',
    'const timer = setTimeout(async () =>',
    'await createRegenJob(params);',
  ],
  'Pricing PDF queue disabled-before-job order',
);
forbidToken(pricingPdfQueue, 'const ENABLE_BACKGROUND_PDF_REGEN = true;', 'Pricing PDF queue');

[
  'runPricingIntegrity, type IntegrityParams',
  'logMOLEvent, logPDFEvent, logPriceChange',
  'enqueuePDFRegen, getDebounceMs, isBackgroundPDFRegenEnabled',
].forEach((token) => requireToken(pricingIndex, token, 'Pricing module exports'));

[
  "if (typeof price === 'string')",
  'const rawPrice = price.trim();',
  'if (rawPrice && !isSingleNumericPrice)',
  "return rawPrice;",
  "return `${currencySymbol || ''}${rangeCandidate.replace(/\\s*([-\\/])\\s*/g, '$1')}`;",
].forEach((token) => requireToken(pricingFormatter, token, 'Menu price formatter'));

[
  "const { generateMenuPdf, downloadPdf } = await import('@lib/export/menuPdfGenerator');",
  'const pdfResult = await generateMenuPdf({',
  'downloadPdf(pdfResult);',
  'localStorage.setItem(PDF_DOWNLOAD_KEY, Date.now().toString());',
  'localStorage.setItem(`menulist_last_pdf_version_${projectId}`, pdfResult.snapshotHash);',
].forEach((token) => requireToken(projectShareModal, token, 'Project share PDF path'));

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
  ['Pricing Firebase', firebaseDoc, 'There is no active background PDF queue cost.'],
  ['Pricing mobile', mobileDoc, 'Mobile does not have a separate Pricing Integrity UI.'],
  ['Pricing website', websiteDoc, 'Background PDF regeneration is not active runtime.'],
  ['Pricing helpdoc', helpDoc, 'MenuList does not currently run a background PDF regeneration job after every price edit.'],
  ['Pricing marketing', marketingDoc, '`ENABLE_BACKGROUND_PDF_REGEN` is false.'],
  ['Pricing validation', validationDoc, '`runPricingIntegrity()` is dormant source scaffold with no current caller.'],
].forEach(([label, content, token]) => requireToken(content, token, label));

[
  ['inventory', inventory, 'pricing_integrity'],
  ['inventory', inventory, 'pricing-integrity boundary source gate passed'],
  ['report', report, '## Pricing Integrity Boundary'],
  ['report', report, '`npm run verify:pricing-integrity-boundary`'],
  ['audit', audit, 'Pricing Integrity current-runtime public-claim checkpoint'],
  ['audit', audit, '`npm run verify:pricing-integrity-boundary`'],
  ['changelog', changelog, 'Pricing Integrity Current Runtime Boundary'],
  ['changelog', changelog, '`npm run verify:pricing-integrity-boundary`'],
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
