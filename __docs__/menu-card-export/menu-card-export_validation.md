# Menu Card Export — Validation Report

**Status:** Validated implementation evidence; not current launch certification
**Validated:** June 3, 2026
**Boundary Reviewed:** July 16, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated Menu Card Export evidence only. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, Digital Menu Output Constitution checks for print/menu outputs, `npm run verify:menu-card-export`, authenticated desktop/mobile browser QA, visual PDF and print-shop artifact review, provider smoke for the AI advisor where enabled, applicable target deploy evidence, and production-host smoke.

---

## Launch Boundary

This June 2026 validation report preserves source, cost, route, authenticated demo-runtime, and artifact evidence for Menu Card Export. It is not current release approval.

Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, Digital Menu Output Constitution checks for print/menu outputs, authenticated desktop/mobile browser QA, visual PDF and print-shop artifact review, provider smoke for the AI advisor where enabled, target deploy evidence, and production-host smoke.

## July 16 Browser Delivery And Multi-Store Cross-Check

- Menu Card Export and Menu Kit share `src/lib/export/browserFileShare.ts`: `shared`, `unsupported`, and `cancelled` are distinct outcomes. Cancellation does not download, track success, or add history; unsupported file sharing downloads; real failures use existing error paths.
- Menu Card history and compatibility-PDF freshness markers use tenant/store/project-scoped device keys. Project-only legacy keys are intentionally not read because their owning store cannot be proven.
- Device storage writes are best-effort after delivery. Quota/private-mode rejection cannot overwrite a successful download/share acknowledgement.
- Store identity is part of the controller reload dependency, including the equal-project-ID outlet-switch case.
- Remote logo work and PDF.js CDN work are bounded to five seconds with safe logo omission or local PDF.js fallback.
- Empty/non-Latin-only QR filename labels use stable `menu` fallbacks.
- `npm run test:print-export-browser-boundaries`, `npm run verify:menu-card-export`, `npm run verify:menu-export`, `npm run verify:printable-asset-templates`, `npm run verify:communication-kit-boundary`, `npm run verify:print-share-tools`, `npm run verify:qr-link-health-check`, and `npm run verify:menu-pdf-cleanup-check` pass.

No export persistence, Firestore/Storage schema, rule, index, Cloud Function, server artifact route, or owner setting was added.

## Engineering Checklist Verification

