# Digital Screens — Firebase Cost Tracking

**Feature:** In-Store Digital Menu Screens (TV/Tablet Display)
**Status:** 🔒 **v2.3 LOCKED** (readability/reliability/owner-trust/listener-isolation/bounded-diagnostics hardening only)
**Last Updated:** July 16, 2026
**Source:** Codebase analysis (not spec — actual implementation)

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated Digital Screens state, listener, invalidation, Storage, and Firebase-cost evidence only. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:digital-screens-boundary`, browser TV smoke for Menu Board and Highlights modes, authenticated desktop/mobile owner settings QA, physical-device TV/tablet/browser QA, target Firebase deploy evidence where rules, indexes, Storage, or Functions change, target Vercel deploy evidence where app routes or display clients change, and production-host smoke for the target tenant and screen URL.

---

## Summary

- **Collections Used:** `platformSummary` (existing — canonical `campaigns_{sId}.screen` plus public-safe `screen_{sId}` listener mirror), `stores` (existing), `projects` (existing — fallback/source menu item data)
- **NO new collections created** — screen state and generated available-item menu projection live inside existing `CampaignsSummaryDocument.screen`; only a small token-free `platformSummary/screen_{sId}` mirror is maintained for public client listeners.
- **Storage Buckets:** `MenuListAi/platform_summary/screen_slides/` (owner uploads only)
- **Cloud Functions:** No dedicated Digital Screen function. Existing MenuList Functions public-cache revalidation can optionally touch initialized screen versions for server-side public-output changes.
- **Real-time:** Firebase `onSnapshot` doc listener on `platformSummary/screen_{sId}` (not polling, no internal owner summary exposure)
- **Screen invalidation:** Browser project/menu public cache invalidation touches `screen.contentVersion` only when an initialized screen token exists, and refreshes `screen.menuProjection` from the automatic default menu when available. Store-profile saves, master-to-outlet propagation, and server-side Functions public-output changes can also touch the version after public cache revalidation when rendered screen output changes.
- **Content normalization:** Text, price, category, tag, caption, and dedupe logic is shared by projection generation and fallback DAL/render paths.
- **Estimated Monthly Cost:** **~$0.31-$0.45/month for 1000 screens** depending on projection hit rate, menu-save frequency, and the direct-versus-legacy seen-signal mix.
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
| onSnapshot initial     | `platformSummary/screen_{storeId}` | Screen connect        | 1x/day/screen  | 1                             | `ScreenDisplay.tsx`, `MenuBoardDisplay.tsx` |
| onSnapshot updates     | `platformSummary/screen_{storeId}` | Content changes       | ~1-5x/day      | 1 per change                  | `publicScreenState.ts`, display clients |
| Daily seen signal      | `platformSummary`, `stores`, `tenants` | 1x/day/screen after declared-size, bounded-body, IP-rate, token-rate, unique legacy candidate when needed, and transaction-current screen/store/tenant eligibility checks | 1x/day | 3 transaction reads (screen summary, exact store, exact tenant); the legacy no-store request first performs one token query capped at 2 documents and rejects zero/duplicate/noncanonical candidates | `api/screen/seen/route.ts`, `lib/screen/screenSeenScope.ts` |
| Owner: getScreenState  | `platformSummary` | Settings view         | Occasional     | 1                             | `database/campaigns/index.ts:599`     |
| Owner: addPinnedSlide  | `platformSummary` | Upload image          | Rare           | 2 (read + check)              | `database/campaigns/index.ts:677`     |
| Screen version touch   | `platformSummary`, `projects` | Public menu cache invalidation or rendered store-output change | Per menu/store change where screen exists | 1 screen doc get; up to 2 projection rebuild reads for browser project/menu changes; 0 projection reads for store-output-only and Functions touches | `lib/screen/screenInvalidation.ts`, `functions/src/logic/publicCacheRevalidation.ts` |

### Writes

| Operation                    | Collection        | Trigger                  | Frequency | Writes                        | Code Evidence                     |
| ---------------------------- | ----------------- | ------------------------ | --------- | ----------------------------- | --------------------------------- |
| Daily seen signal            | `platformSummary` | 1x/day/screen after rate-limit admission and transaction-current token, enabled-screen, exact store/tenant identity, lifecycle, and block checks | 1/day     | 0 when rate-limited/already seen/ineligible; otherwise 1 transaction update of `screenLastSeenAt`. Rate-limit denials are non-success and do not create the browser daily marker. | `api/screen/seen/route.ts`     |
| Owner: initializeScreenState | `platformSummary` | First-time setup         | 1x ever   | 2 (`campaigns_{sId}` + safe `screen_{sId}` mirror) | `database/campaigns/index.ts`, `publicScreenState.ts` |
| Owner: addPinnedSlide        | `platformSummary` | Upload image             | Rare      | 2 (canonical screen update + safe mirror) | `database/campaigns/index.ts`, `publicScreenState.ts` |
| Owner: removePinnedSlide     | `platformSummary` | Delete upload            | Rare      | 2 (canonical screen update + safe mirror) | `database/campaigns/index.ts`, `publicScreenState.ts` |
| Owner: updateScreenSettings  | `platformSummary` | Toggle override          | Rare      | 2 (canonical screen update + safe mirror) | `database/campaigns/index.ts`, `publicScreenState.ts` |
| bumpScreenContentVersion     | `platformSummary` | Menu/availability change | ~1-5x/day | 2 (canonical screen update + safe mirror) | `database/campaigns/index.ts`, `publicScreenState.ts` |
| touchDigitalScreenContentVersion / Functions screen touch | `platformSummary` | Public cache invalidation after project/menu changes, rendered store-output changes, scheduled special-menu changes, extraction project saves, or entitlement attribution changes | ~1-5x/day when screen exists; extra touches only for public-output paths | 2 writes; browser project/menu touches may include refreshed `screen.menuProjection`; Functions touches only bump version + safe mirror | `lib/screen/screenInvalidation.ts`, `publicScreenState.ts`, `functions/src/logic/publicCacheRevalidation.ts` |

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
ScreenDisplay.tsx / MenuBoardDisplay.tsx → onSnapshot(doc(firebaseClient, 'platformSummary', `screen_${storeId}`))
```

