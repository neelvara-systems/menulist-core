# Shared Creative Editor - Validation Record

## June 28, 2026 - Bounded Failure Notices

### Scope

Reviewed the shared editor failure-notice paths after the production-hardening sweep found raw exception messages reaching the editor status notice and AI tool findings. Canvas/Fabric load, AI suggestion copy, AI tool action, Design Cue request/apply, JSON import, image import/replace, clipboard copy, export bundle, export, and template-save failures now flow through one bounded runtime diagnostic helper before showing fixed product-neutral copy.

## Fabric 7.4 migration verification — July 24, 2026

The editor moved from Fabric 5.3.0 to 7.4.0 to remove the critical native canvas/tar advisory chain. This was a behavior migration rather than a type-only update:

- left/top object origins are explicitly retained so neutral document coordinates do not shift under Fabric 7's centered defaults;
- image loading, object cloning, copy, paste, and duplicate use Promise APIs;
- image filters use the exported Fabric 7 filter namespace;
- editor image metadata uses `creativeEditorSrc` instead of colliding with Fabric's protected `src`;
- stack changes run on the canvas collection;
- temporary group/ungroup rebuilds the object tree while preserving scene coordinates;
- canvas disposal is awaited asynchronously;
- SVG dimensions follow Fabric 7 string option types while PNG crop/export remains numeric.

Verified locally:

- `npm run typecheck`
- `npm run verify:creative-editor-smoke`
- `node scripts/verification/verify-campaigncue-runtime.js`
- `scripts/verification/test-creative-editor-fabric7-boundary.mjs` checks coordinate identity before/after group/ungroup, metadata cloning, filters, stacking, PNG output, and disposal against the installed Fabric runtime.
- `/creative-editor-smoke?qa=1` passed all 10 development-browser checks with 17 final layers and no console errors.
- `/creative-editor-smoke?qa=1&variant=stress` passed all 10 development-browser checks with 89 final layers and no console errors.

The browser pass also corrected the development probe's stale QR drawer label from `Add QR code` to the current owner-facing `Add plain QR`. The actual QR insertion path was not broken; after the selector correction, plain QR and barcode insertion passed through normal editor history.

No Firebase read/write, provider call, product persistence, or public output contract was added by this migration.

### Expected Runtime Behavior

- Static owner guidance such as unsupported file type, unsupported clipboard, and invalid editor JSON remains visible as local copy.
- Runtime/provider/callback failures do not display raw exception text in the editor notice or AI tool findings.
- Failure diagnostics record bounded product/source/document/action/file/export metadata and source error name/code/status through runtime diagnostics.
- `npm run verify:campaigncue` guards the shared editor failure codes and raw-notice bans.
- `npm run verify:creative-editor-smoke` continues to guard the smoke route and stable editor selectors.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, remote stock search, remote template search, or realtime listeners are added. This changes only browser-local failure copy and diagnostics.

## June 15, 2026 - Floating Toolbar Viewport Anchor Fix

### Scope

Reviewed the selected-layer quick action toolbar after MenuList Assets screenshots showed the bar drifting to different positions for shape, business-name text, and instruction-text selections. The toolbar now uses Fabric viewport-space selection bounds, measures the rendered toolbar width/height before clamping, and keeps the toolbar top edge below the selected bounding box bottom border with a fixed safe gap unless the visible viewport edge requires clamping.

### Expected Runtime Behavior

- Shape, text, QR, group, and multi-selection toolbars use the same bottom-border anchor rule.
- The toolbar centers under the selected bounding box when space allows.
- Edge clamping uses the measured toolbar size instead of action-count guesses.
- `/creative-editor-smoke?qa=1` verifies the toolbar gap and horizontal center through product-neutral QA attributes.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, remote stock search, remote template search, or realtime listeners are added. This is browser-local editor overlay positioning and QA coverage.

## June 14, 2026 - Creative Editor Smoke QA

### Scope

