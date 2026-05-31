# Answerlattice Staff Access Control Implementation

> Status: Implemented
> Last updated: 2026-05-26

## Main Code Paths

- `src/constants/answerlattice/permissions.ts` defines Answerlattice permission keys, labels, default roles, route-permission mapping, and role normalization.
- `src/lib/answerlattice/accessControl.ts` resolves the active Answerlattice access context from session, Answerlattice user doc, store doc, and `stores/{sId}.answerlatticeRoles`.
- `src/providers/answerlatticeAccessProvider.tsx` exposes the resolved access context to Answerlattice dashboard components.
- `src/components/answerlattice/AnswerlatticeDashboardLayout.tsx` blocks permission-mismatched routes and waits for Answerlattice Firebase Auth sync.
- `src/components/answerlattice/AnswerlatticeSidebar.tsx` hides nav entries that the current role cannot use.
- `src/components/templates/answerlattice/AnswerlatticeTeamAccess.tsx` renders members, role editing, activation/deactivation, password/passcode reset, force sign-out, and remove controls.
- `src/lib/answerlattice/staffAccessServer.ts` owns all staff and role mutations.
- `src/lib/answerlattice/staffAccessClient.ts` owns client fetch helpers for the Team Access page.
- `src/components/templates/main-app/users/StaffLoginDetailsContent.tsx` and `src/lib/staffManagement/shareLoginDetails.ts` are reused for Answerlattice owner-passcode sharing so the one-time passcode UX stays aligned with MenuList.

## API Routes

- `GET/POST/PATCH/DELETE /api/answerlattice/staff`
- `POST /api/answerlattice/staff/password-reset`
- `POST /api/answerlattice/staff/force-signout`
- `POST/PATCH/DELETE /api/answerlattice/staff/roles`
- `GET /api/answerlattice/access`

Existing Answerlattice APIs now call `requireAnswerlatticePermission()` for workspace profile, readiness, widget, hosted help, integrations, operations status, translation, FAQ generation, product-surface rebuilds, bundle rebuilds, notifications, and tenant-summary sync.

## Login Modes

- Email members receive a password setup email when first created.
- Owner reset creates a one-time temporary passcode and revokes active sessions for both email-backed and owner-passcode members, matching the MenuList staff model.
- Owner-passcode members receive an internal staff login id plus temporary passcode.
- Phone number, country code, dial code, staff login id, and auth mode follow the MenuList staff shape so reset and share flows behave consistently.
- Owner-triggered password/passcode resets and force sign-out revoke Firebase refresh tokens and refresh Answerlattice permission claims.
- Default auth users receive/refresh `productAccounts.AL` so NextAuth can resolve Answerlattice scope.
- Separate Answerlattice Firebase Auth receives Answerlattice permission custom claims for direct client DAL rules.