| Checklist Item | Status | Evidence |
| --- | --- | --- |
| Dedicated route exists | PASS | `src/app/(main)/use-menulist/menu-card-export/page.tsx:1` |
| Feature flags added | PASS | `src/config/features.ts:1683` |
| Firebase cost optimized by default | PASS | `src/config/features.ts:1677`, `scripts/verification/verify-menu-card-export.js:63`, `scripts/verification/verify-menu-card-export.js:65` |
| AI advisor is Pro/Multi-location only | PASS | `src/config/features.ts:1687`, `src/config/features.ts:1688`, `src/app/api/menu-card-export/design-advisor/route.ts:144` |
| AI advisor blocks before provider for non-Pro/Multi-location | PASS | `src/app/api/menu-card-export/design-advisor/route.ts:144`, `src/app/api/menu-card-export/design-advisor/route.ts:145`, `src/app/api/menu-card-export/design-advisor/route.ts:146` |
| AI advisor validates bounded request/response | PASS | `src/lib/validation/apiSchemas.ts:422`, `src/lib/menu-card-export/ai/designAdvisor.ts:32`, `src/lib/menu-card-export/ai/designAdvisor.ts:71` |
| AI advisor is capacity-gated and metered after success | PASS | `src/app/api/menu-card-export/design-advisor/route.ts:153`, `src/app/api/menu-card-export/design-advisor/route.ts:176`, `src/app/api/menu-card-export/design-advisor/route.ts:220`, `src/app/api/menu-card-export/design-advisor/route.ts:221` |
| AI advisor reuses plan-gate subscription for capacity | PASS | `src/app/api/menu-card-export/design-advisor/route.ts:153`, `src/lib/ai/capacityCheck.ts:118` |
| AI advisor UI requires owner apply action | PASS | `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:222`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:256`, `src/hooks/useMenuCardExportController.ts:446` |
| Project summary read is no-create | PASS | `src/database/projects/index.ts:1267`, `src/database/projects/index.ts:1308`, `src/hooks/useMenuCardExportController.ts:157` |
| Shared project selector is used for multi-menu stores | PASS | `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:144`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:145` |
| Route caches selected project reads per session | PASS | `src/hooks/useMenuCardExportController.ts:106`, `src/hooks/useMenuCardExportController.ts:217`, `src/hooks/useMenuCardExportController.ts:230` |
| Route blocks stale project/menu mixing while switching | PASS | `src/hooks/useMenuCardExportController.ts:98`, `src/hooks/useMenuCardExportController.ts:251`, `src/hooks/useMenuCardExportController.ts:253` |
| Route reads selected menu once and computes preview client-side | PASS | `src/hooks/useMenuCardExportController.ts:228`, `src/hooks/useMenuCardExportController.ts:254`, `src/hooks/useMenuCardExportController.ts:307` |
| Auto print design chooses style, density, and safe toggles before owner action | PASS | `src/lib/menu-card-export/templates/autoPrintDesign.ts:31`, `src/lib/menu-card-export/templates/autoPrintDesign.ts:47`, `src/lib/menu-card-export/templates/autoPrintDesign.ts:54`, `src/lib/menu-card-export/templates/autoPrintDesign.ts:73`, `src/lib/menu-card-export/templates/autoPrintDesign.ts:81` |
| Auto print design is applied once per content/business shape and preserves manual edits | PASS | `src/hooks/useMenuCardExportController.ts:104`, `src/hooks/useMenuCardExportController.ts:276`, `src/hooks/useMenuCardExportController.ts:293`, `src/hooks/useMenuCardExportController.ts:336`, `src/hooks/useMenuCardExportController.ts:343` |
| Auto-picked state is visible on desktop and mobile | PASS | `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:193`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:207`, `src/components/mobile/menu-card-export/MobileMenuCardExportScreen.tsx:215`, `src/components/mobile/menu-card-export/MobileMenuCardExportScreen.tsx:237` |
| AI advisor receives deterministic baseline and business profile context | PASS | `src/hooks/useMenuCardExportController.ts:385`, `src/hooks/useMenuCardExportController.ts:388`, `src/lib/validation/apiSchemas.ts:436`, `src/app/api/menu-card-export/design-advisor/prompt.ts:17` |
| Preflight exists before export | PASS | `src/lib/menu-card-export/preflight/runPrintPreflight.ts:13`, `src/hooks/useMenuCardExportController.ts:322`, `src/hooks/useMenuCardExportController.ts:466`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:315` |
| PDF generation is client-side | PASS | `src/lib/menu-card-export/render/renderPdf.ts:579` |
| Legacy `generateMenuPdf()` delegates to premium renderer | PASS | `src/lib/export/menuPdfGenerator.ts` |
| Use MenuList legacy print copy passes brand/project context | PASS | `src/components/templates/main-app/useMenuList/index.tsx` |
| Mobile Share legacy print copy passes mobile project/store context | PASS | `src/components/mobile/screens/MobileShareScreen.tsx` |
| Project Share modal legacy print copy passes store context | PASS | `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx`, `src/components/templates/main-app/projects/index.tsx` |
| PDF source reuses OBP brand color and store logo | PASS | `src/lib/menu-card-export/source/buildPrintSource.ts:40`, `src/lib/menu-card-export/source/buildPrintSource.ts:49`, `src/lib/menu-card-export/source/buildPrintSource.ts:116`, `src/lib/menu-card-export/source/buildPrintSource.ts:131` |
| PDF source resolves business type/category from shared taxonomy | PASS | `src/lib/menu-card-export/source/buildPrintSource.ts:1`, `src/lib/menu-card-export/source/buildPrintSource.ts:117`, `src/lib/menu-card-export/source/buildPrintSource.ts:122`, `src/lib/menu-card-export/source/buildPrintSource.ts:134` |
| Business print profiles cover food, service, retail, professional, and wellness output | PASS | `src/lib/menu-card-export/templates/businessPrintProfiles.ts:3`, `src/lib/menu-card-export/templates/businessPrintProfiles.ts:17`, `src/lib/menu-card-export/templates/businessPrintProfiles.ts:26`, `src/lib/menu-card-export/templates/businessPrintProfiles.ts:35`, `src/lib/menu-card-export/templates/businessPrintProfiles.ts:44`, `src/lib/menu-card-export/templates/businessPrintProfiles.ts:53` |
| PDF renderer embeds logo and applies brand color | PASS | `src/lib/menu-card-export/render/renderPdf.ts:12`, `src/lib/menu-card-export/render/renderPdf.ts:78`, `src/lib/menu-card-export/render/renderPdf.ts:647`, `src/lib/menu-card-export/render/renderPdf.ts:652`, `src/lib/menu-card-export/render/renderPdf.ts:660` |
| PDF physical output styling is renderer-owned | PASS | `src/lib/menu-card-export/render/renderPdf.ts:78`, `src/lib/menu-card-export/render/renderPdf.ts:95`, `src/lib/menu-card-export/render/renderPdf.ts:276`, `src/lib/menu-card-export/render/renderPdf.ts:298`, `src/lib/menu-card-export/render/renderPdf.ts:647` |
| PDF header subtitle follows business profile | PASS | `src/lib/menu-card-export/render/renderPdf.ts:276`, `src/lib/menu-card-export/render/renderPdf.ts:283`, `src/lib/menu-card-export/render/renderPdf.ts:413`, `src/lib/menu-card-export/render/renderPdf.ts:432`, `src/lib/menu-card-export/render/renderPdf.ts:448` |
| PDF font scale and currency formatting are renderer-owned | PASS | `src/lib/menu-card-export/render/renderPdf.ts:105`, `src/lib/menu-card-export/render/renderPdf.ts:127`, `src/lib/menu-card-export/render/renderPdf.ts:148`, `src/lib/menu-card-export/render/renderPdf.ts:276`, `src/lib/menu-card-export/render/renderPdf.ts:281` |
| Content-aware Compact columns | PASS | `src/lib/menu-card-export/layout/resolveColumnCount.ts`, `src/lib/menu-card-export/layout/paginateBlocks.ts`, `src/lib/menu-card-export/render/renderPdf.ts` |
| Category/page continuation identity | PASS | `src/lib/menu-card-export/render/renderPdf.ts` (`getCoverBackedContentPageTop`, `getContentPageFooterLabel`, repeated category heading, minimum-start/keep-whole rules; `drawContinuationHeader` remains only for cover-off utility output) |
| Dedicated identity cover and truth-safe stacked contact/QR composition | PASS | `src/lib/menu-card-export/render/renderPdf.ts` (`drawCoverPage`), `src/lib/menu-card-export/presets/presetRegistry.ts`, desktop/mobile `includeCoverPage` controls |
| Standard inline decision symbols and footer legend | PASS | `src/lib/menu/itemDecisionSymbols.ts`; `src/components/shared/menu/ItemDecisionSymbolGroup.tsx`; `src/lib/menu-card-export/render/renderPdf.ts` (`drawPrintLucideVeganSymbol`, `drawPrintLucideWheatSymbol`, `drawPrintGameIconChilliSymbol`, `drawPrintAudienceSymbol`, `drawPrintDecisionSymbolLegend`); vegan commits its green stroke, gluten-free commits its neutral/theme stroke, and only chilli commits the shared semantic red fill, with a lighter red print value on dark artwork |
| Balanced full-page content-field geometry | PASS | `src/lib/menu-card-export/render/renderPdf.ts` (`FULL_PAGE_PANEL_EDGE_INSET`, `FULL_PAGE_PANEL_CONTENT_PADDING`, `getBalancedFullPageThemePanel`, `getFullPageThemeContentMargin`, `getFullPageThemeContentTop`); top/left/right field inset is 14 mm, internal content padding is 10 mm, and each prior bottom inset is preserved |
| Deterministic visual fixtures | PASS | `scripts/verification/render-menu-card-visual-fixtures.ts`; review items derive symbols from their admitted item tags rather than a hardcoded generic matrix, and Coastal Table plus Midnight Gold confirm that only applicable symbols and definitions render under `output/menu-card-visual-audit/` |
| Category icon browser raster | PASS | `scripts/verification/test-menu-card-category-icon-browser-runtime.js`; headless Chrome proves both Lucide and emoji values become bounded PNG data, repeated renders are deterministic, and unknown icon IDs are rejected. `verify-menu-card-export.js` separately guards the PDF heading-width and image-embedding calls. |
| Print source carries store currency code fallback | PASS | `src/lib/menu-card-export/models/printModel.ts:62`, `src/lib/menu-card-export/models/printModel.ts:63`, `src/lib/menu-card-export/source/buildPrintSource.ts:152`, `src/lib/menu-card-export/source/buildPrintSource.ts:153` |
| Brand/currency/business-profile changes invalidate local export reuse | PASS | `src/lib/menu-card-export/source/buildPrintSourceHash.ts:33`, `src/lib/menu-card-export/source/buildPrintSourceHash.ts:35`, `src/lib/menu-card-export/source/buildPrintSourceHash.ts:36`, `src/lib/menu-card-export/source/buildPrintSourceHash.ts:37`, `src/lib/menu-card-export/source/buildPrintSourceHash.ts:39` |
| Brand/currency/physical/business-profile output regression guard exists | PASS | `scripts/verification/verify-menu-card-export.js:171`, `scripts/verification/verify-menu-card-export.js:223`, `scripts/verification/verify-menu-card-export.js:254`, `scripts/verification/verify-menu-card-export.js:268`, `scripts/verification/verify-menu-card-export.js:356` |
| Renderer changes invalidate old local-history freshness | PASS | `src/lib/menu-card-export/render/artifactMetadata.ts`, `src/lib/menu-card-export/source/buildPrintSourceHash.ts`, `scripts/verification/verify-menu-card-export.js` |
| PDF metadata and deterministic filenames are set in browser | PASS | `src/lib/menu-card-export/render/artifactMetadata.ts:53`, `src/lib/menu-card-export/render/artifactMetadata.ts:60`, `src/lib/menu-card-export/render/artifactMetadata.ts:68`, `src/lib/menu-card-export/render/renderPdf.ts:643`, `src/lib/menu-card-export/render/renderPdf.ts:644` |
| Print-shop packet is client-side ZIP | PASS | `src/lib/menu-card-export/printShop/buildPrintShopPacket.ts:16` |
| Print-shop instructions and QR checklist follow business profile labels | PASS | `src/lib/menu-card-export/printShop/buildPrintInstructions.ts:23`, `src/lib/menu-card-export/printShop/buildPrintInstructions.ts:34`, `src/lib/menu-card-export/printShop/buildPrintInstructions.ts:45`, `src/lib/menu-card-export/printShop/buildQrTestChecklist.ts:5`, `src/lib/menu-card-export/printShop/buildQrTestChecklist.ts:20` |
| Real project file extraction shape is supported | PASS | `src/lib/menu-card-export/source/buildPrintSource.ts:48`, `src/lib/menu-card-export/source/buildPrintSource.ts:57` |
| Local export history exists without Firestore | PASS | `src/lib/menu-card-export/repository/menuCardExportRepository.ts:10`, `src/lib/menu-card-export/repository/menuCardExportRepository.ts:49` |
| History flag controls local history UI/write path | PASS | `src/hooks/useMenuCardExportController.ts:221`, `src/hooks/useMenuCardExportController.ts:484`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:351`, `scripts/verification/verify-menu-card-export.js:85` |
| Print-shop flag controls preset visibility and stale state | PASS | `src/hooks/useMenuCardExportController.ts:80`, `src/hooks/useMenuCardExportController.ts:408`, `src/app/api/menu-card-export/design-advisor/route.ts:194` |
| Unused placeholder modules removed before freeze | PASS | `src/lib/menu-card-export/index.ts:1`, `__docs__/menu-card-export/menu-card-export_impl.md:32` |
| Use MenuList routes to Print Menu | PASS | `src/components/templates/main-app/useMenuList/index.tsx:251`, `src/components/templates/main-app/useMenuList/index.tsx:951` |
| Share modal routes to Print Menu | PASS | `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:250`, `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:327` |
| Shared entry URL helper exists | PASS | `src/lib/menu-card-export/navigation.ts:1`, `scripts/verification/verify-menu-card-export.js:105` |
| Shared export controller exists | PASS | `src/hooks/useMenuCardExportController.ts:87`, `scripts/verification/verify-menu-card-export.js:63` |
| Dashboard/mobile output parity is enforced | PASS | `src/hooks/useMenuCardExportController.ts:460`, `src/hooks/useMenuCardExportController.ts:473`, `src/hooks/useMenuCardExportController.ts:475`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:336`, `src/components/mobile/menu-card-export/MobileMenuCardExportScreen.tsx:392`, `scripts/verification/verify-menu-card-export.js:111` |
| Dedicated mobile Print Menu screen exists | PASS | `src/components/mobile/menu-card-export/MobileMenuCardExportScreen.tsx:59`, `scripts/verification/verify-menu-card-export.js:83` |
| Mobile Share opens shell Print Menu without PWA reload | PASS | `src/components/mobile/screens/MobileShareScreen.tsx:461`, `src/components/mobile/screens/MobileShareScreen.tsx:889` |
| Mobile Menu opens shell Print Menu after pending-edit save without PWA reload | PASS | `src/components/mobile/screens/MobileMenuScreen.tsx:2742`, `src/components/mobile/screens/MobileMenuScreen.tsx:2749`, `src/components/mobile/screens/MobileMenuScreen.tsx:3954` |
| Mobile Menu command sheet exposes Print Menu | PASS | `src/components/mobile/components/MobileMenuCommandSheet.tsx:185` |
| More > Modules exposes shell Print Menu beside Dashboard without PWA reload | PASS | `src/components/mobile/screens/MobileMoreScreen.tsx:399`, `src/components/mobile/screens/MobileMoreScreen.tsx:442` |
| Mobile shell maps Print Menu route to `more/printMenu` | PASS | `src/components/mobile/MobileShell.tsx:42`, `scripts/verification/verify-menu-card-export.js:97` |
| Verification command added | PASS | `package.json:31`, `scripts/verification/verify-menu-card-export.js:299` |

