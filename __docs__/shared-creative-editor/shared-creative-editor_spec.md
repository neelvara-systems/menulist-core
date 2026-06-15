# Shared Creative Editor - Spec

## Summary

Shared Creative Editor lets product users create static visual assets from a prepared campaign output, a campaign goal starter, a starter template, an imported design, or a blank canvas. It uses a full editor shell with top toolbar, type-aware contextual property toolbar, left tool rail, searchable asset drawer, a full-screen Fabric.js central canvas, an internal workspace/output frame, floating selected-layer action toolbar, right inspector, page controls, bottom canvas controls, discoverable keyboard shortcuts, preview, grid/ruler orientation, safe-area placement guides, download readiness checks, export bundles, local autosave recovery, owner-readable history labels, mobile review mode, and light/dark modes. It supports layers, optional multi-page artboards, text, path text, shapes, arrows, images, QR blocks, freehand path drawing, click-to-draw polygon creation, background color, manual positioning, drag, resize, common SMB canvas sizes, rotate, property editing, alignment, distribution, snap guidelines, flip, grouping, typography, text decoration, text background, project style presets, multi-stop gradient fills, visible watermark, shadow, image filters and adjustments, smart image fit/fill/behind-text actions, image outline/borders, Brand Kit quick picks, editable business text placeholders, JSON/raster-image import, top-bar PNG download, SVG/PNG/JSON export, and browser-local clipboard export.

## Goals

| Goal | Requirement |
| --- | --- |
| Product-neutral editor | The editor works through adapters. It does not know CampaignCue, MenuList, or Answerlattice business rules directly. |
| Start from product flow | A product can pass a prepared title, copy, CTA, campaign id, output id, channel, source refs, brand color, logo, and asset list into the editor. |
| Start from scratch | A product can open a blank editor with only brand defaults and save/export the result. |
| Layer control | Users can select, move, rename, hide, lock, duplicate, delete, and reorder layers. |
| Contextual editing speed | Selecting text, image, shape, line, QR, or multiple layers shows a top property toolbar with the high-frequency controls for that selection type. |
| Canvas-local action speed | When a layer or active selection is selected, the editor shows a floating toolbar near the object so common editing actions happen without leaving the canvas. |
| Right-panel editing speed | When a layer is selected, the right properties panel starts with the selected item controls owners use most often: text, image, or QR edit, Design Cue entry, color, opacity, position, and simple replacement controls before alignment, stacking, advanced effects, watermark, or export. Text layers get extra SMB-focused actions for readability, shortening, CTA/contact insertion, centering, front placement, safe-area fit, and contrast/scan checks. The separate Layers button opens stack management instead of replacing selected-item properties. |
| Discoverable creation | The left drawer supports search, recommended local items, recent insertions, text presets, ready-made multi-layer text templates, business text placeholders, approved asset search, and Brand Kit quick picks. |
| Faster first draft | Campaign goal starters create a practical first layout for common SMB jobs by composing local background, text-template, and optional QR layers. |
| Fewer bad downloads | Pre-download readiness checks catch obvious design issues before handoff while still letting the owner intentionally continue. |
| Reusable handoff | Export bundle creates common social/print PNG variants from the active workspace without product persistence changes. |
| Recovery | Local autosave recovery helps owners avoid losing browser-local edits without replacing product-owned save/export authority. |
| Campaign-ready shortcuts | The editor includes a Styles rail for browser-local project style presets, brand style apply, and data-backed text-combination shortcuts, plus a My Stuff panel for local upload, recent session assets, and approved product assets. |
| Multi-page artboards | Users can add, switch, duplicate, and lock pages. Browser export uses the active page while JSON preserves the page list. |
| Useful day-one tools | Text, path text, rectangle, circle/ellipse, triangle, line, arrow, thin-tail arrow, polygon/path shapes, custom polygon drawing/editing, freehand drawing, image URL/raster-file import from the Images drawer, My Stuff, and top toolbar, replace image file, curated illustration/graphic/character assets, QR code with editable value/colors/size, canvas size presets, project styles, background, templates, safe-area guides, visible watermark, preview, top-bar PNG download, SVG export, PNG export, clipboard/base64 export, and JSON document export are supported. |
| Product-owned save | Export callbacks return a neutral result. Each product decides how to register the asset, apply rights, and connect source/trust metadata. |
| Product-owned export policy | A product adapter can disable SVG, PNG, or JSON browser export for a document when runtime assets require server-owned hydration, revision checks, rights checks, or private URL protection. |
| Screen parity | The shell follows the existing editor screen pattern: toolbar, rail, drawer, canvas, inspector, bottom controls, and theme toggle. |
| Old editor canvas model | The whole remaining editor area is the Fabric viewport. The exported design is the internal workspace frame inside that viewport, not a DOM-sized artboard. Wheel zoom and Grab mode update Fabric viewport transforms; SVG/PNG/clipboard export crops back to the workspace frame. |
| Keyboard speed | Desktop users can open a visible keyboard shortcuts panel and use common editor shortcuts without leaving canvas flow. Shortcuts must not fire while the owner is typing in inputs or editing Fabric text. |

