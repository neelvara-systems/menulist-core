# Menu Card Export — Implementation Plan

**Status:** Source-gated implementation evidence; not current launch certification
**Primary route:** `/use-menulist/menu-card-export`
**Predecessor:** `src/lib/export/menuPdfGenerator.ts`
**Last Updated:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated Menu Card Export evidence only. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, Digital Menu Output Constitution checks for print/menu outputs, `npm run verify:menu-card-export`, authenticated desktop/mobile browser QA, visual PDF and print-shop artifact review, provider smoke for the AI advisor where enabled, applicable target deploy evidence, and production-host smoke.

> **Current release boundary (July 2, 2026):** This document records source/runtime evidence only. It is not current production-release approval. Current Menu Card Export approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, Digital Menu Output Constitution checks, `npm run verify:menu-card-export`, authenticated desktop/mobile browser QA, visual PDF and print-shop artifact review, provider smoke for the AI advisor where enabled, target deploy evidence, and production-host smoke.

---

## Implementation Goal

Create a routed owner workflow for menu-card PDF and print packet exports while preserving MenuList's canonical truth model and keeping Firebase export cost at zero.

The implementation must not be a modal-only extension. The route owns job presets, style selection, preflight, preview, final export, print-shop packet creation, and export history. Share modal, Use MenuList, Mobile Share, Mobile Menu, and More become entry points into the route.

July 1 route guard: `/api/menu-card-export/design-advisor` now requires `canManageMenuSharing`, `canPublishMenu`, or `canManageMenu` after bounded body parsing and schema validation, and before Pro/Multi-location subscription lookup, AI capacity checks, Gemini calls, recommendation normalization, or AI accounting.

July 6 AI advisor session scope boundary: `/api/menu-card-export/design-advisor` now normalizes authenticated session tenant/store scope as exact positive numeric Firestore document IDs before tenant access, bounded request parsing, route permission checks, subscription lookup, AI capacity check, Gemini call, recommendation normalization, or AI accounting. Malformed, whitespace-mutated, leading-zero, zero, negative, unsafe, nonnumeric, reserved, empty, or path-shaped session scope fails with the existing owner-safe forbidden response.

---

## Current Baseline

| Current code | Evidence | Reuse decision |
| --- | --- | --- |
| `generateMenuPdf()` exists for older buttons and returns a Blob plus snapshot hash. | `src/lib/export/menuPdfGenerator.ts` | Keep as a compatibility wrapper only. |
| Legacy quick export builds a `MenuCardPrintSource` through the Menu Card Export source builder. | `src/lib/export/menuPdfGenerator.ts`, `src/lib/menu-card-export/source/buildPrintSource.ts` | No second snapshot model. |
| Legacy quick export renders through `renderPdf()`. | `src/lib/export/menuPdfGenerator.ts`, `src/lib/menu-card-export/render/renderPdf.ts` | No second visual renderer. |

The compatibility wrapper projects its runtime options before composing
fallback records: required names/language and item/category arrays are bounded,
menu/logo URLs use the shared credential-free boundary, scalar/boolean/preset/
style fields are exact, project IDs are slash-free, and only known
store/public-presence fields survive. Raw persisted project/store records are
never spread into the print source.
| Desktop Share modal now opens the route when the feature flag is on. | `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:327` | Flag-off direct download must use the Menu Card Export bridge. |
| Use MenuList opens the route when the feature flag is on. | `src/components/templates/main-app/useMenuList/index.tsx:951` | Flag-off direct download must use the Menu Card Export bridge. |
| Mobile Share opens the route when the feature flag is on. | `src/components/mobile/screens/MobileShareScreen.tsx:889` | Flag-off direct download must use the Menu Card Export bridge. |
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
  templates/autoPrintDesign.ts
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
  render/renderCategoryIcon.ts
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

