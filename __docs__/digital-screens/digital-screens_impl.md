# Digital Screens — Technical Implementation

**Created:** January 4, 2026
**Status:** 🔒 **v2.3 LOCKED — Controlled owner testing ready; full production certification pending the overall MenuList audit.**
**Last Audit:** July 16, 2026 (token-free get-only listener mirror, kill-switch coverage, permission parity, retryable seen failure, expired-slide pruning, cache preservation, and guarded mirror migration)
**Applies:** 3-Year Architecture Freeze Rule

> **Launch boundary:** Not current launch certification or deploy approval. This implementation document records source-gated Digital Screens runtime evidence only. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:digital-screens-boundary`, browser TV smoke for Menu Board and Highlights modes, authenticated desktop/mobile owner settings QA, physical-device TV/tablet/browser QA, target Firebase deploy evidence where rules, indexes, Storage, or Functions change, target Vercel deploy evidence where app routes or display clients change, and production-host smoke for the target tenant and screen URL.

---

## Architecture Overview

```
Server Component (page.tsx)
    ↓ fetches via DAL
getScreenDataByTokenServer(token) → platformSummary + public store gate (2 reads; cached tenant fallback only when needed)
project summary lookup       → automatic base menu + QR slug when projection context is missing (0-1 read)
screen.menuProjection      → generated available menu items when version/project/slug context match (0 extra reads)
getMenuItemsForScreenServer() → scoped project items fallback (usually 1 read after baseProjectId)
    ↓ generates slides (for highlights mode)
generateScreenSlides()     → Owner Pinned + Campaign + Evergreen + Brand Fallback
    ↓ reads ?mode= query parameter
    ↓ passes to appropriate client component:

  mode=default → MenuBoardDisplay.tsx  (full menu, categories, prices, auto-paginate)
  mode=highlights → ScreenDisplay.tsx  (rotating slides, 8s interval, hero images)

