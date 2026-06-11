# Digital Screens — Technical Implementation

**Created:** January 4, 2026  
**Status:** 🔒 **v2.3 LOCKED — Controlled owner testing ready; full production certification pending the overall MenuList audit.**
**Last Audit:** June 11, 2026 (public listener isolation and Firestore rule hardening)
**Applies:** 3-Year Architecture Freeze Rule

---

## Architecture Overview

```
Server Component (page.tsx)
    ↓ fetches via DAL
getScreenDataByToken(token) → platformSummary + stores (2 reads)
project summary lookup       → automatic base menu + QR slug when projection context is missing (0-1 read)
screen.menuProjection      → generated available menu items when version/project/slug context match (0 extra reads)
getMenuItemsForScreen()    → project items fallback (usually 1 read after baseProjectId)
    ↓ generates slides (for highlights mode)
generateScreenSlides()     → Owner Pinned + Campaign + Evergreen + Brand Fallback
    ↓ reads ?mode= query parameter
    ↓ passes to appropriate client component:

  mode=default → MenuBoardDisplay.tsx  (full menu, categories, prices, auto-paginate)
  mode=highlights → ScreenDisplay.tsx  (rotating slides, 8s interval, hero images)

Both share: Cache (localStorage) · Firebase listener on public-safe `screen_{storeId}` mirror (onSnapshot) · Seen signal (1/day)
```

**Key decisions:**

- **No separate screen collection** — canonical screen state stays in `platformSummary/campaigns_{sId}.screen`; public clients receive only a safe `platformSummary/screen_{sId}` listener mirror.
- **No API routes for screen display** — server component + DAL pattern
- **No polling** — Firebase `onSnapshot` doc listener for real-time updates
- **No Service Worker** — removed; localStorage cache sufficient
- **License check** — `getScreenDataByToken()` blocks inactive/blocked stores
- **Default = Menu Board** — `/screen/token` renders full menu; `?mode=highlights` for slideshow
- **Mode via URL only** — no settings UI for mode selection; zero cognitive load
- **Menu source is automatic** — screens follow the store's active menu truth; no project picker
- **Generated menu projection stays inside screen state** — no separate screen-menu document; cold public renders use `screen.menuProjection` only when it matches `baseProjectId`, base menu slug context, active special-menu state, and `contentVersion`; the stored projection contains display-eligible available items only.
- **Public listeners are isolated** — `ScreenDisplay` and `MenuBoardDisplay` listen to `platformSummary/screen_{sId}`, not the internal `campaigns_{sId}` summary that contains Today, staff-prompt, physical-surface, and campaign data.
- **Owner-only override is real** — Highlights uses valid custom slides only when `ownerOverrideEnabled` is on, with brand fallback if all custom slides expire.
- **Content is normalized before display** — screen extraction normalizes localized text, strips HTML-like/control text, parses currency-bearing prices, blocks technical category IDs, dedupes items, normalizes tags, and caps custom slide captions.
- **Currency symbol follows store settings** — `ScreenStoreInfo.currencySymbol` is hydrated from the store document and passed to Menu Board / Highlights price renderers.
- **Owner uploads are artwork** — `owner_upload` slides render the uploaded image as the content and do not overlay the management caption as TV copy.
- **Public cache invalidation touches screens** — client-side project/menu public cache invalidation also increments screen content version when a screen token already exists.
- **Screen SSR cache tag included** — `/api/revalidate/menu` store invalidation now includes `screen-data` so screen SSR reads can refresh with public menu changes.
- **Shared public attribution** — both screen modes render the same quiet `Powered by MenuList. All rights reserved` attribution used by public OBP/menu surfaces.

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
- `publicScreenState.ts` — Converts canonical screen state into the public-safe listener mirror and writes `platformSummary/screen_{sId}`.
- `screenInvalidation.ts` — Browser-side screen content-version touch used by public cache invalidation. It reads the existing summary first, never creates partial screen state, and materializes a compact default-menu projection when a screen already exists.

### Screen Page (`src/app/screen/[token]/` — 3 files)

- `page.tsx` (~90 lines) — Server component: DAL fetch, generated projection/fallback menu resolution, mode routing via `?mode=` query param
- `ScreenDisplay.tsx` — **Highlights mode** client: rotation, cache-first, onSnapshot, seen signal, hero image slides, QR, capsule progress, screen-safe brand fallback
- **`MenuBoardDisplay.tsx`** — **Menu Board mode** client: screen-grade full menu layout, ordered categories/items, price alignment, QR, progress bar, auto-pagination
- `ScreenAttribution.tsx` — Shared quiet MenuList attribution used by both screen modes.

### API Route (1 file)

- `src/app/api/screen/seen/route.ts` (79 lines) — Daily seen signal (1 write/day/screen)

### DAL (`src/database/campaigns/`)

