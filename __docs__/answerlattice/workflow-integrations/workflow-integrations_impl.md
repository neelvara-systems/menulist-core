# Answerlattice — External Workflow Integrations — Implementation

> **Version:** 1.1.11
> **Last Updated:** 2026-06-29
> **Audience:** Developers
> **Feature Flag:** `ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS` (client + CF)

---

## §1 — System Position Inside Answerlattice

```
┌─────────────────────────────────────────────────────────┐
│                  ANSWERLATTICE ARCHITECTURE                   │
│                                                         │
│  Pillar 1: Ontology ──► Pillar 2: Answers               │
│       │                      │                          │
│       ▼                      ▼                          │
│  Pillar 3: Drift    Pillar 4: Signal Mutation           │
│       │                      │                          │
│       └──────────┬───────────┘                          │
│                  ▼                                       │
│         Governance Events                                │
│                  │                                       │
│                  ▼                                       │
│  ┌───────────────────────────┐                          │
│  │  INTEGRATION EVENT BUS    │ ◄── THIS FEATURE         │
│  │  (Pillar 5 Extension)     │                          │
│  └───────────┬───────────────┘                          │
│              │                                           │
│    ┌─────────┼─────────┬──────────┐                     │
│    ▼         ▼         ▼          ▼                     │
│  Slack    Email     Linear*    GitHub*                   │
└─────────────────────────────────────────────────────────┘
```

This is an **extension of Pillar 5 (API & Integration Layer)**. It adds outbound event delivery without modifying Pillars 1-4. Owner-facing production setup supports Slack and email. Linear and GitHub adapters exist in the Cloud Functions registry for controlled rollout only until their secret-management UX is completed.

---

## §2 — File Structure

```
# Cloud Functions (Answerlattice Firebase project)
functions-answerlattice/src/
├── integrations/
│   ├── types.ts                    # Integration event types + adapter interface
│   ├── eventBus.ts                 # emitIntegrationEvent() — writes to Firestore
│   ├── eventProcessor.ts           # Cloud Function: onCreate trigger → dispatch, rate caps, health
│   ├── configStore.ts              # Read integration config for tenant
│   ├── rateLimiter.ts              # Persistent compact adapter/email delivery counters
│   ├── adapters/
│   │   ├── IAdapter.ts             # Adapter interface (send + formatPayload)
│   │   ├── slackAdapter.ts         # Slack Incoming Webhook adapter
│   │   ├── emailAdapter.ts         # SMTP adapter (reuses nodemailer)
│   │   ├── linearAdapter.ts        # Linear GraphQL API adapter
│   │   └── githubAdapter.ts        # GitHub REST API adapter
│   └── deliveryLogger.ts           # TTL delivery logs + compact health summary
├── constants/
│   ├── database.ts                 # + ANSWERLATTICE_INTEGRATION_EVENTS, ANSWERLATTICE_INTEGRATION_DELIVERY_LOGS
│   └── features.ts                 # + ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS
└── index.ts                        # + processIntegrationEvent export

# Frontend (Next.js — Answerlattice dashboard)
src/
├── types/answerlattice/index.ts         # + AnswerlatticeIntegrationEvent, AnswerlatticeIntegrationConfig types
├── database/answerlattice/
├── app/api/answerlattice/integrations/route.ts          # Slack/email settings API
├── app/api/answerlattice/integrations/test/route.ts     # Queues one controlled test event
├── components/templates/answerlattice/
│   └── AnswerlatticeSettings.tsx        # Settings UI (enable/disable, config, health, test)
└── config/features.ts              # + ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS
```

`AnswerlatticeSettings.tsx` validates workflow-integration route responses through a 64 KB bounded JSON reader before updating local form state, health state, or success copy. `GET/PUT /api/answerlattice/integrations` responses must contain the safe Slack/email config, event type arrays, default filters, and health object. `POST /api/answerlattice/integrations/test` must return a non-empty `eventId`. Malformed, oversized, rejected, or wrong-shape responses log fixed `answerlattice_settings_response_*` diagnostics and keep fixed owner-facing failure copy.

---

## §3 — Data Model

### 3.1 — Integration Events Collection

