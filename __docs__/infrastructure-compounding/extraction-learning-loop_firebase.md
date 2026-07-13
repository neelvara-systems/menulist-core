# Extraction Learning Loop — Firebase Cost Analysis

**Feature:** 10.2  
**Status:** Active implementation and cost contract

---

## Cost Impact: Volume-dependent and telemetry-backed

---

## Layer 1: Capture Corrections (Client-Side)

### Writes

| Operation | When | Cost |
|-----------|------|------|
| Compact `MENU_REVISION_SUMMARY` | Owner edits one or more recently extracted fields in default summary mode | Included in the existing one-summary-per-save MOL write |
| Detailed `EXTRACTION_CORRECTION` MOL event | Owner edits a recently extracted field while detailed MOL mode is explicitly enabled | 1 debounced write per corrected field |

Default production mode does not add one write per correction. It stores bounded per-field and per-confidence correction counters inside the existing compact revision summary. Detailed mode remains a focused diagnostic mode with higher write volume.

Illustrative detailed-mode incremental volume at 10 corrected fields per store/month:

| Scale | Detailed writes/month | Cost |
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
| Scan 30-day MOL timestamp window per active store | 500 documents per page | Documents in the rolling window, plus the minimum empty-query charge |
| Filter correction details/summary counters | In memory | 0 additional reads |

Queries use the automatic timestamp index, stable timestamp/document cursors, 500-document pages, and a 50,000-document per-store/run safety budget. They deliberately avoid the unusable `changeType + timestamp` composite assumption: the current nested path uses each store ID as the collection ID, while Firestore manual indexes are defined by collection ID. A store scan is reduced into store-local counters and merged into the platform aggregate only after the full store scan succeeds, so a failed later page cannot leave a partial store contribution in a seemingly successful aggregate.

| Scale | Reads/night | Monthly | Cost |
|-------|------------|---------|------|
| 10 stores at 10 MOL events/store/month | ~100 | ~3,000 | ~$0.002 |
| 100 stores at 10 MOL events/store/month | ~1,000 | ~30,000 | ~$0.018 |
| 1,000 stores at 10 MOL events/store/month | ~10,000 | ~300,000 | ~$0.18 |

### Writes

| Operation | Count | Per Night |
|-----------|-------|-----------|
| Write `platformSummary/extractionLearning` | 1 | 1 write |
| Write telemetry | 1 | 1 write |
| **Total writes** | | **2 writes/night** |

Monthly: 60 writes → $0.00004

---

## Layer 3: Store Truth Confidence (Nightly)

### Reads

| Operation | Count | Per Extraction |
|-----------|-------|---------------|
| Read `platformSummary/extractionLearning` | 1 | 1 read per confidence run |

Current runtime uses this aggregate when computing store-truth confidence. It does not yet inject the aggregate into extraction prompts. At a nightly cadence this is approximately 30 reads/month, independent of extraction count.

---

## Total Monthly Cost

Let `R` be the total number of MOL documents in the current 30-day window across active stores. The nightly aggregator reads approximately `R` documents per run, so the monthly read volume is approximately `30 × R`, plus minimum empty-query reads. Writes remain one aggregate document per run plus telemetry. Use scheduler telemetry rather than a fixed “negligible” claim because MOL event volume and detailed-mode use determine the real cost.

---

## Cost Safety

- **Feature flags:** 3 independent flags (capture, aggregate, apply) — can disable any layer
- **No new collections:** Uses existing `menuChangeLog` + `platformSummary`
- **No new manual indexes:** Readers use the automatic timestamp index and filter validated event types in memory
- **Bounded writes:** Layer 1 only writes for items with `_extractedAt` within 24h
- **Bounded memory:** Layer 2 reads 500-document pages and reduces each page into fixed counters
- **Bounded reads and partial-failure visibility:** Each store scan stops at 50,000 documents, failed stores do not contribute partial counters, and `storesFailed` is persisted/logged
- **Single aggregate doc:** Layer 2 writes 1 document per night, not per store
- **Cost telemetry:** Nightly task logs reads/writes to `systemTelemetry`

---

## Firestore Index Requirements

No manual composite index is required. The nested collection ID is the store ID (`menuChangeLog/{tId}/{sId}`), so an index declared for collection ID `menuChangeLog` cannot serve these child collection queries. Readers constrain and order only on `timestamp`, paginate with the document ID as the stable tie-breaker, and apply `changeType` filtering after runtime shape normalization.

---

**Author:** Cascade (Lead Architect)  
**Created:** February 24, 2026
