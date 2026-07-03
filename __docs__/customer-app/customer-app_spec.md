# Customer App — Product Specification

**Feature Name:** Customer App (Installable Customer-Facing Menu)  
**Document Type:** Product Requirements Document (PRD)  
**Status:** Runtime implemented and source-gated; manual device QA still required
**Last Updated:** July 2, 2026
**Audience:** Product, CEO, Business Teams, Non-Technical Stakeholders

---

## Executive Summary

The **Customer App** is a new MenuList surface that transforms a restaurant's digital menu into an **installable app** for their customers. When customers visit the menu and add it to their home screen, they get a branded app experience with the restaurant's logo and name — not "MenuList."

### What It Is

An **installable customer retention surface** that:

- Lets customers add the menu to their phone's home screen as a branded app
- Shows the restaurant's logo and name (not MenuList branding)
- Opens directly to the menu — no browser chrome
- Works on iPhone and Android without app store downloads
- Requires zero maintenance from the restaurant owner

### What It Is NOT

- ❌ A separate mobile app owners need to build or maintain
- ❌ A custom app with configurable colors, layouts, or behavior
- ❌ An ordering system with checkout (menu remains read-only)
- ❌ A loyalty program or gamification tool
- ❌ Push notifications (deferred to future phase)

### Business Value

| Metric                     | Value                                     |
| -------------------------- | ----------------------------------------- |
| Customer Retention         | One-tap access increases repeat visits    |
| Brand Ownership            | Restaurant's app icon on customer phones  |
| Zero Owner Effort          | Auto-generated from existing menu data    |
| Competitive Moat           | "Your own customer app" vs. "a menu link" |
| Infrastructure Positioning | MenuList powers thousands of branded apps |

---

## Goals & Objectives

### Primary Goals

1. **Increase repeat customer visits** through reduced friction (one-tap access)
2. **Strengthen restaurant brand presence** on customer home screens
3. **Differentiate MenuList** from QR-code-only competitors
4. **Require zero daily effort** from restaurant owners

### Success Metrics

| Metric                  | Target                  | How Measured         |
| ----------------------- | ----------------------- | -------------------- |
| Install conversion rate | >5% of repeat visitors  | Install analytics    |
| App opens per month     | >3 per installed user   | Usage analytics      |
| Owner activation rate   | >60% enable the feature | Feature flag metrics |
| Customer retention lift | +20% repeat visit rate  | Cohort analysis      |

---

## Scope

### In Scope

| Feature                                              | Description                                                                               | Priority |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------- |
| Dynamic PWA manifest                                 | Per-store manifest with restaurant branding                                               | P0       |
| App icon generation                                  | Auto-generated from store logo + optional override                                        | P0       |
| Install prompt system                                | Smart timing (3rd visit), 30-day dismissal suppression                                    | P0       |
| Minimal service worker                               | For install reliability only — no caching                                                 | P0       |
| App shortcuts                                        | View Menu, Call Store, Get Directions (text only, no custom icons v1)                     | P1       |
| Apple touch icon                                     | iOS home screen icon support                                                              | P0       |
| pwaShortName                                         | Short app name for long business names                                                    | P1       |
| Owner settings                                       | Toggle enable, toggle promote, name override, icon override                               | P0       |
| Unpublished / inactive gate                          | Disable Customer App when store has no valid public surface                               | P0       |
| Cross-platform QA                                    | Chrome Android, Samsung Internet, Safari iOS                                              | P0       |
| Surface analytics (install funnel, opens, shortcuts) | Day-one surface lifecycle tracking on existing analytics pipeline                         | P0       |
| Owner analytics card                                 | "Customer App" card on analytics dashboard with installs, opens, conversion, top shortcut | P0       |

### Out of Scope (Explicitly Excluded)

| Feature                                  | Rejection Reason                                              |
| ---------------------------------------- | ------------------------------------------------------------- |
| Offline menu caching                     | Strategic decision — no caching                               |
| Push notifications                       | Deferred — scope protection                                   |
| Background sync                          | Not needed without offline                                    |
| Theme customization                      | Avoids website-builder complexity                             |
| App layout changes                       | System behavior fixed, identity only dynamic                  |
| AI icon generation                       | Deterministic generation preferred                            |
| Reorder shortcut                         | Implies ordering system which doesn't exist                   |
| Loyalty/gamification                     | Violates Feature Rejection Gate                               |
| Manifest screenshots                     | Adds asset pipeline complexity, no day-one value              |
| Custom shortcut icons                    | Default icons only on day one, no per-store shortcut assets   |
| Screen-by-screen app behavior / heatmaps | Wrong layer — we track surface lifecycle, not in-app behavior |
| Session duration / time-in-app           | Not a surface metric — not tracked                            |
| Customer-level identity tracking         | Privacy violation — session-only, never user-level            |
| Device-level profiling                   | Privacy violation                                             |

