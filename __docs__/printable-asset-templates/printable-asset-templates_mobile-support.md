# Printable Asset Templates - Mobile Support

> **Last Updated:** September 4, 2026

MobileShell already enforces active plan admission before the printable-assets
screen is mounted. Desktop now applies the same check before its project-summary
read, so both surfaces show honest plan state for an unsubscribed owner instead
of a false missing-menu state.

## Mobile Relevance Decision

**Decision:** Partial mobile support is required.

Owners may need to download or share a table card, counter file, poster, flyer, gift certificate, front/back business card, ID card, invitation, postcard, or tag from a phone. The full side-by-side desktop catalog is not mobile-friendly, but a focused mobile version is valuable.

## Feature Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Owners may need files during setup, print shop handoff, or while standing inside the business. |
| Speed | Pass | Asset selection and download should complete quickly after the menu data is already loaded. |
| Touch | Pass with mobile-specific UI | Mobile must use large chips/cards, not desktop grid controls. |
| Value | Pass | Owners often handle print/WhatsApp/file handoff from mobile. |

## Mobile Scope

Included:

- Open Assets from More tab.
- Open Assets from Share tab shortcut if present.
- Select project using existing mobile project selector.
- Browse a focused horizontally scrollable set containing the current and business-recommended Asset Theme cards, tap a non-current card to inspect it or tap the pending card again to restore the current look, and inspect a coordinated six-asset bento before applying it to the current menu or every menu.
- Use **View all themes** to reveal the same 34 common themes as desktop, ordered by canonical business relevance, plus all five restaurant/food themes for canonical food businesses and any admitted exact coffee/bakery/ice-cream/salon/spa/fitness family; **Show recommended** returns to the focused set.
- Select asset type.
- Tap a template family from a one-column list.
- Open a bottom sheet with the preview already visible and PDF/image download actions for the tapped template.
- Share or save a generated single PDF/image through the native mobile share sheet when supported, with a browser download fallback. Business Card front/back images are packaged into one ZIP before share or download.
- For Flyer, enter bounded campaign headline, offer, details, validity, and terms in the same bottom sheet, then explicitly refresh the preview. Empty headline keeps the truthful brand-flyer fallback. The draft remains browser-local to the open screen and creates no separate mobile persistence path.
- For Gift Certificate, optionally enter recipient, sender, personal message, value, valid-until, and certificate number in the same bottom sheet. Empty fields remain available for handwriting after printing.
- For Invitation, optionally enter occasion, date, time, and location in the same bottom sheet. Empty fields retain the approved physical write-in lines.
- For Staff Name Badge, choose one active current-store staff member in the bottom sheet before preview or download. The shared staff DAL and admission boundary match desktop; the selector is visible only with staff-management access and never exposes contact/login details.
- Gift Certificate and Invitation drafts are reset when the selected project changes, remain browser-local, and flow through the same input admission and renderer as desktop. No sample content, reply request, redemption claim, QR destination change, or separate persistence path is generated.
- Browse every available style inside the open bottom sheet using horizontal swipe or visible Previous/Next controls, without closing and reopening template rows.
- Show a visible unapplied-changes state for runtime fields. Download/Share first refresh the exact current preview, fail closed when preview generation fails, and expose Retry. All competing controls and sheet dismissal remain locked during preview or output work.
- Save a theme as **Business theme** or **Menu theme**, with optimistic feedback and rollback on failure.
- Choose one **Business theme** or **Menu theme** and see it inherited by every asset.
- See truthful `Recommended`, `Business theme`, or `Menu theme` badges.
- Download Print Menu from the same renderer; the separate Print Menu screen remains in shell for the deeper export workflow.
- Use the same editor-backed renderer as desktop for non-menu printable previews and downloads.
- See the shared business-profile readiness card before choosing an asset. Authorized owners can update canonical business identity/contact fields in an in-shell sheet, with the same validation, logo preparation, permission boundary, discard protection, and save semantics as desktop.
- Rebuild the open preview immediately after a successful profile save so mobile never requires a route change or Settings detour.

Excluded:

- Desktop-style multi-column template gallery.
- Free-form design editing and drag/resize customization.
- Drag/move/resize controls.
- Forced route navigation to desktop pages.

The MenuList embedded Fabric editor is intentionally not mounted on mobile. Mobile keeps the faster template preview and PDF/image download flow, using the same document renderer and protected-layer output rules as desktop. Desktop-only recovery drafts, layer tools, and dirty-editor confirmation therefore do not create a second mobile state model.

## Shell Contract

Owner mobile PWA screens reached from Today, Menu, Share, or More must stay inside `MobileShell`.

Implementation rules:

- Reuse the existing `printAssets` sub-screen in `MobileShell`.
- Map direct `/assets` links into shell state.
- Keep `/use-menulist/print-assets` mapped during compatibility.
- More/Share buttons use callbacks/state, not `window.location`.
- Reuse `MobileProjectsProvider` and existing Share/Print Assets data handlers.
- Keep the Today `print_poster` action inside `MobileShell`: it opens the same selected-theme Campaign Poster preview/edit/download modal as desktop, resolves the item name and optional description from the already loaded selected project without another Firestore read, and records the campaign handled only after download.
- In the existing mobile Featured-choices sheet, show a download action only when that row has a saved explicit pin that is still active and available. Saving this sheet uses the existing explicit project-persistence path and keeps the sheet open so the newly saved poster action becomes available without a close/reopen loop. It opens the shared Campaign Poster preview/editor/download modal, uses the existing business-aware choice label and exact-item link, and inherits the selected project theme. Automatic and unsaved choices cannot emit static posters. Hide the underlying sheet while the poster modal is open and restore it on close.

