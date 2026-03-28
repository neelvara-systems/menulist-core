# AI Enhancement Packs — ChatGPT Conversation Critical Review

**Version:** 1.0
**Status:** REVIEW COMPLETE ✅
**Date:** February 9, 2026
**Architect:** Lead Architect (Cascade)
**Review Scope:** Full ChatGPT conversation on AI pricing strategy, cost tracking, and pack model

---

## Executive Summary

**ChatGPT Accuracy vs MenuList Reality: ~72%**
- **Actionable Insights:** 14 of 19 major suggestions
- **Architecture Risks Flagged:** 5 violations (corrected during conversation)
- **Doctrine Violations Caught:** 3 (ChatGPT self-corrected 2, 1 persists in data model)
- **Codebase Awareness:** LOW — ChatGPT assumed OpenAI models, invented "MOL", missed existing infrastructure

**Bottom Line:** The conversation arrived at the correct final model through iterative refinement. The user's instincts caught doctrine violations before ChatGPT did. The final "one pack at launch + internal units + outcome-only external language" model is **doctrine-clean, architecturally sound, and implementable against existing codebase infrastructure**. However, the data model and cost calibration need significant rework to align with what's actually built.

---

## Stage 1: Conversation Comprehensive Analysis

### Conversation Breakdown

| # | Topic | ChatGPT Suggestion | Confidence | MenuList Codebase Reality |
|---|-------|-------------------|------------|--------------------------|
| 1 | Pricing model | Subscription + outcome-based add-ons | High | ✅ Stripe billing fully built. `PricingPlan` supports B2C/B2B. `PAYMENT_TOPUP` rate limit already configured (10/hr). `TOPUPS` collection exists in `DB_COLLECTIONS`. |
| 2 | AI model costs | References "OpenAI/Azure pricing", "gpt-image-1", "gpt-4.1" | High | ❌ **WRONG.** MenuList uses **Gemini only** — Flash 2.5, Flash 2.0, Imagen 3. See `src/constants/AI/models.ts`. Cost structure is fundamentally different (Gemini is cheaper). |
| 3 | Credit/unit system | Internal credits, external outcome packs | High | ✅ Skeleton exists: `TOKENS_PER_CREDIT=500`, `CHARGE_PER_CREDIT=100` (paise), `AI_ACTIONS_TYPES` enum with 8 types. `addAiOperation()` in DAL — **but commented out in all 6 API routes**. |
| 4 | "MOL events" | "You already have MOL v0 — surface it" | High | ❌ **HALLUCINATION.** No "Menu Observation Layer" exists. Analytics uses `src/lib/analytics/unified.ts` with `trackAnalyticsEvent`. Feature flag `ENABLE_MENU_OBSERVATION` exists but is `false`. |
| 5 | Dashboard transparency | "Show used/included/remaining clearly" | High | ❌ **DOCTRINE VIOLATION.** Constitution Law 6: "No Cognitive Load". Language Governance: "Invites Monitoring" is forbidden. ChatGPT self-corrected this later. |
| 6 | A/B pricing tests | "Run 2×8-week experiments" | Medium | ❌ **FORBIDDEN.** `06-internal-tracking.md` explicitly lists "A/B test results" as forbidden metric. |
| 7 | Human Review Add-on | "Monthly retainer: ₹5,999/$75" | Low | ❌ **OUT OF SCOPE.** MenuList is autonomous infrastructure. Law 7: "No Feature Without Autonomy". |
| 8 | Extraction = free | Core, non-negotiable | High | ✅ Correct. Extraction is the foundational pipeline (`/api/image-processor`). |
| 9 | Base description = free | First pass included | High | ✅ Correct. Descriptions auto-generated during extraction. Charging breaks onboarding. |
| 10 | Paid: regeneration/tone/SEO | Enhancement territory | High | ✅ Correct. `AI_ACTIONS_TYPES.REWRITE_DESCRIPTION` already distinguished from `ADD_DESCRIPTION`. |
| 11 | Single pooled balance per tenant | One `aiCapacity` field, not per-feature | High | ✅ Correct direction. Collection `MENULIST_AI_OPERATIONS` already at `{tId}/{sId}` level. |
| 12 | Firestore schema | `/tenants/{tenantId}/aiUsageEvents/` | Medium | ❌ **WRONG PATH.** Existing pattern is `{collection}/{tId}/{sId}`. Must use `DB_COLLECTIONS` constants, `apiCallComposer`, `requestBodyComposer`. See `src/database/aiOperations/index.tsx`. |
| 13 | One pack at launch | Collapse Basic/Pro/Premium to single pack | High | ✅ Correct. Reduces cognitive load. Tiers added later via data, not speculation. |
| 14 | Support scripts | Never explain credits/internals | High | ✅ Fully aligned with Language Governance. Canonical phrases match doctrine. |
| 15 | ToS clause | Outcome-based, no credit disclosure | High | ✅ Legally sound. "Up to" language + variability footnotes are standard. |
| 16 | Outcome Activity Report | Show what changed, not consumption | Medium | ⚠️ Directionally correct but premature. New feature — defer to after core pricing infrastructure ships. |
| 17 | Admin cost dashboard | Monthly margin report, founder-only | Medium | ✅ Aligns with `06-internal-tracking.md` Category F (Cost & Performance). Must not include forbidden metrics. |
| 18 | Overage pricing | "25% higher per-unit than pack" | Low | ❌ **DOCTRINE VIOLATION.** Overage = math = cognitive load. System blocks silently, suggests pack. |
| 19 | Stress-test disputes | 7 worst-case scenarios tested | High | ✅ All scenarios resolved cleanly with outcome-only language. |

