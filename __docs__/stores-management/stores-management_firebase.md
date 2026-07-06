# Stores Management — Firebase Cost Tracking

**Feature:** Store CRUD & Configuration  
**Status:** Firebase cost evidence; not current launch certification
**Last Updated:** July 1, 2026
**Priority:** MEDIUM — Every store creation triggers 3 writes (store doc + platformSummary sync + store count). Store updates trigger 1-2 writes depending on whether summary fields changed. Store-output fields can also touch an initialized Digital Screen version after public cache revalidation. Rare domain and time-slot actions have additional bounded writes documented below.

> **Scope:** This doc covers store CRUD and configuration ops. For outlet-specific creation (billing + transaction), see [Multi-Outlet Consistency Firebase](../multi-outlet-consistency/multi-outlet-consistency_firebase.md). For role definitions stored on store docs, see [Roles & Permissions Firebase](../roles-permissions/roles-permissions_firebase.md).
>
> **Launch Boundary:** This file records Stores Management Firebase cost evidence, not current production-launch approval. Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, store CRUD/browser QA, domain verification smoke where changed, public cache evidence for store-output writes, target deploy evidence, and production-host smoke.

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
| Create store              | `stores/{storeId}`                | `addStore()`                   | Per new store           | 1            | Full store doc (business info, hours, roles, timeSlotPresets, etc.)    | Includes `createDefaultRoles()` output (3 roles) as part of the doc, then requests public cache revalidation for the new store.                    |
| Sync store to summary     | `platformSummary/storesSummary`   | `addStore()` / summary-relevant `updateStore()` | Per store create / relevant edit | 1 | `stores.{storeId}` (tId, businessType, businessCategory, active, name, route/ops fields) | `syncStoreToSummary()` maintains lightweight summary for Cloud Functions and public filters. |
| Update store count        | `platformSummary/default`         | `addStore()` (non-onboarding)  | Per new store           | 1            | `stores.count` (increment)                                             | `updateStoresCountInPlatformSummary()`. Skipped during onboarding (handled separately). |
| Update store settings     | `stores/{storeId}`                | Owner/admin saves changes      | Per edit                | 1            | Merge update                                                           | Business profile, location, hours, SEO, analytics, publicPresence, PWA, POS, etc. Summary-relevant edits sync `storesSummary` before public cache revalidation so fresh SSR reads cannot refill from stale summary data. |
| Digital Screen store-output touch | `platformSummary/campaigns_{storeId}`, `platformSummary/screen_{storeId}` | `updateStore()` changes rendered screen fields after public cache revalidation | Only when a screen token already exists and rendered fields changed | 0 or 2 | `screen.contentVersion`, `screen.lastContentChangeAt`, safe mirror fields | Store name, logo, currency, route, active/block, special-menu, and plan-attribution changes wake connected screens after cache tags are refreshed. |
| Connect custom domain     | `stores/{storeId}`                | `POST /api/domain`             | Rare                    | 1            | `customDomain`, `domainVerified`, `domainAddedAt`                      | Server route revalidates `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`. |
| Verify custom domain      | `stores/{storeId}`                | `GET /api/domain` when Vercel reports configured | Rare | 0-1 | `domainVerified`, `domainVerifiedAt` | Writes only on false -> true transition, then revalidates all public store tags. |
| Remove custom domain      | `stores/{storeId}`                | `DELETE /api/domain`           | Rare                    | 1            | Deletes domain fields                                                  | Removes local routing fields even if Vercel cleanup fails; revalidates all public store tags. |
| Save time-slot presets    | `stores/{storeId}`                | Desktop/mobile time-slot editor | Rare                   | 1            | `timeSlotPresets`, `modifiedOn`                                        | No public cache invalidation by itself; store presets are owner configuration. |
| Cascade edited/deleted time-slot preset to categories | `projects/{tId}/{sId}/{projectId}` | Desktop/mobile time-slot editor after preset edit/delete | Rare | 0..N | Copied category `timeSlots[]` snapshots | Requires project cascade acknowledgement before local success state; revalidates changed project cache through existing project DAL helper. |
| Cascade edited time preset | `projects/{tId}/{sId}/{projectId}` | Editing an existing preset that assigned categories reference | Rare | 0-N changed project docs | Category `timeSlots[].startTime/endTime` | Revalidates public project/store cache for each changed project so category visibility matches the edited preset. |
| Delete time preset refs   | `projects/{tId}/{sId}/{projectId}` | Deleting a preset assigned to categories | Rare | 0-N changed project docs | Removes matching category `timeSlots[]` entries | Existing cleanup path; revalidates each changed project. |
| Sync tenant block state   | `platformSummary/storesSummary`, `stores/{storeId}` | `POST /api/platform/entity-blocks` tenant flow | Per tenant block/unblock | 1 + affected stores | `stores.{storeId}.tenantBlocked`, direct store `tenantBlocked` / `tenantBlockedSyncedAt` | Keeps summary-backed public filters aligned and lets public store lookup use the denormalized inherited block state without changing each store's direct `blocked` state. |
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
| **Update store** (rendered screen fields, initialized screen) | +2 screen-state writes after cache revalidation | 0 | +2 |
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
| `POST /api/platform/entity-blocks` | `src/app/api/platform/entity-blocks/route.ts` | Platform block mutation after 64KB bounded JSON admission | 1-2 plus tenant-store query for tenant blocks | 1-2 plus affected store docs for tenant blocks |
| `POST/GET/DELETE /api/domain`        | `src/app/api/domain/route.ts`           | Custom domain management | 0-2 plus Vercel call | 0-1 |
| `updateStoresCountInPlatformSummary` | `src/database/platformSummary/index.ts` | Write (increment)        | 0     | 1      |