---

## User Stories

### Customer Stories

| #   | As a...          | I want to...                                        | So that...                                   |
| --- | ---------------- | --------------------------------------------------- | -------------------------------------------- |
| C1  | Regular customer | Add my favorite restaurant to my home screen        | I can open their menu with one tap           |
| C2  | Customer         | See the restaurant's logo as the app icon           | I recognize it instantly among my apps       |
| C3  | Customer         | Call the restaurant directly from the app shortcuts | I can order without searching for the number |
| C4  | Customer         | Get directions from the app shortcuts               | I can find the restaurant easily             |

### Owner Stories

| #   | As a...          | I want to...                                | So that...                                |
| --- | ---------------- | ------------------------------------------- | ----------------------------------------- |
| O1  | Restaurant owner | Give my customers an app with my branding   | My business feels more established        |
| O2  | Owner            | Control whether to promote app installation | I can decide if it fits my customer base  |
| O3  | Owner            | Optionally customize the app name           | Long restaurant names fit on home screens |
| O4  | Owner            | Optionally upload a custom app icon         | My logo works better as an app icon       |

---

## User Flows

### Flow 1: Customer Installs the App

```
Customer visits joespizza.menulist.ai for 3rd time
    ↓
System shows install prompt: "Save this menu for faster access"
    ↓
Customer taps "Add to Home Screen"
    ↓
Browser shows install confirmation with restaurant branding
    ↓
Customer confirms
    ↓
App appears on home screen as "Joe's Pizza" with restaurant logo
    ↓
Customer taps app icon
    ↓
Menu opens in standalone mode (no browser chrome)
```

### Flow 2: Owner Enables Customer App

```
Owner opens MenuList dashboard
    ↓
Navigates to "Surfaces" → "Customer App"
    ↓
Sees current status: "Installable: Active" with preview
    ↓
Toggles "Enable Installable App" to ON
    ↓
Toggles "Promote Installation" to ON
    ↓
Customers now see install prompts on 3rd visit
```

### Flow 3: Owner Customizes App Identity

```
Owner opens "Customer App" settings
    ↓
Current: "App name: Joe's Pizza & Family Restaurant (from store name)"
    ↓
Enters override: "Joe's Pizza"
    ↓
Previews icon: sees how it appears on home screens
    ↓
Optionally uploads custom icon (square, 1024x1024)
    ↓
Saves changes
    ↓
New customers see updated branding
```

---

## Features

### 1. Dynamic PWA Manifest

**What:** Each store gets a unique web app manifest generated from store data.

| Manifest Field   | Source                         | Example                                                 |
| ---------------- | ------------------------------ | ------------------------------------------------------- |
| name             | Store name                     | "Joe's Pizza"                                           |
| short_name       | pwaShortName or truncated name | "Joe's Pizza"                                           |
| icons            | Generated app icon URLs        | `/api/app-icons/{storeId}/192`                          |
| start_url        | Store-level customer entry     | `/menu` when a customer menu exists, otherwise `/`      |
| display          | Fixed value                    | "standalone"                                            |
| theme_color      | Brand accent or default        | "#ffffff"                                               |
| background_color | Fixed value                    | "#ffffff"                                               |
| id               | Stable store identifier        | `/?store={storeId}`                                     |
| scope            | Store origin root              | `/`                                                     |
| display_override | Fixed array                    | `["standalone", "minimal-ui"]`                          |
| shortcuts        | Dynamic based on store data    | See Feature 4                                           |
| description      | Auto-generated                 | "Official menu, contact and directions for {storeName}" |

**Routing Model (Canonical):** Each store is served from its own subdomain (`{subdomain}.menulist.ai`) or verified custom domain (`joespizza.com`). The manifest is served from the tenant origin root: `https://joespizza.menulist.ai/manifest.webmanifest`. Path-based manifests (e.g., `menulist.ai/{slug}/manifest.webmanifest`) are NOT used — they would split scope across tenants and weaken install identity. The manifest ignores route-level `?start=` identity and always represents one store-level Customer App. See `src/middleware.ts` and `src/lib/multiTenant/domainResolver.ts` for the existing domain resolution layer.

