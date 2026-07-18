# Roles & Permissions — Final Verification

**Feature:** Staff management and permissions
**Status:** Local source complete; release/operator evidence pending
**Last Updated:** July 16, 2026

---

## Final Review Scope

This verification covered the end-to-end staff and permissions flow from the current implementation:

- Staff list/create/update/remove APIs and desktop/mobile callers.
- Staff ID, owner-managed temporary passcode, phone alias, and email account support.
- Owner reset, force sign-out, inactive/deleted staff handling, and Firebase Auth disabled/revoked-token behavior.
- Staff self-service password/passcode change.
- Role create/edit/deactivate flow and mobile role detail edit sheet.
- Permission taxonomy, default role data, UI categories, labels, route guards, and mobile screen/tab filtering.
- Staff login detail copy, native share, and WhatsApp Web share actions.
- Manager-versus-Owner target authority across create, edit, reset, sign-out, deactivate, remove, desktop and MobileShell.
- Existing platform placeholder verification, Firebase Auth email collision refusal, same-user UID binding, and failed-commit compensation.
- Mutation commit ordering, default-role repair concurrency, tenant/store lifecycle session checks, and bounded response shape validation.

## July 16, 2026 Code-First Cross-Check

| Finding | Resolution |
| --- | --- |
| Default Manager had `canManageUsers` and could target an Owner account for edit, reset/passcode exposure, force-sign-out, deactivate, or remove. | Added shared Owner-target detection, fresh transaction rechecks, fixed 403 response, and desktop/mobile read-only actions unless the actor also has `canAssignRoles`. |
| Staff mutation flows revoked Firebase refresh tokens before the Firestore transaction; a rejected last-owner/concurrency action could still sign staff out. | Authoritative revocation metadata now commits first. Refresh-token revocation runs only after a successful commit and is observed as a bounded post-commit side effect. |
| Generic create-staff code adopted a pre-existing Firebase Auth email and could bind it to a new Firestore staff record. | Auth email collisions now fail closed as `EMAIL_EXISTS` or `STAFF_LOGIN_COLLISION`; no existing Auth UID is adopted. |
| Platform Users accepted `EMAIL_EXISTS` and generic same-store success as verification, then client-wrote `isVerified` without proving Auth creation. | Existing placeholders now return only `existing_user_auth_bound` after new Auth creation and a same-user transactional UID/mapping commit. Platform UI matches returned user ID, email, mode, and `isVerified`; collision is rejection. |
| Password setup email/network or audit-metadata failure after a committed staff account could return a false 500 and make a retry look like a failed create. | Provider wait is capped at 10 seconds and converted to a bounded email result; post-commit metadata failure is logged but cannot reverse successful account creation/verification. |
| Legacy default-role repair wrote `stores.roles` from a stale snapshot. | Repair now recomputes inside the existing role/access-state transaction, preserving concurrent edits. |
| Access-status handled user lifecycle/block/revocation state but did not fail closed for inactive/deleted tenant or store documents. | Added `TENANT_DELETED`, `TENANT_INACTIVE`, `STORE_DELETED`, and `STORE_INACTIVE` invalidation reasons. |
| Private active-assignment initialization could count an explicitly unverified Owner placeholder toward last-owner safety even though it cannot sign in. | Explicitly unverified users are excluded from active assignment state; the Auth-binding upsert activates the assignment atomically with `isVerified: true`. Emulator coverage proves an unverified placeholder cannot satisfy last-owner protection. |
| Staff/role client success checks accepted underspecified nested data. | List, store option, role definition, permission booleans, staff mappings, owner-protection, and mutation identity are validated before UI state changes. |
| Staff updates capped store mappings at 25 even though the existing multi-location contract allows one master plus 30 outlets; the master staff-list store query was unbounded. | Mapping admission now derives 31 from `MAX_OUTLETS_PER_TENANT + 1`. Tenant store discovery reads at most 32 active rows and fails closed on active overflow. Historical deactivated outlets are filtered by the query before the sentinel; the authorized target is merged back only for legacy rows missing `active`, under the same bound. |

