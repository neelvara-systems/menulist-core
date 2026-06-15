# Shared Creative Editor - Old Editor Parity Audit

## Source Compared

| Source | Path |
| --- | --- |
| Old full editor reference | `/Users/danny/Projects/open source/vue-fabric-editor-main` |
| Current shared editor | `src/modules/creative-editor/` |
| CampaignCue consumer | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |

The old Vue Fabric editor was used only as a feature reference. The current implementation keeps the shared editor product-neutral and stores the neutral `CreativeEditorDocument`, not legacy Fabric JSON as the product persistence contract.

## Old Editor Flow Inventory

| Flow group | Old editor source | Flow summary |
| --- | --- | --- |
| Shell and startup | `src/views/home/index.vue` | Header, left rail, central Fabric workspace, right inspector, collapsible panels, ruler default on, plugin stack initialization. |
| Top import/create | `importJSON.vue`, `importFile.vue`, `common/modalSzie.vue` | Create custom/system size design, import JSON, import PSD, insert image, insert SVG file, paste SVG string. |
| Top history/preview/save | `history.vue`, `previewCurrent.vue`, `save.vue` | Undo, redo, preview, clear design, save to cloud, download image, download SVG, copy to clipboard, copy base64, download JSON. |
| Top product shell | `waterMark.vue`, `login.vue`, `lang.vue`, `myTemplName.vue` | Custom watermark, login/profile, language switch, template name/cloud save state. |
| Left templates | `importTmpl.vue` | Remote template list, type filtering, click template to replace canvas. |
| Left base elements | `tools.vue` | Add text, textbox, rect, circle, triangle, polygon, line, arrow, thin-tail arrow, draw polygon, draw path text, free draw. |
| Left material/font/layers | `fontStyle.vue`, `importSvgEl.vue`, `layer.vue`, `myMaterial/*` | Font style sources, remote SVG/material list, drag/click add, layer panel, user material/template list, upload material. |
| Canvas plugins | `@kuaitu/core` plugin list in `home/index.vue` | Drag/pan, selection controls, snap guidelines, center align, layer ordering, copy/delete/move hotkeys, grouping, workspace, history, flip, ruler, material, watermark, font, polygon modify, draw polygon, free draw, path text, PSD. |
| Multi-select inspector | `group.vue`, `align.vue`, `centerAlign.vue` | Group/ungroup, align selected objects to each other, distribute X/Y, center against workspace. |
| Single-select quick actions | `lock.vue`, `del.vue`, `clone.vue`, `hide.vue`, `edit.vue`, `replaceImg.vue`, `flip.vue` | Lock, delete, clone, hide, polygon edit, replace image while preserving placement, flip X/Y. |
| Single-select visual props | `filters.vue`, `imgStroke.vue`, `attributeColor.vue`, `attributeFont.vue`, `attributeTextContent.vue`, `attributePostion.vue`, `attributeShadow.vue`, `attributeBorder.vue`, `attributeId.vue` | Image filters, alpha image outline stroke, fill/gradient, text style/content/path text settings, position/size/angle, shadow, rich border styles, id/link data. |

## Covered In Current Editor

