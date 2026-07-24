# Answerlattice — External Workflow Integrations — Implementation

> **Version:** 1.3.1
> **Last Updated:** 2026-07-23
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
├── app/(answerlattice)/answerlattice/workflow-notifications/page.tsx # Dedicated dashboard route
├── components/templates/answerlattice/settings/
│   └── AnswerlatticeWorkflowNotifications.tsx # Responsive owner UI
├── lib/answerlattice/workflowIntegrationContracts.ts # Shared strict browser/server response contract
└── config/features.ts              # + ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS
```

`AnswerlatticeWorkflowNotifications.tsx` is a dedicated `MANAGE_INTEGRATIONS` surface. It validates workflow-integration responses through a 64 KB bounded JSON reader and the shared strict Zod contracts before updating form, health, or success state. Save responses preserve the currently visible health until the next server refresh. The UI validates Slack webhook shape, safe disconnect order, email recipient count/shape, save-before-test behavior, and enables testing only when a saved adapter is active. Malformed, oversized, rejected, or wrong-shape responses log fixed diagnostics and keep fixed owner-facing failure copy.

---

## §3 — Data Model

### 3.1 — Integration Events Collection

**Collection:** `answerlattice_integrationEvents` (Answerlattice Firestore)
**Write pattern:** Immutable event identity/payload plus transactional lifecycle updates.
**Triggered by:** Nightly batch steps + governance UI actions

| Field | Type | Description |
|-------|------|-------------|
| document ID | string | Auto-generated for manual events; deterministic hash for idempotent nightly events; not duplicated as a field |
| `pId` | string | Always `AL` |
| `eventType` | string | One of 7 event types (see §4) |
| `tId` | number | Tenant ID |
| `sId` | number | Store ID |
| `severity` | string | `'critical' \| 'high' \| 'medium' \| 'low'` |
| `payload` | map | Event-specific data (varies by type) |
| `idempotencyFingerprint` | string, optional | SHA-256 fingerprint binding deterministic event identity to exact scope/type/severity/payload |
| `status` | string | `'pending' \| 'processing' \| 'delivered' \| 'failed'` |
| `createdAt` | Timestamp | When event was created |
| `processingStartedAt` | Timestamp, optional | When the transaction claimed the pending event |
| `processingAttemptCount` | number, optional | Bounded claim count for diagnostics |
| `completedAt` | Timestamp, optional | When processing reached delivered/failed |
| `failureCode` | string, optional | Fixed local failure reason for rejected event contracts |
| `expiresAt` | Timestamp | Firestore TTL deletion timestamp |

**Index:** `tId ASC, createdAt DESC` (for tenant event history query)
**TTL:** 90 days (Firestore TTL; no nightly cleanup query)

### 3.2 — Integration Delivery Logs Collection

**Collection:** `answerlattice_integrationDeliveryLogs` (Answerlattice Firestore)
**Write pattern:** Append-only. One create-only deterministic document per event/adapter/attempt.

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
| `pId` | `'AL'` | Persisted product ownership; must match exactly |
| `tId` | positive safe integer | Persisted tenant ownership; must match the document path scope |
| `sId` | positive safe integer | Persisted workspace ownership; must match the document path scope |
| `slack.enabled` | boolean | Slack integration active |
| `slack.webhookUrl` | string | Slack Incoming Webhook URL |
| `slack.channel` | string | Channel name (display only, webhook determines actual channel) |
| `slack.eventFilters` | string[] | Which event types to deliver |
| `email.enabled` | boolean | Email integration active |
| `email.recipients` | string[] | Email addresses (max 5) |
| `email.eventFilters` | string[] | Which event types to deliver |
| `linear.*` | map | Controlled-rollout adapter config. Not exposed in owner settings until secret management is production-ready. |
| `github.*` | map | Controlled-rollout adapter config. Not exposed in owner settings until secret management is production-ready. |
| `circuitBreaker` | map | Per-adapter: `{ consecutiveFailures, disabledAt, probeStartedAt }`; the probe timestamp is a 2-minute transactional lease |
| `modifiedOn` | Timestamp | Last config change |

**Ownership and legacy behavior:** The settings producer writes `pId/tId/sId` on every save. The settings GET/test routes and Functions consumer compare embedded ownership with the session/event-derived document path before using adapter secrets. Documents with no ownership fields at all are the bounded legacy shape: the derived scope is claimed by writing the three fields inside a Firestore transaction. Partial, wrong-product, or conflicting scope is rejected; the owner API returns support-review status and Functions return an all-disabled config. The owner route re-reads ownership in the same transaction that merges only Slack/email fields, so it cannot overwrite a concurrently changed identity and never rewrites controlled Linear/GitHub or transaction-owned circuit-breaker maps from an earlier read. Circuit-breaker success/failure changes also re-read ownership inside a Firestore transaction.

**Stored-value admission:** Ownership does not make stored fields trustworthy. GET and test routes use one exact projection for Slack URL, channel, filters and email recipients. Slack is configured/enabled only for an HTTPS `hooks.slack.com/services/...` URL without userinfo, nonstandard port, query or fragment; PUT revalidates a legacy stored URL before preserving it. Functions apply the same URL boundary and admit circuit-breaker failure counts only as nonnegative safe integers from 0 through 1000. Malformed legacy values disable the affected destination/state instead of being string-coerced or queued for a test.

**Secret client boundary:** Both dedicated and shared Firestore rules deny client reads, creates, and updates for `integrationConfig_*`, including platform-admin browser clients. Configuration is reachable only through Admin SDK routes/Functions. The API returns `webhookConfigured`, never the raw webhook. Firestore provider encryption at rest is inherited infrastructure; application-level per-tenant encryption is not implemented or claimed.

**Why platformSummary?** Follows existing Answerlattice pattern (branding, coverage KPI). No new collection. Config is small (<2KB). Read once per event dispatch, plus a transaction read when circuit-breaker state must be reconciled.

### 3.4 — Delivery Health Summary

**Storage:** `platformSummary/integrationHealth_{tId}_{sId}`

This doc stores sanitized last attempt/success/failure state per adapter. Functions write the nested `adapters.{adapter}` map inside an ownership-validating transaction; this preserves the other adapter's health and makes the fields visible to the owner API. A fully unowned legacy health row can be claimed; a partial or conflicting identity is not repaired or overwritten. The owner UI reads this through the server API, so it never queries raw delivery logs. The API keeps stored delivery error text server-side and returns a fixed `Delivery needs review.` marker when an adapter has a last error.

The settings GET route applies the shared Answerlattice dashboard `DATA_READ` limiter before permission and `platformSummary` reads. It independently verifies or transactionally claims the embedded config and health ownership before serialization. Save/test use an actor plus workspace rate-limit key before permission and data work, so one actor cannot consume another actor's quota while permission admission remains abuse-protected. Both routes then validate ownership before writing.

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
    failurePhases: string[],  // Bounded internal workflow phase names, not customer queries
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
  payload: Record<string, unknown>;
  deduplicationKey?: string;
}): Promise<boolean>
```