**Collection:** `answerlattice_integrationEvents` (Answerlattice Firestore)
**Write pattern:** Append-only. Write once, never update.
**Triggered by:** Nightly batch steps + governance UI actions

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | Auto-generated doc ID |
| `pId` | string | Always `AL` |
| `eventType` | string | One of 7 event types (see §4) |
| `tId` | number | Tenant ID |
| `sId` | number | Store ID |
| `severity` | string | `'critical' \| 'high' \| 'medium' \| 'low'` |
| `payload` | map | Event-specific data (varies by type) |
| `status` | string | `'pending' \| 'processing' \| 'delivered' \| 'failed'` |
| `createdAt` | Timestamp | When event was created |
| `expiresAt` | Timestamp | Firestore TTL deletion timestamp |

**Index:** `tId ASC, createdAt DESC` (for tenant event history query)
**TTL:** 90 days (Firestore TTL; no nightly cleanup query)

### 3.2 — Integration Delivery Logs Collection

**Collection:** `answerlattice_integrationDeliveryLogs` (Answerlattice Firestore)
**Write pattern:** Append-only. One doc per delivery attempt.

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | Reference to integration event |
| `pId` | string | Always `AL` |
| `tId` | number | Tenant ID |
| `sId` | number | Store ID |
| `adapter` | string | `'slack' \| 'email' \| 'linear' \| 'github'` |
| `attempt` | number | 1, 2, or 3 |
| `status` | string | `'success' \| 'failed' \| 'rate_limited'` |
| `statusCode` | number/null | HTTP status code (if applicable) |
| `error` | string/null | Error message (if failed) |
| `durationMs` | number | Delivery time in milliseconds |
| `createdAt` | Timestamp | When delivery was attempted |
| `expiresAt` | Timestamp | Firestore TTL deletion timestamp |

**Index:** `eventId ASC, createdAt ASC` (for delivery history per event)
**TTL:** 90 days

### 3.2.1 — Integration Rate Limit Counters

**Collection:** `answerlattice_integrationRateLimits`
**Write pattern:** deterministic document IDs, compact counters, Firestore TTL.

Counters enforce:
- per-tenant/per-adapter minute caps
- per-tenant/per-adapter daily caps
- per-recipient daily email caps

The processor reads/writes these docs by direct ID inside transactions. No collection scans are used.

### 3.3 — Integration Config (per-tenant)

**Storage:** `platformSummary/integrationConfig_{tId}_{sId}` (Answerlattice Firestore)
**Pattern:** Same as existing branding config — stored on platformSummary, no new collection.

| Field | Type | Description |
|-------|------|-------------|
| `slack.enabled` | boolean | Slack integration active |
| `slack.webhookUrl` | string | Slack Incoming Webhook URL |
| `slack.channel` | string | Channel name (display only, webhook determines actual channel) |
| `slack.eventFilters` | string[] | Which event types to deliver |
| `email.enabled` | boolean | Email integration active |
| `email.recipients` | string[] | Email addresses (max 5) |
| `email.eventFilters` | string[] | Which event types to deliver |
| `linear.*` | map | Controlled-rollout adapter config. Not exposed in owner settings until secret management is production-ready. |
| `github.*` | map | Controlled-rollout adapter config. Not exposed in owner settings until secret management is production-ready. |
| `circuitBreaker` | map | Per-adapter: `{ consecutiveFailures: number, disabledAt: Timestamp \| null }` |
| `modifiedOn` | Timestamp | Last config change |

**Why platformSummary?** Follows existing Answerlattice pattern (branding, coverage KPI). No new collection. Config is small (<2KB). Read once per event dispatch.

### 3.4 — Delivery Health Summary

**Storage:** `platformSummary/integrationHealth_{tId}_{sId}`

This doc stores sanitized last attempt/success/failure state per adapter. The owner settings UI reads this through the server API, so it never queries raw delivery logs. The API keeps stored delivery error text server-side and returns a fixed `Delivery needs review.` marker when an adapter has a last error, preserving the dashboard status signal without exposing provider/runtime text.

The settings GET route applies the shared Answerlattice dashboard `DATA_READ` limiter before permission and `platformSummary` reads. Load/save route failures use fixed runtime diagnostic codes with bounded tenant/store metadata. The controlled test-event route applies its workspace limiter before permission, config reads, and event writes; unexpected failures use fixed-code bounded tenant/store diagnostics.

---

## §4 — Event Types (Complete Schema)

### 4.1 — drift_detected

