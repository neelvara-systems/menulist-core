# Customer App — Implementation Blueprint

**Feature Name:** Customer App (Installable Customer-Facing Menu)  
**Document Type:** Technical Implementation Plan  
**Status:** 📋 Ready for Implementation  
**Last Updated:** April 18, 2026  
**Audience:** Engineers, Technical Leads

---

## Implementation Overview

This document provides the complete technical blueprint for implementing the Customer App feature — a per-store installable PWA that customers can add to their home screens.

**Critical Distinction:** This is the **customer-facing menu PWA** (for restaurant customers), NOT the owner dashboard mobile PWA.

---

## Analysis: ChatGPT vs. Codebase

### What ChatGPT Got Right

| Suggestion                                  | Assessment | Decision                                                                                     |
| ------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| Dynamic manifest per store                  | ✅ Correct | Implement                                                                                    |
| App icon generation pipeline                | ✅ Correct | Implement                                                                                    |
| Minimal service worker (no caching)         | ✅ Correct | Implement                                                                                    |
| 3rd visit install trigger                   | ✅ Correct | Implement (with `localStorage`)                                                              |
| 30-day dismissal suppression                | ✅ Correct | Implement                                                                                    |
| App shortcuts (View Menu, Call, Directions) | ✅ Correct | Implement (no custom icons v1)                                                               |
| pwaShortName field                          | ✅ Correct | Implement                                                                                    |
| Treat as "Customer App Surface"             | ✅ Correct | Align with surface architecture                                                              |
| No offline caching                          | ✅ Correct | Enforce strictly                                                                             |
| Position as "Your own customer app"         | ✅ Correct | Marketing alignment                                                                          |
| Subdomain-based identity                    | ✅ Correct | Codebase already uses subdomains (`src/middleware.ts`); serve manifest at tenant origin root |

### Disagreements / Adjustments

| ChatGPT Suggestion                            | Disagreement                                           | Resolution                                                                                                           |
| --------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| AI icon generation                            | Overkill, adds cost                                    | Use deterministic icon generation only                                                                               |
| `next-pwa` plugin for Customer App            | Auto-adds runtime caching — violates no-caching policy | Hand-roll minimal SW. Keep existing `next-pwa` scoped to owner dashboard only. See "next-pwa Scoping" section below. |
| Manifest screenshots                          | Adds asset pipeline complexity                         | Out of scope — not deferred, rejected for day one                                                                    |
| Theme color customization                     | Risk of brand chaos                                    | System-controlled only, no merchant setting                                                                          |
| "Reorder" shortcut                            | Implies ordering system                                | Use "View Menu" only — no behavioral promises                                                                        |
| `window-controls-overlay` in display_override | Desktop-only, adds variability                         | Use `["standalone", "minimal-ui"]` only                                                                              |
| Install analytics collection                  | Scope creep for day one                                | Not implemented day one. Basic install/dismiss events MAY be counted locally only. No Firestore writes.              |

---

## Routing Model (Critical — Subdomain-Based)

**Canonical truth:** The codebase uses **subdomain-per-tenant** routing. Each store is served from `{subdomain}.menulist.ai` (or a verified custom domain like `joespizza.com`). Middleware at `src/middleware.ts` rewrites the incoming host to the internal `/client/*` route using `NextResponse.rewrite()`. See also `src/lib/multiTenant/domainResolver.ts` and `src/lib/multiTenant/getTenantFromHeaders.ts`.

**Implication for Customer App:**

- Manifest is served at the **tenant origin root**: `https://{subdomain}.menulist.ai/manifest.webmanifest`
- `scope` and `start_url` are the tenant origin, NOT a path under `menulist.ai`
- There is no `/{slug}/manifest.webmanifest` path-based route
- Service worker scope is the full tenant origin
- Apple touch icon is served at tenant origin root: `/apple-touch-icon.png`

**Why this matters:** A path-based manifest would put all stores under one origin scope and break install identity. PWA install criteria and scope enforcement are origin-bound by the browser.

### Implementation Path

The manifest route is implemented as a Next.js route file that runs at the tenant origin (because middleware has already resolved the tenant before the route handler runs):

```
src/app/manifest.webmanifest/route.ts
  → reads tenant from headers (x-tenant-subdomain / x-tenant-custom-domain)
  → generates store-specific manifest
  → returns 404 if tenant is not eligible (inactive, unpublished)
```

Alternatively, Next.js `app/manifest.ts` convention may be used if it supports dynamic per-request generation. Verify at implementation time.

---

## next-pwa Scoping (Critical Conflict)

**Current state (`next.config.js:145-231`):** `next-pwa` is installed and wraps the entire app. It registers a Workbox service worker with runtime caching for:

- `/_client/*` (client menu pages) — `NetworkFirst`, 24h cache
- `/dashboard`, `/billing`, `/projects`, etc. (owner surfaces)
- Firestore API, Firebase Storage images, fonts, static assets

**Conflict:** The Customer App requires **no caching** for the customer-facing menu. The existing `/_client/*` runtime cache directly caches what the Customer App surfaces. This must be resolved before shipping.

**Resolution options (pick one at implementation time):**

| Option        | Approach                                                                                                                                                                                      | Tradeoff                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| A (Preferred) | Remove customer-facing URL patterns from `next-pwa` `runtimeCaching`. Keep `next-pwa` for owner dashboard only. Ship a hand-rolled `sw-customer-app.js` for Customer App install reliability. | Two SWs; requires scope discipline. Cleanest alignment with policy. |
| B             | Replace `next-pwa` entirely with hand-rolled SW for both surfaces.                                                                                                                            | Larger refactor; affects owner dashboard offline behavior.          |
| C             | Keep `next-pwa` as-is and rely on its generated SW.                                                                                                                                           | **Rejected** — violates no-caching policy for Customer App.         |

**Governance rule (frozen):** No `next-pwa` or Workbox plugin may register runtime caching against tenant-facing URL patterns without architecture review. Enforce via code review.

---

## Database Schema

### Stores Collection (Existing — Add Fields)

```typescript
// Add to stores document schema
interface StoreBranding {
  logoUrl?: string; // Existing — business logo
  pwaIconOverrideUrl?: string; // NEW — optional custom app icon
  pwaIconMode: "generated" | "override"; // NEW — which icon to use
}

interface StorePWASettings {
  enableInstallableApp: boolean; // NEW — default: true
  promoteInstallation: boolean; // NEW — default: true
  pwaShortName?: string; // NEW — optional short name
}

// Path: stores/{storeId}
// Fields to add:
// - branding.pwaIconOverrideUrl (string, optional)
// - branding.pwaIconMode (enum: "generated" | "override", default: "generated")
// - pwaSettings.enableInstallableApp (boolean, default: true)
// - pwaSettings.promoteInstallation (boolean, default: true)
// - pwaSettings.pwaShortName (string, optional, max 12 chars)
```

