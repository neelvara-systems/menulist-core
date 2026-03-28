# ChatGPT Review — Decision Blocks Hardening (March 2026)

**Date:** March 21, 2026  
**Source:** ChatGPT strategic conversation (~15,000 words)  
**Reviewer:** Cascade  
**ChatGPT Accuracy:** ~40%

---

## Context

ChatGPT reviewed the Decision Blocks system (3 customer-facing recommendation blocks at top of menus: Popular, Quick Pick, Best Value). The conversation covered: strategic positioning, SMB compatibility, hardening requirements, edge cases, monitoring, and evolution guardrails.

## Accuracy Breakdown

- **~55% already implemented** — ChatGPT unaware of existing features
- **~15% valid new P0 hardening** — Implemented in this session
- **~10% valid but deferred** — P1/P2, documented for future
- **~20% wrong or rejected** — Over-engineering or misaligned

---

## Full Assessment Table

| # | ChatGPT Suggestion | Verdict | Reason |
|---|---|---|---|
| 1 | Category-based block disabling | ✅ ALREADY DONE | `decisionBlocks.ts` CATEGORY_CONFIGS |
| 2 | Softened labels | ✅ ALREADY DONE | P2.5/P2.6 applied |
| 3 | TTL + fallback | ✅ ALREADY DONE | 48h TTL + pinned-only fallback |
| 4 | Runtime availability filter | ✅ ALREADY DONE | 3 mandatory checks |
| 5 | Owner pin override | ✅ ALREADY DONE | DecisionBlocksSettingsModal.tsx |
| 6 | Cross-block dedup (runtime) | ✅ ALREADY DONE | `usedItemIds` Set |
| 7 | Business category awareness | ✅ ALREADY DONE | 7 categories |
| 8 | i18n translations | ✅ ALREADY DONE | EN/HI |
| 9 | Analytics tracking | ✅ ALREADY DONE | render + click |
| 10 | Scheduler Monitor Dashboard | ✅ ALREADY DONE | `/ops/scheduler` |
| 11 | Feature flag | ✅ ALREADY DONE | `ENABLE_DECISION_BLOCKS` |
| 12 | No personalization | ✅ ALREADY DONE | By design |
| 13 | Deterministic scoring | ✅ ALREADY DONE | By design |
| 14 | Owner settings modal | ✅ ALREADY DONE | Exists |
| 15 | Shared scoring modules | ✅ ALREADY DONE | 3 shared modules |
| 16 | CMI priority-based ranking | ✅ ALREADY DONE | V1.1 correction |
| 17 | **Signal threshold gating** | ✅ IMPLEMENTED | Global activation gate added |
| 18 | **Lifecycle states (COLD/LEARNING/STABLE)** | ✅ IMPLEMENTED | 3 lifecycle states with thresholds |
| 19 | **Block-level data coverage checks** | ✅ IMPLEMENTED | Per-block eligibility gates |
| 20 | **Minimum viability (≥2 blocks)** | ✅ IMPLEMENTED | Show nothing if <2 valid blocks |
| 21 | **statsUsed enrichment** | ✅ IMPLEMENTED | 7 new fields in CF output |
| 22 | **Stale scheduler guard (>72h)** | ✅ IMPLEMENTED | Hard cutoff beyond TTL |
| 23 | Cross-block dedup at scoring | ⏳ DEFER (P1) | Valid, not critical |
| 24 | Confidence-based label softening | ⏳ DEFER (P1) | Needs real traffic |
| 25 | Render tracking events | ⏳ DEFER (P2) | Premature |
| 26 | Internal monitoring dashboard | ⏳ DEFER (P2) | Already have /ops/scheduler |
| 27 | "Best Value" → "Balanced choice" | ❌ REJECT | "Good value" already neutral |
| 28 | Session stability (sessionStorage) | ❌ REJECT | Would cause stale data |
| 29 | Analytics noise filtering | ❌ REJECT | 7-day aggregation smooths |
| 30 | Rename to "Decision Defaults Layer" | ❌ REJECT | Internal naming irrelevant |
| 31 | "First-time friendly" block | ❌ REJECT | Violates 3-block constraint |
| 32 | Exposure decay factor | ⏳ DEFER | CMI V1.1 has dampening |
| 33 | Item identity stability | ❌ REJECT | UIDs are stable |
| 34 | Website hero/copy changes | ⏳ DEFER | Separate workflow |
| 35 | Controlled rollout (5%→25%→100%) | ❌ REJECT | Feature flag sufficient |
| 36 | Per-session click capping | ⏳ DEFER (P2) | Premature |

---

## What Was Implemented (6 P0 Changes)

### 1. statsUsed Enrichment (Cloud Function)
**File:** `functions/src/decisionBlocksScoring.ts`  
Added 7 new fields to `statsUsed` output:
- `totalViews`, `totalClicks`, `itemsWithClicks`, `itemsWithPrice`
- `durationCoverage`, `priceCoverage`, `daysWithData`

### 2. Global Activation Gate (Client)
**File:** `DecisionBlocks.tsx`  
`passesGlobalGate()` checks: totalViews ≥ 100, totalClicks ≥ 20, totalItems ≥ 5, daysWithData ≥ 3

### 3. Lifecycle States (Client)
**File:** `DecisionBlocks.tsx`  
`getLifecycleState()` returns COLD/LEARNING/STABLE based on view count.
- COLD (<100 views): no blocks
- LEARNING (100-500): Popular only eligible
- STABLE (500+): all blocks eligible

### 4. Block-Level Eligibility (Client)
**File:** `DecisionBlocks.tsx`  
Per-block gates in `computeFromPrecomputed()`:
- Popular: totalClicks ≥ 30, itemsWithClicks ≥ 3
- Quick Pick: lifecycle STABLE + durationCoverage ≥ 60%
- Best Value: priceCoverage ≥ 70%, itemsWithPrice ≥ 5

### 5. Minimum Viability Rule (Client)
**File:** `DecisionBlocks.tsx`  
If <2 valid blocks after all gating → return empty (show nothing)

### 6. Stale Scheduler Guard (Client)
**File:** `DecisionBlocks.tsx`  
`isHardStale()`: if computedAt > 72h ago → show nothing at all (not even pinned)

### Type Update
**File:** `decisionBlocks.types.ts`  
`PrecomputedDecisionBlocks.statsUsed` extended with 7 optional hardening fields (backward-compatible)

---

## Strategic Alignment (ChatGPT vs Codebase)

| ChatGPT Position | Codebase Reality | Aligned? |
|---|---|---|
| "Decision accelerator, not recommendation engine" | Exactly our doctrine | ✅ |
| "Observational language only" | Already softened (P2.5/P2.6) | ✅ |
| "No personalization ever" | Never implemented, never planned | ✅ |
| "Max 3 blocks forever" | 3 blocks in config, no expansion planned | ✅ |
| "Hide when weak, not show partial" | Now enforced via lifecycle + min viability | ✅ |
| "System must earn visibility" | Now enforced via global gate + thresholds | ✅ |
| "MenuList reveals, does not decide" | Core doctrine alignment | ✅ |

---

## Key Principle Locked

> "Decision Blocks exist only when data earns the right to guide."

This is now enforced in code via the 5-layer hardening system:
1. Global gate → 2. Lifecycle state → 3. Block eligibility → 4. Runtime filter → 5. Min viability

---

_Reviewed: March 21, 2026_
_Status: Changes implemented, docs updated_
