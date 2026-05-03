# Official Business Page (OBP) — Implementation Plan

**Status:** IMPLEMENTED — 3-Year Freeze  
**Author:** Cascade (Lead Architect)  
**Date:** February 15, 2026 (Created) | March 11, 2026 (Infrastructure Domination Rebuild) | March 18, 2026 (Distribution Strategy Update)  
**Audience:** Developers

---

## 1. Architecture Overview

OBP is a **server-rendered public page** that reads from the existing `stores` collection. No new Firestore collections. No new API routes for the public page itself.

```
Data Flow:
  stores/{storeId}                    ← existing document
    → publicPresence fields           ← new nested object (same doc)
    → OBP Server Component            ← new (SSR, cached)
    → Customer browser                ← static HTML, minimal JS

Routing (when ENABLE_OBP = true):
  subdomain.menulist.ai/              → OBP page (new)
  subdomain.menulist.ai/menu          → Digital Menu (reserved route → default project)
  subdomain.menulist.ai/{slug}        → Specific project menu (existing)

Cache Strategy:
  unstable_cache with per-store tags  ← same pattern as menu page
  60s revalidation                    ← same as existing
  revalidateTag(`store-{storeId}`)    ← instant invalidation on store update
```

---

## 2. Database Schema

### Modified Collection: `stores`

Add `publicPresence` nested object to existing `StoreDataType`:

```typescript
// src/types/platform/store.ts — publicPresence nested object
// Last updated: March 11, 2026 (Infrastructure Domination Session)
publicPresence?: {
    /** Short business descriptor, max 40 chars. e.g. "Modern Indian Kitchen" */
    descriptor?: string;

    /** Accent color hex for OBP buttons/highlights. Auto-detected from logo or manual. */
    accentColor?: string;

    /** WhatsApp number (may differ from phoneNumber). For wa.me link. Include country code. */
    whatsappNumber?: string;

    /** Google Maps URL for directions CTA */
    googleMapsUrl?: string;

    /** Toggle visibility of quick action buttons (all default true) */
    showCall?: boolean;
    showWhatsApp?: boolean;
    showDirections?: boolean;
    showReservation?: boolean;
    showOrder?: boolean;
    showGoogleReview?: boolean;
    showFeedback?: boolean;
    iconVariant?: 'icons' | 'emoji';

    /** Reservation/booking URL (e.g., Dineout, Zomato, OpenTable). For schema.org + CTA. */
    reservationUrl?: string;

    /** Online ordering URL (e.g., Swiggy, Zomato). For schema.org + CTA. */
    orderUrl?: string;

    /** Optional owner-managed short note shown on OBP, max 140 chars. */
    specialNote?: string;

    /** Compliance footer link visibility. Defaults true per link. */
    showPrivacyLink?: boolean;
    showTermsLink?: boolean;
    showRefundLink?: boolean;

    /** Year established. For schema.org foundingDate + "Serving since" on OBP. */
    establishedYear?: number;

    /** Short identity cue, max 40 chars. e.g. "Wood-fired pizza". */
    knownFor?: string;

    /** Google review page URL. For trust badge + link on OBP. */
    googleReviewUrl?: string;

    /** Google star rating (owner-entered, e.g. 4.5). Trust badge on OBP + AggregateRating schema. */
    googleRating?: number;

    /** Google review count (owner-entered, e.g. 320). Shown alongside rating. */
    googleReviewCount?: number;

    /** Owner-managed business photos. First 3 are shown on OBP; tapping opens the full viewer. */
    photos?: string[];

    /** Owner-defined public attribute chips, shown after controlled attributes. */
    customAttributes?: Array<{ id: string; label: string; icon?: string; active?: boolean }>;
};

/** Permanent closure state. When true, OBP shows "Permanently Closed" + disables menu CTA. */
permanentlyClosed?: boolean;
```

**No new collections.** OBP reads from `stores/{storeId}` — the same document that already powers the digital menu page.

**Photo storage path:** `stores/obp-photos/{tenantId}/{storeId}/{timestamp}-photo-{index}.jpg` via `src/database/stores/uploadOBPPhoto.ts`.

### Reserved Slug

The string `"menu"` becomes a reserved slug. When a customer navigates to `subdomain.menulist.ai/menu`, the system routes to the default project (same as current root behavior).