```typescript
{
  eventType: 'drift_detected',
  severity: 'high',
  payload: {
    answerId: string,
    answerTitle: string,
    driftClass: 'version_mismatch' | 'signal_anomaly' | 'scope_conflict' | 'deprecated_entity',
    driftReason: string,
    entityName: string,
    entityType: string,
  }
}
```

### 4.2 — mutation_proposed

```typescript
{
  eventType: 'mutation_proposed',
  severity: 'high',
  payload: {
    proposalId: string,
    mutationType: 'content_refinement' | 'scope_adjustment' | 'version_update' | 'new_answer_required',
    targetAnswerId: string | null,  // null for new_answer_required
    entityNames: string[],
    signalCount: number,
    confidenceScore: number,
  }
}
```

### 4.3 — knowledge_gap_detected

```typescript
{
  eventType: 'knowledge_gap_detected',
  severity: 'high',
  payload: {
    entityName: string,
    entityType: string,
    fallbackCount: number,  // How many times RAG fallback triggered
    windowDays: number,     // Observation window (default 7)
    sampleQueries: string[],  // Up to 3 example queries (anonymized)
  }
}
```

### 4.4 — coverage_drop

```typescript
{
  eventType: 'coverage_drop',
  severity: 'critical',
  payload: {
    currentRate: number,    // e.g., 0.55
    previousRate: number,   // e.g., 0.72
    threshold: number,      // e.g., 0.60
    totalQueries: number,
    canonicalHits: number,
  }
}
```

### 4.5 — article_approved

```typescript
{
  eventType: 'article_approved',
  severity: 'medium',
  payload: {
    answerId: string,
    answerTitle: string,
    mutationType: string,
    approvedBy: string,
    entityNames: string[],
  }
}
```

### 4.6 — ai_failure_recurring

```typescript
{
  eventType: 'ai_failure_recurring',
  severity: 'high',
  payload: {
    entityName: string,
    entityType: string,
    failureCount: number,
    windowDays: number,
    commonQueries: string[],  // Up to 3 (anonymized)
  }
}
```

### 4.7 — nightly_summary

```typescript
{
  eventType: 'nightly_summary',
  severity: 'low',
  payload: {
    tenantsProcessed: number,
    driftDetected: number,
    driftCleared: number,
    proposalsCreated: number,
    coverageRate: number,
    signalsArchived: number,
    errors: string[],
  }
}
```

---

## §5 — Component Details

### 5.1 — Event Bus (`functions-answerlattice/src/integrations/eventBus.ts`)

**Purpose:** Single function to emit integration events from any Answerlattice flow.

```typescript
export async function emitIntegrationEvent(params: {
  tId: number;
  sId: number;
  eventType: IntegrationEventType;
  severity: EventSeverity;
  payload: Record<string, any>;
}): Promise<void>
```

**Behavior:**
1. Feature flag check (`ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS`)
2. Add `pId: 'AL'` and `expiresAt`
3. Sanitize payload and write document to `answerlattice_integrationEvents` with `status: 'pending'`
4. Fire-and-forget — errors logged, never thrown
5. Cloud Function `processIntegrationEvent` triggers on `onCreate`

**Wiring points (nightly batch):**
- Step 13 reads whether a tenant has any enabled adapter. A config-read failure is recorded as `ANSWERLATTICE_INTEGRATION_ADAPTER_CHECK_FAILED`, marks that tenant's workflow integration task failed, and keeps event delivery fail-closed for that tenant instead of reporting a normal no-adapter skip.
- It emits `coverage_drop` immediately only when coverage is below threshold.
- It emits one tenant `nightly_summary` digest when the tenant has governance/support activity.
- It does not emit per-drift/per-proposal/per-gap fan-out by default; those event types remain available for explicit flows and controlled rollout.

**Wiring points (real-time):**
- Governance UI: approve mutation → emit `article_approved`

### 5.2 — Event Processor (`functions-answerlattice/src/integrations/eventProcessor.ts`)

**Purpose:** Cloud Function triggered by `onCreate` on `answerlattice_integrationEvents`.

**Flow:**
1. Read event document
2. Read tenant integration config from `platformSummary/integrationConfig_{tId}_{sId}`
3. For each enabled adapter where event type matches filter:
   a. Consume per-adapter minute counter
   b. Consume per-adapter daily counter
   c. For email, consume per-recipient daily counters
   d. Format payload via adapter
   e. Attempt delivery with bounded retry
   f. Log result to `answerlattice_integrationDeliveryLogs`
   g. Update compact health summary in `platformSummary/integrationHealth_{tId}_{sId}`