---

## Architecture Checklist

| Area | Status | Evidence |
| --- | --- | --- |
| Route-level workflow | PASS | `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:317` |
| Preset registry | PASS | `src/lib/menu-card-export/presets/presetRegistry.ts:15` |
| Template registry | PASS | `src/lib/menu-card-export/templates/registry.ts:8` |
| Print source builder | PASS | `src/lib/menu-card-export/source/buildPrintSource.ts:70`, `src/lib/menu-card-export/source/buildPrintSource.ts:89` |
| Deterministic hash | PASS | `src/lib/menu-card-export/source/buildPrintSourceHash.ts:24` |
| Renderer adapter boundary | PASS | `src/lib/menu-card-export/render/renderPdf.ts:579` |

---

## Firebase Cost Checklist

| Requirement | Status | Evidence |
| --- | --- | --- |
| No export Firestore write | PASS | `src/lib/menu-card-export/repository/menuCardExportRepository.ts:3`, `scripts/verification/verify-menu-card-export.js:63` |
| No export-storage API route | PASS | `scripts/verification/verify-menu-card-export.js:243` |
| No Storage upload | PASS | `src/lib/menu-card-export/repository/artifactStorage.ts:3`, `src/lib/menu-card-export/printShop/buildPrintShopPacket.ts:24` |
| History is local only | PASS | `src/lib/menu-card-export/repository/menuCardExportRepository.ts:3` |
| Empty stores do not create a default menu | PASS | `src/database/projects/index.ts:1273`, `scripts/verification/verify-menu-card-export.js:79` |
| Style/preset browsing does not re-read or write Firebase | PASS | `src/hooks/useMenuCardExportController.ts:336`, `src/hooks/useMenuCardExportController.ts:343`, `src/hooks/useMenuCardExportController.ts:348`, `src/hooks/useMenuCardExportController.ts:353` |
| Logo embedding is final-render only and cached in memory | PASS | `src/lib/menu-card-export/render/renderPdf.ts:12`, `src/lib/menu-card-export/render/renderPdf.ts:152`, `src/lib/menu-card-export/render/renderPdf.ts:156`, `src/lib/menu-card-export/render/renderPdf.ts:160`, `src/lib/menu-card-export/render/renderPdf.ts:660` |
| Business profile selection reuses loaded store context only | PASS | `src/lib/menu-card-export/source/buildPrintSource.ts:117`, `src/lib/menu-card-export/source/buildPrintSource.ts:119`, `src/lib/menu-card-export/source/buildPrintSource.ts:122`, `src/lib/menu-card-export/render/renderPdf.ts:647` |
| Auto print design uses loaded browser source only | PASS | `src/lib/menu-card-export/templates/autoPrintDesign.ts:12`, `src/lib/menu-card-export/templates/autoPrintDesign.ts:31`, `src/hooks/useMenuCardExportController.ts:262`, `src/hooks/useMenuCardExportController.ts:293` |
| Non-Pro/Multi-location suggestions avoid provider cost | PASS | `src/app/api/menu-card-export/design-advisor/route.ts:144`, `src/app/api/menu-card-export/design-advisor/route.ts:153`, `src/app/api/menu-card-export/design-advisor/route.ts:176` |
| AI credits are not consumed before validated recommendation | PASS | `src/app/api/menu-card-export/design-advisor/route.ts:183`, `src/app/api/menu-card-export/design-advisor/route.ts:205`, `src/app/api/menu-card-export/design-advisor/route.ts:235` |
| AI advisor browser response parsing is bounded | PASS | `src/services/ai/menuCardExport/getDesignAdviceViaAPI.ts:2`, `src/services/ai/menuCardExport/getDesignAdviceViaAPI.ts:8`, `src/services/ai/menuCardExport/getDesignAdviceViaAPI.ts:48`, `src/services/ai/menuCardExport/getDesignAdviceViaAPI.ts:60`, `scripts/verification/verify-menu-card-export.js:212` |

