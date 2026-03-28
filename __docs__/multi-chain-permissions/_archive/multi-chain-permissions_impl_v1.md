# Multi-Chain Permissions — Technical Implementation

**Feature:** #4B — Multi-Chain Permissions  
**Status:** ✅ Implemented (diverged from original spec)  
**Last Updated:** February 12, 2026

---

> **IMPLEMENTATION UPDATE (Feb 12, 2026):**
> The original spec below proposed `StaffRole` (`HQ_ADMIN` / `STORE_MANAGER`), `ROLE_CAPABILITIES`, and `checkAccess()`.
> The **actual implementation** uses a simpler, more powerful model:
>
> - `StorePermissions` → unified into **`OutletPolicy`** (on master store)
> - `StaffRole` → replaced by existing **`RolePermissions`** system (owner/manager/staff)
> - `checkAccess()` → replaced by **`applyOutletPolicy()`** which merges role + policy
> - See `roles-permissions/roles-permissions_impl.md` §7-8 for the current permission model
> - See `multi-outlet-consistency/README.md` → Permissions section for file paths

---

## 0. Actual Implementation (Current Codebase)

### OutletPolicy (replaces StorePermissions)

**Location:** Master store's `outletPolicy` field (`stores/{masterStoreId}.outletPolicy`)

**Type:** `src/types/multiOutlet.types.ts` → `OutletPolicy`

```typescript
export interface OutletPolicy {
  canUseMenuExtraction: boolean;
  canGenerateDescriptions: boolean;
  canGenerateImages: boolean;
  canOverrideTheme: boolean;
  canOverrideBrandIdentity: boolean;
  canOverrideLayout: boolean;
  allowLocalCategories: boolean;
  allowLocalItems: boolean;
  priceOverride: boolean;
}
```

### Enforcement via `applyOutletPolicy()`

**File:** `src/lib/permissions/applyOutletPolicy.ts`

When a user is on an outlet store, `sessionProvider.tsx` calls:

```
effectivePermissions = applyOutletPolicy(rolePermissions, outletPolicy, isMasterStore)
```

This merges the user's role permissions with the master's chain-wide policy. If the policy disables a capability, the corresponding `RolePermission` is forced to `false`.

### Multi-Outlet Specific Permissions

| Permission         | Owner | Manager | Staff | Purpose                   |
| ------------------ | :---: | :-----: | :---: | ------------------------- |
| `canManageOutlets` |  ✅   |   ❌    |  ❌   | Create/deactivate outlets |
| `canSwitchStores`  |  ✅   |   ✅    |  ❌   | Switch between stores     |

These are always forced `false` for outlet users by `applyOutletPolicy()`.

---

## 1. Original Spec (Historical Reference)

### 1.1 Store Permissions (7 Flags) — Now `OutletPolicy`

**Location:** `stores/{masterStoreId}.outletPolicy` (was: `stores/{sId}.permissions`)

```typescript
// src/types/multiOutlet.types.ts — CURRENT TYPE IS OutletPolicy (see §0 above)
// Below is the original spec for historical reference

export interface StorePermissions {
  // 💰 Expensive (AI costs)
  canUseMenuExtraction: boolean; // Default: false
  canGenerateDescriptions: boolean; // Default: true
  canGenerateImages: boolean; // Default: false

  // 🎨 Brand-Risky
  canOverrideTheme: boolean; // Default: false
  canOverrideBrandIdentity: boolean; // Default: false
  canOverrideLayout: boolean; // Default: false

  // 🏗️ Structural
  canAddLocalCategories: boolean; // Default: false
}

export const DEFAULT_STORE_PERMISSIONS: StorePermissions = {
  canUseMenuExtraction: false,
  canGenerateDescriptions: true,
  canGenerateImages: false,
  canOverrideTheme: false,
  canOverrideBrandIdentity: false,
  canOverrideLayout: false,
  canAddLocalCategories: false,
};
```

### 1.2 Staff Roles

**Location:** `users/{userId}.stores[]`

```typescript
// src/types/platform/user.ts

export type StaffRole = "HQ_ADMIN" | "STORE_MANAGER";

export interface UserStoreMappingType {
  storeId: number;
  roles: StaffRole[]; // Changed from string[] to StaffRole[]
}
```

