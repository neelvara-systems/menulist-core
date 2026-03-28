# Extraction Learning Loop — Firebase Cost Analysis

**Feature:** 10.2  
**Status:** 📋 DOCUMENTATION PHASE

---

## Cost Impact: ~$0.02/month per 100 stores

---

## Layer 1: Capture Corrections (Client-Side)

### Writes

| Operation | When | Cost |
|-----------|------|------|
| `EXTRACTION_CORRECTION` MOL event | Owner edits item within 24h of extraction | 1 write per corrected field |

**Estimate:** Average 5 corrections per extraction × 2 extractions per store per month = 10 writes/store/month

| Scale | Writes/month | Cost |
|-------|-------------|------|
| 10 stores | 100 | $0.00006 |
| 100 stores | 1,000 | $0.0006 |
| 1,000 stores | 10,000 | $0.006 |

### Reads: 0 additional

Correction capture piggybacks on existing `detectAndLogChanges()` flow. No extra reads needed — the old/new project state is already in memory.

---

## Layer 2: Nightly Aggregation (Server-Side)

### Reads

| Operation | Count | Per Night |
|-----------|-------|-----------|
| Read `storesSummary` | 1 | Already done by scheduler (shared) |
| Query `EXTRACTION_CORRECTION` events per store | 1 per active store | N reads |
| **Total new reads** | | **N reads** (N = active stores with corrections) |

**Optimization:** Only query stores that had extractions in the last 30 days. Most stores won't have any corrections — skip entirely.

**Realistic estimate:** 20% of stores have corrections in any 30-day window.

| Scale | Reads/night | Monthly | Cost |
|-------|------------|---------|------|
| 10 stores | 2 | 60 | $0.00004 |
| 100 stores | 20 | 600 | $0.0004 |
| 1,000 stores | 200 | 6,000 | $0.004 |

### Writes

| Operation | Count | Per Night |
|-----------|-------|-----------|
| Write `platformSummary/extractionLearning` | 1 | 1 write |
| Write telemetry | 1 | 1 write |
| **Total writes** | | **2 writes/night** |

Monthly: 60 writes → $0.00004

---

## Layer 3: Apply to Prompt (Per Extraction)

### Reads

| Operation | Count | Per Extraction |
|-----------|-------|---------------|
| Read `platformSummary/extractionLearning` | 1 | 1 read |

**Optimization:** Cache in memory for the duration of the Cloud Function execution (multiple batches in one extraction share the same read).

| Scale | Extractions/month | Reads | Cost |
|-------|-------------------|-------|------|
| 10 stores | 20 | 20 | $0.00001 |
| 100 stores | 200 | 200 | $0.0001 |
| 1,000 stores | 2,000 | 2,000 | $0.001 |

---

## Total Monthly Cost

| Scale | Layer 1 (Writes) | Layer 2 (Reads + Writes) | Layer 3 (Reads) | **Total** |
|-------|-----------------|-------------------------|----------------|-----------|
| 10 stores | $0.00006 | $0.00008 | $0.00001 | **$0.0002** |
| 100 stores | $0.0006 | $0.0008 | $0.0001 | **$0.002** |
| 1,000 stores | $0.006 | $0.008 | $0.001 | **$0.015** |
| 10,000 stores | $0.06 | $0.08 | $0.01 | **$0.15** |

**Verdict: Negligible at any scale. Even at 10,000 stores, total is $0.15/month.**

---

## Cost Safety

- **Feature flags:** 3 independent flags (capture, aggregate, apply) — can disable any layer
- **No new collections:** Uses existing `menuChangeLog` + `platformSummary`
- **No new indexes:** Queries use existing `changeType` + `timestamp` compound
- **Bounded writes:** Layer 1 only writes for items with `_extractedAt` within 24h
- **Bounded reads:** Layer 2 skips stores without extraction activity
- **Single aggregate doc:** Layer 2 writes 1 document per night, not per store
- **Cost telemetry:** Nightly task logs reads/writes to `systemTelemetry`

---

## Firestore Index Requirements

**Existing index may be needed:**
```
menuChangeLog/{tId}/{sId} — compound index on (changeType, timestamp)
```

Check if this index exists. If not, create it. Single composite index, negligible cost.

---

**Author:** Cascade (Lead Architect)  
**Created:** February 24, 2026