---

## Validation Commands

| Command | Result |
| --- | --- |
| `npm run verify:menu-card-export` | PASS |
| `npm run verify:ai-accounting` | PASS |
| Static dashboard/mobile output parity guard | PASS |
| Direct legacy `generateMenuPdf()` wrapper smoke with `ts-node` | PASS |
| Direct OBP brand/currency source/hash smoke with `ts-node` | PASS |
| Direct rendered INR price text smoke with `ts-node` | PASS |
| Direct business-type source/hash smoke with `ts-node` | PASS |
| Direct service-list PDF and print-shop text smoke with `ts-node` | PASS |
| Direct auto-design food/service/retail smoke with `ts-node` | PASS |
| `npx next lint --file ...` focused touched-file lint | PASS |
| Focused `npx eslint ...` for auto-design/controller/UI/schema/prompt/verifier | PASS |
| `npx tsc --noEmit --incremental false` | PASS |
| `git diff --check -- ...` touched files | PASS |
| Local unauthenticated route HTTP smoke | PASS. `curl -I http://localhost:3000/use-menulist/menu-card-export` returned `200 OK` and HTML included the menu-card-export page chunk. |
| In-app browser visual smoke | BLOCKED by local Browser webview attach timeout; no feature-specific runtime error was observed in HTTP smoke. |

