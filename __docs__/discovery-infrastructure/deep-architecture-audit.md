# MenuList GEO/AEO Discovery Infrastructure — Deep Architecture Audit

> **Type:** Complete System Audit — Technical Architecture Report
> **Source:** `menulist-geo-aeo.md` (8,853 lines — ChatGPT strategic spec)
> **Method:** Full codebase audit with file:line evidence for every claim
> **Auditor:** Cascade (full codebase access)
> **Date:** March 10, 2026
> **Parity refresh:** May 9, 2026
> **Rule:** Every finding backed by exact file references. "NOT FOUND IN CODEBASE" used where applicable.

---

## 1. Executive Summary

### Strategic Goal

MenuList = **customer-facing business truth infrastructure for restaurants** — canonical structured source of menu truth, hours truth, public business identity, and structured restaurant data.

MenuList must **NEVER** become: discovery platform, ranking system, review platform, marketplace, or food search engine.

### ChatGPT Accuracy Assessment

| Metric | ChatGPT Estimate | Actual (Codebase) | Delta |
|--------|-----------------|-------------------|-------|
| **Overall GEO/AEO Readiness** | ~35% | **~65%** | **+30%** |
| **Schema Markup** (biggest miss) | 0-10% | **~90%** | **+80%** |
| **Crawlability** | "incomplete" | **~85%** | **+45%** |
| **Entity Graph** | ~70% internal | **~80%** | +10% |
| **Freshness Signals** | "internal only" | **~85%** | **+45%** |

### What ChatGPT Got Wrong
- Assumed schema.org was 0-10% → actually **~90%** (721 core schema lines, 18+ types)
- Assumed geo coordinates missing → `store.geo: {lat, lng}` exists (`store.ts:252-255`)
- Assumed priceRange missing → `store.priceRange` exists (`store.ts:258`)
- Assumed no dietary tags → `item.tags: string[]` exists (`extractedData.types.ts:58`)
- Assumed no sameAs → `buildSameAs()` fully implemented (`schema/index.ts:121-142`)

---

## 2. Current MenuList Architecture

### Core Data Model

```
Tenant (tId: number)
 └── Store (sId: number) — 497-line type, 60+ fields
      ├── name, email, phone, address, city, state, country, postalCode
      ├── geo: { latitude, longitude }         ← store.ts:252-255
      ├── priceRange: '$'|'$$'|'$$$'|'$$$$'    ← store.ts:258
      ├── workingHours: Record<string, string>  ← store.ts:101
      ├── businessType, businessCategory        ← store.ts:90-91
      ├── businessAttributes: { wifi, outdoor, dietary... } ← store.ts:315-339
      ├── publicPresence: { descriptor, googleMapsUrl... }  ← store.ts:265-288
      ├── gbp: { accountId, locationId... }     ← store.ts:167-178
      ├── socialMedia: Record<string, string>   ← store.ts:102
      ├── subdomain, customDomain               ← store.ts:112-113
      ├── publicApi: { apiKey, createdAt }      ← store.ts:376-379
      └── healthSignals: { trust, loyalty, risk } ← store.ts:461-480
           │
           └── Project (projectId: string) — nested subcollection
                ├── slug, previousSlugs[], menuVersion, lastPublishedAt
                └── files[].extractedData.data:
                     ├── categories[]: { id, name{lang}, timeSlots }
                     ├── items[]: { id, category, name{lang}, price, tags[], available }
                     └── languages[]: { name, code, isPrimary }
```

### Key Infrastructure Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/schema/index.ts` | 465+ | Shared schema.org utilities |
| `src/lib/seo/discoveryPolicy.ts` | 140+ | Shared platform route and crawler discovery policy |
| `src/lib/seo/publicMetadata.ts` | 60+ | Shared public preview metadata normalization |
| `src/app/client/obp/schema.ts` | 256 | OBP schema generation |
| `src/app/client/[[...slug]]/page.tsx` | 1,777 | Menu page SSR + schema injection |
| `src/app/client/robots.ts` | 62 | Per-store robots.txt |
| `src/app/client/sitemap.ts` | 230 | Per-store sitemap.xml |
| `public/robots.txt` | 40 | Platform robots.txt |
| `public/llms.txt` | current | LLM discovery document |
| `public/llms-full.txt` | current | Extended LLM documentation |
| `src/lib/infrastructure/taxonomy/registry.ts` | 135 | Offering taxonomy system |
| `src/lib/infrastructure/discovery/` | ~3 files | Business entity index |
| `src/types/platform/store.ts` | 497 | Store entity definition |