### Key Themes Identified

1. **ChatGPT's iterative self-correction** — Started with credits-visible model, user challenged it against doctrine, ChatGPT corrected to outcome packs. The user's instincts were right from the start.

2. **ChatGPT lacks codebase awareness** — References OpenAI models, invents "MOL", proposes Firestore paths that don't match existing patterns. Every technical suggestion needs rework.

3. **Doctrine alignment improved over conversation** — Final model (one pack, internal units, outcome-only language, no meters) is clean. Early suggestions were dangerous.

4. **Data model needs significant rework** — ChatGPT's `/tenants/{tenantId}/` paths, mutable counters, and model references don't match the multi-tenant `{tId}/{sId}` architecture already built.

---

## Stage 2: Grounded Cross-Reference Verification

### Point 1: "AI model costs — use OpenAI/Azure pricing"

→ `@/Users/danny/Projects/MenuListAi/dashboard/src/constants/AI/models.ts`: All 9 operations use Google Gemini models exclusively
→ `@/Users/danny/Projects/MenuListAi/dashboard/src/app/api/image-generation/route.ts:19-22`: Uses `gemini-2.5-flash-preview-05-20` and `imagen-3.0-generate-002`
→ `@/Users/danny/Projects/MenuListAi/dashboard/src/app/api/descriptions/route.ts:15`: Uses `gemini-2.5-flash`
→ `@/Users/danny/Projects/MenuListAi/dashboard/src/app/api/translations/route.ts:14`: Uses `gemini-2.5-flash`

**VERDICT: DISAGREE.** ChatGPT references "gpt-image-1", "gpt-4.1", "OpenAI/Azure token pricing" throughout. MenuList uses Google Gemini exclusively. Gemini pricing is significantly different (generally cheaper for text, competitive for images). All cost calibration must use Google AI pricing, not OpenAI.

### Point 2: "You already have MOL v0 — surface existing events"

→ `@/Users/danny/Projects/MenuListAi/dashboard/src/config/features.ts:510`: `ENABLE_MENU_OBSERVATION: false` — feature flag exists but disabled
→ No `menuObservation` collection in `DB_COLLECTIONS`
→ No MOL event emitters found in codebase

**VERDICT: DISAGREE.** "MOL" is a concept from documentation/planning, not implemented code. The actual analytics system is `src/lib/analytics/unified.ts`. ChatGPT fabricated "MOL v0" as existing infrastructure.

### Point 3: "Internal credit system — already have logs"

