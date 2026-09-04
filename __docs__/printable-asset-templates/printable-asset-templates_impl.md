# Printable Asset Templates - Implementation

> **Last Updated:** September 5, 2026

## Implementation Status

**Status:** Implemented on June 6, 2026. Editor-backed printable customization added June 15, 2026. Four-module QR quiet-zone hardening added June 25, 2026. Route permission parity hardened July 1, 2026. One-parent-theme inheritance, 47 production themes, 34 common families, five food-category families, eight exact-type families, business-type/category recommendation ordering, legacy style normalization, and uniform ZIP resolution were completed through August 31, 2026.

The feature is live as a guarded owner route at `/assets`, with `/use-menulist/print-assets` kept as a compatibility route. Desktop and mobile both use the same asset type catalog, template family catalog, and `renderPrintableAsset()` adapter. Non-menu printable assets render from shared `CreativeEditorDocument` templates; desktop can open the generated document in the shared editor for governed customization before download. The owner-facing delivery boundary now refreshes the current input into a successful preview before download, mobile share, or editor entry; blocks output when preview fails; serializes work through a synchronous operation ref; and packages any multi-file image result into one browser-generated ZIP.

The desktop **Change brand look** modal gives the eligible theme grid the full modal width and keeps recommendation/search controls fixed above its own scroll region. Selecting a card opens a right-side preview drawer over the still-mounted catalog instead of replacing the catalog or reserving a permanent detail column. The drawer presents the six governed representative assets in a two-column, orientation-aware bento, keeps current versus unapplied status explicit, and owns Back to themes plus the existing menu/business Apply actions. Closing the drawer clears the unapplied temporary selection and its `Previewing` badge while preserving the catalog filter, search, scroll position, already-rendered thumbnail Blob URLs, and keyboard focus. Escape closes the drawer first because the outer modal disables its own keyboard dismissal while the drawer is open; the visible modal Close action still closes the complete flow. Mobile retains its existing touch-first horizontal theme picker and in-shell bento.

`RenderedPrintableAssetPreview.tsx` is the shared catalog-preview boundary. Desktop and mobile supply the same `PrintableAssetRenderInput` builder used by output actions, and the component asks `renderPrintableAsset()` for PNG. It reduces that canonical image to a maximum 1200 px long edge for screen display while leaving every download at full print resolution. It uses `object-fit: contain` so portrait, landscape, square, two-face, and full-page assets retain their real proportions. Near-viewport loading and off-screen unloading, a 12-result in-memory promise cache, and a two-job browser queue prevent a full 47-theme catalog from rendering or remaining decoded at once. The desktop theme drawer deliberately leaves the catalog mounted, so opening and closing a focused preview does not revoke or regenerate the visible theme-card thumbnails. Blob URLs are otherwise component-owned and revoked when a preview genuinely leaves the near-viewport window, changes, or unmounts. Cache keys use an in-memory hash of the current project, business identity, contact, runtime draft, staff, and theme state rather than storing those values in the cache key. Complete Menu Kit is represented as a labelled multi-file set because ZIP has no single truthful final-output image.

Saved Creative Editor design cards are the only owner-dashboard exception to live re-rendering: their stored thumbnail is the actual image captured for that explicitly saved custom document, is displayed with contained fitting, and lets the owner identify that saved version without another document read and render per card. It must never replace the selected asset's current live preview. Platform template-management thumbnails follow the same persisted-document rule for administrators. Product Tag, Campaign Poster, and their desktop/mobile entry points already use `PrintableAssetWorkflowModal`, whose visible preview is a freshly rendered canonical PNG rather than a constructed thumbnail.

`assetDelivery.ts` is the single file-delivery adapter. One generated file remains unchanged. Two Business Card PNG sides become one deterministic ZIP for desktop download, mobile download, mobile native Share/Save, and edited output. The shared Product Tag/Campaign Poster workflow modal owns the same output adapter plus editor dirty-baseline, discard confirmation, and `beforeunload` protection. No generated file is persisted.

Feedback QR uses a dedicated rating-neutral conversation composition across every parent theme: one speech-bubble panel and tail, one locked Koboyo `review-quote` purpose symbol, one warm action, and one truthful motivation line. It deliberately excludes five-star rows, score scales, multiple sentiment choices, incentive language, and the retired hand-built smile/response-ray motif. The symbol inherits the selected theme's accent, retains official source provenance, and stays above and separate from the protected QR panel.

Business Card retains one side-by-side editor document with protected front/back print frames. All 47 governed parent themes use the approved composition: the front has a brand-only role and the back has a contact-plus-QR role. Contact name, phone, email, address, and tagline are independent optional facts: absent values remove their rows and reflow the card instead of producing public placeholders. Phone, email, and address render as value-first rows led by custom semantic SVG icons whose stroke inherits the selected parent-theme accent; the uppercase field labels are not rendered. Designation and social handle are intentionally excluded from this asset even when those fields exist for other surfaces. Theme artwork, palette, display typography, and contrast remain parent-theme-driven; themes with inset compact artwork fields adapt the QR utility column to remain inside their protected copy zone.

Staff Name Badge uses one approved premium hierarchy across all 47 governed parent themes while retaining the internal `staff_id_card` identifier for saved-document compatibility. Desktop and mobile require the owner to select one active staff record through the existing guarded staff-list DAL; the system never chooses a person automatically. The shared admission boundary accepts only that record's real `name` and resolves its current-store role ID against the active store role catalog. Missing or unknown role IDs are omitted instead of printed, and inactive, disabled, deleted, wrong-store, or placeholder-name records are excluded. Store contact-person fields are never reused. Because the product has no governed staff-photo workflow, the renderer uses a name-derived initials monogram and does not show a fake photo field or describe the output as a verified credential. Business phone, email, address, login ID, social handle, menu/services URL, unexplained QR, employee number, and validation state are intentionally excluded. Each parent theme supplies its own responsive artwork, accent/surface contrast, display typography, border colour, and real-logo/initials treatment to the shared lanyard-safe header, monogram, staff identity, and purpose zones; there is no legacy per-theme fallback.

