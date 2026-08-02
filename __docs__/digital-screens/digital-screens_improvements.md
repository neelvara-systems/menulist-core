# Digital Screens — Improvement Recommendations

**Created:** February 8, 2026  
**Source:** End-to-end codebase analysis (every file, every import)  
**Goal:** Reduce Firebase cost without losing scale or performance  
**Status:** 🔒 **CURRENT MATERIAL FINDINGS RESOLVED IN SOURCE** — Runtime/deploy certification remains external | Feature LOCKED
**Last Updated:** August 1, 2026

## Source Gate

Treat the code paths and `npm run verify:digital-screens-boundary` as authority. This file records resolved findings; it is not permission to reintroduce screen management, token-bearing public documents, per-screen analytics, or decorative scope.

---

## July 29, 2026 — Truth, Security, TV Output, And Owner Dry Run

Restaurant-owner dry runs exposed six trust failures: a generated link was presented as `Running`/`Connected`; old local content could override an intentional empty/current response; 720p boards could clip rows and take too long to rotate; 1080p and portrait layouts could leave columns unused or clip behind the footer; missing Firebase client setup could replace valid server-rendered truth with an error page; and custom posters could be cropped or covered by output chrome.

Resolved:

- moved the bearer token from tenant-readable campaign state into a server-only private control and made owner mutations permission-checked, rate-limited, validated, and atomic;
- denied direct client writes to canonical screen state and the public listener mirror;
- replaced global screen state cache invalidation with hashed-token tags and retained store-scoped menu tags;
- admitted browser-local content only offline and only for the same content version;
- added measured 720p/1080p/portrait capacities, least-used fitting-column packing, 12-second pages, a 500-item fallback ceiling, locale-aware prices, two-line wide-TV item names, portrait footer clearance, safe-area/QR preview, non-cropping owner artwork, QR-safe offline status, non-overlapping watermarks, and expiry-time reload;
- preserved valid server-rendered menu/highlight truth when the Firebase listener cannot be constructed, while showing the bounded offline state and retaining timed refresh recovery;
- replaced status overclaims with `Link ready`, `Seen recently`, and `Check TV`;
- removed the duplicate desktop custom-slide list, fixed the Output Center setup deep link, and removed stale store token fallbacks from desktop/mobile AI Menu Manager;
- removed the temporary browser-audit fixture route after TV-output QA so fixture business content cannot enter the production route table;
- added guarded dry-run/write private-control migration, Firestore emulator coverage, lifecycle behavior tests, and the dedicated source gate.

Browser dry-run evidence covered Menu Board at 1280x720, 1920x1080, and 768x1024 plus Highlights owner-poster and item-promotion states. The private control and Functions changes require the ordered QA migration/deploy runbook. Authenticated owner setup, real Firebase listener/reconnect behavior, physical-TV overscan/fullscreen/QR-distance checks, and deployed cache propagation remain release evidence rather than source claims.

### August 1, 2026 render-confidence correction

- replaced the ambiguous shared owner status with independent Menu Board and Highlights receipts for the exact canonical `contentVersion`;
- rejected stale-version acknowledgements inside the same transaction that verifies private token, store/tenant identity, lifecycle, and block state;
- kept legacy aggregate daily clients compatible while keying current browser markers by token, mode, version, and UTC day;
- added owner-triggered desktop/mobile status refresh without polling or device inventory;
- removed the unused browser Firestore mirror writer so only server/Admin transactions can construct public listener state;
- isolated bearer TV URLs from discovery with route-level noindex/noarchive/noimageindex and no-referrer metadata; public menu/OBP pages remain the structured-data surface;
- changed failed owner-poster media from a mostly blank slide to the existing store identity and menu QR fallback;
- corrected owner setup card style scope across the child-card boundary and collapsed the same-device QR column below 640px; a 390x844 device-emulation dry run confirmed zero horizontal overflow;
- namespaced every global owner-card selector under `.screen-link-section` so generic preview/highlight classes cannot affect unrelated UI, and replaced Output Center's aggregate Menu Board-only hint with independent exact-version status plus explicit refresh for both modes;
- expanded lifecycle, emulator, source-boundary, and documentation gates around these invariants.

This is a reliability and owner-trust correction inside the locked v2.3 boundary. It does not add device analytics, screen dashboards, scheduling, templates, per-screen settings, a collection, index, rule, Function, or Storage path.

### Competitor/trend disposition after code cross-check

| Market capability | MenuList decision | Codebase reason |
| --- | --- | --- |
| Screen render confidence | Adopted in bounded form | Exact-version per-mode open receipts relieve owner uncertainty without device inventory or analytics. |
| Premium readable boards | Already active; reliability fix only | 720p/1080p/portrait capacity, fixed contrast, deterministic ordering, price alignment, QR labels, OBP accent restraint, and reduced-motion handling are already governed. |
| Branded/scannable QR | Already active; do not duplicate | TV outputs use the canonical public menu QR; Print Assets owns printable branded artifacts and permanent public menu routing owns rename continuity. |
| Search/AI discovery markup | Keep on public menu/OBP only | Public menu pages already emit governed Schema.org menu/business data. Bearer screen URLs are now noindex/no-referrer and must not become duplicate discovery pages. |
| POS-assisted truth intake | Keep outside Digital Screens | Existing POS Sync is a bounded upstream integration. Screens consume canonical MenuList truth and do not become a POS control surface. |
| Social/export handoffs | Keep in existing Share/Output surfaces | A TV setup flow should not grow channel publishing or campaign operations. |
| Scheduling, templates, playlists, widgets, video walls | Reject | These add signage management and owner decisions without improving canonical menu truth. |
| Per-screen analytics, A/B tests, dynamic pricing | Reject | They introduce device identity, optimization pressure, and public price-trust risk outside MenuList positioning. |