Both share: Cache (localStorage) · Firebase listener on public-safe `screen_{storeId}` mirror (onSnapshot) · Seen signal (1/day, same-origin/no-store/manual-redirect request, daily marker only after OK)
```

**Key decisions:**

- **No separate screen collection** — canonical screen state stays in `platformSummary/campaigns_{sId}.screen`; public clients receive only a safe `platformSummary/screen_{sId}` listener mirror.
- **No API routes for screen display** — server component + DAL pattern
- **No polling** — Firebase `onSnapshot` doc listener drives content-version reloads after acknowledged public-output changes
- **No Service Worker** — removed; localStorage cache sufficient
- **Public store check** — `getScreenDataByTokenServer()` uses the shared public store/tenant block gate and rejects missing, inactive, deleted, store-blocked, or tenant-blocked records
- **Default = Menu Board** — `/screen/token` renders full menu; `?mode=highlights` for slideshow
- **Mode via URL only** — no settings UI for mode selection; zero cognitive load
- **Menu source is automatic** — screens follow the store's active menu truth; no project picker
- **Generated menu projection stays inside screen state** — no separate screen-menu document; cold public renders use `screen.menuProjection` only when it matches `baseProjectId`, base menu slug context, active special-menu state, and `contentVersion`; the stored projection contains display-eligible available items only.
- **Public listeners are isolated** — `ScreenDisplay` and `MenuBoardDisplay` listen to `platformSummary/screen_{sId}`, not the internal `campaigns_{sId}` summary that contains Today, staff-prompt, physical-surface, and campaign data.
- **Bearer tokens stay canonical/private** — the public listener mirror contains no `screenToken`, public Firestore access is exact-document `get` only, and collection listing stays denied.
- **Owner-only override is real** — Highlights uses valid custom slides only when `ownerOverrideEnabled` is on, with brand fallback if all custom slides expire.
- **Content is normalized before display** — screen extraction normalizes localized text, strips HTML-like/control text, parses currency-bearing prices, blocks technical category IDs, dedupes items, normalizes tags, and caps custom slide captions.
- **Currency symbol follows store settings** — `ScreenStoreInfo.currencySymbol` is hydrated from the store document and passed to Menu Board / Highlights price renderers.
- **Owner uploads are artwork** — `owner_upload` slides render the uploaded image as the content and do not overlay the management caption as TV copy.
- **Public cache invalidation touches screens** — client-side project/menu public cache invalidation also increments screen content version when a screen token already exists; store-profile saves, master-to-outlet propagation, and selected Functions public-output changes touch screens after public cache revalidation when rendered output changes.
- **Screen SSR cache tag included** — `/api/revalidate/menu`, the shared `revalidateMenuCache()` action, and direct public-truth mutation routes include `screen-data` so screen SSR reads can refresh with public menu, store, outlet, entitlement, and routing changes.
- **Server-side live screen wakeup** — Next.js server actions/routes that mutate public truth use `touchDigitalScreenContentVersionForStoreServer()` to bump initialized screen content versions and the `screen_{storeId}` listener mirror without creating partial screen state when a screen token is absent.
- **Shared public attribution** — both screen modes render the same quiet `Powered by MenuList. All rights reserved` attribution used by public OBP/menu surfaces.
- **Seen-signal request boundary** — Highlights and Menu Board post `/api/screen/seen` with same-origin credentials, no-store cache policy, and manual redirect handling before caching the daily local marker only after an OK response. The route writes only after cheap-fail validation, token binding, enabled-screen validation, a `campaigns_{storeId}` summary id guard for legacy lookup, and shared public-safe store eligibility.
- **Seen failures remain retryable** — unexpected route failures return `503`; the display continues rendering and does not cache the daily marker, allowing a later page load to retry.
- **Feature and permission gates align** — disabling `DIGITAL_SCREENS_ENABLED` closes the public page, seen endpoint, and owner entry points. Desktop/mobile screen links and settings require `canManageDigitalScreens` before their state read, ignore an in-flight load after access is removed, and both Menu Manager clients omit the bearer link without that permission.
- **Expired uploads recover capacity** — owner reads hide expired custom slides and the next owner/content-version mutation prunes their Firestore references before enforcing the shared upload cap. Display expiry does not directly delete immutable media objects.
- **Highlights cache stays last-known-good** — a fresh empty render no longer overwrites valid cached slides, and a shorter refreshed rotation clamps the current index before render.
- **Diagnostics are bounded** — public token misses and normal owner mutations stay quiet; unexpected resolver, fallback, settings, owner-control tracking, owner screen-link open, and invalidation failures use normalized secure diagnostics with bounded token/project/store/settings/link metadata instead of raw identifiers or error objects.
- **Dedicated source gate** — `npm run verify:digital-screens-boundary` locks the route, rules, listener mirror, seen-signal route, invalidation, owner desktop/mobile acknowledgement, and docs contracts for this feature.

---

## Complete File Map

### Types & Config

- `src/types/campaigns.ts:370-461` — `MenuItemForSlide`, `ScreenStoreInfo`, `ScreenSlide`, `DigitalScreenState`, `ScreenAPIResponse`, `SCREEN_CONFIDENCE_THRESHOLD` (0.7)
- `src/config/features.ts` — `DIGITAL_SCREENS_ENABLED` (true), `_CONFIDENCE_THRESHOLD` (0.7), `_UPLOAD_EXPIRY_DAYS` (14), `_MAX_UPLOADS` (3), **`DIGITAL_SCREENS_MODE`** (v2.0)

### Library (`src/lib/screen/` — 7 files)

- `utils.ts` (~100 lines) — High-entropy screen token generation, URL builder, expiry helpers, `guardedReload(componentName)` shared reload throttle
- `screenContent.ts` — Shared content normalization and extraction: text, truncation, price parsing, category fallback, image URL validation, tag normalization, diet tag detection, owner caption safety, item dedupe, and capped screen menu projection payload.
- `evergreenSlides.ts` (~95 lines) — `generateEvergreenSlides()`, `generateBrandFallback()` (imports `MenuItemForSlide` from `@type/campaigns`)
- `slideGenerator.ts` — 4-layer stack generator; respects owner-only custom slide mode; normalizes min/max slide counts with unique repeat IDs
- `screenRenderer.ts` (~140 lines) — `SCREEN_CONFIG` constants, `ScreenRendererState` (uses `ScreenStoreInfo`), `getSlideLabel()`
- `publicScreenState.ts` — Converts canonical screen state into the token-free public listener mirror; owner mutations write canonical and mirror documents in one transaction.
- `screenInvalidation.ts` — Browser-side screen content-version touch used by public cache invalidation. It reads the existing summary first, never creates partial screen state, materializes a compact default-menu projection when a project context is available, and supports store-output-only touches without projection reads.
- `serverScreenInvalidation.ts` — Next.js server-side screen content-version touch used by direct public-truth routes and `revalidateMenuCache()`. It reads the existing screen state, returns when no screen token exists, increments `screen.contentVersion`, and mirrors `screen_{storeId}` for live display listeners.

### Screen Page (`src/app/screen/[token]/` — 3 files)

- `page.tsx` (~90 lines) — Server component: DAL fetch, generated projection/fallback menu resolution, mode routing via `?mode=` query param
- `ScreenDisplay.tsx` — **Highlights mode** client: rotation, cache-first, onSnapshot, seen signal, hero image slides, QR, capsule progress, screen-safe brand fallback
- **`MenuBoardDisplay.tsx`** — **Menu Board mode** client: screen-grade full menu layout, ordered categories/items, price alignment, QR, progress bar, auto-pagination
- `ScreenAttribution.tsx` — Shared quiet MenuList attribution used by both screen modes.

### API Route (1 file)

- `src/app/api/screen/seen/route.ts` — Daily seen signal (1 write/day/screen) with bounded diagnostics, enabled-screen gate, legacy summary-id guard, and public store eligibility gate

### Functions Support

- `functions/src/logic/publicCacheRevalidation.ts` — Server-side cache revalidation helper. For first-extraction project saves, scheduled special-menu switching/repair, entitlement attribution changes, and incident recovery, it can also bump the existing screen content version and safe listener mirror. The requested screen touch is independent of Next.js cache configuration, so missing cache env does not silently suppress the screen listener update; the returned status reports cache and screen acknowledgements separately.

### DAL (`src/database/campaigns/`)

- `serverScreen.ts` — Public server-side screen resolver for `/screen/[token]`, including token lookup, store lookup, automatic base menu context, projection context validation, and project-read fallback.
- `getScreenDataByTokenServer(token)` — Server-only public resolver; validates token shape/uniqueness, campaign summary ID, and shared public store eligibility before automatic base-menu context
- `getMenuItemsForScreenServer(storeId, tenantId)` — Server-only fallback; re-verifies tenant/store ownership and document IDs before project reads
- `index.ts` — Owner/session DAL for screen setup, settings, uploads, pinned slide management, and content-version bumps.
- `getScreenState()` — Session required, returns DigitalScreenState
- `initializeScreenState()` — First-time setup, generates 22-character high-entropy token
- `updateScreenSettings()` — Toggle owner override
- `addPinnedSlide()` / `removePinnedSlide()` — Owner upload management (max 3)
- `bumpScreenContentVersion()` — Invalidation trigger
- `uploadScreenSlide()` — immutable Firebase Storage variant-ledger upload + transactional `addPinnedSlide`; duplicate content reuses existing objects, and failed persistence does not delete a path another concurrent save may reference
- Settings, caption update, and slide delete mutations return a typed digital-screen acknowledgement. Desktop and mobile callers must require `assertDigitalScreenMutationSucceeded()` before local screen state, pinned-slide state, or success copy changes. Slide uploads also require `assertDigitalScreenSlideUploadSucceeded()` after the outer `apiCallComposer()` result so storage/add-slide failures cannot resolve to success through fallback values.
- Initialization, settings, add/remove/caption, and owner content-version mutations use Firestore transactions. Canonical screen state and the public-safe listener mirror commit together, concurrent updates retry from current state, exact no-op retries avoid version bumps, and a missing caption target is rejected.

### Settings UI (`src/components/.../DigitalScreenSettings/` — 4 files)

- `index.tsx` — Main card: fetch state, owner-only toggle, settings composition
- `CurrentSlides.tsx` — Custom slide list and owner-only mode messaging
- `OwnerUploads.tsx` — Upload manager: max 3, 14-day expiry, delete, caption edit
- `ScreenLink.tsx` — TV setup cards for Menu Board + Highlights, compact URLs, QR blocks, last-seen status, and bounded copy/open diagnostics. Copied feedback waits for Clipboard API success or acknowledged textarea fallback success.
- `src/components/mobile/screens/MobileDigitalScreensScreen.tsx` — Mobile parity surface for TV status, both links, custom slides, owner-only toggle, and bounded copy/open diagnostics. Copied feedback follows the same acknowledged browser-local copy contract as desktop.
- `scripts/verification/verify-digital-screens-boundary.js` — Dedicated local source gate for Digital Screens public display, owner settings, cache invalidation, Firestore public mirror, and docs parity.
- `scripts/backfill-digital-screen-public-mirrors.ts` — Dry-run-by-default migration that replaces legacy token-bearing public mirrors before the tightened Firestore rule is deployed.

---

## Data Flow (End-to-End)

### 1. Screen Page Load (TV boots up)

```
Browser → /screen/[token] or /screen/[token]?mode=highlights
  → page.tsx (Server Component)
    → Read searchParams.mode (default: undefined = menu_board)
    → getScreenDataByTokenServer(token) [DAL — campaigns/serverScreen.ts]
      → Query platformSummary where screen.screenToken == token [1 read]
      → getDoc(stores/{storeId}) [1 read]
      → getDoc(platformSummary/projects_{storeId}) for automatic base menu + QR slug [1 read]
      → License check: active === false || blocked === true → null → 404
    → getUsableScreenMenuProjection(screen.menuProjection)
      → Use generated items when baseProjectId, activeSpecialMenuId, and contentVersion match [0 reads]
      → Else getMenuItemsForScreenServer(storeId, tenantId) [DAL fallback]
        → getDoc projects/{tenantId}/{storeId}/{projectId} [usually 1 read when baseProjectId is known]
        → Active special-menu overlay/replace can read the special project and, for overlays, the base project
      → Extract and normalize items:
          name, imageUrl, price, available, isBestSeller,
          categoryName, categoryOrderIndex, orderIndex,
          description, tags
      → Dedupe repeated items before rendering
    → IF mode === 'highlights':
        → generateScreenSlides() [slideGenerator.ts:49]
          → Layer 1-4 stack, min 3 / max 8, monotonicity
        → Return <ScreenDisplay initialData={slides, storeInfo, token, storeId} />
    → ELSE (default = menu_board):
        → Group menuItems by categoryName
        → Filter unavailable items
        → Return <MenuBoardDisplay initialData={menuItems, storeInfo, token, storeId} />
