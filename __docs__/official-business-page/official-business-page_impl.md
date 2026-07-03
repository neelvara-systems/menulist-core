# Official Business Page (OBP) — Implementation Plan

**Status:** IMPLEMENTED — 3-Year Freeze  
**Author:** Cascade (Lead Architect)  
**Date:** February 15, 2026 (Created) | March 11, 2026 (Infrastructure Domination Rebuild) | March 18, 2026 (Distribution Strategy Update) | May 10, 2026 (Business Cover Update) | June 30, 2026 (Mobile Link Copy Acknowledgement)
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

    /** Google star rating (owner-entered, e.g. 4.5). Trust badge on OBP; not emitted as AggregateRating schema. */
    googleRating?: number;

    /** Google review count (owner-entered, e.g. 320). Shown alongside rating; not emitted as AggregateRating schema. */
    googleReviewCount?: number;

    /** Owner-managed cover image shown at the top of the Official Business Page. */
    businessCover?: string;

    /** Owner-managed business photos. First 3 are shown on OBP; tapping opens the full viewer. */
    photos?: string[];

    /** Owner-defined public attribute chips, shown after controlled attributes. `icon` supports legacy short text plus category icon picker values: `lu:*` or `emoji:*`. */
    customAttributes?: Array<{ id: string; label: string; icon?: string; active?: boolean }>;
};

