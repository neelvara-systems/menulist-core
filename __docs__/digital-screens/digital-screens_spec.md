# Digital Screens - Product Specification

**Created:** January 4, 2026  
**Status:** 🔒 **v2.3 source-bounded screen runtime evidence; not current launch certification. Only readability/reliability/scale fixes allowed.**
**Author:** Lead Architect (Cascade)  
**Source:** ChatGPT Brainstorm + Codebase Analysis + Architecture Alignment + Market Research (Feb 2026)  
**Applies:** 3-Year Architecture Freeze Rule  
**Last Audit:** July 16, 2026 (token-free get-only listener mirror, kill-switch coverage, permission parity, seen retry, expired-slide recovery, cache preservation, migration guard, and source-gate hardening)

## Current Release Boundary (July 16, 2026)

This spec preserves the locked Digital Screens product boundary and source-backed implementation evidence. It is not a current launch certificate.

Current Digital Screens release approval routes through:

- this production-readiness audit and the External Certification Runbook;
- `npm run verify:digital-screens-boundary`;
- browser TV smoke for Menu Board and Highlights display modes;
- authenticated owner settings QA for desktop and mobile setup/copy/upload actions;
- physical-device QA for the target TV/tablet/browser environment;
- Firebase deploy evidence where Firestore rules, Storage rules, indexes, or Cloud Function logic change;
- Vercel deploy evidence where app routes or display clients change;
- production-host smoke for the target tenant and screen URL.

The dedicated local source gate does not replace browser TV smoke, physical-device QA, Firebase deploy evidence, Vercel deploy evidence, or production-host runtime verification.

The token-free listener rule has a rollout dependency: deploy the safe app and Functions writers, run `backfill:digital-screen-public-mirrors` for the target project, verify no legacy token-bearing mirror remains, and only then deploy the tightened Firestore rule. This prevents existing connected screens from losing their listener during migration.

---

## Executive Summary

### What This Is

Digital Screens extends MenuList's authority into the **physical store environment** — TVs, LED screens, digital displays. The screen is not a marketing tool. It is MenuList's presence at the highest-intent decision moment: **the customer standing inside the store deciding what to order.**

Digital Screens operates in **two rendering modes** from the same truth system:

| Mode                     | URL                             | Purpose                                  | Use Case                                            |
| ------------------------ | ------------------------------- | ---------------------------------------- | --------------------------------------------------- |
| **Menu Board** (default) | `/screen/token`                 | Full menu with categories, items, prices | Primary ordering screen (above counter)             |
| **Highlights**           | `/screen/token?mode=highlights` | Rotating promotional slides              | Secondary screen (waiting area, entrance, ambiance) |

Both modes use the same data pipeline, same URL base, same zero-configuration philosophy. Owner opens a link on their TV. That's it.
The screen always follows the store's currently active menu truth automatically.

June 2026 hardening clarified the two screen types in owner setup and raised the TV output standard without changing the product boundary: Menu Board is the counter ordering surface, Highlights is the secondary featured-content surface, and neither becomes signage software.

### The Core Insight

```
The highest purchase intent moment is:
  customer standing inside store deciding what to order.

That moment happens on:
  wall screen above counter.

If MenuList does not own that surface,
we are missing the highest-intent decision surface.

MenuList already knows:
- What items are available RIGHT NOW
- What customers tend to notice
- What categories exist and their prices
- What's selling well

Screens are MenuList extending its authority into physical space.
Not a side feature. Infrastructure expansion.
```

### One-Line Value Proposition

> **"Your current menu on your shop TV. One link. No separate screen editing."**

### Source Gate

Digital Screens freshness claims must match the active source path: `/screen/[token]` reads through a 60-second `screen-data` server cache, public display clients render cache-first from localStorage, and connected screens refresh after acknowledged public-output writes bump `screen.contentVersion` and the public-safe `platformSummary/screen_{storeId}` listener mirror. Manual browser refresh remains the owner-facing fallback when a TV does not receive the listener reload. Guard with `npm run verify:digital-screens-boundary`.

### The Defining Principle

> **Digital Screens is not signage software.**  
> **It is the same decision system that powers Today, with a different output surface.**  
> **Two rendering modes, one truth system.**

If anyone tries to add "playlist management" or "slide scheduling" — they don't understand MenuList.

The moment owners **manage** screens → we lose. Screens must behave like **automatic truth display**, not **design surface**.

### Internal Definition (Team Memorization Required)

> **"The screen shows what we are confident customers should see right now."**

Not "best". Not "trending". Not "selling". Not "optimized".

**Confident.**

This word matters. Screens are the most public surface. Authority is earned by never being wrong in public.

### Owner Experience (Non-Negotiable)

Owner should experience:

> "My menu just shows on screen automatically."

Owner should NEVER experience:

> "I configured my screen."

That includes project-level screen assignment. Screens follow the active store menu automatically.

### Screen Authority Invariants (Non-Negotiable)

1. **Screen Confidence Gate:** Content appears on screen only if `confidence.total >= 0.7` (higher than campaigns at 0.6). If below threshold → Evergreen dominates.

2. **Confidence Monotonicity:** The screen must never show content with lower confidence than what is already being shown. Never downgrade quality mid-day. Never replace evergreen with risky content.

3. **Availability Reliability:** Items with uncertain availability (time-based, volatile stock) are excluded from screens. System adapts internally; owner doesn't configure.

4. **Content Factuality:** Screen labels must not invent claims such as chef endorsement, permanent availability, or recommendation authority. Use factual labels like `Today`, `Popular`, `Featured`, category name, or `On menu`.