**Cost model:**

- 1 read on initial connection
- 1 read per document change (only when content actually changes)
- NO per-interval reads (unlike polling)

**Why this matters:** Original spec planned 30-60s polling = 43M reads/month for 1000 screens ($25.80). Actual implementation uses onSnapshot = ~150K reads/month for 1000 screens ($0.09). **99.6% cost reduction.**

June 30 mutation acknowledgement hardening is Firebase-cost neutral. `updateScreenSettings()`, `addPinnedSlide()`, `removePinnedSlide()`, and `updatePinnedSlideCaption()` still perform the same canonical `platformSummary/campaigns_{sId}` write plus public-safe `platformSummary/screen_{sId}` mirror sync, but now return a typed acknowledgement that desktop/mobile callers must assert before local state or success copy changes. `uploadScreenSlide()` also asserts the internal `addPinnedSlide()` acknowledgement and the outer upload result before returning the uploaded slide, so `apiCallComposer()` fallback values cannot show false upload success. This adds no reads/writes/deletes beyond existing screen mutation attempts, no Storage operations beyond existing slide uploads, no rules, no indexes, no Cloud Functions, no API routes, no owner settings, no Firebase deploy requirement, and no Vercel deploy action.

July 10 owner-mutation integrity hardening preserves the same successful read/write counts but commits the canonical `campaigns_{sId}.screen` document and public `screen_{sId}` mirror in one Firestore transaction. Concurrent settings/slide/version changes retry against current state instead of overwriting each other. No-op retries do not bump `contentVersion`; caption updates fail when the slide is absent; concurrent adds enforce the three-slide limit and deduplicate the same slide ID.

