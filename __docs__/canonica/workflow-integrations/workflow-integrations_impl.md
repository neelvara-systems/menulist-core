# Canonica — External Workflow Integrations — Implementation

> **Version:** 1.0.0
> **Last Updated:** 2026-03-09
> **Audience:** Developers
> **Feature Flag:** `ENABLE_CANONICA_WORKFLOW_INTEGRATIONS` (client + CF)

---

## §1 — System Position Inside Canonica

```
┌─────────────────────────────────────────────────────────┐
│                  CANONICA ARCHITECTURE                   │
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
│  Slack    Email     Linear     GitHub                    │
└─────────────────────────────────────────────────────────┘
```

This is an **extension of Pillar 5 (API & Integration Layer)**. It adds outbound event delivery without modifying Pillars 1-4. Zero impact on frozen infrastructure.

---

## §2 — File Structure

```
# Cloud Functions (Canonica Firebase project)
functions-canonica/src/
├── integrations/
│   ├── types.ts                    # Integration event types + adapter interface
│   ├── eventBus.ts                 # emitIntegrationEvent() — writes to Firestore
│   ├── eventProcessor.ts           # Cloud Function: onCreate trigger → dispatch
│   ├── configStore.ts              # Read integration config for tenant
│   ├── adapters/
│   │   ├── IAdapter.ts             # Adapter interface (send + formatPayload)
│   │   ├── slackAdapter.ts         # Slack Incoming Webhook adapter
│   │   ├── emailAdapter.ts         # SMTP adapter (reuses nodemailer)
│   │   ├── linearAdapter.ts        # Linear GraphQL API adapter
│   │   └── githubAdapter.ts        # GitHub REST API adapter
│   └── deliveryLogger.ts           # Log delivery attempts + retry logic
├── constants/
│   ├── database.ts                 # + CANONICA_INTEGRATION_EVENTS, CANONICA_INTEGRATION_DELIVERY_LOGS
│   └── features.ts                 # + ENABLE_CANONICA_WORKFLOW_INTEGRATIONS
└── index.ts                        # + processIntegrationEvent export

# Frontend (Next.js — Canonica dashboard)
src/
├── types/canonica/index.ts         # + CanonicaIntegrationEvent, CanonicaIntegrationConfig types
├── database/canonica/
│   └── integrations.ts             # DAL for integration config CRUD
├── components/templates/canonica/
│   └── IntegrationSettings.tsx     # Settings UI (enable/disable, config, test)
└── config/features.ts              # + ENABLE_CANONICA_WORKFLOW_INTEGRATIONS
```

---

## §3 — Data Model

### 3.1 — Integration Events Collection

**Collection:** `canonica_integrationEvents` (Canonica Firestore)
**Write pattern:** Append-only. Write once, never update.
**Triggered by:** Nightly batch steps + governance UI actions

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | Auto-generated doc ID |
| `eventType` | string | One of 7 event types (see §4) |
| `tId` | number | Tenant ID |
| `sId` | number | Store ID |
| `severity` | string | `'critical' \| 'high' \| 'medium' \| 'low'` |
| `payload` | map | Event-specific data (varies by type) |
| `status` | string | `'pending' \| 'processing' \| 'delivered' \| 'failed'` |
| `createdAt` | Timestamp | When event was created |

**Index:** `tId ASC, createdAt DESC` (for tenant event history query)
**TTL:** 90 days (auto-cleanup via nightly batch)

### 3.2 — Integration Delivery Logs Collection

**Collection:** `canonica_integrationDeliveryLogs` (Canonica Firestore)
**Write pattern:** Append-only. One doc per delivery attempt.

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | Reference to integration event |
| `tId` | number | Tenant ID |
| `sId` | number | Store ID |
| `adapter` | string | `'slack' \| 'email' \| 'linear' \| 'github'` |
| `attempt` | number | 1, 2, or 3 |
| `status` | string | `'success' \| 'failed'` |
| `statusCode` | number/null | HTTP status code (if applicable) |
| `error` | string/null | Error message (if failed) |
| `durationMs` | number | Delivery time in milliseconds |
| `createdAt` | Timestamp | When delivery was attempted |

**Index:** `eventId ASC, createdAt ASC` (for delivery history per event)
**TTL:** 90 days

### 3.3 — Integration Config (per-tenant)

