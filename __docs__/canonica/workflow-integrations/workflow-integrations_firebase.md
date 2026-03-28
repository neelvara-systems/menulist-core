# Canonica — External Workflow Integrations — Firebase

> **Version:** 1.0.0
> **Last Updated:** 2026-03-09
> **Audience:** Developers
> **Firebase Project:** Canonica (separate from MenuList's ecomsai)

---

## §1 — New Collections

### 1.1 — `canonica_integrationEvents`

**Purpose:** Append-only event log. Every governance event that should be delivered to external tools.

**Document path:** `canonica_integrationEvents/{auto-id}`

| Field | Type | Size Est. | Description |
|-------|------|----------|-------------|
| `eventType` | string | ~30B | Event type identifier |
| `tId` | number | 8B | Tenant ID |
| `sId` | number | 8B | Store ID |
| `severity` | string | ~10B | critical/high/medium/low |
| `payload` | map | ~200-500B | Event-specific data |
| `status` | string | ~10B | pending/processing/delivered/failed |
| `createdAt` | Timestamp | 8B | Creation timestamp |

**Estimated doc size:** ~300-600 bytes
**TTL:** 90 days (cleaned up by nightly batch)

### 1.2 — `canonica_integrationDeliveryLogs`

**Purpose:** Append-only delivery attempt log. One doc per delivery attempt per adapter.

**Document path:** `canonica_integrationDeliveryLogs/{auto-id}`

| Field | Type | Size Est. | Description |
|-------|------|----------|-------------|
| `eventId` | string | ~20B | Reference to integration event |
| `tId` | number | 8B | Tenant ID |
| `sId` | number | 8B | Store ID |
| `adapter` | string | ~10B | slack/email/linear/github |
| `attempt` | number | 8B | Attempt number (1-3) |
| `status` | string | ~10B | success/failed |
| `statusCode` | number/null | 8B | HTTP status code |
| `error` | string/null | ~0-200B | Error message |
| `durationMs` | number | 8B | Delivery duration |
| `createdAt` | Timestamp | 8B | Attempt timestamp |

**Estimated doc size:** ~150-350 bytes
**TTL:** 90 days

### 1.3 — Integration Config (No New Collection)

**Storage:** `platformSummary/integrationConfig_{tId}_{sId}`

Uses existing `platformSummary` collection. No new collection needed.

**Estimated doc size:** ~500-1000 bytes (all adapter configs combined)

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

**Index count:** 4 new indexes

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
| Read integration event | 1 | Read | $0.0000006 |
| Read integration config | 1 | Read | $0.0000006 |
| Write delivery log (success) | 1 | Write | $0.0000018 |
| Update event status | 1 | Write | $0.0000018 |
| **Total per delivery (success)** | **2R + 2W** | | **~$0.000005** |

### 3.3 — Event Processing (with 3 retries, all fail)

| Operation | Count | Type | Cost |
|-----------|-------|------|------|
| Read integration event | 1 | Read | $0.0000006 |
| Read integration config | 1 | Read | $0.0000006 |
| Write delivery log (attempt 1) | 1 | Write | $0.0000018 |
| Write delivery log (attempt 2) | 1 | Write | $0.0000018 |
| Write delivery log (attempt 3) | 1 | Write | $0.0000018 |
| Update event status (failed) | 1 | Write | $0.0000018 |
| **Total per delivery (all fail)** | **2R + 4W** | | **~$0.000008** |

### 3.4 — Nightly Batch Step 13 (per tenant)

| Operation | Count | Type | Cost |
|-----------|-------|------|------|
| Write integration events (avg 5 per tenant) | 5 | Write | $0.000009 |
| **Total per tenant per night** | **5W** | | **~$0.00001** |

### 3.5 — TTL Cleanup (nightly, per tenant)

| Operation | Count | Type | Cost |
|-----------|-------|------|------|
| Query expired events | 1 | Read | $0.0000006 |
| Read expired docs (avg 2/day) | 2 | Read | $0.0000012 |
| Delete expired events | 2 | Delete | $0.0000036 |
| Delete expired delivery logs | 4 | Delete | $0.0000072 |
| **Total per tenant per night** | **3R + 6D** | | **~$0.00001** |

---

## §4 — Cost Projection (Monthly)

### Scenario A: 10 Tenants (Early Stage)

| Item | Calculation | Monthly Cost |
|------|-----------|-------------|
| Integration events | 10 tenants × 5 events/night × 30 days = 1,500 writes | $0.003 |
| Delivery logs | 1,500 events × 2 adapters × 1.1 avg attempts = 3,300 writes | $0.006 |
| Config reads | 1,500 events × 1 read = 1,500 reads | $0.001 |
| TTL cleanup | 10 tenants × 30 days × 8 ops = 2,400 ops | $0.004 |
| Cloud Functions | 1,500 invocations × 256MB × 500ms avg = negligible | $0.00 |
| **Total** | | **~$0.02/month** |

### Scenario B: 100 Tenants (Growth Stage)

| Item | Calculation | Monthly Cost |
|------|-----------|-------------|
| Integration events | 100 × 5 × 30 = 15,000 writes | $0.03 |
| Delivery logs | 15,000 × 2 × 1.1 = 33,000 writes | $0.06 |
| Config reads | 15,000 reads | $0.01 |
| TTL cleanup | 100 × 30 × 8 = 24,000 ops | $0.04 |
| Cloud Functions | 15,000 invocations | $0.01 |
| **Total** | | **~$0.15/month** |

### Scenario C: 1,000 Tenants (Scale)

| Item | Calculation | Monthly Cost |
|------|-----------|-------------|
| Integration events | 1,000 × 5 × 30 = 150,000 writes | $0.27 |
| Delivery logs | 150,000 × 2 × 1.1 = 330,000 writes | $0.59 |
| Config reads | 150,000 reads | $0.09 |
| TTL cleanup | 1,000 × 30 × 8 = 240,000 ops | $0.40 |
| Cloud Functions | 150,000 invocations | $0.10 |
| **Total** | | **~$1.45/month** |

### External API Costs

| Service | Cost | Notes |
|---------|------|-------|
| Slack Incoming Webhooks | **FREE** | No limits on incoming webhooks |
| Linear API | **FREE** | Standard plan includes API access |
| GitHub REST API | **FREE** | 5,000 requests/hour for authenticated users |
| Email (SMTP) | **Existing** | Uses same SMTP as lifecycle messaging |

---

## §5 — Cost Optimization Strategies

### 5.1 — Already Optimized

| Strategy | Implementation |
|----------|---------------|
| Append-only events | Write once, never update (cheapest pattern) |
| platformSummary for config | No new collection, reuses existing |
| Config cached per nightly run | Read once per tenant, not once per event |
| TTL cleanup | Prevents unbounded collection growth |
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
| `processIntegrationEvent()` | canonica_integrationEvents + config + deliveryLogs | 2R + 2-4W |
| `getIntegrationConfig()` | platformSummary | 1R |
| `logDeliveryAttempt()` | canonica_integrationDeliveryLogs | 1W |
| `updateEventStatus()` | canonica_integrationEvents | 1W |
| `checkCircuitBreaker()` | platformSummary | 1R |
| `updateCircuitBreaker()` | platformSummary | 1W |
| `cleanupExpiredEvents()` | canonica_integrationEvents + deliveryLogs | nR + nD |

### Frontend Side (`src/database/canonica/integrations.ts`)

| Function | Collection | Operations |
|----------|-----------|------------|
| `getIntegrationConfig()` | platformSummary | 1R |
| `updateIntegrationConfig()` | platformSummary | 1W |
| `getRecentEvents()` | canonica_integrationEvents | 1R (paginated) |
| `getDeliveryLogs()` | canonica_integrationDeliveryLogs | 1R (paginated) |

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-09 | 1.0.0 | Initial Firebase cost analysis |