**Behavior:**
1. Feature flag check (`ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS`)
2. Add `pId: 'AL'` and `expiresAt`
3. Sanitize payload and reject unsupported, nested, or secret-bearing values
4. For a deduplication key, create a deterministic event document and bind it to an exact payload fingerprint
5. Suppress exact replays; reject changed-payload reuse of the same key; neither consumes the nightly cap
6. Write `status: 'pending'`; errors are logged and returned as `false`, never thrown
7. Cloud Function `processIntegrationEvent` triggers on `onCreate`

**Wiring points (nightly batch):**
- Step 13 reads whether a tenant has any enabled adapter. A config-read failure is recorded as `ANSWERLATTICE_INTEGRATION_ADAPTER_CHECK_FAILED`, marks that tenant's workflow integration task failed, and keeps event delivery fail-closed for that tenant instead of reporting a normal no-adapter skip.
- It emits `coverage_drop` as a separate higher-priority nightly-run event only when coverage is below threshold.
- It emits `ai_failure_recurring` only when the bounded nightly AI-failure threshold is reached.
- It emits one tenant `nightly_summary` digest when the tenant has governance/support activity.
- It does not emit per-drift/per-proposal/per-gap fan-out by default; those event types remain available for explicit flows and controlled rollout.

**Other entry point:**
- The authenticated owner test route writes one controlled `nightly_summary` event after permission, config-ownership, and rate-limit checks. Its exact `test: true` plus `runLogId: 'manual-test'` marker bypasses ordinary event filters only for enabled self-service Slack/email adapters so the single global test action verifies both saved connections; controlled Linear/GitHub filters are unchanged.
- No direct real-time governance producer is currently wired. `drift_detected`, `mutation_proposed`, `knowledge_gap_detected`, and `article_approved` remain supported adapter/filter schemas, not active emission claims.
- The owner response contract exposes only `coverage_drop`, `ai_failure_recurring`, and `nightly_summary`; reserved formatter schemas cannot be selected from self-service settings.

