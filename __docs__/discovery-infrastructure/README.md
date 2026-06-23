# MenuList Discovery Infrastructure

> **Consolidated documentation** for AI discovery, machine readability, schema.org, GEO/AEO, and ecosystem interoperability.
> Merged from: `seo-aeo-discovery-infrastructure/`, `infrastructure-gap-analysis/`, `discovery-infrastructure/`
> Last Updated: June 2, 2026

---

## Identity

MenuList = **customer-facing business truth infrastructure** — the canonical structured source of menu truth, hours truth, public business identity, and structured restaurant data.

MenuList is **NOT** a discovery platform, ranking system, marketplace, or food search engine. AI engines do the discovery; MenuList provides the structured data they consume.

## Agentic Web / PAL Position

**PAL = Public Agentic Layer.** In MenuList terms, this is not a new operational product and not a WebMCP-first strategy. It is the public readability layer on top of the existing business-truth system:

1. humans read the public menu and Official Business Page
2. search engines and crawlers read SSR HTML, robots, sitemap, and schema.org JSON-LD
3. AI/browser agents read semantic HTML, accessibility tree, structured data, `llms.txt`, and `llms-full.txt`
4. approved external systems use gated public API/POS surfaces where enabled

Current production contract:

- `public/llms.txt` and `public/llms-full.txt` describe MenuList's public business truth and agent action boundaries.
- MenuList homepage and active platform pages emit server-rendered JSON-LD for page identity and breadcrumbs.
- Platform sitemap and LLM inventories advertise active pages only; legacy redirect routes such as `/product` are not discovery destinations.
- Public agents may read and summarize owner-published facts, then route users to official handoff links when those links exist.
- Public agents must not directly mutate menu prices, hours, item availability, business identity, POS state, payments, billing, or owner settings.
- Unknown or missing facts must remain unknown, especially allergens, gluten-free preparation, halal/vegan status, live stock, and availability details not explicitly published by the business.
- WebMCP is treated as a future browser-agent enhancement, not the current production contract. Any WebMCP implementation must be feature-flagged, visible in the UI, scoped to read-only or pending-suggestion workflows, and covered by evals before release.

---

## Documentation Index

### Audits & Analysis

| Document                                                           | Purpose                                                    | Status                       |
| ------------------------------------------------------------------ | ---------------------------------------------------------- | ---------------------------- |
| [deep-architecture-audit.md](./deep-architecture-audit.md)         | Full 20-layer GEO/AEO system audit with file:line evidence | ✅ AUDITED (Mar 10, 2026)    |
| [geo-aeo-gap-analysis.md](./geo-aeo-gap-analysis.md)               | 9-layer gap analysis vs ChatGPT spec                       | ✅ AUDITED (Mar 10, 2026)    |
| [infrastructure-gap-analysis.md](./infrastructure-gap-analysis.md) | 24-layer infrastructure audit + implementation roadmap     | ✅ AUDITED (Mar 10, 2026)    |
| [24-layer-audit.md](./24-layer-audit.md)                           | Post-implementation evidence per layer                     | ✅ RE-AUDITED (Mar 10, 2026) |

### Infrastructure Systems (Built, Most Feature-Flagged OFF)

| Document                                                                   | Layer                                                                       | Status                               |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------ |
| [taxonomy-system.md](./taxonomy-system.md)                                 | Phase 1A — Offering Taxonomy (95+ categories, 20 cuisines, 14 dietary tags) | ✅ BUILT (flag OFF)                  |
| [provenance-metadata.md](./provenance-metadata.md)                         | Phase 1B — Field-Level Provenance (6 trackable fields)                      | ✅ UTILITIES BUILT (flag OFF, not wired) |
| [semantic-attributes.md](./semantic-attributes.md)                         | Phase 1C — Semantic Attribute Registry (17 attributes)                      | ✅ BUILT (flag OFF)                  |
| [business-entity-index.md](./business-entity-index.md)                     | Phase 2A — Business Entity Index (types + builder)                          | ✅ BUILT (flag OFF, needs scheduler) |
| [data-consumers-and-distribution.md](./data-consumers-and-distribution.md) | Consumer Map — Who uses this data, how                                      | ✅ DOCUMENTED                        |

### SEO/AEO (Schema.org Implementation — SHIPPED)

