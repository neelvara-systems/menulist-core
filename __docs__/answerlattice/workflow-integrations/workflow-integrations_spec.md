# Answerlattice — External Workflow Integrations — Spec

> **Version:** 1.1.1
> **Last Updated:** 2026-05-24
> **Audience:** CEO / PM / Clients
> **Feature Flag:** `ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS`

---

## §1 — Problem Statement

SaaS founders using Answerlattice need to know when:
- Knowledge drift is detected (answer may be stale)
- A mutation proposal is created (signal cluster → new or updated answer needed)
- AI repeatedly fails to resolve a query (knowledge gap)
- Canonical coverage drops below threshold
- An article is approved and published

Today, these events are visible only inside the Answerlattice governance dashboard. Founders must log into Answerlattice to see them. This creates a monitoring burden that contradicts Answerlattice's "infrastructure that runs silently" identity.

**The solution:** Push bounded digest and critical review events into tools founders already use — Slack channels and email inboxes. Linear/GitHub issue creation remains controlled rollout until per-tenant secret handling is self-service safe.

---

## §2 — Core Principle

**Answerlattice is an event producer. Not a workflow orchestrator.**

| Answerlattice Does | Answerlattice Does NOT |
|---------------|-------------------|
| Emit structured events when governance state changes | Build Slack bots or chatbots |
| Deliver events to configured endpoints | Orchestrate multi-step workflows |
| Log delivery success/failure | Sync data bidirectionally |
| Allow founders to filter which events go where | Build automation builders (Zapier-style) |
| Retry failed deliveries (3 attempts) | Maintain external tool state |

This keeps the system small, durable, and aligned with the 3-year architecture freeze.

---

## §3 — Event Types (v1)

Only high-value governance events. Not raw signal noise.

| Event Type | Source | When | Priority |
|-----------|--------|------|----------|
| `drift_detected` | Nightly batch (Step 1) | Canonical answer flagged with drift | High |
| `mutation_proposed` | Nightly batch (Step 3/5) | Signal cluster → new mutation proposal created | High |
| `knowledge_gap_detected` | Nightly batch (Step 5) | 5+ recurring fallbacks for same entity, no canonical answer | High |
| `coverage_drop` | Nightly batch (Step 4) | Canonical coverage KPI drops below 60% | Critical |
| `article_approved` | Governance UI action | Mutation proposal approved → canonical answer created/updated | Medium |
| `ai_failure_recurring` | Nightly batch analysis | Tenant has repeated AI-generation/draft failures in a nightly run | High |
| `nightly_summary` | End of nightly batch | Summary of all nightly actions (drift, proposals, coverage) | Low |

**Event payload structure (universal):**

```json
{
  "eventId": "evt_abc123",
  "eventType": "drift_detected",
  "timestamp": 1741521600,
  "tId": 14,
  "sId": 15,
  "severity": "high",
  "payload": {
    "answerId": "ans_xyz",
    "answerTitle": "How to configure webhooks",
    "driftClass": "signal_anomaly",
    "driftReason": "Negative feedback rate 12% exceeds 8% threshold",
    "entityName": "Webhook API",
    "entityType": "feature"
  }
}
```

All payloads include: `eventId`, `eventType`, `timestamp`, `tId`, `sId`, `severity`. The `payload` object varies by event type.

---

## §4 — Supported Integrations (v1)

### 4.1 — Slack (Tier A — Must Have)

**Purpose:** Instant team awareness of governance events.

**Delivery method:** Incoming Webhook URL (no Slack app installation required).

**Message format:** Slack Block Kit with:
- Header: emoji + event title
- Section: key details (entity, drift class, coverage %)
- Context: severity badge + timestamp
- Action button: link to Answerlattice governance dashboard

**Example notification:**
```
🔴 Drift Detected: Webhook API
Answer "How to configure webhooks" has signal anomaly.
Negative feedback rate: 12% (threshold: 8%)
Severity: HIGH | 2026-03-09 03:00 UTC
[View in Answerlattice →]
```

### 4.2 — Email (Tier A — Must Have)

**Purpose:** Universal fallback for founders not using Slack. Also weekly digest delivery.

**Delivery method:** SMTP (reuses existing nodemailer infrastructure from lifecycle messaging).

**Use cases:**
- Real-time: critical events (coverage_drop, ai_failure_recurring)
- Batch: nightly_summary delivered as digest email

**Rate limit:** Max 50 deliveries per tenant/adapter/day plus max 20 integration emails per recipient/day.

### 4.3 — Linear (Tier B — Controlled Rollout)

**Purpose:** Convert friction signals into engineering backlog items.

**Delivery method:** Linear GraphQL API (issue creation), not exposed in owner settings until the credential lifecycle is production-ready.

**Trigger events:** `mutation_proposed`, `knowledge_gap_detected`, `ai_failure_recurring`

