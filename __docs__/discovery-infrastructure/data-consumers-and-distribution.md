# Data Consumers & Distribution — Who Uses MenuList Data and How

> How AI engines, search crawlers, and external systems discover and consume MenuList's structured business data.
> Last Updated: May 9, 2026

---

## 1. The Core Question

MenuList stores structured business truth. But **who consumes it**, and **how do they find it**?

This document maps every data consumer type, how they discover MenuList data, what format they expect, and what MenuList already provides (or needs to provide).

---

## 2. Consumer Map

### Consumer Type 1: AI Discovery Engines (Perplexity, ChatGPT, Gemini, Claude)

**How they find MenuList data:**

| Discovery Method | How It Works | MenuList Status |
|-----------------|-------------|-----------------|
| **Web crawling** | AI engines crawl public web pages, parse HTML + JSON-LD | ✅ OBP + Menu pages are SSR with schema.org JSON-LD |
| **llms.txt** | AI crawlers can read `/llms.txt` for site capability summary | ✅ `public/llms.txt` + `public/llms-full.txt`; both describe the category/type-aware catalog model |
| **Schema.org JSON-LD** | Embedded in every public page `<script type="application/ld+json">` | ✅ 10+ schema types: LocalBusiness, Restaurant, Store, Menu, MenuItem, OfferCatalog, Offer, Product, Service, GeoCoordinates, OpeningHoursSpecification, etc. |
| **Direct API** | Programmatic access via REST API | ✅ Public API v1 exists and is feature-flagged ON (`ENABLE_PUBLIC_API: true`); not yet ecosystem-grade. |

**What they need from MenuList:**
- Structured business identity (name, type, location, hours)
- Menu/offering data (items, prices, availability, dietary tags)
- Freshness signals (`dateModified`, `menuVersion`)
- Entity alignment signals (`sameAs` social links, canonical URLs)

**What MenuList already provides:**
- Every OBP page (`{business}.menulist.ai`) has full `LocalBusiness` JSON-LD
- Food catalog pages (`{business}.menulist.ai/menu`) have `Restaurant/FoodEstablishment` + `Menu` + `MenuItem` + `Offer` JSON-LD
- Non-food catalog pages use the business type schema plus `OfferCatalog` + `Offer` + `Product` or `Service` JSON-LD
- `llms.txt` provides structured capability summary following llmstxt.org standard
- `llms-full.txt` provides extended documentation with exact schema.org type mappings
- `dateModified` on every page for freshness evaluation
- `sameAs` links for entity resolution (Instagram, Facebook, website)

**Example: How Perplexity would answer "What's on the menu at Joe's Pizza?"**
```
1. Perplexity crawls joespizza.menulist.ai/menu
2. Finds <script type="application/ld+json"> in HTML
3. Parses Restaurant → hasMenu → hasMenuSection[] → hasMenuItem[] for food businesses, or LocalBusiness/Store → hasOfferCatalog for non-food SMBs
4. Extracts: item names, prices, dietary tags, availability
5. Answers user with structured menu data
6. Cites joespizza.menulist.ai/menu as source
```

**What's NOT active in the current source contract:**
- No real-time API for AI agents to query beyond the gated Public API v1 pull endpoints
- No change notification webhooks for AI to track updates
- No discovery API for geo + category queries across businesses

---

### Consumer Type 2: Search Engines (Google, Bing, Yandex)

**How they find MenuList data:**

| Discovery Method | How It Works | MenuList Status |
|-----------------|-------------|-----------------|
| **Googlebot crawling** | Crawls SSR pages, reads schema.org JSON-LD | ✅ All pages SSR, schema.org embedded |
| **Sitemap** | `sitemap.xml` lists crawlable URLs that pass quality gates | ✅ Platform sitemap plus tenant `src/app/client/sitemap.ts`; tenant URLs use the public truth indexability gate |
| **robots.txt** | Tells crawlers what to index | ✅ `public/robots.txt` + tenant `src/app/client/robots.ts` — explicit search/AI crawler allows, internal paths blocked |
| **Schema.org Rich Results** | JSON-LD describes visible public facts (business info, menus, hours, breadcrumbs) | ✅ LocalBusiness/Restaurant, Menu, MenuSection, MenuItem, BreadcrumbList, OpeningHoursSpecification; FAQPage only where FAQ content is visible and reviewed |