Prepared `digitalScreenSlide` uploads keep a variant URL ledger, but the deterministic sibling paths are immutable content-addressed objects. Storage rules deny overwrite and duplicate attempts reuse the existing object. If one sibling upload or the later add-slide transaction fails, the flow does not delete acquired paths because a concurrent or retried successful mutation may already reference them. This removes destructive compensation and adds no Firestore reference document or read; a successful first upload remains two Storage creates, while a duplicate retry reuses those objects.

**Public-read hardening:** The listener document contains only `storeId`, `enabled`, `contentVersion`, `lastContentChangeAt`, and `updatedAt`; it contains no bearer screen token. The bearer token remains only in canonical authenticated/Admin state. Firestore permits anonymous exact-document `get` for the safe mirror but denies anonymous collection listing and unauthenticated reads of `platformSummary/campaigns_{storeId}`, which also contains Today, campaign, staff-prompt, and physical-surface owner data.

**Migration cost and ordering:** Existing token-bearing mirrors are replaced once by `backfill:digital-screen-public-mirrors` (one canonical screen-summary read and one tiny mirror write per initialized store, paginated at 200). Deploy token-free app and Functions writers first, run and verify the backfill for the exact project, then deploy the token-free get-only Firestore rule. Deploying the rule first intentionally makes legacy token-bearing mirror documents unreadable because they fail the new `hasOnly` allowlist.

---

## Daily Cost Per Screen (Active)

| Operation                       | Reads     | Writes | Mode     |
| ------------------------------- | --------- | ------ | -------- |
| TV boot (1x SSR + items)        | 2-4       | 0      | Both     |
| onSnapshot initial + changes    | ~3        | 0      | Both     |
| Daily seen signal               | 1-2       | 1      | Both     |
| 6-hour proactive refreshes (3x) | 6-12      | 0      | Both     |
| **Total per day**               | **~13-21** | **~1** | **Same** |

> **CRITICAL:** Menu Board mode and Highlights mode have **identical Firebase cost**. Both modes use the same server-side data pipeline (`getScreenDataByToken` + valid `screen.menuProjection` or `getMenuItemsForScreen` fallback). The only difference is which client component renders the data. No additional collections, indexes, functions, or storage.

---

## Monthly Cost Estimate

### Per Screen

- 13-21 reads × 30 days = 390-630 reads/month
- 1 write × 30 days = 30 writes/month
- Cost: ~$0.00029-$0.00043/month per screen

### At Scale

| Scale          | Reads/month      | Writes/month | Read Cost   | Write Cost | **Total**       |
| -------------- | ---------------- | ------------ | ----------- | ---------- | --------------- |
| 100 screens    | 39,000-63,000    | 3,000        | $0.02-$0.04 | $0.01      | **$0.03-$0.05** |
| 1,000 screens  | 390,000-630,000  | 30,000       | $0.23-$0.38 | $0.05      | **$0.28-$0.43** |
| 5,000 screens  | 1.95M-3.15M      | 150,000      | $1.17-$1.89 | $0.27      | **$1.44-$2.16** |
| 10,000 screens | 3.9M-6.3M        | 300,000      | $2.34-$3.78 | $0.54      | **$2.88-$4.32** |

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
| Seen signal store eligibility | Prevents inactive, deleted, blocked, or tenant-blocked stores from refreshing liveness state; uses the shared cached public store-id lookup | `api/screen/seen/route.ts`, `lib/firestore/clientStoreLookup.ts` |
| Client-side localStorage cache      | Survives offline, no extra reads | `ScreenDisplay.tsx:59-87`               |
| 6-hour refresh (not 5-min)          | 4 SSR/day vs 288/day             | `ScreenDisplay.tsx:225-233`             |
| **Vercel `unstable_cache` (OPT-6)** | **SSR reads cached 60s at edge** | `screen/[token]/page.tsx:31-41`         |
| Generated screen menu projection | Avoids full project fallback reads on valid cold public renders; stores available display items plus base menu slug context | `CampaignsSummaryDocument.screen.menuProjection`, `screen/[token]/page.tsx` |
| Public-safe screen listener mirror | Preserves 1-doc listener cost while avoiding public reads of owner/internal campaign summary data | `lib/screen/publicScreenState.ts`, `firestore.rules` |
| Public cache linked screen touch | Keeps connected TVs fresh after ordinary menu saves, rendered store-output saves, and selected server-side public-output changes | `lib/cache/publicClientCache.ts`, `lib/screen/screenInvalidation.ts`, `functions/src/logic/publicCacheRevalidation.ts` |
| Seen signal cheap-fail ordering | Rejects oversized anonymous bodies, including no-length streamed bodies, and hashed-IP/token bursts before Firestore lookup | `api/screen/seen/route.ts` |
| Content normalization | Prevents weak public screen copy without extra reads/writes | `lib/screen/screenContent.ts` |
| Dedicated source gate | Locks the route, public-safe listener mirror, seen-signal cheap-fail order, screen invalidation touch, owner acknowledgement guards, and docs parity without adding reads/writes | `scripts/verification/verify-digital-screens-boundary.js` |
| Token-free mirror migration | Dry-run by default, explicit project/scope/write confirmation, 200-row pagination, replace writes | `scripts/backfill-digital-screen-public-mirrors.ts` |
| Expired-slide capacity recovery | Owner reads ignore expired slides; the next mutation prunes expired Firestore references before enforcing the shared cap | `database/campaigns/index.ts` |

