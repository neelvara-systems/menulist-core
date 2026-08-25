# Use MenuList - Technical Implementation

**Version:** 1.6
**Feature Flag:** `ENABLE_USE_MENULIST`
**Last Updated:** June 29, 2026

## Architecture

Use MenuList is a client-side output aggregation surface. It does not own new backend logic or collections. It reads bounded existing state and delegates deeper workflows to their feature routes.

Runtime data flow:

```text
UseMenuList
  -> PlatformGlobalDataContext for store, tenant, plan, master-owner state
  -> settle paid/starter workspace access before any output read
  -> getExistingProjectsListWithoutLoader(true) for project summaries
  -> generateOBPUrl(), generateProjectUrl(), getFeedbackUrl() for links
  -> getScreenState() for screen token / last-seen state
  -> browser generators for QR/Menu Kit/print assets
  -> Menu Card Export / Printable Assets routes for focused print workflows
  -> getProjectData() only on PDF fallback/export tap when full data is required
```

Project-specific share, QR, print, Menu Kit, and PDF links must use the store's public address and the shared `generateProjectUrl()` helper. A missing public address is a not-ready state for customer-facing share assets; do not fall back to `/menu/{slug}` or platform-root URLs.

## Empty State

If no existing project summary is returned, the page shows the `no_menu` state with a create-menu CTA. It must not auto-create a default project. Default creation belongs to menu-management entry points, not output surfaces.

Desktop first waits for `activeSubscriptionLoading` to settle. It admits the
summary read only when `hasValidSubscriptionAccess(activeSubscription)` or
`hasStarterWorkspaceAccess(storeDetails, hasPaidAccess)` is true. Otherwise it
renders the shared `NoSubscriptionView`. This matches Projects and MobileShell,
preserves starter-workspace access, and prevents an authorization failure from
being mislabeled as a missing menu.

The `PageState` type still contains `not_published`, but the current runtime does not branch on a separate unpublished page state. The page can load when at least one non-deleted, active project exists; within that ready surface, header and placement readiness copy must derive from `hasPublishedMenuProject()` so an empty or draft-only project never claims it is live.

## Output Data Contract

`UseMenuListData` includes:

- OBP link
- selected direct project link
- optional customer app install link
- feedback link and QR link
- screen token, menu-board link, highlights link
- store name/logo/subdomain/custom domain/business type
- selected project ID/name/default flag/modified date
- all project links for project switching
- POS status when enabled
- published/menu/screen/feedback flags

## Desktop Components

The current implementation is concentrated in `src/components/templates/main-app/useMenuList/index.tsx`. The earlier split-file plan (`QuickActions`, `ShareSection`, `ScreensSection`, `PrintSection`, `ResourcesSection`) is not the active runtime structure.

Desktop renders:

- quick action buttons
- project selector for multi-project stores
- official business link and direct project link cards
- Store Menu, Business Profile, Project Menu, and outlet-scoped QR downloads
- Digital Screens links with independent exact-version Menu Board/Highlights
  status, owner-triggered status refresh, and bounded read/refresh diagnostics
- Menu Kit and print asset downloads
- Print Assets focused route
- Print Menu / Menu Card Export route entry
- feedback QR when enabled
- POS summary when enabled
- customer communication kit when enabled, including bounded copy/share/handoff failure diagnostics
- Menu Presence Monitor when enabled, including bounded official-link copy, confirm, and remove failure diagnostics

## Mobile Parity

Mobile output actions live in `src/components/mobile/screens/MobileShareScreen.tsx` and route through the `MobileShell` state contract. Mobile uses shared link, QR, Menu Kit, print, export, and presence-monitor primitives instead of mobile-only renderers.

`/use-menulist/print-assets` maps handheld devices into the mobile shell print-assets sub-screen.

## Firebase Boundary

- Project summary read: `getExistingProjectsListWithoutLoader(true)`, no writes.
- Screen state read: `getScreenState()`, one summary-doc read.
- Asset generation: browser-local unless a child workflow is opened.
- Starter activation signal writes: existing onboarding/store signal contract only, not hub-owned data.

## Diagnostics

