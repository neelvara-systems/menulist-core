# Printable Asset Templates - Implementation

## Implementation Status

**Status:** Implemented on June 6, 2026. Editor-backed printable customization added June 15, 2026.

The feature is live as a guarded owner route at `/assets`, with `/use-menulist/print-assets` kept as a compatibility route. Desktop and mobile both use the same asset type catalog, template family catalog, and `renderPrintableAsset()` adapter. Non-menu printable assets render from shared `CreativeEditorDocument` templates; desktop can open the generated document in the shared editor for governed customization before download.

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
| Mobile More exposes Assets. | `src/components/mobile/screens/MobileMoreScreen.tsx:450` |

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
| `print_menu` | Menu Card Export preset/style mapping, using existing `renderPdf`. |
| `complete_menu_kit` | `generateMenuKit(menuKitInput)` with `templateFamilyId` in `MenuKitInput`. |

Single printable assets support PDF and image downloads from the same selected template. The owner-facing preview is image-first and uses real generated output: table tent, single table card, entrance poster, counter sticker, and feedback QR use generated Creative Editor PNG previews; Print Menu renders the generated menu PDF first page as PNG. Desktop Print Menu must read the full selected project only when needed, use the no-loader DAL helper, and cache that project data for repeated template preview/download actions. Editor-backed PNG export is wrapped into print-size PDF with `jsPDF` for PDF output. Complete Menu Kit remains ZIP-only.

### Editor Document Contract

`editorDocumentAdapter.ts` owns the print-template-to-editor mapping:

- `isPrintableAssetEditorRenderable(assetTypeId)` gates which assets use the editor renderer.
- `buildPrintableAssetEditorDocument(input)` creates the neutral `CreativeEditorDocument`.
- `renderPrintableAssetEditorTemplate(input)` renders default preview/download output without mounting the editor UI.
- `renderPrintableAssetEditorDocument({ document, assetTypeId, outputFormat })` renders an edited document to PNG/PDF.

Document rules:

- QR layers are locked and carry source refs for menu/feedback URL.
- Short-link and MenuList attribution layers are locked.
- Business name, headline, instruction, and CTA copy remain editable.
- Premium attribution follows `resolveMenuListAttributionPolicy()`.
- The editor document is the source for preview, default download, and customized download.

Full Print Menu uses the existing Menu Card Export renderer, which currently has three real layout families (`classic`, `premium`, `compact`). Therefore `print_menu` exposes only `classic-luxe`, `modern-calm`, and `qr-first` in Assets so owners do not see nine choices that collapse into the same PDF output. QR/display assets keep the full 9-family catalog because their renderers own family-specific header, logo, decoration, and color treatments.

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

Template cards do not persist a separate selected state. Clicking a template opens a modal, immediately shows a preview, and shows **Download PDF** plus **Download image** for single assets. Complete Menu Kit shows **Download ZIP** only. For editor-renderable assets, desktop also shows **Customize in editor**, which opens the generated `CreativeEditorDocument` in a fullscreen overlay. The overlay keeps the editor mounted independently of the Assets page so the page does not resize or flicker. This route mounts the shared editor in embedded mode only; the asset route owns Image, Print PDF, close, and optional Save as template actions, while CampaignCue-only AI Tools, Design Cue handlers, and asset registration stay out of this flow.

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
node scripts/verification/verify-printable-asset-templates.js
npx eslint --max-warnings=0 src/lib/printable-asset-templates src/components/templates/main-app/printableAssetTemplates src/components/mobile/screens/MobileShareScreen.tsx src/components/mobile/screens/MobileMoreScreen.tsx src/components/mobile/MobileShell.tsx
npx tsc --noEmit --incremental false
git diff --check
```

## Rollback Plan

- Disable `ENABLE_PRINTABLE_ASSET_TEMPLATES`.
- Keep existing `/use-menulist/print-assets` route and Menu Kit generation untouched.
- No Firebase cleanup needed because no generated files are stored.
