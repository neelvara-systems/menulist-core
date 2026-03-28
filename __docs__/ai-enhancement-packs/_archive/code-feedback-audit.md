# ChatGPT Code Feedback Audit Report

**Date:** Feb 10, 2026
**Feature:** AI Enhancement Packs
**Source:** ChatGPT post-implementation review
**Auditor:** Cascade (codebase cross-check)

---

## Summary: 1/6 Implement | 2 Noted | 3 Rejected

| # | ChatGPT Point | Status | Spec Reference | Action | Code Changes |
|---|--------------|--------|----------------|--------|-------------|
| 1 | Margins too high (97%) — adjust unit costs over time | ✅ VALID (already supported) | Spec §Risks: "Start generous, adjust based on margin data" | Doc note only | None — `AI_UNIT_COSTS` in `unitCosts.ts` is already adjustable |
| 2 | Missing anti-abuse velocity guard | ✅ VALID (already mitigated) | Spec §Risks: "Rate limiting already built (5 expensive/min)" | Doc note + backlog item | None — existing rate limits cover this (5 expensive/min = 300/hr max) |
| 3 | Dormant account topUpCredits risk | ❌ REJECT | Impl §Task 2.1: per-store on subscription | None | None — expired subs don't return from query; new subs start with topUpCredits=0 |
| 4 | Rename internal variables (credits → units) | ❌ REJECT | Law 2: Codebase is ground truth; Rule 20: Simple solutions | None | Would require Firestore migration; internal naming is consistent |
| 5 | AI Cost % of Revenue metric | 🔄 IMPROVE | Impl: `AI_ADMIN_DASHBOARD: false` flag exists | Add backlog item | None now — data infra exists (`realCostPaise`, `ourChargePaise` per operation) |
| 6 | Pack naming → "Menu Update Pack" | ? CLARIFY | Spec §Launch Model: "AI Enhancement Pack" | Founder decision needed | Name covers images + descriptions + translations; "Menu Update" is too narrow |

---

## Detailed Analysis

### #1: Margins Too High (97%) — VALID, Already Supported

**ChatGPT says:** Margins of ~97% are strategically dangerous. Don't reduce price — increase internal unit costs gradually.

**Codebase evidence:**
- `src/constants/AI/unitCosts.ts:46-64` — `AI_UNIT_COSTS` is a simple constant object
- Changing `IMAGE_GENERATION: 5` to `IMAGE_GENERATION: 7` reduces pack capacity by 40% without any customer-facing change
- No code deployment needed to change — just update the constant and deploy

**Spec alignment:** Spec §Risks says "Start generous, adjust based on margin data." The architecture already enables exactly what ChatGPT suggests.

**Action:** No code change. Add strategic note to spec about unit cost adjustment levers.

---

### #2: Missing Anti-Abuse Velocity Guard — VALID, Already Mitigated

**ChatGPT says:** Add per-store velocity detection for unusual spikes (e.g., 1000 images/hour).

**Codebase evidence — existing protection layers:**

| Layer | Config | Effect | File:Line |
|-------|--------|--------|-----------|
| Rate limit (expensive) | 5 req/min | Max 300 expensive ops/hour | `src/lib/rateLimit/configs.ts:33-36` |
| Rate limit (general AI) | 20 req/min | Max 1200 AI ops/hour | `src/lib/rateLimit/configs.ts:22-25` |
| Capacity enforcement | monthlyCredits + topUpCredits | Can't exceed purchased capacity | `src/lib/ai/capacityCheck.ts:94-108` |
| Overdraft buffer | 20% max | Limited overshoot | `src/constants/AI/unitCosts.ts:75` |
| Kill switch | ENABLE_AI_ENHANCEMENTS | Instant disable all paid ops | `src/config/features.ts` |
| Top-up rate limit | 10/hour | Can't bulk-purchase packs | `src/lib/rateLimit/configs.ts:148-152` |

