# Printable Asset Templates - Test Cases

## Automated Checks

| Check | Expected |
| --- | --- |
| `node scripts/verification/verify-printable-asset-templates.js` | Verifies 9 catalog families, asset-specific family filtering, required asset support, no hardcoded sample output text, QR safety constants, nav route contract, and Creative Editor Template Registry integration. |
| `npm run verify:menu-card-export` | Existing print/menu export safeguards still pass. |
| Focused ESLint | New asset template library, desktop route, mobile shell screen, and touched generators pass. |
| TypeScript | `npx tsc --noEmit --incremental false` passes. |
| `git diff --check` | No whitespace errors. |

## Desktop QA

| Scenario | Expected |
| --- | --- |
| Nav item | `Assets` appears immediately after `Use MenuList`. |
| Route | `/assets` opens dedicated asset dashboard. |
| Project selector | Multiple projects can be selected before download, and URL/feedback/last modified metadata follow the selected project. |
| Asset rail | Print Menu, Table Tent, Single Table Card, Counter Sticker, Entrance Poster, Feedback QR, Flyer, Gift Certificate, Business Card, ID Card, Invitation, Postcard, Product Tag, Campaign Poster, and Complete Menu Kit appear. |
| Template count | Editor-backed QR/display/campaign assets show 9 template families; full Print Menu shows only the unique supported PDF layouts. |
| Preview | Template modal/sheet automatically shows a generated output preview using real store/logo/color/URL and no embedded PDF viewer. |
| Format actions | Single printable assets offer separate PDF and image downloads. Business Card image action downloads separate front and back PNG files. Complete Menu Kit stays ZIP-only. |
| Customize action | Table Tent, Single Card, Counter Sticker, Entrance Poster, Feedback QR, Flyer, Gift Certificate, Business Card, ID Card, Invitation, Postcard, Product Tag, and Campaign Poster show **Customize in editor** on desktop. Business Card opens front and back faces in one canvas and image export downloads both side images. Print Menu and Complete Menu Kit do not. |
| Customize editor | The fullscreen editor opens from the selected template, QR/link source layers are locked, editable copy can change, no MenuList attribution layer appears in the editor canvas, and Image/Print PDF download uses the latest edited document. |
| Business Card frame protection | Business Card generated structure layers show as protected/locked, cannot be unlocked, deleted, duplicated, copied, grouped, or dragged in Layers, and canvas size presets are disabled. |
| Business Card split safety | Moving editable front/back copy near or beyond the face boundary still exports front and back PNG files with each layer clamped into its assigned face. Newly added layers are assigned to the nearest face at export time; the side divider never appears in downloads. |
| Runtime attribution | Image/Print PDF output without branding-removal entitlement includes MenuList attribution added during render, while the saved editor document remains free of MenuList branding layers. |
| Save as template | The fullscreen editor exposes **Save as template** for supported non-menu assets and saves the current neutral document to Saved designs. |
| Saved designs | Saved templates appear above Ready templates for the same asset type and can reopen in the editor. |
| Rehydration | Opening a saved template after changing selected project refreshes QR/source values from the current project. |
| Delete saved template | Deleting a Saved designs card removes it from the list without affecting generated Ready templates. |
| Interrupted save | With Storage unavailable, Save as template remains visibly pending, Close editor is disabled, and a repeated Save produces the wait acknowledgement without a second DAL call. Restoring Storage completes exactly one template record/version. |
| Edited saved title | Changing the Creative Editor document title before Save as template persists that edited title rather than the original generated family title. |
| Delete confirmation accessibility | Saved design deletion exposes the complete visible destructive title as the dialog's accessible name; Cancel retains the design and confirmation removes only the selected disposable design. |
| Inspector action accessibility | Lock/protected, duplicate, delete, seven background-alignment actions, and every gradient-stop removal button resolve by purpose. Lock/unlock restores state, duplicate/delete returns to the prior layer count, and Close editor discards unsaved alignment changes. |
| Background control truth | No permanently checked read-only checkbox or no-op Color button is exposed. Color background renders as status, Add image layer opens Images, Solid/Gradient change mode, and preset/manual dimensions can be restored before Close. |
| Preview action reachability | At 1280 x 720, the generated preview, Download PDF, Download image, and Customize design actions are visible without page scrolling. |
| MenuList editor boundary | Customize design opens a body-level fixed fullscreen editor with only Background, Images, Text, Styles, and Brand Kit. CampaignCue defaults remain unchanged. |
| Safe editor entry | The full asset is fitted, the left drawer is collapsed, and no layer or protected print guide is selected when the editor opens. |
| Unsaved recovery | After an edit, Close exposes Keep editing and Discard changes; Keep editing preserves the exact document, Discard closes, and browser unload receives a warning. A pristine Close is immediate. |
| Readiness-gated product output | Print PDF and Image open the readiness panel on the first attempt with actionable issues and permit only the intentional unchanged-warning repeat. |
| Reusable-design hierarchy | Print PDF is the primary output action; Save reusable design remains visibly secondary and a successful save resets the dirty baseline. |
| Download | File downloads with selected asset and template. |
| Compatibility | Old `/use-menulist/print-assets` does not break. |
| No reload | Use MenuList -> Assets -> Print Menu uses app navigation, not document reload. |