→ `@/Users/danny/Projects/MenuListAi/dashboard/src/constants/common.ts:138-141`: `TOKENS_PER_CREDIT=500`, `CHARGE_PER_CREDIT=100`, `CHARGE_PER_IMAGEN_IMAGE=100`, `TOKENS_PER_IMAGEN_IMAGE=300`
→ `@/Users/danny/Projects/MenuListAi/dashboard/src/constants/common.ts:123-136`: `AI_ACTIONS_TYPES` with 8 action types defined
→ `@/Users/danny/Projects/MenuListAi/dashboard/src/database/aiOperations/index.tsx:217-228`: `addAiOperation()` exists, uses `requestBodyComposer` + `apiCallComposer`
→ `@/Users/danny/Projects/MenuListAi/dashboard/src/app/api/descriptions/route.ts:172`: `addAiOperation` **commented out** — `new Date().getTime().toString()`
→ `@/Users/danny/Projects/MenuListAi/dashboard/src/app/api/image-generation/route.ts:264`: `addAiOperation` **commented out** — `"test"`
→ `@/Users/danny/Projects/MenuListAi/dashboard/src/app/api/translations/route.ts:116`: `addAiOperation` **commented out** — `new Date().getTime().toString()`
→ `@/Users/danny/Projects/MenuListAi/dashboard/src/app/api/image-editing/route.ts:136`: `addAiOperation` **commented out** — `crypto.randomUUID()`

**VERDICT: PARTIAL.** The skeleton is built — constants, DAL, action types, transaction object computation. But **zero AI usage events are being persisted**. Every `addAiOperation()` call is commented out across all 6 API routes. ChatGPT is right that the framework exists; wrong that it's operational.

### Point 4: "Firestore schema at /tenants/{tenantId}/aiUsageEvents/"

→ `@/Users/danny/Projects/MenuListAi/dashboard/src/database/aiOperations/index.tsx:12-15`: Existing path is `collection(firebaseClient, ${COLLECTION}/${session.tId}/${session.sId})`
→ `@/Users/danny/Projects/MenuListAi/dashboard/src/constants/database.ts:9`: `MENULIST_AI_OPERATIONS: "menulistAiOperations"`
→ `@/Users/danny/Projects/MenuListAi/dashboard/src/constants/database.ts:16`: `TOPUPS: "topups"` (already exists!)
→ `@/Users/danny/Projects/MenuListAi/dashboard/src/constants/database.ts:90-92`: `AI_OPERATIONS_COLLECTIONS` has `AI_CREDIT_TRANSACTIONS: "aiCreditTransactions"` (sub-collection)

**VERDICT: DISAGREE on path structure.** ChatGPT proposes `/tenants/{tenantId}/` but existing codebase uses `{collection}/{tId}/{sId}` with `DB_COLLECTIONS` constants. Must use existing patterns: `MENULIST_AI_OPERATIONS` for events, `TOPUPS` for pack purchases, `AI_CREDIT_TRANSACTIONS` for credit transactions. The collections are already defined.

### Point 5: "One pooled balance per tenant — aiCapacityTotal/Used/Remaining fields"

→ Existing pattern: All data is multi-tenant via `{tId}/{sId}` paths
→ `requestBodyComposer` auto-adds `sId`, `tId`, `uId`, timestamps
→ No tenant-level document pattern exists in current codebase

**VERDICT: PARTIAL.** The concept is correct (one balance, not per-feature). But storing it as mutable fields on a tenant document is inconsistent with existing patterns. Two options: (a) Derive from events (pure, but expensive reads), (b) Cached counter on tenant doc updated atomically via `FieldValue.increment` on every AI action. Option (b) is pragmatic for fast enforcement checks.

### Point 6: "Overage = 25% higher per-unit"

→ `@/Users/danny/Projects/MenuListAi/dashboard/__docs__/constitution/01-core-doctrine.md:73-75`: Law 6 — "If a feature causes the owner to think, compare, choose, or analyze — it does not ship."
→ `@/Users/danny/Projects/MenuListAi/dashboard/__docs__/constitution/02-language-governance.md`: Forbidden category 6 — "Invites Monitoring: Review, Check, Monitor, Track"

