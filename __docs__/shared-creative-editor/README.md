# Shared Creative Editor - Documentation Hub

**Status:** Implemented as shared infrastructure with CampaignCue as the first product adapter
**Feature:** Shared Creative Editor
**Owner:** Shared product infrastructure

Shared Creative Editor is the product-neutral static asset editor used by CampaignCue and other products. It provides a reusable document schema, optional multi-page artboards, a Fabric.js editing runtime, a full editor shell, type-aware contextual property toolbar, left tool rail, searchable asset drawer, central canvas, floating selected-layer action toolbar, floating selected-item-first right properties drawer, dedicated drag-reorder Active Layers drawer, page controls, bottom canvas controls, dark/light mode, layer controls, campaign goal starters, starter templates, common SMB canvas-size presets, JSON/raster-image import, text/path-text/shape/image/QR/polygon/path/free-draw elements, brand quick picks, editable business text placeholders, project style presets, typography and text decoration controls, multi-stop gradient fills, image filters and adjustments, smart image fit/fill/behind-text actions, image outline/border controls, visible watermark controls, ruler/grid orientation, safe-area placement guides, download readiness checks, export bundles, local autosave recovery, owner-readable history labels, mobile review mode, shadow controls, preview, top-bar PNG download, SVG/PNG/JSON export, PNG clipboard export, base64 clipboard export, and product adapters that decide where source data, trust metadata, and saved asset records live.

The editor is not CampaignCue-specific. CampaignCue can open it from campaign outputs or from a blank asset flow, but the editor module cannot import CampaignCue workspace UI, CampaignCue Firebase clients, MenuList owner state, or Answerlattice tenant shapes.

## Documents

| Document | Audience | Purpose |
| --- | --- | --- |
| [shared-creative-editor_spec.md](./shared-creative-editor_spec.md) | Product, design | User flows, capabilities, boundaries, and acceptance. |
| [shared-creative-editor_impl.md](./shared-creative-editor_impl.md) | Engineering | Shared module paths, schema, adapters, and CampaignCue integration. |
| [shared-creative-editor_marketing.md](./shared-creative-editor_marketing.md) | GTM | Internal positioning and product packaging notes. |
| [shared-creative-editor_website.md](./shared-creative-editor_website.md) | Website | Public content boundary; no standalone public page by default. |
| [shared-creative-editor_helpdoc.md](./shared-creative-editor_helpdoc.md) | Support | Owner-facing usage guide for products that expose the editor. |
| [shared-creative-editor_firebase.md](./shared-creative-editor_firebase.md) | Engineering, finance | Product-adapter persistence and cost posture. |
| [shared-creative-editor_mobile-support.md](./shared-creative-editor_mobile-support.md) | Mobile | Mobile admission decision and supported mobile subset. |
| [shared-creative-editor_test-cases.md](./shared-creative-editor_test-cases.md) | QA | Verification matrix. |
| [shared-creative-editor_validation.md](./shared-creative-editor_validation.md) | Engineering, QA | Runtime validation records and browser smoke evidence. |
| [shared-creative-editor_parity-audit.md](./shared-creative-editor_parity-audit.md) | Engineering, QA | Old editor comparison and product-neutral coverage decisions. |

## Architecture

```text
Product surface
  -> product adapter
  -> shared creative document
  -> shared Fabric editor UI
  -> SVG/PNG/JSON export
  -> product-owned save/export callback
```

## Current Implementation Anchors

| Area | Path |
| --- | --- |
| Feature flags | `src/config/features.ts` |
| Shared types | `src/modules/creative-editor/types.ts` |
| Shared templates | `src/modules/creative-editor/templates.ts` |
| Shared export utilities | `src/modules/creative-editor/export.ts` |
| Shared Fabric adapter | `src/modules/creative-editor/fabricAdapter.ts` |
| Shared editor UI | `src/modules/creative-editor/CreativeEditor.tsx` |
| Shared editor styles | `src/modules/creative-editor/CreativeEditor.module.scss` |
| Internal smoke route | `src/app/(internal)/creative-editor-smoke/page.tsx` |
| CampaignCue adapter | `src/modules/creative-editor/providers/campaigncue.ts` |
| CampaignCue workspace integration | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| CampaignCue asset API | `src/app/api/campaigncue/assets/route.ts` |
| Printable assets editor adapter | `src/lib/printable-asset-templates/editorDocumentAdapter.ts` |
| Printable assets route integration | `src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx` |

