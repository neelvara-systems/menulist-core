# Roles & Permissions — Technical Implementation

**Status:** ✅ Implemented | **Last Updated:** February 13, 2026

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
