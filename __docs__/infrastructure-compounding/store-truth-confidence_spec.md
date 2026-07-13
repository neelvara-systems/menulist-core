# Store Truth Confidence Score — Spec + Implementation

**Feature:** 10.3
**Priority:** P1 — Authority Phase
**Status:** Active internal computation with conservative fallbacks
**Depends On:** 10.1 (Extraction Confidence Scoring), 10.2 (Extraction Learning Loop)
**Feeds Into:** 10.4 (Periodic Staleness Check), Future: Authority Dashboard

---

## 1. What Is This?

A composite internal reliability score per store, computed nightly. It answers: **"How confident is MenuList that this store's public data is correct right now?"**

Score is 0-100, never shown to owners, never shown to customers. Used internally for:
- Prioritizing staleness checks (10.4)
- Future: Authority Dashboard metrics for founder
- Future: Flagging low-confidence stores for manual review
- Future: Weighting in cross-store intelligence

---

## 2. Why Does This Matter?

MenuList currently has individual signals scattered across multiple systems:
- **Authority Maturation** tracks owner control usage phases
- **Menu Drift** tracks price/availability change frequency
- **MCE** validates schema correctness at publish time
- **Menu Snapshots** track publish history (menuVersion counter)
- **Extraction confidence** (10.1) tracks AI certainty
- **Correction rate** (10.2) tracks owner correction frequency

But there is **no single composite score** that says "this store's data is reliable." Each signal lives in its own silo.

**Store Truth Confidence** combines all signals into one number. This is the single internal metric for data quality.

---

## 3. Existing Infrastructure (What Feeds This Score)

| Signal | Source | Collection | What It Tells Us |
|--------|--------|-----------|-----------------|
| **Last publish date** | `projects/{tId}/{sId}/{projectId}.lastPublishedAt` | projects | How recently was data confirmed |
| **Menu version** | `projects/{tId}/{sId}/{projectId}.menuVersion` | projects | How many times published (engagement) |
| **Authority maturation phase** | `ownerControlUsage/{docId}` | ownerControlUsage | Phase 1/2/3 — how actively owner uses controls |
| **Menu drift flags** | `menuItemState/{tId}/{sId}/{projectId}/metrics/{itemId}` | menuItemState | Price volatility, availability toggling |
| **MCE pass rate** | Computed at publish time | (in-memory) | Schema correctness at last publish |
| **Extraction confidence** | `projects.files[].extractedData.data.items[].confidence` | projects | AI certainty on extraction |
| **Correction rate** | `platformSummary/extractionLearning` | platformSummary | How much owners correct post-extraction |
| **Schema completeness** | `projects.files[].extractedData.data.items[]` | projects | % items with prices, descriptions, categories |

---

## 4. Implementation Plan

### 4.1 Score Formula

```
StoreTruthConfidence = weighted_average([
    freshnessScore      × 0.30,   // How recent is the data?
    completenessScore   × 0.25,   // How complete is the schema?
    stabilityScore      × 0.20,   // How stable (not volatile) is the data?
    extractionScore     × 0.15,   // How confident was the extraction?
    engagementScore     × 0.10,   // How engaged is the owner?
])
```

### 4.2 Component Scores (0-100 each)

#### Freshness Score (30%)

```typescript
function computeFreshnessScore(lastPublishedAt: Date | null): number {
    if (!lastPublishedAt) return 0;
    
    const daysSincePublish = daysBetween(lastPublishedAt, new Date());
    
    if (daysSincePublish <= 7)   return 100;  // Published this week
    if (daysSincePublish <= 30)  return 80;   // Published this month
    if (daysSincePublish <= 60)  return 60;   // Published in last 2 months
    if (daysSincePublish <= 90)  return 40;   // Published in last 3 months
    if (daysSincePublish <= 180) return 20;   // Published in last 6 months
    return 10;                                 // Older than 6 months
}
```

#### Completeness Score (25%)

```typescript
function computeCompletenessScore(items: any[]): number {
    if (!items.length) return 0;
    
    let score = 0;
    const total = items.length;
    
    // % items with prices
    const withPrices = items.filter(i => i.price != null && i.price !== '').length;
    score += (withPrices / total) * 40;  // 40 points for price completeness
    
    // % items with descriptions
    const withDescs = items.filter(i => {
        if (!i.description) return false;
        const firstDesc = Object.values(i.description)[0] as string || '';
        return firstDesc.length > 10;
    }).length;
    score += (withDescs / total) * 30;  // 30 points for description completeness
    
    // % items in categories
    const withCategories = items.filter(i => i.categoryId || i.category).length;
    score += (withCategories / total) * 20;  // 20 points for categorization
    
    // Has multiple languages
    // (read from project.languages)
    score += 10;  // 10 points base (always has at least 1 language)
    
    return Math.min(100, Math.round(score));
}
```

