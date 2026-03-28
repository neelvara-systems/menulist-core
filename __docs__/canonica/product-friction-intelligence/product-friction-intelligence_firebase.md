# Product Friction Intelligence — Firebase Cost & Operations

> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Feature Flag:** `ENABLE_CANONICA_FRICTION_INTELLIGENCE`

---

## §1 — Collections

### New Collection

| Collection | Firebase Project | Purpose | Retention |
|------------|-----------------|---------|-----------|
| `canonica_frictionDailyStats` | Canonica | Daily per-entity friction metrics | 90 days (nightly cleanup) |

### Existing Collections Used (Read-Only)

| Collection | Purpose |
|------------|---------|
| `canonica_signalEvents` | Source: raw friction signals |
| `canonica_entities` | Source: entity names + types for denormalization |
| `aiSearchHistory` | Source: canonical miss counts with matchedEntityIds |
| `platformSummary` | Target: frictionSnapshot + friction insight docs |

---

## §2 — Document Sizes

| Document | Estimated Size | Notes |
|----------|---------------|-------|
| `canonica_frictionDailyStats/{id}` | ~200 bytes | Small: 10 numeric fields + entity name |
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

| Scale | Nightly Agg | Weekly Insight | Cleanup | Frontend | **Total** |
|-------|-------------|----------------|---------|----------|-----------|
| 10 tenants | $0.30 | $0.08 | $0.02 | ~$0 | **~$0.40** |
| 100 tenants | $3.00 | $0.80 | $0.15 | ~$0 | **~$3.95** |
| 500 tenants | $15.00 | $4.00 | $0.75 | ~$0 | **~$19.75** |
| 1000 tenants | $30.00 | $8.00 | $1.50 | ~$0 | **~$39.50** |

**Cost assessment:** Extremely cheap. Even at 1000 tenants, <$40/month.

---

## §5 — Firestore Indexes Required

```json
{
  "collectionGroup": "canonica_frictionDailyStats",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tId", "order": "ASCENDING" },
    { "fieldPath": "sId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "canonica_frictionDailyStats",
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

canonica_signalEvents ──┐
                        ├──→ frictionAggregation() ──→ canonica_frictionDailyStats
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

### canonica_frictionDailyStats

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

### Frontend DAL: `src/database/canonica/frictionStats.ts`

| Function | Reads | Writes | Purpose |
|----------|-------|--------|---------|
| `getFrictionSnapshot(tId, sId)` | 1 | 0 | Read nightly snapshot for UI |
| `getFrictionInsight(tId, sId)` | 1 | 0 | Read weekly AI insight for UI |

### Backend (Cloud Function): `functions-canonica/src/canonica/frictionAggregation.ts`

| Function | Reads | Writes | Purpose |
|----------|-------|--------|---------|
| `aggregateFrictionStats(tId, sId)` | ~4 queries | ~10-31 docs | Nightly aggregation |
| `cleanupExpiredFrictionStats(tId, sId)` | 1 query | ~0-100 deletes | 90-day TTL |

### Backend (Cloud Function): `functions-canonica/src/canonica/frictionInsight.ts`

| Function | Reads | Writes | Purpose |
|----------|-------|--------|---------|
| `generateFrictionInsight(tId, sId)` | 1 | 1 | Weekly Gemini summary |
