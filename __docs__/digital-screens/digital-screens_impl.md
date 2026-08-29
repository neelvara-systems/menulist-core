# Digital Screens — Technical Implementation

August 1, 2026 current contract: bearer tokens live in server-only `screenControl_{storeId}` private control documents. Owner reads/mutations use the permission-checked `/api/digital-screens` boundary and atomically update canonical state, private control, and the token-free listener mirror. Public screen resolution and the open-acknowledgement transaction reconcile private control, store/tenant identity, display mode, and canonical content version before a receipt write.

**Created:** January 4, 2026
**Status:** 🔒 **v2.3 LOCKED — Controlled owner testing ready; full production certification pending the overall MenuList audit.**
**Last Audit:** August 1, 2026 (private control migration, server-authoritative mutations, scoped caches, offline-cache truth guard, output layout/artwork/expiry hardening, per-mode exact-version owner health, and zero-blank media fallback)
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

- **Three bounded documents in one existing collection** — canonical non-secret screen state stays in `campaigns_{sId}.screen`; the bearer token is in server-only `screenControl_{sId}`; public clients receive only `screen_{sId}`.
- **No API routes for screen display** — server component + DAL pattern
- **No polling** — Firebase `onSnapshot` doc listener drives content-version reloads after acknowledged public-output changes
- **No Service Worker** — removed; localStorage cache sufficient
- **Public store check** — `getScreenDataByTokenServer()` uses the shared public store/tenant block gate and rejects missing, inactive, deleted, store-blocked, or tenant-blocked records
- **Default = Menu Board** — `/screen/token` renders full menu; `?mode=highlights` for slideshow
- **Mode via URL only** — no settings UI for mode selection; zero cognitive load
- **Menu source is automatic** — screens follow the store's active menu truth; no project picker
- **Generated menu projection stays inside screen state** — no separate screen-menu document; cold public renders use `screen.menuProjection` only when it matches `baseProjectId`, base menu slug context, active special-menu state, and `contentVersion`; the stored projection contains display-eligible available items only.
- **Public listeners are isolated** — `ScreenDisplay` and `MenuBoardDisplay` listen to `platformSummary/screen_{sId}`, not the internal `campaigns_{sId}` summary that contains Today, staff-prompt, physical-surface, and campaign data.
- **Bearer tokens stay private** — `screenToken` is excluded from canonical state after migration, private controls are denied to all client reads/writes, the public listener mirror contains no token, and owner access requires `MANAGE_DIGITAL_SCREENS`.
- **Owner-only override is real** — Highlights uses valid custom slides only when `ownerOverrideEnabled` is on, with brand fallback if all custom slides expire.
- **Content is normalized before display** — screen extraction normalizes localized text, strips HTML-like/control text, parses currency-bearing prices, blocks technical category IDs, dedupes items, normalizes tags, and caps custom slide captions.
- **Currency symbol follows store settings** — `ScreenStoreInfo.currencySymbol` is hydrated from the store document and passed to Menu Board / Highlights price renderers.
- **Owner uploads are artwork** — `owner_upload` slides render the uploaded image as the content and do not overlay the management caption as TV copy.
- **Public cache invalidation touches screens on the server** — browser DAL paths call `/api/revalidate/menu`; server and Functions paths use the Admin transaction. Direct client writes to canonical screen state or the listener mirror are denied.
- **Screen caches are scoped** — screen state uses a hashed token tag and menu reconstruction uses `menu-store-{storeId}`. Version touches invalidate the exact token tag instead of a global screen fan-out.
- **Server-side live screen wakeup** — Next.js server actions/routes that mutate public truth use `touchDigitalScreenContentVersionForStoreServer()` to bump initialized screen content versions and the `screen_{storeId}` listener mirror without creating partial screen state when a screen token is absent.
- **Shared public attribution** — both screen modes render the same quiet `Powered by MenuList. All rights reserved` attribution used by public OBP/menu surfaces.
- **Seen-signal request boundary** — Highlights and Menu Board post `/api/screen/seen` with same-origin credentials, no-store cache policy, and manual redirect handling before caching the daily local marker only after an OK response. The route writes only after cheap-fail validation, token binding, enabled-screen validation, a `campaigns_{storeId}` summary id guard for legacy lookup, and shared public-safe store eligibility.
- **Seen failures remain retryable** — unexpected route failures return `503`; the display continues rendering and does not cache the daily marker, allowing a later page load to retry.
- **Owner read failures remain failures** — `getScreenState()` propagates protected owner API failures and returns `null` only after a successful absence response. Desktop and mobile initialize only from that authoritative absence, render a retry action on failure, and mobile withholds links and mutation controls until state exists. GET and POST use separate hashed `DATA_READ` / `DATA_WRITE` rate-limit buckets.
- **Feature and permission gates align** — disabling `DIGITAL_SCREENS_ENABLED` closes the public page, seen endpoint, and owner entry points. Desktop/mobile screen links and settings require `canManageDigitalScreens` before their state read, ignore an in-flight load after access is removed, and both Menu Manager clients omit the bearer link without that permission.
- **Expired uploads recover capacity** — owner reads hide expired custom slides and the next owner/content-version mutation prunes their Firestore references before enforcing the shared upload cap. Display expiry does not directly delete immutable media objects.
- **Highlights cache stays last-known-good** — a fresh empty render no longer overwrites valid cached slides, and a shorter refreshed rotation clamps the current index before render.
- **Diagnostics are bounded** — public token misses and normal owner mutations stay quiet; unexpected resolver, fallback, settings, owner-control tracking, owner screen-link open, and invalidation failures use normalized secure diagnostics with bounded token/project/store/settings/link metadata instead of raw identifiers or error objects.
- **Dedicated source gate** — `npm run verify:digital-screens-boundary` locks the route, rules, listener mirror, seen-signal route, invalidation, owner desktop/mobile acknowledgement, and docs contracts for this feature.