#### Stability Score (20%)

Based on menu drift metrics. Low volatility = high stability = high confidence.

```typescript
function computeStabilityScore(driftMetrics: DriftSummary | null): number {
    if (!driftMetrics) return 70;  // No drift data = assume stable
    
    // Price changes in 30 days
    const priceChanges = driftMetrics.totalPriceChanges30d || 0;
    const availabilityToggles = driftMetrics.totalAvailabilityToggles30d || 0;
    
    let score = 100;
    
    // Penalize excessive price changes (>10 in 30 days = volatile)
    if (priceChanges > 20) score -= 40;
    else if (priceChanges > 10) score -= 20;
    else if (priceChanges > 5) score -= 10;
    
    // Penalize excessive availability toggles
    if (availabilityToggles > 30) score -= 30;
    else if (availabilityToggles > 15) score -= 15;
    else if (availabilityToggles > 5) score -= 5;
    
    return Math.max(0, score);
}
```

#### Extraction Score (15%)

Uses the measured global correction rate only when it is a finite value from 0 to 1. The current correction ledger does not persist an authoritative total-extraction denominator, so the aggregate stores `correctionRate: null` and this component remains at its neutral score of 80 rather than inventing a rate.

```typescript
function computeExtractionScore(correctionRate: number | null): number {
    let score = 80;
    if (correctionRate === null) return score;
    
    // Penalize high correction rate
    if (correctionRate > 0.20) score -= 30;     // >20% corrections
    else if (correctionRate > 0.10) score -= 15; // >10% corrections
    else if (correctionRate > 0.05) score -= 5;  // >5% corrections
    
    return Math.max(0, Math.min(100, Math.round(score)));
}
```

#### Engagement Score (10%)

Based on Authority Maturation phase.

```typescript
function computeEngagementScore(maturationPhase: string | null): number {
    switch (maturationPhase) {
        case 'phase1_active':  return 90;  // Owner actively managing
        case 'phase2_passive': return 70;  // Owner trusts system
        case 'phase3_dormant': return 30;  // Owner disengaged
        default:               return 50;  // No data
    }
}
```

### 4.3 Where to Store

**Document:** `platformSummary/storeTruthConfidence`

```
platformSummary/storeTruthConfidence
{
    computedAt: Timestamp,
    stores: {
        [sId]: {
            tId: string,
            score: number,              // 0-100 composite
            freshnessScore: number,
            completenessScore: number,
            stabilityScore: number,
            extractionScore: number,
            engagementScore: number,
            lastPublishedAt: Timestamp | null,
            daysSincePublish: number,
            menuVersion: number,
            totalItems: number,
            staleFlag: boolean,         // true if daysSincePublish > 90
        }
    }
}
```

**Why `platformSummary`?**
- Single document, single read for all stores
- Follows existing pattern (`storesSummary`, `extractionLearning`)
- Updated nightly (1 write)
- Read by 10.4 Staleness Check (1 read) — no per-store queries

**Size consideration:** 100 stores × ~200 bytes = ~20KB. 1,000 stores = ~200KB. Well within 1MB limit.

### 4.4 Nightly Job Implementation

New task in `decisionBlocksScoring.ts`:

```typescript
// functions/src/analytics/storeTruthConfidence.ts

export async function computeStoreTruthConfidenceForAllStores(): Promise<{
    processed: number;
    averageScore: number;
    staleCount: number;
    readsCount: number;
    writesCount: number;
}> {
    const db = admin.firestore();
    let reads = 0, writes = 0;
    
    // 1. Read storesSummary (SHARED — already read by scheduler)
    // 2. Read extractionLearning (1 read)
    reads++;
    
    // 3. For each active store:
    //    - Read latest project (already loaded by DI/CMI — SHARE if possible)
    //    - Read authority maturation (already computed — use results)
    //    - Read drift metrics summary (already computed — use results)
    //    - Compute component scores
    //    - Add to stores map
    
    // 4. Write storeTruthConfidence document (1 write)
    writes++;
    
    // 5. Log telemetry (1 write)
    writes++;
    
    return { processed, averageScore, staleCount, reads, writes };
}
```

**KEY OPTIMIZATION:** This task should run AFTER Decision Blocks + Menu Intelligence + Authority Maturation + Menu Drift in the nightly scheduler. It can REUSE data already loaded by those tasks instead of reading again.

**Implementation approach:** Pass results from earlier tasks into this function. The scheduler already holds `storesSummary` and processes each store sequentially — we can accumulate truth confidence data during that loop.

