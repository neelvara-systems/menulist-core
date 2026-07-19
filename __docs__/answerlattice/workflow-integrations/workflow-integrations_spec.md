# Answerlattice — External Workflow Integrations — Spec

> **Version:** 1.3.0
> **Last Updated:** 2026-07-19
> **Audience:** CEO / PM / Clients
> **Feature Flag:** `ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS`

---

## §1 — Problem Statement

SaaS founders using Answerlattice need passive awareness when the current runtime records:
- a nightly governance summary after bounded maintenance work;
- repeated AI workflow failures that require review;
- canonical coverage below the configured threshold.

Without a configured destination, these events remain dashboard or nightly-run evidence. Founders must remember to inspect Answerlattice to see them, creating avoidable monitoring work.

**The solution:** Push those bounded digest and critical review events into tools founders already use — Slack channels and email inboxes. Other event schemas remain formatter/filter contracts without direct producers. Linear/GitHub issue creation remains controlled rollout until per-tenant secret handling is self-service safe.

---

## §2 — Core Principle

**Answerlattice is an event producer. Not a workflow orchestrator.**

| Answerlattice Does | Answerlattice Does NOT |
|---------------|-------------------|
| Emit structured events when governance state changes | Build Slack bots or chatbots |
| Deliver events to configured endpoints | Orchestrate multi-step workflows |
| Log delivery success/failure | Sync data bidirectionally |
| Allow founders to filter which events go where | Build automation builders (Zapier-style) |
| Apply provider-specific bounded retry rules | Maintain or reconcile external tool state |

This keeps the system small, durable, and aligned with the 3-year architecture freeze.

---

## §3 — Event Types (v1)

Only high-value governance events. Not raw signal noise.

| Event Type | Source | When | Priority |
|-----------|--------|------|----------|
| `drift_detected` | Adapter-supported schema; no active direct producer | Reserved for an explicitly wired controlled flow; nightly summary carries aggregate drift counts | High |
| `mutation_proposed` | Adapter-supported schema; no active direct producer | Reserved for an explicitly wired controlled flow; nightly summary carries proposal counts | High |
| `knowledge_gap_detected` | Adapter-supported schema; no active direct producer | Reserved for an explicitly wired controlled flow | High |
| `coverage_drop` | Nightly batch (Step 4) | Canonical coverage KPI drops below 60% | Critical |
| `article_approved` | Adapter-supported schema; no active direct producer | Reserved for an explicitly wired controlled flow | Medium |
| `ai_failure_recurring` | Nightly batch analysis | Tenant has repeated AI-generation/draft failures in a nightly run | High |
| `nightly_summary` | End of nightly batch | Summary of all nightly actions (drift, proposals, coverage) | Low |

Current automated production emissions are `coverage_drop`, `ai_failure_recurring`, and `nightly_summary`, plus the owner-controlled test event. The other schemas remain formatter/filter contracts only and must not be marketed as live direct notifications until a producer is wired and tested.

**Event payload structure (universal):**

