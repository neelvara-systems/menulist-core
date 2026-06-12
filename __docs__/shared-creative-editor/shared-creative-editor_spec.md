# Shared Creative Editor - Spec

## Summary

Shared Creative Editor lets product users create static visual assets from a prepared campaign output, a starter template, an imported design, or a blank canvas. It uses a full editor shell with top toolbar, left tool rail, asset drawer, Fabric.js central canvas, right inspector, bottom canvas controls, preview, grid/ruler orientation, and light/dark modes. It supports layers, text, path text, shapes, arrows, images, QR blocks, freehand path drawing, click-to-draw polygon creation, background color, manual positioning, drag, resize, rotate, property editing, alignment, distribution, snap guidelines, flip, grouping, typography, text decoration, text background, multi-stop gradient fills, visible watermark, shadow, image filters and adjustments, image outline/borders, JSON/image/SVG import, SVG/PNG/JSON export, and browser-local clipboard export.

## Goals

| Goal | Requirement |
| --- | --- |
| Product-neutral editor | The editor works through adapters. It does not know CampaignCue, MenuList, or Answerlattice business rules directly. |
| Start from product flow | A product can pass a prepared title, copy, CTA, campaign id, output id, channel, source refs, brand color, logo, and asset list into the editor. |
| Start from scratch | A product can open a blank editor with only brand defaults and save/export the result. |
| Layer control | Users can select, move, rename, hide, lock, duplicate, delete, and reorder layers. |
| Useful day-one tools | Text, path text, rectangle, circle/ellipse, triangle, line, arrow, thin-tail arrow, polygon/path shapes, custom polygon drawing/editing, freehand drawing, image URL/file/SVG import, replace image file, SVG markup import, curated illustration/graphic/character assets, QR code, canvas size, background, templates, visible watermark, preview, SVG export, PNG export, clipboard/base64 export, and JSON document export are supported. |
| Product-owned save | Export callbacks return a neutral result. Each product decides how to register the asset, apply rights, and connect source/trust metadata. |
| Screen parity | The shell follows the existing editor screen pattern: toolbar, rail, drawer, canvas, inspector, bottom controls, and theme toggle. |

## Non-Goals

- It is not a full design-suite replacement.
- It does not connect social accounts or publish assets.
- It does not run paid generation by itself.
- It does not store base64 media in Firestore.
- It does not reuse legacy mock auth, old dashboard shell, or hardcoded external share links from the GrowMeDigitally prototype.
- AI tools are visible but disabled until a governed product-specific provider contract is added.
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
| Top toolbar | Home affordance, drawing title, new design, canvas dimensions, import design JSON, import image file, import SVG file, grid toggle, reset, undo, redo, theme toggle, share, preview, and save. |
| Left rail and drawer | AI Tools disabled placeholder, active Templates, Background, Illustrations, Images, Text, Graphics, Characters, Shapes, and QR. |
| Canvas presets | Square post, story, wide banner, and poster starter templates are active local document starters. |
| Layers | Top-down list with select, move forward/back, move front/back, duplicate, delete, visible, and locked states. |
| Properties | Position, size, color, multi-stop gradient, text, path text, polygon points, font family, font weight, font style, underline, strike, font size, line height, character spacing, text background, alignment, image URL, replace image file, QR value, opacity, shadow, angle, image filter presets, image filter adjustments, image outline, border type/cap/color/width, line arrow style, layer name, and direct Fabric transform handles. |
| Alignment | Align selected layer left, center X, right, full center, top, center Y, and bottom against the background; distribute multi-selected objects evenly across X or Y. |
| Bottom controls | Zoom in, zoom out, fit, Selection mode, Grab mode, Draw mode, Polygon mode, duplicate, and help. |
| Import | Native editor JSON and compatible Fabric JSON can be imported. PNG/JPEG/WebP/GIF/SVG files and pasted SVG markup become image layers. |
| Quick tools | Group, ungroup, distribute X/Y, flip X, and flip Y operate on selected Fabric objects and serialize back to the neutral document. |
| Export | SVG and PNG downloads, PNG clipboard copy, base64 PNG clipboard copy, and JSON download. JSON keeps the design document portable. |
| Product save | Product callback registers metadata after export without giving the editor direct Firebase ownership. |

## CampaignCue First Consumer

CampaignCue must expose:

- Open editor from a campaign output.
- Start from scratch from Asset Library or Editor tab.
- Register exported asset metadata through CampaignCue Asset Library.
- Keep direct publish/send/ads/billing disabled.
- Preserve campaign/output/channel refs when the asset came from a pack.

## Mobile Decision

Desktop gets the full editor. Mobile can open a simplified view only for preview, template choice, text-slot edits, and download. Precision layer dragging fails the touch gate for day one and must remain desktop-first.

## Acceptance

- The shared editor compiles without product-specific imports.
- CampaignCue can open blank and campaign-seeded editor documents.
- Layers can be reordered, hidden, locked, duplicated, deleted, moved, resized, rotated, copied, pasted, and aligned with snap guidelines.
- Text, path text, text decoration, multi-stop gradient fills, visible watermark, shape, arrow, image filters, image adjustments, image outline, QR, imported SVG, imported Fabric JSON, custom polygon, and freehand path elements render in the preview.
- SVG and PNG downloads work for same-origin or CORS-safe assets.
- CampaignCue export registers an Asset Library record with campaign/output refs when available.