---

## 3. API Contracts

### No new API routes for public OBP page

OBP is a **server component** — data fetched server-side via DAL, no client-side API calls needed.

### Dashboard: Store Update (Existing)

OBP settings are saved as part of the existing store update flow:

```typescript
// Existing: src/database/stores/index.ts → updateStore()
// publicPresence fields saved via standard store update
// requestBodyComposer auto-adds createdOn/modifiedOn
```

No new API routes needed. The existing `updateStore()` DAL function handles all OBP field updates.

---

## 4. File Structure

**Note:** This section was the pre-implementation estimate. See **§16 Complete File Inventory** for the actual final file list with accurate line counts.

All files listed in §16 are implemented and verified.

---

## 5. Security Checklist

| Check                     | Status | Notes                                                      |
| ------------------------- | ------ | ---------------------------------------------------------- |
| No `withAuth()` needed    | ✅     | OBP is a public page (like digital menu)                   |
| No sensitive data exposed | ✅     | Only public store fields rendered                          |
| Rate limiting             | ✅     | Uses existing public page rate limiting via CDN/cache      |
| Zod validation            | N/A    | No user input on public page                               |
| XSS prevention            | ✅     | Server-rendered, no dangerouslySetInnerHTML except JSON-LD |
| Cache invalidation        | ✅     | Per-store `revalidateTag` pattern                          |

**Dashboard settings** (where owner edits publicPresence):

- Uses existing `updateStore()` DAL → already behind auth
- No new API routes = no new auth surface

---

## 6. Implementation Phases

### Phase 1: Core OBP Page (P0) — ✅ COMPLETE

- [x] `ENABLE_OBP` feature flag in `src/config/features.ts`
- [x] `publicPresence` type on `StoreDataType`
- [x] `OBPContent.tsx` — main async server component (~670 lines)
- [x] `OBPSkeleton.tsx` — loading skeleton
- [x] `obp.module.scss` — SCSS styles (mobile-first)
- [x] `schema.ts` — Schema.org JSON-LD with @id, AggregateRating, image array
- [x] `hoursStatus.ts` — open/closed calculator
- [x] `generateOBPUrl.ts` — URL helper
- [x] Routing in `[[...slug]]/page.tsx` — root → OBP, /menu → default project
- [x] OBP metadata: title, description, OG tags, canonical
- [x] `BrandOBPContent.tsx` — multi-store location selector
- [x] `OBPMenuCTA.tsx` — menu CTA with conversion tracking

### Phase 2: Dashboard Integration (P0) — ✅ COMPLETE

- [x] `OBPLinkCard.tsx` — copy link, copy message, dual QR
- [x] `OfficialPageTab.tsx` — full publicPresence settings (photos, reviews, identity, accent color picker, established year)
- [x] `uploadOBPPhoto.ts` — OBP photo upload DAL
- [x] `OBPMetricsCard.tsx` — dashboard analytics card
- [x] `BehaviorNudgeCard.tsx` — link adoption nudge (dismissible)

### Phase 3: Analytics + Polish (P1) — ✅ COMPLETE

- [x] `OBPAnalytics.tsx` — page view tracking (client island)
- [x] `OBPActions.tsx` — action click tracking
- [x] `obpAnalyticsAggregation.ts` — nightly CF aggregation
- [x] First-letter avatar fallback when no logo
- [x] "Menu coming soon" state when no published project
- [x] Mobile PWA: OBP link in MobileShareScreen
- [x] Brand propagation utility (`brandPropagation.ts`)

---

## 7. OBP Page Component Architecture

```
OBPPage.tsx (Server Component — entry point)
  ├── Suspense boundary
  │   ├── OBPSkeleton (fallback)
  │   └── OBPContent (async data fetch)
  │       ├── Identity Block (logo, name, descriptor, status)
  │       ├── Primary CTA ("View Menu" button)
  │       ├── Quick Actions (Call, WhatsApp, Directions)
  │       ├── Info Block (address, hours)
  │       ├── Social Links (Instagram, Facebook, Website)
  │       └── Footer ("Powered by MenuList")
  └── Schema.org JSON-LD script
```

### Data Fetching (in OBPContent)

