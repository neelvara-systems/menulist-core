# MenuList Public Menu SEO Source Contract

> Last Updated: July 10, 2026 (launch-boundary hardening)

> **Launch boundary:** Not current launch certification or deploy approval. This guide is source-gated public-menu and Official Business Page SEO/runtime evidence only. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:public-business-truth`, `npm run verify:agent-readiness`, `npm run verify:website-resource-locales`, public tenant menu and Official Business Page browser smoke, canonical-host alignment, applicable target Firebase/Vercel deploy evidence, production-host smoke, and owner-controlled Search Console property and sitemap submission evidence. Search rankings, crawler behavior, indexing, rich-result display, AI citations, and refresh timing remain external-system outcomes and are not certified by this document.

## Executive Summary

This document tracks current public-menu and Official Business Page SEO/runtime source truth. It does not certify search rankings, crawler behavior, production deploy status, Core Web Vitals, or provider/indexing outcomes.

### Current Source Contract

- Implemented: tenant metadata, canonical URLs, schema.org JSON-LD, platform and tenant sitemaps, robots policies, public truth indexability gates, and owner SEO settings.
- Conditional only: review/rating schema, event schema, API v2/OpenAPI, generic discovery feeds, and Core Web Vitals certification.
- Current release approval remains controlled by the production-readiness audit and the External Certification Runbook, not this guide.
- Tenant sitemap read diagnostics are observability-only: master-store, project-summary, and outlet-summary/read failures log bounded `tenant_sitemap_master_store_lookup_failed`, `tenant_sitemap_projects_lookup_failed`, and `tenant_sitemap_outlets_lookup_failed` diagnostics while preserving the existing safe null/empty sitemap fallback.

---

## Current Implementation Status

### ✅ What's Implemented

| Component                 | File                                       | Status      | Description                                                             |
| ------------------------- | ------------------------------------------ | ----------- | ----------------------------------------------------------------------- |
| **Dynamic Metadata**      | `src/app/client/[[...slug]]/page.tsx`      | ✅ Complete | Next.js `generateMetadata` with SEO settings priority                   |
| **Schema.org JSON-LD**    | `src/app/client/[[...slug]]/page.tsx` + `src/lib/schema/index.ts` | ✅ Complete | Business type + food Menu or non-food OfferCatalog + hours/address/contact |
| **SEO Settings Form**     | `src/components/templates/main-app/businessSettings/tabs/SeoTab.tsx` + `src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx` | ✅ Complete | UI for tagline, meta title, description, keywords, canonical URL        |
| **Sitemaps**       | `public/sitemap.xml` + `src/app/client/sitemap.ts` | ✅ Complete | Static platform sitemap plus dynamic tenant sitemap generation                         |
| **robots.txt**            | `public/robots.txt` + `src/app/client/robots.ts` | ✅ Complete | Platform and tenant crawler directives with sitemap references          |
| **Store Type SEO Fields** | `/types/platform/store.ts`                 | ✅ Complete | `metaTitle`, `metaDescription`, `keywords[]`, `canonicalUrl`, `tagline` |
| **ShareModal Preview**    | `/b2cView/shareModal/index.tsx`            | ✅ Complete | Shows owner what shared link looks like                                 |

### ⚠️ Deprecated / Not Needed

| Component            | File                                   | Status        | Reason                                                                                                                                    |
| -------------------- | -------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **SharePreviewMeta** | legacy output metadata component | ⚠️ Deprecated | Uses `next/head` which doesn't work with App Router SSR. Menu page uses `generateMetadata` instead. **Keep for reference but don't use.** |

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

## Public Menu SEO Practices

Based on current source behavior and general crawler requirements. External crawler/indexing outcomes are not guaranteed by MenuList.

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
| Restaurant / Store / LocalBusiness | 🔴 Critical | ✅ Implemented based on business type |
| Menu                         | 🔴 Critical | ✅ Implemented for food businesses  |
| MenuSection (categories)     | 🟡 High     | ✅ Implemented for food businesses  |
| MenuItem (items with prices) | 🟡 High     | ✅ Implemented for food businesses  |
| OfferCatalog                 | 🟡 High     | ✅ Implemented for non-food SMBs    |
| Product / Service            | 🟡 High     | ✅ Implemented for non-food SMB items |
| OpeningHoursSpecification    | 🟡 High     | ✅ Implemented (from workingHours)  |
| PostalAddress                | 🟡 High     | ✅ Implemented (from store address) |
| Contact (telephone, email)   | 🟡 High     | ✅ Implemented                      |
| Image (logo)                 | 🟡 High     | ✅ Implemented                      |
| CurrenciesAccepted           | 🟢 Medium   | ✅ Implemented                      |
| GeoCoordinates               | 🟢 Medium   | ✅ Implemented when `store.geo` exists |
| AggregateRating              | 🟢 Medium   | ❌ Not active; requires separately audited review schema |

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

## Current Launch Boundary

### Implemented Basics

- [x] Add `tagline` field to Business Settings form
- [x] Generate sitemap.xml for platform and tenant pages (`public/sitemap.xml`, `src/app/client/sitemap.ts`)
- [x] Add platform and tenant robots policies (`public/robots.txt`, `src/app/client/robots.ts`)

### Implemented Schema Enhancements

- [x] Add `OpeningHoursSpecification` to JSON-LD (from workingHours)
- [x] Add `PostalAddress` to JSON-LD (from store address fields)
- [x] Add store phone/email to JSON-LD
- [x] Add store logo/image to JSON-LD
- [x] Add currency to JSON-LD
- [x] Add `GeoCoordinates` when `store.geo` has latitude/longitude

### Implemented Multi-Tenant Architecture

- [x] Subdomain support (`joespizza.menulist.online`)
- [x] Custom domain support (`joespizza.com`)
- [x] Domain-based middleware routing
- [x] Per-client sitemap.xml generation
- [x] Per-client robots.txt generation
- [x] Remove `/menu` prefix for subdomain/custom domain routes
- [x] Add domain fields to StoreDataType (subdomain, customDomain, domainVerified, primaryProjectId)

### Conditional Additions (Not Current Launch Scope)

- [ ] Visible FAQ content with FAQ schema only when the FAQ is rendered and reviewed; do not re-add hidden generated FAQ JSON-LD to OBP runtime
- [ ] Review/Rating schema (if reviews are collected)
- [ ] Event schema (for special menu events)
- [ ] Breadcrumb schema
- [ ] Core Web Vitals audit and optimization

---

## Multi-Tenant Architecture ✅ IMPLEMENTED

### Current State (LIVE)

```
menulist.ai/                      → Platform landing page
menulist.ai/sitemap.xml           → Platform pages ONLY