### 2. App Icon System

**Three-Tier Architecture:**

| Tier                     | Asset                                | Usage                               |
| ------------------------ | ------------------------------------ | ----------------------------------- |
| Business logo            | `stores.branding.logoUrl`            | Headers, OBP, public identity       |
| Generated PWA icon       | System-processed from logo           | Default app icon (80-90% of stores) |
| Custom PWA icon override | `stores.branding.pwaIconOverrideUrl` | Optional merchant upload            |

**Icon Generation Rules (Deterministic):**

1. Extract logo from source
2. Remove whitespace, center content
3. Add 15% padding for safe zone
4. Add white or brand-color background
5. Generate maskable variant with purpose: "any maskable"
6. Output sizes: 192x192, 512x512, 180x180 (Apple)

**Override Validation (if merchant uploads):**

- Square aspect ratio only
- 1024x1024 preferred
- PNG format only
- Preview before save (Android + iOS mockups)

### 3. Install Prompt System

**Trigger Logic:**

| Condition         | Rule                                        |
| ----------------- | ------------------------------------------- |
| Visit count       | Show only on 3rd+ visit                     |
| Dismissal memory  | If dismissed, suppress for 30 days          |
| Already installed | Never show to installed users               |
| Feature enabled   | Only if owner has "Promote Installation" ON |

**Prompt Copy (System-Controlled):**

> "Save this menu to your home screen for faster access"

**Platform Behavior:**

| Platform         | Behavior                                                    |
| ---------------- | ----------------------------------------------------------- |
| Chrome Android   | Uses `beforeinstallprompt` for native install UI            |
| Samsung Internet | Uses `beforeinstallprompt` or manual instructions           |
| Safari iOS       | Shows custom instructions: "Tap Share → Add to Home Screen" |

**Visit Persistence:** Visit count is persisted in `localStorage` (not `sessionStorage`) so the 3rd-visit trigger works across separate browsing sessions. Dismissal timestamp is also persisted in `localStorage` for the 30-day suppression window.

### 4. App Shortcuts

**Dynamic shortcuts based on store capabilities (no per-store custom icons on day one):**

| Shortcut       | Condition                 | Action                     |
| -------------- | ------------------------- | -------------------------- |
| View Menu      | Always                    | Opens store's default menu |
| Call Store     | If `store.phone` exists   | `tel:{phone}`              |
| Get Directions | If `store.address` exists | Opens maps with address    |

**Ordering (priority):**

1. View Menu
2. Call Store (if available)
3. Get Directions (if available)

**Asset policy:** Day one uses text-only shortcuts or a shared static icon set (not per-store generated). Custom shortcut icons per store are deliberately out of scope.

### 5. Owner Settings

**Customer App Surface Settings:**

| Setting                | Type            | Default        | Location             |
| ---------------------- | --------------- | -------------- | -------------------- |
| Enable Installable App | Toggle          | ON             | Customer App surface |
| Promote Installation   | Toggle          | ON             | Customer App surface |
| App Name               | Text (optional) | Store name     | Advanced section     |
| App Icon               | Selector        | Use store logo | Advanced section     |

**Status Indicators (Read-Only):**

- Installable: Active/Inactive
- App Icon: Generated/Custom
- Install Promotion: Active/Inactive

### 6. Eligibility Gate (Unpublished / Inactive Stores)

**Rule:** The Customer App is only eligible when the store has a valid public surface.

| Store State                             | Customer App State                                 |
| --------------------------------------- | -------------------------------------------------- |
| `active: true` + published menu         | Eligible — manifest served, install prompt allowed |
| `active: false`                         | Ineligible — manifest 404, no install prompt       |
| Published menu missing                  | Ineligible — manifest 404, no install prompt       |
| Custom domain unverified + no subdomain | Ineligible — no valid origin                       |

**Owner UX:** The "Enable Installable App" toggle is disabled with a clear reason ("Publish your menu first") when the store is not eligible.

### 7. Churn / Lifecycle Behavior (Frozen)

**Rule:** Once a merchant leaves the platform (account closed, subscription ended, store deactivated), installed Customer Apps on customer phones MUST fail gracefully and deterministically.

| Event                 | Installed App Behavior                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| Store deactivated     | App opens to: "This business is currently unavailable." (system page, branded neutrally)                |
| Subdomain reclaimed   | Same — deterministic unavailable screen                                                                 |
| Merchant logo changes | Existing installs keep the original icon (OS-level). New installs use new icon. Documented, not fought. |
| Rebrand (name change) | Existing installs keep original `short_name`. New installs use new name.                                |