> **OPT-6 (Added Feb 19, 2026; updated Jun 6, 2026):** Screen SSR data reads (`getScreenDataByToken` + generated `screen.menuProjection` or `getMenuItemsForScreen` fallback) are wrapped in `unstable_cache` with 60s TTL. Multiple screens hitting the same token within 60s share cached Firestore results instead of repeating raw reads. A valid projection with base menu slug context reduces the default cold raw public path from 4 reads to 2 reads before cache hits.

> **June 2026 invalidation note; July 16 transaction correction:** `touchDigitalScreenContentVersion()` first reads `platformSummary/campaigns_{storeId}` and returns without writing if `screen.screenToken` is missing. This avoids creating partial screen state for stores that have never opened Digital Screens. When a screen exists, the helper increments `screen.contentVersion`, updates `screen.lastContentChangeAt`, and attempts to refresh `screen.menuProjection` from the automatic default project. The compact summary and selected project are read through the same Firestore transaction, so a concurrent menu write retries instead of pairing stale items with a current screen version. Projection refresh can add up to 2 owner-side reads per invalidation, but removes repeated project reads from later cold public screen renders. If projection refresh fails, the public route falls back to the old project read path. The correction changes no baseline read or write count.

> **June 28, 2026 Functions invalidation note; July 16 acknowledgement correction:** server-side Functions cache revalidation can request the same screen-version touch for first-extraction project saves, scheduled special-menu activation/deactivation/repair, subscription entitlement attribution changes, and incident recovery. Cache refresh and screen touch report separate acknowledgements: missing/invalid Next.js cache configuration no longer returns before an explicitly requested screen touch. The Functions helper does not build `screen.menuProjection`; it only reads the existing screen state and writes the canonical content version plus the public-safe listener mirror, so stale projections are rejected by the public resolver and fall back to project reads when needed.

> **June 11, 2026 listener-isolation note; July 10 atomic update:** public display clients listen to `platformSummary/screen_{storeId}`. Owner/session DAL mutations now update that mirror in the same transaction as canonical `campaigns_{storeId}.screen`; cache invalidation helpers retain their existing synchronized paths. The one tiny mirror write removes unauthenticated access to internal campaign summary fields without allowing canonical/mirror partial commits on owner mutations.

> **June 27, 2026 seen-signal note:** `/api/screen/seen` now checks a 1 KB declared-size cap, applies the shared `SCREEN_SEEN_SIGNAL` IP rate limit, and reads the JSON body through the shared bounded-body helper. This adds no Firestore operations and keeps invalid, oversized, chunked, or abusive anonymous requests away from Firestore lookup/write paths.

