# Extraction Confidence Scoring — Spec + Implementation

**Feature:** 10.1  
**Priority:** P1 — Authority Phase  
**Status:** 📋 DOCUMENTATION PHASE  
**Depends On:** Nothing (first in sequence)  
**Feeds Into:** 10.2 (Extraction Learning Loop), 10.3 (Store Truth Confidence)

---

## 1. What Is This?

Per-item confidence scoring on AI extraction output. When MenuList extracts a menu from PDF/image, each item gets a confidence score indicating how certain the system is about the extraction accuracy.

**This is completely invisible to owners.** No UI, no scores shown, no explanations. The confidence data is used internally by:
- 10.2 Learning Loop (to prioritize what to learn from)
- 10.3 Store Truth Confidence (as input to composite score)
- Future: Auto-flagging low-confidence items for internal review

---

## 2. Why Does This Matter?

Currently, the extraction pipeline returns a single `qualityScore` (0-100) for the entire extraction job. This tells us "overall quality" but not "which specific items are uncertain."

**Problem:** An extraction could score 80/100 overall, but have 3 items with wrong prices and 2 items with garbled names. The owner corrects them silently. MenuList learns nothing.

**Solution:** Per-item confidence enables:
1. Knowing WHICH items are risky (before owner corrects)
2. Measuring extraction accuracy over time (by comparing confidence vs corrections)
3. Feeding the learning loop with targeted correction data

---

## 3. Existing Infrastructure (What Already Exists)

### Extraction Pipeline
- **`functions/src/logic/processMenuImages.ts`** — Main AI extraction logic
- **`functions/src/logic/aiResponseUtils.ts`** — Parses + normalizes AI response
- **`functions/src/types/menuExtraction.types.ts`** — `ExtractedMenuData`, `MenuItem`, `QualityScore` types
- **`functions/src/logic/processMenuImagesJob.ts`** — Job orchestration, saves to project

### Quality Scoring (Already Exists)
- `scoreExtractionQuality()` in `processMenuImages.ts` — Scores 4 dimensions:
  - `categoryQuality` (25 pts) — category name length
  - `itemQuality` (10 pts) — items exist
  - `priceQuality` (50 pts) — % items with prices
  - `descriptionQuality` (25 pts) — % items with descriptions >10 chars
- Stored in job document as `result.qualityScore` + `result.qualityDetails`

### Job Document Structure
- Collection: `menuImageProcessingJobs/{jobId}`
- Already stores: `result.combinedData`, `result.qualityScore`, `result.qualityDetails`
- Per-file results: `fileResults.{fileUid}.categoriesCount`, `itemsCount`

### AI Response Format
- AI returns: `{ categories: [...], items: [...], languages: [...] }`
- Each item has: `id`, `name`, `description`, `price`, `categoryId`, `tags`, `attributes`

---

## 4. Implementation Plan

### 4.1 Approach: AI-Generated Confidence (Zero Extra Cost)

**Key insight:** The AI model (Gemini) already "knows" its uncertainty. We modify the extraction prompt to ask Gemini to include a confidence indicator per item. This costs zero extra — same API call, slightly larger response.

### 4.2 Confidence Signals Per Item

| Signal | Source | Meaning |
|--------|--------|---------|
| `nameConfidence` | AI self-assessment | How certain is the AI about the item name? |
| `priceConfidence` | AI self-assessment | How certain about the price? (prices are hardest) |
| `overallConfidence` | Computed | `(nameConfidence + priceConfidence) / 2` |

**Confidence Values:** `high` | `medium` | `low`
- `high` = AI is very confident (clear text, unambiguous)
- `medium` = AI made reasonable interpretation (slightly blurry, handwritten)
- `low` = AI guessed (illegible, unclear structure, no price visible)

### 4.3 Prompt Modification

Add to the existing extraction system prompt:

```
For each item, include a "confidence" object:
{
  "confidence": {
    "name": "high" | "medium" | "low",
    "price": "high" | "medium" | "low"
  }
}

Rules:
- "high": Text is clearly readable, unambiguous
- "medium": Text required interpretation (handwritten, blurry, abbreviated)
- "low": Text is illegible or missing, value is a best guess
- If price is missing entirely, set price confidence to "low"
- If item has attributes/variants with prices, score the attribute prices
```

### 4.4 Type Changes

**File: `functions/src/types/menuExtraction.types.ts`**

```typescript
// ADD to existing MenuItem interface
export interface ExtractionConfidence {
    name: 'high' | 'medium' | 'low';
    price: 'high' | 'medium' | 'low';
}

// EXTEND existing MenuItem
export interface MenuItem {
    // ... existing fields ...
    confidence?: ExtractionConfidence;  // NEW — AI self-assessment
}
```

**File: `functions/src/types/menuProcessingJob.types.ts`**

```typescript
// ADD to result object in MenuImageProcessingJob
result?: {
    // ... existing fields ...
    confidenceSummary?: {  // NEW — aggregate confidence stats
        highConfidenceCount: number;
        mediumConfidenceCount: number;
        lowConfidenceCount: number;
        averageConfidenceScore: number;  // 0-1 (high=1, medium=0.6, low=0.2)
    };
};
```

### 4.5 Code Changes

