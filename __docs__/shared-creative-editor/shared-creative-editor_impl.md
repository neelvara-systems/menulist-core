# Shared Creative Editor - Implementation

## Runtime Contract

Shared Creative Editor is a reusable client module under `src/modules/creative-editor/`. The base module owns document state, optional page/artboard state, the Fabric.js editing runtime, the full editor shell, type-aware top contextual property toolbar, searchable drawer, canvas-anchored selected-layer quick actions, layer controls, element rendering, local starter templates, import/export, preview, and browser-local editing. Product adapters own data loading, trust, rights, Firebase, Storage, and saved asset records.

## File Map

| Path | Purpose |
| --- | --- |
| `src/modules/creative-editor/types.ts` | Product-neutral document, element, asset, and export result types. |
| `src/modules/creative-editor/templates.ts` | Blank and starter template document builders. |
| `src/modules/creative-editor/export.ts` | SVG serialization, QR data URLs, PNG export, and file download helpers. |
| `src/modules/creative-editor/fabricAdapter.ts` | Fabric runtime adapter, object mapping, workspace, snap guidelines, panning, and neutral document serialization. |
| `src/modules/creative-editor/CreativeEditor.tsx` | Shared editor UI and layer/property controls. |
| `src/modules/creative-editor/DesignCuePanel.tsx` | Product-neutral Design Cue command/comment/result panel. |
| `src/modules/creative-editor/CreativeEditor.module.scss` | Editor layout and responsive styles. |
| `src/modules/creative-editor/index.ts` | Public module exports. |
| `src/app/(internal)/creative-editor-smoke/page.tsx` | Development-only browser smoke route; returns 404 in production. |
| `src/app/(internal)/creative-editor-smoke/CreativeEditorSmokeClient.tsx` | Development-only browser QA probe for the shared editor smoke route. |
| `scripts/verification/verify-creative-editor-smoke.js` | Static guard for the smoke QA route, focus selectors, and shared-editor QA documentation. |
| `src/modules/creative-editor/providers/campaigncue.ts` | CampaignCue adapter only. |
| `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` | CampaignCue tab/entry integration and asset registration callback. |

## Flags

| Flag | Default | Purpose |
| --- | --- | --- |
| `ENABLE_SHARED_CREATIVE_EDITOR` | `true` | Enables shared editor module usage. |
| `ENABLE_SHARED_CREATIVE_EDITOR_INTERACTIVE_CANVAS` | `true` | Enables day-one browser editor controls. |
| `ENABLE_SHARED_CREATIVE_EDITOR_FABRIC_ADAPTER` | `true` | Enables the shared Fabric.js 7.4.0 editor runtime. |
| `ENABLE_CAMPAIGNCUE_CREATIVE_EDITOR` | `true` | Lets CampaignCue open the shared editor. |
| `ENABLE_CAMPAIGNCUE_RENDERED_ASSET_EXPORTS` | `true` | Lets CampaignCue register editor exports as asset records. |
| `ENABLE_CAMPAIGNCUE_DESIGN_CUE` | `true` | Lets CampaignCue pass deterministic Design Cue commands and handlers into the shared editor. |
| `ENABLE_CAMPAIGNCUE_DESIGN_CUE_MODEL_ASSIST` | `false` | Keeps model-backed Design Cue turns disabled/fail-closed until provider/cost gates are ready. |

## Document Schema

`CreativeEditorDocument` stores:

- `schemaVersion`
- `id`
- `title`
- `productContext`
- `canvas`
- `elements`
- optional `activePageId`
- optional `pages`
- `metadata`

Element types:

- `text`
- `pathText`
- `rect`
- `ellipse`
- `triangle`
- `polygon`
- `path`
- `line`
- `image`
- `qr`

