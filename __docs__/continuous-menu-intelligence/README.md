# Continuous Menu Intelligence (CMI)

**Menu behavioral observation and priority-based ranking layer**

---

## What This Is

CMI is a **silent, always-on observation layer** that:

- Runs inside the unified hourly scheduler and processes stores when their local settlement window is due
- Evaluates every menu item's behavioral signals
- Computes confidence scores based on customer interaction
- Computes **priority scores** for ranking (never hiding)
- Stores intelligence state for downstream consumption
- Monitors system health (internal only)
- Locks project-specific calibration after sufficient data

**Core Invariant:** "MenuList can annotate truth, but not withhold truth."

**One-line:** "Don't build an intelligent system — build a system that is impossible to distrust."

---

## V1.2 Decision Blocks Hardening (March 2026)

> Following ChatGPT strategic review (~40% accuracy, ~55% suggestions already existed), 6 P0 hardening changes were implemented to prevent Decision Blocks from showing misleading intelligence on low-data SMB stores.

### What Changed

- **Added:** `statsUsed` enrichment in Cloud Function (7 new fields: totalViews, totalClicks, itemsWithClicks, itemsWithPrice, durationCoverage, priceCoverage, daysWithData)
- **Added:** Global activation gate — blocks only render when totalViews ≥ 100, totalClicks ≥ 20, totalItems ≥ 5, daysWithData ≥ 3
- **Added:** Lifecycle states (COLD/LEARNING/STABLE) — COLD shows nothing, LEARNING shows Popular only, STABLE enables all
- **Added:** Block-level eligibility gates — Quick Pick requires 60% duration coverage + STABLE, Best Value requires 70% price coverage
- **Added:** Minimum viability rule — require ≥2 valid blocks or show nothing
- **Added:** Hard stale guard — if scheduler hasn't run in >72h, suppress automatic recommendations; explicit owner pins can still render when the item remains active, available, in-slot, and safe

### Why

SMB stores start with sparse, noisy data. Showing "Popular" from 5 clicks is misleading. The principle: **"Decision Blocks exist only when data earns the right to guide."**

---

## V1.1 Architectural Correction (March 2026)

> Following ChatGPT strategic review + codebase validation, CMI was corrected from a hiding-based to a **priority-based ranking** model. Items are NEVER hidden — only ranked by priority.

### What Changed

- **Removed:** `shouldShowItem()` that returned `show: false` for low-confidence/suppressed/time-ineligible items
- **Added:** `getItemPresentation()` that always returns `visible: true` with a priority score
- **Added:** `getItemsByPriority()` replaces `getHighConfidenceItems()` — sorts by priority, never filters out
- **Added:** Priority computation with dampening, constraints, and stability guarantees
- **Added:** Health monitoring (5 internal metrics: rankVolatility, maxShift, avgPriority, lowDataMode, topItemDays)

### Why

MenuList = truth infrastructure. A truth layer that hides items becomes a **curator of truth** instead of the **source of truth**. This breaks positioning, invites owner control demands, and violates the Product Evolution Doctrine.

### Two-Layer Architecture

| Layer            | Product  | What It Does                                                                 | Status      |
| ---------------- | -------- | ---------------------------------------------------------------------------- | ----------- |
| **Observation**  | MenuList | Signal capture, confidence scoring, **priority ranking**, health monitoring  | ✅ Active   |
| **Optimization** | GrowthOS | Surface allocation, promotion rotation, explore/exploit, attention budgeting | ⏳ Deferred |

---

## 10 Global Invariants (Non-Negotiable)

1. **Truth Completeness:** Every active item must always be present. No hiding.
2. **Deterministic Output:** Same inputs → same output. No meaningful randomness.
3. **Bounded Influence:** No single signal dominates >70% of priority.
4. **No Permanent Winners:** Every item has a path back to exposure.
5. **No Permanent Losers:** Every item retains non-zero priority (min 0.1).
6. **Data-Proportional Intelligence:** Low data → deterministic fallback, high data → behavior-driven.
7. **Local Truth Only:** Intelligence is store-specific, never cross-store.
8. **Silent Operation:** System never requires explanation to owners.
9. **Reversibility:** Any derived decision must be reversible (for future GrowthOS).
10. **Bounded Complexity:** Scoring must remain explainable in one screen of code.

---

## CMI V1.1 Constraint Constants

| Constraint                 | Value     | Purpose                                  |
| -------------------------- | --------- | ---------------------------------------- |
| `MAX_SHIFT_PER_DAY`        | 2         | No item jumps more than 2 positions      |
| `MAX_ITEMS_CHANGED_RATIO`  | 0.3       | Max 30% of items can change position     |
| `DAMPENING_OLD/NEW`        | 0.7 / 0.3 | Weighted average prevents sudden jumps   |
| `MIN_PRIORITY`             | 0.1       | Nothing disappears                       |
| `MIN_PRIORITY_CHANGE`      | 0.05      | Ignores micro-fluctuations               |
| `NEW_ITEM_BOOST`           | 0.1       | New items get fair exposure              |
| `LOW_DATA_VIEWS_THRESHOLD` | 100       | Below this, freeze ranking               |
| `HIGHLIGHT_THRESHOLD`      | 0.7       | Top-tier items eligible for spotlight    |
| `RECOMMENDATION_THRESHOLD` | 0.6       | Items eligible for recommendation blocks |

