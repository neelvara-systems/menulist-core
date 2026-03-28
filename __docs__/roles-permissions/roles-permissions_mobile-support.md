# Roles & Permissions — Mobile Support

**Last Updated:** February 16, 2026 (v2 — mobile management implemented)
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
| Delete role                    | `MobileRolesScreen` (confirmation)    | ✅     |

## DAL Parity

- Uses same `updateStore({ roles: [...] })` as desktop `roleDetailsModal.tsx`
- Same `storeDetails.roles` data source
- Same `PERMISSION_CATEGORIES_CONFIG` and `PERMISSION_LABELS` constants
- Same `StoreRoleDataType` type
- Same `RolesPermissionInitialData` defaults for new roles

## Key Files

| Purpose              | Path                                                            |
| -------------------- | --------------------------------------------------------------- |
| Mobile roles screen  | `src/components/mobile/screens/MobileRolesScreen.tsx`           |
| Desktop equivalent   | `src/components/templates/main-app/users/permissions/index.tsx` |
| Permission constants | `src/data/rolesPermissionsInitialData.ts`                       |
| Role types           | `src/types/platform/roles.ts`                                   |

## RBAC Enforcement (Inherited)

All DAL functions check permissions via `getActiveSession()`. Mobile screens calling the same DAL functions automatically inherit permission enforcement.
