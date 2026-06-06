# Digital Screens — Firebase Cost Tracking

**Feature:** In-Store Digital Menu Screens (TV/Tablet Display)  
**Status:** 🔒 **v2.2 LOCKED** (readability/reliability/owner-trust hardening only)
**Last Updated:** June 6, 2026
**Source:** Codebase analysis (not spec — actual implementation)

---

## Summary

- **Collections Used:** `platformSummary` (existing — `screen` field in `campaigns_{sId}` doc), `stores` (existing), `projects` (existing — fallback/source menu item data)
- **NO new collections created** — screen state and generated available-item menu projection live inside existing `CampaignsSummaryDocument.screen`
- **Storage Buckets:** `MenuListAi/platform_summary/screen_slides/` (owner uploads only)
- **Cloud Functions:** None — all screen logic is SSR + client-side
- **Real-time:** Firebase `onSnapshot` doc listener (not polling)
- **Screen invalidation:** Public client cache invalidation touches `screen.contentVersion` only when an initialized screen token exists, and refreshes `screen.menuProjection` from the automatic default menu when available.
- **Content normalization:** Text, price, category, tag, caption, and dedupe logic is shared by projection generation and fallback DAL/render paths.
- **Estimated Monthly Cost:** **~$0.27-$0.41/month for 1000 screens** depending on projection hit rate and menu-save frequency.
- **v2.0 Menu Board Mode Impact:** **$0.00 additional cost** (same menu data resolver, different client render)

---

## Firestore Operations (Actual)

### Reads

| Operation              | Collection        | Trigger               | Frequency      | Reads                         | Code Evidence                         |
| ---------------------- | ----------------- | --------------------- | -------------- | ----------------------------- | ------------------------------------- |
| Screen page load (SSR) | `platformSummary` | TV boot / 6hr refresh | ~4x/day/screen | 1 (query by token)            | `database/campaigns/serverScreen.ts`  |
| Store data lookup      | `stores`          | Same as above         | ~4x/day/screen | 1 (doc get)                   | `database/campaigns/serverScreen.ts`  |
| Project summary lookup | `platformSummary` | Missing/stale projection context, special menu active, or legacy projection without slug | As needed | 0-1 (skipped when valid projection includes base menu slug) | `database/campaigns/serverScreen.ts`  |
| Menu projection hit    | `platformSummary` | Same as above         | ~4x/day/screen | 0 extra reads after screen doc | `screen/[token]/page.tsx`, `database/campaigns/serverScreen.ts` |
| Menu items fallback    | `projects`        | Missing/stale projection, special menu active, or old screen state | As needed | Usually 1 default project read after `baseProjectId`; special overlay can read 2 project docs | `database/campaigns/serverScreen.ts` |
| onSnapshot initial     | `platformSummary` | Screen connect        | 1x/day/screen  | 1                             | `ScreenDisplay.tsx:180`               |
| onSnapshot updates     | `platformSummary` | Content changes       | ~1-5x/day      | 1 per change                  | `ScreenDisplay.tsx:181-191`           |
| Daily seen signal      | `platformSummary` | 1x/day/screen         | 1x/day         | 1 (direct doc get)            | `api/screen/seen/route.ts:44-53`      |
| Owner: getScreenState  | `platformSummary` | Settings view         | Occasional     | 1                             | `database/campaigns/index.ts:599`     |
| Owner: addPinnedSlide  | `platformSummary` | Upload image          | Rare           | 2 (read + check)              | `database/campaigns/index.ts:677`     |
| Screen version touch   | `platformSummary`, `projects` | Public menu cache invalidation | Per menu/store change where screen exists | 1 screen doc get; up to 2 projection rebuild reads | `lib/screen/screenInvalidation.ts` |

### Writes

