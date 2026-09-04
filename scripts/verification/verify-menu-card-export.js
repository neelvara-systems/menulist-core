const fs = require('fs');
const path = require('path');

const root = process.cwd();

const requiredFiles = [
  'src/app/(main)/use-menulist/menu-card-export/page.tsx',
  'src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx',
  'src/components/mobile/menu-card-export/MobileMenuCardExportScreen.tsx',
  'src/hooks/useMenuCardExportController.ts',
  'src/lib/menu-card-export/index.ts',
  'src/lib/menu-card-export/navigation.ts',
  'src/lib/menu-card-export/render/artifactMetadata.ts',
  'src/lib/menu-card-export/render/renderCategoryIcon.ts',
  'src/lib/menu-card-export/render/renderPdf.ts',
  'src/lib/menu-card-export/render/renderPreviewModel.ts',
  'src/lib/menu/itemDecisionSymbols.ts',
  'src/components/shared/menu/ItemDecisionSymbolGroup.tsx',
  'src/lib/menu-card-export/layout/resolveColumnCount.ts',
  'src/lib/menu-card-export/repository/artifactStorage.ts',
  'src/lib/menu-card-export/repository/menuCardExportRepository.ts',
  'src/lib/export/browserFileShare.ts',
  'src/lib/export/localExportHistory.ts',
  'src/lib/export/menuPdfGenerator.ts',
  'src/lib/menu-kit/brandTokens.ts',
  'src/lib/menu-kit/canvasPrimitives.ts',
  'src/lib/print-assets/printAssetCatalog.ts',
  'src/lib/print-assets/navigation.ts',
  'src/lib/print-assets/ownerPrintGuidance.ts',
  'src/lib/print-menu-surfaces/templates/printMenuCardFace.ts',
  'src/lib/print-menu-surfaces/templates/singleTableCardTemplate.ts',
  'src/lib/print-menu-surfaces/templates/tableTentTemplate.ts',
  'src/lib/platform/menuListBranding.ts',
  'src/lib/utils/qrCode.ts',
  'src/lib/utils/feedbackQrCode.ts',
  'src/components/customer/PublicMenuListAttribution.tsx',
  'src/lib/menu-card-export/templates/autoPrintDesign.ts',
  'src/lib/menu-card-export/templates/businessPrintProfiles.ts',
  'src/lib/menu-card-export/preflight/runPrintPreflight.ts',
  'src/lib/menu-card-export/printShop/buildPrintShopPacket.ts',
  'src/lib/menu-card-export/ai/designAdvisor.ts',
  'src/app/api/menu-card-export/design-advisor/route.ts',
  'src/app/api/menu-card-export/design-advisor/prompt.ts',
  'src/services/ai/menuCardExport/getDesignAdviceViaAPI.ts',
  'src/components/mobile/screens/MobileShareScreen.tsx',
  'src/components/mobile/screens/MobilePrintAssetsScreen.tsx',
  'src/components/mobile/components/MobileQrCodeSheet.tsx',
  'src/components/mobile/screens/MobileMenuScreen.tsx',
  'src/components/mobile/components/MobileMenuCommandSheet.tsx',
  'src/components/templates/main-app/useMenuList/useMenuListDiagnostics.ts',
  'scripts/verification/test-print-export-browser-boundaries.ts',
  'scripts/verification/render-menu-card-visual-fixtures.ts',
  'src/components/mobile/screens/MobileMoreScreen.tsx',
  'src/app/(main)/use-menulist/print-assets/page.tsx',
  '__docs__/menu-card-export/menu-card-export_firebase.md',
  '__docs__/menu-card-export/menu-card-export_helpdoc.md',
  '__docs__/menu-card-export/menu-card-export_marketing.md',
  '__docs__/menu-card-export/menu-card-export_website.md',
  '__docs__/menu-card-export/menu-card-export_test-cases.md',
  '__docs__/menu-card-export/menu-card-export_validation.md',
  '__docs__/print-assets/README.md',
  '__docs__/print-assets/print-assets_spec.md',
  '__docs__/print-assets/print-assets_impl.md',
  '__docs__/print-assets/print-assets_firebase.md',
  '__docs__/print-assets/print-assets_mobile-support.md',
  '__docs__/print-assets/print-assets_test-cases.md',
  '__docs__/print-assets/print-assets_verification.md',
  '__docs__/print-menu-surfaces/README.md',
  '__docs__/print-menu-surfaces/print-menu-surfaces_spec.md',
  '__docs__/print-menu-surfaces/print-menu-surfaces_impl.md',
  '__docs__/print-menu-surfaces/print-menu-surfaces_firebase.md',
  '__docs__/print-menu-surfaces/print-menu-surfaces_mobile-support.md',
  '__docs__/physical-surfaces/README.md',
  '__docs__/physical-surfaces/physical-surfaces_code-review.md',
  '__docs__/physical-surfaces/physical-surfaces_validation.md',
  '__docs__/physical-surfaces/physical-surfaces_marketing.md',
  '__docs__/physical-surfaces/physical-surfaces_logic-verification.md',
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
  'ENABLE_CATEGORY_ICONS',
  'MENU_CARD_EXPORT_AI_ADVISOR_PLAN_IDS',
  'ENABLE_MULTI_LOCATION_MENULIST_BRANDING_REMOVAL',
  'ENABLE_PRINT_MENU_SURFACES',
  'ENABLE_PRINT_ASSETS_ROUTE',
].forEach((flag) => {
  if (!features.includes(flag)) failures.push(`Missing feature flag: ${flag}`);
});

const printAssetCatalog = fs.readFileSync(path.join(root, 'src/lib/print-assets/printAssetCatalog.ts'), 'utf8');
const printableAssetRenderer = fs.readFileSync(path.join(root, 'src/lib/printable-asset-templates/renderPrintableAsset.ts'), 'utf8');
const menuCardExportCoreDocs = [
  {
    label: 'Menu Card Export README',
    content: fs.readFileSync(path.join(root, '__docs__/menu-card-export/README.md'), 'utf8'),
  },
  {
    label: 'Menu Card Export spec',
    content: fs.readFileSync(path.join(root, '__docs__/menu-card-export/menu-card-export_spec.md'), 'utf8'),
  },
  {
    label: 'Menu Card Export implementation',
    content: fs.readFileSync(path.join(root, '__docs__/menu-card-export/menu-card-export_impl.md'), 'utf8'),
  },
  {
    label: 'Menu Card Export mobile support',
    content: fs.readFileSync(path.join(root, '__docs__/menu-card-export/menu-card-export_mobile-support.md'), 'utf8'),
  },
];
const menuCardExportCollateralDocs = [
  {
    label: 'Menu Card Export helpdoc',
    content: fs.readFileSync(path.join(root, '__docs__/menu-card-export/menu-card-export_helpdoc.md'), 'utf8'),
  },
  {
    label: 'Menu Card Export marketing',
    content: fs.readFileSync(path.join(root, '__docs__/menu-card-export/menu-card-export_marketing.md'), 'utf8'),
  },
  {
    label: 'Menu Card Export website',
    content: fs.readFileSync(path.join(root, '__docs__/menu-card-export/menu-card-export_website.md'), 'utf8'),
  },
];
const menuCardExportValidation = fs.readFileSync(path.join(root, '__docs__/menu-card-export/menu-card-export_validation.md'), 'utf8');
const menuCardExportTestCases = fs.readFileSync(path.join(root, '__docs__/menu-card-export/menu-card-export_test-cases.md'), 'utf8');
const menuCardExportFirebase = fs.readFileSync(path.join(root, '__docs__/menu-card-export/menu-card-export_firebase.md'), 'utf8');
const menuCardExportResearch = fs.readFileSync(path.join(root, '__docs__/menu-card-export/menu-card-export_research.md'), 'utf8');
const productionReadinessAudit = fs.readFileSync(path.join(root, '__docs__/audits/menulist-production-readiness-audit.md'), 'utf8');
const changelog = fs.readFileSync(path.join(root, '__docs__/changelog.md'), 'utf8');
const internalFeedbackImpl = fs.readFileSync(path.join(root, '__docs__/projects/internal-feedback-system/internal-feedback-system_impl.md'), 'utf8');
const internalFeedbackFirebase = fs.readFileSync(path.join(root, '__docs__/projects/internal-feedback-system/internal-feedback-system_firebase.md'), 'utf8');
const menuKitImpl = fs.readFileSync(path.join(root, '__docs__/menu-kit/menu-kit_impl.md'), 'utf8');
const menuKitFirebase = fs.readFileSync(path.join(root, '__docs__/menu-kit/menu-kit_firebase.md'), 'utf8');
const menuKitMobileSupport = fs.readFileSync(path.join(root, '__docs__/menu-kit/menu-kit_mobile-support.md'), 'utf8');
const physicalSurfacesReadme = fs.readFileSync(path.join(root, '__docs__/physical-surfaces/README.md'), 'utf8');
const physicalSurfacesCodeReview = fs.readFileSync(path.join(root, '__docs__/physical-surfaces/physical-surfaces_code-review.md'), 'utf8');
const physicalSurfacesValidation = fs.readFileSync(path.join(root, '__docs__/physical-surfaces/physical-surfaces_validation.md'), 'utf8');
const physicalSurfacesMarketing = fs.readFileSync(path.join(root, '__docs__/physical-surfaces/physical-surfaces_marketing.md'), 'utf8');
const physicalSurfacesLogicVerification = fs.readFileSync(path.join(root, '__docs__/physical-surfaces/physical-surfaces_logic-verification.md'), 'utf8');

const menuCardExportActiveDocs = [
  ...menuCardExportCoreDocs,
  ...menuCardExportCollateralDocs,
  { label: 'Menu Card Export Firebase', content: menuCardExportFirebase },
  { label: 'Menu Card Export research', content: menuCardExportResearch },
  { label: 'Menu Card Export validation', content: menuCardExportValidation },
  { label: 'Menu Card Export test cases', content: menuCardExportTestCases },
];
const menuCardExportTopBoundaryTokens = [
  'Launch boundary:** Not current launch certification or deploy approval',
  'source-gated Menu Card Export evidence only',
  'production-readiness audit',
  'External Certification Runbook',
  '`npm run verify:production-readiness-local`',
  'Digital Menu Output Constitution checks for print/menu outputs',
  '`npm run verify:menu-card-export`',
  'authenticated desktop/mobile browser QA',
  'visual PDF and print-shop artifact review',
  'provider smoke for the AI advisor where enabled',
  'applicable target deploy evidence',
  'production-host smoke',
];
menuCardExportActiveDocs.forEach(({ label, content }) => {
  menuCardExportTopBoundaryTokens.forEach((token) => {
    if (!content.includes(token)) failures.push(`${label} missing top launch-boundary token: ${token}`);
  });
});
if (!menuCardExportResearch.includes('Market research and product-direction notes do not approve implementation or release.')) {
  failures.push('Menu Card Export research must remain research evidence, not implementation or release approval');
}
if (!productionReadinessAudit.includes('Menu Card Export active-doc top-boundary checkpoint')) {
  failures.push('Production-readiness audit missing Menu Card Export active-doc top-boundary checkpoint');
}
if (!changelog.includes('Menu Card Export Active Docs Top Boundary')) {
  failures.push('Changelog missing Menu Card Export active-doc top-boundary checkpoint');
}

