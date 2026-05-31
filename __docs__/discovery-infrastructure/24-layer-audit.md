# 24-Layer Infrastructure Audit — Post-Implementation Evidence

> **Re-audited:** March 10, 2026 (after Phase 1-2 infrastructure expansion)
> **Parity refreshed:** May 9, 2026
> Each layer: Definition → Expected → Evidence → Status → What Changed

---

## Layer 1: Entity Modeling — ✅ STRONG

**Expected:** Formal business entity, offering/item model, category, media, location.

**Evidence:**

- `StoreDataType` — 486 lines, 60+ structured fields covering identity, geo, hours, attributes, integrations, health signals
- `ExtractedDataItem` — id, name{lang}, price, description{lang}, category, attributes[], tags[], images[], available, duration, ownerBoost
- `ExtractedDataCategory` — id, name{lang}, timeSlots[], orderIndex
- `Project` — menuVersion, lastPublishedAt, \_mce, overrides, slug, previousSlugs

**Status: ✅ STRONG** — Comprehensive SMB entity model. Supports restaurants, salons, gyms, retail, clinics, and all 60+ business types.

---

## Layer 2: Canonical Identifiers — ✅ STRONG

**Expected:** Permanent IDs surviving edits, renames, restructuring.

**Evidence:** tenantId (auto-increment), storeId (auto-increment), projectId (UUID-style), item/category/attribute IDs (extraction-generated, stable), slug + previousSlugs[] (301 redirect chain, max 5), API key (`ml_` + UUID).

**Status: ✅ STRONG** — 11 ADRs in `__docs__/url-routing-architecture/` covering slug permanence.

---

## Layer 3: Entity Relationships — ✅ STRONG

**Expected:** business → locations → offerings → categories → items → attributes.

**Evidence:** Tenant → Store (1:N via storesList), Store → Project (nested subcollection), Project → files → categories[] + items[] (flat arrays with id refs), Item → attributes[] (nested), Master → Outlet (masterProjectId + overrides).

**Status: ✅ STRONG** — Multi-outlet inheritance system with field-level overrides fully implemented.

---

## Layer 4: Data Normalization — ⚠️ PARTIAL+

**Expected:** Standardized categories, consistent naming, duplicate detection across businesses.

**Evidence (existing):** `BUSINESS_CATEGORIES` owns schema/catalog/offering defaults; `BUSINESS_TYPES` (60+ types) owns category membership and precise subtype overrides; structured currency/hours.

**Evidence (NEW — Phase 1A):**

- `src/lib/infrastructure/taxonomy/data/categories.json` — **95+ standard categories** across all 7 business categories (food=21, service=15, health=14, retail=14, creative=11, professional=10, specialty=10)
- `src/lib/infrastructure/taxonomy/data/offeringTags.json` — **35+ SMB-universal offering tags** scoped by business category (dietary for food, audience for service/retail, level for health, universal for all)
- `src/lib/infrastructure/taxonomy/data/dietaryTags.json` — 14 dietary tags with schema.org mappings
- `src/lib/infrastructure/taxonomy/data/cuisines.json` — 20 cuisine types
- `src/lib/infrastructure/taxonomy/matcher.ts` — alias-based matching (exact + fuzzy)
- `src/lib/infrastructure/taxonomy/adapter.ts` — reads existing project data, produces taxonomy mapping

**What's still missing:** Taxonomy mapping not yet wired into extraction pipeline or nightly scheduler (feature-flagged OFF). No duplicate item detection across businesses.

**Status: ⚠️ PARTIAL+** (upgraded from PARTIAL — taxonomy system built, needs activation)

---

## Layer 5: Data Integrity Constraints — ✅ STRONG

**Evidence:** MCE (18 rules, 5 Laws, 722 lines), Publish-Gate, Zod validation on all APIs, Firestore rules (23K), rate limiting, RBAC.

**Status: ✅ STRONG**

---

## Layer 6: Confidence Systems — ⚠️ PARTIAL+

**Evidence (existing):** Extraction confidence per-job, `descriptionSource: 'ai' | 'manual'` per item, Store Truth Confidence composite score, `_mce.verified`, health signals.

**Evidence (NEW — Phase 1B):**

- `src/lib/infrastructure/provenance/types.ts` — `ProvenanceEntry` (source + confidence + timestamp), `ItemProvenance` (6 trackable fields: name, price, description, category, tags, available)
- `src/lib/infrastructure/provenance/tracker.ts` — `stampAIExtraction()`, `stampOwnerEdit()`, `detectChangedFields()`, `stampProvenance()`
- 5 source types: `ai_extraction`, `owner_edit`, `staff_edit`, `system`, `import`