---

## Complete File Map

### Types & Config

- `src/types/campaigns.ts` — `MenuItemForSlide`, `ScreenStoreInfo`, `ScreenSlide`, `DigitalScreenState`, and `ScreenAPIResponse`
- `src/config/features.ts` — authoritative `DIGITAL_SCREENS_CONFIDENCE_THRESHOLD` (0.7), consumed by the slide generator
- `src/config/features.ts` — `DIGITAL_SCREENS_ENABLED` (true), `_CONFIDENCE_THRESHOLD` (0.7), `_UPLOAD_EXPIRY_DAYS` (14), `_MAX_UPLOADS` (3), **`DIGITAL_SCREENS_MODE`** (v2.0)

### Library (`src/lib/screen/` — 7 files)

- `utils.ts` (~100 lines) — High-entropy screen token generation, URL builder, expiry helpers, `guardedReload(componentName)` shared reload throttle
- `screenContent.ts` — Shared content normalization and extraction: text, truncation, price parsing, category fallback, image URL validation, tag normalization, diet tag detection, owner caption safety, item dedupe, and capped screen menu projection payload.
- `evergreenSlides.ts` (~95 lines) — `generateEvergreenSlides()`, `generateBrandFallback()` (imports `MenuItemForSlide` from `@type/campaigns`)
- `slideGenerator.ts` — 4-layer stack generator; respects owner-only custom slide mode; normalizes min/max slide counts with unique repeat IDs
- `screenRenderer.ts` (~140 lines) — `SCREEN_CONFIG` constants, `ScreenRendererState` (uses `ScreenStoreInfo`), `getSlideLabel()`
- `publicScreenState.ts` — Pure token-free public listener document-ID helper. Browser mirror writes are intentionally absent; owner/server transactions construct and write the mirror.
- `screenSeenAcknowledgement.ts` — Pure display-mode validation, UTC-day normalization, and exact-version/idempotency decision.
- `screenSeenServer.ts` — Transaction-current private token, store/tenant lifecycle, canonical version, and per-mode receipt authority.
- `screenManagementServer.ts` — Authorized owner state transaction for explicit initialization, settings, custom slides, legacy token migration, and expired-reference pruning.
- `serverScreenInvalidation.ts` — Admin-only content-version and public mirror transaction plus exact token-cache invalidation.
- `screenRuntime.ts` — Offline cache admission, TV viewport layout rules, and the stable fallback accent used when no valid OBP accent exists.
- `serverScreenInvalidation.ts` — Next.js server-side screen content-version touch used by direct public-truth routes and `revalidateMenuCache()`. It reads the existing screen state, returns when no screen token exists, increments `screen.contentVersion`, and mirrors `screen_{storeId}` for live display listeners.

### Screen Page (`src/app/screen/[token]/` — 3 files)