The next evidence priority is physical-device certification and production monitoring, not another owner-facing feature: real TV browser boot/reconnect, glare/overscan, QR scan distance, tenant-specific OBP color contrast, and deployed version-to-receipt latency.

---

## Current Cost Baseline

| Scale          | Current Range | Notes |
| -------------- | ------------- | ----- |
| 100 active TV-mode links    | $0.04-$0.11/mo | Includes exact-version acknowledgements under 1-5 daily content changes |
| 1,000 active TV-mode links  | $0.45-$1.09/mo | Projection hits reduce cold render reads; shared store/mode/version receipts collapse duplicate writes |
| 10,000 active TV-mode links | $4.50-$10.98/mo | Edge cache hits can reduce raw render reads further |

**Verdict:** Current cost remains negligible. Valid `screen.menuProjection` with base menu slug context reduces the typical cold public screen render from 4 reads to 2 reads before edge cache hits, while fallback still shows actual menu items when projection is stale or unavailable. Exact-version acknowledgements trade a few bounded transaction reads/writes for truthful per-mode owner confidence; inactive, deleted, blocked, tenant-blocked, or stale-version requests still fail closed.

---

## FINDING 1: `/api/screen/seen` Uses Token Query Instead of Direct Doc Update

**Severity:** MEDIUM | **Status:** ✅ IMPLEMENTED  
**Impact:** 1 unnecessary Firestore read per screen per day  
**File:** `src/app/api/screen/seen/route.ts:43`

### Current Implementation

```typescript
// Line 43: Queries by token — requires index scan
const snapshot = await summaryRef
  .where("screen.screenToken", "==", token)
  .limit(1)
  .get();
```

The client already has `storeId` (passed in `initialData` from `page.tsx:58`). But the seen endpoint only receives `token`, forcing a query instead of a direct doc lookup.

### Implementation (Feb 8, 2026)

**Files changed:**

- `ScreenDisplay.tsx:136` — now sends `{ token, storeId }` in seen request body
- `api/screen/seen/route.ts:44-61` — when `storeId` provided, uses direct `doc()` ref with token verification; falls back to query for backwards compatibility

---

## FINDING 2: `slideGenerator.ts` and Parts of `evergreenSlides.ts` Are Dead Code

**Severity:** MEDIUM (product quality) | **Status:** ✅ IMPLEMENTED  
**Impact:** ~300 lines of unused library code  
**Files:** `src/lib/screen/slideGenerator.ts` (155 lines), `src/lib/screen/evergreenSlides.ts` (partial)

### Current Reality

`page.tsx` generates slides **inline** at lines 69-122. It never imports or calls `generateScreenSlides()` from `slideGenerator.ts`. The 4-layer slide generation, monotonicity check, and evergreen item selection in the library files are never executed.

`page.tsx` only imports `generateBrandFallback` from `evergreenSlides.ts`. The `generateEvergreenSlides()` function (which creates slides from actual menu items) is never called.

### Result: Layer 3 (Evergreen Menu Items) Is Missing

The spec promises a 4-layer stack: Owner → Campaign → Evergreen → Brand. But the actual screen only shows:

- Layer 1: Owner Pinned slides
- Layer 2: Campaign slides (if confidence >= 0.7)
- Layer 4: Brand Fallback (always)

**Layer 3 (Evergreen — bestseller menu items with images) is skipped.** For stores without active campaigns, the screen shows only brand fallback repeated 3 times.

### Why This Happened

`getScreenDataByTokenServer()` returns `screen`, `today`, `storeId`, and `storeInfo` — but NOT menu items. The server page also fetches menu item data when the projection is unavailable.

### Recommended Fix

**Option A: Fetch menu items in `page.tsx` (1 extra read, full Layer 3)**

```typescript
// In page.tsx, after getting screenData:
const menuItems = await getMenuItemsForScreenServer(screenData.storeId, screenData.tenantId);
// Then use generateScreenSlides() from slideGenerator.ts instead of inline logic
const slides = generateScreenSlides({
  screenState: screenData.screen,
  todayCampaign: screenData.today?.primary,
  menuItems,
  storeInfo: screenData.storeInfo,
});
```

**Cost:** +1 read per screen page load (~4x/day) = +120 reads/month per screen. At 1000 screens: +120K reads/month = $0.07/month. Negligible.

**Option B: Precompute evergreen slides during campaign sync (0 extra reads)**

During the daily campaign sync (which already runs), compute top 3 menu items and store them in the `screen` field of `platformSummary`. Screen page reads them for free (already fetching the doc).

**Cost:** 0 extra reads. 1 extra field in existing write. Best option for 3-year freeze.

### Implementation (Feb 8, 2026)