Event Invitation supports a browser-local `invitationContent` object with optional bounded `occasion`, `date`, `time`, and `location` values. Desktop and mobile expose the same shared details panel, keep its draft while the owner changes theme inside the open project, and send it through the central input boundary before preview, PNG/PDF download, or desktop customization. Supplied values render between their labels and writing lines; a height-aware two-line fallback reduces long copy before it can cross either boundary. Omitted values preserve the approved physical write-in behavior. It displays no sample event/date/time/place, adds no reply request, encodes no QR, and prints no destination action, hostname, OBP link, menu link, or services link. A normal business page cannot truthfully replace an event-specific destination. All 47 governed parent themes use one approved responsive composition: a locked Koboyo May garland, a separate real-logo-or-truthful-initials identity row, optional real tagline, locked Koboyo flower ornaments, a small locked Koboyo celebration-burst closing mark, and a protected writing panel. `printableIconArtwork.ts` preserves the exact source and licence URLs beside the vendored SVG path data. All three decorative motifs inherit the parent-theme colour, preserve their source aspect ratios, and remain embedded inside the larger MenuList composition; they are never exposed as a picker, stock library, standalone download, or extractable asset collection. The May garland, logo/initials, and business name occupy separate non-overlapping rows. The flower layer frames only the upper perimeter and retains a calm protected center. The reduced-opacity celebration mark sits below the complete details panel and inside the stationery field. The invitation purpose uses a readable premium italic display stack while functional labels remain restrained and highly legible. Each theme still contributes its own full background artwork, palette, contrast, border treatment, and display typography; there is no legacy invitation fallback.

Route permission note: `/assets`, `/use-menulist/print-assets`, and `/use-menulist/menu-card-export` are covered by the shared owner permission matcher for daily-action output access: menu sharing, publish, or menu management. This matches the mobile More screen's Assets and Print Menu admission gate.

## Current Codebase Truth

| Current Capability | Evidence |
| --- | --- |
| Dashboard navigation has `Use MenuList` before QR/Feedback. | `src/constants/navigations.ts:91` |
| Print and Menu Kit feature flags already exist. | `src/config/features.ts:1696` |
| Dedicated Assets route exists. | `src/app/(main)/assets/page.tsx:1` |
| Compatibility Print Assets route renders the new workspace when enabled. | `src/app/(main)/use-menulist/print-assets/page.tsx:1` |
| Current asset IDs are centralized. | `src/lib/print-assets/printAssetCatalog.ts:1` |
| Printable asset types are centralized. | `src/lib/printable-asset-templates/assetTypes.ts:1` |
| Printable template families are centralized. | `src/lib/printable-asset-templates/templateFamilies.ts:1` |
| Printable generation is routed through one adapter. | `src/lib/printable-asset-templates/renderPrintableAsset.ts:1` |
| Editor-backed print documents are generated in one adapter. | `src/lib/printable-asset-templates/editorDocumentAdapter.ts:1` |
| Creative Editor exposes pure browser render helpers for printable output. | `src/modules/creative-editor/export.ts:1` |
| Menu Kit can render a single asset without generating the whole ZIP. | `src/lib/menu-kit/menuKitGenerator.ts:201` |
| Menu Kit can render the full ZIP locally. | `src/lib/menu-kit/menuKitGenerator.ts:214` |
| Store brand colors are resolved from existing store fields. | `src/lib/menu-kit/brandTokens.ts:113` |
| Physical print card face already supports logo, name, QR, plan branding. | `src/lib/print-menu-surfaces/templates/printMenuCardFace.ts:98` |
| Mobile maps owner routes into `MobileShell`. | `src/components/mobile/MobileShell.tsx:36` |
| Mobile More exposes `QR and print assets`. | `src/components/mobile/screens/MobileMoreScreen.tsx` |

## Implementation Principle

Build a template orchestration layer on top of current output engines. Do not duplicate menu data loading, QR generation, project selection, logo loading, plan checks, or download logic.

`PrintableAssetTemplatesRoute` settles the shared active-subscription context
and requires `hasValidSubscriptionAccess(activeSubscription)` before calling
`getExistingProjectsListWithoutLoader(true)`. While entitlement is loading it
shows the bounded loader; without valid access it renders the shared
`NoSubscriptionView`. The `no_menu` state is reserved for an admitted,
successful summary read that genuinely returns no project.

## Implemented File Structure

```text
src/lib/printable-asset-templates/
  assetTypes.ts
  editorDocumentAdapter.ts
  navigation.ts
  renderPrintableAsset.ts
  stylePreferences.ts
  templateFamilies.ts
  templateStyles.ts
  types.ts

src/components/templates/main-app/printableAssetTemplates/
  PrintableAssetTemplatesRoute.tsx

src/components/shared/printableAssets/
  RenderedPrintableAssetPreview.tsx
  RenderedPrintableAssetPreview.module.scss

src/modules/creative-editor/
  export.ts
  types.ts

src/components/mobile/screens/MobileShareScreen.tsx
src/components/mobile/screens/MobilePrintAssetsScreen.tsx
src/components/mobile/MobileShell.tsx

src/database/printableAssetStylePreferences/
  index.ts

src/app/(main)/assets/
  page.tsx

scripts/verification/
  test-printable-asset-style-preferences.ts
  verify-printable-asset-templates.js
```

## Types