Category icon flow is intentionally data-driven. `buildPrintSource()` projects the canonical `category.icon` field only when the global category-icon feature and the project menu-design `showCategoryIcons` switch are enabled. `sanitizeMenuForPrint()` accepts only bounded `lu:Lu...` or `emoji:...` values. `renderCategoryIcon.ts` resolves existing React Icons Lucide glyphs or bounded emoji to temporary in-memory PNG data, and `renderPdf.ts` reserves heading width before drawing the icon and category name together. Unknown or unrasterizable icons degrade to a text-only heading; no SVG markup from menu data is inserted into the DOM. The icon is included in `buildPrintSourceHash()` so local freshness checks observe category-level visual changes.

---

## Feature Flags

Implemented in `src/config/features.ts` near the PDF/Menu Kit flags:

```ts
ENABLE_MENU_CARD_EXPORT: true,
ENABLE_MENU_CARD_EXPORT_HISTORY: true,
ENABLE_MENU_CARD_EXPORT_PRINT_SHOP: true,
ENABLE_MENU_CARD_EXPORT_BATCH: false,
ENABLE_MENU_CARD_EXPORT_AI_ADVISOR: true,
MENU_CARD_EXPORT_AI_ADVISOR_PLAN_IDS: ["menulist_pro", "menulist_multi_location"],
```

The predecessor PDF adapter is an always-on compatibility path and no longer
advertises a no-op feature flag.
Batch export remains off because it creates additional multi-project scope. AI advisor is enabled only as a Pro/Multi-location value-add and is metered through the existing AI enhancement capacity system.

Rollout rule:

- `ENABLE_MENU_CARD_EXPORT=false`: existing PDF buttons remain direct download actions, but their output still uses the Menu Card Export branded renderer through `src/lib/export/menuPdfGenerator.ts`.
- `ENABLE_MENU_CARD_EXPORT=true`: route appears and existing PDF buttons navigate into the route.
- `ENABLE_MENU_CARD_EXPORT_HISTORY=true`: local browser export history appears. It does not write Firestore.
- `ENABLE_MENU_CARD_EXPORT_PRINT_SHOP=true`: client-side print-shop packet appears.
- `ENABLE_MENU_CARD_EXPORT_BATCH=true`: multi-location batch action appears for eligible owners.
- `ENABLE_MENU_CARD_EXPORT_AI_ADVISOR=true`: Pro/Multi-location advisor can suggest a layout recipe after owner click; final rendering remains deterministic.

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

The implemented local history stores file names and source hashes only. Keys are scoped by tenant, store, and project so equal project IDs in different outlets/accounts cannot share browser history. Legacy project-only keys are not read. Browser values are untrusted: each record is projected through the exact preset, bounded-string, positive safe-integer page-count, canonical non-future ISO timestamp, and exact project contract before use. An invalid record, oversized array, or malformed JSON envelope is removed instead of becoming owner-visible history. A rejected `localStorage` write is best-effort: it may omit persistence, but it cannot turn an already delivered file into an owner-visible export failure. No Firebase artifact path is stored because no Storage upload occurs.

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

Brand source rules:

- Standalone desktop and mobile Print Menu resolve the canonical `print_menu` parent theme through `resolvePrintableAssetStyle()` using the current business, stored business/menu preferences, and selected project. That resolved family is carried in `settings.printableThemeId` through source construction, preview, export history, preset/layout changes, and AI layout suggestions.
- Print Menu labels the resolved parent family as **Brand look** and keeps **Layout** as a separate composition choice. **Change** returns the owner to the shared Assets theme flow rather than introducing a second theme selector or persistence path.
- `buildPrintSource()` must prefer `store.publicPresence.accentColor`, matching OBP.
- Logo comes from the existing store logo fields, primarily `store.logo`.
- Older `primaryColor`, `brandColor`, `themeColor`, and project design brand color are fallback-only.
- The renderer embeds the logo in the PDF header when the image can be loaded safely and uses the brand color for the header, category dividers, and prices. Logo source projection and final rendering both require a credential-free absolute HTTP(S) URL of at most 4,096 characters. Remote loading is bounded to five seconds; timeout/CORS failure, invalid dimensions, dimensions above 2,048 pixels, or more than 4,194,304 raster pixels omit the logo and keep rendering. Successful raster data uses a 16-entry oldest-first route-session cache; failed loads are not cached permanently.
- `includeCoverPage` adds a separate typographic identity cover using the existing logo/initial fallback, business name, menu/document label, live-menu QR/public link, and only the phone/address already present in `MenuCardPrintSource`. Business logos render unframed; missing logos use a restrained typographic initial rather than a bordered placeholder box. Its scan card uses a centered QR above individually stacked label, URL, phone, and address rows so no contact line competes horizontally with the QR. It never generates promotional copy or substitutes missing business facts.
- The renderer prints subtle `Menu powered by MenuList | menulist.ai` attribution with the MenuList logo mark in the footer for non-Multi-location stores. `src/lib/platform/menuListBranding.ts` hides visible MenuList attribution only when the already-loaded `activePlanType` is `menulist_multi_location`; missing, Official, Pro, and unknown plans keep attribution visible. This is platform attribution only; the business logo/name/color remain the primary visual identity.
- The source hash includes logo URL, brand color, business type, business category, catalog kind, offering kind, currency symbol, and currency code so local export history does not reuse stale unbranded, wrong-profile, or wrong-currency files after the owner changes store settings.
- The source hash also includes `MENU_CARD_EXPORT_RENDERER_VERSION`. Any renderer composition change invalidates older local-history freshness instead of calling a pre-redesign PDF current.

Business-type source rules:

- `buildPrintSource()` must resolve `store.businessType` and `store.businessCategory` through `src/data/shared/businessTypes.ts`.
- Stored `businessCategory` wins; derived category from `businessType` is fallback only.
- `catalogKind` and `offeringKind` are copied into the print source so renderer and PDF metadata can distinguish food menus, product catalogs, and service lists.
- `src/lib/menu-card-export/templates/businessPrintProfiles.ts` maps that metadata to quiet output labels and visual tone.
- QR labels must say current menu, current services, or current catalog based on the resolved profile.
- Vertical-type resolution remains automatic. Do not add a separate vertical-style picker inside Print Menu; the owner changes the shared parent theme through Assets.

Font and currency rules:

- Font sizes are density-driven: compact, balanced, and comfortable each use fixed print-safe item, description, category, and spacing values.
- Price column width is measured from the rendered price text so longer currency codes or ranges do not overlap item names.
- Currency comes from store settings: `currencySymbol` first, then `currency`, then `currencyCode`.
- PDF output must avoid unsupported currency glyphs in built-in PDF fonts. INR/`₹` renders as `Rs 120`; whole-number prices do not force `.00`; decimal prices keep two decimals; ranges and text prices are preserved.

Physical-menu renderer rules:

- `renderPdf()` owns the physical output look through `getVisualStyle()`, not through owner-provided CSS or custom layout input.
- `getVisualStyle()` receives both the selected template family and the resolved business profile tone.
- Every page gets a restrained paper tone, print-safe border, and a short brand-color registration line before content is drawn.
- Customer-facing print presets default to a dedicated cover page; WhatsApp and compact utility presets remain content-first. When the cover is enabled, menu content begins inside the following page's top artwork-safe field without a repeated masthead, QR/contact information moves to the cover, and content page numbering excludes the unnumbered cover.
- The premium cover uses an asymmetric editorial composition, brand-tinted print-safe background fields, an unframed logo, restrained abstract geometry, serif display type, small spaced labels, and a subtly elevated QR/contact card. Cover-backed content pages omit the former repeated name/label band and use a compact business-name plus page-number footer identifier; cover-off utility output retains its content-first header.
- Classic uses a centered editorial identity header, left-anchored section markers, measured price leaders, and a balanced two-column category flow.
- Premium uses a quiet serif hierarchy, confident whitespace, single-column reading order, and no dotted leaders.
- Compact uses a calm card header, low-ornament section rules, and price leaders. A4 stays at two columns for ordinary menus and admits three columns only at 40 or more items; WhatsApp and Premium always stay single-column.
- Retail/product profiles use catalog-style boxed sections and price leaders.
- Service/professional/health profiles use calmer service-list styling and avoid restaurant-only ornamentation.
- Short categories stay together when they fit; larger categories start only when their heading plus at least two items fit. A split category repeats a labelled continuation heading rather than leaving an anonymous item at the top of a column or page.
- New pages redraw the same paper/border base and a compact running business/menu header before continuing content.
- Canonical item decision facts become compact vector marks beside the item name: vegetarian/non-vegetarian geometry, vegan, gluten-free, explicit spice intensity, and owner-confirmed audience. The bounded resolver exposes up to six applicable facts by default instead of silently hiding a fourth fact. The footer legend is generated from only the marks present in the current menu and repeats on content pages. Public UI labels use the active compact customer locale where a governed translation exists and safely fall back to the canonical label for newly introduced audience terms. Public semantic icon colors choose their light/dark variant against the active menu background; red remains exclusive to chilli/non-vegetarian marks, green to vegetarian/vegan, and gluten/audience marks stay neutral. Labels, descriptions, promotions, and option names are not inference inputs; allergens stay textual because an icon could imply unsafe certainty.
- The customer-facing footer keeps menu freshness, page count, restrained MenuList attribution where applicable, and the live-menu QR card. Technical generation time remains in filename/metadata/print-shop instructions rather than the visible menu.
- This remains client-side CPU work and does not add Firebase reads/writes or Storage uploads.

Auto print design rules:

- `src/lib/menu-card-export/templates/autoPrintDesign.ts` resolves the first style, density, and safe toggles from the already-built print source.
- Inputs are business profile, item count, category count, description coverage, variant presence, and selected preset.
- The shared controller applies the auto design once per project/job/content shape, then stops if the owner manually changes style, density, or toggles.
- Changing the job preset resets the auto-design key so the route can pick the right layout for Home Print, WhatsApp, Table Menu, or Print-shop Packet.
- Auto print design is not the Pro/Multi-location AI advisor. It is deterministic browser logic and never consumes AI capacity.
- The Pro/Multi-location advisor payload includes `autoDesignLabel`, `autoDesignReason`, `businessCategory`, `businessProfile`, and `offeringKind` so paid advice can refine the deterministic baseline instead of starting from scratch.

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
    businessType?: string;
    businessCategory?: string;
    catalogKind: "menu" | "offerCatalog";
    offeringKind: "menuItem" | "product" | "service";
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

- Raw category/item/attribute/tag arrays are snapshotted through bounded,
  exception-contained readers; malformed getters or Proxies cannot abort the
  complete export.
- Localized print text admits strings only, checks preferred language then
  English then at most 64 known keys, and never executes unknown conversion
  hooks.
- Category and item names are capped at 240 characters, descriptions at 2,000,
  attribute names at 160, tags at 80, and scalar IDs at 1,500 before PDF text
  wrapping. Layout estimation uses the same two/four description-line and
  six-attribute limits as drawing, so pagination cannot drift from emitted
  content.
- Missing category IDs use stable positional fallbacks so separate malformed
  legacy categories cannot overwrite each other in the print map.
- Hidden items are excluded.
- Unavailable items are excluded by default.
- Internal notes are excluded.
- Owner-only metadata is excluded.
- Official category and item order is preserved.
- Prices are formatted from source data without AI rewriting.
- Variants, add-ons, and dietary tags are preserved when they are part of visible menu data and the selected template supports them.
- QR destination is always a credential-free absolute HTTP(S) live-menu URL
  or approved short URL, never a generated PDF artifact URL. Source assembly,
  preflight, and the final raster renderer share the same URL admission; the
  renderer repeats the check so compatibility callers cannot bypass preflight.