5. **Content Normalization:** Item names, descriptions, categories, prices, tags, and custom-slide captions must be normalized before screen display. Technical IDs, HTML-like text, control characters, and unparseable price strings must not leak onto TV output.

6. **Owner Artwork Boundary:** Custom slide captions are management labels. Owner-uploaded poster artwork displays as the content itself; the system must not force item-title overlays onto custom poster slides.

7. **Bearer Token Isolation:** The canonical `campaigns_{storeId}.screen` state owns the screen token. The anonymous `screen_{storeId}` listener mirror contains only store ID, enabled state, content version, and timestamps; it never contains the bearer token, owner slides, campaigns, or staff data. Anonymous access is exact-document `get` only, never collection listing.

8. **Access And Kill-Switch Parity:** Owner links/settings require `canManageDigitalScreens` on desktop and mobile. `DIGITAL_SCREENS_ENABLED=false` removes owner entry points and closes both `/screen/[token]` and `/api/screen/seen`.

---

## Scope

### In Scope

| Feature                         | Description                                                        |
| ------------------------------- | ------------------------------------------------------------------ |
| **Menu Board Mode** (default)   | Full menu with categories, items, prices — primary ordering screen |
| **Highlights Mode** (secondary) | Rotating promotional slides — ambiance/waiting area screen         |
| **Price Display**               | Valid prices show in both modes; Menu Board uses `Ask` when price is missing or unclear |
| **Live Screen URL**             | One URL per store, mode via query parameter                        |
| **Automatic Content**           | System decides what to show based on menu data + availability      |
| **Owner Visibility**            | See what's currently showing (read-only)                           |
| **Owner Setup Trust**           | See two screen types, compact TV links, QR blocks, and last-seen status |
| **Owner Inserts**               | Upload custom images (optional escape hatch, highlights mode only) |
| **Offline Resilience**          | An already-loaded screen keeps its last valid in-memory/local cache during a connection loss; a cold browser boot still needs the route assets |
| **Availability-Aware**          | Auto-removes sold-out items from both modes                        |
| **Auto-Pagination**             | Menu Board auto-rotates pages for large menus (no owner config)    |

### Out of Scope (Intentionally)

| Feature                            | Reason                                                           |
| ---------------------------------- | ---------------------------------------------------------------- |
| ❌ Playlist management             | Creates management burden                                        |
| ❌ Slide ordering                  | Invites micromanagement                                          |
| ❌ Time scheduling                 | Complexity for no value                                          |
| ❌ Per-slide analytics             | Encourages over-optimization                                     |
| ❌ Video support                   | Hardware complexity                                              |
| ❌ Carousel timing controls        | Owner shouldn't think about this                                 |
| ❌ Multiple slideshow templates    | Decision fatigue (Note: Menu Board is a surface, not a template) |
| ❌ Layout editor / drag-drop zones | Signage SaaS territory                                           |
| ❌ Template marketplace            | Signage SaaS territory                                           |
| ❌ Multi-screen dashboard          | Creates management burden                                        |
| ❌ Per-screen configuration        | Violates zero-configuration principle                            |
| ❌ Screen analytics / A/B testing  | Encourages over-optimization                                     |
| ❌ Schedule manager                | Complexity for no value                                          |
| ❌ Mode selection UI in dashboard  | Owner shouldn't think about this — URL handles it                |

### Architectural Boundaries (LOCKED)

> **These constraints are permanent. Violating any of them destroys the product's positioning.**

| Boundary                    | Rule                                                                                                                                                                                   | Constitution Reference                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **No screen analytics**     | No impressions, views, engagement, conversions, A/B tests. The moment owners see metrics, they start optimizing → complexity begins.                                                   | `06-internal-tracking.md` FORBIDDEN metrics      |
| **No screen customization** | No color themes, layout options, font choices, design modes, template marketplace. One system-designed layout only.                                                                    | Feature Rejection Gate Q1: must REMOVE decisions |
| **No screen management UI** | No screen dashboard, device list, screen settings panel, screen scheduling. Screens are automatic extension of menu, not managed devices.                                              | Constitution Law 7: No Feature Without Autonomy  |
| **No separate pricing**     | Never sell screens as a separate product or charge per screen. This is included infrastructure — pricing per screen enters signage market and loses differentiation.                   | Spec: "Not signage software" principle           |
| **No further polish**       | Feature is LOCKED at v2.2. Only fix: readability problems, reliability problems, real user confusion, or scale issues. No visual tweaks, no animation refinements, no CSS experiments. | Constitution Refusal #9: No novelty injection    |

### Readability First (Design Constraint)

> **Clarity > beauty. Legibility > aesthetics. Decision speed > polish.**

Restaurant screens operate in:

- **Bright environments** (overhead lighting, sunlight)
- **Noisy contexts** (customer chatter, kitchen sounds)
- **Fast decisions** (2-4 second attention per item)
- **Distance viewing** (2-4 meters from screen)

**Minimum readability requirements:**

| Element                    | Minimum Size | Weight | Contrast             |
| -------------------------- | ------------ | ------ | -------------------- |
| Menu Board item name       | 30px target  | 700+   | White on dark (>7:1) |
| Menu Board price           | 32px target  | 800    | High contrast        |
| Menu Board category header | 31px target  | 800    | White on dark        |
| Highlights item name       | 48px+        | 800    | White + text-shadow  |
| Highlights price           | 32px+        | 800    | Green on dark        |

