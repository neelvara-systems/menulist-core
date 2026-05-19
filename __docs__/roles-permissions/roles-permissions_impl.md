# Roles & Permissions — Technical Implementation

**Status:** ✅ Staff CRUD + permissions wired end-to-end | **Last Updated:** May 19, 2026

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
| Staff force sign-out API (`/api/staff/force-signout`) | ✅ Done |
| Session access check API (`/api/auth/access-status`) | ✅ Done |
| Self-service password/passcode change API (`/api/auth/change-password`) | ✅ Done |
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
        // ... all 29 permissions = true
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
| `src/lib/permissions/permissionRequirements.ts`       | ✅ OK  |
| `src/lib/permissions/server.ts`                       | ✅ OK  |
| `src/lib/permissions/applyOutletPolicy.ts`            | ✅ OK  |
| `src/lib/staffManagement/server.ts`                   | ✅ OK  |
| `src/lib/staffManagement/client.ts`                   | ✅ OK  |
| `src/app/api/staff/route.ts`                          | ✅ OK  |
| `src/app/api/staff/password-reset/route.ts`            | ✅ OK  |
| `src/app/api/staff/force-signout/route.ts`             | ✅ OK  |
| `src/app/api/auth/access-status/route.ts`              | ✅ OK  |
| `src/app/api/auth/change-password/route.ts`            | ✅ OK  |
| `src/app/api/staff/roles/route.ts`                    | ✅ OK  |
| `src/app/api/onboarding/create-subscription/route.ts` | ✅ OK  |
| `src/lib/staffManagement/shareLoginDetails.ts`        | ✅ OK  |
| `src/components/templates/main-app/users/StaffLoginDetailsContent.tsx` | ✅ OK |
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

## 8. Total Permission Count: 29

All permissions defined in `src/constants/permissions.ts` → `ALL_PERMISSIONS` array.

Categories:

- **Billing & Subscription** (2): `canAccessBilling`, `canManageSubscription`
- **Team Management** (2): `canManageUsers`, `canAssignRoles`
- **Store Management** (6): `canManageStore`, `canManagePublicPresence`, `canManageIntegrations`, `canAddStores`, `canManageOutlets`, `canSwitchStores`
- **Menu Management** (8): `canManageMenu`, `canPublishMenu`, `canManageMenuSharing`, `canManageMenuDesign`, `canManageDigitalScreens`, `canUseMenuExtraction`, `canGenerateDescriptions`, `canGenerateImages`
- **Outlet Customization** (5): `canOverrideTheme`, `canOverrideBrandIdentity`, `canOverrideLayout`, `canAddLocalCategories`, `canAddLocalItems`
- **Pricing** (1): `canOverridePrices`
- **Analytics** (2): `canViewAnalytics`, `canExportData`
- **Customer** (3): `canManageChat`, `canManageFeedback`, `canViewCustomerData`

---

## 9. Staff CRUD Runtime Contract

### API Endpoints

| Endpoint | Method | Purpose | Required Permission |
| --- | --- | --- | --- |
| `src/app/api/staff/route.ts` | `GET` | List active staff for a store | `canManageUsers` |
| `src/app/api/staff/route.ts` | `POST` | Create staff or add same-tenant staff to a store | `canManageUsers`; `canAssignRoles` for non-Staff role assignment |
| `src/app/api/staff/route.ts` | `PATCH` | Update staff profile, active state, default store, store mappings, roles; mirror active state to Firebase Auth disabled state | `canManageUsers`; `canAssignRoles` when mappings/roles change |
| `src/app/api/staff/route.ts` | `DELETE` | Remove staff from current store; soft-delete and disable Firebase Auth if no stores remain | `canManageUsers` |
| `src/app/api/staff/password-reset/route.ts` | `POST` | Create a one-time temporary staff passcode for email, Staff ID, or phone login | `canManageUsers` |
| `src/app/api/staff/force-signout/route.ts` | `POST` | Revoke an active staff session without deactivating the account | `canManageUsers` |
| `src/app/api/auth/access-status/route.ts` | `GET` | Fresh server-side account/tenant/store/session revocation check used by the dashboard monitor | Active authenticated session |
| `src/app/api/auth/change-password/route.ts` | `POST` | Let the currently signed-in owner or staff member change their own password/passcode after current password verification | Active authenticated session |
| `src/app/api/staff/roles/route.ts` | `POST/PATCH` | Create or update role definition | `canAssignRoles` |
| `src/app/api/staff/roles/route.ts` | `DELETE` | Deactivate role definition | `canAssignRoles` |
| `src/app/api/analytics/*/route.ts` | `GET` | Owner analytics reads backed by GA APIs | `canViewAnalytics` |
| `src/app/api/domain/route.ts` | `GET/POST/DELETE` | Custom domain status, attach, remove | `canManagePublicPresence` |
| `src/app/api/subdomain/check/route.ts` | `GET` | Owner subdomain availability check | `canManagePublicPresence` |
| `src/app/api/pos-sync/test/route.ts` | `POST` | Test POS webhook connectivity | `canManageIntegrations` |
| `src/app/api/pos-sync/deliver/route.ts` | `POST` | Deliver menu snapshot to configured POS webhook | `canManageIntegrations` or `canPublishMenu` |