```

### 2. Client Initialization (ScreenDisplay.tsx)

```
1. Cache-first: Try localStorage → fall back to server data [line 59-87]
2. Update from server data if newer [line 96-106]
3. Cache data to localStorage [line 109-116]
4. Lazy QR: Delay rendering by 2s [line 119-125]
5. Start slide rotation timer (8s interval) [line 158-168]
6. Set up Firebase onSnapshot listener on `platformSummary/screen_{storeId}` [line 174-206]
7. Send daily seen signal (1/day via localStorage check; same-origin/no-store/manual-redirect POST; API writes only for enabled screens backed by public-eligible stores; local marker only after OK) [line 130-147]
8. Start 30-min offline fallback timer [line 209-218]
9. Start 6-hour proactive refresh timer [line 220-233]
```

### 3. Real-time Update Flow

```
Owner saves menu → bumpScreenContentVersion() [DAL]
  → OR public client cache invalidation → touchDigitalScreenContentVersion()
  → OR store-profile/public-output save → public cache revalidation → touchDigitalScreenContentVersion()
  → OR Functions public-output save → server cache revalidation → Functions screen version touch
  → contentVersion++ in platformSummary/campaigns_{sId}
  → platformSummary/screen_{sId} mirror updated with safe contentVersion state
  → screen.menuProjection refreshed from the automatic default menu when project context is available
     using transaction-bound summary/project reads, so concurrent menu changes retry
  → /api/revalidate/menu store invalidation also clears screen-data cache tag
  → onSnapshot fires on all connected screens for that store through the safe mirror
  → newVersion > currentVersion → window.location.reload()
  → Full SSR re-render → fresh slides
```

### 4. Owner Settings Flow

```
Settings page → DigitalScreenSettings/index.tsx
  → getScreenState() or initializeScreenState() [DAL]
  → Display:
      ScreenLink (v2.0: TWO links — Menu Board + Highlights)
      TV setup status (daily last-seen signal)
      CurrentSlides (custom slides + owner-only mode messaging)
      OwnerUploads (max 3, highlights mode only)
      Override toggle (highlights mode only)
  → Upload: file → base64 → uploadScreenSlide() → Storage + pinnedSlides[]
  → Delete: removePinnedSlide(slideId) → array update + contentVersion bump
  → Override: updateScreenSettings({ ownerOverrideEnabled }) + trackOwnerControlUsage
