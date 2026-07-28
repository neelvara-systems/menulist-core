# Stores Management — Firebase Cost Tracking

> **July 14, 2026 platform block post-commit boundary:** tenant/store block transactions remain the authoritative write boundary. Existing menu/store/client/screen cache tags, Digital Screens touches, and assistant-packet invalidations now run through bounded all-settled fanout after commit, so a failed derived effect neither falsely fails saved block truth nor stops later tenant stores. Successful Firestore operation counts and deployment targets are unchanged.

**Feature:** Store CRUD & Configuration  
**Status:** Firebase cost evidence; not current launch certification
**Last Updated:** July 1, 2026
**Priority:** MEDIUM — Manual store creation reserves the global counter, then atomically writes the store, summary row, and tenant-list mirror. Summary-relevant store updates atomically write the store and summary, plus the tenant-list mirror when name identity changes. Store-output fields can also touch an initialized Digital Screen version after public cache revalidation. Rare domain and time-slot actions have additional bounded writes documented below.

> **Scope:** This doc covers store CRUD and configuration ops. For outlet-specific creation (billing + transaction), see [Multi-Outlet Consistency Firebase](../multi-outlet-consistency/multi-outlet-consistency_firebase.md). For role definitions stored on store docs, see [Roles & Permissions Firebase](../roles-permissions/roles-permissions_firebase.md).
>
> **Launch Boundary:** This file records Stores Management Firebase cost evidence, not current production-launch approval. Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, store CRUD/browser QA, domain verification smoke where changed, public cache evidence for store-output writes, target deploy evidence, and production-host smoke.

---

## Summary

- **Collections Used:** `stores`, `tenants`, `platformSummary` (storesSummary + summary)
- **Storage Buckets:** `stores/logos/{storeId}` (logo images)
- **Cloud Functions:** None
- **Estimated Monthly Cost:** **Very Low** — Admin-only operations, infrequent

### July 11, 2026 browser summary runtime and writer boundary

`getStoresSummary()` costs one direct-document read and parses nested/legacy rows through `src/data/shared/storeSummaryBoundary.ts` instead of casting raw Firestore data to `StoresSummary`. The old standalone browser `syncStoreToSummary()` and `mergeStoreSummaryFields()` exports are removed: every active store-summary mutation now writes canonical state and the affected summary slot in its owning transaction. This prevents maintained code or docs from reintroducing a partial canonical-then-summary commit.

Tenant-name propagation now uses `POST /api/tenants/name`. Admission adds one current-store permission read for non-platform owners. The transaction reads one tenant plus a tenant-scoped store query capped at 201, then writes one tenant, up to 200 stores, and at most one `storesSummary` merge. This replaces the prior tenant write + store batch + N independent summary writes and eliminates partial canonical/summary commits. Post-commit menu/store/client-store tags, screen versions and Owner Business Assistant packets run in bounded all-settled chunks; failures are counted and logged but do not stop later effects or falsely fail committed truth. Successful-path Firebase operation counts are unchanged. No new collection, index, rule, Function, Storage, or Firebase deploy is required; the app route remains under the Vercel opt-in boundary.

Manual `addStore()` now reads the target store and current tenant inside one transaction, then creates the canonical store, summary row, and deduplicated tenant-list entry together. Summary-relevant `updateStore()` reads the current store in its transaction and writes canonical plus summary state together; name changes additionally read/update the tenant list from current state. This replaces split browser writes and stale whole-list replacement. Create costs 2 transaction reads plus 3 entity writes after the separate counter reservation; summary edits cost 1 read/2 writes, or 2 reads/3 writes for name identity. No rule, index, Function, Storage, or Firebase deployment source changed.

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
| Check/connect custom domain | `tenants/{tenantId}`, `stores/{storeId}`, deterministic `platformSummary` claim, bounded `stores.customDomain` query | `POST /api/domain` | Rare | 4 reads per reservation transaction; repeated at finalization, plus 2 prior-domain reads on replacement | Existing custom-domain index | Canonical lifecycle/identity and UUID reservation are rechecked around provider work. |
| Verify custom domain      | Same canonical tenant/store/claim/domain-query set | `GET /api/domain` | Owner click / screen open | 4 reads normally; up to 8 when verification changes | Existing custom-domain index | Explicit configured/misconfigured provider truth reconciles both directions; provider errors preserve stored state. |
| Cascade edited time preset | `projects/{tId}/{sId}`         | Owner edits an existing time-slot preset | Rare              | N current-store project docs | Path-scoped | Needed because category visibility stores copied preset times for public rendering without an extra store read. |

