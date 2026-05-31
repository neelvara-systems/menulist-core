# Founder Trust Layer — Firebase Cost Tracking

> **Version:** 1.0.0
> **Status:** IMPLEMENTED
> **Created:** 2026-03-09
> **Feature Flag:** `ENABLE_ANSWERLATTICE_TRUST_METRICS`

---

## §1 — Collections Used

### Existing Collections (READ ONLY during nightly batch)

| Collection | Operation | Purpose | Reads/Night/Tenant |
|---|---|---|---|
| `answerlattice_canonicalAnswers` | Read | Active answers, drift flags | Up to 500 docs |
| `answerlattice_entities` | Read | Active entity map | Up to 1000 docs |
| `answerlattice_signalEvents` | Read | Recent signal counts by entity | Up to 1000 docs |
| `aiSearchHistory` | Read | Coverage + resolution classification | 0 extra docs; reused from coverage KPI result |
| `platformSummary/trustMetrics_{tId}_{sId}` | Read | Previous metric values for trend fields | 1 doc |

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
| Reads (new) | Up to 2501 docs | Active answers + active entities + recent signals + previous trust summary |
| Reads (reused) | Up to 500 docs | Search history rows already loaded by coverage KPI |
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
| Nightly reads (worst-case bounded) | ~750,300 | ~$0.45 |
| Dashboard reads | ~300 (10 × ~30 views) | ~$0.0001 |
| **Total** | | **~$0.45/month (~₹38/month at ₹83/USD)** |

### At 100 Tenants (Growth)

| Operation | Count/Month | Cost |
|---|---|---|
| Nightly writes | 3,000 | ~$0.005 |
| Nightly reads (worst-case bounded) | ~7.5M | ~$4.50 |
| Dashboard reads | ~3,000 | ~$0.001 |
| **Total** | | **~$4.51/month (~₹374/month at ₹83/USD)** |

### At 1,000 Tenants (Scale)

| Operation | Count/Month | Cost |
|---|---|---|
| Nightly writes | 30,000 | ~$0.054 |
| Nightly reads (worst-case bounded) | ~75M | ~$45 |
| Dashboard reads | ~30,000 | ~$0.018 |
| **Total** | | **~$45.07/month (~₹3,741/month at ₹83/USD)** |

**Cost remains bounded and dashboard-cheap** because:
1. Zero new collections — no ongoing storage growth
2. Only 1 write per tenant per night (not per query)
3. Only 1 read per dashboard view (not per metric)
4. All raw reads are bounded and happen in the nightly batch, not on dashboard views

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
| Reuse coverage history rows from Step 4 | Saves up to 500 duplicate `aiSearchHistory` reads/tenant/night |
| Single platformSummary doc (not per-metric docs) | Saves 3 writes/tenant/night |
| Nightly aggregation (not real-time) | Saves continuous read/write costs |
| No separate entity health collection | Saves 1 collection + N docs/tenant |
| 7-day trend via `previousRate` field (not historical docs) | Saves 6 historical docs/metric |
