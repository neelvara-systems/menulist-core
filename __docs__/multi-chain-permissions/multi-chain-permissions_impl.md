# Multi-Chain Permissions — Technical Implementation

> **Feature:** #4B — Multi-Chain Permissions  
> **Status:** ✅ Implemented  
> **Last Updated:** May 27, 2026
> **Source of Truth:** Codebase

> **Scope:** This document covers the full two-layer permission model. Layer 1 (RolePermissions) type details are included here for completeness but the canonical reference for staff-level RBAC (default roles, `hasPermission()`, adding permissions guide) is [Roles & Permissions Impl](../roles-permissions/roles-permissions_impl.md). This document focuses on Layer 2 (OutletPolicy) and the intersection enforcement.

> **May 27, 2026 audit note:** OutletPolicy writes are server-owned through `POST /api/outlets/policy`. Desktop and mobile access gates use `canManageLocationSettings()` from `src/lib/multiOutlet/locationAccess.ts`. Outlet sessions load the master store policy once when it is not already hydrated in `tenantDetails.storesList`, and `applyOutletPolicy()` falls back to `DEFAULT_OUTLET_POLICY` for non-master stores so missing policy hydration cannot grant chain/billing permissions. Linked outlet menu saves, description/image APIs, and extraction jobs enforce the policy server-side.

---

## 1. Data Model

### 1.1 Staff-Level Permissions (RolePermissions)

**Type Definition:** `src/types/platform/roles.ts`

```typescript
export type RolePermissions = {
  // Billing & Subscription
  canAccessBilling?: boolean;
  canManageSubscription?: boolean;
  // User Management
  canManageUsers?: boolean;
  canAssignRoles?: boolean;
  // Store Management
  canManageStore?: boolean;
  canAddStores?: boolean;
  // Multi-Outlet (Feature #4C)
  canManageOutlets?: boolean;
  canSwitchStores?: boolean;
  // Menu Management
  canManageMenu?: boolean;
  canPublishMenu?: boolean;
  // AI Features (Credit-consuming)
  canUseMenuExtraction?: boolean;
  canGenerateDescriptions?: boolean;
  canGenerateImages?: boolean;
  // Branding (Multi-outlet override control)
  canOverrideTheme?: boolean;
  canOverrideBrandIdentity?: boolean;
  canOverrideLayout?: boolean;
  // Content Control (Multi-outlet)
  canAddLocalCategories?: boolean;
  canAddLocalItems?: boolean;
  canOverridePrices?: boolean;
  // Analytics & Reports
  canViewAnalytics?: boolean;
  canExportData?: boolean;
  // Customer Interactions
  canManageChat?: boolean;
  canViewCustomerData?: boolean;
};
```

**Storage Location:** `stores/{sId}.roles[].permissions`

Each store document contains a `roles` array. Each role has:

```typescript
export type StoreRoleDataType = {
  id: string; // 'owner', 'manager', 'staff', or 'custom-{timestamp}'
  name: string; // Human-readable name
  description: string; // Role description
  active: boolean; // Whether role is active
  permissions: RolePermissions;
  createdOn: string;
  createdBy: string;
};
```

**User ↔ Role Mapping:** `users/{userId}.stores[]`

```typescript
// Each user has ONE role per store
{
    storeId: number,
    name: string,
    role: string    // Simple role ID: 'owner', 'manager', 'staff'
}
```

### 1.2 Chain-Level Permissions (OutletPolicy)

**Type Definition:** `src/types/multiOutlet.types.ts` (lines 145–182)

```typescript
export interface OutletPolicy {
  priceOverride: boolean;
  availabilityOverride: boolean;
  descriptionOverride: boolean;
  imageOverride: boolean;
  allowLocalItems: boolean;
  allowLocalCategories: boolean;
  allowLocalProjects: boolean;
  allowProjectDeactivate: boolean;
  canUseMenuExtraction: boolean;
  canGenerateDescriptions: boolean;
  canGenerateImages: boolean;
  canOverrideTheme: boolean;
  canOverrideBrandIdentity: boolean;
  canOverrideLayout: boolean;
  canAddLanguages: boolean;
}
```

**Default Values:** `src/types/multiOutlet.types.ts` → `DEFAULT_OUTLET_POLICY`