- `serverScreen.ts` — Public server-side screen resolver for `/screen/[token]`, including token lookup, store lookup, automatic base menu context, projection context validation, and project-read fallback.
- `getScreenDataByToken(token)` — Public, query by token → screen + store + automatic base menu context (2 reads on valid projection context, 3 reads on fallback)
- `getMenuItemsForScreen(storeId, tenantId)` — Public fallback, fetches project items for evergreen slides/menu board when projection is missing or stale (usually 1 read after `baseProjectId`, more for special-menu overlay/fallback)
- `index.ts` — Owner/session DAL for screen setup, settings, uploads, pinned slide management, and content-version bumps.
- `getScreenState()` — Session required, returns DigitalScreenState
- `initializeScreenState()` — First-time setup, generates 22-character high-entropy token
- `updateScreenSettings()` — Toggle owner override
- `addPinnedSlide()` / `removePinnedSlide()` — Owner upload management (max 3)
- `bumpScreenContentVersion()` — Invalidation trigger
- `uploadScreenSlide()` — Firebase Storage upload + addPinnedSlide

### Settings UI (`src/components/.../DigitalScreenSettings/` — 4 files)

- `index.tsx` — Main card: fetch state, owner-only toggle, settings composition
- `CurrentSlides.tsx` — Custom slide list and owner-only mode messaging
- `OwnerUploads.tsx` — Upload manager: max 3, 14-day expiry, delete, caption edit
- `ScreenLink.tsx` — TV setup cards for Menu Board + Highlights, compact URLs, QR blocks, last-seen status
- `src/components/mobile/screens/MobileDigitalScreensScreen.tsx` — Mobile parity surface for TV status, both links, custom slides, and owner-only toggle

---

## Data Flow (End-to-End)

### 1. Screen Page Load (TV boots up)

```
Browser → /screen/[token] or /screen/[token]?mode=highlights
  → page.tsx (Server Component)
    → Read searchParams.mode (default: undefined = menu_board)
    → getScreenDataByToken(token) [DAL — campaigns/serverScreen.ts]
      → Query platformSummary where screen.screenToken == token [1 read]
      → getDoc(stores/{storeId}) [1 read]
      → getDoc(platformSummary/projects_{storeId}) for automatic base menu + QR slug [1 read]
      → License check: active === false || blocked === true → null → 404
    → getUsableScreenMenuProjection(screen.menuProjection)
      → Use generated items when baseProjectId, activeSpecialMenuId, and contentVersion match [0 reads]
      → Else getMenuItemsForScreen(storeId, tenantId) [DAL fallback]
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
7. Send daily seen signal (1/day via localStorage check) [line 130-147]
8. Start 30-min offline fallback timer [line 209-218]
9. Start 6-hour proactive refresh timer [line 220-233]
```

### 3. Real-time Update Flow