Common element data includes position, size, rotation, visibility, locking, opacity, flip state, and shadow. Text and path-text elements include font family, weight, style, underline, strike, size, line height, character spacing, text background, gradient, alignment, and copy. Path-text also stores the editable SVG path and optional guide color/visibility. Fillable shapes can carry a multi-stop linear gradient. Image elements include source URL/data URL, filter preset, filter adjustments, optional transparent-image outline metadata, and optional border metadata. Stroke-capable elements use a shared border contract covering solid, dashed, long-dashed, dash-dot, dotted, and round-cap variants. Line elements also store basic, arrow, and thin-tail arrow styles. Document metadata can store an optional visible export watermark, product-provided brand colors/fonts/logos, and editable text placeholders such as business name, offer, CTA, destination, and contact facts. The internal editor watermark remains non-exported.

Optional `pages` store artboards as `{ id, title, locked, canvas, elements }`. For backward compatibility, the active page is mirrored into root `canvas` and `elements`; old single-page documents without `pages` normalize into one page at runtime. SVG/PNG export and clipboard output use the active page. Base64 text clipboard export waits for Clipboard API success or acknowledged textarea fallback success before showing copied feedback; failed diagnostics include clipboard/fallback support booleans and generated text length only. PNG image clipboard export still depends on browser image clipboard support. JSON export preserves the page list.

The schema is deliberately not Fabric JSON. The active Fabric adapter maps the neutral schema to Fabric objects and back without forcing all products to inherit a Fabric-specific persistence format. Compatible Fabric JSON can be imported and normalized into the neutral document schema.

## Full editor shell

The shared editor UI now mirrors the target editor screen:

- Top toolbar: product mark, home affordance, drawing title, new design, dimensions, import design JSON, import raster image file, grid/ruler toggle, safe-area guide toggle, review/download check, export bundle, reset, undo, redo with owner-readable change labels, theme toggle, share, preview, primary PNG download, and save.
- Contextual property toolbar: remains available as compact quick controls when the right properties panel is closed. Normal layer selection opens the right properties panel so text, image, shape, line, QR, and multi-selection editing options live in the old editor-style side panel.
- Left rail: AI Tools, Templates, Background, Illustrations, Images, Text, Styles, Graphics, Characters, Shapes, QR, Barcode, My Stuff, and Brand Kit.
- Asset drawer: active local starter templates, campaign goal starters, curated static illustration/graphic/character assets, background colors, common SMB canvas-size presets, manual size fields, guarded image URL/source inputs, Images-drawer raster upload, My Stuff upload/recent/approved-assets shortcuts, safe raster-image import guidance, text presets, ready-made text templates from `src/modules/creative-editor/textTemplates.json`, project style presets, product-provided business text placeholders, searchable approved assets, Brand Kit quick picks, shape tools, and QR value/color/size insertion. Large local asset/template lists are capped per drawer render and rely on drawer search to narrow the result set instead of forcing every card into the DOM at once.
- Styles: browser-local project presets apply unlocked layer colors/fonts/background, Brand style applies adapter-provided brand colors/font, Shuffle cycles local presets, and text-combination cards insert editable text layers. This is a VistaCreate-inspired shortcut layer, not a remote stock/search/provider surface.
- Center canvas: old editor-style full-screen Fabric viewport containing the workspace/output frame as the primary exported surface, ruler/grid orientation, non-exporting safe-area and center guides, selection outline, handles, drag movement, resize, rotate, auto-fit zoom, fit, Selection mode, Fabric viewport Grab panning, Draw mode, Polygon mode, freehand path creation, click-to-draw polygon creation, wheel zoom, keyboard movement, copy/paste, delete, grouping, layer-order shortcuts, text-format shortcuts, alignment/distribution shortcuts, temporary Space Grab, snap guidelines, and a floating selected-layer toolbar. Workspace viewport metric updates are coalesced during Grab movement so rulers and safe-area overlays stay aligned without state churn on every pointer event.
- Floating selected-layer toolbar: derives position from the active Fabric selection bounds and current editor zoom, stays outside the Fabric export surface, and reuses existing editor actions for Design Cue entry, edit, color, style/effects, flip, position/layers, lock, duplicate, delete, group, distribute, and more controls. It defers position recalculation while an editor form control is focused, coalesces repositioning to animation frames, and skips unchanged toolbar state so color pickers, toolbar fields, contextual toolbar fields, and inspector fields do not lose focus during selected-layer updates. It must not create a second mutation path or store toolbar state in the neutral document schema.
- Page controls: hidden for normal single-page/image-first editing; multi-page documents can still lock, duplicate, add, switch artboards, and show the active page count. Locked pages disable layer/canvas mutations until unlocked.
- Right properties panel: floating right drawer with download readiness panel, selected thumbnail, lock/duplicate/delete, selected-item priority controls, colors, alignment with background, group/ungroup, distribute X/Y, flip X/Y, layer z-order, layer details, advanced effects, visible watermark, and export/clipboard buttons. It is absolutely positioned over the editor body, so opening/closing it must not change the central Fabric viewport width, refit zoom, or flicker the workspace frame. The priority section puts text editing, image replacement, QR value/colors, simple color, opacity, position/size, and Design Cue entry above lower-frequency controls. Text priority controls include business text chips, browser-local readability, shorten, CTA insertion, contact insertion, center, bring-front, safe-area fit, contrast, size, length, and action-readiness checks. Image priority controls include replace, fit, fill, larger, flip, filter, behind-text placement, opacity, and position before lower-frequency adjustments. Unsupported advanced panels such as image filters, borders, gradients, and shadows are hidden when the selected layer cannot use them. High-frequency selected-layer edits such as text, typography, opacity, position, size, simple fills, borders, shadows, and rotation patch the active Fabric object in place so inspector inputs keep focus; no-op selected-layer changes are ignored before document commit/history; QR regeneration, image filters/outlines, source changes, polygon points, line arrow geometry, and path-text guide changes still use a full canvas reload.
- Active layers panel: the canvas Layers button opens a separate floating right-panel mode with visible/locked counts, current owner-readable history label, inline selected-layer rename, layer thumbnails, select, visible, lock, quick edit, drag/drop reorder, stack movement, and export controls. Selecting a layer from this panel keeps stack management visible; selecting directly on the canvas opens properties. Drag/drop reorder updates the neutral element stack locally, preserves the selected layer, blocks locked source layers, and reloads Fabric once after the drop.
- Theme parity: the shell supports light and dark themes with the same control layout.

