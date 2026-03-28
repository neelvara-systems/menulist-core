# Predictive Support — Firebase & Cost Analysis

> **Version:** 1.0.0
> **Last Updated:** 2026-03-10
> **Feature Flag:** `ENABLE_CANONICA_PREDICTIVE_SUPPORT`

---

## §1 — Firestore Collections

### 1.1 — New Collection

| Collection | Purpose | Doc Size | Growth Rate |
|-----------|---------|----------|-------------|
| `canonica_predictiveTriggers` | Individual trigger rules for CRUD | ~500 bytes | ~10-50 per tenant (static after setup) |

### 1.2 — Existing Collections Used

| Collection | Usage | Additional Impact |
|-----------|-------|-------------------|
| `platformSummary` | Cache doc: `predictiveTriggers_{tId}_{sId}` | +1 doc per tenant (~100KB max) |
| `canonica_signalEvents` | suggestion_shown/clicked/dismissed signals | +3 signal types (same collection) |
| `canonica_auditLogs` | Trigger create/update/delete/auto-disable events | Negligible additional writes |

---

## §2 — Firestore Operations Per Action

### 2.1 — Predictive Help API Call (Per Page Visit)

| Operation | Count | Type | Description |
|-----------|-------|------|-------------|
| Load trigger rules | 1 | READ | platformSummary/predictiveTriggers_{tId}_{sId} |
| Resolve canonical answer | 0-1 | READ | Only if trigger matches + entity bound |
| Log suggestion signal | 0-1 | WRITE | Only if suggestion shown (fire-and-forget) |
| **Total per page visit** | **1-3** | **Mixed** | |

### 2.2 — Trigger CRUD (Admin Action)

| Operation | Count | Type | Description |
|-----------|-------|------|-------------|
| Create trigger | 1 | WRITE | canonica_predictiveTriggers/{triggerId} |
| Audit log | 1 | WRITE | canonica_auditLogs |
| **Total per CRUD** | **2** | **WRITE** | |

### 2.3 — Nightly Batch (Step 16)

| Operation | Count | Type | Description |
|-----------|-------|------|-------------|
| Load friction snapshot | 1 | READ | platformSummary/frictionSnapshot_{tId}_{sId} |
| Load existing triggers | 1 | READ | Query canonica_predictiveTriggers |
| Auto-gen suggestions | 0-5 | WRITE | New suggested triggers |
| Load suggestion signals | 1 | READ | Batched signal counts (existing function) |
| Update effectiveness scores | 0-50 | WRITE | Update trigger effectiveness |
| Rebuild cache doc | 1 | WRITE | platformSummary/predictiveTriggers_{tId}_{sId} |
| Audit log entries | 0-5 | WRITE | For auto-disabled triggers |
| **Total per tenant per night** | **~5-65** | **Mixed** | |

---

## §3 — Cost Estimates

### 3.1 — Assumptions

| Parameter | Value |
|-----------|-------|
| Tenants | 10 (early) / 100 (growth) / 1,000 (scale) |
| Page visits per tenant per day | 500 |
| Trigger match rate | 20% (100 suggestions/day/tenant) |
| Suggestion shown rate | 80% of matches (after cooldown) |
| Nightly batch frequency | Once daily |

### 3.2 — Monthly Cost at Scale

| Scale | Reads/Month | Writes/Month | Estimated Cost |
|-------|-------------|--------------|----------------|
| 10 tenants | ~150K | ~30K | ~$0.15 |
| 100 tenants | ~1.5M | ~300K | ~$1.50 |
| 1,000 tenants | ~15M | ~3M | ~$15.00 |

### 3.3 — Cost Breakdown