**VERDICT: DISAGREE.** Overage pricing requires the user to understand per-unit economics. This violates Law 6 and Language Governance. Correct behavior: system blocks silently → upsell pack. ChatGPT later corrected this themselves.

### Point 7: "Run A/B pricing tests for 8 weeks"

→ `@/Users/danny/Projects/MenuListAi/dashboard/__docs__/constitution/06-internal-tracking.md:124`: Forbidden metric: "A/B test results"

**VERDICT: DISAGREE.** Explicitly forbidden by internal tracking rules. MenuList does not optimize for engagement or conversion. Pricing decisions are made by founder based on aggregate margin trends per the doctrine.

### Point 8: "Dashboard transparency — show used/included/remaining"

→ `@/Users/danny/Projects/MenuListAi/dashboard/__docs__/constitution/01-core-doctrine.md:73-75`: Law 6 — No Cognitive Load
→ `@/Users/danny/Projects/MenuListAi/dashboard/__docs__/constitution/01-core-doctrine.md:82-85`: Law 8 — Trust > Engagement

**VERDICT: DISAGREE.** This was suggested early in the conversation. ChatGPT later self-corrected to "never show balances, meters, or usage". The final position is doctrine-clean. Early suggestion was dangerous.

### Point 9: "Stripe SKU structure"

→ `@/Users/danny/Projects/MenuListAi/dashboard/src/components/templates/main-app/billingStripe/type.ts`: `PricingPlan` interface supports `planType: 'B2C' | 'B2B'`, `stripePriceId`, features map
→ `@/Users/danny/Projects/MenuListAi/dashboard/src/lib/rateLimit/configs.ts:148-152`: `PAYMENT_TOPUP: { limit: 10, window: 3600 }` — top-up purchases already anticipated
→ `@/Users/danny/Projects/MenuListAi/dashboard/src/constants/database.ts:16`: `TOPUPS` collection exists

**VERDICT: AGREE.** Stripe infrastructure is fully wired. Top-up concept already anticipated in rate limiting and DB collections. AI Enhancement Pack can be implemented as a Stripe one-time product with webhook processing similar to existing subscription flow.

### Point 10: "Support scripts — never explain internals"

→ `@/Users/danny/Projects/MenuListAi/dashboard/__docs__/constitution/02-language-governance.md`: All forbidden words/phrases align
→ `@/Users/danny/Projects/MenuListAi/dashboard/__docs__/constitution/01-core-doctrine.md:89-90`: Law 9 — "Sales, support, or marketing must never compensate for system weakness with explanations."

**VERDICT: AGREE.** Support scripts are fully doctrine-aligned. Canonical phrases match language governance. The "never-say list" (credits, tokens, units, quota, consumption, balance) is correct.

### Point 11: "Extraction + base description = free"

→ `@/Users/danny/Projects/MenuListAi/dashboard/src/app/api/image-processor/`: Core extraction pipeline
→ `@/Users/danny/Projects/MenuListAi/dashboard/src/constants/common.ts:131`: `ADD_DESCRIPTION` action type (first pass)
→ `@/Users/danny/Projects/MenuListAi/dashboard/src/constants/common.ts:132`: `REWRITE_DESCRIPTION` action type (paid territory)

**VERDICT: AGREE.** Action types already distinguish first-pass descriptions (`ADD_DESCRIPTION`) from rewrites (`REWRITE_DESCRIPTION`). This is the correct free/paid boundary. Extraction is the core pipeline — never gated.

### Point 12: "Transactions UI already exists"

→ `@/Users/danny/Projects/MenuListAi/dashboard/src/components/templates/main-app/transactions/index.tsx:1-46`: Full transactions page with pagination, filtering, date range, action type filter
→ Uses `getPaginatedAiOperations` from DAL
→ Shows `totalCredits`, `totalCharge`, `processingTime`, model, token counts

**VERDICT: AGREE.** Transactions UI is fully built and functional. Currently empty because `addAiOperation()` is commented out. Once events are persisted, this page will show internal cost data (founder/admin only — must never be shown to end users).

---

## Stage 3: Market Validation