```

### 5. Content Management Flow (How Owner Actions Reach Screens)

> **Key principle:** Content management IS menu management. Owner never manages "screen content" separately.

```
MENU BOARD: Owner edits menu → screen refreshes through cache invalidation and the content-version listener
─────────────────────────────────────────────────────────────
Owner edits item in Editor (price, name, availability)
  → save triggers public cache invalidation for the store
  → public cache invalidation calls touchDigitalScreenContentVersion() when screen exists
  → contentVersion++ in platformSummary/campaigns_{sId}
  → screen.menuProjection refreshed inside the same transaction from summary/project reads when default menu data is available
  → platformSummary/screen_{sId} mirror updates
  → onSnapshot fires on MenuBoardDisplay.tsx
  → newVersion > currentVersion → window.location.reload()
  → page.tsx uses matching screen.menuProjection, or falls back to getMenuItemsForScreenServer()
  → MenuBoardDisplay re-renders with updated categories/items/prices in menu order

STORE OUTPUT: Owner edits rendered store profile fields
─────────────────────────────────────────────────────────────
Owner saves store name/logo/currency/route/status/special-menu/plan fields
  → updateStore() writes the store document
  → summary-relevant fields sync into storesSummary
  → public cache revalidation clears menu, store, client-store, and screen-data tags
  → touchDigitalScreenContentVersion() increments existing screen state without projection reads
  → platformSummary/screen_{sId} mirror updates
  → connected screens reload and hydrate fresh storeInfo from SSR

SERVER OUTPUT: Scheduler/extraction/entitlement changes public output
─────────────────────────────────────────────────────────────
Cloud Function writes project/store public truth
  → revalidatePublicClientCacheForStore(..., { touchDigitalScreen: true })
  → /api/revalidate/menu clears menu, store, client-store, and screen-data tags
  → Functions helper reads existing screen state
  → initialized screens get contentVersion + safe mirror update
  → connected screens reload and SSR rejects stale projections when needed

Owner marks item sold out
  → same flow above
  → MenuBoardDisplay filters out unavailable items (client-side)
  → Item disappears from board

Owner adds new category or item
  → same flow above
  → New category/item appears on board
```

```
HIGHLIGHTS: System manages content; owner can add images
─────────────────────────────────────────────────────────
System (automatic):
  Campaign engine generates slide → stored in platformSummary
  → contentVersion mirror updates → onSnapshot fires on ScreenDisplay.tsx → reload → fresh slides
  → Labels stay factual: Today / Popular / Featured / category / On menu

Owner (optional):
  Upload image → addPinnedSlide() → pinnedSlides[] + contentVersion bump + safe mirror update
  → onSnapshot fires → reload → image appears in rotation as artwork
  → Caption is a management label, not a forced overlay on the TV

  Remove image → removePinnedSlide() → array update + contentVersion bump + safe mirror update
  → onSnapshot fires → reload → image removed from rotation
```

Rejected acknowledgement codes use the existing bounded settings diagnostics:

- Desktop override: `desktop_digital_screen_override_update_rejected`
- Desktop caption/delete: `desktop_digital_screen_caption_update_rejected`, `desktop_digital_screen_slide_delete_rejected`
- Mobile override/caption/delete: `mobile_digital_screen_override_update_rejected`, `mobile_digital_screen_caption_update_rejected`, `mobile_digital_screen_slide_delete_rejected`
- Upload internal add-slide write: `digital_screen_slide_upload_update_rejected`
- Upload outer result: `digital_screen_slide_upload_rejected`

```
BOTH MODES: Same trigger mechanism
───────────────────────────────────
Any screen content change in platformSummary/campaigns_{sId}
  → contentVersion bump + platformSummary/screen_{sId} mirror update
  → ALL connected screens (both modes) receive onSnapshot
  → ALL screens reload with fresh data
  → Menu Board: re-renders full menu
  → Highlights: re-generates slide stack