AI Tools are a product-provided extension point in the shared implementation. The shared editor renders action groups, runs the supplied handler, displays suggestions/findings above the remaining tool groups once a result exists, lets the owner explicitly add or copy text, and can render the neutral Design Cue panel when a product supplies commands plus request/apply handlers. AI suggestion text copy waits for Clipboard API success or acknowledged textarea fallback success before showing copied feedback; failed copy diagnostics include clipboard/fallback support booleans and text length only. Product adapters own the action list, deterministic resolver, cost policy, provider boundary, and persistence. Templates are active local document starters and do not call provider APIs.

Conversation/comment assistants such as CampaignCue Design Cue remain product-adapter behavior. The shared editor exposes neutral selection, selected-layer/document targets, patch preview, owner approval, history commit, and patch-apply primitives, but CampaignCue owns intent resolution, model policy, trust checks, cost gates, and Firebase persistence. Model output must not directly mutate Fabric objects or become product truth.

## Browser Smoke QA

`/creative-editor-smoke?qa=1` is the development-only automated smoke path for the shared Fabric editor. It renders the same full-canvas editor shell and runs browser-side checks for real Fabric canvas paint, top-bar theme/grid/safe-area/review toggles, rail tab switching, drawer insertions for text/stickers/shapes/QR/barcode, keyboard creation shortcuts, floating toolbar anchoring, shortcut modal focus restoration, preview PNG creation, Active Layers drawer rows, right-panel text/font-size focus retention, staged Escape behavior, and drawer collapse. `/creative-editor-smoke?qa=1&variant=stress` uses the same harness with a stress variant containing many mixed text, shape, image, line, and QR layers so large-design regressions are visible before product integration work.