**No silent redirects.** No "this menu moved." No outbound links. One deterministic screen. This is the frozen policy.

### 8. Plugin Governance Rule

**No `next-pwa`, Workbox plugin, or equivalent caching framework may be introduced for the Customer App surface without explicit architecture review.** The Customer App requires hand-controlled service worker and manifest generation — any plugin that auto-configures runtime caching violates the no-caching philosophy. The existing `next-pwa` configuration in `next.config.js` applies to the owner dashboard only and must be scoped away from customer tenant origins (see `customer-app_impl.md`).

### 8.1 Menu Update Behavior (Frozen Policy)

**The customer's installed Customer App must reflect menu changes — including availability changes (sold out / unavailable) — without listeners, polling, or new Firebase cost.** This policy is frozen and must not be revisited without explicit architecture review.

#### Policy Rules

| Rule                                                     | Status    |
| -------------------------------------------------------- | --------- |
| Launch online → always fetch latest menu                 | Mandatory |
| Launch offline → branded offline page (never stale menu) | Mandatory |
| Mid-browse session → menu does not mutate                | Mandatory |
| Tab returns visible after ≥60s hidden → refresh          | Mandatory |
| Network reconnects (offline → online) → refresh          | Mandatory |
| Global refresh cooldown ≥60s (debounce)                  | Mandatory |
| Firestore real-time listeners in Customer App            | Rejected  |
| Periodic background polling                              | Rejected  |
| Version-check endpoint / version collection              | Rejected  |
| Update notification banner                               | Rejected  |
| Long-lived content cache on customer origins             | Rejected  |
| Cached stale menu as offline fallback                    | Rejected  |

#### How Freshness Is Achieved (Zero New Firebase Cost)

Three existing infrastructure layers combined:

1. **Server-side edge cache** — `src/app/client/[[...slug]]/page.tsx` wraps all menu fetches in `unstable_cache` with `{ revalidate: 60, tags: ['menu-store-{storeId}'] }`. Unchanged menus serve infinitely from Vercel Edge Data Cache with zero Firestore reads.
2. **Instant invalidation on owner save** — every `updateProject()` call invokes `revalidateMenuCache(storeId)` (`src/lib/actions/revalidateMenuCache.ts`), which invalidates the per-store tag. This includes availability toggles (sold out / unavailable).
3. **Client-side visibility refresh** — `useMenuFreshness` hook (`src/hooks/useMenuFreshness.ts`) calls `router.refresh()` when the tab returns after ≥60s hidden, or when the network reconnects. `router.refresh()` hits the edge cache first (free if tag valid) and only runs fresh SSR if the owner actually changed data. No new endpoint, no new collection, no background work.

#### Availability / Sold-Out Flow (Critical Path)

```
Owner marks item unavailable
  → updateProject() writes to Firestore (1 write, existing cost)
  → revalidateMenuCache(storeId) invalidates edge cache tag (free)
  → Next request for that store → fresh SSR → availability = false

Customer with Customer App open, menu already rendered
  → Switches tabs / locks phone (app becomes hidden)
  → Returns to Customer App after ≥60s
  → useMenuFreshness fires router.refresh()
  → Edge cache returns fresh HTML (tag was invalidated)
  → Item now shows sold-out without full page reload
  → Scroll position, language selection, open modals preserved
```

**Maximum visible staleness for an actively returning customer: ≈0 seconds after refocus.**

#### Cost at Scale (Frozen Commitment)

| Scenario                                        | Incremental Firestore Reads                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Customer opens app, menu unchanged              | 0 (edge cache hit)                                                                       |
| Customer returns to tab, menu unchanged         | 0 (edge cache hit)                                                                       |
| Owner changes menu, 1000 customers each refresh | ≤ standard SSR reads × N cache misses (same as normal traffic pattern — not incremental) |
| Customer never returns                          | 0                                                                                        |

Zero new collections. Zero new endpoints. Zero background polling. Zero listeners.

#### Hardening Rules (Frozen)

Four explicit guardrails that must not drift over time:

##### H1. Offline = offline page only. Never cached menu fallback.

When the customer is offline, the service worker serves `/offline` — a branded screen that says "You're offline." It NEVER serves a stale cached menu. A trustworthy offline screen beats a plausible-looking stale menu every time, because a cached menu could show items that are now sold out, have new prices, or no longer exist.

