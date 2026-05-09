# MenuListAi SEO Implementation Guide

> Last Updated: December 21, 2025 (v3 - Multi-Tenant Architecture Complete)

## Executive Summary

This document tracks all SEO-related implementations in MenuListAi and provides guidance on restaurant SEO best practices for 2025-2026.

### Implementation Progress: ✅ 98% Complete

- Phase 1 (Quick Wins): ✅ Complete
- Phase 2 (Schema Enhancements): ✅ Complete
- Phase 3 (Multi-Tenant): ✅ Complete
- Phase 4 (Advanced): ⏳ Future

---

## Current Implementation Status

### ✅ What's Implemented

| Component                 | File                                       | Status      | Description                                                             |
| ------------------------- | ------------------------------------------ | ----------- | ----------------------------------------------------------------------- |
| **Dynamic Metadata**      | `/app/(website)/menu/[projectId]/page.tsx` | ✅ Complete | Next.js `generateMetadata` with SEO settings priority                   |
| **Schema.org JSON-LD**    | `/app/(website)/menu/[projectId]/page.tsx` | ✅ Complete | Restaurant + Menu + OpeningHours + Address + Contact                    |
| **SEO Settings Form**     | `/businessSettings/tabs/SeoTab.tsx`        | ✅ Complete | UI for tagline, meta title, description, keywords, canonical URL        |
| **Dynamic Sitemap**       | `/app/sitemap.ts`                          | ✅ Complete | Next.js dynamic sitemap generation                                      |
| **robots.txt**            | `/public/robots.txt`                       | ✅ Complete | Crawler directives with sitemap reference                               |
| **Store Type SEO Fields** | `/types/platform/store.ts`                 | ✅ Complete | `metaTitle`, `metaDescription`, `keywords[]`, `canonicalUrl`, `tagline` |
| **ShareModal Preview**    | `/b2cView/shareModal/index.tsx`            | ✅ Complete | Shows owner what shared link looks like                                 |

### ⚠️ Deprecated / Not Needed

| Component            | File                                   | Status        | Reason                                                                                                                                    |
| -------------------- | -------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **SharePreviewMeta** | `/b2cView/output/SharePreviewMeta.tsx` | ⚠️ Deprecated | Uses `next/head` which doesn't work with App Router SSR. Menu page uses `generateMetadata` instead. **Keep for reference but don't use.** |

---

## Priority Order (How SEO Settings Apply)

```
SEO Settings (Business Settings) → Store Details → Project Metadata → Defaults
```

### Title Priority

1. `storeDetails.metaTitle` (from SEO tab)
2. `storeDetails.name + " | Menu"`
3. `projectData.metadata.name + " | Menu"`
4. `"Restaurant Menu"`

### Description Priority

1. `storeDetails.metaDescription` (from SEO tab)
2. `storeDetails.tagline`
3. `projectData.metadata.description`
4. `"View the digital menu for {storeName}"`

### Image Priority

1. `storeDetails.logo`
2. `/images/default-menu-preview.png`

### Canonical URL Priority

1. `storeDetails.canonicalUrl` (from SEO tab)
2. Auto-generated menu URL

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    BUSINESS SETTINGS                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ SEO Tab                                                  │    │
│  │ - Meta Title (50-60 chars)                              │    │
│  │ - Meta Description (150-160 chars)                      │    │
│  │ - Keywords (comma-separated)                            │    │
│  │ - Canonical URL                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↓                                   │
│                    Saved to Firebase                             │
│                    (storeDetails collection)                     │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                    MENU PAGE (SSR)                               │
│  /menu/[projectId]/page.tsx                                     │
│                                                                  │
│  1. generateMetadata() - fetches storeDetails                   │
│  2. Applies priority chain for title, description, etc.         │
│  3. Returns Next.js Metadata object                             │
│  4. Injects Schema.org JSON-LD for rich results                 │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                    RENDERED HTML                                 │
│                                                                  │
│  <head>                                                         │
│    <title>Restaurant Name | Menu</title>                        │
│    <meta name="description" content="..." />                    │
│    <meta property="og:title" content="..." />                   │
│    <meta property="og:image" content="logo.png" />              │
│    <link rel="canonical" href="..." />                          │
│  </head>                                                        │
│  <body>                                                         │
│    <script type="application/ld+json">                          │
│      { "@type": "Restaurant", "menu": {...} }                   │
│    </script>                                                    │
│  </body>                                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Restaurant SEO Best Practices (2025-2026)

Based on current industry research and Google's guidelines.

### 1. Local SEO (Most Important for Restaurants)

