# Printable Asset Templates - Mobile Support

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
- Select asset type.
- Tap a template family from a one-column list.
- Open a bottom sheet with the preview already visible and PDF/image download actions for the tapped template.
- Download Print Menu from the same renderer; the separate Print Menu screen remains in shell for the deeper export workflow.
- Use the same editor-backed renderer as desktop for non-menu printable previews and downloads.

Excluded:

- Desktop-style multi-column template gallery.
- Free-form design editing and drag/resize customization.
- Drag/move/resize controls.
- Forced route navigation to desktop pages.

## Shell Contract

Owner mobile PWA screens reached from Today, Menu, Share, or More must stay inside `MobileShell`.

Implementation rules:

- Reuse the existing `printAssets` sub-screen in `MobileShell`.
- Map direct `/assets` links into shell state.
- Keep `/use-menulist/print-assets` mapped during compatibility.
- More/Share buttons use callbacks/state, not `window.location`.
- Reuse `MobileProjectsProvider` and existing Share/Print Assets data handlers.

Current evidence:

- Route map lives in `src/components/mobile/MobileShell.tsx:36`.
- `/assets` maps to More -> `printAssets` in `src/components/mobile/MobileShell.tsx:42`.
- More entry is named `QR and print assets` in `src/components/mobile/screens/MobileMoreScreen.tsx`.
- Mobile Assets mode lives inside `MobileShareScreen` at `src/components/mobile/screens/MobileShareScreen.tsx:871`.

## Mobile Layout

```text
NavBar: Assets
Project selector
Asset type cards
Suggested style
Template family rows
Template action bottom sheet with immediate preview
```

Touch rules:

- Minimum 44px tap targets.
- One template family per row on mobile.
- Each template row keeps a fixed preview thumbnail on the left and readable copy on the right.
- The full row opens the bottom sheet; there is no separate selected-template path.
- Preview is automatic inside the bottom sheet and uses the same generated output path as desktop. Non-menu printable assets use the Creative Editor document renderer; Print Menu uses the generated menu PDF first-page image preview.
- No tiny icon-only controls without labels.
- No text overlap on compact phones.
- Download progress and failure state must be visible.

## Data Parity

Mobile and desktop must call the same:

- asset type registry
- template family registry
- render adapter
- Menu Kit generation path
- Print Menu generation path
- branding policy
- locked QR/link source rules for editor-backed print documents, with MenuList attribution applied only during output rendering when policy requires it

If desktop and mobile pass the same `assetTypeId`, `templateFamilyId`, and project/store input, the downloaded file must match.

## Verification

| Check | Expected |
| --- | --- |
| Open `/assets` on mobile route | Maps into MobileShell Assets screen. |
| More tab -> Assets | No full page reload. |
| Share tab -> Assets | No desktop route jump. |
| Assets -> Print Menu | Generates the Print Menu output from the same renderer. |
| Template row tap | Opens bottom sheet, shows the preview in-shell, and passes that template family to the renderer. |
| Multiple projects | Project selector controls generated output. |