---

## Real Demo Runtime QA

Authenticated runtime validation was run against an active multi-project owner account with three non-empty menus. The account identity is intentionally not written into docs.

Validated menus:

| Menu | Items | Output |
| --- | ---: | --- |
| Bar Menu | 37 | 2-page PDF and print-shop packet ZIP |
| Spa Menus | 10 | 1-page PDF and print-shop packet ZIP |

Generated artifacts:

| Artifact | Result |
| --- | --- |
| PDF render | PASS. `file` identified valid PDF 1.3 output; page counts matched runtime output. |
| Print-shop packet | PASS. ZIP contained `menu-print.pdf`, `PRINT_INSTRUCTIONS.txt`, and `QR_TEST_CHECKLIST.txt`; instructions now include preset/style, template version, source reference, renderer version, and live menu destination. |
| Source extraction | PASS. File-based `project.files[].extractedData.data` menus produced visible categories/items. |
| Firebase write path | PASS. Runtime generated local PDF/ZIP blobs only; no export-storage API route, Storage upload, export collection, index, rule, or Cloud Function was added. |
| Multi-project behavior | PASS. Active menus were selected independently and generated separate hashes/artifacts. |

QA fixes found and completed before marking ready:

- Real menu data may store items under `project.files[].extractedData.data`; the print source now normalizes top-level and file-based shapes before sanitizing.
- JSZip is given the rendered PDF as an `ArrayBuffer`, making packet generation reliable in runtime validation.