- `page.tsx` — Server component: bearer-route noindex/no-referrer metadata, DAL fetch, generated projection/fallback menu resolution, and mode routing via `?mode=` query param
- `ScreenDisplay.tsx` — **Highlights mode** client: zero-safe bounded rotation, runtime-projected/version-matched/expiry-aware offline fallback, first-mount versus later-server-truth reconciliation, fail-closed public mirror listener with cleanup-owned guarded reload retry, shared exact-version open acknowledgement, expiry refresh, cleanup-owned fullscreen hint, hero image slides, QR, capsule progress, and brand fallback when data or owner poster media fails
- **`MenuBoardDisplay.tsx`** — **Menu Board mode** client: screen-grade full menu layout, runtime-projected offline fallback, later-server-truth reconciliation, current-bound ordered category/item pagination, fail-closed public mirror listener with cleanup-owned guarded reload retry, price alignment, QR, progress bar, and storage/fullscreen containment
- `ScreenAttribution.tsx` — Shared quiet MenuList attribution used by both screen modes.

### API Route (1 file)

- `src/app/api/screen/seen/route.ts` — Bounded open acknowledgement with strict current/legacy request schemas, IP/token limits, direct/legacy token resolution, stale-version `409`, and generic public errors
- `src/hooks/useDigitalScreenSeenSignal.ts` — Shared client effect; posts token/store/mode/version once per UTC day marker and caches success only after an OK response

### Functions Support

- `functions/src/logic/publicCacheRevalidation.ts` — Server-side cache revalidation helper. For first-extraction project saves, scheduled special-menu switching/repair, entitlement attribution changes, and incident recovery, it can also bump the existing screen content version and safe listener mirror. The requested screen touch is independent of Next.js cache configuration, so missing cache env does not silently suppress the screen listener update; the returned status reports cache and screen acknowledgements separately.

### DAL (`src/database/campaigns/`)

- `serverScreen.ts` — Public server-side screen resolver for `/screen/[token]`, including token lookup, store lookup, normalized `publicPresence.accentColor`, automatic base menu context, projection context validation, and project-read fallback.
- `getScreenDataByTokenServer(token)` — Server-only public resolver; validates token shape/uniqueness, campaign summary ID, and shared public store eligibility before automatic base-menu context
- `getMenuItemsForScreenServer(storeId, tenantId)` — Server-only fallback; re-verifies tenant/store ownership and document IDs before project reads
- `index.ts` — Owner/session DAL for screen setup, settings, uploads, pinned slide management, and content-version bumps.
- `getScreenState()` — Session required, returns DigitalScreenState
- `initializeScreenState()` — First-time setup, generates 22-character high-entropy token
- `updateScreenSettings()` — Toggle owner override
- `addPinnedSlide()` / `removePinnedSlide()` — Owner upload management (max 3)
- `bumpScreenContentVersion()` — Invalidation trigger
- `uploadScreenSlide()` — immutable Firebase Storage variant-ledger upload + transactional `addPinnedSlide`; the strict API transport removes the client `Timestamp` and sends `validUntilMs`. A failed add is reconciled through one authoritative owner-state read: an already-committed slide returns success, confirmed absence permits cleanup, and an ambiguous read retains media. Successful slide removal commits state first and then cleans the referenced object.
- Settings, caption update, and slide delete mutations return a typed digital-screen acknowledgement. Desktop and mobile callers must require `assertDigitalScreenMutationSucceeded()` before local screen state, pinned-slide state, or success copy changes. Slide uploads also require `assertDigitalScreenSlideUploadSucceeded()` after the outer `apiCallComposer()` result so storage/add-slide failures cannot resolve to success through fallback values.
- Initialization, settings, add/remove/caption, and owner content-version mutations use Firestore transactions. Canonical screen state and the public-safe listener mirror commit together, concurrent updates retry from current state, exact no-op retries avoid version bumps, and a missing caption target is rejected.
- Every owner read/mutation carries the active store ID. `/api/digital-screens` accepts only an exact positive store identifier, proves it is the login store or an authenticated mapped location, re-checks the target store's tenant and current Digital Screens permission, and keys rate limiting to that selected store. The server never accepts a client tenant identifier.
- Highlights converts every optional slide expiry to bounded millisecond values before passing `initialData` from the Server Component to the client. Firestore `Timestamp` instances never cross the React Server Component boundary; the offline cache uses the same serializable value and still rejects expired or out-of-range entries.

