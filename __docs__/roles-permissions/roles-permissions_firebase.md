# Roles & Permissions — Firebase Cost Tracking

**Feature:** Staff-Level RBAC (Layer 1)  
**Status:** ✅ Production Ready  
**Last Updated:** February 13, 2026  
**Priority:** LOW — Role checks use cached session data. Only role CRUD triggers writes.

> **Scope:** This doc covers Firebase ops for role definitions and user role assignments. For OutletPolicy (Layer 2) ops, see [Multi-Chain Permissions Firebase](../multi-chain-permissions/multi-chain-permissions_firebase.md).

---

## Summary

- **Collections Used:** `stores` (role definitions in `roles[]` array), `users` (role assignment in `stores[].role`)
- **Storage Buckets:** None
- **Cloud Functions:** None
- **Estimated Monthly Cost:** **$0.00** — Role checks use session-cached data; role edits are rare admin actions

---

## Data Storage Map

| Data                                  | Location                       | Size                      | Notes                                                                                                           |
| ------------------------------------- | ------------------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Role definitions (3 default + custom) | `stores/{storeId}.roles[]`     | ~2KB per role × 3–5 roles | Array of `StoreRoleDataType`, each with `id`, `name`, `description`, `active`, `permissions` (23 boolean flags) |
| User's role assignment per store      | `users/{userId}.stores[].role` | ~20 bytes per store       | Role ID string (e.g., `"owner"`, `"manager"`, `"staff"`, `"custom-{ts}"`)                                       |

---

## Firestore Operations

### Reads

| Operation                       | Collection | Trigger                  | Frequency         | Docs Read | Notes                                                                                                                                                             |
| ------------------------------- | ---------- | ------------------------ | ----------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resolve user role + permissions | —          | Session load             | Per login/refresh | 0         | `sessionProvider` uses `storeDetails.roles` (already loaded with store doc) + `session.user.stores[].role` (already in NextAuth session). Zero incremental reads. |
| Permission check in UI          | —          | Any gated feature access | Per feature       | 0         | `userPermissions` context set once at session load. All UI gating is in-memory.                                                                                   |
| Permission check in API         | —          | API route                | Per request       | 0         | `getActiveSession()` returns cached session with role data. No Firestore read.                                                                                    |

### Writes

| Operation                        | Collection         | Trigger                                        | Frequency     | Docs Written | Fields                                | Notes                                                                                                                                                                                     |
| -------------------------------- | ------------------ | ---------------------------------------------- | ------------- | ------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create default roles (new store) | `stores/{storeId}` | Store creation (onboarding or outlet creation) | Per new store | 0            | —                                     | Roles array is part of the store doc write. `createDefaultRoles()` generates the array in-memory; it's written as part of `addStore()` or outlet creation transaction. No separate write. |
| Update role definition           | `stores/{storeId}` | Admin edits role permissions                   | Very rare     | 1            | `roles[]` (merge update on store doc) | Owner changes a role's 23 permission flags via Team Management UI.                                                                                                                        |
| Create custom role               | `stores/{storeId}` | Admin adds new role                            | Very rare     | 1            | `roles[]` (array append on store doc) | New `StoreRoleDataType` with `id: "custom-{timestamp}"`.                                                                                                                                  |
| Assign role to user              | `users/{userId}`   | Admin changes user's role                      | Very rare     | 1            | `stores[].role`                       | Updates the role ID on the user's store entry.                                                                                                                                            |
| Create user with role            | `users/{userId}`   | New user signup/invite                         | Per signup    | 1            | `stores[].role` (+ other user fields) | Role set during user creation. Part of user doc write.                                                                                                                                    |

### Deletes

None — roles are deactivated (`active: false`), never deleted. User role assignments are changed, never removed.

---

## Cost Estimate

**$0.00/month** — Permission resolution is entirely in-memory using session-cached data. The only writes are rare admin actions (role edits, user assignment), which amount to < 10 writes/month for a typical tenant.

---

## DAL Functions Used

| Function             | File                               | Operation Type               | Reads | Writes |
| -------------------- | ---------------------------------- | ---------------------------- | ----- | ------ |
| `createDefaultRoles` | `src/data/defaultRoles.ts`         | In-memory (returns array)    | 0     | 0      |
| `getActiveSession`   | `src/lib/auth/getActiveSession.ts` | Session cache (no Firestore) | 0     | 0      |
| `updateStore`        | `src/database/stores/index.tsx`    | Write (updateDoc merge)      | 0     | 1      |
