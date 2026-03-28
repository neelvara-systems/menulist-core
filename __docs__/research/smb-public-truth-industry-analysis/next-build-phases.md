# Next Build Phases — Doctrine-Compliant Recommendations

**Version:** 2.0 | **Date:** February 22, 2026  
**Authority:** Research recommendation — Phases 2A, 2B, 3A now IMPLEMENTED  
**Companion:** `analysis.md`, `menulist-alignment.md`

---

## Phase Sequencing Logic

Build by authority layering, NOT feature excitement.  
Sequence follows Product Evolution Doctrine (Doc 11) Stage 0 → Stage 1.

---

## Phase 1: NOW → Launch (Current)

**Goal:** Become default menu truth for onboarded stores.

Already built and shipping:

- Menu truth + hours truth + OBP + QR + screens
- MCE validation + pricing integrity
- Multi-language + temp status + chain architecture
- Menu Kit (print + social assets)
- GBP Sync infrastructure (flag off)
- Schema.org + llms.txt

**No new features.** Focus on adoption, onboarding, behavioral anchoring.

---

## Phase 2: Post-Adoption (After 50+ active stores) — ✅ IMPLEMENTED

Only two expansions allowed. Both scored 23/25. **Both now shipped (Feb 22, 2026).**

### 2A. Search/Indexing Authority Dominance — ✅ SHIPPED

**What:** Deepen schema.org output. Rich snippets for menu items. Structured data for hours, availability, pricing. Google Knowledge Panel optimization.

**Why:** Invisible to owner. Zero UI. Makes Google treat MenuList as primary source. Directly strengthens upstream positioning (Doc 15 Rule 1).

**Implemented (Feb 22, 2026):**

- ✅ FAQ schema (auto-generated FAQPage) on OBP pages
- ✅ BreadcrumbList JSON-LD on menu pages
- ✅ `dateModified` + `servesCuisine` on menu schema
- ✅ Sitemap enhanced with `/menu` URL
- ✅ TempStatus reflected in schema.org via `specialOpeningHoursSpecification`
- ✅ Shared schema utilities: `buildBreadcrumbList()`, `buildFaqSchema()`, `buildTempStatusSchema()`

**Key files:** `src/lib/schema/index.ts`, `src/app/_client/[[...slug]]/page.tsx`, `src/app/_client/obp/OBPContent.tsx`  
**Feature flag:** None needed — always active on public pages  
**Firebase cost:** $0 — all computed from existing data at render time  
**Docs:** `__docs__/seo-aeo-discovery-infrastructure/`

### 2B. Real-Time Public Status Layer Expansion — ✅ SHIPPED

**What:** Expand temp status beyond current "notice" model. Structured status types: early closing, kitchen closed.

**Why:** Closes the highest-frequency daily pain (86ing). Strengthens "always correct" promise.

**Implemented (Feb 22, 2026):**

- ✅ 2 new status types: `closing_early`, `kitchen_closed`
- ✅ Updated across: API route, store type, desktop TempStatusCard, mobile MobileTempStatusScreen, public TempStatusBanner
- ✅ TempStatus reflected in schema.org via `specialOpeningHoursSpecification` (`buildTempStatusSchema()`)
- ✅ Auto-expiry already exists, works with new types

**What this is NOT (boundary preserved):**

- NOT inventory sync from POS
- NOT stock prediction
- NOT kitchen management
- NOT automated 86ing

Owner manually toggles. System propagates. That's the boundary.

**Key files:** `src/app/api/store/temp-status/route.ts`, `src/types/platform/store.ts`, `src/components/atoms/TempStatusBanner/index.tsx`  
**Feature flag:** `ENABLE_TEMP_STATUS` (existing)  
**Firebase cost:** $0 additional — uses existing tempStatus field  
**Docs:** `__docs__/temp-status-layer/`

---

## Phase 3: Infrastructure Ready — ✅ SHIPPED (flag OFF)

### 3A. Platform Pull Model — ✅ SHIPPED

**What:** Two read-only APIs for external systems to pull business + menu data.

**Implemented (Feb 22, 2026):**

- ✅ `GET /api/public/v1/business` — Store details
- ✅ `GET /api/public/v1/menu` — Full menu (POS sync format)
- ✅ API key auth, rate limiting (60 req/min), cache headers

**Feature flag:** `ENABLE_PUBLIC_API` (default OFF)  
**Docs:** `__docs__/platform-pull-api/`

---

## Phase 4: Optional/Never

These are documented for completeness. All permanently rejected.

| Item                          | Status   | Reason                 |
| ----------------------------- | -------- | ---------------------- |
| Delivery platform direct sync | ❌ Never | Transactional layer    |
| POS inventory connection      | ❌ Never | Internal operations    |
| Analytics dashboards          | ❌ Never | Dashboard culture      |
| Marketing automation          | ❌ Never | Wrong identity         |
| CRM/loyalty                   | ❌ Never | Wrong category         |
| Website builder expansion     | ❌ Never | Infinite customization |
| Review management expansion   | ❌ Never | Reputation SaaS drift  |

---

## Decision Framework for Future Proposals

Before any build proposal, apply in order:

1. **Feature Rejection Gate (Doc 08)** — 5 questions, all must pass
2. **5-Filter Strategic Test** — Score must be ≥ 20/25
3. **Taste Check (Doc 09)** — Does this make MenuList feel like infrastructure?
4. **Category Dominance Test (Doc 15)** — Does data flow FROM MenuList?
5. **Product Evolution Stage Gate (Doc 11)** — Is current stage solid?

If any gate fails → REJECT. No exceptions.

---

## Key Insight from Research

The research validates that MenuList's existing architecture already solves the majority of industry problems. The remaining gaps are either:

- **In-scope authority deepening** (search, real-time status) → build carefully
- **Out-of-scope noise** (delivery sync, analytics, CRM) → reject permanently

The strategic advantage is NOT in building more features. It is in deepening the infrastructure layer that already exists and ensuring adoption creates structural dependency.

> "The market still does not have a real-time public truth engine, a neutral canonical menu authority, or Google-dominant structured truth. MenuList already has the foundation for all three."

---

**Document Signature:** Strategic Recommendation  
**Created:** February 22, 2026  
**Approval Required:** Founder review before any Phase 2+ implementation
