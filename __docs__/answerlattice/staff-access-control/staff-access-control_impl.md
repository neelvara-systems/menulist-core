# Answerlattice Staff Access Control Implementation

> Status: Implemented
> Last updated: 2026-06-30

## Main Code Paths

- `src/constants/answerlattice/permissions.ts` defines Answerlattice permission keys, labels, default roles, route-permission mapping, and role normalization.
- `src/lib/answerlattice/accessControl.ts` resolves the active Answerlattice access context from session, Answerlattice user doc, store doc, and `stores/{sId}.answerlatticeRoles`.
- `src/providers/answerlatticeAccessProvider.tsx` exposes the resolved access context to Answerlattice dashboard components. It loads `/api/answerlattice/access` with no-store cache, same-origin credentials, and manual redirect handling, then requires a 64 KB bounded `{ access }` response with a valid permission context before dashboard state updates.
- `src/components/answerlattice/AnswerlatticeDashboardLayout.tsx` blocks permission-mismatched routes and waits for Answerlattice Firebase Auth sync. Sync failures use bounded `answerlattice_dashboard_firebase_auth_sync_failed` diagnostics instead of raw browser console errors.
- `src/components/answerlattice/AnswerlatticeSidebar.tsx` hides nav entries that the current role cannot use.
- `src/components/templates/answerlattice/AnswerlatticeTeamAccess.tsx` renders members, role editing, activation/deactivation, password/passcode reset, force sign-out, and remove controls. Failed load/member/role actions use fixed local dashboard copy instead of raw staff API or browser exception text.
- `src/lib/answerlattice/staffAccessServer.ts` owns all staff and role mutations. Staff/team action rate-limit keys hash the actor or request-IP segment through the shared Answerlattice limiter-key helper before calling Upstash, so raw staff user IDs and request IPs are not stored in provider key names.
- Staff/team JSON mutation bodies are capped at 16KB through `readBoundedJsonBody()` before the existing Zod schemas run. Malformed or oversized staff mutation bodies fail before JSON parsing can allocate unbounded request payloads.
- `src/lib/answerlattice/staffAccessClient.ts` owns client fetch helpers for the Team Access page. Staff list, staff mutation, password reset, force sign-out, and role mutation browser calls use no-store cache, same-origin credentials, and manual redirect handling before response parsing. Failed staff API responses keep the route status/code for policy handling but throw fixed local copy instead of raw route response text. Staff list, staff mutation, and role mutation responses are parsed through a 64 KB bounded response reader and must match the expected response shape before Team Access callers continue.
- `src/components/templates/main-app/users/StaffLoginDetailsContent.tsx` and `src/lib/staffManagement/shareLoginDetails.ts` are reused for Answerlattice owner-passcode sharing so the one-time passcode UX stays aligned with MenuList.

## API Routes

- `GET/POST/PATCH/DELETE /api/answerlattice/staff`
- `POST /api/answerlattice/staff/password-reset`
- `POST /api/answerlattice/staff/force-signout`
- `POST/PATCH/DELETE /api/answerlattice/staff/roles`
- `GET /api/answerlattice/access`

Existing Answerlattice APIs now call `requireAnswerlatticePermission()` for workspace profile, readiness, widget, hosted help, integrations, operations status, translation, FAQ generation, product-surface rebuilds, bundle rebuilds, notifications, and non-platform tenant-summary sync.

## Login Modes

- Email members receive a password setup email when first created.
- Password setup email calls use the fixed Firebase Auth `sendOobCode` host/path, encode the local API key with `URLSearchParams`, reject malformed local API keys before contacting Firebase Auth, and use manual redirect handling plus a timeout for the provider request.
- Password reset email provider failures, timeouts, and rejected responses log bounded `answerlattice_staff_password_reset_provider_*` diagnostics and return the fixed `password_reset_email_failed` response marker; Firebase Auth provider text is not retained for UI reuse.
- Owner reset creates a one-time temporary passcode and revokes active sessions for both email-backed and owner-passcode members, matching the MenuList staff model.
- Owner-passcode members receive an internal staff login id plus temporary passcode.
- Phone number, country code, dial code, staff login id, and auth mode follow the MenuList staff shape so reset and share flows behave consistently.
- Owner-triggered password/passcode resets and force sign-out revoke Firebase refresh tokens and refresh Answerlattice permission claims.
- Self-removal and last-owner guards use coded local policy errors before returning fixed client messages; they do not branch on raw exception text.
- Default auth users receive/refresh `productAccounts.AL` so NextAuth can resolve Answerlattice scope.
- Separate Answerlattice Firebase Auth receives Answerlattice permission custom claims for direct client DAL rules.
