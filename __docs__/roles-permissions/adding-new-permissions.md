# Guide: Adding New Permissions

> **Audience:** Developers  
> **Last Updated:** July 16, 2026

---

## Quick Checklist

When adding a new permission, update these files **in order**:

| Step | File                                       | Action                                                                                          |
| ---- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| 1    | `src/constants/permissions.ts`             | Add constant + add to PERMISSIONS object + add to ALL_PERMISSIONS + add to category + add label |
| 2    | `src/types/platform/roles.ts`              | Add to RolePermissions type                                                                     |
| 3    | `src/data/shared/defaultRoles.ts`          | Add to OWNER/MANAGER/STAFF permissions                                                          |
| 4    | `src/data/rolesPermissionsInitialData.ts`  | Add to initialData array with label, category, and description (for UI display)                 |
| 5    | `src/lib/permissions/applyOutletPolicy.ts` | **If OutletPolicy-relevant:** Add mapping from OutletPolicy flag → RolePermission key           |
| 6    | `functions/src/sharedData/defaultRoles.ts` | Copy `src/data/shared/defaultRoles.ts` byte-for-byte                                            |
| 7    | `src/lib/permissions/permissionRequirements.ts` | If it gates a route or major screen, add the route/screen requirement                      |
| 8    | API route guard                           | If it protects server-side work, use `requireAnyStorePermission()` in the protected API route    |
| 9    | Test                                      | Verify permission works in UI and `npx tsc --noEmit --incremental false` passes                 |

---

## Step 1: Add to Centralized Constants

**File:** `src/constants/permissions.ts`

```typescript
// 1. Add the constant at the top (in appropriate category section)
export const PERMISSION_ORDERS_MANAGE = "canManageOrders" as const;

// 2. Add to PERMISSIONS object
export const PERMISSIONS = {
  // ... existing
  MANAGE_ORDERS: PERMISSION_ORDERS_MANAGE,
} as const;

// 3. Add to ALL_PERMISSIONS array
export const ALL_PERMISSIONS: PermissionKey[] = [
  // ... existing
  PERMISSION_ORDERS_MANAGE,
];

// 4. Add to appropriate category in PERMISSION_CATEGORIES
export const PERMISSION_CATEGORIES = {
  // ... existing categories
  ORDERS: {
    label: "📦 Orders",
    permissions: [PERMISSION_ORDERS_MANAGE],
  },
};

// 5. Add human-readable label
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  // ... existing
  [PERMISSION_ORDERS_MANAGE]: "Manage Orders",
};
```

---

## Step 2: Add to Types

**File:** `src/types/platform/roles.ts`

```typescript
export type RolePermissions = {
  // ... existing permissions

  // 📦 Orders (NEW)
  canManageOrders?: boolean; // Manage customer orders
};
```

---

## Step 3: Add to Default Roles

**File:** `src/data/shared/defaultRoles.ts`

Decide which roles should have this permission by default:

```typescript
const OWNER_PERMISSIONS: RolePermissions = {
  // ... existing
  canManageOrders: true, // Owner can manage orders
};

const MANAGER_PERMISSIONS: RolePermissions = {
  // ... existing
  canManageOrders: true, // Manager can manage orders
};

const STAFF_PERMISSIONS: RolePermissions = {
  // ... existing
  canManageOrders: false, // Staff cannot manage orders
};
```

---

## Step 4: Test

1. **UI Check:** Go to `/users/permissions` and verify the new permission appears in the correct category
2. **Role Check:** Create/edit a role and verify you can toggle the new permission
3. **Context Check:** Use in a component:
   ```typescript
   const { userPermissions } = useContext(PlatformGlobalDataContext);
   if (userPermissions.canManageOrders) {
     // Show orders management UI
   }
   ```

---

## Permission Naming Convention

| Prefix     | Meaning                   | Example                |
| ---------- | ------------------------- | ---------------------- |
| `can`      | Ability to do something   | `canManageOrders`      |
| `Access`   | View/read access          | `canAccessBilling`     |
| `Manage`   | Full CRUD access          | `canManageUsers`       |
| `View`     | Read-only access          | `canViewAnalytics`     |
| `Add`      | Create new items          | `canAddStores`         |
| `Override` | Change inherited settings | `canOverridePrices`    |
| `Use`      | Use a specific feature    | `canUseMenuExtraction` |
| `Generate` | Create AI content         | `canGenerateImages`    |
| `Export`   | Export/download data      | `canExportData`        |
| `Publish`  | Make changes live         | `canPublishMenu`       |
| `Assign`   | Assign to others          | `canAssignRoles`       |

---

## Category Guidelines

Group permissions logically:

| Category    | Icon | Permissions                   |
| ----------- | ---- | ----------------------------- |
| Billing     | 💰   | Payment, subscription related |
| Users       | 👥   | User/staff management         |
| Store       | 🏪   | Store settings                |
| Menu        | 🍽️   | Menu management               |
| AI Features | 🤖   | Credit-consuming AI features  |
| Branding    | 🎨   | Visual customization          |
| Content     | 🏗️   | Content override/local items  |
| Analytics   | 📊   | Reports and data              |
| Customer    | 💬   | Customer interactions         |
| Orders      | 📦   | Order management (future)     |

---

## Migration Note

For existing stores, new permissions default to `false` for custom roles. Default roles are normalized from `DEFAULT_ROLE_METADATA` during staff/role server flows, so Owner/Manager/Staff receive the new default value without a separate migration script. The repair recomputes inside `runStaffRoleMutationTransaction()` and must remain there so a concurrent owner role edit is preserved. Use a one-off migration only when custom roles must receive a newly added permission automatically.

---

## Common Mistakes

❌ **Don't** add permission string directly - use constants

```typescript
// BAD
if (userPermissions['canManageOrders']) { ... }

// GOOD
import { PERMISSIONS } from '@constant/permissions';
if (userPermissions[PERMISSIONS.MANAGE_ORDERS]) { ... }
```

❌ **Don't** forget to add to ALL_PERMISSIONS array (UI won't show it)

❌ **Don't** forget to add label (UI will show raw key)

---

## Files Reference

| File                                      | Purpose                                        |
| ----------------------------------------- | ---------------------------------------------- |
| `src/constants/permissions.ts`            | **Single source of truth** for permission keys |
| `src/types/platform/roles.ts`             | TypeScript types                               |
| `src/data/shared/defaultRoles.ts`         | Canonical default role definitions             |
| `functions/src/sharedData/defaultRoles.ts` | Byte-identical Functions mirror               |
| `src/data/rolesPermissionsInitialData.ts` | Legacy UI data (may be deprecated)             |