/** Permanent closure state. When true, OBP shows "Permanently Closed" + disables menu CTA. */
permanentlyClosed?: boolean;
```

**No new collections.** OBP reads from `stores/{storeId}` — the same document that already powers the digital menu page.

**Media storage paths:** OBP cover and gallery uploads use the shared media system:

- Cover: `media/businessCover/{tenantId}/{storeId}/official-page-cover/{mediaId}_hero.webp`
- Gallery: `media/galleryImage/{tenantId}/{storeId}/gallery-{index}/{mediaId}_full.webp`

Both are wired through `src/database/stores/uploadOBPPhoto.ts` and `src/database/storage/uploadPreparedMediaImage.ts`.

`deleteOBPPhotos()` keeps old-photo cleanup best-effort after the related store save succeeds. Failed cleanup deletes use bounded Storage diagnostics with counts and URL length metadata only; raw Storage URLs and provider errors are not direct-console logged.

Desktop and mobile public-output failures use the same bounded boundary. `OBPLinkCard` logs `obp_link_card_default_project_load_failed`, `obp_link_card_copy_failed`, `obp_link_card_copy_message_failed`, `obp_link_card_whatsapp_open_failed`, `obp_link_card_open_failed`, `obp_link_card_qr_download_failed`, and `obp_link_card_share_tracking_failed` with store/tenant, OBP/menu URL presence-length metadata, QR type, message lengths, fixed share method values, and clipboard/fallback support booleans only. Its Copy Link and Copy Message success feedback plus `copy_link`/`copy_message` share tracking run only after Clipboard API success or acknowledged textarea fallback success, so failed browser handoffs do not record false owner share actions. `GoogleListingGuide` logs `google_listing_guide_link_copy_failed`, `google_listing_guide_profile_kit_copy_failed`, and `google_listing_guide_open_failed` with subdomain/custom-domain/OBP URL presence-length metadata, profile-kit line count, owner-text presence booleans, and clipboard/fallback support booleans only; link and profile-kit copy success feedback waits for Clipboard API success or acknowledged textarea fallback success. The legacy Custom Domain tab logs `desktop_custom_domain_open_failed`, `desktop_custom_domain_link_copy_failed`, and `desktop_custom_domain_dns_copy_failed` with bounded domain, copy URL, DNS record metadata, and clipboard/fallback support booleans only; active-domain and DNS copied feedback waits for Clipboard API success or acknowledged textarea fallback success. Business Settings marks the Google listing as updated only after `updateStore()` acknowledgement; rejected writes use `desktop_official_page_google_link_store_update_rejected` and route through `desktop_official_page_google_link_update_failed`. The embedded Business Settings Presence Monitor logs `business_settings_presence_screen_links_load_failed` with bounded store, tenant, subdomain/custom-domain, OBP URL, and menu-presence metadata only; official-link copy is owned by the shared Presence Monitor instead of an embedded direct-copy fallback. Owner Dashboard official-link cards use the same store diagnostic boundary: `GoogleListingCard` logs `owner_dashboard_google_listing_copy_failed`, `owner_dashboard_google_listing_open_failed`, and `owner_dashboard_google_listing_mark_done_failed`, waits for acknowledged official-link copy before copied feedback, and requires `owner_dashboard_google_listing_store_update_rejected` acknowledgement before local updated state or save success copy; `BehaviorNudgeCard` logs `owner_dashboard_behavior_nudge_dismiss_load_failed`, `owner_dashboard_behavior_nudge_dismiss_save_failed`, and `owner_dashboard_behavior_nudge_copy_failed`, and waits for acknowledged official-link copy before copied feedback. These desktop paths must not log raw generated public URLs, owner-entered business text, generated share messages, DNS/domain values, analytics payloads, dismiss keys, store IDs, tenant IDs, or browser exception text.

Mobile Official Page media and public-output failures use the same boundary. `MobileOfficialPageScreen` logs `mobile_official_page_cover_prepare_failed`, `mobile_official_page_cover_upload_failed`, `mobile_official_page_cover_generate_failed`, `mobile_official_page_photo_prepare_failed`, `mobile_official_page_photo_upload_failed`, `mobile_official_page_link_copy_failed`, and `mobile_official_page_native_share_failed` with bounded store, tenant, file-name length/presence, photo index/count, media-presence metadata, official-page URL presence/length, selected-project presence/length, copy/share label/value presence/length, language presence, project count, native-share support, and clipboard/fallback support booleans only. Its public-link copied feedback waits for Clipboard API success or acknowledged textarea fallback success, so failed browser handoffs do not show false copied feedback.

Public link safety boundary: OBP customer-facing actions, external social links, Google review links, Schema.org `sameAs`/ReserveAction/OrderAction targets, customer app manifest shortcuts, and PWA directions/reservation/order handoffs must normalize stored owner URLs before public output. `src/lib/obp/publicLinks.ts` accepts only HTTPS public URLs, constrains Google Maps and Google review URLs to Google-owned hosts/paths, constrains social profile links to their matching platform hosts, rejects credentials and oversized values, and hides invalid/stale stored strings instead of emitting unsafe `href`, manifest, redirect, or JSON-LD targets. Source gate: `npm run verify:official-business-page-boundary`.

Brand OBP public path safety is owned by URL routing. `BrandOBPContent`, outlet OBP breadcrumbs/menu prefixes, client menu outlet canonical redirects, and tenant sitemap outlet entries must use `normalizePublicOutletSlug()` before emitting outlet paths. OBP menu CTA project links and default menu links must receive slugs normalized through `normalizePublicProjectSlug()` before public URL construction. Invalid legacy `outletSlug` or `project.slug` values are hidden from public links and sitemaps instead of being rendered. Source gate: `npm run verify:url-routing-boundary`.

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

Mobile owner saves use the same path and must require the shared store-write acknowledgement before the UI treats OBP changes as saved. Failed `MobileOfficialPageScreen` saves must log `mobile_official_page_save_failed` with bounded store, tenant, localized-language count, photo count, delete-queue count, cover presence, and special-note presence metadata before showing fixed owner-facing copy.

### Extraction-Derived Business Attribute Defaults

**Updated May 10, 2026** — Menu extraction can now suggest OBP business attributes as owner-editable defaults.

This does **not** make AI the source of truth:

- The controlled inference allowlist lives in `src/data/shared/businessAttributeInference.ts`.
- The exact same file is mirrored to `functions/src/sharedData/businessAttributeInference.ts` for Cloud Functions.
- First extraction auto-save applies missing `store.businessAttributes` defaults server-side in `functions/src/logic/processMenuImagesJob.ts`.
- Re-extraction applies the same defaults only after the owner approves changes in the desktop/mobile review flow.
- Existing owner values win. If the owner already set an attribute to `true` or `false`, extraction does not override it.
- AI suggestions must be explicit positive suggestions with `confidence: "high"`. Dietary tags also use deterministic taxonomy matching for `vegetarian`, `vegan`, `halal`, and `glutenFree`.
- The server-side first-extraction path revalidates the same public cache tags as owner saves: `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`.

Primary implementation files:

- `src/data/shared/businessAttributeInference.ts`
- `functions/src/sharedData/businessAttributeInference.ts`
- `src/lib/obp/inferBusinessAttributesFromMenu.ts`
- `functions/src/logic/businessAttributeDefaults.ts`
- `functions/src/logic/publicCacheRevalidation.ts`
- `functions/src/logic/processMenuImagesJob.ts`
- `src/lib/extraction/applyChanges.ts`

Client-side owner-approved re-extraction paths must also require the store DAL acknowledgement before local public attribute state changes. Desktop Projects uses `menu_upload_business_attributes_store_update_rejected`; Mobile Menu uses `mobile_menu_business_attributes_default_store_update_rejected`. Both route through their existing bounded menu-processing/mobile-menu failure diagnostics and do not show raw provider or exception text.

### Public Menu Entry OBP Defaults

**Updated June 3, 2026** — When `/create-menu` claim converts an owner-bound draft into a real store/project, the claim route also applies first-run OBP defaults from real extracted or owner-confirmed data:

- `publicPresence.descriptor` from resolved business type, except canonical `Other`.
- `publicPresence.accentColor` from extracted brand color.
- `publicPresence.whatsappNumber` from the owner-confirmed public phone/WhatsApp number.
- Call, WhatsApp, Directions, and Feedback visibility defaults are enabled when the matching real data exists.
- `businessAttributes` is filled from explicit high-confidence extraction suggestions and deterministic menu dietary tags.

This keeps the starter OBP from looking empty while preserving the public truth contract:

- Unpaid, unexpired starter OBPs show inactive placeholders for missing public profile/action slots such as Call, WhatsApp, Directions, Reserve, Order, Reviews, Instagram, Facebook, YouTube, and Website.
- Sparse unpaid starter OBPs use a compact centered desktop layout instead of the full two-column desktop grid, preventing empty left/right whitespace when the business has not added cover photos, gallery photos, map embed, or menu project images yet.
- Sparse unpaid starter OBPs may also show inactive Service Options and Payment Options preview tiles. These tiles are visual setup placeholders, not stored `businessAttributes`.
- Menu CTAs render a deterministic placeholder thumbnail when a project image is missing, so the menu card/CTA stays visually balanced without a Storage upload or generated image.
- Placeholder controls are presentation-only buttons. They do not write fake store data, do not use MenuList-owned WhatsApp/Instagram/website/social links, and do not navigate outbound.
- Paid/live stores show only real owner-configured data. Placeholders are removed once `activePlanType` exists or `starterActivationStatus` is `active_paid`.

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
- [x] `schema.ts` — Schema.org JSON-LD with @id, normalized phone, bounded price range, temporary closure hours, and image array
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

June 29 follow-up: `OBPMenuCTA.tsx` secondary project cards still start the OBP menu-click and project-switch tracking calls together before navigation, but the combined tracking promise now rejects if either analytics write rejects. `trackBeforeNavigate()` still keeps customer navigation non-blocking and logs bounded `public_link_navigation_tracking_failed` diagnostics for failed tracking attempts.

June 30 analytics follow-up: OBP action, menu CTA, and external-link tracking receive the rendered hours state (`open`, `closed`, or `unknown`) and attach it to the existing analytics click write. This powers owner dashboard "actions while closed" detail without heartbeat tracking, session-duration tracking, or a separate Firestore event path.

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
// Reuse existing patterns from client/[[...slug]]/page.tsx
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

**Updated May 9, 2026** — OBP public rendering now applies these guards:

- Quick actions wrap across rows when Call, WhatsApp, Directions, Reserve, and Order are all enabled.
- Social links use the same social source family as the public menu footer: Instagram, Facebook, X/Twitter, LinkedIn, YouTube, WhatsApp, and Website.
- Menu CTA listing excludes inactive/deleted menus and only includes the currently active special menu, using its base menu URL so the public resolver can apply the special-menu override.
- Business attributes are filtered by business type before display and include compact icon labels.
- Owner-defined custom attributes render after controlled attributes, capped by settings UI, and support the shared category icon/emoji picker on desktop and mobile.
- Customer quick answers render visibly from already-visible facts only: today hours, address, menu availability, WhatsApp availability, and directions availability. They do not add hidden FAQ schema, crawl external sources, or claim that menus are always current.
- OBP photos open an in-page preview on click.
- Privacy, Terms, and Refund footer links are individually show/hide controlled.
- Footer utility links/actions and compact MenuList attribution render as separate cards so platform branding stays quiet and terminal spacing stays controlled. The branding card is omitted for Premium stores through the shared MenuList attribution policy; non-Premium and missing plan data keep it visible.
- Compliance content can be edited from Official Business Page settings using the existing compliance override API.
- Business attribute defaults can be filled from high-confidence extraction evidence, but owner-entered `true`/`false` values remain authoritative. Client-side desktop/mobile default application requires acknowledged store writes before local state changes.

Primary implementation files:

- `src/app/client/obp/OBPContent.tsx`
- `src/app/client/obp/OBPPhotoStrip.tsx`
- `src/app/client/obp/OBPExternalLinks.tsx`
- `src/lib/obp/businessAttributes.ts`
- `src/lib/obp/inferBusinessAttributesFromMenu.ts`
- `src/data/shared/businessAttributeInference.ts`
- `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx`
- `src/components/templates/main-app/businessSettings/tabs/BusinessAttributesTab.tsx`
- `src/components/mobile/screens/MobileOfficialPageScreen.tsx`
- `src/components/mobile/screens/MobileBusinessAttributesScreen.tsx`

Mobile business attribute failure boundary: `MobileBusinessAttributesScreen` uses the shared `updateStore()` path and must log `mobile_business_attributes_save_failed` with bounded store, tenant, business-type, enabled-count, custom-count, and previous-custom-presence metadata before restoring previous public attributes on failed saves. Mobile Menu extraction-derived default application uses the same acknowledgement rule before local public attribute state changes. It must not show raw server or exception text to owners.

Desktop Projects extraction failure boundary: accepted menu-intake business-detail suggestions update store identity fields through the shared `updateStore()` path. That save must require `assertStoreUpdateSucceeded()` before local `storeDetails` changes. Rejected writes use `projects_page_upload_business_details_store_update_rejected` and route through `projects_page_upload_business_details_update_failed` with fixed owner copy.

Desktop Domain Settings failure boundary: `DomainSettingsTab` writes the public subdomain through the parent Business Settings `updateStore()` callback. The tab must wait for that callback before updating local availability/public-link state; the parent must require `assertStoreUpdateSucceeded()` with `desktop_domain_settings_subdomain_store_update_rejected` before local store state changes. Failed saves log `desktop_domain_settings_subdomain_save_failed` with fixed owner copy. Desktop and mobile Domain Settings copied feedback for public links and DNS records must wait for Clipboard API success or acknowledged textarea fallback success; failed copy diagnostics include bounded clipboard/fallback support metadata without logging raw browser errors.

Desktop B2C editor Official Page failure boundary: `B2CView` can save project design plus `publicPresence` and optional `businessCopyMeta` when publishing public-page changes from the desktop B2C editor. The project publish must require `assertProjectUpdateSucceeded()` before local published project state, success copy, or post-publish verification setup changes; rejected project acknowledgements use `projects_b2c_publish_project_update_rejected`. The store save must require `assertStoreUpdateSucceeded()` before local store state, queued OBP photo cleanup, or publish success copy changes. Rejected store writes use `projects_b2c_official_page_store_update_rejected`, and publish failures log `projects_b2c_publish_failed` with fixed owner copy.

Mobile Official Page failure boundary: `MobileOfficialPageScreen` uses `updateStore()`, `uploadOBPCover()`, `uploadOBPPhoto()`, and best-effort `deleteOBPPhotos()` for the same publicPresence fields as desktop. Save, cover prepare/upload/generate, photo prepare/upload, public-link copy, and native-share failures must log the bounded `mobile_official_page_*` diagnostics and keep owner-facing copy fixed. Successful saves require `assertStoreUpdateSucceeded()` before photo cleanup, saved baselines, or success copy; public-link copied feedback must wait for Clipboard API success or acknowledged textarea fallback success, with failed copy diagnostics recording only bounded clipboard/fallback support metadata. Public cache invalidation, Storage paths, delete cleanup behavior, OBP link generation, QR sheet behavior, preview opening, and share success remain on the existing shared DAL/helper paths.

---

## 11. Schema.org Structured Data

**Updated June 2, 2026** — Schema remains focused on visible public business facts. OBP uses shared utilities from `src/lib/schema/index.ts`, resolves `businessCategory` from `src/data/shared/businessTypes.ts`, and only emits a public catalog link when OBP has an active published project. OBP runtime no longer emits generated hidden FAQPage JSON-LD; FAQ schema is reserved for pages where FAQ content is visibly rendered and reviewed as useful content.

```typescript
// src/app/client/obp/schema.ts — uses shared utilities
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
    "@type": getSchemaType(storeData?.businessType, storeData?.businessCategory), // Restaurant, BeautySalon, Store, LocalBusiness, etc.
    name: storeData.name,
    image: storeData.logo,
    telephone: buildSchemaTelephone(storeData),
    url: canonicalUrl,
    currenciesAccepted: storeData.currencyCode,
    priceRange: buildSchemaPriceRange(storeData.priceRange), // $, $$, $$$, $$$$ when under Google display limit
    address: buildAddress(storeData), // PostalAddress
    geo: buildGeoCoordinates(storeData), // GeoCoordinates (lat/lng)
    openingHoursSpecification: buildOpeningHours(storeData),
    sameAs: buildSameAs(storeData), // Social profile URLs
    dateModified: storeData.modifiedOn, // Freshness signal for AI
    ...buildPublicCatalogUrlSchema(
      hasPublishedMenu ? `${canonicalUrl}/menu` : undefined,
      storeData?.businessType,
      storeData?.businessCategory,
    ),
  };
}
```

The runtime implementation also accepts the resolved render language so localized `descriptor`, `knownFor`, and description fields match the OBP page language. Brand identity comes from `tenantName`; store/location identity comes from `store.name`.

**Shared utilities** (`src/lib/schema/index.ts`):

- `buildAddress()` — PostalAddress from store fields
- `buildGeoCoordinates()` — GeoCoordinates from `store.geo.latitude/longitude`
- `buildOpeningHours()` — OpeningHoursSpecification from `store.workingHours`
- `buildSameAs()` — Social profile URLs from `store.socialMedia` + `store.url`
- `buildAmenityFeatures()` — LocationFeatureSpecification from `store.businessAttributes` (BTG Layer 12)
- `buildTempStatusSchema()` — specialOpeningHoursSpecification from `store.tempStatus`
- `getSchemaType()` — Maps `store.businessType` + `store.businessCategory` → schema.org subtypes (Restaurant, BeautySalon, Store, LocalBusiness, etc.)
- `getMenuSchemaType()` — Public catalog page variant; food businesses use food schema types, non-food SMBs keep their business schema type
- `buildPublicCatalogUrlSchema()` — Food businesses emit `menu`/`hasMenu`; non-food SMBs emit `hasOfferCatalog`

**OBP-specific schema** (`src/app/client/obp/schema.ts`):

- `buildPotentialActions()` — ReserveAction + OrderAction with EntryPoint targets
- `buildPaymentAccepted()` — paymentAccepted from businessAttributes (Cash, Credit Card, UPI)
- `acceptsReservations` — Boolean reservation capability flag; the sanitized booking URL stays in the ReserveAction `EntryPoint.urlTemplate`

**Public truth indexing gate** (`src/lib/seo/publicTruthIndexing.ts`):

- OBP metadata uses `index, follow` only when the public page has identity plus enough visible business facts.
- Expired starter, blocked, inactive, weak, or incomplete public records receive `noindex, follow`.
- Per-tenant sitemap output includes OBP roots only after the same public-facts gate passes.
- This prevents empty or weak business records from being advertised as search-discovery pages.

**@see** `__docs__/discovery-infrastructure/` for full SEO/AEO strategy
**@see** `__docs__/discovery-infrastructure/public-truth-indexing-policy.md` for sitemap and metadata gate rules
**@see** `__docs__/business-truth-graph/` for BTG layer context

---

## 12. Routing Changes

### Current Flow (`client/[[...slug]]/page.tsx`)

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

**GBP Website Field Guidance:** Hint text below action buttons tells owners to add the OBP link as their Google Business Profile "Website" field. The guide now also provides a copyable handoff kit containing the business name, short description/known-for text when present, the Website field URL, and the `/menu` link for Google profile fields where available. This is the active, owner-controlled distribution path. API-based GBP sync remains hidden/off until Google API access and `ENABLE_GBP_SYNC` are approved.

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

**Multi-chain implication:** Master store's OBP serves as the chain-level link. Outlets inherit master-controlled identity and classification (logo, phone, currency, timezone, default language, `businessType`, `businessCategory`) from master at creation time. No separate tenant-level OBP needed.

### ADR-7: Outlet Master Identity And Classification Inheritance

**Decision:** When creating an outlet, copy `logo`, `phoneNumber`, `currencyCode`, `currencySymbol`, `country`, `timeZone`, `defaultLanguage`, `businessType`, and `businessCategory` from master store.

**Rationale:** Outlets must render correctly (menus, OBP, schema, labels, filters, time-slot defaults, and owner/public category-specific behavior) without fetching tenant or master store data. Master identity/classification is static or rare. Location-specific fields (name, address, workingHours) are set by outlet owner later. If master changes identity/classification, propagation to outlets is controlled by `outletPolicy.canOverrideBrandIdentity` (legacy `allowBrandingOverride` is also respected for old documents).

**Implementation:** `src/app/api/outlets/create/route.ts` copies the fields on creation. `src/database/stores/index.tsx` triggers propagation through `src/database/multiOutlet/brandPropagation.ts` after owner saves.

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

### ADR-10: Master Identity Propagation On Master Save (Client-Side, Not Cloud Function)

**Decision:** Master identity/classification propagation runs from the shared `updateStore()` DAL after the master store save succeeds, not as a Cloud Function.

**Rationale:** Master identity/classification changes are rare. Running a Cloud Function for this would be over-engineering. The client-side DAL approach: (1) detects master-controlled field changes with `extractMasterStorePropagationChanges()`, (2) propagates to outlets with `propagateMasterStoreChangesToOutlets()`, (3) updates outlet store docs, merges outlet `storesSummary` fields through the shared partial summary writer, refreshes `modifiedOn`, and revalidates public cache tags. Controlled by `outletPolicy.canOverrideBrandIdentity` — if true, outlets keep their own branding/classification. Legacy `allowBrandingOverride` is also respected for old documents.

### ADR-11: Tenant = Account Container, Store = Rendering Source

**Decision:** `TenantDataType` was cleaned up to separate account-level fields from platform-admin-only fields. Store is the single rendering source for all public surfaces (menus, OBP).

**Rationale:** In the current codebase: (1) Logo is uploaded directly to store via Business Settings → `updateStore()`. Tenant `logo` field is never written in normal flow. (2) Onboarding creates tenant with minimal fields (name, email, businessType). (3) Outlet creation copies master identity/classification from master store, not tenant. Therefore, tenant is purely an account container (tenantId, storesList, outlet locks, billing). All rendering reads from store only. Platform-admin fields (logo, address, contact, locale) kept on tenant type as optional for the internal admin editor (`tenantDetailsModal.tsx`).

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
| `src/app/client/obp/OBPContent.tsx`                            | Main OBP async server component (SSR)                    | ~670  |
| `src/app/client/obp/OBPSkeleton.tsx`                           | Loading skeleton for Suspense                            | ~70   |
| `src/app/client/obp/obp.module.scss`                           | SCSS styles (mobile-first)                               | ~305  |
| `src/app/client/obp/schema.ts`                                 | Schema.org JSON-LD (@id, normalized phone, closure hours, image array) | ~220  |
| `src/app/client/obp/OBPAnalytics.tsx`                          | Client island for page view tracking                     | ~50   |
| `src/app/client/obp/OBPActions.tsx`                            | Client component for action click tracking               | ~112  |
| `src/app/client/obp/OBPMenuCTA.tsx`                            | Client component for menu CTA with conversion tracking   | ~40   |
| `src/app/client/obp/BrandOBPContent.tsx`                       | Multi-store brand OBP (location selector)                | ~225  |
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
| `src/app/client/[[...slug]]/page.tsx`                 | OBP routing + AEO canonical title (`Name — Menu, Hours, Contact`)              |
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
