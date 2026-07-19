# Answerlattice — External Workflow Integrations — Help Documentation

> **Version:** 1.3.0
> **Last Updated:** 2026-07-19
> **Audience:** Answerlattice Customers (SaaS Founders)

---

## §1 — What Are Workflow Integrations?

Answerlattice monitors your support knowledge for drift, gaps, and coverage changes. Workflow Integrations deliver the most important governance events directly to Slack or email.

Instead of logging into Answerlattice to check your knowledge health, you receive notifications where you already work.

---

## §2 — Supported Integrations

| Integration | What It Does | Setup Time |
|-------------|-------------|------------|
| **Slack** | Sends governance alerts to a Slack channel | 30 seconds |
| **Email** | Sends critical alerts + nightly activity digest | 30 seconds |
| **Linear** | Internal controlled-rollout adapter; not available for self-service activation | Not available |
| **GitHub** | Internal controlled-rollout adapter; not available for self-service activation | Not available |

---

## §3 — Setup Guide

### 3.1 — Slack Setup

1. Go to **Answerlattice Dashboard → Support Control → Workflow Notifications**
2. Click **Enable** on the Slack card
3. Create a Slack Incoming Webhook:
   - Go to [api.slack.com/apps](https://api.slack.com/apps) → Your Apps → Create New App
   - Choose "From scratch" → name it "Answerlattice Alerts"
   - Go to **Incoming Webhooks** → Activate
   - Click **Add New Webhook to Workspace** → select your channel
   - Copy the Webhook URL
4. Paste the Webhook URL into Answerlattice
5. Select which event types you want to receive
6. Click **Save**
7. Click **Send Test Notification** to verify the saved connection

### 3.2 — Email Setup

1. Go to **Answerlattice Dashboard → Support Control → Workflow Notifications**
2. Click **Enable** on the Email card
3. Enter up to 5 email addresses
4. Select which event types you want to receive
5. Click **Save**
6. Click **Send Test Notification** to send a test email using the saved recipients

### 3.3 — Linear and GitHub

Linear and GitHub issue creation is not available through self-service setup. Adapter code remains internal controlled-rollout infrastructure. OAuth/token rotation, least-privilege permission, rate-limit, deletion, and provider-receipt evidence must be completed before customer activation.

---

## §4 — Event Types Explained

The self-service screen exposes the three current automated delivery sources only: **Coverage Drop**, **Repeated AI Workflow Failure**, and **Nightly Governance Summary**. Reserved event schemas are not selectable until a direct producer is implemented and approved.

| Event | What It Means | Recommended Action |
|-------|--------------|-------------------|
| **Coverage Drop** | Fewer queries are being resolved by canonical answers | Review knowledge base — likely missing answers for new topics |
| **Repeated AI Workflow Failure** | The nightly run recorded repeated failures in governed AI operations such as draft generation or embedding work | Review the named failed phases and the related Answerlattice operational state |
| **Nightly Governance Summary** | Aggregate drift, proposal, coverage, signal, and bounded scheduler-error counts from the nightly run | Scan for review work; no action is needed when the summary is stable |

---

## §5 — Event Filtering

You can choose which events each integration receives:

- **Slack** — Recommended: `coverage_drop`, `ai_failure_recurring`, and `nightly_summary` (the active automated producers)
- **Email** — Recommended: `coverage_drop`, `ai_failure_recurring`, `nightly_summary` (critical + digest)
- **Linear/GitHub** — Controlled rollout only

You can change these three filters at any time in **Workflow Notifications**. Submitting an empty filter list restores the three defaults rather than creating an integration that can never receive an automated event.

---

## §6 — Troubleshooting

### "I'm not receiving Slack notifications"

1. Check that the integration is **enabled** in Workflow Notifications
2. Click **Test** to verify the webhook URL works
3. Check your Slack channel — the test message should appear
4. If the test fails, regenerate the Slack webhook URL and update it in Answerlattice
5. Check the event filter — make sure the event types you expect are selected

### "The test notification did not arrive"

1. Save the integration first.
2. Confirm Slack or email is saved and enabled. The test bypasses ordinary event filters so it can verify every saved self-service destination.
3. Click **Send Test Notification**.
4. Wait a few seconds, then review the delivery health status shown on the integration card.

### "I'm getting too many notifications"

1. Go to Workflow Notifications
2. Deselect event types you don't need
3. For Slack: consider only enabling `coverage_drop` and `nightly_summary`
4. For email: select only the nightly activity digest (`nightly_summary`) if you want one bounded summary rather than additional critical-event emails

### "An integration stopped working"

If an integration reaches 10 consecutive failed deliveries, Answerlattice opens its circuit breaker to prevent repeated provider calls. Fix and save the connection details. The runtime permits one automatic recovery probe after the 24-hour cooldown; contact support if delivery health still needs review after that probe.

---

## §7 — Limits

| Limit | Value |
|-------|-------|
| Max self-service integrations per tenant | 2 (Slack + email) |
| Max email recipients | 5 |
| Current automated events per nightly run | 0-3 per active tenant (summary, coverage drop, repeated AI workflow failure) |
| Hard event-bus cap | 50 per tenant/run for approved future producers |
| Max emails per day per recipient | 20 |
| Total adapter attempts per delivery | At most 3 when the provider-specific adapter marks a response retryable; Slack `429` is not fixed-delay retried |

---

## §8 — Privacy & Security

- **Current automated payloads** — The three live producers send aggregate counts, bounded internal workflow phase names, and fixed scheduler diagnostics. They do not send customer messages, ticket bodies, or user contact fields. Configured product/entity labels may still be business-sensitive, and sanitization is not a universal PII detector.
- **Recipient data** — Email addresses are destination configuration and therefore personal data. They are returned only to an authenticated workspace member with integration-management permission.
- **Slack webhooks** — Webhook URLs are never returned by the owner API or direct browser Firestore reads after save, including platform-admin browser clients. Rotate an exposed webhook in Slack. Answerlattice does not claim a separate application-layer encryption scheme for this document.
- **Slack message safety** — Dynamic event text cannot create Slack mentions or injected angle-bracket links because control characters are encoded and automatic parsing is disabled for the detail block.
- **Delivery logs** — Delivery attempts are retained for 90 days with Firestore TTL. The settings screen shows compact delivery health instead of reading raw logs.
- **Email delivery is all-recipient** — If any configured recipient reaches the Answerlattice daily cap, the complete email attempt is marked rate-limited; Answerlattice does not silently send to only a subset.
- **Provider retention** — Delivered content becomes data in the configured Slack workspace, email system, or controlled-rollout issue tracker. Provider access, retention, deletion, and audit follow that provider workspace's policy.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-19 | 1.3.0 | Moved setup to the dedicated permission-gated route, clarified controlled adapters are unavailable for self-service, and documented browser-denied webhooks, current payload privacy, provider-specific Slack retry behavior, and all-recipient email delivery. |
| 2026-07-13 | 1.2.0 | Corrected active event-source coverage, save-before-test order, nightly digest wording, total-attempt semantics, and automatic circuit-breaker recovery behavior. |
| 2026-05-24 | 1.1.0 | Updated production scope to Slack/email, added Send Test Notification flow, delivery health, and TTL retention wording. |
| 2026-03-09 | 1.0.0 | Initial help documentation |