### 5.2 — Event Processor (`functions-answerlattice/src/integrations/eventProcessor.ts`)

**Purpose:** Cloud Function triggered by `onCreate` on `answerlattice_integrationEvents`.

**Flow:**
1. Validate product/scope/type/severity/payload/timestamps from the trigger snapshot
2. Transactionally claim only the exact matching pending document; changed payload or timestamp fails closed
3. Read tenant integration config from `platformSummary/integrationConfig_{tId}_{sId}`
4. For each enabled adapter where event type matches filter:
   a. Consume per-adapter minute counter
   b. Consume per-adapter daily counter
   c. For email, transactionally admit the complete normalized recipient set; if any recipient is capped, reject the complete email delivery without consuming any recipient slot
   d. Format payload via adapter
   e. Attempt delivery with bounded retry
   f. Log result to `answerlattice_integrationDeliveryLogs`
   g. Update compact health summary in `platformSummary/integrationHealth_{tId}_{sId}`
5. Update event status to `'delivered'` only when every attempted adapter succeeds; any attempted adapter failure makes the event `'failed'`

**Retry strategy:** bounded adapter retry without open-ended or ambiguous provider replay
- Attempt 1: immediate
- Attempt 2: 1 second delay
- Attempt 3: 4 seconds delay
- Attempts 2 and 3 run only when the adapter returns an explicit retryable result
- Slack marks `5xx` retryable. Slack `429` retains its numeric provider status but does not enter the fixed 1s/4s retry loop because Slack's contract uses `Retry-After`.
- GitHub and Linear remain controlled rollout; their current classifications must be revalidated with OAuth/API error contracts before self-service activation.
- Network/timeout/SMTP exceptions use fixed local failures and are not blindly replayed because provider acceptance can be ambiguous
- The Firestore trigger has platform retry enabled for pre-claim infrastructure failures. The transactional pending-event claim prevents a second invocation from replaying an already claimed provider delivery.
- After the third total attempt: mark as failed, log, move on

**Circuit breaker:**
- Track consecutive failures per adapter per tenant
- After 10 consecutive failures: disable adapter, set `circuitBreaker.disabledAt`
- Auto-recover: if disabledAt > 24 hours ago, transactionally lease one probe delivery for 2 minutes; concurrent probes fail closed
- On probe success: reset counter, re-enable

### 5.3 — Adapter Interface