[
  'Validated implementation evidence; not current launch certification',
  'Current release approval requires the active [production-readiness audit]',
  'External Certification Runbook',
  'Digital Menu Output Constitution checks for print/menu outputs',
  'visual PDF and print-shop artifact review',
  'Current launch certification still requires the active audit/runbook gates above.',
].forEach((token) => {
  if (!menuCardExportValidation.includes(token)) failures.push(`Menu Card Export validation doc missing launch-boundary token: ${token}`);
});
[
  '**Status:** Production ready after deterministic auto-design and Pro/Multi-location layout suggestion hardening',
  'Ready for production release from code, cost, route, real-data runtime, and artifact validation.',
].forEach((token) => {
  if (menuCardExportValidation.includes(token)) failures.push(`Menu Card Export validation doc must not keep stale launch-certification token: ${token}`);
});
[
  'Test-case evidence; not current launch certification',
  'Current release approval requires the active [production-readiness audit]',
  'External Certification Runbook',
  'Digital Menu Output Constitution checks for print/menu outputs',
  'Authenticated browser click-through remains an external certification gate before a Vercel release.',
].forEach((token) => {
  if (!menuCardExportTestCases.includes(token)) failures.push(`Menu Card Export test-cases doc missing launch-boundary token: ${token}`);
});
[
  '**Status:** Production-ready baseline; Pro/Multi-location layout suggestion added',
  'Menu Card Export is release-ready for the client-first PDF/packet path after the automated gates and real-data runtime checks below.',
].forEach((token) => {
  if (menuCardExportTestCases.includes(token)) failures.push(`Menu Card Export test-cases doc must not keep stale launch-certification token: ${token}`);
});
const menuCardExportCoreDocTokens = [
  'not current launch certification',
  'Current release boundary (July 2, 2026)',
  'External Certification Runbook',
  'Digital Menu Output Constitution checks',
  '`npm run verify:menu-card-export`',
  'authenticated desktop/mobile browser QA',
  'visual PDF and print-shop artifact review',
  'provider smoke for the AI advisor where enabled',
  'target deploy evidence',
  'production-host smoke',
];
const menuCardExportCoreForbiddenTokens = [
  '**Status:** Production-ready client-first route with Pro/Multi-location layout suggestion',
  '**Status:** Production-ready client-first with Pro/Multi-location layout suggestion',
  '**Status:** Production-ready route entry with dedicated mobile Print Menu screen',
];
menuCardExportCoreDocs.forEach(({ label, content }) => {
  menuCardExportCoreDocTokens.forEach((token) => {
    if (!content.includes(token)) failures.push(`${label} missing launch-boundary token: ${token}`);
  });
  menuCardExportCoreForbiddenTokens.forEach((token) => {
    if (content.includes(token)) failures.push(`${label} must not keep stale launch-certification token: ${token}`);
  });
  if (/^\*\*Status:\*\*.*[Pp]roduction-ready/m.test(content)) {
    failures.push(`${label} must not keep a production-ready status line`);
  }
});
[
  {
    label: 'Menu Card Export README',
    content: menuCardExportCoreDocs.find((doc) => doc.label === 'Menu Card Export README')?.content || '',
  },
  {
    label: 'Menu Card Export implementation',
    content: menuCardExportCoreDocs.find((doc) => doc.label === 'Menu Card Export implementation')?.content || '',
  },
  {
    label: 'Menu Card Export Firebase',
    content: menuCardExportFirebase,
  },
  {
    label: 'MenuList production-readiness audit',
    content: productionReadinessAudit,
  },
  {
    label: 'MenuList changelog',
    content: changelog,
  },
].forEach(({ label, content }) => {
  [
    'menu_card_design_advisor_provider_response_parse_failed',
    'return_layout_suggestion_failed',
  ].forEach((token) => {
    if (!content.includes(token)) failures.push(`${label} missing AI advisor provider-response parse diagnostic token: ${token}`);
  });
});
[
  {
    label: 'MenuList production-readiness audit',
    content: productionReadinessAudit,
  },
  {
    label: 'MenuList changelog',
    content: changelog,
  },
].forEach(({ label, content }) => {
  [
    'Feedback QR download filename boundary',
    'getQrCodeFilename(data.storeName)',
    'raw store-name whitespace replacement',
  ].forEach((token) => {
    if (!content.includes(token)) failures.push(`${label} missing Feedback QR filename boundary token: ${token}`);
  });
  [
    'Menu Kit ZIP filename boundary',
    'result.zipFilename',
    'hand-rolled store-name filename derivation',
  ].forEach((token) => {
    if (!content.includes(token)) failures.push(`${label} missing Menu Kit ZIP filename boundary token: ${token}`);
  });
});
[
  {
    label: 'Internal Feedback implementation',
    content: internalFeedbackImpl,
  },
  {
    label: 'Internal Feedback Firebase',
    content: internalFeedbackFirebase,
  },
].forEach(({ label, content }) => {
  [
    'Feedback QR download filename boundary',
    'getQrCodeFilename',
    'raw store-name whitespace replacement',
  ].forEach((token) => {
    if (!content.includes(token)) failures.push(`${label} missing Feedback QR filename boundary token: ${token}`);
  });
});
[
  {
    label: 'Menu Kit implementation',
    content: menuKitImpl,
  },
  {
    label: 'Menu Kit Firebase',
    content: menuKitFirebase,
  },
  {
    label: 'Menu Kit mobile support',
    content: menuKitMobileSupport,
  },
].forEach(({ label, content }) => {
  [
    'Menu Kit ZIP filename boundary',
    'result.zipFilename',
    'hand-rolled store-name filename derivation',
  ].forEach((token) => {
    if (!content.includes(token)) failures.push(`${label} missing Menu Kit ZIP filename boundary token: ${token}`);
  });
});
[
  'extra provider calls',
  'AI accounting writes',
  'credit consumption',
  'Firebase deploy requirement',
  'Vercel deploy action',
].forEach((token) => {
  if (!menuCardExportFirebase.includes(token)) failures.push(`Menu Card Export Firebase doc missing AI advisor provider-response parse cost token: ${token}`);
});
[
  'Menu Card Export AI advisor provider response parse diagnostics checkpoint',
  'no raw response preview',
  'old silent provider JSON parse catch',
].forEach((token) => {
  if (!productionReadinessAudit.includes(token)) failures.push(`Production-readiness audit missing Menu Card Export AI advisor provider-response checkpoint token: ${token}`);
});
[
  'Menu Card Export AI Advisor Provider Response Parse Diagnostics',
  'no raw response preview logging',
  'old silent parser catch exclusion',
].forEach((token) => {
  if (!changelog.includes(token)) failures.push(`Changelog missing Menu Card Export AI advisor provider-response checkpoint token: ${token}`);
});
const menuCardExportCollateralTokens = [
  'source evidence only',
  'not current sales, demo, support, website-publication, or launch approval',
  'Current collateral approval requires',
  'External Certification Runbook',
  'Digital Menu Output Constitution checks',
  '`npm run verify:menu-card-export`',
  'authenticated desktop/mobile browser QA',
  'visual PDF and print-shop artifact review',
  'provider smoke for the AI advisor where enabled',
  'target deploy evidence',
  'production-host smoke',
];
const menuCardExportCollateralForbiddenTokens = [
  '**Status:** Ready for support use; screenshots pending',
  '**Status:** Ready for founder demos and support positioning',
  '**Status:** Dedicated owner-facing feature page active via Print-ready Kit',
];
menuCardExportCollateralDocs.forEach(({ label, content }) => {
  menuCardExportCollateralTokens.forEach((token) => {
    if (!content.includes(token)) failures.push(`${label} missing collateral-boundary token: ${token}`);
  });
  menuCardExportCollateralForbiddenTokens.forEach((token) => {
    if (content.includes(token)) failures.push(`${label} must not keep stale collateral-approval token: ${token}`);
  });
});
[
  '⚠️ LEGACY — Superseded by [Menu Kit]',
  'For all new physical surface work, use Menu Kit.',
  'Maintenance note: the legacy Today/mobile Hours download buttons remain as a read-only compatibility surface',
  'Current source has no active writer that computes or persists that field',
  'calculatePhysicalSurfaceEligibility()` is not called by the current campaign mutation path',
].forEach((token) => {
  if (!physicalSurfacesReadme.includes(token)) failures.push(`Physical Surfaces README missing legacy boundary token: ${token}`);
});
[
  'Historical code-review evidence for legacy campaign surfaces; not current launch certification',
  'Menu Kit is the canonical physical surface system for identity surfaces.',
  'Current release approval for any active physical/print output requires the active [production-readiness audit]',
  'All reviewed bugs were fixed for this historical code-review scope. This is not current launch certification.',
].forEach((token) => {
  if (!physicalSurfacesCodeReview.includes(token)) failures.push(`Physical Surfaces code review missing launch-boundary token: ${token}`);
});
[
  'Historical implementation validation for legacy campaign surfaces; not current launch certification',
  'Menu Kit is now the canonical physical surface system for identity surfaces.',
  'Current release approval for active physical/print output requires the active [production-readiness audit]',
  'Historical Validation Result: Source Evidence Only',
  'Evidence Scope:** Historical implementation validation only.',
].forEach((token) => {
  if (!physicalSurfacesValidation.includes(token)) failures.push(`Physical Surfaces validation missing launch-boundary token: ${token}`);
});
[
  'Legacy positioning evidence; not current launch certification',
  'Menu Kit is now the canonical physical surface system for identity surfaces.',
  'Do not use this note as current launch, website, or sales approval',
  'Legacy positioning evidence; not current launch approval',
].forEach((token) => {
  if (!physicalSurfacesMarketing.includes(token)) failures.push(`Physical Surfaces marketing missing launch-boundary token: ${token}`);
});
[
  'Historical logic verification evidence for legacy campaign surfaces; not current launch certification',
  'Menu Kit is now the canonical physical surface system for identity surfaces.',
  'Current release approval for active physical/print output requires the active production-readiness audit',
  '`npm run verify:menu-card-export`',
  'Digital Menu Output Constitution checks',
  'browser/mobile output QA',
  'visual print artifact review',
  'Historical Logic Verification Result: Source Evidence Only',
].forEach((token) => {
  if (!physicalSurfacesLogicVerification.includes(token)) failures.push(`Physical Surfaces logic verification missing launch-boundary token: ${token}`);
});
[
  ['Physical Surfaces code review', physicalSurfacesCodeReview, 'Production ready.'],
  ['Physical Surfaces validation', physicalSurfacesValidation, '**Ready For:** Vercel deploy + SMB testing'],
  ['Physical Surfaces validation', physicalSurfacesValidation, '## ✅ FINAL VERDICT: SHIP READY'],
  ['Physical Surfaces validation', physicalSurfacesValidation, '## 🚀 PRODUCTION QUALITY GATE: PASS'],
  ['Physical Surfaces validation', physicalSurfacesValidation, '**Status:** SHIP READY'],
  ['Physical Surfaces marketing', physicalSurfacesMarketing, '**Status:** Ready for Use'],
  ['Physical Surfaces marketing', physicalSurfacesMarketing, '**Document Status:** Ready for launch'],
  ['Physical Surfaces logic verification', physicalSurfacesLogicVerification, '**Status:** ✅ **DEPLOYABLE**'],
  ['Physical Surfaces logic verification', physicalSurfacesLogicVerification, 'PRODUCTION READINESS: SAFE'],
  ['Physical Surfaces logic verification', physicalSurfacesLogicVerification, '## FINAL VERDICT: ✅ DEPLOYABLE'],
  ['Physical Surfaces logic verification', physicalSurfacesLogicVerification, 'Physical Surfaces logic verification complete. All 5 flows verified. Zero critical issues.'],
].forEach(([label, content, token]) => {
  if (content.includes(token)) failures.push(`${label} must not keep stale launch-certification token: ${token}`);
});

[
  'PRINT_ASSET_MENU_KIT_INDEX',
  'table_tent: 0',
  'single_table_card: 9',
  'counter_sticker: 1',
  'entrance_poster: 2',
  'menuKitAssetKey',
  'PRINT_ASSET_CATALOG',
  'getPrintAssetById',
].forEach((token) => {
  if (!printAssetCatalog.includes(token)) failures.push(`Print Assets catalog missing token: ${token}`);
});

const printAssetsRoute = fs.readFileSync(path.join(root, 'src/app/(main)/use-menulist/print-assets/page.tsx'), 'utf8');
[
  'FEATURE_FLAGS.ENABLE_PRINT_ASSETS_ROUTE',
  'notFound()',
  '@template/main-app/useMenuList',
  'view="print-assets"',
].forEach((token) => {
  if (!printAssetsRoute.includes(token)) failures.push(`Print Assets route missing token: ${token}`);
});

const printAssetsNavigation = fs.readFileSync(path.join(root, 'src/lib/print-assets/navigation.ts'), 'utf8');
[
  "PRINT_ASSETS_ROUTE = '/use-menulist/print-assets'",
  'buildPrintAssetsUrl',
  'encodeURIComponent(projectId)',
].forEach((token) => {
  if (!printAssetsNavigation.includes(token)) failures.push(`Print Assets navigation helper missing token: ${token}`);
});

const ownerPrintGuidance = fs.readFileSync(path.join(root, 'src/lib/print-assets/ownerPrintGuidance.ts'), 'utf8');
[
  'buildPrintReadinessItems',
  'buildPrintShopHandoffMessage',
  'PRINT_ASSET_REPRINT_GUIDANCE',
  'PRINT_SHOP_FILE_SPECS',
  'hasConfiguredPrintBrandColor',
  'do not need reprint',
].forEach((token) => {
  if (!ownerPrintGuidance.includes(token)) failures.push(`Print Assets owner guidance helper missing token: ${token}`);
});

const qrQuietZoneFiles = [
  'src/lib/menu-card-export/render/renderQr.ts',
  'src/lib/menu-kit/templates/counterStickerTemplate.ts',
  'src/lib/menu-kit/templates/deliveryBagTemplate.ts',
  'src/lib/menu-kit/templates/entrancePosterTemplate.ts',
  'src/lib/menu-kit/templates/googleMapsTemplate.ts',
  'src/lib/menu-kit/templates/instagramStoryTemplate.ts',
  'src/lib/menu-kit/templates/takeawayCardTemplate.ts',
  'src/lib/menu-kit/templates/whatsappStatusTemplate.ts',
  'src/lib/physical-surfaces/stickerGenerator.ts',
  'src/lib/physical-surfaces/tentCardGenerator.ts',
  'src/lib/print-menu-surfaces/templates/singleTableCardTemplate.ts',
  'src/lib/print-menu-surfaces/templates/tableTentTemplate.ts',
  'src/lib/utils/qrCode.ts',
];
qrQuietZoneFiles.forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (/margin:\s*[123]\b/.test(source)) {
    failures.push(`${file} uses a QR quiet zone below four modules`);
  }
  if (
    !source.includes('margin: 4')
    && !source.includes('margin: options?.margin ?? 4')
    && !source.includes('normalizeQrInteger(options?.margin, 4, 0, QR_MARGIN_MAX)')
  ) {
    failures.push(`${file} missing four-module QR quiet zone token`);
  }
});

const menuListBrandingPolicy = fs.readFileSync(path.join(root, 'src/lib/platform/menuListBranding.ts'), 'utf8');
[
  'MENULIST_BRANDING_REMOVAL_PLAN_TYPE = MENULIST_B2C_PLAN_IDS.MULTI_LOCATION',
  'normalizeMenuListPlanType',
  'canRemoveMenuListBranding',
  'resolveMenuListAttributionPolicy',
  'ENABLE_MULTI_LOCATION_MENULIST_BRANDING_REMOVAL',
  'showAttribution',
].forEach((token) => {
  if (!menuListBrandingPolicy.includes(token)) failures.push(`MenuList branding policy missing token: ${token}`);
});

const route = fs.readFileSync(path.join(root, 'src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx'), 'utf8');
[
  'useMenuCardExportController',
  'ProjectSelectorTrigger',
  'ProjectSelectorList',
  'businessProfile?.documentLabel',
  'autoDesign',
  'Auto picked',
  'Pro layout suggestion',
  'Brand look',
  'Layout',
  'printableTheme.label',
  'buildPrintableAssetsUrl',
  'No Firebase writes are used',
].forEach((token) => {
  if (!route.includes(token)) failures.push(`Route missing token: ${token}`);
});

const controller = fs.readFileSync(path.join(root, 'src/hooks/useMenuCardExportController.ts'), 'utf8');
const designAdvisorClient = fs.readFileSync(path.join(root, 'src/services/ai/menuCardExport/getDesignAdviceViaAPI.ts'), 'utf8');
[
  'getExistingProjectsListWithoutLoader',
  'loadedProjectId',
  'renderPreviewModel',
  'buildPrintShopPacket',
  'listLocalMenuCardExports',
  'getMenuCardDesignAdviceViaAPI',
  'adviceCacheRef',
  'autoDesignKeyRef',
  'manualSettingsTouchedRef',
  'resolveAutoPrintDesign',
  'resolveMenuCardBusinessPrintProfile',
  'resolvePrintableAssetStyle',
  "assetTypeId: 'print_menu'",
  'getPrintableTemplateFamily',
  'effectiveSettings',
  'printableThemeSource',
  'autoDesignLabel',
  'autoDesignReason',
  'isMenuCardPresetAvailable',
  'visiblePresets',
  'FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_HISTORY',
  'saveLocalMenuCardExport',
  'MENU_CARD_ADVICE_PLAN_REQUIRED_MESSAGE',
  'MENU_CARD_ADVICE_CAPACITY_MESSAGE',
  'historyStorageScope',
  'resolveLocalExportStorageScope',
  'shareResult === \'cancelled\'',
  "content: 'Share cancelled'",
  "share ? 'Could not share file' : 'Could not create file'",
  'storeRouteKey',
  'currentArtifactScopeRef',
  'currentAdviceSourceHashRef',
  'adviceInFlightRef',
  'artifactInFlightRef',
  'currentAdviceSourceHashRef.current !== requestSourceHash',
  'currentArtifactScopeRef.current !== operationScope',
  'isMenuCardAdvisorPreset(effectiveSettings.preset)',
  'isMenuCardAdvisorStyle(effectiveSettings.styleId)',
  'isMenuCardAdvisorDensity(effectiveSettings.density)',
].forEach((token) => {
  if (!controller.includes(token)) failures.push(`Shared controller missing token: ${token}`);
});
if (controller.includes('getProjectsListWithoutLoader')) {
  failures.push('Cost guard failed: controller must not use the auto-creating project list helper');
}
if (controller.includes('setAdviceError(error.message)')) {
  failures.push('Shared controller must not render raw Menu Card advice exception messages');
}
[
  'settings.preset as any',
  'settings.styleId as any',
  'settings.density as any',
  'shareMenuCardArtifact(artifact as any',
  'downloadMenuCardArtifact(artifact as any',
  'artifact: artifact as any',
].forEach((token) => {
  if (controller.includes(token)) failures.push(`Shared controller must not widen validated export contracts through ${token}`);
});

