# Shared Creative Editor - Test Cases

## Static Verification

| Case | Expected |
| --- | --- |
| Shared module has no CampaignCue imports except provider folder | Base editor stays product-neutral. |
| Feature flags exist | Shared and CampaignCue flags can disable editor surfaces. |
| Fabric dependency exists | `fabric@7.4.0` is installed and its bundled TypeScript declarations are used; `@types/fabric` stays absent. |
| Fabric 7 runtime boundary | `npm run verify:creative-editor-smoke` checks left/top origin compatibility, the lowercase `activeselection` runtime type, custom clone metadata, Promise APIs, filters, coordinate-safe group/ungroup, collection stacking, PNG export, and async disposal. |
| CampaignCue verifier includes editor checks | `npm run verify:campaigncue` catches missing integration. |
| Design Cue panel is neutral | `DesignCuePanel.tsx` imports shared editor types only and no CampaignCue product types. |
| Bounded failure notices | `npm run verify:campaigncue` confirms editor runtime/provider/callback failures use `showCreativeEditorFailure()` and do not surface raw exception text in notices or AI findings. |
| Type check | `npx tsc --noEmit --incremental false` passes. |
| Full shell verifier | `npm run verify:campaigncue` checks rail, drawer, inspector, bottom controls, dark theme styles, and product-neutral shared defaults. |
| Smoke QA verifier | `npm run verify:creative-editor-smoke` checks the internal smoke route, stress variant, QA selectors, focus restoration, and documentation guardrails. |
| Internal smoke route | `/creative-editor-smoke` renders only outside production and returns 404 in production. |
| Browser smoke QA route | `/creative-editor-smoke?qa=1` completes with `data-creative-editor-qa-status="passed"` after validating real canvas paint, top-bar toggles, rail switching, drawer insertions, keyboard creation shortcuts, Fabric multi-select distribution/duplicate/delete/group/ungroup, floating toolbar anchoring, both shortcut close paths, preview export, layer panel rows, text-field focus retention, and staged Escape. |
| Browser stress QA route | `/creative-editor-smoke?qa=1&variant=stress` completes with `data-creative-editor-qa-status="passed"` while rendering a large mixed-layer design. |
| MyCodex local preview route | `http://localhost:3000/__mycodex/creative-editor-test` renders only when `FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_EDITOR_TEST_ROUTE` is enabled; otherwise it fails closed. |

## Editor Behavior

