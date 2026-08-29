# Roles & Permissions — Mobile Support

**Last Updated:** August 27, 2026 (v13 - mobile lifecycle and accessibility parity)
**Decision:** MOBILE SUPPORTED — local source verified; hosted device evidence pending

---

## Feature Admission Test (Re-evaluated with "no desktop at all" lens)

| Gate          | Result        | Reasoning                                                                  |
| ------------- | ------------- | -------------------------------------------------------------------------- |
| **Frequency** | ⚠️ OCCASIONAL | Role changes when hiring/firing staff — not daily but BLOCKING             |
| **Speed**     | ✅ PASS       | Toggle permissions <1s each, save <2s                                      |
| **Touch**     | ✅ PASS       | List + switch toggles, 44px targets                                        |
| **Value**     | ✅ PASS       | Owner at HOME, staff at SHOP — owner needs phone control over staff access |

**Key insight:** If owner has NO desktop device, they CANNOT add/remove staff or change permissions without mobile support. This is a BLOCKING gap for PWA-only users.

---

## Mobile Implementation

| Feature                        | Mobile Component                      | Status |
| ------------------------------ | ------------------------------------- | ------ |
| View roles list                | `MobileRolesScreen`                   | ✅     |
| View role permissions          | `MobileRolesScreen` (detail view)     | ✅     |
| Edit role (name, desc, active) | `MobileRolesScreen` (bottom sheet)    | ✅     |
| Toggle individual permissions  | `MobileRolesScreen` (switch per perm) | ✅     |
| Toggle category permissions    | `MobileRolesScreen` (checkbox "All")  | ✅     |
| Add custom role                | `MobileRolesScreen` (add button)      | ✅     |
| Deactivate/reactivate role     | `MobileRolesScreen` Active switch     | ✅     |
| Add staff                      | `MobileUsersScreen`                   | ✅     |
| Reset staff password/passcode    | `MobileUsersScreen`                   | ✅     |
| Copy/share Staff ID + passcode   | `MobileUsersScreen` login popup       | ✅     |
| Staff/owner view own profile       | `MobileMoreScreen` top user card      | ✅     |
| Staff/owner edit own name/email/phone | `MobileMoreScreen` profile sheet   | ✅     |
| Staff/owner change own password  | `MobileMoreScreen` profile → Account access | ✅     |
| Activate/deactivate staff      | `MobileUsersScreen`                   | ✅     |
| Change staff role              | `MobileUsersScreen`                   | ✅     |
| Remove staff from store        | `MobileUsersScreen`                   | ✅     |
| View Owner account as Manager  | `MobileUsersScreen` (read-only detail) | ✅    |
| Filter bottom tabs by role     | `MobileShell` + `MobileNavigation`    | ✅     |
| Filter More sub-screens by role | `MobileMoreScreen`                   | ✅     |

## DAL Parity

- Uses same `/api/staff`, `/api/staff/password-reset`, `/api/staff/force-signout`, and `/api/staff/roles` server contracts as desktop
- Uses the same shared staff client response boundary as desktop: staff/role API responses are capped at 256KB and successful list/mutation/role envelopes are shape-checked before mobile state updates
- Mobile staff create, update, remove, reset-passcode, and force-sign-out flows inherit operation-specific mutation acknowledgement checks from `src/lib/staffManagement/client.ts`: the response must include the expected `mode`, `user`, and `userId`, and `user.id` must match `userId`, before mobile rows, selected-user state, passcode sheets, or success copy advance
- Mobile add/reset supports email, phone, and Staff ID aliases. When mobile create has a phone number, it sends the store country/dial code as the fallback phone context. Owner create/reset shows a temporary passcode once in a closeable mobile sheet with row-level copy icons, equal-width **WhatsApp** and **Share** actions, and a `wa.me` share link that targets the staff phone number when one is saved. Failed row-copy, fallback copy, WhatsApp open, and native share actions log bounded `mobile_staff_login_details_*` diagnostics only; raw Staff IDs, passcodes, phone numbers, and generated login messages must not be logged.
- A Manager with `canManageUsers` but without `canAssignRoles` can add ordinary Staff and manage non-owner staff. Mobile keeps Owner accounts visible for context but disables edit, reset, force-sign-out, activate/deactivate, and remove actions with plain explanatory copy. The same server target check runs again against fresh transaction data.
- Mobile self-service password change uses the shared `/api/auth/change-password` route from the signed-in profile screen. The old top-level More row is intentionally removed because account access is a rare profile action, not a daily settings action.
- Mobile signed-in profile edit uses `/api/auth/update-profile` for the current user's name, display/contact email, and phone fields. This does not change the Firebase Auth login email; password/passcode changes stay under Account access.
- Same `storeDetails.roles` data source
- Same `PERMISSION_CATEGORIES_CONFIG` and `PERMISSION_LABELS` constants
- Same route/screen permission taxonomy as desktop via `src/lib/permissions/permissionRequirements.ts`
- Same `StoreRoleDataType` type
- Same `RolesPermissionInitialData` defaults for new roles

