# Product Friction Intelligence — Firebase Cost & Operations

> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-05-22
> **Feature Flag:** `ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE`

---

## §1 — Collections

### New Collection

| Collection | Firebase Project | Purpose | Retention |
|------------|-----------------|---------|-----------|
| `answerlattice_frictionDailyStats` | Answerlattice | Daily per-entity friction metrics | 90 days (nightly cleanup) |

### Existing Collections Used (Read-Only)

| Collection | Purpose |
|------------|---------|
| `answerlattice_signalEvents` | Source: raw friction signals |
| `answerlattice_entities` | Source: entity names + types for denormalization |
| `aiSearchHistory` | Source: canonical miss counts with matchedEntityIds |
| `platformSummary` | Target: frictionSnapshot + friction insight docs |

---

## §2 — Document Sizes

| Document | Estimated Size | Notes |
|----------|---------------|-------|
| `answerlattice_frictionDailyStats/{id}` | ~200 bytes | Small: 10 numeric fields + entity name |
| `platformSummary/frictionSnapshot_{tId}_{sId}` | ~2-4 KB | Top 10 entities + 5 emerging topics |
| `platformSummary/friction_{tId}_{sId}` | ~1-2 KB | AI-generated summary + structured data |

---

## §3 — Firestore Operations Per Tenant

### Nightly Aggregation (Step 9) — Every Night

| Operation | Count | Cost per 100K |
|-----------|-------|---------------|
| READ: signalEvents (last 24h) | 1 query (~200 docs) | $0.036 |
| READ: aiSearchHistory (last 24h, canonical=false) | 1 query (~100 docs) | $0.018 |
| READ: entities (for name denormalization) | 1 query (~50 docs) | $0.009 |
| READ: frictionDailyStats (last 14 days) | 1 query (~200 docs) | $0.036 |
| WRITE: frictionDailyStats (per entity) | ~10-30 docs | $0.005 |
| WRITE: platformSummary/frictionSnapshot | 1 doc | $0.0002 |

**Total per tenant per night:** ~$0.001
**Total 100 tenants per night:** ~$0.10
**Monthly (100 tenants × 30 days):** ~$3.00

### Weekly Insight (Step 10) — Sundays Only

| Operation | Count | Cost per 100K |
|-----------|-------|---------------|
| READ: platformSummary/frictionSnapshot | 1 doc | $0.00006 |
| WRITE: platformSummary/friction (insight) | 1 doc | $0.0002 |
| Gemini 2.5 Flash call | 1 call | ~$0.001 |

**Total per tenant per week:** ~$0.002
**Total 100 tenants per week:** ~$0.20
**Monthly (100 tenants × 4 weeks):** ~$0.80

### Frontend (GovernanceHub Friction Tab) — Per Page Load

| Operation | Count | Cost |
|-----------|-------|------|
| READ: platformSummary/frictionSnapshot | 1 doc | $0.000006 |
| READ: platformSummary/friction (insight) | 1 doc | $0.000006 |

**Total per page load:** 2 reads = negligible

### Daily Stats Cleanup (extends Step 8) — Every Night

| Operation | Count | Cost |
|-----------|-------|------|
| READ: frictionDailyStats older than 90 days | 1 query | $0.000036 |
| DELETE: expired docs | ~0-100 batch | $0.0005 |

---

## §4 — Total Monthly Cost Projection

Assumption for INR estimates: ₹85/USD placeholder.

| Scale | Nightly Agg | Weekly Insight | Cleanup | Frontend | **Total** |
|-------|-------------|----------------|---------|----------|-----------|
| 10 tenants | ~₹26 | ~₹7 | ~₹2 | ~₹0 | **~₹35** |
| 100 tenants | ~₹255 | ~₹68 | ~₹13 | ~₹0 | **~₹336** |
| 500 tenants | ~₹1,275 | ~₹340 | ~₹64 | ~₹0 | **~₹1,679** |
| 1000 tenants | ~₹2,550 | ~₹680 | ~₹128 | ~₹0 | **~₹3,358** |

**Cost assessment:** Very low because product owners read summary documents and the nightly process is capped. Even at 1000 tenants, the working estimate is roughly ₹3.4k/month.

---

## §5 — Firestore Indexes Required

```json
{
  "collectionGroup": "answerlattice_frictionDailyStats",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tId", "order": "ASCENDING" },
    { "fieldPath": "sId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "answerlattice_frictionDailyStats",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tId", "order": "ASCENDING" },
    { "fieldPath": "sId", "order": "ASCENDING" },
    { "fieldPath": "entityId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "DESCENDING" }
  ]
}
```

---

## §6 — Data Flow Diagram

```
Every Night (3:00 AM UTC):

answerlattice_signalEvents ──┐
                        ├──→ frictionAggregation() ──→ answerlattice_frictionDailyStats
aiSearchHistory ────────┘                          ──→ platformSummary/frictionSnapshot_{tId}_{sId}

Every Sunday (after nightly):

platformSummary/frictionSnapshot ──→ frictionInsight() ──→ platformSummary/friction_{tId}_{sId}
                                        │
                                        └──→ Gemini 2.5 Flash (1 call)

Frontend (on demand):

platformSummary/frictionSnapshot ──┐
                                   ├──→ GovernanceHub Friction Tab
platformSummary/friction ──────────┘
```

---

## §7 — Storage Growth Projection

### answerlattice_frictionDailyStats

| Scale | Entities/tenant | Docs/day | Docs/90 days | Storage |
|-------|----------------|----------|--------------|---------|
| 10 tenants | ~20 | 200 | 18,000 | ~3.6 MB |
| 100 tenants | ~20 | 2,000 | 180,000 | ~36 MB |
| 1000 tenants | ~20 | 20,000 | 1,800,000 | ~360 MB |

**Assessment:** Well within Firestore limits. 90-day TTL keeps growth bounded.

### platformSummary (additional docs)

2 docs per tenant (frictionSnapshot + friction insight). At 1000 tenants = 2000 docs = ~8 MB. Negligible.

---

## §8 — DAL Functions

### Frontend DAL: `src/database/answerlattice/frictionStats.ts`

| Function | Reads | Writes | Purpose |
|----------|-------|--------|---------|
| `getFrictionSnapshot(tId, sId)` | 1 | 0 | Read nightly snapshot for UI |
| `getFrictionInsight(tId, sId)` | 1 | 0 | Read weekly AI insight for UI |

### Backend (Cloud Function): `functions-answerlattice/src/answerlattice/frictionAggregation.ts`

| Function | Reads | Writes | Purpose |
|----------|-------|--------|---------|
| `aggregateFrictionStats(tId, sId)` | ~4 queries | ~10-31 docs | Nightly aggregation |
| `cleanupExpiredFrictionStats(tId, sId)` | 1 query | ~0-100 deletes | 90-day TTL |

### Backend (Cloud Function): `functions-answerlattice/src/answerlattice/frictionInsight.ts`

| Function | Reads | Writes | Purpose |
|----------|-------|--------|---------|
| `generateFrictionInsight(tId, sId)` | 1 | 1 | Weekly Gemini summary |