### AI SaaS Pricing Models (2025-2026)

**Industry Pattern: Hybrid subscription + usage is dominant.**
- Canva: Subscription + AI credits (visible credits per month)
- Jasper: Subscription with word limits
- Midjourney: Subscription tiers with generation limits
- Notion AI: Add-on per seat
- Adobe Firefly: Generative credits per plan

**Key Insight:** Most SaaS exposes credits/limits visibly. MenuList's doctrine explicitly rejects this. The outcome-pack model with hidden credits is **uncommon but strategically differentiated** — it positions MenuList as infrastructure rather than a tool.

### India SMB Market (target ICP)

- Restaurant owners in India are price-sensitive (₹500-3000/month is the sweet spot)
- "Credits" and "tokens" are confusing — even tech-savvy Indian users struggle with Canva's credit system
- One-time packs resonate better than complex tiered usage models
- WhatsApp-first support culture means simple explanations are critical

**Conclusion:** ChatGPT's final pricing (₹X one-time pack) is directionally correct for India market. The "one pack at launch" simplification is the right call. Specific prices need founder calibration against actual Gemini costs and willingness-to-pay research.

### Gemini vs OpenAI Cost Reality

| Operation | ChatGPT Assumed (OpenAI) | Actual (Gemini) | Impact |
|-----------|-------------------------|-----------------|--------|
| Text generation | ~$0.01-0.03/1K tokens | ~$0.0001-0.001/1K tokens (Flash) | 10-100x cheaper |
| Image generation | ~$0.04-0.12/image | ~$0.02-0.04/image (Imagen 3) | 2-3x cheaper |
| Embeddings | ~$0.0001/1K tokens | ~$0.00001/1K tokens | 10x cheaper |

**This means:** Internal unit costs should be significantly lower than ChatGPT suggested. Pack margins will be **much healthier** than the 60-70% target — likely 80-90%+ on text operations. This gives room for generous pack sizing.

---

## Stage 4: Decision Matrix

| # | ChatGPT Idea | Status | Decision | Justification | Action |
|---|-------------|--------|----------|---------------|--------|
| 1 | Internal credits + external outcome packs | VALID | **ACCEPT** | Matches doctrine, existing skeleton in codebase | IMPLEMENT |
| 2 | OpenAI/Azure cost model | CONFLICT | **REJECT** | MenuList uses Gemini only. Cost structure differs 10-100x | Recalibrate using Google AI pricing |
| 3 | Single pooled balance per tenant | VALID | **ACCEPT** | Clean architecture, avoids per-feature chaos | IMPLEMENT with `{tId}/{sId}` pattern |
| 4 | One pack at launch | VALID | **ACCEPT** | Reduces cognitive load, data-driven tiers later | IMPLEMENT — single "AI Enhancement Pack" |
| 5 | Extraction + base desc = free | VALID | **ACCEPT** | Core infrastructure. `ADD_DESCRIPTION` vs `REWRITE_DESCRIPTION` already distinguished | IMPLEMENT — enforce 1x free pass |
| 6 | `/tenants/{tenantId}/` Firestore paths | CONFLICT | **REJECT** | Existing pattern is `{collection}/{tId}/{sId}`. Must use `DB_COLLECTIONS`, `apiCallComposer`, `requestBodyComposer` | Rework data model to use existing DAL patterns |
| 7 | Append-only usage events | VALID | **ACCEPT** | Aligns with existing `MENULIST_AI_OPERATIONS` collection | IMPLEMENT — uncomment `addAiOperation()`, add unit fields |
| 8 | A/B pricing tests | FORBIDDEN | **REJECT** | `06-internal-tracking.md` forbids A/B test results | IGNORE — pricing by founder judgment + margin trends |
| 9 | Human Review Add-on | OUT OF SCOPE | **REJECT** | Law 7: No Feature Without Autonomy | IGNORE |
| 10 | Overage pricing (25% premium) | CONFLICT | **REJECT** | Violates Law 6 (No Cognitive Load). Requires user to understand per-unit economics | Block silently → upsell pack |
| 11 | Dashboard transparency (used/remaining) | CONFLICT | **REJECT** | Early suggestion, ChatGPT self-corrected. Violates Law 6, Law 8, Language Governance | NEVER implement usage meters |
| 12 | Support scripts | VALID | **ACCEPT** | Perfectly aligned with Language Governance | DOCUMENT in helpdoc |
| 13 | ToS/pricing clause | VALID | **ACCEPT** | Legally sound, doctrine-clean | DOCUMENT in spec |
| 14 | Sales objection cheat-sheet | VALID | **ACCEPT** | Prevents accidental doctrine leaks | DOCUMENT in marketing |
| 15 | Admin cost dashboard | PARTIAL | **ACCEPT WITH LIMITS** | Must comply with `06-internal-tracking.md`. No forbidden metrics (engagement, popularity). Monthly + trend only | IMPLEMENT within allowed metric categories |
| 16 | Outcome Activity Report (customer-facing) | PARTIAL | **DEFER** | Good idea but premature. Not required for MVP pricing infrastructure | DEFER — implement after core pricing ships |
| 17 | AI Doctrine 1-pager | VALID | **ACCEPT** | Useful internal reference. Aligns with constitution | INCORPORATE into spec doc |
| 18 | Stress-test dispute scenarios | VALID | **ACCEPT** | All 7 scenarios pass. Outcome-only language is defensible | DOCUMENT in spec |
| 19 | Pack pricing (specific ₹/$ amounts) | PARTIAL | **ACCEPT STRUCTURE, REJECT VALUES** | Pack tiers correct but prices need calibration against Gemini costs (not OpenAI) and India market | Recalibrate with real Gemini cost data |