**Do not drift into:** "Maybe we should cache the last menu so something shows offline." The answer is permanently no.

##### H2. Refresh cooldown (debounce).

`useMenuFreshness` enforces a global cooldown of 60 seconds between any two `router.refresh()` calls, regardless of what triggered them (visibility return or network reconnect). This prevents refresh loops when a customer rapidly app-switches (e.g. WhatsApp ↔ menu ↔ WhatsApp every few seconds) or toggles airplane mode.

- Cooldown: 60s (configurable via `minRefreshIntervalMs`)
- Hidden threshold before visibility refresh fires: 60s (configurable via `minHiddenMs`)
- These are independent — a refresh may be suppressed by the cooldown even if the hidden-threshold was met.

##### H3. Refresh scope is "whole menu", not "only availability".

`router.refresh()` re-runs the server component and returns fresh HTML for the entire menu — availability flags, prices, descriptions, categories, order. This is deliberate.

**Why not narrow to "only availability"?** A narrower refresh would require a separate lightweight endpoint returning just availability flags, plus client-side merging logic. That is exactly the version-endpoint-style infrastructure rejected in this policy. We use `router.refresh()` because it piggybacks on the existing edge cache — narrowing scope would require net-new infra and net-new cost.

**Consequence:** If the owner changes a price mid-day and a customer returns to the tab after being away 5 minutes, the customer sees the new price. This is accepted: if the owner published a change, customers who come back should see it. Session stability is protected during active browsing (no refresh fires while the tab is visible) — only return-from-hidden or network reconnect trigger a refresh.

##### H4. Visibility refresh is a safeguard, not pseudo-real-time sync.

The visibility-refresh mechanism must remain narrowly defined as a **return-from-hidden freshness safeguard**. It must not evolve into periodic background syncing, foreground polling, or any listener-like behavior. Any change that moves it toward real-time updates requires architecture review.

**Protected boundary:** The hook fires only on (a) `visibilitychange` → visible after ≥60s hidden, and (b) network reconnect while visible. No timers. No intervals. No background sync API. No push triggers.

#### QA Checklist (Mandatory Before Shipping)

Four tests that must be executed and pass before this feature is shipped. Do not assume — verify.

##### QA-1. `router.refresh()` state preservation

With the customer app open on a tenant origin, verify the following state survives a `router.refresh()` call (trigger by toggling tab hidden/visible for 65+ seconds):

- [ ] Selected language (`activeLanguage` state)
- [ ] Scroll position (window scroll + any internal scroll containers)
- [ ] Expanded/collapsed category state
- [ ] Open item detail modal (if any)
- [ ] Active page (`activePage` state — HOME vs other)
- [ ] Selected device type view (`activeDeviceType`)
- [ ] Any cart / selection state (if present)

If any of these reset on refresh, the hook must be revised (lift state out of components that re-render on SSR, or move to Redux).

##### QA-2. SW scope migration — owner origin

- [ ] Open `/signin` while logged out on the platform origin
- [ ] Verify the page links `/manifest.json`
- [ ] Add to home screen / install from the sign-in page
- [ ] Verify the installed app identity is the MenuList owner app, not a browser-only shortcut
- [ ] Launch the installed app while logged out and verify it opens the sign-in gate, then reaches the Today tab after login
- [ ] Install owner dashboard as PWA on platform origin (e.g. `app.menulist.ai`)
- [ ] Verify `navigator.serviceWorker.getRegistrations()` returns exactly one registration with `scriptURL` ending in `/sw.js`
- [ ] Verify it is NOT `sw-customer.js`

##### QA-3. SW scope migration — customer origin

- [ ] Open a customer tenant origin (e.g. `demo.menulist.ai`) that previously had `sw.js` registered (simulate by manually registering before the fix)
- [ ] Reload the page after the fix is deployed
- [ ] Verify `navigator.serviceWorker.getRegistrations()` returns exactly one registration with `scriptURL` ending in `/sw-customer.js`
- [ ] Verify the old `sw.js` registration was unregistered (migration path in `ServiceWorkerRegister.tsx`)
- [ ] Verify no menu content is stored in Cache Storage (check DevTools → Application → Cache Storage — only `customer-app-offline-v1` should exist)

##### QA-4. Cross-origin SW isolation

- [ ] Install Customer App on `demo.menulist.ai`
- [ ] Navigate to `app.menulist.ai` (owner dashboard) in the same browser
- [ ] Verify the owner dashboard registers `sw.js` (not `sw-customer.js`) on its own origin
- [ ] Verify the customer tenant's `sw-customer.js` is still registered on its origin (not overwritten)
- [ ] Verify no menu data from the customer origin ever lands in the owner origin's caches (they are separate origins, so this should be impossible by browser design — but verify anyway)

