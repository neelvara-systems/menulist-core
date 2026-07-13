# Special Menu Switching — Firebase Cost Tracking

**Status:** ✅ IMPLEMENTED — Active behind `ENABLE_SPECIAL_MENU_SWITCHING`; expansion remains governed by `__docs__/constitution/14-feature-lifecycle-doctrine.md`
**Author:** Cascade (Lead Architect)
**Date:** February 20, 2026
**Audience:** Founder, Cost Control

---

## Collections Touched

| Collection                       | New?          | Purpose                                                      |
| -------------------------------- | ------------- | ------------------------------------------------------------ |
| `projects/{tId}/{sId}`           | No — existing | Special menu projects stored here (same as regular projects) |
| `platformSummary/projects_{sId}` | No — existing | Special menu metadata in summary for dashboard display       |
| `stores/{sId}`                   | No — existing | `activeSpecialMenuId` field (mode derived from project doc)  |

**Zero new collections.** This feature reuses existing project infrastructure entirely.

---

## Firestore Reads

| Operation                     | Collection                       | Trigger                            | Frequency                  | Docs Read                                   | Indexed? |
| ----------------------------- | -------------------------------- | ---------------------------------- | -------------------------- | ------------------------------------------- | -------- |
| Create special menu           | `projects/{tId}/{sId}`           | Owner clicks "Create Special Menu" | ~2/store/month             | 2 (base project + summary)                  | Yes      |
| Validate no conflict          | `platformSummary/projects_{sId}` | Before creation                    | ~2/store/month             | 1 (summary doc has all projects)            | N/A      |
| List special menus            | project summary + `stores/{sId}` | Dashboard/mobile cache miss         | Owner usage                | 2 in parallel; SWR dedupes for 30 seconds   | N/A      |
| Resolver check                | `stores/{sId}`                   | Every public page view             | Per page view              | 0 (store data already fetched + cached 60s) | N/A      |
| Resolver load special project | `projects/{tId}/{sId}`           | When special menu is active        | Per page view (cached 60s) | 1 (cached via `unstable_cache`)             | Yes      |
| Nightly lifecycle check       | `platformSummary/projects_{sId}` | Hourly scheduler, per-store nightly window | Up to 1/day per eligible active store | 1 compact summary; each due transition then uses 2 transaction reads | N/A      |

### Cost-Critical Notes

- **Resolver adds ZERO extra reads when no special menu is active** — checks `store.activeSpecialMenuId` field which is already loaded
- **When active, adds 1 cached read** — project is cached via `unstable_cache` with 60s TTL and `menu-store-{sId}` tag
- **The global `storesSummary` read is reused** by the existing hourly scheduler. The per-store project-summary read is incremental and currently bounded to at most one per eligible store/nightly window; a future summary marker may skip stores with no live special-menu schedule after a migration/backfill contract exists.
- **Transactions preserve correctness under contention** — baseline counts below can increase when Firestore retries, but failed attempts do not publish partial project/store/summary state.

---

## Firestore Writes

| Operation                   | Collection                       | Trigger               | Frequency      | Fields                                              | Merge/Set                        |
| --------------------------- | -------------------------------- | --------------------- | -------------- | --------------------------------------------------- | -------------------------------- |
| Create special menu project | `projects/{tId}/{sId}`           | Owner creates         | ~2/store/month | Full project doc (duplicated from base)             | `setDoc`                         |
| Update summary              | `platformSummary/projects_{sId}` | On create             | ~2/store/month | `projects.{id}` with special menu fields            | `setDoc` merge                   |
| Activate (project)          | `projects/{tId}/{sId}`           | Scheduler/DAL         | ~2/store/month | `_specialMenu.status`, `_specialMenu.activatedAt`   | `setDoc` merge                   |
| Activate (store)            | `stores/{sId}`                   | Scheduler/DAL         | ~2/store/month | `activeSpecialMenuId`                               | `setDoc` merge                   |
| Activate (temp status)      | `stores/{sId}`                   | Scheduler/DAL         | ~2/store/month | `tempStatus` object with `sourceProjectId`          | Same atomic store write          |
| Deactivate (project)        | `projects/{tId}/{sId}`           | Scheduler/DAL         | ~2/store/month | `_specialMenu.status`, `_specialMenu.deactivatedAt` | `setDoc` merge                   |
| Deactivate (store)          | `stores/{sId}`                   | Scheduler/DAL         | ~2/store/month | Clear `activeSpecialMenuId`                         | `setDoc` merge + `deleteField()` |
| Deactivate (temp status)    | `stores/{sId}`                   | Scheduler/DAL         | ~2/store/month | Delete only the banner owned by this menu           | Same atomic store write          |
| Edit special menu           | `projects/{tId}/{sId}`           | Owner edits in editor | ~4/store/month | Same as regular project edit                        | `setDoc` merge                   |
| Connected screen touch      | `platformSummary/campaigns_{sId}`, `platformSummary/screen_{sId}` | Scheduler activation/deactivation after public cache revalidation | Only when a screen token exists | `screen.contentVersion`, `screen.lastContentChangeAt`, public-safe mirror fields | Existing Functions public-cache helper |