---

## Fixes Applied During Final Review

| Area | Finding | Resolution |
| --- | --- | --- |
| Self-service password/passcode change | `/api/auth/change-password` used manual session lookup and inline validation instead of the protected route contract. | Route now uses `withAuth()`, Zod validation, `AUTH_SENSITIVE` rate limiting, secure logging, Firebase Auth current-password verification, Firebase Auth password update, and `passwordChangedAt` metadata write. |
| Mobile role edit sheet | Editing from role details could defer the edit sheet until the details screen closed. | Edit sheet is mounted in both list and details render branches. |
| Mobile permission switch | Tapping the switch row and the switch itself could double-toggle a permission. | Switch click propagation is stopped while row tap remains available. |
| WhatsApp Web sharing | `countryCode` was passed but not used when `dialCode` was absent. | WhatsApp phone formatting now falls back from country code to the shared country dial-code list before opening WhatsApp Web. |
| Firebase cost docs | Staff login sharing and self-service password change were not fully reflected in cost docs. | Firebase doc now lists client-only copy/share as zero reads/writes and self-service password change as one user metadata write plus Firebase Auth update. |

## May 27, 2026 UI Hardening Verification

| Area | Result |
| --- | --- |
| Users navigation | Passed: `Users` renders as a parent nav item with `Users List` and `Roles` children; `/users/list` and `/users/permissions` mark the correct child active. |
| User details drawer | Passed: clicking view opens the profile directly. Legacy left navigation and old sections such as dashboard, appointments, orders, commissions, employment, emergency contact, documents, and additional info are not present inside the drawer. |
| User edit drawer | Passed: edit opens one drawer after details closes. The drawer exposes only Staff Details, Store Access, and Permissions. |
| Add user drawer | Passed: add exposes the same current field set and the Staff ID/passcode creation hint. |
| Roles screen | Passed: role cards, role detail panel, owner role action locks, add custom role drawer, manager edit role drawer, and permission toggles render correctly. New custom roles start with all permissions off. |
| Light/dark mode | Passed: Users and Roles surfaces render in light mode; Roles page and role drawer render with dark theme token backgrounds after toggling dark mode, then the session was restored to light mode. |
| Data writes during UI QA | Not performed: create/update/deactivate buttons were not submitted against the connected Firebase store because role deletion is soft-deactivate and would leave test data behind. |

---

## Automated Verification

| Check | Result |
| --- | --- |
| Permission taxonomy smoke | Passed: 29 permissions; no missing constant categories, UI categories, initial keys, labels, or default-role keys. |
| Shared default role mirror | Passed: `src/data/shared/defaultRoles.ts` matches `functions/src/sharedData/defaultRoles.ts`. |
| Staff share helper smoke | Passed: `countryCode: "IN"` + local phone produces `919876543210`; WhatsApp Web URL includes `phone=919876543210`. |
| Staff/role API auth wrapper sweep | Passed: staff CRUD, staff password reset, force sign-out, role CRUD, access-status, and change-password routes are wrapped with `withAuth()`. |
| Access-status read gate | Passed by source verifier: `/api/auth/access-status` applies the shared `DATA_READ` gate before user/tenant/store reads and returns throttles without `valid: false`. |
| Staff client response boundary | Passed by source verifier: shared staff/role client responses are capped at 256KB, parse failures and invalid successful envelopes have bounded diagnostic codes, and direct `response.json().catch(() => ({}))` parsing is absent. |
| Staff mutation identity boundary | Passed by source verifier: create/update/remove/reset/sign-out acknowledgements require returned `user.id` to match returned `userId` before desktop or mobile staff state can advance. |
| Staff/Roles route parity source gate | Passed by source verifier: `npm run verify:staff-roles-route-parity` locks desktop aliases, mobile More permission gates, shared client usage, and docs/audit parity. |
| Staff scope/taxonomy source test | Passed: `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:staff-scope-boundary` covers exact scope normalization, 29 unique permissions, category/label/default-role completeness, and Owner-target helpers. Local Upstash warnings are expected when target credentials are intentionally absent. |
| Staff concurrency source gate | Passed: `npm run verify:staff-concurrency-boundary` locks deterministic creation, owner preservation, transactional role repair, Auth-binding upsert/compensation, and post-commit token ordering. |
| Staff concurrency emulator | Passed: `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:staff-concurrency:emulator` covers concurrent adds, Auth-binding upsert, deterministic create, last-owner races, blocked owners, role assignment/deactivation, and concurrent role edits. |
| Staff Prompt boundary | Passed: `npm run verify:staff-prompt-runtime` confirms the separate Today read-only staff summary has no generator/provider/write route. |
| Session and workspace role semantics | Passed: set-claims workspace, store-switch access, auth-session user, and auth-session response boundary tests preserve separate account-level `platformRole` and current-store `role` truth. |
| Sensitive log sweep for touched staff routes | Passed: no direct `console.error`, `console.log`, `secureLog`, or manual `getServerSession()` remains in `change-password` / staff API code paths. |
| Focused ESLint for changed staff/platform/API/verifier files | Passed. |
| `npx tsc --noEmit` | Passed. |
| `git diff --check` | Passed. |
| Production build | Not run. Repo policy prefers focused source/type/lint/emulator gates unless the owner explicitly requests a build/release. |

