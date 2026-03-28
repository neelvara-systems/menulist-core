# Extraction Learning Loop — Spec + Implementation

**Feature:** 10.2  
**Priority:** P1 — Authority Phase (HIGHEST LEVERAGE UNBUILT SYSTEM)  
**Status:** 📋 DOCUMENTATION PHASE  
**Depends On:** 10.1 (Extraction Confidence Scoring)  
**Feeds Into:** 10.3 (Store Truth Confidence)

---

## 1. What Is This?

A system that tracks what owners correct after AI extraction, aggregates correction patterns, and uses those patterns to improve extraction accuracy over time.

**This is the single most impactful unbuilt infrastructure system.** Every owner correction is a free training signal that MenuList currently throws away.

---

## 2. Why Does This Matter?

**Current state:** Owner uploads menu → AI extracts → Owner corrects mistakes → Corrections are saved to project → AI learns NOTHING from the corrections.

**With learning loop:** Owner uploads menu → AI extracts (with confidence per item, from 10.1) → Owner corrects mistakes → Corrections are logged as `EXTRACTION_CORRECTION` events in MOL → Nightly job aggregates patterns → Correction patterns inform future extraction prompts.

**Impact:** Every extraction gets slightly better because the system learns from all previous corrections across all stores.

---

## 3. Existing Infrastructure

### MOL (Menu Observation Layer)
- **`src/database/menuChangeLog/index.ts`** — `logMenuChange()` with debounced writes
- **Change types:** `PRICE`, `AVAILABILITY`, `ITEM_ACTIVE`, `ITEM_ADDED`, `ITEM_REMOVED`, `PUBLISH`
- **Actor tracking:** `changedBy: 'OWNER' | 'SYSTEM' | 'AI'`
- **Collection:** `menuChangeLog/{tId}/{sId}/{eventId}`
- **Feature-flag gated:** `ENABLE_MENU_OBSERVATION`

### Editor Save Flow
- **`src/database/projects/index.ts`** — `detectAndLogChanges()` compares old vs new project state
- Already detects: price changes, availability changes, active changes, items added/removed
- **Missing:** Does NOT detect name changes, description changes, category reassignment, tag changes

### Extraction Apply Flow
- **`src/lib/extraction/applyChanges.ts`** — `applyExtractionChanges()` writes approved changes
- Already logs `EXTRACTION_APPLIED` MOL event with stats
- **Missing:** Does NOT log per-item corrections (what changed between extracted and approved)

### Re-Extraction Comparison Engine
- **`src/lib/extraction/comparisonEngine.ts`** — Compares existing menu vs new extraction
- Produces `ApplyPlan` with additions, patches, overrides
- **Key insight:** The comparison engine already knows EXACTLY what changed. We just need to log it.

### Nightly Scheduler
- **`functions/src/decisionBlocksScoring.ts`** — Runs at 2:30 AM UTC, 540s timeout
- Already runs: Decision Blocks, Menu Intelligence, Authority Maturation, Menu Drift, Guest Feedback Retention, Subscription Reconciliation, OBP Analytics, Lifecycle Messaging, Special Menu Switching
- **Pattern:** Each task is non-blocking, feature-flag gated, with telemetry logging

---

## 4. Implementation Plan

### 4.1 Architecture: 3 Layers

```
LAYER 1: Capture (Real-time, client-side)
  Owner corrects an extracted item → Log EXTRACTION_CORRECTION to MOL
  
LAYER 2: Aggregate (Nightly, server-side)
  Nightly job reads EXTRACTION_CORRECTION events from last 30 days
  → Aggregates patterns: "price often wrong for handwritten menus"
  → Stores aggregate in extractionLearning/{summary} document
  
LAYER 3: Apply (Per-extraction, server-side)
  Before extraction, read aggregate patterns
  → Inject relevant warnings into extraction prompt
  → "Common errors: prices often misread as X instead of Y"
```

### 4.2 Layer 1: Capture Corrections

#### What to Capture

When owner edits an item AFTER extraction (first save after extraction job completes):

| Field | Capture If Changed | Example |
|-------|-------------------|---------|
| `name` | AI-extracted name ≠ owner-saved name | "Chkn Tikka" → "Chicken Tikka" |
| `price` | AI-extracted price ≠ owner-saved price | "199" → "299" |
| `description` | AI-extracted desc ≠ owner-saved desc | Truncated or garbled |
| `categoryId` | AI-assigned category ≠ owner-moved category | Wrong category assignment |
| `tags` | AI-detected tags ≠ owner-edited tags | Missing "Veg" tag |

#### How to Capture