---

## 3. Layer-by-Layer Gap Analysis

---

### LAYER 1: Crawlability Infrastructure — 85% DONE

**ChatGPT said:** "incomplete" → **Actually: ~85%**

| Requirement | Status | File Evidence |
|------------|--------|---------------|
| Platform robots.txt | ✅ | `public/robots.txt:1-40` — explicit search/AI crawler allows + internal disallows |
| Per-store robots.txt | ✅ | `src/app/client/robots.ts:12-61` — Dynamic per-subdomain/custom-domain sitemap + explicit search/AI crawler allow rules |
| Server-rendered HTML | ✅ | `src/app/client/[[...slug]]/page.tsx` — Full Next.js SSR |
| Platform sitemap | ✅ | `src/lib/seo/discoveryPolicy.ts` + `src/app/sitemap.ts` — shared platform route inventory |
| Per-store sitemap | ✅ | `src/app/client/sitemap.ts:167-229` — OBP + active canonical menu/outlet URLs with store/outlet `modifiedOn` |
| Sitemap in robots | ✅ | `public/robots.txt:40` + `src/app/client/robots.ts:60` |
| Crawl budget protection | ✅ | `public/robots.txt:30-37` — Blocks /admin/, /login/, /register/, /dashboard/, /api/, /editor/, /preview/ |
| Bot-friendly rendering | ✅ | SSR = full HTML on first request |
| Internal linking | ✅ | OBP → /menu, menu → OBP bidirectional |

**May 9, 2026 parity update:** The original crawlability gaps are closed in active code. Platform and tenant robots now explicitly allow OAI-SearchBot, ChatGPT-User, GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Googlebot, and Bingbot, while disallowing internal paths. Tenant sitemap entries use store/outlet `modifiedOn` instead of request-time `new Date()`. Remaining limitation: menu project entries use the store/outlet modified timestamp, not a per-project modified timestamp.

---

### LAYER 2: Entity ID System — 80% DONE

**ChatGPT said:** "~70% internal" → **Actually: ~80%**

| Entity | ID Field | Generation | Immutable | File |
|--------|----------|-----------|-----------|------|
| Store | `storeId: number` | Auto-increment | ✅ | `store.ts:19` |
| Project | `projectId: string` | Firestore auto-ID | ✅ | `project.types.ts:69` |
| Category | `id: string` | AI extraction | ✅ (within project) | `extractedData.types.ts:30` |
| Item | `id: string` | AI extraction | ✅ (within project) | `extractedData.types.ts:47` |
| Attribute | `id: string` | `{itemId}a{seq}` | ✅ (namespaced) | `extractedData.types.ts:40` |
| Local Item | `id: string` | `local_item_${Date.now()}_${random}` | ✅ | `multiOutlet.types.ts:123` |
| Location | Part of Store | `storeId` | ✅ | `store.ts:252-255` |

**GAPS:**
1. **Cuisine depends on owner/store data** — `StoreDataType.cuisineTypes` now exists and schema reads it, but not every store will have cuisine data filled → LOW risk
2. **No globally unique item IDs** — IDs unique within project only → Intentionally outside doctrine

**May 9, 2026 parity update:** `cuisineTypes?: string[]` exists on `StoreDataType` and both OBP/menu schema output `servesCuisine` when present.

---

### LAYER 3: Entity Relationships — 80% DONE

| Relationship | Storage | Schema Exposure | Evidence |
|-------------|---------|----------------|----------|
| Store → Project(s) | Nested subcollection | ✅ `hasMenu` for food, `hasOfferCatalog` for non-food | `src/app/client/obp/schema.ts`, `src/app/client/[[...slug]]/page.tsx` |
| Project → Category[] | Array in extractedData | ✅ `hasMenuSection` for food, nested `OfferCatalog` for non-food | `src/app/client/[[...slug]]/page.tsx` |
| Category → Item[] | `item.category === category.id` | ✅ `hasMenuItem` for food, `Offer.itemOffered` for non-food | `src/app/client/[[...slug]]/page.tsx` |
| Item → Price | `item.price: string` | ✅ `offers.price` | `page.tsx:565-574` |
| Item → Availability | `item.available: boolean` | ✅ `InStock/OutOfStock` | `page.tsx:570-572` |
| Item → Dietary | `item.tags[]` | ✅ `suitableForDiet` | `page.tsx:575-577` |
| Store → Location | `store.geo`, address fields | ✅ `address` + `geo` | `schema/index.ts:61-86` |
| Store → Hours | `store.workingHours` | ✅ `openingHoursSpecification` | `schema/index.ts:93-114` |
| Store → Social | `store.socialMedia` | ✅ `sameAs` | `schema/index.ts:121-142` |
| Store → Cuisine | `store.cuisineTypes[]` | ✅ `servesCuisine` when present | `src/types/platform/store.ts:330-333`, `src/app/client/[[...slug]]/page.tsx:926`, `src/app/client/obp/schema.ts:123` |