### Explicit Disagreements

1. **"Use OpenAI/Azure token pricing as internal cost model"** — Disagree because MenuList exclusively uses Google Gemini models (`src/constants/AI/models.ts`). Gemini Flash is 10-100x cheaper than GPT-4 for text. Cost floor and margin calculations must use Google AI pricing, not OpenAI. ChatGPT's entire cost calibration is based on wrong assumptions.

2. **"Firestore path: /tenants/{tenantId}/aiUsageEvents/"** — Disagree because existing multi-tenant pattern uses `{collection}/{tId}/{sId}` with `DB_COLLECTIONS` constants (`src/constants/database.ts:9`). Existing `addAiOperation` in `src/database/aiOperations/index.tsx` already follows this pattern. Proposing a different path creates architectural inconsistency.

3. **"Run 2×8-week A/B pricing experiments"** — Disagree because `__docs__/constitution/06-internal-tracking.md` explicitly forbids "A/B test results" as a metric. MenuList does not optimize for conversion or engagement. Pricing decisions are made by founder judgment based on aggregate margin data.

4. **"Menu Observation Layer v0 already exists"** — Disagree because no MOL implementation exists in the codebase. `ENABLE_MENU_OBSERVATION` feature flag is `false`. ChatGPT fabricated this as existing infrastructure.

---

## Stage 5: Validated Recommendations (Ready to Implement)

### HIGH Priority (Next Sprint)

1. **Uncomment and enhance `addAiOperation()`** — The skeleton exists in all 6 API routes. Add `unitsConsumed` field to transaction objects. Persist to `MENULIST_AI_OPERATIONS` collection. This is the foundation for everything else.

2. **Define internal unit cost config** — Create `AI_UNIT_COSTS` constant alongside existing `TOKENS_PER_CREDIT` / `CHARGE_PER_CREDIT`. Calibrate against actual Gemini pricing, not OpenAI.

3. **Add tenant-level `aiCapacity` fields** — Single pooled balance. Use `FieldValue.increment` for atomic updates. Enforce before every paid AI action.

4. **Create AI Enhancement Pack as Stripe product** — One-time purchase, one pack size at launch. Use existing `TOPUPS` collection and `PAYMENT_TOPUP` rate limit. Wire webhook similar to subscription flow.

5. **Enforce free/paid boundary** — `ADD_DESCRIPTION` and `IMAGE_PROCESSING` = free (0 units). `REWRITE_DESCRIPTION`, `IMAGE_GENERATION`, `LANGUAGE_ADDITION` = paid (consumes units).