[
  "import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';",
  'MENU_CARD_DESIGN_ADVISOR_RESPONSE_JSON_MAX_BYTES = 16 * 1024',
  'readMenuCardDesignAdvisorResponseJson',
  'readJsonResponseWithLimit<T>',
  'ai_menu_card_design_advisor_response_parse_failed',
  "'plan_gate'",
  "'recommendation'",
  "getBoundedAiServiceStringContext('projectId'",
  "getBoundedAiServiceStringContext('sourceHash'",
].forEach((token) => {
  if (!designAdvisorClient.includes(token)) failures.push(`Menu Card design-advisor client response parsing missing token: ${token}`);
});
[
  'response.json().catch(() => ({}))',
  'const responseJson = await response.json()',
  'errorJson?.details',
].forEach((token) => {
  if (designAdvisorClient.includes(token)) failures.push(`Menu Card design-advisor client must not use unsafe response parse token: ${token}`);
});

const mobileExportScreen = fs.readFileSync(path.join(root, 'src/components/mobile/menu-card-export/MobileMenuCardExportScreen.tsx'), 'utf8');
[
  'useMenuCardExportController',
  'useMobileProjects',
  'projectSummaries',
  'projectDataById',
  'loadProjectData',
  'handleBack',
  'MobileAntdAppBridge',
  'NavBar',
  'Popup',
  'Create print file',
  'businessProfile?.documentLabel',
  'autoDesign',
  'Auto picked',
  'Pro layout suggestion',
  'Brand look',
  'Layout',
  'printableTheme.label',
  'onOpenPrintAssets',
  'No Firebase writes are used',
  'position: \'fixed\'',
].forEach((token) => {
  if (!mobileExportScreen.includes(token)) failures.push(`Mobile export screen missing token: ${token}`);
});
if ((mobileExportScreen.match(/aria-pressed=\{active\}/g) || []).length !== 3) {
  failures.push('Mobile export screen must expose selected state for job, style, and density choices');
}

const parityForbiddenSurfaceCalls = [
  'renderPdf(',
  'buildPrintShopPacket(',
  'buildPrintSource(',
  'buildPrintSourceHash(',
  'downloadMenuCardArtifact(',
  'saveLocalMenuCardExport(',
  'shareMenuCardArtifact(',
];
[
  { label: 'Dashboard export surface', source: route },
  { label: 'Mobile export surface', source: mobileExportScreen },
].forEach(({ label, source }) => {
  [
    'useMenuCardExportController',
    'createArtifact(false)',
    'createArtifact(true)',
    'updatePreset',
    'updateStyle',
    'updateDensity',
    "updateToggle('includeDescriptions'",
    "updateToggle('includeQr'",
    "updateToggle('includeContactBlock'",
    "updateToggle('includeCoverPage'",
  ].forEach((token) => {
    if (!source.includes(token)) failures.push(`${label} missing shared-output token: ${token}`);
  });
  parityForbiddenSurfaceCalls.forEach((token) => {
    if (source.includes(token)) failures.push(`${label} must not call output pipeline directly: ${token}`);
  });
});

const layoutWrapper = fs.readFileSync(path.join(root, 'src/components/antdComponent/layoutWrapper/index.tsx'), 'utf8');
if (layoutWrapper.includes("'/use-menulist/menu-card-export'")) {
  failures.push('Mobile shell routing guard failed: Print Menu must not be a desktop-only handheld bypass route');
}

