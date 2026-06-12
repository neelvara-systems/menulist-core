# Shared Creative Editor - Implementation

## Runtime Contract

Shared Creative Editor is a reusable client module under `src/modules/creative-editor/`. The base module owns document state, the Fabric.js editing runtime, the full editor shell, layer controls, element rendering, local starter templates, import/export, preview, and browser-local editing. Product adapters own data loading, trust, rights, Firebase, Storage, and saved asset records.

## File Map

| Path | Purpose |
| --- | --- |
| `src/modules/creative-editor/types.ts` | Product-neutral document, element, asset, and export result types. |
| `src/modules/creative-editor/templates.ts` | Blank and starter template document builders. |
| `src/modules/creative-editor/export.ts` | SVG serialization, QR data URLs, PNG export, and file download helpers. |
| `src/modules/creative-editor/fabricAdapter.ts` | Fabric runtime adapter, object mapping, workspace, snap guidelines, panning, and neutral document serialization. |
| `src/modules/creative-editor/CreativeEditor.tsx` | Shared editor UI and layer/property controls. |
| `src/modules/creative-editor/CreativeEditor.module.scss` | Editor layout and responsive styles. |
| `src/modules/creative-editor/index.ts` | Public module exports. |
| `src/app/(internal)/creative-editor-smoke/page.tsx` | Development-only browser smoke route; returns 404 in production. |
| `src/modules/creative-editor/providers/campaigncue.ts` | CampaignCue adapter only. |
| `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` | CampaignCue tab/entry integration and asset registration callback. |

## Flags

| Flag | Default | Purpose |
| --- | --- | --- |
| `ENABLE_SHARED_CREATIVE_EDITOR` | `true` | Enables shared editor module usage. |
| `ENABLE_SHARED_CREATIVE_EDITOR_INTERACTIVE_CANVAS` | `true` | Enables day-one browser editor controls. |
| `ENABLE_SHARED_CREATIVE_EDITOR_FABRIC_ADAPTER` | `true` | Enables the shared Fabric.js 5.3.0 editor runtime. |
| `ENABLE_CAMPAIGNCUE_CREATIVE_EDITOR` | `true` | Lets CampaignCue open the shared editor. |
| `ENABLE_CAMPAIGNCUE_RENDERED_ASSET_EXPORTS` | `true` | Lets CampaignCue register editor exports as asset records. |

## Document Schema

`CreativeEditorDocument` stores:

- `schemaVersion`
- `id`
- `title`
- `productContext`
- `canvas`
- `elements`
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

Common element data includes position, size, rotation, visibility, locking, opacity, flip state, and shadow. Text and path-text elements include font family, weight, style, underline, strike, size, line height, character spacing, text background, gradient, alignment, and copy. Path-text also stores the editable SVG path and optional guide color/visibility. Fillable shapes can carry a multi-stop linear gradient. Image elements include source URL/data URL, filter preset, filter adjustments, optional transparent-image outline metadata, and optional border metadata. Stroke-capable elements use a shared border contract covering solid, dashed, long-dashed, dash-dot, dotted, and round-cap variants. Line elements also store basic, arrow, and thin-tail arrow styles. Document metadata can store an optional visible export watermark; the internal editor watermark remains non-exported.

The schema is deliberately not Fabric JSON. The active Fabric adapter maps the neutral schema to Fabric objects and back without forcing all products to inherit a Fabric-specific persistence format. Compatible Fabric JSON can be imported and normalized into the neutral document schema.

## Full editor shell

The shared editor UI now mirrors the target editor screen:

- Top toolbar: product mark, home affordance, drawing title, new design, dimensions, import design JSON, import image file, import SVG file, grid toggle, reset, undo, redo, theme toggle, share, preview, and save.
- Left rail: AI Tools, Templates, Background, Illustrations, Images, Text, Graphics, Characters, Shapes, and QR.
- Asset drawer: active local starter templates, curated static illustration/graphic/character assets, background colors and size fields, image URL/source inputs, SVG markup import, text presets, shape tools, and QR insertion.
- Center canvas: Fabric workspace, ruler/grid orientation, selection outline, handles, drag movement, resize, rotate, zoom, fit, Selection mode, Grab mode, Draw mode, Polygon mode, freehand path creation, click-to-draw polygon creation, wheel zoom, keyboard movement, copy/paste, delete, grouping, and snap guidelines.
- Right inspector: selected thumbnail, lock/duplicate/delete, group/ungroup, distribute X/Y, flip X/Y, layer z-order, alignment with background, colors, visible watermark, multi-stop gradient, shadow, angle, image filter presets and adjustments, RemoveColor/Gamma/grayscale-mode controls, image outline, border type/cap/color/width, line arrow style, typography, path-text path controls, polygon point controls, text decoration, position/size, text/image/QR fields, layer list, and export/clipboard buttons.
- Theme parity: the shell supports light and dark themes with the same control layout.