```typescript
export interface IIntegrationAdapter {
  readonly adapterType: 'slack' | 'email' | 'linear' | 'github';
  
  send(
    event: AnswerlatticeIntegrationEvent,
    config: AdapterConfig,
  ): Promise<DeliveryResult>;
  
  formatPayload(event: AnswerlatticeIntegrationEvent): Record<string, unknown>;
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
**Error handling:** HTTP 429/5xx responses are retryable. Timeout, DNS, target-validation, and other request exceptions are fixed local failures and are not automatically replayed.

All HTTP adapters reject redirects. Slack therefore cannot follow a redirect away from its validated `hooks.slack.com` target, and the fixed Linear/GitHub provider origins remain fixed for the entire request.

Slack detail values pass through `safeSlackMrkdwnText()`, which bounds/redacts text and encodes Slack's `&`, `<`, and `>` control characters. The detail text object also sets `verbatim: true`, so source-derived text cannot create mentions or injected angle-bracket links. The formatter keeps only Answerlattice-owned bold labels as markup.

**Message template per event type:**
- `drift_detected` → 🔴 emoji, red severity bar, entity name, drift reason
- `mutation_proposed` → 🟡 emoji, proposal details, signal count
- `knowledge_gap_detected` → 🟠 emoji, entity, fallback count, sample queries
- `coverage_drop` → 🚨 emoji, current vs previous rate, threshold
- `article_approved` → ✅ emoji, answer title, approved by
- `ai_failure_recurring` → ⚠️ emoji, entity, failure count, bounded failed workflow phases
- `nightly_summary` → 📊 emoji, summary stats, error count

### 5.5 — Email Adapter

**Method:** SMTP via nodemailer (reuses existing transporter pattern)
**Auth:** Answerlattice project secrets only: `ANSWERLATTICE_SMTP_HOST`, `ANSWERLATTICE_SMTP_PORT`, `ANSWERLATTICE_SMTP_USER`, `ANSWERLATTICE_SMTP_PASS`
**Template:** HTML email with inline styles, calm infrastructure tone
**Rate limit:** 20 emails/day per recipient (same as existing notification system)

The email formatter has an explicit repeated-AI-workflow-failure row set. It renders bounded internal phase names and a count, not customer questions or raw scheduler/provider errors. HTML values are secret-redacted before entity encoding.

Before deploying the processor to an Answerlattice Firebase project, provision all four secret versions in that same project:

```bash
firebase functions:secrets:set ANSWERLATTICE_SMTP_HOST --project answerlattice-qa
firebase functions:secrets:set ANSWERLATTICE_SMTP_PORT --project answerlattice-qa
firebase functions:secrets:set ANSWERLATTICE_SMTP_USER --project answerlattice-qa
firebase functions:secrets:set ANSWERLATTICE_SMTP_PASS --project answerlattice-qa
```

Repeat against `answerlattice` for production with production values. Generic `SMTP_*` variables belong to other runtime planes and are intentionally not used by Answerlattice Functions.

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

### ADR-1: Persisted Event Lifecycle vs Direct Delivery

**Decision:** Write immutable event facts to Firestore first, then advance delivery lifecycle state through an onCreate-triggered transaction.

**Why not direct delivery?**
- Decouples event generation from delivery (nightly batch doesn't wait for Slack)
- Provides an audit trail with exact scope/payload identity and observable processing state
- Enables bounded pre-claim trigger retry without re-running governance logic or duplicating claimed provider work
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
- One event document drives the onCreate pipeline; at-least-once trigger acknowledgements are contained by the transactional pending-event claim
- onSnapshot keeps connections open (unpredictable cost at scale)
- Delivery latency of <5 seconds is acceptable for governance events
- Matches industry pattern (Stripe, GitHub, Intercom all use async delivery)

### ADR-6: Secret Handling and Rollout Boundary

**Decision:** Owner-facing production setup supports Slack and email now. Linear and GitHub adapter code remains available in Cloud Functions, but owner UI/API do not expose those credentials until per-tenant secret storage is finalized.

**Current production behavior:**
- Slack webhook URL is stored server-side in Answerlattice Firestore and is never returned to the browser after save.
- Server-only storage is the verified application boundary. Firebase/provider encryption at rest may apply, but Answerlattice does not claim separate application-layer encryption for the webhook document.
- Email uses only Answerlattice-scoped `ANSWERLATTICE_SMTP_*` Function secrets; it does not inherit generic SMTP variables from another product runtime.
- Linear/GitHub credentials are not configurable from the owner dashboard.
- Provider delivery copies the bounded event content into Slack, email, Linear, or GitHub; provider-side retention, access, deletion, and audit remain governed by the customer's provider workspace and policy.

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
  - Emit ai_failure_recurring only when the bounded nightly failure threshold is reached
  - Emit one tenant nightly_summary digest when there is activity
  - Let Firestore TTL own old event/log/counter cleanup
```