```typescript
// Reuse existing patterns from _client/[[...slug]]/page.tsx
const storeData = await withRetry(() => withTimeout(getCachedStore(subdomain)));

// Check if store has published menu
const hasMenu = await withRetry(() =>
  withTimeout(getCachedHasPublishedMenu(storeData.tenantId, storeData.storeId)),
);
```

### Visual Hierarchy (CSS)

```
Top 35-40%:  Identity block (logo, name, status) — calm, premium spacing
Middle 25%:  Primary CTA (View Menu button) — prominent, accent color
Next 20%:    Quick action row (Call, WhatsApp, Directions)
Bottom:      Info (address, hours) + Social links + Footer
```

**Total page height:** ~1 to 1.5 mobile screens. Not a long scroll.

---

## 8. Hours Status Logic

Extract and reuse the open/closed calculation:

```typescript
// src/lib/obp/hoursStatus.ts
export function getStoreOpenStatus(
  workingHours?: Record<string, string>,
  timeZone?: string,
): {
  isOpen: boolean;
  statusText: string; // "Open now" or "Closed"
  nextChange?: string; // "Opens 9am" or "Closes 11pm"
} {
  // Use store's timezone, fallback to IST
  // Check today's day against workingHours
  // Parse time ranges (e.g., "09:00-23:00")
  // Return structured status
}
```

This reuses the same logic from `ENABLE_HOURS_STATUS_DISPLAY` feature.

---

## 9. Language Handling

**Updated May 3, 2026** — OBP uses the shared public render-language resolver:

- `?lang=xx` wins when the language is available for the store.
- Otherwise OBP uses `store.defaultLanguage`.
- Otherwise OBP falls back through the normalized store language policy, with English (`en`) as canonical fallback.
- When a store has more than one active public language, OBP renders a compact language switcher.
- OBP menu CTA URLs preserve the current language with `?lang=xx`, so customers land on the menu in the same language.
- OBP language switch links remain URL-based for SEO/AEO and preserve `entry_source` plus intentional `utm_source`, `utm_medium`, and `utm_campaign` parameters. Legacy `src` / `source` query parameters are not preserved or consumed by analytics.
- Language usage analytics are shown only for multi-language OBPs. Page opens carry the active language on the existing OBP view write, and a language adoption is counted only after the switched language remains active for the dwell window. De-dupe is scoped to the store-local analytics day.
- Brand OBP and outlet OBP use the same resolver and selector behavior.
- OBP metadata and JSON-LD resolve localized business copy using the same language.

Primary implementation files:

- `src/lib/localization/publicRenderLanguage.ts`
- `src/app/client/obp/OBPContent.tsx`
- `src/app/client/obp/BrandOBPContent.tsx`
- `src/app/client/obp/OBPLanguageSwitcher.tsx`
- `src/app/client/[[...slug]]/page.tsx`

---

## 10. Public Rendering Hardening

**Updated May 3, 2026** — OBP public rendering now applies these guards:

- Quick actions wrap across rows when Call, WhatsApp, Directions, Reserve, and Order are all enabled.
- Social links use the same social source family as the public menu footer: Instagram, Facebook, X/Twitter, LinkedIn, YouTube, WhatsApp, and Website.
- Menu CTA listing excludes inactive/deleted menus and only includes the currently active special menu, using its base menu URL so the public resolver can apply the special-menu override.
- Business attributes are filtered by business type before display and include compact icon labels.
- Owner-defined custom attributes render after controlled attributes, capped by settings UI.
- OBP photos open an in-page preview on click.
- Privacy, Terms, and Refund footer links are individually show/hide controlled.
- Compliance content can be edited from Official Business Page settings using the existing compliance override API.

Primary implementation files:

- `src/app/client/obp/OBPContent.tsx`
- `src/app/client/obp/OBPPhotoStrip.tsx`
- `src/app/client/obp/OBPExternalLinks.tsx`
- `src/lib/obp/businessAttributes.ts`
- `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx`
- `src/components/templates/main-app/businessSettings/tabs/BusinessAttributesTab.tsx`
- `src/components/mobile/screens/MobileOfficialPageScreen.tsx`
- `src/components/mobile/screens/MobileBusinessAttributesScreen.tsx`

---

## 11. Schema.org Structured Data

