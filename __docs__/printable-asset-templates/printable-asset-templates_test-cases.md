# Printable Asset Templates - Test Cases

## Automated Checks

| Check | Expected |
| --- | --- |
| `node scripts/verification/verify-printable-asset-templates.js` | Verifies 9 catalog families, asset-specific family filtering, required asset support, no hardcoded sample output text, QR safety constants, and nav route contract. |
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
| Asset rail | Print Menu, Table Tent, Single Table Card, Counter Sticker, Entrance Poster, Feedback QR, Complete Menu Kit appear. |
| Template count | QR/display assets show 9 template families; full Print Menu shows only the unique supported PDF layouts. |
| Preview | Template modal/sheet automatically shows a generated image preview using real store/logo/color/URL and no embedded PDF viewer. |
| Format actions | Single printable assets offer separate PDF and image downloads. Complete Menu Kit stays ZIP-only. |
| Download | File downloads with selected asset and template. |
| Compatibility | Old `/use-menulist/print-assets` does not break. |
| No reload | Use MenuList -> Assets -> Print Menu uses app navigation, not document reload. |

## Mobile QA

| Scenario | Expected |
| --- | --- |
| More tab | Assets opens inside MobileShell. |
| Share tab | Assets shortcut opens inside MobileShell. |
| Direct `/assets` | Maps into mobile shell state. |
| Back action | Returns to previous mobile screen without reload. |
| Template list | Compact touch-friendly grid/list, large touch targets, no text overlap. |
| Download | Same output as desktop for same inputs. |

## Output QA

| Scenario | Expected |
| --- | --- |
| Long store name | Text fits and does not overlap the tag or QR. |
| Store with logo | Logo renders inside template badge or defined logo position. |
| Store without logo | Initials render. |
| Bright brand color | Text remains readable through derived tokens. |
| Dark brand color | Accent remains readable and QR panel stays white. |
| Premium plan | Visible MenuList attribution is hidden when existing flag is enabled. |
| Non-premium plan | MenuList attribution is visible. |
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
- Non-banner templates do not place a colored header rectangle behind the logo badge.
- Full Print Menu does not show duplicate family choices that render to the same PDF style.
- Low-ink readability for `clean-utility`.
- Mobile template list uses one row per family with no two-column compression or text overlap at 360-390px widths.
- Template row/card click opens a bottom sheet on mobile and a modal on desktop; generated image preview and download actions happen there, not through a separate selected-template action bar.

## Regression Guards

- Do not hardcode `Habibis`, restaurant-only names, or fixed URLs in renderers.
- Do not tint QR modules with brand color by default.
- Do not add generated Storage uploads.
- Do not add Firestore writes for template actions.
- Do not add `window.location` navigation for owner shell print/download flows.
- Do not add a free-form template editor.
