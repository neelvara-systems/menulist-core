# Menu Card Export — Validation Report

**Status:** Production ready after Pro/Premium layout suggestion hardening
**Validated:** June 2, 2026

---

## Engineering Checklist Verification

| Checklist Item | Status | Evidence |
| --- | --- | --- |
| Dedicated route exists | PASS | `src/app/(main)/use-menulist/menu-card-export/page.tsx:1` |
| Feature flags added | PASS | `src/config/features.ts:1683` |
| Firebase cost optimized by default | PASS | `src/config/features.ts:1677`, `scripts/verification/verify-menu-card-export.js:63`, `scripts/verification/verify-menu-card-export.js:67` |
| AI advisor is Pro/Premium only | PASS | `src/config/features.ts:1687`, `src/config/features.ts:1688`, `src/app/api/menu-card-export/design-advisor/route.ts:144` |
| AI advisor blocks before provider for non-Pro/Premium | PASS | `src/app/api/menu-card-export/design-advisor/route.ts:144`, `src/app/api/menu-card-export/design-advisor/route.ts:145`, `src/app/api/menu-card-export/design-advisor/route.ts:146` |
| AI advisor validates bounded request/response | PASS | `src/lib/validation/apiSchemas.ts:422`, `src/lib/menu-card-export/ai/designAdvisor.ts:32`, `src/lib/menu-card-export/ai/designAdvisor.ts:71` |
| AI advisor is capacity-gated and metered after success | PASS | `src/app/api/menu-card-export/design-advisor/route.ts:153`, `src/app/api/menu-card-export/design-advisor/route.ts:220`, `src/app/api/menu-card-export/design-advisor/route.ts:243` |
| AI advisor reuses plan-gate subscription for capacity | PASS | `src/app/api/menu-card-export/design-advisor/route.ts:153`, `src/lib/ai/capacityCheck.ts:118` |
| AI advisor UI requires owner apply action | PASS | `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:322`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:364`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:572` |
| Project summary read is no-create | PASS | `src/database/projects/index.ts:1273`, `src/database/projects/index.ts:1308`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:126` |
| Shared project selector is used for multi-menu stores | PASS | `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:466`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:700` |
| Route caches selected project reads per session | PASS | `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:95`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:204`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:217` |
| Route blocks stale project/menu mixing while switching | PASS | `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:88`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:240` |
| Route reads selected menu once and computes preview client-side | PASS | `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:137`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:215`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:238` |
| Preflight exists before export | PASS | `src/lib/menu-card-export/preflight/runPrintPreflight.ts:13`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:251` |
| PDF generation is client-side | PASS | `src/lib/menu-card-export/render/renderPdf.ts:186` |
| PDF metadata and deterministic filenames are set in browser | PASS | `src/lib/menu-card-export/render/artifactMetadata.ts:32`, `src/lib/menu-card-export/render/artifactMetadata.ts:52`, `src/lib/menu-card-export/render/renderPdf.ts:190`, `src/lib/menu-card-export/render/renderPdf.ts:244` |
| Print-shop packet is client-side ZIP | PASS | `src/lib/menu-card-export/printShop/buildPrintShopPacket.ts:16` |
| Print-shop instructions include source summary and live menu destination | PASS | `src/lib/menu-card-export/printShop/buildPrintInstructions.ts:26`, `src/lib/menu-card-export/printShop/buildPrintInstructions.ts:37`, `src/lib/menu-card-export/printShop/buildPrintInstructions.ts:39` |
| Real project file extraction shape is supported | PASS | `src/lib/menu-card-export/source/buildPrintSource.ts:48`, `src/lib/menu-card-export/source/buildPrintSource.ts:57` |
| Local export history exists without Firestore | PASS | `src/lib/menu-card-export/repository/menuCardExportRepository.ts:10`, `src/lib/menu-card-export/repository/menuCardExportRepository.ts:49` |
| History flag controls local history UI/write path | PASS | `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:208`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:401`, `scripts/verification/verify-menu-card-export.js:62` |
| Print-shop flag controls preset visibility and stale state | PASS | `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:74`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:379`, `src/app/api/menu-card-export/design-advisor/route.ts:194` |
| Unused placeholder modules removed before freeze | PASS | `src/lib/menu-card-export/index.ts:1`, `__docs__/menu-card-export/menu-card-export_impl.md:32` |
| Use MenuList routes to Print Menu | PASS | `src/components/templates/main-app/useMenuList/index.tsx:251`, `src/components/templates/main-app/useMenuList/index.tsx:951` |
| Share modal routes to Print Menu | PASS | `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:250`, `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:327` |
| Shared entry URL helper exists | PASS | `src/lib/menu-card-export/navigation.ts:1`, `scripts/verification/verify-menu-card-export.js:79` |
| Mobile Share routes to Print Menu | PASS | `src/components/mobile/screens/MobileShareScreen.tsx:461`, `src/components/mobile/screens/MobileShareScreen.tsx:889` |
| Mobile Menu routes to Print Menu after pending-edit save | PASS | `src/components/mobile/screens/MobileMenuScreen.tsx:2742`, `src/components/mobile/screens/MobileMenuScreen.tsx:2749`, `src/components/mobile/screens/MobileMenuScreen.tsx:3954` |
| Mobile Menu command sheet exposes Print Menu | PASS | `src/components/mobile/components/MobileMenuCommandSheet.tsx:185` |
| More > Modules exposes Print Menu beside Dashboard | PASS | `src/components/mobile/screens/MobileMoreScreen.tsx:399`, `src/components/mobile/screens/MobileMoreScreen.tsx:442` |
| Mobile shell does not absorb Print Menu route | PASS | `src/components/antdComponent/layoutWrapper/index.tsx:45`, `scripts/verification/verify-menu-card-export.js:71` |
| Verification command added | PASS | `package.json:31`, `scripts/verification/verify-menu-card-export.js:238` |

