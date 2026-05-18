# Roles & Permissions — Technical Implementation

**Status:** ✅ Staff CRUD + permissions wired end-to-end | **Last Updated:** May 18, 2026

> **Scope:** This document covers Layer 1 (staff-level RBAC). For Layer 2 (OutletPolicy chain restrictions) and the two-layer interaction model, see [Multi-Chain Permissions](../multi-chain-permissions/multi-chain-permissions_impl.md).

---

## 1. Current Data Model

```
stores/{storeId}                    users/{userId}
━━━━━━━━━━━━━━━━                    ━━━━━━━━━━━━━━
roles: StoreRoleDataType[]          stores: [{
                                      storeId: number,
                                      name: string,
                                      role: string  ← Single role ID
                                    }]
```

**Key Files:**

- Permission constants: `src/constants/permissions.ts`
- Role types: `src/types/platform/roles.ts`
- User types: `src/types/platform/user.ts`
- Store types: `src/types/platform/store.ts`
- Default roles: `src/data/defaultRoles.ts`
- Permission labels: `src/data/rolesPermissionsInitialData.ts`
- Outlet policy enforcement: `src/lib/permissions/applyOutletPolicy.ts`

---

## 2. Implementation Status

| Task                                                | Status  |
| --------------------------------------------------- | ------- |
| Default roles created during onboarding             | ✅ Done |
| Default roles created on manual store add           | ✅ Done |
| Single role per store (simplified from array)       | ✅ Done |
| Permission strategies removed (not needed)          | ✅ Done |
| Centralized permission constants                    | ✅ Done |
| Multi-outlet permissions added (Feb 12, 2026)       | ✅ Done |
| Outlet policy enforcement via `applyOutletPolicy()` | ✅ Done |
| Staff CRUD API (`/api/staff`)                        | ✅ Done |
| Staff password reset/passcode API (`/api/staff/password-reset`) | ✅ Done |
| Role CRUD API (`/api/staff/roles`)                   | ✅ Done |
| Desktop and mobile staff screens use API             | ✅ Done |

---

## 3. Default Roles Implementation

**File:** `src/data/defaultRoles.ts`

```typescript
// Simple role IDs - no storeId suffix needed
// Roles are scoped by being IN the store document
export function createDefaultRoles(storeId: number, createdBy: string) {
  return [
    {
      id: "owner", // Simple ID
      name: "Owner",
      permissions: {
        canAccessBilling: true,
        canManageSubscription: true,
        canManageUsers: true,
        // ... all 23 permissions = true
      },
    },
    {
      id: "manager", // Simple ID
      name: "Manager",
      permissions: {
        canAccessBilling: false, // No billing
        canManageUsers: true,
        // ... selective permissions
      },
    },
    {
      id: "staff", // Simple ID
      name: "Staff",
      permissions: {
        canManageChat: true, // Only chat
        // ... most false
      },
    },
  ];
}
```

---

## 4. Onboarding API (Implemented)

**File:** `src/app/api/onboarding/create-subscription/route.ts`

```typescript
// Store gets default roles
transaction.set(storeRef, {
  // ...existing fields...
  roles: createDefaultRoles(newStoreId, session.user.email),
  // NOTE: rolesPermissionStrategy removed - not needed with single role
});

// User gets single role per store
transaction.update(userRef, {
  stores: [
    {
      storeId: newStoreId,
      name: storeName,
      role: "owner", // Simple role ID (storeId already in same object)
    },
  ],
});
```

---

## 5. Permission Check (Implemented)

```typescript
// src/lib/permissions/hasPermission.ts
// Simple check - single role per store, no strategy needed
export function hasPermission(
  userRoleId: string | undefined,
  storeRoles: StoreRoleDataType[],
  permission: PermissionKey,
): boolean {
  if (!userRoleId) return false;
  const userRole = storeRoles.find((r) => r.active && r.id === userRoleId);
  if (!userRole) return false;
  return userRole.permissions[permission] === true;
}

// Get all permissions for a user's role
export function getPermissionsForRole(
  userRoleId: string | undefined,
  storeRoles: StoreRoleDataType[],
): RolePermissions {
  if (!userRoleId) return {};
  const userRole = storeRoles.find((r) => r.active && r.id === userRoleId);
  return userRole?.permissions ? { ...userRole.permissions } : {};
}
```

---

## 6. File Summary

