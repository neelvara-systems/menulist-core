# Answerlattice — External Workflow Integrations

> **Status:** ✅ IMPLEMENTED — Enabled with guards
> **Version:** 1.2.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-07-13
> **Feature Flag:** `ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS` (enabled)
> **Expansion Item:** #7 in [answerlattice-expansion-tracker.md](../answerlattice-expansion-tracker.md)
> **Doctrine Check:** ✅ Allowed — Freeze §2 explicitly permits "New integrations without breaking invariants"

---

## What This Feature Is

An **outbound event delivery system** that exports structured Answerlattice governance events into external tools where SaaS teams already work. Self-service production setup supports Slack and email. Linear/GitHub issue adapters exist for controlled rollout, but are not owner-configurable until the per-tenant secret lifecycle is production-ready.

Answerlattice = **event producer only**. It never embeds external workflows. It never becomes a workflow orchestration platform.

---

## What This Feature Is NOT

- ❌ NOT a Slack chatbot or bidirectional sync
- ❌ NOT a workflow automation builder (no Zapier-style logic)
- ❌ NOT a GitHub comment bot or PR reviewer
- ❌ NOT a Notion sync engine
- ❌ NOT a replacement for the existing ticket notification system
- ❌ NOT expanding into project management or team communication

---

## Architecture Summary

```
Answerlattice Governance Events (nightly scheduler + owner test route)
     │
     ▼
Integration Event Bus (answerlattice_integrationEvents collection)
     │
     ▼
Cloud Function: processIntegrationEvent (onCreate trigger)
     │
     ├── Slack Adapter    → Webhook POST (Block Kit message)
     ├── Email Adapter    → SMTP send (reuses existing nodemailer)
     ├── Linear Adapter   → GraphQL API (controlled rollout)
     └── GitHub Adapter   → REST API (controlled rollout)
     │
     ▼
Delivery Log (answerlattice_integrationDeliveryLogs)
```

**4 internal components:**

1. Integration Event Bus (immutable event facts with transactional lifecycle fields)
2. Integration Config Store (per-tenant settings)
3. Adapter Library (stateless, pluggable)
4. Delivery + Retry System (Cloud Function + logs)

---

## Documents

| Document                                                                             | Audience          | Purpose                                               |
| ------------------------------------------------------------------------------------ | ----------------- | ----------------------------------------------------- |
| [README.md](./README.md)                                                             | Everyone          | This file — overview + navigation                     |
| [workflow-integrations_spec.md](./workflow-integrations_spec.md)                     | CEO / PM          | Business requirements, user stories, event types      |
| [workflow-integrations_impl.md](./workflow-integrations_impl.md)                     | Developers        | Technical blueprint, data model, file structure, ADRs |
| [workflow-integrations_firebase.md](./workflow-integrations_firebase.md)             | Developers        | Firestore schema, cost analysis, indexes              |
| [workflow-integrations_marketing.md](./workflow-integrations_marketing.md)           | Sales / Marketing | Pitch points, competitive positioning                 |
| [workflow-integrations_website.md](./workflow-integrations_website.md)               | Website           | Landing page content, SEO meta                        |
| [workflow-integrations_helpdoc.md](./workflow-integrations_helpdoc.md)               | Customers         | Setup guide, troubleshooting                          |
| [workflow-integrations_mobile-support.md](./workflow-integrations_mobile-support.md) | Engineering       | Mobile assessment (4-gate test)                       |
| [\_archive/chatgpt-review.md](./_archive/chatgpt-review.md)                          | Internal          | ChatGPT conversation critical review                  |

---

## Key Decisions (Locked)

| #   | Decision                                                                   | Rationale                                            |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | **Event producer only** — no bidirectional sync, no workflow orchestration | Protects 3-year freeze. Prevents bloat.              |
| 2   | **2 self-service adapters at launch** — Slack and Email; Linear/GitHub controlled rollout | Avoids half-safe issue tracker token handling while keeping adapter code ready. |
| 3   | **Immutable event facts + lifecycle status** — identity/payload stay fixed; processing status advances transactionally | Preserves the trigger contract while making delivery state observable. |
| 4   | **Cloud Function onCreate trigger** — not polling                          | Zero cost when idle. Scales automatically.           |
| 5   | **Per-tenant config** — event filters per integration                      | Founders control what goes where. No spam.           |
| 6   | **3 total attempts for explicit retryable responses** — each attempt has a deterministic create-only audit row | Bounds provider work without blindly replaying ambiguous deliveries; external provider actions are not claimed to be exactly-once. |
| 7   | **Reuses existing SMTP** — same nodemailer as lifecycle messaging          | Zero new infrastructure for email.                   |
| 8   | **Secrets stay server-side** — raw webhook/token config is not returned to the browser | Owner setup without public secret exposure.          |
| 9   | **Runs in Answerlattice Firebase project** — functions-answerlattice/                | Follows multi-product separation playbook.           |
| 10  | **Feature-flagged and enabled with guards**                                | Event caps, circuit breakers, and sanitized delivery keep rollout bounded. |

---

## Tier Classification

| Tier              | Adapter                 | Justification                                                                           |
| ----------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| **A — Must Have** | Slack, Email, Event Bus | 90%+ of SaaS teams use Slack. Email is universal fallback. Event bus is infrastructure. |
| **B — Controlled rollout** | Linear, GitHub | Engineering teams. Keep adapters behind platform-controlled setup until secret lifecycle is ready. |
| **C — Future**    | Notion                  | Niche. Most teams skip this. Deferred indefinitely.                                     |

---

## Dependencies

- Answerlattice nightly scheduler (event source for governance events)
- Owner test route (controlled persisted event source)
- Answerlattice-scoped SMTP secrets (`ANSWERLATTICE_SMTP_*`)
- Answerlattice Firestore project (separate from MenuList)

---

## Cost Profile

| Scale         | Events/month | Firestore Cost | CF Cost | Total      |
| ------------- | ------------ | -------------- | ------- | ---------- |
| 10 tenants    | ~1,000       | ~$0.01         | ~$0.01  | **~$0.02** |
| 100 tenants   | ~10,000      | ~$0.08         | ~$0.05  | **~$0.13** |
| 1,000 tenants | ~100,000     | ~$0.80         | ~$0.50  | **~$1.30** |

Negligible. Dominated by low-volume Slack/email delivery and the separately provisioned SMTP provider cost.

---

## Version History

| Date       | Version | Change                                                                      |
| ---------- | ------- | --------------------------------------------------------------------------- |
| 2026-07-13 | 1.2.0 | Reconciled exact event claims, payload-bound idempotency, partial-delivery failure, single circuit probes, product-scoped SMTP secrets, and actual bounded retry behavior. |
| 2026-05-24 | 1.1.0 | Updated production scope to Slack/email self-service, digest-first emissions, TTL retention, delivery health, and controlled-rollout Linear/GitHub adapters. |
| 2026-03-09 | 1.0.0   | Initial documentation from ChatGPT analysis + codebase audit + web research |
