# Stores Management — Firebase Cost Tracking

**Feature:** Store CRUD & Configuration  
**Status:** ✅ Production Ready  
**Last Updated:** June 11, 2026
**Priority:** MEDIUM — Every store creation triggers 3 writes (store doc + platformSummary sync + store count). Store updates trigger 1-2 writes depending on whether summary fields changed. Rare domain and time-slot actions have additional bounded writes documented below.

> **Scope:** This doc covers store CRUD and configuration ops. For outlet-specific creation (billing + transaction), see [Multi-Outlet Consistency Firebase](../multi-outlet-consistency/multi-outlet-consistency_firebase.md). For role definitions stored on store docs, see [Roles & Permissions Firebase](../roles-permissions/roles-permissions_firebase.md).

---

## Summary

- **Collections Used:** `stores`, `tenants`, `platformSummary` (storesSummary + summary)
- **Storage Buckets:** `stores/logos/{storeId}` (logo images)
- **Cloud Functions:** None
- **Estimated Monthly Cost:** **Very Low** — Admin-only operations, infrequent

---

## Firestore Operations

### Reads

| Operation                 | Collection                      | Trigger                                  | Frequency         | Docs Read       | Indexed?         | Notes                                                                       |
| ------------------------- | ------------------------------- | ---------------------------------------- | ----------------- | --------------- | ---------------- | --------------------------------------------------------------------------- |
| List all stores           | `stores`                        | Platform admin opens Stores tab          | Per admin session | All store docs  | Yes              | Admin view loads all stores. Paginated if >50.                              |
| List all tenants          | `tenants`                       | Platform admin opens Tenants tab         | Per admin session | All tenant docs | Yes              | Admin view loads all tenants.                                               |
| Get single store          | `stores/{storeId}`              | Admin opens store details / session load | Per store click   | 1               | Direct doc       | Full store document with all settings, roles, outletPolicy.                 |
| Get tenant stores         | `stores` (query)                | Admin opens tenant details               | Per tenant click  | 1-10            | Yes (`tenantId`) | Query filtered by tenantId.                                                 |
| Get stores summary        | `platformSummary/storesSummary` | Cloud Functions, platform entity block store selector, summary-backed public filters | Per batch job / admin block flow | 1 | Direct doc | Single doc with all stores' essential fields. See Summary Document Pattern. |
| Check custom domain       | `stores`                        | Owner checks a domain before connecting  | Rare              | 0-1             | Yes (`customDomain`, `active`) | Client-side availability check; server API re-checks before writing. |
| Verify custom domain      | `stores/{storeId}`              | `GET /api/domain`                        | Owner click / screen open | 1 | Direct doc | Reads current domain state, then calls Vercel. Writes only when verification flips true. |
| Cascade edited time preset | `projects/{tId}/{sId}`         | Owner edits an existing time-slot preset | Rare              | N current-store project docs | Path-scoped | Needed because category visibility stores copied preset times for public rendering without an extra store read. |

### Writes

| Operation                 | Collection                        | Trigger                        | Frequency               | Docs Written | Fields                                                                 | Notes                                                                                   |
| ------------------------- | --------------------------------- | ------------------------------ | ----------------------- | ------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Create store              | `stores/{storeId}`                | `addStore()`                   | Per new store           | 1            | Full store doc (business info, hours, roles, timeSlotPresets, etc.)    | Includes `createDefaultRoles()` output (3 roles) as part of the doc.                    |
| Sync store to summary     | `platformSummary/storesSummary`   | `addStore()` / summary-relevant `updateStore()` | Per store create / relevant edit | 1 | `stores.{storeId}` (tId, businessType, businessCategory, active, name, route/ops fields) | `syncStoreToSummary()` maintains lightweight summary for Cloud Functions and public filters. |
| Update store count        | `platformSummary/default`         | `addStore()` (non-onboarding)  | Per new store           | 1            | `stores.count` (increment)                                             | `updateStoresCountInPlatformSummary()`. Skipped during onboarding (handled separately). |
| Update store settings     | `stores/{storeId}`                | Owner/admin saves changes      | Per edit                | 1            | Merge update                                                           | Business profile, location, hours, SEO, analytics, publicPresence, PWA, POS, etc. Calls public cache revalidation after save. |
| Connect custom domain     | `stores/{storeId}`                | `POST /api/domain`             | Rare                    | 1            | `customDomain`, `domainVerified`, `domainAddedAt`                      | Server route revalidates `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`. |
| Verify custom domain      | `stores/{storeId}`                | `GET /api/domain` when Vercel reports configured | Rare | 0-1 | `domainVerified`, `domainVerifiedAt` | Writes only on false -> true transition, then revalidates all public store tags. |
| Remove custom domain      | `stores/{storeId}`                | `DELETE /api/domain`           | Rare                    | 1            | Deletes domain fields                                                  | Removes local routing fields even if Vercel cleanup fails; revalidates all public store tags. |
| Save time-slot presets    | `stores/{storeId}`                | Desktop/mobile time-slot editor | Rare                   | 1            | `timeSlotPresets`, `modifiedOn`                                        | No public cache invalidation by itself; store presets are owner configuration. |
| Cascade edited time preset | `projects/{tId}/{sId}/{projectId}` | Editing an existing preset that assigned categories reference | Rare | 0-N changed project docs | Category `timeSlots[].startTime/endTime` | Revalidates public project/store cache for each changed project so category visibility matches the edited preset. |
| Delete time preset refs   | `projects/{tId}/{sId}/{projectId}` | Deleting a preset assigned to categories | Rare | 0-N changed project docs | Removes matching category `timeSlots[]` entries | Existing cleanup path; revalidates each changed project. |
| Sync tenant block state   | `platformSummary/storesSummary` | `POST /api/platform/entity-blocks` tenant flow | Per tenant block/unblock | 1 | `stores.{storeId}.tenantBlocked` for stores under the tenant | Keeps summary-backed public filters aligned with tenant-level blocks without changing each store's direct `blocked` state. |
| Create tenant             | `tenants/{tId}`                   | Admin creates tenant           | Per new tenant          | 1            | Full tenant doc                                                        | Billing container, subscription info, storesList.                                       |
| Update tenant             | `tenants/{tId}`                   | Admin updates tenant           | Per edit                | 1            | Merge update                                                           | Subscription, plan, limits, storesList. Tenant name changes can trigger store-cache revalidation through tenant DAL. |
| Upload logo               | Storage: `stores/logos/{storeId}` | Admin/owner uploads logo       | Per upload              | 1 object     | Prepared image URL                                                     | `uploadPreparedMediaImage()` called within `addStore()` / `updateStore()`.              |