**Updated Feb 16, 2026** — Schema enriched with SEO/AEO improvements. Uses shared utilities from `src/lib/schema/index.ts`.

```typescript
// src/app/_client/obp/schema.ts — uses shared utilities
import {
  buildAddress,
  buildGeoCoordinates,
  buildOpeningHours,
  buildSameAs,
  getSchemaType,
} from "@lib/schema";

export function generateOBPSchema(storeData: any, canonicalUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": getSchemaType(storeData?.businessType), // Restaurant, BeautySalon, etc.
    name: storeData.name,
    image: storeData.logo,
    telephone: storeData.phoneNumber,
    url: canonicalUrl,
    currenciesAccepted: storeData.currencyCode,
    priceRange: storeData.priceRange, // $, $$, $$$, $$$$
    address: buildAddress(storeData), // PostalAddress
    geo: buildGeoCoordinates(storeData), // GeoCoordinates (lat/lng)
    openingHoursSpecification: buildOpeningHours(storeData),
    sameAs: buildSameAs(storeData), // Social profile URLs
    dateModified: storeData.modifiedOn, // Freshness signal for AI
    hasMenu: `https://${storeData.subdomain}.menulist.ai/menu`,
  };
}
```

The runtime implementation also accepts the resolved render language so localized `displayName`, `descriptor`, `knownFor`, and description fields match the OBP page language.

**Shared utilities** (`src/lib/schema/index.ts`):

- `buildAddress()` — PostalAddress from store fields
- `buildGeoCoordinates()` — GeoCoordinates from `store.geo.latitude/longitude`
- `buildOpeningHours()` — OpeningHoursSpecification from `store.workingHours`
- `buildSameAs()` — Social profile URLs from `store.socialMedia` + `store.url`
- `buildAmenityFeatures()` — LocationFeatureSpecification from `store.businessAttributes` (BTG Layer 12)
- `buildTempStatusSchema()` — specialOpeningHoursSpecification from `store.tempStatus`
- `getSchemaType()` — Maps `store.businessType` → schema.org subtypes (Restaurant, BeautySalon, etc.)
- `getMenuSchemaType()` — Menu-specific variant (prefers food subtypes)

**OBP-specific schema** (`src/app/_client/obp/schema.ts`):

- `buildPotentialActions()` — ReserveAction + OrderAction with EntryPoint targets
- `buildPaymentAccepted()` — paymentAccepted from businessAttributes (Cash, Credit Card, UPI)
- `acceptsReservations` — Reservation URL (per schema.org spec: Boolean | Text | URL)

**@see** `__docs__/discovery-infrastructure/` for full SEO/AEO strategy
**@see** `__docs__/business-truth-graph/` for BTG layer context

---

## 12. Routing Changes

### Current Flow (`_client/[[...slug]]/page.tsx`)

```
Request: joespizza.menulist.ai/
  → params.slug = undefined
  → getProjectBySlugOrDefault(tId, sId, undefined)
  → returns default project
  → renders ClientMenuRenderer
```

### New Flow (when ENABLE_OBP = true)

```
Request: joespizza.menulist.ai/
  → params.slug = undefined
  → ENABLE_OBP check → true
  → render OBPPage component (identity page)

Request: joespizza.menulist.ai/menu
  → params.slug = ["menu"]
  → "menu" is reserved slug
  → getProjectBySlugOrDefault(tId, sId, undefined)  ← treats as default
  → renders ClientMenuRenderer

Request: joespizza.menulist.ai/food-menu
  → params.slug = ["food-menu"]
  → not reserved, not root
  → existing slug resolution (unchanged)
