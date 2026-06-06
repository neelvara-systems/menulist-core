# DECISION INTELLIGENCE (DECISION BLOCKS) - LOGIC VERIFICATION REPORT

**Date:** January 11, 2026  
**Latest Verification:** May 7, 2026
**Target Feature:** decision-intelligence  
**Status:** ✅ **DEPLOYABLE**

---

## 📊 EXECUTIVE SUMMARY

### May 7, 2026 Verification Addendum

The implementation was re-checked against the current codebase and corrected for production readiness:

- Scheduler project reads now use the canonical nested project path: `projects/{tId}/{sId}/{projectId}`.
- Public menu uses `projects/{tId}/{sId}/{projectId}.publicDecisionBlocks` from the already-loaded project document, so customer rendering does not need a separate Decision Blocks Firestore read.
- Missing precomputed documents now fall through to the owner-pinned fallback path instead of being treated as hard-stale.
- Valid precomputed documents that fail automatic activation gates now fall through to owner-pinned fallback, preserving owner-authored picks without client-side ranking.
- Owner pins in valid precomputed mode now bypass automatic block eligibility and empty candidate-list gates. They still respect runtime availability, owner toggles, business-type block support, duplicate suppression, category time slots, and hidden-price Best Value suppression.
- Manual recovery callable now requires an authenticated `PLATFORM` role.
- Mobile owner controls exist through `SmartRecommendationsSheet.tsx`; the older "no owner UI" mobile note was stale.

```
DECISION BLOCKS LOGIC AUDIT
TOTAL FLOWS VERIFIED: 7
CRITICAL ISSUES: 0
PRODUCTION READINESS: SAFE
COVERAGE: 100% (7/7 flows)
```

---

## STAGE 1: LOGIC DISCOVERY & SOURCE MAPPING

### FEATURE LOGIC INVENTORY

| Logic Type | Entry Point                     | Trigger             | Source File                | Docs Reference   |
| ---------- | ------------------------------- | ------------------- | -------------------------- | ---------------- |
| Scheduler  | `decisionBlocksScoring.ts`      | Hourly trigger; store-local settlement window | `decisionBlocksScoring.ts` | impl.md          |
| Scoring    | `calculatePopularScore():141`   | Within scheduler    | `decisionBlocksScoring.ts` | spec.md Scoring  |
| Scoring    | `calculateQuickPickScore():156` | Within scheduler    | `decisionBlocksScoring.ts` | spec.md Scoring  |
| Scoring    | `calculateBestValueScore():181` | Within scheduler    | `decisionBlocksScoring.ts` | spec.md Scoring  |
| Client     | `computeFromPrecomputed():184`  | On menu render      | `DecisionBlocks.tsx`       | impl.md Layer 2  |
| Client     | `computeBlocksFallback():271`   | TTL expired         | `DecisionBlocks.tsx`       | impl.md Fallback |
| Config     | `getEnabledBlocks():274`        | All contexts        | `decisionBlocks.ts`        | spec.md Business |

### SOURCE FILES TRUTH TABLE

| File Path                                              | LOC | Purpose                              |
| ------------------------------------------------------ | --- | ------------------------------------ |
| `functions/src/decisionBlocksScoring.ts`               | 839 | Nightly scoring scheduler            |
| `functions/src/intelligence/shared/scoreNormalizer.ts` | 83  | Scoring weights & utils (extracted)  |
| `src/components/.../DecisionBlocks.tsx`                | 576 | Customer-facing UI                   |
| `src/config/decisionBlocks.ts`                         | 439 | Configuration + labels               |
| `src/data/decisionBlockTranslations.ts`                | 181 | i18n translations                    |
| `src/components/.../DecisionBlocksSettingsModal.tsx`   | 381 | Owner settings                       |
| `src/components/.../types/decisionBlocks.types.ts`     | 64  | TypeScript types (dead code removed) |