```
Per tenant per day:
  Reads:  500 page visits × 1 read = 500 reads
          + 100 matches × 1 answer read = 100 reads
          = 600 reads/day/tenant

  Writes: 80 suggestion signals × 1 write = 80 writes
          + nightly batch ~50 writes = 50 writes
          = 130 writes/day/tenant

Per tenant per month:
  Reads:  600 × 30 = 18,000 reads
  Writes: 130 × 30 = 3,900 writes

At 1,000 tenants per month:
  Reads:  18M × $0.036/100K = $6.48
  Writes: 3.9M × $0.108/100K = $4.21
  Total:  ~$10.69/month

Upstash Redis (cooldowns):
  Commands: 500 page visits × 2 commands × 1,000 tenants × 30 days = 30M commands
  Free tier: 10K/day = won't cover
  Paid: $0.20/100K = $60/month at scale

  OPTIMIZATION: Only call Redis if trigger matches (20% rate)
  Actual: 100 matches × 2 × 1,000 × 30 = 6M commands = $12/month
```

### 3.4 — Total Monthly Cost

| Scale | Firestore | Redis | Total |
|-------|-----------|-------|-------|
| 10 tenants | $0.15 | $0.01 | **$0.16** |
| 100 tenants | $1.50 | $1.20 | **$2.70** |
| 1,000 tenants | $10.69 | $12.00 | **$22.69** |

---

## §4 — Firestore Indexes Required

```json
{
  "collectionGroup": "canonica_predictiveTriggers",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tId", "order": "ASCENDING" },
    { "fieldPath": "sId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdOn", "order": "DESCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "canonica_predictiveTriggers",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tId", "order": "ASCENDING" },
    { "fieldPath": "sId", "order": "ASCENDING" },
    { "fieldPath": "source", "order": "ASCENDING" },
    { "fieldPath": "createdOn", "order": "DESCENDING" }
  ]
}
```

---

## §5 — DAL Functions

### 5.1 — New DAL: `src/database/canonica/predictiveTriggers.ts`

| Function | Reads | Writes | Description |
|----------|-------|--------|-------------|
| `getPredictiveTriggers(tId, sId)` | 1 | 0 | Get all triggers for tenant |
| `getSuggestedTriggers(tId, sId)` | 1 | 0 | Get pending suggestions |
| `addPredictiveTrigger(data)` | 0 | 1 | Create new trigger |
| `updatePredictiveTrigger(data)` | 0 | 1 | Update existing trigger |
| `activateTrigger(triggerId)` | 1 | 1 | Validate + activate |
| `disableTrigger(triggerId)` | 0 | 1 | Set status = disabled |
| `deleteTrigger(triggerId)` | 0 | 1 | Hard delete |

### 5.2 — New Lib: `src/lib/canonica/predictiveEngine.ts`

| Function | Reads | Writes | Description |
|----------|-------|--------|-------------|
| `loadTriggerIndex(tId, sId)` | 1 | 0 | Load platformSummary cache |
| `evaluateTriggers(context, tId, sId, userId)` | 1-2 | 0-1 | Full evaluation pipeline |
| `resolveSuggestion(trigger, tId, sId)` | 0-1 | 0 | Resolve canonical answer |

---

## §6 — Optimization Strategies

### 6.1 — Read Optimization
- **platformSummary cache:** 1 read loads ALL triggers (vs N reads from collection)
- **Cooldown-first check:** Only resolve canonical answer if cooldown passes
- **Short-circuit evaluation:** Stop at first matching trigger (priority-sorted)

### 6.2 — Write Optimization
- **Fire-and-forget signals:** Non-blocking, never retry
- **Batch nightly updates:** Effectiveness scores updated in bulk, not per-impression
- **Redis TTL auto-cleanup:** No Firestore writes for cooldown expiry

### 6.3 — Cost Guard Rails
- **Max 200 triggers per tenant:** Bounds platformSummary doc size
- **Max 5 auto-generated suggestions per nightly run:** Prevents suggestion explosion
- **12-month TTL on suggestion signals:** Same as existing signal cleanup
- **Cooldown minimum 1 hour:** Prevents excessive Redis commands