- Print-source tenant/store provenance is emitted as canonical string document
  IDs only when current and legacy aliases agree. Project IDs are bounded,
  slash-free strings. Update timestamps are exception-contained, finite and
  canonical ISO values; malformed primary fields fall through to the next
  supported legacy timestamp instead of producing `Invalid Date`.

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
12. Check tenant/store/project-scoped local browser history for a matching source/settings hash.
13. Render PDF or print-shop ZIP in the browser.
14. Download/share the browser Blob through the shared browser file-share contract.
15. Treat unsupported file sharing as a download fallback, an owner-cancelled share as a quiet cancellation, and other share failures as failures.
16. Save local browser history only after delivery; a device-local history write failure remains best-effort.

The export path deliberately avoids Firestore writes, Storage uploads, export API rate limits, server rendering, and signed download URLs.

Store changes are part of the controller load key. Switching outlets reloads project data and local history even when both outlets happen to use the same project ID.

### Failure Diagnostics

Export/share failure diagnostics are bounded through `src/lib/export/exportDiagnostics.ts`.

Required callers:

- `src/lib/export/exportService.ts` logs clipboard and Web Share API failures with normalized failure codes and content/title/text/url length metadata only.
- `src/components/templates/main-app/projects/ShareModal.tsx` allows external endpoint POST only to credential-free public HTTPS URLs, blocks localhost/private/local hosts, does not follow endpoint redirects, and logs POST failures with API URL presence/length, project ID presence/length, response status, and normalized export counts only.
- `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx` logs structured JSON/XLSX export and PDF generation failures with project/store/share URL/currency presence/length plus item/category/language counts and boolean output context only.
- `src/components/templates/main-app/projects/b2cView/shareModal/MenuKitSection.tsx` logs Menu Kit ZIP and single-asset generation failures with store/menu URL/short link/business type/business category/locale presence and length metadata, asset key for single-file actions, and output-context booleans only.

Do not log raw exported menu content, owner-entered endpoint URLs, public share URLs, project names, store names, currency strings, generated file bodies, browser/provider error objects, or full project/store payloads. Owner-facing export messages stay generic and actionable; successful export paths stay quiet.

### Pro/Multi-location Layout Suggestion

The layout suggestion route is deliberately separate from PDF rendering:

```text
owner clicks Suggest layout
  -> /api/menu-card-export/design-advisor
  -> withAuth + tenant/store access check
  -> reject request bodies above 128KB
  -> validate bounded request payload
  -> active subscription plan gate: Pro/Multi-location only (`menulist_pro`/`menulist_multi_location` IDs)
  -> AI capacity check
  -> Gemini JSON-only recommendation
  -> normalize against approved preset/style/density/toggle schema
  -> record AI operation
  -> consume one AI enhancement unit
  -> return recommendation for owner to apply
```

Contract:

- Request payload includes `projectId`, `sourceHash`, current settings, bounded menu summary, and preflight warnings.
- Request payload is capped at 128KB before validation, plan reads, AI capacity checks, or provider work.
- It does not send full raw project/store documents.
- The prompt builder normalizes prompt-boundary strings before provider serialization: control/template characters are stripped, whitespace is collapsed, scalar text is capped, `categoryNames` and warning arrays scan at most 20 entries, and the source hash is sanitized before interpolation.
- Response is `MenuCardDesignAdvisorRecommendation`: approved preset, style, density, `includeDescriptions`, `includeQr`, `includeContactBlock`, `ownerNote`, `reason`, and bounded warnings.
- Official/no-subscription users receive `403 plan_required` before the provider call.
- The browser client parses plan-gate and recommendation responses through a 16KB bounded JSON reader. Malformed or oversized route responses log `ai_menu_card_design_advisor_response_parse_failed` with bounded project/source/status/phase metadata only and fall back to the existing owner-safe suggestion failure path.
- The provider-response parser keeps the existing extractable-object fallback when possible. Empty, malformed non-object, or malformed object-fragment provider JSON logs capped `menu_card_design_advisor_provider_response_parse_failed` diagnostics with fixed `return_layout_suggestion_failed` policy, response length, trimmed length, candidate length, parse stage, fenced-response flag, and object-fragment flag only. Raw provider response text, menu/source content, warnings, project/store/tenant/user IDs, source hashes, response preview text, and exception text are not logged.
- Provider/validation failure returns no usable suggestion and consumes no credits.
- Applying the suggestion changes route settings only; final PDF/packet generation still runs through `renderPdf()` / `buildPrintShopPacket()`.