| Case | Expected |
| --- | --- |
| Open blank document | Canvas renders a clean output frame with no surprise foreground layers. |
| Full shell renders | Top toolbar, left rail, asset drawer, canvas, right inspector, and bottom controls render together. |
| Drawer collapse | Drawer collapse hides the asset drawer; choosing a rail tool reopens it. |
| Product presentation adapter | An adapter can allowlist rail tools and workspace controls, choose initial drawer/selection state, opt embedded chrome into local drafts, and readiness-gate product header actions without changing full-editor defaults. |
| Drawer search truthfulness | Non-searchable drawers such as Background, AI Tools, QR Code, and Barcode expose no inert search field. Searchable drawers retain their purpose-named search input, filter to a truthful no-match state, and recover when cleared. Graphics popular searches are limited to Sale, New, Offer, Callout, Graphic, and Sticker so every suggestion resolves at least one current approved asset. |
| Template acknowledgement | Applying a starter template replaces only the active page, announces the exact applied template, and remains recoverable through Undo without retaining an unrelated earlier notice. |
| Campaign goal starter | Choosing a campaign goal starter creates a usable first design by composing local background, editable text template layers, and optional QR layers through normal history. |
| Legacy frame smoke | Development smoke route renders a 620 X 427 Fabric canvas matching the legacy editor frame. |
| Workspace frame focus | The surrounding editor workspace is not the exported design; only the visible output frame/background and layers export. |
| Full-workspace canvas | The visible Fabric canvas fills the remaining editor area after the rail and drawer; the floating inspector overlays the right edge without changing that full viewport. The output frame is an internal Fabric workspace object inside the Fabric viewport. |
| Fabric-native zoom and grab | Mouse-wheel zoom, bottom zoom buttons, Fit, and Grab mode update Fabric viewport transforms so the frame moves/scales inside the canvas instead of CSS-scaling a DOM artboard. |
| Workspace-only export | SVG, PNG, preview, clipboard PNG, and base64 export crop to the internal workspace frame even after wheel zoom or Grab panning. |
| Toggle theme | Light and dark themes keep the same editor layout, usable controls, theme-aware segmented controls, and readable sidebar icons. |
| Sidebar icon active state | Active rail icons use the old craft-builder multi-path SVG palette instead of flattening all paths into one solid color. |
| Rail boundary | AI Tools renders only product-provided actions; Templates is active. |
| Design Cue command panel | Product-supplied commands render in AI Tools without provider calls. |
| Design Cue selected-layer comment | Selected text layer name appears in the comment label and request target uses the layer id. |
| Design Cue apply flow | Patch preview does not change the document until Apply is clicked, then commits through editor history. |
| Design Cue cancel flow | Cancel clears the patch card without mutating the document. |
| Apply starter template | Canvas size, title, and starter layers update. |
| Apply canvas size preset | Background drawer size presets update the workspace dimensions and scale existing layers through the same path as manual width/height edits. |
| Import native JSON | A downloaded editor JSON file reopens with the same neutral schema and product context preserved. |
| Import compatible Fabric JSON | A legacy Fabric JSON file is normalized into editor layers. |
| Fabric JSON completion | Import awaits Fabric 7's complete Promise-based deserialization; the reviver callback is not treated as completion. |
| Fabric JSON isolation | Legacy JSON loads in an off-screen canvas and reaches the live editor only after object/node, image-source, neutral-shape, and revision validation. |
| Fabric JSON complexity | More than 300 Fabric objects or 5,000 traversed payload nodes is rejected before deserialization. |
| Import image file | PNG, JPEG, WebP, or GIF file becomes an image layer. |
| Spoofed raster import | A raster MIME label whose bytes do not match PNG, JPEG, WebP, or GIF is rejected before creating or replacing a layer. |
| Oversized raster import | Files above 1.4 MB are rejected so their base64 source cannot exceed the persisted document contract. |
| Upload from Images drawer | The Images drawer exposes local raster upload in addition to image URL and approved assets. |
| Upload from My Stuff | My Stuff exposes a clear upload card, recent session insertions, and approved assets without remote search. |
| Import SVG file | No SVG-file import button exists; owner uses raster image upload or product-approved assets instead. |
| Import SVG markup | No pasted SVG import field exists; arbitrary SVG markup is not accepted as a runtime image layer. |
| Add unsafe image URL | `data:`, `javascript:`, SVG-looking owner-entered URLs, and extensionless owner-entered URLs are rejected with a plain message. |
| Edit selected image source | Selected image source is read-only; owner uses Replace image file or the Images panel. |
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
| Add QR with props | QR drawer value, QR color, background color, and size fields create the inserted QR layer. |
| Add image URL | Image layer uses supplied URL. |
| Freehand draw | Draw mode creates a path layer that appears in the layer list and exports. |
| Draw polygon | Polygon mode lets the user click points, finish with double-click or Enter, and stores a neutral polygon layer. |
| Polygon point edit | Inspector point textarea updates polygon vertices when at least three valid points are supplied. |
| Select layer | Right properties panel opens and reflects the selected layer. |
| Right-panel focus retention | Typing in selected text, changing font size, editing layer name, adjusting opacity, and changing X/Y/W/H update the canvas while the active inspector field keeps focus. |
| No-op property edit guard | Re-emitting the same selected-layer value does not commit a new document snapshot, reload Fabric, or add a history entry. |
| Invalid property edit guard | `NaN`, non-positive required values, out-of-range opacity/size fields, and other schema-invalid mutations do not change Fabric, document state, history, autosave, or callbacks. |
| Floating right drawer | Opening or closing the right properties panel or Active Layers panel does not change the Fabric viewport width, workspace frame position, or fit zoom. |
| Open layers panel | The canvas Layers button opens the dedicated Active Layers panel instead of selected-item properties. |
| Select from layers panel | Selecting a layer from the Active Layers panel keeps the stack panel open and highlights the selected row. |
| Layer panel stats and rename | Active Layers shows visible/locked counts, current owner-readable history label, and an inline selected-layer rename field that keeps focus while updating the canvas state. |
| Layer drag reorder | Dragging an unlocked layer row in Active Layers reorders the top-down stack, keeps the same layer selected, and blocks locked source layers until they are unlocked. |
| Selected-item-first inspector | Text, image, QR, color, opacity, and position controls appear before alignment, stacking, advanced effects, watermark, and export controls. |
| Compact right drawer density | The selected-layer header, right-panel section headings, controls, quick actions, Active Layers drawer, notices, and export buttons use old-editor compact desktop sizing while narrow/mobile layouts keep larger touch controls. |
| Text owner actions | Selected text exposes Readable, Shorten, Add CTA, Add contact, Center, and Bring front actions before generic layer controls. |
| Business text chips | Selecting a text layer exposes product-provided business facts as chips; clicking a chip appends that text to the selected layer without replacing unrelated copy. |
| Text checks | Selected text reports low contrast, small size, long copy, near-edge placement, and missing action cue with direct local fixes where possible. |
| Smart image quick actions | Selected image layers expose Fill frame, Fit inside, Larger, and Behind text actions before advanced image controls. |
| Irrelevant inspector panels | Image filters, borders, gradients, and shadows are hidden when the current selection cannot use them. |
| Gradient stop lifecycle | Enabling a supported shape gradient allows angle edits, adding a third stop, editing its offset, and removing it; explicit stop patches are not replaced by stale endpoint-only stops. |
| AI result placement | AI suggestions and findings appear above the remaining tool groups after a tool result is ready. |
| Floating toolbar appears | Selecting a layer on the canvas shows the floating selected-layer toolbar near the selected object while detailed options live in the right inspector. |
| Floating toolbar follows selection | Drag, resize, rotate, zoom, and selection changes update the floating toolbar position so it stays attached to the active Fabric selection. |
| Floating toolbar bottom placement | Moving a layer near the top, center, or lower portion of the visible Fabric viewport keeps the floating toolbar attached below the selected bounding box bottom border, with clamping only at the viewport edge. |
| Floating toolbar focus retention | Changing selected-layer color or other quick properties from the floating toolbar updates the canvas without stealing focus from the active toolbar/control input. |
| Floating toolbar render throttling | Fast drag, scale, rotate, and zoom events coalesce toolbar repositioning to animation frames and skip unchanged toolbar state. |
| Grab viewport render throttling | Holding Grab and moving the output frame keeps ruler/safe-area overlays aligned without scheduling workspace metric state on every pointer event. |
| Floating toolbar single-layer actions | Edit opens the inspector, color updates the supported selected layer color, style/position open detailed controls, flip updates the selected layer, lock/duplicate/delete reuse existing layer actions, and locked layers block destructive or geometry-changing controls. |
| Floating toolbar multi-selection actions | Active multi-selection shows group, distribute X/Y, duplicate, delete, and more controls while hiding single-layer-only color and lock actions. |
| Floating toolbar group actions | True Fabric groups show Ungroup and Position; normal single layers and ungrouped multi-selection do not show invalid Ungroup controls. |
| Floating toolbar locked state | Unlocked selected layers show Lock; locked selected layers stay selectable, hide resize controls, show Unlock, and disable destructive or geometry-changing actions; locked pages disable layer mutations until the page is unlocked. |
| Floating toolbar export boundary | SVG, PNG, JSON, clipboard PNG, and base64 export include the canvas content only; the toolbar overlay is not serialized or rendered into output. |
| Contextual toolbar text controls | Selecting text shows font family, size, color, style, alignment, opacity, effects, and position controls; each updates through existing document history. |
| Contextual toolbar image controls | Selecting an image shows replace, filter, fit/crop, flip, opacity, style, and position controls. |
| Priority image action feedback | Fit/Crop, Flip, Fill frame, Fit inside, Larger, and Behind text announce the completed action; Undo announces the matching history recovery instead of leaving a stale earlier status visible. |
| Selected-property feedback | Every successful inspector or contextual selected-layer property change announces its own owner-readable history label; no-op and invalid edits keep their existing guarded behavior, and Undo announces exact recovery. |
| Contextual toolbar shape controls | Selecting shape, line, QR, or path layers shows color/stroke/opacity/style/position controls that reuse inspector mutations. |
| Contextual toolbar multi-selection | Active multi-selection shows group, distribute, duplicate, delete, and position actions. |
| Drawer search | Drawer search filters local templates, tools, curated assets, approved image assets, text presets, ready-made text templates, Brand Kit picks, and placeholders without a network call. |
| Drawer item cap | Long local asset/template lists render a capped set of cards with a prompt to search/refine instead of forcing every card into the DOM at once. |
| Text preset drawer | Text drawer exposes only implemented actions: Add a text box, Brand Kit entry, default text styles, business placeholders, data-backed ready-made text templates, and path text. Unimplemented AI placeholders are absent. |
| Text template insert/edit/remove | Add a ready-made text template, confirm each inserted layer remains editable text, change one layer from the right properties panel, then remove the selected layer from canvas/Layers without affecting unrelated layers. |
| Text template thumbnail cards | Text and Styles drawer template cards show visual previews without separate visible label/category text while keeping accessible add labels. |
| Styles drawer | Styles exposes Project style, Apply brand style, Shuffle style, ready-made project styles, and text combinations. |
| Apply project style | Applying a project style updates unlocked text, fill/stroke, QR, outlined-image color, and background while locked layers remain unchanged. |
| Project style feedback | Apply brand style announces `Brand style applied.` while named presets announce `<name> style applied.`; neither success nor Undo feedback duplicates the word `style`. |
| Shuffle project style | Shuffle cycles local presets and records a normal editor history entry without provider calls. |
| Graphics sticker drawer | Graphics drawer exposes local stickers, popular search chips, recent insertions, and recommended assets without a network call. |
| Sticker drawer thumbnail cards | Sticker cards show thumbnail-only buttons with accessible add labels, so long sticker names do not squeeze or break the left drawer grid. |
| Sticker SVG render | Adding each local sticker renders the complete sticker image on the Fabric canvas and in the right inspector preview; no cropped half-shape placeholder appears. |
| Recent insertions | Adding assets or text creates browser-local recent chips in the drawer. |
| Brand Kit quick picks | Product-provided brand colors, logo assets, brand name, and brand font can be applied without shared-editor Firebase reads. |
| Brand Kit unsupported color target | With a non-colorable image selected, choosing a brand color leaves the design unchanged and explains that text, shape, line, or QR selection is required instead of retaining stale success feedback. |
| Text placeholders | Product-provided business facts such as business name, offer, CTA, destination, and contact facts insert as editable text layers with source refs. |
| Page controls | Single-page documents hide page controls; multi-page documents can add pages, duplicate pages with new layer ids, and switch artboards. |
| Page lock | A locked active page blocks layer/canvas edits, keyboard mutation shortcuts, and selected-layer actions until unlocked. |
| Active-page export | SVG, PNG, clipboard PNG, and base64 export use the active page; JSON export preserves the full page list. |
| Clear selection | Selected-layer close control clears active selection without deleting the layer. |
| Drag unlocked layer | Layer position changes. |
| Resize unlocked layer | Fabric handles update layer width and height. |
| Rotate unlocked layer | Fabric rotation handle updates layer angle. |
| Snap guideline | Moving a layer near another layer shows alignment guide and snaps within margin. |
| Keyboard shortcuts panel | Click the bottom keyboard button or press `?`; the panel opens with grouped shortcuts for general, create, select/edit, move/resize, arrange, text, and view actions, then closes with Escape or Close. |
| Shortcut typing guard | While editing a right-panel input, textarea, select, or active Fabric text object, creation and mutation shortcuts do not fire or steal focus. |
| Keyboard traversal | Shortcut and preview dialogs move focus inside the open dialog, keep Tab traversal trapped while open, close with Escape, and restore focus to the button that opened the dialog. |
| Escape staged preview unwind | With a popup open, a selected layer, and the left drawer expanded, press Escape repeatedly; the first press closes the popup, the next clears the selected layer/floating toolbar/right inspector, and the final press collapses the left drawer and clears drawer search so the editor shows the full workspace. Escape still performs this unwind from focused inspector fields, while non-Escape shortcuts remain blocked during typing. |
| Keyboard creation shortcuts | Press T, R, C, L, and Q from canvas focus; each adds the expected text, rectangle, circle, line, or QR layer through the normal document history path. |
| Keyboard edit shortcuts | Delete removes selection; arrow keys nudge; command/control A selects all; command/control C/V copies and pastes; command/control D duplicates; command/control G groups; command/control shift G ungroups. |
| Keyboard arrange shortcuts | Command/control bracket moves selected layers forward/back; command/control alt bracket moves to front/back; alt shift L/C/R/T/M/B aligns; command/control shift H/V distributes eligible selections. |
| Keyboard text shortcuts | With a text layer selected, command/control B/I/U and command/control shift X toggle text styles, and command/control shift comma/period changes text size without opening a separate panel. |
| Keyboard view shortcuts | Command/control plus/minus zooms; command/control 0 fits; command/control alt 0 resets to 100%; command/control quote toggles grid/rulers; command/control shift quote toggles safe area; hold Space temporarily switches to Grab and restores the prior mode on release. |
| Bottom controls | Zoom in, zoom out, fit, Selection, Grab, Draw, Polygon, duplicate, and help controls respond without layout shift. |
| Lock layer | Drag and property actions that should move it are blocked. |
| Hide layer | Layer remains in list but disappears from canvas/export. |
| Reorder layer | Move Forward, Move To Front, Move Backward, and Move To Back update visual stacking and layer list, announce the exact destination, and restore through exact Undo feedback. |
| Align layer | Left, center X, right, center, top, center Y, and bottom alignment update coordinates against the canvas, announce the exact target, and restore through exact Undo feedback. |
| Distribute selection | Multi-select Distribute X/Y spaces at least three unlocked layers evenly. |
| Shadow and angle | Shadow blur/color/offset and Angle controls update the selected layer. |
| Text typography | Font family, weight, style, underline, strike, size, line height, character spacing, text background, and alignment controls update text layers. |
| Text style accessibility and pointer recovery | Contextual, priority-inspector, and detail-inspector Bold, Italic, Underline, and Strikethrough buttons expose unique names plus current pressed state; a 700/800-weight heading can turn Bold off; contextual controls remain visibly stacked above the Fabric stage and respond to pointer as well as keyboard activation; exact restoration returns the original typography. |
| Path text controls | Text, path, path color, and path visibility update path-text layers. |
| Gradient fill | Gradient toggle, start color, end color, angle, add stop, remove stop, stop color, and stop offset update text and fillable shape layers. |
| Image filter | None, black white, brownie, grayscale, invert, kodachrome, polaroid, sepia, technicolor, vintage, adjustment sliders, grayscale mode, RemoveColor, and Gamma update image layers. |
| Image outline | Outline color, width, and outline-only controls update supported image layers without changing the original source URL in JSON. |
| Border controls | Solid, dashed, long-dashed, dash-dot, dotted, round-cap variants, cap, color, width, and line arrow style controls update supported shape, path, line, and image layers. |
| Advanced inspector recovery | Shadow blur and offsets, rotation, all image-adjustment sliders, grayscale mode, gamma channels, image outline/width/outline-only, border type/cap/width, detail X/Y/W/H, and detail opacity each announce the current mutation, enable Undo, and restore the exact prior document state. Native color-picker values require a browser surface that can drive the operating-system picker and must not be credited from source inspection alone. |
| Visible watermark | Show on export announces enabled/disabled state; text, position, color, size, opacity, rotation, and tiled mode announce updates, render in preview/export without becoming selectable layers, and restore through document history. |
| Flip controls | Flip X and Flip Y update the selected layer, announce the horizontal or vertical result, persist through JSON export, and restore through exact Undo feedback. |
| Group controls | Group and ungroup work for multi-selection editing while persistence returns to neutral layers. |
| Invalid group actions | Group is unavailable with fewer than two unlocked selected layers; Distribute is unavailable with fewer than three unlocked selected layers; Ungroup is unavailable unless a true group is selected. |
| Duplicate layer | New layer appears with copied properties and new id. |
| Delete layer | Layer is removed and selection clears. |
| Owner-readable undo redo | Undo and Redo show the action label being reversed or restored instead of a generic history message. |
| Local autosave restore | After editing a document, a newer browser-local draft is detected on reload and can be restored or dismissed without calling product persistence. |
| Local autosave scope and corruption | Delimiter-bearing product/workspace/document values cannot collide; malformed, oversized, cross-product, cross-workspace, or different-document payloads are rejected and removed; unavailable storage remains non-fatal and observable. |
| Mobile review mode | On a narrow viewport, Review mode opens the download check, fits the output frame, and hides low-frequency rail/drawer space while keeping preview/download controls reachable. |
| Preview | Preview opens a watermark-free image snapshot and closes without changing the document. |
| Top-bar download | Download in the top toolbar exports the active workspace frame as PNG without requiring a selected layer or open inspector. |
| Grid/ruler toggle | Grid overlay and canvas-bound ruler gutters toggle without changing the exported asset. |
| Safe-area guide toggle | Safe-area and center guides follow the workspace frame during zoom/grab movement and do not appear in SVG, PNG, JSON, clipboard, or base64 output. |

## Export

| Case | Expected |
| --- | --- |
| Download SVG | Browser downloads a `.svg` file. |
| Download PNG with safe assets | Browser downloads a `.png` file. |
| Download PNG with blocked external image | Editor shows a clear export error and leaves SVG/JSON available. |
| Download readiness check | Check or the first download with actionable issues opens the named download-check panel, reports the current findings, selects/focuses fixable layers when chosen, closes without changing the document, and allows a repeated intentional export for the same issue signature. |
| Readiness panel visibility | Opening a download check after scrolling selected-layer properties or switching from Active Layers resets the properties drawer to the top so the heading and findings are immediately visible. |
| Download clean design | A design with readable text, action copy, safe placement, safe image sources, and QR values shows the clean readiness state before export. |
| Uploaded raster readiness | A magic-byte-validated PNG/JPEG/WebP/GIF data URL is treated as a safe local image source rather than a false readiness warning. |
| Export bundle | Bundle downloads client-side PNG variants for square, portrait, story/status, and flyer handoff sizes from the active workspace frame. |
| Stale export bundle | A document replacement or unmount invalidates pending resize completions before they trigger additional downloads. |
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