### Server Guards

- `withAuth()` wraps every staff/role API route.
- Tenant ID must match the authenticated session unless the session is platform admin.
- Non-master store users can only manage their own store.
- Master store users can manage staff mappings inside the same tenant.
- Store mappings are validated against real store documents and active role definitions.
- Staff list/create repairs legacy stores that are missing default `owner` / `manager` / `staff` role definitions and normalizes missing permission keys on existing default roles. Custom roles keep missing permission keys denied.
- The `owner` role definition is locked from edits/deactivation.
- Last active owner protection prevents removing/demoting/deactivating the only owner for a store.
- Protected API routes reject sessions whose user is inactive, unverified, deleted, or platform-blocked.
- The app shell runs `SessionExpiryMonitor`, which checks `/api/auth/access-status` on focus and every 30 seconds while visible. It signs out the browser when `sessionRevokedAt`, `active`, `deleted`, direct user block, tenant block, or store block invalidates access.

### Staff Access Revocation Contract

- **Sign out staff:** writes `sessionRevokedAt`, `sessionRevokedBy`, `sessionRevokedReason: "owner_force_signout"`, and `authTokensRevokedAt`; calls Firebase Auth `revokeRefreshTokens()`. The Firebase Auth account stays enabled, so the staff member can sign in again with current credentials.
- **Deactivate staff:** writes the same session revocation fields, sets `authDisabled: true`, and disables Firebase Auth. Reactivation re-enables Firebase Auth but does not clear `sessionRevokedAt`, so old sessions stay invalid.
- **Remove last store mapping:** soft-deletes the user, revokes sessions, disables Firebase Auth, and preserves the Firestore user document for audit history.
- **Owner passcode reset:** updates Firebase Auth password, revokes refresh tokens, writes `sessionRevokedAt`, and returns the temporary passcode once. No passcode is stored in Firestore.
- **Self-service password/passcode change:** a signed-in owner or staff member can change their own password/passcode after current password verification. The route is protected by `withAuth()`, `AUTH_SENSITIVE` rate limiting, Zod validation, and secure logging. It updates Firebase Auth and writes `passwordChangedAt` to the user document.
- **One-time login sharing:** desktop and mobile login-detail popups let owners copy Staff ID, copy passcode, copy both details, use the native browser share sheet when `navigator.share` exists, or open WhatsApp Web with a prefilled login message. If the staff phone number is saved, WhatsApp Web opens with that number in the URL. This is client-only and does not create extra Firebase reads or writes.
- **Platform user block:** sets `blocked` / `blockDetails`, disables Firebase Auth, revokes sessions, and is enforced by the same access-status route. Tenant/store blocks are inherited at login/session refresh and checked fresh by `/api/auth/access-status`.
- **Business A to business B:** user documents are tenant-scoped. A staff member leaving business A should be removed/deactivated there. Business B creates a new staff account. Personal email reuse across tenants stays blocked until a platform-owned transfer flow is built because `getAuthUserByEmail()` assumes a single user document per email.

### UI Wiring

| Surface | Files | Contract |
| --- | --- | --- |
| Desktop staff | `src/components/templates/main-app/users/usersList/*` | Loads staff through `fetchStaffUsers()`, creates through `createStaffUser()`, updates through `updateStaffUser()`, removes through `removeStaffFromStore()`, signs out active staff through `forceSignOutStaffUser()` |
| Desktop roles | `src/components/templates/main-app/users/permissions/*` | Saves through `saveRoleDefinition()` |
| Desktop app guard | `src/components/auth/OwnerPermissionGuard.tsx` | Blocks direct route access for protected owner pages after permissions resolve |
| Desktop navigation | `src/components/organisms/sidebar/*` | Uses `permissionRequirements.ts` so hidden navigation and direct route guard share the same route contract |
| Mobile staff | `src/components/mobile/screens/MobileUsersScreen.tsx` | Uses the same staff client helpers as desktop, including force sign-out |
| Mobile roles | `src/components/mobile/screens/MobileRolesScreen.tsx` | Uses the same role client helpers as desktop |
| Mobile app shell | `src/components/mobile/MobileShell.tsx`, `MobileNavigation.tsx` | Filters bottom tabs by role permissions and falls back to More when a tab is not available |
| Mobile More | `src/components/mobile/screens/MobileMoreScreen.tsx` | Filters sub-screens by the same permission taxonomy and blocks direct hash/sub-screen access |