### Writes

| Operation                 | Collection                        | Trigger                        | Frequency               | Docs Written | Fields                                                                 | Notes                                                                                   |
| ------------------------- | --------------------------------- | ------------------------------ | ----------------------- | ------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Create store              | `stores/{storeId}`                | `addStore()`                   | Per new store           | 1            | Full store doc (business info, hours, roles, timeSlotPresets, etc.)    | Includes `createDefaultRoles()` output (3 roles) as part of the doc, then requests public cache revalidation for the new store.                    |
| Project store summary     | `platformSummary/storesSummary`   | `addStore()` / summary-relevant `updateStore()` | Per store create / relevant edit | 1 | `stores.{storeId}` (tId, businessType, businessCategory, active, name, route/ops fields) | Written in the same transaction as canonical store state through the shared pure entry builder. |
| Reserve next store ID     | `platformSummary/summary` plus read-only legacy/store-summary floors | `addStore()` (non-onboarding) | Per new store | 3 floor reads + bounded occupied-candidate probes + 1 canonical write | `stores.count` reservation | Retry transaction prevents concurrent reuse; entity creation may leave a safe gap on later failure. Onboarding/outlet creation reserves and creates atomically in their existing Admin transactions. |
| Update store settings     | `stores/{storeId}`                | Owner/admin saves changes      | Per edit                | 1            | Merge update                                                           | Summary-relevant edits commit canonical store and `storesSummary` together. Name/tenant-name edits also update the current tenant-list entry in that transaction before public cache revalidation. |
| Digital Screen store-output touch | `platformSummary/campaigns_{storeId}`, `platformSummary/screen_{storeId}` | `updateStore()` changes rendered screen fields after public cache revalidation | Only when a screen token already exists and rendered fields changed | 0 or 2 | `screen.contentVersion`, `screen.lastContentChangeAt`, safe mirror fields | Store name, logo, currency, route, active/block, special-menu, and plan-attribution changes wake connected screens after cache tags are refreshed. |
| Connect custom domain     | `platformSummary/customDomainClaim_{domain}` + `stores/{storeId}` | `POST /api/domain` | Rare | reservation claim, then store + current claim; replacement adds releasing/released old-claim writes | `customDomain`, new-domain `domainVerified: false`, reservation/current claim metadata | Same-domain retries preserve/reconcile confirmed state; server route revalidates all public store tags and reports derived cleanup/cache pending state. |
| Verify custom domain      | `stores/{storeId}`                | `GET /api/domain` when explicit Vercel state differs | Rare | 0-1 | `domainVerified`, `domainVerifiedAt` | Writes true or false as provider truth changes, then revalidates all public store tags. |
| Remove custom domain      | `platformSummary/customDomainClaim_{domain}` + `stores/{storeId}` | `DELETE /api/domain` | Rare | releasing claim + store, then released claim after successful/404 provider cleanup | Deletes domain fields and records bounded cleanup lease | Duplicate/mismatched valid mappings return `409`; malformed legacy values clear locally with provider cleanup reported skipped. |
| Save time-slot presets    | `stores/{storeId}`                | Desktop/mobile time-slot editor | Rare                   | 1            | `timeSlotPresets`, `modifiedOn`                                        | No public cache invalidation by itself; store presets are owner configuration. |
| Cascade edited/deleted time-slot preset to categories | `projects/{tId}/{sId}/{projectId}` | Desktop/mobile time-slot editor after preset edit/delete | Rare | 0..N | Copied category `timeSlots[]` snapshots | Requires project cascade acknowledgement before local success state; revalidates changed project cache through existing project DAL helper. |
| Cascade edited time preset | `projects/{tId}/{sId}/{projectId}` | Editing an existing preset that assigned categories reference | Rare | 0-N changed project docs | Category `timeSlots[].startTime/endTime` | Revalidates public project/store cache for each changed project so category visibility matches the edited preset. |
| Delete time preset refs   | `projects/{tId}/{sId}/{projectId}` | Deleting a preset assigned to categories | Rare | 0-N changed project docs | Removes matching category `timeSlots[]` entries | Existing cleanup path; revalidates each changed project. |
| Sync tenant block state   | `tenants/{tenantId}`, `platformSummary/storesSummary`, `stores/{storeId}` | `POST /api/platform/entity-blocks` tenant flow | Per tenant block/unblock | 1 tenant + 1 summary + up to 200 existing stores in one transaction | `tenants.blocked/blockDetails`, `stores.{storeId}.tenantBlocked`, direct store `tenantBlocked` / `tenantBlockedSyncedAt` | Exact tenant/store identity is re-read in the transaction; canonical and denormalized state commits together before bounded derived refresh. |
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
| **Create store** (non-onboarding) | 4 (counter reservation + store + summary + tenant list) | 0–1 (logo) | 4–5 |
| **Create store** (onboarding)     | Governed by the dedicated onboarding transaction, including tenant/store/summary/user state | 0–1 (logo) | See onboarding docs |
| **Update store** (summary fields) | 2 (store + summary sync)               | 0-1 (logo)     | 2-3   |
| **Update store** (rendered screen fields, initialized screen) | +2 screen-state writes after cache revalidation | 0 | +2 |
| **Update store** (non-summary fields) | 1 (store only)                      | 0-1 (logo/media) | 1-2 |
| **Connect custom domain**         | 1 reserved claim + 1 store + 1 current claim; replacement adds old releasing/released transitions | 0 | 3 normal, 5 replacement |
| **Remove custom domain**          | 1 releasing claim + 1 store + 1 released claim after acknowledged cleanup | 0 | 3 normal |
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
| `addStore`                           | `src/database/stores/index.tsx`         | Counter reservation plus current-state transaction | 2 plus counter floor/probes | 4 including counter |
| `updateStore`                        | `src/database/stores/index.tsx`         | Current-state canonical/summary transaction plus cache invalidation | 1-2 | 2-3 for summary/name fields; 1 otherwise |
| `updateTimeSlotPresets`              | `src/database/stores/index.tsx`         | Write (setDoc merge) | 0 | 1 |
| `updatePresetInAllCategories`        | `src/database/projects/index.ts`        | Read/write cascade within current store projects | N | 0-N |
| `removePresetFromAllCategories`      | `src/database/projects/index.ts`        | Read/write cleanup within current store projects | N | 0-N |
| `buildStoreSummaryEntry`             | `src/database/platformSummary/index.ts` | Pure projection helper used by owning transactions | 0 | 0 |
| `POST /api/platform/entity-blocks` | `src/app/api/platform/entity-blocks/route.ts` | Platform block mutation after 64KB bounded JSON admission | 1-2 plus tenant-store query for tenant blocks | 1-2 plus affected store docs for tenant blocks |
| `POST/GET/DELETE /api/domain`        | `src/app/api/domain/route.ts`           | Custom domain management | 0-2 plus Vercel call | 0-1 |
| `updateStoresCountInPlatformSummary` | `src/database/platformSummary/index.ts` | Write (increment)        | 0     | 1      |