### Customer App Analytics (Day-One, Uses Existing Analytics Collection)

**Decision:** Customer App is a surface; surfaces get lifecycle analytics. Reuse the existing `analytics` collection and `trackEvent()` system rather than creating a new collection. This follows the **OBP precedent** (`projectId='obp'`).

#### Storage Model

| Aspect                   | Value                                                                                                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collection               | `analytics` (existing, defined in `DB_COLLECTIONS.ANALYTICS`)                                                                                                                                                                                       |
| Reserved project segment | `customerApp`                                                                                                                                                                                                                                       |
| Daily doc ID             | `{tId}_{sId}_customerApp_daily_{YYYY-MM-DD}`                                                                                                                                                                                                        |
| Summary doc ID           | `{tId}_{sId}_customerApp_overall_summary`                                                                                                                                                                                                           |
| Weekly rollup            | `{tId}_{sId}_customerApp_weekly_{YYYY-Www}`                                                                                                                                                                                                         |
| Monthly rollup           | `{tId}_{sId}_customerApp_monthly_{YYYY-MM}`                                                                                                                                                                                                         |
| Aggregation — discovery  | `aggregateCustomerAnalytics.ts` regex `/^(\d+)_(\d+)_([^_]+)_daily_(\d{4}-\d{2}-\d{2})$/` matches `customerApp` daily docs automatically — **no change needed for doc discovery**                                                                   |
| Aggregation — field gaps | `DailyMetrics` interface and `aggregateDailyDocs()` in `aggregateCustomerAnalytics.ts` only know about menu fields. **Customer App fields must be added** (see "Cloud Function Changes Required" section below) or weekly/monthly rollups are empty |
| Schedule                 | Nightly 3:00 AM UTC (existing) — Customer App docs processed in same run as menu analytics docs                                                                                                                                                     |
| 90-day TTL               | Inherited from existing Cloud Function — Customer App daily docs auto-deleted after 90 days                                                                                                                                                         |

#### New TrackingEvent Enum Values

Add to `src/lib/analytics/unified.ts`:

```typescript
export enum TrackingEvent {
  // ... existing events ...

  // Customer App (installable PWA surface) events
  CUSTOMER_APP_PROMPT_SHOWN = "customer_app_prompt_shown",
  CUSTOMER_APP_PROMPT_DISMISSED = "customer_app_prompt_dismissed",
  CUSTOMER_APP_INSTALL_STARTED = "customer_app_install_started",
  CUSTOMER_APP_INSTALLED = "customer_app_installed",
  CUSTOMER_APP_OPENED = "customer_app_opened",
  CUSTOMER_APP_SHORTCUT_MENU = "customer_app_shortcut_menu",
  CUSTOMER_APP_SHORTCUT_CALL = "customer_app_shortcut_call",
  CUSTOMER_APP_SHORTCUT_DIRECTIONS = "customer_app_shortcut_directions",
}
```

#### Daily Document Metric Fields

Add to the Customer App daily doc (reuses existing aggregation patterns):

> **Additive-only rule (frozen):** Every field in this interface MUST support safe summation across days. Scalar fields use `FieldValue.increment()`. Nested map fields (`shortcutClicks`, `installsByDevice`, `installsByLocation`) use `mergeMapField()` — keys are summed, never replaced. No field may be overwritten on aggregation. This rule ensures weekly/monthly rollups are always equal to the sum of their constituent daily docs.

```typescript
interface CustomerAppDailyMetrics {
  date: string; // YYYY-MM-DD

  // Funnel counters (raw event counts — additive, FieldValue.increment)
  totalPromptShown: number;
  totalPromptDismissed: number;
  totalInstallStarted: number;
  totalInstalled: number;

  // Usage (additive, FieldValue.increment)
  totalAppOpens: number; // standalone-mode opens

  // Shortcut usage (nested map — additive via mergeMapField, keys summed not replaced)
  shortcutClicks: {
    menu: number;
    call: number;
    directions: number;
  };

  // Unique-install proxy (distinct sessionIds on install events — additive)
  uniqueInstallSessions: number;

  // Device/location breakdowns (nested maps — additive via mergeMapField)
  viewsByDevice?: Record<string, number>; // app opens by device
  viewsByLocation?: Record<string, number>;
  installsByDevice?: Record<string, number>; // installs by device (additive map)
  installsByLocation?: Record<string, number>; // installs by location (additive map)
  hourlyAppOpens?: Record<string, number>;

  // Metadata (set by existing Firebase increment pattern)
  totalSessions: number;
}
```

#### Switch Cases to Add in `trackFirebaseEvent`

Add these cases to the switch statement in `src/lib/analytics/unified.ts`:

```typescript
case TrackingEvent.CUSTOMER_APP_PROMPT_SHOWN:
  updateData.totalPromptShown = 1;
  updateData[`hourlyPromptShown.${hour}`] = 1;
  break;

case TrackingEvent.CUSTOMER_APP_PROMPT_DISMISSED:
  updateData.totalPromptDismissed = 1;
  break;

case TrackingEvent.CUSTOMER_APP_INSTALL_STARTED:
  updateData.totalInstallStarted = 1;
  break;

case TrackingEvent.CUSTOMER_APP_INSTALLED:
  updateData.totalInstalled = 1;
  // Unique-install proxy: increment only if this sessionId hasn't installed yet
  // (client-side dedupe via localStorage before firing the event)
  updateData.uniqueInstallSessions = 1;
  updateData[`installsByDevice.${deviceKey}`] = 1;
  updateData[`installsByLocation.${locationKey}`] = 1;
  break;

case TrackingEvent.CUSTOMER_APP_OPENED:
  updateData.totalAppOpens = 1;
  updateData[`viewsByDevice.${deviceKey}`] = 1;
  updateData[`viewsByLocation.${locationKey}`] = 1;
  updateData[`hourlyAppOpens.${hour}`] = 1;
  updateData.totalSessions = 1;
  break;

case TrackingEvent.CUSTOMER_APP_SHORTCUT_MENU:
  updateData['shortcutClicks.menu'] = 1;
  break;

case TrackingEvent.CUSTOMER_APP_SHORTCUT_CALL:
  updateData['shortcutClicks.call'] = 1;
  break;

case TrackingEvent.CUSTOMER_APP_SHORTCUT_DIRECTIONS:
  updateData['shortcutClicks.directions'] = 1;
  break;
```