4. Update event status to `'delivered'` or `'failed'`

**Retry strategy:** bounded exponential backoff without open-ended retries
- Attempt 1: immediate
- Attempt 2: 1 second delay
- Attempt 3: 4 seconds delay
- After 3 failures: mark as failed, log, move on

**Circuit breaker:**
- Track consecutive failures per adapter per tenant
- After 10 consecutive failures: disable adapter, set `circuitBreaker.disabledAt`
- Auto-recover: if disabledAt > 24 hours ago, try one probe delivery
- On probe success: reset counter, re-enable

### 5.3 — Adapter Interface

```typescript
export interface IIntegrationAdapter {
  readonly adapterType: 'slack' | 'email' | 'linear' | 'github';
  
  send(
    event: AnswerlatticeIntegrationEvent,
    config: AdapterConfig,
  ): Promise<DeliveryResult>;
  
  formatPayload(event: AnswerlatticeIntegrationEvent): any;
}

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  durationMs: number;
}
```

### 5.4 — Slack Adapter

**Method:** POST to Incoming Webhook URL
**Payload:** Slack Block Kit JSON
**Auth:** Webhook URL contains auth token (no additional auth needed)
**Timeout:** 10 seconds
**Error handling:** Non-2xx → retry. Timeout → retry. DNS failure → retry.

**Message template per event type:**
- `drift_detected` → 🔴 emoji, red severity bar, entity name, drift reason
- `mutation_proposed` → 🟡 emoji, proposal details, signal count
- `knowledge_gap_detected` → 🟠 emoji, entity, fallback count, sample queries
- `coverage_drop` → 🚨 emoji, current vs previous rate, threshold
- `article_approved` → ✅ emoji, answer title, approved by
- `ai_failure_recurring` → ⚠️ emoji, entity, failure count
- `nightly_summary` → 📊 emoji, summary stats, error count

### 5.5 — Email Adapter

**Method:** SMTP via nodemailer (reuses existing transporter pattern)
**Auth:** Same SMTP env vars as lifecycle messaging
**Template:** HTML email with inline styles, calm infrastructure tone
**Rate limit:** 20 emails/day per recipient (same as existing notification system)

### 5.6 — Linear Adapter

**Method:** GraphQL API (`https://api.linear.app/graphql`)
**Auth:** Bearer token from controlled-rollout config only; not self-service owner UI
**Operation:** `issueCreate` mutation
**Timeout:** 15 seconds
**Mapping:**
- Title: `[Answerlattice] {eventType}: {entityName}`
- Description: Markdown with full event details
- Priority: severity → Linear priority (critical→1, high→2, medium→3, low→4)
- Label: `answerlattice`

### 5.7 — GitHub Adapter

**Method:** REST API (`POST /repos/{owner}/{repo}/issues`)
**Auth:** Bearer token (GitHub PAT from config)
**Timeout:** 15 seconds
**Mapping:**
- Title: `[Answerlattice] {eventType}: {entityName}`
- Body: GitHub Markdown with full event details
- Labels: `['answerlattice', eventType]`

---

## §6 — ADRs (Architecture Decision Records)

### ADR-1: Append-Only Event Log vs Direct Delivery

**Decision:** Write events to Firestore first, then deliver via onCreate trigger.

