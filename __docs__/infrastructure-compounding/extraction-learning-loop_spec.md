# Extraction Learning Loop — Spec + Implementation

**Feature:** 10.2
**Priority:** P1 — Authority Phase
**Status:** Active correction-count aggregation; prompt adaptation is not implemented
**Depends On:** 10.1 (Extraction Confidence Scoring)
**Feeds Into:** 10.3 (Store Truth Confidence)

---

## 1. What Is This?

A system that tracks bounded owner corrections after extraction and aggregates correction counts for internal reliability state.

Current runtime records detailed correction events only in detailed MOL mode. Default summary mode carries compact per-field/per-confidence counters in `MENU_REVISION_SUMMARY`, so the nightly aggregator remains functional without adding per-field writes. It does not yet apply patterns to extraction prompts, and it does not claim a correction rate without an authoritative extraction denominator.

---

## 2. Why Does This Matter?

**Current state:** Owner uploads menu → AI extracts → Owner corrects mistakes → Corrections are saved to project → AI learns NOTHING from the corrections.

**Current loop:** Owner uploads menu → extraction stamps source metadata → owner corrections become detailed events or compact summary counters → nightly job aggregates correction counts → internal reliability state consumes only values that are actually measured.

Prompt improvement remains outside the active runtime until a reviewed, tenant-safe denominator and prompt-application contract exist.

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

1. Page through each active store's last 30 days of timestamped MOL events with 500-document pages and a 50,000-document per-store/run budget.
2. Accept either detailed `EXTRACTION_CORRECTION` events or bounded correction counters in `MENU_REVISION_SUMMARY`.
3. Aggregate into store-local counters, merging a store into platform counters only after its complete scan succeeds.
4. Store one internal document at `platformSummary/extractionLearning`.
5. Persist rate/accuracy fields as `null` until total extracted fields by field/confidence are measured authoritatively.

#### Firestore Schema

```
platformSummary/extractionLearning
{
    computedAt: Timestamp,
    windowDays: 30,
    totalCorrections: number,
    correctionRate: null,
    correctionRateStatus: 'unavailable_without_extraction_denominator',
    
    byField: {
        name: { corrections: number, total: null, rate: null },
        price: { corrections: number, total: null, rate: null },
        description: { corrections: number, total: null, rate: null },
        categoryId: { corrections: number, total: null, rate: null },
    },
    
    // Confidence calibration (from 10.1)
    confidenceCalibration: {
        high: { total: null, corrected: number, accuracy: null },
        medium: { total: null, corrected: number, accuracy: null },
        low: { total: null, corrected: number, accuracy: null },
    },
    storesWithCorrections: number,
    storesFailed: number,
}
```

**Why `platformSummary`?** 
- Existing collection, no new collection needed
- Single document, no querying complexity
- Updated once per nightly run; current extraction prompts do not read this document

#### Nightly Job Implementation

```typescript
// functions/src/analytics/extractionLearning.ts

export async function processExtractionLearningForAllStores(): Promise<{
    totalCorrections: number;
    storesProcessed: number;
    storesWithCorrections: number;
    storesFailed: number;
    readsCount: number;
    writesCount: number;
}> {
    // 1. Read storesSummary (1 read)
    // 2. For each active store: page through the 30-day timestamp window
    // 3. Normalize detailed corrections and compact summary counters in memory
    // 4. Write to platformSummary/extractionLearning (1 write)
    // 5. Log telemetry (1 write)
}
```

### 4.4 Prompt-Application Boundary

Prompt application is not part of the current runtime. `processMenuImages.ts` does not read `platformSummary/extractionLearning`, rates remain unavailable without a measured denominator, and no owner-derived raw values are injected into provider prompts. Any future prompt adaptation requires a separate reviewed contract for tenant influence, minimum sample size, poisoning resistance, prompt safety, and measurable rollback.

---

## 5. Feature Flags

```typescript
// functions/src/constants/features.ts
ENABLE_EXTRACTION_LEARNING: true, // Nightly aggregation

// src/config/features.ts
ENABLE_EXTRACTION_LEARNING: true, // Queue-time correction capture
```

---

## 6. Data Flow

```
CAPTURE (Real-time):
  Owner edits item post-extraction
    ↓
  detectAndLogChanges() detects change to recently-extracted item
    ↓
  Logs detailed EXTRACTION_CORRECTION in detailed mode,
  or bounded correction counters in MENU_REVISION_SUMMARY by default
    ↓ (queued, fire-and-forget, feature-flag gated)

AGGREGATE (Nightly at 2:30 AM):
  processExtractionLearningForAllStores()
    ↓
  Reads timestamp-paged MOL events (30-day window)
    ↓
  Computes correction counts by field/confidence
    ↓
  Writes to platformSummary/extractionLearning (1 doc)

CONSUME (Nightly internal reliability):
  storeTruthConfidence reads platformSummary/extractionLearning
    ↓
  Uses a measured correction rate only when one exists
    ↓
  Falls back to a neutral extraction component while rate is unavailable
```

---

## 7. What This Does NOT Do

- ❌ No fine-tuning or extraction-prompt modification
- ❌ No per-store customization (aggregate patterns across ALL stores)
- ❌ No real-time prompt modification (nightly batch only)
- ❌ No UI showing correction patterns to owners
- ❌ No new Firestore collections (uses existing `menuChangeLog` + `platformSummary`)
- ❌ No blocking of extractions based on learning data

---

## 8. Success Criteria

1. Recently extracted name/price corrections survive both detailed and default summary MOL modes.
2. Nightly aggregation accepts legacy detailed events and compact summary counters.
3. Invalid, negative, fractional, or oversized counters do not affect the aggregate.
4. Rates and accuracy remain `null` until an authoritative extraction denominator exists.
5. Extraction prompts perform no additional read and receive no owner-derived raw correction values.
6. Timestamp scans are paginated and cost is reported from actual telemetry rather than a fixed estimate.

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Owner edits unrelated to extraction quality | Only log corrections within 24h of extraction AND for recently-extracted items (has `_extractedAt`) |
| Correction denominator is unavailable | Store counts, keep rates/accuracy `null`, and use a neutral downstream score |
| Nightly aggregation adds scheduler time | Non-blocking task, feature-flag gated, with timeout |
| One tenant produces disproportionate events | Validate store/project scope, bound summary counters, and do not apply the aggregate to prompts |
| Prompt injection from correction data | Current extraction prompts do not consume this aggregate or raw correction values |

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