| Old editor capability | Current status |
| --- | --- |
| Toolbar shell | Covered: title, new design, dimensions, import, grid, reset, undo, redo, theme, share handoff, preview, and save. |
| Left tool rail and drawer | Covered: AI placeholder, active templates, background, illustrations, images, text, graphics, characters, shapes, and QR. |
| Templates | Covered as local starter templates. No remote template API call. |
| Import JSON | Covered for native editor JSON and compatible Fabric JSON normalization. |
| Import image file | Covered for PNG/JPEG/WebP/GIF file import into image layers. |
| Import SVG file | Intentionally not supported; unsafe SVG import is blocked by the trusted-asset boundary. |
| Import SVG string | Intentionally not supported; pasted SVG markup is not accepted as a runtime image layer. |
| Canvas controls | Covered: Fabric selection, move, resize, rotate, panning, wheel zoom, fit, snap guidelines, keyboard movement, delete, copy/paste, select all, and group shortcut. |
| Contextual property toolbar | Covered: selected text, image, shape/line/QR, and multi-selection states expose high-frequency properties above the canvas while reusing inspector handlers. |
| Floating selected-layer toolbar | Covered: selected objects show a canvas-anchored action bar for Design Cue entry, edit, color, style, flip, position/layers, lock, duplicate, delete, group, distribute, and more controls without entering export output. |
| Searchable drawer and Brand Kit | Covered: local templates/assets/tools/text presets, approved product assets, recent insertions, brand colors/logos/font, and product text placeholders are searchable or directly actionable without remote material APIs. |
| Page/artboard controls | Covered: optional page list with active-page mirror, add/switch/duplicate/lock page controls, active-page export, and JSON page-list preservation. |
| Grid/ruler-style orientation | Covered as a grid overlay toggle with numeric ruler gutters. |
| Preview | Covered through a watermark-free preview modal. |
| Layers | Covered: list, select, hide, lock, duplicate, delete, reorder forward/back/front/back. |
| Group/ungroup | Covered for edit-time Fabric grouping. Persistence releases groups back to neutral layers. |
| Alignment | Covered: left, center X, right, center, top, center Y, bottom against the background. |
| Flip | Covered for selected objects on X/Y axes. |
| Text editing | Covered: text content, path text, color, font family, font weight, italic, underline, strike, font size, line height, character spacing, text background, gradient, alignment, position, size, opacity, shadow, rotate, lock, and layer order. |
| Image editing | Covered: URL/file/SVG source, border, filter preset, filter adjustments, position, size, opacity, shadow, flip, rotate, lock, and layer order. |
| Image filters | Covered: none, black white, brownie, grayscale, invert, kodachrome, polaroid, sepia, technicolor, vintage, plus brightness, contrast, saturation, vibrance, hue, blur, noise, and pixelate adjustments. |
| Shape tools | Covered: rectangle, ellipse/circle, triangle, line, hexagon, pentagon, star, egg, path. |
| Freehand drawing | Covered through Draw mode that creates neutral path layers. |
| Borders | Covered for shapes, paths, lines, and images with solid/dashed/long-dashed/dash-dot/dotted styles, round-cap variants, cap, color, width, and line arrow style. |
| Gradient fills | Covered for text and fillable shape layers with start color, end color, angle, and editable intermediate stops. |
| Shadow/blur | Covered as structured shadow with blur, color, X, and Y offsets. |
| QR | Covered as QR image render from editable value. |
| SVG/PNG export | Covered with browser download and product-owned export callback. |
| JSON export | Covered as portable neutral editor document JSON. |

## Flow Coverage Matrix

