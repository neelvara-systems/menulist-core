# Multi-Chain Permissions — Firebase Cost Tracking

**Feature:** Two-Layer Access Control (23 RolePermissions + 15 OutletPolicy)  
**Status:** ✅ Production Ready  
**Last Updated:** May 19, 2026
**Priority:** LOW — Permission resolution is zero-cost (uses cached session data). Only OutletPolicy edits cost writes.

> **Scope:** This doc covers Firebase ops for the two-layer permission model. For role CRUD and user assignment ops, see [Roles & Permissions Firebase](../roles-permissions/roles-permissions_firebase.md). For store onboarding ops (which create default roles), see [Multi-Outlet Consistency Firebase](../multi-outlet-consistency/multi-outlet-consistency_firebase.md).

---

## Summary

- **Collections Used:** `stores` (roles array + outletPolicy field)
- **Storage Buckets:** None
- **Cloud Functions:** None
- **Estimated Monthly Cost:** **₹0 – ₹1** at normal usage — Permission resolution is zero-cost; only OutletPolicy edits trigger writes

---

## Firestore Operations

### Reads

| Operation                            | Collection               | Trigger                         | Frequency         | Docs Read | Notes                                                                                                                        |
| ------------------------------------ | ------------------------ | ------------------------------- | ----------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Resolve user permissions             | —                        | Session load                    | Per login/refresh | 0         | Uses `storeDetails.roles` and `tenantDetails.storesList` already loaded by `sessionProvider`. No incremental Firestore read. |
| Apply outlet policy                  | —                        | Session load (outlet users)     | Per login/refresh | 0         | `applyOutletPolicy()` uses in-memory data from session context and falls back to `DEFAULT_OUTLET_POLICY` for non-master stores. |
| Hydrate master outlet policy         | `stores/{masterStoreId}` | Outlet session missing master `storeDetails` | First outlet session only | 0-1 | `sessionProvider` reads the master store once only when `tenantDetails.storesList` has a master summary without hydrated `storeDetails`. |
| Validate master before policy update | `stores/{masterStoreId}` + `tenants/{tId}` | Owner toggles OutletPolicy flag | Per save (rare) | 2         | `/api/outlets/policy` reads store + tenant once to enforce role permission and support legacy single-store master repair. |

### Writes

| Operation            | Collection               | Trigger                                           | Frequency         | Docs Written | Fields                                               | Notes                                                                                                                                                                                                         |
| -------------------- | ------------------------ | ------------------------------------------------- | ----------------- | ------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Update outlet policy | `stores/{masterStoreId}` | Owner saves policy in Chain Control Panel | Rare (setup only) | 1 | `outletPolicy` (merged object with 15 boolean flags) | `updateOutletPolicy()` calls `/api/outlets/policy`; server validates role + master store before write. |
| Legacy master repair | `stores/{masterStoreId}`, `tenants/{tId}`, `platformSummary/storesSummary` | First policy save on legacy single-store tenant | One-time only | 3 | `isMaster`, `storesList[].isMaster`, summary `isMaster` | Only allowed when tenant has exactly one store and no existing master. |
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
| Permission resolution (per session)                                | 0        | 0         | ₹0                |
| Master policy hydration for outlet sessions                        | 0-1      | 0         | < ₹1              |
| OutletPolicy edits (per chain, saved as grouped changes)           | ~1-15    | ~1-15     | < ₹1              |
| One-time legacy master repair                                      | 2        | 3         | < ₹1              |
| **Total**                                                          |          |           | **< ₹1/month**    |

**Why so cheap:** Permission resolution reuses data already loaded in session context (`storeDetails`, `tenantDetails`). The only incremental Firebase cost is one master-store read for outlet sessions that did not already hydrate the master policy, plus rare master owner edits through the Chain Control Panel.

---

## DAL Functions Used

| Function             | File                                       | Operation Type                         | Reads | Writes |
| -------------------- | ------------------------------------------ | -------------------------------------- | ----- | ------ |
| `updateOutletPolicy` | `src/database/multiOutlet/index.ts` → `src/app/api/outlets/policy/route.ts` | Server validate + write | 2 | 1 |
| `applyOutletPolicy`  | `src/lib/permissions/applyOutletPolicy.ts` | In-memory (no Firebase)                | 0     | 0      |
| `createDefaultRoles` | `src/data/defaultRoles.ts`                 | In-memory (returns array, no Firebase) | 0     | 0      |