**Went with Option A** (simpler, self-contained, doesn't touch campaign sync flow):

- `page.tsx` — calls `getMenuItemsForScreenServer()` then `generateScreenSlides()` from `slideGenerator.ts`
- `database/campaigns/serverScreen.ts` — server-only `getMenuItemsForScreenServer(storeId, tenantId)` function
- `database/campaigns/index.ts:537` — `getScreenDataByToken` now returns `tenantId` from store doc
- `slideGenerator.ts:34` — `MenuItemForSlide` interface now exported

**Result:** `slideGenerator.ts` and `evergreenSlides.ts` are no longer dead code. Full 4-layer stack is active. Historical February baseline: +2 reads per SSR (~$0.14/month at 1K screens). June 2026 projection hardening later reduced the typical cold public render; see Finding 12.

---

## FINDING 3: In-Memory Rate Limit on `/api/screen/seen` Doesn't Work on Serverless

**Severity:** MEDIUM | **Status:** ✅ IMPLEMENTED July 2026
**Impact:** Prevent anonymous random-token read loops and repeated liveness writes across serverless instances
**Files:** `src/app/api/screen/seen/route.ts`, `src/lib/rateLimit/configs.ts`

### Historical Implementation

```typescript
const seenRequests = new Map<string, number>(); // Module-level in-memory map
```

On Vercel serverless, each function instance has its own `Map`. The rate limit (1 per hour) only works within a single instance. If the function cold-starts or runs on a different instance, the Map is empty.

### Current Implementation

The route now uses the shared Upstash-backed limiter twice:

- `SCREEN_SEEN_SIGNAL` limits hashed IPs before JSON parsing or Firestore lookup.
- A hashed token/store key allows one useful lookup per hour across serverless instances.
- The persisted UTC date guard skips a write if that screen was already recorded today.
- Client localStorage remains a cost-saving first line, but is no longer the server security boundary.

Unexpected route failures return `503`; the display stays usable and does not cache the daily marker, so a later page load can retry.

---

## FINDING 4: 6-Hour Proactive Refresh Causes Unnecessary SSR Reads

**Severity:** LOW  
**Impact:** 6 extra reads/day per screen (50% of total daily reads)  
**File:** `src/app/screen/[token]/ScreenDisplay.tsx:225-233`

### Current Implementation

```typescript
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const proactiveRefresh = setInterval(() => {
  window.location.reload(); // Full page reload → full SSR → 2 Firestore reads
}, SIX_HOURS_MS);
```

This is a health maintenance measure for long-running screens (memory leaks, stale SDK). It triggers 3 extra page reloads per day (after the initial boot), each costing 2 reads.

### Current Cost Contribution

- 3 refreshes × 2 reads = 6 reads/day per screen
- At 1000 screens: 180K reads/month = $0.11/month

### Recommended Optimization

Instead of full `window.location.reload()`, use a soft refresh that only re-fetches data via an API call or re-calls the seen endpoint, without full SSR:

```typescript
// Soft refresh: just check if content version changed
const checkHealth = async () => {
  try {
    // onSnapshot listener already handles data freshness
    // Just reset any accumulated state/memory
    setState((prev) => ({ ...prev, currentIndex: 0 }));
    console.log("[Screen] 6-hour health reset (soft)");
  } catch {
    // If anything fails, do full reload as fallback
    window.location.reload();
  }
};
```

**However:** The full reload also picks up new code deploys. If this is important, keep the full reload.

### Recommendation

**Keep as-is.** The 6-hour reload ensures screens pick up code updates deployed to Vercel. The $0.11/month for 1000 screens is negligible. The reliability benefit outweighs the cost.

---

## FINDING 5: `screenRenderer.ts` Is Partially Dead Code

**Severity:** VERY LOW (code hygiene) | **Status:** ✅ PARTIALLY FIXED  
**Impact:** 0 cost — just unused functions  
**File:** `src/lib/screen/screenRenderer.ts`

### Analysis

`screenRenderer.ts` exports 8 functions/types:

- `SCREEN_CONFIG` — **used** (values are correct, but `page.tsx` duplicates them inline at line 16-19)
- `ScreenRendererState` — **not used** (ScreenDisplay uses its own `ScreenState` interface)
- `createInitialState()` — **not used**
- `getNextSlideIndex()` — **not used** (ScreenDisplay computes inline)
- `shouldRefresh()` — **not used**
- `hasContentVersionChanged()` — **not used**
- `parseAPIResponse()` — **not used**
- `getSlideLabel()` — **not used** (ScreenDisplay computes inline)
- `calculateSlideProgress()` — **not used**

### Implementation (Feb 8, 2026)

`page.tsx` now imports `SCREEN_CONFIG` from `screenRenderer.ts` instead of duplicating values inline. The unused helper functions remain for potential future use (3-year freeze — don't delete potentially useful code).

---

## FINDING 6: No Price Display on Screen Slides

**Severity:** HIGH (market adoption) | **Status:** ✅ v2.0 IMPLEMENTED  
**Impact:** Missing prices = non-negotiable flaw per market research  
**Files:** `src/types/campaigns.ts:401`, `src/lib/screen/evergreenSlides.ts:66`, `src/lib/screen/slideGenerator.ts:114`, `src/app/screen/[token]/ScreenDisplay.tsx:482-484`

### What Was Done

1. Added `price?: number` to `ScreenSlide` interface (`campaigns.ts:401`)
2. Price propagated through `evergreenSlides.ts` and `slideGenerator.ts` campaign slides
3. Price rendered in `SlideContent` component with green accent color (`₹` format)

**Firebase cost impact:** $0 — data already fetched.

---

## FINDING 7: No Menu Board Mode (Primary Market Use Case Missing)

**Severity:** HIGH (market adoption) | **Status:** ✅ v2.0 IMPLEMENTED  
**Impact:** 70%+ of restaurant screens serve as menu boards; our feature only offers promotional slideshow  
**Source:** Market research (PosterBooking, Fugo, Foodhub) + ChatGPT strategic review

### What Was Done

1. Created `MenuBoardDisplay.tsx` (~510 lines) — full menu with categories, prices, auto-pagination, QR, offline cache, Firebase listener
2. `page.tsx` mode routing via `resolveScreenMode()` + `?mode=` query parameter
3. Default URL = Menu Board; `?mode=highlights` = existing slideshow
4. Feature flag `DIGITAL_SCREENS_MODE` = `"menu_board"` in `features.ts`
5. `ScreenLink.tsx` updated to show both URLs with copy buttons

**Firebase cost impact:** $0 — same data pipeline, different client render. See `digital-screens_firebase.md` for detailed analysis.

---

## Summary: Priority-Ordered Action Items

| #   | Finding                                        | Priority | Status     | What Was Done / Planned                                  |
| --- | ---------------------------------------------- | -------- | ---------- | -------------------------------------------------------- |
| 1   | Seen endpoint uses query instead of doc lookup | MEDIUM   | ✅ DONE    | Sends storeId, direct doc lookup with token verification |
| 2   | Layer 3 (Evergreen) missing — dead code        | MEDIUM   | ✅ DONE    | Option A: fetch items in page.tsx, use slideGenerator.ts |
| 3   | In-memory rate limit on serverless             | MEDIUM   | ✅ DONE    | Shared hashed IP + token/store rate limits and persisted daily guard |
| 4   | 6-hour refresh causes extra SSR reads          | LOW      | — Accepted | Reliability > cost ($0.11/month at 1K)                   |
| 5   | screenRenderer.ts dead code                    | VERY LOW | ✅ PARTIAL | page.tsx now imports SCREEN_CONFIG; unused helpers kept  |
| 6   | No price display on slides                     | HIGH     | ✅ DONE    | Price added to ScreenSlide, rendered in both modes       |
| 7   | No Menu Board mode                             | HIGH     | ✅ DONE    | MenuBoardDisplay.tsx + mode routing + feature flag       |

---

## Net Impact After February Implementation

| Metric              | Before (v1.0)         | After v2.1                                | After v2.0 (IMPLEMENTED)           |
| ------------------- | --------------------- | ----------------------------------------- | ---------------------------------- |
| Cost (1K screens)   | $0.27/month           | $0.41/month (+$0.14)                      | $0.41/month (+$0.00)               |
| Slide layers active | 3 of 4 (no evergreen) | **4 of 4**                                | **4 of 4** + Menu Board            |
| Dead code lines     | ~300                  | ~80 (unused helpers in screenRenderer.ts) | ~80 (same)                         |
| Seen endpoint       | Query (index scan)    | Direct doc lookup                         | Direct doc lookup (same)           |
| Price display       | Not shown             | Not shown                                 | **✅ Shown in both modes**         |
| Rendering modes     | 1 (Highlights only)   | 1 (Highlights only)                       | **✅ 2 (Menu Board + Highlights)** |
| Market coverage     | ~20-30% (promo only)  | ~20-30% (promo only)                      | **✅ ~90% (menu board + promo)**   |

**Bottom line:** All 7 February findings were addressed. v2.0 added Menu Board mode + price display for $0.00/month additional at that baseline. Current June 2026 cost range is lower on projection hits; see Current Cost Baseline and Finding 12.

---

## FINDING 8: Basic/Traditional UI on Customer-Facing Screens

**Severity:** HIGH (differentiation) | **Status:** SUPERSEDED by June 2, 2026 readability hardening
**Impact:** Generic dark-theme menu board and flat slideshow — no visual differentiation from competitors  
**Source:** Web research (DotSignage trends 2025, CrownTV design guide, industry best practices)

**Current decision:** The v2.1 decorative treatment was later judged too close to generic signage software and too weak for distance readability. Runtime screens now prioritize stable high-contrast TV output: no ambient orbs, no glassmorphism dependence, no food thumbnails in Menu Board rows, no shimmer/pulse tags, no negative letter spacing, and larger item/price typography.

### What Was Done

**MenuBoardDisplay.tsx — Premium Redesign:**

1. Animated ambient background with floating gradient orbs (3 orbs, different colors/speeds)
2. Glassmorphism category cards with `backdrop-filter: blur()`, colored accent borders
3. Food image thumbnails (44px rounded) for items with photos; letter-initial placeholders for items without
4. Cycling accent color palette (Amber, Pink, Blue, Emerald, Violet, Orange) per category
5. Animated "Popular" tags with shimmer effect and pulsing dot
6. Staggered item fade-in animations via framer-motion (catIdx _ 0.1 + itemIdx _ 0.04)
7. Progress bar replacing basic dots — linear fill with gradient + page counter
8. Logo glow effect with animated gradient border
9. QR card redesign (horizontal layout with label)
10. Typography upgrade — 800 weight headers, -0.5px letter-spacing, tabular-nums for prices
11. Currency symbol (₹) rendered smaller and muted per price psychology research

**ScreenDisplay.tsx — Highlights Upgrade:**

1. Ken Burns effect on food images (`scale(1) → scale(1.08)` over 12s)
2. Multi-stop gradient overlay (bottom-heavy for text readability + side vignettes)
3. Full-bleed image layout (image covers entire viewport, not constrained)
4. Glassmorphism price pill badge (green tint, backdrop-blur)
5. Label badge with factual wording ("Featured", "Today", "Popular", "On menu")
6. Screen-safe brand fallback slide with fixed branding and no decorative orbs
7. Capsule-style progress indicators (active = wider, done = brighter)
8. QR code repositioned to top-right corner (unobtrusive)
9. Smoother slide transitions (scale + opacity with custom cubic-bezier easing)
10. Text shadows for depth on all slide content

**Design Research Applied:**

- Remove dotted separators → clean spacing (CrownTV guide)
- Subtle animations grab attention without distraction (DotSignage trends)
- High-contrast text on gradient overlays (WCAG readability)
- Food thumbnails increase appeal and purchase intent (industry standard)
- Bestseller highlighting drives upsells (CrownTV positioning strategy)

**Firebase cost impact:** $0 — CSS-only changes, same data pipeline.

---

## FINDING 9: Screen Metadata Enrichment + Creative CSS Templates

**Severity:** HIGH (visual impact) | **Status:** ✅ v2.2 IMPLEMENTED  
**Impact:** Screens lacked item descriptions, dietary badges, and creative poster-style layouts  
**Source:** Reference image analysis + existing `ExtractedDataItem` metadata audit

### Decision: No AI Image Generation for Screens

**Evaluated and rejected.** Reasons:

- Owners already generate food images via Projects editor AI pipeline (`/api/image-generation/`)
- Those images flow to screens automatically via `item.images[0].url`
- AI-generated poster images would be stale when prices/names change
- CSS renders instantly at $0 cost; AI costs $0.04/image + regeneration triggers
- Real food photos (owner-uploaded or AI-generated in Projects) build more customer trust

### Implementation: Existing Item Images + Rich Metadata + Creative CSS

**✅ Metadata Flow Enhancement:**

- Added `description`, `tags` to `MenuItemForSlide` (`slideGenerator.ts:42-43`)
- Added `description`, `tags` to `ScreenSlide` (`campaigns.ts:402-403`)
- Updated `getMenuItemsForScreenServer()` to extract description (primary language) and tags from `ExtractedDataItem`
- Updated `createCampaignSlide()` and `generateEvergreenSlides()` to pass through new fields

**✅ Highlights Poster-Style Slides (ScreenDisplay.tsx):**

- Dietary badge (Veg/Non-Veg) with glassmorphism styling — green square dot for Veg, red circle for Non-Veg
- Item description text (max 120 chars, truncated) below item name
- Decorative gradient accent strip at top of slide (amber → pink → blue → emerald)
- Meta row layout (price pill + caption side-by-side)
- Store name watermark (subtle bottom-right branding)
- Top row with label badge + dietary badge together

**✅ Menu Board Enhancement (MenuBoardDisplay.tsx):**

- Dietary indicator dots (Veg = green square, Non-Veg = red circle) inline with item name
- Short description text (max 60 chars) under item name in muted color
- Item name row restructured to column layout (name row + description)
- Letter-initial placeholders for items without images (already in v2.1)

**Firebase cost impact:** $0 — same data pipeline, just extracting more fields from existing project data.

---

## FINDING 10: Owner Trust And TV Distance Readability Gap

**Severity:** HIGH (owner trust + public output) | **Status:** ✅ IMPLEMENTED June 2, 2026
**Impact:** Owner setup showed generic links, Menu Board text was too small for counter viewing, owner-only mode was stored but not enforced, and ordinary public cache invalidation did not reliably touch screen content version.

### What Was Done

**Owner setup:**

- `ScreenLink.tsx` now renders separate Menu Board and Highlights setup cards with compact URLs, QR blocks, copy/open actions, exact-version per-mode status, and owner-triggered refresh.
- `ScreenLink.tsx` now detects blocked Menu Board / Highlights browser opens and logs bounded link metadata only.
- `DigitalScreenSettings/index.tsx` passes canonical `contentVersion` plus `screenSeenByMode`, renames the override to "Only custom slides", and makes clear that Menu Board is unaffected.
- `DigitalScreenSettings/index.tsx` now logs settings load and owner-only override failures through bounded diagnostics; shared owner-control tracking is quiet on success and bounded on failure.
- Historical July 2026 state: `CurrentSlides.tsx` described custom slide content accurately. The duplicate component was removed on July 29; `OwnerUploads.tsx` is now the single custom-slide list.
- `MobileDigitalScreensScreen.tsx` mirrors desktop setup with separate current-version status, manual refresh, compact screen cards, custom slide controls, owner-only toggle copy, and bounded blocked-open diagnostics for screen-link previews.

**TV output:**

- `MenuBoardDisplay.tsx` now preserves category/item order where `categoryOrderIndex` and `orderIndex` are available.
- Menu Board rows use larger screen-grade item names and prices, fewer rows per page, aligned price columns, no thumbnails, no ambient effects, no shimmer tags, and stable dimensions.
- `ScreenDisplay.tsx` removes brand fallback orbs/glass effects and uses calmer fixed badges/pills for Highlights.

**Data freshness:**

- `MenuItemForSlide` now carries `categoryOrderIndex` and `orderIndex`.
- `getMenuItemsForScreenServer()` populates order metadata from extracted menu data; the rules-incompatible browser duplicate has been removed.
- `generateScreenSlides()` now enforces owner-only custom slide mode.
- `touchDigitalScreenContentVersion()` links public client cache invalidation to screen content version for initialized screens only.
- Historical July 2026 state: `/api/revalidate/menu` included global `screen-data`. July 29 replaced this with exact hashed-token state invalidation plus `menu-store-{storeId}`.

**Firebase cost impact:** For stores with initialized screens, public menu/cache invalidation adds one guarded `platformSummary` read and one `screen.contentVersion` write. No new collection, Storage path, Cloud Function, scheduler, rule, or index.

---

## FINDING 11: Screen Content Trust Gap

**Severity:** HIGH (public output trust) | **Status:** ✅ IMPLEMENTED June 2, 2026
**Impact:** Screen content could show weak fallbacks: currency-bearing prices might parse as missing, category IDs could leak when category lookup failed, evergreen labels could overclaim permanent availability, campaign labels could imply owner claims, and custom slide management names could appear as poster overlays.

### What Was Done

- Added `screenContent.ts` as the shared normalization layer for screen text, truncation, prices, category fallback, image URLs, tags, diet-tag detection, owner captions, and item dedupe.
- Updated client and server screen menu extraction to use content normalization before returning `MenuItemForSlide`.
- Changed missing Menu Board prices from a dash to `Ask`.
- Replaced risky labels such as permanent availability and chef-style claims with factual labels: `Today`, `Popular`, `Featured`, category name, or `On menu`.
- Updated evergreen selection to prefer bestsellers, priced items, source menu order, and category variety.
- Changed custom `owner_upload` slides so uploaded artwork displays without forced item-title/caption overlays.
- Normalized custom slide captions on upload, edit, desktop display, and mobile display.

**Firebase cost impact:** $0 — CPU-only normalization in existing reads/render flow. No new reads, writes, collections, Storage paths, Cloud Functions, schedulers, indexes, or rules.

---

## FINDING 12: Public Screen Project-Read Rebuild

**Severity:** MEDIUM (public read cost + cold-render stability) | **Status:** ✅ IMPLEMENTED June 6, 2026
**Impact:** Cold public screen renders rebuilt menu items from project documents even when the same screen summary document was already being read for the token/listener path.

### What Was Done

- Added `ScreenMenuProjection` inside the existing `platformSummary/campaigns_{sId}.screen` state.
- `touchDigitalScreenContentVersion()` now attempts to refresh a capped available-item projection from the automatic default menu when a screen already exists.
- `/screen/[token]` uses the projection only when `baseProjectId`, base menu slug context, `activeSpecialMenuId`, and `contentVersion` match current screen data.
- Missing, stale, special-menu, or failed projection states fall back to the existing project-document reconstruction path.
- Shared the screen menu extraction helper between client/server fallback paths and projection generation to avoid divergent menu output.
- The summary and selected-project rebuild reads now use the same Firestore transaction as the content-version/mirror writes. Concurrent menu updates therefore retry the projection refresh instead of allowing stale items to carry the new version.

**Firebase cost impact:** No new operation, collection, index, function, scheduler, Storage path, or rule. The same existing projection reads are now transaction-bound. A valid projection reduces the typical cold public screen render from 4 reads to 2 reads before edge cache hits by avoiding both the project summary lookup and project document fallback. Stores with initialized screens can spend up to 2 extra owner-side reads during public cache invalidation to refresh the projection.

---

## FINDING 13: Public Listener Mirror Exposed The Bearer Screen Token

**Severity:** CRITICAL (screen URL authorization) | **Status:** ✅ SOURCE FIXED July 16, 2026; ordered deployment pending

The predictable `platformSummary/screen_{storeId}` document previously included `screenToken` and allowed anonymous reads. This defeated the token's high entropy because anyone who knew or guessed a store ID could recover the bearer URL token.

**Fix:**

- Remove `screenToken` from every app and Functions public-mirror writer.
- Restrict anonymous Firestore access to exact-document `get`; public collection listing is denied.
- Keep enabled state, store ID, content version, and timestamps only.
- Add a dry-run-by-default, explicit-project backfill for existing mirrors.
- Enforce rollout order: safe writers → backfill → tightened rule.

**Cost:** One tiny replacement write per initialized screen during migration; steady-state read/write count is unchanged.

## FINDING 14: Lifecycle, Kill-Switch, Permission, And Cache Parity Gaps

**Severity:** HIGH | **Status:** ✅ IMPLEMENTED July 16, 2026

- Expired slides were hidden from Highlights but still consumed the three-slide cap. Shared DAL reads now hide them and the next mutation prunes their Firestore references.
- Mobile duplicated the `3` / `14` configuration and omitted owner-control tracking; it now uses shared flags and the desktop tracking contract.
- Mobile Share, Mobile More, desktop Output Center, Business Settings, and both settings components now require the feature flag and `canManageDigitalScreens` before loading or exposing bearer links. Desktop/mobile Menu Manager omit the link unless the same permission is present, and their URL helper rejects malformed tokens.
- The public display and seen route now respect the feature kill switch.
- Highlights no longer overwrites a valid local fallback with an empty server payload, and it clamps the active index when a refreshed rotation shrinks.
- Unexpected seen-route failures return a retryable response instead of being cached as a successful daily signal.

**Cost:** No new steady-state Firebase operations. Expired reference pruning is folded into an existing mutation write.

---

## FINDING 15: Compiled TV Presentation And First-Frame Reliability

**Severity:** CRITICAL | **Status:** ✅ IMPLEMENTED July 29, 2026

**Impact:** The current Next.js/Turbopack runtime did not reliably emit the screen components' runtime styled-jsx rules. The Menu Board could therefore render as an unstyled document, and Framer Motion's server-side initial opacity could leave approved screen content blank. Highlights also allowed square owner artwork to establish a square slide height, cropping the lower part of the artwork on a landscape TV.

### What Was Done

- Replaced the duplicated Menu Board and Highlights styled-jsx blocks with one compiled `screenDisplay.module.scss` stylesheet.
- Scoped global TV selectors under the compiled Menu Board or Highlights root class so Framer Motion wrapper elements receive the intended layout rules.
- Disabled hidden first-frame motion states for menu pages, categories, rows, and Highlights slides. Transitions still work after the first approved frame is visible.
- Anchored both roots to the viewport and positioned Highlights wrappers to exact viewport bounds.
- Kept owner artwork on `object-fit: contain`; item photography remains full-bleed with a fixed readability overlay.
- Standardized category cards, type hierarchy, price alignment, QR reservations, offline status, brand fallback, empty output, fullscreen recovery, and reduced-motion behavior.
- Removed the obsolete inline style blocks and added source-verifier assertions for the compiled style and first-frame contracts.

### Visual Evidence

- 1280x720 Menu Board: two columns, four visible categories, aligned prices, no footer collision.
- 1920x1080 Menu Board: deterministic content-aware columns, wrapped long names, no horizontal or viewport overflow.
- 768x1024 portrait Menu Board: compact single-column pages with footer/progress clearance.
- 1280x720 Highlights: owner poster, item highlight, and brand fallback all remain inside the exact TV canvas.
- Empty Menu Board: truthful, centered fallback without loading or publishing claims.
- 1280x720 OBP-color cross-check: a non-fallback `#2c7a67` accent reached the Menu Board header and every category frame while category text, prices, and canvas retained fixed high-contrast colors; Highlights used the same accent on the brand logo frame. Neither state overflowed the viewport.

**Firebase cost impact:** $0. The change is presentation-only and adds no read, write, listener, Storage, Function, scheduler, or index.

---

## FINDING 16: Competitive Presentation And Screen-Distance Clarity

**Severity:** HIGH (customer-facing output quality) | **Status:** ✅ IMPLEMENTED July 29, 2026

**Impact:** A fixed wide-screen column count made a moderate menu look unnecessarily sparse, standard portrait output rotated one category at a time despite available space, QR destinations were visually unexplained, and the brand fallback hid the business name whenever a logo existed.

### Market Evidence Reviewed

- [ScreenCloud menu boards](https://screencloud.com/digital-menu-board) and [design rules](https://screencloud.com/digital-signage/design-rules): strong hierarchy, contrast, readable type, high-impact visuals for selected products, and sufficient dwell time.
- [OptiSigns readability guidance](https://www.optisigns.com/post/stop-the-squinting-how-to-make-your-digital-menu-boards-easier-to-read): category/column structure, one aligned item-price row, restrained emphasis, and distance-readable typography.
- [Yodeck menu-board guidance](https://www.yodeck.com/use-cases/how-to-design-digital-menu-board/): minimal clutter, clear hierarchy, strong real imagery, and explained QR use.
- [NoviSign menu-board guidance](https://www.novisign.com/blog/solutions/howto-effective-digital-menu-board/): color-coded category structure, spacing, high-resolution imagery, and orientation-aware layouts.
- [Samsung menu-board guidance](https://insights.samsung.com/2024/10/24/menu-board-ideas-unique-ways-to-leverage-digital-signage-for-menus/): current items/prices, daypart relevance, and branded product photography.
- [Toast digital menu-board support](https://support.toasttab.com/en/article/Create-a-Menu-for-the-Delphi-Digital-Menu-Board): published-menu authority, automatic price updates, and item visibility/stock truth.

### What Was Done

- Menu Board now chooses the smallest column count that can hold the current page at the current screen capacity. Moderate 1080p menus use two balanced columns; dense menus retain three.
- Column admission uses an exact bounded assignment rather than a greedy approximation, so category order cannot add an unnecessary column when a valid smaller layout exists.
- Wide two-column boards use the recovered space for descriptions and screen-distance typography rather than leaving a mostly empty third column.
- Wide descriptions appear only when every rendered column has comfortable row and category density; dense or short displays automatically stay compact.
- Standard portrait boards use compact rows without secondary descriptions and fit two representative categories per page, reducing unnecessary rotations while preserving full names and prices.
- Highlights QR cards now identify the destination as `Full menu`; a custom slide URL uses the neutral `Scan` label.
- Brand fallback always shows the business name, even when the business has a logo.
- Digital Screens now inherit the canonical normalized `store.publicPresence.accentColor` already selected for the Official Business Page.
- The owner accent is limited to decorative screen chrome: Menu Board header/progress/category framing and Highlights logo/slide accents. The prior rotating category palette was removed so it cannot compete with the business brand. Semantic and readable colors for prices, dietary markers, category text, body text, and the dark TV canvas remain fixed.
- Saving the nested OBP accent is now recognized as a Digital Screen output change, so the screen content version and exact token cache refresh immediately instead of waiting for the 60-second cache lifetime.
- Offline status remains below the expanded QR reservation.

### Deliberately Rejected Scope

- No drag-and-drop signage editor, template marketplace, weather/social/RSS widgets, video wall, POS-specific management layer, or per-screen campaign analytics.
- Menu Board remains the canonical business-truth surface. Food photography and owner artwork remain in Highlights, where one visual and one message can be presented clearly.
- No Digital Screen-specific styling controls were added; the existing OBP brand color flows through automatically.

**Firebase cost impact:** Rendering adds no operation, listener, Storage path, Function, scheduler, index, or dependency. Saving a changed OBP accent for an initialized screen now reuses the existing guarded screen-refresh transaction: up to 2 `platformSummary` reads and 2 writes for the canonical version and token-free public mirror. A store without an initialized screen performs the 2 guarded reads and no screen write.

---

## Document History

| Version | Date       | Author  | Changes                                                                                                                                                                                                                                                                                     |
| ------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-02-08 | Cascade | Initial analysis from full codebase trace                                                                                                                                                                                                                                                   |
| 2.0     | 2026-02-08 | Cascade | **Findings 1, 2, 5 implemented** — updated status, cost baseline, and net impact                                                                                                                                                                                                            |
| 3.0     | 2026-02-08 | Cascade | **Findings 6, 7 added** — price display fix + Menu Board mode (v2.0 planned)                                                                                                                                                                                                                |
| 4.0     | 2026-02-08 | Cascade | **Findings 6, 7 IMPLEMENTED** — price in ScreenSlide, MenuBoardDisplay.tsx shipped                                                                                                                                                                                                          |
| 5.0     | 2026-02-08 | Cascade | **Finding 8 IMPLEMENTED** — premium UI/UX redesign (glassmorphism, Ken Burns, animations)                                                                                                                                                                                                   |
| 6.0     | 2026-02-08 | Cascade | **Finding 9 IMPLEMENTED** — metadata enrichment (description, tags) + CSS templates. AI image gen for screens evaluated and rejected                                                                                                                                                        |
| 7.0     | 2026-02-08 | Cascade | **v2.2.1 HARDENING:** 7 fixes — dietary dot logic bug, cache-first MenuBoard init, category header 18→22px, description opacity 0.35→0.45, ITEMS_PER_PAGE 12→10, broken image fallback, reload guard (30s throttle)                                                                         |
| 8.0     | 2026-02-08 | Cascade | **v2.2.2 REFACTOR:** `guardedReload` → shared util, `MenuItemForSlide` + `ScreenStoreInfo` → `@type/campaigns.ts`, circular dependency eliminated, 3 duplicate interfaces removed                                                                                                           |
| 9.0     | 2026-03-15 | Cascade | **v2.3 HARDENING (ChatGPT review v3):** Token entropy 8→22 chars. Reload jitter for mass reload smoothing. MenuBoard: broken image fallback, listener offline+retry, sold-out messaging, MAX_TOTAL_ITEMS=200. Auto-fullscreen recovery. Settings: activity status, Main TV/Second TV labels |
| 10.0    | 2026-06-02 | Codex   | **Owner trust + TV readability hardening:** Setup cards/status, mobile parity, owner-only mode enforcement, ordered Menu Board, screen-grade typography, and public-cache-linked screen version touch.                                                                                       |
| 11.0    | 2026-06-02 | Codex   | **Content trust hardening:** Shared content normalization, safer price/category/tag parsing, factual labels, evergreen category variety, custom-slide artwork rendering, and caption safety.                                                                                                |
| 12.0    | 2026-06-06 | Codex   | **Public read hardening:** Added generated available-item `screen.menuProjection` inside existing screen summary state with current-version/base-menu guards and project-read fallback.                                                                                                    |
| 13.0    | 2026-07-01 | Codex   | **Seen-signal eligibility hardening:** Current cost baseline now includes the possible cached public store eligibility read before daily liveness writes. |
| 14.0    | 2026-07-16 | Codex   | **End-to-end hardening:** Token-free get-only public mirror and migration guard; shared rate-limit truth; feature/permission/mobile parity; expired-slide capacity recovery; cache/index safety; retryable seen failures. |
| 14.1    | 2026-07-16 | Codex   | **Projection consistency:** Moved summary/project projection rebuild reads into the existing invalidation transaction so concurrent menu saves retry without changing operation counts. |
| 15.0    | 2026-07-29 | Codex   | **Compiled TV presentation:** Replaced unreliable runtime styled-jsx, guaranteed visible first frames, bounded Highlights to the viewport, and browser-verified Menu Board, poster, item, brand, portrait, and empty states. |
| 16.0    | 2026-07-29 | Codex   | **Competitive presentation hardening:** Added exact content-aware columns, density-guarded descriptions, compact portrait paging, labeled QR destinations, and persistent business identity on brand fallback. |
| 16.1    | 2026-07-29 | Codex   | **OBP brand continuity:** Propagated the canonical normalized OBP accent into restrained screen chrome and made accent saves refresh initialized screens immediately. |