| Document                                                                                                   | Purpose                                                      | Status      |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------- |
| [seo-aeo-original-readme.md](./seo-aeo-original-readme.md)                                                 | Original SEO/AEO feature README (Phase 1-2 shipped Feb 2026) | ✅ SHIPPED  |
| [seo-aeo-discovery-infrastructure_marketing.md](./seo-aeo-discovery-infrastructure_marketing.md)           | Sales/marketing collateral                                   | ✅ COMPLETE |
| [seo-aeo-discovery-infrastructure_website.md](./seo-aeo-discovery-infrastructure_website.md)               | Landing page content                                         | ✅ COMPLETE |
| [seo-aeo-discovery-infrastructure_helpdoc.md](./seo-aeo-discovery-infrastructure_helpdoc.md)               | Customer help article                                        | ✅ COMPLETE |
| [seo-aeo-discovery-infrastructure_mobile-support.md](./seo-aeo-discovery-infrastructure_mobile-support.md) | Owner-facing informational card shipped on desktop and mobile | ✅ COMPLETE |
| [public-truth-indexing-policy.md](./public-truth-indexing-policy.md)                                       | Public tenant page indexing gate for OBP/menu sitemap and metadata | ✅ IMPLEMENTED |

### Archive

| Document                                                                      | Purpose                              |
| ----------------------------------------------------------------------------- | ------------------------------------ |
| [\_archive/chatgpt-review.md](./_archive/chatgpt-review.md)                   | Original ChatGPT conversation review |
| [\_archive/chatgpt-feedback-round2.md](./_archive/chatgpt-feedback-round2.md) | Post-implementation feedback         |
| [\_archive/chatgpt-review-agentic-web-webmcp.md](./_archive/chatgpt-review-agentic-web-webmcp.md) | Agentic web / WebMCP video and PAL plan review |

---

## What's SHIPPED (In Production)

### Schema.org JSON-LD — 500+ lines, 18+ types

| Schema Type                               | Where      | File                                           |
| ----------------------------------------- | ---------- | ---------------------------------------------- |
| Restaurant / Store / LocalBusiness (category defaults + subtype overrides) | OBP + catalog pages | `src/data/shared/businessTypes.ts`, `src/lib/schema/index.ts`, `src/app/client/[[...slug]]/page.tsx` |
| Menu + MenuSection + MenuItem             | Food catalog pages | `src/app/client/[[...slug]]/page.tsx`          |
| OfferCatalog + Offer + Product/Service    | Non-food catalog pages | `src/app/client/[[...slug]]/page.tsx`       |
| Offer (price, currency, availability)     | Catalog pages | Per-item in schema                             |
| OpeningHoursSpecification                 | OBP + Menu | `src/lib/schema/index.ts`                      |
| PostalAddress                             | OBP + Menu | `src/lib/schema/index.ts`                      |
| GeoCoordinates                            | OBP + Menu | `src/lib/schema/index.ts`                      |
| BreadcrumbList                            | Menu pages | `src/lib/schema/index.ts`                      |
| FAQPage (visible FAQ content only)         | Website resources / reviewed visible FAQ surfaces | `src/lib/website/resourceSchema.ts`, `src/lib/schema/index.ts` |
| sameAs (social profiles)                  | OBP + Menu | `src/lib/schema/index.ts`                      |
| amenityFeature (14 attributes)            | OBP        | `src/lib/schema/index.ts`                      |
| ReserveAction + OrderAction               | OBP        | `src/app/client/obp/schema.ts`                 |
| dateModified (freshness)                  | OBP + Menu | Both schema generators                         |
| servesCuisine                             | OBP + Menu | From `store.cuisineTypes[]`                    |
| publisher (Organization: MenuList)        | OBP + Menu | Both schema generators                         |
| specialOpeningHoursSpecification          | OBP        | From tempStatus                                |
| VegetarianDiet (per item)                 | Menu       | From item.dietaryTags with legacy item.tags fallback |
| paymentAccepted                           | OBP        | From businessAttributes                        |

### Crawlability Infrastructure