The QA harness uses stable `data-creative-editor-*` selectors exposed by `CreativeEditor.tsx`. Those selectors are intentionally structural and must remain product-neutral. Shortcut and preview dialogs use focus restoration plus a local Tab focus trap so keyboard traversal stays inside open dialogs and returns to the triggering button when closed. The static verifier `npm run verify:creative-editor-smoke` protects the smoke route, stress variant, focus restoration, selectors, and documentation contract.

## Temporary Local Preview

`/sites/mycodex/creative-editor-test` is the internal target for the temporary preview route. Reach it locally through the MyCodex dev prefix as `http://localhost:3000/__mycodex/creative-editor-test`.

This route must remain temporary and feature-flag gated. In deployed environments it returns 404 unless a future private MyCodex host is explicitly approved and `FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_EDITOR_TEST_ROUTE` is enabled. It is marked noindex/nocache, uses the same in-memory CampaignCue editor test fixture as `/__campaigncue/app/editor-test`, and does not persist design data, write Firebase, upload Storage files, call provider APIs, or enable social publishing.

## CampaignCue Adapter

The CampaignCue adapter builds documents from:

- `CampaignCueWorkspace`
- `CampaignCueBusinessBrain`
- optional `CampaignCueCampaign`
- optional `CampaignCueOutput`
- optional `CampaignCueAsset[]`

It passes campaign/source refs, Brand Kit metadata, and editable text placeholders into `CreativeEditorDocument.metadata`. CampaignCue registers exported assets through `POST /api/campaigncue/assets` and keeps the exported file itself as browser download/manual handoff until a Storage upload path is explicitly added.

## MenuList Adapter Contract

When MenuList uses the shared editor for generated print assets or uploaded menu item images, it must use a separate MenuList adapter instead of reusing the CampaignCue adapter.

MenuList adapter rules:

- Use MenuList session, tenant, store, project, and item authority.
- Respect master/outlet image governance before opening edit or reconstruction actions.
- Use MenuList media image profiles, Storage paths, and project/item DAL writes.
- Use existing AI capacity/accounting, SAFE_MODE, rate limiting, task-secret worker validation, and bounded batch patterns before provider work.
- Invalidate public menu and Official Business Page cache when an accepted edited image changes public output.
- Printable Asset Templates use `src/lib/printable-asset-templates/editorDocumentAdapter.ts` to create browser-local `CreativeEditorDocument` files for Table Tent, Single Card, Counter Sticker, Entrance Poster, and Feedback QR. These docs lock QR/link/attribution layers, use current MenuList project/store context, and download PNG/PDF without Firestore or Storage writes.
- Printable Asset Templates mount `CreativeEditor` with `chromeMode="embedded"`, `productLabel="MenuList Assets"`, `sourceLabel="Print assets"`, and the optional template-save callback. The print-assets modal owns Image, Print PDF, close, and save-template routing, so the editor must not show its full top bar, browser draft status, or internal SVG/PNG/JSON/copy/bundle export shortcuts in this flow.
- CampaignCue mounts `CreativeEditor` in full mode from `CampaignCueWorkspaceApp.tsx` and owns CampaignCue AI Tools, Design Cue, asset-source adapters, and export registration. It must not pass the MenuList template registry callback or store template collections into the editor.
- Keep the shared editor free of MenuList imports; pass all product behavior through adapter callbacks and metadata.

## Security

- No new API route is required for the shared editor.
- CampaignCue export registration continues to use `withAuth()`, CampaignCue scope guards, rate limiting, and Zod validation in `src/app/api/campaigncue/assets/route.ts`.
- External images may block PNG export if the browser canvas is tainted. The editor can keep SVG/JSON export available for normal documents, or hide those formats when a product adapter disables them for trust or private-URL reasons.
- Product adapters must not pass private file URLs unless the product controls CORS and access policy.
- Arbitrary owner-provided SVG files or pasted SVG markup are not imported as runtime image layers. SVG-looking URLs, extensionless owner-entered URLs, data URLs, JavaScript URLs, and direct selected-image source edits are rejected. The editor can export its own generated SVG from the neutral document model, and product adapters can still provide curated/internal approved assets, but owner imports are limited to raster files and direct raster-looking image URLs.
- Product adapters may disable specific browser export formats. CampaignCue CueLayers disables SVG and JSON browser exports while a hydrated CueLayers design is active so private runtime URLs and unowned runtime JSON do not leave the server-owned export path.

