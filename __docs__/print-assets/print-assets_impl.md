# Print Assets Implementation

**Status:** Implemented
**Last Updated:** July 29, 2026

## Architecture

Assets is a route/screen layer over existing generators. The older "Print Assets" name remains in compatibility docs and route names only.

| Layer | File |
| --- | --- |
| Feature flag | `src/config/features.ts` |
| Asset catalog | `src/lib/print-assets/printAssetCatalog.ts` |
| Navigation helper | `src/lib/print-assets/navigation.ts` |
| Owner print guidance | `src/lib/print-assets/ownerPrintGuidance.ts` |
| Dedicated desktop route | `src/app/(main)/assets/page.tsx` |
| Compatibility desktop route | `src/app/(main)/use-menulist/print-assets/page.tsx` |
| Desktop UI | `src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx` |
| Editor-backed printable renderer | `src/lib/printable-asset-templates/editorDocumentAdapter.ts` |
| Shared Creative Editor export helpers | `src/modules/creative-editor/export.ts` |
| Mobile route mapping | `src/components/mobile/MobileShell.tsx` |
| Mobile More entry | `src/components/mobile/screens/MobileMoreScreen.tsx` |
| Mobile screen wrapper | `src/components/mobile/screens/MobilePrintAssetsScreen.tsx` |
| Shared mobile logic | `src/components/mobile/screens/MobileShareScreen.tsx` |

## Catalog Contract

`src/lib/printable-asset-templates/assetTypes.ts` owns the active runtime IDs,
copy, placement, size, template and output-format contract.
`src/lib/print-assets/printAssetCatalog.ts` is a compatibility projection of
that registry for older type/import paths; it no longer duplicates runtime
rows. Runtime downloads use semantic Menu Kit asset keys through
`generateMenuKitAsset()` so one requested file does not render the whole ZIP.
`PRINT_ASSET_MENU_KIT_INDEX` is kept only as a guarded ZIP-order compatibility
map:

- `table_tent -> 0`
- `single_table_card -> 9`
- `counter_sticker -> 1`
- `entrance_poster -> 2`

New printables must be added to `PRINTABLE_ASSET_TYPES`; the compatibility
catalog derives automatically. The focused catalog regression requires exact
ID/copy/placement/size parity, unique IDs/groups, complete placement grouping,
and Menu Kit key/index alignment. Do not add owner-facing downloads that depend
on `result.assets[index]` outside the compatibility map/verifier.

## Owner Guidance Contract

`src/lib/print-assets/ownerPrintGuidance.ts` owns shared owner guidance:

- print readiness items for live link, logo, brand color, business name length, and feedback QR state
- print-shop file specs and copyable handoff message
- reprint guidance

Do not fork this wording between desktop and mobile. Do not add table-count or quantity estimation here; it is intentionally excluded from the feature.

## Desktop Flow

`/assets` renders the dedicated `PrintableAssetTemplatesRoute` workspace and is guarded by `ENABLE_PRINTABLE_ASSET_TEMPLATES`. `/use-menulist/print-assets` remains as a compatibility route and renders the same workspace while the new flag is enabled. Desktop links use route builders so selected-project query handling is centralized. Use MenuList, Assets, and Print Menu transitions use `router.push(...)`, not `window.location`, so the dashboard does not perform a full document reload. The page reuses the same data loading, project selector, full Menu Kit ZIP generator, single Menu Kit asset generator, PDF export entry, feedback QR generator, brand color, logo, and plan data as the overview page.

Desktop Assets adds template-family actions on top of readiness, print-shop handoff, preview, and reprint guidance. Clicking a template opens a modal for that exact template, shows the generated output preview inside the modal, and offers separate PDF/image download actions. Table Tent, Single Card, Counter Sticker, Entrance Poster, Feedback QR, Flyer, Gift Certificate, Business Card, ID Card, Invitation, Postcard, Product Tag, and Campaign Poster use editor-backed `CreativeEditorDocument` templates for preview/download and can open **Customize in editor** as a fullscreen governed editor. Business Card PDF renders front and back faces together for print handoff; Business Card image download renders two separate PNG files, one front and one back. Print Menu renders the generated menu PDF first page as the image preview. Preview, edited documents, and downloads create temporary browser blobs without uploading output.

Use MenuList keeps an overview shortcut named Assets.

## Mobile Flow

Mobile routes `/assets` and `/use-menulist/print-assets` map to:

```ts
{ tab: 'more', moreScreen: 'printAssets' }
```

`MobileMoreScreen` renders `MobilePrintAssetsScreen`, which reuses `MobileShareScreen` in focused `printAssets` mode. This preserves existing mobile project selection and download handlers. Template rows open an in-shell bottom sheet with the preview already visible and separate PDF/image download actions. Individual file downloads use the shared printable renderer, matching desktop output without generating the full ZIP first unless the owner chooses Complete Menu Kit. Mobile does not expose drag/resize editing, but it uses the same editor-backed document renderer for supported single assets, including campaign flyers, gift certificates, front/back business cards, ID cards, invitations, postcards, product tags, and campaign posters. Business Card image download also downloads both front and back PNG files on mobile.

The More entry label is `QR and print assets`; compatibility route names and docs can still use Print Assets for the implementation boundary.

Mobile preview stays inside the same in-shell bottom sheet. It must not route to the desktop print-assets page from inside the PWA shell.

## Validation

Run:

```bash
npm run verify:menu-card-export
npx eslint --max-warnings=0 src/lib/print-assets/printAssetCatalog.ts src/components/templates/main-app/useMenuList/index.tsx src/components/mobile/MobileShell.tsx src/components/mobile/screens/MobileMoreScreen.tsx src/components/mobile/screens/MobileShareScreen.tsx src/components/mobile/screens/MobilePrintAssetsScreen.tsx src/lib/menu-kit/menuKitGenerator.ts
npx tsc --noEmit --incremental false
```
