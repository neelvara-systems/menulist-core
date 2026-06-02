# Menu Card Export — Implementation Plan

**Status:** Production-ready client-first with Pro/Premium layout suggestion
**Primary route:** `/use-menulist/menu-card-export`
**Predecessor:** `src/lib/export/menuPdfGenerator.ts`
**Last Updated:** June 2, 2026

---

## Implementation Goal

Create a routed owner workflow for menu-card PDF and print packet exports while preserving MenuList's canonical truth model and keeping Firebase export cost at zero.

The implementation must not be a modal-only extension. The route owns job presets, style selection, preflight, preview, final export, print-shop packet creation, and export history. Share modal, Use MenuList, Mobile Share, Mobile Menu, and More become entry points into the route.

---

## Current Baseline

| Current code | Evidence | Reuse decision |
| --- | --- | --- |
| `generateMenuPdf()` exists and returns a Blob plus snapshot hash. | `src/lib/export/menuPdfGenerator.ts:274`, `src/lib/export/menuPdfGenerator.ts:549` | Reuse concepts, not as final module shape. |
| It builds a snapshot projection before rendering. | `src/lib/export/menuPdfGenerator.ts:175` | Keep and expand into `MenuCardPrintSource`. |
| It renders A4 portrait via `jsPDF`. | `src/lib/export/menuPdfGenerator.ts:294` | Keep as initial renderer adapter. |
| Desktop Share modal now opens the route when the feature flag is on. | `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:327` | Keep legacy direct generator only as flag-off fallback. |
| Use MenuList opens the route when the feature flag is on. | `src/components/templates/main-app/useMenuList/index.tsx:951` | Keep legacy direct generator only as flag-off fallback. |
| Mobile Share opens the route when the feature flag is on. | `src/components/mobile/screens/MobileShareScreen.tsx:889` | Keep legacy direct generator only as flag-off fallback. |
| Mobile Menu command sheet opens the route after saving pending local edits. | `src/components/mobile/screens/MobileMenuScreen.tsx:2742`, `src/components/mobile/screens/MobileMenuScreen.tsx:2749`, `src/components/mobile/components/MobileMenuCommandSheet.tsx:185` | Do not let just-edited in-memory menu data be skipped by route navigation. |
| More > Modules opens the route with the current mobile project selection. | `src/components/mobile/screens/MobileMoreScreen.tsx:399`, `src/components/mobile/screens/MobileMoreScreen.tsx:442` | Keep as discovery, not an analytics-dashboard control. |
| Menu Kit already has client-side print asset generation patterns. | `src/lib/menu-kit/menuKitGenerator.ts:36`, `src/lib/menu-kit/menuKitGenerator.ts:76` | Reuse QR, naming, and download discipline where useful. |

---

## Implemented File Structure

```text
src/app/(main)/use-menulist/menu-card-export/page.tsx

src/components/templates/main-app/menu-card-export/
  MenuCardExportRoute.tsx
  menu-card-export.module.scss

src/lib/menu-card-export/
  index.ts
  navigation.ts
  models/printModel.ts
  models/exportTypes.ts
  models/templateTypes.ts
  models/layoutTypes.ts
  models/warningTypes.ts
  models/preflightTypes.ts
  models/printShopTypes.ts
  source/buildPrintSource.ts
  source/buildPrintSourceHash.ts
  source/sanitizeMenuForPrint.ts
  source/buildBrandTokens.ts
  source/buildQrDestination.ts
  templates/registry.ts
  templates/classic.template.ts
  templates/compact.template.ts
  templates/premium.template.ts
  templates/takeaway.template.ts
  templates/drinks.template.ts
  templates/sharedTokens.ts
  presets/presetRegistry.ts
  overrides/applySafeLayoutOverrides.ts
  layout/calculateMenuMetrics.ts
  layout/buildBlocks.ts
  layout/chooseLayoutMode.ts
  layout/measureBlocks.ts
  layout/paginateBlocks.ts
  layout/validateLayout.ts
  preflight/runPrintPreflight.ts
  preflight/checkQrSafety.ts
  preflight/checkBleedAndSafeArea.ts
  preflight/checkSelectableText.ts
  preflight/checkPhotoQuality.ts
  render/renderPreviewModel.ts
  render/renderPdf.ts
  render/renderPrintBoxes.ts
  render/renderQr.ts
  printShop/buildPrintShopPacket.ts
  printShop/buildPrintInstructions.ts
  printShop/buildQrTestChecklist.ts
  repository/menuCardExportRepository.ts
  repository/artifactStorage.ts
  repository/freshness.ts
  repository/exportReuse.ts
  ai/designAdvisor.ts

src/app/api/menu-card-export/design-advisor/
  route.ts
  prompt.ts

src/services/ai/menuCardExport/
  getDesignAdviceViaAPI.ts

scripts/verification/verify-menu-card-export.js
```