Added a development-only browser QA harness to the shared editor smoke route after the editor reached enough complexity that manual Chrome checks alone were no longer a durable regression strategy. The harness covers the core owner flow surfaces that repeatedly regressed during Canva/Vista/old-editor parity work: real Fabric canvas paint, floating selected-layer toolbar position, shortcut and preview modal focus restoration, preview PNG creation, Active Layers drawer rows, text/font-size right-panel focus retention, staged Escape cleanup, and a stress variant for larger mixed-layer documents.

### Expected Runtime Behavior

- `/creative-editor-smoke?qa=1` renders the shared editor, runs the in-page QA probe, and exposes `data-creative-editor-qa-status="passed"` when the checks complete.
- `/creative-editor-smoke?qa=1&variant=stress` runs the same checks against a large mixed text/shape/image/line/QR document.
- Shortcut and preview dialogs focus their Close controls on open, trap Tab traversal while open, close with Escape, and restore focus to the triggering button.
- Right-panel selected text and font-size controls keep focus after controlled value changes.
- The smoke route stays development-only and continues to return 404 in production.
- `npm run verify:creative-editor-smoke` statically guards the QA route, stress fixture, stable editor selectors, focus restoration helpers, and documentation contract.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, remote stock search, remote template search, or realtime listeners are added. This is development-only browser QA and shared editor focus/selector behavior.

## June 15, 2026 - End-to-End Editor QA Expansion

### Scope

Expanded the development-only smoke QA after a full editor walkthrough request so the route checks more than initial canvas paint. The browser harness now covers top-bar theme/grid/safe-area/review toggles, rail tab switching, drawer insertion flows for text, local stickers, shapes, QR, and barcode, keyboard creation shortcuts, floating toolbar anchoring, preview PNG export, Active Layers behavior, right-panel focus retention, staged Escape cleanup, and stress-layer rendering.

### Expected Runtime Behavior

- The smoke QA route proves the editor shell can move through common owner actions without remote services.
- Rail tabs expose stable product-neutral `data-creative-editor-tool` selectors and the root exposes the active tool for testability.
- Top-bar action buttons expose stable product-neutral action selectors for theme, grid, safe-area, and review mode.
- Keyboard and drawer insertions increase neutral document layer count through normal editor history and selection behavior.
- Stress QA continues to pass with a large mixed-layer design.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, remote stock search, remote template search, direct downloads, or realtime listeners are added. This remains development-only browser QA and shared editor selector coverage.

## June 15, 2026 - MyCodex Deployed Editor Preview

### Scope

Added a temporary deployed preview entry for owner/manual QA on the private MyCodex domain without changing the production-blocked `/creative-editor-smoke` contract. The route is mounted internally at `/sites/mycodex/creative-editor-test`, appears externally as `https://www.menulist.digital/creative-editor-test`, and reuses the CampaignCue editor test fixture with deterministic local AI Tools and Design Cue handlers.

### Expected Runtime Behavior

- Local route: `http://localhost:3000/__mycodex/creative-editor-test`.
- Deployed route: `https://www.menulist.digital/creative-editor-test`.
- In deployed environments, the route returns 404 unless `FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_EDITOR_TEST_ROUTE` is enabled.
- On `menulist.digital`, the route is still behind the existing MyCodex login/session middleware.
- The route is noindex/nocache and uses only in-memory document state plus browser-local export/download behavior.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, remote stock search, remote template search, direct posting, or realtime listeners are added. The preview route is browser-local and exists only for temporary deployed editor QA.

## June 14, 2026 - Escape Preview Unwind

### Scope

Reviewed Escape behavior after the owner asked for a predictable way to back out of modals/popups, selected canvas layers, and the left drawer until the editor becomes a full-width preview surface. Updated the shared key handler so Escape is handled before the normal form-field shortcut guard, but only Escape can bypass that guard.

### Expected Runtime Behavior