> **July 1, 2026 seen-signal eligibility note:** `/api/screen/seen` now writes only after the token-bound screen is enabled and the backing store passes the shared `getPublicStoreById()` gate, which blocks inactive, deleted, platform-blocked, and tenant-blocked stores. The legacy token-query path also requires a numeric `campaigns_{storeId}` summary id before writing. This can add one cached store eligibility read to the daily seen path, but it does not add collections, indexes, rules, Cloud Functions, Storage operations, or owner settings.

> **July 16, 2026 source-gate note:** `npm run verify:digital-screens-boundary` guards the public token route and kill switch, token-free `platformSummary/screen_{storeId}` listener shape, exact-get/no-list Firestore boundary, guarded mirror backfill, `/api/screen/seen` cheap-fail and retry behavior, browser/server/Functions screen touches, expired-slide recovery, desktop/mobile permission/config parity, copy/open acknowledgement guards, cache preservation, and Digital Screens docs parity.

> **July 16, 2026 seen-signal diagnostic note:** `/api/screen/seen` logs success and unexpected route failures with bounded screen-token/store metadata only. Unexpected failures return `503`, so display clients keep rendering but do not cache the daily local marker; a later load may retry instead of silently losing the day's liveness signal.
>
> **June 30, 2026 owner link-copy acknowledgement note:** desktop and mobile Menu Board / Highlights copied feedback now waits for Clipboard API success or acknowledged textarea fallback success. Failed copies log `desktop_digital_screen_link_copy_failed` or `mobile_digital_screen_link_copy_failed` with mode, seen-signal, screen URL presence, bounded copy URL metadata, and clipboard/fallback support booleans only. This adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, provider calls, routes, rules, indexes, schema fields, screen tokens, or screen-state changes.

> **June 29, 2026 owner link-open diagnostic note:** desktop and mobile Menu Board / Highlights link opens now detect blocked browser handoffs and log `desktop_digital_screen_link_open_failed` or `mobile_digital_screen_link_open_failed` with mode and URL presence/length metadata only. This adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, provider calls, routes, rules, indexes, schema fields, screen tokens, or screen-state changes.

> **June 29, 2026 fullscreen recovery diagnostic note:** public Highlights and Menu Board display clients now log `digital_screen_display_fullscreen_request_failed` or `digital_screen_menuboard_fullscreen_request_failed` when the browser rejects a tap-to-fullscreen recovery request. The hint still hides after the tap. This adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, provider calls, routes, rules, indexes, schema fields, screen tokens, or screen-state changes.
>
> **June 30, 2026 seen-signal browser-request note:** public Highlights and Menu Board display clients now post `/api/screen/seen` with same-origin credentials, `no-store` cache policy, and manual redirect handling, then set the daily `screen_seen_*` localStorage marker only after the endpoint returns an OK response. Non-OK responses log bounded `digital_screen_display_seen_signal_rejected` or `digital_screen_menuboard_seen_signal_rejected` diagnostics with response status metadata only. This changes no Firestore reads/writes/deletes, Storage operations, Cloud Functions, provider calls, routes, rules, indexes, schema fields, screen tokens, screen-state writes, public display layout, Firebase deploy requirement, or Vercel deploy action.
>
> **June 28, 2026 seen-signal key-privacy note:** `/api/screen/seen` still applies the same IP and token rate limits before Firestore lookup, but the Upstash keys now use `hashPublicRateLimitValue()` for IP, store, and screen-token segments. This changes no Firestore read/write behavior and prevents raw screen tokens or IP addresses from being persisted in rate-limit key names.

> **June 27, 2026 diagnostics note:** public token/menu fallback helpers, public display clients, screen invalidation, and reload utilities no longer direct-console raw screen tokens, project IDs, slide IDs, settings payloads, listener errors, cache errors, seen-signal errors, or normal refresh/version events. Unexpected failures use normalized secure diagnostics with bounded metadata only. This adds no reads, writes, Storage operations, cache invalidations, listener changes, functions, indexes, or collections.

---

## v2.0 Menu Board Mode — Firebase Cost Impact