### Deletes

| Operation         | Collection         | Trigger                 | Frequency | Docs Deleted     | Soft/Hard              | Notes                                                   |
| ----------------- | ------------------ | ----------------------- | --------- | ---------------- | ---------------------- | ------------------------------------------------------- |
| Soft delete store | `stores/{storeId}` | Admin deactivates store | Rare      | 0 (field update) | Soft (`active: false`) | Never hard delete. Summary synced with `active: false`. |

---

## Write Cascade per Operation

| User Action                       | Firestore Writes                       | Storage Writes | Total |
| --------------------------------- | -------------------------------------- | -------------- | ----- |
| **Create store** (non-onboarding) | 3 (store + summary sync + store count) | 0–1 (logo)     | 3–4   |
| **Create store** (onboarding)     | 2 (store + summary sync)               | 0–1 (logo)     | 2–3   |
| **Update store** (summary fields) | 2 (store + summary sync)               | 0-1 (logo)     | 2-3   |
| **Update store** (non-summary fields) | 1 (store only)                      | 0-1 (logo/media) | 1-2 |
| **Connect/remove custom domain**  | 1 store write                          | 0              | 1     |
| **Verify custom domain**          | 0-1 store write                        | 0              | 0-1   |
| **Edit time-slot preset**         | 1 store write + 0-N project writes     | 0              | 1+    |
| **Deactivate store**              | 2 (store + summary sync)               | 0              | 2     |

---

## Cost Estimate

Negligible — admin operations only, <100 operations/month typically. Under $0.01/month.

---

## DAL Functions Used

| Function                             | File                                    | Operation Type           | Reads | Writes |
| ------------------------------------ | --------------------------------------- | ------------------------ | ----- | ------ |
| `getAllStores`                       | `src/database/stores/index.tsx`         | Read (getDocs)           | N     | 0      |
| `getAllStoresByTenantId`             | `src/database/stores/index.tsx`         | Read (query)             | 1–10  | 0      |
| `getStoreById`                       | `src/database/stores/index.tsx`         | Read (getDoc)            | 1     | 0      |
| `addStore`                           | `src/database/stores/index.tsx`         | Write (setDoc + syncs)   | 0     | 3      |
| `updateStore`                        | `src/database/stores/index.tsx`         | Write (updateDoc + conditional sync + cache invalidation) | 0-1 | 1-2 |
| `updateTimeSlotPresets`              | `src/database/stores/index.tsx`         | Write (setDoc merge) | 0 | 1 |
| `updatePresetInAllCategories`        | `src/database/projects/index.ts`        | Read/write cascade within current store projects | N | 0-N |
| `removePresetFromAllCategories`      | `src/database/projects/index.ts`        | Read/write cleanup within current store projects | N | 0-N |
| `syncStoreToSummary`                 | `src/database/platformSummary/index.ts` | Write (setDoc merge)     | 0     | 1      |
| `POST /api/platform/entity-blocks` | `src/app/api/platform/entity-blocks/route.ts` | Platform block mutation  | 1-2 plus fallback store query if summary missing | 1-2 |
| `POST/GET/DELETE /api/domain`        | `src/app/api/domain/route.ts`           | Custom domain management | 0-2 plus Vercel call | 0-1 |
| `updateStoresCountInPlatformSummary` | `src/database/platformSummary/index.ts` | Write (increment)        | 0     | 1      |

## Public Cache Invalidation

Public-facing store truth writes must invalidate all public truth packets:

- `menu-store-{storeId}`
- `store-{storeId}`
- `client-stores`

Verified paths:

- `updateStore()` calls `revalidatePublicClientCache(storeId, "updateStore")`, which posts to `/api/revalidate/menu`.
- `/api/domain` uses `revalidateMenuCache(storeId, { tId })` after add, verified-state write, and remove.
- `/api/store/temp-status` revalidates all three tags after set/clear.
- `/api/platform/entity-blocks` revalidates all three tags for affected store blocks and tenant-block affected stores.
- Edited/deleted time-slot presets revalidate per changed project through `revalidatePublicClientCacheForProject()`.

The API-owned custom-domain path should not call `updateStore()` from the UI after the API succeeds; the desktop tab updates local state only to avoid duplicate store writes.