---

## Architecture Checklist

| Area | Status | Evidence |
| --- | --- | --- |
| Route-level workflow | PASS | `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:317` |
| Preset registry | PASS | `src/lib/menu-card-export/presets/presetRegistry.ts:15` |
| Template registry | PASS | `src/lib/menu-card-export/templates/registry.ts:8` |
| Print source builder | PASS | `src/lib/menu-card-export/source/buildPrintSource.ts:48`, `src/lib/menu-card-export/source/buildPrintSource.ts:72` |
| Deterministic hash | PASS | `src/lib/menu-card-export/source/buildPrintSourceHash.ts:22` |
| Renderer adapter boundary | PASS | `src/lib/menu-card-export/render/renderPdf.ts:186` |

---

## Firebase Cost Checklist

| Requirement | Status | Evidence |
| --- | --- | --- |
| No export Firestore write | PASS | `src/lib/menu-card-export/repository/menuCardExportRepository.ts:3`, `scripts/verification/verify-menu-card-export.js:63` |
| No export-storage API route | PASS | `scripts/verification/verify-menu-card-export.js:182` |
| No Storage upload | PASS | `src/lib/menu-card-export/repository/artifactStorage.ts:3`, `src/lib/menu-card-export/printShop/buildPrintShopPacket.ts:24` |
| History is local only | PASS | `src/lib/menu-card-export/repository/menuCardExportRepository.ts:3` |
| Empty stores do not create a default menu | PASS | `src/database/projects/index.ts:1273`, `scripts/verification/verify-menu-card-export.js:67` |
| Style/preset browsing does not re-read or write Firebase | PASS | `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:235`, `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx:239` |
| Non-Pro/Premium suggestions avoid provider cost | PASS | `src/app/api/menu-card-export/design-advisor/route.ts:144`, `src/app/api/menu-card-export/design-advisor/route.ts:153`, `src/app/api/menu-card-export/design-advisor/route.ts:176` |
| AI credits are not consumed before validated recommendation | PASS | `src/app/api/menu-card-export/design-advisor/route.ts:183`, `src/app/api/menu-card-export/design-advisor/route.ts:205`, `src/app/api/menu-card-export/design-advisor/route.ts:235` |

---

## Validation Commands

| Command | Result |
| --- | --- |
| `npm run verify:menu-card-export` | PASS |
| `npx next lint --file ...` focused touched-file lint | PASS |
| `npx tsc --noEmit --incremental false` | PASS |
| `git diff --check -- ...` touched files | PASS |
| Local unauthenticated route smoke | BLOCKED by app-level Next dev runtime issue also affecting `/use-menulist` |

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

Browser smoke:

- June 2, 2026 local unauthenticated `curl` smoke starts compilation but returns 500 before route render because the dev server hits an app-level webpack runtime issue in shared `(main)` layout/auth/Sentry chunks. The same failure affects `/use-menulist`, so it is not specific to Menu Card Export mobile entry links.
- Real authenticated data/runtime PDF and ZIP generation passed separately against the demo multi-project account.

Freeze hardening completed on June 2, 2026:

- History feature flag now controls the local history UI, matching-export notice, and browser history write path.
- Print-shop feature flag now hides the packet preset and blocks stale flagged state from creating packets.
- Mobile shell routing guard keeps the responsive export route from being replaced by the generic Mobile Share tab.
- Mobile Share, Mobile Menu command sheet, and More > Modules now route through the same Print Menu URL helper.
- Mobile Menu saves pending local edits before opening Print Menu.

---

## Final Verdict

Ready for production release from code, cost, route, real-data runtime, and artifact validation. Current local unauthenticated dev smoke is blocked by a shared Next dev runtime issue outside the Menu Card Export route.

The implementation delivers the route, preview, preflight, PDF export, print-shop packet, mobile/desktop entry points, local history, Pro/Premium layout suggestion, and verification without adding export artifact Firebase write cost.
