# Roles & Permissions — Product Specification

**Feature:** Role-Based Access Control (RBAC)  
**Status:** ✅ Implemented (Feature-Flag Style)  
**Date:** February 13, 2026

> **Scope:** Staff-level permissions (Layer 1). For chain-level outlet restrictions (Layer 2: OutletPolicy), see [Multi-Chain Permissions Spec](../multi-chain-permissions/multi-chain-permissions_spec.md).

---

## 1. Industry Standard Roles

Based on research from SaaS platforms (HubSpot, Square, Intercom) and POS systems:

### 1.1 Recommended Default Roles

| Role        | Description                                  | Who Uses It                      |
| ----------- | -------------------------------------------- | -------------------------------- |
| **Owner**   | Full system access, billing, user management | Business owner, first subscriber |
| **Manager** | Most features, can manage staff, no billing  | Store manager, shift supervisor  |
| **Staff**   | Limited access, day-to-day operations        | Waiter, cashier, kitchen staff   |

### 1.2 Why These 3 Roles?

1. **Simple:** Most small businesses only need 3 levels
2. **Universal:** Same pattern across restaurant, retail, salon industries
3. **Expandable:** Store owners can create custom roles later
4. **Non-overwhelming:** First-time users don't face a complex setup

### 1.3 Alternative Names (Industry Research)

| Our Name | Alternatives Used                     |
| -------- | ------------------------------------- |
| Owner    | Admin, Super Admin, Account Owner     |
| Manager  | Supervisor, Team Lead, Store Manager  |
| Staff    | Employee, Team Member, User, Operator |

**Recommendation:** Stick with **Owner / Manager / Staff** — universally understood.

---

## 2. Permission Matrix (Feature-Flag Style)

### 2.1 Permission Categories

Simple true/false toggles organized by category:

| Category       | Permissions                                                             |
| -------------- | ----------------------------------------------------------------------- |
| 💰 Billing     | `canAccessBilling`, `canManageSubscription`                             |
| 👥 Users       | `canManageUsers`, `canAssignRoles`                                      |
| 🏪 Store       | `canManageStore`, `canAddStores`, `canManageOutlets`, `canSwitchStores` |
| 🍽️ Menu        | `canManageMenu`, `canPublishMenu`                                       |
| 🤖 AI Features | `canUseMenuExtraction`, `canGenerateDescriptions`, `canGenerateImages`  |
| 🎨 Branding    | `canOverrideTheme`, `canOverrideBrandIdentity`, `canOverrideLayout`     |
| 🏗️ Content     | `canAddLocalCategories`, `canAddLocalItems`, `canOverridePrices`        |
| 📊 Analytics   | `canViewAnalytics`, `canExportData`                                     |
| 💬 Customer    | `canManageChat`, `canViewCustomerData`                                  |

### 2.2 Default Role Permissions

| Permission                 | Owner | Manager | Staff |
| -------------------------- | :---: | :-----: | :---: |
| `canAccessBilling`         |  ✅   |   ❌    |  ❌   |
| `canManageSubscription`    |  ✅   |   ❌    |  ❌   |
| `canManageUsers`           |  ✅   |   ✅    |  ❌   |
| `canAssignRoles`           |  ✅   |   ❌    |  ❌   |
| `canManageStore`           |  ✅   |   ✅    |  ❌   |
| `canAddStores`             |  ✅   |   ❌    |  ❌   |
| `canManageOutlets`         |  ✅   |   ❌    |  ❌   |
| `canSwitchStores`          |  ✅   |   ✅    |  ❌   |
| `canManageMenu`            |  ✅   |   ✅    |  ❌   |
| `canPublishMenu`           |  ✅   |   ✅    |  ❌   |
| `canUseMenuExtraction`     |  ✅   |   ❌    |  ❌   |
| `canGenerateDescriptions`  |  ✅   |   ✅    |  ❌   |
| `canGenerateImages`        |  ✅   |   ❌    |  ❌   |
| `canOverrideTheme`         |  ✅   |   ❌    |  ❌   |
| `canOverrideBrandIdentity` |  ✅   |   ❌    |  ❌   |
| `canOverrideLayout`        |  ✅   |   ❌    |  ❌   |
| `canAddLocalCategories`    |  ✅   |   ✅    |  ❌   |
| `canAddLocalItems`         |  ✅   |   ✅    |  ❌   |
| `canOverridePrices`        |  ✅   |   ✅    |  ❌   |
| `canViewAnalytics`         |  ✅   |   ✅    |  ❌   |
| `canExportData`            |  ✅   |   ❌    |  ❌   |
| `canManageChat`            |  ✅   |   ✅    |  ✅   |
| `canViewCustomerData`      |  ✅   |   ✅    |  ❌   |