- Escape closes transient overlays first: shortcut panel, preview modal, readiness panel, Design Cue patch review, and AI result panel.
- Escape cancels polygon draft mode before clearing normal selection.
- The next Escape clears the active Fabric selection, selected id, floating selected-layer toolbar, and selected-item/right inspector state without deleting the layer.
- If nothing is selected, Escape closes the right drawer if it is open.
- The final Escape collapses the left drawer, clears drawer search, and removes the active rail highlight so the owner sees the full editor workspace.
- Normal creation and mutation shortcuts still pause while a form field is focused; Escape remains available from focused inspector fields for UI cleanup.
- Bottom canvas controls stay reachable when the right inspector is open by shifting within the visible workspace instead of resizing the Fabric canvas.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, remote stock search, remote template search, or realtime listeners are added. This is browser-local keyboard and drawer state behavior.

## June 14, 2026 - Right Inspector Density Polish

### Scope

Reviewed the new right properties drawer against the old craft-builder inspector after the selected-layer header, notice, section titles, buttons, and form fields appeared oversized and too heavy. Tightened the inspector-local sizing tokens so the selected preview, quick actions, section headings, controls, layer drawer rows, notices, and export buttons follow the old editor's compact editing-panel density while preserving larger tap targets on narrow/mobile layouts.

### Expected Runtime Behavior

- The selected-layer header uses a compact clear button and small thumbnail/initial preview instead of a large hero-style header.
- Right-panel section titles, labels, inputs, selects, textareas, smart action buttons, layer order buttons, and export buttons use compact desktop sizing and calmer weights.
- The Active Layers drawer shares the same compact drawer rhythm for header, selected row, stats, inline rename, and stack controls.
- Narrow/mobile layouts keep larger inspector control variables so the compact desktop styling does not reduce touch usability.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, remote stock search, remote template search, or realtime listeners are added. This is browser-local styling and static verification coverage.

## June 14, 2026 - Text Template Card Label Cleanup

### Scope

Reviewed the Text and Styles drawer ready-made text template cards after visible template labels and category text crowded the card grid. Removed the visible label/category copy from the cards while preserving accessible button labels and hover titles.

### Expected Runtime Behavior

- Text template and text combination cards render as visual preview tiles without separate visible label/category text.
- Buttons still expose `Add {template} text template` labels for assistive technology and keep the template name as a title.
- Adding a template still inserts editable neutral text layers that can be selected, edited, reordered, or deleted.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, remote stock search, remote template search, or realtime listeners are added. This is browser-local drawer layout behavior.

## June 14, 2026 - Floating Layer Drawer and Reorder Fix

### Scope

Reviewed the old craft-builder Active Layers panel and the current shared editor after the Layers button did not expose the same drag/drop stack workflow and the right-side panel opened as part of the editor grid. Converted the inspector into a floating right drawer, removed inspector-open from the fit-zoom dependency path, and added drag/drop reordering to the Active Layers stack.

### Expected Runtime Behavior

- Clicking Layers opens the Active Layers drawer with thumbnails, visibility, lock, inline rename, selected-layer edit, move controls, and drag handles.
- The Layers button remains reachable when selected-item properties are already open, then hides only after the Active Layers drawer is active.
- Dragging an unlocked layer row reorders the top-down stack while locked source layers stay protected until unlocked.
- Opening or closing properties/layers does not resize the central Fabric viewport, does not refit the output frame, and does not flicker the old full-canvas workspace.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, remote stock search, remote template search, or realtime listeners are added. This is browser-local panel layout and neutral document ordering behavior.

## June 14, 2026 - Sticker Drawer and Toolbar Placement Fix

### Scope

Reviewed the Graphics drawer sticker cards and selected-layer toolbar after the sticker layout showed squeezed labels, local sticker insertion rendered as a partial shape on the canvas, and the floating toolbar appeared above the selected object. Tightened sticker cards to thumbnail-only buttons, made local SVG stickers declare concrete dimensions, kept data/blob image loads off anonymous CORS, and anchored the floating toolbar below the selected bounding box bottom border.

### Expected Runtime Behavior