## Mobile QA

| Scenario | Expected |
| --- | --- |
| More tab | `QR and print assets` opens Assets inside MobileShell. |
| Share tab | Assets shortcut opens inside MobileShell. |
| Direct `/assets` | Maps into mobile shell state. |
| Back action | Returns to previous mobile screen without reload. |
| Template list | Compact touch-friendly grid/list, large touch targets, no text overlap. |
| Download | Same output as desktop for same inputs. |
| Customization | Mobile does not expose drag/resize customization, but preview/download output still comes from the same editor-backed renderer. |

## Output QA

| Scenario | Expected |
| --- | --- |
| Long store name | Text fits and does not overlap the tag or QR. |
| Store with logo | Logo renders inside template badge or defined logo position. |
| Store without logo | Initials render. |
| Bright brand color | Text remains readable through derived tokens. |
| Dark brand color | Accent remains readable and QR panel stays white. |
| Multi-location plan | Visible MenuList attribution is hidden when existing flag is enabled. |
| Plan without branding removal | MenuList attribution is visible. |
| Restaurant business type | Uses menu copy. |
| Service business type | Uses service/list copy where supported. |
| Feedback disabled | Feedback QR is disabled with plain reason. |
| Missing public URL | Download disabled until URL is available. |

## Template Family QA

Every template family must be checked for:

- QR contrast.
- Quiet zone.
- Brand color use.
- Logo fallback.
- MenuList attribution placement.
- Long name fitting.
- Short link fitting.
- Print-safe margin.
- Business Card front/back frame assignment and split PNG output.
- Non-banner templates do not place a colored header rectangle behind the logo badge.
- Full Print Menu does not show duplicate family choices that render to the same PDF style.
- Low-ink readability for `clean-utility`.
- Mobile template list uses one row per family with no two-column compression or text overlap at 360-390px widths.
- Template row/card click opens a bottom sheet on mobile and a modal on desktop; preview and download actions happen there, not through a separate selected-template action bar.

## Regression Guards

- Do not hardcode `Habibis`, restaurant-only names, or fixed URLs in renderers.
- Do not tint QR modules with brand color by default.
- Do not add generated Storage uploads for preview/download.
- Do not add Firestore writes for generated template preview/download/open actions.
- Only explicit Saved designs save/delete can use the registry write path.
- Do not add `window.location` navigation for owner shell print/download flows.
- Do not add a blank free-form template editor; governed desktop customization must start from a generated print template.
- Generate a Complete Menu Kit from a deterministic local owner fixture and
  verify that its three raster-backed PDFs use compressed streams, the ZIP opens,
  and the expected eleven PDF/PNG/instruction entries remain present.
- Render every Counter Sticker family and fail when the call-to-action lower
  edge exceeds the live QR upper edge.
- Stop and restore the local Storage emulator around Save as template; verify
  one reserved ID, one recovered index record/version, the edited title, and
  zero residual index/Storage objects after deletion.
- Fail the Creative Editor smoke verifier if any inspector icon-only action
  loses its stable or state-aware accessible name.
- Fail the smoke verifier if the false Show background checkbox returns or the
  truthful Color background/Add image layer contract disappears.