Then call:

```typescript
await trackAnalyticsEvent(
  updateData,
  data.tenantId,
  data.storeId,
  "customerApp",
);
```

#### Client-Side Trigger Points

| Event                           | Where                     | Trigger Condition                                                                                        |
| ------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `CUSTOMER_APP_PROMPT_SHOWN`     | `InstallPrompt.tsx`       | `useEffect` when prompt becomes visible                                                                  |
| `CUSTOMER_APP_PROMPT_DISMISSED` | `InstallPrompt.tsx`       | Dismiss button click                                                                                     |
| `CUSTOMER_APP_INSTALL_STARTED`  | `InstallPrompt.tsx`       | Install CTA click (before `prompt()` call on Android, before instructions modal on iOS)                  |
| `CUSTOMER_APP_INSTALLED`        | Customer menu root layout | `window.addEventListener('appinstalled', ...)`                                                           |
| `CUSTOMER_APP_OPENED`           | Customer menu root layout | On mount, if `window.matchMedia('(display-mode: standalone)').matches`                                   |
| `CUSTOMER_APP_SHORTCUT_*`       | Customer menu root layout | On mount, if URL contains `?source=shortcut-{menu/call/directions}` (shortcuts include this query param) |

#### Unique Install Deduplication (Client-Side)

To prevent re-installs inflating `uniqueInstallSessions`:

```typescript
// src/lib/pwa/installTracker.ts
const INSTALL_FIRED_KEY = "menuList_installEventFired";

export function fireInstalledEventOnce(storeId: number): void {
  const key = `${INSTALL_FIRED_KEY}_${storeId}`;
  if (localStorage.getItem(key)) return;

  trackEvent(TrackingEvent.CUSTOMER_APP_INSTALLED, {
    storeId: String(storeId),
    sessionId: getSessionId(),
  });

  localStorage.setItem(key, String(Date.now()));
}
```

This caps one install event per device per store. Reinstalls on the same device do not double-count.

#### Install Deduplication — All Reinstall Scenarios (Frozen Definition)

This must be explicitly defined so the install metric never becomes garbage:

| Scenario                                                     | Behavior                                                                                            | Reason                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| First install, fresh device                                  | `CUSTOMER_APP_INSTALLED` fires once. `localStorage` key set.                                        | Normal path                                                   |
| App uninstalled, same browser data intact                    | `localStorage` key still present → event **suppressed**. `totalInstalled` does not increment again. | Key survives uninstall if browser data intact                 |
| App uninstalled + browser data cleared (or private browsing) | `localStorage` key gone → event fires again. `totalInstalled` increments.                           | Unavoidable without server-side identity — accepted trade-off |
| Browser update / OS upgrade (data retained)                  | `localStorage` key intact → event **suppressed**.                                                   | No double-count                                               |
| Different browser on same device                             | New browser = new `localStorage` → event fires. `totalInstalled` increments.                        | Acceptable — different surface                                |
| Different device, same owner                                 | Each device fires independently.                                                                    | Expected — device-scoped metric                               |

**Owner-facing label:** "Installed Customers" is understood as **device-installs**, not unique people. This is documented in `customer-app_helpdoc.md` under Analytics.

**`uniqueInstallSessions` field** counts only installs that passed the `fireInstalledEventOnce` guard — i.e., installs where `localStorage` key was absent at fire time. This is the number owners see.

**Accepted imprecision:** Browser-data-clear reinstalls are counted twice. This is the same trade-off used by every major PWA analytics system. Server-side dedup would require user identity, which is prohibited by the privacy rule.

#### Privacy Rule (Frozen)

- Session-level IDs only (existing `getSessionId()`)
- No user identity, no device fingerprinting, no heatmaps
- Respects existing `storeDetails.analytics.trackMenuViews` flag \u2014 if owner disables analytics, Customer App events are suppressed too
- GA4 receives all events automatically via existing dual-tracking

#### Owner Dashboard Component

New component under the existing dashboard:

```
src/components/templates/main-app/dashboard/AnalyticsDashboard/
  \u2514\u2500\u2500 CustomerAppMetrics.tsx    # NEW \u2014 Customer App card
```

Uses existing `useAnalyticsData` hook with `projectId='customerApp'`:

```typescript
const { data, loading, error } = useAnalyticsData(dateRange, "customerApp");

// Derived metrics
const installedCustomers = data?.summary?.lifetimeUniqueInstalls || 0;
const appOpens30d = data?.summary?.last30Days?.totalAppOpens || 0;
const conversion =
  data?.summary?.lifetimeTotalPromptShown > 0
    ? (data.summary.lifetimeTotalInstalled /
        data.summary.lifetimeTotalPromptShown) *
      100
    : 0;
const topShortcut = pickTopShortcut(data?.summary?.shortcutClicks);
```

Card is added to `AnalyticsDashboard/index.tsx` alongside existing `OverallMetrics`.

#### Cloud Function Changes Required (`functions/src/aggregateCustomerAnalytics.ts`)

The nightly scheduler discovers `customerApp` docs automatically (regex matches). However, the **`DailyMetrics` interface**, **`aggregateDailyDocs()`**, and **`updateSummaryDocument()`** only know about menu fields. Without these additions, Customer App fields are silently dropped from weekly/monthly rollups and the lifetime summary document.

**Change 1 — Extend `DailyMetrics` interface** (line ~52):

```typescript
interface DailyMetrics {
  // ... existing menu fields ...

  // Customer App surface fields
  totalPromptShown?: number;
  totalPromptDismissed?: number;
  totalInstallStarted?: number;
  totalInstalled?: number;
  uniqueInstallSessions?: number;
  totalAppOpens?: number;
  shortcutClicks?: Record<string, number>; // { menu, call, directions }
  installsByDevice?: Record<string, number>;
  installsByLocation?: Record<string, number>;
  hourlyPromptShown?: Record<string, number>;
  hourlyAppOpens?: Record<string, number>;
}
```

**Change 2 — Extend `aggregateDailyDocs()`** (line ~478):