### Executive Answer: $0.00 Additional Cost

Menu Board mode adds **zero additional Firebase operations**. Here's why:

```
v1.0 (Highlights only):                v2.0 (Menu Board + Highlights):

page.tsx                               page.tsx
  ↓ getScreenDataByTokenServer() [2-3 reads]   ↓ getScreenDataByTokenServer() [2-3 reads]   ← SAME
  ↓ projection [0] or fallback [1+ read] ↓ projection [0] or fallback [1+ read] ← SAME
  ↓ generateScreenSlides()               ↓ IF highlights: generateScreenSlides()
  ↓ <ScreenDisplay />                    ↓ ELSE: group by category
                                        ↓ <MenuBoardDisplay /> or <ScreenDisplay />
```

**The branching happens AFTER menu data resolution.** Both modes read the same data. The difference is purely client-side rendering.

### Detailed Comparison

| Operation                 | v1.0 (Highlights) | v2.0 (Menu Board) | v2.0 (Highlights) | Delta     |
| ------------------------- | ----------------- | ----------------- | ----------------- | --------- |
| `getScreenDataByTokenServer()` | 2-3 reads, plus a cached tenant-block lookup only when denormalized state is absent | Same | Same | ₹0 mode delta |
| Projection/fallback menu data | 0-1+ reads   | 0-1+ reads        | 0-1+ reads        | $0        |
| onSnapshot listener       | 1 read/connect    | 1 read/connect    | 1 read/connect    | $0        |
| Daily seen signal         | 1-2 reads + 1 write | 1-2 reads + 1 write | 1-2 reads + 1 write | $0        |
| 6-hour refresh            | 6-12 reads/day    | 6-12 reads/day    | 6-12 reads/day    | $0        |
| Owner uploads (Storage)   | Max 3 images      | N/A (no uploads)  | Max 3 images      | $0        |
| **Total delta**           | —                 | —                 | —                 | **$0.00** |

### Why Menu Board Doesn't Need More Data

The menu data resolver already produces ALL menu items (not just top 3). In Highlights mode, the slide generator selects the top candidates for evergreen slides. In Menu Board mode, the same full item list is used — just rendered differently (all items instead of highlights).

### Two-Screen Scenario Cost

If a store uses TWO screens (one Menu Board + one Highlights):

| Metric                          | 1 Screen | 2 Screens | Delta     |
| ------------------------------- | -------- | --------- | --------- |
| Daily reads                     | ~13-21   | ~26-42    | +13-21 reads |
| Daily writes                    | ~1       | ~2        | +1 write  |
| Monthly cost                    | $0.00029-$0.00043 | $0.00058-$0.00086 | +$0.00029-$0.00043 |
| At 1000 stores (2 screens each) | —        | $0.58-$0.86/mo | +$0.28-$0.43 |

**Even with 1000 stores each running 2 screens, the total cost increase is roughly $0.28-$0.43/month.** This is negligible.

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
| 4.5     | 2026-06-11 | Codex   | Added public-safe `screen_{storeId}` listener mirror, removed unauthenticated reads of `campaigns_{storeId}` from Firestore rules, and documented the one-extra-write mutation cost. |
| 4.6     | 2026-06-27 | Codex   | Removed direct console diagnostics from public screen resolver/fallback, owner mutation success, invalidation, and reload helper paths. Diagnostics-only change; no Firebase cost impact. |
| 4.7     | 2026-06-28 | Codex   | Added optional Functions-side screen version touch for server-side public-output changes. No new collections/indexes/routes; only initialized screens receive the existing two-write listener update. |
| 4.8     | 2026-07-01 | Codex   | Added enabled-screen, numeric summary-id, and shared public store eligibility gates to `/api/screen/seen`; daily seen cost can include one cached store eligibility read. |
| 4.9     | 2026-07-16 | Codex   | Decoupled requested Functions screen-version touch from Next.js cache configuration and returned separate cache/screen acknowledgements. Existing initialized-screen read/write cost only; no new collection, index, rule, route, or scheduler. |
