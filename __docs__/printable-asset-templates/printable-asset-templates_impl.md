# Printable Asset Templates - Implementation

## Implementation Status

**Status:** Implemented on June 6, 2026. Editor-backed printable customization added June 15, 2026. Four-module QR quiet-zone hardening added June 25, 2026. Route permission parity hardened July 1, 2026.

The feature is live as a guarded owner route at `/assets`, with `/use-menulist/print-assets` kept as a compatibility route. Desktop and mobile both use the same asset type catalog, template family catalog, and `renderPrintableAsset()` adapter. Non-menu printable assets render from shared `CreativeEditorDocument` templates; desktop can open the generated document in the shared editor for governed customization before download.

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

## Implemented File Structure

```text
src/lib/printable-asset-templates/
  assetTypes.ts
  editorDocumentAdapter.ts
  navigation.ts
  renderPrintableAsset.ts
  templateFamilies.ts
  templateStyles.ts
  types.ts

src/components/templates/main-app/printableAssetTemplates/
  PrintableAssetTemplatesRoute.tsx

src/modules/creative-editor/
  export.ts
  types.ts

src/components/mobile/screens/MobileShareScreen.tsx
src/components/mobile/screens/MobilePrintAssetsScreen.tsx
src/components/mobile/MobileShell.tsx

src/app/(main)/assets/
  page.tsx

scripts/verification/
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
  | 'modern-calm'
  | 'brand-banner'
  | 'soft-curve'
  | 'qr-first'
  | 'local-bold'
  | 'clean-utility';

export type PrintableAssetRenderInput = {
  activePlanType?: string | null;
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
| `campaign_flyer` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `gift_certificate` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `business_card` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `staff_id_card` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `event_invitation` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `postcard` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `product_tag` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `campaign_poster` | `buildPrintableAssetEditorDocument()` plus Creative Editor PNG/PDF render. |
| `print_menu` | Menu Card Export preset/style mapping, using existing `renderPdf`. |
| `complete_menu_kit` | `generateMenuKit(menuKitInput)` with `templateFamilyId` in `MenuKitInput`. |

Single printable assets support PDF and image downloads from the same selected template. The owner-facing preview is image-first and uses real generated output: table tent, single table card, entrance poster, counter sticker, feedback QR, campaign flyer, gift certificate, front/back business card, ID card, invitation, postcard, product tag, and campaign poster use generated Creative Editor PNG previews; Print Menu renders the generated menu PDF first page as PNG. Desktop Print Menu must read the full selected project only when needed, use the no-loader DAL helper, and cache that project data for repeated template preview/download actions. The existing PDF.js CDN-first preview loader is bounded to five seconds and then falls back to the pinned local `pdfjs-dist` dependency, so an offline/stalled CDN cannot leave preview generation pending indefinitely. Editor-backed PNG export is wrapped into print-size PDF with `jsPDF` for PDF output. Business Card image export uses `renderPrintableAssetEditorDocumentFiles()` to render separate front and back PNG files from the same side-by-side editor document, while PDF remains one paired print handoff file. Complete Menu Kit remains ZIP-only.

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
- PNG/PDF export applies MenuList attribution at runtime through `resolveMenuListAttributionPolicy()`, so non-premium output is branded and eligible higher plans can remove it without placing branding inside the editor canvas.
- The editor document is the source for preview, default download, and customized download.
- Business logo/initials, short link, and attribution remain outside the QR pattern. Do not add center-logo QR overlays or unsupported trust/consent copy to normal MenuList page QR assets.

Full Print Menu uses the existing Menu Card Export renderer, which currently has three real layout families (`classic`, `premium`, `compact`). Therefore `print_menu` exposes only `classic-luxe`, `modern-calm`, and `qr-first` in Assets so owners do not see nine choices that collapse into the same PDF output. Editor-backed QR/display/campaign assets keep the full 9-family catalog because their renderers own family-specific header, logo, decoration, and color treatments.

`MenuKitInput` now includes optional `templateFamilyId` in `src/lib/menu-kit/types.ts`.

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
Assets
  left: asset type rail
  right: template grid
  click template: action modal with generated output preview
  optional desktop action: Customize in editor
```

Template cards do not persist a separate selected state. Clicking a template opens a modal, immediately shows a preview, and shows **Download PDF** plus **Download image** for single assets. Business Card image action downloads front and back PNG files. Complete Menu Kit shows **Download ZIP** only. For editor-renderable assets, desktop also shows **Customize in editor**, which opens the generated `CreativeEditorDocument` in a fullscreen overlay. The overlay keeps the editor mounted independently of the Assets page so the page does not resize or flicker. This route mounts the shared editor in embedded mode only; the asset route owns Image, Print PDF, close, and optional Save as template actions, while CampaignCue-only AI Tools, Design Cue handlers, and asset registration stay out of this flow.

## Mobile Route

Mobile does not open `/assets` as a desktop-responsive page from tabs.

Implementation:

- Reuse the existing `printAssets` More sub-screen.
- Map `/assets` and `/use-menulist/print-assets` into `MobileShell` state.
- Add a More-tab item named `Assets`.
- Reuse `MobileProjectsProvider` and current Share/Print Assets data handlers.
- Use mobile asset-type cards and a one-column template family list with a fixed preview thumbnail and readable copy.
- Tapping a template family opens an in-shell bottom sheet, immediately shows a preview, and shows PDF/image download actions for that exact template.
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
| Branding visibility | Existing `activePlanType` plus `ENABLE_PREMIUM_MENULIST_BRANDING_REMOVAL`. |

No renderer may contain example business names, fixed restaurant-only text, fixed URLs, or fixed logos.

## QR Safety Rules

- QR modules remain near-black on white.
- Template color may frame the QR but cannot tint modules by default.
- Minimum QR size is asset-specific and documented in `assetTypes.ts`.
- QR panel must include quiet zone.
- Any decorative frame must stay outside the quiet zone.
- Verification must fail if a template draws decorative marks over QR modules.

## Plan and Branding Rules

Use existing premium branding removal:

- Premium hides visible MenuList logo/name/domain when `ENABLE_PREMIUM_MENULIST_BRANDING_REMOVAL` is true.
- Non-premium plans show MenuList attribution.
- Do not add a separate owner toggle for branding removal.

Template access can be tiered, but output quality must not be poor on Starter. Starter gets fewer styles, not worse QR or weak layout.

## Optional Style Suggestion

Default selection should be local and deterministic:

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
PRINTABLE_ASSET_TEMPLATE_PLAN_IDS: ['starter', 'pro', 'premium'],
PRINTABLE_ASSET_TEMPLATE_FULL_CATALOG_PLAN_IDS: ['pro', 'premium'],
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
- No Firebase cleanup needed because no generated files are stored.
