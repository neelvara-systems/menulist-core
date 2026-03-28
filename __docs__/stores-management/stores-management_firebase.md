# Stores Management — Firebase Cost Tracking

**Feature:** Store CRUD & Configuration  
**Status:** ✅ Production Ready  
**Last Updated:** February 13, 2026  
**Priority:** MEDIUM — Every store creation triggers 3 writes (store doc + platformSummary sync + store count). Updates trigger 2 writes (store doc + summary sync).

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

| Operation          | Collection                      | Trigger                                  | Frequency         | Docs Read       | Indexed?         | Notes                                                                       |
| ------------------ | ------------------------------- | ---------------------------------------- | ----------------- | --------------- | ---------------- | --------------------------------------------------------------------------- |
| List all stores    | `stores`                        | Platform admin opens Stores tab          | Per admin session | All store docs  | Yes              | Admin view loads all stores. Paginated if >50.                              |
| List all tenants   | `tenants`                       | Platform admin opens Tenants tab         | Per admin session | All tenant docs | Yes              | Admin view loads all tenants.                                               |
| Get single store   | `stores/{storeId}`              | Admin opens store details / session load | Per store click   | 1               | Direct doc       | Full store document with all settings, roles, outletPolicy.                 |
| Get tenant stores  | `stores` (query)                | Admin opens tenant details               | Per tenant click  | 1–10            | Yes (`tenantId`) | Query filtered by tenantId.                                                 |
| Get stores summary | `platformSummary/storesSummary` | Cloud Functions (batch operations)       | Per batch job     | 1               | Direct doc       | Single doc with all stores' essential fields. See Summary Document Pattern. |

### Writes

| Operation             | Collection                        | Trigger                        | Frequency               | Docs Written | Fields                                                                 | Notes                                                                                   |
| --------------------- | --------------------------------- | ------------------------------ | ----------------------- | ------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Create store          | `stores/{storeId}`                | `addStore()`                   | Per new store           | 1            | Full store doc (business info, hours, roles, timeSlotPresets, etc.)    | Includes `createDefaultRoles()` output (3 roles) as part of the doc.                    |
| Sync store to summary | `platformSummary/storesSummary`   | `addStore()` / `updateStore()` | Per store create/update | 1            | `stores.{storeId}` (tId, businessType, businessCategory, active, name) | `syncStoreToSummary()` — maintains lightweight summary for Cloud Functions.             |
| Update store count    | `platformSummary/summary`         | `addStore()` (non-onboarding)  | Per new store           | 1            | `storesCount` (increment)                                              | `updateStoresCountInPlatformSummary()`. Skipped during onboarding (handled separately). |
| Update store settings | `stores/{storeId}`                | Admin saves changes            | Per edit                | 1            | Merge update (updateDoc)                                               | 10+ setting sections (business info, location, hours, SEO, analytics, etc.)             |
| Sync after update     | `platformSummary/storesSummary`   | `updateStore()`                | Per edit                | 1            | Updated summary fields                                                 | Auto-synced by `updateStore()` after every store update.                                |
| Create tenant         | `tenants/{tId}`                   | Admin creates tenant           | Per new tenant          | 1            | Full tenant doc                                                        | Billing container, subscription info, storesList.                                       |
| Update tenant         | `tenants/{tId}`                   | Admin updates tenant           | Per edit                | 1            | Merge update                                                           | Subscription, plan, limits, storesList.                                                 |
| Upload logo           | Storage: `stores/logos/{storeId}` | Admin uploads logo             | Per upload              | 1            | Base64 → Storage URL                                                   | `uploadBase64ToStorage()` called within `addStore()` / `updateStore()`.                 |

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
| **Update store**                  | 2 (store + summary sync)               | 0–1 (logo)     | 2–3   |
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
| `updateStore`                        | `src/database/stores/index.tsx`         | Write (updateDoc + sync) | 0     | 2      |
| `syncStoreToSummary`                 | `src/database/platformSummary/index.ts` | Write (setDoc merge)     | 0     | 1      |
| `updateStoresCountInPlatformSummary` | `src/database/platformSummary/index.ts` | Write (increment)        | 0     | 1      |