- Sticker drawer cards show clean thumbnails without visible text labels while preserving accessible add labels and titles.
- Clicking a local sticker adds the complete sticker image to the Fabric canvas and keeps the right inspector preview consistent with the canvas.
- Floating selected-layer actions appear below the selection rectangle bottom border and only clamp when close to the visible viewport edge.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, remote stock search, remote template search, or realtime listeners are added. This is browser-local layout and Fabric image-loading behavior.

## June 14, 2026 - Keyboard Shortcut Workflow

### Scope

Compared current shortcut patterns from Canva, VistaCreate, Adobe Express, and Figma against the shared editor's old full-canvas workflow. Added a visible keyboard shortcuts panel plus practical desktop shortcuts for creation, selection, duplicate, group/ungroup, layer order, alignment/distribution, text styling, nudge/resize, zoom, preview, review, grid/ruler, safe-area, and temporary Grab mode.

### Expected Runtime Behavior

- The bottom keyboard button and `?` open a theme-aware grouped shortcut panel.
- Shortcuts reuse existing editor actions instead of introducing separate mutation paths.
- Form fields, selects, textareas, contenteditable controls, and active Fabric text editing keep focus and do not trigger editor shortcuts.
- Holding Space switches temporarily to Grab and restores the prior interaction mode on release.
- Locked pages and locked selected layers still block mutation shortcuts that would change content.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, remote stock search, remote template search, or realtime listeners are added. This is browser-local interaction behavior.

## June 14, 2026 - SMB Owner Long-Term Workflow Pass

### Scope

Reviewed the shared editor from a non-technical SMB owner perspective after the Canva, VistaCreate, and old craft-builder parity work. Added the owner-facing gaps that reduce unfinished downloads, repeated setup work, and hard-to-find controls: campaign goal starters, pre-download readiness checks, multi-size export bundles, browser-local autosave recovery, selected-text business chips, smart image fit/fill/behind-text actions, layer-panel stats and inline rename, owner-readable history labels, drawer item caps, and mobile review mode.

### Checks

- `npm run verify:campaigncue`
- `npx tsc --noEmit --incremental false --pretty false`
- `npm run lint`
- `git diff --check`
- Browser smoke at `http://localhost:3000/creative-editor-smoke`

### Expected Runtime Behavior

- Campaign goal starters compose local background, editable text template, and optional QR layers without remote template search or provider calls.
- Download runs a browser-local readiness check before PNG/SVG/bundle export, flags empty designs, empty text, poor contrast, tiny text, unsafe edges, missing action text, unsafe image sources, and empty QR values, then lets the owner continue intentionally on a repeated export attempt for the same issue set.
- Export bundle downloads common handoff PNG sizes from the active workspace frame and does not add ZIP, Storage, or Firestore writes.
- Autosave stores a local recovery draft keyed by product context and document id, then restores only after owner acceptance.
- Selected text shows business text chips from product-provided placeholders; selected images show fill, fit, larger, and behind-text shortcuts before advanced controls.
- Active Layers shows visible/locked counts, current owner-readable history context, and inline rename without stealing input focus.
- Drawer cards cap long local lists and rely on local search/refine prompts for smoother scrolling.
- Review mode opens the readiness panel, fits the output frame, and simplifies narrow/mobile layouts for preview/download checks.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, remote stock search, remote template search, or realtime listeners are added. These features are browser-local until an existing product-owned explicit save/export path runs.

## June 14, 2026 - Editor Interaction Render Throttling

### Scope

Reviewed editor-wide interaction performance after right-panel and floating-toolbar controls were still vulnerable to focus loss during frequent selected-layer changes. The remaining risk was repeated React state scheduling from Fabric selection events, toolbar position updates, workspace metric updates during Grab movement, and no-op selected-layer input changes.

### Expected Runtime Behavior

