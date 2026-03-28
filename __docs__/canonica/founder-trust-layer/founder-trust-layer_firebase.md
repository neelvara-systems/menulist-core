# Founder Trust Layer — Firebase Cost Tracking

> **Version:** 1.0.0
> **Status:** DOCUMENTED — Implementation Pending
> **Created:** 2026-03-09
> **Feature Flag:** `ENABLE_CANONICA_TRUST_METRICS`

---

## §1 — Collections Used

### Existing Collections (READ ONLY during nightly batch)

| Collection | Operation | Purpose | Reads/Night/Tenant |
|---|---|---|---|
| `canonica_canonicalAnswers` | Read | Active answers, drift flags | 0 (reused from step 1) |
| `canonica_entities` | Read | Entity map | 0 (reused from step 1) |
| `canonica_signalEvents` | Read | Signal counts by entity | 0 (reused from step 1) |
| `aiSearchHistory` | Read | Coverage + resolution classification | 0-1 (shared with step 4) |

### Existing Collection (WRITE)

| Collection | Operation | Purpose | Writes/Night/Tenant |
|---|---|---|---|
| `platformSummary` | Write (merge) | Store `trustMetrics_{tId}_{sId}` | 1 |

### New Collections

**None.** Zero new collections created.

---

## §2 — Firestore Operations Per Nightly Run

### Per Tenant

| Operation | Count | Source |
|---|---|---|
| Reads (new) | 0-1 | Previous trust metrics doc (for trend) |
| Reads (reused) | ~500-1000 | Already loaded by steps 1 + 4 |
| Writes | 1 | `platformSummary/trustMetrics_{tId}_{sId}` |

### Per Dashboard View

| Operation | Count | Source |
|---|---|---|
| Reads | 1 | `platformSummary/trustMetrics_{tId}_{sId}` |

---

## §3 — Cost Projection

### At 10 Tenants (Launch)

| Operation | Count/Month | Cost |
|---|---|---|
| Nightly writes | 300 (10 × 30) | ~$0.0005 |
| Nightly reads (previous doc) | 300 | ~$0.0001 |
| Dashboard reads | ~300 (10 × ~30 views) | ~$0.0001 |
| **Total** | | **~$0.001/month** |

### At 100 Tenants (Growth)

| Operation | Count/Month | Cost |
|---|---|---|
| Nightly writes | 3,000 | ~$0.005 |
| Nightly reads | 3,000 | ~$0.001 |
| Dashboard reads | ~3,000 | ~$0.001 |
| **Total** | | **~$0.007/month** |

### At 1,000 Tenants (Scale)

| Operation | Count/Month | Cost |
|---|---|---|
| Nightly writes | 30,000 | ~$0.054 |
| Nightly reads | 30,000 | ~$0.018 |
| Dashboard reads | ~30,000 | ~$0.018 |
| **Total** | | **~$0.09/month** |

**Cost is negligible** at any reasonable scale because:
1. Zero new collections — no ongoing storage growth
2. Only 1 write per tenant per night (not per query)
3. Only 1 read per dashboard view (not per metric)
4. All computation reuses data already loaded by existing nightly steps

---

## §4 — Document Size

Trust metrics document: **~1.2 KB** per tenant

```
{
  lastUpdated: 8 bytes
  date: 10 bytes
  coverage: ~60 bytes (5 numbers)
  resolution: ~60 bytes (5 numbers)
  drift: ~50 bytes (4 numbers)
  entityHealth: ~70 bytes (6 numbers)
  topFailingEntities: ~500 bytes (5 entities × ~100 bytes each)
  escalationBreakdown: ~80 bytes (6 numbers)
}
Total: ~838 bytes + Firestore overhead ≈ 1.2 KB
```

Storage cost at 1,000 tenants: ~1.2 MB total. **Negligible.**

---

## §5 — Indexes Required

**None.** No new Firestore indexes required.

The trust metrics doc is accessed by document ID (`trustMetrics_{tId}_{sId}`), not by query.

---

## §6 — DAL Functions

| Function | Operation | Collection | Reads | Writes |
|---|---|---|---|---|
| `getTrustMetrics(tId, sId)` | getDoc | platformSummary | 1 | 0 |

---

## §7 — Cost Optimization Decisions

| Decision | Cost Impact |
|---|---|
| Reuse data from existing nightly steps | Saves 500-1000 reads/tenant/night |
| Single platformSummary doc (not per-metric docs) | Saves 3 writes/tenant/night |
| Nightly aggregation (not real-time) | Saves continuous read/write costs |
| No separate entity health collection | Saves 1 collection + N docs/tenant |
| 7-day trend via `previousRate` field (not historical docs) | Saves 6 historical docs/metric |