Current evidence:

- Route map lives in `src/components/mobile/MobileShell.tsx:36`.
- `/assets` maps to More -> `printAssets` in `src/components/mobile/MobileShell.tsx:42`.
- More entry is named `QR and print assets` in `src/components/mobile/screens/MobileMoreScreen.tsx`.
- Mobile Assets mode lives inside `MobileShareScreen` at `src/components/mobile/screens/MobileShareScreen.tsx:871`.

## Mobile Layout

```text
NavBar: Assets
Project selector
Business-profile readiness and inline edit sheet
Horizontal Asset Theme picker
Six-asset bento for current or pending theme
Explicit Apply to this menu / Apply to all menus actions
Asset type cards
Suggested style
Template family rows
Template action bottom sheet with immediate preview
```

Touch rules:

- Minimum 44px tap targets.
- Theme-card taps update preview state only. Current stays green, a pending selection stays light blue, and applying requires a separate 44px action.
- The mobile bento uses the same governed representative assets as desktop: Print Menu, Table Tent, Feedback QR, Entrance Poster, Gift Certificate, and Business Card.
- One template family per row on mobile.
- Each template row keeps a fixed preview thumbnail on the left and readable copy on the right.
- The full row opens the bottom sheet; there is no separate selected-template path.
- Preview is automatic inside the bottom sheet and uses the same generated output path as desktop. Non-menu printable assets use the Creative Editor document renderer; Print Menu uses the generated menu PDF first-page image preview.
- When more than one style exists, the preview exposes 44px Previous/Next controls, an announced position such as `2 of 5`, and a horizontal swipe gesture. Vertical sheet scrolling remains available, swipe requires a deliberate horizontal movement, and navigation stops at the first and last style.
- No tiny icon-only controls without labels.
- No text overlap on compact phones.
- Download progress and failure state must be visible.
- Preview failure must keep download/share unavailable and expose a labelled Retry action.
- Native Share/Save actions must use the same current input and renderer as download; multi-file image results must become one ZIP.
- Default actions stay at least 44px high and do not require a separate settings screen.

## Data Parity

Mobile and desktop must call the same:

- asset type registry
- template family registry
- render adapter
- Menu Kit generation path
- Print Menu generation path
- branding policy
- locked QR/link source rules for editor-backed print documents, with MenuList attribution applied only during output rendering when policy requires it
- shared default resolver and store-level persistence DAL
- shared canonical-category and exact-business-type visibility resolver and save validation

If desktop and mobile pass the same `assetTypeId`, `templateFamilyId`, and project/store input, the downloaded file must match.

## Verification

| Check | Expected |
| --- | --- |
| Open `/assets` on mobile route | Maps into MobileShell Assets screen. |
| More tab -> Assets | No full page reload. |
| Share tab -> Assets | No desktop route jump. |
| Assets -> Print Menu | Generates the Print Menu output from the same renderer. |
| Assets -> Print Menu -> Back | Returns to Assets first; Print Menu opened from Share still returns to Share. |
| Template row tap | Opens bottom sheet, shows the preview in-shell, and passes that template family to the renderer. |
| Runtime draft changed | Status announces unapplied changes; Update preview clears it. Download/Share also refreshes the current draft before creating the output. |
| Preview failure | Download and Share remain unavailable until Retry succeeds. |
| Operation in progress | Close, swipe/navigation, inputs, download, and share do not start a second operation or dismiss the sheet. |
| Mobile Share/Save | Single PDF/image opens the native share sheet; Business Card images share one ZIP; unsupported native sharing falls back to download. |
| Open preview navigation | Previous/Next and horizontal swipe move through the ordered styles without closing the sheet; the counter and preview update together. |
| Swipe versus scroll | Vertical movement keeps scrolling the sheet; only a deliberate horizontal swipe changes style. |
| First and last style | Previous is disabled on the first style and Next is disabled on the last style. |
| Multiple projects | Project selector controls generated output. |
| Business visibility | Thirty-four common themes remain universal; five food-category and eight exact-type families appear only for their canonical contexts. Salon/Makeup Studio and Spa/Spa Resort each receive five recommended light directions. Unknown legacy types receive the same common catalog. |
| Stale saved theme | A now-ineligible menu/business theme is skipped without being deleted, and mobile immediately shows the eligible next layer. |
| Inspect theme | Tapping a non-current theme changes all six bento previews without writing preferences; tapping the pending card again restores the current look, while tapping the already-current card is a no-op. |
| Theme discovery | Initial rail contains the current and recommended families; View all themes expands the eligible catalog and Show recommended restores the focused set. |
| Save business theme | All assets inherit the theme across devices. |
| Save menu theme | Only the selected menu changes; other menus continue inheriting the business theme. |
| Clear menu theme | The menu immediately returns to the business theme or recommended fallback. |
| Complete Menu Kit | Shows one `Your asset set` action, not a false style carousel, and carries one resolved parent theme across every included file. |
