# Answerlattice Staff Access Control Mobile Support

> Status: Implemented
> Last updated: 2026-07-13

Answerlattice does not use the MenuList mobile owner app. The Team Access page is part of the Answerlattice dashboard shell and inherits the Answerlattice responsive layout, safe-area handling, mobile drawer navigation, touch target sizing, and App Appearance sheet.

## Mobile Treatments

- The `/answerlattice/team` page uses responsive Ant Design layout with card/list fallbacks.
- Member, role, refresh, and create actions enforce a 44 px minimum height on mobile while retaining compact desktop sizing.
- Modals use responsive widths and avoid nested fixed desktop surfaces.
- The Answerlattice dashboard layout keeps bottom safe-area padding through `env(safe-area-inset-bottom)`.
- MenuList mobile screens remain separate and are not imported by Answerlattice.
- Phone number entry and one-time owner-passcode sharing reuse the same MenuList staff helpers, but Answerlattice renders them inside its own dashboard page and passes `productName="Answerlattice"` for share text.
- A member mapped to multiple workspaces keeps the workspace-scoped Remove action. The account-global Activate/Deactivate action is disabled for workspace actors with guidance to remove current-workspace access instead; platform administrators retain the recovery control.
- Login reset and force sign-out are also disabled for multi-workspace identities unless the actor is a platform administrator because those actions affect the shared account across workspaces.
- Owner, Manager, and Support Staff are visibly locked on compact and desktop layouts; custom roles remain editable.

## Verification Notes

TypeScript verification covers the new route, APIs, provider, and client helpers. Browser proof should be repeated on a logged-in Answerlattice workspace because staff mutations require real Answerlattice Auth and Firestore credentials.