**Screen output elements MUST:**

- Never overlap or interfere with text
- Avoid ambient or decorative background effects
- Keep stable row, price, QR, and progress dimensions
- Preserve text contrast in bright store lighting
- Use letter spacing `0`; never use negative or wide tracking for screen text

**If any future change reduces readability at 2m distance on a 40" TV: REVERT immediately.**

---

## User Stories

### Primary User: Shop Owner

#### Story 1: First-Time Setup (Menu Board)

> "I have a TV above my counter. I open MenuList, see 'Digital Screen is ready', tap the link, open it on my TV in Chrome, press fullscreen. My full menu is on the screen — categories, items, prices. Done. I never think about it again."

#### Story 2: Daily Operation (Menu Board)

> "I come to work. The TV is already showing my full menu with prices. When butter chicken sells out, it disappears from the screen. When I add a new item in MenuList, it appears on the screen. I didn't do anything."

#### Story 3: Secondary Screen (Highlights)

> "I have a second TV in the waiting area. I use the highlights link. It shows rotating slides of my best items with a QR code. Customers browse while waiting."

#### Story 4: Festival Override

> "Diwali is coming. My designer made a poster. I upload it to MenuList. It appears on my highlights screen. When Diwali ends, I remove it. System content resumes."

### Secondary User: Walk-in Customer

#### Story 5: Ordering Decision (Menu Board)

> "I walk into a restaurant. The screen above the counter shows the full menu with prices and categories. I know what to order before reaching the counter."

#### Story 6: Upsell Discovery (Highlights)

> "I'm waiting at the counter. The screen shows 'Popular: Paneer Tikka — ₹280' with a QR code. I scan it, see the full menu, order more."

---

## Requirements

### Functional Requirements

| ID    | Requirement                                                       | Priority    | Mode       |
| ----- | ----------------------------------------------------------------- | ----------- | ---------- |
| FR-1  | Highlights: Rotating slides (6-10 seconds each)                   | Must Have   | Highlights |
| FR-2  | Screen never goes blank                                           | Must Have   | Both       |
| FR-3  | Content refreshes after acknowledged menu/campaign changes through cache invalidation and the screen content-version listener | Must Have   | Both       |
| FR-4  | Sold-out items auto-removed                                       | Must Have   | Both       |
| FR-5  | Owner can view current screen state (read-only)                   | Must Have   | Both       |
| FR-6  | Owner can upload custom images (highlights only)                  | Should Have | Highlights |
| FR-7  | Already-loaded screen keeps the last valid cached content during a connection loss | Must Have | Both |
| FR-8  | Screen auto-recovers after internet restored                      | Must Have   | Both       |
| FR-9  | One URL per store, mode via `?mode=` query parameter              | Must Have   | Both       |
| FR-10 | Fullscreen mode (no browser chrome)                               | Must Have   | Both       |
| FR-11 | Highlights: minimum 3 slides in rotation                          | Must Have   | Highlights |
| FR-12 | Highlights: confidence threshold = 0.7 (higher bar)               | Must Have   | Highlights |
| FR-13 | Highlights: never downgrades content quality mid-day              | Must Have   | Highlights |
| FR-14 | **Menu Board: full menu with categories, items, and prices**      | Must Have   | Menu Board |
| FR-15 | **Menu Board: auto-paginate for large menus (system-controlled)** | Must Have   | Menu Board |
| FR-16 | **Menu Board: clean, readable layout (no owner customization)**   | Must Have   | Menu Board |
| FR-17 | **Valid prices display in both modes; Menu Board shows `Ask` for missing/unclear price** | Must Have | Both |
| FR-18 | **Default URL (`/screen/token`) renders Menu Board**              | Must Have   | Menu Board |
| FR-19 | **`?mode=highlights` renders promotional slideshow**              | Must Have   | Highlights |
| FR-20 | **Menu Board preserves menu/category order where source metadata exists** | Must Have | Menu Board |
| FR-21 | **Owner settings show TV setup status and two distinct screen links** | Must Have | Both |
| FR-22 | **Screen content normalizes text, prices, categories, tags, and captions** | Must Have | Both |
| FR-23 | **Owner-uploaded artwork is not overlaid with management caption text** | Must Have | Highlights |

### Non-Functional Requirements

| ID    | Requirement                | Target                                        |
| ----- | -------------------------- | --------------------------------------------- |
| NFR-1 | Screen page load time      | < 3 seconds                                   |
| NFR-2 | Offline behavior           | Preserve last valid loaded content for the running browser session; do not promise cold-boot offline loading |
| NFR-3 | Data refresh path          | Public mirror listener reload + 6hr proactive reload, with a 60-second server cache window |
| NFR-4 | Minimum slides guaranteed  | 2 (never blank)                               |
| NFR-5 | Maximum slides in rotation | 8                                             |
| NFR-6 | Menu Board page density    | 8 item slots target for distance readability |

### Firebase Cost Analysis

| Operation             | Frequency         | Cost Impact                    |
| --------------------- | ----------------- | ------------------------------ |
| Screen page load      | Per TV boot       | 2-4 typical reads (screen, store, optional project summary/fallback) |
| Real-time listener    | On content change | 1 read per change (onSnapshot) |
| 6hr proactive refresh | 3x/day            | 2-4 typical reads per refresh  |
| Daily seen signal     | 1x/day            | Direct: 3 transaction reads + up to 1 write; legacy fallback adds a token query capped at 2 candidates |
| Owner view            | Occasional        | 1 screen summary read          |
| Owner upload          | Rare              | 1 write + storage              |