**Cost:** One config read per tenant to skip unused work, plus 0-3 event writes for active tenants (coverage, recurring AI failure, summary). Failed config reads do not add retry reads or event writes. No cleanup queries.

---

## §8 — Rate Limiting & Cost Protection

| Constraint | Value | Rationale |
|-----------|-------|-----------|
| Max events per nightly run per tenant | 50 | Prevents noisy tenants from flooding |
| Max delivery attempts per event | 3 | Bounds provider retries and prevents indefinite fan-out |
| Max events per minute per adapter | 20 | Prevents external API rate limit hits |
| Max events per day per adapter | 50 | Prevents noisy tenants from turning integrations into a notification/cost fan-out |
| Circuit breaker threshold | 10 consecutive failures | Opens the adapter circuit and exposes owner-safe health; it does not rewrite the owner enable toggle |
| Circuit breaker cooldown | 24 hours | Reasonable recovery window |
| Event TTL | 90 days | Auto-cleanup, prevents unbounded growth |
| Delivery log TTL | 90 days | Same as events |
| Email rate limit | 20/day per recipient | Reuses existing notification limit |

---

## §9 — Observability

### Logging
- Event emission logs event type/severity, payload-key count, and scope-presence booleans; raw tenant/workspace/event IDs are not logged.
- Delivery attempts log adapter, attempt, success/status code/duration, and bounded event-ID/scope metadata.
- Circuit-breaker opening logs the adapter, bounded failure count, and scope-presence booleans.

### Persisted operational evidence
- Scheduler run state records `integrationEventsEmitted` for successfully created events.
- Create-only delivery-attempt rows are the per-attempt audit ledger.
- `platformSummary/integrationHealth_{tId}_{sId}` stores the owner-safe last status per adapter.
- Circuit-breaker state remains in the tenant/workspace integration config transactionally.

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
10. `src/app/(answerlattice)/answerlattice/workflow-notifications/page.tsx` — dedicated route
11. `src/components/templates/answerlattice/settings/AnswerlatticeWorkflowNotifications.tsx` — responsive owner UI
12. `src/lib/answerlattice/workflowIntegrationContracts.ts` — shared strict response schemas

The browser response validation adds no Firestore reads/writes. It only refuses malformed or oversized route responses before the Workflow Notifications UI treats integration settings or test notifications as saved/queued.

### Controlled-Rollout Adapters

1. `functions-answerlattice/src/integrations/adapters/linearAdapter.ts`
2. `functions-answerlattice/src/integrations/adapters/githubAdapter.ts`

These adapters are not exposed in owner settings until the per-tenant secret lifecycle is implemented.

### Adapter Target Safety

Workflow delivery runs inside the separate Answerlattice Functions codebase. The Slack adapter now resolves stored Incoming Webhook URLs through `functions-answerlattice/src/utils/networkTarget.ts` before delivery. Valid Slack targets must keep the fixed `https://hooks.slack.com/services/` shape and pass public DNS validation before the adapter fetches the normalized URL. Rejected targets fail only that delivery attempt and flow through the existing delivery log, health summary, and circuit-breaker behavior.