AI Tools are visible but disabled in the shared implementation. Templates are active local document starters and do not call provider APIs.

## CampaignCue Adapter

The CampaignCue adapter builds documents from:

- `CampaignCueWorkspace`
- `CampaignCueBusinessBrain`
- optional `CampaignCueCampaign`
- optional `CampaignCueOutput`
- optional `CampaignCueAsset[]`

It passes campaign/source refs into `CreativeEditorDocument.metadata`. CampaignCue registers exported assets through `POST /api/campaigncue/assets` and keeps the exported file itself as browser download/manual handoff until a Storage upload path is explicitly added.

## MenuList Adapter Contract

When MenuList uses the shared editor for generated or uploaded menu item images, it must use a separate MenuList adapter instead of reusing the CampaignCue adapter.

MenuList adapter rules:

- Use MenuList session, tenant, store, project, and item authority.
- Respect master/outlet image governance before opening edit or reconstruction actions.
- Use MenuList media image profiles, Storage paths, and project/item DAL writes.
- Use existing AI capacity/accounting, SAFE_MODE, rate limiting, task-secret worker validation, and bounded batch patterns before provider work.
- Invalidate public menu and Official Business Page cache when an accepted edited image changes public output.
- Keep the shared editor free of MenuList imports; pass all product behavior through adapter callbacks and metadata.

## Security

- No new API route is required for the shared editor.
- CampaignCue export registration continues to use `withAuth()`, CampaignCue scope guards, rate limiting, and Zod validation in `src/app/api/campaigncue/assets/route.ts`.
- External images may block PNG export if the browser canvas is tainted. The editor keeps SVG/JSON export available and surfaces a plain error.
- Product adapters must not pass private file URLs unless the product controls CORS and access policy.

## Cost

Base editor actions are browser-local and cost zero Firebase reads/writes. CampaignCue writes one asset metadata record plus one event only when the user saves/registers an exported asset.

## Implementation Notes

- Use `qrcode`, already present in the repo, for QR element rendering.
- Use `fabric@5.3.0` for the browser editing engine because the prior full editor behavior depends on Fabric transforms, selected-object controls, object stacking, export, panning, wheel zoom, and snap guidelines.
- The old Vue Fabric editor was used as a parity reference for shell structure, imports, templates, layers, transforms, grouping, flip, filters, image borders/outlines, typography, path text, text decoration, gradients, SVG/PNG/JSON export, clipboard export, ruler orientation, and drawing tools.
- Excluded legacy behavior is intentionally outside the shared product-neutral boundary: PSD service import, remote material/template API search, material upload APIs, mock login, language switching, and direct external share links.
- Do not import CampaignCue modules from the shared base editor.
- Do not store base64 PNG/SVG payloads in Firestore.
- Keep direct provider publishing disabled.
- Keep CampaignCue fallback URLs inside `providers/campaigncue.ts`; the base editor, templates, and exporter must stay product-neutral.
- Keep `src/app/(internal)/creative-editor-smoke/page.tsx` verification-only. It must remain production-blocked and must not write product data.

## Acceptance Checks

- `npm run verify:campaigncue` checks the CampaignCue integration and flags.
- `npx tsc --noEmit --incremental false` validates shared editor types.
- Browser smoke should cover blank editor, campaign-output editor, active templates, JSON/Fabric JSON import, image/SVG import, SVG markup import, preview, grid/ruler toggle, Fabric selection/drag/resize/rotate, Draw mode, Polygon mode, rail/drawer switching, layer reorder, grouping, distribute X/Y, flip, alignment, multi-stop gradient, visible watermark, shadow/angle, typography, path text, text decoration, image filter presets/adjustments including RemoveColor/Gamma/grayscale mode, image outline/border, polygon points, QR render, SVG download, PNG download, clipboard/base64 export, dark/light mode, and CampaignCue asset registration.
- When CampaignCue Firebase setup is unavailable locally, browser smoke may use `/creative-editor-smoke` to verify the reusable Fabric editor and then separately confirm CampaignCue stops at its setup blocker.