#### Step 1: Extend AI prompt (`functions/src/logic/processMenuImages.ts`)

In `getParallelProcessingPrompt()`, add confidence instruction to the system prompt.

#### Step 2: Normalize confidence in response parser (`functions/src/logic/aiResponseUtils.ts`)

In `normalizeResponseData()`, extract and normalize `confidence` field from each item. Default to `{ name: 'medium', price: 'medium' }` if AI doesn't return it.

#### Step 3: Compute confidence summary (`functions/src/logic/processMenuImagesJob.ts`)

After redistribution, compute aggregate confidence stats:

```typescript
function computeConfidenceSummary(items: MenuItem[]): ConfidenceSummary {
    let high = 0, medium = 0, low = 0;
    const scoreMap = { high: 1, medium: 0.6, low: 0.2 };
    
    for (const item of items) {
        const conf = item.confidence;
        if (!conf) { medium++; continue; }
        
        const avgConf = (scoreMap[conf.name] + scoreMap[conf.price]) / 2;
        if (avgConf >= 0.8) high++;
        else if (avgConf >= 0.4) medium++;
        else low++;
    }
    
    const total = items.length || 1;
    const avgScore = items.reduce((sum, item) => {
        const conf = item.confidence;
        if (!conf) return sum + 0.6;
        return sum + (scoreMap[conf.name] + scoreMap[conf.price]) / 2;
    }, 0) / total;
    
    return {
        highConfidenceCount: high,
        mediumConfidenceCount: medium,
        lowConfidenceCount: low,
        averageConfidenceScore: Math.round(avgScore * 100) / 100,
    };
}
```

#### Step 4: Store in job document

Add `confidenceSummary` to the job result when saving to Firestore. **No new collection — piggybacks on existing `menuImageProcessingJobs/{jobId}` document.**

#### Step 5: Pass confidence through to project files

In `saveFilesToProject()`, the confidence data flows through `extractedData` → individual items. **Per-item confidence is already embedded in the item data within `extractedData.data.items[]`.**

#### Step 6: Feature flag

```typescript
// In functions/src/constants/features.ts
ENABLE_EXTRACTION_CONFIDENCE: true,  // Default ON — zero cost, piggybacked

// In src/config/features.ts
ENABLE_EXTRACTION_CONFIDENCE: true,  // Default ON — zero cost
```

---

## 5. What This Does NOT Do

- ❌ No UI showing confidence to owners
- ❌ No blocking extraction based on low confidence
- ❌ No new Firestore collections
- ❌ No extra API calls (same Gemini call, slightly larger prompt/response)
- ❌ No re-processing of existing data
- ❌ No real-time triggers

---

## 6. Data Flow

```
Owner uploads menu image
    ↓
processMenuImagesLogic() — existing
    ↓
Gemini AI generates extraction + confidence per item — MODIFIED PROMPT
    ↓
aiResponseUtils.normalizeResponseData() — EXTRACT confidence field
    ↓
processMenuImagesJobLogic() — COMPUTE confidenceSummary
    ↓
Job document gets confidenceSummary — STORED (piggyback existing doc)
    ↓
saveFilesToProject() — confidence embedded in items — NO EXTRA WRITE
    ↓
Items in project have confidence data — AVAILABLE for 10.2 learning loop
```

---

## 7. Success Criteria

1. Every extraction job produces per-item confidence (`name` + `price`)
2. Job document includes `confidenceSummary` with aggregate stats
3. Zero additional Firestore cost (piggybacked on existing writes)
4. Zero UI impact (invisible to owners)
5. Confidence data persists in project items for downstream consumption
6. Feature flag allows instant disable

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| AI doesn't return confidence field | Default to `{ name: 'medium', price: 'medium' }` — graceful fallback |
| Confidence increases response size | Minimal — ~20 bytes per item. For 200-item menu: ~4KB extra |
| AI confidence is inaccurate | Expected initially. 10.2 Learning Loop will calibrate over time |
| Prompt modification breaks extraction | Test with edge cases. Confidence instruction is additive, not disruptive |

---

## 9. Files to Create/Modify

| File | Action | Change |
|------|--------|--------|
| `functions/src/types/menuExtraction.types.ts` | MODIFY | Add `ExtractionConfidence` interface, extend `MenuItem` |
| `functions/src/types/menuProcessingJob.types.ts` | MODIFY | Add `confidenceSummary` to `result` |
| `functions/src/logic/processMenuImages.ts` | MODIFY | Add confidence instruction to system prompt |
| `functions/src/logic/aiResponseUtils.ts` | MODIFY | Extract + normalize `confidence` from AI response |
| `functions/src/logic/processMenuImagesJob.ts` | MODIFY | Compute + store `confidenceSummary` |
| `functions/src/constants/features.ts` | MODIFY | Add `ENABLE_EXTRACTION_CONFIDENCE` flag |
| `src/config/features.ts` | MODIFY | Add `ENABLE_EXTRACTION_CONFIDENCE` flag |

**New files:** 0  
**Modified files:** 7  
**New Firestore collections:** 0  
**New Firestore documents:** 0 (piggybacks on existing job doc)

---

**Author:** Cascade (Lead Architect)  
**Created:** February 24, 2026