**Estimated daily cost per store:** ~15-23 reads + 1 write = **~$0.00031-$0.00045/month per screen** (see `digital-screens_firebase.md` for full breakdown)

---

## Architecture Overview (High-Level)

### The Mental Model

```
┌─────────────────────────────────────────────────────────────┐
│                     SYSTEM SIDE (SHARED)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   page.tsx (Server Component)                               │
│     ↓ getScreenDataByTokenServer(token) [2 valid / 3 fallback] │
│     ↓ screen.menuProjection or fallback [0-1+ reads]        │
│     ↓ generateScreenSlides()          [slide stack]          │
│     ↓ Read ?mode= query parameter                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                  │                       │
        mode=default              mode=highlights
                  ↓                       ↓
┌───────────────────────────┐ ┌─────────────────────────────┐
│  MENU BOARD DISPLAY       │ │  HIGHLIGHTS DISPLAY         │
│  MenuBoardDisplay.tsx     │ │  ScreenDisplay.tsx           │
│                           │ │  (existing)                  │
│  • Full menu layout        │ │  • Rotating slides            │
│  • Categories + items      │ │  • Hero images                │
│  • Prices                  │ │  • Campaign + Evergreen       │
│  • Auto-pagination         │ │  • QR code                    │
│  • Availability-aware      │ │  • 8s rotation                │
│  • QR code                 │ │                              │
└───────────────────────────┘ └─────────────────────────────┘

Both share:
  ✓ Same data pipeline (DAL)
  ✓ Same offline cache (localStorage)
  ✓ Same Firebase listener (onSnapshot)
  ✓ Same seen signal (1/day)
  ✓ Same zero-config philosophy
```

### The 4-Layer Slide Stack (Highlights Mode)

> **Non-Negotiable Rule:** Highlights mode always shows **minimum 3 slides**, regardless of Today's single decision. Today = PRIMARY SIGNAL, Screen = CONTEXTUAL EXPANSION.

| Layer               | Source                   | Priority | Behavior                                                 |
| ------------------- | ------------------------ | -------- | -------------------------------------------------------- |
| 1. Owner Pinned     | Owner uploads            | Highest  | Always included when present (14-day default expiry)     |
| 2. Campaign Slides  | Today + active campaigns | High     | Time-scoped, availability-checked                        |
| 3. Evergreen Slides | System-generated         | Medium   | **Trust anchor** — safe, always valid, reliability spine |
| 4. Brand Fallback   | Logo + QR                | Lowest   | Last resort, never empty                                 |

**Critical:** Evergreen slides are NOT "fallback junk". They are the **spine of reliability** — safe truth that maintains trust even during uncertainty. Evergreen slides may appear alongside campaigns, not just when campaigns are absent.

### Menu Board Data Structure

> **Non-Negotiable Rule:** Menu Board shows ALL available items with prices. No confidence gate. No filtering. The full menu = the truth.

Menu Board uses the same server menu data resolver (`screen.menuProjection` when valid, `getMenuItemsForScreenServer()` fallback when stale/missing) but renders ALL available items, not just top 3:

| Data            | Source                          | Behavior                                          |
| --------------- | ------------------------------- | ------------------------------------------------- |
| Categories      | Project extracted data          | Displayed as section headers                      |
| Items           | All available items             | Name + price, grouped by category                 |
| Prices          | `MenuItemForSlide.price`        | Valid amount shown at screen size; `Ask` when missing/unclear |
| Availability    | `MenuItemForSlide.available`    | Unavailable items hidden automatically            |
| Best Sellers    | `MenuItemForSlide.isBestSeller` | Subtle visual indicator (no explanation)          |
| Store Info      | Logo + name + QR                | Header/footer of board                            |
| Auto-Pagination | System-controlled               | Rotate pages every 15-20s for large menus         |

### Key Design Decisions

| Decision                           | Rationale                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| **No separate sidebar item**       | Digital Screen is an execution surface, not a feature. Lives within Today flow.     |
| **Read-only owner view**           | Prevents management mindset. Owner observes, doesn't control.                       |
| **Slides computed, not stored**    | Reduces stale data risk; freshness still follows save, invalidation, listener, and reload boundaries. |
| **Client-side rotation**           | Reduces server load. More resilient.                                                |
| **Minimum 2 slides guaranteed**    | Prevents blank screen embarrassment (highlights mode).                              |
| **Default = Menu Board**           | 70%+ of restaurant screens serve as menu boards. Primary use case = default.        |
| **Mode via URL, not settings UI**  | Zero cognitive load. Owner bookmarks the URL they need. No dashboard decisions.     |
| **No mode selection in dashboard** | The moment we add a dropdown = we created a decision. Decisions are the enemy.      |
| **Price position is always present** | Valid price is shown; unclear/missing source renders `Ask` instead of inventing a number. |
| **Menu Board: no confidence gate** | Full menu is truth, not recommendation. Confidence gate applies to highlights only. |
| **Auto-pagination, no config**     | System decides page timing. Owner never thinks about this.                          |
| **No separate screen menu doc**     | Generated screen menu projection stays inside `platformSummary/campaigns_{sId}.screen` and is validity-checked before use. |

---

## Owner Experience

### How Owners Toggle Between Modes

> **There is no toggle.** There is no setting. There is no dropdown.

Mode selection is handled entirely by URL:

| URL                              | What It Shows                      | Where to Use It                  |
| -------------------------------- | ---------------------------------- | -------------------------------- |
| `/screen/abc123`                 | Menu Board (full menu with prices) | Counter TV, ordering screen      |
| `/screen/abc123?mode=highlights` | Highlights (rotating promotions)   | Entrance, waiting area, ambiance |

The owner bookmarks the appropriate URL on each TV. That's the entire "mode selection" experience.

**Why no settings UI for mode selection:**

- Adding a dropdown = creating a decision = violating Law 6 (No Cognitive Load)
- Owner would need to understand what "mode" means
- Two URLs are simpler than one URL + one setting
- Each TV already has its own browser bookmark — natural place for the choice

### How Owners Manage Screen Content

> **Content management IS menu management. There is no separate "screen content" to manage.**

#### Menu Board Content Flow

```
Owner's normal workflow:
  Edit menu in Projects/Editor → save
    ↓
  System automatically:
    → bumpScreenContentVersion() / touchDigitalScreenContentVersion()
    → refresh generated screen.menuProjection when the default menu is available
    → onSnapshot fires on all connected screens
    → Menu Board re-renders with updated data

Owner does NOTHING screen-specific.
```

| Owner Action in MenuList | Menu Board Result     | Highlights Result             |
| ------------------------ | --------------------- | ----------------------------- |
| Add new menu item        | Appears after save and screen refresh | May appear as evergreen slide after refresh |
| Change a price           | Updates after save and screen refresh | Price shown on slide updates after refresh |
| Mark item sold out       | Leaves the board after save and screen refresh | Leaves the rotation after refresh |
| Add new category         | New section appears   | No direct effect              |
| Delete an item           | Removed from board    | Removed from rotation         |
| Upload custom image      | No effect             | Appears in rotation           |

#### Highlights Content Flow

```
System-managed (automatic):
  Layer 1: Owner pinned slides (uploaded images)
  Layer 2: Campaign slides (from Today decisions)
  Layer 3: Evergreen slides (bestseller items with images)
  Layer 4: Brand fallback (logo + QR)

Owner escape hatch (optional):
  Settings → Digital Screen → Upload Image (max 3, 14-day expiry)
```

### Real-World Scenario: Raju's Café, Bangalore

**Setup (5 minutes, once):**

1. Raju opens MenuList → Settings → Digital Screen
2. Sees two links: "Menu Board" and "Highlights"
3. Opens Menu Board link on counter TV → full menu appears
4. Opens Highlights link on waiting area TV → rotating promos appear
5. Bookmarks both. Presses F11. Done.

**Daily operation (0 minutes):**

- Morning: Raju comes to work. Both TVs are already showing the right content.
- 2 PM: Butter chicken sells out. Raju marks it in MenuList. Both screens update within minutes.
- 3 PM: Raju adds a new "Summer Special Mango Lassi" in the Editor and saves. It appears after the screen refresh path completes. The system may feature it on Highlights if it has a valid image.
- Diwali: Raju's designer makes a poster. Raju uploads it in Settings → it appears on the Highlights screen. After 14 days, it auto-expires.

**What Raju NEVER does:**

- ❌ Choose which items appear on screen
- ❌ Arrange slide order
- ❌ Set display timing
- ❌ Configure screen layout
- ❌ Switch between modes in a settings panel
- ❌ Manage "screen content" as a separate thing

### Where This Lives in the App

```
Sidebar
├── Dashboard
├── Today ⭐
│   └── When surface = digital_screen:
│       "Digital screen is ready"
│       [Open screen link]
├── Projects
├── Settings
│   └── Digital Screen Settings (optional)
└── ...
```

**Critical:** No separate "Digital Screen" sidebar item. This is intentional.

### What Owner Sees in Today Tab

When a campaign targets `digital_screen` surface:

```
┌─────────────────────────────────────────┐
│  Digital screen is ready                │
│                                         │
│  Showing today's highlight              │
│                                         │
│  [Open screen link]                     │
│                                         │
│  Screen link: xyz.menulist.com/scr/abc  │
│  [Copy]                                 │
└─────────────────────────────────────────┘
```

### First-Time Setup (One-Time Only)

```
┌───────────────────────────────────────────┐
│  Your menu is ready for your shop TV       │
│                                             │
│  1. Open this link on your TV               │
│  2. Press fullscreen (F11)                  │
│  3. Bookmark it                             │
│                                             │
│  [QR Code]                                  │
│                                             │
│  Menu Board (main screen):                  │
│  xyz.menulist.com/screen/abc123             │
│  [Copy link]                                │
│                                             │
│  Highlights (optional, for second screen):  │
│  xyz.menulist.com/screen/abc123?mode=       │
│  highlights                                 │
│  [Copy link]                                │
└───────────────────────────────────────────┘
```

### Settings > Digital Screen (Optional)

```
┌───────────────────────────────────────────┐
│  Digital Screen                              │
│                                              │
│  Status: Running ✓                           │
│                                              │
│  Screen links:                               │
│  Menu Board: xyz.menulist.com/screen/abc123  │
│  [Open preview] [Copy link]                  │
│                                              │
│  Highlights: .../screen/abc123?mode=         │
│  highlights                                  │
│  [Open preview] [Copy link]                  │
│                                              │
│  ──────────────────────────────────────  │
│                                              │
│  Your additions (highlights only, optional)  │
│  [Upload image]                              │
└───────────────────────────────────────────┘
```

---

## Risks & Mitigations