```

---

## Database Schema

### `platformSummary/campaigns_{sId}.screen` (DigitalScreenState)

| Field                  | Type          | Purpose                                                     |
| ---------------------- | ------------- | ----------------------------------------------------------- |
| `enabled`              | boolean       | Screen feature on/off                                       |
| `screenToken`          | string        | 22-character high-entropy screen URL token; legacy 8-char tokens remain accepted |
| `lastRefreshed`        | Timestamp     | Debug info                                                  |
| `contentVersion`       | number        | Bumped on menu/availability change → triggers client reload |
| `lastContentChangeAt`  | Timestamp     | Debug info                                                  |
| `currentMinConfidence` | number        | Monotonicity tracking (highest shown today)                 |
| `ownerOverrideEnabled` | boolean       | "Only custom slides" toggle for Highlights                  |
| `pinnedSlides`         | ScreenSlide[] | Max 3, 14-day expiry each                                   |
| `screenLastSeenAt`     | Timestamp?    | Updated 1x/day by seen signal after enabled-screen and public store eligibility checks |
| `menuProjection`       | object?       | Generated default-menu read model; capped available-item payload, `baseProjectId`, `baseProjectSlug`, active special-menu marker, `contentVersion`, `updatedAt` |

`screen` does not store an owner-selected project assignment. Menu resolution remains store-level and automatic; `menuProjection.baseProjectId` and `baseProjectSlug` are generated only to prove the cached payload and QR/menu URL context match the current automatic source.

### `platformSummary/screen_{sId}` (public listener mirror)

| Field                 | Type      | Purpose                                      |
| --------------------- | --------- | -------------------------------------------- |
| `storeId`             | string    | Must match the document id suffix            |
| `enabled`             | boolean   | Lets a connected client reload when the canonical screen is disabled |
| `contentVersion`      | number    | Safe reload trigger for public clients       |
| `lastContentChangeAt` | Timestamp | Debug/freshness timestamp                    |
| `updatedAt`           | Timestamp | Mirror write timestamp                       |

The public mirror deliberately contains no bearer screen token. Firestore rules allow anonymous exact-document `get` only for this safe field set; unauthenticated collection listing remains denied. `platformSummary/campaigns_{sId}` remains owner/authenticated/admin-only.

### Token-Removal Rollout Order

1. Deploy the token-free Next.js owner/server writers.
2. Deploy the token-free Functions cache-revalidation writer.
3. Dry-run, then write `backfill:digital-screen-public-mirrors` for the exact Firebase project.
4. Verify every initialized `screen_{storeId}` mirror has the five-field token-free shape.
5. Deploy `firestore.rules` with get-only public access and the token-free allowlist.

Do not deploy step 5 before steps 1–4: legacy mirror documents containing `screenToken` intentionally fail the new `hasOnly` rule and connected listeners would lose access until migrated.

### Firestore Index

- `platformSummary` → `screen.screenToken` (single-field, ascending) — for token lookup

---

## Hardening Features (Implemented Jan 11, 2026)

| Feature                  | File:Line                   | Purpose                             |
| ------------------------ | --------------------------- | ----------------------------------- |
| Cached-first rendering   | `ScreenDisplay.tsx:59-87`   | localStorage → survives bad deploys |
| Firebase doc listener    | `ScreenDisplay.tsx:174-206` | GPT FIX 3: direct doc, not query    |
| Zero-blank guarantee     | `ScreenDisplay.tsx:239-303` | Emergency brand fallback            |
| Lazy QR loading          | `ScreenDisplay.tsx:118-125` | 2s delay for cold boot speed        |
| Daily seen signal        | `ScreenDisplay.tsx:130-147` | 1 write/day ops awareness; same-origin/no-store/manual-redirect client POST; API fails cheap before JSON parse and verifies enabled screen/store eligibility before writing |
| Build version context    | `ScreenDisplay.tsx`         | Bounded diagnostics only            |
| Offline fallback         | `ScreenDisplay.tsx:108-116` | localStorage on data change         |
| 30-min offline retry     | `ScreenDisplay.tsx:209-218` | Reload if listener error            |
| 6-hour proactive refresh | `ScreenDisplay.tsx:220-233` | Memory leaks, code deploys          |

Public display clients use `src/lib/screen/screenDiagnostics.ts` for bounded display failure diagnostics. Cache read/write failures, daily seen signal failures, non-OK daily seen signal responses, listener failures, fullscreen recovery request failures, and guarded reload storage failures record normalized `digital_screen_*` or `screen_guarded_reload_storage_failed` failure codes with bounded token/store/version/count/component metadata, response status when available, and source error name/code/status only. The daily seen POST is explicitly same-origin, uncached, and manual-redirect, and the local daily marker is cached only after an OK response. IP/token rate-limit denials return non-success `429` plus `Retry-After`, so they cannot create a browser marker for an unverified write; unexpected persistence failures remain non-success `503`. The API route accepts a valid direct target; its legacy no-store fallback queries at most two token matches and proceeds only when exactly one canonical `campaigns_{storeId}` candidate exists. The selected candidate then enters a transaction that re-reads the current summary, store, and tenant. The same transaction requires the exact token, enabled screen, exact store/tenant aliases, and current public lifecycle/block eligibility before it checks the UTC daily marker and updates `screenLastSeenAt`. A duplicate legacy token, disable, reassignment, deletion, or block therefore fails closed. Owner desktop/mobile screen-link blocked-open failures use the same helper and record only mode plus URL presence/length metadata. Normal cache hits, server-data fallback, QR readiness, content-version changes, listener setup/cleanup, offline retries, successful owner link opens, successful fullscreen recovery, reload suppression, successful seen-signal marker caching, and six-hour refreshes stay silent.

---

## Security

| Check                  | Implementation                                  | Evidence                 |
| ---------------------- | ----------------------------------------------- | ------------------------ |
| No storeId in URL      | Token-based: `/screen/[token]`                  | `page.tsx:31`            |
| License check          | `active === false` or `blocked === true` → null | `campaigns/index.ts:570` |
| No sensitive data      | Public SSR returns menu/display data only; live listener reads safe mirror only | `page.tsx`, `publicScreenState.ts`, `firestore.rules` |
| Bearer token isolation | Token remains only in canonical authenticated/Admin state; public mirror is token-free and get-only | `publicScreenState.ts`, `firestore.rules` |
| Protected settings     | DAL functions require `getActiveSession()`; settings/output surfaces gate before state reads, and Menu Manager omits screen links without `canManageDigitalScreens` | `campaigns/index.ts`, desktop/mobile settings, output, and Menu Manager surfaces |
| Kill switch            | Public page, seen endpoint, and owner entry points respect `DIGITAL_SCREENS_ENABLED` | `page.tsx`, `seen/route.ts`, desktop/mobile owner surfaces |
| Upload rate limit      | Max 3 slides enforced in DAL                    | `campaigns/index.ts:687` |
| Seen signal validation | 1 KB body cap, IP rate limit before JSON parse, token/store format validation, token throttling | `seen/route.ts`          |

---

## Known Limitations

| Limitation                              | Impact                                                                     | Details                                     |
| --------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------- |
| ~~Layer 3 (Evergreen) not generated~~   | ✅ **FIXED** — now fetches menu items via `getMenuItemsForScreenServer()` | `screen/[token]/page.tsx`, `slideGenerator.ts` |
| ~~`slideGenerator.ts` dead code~~       | ✅ **FIXED** — `page.tsx` now calls `generateScreenSlides()`               | `page.tsx:52-57`                            |
| ~~`screenRenderer.ts` dead code~~       | ✅ **FIXED** — `page.tsx` imports `SCREEN_CONFIG` from it                  | `page.tsx:15`                               |
| ~~No prices displayed~~                 | ✅ **FIXED v2.0** — `price` added to `ScreenSlide`, rendered in both modes | `campaigns.ts:401`, `ScreenDisplay.tsx:482` |
| ~~No Menu Board mode~~                  | ✅ **FIXED v2.0** — `MenuBoardDisplay.tsx` component + `page.tsx` routing  | `MenuBoardDisplay.tsx`, `page.tsx:36-48`    |
| ~~Seen endpoint uses in-memory rate limit~~ | ✅ **FIXED** — shared Upstash-backed IP limit plus hashed token/store limit run before Firestore lookup | `seen/route.ts`, `rateLimit/configs.ts` |

See `digital-screens_improvements.md` for detailed analysis and recommendations.

---

## v2.0 Implementation Plan (Menu Board Mode)

### Overview

Add Menu Board as the **default** rendering mode. Same data pipeline, new client component.

### Step 1: Add Price to ScreenSlide Type + Render (1 hour)

**Files to modify:**

1. `src/types/campaigns.ts` — Add `price?: number` to `ScreenSlide` interface
2. `src/lib/screen/evergreenSlides.ts` — Pass `price` from `MenuItemForSlide` to generated slides
3. `src/lib/screen/slideGenerator.ts` — Ensure price propagates through 4-layer stack
4. `src/app/screen/[token]/ScreenDisplay.tsx` — Render price in `SlideContent` component

**Data flow:**

```
MenuItemForSlide.price (already fetched)
  → ScreenSlide.price (NEW field)
  → SlideContent renders price (NEW display)