---

## Documentation

| File                                                   | Purpose                          |
| ------------------------------------------------------ | -------------------------------- |
| `continuous-menu-intelligence_spec.md`                 | Product specification            |
| `continuous-menu-intelligence_impl.md`                 | Technical implementation         |
| `continuous-menu-intelligence_firebase.md`             | Firebase cost tracking           |
| `continuous-menu-intelligence_validation.md`           | Logic verification report        |
| `continuous-menu-intelligence_marketing.md`            | Marketing collateral             |
| `continuous-menu-intelligence_website.md`              | Website content                  |
| `continuous-menu-intelligence_helpdoc.md`              | Customer help docs               |
| `_archive/chatgpt-review-strategic-repositioning.md`   | March 2026 two-layer review      |
| `_archive/chatgpt-review-v1.1-ranking-correction.md`   | March 2026 hiding→ranking review |
| `_archive/chatgpt-review-decision-blocks-hardening.md` | March 2026 DI hardening review   |

---

## Key Files (Codebase)

| File                                                       | Purpose                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| `functions/src/decisionBlocksScoring.ts`                   | CF: Decision Blocks scoring + statsUsed enrichment            |
| `functions/src/intelligence/menuIntelligence.ts`           | Core: confidence + **priority** + health                      |
| `functions/src/intelligence/shared/analyticsAggregator.ts` | 7-day analytics fetch                                         |
| `functions/src/intelligence/shared/itemExtractor.ts`       | Item extraction                                               |
| `functions/src/intelligence/shared/scoreNormalizer.ts`     | WEIGHTS, THRESHOLDS, normalize() — single source of truth     |
| `src/components/.../DecisionBlocks.tsx`                    | Runtime: lifecycle gating + availability filter + rendering   |
| `src/components/.../decisionBlocks.types.ts`               | Client types + enriched statsUsed                             |
| `src/config/decisionBlocks.ts`                             | Block config, labels, duration, category rules                |
| `src/lib/intelligence/dal.ts`                              | Frontend DAL: `getItemPresentation()`, `getItemsByPriority()` |
| `src/types/intelligence.ts`                                | Shared types + `CMI_CONSTRAINTS` + `ItemPresentation`         |

---

## Future Improvements (Documented, Not Scheduled)

| Improvement                                           | Source             | Status     |
| ----------------------------------------------------- | ------------------ | ---------- |
| Data sufficiency calibration (replace 21-day fixed)   | ChatGPT March 2026 | Documented |
| Exposure-based fatigue (replace day-based)            | ChatGPT March 2026 | Documented |
| Category-within ranking (preserve menu structure)     | ChatGPT March 2026 | Documented |
| Dominance penalty (max 40% exposure share)            | ChatGPT March 2026 | Documented |
| Client session buffering (cost optimization at scale) | ChatGPT March 2026 | Documented |
| Item consideration signal (dwell time tracking)       | ChatGPT March 2026 | Documented |
| Cross-block dedup at scoring level (P1)               | ChatGPT March 2026 | Documented |
| Confidence-based label softening (P1)                 | ChatGPT March 2026 | Documented |
| Render tracking events (P2)                           | ChatGPT March 2026 | Documented |

---

---

## Decision Blocks Lifecycle States

| State        | Condition         | Behavior                                  |
| ------------ | ----------------- | ----------------------------------------- |
| **COLD**     | totalViews < 100  | No blocks shown (pinned only if fallback) |
| **LEARNING** | 100 ≤ views < 500 | Only Popular eligible                     |
| **STABLE**   | totalViews ≥ 500  | All blocks eligible                       |

## Decision Blocks Activation Thresholds

| Threshold                 | Value | Purpose                                   |
| ------------------------- | ----- | ----------------------------------------- |
| `COLD_MAX_VIEWS`          | 100   | Below this = COLD (no blocks)             |
| `LEARNING_MAX_VIEWS`      | 500   | Below this = LEARNING (Popular only)      |
| `MIN_CLICKS`              | 20    | Global minimum clicks                     |
| `MIN_ITEMS`               | 5     | Global minimum items                      |
| `MIN_ANALYTICS_DAYS`      | 3     | Need at least 3 days of data              |
| `POPULAR_MIN_CLICKS`      | 30    | Popular block: min clicks                 |
| `POPULAR_MIN_ITEMS`       | 3     | Popular block: min unique items w/ clicks |
| `QUICK_PICK_DURATION_COV` | 0.6   | Quick Pick: 60% items need duration       |
| `BEST_VALUE_PRICE_COV`    | 0.7   | Best Value: 70% items need price          |
| `BEST_VALUE_MIN_ITEMS`    | 5     | Best Value: min items with price          |
| `MIN_BLOCKS_TO_RENDER`    | 2     | Minimum blocks or show nothing            |
| `STALE_HOURS`             | 72    | Hard cutoff: nothing after 72h            |

---

_Last Updated: June 11, 2026_
_Status: Controlled owner testing ready in audited slice; full MenuList certification pending_