### 1.3 Role Capabilities Matrix

```typescript
// src/config/roleCapabilities.ts

export const ROLE_CAPABILITIES = {
  HQ_ADMIN: {
    canEditMaster: true,
    canLinkStores: true,
    canConfigurePermissions: true,
    canManageStaff: true,
    canApplyOverrides: true,
    canAddLocalItems: true,
    canAddLocalCategories: true,
    canUseAITools: true, // Subject to store permissions
  },
  STORE_MANAGER: {
    canEditMaster: false,
    canLinkStores: false,
    canConfigurePermissions: false,
    canManageStaff: false,
    canApplyOverrides: true,
    canAddLocalItems: true,
    canAddLocalCategories: true, // Subject to store permissions
    canUseAITools: true, // Subject to store permissions
  },
} as const;
```

---

## 2. Permission Check Flow

### 2.1 Access Check Function

```typescript
// src/lib/permissions/checkAccess.ts

import { ROLE_CAPABILITIES } from "@config/roleCapabilities";
import {
  DEFAULT_STORE_PERMISSIONS,
  StorePermissions,
} from "@types/multiOutlet.types";

interface AccessCheckParams {
  action: keyof typeof ROLE_CAPABILITIES.HQ_ADMIN;
  userRole: StaffRole;
  storePermissions?: Partial<StorePermissions>;
  permissionKey?: keyof StorePermissions;
}

export function checkAccess({
  action,
  userRole,
  storePermissions,
  permissionKey,
}: AccessCheckParams): boolean {
  // 1. Check role capability
  const roleAllows = ROLE_CAPABILITIES[userRole]?.[action] ?? false;
  if (!roleAllows) return false;

  // 2. If no store permission check needed, role is sufficient
  if (!permissionKey) return true;

  // 3. Check store permission
  const perms = { ...DEFAULT_STORE_PERMISSIONS, ...storePermissions };
  return perms[permissionKey] ?? false;
}
```

### 2.2 React Hook for UI

```typescript
// src/hooks/usePermissions.ts

import { useSession } from "@lib/auth";
import { useStore } from "@context/StoreContext";
import { checkAccess } from "@lib/permissions/checkAccess";

export function useCanUseFeature(feature: keyof StorePermissions): boolean {
  const { role } = useSession();
  const { permissions } = useStore();

  // HQ_ADMIN bypasses store permissions for most actions
  if (role === "HQ_ADMIN") {
    return permissions?.[feature] ?? DEFAULT_STORE_PERMISSIONS[feature];
  }

  // STORE_MANAGER subject to both role and store permissions
  return checkAccess({
    action: "canUseAITools",
    userRole: role,
    storePermissions: permissions,
    permissionKey: feature,
  });
}
```

---

## 3. Enforcement Points

**Enforcement Hierarchy (Priority Order):**

1. **API Routes** — Primary gatekeeper, server-side validation
2. **UI Hooks** — Hide/disable features client-side
3. **Firestore Rules** — Secondary defense, not sole protection

> **Critical:** Never rely on Firestore rules alone. API must validate all permission-gated actions.

### 3.1 UI Enforcement (Feature Hiding)

```tsx
// Example: AI Image Generation Button

import { useCanUseFeature } from "@hooks/usePermissions";

function ImageGenerateButton() {
  const canGenerate = useCanUseFeature("canGenerateImages");

  if (!canGenerate) return null; // Hidden, not disabled

  return <Button onClick={handleGenerate}>Generate Image</Button>;
}
```

### 3.2 API Enforcement (PRIMARY)

> **This is the source of truth.** Role is resolved per-request based on user's active storeId.

```typescript
// src/app/api/image-generation/route.ts

import { checkAccess } from "@lib/permissions/checkAccess";
import { getStorePermissions } from "@database/stores";

export async function POST(req: Request) {
  const session = await getActiveSession();
  // Role is resolved per active store, not from cached claims
  const userRole = await getUserRoleForStore(session.uId, session.sId);
  const permissions = await getStorePermissions(session.sId);

  const allowed = checkAccess({
    action: "canUseAITools",
    userRole: userRole, // Resolved per-request, not from claims
    storePermissions: permissions,
    permissionKey: "canGenerateImages",
  });

  if (!allowed) {
    return new Response(null, { status: 403 }); // Silent rejection
  }

  // Proceed with image generation...
}
```