---

## Feature Flags

Implemented in `src/config/features.ts` near the PDF/Menu Kit flags:

```ts
ENABLE_MENU_CARD_EXPORT: true,
ENABLE_MENU_CARD_EXPORT_HISTORY: true,
ENABLE_MENU_CARD_EXPORT_PRINT_SHOP: true,
ENABLE_MENU_CARD_EXPORT_BATCH: false,
ENABLE_MENU_CARD_EXPORT_AI_ADVISOR: true,
MENU_CARD_EXPORT_AI_ADVISOR_PLAN_IDS: ["pro", "premium"],
```

`ENABLE_PDF_SURFACE` remains the predecessor flag at `src/config/features.ts:1666`.
Batch export remains off because it creates additional multi-project scope. AI advisor is enabled only as a Pro/Premium value-add and is metered through the existing AI enhancement capacity system.

Rollout rule:

- `ENABLE_MENU_CARD_EXPORT=false`: existing PDF Surface remains the only download path.
- `ENABLE_MENU_CARD_EXPORT=true`: route appears and existing PDF buttons navigate into the route.
- `ENABLE_MENU_CARD_EXPORT_HISTORY=true`: local browser export history appears. It does not write Firestore.
- `ENABLE_MENU_CARD_EXPORT_PRINT_SHOP=true`: client-side print-shop packet appears.
- `ENABLE_MENU_CARD_EXPORT_BATCH=true`: multi-location batch action appears for eligible owners.
- `ENABLE_MENU_CARD_EXPORT_AI_ADVISOR=true`: Pro/Premium advisor can suggest a layout recipe after owner click; final rendering remains deterministic.

---

## Database Constants

No new export collection is added in the implemented default path.

Firebase cost optimization took priority over server persistence. The route uses current project/store reads, browser Blob downloads, and local browser export history. Do not add `MENU_CARD_EXPORTS`, Firestore indexes, Storage paths, or export-storage API routes until a server-history mode is explicitly approved and costed.

AI accounting does add one action constant, not a new collection:

```ts
AI_ACTIONS_TYPES.MENU_CARD_EXPORT_DESIGN_ADVISOR
```

The action costs one AI enhancement unit and logs to the existing MenuList AI operations path after a valid recommendation.

---

## Data Model

```ts
export type MenuCardExportStatus = "queued" | "rendering" | "ready" | "failed";
export type MenuCardExportPreset =
  | "home_print"
  | "whatsapp"
  | "print_shop_packet"
  | "table_menu"
  | "takeaway_insert"
  | "staff_reference"
  | "multi_location_batch"
  | "page_images"
  | "qr_insert";

export type MenuCardExportRecord = {
  id: string;
  tenantId: string;
  storeId: string;
  projectId: string;
  menuSnapshotId: string | null;
  createdBy: string;

  template: {
    id: string;
    version: string;
    family: "classic" | "compact" | "premium" | "takeaway" | "photo" | "drinks" | "folded";
  };

  settings: MenuCardExportSettings;
  safeOverrides: MenuCardSafeOverrides;

  source: {
    publicMenuUrl: string;
    qrDestinationUrl: string;
    menuUpdatedAt: string | null;
    storeUpdatedAt: string | null;
    printSourceHash: string;
    rendererVersion: string;
  };

  preflight: {
    status: "passed" | "warnings" | "blocked";
    warningCount: number;
    blockerCount: number;
    warnings: MenuCardExportWarning[];
    checkedAt: string;
  };

  output: {
    preset: MenuCardExportPreset;
    status: MenuCardExportStatus;
    pageCount?: number;
    pdfPath?: string;
    packetPath?: string;
    thumbnailPaths?: string[];
    fileSizeBytes?: number;
    generatedAt?: string;
    errorCode?: MenuCardExportErrorCode;
  };

  freshness: {
    isCurrent: boolean;
    staleReason?: "menu_changed" | "store_changed" | "template_updated";
    latestPrintSourceHash?: string;
    checkedAt: string;
  };

  createdAt: string;
  updatedAt: string;
};
```