## Cost

Base editor actions are browser-local and cost zero Firebase reads/writes. CampaignCue writes one asset metadata record plus one event only when the user saves/registers an exported asset.

## Implementation Notes

- Campaign goal starters compose existing local actions: background update, data-backed text-template insertion, and optional QR insertion. They are not remote templates and they do not bypass normal document history.
- The pre-download readiness check is browser-local and advisory. It blocks the first download attempt for the same actionable issue signature, lets the owner inspect or fix the issue, and allows a repeat export attempt when the owner intentionally continues.
- Export bundle downloads are client-side PNG resizes of the active workspace image into common handoff sizes. The first implementation downloads multiple PNG files directly instead of creating a ZIP dependency.
- Local autosave uses browser `localStorage` only. Its version-2 key encodes product, workspace, source surface label, and document ID as collision-safe segments. A recovered payload must pass `creativeEditorDocumentSchema` and exactly match the current product, workspace, and document before it can be offered. Invalid/corrupt/cross-scope drafts are removed, storage failures are logged without interrupting export or product-owned save, and recovery applies only when the owner accepts a newer local draft. Product adapters remain the persistence authority.
- Review mode is a UI state for inspection/download readiness. It opens the readiness panel, fits the output frame, collapses low-frequency drawer space on narrow screens, and does not change the document schema.
- Owner-readable history labels are kept in editor runtime state alongside the undo stack. They are used for Undo/Redo notices and layer panel context, and are not serialized as product data.
- Use `qrcode`, already present in the repo, for QR element rendering.
- Use `fabric@7.4.0` for the browser editing engine. Fabric 7 uses bundled types, Promise clone/image APIs, collection-owned stack methods, and explicit group/active-selection conversion. `configureCreativeFabric()` retains the neutral document's left/top coordinate contract even though Fabric 7 defaults new objects to centered origins.
- Keep `creativeEditorSrc` as editor metadata instead of mutating Fabric 7's protected image `src`. Product persistence still stores `CreativeEditorDocument` image `src`; Fabric object metadata is only an editing bridge.
- Temporary grouping must remove the active selection, create a `Group` without changing scene coordinates, and reverse through `removeAll()` plus a new `ActiveSelection`. Persistence releases temporary groups before neutral serialization.
- The visible Fabric canvas must fill the remaining workspace area. `CreativeEditorDocument.canvas.width/height` define the internal Fabric workspace rect that exports/downloads, not the DOM canvas dimensions. Runtime zoom, wheel zoom, and Grab mode must update Fabric `viewportTransform`; they must not CSS-scale a frame-sized canvas or pan a scroll container.
- SVG, PNG, preview, clipboard PNG, and base64 export must temporarily reset the Fabric viewport to identity and crop to the workspace rect, then restore the user's current zoom/pan state. Export must never include surrounding editor workspace pixels.
- The old Vue Fabric editor was used as a parity reference for shell structure, safe imports, templates, layers, transforms, grouping, flip, filters, image borders/outlines, typography, path text, text decoration, gradients, SVG/PNG/JSON export, clipboard export, ruler orientation, and drawing tools. Arbitrary SVG import was intentionally not carried over because it conflicts with the renderer allowlist and trusted-asset boundary.
- The floating selected-layer toolbar must remain an overlay in `CreativeEditor.tsx` and `CreativeEditor.module.scss`. It reads Fabric selection bounds, anchors below the active selection bottom border, clamps at viewport edges only when needed, calls existing action handlers, and is not serialized into `CreativeEditorDocument`, Fabric JSON imports, SVG export, PNG export, or product adapter payloads.
- Local sticker assets use data-URI SVGs with explicit dimensions. Fabric image loading must not apply anonymous CORS options to data/blob URLs; remote raster images still use anonymous CORS for safe canvas export.
- The contextual property toolbar must call the same edit handlers as the inspector and floating toolbar. It must not introduce a second mutation model.
- Page support must keep root `canvas`/`elements` as the active page mirror so existing adapters and exports continue to work. Product adapters can ignore `pages` until they need multi-artboard output.
- Drawer search, recents, Brand Kit, and text placeholders are browser-local UI affordances over already-loaded product metadata and approved asset sources. Campaign goal starters, business chips, and drawer item caps follow the same browser-local boundary over product metadata and static JSON. They must not add direct shared-editor Firebase reads or remote material/template APIs.
- Keyboard shortcut support is defined in the local `KEYBOARD_SHORTCUT_GROUPS` list and rendered through a theme-aware shortcut panel. The global key handler must ignore form fields and active Fabric text editing for normal shortcuts, keep Escape behavior predictable, use existing editor actions for mutations, and keep Space as temporary Grab instead of a page mutation. Escape has its own staged unwind order: close shortcut/preview/readiness/Design Cue/AI result popups, cancel polygon drafts, clear selected canvas layers and the floating toolbar, close an empty right drawer, then collapse the left drawer/search so the owner can preview the full workspace.
- Excluded legacy behavior is intentionally outside the shared product-neutral boundary: PSD service import, remote material/template API search, material upload APIs, mock login, language switching, and direct external share links.
- Do not import CampaignCue modules from the shared base editor.
- Do not store base64 PNG/SVG payloads in Firestore.
- Keep direct provider publishing disabled.
- Keep CampaignCue fallback URLs inside `providers/campaigncue.ts`; the base editor, templates, and exporter must stay product-neutral.
- Keep `src/app/(internal)/creative-editor-smoke/page.tsx` verification-only. It must remain production-blocked and must not write product data.

