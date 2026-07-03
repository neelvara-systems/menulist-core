# Predictive Support — Firebase & Cost Analysis

> **Version:** 1.1.1
> **Last Updated:** 2026-05-24
> **Feature Flag:** `ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT`

---

## §1 — Firestore Collections

### 1.1 — New Collection

| Collection | Purpose | Doc Size | Growth Rate |
|-----------|---------|----------|-------------|
| `answerlattice_predictiveTriggers` | Individual trigger rules for CRUD | ~500 bytes | ~10-50 per tenant (static after setup) |

### 1.2 — Existing Collections Used

| Collection | Usage | Additional Impact |
|-----------|-------|-------------------|
| `platformSummary` | Cache doc: `predictiveTriggers_{tId}_{sId}` | +1 doc per tenant (~100KB max), includes `activeTriggerCount`, `sourceHash`, and pre-resolved suggestion snippets |
| `answerlattice_signalEvents` | suggestion_shown/clicked/dismissed signals | +3 signal types (same collection) |
| `answerlattice_auditLogs` | Trigger create/update/delete/auto-disable events | Negligible additional writes |

---

## §2 — Firestore Operations Per Action

### 2.1 — Widget Config / Capability Check

| Operation | Count | Type | Description |
|-----------|-------|------|-------------|
| Load trigger summary | 0-1 | READ | `platformSummary/predictiveTriggers_{tId}_{sId}` on widget config cache miss only |
| Return capability | 0 | — | `capabilities.predictiveSupport` is true only when active triggers exist |
| **Total** | **0-1** | **READ** | Prevents predictive API calls for tenants with no active triggers |

### 2.2 — Predictive Help API Call (Only When Capability Is Enabled)

| Operation | Count | Type | Description |
|-----------|-------|------|-------------|
| Load trigger rules | 1 | READ | platformSummary/predictiveTriggers_{tId}_{sId} |
| Resolve canonical answer | 0-1 | READ | Usually 0 because nightly cache stores `resolvedSuggestion`; fallback only for stale/legacy summary docs |
| Log suggestion signal | 0-1 | WRITE | Only if suggestion shown (fire-and-forget) |
| **Total per predictive request** | **1-2** | **Mixed** | The widget does not call this endpoint unless config says active triggers exist |

Predictive help diagnostics use fixed runtime failure codes with bounded store metadata and source error name/code/status only; diagnostics do not add Firestore operations or expose raw workspace identifiers.

### 2.3 — Trigger CRUD (Admin Action)

| Operation | Count | Type | Description |
|-----------|-------|------|-------------|
| Create trigger | 1 | WRITE | answerlattice_predictiveTriggers/{triggerId} |
| Audit log | 1 | WRITE | answerlattice_auditLogs |
| **Total per CRUD** | **2** | **WRITE** | |

### 2.4 — Nightly Batch (Step 16)

| Operation | Count | Type | Description |
|-----------|-------|------|-------------|
| Load friction snapshot | 1 | READ | platformSummary/frictionSnapshot_{tId}_{sId} |
| Load existing triggers | 1 | READ | Query answerlattice_predictiveTriggers |
| Auto-gen suggestions | 0-5 | WRITE | New suggested triggers |
| Load answer snippets for active trigger entities | 0-N | READ | Bounded `array-contains-any` chunks, only for active entity-bound triggers |
| Load suggestion signals | 1 | READ | Batched signal counts (existing function) |
| Update effectiveness scores | 0-50 | WRITE | Update trigger effectiveness |
| Rebuild cache doc | 0-1 | WRITE | Skips write when `sourceHash` is unchanged |
| Audit log entries | 0-5 | WRITE | For auto-disabled triggers |
| **Total per tenant per night** | **~4-65** | **Mixed** | Higher only when active trigger/entity coverage is large |

---

## §3 — Cost Estimates

### 3.1 — Assumptions

| Parameter | Value |
|-----------|-------|
| Tenants | 10 (early) / 100 (growth) / 1,000 (scale) |
| Page visits per tenant per day | 500 |
| Widget config cache misses per tenant per day | 100 |
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
  Reads:  100 config cache misses × 1 summary read = 100 reads
          + 100 predictive requests × 1 summary read = 100 reads
          + answer fallback reads are usually 0 because summary stores resolvedSuggestion
          = ~200 reads/day/tenant

  Writes: 80 suggestion signals × 1 write = 80 writes
          + nightly batch ~0-50 writes = 50 writes worst case
          = ~80-130 writes/day/tenant