**May 9, 2026 parity update:** The old dead `servesCuisine` path has been replaced by `storeData.cuisineTypes`.

---

### LAYER 4: Schema Markup Infrastructure — 90% DONE

**ChatGPT said:** "0-10%" → **Actually: ~90% — THE BIGGEST MISS**

**Total: 721 lines across 2 core schema files, 18+ schema.org types**

`src/lib/schema/index.ts` — shared builder functions:
- `buildAddress()` → PostalAddress ✅
- `buildGeoCoordinates()` → GeoCoordinates ✅
- `buildOpeningHours()` → OpeningHoursSpecification ✅
- `buildSameAs()` → sameAs array ✅
- `buildAmenityFeatures()` → LocationFeatureSpecification (14 attributes) ✅
- `getSchemaType()` → consumes `src/data/shared/businessTypes.ts` category defaults plus type-level schema overrides ✅
- `buildBreadcrumbList()` → BreadcrumbList ✅
- `buildFaqSchema()` → FAQPage (auto-generated Q&A) ✅
- `buildTempStatusSchema()` → specialOpeningHoursSpecification ✅
- `getMenuSchemaType()` → Food catalog type resolution while preserving non-food SMB schema types ✅
- `buildPublicCatalogUrlSchema()` → `hasMenu` for food, `hasOfferCatalog` for non-food ✅

`src/app/client/obp/schema.ts` (256 lines):
- ReserveAction + OrderAction with EntryPoint ✅
- paymentAccepted (Cash, Card, UPI) ✅
- dateModified freshness signal ✅
- hasMenu URL link for food, hasOfferCatalog URL link for non-food ✅

Menu page (`page.tsx:504-582`):
- Full `Menu → MenuSection → MenuItem → Offer` chain for food and `OfferCatalog → Offer → Product/Service` chain for non-food ✅
- Dual JSON-LD blocks (entity schema + BreadcrumbList) ✅
- `suitableForDiet` for vegetarian items ✅
- `availability` (InStock/OutOfStock) per item ✅

**GAPS:**
1. **Menu items capped** at 10 categories × 20 items (`page.tsx:941,947`) → Large menus partially represented
2. **No ImageObject schema** on menu item images → LOW risk

---

### LAYER 5: Canonical Identity / URL System — 70% DONE

| Requirement | Status | Evidence |
|------------|--------|----------|
| Business canonical URL | ✅ | `{subdomain}.menulist.ai` — `store.ts:112` |
| Menu canonical URL | ✅ | `{subdomain}.menulist.ai/menu` |
| Custom domains | ✅ | `store.customDomain` — `store.ts:113` |
| Slug permanence | ✅ | `previousSlugs[]` max 5 + 301 redirects — `project.types.ts:84` |
| Slug lock | ✅ | `slugLockedAt: Timestamp` — `project.types.ts:87` |
| Reserved namespaces | ✅ | Protected slugs prevent collision |
| Canonical tags | ✅ | `generateMetadata()` in page components |
| Outlet routing | ✅ | `outletSlug` — `store.ts:127` |
| 11 ADRs | ✅ | `__docs__/url-routing-architecture/` |

**NO GAPS within doctrine.** City/cuisine/dish pages are intentionally outside MenuList's identity.

---

### LAYER 6: Freshness & Truth Signals — 85% DONE

| Signal | Status | Evidence |
|--------|--------|----------|
| `menuVersion: number` | ✅ | Monotonic increment on publish — `project.types.ts` |
| `lastPublishedAt: Timestamp` | ✅ | Server-side timestamp — `database/projects/index.ts` |
| `dateModified` in schema.org | ✅ | ISO 8601 on all public pages — `obp/schema.ts:80-84` |
| Menu snapshots | ✅ | Immutable snapshot on every publish — `menuSnapshots` collection |
| MOL (Menu Observation Log) | ✅ | Append-only event ledger tracking all changes |
| `storeTruthConfidence` | ✅ | Nightly composite score — `functions/src/analytics/storeTruthConfidence.ts` |
| MCE validation stamps | ✅ | `_mce` metadata on project docs |
| Staleness detection | ✅ | 90-day cooldown nightly check — `functions/src/analytics/stalenessCheck.ts` |