**What they need:**
- Canonical URLs (avoid duplicate content)
- Schema.org JSON-LD for rich results
- Meta tags (title, description, OG tags)
- Stable URLs (no broken links)
- Fast page load (SSR + edge caching)

**What MenuList provides:**
- SSR pages with proper canonical tags
- Full schema.org JSON-LD on every public page
- `previousSlugs[]` for 301 redirects (no broken links)
- `robots.txt` + `sitemap.xml`
- ISR caching for fast page loads

---

### Consumer Type 3: Google Business Profile (GBP)

**How it connects:**

| Method | How It Works | MenuList Status |
|--------|-------------|-----------------|
| **Owner website/menu link guidance** | Owner can place the OBP/menu link in Google Business Profile | ✅ Guidance and store fields exist |
| **Menu link sync via API** | MenuList pushes menu URL to GBP via API | ❌ Not active — `ENABLE_GBP_SYNC: false`; token DAL still throws until API access is approved |
| **Hours verification** | MenuList verifies hours match between GBP and store | ⚠️ Data fields exist (`store.gbpState.hoursStatus`), runtime API sync is disabled |
| **Link monitoring** | Nightly check that GBP menu link points to MenuList | ⚠️ Intended when GBP sync is enabled; do not present as active customer-facing behavior yet |

---

### Consumer Type 4: POS Systems (Toast, Square, Lightspeed)

**How they connect:**

| Method | How It Works | MenuList Status |
|--------|-------------|-----------------|
| **Webhook push** | MenuList pushes full menu snapshot on every change | ✅ `src/lib/posSync/` — HMAC-SHA256 signed, 25s debounce, retry + circuit breaker |
| **Payload format** | JSON snapshot via `buildMenuSnapshot()` | ✅ Structured JSON with categories, items, prices, attributes |

**Flow:**
```
Owner edits menu → 25s debounce → buildMenuSnapshot() → POST to webhook URL → HMAC-SHA256 verification → POS updates
```

---

### Consumer Type 5: External Applications (via Public API)

**How they connect:**

| Method | How It Works | MenuList Status |
|--------|-------------|-----------------|
| **REST API v1** | `GET /api/public/v1/business` + `GET /api/public/v1/menu` | ✅ Exists and flag is ON in `src/config/features.ts` |
| **Authentication** | `X-API-Key` header, per-store API key (`ml_` + UUID) | ✅ `src/lib/publicApi/auth.ts` |
| **Rate limiting** | 60 req/min per API key | ✅ Upstash Redis sliding window |

**What's available:**
- `GET /api/public/v1/business` — Returns store identity, hours, attributes
- `GET /api/public/v1/menu` — Returns full menu data (reuses POS snapshot format)

**What's NOT yet done:**
- No API v2 with field selection, pagination, change events
- No OpenAPI/Swagger spec
- No bulk query endpoint
- No webhook subscription for change notifications

---

### Consumer Type 6: End Customers (via QR, links, screens)

**How they access:**

| Surface | URL Pattern | Status |
|---------|------------|--------|
| Digital Menu | `{business}.menulist.ai/menu` | ✅ Production |
| OBP | `{business}.menulist.ai` | ✅ Production |
| QR Code | Points to menu URL | ✅ Multiple QR formats |
| Physical Surfaces | Stickers, tent cards with QR | ✅ Production |
| Digital Screens | Display mode for in-store screens | ✅ Production |
| Custom Domain | `{custom-domain}/menu` | ✅ Production |

---

## 3. Data Flow Summary

```
                    MenuList Core (Business Truth Engine)
                              │
              ┌───────────────┼───────────────────────┐
              │               │                       │
         SSR Pages        Webhooks              REST API v1
     (schema.org)      (POS push)          (X-API-Key auth)
              │               │                       │
    ┌─────────┼────────┐      │              ┌────────┼────────┐
    │         │        │      │              │                 │
  Google   AI Engines  End    POS           External       Conditional
  Search   (Perplexity Users  Systems       Apps           machine APIs
  (SEO)    ChatGPT,    (QR,  (Toast,                       after audit
           Gemini)     link)  Square)
```

## 4. What AI Engines Need That MenuList Doesn't Yet Provide