**What's still missing:** Provenance stamping not yet wired into editor save or AI extraction pipeline (feature-flagged OFF).

**Status: ⚠️ PARTIAL+** (upgraded — provenance types + tracker built, needs activation)

---

## Layer 7: Conflict Resolution — ⚠️ PARTIAL

**Evidence:** Multi-outlet master→outlet hierarchy, POS push-only (no inbound), `descriptionSource` protects manual edits from AI refresh. No formal resolver for bi-directional integrations.

**Status: ⚠️ PARTIAL** — Conflicts avoided by architecture. Formal resolver deferred until needed.

---

## Layer 8: Schema Evolution — ✅ STRONG

**Evidence:** All fields optional, feature flags gate new functionality, migration scripts exist, 3-Year Freeze doctrine, no field removals, prompt versioning.

**Status: ✅ STRONG**

---

## Layer 9: Change Intelligence — ✅ STRONG

**Evidence:** MOL (15 change types), 30-day rolling derived metrics, internal flags (\_priceStale, \_availabilityChurn, \_highVolatility), extraction learning loop, menu intelligence, authority maturation, menu drift.

**Status: ✅ STRONG**

---

## Layer 10: Drift Detection — ✅ STRONG

**Evidence:** Nightly 30-day rolling menu drift, staleness check with 90-day cooldown, truth confidence freshness component, MOL \_priceStale flags, GBP hoursStatus verification.

**Status: ✅ STRONG**

---

## Layer 11: Data Freshness Tracking — ⚠️ PARTIAL+

**Evidence:** `lastPublishedAt`, `menuVersion`, `modifiedOn`/`createdOn` on all docs, Store Truth Confidence (nightly), `_mce.verifiedAt`, `dateModified` in schema.org, `healthSignals.*.computedAt`.

**Why not FULL:** No confidence decay model (freshness ≠ time-based decay). No automatic "stale" flag on items untouched for N months at field level.

**Status: ⚠️ PARTIAL+** — Timestamps present everywhere. Missing: time-based freshness decay model.

---

## Layer 12: Structured Data APIs — ⚠️ PARTIAL

**Evidence:** Public API v1 (`GET /api/public/v1/business` + `/menu`), API key auth, 60 req/min rate limit.

**Missing:** No versioning strategy, no change webhooks, no bulk endpoints, no OpenAPI spec, no field selection.

**Status: ⚠️ PARTIAL**

---

## Layer 13: Data Feed Infrastructure — ⚠️ PARTIAL

**Evidence:** POS webhook (HMAC signed, retry + circuit breaker), schema.org JSON-LD on all pages, llms.txt + llms-full.txt, sitemap.

**Missing:** No generic webhook subscription system, no RSS/Atom, no marketplace adapters, no change event stream.

**Status: ⚠️ PARTIAL**

---

## Layer 14: Schema Compatibility Layer — ⚠️ PARTIAL+

**Evidence (existing):** `src/lib/schema/index.ts` (shared builders) consumes category-level schema defaults and type-level schema overrides from `src/data/shared/businessTypes.ts`.

**Evidence (NEW — Phase 1C):**

- `src/lib/infrastructure/semantics/attributeRegistry.ts` — 17 semantic attributes with schema.org mappings, grouped by amenity/dietary/service_mode/payment/accessibility
- `extractStoreSemanticProfile()` — maps `store.businessAttributes` to canonical semantic IDs

**Missing:** No pluggable adapter framework, no marketplace-specific formats.

**Status: ⚠️ PARTIAL+** (upgraded — semantic attribute registry adds canonical vocabulary with schema.org links)

---

## Layer 15: Business Entity Graph — ⚠️ PARTIAL (was MISSING)

**Evidence (NEW — Phase 2A):**

- `src/lib/infrastructure/discovery/types.ts` — `BusinessEntityIndexDoc` (PUBLIC data only, compliance-safe)
- `src/lib/infrastructure/discovery/indexBuilder.ts` — `buildBusinessEntityIndexDoc()` + `validateIndexDocSafety()`
- `businessEntityIndex` collection constant in both `src/constants/database.ts` and `functions/src/constants/database.ts`
- Feature flag: `ENABLE_INFRASTRUCTURE_DISCOVERY_INDEX`