const mobileShell = fs.readFileSync(path.join(root, 'src/components/mobile/MobileShell.tsx'), 'utf8');
[
  "'/use-menulist/menu-card-export': { tab: 'more', todayScreen: 'main', moreScreen: 'printMenu' }",
  "'/assets': { tab: 'more', todayScreen: 'main', moreScreen: 'printAssets' }",
  "'/use-menulist/print-assets': { tab: 'more', todayScreen: 'main', moreScreen: 'printAssets' }",
  'SELECTED_PROJECT_DATA_MORE_SCREENS',
  "'printAssets'",
  "'printMenu'",
  'handleOpenPrintAssets',
  "onOpenPrintAssets={() => handleOpenPrintAssets('share')}",
  'handleOpenPrintMenu',
  "onOpenPrintMenu={() => handleOpenPrintMenu('share')}",
].forEach((token) => {
  if (!mobileShell.includes(token)) failures.push(`Mobile shell Print Menu routing missing token: ${token}`);
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
  "mode?: 'full' | 'printAssets'",
  "const isPrintAssetsMode = mode === 'printAssets'",
  'onOpenPrintAssets?: () => void',
  'onOpenPrintAssets',
  'generateMenuKitAsset',
  'buildPrintReadinessItems',
  'buildPrintShopHandoffMessage',
  'PRINT_ASSET_REPRINT_GUIDANCE',
  'PRINTABLE_ASSET_CATALOG_TYPES',
  '[getPrintableTemplateFamily(effectiveThemeId)]',
  'templateFamilyId: effectiveThemeId',
  'renderPrintableAsset',
  "buildPrintableRenderInput('feedback_qr', effectiveThemeId)",
  "outputFormat: 'png'",
  'printableThemeId: effectiveThemeId',
  'selectedPrintableAssetId',
  'availablePrintableTemplateFamilies',
  'printableActionTemplateId',
  'printablePreviewState',
  'PrintableTemplateActionSheet',
  'getMobilePrintableDownloadActionLabel',
  'getMobilePrintableActionFormats',
  'renderPrintableTemplatePreview',
  "return 'png';",
  'supportedOutputFormats',
  'MobilePrintReadinessPanel',
  "handleMenuKitAsset('table_tent', 'table_tent'",
  "handleMenuKitAsset('single_table_card', 'single_table_card'",
  "handleMenuKitAsset('counter_sticker', 'counter_sticker'",
  "handleMenuKitAsset('entrance_poster', 'entrance_poster'",
  'handleOpenMenuCardExport',
  'FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT ? handleOpenMenuCardExport()',
  'onOpenPrintMenu?: () => void',
  'onOpenPrintMenu?.()',
  'const exportData = await getSelectedProjectExportData()',
  'projectData: projectData as any',
  'storeData: storeDetails as any',
  'logoUrl: data.storeLogo',
  'businessCategory: (storeDetails as any)?.businessCategory',
  'brandColor: storeBrandColor',
  'currencyCode: (storeDetails as any)?.currencyCode',
  'downloadBlob(result.zipBlob, result.zipFilename)',
  "if (shareResult === 'cancelled') return;",
  "if (shareResult === 'shared')",
].forEach((token) => {
  if (!mobileShare.includes(token)) failures.push(`Mobile Share entry missing token: ${token}`);
});
[
  'recordLocalPdfDownload(',
  'resolveLocalExportStorageScope(storeDetails as any)',
].forEach((token) => {
  if (!mobileShare.includes(token)) failures.push(`Mobile Share local PDF history missing token: ${token}`);
});
[
  '`menulist_last_pdf_download_${data.projectId}`',
  '`menulist_last_pdf_version_${data.projectId}`',
].forEach((token) => {
  if (mobileShare.includes(token)) failures.push(`Mobile Share must not use project-only PDF history key: ${token}`);
});

if (mobileShare.includes('<iframe') || mobileShare.includes('previewAsset?.isPdf') || mobileShare.includes('isPdf:')) {
  failures.push('Mobile Print Assets preview should render image previews, not embedded PDF iframes');
}
if (mobileShare.includes('result.assets[')) {
  failures.push('Mobile Share must generate individual Menu Kit files by asset key, not result.assets[index]');
}
['tableCount', 'quantityEstimator', 'printQuantity'].forEach((token) => {
  if (mobileShare.includes(token)) failures.push(`Mobile Share must not add print quantity estimation token: ${token}`);
});

const mobileMenu = fs.readFileSync(path.join(root, 'src/components/mobile/screens/MobileMenuScreen.tsx'), 'utf8');
[
  'canOpenMenuCardExport',
  'pendingMenuRef.current?.projectId === projectId',
  'flushPendingMenuPersist',
  'await selectProject(projectId)',
  'onOpenPrintMenu?: () => void',
  'onOpenPrintMenu?.()',
  'onPrintMenu={canOpenMenuCardExport',
].forEach((token) => {
  if (!mobileMenu.includes(token)) failures.push(`Mobile Menu entry missing token: ${token}`);
});

const mobileMenuCommandSheet = fs.readFileSync(path.join(root, 'src/components/mobile/components/MobileMenuCommandSheet.tsx'), 'utf8');
[
  'onPrintMenu?: () => void',
  "const tPrint = useTranslations('MobileShare');",
  "key: 'print-menu'",
  "title: tPrint('menuPdf')",
  "description: tPrint('menuPdfDesc')",
].forEach((token) => {
  if (!mobileMenuCommandSheet.includes(token)) failures.push(`Mobile Menu command sheet missing token: ${token}`);
});
if (mobileMenuCommandSheet.includes("title: 'Print Menu'")) {
  failures.push('Mobile Menu command sheet must not hard-code the localized Print Menu title');
}

const mobileMore = fs.readFileSync(path.join(root, 'src/components/mobile/screens/MobileMoreScreen.tsx'), 'utf8');
[
  'useMobileProjects',
  'MobilePrintAssetsScreen',
  "openSubScreen('printAssets')",
  "subScreen === 'printAssets'",
  "key: 'printAssets'",
  "label: 'QR and print assets'",
  'ENABLE_PRINTABLE_ASSET_TEMPLATES',
  'MobileMenuCardExportScreen',
  "openSubScreen('printMenu')",
  "subScreen === 'printMenu'",
  'initialProjectId={selectedProjectId}',
  "printMenuBackTarget === 'printAssets'",
  "setPrintMenuBackTarget('printAssets')",
  'onOpenPrintAssets={() =>',
  "key: 'printMenu'",
  "label: 'Print Menu'",
  "if (screen === 'printMenu') return canManageDailyActions && FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT;",
].forEach((token) => {
  if (!mobileMore.includes(token)) failures.push(`Mobile More entry missing token: ${token}`);
});
if (mobileMore.includes("setInternalSubScreen(initialScreen);\n        setPrintMenuBackTarget('main');")) {
  failures.push('Mobile More mirrored parent screen updates must not erase the nested Assets return target');
}

if (!mobileExportScreen.includes('{isProjectSheetOpen ? (') || !mobileExportScreen.includes('aria-label="Select menu"')) {
  failures.push('Mobile export project selector must stay unmounted while closed and expose an accessible dialog name');
}

const mobilePrintAssetsScreen = fs.readFileSync(path.join(root, 'src/components/mobile/screens/MobilePrintAssetsScreen.tsx'), 'utf8');
[
  'MobileShareScreen',
  'mode="printAssets"',
  'onBack={onBack}',
  'onOpenDesignEditor={onOpenDesignEditor}',
  'onOpenPrintMenu={onOpenPrintMenu}',
].forEach((token) => {
  if (!mobilePrintAssetsScreen.includes(token)) failures.push(`Mobile Print Assets screen missing token: ${token}`);
});

[
  { label: 'Mobile Share', source: mobileShare },
  { label: 'Mobile Menu', source: mobileMenu },
  { label: 'Mobile More', source: mobileMore },
  { label: 'Mobile Print Assets', source: mobilePrintAssetsScreen },
  { label: 'Mobile Menu Card Export', source: fs.readFileSync(path.join(root, 'src/components/mobile/menu-card-export/MobileMenuCardExportScreen.tsx'), 'utf8') },
].forEach(({ label, source }) => {
  [
    'buildPrintAssetsUrl',
    'buildMenuCardExportUrl',
    "router.push('/use-menulist/print-assets",
    "router.push('/use-menulist/menu-card-export",
    'router.push(buildPrintAssetsUrl',
    'router.push(buildMenuCardExportUrl',
    'window.location.href = `/use-menulist/print-assets',
    'window.location.href = `/use-menulist/menu-card-export',
    "window.location.href = '/use-menulist/print-assets",
    "window.location.href = '/use-menulist/menu-card-export",
    'window.location.assign(`/use-menulist/print-assets',
    'window.location.assign(`/use-menulist/menu-card-export',
    "window.location.assign('/use-menulist/print-assets",
    "window.location.assign('/use-menulist/menu-card-export",
    'window.location.href = buildPrintAssetsUrl',
    'window.location.href = buildMenuCardExportUrl',
    'window.location.assign(buildPrintAssetsUrl',
    'window.location.assign(buildMenuCardExportUrl',
  ].forEach((token) => {
    if (source.includes(token)) failures.push(`${label} must open MobileShell print screens by state/callback, not ${token}`);
  });
});

const preflight = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/preflight/runPrintPreflight.ts'), 'utf8');
if (!preflight.includes('runPrintPreflight')) failures.push('Preflight runner missing runPrintPreflight export');

const artifactMetadata = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/render/artifactMetadata.ts'), 'utf8');
[
  'MENU_CARD_EXPORT_RENDERER_VERSION',
  "menu-card-export-jspdf-v28",
  'buildArtifactFilename',
  'buildPdfDocumentProperties',
  'shortSourceReference',
  'formatArtifactDate',
  'resolveMenuCardBusinessPrintProfile',
  'source.business.businessCategory',
  'source.business.offeringKind',
].forEach((token) => {
  if (!artifactMetadata.includes(token)) failures.push(`Artifact metadata helper missing token: ${token}`);
});

const printSourceHashVersionSource = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/source/buildPrintSourceHash.ts'), 'utf8');
[
  "import { MENU_CARD_EXPORT_RENDERER_VERSION } from '../render/artifactMetadata'",
  'rendererVersion: MENU_CARD_EXPORT_RENDERER_VERSION',
  'tagline: source.business.tagline || null',
  'phone: source.business.phone || null',
  'address: source.business.address || null',
  'decisionSymbols: item.decisionSymbols || []',
].forEach((token) => {
  if (!printSourceHashVersionSource.includes(token)) failures.push(`Print source hash missing renderer-version token: ${token}`);
});

const pdfRenderer = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/render/renderPdf.ts'), 'utf8');
const itemDecisionSymbolRenderer = fs.readFileSync(path.join(root, 'src/components/shared/menu/ItemDecisionSymbolGroup.tsx'), 'utf8');
const itemDecisionSymbolDefinitions = fs.readFileSync(path.join(root, 'src/lib/menu/itemDecisionSymbols.ts'), 'utf8');
const publicMenuRenderer = fs.readFileSync(path.join(root, 'src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx'), 'utf8');
const visualFixtureRenderer = fs.readFileSync(path.join(root, 'scripts/verification/render-menu-card-visual-fixtures.ts'), 'utf8');
if (visualFixtureRenderer.includes('decisionSymbols: [')) {
  failures.push('Print Menu visual fixtures must not hardcode a generic decision-symbol matrix');
}
[
  'resolveItemDecisionSymbolIds',
  'decisionSymbols: resolveItemDecisionSymbolIds(item)',
  'only facts on',
  'this item may create symbols',
].forEach((token) => {
  if (!visualFixtureRenderer.includes(token)) failures.push(`Print Menu visual fixture missing source-derived symbol token: ${token}`);
});
[
  'itemDecisionSymbolsByItem',
  'collectUsedItemDecisionSymbolIds(',
  'menuDecisionSymbolLegend.length > 0',
  'data-menu-decision-symbol-legend="true"',
  '<ItemDecisionSymbolGroup',
  'labelled',
  'symbols={menuDecisionSymbolLegend}',
].forEach((token) => {
  if (!publicMenuRenderer.includes(token)) failures.push(`Public menu missing used-only decision-symbol legend token: ${token}`);
});
[
  'FULL_PAGE_PANEL_EDGE_INSET = 14',
  'FULL_PAGE_PANEL_CONTENT_PADDING = 10',
  'getBalancedFullPageThemePanel',
  'widthInset: FULL_PAGE_PANEL_EDGE_INSET * 2',
  'heightInset: FULL_PAGE_PANEL_EDGE_INSET + bottomInset',
  'getFullPageThemeContentMargin',
  'getFullPageThemeContentTop',
].forEach((token) => {
  if (!pdfRenderer.includes(token)) failures.push(`PDF content-panel geometry missing balanced-inset token: ${token}`);
});
[
  'GiChiliPepper',
  'LuVegan',
  'LuWheat',
  'FaMars',
  'FaVenus',
  'FaVenusMars',
  'FaChildReaching',
  'FaPerson',
  'FaPersonCane',
  'data-item-decision-symbol-visual="lucide-vegan"',
  'data-item-decision-symbol-visual="lucide-wheat"',
  "red: ['#b91c1c', '#f87171']",
  'resolveReadableColor(',
  'backgroundColor?: string',
].forEach((token) => {
  if (!itemDecisionSymbolRenderer.includes(token)) failures.push(`Web decision-symbol renderer missing standard visual token: ${token}`);
});
[
  'maxSymbols = 6',
  'getPublicItemDecisionSymbolLabels',
  "'gluten-free': 'menu.glutenFree'",
  "'spice-hot': 'menu.spiceHot'",
].forEach((token) => {
  if (!itemDecisionSymbolDefinitions.includes(token)) failures.push(`Decision-symbol registry missing production visibility/localization token: ${token}`);
});
[
  'labels={itemDecisionSymbolLabels}',
  'backgroundColor={moodConfig.background}',
  'color={moodConfig.bodyColor}',
].forEach((token) => {
  if (!publicMenuRenderer.includes(token)) failures.push(`Public menu missing localized theme-aware symbol token: ${token}`);
});
[
  "'spice-mild': { id: 'spice-mild', kind: 'spice', label: 'Mild', semanticColor: 'red', spiceMarks: 1 }",
  "'spice-medium': { id: 'spice-medium', kind: 'spice', label: 'Medium', semanticColor: 'red', spiceMarks: 2 }",
  "'spice-hot': { id: 'spice-hot', kind: 'spice', label: 'Hot', semanticColor: 'red', spiceMarks: 3 }",
  "'spice-very-hot': { id: 'spice-very-hot', kind: 'spice', label: 'Very hot', semanticColor: 'red', spiceMarks: 4 }",
].forEach((token) => {
  if (!itemDecisionSymbolDefinitions.includes(token)) failures.push(`Decision-symbol registry must keep every chilli intensity red: ${token}`);
});
if (itemDecisionSymbolDefinitions.includes("semanticColor: 'amber'") || pdfRenderer.includes("definition.semanticColor === 'amber'")) {
  failures.push('Chilli intensity must not fall back to amber in the shared registry or PDF renderer');
}
['FaPepperHot', 'FaSeedling', 'vegan-v-sprout', 'gluten-free-gf', 'LuWheatOff', 'LuFlame', 'LuLeaf', 'definition.letter'].forEach((token) => {
  if (itemDecisionSymbolRenderer.includes(token)) failures.push(`Web decision-symbol renderer must not retain ambiguous legacy visual: ${token}`);
});
[
  'drawPrintLucideVeganSymbol',
  'drawPrintLucideWheatSymbol',
  'Commit the green outline before another symbol changes the active colour.',
  'Commit the neutral/theme outline before another symbol changes the active colour.',
  'drawPrintGameIconChilliSymbol',
  'shared semantic red is preserved.',
  'doc.fill();',
  'drawPrintMarsSymbol',
  'drawPrintVenusSymbol',
  'drawPrintUnisexSymbol',
  'drawPrintPersonSymbol',
  'drawPrintAudienceSymbol',
].forEach((token) => {
  if (!pdfRenderer.includes(token)) failures.push(`PDF decision-symbol renderer missing standard visual token: ${token}`);
});
if (!/function drawPrintLucideVeganSymbol[\s\S]*?doc\.path\(\[[\s\S]*?\]\);\s*\/\/ Commit the green outline[\s\S]*?doc\.stroke\(\);/.test(pdfRenderer)) {
  failures.push('PDF vegan renderer must commit its green outline before another symbol changes colour');
}
if (!/function drawPrintLucideWheatSymbol[\s\S]*?doc\.path\(\[[\s\S]*?\]\);\s*\/\/ Commit the neutral\/theme outline[\s\S]*?doc\.stroke\(\);/.test(pdfRenderer)) {
  failures.push('PDF gluten-free renderer must commit its neutral/theme outline before another symbol changes colour');
}
if (!/function drawPrintGameIconChilliSymbol[\s\S]*?doc\.path\(\[[\s\S]*?\]\);[\s\S]*?shared semantic red is preserved\.[\s\S]*?doc\.fill\(\);/.test(pdfRenderer)) {
  failures.push('PDF chilli renderer must commit its red fill before another symbol changes colour');
}
[
  'drawPrintVeganSymbol',
  'drawPrintGlutenFreeSymbol',
  'drawPrintChilliSymbol',
  "doc.text('GF'",
  "doc.text('V'",
  'const flameWidth',
  'definition.letter',
].forEach((token) => {
  if (pdfRenderer.includes(token)) failures.push(`PDF decision-symbol renderer must not retain ambiguous legacy visual: ${token}`);
});
[
  'fallbackLogoDataUrl: undefined',
  'Every parent-theme fixture exercises the production no-logo',
  "tagline: 'Thoughtful care, beautifully finished'",
  "publicMenuUrl: 'https://aster-oak.menulist.online'",
  "shortUrl: 'aster-oak.menulist.online'",
].forEach((token) => {
  if (!visualFixtureRenderer.includes(token)) failures.push(`Print Menu visual fixture missing truthful all-theme identity token: ${token}`);
});
if (visualFixtureRenderer.includes("themeId === 'terracotta-glow' ? undefined : menuListLogoDataUrl")) {
  failures.push('Print Menu visual fixtures must exercise the truthful no-logo initials contract for every parent theme');
}
const qrImageAliasUses = (pdfRenderer.match(/MENU_CARD_QR_IMAGE_ALIAS/g) || []).length;
if (!pdfRenderer.includes("const MENU_CARD_QR_IMAGE_ALIAS = 'menulist-menu-qr';") || qrImageAliasUses < 4) {
  failures.push('PDF renderer must use one explicit QR image alias at every QR placement to prevent jsPDF image-cache collisions');
}
[
  'getCenteredTrackedTextStartX',
  'drawCenteredTrackedText(',
  'textWidth: doc.getTextWidth(text)',
  'tracked label from its',
  'complete rendered width',
].forEach((token) => {
  if (!pdfRenderer.includes(token)) failures.push(`PDF renderer missing centered tracked-cover boundary: ${token}`);
});
if (/doc\.text\(getHeaderSubtitle\(source\)\.toUpperCase\(\), centerX, labelY, \{[\s\S]{0,180}?charSpace:\s*1\.55/.test(pdfRenderer)) {
  failures.push('PDF renderer must not use jsPDF center alignment for the tracked cover subtitle');
}
[
  'doc.setCreationDate(generatedAt)',
  'doc.setProperties(buildPdfDocumentProperties',
  'logoDataUrlCache',
  'MAX_MENU_CARD_LOGO_CACHE_ENTRIES',
  'isMenuCardLogoRasterSafe(width, height)',
  'cacheLogoDataUrl(url, dataUrl)',
  'normalizeMenuCardLogoUrl(rawUrl)',
  'window.setTimeout(() =>',
  'image.src = \'\';',
  '}, 5000);',
  'if (dataUrl) cacheLogoDataUrl(url, dataUrl);',
  'imageUrlToPngDataUrl(source.business.logoUrl)',
  'doc.addImage(',
  'source.business.brandTokens.accentColor',
  'getVisualStyle',
  'businessProfile.tone',
  'resolveMenuCardBusinessPrintProfile',
  'businessTone === \'product-catalog\'',
  'businessTone === \'service-list\'',
  'getHeaderSubtitle',
  'drawPageBase',
  'drawContentPageBackground',
  'drawCoverPageBackgroundArtwork',
  'drawCraftKitchenPaperTexture',
  'drawFullPageThemeCoverPage',
  'drawFullPageThemeClosingPage',
  'if (isFullPageThemeStyle(style))',
  'getMenuCardBusinessInitials',
  'FULL_PAGE_THEME_INITIALS_MARK_RADIUS_RATIO = 0.48',
  'FULL_PAGE_THEME_INITIALS_FONT_SIZE_RATIO = 0.78',
  'doc.circle(centerX, centerY, boxSize * FULL_PAGE_THEME_INITIALS_MARK_RADIUS_RATIO',
  'setTextRgb(doc, textColorForFill(style.accentColor))',
  'boxSize * FULL_PAGE_THEME_INITIALS_FONT_SIZE_RATIO',
  'getConciseQrLabel',
  'source.business.tagline?.trim()',
  'isCraftKitchenStyle',
  'doc.GState({ opacity })',
  "hasContact ? 'CONTACT & LOCATION' : 'VIEW ONLINE'",
  'hasDedicatedClosingPage',
  'MENU_CARD_CRAFT_KITCHEN_PAGE_PATH',
  'MENU_CARD_THEME_PAGE_PATHS',
  'FULL_PAGE_THEME_IDS',
  'DARK_EDITORIAL_THEME_IDS',
  'FULL_PAGE_THEME_LAYOUTS',
  "'ember-house': {",
  "'coastal-table': {",
  "'sunday-table': {",
  "'counter-rush': {",
  "'roastery-ledger': {",
  "'patisserie-conservatory': {",
  "'gelateria-riviera': {",
  "'ink-vine': {",
  "'salon-atelier': {",
  "'petal-studio': {",
  "'pearl-veil': {",
  "'terracotta-glow': {",
  "'glasshouse-beauty': {",
  "'ritual-sanctuary': {",
  "'eucalyptus-retreat': {",
  "'mineral-spring': {",
  "'lotus-stillness': {",
  "'sunlit-ritual': {",
  "'performance-circuit': {",
  "'rosewater-editorial': {",
  "'mineral-sanctuary': {",
  'panel: { x: 18, y: 10, widthInset: 36, heightInset: 46, color: [247, 241, 236], opacity: 0.74 }',
  'panel: { x: 18, y: 10, widthInset: 36, heightInset: 48, color: [241, 236, 226], opacity: 0.76 }',
  "'noir-studio': {",
  "'bombay-chronicle': {",
  "'japanese-night-luxe': {",
  "'tea-salon-heritage': {",
  "'lankan-block-print': {",
  "'gallery-ledger': {",
  "'vital-current': {",
  "'workshop-atlas': {",
  "'neighbourhood-standard': {",
  "'field-notes': {",
  "'boutique-window': {",
  "'market-label': {",
  "'civic-letterpress': {",
  "'modern-practice': {",
  "'studio-contact-sheet': {",
  "'maker-ledger': {",
  "'clinical-calm': {",
  "'mindful-motion': {",
  "'hospitality-house': {",
  "'future-workshop': {",
  'footerPanelOpacity: 0.86',
  'drawFullPageThemeFooterPanel',
  'const panelHeight = hasDecisionSymbolLegend ? FULL_PAGE_LEGEND_FOOTER_HEIGHT : 19',
  'const FULL_PAGE_LEGEND_BASELINE_SAFE_GAP = 5.2',
  'const FULL_PAGE_LEGEND_FOOTER_HEIGHT = 23',
  'const FULL_PAGE_LEGEND_FOOTER_CONTENT_RECLAIM = 6',
  'const FULL_PAGE_LEGEND_MIN_BOTTOM_RESERVE = 32',
  'footerRuleLowerY + FULL_PAGE_LEGEND_BASELINE_SAFE_GAP',
  'FULL_PAGE_LEGEND_FOOTER_HEIGHT + 1',
  'fullPageBottomReserve',
  'FULL_PAGE_LEGEND_FOOTER_CONTENT_RECLAIM',
  "?? (isDarkEditorialStyle(style) ? 0.92 : undefined)",
  'drawDarkThemeHeaderPanel',
  'if (hasSupportingContent) return descriptionGap * 7',
  'const ITEM_DESCRIPTION_GAP_SCALE = 0.75',
  'return getBaseItemDescriptionGap(settings, style) * ITEM_DESCRIPTION_GAP_SCALE',
  "usesStructuredServiceLayout(style)) return settings.density === 'compact' ? 0.7 : 0.9",
  "isReadableEditorialStyle(style)) return settings.density === 'compact' ? 0.9 : 1.2",
  'SANS_DISPLAY_THEME_IDS',
  'STRUCTURED_SERVICE_THEME_IDS',
  'usesSansDisplayStyle',
  'usesStructuredServiceLayout',
  'getFullPageThemeLayout',
  'getFullPageThemeContentTop(style)',
  'fullPageThemeLayout?.bottomReserve',
  'addFullBleedArtwork',
  'READABLE_EDITORIAL_ITEM_FONT_SIZE',
  'READABLE_EDITORIAL_DESCRIPTION_FONT_SIZE',
  'STRUCTURED_EDITORIAL_ITEM_FONT_SIZE',
  'STRUCTURED_EDITORIAL_DESCRIPTION_FONT_SIZE',
  'getEditorialItemFontSize',
  'getEditorialDescriptionFontSize',
  'getEditorialNameLineHeight',
  'getEditorialDescriptionLineHeight',
  'bodyColor',
  'isReadableEditorialStyle',
  'shouldUseEditorialBackground',
  'MAX_MENU_CARD_EMBEDDED_ARTWORK_DATA_URL_LENGTH',
  "backgroundArtworkDataUrls?.botanicalCorner",
  "backgroundArtworkDataUrls?.botanicalRail",
  "backgroundArtworkDataUrls?.themePage",
  'themeArtworkPaths?.page',
  "'/images/printable-themes/ember-house/universal-background.png'",
  "'/images/printable-themes/coastal-table/universal-background.png'",
  "'/images/printable-themes/sunday-table/universal-background.png'",
  "'/images/printable-themes/counter-rush/universal-background.png'",
  "'/images/printable-themes/roastery-ledger/universal-background.png'",
  "'/images/printable-themes/patisserie-conservatory/universal-background.png'",
  "'/images/printable-themes/gelateria-riviera/universal-background.png'",
  "'/images/printable-themes/salon-atelier/editorial-page-background.png'",
  "'/images/printable-themes/petal-studio/universal-background.png'",
  "'/images/printable-themes/pearl-veil/universal-background.png'",
  "'/images/printable-themes/terracotta-glow/universal-background.png'",
  "'/images/printable-themes/glasshouse-beauty/universal-background.png'",
  "'/images/printable-themes/ritual-sanctuary/editorial-page-background.png'",
  "'/images/printable-themes/eucalyptus-retreat/universal-background.png'",
  "'/images/printable-themes/mineral-spring/universal-background.png'",
  "'/images/printable-themes/lotus-stillness/universal-background.png'",
  "'/images/printable-themes/sunlit-ritual/universal-background.png'",
  "'/images/printable-themes/performance-circuit/editorial-page-background.png'",
  "'/images/printable-themes/neighbourhood-standard/universal-background.png'",
  "'/images/printable-themes/field-notes/universal-background.png'",
  "'/images/printable-themes/boutique-window/universal-background.png'",
  "'/images/printable-themes/market-label/universal-background.png'",
  "'/images/printable-themes/civic-letterpress/universal-background.png'",
  "'/images/printable-themes/modern-practice/universal-background.png'",
  "'/images/printable-themes/studio-contact-sheet/universal-background.png'",
  "'/images/printable-themes/maker-ledger/universal-background.png'",
  "'/images/printable-themes/clinical-calm/universal-background.png'",
  "'/images/printable-themes/mindful-motion/universal-background.png'",
  "'/images/printable-themes/hospitality-house/universal-background.png'",
  "'/images/printable-themes/future-workshop/universal-background.png'",
  'const variant = (contentPageIndex - 1) % 3',
  'firstPageContentTop',
  'getColumnTop',
  'pageIndex === 1',
  'labelLines',
  'getCategoryTitleHeight',
  'minimumStartHeight',
  'drawContinuationHeader',
  'getCoverBackedContentPageTop',
  'firstPageContentTop = getCoverBackedContentPageTop(style)',
  'hasCoverPage\n                ? getCoverBackedContentPageTop(style)',
  'if (layout.coverContentTop) return layout.coverContentTop',
  'coverContentTop: 26',
  'coverContentTop: 24',
  'getContentPageFooterLabel',
  'source.business.name,\n                pageLabel',
  'panel: { x: 18, y: 8, widthInset: 36, heightInset: 38, color: [14, 9, 5], opacity: 0.78 }',
  'drawCoverPage',
  'MAX_MENU_CARD_EMBEDDED_LOGO_DATA_URL_LENGTH',
  "fallbackLogoDataUrl.startsWith('data:image/png;base64,')",
  'settings.includeCoverPage === true',
  'hasCoverPage && page === 1',
  'resolveMenuCardColumnCount(settings, categories)',
  "style.categoryMode === 'boxed' ? 6 : 4",
  'drawPrintDecisionSymbolCluster',
  'drawPrintDecisionSymbolLegend',
  'getMenuDecisionSymbolLegend',
  'item.decisionSymbols',
  'postNameGap',
  'paperColor',
  'categoryMode',
  'itemTone',
  'drawDottedLeader',
  'readableCurrencyPrefix',
  'Number.isInteger(numericPrice)',
  'doc.getTextWidth(price)',
  'drawPdfMenuListAttribution',
  'resolveMenuListAttributionPolicy',
  'source.business.activePlanType',
  'MENU_LIST_MENU_ATTRIBUTION_TEXT',
  'createMenuListLogoMarkDataUrl',
  'Menu updated ${formatArtifactDate(updated)}',
  'settings.includeUpdatedDate',
  'buildArtifactFilename({ source, settings, template, sourceHash, extension: \'pdf\', generatedAt })',
].forEach((token) => {
  if (!pdfRenderer.includes(token)) failures.push(`PDF renderer missing metadata/naming token: ${token}`);
});
[
  'drawCraftKitchenClosingPage',
  'drawTerracottaGlowCoverPage',
  'drawTerracottaGlowClosingPage',
  'isTerracottaGlowStyle',
  'isBotanicalHeritageStyle',
].forEach((token) => {
  if (pdfRenderer.includes(token)) failures.push(`PDF renderer retains retired single-theme identity branch: ${token}`);
});
[
  [/['"]ember-house['"]:\s*\{[\s\S]{0,300}?margin: 34[\s\S]{0,300}?contentTop: 50[\s\S]{0,300}?bottomReserve: 72/, 'Ember House must preserve its fire-art copy field'],
  [/['"]coastal-table['"]:\s*\{[\s\S]{0,300}?margin: 34[\s\S]{0,300}?contentTop: 48[\s\S]{0,300}?bottomReserve: 72/, 'Coastal Table must preserve its marine-art copy field'],
  [/['"]sunday-table['"]:\s*\{[\s\S]{0,300}?margin: 36[\s\S]{0,300}?contentTop: 52[\s\S]{0,300}?bottomReserve: 78/, 'Sunday Table must preserve its bistro-art copy field'],
  [/['"]counter-rush['"]:\s*\{[\s\S]{0,300}?margin: 38[\s\S]{0,300}?contentTop: 50[\s\S]{0,300}?bottomReserve: 76/, 'Counter Rush must preserve its fast-casual copy field'],
  [/['"]roastery-ledger['"]:\s*\{[\s\S]{0,260}?margin: 36[\s\S]{0,260}?contentTop: 50[\s\S]{0,260}?bottomReserve: 82/, 'Roastery Ledger must preserve its coffee-art copy field'],
  [/['"]patisserie-conservatory['"]:\s*\{[\s\S]{0,260}?margin: 42[\s\S]{0,260}?contentTop: 58[\s\S]{0,260}?bottomReserve: 108/, 'Patisserie Conservatory must preserve its pastry-art copy field'],
  [/['"]gelateria-riviera['"]:\s*\{[\s\S]{0,260}?margin: 44[\s\S]{0,260}?contentTop: 52[\s\S]{0,260}?bottomReserve: 94/, 'Gelateria Riviera must preserve its gelato-art copy field'],
  [/['"]salon-atelier['"]:\s*\{[\s\S]{0,180}?margin: 34[\s\S]{0,180}?contentTop: 48[\s\S]{0,180}?bottomReserve: 80/, 'Salon Atelier must preserve its editorial copy field'],
  [/['"]petal-studio['"]:\s*\{[\s\S]{0,180}?margin: 34[\s\S]{0,180}?contentTop: 50[\s\S]{0,180}?bottomReserve: 84/, 'Petal Studio must preserve its beauty copy field'],
  [/['"]pearl-veil['"]:\s*\{[\s\S]{0,180}?margin: 38[\s\S]{0,180}?contentTop: 54[\s\S]{0,180}?bottomReserve: 82/, 'Pearl Veil must preserve its bridal beauty copy field'],
  [/['"]terracotta-glow['"]:\s*\{[\s\S]{0,180}?margin: 36[\s\S]{0,180}?contentTop: 52[\s\S]{0,180}?bottomReserve: 106/, 'Terracotta Glow must preserve its lower artwork copy field'],
  [/['"]glasshouse-beauty['"]:\s*\{[\s\S]{0,180}?margin: 43[\s\S]{0,180}?contentTop: 56[\s\S]{0,180}?bottomReserve: 106/, 'Glasshouse Garden must preserve its architectural-art copy field'],
  [/['"]ritual-sanctuary['"]:\s*\{[\s\S]{0,180}?margin: 40[\s\S]{0,180}?contentTop: 54[\s\S]{0,180}?bottomReserve: 104/, 'Ritual Sanctuary must preserve its ritual-object copy field'],
  [/['"]eucalyptus-retreat['"]:\s*\{[\s\S]{0,180}?margin: 38[\s\S]{0,180}?contentTop: 54[\s\S]{0,180}?bottomReserve: 112/, 'Eucalyptus Retreat must preserve its ritual copy field'],
  [/['"]mineral-spring['"]:\s*\{[\s\S]{0,180}?margin: 42[\s\S]{0,180}?contentTop: 58[\s\S]{0,180}?bottomReserve: 94/, 'Mineral Spring must preserve its water-art copy field'],
  [/['"]lotus-stillness['"]:\s*\{[\s\S]{0,180}?margin: 42[\s\S]{0,180}?contentTop: 58[\s\S]{0,180}?bottomReserve: 116/, 'Lotus Stillness must preserve its floral copy field'],
  [/['"]sunlit-ritual['"]:\s*\{[\s\S]{0,220}?margin: 40[\s\S]{0,220}?contentTop: 70[\s\S]{0,220}?bottomReserve: 112[\s\S]{0,220}?headerY: 40/, 'Sunlit Ritual must preserve its hospitality copy field and clear the upper botanical art'],
  [/['"]performance-circuit['"]:\s*\{[\s\S]{0,180}?margin: 36[\s\S]{0,180}?contentTop: 50[\s\S]{0,180}?bottomReserve: 106/, 'Performance Circuit must preserve its training-art copy field'],
  [/['"]neighbourhood-standard['"]:\s*\{[\s\S]{0,260}?margin: 32[\s\S]{0,260}?contentTop: 48[\s\S]{0,260}?bottomReserve: 64/, 'Neighbourhood Standard must preserve its service copy field'],
  [/['"]field-notes['"]:\s*\{[\s\S]{0,260}?margin: 34[\s\S]{0,260}?contentTop: 48[\s\S]{0,260}?bottomReserve: 66/, 'Field Notes must preserve its practical-service copy field'],
  [/['"]boutique-window['"]:\s*\{[\s\S]{0,260}?margin: 37[\s\S]{0,260}?contentTop: 52[\s\S]{0,260}?bottomReserve: 70/, 'Boutique Window must preserve its retail copy field'],
  [/['"]market-label['"]:\s*\{[\s\S]{0,260}?margin: 36[\s\S]{0,260}?contentTop: 50[\s\S]{0,260}?bottomReserve: 72/, 'Market Label must preserve its retail copy field'],
  [/['"]civic-letterpress['"]:\s*\{[\s\S]{0,260}?margin: 36[\s\S]{0,260}?contentTop: 50[\s\S]{0,260}?bottomReserve: 62/, 'Civic Letterpress must preserve its professional copy field'],
  [/['"]modern-practice['"]:\s*\{[\s\S]{0,260}?margin: 32[\s\S]{0,260}?contentTop: 46[\s\S]{0,260}?bottomReserve: 58/, 'Modern Practice must preserve its professional copy field'],
  [/['"]studio-contact-sheet['"]:\s*\{[\s\S]{0,260}?margin: 38[\s\S]{0,260}?contentTop: 50[\s\S]{0,260}?bottomReserve: 68/, 'Studio Contact Sheet must preserve its creative copy field'],
  [/['"]maker-ledger['"]:\s*\{[\s\S]{0,260}?margin: 36[\s\S]{0,260}?contentTop: 50[\s\S]{0,260}?bottomReserve: 72/, 'Maker Ledger must preserve its creative copy field'],
  [/['"]clinical-calm['"]:\s*\{[\s\S]{0,260}?margin: 32[\s\S]{0,260}?contentTop: 46[\s\S]{0,260}?bottomReserve: 58/, 'Clinical Calm must preserve its health copy field'],
  [/['"]mindful-motion['"]:\s*\{[\s\S]{0,260}?margin: 34[\s\S]{0,260}?contentTop: 48[\s\S]{0,260}?bottomReserve: 64/, 'Mindful Motion must preserve its wellness copy field'],
  [/['"]hospitality-house['"]:\s*\{[\s\S]{0,260}?margin: 36[\s\S]{0,260}?contentTop: 50[\s\S]{0,260}?bottomReserve: 70/, 'Hospitality House must preserve its guest-service copy field'],
  [/['"]future-workshop['"]:\s*\{[\s\S]{0,260}?margin: 36[\s\S]{0,260}?contentTop: 48[\s\S]{0,260}?bottomReserve: 64/, 'Future Workshop must preserve its technical copy field'],
].forEach(([pattern, failure]) => {
  if (!pattern.test(pdfRenderer)) failures.push(failure);
});
['roastery-ledger', 'patisserie-conservatory', 'gelateria-riviera'].forEach((themeId) => {
  const footerPattern = new RegExp(`['"]${themeId}['"]:\\s*\\{[\\s\\S]{0,360}?footerPanelOpacity: 0\\.92`);
  if (!footerPattern.test(pdfRenderer)) failures.push(`${themeId} must preserve its protected footer panel`);
});
if ((pdfRenderer.match(/footerPanelOpacity: 0\.86/g) || []).length !== 2) {
  failures.push('PDF renderer must protect both Vital Current and Workshop Atlas footer contrast');
}
if (!/if \(price\) \{[\s\S]*?doc\.setFont\('helvetica', 'bold'\);[\s\S]*?doc\.setFontSize\(itemFontSize\);[\s\S]*?doc\.text\(price,/.test(pdfRenderer)) {
  failures.push('PDF renderer must reset the price font and size after drawing item decision symbols');
}

const columnResolver = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/layout/resolveColumnCount.ts'), 'utf8');
[
  "settings.preset === 'whatsapp' || settings.styleId === 'premium'",
  "countMenuCardItems(categories) >= 40 ? 3 : 2",
].forEach((token) => {
  if (!columnResolver.includes(token)) failures.push(`Menu Card column resolver missing quality token: ${token}`);
});
if (pdfRenderer.includes('doc.text(sourceHash')) {
  failures.push('PDF renderer should not print the source hash in the visible footer');
}

const legacyMenuPdfGenerator = fs.readFileSync(path.join(root, 'src/lib/export/menuPdfGenerator.ts'), 'utf8');
const featureRegistry = fs.readFileSync(path.join(root, 'src/config/features.ts'), 'utf8');
if (featureRegistry.includes('ENABLE_PDF_SURFACE')) {
  failures.push('The always-on legacy PDF adapter must not advertise a no-op feature flag');
}
[
  'Compatibility wrapper for older "Menu PDF" buttons',
  "renderPdf(source, settings)",
  'buildPrintSource({',
  'resolveAutoPrintDesign(initialSource, preset)',
  'resolveLegacyMenuPdfIncludeQr(',
  'normalizeMenuCardQrDestination(menuUrl)',
  'normalizeLegacyMenuPdfOptions',
  'projectLegacyStoreData',
  'normalizeMenuCardLogoUrl',
  "throw new Error('Invalid Menu PDF input')",
  'storeData?: Record<string, any>',
  'projectData?: Record<string, any>',
  'logoUrl?: string',
  'brandColor?: string',
  'currencyCode?: string',
  'businessCategory?: string',
  'activePlanType?: string | null',
  'snapshotHash: artifact.sourceHash',
].forEach((token) => {
  if (!legacyMenuPdfGenerator.includes(token)) failures.push(`Legacy Menu PDF bridge missing premium-renderer token: ${token}`);
});
const legacyMenuPdfQrBoundary = fs.readFileSync(path.join(root, 'scripts/verification/test-legacy-menu-pdf-qr-boundary.ts'), 'utf8');
[
  "resolveLegacyMenuPdfIncludeQr('https://sample-cafe.menulist.online/menu', undefined, true)",
  "resolveLegacyMenuPdfIncludeQr(invalid, true, true), false",
].forEach((token) => {
  if (!legacyMenuPdfQrBoundary.includes(token)) failures.push(`Legacy Menu PDF QR regression missing token: ${token}`);
});
[
  'new jsPDF',
  'const ACCENT',
  'MENU PDF GENERATOR\\n *',
].forEach((token) => {
  if (legacyMenuPdfGenerator.includes(token)) failures.push(`Legacy Menu PDF bridge must not keep old standalone renderer token: ${token}`);
});

const desktopUseMenuList = fs.readFileSync(path.join(root, 'src/components/templates/main-app/useMenuList/index.tsx'), 'utf8');
const useMenuListDiagnostics = fs.readFileSync(path.join(root, 'src/components/templates/main-app/useMenuList/useMenuListDiagnostics.ts'), 'utf8');
[
  "view = 'overview'",
  "view === 'print-assets'",
  'useRouter',
  'buildPrintableAssetsUrl',
  'buildMenuCardExportUrl',
  'router.push(buildPrintableAssetsUrl',
  'router.push(buildMenuCardExportUrl',
  "router.push('/use-menulist')",
  'generateMenuKitAsset',
  'buildPrintReadinessItems',
  'buildPrintShopHandoffMessage',
  'PRINT_ASSET_REPRINT_GUIDANCE',
  'handlePreviewAsset',
  'PrintReadinessPanel',
  "handleDownloadAsset('table_tent'",
  "handleDownloadAsset('single_table_card'",
  "handleDownloadAsset('counter_sticker'",
  "handleDownloadAsset('entrance_poster'",
  'projectData: projectData as any',
  'storeData: storeDetails as any',
  'logoUrl: data.storeLogo',
  'businessCategory: (storeDetails as any)?.businessCategory',
  'brandColor: storeBrandColor',
  'currencyCode: (storeDetails as any)?.currencyCode',
  'renderPrintableAssetDownloadFiles',
  'handleDownloadThemedFeedbackQr',
  'printableThemeId: printableTheme.id',
  'templateFamilyId: printableTheme.id',
  'downloadBlob(result.zipBlob, result.zipFilename)',
].forEach((token) => {
  if (!desktopUseMenuList.includes(token)) failures.push(`Desktop Use MenuList print copy missing brand PDF context token: ${token}`);
});
if (desktopUseMenuList.includes('result.assets[')) {
  failures.push('Desktop Use MenuList must generate individual Menu Kit files by asset key, not result.assets[index]');
}
if (desktopUseMenuList.includes('generateBrandedFeedbackQrCode')) {
  failures.push('Desktop Use MenuList Feedback QR must use the canonical themed printable renderer');
}
if (mobileShare.includes('generateBrandedFeedbackQrCode')) {
  failures.push('Mobile Share Feedback QR must use the canonical themed printable renderer');
}
[
  { label: 'Desktop Use MenuList', source: desktopUseMenuList },
  { label: 'Use MenuList diagnostics helper', source: useMenuListDiagnostics },
].forEach(({ label, source }) => {
  [
    'console.error(',
    'console.warn(',
    'console.log(',
    'console.debug(',
  ].forEach((token) => {
    if (source.includes(token)) failures.push(`${label} must not use direct runtime console logging: ${token}`);
  });
});
[
  'use_menulist_load_failed',
  'use_menulist_starter_signal_failed',
  'use_menulist_copy_failed',
  'use_menulist_open_failed',
  'use_menulist_menu_kit_download_failed',
  'use_menulist_menu_kit_asset_download_failed',
  'use_menulist_menu_kit_asset_preview_failed',
  'use_menulist_qr_download_failed',
  'use_menulist_pdf_download_failed',
  'use_menulist_feedback_qr_download_failed',
].forEach((token) => {
  if (!desktopUseMenuList.includes(token)) failures.push(`Desktop Use MenuList missing bounded diagnostic code: ${token}`);
});
[
  "openIsolatedBrowserUrl(url)",
  "getBoundedUseMenuListStringContext('url', url)",
  "getBoundedUseMenuListStringContext('label', label)",
].forEach((token) => {
  if (!desktopUseMenuList.includes(token)) failures.push(`Desktop Use MenuList missing bounded open handoff token: ${token}`);
});
if (desktopUseMenuList.includes("openIsolatedBrowserUrl(url, '_blank');")) {
  failures.push("Desktop Use MenuList must not open output links without noopener,noreferrer");
}
[
  'secureError',
  "'[Use MenuList] Operation failed'",
  'getBoundedUseMenuListStringContext',
  'sourceErrorName',
  'sourceErrorCode',
  'sourceStatusCode',
].forEach((token) => {
  if (!useMenuListDiagnostics.includes(token)) failures.push(`Use MenuList diagnostics helper missing token: ${token}`);
});
[
  "[UseMenuList] Error loading data:",
].forEach((token) => {
  if (desktopUseMenuList.includes(token)) failures.push(`Desktop Use MenuList must not keep old raw diagnostic string: ${token}`);
});
[
  'window.location.href = buildPrintAssetsUrl',
  'window.location.href = buildMenuCardExportUrl',
  'window.location.assign(buildPrintAssetsUrl',
  'window.location.assign(buildMenuCardExportUrl',
  'window.location.href = `/use-menulist/menu-card-export',
  'href="/use-menulist"',
].forEach((token) => {
  if (desktopUseMenuList.includes(token)) failures.push(`Desktop Use MenuList must use App Router transitions, not ${token}`);
});
['tableCount', 'quantityEstimator', 'printQuantity'].forEach((token) => {
  if (desktopUseMenuList.includes(token)) failures.push(`Desktop Use MenuList must not add print quantity estimation token: ${token}`);
});

const projectShareModal = fs.readFileSync(path.join(root, 'src/components/templates/main-app/projects/b2cView/shareModal/index.tsx'), 'utf8');
[
  'storeData?: Record<string, any>',
  'currencyCode?: string',
  'businessCategory?: string',
  'brandColor?: string',
  'storeData,',
  'logoUrl: storeLogo',
  'businessCategory,',
  'brandColor,',
  'resolvePrintableAssetStyle',
  "assetTypeId: 'print_menu'",
  'preferences: storeData?.printableAssetStylePreferences',
  'printableThemeId,',
].forEach((token) => {
  if (!projectShareModal.includes(token)) failures.push(`Project Share modal print copy missing brand PDF context token: ${token}`);
});
[
  'logExportFailure',
  'project_share_structured_export_failed',
  'project_share_pdf_generation_failed',
  "getBoundedExportStringContext('shareUrl'",
  "getBoundedExportStringContext('currencyCode'",
].forEach((token) => {
  if (!projectShareModal.includes(token)) failures.push(`Project Share modal export diagnostics missing token: ${token}`);
});
[
  'resolveLocalExportStorageScope',
  'readLocalPdfDownloadAt',
  'setLastPdfDownloadAt(readLocalPdfDownloadAt(pdfHistoryScope, projectId))',
  'recordLocalPdfDownload(pdfHistoryScope, projectId, pdfResult.snapshotHash)',
  'setLastPdfDownloadAt(Date.now())',
].forEach((token) => {
  if (!projectShareModal.includes(token)) failures.push(`Project Share modal local PDF history missing token: ${token}`);
});
[
  '`menulist_last_pdf_download_${projectId}`',
  '`menulist_last_pdf_version_${projectId}`',
].forEach((token) => {
  if (projectShareModal.includes(token)) failures.push(`Project Share modal must not use project-only PDF history key: ${token}`);
});
[
  "console.error('[ShareModal] Structured export failed:'",
  "console.error('[ShareModal] PDF generation failed:'",
].forEach((token) => {
  if (projectShareModal.includes(token)) failures.push(`Project Share modal must not use raw export diagnostic ${token}`);
});

const menuKitSection = fs.readFileSync(path.join(root, 'src/components/templates/main-app/projects/b2cView/shareModal/MenuKitSection.tsx'), 'utf8');
[
  'generateMenuKitAsset',
  'downloadBlob(result.zipBlob, result.zipFilename)',
  "if (shareResult === 'cancelled') return;",
  "if (shareResult === 'shared')",
  'messageApi.success(`${label} shared`)',
  "handleShareAsset('instagram_story'",
  "handleShareAsset('whatsapp_status'",
  "handleShareAsset('google_maps'",
].forEach((token) => {
  if (!menuKitSection.includes(token)) failures.push(`Project Share Menu Kit section missing key-based asset token: ${token}`);
});
if (!menuKitSection.includes("if (actionMap[assetKey]) trackMenuKitDownload(actionMap[assetKey]!);")) {
  failures.push('Project Share Menu Kit download fallback must retain successful asset delivery tracking');
}
if (!mobileShare.includes('if (trackingAction) void trackMenuKitDownload(trackingAction);')) {
  failures.push('Mobile Share Menu Kit download fallback must retain successful asset delivery tracking');
}
[
  'logExportFailure',
  'project_share_menu_kit_generation_failed',
  'project_share_menu_kit_asset_generation_failed',
  'getMenuKitExportLogContext',
  "getBoundedExportStringContext('menuUrl'",
  'hasMenuModifiedOn',
  'assetKey',
].forEach((token) => {
  if (!menuKitSection.includes(token)) failures.push(`Project Share Menu Kit section diagnostics missing token: ${token}`);
});
if (menuKitSection.includes('result.assets[')) {
  failures.push('Project Share Menu Kit section must generate individual files by asset key, not result.assets[index]');
}
[
  { label: 'Desktop Use MenuList', source: desktopUseMenuList },
  { label: 'Mobile Share', source: mobileShare },
  { label: 'Project Share Menu Kit section', source: menuKitSection },
].forEach(({ label, source }) => {
  if (source.includes('downloadBlob(result.zipBlob, `${safeName}_MenuKit.zip`)')) {
    failures.push(`${label} complete Menu Kit ZIP downloads must use result.zipFilename instead of a hand-rolled store-name filename`);
  }
});
if (printableAssetRenderer.includes('filename: `${safeName(input.storeName)}_MenuKit')) {
  failures.push('Printable asset complete Menu Kit ZIP downloads must use result.zipFilename instead of a hand-rolled store-name filename');
}
[
  'secureError(',
  "'[MenuKit] Generation failed'",
  'new Error(String(error))',
  'error instanceof Error ? error',
].forEach((token) => {
  if (menuKitSection.includes(token)) failures.push(`Project Share Menu Kit section must not use raw diagnostic token: ${token}`);
});

const menuKitBrandTokens = fs.readFileSync(path.join(root, 'src/lib/menu-kit/brandTokens.ts'), 'utf8');
[
  'resolveMenuKitBrandTokens',
  'resolveStoreBrandColor',
  'qrDark',
  "qrDark: '#111827'",
  'qrLight',
  'softAccent',
  'gradientFrom',
  'gradientTo',
  'normalizeMenuKitBrandColor',
].forEach((token) => {
  if (!menuKitBrandTokens.includes(token)) failures.push(`Menu Kit brand token helper missing token: ${token}`);
});

const canvasPrimitives = fs.readFileSync(path.join(root, 'src/lib/menu-kit/canvasPrimitives.ts'), 'utf8');
[
  'fillRoundedRect',
  'fillRoundedVerticalGradient',
  'fillVerticalGradient',
  'fitCanvasText',
  'truncateCanvasText',
  'stripDecorativeStatusSymbols',
].forEach((token) => {
  if (!canvasPrimitives.includes(token)) failures.push(`Menu Kit canvas primitive missing token: ${token}`);
});

const platformAttribution = fs.readFileSync(path.join(root, 'src/lib/menu-kit/platformAttribution.ts'), 'utf8');
[
  "MENU_LIST_DOMAIN = 'menulist.ai'",
  'Powered by MenuList |',
  'Menu powered by MenuList |',
  'drawMenuListAttribution',
  'resolveMenuListAttributionPolicy',
  'activePlanType',
  'createMenuListLogoMarkDataUrl',
].forEach((token) => {
  if (!platformAttribution.includes(token)) failures.push(`MenuList platform attribution helper missing token: ${token}`);
});

const qrCodeUtil = fs.readFileSync(path.join(root, 'src/lib/utils/qrCode.ts'), 'utf8');
[
  'generateBrandedQrCodeDataUrl',
  'resolveMenuKitBrandTokens',
  'loadLogo',
  'brand.qrDark',
  'brand.surface',
  'fillVerticalGradient',
  'drawLogoBadge',
  'splitStoreName',
  'width * 1.5',
  '#d7dde3',
  'fitCanvasText',
  'drawMenuListAttribution',
  'activePlanType',
  "const safeSuffix = suffix",
  "return safeSuffix ? `${sanitized || 'menu'}-${safeSuffix}` : sanitized || 'menu'",
].forEach((token) => {
  if (!qrCodeUtil.includes(token)) failures.push(`Branded QR helper missing token: ${token}`);
});
if (qrCodeUtil.includes('drawQrCornerBrackets')) {
  failures.push('Branded QR helper must not use colored QR corner brackets');
}

const feedbackQrCode = fs.readFileSync(path.join(root, 'src/lib/utils/feedbackQrCode.ts'), 'utf8');
if (!feedbackQrCode.includes('generateBrandedFeedbackQrCode')) {
  failures.push('Feedback QR utility missing branded feedback QR helper');
}
if (!feedbackQrCode.includes("return `${sanitized || 'menu'}-feedback-qr`")) {
  failures.push('Feedback QR utility missing non-Latin/empty filename fallback');
}

const businessTypeLabels = fs.readFileSync(path.join(root, 'src/lib/menu-kit/businessTypeLabels.ts'), 'utf8');
['printCardTitle', 'CURRENT MENU', 'CURRENT SERVICES', 'CURRENT CATALOG', 'CURRENT OFFERINGS', 'Scan to view current'].forEach((token) => {
  if (!businessTypeLabels.includes(token)) failures.push(`Business-type labels missing print card token: ${token}`);
});
['officialUpper', 'OFFICIAL MENU', 'OFFICIAL SERVICES', 'OFFICIAL CATALOG', 'OFFICIAL OFFERINGS'].forEach((token) => {
  if (businessTypeLabels.includes(token)) failures.push(`Business-type labels must not expose self-declared official print token: ${token}`);
});

const mobileQrSheet = fs.readFileSync(path.join(root, 'src/components/mobile/components/MobileQrCodeSheet.tsx'), 'utf8');
[
  'generateBrandedQrCodeDataUrl',
  'brandColor?: string',
  'activePlanType?: string | null',
  'logoUrl?: string',
  'storeName?: string',
].forEach((token) => {
  if (!mobileQrSheet.includes(token)) failures.push(`Mobile QR sheet missing branded output token: ${token}`);
});
if (mobileQrSheet.includes('generateQrCodeDataUrl')) {
  failures.push('Mobile QR sheet must not use the raw QR generator for downloadable output');
}

const publicMenuListAttribution = fs.readFileSync(path.join(root, 'src/components/customer/PublicMenuListAttribution.tsx'), 'utf8');
[
  'resolveMenuListAttributionPolicy',
  'activePlanType?: string | null',
  'return null',
].forEach((token) => {
  if (!publicMenuListAttribution.includes(token)) failures.push(`Public MenuList attribution missing premium policy token: ${token}`);
});

[
  {
    label: 'Print Menu table tent',
    file: 'src/lib/print-menu-surfaces/templates/tableTentTemplate.ts',
    delegatesPaper: true,
  },
  {
    label: 'Print Menu single table card',
    file: 'src/lib/print-menu-surfaces/templates/singleTableCardTemplate.ts',
    delegatesPaper: true,
  },
  {
    label: 'Menu Kit counter sticker',
    file: 'src/lib/menu-kit/templates/counterStickerTemplate.ts',
  },
  {
    label: 'Menu Kit entrance poster',
    file: 'src/lib/menu-kit/templates/entrancePosterTemplate.ts',
  },
  {
    label: 'Menu Kit delivery bag sticker',
    file: 'src/lib/menu-kit/templates/deliveryBagTemplate.ts',
  },
  {
    label: 'Menu Kit takeaway card',
    file: 'src/lib/menu-kit/templates/takeawayCardTemplate.ts',
  },
  {
    label: 'Menu Kit Instagram story',
    file: 'src/lib/menu-kit/templates/instagramStoryTemplate.ts',
  },
  {
    label: 'Menu Kit WhatsApp status',
    file: 'src/lib/menu-kit/templates/whatsappStatusTemplate.ts',
  },
  {
    label: 'Menu Kit Google Maps upload',
    file: 'src/lib/menu-kit/templates/googleMapsTemplate.ts',
  },
  {
    label: 'Menu Kit placement guide',
    file: 'src/lib/menu-kit/templates/placementGuideTemplate.ts',
    noQr: true,
  },
  {
    label: 'Physical tent card',
    file: 'src/lib/physical-surfaces/tentCardGenerator.ts',
  },
  {
    label: 'Physical counter sticker',
    file: 'src/lib/physical-surfaces/stickerGenerator.ts',
  },
].forEach(({ label, file, noQr, delegatesPaper }) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (
    !source.includes('resolveMenuKitBrandTokens')
    && !source.includes('resolvePrintableTemplateBrandTokens')
    && !source.includes('loadMenuKitThemeSurface')
  ) {
    failures.push(`${label} missing premium brand token resolver`);
  }
  [...(noQr ? [] : ['brand.qrDark'])].forEach((token) => {
    if (!source.includes(token)) failures.push(`${label} missing premium brand token: ${token}`);
  });
  if (
    !delegatesPaper
    && !source.includes('brand.paper')
    && !source.includes('brand.paperRgb')
    && !source.includes('drawMenuKitThemeBackground')
  ) {
    failures.push(`${label} missing premium brand paper token`);
  }
});

[
  {
    label: 'Print Menu card face visual treatment',
    file: 'src/lib/print-menu-surfaces/templates/printMenuCardFace.ts',
  },
].forEach(({ label, file }) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  [
    'drawPrintMenuCardFace',
    'actionLabel',
    'instructionLabel',
    'fillRoundedVerticalGradient',
    'brand.gradientFrom',
    'brand.gradientTo',
    'brand.paper',
    'drawLogoBadge',
    '#d7dde3',
    'splitStoreName',
    'getStoreInitials',
    'drawMenuListAttribution',
  ].forEach((token) => {
    if (!source.includes(token)) failures.push(`${label} missing token: ${token}`);
  });
  if (source.includes('`650 ${printMenuMm')) {
    failures.push(`${label} must use standard canvas font weights, not 650`);
  }
  ['OUR ${menuLabel}', 'Scan to view ${menuLabel'].forEach((token) => {
    if (source.includes(token)) failures.push(`${label} must receive dynamic labels from caller, not compose ${token}`);
  });
  if (source.includes('drawQrCornerBrackets')) {
    failures.push(`${label} must not use colored QR corner brackets`);
  }
});

[
  {
    label: 'Print Menu table tent physical treatment',
    file: 'src/lib/print-menu-surfaces/templates/tableTentTemplate.ts',
    tokens: ['generatePrintMenuTableTent', 'SHEET_W_MM = 210', 'SHEET_H_MM = 148', 'FACE_W_MM', 'margin: 4', 'brand.qrDark', 'drawPrintMenuCardFace', 'labels.printCardTitle', 'labels.scanToView', 'rotate(Math.PI)'],
  },
  {
    label: 'Print Menu single table card physical treatment',
    file: 'src/lib/print-menu-surfaces/templates/singleTableCardTemplate.ts',
    tokens: ['generatePrintMenuSingleTableCard', 'CARD_W_MM = 105', 'CARD_H_MM = 148', 'orientation: \'portrait\'', 'margin: 4', 'brand.qrDark', 'drawPrintMenuCardFace', 'labels.printCardTitle', 'labels.scanToView'],
  },
].forEach(({ label, file, tokens }) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  tokens.forEach((token) => {
    if (!source.includes(token)) failures.push(`${label} missing token: ${token}`);
  });
});

const menuKitTableTentWrapper = fs.readFileSync(path.join(root, 'src/lib/menu-kit/templates/tableTentTemplate.ts'), 'utf8');
[
  'Compatibility wrapper',
  'generatePrintMenuTableTent as generateTableTent',
  'print-menu-surfaces',
].forEach((token) => {
  if (!menuKitTableTentWrapper.includes(token)) failures.push(`Menu Kit table tent wrapper missing token: ${token}`);
});

const menuKitGenerator = fs.readFileSync(path.join(root, 'src/lib/menu-kit/menuKitGenerator.ts'), 'utf8');
[
  '../print-menu-surfaces/templates/tableTentTemplate',
  '../print-menu-surfaces/templates/singleTableCardTemplate',
  'MENU_KIT_ASSET_DEFINITIONS',
  'generateMenuKitAsset',
  'renderMenuKitAsset',
  'buildMenuKitSafeName',
  'buildMenuKitZipFilename',
  'normalizeMenuKitInput',
  'enrichedInput: { ...normalizedInput, menuUrl: validatedUrl, _logo: logo }',
  'prepared.enrichedInput.storeName',
  'resolveMenuKitZipTemplateFamilyId(prepared.enrichedInput)',
  "key: 'table_tent'",
  "key: 'single_table_card'",
  'TableTent_A5_Fold.pdf',
  'Table Tent (A5 fold)',
  'SingleTableCard_A6.pdf',
  'Single Table / Counter Card (A6)',
  'shareBrowserFile',
  'Promise<BrowserFileShareResult>',
].forEach((token) => {
  if (!menuKitGenerator.includes(token)) failures.push(`Menu Kit generator missing Print Menu Surfaces token: ${token}`);
});
[
  'enrichedInput: { ...input, menuUrl: validatedUrl, _logo: logo }',
  'buildPrintInstructions(input.storeName, labels)',
].forEach((token) => {
  if (menuKitGenerator.includes(token)) failures.push(`Menu Kit generator retains unprojected input token: ${token}`);
});

const browserFileShare = fs.readFileSync(path.join(root, 'src/lib/export/browserFileShare.ts'), 'utf8');
[
  "BrowserFileShareResult = 'shared' | 'unsupported' | 'cancelled'",
  "typeof navigator.share !== 'function'",
  "typeof navigator.canShare !== 'function'",
  "typeof File === 'undefined'",
  "error.name === 'AbortError'",
  "return 'cancelled'",
  "error.name === 'NotAllowedError'",
  "return 'unsupported'",
  'throw error',
].forEach((token) => {
  if (!browserFileShare.includes(token)) failures.push(`Browser file-share boundary missing token: ${token}`);
});

const localExportHistory = fs.readFileSync(path.join(root, 'src/lib/export/localExportHistory.ts'), 'utf8');
[
  'resolveLocalExportStorageScope',
  'resolveStorePermissionScopeDocumentIdAliases([',
  'source?.tenantId,',
  'source?.tId,',
  'source?.storeId,',
  'source?.sId,',
  '`${tenantScope.documentId}:${storeScope.documentId}`',
  'readLocalPdfDownloadAt',
  'recordLocalPdfDownload',
  "localPdfKey('download', storageScope, projectId)",
  'storage rejection must not become a download failure',
].forEach((token) => {
  if (!localExportHistory.includes(token)) failures.push(`Local export-history boundary missing token: ${token}`);
});

const artifactStorage = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/repository/artifactStorage.ts'), 'utf8');
['shareBrowserFile', 'Promise<BrowserFileShareResult>'].forEach((token) => {
  if (!artifactStorage.includes(token)) failures.push(`Menu Card artifact share boundary missing token: ${token}`);
});

const menuCardHistoryRepository = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/repository/menuCardExportRepository.ts'), 'utf8');
[
  'storageScope: string',
  'encodeURIComponent(storageScope)',
  'projectMenuCardLocalHistoryRecord',
  'Number.isSafeInteger(record.pageCount)',
  'isCanonicalPastIsoTimestamp(record.generatedAt)',
  'record.projectId !== projectId',
  'localStorage.removeItem(key(projectId, storageScope))',
  'localStorage.setItem(key(params.projectId, params.storageScope)',
  'must never turn a successful export into an owner-visible failure',
].forEach((token) => {
  if (!menuCardHistoryRepository.includes(token)) failures.push(`Menu Card local-history boundary missing token: ${token}`);
});
[
  "admittedInput.assetTypeId === 'complete_menu_kit'",
  'filename: result.zipFilename',
].forEach((token) => {
  if (!printableAssetRenderer.includes(token)) failures.push(`Printable asset renderer missing Menu Kit ZIP filename token: ${token}`);
});

[
  {
    label: 'Menu Kit Instagram story visual treatment',
    file: 'src/lib/menu-kit/templates/instagramStoryTemplate.ts',
  },
  {
    label: 'Menu Kit WhatsApp status visual treatment',
    file: 'src/lib/menu-kit/templates/whatsappStatusTemplate.ts',
  },
].forEach(({ label, file }) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  ['fillVerticalGradient', 'fitCanvasText', 'stripDecorativeStatusSymbols', 'brand.qrDark'].forEach((token) => {
    if (!source.includes(token)) failures.push(`${label} missing token: ${token}`);
  });
});

[
  {
    label: 'Menu Kit delivery bag text bounds',
    file: 'src/lib/menu-kit/templates/deliveryBagTemplate.ts',
    tokens: ['truncateCanvasText(ctx, storeName', 'truncateCanvasText(ctx, shortLink'],
  },
  {
    label: 'Menu Kit takeaway card text bounds',
    file: 'src/lib/menu-kit/templates/takeawayCardTemplate.ts',
    tokens: ['truncateCanvasText(ctx, storeName', 'truncateCanvasText(ctx, shortLink'],
  },
  {
    label: 'Menu Kit Google Maps text bounds',
    file: 'src/lib/menu-kit/templates/googleMapsTemplate.ts',
    tokens: ['wrapCanvasText(ctx, storeName, maxWidth, 3)', 'truncateCanvasText(ctx, shortLink'],
  },
].forEach(({ label, file, tokens }) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  tokens.forEach((token) => {
    if (!source.includes(token)) failures.push(`${label} missing token: ${token}`);
  });
});

[
  {
    label: 'Print Menu card face',
    file: 'src/lib/print-menu-surfaces/templates/printMenuCardFace.ts',
    tokens: ['drawMenuListAttribution', 'MENU_LIST_MENU_ATTRIBUTION_TEXT', 'activePlanType'],
  },
  {
    label: 'Menu Kit counter sticker',
    file: 'src/lib/menu-kit/templates/counterStickerTemplate.ts',
    tokens: ['drawMenuListAttribution', 'activePlanType'],
  },
  {
    label: 'Menu Kit entrance poster',
    file: 'src/lib/menu-kit/templates/entrancePosterTemplate.ts',
    tokens: ['drawMenuListAttribution', 'MENU_LIST_MENU_ATTRIBUTION_TEXT', 'activePlanType'],
  },
  {
    label: 'Menu Kit delivery bag sticker',
    file: 'src/lib/menu-kit/templates/deliveryBagTemplate.ts',
    tokens: ['drawMenuListAttribution', 'activePlanType'],
  },
  {
    label: 'Menu Kit takeaway card',
    file: 'src/lib/menu-kit/templates/takeawayCardTemplate.ts',
    tokens: ['drawMenuListAttribution', 'MENU_LIST_ATTRIBUTION_TEXT', 'activePlanType'],
  },
  {
    label: 'Menu Kit Instagram story',
    file: 'src/lib/menu-kit/templates/instagramStoryTemplate.ts',
    tokens: ['drawMenuListAttribution', 'MENU_LIST_ATTRIBUTION_TEXT', 'activePlanType'],
  },
  {
    label: 'Menu Kit WhatsApp status',
    file: 'src/lib/menu-kit/templates/whatsappStatusTemplate.ts',
    tokens: ['drawMenuListAttribution', 'MENU_LIST_ATTRIBUTION_TEXT', 'activePlanType'],
  },
  {
    label: 'Menu Kit Google Maps upload',
    file: 'src/lib/menu-kit/templates/googleMapsTemplate.ts',
    tokens: ['drawMenuListAttribution', 'MENU_LIST_MENU_ATTRIBUTION_TEXT', 'activePlanType', 'labels.printCardTitle', 'labels.updatedRegularly'],
  },
  {
    label: 'Menu Kit placement guide',
    file: 'src/lib/menu-kit/templates/placementGuideTemplate.ts',
    tokens: ['drawMenuListAttribution', 'activePlanType'],
  },
  {
    label: 'Physical tent card',
    file: 'src/lib/physical-surfaces/tentCardGenerator.ts',
    tokens: ['createMenuListLogoMarkDataUrl', 'MENU_LIST_ATTRIBUTION_TEXT', 'resolveMenuListAttributionPolicy', 'activePlanType', 'normalizePhysicalSurfaceQrUrl', 'QRCode.toDataURL(normalizedQrUrl'],
  },
  {
    label: 'Physical counter sticker',
    file: 'src/lib/physical-surfaces/stickerGenerator.ts',
    tokens: ['drawMenuListAttribution', 'activePlanType', 'normalizePhysicalSurfaceQrUrl', 'QRCode.toCanvas(qrCanvas, normalizedQrUrl', 'reject(new Error("Failed to encode counter sticker PNG"))'],
  },
].forEach(({ label, file, tokens }) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  tokens.forEach((token) => {
    if (!source.includes(token)) failures.push(`${label} missing MenuList logo/name/domain attribution token: ${token}`);
  });
  if (source.includes('labels.officialUpper')) {
    failures.push(`${label} must not render self-declared official print copy`);
  }
});

[
  {
    label: 'Desktop Use MenuList',
    source: desktopUseMenuList,
    tokens: ['resolveStoreBrandColor', 'generateBrandedQrCodeDataUrl', 'renderPrintableAssetDownloadFiles', 'handleDownloadThemedFeedbackQr', 'templateFamilyId: printableTheme.id', 'brandColor: storeBrandColor', 'activePlanType: (storeDetails as any)?.activePlanType'],
  },
  {
    label: 'Mobile Share',
    source: mobileShare,
    tokens: ['resolveStoreBrandColor', 'renderPrintableAssetDownloadFiles', "buildPrintableRenderInput('feedback_qr', effectiveThemeId)", 'brandColor={storeBrandColor}', 'brandColor: storeBrandColor', 'activePlanType: (storeDetails as any)?.activePlanType'],
  },
  {
    label: 'Project Share modal',
    source: projectShareModal,
    tokens: ['generateBrandedQrCodeDataUrl', 'downloadQrCode', 'resolveMenuKitBrandTokens', 'brandColor={brandColor}', 'activePlanType'],
  },
].forEach(({ label, source, tokens }) => {
  tokens.forEach((token) => {
    if (!source.includes(token)) failures.push(`${label} missing branded downloadable output token: ${token}`);
  });
});
[
  { label: 'Desktop Use MenuList', source: desktopUseMenuList },
  { label: 'Mobile Share', source: mobileShare },
].forEach(({ label, source }) => {
  if (source.includes("data.storeName.replace(/\\s+/g, '-')")) {
    failures.push(`${label} feedback QR filenames must use getQrCodeFilename instead of raw store-name whitespace replacement`);
  }
});

const obpLinkCard = fs.readFileSync(path.join(root, 'src/components/templates/main-app/businessSettings/OBPLinkCard.tsx'), 'utf8');
['generateBrandedQrCodeDataUrl', 'resolveStoreBrandColor', 'logoUrl: (storeDetails as any)?.logo', 'activePlanType: (storeDetails as any)?.activePlanType'].forEach((token) => {
  if (!obpLinkCard.includes(token)) failures.push(`OBP link card missing branded QR download token: ${token}`);
});
if (obpLinkCard.includes('querySelector')) {
  failures.push('OBP link card QR download must use branded QR helper, not canvas querySelector snapshot');
}

const feedbackQrDownload = fs.readFileSync(path.join(root, 'src/components/templates/main-app/feedback/FeedbackQrDownload.tsx'), 'utf8');
['generateBrandedFeedbackQrCode', 'resolveStoreBrandColor', 'logoUrl: (storeDetails as any)?.logo', 'activePlanType: (storeDetails as any)?.activePlanType'].forEach((token) => {
  if (!feedbackQrDownload.includes(token)) failures.push(`Feedback QR download missing branded token: ${token}`);
});
if (feedbackQrDownload.includes('generateFeedbackQrCode(projectId')) {
  failures.push('Feedback QR download must not call the raw feedback QR generator');
}

const projectsIndex = fs.readFileSync(path.join(root, 'src/components/templates/main-app/projects/index.tsx'), 'utf8');
[
  'storeData={storeDetails as any}',
  'currencyCode={storeDetails?.currencyCode || (storeDetails as any)?.currency}',
  'businessCategory={storeDetails?.businessCategory}',
  'brandColor={(storeDetails as any)?.publicPresence?.accentColor',
].forEach((token) => {
  if (!projectsIndex.includes(token)) failures.push(`Project Share modal parent missing brand PDF context token: ${token}`);
});

const printInstructions = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/printShop/buildPrintInstructions.ts'), 'utf8');
[
  'Source summary:',
  'Source reference:',
  'resolveMenuCardBusinessPrintProfile',
  'profile.documentLabel',
  'MENU_CARD_EXPORT_RENDERER_VERSION',
  'shortSourceReference',
].forEach((token) => {
  if (!printInstructions.includes(token)) failures.push(`Print instructions missing provenance token: ${token}`);
});

const qrTestChecklist = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/printShop/buildQrTestChecklist.ts'), 'utf8');
[
  'resolveMenuCardBusinessPrintProfile',
  'profile.documentLabel.toLowerCase()',
  'current ${label}',
].forEach((token) => {
  if (!qrTestChecklist.includes(token)) failures.push(`QR checklist missing business profile token: ${token}`);
});

const printSource = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/source/buildPrintSource.ts'), 'utf8');
['project?.files', 'file?.extractedData?.data', 'project?.extractedData?.data'].forEach((token) => {
  if (!printSource.includes(token)) failures.push(`Print source missing real project data shape support: ${token}`);
});
[
  'resolveBusinessCategory',
  'getBusinessCatalogKind',
  'getBusinessOfferingKind',
  'resolveMenuCardBusinessPrintProfile',
  'store?.businessType',
  'store?.businessCategory',
  'printProfile.qrLabel',
  'printProfile.fallbackTitle',
  'store?.publicPresence?.accentColor',
  "readOwnField(store, 'logo')",
  "readOwnField(store, 'logoUrl')",
  'store?.currencyCode',
  'brandTokens',
  'resolveStorePermissionScopeDocumentIdAliases',
  'resolveProjectUpdatedAt(project)',
  'resolveProjectId(project)',
  'normalizeMenuCardLogoUrl',
  "parsed.protocol !== 'https:' && parsed.protocol !== 'http:'",
  'parsed.username',
  'parsed.password',
].forEach((token) => {
  if (!printSource.includes(token)) failures.push(`Print source missing OBP brand reuse token: ${token}`);
});

const qrDestination = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/source/buildQrDestination.ts'), 'utf8');
[
  'normalizeMenuCardQrDestination',
  "parsed.protocol !== 'https:'",
  "parsed.protocol !== 'http:'",
  'parsed.username',
  'parsed.password',
].forEach((token) => {
  if (!qrDestination.includes(token)) failures.push(`QR destination boundary missing token: ${token}`);
});

const qrPreflight = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/preflight/checkQrSafety.ts'), 'utf8');
if (!qrPreflight.includes('normalizeMenuCardQrDestination(source.qr.destinationUrl)')) {
  failures.push('QR preflight must use the credential-free HTTP(S) destination boundary');
}

const qrRenderer = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/render/renderQr.ts'), 'utf8');
[
  'normalizeMenuCardQrDestination(value)',
  "throw new Error('Invalid QR destination URL')",
].forEach((token) => {
  if (!qrRenderer.includes(token)) failures.push(`QR renderer boundary missing token: ${token}`);
});

const printSanitizer = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/source/sanitizeMenuForPrint.ts'), 'utf8');
[
  'MENU_CARD_PRINT_TEXT_LIMITS',
  'normalizeBoundedText',
  'readOwnField',
  'snapshotArray',
  'resolveScalarId',
  '`category-${index}`',
  'normalizeCategoryIcon',
  'includeCategoryIcons',
].forEach((token) => {
  if (!printSanitizer.includes(token)) failures.push(`Print sanitizer boundary missing token: ${token}`);
});

[
  'const maxDescriptionLines =',
  'Math.min((doc.splitTextToSize(desc, width - 4) as string[]).length, maxDescriptionLines)',
  'expandPrintOptionSegments(',
  'PRINT_OPTION_SEGMENT_SIZE',
  'getPrintAttributeLayouts(',
].forEach((token) => {
  if (!pdfRenderer.includes(token)) failures.push(`PDF layout estimate boundary missing token: ${token}`);
});
if (!printSanitizer.includes('PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_ATTRIBUTES_PER_ITEM')) {
  failures.push('Print option preservation boundary must use the public item option cap');
}
[
  'item.attributes.slice(0, 6)',
  '`+ ${attribute.name}',
  "doc.text('OPTIONS'",
].forEach((token) => {
  if (pdfRenderer.includes(token)) failures.push(`PDF renderer must not silently truncate or mislabel neutral options: ${token}`);
});

const brandTokens = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/source/buildBrandTokens.ts'), 'utf8');
[
  '[0-9a-fA-F]{3}',
  'expanded',
  'toLowerCase()',
].forEach((token) => {
  if (!brandTokens.includes(token)) failures.push(`Brand token helper missing hex normalization token: ${token}`);
});

const printSourceHash = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/source/buildPrintSourceHash.ts'), 'utf8');
[
  'logoUrl: source.business.logoUrl || null',
  'brandColor: source.business.brandColor || null',
  'businessType: source.business.businessType || null',
  'businessCategory: source.business.businessCategory || null',
  'catalogKind: source.business.catalogKind || null',
  'offeringKind: source.business.offeringKind || null',
  'currency: source.menu.currency || null',
  'currencyCode: source.menu.currencyCode || null',
  'icon: category.icon || null',
].forEach((token) => {
  if (!printSourceHash.includes(token)) failures.push(`Print source hash missing brand freshness token: ${token}`);
});

const categoryIconRenderer = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/render/renderCategoryIcon.ts'), 'utf8');
[
  'normalizePrintableCategoryIcon',
  'createPrintableCategoryIconDataUrl',
  'normalizeCategoryIcon',
  'URL.revokeObjectURL(objectUrl)',
].forEach((token) => {
  if (!categoryIconRenderer.includes(token)) failures.push(`Category icon renderer missing bounded raster token: ${token}`);
});
[
  'createPrintableCategoryIconDataUrl',
  'categoryIconDataUrls',
  'CATEGORY_TITLE_ICON_SIZE',
  'Boolean(categoryIconDataUrl)',
].forEach((token) => {
  if (!pdfRenderer.includes(token)) failures.push(`PDF renderer missing category icon layout token: ${token}`);
});

const businessPrintProfiles = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/templates/businessPrintProfiles.ts'), 'utf8');
[
  'food-menu',
  'service-list',
  'product-catalog',
  'professional-guide',
  'wellness-list',
  'documentLabel',
  'qrLabel',
  'fallbackTitle',
].forEach((token) => {
  if (!businessPrintProfiles.includes(token)) failures.push(`Business print profile missing token: ${token}`);
});

const autoPrintDesign = fs.readFileSync(path.join(root, 'src/lib/menu-card-export/templates/autoPrintDesign.ts'), 'utf8');
[
  'resolveAutoPrintDesign',
  'getMenuShape',
  'product-catalog',
  'service-list',
  'professional-guide',
  'whatsapp',
  'buildDefaultSettings(preset, styleId)',
].forEach((token) => {
  if (!autoPrintDesign.includes(token)) failures.push(`Auto print design missing token: ${token}`);
});

const apiSchemas = fs.readFileSync(path.join(root, 'src/lib/validation/apiSchemas.ts'), 'utf8');
[
  'autoDesignLabel',
  'autoDesignReason',
  'businessProfile',
  'offeringKind',
].forEach((token) => {
  if (!apiSchemas.includes(token)) failures.push(`AI advisor schema missing auto-design token: ${token}`);
});

const advisorPrompt = fs.readFileSync(path.join(root, 'src/app/api/menu-card-export/design-advisor/prompt.ts'), 'utf8');
[
  'const PROMPT_INPUT_TEXT_MAX_LENGTH = 300;',
  'const PROMPT_INPUT_LIST_ITEM_MAX_LENGTH = 120;',
  'const PROMPT_INPUT_LIST_MAX_ITEMS = 20;',
  'function sanitizePromptText(',
  ".replace(/[\\u0000-\\u001f\\u007f]/g, ' ')",
  ".replace(/[{}<>`$\\\\]/g, '')",
  'function buildPromptPayload(',
  'JSON.stringify(promptPayload.sourceSummary)',
  'JSON.stringify(promptPayload.preflightWarnings)',
  'autoDesignLabel',
  'autoDesignReason',
  'businessProfile',
].forEach((token) => {
  if (!advisorPrompt.includes(token)) failures.push(`AI advisor prompt missing auto-design token: ${token}`);
});
[
  'JSON.stringify(payload.sourceSummary)',
  'JSON.stringify(payload.preflightWarnings)',
  '`Source hash: ${payload.sourceHash}`',
].forEach((token) => {
  if (advisorPrompt.includes(token)) failures.push(`AI advisor prompt must not use raw prompt payload token: ${token}`);
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
  'isValidFirestoreDocumentId',
  'normalizeMenuCardDesignAdvisorSessionScopeDocumentId',
  'const tenantScope = normalizeMenuCardDesignAdvisorSessionScopeDocumentId(session.tId);',
  'const storeScope = normalizeMenuCardDesignAdvisorSessionScopeDocumentId(session.sId);',
  'const tenantId = tenantScope.numericId;',
  'const storeId = storeScope.numericId;',
  'checkAIOperationLimit',
  'getActiveSubscriptionForStore',
  'hasAllowedAdvisorPlan',
  'checkAICapacity',
  'genAIClient.models.generateContent',
  'normalizeMenuCardDesignAdvice',
  'finalizeAiOperationAccounting',
  'capacitySubscription: capacityCheck.subscription',
  'FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_PRINT_SHOP',
].forEach((token) => {
  if (!advisorRoute.includes(token)) failures.push(`AI advisor route missing token: ${token}`);
});
[
  'const tenantId = Number(session.tId);',
  'const storeId = Number(session.sId);',
  'if (!Number.isFinite(tenantId) || !Number.isFinite(storeId))',
].forEach((token) => {
  if (advisorRoute.includes(token)) failures.push(`AI advisor route must not use loose session scope token: ${token}`);
});
[
  'menu_card_design_advisor_provider_response_parse_failed',
  'MAX_MENU_CARD_DESIGN_ADVISOR_PARSE_DIAGNOSTICS',
  'reportedMenuCardDesignAdvisorParseFailures',
  'logMenuCardDesignAdvisorParseFailure',
  'let recommendation: MenuCardDesignAdvisorRecommendation;',
  "fallbackPolicy: 'return_layout_suggestion_failed'",
  'candidateLength: context.candidateLength',
  'trimmedTextLength: context.trimmedTextLength',
  'hasObjectFragment: context.hasObjectFragment',
  "stage: 'object_fragment'",
  "stage: 'object_fragment_missing'",
  "stage: 'empty_response'",
].forEach((token) => {
  if (!advisorRoute.includes(token)) failures.push(`AI advisor provider-response parse diagnostics missing token: ${token}`);
});
[
  "} catch {\n        const firstBrace = cleaned.indexOf('{');",
  'responseTextSummary: getPreviewText(responseText, 400)',
].forEach((token) => {
  if (advisorRoute.includes(token)) failures.push(`AI advisor route must not keep unsafe/silent provider-response parser token: ${token}`);
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
console.log('- PDF output reuses OBP brand color, store logo, and brand-aware local hashes');
console.log('- PDF output uses store currency with PDF-safe symbols and dynamic price width');
console.log('- PDF output uses business-type-aware labels and visual profiles for food, service, retail, professional, and wellness SMBs');
console.log('- Auto print design picks a style, density, and safe toggles before any AI/provider call');
console.log('- PDF output uses physical-menu page styling, borders, section treatments, and price leaders');
console.log('- Printable PDF, QR, Menu Kit, and physical-surface outputs include MenuList logo/name/domain attribution');
console.log('- PDF metadata, deterministic filenames, and print-shop source summary exist');
console.log('- Local history exists');
console.log('- Desktop and mobile screens use the shared export controller');
console.log('- Dashboard and mobile output actions use the same controller pipeline');
console.log('- Share modal export and PDF failures use bounded diagnostics');
console.log('- Dedicated mobile Print Menu screen exists');
console.log('- Mobile Share, Menu, and More entry points open the MobileShell Print Menu screen');
console.log('- Mobile Print Menu stays inside the PWA shell without route bypass or forced reloads');
console.log('- Dedicated Print Assets route, catalog, and mobile shell screen exist');
console.log('- Individual Menu Kit asset downloads use key-based single-asset generation');
console.log('- Print Assets readiness, preview, print-shop handoff, and reprint guidance use shared client-side helpers');
console.log('- Pro/Multi-location AI advisor is guarded by plan, capacity, and operation logging');
console.log('- No export-storage API route or artifact Firebase write path was added');
