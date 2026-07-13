# Roles & Permissions — Technical Implementation

**Status:** ✅ Staff CRUD + permissions wired end-to-end | **Last Updated:** July 11, 2026

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

Private concurrency state lives at `staffStoreAccessState/{tenantId}_{storeId}`. Its bounded `assignments[]` projection contains only active, unblocked user IDs and their role IDs. Staff creation, mapping/active changes, role mutations, and platform user block/unblock serialize through that document together with the authoritative `users` or `stores` write. The state document is lazy-initialized from compatible numeric/string legacy user mappings and is not client-readable or client-writable under the default-deny Firestore rules boundary.

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
| Desktop Users navigation split (`Users List` + `Roles`) | ✅ Done |
| Desktop staff details/add/edit UI aligned to current staff fields | ✅ Done |
| Staff/role client response parsing bounded and shape-checked | ✅ Done |
| Staff mutation acknowledgements require operation-specific mode + matching returned user/userId before UI state updates | ✅ Done |
| Staff and role target-store eligibility rejects inactive, soft-deleted, or platform-blocked stores | ✅ Done |
| Staff creation, mapping, owner preservation and role edits serialize transactionally | ✅ Done |
| Platform-blocked owners are removed from active owner/role assignment state | ✅ Done |

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

Server-side permission guards in `src/lib/permissions/server.ts` fail closed when the session store is missing, belongs to another tenant, is inactive, is soft-deleted, or is platform-blocked. `normalizeStorePermissionScopeDocumentId()` validates session and explicit tenant/store scope before `stores/{storeId}` permission reads, so malformed, reserved, whitespace-mutated, path-shaped, decimal, zero, negative, unsafe, or nonnumeric scope IDs fail before route-specific writes or provider calls. This applies to `requireAnyStorePermission()`, `requireAnyStorePermissionForStore()`, and `requireAnyStorePermissionForStoreData()` for non-platform sessions, so owner public-truth writers inherit the same blocked-store and document-ID boundary.

Owner AI routes now use the same server guard before expensive work. Text/menu AI routes require `canGenerateDescriptions`; image routes require `canGenerateImages`; public-presence copy routes require `canManagePublicPresence` or `canManageStore`; campaign/Menu Card output routes require the existing menu output permissions; AI pack status requires `canAccessBilling`; weekly narrative requires `canViewAnalytics`.

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
| `src/lib/staffManagement/scopeBoundary.ts`            | ✅ OK — exact persisted/request tenant and store identity normalization |
| `src/lib/staffManagement/concurrencyBoundary.ts`      | ✅ OK — deterministic user creation, access-state initialization and transactional user/role invariants |
| `src/lib/staffManagement/client.ts`                   | ✅ OK — uses 256KB bounded response parsing and staff-list/staff-mutation/role-mutation envelope checks |
| `src/app/api/staff/route.ts`                          | ✅ OK  |
| `src/app/api/staff/password-reset/route.ts`            | ✅ OK  |
| `src/app/api/staff/force-signout/route.ts`             | ✅ OK  |
| `src/app/api/auth/access-status/route.ts`              | ✅ OK  |
| `src/app/api/auth/change-password/route.ts`            | ✅ OK — fixed Firebase Auth verification endpoint builder, encoded API key, manual redirect handling |
| `src/app/api/staff/roles/route.ts`                    | ✅ OK  |
| `src/app/api/onboarding/create-subscription/route.ts` | ✅ OK  |