### Settings UI (`src/components/.../DigitalScreenSettings/` — 4 files)

- `index.tsx` — Main card: fetch state, owner-only toggle, settings composition
- `OwnerUploads.tsx` — Single custom-slide list, add/edit/delete controls, and owner-only mode support
- `OwnerUploads.tsx` — Upload manager: max 3, 14-day expiry, delete, caption edit
- `ScreenLink.tsx` — TV setup cards for Menu Board + Highlights, compact URLs, QR blocks, separate exact-version status, manual status refresh, and bounded copy/open diagnostics. Copied feedback waits for Clipboard API success or acknowledged textarea fallback success.
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
      → Query private platformSummary.screenToken; legacy screen.screenToken fallback during migration
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
1. Server-first online; use localStorage only on an offline boot when `contentVersion` exactly matches the server-rendered version
2. Apply subsequent server props as authoritative, including an intentional empty state
3. Cache data to localStorage [line 109-116]
4. Lazy QR: Delay rendering by 2s [line 119-125]
5. Start slide rotation timer (8s interval) [line 158-168]
6. Set up Firebase onSnapshot listener on `platformSummary/screen_{storeId}` [line 174-206]
7. Send a bounded `highlights` open acknowledgement for the exact SSR `contentVersion`; local marker is keyed by token/mode/version/UTC day and stored only after OK
8. Start 30-min offline fallback timer [line 209-218]
9. Start 6-hour proactive refresh timer [line 220-233]
```

### 3. Real-time Update Flow

```
Owner saves menu → bumpScreenContentVersion() [DAL]
  → OR browser public cache invalidation requests /api/revalidate/menu with touchScreen=true
  → OR store-profile/public-output save → protected public cache revalidation
  → OR Functions public-output save → server cache revalidation → Functions screen version touch
  → contentVersion++ in platformSummary/campaigns_{sId}
  → platformSummary/screen_{sId} mirror updated with safe contentVersion state
  → exact hashed-token screen-state cache and menu-store-{sId} menu cache invalidated
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
      Separate Menu Board / Highlights latest-version status + owner-triggered refresh
      OwnerUploads (single custom-slide list; max 3; highlights mode only)
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
  → protected cache route calls the Admin screen touch when screen state exists
  → contentVersion++ in platformSummary/campaigns_{sId}
  → platformSummary/screen_{sId} mirror updates
  → onSnapshot fires on MenuBoardDisplay.tsx
  → newVersion > currentVersion → window.location.reload()
  → page.tsx may use a matching legacy menuProjection, otherwise reads current project truth
  → MenuBoardDisplay re-renders with updated categories/items/prices in menu order

STORE OUTPUT: Owner edits rendered store profile fields
─────────────────────────────────────────────────────────────
Owner saves store name/logo/currency/route/status/special-menu/plan fields
  → updateStore() writes the store document
  → summary-relevant fields sync into storesSummary
  → public cache revalidation clears menu, store, and client-store tags
  → server touch increments existing screen state and clears the exact token cache tag
  → platformSummary/screen_{sId} mirror updates
  → connected screens reload and hydrate fresh storeInfo from SSR

SERVER OUTPUT: Scheduler/extraction/entitlement changes public output
─────────────────────────────────────────────────────────────
Cloud Function writes project/store public truth
  → revalidatePublicClientCacheForStore(..., { touchDigitalScreen: true })
  → /api/revalidate/menu clears menu/store tags and touches the initialized screen
  → Functions falls back to its Admin touch only if the Next.js request cannot do so
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
| `lastRefreshed`        | Timestamp     | Debug info                                                  |
| `contentVersion`       | number        | Bumped on menu/availability change → triggers client reload |
| `lastContentChangeAt`  | Timestamp     | Debug info                                                  |
| `currentMinConfidence` | number        | Monotonicity tracking (highest shown today)                 |
| `ownerOverrideEnabled` | boolean       | "Only custom slides" toggle for Highlights                  |
| `pinnedSlides`         | ScreenSlide[] | Max 3, 14-day expiry each                                   |
| `screenLastSeenAt`     | Timestamp?    | Updated 1x/day by seen signal after enabled-screen and public store eligibility checks |
| `screenSeenByMode`     | object?       | Bounded `menu_board` / `highlights` receipts containing only canonical `contentVersion` and server `seenAt` |
| `menuProjection`       | object?       | Legacy optional read-through projection; used only when exact source/version context still matches |