```typescript
export const DEFAULT_OUTLET_POLICY: OutletPolicy = {
  priceOverride: true, // Outlets CAN override prices
  availabilityOverride: true, // Outlets CAN toggle availability
  descriptionOverride: false, // Outlets CANNOT edit descriptions
  imageOverride: false, // Outlets CANNOT replace images
  allowLocalItems: true, // Outlets CAN add local items
  allowLocalCategories: true, // Outlets CAN add local categories
  allowLocalProjects: false, // Outlets CANNOT create local projects
  allowProjectDeactivate: true, // Outlets CAN deactivate projects
  canUseMenuExtraction: false, // Outlets CANNOT use AI extraction
  canGenerateDescriptions: true, // Outlets CAN generate descriptions
  canGenerateImages: false, // Outlets CANNOT generate images
  canOverrideTheme: false, // Outlets CANNOT customize theme
  canOverrideBrandIdentity: false, // Outlets CANNOT change brand identity or business classification
  canOverrideLayout: false, // Outlets CANNOT modify layout
  canAddLanguages: true, // Outlets CAN add languages
};
```

**Storage Location:** `stores/{masterStoreId}.outletPolicy`

Only the master store holds the outlet policy. All outlets read from it via tenant context.

---

## 2. Default Roles

**File:** `src/data/defaultRoles.ts`

3 default roles created for every new store (via `createDefaultRoles()`):

| Role        | ID        | All 23 Permissions                                                                                      |
| ----------- | --------- | ------------------------------------------------------------------------------------------------------- |
| **Owner**   | `owner`   | All `true`                                                                                              |
| **Manager** | `manager` | `false`: billing(2), assignRoles, addStores, manageOutlets, extraction, images, branding(3), exportData |
| **Staff**   | `staff`   | Only `canManageChat: true`, everything else `false`                                                     |

**Factory Function:**

```typescript
export function createDefaultRoles(
  storeId: number,
  createdBy: string,
): StoreRoleDataType[];
```

Called in:

- `src/app/api/onboarding/create-subscription/route.ts` (initial store)
- `src/app/api/outlets/create/route.ts` (new outlet stores)

---

## 3. Permission Constants

**File:** `src/constants/permissions.ts`

### Constants (for type-safe usage)

```typescript
export const PERMISSION_BILLING_ACCESS = "canAccessBilling" as const;
export const PERMISSION_OUTLET_MANAGE = "canManageOutlets" as const;
// ... 23 total constants
```

### PERMISSIONS Object (for programmatic access)

```typescript
export const PERMISSIONS = {
  ACCESS_BILLING: PERMISSION_BILLING_ACCESS,
  MANAGE_OUTLETS: PERMISSION_OUTLET_MANAGE,
  SWITCH_STORES: PERMISSION_OUTLET_SWITCH,
  // ... all 23 mapped
} as const;
```

### Categories (for UI grouping)

```typescript
export const PERMISSION_CATEGORIES = {
    BILLING:      { label: '💰 Billing',    permissions: [...] },
    USERS:        { label: '👥 Users',      permissions: [...] },
    STORE:        { label: '🏪 Store',      permissions: [...] },
    MENU:         { label: '🍽️ Menu',       permissions: [...] },
    AI_FEATURES:  { label: '🤖 AI Features', permissions: [...] },
    BRANDING:     { label: '🎨 Branding',   permissions: [...] },
    CONTENT:      { label: '🏗️ Content',    permissions: [...] },
    ANALYTICS:    { label: '📊 Analytics',  permissions: [...] },
    CUSTOMER:     { label: '💬 Customer',   permissions: [...] },
};
```

### Labels (for UI display)

**File:** `src/constants/permissions.ts` (lines 184–208)

```typescript
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  canAccessBilling: "Access Billing",
  canManageOutlets: "Manage Outlets",
  canSwitchStores: "Switch Stores",
  // ... all 23 with human-readable labels
};
```

---

## 4. Outlet Policy Enforcement

**File:** `src/lib/permissions/applyOutletPolicy.ts`

### Policy-to-Permission Mapping

```typescript
const POLICY_TO_PERMISSION_MAP: Partial<
  Record<keyof OutletPolicy, (keyof RolePermissions)[]>
> = {
  canUseMenuExtraction: ["canUseMenuExtraction"],
  canGenerateDescriptions: ["canGenerateDescriptions"],
  canGenerateImages: ["canGenerateImages"],
  canOverrideTheme: ["canOverrideTheme", "canManageMenuDesign"],
  canOverrideBrandIdentity: ["canOverrideBrandIdentity", "canManageMenuDesign"],
  canOverrideLayout: ["canOverrideLayout", "canManageMenuDesign"],
  allowLocalCategories: ["canAddLocalCategories"],
  allowLocalItems: ["canAddLocalItems"],
  priceOverride: ["canOverridePrices"],
};
```