June 30 security-log boundary: `src/lib/permissions/server.ts` and `src/lib/staffManagement/server.ts` now keep authorization, validation, and rate-limit security breadcrumbs on bounded route/session metadata plus length/count-only permission, role, tenant, store, and label context. They do not import or spread raw `buildSecurityContext()` output into central security events.
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
| `src/app/api/business-copy/route.ts` | `POST` | Generate public business copy | `canManagePublicPresence` or `canManageStore` |
| `src/app/api/campaigns/caption/route.ts` | `POST` | Generate campaign caption copy | `canManageMenuSharing`, `canPublishMenu`, or `canManageMenu` |
| `src/app/api/descriptions/route.ts` | `POST` | Generate or rewrite item descriptions | `canGenerateDescriptions` |
| `src/app/api/new-item-metadata/route.ts` | `POST` | Generate metadata for a new menu item | `canGenerateDescriptions` |
| `src/app/api/translations/route.ts` | `POST` | Generate menu translations | `canGenerateDescriptions` |
| `src/app/api/image-generation/route.ts` | `POST` | Generate a menu item image | `canGenerateImages` |
| `src/app/api/image-editing/route.ts` | `POST` | Edit a menu item image | `canGenerateImages` |
| `src/app/api/image-generation/batch-trigger/route.ts` | `POST` | Start a batch image generation job | `canGenerateImages` |
| `src/app/api/menu-card-export/design-advisor/route.ts` | `POST` | Generate Menu Card layout suggestions | `canManageMenuSharing`, `canPublishMenu`, or `canManageMenu` |
| `src/app/api/seo/route.ts` | `POST` | Generate SEO/public discovery copy | `canManagePublicPresence` or `canManageStore` |
| `src/app/api/ai-packs/status/route.ts` | `GET` | Check AI pack availability/capacity status | `canAccessBilling` |
| `src/app/api/analytics/weekly-narrative/generate-local/route.ts` | `POST` | Generate weekly analytics narrative | `canViewAnalytics` |

### Server Guards

- `withAuth()` wraps every staff/role API route.
- Tenant ID must match the authenticated session unless the session is platform admin.
- Non-master store users can only manage their own store.
- Master store users can manage staff mappings inside the same tenant.
- Staff list payloads are current-store scoped. Non-master managers receive only the current store mapping for each staff member; cross-location staff mappings stay hidden unless the acting user has master authority.
- Store mappings are validated against real, same-tenant, active, not soft-deleted, and not platform-blocked store documents plus active role definitions.
- Staff list target stores and role create/update/deactivate target stores use the same target-store eligibility check before returning users or writing `roles[]`.
- Staff list/create repairs legacy stores that are missing default `owner` / `manager` / `staff` role definitions and normalizes missing permission keys on existing default roles. Custom roles keep missing permission keys denied.
- The `owner` role definition is locked from edits/deactivation.
- Last active owner protection prevents removing/demoting/deactivating the only owner for a store.
- Protected API routes reject sessions whose user is inactive, unverified, deleted, or platform-blocked.
- `users/{userId}` Firestore writes are not a normal client path. Owner/staff profile edits, password changes, role changes, staff mappings, and revocation metadata go through authenticated server APIs; direct Firestore user writes are platform-admin only.
- Staff mutation target user IDs use the shared Firestore document-ID boundary before `users/{userId}` reads. `src/lib/staffManagement/server.ts` validates update, remove, reset-passcode, and force-sign-out `userId` values through `StaffUserIdSchema`, which does not trim `userId` before validation, rejects whitespace-mutated, empty, oversized, path-shaped, or reserved Firestore document IDs, re-normalizes each request into local `targetUserId`, uses `.doc(targetUserId)` for user document reads, and returns mutation acknowledgements with `targetUserId`. Raw `.doc(input.userId)` and `sanitizeStaffUserForAuthority(input.userId, ...)` are excluded by `npm run verify:menulist-api-tenant-safety` and `npm run verify:auth-security-failure-matrix`.
- Staff store refs use `normalizeStaffStoreScopeDocumentId()` before staff list target-store reads, default-role repair writes, and role save/delete `stores/{storeId}` writes. The helper uses the shared Firestore document-ID guard plus exact positive numeric admission, then all store document refs use `.doc(storeScope.documentId)`. Raw `.doc(String(storeId))`, `.doc(String(store.storeId))`, and `.doc(String(input.storeId))` are excluded by `npm run verify:menulist-api-tenant-safety` and `npm run verify:auth-security-failure-matrix`.
- The same exact scope boundary now governs staff session authority, request schemas, persisted `tenantId`, `storeId`, `storeIds[]`, `stores[].storeId`, last-owner checks, role-in-use checks and response filtering. Unsafe integers and coercive representations such as whitespace, leading zeros, signs, exponent notation or decimals are rejected or omitted rather than aliased to another tenant/store. Legacy persisted mappings are normalized into canonical numeric mappings before authorization or rewrite.
- Staff authorization, validation, and rate-limit security events use bounded detail shaping before `logger.security()`. Tenant/store/user IDs, requested/target tenant IDs, role IDs, validation payloads, and request-derived values are logged as presence/length/count metadata instead of raw identifiers.
- Owner AI route permission checks run after bounded body parsing and schema validation where a body exists, and before outlet policy, capacity checks, provider/media work, task fanout, analytics Firestore reads, insight writes, or accounting.
- Desktop staff create/update/list/reset/remove/sign-out failures, mobile staff mutations, desktop/mobile one-time login-detail copy/share failures, and server-side staff Auth, lifecycle, and role-repair breadcrumbs use `src/lib/staffManagement/diagnostics.ts` for bounded diagnostics. Unknown failures show generic owner-facing copy while diagnostics record only operation name, bounded tenant/store/user/action/reason/provider-code metadata, safe presence/count booleans, copy/share result metadata, text/value lengths, and source error name/code/status. Raw staff mutation errors, staff IDs, temporary passcodes, names, emails, phone numbers, generated login messages, server payloads, Firebase Auth missing-user context, password setup provider details, staff lifecycle identifiers, and provider objects are not direct-console logged.
- `src/lib/staffManagement/client.ts` requires operation-specific staff mutation acknowledgements before desktop or mobile staff state updates. Create must return `new_user_created` or `existing_user_added_to_store`; update/reset must return `user_updated`; remove must return `store_mapping_removed` or `user_deactivated`; force sign-out must return `session_revoked`. These calls also require returned `user` and `userId` envelopes, and the returned `user.id` must match `userId`, so a generic `{ success: true }` or mismatched successful envelope is treated as invalid and routed through the existing bounded failure path.
- The app shell runs `SessionExpiryMonitor`, which checks `/api/auth/access-status` on focus and every 30 seconds while visible using same-origin credentials, no-store cache policy, and manual redirect handling. The route applies the shared `DATA_READ` gate before user/tenant/store reads; throttled checks return a no-store `429` without `valid: false`, so the browser does not sign out on throttling. It signs out the browser when the access-status request redirects, or when `sessionRevokedAt`, `active`, `deleted`, direct user block, tenant block, or store block invalidates access.