```

### Step 2: Add Feature Flag (15 min)

**File:** `src/config/features.ts`

```typescript
/**
 * Digital Screens Display Mode
 *
 * Controls the default rendering mode for /screen/[token]
 * Owner can override via URL: ?mode=highlights
 *
 * Per spec v2.0: Default = menu_board (addresses 70%+ market expectation)
 * URL ?mode=highlights = promotional slideshow (secondary screens)
 * Future: "auto" = system decides based on context
 */
DIGITAL_SCREENS_MODE: "menu_board" as "menu_board" | "highlights",
```

### Step 3: Create MenuBoardDisplay.tsx (~300 lines, 1-2 days)

**File:** `src/app/screen/[token]/MenuBoardDisplay.tsx`

**Component structure:**

```
MenuBoardDisplay (root)
  ├─ Header: Store logo + name
  ├─ MenuGrid: Categories with items
  │   ├─ CategorySection (per category)
  │   │   ├─ Category name (header)
  │   │   └─ ItemRow[] (name + price, bestseller badge)
  │   └─ ...
  ├─ Footer: QR code to digital menu
  └─ PageIndicator (if multi-page)
```

**Key behaviors:**

- **Auto-pagination:** If items don't fit one screen, split into pages, rotate every 15-20s
- **Availability-aware:** Hide unavailable items (no greyed-out items — just hide)
- **Best seller badge:** Subtle dot or star, no text explanation
- **Price formatting:** Currency symbol + amount, minimum 28-32px font
- **QR code:** Same lazy-load pattern as highlights mode
- **Offline cache:** Same localStorage pattern as ScreenDisplay.tsx
- **Firebase listener:** Same onSnapshot + contentVersion reload pattern
- **Seen signal:** Same daily same-origin/no-store/manual-redirect POST to /api/screen/seen; the daily local marker is cached only after OK.

**Data input (from page.tsx):**

```typescript
interface MenuBoardData {
  categories: {
    name: string;
    items: {
      id: string;
      name: string;
      price?: number;
      available: boolean;
      isBestSeller?: boolean;
      imageUrl?: string;
    }[];
  }[];
  storeInfo: StoreInfo;
  token: string;
  storeId: string;
}
```

**Design rules (Non-negotiable):**

- Clean, readable, dark background preferred for TV readability
- No owner customization of layout, colors, or fonts
- System-designed layout only
- No images in menu board (text + price only for density)
- Category headers are bold, items are regular weight
- Price aligned to right
- QR code in bottom corner (small, non-intrusive)

### Step 4: Modify page.tsx for Mode Routing (30 min)

**File:** `src/app/screen/[token]/page.tsx`

**Logic:**

```typescript
export default async function ScreenPage({ params, searchParams }) {
    const { token } = params;
    const mode = searchParams?.mode || 'menu_board'; // default = menu_board

    // Same DAL calls for both modes
    const screenData = await getScreenDataByTokenServer(token);
    if (!screenData) return notFound();

    const menuItems = await getMenuItemsForScreenServer(storeId, tenantId);

    if (mode === 'highlights') {
        const slides = generateScreenSlides(/* ... */);
        return <ScreenDisplay initialData={/* slides */} />;
    }

    // Default: Menu Board
    const categories = groupItemsByCategory(menuItems);
    return <MenuBoardDisplay initialData={/* categories */} />;
}
```

### Step 5: Update Settings UI (1 hour)

**File:** `src/components/.../DigitalScreenSettings/ScreenLink.tsx`

- Show TWO links: Menu Board (default) + Highlights (with `?mode=highlights`)
- Both have [Copy] and [Open preview] buttons
- Label: "Menu Board" and "Highlights" — no explanation of what they do

### Step 6: Auto-Pagination Logic (2-3 hours)

**Inside `MenuBoardDisplay.tsx`:**

```typescript
// Calculate how many items fit per page based on viewport height
const ITEMS_PER_PAGE = Math.floor(
  (viewportHeight - headerHeight - footerHeight) / itemRowHeight,
);

// Split categories into pages
const pages = paginateMenu(categories, ITEMS_PER_PAGE);