| Component                                   | File                                       | Status                                                                   |
| ------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| Platform robots.txt (explicit AI bot rules) | `public/robots.txt:1-40`                   | ✅ OAI-SearchBot, ChatGPT-User, GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Googlebot, Bingbot |
| Per-store robots.txt                        | `src/app/client/robots.ts:12-61`           | ✅ Dynamic per-subdomain/custom-domain sitemap + explicit search/AI crawler allow rules              |
| Platform sitemap                            | `src/lib/seo/discoveryPolicy.ts`, `src/app/sitemap.ts`, `public/sitemap.xml` | ✅ Shared active route inventory; dynamic/static sitemap omit redirect-only `/product` |
| Per-store sitemap (real lastModified)       | `src/app/client/sitemap.ts`        | ✅ Gated OBP + canonical menu/outlet URLs; store/outlet `modifiedOn` drives freshness |
| Public truth indexability gate              | `src/lib/seo/publicTruthIndexing.ts`, `src/app/client/sitemap.ts`, `src/app/client/[[...slug]]/page.tsx` | ✅ Weak/incomplete tenant records, stale project slug fallback pages, and stale item/category detail pages stay reachable but receive `noindex, follow` and stay out of sitemap |
| SSR (server-side rendering)                 | Next.js SSR                                | ✅ Full HTML on first request                                            |
| LLM discovery docs                          | `public/llms.txt` + `public/llms-full.txt` | ✅ Current category/type-aware public business data description          |
| Website page JSON-LD                        | `src/components/website/SchemaMarkup.tsx`, `src/components/website/WebsitePageStructuredData.tsx` | ✅ Server-rendered homepage graph plus WebPage/BreadcrumbList on active platform pages |
| Agent-readiness verifier                    | `scripts/verification/verify-agent-readiness.js` | ✅ Checks MenuList and Answerlattice route registries, structured-data wrappers, robots, sitemap, and LLM files |

### Freshness & Truth Signals

| Signal                 | Evidence                        |
| ---------------------- | ------------------------------- |
| `menuVersion`          | Monotonic increment on publish  |
| `lastPublishedAt`      | Server-side timestamp           |
| `dateModified`         | In schema.org output (ISO 8601) |
| Menu snapshots         | Immutable on every publish      |
| MOL (15 change types)  | Append-only event ledger        |
| Store Truth Confidence | Nightly composite score         |
| MCE validation stamps  | `_mce` metadata on project      |
| Staleness detection    | 90-day cooldown nightly check   |

### Machine Truth Endpoints

| Endpoint                               | Status |
| -------------------------------------- | ------ |
| Schema.org JSON-LD on all public pages | ✅     |
| Public API v1 (business + menu)        | ✅     |
| POS Webhook Sync (push-based)          | ✅     |
| `llms.txt` + `llms-full.txt`           | ✅     |
| Agent action boundary docs             | ✅     |
| Per-store sitemap with freshness       | ✅     |

---

## Code Structure

```
src/lib/schema/                    # Schema.org utilities (SHIPPED)
├── index.ts                       # 465 lines — shared builder functions

src/lib/seo/                       # SEO/AEO discovery utilities (SHIPPED)
├── discoveryPolicy.ts             # Platform pages, crawler allowlist, public disallow paths
├── publicMetadata.ts              # Shared public preview metadata normalization
└── publicTruthIndexing.ts          # Public tenant page index/sitemap quality gate

src/app/client/obp/schema.ts       # OBP schema generator (SHIPPED)
src/app/client/[[...slug]]/page.tsx  # Menu schema generator (SHIPPED)
src/app/client/sitemap.ts         # Per-store sitemap (SHIPPED)
src/app/client/robots.ts          # Per-store robots.txt (SHIPPED)

src/lib/infrastructure/            # Discovery infrastructure (BUILT, flags OFF)
├── taxonomy/                      # Offering taxonomy system
│   ├── types.ts, registry.ts, matcher.ts, adapter.ts
│   └── data/ (categories.json, cuisines.json, dietaryTags.json, offeringTags.json)
├── provenance/                    # Field-level provenance metadata
│   ├── types.ts, tracker.ts
├── semantics/                     # Semantic attribute system
│   ├── types.ts, dietaryTags.ts, attributeRegistry.ts
├── discovery/                     # Business entity index
│   ├── types.ts, indexBuilder.ts
└── index.ts                       # Barrel exports
```

## Feature Flags

| Flag                                        | Default | Purpose                            |
| ------------------------------------------- | ------- | ---------------------------------- |
| `ENABLE_INFRASTRUCTURE_TAXONOMY`            | false   | Offering taxonomy mapping          |
| `ENABLE_INFRASTRUCTURE_PROVENANCE`          | false   | Field-level provenance utilities; no runtime stamping yet |
| `ENABLE_INFRASTRUCTURE_SEMANTIC_ATTRIBUTES` | false   | Controlled dietary/attribute enums |
| `ENABLE_INFRASTRUCTURE_DISCOVERY_INDEX`     | false   | Cross-business entity index        |