The GitHub adapter keeps the fixed `https://api.github.com` provider host and URL-encodes normalized owner/repo path segments before creating issues. GitHub and Linear success logs keep provider ID/URL presence and length metadata instead of raw provider URLs or IDs. Slack `429` is deliberately non-retryable in the fixed-delay processor; Slack `5xx` remains retryable.

### Delivery Logger Diagnostics

`functions-answerlattice/src/integrations/deliveryLogger.ts` still writes the intended delivery-log and health-summary documents with event and tenant/store scope because those fields are the audit contract. Best-effort logger failures now emit stable `answerlattice_integration_*` failure codes with event ID presence/length metadata, tenant/store scope booleans, adapter/status/result metadata, and source error name/code/status only. Firestore exception text, raw event IDs, and raw tenant/store IDs are not emitted in logger failure breadcrumbs.

### Event Bus Diagnostics

`functions-answerlattice/src/integrations/eventBus.ts` still writes the intended integration event document with tenant/store scope, event type, severity, sanitized payload, status, and TTL because that document is the delivery trigger contract. Event cap, event emitted, and event emit failure breadcrumbs now use stable event-bus failure codes, tenant/store scope booleans, payload key counts, and source error name/code/status only. Raw tenant/store IDs, tenant keys, and Firestore exception text are not emitted in event-bus logger breadcrumbs.

### Event Processor Entrypoint Diagnostics

`functions-answerlattice/src/index.ts` keeps the deployed `processIntegrationEvent` trigger and still passes the raw event ID to `processEvent()` because Firestore document lookup requires it. Runtime breadcrumbs now log event ID presence/length metadata instead of raw event IDs when an integration event starts and completes processing.

The trigger timeout is 240 seconds, platform retry is enabled, and the function declares `ANSWERLATTICE_SMTP_HOST`, `ANSWERLATTICE_SMTP_PORT`, `ANSWERLATTICE_SMTP_USER`, and `ANSWERLATTICE_SMTP_PASS` through `ANSWERLATTICE_SECRET_GROUPS.WORKFLOW_INTEGRATIONS`. An unexpected invocation failure attempts to move an exact claimed event to `failed` before rethrowing; a retry cannot reclaim an event that already advanced beyond `pending`.

### Delivery Identity and Payload Boundaries

Deterministic scheduler events use a SHA-256 document ID derived from tenant, workspace, event type, and deduplication key. A separate SHA-256 fingerprint binds that ID to exact severity and sanitized payload. Create-only writes suppress exact replays and reject changed-payload key reuse. Event claims compare the persisted product/scope/type/severity/payload/created timestamp with the original trigger snapshot. Adapter formatters accept only bounded primitive payload values and normalize malformed legacy arrays/counts/ratios instead of throwing or interpolating untrusted numeric-shaped strings.

### Event Processor Runtime Diagnostics

`functions-answerlattice/src/integrations/eventProcessor.ts` still uses raw event IDs and tenant/store scope for the required status updates, delivery logs, rate-limit documents, health summaries, and adapter dispatch contracts. Its runtime breadcrumbs now use stable invalid-event failure codes, event ID presence/length metadata, and tenant/store scope booleans instead of raw event IDs or raw `tId/sId` values for invalid-event, delivery-attempt, and no-enabled-adapter logs.

Status-update, rate-limit-counter, email-recipient-limit, and circuit-breaker success/failure record side effects stay non-blocking and fail closed where they already did. Rejected side effects now log stable `answerlattice_integration_*` processor failure codes with bounded event ID presence/length, tenant/store scope booleans, adapter/status/reason labels, counts, and source error name/code/status metadata instead of empty promise catches. This preserves the delivery contract while making processor side-effect failures observable.

### Nightly Adapter Check Diagnostics

`functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` still uses `hasEnabledIntegrationAdapter(tId, sId)` once per tenant before emitting nightly workflow events. If that config read fails, Step 13 records `ANSWERLATTICE_INTEGRATION_ADAPTER_CHECK_FAILED` with tenant/store scope booleans and source error name/code/status metadata, marks the tenant workflow integration task failed, and continues the rest of the scheduler run. A legitimate disabled/no-config adapter still records a normal skipped task with `reason: 'no_enabled_adapter'`.