```

**Key change:** Only the root route (`slug = undefined`) behavior changes. All other routes are unaffected.

---

## 11. Dashboard Link Display

### Business Profile / Command Center (top card)

```
┌────────────────────────────────────────────────┐
│  🔗 Your Official Business Link               │
│                                                │
│  joespizza.menulist.ai                          │
│                                                │
│  [Send via WhatsApp] [Copy Link] [Copy Message] │
│  [Open] [QR]                                    │
│                                                │
│  This is the one link you send to every          │
│  customer. Add it to your Google Business         │
│  Profile (Website field), Instagram bio,          │
│  and packaging.                                   │
└────────────────────────────────────────────────┘
```

**WhatsApp Share (Primary Action):** Opens `wa.me/?text={encoded_message}` with prefilled message: `"{storeName} — menu, timings & contact:\n{obpUrl}"`. Tracked via `OBP_SHARE` event.

**GBP Website Field Guidance:** Hint text below action buttons tells owners to add OBP link as their Google Business Profile "Website" field. This is the highest-leverage external distribution surface — all Google Maps visitors route through OBP.

### After Menu Publish (toast)

```
"Your business is live at joespizza.menulist.ai"
```

### Menu Editor Header

Small inline:

```
Public Link: joespizza.menulist.ai [copy icon]
```

---

## 12. Performance Targets

| Metric                | Target              | Implementation                       |
| --------------------- | ------------------- | ------------------------------------ |
| Mobile LCP (India 4G) | < 1.5s              | SSR, minimal JS, no heavy images     |
| Page weight           | < 50KB (excl. logo) | CSS modules, no animation library    |
| Logo optimization     | < 20KB              | next/image with quality=75, width=96 |
| Cache TTL             | 60s                 | unstable_cache, per-store tags       |
| TTFB                  | < 500ms             | Server component, Firestore cache    |

---

## 13. Testing Guide

### Manual Testing

1. **OBP renders correctly:**
   - Enable `ENABLE_OBP: true`
   - Visit `subdomain.menulist.ai/` → should show OBP
   - Check: logo, name, status, View Menu button, actions, info, footer

2. **Menu still accessible:**
   - Visit `subdomain.menulist.ai/menu` → should show digital menu
   - Visit `subdomain.menulist.ai/food-menu` → should show specific project

3. **Feature flag off:**
   - Set `ENABLE_OBP: false`
   - Visit `subdomain.menulist.ai/` → should show digital menu (current behavior)

4. **Missing data graceful handling:**
   - Store with no address → directions button hidden
   - Store with no phone → call button hidden
   - Store with no logo → first-letter avatar shown
   - Store with no published menu → "Menu coming soon" button

5. **Dashboard integration:**
   - Business Profile shows link card
   - Copy button copies correct URL
   - QR downloads correctly

6. **Custom domain:**
   - `joespizza.com/` → shows OBP (when enabled)
   - `joespizza.com/menu` → shows digital menu

### Performance Testing

- Lighthouse mobile audit: target 90+ performance score
- Test on 3G throttled connection
- Verify < 1.5s LCP on India 4G

---

## 14. Architecture Decision Records (ADR)

### ADR-1: OBP at Subdomain Root (Not Path-Based)

**Decision:** OBP lives at `subdomain.menulist.ai/` (root), not `menulist.ai/businessname` (path).

**Rationale:** Existing infrastructure uses subdomains with middleware routing, DNS configuration, and Firestore queries. Path-based would require new routing infrastructure and conflict with existing slug system.

### ADR-2: No Per-Owner Toggle

**Decision:** OBP is always ON when feature flag is enabled. No per-store opt-out.

**Rationale:** Constitution Law 1 (Default Authority) — MenuList decides by default. A toggle adds a decision, violating Law 6 (No Cognitive Load). Infrastructure is consistent — Google Business doesn't let you opt out.

### ADR-3: "menu" as Reserved Slug

**Decision:** `/menu` is a reserved route that always shows the default project's digital menu.

**Rationale:** When OBP takes the root URL, the existing digital menu needs a permanent, predictable URL. "menu" is intuitive and matches the "View Menu" CTA text.

### ADR-4: No New Firestore Collections

**Decision:** OBP data stored as `publicPresence` nested object on existing stores document.

**Rationale:** Store document already has 90% of needed data. Adding a nested object avoids extra reads and keeps data co-located. Zero additional Firebase cost.

### ADR-5: Server Component (Not Client)

**Decision:** OBP is a React Server Component, same pattern as digital menu page.

**Rationale:** No interactivity needed on OBP. Server rendering gives fastest LCP, smallest JS bundle, and best SEO. Action buttons (call, WhatsApp, directions) use native `tel:`, `https://wa.me/`, and Maps URLs — no client JS needed.

### ADR-6: Store-Level Rendering, No Tenant Fetch

**Decision:** OBP reads from `stores` collection only. Tenant document is never fetched during public page rendering.