| Old editor flow | Current shared editor status | Notes |
| --- | --- | --- |
| Header shell | Added | Product mark, home affordance, title, dimensions, imports, grid, reset, undo/redo, theme, share handoff, preview, save. |
| Create new blank design | Added | `New Design` resets to an empty neutral document. |
| Create custom/system size design | Partial | Canvas width/height fields and starter templates exist; old modal with named system/custom presets is not copied exactly. |
| Import native JSON | Added | Native `CreativeEditorDocument` import keeps product context. |
| Import old Fabric JSON | Added | Compatible Fabric JSON normalizes into neutral layers; unsupported legacy object/plugin types may be simplified or dropped. |
| Import image file | Added | PNG/JPEG/WebP/GIF file import into image layers. |
| Import SVG file | Rejected | Arbitrary SVG import remains blocked; SVG export from the neutral document model is still supported. |
| Paste SVG string | Rejected | Arbitrary pasted SVG markup remains blocked; the Images drawer explains the safe raster-image boundary. |
| PSD import | Not added | Requires backend/service guardrails and cost controls. |
| Remote template list/filter | Not added | Replaced with local templates to avoid remote API dependency. |
| Local starter templates | Added | Square, story, wide, poster local document starters. |
| Remote material/SVG list | Partial | Curated local assets and product asset sources exist; no remote material search/filter API. |
| User material upload/list | Not added | Product adapter must own Storage, rights, and bounded reads before this can exist. |
| Font catalog/style source panel | Partial | Safe local font family controls exist; no remote font preview catalog/API-backed font loading. |
| Layer panel | Added | Select, hide, lock, reorder, duplicate, delete. |
| Selection controls | Added | Fabric handles for move, resize, rotate; keyboard delete, arrows, copy/paste, select-all, group shortcut. |
| Canvas-local selected-object actions | Added | Floating selected-layer toolbar mirrors modern editor behavior for common actions near the selected item while reusing inspector/action handlers. |
| Snap guidelines | Added | Alignment guidelines on object move. |
| Pan/zoom/fit | Added | Grab mode, wheel zoom, zoom in/out, fit. |
| Numeric ruler gutters | Added | Grid toggle also shows top/left numeric ruler gutters for canvas orientation. |
| Text and textbox | Added | Text insertion and multiline textbox-style editing through Fabric textbox. |
| Rect/circle/triangle/polygon presets | Added | Shape presets include rect, ellipse/circle, triangle, hexagon, pentagon, star, egg/path. |
| Line | Added | Basic line element exists. |
| Arrow and thin-tail arrow | Added | Neutral line layers support basic, arrow, and thin-tail arrow styles. |
| Draw polygon interactively | Added | Polygon mode supports click-to-add points and finish through double-click or Enter. |
| Polygon vertex modify | Added | Inspector point textarea edits stored polygon vertices. |
| Free draw | Added | Draw mode creates neutral path layers. |
| Path text | Added | Neutral path-text layers store editable text, path, guide color, and guide visibility. |
| Group/ungroup | Partial | Edit-time grouping works; persistence releases groups back to neutral layers. |
| Multi-select align to objects | Partial | Selection can be aligned as a group to the background; equal distribute X/Y is implemented for active multi-selection. Full object-to-object edge align remains reduced. |
| Equal distribute X/Y | Added | Old `xequation` / `yequation` behavior is covered by Distribute X/Y quick tools. |
| Center to workspace | Added | Center X, center Y, full center against background. |
| Lock/delete/clone/hide | Added | Quick actions and layer actions. |
| Polygon edit quick action | Added | Polygon vertices are editable through the layer inspector. |
| Replace selected image | Added | Selected image can be replaced from a file while preserving placement and layer settings. |
| Flip X/Y | Added | Persisted on neutral elements. |
| Image filters | Added | Presets, adjustment sliders, grayscale mode, RemoveColor, and Gamma are implemented. |
| Alpha image outline stroke | Added | Browser-local image outline generation supports outline color, width, and outline-only mode while preserving original source metadata. |
| Fill color | Added | Swatches and direct controls. |
| Gradient fill | Added | Multi-stop gradient editor supports color and offset editing. |
| Font family/size/align | Added | Safe local options and text controls. |
| Bold/italic/underline/strike | Added | Text style row. |
| Line height/char spacing/text background | Added | Inspector controls persist through schema/export. |
| Text content | Added | Textarea edits text. |
| Path text content/stroke | Added | Path text content, path data, guide color, and guide visibility are editable. |
| Position/size/rotation/opacity | Added | Numeric controls and Fabric handles. |
| Shadow | Added | Blur, color, X, Y. |
| Border color/width/dash | Added | Rich dash arrays and line-cap variants are implemented. |
| ID/linkData editor | Partial | Layer id/source refs exist in schema; no owner-facing arbitrary `linkData` editor. |
| Custom visible watermark | Added | Optional visible export watermark is stored in document metadata and rendered separately from the hidden internal watermark. |
| Preview | Added | Watermark-free PNG preview modal. |
| Clear canvas | Added | Reset/new blank flow; old clear confirmation modal is not copied exactly. |
| Download image | Added | PNG download. |
| Download SVG | Added | SVG download. |
| Download JSON | Added | Neutral JSON download. |
| Copy image to clipboard | Added | Browser-local PNG clipboard export is available when supported. |
| Copy base64 to clipboard | Added | Browser-local base64 PNG clipboard export is available when supported; Firestore persistence remains blocked. |
| Save to cloud | Product-owned partial | CampaignCue can register asset metadata after PNG export; no shared cloud save/material upload. |
| Login/profile | Not added | Product shell/auth owns identity. |
| Language switch | Not added | Product shell owns localization. |

