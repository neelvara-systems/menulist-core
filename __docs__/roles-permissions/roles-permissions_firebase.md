# Roles & Permissions — Firebase Cost Tracking

**Feature:** Staff-Level RBAC (Layer 1)  
**Status:** ✅ Production Ready  
**Last Updated:** June 11, 2026
**Priority:** LOW — Role checks use cached session data. Only role CRUD triggers writes.

> **Scope:** This doc covers Firebase ops for role definitions and user role assignments. For OutletPolicy (Layer 2) ops, see [Multi-Chain Permissions Firebase](../multi-chain-permissions/multi-chain-permissions_firebase.md).

---

## Summary

- **Collections Used:** `stores` (role definitions in `roles[]` array), `users` (role assignment in `stores[].role`)
- **Storage Buckets:** None
- **Cloud Functions:** None
- **API Routes:** `GET/POST/PATCH/DELETE /api/staff`, `POST /api/staff/password-reset`, `POST /api/staff/force-signout`, `GET /api/auth/access-status`, `POST /api/auth/change-password`, `POST/PATCH/DELETE /api/staff/roles`, plus owner permission guards on analytics, domain/subdomain, and POS sync APIs
- **Estimated Monthly Cost:** **₹0.00 to ₹10/month for typical SMB use** — role checks stay in-memory; staff/role admin screens are rare owner actions; authenticated dashboard sessions run a lightweight access check while visible

---

## Data Storage Map

| Data                                  | Location                       | Size                      | Notes                                                                                                           |
| ------------------------------------- | ------------------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Role definitions (3 default + custom) | `stores/{storeId}.roles[]`     | ~2KB per role × 3–5 roles | Array of `StoreRoleDataType`, each with `id`, `name`, `description`, `active`, `permissions` (29 boolean flags) |
| User's role assignment per store      | `users/{userId}.stores[].role` | ~20 bytes per store       | Role ID string (e.g., `"owner"`, `"manager"`, `"staff"`, `"custom-{ts}"`)                                       |

---

## Firestore Operations

### Reads

| Operation                       | Collection | Trigger                  | Frequency         | Docs Read | Notes                                                                                                                                                             |
| ------------------------------- | ---------- | ------------------------ | ----------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resolve user role + permissions | — | Session load | Per login/refresh | 0 incremental | `sessionProvider` uses loaded store/session data. |
| Permission check in UI | — | Any gated feature access | Per feature | 0 | `userPermissions` context set once at session load. |
| Staff list | `users`, `stores` | Staff screen open | Rare | Current-store users + store docs | Server API queries current `users.storeIds array-contains {storeId}` plus legacy `users.storeId == {storeId}` numeric/string variants, filters by tenant, and returns only current-store mappings to non-master managers. Master users also receive all tenant store options for assignment. |
| Legacy default-role repair | `stores/{storeId}` | Staff screen open/create on an old store missing default roles or missing permission keys on existing default roles | One time per legacy store | 1 store | Appends missing `owner` / `manager` / `staff` role definitions and normalizes missing default-role permission keys before staff role validation. |
| Role save validation | `stores`, `users` | Role create/update/deactivate | Rare | 1 store + current-store users when deactivating | Used to validate role and prevent deactivating a role assigned to active staff in the affected store. |
| Copy/share login details | — | Owner copies, native-shares, or opens WhatsApp Web from the one-time login details popup | Rare | 0 | Uses the passcode already returned by create/reset and the selected staff phone number already loaded in the UI. No extra Firestore read. |

### Writes