**Rationale:** Store has all needed identity data (logo, name, address, hours, contact). Reading from one collection (cached 60s) keeps cost at 1 read per page view. Tenant is an account container (billing, storesList, outlet locks) — not a rendering source.

**Multi-chain implication:** Master store's OBP serves as the chain-level link. Outlets inherit brand identity (logo, phone, currency, timezone) from master at creation time. No separate tenant-level OBP needed.

### ADR-7: Outlet Brand Identity Inheritance

**Decision:** When creating an outlet, copy `logo`, `phoneNumber`, `currencyCode`, `currencySymbol`, `country`, `timeZone`, `defaultLanguage` from master store.

**Rationale:** Outlets must render correctly (menus, OBP) without fetching tenant or master store data. Brand identity is static (rarely changes). Location-specific fields (name, address, workingHours) are set by outlet owner later. If master changes logo, propagation to outlets is a separate operation (controlled by `outletPolicy.allowBrandingOverride`).

**Implementation:** `src/app/api/outlets/create/route.ts` — 7 fields added to outlet store document creation.

### ADR-8: SCSS Modules Only for Public OBP Page (No antd, No Framer, No shadcn)

**Decision:** Public OBP page uses SCSS modules only. No antd, no Framer Motion, no shadcn.

**Rationale:** OBP is a server component with zero interactivity. Adding Framer Motion (~30KB) or shadcn (client components) would add unnecessary JS bundle weight. OBP's target is <50KB total page weight for India 4G. Action buttons are native `<a href>` tags — no client JS needed. Dashboard OBP components (OBPLinkCard, OfficialPageTab) use antd since they're part of the dashboard.

**User's rule context:** User has a general rule "use Framer Motion + Tailwind + shadcn for customer-facing screens." We agreed OBP is an exception because it's a zero-JS server component where bundle size is critical.

### ADR-9: OBP as First-Class Analytics Layer (Full Parity with Digital Menu)

**Decision:** OBP analytics use `projectId='obp'` as a virtual project in the existing `analytics` collection AND have the exact same aggregation pipeline as digital menu analytics.

**Rationale:** The existing analytics system requires `{tId}_{sId}_{projectId}_daily_{date}` document keys. Using 'obp' as a virtual projectId lets us reuse 100% of existing infrastructure (trackEvent, daily doc writes, rate limiting, debouncing) without any new collections. But beyond just tracking, OBP needs the same depth of analytics display — owners who focus on OBP before publishing a menu must see their weekly/monthly views, trends, and comparisons.

**Full pipeline (identical structure to menu, different field names):**

| Layer       | Document                          | Written By                                         | Read By                                 |
| ----------- | --------------------------------- | -------------------------------------------------- | --------------------------------------- |
| Daily doc   | `{tId}_{sId}_obp_daily_{date}`    | Client tracking (`trackOBPView`, `trackOBPAction`) | Frontend DAL                            |
| Weekly doc  | `{tId}_{sId}_obp_weekly_{week}`   | Nightly CF (`aggregateOBPForStore`)                | Frontend DAL (future)                   |
| Monthly doc | `{tId}_{sId}_obp_monthly_{month}` | Nightly CF                                         | Frontend DAL (future)                   |
| Summary doc | `{tId}_{sId}_obp_overall_summary` | Nightly CF                                         | Frontend DAL (`getOBPDashboardOverall`) |

**Summary doc namespaces:** `weekly` (current week metrics + viewsChange), `monthly` (current month metrics), `previousWeek` (for comparison), `lifetime` (all-time counters with dedup via `lastProcessedDate`).

**OBP source attribution:** Share surfaces append canonical `entry_source` parameters to OBP and direct-menu links. `OBP_VIEW` stores internal source attribution in `viewsByEntrySource`; existing OBP action, View Menu, and external-link click writes attach `obpActionClicksBySource`, `obpMenuClicksBySource`, and `obpLinkClicksBySource`. External campaign parameters are separate: `utm_source`, `utm_medium`, and `utm_campaign` populate `viewsBySource`, `viewsByMedium`, and `viewsByCampaign` only when intentionally supplied. Legacy `src` / `source` query parameters are not part of the analytics contract. This gives owners visitor-source context without adding a separate source event or extra write path.