---

## Security Requirements

Use existing authenticated owner page context and DAL access for export. The Pro/Multi-location layout suggestion API is the only custom route added for this feature and must keep the standard AI route protections.

- No raw sensitive payloads in logs.
- `POST /api/menu-card-export/design-advisor` uses `withAuth()`.
- Verify tenant/store access before subscription lookup and provider work.
- Validate input with `MenuCardDesignAdvisorRequestSchema`.
- Normalize and cap validated prompt strings in `src/app/api/menu-card-export/design-advisor/prompt.ts`; do not serialize raw `sourceSummary`, `preflightWarnings`, or `sourceHash` directly into the provider prompt.
- Rate-limit before provider call.
- Check plan and AI capacity before provider call.
- Do not expose public Storage URLs because no Storage object is created.
- Validate image URLs before embedding logo/photos into output; if a remote logo cannot be loaded safely, skip the image and keep the branded color output.
- Generate QR from approved live-menu URL builders only; require an absolute,
  credential-free HTTP(S) destination at source, preflight, and final render,
  and do not accept arbitrary owner-provided QR destinations in launch scope.
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
- Repeat business/menu identity on every continuation page.
- Repeat a category heading with a continuation label after a column/page split.
- Keep short categories together when they fit; otherwise place at least two items with a newly started heading.
- Select compact columns from actual item count instead of forcing three cramped columns for normal menus.
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
- Keep the full source hash and technical generation date out of the visible PDF footer; use page count, menu updated date, applicable attribution, and live-menu QR as customer-safe footer content. Generated date remains in filename, metadata, and print-shop instructions.
- Keep support/audit identifiers in PDF metadata and print-shop instructions, not in owner-facing configuration.

Rejected for this feature:

- executive-summary pages
- report/table/chart appendices
- interactive ToC pages
- approvals/changelog appendix
- confidentiality labels
- visible AI model/tool provenance

Reason: Menu Card Export is an SMB menu/service/catalog output workflow, not a report/deck exporter.

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

- Left panel: project, inherited Brand look with an Assets change action, job preset, layout, settings, safe overrides, history.
- Main panel: page preview with page thumbnails.
- Right rail or footer: preflight warnings, QR status, export actions.

Mobile layout:

- Dedicated `MobileMenuCardExportScreen` with mobile-native cards, sheets, large controls, and sticky export actions.
- `/use-menulist/menu-card-export` maps into the mobile shell as `more/printMenu` on handheld devices, matching the existing More/settings screen model instead of using a route-level mobile bypass.
- Desktop and mobile renderers both use `useMenuCardExportController` for project loading, source building, auto print design, preflight, export generation, local history, and Pro/Multi-location layout suggestion.
- Opening Print Menu from mobile Assets preserves an Assets return target; opening it from Share returns to Share. The Brand look change action also returns to the shared Assets theme flow.
- Mobile Menu command sheet flushes pending local menu edits before route navigation.
- More > Modules exposes Print Menu beside Dashboard for discoverability; the analytics dashboard screen remains metric-only.
- Horizontal preset/layout cards, with the inherited Brand look shown separately.
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
17. Keep legacy `generateMenuPdf()` as a compatibility bridge into Menu Card Export for any flag-off or old print-copy path; do not keep a standalone plain PDF renderer.
18. Thread `activePlanType` from loaded store context into PDF, QR, Menu Kit, physical-surface, public-menu, OBP, compliance, and screen attribution paths so Multi-location branding removal stays centralized and cost-neutral.
19. Add Compact and Premium templates.
20. Add test fixtures and verification script.
21. Remove or hide legacy one-click PDF path after parity is confirmed.