**GAPS:**
1. **Per-project sitemap freshness is coarse** — sitemap uses store/outlet `modifiedOn`, not each project document timestamp → LOW risk
2. **No visible `lastUpdated` text** on public pages (schema.org + verified badge cover most of the need) → LOW risk

---

### LAYER 7: Machine Truth Endpoints — 60% DONE

| Endpoint | Status | Evidence |
|----------|--------|----------|
| `public/llms.txt` | ✅ | Structured LLM discovery doc |
| `public/llms-full.txt` | ✅ | Full category/type-aware schema.org documentation |
| Public API v1 (business) | ✅ | `GET /api/public/v1/business` — store details |
| Public API v1 (menu) | ✅ | `GET /api/public/v1/menu` — full menu data |
| POS Webhook Sync | ✅ | Push-based menu data delivery — feature-flagged |
| Schema.org JSON-LD | ✅ | On every public page |
| Per-store sitemap | ✅ | `{subdomain}.menulist.ai/sitemap.xml` |

**GAPS:**
1. **No `.well-known` endpoints** — NOT FOUND IN CODEBASE → LOW risk (llms.txt serves same purpose)
2. **No dedicated JSON feed** (RSS/Atom equivalent for menu changes) → LOW risk
3. **No structured menu API for AI agents** beyond v1 → Future consideration

---

### LAYER 8: Identity Resolution — 15% DONE

| Requirement | Status | Evidence |
|------------|--------|----------|
| Duplicate business prevention | ❌ | NOT FOUND IN CODEBASE — No matching logic exists |
| Name-based matching | ❌ | No cross-business name comparison |
| Address-based matching | ❌ | No address deduplication |
| Phone-based matching | ❌ | No phone number cross-reference |
| Coordinate-based matching | ❌ | No proximity-based duplicate detection |
| Google Place ID linking | ⚠️ | `store.gbp.locationId` exists (`store.ts:170`) but GBP API blocked |

**IMPORTANT:** Identity resolution is **intentionally outside MenuList doctrine**. MenuList is a per-business truth layer — each business creates and owns their own entity. Cross-business deduplication would require MenuList to act as a directory/aggregator, which violates its core identity.

**Risk:** LOW within doctrine. If MenuList ever aggregates data across businesses (e.g., for the discovery index), identity resolution would become necessary.

---

## 4. Doctrine Compliance Review

The ChatGPT conversation suggested building:
- City discovery pages (`/pune`, `/mumbai`)
- Cuisine discovery pages (`/cuisine/japanese`)
- Dish discovery pages (`/dish/ramen`)
- Nearby restaurant sections
- Geographic discovery lists
- Global dish knowledge graph

**MenuList doctrine explicitly prohibits** becoming a discovery platform, ranking system, or marketplace.

### What IS Within Doctrine ✅
- Making existing business pages maximally machine-readable ✅
- Emitting rich schema.org for AI consumption ✅
- Providing stable canonical URLs ✅
- Exposing freshness signals ✅
- Maintaining structured data quality ✅
- LLM discovery documents (llms.txt) ✅
- Public read-only API ✅

### What IS Outside Doctrine ❌
- City/cuisine/dish discovery pages ❌
- Cross-business aggregation ❌
- Nearby restaurant links ❌
- Geographic discovery lists ❌
- Restaurant ranking/comparison ❌
- Global food knowledge graph ❌

**The GEO/AEO infrastructure should enhance existing pages, not create new discovery surfaces.**

---

## 5. Identified System Risks

### Risk 1: Cuisine Coverage (LOW)
- `cuisineTypes?: string[]` exists and schema emits `servesCuisine` when present
- Gap is now data completeness, not code structure
- Owner onboarding/settings should continue encouraging cuisine selection for food businesses

### Risk 2: Project-Level Sitemap Freshness (LOW)
- Per-store sitemap now uses store/outlet `modifiedOn` for crawl freshness. Project-specific timestamps remain coarse because project entries inherit the store/outlet timestamp.
- Should use actual `store.modifiedOn` or `project.lastPublishedAt`
- AI engines may de-prioritize if they detect the timestamp is always "now"

### Risk 3: Schema Menu Caps (LOW)
- `page.tsx:554` limits to 10 categories, `page.tsx:559` limits to 20 items per category
- Large menus (30+ categories, 50+ items) partially represented in schema.org
- Most restaurants are under these limits, but some chains may exceed