**OBP language usage:** Multi-language OBPs attach `obpViewsByLanguage`, `obpSessionsByLanguage`, and `obpLanguageNames` to the existing OBP view write. `obpLanguageAdoptions` is a separate dwell-gated adoption event so quick accidental language taps are ignored. Single-language OBPs do not track or display language usage.

**OBP field names vs Menu field names:** OBP uses `totalOBPViews`, `totalOBPActionClicks`, `obpActionClicks.{call|whatsapp|directions}`. Menu uses `totalViews`, `totalClicks`, block metrics. Different field names because OBP and menu have fundamentally different metric types. The aggregation pipeline structure is identical — just the fields differ.

**Why not reuse menu's `aggregateDailyDocs`?** Menu aggregation expects `totalViews`, `totalClicks`, `decisionBlocksRendered`, etc. OBP has completely different fields. Sharing the aggregator would require complex field mapping with no benefit. Separate, clear OBP aggregation is simpler and more maintainable.

### ADR-10: Brand Propagation on Master Save (Client-Side, Not Cloud Function)

**Decision:** Brand propagation runs client-side in Business Settings after `updateStore()` succeeds, not as a Cloud Function.

**Rationale:** Brand changes are rare (logo changes maybe once a year). Running a Cloud Function for this would be over-engineering. The client-side approach: (1) detects brand field changes via `extractBrandChanges()`, (2) propagates to outlets via `propagateBrandToOutlets()`, (3) non-blocking (`.catch(() => {})`). If propagation fails, the next master store save will retry. Controlled by `outletPolicy.allowBrandingOverride` — if true, outlets keep their own branding.

### ADR-11: Tenant = Account Container, Store = Rendering Source

**Decision:** `TenantDataType` was cleaned up to separate account-level fields from platform-admin-only fields. Store is the single rendering source for all public surfaces (menus, OBP).

**Rationale:** In the current codebase: (1) Logo is uploaded directly to store via Business Settings → `updateStore()`. Tenant `logo` field is never written in normal flow. (2) Onboarding creates tenant with minimal fields (name, email, businessType). (3) Outlet creation copies brand identity from master store, not tenant. Therefore, tenant is purely an account container (tenantId, storesList, outlet locks, billing). All rendering reads from store only. Platform-admin fields (logo, address, contact, locale) kept on tenant type as optional for the internal admin editor (`tenantDetailsModal.tsx`).

**Why not remove tenant identity fields entirely?** The platform admin modal (`tenantDetailsModal.tsx`) uses all fields. Removing them would break the internal admin tool. Making them optional is the correct balance.

### ADR-12: OBP is a Link System, Not a Page System

**Decision:** OBP is defined internally as "the canonical public endpoint of a business" — a link replacement protocol, not a page/profile/site.

**Rationale:** Future pressure will attempt to turn OBP into a mini-website, landing page, or marketing tool (themes, content blocks, galleries, SEO pages). This ADR explicitly locks the positioning: OBP replaces the act of responding to customers with fragmented links. It is not a page system. It is the single link owners send for everything — menu, hours, location, contact. If OBP ever becomes a page builder, the infrastructure positioning collapses.

**Enforcement:** Any feature request that increases variance across OBP pages (customization, content blocks, per-business layouts) must be rejected. Uniformity across all OBP pages = predictability = trust = habit formation.

### ADR-13: WhatsApp-First Share as Primary Distribution Action

**Decision:** "Send via WhatsApp" is the primary share action in OBPLinkCard, positioned before Copy Link.

**Rationale:** India SMB owners communicate with customers primarily via WhatsApp. "Copy Link" requires: copy → open WhatsApp → paste → type. "Send via WhatsApp" requires: tap → WhatsApp opens → message ready → send. One-tap sharing removes the decision of _how_ to share and makes OBP distribution a reflex. The `wa.me/?text=` deep link prefills a neutral message: `"{storeName} — menu, timings & contact:\n{obpUrl}"`. Copy Link and Copy Message remain as secondary actions for non-WhatsApp contexts.

**Tracking:** `OBP_SHARE` event with `shareMethod: 'whatsapp' | 'copy_link' | 'copy_message'` in `trackOBPShare()`. Measures distribution behavior — the key adoption metric.

---

## 15. Firebase Cost Estimation

