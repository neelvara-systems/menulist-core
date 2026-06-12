# Shared Creative Editor - Test Cases

## Static Verification

| Case | Expected |
| --- | --- |
| Shared module has no CampaignCue imports except provider folder | Base editor stays product-neutral. |
| Feature flags exist | Shared and CampaignCue flags can disable editor surfaces. |
| Fabric dependency exists | `fabric@5.3.0` and matching types are installed for the shared editor runtime. |
| CampaignCue verifier includes editor checks | `npm run verify:campaigncue` catches missing integration. |
| Type check | `npx tsc --noEmit --incremental false` passes. |
| Full shell verifier | `npm run verify:campaigncue` checks rail, drawer, inspector, bottom controls, dark theme styles, and product-neutral shared defaults. |
| Internal smoke route | `/creative-editor-smoke` renders only outside production and returns 404 in production. |

## Editor Behavior

| Case | Expected |
| --- | --- |
| Open blank document | Canvas renders default starter content. |
| Full shell renders | Top toolbar, left rail, asset drawer, canvas, right inspector, and bottom controls render together. |
| Drawer collapse | Drawer collapse hides the asset drawer; choosing a rail tool reopens it. |
| Legacy frame smoke | Development smoke route renders a 620 X 427 Fabric canvas matching the legacy editor frame. |
| Toggle theme | Light and dark themes keep the same editor layout and usable controls. |
| Rail boundary | AI Tools is visible but disabled; Templates is active. |
| Apply starter template | Canvas size, title, and starter layers update. |
| Import native JSON | A downloaded editor JSON file reopens with the same neutral schema and product context preserved. |
| Import compatible Fabric JSON | A legacy Fabric JSON file is normalized into editor layers. |
| Import image file | PNG, JPEG, WebP, or GIF file becomes an image layer. |
| Import SVG file | SVG file becomes an image layer. |
| Import SVG markup | Pasted SVG markup becomes an image layer. |
| Add text | New text layer appears and is selected. |
| Add path text | New path-text layer appears, follows its stored path, and can edit text/path settings. |
| Add rectangle | New rectangle layer appears and is selected. |
| Add ellipse | New ellipse layer appears and is selected. |
| Add triangle | New triangle layer appears and is selected. |
| Add polygon/path shapes | Hexagon, pentagon, star, and egg layers appear and are selected. |
| Add line | New line layer appears and is selected. |
| Add arrow variants | Basic arrow and thin-tail arrow layers appear and preserve arrow style through JSON export. |
| Add curated asset | Illustration, graphic, or character asset appears as an image layer. |
| Add QR | QR layer appears and renders from current value. |
| Add image URL | Image layer uses supplied URL. |
| Freehand draw | Draw mode creates a path layer that appears in the layer list and exports. |
| Draw polygon | Polygon mode lets the user click points, finish with double-click or Enter, and stores a neutral polygon layer. |
| Polygon point edit | Inspector point textarea updates polygon vertices when at least three valid points are supplied. |
| Select layer | Properties panel reflects selected layer. |
| Clear selection | Selected-layer close control clears active selection without deleting the layer. |
| Drag unlocked layer | Layer position changes. |
| Resize unlocked layer | Fabric handles update layer width and height. |
| Rotate unlocked layer | Fabric rotation handle updates layer angle. |
| Snap guideline | Moving a layer near another layer shows alignment guide and snaps within margin. |
| Keyboard shortcuts | Delete removes selection; arrow keys nudge; command/control A selects all; command/control C/V duplicates; command/control G groups or ungroups. |
| Bottom controls | Zoom in, zoom out, fit, Selection, Grab, Draw, Polygon, duplicate, and help controls respond without layout shift. |
| Lock layer | Drag and property actions that should move it are blocked. |
| Hide layer | Layer remains in list but disappears from canvas/export. |
| Reorder layer | Move Forward, Move To Front, Move Backward, and Move To Back update visual stacking and layer list. |
| Align layer | Left, center X, right, center, top, center Y, and bottom alignment update coordinates against the canvas. |
| Distribute selection | Multi-select Distribute X/Y spaces at least three unlocked layers evenly. |
| Shadow and angle | Shadow blur/color/offset and Angle controls update the selected layer. |
| Text typography | Font family, weight, style, underline, strike, size, line height, character spacing, text background, and alignment controls update text layers. |
| Path text controls | Text, path, path color, and path visibility update path-text layers. |
| Gradient fill | Gradient toggle, start color, end color, angle, add stop, remove stop, stop color, and stop offset update text and fillable shape layers. |
| Image filter | None, black white, brownie, grayscale, invert, kodachrome, polaroid, sepia, technicolor, vintage, adjustment sliders, grayscale mode, RemoveColor, and Gamma update image layers. |
| Image outline | Outline color, width, and outline-only controls update supported image layers without changing the original source URL in JSON. |
| Border controls | Solid, dashed, long-dashed, dash-dot, dotted, round-cap variants, cap, color, width, and line arrow style controls update supported shape, path, line, and image layers. |
| Visible watermark | Watermark text, position, color, size, opacity, rotation, and tiled mode render in preview/export without becoming a selectable layer. |
| Flip controls | Flip X and Flip Y update the selected layer and persist through JSON export. |
| Group controls | Group and ungroup work for multi-selection editing while persistence returns to neutral layers. |
| Duplicate layer | New layer appears with copied properties and new id. |
| Delete layer | Layer is removed and selection clears. |
| Preview | Preview opens a watermark-free image snapshot and closes without changing the document. |
| Grid/ruler toggle | Grid overlay and ruler gutters toggle without changing the exported asset. |

## Export

| Case | Expected |
| --- | --- |
| Download SVG | Browser downloads a `.svg` file. |
| Download PNG with safe assets | Browser downloads a `.png` file. |
| Download PNG with blocked external image | Editor shows a clear export error and leaves SVG/JSON available. |
| Download JSON | Browser downloads neutral `CreativeEditorDocument` JSON. |
| Fresh JSON export | JSON export serializes the latest canvas state before download. |
| Copy PNG | Browser-local clipboard writes a PNG when supported and shows a clear unsupported-browser message otherwise. |
| Copy base64 | Browser-local clipboard writes the current PNG data URL text when supported. |

## CampaignCue Integration

| Case | Expected |
| --- | --- |
| Open editor from campaign output | Document includes campaign title, output text, CTA, dimensions, campaign id, output id, and channel. |
| Start from scratch | Document uses CampaignCue business name, brand color, and optional logo. |
| Export from campaign output | CampaignCue Asset Library receives asset metadata with usage refs. |
| Export from scratch | CampaignCue Asset Library receives asset metadata without campaign refs. |
| Direct publishing remains disabled | No social/provider mutation is introduced. |