The implemented local history stores file names and source hashes only. It does not store Firebase artifact paths because no Storage upload occurs.

`MenuCardExportSettings` must be narrow and serializable:

```ts
export type MenuCardExportSettings = {
  preset: MenuCardExportPreset;
  paperSize: "a4" | "a5" | "letter";
  orientation: "portrait" | "landscape";
  density: "comfortable" | "balanced" | "compact";
  styleId: string;
  includeLogo: boolean;
  includeDescriptions: boolean;
  includePhotos: boolean;
  includeQr: boolean;
  includeContactBlock: boolean;
  includeUpdatedDate: boolean;
};

export type MenuCardSafeOverrides = {
  startCategoryOnNewPage?: string[];
  keepCategoryTogether?: string[];
  compactCategories?: string[];
  hideDescriptionsForCategories?: string[];
};
```

No custom CSS, arbitrary page coordinates, uploaded fonts, or free text boxes are accepted in this model.

---

## Print Source Contract

Never pass raw project/store documents into the renderer.

```ts
export type MenuCardPrintSource = {
  tenantId: string;
  storeId: string;
  projectId: string;
  menuSnapshotId: string | null;

  business: {
    name: string;
    logoUrl?: string;
    phone?: string;
    address?: string;
    publicMenuUrl: string;
    brandColor?: string;
    brandTokens: MenuCardBrandTokens;
  };

  qr: {
    destinationUrl: string;
    shortUrl?: string;
    label: string;
    errorCorrection: "M" | "Q";
  };

  menu: {
    title: string;
    updatedAt: string | null;
    categories: PrintCategory[];
  };

  flags: {
    hasPhotos: boolean;
    hasDescriptions: boolean;
    hasVariants: boolean;
    hasDietaryTags: boolean;
    hasMissingPrices: boolean;
  };
};
```

Sanitization rules:

- Hidden items are excluded.
- Unavailable items are excluded by default.
- Internal notes are excluded.
- Owner-only metadata is excluded.
- Official category and item order is preserved.
- Prices are formatted from source data without AI rewriting.
- Variants, add-ons, and dietary tags are preserved when they are part of visible menu data and the selected template supports them.
- QR destination is always a live menu URL or approved short URL, never a generated PDF artifact URL.

---

## Client Execution

No export-storage API routes are added in the implemented default path.

Route behavior:

1. Read existing project summaries with `getExistingProjectsListWithoutLoader()` so an empty store stays an empty state and the export route never creates a default project.
2. Resolve the selected project from the route query, default project, or first active menu.
3. Show the same shared project selector pattern used by other multi-project owner/mobile surfaces when more than one menu exists.
4. Read the selected project once with `getProjectDataWithoutLoader()`.
5. Cache selected project data for the route session so switching back to a previously opened menu does not repeat the project read.
6. Gate print-source creation by `loadedProjectId` so the route never combines an old project's menu data with the newly selected project URL while switching.
7. Build `MenuCardPrintSource` in the browser.
8. Build source hash.
9. Apply safe overrides.
10. Run preflight.
11. Block final export when preflight has blockers.
12. Check local browser history for a matching source/settings hash.
13. Render PDF or print-shop ZIP in the browser.
14. Download/share the browser Blob.
15. Save local browser history only.

The export path deliberately avoids Firestore writes, Storage uploads, export API rate limits, server rendering, and signed download URLs.

### Pro/Premium Layout Suggestion

The layout suggestion route is deliberately separate from PDF rendering:

```text
owner clicks Suggest layout
  -> /api/menu-card-export/design-advisor
  -> withAuth + tenant/store access check
  -> validate bounded request payload
  -> active subscription plan gate: pro/premium only
  -> AI capacity check
  -> Gemini JSON-only recommendation
  -> normalize against approved preset/style/density/toggle schema
  -> record AI operation
  -> consume one AI enhancement unit
  -> return recommendation for owner to apply
```

Contract:

- Request payload includes `projectId`, `sourceHash`, current settings, bounded menu summary, and preflight warnings.
- It does not send full raw project/store documents.
- Response is `MenuCardDesignAdvisorRecommendation`: approved preset, style, density, `includeDescriptions`, `includeQr`, `includeContactBlock`, `ownerNote`, `reason`, and bounded warnings.
- Starter/no-subscription users receive `403 plan_required` before the provider call.
- Provider/validation failure returns no usable suggestion and consumes no credits.
- Applying the suggestion changes route settings only; final PDF/packet generation still runs through `renderPdf()` / `buildPrintShopPacket()`.

---

## Security Requirements

Use existing authenticated owner page context and DAL access for export. The Pro/Premium layout suggestion API is the only custom route added for this feature and must keep the standard AI route protections.

- No raw sensitive payloads in logs.
- `POST /api/menu-card-export/design-advisor` uses `withAuth()`.
- Verify tenant/store access before subscription lookup and provider work.
- Validate input with `MenuCardDesignAdvisorRequestSchema`.
- Rate-limit before provider call.
- Check plan and AI capacity before provider call.
- Do not expose public Storage URLs because no Storage object is created.
- Validate image URLs before embedding logo/photos into output.
- Generate QR from approved live-menu URL builders only; do not accept arbitrary owner-provided QR destination in launch scope.
- Do not accept custom CSS or owner-supplied template code.

---

## Preflight Engine

Preflight is the quality gate that makes this route better than a basic PDF button.

Pipeline:

```text
MenuCardPrintSource
  -> template + preset + settings
  -> safe overrides
  -> preliminary layout plan
  -> QR validation
  -> print box validation
  -> content/readability validation
  -> output risk summary
```

Required checks:

| Check | Implementation note |
| --- | --- |
| Missing prices | Count visible items without a price; warning by default, blocker if preset requires prices. |
| Hidden/unavailable exclusion | Return counts in info warnings; never include excluded item payloads. |
| Long text | Measure against selected style and density; suggest Compact or category description hiding. |
| Page overflow | Block export if pagination cannot place every block safely. |
| Orphan category header | Block or repaginate; category header cannot stand alone at page bottom. |
| QR quiet zone | Enforce four-module clear margin around QR. |
| QR module size | Validate printed module size against preset/page scale; use short URL when too dense. |
| QR error correction | Default to resilient print setting unless it makes the code too dense. |
| Bleed/safe area | Required for print-shop preset; body content must stay inside safe area. |
| Low-resolution photos | Warn and allow non-photo style fallback. |
| Selectable text | Render test fixture must verify generated text is not a full-page screenshot. |

Preflight never writes Firestore or Storage.

---

## Layout Engine

Pipeline:

```text
project/store data
  -> MenuCardPrintSource
  -> printable blocks
  -> menu metrics
  -> template + settings
  -> layout mode
  -> measured blocks
  -> page/column plan
  -> validation
  -> preview model / PDF render
```

Hard layout rules:

- Preserve category order.
- Preserve item order.
- Do not split item blocks.
- Do not detach item name and price.
- Do not orphan category headers.
- Do not overlap footer.
- Do not shrink QR below scan-safe size.
- Do not use raw CSS columns for final pagination.
- Keep body content inside safe area for print-shop exports.
- Keep text selectable in generated PDFs where the renderer supports native text drawing.

---

## Renderer Decision

Current repo dependency:

- `jspdf` exists in `package.json`.
- Current PDF and Menu Kit generators already use `jsPDF`.
- Playwright/Puppeteer is not currently a repo dependency.

Implementation decision:

1. Build `renderPdf()` behind a renderer adapter interface.
2. Implement the first adapter with existing `jsPDF`.
3. Keep HTML/CSS page previews in React for the route.
4. Model PDF media/trim/bleed/safe boxes in renderer input even if the first adapter supports only a subset.
5. Generate QR as vector or high-resolution raster with enforced quiet zone.
6. Do not add Playwright/Puppeteer until deployment size, Vercel runtime, font, image behavior, selectable text, and PDF size are proven.

This preserves long-term architecture without silently adding a heavy runtime dependency.

Accessibility rule:

- Launch output must keep menu text selectable.
- Do not claim PDF/UA until tagged structure, reading order, metadata, link annotations, image alternate text, and automated verification are implemented.

## Output Metadata And Filenames

Accepted from the generic export playbook:

- Set real PDF document properties with `jsPDF.setProperties()`: title, subject, author, keywords, and creator.
- Set PDF creation date from the same generated timestamp used by the artifact.
- Use deterministic, readable filenames: business/menu name, preset, generated date, and short source reference.
- Keep the full source hash out of the visible PDF footer; use the generated date, page count, and menu updated date as customer-safe footer text.
- Keep support/audit identifiers in PDF metadata and print-shop instructions, not in owner-facing configuration.

Rejected for this feature:

- executive-summary pages
- report/table/chart appendices
- interactive ToC pages
- approvals/changelog appendix
- confidentiality labels
- visible AI model/tool provenance

Reason: Menu Card Export is a restaurant menu output workflow, not a report/deck exporter.

---

## Print-Shop Packet

`ENABLE_MENU_CARD_EXPORT_PRINT_SHOP` exposes the packet preset.

Packet builder:

```text
rendered print PDF
  + PRINT_INSTRUCTIONS.txt
  + QR_TEST_CHECKLIST.txt
  -> ZIP artifact
```

`PRINT_INSTRUCTIONS.txt` should include:

- restaurant/store name
- selected menu/project
- finished paper size
- orientation
- bleed/crop status
- safe margin note
- color note
- quantity note placeholder
- owner contact block if available
- generated date and menu updated date
- preset, style/template version, renderer version, source reference, page count, and live menu destination

`QR_TEST_CHECKLIST.txt` should instruct staff/print shop to scan the QR from a phone before printing the full run.

No automatic email to print shops in launch scope.

---

## Route UI Plan

Desktop layout:

- Left panel: project, job preset, style, settings, safe overrides, history.
- Main panel: page preview with page thumbnails.
- Right rail or footer: preflight warnings, QR status, export actions.

Mobile layout:

- Full-screen route or sheet.
- `/use-menulist/menu-card-export` bypasses the generic mobile shell so Mobile Share, Mobile Menu, and More open the responsive route itself.
- Mobile Menu command sheet flushes pending local menu edits before route navigation.
- More > Modules exposes Print Menu beside Dashboard for discoverability; the analytics dashboard screen remains metric-only.
- Horizontal preset/style cards.
- Simple toggles.
- Swipeable page preview.
- Sticky preflight/export button.
- Warnings before final export.

No nested cards inside cards. Keep controls dense and operational.

Flag behavior:

- `ENABLE_MENU_CARD_EXPORT_HISTORY=false` hides local history, skips matching-export reuse notices, and avoids writing browser history records.
- `ENABLE_MENU_CARD_EXPORT_PRINT_SHOP=false` hides the print-shop preset and blocks any stale flagged state from creating a packet.
- The layout suggestion API also downgrades a print-shop packet recommendation to Home Print when the print-shop flag is off.

---

## Migration Steps

1. Add docs and feature flags.
2. Add route shell with disabled-state guard.
3. Add preset registry, template registry, and types.
4. Add print source builder.
5. Add hash/freshness utilities.
6. Add QR destination builder and brand-token builder.
7. Add layout engine and Classic template.
8. Add preflight engine.
9. Add route preview UI.
10. Add local browser history repository.
11. Add final PDF render and artifact storage.
12. Add export history.
13. Add print-shop packet behind flag.
14. Add multi-location batch behind flag.
15. Replace Share modal and Use MenuList PDF buttons with route links.
16. Add Mobile Share, Mobile Menu command sheet, and More > Modules entries.
17. Add Compact and Premium templates.
18. Add test fixtures and verification script.
19. Remove or hide legacy one-click PDF path after parity is confirmed.

---

## Validation Commands

Implementation verification:

```bash
npx tsc --noEmit --incremental false
npm run verify:menu-card-export
```

`npm run verify:menu-card-export` verifies route/library files, feature flags, client-side preflight, client-side PDF/packet generation, local history flag wiring, print-shop flag wiring, mobile Share/Menu/More entry points, the Pro/Premium AI advisor guard path, and the absence of export-storage API routes.

Verifier must also assert:

- no export-storage API route or artifact Firebase write path was added
- AI advisor route uses auth, tenant access, plan gate, capacity check, operation logging, and credit consumption
- feature flags are present
- mobile Share, Menu command sheet, and More route into the same shared URL helper
- route and shared library exist
- print-shop packet builder exists
- local history exists
