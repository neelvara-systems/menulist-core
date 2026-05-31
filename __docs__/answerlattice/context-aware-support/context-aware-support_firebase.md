# Context-Aware Support — Firebase Cost Analysis

> **Status:** READY FOR IMPLEMENTATION
> **Version:** 1.0.0
> **Created:** 2026-03-08
> **Last Updated:** 2026-03-08
> **Feature Flag:** `ENABLE_ANSWERLATTICE_CONTEXT_AWARE`
> **Audience:** Developers

---

## §1 — Cost Summary

| Metric | Before (No Context) | After (With Context) | Delta |
|--------|---------------------|----------------------|-------|
| Firestore reads per canonical hit | 2-4 | 2-4 | **0** |
| Firestore reads per RAG fallback | 8-12 | 8-12 | **0** |
| Firestore writes per query | 1 (search history) | 1 (search history) | **0** |
| Embedding API calls per canonical hit | 0 | 0 | **0** |
| Embedding API calls per RAG fallback | 1 | 1 | **0** |
| New Firestore collections | — | — | **0** |
| New Firestore documents per query | — | — | **0** |

**Net Firebase cost change: ZERO.**

---

## §2 — Why Zero Additional Cost

### Context Processing Is In-Memory Only

The context payload is:
1. Received in the API request body (no Firestore read)
2. Validated via Zod schema (CPU-only)
3. Tokenized and matched against the entity search index (which is ALREADY loaded for query matching)
4. Applied as bonus scores to the EXISTING entity score map (in-memory addition)

No additional Firestore reads or writes are introduced.

### Existing Read Pattern (Unchanged)

```
Per canonical retrieval attempt:
  1 read: getEntitySearchIndex(tId, sId)     ← EXISTING, shared with context matching
  0-1 read: getLatestRelease(tId, sId)       ← EXISTING, only if no currentVersion
  1-3 reads: getActiveAnswersForEntity(...)   ← EXISTING, for top 3 matched entities
  
Total: 2-4 reads per canonical hit (UNCHANGED)
```

Context boosts are applied to the score map BETWEEN step 1 and step 3. No additional reads needed.

### Potential Cost REDUCTION

Context-aware matching improves entity resolution accuracy, which means:
- **More queries resolve via canonical path** (2-4 reads) instead of RAG path (8-12 reads + embedding API)
- Each query moved from RAG → canonical saves approximately **6-10 Firestore reads + 1 Gemini embedding call**

**Estimated savings per 1,000 queries** (assuming 15% improvement in canonical hit rate):
- 150 queries × 8 avoided reads = **1,200 fewer Firestore reads**
- 150 queries × 1 avoided embedding = **150 fewer Gemini API calls**

---

## §3 — Collections Impact

### Existing Collections (No Changes)

| Collection | Impact | Notes |
|------------|--------|-------|
| `answerlattice_entity_search_index` | READ (existing) | Already loaded for query matching; context matching reuses same data |
| `answerlattice_canonical_answers` | READ (existing) | Already fetched for top entities; context doesn't add reads |
| `answerlattice_releases` | READ (existing) | Already fetched for version; unchanged |
| `aiSearchHistory` | WRITE (existing) | 1 doc per query; add `contextProvided` boolean field |
| Performance logs | WRITE (existing) | Add context fields to existing log entries |

### New Collections

**None.** Context payload is transient and never persisted to Firestore.

---

## §4 — DAL Functions Impact

### Modified (Signature Change Only)

| Function | File | Change |
|----------|------|--------|
| `attemptCanonicalRetrieval()` | `canonicalRetrieval.ts` | `RetrievalContext` now includes optional `context` field |

### No New DAL Functions

Context processing is logic-layer only (in `canonicalRetrieval.ts`). No database operations needed.

---

## §5 — Scaling Analysis

### At 10,000 queries/day (per tenant)

| Scenario | Reads/Day | Writes/Day | Cost/Day |
|----------|-----------|------------|----------|
| Without context (60% canonical hit) | 6,000 canonical + 32,000 RAG = **38,000** | 10,000 (history) | ~₹3.80 |
| With context (75% canonical hit) | 7,500 canonical × 3 + 2,500 RAG × 10 = **47,500** | 10,000 (history) | ~₹4.75 |

Wait — the canonical path reads fewer per query but there are more canonical hits. Let me recalculate:

| Scenario | Canonical Hits | RAG Fallbacks | Total Reads | Cost/Day |
|----------|---------------|---------------|-------------|----------|
| Without context (60% hit rate) | 6,000 × 3 reads = 18,000 | 4,000 × 10 reads = 40,000 | **58,000** | ~₹5.80 |
| With context (75% hit rate) | 7,500 × 3 reads = 22,500 | 2,500 × 10 reads = 25,000 | **47,500** | ~₹4.75 |

**Net savings: ~₹1.05/day per tenant at 10K queries/day** (~18% reduction in Firestore reads)

Plus **1,500 fewer Gemini embedding calls/day** per tenant.

---

## §6 — Performance Impact

### Latency

| Operation | Time | Notes |
|-----------|------|-------|
| Context Zod validation | <0.5ms | Schema validation, string sanitization |
| Context tokenization | <0.5ms | Reuses `answerlatticeTokenize()` |
| Context boost calculation | <1ms | Iterate search index × context fields |
| Total context overhead | **<2ms** | Negligible vs network latency |

### Memory

| Data | Size | Notes |
|------|------|-------|
| Context payload | <1KB | Per-request, garbage collected |
| Context boosts map | <1KB | Per-request, garbage collected |
| No persistent memory | 0 | Context is not cached between requests |

---

## §7 — Monitoring

### Existing Log Fields (Enhanced)

Add to `aiSearchHistory` document (1 boolean field):
```
contextProvided: boolean  // Whether context was included in request
```

Add to performance log entries (2 fields):
```
contextProvided: boolean
contextBoostCount: number  // How many entities received context boosts
```

### Dashboard Metrics (Derived from Logs)

- Context adoption rate: `COUNT(contextProvided=true) / COUNT(*)` 
- Context canonical lift: `hitRate(contextProvided=true) - hitRate(contextProvided=false)`
- These are computed from existing log queries — no new aggregation needed

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-08 | 1.0.0 | Initial Firebase cost analysis |