### 3.3 Firestore Rules (SECONDARY)

> **Defense in depth only.** These rules provide backup protection but API is primary enforcement.

```javascript
// firestore.rules (addition)

function getStorePermissions(sId) {
  return get(/databases/$(database)/documents/stores/$(sId)).data.permissions;
}

function hasStorePermission(sId, permission) {
  let perms = getStorePermissions(sId);
  return perms != null && perms[permission] == true;
}

// Note: Claims-based role check is convenience, not sole authority
// API validates role per-request from DB for critical operations
function isHQAdmin() {
  return request.auth.token.role == 'HQ_ADMIN';
}

match /projects/{tId}/{sId}/{projectId} {
  // Basic protection - API provides full validation
  allow read: if request.auth != null;
  allow write: if request.auth != null && (
    isHQAdmin() ||
    !isMasterProject()
  );
  // Note: Fine-grained permission checks done at API layer
}
```

---

## 4. File Structure

### 4.1 New Files

| File                                 | Purpose                 |
| ------------------------------------ | ----------------------- |
| `src/config/roleCapabilities.ts`     | Role capability matrix  |
| `src/lib/permissions/checkAccess.ts` | Core access check logic |
| `src/lib/permissions/index.ts`       | Module exports          |
| `src/hooks/usePermissions.ts`        | React hooks for UI      |

### 4.2 Files to Modify

| File                                   | Change                            |
| -------------------------------------- | --------------------------------- |
| `src/types/multiOutlet.types.ts`       | Update StorePermissions interface |
| `src/types/platform/user.ts`           | Add StaffRole type                |
| `src/app/api/auth/set-claims/route.ts` | Set role in custom claims         |
| `src/database/stores/index.ts`         | Add getStorePermissions function  |
| `firestore.rules`                      | Add permission checks             |

---

## 5. Migration Strategy

### 5.1 Existing Stores

```typescript
// Migration: Add default permissions to existing stores

async function migrateStorePermissions(sId: number) {
  // Canonical path: stores/{sId}
  const storeRef = doc(db, `stores/${sId}`);
  await updateDoc(storeRef, {
    permissions: DEFAULT_STORE_PERMISSIONS,
  });
}
```

### 5.2 Existing Users

```typescript
// Migration: Set first user as HQ_ADMIN

async function migrateUserRoles(tId: number) {
  const users = await getUsersByTenant(tId);
  const firstUser = users[0];

  // First user gets HQ_ADMIN for all stores
  await updateUserRoles(firstUser.uid, {
    stores: firstUser.stores.map((s) => ({
      ...s,
      roles: ["HQ_ADMIN"],
    })),
  });

  // Other users get STORE_MANAGER
  for (const user of users.slice(1)) {
    await updateUserRoles(user.uid, {
      stores: user.stores.map((s) => ({
        ...s,
        roles: ["STORE_MANAGER"],
      })),
    });
  }
}
```

---

## 6. Testing Checklist

| Test                              | Expected                                 |
| --------------------------------- | ---------------------------------------- |
| STORE_MANAGER tries AI extraction | Blocked if `canUseMenuExtraction: false` |
| HQ_ADMIN tries AI extraction      | Allowed (checks store perm)              |
| STORE_MANAGER tries edit master   | Blocked (role-level)                     |
| Theme button visibility           | Hidden if `canOverrideTheme: false`      |
| API rejection                     | Returns 403, no error message            |

---

## 7. Cost Analysis

| Item    | Impact                            |
| ------- | --------------------------------- |
| Storage | ~50 bytes per store (7 booleans)  |
| Reads   | 0 extra (bundled with store load) |
| Writes  | Only on permission change         |

**Total:** Negligible impact.

---

**DOCUMENT STATUS:** 📋 SPEC LOCK  
**NEXT:** Implementation following this blueprint