**Storage:** `platformSummary/integrationConfig_{tId}_{sId}` (Canonica Firestore)
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
| `linear.enabled` | boolean | Linear integration active |
| `linear.apiKey` | string | Linear API key (encrypted at rest) |
| `linear.teamId` | string | Linear team ID for issue creation |
| `linear.eventFilters` | string[] | Which event types to deliver |
| `github.enabled` | boolean | GitHub integration active |
| `github.token` | string | GitHub personal access token (encrypted at rest) |
| `github.owner` | string | Repository owner |
| `github.repo` | string | Repository name |
| `github.eventFilters` | string[] | Which event types to deliver |
| `circuitBreaker` | map | Per-adapter: `{ consecutiveFailures: number, disabledAt: Timestamp \| null }` |
| `modifiedOn` | Timestamp | Last config change |

**Why platformSummary?** Follows existing Canonica pattern (branding, coverage KPI). No new collection. Config is small (<2KB). Read once per event dispatch.

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

### 5.1 — Event Bus (`functions-canonica/src/integrations/eventBus.ts`)

**Purpose:** Single function to emit integration events from any Canonica flow.

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
1. Feature flag check (`ENABLE_CANONICA_WORKFLOW_INTEGRATIONS`)
2. Write document to `canonica_integrationEvents` with `status: 'pending'`
3. Fire-and-forget — errors logged, never thrown
4. Cloud Function `processIntegrationEvent` triggers on `onCreate`

**Wiring points (nightly batch):**
- After Step 1 (drift detection) → emit `drift_detected` for each new drift
- After Step 3 (signal mutation) → emit `mutation_proposed` for each new proposal
- After Step 4 (coverage KPI) → emit `coverage_drop` if below threshold
- After Step 5 (fallback detection) → emit `knowledge_gap_detected` for new gaps
- End of nightly run → emit `nightly_summary`

**Wiring points (real-time):**
- Governance UI: approve mutation → emit `article_approved`

### 5.2 — Event Processor (`functions-canonica/src/integrations/eventProcessor.ts`)

**Purpose:** Cloud Function triggered by `onCreate` on `canonica_integrationEvents`.

**Flow:**
1. Read event document
2. Read tenant integration config from `platformSummary/integrationConfig_{tId}_{sId}`
3. For each enabled adapter where event type matches filter:
   a. Format payload via adapter
   b. Attempt delivery
   c. Log result to `canonica_integrationDeliveryLogs`
   d. If failed: schedule retry (up to 3 attempts)
4. Update event status to `'delivered'` or `'failed'`

**Retry strategy:** Exponential backoff with jitter
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
    event: CanonicaIntegrationEvent,
    config: AdapterConfig,
  ): Promise<DeliveryResult>;
  
  formatPayload(event: CanonicaIntegrationEvent): any;
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
**Auth:** Bearer token (Linear API key from config)
**Operation:** `issueCreate` mutation
**Timeout:** 15 seconds
**Mapping:**
- Title: `[Canonica] {eventType}: {entityName}`
- Description: Markdown with full event details
- Priority: severity → Linear priority (critical→1, high→2, medium→3, low→4)
- Label: `canonica`

### 5.7 — GitHub Adapter

**Method:** REST API (`POST /repos/{owner}/{repo}/issues`)
**Auth:** Bearer token (GitHub PAT from config)
**Timeout:** 15 seconds
**Mapping:**
- Title: `[Canonica] {eventType}: {entityName}`
- Body: GitHub Markdown with full event details
- Labels: `['canonica', eventType]`

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
- Follows existing Canonica pattern (branding, coverage KPI use platformSummary)
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

### ADR-4: Runs in Canonica Firebase Project

**Decision:** Event processor Cloud Function runs in `functions-canonica/`, not `functions/`.

**Why?**
- Follows multi-product separation playbook
- Events originate from Canonica nightly batch (same project)
- No cross-project Firestore reads needed
- Config and events in same Firestore project = cheaper

### ADR-5: No Real-Time Streaming (Firestore Listeners)

**Decision:** Use onCreate trigger, not Firestore onSnapshot listeners.

**Why?**
- onCreate fires once per event (predictable cost)
- onSnapshot keeps connections open (unpredictable cost at scale)
- Delivery latency of <5 seconds is acceptable for governance events
- Matches industry pattern (Stripe, GitHub, Intercom all use async delivery)

### ADR-6: Secrets in Environment Variables

**Decision:** API keys (Linear, GitHub) stored as environment variables on Cloud Functions, NOT in Firestore.

**Wait — but config is in Firestore?**
The config document stores `enabled`, `eventFilters`, `teamId`, `owner`, `repo` — non-sensitive settings. The actual API keys/tokens are stored as Firebase Functions secrets (encrypted at rest, injected at runtime). The config doc stores a boolean `hasApiKey: true` to indicate whether the secret exists.