| Operation                    | Collection        | Trigger                  | Frequency | Writes                        | Code Evidence                     |
| ---------------------------- | ----------------- | ------------------------ | --------- | ----------------------------- | --------------------------------- |
| Daily seen signal            | `platformSummary` | 1x/day/screen            | 1/day     | 1 (update `screenLastSeenAt`) | `api/screen/seen/route.ts:52`     |
| Owner: initializeScreenState | `platformSummary` | First-time setup         | 1x ever   | 1                             | `database/campaigns/index.ts:638` |
| Owner: addPinnedSlide        | `platformSummary` | Upload image             | Rare      | 1 (update pinnedSlides array) | `database/campaigns/index.ts:693` |
| Owner: removePinnedSlide     | `platformSummary` | Delete upload            | Rare      | 1                             | `database/campaigns/index.ts:725` |
| Owner: updateScreenSettings  | `platformSummary` | Toggle override          | Rare      | 1                             | `database/campaigns/index.ts:659` |
| bumpScreenContentVersion     | `platformSummary` | Menu/availability change | ~1-5x/day | 1                             | `database/campaigns/index.ts:757` |
| touchDigitalScreenContentVersion | `platformSummary` | Public cache invalidation after project/menu changes | ~1-5x/day when screen exists | 1 update; may include refreshed `screen.menuProjection` | `lib/screen/screenInvalidation.ts` |

### Deletes

None.

---

## Firebase Storage

| Operation          | Path Pattern                                          | Trigger                    | Size           | Notes                          |
| ------------------ | ----------------------------------------------------- | -------------------------- | -------------- | ------------------------------ |
| Owner slide upload | `MenuListAi/platform_summary/screen_slides/{slideId}` | Owner uploads custom image | Target max 500KB each after `digitalScreenSlide` preparation | Max 3 per store, 14-day expiry |

---

## Real-time Listener (Key Architecture Decision)

Instead of polling, each screen maintains a Firebase `onSnapshot` doc listener:

```
ScreenDisplay.tsx → onSnapshot(doc(firebaseClient, 'platformSummary', `campaigns_${storeId}`))
```

**Cost model:**

- 1 read on initial connection
- 1 read per document change (only when content actually changes)
- NO per-interval reads (unlike polling)

**Why this matters:** Original spec planned 30-60s polling = 43M reads/month for 1000 screens ($25.80). Actual implementation uses onSnapshot = ~150K reads/month for 1000 screens ($0.09). **99.6% cost reduction.**

---

## Daily Cost Per Screen (Active)

| Operation                       | Reads     | Writes | Mode     |
| ------------------------------- | --------- | ------ | -------- |
| TV boot (1x SSR + items)        | 2-4       | 0      | Both     |
| onSnapshot initial + changes    | ~3        | 0      | Both     |
| Daily seen signal               | 1         | 1      | Both     |
| 6-hour proactive refreshes (3x) | 6-12      | 0      | Both     |
| **Total per day**               | **~12-20** | **~1** | **Same** |

> **CRITICAL:** Menu Board mode and Highlights mode have **identical Firebase cost**. Both modes use the same server-side data pipeline (`getScreenDataByToken` + valid `screen.menuProjection` or `getMenuItemsForScreen` fallback). The only difference is which client component renders the data. No additional collections, indexes, functions, or storage.

---

## Monthly Cost Estimate

### Per Screen

- 12-20 reads × 30 days = 360-600 reads/month
- 1 write × 30 days = 30 writes/month
- Cost: ~$0.00027-$0.00041/month per screen

### At Scale

| Scale          | Reads/month      | Writes/month | Read Cost   | Write Cost | **Total**       |
| -------------- | ---------------- | ------------ | ----------- | ---------- | --------------- |
| 100 screens    | 36,000-60,000    | 3,000        | $0.02-$0.04 | $0.01      | **$0.03-$0.05** |
| 1,000 screens  | 360,000-600,000  | 30,000       | $0.22-$0.36 | $0.05      | **$0.27-$0.41** |
| 5,000 screens  | 1.8M-3M          | 150,000      | $1.08-$1.80 | $0.27      | **$1.35-$2.07** |
| 10,000 screens | 3.6M-6M          | 300,000      | $2.16-$3.60 | $0.54      | **$2.70-$4.14** |

**Storage:** ~1.5MB/store × stores with uploads (estimated <10%) = negligible