// Rotate pages every 15-20 seconds
const [currentPage, setCurrentPage] = useState(0);
useEffect(() => {
  if (pages.length <= 1) return;
  const timer = setInterval(() => {
    setCurrentPage((prev) => (prev + 1) % pages.length);
  }, 18000); // 18 seconds
  return () => clearInterval(timer);
}, [pages.length]);
```

### Firebase Cost Impact

**$0 additional cost.** Menu Board uses the SAME data already fetched:

- `getScreenDataByTokenServer()` — same base read shape, with valid projection context skipping the project summary read and shared eligibility caching
- `screen.menuProjection` — 0 reads when valid; `getMenuItemsForScreenServer()` fallback — usually 1 read after `baseProjectId`
- No new collections, no new indexes, no new writes

### Testing Checklist (v2.0 additions)

| #     | Test                | Steps                                   | Expected                                     |
| ----- | ------------------- | --------------------------------------- | -------------------------------------------- |
| MB.1  | Menu Board loads    | Open `/screen/[token]`                  | Full menu with categories and prices         |
| MB.2  | Highlights mode     | Open `/screen/[token]?mode=highlights`  | Rotating slides (existing behavior)          |
| MB.3  | Price state shown   | Check menu board items                  | Valid price shown; missing/unclear price shows `Ask` |
| MB.4  | Unavailable hidden  | Mark item sold out                      | Item disappears from menu board              |
| MB.5  | Auto-pagination     | Store with 50+ items                    | Pages rotate every ~18s                      |
| MB.6  | Best seller badge   | Check bestseller items                  | Subtle visual indicator                      |
| MB.7  | QR code             | Check bottom of menu board              | QR to digital menu present                   |
| MB.8  | Offline cache       | Disconnect network                      | Menu board continues displaying              |
| MB.9  | Real-time update    | Add new menu item                       | Menu board refreshes via contentVersion bump |
| MB.10 | Invalid mode param  | Open `/screen/[token]?mode=invalid`     | Falls back to menu board (default)           |
| MB.11 | Price in highlights | Open highlights mode, check item slides | Prices shown on item highlight slides        |

---

## Testing Checklist

### Screen Display

| #   | Test          | Steps                  | Expected                         |
| --- | ------------- | ---------------------- | -------------------------------- |
| 1.1 | Screen loads  | Open `/screen/[token]` | Slides display                   |
| 1.2 | Slides rotate | Wait 8+ seconds        | Next slide with fade transition  |
| 1.3 | Invalid token | Open `/screen/invalid` | 404 page (not blank)             |
| 1.4 | Offline mode  | Disconnect network     | Cached slides continue looping   |
| 1.5 | Cache-first   | Reload with cache      | Instant render from localStorage |
| 1.6 | Auto-refresh  | Wait 6 hours           | Page reloads automatically       |

### Owner Features

| #   | Test            | Steps                     | Expected                         |
| --- | --------------- | ------------------------- | -------------------------------- |
| 2.1 | Settings load   | Settings > Digital Screen | Screen link + slides shown       |
| 2.2 | Copy link       | Click Copy button         | URL in clipboard                 |
| 2.3 | Upload slide    | Upload image              | Success + "expires in 14 days"   |
| 2.4 | Max 3 uploads   | Try 4th upload            | Error: "Maximum 3 custom slides" |
| 2.5 | Delete slide    | Remove uploaded slide     | Removed from list                |
| 2.6 | Override toggle | Toggle "Use my designs"   | Tracked + message shown          |

### Edge Cases

| #   | Test            | Steps                          | Expected                            |
| --- | --------------- | ------------------------------ | ----------------------------------- |
| E.1 | No campaigns    | Store with no active campaigns | Brand fallback × 3 (minimum)        |
| E.2 | TV reboots      | Close/reopen browser           | Cached slides restore instantly     |
| E.3 | Bad deploy      | Deploy breaking change         | Cached slides show while recovering |
| E.4 | License expired | Deactivate store               | Screen returns 404                  |

### Diagnostic Verification

- Runtime helpers must not direct-console raw screen tokens, project IDs, slide IDs, settings payloads, or provider/error objects.
- Normal public misses, inactive screens, inactive stores, owner setup success, slide mutations, and guarded reload suppression stay quiet.
- Unexpected token resolver, menu fallback, and invalidation failures use `secureError()` with normalized failure codes and bounded metadata only.
- `npm run verify:customer-app-pwa` guards the helper files against direct `console.error`, `console.warn`, or `console.log` regressions.

### Database Verification

1. `platformSummary/campaigns_{sId}` has `screen` field
2. `screen.screenToken` is 22 characters (legacy stores may have 8-char tokens — both valid)
3. `screen.pinnedSlides` array exists (may be empty)
4. `screen.menuProjection` is optional; when present, `baseProjectId`, `activeSpecialMenuId`, and `contentVersion` must match the current screen data before public render uses it
5. `screen.screenLastSeenAt` updates daily only when one transaction confirms the current token-bound screen is enabled and the exact backing store and tenant remain publicly eligible
6. `platformSummary/screen_{sId}` exists after screen initialization or content mutation and contains only the public-safe listener fields

---

## Archived Docs

The following historical docs are in `_archive/` — their content has been absorbed into this file:

- `digital-screens_hardening-spec.md` — hardening requirements and gap analysis
- `digital-screens_testing-guide.md` — detailed testing guide (29 test cases)
- `digital-screens_validation.md` — production validation report (all pass)
- `digital-screens_code-review.md` — code review findings (2 bugs fixed)
- `digital-screens_logic-verification.md` — 6-flow logic verification (all pass)
- `digital-screens_chatgpt-review-v3.md` — ChatGPT strategic review v3 (47 items evaluated, Mar 2026)

---

## Document History

| Version | Date       | Author  | Changes                                                                                                                                                                                                                                                                                                                                                   |
| ------- | ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-01-04 | Cascade | Initial implementation plan                                                                                                                                                                                                                                                                                                                               |
| 2.0     | 2026-02-08 | Cascade | **Full rewrite from codebase trace** — consolidated 6 docs into 1, added data flows, hardening table, known limitations                                                                                                                                                                                                                                   |
| 2.1     | 2026-02-08 | Cascade | Activated Layer 3 evergreen slides, seen endpoint optimization, SCREEN_CONFIG consolidation                                                                                                                                                                                                                                                               |
| 3.0     | 2026-02-08 | Cascade | **v2.0 plan:** Menu Board mode (default), price display, mode routing, auto-pagination, full implementation blueprint                                                                                                                                                                                                                                     |
| 4.0     | 2026-02-08 | Cascade | **v2.0 IMPLEMENTED:** MenuBoardDisplay.tsx, price in ScreenSlide, mode routing in page.tsx, ScreenLink two URLs, DIGITAL_SCREENS_MODE flag                                                                                                                                                                                                                |
| 5.0     | 2026-02-08 | Cascade | **v2.1 UI/UX PREMIUM:** Glassmorphism, Ken Burns, ambient orbs, food thumbnails, staggered animations, capsule progress, brand fallback redesign                                                                                                                                                                                                          |
| 6.0     | 2026-02-08 | Cascade | **v2.2 METADATA+CSS:** description/tags flow through pipeline, dietary badges, poster-style slides, accent strip. AI image gen evaluated & rejected                                                                                                                                                                                                       |
| 7.0     | 2026-02-08 | Cascade | **v2.2.1 HARDENING:** 7 fixes — dietary dot logic consistency, cache-first MenuBoard init, category header 22px, description opacity 0.45, pagination 10 items/page, broken image fallback, reload guard (30s throttle)                                                                                                                                   |
| 8.0     | 2026-02-08 | Cascade | **v2.2.2 REFACTOR:** Extracted `guardedReload` to shared `utils.ts`, moved `MenuItemForSlide` + `ScreenStoreInfo` to `@type/campaigns.ts` (single source of truth), broke circular dep between slideGenerator↔evergreenSlides                                                                                                                             |
| 9.0     | 2026-03-15 | Cascade | **v2.3 HARDENING:** Token entropy (8→22 chars, ~130-bit). Reload jitter (`guardedReloadWithJitter`). MenuBoard: broken image fallback, listener offline+retry, sold-out messaging, MAX_TOTAL_ITEMS=200. Auto-fullscreen recovery (both modes). Settings: activity status indicator, Main TV/Second TV labels. All reliability/scale fixes per LOCKED rule |
| 10.0    | 2026-06-02 | Codex   | **Owner trust + TV readability hardening:** Setup cards/status, mobile parity, owner-only mode enforcement, ordered Menu Board, screen-grade typography, and public-cache-linked screen version touch.                                                                                                                                              |
| 11.0    | 2026-06-02 | Codex   | **Content trust hardening:** Shared content normalization, safer price/category/tag parsing, factual highlight labels, evergreen category variety, custom-slide artwork rendering, and sanitized owner captions.                                                                                                                              |
| 12.0    | 2026-06-06 | Codex   | **Public read hardening:** Added generated `screen.menuProjection` inside existing screen summary state, shared extraction helper, validity guard, and project-read fallback for stale/missing projection data.                                                                                                                            |
| 13.0    | 2026-06-11 | Codex   | **Public listener isolation:** Added safe `platformSummary/screen_{sId}` mirror, moved display listeners off internal campaign summary docs, hardened `/api/screen/seen` validation/logging, and deployed Firestore rules. |
| 14.0    | 2026-06-27 | Codex   | **Bounded diagnostics:** Removed direct console diagnostics from public token/menu fallback, owner mutation success, invalidation, and reload helper paths; verifier now requires normalized secure failure logging. |
| 14.1    | 2026-06-27 | Codex   | **Settings diagnostics follow-up:** Desktop settings load/override failures and owner-control tracking failures now use bounded secure diagnostics; normal owner-control success stays quiet. |
| 14.2    | 2026-06-28 | Codex   | **Store-output refresh:** Store profile saves now sync summary before public cache revalidation, then wake initialized screens for rendered store fields; master-to-outlet logo/currency propagation does the same for outlet screens. |
| 14.3    | 2026-06-28 | Codex   | **Functions public-output refresh:** Server-side cache revalidation can now bump initialized screen versions for first extraction, scheduled special-menu switching, and entitlement attribution changes. |
| 14.4    | 2026-07-01 | Codex   | **Seen-signal store eligibility:** `/api/screen/seen` now verifies enabled screen state, legacy `campaigns_{storeId}` document shape, and shared public store-id eligibility before updating `screenLastSeenAt`. |
| 14.5    | 2026-07-25 | Codex   | **Seen-signal transaction authority:** direct and legacy daily liveness paths now re-read current screen, store, and tenant truth in one transaction and reject concurrent disable, reassignment, deletion, lifecycle block, or identity-alias drift before updating `screenLastSeenAt`. |
| 14.6    | 2026-07-25 | Codex   | **Legacy token uniqueness:** the no-store daily liveness fallback now queries up to two candidates and fails closed unless exactly one canonical `campaigns_{storeId}` document owns the token, matching public screen-render admission. |
| 14.7    | 2026-07-25 | Codex   | **Seen-signal acknowledgement integrity:** IP/token limiter denials return non-success `429` with `Retry-After` rather than cached success, preventing the display from persisting its local daily marker when no transaction ran. |
| 14.5    | 2026-07-16 | Codex   | **Projection transaction consistency:** Browser invalidation rebuilds `screen.menuProjection` with transaction-bound summary/project reads, preserving the existing operation count while making concurrent menu writes retry safely. |