- Floating toolbar repositioning is coalesced to one animation frame and skips React state updates when position, lock state, object type, and selection count are unchanged.
- Workspace viewport metrics used by rulers, safe-area overlays, and frame-position overlays are coalesced during Grab movement.
- Repeated selected ID, right-panel mode, and interaction-mode writes reuse the current state value instead of scheduling avoidable rerenders.
- Selected-layer property updates that do not change a value are ignored before Fabric patching, document commit, or history writes.
- Right-panel, contextual toolbar, and floating toolbar controls keep focus during frequent selected-layer edits.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, or realtime listeners are added. This is a browser-local render scheduling and state-guard fix.

## June 14, 2026 - Floating Toolbar Focus Retention

### Scope

Reviewed the selected-layer floating toolbar after the right-panel focus fix. The toolbar was still recalculating and rewriting its own position state after selected-layer patches, which could disrupt toolbar-owned controls such as the color input and the contextual toolbar controls.

### Expected Runtime Behavior

- Floating toolbar position refreshes continue during selection, drag, scale, rotate, zoom, and normal canvas actions.
- While an editor form control is focused, selected-layer property patches update the Fabric object and neutral document but defer floating toolbar repositioning.
- Deferred toolbar repositioning flushes after the focused control blurs.
- The active floating/contextual toolbar control keeps focus during high-frequency selected-layer changes.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, or realtime listeners are added. This is a browser-local toolbar scheduling fix.

## June 14, 2026 - Right Panel Focus and Canvas Patch Performance

### Scope

Reviewed the selected-layer inspector mutation path after right-panel inputs were losing focus while typing text or changing font size. The issue was that every selected-layer property change committed the neutral document and then reloaded the full Fabric document, which rebuilt the canvas and interrupted active form controls.

### Expected Runtime Behavior

- Text content, layer name, typography, opacity, position, size, simple fills, borders, shadows, rotation, and gradient edits patch the currently selected Fabric object in place.
- The neutral document still updates on every edit and keeps normal history behavior.
- QR value/color regeneration, image filter/outline/source changes, polygon point edits, line arrow geometry, and path/path-text guide edits still reload the Fabric document because they reconstruct generated objects.
- The right inspector field keeps focus during high-frequency property edits.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, or realtime listeners are added. This is a browser-local editor performance fix.

## June 14, 2026 - Ready-Made Text Template Library

### Scope

Reviewed the logged-in Canva and VistaCreate text panels after the prior Canva/Vista editor comparison. Adopted the durable pattern that fits SMB-owner editing: a searchable, visual catalogue of ready-made text combinations for promotions, retail, food, services, events, social posts, reviews, and hiring. Rejected remote template/material search, provider generation, account uploads, and third-party persistence.

### Expected Runtime Behavior

- `src/modules/creative-editor/textTemplates.json` contains the local text-template catalogue with basic styles and multi-layer combinations.
- The Text drawer shows ready-made text templates as visual cards and inserts all layers as editable neutral text elements.
- The Styles drawer reuses the same data-backed text combinations as shortcuts.
- Template positions use canvas-relative values and scale to the current output frame; the saved document still stores normal shared-editor text layers, not Fabric template JSON.
- Add, edit, and remove flows use existing canvas selection, right properties, keyboard delete, and Layers behavior.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, remote stock search, or remote template search are added. The catalogue is local static JSON and only affects browser-local document editing until a product-owned save/export path runs.

## June 30, 2026 - Text Clipboard Acknowledgement

### Scope

The shared editor text-copy sweep found AI suggestion copy and Base64 PNG text export still depended on direct Clipboard API availability. These handoffs are browser-local and can carry generated suggestion text or a large generated data URL, so copied feedback now waits for Clipboard API success or acknowledged textarea fallback success.

### Expected Runtime Behavior

- AI suggestion copy uses the shared runtime clipboard helper before showing "Text copied."
- Base64 PNG copy uses the shared runtime clipboard helper before showing "Base64 PNG copied."
- Failed text-copy diagnostics include clipboard/fallback support booleans and text length only.
- PNG image clipboard export still depends on browser image clipboard support; no image fallback is claimed.

### Checks