| File                                                  | Status |
| ----------------------------------------------------- | ------ |
| `src/types/platform/roles.ts`                         | ✅ OK  |
| `src/data/defaultRoles.ts`                            | ✅ OK  |
| `src/constants/permissions.ts`                        | ✅ OK  |
| `src/data/rolesPermissionsInitialData.ts`             | ✅ OK  |
| `src/lib/permissions/hasPermission.ts`                | ✅ OK  |
| `src/lib/permissions/applyOutletPolicy.ts`            | ✅ OK  |
| `src/lib/staffManagement/server.ts`                   | ✅ OK  |
| `src/lib/staffManagement/client.ts`                   | ✅ OK  |
| `src/app/api/staff/route.ts`                          | ✅ OK  |
| `src/app/api/staff/password-reset/route.ts`            | ✅ OK  |
| `src/app/api/staff/roles/route.ts`                    | ✅ OK  |
| `src/app/api/onboarding/create-subscription/route.ts` | ✅ OK  |
| `src/components/.../users/permissions/*`              | ✅ OK  |

---

## 7. Multi-Outlet Integration

Two permissions were added for multi-outlet store management (Feature #4C):

| Permission         | Constant                   | Owner | Manager | Staff | Purpose                                               |
| ------------------ | -------------------------- | :---: | :-----: | :---: | ----------------------------------------------------- |
| `canManageOutlets` | `PERMISSION_OUTLET_MANAGE` |  ✅   |   ❌    |  ❌   | Create/deactivate outlets, manage Chain Control Panel |
| `canSwitchStores`  | `PERMISSION_OUTLET_SWITCH` |  ✅   |   ✅    |  ❌   | Switch between stores as master user                  |

For outlet stores, these permissions are further restricted by the **OutletPolicy** (Layer 2). Full details on the two-layer interaction model, `applyOutletPolicy()`, and session integration are documented in:

→ **[Multi-Chain Permissions — Technical Implementation](../multi-chain-permissions/multi-chain-permissions_impl.md)** (§4: Outlet Policy Enforcement)

---

## 8. Total Permission Count: 23

All permissions defined in `src/constants/permissions.ts` → `ALL_PERMISSIONS` array.

Categories:

- **Billing & Subscription** (2): `canAccessBilling`, `canManageSubscription`
- **Team Management** (2): `canManageUsers`, `canAssignRoles`
- **Store Management** (4): `canManageStore`, `canAddStores`, `canManageOutlets`, `canSwitchStores`
- **Menu Management** (5): `canManageMenu`, `canPublishMenu`, `canUseMenuExtraction`, `canGenerateDescriptions`, `canGenerateImages`
- **Outlet Customization** (5): `canOverrideTheme`, `canOverrideBrandIdentity`, `canOverrideLayout`, `canAddLocalCategories`, `canAddLocalItems`
- **Pricing** (1): `canOverridePrices`
- **Analytics** (2): `canViewAnalytics`, `canExportData`
- **Customer** (2): `canManageChat`, `canViewCustomerData`

---

## 9. Staff CRUD Runtime Contract

### API Endpoints

| Endpoint | Method | Purpose | Required Permission |
| --- | --- | --- | --- |
| `src/app/api/staff/route.ts` | `GET` | List active staff for a store | `canManageUsers` |
| `src/app/api/staff/route.ts` | `POST` | Create staff or add same-tenant staff to a store | `canManageUsers`; `canAssignRoles` for non-Staff role assignment |
| `src/app/api/staff/route.ts` | `PATCH` | Update staff profile, active state, default store, store mappings, roles | `canManageUsers`; `canAssignRoles` when mappings/roles change |
| `src/app/api/staff/route.ts` | `DELETE` | Remove staff from current store; soft-delete if no stores remain | `canManageUsers` |
| `src/app/api/staff/password-reset/route.ts` | `POST` | Create a one-time temporary staff passcode for email, Staff ID, or phone login | `canManageUsers` |
| `src/app/api/staff/roles/route.ts` | `POST/PATCH` | Create or update role definition | `canAssignRoles` |
| `src/app/api/staff/roles/route.ts` | `DELETE` | Deactivate role definition | `canAssignRoles` |

### Server Guards

- `withAuth()` wraps every staff/role API route.
- Tenant ID must match the authenticated session unless the session is platform admin.
- Non-master store users can only manage their own store.
- Master store users can manage staff mappings inside the same tenant.
- Store mappings are validated against real store documents and active role definitions.
- The `owner` role definition is locked from edits/deactivation.
- Last active owner protection prevents removing/demoting/deactivating the only owner for a store.

### UI Wiring

| Surface | Files | Contract |
| --- | --- | --- |
| Desktop staff | `src/components/templates/main-app/users/usersList/*` | Loads staff through `fetchStaffUsers()`, creates through `createStaffUser()`, updates through `updateStaffUser()`, removes through `removeStaffFromStore()` |
| Desktop roles | `src/components/templates/main-app/users/permissions/*` | Saves through `saveRoleDefinition()` |
| Mobile staff | `src/components/mobile/screens/MobileUsersScreen.tsx` | Uses the same staff client helpers as desktop |
| Mobile roles | `src/components/mobile/screens/MobileRolesScreen.tsx` | Uses the same role client helpers as desktop |