## Boundaries

| Boundary | Decision |
| --- | --- |
| CampaignCue | First consumer. Opens editor from campaign outputs and blank asset flow, then registers exported assets in CampaignCue Asset Library. |
| MenuList | MenuList can use the editor for owned assets through a MenuList adapter. Generated or edited menu item images must use MenuList project/store/item authority, MenuList media image paths, MenuList AI accounting, and MenuList public cache invalidation. |
| Answerlattice | Future consumer must use Answerlattice tenant fields and doctrine; no CampaignCue assumptions. |
| Fabric | Day-one editing engine. The shared module maps Fabric objects into the neutral document schema instead of storing Fabric JSON as product persistence. |
| Storage | The shared editor does not write files directly. Product adapters own Storage, Firestore, trust, and rights persistence. |
| AI tools | Product-provided action surface. The shared editor renders actions/results and the neutral Design Cue panel only; product adapters own action lists, deterministic handlers, cost gates, provider policy, and persistence. CampaignCue Design Cue conversation/comment behavior stays in the CampaignCue adapter layer and passes validated document patches into the shared editor. |
| Templates | Active local starter templates. They update the neutral document locally and do not call provider APIs. |
| Canvas sizes | Background drawer presets cover common SMB social, flyer, screen, and QR-card outputs. Manual width/height edits remain available and use the same layer-scaling path. |
| Searchable drawer | Browser-local discovery for templates, approved assets, text styles, tools, Brand Kit picks, and recent insertions. It does not call a remote material/template API. |
| Ready-made text templates | Text and Styles drawers read from `src/modules/creative-editor/textTemplates.json`. Templates insert one or more editable neutral text layers scaled to the current output frame, not saved Fabric JSON. |
| Campaign goal starters | Browser-local starter actions for common SMB goals such as weekend offers, new arrivals, appointment reminders, and social sharing. They compose existing background, text-template, and QR layers without provider calls. |
| Download check | Browser-local readiness scan before export. It flags empty designs, empty text, low contrast, small text, edge placement, missing action text, unsafe image sources, and empty QR values before the owner downloads. |
| Export bundle | Browser-local PNG bundle presets for common social and print handoff sizes. The bundle resizes the current workspace image in the browser and does not write files to Firebase. |
| Local autosave | Browser-local recovery draft keyed with collision-safe product, workspace, source, and document segments. Drafts pass the authoritative bounded editor-document schema plus exact current product/workspace/document checks. Recovery occurs only after the owner accepts the newer local draft and never replaces product-owned persistence. |
| Template registry callback | Optional product-owned callback for explicit Save as template flows. The shared editor supplies the current neutral document and an optional preview data URL; product adapters own validation, Firebase writes, and cost controls. |
| Entry chrome modes | CampaignCue uses full editor chrome inside its product workspace. Printable Asset Templates use `chromeMode="embedded"` inside their fullscreen modal so the asset route owns Image, Print PDF, close, and template-save actions without adding a second editor header or the shared editor's technical export shortcuts. |
| Owner review mode | Mobile-friendly review state that collapses low-frequency panels, opens the download check, fits the frame, and keeps the owner focused on preview/download readiness. |
| VistaCreate-style owner shortcuts | The editor adopts the useful VistaCreate patterns that fit the old full-canvas flow: a Styles rail tab for browser-local project style presets, a richer My Stuff upload/recent/approved-assets panel, and a primary top-bar Download action. No remote stock search, paid generation, or provider upload is added. |
| Contextual property toolbar | Browser-local top toolbar that changes for text, image, shape, line, QR, and multi-select states. It reuses the same mutation handlers as the inspector. |
| Floating selected-layer toolbar | Browser-local quick action surface anchored near the active Fabric selection. It opens existing editor actions such as Design Cue, edit, color, style, flip, position/layers, lock, duplicate, delete, group, distribute, and more controls without adding persistence, provider calls, or product-specific imports. |
| Right properties panel | Browser-local selected-item-first floating drawer. It overlays the right edge without adding a grid column, resizing the Fabric viewport, or refitting the output frame. Text, image, QR, color, opacity, position, and Design Cue entry stay above alignment, layer order, advanced effects, watermark, and export controls. Text layers also expose local owner actions for readability, shortening, CTA/contact insertion, centering, front placement, safe-area fit, and contrast/scan checks. Irrelevant image, border, gradient, and shadow panels are hidden when the selected layer cannot use them. |
| Active layers panel | The canvas Layers button opens a separate floating stack drawer with layer thumbnails, select, visible, lock, edit, drag/drop reorder, move forward/back, move front/back, and export controls so stack management does not hide inside selected-item properties or resize the canvas. |
| Pages | Optional artboards stored in the neutral document. The active page mirrors `canvas` and `elements` for backward compatibility, and browser export/download uses the active page. |
| Old editor parity | Owner-visible editing and exported-result parity is implemented through the shared Fabric adapter. Backend-only legacy features such as PSD service import, remote material search/upload, login, and language switching stay outside the shared editor boundary. |
| Safe guides | Safe-area and center guides are editor-only overlays tied to the visible Fabric workspace frame. They follow zoom and Grab panning but are not serialized or rendered into export output. |
| Escape preview unwind | Escape closes transient panels first, clears the selected canvas layer next, then collapses the left drawer so the owner can reach a full-width editor preview without changing the design. |
| Internal smoke route | Development-only verification surface. It returns 404 in production and cannot save to a product workspace. |
| Creative editor smoke QA | Development-only browser regression surface at `/creative-editor-smoke?qa=1` and `/creative-editor-smoke?qa=1&variant=stress`. It verifies real Fabric paint, modal focus, Escape unwind, preview PNG output, layer drawer behavior, right-panel focus retention, and large layer counts without product persistence. |
| MyCodex local preview | Temporary private local route at `http://localhost:3000/__mycodex/creative-editor-test`. It is reachable only through the MyCodex local path and only when `FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_EDITOR_TEST_ROUTE` is enabled. It reuses the CampaignCue editor test fixture and performs browser-local edits only. |