## Non-Goals

- It is not a full design-suite replacement.
- It does not connect social accounts or publish assets.
- It does not run paid generation by itself.
- It does not store base64 media in Firestore.
- It does not reuse legacy mock auth, old dashboard shell, or hardcoded external share links from the GrowMeDigitally prototype.
- AI tools do not run paid generation by default. They are active only when a product passes a governed action list and handler into the shared editor.
- Legacy backend-only editor functions are not part of the shared editor: PSD service import, remote material/template API search, upload material APIs, mock login, language switching, and direct external share links.

## Primary Flows

### Campaign Output To Editor

1. Product creates or loads a campaign output.
2. Product adapter builds a neutral `CreativeEditorDocument`.
3. User opens the shared editor.
4. User adjusts safe visual layers.
5. User exports SVG or PNG.
6. Product adapter records the export in its own asset library.

### Blank Asset

1. User opens editor from a product asset workspace.
2. Product adapter creates a blank branded document.
3. User adds text, shape, image, or QR layers.
4. User exports and optionally saves a product-owned asset record.

## Required Controls

| Control | Behavior |
| --- | --- |
| Top toolbar | Home affordance, drawing title, new design, canvas dimensions, import design JSON, import raster image file, grid/ruler toggle, safe-area guide toggle, Review/download check, Bundle export, reset, undo, redo with owner-readable action labels, theme toggle, share, preview, primary PNG download, and save. |
| Contextual property toolbar | Compact selection controls can appear above the canvas when the right properties panel is closed. Normal selection opens the right properties panel so image/text/shape-specific editing options stay in the old editor-style side panel. |
| Left rail and drawer | Product-provided AI Tools, active Templates, Background, Illustrations, Images, Text, Styles, Graphics, Characters, Shapes, QR, Barcode, My Stuff, and Brand Kit. Drawer search filters local tools/assets/templates/text/styles and approved product asset sources. Long local lists are capped per render with local search/refine prompts. |
| Floating selected-layer toolbar | Appears above or near the active Fabric selection and follows selection changes, drag, resize, rotate, and zoom. Single-selection actions include Design Cue entry when connected, edit, color, style/effects, flip, position/layers, lock, duplicate, delete, and more controls. Multi-selection actions include group, distribute X/Y, duplicate, delete, and more controls. Locked selections disable destructive or geometry-changing actions. The toolbar is UI-only and never becomes part of export output. |
| Right properties panel | Opens on selection as a floating right drawer with selected-item controls first. It must not add a layout column, change the central Fabric viewport size, or trigger auto-fit when opened or closed. The download check can appear above layer-specific controls. Text layers show text, business text chips, typography, local readable/shorten/CTA/contact/center/bring-front actions, contrast/size/length/safe-area checks, color, opacity, and position first. Image layers show replace, fill frame, fit inside, larger, behind text, flip, filter, opacity, and position first. QR and shape layers show their editable value/color/border/position first. Alignment, quick tools, layer order, layer details, advanced effects, watermark, and export follow in that order; unsupported panels are hidden instead of shown disabled. |
| Page controls | Multi-page documents can still switch, add, duplicate, and lock artboards; single-image/single-page documents hide page controls so the output frame stays the primary focus. Locked pages block layer/canvas mutation until unlocked. |
| Canvas presets | Square post, portrait post, story/status, flyer, menu screen, and QR table card sizes are available from the Background drawer. Square post, story, wide banner, and poster starter templates are active local document starters. |
| Styles | Ready-made project styles apply unlocked text, fill, stroke, QR, and outlined-image colors plus document background locally. Brand style uses adapter-provided brand colors/font, and Shuffle cycles browser-local presets without provider calls. |
| Active layers panel | The canvas Layers button opens a floating top-down stack drawer with select, thumbnail, visible, locked, edit, drag/drop reorder, move forward/back, move front/back, duplicate, delete, and export controls. Selecting from this panel keeps the panel in stack mode; selecting directly on the canvas opens properties. Dragging a locked source layer is blocked until it is unlocked. |
| Review mode | Opens the readiness panel, fits the output frame, and simplifies narrow layouts for inspection/download readiness without changing document data. |
| Properties | Position, size, color, multi-stop gradient, text, path text, polygon points, font family, font weight, font style, underline, strike, font size, line height, character spacing, text background, alignment, image URL, replace image file, QR value, opacity, shadow, angle, image filter presets, image filter adjustments, image outline, border type/cap/color/width, line arrow style, layer name, and direct Fabric transform handles. |
| Alignment | Align selected layer left, center X, right, full center, top, center Y, and bottom against the background; distribute multi-selected objects evenly across X or Y. |
| Bottom controls | Zoom in, zoom out, fit, Selection mode, Grab mode, Draw mode, Polygon mode, duplicate, keyboard shortcuts, and help. Zoom and Grab operate on the Fabric viewport so the workspace frame moves inside the full canvas. |
| Keyboard shortcuts | The shortcut panel opens from the bottom controls or `?`. Supported shortcuts cover undo/redo, save, preview, review, add text/rectangle/circle/line/QR, select all, delete, copy/paste, duplicate, group/ungroup, layer order, align/distribute, text bold/italic/underline/strike/size, nudge, resize, pan, temporary Space Grab, zoom, fit, 100% zoom, grid/ruler toggle, safe-area toggle, properties, and Active Layers. |
| Escape unwind | Escape is reserved for predictable preview cleanup: close transient panels first, cancel Design Cue/polygon drafts before selection changes, clear the selected layer next, close the right drawer when no layer is selected, and finally collapse the left drawer so the full Fabric workspace is visible. This Escape path still works from focused inspector fields while all other shortcuts stay blocked during typing. |
| Import | Native editor JSON and compatible Fabric JSON can be imported. PNG/JPEG/WebP/GIF files and direct raster-looking owner image URLs become image layers. Product adapters may also pass approved internal asset URLs. Arbitrary SVG files or pasted SVG markup are not imported as trusted runtime assets; data URLs, JavaScript URLs, extensionless owner-entered URLs, SVG-looking URLs, and raw selected-image source edits are rejected. |
| Quick tools | Group, ungroup, distribute X/Y, flip X, and flip Y operate on selected Fabric objects from the inspector and the floating selected-layer toolbar, then serialize back to the neutral document. |
| Export | A primary top-bar PNG download, pre-download readiness check, bundle PNG download, SVG and PNG downloads in export panels, PNG clipboard copy, base64 PNG clipboard copy, and JSON download. JSON keeps the design document portable. |
| Product save | Product callback registers metadata after export without giving the editor direct Firebase ownership. |

