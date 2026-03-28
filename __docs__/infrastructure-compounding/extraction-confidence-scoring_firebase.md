# Extraction Confidence Scoring — Firebase Cost Analysis

**Feature:** 10.1  
**Status:** 📋 DOCUMENTATION PHASE

---

## Cost Impact: ZERO ADDITIONAL COST

This feature adds zero extra Firebase operations. All data piggybacks on existing writes.

---

## Firestore Operations

### Reads: 0 additional

No new reads. Confidence data is generated during the existing extraction flow.

### Writes: 0 additional

| Operation | Existing Write | What Changes |
|-----------|---------------|-------------|
| Job document update (`menuImageProcessingJobs/{jobId}`) | Already written on completion | Adds `confidenceSummary` object (~200 bytes) to existing `result` field |
| Project file save (`projects/{tId}/{sId}/{projectId}`) | Already written by `saveFilesToProject()` | Items within `extractedData.data.items[]` now include `confidence` field (~20 bytes/item) |

**Net new writes: 0**  
**Net new reads: 0**  
**Net new deletes: 0**

### Document Size Impact

| Document | Current Size (200 items) | With Confidence | Delta |
|----------|------------------------|-----------------|-------|
| Job document | ~50KB | ~50.2KB | +200 bytes (summary object) |
| Project document | ~100KB | ~104KB | +4KB (20 bytes × 200 items) |

Both well within Firestore's 1MB document limit.

---

## Cloud Function Impact

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Gemini API calls | 1 per batch | 1 per batch | 0 |
| Gemini prompt tokens | ~500 tokens | ~550 tokens | +50 tokens (~$0.000005) |
| Gemini response tokens | ~2000 tokens/batch | ~2200 tokens/batch | +200 tokens (~$0.00001) |
| Function execution time | ~3-10s | ~3-10s | Negligible |
| Memory usage | ~256MB | ~256MB | Negligible |

**Gemini cost increase per extraction: ~$0.000015 — rounds to $0.00**

---

## Monthly Cost Projection

| Scale | Extractions/month | Additional Cost |
|-------|-------------------|----------------|
| 10 stores | ~20 | $0.00 |
| 100 stores | ~200 | $0.00 |
| 1,000 stores | ~2,000 | $0.03 |
| 10,000 stores | ~20,000 | $0.30 |

**Verdict: Negligible at any realistic scale.**

---

## Cost Safety

- **Feature flag:** `ENABLE_EXTRACTION_CONFIDENCE` — instant disable
- **No new collections:** Zero Firestore structural changes
- **No new indexes:** No queries on confidence data
- **Graceful degradation:** If AI doesn't return confidence, defaults used (zero error cost)

---

**Author:** Cascade (Lead Architect)  
**Created:** February 24, 2026