```typescript
function aggregateDailyDocs(docs: any[]): any {
  const result: any = {
    // ... existing fields ...

    // Customer App fields
    totalPromptShown: 0,
    totalPromptDismissed: 0,
    totalInstallStarted: 0,
    totalInstalled: 0,
    uniqueInstallSessions: 0,
    totalAppOpens: 0,
    shortcutClicks: {},
    installsByDevice: {},
    installsByLocation: {},
  };

  for (const doc of docs) {
    // ... existing sums ...

    // Customer App numeric totals
    if (doc.totalPromptShown) result.totalPromptShown += doc.totalPromptShown;
    if (doc.totalPromptDismissed)
      result.totalPromptDismissed += doc.totalPromptDismissed;
    if (doc.totalInstallStarted)
      result.totalInstallStarted += doc.totalInstallStarted;
    if (doc.totalInstalled) result.totalInstalled += doc.totalInstalled;
    if (doc.uniqueInstallSessions)
      result.uniqueInstallSessions += doc.uniqueInstallSessions;
    if (doc.totalAppOpens) result.totalAppOpens += doc.totalAppOpens;

    // Customer App map fields
    mergeMapField(result.shortcutClicks, doc.shortcutClicks);
    mergeMapField(result.installsByDevice, doc.installsByDevice);
    mergeMapField(result.installsByLocation, doc.installsByLocation);
  }

  return result;
}
```

**Change 3 — Extend `updateSummaryDocument()`** (line ~265):

```typescript
async function updateSummaryDocument(...) {
  const updates: any = { /* existing */ };

  // ... existing increments ...

  // Customer App lifetime totals
  if (dailyData.totalPromptShown)    updates.lifetimeTotalPromptShown    = FieldValue.increment(dailyData.totalPromptShown);
  if (dailyData.totalInstalled)      updates.lifetimeTotalInstalled      = FieldValue.increment(dailyData.totalInstalled);
  if (dailyData.uniqueInstallSessions) updates.lifetimeUniqueInstalls    = FieldValue.increment(dailyData.uniqueInstallSessions);
  if (dailyData.totalAppOpens)       updates.lifetimeTotalAppOpens       = FieldValue.increment(dailyData.totalAppOpens);

  // Customer App map rollups
  if (dailyData.shortcutClicks) {
    for (const [key, value] of Object.entries(dailyData.shortcutClicks)) {
      if (typeof value === 'number') {
        updates[`shortcutClicks.${key}`] = FieldValue.increment(value);
      }
    }
  }
  if (dailyData.installsByDevice) {
    for (const [key, value] of Object.entries(dailyData.installsByDevice)) {
      if (typeof value === 'number') {
        updates[`installsByDevice.${key}`] = FieldValue.increment(value);
      }
    }
  }
}
```

> **Important:** These changes are additive — all new fields are optional, so existing menu-analytics projects (`obp`, menu project slugs) are completely unaffected. The function is deployed as `functions:aggregateCustomerAnalytics`.

---

## API Routes

### 1. Dynamic Manifest Route (Tenant Origin Root)

```typescript
// File: src/app/manifest.webmanifest/route.ts
// Route: GET {subdomain}.menulist.ai/manifest.webmanifest
// Middleware resolves tenant BEFORE this route runs

import { getTenantFromHeaders } from "@lib/multiTenant/getTenantFromHeaders";
import {
  getStoreBySubdomain,
  getStoreByCustomDomain,
} from "@lib/firestore/clientStoreLookup";

export async function GET(): Promise<Response> {
  const { subdomain, customDomain, tenantType } = await getTenantFromHeaders(
    "CustomerAppManifest",
  );

  // 1. Resolve store via existing tenant lookups
  let storeData: any = null;
  if (tenantType === "subdomain" && subdomain) {
    storeData = await getStoreBySubdomain(subdomain);
  } else if (tenantType === "custom" && customDomain) {
    storeData = await getStoreByCustomDomain(customDomain);
  }

  // 2. Eligibility gate (spec Feature 6)
  if (!storeData || !storeData.active || !isPublished(storeData)) {
    return new Response("Not Found", { status: 404 });
  }

  // 3. Generate manifest with store branding
  const manifest = await generateManifest(storeData);

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}

// Expected latency: <50ms (leverages existing unstable_cache in getStoreBySubdomain)
// Firebase reads: 1 (store lookup, cached 60s)
```

### 2. Icon Generation Endpoint

```typescript
// File: src/app/api/app-icons/[storeId]/[size]/route.ts
// Route: GET /api/app-icons/{storeId}/{size}
// Sizes: 192, 512, 180 (Apple)

export async function GET(
  request: Request,
  { params }: { params: { storeId: string; size: string } },
): Promise<Response> {
  // 1. Validate size (192, 512, 180)
  // 2. Check if pre-generated icon exists in Storage
  // 3. If exists: redirect to CDN URL
  // 4. If not: generate on-demand, save to Storage, return
  // 5. Set Cache-Control: public, max-age=86400 (1 day)
}

// Expected latency: <100ms for cached, <500ms for generation
// Firebase reads: 1 (store for logo URL)
// Storage: 1 read (if cached) or 1 write (if generated)
```

### 3. Icon Generation Trigger (Background)

```typescript
// File: src/app/api/app-icons/generate/route.ts
// Route: POST /api/app-icons/generate
// Triggered: When store logo changes or override uploaded

export async function POST(request: Request): Promise<Response> {
  // 1. Authenticate owner
  // 2. Get storeId from body
  // 3. Generate all icon sizes (192, 512, 180)
  // 4. Save to Firebase Storage
  // 5. Return success
}
```

---

## File Structure

### New Files

```
src/app/
├── manifest.webmanifest/
│   └── route.ts                       # Dynamic PWA manifest at tenant origin root
├── api/
│   └── app-icons/
│       ├── [storeId]/
│       │   └── [size]/
│       │       └── route.ts           # Icon serving endpoint
│       └── generate/
│           └── route.ts               # Icon generation trigger

src/components/
├── customerApp/
│   ├── InstallPrompt.tsx              # Install prompt UI
│   ├── InstallInstructions.tsx        # Platform-specific instructions
│   └── AppIconPreview.tsx             # Icon preview for owner settings

src/lib/
├── pwa/
│   ├── manifestGenerator.ts           # Manifest generation logic
│   ├── iconGenerator.ts               # Icon processing (Canvas/Sharp)
│   ├── installDetection.ts            # Detect if already installed
│   ├── installTracker.ts              # fireInstalledEventOnce (per-device dedupe)
│   ├── shortcutSourceDetector.ts      # Read ?source=shortcut-* and fire event
│   ├── standaloneDetector.ts          # Detect display-mode: standalone
│   └── shortcutsBuilder.ts            # Build dynamic shortcuts (appends ?source= param)

src/database/
├── pwa/
│   └── index.ts                       # PWA settings DAL

public/
├── sw-customer-app.js                 # Minimal service worker (no caching)
└── apple-touch-icon.png               # Default Apple touch icon (per-tenant served via icon route)
```

### Modified Files