---

## 3. User Stories

### 3.1 First User (Onboarding)

```
AS A new user completing payment
I WANT to automatically have Owner role
SO THAT I can access all features immediately
```

**Acceptance Criteria:**

- User.stores[0].role = 'owner' (simple role ID)
- Store.roles contains Owner role definition
- Owner has all permissions enabled

### 3.2 Inviting Staff

```
AS A store Owner
I WANT to invite a staff member with limited access
SO THAT they can help with operations without accessing billing
```

**Acceptance Criteria:**

- Owner can select from available roles
- Staff role has pre-configured limited permissions
- Invited user sees only permitted features

### 3.3 Custom Role

```
AS A store Owner
I WANT to create a custom "Kitchen Manager" role
SO THAT I can give menu edit access without user management
```

**Acceptance Criteria:**

- Owner can create new role with custom name
- Owner can toggle individual permissions
- New role appears in role assignment dropdown

---

## 4. Implementation Status ✅

### 4.1 Default Roles on Store ✅ IMPLEMENTED

**Current behavior:**

```typescript
// Onboarding creates user with single role per store
user.stores = [{ storeId: 15, name: 'My Store', role: 'owner' }];

// Store has 3 default role definitions (feature-flag permissions)
store.roles = [
  { id: 'owner', name: 'Owner', permissions: { canAccessBilling: true, ... } },
  { id: 'manager', name: 'Manager', permissions: { canAccessBilling: false, ... } },
  { id: 'staff', name: 'Staff', permissions: { canManageChat: true, ... } }
];
// NOTE: Role IDs are simple strings ('owner', 'manager', 'staff') - no storeId suffix needed
// The storeId is already in the user.stores mapping and store document context
```

### 4.2 Permission Resolution ✅ FIXED

**New behavior:**

- `sessionProvider.tsx` resolves permissions on app load
- `userPermissions` available via React Context globally
- UI can check `userPermissions.canAccessBilling` directly

### 4.3 Role ID Format ✅ SIMPLIFIED

**Current format:**

- Default roles: Simple strings: `owner`, `manager`, `staff`
- Custom roles: `custom-{timestamp}` (e.g., `custom-1706284800000`)

**Why simple IDs (not `owner-{storeId}`):**

- Role definitions are IN each store document (already scoped)
- User role mapping has storeId in same object (no need to duplicate)
- Simpler code, fewer places to generate IDs correctly

---

## 5. Implementation Details

### 5.1 Key Files

| File                                      | Purpose                                        |
| ----------------------------------------- | ---------------------------------------------- |
| `src/types/platform/roles.ts`             | Permission types (feature-flag style)          |
| `src/data/defaultRoles.ts`                | Default role definitions (Owner/Manager/Staff) |
| `src/data/rolesPermissionsInitialData.ts` | Permission labels & categories for UI          |
| `src/lib/permissions/hasPermission.ts`    | Permission check utility                       |
| `src/utils/store/permissions.ts`          | Permission resolution for sessionProvider      |
| `src/providers/sessionProvider.tsx`       | Global permission context                      |

### 5.2 Usage in Code

```typescript
// In any component:
const { userPermissions } = useContext(PlatformGlobalDataContext);

// Simple boolean check:
if (userPermissions.canAccessBilling) {
  // Show billing section
}

if (userPermissions.canManageMenu) {
  // Show edit buttons
}
```

### 5.3 UI Permission Checks (✅ Implemented)

Permissions are consumed via `PlatformGlobalDataContext`:

```tsx
const { userPermissions } = useContext(PlatformGlobalDataContext);

// Features are hidden, not disabled (Doctrine: Silence Is a Feature)
{
  userPermissions.canAccessBilling && <MenuItem>Billing</MenuItem>;
}
{
  userPermissions.canManageMenu && <EditButton />;
}
```

> **Note:** Permission strategies (DENY_STRATEGY / ALLOW_STRATEGY) were removed. Single role per store eliminates the need for conflict resolution.

---

## 6. Success Criteria

| Metric                                   | Status  |
| ---------------------------------------- | ------- |
| Default roles created on new store       | ✅ Done |
| Default roles created on outlet creation | ✅ Done |
| First user assigned Owner role ID        | ✅ Done |
| Permission resolution in sessionProvider | ✅ Done |
| hasPermission() utility                  | ✅ Done |
| UI permissions page updated              | ✅ Done |
| UI feature hiding via context            | ✅ Done |
| Multi-outlet permissions (2 flags)       | ✅ Done |
| Outlet policy enforcement                | ✅ Done |

---

**DOCUMENT STATUS:** ✅ Implemented — 23 Feature-Flag Permissions, 3 Default Roles, Single Role Per Store