**Why not direct delivery?**
- Decouples event generation from delivery (nightly batch doesn't wait for Slack)
- Provides audit trail of all events ever generated
- Enables retry without re-running governance logic
- Matches Stripe/GitHub webhook architecture pattern

### ADR-2: platformSummary for Config vs New Collection

**Decision:** Store integration config in `platformSummary/integrationConfig_{tId}_{sId}`.

**Why not a new collection?**
- Follows existing Answerlattice pattern (branding, coverage KPI use platformSummary)
- Config is small (<2KB per tenant)
- Read once per event dispatch (not frequently queried)
- Zero new Firestore indexes needed for config

### ADR-3: 4 Adapters Only (No Custom Webhooks in v1)

**Decision:** Only Slack, Email, Linear, GitHub. No arbitrary webhook URLs.

**Why?**
- Custom webhooks require payload schema documentation, signature verification, endpoint health monitoring
- Each adapter has known API behavior (rate limits, error codes, auth patterns)
- Reduces attack surface (no SSRF risk from arbitrary URLs)
- Can add custom webhooks in v2 if demand is proven

### ADR-4: Runs in Answerlattice Firebase Project

**Decision:** Event processor Cloud Function runs in `functions-answerlattice/`, not `functions/`.

**Why?**
- Follows multi-product separation playbook
- Events originate from Answerlattice nightly batch (same project)
- No cross-project Firestore reads needed
- Config and events in same Firestore project = cheaper

### ADR-5: No Real-Time Streaming (Firestore Listeners)

**Decision:** Use onCreate trigger, not Firestore onSnapshot listeners.

**Why?**
- onCreate fires once per event (predictable cost)
- onSnapshot keeps connections open (unpredictable cost at scale)
- Delivery latency of <5 seconds is acceptable for governance events
- Matches industry pattern (Stripe, GitHub, Intercom all use async delivery)

### ADR-6: Secret Handling and Rollout Boundary

**Decision:** Owner-facing production setup supports Slack and email now. Linear and GitHub adapter code remains available in Cloud Functions, but owner UI/API do not expose those credentials until per-tenant secret storage is finalized.

**Current production behavior:**
- Slack webhook URL is stored server-side in Answerlattice Firestore and is never returned to the browser after save.
- Email uses existing SMTP function environment variables.
- Linear/GitHub credentials are not configurable from the owner dashboard.

**Why?**
- Slack incoming webhooks are the fastest self-service path and already scoped by Slack.
- Email is operationally simple and reuses existing SMTP infrastructure.
- GitHub/Linear issue creation needs a better credential lifecycle than raw owner-entered tokens in Firestore.
- This keeps the feature production-safe without deleting adapter code needed for later rollout.

---

## §7 — Nightly Batch Integration

The event bus hooks into the existing nightly batch as **Step 13** (after all existing 12 steps):

```
Existing Steps 1-12 (unchanged)
     │
     ▼
Step 13: Integration Event Emission
  - Skip tenants with no enabled adapter
  - Mark adapter-config read failure as a bounded failed task
  - Emit coverage_drop only below threshold
  - Emit one tenant nightly_summary digest when there is activity
  - Let Firestore TTL own old event/log/counter cleanup
```

**Cost:** One config read per tenant to skip unused work, plus 0-2 event writes for active tenants. Failed config reads do not add retry reads or event writes. No cleanup queries.

---

## §8 — Rate Limiting & Cost Protection

| Constraint | Value | Rationale |
|-----------|-------|-----------|
| Max events per nightly run per tenant | 50 | Prevents noisy tenants from flooding |
| Max delivery attempts per event | 3 | Industry standard (Stripe, GitHub) |
| Max events per minute per adapter | 20 | Prevents external API rate limit hits |
| Max events per day per adapter | 50 | Prevents noisy tenants from turning integrations into a notification/cost fan-out |
| Circuit breaker threshold | 10 consecutive failures | Auto-disables broken integrations |
| Circuit breaker cooldown | 24 hours | Reasonable recovery window |
| Event TTL | 90 days | Auto-cleanup, prevents unbounded growth |
| Delivery log TTL | 90 days | Same as events |
| Email rate limit | 20/day per recipient | Reuses existing notification limit |

---

## §9 — Observability

### Logging
- Every event emission: `[Answerlattice Integration] Emitted: {eventType} for {tId}/{sId}`
- Every delivery attempt: `[Answerlattice Integration] Delivery: {adapter} {status} for {eventId}`
- Circuit breaker changes: `[Answerlattice Integration] Circuit breaker {opened/closed} for {adapter} {tId}/{sId}`

### Metrics (in nightly summary)
- `totalEventsEmitted`: Number of integration events generated
- `totalDeliveriesAttempted`: Number of delivery attempts
- `totalDeliveriesSucceeded`: Successful deliveries
- `totalDeliveriesFailed`: Failed deliveries after all retries
- `circuitBreakersOpen`: Number of disabled adapters

---

## §10 — Build Phases

### Phase 1: Core Infrastructure (Session 1)

**Files to create:**
1. `functions-answerlattice/src/integrations/types.ts`
2. `functions-answerlattice/src/integrations/eventBus.ts`
3. `functions-answerlattice/src/integrations/eventProcessor.ts`
4. `functions-answerlattice/src/integrations/configStore.ts`
5. `functions-answerlattice/src/integrations/deliveryLogger.ts`
6. `functions-answerlattice/src/integrations/adapters/IAdapter.ts`
7. `functions-answerlattice/src/integrations/adapters/slackAdapter.ts`
8. `functions-answerlattice/src/integrations/adapters/emailAdapter.ts`

**Files to modify:**
1. `functions-answerlattice/src/constants/database.ts` — add event/log/rate-limit collections
2. `functions-answerlattice/src/constants/features.ts` — add flag
3. `functions-answerlattice/src/index.ts` — export processIntegrationEvent
4. `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` — add Step 13
5. `src/constants/database.ts` — add collection mirrors
6. `src/config/features.ts` — add flag
7. `src/types/answerlattice/index.ts` — add integration types

**Frontend (config UI):**
8. `src/app/api/answerlattice/integrations/route.ts` — Slack/email settings API
9. `src/app/api/answerlattice/integrations/test/route.ts` — controlled test event API
10. `src/components/templates/answerlattice/AnswerlatticeSettings.tsx` — settings UI

The browser response validation adds no Firestore reads/writes. It only refuses malformed or oversized route responses before the Settings UI treats integration settings or test notifications as saved/queued.

### Controlled-Rollout Adapters

1. `functions-answerlattice/src/integrations/adapters/linearAdapter.ts`
2. `functions-answerlattice/src/integrations/adapters/githubAdapter.ts`

These adapters are not exposed in owner settings until the per-tenant secret lifecycle is implemented.

### Adapter Target Safety

Workflow delivery runs inside the separate Answerlattice Functions codebase. The Slack adapter now resolves stored Incoming Webhook URLs through `functions-answerlattice/src/utils/networkTarget.ts` before delivery. Valid Slack targets must keep the fixed `https://hooks.slack.com/services/` shape and pass public DNS validation before the adapter fetches the normalized URL. Rejected targets fail only that delivery attempt and flow through the existing delivery log, health summary, and circuit-breaker behavior.

The GitHub adapter keeps the fixed `https://api.github.com` provider host and now URL-encodes the normalized owner and repo path segments before creating issues. GitHub and Linear success logs keep provider ID/URL presence and length metadata instead of raw provider URLs or IDs. Slack, email, Linear, and GitHub payload shapes, event filtering, rate caps, retry counts, circuit breakers, and tenant config storage are unchanged.

### Delivery Logger Diagnostics

`functions-answerlattice/src/integrations/deliveryLogger.ts` still writes the intended delivery-log and health-summary documents with event and tenant/store scope because those fields are the audit contract. Best-effort logger failures now emit stable `answerlattice_integration_*` failure codes with event ID presence/length metadata, tenant/store scope booleans, adapter/status/result metadata, and source error name/code/status only. Firestore exception text, raw event IDs, and raw tenant/store IDs are not emitted in logger failure breadcrumbs.

### Event Bus Diagnostics

`functions-answerlattice/src/integrations/eventBus.ts` still writes the intended integration event document with tenant/store scope, event type, severity, sanitized payload, status, and TTL because that document is the delivery trigger contract. Event cap, event emitted, and event emit failure breadcrumbs now use stable event-bus failure codes, tenant/store scope booleans, payload key counts, and source error name/code/status only. Raw tenant/store IDs, tenant keys, and Firestore exception text are not emitted in event-bus logger breadcrumbs.

### Event Processor Entrypoint Diagnostics

`functions-answerlattice/src/index.ts` keeps the deployed `processIntegrationEvent` trigger and still passes the raw event ID to `processEvent()` because Firestore document lookup requires it. Runtime breadcrumbs now log event ID presence/length metadata instead of raw event IDs when an integration event starts and completes processing.

### Event Processor Runtime Diagnostics

`functions-answerlattice/src/integrations/eventProcessor.ts` still uses raw event IDs and tenant/store scope for the required status updates, delivery logs, rate-limit documents, health summaries, and adapter dispatch contracts. Its runtime breadcrumbs now use stable invalid-event failure codes, event ID presence/length metadata, and tenant/store scope booleans instead of raw event IDs or raw `tId/sId` values for invalid-event, delivery-attempt, and no-enabled-adapter logs.

Status-update, rate-limit-counter, email-recipient-limit, and circuit-breaker success/failure record side effects stay non-blocking and fail closed where they already did. Rejected side effects now log stable `answerlattice_integration_*` processor failure codes with bounded event ID presence/length, tenant/store scope booleans, adapter/status/reason labels, counts, and source error name/code/status metadata instead of empty promise catches. This preserves the delivery contract while making processor side-effect failures observable.

### Nightly Adapter Check Diagnostics

`functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` still uses `hasEnabledIntegrationAdapter(tId, sId)` once per tenant before emitting nightly workflow events. If that config read fails, Step 13 records `ANSWERLATTICE_INTEGRATION_ADAPTER_CHECK_FAILED` with tenant/store scope booleans and source error name/code/status metadata, marks the tenant workflow integration task failed, and continues the rest of the scheduler run. A legitimate disabled/no-config adapter still records a normal skipped task with `reason: 'no_enabled_adapter'`.

### Circuit Breaker Diagnostics

`functions-answerlattice/src/integrations/configStore.ts` still writes the existing circuit-breaker state into the integration config summary document. The circuit-breaker-opened breadcrumb now logs `answerlattice_integration_circuit_breaker_opened`, adapter type, consecutive failure count, and tenant/store scope booleans instead of raw `tId/sId` values.

### Adapter Failure Text

Slack, email, GitHub, and Linear adapters still return local configuration errors, numeric provider status codes when available, duration, and success/failure state to the delivery logger. Provider response bodies, GraphQL error messages, and thrown SMTP/fetch exception messages are no longer read into delivery results. Provider/runtime failures now use fixed local failure text so delivery logs and health summaries do not persist provider response bodies or exception text.

---

## §11 — Backwards Compatibility

| Concern | Impact |
|---------|--------|
| Existing nightly batch | Zero change to Steps 1-12. Step 13 is additive, feature-flagged. |
| Existing Answerlattice types | Additive types only. No modification to frozen interfaces. |
| Existing collections | Zero changes. 2 new collections added. |
| Existing feature flags | No changes. New flag added. |
| Existing email notifications | Completely separate system. Integration email adapter is for governance events, notification system is for ticket events. |

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-06-30 | 1.1.12 | Added bounded Settings response validation for integration load/save/test results before UI state or success copy advances. |
| 2026-06-29 | 1.1.11 | Recorded nightly adapter-config read failures as bounded failed scheduler tasks instead of silent no-adapter skips. |
| 2026-06-29 | 1.1.10 | Bounded event-processor side-effect failure diagnostics while preserving status, rate-limit, circuit-breaker, and delivery behavior. |
| 2026-06-28 | 1.1.9 | Moved controlled test-event route rate limiting before permission/config/event work and switched unexpected route failures to bounded runtime diagnostics. |
| 2026-06-28 | 1.1.8 | Bounded workflow adapter provider/runtime failure text while preserving status codes and delivery records. |
| 2026-06-28 | 1.1.7 | Bounded workflow integration circuit-breaker-opened breadcrumbs while preserving config summary writes. |
| 2026-06-28 | 1.1.6 | Bounded workflow event processor breadcrumbs while preserving delivery, rate-limit, status, and health-summary records. |
| 2026-06-28 | 1.1.5 | Bounded processIntegrationEvent entrypoint breadcrumbs while preserving event document processing. |
| 2026-06-28 | 1.1.4 | Bounded event-bus event-cap, emitted, and emit-failure diagnostics while preserving integration-event documents. |
| 2026-06-28 | 1.1.3 | Bounded delivery-log, event-status, and integration-health failure diagnostics while preserving delivery-log and health-summary data contracts. |
| 2026-06-28 | 1.1.2 | Added Slack webhook DNS target validation, GitHub owner/repo path-segment encoding, and bounded GitHub/Linear success diagnostics. |
| 2026-05-24 | 1.1.1 | Added per-tenant/per-adapter daily delivery cap and nightly repeated-AI-failure alert emission. |
| 2026-05-24 | 1.1.0 | Hardened workflow integrations with digest-first emissions, Firestore TTL, compact health summaries, rate counters, owner test notifications, and Slack/email production scope. |
| 2026-03-09 | 1.0.0 | Initial implementation blueprint |