**Option A (CHOSEN): Piggyback on existing MOL + add new change type**

Add `EXTRACTION_CORRECTION` as a new MOL change type. Log when:
1. First extraction: after `saveFilesToProject()` completes AND owner subsequently edits items
2. Re-extraction: the comparison engine's `ApplyPlan` already contains the diff

**For re-extraction (comparison engine path):**

In `applyExtractionChanges()`, the `ApplyPlan` already contains:
- `patches[]` — items where AI extraction differs from existing
- Each patch has `oldValue` and `newValue`

We log these patches as `EXTRACTION_CORRECTION` events. **Zero additional Firestore reads.**

**For first extraction (owner edits post-extraction):**

This is harder — we need to compare "AI-extracted state" vs "owner-edited state." 

**Solution:** Store a lightweight extraction fingerprint on the item:
- Add `_extractedAt: Timestamp` field to items during first extraction
- When `detectAndLogChanges()` detects a change to an item with `_extractedAt` within last 24h, log as `EXTRACTION_CORRECTION` instead of regular change

#### New MOL Event Type

```typescript
// In src/database/menuChangeLog/index.ts
// Add to existing ChangeType union:
export type ChangeType = 
    | 'PRICE'
    | 'AVAILABILITY'
    | 'ITEM_ACTIVE'
    | 'ITEM_ADDED'
    | 'ITEM_REMOVED'
    | 'PUBLISH'
    | 'EXTRACTION_CORRECTION';  // NEW

// New helper function
export function createExtractionCorrectionEntry(
    projectId: string,
    itemId: string,
    field: 'name' | 'price' | 'description' | 'categoryId' | 'tags',
    extractedValue: any,
    correctedValue: any,
    confidence?: 'high' | 'medium' | 'low',
): MenuChangeLogInput {
    return {
        projectId,
        itemId,
        changeType: 'EXTRACTION_CORRECTION',
        oldValue: { field, extracted: extractedValue, confidence },
        newValue: { field, corrected: correctedValue },
        changedBy: 'OWNER',
    };
}
```

### 4.3 Layer 2: Nightly Aggregation

New task in the nightly scheduler: `processExtractionLearningForAllStores()`

#### What It Does

1. Query `menuChangeLog` for `EXTRACTION_CORRECTION` events from last 30 days
2. Aggregate into patterns:
   - **Price correction rate:** % of extracted prices that were wrong
   - **Name correction rate:** % of extracted names that were wrong  
   - **Common price errors:** e.g., "₹199" misread as "₹99" (missing digit)
   - **Confidence calibration:** Were items marked "high confidence" actually correct?
3. Store aggregate in a single document: `platformSummary/extractionLearning`

#### Firestore Schema

```
platformSummary/extractionLearning
{
    computedAt: Timestamp,
    windowDays: 30,
    totalExtractions: number,
    totalCorrections: number,
    correctionRate: number,          // corrections / total items extracted
    
    byField: {
        name: { corrections: number, total: number, rate: number },
        price: { corrections: number, total: number, rate: number },
        description: { corrections: number, total: number, rate: number },
        categoryId: { corrections: number, total: number, rate: number },
    },
    
    // Confidence calibration (from 10.1)
    confidenceCalibration: {
        high: { total: number, corrected: number, accuracy: number },
        medium: { total: number, corrected: number, accuracy: number },
        low: { total: number, corrected: number, accuracy: number },
    },
    
    // Top correction patterns (max 10)
    topPatterns: Array<{
        field: string,
        pattern: string,     // e.g., "price_digit_missing", "name_abbreviation"
        count: number,
        example?: { extracted: string, corrected: string },
    }>,
}
```

**Why `platformSummary`?** 
- Existing collection, no new collection needed
- Single document, no querying complexity
- Read once per extraction (1 read), updated nightly (1 write)

#### Nightly Job Implementation

```typescript
// functions/src/analytics/extractionLearning.ts

export async function processExtractionLearningForAllStores(): Promise<{
    totalCorrections: number;
    storesProcessed: number;
    readsCount: number;
    writesCount: number;
}> {
    // 1. Read storesSummary (1 read)
    // 2. For each active store: query EXTRACTION_CORRECTION events (1 read per store)
    // 3. Aggregate patterns in memory
    // 4. Write to platformSummary/extractionLearning (1 write)
    // 5. Log telemetry (1 write)
}
```

### 4.4 Layer 3: Apply to Extraction Prompt

In `processMenuImages.ts`, before calling Gemini:

1. Read `platformSummary/extractionLearning` (1 read, cached for session)
2. If correction rate is significant (>5%), add targeted warnings to prompt:

```
QUALITY NOTES FROM PREVIOUS EXTRACTIONS:
- Prices: {rate}% of extracted prices needed correction. Double-check all prices.
- Common issue: {topPattern.pattern} — {topPattern.example}
```

This costs 1 extra Firestore read per extraction job (not per batch). Negligible.

---

## 5. Feature Flags

```typescript
// functions/src/constants/features.ts
ENABLE_EXTRACTION_LEARNING: true,           // Master flag for all 3 layers
ENABLE_EXTRACTION_LEARNING_CAPTURE: true,   // Layer 1: Capture corrections
ENABLE_EXTRACTION_LEARNING_AGGREGATE: true, // Layer 2: Nightly aggregation
ENABLE_EXTRACTION_LEARNING_APPLY: true,     // Layer 3: Apply to prompt

// src/config/features.ts
ENABLE_EXTRACTION_LEARNING: true,           // Client-side (Layer 1 capture)
```

---

## 6. Data Flow

```
CAPTURE (Real-time):
  Owner edits item post-extraction
    ↓
  detectAndLogChanges() detects change to recently-extracted item
    ↓
  Logs EXTRACTION_CORRECTION to menuChangeLog/{tId}/{sId}
    ↓ (debounced, fire-and-forget, feature-flag gated)

AGGREGATE (Nightly at 2:30 AM):
  processExtractionLearningForAllStores()
    ↓
  Reads EXTRACTION_CORRECTION events (30-day window)
    ↓
  Computes correction rates, confidence calibration, top patterns
    ↓
  Writes to platformSummary/extractionLearning (1 doc)

APPLY (Per extraction):
  processMenuImagesLogic()
    ↓
  Reads platformSummary/extractionLearning (1 read)
    ↓
  Injects relevant warnings into Gemini prompt
    ↓
  AI extraction is slightly more accurate
    ↓
  Fewer owner corrections needed
    ↓
  Correction rate decreases over time → COMPOUNDING
```

---

## 7. What This Does NOT Do

- ❌ No fine-tuning of Gemini model (prompt engineering only)
- ❌ No per-store customization (aggregate patterns across ALL stores)
- ❌ No real-time prompt modification (nightly batch only)
- ❌ No UI showing correction patterns to owners
- ❌ No new Firestore collections (uses existing `menuChangeLog` + `platformSummary`)
- ❌ No blocking of extractions based on learning data

---

## 8. Success Criteria

1. Every owner correction post-extraction is logged as `EXTRACTION_CORRECTION`
2. Nightly aggregation produces correction rates and patterns
3. Extraction prompts include relevant quality warnings when correction rate >5%
4. Over 3 months: measurable decrease in correction rate (target: 20% improvement)
5. Zero impact on extraction speed (<100ms added for learning doc read)
6. Total Firebase cost <$0.05/month at 100 stores

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Owner edits unrelated to extraction quality | Only log corrections within 24h of extraction AND for recently-extracted items (has `_extractedAt`) |
| Correction data is too sparse initially | Start with prompt warnings only when >50 corrections accumulated |
| Nightly aggregation adds scheduler time | Non-blocking task, feature-flag gated, with timeout |
| Learning data biased toward specific menu types | Aggregate across ALL stores to reduce bias |
| Prompt injection from correction data | Never inject raw correction text — only structured patterns |

---

## 10. Files to Create/Modify

| File | Action | Change |
|------|--------|--------|
| `src/database/menuChangeLog/index.ts` | MODIFY | Add `EXTRACTION_CORRECTION` type + helper |
| `src/database/projects/index.ts` | MODIFY | In `detectAndLogChanges()`, check `_extractedAt` flag |
| `functions/src/analytics/extractionLearning.ts` | CREATE | Nightly aggregation function |
| `functions/src/decisionBlocksScoring.ts` | MODIFY | Add `processExtractionLearning` task |
| `functions/src/logic/processMenuImages.ts` | MODIFY | Read learning data, inject into prompt |
| `functions/src/logic/saveFilesToProject.ts` | MODIFY | Add `_extractedAt` timestamp to items on first extraction |
| `functions/src/constants/features.ts` | MODIFY | Add learning loop feature flags |
| `src/config/features.ts` | MODIFY | Add client-side feature flag |
| `functions/src/constants/database.ts` | NO CHANGE | Uses existing collections |

**New files:** 1 (`extractionLearning.ts`)  
**Modified files:** 7  
**New Firestore collections:** 0  
**New Firestore documents:** 1 (`platformSummary/extractionLearning`)

---

**Author:** Cascade (Lead Architect)  
**Created:** February 24, 2026