- Passed `npm run verify:creative-editor-smoke`.
- Passed `npm run verify:campaigncue`.
- Passed `npx tsc --noEmit --incremental false --pretty false`.
- Passed `git diff --check`.

### Cost Impact

No Firebase reads, writes, deletes, Storage writes, Cloud Functions, provider calls, remote asset search, product persistence, Firebase deploy, or Vercel deploy is added. The change is browser-local clipboard acknowledgement only.

## June 14, 2026 - VistaCreate Owner Shortcuts

### Scope

Compared the logged-in VistaCreate editor against Canva, the old craft-builder flow, and the current shared editor. Adopted only the parts that fit SMB-owner campaign editing and the old full-workspace canvas model: a Styles rail for project-level style presets, a richer My Stuff upload/recent/approved-assets panel, and a primary top-bar Download action. Did not adopt remote stock search, paid generation, provider upload, fixed-page viewport behavior, music/video-first tooling, or direct posting.

### Expected Runtime Behavior

- Styles exposes Project style, Apply brand style, Shuffle style, ready-made local presets, and font-combination shortcuts.
- Applying a project style updates unlocked text, fill/stroke, QR, outlined-image color, and the output-frame background through normal editor history; locked layers remain unchanged.
- My Stuff exposes local upload, recent session insertions, and approved product assets without remote search.
- The top toolbar exposes Download for the active workspace PNG without requiring a selected layer or open inspector.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, remote asset search, or realtime listeners are added. These shortcuts are browser-local until an existing product-owned explicit save/export path runs.

## June 14, 2026 - SMB Owner Inspector Flow

### Scope

Walked the current editor as an SMB owner after adding text, selecting layers, opening AI Tools, and comparing the right panel against frequent Canva and old craft-builder actions. Reordered the properties panel so selected-item edits and Design Cue entry are the first visible controls, moved AI suggestions above the remaining tool groups after a result is ready, split layer-stack management into the Layers panel, and hid unsupported advanced panels instead of showing disabled noise.
Extended the same owner-first pass for text layers because SMB designs most often fail on copy clarity, readability, and missing customer action.

### Expected Runtime Behavior

- Selecting text opens the right properties panel with text content, type controls, color, opacity, and position before alignment, layer order, advanced effects, watermark, or export.
- Selected text exposes local Readable, Shorten, Add CTA, Add contact, Center, and Bring front actions before generic layer controls.
- Selected text checks low contrast, small size, long copy, near-edge placement, and missing customer action cues; available fixes update the selected layer through existing editor mutation paths.
- Selecting an image opens replace, fit/crop, flip, filter, opacity, and position before lower-frequency image adjustments.
- QR and shape layers expose value/color/border/position first.
- The canvas Layers button opens the Active Layers panel with thumbnails, visibility, lock, quick edit, and move controls instead of replacing selected-item properties.
- Design Cue can be opened directly from the selected-item priority section when the product adapter provides it.
- AI suggestions and findings appear immediately after the Design Cue area when a result is ready, before the rest of the tool catalog.
- Image filter, border, gradient, and shadow sections are hidden when the current layer cannot use them.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, or realtime listeners are added. The changes are browser-local UI ordering, conditional rendering, deterministic selected-text mutations, and local contrast/safe-area checks.

## June 14, 2026 - SMB Owner Canvas Refinements

### Scope

Compared the logged-in Canva editor, the old `http://localhost:3001/craft-builder/editor` flow, and the current shared editor route after restoring the old full-canvas model. Added only owner-useful gaps that fit the shared editor boundary: named common canvas sizes and a non-exporting safe-area/center-guide overlay.

### Expected Runtime Behavior

- Background drawer presets cover square post, portrait post, story/status, flyer, menu screen, and QR table card outputs.
- Selecting a size preset uses the same canvas resize/scaling logic as manual width/height edits, so existing layers move and scale with the output frame.
- Safe-area guides can be toggled from the top toolbar, follow the visible Fabric workspace frame during zoom and Grab panning, and remain outside SVG, PNG, JSON, clipboard, and base64 output.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, or realtime listeners are added. Both changes are browser-local editor controls.