```
src/app/_client/[[...slug]]/page.tsx    # Add install prompt injection, standalone/shortcut event firing
src/app/_client/layout.tsx             # Add manifest link, service worker registration
src/database/stores/index.ts           # Add PWA settings to store DAL
src/config/features.ts                 # Add feature flags
src/lib/analytics/unified.ts           # Add 8 CUSTOMER_APP_* events + switch cases
src/components/templates/main-app/dashboard/AnalyticsDashboard/index.tsx  # Mount CustomerAppMetrics card
src/components/templates/main-app/dashboard/AnalyticsDashboard/CustomerAppMetrics.tsx  # NEW card
functions/src/aggregateCustomerAnalytics.ts  # Extend DailyMetrics, aggregateDailyDocs(), updateSummaryDocument() for Customer App fields
```

---

## Service Worker (Minimal)

**File:** `public/sw-customer-app.js`

```javascript
// MINIMAL SERVICE WORKER — No caching logic
// Purpose: Install reliability only

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// NO fetch handler — no caching
// NO precache — no asset caching
// This SW exists solely to satisfy install criteria on Android
```

**Registration:**

```typescript
// src/app/_client/layout.tsx
useEffect(() => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw-customer-app.js");
  }
}, []);
```

---

## Install Prompt System

### Detection Logic

```typescript
// src/lib/pwa/installDetection.ts

interface InstallState {
  isInstalled: boolean;
  canInstall: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

// Check if already installed
export function detectInstalled(): boolean {
  if (typeof window === "undefined") return false;

  // Method 1: display-mode media query
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  // Method 2: navigator.standalone (iOS)
  const isIOSStandalone = (window.navigator as any).standalone === true;

  return isStandalone || isIOSStandalone;
}

// Check if we can show install prompt
export function canShowPrompt(
  visitCount: number,
  lastDismissed: number | null,
  ownerEnabled: boolean,
): boolean {
  if (!ownerEnabled) return false;
  if (detectInstalled()) return false;
  if (visitCount < 3) return false;

  // 30-day suppression
  if (lastDismissed) {
    const daysSince = (Date.now() - lastDismissed) / (1000 * 60 * 60 * 24);
    if (daysSince < 30) return false;
  }

  return true;
}
```

### Prompt UI Component

```typescript
// src/components/customerApp/InstallPrompt.tsx

interface InstallPromptProps {
  storeName: string;
  platform: "ios" | "android" | "other";
  onDismiss: () => void;
  onInstall: () => void;
}

// Shows: "Save this menu to your home screen for faster access"
// Android: Uses deferredPrompt.prompt()
// iOS: Shows custom instructions for "Share → Add to Home Screen"
```

### Visit Counting

```typescript
// src/lib/pwa/visitCounter.ts
//
// CRITICAL: Uses localStorage (NOT sessionStorage) so the 3rd-visit trigger
// works across separate browsing sessions. sessionStorage resets when the
// tab closes, which would make the prompt essentially never fire.
//
// Keys are namespaced per-tenant so multiple stores on the same device
// are counted independently.

function visitKey(storeId: number): string {
  return `menuList_visits_${storeId}`;
}

function dismissedKey(storeId: number): string {
  return `menuList_installDismissed_${storeId}`;
}

export function recordVisit(storeId: number): number {
  if (typeof window === "undefined") return 0;
  const key = visitKey(storeId);
  const current = parseInt(localStorage.getItem(key) || "0", 10);
  const next = current + 1;
  localStorage.setItem(key, String(next));
  return next;
}

export function getVisitCount(storeId: number): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(visitKey(storeId)) || "0", 10);
}

export function recordDismissal(storeId: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(dismissedKey(storeId), String(Date.now()));
}

export function getDismissalTime(storeId: number): number | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(dismissedKey(storeId));
  return stored ? parseInt(stored, 10) : null;
}
```

---

## Icon Generation Pipeline

### Processing Logic

```typescript
// src/lib/pwa/iconGenerator.ts

import sharp from "sharp"; // Server-side image processing

interface IconSpec {
  size: number;
  purpose: "any" | "maskable" | "any maskable";
}

const ICON_SPECS: IconSpec[] = [
  { size: 192, purpose: "any maskable" },
  { size: 512, purpose: "any maskable" },
  { size: 180, purpose: "any" }, // Apple touch icon
];

export async function generateAppIcons(
  logoUrl: string,
  storeId: number,
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  // Download logo
  const logoBuffer = await fetch(logoUrl).then((r) => r.arrayBuffer());

  for (const spec of ICON_SPECS) {
    // Process: trim whitespace, center, pad, resize
    const processed = await sharp(Buffer.from(logoBuffer))
      .trim() // Remove whitespace
      .resize(spec.size - 30, spec.size - 30, {
        // 15% padding
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .extend({
        top: 15,
        bottom: 15,
        left: 15,
        right: 15,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer();

    // Upload to Firebase Storage
    const path = `pwa-icons/${storeId}/${spec.size}.png`;
    const url = await uploadToStorage(processed, path);

    results[spec.size] = url;
  }

  return results;
}
```

---

## Manifest Generation