Desktop Use MenuList failure diagnostics go through `src/components/templates/main-app/useMenuList/useMenuListDiagnostics.ts`. Mobile Share, the shared mobile QR sheet, and the mobile Communication Kit use `src/components/mobile/utils/mobileOwnerDiagnostics.ts` for mobile output failure diagnostics.

Bounded diagnostics cover:

- output hub data-load failures
- desktop screen-link load failures through `use_menulist_screen_links_load_failed`
- desktop screen-status refresh failures through `use_menulist_screen_status_refresh_failed`
- starter activation signal write failures
- desktop page-level output copy failures through `use_menulist_copy_failed`; copied feedback and copy-driven starter activation signals wait for Clipboard API or acknowledged textarea fallback success
- desktop direct public-output open failures through `use_menulist_open_failed`; selected menu, Menu Board, and Highlights opens use `noopener,noreferrer`
- desktop share-card copy, copy-message, WhatsApp handoff, and direct-open failures through `share_link_card_copy_failed`, `share_link_card_copy_message_failed`, `share_link_card_whatsapp_open_failed`, and `share_link_card_open_failed`; copy success waits for Clipboard API or acknowledged textarea fallback success, and WhatsApp/direct opens use `noopener,noreferrer`
- desktop Communication Kit copy and WhatsApp handoff failures through `use_menulist_communication_kit_copy_failed` and `use_menulist_communication_kit_whatsapp_open_failed`; rejected Clipboard API writes retry the acknowledged fallback before copied feedback; WhatsApp opens use `noopener,noreferrer`
- desktop Menu Presence official-link copy, external guide-open, and surface confirm/remove failures through `use_menulist_presence_official_link_copy_failed`, `use_menulist_presence_external_open_failed`, `use_menulist_presence_confirm_failed`, and `use_menulist_presence_remove_failed`; official-link copy success waits for Clipboard API or acknowledged textarea fallback success, and external opens use `noopener,noreferrer`
- clipboard copy failures with clipboard/fallback support metadata only
- Menu Kit ZIP and single-asset generation failures
- asset preview failures
- QR download failures
- PDF fallback generation failures
- feedback QR generation failures
- mobile shared QR generation, clipboard copy, and download setup failures through `mobile_qr_sheet_generate_failed`, `mobile_qr_sheet_copy_failed`, and `mobile_qr_sheet_download_failed`
- mobile Share page-level output copy failures through `mobile_share_copy_failed`; copied feedback and copy-driven starter activation signals wait for Clipboard API or acknowledged textarea fallback success
- mobile Presence Monitor official-link copy, external guide-open, and surface confirm/remove failures through `mobile_presence_official_link_copy_failed`, `mobile_presence_external_open_failed`, `mobile_presence_confirm_failed`, and `mobile_presence_remove_failed`; official-link copy success waits for Clipboard API or acknowledged textarea fallback success, and external opens use `noopener,noreferrer`
- mobile Communication Kit copy, native share, and WhatsApp handoff failures through `mobile_communication_kit_copy_failed`, `mobile_communication_kit_native_share_failed`, and `mobile_communication_kit_whatsapp_open_failed`; WhatsApp opens use `noopener,noreferrer`

The diagnostics record normalized `use_menulist_*`, `mobile_presence_*`, `mobile_qr_sheet_*`, `mobile_share_*`, and `mobile_communication_kit_*` failure codes with bounded store/project/link/action/source/surface/template/message/open-URL presence and length metadata, booleans, counts, generated-image presence/length, starter-signal booleans, and source error name/code/status only. They must not log raw public URLs, external platform URLs, QR payloads, store records, project documents, owner-entered names, surface labels, generated customer messages, generated data URLs, generated file bodies, or provider/browser error objects.

June 29 direct-open hardening: `src/components/templates/main-app/useMenuList/index.tsx` now logs blocked selected-menu, Menu Board, and Highlights opens as `use_menulist_open_failed` with bounded output context plus URL/label presence-length metadata only. These opens use `noopener,noreferrer` and keep the owner on the page when the browser blocks a popup.

## Performance

- Keep page load bounded to existing summary docs.
- Do not pre-generate assets.
- Generate Menu Kit, QR cards, and PDFs only after owner action.
- Do not read full project data unless the selected action requires full item/category data.