## Version History

| Version | Date | Notes |
| --- | --- | --- |
| 3.0 | July 24, 2026 | Migrated the runtime to Fabric.js 7.4.0, preserved left/top neutral-document coordinates, moved clone/image operations to Promises, adopted collection stack APIs and coordinate-safe temporary grouping, removed `@types/fabric`, and added an executable Fabric 7 boundary verifier. |
| 2.5 | June 28, 2026 | Bounded shared editor runtime/provider/callback failure notices through `showCreativeEditorFailure()` so exception text is logged as bounded diagnostics and fixed product-neutral copy reaches the editor UI. |
| 2.4 | June 15, 2026 | Added optional product-owned template save callback used by MenuList printable assets. The shared editor still performs no direct Firebase writes. |
| 2.3 | June 15, 2026 | Added a MyCodex-hosted editor preview route at `/creative-editor-test`, gated by `FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_EDITOR_TEST_ROUTE`. The old deployed-domain dependency has since been removed; use the local MyCodex path only unless a new private host is approved. |
| 2.2 | June 15, 2026 | Expanded the browser QA harness to cover top-bar toggles, rail tab switching, drawer insertions, text/sticker/shape/QR/barcode creation, keyboard creation shortcuts, layer drawer flow, preview export, and stress-layer coverage. |
| 2.1 | June 14, 2026 | Added the development-only `/creative-editor-smoke?qa=1` browser QA harness, stress variant, stable editor QA selectors, shortcut/preview focus restoration, dialog focus trapping, and `npm run verify:creative-editor-smoke`. |
| 2.0 | June 14, 2026 | Added staged Escape behavior: close shortcut/preview/readiness/Design Cue popups, clear selected canvas layer, then collapse the left drawer for full-width preview without firing normal shortcuts from focused inputs. |
| 1.9 | June 14, 2026 | Tightened the right properties drawer and Active Layers drawer typography/control density to match the old craft-builder inspector while preserving larger touch targets on narrow/mobile layouts. |
| 1.8 | June 14, 2026 | Converted the right inspector and Active Layers panel into a floating right drawer so the old full-canvas workspace no longer reflows on open/close, and added top-down drag/drop layer reorder with locked-layer guards. |
| 1.7 | June 14, 2026 | Fixed Graphics sticker cards to use thumbnail-only buttons, repaired local SVG sticker canvas rendering, and anchored the floating selected-layer toolbar below the selection bottom border. |
| 1.6 | June 14, 2026 | Added a discoverable keyboard shortcuts panel and expanded desktop shortcuts for creation, selection, duplicate, group/ungroup, layer order, alignment, text styling, nudge/resize, zoom, preview, review, grid/ruler, safe-area, and temporary Grab mode. |
| 1.5 | June 14, 2026 | Added campaign goal starters, pre-download readiness checks, multi-size PNG export bundles, local autosave recovery, smart image fit/fill/behind-text actions, business text chips for selected text, layer panel stats/rename/history hints, owner-readable undo/redo labels, drawer item caps, and mobile review mode. |
| 1.4 | June 14, 2026 | Added data-backed ready-made text templates for SMB promotions, food, services, events, social posts, reviews, and hiring; multi-layer templates stay editable after insertion. |
| 1.3 | June 14, 2026 | Added VistaCreate-inspired project Styles rail, richer My Stuff upload/recent asset panel, and primary top-bar Download action while preserving the full-workspace canvas/output-frame model. |
| 1.2 | June 14, 2026 | Split Layers into a dedicated right-panel mode, added Images-drawer local upload, exposed QR value/color/size controls, and fixed floating toolbar placement near viewport edges. |
| 1.1 | June 14, 2026 | Reordered the right inspector around SMB-owner editing frequency: selected-item controls and Design Cue entry first, text-specific readability/CTA/contact checks, AI suggestions above tool groups, and advanced/export-only controls lower or hidden when irrelevant. |
| 1.0 | June 14, 2026 | Added common SMB canvas-size presets and non-exporting safe-area placement guides after comparing Canva resize/guides with the old full-canvas editor flow. |
| 0.9 | June 14, 2026 | Added Canva-style top contextual property toolbar, searchable drawer sections, recent insertions, Brand Kit quick picks, business text placeholders, and optional page controls for add, duplicate, switch, and lock while keeping export focused on the active page and persistence product-owned. |
| 0.8 | June 14, 2026 | Added Canva-style floating selected-layer toolbar on the canvas for edit, Design Cue, color, style, flip, position/layers, lock, duplicate, delete, group, distribute, and more controls while keeping the action surface browser-local and product-neutral. |
| 0.7 | June 14, 2026 | Added neutral Design Cue panel support, selected-layer/document comment context, owner approval before patch application, and CampaignCue deterministic patch wiring while keeping model assist disabled/fail-closed. |
| 0.6 | June 12, 2026 | Added remaining product-neutral old-editor parity items: path text, arrow and thin-tail arrow layers, draw-polygon mode, polygon point editing, visible export watermark, image outline, multi-stop gradients, RemoveColor/Gamma/grayscale-mode filters, richer dash/cap border styles, multi-select distribute X/Y, numeric ruler gutters, replace-image file action, and clipboard/base64 export. |
| 0.5 | June 12, 2026 | Added result-parity controls from the old editor: text italic/underline/strike/spacing/background, gradient fills, expanded image filter presets, and image filter adjustment sliders. |
| 0.4 | June 12, 2026 | Added old-editor parity controls: active templates, JSON/Fabric JSON import, raster image file import, preview modal, grid toggle, freehand drawing, flip/group controls, typography controls, image filters, image borders, and shadow controls. Arbitrary SVG file/markup import remains blocked by the trusted-asset boundary. |
| 0.3 | June 12, 2026 | Replaced the temporary SVG editing runtime with Fabric.js 5.3.0, added polygon/path layers, snap guidelines, Fabric selection/transform controls, keyboard shortcuts, and Fabric SVG/PNG export while preserving product-neutral persistence. |
| 0.2 | June 12, 2026 | Upgraded to the full editor shell with rail, drawer, inspector, bottom controls, dark/light mode, line/triangle shapes, blur, angle, border style, and alignment controls. |
| 0.1 | June 12, 2026 | Created shared editor doc set and first CampaignCue integration contract. |