```typescript
export type PrintableAssetTypeId =
  | 'print_menu'
  | 'table_tent'
  | 'single_table_card'
  | 'counter_sticker'
  | 'entrance_poster'
  | 'feedback_qr'
  | 'campaign_flyer'
  | 'gift_certificate'
  | 'business_card'
  | 'staff_id_card'
  | 'event_invitation'
  | 'postcard'
  | 'product_tag'
  | 'campaign_poster'
  | 'complete_menu_kit';

export type PrintableTemplateFamilyId =
  | 'classic-luxe'
  | 'executive-dark'
  | 'botanical-heritage'
  | 'craft-kitchen'
  | 'modern-calm'
  | 'brand-banner'
  | 'soft-curve'
  | 'qr-first'
  | 'local-bold'
  | 'clean-utility';

export type PrintableAssetRenderInput = {
  activePlanType?: string | null;
  assetTemplateFamilyIds?: Partial<Record<MenuKitAssetKey, string>>;
  assetTypeId: PrintableAssetTypeId;
  brandColor?: string | null;
  businessCategory?: string;
  businessType?: string;
  currencyCode?: string;
  feedbackUrl?: string | null;
  lastPublishedAt?: Date;
  locale?: string;
  logoUrl?: string | null;
  menuUrl: string;
  projectId?: string;
  shortLink: string;
  storeName: string;
  templateFamilyId: PrintableTemplateFamilyId;
};
```

`campaign_flyer` also accepts an optional `flyerCampaign` object with required `headline` and optional `offer`, `details`, `validUntil`, and `terms`. Admission caps those fields at 70, 90, 180, 60, and 140 characters respectively, strips the object from every non-Flyer asset, and drops the complete campaign group when the normalized headline is empty.

## Persisted Style Preference Contract

Style-family choices use one optional, bounded field on the already-loaded store document:

```typescript
type PrintableAssetStylePreferences = {
  businessThemeId?: PrintableTemplateFamilyId;
  projectThemeOverrides?: Record<string, PrintableTemplateFamilyId>;
};
```

The runtime resolver is always:

```text
eligible menu theme -> eligible business theme -> exact business-type/category recommendation -> Botanical Heritage fallback
```

Old `businessDefaults` and `projectOverrides` are accepted only at the normalization boundary. Their first valid value in governed asset order is mapped to the closest canonical theme and folded into `businessThemeId` or `projectThemeOverrides`; the legacy maps are never returned to runtime callers. Explicit parent themes always win. Project identifiers, theme identifiers, and the maximum retained project-group count are normalized before use. The dedicated DAL writes only the changed theme leaf through `updateStore()`'s exact private-configuration mode and supports the shared nested-delete sentinel when a menu theme is cleared.

Eligibility is evaluated locally from the already-loaded store context. `templateFamilies.ts` declares a visibility mode for every canonical family. Thirty-four current families are `common`; Craft Kitchen, Ember House, Coastal Table, Sunday Table, and Counter Rush use canonical food-category visibility. Eight families use exact canonical business-type visibility: Roastery Ledger, Patisserie Conservatory, Gelateria Riviera, Salon Atelier, Petal Studio, Ritual Sanctuary, Eucalyptus Retreat, and Performance Circuit. Category resolution uses `resolveStoreBusinessCategory()` so a concrete canonical type owns its category while `Other` can use an explicit food category for the five food families. An unknown legacy type with no explicit canonical category still receives all common themes. Exact types resolve through `getBusinessTypeConfig()` and never fuzzy text matching.

Preference writes do not modify project documents, create a collection, add a listener, invalidate public-menu cache, or change generated public output. Saved Creative Editor documents also remain separate: choosing a default selects a governed family, not a saved custom document.

## Template Family Contract

Each template family exports only style decisions, not business content.

```typescript
export type PrintableTemplateFamily = {
  accentLabel: string;
  bestFor: string;
  description: string;
  id: PrintableTemplateFamilyId;
  label: string;
  tier: 'starter' | 'pro' | 'premium';
  tone: 'light' | 'dark' | 'heritage' | 'minimal' | 'bold' | 'utility';
  visibility:
    | { scope: 'common' }
    | { scope: 'business-category'; businessCategories: readonly string[] }
    | { scope: 'business-type'; businessTypes: readonly string[] };
};
```

Add a new template by registering it in `templateFamilies.ts`, adding its token treatment in `templateStyles.ts`, and mapping the non-menu printable layout in `editorDocumentAdapter.ts`. Dashboard and mobile components read from the catalog through `getPrintableTemplateFamiliesForAsset()` and should not hardcode the catalog list. If an asset renderer does not support materially distinct output for a family, that asset must not show the family as a selectable option.

## Asset Type Contract

`assetTypes.ts` owns owner-facing asset type metadata:

- label
- short description
- output format
- size
- required data
- disabled reason when data is missing
- default template family
- allowed template family IDs

This extends the current `src/lib/print-assets/printAssetCatalog.ts:26` model without deleting it during first implementation.

## Renderer Adapter

`renderPrintableAsset(input)` routes to editor-backed or specialized engines and accepts an optional `outputFormat` override:

| Asset Type | Adapter |
| --- | --- |
| `table_tent` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `single_table_card` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `counter_sticker` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `entrance_poster` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `feedback_qr` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render using feedback URL. |
| `campaign_flyer` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. Uses bounded owner campaign copy when supplied; otherwise renders a truthful identity-and-scan fallback with no synthetic promotion. |
| `gift_certificate` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `business_card` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `staff_id_card` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `event_invitation` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `postcard` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. All 47 parent themes use the approved bounded owner-message composition. |
| `product_tag` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `campaign_poster` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `print_menu` | Menu Card Export preset/style mapping, using existing `renderPdf`. |
| `complete_menu_kit` | `generateMenuKit(menuKitInput)` with one parent `templateFamilyId` in `MenuKitInput`. |