Custom-domain Vercel calls use the shared `src/lib/domains/vercelDomains.ts` helper. The helper keeps the provider target fixed, URL-encodes the project/domain path segments before add, status, and removal calls, applies manual redirect handling plus a provider timeout, clears the abort timer after each request, and parses Vercel API responses through a 64KB bounded JSON reader. July 5, 2026 Vercel domain provider response parse diagnostics: bounded parser failures now log `vercel_domain_provider_response_parse_failed` with method, path presence/length, query presence, response status, response OK state, max-byte cap, and source error type only before preserving the existing empty-object compatibility fallback. This adds no Firestore reads/writes, no extra Vercel calls, and no cache invalidations beyond the existing `/api/domain` behavior.

Store/user DAL diagnostics add no Firebase operations. Empty tenant/store reads return empty arrays quietly. G-08 subdomain guard failures, blocked post-publish subdomain changes, and missing-tenant summary-sync skips use `src/database/stores/storeDiagnostics.ts` with bounded store/tenant/subdomain metadata and source error name/code/status only. Raw store IDs, tenant IDs, subdomain values, and provider errors are not direct-console logged.

## Public Cache Invalidation

Public-facing store truth writes must invalidate all public truth packets:

- `menu-store-{storeId}`
- `store-{storeId}`
- `client-stores`

Verified paths:

- `addStore()` calls `revalidatePublicClientCache(storeId, "addStore")` after creating the store and syncing `storesSummary`, so newly created manual stores do not wait on the cached public store lookup.
- `/api/onboarding/create-subscription` and `/api/reseller/onboard` call `revalidateMenuCache(storeId, { tId })` after their tenant/store transactions commit, so newly created self-serve and reseller stores refresh public menu, OBP, store, and client-store cache tags before payment/subscription continuation.
- `updateStore()` calls `revalidatePublicClientCache(storeId, "updateStore")`, which posts to `/api/revalidate/menu`.
- `/api/domain` uses `revalidateMenuCache(storeId, { tId })` after add, verified-state write, and remove.
- `/api/store/temp-status` revalidates all three tags after set/clear.
- `/api/platform/entity-blocks` revalidates all three tags for affected store blocks and tenant-block affected stores. Tenant block/unblock also writes `tenantBlocked` to existing affected store docs in batches of 450 so public store lookup can avoid the inherited tenant read after the route has synced the store. Rejected malformed or oversized block requests do not reach entity reads, summary writes, store-doc sync, Auth updates, or cache revalidation.
- `updatePlatformEntityBlockState()` submits `/api/platform/entity-blocks` with no-store cache, same-origin credentials, and manual redirect handling before the existing 64KB acknowledgement parser. This adds no Firestore reads/writes/deletes, Firebase Auth operations, Storage operations, Cloud Function logic changes, cache invalidations, route logic changes, rules, indexes, schema changes, Firebase deploy requirement, or Vercel deploy action.
- `scripts/backfill-store-tenant-block-state.ts` can fill the same `tenantBlocked` mirror for legacy stores. It is dry-run by default and mutates Firestore only with `--write`, matching `--confirm-project`, and a scoped `--tenant-id`, `--store-id`, or explicit `--all-stores`; use `--tenant-id`, `--store-id`, or `--limit` to scope a review run before applying.
- Edited/deleted time-slot presets revalidate per changed project through `revalidatePublicClientCacheForProject()`.

Firebase Functions callers use `functions/src/logic/publicCacheRevalidation.ts` for server-to-server public cache refreshes after entitlement, special-menu, first-extraction, and menu-derived business-attribute writes. Failed revalidation attempts stay fail-open and log stable `PUBLIC_CACHE_REVALIDATION_*` codes with store/context lengths plus source error name/code/status only.

The API-owned custom-domain path should not call `updateStore()` from the UI after the API succeeds; the desktop tab updates local state only to avoid duplicate store writes.