### Staff Access Revocation Contract

- **Sign out staff:** writes `sessionRevokedAt`, `sessionRevokedBy`, `sessionRevokedReason: "owner_force_signout"`, and `authTokensRevokedAt`; calls Firebase Auth `revokeRefreshTokens()`. The Firebase Auth account stays enabled, so the staff member can sign in again with current credentials.
- **Deactivate staff:** writes the same session revocation fields, sets `authDisabled: true`, and disables Firebase Auth. Reactivation re-enables Firebase Auth but does not clear `sessionRevokedAt`, so old sessions stay invalid.
- **Remove last store mapping:** soft-deletes the user, revokes sessions, disables Firebase Auth, and preserves the Firestore user document for audit history.
- **Every store/role mapping change:** revokes Firebase refresh tokens and writes session-revocation fields, including adding or removing one store while other mappings remain, so an earlier token cannot retain removed claims or miss newly assigned scope.
- **Owner passcode reset:** first reserves one operation in `passcodeResetPending` with a 15-minute lease, then updates Firebase Auth password/revokes refresh tokens, and finally clears only the matching operation while writing audit/session metadata. Concurrent resets return `PASSCODE_RESET_IN_PROGRESS`; provider failure clears only its own reservation; a post-provider audit failure leaves the reservation and still returns the confirmed passcode once. No passcode is stored in Firestore.
- **New staff compensation:** when this request created the Firebase Auth account but the first `users/{userId}` write fails, the route deletes that just-created Auth user. It never deletes a pre-existing Auth identity, and a failed cleanup emits only the bounded `staff_create_auth_compensation_failed` diagnostic.
- **Self-service password/passcode change:** a signed-in owner or staff member can change their own password/passcode after current password verification. The route is protected by `withAuth()`, `AUTH_SENSITIVE` rate limiting, Zod validation, and secure logging. It updates Firebase Auth and writes `passwordChangedAt` to the user document.
- **One-time login sharing:** desktop and mobile login-detail popups let owners copy Staff ID, copy passcode, copy both details, use the native browser share sheet when `navigator.share` exists, or open WhatsApp Web with a prefilled login message. If the staff phone number is saved, WhatsApp Web opens with that number in the URL. Desktop failures log `desktop_staff_login_details_copy_failed`, `desktop_staff_login_details_whatsapp_open_failed`, or `desktop_staff_login_details_native_share_failed`; mobile failures log the matching `mobile_staff_login_details_*` codes. Both surfaces record bounded presence/length metadata only. This is client-only and does not create extra Firebase reads or writes.
- **Platform user block:** first transactionally writes Firestore-authoritative `blocked` / `blockDetails`, session revocation fields, the desired `authDisabled` value, and a unique `authSyncRevision` / `authSyncPending` marker. A bounded reconciliation loop then disables or enables Firebase Auth, revokes refresh tokens while blocked, and clears the pending marker only when the same revision and desired state are still current. Concurrent later block/unblock actions supersede earlier acknowledgements, and provider failure leaves the Firestore block plus pending marker fail-closed for an explicit retry. The same access-status route enforces the Firestore block and session revocation. Tenant/store blocks are inherited at login/session refresh and checked fresh by `/api/auth/access-status`.
- **Business A to business B:** user documents are tenant-scoped. A staff member leaving business A should be removed/deactivated there. Business B creates a new staff account. Personal email reuse across tenants stays blocked until a platform-owned transfer flow is built because `getAuthUserByEmail()` assumes a single user document per email.