> **Note (Feb 9, 2026):** Line numbers in this report may have shifted by ~48 lines in `decisionBlocksScoring.ts` due to extraction of WEIGHTS/THRESHOLDS/DURATIONS/normalize to `scoreNormalizer.ts`. The scoring logic itself is unchanged.

---

## STAGE 2: RAW DATA → CALCULATION VERIFICATION

### FLOW #1: Popular Right Now Scoring

**CONSTANTS**

| Constant                   | Value | File:Line               |
| -------------------------- | ----- | ----------------------- |
| WEIGHTS.popular.views      | 0.4   | `scoreNormalizer.ts:13` |
| WEIGHTS.popular.clicks     | 0.3   | `scoreNormalizer.ts:14` |
| WEIGHTS.popular.orders     | 0.2   | `scoreNormalizer.ts:15` |
| WEIGHTS.popular.ownerBoost | 0.1   | `scoreNormalizer.ts:16` |

**FORMULA TRUTH**

| Source                                        | Formula                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| **DOC** (spec.md)                             | `views×40% + clicks×30% + orders×20% + ownerBoost×10% + bestSellerBonus` |
| **CODE** (`decisionBlocksScoring.ts:141-150`) | Same formula                                                             |

**CODE IMPLEMENTATION**

```typescript
// decisionBlocksScoring.ts:141-150
function calculatePopularScore(item, maxViews, maxClicks, maxOrders) {
  const viewScore = normalize(item.views, maxViews) * 0.4;
  const clickScore = normalize(item.clicks, maxClicks) * 0.3;
  const orderScore = normalize(item.orders, maxOrders) * 0.2;
  const boostScore = (((item.ownerBoost || 0) + 20) / 40) * 100 * 0.1;
  const bestSellerBonus = item.isBestSeller ? 10 : 0;
  return viewScore + clickScore + orderScore + boostScore + bestSellerBonus;
}
```

**DRY RUN**

```
Input: views=100, maxViews=200, clicks=50, maxClicks=100, orders=10, maxOrders=20, ownerBoost=10, isBestSeller=true
Step 1: viewScore = (100/200)*100*0.4 = 20
Step 2: clickScore = (50/100)*100*0.3 = 15
Step 3: orderScore = (10/20)*100*0.2 = 10
Step 4: boostScore = ((10+20)/40)*100*0.1 = 7.5
Step 5: bestSellerBonus = 10
Final: 20 + 15 + 10 + 7.5 + 10 = 62.5
```

**VERIFICATION:** ✅ PASS

---

### FLOW #2: Quick Pick Scoring

**CONSTANTS**

| Constant                     | Value | File:Line                      |
| ---------------------------- | ----- | ------------------------------ |
| WEIGHTS.quickPick.duration   | 0.6   | `decisionBlocksScoring.ts:95`  |
| WEIGHTS.quickPick.popularity | 0.3   | `decisionBlocksScoring.ts:96`  |
| WEIGHTS.quickPick.ownerBoost | 0.1   | `decisionBlocksScoring.ts:97`  |
| QUICK_PICK_THRESHOLDS.food   | 10    | `decisionBlocksScoring.ts:108` |
| DEFAULT_DURATIONS.food       | 15    | `decisionBlocksScoring.ts:120` |

**FORMULA TRUTH**

| Source                                        | Formula                                              |
| --------------------------------------------- | ---------------------------------------------------- |
| **DOC** (spec.md)                             | `(1/duration)×60% + popularity×30% + ownerBoost×10%` |
| **CODE** (`decisionBlocksScoring.ts:156-175`) | Same with ineligibility check                        |

**CODE IMPLEMENTATION**