Single printable assets support PDF and image downloads from the same selected template. The owner-facing preview is image-first and uses real generated output: table tent, single table card, entrance poster, counter sticker, feedback QR, campaign flyer, gift certificate, front/back business card, ID card, invitation, postcard, product tag, and campaign poster use generated Creative Editor PNG previews; Print Menu renders the generated menu PDF first page as PNG. Desktop Print Menu must read the full selected project only when needed, use the no-loader DAL helper, and cache that project data for repeated template preview/download actions. The existing PDF.js CDN-first preview loader is bounded to five seconds and then falls back to the pinned local `pdfjs-dist` dependency, so an offline/stalled CDN cannot leave preview generation pending indefinitely. Editor-backed PNG export is wrapped into print-size PDF with `jsPDF` for PDF output. Business Card image export uses `renderPrintableAssetEditorDocumentFiles()` to render separate front and back PNG files from the same side-by-side editor document, then `assetDelivery.ts` packages those files into one ZIP; PDF remains one paired print handoff file. Complete Menu Kit remains ZIP-only.

Gift Certificate uses one owner-approved premium landscape structure across the complete parent-theme catalog. A browser-local `giftCertificateContent` object accepts optional bounded recipient, sender, personal message, value, valid-until, and certificate-number values through the same shared desktop/mobile details panel. Supplied values render above their labelled lines in preview, PNG/PDF, and desktop customization; omitted values remain writable after printing. The central input boundary strips this object from every other asset and invents no amount, currency, date, recipient, certificate number, or redemption claim. The composition keeps truthful logo/initials identity, optional real tagline, one business-aware discovery action, protected QR, and hostname-only recovery. `giftCertificateArtwork.ts` embeds the governed Koboyo `gift` symbol into a calm edge composition and deterministic public path; the former hand-built ribbon, bow, parcel, and curl drawing is removed. `generate-printable-gift-certificate-overlays.ts` creates one transparent 1748 x 826 master from each theme's governed colour tokens. Runtime documents use only the corresponding same-theme raster master, preserving the Creative Editor image-source safety boundary while preventing a generic pasted ornament or cross-theme colour mismatch.

Postcard uses one approved structure across all 47 parent themes. Desktop and mobile share `PostcardContentFields` whenever Postcard is selected: a required-to-activate owner headline, an optional owner message, and an explicit preview refresh. `inputBoundary.ts` trims and bounds those values to 70 and 180 characters, admits them only for `postcard`, and preserves them while the owner changes themes. The left identity area uses three separate centred rows: real logo or truthful initials first, business name second, and optional real tagline third. The message divider moves down when wrapped identity content needs more room and shares the exact horizontal centre of those three rows. The translucent stationery field has no shared outline because the selected theme artwork already owns the outer frame; the field exists only to protect contrast. When no headline is supplied, every theme keeps only truthful business identity, optional real tagline, the canonical QR destination, and hostname recovery. `buildPostcard()` always enters the shared premium renderer; no theme can fall back to the retired synthetic headline, generic note, or latest-scan copy. Visual fixtures normalize reserved `.example` inputs to the demonstrative `subdomain.menulist.online` host pattern and fail if a displayed short link still exposes `.example`; runtime output continues to use the real admitted project URL.

`printableIconArtwork.ts` is also the complete Koboyo suitability registry for all 15 asset IDs. Event Invitation, Feedback QR, Gift Certificate, and Postcard are the current `use` decisions. Every Postcard theme uses three locked, low-emphasis Koboyo `flower` illustrations on one horizontal baseline beneath the owner message; the botanical trio inherits the theme accent, communicates customer appreciation without introducing a face or inventing a promotion, rating, or event, and never enters the QR field. Table Tent, Single Table Card, Counter Sticker, Entrance Poster, Flyer, Business Card, Staff Name Badge, Product Tag, Campaign Poster, Print Menu, and Complete Menu Kit remain explicitly `not-beneficial`: Product Tag has a real item-content contract and direct-item QR, while Campaign Poster has a real campaign headline, optional source item, and governed destination, so generic medium icons would duplicate their purpose. This registry prevents opportunistic icon injection and keeps admitted Koboyo artwork embedded, locked, source-provenanced, and unavailable as a picker or standalone asset.

Product Tag is context-first. `buildItemProductTagRenderInput()` converts the saved desktop/mobile item editor state into the canonical print input, appends the item ID to the tenant menu URL, and resolves the existing project/business parent theme preference. Desktop and mobile obtain options through `getPublicItemDisplayOptions()`: active localized names survive even without a separate price, inactive/nameless records do not, and the bounded render input keeps at most the canonical 40-option item limit. The tag presents the first three real options and the exact remaining count under neutral `Options` wording. `ItemProductTagModal` owns the shared preview, full-screen Creative Editor handoff, and PNG/PDF downloads. `PRINTABLE_ASSET_CATALOG_TYPES` excludes Product Tag from the general Assets rail while `PRINTABLE_ASSET_TYPES` retains it as a governed renderer type.

Campaign Poster has three admitted contexts into one renderer. The manual desktop/mobile Assets path uses the same bounded campaign-content fields as Flyer and blocks edit/download until the owner supplies a real headline. The existing desktop/mobile Today `print_poster` action uses `buildTodayCampaignPosterRenderInput()` to project the current saved campaign into that contract, resolve the selected project's parent theme, and reuse the canonical exact-item destination when an item ID exists. The desktop/mobile Featured-choice controls use `buildDecisionChoiceCampaignPosterRenderInput()` for saved explicit pins only. It reads the persisted Decision Blocks setting from the already loaded project, reuses `getBlockLabels()` for the business-aware customer headline, resolves the current localized item name/description, and builds the same canonical exact-item destination. Automatic and unsaved choices fail closed because a static poster must not advertise an item that can change before or after printing. For item-backed posters, the builder scans the already loaded selected-project files by current ID or extraction alias and rejects inactive/unavailable/missing items. This adds no Firestore read and prevents stale snapshots from becoming printed truth. `CampaignPosterModal` delegates preview, editor, PNG, and PDF behavior to `PrintableAssetWorkflowModal`, with context-specific source copy. Merely opening or closing the modal never completes the Today action; completion is recorded through the existing campaign DAL only after a successful Today download. Featured-choice downloads create no completion side effect. No poster record, item-PDP action, alternate URL builder, or generated-artifact persistence is introduced.

