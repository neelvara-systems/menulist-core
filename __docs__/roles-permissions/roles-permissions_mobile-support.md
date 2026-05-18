# Roles & Permissions — Mobile Support

**Last Updated:** May 18, 2026 (v3 — mobile wired to server APIs)
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
| Staff/owner change own password  | `MobileMoreScreen` → Account access   | ✅     |
| Activate/deactivate staff      | `MobileUsersScreen`                   | ✅     |
| Change staff role              | `MobileUsersScreen`                   | ✅     |
| Remove staff from store        | `MobileUsersScreen`                   | ✅     |

## DAL Parity

- Uses same `/api/staff`, `/api/staff/password-reset`, and `/api/staff/roles` server contracts as desktop
- Mobile add/reset supports email, phone, and Staff ID aliases. Owner reset shows a temporary passcode once.
- Mobile self-service password change uses the shared `/api/auth/change-password` route from More → Account access. This works for password/passcode accounts when the current password/passcode is known.
- Same `storeDetails.roles` data source
- Same `PERMISSION_CATEGORIES_CONFIG` and `PERMISSION_LABELS` constants
- Same `StoreRoleDataType` type
- Same `RolesPermissionInitialData` defaults for new roles

## Key Files

| Purpose              | Path                                                            |
| -------------------- | --------------------------------------------------------------- |
| Mobile roles screen  | `src/components/mobile/screens/MobileRolesScreen.tsx`           |
| Mobile staff screen  | `src/components/mobile/screens/MobileUsersScreen.tsx`           |
| Mobile account access | `src/components/mobile/screens/MobileMoreScreen.tsx`           |
| Desktop equivalent   | `src/components/templates/main-app/users/permissions/index.tsx` |
| Permission constants | `src/data/rolesPermissionsInitialData.ts`                       |
| Role types           | `src/types/platform/roles.ts`                                   |

## RBAC Enforcement (Inherited)

Mobile calls the same staff/role APIs as desktop. Those routes enforce `withAuth()`, tenant/store checks, `canManageUsers`, `canAssignRoles`, role validation, and last-owner protection.