| Action                                 | Priority    | Status in MenuListAi                     |
| -------------------------------------- | ----------- | ---------------------------------------- |
| Google Business Profile optimization   | 🔴 Critical | ❌ External (owner responsibility)       |
| NAP consistency (Name, Address, Phone) | 🔴 Critical | ⚠️ Partial (stored in Business Settings) |
| Local directory citations              | 🟡 High     | ❌ External                              |
| Reviews management                     | 🟡 High     | ❌ External                              |
| Embed Google Maps                      | 🟢 Medium   | ❌ Not implemented                       |

### 2. On-Page SEO

| Action                                  | Priority    | Status in MenuListAi |
| --------------------------------------- | ----------- | -------------------- |
| Meta title (50-60 chars, keyword first) | 🔴 Critical | ✅ Implemented       |
| Meta description (150-160 chars)        | 🔴 Critical | ✅ Implemented       |
| Canonical URL                           | 🟡 High     | ✅ Implemented       |
| Keywords meta tag                       | 🟢 Medium   | ✅ Implemented       |
| Robots meta (index, follow)             | 🟢 Medium   | ✅ Implemented       |
| OG tags for social sharing              | 🔴 Critical | ✅ Implemented       |
| Twitter cards                           | 🟡 High     | ✅ Implemented       |

### 3. Structured Data (Schema.org)

| Schema Type                  | Priority    | Status in MenuListAi                |
| ---------------------------- | ----------- | ----------------------------------- |
| Restaurant                   | 🔴 Critical | ✅ Implemented                      |
| Menu                         | 🔴 Critical | ✅ Implemented                      |
| MenuSection (categories)     | 🟡 High     | ✅ Implemented                      |
| MenuItem (items with prices) | 🟡 High     | ✅ Implemented                      |
| OpeningHoursSpecification    | 🟡 High     | ✅ Implemented (from workingHours)  |
| PostalAddress                | 🟡 High     | ✅ Implemented (from store address) |
| Contact (telephone, email)   | 🟡 High     | ✅ Implemented                      |
| Image (logo)                 | 🟡 High     | ✅ Implemented                      |
| CurrenciesAccepted           | 🟢 Medium   | ✅ Implemented                      |
| GeoCoordinates               | 🟢 Medium   | ⏳ Future (needs lat/lng fields)    |
| AggregateRating              | 🟢 Medium   | ⏳ Future (needs review system)     |

### 4. AI-Ready SEO (New in 2024-2025)

| Action                                   | Priority    | Status                       |
| ---------------------------------------- | ----------- | ---------------------------- |
| Structured data for AI answer boxes      | 🔴 Critical | ✅ Schema.org implemented    |
| FAQ sections for voice search            | 🟡 High     | ❌ Not implemented           |
| Conversational content structure         | 🟡 High     | ❌ Not implemented           |
| Mobile-first performance (90+ PageSpeed) | 🔴 Critical | ⚠️ Depends on implementation |

### 5. Technical SEO

| Action                         | Priority    | Status                           |
| ------------------------------ | ----------- | -------------------------------- |
| Mobile-friendly                | 🔴 Critical | ✅ Responsive design             |
| Fast loading (Core Web Vitals) | 🔴 Critical | ⚠️ Needs audit                   |
| HTTPS                          | 🔴 Critical | ✅ Via Vercel/hosting            |
| No duplicate content           | 🟡 High     | ✅ Canonical URLs                |
| Image optimization             | 🟡 High     | ⚠️ Partial (Next.js Image)       |
| Sitemap.xml                    | 🟡 High     | ✅ Dynamic via `/app/sitemap.ts` |
| robots.txt                     | 🟢 Medium   | ✅ `/public/robots.txt`          |

---

## Implementation Roadmap

### Phase 1: Quick Wins ✅ COMPLETE

- [x] Add `tagline` field to Business Settings form
- [x] Generate sitemap.xml for menu pages (dynamic via `/app/sitemap.ts`)
- [x] Add robots.txt (already existed at `/public/robots.txt`)

### Phase 2: Schema Enhancements ✅ COMPLETE

- [x] Add `OpeningHoursSpecification` to JSON-LD (from workingHours)
- [x] Add `PostalAddress` to JSON-LD (from store address fields)
- [x] Add store phone/email to JSON-LD
- [x] Add store logo/image to JSON-LD
- [x] Add currency to JSON-LD
- [ ] Add `GeoCoordinates` (needs lat/lng fields in StoreDataType - Future)

### Phase 3: Multi-Tenant Architecture ✅ COMPLETE

- [x] Subdomain support (`joespizza.menulist.ai`)
- [x] Custom domain support (`joespizza.com`)
- [x] Domain-based middleware routing
- [x] Per-client sitemap.xml generation
- [x] Per-client robots.txt generation
- [x] Remove `/menu` prefix for subdomain/custom domain routes
- [x] Add domain fields to StoreDataType (subdomain, customDomain, domainVerified, primaryProjectId)