---

## Historical Live API-Level Smoke (May 2026)

The following earlier local smoke remains useful regression context but is not current target certification and was not rerun as July 16 hosted evidence.

Executed against `http://localhost:3000` using the configured Firebase project and owner credentials for tenant `14`, store `15`.

| Step | Result |
| --- | --- |
| Owner credential sign-in | Passed. |
| Staff list | Passed. |
| Create temporary staff with Staff ID, passcode, and phone alias | Passed. |
| Staff sign-in with Staff ID + passcode | Passed. |
| Staff self-service password/passcode change | Passed. |
| Owner passcode reset | Passed. |
| Existing staff session revoked after reset | Passed: `/api/auth/access-status` returned `valid: false`, `reason: "SESSION_REVOKED"`. |
| Staff sign-in with owner-reset passcode | Passed. |
| Owner force sign-out | Passed. |
| Staff session revoked after force sign-out | Passed: `/api/auth/access-status` returned `valid: false`, `reason: "SESSION_REVOKED"`. |
| Remove staff cleanup | Passed. Temporary staff account was removed/deactivated by the owner API. |

---

## Production Audit Notes

| Item | Status | Detail |
| --- | --- | --- |
| Auth and tenant isolation | Local source passed | Staff APIs validate active sessions, current tenant/store lifecycle, mapping scope, role authority, Owner-target authority, and last-owner preservation. |
| Session revocation | Local source passed | User revocation truth commits before post-commit Firebase token work; reset, sign-out, deactivate/remove, and platform block remain covered. Hosted multi-session behavior is pending. |
| Permission completeness | Passed | The 29-permission taxonomy is present across constants, UI categories, labels, initial data, and default roles. |
| Mobile parity | Passed by source/type gates | Mobile staff, roles, More screen, and shell filtering share desktop contracts. Hosted iOS/Android/PWA interaction remains pending. |
| Firebase cost | Passed with update | Docs now account for staff list/admin reads, rare writes, access-status reads while visible, and zero-cost copy/share actions. |
| Rate-limit environment | Owner/release action | Verify target `UPSTASH_REDIS_REST_URL` and token in the approved environment and exercise normal, exhausted, and provider-failure behavior. Local source tests intentionally run without target credentials. |

---

## Release Verdict

Item 8 is complete at the local source boundary: required code fixes, maintained docs, focused type/lint/source/emulator checks, desktop/mobile parity, and owner-task capture are complete.

This is not production certification. The approved app bundle must be released, target rate-limit/Firebase Auth behavior must be exercised, and the hosted owner/manager/staff/custom-role matrix must cover Owner-target refusal, self-service password change, last-owner races, session revocation, inactive/deleted tenant/store state, exact retries, collision refusal, desktop, and MobileShell. Those tasks remain pending in `__docs__/owner-action-items.md`.