## Route And Source Parity

- Staff/Roles route parity source gate: `npm run verify:staff-roles-route-parity`
- `/users` and `/users/list` render the desktop staff list.
- `/users/permissions` renders the desktop roles/permissions screen.
- `/users`, `/users/list`, and `/users/permissions` enter `MobileShell` More sub-screens on mobile.
- Mobile Staff opens only when `userPermissions?.canManageUsers === true`; mobile Roles opens only when `userPermissions?.canAssignRoles === true`.
- Mobile Staff and Roles continue to call the shared staff client instead of adding direct Firestore reads or mobile-only API contracts.
- Mobile Roles remounts editor/detail state by exact tenant/store, admits one save/delete mutation synchronously, captures the source IDs for the shared client call, and settles returned roles only when the same current tenant/store still owns the captured roles leaf. A delayed response cannot replace another selected store or newer same-store role truth; obsolete mounts suppress dialog, toast, selection, and loading settlement.

## Key Files

| Purpose               | Path                                                            |
| --------------------- | --------------------------------------------------------------- |
| Mobile roles screen   | `src/components/mobile/screens/MobileRolesScreen.tsx`           |
| Mobile staff screen   | `src/components/mobile/screens/MobileUsersScreen.tsx`           |
| Mobile account access | `src/components/mobile/screens/MobileMoreScreen.tsx`            |
| Mobile shell gates    | `src/components/mobile/MobileShell.tsx`                         |
| Desktop equivalent    | `src/components/templates/main-app/users/permissions/index.tsx` |
| Permission constants  | `src/data/rolesPermissionsInitialData.ts`                       |
| Role types            | `src/types/platform/roles.ts`                                   |

## RBAC Enforcement (Inherited)

Mobile calls the same staff/role APIs as desktop. Those routes enforce `withAuth()`, tenant/store lifecycle checks, `canManageUsers`, `canAssignRoles`, role validation, current-store scoped staff payloads for non-master managers, owner-target protection, and last-owner protection. Mobile also hides unavailable bottom tabs and More sub-screens before navigation; direct hash/sub-screen access falls back to More with a short unavailable message. Removing a staff member from the current store removes them from the current-store mobile list even if the account remains assigned to another location.

`MobileUsersScreen` remounts by exact tenant/store and masks the shared staff list until
the current scoped request succeeds. List requests use latest-request ownership, and
create/update/role/remove/reset/sign-out actions share synchronous admission, capture
their initiating scope, and settle only while the same mounted scope and source user
still own the target. This also prevents a one-time Staff ID/passcode from appearing
after a store switch. The shared context stores the runtime-validated public-safe
`StaffUserSummary[]`, not the broader authenticated account shape.

The mounted settlement guard is re-armed on every React Strict Mode effect setup, so
development replay cannot permanently suppress create/update/role/remove/reset/sign-out
settlement. Add Staff, Staff details, and one-time login-detail popups have stable
programmatic names; create/edit role choices expose `aria-pressed`. The shared active
state handler admits both transitions: active staff can be deactivated and inactive
staff can be reactivated while retaining the same permission, scope, and duplicate-
mutation guards.

Mobile custom roles use the editor's explicit **Active** switch for reversible
deactivation and reactivation. The former **Delete This Role** action called the same
soft-deactivation contract while claiming the role was deleted, then immediately left
the row visible as Off. That contradictory duplicate action is no longer shipped on
mobile; no hard-delete behavior was introduced.

`MobileUsersScreen` cannot reset the currently signed-in account through the staff-owner flow; self password/passcode change stays under **More → Profile → Account access**. Hosted iOS/Android browser and installed-PWA evidence remains an owner/release task and is not implied by local source parity.
