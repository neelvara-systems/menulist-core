# Special Menu Switching — Firebase Cost Tracking

**Status:** 🧊 FROZEN — Structurally Complete, Flag OFF. See `__docs__/constitution/14-feature-lifecycle-doctrine.md`  
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
| List special menus            | `platformSummary/projects_{sId}` | Dashboard load                     | ~30/store/month            | 0 (uses SWR cached summary)                 | N/A      |
| Resolver check                | `stores/{sId}`                   | Every public page view             | Per page view              | 0 (store data already fetched + cached 60s) | N/A      |
| Resolver load special project | `projects/{tId}/{sId}`           | When special menu is active        | Per page view (cached 60s) | 1 (cached via `unstable_cache`)             | Yes      |
| Nightly activation check      | `platformSummary/projects_{sId}` | Scheduler 2:30 AM UTC              | 1/day per store            | 1 per store with scheduled menus            | N/A      |

### Cost-Critical Notes

- **Resolver adds ZERO extra reads when no special menu is active** — checks `store.activeSpecialMenuId` field which is already loaded
- **When active, adds 1 cached read** — project is cached via `unstable_cache` with 60s TTL and `menu-store-{sId}` tag
- **Nightly check reads summary doc only** — already read by existing scheduler, so incremental cost is near-zero

---

## Firestore Writes

| Operation                   | Collection                       | Trigger               | Frequency      | Fields                                              | Merge/Set                        |
| --------------------------- | -------------------------------- | --------------------- | -------------- | --------------------------------------------------- | -------------------------------- |
| Create special menu project | `projects/{tId}/{sId}`           | Owner creates         | ~2/store/month | Full project doc (duplicated from base)             | `setDoc`                         |
| Update summary              | `platformSummary/projects_{sId}` | On create             | ~2/store/month | `projects.{id}` with special menu fields            | `setDoc` merge                   |
| Activate (project)          | `projects/{tId}/{sId}`           | Scheduler/DAL         | ~2/store/month | `_specialMenu.status`, `_specialMenu.activatedAt`   | `setDoc` merge                   |
| Activate (store)            | `stores/{sId}`                   | Scheduler/DAL         | ~2/store/month | `activeSpecialMenuId`                               | `setDoc` merge                   |
| Activate (temp status)      | `stores/{sId}`                   | Scheduler/DAL         | ~2/store/month | `tempStatus` object                                 | `setDoc` merge (batched)         |
| Deactivate (project)        | `projects/{tId}/{sId}`           | Scheduler/DAL         | ~2/store/month | `_specialMenu.status`, `_specialMenu.deactivatedAt` | `setDoc` merge                   |
| Deactivate (store)          | `stores/{sId}`                   | Scheduler/DAL         | ~2/store/month | Clear `activeSpecialMenuId`                         | `setDoc` merge + `deleteField()` |
| Deactivate (temp status)    | `stores/{sId}`                   | Scheduler/DAL         | ~2/store/month | Delete `tempStatus`                                 | `setDoc` merge + `deleteField()` |
| Edit special menu           | `projects/{tId}/{sId}`           | Owner edits in editor | ~4/store/month | Same as regular project edit                        | `setDoc` merge                   |

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
| Nightly special menu check | `pubsub.schedule` (existing scheduler) | +2-5s per store with scheduled menus | Same (256MB) |

No new Cloud Functions. Extends existing nightly scheduler in `decisionBlocksScoring.ts`.

---

## DAL Function Mapping (No API Routes)

All operations use client-side Firestore DAL — no API routes.
Same pattern as `duplicateProject`, `updateStore`, etc.

| DAL Function                 | File                             | Firebase Operations       |
| ---------------------------- | -------------------------------- | ------------------------- |
| `createSpecialMenuProject()` | `src/database/projects/index.ts` | 2R + 2W                   |
| `activateSpecialMenu()`      | `src/database/projects/index.ts` | 2R + 2-3W                 |
| `deactivateSpecialMenu()`    | `src/database/projects/index.ts` | 2R + 2-3W                 |
| `cancelSpecialMenu()`        | `src/database/projects/index.ts` | 1R + 2W                   |
| `getSpecialMenus()`          | `src/database/projects/index.ts` | 1R (summary) + 1R (store) |

---

## Cost Estimate Per 1,000 Active Stores/Month

| Category        | Operations                                        | Cost                              |
| --------------- | ------------------------------------------------- | --------------------------------- |
| Reads           | ~6,000 (create + activate + deactivate + nightly) | ~₹0.50                            |
| Writes          | ~12,000 (create + activate + deactivate + edits)  | ~₹2.00                            |
| Storage         | Same as regular projects (~0 incremental)         | ~₹0.00                            |
| Cloud Functions | +5s on existing scheduler                         | ~₹0.00                            |
| **Total**       |                                                   | **~₹2.50/month per 1,000 stores** |

**Extremely cost-efficient.** Reusing project infrastructure means near-zero incremental cost.

---

## Expensive Patterns to Avoid

| Pattern                                                          | Why Dangerous                     | Mitigation                                           |
| ---------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------- |
| Querying all projects for active special menu on every page view | Could be 5-10 reads per page view | Use `store.activeSpecialMenuId` cached field instead |
| Separate `specialMenus` collection                               | Doubles storage, requires sync    | Reuse projects collection                            |
| Real-time activation (Cloud Function trigger)                    | Always-on cost                    | Nightly scheduler + API route hybrid                 |
| Storing full overlay merge result                                | Doubles project storage           | Compute overlay at render time                       |

---

## Optimization Opportunities

1. **Batch activation writes** — Store update + project update + temp status in single batch write
2. **Skip nightly check** — Only check stores that have `projectsSummary` entries with `isSpecialMenu: true` and `status: 'scheduled'`
3. **Lazy cleanup** — Don't delete expired special menus. Let owner archive them naturally. Zero cleanup cost.

---

**Last Updated:** February 21, 2026