Browser and route smoke:

- June 2, 2026 local unauthenticated HTTP smoke returned `200 OK` for `/use-menulist/menu-card-export`, with the route HTML loading the menu-card-export page chunk.
- In-app browser visual inspection could not be captured because the local Browser webview did not attach during two attempts.
- Real authenticated data/runtime PDF and ZIP generation passed separately against the demo multi-project account.

Freeze hardening completed on June 2, 2026:

- History feature flag now controls the local history UI, matching-export notice, and browser history write path.
- Print-shop feature flag now hides the packet preset and blocks stale flagged state from creating packets.
- Mobile shell routing maps the Print Menu route and mobile entry points to `more/printMenu`, matching the existing More/settings screen model.
- Mobile Share, Mobile Menu command sheet, and More > Modules now open the shell Print Menu screen, so the PWA does not force a document reload.
- Mobile Menu saves pending local edits before opening Print Menu.
- Dashboard and mobile output buttons now have an automated guard proving both call the same controller output action, with no direct renderer/source/history calls inside either UI surface.
- Branded output now reuses the store logo and OBP `publicPresence.accentColor`, with logo conversion cached by URL during the route session.
- Business-type output now uses the existing store business type/category to choose menu, services, or catalog labels and visual tone without adding an owner setting or Firebase cost.
- Auto print design now chooses the starting style, density, descriptions, QR, and contact block from business type and menu shape before any paid AI/provider path.
- Home Print, Print-shop Packet, and Table Menu now default to a separate brand-led cover page. WhatsApp and utility presets remain content-first, and owners can disable the cover from both desktop and mobile Print Menu options.
- Premium and service/wellness output now uses original bundled botanical artwork in three deterministic content-page variants. Visual QA uses a four-page salon fixture to verify the cover and each variant, with a 24 mm protected content margin and no ornament over service names, descriptions, prices, QR, or footer metadata.
- Pro/Multi-location layout suggestion now receives the deterministic auto-design baseline and business profile, so it can refine only when warnings or content shape justify a safer choice.

---

## Historical Validation Result

The reviewed code, cost, route, real-data runtime, and artifact scope passed the June 2026 validation evidence above. Local unauthenticated HTTP smoke returned `200 OK`; visual browser automation was blocked by the local Browser webview attach issue and remains an external certification input, not a launch pass.

The implementation evidence covers the route, preview, preflight, auto-picked print design, PDF export, print-shop packet, mobile/desktop entry points, local history, Pro/Multi-location layout suggestion, and verification without adding export artifact Firebase write cost. Current launch certification still requires the active audit/runbook gates above.