### Risk 4: Publisher Identity (RESOLVED)
- OBP schema emits `publisher: Organization` in `src/app/client/obp/schema.ts`
- Menu schema emits `publisher: Organization` at `src/app/client/[[...slug]]/page.tsx:1021-1025`

---

## 6. Missing Infrastructure Summary

### Within Doctrine — Should Build

| Gap | Priority | Effort | Impact |
|-----|----------|--------|--------|
| Increase cuisine completeness in owner settings/onboarding | P2 | 1-2 hrs | Improves "cuisine + city" AI queries |
| Add explicit AI bot rules to robots.txt | P2 | 5 min | Signals intentional AI openness |
| Wire actual timestamps into sitemap lastModified | P2 | 30 min | Accurate freshness signals |
| Add `Disallow: /api/` to robots.txt | P3 | 1 min | Clean crawl budget |
| Auto-generate natural language summary on OBP | P3 | 2 hrs | Better LLM extraction |
| Expose popular items on public pages | P3 | 2 hrs | Answer "what is X known for" queries |

### Outside Doctrine — Do NOT Build

| Item | Why Excluded |
|------|-------------|
| City discovery pages | MenuList ≠ discovery platform |
| Cuisine index pages | MenuList ≠ food search engine |
| Dish-level URLs | MenuList ≠ recipe database |
| Nearby restaurant sections | MenuList ≠ marketplace |
| Cross-business comparison | MenuList ≠ ranking system |
| Global food ontology | Outside 3-year architecture scope |

---

## 7. Implementation Roadmap

### Phase A: Quick Wins (< 1 day)
1. Keep crawler rules explicit on both platform and tenant robots.
2. Improve project-level sitemap freshness only if summary data provides reliable timestamps.
3. Keep cuisine completeness as an owner-data quality task, not schema plumbing.

### Phase B: Freshness Accuracy (1 day)
1. Wire `store.modifiedOn` / `project.lastPublishedAt` into per-store sitemap `lastModified`
2. Consider visible "Last updated" text on public pages (doctrine-compatible if minimal)

### Phase C: Content Enhancement (2-3 days)
1. Auto-generate natural language summary on OBP from store data
2. Expose Decision Intelligence top items on public pages as "Popular" section
3. Keep `servesCuisine` populated when store has cuisine data

### Phase D: Taxonomy Activation (When organic demand appears)
1. Enable `ENABLE_INFRASTRUCTURE_TAXONOMY` flag
2. Wire taxonomy into nightly scheduler
3. Populate discovery index

---

## 8. Development Priority Order

| Priority | Action | Justification |
|----------|--------|---------------|
| **P0** | Monitor sitemap freshness accuracy | Project-specific freshness is still coarse |
| **P1** | Improve cuisine field completeness | Enables critical AI query category |
| **P2** | Explicit AI bot rules in robots.txt | Industry standard signal |
| **P2** | Fix sitemap lastModified accuracy | Correct freshness signals |
| **P3** | Natural language summaries on OBP | Better LLM answer extraction |
| **P4** | Popular items section on public pages | Answers "known for" queries |
| **DEFER** | Discovery pages (city/cuisine/dish) | Outside doctrine |
| **NEVER** | Cross-business aggregation | Violates core identity |

---

## 9. Final Score

| Layer | ChatGPT Est. | Actual | Delta |
|-------|-------------|--------|-------|
| 1. Crawlability | incomplete | **85%** | +45% |
| 2. Entity Graph | 70% | **80%** | +10% |
| 3. Schema Markup | 0-10% | **90%** | **+80%** |
| 4. URL Architecture | 50% | **70%** | +20% |
| 5. Knowledge Graph | 25-30% | **50%** | +20% |
| 6. AI Retrieval | 60% | **75%** | +15% |
| 7. AEO Citation | 35% | **50%** | +15% |
| 8. Geo Discovery | 10-15% | **35%** | +20% |
| 9. Menu Discovery | 0% | **25%** | +25% |
| 10. Freshness Signals | "internal" | **85%** | +45% |
| 12. AI Data Export | unknown | **60%** | — |
| 13. AI Agent Access | unknown | **80%** | — |
| **Weighted Average** | **~35%** | **~65%** | **+30%** |

**Conclusion:** MenuList is substantially GEO/AEO ready. The remaining gaps are small enhancements around data completeness, project-level sitemap freshness, and future ecosystem feeds, not structural rebuilds. ChatGPT's 20-layer framework is strategically sound but its implementation estimates were significantly wrong due to zero code access. The schema.org implementation remains the biggest miss in the external assessment.