## Acceptance Checks

- `npm run verify:campaigncue` checks the CampaignCue integration and flags.
- `npx tsc --noEmit --incremental false` validates shared editor types.
- Browser smoke should cover blank editor, campaign-output editor, campaign goal starters, active templates, drawer search, Brand Kit quick picks, business text chips, text placeholders, common canvas-size presets, project Styles apply/shuffle, My Stuff upload/recent panel, local autosave restore/dismiss, keyboard shortcuts panel, shortcut-driven add text, shortcut-driven duplicate/delete/undo, top-bar Download, pre-download readiness panel, bundle PNG export, owner-readable undo/redo labels, mobile review mode, page add/switch/duplicate/lock, JSON/Fabric JSON import, raster image import from top toolbar and Images drawer, unsafe SVG import absence, preview, grid/ruler toggle, safe-area guide toggle, Fabric selection/drag/resize/rotate, contextual property toolbar, floating selected-layer toolbar edge placement/actions/non-export behavior, selected-item-first right properties order, dedicated Active Layers panel counts/rename/history context, text readability/shorten/CTA/contact/safe-area checks, image fit/fill/larger/behind-text actions, hidden irrelevant inspector panels, AI suggestions above remaining tool groups, Draw mode, Polygon mode, rail/drawer switching, layer reorder, grouping, distribute X/Y, flip, alignment, multi-stop gradient, visible watermark, shadow/angle, typography, path text, text decoration, image filter presets/adjustments including RemoveColor/Gamma/grayscale mode, image outline/border, polygon points, QR render and QR value/color edits, SVG download, PNG download, clipboard/base64 export, dark/light mode, and CampaignCue asset registration.
- When CampaignCue Firebase setup is unavailable locally, browser smoke may use `/creative-editor-smoke` to verify the reusable Fabric editor and then separately confirm CampaignCue stops at its setup blocker.