**Why?**
- Firestore is not designed for secret storage (no encryption at rest for field-level)
- Firebase Functions secrets use Google Cloud Secret Manager (AES-256)
- Follows security best practice from Canonica SECURITY_IMPLEMENTATION_RULES

**Implementation:**
- Slack: Webhook URL contains token (stored in config — acceptable, Slack's own recommendation)
- Linear: API key → `CANONICA_LINEAR_API_KEY_{tId}_{sId}` env var
- GitHub: PAT → `CANONICA_GITHUB_TOKEN_{tId}_{sId}` env var
- Email: Uses existing SMTP env vars (no new secrets)

**Scale limitation:** Environment variables don't scale to 1000+ tenants with unique keys. At that scale, migrate to Google Cloud Secret Manager API with runtime lookup. For v1 (<100 tenants), env vars are sufficient and simpler.

---

## §7 — Nightly Batch Integration

The event bus hooks into the existing nightly batch as **Step 13** (after all existing 12 steps):

```
Existing Steps 1-12 (unchanged)
     │
     ▼
Step 13: Integration Event Emission
  - Collect results from Steps 1-5
  - Emit drift_detected events (from Step 1 results)
  - Emit mutation_proposed events (from Step 3/5 results)
  - Emit coverage_drop event (from Step 4, if below threshold)
  - Emit knowledge_gap_detected events (from Step 5 results)
  - Emit nightly_summary event (aggregate results)
```

**Cost:** Zero additional Firestore reads. Events are generated from data already loaded in Steps 1-5. Only new writes are the integration event documents.

---

## §8 — Rate Limiting & Cost Protection

| Constraint | Value | Rationale |
|-----------|-------|-----------|
| Max events per nightly run per tenant | 50 | Prevents noisy tenants from flooding |
| Max delivery attempts per event | 3 | Industry standard (Stripe, GitHub) |
| Max events per minute per adapter | 20 | Prevents external API rate limit hits |
| Circuit breaker threshold | 10 consecutive failures | Auto-disables broken integrations |
| Circuit breaker cooldown | 24 hours | Reasonable recovery window |
| Event TTL | 90 days | Auto-cleanup, prevents unbounded growth |
| Delivery log TTL | 90 days | Same as events |
| Email rate limit | 20/day per recipient | Reuses existing notification limit |

---

## §9 — Observability

### Logging
- Every event emission: `[Canonica Integration] Emitted: {eventType} for {tId}/{sId}`
- Every delivery attempt: `[Canonica Integration] Delivery: {adapter} {status} for {eventId}`
- Circuit breaker changes: `[Canonica Integration] Circuit breaker {opened/closed} for {adapter} {tId}/{sId}`

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
1. `functions-canonica/src/integrations/types.ts`
2. `functions-canonica/src/integrations/eventBus.ts`
3. `functions-canonica/src/integrations/eventProcessor.ts`
4. `functions-canonica/src/integrations/configStore.ts`
5. `functions-canonica/src/integrations/deliveryLogger.ts`
6. `functions-canonica/src/integrations/adapters/IAdapter.ts`
7. `functions-canonica/src/integrations/adapters/slackAdapter.ts`
8. `functions-canonica/src/integrations/adapters/emailAdapter.ts`

**Files to modify:**
1. `functions-canonica/src/constants/database.ts` — add 2 collections
2. `functions-canonica/src/constants/features.ts` — add flag
3. `functions-canonica/src/index.ts` — export processIntegrationEvent
4. `functions-canonica/src/canonica/canonicaNightly.ts` — add Step 13
5. `src/constants/database.ts` — add 2 collections (mirror)
6. `src/config/features.ts` — add flag
7. `src/types/canonica/index.ts` — add integration types

**Frontend (config UI):**
8. `src/database/canonica/integrations.ts` — config DAL
9. `src/components/templates/canonica/IntegrationSettings.tsx` — settings UI

### Phase 2: Tier B Adapters (Session 2)

1. `functions-canonica/src/integrations/adapters/linearAdapter.ts`
2. `functions-canonica/src/integrations/adapters/githubAdapter.ts`

---

## §11 — Backwards Compatibility

| Concern | Impact |
|---------|--------|
| Existing nightly batch | Zero change to Steps 1-12. Step 13 is additive, feature-flagged. |
| Existing Canonica types | Additive types only. No modification to frozen interfaces. |
| Existing collections | Zero changes. 2 new collections added. |
| Existing feature flags | No changes. New flag added. |
| Existing email notifications | Completely separate system. Integration email adapter is for governance events, notification system is for ticket events. |

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-09 | 1.0.0 | Initial implementation blueprint |