```typescript
// src/lib/pwa/manifestGenerator.ts

import type { MetadataRoute } from "next";

interface StoreData {
  storeId: number;
  name: string;
  pwaShortName?: string;
  branding: {
    logoUrl: string;
    pwaIconOverrideUrl?: string;
    pwaIconMode: "generated" | "override";
  };
  phone?: string;
  address?: string;
  subdomain: string;
  customDomain?: string;
  domainVerified?: boolean;
}

export async function generateManifest(
  store: StoreData,
): Promise<MetadataRoute.Manifest> {
  const iconBase = process.env.NEXT_PUBLIC_APP_URL;
  const storeId = store.storeId;

  // Determine icon source
  const iconUrl =
    store.branding.pwaIconMode === "override" &&
    store.branding.pwaIconOverrideUrl
      ? store.branding.pwaIconOverrideUrl
      : `${iconBase}/api/app-icons/${storeId}`;

  // Build shortcuts based on store data
  const shortcuts = buildShortcuts(store);

  // start_url and scope are the tenant origin root (subdomain or custom domain)
  // Middleware already routes this origin to the client menu page
  const tenantOrigin = store.customDomain
    ? `https://${store.customDomain}`
    : `https://${store.subdomain}.menulist.ai`;

  return {
    id: `store-${storeId}`,
    name: store.name,
    short_name: store.pwaShortName || store.name.slice(0, 12),
    description: `Official menu, contact and directions for ${store.name}`,
    start_url: `${tenantOrigin}/`,
    scope: `${tenantOrigin}/`,
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#ffffff",
    theme_color: "#ffffff",
    orientation: "portrait",
    icons: [
      {
        src: `${iconUrl}/192`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `${iconUrl}/512`,
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcuts,
  };
}

function buildShortcuts(store: StoreData): MetadataRoute.Manifest["shortcuts"] {
  // Day-one policy: NO custom per-store shortcut icons. Shortcuts are text-only.
  // Browsers will use the app icon as a fallback for shortcut visuals.
  const shortcuts = [
    {
      name: "View Menu",
      short_name: "Menu",
      description: `View ${store.name}'s full menu`,
      url: "/",
    },
  ];

  if (store.phone) {
    shortcuts.push({
      name: "Call Store",
      short_name: "Call",
      description: `Call ${store.name}`,
      url: `tel:${store.phone}`,
    });
  }

  if (store.address) {
    shortcuts.push({
      name: "Get Directions",
      short_name: "Directions",
      description: `Get directions to ${store.name}`,
      url: `https://maps.google.com/?q=${encodeURIComponent(store.address)}`,
    });
  }

  return shortcuts;
}
```

---

## Owner Settings Integration

### New Surface: Customer App

**Location:** Dashboard → Surfaces → Customer App

**Components:**

```typescript
// src/components/templates/main-app/surfaces/customerApp/

// CustomerAppSurface.tsx — Main surface page
// Sections:
// - Status Card (installable, icon status, promotion status)
// - Basic Settings (enable toggle, promote toggle)
// - Advanced Settings (app name, icon selector)
// - Preview Section (how it looks on home screen)

// AppNameSetting.tsx
// - Input for pwaShortName
// - Character counter (max 12)
// - Preview of truncation

// IconSelector.tsx
// - "Use store logo" (default)
// - "Upload custom icon" (advanced)
// - Preview: Android icon mockup
// - Preview: iOS icon mockup
// - Validation: square, PNG, 1024x1024
```

### DAL Functions

```typescript
// src/database/pwa/index.ts

export async function getPWASettings(
  storeId: number,
): Promise<StorePWASettings> {
  // Returns: { enableInstallableApp, promoteInstallation, pwaShortName }
  // Default if not set: { true, true, undefined }
}

export async function updatePWASettings(
  storeId: number,
  settings: Partial<StorePWASettings>,
): Promise<void> {
  // Updates stores/{storeId}/pwaSettings
}

export async function updatePWAIconOverride(
  storeId: number,
  iconUrl: string | null,
): Promise<void> {
  // Updates stores/{storeId}/branding.pwaIconOverrideUrl
  // Updates stores/{storeId}/branding.pwaIconMode
  // Triggers icon regeneration
}
```

---

## Security

### Firestore Rules

```javascript
// firestore.rules — Add to existing stores rules

match /stores/{storeId} {
  // Existing rules...

  // PWA settings: owners only
  allow update: if isOwner(storeId)
    && request.resource.data.keys().hasOnly(['pwaSettings', 'branding']);
}

match /pwaAnalytics/{docId} {
  // Internal system writes only
  allow write: if request.auth != null
    && request.auth.token.role == 'system';
  allow read: if isOwner(extractStoreId(docId));
}
```

### API Security

| Route                                  | Auth Required | Rate Limit | Notes                            |
| -------------------------------------- | ------------- | ---------- | -------------------------------- |
| `{tenant-origin}/manifest.webmanifest` | No            | N/A        | Public endpoint at tenant origin |
| `/api/app-icons/[storeId]/[size]`      | No            | 100/min    | Public assets                    |
| `/api/app-icons/generate`              | Yes (owner)   | 5/min      | Trigger regeneration             |

### Input Validation

```typescript
// pwaShortName validation
const pwaShortNameSchema = z
  .string()
  .max(12, "Short name must be 12 characters or less")
  .min(2, "Short name must be at least 2 characters")
  .optional();

// Icon upload validation
const iconUploadSchema = z.object({
  size: z.number().max(2 * 1024 * 1024, "Max 2MB"), // 2MB
  type: z.literal("image/png"),
  dimensions: z
    .object({
      width: z.number(),
      height: z.number(),
    })
    .refine((d) => d.width === d.height, "Must be square"),
});
```

---

## Troubleshooting

| Issue                                   | Cause                                                                | Solution                                          |
| --------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| Manifest 404                            | Store not resolved OR eligibility gate failed (inactive/unpublished) | Check subdomain routing + store `active` flag     |
| Icon not showing                        | Generation failed                                                    | Check Sharp/Canvas setup                          |
| Install prompt not showing              | Visit count < 3                                                      | Verify `visitCounter.ts` uses `localStorage`      |
| Prompt shows every new tab              | `sessionStorage` used in error                                       | Must be `localStorage`                            |
| Wrong store's icon                      | Cross-tenant leak                                                    | Validate icon URL paths                           |
| Customer menu served from runtime cache | `next-pwa` scoping issue                                             | Verify `/_client/*` removed from `runtimeCaching` |
| SW registration fails                   | HTTPS not enabled                                                    | Use --experimental-https                          |
| Safari no install button                | iOS uses Share menu                                                  | Show instructions, not button                     |

---

## Related Documents

| Document                         | Purpose                     |
| -------------------------------- | --------------------------- |
| `customer-app_spec.md`           | Business requirements       |
| `customer-app_marketing.md`      | Sales/marketing strategy    |
| `customer-app_website.md`        | Public website content      |
| `customer-app_helpdoc.md`        | Customer help documentation |
| `customer-app_firebase.md`       | Firebase cost tracking      |
| `customer-app_mobile-support.md` | Mobile assessment           |

---

## Testing Guide

### Local Testing

```bash
# 1. Enable local HTTPS (required for PWA)
npx next@latest dev --experimental-https

# 2. Test manifest
open https://localhost:3000/joespizza/manifest.webmanifest

# 3. Test icon endpoint
open https://localhost:3000/api/app-icons/123/192

# 4. Use Chrome DevTools → Application → Manifest
# Verify: icons, theme, shortcuts

# 5. Use Chrome DevTools → Application → Service Workers
# Verify: SW registered, no errors
```

### Production Testing

| Test          | Steps                                 | Expected                         |
| ------------- | ------------------------------------- | -------------------------------- |
| Install flow  | Visit store 3x → see prompt → install | App on home screen               |
| Icon branding | Check home screen icon                | Store logo, not MenuList         |
| App name      | Check home screen label               | Store name                       |
| Launch        | Tap app icon                          | Opens standalone                 |
| Shortcuts     | Long-press icon                       | View Menu, Call, Directions      |
| Cross-tenant  | Check manifest of store A vs B        | Different icons, names           |
| Offline       | Airplane mode → open app              | Shows menu (no caching per spec) |
| Update        | Deploy new version → reopen app       | Loads new version                |

---

## Implementation Sequence

> **Doctrine:** Day-one, production-grade. No phases. This is a build-order checklist for a single ship, not a release plan.

### Sequence 1: Foundation

| Task                                                                    | File(s)                                           | Status |
| ----------------------------------------------------------------------- | ------------------------------------------------- | ------ |
| [ ] Resolve `next-pwa` scoping (remove customer-facing runtime caching) | `next.config.js`                                  | ⏳     |
| [ ] Dynamic manifest route at tenant origin                             | `src/app/manifest.webmanifest/route.ts`           | ⏳     |
| [ ] Eligibility gate (active + published)                               | `src/lib/pwa/eligibility.ts`                      | ⏳     |
| [ ] Icon generation endpoint                                            | `src/app/api/app-icons/[storeId]/[size]/route.ts` | ⏳     |
| [ ] Minimal service worker (no caching)                                 | `public/sw-customer-app.js`                       | ⏳     |
| [ ] Manifest `<link>` in tenant layout                                  | `src/app/client/layout.tsx` or equivalent         | ⏳     |
| [ ] Service worker registration (tenant origin only)                    | `src/app/client/layout.tsx`                       | ⏳     |
| [ ] Apple touch icon route                                              | `src/app/apple-touch-icon.png/route.ts`           | ⏳     |
| [ ] DB schema additions                                                 | `stores.branding.pwa*`, `stores.pwaSettings`      | ⏳     |
| [ ] Firestore rules for new fields                                      | `firestore.rules`                                 | ⏳     |
| [ ] Unavailable-store screen (churn policy)                             | `src/app/client/_components/Unavailable.tsx`      | ⏳     |

### Sequence 2: Install Prompt

| Task                                                                                        | File(s)                                              | Status |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------ |
| [ ] Visit counter (localStorage, per-store)                                                 | `src/lib/pwa/visitCounter.ts`                        | ⏳     |
| [ ] Install detection                                                                       | `src/lib/pwa/installDetection.ts`                    | ⏳     |
| [ ] `beforeinstallprompt` capture                                                           | Customer menu page                                   | ⏳     |
| [ ] `appinstalled` handler (fires `CUSTOMER_APP_INSTALLED` via `fireInstalledEventOnce`)    | Customer menu page                                   | ⏳     |
| [ ] InstallPrompt component (fires `PROMPT_SHOWN` / `PROMPT_DISMISSED` / `INSTALL_STARTED`) | `src/components/customerApp/InstallPrompt.tsx`       | ⏳     |
| [ ] Platform detection                                                                      | `src/lib/pwa/platformDetection.ts`                   | ⏳     |
| [ ] iOS instructions UI                                                                     | `src/components/customerApp/InstallInstructions.tsx` | ⏳     |
| [ ] 30-day suppression logic                                                                | `src/lib/pwa/visitCounter.ts`                        | ⏳     |

### Sequence 2b: Customer App Analytics

| Task                                                                                                | File(s)                                                       | Status |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------ |
| [ ] Add 8 `CUSTOMER_APP_*` entries to `TrackingEvent` enum                                          | `src/lib/analytics/unified.ts`                                | ⏳     |
| [ ] Add switch cases for each event in `trackFirebaseEvent`                                         | `src/lib/analytics/unified.ts`                                | ⏳     |
| [ ] Add GA4 mapping in `trackGA4Event`                                                              | `src/lib/analytics/unified.ts`                                | ⏳     |
| [ ] `fireInstalledEventOnce()` with per-device localStorage dedupe                                  | `src/lib/pwa/installTracker.ts`                               | ⏳     |
| [ ] Standalone-mode detector + `CUSTOMER_APP_OPENED` trigger                                        | `src/lib/pwa/standaloneDetector.ts`                           | ⏳     |
| [ ] Shortcut `?source=` param detector + shortcut event firing                                      | `src/lib/pwa/shortcutSourceDetector.ts`                       | ⏳     |
| [ ] Wire events in `InstallPrompt.tsx` (shown, dismissed, started)                                  | `src/components/customerApp/InstallPrompt.tsx`                | ⏳     |
| [ ] Reserve `customerApp` as project segment (avoid slug collision)                                 | `src/constants/reservedSlugs.ts`                              | ⏳     |
| [ ] Extend `DailyMetrics` interface with Customer App fields                                        | `functions/src/aggregateCustomerAnalytics.ts`                 | ⏳     |
| [ ] Extend `aggregateDailyDocs()` to sum Customer App numeric + map fields (weekly/monthly rollups) | `functions/src/aggregateCustomerAnalytics.ts`                 | ⏳     |
| [ ] Extend `updateSummaryDocument()` to increment Customer App lifetime totals + map rollups        | `functions/src/aggregateCustomerAnalytics.ts`                 | ⏳     |
| [ ] Deploy updated Cloud Function                                                                   | `firebase deploy --only functions:aggregateCustomerAnalytics` | ⏳     |
| [ ] Respect `storeDetails.analytics.trackMenuViews` flag                                            | `InstallPrompt.tsx`, standalone/shortcut detectors            | ⏳     |

### Sequence 3: Shortcuts (Text-only, No Per-store Icons)

| Task                              | File(s)                            | Status |
| --------------------------------- | ---------------------------------- | ------ |
| [ ] Shortcuts builder             | `src/lib/pwa/shortcutsBuilder.ts`  | ⏳     |
| [ ] Dynamic shortcuts in manifest | `src/lib/pwa/manifestGenerator.ts` | ⏳     |

### Sequence 4: Owner Settings & Analytics Dashboard

| Task                                                              | File(s)                                                   | Status |
| ----------------------------------------------------------------- | --------------------------------------------------------- | ------ |
| [ ] PWA DAL functions                                             | `src/database/pwa/index.ts`                               | ⏳     |
| [ ] Customer App surface page                                     | `src/components/templates/main-app/surfaces/customerApp/` | ⏳     |
| [ ] Eligibility-aware enable toggle                               | `CustomerAppSurface.tsx`                                  | ⏳     |
| [ ] App name override input                                       | `AppNameSetting.tsx`                                      | ⏳     |
| [ ] Icon selector component                                       | `IconSelector.tsx`                                        | ⏳     |
| [ ] Icon preview mockups                                          | `AppIconPreview.tsx`                                      | ⏳     |
| [ ] Icon upload validation                                        | `iconUploadSchema`                                        | ⏳     |
| [ ] Settings save integration                                     | `updatePWASettings()`                                     | ⏳     |
| [ ] Customer App analytics card component                         | `AnalyticsDashboard/CustomerAppMetrics.tsx`               | ⏳     |
| [ ] Mount card in dashboard                                       | `AnalyticsDashboard/index.tsx`                            | ⏳     |
| [ ] Derived metrics: conversion, top shortcut                     | `CustomerAppMetrics.tsx`                                  | ⏳     |
| [ ] Surface Availability badges (Layer 1) read from `pwaSettings` | `CustomerAppMetrics.tsx`                                  | ⏳     |

### Sequence 5: Testing & QA

| Task                                                                                                                       | Status |
| -------------------------------------------------------------------------------------------------------------------------- | ------ |
| [ ] Android Chrome install test                                                                                            | ⏳     |
| [ ] Samsung Internet install test                                                                                          | ⏳     |
| [ ] Safari iOS install test                                                                                                | ⏳     |
| [ ] Icon generation test                                                                                                   | ⏳     |
| [ ] Tenant isolation test (manifest + icons + analytics docs)                                                              | ⏳     |
| [ ] Eligibility gate test (inactive / unpublished returns 404)                                                             | ⏳     |
| [ ] Churn behavior test (deactivated store shows unavailable screen)                                                       | ⏳     |
| [ ] `next-pwa` scoping verification (no customer-facing runtime cache)                                                     | ⏳     |
| [ ] Analytics: all 8 events fire correctly under debounce/rate-limit                                                       | ⏳     |
| [ ] Analytics: `CUSTOMER_APP_OPENED` fires only in standalone mode                                                         | ⏳     |
| [ ] Analytics: `fireInstalledEventOnce` prevents double-count on reinstall                                                 | ⏳     |
| [ ] Analytics: daily doc ID pattern matches existing aggregation regex                                                     | ⏳     |
| [ ] Analytics: weekly rollup doc contains `totalInstalled`, `totalAppOpens`, `shortcutClicks`                              | ⏳     |
| [ ] Analytics: monthly rollup doc contains same Customer App fields                                                        | ⏳     |
| [ ] Analytics: `overall_summary` doc has `lifetimeTotalInstalled`, `lifetimeUniqueInstalls`                                | ⏳     |
| [ ] Analytics: daily→weekly reconciliation — sum 7 known daily docs manually, verify weekly rollup equals that sum exactly | ⏳     |
| [ ] Analytics: nested map fields (`shortcutClicks`, `installsByDevice`) use additive merge, not overwrite, in rollups      | ⏳     |
| [ ] Analytics: owner dashboard card renders real data                                                                      | ⏳     |
| [ ] Analytics: respects `storeDetails.analytics.trackMenuViews = false`                                                    | ⏳     |
| [ ] Update behavior test (deploy, manifest change, icon change)                                                            | ⏳     |
| [ ] Performance audit (<2s launch)                                                                                         | ⏳     |
| [ ] Lighthouse PWA audit                                                                                                   | ⏳     |

---

## Validation Report

### Logic Flows to Verify

| Flow               | Test Case                                                         | Status |
| ------------------ | ----------------------------------------------------------------- | ------ |
| Manifest per store | `/store-a/manifest.webmanifest` ≠ `/store-b/manifest.webmanifest` | ⏳     |
| Icon isolation     | Store A icons don't appear in Store B manifest                    | ⏳     |
| Install detection  | `display-mode: standalone` correctly detected                     | ⏳     |
| Visit counting     | 3rd visit triggers prompt                                         | ⏳     |
| Dismissal memory   | Prompt suppressed for 30 days after dismiss                       | ⏳     |
| Owner toggle       | Disabling promotion stops prompts                                 | ⏳     |
| Icon generation    | Logo change triggers regeneration                                 | ⏳     |
| iOS instructions   | Safari shows "Share → Add to Home Screen"                         | ⏳     |
| Android prompt     | Chrome shows native install UI                                    | ⏳     |
| App shortcuts      | Long-press shows View Menu, Call, Directions                      | ⏳     |
| Cross-tenant       | Check manifest of store A vs B                                    | ⏳     |
| Offline            | Airplane mode → open app                                          | ⏳     |
| Update             | Deploy new version → reopen app                                   | ⏳     |

### Cross-Platform QA Matrix

| Platform         | Install | Icon | Shortcuts | Standalone |
| ---------------- | ------- | ---- | --------- | ---------- |
| Chrome Android   | ⏳      | ⏳   | ⏳        | ⏳         |
| Samsung Internet | ⏳      | ⏳   | ⏳        | ⏳         |
| Safari iOS       | ⏳      | ⏳   | ⏳        | ⏳         |
| Chrome iOS       | ⏳      | ⏳   | ⏳        | ⏳         |

---

## Firebase Costs (Day-One)

> Authoritative cost tracking is in `customer-app_firebase.md`. This is a quick-reference summary.

### Operations Breakdown

| Operation             | Collection       | Trigger                      | Frequency             | Docs          | Cost/1000                  |
| --------------------- | ---------------- | ---------------------------- | --------------------- | ------------- | -------------------------- |
| Manifest generation   | stores           | Page load                    | Per visit (cached)    | 1 read        | $0.06                      |
| Icon serve (cached)   | —                | Icon request                 | Per install           | 0             | $0                         |
| Icon generation       | stores + storage | Logo change                  | Rare                  | 1R + 1W       | $0.18 + storage            |
| Settings save         | stores           | Owner action                 | Rare                  | 1 write       | $0.18                      |
| Analytics events      | analytics        | PROMPT/INSTALL/OPEN/SHORTCUT | Per event (debounced) | 1 write/event | Shared with menu analytics |
| Analytics aggregation | analytics        | Nightly Cloud Function       | 1x/day/store          | 1-3 writes    | Shared with menu analytics |

**Day-one note:** Analytics reuses the existing `analytics` collection. No new Cloud Function — but `aggregateCustomerAnalytics.ts` requires code additions to `DailyMetrics`, `aggregateDailyDocs()`, and `updateSummaryDocument()` so Customer App fields appear in weekly/monthly rollups and the lifetime summary (see "Cloud Function Changes Required" section above). Install events are deduped per-device via `localStorage` before firing.

### Cost Optimization

1. **Manifest caching:** `unstable_cache` with 60s TTL (inherited from existing store lookups)
2. **Icon caching:** 1-day edge cache, Firebase Storage CDN
3. **No runtime icon generation:** Pre-generate on logo change
4. **Analytics debouncing:** Inherited — existing `shouldDebounce` + `shouldRateLimit` apply to all `CUSTOMER_APP_*` events
5. **Install dedupe:** `fireInstalledEventOnce` caps one install write per device per store

---

_Document Status: 📋 READY FOR IMPLEMENTATION_  
_Last Updated: April 18, 2026_