Custom-domain Vercel calls use the shared `src/lib/domains/vercelDomains.ts` helper. The helper keeps the provider target fixed, URL-encodes the project/domain path segments before add, status, and removal calls, applies manual redirect handling plus a provider timeout, clears the abort timer after each request, and parses Vercel API responses through a 64KB bounded JSON reader. July 5, 2026 Vercel domain provider response parse diagnostics: bounded parser failures now log `vercel_domain_provider_response_parse_failed` with method, path presence/length, query presence, response status, response OK state, max-byte cap, and source error type only before preserving the existing empty-object compatibility fallback. This adds no Firestore reads/writes, no extra Vercel calls, and no cache invalidations beyond the existing `/api/domain` behavior.

Store/user DAL diagnostics add no Firebase operations. Empty tenant/store reads return empty arrays quietly. G-08 subdomain guard failures and blocked post-publish subdomain changes use `src/database/stores/storeDiagnostics.ts` with bounded store/tenant/subdomain metadata and source error name/code/status only. Invalid or changed store/tenant scope fails the atomic transaction. Raw store IDs, tenant IDs, subdomain values, and provider errors are not direct-console logged.

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
- `/api/platform/entity-blocks` revalidates all three tags for affected store blocks and tenant-block affected stores. Tenant block/unblock re-reads the tenant, summary, and both supported tenant-scope fields inside one transaction; conflicting identity fields or more than 200 affected stores fail closed. The transaction commits the tenant block, existing-store `tenantBlocked` mirrors, and the summary mirror together, then runs menu/store/screen/owner-context refreshes in chunks of 20. Public lookup still reads canonical tenant eligibility on cold cache fills, so mirror drift cannot grant public access. Rejected malformed, oversized, ambiguous, or over-limit requests do not partially update canonical or summary state.
- Full browser store-summary projection preserves canonical `tenantBlocked` whenever present, including explicit `false`. Both manual store create and transactional store update pass that field through `buildSummaryDataFromStore()` into `buildStoreSummaryEntry()`, so a new or rebuilt summary row cannot silently lose inherited tenant-block eligibility state.
- `updatePlatformEntityBlockState()` submits `/api/platform/entity-blocks` with no-store cache, same-origin credentials, and manual redirect handling before the existing 64KB acknowledgement parser. This adds no Firestore reads/writes/deletes, Firebase Auth operations, Storage operations, Cloud Function logic changes, cache invalidations, route logic changes, rules, indexes, schema changes, Firebase deploy requirement, or Vercel deploy action.
- `scripts/backfill-store-tenant-block-state.ts` can fill the same `tenantBlocked` mirror for legacy stores. It is dry-run by default and mutates Firestore only with `--write`, matching `--confirm-project`, and a scoped `--tenant-id`, `--store-id`, or explicit `--all-stores`; use `--tenant-id`, `--store-id`, or `--limit` to scope a review run before applying. Each candidate must first reconcile its document ID with every present `storeId`/`sId` alias and reconcile every present `tenantId`/`tId` alias; contradictory or malformed compatibility identity is skipped before tenant lookup or batch admission.
- Edited/deleted time-slot presets revalidate per changed project through `revalidatePublicClientCacheForProject()`.

Firebase Functions callers use `functions/src/logic/publicCacheRevalidation.ts` for server-to-server public cache refreshes after entitlement, special-menu, first-extraction, and menu-derived business-attribute writes. Failed revalidation attempts stay fail-open and log stable `PUBLIC_CACHE_REVALIDATION_*` codes with store/context lengths plus source error name/code/status only.

The API-owned custom-domain path should not call `updateStore()` from the UI after the API succeeds; the desktop tab updates local state only to avoid duplicate store writes. `platformSummary/customDomainClaim_{domain}` is server-owned coordination state: UUID reservations serialize provider work, bounded `releasing` leases precede provider deletion, and released/current transitions are conditional on exact claim ownership. No client or summary document is custom-domain authority.
