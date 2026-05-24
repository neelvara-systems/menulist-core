# Canonica — External Workflow Integrations — Firebase

> **Version:** 1.1.1
> **Last Updated:** 2026-05-24
> **Audience:** Developers
> **Firebase Project:** Canonica (separate from MenuList's ecomsai)

---

## §1 — New Collections

### 1.1 — `canonica_integrationEvents`

**Purpose:** Append-only event log. Every governance event that should be delivered to external tools.

**Document path:** `canonica_integrationEvents/{auto-id}`

| Field | Type | Size Est. | Description |
|-------|------|----------|-------------|
| `pId` | string | ~2B | Product ID, always `CN` |
| `eventType` | string | ~30B | Event type identifier |
| `tId` | number | 8B | Tenant ID |
| `sId` | number | 8B | Store ID |
| `severity` | string | ~10B | critical/high/medium/low |
| `payload` | map | ~200-500B | Event-specific data |
| `status` | string | ~10B | pending/processing/delivered/failed |
| `createdAt` | Timestamp | 8B | Creation timestamp |
| `expiresAt` | Timestamp | 8B | Firestore TTL deletion timestamp |

**Estimated doc size:** ~300-600 bytes
**TTL:** 90 days through Firestore TTL. The scheduler no longer performs empty tenant-scoped cleanup queries.

### 1.2 — `canonica_integrationDeliveryLogs`

**Purpose:** Append-only delivery attempt log. One doc per delivery attempt per adapter.

**Document path:** `canonica_integrationDeliveryLogs/{auto-id}`

| Field | Type | Size Est. | Description |
|-------|------|----------|-------------|
| `eventId` | string | ~20B | Reference to integration event |
| `pId` | string | ~2B | Product ID, always `CN` |
| `tId` | number | 8B | Tenant ID |
| `sId` | number | 8B | Store ID |
| `adapter` | string | ~10B | slack/email/linear/github |
| `attempt` | number | 8B | Attempt number (1-3) |
| `status` | string | ~10B | success/failed |
| `statusCode` | number/null | 8B | HTTP status code |
| `error` | string/null | ~0-200B | Error message |
| `durationMs` | number | 8B | Delivery duration |
| `createdAt` | Timestamp | 8B | Attempt timestamp |
| `expiresAt` | Timestamp | 8B | Firestore TTL deletion timestamp |

**Estimated doc size:** ~150-350 bytes
**TTL:** 90 days through Firestore TTL.

### 1.3 — `canonica_integrationRateLimits`

**Purpose:** Compact per-adapter/per-recipient counters for delivery caps.

**Document path:** `canonica_integrationRateLimits/{deterministic-id}`

| Field | Type | Description |
|-------|------|-------------|
| `pId` | string | Always `CN` |
| `tId` | number | Tenant ID |
| `sId` | number | Store ID |
| `adapter` | string | Adapter for per-minute and per-day counters |
| `bucket` | string | Minute/day bucket |
| `recipientHash` | string | Email recipient hash for daily email caps |
| `count` | number | Consumed count |
| `expiresAt` | Timestamp | Firestore TTL deletion timestamp |

**TTL:** 2 hours for adapter-minute counters; 36 hours for adapter-day and email daily counters.

### 1.4 — Integration Config and Health (No New Collection)

**Storage:** `platformSummary/integrationConfig_{tId}_{sId}`

Uses existing `platformSummary` collection. No new collection needed.

**Estimated doc size:** ~500-1000 bytes (all adapter configs combined)

**Health summary:** `platformSummary/integrationHealth_{tId}_{sId}` stores sanitized last-success/last-failure state for owner UI. Raw delivery logs are not read by the settings screen.

---

## §2 — Firestore Indexes

### New Composite Indexes Required

```
Collection: canonica_integrationEvents
  - tId ASC, createdAt DESC
  - status ASC, createdAt ASC   (for retry/cleanup queries)

Collection: canonica_integrationDeliveryLogs
  - eventId ASC, createdAt ASC  (for delivery history per event)
  - tId ASC, adapter ASC, status ASC, createdAt DESC  (for circuit breaker queries)
```

`canonica_integrationRateLimits` uses deterministic document IDs, so no composite index is required.

**Index count:** 4 composite indexes for event/log history only.

**TTL field overrides:** `firestore-canonica.indexes.json` enables TTL on `expiresAt` for `canonica_integrationEvents`, `canonica_integrationDeliveryLogs`, and `canonica_integrationRateLimits`.

---

## §3 — Read/Write Operations Per Flow

### 3.1 — Event Emission (per event)

| Operation | Count | Type | Cost |
|-----------|-------|------|------|
| Write integration event | 1 | Write | $0.0000018 |
| **Total per event** | **1W** | | **~$0.000002** |

### 3.2 — Event Processing (per event, per adapter)

| Operation | Count | Type | Cost |
|-----------|-------|------|------|
| Integration event snapshot | 0 | Trigger payload | no Firestore read |
| Read integration config | 1 | Read | $0.0000006 |
| Consume adapter rate counter | 1R + 1W | Transaction | $0.0000024 |
| Write delivery log (success) | 1 | Write | $0.0000018 |
| Write delivery health summary | 1 | Write | $0.0000018 |
| Update event status | 1 | Write | $0.0000018 |
| **Total per delivery (success)** | **2R + 4W** | | **~$0.000008** |

### 3.3 — Event Processing (with 3 retries, all fail)

| Operation | Count | Type | Cost |
|-----------|-------|------|------|
| Integration event snapshot | 0 | Trigger payload | no Firestore read |
| Read integration config | 1 | Read | $0.0000006 |
| Consume adapter rate counter | 1R + 1W | Transaction | $0.0000024 |
| Write delivery log (attempt 1) | 1 | Write | $0.0000018 |
| Write delivery log (attempt 2) | 1 | Write | $0.0000018 |
| Write delivery log (attempt 3) | 1 | Write | $0.0000018 |
| Write delivery health summary | 1 | Write | $0.0000018 |
| Update event status (failed) | 1 | Write | $0.0000018 |
| **Total per delivery (all fail)** | **2R + 6W** | | **~$0.000012** |

### 3.4 — Nightly Batch Step 13 (per tenant)

| Operation | Count | Type | Cost |
|-----------|-------|------|------|
| Read integration config | 1 | Read | checks whether an adapter is enabled |
| Write digest event | 0-1 | Write | one nightly summary per tenant with activity |
| Write critical coverage alert | 0-1 | Write | only when coverage drops below threshold |
| **Total per tenant per night** | **1R + 0-2W** | | **~$0.000004** |

### 3.5 — Retention Cleanup

Firestore TTL deletes expired integration events, delivery logs, and rate counters. Nightly no longer queries for expired integration records, removing one empty-read source per tenant per night.

---

## §4 — Cost Projection (Monthly)

### Scenario A: 10 Tenants (Early Stage)

| Item | Calculation | Monthly Cost |
|------|-----------|-------------|
| Integration events | 10 tenants × 1.2 events/night × 30 days = 360 writes | <$0.001 |
| Delivery logs + health + rate counters | 360 events × 2 adapters × ~3 writes = 2,160 writes | ~$0.004 |
| Config/rate reads | ~1,100 reads | <$0.001 |
| TTL cleanup | Firestore TTL, no nightly query | no scheduler reads |
| Cloud Functions | 360 invocations | negligible |
| **Total** | | **~$0.01/month** |

### Scenario B: 100 Tenants (Growth Stage)

| Item | Calculation | Monthly Cost |
|------|-----------|-------------|
| Integration events | 100 × 1.2 × 30 = 3,600 writes | ~$0.006 |
| Delivery logs + health + rate counters | ~21,600 writes | ~$0.039 |
| Config/rate reads | ~11,000 reads | ~$0.004 |
| TTL cleanup | Firestore TTL, no nightly query | no scheduler reads |
| Cloud Functions | 3,600 invocations | negligible |
| **Total** | | **~$0.05/month** |

### Scenario C: 1,000 Tenants (Scale)

| Item | Calculation | Monthly Cost |
|------|-----------|-------------|
| Integration events | 1,000 × 1.2 × 30 = 36,000 writes | ~$0.065 |
| Delivery logs + health + rate counters | ~216,000 writes | ~$0.39 |
| Config/rate reads | ~110,000 reads | ~$0.04 |
| TTL cleanup | Firestore TTL, no nightly query | no scheduler reads |
| Cloud Functions | 36,000 invocations | low |
| **Total** | | **~$0.50/month + external SMTP cost** |

### External API Costs

| Service | Cost | Notes |
|---------|------|-------|
| Slack Incoming Webhooks | **FREE** | No limits on incoming webhooks |
| Linear API | **Controlled rollout** | Adapter exists, not self-service until secret lifecycle is ready |
| GitHub REST API | **Controlled rollout** | Adapter exists, not self-service until secret lifecycle is ready |
| Email (SMTP) | **Existing** | Uses same SMTP as lifecycle messaging |

---

## §5 — Cost Optimization Strategies

### 5.1 — Already Optimized

| Strategy | Implementation |
|----------|---------------|
| Append-only events | Write once, never update (cheapest pattern) |
| platformSummary for config | No new collection, reuses existing |
| Config cached per nightly run | Read once per tenant, not once per event |
| Digest-first events | One nightly digest per active tenant; critical coverage alert remains immediate |
| Firestore TTL | Prevents unbounded collection growth without tenant-scoped cleanup queries |
| Delivery health summary | Owner UI reads one compact summary instead of delivery log pages |
| Persistent rate caps | Enforces adapter/minute and email-recipient/day limits |
| Feature flag gate | Zero cost when disabled |
| Event cap (50/tenant/night) | Prevents noisy tenants from inflating costs |

### 5.2 — Future Optimization (if needed at 10K+ tenants)

| Strategy | When to Apply |
|----------|---------------|
| Batch event writes | If >50 events/tenant/night becomes common |
| Config caching in Cloud Function memory | If config reads dominate cost |
| Event deduplication | If duplicate events detected in logs |
| Delivery log sampling | Only log 10% of successful deliveries at scale |

---

## §6 — DAL Functions

### Cloud Functions Side (`functions-canonica/src/integrations/`)

| Function | Collection | Operations |
|----------|-----------|------------|
| `emitIntegrationEvent()` | canonica_integrationEvents | 1W |
| `processIntegrationEvent()` | canonica_integrationEvents + config + deliveryLogs + rateLimits + health | ~2R + 4-6W |
| `getIntegrationConfig()` | platformSummary | 1R |
| `logDeliveryAttempt()` | canonica_integrationDeliveryLogs | 1W |
| `updateEventStatus()` | canonica_integrationEvents | 1W |
| `updateIntegrationHealth()` | platformSummary | 1W |
| `checkCircuitBreaker()` | platformSummary | 1R |
| `updateCircuitBreaker()` | platformSummary | 1W |
| `cleanupExpiredEvents()` | Firestore TTL | 0 scheduler reads |

### Frontend/API Side

| Function | Collection | Operations |
|----------|-----------|------------|
| `GET /api/canonica/integrations` | platformSummary config + health | 2R via Admin SDK |
| `PUT /api/canonica/integrations` | platformSummary config | 1R + 1W via Admin SDK |
| `POST /api/canonica/integrations/test` | platformSummary config + canonica_integrationEvents | 1R + 1W via Admin SDK |
| Settings UI delivery health | platformSummary health | Included in GET; no raw delivery-log reads |

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-24 | 1.1.1 | Added adapter-day counters and `rate_limited` delivery-log status. |
| 2026-05-24 | 1.1.0 | Digest-first delivery, Firestore TTL retention, delivery health summary, test endpoint, and persistent rate caps |
| 2026-03-09 | 1.0.0 | Initial Firebase cost analysis |