---

## Firestore Indexes Required

| Collection        | Fields               | Type         | Purpose                                    |
| ----------------- | -------------------- | ------------ | ------------------------------------------ |
| `platformSummary` | `screen.screenToken` | Single-field | Token lookup for screen page + seen signal |

---

## Cost Optimization Already Implemented

| Optimization                        | Impact                           | Evidence                                |
| ----------------------------------- | -------------------------------- | --------------------------------------- |
| No separate collection              | Eliminated extra reads           | `CampaignsSummaryDocument.screen` field |
| onSnapshot instead of polling       | 99.6% read reduction             | `ScreenDisplay.tsx:180`                 |
| Daily seen signal (not heartbeat)   | 1 write/day vs 1440 writes/day   | `ScreenDisplay.tsx:130-147`             |
| Client-side localStorage cache      | Survives offline, no extra reads | `ScreenDisplay.tsx:59-87`               |
| 6-hour refresh (not 5-min)          | 4 SSR/day vs 288/day             | `ScreenDisplay.tsx:225-233`             |
| **Vercel `unstable_cache` (OPT-6)** | **SSR reads cached 60s at edge** | `screen/[token]/page.tsx:31-41`         |
| Generated screen menu projection | Avoids full project fallback reads on valid cold public renders; stores available display items plus base menu slug context | `CampaignsSummaryDocument.screen.menuProjection`, `screen/[token]/page.tsx` |
| Public cache linked screen touch | Keeps connected TVs fresh after ordinary menu saves | `lib/cache/publicClientCache.ts`, `lib/screen/screenInvalidation.ts` |
| Content normalization | Prevents weak public screen copy without extra reads/writes | `lib/screen/screenContent.ts` |

> **OPT-6 (Added Feb 19, 2026; updated Jun 6, 2026):** Screen SSR data reads (`getScreenDataByToken` + generated `screen.menuProjection` or `getMenuItemsForScreen` fallback) are wrapped in `unstable_cache` with 60s TTL. Multiple screens hitting the same token within 60s share cached Firestore results instead of repeating raw reads. A valid projection with base menu slug context reduces the default cold raw public path from 4 reads to 2 reads before cache hits.

> **June 2026 invalidation note:** `touchDigitalScreenContentVersion()` first reads `platformSummary/campaigns_{storeId}` and returns without writing if `screen.screenToken` is missing. This avoids creating partial screen state for stores that have never opened Digital Screens. When a screen exists, the helper increments `screen.contentVersion`, updates `screen.lastContentChangeAt`, and attempts to refresh `screen.menuProjection` from the automatic default project. Projection refresh can add up to 2 owner-side reads per invalidation, but removes repeated project reads from later cold public screen renders. If projection refresh fails, the public route falls back to the old project read path.

---

## v2.0 Menu Board Mode — Firebase Cost Impact

### Executive Answer: $0.00 Additional Cost

Menu Board mode adds **zero additional Firebase operations**. Here's why:

```
v1.0 (Highlights only):                v2.0 (Menu Board + Highlights):

page.tsx                               page.tsx
  ↓ getScreenDataByToken() [2-3 reads]   ↓ getScreenDataByToken() [2-3 reads]   ← SAME
  ↓ projection [0] or fallback [1+ read] ↓ projection [0] or fallback [1+ read] ← SAME
  ↓ generateScreenSlides()               ↓ IF highlights: generateScreenSlides()
  ↓ <ScreenDisplay />                    ↓ ELSE: group by category
                                        ↓ <MenuBoardDisplay /> or <ScreenDisplay />
```

**The branching happens AFTER menu data resolution.** Both modes read the same data. The difference is purely client-side rendering.

### Detailed Comparison