## CampaignCue First Consumer

CampaignCue must expose:

- Open editor from a campaign output.
- Start from scratch from Asset Library or Editor tab.
- Register exported asset metadata through CampaignCue Asset Library.
- Keep direct publish/send/ads/billing disabled.
- Preserve campaign/output/channel refs when the asset came from a pack.

## Mobile Decision

Desktop gets the full editor. Mobile can open a simplified view for Review mode, readiness checks, preview, template choice, campaign goal starters, text-slot edits, business text chips, selected-layer quick actions that fit 44px targets, autosave recovery, and download. Precision layer dragging fails the touch gate for day one and must remain desktop-first.

## Acceptance

- The shared editor compiles without product-specific imports.
- CampaignCue can open blank and campaign-seeded editor documents.
- Layers can be reordered, hidden, locked, duplicated, deleted, moved, resized, rotated, copied, pasted, and aligned with snap guidelines.
- Selecting a layer or active multi-selection shows a canvas-anchored floating toolbar with common actions. The toolbar sits below the selected Fabric bounding box, follows the bottom border during drag/resize/zoom, clamps only when the viewport edge requires it, and is not included in SVG/PNG/JSON exports.
- Selecting a layer or active multi-selection opens the right properties panel with the selected item controls first; the compact contextual toolbar is only a quick-control fallback when the properties panel is closed.
- Drawer search filters templates, tools, text presets, ready-made text templates, approved assets, Brand Kit picks, and local curated assets without remote API calls.
- Campaign goal starters compose local editable layers for common SMB jobs without remote template search or provider calls.
- Download readiness checks catch empty/low-quality handoff risks before export and keep the final decision with the owner.
- Export bundle creates common PNG handoff sizes from the active workspace frame without direct Storage or Firestore writes.
- Local autosave recovery can restore or dismiss a newer browser-local draft without replacing product-owned persistence.
- Ready-made text templates are defined in `src/modules/creative-editor/textTemplates.json`, insert editable neutral text layers, scale to the active output frame, and remain removable/editable through canvas selection, properties, keyboard delete, and Layers.
- Selected text business chips and selected image smart actions are visible before lower-frequency styling controls.
- Active Layers shows stack stats, inline rename, and recent owner-readable history context.
- Keyboard shortcuts are discoverable from the bottom controls and `?`, work for high-frequency desktop actions, and do not steal keystrokes from form fields or active Fabric text editing.
- Mobile review mode keeps readiness and download checks reachable while low-frequency panels collapse.
- Styles and My Stuff shortcuts work without remote stock search, provider generation, Firebase writes, or provider upload.
- Brand Kit quick picks can apply product-provided colors, logos, brand font, and brand-name text without the shared editor reading product storage directly.
- Common canvas-size presets resize the workspace through the same scaling path as manual width/height edits, and safe-area guides remain UI-only overlays outside export output.
- Page controls add, switch, duplicate, and lock artboards for multi-page documents; exports use the active page and JSON preserves the page list.
- Text, path text, text decoration, multi-stop gradient fills, visible watermark, shape, arrow, image filters, image adjustments, image outline, QR, imported raster images, imported Fabric JSON, custom polygon, and freehand path elements render in the preview.
- SVG and PNG downloads work for same-origin or CORS-safe assets.
- CampaignCue export registers an Asset Library record with campaign/output refs when available.