`screen` does not store an owner-selected project assignment. Menu resolution remains store-level and automatic; `menuProjection.baseProjectId` and `baseProjectSlug` are generated only to prove the cached payload and QR/menu URL context match the current automatic source.

### `platformSummary/screenControl_{sId}` (private control)

| Field         | Type      | Purpose |
| ------------- | --------- | ------- |
| `screenToken` | string    | High-entropy bearer URL token; legacy 6-24 character tokens remain accepted during migration |
| `storeId`     | string    | Exact canonical store binding |
| `tenantId`    | string    | Exact canonical tenant binding |
| `createdAt`   | Timestamp | Initial setup/migration time |
| `updatedAt`   | Timestamp | Last control transaction |

Firestore client rules deny all reads and writes to private controls. Only Admin/server code can access them.

### `platformSummary/screen_{sId}` (public listener mirror)

| Field                 | Type      | Purpose                                      |
| --------------------- | --------- | -------------------------------------------- |
| `storeId`             | string    | Must match the document id suffix            |
| `enabled`             | boolean   | Lets a connected client reload when the canonical screen is disabled |
| `contentVersion`      | number    | Safe reload trigger for public clients       |
| `lastContentChangeAt` | Timestamp | Debug/freshness timestamp                    |
| `updatedAt`           | Timestamp | Mirror write timestamp                       |

The public mirror deliberately contains no bearer screen token. Firestore rules allow anonymous exact-document `get` only for this safe field set; unauthenticated collection listing remains denied. `platformSummary/campaigns_{sId}` remains owner/authenticated/admin-only.

### Private-Control Rollout Order

1. Deploy the dual-read Next.js resolver, owner API, seen route, and server invalidation.
2. Deploy the Functions writer that requests the protected Next.js screen touch.
3. Dry-run, then write `backfill:digital-screen-public-mirrors` for the exact Firebase project.
4. Dry-run, then write `backfill:digital-screen-private-controls` for the same project.
5. Verify one scope-matched private control, no canonical `screen.screenToken`, and a five-field public mirror for every initialized screen.
6. Deploy `firestore.rules` with private-control denial, server-managed canonical state, and Admin-only mirror writes.
7. Remove the temporary legacy nested-token lookup only after production verification.

Do not deploy step 6 before steps 1–5.

### Firestore Index

- `platformSummary` → `screenToken` (single-field, ascending) — private control token lookup
- `platformSummary` → `screen.screenToken` (single-field, ascending) — temporary legacy compatibility lookup

---

## Hardening Features (Implemented Jan 11, 2026)

| Feature                  | File:Line                   | Purpose                             |
| ------------------------ | --------------------------- | ----------------------------------- |
| Version-matched offline rendering | `screenRuntime.ts`, `screenContent.ts`, display clients | localStorage is admitted only offline for the same content version after real-array, bounded-field and expiry projection |
| Firebase doc listener    | `ScreenDisplay.tsx:174-206` | GPT FIX 3: direct doc, not query    |
| Zero-blank guarantee     | `ScreenDisplay.tsx:239-303` | Emergency brand fallback            |
| Lazy QR loading          | `ScreenDisplay.tsx:118-125` | 2s delay for cold boot speed        |
| Mode/version open acknowledgement | `useDigitalScreenSeenSignal.ts`, `screenSeenServer.ts` | One idempotent canonical write per mode/version/UTC day after strict request, token, store/tenant lifecycle, and transaction-current version checks |
| Build version context    | `ScreenDisplay.tsx`         | Bounded diagnostics only            |
| Offline fallback         | `ScreenDisplay.tsx:108-116` | localStorage on data change         |
| 30-min offline retry     | `ScreenDisplay.tsx:209-218` | Reload if listener error            |
| 6-hour proactive refresh | `ScreenDisplay.tsx:220-233` | Memory leaks, code deploys          |