## June 14, 2026 - Canva-Style Editing Controls

### Scope

Validated the shared editor and CampaignCue adapter after adding selected-layer quick actions, right-panel selection editing, searchable drawer content, Brand Kit insertion, business text placeholders, optional multi-page controls, repaired canvas-bound rulers, theme-aware old craft-builder icon palettes, clean single-page output frames, and Canva-style text/sticker drawer affordances.

### Checks

- `node scripts/verification/verify-campaigncue-runtime.js`
- `npx tsc --noEmit --incremental false --pretty false`
- `npm run lint`
- `git diff --check`
- Browser smoke at `http://localhost:3000/creative-editor-smoke`

### Expected Runtime Behavior

- Selected canvas items expose floating quick actions without becoming export content.
- Text, image, shape, line, QR, and multi-select states open the right properties panel for detailed editing, while the Layers button opens stack management, matching the old editor split between element properties and active layers.
- Drawer search filters templates, elements, text presets, approved assets, Brand Kit entries, and product text placeholders locally.
- Single-page/image-first documents hide page controls; multi-page documents can add, duplicate, switch, lock, and preserve pages in exported JSON metadata.
- Blank/new documents no longer create surprise foreground demo layers; background color changes apply to the output frame itself.
- Fit-to-screen uses the actual available workspace instead of a fixed zoom, and Grab mode can pan the stage.
- Numeric rulers attach to the visible Fabric artboard scale instead of drifting across the whole stage.
- Light and dark theme toggles update shell variables, sidebar contrast, segmented controls, and old multi-path craft-builder icons without flattening SVG paths into solid shapes.
- Practical toolbar validation hides or disables actions that do not apply: unlock appears only for locked layers, ungroup appears only for grouped selections, distribute appears only for three-or-more unlocked selections, and locked pages/layers block destructive edits.
- Text drawer controls mirror the expected creation flow: Add a text box, Magic Write placeholder, Brand Kit entry, default styles, business placeholders, font-combination effects, and path text.
- Graphics drawer exposes local stickers, popular search chips, recent insertions, and recommended assets without a network call.
- CampaignCue supplies product metadata and placeholders through the shared adapter contract only; the shared editor remains product-neutral.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, or realtime listeners are added by these controls. Cost changes only occur through existing product-owned explicit export/save paths.

## June 14, 2026 - Old Editor Canvas Flow Restoration

### Scope

Corrected the shared editor after Canva-style comparison work drifted the runtime toward a DOM artboard model. The shared editor now follows the old craft-builder canvas model: the full remaining editor area is the Fabric viewport, the output/download surface is the internal workspace frame, and zoom/grab move that frame inside the full-screen Fabric canvas.

### Checks

- `npm run verify:campaigncue`
- `npx tsc --noEmit --incremental false --pretty false`
- `npm run lint`
- Browser smoke against the current editor route and the old `http://localhost:3001/craft-builder/editor` reference

### Expected Runtime Behavior

- The Fabric canvas fills the available editor workspace after the left rail, action drawer, and optional right inspector.
- The document background color paints only the internal workspace/output frame, not the entire screen.
- Wheel zoom, bottom zoom buttons, Fit, and Grab mode use Fabric viewport transforms; no CSS transform wrapper or scroll-container pan owns canvas movement.
- Selection toolbar and canvas-bound rulers derive their position from Fabric viewport coordinates, so they follow selected objects and the workspace frame after zoom/grab movement; the floating toolbar stays below the selected bounding box and clamps near viewport edges.
- SVG, PNG, preview, clipboard PNG, and base64 export temporarily reset the viewport and crop to the workspace frame, then restore the user's zoom/pan state.
- Document serialization reads canvas dimensions from the workspace frame, not from the full-screen Fabric viewport.

### Cost Impact

No Firebase reads, writes, Storage writes, Cloud Functions, provider calls, or realtime listeners were added. The change is browser-local runtime behavior.