### Flags NOT in POLICY_TO_PERMISSION_MAP (6 of 15)

The following 6 OutletPolicy flags have **no corresponding RolePermission key**. They are enforced directly in UI components that check `outletPolicy` when rendering edit controls — NOT through the `userPermissions` context:

| OutletPolicy Flag        | Enforcement Point    | What It Controls                                 |
| ------------------------ | -------------------- | ------------------------------------------------ |
| `availabilityOverride`   | Editor item controls | Whether outlet can toggle item availability      |
| `descriptionOverride`    | Editor item controls | Whether outlet can edit item descriptions        |
| `imageOverride`          | Editor item controls | Whether outlet can replace item images           |
| `allowLocalProjects`     | Project creation UI  | Whether outlet can create separate projects      |
| `allowProjectDeactivate` | Project list UI      | Whether outlet can deactivate inherited projects |
| `canAddLanguages`        | Language settings UI | Whether outlet can add languages                 |

**Why they're separate:** These flags control editor-level behavior (what fields are editable on inherited items) rather than feature-level access (whether a feature is visible). They don't have matching `can*` keys in `RolePermissions` because they're item-level controls, not page-level gates.

### Enforcement Logic

```typescript
export function applyOutletPolicy(
  rolePermissions: RolePermissions,
  outletPolicy: OutletPolicy | undefined,
  isMasterStore: boolean,
): RolePermissions {
  // Master store users keep full role permissions.
  if (isMasterStore) return rolePermissions;

  const effectiveOutletPolicy = outletPolicy || DEFAULT_OUTLET_POLICY;

  const effective = { ...rolePermissions };

  // Apply policy gates
  for (const [policyKey, permissionKeys] of Object.entries(
    POLICY_TO_PERMISSION_MAP,
  )) {
    if (effectiveOutletPolicy[policyKey] === false) {
      for (const permKey of permissionKeys) {
        effective[permKey] = false;
      }
    }
  }

  // Always-forced restrictions for outlet users
  effective.canManageOutlets = false;
  effective.canAddStores = false;
  effective.canAccessBilling = false;
  effective.canManageSubscription = false;

  effective.outletPolicy = effectiveOutletPolicy;

  return effective;
}
```

### Session Integration

**File:** `src/providers/sessionProvider.tsx` (lines 154–180)

```typescript
// Get user's single role for current store
const userRoleId = session?.user?.stores?.find(
  (store) => store.storeId === session.user.storeId,
)?.role;

// Find matching role definition from store
const userRole = storeDetails.roles?.find((r) => r.id === userRoleId);

if (userRole?.permissions) {
  const isMaster = Boolean(storeDetails.isMaster);
  if (!isMaster && tenantDetails?.storesList?.length) {
    // Outlet store → apply master's outletPolicy
    const masterStore = tenantDetails.storesList.find((s) => s.isMaster);
    const outletPolicy = masterStore?.storeDetails?.outletPolicy;
    setUserPermissions(
      applyOutletPolicy(userRole.permissions, outletPolicy, false),
    );
  } else {
    // Master store → direct permissions
    setUserPermissions(userRole.permissions);
  }
}
```

---

## 5. UI Permission Checks

Permissions are consumed via `PlatformGlobalDataContext`:

```typescript
const { userPermissions } = useContext(PlatformGlobalDataContext);

// Hide feature entirely (doctrine: silence is a feature)
if (!userPermissions?.canManageOutlets) return null;
```

### Where Permissions Gate UI

| Permission         | UI Component                     | Gate Effect |
| ------------------ | -------------------------------- | ----------- |
| `canManageOutlets` | LocationsPage, Add Outlet button | Hidden      |
| `canSwitchStores`  | Desktop header StoreSwitcher, mobile More Branch dropdown, billing store pickers | Hidden unless user has more than one active mapped store |
| `canAccessBilling` | Billing pages, pricing links     | Hidden      |
| `canManageMenu`    | Editor toolbar, menu management  | Hidden      |
| `canPublishMenu`   | Publish button                   | Hidden      |
| `canManageUsers`   | Team management section          | Hidden      |
| `canViewAnalytics` | Analytics dashboard              | Hidden      |

---

## 6. Adding New Permissions (Checklist)

**File:** `src/constants/permissions.ts` (header comment, lines 8–16)

