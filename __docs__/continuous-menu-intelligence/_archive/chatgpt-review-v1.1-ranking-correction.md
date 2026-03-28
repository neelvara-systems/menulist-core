# ChatGPT Review: CMI V1.1 — Hiding → Ranking Correction

**Date:** March 19, 2026
**Source:** ChatGPT strategic conversation (~8,000 words)
**Reviewer:** Cascade
**Accuracy:** ~80%

---

## Summary

ChatGPT identified that CMI's `shouldShowItem()` function violated MenuList's truth layer positioning by hiding items based on suppression, time ineligibility, and low confidence. The core recommendation was to replace hiding with priority-based ranking — items are never removed, only reordered.

## ChatGPT Accuracy Table

| Suggestion | Verdict | Reason |
|---|---|---|
| Remove hiding → ranking | ✅ AGREE | Core violation of truth layer |
| Add priority score field | ✅ AGREE | Enables ranking without hiding |
| Dampening (0.7/0.3) | ✅ AGREE | Prevents daily jumps |
| Max shift limit (2) | ✅ AGREE | Prevents perception instability |
| Max items changed (30%) | ✅ AGREE | Prevents "feels different" |
| New item boost (+0.1, 7 days) | ✅ AGREE | Prevents cold start death |
| Low data freeze (<100 views) | ✅ AGREE | Already partially exists |
| Health monitoring (5 metrics) | ✅ AGREE | Internal only, lightweight |
| 10 global invariants | ✅ AGREE | Formalizes truth principle |
| "Mark as Important" replaces ownerBoost | ❌ REJECT (now) | UI change, out of CMI scope |
| Remove suppression/time from state | ❌ REJECT | Keep computing for observation |
| Full V2 composite scoring | ❌ REJECT | Overkill at current scale |
| Dominance penalty | ❌ DEFER | Not needed yet |
| Contextual bandits | ❌ REJECT | Needs 10K+ restaurants |
| Rename collection | ❌ REJECT | Breaking change, zero benefit |
| Category-within ranking | ✅ AGREE (future) | Critical but not V1.1 scope |
| Exposure-based fatigue | ✅ AGREE (future) | Better model, future improvement |

## Key Insight Accepted

> "MenuList can annotate truth, but not withhold truth."

This is the single most important correction. A truth layer that hides items becomes a curator, not a source. This breaks:
- Positioning (truth infrastructure → optimization tool)
- Trust (owner sees missing items → demands control)
- Simplicity (hiding requires explanation → UI complexity)

## Key Insight: "Fragile in User Perception"

> "This feature scales easily in infrastructure, but is fragile in user perception."

Infrastructure can handle 100K stores. But a single unexpected item reorder breaks owner trust silently.

Solution: Constrain system behavior (dampening, shift limits, change caps) instead of making it smarter.

## What Was Implemented

1. **Added `itemPriority`** field to `MenuIntelligenceState` (CF + frontend types)
2. **Added `computeItemPriority()`** — simple: confidence + dampening + new item boost + recency boost
3. **Added `computeHealthSummary()`** — 5 internal metrics (rankVolatility, maxShift, avgPriority, lowDataMode, topItemDays)
4. **Replaced `shouldShowItem()`** with `getItemPresentation()` — always returns `visible: true`
5. **Replaced `getHighConfidenceItems()`** with `getItemsByPriority()` — sorted, never filtered
6. **Added constraint constants** (`CMI_CONSTRAINTS` in `src/types/intelligence.ts`)

## What Was NOT Implemented (Deferred)

- Full V2 composite scoring (dominance penalty, complex weighting)
- Category-within ranking
- Exploration slots
- Position shift enforcement at surface level
- ownerBoost → "Mark as Important" UI change
- Data sufficiency calibration (replace 21-day fixed)

## Codebase Finding

**Critical:** `shouldShowItem()` and `getHighConfidenceItems()` had ZERO callers in the entire codebase. The hiding behavior was architecturally present but not active in any surface. This made the refactor completely safe.

## ChatGPT Conversation Topics (Chronological)

1. Core architectural violation identified (hiding = control, not truth)
2. `shouldShowItem()` → `getItemPresentation()` redesign
3. Decision Blocks + Today Tab + Screen selection redesign proposal
4. Failure mode simulation (10 scenarios)
5. Final scoring formula (V2 — rejected as overkill)
6. Global invariants + guardrails
7. Lock-in and compounding advantage analysis
8. Distribution dominance strategy
9. SMB compatibility assessment
10. Exact numeric thresholds for stability
11. Scalability and performance analysis
12. Edge cases deep-dive (16 scenarios)
13. Minimal V1.1 scope agreement

---

_Reviewed: March 19, 2026_
