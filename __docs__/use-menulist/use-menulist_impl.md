# Use MenuList - Technical Implementation

**Version:** 1.3
**Feature Flag:** `ENABLE_USE_MENULIST`
**Last Updated:** June 11, 2026

## Architecture

Use MenuList is a client-side output aggregation surface. It does not own new backend logic or collections. It reads bounded existing state and delegates deeper workflows to their feature routes.

Runtime data flow:

```text
UseMenuList
  -> PlatformGlobalDataContext for store, tenant, plan, master-owner state
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

The `PageState` type still contains `not_published`, but the current runtime does not branch on a separate unpublished state. The current readiness check is based on whether at least one non-deleted, active project exists.

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
- Digital Screens links
- Menu Kit and print asset downloads
- Print Assets focused route
- Print Menu / Menu Card Export route entry
- feedback QR when enabled
- POS summary when enabled
- customer communication kit when enabled

## Mobile Parity

Mobile output actions live in `src/components/mobile/screens/MobileShareScreen.tsx` and route through the `MobileShell` state contract. Mobile uses shared link, QR, Menu Kit, print, and export primitives instead of mobile-only renderers.

`/use-menulist/print-assets` maps handheld devices into the mobile shell print-assets sub-screen.

## Firebase Boundary

- Project summary read: `getExistingProjectsListWithoutLoader(true)`, no writes.
- Screen state read: `getScreenState()`, one summary-doc read.
- Asset generation: browser-local unless a child workflow is opened.
- Starter activation signal writes: existing onboarding/store signal contract only, not hub-owned data.

## Performance

- Keep page load bounded to existing summary docs.
- Do not pre-generate assets.
- Generate Menu Kit, QR cards, and PDFs only after owner action.
- Do not read full project data unless the selected action requires full item/category data.