| Risk                              | Likelihood   | Impact | Mitigation                                                      |
| --------------------------------- | ------------ | ------ | --------------------------------------------------------------- |
| **Screen goes blank**             | Low          | High   | Evergreen fallback + brand slide always available               |
| **Stale content**                 | Medium       | Medium | 60-second server cache, public cache invalidation, version listener, jittered reload, six-hour health reload, and manual refresh fallback |
| **Owner expects scheduling**      | Medium       | Low    | Clear messaging: "runs automatically"                           |
| **Internet outage**               | High (India) | Medium | Already-loaded screen preserves in-memory/local cached output; cold boot requires route assets |
| **TV reboots daily**              | High (India) | Low    | URL bookmarkable, no login required                             |
| **Owner uploads bad content**     | Medium       | Low    | System content continues balancing (highlights only)            |
| **Stale owner uploads**           | Medium       | Low    | Display expires after the shared retention window; owner reads hide expired slides and the next mutation prunes their Firestore references |
| **Owner expects customization**   | Medium       | Low    | No customization. System-designed. "This is how it works."      |
| **Owner confused by two URLs**    | Low          | Low    | Default URL = menu board (most common). Highlights is optional. |
| **Menu too large for one screen** | Medium       | Medium | Auto-pagination rotates pages every 15-20s                      |
| **Becoming signage SaaS**         | Low          | High   | Feature Rejection Gate enforced. Out-of-Scope list locked.      |

---

## Open Questions

| #   | Question                                   | Status                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Should screen URL require authentication?  | **Resolved:** No. Public URL with store-specific token.                                                                                                                                                                                                                                                                                                                                                             |
| 2   | What happens if owner has no menu items?   | **Resolved:** Brand fallback only.                                                                                                                                                                                                                                                                                                                                                                                  |
| 3   | Should we track "screen views"?            | **Resolved:** No. This invites ROI thinking.                                                                                                                                                                                                                                                                                                                                                                        |
| 4   | Can owner fully disable system content?    | **Resolved:** No. They can only ADD, not disable.                                                                                                                                                                                                                                                                                                                                                                   |
| 5   | How does owner choose screen mode?         | **Resolved:** URL parameter. Default = menu board. `?mode=highlights` for alt.                                                                                                                                                                                                                                                                                                                                      |
| 6   | Should mode selection be in dashboard?     | **Resolved:** No. URL handles it. No UI decisions.                                                                                                                                                                                                                                                                                                                                                                  |
| 7   | Should Menu Board respect confidence gate? | **Resolved:** No. Full menu = truth. Confidence gate is for highlights only.                                                                                                                                                                                                                                                                                                                                        |
| 8   | Should we add prices?                      | **Resolved:** Yes. Non-negotiable. Data exists in `MenuItemForSlide.price`.                                                                                                                                                                                                                                                                                                                                         |
| 9   | Future: system auto-detect mode?           | **Deferred:** Capability flag ready (`"auto"`), not implemented now.                                                                                                                                                                                                                                                                                                                                                |
| 10  | AI-generated display images (Gemini)?      | **Resolved: Rejected.** Evaluated in v2.2. Owners already generate images via Projects editor AI pipeline — those flow to screens via `item.images[0].url`. CSS renders instantly at $0; AI costs $0.04/image + regeneration on data changes. Real food photos build more customer trust. Instead: enriched metadata (description, tags) + creative CSS templates. See `digital-screens_improvements.md` Finding 9. |

---

## Success Metrics (Internal Only)

> **Note:** These are NOT shown to owners. They're for internal product health.

| Metric                 | Target               | Measurement                     |
| ---------------------- | -------------------- | ------------------------------- |
| Screen adoption rate   | 30% of active stores | Stores with ≥1 screen page view |
| Daily active screens   | 50% of adopters      | Screens with ≥1 refresh/day     |
| Owner override rate    | < 10%                | Stores with pinned content      |
| Blank screen incidents | 0%                   | Monitoring + alerts             |

---

## Timeline

### Completed (v1.0 — January 2026)

| Deliverable                    | Status     |
| ------------------------------ | ---------- |
| Highlights mode (slideshow)    | ✅ SHIPPED |
| Offline cache + resilience     | ✅ SHIPPED |
| Owner uploads (max 3)          | ✅ SHIPPED |
| Settings UI (read-only + link) | ✅ SHIPPED |
| Daily seen signal              | ✅ SHIPPED |
| Firebase listener (real-time)  | ✅ SHIPPED |
| Evergreen slides (Layer 3)     | ✅ SHIPPED |

### Completed (v2.0 — February 2026)

| Deliverable                         | Status     |
| ----------------------------------- | ---------- |
| Add price to `ScreenSlide` + render | ✅ SHIPPED |
| `MenuBoardDisplay.tsx` component    | ✅ SHIPPED |
| `page.tsx` mode routing             | ✅ SHIPPED |
| Feature flag `DIGITAL_SCREENS_MODE` | ✅ SHIPPED |
| Settings UI: show both URLs         | ✅ SHIPPED |
| Auto-pagination for large menus     | ✅ SHIPPED |
| Offline cache for menu board data   | ✅ SHIPPED |
| Doc updates (all 8 files)           | ✅ SHIPPED |

---

## Appendix A: Disagreements with ChatGPT (v1.0 — January 2026)

> Per MANDATORY WORKFLOW: I must document where I disagree with ChatGPT and why.