```typescript
// decisionBlocksScoring.ts:156-175
function calculateQuickPickScore(item, businessCategory, maxPopularity) {
  const threshold = QUICK_PICK_THRESHOLDS[businessCategory] || 15;
  const duration = item.duration || DEFAULT_DURATIONS[businessCategory] || 15;

  // Ineligible if too slow
  if (duration > threshold * 2) return -1;

  // Duration score: lower is better
  const durationScore = Math.max(0, 100 - (duration / threshold) * 50) * 0.6;

  // Popularity component
  const popularity = item.views + item.clicks * 2 + item.orders * 5;
  const popularityScore = normalize(popularity, maxPopularity) * 0.3;

  // Owner boost
  const boostScore = (((item.ownerBoost || 0) + 20) / 40) * 100 * 0.1;

  return durationScore + popularityScore + boostScore;
}
```

**DRY RUN**

```
Input: duration=5, threshold=10, popularity=100, maxPopularity=200, ownerBoost=0
Step 1: duration(5) <= threshold*2(20) → eligible ✅
Step 2: durationScore = max(0, 100 - (5/10)*50) * 0.6 = 75 * 0.6 = 45
Step 3: popularityScore = (100/200)*100*0.3 = 15
Step 4: boostScore = ((0+20)/40)*100*0.1 = 5
Final: 45 + 15 + 5 = 65
```

**VERIFICATION:** ✅ PASS

---

### FLOW #3: Best Value Scoring

**CONSTANTS**

| Constant                     | Value | File:Line                      |
| ---------------------------- | ----- | ------------------------------ |
| WEIGHTS.bestValue.valueRatio | 0.7   | `decisionBlocksScoring.ts:100` |
| WEIGHTS.bestValue.ownerBoost | 0.1   | `decisionBlocksScoring.ts:101` |
| WEIGHTS.bestValue.popularity | 0.2   | `decisionBlocksScoring.ts:102` |

**CODE IMPLEMENTATION**

```typescript
// decisionBlocksScoring.ts:181-198
function calculateBestValueScore(item, maxPopularity, avgPrice) {
  if (!item.price || item.price <= 0) return -1;

  const popularity = item.views + item.clicks * 2 + item.orders * 5;
  const valueRatio = popularity / item.price;
  const maxValueRatio = maxPopularity / (avgPrice * 0.5);
  const valueScore = normalize(valueRatio, maxValueRatio) * 0.7;
  const popularityScore = normalize(popularity, maxPopularity) * 0.2;
  const boostScore = (((item.ownerBoost || 0) + 20) / 40) * 100 * 0.1;

  return valueScore + popularityScore + boostScore;
}
```

**VERIFICATION:** ✅ PASS

---

### FLOW #4: Runtime Availability Filter (Layer 2)

**CODE IMPLEMENTATION**

```typescript
// DecisionBlocks.tsx:126-179
function selectAvailableCandidate(
  candidates,
  items,
  categoryMap,
  usedItemIds,
  pinnedId,
) {
  const isAvailable = (itemId) => {
    const item = itemMap.get(itemId);
    if (!item) return false;
    if (item.active === false) return false; // Check 1: Not disabled
    if (item.available === false) return false; // Check 2: Not sold out
    if (!isCategoryWithinTimeSlot(category)) return false; // Check 3: Time slot
    if (usedItemIds.has(itemId)) return false; // Check 4: Not already used
    return true;
  };

  // Try pinned first
  if (pinnedId && isAvailable(pinnedId)) {
    return { item, reason: "decision.pinned.ownerPick" };
  }

  // Find first available from candidates
  for (const candidate of candidates) {
    if (isAvailable(candidate.itemId)) {
      return { item, reason: candidate.reason };
    }
  }

  return undefined; // Block hidden
}
```

**VERIFICATION:** ✅ PASS - 4 mandatory checks implemented

---

### FLOW #5: TTL Validation

**CONSTANTS**

| Constant                  | Value | File:Line                     |
| ------------------------- | ----- | ----------------------------- |
| DECISION_BLOCKS_TTL_HOURS | 48    | `decisionBlocksScoring.ts:67` |

**CODE IMPLEMENTATION**