| Need | Current State | Gap |
|------|-------------|-----|
| **Structured pages with schema.org** | ✅ Done | — |
| **llms.txt discovery file** | ✅ Done | — |
| **Freshness signals (dateModified)** | ✅ Done | — |
| **Entity alignment (sameAs)** | ✅ Done | — |
| **Cross-business discovery API** | ❌ Not built | Requires active businessEntityIndex writer/query design |
| **Change notification feed** | ❌ Not built | Requires generic webhook subscription system |
| **OpenAPI machine-readable spec** | ❌ Not built | Requires audited API v2 contract |
| **Bulk structured data export** | ❌ Not built | Requires scoped dataset export design |

## 5. Priority Actions for AI Discoverability

### Already Working (No Action Needed)
1. ✅ schema.org JSON-LD on all public pages (10+ types)
2. ✅ llms.txt + llms-full.txt (platform AI crawler discovery)
3. ✅ SSR rendering (no JS required for content)
4. ✅ Canonical URLs with redirect chains
5. ✅ robots.txt + sitemap.xml
6. ✅ dateModified freshness signals
7. ✅ GeoCoordinates for local discovery
8. ✅ sameAs for entity alignment

### Conditional Work (Only With Scoped Approval)
1. Business Entity Index scheduler/query wiring — cross-business queryable index, using public data only
2. Generic Webhook System — change notifications for external consumers
3. API v2 with OpenAPI spec — machine-readable API documentation
4. Discovery API — geo + category + attribute search endpoint

## 6. How Each AI Engine Specifically Discovers Data

### Perplexity
- **Method:** Web crawling + structured data extraction
- **What it reads:** HTML pages with schema.org JSON-LD
- **MenuList entry point:** Business subdomain pages (e.g., `joespizza.menulist.ai`)
- **What helps:** Rich schema.org markup, clean canonical URLs, dateModified freshness

### ChatGPT (via Bing/web browsing)
- **Method:** Bing search index + web browsing tool
- **What it reads:** Search results → page content → schema.org
- **MenuList entry point:** Google/Bing indexed pages
- **What helps:** SEO meta tags, schema.org for rich snippets, llms.txt if browsing directly

### Google AI (Gemini, SGE, AI Overviews)
- **Method:** Google's own index + Knowledge Graph
- **What it reads:** Crawled pages, schema.org, GBP data
- **MenuList entry point:** Indexed pages + GBP menu link
- **What helps:** schema.org JSON-LD, owner-placed GBP website/menu link, sitemap, structured hours/location

### Voice Assistants (Google Assistant, Siri, Alexa)
- **Method:** Knowledge Graph + structured data
- **What it reads:** schema.org from indexed pages
- **MenuList entry point:** Schema.org rich results in Google
- **What helps:** OpeningHoursSpecification (for "is X open now?"), GeoCoordinates (for "near me"), priceRange

## 7. Technical Entry Points (Complete List)

| Entry Point | URL / Path | Purpose | Consumer |
|------------|-----------|---------|----------|
| OBP Page | `https://{subdomain}.menulist.ai/` | Business identity + schema.org | All crawlers |
| Menu Page | `https://{subdomain}.menulist.ai/{projectSlug}` or owner-claimed `/menu` | Full menu + schema.org | All crawlers |
| llms.txt | `https://www.menulist.ai/llms.txt` | AI capability summary | AI engines |
| llms-full.txt | `https://www.menulist.ai/llms-full.txt` | Extended schema docs | AI engines |
| Platform robots.txt | `https://www.menulist.ai/robots.txt` | Platform crawl permissions | All crawlers |
| Tenant robots.txt | `https://{subdomain}.menulist.ai/robots.txt` | Tenant crawl permissions + tenant sitemap | All crawlers |
| Platform sitemap.xml | `https://www.menulist.ai/sitemap.xml` | Platform URL list for indexing | Search engines |
| Tenant sitemap.xml | `https://{subdomain}.menulist.ai/sitemap.xml` | OBP + active canonical menu/outlet URL list | Search engines |
| API v1 Business | `GET /api/public/v1/business` | Store data (API key auth) | External apps |
| API v1 Menu | `GET /api/public/v1/menu` | Menu data (API key auth) | External apps |
| POS Webhook | Owner-configured URL | Menu snapshot push | POS systems |
