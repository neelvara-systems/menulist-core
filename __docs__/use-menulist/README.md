# Use MenuList - Output Center

**Status:** Implemented
**Feature Flag:** `ENABLE_USE_MENULIST`
**Route:** `/use-menulist` and `/use-menulist/print-assets`
**Mobile:** Mobile Share / Print Assets inside `MobileShell`
**Last Updated:** June 11, 2026

## What It Is

Use MenuList is the owner output hub. It gathers durable outputs that help a business use its public menu: official business link, direct menu link, QR downloads, digital screen links, feedback link/QR, Menu Kit, print assets, and print/export route entries.

It is not a settings page and does not create campaigns or promotional workflows.

## Runtime Contract

- Adds no new backend service and no new collection.
- Reads existing store context from the platform provider.
- Reads existing project summaries with `getExistingProjectsListWithoutLoader()`, so loading this page does not create a default project.
- Reads screen state with `getScreenState()` when building screen links.
- Generates QR/Menu Kit/print assets locally in the browser unless the owner opens a routed child workflow.
- Records starter activation signals only when the existing onboarding/starter-activation policy allows it.

## Key Files

| File | Purpose |
| --- | --- |
| `src/app/(main)/use-menulist/page.tsx` | Desktop route wrapper. |
| `src/app/(main)/use-menulist/print-assets/page.tsx` | Focused print-assets route. |
| `src/components/templates/main-app/useMenuList/index.tsx` | Desktop output hub implementation. |
| `src/components/templates/main-app/useMenuList/types.ts` | Output hub types. |
| `src/components/mobile/screens/MobileShareScreen.tsx` | Mobile output hub. |
| `src/database/projects/index.ts` | Existing-project project-summary read model. |
| `src/database/campaigns/index.ts` | Screen-state read model. |

## Related Child Features

| Feature | Boundary |
| --- | --- |
| Menu Card Export | Owns print-menu preview/history/API/storage cost. |
| Printable Asset Templates | Owns focused print template UX. |
| Digital Screens | Owns screen tokens, display route, and screen content refresh. |
| Customer feedback/reviews | Owns feedback submission and analytics. |
| Menu Kit / print assets | Browser-generated assets reused by desktop and mobile. |

## Documents

| Doc | Purpose |
| --- | --- |
| `use-menulist_spec.md` | Product/runtime requirements. |
| `use-menulist_impl.md` | Implementation details. |
| `use-menulist_firebase.md` | Firestore reads/writes and cost notes. |
| `use-menulist_mobile-support.md` | Mobile parity contract. |
| `use-menulist_helpdoc.md` | Owner-facing help. |
| `use-menulist_marketing.md` | Sales/support wording. |
| `use-menulist_website.md` | Website/content-layer notes. |