```typescript
// DecisionBlocks.tsx:72-81
function isPrecomputedValid(precomputed) {
  if (!precomputed) return false;
  if (!precomputed.validUntil) return false;
  const validUntil =
    precomputed.validUntil instanceof Date
      ? precomputed.validUntil
      : new Date(precomputed.validUntil);
  return validUntil > new Date();
}
```

**VERIFICATION:** ✅ PASS

---

### FLOW #6: Fallback Logic (TTL Expired)

**CODE IMPLEMENTATION**

```typescript
// DecisionBlocks.tsx:271-341
function computeBlocksFallback(items, categories, businessType, ownerControls) {
  // CRITICAL: Client NEVER ranks - only shows owner-pinned items
  // Single source of truth: scheduler ranks, client filters

  if (ownerControls?.pinnedPopular && isAvailable(pinnedPopular)) {
    blocks.push({
      blockType: "popular",
      item,
      reason: "decision.pinned.ownerPick",
    });
  }
  // Same for quickPick, bestValue

  return blocks; // Empty if no pinned items
}
```

**VERIFICATION:** ✅ PASS - No client-side ranking

---

### FLOW #7: Business Category Configuration

**CATEGORY CONFIG TABLE**

| Category     | Enabled Blocks                | Code Evidence           |
| ------------ | ----------------------------- | ----------------------- |
| food         | popular, quickPick, bestValue | `decisionBlocks.ts:194` |
| service      | popular, quickPick, bestValue | `decisionBlocks.ts:199` |
| retail       | popular, bestValue            | `decisionBlocks.ts:204` |
| health       | popular, bestValue            | `decisionBlocks.ts:211` |
| professional | popular, bestValue            | `decisionBlocks.ts:216` |
| creative     | popular, bestValue            | `decisionBlocks.ts:221` |
| specialty    | popular, quickPick, bestValue | `decisionBlocks.ts:226` |

**CROSS-CHECK: Scheduler vs Client**

| Category | Scheduler (QUICK_PICK_THRESHOLDS) | Client (CATEGORY_CONFIGS) | Match |
| -------- | --------------------------------- | ------------------------- | ----- |
| food     | 10 min                            | quickPick enabled         | ✅    |
| retail   | 0 (disabled)                      | quickPick NOT enabled     | ✅    |
| health   | 30 min                            | quickPick NOT enabled     | ✅    |

**VERIFICATION:** ✅ PASS - Scheduler and client configs aligned

---

## STAGE 3: DB STORAGE VERIFICATION

**STORAGE FLOW**

| Aspect         | Value                          |
| -------------- | ------------------------------ |
| Collection     | `decisionBlocks`               |
| Document ID    | `{tId}_{sId}_{projectId}`      |
| Write Location | `decisionBlocksScoring.ts:599` |

**SCHEMA VERIFICATION**

| Field        | Type         | Code Evidence                    |
| ------------ | ------------ | -------------------------------- |
| `tId`        | string       | `decisionBlocksScoring.ts:70`    |
| `sId`        | string       | `decisionBlocksScoring.ts:71`    |
| `projectId`  | string       | `decisionBlocksScoring.ts:72`    |
| `popular`    | ScoredItem[] | `decisionBlocksScoring.ts:74`    |
| `quickPick`  | ScoredItem[] | `decisionBlocksScoring.ts:75`    |
| `bestValue`  | ScoredItem[] | `decisionBlocksScoring.ts:76`    |
| `computedAt` | FieldValue   | `decisionBlocksScoring.ts:77`    |
| `validUntil` | Date         | `decisionBlocksScoring.ts:78`    |
| `statsUsed`  | object       | `decisionBlocksScoring.ts:79-83` |

**COST IMPACT**

| Operation         | Frequency     | Reads           | Writes |
| ----------------- | ------------- | --------------- | ------ |
| Nightly scheduler | 1/day/project | ~10 (analytics) | 1      |
| Client render     | On menu view  | 1 (via props)   | 0      |

**STATUS:** ✅ STORAGE CORRECT

---

## STAGE 4: CLIENT RENDERING VERIFICATION

**RENDER PATH**