Public display clients use `src/lib/screen/screenDiagnostics.ts` for bounded display failure diagnostics. Cache failures, blocked acknowledgement-marker storage, open acknowledgement failures/non-OK responses, listener failures, fullscreen recovery failures, and guarded reload storage failures record normalized codes with bounded token/store/version/mode/count/component metadata and response status where available. The acknowledgement POST is same-origin, uncached, manual-redirect, and strict-shaped. Current clients send `mode` plus `contentVersion`; legacy clients without both fields retain the aggregate daily path. The transaction re-reads private control, canonical screen, store, and tenant, then rejects token/scope/lifecycle drift and returns `409` when the requested version is no longer canonical. A successful current request updates `screenLastSeenAt` plus only that mode's `{contentVersion, seenAt}` receipt; duplicate mode/version/day requests are no-ops. The browser marker is cached only after OK. Rate limits return `429`; unexpected persistence failures return `503`. Owner desktop/mobile blocked-open failures remain bounded. Normal cache hits, successful acknowledgements, content-version reloads, and six-hour refreshes stay silent.

Owner desktop settings, mobile settings, and desktop Output Center read canonical `contentVersion` plus `DigitalScreenState["screenSeenByMode"]`. `screenHealth.ts` reports `Latest update seen` only for a recent exact-version receipt from that mode, `Update not seen` for an older receipt, and waiting/check states for absent or stale receipts. None of these owner surfaces silently reuses one mode's receipt for the other. Output Center refreshes status only after an explicit owner action and reuses the existing authorized `getScreenState()` read. `screenTimestamp.ts` remains the defensive timestamp conversion boundary; the aggregate `screenLastSeenAt` remains storage compatibility only.

The same normalizer owns `ScreenSlide.validUntil` presentation and expiry policy. A present but malformed expiry fails closed as expired in `filterExpiredSlides`; desktop/mobile countdowns render zero days rather than throwing, and mobile ordering uses only validated milliseconds. Missing expiry remains the deliberate non-expiring contract for generated evergreen slides.

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
- No Digital Screen-specific customization of layout, colors, or fonts
- Reuse the normalized `store.publicPresence.accentColor` as restrained decorative chrome; never apply arbitrary owner color to prices, dietary markers, category/body text, or the dark TV canvas
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
| 1.5 | Offline cache | Reload offline with matching version | Cached content renders; stale/mismatched content is rejected |
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
2. `platformSummary/screenControl_{sId}` contains a valid token plus exact `storeId` and `tenantId`
3. canonical `screen` contains no `screenToken` after migration and `screen.pinnedSlides` exists
4. `screen.menuProjection` is optional; when present, exact source/version context must match before public render uses it
5. `screen.screenLastSeenAt` and bounded `screen.screenSeenByMode` receipts update only after private/legacy token, enabled screen, store, tenant, and transaction-current content-version checks
6. `platformSummary/screen_{sId}` contains only the public-safe listener fields

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
| 17.0    | 2026-08-01 | Codex   | **Exact-version render confidence:** Menu Board and Highlights now write separate bounded version receipts, stale versions fail closed, owner desktop/mobile show per-mode status with manual refresh, the denied browser mirror writer was removed, and broken owner poster media falls back to store identity plus menu QR. |
| 16.1    | 2026-07-29 | Codex   | **OBP brand continuity:** `ScreenStoreInfo` now carries the normalized canonical OBP accent; screen roots expose one CSS variable for restrained chrome, and nested accent saves wake initialized screens through the existing refresh transaction. |
| 14.6    | 2026-07-25 | Codex   | **Legacy token uniqueness:** the no-store daily liveness fallback now queries up to two candidates and fails closed unless exactly one canonical `campaigns_{storeId}` document owns the token, matching public screen-render admission. |
| 14.7    | 2026-07-25 | Codex   | **Seen-signal acknowledgement integrity:** IP/token limiter denials return non-success `429` with `Retry-After` rather than cached success, preventing the display from persisting its local daily marker when no transaction ran. |
| 14.8    | 2026-07-25 | Codex   | **Owner timestamp contract:** desktop, mobile, and Output Center use the canonical screen-seen timestamp type plus one defensive conversion helper; malformed legacy or serialized timestamp values fail to the waiting label instead of throwing. |
| 14.9    | 2026-07-25 | Codex   | **Slide expiry normalization:** filtering, desktop/mobile countdowns, and mobile ordering share validated expiry conversion; a present malformed expiry is excluded rather than remaining publicly active or crashing owner rendering. |
| 14.5    | 2026-07-16 | Codex   | **Projection transaction consistency:** Browser invalidation rebuilds `screen.menuProjection` with transaction-bound summary/project reads, preserving the existing operation count while making concurrent menu writes retry safely. |