joespizza.menulist.online/            → Client menu (SUBDOMAIN) ✅
joespizza.menulist.online/sitemap.xml → Client's menu only ✅

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
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-tenant-subdomain");
  requestHeaders.delete("x-tenant-custom-domain");
  requestHeaders.delete("x-tenant-type");
  if (domainInfo.subdomain) {
    requestHeaders.set("x-tenant-subdomain", domainInfo.subdomain);
    requestHeaders.set("x-tenant-type", "subdomain");
  } else if (domainInfo.customDomain) {
    requestHeaders.set("x-tenant-custom-domain", domainInfo.customDomain);
    requestHeaders.set("x-tenant-type", "custom");
  }
  response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}
```

The page derives tenant identity from the validated original `Host`. Rewritten `x-tenant-*` request headers are integrity metadata only; caller-supplied values and forwarded/deployment host fallbacks cannot select a tenant.

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
subdomain?: string;         // e.g., "joespizza" (→ joespizza.menulist.online)
domainVerified?: boolean;   // DNS verification status
```

### Why This Matters for SEO

1. **Clean URLs** - `joespizza.com` or `joespizza.menulist.online` instead of platform path URLs
2. **Dedicated sitemap** - Each client has their own
3. **Proper canonicals** - No cross-domain confusion
4. **Google Business Profile** - Clients can link their actual domain

---

## Files Reference

### Core SEO Files

```
src/
├── app/
│   ├── sitemap.ts                  # Platform sitemap generation
│   └── client/
│       ├── [[...slug]]/page.tsx    # generateMetadata + Schema.org JSON-LD
│       ├── sitemap.ts              # Tenant sitemap generation
│       └── robots.ts               # Tenant robots policy
├── components/templates/main-app/
│   ├── businessSettings/
│   │   └── tabs/SeoTab.tsx         # SEO form fields (tagline, meta, keywords)
│   └── projects/b2cView/
│       ├── shareModal/index.tsx    # Share preview with QR
│       └── output/
│           └── SharePreviewMeta.tsx # DEPRECATED - don't use
├── types/platform/
│   └── store.ts                    # StoreDataType with SEO fields
├── lib/schema/index.ts             # Shared schema.org utilities
└── public/
    └── robots.txt                  # Platform crawler directives
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