### MEDIUM Priority (Post-Core)

6. **Admin margin report** — Monthly, not real-time. Within `06-internal-tracking.md` Category F bounds. Founder-only access.

7. **Pack completion UX** — When capacity exhausted: block action silently, show calm upsell CTA. No meters, no balances, no countdowns.

8. **Outcome Activity Log** — Customer-facing "what changed" report. Grouped by outlet for multi-chain. No consumption data.

### REJECTED (Documented)

- A/B pricing tests — Forbidden by tracking doctrine
- Human Review Add-on — No Feature Without Autonomy
- Overage pricing — Cognitive load violation
- Usage dashboards / credit meters — Doctrine violation
- Feature-wise balances — Chaos, rejected by conversation itself
- OpenAI cost model — Wrong AI provider

---

## Architectural Concerns

### 1. Data Model Must Use Existing Patterns
ChatGPT's proposed Firestore schema ignores the established `{collection}/{tId}/{sId}` multi-tenant architecture. Implementation MUST use:
- `DB_COLLECTIONS.MENULIST_AI_OPERATIONS` for events
- `DB_COLLECTIONS.TOPUPS` for pack purchases
- `AI_OPERATIONS_COLLECTIONS.AI_CREDIT_TRANSACTIONS` for credit transactions
- `apiCallComposer` and `requestBodyComposer` wrappers
- `getCollectionRef()` async helpers

### 2. Cost Calibration Against Gemini, Not OpenAI
All of ChatGPT's pricing examples and margin calculations assume OpenAI pricing. Gemini is significantly cheaper. Internal unit costs must be recalibrated using actual Google AI billing data. This affects pack sizing, margin targets, and pricing strategy.

### 3. 3-Year Architecture Freeze Compliance
All capability must exist Day 1 via feature flags:
```typescript
AI_ENHANCEMENT_PACKS: {
  enabled: true,           // Master toggle
  packTiers: "single",     // "single" | "tiered" (add tiers later)
  outcomeReport: false,    // Customer-facing activity report
  adminDashboard: false,   // Internal margin dashboard
}
```
No "Phase 2" or "post-launch" language. Everything ships complete with modes.

### 4. Mutable Counters vs Event-Driven
ChatGPT proposes `aiCapacityUsed` / `aiCapacityRemaining` as mutable fields. For enforcement speed (checking before every AI call), a cached counter is pragmatic. But it MUST be backed by append-only events as source of truth, with the counter derived/reconcilable.

### 5. Security Requirements
All AI capacity enforcement MUST happen server-side only:
- `withAuth()` on all AI routes (already done)
- Capacity check before model call, not after
- `sanitizeForFirestore()` on all writes
- Firestore rules: users can never read `aiUsageEvents` or `aiCapacity` fields
- UI receives only `canRunAction: boolean` and upsell CTA

---

## Open Questions

1. **Pack pricing**: What is the actual ₹/$ price for the single AI Enhancement Pack at launch? Needs founder decision after Gemini cost analysis.

2. **Pack capacity**: How many internal units does one pack grant? Needs calibration against average menu size (50-150 items) and typical usage patterns.

3. **AI capacity scope**: Per-tenant or per-store? Current DAL uses `{tId}/{sId}` which is per-store. If AI packs are purchased at tenant level, capacity should be tenant-scoped — this is a small architectural decision.

4. **Existing `TOKENS_PER_CREDIT` / `CHARGE_PER_CREDIT`**: Keep, rename, or replace with new `AI_UNIT_COSTS` system? The existing constants compute paise-based charges — the new system needs abstract "units" that map to Gemini costs internally.

5. **Transition**: The existing `MENULIST_AI_OPERATIONS` collection already has transaction data shape (`totalCredits`, `totalCharge`, `processingTime`, `tokenPerCredit`, `chargePerCredit`). Should we extend this shape or create a cleaner event schema alongside it?

---

**ARCHITECT SIGNATURE:** Lead Architect (Cascade)
**TIMESTAMP:** 2026-02-09
**REVIEW STATUS:** COMPLETE ✅