## Store Fields for Discovery

| Field                                  | Type   | Purpose                                 | Status              |
| -------------------------------------- | ------ | --------------------------------------- | ------------------- |
| `geo: {latitude, longitude}`           | object | GeoCoordinates schema + local discovery | ✅ On StoreDataType |
| `priceRange: '$'\|'$$'\|'$$$'\|'$$$$'` | string | schema.org priceRange                   | ✅ On StoreDataType |
| `cuisineTypes: string[]`               | array  | schema.org servesCuisine                | ✅ On StoreDataType |
| `businessAttributes: {...}`            | object | amenityFeature + paymentAccepted schema | ✅ On StoreDataType |
| `publicPresence: {...}`                | object | OBP descriptor, reservation/order URLs  | ✅ On StoreDataType |

## Activation Roadmap

| Phase           | What                                                               | When                |
| --------------- | ------------------------------------------------------------------ | ------------------- |
| **Phase 1A-1C** | Activate taxonomy + provenance + semantics in extraction + nightly | At 50+ businesses   |
| **Phase 2A**    | Wire Business Entity Index into nightly scheduler                  | At 100+ businesses  |
| **Phase 3**     | Generic webhooks + API v2 + Standard feeds                         | At ecosystem demand |
| **Phase 4**     | Discovery API for machines (NOT for humans)                        | At query volume     |

## Entity Identity Rules (INVARIANTS)

These rules protect MenuList's long-term dataset advantage: menu history, price history, item evolution. If IDs drift, the temporal dataset breaks and cannot be reconstructed.

| Rule                                | Enforcement                                                                                                                                      | Evidence                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| **IDs never change after creation** | Store: `storeId` auto-increment. Project: Firestore auto-ID. Items/categories: extraction-generated, stable within project.                      | `store.ts:19`, `project.types.ts:69`, `extractedData.types.ts:30,47` |
| **IDs never reused**                | Store IDs are sequential (monotonic). Project IDs are UUID-style (collision-free). Local items use `timestamp_random`.                           | `multiOutlet.types.ts:123-131`                                       |
| **Imports MUST reuse existing IDs** | Comparison engine matches items by name similarity (Levenshtein, threshold 0.90). 3-pool matching: master → local → create new only if no match. | `src/lib/extraction/comparisonEngine.ts:437-548`                     |
| **Edits never create new entities** | Price/description/name changes update existing item by ID. `updateProject()` merges fields.                                                      | `src/database/projects/index.ts`                                     |
| **Slugs locked on creation**        | `slugLockedAt: Timestamp` set on project creation. `previousSlugs[]` (max 5) for 301 redirects on rename.                                        | `project.types.ts:81-87`                                             |
| **Menu version is monotonic**       | `menuVersion` incremented via `FieldValue.increment(1)` on publish — never decremented.                                                          | `src/database/projects/index.ts` (publishProject)                    |

## Item Similarity Matching (ALREADY IMPLEMENTED)

MenuList already has a full identity matching system that prevents duplicate entities during menu imports and re-extractions.

**Files:**

- `src/lib/extraction/similarity.ts` (170 lines) — Levenshtein distance-based scoring
- `src/lib/extraction/comparisonEngine.ts` (~900 lines) — Full 3-pool matching engine
- `src/lib/extraction/comparisonEngine.types.ts` — Types for match results

**How it works:**

```
New extraction arrives
    ↓
Pool 1: Match against master items (name similarity + category + price)
    → Match found? Reuse existing ID, apply price override only
    ↓
Pool 2: Match against local-only items
    → Match found? Reuse existing ID, update allowed fields
    ↓
Pool 3: No match
    → Create new item with generated ID (local_item_${timestamp}_${random})
```

**Thresholds:** `SIMILARITY_THRESHOLD: 0.90` (match), `STRONG_MATCH_THRESHOLD: 0.95` (confident), `EXACT_MATCH: 1.0`

**Match types:** `exact` (1.0) → `strong` (≥0.95) → `weak` (0.90-0.95, shows warning) → `no_match` (<0.90)

This system ensures that "Tonkotsu Ramen" and "Tonkotsu ramen" are recognized as the same entity and share the same ID, preserving the historical graph.

