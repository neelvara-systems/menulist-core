# Answerlattice — External Workflow Integrations — Firebase

> **Version:** 1.1.11
> **Last Updated:** 2026-06-29
> **Audience:** Developers
> **Firebase Project:** Answerlattice (separate from MenuList's menulist-qa)

---

## §1 — New Collections

### 1.1 — `answerlattice_integrationEvents`

**Purpose:** Append-only event log. Every governance event that should be delivered to external tools.

**Document path:** `answerlattice_integrationEvents/{auto-id}`

| Field | Type | Size Est. | Description |
|-------|------|----------|-------------|
| `pId` | string | ~2B | Product ID, always `AL` |
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

### 1.2 — `answerlattice_integrationDeliveryLogs`

**Purpose:** Append-only delivery attempt log. One doc per delivery attempt per adapter.

**Document path:** `answerlattice_integrationDeliveryLogs/{auto-id}`

| Field | Type | Size Est. | Description |
|-------|------|----------|-------------|
| `eventId` | string | ~20B | Reference to integration event |
| `pId` | string | ~2B | Product ID, always `AL` |
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

### 1.3 — `answerlattice_integrationRateLimits`

**Purpose:** Compact per-adapter/per-recipient counters for delivery caps.

**Document path:** `answerlattice_integrationRateLimits/{deterministic-id}`

| Field | Type | Description |
|-------|------|-------------|
| `pId` | string | Always `AL` |
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

**Health summary:** `platformSummary/integrationHealth_{tId}_{sId}` stores sanitized last-success/last-failure state for owner UI. Raw delivery logs are not read by the settings screen. The settings API maps any stored adapter `lastError` to fixed review copy before returning health to the browser.

---

## §2 — Firestore Indexes

### New Composite Indexes Required

```
Collection: answerlattice_integrationEvents
  - tId ASC, createdAt DESC
  - status ASC, createdAt ASC   (for retry/cleanup queries)

Collection: answerlattice_integrationDeliveryLogs
  - eventId ASC, createdAt ASC  (for delivery history per event)
  - tId ASC, adapter ASC, status ASC, createdAt DESC  (for circuit breaker queries)
```

`answerlattice_integrationRateLimits` uses deterministic document IDs, so no composite index is required.

**Index count:** 4 composite indexes for event/log history only.

**TTL field overrides:** `firestore-answerlattice.indexes.json` enables TTL on `expiresAt` for `answerlattice_integrationEvents`, `answerlattice_integrationDeliveryLogs`, and `answerlattice_integrationRateLimits`.

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

Slack webhook delivery now validates the configured webhook target through the Answerlattice Functions public DNS guard before each delivery attempt. This adds one DNS lookup per attempted Slack delivery and no Firestore reads/writes beyond the existing config read, rate-counter transaction, delivery log, health summary, event-status update, and circuit-breaker writes. GitHub owner/repo path-segment encoding and bounded GitHub/Linear success diagnostics add no Firestore reads/writes, provider calls, retry queue, new collection, schema change, or owner-facing setting.

Delivery-log, event-status, and integration-health failure diagnostics are bounded in Functions logger breadcrumbs only. The intended Firestore writes to `answerlattice_integrationDeliveryLogs`, `answerlattice_integrationEvents`, and `platformSummary/integrationHealth_{tId}_{sId}` keep their existing fields and operation counts. Authenticated settings reads use the shared Answerlattice dashboard `DATA_READ` limiter before permission and `platformSummary` reads. The authenticated test-event route now rate-limits before permission/config/event work and logs unexpected failures with fixed-code bounded tenant/store metadata without changing its 1R + 1W cost shape.

Event-bus cap, success, and failure diagnostics are also bounded in Functions logger breadcrumbs only. The intended Firestore write to `answerlattice_integrationEvents` keeps its existing fields and operation count.

The `processIntegrationEvent` entrypoint now bounds event-processing breadcrumbs to event ID presence/length metadata. It still receives the same Firestore event document and passes the raw event ID to the internal processor for required document updates.

### 3.4 — Nightly Batch Step 13 (per tenant)

| Operation | Count | Type | Cost |
|-----------|-------|------|------|
| Read integration config | 1 | Read | checks whether an adapter is enabled |
| Write digest event | 0-1 | Write | one nightly summary per tenant with activity |
| Write critical coverage alert | 0-1 | Write | only when coverage drops below threshold |
| **Total per tenant per night** | **1R + 0-2W** | | **~$0.000004** |

A failed integration-config read now records `ANSWERLATTICE_INTEGRATION_ADAPTER_CHECK_FAILED` in the scheduler diagnostics and marks only that tenant's workflow integration task failed. It does not add a retry read, event write, delivery attempt, rate-limit counter write, health-summary write, or cleanup query.

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

The workflow event processor still writes and updates the existing integration-event, delivery-log, rate-limit, and integration-health documents with the required event and tenant/store keys. June 28, 2026 processor diagnostic cleanup changed logger breadcrumbs only: invalid-event, delivery-attempt, and no-enabled-adapter logs now use stable failure/event metadata, event ID presence/length metadata, and tenant/store scope booleans instead of raw event IDs or raw `tId/sId` values. Firestore read/write counts, TTL behavior, adapter dispatch, rate limits, and health-summary writes are unchanged.

The circuit-breaker helper still writes the same `platformSummary/integrationConfig_{tId}_{sId}` state fields. June 28, 2026 circuit-breaker diagnostic cleanup changed only the opened breadcrumb, which now logs the stable failure code, adapter, failure count, and tenant/store scope booleans instead of raw `tId/sId` values.

Workflow adapters still write the same delivery-log and health-summary rows through the processor. June 28, 2026 adapter failure-text cleanup changed only the `DeliveryResult.error` values for provider/runtime failures: Slack, email, GitHub, and Linear now return fixed local failure text instead of provider response bodies, GraphQL error messages, SMTP exception text, or fetch exception text. Numeric provider status codes and duration remain available for operations.

Deployment of the June 28, 2026 workflow-delivery target guard was attempted with `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive`. The predeploy build completed, but Firebase failed to read `answerlattice-qa` project metadata through Cloud Resource Manager with HTTP 403: caller does not have permission.

Deployment of the June 28, 2026 delivery-logger diagnostic cleanup was attempted with the same command. The predeploy build completed, but Firebase again failed to read `answerlattice-qa` project metadata through Cloud Resource Manager with HTTP 403: caller does not have permission.

Deployment of the June 28, 2026 event-bus diagnostic cleanup was attempted with the same command. The predeploy build completed, but Firebase again failed to read `answerlattice-qa` project metadata through Cloud Resource Manager with HTTP 403: caller does not have permission.

Deployment of the June 28, 2026 event-processor entrypoint diagnostic cleanup was attempted with the same command. The predeploy build completed, but Firebase again failed to read `answerlattice-qa` project metadata through Cloud Resource Manager with HTTP 403: caller does not have permission.

Deployment of the June 28, 2026 event-processor runtime diagnostic cleanup was attempted with the same command. The predeploy build completed, but Firebase again failed to read `answerlattice-qa` project metadata through Cloud Resource Manager with HTTP 403: caller does not have permission.

Deployment of the June 28, 2026 circuit-breaker diagnostic cleanup was attempted with the same command. The predeploy build completed, but Firebase again failed to read `answerlattice-qa` project metadata through Cloud Resource Manager with HTTP 403: caller does not have permission.

Deployment of the June 28, 2026 adapter failure-text cleanup was attempted with the same command. The predeploy build completed, but Firebase again failed to read `answerlattice-qa` project metadata through Cloud Resource Manager with HTTP 403: caller does not have permission.

Deployment of the June 29, 2026 nightly adapter-check diagnostic cleanup was attempted with the same scoped Answerlattice Functions deploy path after `npm run verify:answerlattice-runtime-truth`, `npm run build` in `functions-answerlattice/`, root `npx tsc --noEmit --incremental false --pretty false`, and `git diff --check` passed. The deploy command `PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" firebase deploy --only functions:answerlattice --project answerlattice-qa --config ../firebase-answerlattice.json` completed the predeploy build, then failed to read `answerlattice-qa` project metadata through Cloud Resource Manager with HTTP 403: caller does not have permission.

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

### Cloud Functions Side (`functions-answerlattice/src/integrations/`)

| Function | Collection | Operations |
|----------|-----------|------------|
| `emitIntegrationEvent()` | answerlattice_integrationEvents | 1W |
| `processIntegrationEvent()` | answerlattice_integrationEvents + config + deliveryLogs + rateLimits + health | ~2R + 4-6W |
| `getIntegrationConfig()` | platformSummary | 1R |
| `logDeliveryAttempt()` | answerlattice_integrationDeliveryLogs | 1W |
| `updateEventStatus()` | answerlattice_integrationEvents | 1W |
| `updateIntegrationHealth()` | platformSummary | 1W |
| `checkCircuitBreaker()` | platformSummary | 1R |
| `updateCircuitBreaker()` | platformSummary | 1W |
| `cleanupExpiredEvents()` | Firestore TTL | 0 scheduler reads |

Event-processor side-effect diagnostics do not add Firestore operations. Failed event-status updates, rate-limit checks, email-recipient-limit checks, and circuit-breaker success/failure records now emit bounded Cloud Functions logs with stable `answerlattice_integration_*` failure codes, source error name/code/status metadata, event ID presence/length, tenant/store scope booleans, adapter/status labels, and counts only. Existing fail-closed behavior and delivery-log/health writes are unchanged.

### Frontend/API Side

| Function | Collection | Operations |
|----------|-----------|------------|
| `GET /api/answerlattice/integrations` | platformSummary config + health | 2R via Admin SDK |
| `PUT /api/answerlattice/integrations` | platformSummary config | 1R + 1W via Admin SDK |
| `POST /api/answerlattice/integrations/test` | platformSummary config + answerlattice_integrationEvents | 1R + 1W via Admin SDK |
| Settings UI delivery health | platformSummary health | Included in GET; no raw delivery-log reads |

The Settings UI sends integration load/save/test calls with no-store cache, same-origin credentials, and manual redirect handling, then parses responses through a 64 KB bounded response reader and requires the documented safe response shape before local state or success copy advances. This does not change the Firestore cost shape; it only rejects cached, redirected, malformed, oversized, rejected, or wrong-shape browser responses.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-06-29 | 1.1.11 | Recorded nightly adapter-config read failures as bounded failed scheduler tasks without adding Firestore operations. |
| 2026-06-29 | 1.1.10 | Bounded event-processor side-effect failure diagnostics without adding Firestore operations or changing delivery/rate-limit behavior. |
| 2026-06-28 | 1.1.9 | Moved integration test route rate limiting before permission/config/event work without changing the 1R + 1W cost shape. |
| 2026-06-28 | 1.1.8 | Bounded workflow adapter provider/runtime failure text without changing delivery logs or health-summary writes. |
| 2026-06-28 | 1.1.7 | Bounded workflow integration circuit-breaker-opened breadcrumbs without changing config summary writes. |
| 2026-06-28 | 1.1.6 | Bounded workflow event processor breadcrumbs without changing delivery, rate-limit, status, or health-summary records. |
| 2026-06-28 | 1.1.5 | Bounded processIntegrationEvent entrypoint breadcrumbs without changing event processing. |
| 2026-06-28 | 1.1.4 | Bounded event-bus diagnostics without changing integration-event writes. |
| 2026-06-28 | 1.1.3 | Bounded delivery logger failure diagnostics without changing delivery-log, event-status, or health-summary writes. |
| 2026-06-28 | 1.1.2 | Added Slack webhook DNS target validation, GitHub owner/repo path-segment encoding, and bounded GitHub/Linear success diagnostics. |
| 2026-05-24 | 1.1.1 | Added adapter-day counters and `rate_limited` delivery-log status. |
| 2026-05-24 | 1.1.0 | Digest-first delivery, Firestore TTL retention, delivery health summary, test endpoint, and persistent rate caps |
| 2026-03-09 | 1.0.0 | Initial Firebase cost analysis |