**What's built:** Complete type system and builder function. Given a store + project, produces a cross-business-queryable index document containing: identity, geo, standardCategories, offeringTags, subCategories, semanticAttributes, topItems, workingHours, freshness.

**What's still missing:** Nightly scheduler task to populate the collection. Discovery query API. Firestore indexes for geo + category queries.

**Status: ⚠️ PARTIAL** (upgraded from ❌ MISSING — types + builder + collection constant built, needs scheduler wiring + activation)

---

## Layer 16: Cross-Business Taxonomy — ⚠️ PARTIAL+ (was PARTIAL)

**Evidence (existing):** `BUSINESS_CATEGORIES` (7) with schema/catalog/offering defaults; `BUSINESS_TYPES` (60+) with subtype overrides only where needed.

**Evidence (NEW — Phase 1A):**

- 95+ standard categories across all 7 business categories (SMB-universal, not food-only)
- 35+ SMB-universal offering tags with scope-based matching (dietary for food, audience for service, level for health, universal for all)
- 14 dietary tags with schema.org mappings
- 20 cuisine types with aliases
- Alias-based matcher (exact + fuzzy)

**Status: ⚠️ PARTIAL+** (upgraded — complete taxonomy registry built, needs activation in extraction + nightly pipeline)

---

## Layer 17: Verification Mechanisms — ✅ STRONG

**Evidence:** NextAuth.js, `verifyTenantAccess()`, RBAC (22 permissions), MCE (18 rules), Publish-Gate, `withAuth()`, rate limiting, HMAC webhook signing.

**Status: ✅ STRONG**

---

## Layer 18: Provenance Metadata — ⚠️ PARTIAL+

**Evidence (existing):** `descriptionSource`, MOL `changedBy`, `createdBy`/`modifiedBy`, `onboardingSource`, `_extractedAt`.

**Evidence (NEW — Phase 1B):** `ProvenanceEntry` types, `ItemProvenance` (6 fields), `stampAIExtraction()`, `stampOwnerEdit()`, `detectChangedFields()`.

**Status: ⚠️ PARTIAL+** (upgraded — field-level provenance types + tracker built, needs wiring)

---

## Layer 19: Historical Auditability — ✅ STRONG

**Evidence:** MOL (15 change types, immutable), menuSnapshots (full state on publish), menuVersion (monotonic), 30-day derived metrics, schedulerRunLogs, messageLogs, answerlattice_auditLogs.

**Status: ✅ STRONG** — Minor: no rollback UI (data supports it).

---

## Layer 20: Data Volume Scaling — ✅ STRONG

**Evidence:** Summary Document Pattern (99% read reduction), nested subcollections, pagination, SWR caching, ISR + revalidateTag, nightly batch via summary doc, 21K+ index config.

**Status: ✅ STRONG**

---

## Layer 21: Multi-Tenant Isolation — ✅ STRONG

**Evidence:** `tId` + `sId` on every query, nested subcollections, `withAuth()` + `verifyTenantAccess()`, Firestore rules (23K, default deny), tenant-scoped storage paths, separate Firebase projects.

**Status: ✅ STRONG**

---

## Layer 22: Global Localization — ✅ STRONG

**Evidence:** next-intl (9 locales, 913+ keys), item/category natively multilingual `{[lang]: string}`, AI translation, per-store currency/timezone, RTL support, 252-country dataset, per-user date/time preferences.

**Status: ✅ STRONG**

---

## Layer 23: Machine-Readable Semantics — ⚠️ PARTIAL+

**Evidence (existing):** schema.org JSON-LD (category defaults + subtype overrides), llms.txt, llms-full.txt, per-item structured data.

**Evidence (NEW — Phase 1C):** 17 semantic attributes with schema.org mappings, grouped vocabulary, `extractStoreSemanticProfile()`.

**Why not FULL (per ChatGPT feedback):** Structured data ≠ full ontology. No controlled vocabularies for item-level properties, no formal semantic relationships between entities, no RDF/OWL-level modeling. Schema.org coverage is strong but not ontological.

**Status: ⚠️ PARTIAL+** (upgraded — semantic attribute registry adds controlled vocabulary layer)

---

## Layer 24: Distribution Surface Integration — ✅ STRONG

**Evidence:** 11 surfaces from single source of truth: Digital Menu, OBP, QR, Physical Surfaces, POS Webhook, Public API v1, llms.txt, Schema.org, GBP, Mobile PWA, Digital Screens.

**Status: ✅ STRONG** — Strongest infrastructure layer.
