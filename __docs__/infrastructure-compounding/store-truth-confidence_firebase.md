# Store Truth Confidence Score — Firebase Cost Analysis

**Feature:** 10.3  
**Status:** 📋 DOCUMENTATION PHASE

---

## Cost Impact: ~$0.05/month per 100 stores

---

## Nightly Computation

### Reads

| Operation | Count | Notes |
|-----------|-------|-------|
| `storesSummary` | 0 (shared) | Already read by scheduler — reuse |
| `extractionLearning` | 1 | Read once, cached for all stores |
| Per-store project data | 0 (shared) | Already loaded by DI/CMI tasks — reuse |
| Authority maturation results | 0 (in-memory) | Reuse task results from same scheduler run |
| Drift metrics results | 0 (in-memory) | Reuse task results from same scheduler run |
| **Total NEW reads per night** | **1** | Only the extractionLearning doc |

**Key optimization:** This task runs AFTER DI, CMI, Authority Maturation, and Menu Drift. It reuses data already loaded by those tasks. The only genuinely new read is `platformSummary/extractionLearning` (1 read).

### Writes

| Operation | Count | Per Night |
|-----------|-------|-----------|
| `platformSummary/storeTruthConfidence` | 1 | Single aggregate document |
| Telemetry log | 1 | Standard task telemetry |
| **Total writes** | **2** | |

### Monthly Cost

| Scale | Reads/month | Writes/month | Read Cost | Write Cost | **Total** |
|-------|------------|-------------|-----------|-----------|-----------|
| 10 stores | 30 | 60 | $0.00002 | $0.00004 | **$0.0001** |
| 100 stores | 30 | 60 | $0.00002 | $0.00004 | **$0.0001** |
| 1,000 stores | 30 | 60 | $0.00002 | $0.00004 | **$0.0001** |

**Cost is CONSTANT regardless of store count** because:
- Only 1 new read per night (extractionLearning doc)
- Only 1 write per night (single aggregate doc)
- All per-store data is reused from other tasks

---

## Document Size Budget

| Stores | Per-Store Data | Total Doc Size | Within Limit? |
|--------|---------------|---------------|---------------|
| 100 | ~200 bytes | ~20 KB | ✅ |
| 500 | ~200 bytes | ~100 KB | ✅ |
| 1,000 | ~200 bytes | ~200 KB | ✅ |
| 4,000 | ~200 bytes | ~800 KB | ✅ (near limit) |
| 5,000+ | ~200 bytes | >1 MB | ❌ Needs sharding |

**Action at 4,000 stores:** Shard into `storeTruthConfidence_0`, `storeTruthConfidence_1`, etc. This is a future concern — well beyond current scale.

---

## Cloud Function Impact

| Metric | Impact |
|--------|--------|
| Added execution time | <30s for 100 stores (in-memory computation, no new reads) |
| Memory | ~5MB additional (store scores in memory) |
| Timeout risk | None — well within 540s total scheduler budget |

---

## Cost Safety

- **Feature flag:** `ENABLE_STORE_TRUTH_CONFIDENCE` — instant disable
- **No new collections:** Uses existing `platformSummary`
- **Constant cost:** Does NOT scale with store count (1 read, 1 write per night)
- **Data reuse:** Shares reads with existing scheduler tasks
- **Cost telemetry:** Logs reads/writes to `systemTelemetry`

---

**Author:** Cascade (Lead Architect)  
**Created:** February 24, 2026