Campaign Poster uses one approved shared composition across all 47 governed parent themes through `buildPremiumCampaignPoster()`. It keeps a compact identity header, promotes the real campaign headline, current item name, and optional item description into the primary A4 hierarchy, and uses paired editorial rules only for a safe one-line headline. Its bottom scan group is centered and vertical: one-line-first business-aware CTA, 26%-width QR with exactly 24 px decorative padding per side, then hostname-only recovery. The outer group boundary is invisible, borderless, and shadowless; only the QR retains its required scan-safe quiet-zone panel. Optional details, validity, and terms reflow the group downward without overlap; a hard bottom clamp plus long-copy geometry assertions keep the complete group on canvas. Parent-theme artwork, palette, display typography, logo treatment, and contrast remain theme-specific.

Renderer admission is strict even though catalog lookup remains compatibility-
friendly for owner UI copy. Both the single-result and multi-file renderer
adapters require an exact registered `assetTypeId` and an output format listed
by that asset before QR, canvas, PDF, ZIP, editor, or browser side effects
begin. Unknown IDs must not inherit the Table Tent lookup fallback, and
ZIP-only assets must reject PDF/image requests.

All default/editor render entry points also use
`normalizePrintableAssetRenderInput()` before document construction. The
projector requires exact asset/template IDs, a canonical HTTPS credential-free
menu URL and bounded business identity; derives the displayed short link from
that URL; bounds contact/business/project fields; admits only HTTPS
credential-free feedback/OBP URLs; and admits only credential-free HTTP(S)
logo URLs. Unknown/accessor-backed fields are not coerced into output.

### Editor Document Contract

`editorDocumentAdapter.ts` owns the print-template-to-editor mapping:

- `isPrintableAssetEditorRenderable(assetTypeId)` gates which assets use the editor renderer.
- `buildPrintableAssetEditorDocument(input)` creates the neutral `CreativeEditorDocument`.
- `renderPrintableAssetEditorTemplate(input)` renders default preview/download output without mounting the editor UI.
- `renderPrintableAssetEditorDocument({ document, assetTypeId, outputFormat })` renders an edited document to PNG/PDF.
- `renderPrintableAssetEditorDocumentFiles({ document, assetTypeId, outputFormat })` returns one file for normal assets and separate front/back PNG files for Business Card image download.

Document rules:

- Persisted platform/user documents are parsed through the canonical Creative
  Editor runtime schema before rehydration or export. They must retain
  `productContext.productId = "menulist"` and, except for the normalized
  two-face Business Card compatibility path, their canvas must exactly match
  the selected asset's governed pixel dimensions. Generic schema-valid
  10,000-pixel canvases cannot reach printable rasterization.
- QR layers are locked and carry source refs for menu/feedback URL.
- QR layers use a four-module quiet zone. Do not reduce `margin` below 4 or rely only on the surrounding white panel.
- Short-link layers are locked and carry source refs for the current project URL.
- Business Card uses one side-by-side editor document with `metadata.printFrames` for front and back. Layers carry `printFrameId`; generated structure layers carry `printFrameLocked`, cannot be unlocked/deleted/reordered, and stay bound to their face.
- Business Card export normalizes frame-assigned layers back into their front/back bounds before PDF or split PNG rendering. Newly added layers without a `printFrameId` are assigned to the nearest front/back frame during normalization. The side divider is an `editorGuide`/`excludeFromExport` layer, so it helps editing but never appears in downloaded files.
- Any legacy MenuList attribution elements are stripped from editor documents and saved templates.
- Business name, headline, instruction, and CTA copy remain editable.
- PNG/PDF export applies MenuList attribution at runtime through `resolveMenuListAttributionPolicy()`, so output without branding-removal entitlement is branded and eligible plans can remove it without placing branding inside the editor canvas.
- The editor document is the source for preview, default download, and customized download.
- Business logo/initials, short link, and attribution remain outside the QR pattern. Do not add center-logo QR overlays or unsupported trust/consent copy to normal MenuList page QR assets.

Full Print Menu uses the existing Menu Card Export renderer with its structural layout modes plus an explicit `printableThemeId`. Every renderer supports the same 47 production themes. Thirty-four themes are common. Craft Kitchen, Ember House, Coastal Table, Sunday Table, and Counter Rush use canonical food-category visibility. Eight visually explicit families use exact canonical business-type visibility. `businessThemeRecommendations.ts` uses exact types through `getBusinessTypeConfig()` and canonical categories through `resolveStoreBusinessCategory()` to order each visible catalog and choose the no-preference default. Theme identity participates in the print-source hash and all editor-backed QR/display/campaign assets consume the same canonical family ID.

Gallery Ledger, Vital Current, and Workshop Atlas each use a dedicated 1055 x 1491 A4-ratio print master. The PDF renderer places them with aspect-preserving cover scaling, theme-specific safe margins/bottom reserves, and structured service headings. The editor document adapter uses the same full-page master as a cover-scaled background for all 13 compact asset types, so cards, posters, stickers, campaign pieces, identity assets, and Menu Kit files remain in the selected parent family without stretched artwork.

Salon Atelier, Ritual Sanctuary, and Performance Circuit add both a dedicated A4-ratio page master and a dedicated 3:2 compact master. The editor adapter chooses the compact master for landscape canvases and the page master for portrait/square canvases, always with aspect-preserving cover scaling. A theme-specific translucent inset paper veil (`0.62`, `0.64`, and `0.56`) keeps text, contact details, and short links readable without flattening the surrounding artwork. The PDF renderer uses the corresponding A4 master, protected text zone, and dedicated closing page.