### 9. Surface Analytics (Day-One, Mandatory)

**Principle:** Customer App is a **surface**. Every surface in MenuList has lifecycle analytics. This reverses the earlier "no analytics day one" policy, which was appropriate only while the classification was undecided.

**What we track: surface lifecycle, not marketing vanity metrics.**

#### Layer 1 — Surface Availability (Configuration, Not Events)

Read directly from `stores.pwaSettings.*` — no event writes needed.

| Signal                    | Source                                        |
| ------------------------- | --------------------------------------------- |
| Customer App enabled      | `pwaSettings.enableInstallableApp`            |
| Install promotion enabled | `pwaSettings.promoteInstallation`             |
| Install-ready status      | Eligibility gate result (active + published)  |
| Icon valid                | `branding.pwaIconMode` + icon existence check |

#### Layer 2 — Install Funnel (Events)

| Event Name                      | When Fired                                   | Mandatory            |
| ------------------------------- | -------------------------------------------- | -------------------- |
| `CUSTOMER_APP_PROMPT_SHOWN`     | Install prompt rendered to customer          | Yes                  |
| `CUSTOMER_APP_PROMPT_DISMISSED` | Customer taps "Maybe Later"                  | Yes                  |
| `CUSTOMER_APP_INSTALL_STARTED`  | Customer taps install CTA (before OS dialog) | Yes                  |
| `CUSTOMER_APP_INSTALLED`        | Browser fires `appinstalled` event           | Yes (most important) |

#### Layer 3 — Usage / Surface Consumption (Events)

| Event Name            | When Fired                                | Mandatory |
| --------------------- | ----------------------------------------- | --------- |
| `CUSTOMER_APP_OPENED` | Page load with `display-mode: standalone` | Yes       |

#### Layer 4 — Shortcut Utility (Events)

| Event Name                         | When Fired                               | Priority |
| ---------------------------------- | ---------------------------------------- | -------- |
| `CUSTOMER_APP_SHORTCUT_MENU`       | App opened via "View Menu" shortcut      | P1       |
| `CUSTOMER_APP_SHORTCUT_CALL`       | App opened via "Call Store" shortcut     | P1       |
| `CUSTOMER_APP_SHORTCUT_DIRECTIONS` | App opened via "Get Directions" shortcut | P1       |

#### Owner Dashboard View

A single **Customer App** card (or tab under Surface Analytics) shows:

| Metric              | Description                                                       |
| ------------------- | ----------------------------------------------------------------- |
| Installed Customers | Cumulative unique installs (estimated from `appinstalled` events) |
| App Opens (30 days) | Standalone-mode opens in last 30 days                             |
| Install Conversion  | `CUSTOMER_APP_INSTALLED / CUSTOMER_APP_PROMPT_SHOWN`              |
| Top Shortcut Used   | Most-used shortcut over 30 days                                   |

Nothing else. No heatmaps, no session duration, no per-user profiling.

#### Unique Installs vs Raw Install Events (Critical)

**Track separately:**

| Metric                  | Meaning                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `totalInstalled`        | Raw `appinstalled` event count (includes reinstalls)                                   |
| `uniqueInstallSessions` | Distinct `sessionId` count on install events — best available proxy for unique devices |

This prevents reinstalls from inflating the "Installed Customers" metric. The existing analytics session system (`src/lib/analytics/session.ts`) provides session IDs.

#### Reuse Existing Infrastructure (Not a New Collection)

Customer App analytics uses the **existing `analytics` collection** and **existing aggregation Cloud Function** (`functions/src/aggregateCustomerAnalytics.ts`). No new collection. No new function. Follows the **OBP precedent** which uses `projectId='obp'`.

| Resource                 | Customer App Usage                                        |
| ------------------------ | --------------------------------------------------------- |
| Collection               | `analytics` (existing)                                    |
| Daily doc ID             | `{tId}_{sId}_customerApp_daily_{YYYY-MM-DD}`              |
| Summary doc ID           | `{tId}_{sId}_customerApp_overall_summary`                 |
| Reserved project segment | `customerApp` (like `obp`)                                |
| Event system             | `TrackingEvent` enum in `src/lib/analytics/unified.ts`    |
| Aggregation              | Existing nightly Cloud Function picks it up automatically |
| 90-day daily doc TTL     | Inherited                                                 |
| GA4 forwarding           | Inherited (all events dual-tracked)                       |