---

## Validation Commands

Implementation verification:

```bash
npx tsc --noEmit --incremental false
npm run verify:menu-export
npm run verify:menu-card-export
```

## Premium Editorial Page Backgrounds

`renderPdf.ts` now loads two bundled, transparent print ornaments from `public/images/menu-card-export/`: a watercolor corner cluster and a sparse line-art rail. The renderer activates them only for Premium or service/wellness customer output and never for `staff_reference`.

The background contract is deterministic:

- the cover uses a restrained rail and corner accent behind the existing identity composition;
- content pages cycle through three fixed corner/rail placements by content-page index;
- active artwork increases the protected content margin to 24 mm;
- artwork is drawn before headers, categories, items, prices, and footers;
- supplied fixture data URLs are size- and MIME-bounded for Node visual QA;
- browser output loads only the two fixed same-origin asset paths;
- decode failure omits decoration without blocking the PDF.

Rosewater Editorial and Mineral Sanctuary use a theme-specific translucent
paper field over their full-page artwork. The field is deliberately wider and
taller than the content column: its edge must not intersect category headings,
item names, descriptions, durations, or prices. This preserves low-light print
contrast without flattening the parent theme into an opaque generic panel.

Every full-page theme that owns a content field resolves that field through one
balanced geometry contract: 14 mm from the top, left, and right page edges,
followed by 10 mm of internal content padding. The renderer derives the field's
new height from its prior bottom inset, so the footer and decision-symbol legend
keep their existing protected space. Themes without a content field retain
their individually governed margins.

Vital Current and Workshop Atlas keep their full-bleed artwork but draw a
theme-scoped translucent paper field behind the footer before page metadata and
attribution. The field applies consistently to cover, content, and closing
pages so dark edge artwork cannot reduce footer readability; other themes do
not inherit it unless their governed layout explicitly opts in.

This renderer change is versioned as `menu-card-export-jspdf-v7`, so device-local history cannot label older visual output as current.

`npm run verify:menu-export` verifies structured export normalization plus bounded share/export diagnostics for clipboard share, Web Share API, external endpoint share, structured JSON/XLSX export, and PDF generation. It also guards the ShareModal external endpoint admission so the browser does not post menu data to raw owner-entered, non-HTTPS, credentialed, localhost, private/local, or redirected URLs.

`npm run verify:menu-card-export` verifies route/library files, feature flags, auto print design, client-side preflight, client-side PDF/packet generation, local history flag wiring, print-shop flag wiring, mobile Share/Menu/More entry points, the Pro/Multi-location AI advisor guard path, bounded AI advisor response parsing, bounded share-modal export diagnostics, and the absence of export-storage API routes.

The preset registry must contain every `MenuCardExportPreset`, including
flag-gated and internal presets. `buildDefaultSettings()` must preserve the
requested preset ID; it may not silently turn an internal preset into Home
Print. Store brand fields are untrusted persisted input: the shared Menu Kit
brand resolver accepts only valid string hex colors and falls through malformed
legacy candidates without executing or coercing them.

Shared canvas text and attribution helpers cap visible text, font size, logo
height, width calculations and iteration work before drawing. Print-readiness
and print-shop handoff copy project persisted store/logo/link fields without
coercing unknown values or invoking accessors.

Verifier must also assert:

- no export-storage API route or artifact Firebase write path was added
- share/export failure handlers use `src/lib/export/exportDiagnostics.ts` and do not reintroduce raw console diagnostics
- external endpoint sharing normalizes and admits only public HTTPS URLs before fetch, and uses manual redirect handling
- AI advisor route uses auth, tenant access, plan gate, capacity check, operation logging, and credit consumption
- AI advisor browser response handling uses the bounded response parser and does not silently swallow malformed JSON
- feature flags are present
- mobile Share, Menu command sheet, and More route into the same shared URL helper
- route and shared library exist
- print-shop packet builder exists
- local history exists
