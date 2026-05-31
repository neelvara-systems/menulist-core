# Answerlattice — Guided Workflows: Firebase Cost Tracking

> **Status:** DESIGNED — Ready for Implementation
> **Version:** 1.0.0
> **Created:** 2026-03-08
> **Last Updated:** 2026-03-08
> **Audience:** Developers, Ops
> **Feature Flag:** `ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS`

---

## §1 — Cost Impact Summary

**Additional Firestore cost: $0.00/month**

This feature adds ZERO new Firestore collections and ZERO additional reads per query. All procedure data is embedded in the existing `answerlattice_canonical_answers` document.

---

## §2 — Collections Used

| Collection | Usage | New? | Read/Write Impact |
|------------|-------|------|-------------------|
| `answerlattice_canonical_answers` | Stores procedure data in `content.procedure` field | ❌ Existing | Zero additional reads. Document size increases ~1-2KB per procedure answer |
| `answerlattice_audit_logs` | Logs procedure answer creation/updates | ❌ Existing | Same write pattern as text answers |
| `answerlattice_entity_search_index` | Used during retrieval (unchanged) | ❌ Existing | Zero additional reads |

---

## §3 — Read/Write Analysis Per Operation

### Create Procedure Answer

| Step | Operation | Reads | Writes |
|------|-----------|-------|--------|
| 1 | Validate procedure structure (in-memory) | 0 | 0 |
| 2 | Write canonical answer with procedure | 0 | 1 |
| **Total** | | **0** | **1** |

Same as creating a text-only answer. Zero additional cost.

### Retrieve Procedure Answer (Widget/API Query)

| Step | Operation | Reads | Writes |
|------|-----------|-------|--------|
| 1 | Fetch entity search index | 1 | 0 |
| 2 | Fetch canonical answer (includes procedure) | 1 | 0 |
| **Total** | | **2** | **0** |

Same as retrieving a text-only answer. Zero additional cost.

### Update Procedure Answer

| Step | Operation | Reads | Writes |
|------|-----------|-------|--------|
| 1 | Validate procedure structure (in-memory) | 0 | 0 |
| 2 | Merge update canonical answer | 0 | 1 |
| 3 | Audit log write | 0 | 1 |
| **Total** | | **0** | **2** |

Same as updating a text-only answer. Zero additional cost.

---

## §4 — Document Size Impact

### Text-Only Answer (Current)

```
Base fields (id, tId, sId, title, slug, status, scope, productBinding, validation, signalMetrics, governance, timestamps)
≈ 500 bytes

content.structuredSummary (≤500 chars): ≈ 500 bytes
content.detailedExplanation: ≈ 1,000 bytes
content.edgeCases: ≈ 200 bytes
content.constraints: ≈ 200 bytes

Total: ≈ 2,400 bytes
```

### Procedure Answer (New)

```
Base fields: ≈ 500 bytes
content text fields: ≈ 1,900 bytes (same)
content.procedure.steps (5 steps × 200 bytes): ≈ 1,000 bytes
content.procedure.warnings (2 × 100 bytes): ≈ 200 bytes
content.procedure.prerequisites (2 × 100 bytes): ≈ 200 bytes
answerType field: ≈ 20 bytes

Total: ≈ 3,820 bytes
```

**Additional size per procedure answer: ~1,400 bytes (1.4KB)**

Well within Firestore's 1MB document limit. Even with max 12 steps + 5 warnings + 5 prerequisites, total would be ~6KB.

---

## §5 — Scale Projection

### Per Product (Typical SaaS)

| Metric | Value |
|--------|-------|
| Total canonical answers | ~200 |
| Procedure answers (30%) | ~60 |
| Additional storage per procedure | ~1.4KB |
| Additional total storage | ~84KB |
| Storage cost | Negligible ($0.18/GB/month) |

### At 1,000 Products

| Metric | Value |
|--------|-------|
| Total procedure answers | ~60,000 |
| Additional storage | ~84MB |
| Storage cost | ~$0.015/month |
| Read cost (if all queries hit procedures) | Same as current (2 reads/query) |

---

## §6 — No New Indexes Required

No new Firestore composite indexes needed. The `answerType` field may be used in future queries (e.g., "get all procedure answers"), but for now retrieval is entity-based (existing indexes).

**Future index (if needed):**
```
answerlattice_canonical_answers: tId ASC + sId ASC + answerType ASC + status ASC
```

Not required for v1. Can be added additively when needed.

---

## §7 — Cost Comparison with ChatGPT's Proposal

| Approach | Reads per Query | Collections | Monthly Cost (1M queries) |
|----------|-----------------|-------------|--------------------------|
| ChatGPT: Separate procedures collection | 3+ (answer + procedure + steps) | 3 new | ~$1.50 |
| ChatGPT: Separate warnings/prerequisites | 5+ (above + warnings + prereqs) | 5 new | ~$2.50 |
| **Answerlattice approach: Embedded** | **2 (unchanged)** | **0 new** | **$0.00 additional** |

Embedding procedure data saves 1-3 reads per query, which at scale represents significant cost savings.

---

## §8 — DAL Functions (Existing, Modified)

| Function | File | Change |
|----------|------|--------|
| `addCanonicalAnswer` | `canonicalAnswers.ts` | Add procedure validation before write |
| `updateCanonicalAnswer` | `canonicalAnswers.ts` | Add procedure validation before write |
| `getCanonicalAnswers` | `canonicalAnswers.ts` | No change (procedure data included in doc) |
| `getActiveAnswersForEntity` | `canonicalAnswers.ts` | No change (procedure data included in doc) |
| `getCanonicalAnswerById` | `canonicalAnswers.ts` | No change (procedure data included in doc) |

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-08 | 1.0.0 | Initial Firebase cost tracking |