### UI Wiring

| Surface | Files | Contract |
| --- | --- | --- |
| Desktop staff | `src/components/templates/main-app/users/usersList/*` | `/users/list` loads current-store staff through `fetchStaffUsers()`, creates through `createStaffUser()`, updates through `updateStaffUser()`, removes through `removeStaffFromStore()`, signs out active staff through `forceSignOutStaffUser()`. Removing staff from the current store removes the row from the current-store list even if the account remains assigned elsewhere. Details drawer opens the profile directly. Add/edit drawer only exposes current staff fields: Staff Details, Store Access, and Permissions. |
| Desktop roles | `src/components/templates/main-app/users/permissions/*` | `/users/permissions` saves through `saveRoleDefinition()` and deactivates roles through `deleteRoleDefinition()`. Custom role creation starts with all permissions off until the owner enables them. |
| Desktop app guard | `src/components/auth/OwnerPermissionGuard.tsx` | Blocks direct route access for protected owner pages after permissions resolve |
| Desktop navigation | `src/constants/navigations.ts`, `src/components/organisms/sidebar/*` | `Users` is a parent navigation item. `Users List` routes to `/users/list`; `Roles` routes to `/users/permissions`. Child items are permission-filtered with the same `permissionRequirements.ts` contract used by direct route guards. |
| Mobile staff | `src/components/mobile/screens/MobileUsersScreen.tsx` | Uses the same staff client helpers as desktop, including add staff, passcode reset, force sign-out, role change, deactivate/reactivate, and current-store removal |
| Mobile roles | `src/components/mobile/screens/MobileRolesScreen.tsx` | Uses the same role client helpers as desktop |
| Mobile app shell | `src/components/mobile/MobileShell.tsx`, `MobileNavigation.tsx` | Filters bottom tabs by role permissions and falls back to More when a tab is not available |
| Mobile More | `src/components/mobile/screens/MobileMoreScreen.tsx` | Filters sub-screens by the same permission taxonomy and blocks direct hash/sub-screen access |