Per tenant per month:
  Reads:  200 × 30 = 6,000 reads
  Writes: 130 × 30 = 3,900 writes

At 1,000 tenants per month:
  Reads:  6M × $0.036/100K = $2.16
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
| 1,000 tenants | ~$6.37 worst case | $12.00 | **~$18.37** |

---

## §4 — Firestore Indexes Required

```json
{
  "collectionGroup": "answerlattice_predictiveTriggers",
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
  "collectionGroup": "answerlattice_predictiveTriggers",
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

### 5.1 — New DAL: `src/database/answerlattice/predictiveTriggers.ts`

| Function | Reads | Writes | Description |
|----------|-------|--------|-------------|
| `getPredictiveTriggers(tId, sId)` | 1 | 0 | Get all triggers for tenant |
| `getSuggestedTriggers(tId, sId)` | 1 | 0 | Get pending suggestions |
| `addPredictiveTrigger(data)` | 0 | 1 | Create new trigger |
| `updatePredictiveTrigger(data)` | 0 | 1 | Update existing trigger |
| `activateTrigger(triggerId)` | 1 | 1 | Validate + activate |
| `disableTrigger(triggerId)` | 0 | 1 | Set status = disabled |
| `deleteTrigger(triggerId)` | 0 | 1 | Hard delete |

### 5.2 — New Lib: `src/lib/answerlattice/predictiveEngine.ts`

| Function | Reads | Writes | Description |
|----------|-------|--------|-------------|
| `loadTriggerIndex(tId, sId)` | 1 | 0 | Load platformSummary cache |
| `evaluateTriggers(context, tId, sId, userId)` | 1-2 | 0-1 | Full evaluation pipeline |
| `resolveSuggestion(trigger, tId, sId)` | 0-1 | 0 | Resolve canonical answer |

---

## §6 — Optimization Strategies

### 6.1 — Read Optimization
- **platformSummary cache:** 1 read loads ALL triggers (vs N reads from collection)
- **Remote capability gate:** widget only calls predictive API when the config endpoint confirms active triggers
- **Negative trigger cache:** empty/no-active trigger summaries are cached for 5 minutes per warm server instance
- **Pre-resolved suggestions:** nightly stores canonical answer snippets in the trigger summary, removing the usual runtime answer read
- **Targeted answer lookup:** nightly loads answers only for active trigger entity IDs, not every active answer in the workspace
- **Unchanged-write skip:** cache write is skipped when `sourceHash` is unchanged
- **Bounded diagnostics:** nightly sync failures log fixed `ANSWERLATTICE_PREDICTIVE_TRIGGER_*` codes with source error metadata and scope booleans, not raw exception text or raw tenant/store IDs
- **Cooldown-first check:** Only resolve canonical answer if cooldown passes
- **Short-circuit evaluation:** Stop at first matching trigger (priority-sorted)

### 6.2 — Write Optimization
- **Fire-and-forget signals:** Non-blocking, never retry
- **Batch nightly updates:** Effectiveness scores updated in bulk, not per-impression
- **Redis TTL auto-cleanup:** No Firestore writes for cooldown expiry

### 6.3 — Cost Guard Rails
- **Max 500 triggers per tenant:** Bounds platformSummary doc size
- **Max 5 auto-generated suggestions per nightly run:** Prevents suggestion explosion
- **12-month TTL on suggestion signals:** Same as existing signal cleanup
- **Cooldown minimum 1 hour:** Prevents excessive Redis commands
- **Fail closed when Redis missing:** avoids repeated proactive prompts if cooldown storage is not configured

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-24 | 1.1.1 | Added 5-minute negative trigger-index cache for tenants with no active triggers. |
| 2026-05-24 | 1.1.0 | Added widget capability gating, summary-backed resolved suggestions, targeted answer lookup, unchanged-write skip, and updated cost model. |
| 2026-03-10 | 1.0.0 | Initial Firebase and cost analysis. |