### Circuit Breaker Diagnostics

`functions-answerlattice/src/integrations/configStore.ts` still writes the existing circuit-breaker state into the integration config summary document. The circuit-breaker-opened breadcrumb now logs `answerlattice_integration_circuit_breaker_opened`, adapter type, consecutive failure count, and tenant/store scope booleans instead of raw `tId/sId` values.

### Adapter Failure Text

Slack, email, GitHub, and Linear adapters still return local configuration errors, numeric provider status codes when available, duration, and success/failure state to the delivery logger. Provider response bodies, GraphQL error messages, and thrown SMTP/fetch exception messages are no longer read into delivery results. Provider/runtime failures now use fixed local failure text so delivery logs and health summaries do not persist provider response bodies or exception text.

### Delivery Completion and Circuit Concurrency

An event is `delivered` only when all attempted adapters succeed; partial success is `failed`. Delivery attempts use deterministic create-only log IDs so a repeated acknowledgement cannot overwrite the first audit row. Circuit-breaker failure increments and success resets derive from transaction snapshots. After cooldown, only one transaction can acquire the 2-minute probe lease; success resets the breaker and failure clears the lease while reopening the cooldown.

Email recipient caps are admitted atomically across the complete normalized recipient set. This prevents a provider-accepted email to only a subset from being reported as adapter success. If one recipient is capped, the attempt is recorded as `rate_limited`, nobody is sent, and no recipient counter advances.

### External Provider Contracts

Official contracts were checked on 2026-07-19:

- Slack Incoming Webhooks: webhook URLs are secrets and leaked URLs may be revoked; incoming webhook rate behavior is approximately one message per second, and HTTP `429` carries `Retry-After`. Sources: [Sending messages using incoming webhooks](https://api.slack.com/messaging/webhooks) and [Rate limits](https://docs.slack.dev/apis/web-api/rate-limits/).
- GitHub issue creation: a fine-grained token requires Issues write permission. API version `2022-11-28` remains supported, but the controlled adapter must be revalidated before its documented 2028 retirement. Sources: [REST issues](https://docs.github.com/en/rest/issues/issues#create-an-issue) and [API versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions).
- Linear: apps for third parties should use OAuth; the 2026 refresh-token contract and GraphQL `RATELIMITED` error behavior are activation blockers for the current raw-key adapter. Sources: [OAuth authentication](https://linear.app/developers/oauth-2-0-authentication) and [Rate limiting](https://linear.app/developers/rate-limiting).
- Firestore triggers are at-least-once and ordering is not guaranteed, which is why exact event claims and idempotent attempt identities remain mandatory. Source: [Firestore events](https://firebase.google.com/docs/functions/firestore-events).

---

## §11 — Backwards Compatibility

| Concern | Impact |
|---------|--------|
| Existing nightly batch | Zero change to Steps 1-12. Step 13 is additive, feature-flagged. |
| Existing Answerlattice types | Additive types only. No modification to frozen interfaces. |
| Existing collections | No unrelated collection schema changed. The feature owns integration events/delivery logs plus scoped `platformSummary` config, health, and rate-limit documents. |
| Existing feature flags | No changes. New flag added. |
| Existing email notifications | Completely separate system. Integration email adapter is for governance events, notification system is for ticket events. |

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-19 | 1.3.0 | Added the dedicated permission-gated owner route, strict response contract, browser-denied secret config, nested transactional health, atomic all-recipient email admission, provider-specific Slack retries, active-producer-only filters, and exact external-evidence boundaries. |
| 2026-07-13 | 1.2.0 | Added exact event claims, payload-bound emission idempotency, create-only attempt logs, all-adapter completion semantics, transactional circuit probes, malformed payload normalization, platform retry guardrails, and Answerlattice-scoped SMTP secret binding. |
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