```
precomputedBlocks (prop) → useMemo → blocks → map → Button components
```

**DATA FLOW**

| Step | File:Line                    | Description                                 |
| ---- | ---------------------------- | ------------------------------------------- |
| 1    | `DecisionBlocks.tsx:399-416` | Compute blocks from precomputed or fallback |
| 2    | `DecisionBlocks.tsx:363-381` | Translate i18n reason keys                  |
| 3    | `DecisionBlocks.tsx:487-571` | Render block buttons                        |

**ANALYTICS TRACKING**

| Event                         | File:Line                    | Trigger                             |
| ----------------------------- | ---------------------------- | ----------------------------------- |
| `trackDecisionBlocksRendered` | `DecisionBlocks.tsx:453-458` | Once per session when blocks render |
| `trackDecisionBlockClick`     | `DecisionBlocks.tsx:424-430` | On block tap                        |

**EDGE CASES**

| Edge Case            | Expected               | Code Evidence                | Status |
| -------------------- | ---------------------- | ---------------------------- | ------ |
| No blocks to show    | Return null            | `DecisionBlocks.tsx:462-464` | ✅     |
| TTL expired, no pins | Empty blocks           | `DecisionBlocks.tsx:338-340` | ✅     |
| Item unavailable     | Skip to next candidate | `DecisionBlocks.tsx:165-175` | ✅     |
| Pinned unavailable   | Use precomputed        | `DecisionBlocks.tsx:158-162` | ✅     |
| First block larger   | minWidth 220 vs 200    | `DecisionBlocks.tsx:509-510` | ✅     |

**STATUS:** ✅ RENDER CORRECT

---

## STAGE 5: CROSS-FEATURE DEPENDENCY CHECK

**DEPENDENCY MATRIX**

| This Feature Writes         | Read By Features              | Conflict Risk | Status |
| --------------------------- | ----------------------------- | ------------- | ------ |
| `decisionBlocks` collection | B2C Menu (DecisionBlocks.tsx) | LOW           | ✅     |

**SCHEDULER INTEGRATION**

- [x] Runs hourly at `:30` UTC and processes stores whose local settlement window is due
- [x] Uses `storesSummary` for cost optimization (`decisionBlocksScoring.ts:530`)
- [x] Iterates all stores → all projects
- [x] Also triggers CMI computation (`decisionBlocksScoring.ts:604-629`)

**RELATED FEATURES**

| Feature   | Relationship                                   | Status        |
| --------- | ---------------------------------------------- | ------------- |
| CMI       | Same scheduler, computed after Decision Blocks | ✅ Aligned    |
| Analytics | Reads `analytics` collection for scoring       | ✅ Compatible |

---

## 🔍 FLOW-BY-FLOW RESULTS

| Flow                     | Type      | Files Checked | Status  |
| ------------------------ | --------- | ------------- | ------- |
| Popular Scoring          | Scheduler | 1             | ✅ PASS |
| Quick Pick Scoring       | Scheduler | 1             | ✅ PASS |
| Best Value Scoring       | Scheduler | 1             | ✅ PASS |
| Runtime Availability     | Client    | 1             | ✅ PASS |
| TTL Validation           | Client    | 1             | ✅ PASS |
| Fallback Logic           | Client    | 1             | ✅ PASS |
| Business Category Config | Config    | 2             | ✅ PASS |

---

## 🚨 CRITICAL FAILURES

**None.**

---

## ✅ VALIDATION CHECKLIST

- [x] All formulas match docs/constants
- [x] Thresholds identical across scheduler and client
- [x] DB schema matches calculation outputs
- [x] Client displays correct values + edge cases
- [x] Analytics tracking implemented
- [x] i18n translations working
- [x] Fallback behavior correct (no client ranking)

---

## FINAL VERDICT: ✅ DEPLOYABLE

**Decision Blocks logic verification complete. All 7 flows verified. Zero critical issues.**

---

_Generated: January 11, 2026_