## Dataset Coverage Metrics

MenuList is infrastructure, not SaaS. The primary metric is **dataset coverage**, not traffic or engagement.

### Core Metrics (Infrastructure)

| Metric                   | What It Measures                                    | Why It Matters      |
| ------------------------ | --------------------------------------------------- | ------------------- |
| **Verified restaurants** | Businesses with at least 1 published menu           | Dataset size        |
| **Verified menus**       | Published projects with MCE validation passed       | Data quality        |
| **Total menu items**     | Sum of all structured items across all menus        | Dataset depth       |
| **Schema completeness**  | % of stores with geo + hours + cuisine + priceRange | Machine readability |
| **Menu freshness**       | % of menus updated in last 30 days                  | Data trust signal   |

### NOT Primary Metrics

| Metric               | Why Secondary                          |
| -------------------- | -------------------------------------- |
| Page views / traffic | Vanity — doesn't indicate data quality |
| SEO rankings         | Consequence, not cause                 |
| User engagement      | SaaS metric, not infrastructure metric |
| Conversion rate      | Marketing metric                       |

### Distribution Health (Leading Indicator)

| Signal                                                          | What It Means                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------ |
| % of restaurants using MenuList link on Google Business Profile | Adoption depth — restaurants treat MenuList as official link |
| % of restaurants sharing MenuList link in Instagram bio         | Organic distribution via restaurant-owned surfaces           |
| AI citations referencing MenuList                               | External validation of data authority                        |

## Doctrine Rules

- ✅ **Enhance existing pages** with richer structured data
- ✅ **Build data infrastructure** for machines (APIs, indexes, feeds)
- ✅ **Taxonomy remains internal metadata** — never becomes public navigation
- ✅ **Entity Index powers machine interfaces only** — never connected to frontend UI
- ❌ **NEVER build** city/cuisine/dish discovery pages for humans
- ❌ **NEVER build** restaurant ranking, comparison, or aggregation surfaces
- ❌ **NEVER become** a discovery platform, marketplace, or search engine

---

## Version History

| Date         | Change                                                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feb 16, 2026 | Phase 1 SHIPPED: GeoCoordinates, sameAs, businessType mapping, priceRange, dateModified, dietary tags, availability, shared schema utilities                    |
| Feb 22, 2026 | Phase 2 SHIPPED: FAQ schema, BreadcrumbList, dateModified on menu, servesCuisine, sitemap enhancement                                                           |
| Mar 10, 2026 | Infrastructure expansion: Taxonomy (95+ categories), Provenance (6 fields), Semantics (17 attributes), Entity Index (types + builder) — all feature-flagged OFF |
| Mar 10, 2026 | Deep architecture audit (20-layer GEO/AEO) + 24-layer infrastructure audit                                                                                      |
| Mar 10, 2026 | **CODE FIXES:** cuisineTypes on StoreDataType, explicit AI bot rules in robots.txt, publisher Organization in schema, sitemap real timestamps, Disallow /api/   |
| Mar 10, 2026 | **DOC CONSOLIDATION:** Merged `seo-aeo-discovery-infrastructure/` + `infrastructure-gap-analysis/` into this folder                                             |
| Mar 10, 2026 | **DOC UPDATE:** Added Entity Identity Rules (invariants), Item Similarity Matching documentation, Dataset Coverage Metrics, strengthened Doctrine Rules         |
| May 9, 2026  | **PARITY UPDATE:** Corrected discovery copy to avoid Google/Maps/AI overclaims, updated `/client` route evidence, robots/sitemap status, flag defaults, and current llms.txt line counts |
| May 23, 2026 | **AGENT-READABLE WEBSITE HARDENING:** Added server-rendered website JSON-LD coverage, removed legacy `/product` from platform discovery inventories, documented PAL/WebMCP boundaries, and added `verify:agent-readiness` for MenuList and Answerlattice |
| Jun 2, 2026  | **PUBLIC TRUTH INDEXING GATE:** Added central indexability policy for public tenant OBP/menu metadata and sitemap inclusion; OBP runtime no longer emits generated FAQPage JSON-LD |
| Jun 23, 2026 | **STALE PUBLIC MENU NOINDEX:** Missing project/menu slug fallback pages and stale item/category detail pages now keep customer recovery behavior but emit `noindex, follow` and canonicalize back to the current tenant/outlet/menu surface |