| Operation                        | Collection         | Trigger                                        | Frequency     | Docs Written | Fields                                | Notes                                                                                                                                                                                     |
| -------------------------------- | ------------------ | ---------------------------------------------- | ------------- | ------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create default roles (new store) | `stores/{storeId}` | Store creation (onboarding or outlet creation) | Per new store | 0            | —                                     | Roles array is part of the store doc write. `createDefaultRoles()` generates the array in-memory; it's written as part of `addStore()` or outlet creation transaction. No separate write. |
| Update role definition           | `stores/{storeId}` | Admin edits role permissions                   | Very rare     | 1            | `roles[]` (merge update on store doc) | Owner changes a role's 29 permission flags via Team Management UI.                                                                                                                        |
| Create custom role               | `stores/{storeId}` | Admin adds new role                            | Very rare     | 1            | `roles[]` (array append on store doc) | New `StoreRoleDataType` with `id: "custom-{timestamp}"`.                                                                                                                                  |
| Backfill/normalize default roles | `stores/{storeId}` | Staff list/create on a legacy store            | One time      | 1            | `roles[]`                             | Adds missing default role IDs and fills missing permission keys on existing default roles. Does not overwrite custom roles or reactivate intentionally inactive default IDs. |
| Assign role to user              | `users/{userId}`   | Admin changes user's role                      | Very rare     | 1            | `stores[].role`                       | Updates the role ID on the user's store entry.                                                                                                                                            |
| Create user with role            | `users/{userId}`   | New user signup/invite                         | Per signup    | 1            | `stores[].role` (+ other user fields) | Role set during user creation. Part of user doc write.                                                                                                                                    |
| Update staff profile/mapping     | `users/{userId}`   | Owner edits staff                              | Rare          | 1            | Profile fields, `active`, `stores[]`, `storeIds[]`, `storeId`, `sessionRevokedAt`, `authDisabled` | Server validates tenant/store/role before writing. Deactivation revokes sessions and is mirrored to Firebase Auth disabled state. |
| Reset staff password/passcode    | `users/{userId}`   | Owner resets staff password or new staff setup | Rare          | 1            | `passwordResetRequestedAt`, `passcodeResetAt`, `staffLoginId`, `loginUsername`, `sessionRevokedAt`, `authTokensRevokedAt` | Owner reset updates Firebase Auth password, revokes existing sessions, and returns a temporary passcode once. MenuList stores only reset metadata, never the passcode. |
| Self-service password/passcode change | `users/{userId}` | Signed-in owner or staff member changes own password/passcode | Rare | 1 | `modifiedOn`, `passwordChangedAt` | Route verifies the current password through Firebase Auth REST, updates Firebase Auth through Admin SDK, and writes only password-change metadata to Firestore. |
| Force sign out staff             | `users/{userId}`   | Owner signs out active staff                   | Rare          | 1            | `sessionRevokedAt`, `sessionRevokedBy`, `sessionRevokedReason`, `authTokensRevokedAt` | Firebase Auth refresh tokens are revoked. The account stays enabled, so staff can sign in again with current credentials. |
| Remove staff from store          | `users/{userId}`   | Owner removes staff                            | Rare          | 1            | `stores[]`, `storeIds[]`, `active`, `deleted`, `deletedAt`, `sessionRevokedAt`, `authDisabled` | If no store mappings remain, the user is deactivated, soft-deleted, signed out, and disabled in Firebase Auth. |
| Session access check             | `users`, `tenants`, `stores` | Authenticated dashboard focus/interval check | While dashboard is open | 1 user + tenant/store docs when present | None | `GET /api/auth/access-status` is no-store. It catches revoked sessions, deleted/inactive users, direct user blocks, tenant blocks, and store blocks. |

### Firestore Rules Boundary

`users/{userId}` direct writes are not part of the owner/staff runtime. Firestore rules allow platform-admin writes only; owner/staff profile updates, password/passcode changes, staff CRUD, role assignment, removal, and session revocation go through authenticated API routes with Admin SDK writes. This prevents direct client edits to `stores[]`, `storeIds[]`, `role`, `active`, or revocation fields.

### Deletes

None — roles are deactivated (`active: false`), never hard-deleted. Staff users are soft-deleted only when the last store mapping is removed; Firebase Auth accounts are disabled and refresh tokens are revoked for blocked/deactivated access but not hard-deleted by the owner UI.

---

## Cost Estimate

Typical SMB estimate: **₹0.00 to ₹10/month**. Permission checks remain in-memory. Staff list reads happen only when an owner opens Team/Staff management and are bounded to users assigned to the current store, including legacy `storeId`-only records; writes happen only on rare staff or role changes. The access-status check is a small authenticated-dashboard safety read while the app is visible. The upper end assumes multiple staff dashboards stay open for long shifts; inactive browser tabs do not run the interval check.

---

## DAL Functions Used

| Function             | File                               | Operation Type               | Reads | Writes |
| -------------------- | ---------------------------------- | ---------------------------- | ----- | ------ |
| `createDefaultRoles` | `src/data/defaultRoles.ts`         | In-memory (returns array)    | 0     | 0      |
| `getActiveSession`   | `src/lib/auth/getActiveSession.ts` | Session cache (no Firestore) | 0     | 0      |
| `updateStore`        | `src/database/stores/index.tsx`    | Write (updateDoc merge)      | 0     | 1      |