## Result-Affecting Gaps

No known old-editor result-affecting gaps remain inside the product-neutral browser editor boundary after the June 14, 2026 parity pass. Implemented coverage now includes path text, arrow variants, click-to-draw polygons, polygon vertex editing, visible export watermark, image outline, multi-stop gradients, RemoveColor/Gamma/grayscale-mode filters, richer border dash/cap variants, multi-select distribute X/Y, numeric ruler gutters, top contextual property toolbar, floating selected-layer toolbar actions, searchable drawer, Brand Kit quick picks, text placeholders, optional page/artboard controls, replace-image, PNG clipboard export, and base64 clipboard export.

Two differences remain intentional:

1. General nested group persistence remains outside the neutral schema. Grouping is supported for edit-time work; persistence returns ordinary neutral layers except for editor-owned compound layer types such as path text and arrow lines.
2. Full object-to-object edge alignment is still reduced to background alignment plus multi-select equal distribution. This preserves a simpler SMB-facing inspector while covering the old exported-result spacing need.

## Product/Backend Gaps

These are intentionally outside the shared editor until a product adapter owns data, security, and cost:

1. PSD import service.
2. Remote template API and template save/update/remove.
3. Remote material/SVG search and upload.
4. User material library backed by Storage.
5. Cloud save as reusable material.
6. Login/profile UI inside the editor.
7. Language switcher inside the editor.

## Intentionally Outside The Shared Editor

| Old editor capability | Decision |
| --- | --- |
| PSD import service | Not included. Old implementation depended on a service/plugin path; adding this would need a product-owned backend, validation, file limits, and cost controls. |
| Remote material search/upload APIs | Not included. Product adapters must own any storage, rights, and source metadata. |
| Remote template API | Not included. Current templates are local document starters. |
| Mock login/profile UI | Not included. Auth belongs to the product shell. |
| Language switching | Not included in the shared editor shell. Product shells own locale context. |
| Direct social/provider share | Not included. CampaignCue day-one delivery is export/download/manual handoff only. |
| Persistent nested group schema | Not included. Grouping is edit-time only so cross-product persistence stays simple and portable. |

## Product Boundary Result

- Base editor imports no CampaignCue workspace UI, Firebase client, MenuList owner state, or Answerlattice tenant shape.
- CampaignCue owns only the adapter and export registration callback.
- No provider posting, social account connection, WhatsApp direct send, Google publish, ad spend mutation, paid generation, or Storage upload was introduced.
- Firebase cost stays unchanged during editing because imports, templates, drawing, preview, and downloads are browser-local.

## Remaining Expansion Candidates

These are not blockers for current product-neutral editor parity, but they are valid product-owned extensions when a product owns the data, security, rights, and cost controls:

| Priority | Candidate | Reason |
| --- | --- | --- |
| Product-owned | Storage upload/export library | Requires product-owned rights review, Storage prefixes, bounded reads, and cost controls. |
| Product-owned | Remote material/template library | Requires product-owned APIs, rights metadata, and abuse limits. |
| Product-owned | PSD import | Requires backend function/service, file limits, validation, and cost guardrails. |
| Mobile-specific | Touch template/text-slot editor | Full freeform editing remains desktop-first. |
| Optional precision | General nested group persistence | Requires a broader neutral group schema and cross-product migration decision. |
| Optional precision | Full object-to-object edge alignment | Current editor keeps background alignment plus equal distribution for simpler SMB use. |