### Phase 4: Advanced SEO (Future)

- [ ] FAQ schema for voice search
- [ ] Review/Rating schema (if reviews are collected)
- [ ] Event schema (for special menu events)
- [ ] Breadcrumb schema
- [ ] Core Web Vitals audit and optimization

---

## Multi-Tenant Architecture ✅ IMPLEMENTED

### Current State (LIVE)

```
menulist.ai/                      → Platform landing page
menulist.ai/menu/[projectId]      → Client menus (PATH-BASED fallback)
menulist.ai/sitemap.xml           → Platform pages ONLY

joespizza.menulist.ai/            → Client menu (SUBDOMAIN) ✅
joespizza.menulist.ai/sitemap.xml → Client's menu only ✅

joespizza.com/                    → Custom domain ✅
joespizza.com/sitemap.xml         → Client's menu only ✅
```

### Implementation (COMPLETE)

#### 1. Middleware Domain Detection (src/middleware.ts)

```typescript
// Domain resolution - IMPLEMENTED
const hostname = request.headers.get("host");
const domainInfo = resolveDomain(hostname);

if (domainInfo.isClient && !shouldSkipRouting) {
  // Rewrite to /client route group
  const url = request.nextUrl.clone();
  url.pathname = `/client${pathname}`;
  response = NextResponse.rewrite(url);

  // Pass tenant info via headers
  response.headers.set("x-tenant-subdomain", domainInfo.subdomain);
  response.headers.set("x-tenant-custom-domain", domainInfo.customDomain);
}
```

#### 2. Route Group Structure

```
src/app/
├── (platform)/          # menulist.ai only
│   ├── page.tsx
│   ├── sitemap.ts
│   └── robots.ts
│
├── (client)/            # Subdomains & custom domains
│   ├── page.tsx         # Menu page (no /menu prefix!)
│   ├── sitemap.ts       # Single-page sitemap
│   └── robots.ts
│
└── (dashboard)/         # app.menulist.ai or /dashboard
```

#### 3. Database Schema Addition

```typescript
// In StoreDataType
customDomain?: string;      // e.g., "joespizza.com"
subdomain?: string;         // e.g., "joespizza" (→ joespizza.menulist.ai)
domainVerified?: boolean;   // DNS verification status
```

### Why This Matters for SEO

1. **Clean URLs** - `joespizza.com` vs `menulist.ai/menu/abc123`
2. **Dedicated sitemap** - Each client has their own
3. **Proper canonicals** - No cross-domain confusion
4. **Google Business Profile** - Clients can link their actual domain

---

## Files Reference

### Core SEO Files

```
src/
├── app/
│   ├── sitemap.ts                  # Dynamic sitemap generation
│   └── (website)/menu/[projectId]/
│       └── page.tsx                # generateMetadata + Schema.org JSON-LD
├── components/templates/main-app/
│   ├── businessSettings/
│   │   └── tabs/SeoTab.tsx         # SEO form fields (tagline, meta, keywords)
│   └── projects/b2cView/
│       ├── shareModal/index.tsx    # Share preview with QR
│       └── output/
│           └── SharePreviewMeta.tsx # DEPRECATED - don't use
├── types/platform/
│   └── store.ts                    # StoreDataType with SEO fields
└── public/
    └── robots.txt                  # Crawler directives
```

### Key Type Definitions

```typescript
// In store.ts
interface StoreDataType {
  // ... other fields

  // SEO Settings (from Business Settings)
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  canonicalUrl?: string;
  tagline?: string;
}
```

---

## Testing SEO

### Tools

1. **Google Rich Results Test**: https://search.google.com/test/rich-results
2. **Schema Markup Validator**: https://validator.schema.org/
3. **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
4. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
5. **PageSpeed Insights**: https://pagespeed.web.dev/

### Manual Testing

1. Open menu page in incognito
2. View Page Source → check `<head>` for meta tags
3. Check for `<script type="application/ld+json">` in body
4. Test sharing on WhatsApp/Facebook/Twitter

---

## Constitutional Rules for SEO

1. **Auto-generate, don't require** - SEO should work without owner input
2. **Smart defaults** - Use store name, description as fallbacks
3. **No jargon** - SEO settings UI should be simple
4. **Silent optimization** - Don't show technical details to owners
5. **Preview confidence** - Show owners what their share will look like

---

## References

- [Google Local Business Structured Data](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Schema.org Restaurant](https://schema.org/Restaurant)
- [Restaurant SEO Checklist 2026](https://thedigitalrestaurant.com/restaurant-seo-checklist/)
- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