Roastery Ledger, Patisserie Conservatory, and Gelateria Riviera deliberately use a lighter one-master pipeline. Each has one original 1024 x 1536 responsive background master. Print Menu and all 13 editor-renderable asset types reuse that same source with preserved-aspect `cover` crops; no stretched bitmap and no separately generated asset-background set exists. Theme-specific inset veils (`0.64`, `0.70`, and `0.74`) protect body copy, QR labels, contact details, and short links while retaining the artwork at the perimeter. Exact food-business eligibility prevents these literal coffee, pastry, and gelato systems from leaking into unrelated businesses.

Petal Studio, Pearl Veil, Terracotta Glow, Glasshouse Garden, Eucalyptus Retreat, Mineral Spring, Lotus Stillness, and Sunlit Ritual use the same one-master architecture. Their original light-only 1024 x 1536 masters keep the central service-copy field calm and push artwork to the perimeter. All 13 compact assets add an inset translucent veil between artwork and copy, while full-menu layouts use theme-specific margins, top offsets, and bottom reserves. Sunlit Ritual also declares a content-header offset so its upper botanical gesture cannot cross the document title. Salon and Makeup Studio still receive the same five recommended beauty directions, while Spa and Spa Resort receive the same five recommended spa directions. Pearl Veil, Terracotta Glow, Glasshouse Garden, Mineral Spring, Lotus Stillness, and Sunlit Ritual are common because their rendered motifs are reusable beyond those verticals; the internal `glasshouse-beauty` ID remains unchanged for compatibility.

Neighbourhood Standard, Field Notes, Boutique Window, Market Label, Civic Letterpress, Modern Practice, Studio Contact Sheet, Maker Ledger, Clinical Calm, Mindful Motion, Hospitality House, and Future Workshop follow the same efficient one-master contract. Each original 1024 x 1536 master is cover-cropped with preserved aspect ratio for Print Menu and all 13 compact/editor assets. Theme-specific content veils and PDF panels protect text and QR geometry while the artwork remains visible at the perimeter. All 12 are common; the canonical category registry affects recommendation order only, never owner eligibility.

`stylePreferences.ts` applies the same visibility boundary to saved project and business themes before output resolution. Craft Kitchen or a literal exact-type family can become ineligible after a business type/category change; it remains in normalized storage data but is skipped in favor of the next eligible layer. A new ineligible save fails with `printable_asset_theme_not_available_for_business` before the DAL write. This keeps business changes recoverable without permitting food-specific or literal exact-type artwork in unrelated direct downloads or Complete Menu Kit.

Rosewater Editorial and Mineral Sanctuary retain a translucent paper field on content and closing pages because their edge artwork would otherwise compete with descriptions and pricing under dim print conditions. The field remains visibly integrated with the artwork rather than appearing as an opaque card: Rosewater uses `0.74` opacity and Mineral Sanctuary uses `0.76`. Both begin 10 mm from the page top and 18 mm from each side, leaving at least 12 mm between the panel edge and continuation header/body content. `verify-menu-card-export.js` fails closed if these layout values regress.

`MenuKitInput` uses singular `templateFamilyId`. The old `templateFamilyIds` field is admitted only as compatibility input; the generator deterministically chooses one canonical theme and applies it to every surface. The full ZIP has no independent picker and its filename carries the canonical parent theme.

## Desktop Route

Implemented rules:

- Guard with `FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_TEMPLATES`.
- Render `PrintableAssetTemplatesRoute`.
- Use the same owner data/project selection source currently used by Use MenuList.
- When project selection changes, update the selected project URL, feedback QR URL, project name, and last modified metadata before generating output.
- Put `Assets` after `Use MenuList` in `src/constants/navigations.ts:91`.
- Keep `/use-menulist/print-assets` as a compatibility route during transition.

Desktop layout:

```text
Your Brand Kit + menu selector
  top: opaque six-asset bento preview, coordinated-file status, Change brand look, and Complete Kit action
  below: Place / Promote / Identity purpose groups
  left: consistently left-aligned asset list with size and readiness state
  right: selected asset preview, direct downloads, recovery, and Preview & edit inside the same elevated card
  theme catalog: searchable Recommended / All modal opened only from Change brand look
```

The desktop header omits a redundant `Assets` eyebrow and keeps the title, supporting copy, and current menu selector in one responsive row. The Brand Kit hero intentionally omits a second theme-name/description column: Print Menu, Table Tent, Feedback QR, Entrance Poster, Gift Certificate, and Business Card carry the visual explanation directly. Its actions remain in a compact toolbar above the bento grid so removing that column never hides either the infrequent theme control or the primary kit download. Every bento item is a semantic, keyboard-accessible asset button with a persistent preview cue; activating it selects that exact asset and opens the existing preview/download modal. Both the Brand Kit and focused-asset workspaces use opaque elevated surfaces over the app background. The focused browser uses icon-led purpose tabs, a concise choose-and-preview instruction, and individually bounded asset cards instead of a static divider list. Each row owns a neutral state, visible hover lift, pressed response, keyboard focus ring, and symmetric primary-tinted selected state; its icon tile, size chip, readiness pill, and directional chevron change together without an asymmetric left rail.