**Math:** At max rate (5 expensive ops/min), a user burns 5 × 5 = 25 units/min = 1500 units/hour. A 250-unit pack would be exhausted in ~10 minutes. Then they're blocked until they buy another pack (max 10/hour). So max possible burn = 250 × 10 = 2500 units/hour. At ₹12/unit, that's ₹30,000/hour of revenue vs ~₹1,350 Google cost. **Still profitable even at max abuse rate.**

**Action:** No code change. Existing rate limiting + capacity enforcement = sufficient velocity protection. Add explanation to spec §Risks.

---

### #3: Dormant Account topUpCredits — REJECT

**ChatGPT says:** User buys packs, cancels, returns months later, uses old topUpCredits at stale pricing.

**Codebase evidence — this scenario is already handled:**

1. User cancels → `status: "cancelled"`, access until `cycleEndDate`
2. After `cycleEndDate` → `getActiveSubscriptionForStore()` returns `null` (query: `cycleEndDate >= now`)
3. `checkAICapacity()` returns `reason: "no_subscription"` → blocked
4. User re-subscribes → NEW subscription doc created with `topUpCredits: 0`
5. Old subscription's topUpCredits are orphaned on the expired doc — never accessible again

**The only exception:** upgrade flow carries credits forward via `calculateRemainingCredits()`. But that's intentional and happens within an active subscription lifecycle.

**Conclusion:** The architecture naturally orphans old credits. No dormant risk exists.

---

### #4: Rename Internal Variables — REJECT

**ChatGPT says:** Rename `monthlyCredits` → `aiCapacityUnits`, `topUpCredits` → `aiPackUnits` internally.

**Why rejected:**
1. **Firestore migration required** — `monthlyCredits` and `topUpCredits` are Firestore document fields on every subscription
2. **30+ files reference these fields** — types, DAL, API routes, webhooks, frontend
3. **Rule 20 (Simple Solutions)** — "implement only what's needed NOW"
4. **3-Year Freeze** — Renaming doesn't add functionality
5. **No confusion risk** — internal devs know "credits" = "internal units" from docs

**Spec alignment:** The spec explicitly uses "credits" internally and "enhancements" externally. This dual naming is intentional and documented.

---

### #5: AI Cost % of Revenue Metric — IMPROVE (Backlog)

**ChatGPT says:** Track `total_ai_cost / total_subscription_revenue` monthly.

**Codebase evidence — data infrastructure exists:**
- Each AI operation doc has: `realCostPaise`, `ourChargePaise`, `marginPaise` (`src/constants/AI/unitCosts.ts:95-108`)
- Subscription docs have: `amount`, `currency` fields
- Feature flag exists: `AI_ADMIN_DASHBOARD: false` (`ai-enhancement-packs_impl.md:1177`)

**Action:** Add as a concrete metric to the admin dashboard backlog. No code change for the credit pack feature itself.

---

### #6: Pack Naming → "Menu Update Pack" — CLARIFY (Founder Decision)

**ChatGPT says:** Rename "AI Enhancement Pack" to "Menu Update Pack" for better SMB understanding.

**Analysis:**
- Current name "AI Enhancement Pack" covers: images, descriptions, translations, rewrites, editing
- "Menu Update Pack" implies only menu content changes — doesn't cover image generation or editing
- The pack is NOT menu-specific — it could cover any AI operation in the platform

**Recommendation:** Keep "AI Enhancement Pack" for accuracy. If founder prefers a simpler name, "Menu AI Pack" or "AI Boost Pack" are better alternatives that don't limit scope.

**Action:** Flag for founder review. No code change without explicit decision.

---

## Implementation Plan

### Priority Fixes (Code Changes)
None required. All feedback points are either already handled by architecture or rejected.

### Documentation Updates
1. Add margin management strategy note to spec
2. Add velocity protection explanation to spec §Risks
3. Add "AI Cost % of Revenue" to admin dashboard backlog in impl
4. Add dormant account handling explanation to spec

### Founder Decisions Needed
1. Pack naming preference: "AI Enhancement Pack" vs alternative