See `official-business-page_firebase.md` for detailed cost tracking.

**Summary:** 1 Firestore read per OBP page view (cached 60s). At 1000 daily views = ~30 reads/day = negligible cost. Analytics adds 1 write per view (rate-limited). Brand propagation adds 1 write per outlet on rare brand changes.

---

## 16. Complete File Inventory

### New Files Created (This Feature)

| File                                                           | Purpose                                                  | Lines |
| -------------------------------------------------------------- | -------------------------------------------------------- | ----- |
| `src/app/_client/obp/OBPContent.tsx`                           | Main OBP async server component (SSR)                    | ~670  |
| `src/app/_client/obp/OBPSkeleton.tsx`                          | Loading skeleton for Suspense                            | ~70   |
| `src/app/_client/obp/obp.module.scss`                          | SCSS styles (mobile-first)                               | ~305  |
| `src/app/_client/obp/schema.ts`                                | Schema.org JSON-LD (@id, AggregateRating, image array)   | ~220  |
| `src/app/_client/obp/OBPAnalytics.tsx`                         | Client island for page view tracking                     | ~50   |
| `src/app/_client/obp/OBPActions.tsx`                           | Client component for action click tracking               | ~112  |
| `src/app/_client/obp/OBPMenuCTA.tsx`                           | Client component for menu CTA with conversion tracking   | ~40   |
| `src/app/_client/obp/BrandOBPContent.tsx`                      | Multi-store brand OBP (location selector)                | ~225  |
| `src/lib/obp/hoursStatus.ts`                                   | Open/closed status calculator                            | ~152  |
| `src/lib/obp/generateOBPUrl.ts`                                | URL generation helpers                                   | ~39   |
| `src/database/multiOutlet/brandPropagation.ts`                 | Brand identity propagation utility                       | ~106  |
| `src/database/stores/uploadOBPPhoto.ts`                        | OBP photo upload to Firebase Storage                     | ~70   |
| `src/components/.../businessSettings/OBPLinkCard.tsx`          | Dashboard link card (copy link, copy message, dual QR)   | ~175  |
| `src/components/.../businessSettings/tabs/OfficialPageTab.tsx` | Full publicPresence settings (photos, reviews, identity) | ~390  |
| `src/components/.../OwnerDashboard/OBPMetricsCard.tsx`         | Dashboard OBP analytics card                             | ~100  |
| `functions/src/analytics/obpAnalyticsAggregation.ts`           | Nightly OBP analytics aggregation                        | ~120  |

### Files Modified

| File                                                  | Change                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/config/features.ts`                              | Added `ENABLE_OBP: false`                                                      |
| `src/types/platform/store.ts`                         | Full `publicPresence` (15 fields) + `permanentlyClosed`                        |
| `src/types/platform/tenant.ts`                        | Cleaned up — account vs platform-admin fields                                  |
| `src/app/_client/[[...slug]]/page.tsx`                | OBP routing + AEO canonical title (`Name — Menu, Hours, Contact`)              |
| `src/lib/analytics/unified.ts`                        | OBP_VIEW, OBP_ACTION_CLICK, OBP_MENU_CLICK, OBP_SHARE events + trackOBPShare() |
| `src/database/ownerDashboard/index.ts`                | Added `getOBPMetrics()` DAL function                                           |
| `src/components/.../businessSettings/index.tsx`       | Wired OBPLinkCard + OfficialPageTab + brand propagation                        |
| `src/components/.../businessSettings/tabs/index.ts`   | Exported OfficialPageTab                                                       |
| `src/components/.../OwnerDashboard/index.tsx`         | Added OBPMetricsCard                                                           |
| `src/components/mobile/screens/MobileShareScreen.tsx` | Added OBP link + QR section                                                    |
| `src/app/api/outlets/create/route.ts`                 | Brand identity copy from master (7 fields)                                     |
| `functions/src/decisionBlocksScoring.ts`              | Wired OBP analytics aggregation task                                           |
| `functions/src/constants/features.ts`                 | Added `ENABLE_OBP_ANALYTICS: false`                                            |

---

**Document Signature:** Cascade (Lead Architect)  
**Last Updated:** March 18, 2026 (Distribution Strategy Update — ADR-12, ADR-13, WhatsApp share, OBP_SHARE tracking)
