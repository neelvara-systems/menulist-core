# Canonica — External Workflow Integrations — Spec

> **Version:** 1.0.0
> **Last Updated:** 2026-03-09
> **Audience:** CEO / PM / Clients
> **Feature Flag:** `ENABLE_CANONICA_WORKFLOW_INTEGRATIONS`

---

## §1 — Problem Statement

SaaS founders using Canonica need to know when:
- Knowledge drift is detected (answer may be stale)
- A mutation proposal is created (signal cluster → new or updated answer needed)
- AI repeatedly fails to resolve a query (knowledge gap)
- Canonical coverage drops below threshold
- An article is approved and published

Today, these events are visible only inside the Canonica governance dashboard. Founders must log into Canonica to see them. This creates a monitoring burden that contradicts Canonica's "infrastructure that runs silently" identity.

**The solution:** Push structured events into tools founders already use — Slack channels, email inboxes, Linear boards, GitHub issues.

---

## §2 — Core Principle

**Canonica is an event producer. Not a workflow orchestrator.**

| Canonica Does | Canonica Does NOT |
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
| `ai_failure_recurring` | Nightly batch analysis | Same entity fails AI resolution 10+ times in 7 days | High |
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
- Action button: link to Canonica governance dashboard

**Example notification:**
```
🔴 Drift Detected: Webhook API
Answer "How to configure webhooks" has signal anomaly.
Negative feedback rate: 12% (threshold: 8%)
Severity: HIGH | 2026-03-09 03:00 UTC
[View in Canonica →]
```

### 4.2 — Email (Tier A — Must Have)

**Purpose:** Universal fallback for founders not using Slack. Also weekly digest delivery.

**Delivery method:** SMTP (reuses existing nodemailer infrastructure from lifecycle messaging).

**Use cases:**
- Real-time: critical events (coverage_drop, ai_failure_recurring)
- Batch: nightly_summary delivered as digest email

**Rate limit:** Max 20 integration emails per recipient per day (same as existing notification system).

### 4.3 — Linear (Tier B — Valuable)

**Purpose:** Convert friction signals into engineering backlog items.

**Delivery method:** Linear GraphQL API (issue creation).

**Trigger events:** `mutation_proposed`, `knowledge_gap_detected`, `ai_failure_recurring`

**Issue format:**
- Title: `[Canonica] {event type}: {entity name}`
- Description: Full event details + link to Canonica
- Priority: Mapped from severity (critical → urgent, high → high, medium → normal)
- Labels: `canonica`, `knowledge-gap` or `drift`

### 4.4 — GitHub (Tier B — Valuable)

**Purpose:** Convert product friction into engineering issues.

**Delivery method:** GitHub REST API (issue creation).

**Trigger events:** Same as Linear.

**Issue format:** Same structure as Linear but in GitHub Markdown.

---

## §5 — User Stories

### 5.1 — Founder (Primary User)

> "As a SaaS founder, I want to receive a Slack notification when Canonica detects drift in a canonical answer, so I can review and fix it without logging into the Canonica dashboard."

> "As a SaaS founder, I want to receive a weekly email digest summarizing all Canonica governance activity, so I have passive awareness without active monitoring."

> "As a SaaS founder, I want to configure which events go to which integration, so I'm not overwhelmed with notifications I don't care about."

### 5.2 — Engineering Lead

> "As an engineering lead, I want knowledge gap events to automatically create Linear issues, so recurring support friction becomes engineering backlog without manual triage."

> "As an engineering lead, I want to filter Linear issues to only `knowledge_gap_detected` and `ai_failure_recurring`, so my backlog isn't polluted with non-engineering events."

### 5.3 — Support Manager

> "As a support manager, I want Slack alerts when canonical coverage drops below 60%, so I know the knowledge base needs urgent attention."

---

## §6 — Configuration UX

### 6.1 — Settings Location

Canonica Dashboard → Settings → Integrations tab

### 6.2 — Per-Integration Configuration

Each integration card shows:
- **Enable/Disable toggle**
- **Connection details** (webhook URL for Slack, API key for Linear/GitHub, email for Email)
- **Event filter** — checkboxes for which event types to receive
- **Test button** — sends a test event to verify connection

### 6.3 — Default Configuration

When a founder enables an integration:
- All event types enabled by default
- Founder can deselect event types they don't want
- Minimum: at least 1 event type must remain enabled

---

## §7 — Safety & Guardrails

| Guardrail | Implementation |
|-----------|---------------|
| Rate limiting | Max 20 events per minute per integration per tenant |
| Retry cap | 3 retries with exponential backoff (1s, 4s, 16s), then drop |
| Secret storage | API keys/tokens in environment variables, NOT Firestore |
| Payload sanitization | No PII in event payloads (no user emails, no ticket content) |
| Circuit breaker | After 10 consecutive failures, disable integration + alert founder |
| Delivery logging | Every attempt logged (success/failure/retry count/error) |
| Feature flag | `ENABLE_CANONICA_WORKFLOW_INTEGRATIONS` — OFF by default |

---

## §8 — What Must NOT Exist (Permanent Exclusions)

Per Canonica Non-Goals Charter (doctrine/02):

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
| Mean time to awareness | <5 minutes for real-time events | Event timestamp vs delivery timestamp |
| Nightly digest open rate | >30% | Email tracking (if implemented) |
| Linear/GitHub issue creation rate | >80% delivery success | Delivery logs for Linear/GitHub adapters |

---

## §10 — Phased Rollout

| Phase | Scope | Timeline |
|-------|-------|----------|
| **Phase 1** | Event Bus + Slack + Email adapters | Implementation session 1 |
| **Phase 2** | Linear + GitHub adapters | Implementation session 2 |
| **Phase 3** | Nightly digest email (weekly summary) | After Phase 1 proven |
| **Future** | Notion adapter, custom webhook URLs | Only if demand proven |

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-09 | 1.0.0 | Initial spec from ChatGPT analysis + codebase audit + web research |