---

## Firestore Deletes

| Operation           | Collection                       | Type                        | Frequency      |
| ------------------- | -------------------------------- | --------------------------- | -------------- |
| Cancel special menu | `platformSummary/projects_{sId}` | Soft (status → 'cancelled') | Rare           |
| Clear temp status   | `stores/{sId}`                   | Field delete (`tempStatus`) | ~2/store/month |

No hard deletes. Special menu projects remain for audit trail. Can be cleaned up by existing archive logic.

---

## Storage Operations

| Operation           | Path Pattern                                | Size                    | Frequency      |
| ------------------- | ------------------------------------------- | ----------------------- | -------------- |
| Special menu images | `{tId}/{sId}/projects/{projectId}/files/*`  | Same as regular project | ~2/store/month |
| Background images   | `{tId}/{sId}/projects/{projectId}/assets/*` | Same as regular project | Rare           |

Uses existing storage paths. No new storage buckets or patterns.

---

## Cloud Functions

| Function                   | Trigger                                | Duration                             | Memory       |
| -------------------------- | -------------------------------------- | ------------------------------------ | ------------ |
| Nightly special menu check | `pubsub.schedule` (existing scheduler) | +2-5s per store with scheduled menus; optional initialized-screen version touch after cache revalidation | Same (256MB) |

No new Cloud Functions. Extends existing nightly scheduler in `decisionBlocksScoring.ts` and reuses the shared Functions public-cache helper for screen freshness.

---

## DAL Function Mapping (No API Routes)

All operations use client-side Firestore DAL — no API routes.
Same pattern as `duplicateProject`, `updateStore`, etc.

| DAL Function                 | File                             | Firebase Operations       |
| ---------------------------- | -------------------------------- | ------------------------- |
| `createSpecialMenuProject()` | `src/database/projects/index.ts` | scheduled: 2R + 2W; immediate: 3R + 3W transaction |
| `updateSpecialMenuProject()` | `src/database/projects/index.ts` | 3R + 2-3W transaction     |
| `activateSpecialMenu()`      | `src/database/projects/index.ts` | 2R + 2-3W transaction     |
| `deactivateSpecialMenu()`    | `src/database/projects/index.ts` | 2R + 2-3W transaction     |
| `cancelSpecialMenu()`        | `src/database/projects/index.ts` | 1R + 2W transaction       |
| `getSpecialMenus()`          | `src/database/projects/index.ts` | 2R in parallel            |

`useSpecialMenus()` must require explicit create/update/lifecycle acknowledgements before returning success to desktop or mobile callers. Lifecycle acknowledgements include the requested project id and resulting status (`active`, `expired`, or `cancelled`) so local UI state cannot advance on a generic `{ success: true }` fallback. This adds no Firestore reads/writes/deletes; it only prevents client-side `apiCallComposer()` fallback values from being treated as confirmed special-menu writes.

---

## Cost Estimate Per 1,000 Active Stores/Month

| Category        | Operations                                        | Cost                              |
| --------------- | ------------------------------------------------- | --------------------------------- |
| Reads           | Up to ~30,000 per-store nightly summary reads, plus owner lifecycle/list reads and transaction retries | Region/pricing/free-tier dependent |
| Writes          | Lifecycle baseline is 2-3 atomic document writes per action, plus initialized-screen writes after scheduled transitions | Region/pricing/free-tier dependent |
| Storage         | Same as regular projects (~0 incremental)         | ~₹0.00                            |
| Cloud Functions | +5s on existing scheduler                         | ~₹0.00                            |
| **Total**       | Use current Firebase pricing and observed usage; do not rely on the historical fixed-rupee estimate | Measured after deployment |

**Extremely cost-efficient.** Reusing project infrastructure means near-zero incremental cost.

---

## Expensive Patterns to Avoid

| Pattern                                                          | Why Dangerous                     | Mitigation                                           |
| ---------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------- |
| Querying all projects for active special menu on every page view | Could be 5-10 reads per page view | Use `store.activeSpecialMenuId` cached field instead |
| Separate `specialMenus` collection                               | Doubles storage, requires sync    | Reuse projects collection                            |
| Real-time activation (Cloud Function trigger)                    | Always-on cost                    | Nightly scheduler + API route hybrid                 |
| Storing full overlay merge result                                | Doubles project storage           | Compute overlay at render time                       |
| Cloning base rows into every new overlay                          | Duplicates document bytes and IDs | Persist empty overlay rows; retain only editor file/language context |

---

## Optimization Opportunities

1. **Implemented: atomic lifecycle transactions** — project, compact summary, store pointer, and owned temp banner commit together.
2. **Candidate after migration design: stores-summary schedule marker** — skip per-store project-summary reads when no scheduled/active special menu exists. Do not add the marker until client writes, scheduler backfill, parser, rules, and stale-marker repair are one contract.
3. **Implemented: lazy cleanup** — expired/cancelled projects remain as audit history; no cleanup collection or scheduled delete job.
4. **Implemented: storage-light overlays** — new overlays do not duplicate base category/item rows, and runtime namespacing requires no mapping document or extra read/write.

---

**Last Updated:** July 13, 2026