Table Tent is the default desktop selection when no valid `asset` query is supplied. Selecting a purpose or an asset row updates the focused preview without opening a modal, letting the owner browse the catalog without interruption. Brand Kit bento cards, the large selected-asset preview, **Preview & edit**, and detail-required actions open the same preview/download modal for the exact focused asset. The modal resolves the inherited parent theme, presents `Theme · Asset` in its single header, shows a current-source render at preserved aspect ratio on a borderless stage, and overlays the physical/output size as a bottom-right badge. It does not repeat the theme title below the preview. Prepared platform records may supply catalogue metadata or a browsing thumbnail, but their persisted editor document is not the byte authority for an owner download or a new customization session: preview, direct PDF/image output, first-time Customize, and Complete Menu Kit all build from the current governed theme renderer. This prevents a newer themed thumbnail from being paired with an older plain exported document. Explicit owner-saved designs remain separate user templates and retain their edited document. Normal modal downloads and Customize share one responsive action group with shorter secondary labels and protected icons. A Feedback QR without an active destination may still be visually inspected, but the modal shows recovery guidance and disables download/customize actions until feedback is enabled. Business Card image action downloads one ZIP containing the front and back PNG files. Complete Menu Kit keeps its ten-file ZIP-only contract and opens from the Brand Kit toolbar.

Before SVG-to-PNG rasterization, the shared Creative Editor exporter embeds
same-origin printable-theme and menu-card artwork as data URLs. Required local
theme artwork fails closed when it cannot be fetched or embedded; it may not be
silently omitted while copy, QR, and surface colours continue rendering. The
same embedded PNG becomes the image download and the raster source wrapped by
PDF output.

The route leads with the resolved parent theme rather than exposing the complete catalog on first load. **Change brand look** opens a dedicated full-viewport library because parent-theme selection is an infrequent, high-consideration setup task. The modal title remains the single heading; duplicate internal title/explanation copy is absent. Its header and actions remain fixed around a full-width scrollable visual library, recommended exact-type/category directions appear first, **All themes** reveals the complete business-eligible set, and search filters only that admitted set. Clicking a theme opens a governed right-side drawer containing the same representative Print Menu, Table Tent, Feedback QR, Entrance Poster, Gift Certificate, and Business Card set as the Brand Kit home. The catalog remains mounted behind the drawer, so its current rendered cards, scroll position, filter, and search are retained instead of restarting when the drawer closes; dismissing the drawer clears its unapplied temporary selection and `Previewing` marker. Clicking a non-current theme marks it `Previewing` and renders all six drawer previews without saving. Each theme choice uses a full-width preview with its centered name below. The actually applied family keeps a green `Current` badge, border, and state tint through hover; a different clicked but unsaved family uses a light-blue selected border and tint that also survive hover while its drawer remains open. Unselected hover uses a restrained neutral-light border and surface shade. This state separation prevents browsing from falsely claiming an unapplied theme is current. Long names never compete horizontally with status. The drawer footer owns Back to themes, the real menu-named Apply action, and the business-wide action; the modal footer retains its independent Close action and menu context. Drawer dismissal, modal dismissal, backdrop dismissal, and Escape dismissal are unavailable during the guarded preference write so a saving surface cannot disappear while its result is unresolved. The drawer uses a higher governed overlay layer than the full-screen library so it slides right-to-left above the catalog without being covered by dashboard controls. All 34 common themes remain available to every business; five food-category and eight exact-type families appear only for admitted canonical contexts. The named menu action saves a menu override and **Apply to all menus** saves the business theme. Both optimistic application and the DAL save receive the same business context and reject any ineligible restricted save. Each asset view exposes only the inherited parent theme, while desktop customization may adjust content/layout without changing family identity. Complete Menu Kit shows the named themed asset set and has no independent picker.

For editor-renderable assets, desktop **Customize design** opens the generated `CreativeEditorDocument` in a `document.body` portal with fixed `100dvh` geometry. This isolates the editor from dashboard transforms and scrolling. The MenuList adapter passes `chromeMode="embedded"`, limits the rail to Background, Images, Text, Styles, and Brand Kit, exposes Preview as the only optional workspace control, opts into browser-local recovery drafts, starts with the drawer collapsed and no selected layer, and owns Image, Print PDF, Close, and **Save reusable design** actions. Both output actions declare `requiresReadiness`, so the shared readiness scan pauses the first output attempt when actionable issues exist. The asset route compares the clean current document with its session baseline, warns before dirty Close/browser unload, and resets the baseline after a successful reusable-design save. CampaignCue defaults remain unchanged and its AI Tools, Design Cue handlers, full tool rail, and asset registration stay outside this flow.

## Mobile Route

Mobile does not open `/assets` as a desktop-responsive page from tabs.

Implementation:

- Reuse the existing `printAssets` More sub-screen.
- Map `/assets` and `/use-menulist/print-assets` into `MobileShell` state.
- Add a More-tab item named `Assets`.
- Reuse `MobileProjectsProvider` and current Share/Print Assets data handlers.
- Use mobile asset-type cards and a one-column template family list with a fixed preview thumbnail and readable copy.
- Tapping a template family opens an in-shell bottom sheet, immediately shows a preview, and shows PDF/image download actions for that exact template.
- The open bottom sheet keeps the ordered family list available for direct Previous/Next and horizontal-swipe navigation. It announces the current position, keeps both arrow targets at 44px, preserves vertical scrolling, and does not wrap past the first or last style.
- Styleable asset sheets expose the same business-default, menu-override, clear-override, effective badge, optimistic rollback, and disabled-while-saving behavior as desktop. Default actions keep a minimum 44px target.
- Complete Menu Kit opens one package sheet labelled **Your asset set**. It has no independent style picker because the current menu/business parent theme is already resolved; the sheet names that inherited family and the ZIP applies it to every included file.
- Keep preview and download actions in the shell.
- Mobile uses the same editor-backed render adapter for preview/download, but does not expose drag/resize customization because precision layout editing belongs on desktop.

This follows the existing route-map pattern in `src/components/mobile/MobileShell.tsx:36` and the existing More tab module list at `src/components/mobile/screens/MobileMoreScreen.tsx:450`.

## Dynamic Data and Brand Rules

All output content must come from input:

| Output Field | Source |
| --- | --- |
| Store name | Current store/project context. |
| Branch name | Split from store/project name when separator exists, or branch metadata when available. |
| Logo | Existing `logoUrl`, preloaded once. |
| Brand color | Existing store fields resolved by `resolveStoreBrandColor`. |
| QR URL | Existing menu/feedback URL builders. |
| QR short link | Existing short-link display source. |
| Action copy | Business type labels from Menu Kit/business type helpers. |
| Currency | Current menu/project currency source for Print Menu. |
| Branding visibility | Existing `activePlanType` plus `ENABLE_MULTI_LOCATION_MENULIST_BRANDING_REMOVAL`. |

No renderer may contain example business names, fixed restaurant-only text, fixed URLs, or fixed logos.

## QR Safety Rules

- QR modules remain near-black on white.
- Template color may frame the QR but cannot tint modules by default.
- Minimum QR size is asset-specific and documented in `assetTypes.ts`.
- QR panel must include quiet zone.
- Any decorative frame must stay outside the quiet zone.
- Verification must fail if a template draws decorative marks over QR modules.

## Plan and Branding Rules

Use the existing branding-removal entitlement:

- Multi-location hides visible MenuList logo/name/domain when `ENABLE_MULTI_LOCATION_MENULIST_BRANDING_REMOVAL` is true.
- Plans without branding removal show MenuList attribution.
- Do not add a separate owner toggle for branding removal.

Template access can be tiered, but output quality must not be poor on Official. Official gets fewer styles, not worse QR or weak layout.

## Optional Style Suggestion

The recommended fallback should remain local and deterministic when neither a menu override nor business default exists:

```text
business type + brand color brightness + logo availability + selected asset type -> suggested template family
```

If a paid style advisor is enabled, it must reuse the existing protected AI accounting pattern seen in `src/app/api/menu-card-export/design-advisor/route.ts:88`, stay explicit on owner click, and never run while generating assets by default.

## Feature Flag Changes

Add:

```typescript
ENABLE_PRINTABLE_ASSET_TEMPLATES: true,
ENABLE_PRINTABLE_ASSET_EDITOR_RENDERER: true,
ENABLE_PRINTABLE_ASSET_EDITOR_CUSTOMIZE: true,
ENABLE_PRINTABLE_ASSET_STYLE_DEFAULTS: true,
PRINTABLE_ASSET_TEMPLATE_PLAN_IDS: ['menulist_official', 'menulist_pro', 'menulist_multi_location'],
PRINTABLE_ASSET_TEMPLATE_FULL_CATALOG_PLAN_IDS: ['menulist_pro', 'menulist_multi_location'],
```

No Cloud Function flag is needed because generation is client-side.

## Implementation Checklist

1. Add docs and feature flag.
2. Add template family catalog with 9 governed families and asset-level filtering.
3. Add asset type registry.
4. Add renderer adapter and template-aware output options.
5. Add desktop `/assets` route and nav item.
6. Keep compatibility route for `/use-menulist/print-assets`.
7. Add mobile shell screen and route mapping.
8. Wire project selection and missing-data states.
9. Add preview and download flow.
10. Add desktop governed customize flow for editor-renderable assets.
11. Add verification script for catalog, editor renderer, QR rules, and no hardcoded output data.
12. Run focused lint, TypeScript, and current print verifier.

## Verification Commands

```bash
npm run verify:menu-card-export
npm run test:print-asset-catalog-boundary
node scripts/verification/verify-printable-asset-templates.js
npx eslint --max-warnings=0 src/lib/printable-asset-templates src/components/templates/main-app/printableAssetTemplates src/components/mobile/screens/MobileShareScreen.tsx src/components/mobile/screens/MobileMoreScreen.tsx src/components/mobile/MobileShell.tsx
npx tsc --noEmit --incremental false
git diff --check
```

## Rollback Plan

- Disable `ENABLE_PRINTABLE_ASSET_TEMPLATES`.
- Keep existing `/use-menulist/print-assets` route and Menu Kit generation untouched.
- No generated preview/download artifact cleanup is needed. Explicit owner
  Saved designs remain governed registry records and must be retained unless a
  separate owner-authorized cleanup is performed.

### Raster-backed PDF size boundary

Generated raster-backed PDFs use jsPDF stream compression plus its lossless
`FAST` PNG compression mode. This applies to generated Table Tent, Entrance
Poster, Single Table Card, generic PNG-to-PDF conversion, and Creative Editor
PDF export. The correction preserves print dimensions and PNG/QR fidelity while
preventing Complete Menu Kit archives from carrying raw multi-megabyte raster
streams.

### Counter Sticker QR and Saved design recovery boundaries

- Counter Sticker identity, call-to-action, and QR layers occupy separate
  vertical regions. Every current template family must keep the call-to-action
  bounding box at or above the QR bounding box; no text may enter live modules.
- A new Saved design reserves one tenant/store/asset/family-scoped template ID
  for the complete in-flight save lifecycle. Repeated activation or an editor
  remount cannot allocate a second record while that lifecycle is unresolved.
- The editor exposes the parent save as a busy header action, disables Close
  while the save is pending, and retains the explicit wait acknowledgement.
- Saved design titles prefer the trimmed edited-document title. The generated
  platform-template title is only a fallback.
- Static Saved design delete confirmations must be named from their visible
  destructive title through the shared mounted confirmation-title bridge.
- Embedded-editor inspector icon actions must expose their exact purpose:
  lock/protected state, duplicate, delete, each horizontal/vertical background
  alignment, and indexed gradient-stop removal. Visual icon state alone is not
  sufficient.
- The Background panel must not render a read-only checkbox or handler-free
  button as an owner action. Color background is status; Add image layer is the
  explicit Images-tool handoff; Solid and Gradient remain the actual background
  mode actions.
- Desktop asset-preview downloads and Customize design are peer actions in one
  compact responsive row. The primary file download leads visually, all actions
  keep equal height, and the row stacks only on genuinely narrow screens.