### 4.5 Integration with Nightly Scheduler

In `decisionBlocksScoring.ts`, add AFTER existing tasks:

```typescript
// Store Truth Confidence Score (Infrastructure Compounding 10.3)
if (FUNCTION_FLAGS.ENABLE_STORE_TRUTH_CONFIDENCE) {
    try {
        const taskStart = Date.now();
        logger.info('=== Starting Store Truth Confidence Computation ===');
        const truthResult = await computeStoreTruthConfidenceForAllStores();
        logger.info(`Store Truth Confidence: ${truthResult.processed} stores, avg score: ${truthResult.averageScore.toFixed(1)}`);
        logger.info(`  Stale stores: ${truthResult.staleCount}`);
        logger.info(`  Reads: ${truthResult.readsCount}, Writes: ${truthResult.writesCount}`);
        taskResults.push({ 
            name: 'store_truth_confidence', 
            status: 'success', 
            durationMs: Date.now() - taskStart, 
            details: { 
                processed: truthResult.processed, 
                avgScore: truthResult.averageScore, 
                staleCount: truthResult.staleCount,
                reads: truthResult.readsCount, 
                writes: truthResult.writesCount 
            } 
        });
    } catch (truthError: any) {
        logger.error('Store Truth Confidence computation failed:', truthError.message);
        taskResults.push({ name: 'store_truth_confidence', status: 'failed', error: truthError.message });
    }
}
```

---

## 5. Feature Flags

```typescript
// functions/src/constants/features.ts
ENABLE_STORE_TRUTH_CONFIDENCE: true,  // Nightly computation

// src/config/features.ts
// No client-side flag needed — this is purely server-side
```

---

## 6. Data Flow

```
Nightly Scheduler (2:30 AM UTC)
    ↓
[Decision Blocks + CMI + Authority Maturation + Menu Drift run first]
    ↓
computeStoreTruthConfidenceForAllStores()
    ↓
For each store:
  Read project data (freshness, completeness, extraction confidence)
  Read authority maturation phase (from earlier task results)
  Read drift metrics (from earlier task results)
  Read extraction learning (1 read, cached)
    ↓
  Compute 5 component scores → weighted composite
    ↓
Aggregate all stores → single document
    ↓
Write platformSummary/storeTruthConfidence (1 write)
    ↓
Available for:
  - 10.4 Staleness Check (reads staleFlag)
  - Future: Authority Dashboard
  - Future: Telegram health alerts
```

---

## 7. What This Does NOT Do

- ❌ No score shown to owners
- ❌ No score shown to customers
- ❌ No real-time computation (nightly batch only)
- ❌ No blocking of operations based on score
- ❌ No new Firestore collections (uses `platformSummary`)
- ❌ No per-store document writes (single aggregate doc)
- ❌ No email/notification to owners based on score

---

## 8. Success Criteria

1. Every active store gets a truth confidence score nightly
2. Score correlates with actual data quality (high score = correct data)
3. Stale stores (score <40 or daysSincePublish >90) are flagged
4. Total added scheduler time: <30 seconds for 100 stores
5. Total Firebase cost: <$0.05/month at 100 stores
6. Score is available for 10.4 Staleness Check to consume

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Score doesn't correlate with actual quality | Start with simple formula, calibrate based on owner correction data from 10.2 |
| Single aggregate doc becomes too large | At 10,000 stores × 200 bytes = 2MB, exceeds 1MB limit. Switch to sharded docs at >4,000 stores |
| Nightly job adds too much time | Compute in-memory reusing data from earlier tasks. Target <30s for 100 stores |
| Missing signals for new stores | Default scores (freshness=0, completeness from project, others=neutral). Score improves as data accumulates |
| Score volatility | Weights are designed for stability — freshness dominates (30%), which changes slowly |

---

## 10. Files to Create/Modify

| File | Action | Change |
|------|--------|--------|
| `functions/src/analytics/storeTruthConfidence.ts` | CREATE | Nightly computation function |
| `functions/src/decisionBlocksScoring.ts` | MODIFY | Add truth confidence task to scheduler |
| `functions/src/constants/features.ts` | MODIFY | Add `ENABLE_STORE_TRUTH_CONFIDENCE` flag |
| `functions/src/constants/database.ts` | NO CHANGE | Uses existing `platformSummary` |

**New files:** 1 (`storeTruthConfidence.ts`)  
**Modified files:** 2  
**New Firestore collections:** 0  
**New Firestore documents:** 1 (`platformSummary/storeTruthConfidence`)

---

**Author:** Cascade (Lead Architect)  
**Created:** February 24, 2026