| ChatGPT Proposal                                                                                         | My Decision | Rationale                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Separate "Digital Screen" sidebar item**                                                               | ❌ Reject   | Creates separate mental model. Screen is an execution surface of Today, not a separate feature. Violates "Today is the one place" principle. |
| **4-type Evergreen system** (Menu Highlight, Category Spotlight, Availability Assurance, House Identity) | ⚠️ Simplify | Codebase already has `menu_highlight` as evergreen fallback. Over-engineering. Reduce to 2 types: Item Highlight + Brand Fallback.           |
| **New `digitalScreens/{storeId}` collection**                                                            | ❌ Reject   | Adds Firebase cost. Extend existing `platformSummary/campaigns_{sId}` to include screen state. Single source of truth.                       |
| **Complex weighted round-robin rotation**                                                                | ⚠️ Simplify | Frontend-first: simple array loop is sufficient. Weights add complexity for minimal value.                                                   |
| **Owner can "pause" system slides**                                                                      | ❌ Reject   | Invites control mindset. Owner can ADD, never subtract system content.                                                                       |

## Appendix B: ChatGPT Strategic Review (v2.0 — February 2026)

> Market research + ChatGPT strategic feedback + Cascade architect review.
> Full analysis: `_archive/digital-screens_chatgpt-review.md`

### What Was Validated

| Finding                                    | Source                                      | Decision                     |
| ------------------------------------------ | ------------------------------------------- | ---------------------------- |
| 70%+ restaurant screens are menu boards    | Web research (PosterBooking, Fugo, Foodhub) | Add Menu Board mode          |
| Current version = promotional signage only | Codebase analysis (`ScreenDisplay.tsx`)     | Keep as Highlights mode      |
| No prices displayed = critical flaw        | `ScreenSlide` type has no price field       | Fix immediately              |
| Two surfaces from same truth system        | ChatGPT Option C                            | Adopted as v2.0 architecture |
| Never add management features              | Already in spec + constitution              | Reinforced                   |

### Feature Rejection Gate: Menu Board Mode

| Question                    | Answer                                               | Result   |
| --------------------------- | ---------------------------------------------------- | -------- |
| Removes decision?           | Owner no longer decides what to display on TV        | **PASS** |
| Would notice absence?       | Owner expects to see their menu on the screen        | **PASS** |
| Strengthens core moment?    | Customer sees full menu, decides faster              | **PASS** |
| One sentence without "and"? | "Shows your full menu on the shop TV automatically." | **PASS** |
| Still matters in 3 years?   | Restaurant menus on screens is permanent need        | **PASS** |

**Result: 5/5 PASS**

### Strategic Framing (Locked)

> Screens are not a side feature. They are **MenuList extending its authority into physical space** — the highest-intent decision surface where a customer stands inside the store deciding what to order.

This framing applies to all future screen decisions.

## Appendix C: ChatGPT Strategic Review v2 (Post-v2.2 — February 2026)

> Post-implementation review after v2.0+v2.1+v2.2.
> Full analysis: `_archive/digital-screens_chatgpt-review-v2.md`

### What Was Validated

| Finding                                | Source                    | Decision                                                 |
| -------------------------------------- | ------------------------- | -------------------------------------------------------- |
| Zero-configuration preserved correctly | ChatGPT review            | Already enforced — no action                             |
| "Surface infrastructure" positioning   | ChatGPT framing           | Already in spec line 16 — no action                      |
| Visual polish drift risk               | ChatGPT warning           | **Added "Readability First" constraint to spec**         |
| 4 "never" rules for screens            | ChatGPT boundaries        | **Consolidated into "Architectural Boundaries" section** |
| AI image generation for screens        | ChatGPT + user discussion | **Resolved: Rejected.** See Finding 9 in improvements.md |
| Feature is infrastructure-complete     | ChatGPT assessment        | **Marked spec as 🔒 LOCKED v2.2**                        |

### Feature Rejection Gate: Screen Pairing via QR (REJECTED)

ChatGPT suggested: "TV shows pairing code → owner scans from phone → screen linked automatically"

| Question                    | Answer                                                                 | Result     |
| --------------------------- | ---------------------------------------------------------------------- | ---------- |
| Removes decision?           | Replaces copy-paste with scan. Adds "pairing" concept owner must learn | ⚠️ PARTIAL |
| Would notice absence?       | Single-outlet: No. Multi-outlet chains: Maybe                          | ❌ FAIL    |
| Strengthens core moment?    | No — setup UX, not customer decision speed                             | ❌ FAIL    |
| One sentence without "and"? | "Scan QR to pair screen"                                               | ✅ PASS    |
| Still matters in 3 years?   | URL bookmarking is universal. QR pairing adds moving parts             | ❌ FAIL    |

**Score: 2/5 — REJECTED.** Current URL approach is a one-time 5-minute task. QR pairing requires: pairing code generation, temporary token system, scan endpoint, pairing mode UI on screen, scan flow UI in app — all for a one-time setup. Over-engineering.

---

### Completed (v2.1 — February 2026)

| Deliverable                                | Status     |
| ------------------------------------------ | ---------- |
| Glassmorphism UI (Menu Board + Highlights) | ✅ SHIPPED |
| Ken Burns image zoom (Highlights)          | ✅ SHIPPED |
| Ambient orb backgrounds                    | ✅ SHIPPED |
| Food thumbnails in Menu Board              | ✅ SHIPPED |
| Staggered animations (Framer Motion)       | ✅ SHIPPED |
| Capsule progress indicators                | ✅ SHIPPED |
| Brand fallback redesign                    | ✅ SHIPPED |

### Completed (v2.2 — February 2026) — FINAL