---

## Requirements

### Functional Requirements

| ID   | Requirement                                              | Priority | Notes                                                                      |
| ---- | -------------------------------------------------------- | -------- | -------------------------------------------------------------------------- |
| FR1  | Dynamic manifest per store                               | P0       | Route: `{subdomain}.menulist.ai/manifest.webmanifest` (tenant origin root) |
| FR2  | Icon generation endpoint                                 | P0       | `/api/app-icons/{storeId}/{size}`                                          |
| FR3  | Apple touch icon support                                 | P0       | `/icons/apple-touch-icon-180x180.png`                                      |
| FR4  | Install prompt on 3rd visit                              | P0       | 30-day dismissal suppression                                               |
| FR5  | Minimal service worker                                   | P0       | No caching logic                                                           |
| FR6  | App shortcuts in manifest                                | P1       | Dynamic per store                                                          |
| FR7  | pwaShortName support                                     | P1       | Separate from store display name                                           |
| FR8  | Icon override upload                                     | P1       | Square, PNG, 1024x1024                                                     |
| FR9  | Cross-platform install QA                                | P0       | Chrome, Samsung, Safari                                                    |
| FR10 | Tenant-safe asset isolation                              | P0       | Correct manifest/icons per store                                           |
| FR11 | Surface analytics (install funnel, app opens, shortcuts) | P0       | 8 events, `projectId='customerApp'`, existing `analytics` collection       |
| FR12 | Owner analytics card — Customer App                      | P0       | Installed Customers, App Opens (30d), Install Conversion, Top Shortcut     |

### Non-Functional Requirements

| ID   | Requirement                    | Target                                                   |
| ---- | ------------------------------ | -------------------------------------------------------- |
| NFR1 | Manifest generation latency    | <100ms                                                   |
| NFR2 | Icon endpoint latency (cached) | <50ms                                                    |
| NFR3 | Install prompt load impact     | Zero blocking                                            |
| NFR4 | Mobile responsiveness          | 100% (inherited from menu)                               |
| NFR5 | App launch time                | <2 seconds cold start                                    |
| NFR6 | Multi-tenant isolation         | Strict — no cross-store leaks                            |
| NFR7 | Analytics event write latency  | Non-blocking (fire-and-forget via existing `trackEvent`) |

### Firebase Cost Impact

| Operation                                           | Per Install Trigger                                         | Monthly (1000 installs)                       |
| --------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------- |
| Manifest read                                       | 0 (generated, not cached)                                   | 0                                             |
| Icon serve                                          | 0 (static/edge cached)                                      | 0                                             |
| Analytics event writes (funnel + opens + shortcuts) | 1 write per event (batched by existing debounce/rate-limit) | ~5-10k writes — reuses `analytics` collection |
| Daily aggregation                                   | 1 write per store per day (existing Cloud Function)         | 30 writes/store/month                         |
| **Total net-new**                                   |                                                             | **~$0.05/month per 1000 installs**            |

Detailed breakdown in `customer-app_firebase.md`.

---

## Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CUSTOMER VISITS STORE                        │
│                                                                  │
│   joespizza.menulist.ai → 3rd visit detected                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INSTALL PROMPT CHECK                       │
│                                                                  │
│   1. Check if already installed (appinstalled event)            │
│   2. Check if dismissed recently (30-day window)                │
│   3. Check if owner has promotion enabled                       │
│   4. Check if 3rd+ visit                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PROMPT RENDERED                            │
│                                                                  │
│   Chrome: beforeinstallprompt captured → native UI             │
│   Safari: Custom "Share → Add to Home Screen" instructions       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CUSTOMER INSTALLS                            │
│                                                                  │
│   Manifest fetched: /joes/manifest.webmanifest                   │
│   Icons fetched: /api/app-icons/{id}/192, /512                 │
│   App appears on home screen with store branding                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     APP LAUNCHED                                │
│                                                                  │
│   Opens in standalone mode (no browser chrome)                   │
│   Start URL loads default menu                                  │
│   Shortcuts available on long-press (Android)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Service Worker Philosophy

**What It Does:**

- Installs immediately (`skipWaiting`)
- Claims clients on activate
- NO caching logic
- NO precache
- NO runtime cache
- Exists only for install reliability on Android

**What It Does NOT Do:**

- Cache menu content
- Cache API responses
- Background sync
- Push notifications

