# SEO/AEO Discovery Infrastructure

> **Strengthen MenuList as the canonical structured data source for SMB discovery — through targeted schema enrichment, not platform rebuilds.**

This feature extends the existing Official Business Page (OBP) and digital menu pages with deeper structured data, AEO (Answer Engine Optimization) readiness, and schema.org best practices for 2026+ AI-powered search.

---

## Quick Navigation

| Audience            | Document                                                               | Purpose                                          |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| Sales / Marketing   | [Marketing](./seo-aeo-discovery-infrastructure_marketing.md)           | Sales scripts, positioning, competitive analysis |
| Potential Customers | [Website](./seo-aeo-discovery-infrastructure_website.md)               | Landing page content, SEO meta                   |
| Existing Customers  | [Help Doc](./seo-aeo-discovery-infrastructure_helpdoc.md)              | Customer-facing help article                     |
| Mobile              | [Mobile Support](./seo-aeo-discovery-infrastructure_mobile-support.md) | Owner-facing informational card on desktop/mobile |
| Archive             | [ChatGPT Review](./_archive/chatgpt-review.md)                         | Original conversation critical review            |
| Archive             | [ChatGPT Feedback R2](./_archive/chatgpt-feedback-round2.md)           | Post-implementation founder-level feedback       |

**Status:** ✅ Phase 2 COMPLETE (Feb 22, 2026) — Schema enrichment + FAQ + BreadcrumbList + sitemap enhancement shipped.

**May 9, 2026 parity note:** Active route files now live under `src/app/client/`. Tenant sitemaps index OBP plus active canonical project/outlet URLs; the universal `/menu` fallback is not indexed unless an owner has claimed that slug.

---

## One-Liner

Enrich MenuList's existing OBP and menu pages with deeper schema.org structured data to become the most trusted machine-readable SMB data source for search engines and AI.

---

## Strategic Context

### What This IS

- **Schema enrichment** of existing OBP and menu pages
- **AEO optimization** — making pages AI-readable for ChatGPT/Gemini/Perplexity citations
- **Targeted additions** to existing store data model (geo, priceRange)
- **Shared schema utilities** to eliminate duplication between OBP and menu schema generators

### What This IS NOT

- ❌ New Firestore collections or entity graphs
- ❌ SEO dashboards or keyword tracking tools
- ❌ Marketing automation or social scheduling
- ❌ Architecture rewrite or tenant restructuring
- ❌ Multi-platform distribution engine (premature)

---

## Key Files in Codebase