| Deliverable                                              | Status      |
| -------------------------------------------------------- | ----------- |
| Metadata pipeline: description + tags flowing to screens | ✅ SHIPPED  |
| Dietary badges (Veg/Non-Veg) on both modes               | ✅ SHIPPED  |
| Item descriptions on both modes                          | ✅ SHIPPED  |
| Decorative accent strip (Highlights)                     | ✅ SHIPPED  |
| Store watermark branding (Highlights)                    | ✅ SHIPPED  |
| AI image generation for screens — evaluated and rejected | ✅ RESOLVED |
| Architectural Boundaries documented                      | ✅ LOCKED   |
| Readability First constraint documented                  | ✅ LOCKED   |

**🔒 Feature LOCKED after v2.2. No further enhancements unless readability, reliability, or scale issue.**

### Completed (v2.3 — March 2026) — HARDENING

| Deliverable                                                 | Status     |
| ----------------------------------------------------------- | ---------- |
| Token security: 8-char → 22-char (~130-bit entropy)         | ✅ SHIPPED |
| Reload jitter: 0-60s random delay on content version change | ✅ SHIPPED |
| Broken image fallback on MenuBoard thumbnails               | ✅ SHIPPED |
| MenuBoard listener offline state + 30min retry              | ✅ SHIPPED |
| Sold-out state messaging improvement                        | ✅ SHIPPED |
| Menu size guardrail (MAX_TOTAL_ITEMS=200)                   | ✅ SHIPPED |
| Auto-fullscreen recovery on both modes                      | ✅ SHIPPED |
| Screen activity status in Settings UI                       | ✅ SHIPPED |
| "Main TV" / "Second TV" labels in Settings                  | ✅ SHIPPED |

**These are reliability/scale fixes per the LOCKED rule — no feature additions.**

---

## Appendix D: Strategic Positioning (March 2026)

> Per ChatGPT Strategic Review v3 — validated insights added to spec.
> Full analysis: `_archive/digital-screens_chatgpt-review-v3.md`

### Three-Surface Infrastructure Moat

Digital Screens + QR Menu + Official Public Page form a **closed presence system**:

| Surface              | Physical Location       | Moment      | Role        |
| -------------------- | ----------------------- | ----------- | ----------- |
| Digital Screens      | Inside store (wall)     | Decision    | Framing     |
| QR Menu              | Table / counter         | Exploration | Interaction |
| Official Public Page | Internet / maps / links | Discovery   | Identity    |

Each surface leads to the next:

```
Official Page → customer visits store → Screen → QR Menu → MenuList interface
```

**Why this is hard to replace:** A competitor must replace all three layers simultaneously. Replacing only one (e.g., QR) leaves Screens still running MenuList. This creates **layered switching friction**.

### Google Positioning (LOCKED)

> **Google = discovery. MenuList = menu truth.**

- MenuList should NEVER attempt to build restaurant discovery, search, or marketplace features
- The correct relationship is complementary: Google sends traffic, MenuList provides structured truth
- Screens + QR + OBP strengthen this by controlling the in-store layer Google cannot reach

### Distribution Engine Effect

Every screen and QR scan is an ambient product exposure moment:

- 1,000 stores × 100 customers/day = **100,000 daily brand exposures**
- Restaurant owners visiting competitors see MenuList screens → organic B2B discovery
- Customers encountering the same interface across restaurants build **interface familiarity**
- No ads or marketing spend required — product distributes through physical presence

### Menu Truth as Foundation

All three surfaces depend on the same data: menu, prices, availability, hours, identity. If the data is wrong on any surface, trust breaks publicly. This creates a **positive pressure loop**: screens force MenuList to become the most reliable source of menu truth.

---

## Document History

| Version | Date       | Author  | Changes                                                                                                                                                                                                                                                                                                                                     |
| ------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-01-04 | Cascade | Initial spec based on ChatGPT brainstorm                                                                                                                                                                                                                                                                                                    |
| 2.0     | 2026-02-08 | Cascade | **Major update:** Added Menu Board mode (default), Highlights mode (secondary), price display requirement, two-surface architecture, updated user stories, expanded FRs (FR-14 to FR-19), strategic framing, Feature Rejection Gate results, market research findings                                                                       |
| 3.0     | 2026-02-08 | Cascade | **🔒 v2.2 LOCKED:** Metadata enrichment (description, tags, dietary badges). AI image gen rejected. Architectural Boundaries + Readability First constraints added. QR pairing rejected (2/5). ChatGPT Strategic Review v2 appended. Feature now LOCKED                                                                                     |
| 4.0     | 2026-03-15 | Cascade | **v2.3 HARDENING:** Token security (22-char), reload jitter, MenuBoard hardening (broken image, offline retry, sold-out, menu cap), auto-fullscreen recovery, Settings UI (activity status, Main TV/Second TV labels). Strategic Appendix D added (three-surface moat, Google positioning, distribution engine). ChatGPT review v3 archived |
| 5.0     | 2026-06-06 | Codex   | **Public read hardening:** Documented generated `screen.menuProjection` inside existing screen summary state, projection/fallback read economics, base menu slug context, and no separate screen-menu document. |
| 5.1     | 2026-07-01 | Codex   | **Seen-signal eligibility hardening:** Updated cost and boundary notes for enabled-screen plus public store eligibility checks before daily liveness writes. |
| 5.2     | 2026-07-02 | Codex   | **Launch-boundary wording:** Replaced the stale production-complete status with source-bounded runtime evidence and routed release approval through the active audit, External Certification Runbook, dedicated source gate, browser TV smoke, physical-device QA, deploy evidence, and production-host smoke. |