1. Add constant in `src/constants/permissions.ts` → `PERMISSION_<CATEGORY>_<ACTION>`
2. Add to `PERMISSIONS` object
3. Add to `ALL_PERMISSIONS` array
4. Add to appropriate `PERMISSION_CATEGORIES` entry
5. Update `RolePermissions` type in `src/types/platform/roles.ts`
6. Update default role permissions in `src/data/defaultRoles.ts`
7. Add label in `src/data/rolesPermissionsInitialData.ts` → `PERMISSION_LABELS`

---

## 7. File Inventory

### Core Permission Files

| File                                       | Purpose                                  | Lines |
| ------------------------------------------ | ---------------------------------------- | ----- |
| `src/types/platform/roles.ts`              | `RolePermissions` + `StoreRoleDataType`  | 69    |
| `src/types/multiOutlet.types.ts`           | `OutletPolicy` + `DEFAULT_OUTLET_POLICY` | 364   |
| `src/constants/permissions.ts`             | Constants, categories, labels            | 209   |
| `src/data/defaultRoles.ts`                 | Factory function + role definitions      | 262   |
| `src/data/rolesPermissionsInitialData.ts`  | UI config, categories, labels            | 128   |
| `src/lib/permissions/applyOutletPolicy.ts` | Outlet policy enforcement                | 71    |
| `src/providers/sessionProvider.tsx`        | Session integration (lines 154–180)      | 229   |

### UI Files Using Permissions

| File                                       | Permission Checked |
| ------------------------------------------ | ------------------ |
| `src/app/(main)/locations/page.tsx`        | `canManageOutlets` |
| `src/components/organisms/AddOutletModal/` | `canManageOutlets` |
| `src/components/molecules/StoreSwitcher/`  | `canSwitchStores` + mapped active stores |
| `src/components/mobile/screens/MobileMoreScreen.tsx` | `canSwitchStores` + mapped active stores |
| `src/components/templates/main-app/billing/` | `canSwitchStores` + mapped active stores |
| `src/components/mobile/screens/MobileBillingScreen.tsx` | `canSwitchStores` + mapped active stores |

### API Files With Permission Checks

| File                                      | What It Validates            |
| ----------------------------------------- | ---------------------------- |
| `src/app/api/outlets/create/route.ts`     | Master user, outlet creation |
| `src/app/api/outlets/deactivate/route.ts` | Master user, deactivation    |
| `src/app/api/auth/switch-store/route.ts`  | Store switching permission and target store mapping |

---

## 8. Firestore Cost Impact

| Operation                            | Reads | Writes |
| ------------------------------------ | ----- | ------ |
| Load user permissions (per session)  | 0     | 0      |
| Apply outlet policy (per session)    | 0     | 0      |
| Create default roles (per new store) | 0     | 1      |
| Update OutletPolicy (master toggle)  | 0     | 1      |

**Note:** Permission resolution is zero-cost because it uses data already loaded in the session context (`storeDetails`, `tenantDetails`). No additional Firestore reads required.

---

## 9. Security Model

### Defense Layers

1. **UI Layer (Client):** Features hidden based on `userPermissions` context
2. **API Layer (Server):** Route handlers validate caller identity and permissions
3. **Firestore Rules:** Not yet implemented for permissions specifically

### Key Security Properties

- **Role is resolved per-request** — Not cached in JWT claims (prevents stale permissions)
- **OutletPolicy is read from tenant context** — Master can update policy, outlets reflect immediately on next session load
- **Always-forced restrictions** — `canManageOutlets`, `canAddStores`, `canAccessBilling`, `canManageSubscription` are hardcoded `false` for outlet users (cannot be overridden by role)

---

## 10. Testing Checklist

| Test Scenario                                  | Expected Result                       |
| ---------------------------------------------- | ------------------------------------- |
| Owner on master → all features visible         | 23/23 permissions = true              |
| Manager on master → no billing UI              | Billing hidden, menu visible          |
| Staff on master → only chat visible            | All features hidden except chat       |
| Owner on outlet (AI extraction disabled)       | AI extraction button hidden           |
| Owner on outlet → can't see billing            | Billing always hidden for outlets     |
| Manager on outlet → double restriction         | Both role AND policy apply            |
| Master updates outletPolicy → outlet refreshes | Next session load reflects new policy |
| New store created → default roles exist        | 3 roles: owner, manager, staff        |

---

## Version History

| Version | Date         | Changes                                                         |
| ------- | ------------ | --------------------------------------------------------------- |
| 2.0     | Feb 12, 2026 | Complete rewrite from codebase: 23 flags + 15 OutletPolicy      |
| 1.0     | Jan 26, 2026 | Original spec: StaffRole/checkAccess architecture (never built) |