```
Owner saves menu → bumpScreenContentVersion() [DAL]
  → OR public client cache invalidation → touchDigitalScreenContentVersion()
  → contentVersion++ in platformSummary/campaigns_{sId}
  → platformSummary/screen_{sId} mirror updated with safe contentVersion state
  → screen.menuProjection refreshed from the automatic default menu when available
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
MENU BOARD: Owner edits menu → screen updates automatically
─────────────────────────────────────────────────────────────
Owner edits item in Editor (price, name, availability)
  → save triggers public cache invalidation for the store
  → public cache invalidation calls touchDigitalScreenContentVersion() when screen exists
  → contentVersion++ in platformSummary/campaigns_{sId}
  → screen.menuProjection refreshed inside the same existing screen summary doc when default menu data is available
  → platformSummary/screen_{sId} mirror updates
  → onSnapshot fires on MenuBoardDisplay.tsx
  → newVersion > currentVersion → window.location.reload()
  → page.tsx uses matching screen.menuProjection, or falls back to getMenuItemsForScreen()
  → MenuBoardDisplay re-renders with updated categories/items/prices in menu order

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
| `screenLastSeenAt`     | Timestamp?    | Updated 1x/day by seen signal                               |
| `menuProjection`       | object?       | Generated default-menu read model; capped available-item payload, `baseProjectId`, `baseProjectSlug`, active special-menu marker, `contentVersion`, `updatedAt` |

`screen` does not store an owner-selected project assignment. Menu resolution remains store-level and automatic; `menuProjection.baseProjectId` and `baseProjectSlug` are generated only to prove the cached payload and QR/menu URL context match the current automatic source.

### `platformSummary/screen_{sId}` (public listener mirror)

| Field                 | Type      | Purpose                                      |
| --------------------- | --------- | -------------------------------------------- |
| `storeId`             | string    | Must match the document id suffix            |
| `screenToken`         | string    | Screen URL token, validated by Firestore rule |
| `enabled`             | boolean   | Public read allowed only when true           |
| `contentVersion`      | number    | Safe reload trigger for public clients       |
| `lastContentChangeAt` | Timestamp | Debug/freshness timestamp                    |
| `updatedAt`           | Timestamp | Mirror write timestamp                       |

Firestore rules allow unauthenticated reads only for this exact safe field set. `platformSummary/campaigns_{sId}` remains owner/authenticated/admin-only.

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
| Daily seen signal        | `ScreenDisplay.tsx:130-147` | 1 write/day ops awareness           |
| Build version logging    | `ScreenDisplay.tsx:26`      | `SCREEN_BUILD_VERSION`              |
| Offline fallback         | `ScreenDisplay.tsx:108-116` | localStorage on data change         |
| 30-min offline retry     | `ScreenDisplay.tsx:209-218` | Reload if listener error            |
| 6-hour proactive refresh | `ScreenDisplay.tsx:220-233` | Memory leaks, code deploys          |

---

## Security

| Check                  | Implementation                                  | Evidence                 |
| ---------------------- | ----------------------------------------------- | ------------------------ |
| No storeId in URL      | Token-based: `/screen/[token]`                  | `page.tsx:31`            |
| License check          | `active === false` or `blocked === true` → null | `campaigns/index.ts:570` |
| No sensitive data      | Public SSR returns menu/display data only; live listener reads safe mirror only | `page.tsx`, `publicScreenState.ts`, `firestore.rules` |
| Protected settings     | DAL functions require `getActiveSession()`      | `campaigns/index.ts:598` |
| Upload rate limit      | Max 3 slides enforced in DAL                    | `campaigns/index.ts:687` |
| Seen signal validation | Token/store format validation + 1hr server rate limit | `seen/route.ts`          |

---

## Known Limitations

| Limitation                              | Impact                                                                     | Details                                     |
| --------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------- |
| ~~Layer 3 (Evergreen) not generated~~   | ✅ **FIXED** — now fetches menu items via `getMenuItemsForScreen()`        | `page.tsx:44`, `slideGenerator.ts:69-73`    |
| ~~`slideGenerator.ts` dead code~~       | ✅ **FIXED** — `page.tsx` now calls `generateScreenSlides()`               | `page.tsx:52-57`                            |
| ~~`screenRenderer.ts` dead code~~       | ✅ **FIXED** — `page.tsx` imports `SCREEN_CONFIG` from it                  | `page.tsx:15`                               |
| ~~No prices displayed~~                 | ✅ **FIXED v2.0** — `price` added to `ScreenSlide`, rendered in both modes | `campaigns.ts:401`, `ScreenDisplay.tsx:482` |
| ~~No Menu Board mode~~                  | ✅ **FIXED v2.0** — `MenuBoardDisplay.tsx` component + `page.tsx` routing  | `MenuBoardDisplay.tsx`, `page.tsx:36-48`    |
| Seen endpoint uses in-memory rate limit | May allow extra writes on serverless cold starts                           | Client localStorage is primary limiter      |

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
- **Seen signal:** Same daily POST to /api/screen/seen

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
    const screenData = await getScreenDataByToken(token);
    if (!screenData) return notFound();

    const menuItems = await getMenuItemsForScreen(storeId, tenantId);

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

- `getScreenDataByToken()` — same 2-3 reads, with valid projection context skipping the project summary read
- `screen.menuProjection` — 0 reads when valid; `getMenuItemsForScreen()` fallback — usually 1 read after `baseProjectId`
- No new collections, no new indexes, no new writes

### Testing Checklist (v2.0 additions)

| #     | Test                | Steps                                   | Expected                                     |
| ----- | ------------------- | --------------------------------------- | -------------------------------------------- |
| MB.1  | Menu Board loads    | Open `/screen/[token]`                  | Full menu with categories and prices         |
| MB.2  | Highlights mode     | Open `/screen/[token]?mode=highlights`  | Rotating slides (existing behavior)          |
| MB.3  | Prices shown        | Check menu board items                  | All items show prices                        |
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

### Console Logs to Verify

```
[Screen] v{version} - Using cached data (N slides)
[Screen] Setting up doc listener: platformSummary/screen_{sId}
[Screen] QR ready
[Screen] Daily seen signal sent
[Screen] Content version changed (X → Y), refreshing...
[Screen] Proactive 6-hour refresh for health maintenance
```

### Database Verification

1. `platformSummary/campaigns_{sId}` has `screen` field
2. `screen.screenToken` is 22 characters (legacy stores may have 8-char tokens — both valid)
3. `screen.pinnedSlides` array exists (may be empty)
4. `screen.menuProjection` is optional; when present, `baseProjectId`, `activeSpecialMenuId`, and `contentVersion` must match the current screen data before public render uses it
5. `screen.screenLastSeenAt` updates daily
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