| File                                   | Purpose                                                                                                                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/schema/index.ts`              | Shared schema.org utilities (buildAddress, buildGeoCoordinates, buildOpeningHours, buildSameAs, buildBreadcrumbList, buildFaqSchema, buildTempStatusSchema, getSchemaType, getMenuSchemaType) |
| `src/app/client/obp/OBPContent.tsx`   | OBP page — renders FAQ JSON-LD schema (Phase 2)                                                                                                                                               |
| `src/app/client/obp/schema.ts`        | OBP schema — uses shared utilities + geo, sameAs, priceRange, dateModified, business-specific @type                                                                                           |
| `src/app/client/[[...slug]]/page.tsx` | Menu schema — BreadcrumbList JSON-LD, dateModified, servesCuisine, availability, suitableForDiet (Phase 2)                                                                                    |
| `src/app/client/sitemap.ts`           | Tenant sitemap — OBP + active canonical menu/outlet URLs; `/menu` is indexed only when owner-claimed                                                                                          |
| `src/types/platform/store.ts`          | StoreDataType — `geo`, `priceRange`, `cuisineTypes`, `tempStatus` fields                                                                                                                       |

---

## Relationship to Existing Features

| Feature                          | Status              | Relationship                                                                                                     |
| -------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Official Business Page (OBP)** | ✅ BUILT            | OBP is the canonical identity page this feature enriches                                                         |
| **GBP Sync**                     | ⚠️ FOUNDATION ONLY (flag OFF) | Store fields and docs exist, but OAuth/token runtime is disabled until API access is approved                   |
| **Catalog Schema**               | ✅ BUILT            | Food pages generate Menu/MenuItem schema; non-food SMB pages generate OfferCatalog/Offer schema                  |
| **Guest Feedback**               | ✅ BUILT            | Foundation for future reputation/review signals in schema                                                        |
| **Store Data Model**             | ✅ EXISTS           | Contains 90%+ of fields needed for full schema generation                                                        |
| **Agent Readiness Strategy**     | ✅ BUILT            | Extends this feature with AI discovery layer (llms.txt, llms-full.txt). See `__docs__/agent-readiness-strategy/` |

---

## Key Decision from ChatGPT Review

**ChatGPT proposed:** 5-7 new architectural layers, new Firestore collections, tenant brand taxonomy rewrite.

**Architect decision:** REJECT the rewrite. MenuList is already 80% of the way. The remaining 20% is **targeted schema enrichment on existing pages and data**, not a platform rebuild.

See [ChatGPT Review](./_archive/chatgpt-review.md) for full analysis with 22-point decision matrix.

---

## Implementation Summary (Feb 16, 2026)

### ✅ SHIPPED — HIGH Priority (All 5)

1. ✅ **GeoCoordinates** — `buildGeoCoordinates()` in shared utilities, reads `store.geo.latitude/longitude`
2. ✅ **sameAs** — `buildSameAs()` pulls from `store.socialMedia` + `store.url`
3. ✅ **Business-specific @type** — `getSchemaType()` maps businessType → Restaurant, BeautySalon, CafeOrCoffeeShop, etc.
4. ✅ **priceRange** — New field on StoreDataType, output in schema
5. ✅ **dateModified** — Uses `store.modifiedOn` as freshness signal in OBP schema

### ✅ SHIPPED — MEDIUM Priority (3/3)

6. ✅ **Dietary info** — `suitableForDiet: VegetarianDiet` from item tags in menu schema
7. ✅ **Availability** — `InStock`/`OutOfStock` from `item.available` in menu Offer schema
8. ✅ **Shared schema utilities** — `src/lib/schema/index.ts` eliminates duplication

### LOW Priority — Research Only (Not implemented)

9. Multi-platform distribution research (Apple Maps, directories)
10. AI search visibility monitoring (manual, no dashboard)
11. ~~FAQ schema on OBP~~ → ✅ SHIPPED in Phase 2 (Feb 22, 2026)

---

## Feature Flag

No new feature flag needed. Schema enrichment is always active on public pages. No owner-facing UI changes.

---

## Architecture Decision

**Zero new collections. Zero new API routes. Zero new feature flags for this schema enrichment work.**

All schema enrichment is computed from existing store data at render time. New fields (`geo`, `priceRange`, `cuisineTypes`) are optional on StoreDataType — pages degrade gracefully if absent (Law 5: show less, not wrong).

Shared utilities in `src/lib/schema/index.ts` are used by both OBP (`schema.ts`) and menu page (`page.tsx`). Single source of truth for address, geo, hours, sameAs, and businessType mapping.

---

## 90-Day Roadmap: Quiet Infrastructure Strengthening

> **Operating Mode:** Mode A — Quiet infrastructure strengthening (founder decision, Feb 16 2026)
>
> **North Star:** Make MenuList the cleanest structured SMB dataset on the internet. Not biggest. Not viral. **Cleanest. Most structured. Most machine-trusted.**

### Phase 1: Schema + Entity Perfection (Weeks 1-4) — ✅ COMPLETE

- ✅ GeoCoordinates, sameAs, businessType mapping, priceRange, dateModified
- ✅ Dietary tags (suitableForDiet), availability (InStock/OutOfStock)
- ✅ Shared schema utilities (deduplication)
- ✅ All shipped Feb 16, 2026

### Phase 2: Search Authority Deepening (Weeks 5-8) — ✅ COMPLETE

Deepen schema.org output for richer search results.

- ✅ **FAQ schema on OBP** — Auto-generated FAQPage from store hours, location, phone, menu link
- ✅ **BreadcrumbList on menu pages** — Business → Menu navigation for search display
- ✅ **dateModified on menu pages** — Freshness signal (already on OBP, now on menu)
- ✅ **servesCuisine on menu pages** — Cuisine type for food businesses
- ✅ **Sitemap enhancement** — Added `/menu` URL alongside root OBP URL
- All shipped Feb 22, 2026

### Phase 3: Controlled Real SMB Data (Weeks 9-12) — PENDING

Only after infra is strong.

- Onboard **10-25 premium SMBs** manually (not scale)
- Observe: data completeness, schema accuracy, page performance, and owner link placement. GBP API sync is disabled until prerequisites are approved.
- Refine silently based on real-world structured data

---

## Entity Consistency Standard

> Every store must be a **perfectly structured business node.**

For MenuList pages to be the cleanest SMB data source, every store document must have:

| Field                            | Status      | Notes                             |
| -------------------------------- | ----------- | --------------------------------- |
| `name`                           | Required    | Already enforced                  |
| `businessType`                   | Required    | Maps to schema.org @type          |
| `addressLine` + `city` + `state` | Required    | PostalAddress schema              |
| `workingHours`                   | Recommended | OpeningHoursSpecification         |
| `phoneNumber`                    | Required    | Already enforced                  |
| `socialMedia`                    | Recommended | Feeds sameAs for entity alignment |
| `geo.latitude` + `geo.longitude` | Recommended | GeoCoordinates for local SEO/AEO  |
| `cuisineTypes`                   | Recommended for food businesses | Feeds `servesCuisine` in schema |
| `priceRange`                     | Recommended | AI search matching                |
| `logo`                           | Required    | Already enforced                  |

This is a **data quality discipline**, not a code feature. Enforced through onboarding flow and Business Settings completeness prompts.

---

## 90-Day Operating Rules

### DO:

- Strengthen infra, data, structure, trust layer
- Harden public pages (SSR, speed, schema)
- Test AI discoverability manually
- Onboard 10-25 SMBs with care

### DO NOT:

- Chase growth or run ads
- Mass onboard
- Build dashboards or marketing tools
- Add random features
- Pivot positioning
- Build entity scoring or brand graphs

---

## Version History

| Date         | Change                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| Feb 16, 2026 | ChatGPT conversation reviewed. Strategic direction validated. Execution plan defined.                          |
| Feb 16, 2026 | **IMPLEMENTED:** Shared schema utilities, OBP + menu schema enrichment, StoreDataType fields (geo, priceRange) |
| Feb 16, 2026 | ChatGPT feedback round 2 processed. 90-day roadmap locked. Entity consistency standard defined.                |
| Feb 22, 2026 | **PHASE 2:** FAQ schema on OBP, BreadcrumbList on menu, dateModified + servesCuisine on menu, sitemap enhanced |
| May 9, 2026  | **PARITY UPDATE:** Corrected `/client` paths, GBP sync status, sitemap indexing rules, and `cuisineTypes` store field |

---

**Document Signature:** Cascade (Lead Architect)  
**Last Updated:** May 9, 2026