**Issue format:**
- Title: `[Answerlattice] {event type}: {entity name}`
- Description: Full event details + link to Answerlattice
- Priority: Mapped from severity (critical → urgent, high → high, medium → normal)
- Labels: `answerlattice`, `knowledge-gap` or `drift`

### 4.4 — GitHub (Tier B — Controlled Rollout)

**Purpose:** Convert product friction into engineering issues.

**Delivery method:** GitHub REST API (issue creation), not exposed in owner settings until the credential lifecycle is production-ready.

**Trigger events:** Same as Linear.

**Issue format:** Same structure as Linear but in GitHub Markdown.

---

## §5 — User Stories

### 5.1 — Founder (Primary User)

> "As a SaaS founder, I want to receive a Slack notification when Answerlattice detects drift in a canonical answer, so I can review and fix it without logging into the Answerlattice dashboard."

> "As a SaaS founder, I want to receive a weekly email digest summarizing all Answerlattice governance activity, so I have passive awareness without active monitoring."

> "As a SaaS founder, I want to configure which events go to which integration, so I'm not overwhelmed with notifications I don't care about."

### 5.2 — Engineering Lead (Controlled Rollout)

> "As an engineering lead in controlled rollout, I want knowledge gap events to create Linear issues after credential setup is approved, so recurring support friction can become engineering backlog without manual triage."

> "As an engineering lead in controlled rollout, I want to filter issue creation to only `knowledge_gap_detected` and `ai_failure_recurring`, so my backlog isn't polluted with non-engineering events."

### 5.3 — Support Manager

> "As a support manager, I want Slack alerts when canonical coverage drops below 60%, so I know the knowledge base needs urgent attention."

---

## §6 — Configuration UX

### 6.1 — Settings Location

Answerlattice Dashboard → Settings → Integrations tab

### 6.2 — Per-Integration Configuration

Each integration card shows:
- **Enable/Disable toggle**
- **Connection details** (webhook URL for Slack, recipients for Email)
- **Event filter** — checkboxes for which event types to receive
- **Send Test Notification** — queues one controlled test event that honors the selected event filters
- **Delivery health** — sanitized last success/failure/rate-limit status from the compact health summary

### 6.3 — Default Configuration

When a founder enables an integration:
- `nightly_summary`, `coverage_drop`, and `ai_failure_recurring` are enabled by default
- Founder can deselect event types they don't want
- Minimum: at least 1 event type must remain enabled

---

## §7 — Safety & Guardrails

| Guardrail | Implementation |
|-----------|---------------|
| Rate limiting | Max 20 events per minute per integration per tenant |
| Retry cap | 3 retries with exponential backoff (1s, 4s, 16s), then drop |
| Secret storage | Raw webhook/token config stays server-side and is never returned by owner-facing APIs |
| Payload sanitization | No PII in event payloads (no user emails, no ticket content) |
| Circuit breaker | After 10 consecutive failures, disable integration + alert founder |
| Delivery logging | Every attempt logged (success/failure/retry count/error) |
| Retention | Events, delivery logs, and rate counters use Firestore TTL |
| Cost cap | Nightly emits at most one digest plus one critical coverage event per active tenant by default |
| Feature flag | `ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS` — enabled with caps, circuit breaker, and sanitized delivery |

---

## §8 — What Must NOT Exist (Permanent Exclusions)

Per Answerlattice Non-Goals Charter (doctrine/02):

- ❌ Bidirectional sync with any external tool
- ❌ Slack chatbots or interactive message handlers
- ❌ GitHub comment bots or PR review automation
- ❌ Notion sync engines
- ❌ Workflow automation builder (trigger → condition → action chains)
- ❌ Custom webhook endpoints for arbitrary URLs (v1 — only known adapters)
- ❌ Event replay UI (events are append-only, debugging via logs)

---

## §9 — Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Integration adoption rate | 40% of active tenants enable ≥1 integration within 30 days | Config store query |
| Event delivery success rate | >99% | Delivery log aggregation |
| Mean time to awareness | <5 minutes after scheduler/test event emission | Event timestamp vs delivery timestamp |
| Nightly digest open rate | >30% | Email tracking (if implemented) |
| Test notification success rate | >95% for configured Slack/email workspaces | Delivery health summary |

---

## §10 — Phased Rollout

| Phase | Scope | Timeline |
|-------|-------|----------|
| **Phase 1** | Event Bus + Slack + Email adapters + settings UI + test notification | Implemented |
| **Controlled rollout** | Linear + GitHub adapters | Adapter code exists; self-service UI deferred for secret lifecycle |
| **Future** | Notion adapter, custom webhook URLs | Only if demand proven |

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-24 | 1.1.1 | Aligned repeated-AI-failure trigger wording and daily adapter delivery caps with runtime. |
| 2026-05-24 | 1.1.0 | Updated production scope to Slack/email, added test notification, health summary, TTL, digest-first event caps, and controlled-rollout status for issue trackers. |
| 2026-03-09 | 1.0.0 | Initial spec from ChatGPT analysis + codebase audit + web research |
