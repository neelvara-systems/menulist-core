# Customer-Facing Infrastructure Audit

**Date:** February 7, 2026  
**Scope:** Every surface where a customer (not owner) sees MenuList data  
**Method:** Deep codebase trace — every claim below links to actual code, not assumptions  
**Status:** Audit only — no fixes applied

---

## Table of Contents

1. [All Customer-Facing Surfaces](#1-all-customer-facing-surfaces)
2. [Surface 1: QR Menu / Digital Menu Link](#2-surface-1-qr-menu--digital-menu-link)
3. [Surface 2: Digital Screen (TV/Tablet)](#3-surface-2-digital-screen-tvtablet)
4. [Surface 3: PDF Menu (Printable Export)](#4-surface-3-pdf-menu-printable-export)
5. [Surface 4: Guest Feedback Page](#5-surface-4-guest-feedback-page)
6. [Surface 5: Platform Website (menulist.ai)](#6-surface-5-platform-website-menulistai)
7. [Surfaces That Do NOT Exist Yet](#7-surfaces-that-do-not-exist-yet)
8. [Firebase Cost — Customer Side](#8-firebase-cost--customer-side)
9. [Failure Scenarios (Honest Assessment)](#9-failure-scenarios-honest-assessment)
10. [Summary Matrix](#10-summary-matrix)

---

## 1. All Customer-Facing Surfaces

| # | Surface | Exists in Code | Public URL | Customer Sees Menu Data? |
|---|---------|---------------|------------|--------------------------|
| 1 | **QR Menu / Digital Menu Link** | ✅ Yes | `joespizza.menulist.ai` or `joespizza.com` | ✅ Full menu |
| 2 | **Digital Screen (TV/Tablet)** | ✅ Yes | `/screen/[token]` | ✅ Slides (items, campaigns, brand) |
| 3 | **PDF Menu (Printable)** | ✅ Yes (client-side generation) | N/A — downloaded blob | ✅ Full menu in PDF format |
| 4 | **Guest Feedback Page** | ✅ Yes | `/feedback/[projectId]` | ❌ No menu data — only feedback form |
| 5 | **Platform Website** | ✅ Yes | `menulist.ai/*` | ❌ Marketing only — no customer menu data |
| 6 | WhatsApp preview | ❌ No code exists | — | — |
| 7 | Embed / iframe | ❌ No code exists | — | — |
| 8 | Kiosk / tablet ordering mode | ❌ No code exists | — | — |
| 9 | Public API for menu data | ❌ No code exists | — | — |
| 10 | Shared menu link (separate from QR) | ❌ Same as #1 | Same subdomain URL | Same as #1 |

**Reality: 4 surfaces exist. Only 2 show actual menu data to customers (QR Menu + Digital Screen).**

---

## 2. Surface 1: QR Menu / Digital Menu Link

This is the **primary customer-facing surface** — what every restaurant customer sees when they scan the QR code.

### A. URL Type

| Type | URL Pattern | Example |
|------|-------------|---------|
| **Subdomain** | `{storeName}.menulist.ai` | `joespizza.menulist.ai` |
| **Subdomain + slug** | `{storeName}.menulist.ai/{menu-slug}` | `joespizza.menulist.ai/drinks` |
| **Custom domain** | `{customDomain}` | `joespizza.com` |
| **Custom domain + slug** | `{customDomain}/{menu-slug}` | `joespizza.com/bar-menu` |
| **Item deep link** | `{domain}/menu/item/{itemId}` | `joespizza.menulist.ai/menu/item/abc123` |

**How routing works:**

```
Customer opens joespizza.menulist.ai
    ↓
Edge Middleware (src/middleware.ts:22-56)
    ↓ resolveDomain() identifies "joespizza" as subdomain tenant
    ↓ Sets x-tenant-subdomain header
    ↓ Rewrites to /_client/[...slug]
    ↓
Server Component: src/app/_client/[[...slug]]/page.tsx
    ↓ (SSR — runs on server)
    ↓ Reads tenant headers
    ↓ Fetches data from Firestore
    ↓ Returns rendered HTML to client
    ↓
Client Component: src/components/templates/website/clientWebsite/index.tsx
    ↓ Hydrates in browser
    ↓ Handles client-side interactions (search, filters, PDP, language)
```

**Code path:** `middleware.ts` → `domainResolver.ts` → `_client/[[...slug]]/page.tsx` → `ClientMenuRenderer` → `MainContentRenderer` → `MenuPageNew`

### B. Data Fetch Flow (EXACT — traced from code)

**Step 1: Store Lookup** (`page.tsx:52-78`)

```
For subdomain:
  Query: stores WHERE subdomain == "joespizza" AND active == true LIMIT 1
  Collection: stores
  Reads: 1 (getDocs query)

For custom domain:
  Query: stores WHERE customDomain == "joespizza.com" AND domainVerified == true AND active == true LIMIT 1
  Collection: stores
  Reads: 1 (getDocs query)
```

**Step 2: Project Metadata Lookup** (`page.tsx:113-162`)

```
Query: projects/{tId}/{sId}/metadata WHERE deleted == false AND active == true
Collection: projects/{tId}/{sId}/metadata (subcollection)
Reads: 1 (getDocs query — returns ALL active projects for this store)
Then: Find project matching slug OR isDefault OR first project (in-memory filter)
```

**Step 3: Full Project Data Fetch** (`page.tsx:81-91`)

```
DocRef: projects/{tId}/{sId}/{projectId}
Reads: 1 (getDoc — full project document)
Size: 10-200KB depending on restaurant
```

**Step 4: Multi-Outlet Resolution (conditional)** (`page.tsx:172-185`)

```
IF project.masterProjectId exists AND ENABLE_MULTI_OUTLET flag is true:
  → resolveProjectForRender() (src/lib/multiOutlet/resolveProject.ts:171-224)
  → Fetches master project: getProjectDataByStore(tId, masterSId, masterProjectId)
  → Collection: projects/{tId}/{masterSId}/{masterProjectId}
  → Reads: 1 (getDoc) — uses 30s in-memory cache (MASTER_CACHE_TTL_MS = 30000)
  → Merges master items + store overrides + local-only items in-memory
  → Returns resolved project (NOT persisted)

IF project is standalone (no masterProjectId):
  → Returns project as-is
  → Reads: 0
```

**Step 5: Store Details Fetch** (`page.tsx:405`)

```
getStoreById(storeData.storeId)
Collection: stores
Reads: 1 (getDoc — for full store details: working hours, currency, branding)
```

**Step 6: Decision Blocks Fetch (optional)** (`page.tsx:409-413`)

```
getPrecomputedDecisionBlocks(tId, sId, projectId)
Collection: decisionBlocks
DocId: {tId}_{sId}_{projectId}
Reads: 1 (getDoc — may return null if no precomputed blocks exist)
```

**Step 7: SEO Metadata (runs in parallel)** (`page.tsx:191-251`)

```
Same store lookup as Step 1 (duplicate query — called separately by generateMetadata)
Reads: 1 (getDocs query)
```

### C. Reads Per Load

| Action | Firebase Reads | Breakdown |
|--------|---------------|-----------|
| **First open (standalone project)** | **5-6** | 1 store lookup + 1 metadata query + 1 project doc + 1 store details + 1 decision blocks + 1 SEO metadata store lookup |
| **First open (multi-outlet linked)** | **6-7** | Same as above + 1 master project fetch (or 0 if cached) |
| **Refresh (F5)** | **5-7** | Same as first open (no client-side cache for Firestore data) |
| **Navigate inside menu (category/search/PDP)** | **0** | All client-side — data already in React state |
| **Switch language** | **0** | All client-side — i18n data is in the project doc |
| **Idle** | **0** | No polling, no listeners, no background fetches |

**IMPORTANT NOTE:** The SEO `generateMetadata()` function at `page.tsx:191` makes a **duplicate store lookup query** (same `getStoreBySubdomain`/`getStoreByCustomDomain` as the page itself). This means every page load queries the stores collection **twice** for the same data. This is 1 unnecessary read per page load.

### D. Caching

| Cache Type | Used? | Details |
|-----------|-------|---------|
| **Browser localStorage** | ❌ No | Not used for menu data |
| **sessionStorage** | ✅ Yes | `menuState_{projectId}` — stores scroll position, active filter, active category (`menuPageNew.tsx:96-194`). State persistence only, NOT data cache. |
| **IndexedDB** | ❌ No | Not used |
| **Memory cache (JS)** | ✅ Yes (server only) | Multi-outlet master project cache: `masterProjectCache` Map with 30s TTL (`resolveProject.ts:37-81`). Only helps if multiple outlets resolve against same master in quick succession on same server instance. |
| **SWR** | ❌ No | Not used for customer pages |
| **Service Worker (PWA)** | ✅ Yes | `next-pwa` configured in `next.config.js:104-174`. Rules: |
| | | - `/_client/*` pages: **NetworkFirst** with 10s timeout fallback, 24h cache, max 32 entries |
| | | - Firebase Storage images: **CacheFirst**, 7 day cache, max 200 entries |
| | | - Google Fonts: **CacheFirst**, 1 year cache |
| | | - Static assets (JS/CSS/images): **StaleWhileRevalidate**, 30 day cache |
| **CDN cache** | ❌ No | No explicit CDN caching headers set. Next.js default behavior applies (static assets cached by CDN, SSR pages not cached). |
| **Next.js ISR/static** | ❌ No | Page is a dynamic Server Component (uses `headers()` — forces dynamic rendering every request). No `revalidate` export. Every request hits Firestore. |

**Key insight:** The PWA service worker IS configured for offline support (`NetworkFirst` with 10s timeout), but it caches the **rendered HTML page**, not the raw Firestore data. This means:
- If network is slow (>10s), customer sees cached version of the **last successful page load**
- If customer has never visited this menu before, no cache exists → blank/error

### E. Offline Behavior

| Scenario | What Happens | Evidence |
|----------|-------------|---------|
| **Menu already open, internet drops** | ✅ Menu stays visible — all data is in React state. Navigation (search, filter, PDP, language) all works. No Firestore reads needed after initial load. | All interactions are client-side in `menuPageNew.tsx` |
| **New customer opens menu, no internet** | ❌ **Blank page / error** — Server Component can't fetch from Firestore. Next.js returns error page. No cached version exists for first-time visitors. | `page.tsx` does `getDoc`/`getDocs` server-side — fails without network |
| **Returning customer opens menu, no internet** | ⚠️ **May work via PWA cache** — if service worker cached the page from a previous visit (within 24h), `NetworkFirst` with 10s timeout falls back to cache. Shows stale data but functional. | `next.config.js:112-122` — `networkTimeoutSeconds: 10` |
| **Slow internet (2-5s)** | ⚠️ **Slow load** — Server Component waits for all 5-7 Firestore reads to complete sequentially before returning HTML. No skeleton/loading state during SSR fetch. Customer sees browser loading spinner. | Sequential `await` calls in `page.tsx:362-446` |
| **Slow internet (>10s)** | ✅ PWA fallback kicks in — service worker returns cached version after 10s timeout | `networkTimeoutSeconds: 10` in next.config.js |
| **Firebase fails completely** | ❌ **Error page** — `getStoreBySubdomain` returns null → `notFound()` → Next.js 404 page. Or if Firestore throws, unhandled error → global error page. | `page.tsx:378-380`: `if (!storeData) { notFound(); }` |

### F. Realtime vs Static

| Mechanism | Used? |
|-----------|-------|
| Realtime listener (`onSnapshot`) | ❌ No |
| Fetch once | ✅ Yes — single SSR fetch, then client hydration |
| Polling | ❌ No |
| Manual refresh | ✅ Browser refresh triggers full re-fetch |
| Cache only | ❌ No (PWA cache is fallback, not primary) |

**The customer menu is a "fetch once, render once" model.** After initial SSR, the entire menu is in React state on the client. No background updates. If the owner changes a price, the customer sees the old price until they refresh the page.

### G. Data Size Loaded to Customer

The **full project document** is loaded server-side, then serialized and sent to the client as React Server Component props.

| Restaurant Size | Estimated Project Doc | What's Included |
|----------------|----------------------|-----------------|
| Small (10 items, 1 lang) | ~5-10 KB | All items, categories, file metadata, config, theme |
| Medium (30 items, 2 langs) | ~20-40 KB | Same + translation data for all languages |
| Large (80 items, 4 langs) | ~80-200 KB | Same + all translations + all descriptions |

**What's transferred to the client browser:**
- Full project data (serialized as JSON in HTML)
- Store details (name, hours, currency, branding)
- Precomputed decision blocks (if exist)
- Images loaded lazily via `<Image>` component from Firebase Storage

**No filtering of project data happens.** The full doc with all files, all items (including `active: false` items), all languages, all metadata is sent to the client. Client-side filtering happens in `menuPageNew.tsx` (`item.active !== false`, `isCategoryVisibleByTime`, etc.).

---

## 3. Surface 2: Digital Screen (TV/Tablet)

### A. Device Type

Code does NOT target specific devices. It renders a **fullscreen web page** that works on:
- Smart TV browser (any)
- Android tablet/phone browser
- FireStick browser
- Raspberry Pi + Chromium
- Any device with a browser that can open a URL

The URL is opened in a browser and runs fullscreen (`html, body { overflow: hidden }` in `ScreenDisplay.tsx:326-329`).

### B. How Screen Runs

**URL:** `/screen/[token]` where token is a 6-12 character store-specific screen token.

**Architecture:** Server Component (SSR) → Client Component (slide rotation + real-time listener)

```
Screen device opens /screen/ABC123
    ↓
Server Component: src/app/screen/[token]/page.tsx
    ↓ Validates token (6-12 chars)
    ↓ getScreenDataByToken(token)
    ↓   → Query: platformSummary WHERE screen.screenToken == token (1 read)
    ↓   → Fetch: stores/{storeId} (1 read) for store info + license check
    ↓ generateSlidesFromData() — 4-layer stack:
    ↓   Layer 1: Owner Pinned slides (filter expired)
    ↓   Layer 2: Campaign slides (if confidence >= 0.7)
    ↓   Layer 3+4: Brand fallback (always present, ensures min 3 slides)
    ↓ Returns initialData to client
    ↓
Client Component: src/app/screen/[token]/ScreenDisplay.tsx
    ↓ CACHED-FIRST: Tries localStorage cache before using server data
    ↓ Slide rotation: 8s per slide (config.slideDurationMs)
    ↓ Real-time listener: onSnapshot on platformSummary for contentVersion changes
    ↓ Daily "seen" signal: 1 API call per day via /api/screen/seen
    ↓ Lazy QR loading: QR code loads after 2s delay (cold boot optimization)
```

### C. Data Fetch Flow (EXACT)

**Server-side (page load):**

| Step | What | Collection | Reads |
|------|------|-----------|-------|
| 1 | Find screen by token | `platformSummary` WHERE `screen.screenToken == token` | 1 query |
| 2 | Fetch store info | `stores/{storeId}` | 1 getDoc |
| **Total server-side** | | | **2 reads** |

**Client-side (ongoing):**

| Step | What | Collection | Reads |
|------|------|-----------|-------|
| 3 | Real-time listener | `platformSummary` WHERE `screen.screenToken == token` | 1 onSnapshot (persistent) |
| 4 | Daily seen signal | `/api/screen/seen` → `platformSummary` update | 1 query + 1 write per day |

### D. Update Logic — When Menu Changes

```
Owner updates menu → publishProject() 
    → (currently) NO automatic screen update
    
Owner updates screen content → updates platformSummary.screen.contentVersion
    → onSnapshot fires in ScreenDisplay.tsx:178-189
    → If newVersion > currentVersion → window.location.reload()
    → Full page reload → server re-fetches fresh data
```

**The screen does NOT directly listen to the project document.** It listens to `platformSummary.screen.contentVersion`. This means:
- If owner just edits menu items/prices → screen does NOT auto-update
- Screen only updates when `contentVersion` is explicitly incremented
- The reload is a **full page reload** (`window.location.reload()` at line 188), not a smooth data swap

### E. If Internet Drops

| Scenario | What Happens | Code Evidence |
|----------|-------------|---------------|
| **Internet drops while running** | ✅ **Keeps showing last slides** — slide rotation is a local `setInterval` (`ScreenDisplay.tsx:157-167`). All slides are in React state. Offline indicator shows ("Offline Mode" badge at top-right). | `ScreenDisplay.tsx:291-293` |
| **Internet drops, listener fails** | `onSnapshot` error handler sets `isOffline: true`. Every 30 minutes, attempts `window.location.reload()` as fallback. | `ScreenDisplay.tsx:192-196` and `207-216` |
| **Screen opened with no internet** | ❌ **Blank** — Server Component can't fetch data. UNLESS PWA cache exists from previous load (service worker caches static assets but `/_client/*` rule may not match `/screen/*`). | `page.tsx:39-43` — `if (!screenData) { notFound(); }` |
| **Internet returns after drop** | ✅ **Auto-recovers** — `onSnapshot` listener reconnects automatically (Firebase SDK behavior). If version changed during offline, reload triggers. If offline >30min, fallback reload attempt. | Firebase SDK auto-reconnect + `ScreenDisplay.tsx:207-216` |

### F. Caching (Screen-Specific)

| Cache | Details |
|-------|---------|
| **localStorage** | ✅ `menulist-screen-data` key — stores full `initialData` (slides, storeInfo, config). On next page load, renders from cache FIRST (instant), then updates from server if different. | 
| **Cache-first rendering** | ✅ `ScreenDisplay.tsx:58-86` — `useState` initializer reads cache. If cache has valid slides, uses them immediately. Server data replaces cache only if different (line 96-104). |
| **Zero-blank guarantee** | ✅ `ScreenDisplay.tsx:222-286` — Even if no slides exist, renders an emergency fallback with store logo + "Scan to view menu" + QR code. Never shows blank screen. |

### G. Memory Issues (Long-Running)

| Concern | Reality |
|---------|---------|
| **Slide rotation** | `setInterval` with 8s tick — trivial memory. No DOM accumulation (AnimatePresence mode="wait" removes old slide). |
| **onSnapshot listener** | Single persistent listener — minimal memory. Firebase SDK handles reconnection/cleanup. |
| **Image loading** | Slides use `<img>` tags — browser manages image cache. No manual accumulation. |
| **Cache writes** | `localStorage.setItem` on each server data update — single key, overwrites previous. |
| **After 6-12 hours** | ⚠️ **No automatic memory cleanup or page refresh.** The `window.location.reload()` only fires if: (1) content version changes, or (2) offline for 30min. If screen runs for 12h with no changes and stable internet, React state + Firebase SDK stay alive. **No evidence of memory leaks, but also no proactive refresh strategy for long uptime.** |

### H. Reads Per Screen (Ongoing)

| Metric | Reads |
|--------|-------|
| Initial page load | 2 server-side reads |
| onSnapshot listener | 1 persistent read (billed per document change, not per second) |
| Daily "seen" signal | 1 query + 1 write |
| Content version change (reload) | 2 reads (re-fetches on reload) |
| **Per day (no changes)** | **~3 reads + 1 write** (initial load + listener + seen signal) |
| **Per day (5 content updates)** | **~13 reads + 1 write** (initial + 5 reloads × 2 + listener + seen) |

---

## 4. Surface 3: PDF Menu (Printable Export)

### A. URL Type

**No public URL.** PDF is generated client-side in the owner's browser and downloaded as a blob.

**File:** `src/lib/export/menuPdfGenerator.ts`

### B. How It Works

```
Owner clicks "Download PDF" in share modal
    ↓
src/components/templates/main-app/projects/b2cView/shareModal/index.tsx
    ↓
menuPdfGenerator.ts — generates PDF using jsPDF library
    ↓ Input: project items, categories, language, store name, currency
    ↓ Output: Blob (downloaded to owner's device)
    ↓
NO Firestore reads — uses already-loaded project data from React state
```

### C. Customer Impact

- Customer receives a **static printed PDF** — no digital interaction
- No Firestore reads per PDF view
- No offline concern — it's a physical/digital file
- Data accuracy depends on when the PDF was generated

### D. Firebase Reads

**Zero.** PDF generation uses already-loaded project data.

---

## 5. Surface 4: Guest Feedback Page

### A. URL Type

| Pattern | Example |
|---------|---------|
| `/feedback/[projectId]` | `/feedback/1-1738000000-5` |

### B. Data Fetch Flow

**Server Component** using **Firebase Admin SDK** (server-side, not client SDK):

```
src/app/feedback/[projectId]/page.tsx

Step 1: Parse projectId → extract tId, sId
Step 2: Fetch project doc (firestoreAdmin) → check active, not deleted, feedback enabled
    Collection: projects/{tId}/{sId}/{projectId}
    Reads: 1
Step 3: Fetch store info (firestoreAdmin) → store name, feedback settings
    Collection: stores/{sId}
    Reads: 1
Step 4: Render GuestFeedbackForm component
```

### C. Reads Per Load

| Action | Firebase Reads |
|--------|---------------|
| First open | 2 (project doc + store doc) |
| Submit feedback | 2-3 (project verification + store review URL lookup + feedback write) via `/api/public/feedback/submit` |
| Refresh | 2 (same as first open) |

### D. Caching

**None.** No localStorage, no service worker caching, no SWR. Every load fetches fresh.

### E. Offline Behavior

| Scenario | What Happens |
|----------|-------------|
| No internet | ❌ Blank — Server Component fails to fetch |
| Internet drops after form loaded | ⚠️ Form is visible but submit will fail (API call) |

### F. Customer Sees Menu Data?

**No.** This page only shows a feedback form (rating, message, contact fields). No menu items, prices, or categories are displayed.

---

## 6. Surface 5: Platform Website (menulist.ai)

### A. URL Type

| Route | Content |
|-------|---------|
| `menulist.ai/` or `/home` | Landing page |
| `/about-us` | About page |
| `/pricing` | Pricing page |
| `/contact-us` | Contact form |
| `/privacy-policy` | Privacy policy |
| `/terms-of-service` | Terms |
| `/refund-policy` | Refund policy |
| `/trust-security` | Security page |

### B. Customer Impact

**Zero.** These are static marketing pages. No restaurant menu data is loaded or displayed. No Firestore reads for customer data.

---

## 7. Surfaces That Do NOT Exist Yet

Confirmed by codebase search — **no code exists** for:

| Surface | Status | Notes |
|---------|--------|-------|
| **WhatsApp preview** | ❌ No code | No WhatsApp Business API integration. QR menu link shared via WhatsApp just opens the subdomain URL (Surface 1). |
| **Embed / iframe** | ❌ No code | `X-Frame-Options: DENY` is set in middleware (`middleware.ts:74`). Menu cannot be embedded in iframes. |
| **Kiosk / tablet ordering** | ❌ No code | No ordering functionality exists. Menu is view-only. |
| **Public API for menu data** | ❌ No code | Only public API is `/api/public/feedback/submit`. No menu data API. |
| **Shared menu link (separate)** | ❌ Same as QR | The "Share" feature in `shareModal/linkView.tsx` generates the same subdomain URL. No separate sharing mechanism. |
| **Social share preview** | ⚠️ Partial | OpenGraph + Twitter meta tags ARE generated (`page.tsx:225-251`). Social previews show store name + description + logo. But no menu content in preview — just metadata. |

---

## 8. Firebase Cost — Customer Side

### Per Menu Open (QR Scan)

| Read Type | Count | Cost |
|-----------|-------|------|
| Store lookup (subdomain query) | 1 | |
| Project metadata query | 1 | |
| Project data (full doc) | 1 | |
| Store details (full doc) | 1 | |
| Decision blocks | 1 | |
| SEO metadata (duplicate store query) | 1 | |
| Multi-outlet master (if linked) | 0-1 | |
| **Total per menu open** | **5-7 reads** | |

### Per Screen Per Day

| Scenario | Reads | Writes |
|----------|-------|--------|
| No content changes | ~3 | 1 (seen signal) |
| 5 content updates/day | ~13 | 1 |

### Scale Estimates

| Scale | QR Menu (reads/day) | Screens (reads/day) | Total reads/day | Monthly cost |
|-------|--------------------|--------------------|-----------------|-------------|
| **20 restaurants × 50 scans/day** | 20 × 50 × 6 = 6,000 | 20 × 3 = 60 | ~6,060 | ~$0.33 |
| **200 restaurants × 100 scans/day** | 200 × 100 × 6 = 120,000 | 200 × 3 = 600 | ~120,600 | ~$6.52 |
| **1,000 restaurants × 100 scans/day** | 1,000 × 100 × 6 = 600,000 | 1,000 × 3 = 3,000 | ~603,000 | ~$32.56 |
| **1,000 restaurants × 300 scans/day** | 1,000 × 300 × 6 = 1,800,000 | 1,000 × 13 = 13,000 | ~1,813,000 | ~$97.90 |

**Firestore pricing:** $0.06 per 100K reads.

**Conclusion:** Even at 1,000 restaurants with heavy traffic, customer-side reads cost under $100/month. Cost is NOT the concern — **latency and reliability are**.

---

## 9. Failure Scenarios (Honest Assessment)

### Case 1: Firebase Slow (2-5 second response)

| What Happens | Evidence |
|-------------|---------|
| Customer sees **browser loading spinner** (no skeleton, no loading UI) for entire duration | `page.tsx` is an async Server Component — all 5-7 Firestore reads execute sequentially with `await`. The `<Suspense fallback>` at line 440 wraps only the `ClientMenuRenderer`, not the data fetching. The data fetching happens BEFORE the component renders. |
| After data loads, menu appears instantly (client-side is fast) | All data is in React state after hydration |
| **Perception: Slow. Feels broken.** No visual feedback during wait. | No loading skeleton at the server data-fetch layer |

### Case 2: Firebase Fails Completely

| What Happens | Evidence |
|-------------|---------|
| **Store lookup fails** → `notFound()` → Next.js 404 page ("This page could not be found") | `page.tsx:378-380` |
| **Project not found** → Shows simple "Menu Not Found" message with explanation | `page.tsx:389-400` — inline `<div>` with "This restaurant has not configured their menu yet." |
| **Firestore throws error** → Unhandled → Next.js `error.tsx` or `global-error.tsx` error boundary | No try/catch around the main data fetching in `ClientMenuPage`. Error bubbles to Next.js error boundary. |
| **Screen: Firebase fails** → `getScreenDataByToken` returns null → `notFound()` → 404 | `screen/[token]/page.tsx:41-43` |
| **No retry logic exists** for any customer-facing data fetch | No retry, no exponential backoff, no fallback data source |

### Case 3: Project Document Corrupted / Malformed

| What Happens | Evidence |
|-------------|---------|
| **Missing `files` array** → `allCategories` and `allItems` are empty → "No menu items yet" empty state | `menuPageNew.tsx:105-120` — uses optional chaining `projectData?.files?.forEach` |
| **Missing `extractedData`** → Same as above — empty menu | Items extracted via `file.extractedData?.data?.items || []` |
| **Corrupted `config`** → Falls back to defaults | `mainContentRenderer.tsx:32-36` — `projectData?.config?.design?.home?.style || DEFAULTS.home.style` |
| **Missing `languages`** → Defaults to "en" | `clientWebsite/index.tsx:33` — `projectData?.languages?.[0]?.code || "en"` |
| **No crash** — code is defensively written with optional chaining everywhere | All access to project data uses `?.` operators |

### Case 4: Large Menu (150+ items, 4 languages)

| What Happens | Evidence |
|-------------|---------|
| **Data size:** ~150-250 KB project doc transferred to client | All items × all languages × descriptions |
| **Rendering:** All 150 items render in a single scrollable list grouped by category | `menuPageNew.tsx:566-662` — iterates all categories, all items |
| **No virtualization** — all items are in the DOM simultaneously | No `react-virtualized`, no `react-window`, no infinite scroll |
| **Search/filter:** Client-side `useMemo` with string matching — instant for 150 items | `menuPageNew.tsx:260-283` — `Array.filter` with string `includes` |
| **Images:** Lazy-loaded via Next.js `<Image>` component with `fill` + `sizes` | `menuPageNew.tsx:623-636` — with G04 runtime fallback for broken images |
| **Perception: Fast for browsing, acceptable load time** | 150 items is ~150 DOM nodes. Modern browsers handle this easily. The bottleneck is initial data fetch, not rendering. |
| **Memory:** All 150 items in React state (~150-250 KB in memory) | No concern — well within browser limits |

### Case 5: Digital Screen — Extended Uptime (12+ hours)

| What Happens | Evidence |
|-------------|---------|
| Slides continue rotating (8s interval) | `setInterval` in `ScreenDisplay.tsx:157-167` |
| No memory leak evidence — `AnimatePresence mode="wait"` unmounts old slides | React handles cleanup |
| **No proactive refresh** — screen runs indefinitely unless content version changes or goes offline >30min | No `setInterval` for periodic page refresh |
| **Potential concern:** Firebase SDK long-lived `onSnapshot` listener — Firebase recommends periodically closing/reopening for very long sessions | `ScreenDisplay.tsx:171-204` — listener stays open indefinitely |

---

## 10. Summary Matrix

| Surface | Reads/Load | Caching | Offline (new) | Offline (return) | Realtime | Failure Mode |
|---------|-----------|---------|---------------|-----------------|----------|-------------|
| **QR Menu** | 5-7 | PWA service worker (NetworkFirst, 10s timeout, 24h cache) | ❌ Blank | ⚠️ Stale cache | Static (fetch once) | 404 or error boundary |
| **Digital Screen** | 2 | ✅ localStorage cache-first + zero-blank fallback | ❌ 404 | ✅ Cached slides + offline badge | ✅ onSnapshot listener for version changes | Keeps showing cached slides |
| **PDF** | 0 | N/A | N/A | N/A | N/A | N/A |
| **Feedback** | 2 | None | ❌ Blank | ❌ Blank | Static | 404 |

### Key Findings for ChatGPT

**What's strong:**
1. **Digital Screen** has the best infra — cache-first rendering, zero-blank guarantee, real-time updates, offline resilience, daily seen signal
2. **QR Menu** is defensively coded — optional chaining everywhere, graceful fallback for corrupted data, multi-outlet resolution with graceful degradation
3. **PWA service worker** provides offline fallback for returning visitors
4. **Cost is negligible** — even at 1,000 restaurants, customer reads are under $100/month

**What's weak:**
1. **No loading skeleton** during SSR data fetch — customer sees browser spinner for 2-5s on slow connections
2. **No server-side caching** — every page request hits Firestore fresh (5-7 reads). No ISR, no Redis, no CDN cache for menu pages
3. **Duplicate store lookup** — `generateMetadata()` and `ClientMenuPage()` both independently query the stores collection
4. **No retry logic** — if Firestore fails, customer gets 404/error. No exponential backoff, no retry.
5. **No realtime for QR menu** — customer sees stale prices until manual refresh. Owner changes menu → customer doesn't see it until refresh.
6. **Full project doc sent to client** — includes all files, all items (even `active: false`), all metadata. No server-side filtering or projection.
7. **No virtual scrolling** for large menus — 150+ items all in DOM simultaneously
8. **Screen: no proactive refresh** — runs indefinitely without periodic cleanup

---

**Document Version:** 1.0  
**Created:** February 7, 2026  
**Author:** Cascade AI  
**Method:** Every statement traced to specific file and line number in codebase  
**Related Audit:** `__docs__/projects/WRITE-DISCIPLINE-AUDIT.md` (owner-side write paths)