| Operation                 | v1.0 (Highlights) | v2.0 (Menu Board) | v2.0 (Highlights) | Delta     |
| ------------------------- | ----------------- | ----------------- | ----------------- | --------- |
| `getScreenDataByToken()`  | 2-3 reads         | 2-3 reads         | 2-3 reads         | $0        |
| Projection/fallback menu data | 0-1+ reads   | 0-1+ reads        | 0-1+ reads        | $0        |
| onSnapshot listener       | 1 read/connect    | 1 read/connect    | 1 read/connect    | $0        |
| Daily seen signal         | 1 read + 1 write  | 1 read + 1 write  | 1 read + 1 write  | $0        |
| 6-hour refresh            | 6-12 reads/day    | 6-12 reads/day    | 6-12 reads/day    | $0        |
| Owner uploads (Storage)   | Max 3 images      | N/A (no uploads)  | Max 3 images      | $0        |
| **Total delta**           | —                 | —                 | —                 | **$0.00** |

### Why Menu Board Doesn't Need More Data

The menu data resolver already produces ALL menu items (not just top 3). In Highlights mode, the slide generator selects the top candidates for evergreen slides. In Menu Board mode, the same full item list is used — just rendered differently (all items instead of highlights).

### Two-Screen Scenario Cost

If a store uses TWO screens (one Menu Board + one Highlights):

| Metric                          | 1 Screen | 2 Screens | Delta     |
| ------------------------------- | -------- | --------- | --------- |
| Daily reads                     | ~12-20   | ~24-40    | +12-20 reads |
| Daily writes                    | ~1       | ~2        | +1 write  |
| Monthly cost                    | $0.00027-$0.00041 | $0.00054-$0.00082 | +$0.00027-$0.00041 |
| At 1000 stores (2 screens each) | —        | $0.54-$0.82/mo | +$0.27-$0.41 |

**Even with 1000 stores each running 2 screens, the total cost increase is roughly $0.27-$0.41/month.** This is negligible.

### What Would Increase Cost (And We're NOT Doing It)

| Feature we're NOT building       | Would cost      | Why rejected                 |
| -------------------------------- | --------------- | ---------------------------- |
| Per-screen analytics             | +$2-5/mo at 1K  | Encourages over-optimization |
| Separate screen collection       | +$0.20/mo at 1K | Unnecessary duplication      |
| Polling instead of onSnapshot    | +$25/mo at 1K   | 99.6% more expensive         |
| Real-time menu sync (sub-second) | +$1-3/mo at 1K  | onSnapshot is sufficient     |
| POS integration                  | +$5-10/mo at 1K | We're not a connector        |

---

## Document History

| Version | Date       | Author  | Changes                                                                                                                                                                                 |
| ------- | ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-01-04 | Cascade | Initial spec-based cost plan (pre-implementation)                                                                                                                                       |
| 2.0     | 2026-02-08 | Cascade | **Complete rewrite from actual codebase** — corrected all operations, costs, and architecture                                                                                           |
| 2.1     | 2026-02-08 | Cascade | Added menu items fetch (2 reads/SSR), seen signal now uses direct doc lookup                                                                                                            |
| 3.0     | 2026-02-08 | Cascade | **v2.0 Menu Board cost analysis** — confirmed $0.00 additional cost, two-screen scenario, rejected features cost comparison                                                             |
| 4.0     | 2026-02-08 | Cascade | **🔒 v2.2 LOCKED** — v2.1 UI, v2.2 metadata enrichment, v2.2.1 hardening = $0.00 additional Firebase cost. All changes were client-side CSS/logic only. No new reads/writes/collections |
| 4.1     | 2026-02-08 | Cascade | v2.2.2 REFACTOR — type consolidation + `guardedReload` extraction. `ScreenStoreInfo` now used in DAL return type. Zero Firebase cost impact (import-only changes)                       |
| 4.2     | 2026-06-02 | Codex   | Added public-cache-linked screen content-version touch and screen SSR cache tag invalidation. No new collections, functions, rules, indexes, schedulers, or Storage paths.              |
| 4.3     | 2026-06-02 | Codex   | Added content normalization for screen text, prices, categories, tags, captions, and dedupe. CPU-only; no Firebase cost impact.                                                           |
| 4.4     | 2026-06-06 | Codex   | Added generated screen menu projection inside existing `screen` summary state. No new collection/index/function; public cold path uses projection when valid and falls back to project reads when stale. |
