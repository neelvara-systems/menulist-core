# Multi-Chain Permissions — Firebase Cost Tracking

**Feature:** Two-Layer Access Control (23 RolePermissions + 15 OutletPolicy)  
**Status:** ✅ Production Ready  
**Last Updated:** February 13, 2026  
**Priority:** LOW — Permission resolution is zero-cost (uses cached session data). Only OutletPolicy edits cost writes.

> **Scope:** This doc covers Firebase ops for the two-layer permission model. For role CRUD and user assignment ops, see [Roles & Permissions Firebase](../roles-permissions/roles-permissions_firebase.md). For store onboarding ops (which create default roles), see [Multi-Outlet Consistency Firebase](../multi-outlet-consistency/multi-outlet-consistency_firebase.md).

---

## Summary

- **Collections Used:** `stores` (roles array + outletPolicy field)
- **Storage Buckets:** None
- **Cloud Functions:** None
- **Estimated Monthly Cost:** **$0.00 – $0.01** — Permission resolution is zero-cost; only OutletPolicy edits trigger writes

---

## Firestore Operations

### Reads

| Operation                            | Collection               | Trigger                         | Frequency         | Docs Read | Notes                                                                                                                        |
| ------------------------------------ | ------------------------ | ------------------------------- | ----------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Resolve user permissions             | —                        | Session load                    | Per login/refresh | 0         | Uses `storeDetails.roles` and `tenantDetails.storesList` already loaded by `sessionProvider`. No incremental Firestore read. |
| Apply outlet policy                  | —                        | Session load (outlet users)     | Per login/refresh | 0         | `applyOutletPolicy()` uses in-memory data from session context. No read.                                                     |
| Validate master before policy update | `stores/{masterStoreId}` | Owner toggles OutletPolicy flag | Per toggle (rare) | 1         | `updateOutletPolicy()` reads store doc to verify `isMaster: true` before writing.                                            |

### Writes

| Operation            | Collection               | Trigger                                           | Frequency         | Docs Written | Fields                                               | Notes                                                                                                                                                                                                         |
| -------------------- | ------------------------ | ------------------------------------------------- | ----------------- | ------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Update outlet policy | `stores/{masterStoreId}` | Owner toggles policy flag in Chain Control Panel  | Rare (setup only) | 1            | `outletPolicy` (merged object with 15 boolean flags) | `updateOutletPolicy()` in `src/database/multiOutlet/index.ts`. Validates `isMaster` before write.                                                                                                             |
| Create default roles | `stores/{newStoreId}`    | New store created (onboarding or outlet creation) | Per new store     | 0            | —                                                    | Roles are part of the store doc created by `addStore()` or outlet creation route. No separate write — included in the store creation write. See stores-management and multi-outlet-consistency firebase docs. |

### Deletes

None — permissions and policies are toggled, never deleted.

---

## Data Storage Map

| Data                                  | Location                              | Size                      | Notes                                                      |
| ------------------------------------- | ------------------------------------- | ------------------------- | ---------------------------------------------------------- |
| Role definitions (3 default + custom) | `stores/{storeId}.roles[]`            | ~2KB per role × 3–5 roles | Array of `StoreRoleDataType` with 23 permission flags each |
| User's role assignment                | `users/{userId}.stores[].role`        | ~20 bytes                 | Role ID string (e.g., `"owner"`, `"manager"`)              |
| Outlet policy (15 flags)              | `stores/{masterStoreId}.outletPolicy` | ~200 bytes                | Only on master store. `OutletPolicy` object.               |

---

## Cost Estimate

| Operation                                                          | Reads/mo | Writes/mo | Cost              |
| ------------------------------------------------------------------ | -------- | --------- | ----------------- |
| Permission resolution (per session)                                | 0        | 0         | $0.00             |
| OutletPolicy edits (per chain, ~15 initial toggles + rare changes) | ~15      | ~15       | < $0.01           |
| **Total**                                                          |          |           | **< $0.01/month** |

**Why so cheap:** Permission resolution reuses data already loaded in session context (`storeDetails`, `tenantDetails`). The only incremental Firebase cost is when a master owner edits the OutletPolicy via the Chain Control Panel.

---

## DAL Functions Used

| Function             | File                                       | Operation Type                         | Reads | Writes |
| -------------------- | ------------------------------------------ | -------------------------------------- | ----- | ------ |
| `updateOutletPolicy` | `src/database/multiOutlet/index.ts`        | Read (validate) + Write (merge)        | 1     | 1      |
| `applyOutletPolicy`  | `src/lib/permissions/applyOutletPolicy.ts` | In-memory (no Firebase)                | 0     | 0      |
| `createDefaultRoles` | `src/data/defaultRoles.ts`                 | In-memory (returns array, no Firebase) | 0     | 0      |
