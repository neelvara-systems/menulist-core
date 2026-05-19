# Roles & Permissions — Mobile Support

**Last Updated:** May 19, 2026 (v5 — signed-in profile owns account access)
**Decision:** ✅ MOBILE SUPPORTED — Owner can manage roles and permissions from phone

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
| Deactivate role                | `MobileRolesScreen` (confirmation)    | ✅     |
| Add staff                      | `MobileUsersScreen`                   | ✅     |
| Reset staff password/passcode    | `MobileUsersScreen`                   | ✅     |
| Copy/share Staff ID + passcode   | `MobileUsersScreen` login popup       | ✅     |
| Staff/owner view own profile       | `MobileMoreScreen` top user card      | ✅     |
| Staff/owner edit own name/email/phone | `MobileMoreScreen` profile sheet   | ✅     |
| Staff/owner change own password  | `MobileMoreScreen` profile → Account access | ✅     |
| Activate/deactivate staff      | `MobileUsersScreen`                   | ✅     |
| Change staff role              | `MobileUsersScreen`                   | ✅     |
| Remove staff from store        | `MobileUsersScreen`                   | ✅     |
| Filter bottom tabs by role     | `MobileShell` + `MobileNavigation`    | ✅     |
| Filter More sub-screens by role | `MobileMoreScreen`                   | ✅     |

## DAL Parity

- Uses same `/api/staff`, `/api/staff/password-reset`, and `/api/staff/roles` server contracts as desktop
- Mobile add/reset supports email, phone, and Staff ID aliases. When mobile create has a phone number, it sends the store country/dial code as the fallback phone context. Owner create/reset shows a temporary passcode once in a closeable mobile sheet with row-level copy icons, equal-width **WhatsApp** and **Share** actions, and a `wa.me` share link that targets the staff phone number when one is saved.
- Mobile self-service password change uses the shared `/api/auth/change-password` route from the signed-in profile screen. The old top-level More row is intentionally removed because account access is a rare profile action, not a daily settings action.
- Mobile signed-in profile edit uses `/api/auth/update-profile` for the current user's name, display/contact email, and phone fields. This does not change the Firebase Auth login email; password/passcode changes stay under Account access.
- Same `storeDetails.roles` data source
- Same `PERMISSION_CATEGORIES_CONFIG` and `PERMISSION_LABELS` constants
- Same route/screen permission taxonomy as desktop via `src/lib/permissions/permissionRequirements.ts`
- Same `StoreRoleDataType` type
- Same `RolesPermissionInitialData` defaults for new roles

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

Mobile calls the same staff/role APIs as desktop. Those routes enforce `withAuth()`, tenant/store checks, `canManageUsers`, `canAssignRoles`, role validation, and last-owner protection. Mobile also hides unavailable bottom tabs and More sub-screens before navigation; direct hash/sub-screen access falls back to More with a short unavailable message.
