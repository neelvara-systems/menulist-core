# MenuList Infrastructure Gap Analysis

> **24-Layer Infrastructure Audit Against Canonical SMB Truth Architecture**
> Date: March 10, 2026 | Source: ChatGPT Future Outlook + Full Codebase Audit

---

## Table of Contents

1. [System Architecture Map](#1-system-architecture-map)
2. [Data Model Documentation](#2-data-model-documentation)
3. [System Pipeline Analysis](#3-system-pipeline-analysis)
4. [24-Layer Audit](#4-24-layer-audit)
5. [Gap Summary Matrix](#5-gap-summary-matrix)
6. [Critical Gaps](#6-critical-gaps)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. System Architecture Map

### Stack

| Layer           | Technology                                                |
| --------------- | --------------------------------------------------------- |
| Frontend + API  | Next.js 14 on Vercel                                      |
| Database        | Firestore (ecomsai + canonica projects)                   |
| Cloud Functions | Firebase Functions v2 (nightly batch, triggers, webhooks) |
| Storage         | Firebase Storage (tenant-scoped paths)                    |
| Auth            | NextAuth.js v4 + Google OAuth                             |
| AI              | Gemini 2.5 Flash (extraction, descriptions, intelligence) |
| Rate Limiting   | Upstash Redis (sliding window)                            |
| Payments        | Razorpay (subscriptions, topups)                          |
| Monitoring      | Sentry + Telegram alerts                                  |

### Key Directories

- `src/database/` — 40+ DAL modules (Firestore client SDK)
- `src/lib/mce/` — Menu Correctness Engine (18 rules, 5 Laws)
- `src/lib/schema/` — Schema.org structured data (343 lines)
- `src/lib/posSync/` — POS webhook infrastructure
- `src/lib/publicApi/` — Platform Pull API auth
- `functions/src/decisionBlocksScoring.ts` — Nightly scheduler (78K, 8 tasks)
- `functions/src/analytics/` — Truth confidence, extraction learning, staleness

### Firestore Collections (60+)

**Core:** tenants, stores, projects/{tId}/{sId}/{projectId}, platformSummary
**Intelligence:** decisionBlocks, menuIntelligence, ownerControlUsage, menuChangeLog, menuItemState, menuSnapshots
**Analytics:** chatAnalytics, analytics, insights/{tId}/stores/{sId}/ai/
**Operations:** subscriptions, messageLogs, systemAlerts, schedulerRunLogs, ops_config

### Nightly Scheduler (8 tasks, 2:30 AM UTC)

1. decision_blocks — DI scoring
2. menu_intelligence — CMI computation
3. authority_maturation — Owner control patterns
4. menu_drift — 30-day rolling drift
5. guest_feedback_retention — 90-day cleanup
6. subscription_reconciliation — Razorpay sync
7. obp_analytics — OBP weekly aggregation
8. lifecycle_messaging — Renewal/suspension alerts

---

## 2. Data Model Documentation

### Business Entity (`StoreDataType` — 486 lines, `src/types/platform/store.ts`)

Covers: name, email, phone, logo, description, address, city/state/country, geo (lat/lng), businessType (60+ types), businessCategory (7 derived), currency, timezone, locale, activeLanguages, workingHours, socialMedia, SEO fields, subdomain/customDomain, businessAttributes (dietary/amenities/service/payment booleans), publicPresence (descriptor, whatsApp, maps, reservation/order URLs), posSync, publicApi, healthSignals (trust/loyalty/risk), tempStatus, priceRange, GBP integration, feedbackSettings, roles/permissions (22 flags), outletPolicy, notificationSettings.

### Offering Entity (`ExtractedDataItem` — `extractedData.types.ts`)

Fields: id, name{lang}, description{lang}, descriptionSource('ai'|'manual'), price, category(ref), attributes[](variants with name{lang}/price), tags[], images[], active, available, isBestSeller, duration, ownerBoost, orderIndex.

### Category Entity (`ExtractedDataCategory`)

Fields: id, name{lang}, active, images[], timeSlots[], orderIndex.

### Project Entity (`Project` — `project.types.ts`, 393 lines)

Container: projectId, files[], languages[], config(ThemeConfig), menuSettings, menuVersion(monotonic), lastPublishedAt, \_mce(verification), \_specialMenu(scheduling), overrides(multi-outlet), masterProjectId, slug, previousSlugs[].

### Change Observation (`menuObservation.ts` — MOL)

15 change types tracked immutably. DerivedItemMetrics: 30-day rolling priceChangeCount, availabilityToggleCount, staleness flags (\_priceStale, \_availabilityChurn, \_highVolatility).

---

## 3. System Pipeline Analysis

### Ingestion: Upload → AI Extraction → Gemini OCR → Transform → Firestore

### Publishing: MCE validation → Publish-Gate → menuVersion++ → Snapshot → POS webhook → Cache invalidation

### Nightly: storesSummary(1 read) → 8 tasks per store → Truth confidence → Staleness check → Telegram summary

### Distribution: Digital Menu, OBP, QR, Physical Surfaces, POS Webhook, Public API, llms.txt, Schema.org JSON-LD, GBP, Mobile PWA, Digital Screens

---

## 4. 24-Layer Audit

See `24-layer-audit.md` for the full detailed analysis of each layer.

---

## 5. Gap Summary Matrix

| #   | Layer                            | Pre-Impl    | Post-Impl   | Risk   | Remaining Work                                          |
| --- | -------------------------------- | ----------- | ----------- | ------ | ------------------------------------------------------- |
| 1   | Entity Modeling                  | ✅ STRONG   | ✅ STRONG   | Low    | —                                                       |
| 2   | Canonical Identifiers            | ✅ STRONG   | ✅ STRONG   | Low    | —                                                       |
| 3   | Entity Relationships             | ✅ STRONG   | ✅ STRONG   | Low    | —                                                       |
| 4   | Data Normalization               | ⚠️ PARTIAL  | ⚠️ PARTIAL+ | Low    | Activate taxonomy in extraction + nightly               |
| 5   | Data Integrity Constraints       | ✅ STRONG   | ✅ STRONG   | Low    | —                                                       |
| 6   | Confidence Systems               | ⚠️ PARTIAL  | ⚠️ PARTIAL+ | Low    | Wire provenance into editor + extraction                |
| 7   | Conflict Resolution              | ⚠️ PARTIAL  | ⚠️ PARTIAL  | Low    | Deferred — not needed until bi-directional integrations |
| 8   | Schema Evolution                 | ✅ STRONG   | ✅ STRONG   | Low    | —                                                       |
| 9   | Change Intelligence              | ✅ STRONG   | ✅ STRONG   | Low    | —                                                       |
| 10  | Drift Detection                  | ✅ STRONG   | ✅ STRONG   | Low    | —                                                       |
| 11  | Data Freshness Tracking          | ⚠️ PARTIAL+ | ⚠️ PARTIAL+ | Low    | Time-based decay model                                  |
| 12  | Structured Data APIs             | ⚠️ PARTIAL  | ⚠️ PARTIAL  | Medium | API v2 + OpenAPI spec (Phase 3)                         |
| 13  | Data Feed Infrastructure         | ⚠️ PARTIAL  | ⚠️ PARTIAL  | Medium | Generic webhooks (Phase 3)                              |
| 14  | Schema Compatibility Layer       | ⚠️ PARTIAL  | ⚠️ PARTIAL+ | Low    | Pluggable adapter framework                             |
| 15  | Business Entity Graph            | ❌ MISSING  | ⚠️ PARTIAL  | Medium | Nightly scheduler task + query API                      |
| 16  | Cross-Business Taxonomy          | ⚠️ PARTIAL  | ⚠️ PARTIAL+ | Low    | Activate in nightly pipeline                            |
| 17  | Verification Mechanisms          | ✅ STRONG   | ✅ STRONG   | Low    | —                                                       |
| 18  | Provenance Metadata              | ⚠️ PARTIAL  | ⚠️ PARTIAL+ | Low    | Wire into editor + extraction                           |
| 19  | Historical Auditability          | ✅ STRONG   | ✅ STRONG   | Low    | —                                                       |
| 20  | Data Volume Scaling              | ✅ STRONG   | ✅ STRONG   | Low    | —                                                       |
| 21  | Multi-Tenant Isolation           | ✅ STRONG   | ✅ STRONG   | Low    | —                                                       |
| 22  | Global Localization              | ✅ STRONG   | ✅ STRONG   | Low    | —                                                       |
| 23  | Machine-Readable Semantics       | ⚠️ PARTIAL  | ⚠️ PARTIAL+ | Low    | Full ontology (if ever needed)                          |
| 24  | Distribution Surface Integration | ✅ STRONG   | ✅ STRONG   | Low    | —                                                       |

### Final Score (Post-Implementation, Adjusted per ChatGPT Feedback)

| Rating      | Count | Layers                                        |
| ----------- | ----- | --------------------------------------------- |
| ✅ STRONG   | 12    | 1, 2, 3, 5, 8, 9, 10, 17, 19, 20, 21, 22      |
| ⚠️ PARTIAL+ | 7     | 4, 6, 11, 14, 16, 18, 23                      |
| ⚠️ PARTIAL  | 4     | 7, 12, 13, 15                                 |
| ❌ MISSING  | 1     | — (Layer 15 upgraded from MISSING to PARTIAL) |

**Pre-implementation:** ~11 STRONG / ~9 PARTIAL / ~4 MISSING
**Post-implementation:** 12 STRONG / 7 PARTIAL+ / 4 PARTIAL / 0 MISSING

### What Changed After Implementation

| Layer                           | Before     | After       | What Was Built                                                                                                                  |
| ------------------------------- | ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 4 (Data Normalization)          | ⚠️ PARTIAL | ⚠️ PARTIAL+ | Offering taxonomy: 95+ standard categories across 7 business categories, SMB-universal offering tags (35+ tags), alias matching |
| 6 (Confidence)                  | ⚠️ PARTIAL | ⚠️ PARTIAL+ | Field-level provenance types + tracker (stampAIExtraction, stampOwnerEdit, detectChangedFields)                                 |
| 15 (Entity Graph)               | ❌ MISSING | ⚠️ PARTIAL  | BusinessEntityIndexDoc type + indexBuilder (pure function, compliance-safe, PUBLIC data only)                                   |
| 16 (Cross-Business Taxonomy)    | ⚠️ PARTIAL | ⚠️ PARTIAL+ | 95+ standard categories, 14 dietary tags, 20 cuisines, 35+ universal offering tags, all with alias matching                     |
| 18 (Provenance)                 | ⚠️ PARTIAL | ⚠️ PARTIAL+ | ProvenanceEntry/ItemProvenance types, 6 trackable fields, AI/owner/staff/system/import sources                                  |
| 23 (Machine-Readable Semantics) | ⚠️ PARTIAL | ⚠️ PARTIAL+ | 17 semantic attributes with schema.org mappings, grouped by amenity/dietary/service_mode/payment/accessibility                  |

### New Infrastructure Files Created

**Code:** `src/lib/infrastructure/` — 19 files across 4 modules
**Docs:** `__docs__/discovery-infrastructure/` — 6 documentation files (including consumer/distribution doc)
**Feature Flags:** 4 new flags in `src/config/features.ts` + CF mirror
**Collection:** `BUSINESS_ENTITY_INDEX` in both `src/constants/database.ts` + `functions/src/constants/database.ts`

---

## 6. Critical Gaps (Ranked by Impact)

### Gap #1: Business Entity Graph (Layer 15) — HIGH PRIORITY

No formal queryable graph connecting businesses, offerings, categories, and attributes across tenants. Without this, AI systems cannot answer "restaurants with biryani within 2km" from MenuList data. This is the single largest gap blocking MenuList from becoming a discovery infrastructure layer.

### Gap #2: Cross-Business Taxonomy (Layer 16) — HIGH PRIORITY

Business-level taxonomy is strong (60+ types, 7 categories). Offering-level taxonomy is absent — item names, category names, and tags are free-text per business with no standardization. AI queries need structured taxonomy, not free-text parsing.

### Gap #3: Data Feed Infrastructure (Layer 13) — HIGH PRIORITY

POS webhook exists but no generic change notification system. External systems cannot subscribe to "notify me when this business updates its menu." Without feed infrastructure, ecosystem dependency cannot form.

### Gap #4: Structured Data APIs (Layer 12) — MEDIUM PRIORITY

API v1 exists but lacks: versioning strategy, change webhooks, bulk/batch endpoints, OpenAPI spec, field selection. Not ecosystem-grade yet.

### Gap #5: Data Normalization (Layer 4) — MEDIUM PRIORITY

Offering-level normalization missing. No standard vocabulary for categories (Starters, Mains, Beverages), dietary tags (formal enum), or cuisine types.

### Gap #6: Confidence Systems (Layer 6) — MEDIUM PRIORITY

Field-level confidence missing. Only `descriptionSource` tracks AI vs manual provenance. Prices, names, hours lack per-field confidence metadata.

---

## 7. Implementation Roadmap

### PHASE 1: Core Data Infrastructure (Weeks 1-6)

**1A. Offering Taxonomy System (Layer 4 + 16)**

- Create `src/data/shared/offeringTaxonomy.ts` — standard category vocabulary per business category
- Map: food → {Starters, Mains, Beverages, Desserts, ...}, salon → {Haircut, Coloring, ...}
- Add `standardCategoryId` optional field on ExtractedDataCategory
- AI extraction maps detected categories to standard taxonomy (best-effort)
- Zero breaking changes — existing free-text preserved, taxonomy is additive

**1B. Field-Level Provenance (Layer 6 + 18)**

- Extend item model with `_provenance?: Record<field, {source, confidence, verifiedAt}>`
- Populate during AI extraction (source='ai', confidence=score)
- Populate on manual edit (source='owner', confidence=1.0)
- Stripped by sanitizeForClient (internal only, like \_mce)

### PHASE 2: Data Intelligence (Weeks 7-12)

**2A. Business Entity Index (Layer 15)**

- Create `businessIndex` Firestore collection — denormalized per-business summary
- Fields: storeId, name, businessType, geo, standardCategories[], topItems[], attributes, hours, freshness
- Populated by nightly scheduler (new task 9)
- Enables: "restaurants with outdoor seating within 5km" queries
- NOT a graph database — a queryable index for discovery use cases

**2B. Dietary/Attribute Enum System (Layer 4)**

- Convert free-text tags to formal enum: `DIETARY_TAGS = ['vegetarian', 'vegan', 'halal', 'gluten_free', ...]`
- AI extraction maps to enum (fuzzy matching)
- Preserve original free-text in `tags`, add structured `dietaryTags` enum array

### PHASE 3: Ecosystem Interoperability (Weeks 13-20)

**3A. Generic Webhook System (Layer 13)**

- Extend POS webhook pattern to generic "subscribe to changes" system
- Collection: `webhookSubscriptions/{subscriberId}` — URL, events, secret, status
- Events: `menu.updated`, `hours.updated`, `status.changed`, `business.updated`
- Fire-and-forget delivery with retry + circuit breaker (reuse POS pattern)
- Feature flag: `ENABLE_WEBHOOK_SUBSCRIPTIONS`

**3B. API v2 Design (Layer 12)**

- OpenAPI 3.0 spec autogenerated
- Field selection (`?fields=name,hours,menu`)
- Pagination for multi-business queries
- Change event endpoint (`GET /api/public/v2/changes?since=timestamp`)
- Formal versioning with deprecation policy

**3C. Standard Feed Formats (Layer 13 + 14)**

- JSON Feed at `/{subdomain}/feed.json` — standard structured business data
- Menu data in universally consumable format
- Adapter framework for marketplace feeds (Zomato, Swiggy format — future)

### PHASE 4: Distribution Infrastructure (Weeks 21-26)

**4A. Discovery API (Layer 15)**

- `GET /api/public/v2/discover` — geo + category + attribute search
- Reads from businessIndex (Phase 2A)
- Returns ranked results with schema.org-compatible output
- Rate limited, API key authenticated

**4B. Conflict Resolution Framework (Layer 7)**

- Only needed if/when bi-directional integrations arrive
- Design: field-level source priority map + conflict audit log
- Defer until actual need arises (POS import, booking platform sync)

### Phase Dependencies

```
Phase 1A (Taxonomy) ──→ Phase 2A (Entity Index) ──→ Phase 4A (Discovery API)
Phase 1B (Provenance) ─┘                            Phase 3A (Webhooks) ──→ Phase 3B (API v2)
Phase 2B (Enums) ──────→ Phase 3C (Feeds)
```

### Priority vs Current Stage

Per MenuList doctrine: **Distribution > Features > Infrastructure depth**.
The roadmap is ordered by infrastructure value, but implementation should be gated by adoption:

- **Now (pre-scale):** Phase 1A + 1B (low cost, high future value)
- **At 100+ businesses:** Phase 2A + 2B (entity index justifies itself)
- **At ecosystem demand:** Phase 3A-3C (only when external systems request it)
- **At scale:** Phase 4A-4B (discovery API when query volume exists)

---

## Verification Checklist

- [x] All 24 layers analyzed
- [x] Evidence collected for each layer (file paths, code references)
- [x] No layer skipped
- [x] Status classified: FULL / PARTIAL / MISSING
- [x] Risk assessed per layer
- [x] Roadmap with dependencies created
- [x] Aligned with MenuList doctrine (no feature sprawl)