```json
{
  "eventType": "drift_detected",
  "createdAt": "Firestore Timestamp",
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

The Firestore document ID is the event ID; it is not duplicated as an `eventId` field. Every event stores `pId: 'AL'`, `eventType`, `createdAt`, `tId`, `sId`, `severity`, `payload`, and lifecycle `status`. Deterministic nightly emissions also store a payload-bound idempotency fingerprint. The `payload` object varies by event type.

---

## §4 — Supported Integrations (v1)

### 4.1 — Slack (Tier A — Must Have)

**Purpose:** Team awareness of bounded governance events after the workspace nightly run or an owner test.

**Delivery method:** Incoming Webhook URL (no Slack app installation required).

**Message format:** Slack Block Kit with:
- Header: emoji + event title
- Section: key details (entity, drift class, coverage %)
- Context: severity badge + timestamp
- Fixed fallback notification text for clients that do not render Block Kit
- Dynamic values escape Slack control characters and use `verbatim: true`; event content cannot create a channel/user mention or injected angle-bracket link

**Example notification:**
```
🔴 Drift Detected: Webhook API
Answer "How to configure webhooks" has signal anomaly.
Negative feedback rate: 12% (threshold: 8%)
Severity: HIGH | 2026-03-09 03:00 UTC
```

This is a formatter example for the reserved direct drift schema. The current owner-facing production flow reports aggregate drift counts in `nightly_summary`; it does not emit this direct notification or a dashboard action link.

### 4.2 — Email (Tier A — Must Have)

**Purpose:** Universal fallback for founders not using Slack. Also nightly digest delivery.

**Delivery method:** SMTP (reuses existing nodemailer infrastructure from lifecycle messaging).

**Use cases:**
- Separate higher-priority nightly-run events: `coverage_drop`, `ai_failure_recurring`
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

> "As a SaaS founder, I want a nightly Slack or email summary when Answerlattice records drift or review movement, so I know whether the dashboard needs attention."

> "As a SaaS founder, I want to receive a nightly email digest when the scheduler records governance activity, so I have passive awareness without active monitoring."

> "As a SaaS founder, I want to configure which events go to which integration, so I'm not overwhelmed with notifications I don't care about."

### 5.2 — Engineering Lead (Controlled Rollout)

> "As an engineering lead in controlled rollout, I want knowledge gap events to create Linear issues after credential setup is approved, so recurring support friction can become engineering backlog without manual triage."

> "As an engineering lead in controlled rollout, I want to filter issue creation to only `knowledge_gap_detected` and `ai_failure_recurring`, so my backlog isn't polluted with non-engineering events."

### 5.3 — Support Manager

> "As a support manager, I want Slack alerts when canonical coverage drops below 60%, so I know the knowledge base needs urgent attention."

---

## §6 — Configuration UX

### 6.1 — Settings Location

Answerlattice Dashboard → Support Control → Workflow Notifications

### 6.2 — Per-Integration Configuration

Each integration card shows:
- **Enable/Disable toggle**
- **Connection details** (webhook URL for Slack, recipients for Email)
- **Event filter** — selectors for the three active producers only: `coverage_drop`, `ai_failure_recurring`, and `nightly_summary`
- **Send Test Notification** — queues one controlled test event to every saved, enabled Slack/email destination even when ordinary `nightly_summary` delivery is filtered out
- **Delivery health** — sanitized last success/failure/rate-limit status from the compact health summary

### 6.3 — Default Configuration

When a founder enables an integration:
- `nightly_summary`, `coverage_drop`, and `ai_failure_recurring` are enabled by default
- Founder can deselect event types they do not want
- An empty submitted filter list is normalized back to the three active defaults; the owner UI does not expose reserved formatter-only event types

---

## §7 — Safety & Guardrails

| Guardrail | Implementation |
|-----------|---------------|
| Rate limiting | Max 20 events per minute per integration per tenant |
| Retry cap | At most 3 total adapter attempts (initial + delays of 1s and 4s) when that adapter marks the response retryable. Slack retries `5xx`; Slack `429` is retained as provider status and is not replayed with a fixed delay. |
| Secret storage | The raw Slack webhook is returned neither by the API nor direct Firestore client reads, including platform-admin browser clients. Email runtime uses Answerlattice-scoped `ANSWERLATTICE_SMTP_*` secrets. Application-level per-tenant encryption is not claimed. |
| Payload sanitization | Active automated payloads contain bounded workspace operational aggregates and fixed failure-phase labels, not ticket bodies or user email addresses. Sanitization removes secret-like keys and bounds values; it is not a general PII detector. Reserved source-text schemas require a separate privacy review before activation. |
| Email recipient admission | All normalized configured recipients are admitted in one transaction. If any recipient is at the daily cap, nobody receives a partial notification and no recipient counter is consumed. |
| Slack text safety | Dynamic `&`, `<`, and `>` are entity-encoded and automatic parsing is disabled for the `mrkdwn` detail block |
| Circuit breaker | After 10 consecutive failures, open the adapter circuit, show owner-safe delivery health, and permit one serialized recovery probe after the 24-hour cooldown |
| Delivery logging | Every attempt logged (success/failure/retry count/error) |
| Retention | Events, delivery logs, and rate counters use Firestore TTL |
| Cost cap | Nightly emits at most one digest, one critical coverage event, and one recurring-AI-failure event per active tenant |
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
- ❌ Event replay UI (event facts remain immutable while lifecycle status advances; debugging uses delivery logs)

---

## §9 — Validation Metrics

These are launch-validation measures, not achieved performance claims. Product instrumentation and real provider delivery evidence must establish targets.

| Metric | Target | How Measured |
|--------|--------|-------------|
| Integration activation rate | Observe; set a target after founder pilot evidence | Saved enabled config plus successful test health |
| Event delivery success rate | Validate before publishing a target | Delivery log aggregation |
| Time from event to provider acceptance | Validate before publishing a target | Event timestamp vs successful attempt timestamp |
| Email provider-acceptance rate | Validate after SMTP is configured | Delivery log and compact health summary; no inbox/open claim |
| Test notification success rate | Validate with real configured Slack/email workspaces | Delivery health summary plus external receipt confirmation |

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
| 2026-07-19 | 1.3.0 | Added the dedicated permission-gated route, browser-denied secret config, strict response contracts, nested health, atomic all-recipient email admission, provider-specific Slack retry behavior, active-producer-only filters, and validation rather than achieved metric targets. |
| 2026-07-13 | 1.2.0 | Aligned active producer coverage, event identity, three-total-attempt retry semantics, partial-delivery failure, circuit-probe serialization, and separate-project SMTP secret requirements with runtime. |
| 2026-05-24 | 1.1.1 | Aligned repeated-AI-failure trigger wording and daily adapter delivery caps with runtime. |
| 2026-05-24 | 1.1.0 | Updated production scope to Slack/email, added test notification, health summary, TTL, digest-first event caps, and controlled-rollout status for issue trackers. |
| 2026-03-09 | 1.0.0 | Initial spec from ChatGPT analysis + codebase audit + web research |