### Icon Generation Pipeline

```
Store Logo / Custom Upload
        ↓
[Icon Generation Service]
        ↓
├─→ Remove whitespace
├─→ Center content
├─→ Add 15% safe padding
├─→ Generate 192x192 PNG
├─→ Generate 512x512 PNG
├─→ Generate 180x180 PNG (Apple)
├─→ Generate maskable variants
        ↓
Store in Firebase Storage or CDN
        ↓
Serve via /api/app-icons/{storeId}/{size}
```

---

## Risks & Mitigations

| Risk                                                        | Impact   | Probability | Mitigation                                                                                    |
| ----------------------------------------------------------- | -------- | ----------- | --------------------------------------------------------------------------------------------- |
| Manifest caching prevents updates                           | High     | Medium      | Cache-Control: max-age=300 (5 min)                                                            |
| Icon updates don't reflect immediately                      | Medium   | Medium      | Document expected behavior; recommend reinstall                                               |
| Cross-tenant asset leak                                     | Critical | Low         | Strict path validation; tenant isolation tests                                                |
| iOS install behavior inconsistent                           | Medium   | High        | Test matrix; fallback instructions                                                            |
| Owner expects full app customization                        | Medium   | Medium      | Clear positioning: identity only, behavior fixed                                              |
| Long app names truncate poorly                              | Low      | High        | pwaShortName field; auto-truncate fallback                                                    |
| Service worker causes stale deploys                         | Medium   | Low         | Minimal SW; no precache; skipWaiting                                                          |
| Existing `next-pwa` runtime cache intercepts tenant origins | High     | High        | Scope `next-pwa` away from tenant origins; hand-rolled minimal SW for Customer App (see impl) |

---

## Open Questions

| #   | Question                                              | Status                                                                                                                        |
| --- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | Should we show install count to owners?               | **Reversed — YES.** Customer App is a surface. Surfaces get lifecycle analytics. See Feature 9.                               |
| 2   | Should we track app opens separately from menu views? | **Reversed — YES.** `CUSTOMER_APP_OPENED` fires only in `display-mode: standalone`, distinct from `MENU_VIEW`. See Feature 9. |
| 3   | What happens if merchant changes logo after install?  | Frozen — OS keeps old icon; new installs get new icon. Documented in helpdoc.                                                 |
| 4   | What happens when a merchant leaves the platform?     | Frozen — installed app shows "This business is currently unavailable." See Feature 7.                                         |
| 5   | Do we track customer-level identity?                  | Frozen — NO. Session-level only. Privacy-protected.                                                                           |

---

## Related Documents

| Document                                 | Purpose                            |
| ---------------------------------------- | ---------------------------------- |
| `customer-app_impl.md`                   | Technical implementation blueprint |
| `customer-app_marketing.md`              | Sales/marketing collateral         |
| `customer-app_website.md`                | Public website content             |
| `customer-app_helpdoc.md`                | Customer help documentation        |
| `customer-app_firebase.md`               | Firebase cost tracking             |
| `customer-app_mobile-support.md`         | Mobile assessment                  |
| `client-menu/_spec.md`                   | Base customer-facing menu spec     |
| `constitution/02-language-governance.md` | Language rules for all content     |

---

## Strategic Positioning

### As a MenuList Surface

The Customer App is one of six live customer-facing surfaces:

| Surface                | Purpose                       |
| ---------------------- | ----------------------------- |
| Digital Menu           | Live menu access via browser  |
| Public Link            | Shareable link for social, WhatsApp, and packaging |
| PDF Menu               | Printable/sharable version    |
| Digital Screens        | In-store display              |
| Official Business Page | Public web presence           |
| **Customer App**       | **Repeat customer retention** |

### Positioning Statement

> "Every business gets its own customer app — automatically."

This is **not** "PWA support" or "installable web app." It is a **branded customer retention surface** that happens to use PWA technology.

### Competitive Moat

When a restaurant's customers have the restaurant's app on their home screens, switching menu providers requires:

1. Re-educating customers about a new app
2. Replacing QR codes, links, and references

This creates natural lock-in without contracts.

---

## Approval

| Role             | Name        | Date       |
| ---------------- | ----------- | ---------- |
| Product Owner    | [Signature] | 2026-04-18 |
| Engineering Lead | [Signature] | 2026-04-18 |
| CEO              | [Signature] | 2026-04-18 |

---

_Document Status: Source-gated runtime evidence; not standalone launch certification_
_Last Updated: July 2, 2026_
