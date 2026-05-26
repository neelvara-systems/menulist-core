# Canonica Staff Access Control Implementation

> Status: Implemented
> Last updated: 2026-05-26

## Main Code Paths

- `src/constants/canonica/permissions.ts` defines Canonica permission keys, labels, default roles, route-permission mapping, and role normalization.
- `src/lib/canonica/accessControl.ts` resolves the active Canonica access context from session, Canonica user doc, store doc, and `stores/{sId}.canonicaRoles`.
- `src/providers/canonicaAccessProvider.tsx` exposes the resolved access context to Canonica dashboard components.
- `src/components/canonica/CanonicaDashboardLayout.tsx` blocks permission-mismatched routes and waits for Canonica Firebase Auth sync.
- `src/components/canonica/CanonicaSidebar.tsx` hides nav entries that the current role cannot use.
- `src/components/templates/canonica/CanonicaTeamAccess.tsx` renders members, role editing, activation/deactivation, password/passcode reset, force sign-out, and remove controls.
- `src/lib/canonica/staffAccessServer.ts` owns all staff and role mutations.
- `src/lib/canonica/staffAccessClient.ts` owns client fetch helpers for the Team Access page.
- `src/components/templates/main-app/users/StaffLoginDetailsContent.tsx` and `src/lib/staffManagement/shareLoginDetails.ts` are reused for Canonica owner-passcode sharing so the one-time passcode UX stays aligned with MenuList.

## API Routes

- `GET/POST/PATCH/DELETE /api/canonica/staff`
- `POST /api/canonica/staff/password-reset`
- `POST /api/canonica/staff/force-signout`
- `POST/PATCH/DELETE /api/canonica/staff/roles`
- `GET /api/canonica/access`

Existing Canonica APIs now call `requireCanonicaPermission()` for workspace profile, readiness, widget, hosted help, integrations, operations status, translation, FAQ generation, product-surface rebuilds, bundle rebuilds, notifications, and tenant-summary sync.

## Login Modes

- Email members receive a password setup email when first created.
- Owner reset creates a one-time temporary passcode and revokes active sessions for both email-backed and owner-passcode members, matching the MenuList staff model.
- Owner-passcode members receive an internal staff login id plus temporary passcode.
- Phone number, country code, dial code, staff login id, and auth mode follow the MenuList staff shape so reset and share flows behave consistently.
- Owner-triggered password/passcode resets and force sign-out revoke Firebase refresh tokens and refresh Canonica permission claims.
- Default auth users receive/refresh `productAccounts.CN` so NextAuth can resolve Canonica scope.
- Separate Canonica Firebase Auth receives Canonica permission custom claims for direct client DAL rules.
