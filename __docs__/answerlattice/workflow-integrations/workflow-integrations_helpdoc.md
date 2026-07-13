# Answerlattice — External Workflow Integrations — Help Documentation

> **Version:** 1.2.0
> **Last Updated:** 2026-07-13
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
| **Linear** | Controlled rollout adapter for issue creation | By request |
| **GitHub** | Controlled rollout adapter for issue creation | By request |

---

## §3 — Setup Guide

### 3.1 — Slack Setup

1. Go to **Answerlattice Dashboard → Settings → Integrations**
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

1. Go to **Answerlattice Dashboard → Settings → Integrations**
2. Click **Enable** on the Email card
3. Enter up to 5 email addresses
4. Select which event types you want to receive
5. Click **Save**
6. Click **Send Test Notification** to send a test email using the saved recipients

### 3.3 — Linear and GitHub

Linear and GitHub issue creation is available only in controlled rollout. Slack and email are the self-service production integrations. This avoids asking owners to paste long-lived issue tracker tokens before the per-tenant secret lifecycle is finalized.

---

## §4 — Event Types Explained

The current automated delivery sources are **Coverage Drop**, **AI Failure (Recurring)**, and **Nightly Summary**. The remaining event types are supported delivery schemas for controlled flows but do not yet have an active direct producer.

| Event | What It Means | Recommended Action |
|-------|--------------|-------------------|
| **Drift Detected** | A canonical answer may be stale or inaccurate | Review the answer in Answerlattice governance dashboard |
| **Mutation Proposed** | Signal cluster suggests an answer should be updated or created | Review the proposal — approve, edit, or reject |
| **Knowledge Gap** | Users keep asking about something with no canonical answer | Create a new canonical answer for this topic |
| **Coverage Drop** | Fewer queries are being resolved by canonical answers | Review knowledge base — likely missing answers for new topics |
| **Article Approved** | A team member approved a knowledge update | No action needed — confirmation that governance is working |
| **AI Failure (Recurring)** | AI repeatedly fails to answer questions about a topic | Create or improve the canonical answer for this entity |
| **Nightly Summary** | Summary of all governance activity from the nightly run | Scan for any critical items, otherwise no action needed |

---

## §5 — Event Filtering

You can choose which events each integration receives:

- **Slack** — Recommended: `coverage_drop`, `ai_failure_recurring`, and `nightly_summary` (the active automated producers)
- **Email** — Recommended: `coverage_drop`, `ai_failure_recurring`, `nightly_summary` (critical + digest)
- **Linear/GitHub** — Controlled rollout only

You can change filters at any time in Settings → Integrations.

---

## §6 — Troubleshooting

### "I'm not receiving Slack notifications"

1. Check that the integration is **enabled** in Settings → Integrations
2. Click **Test** to verify the webhook URL works
3. Check your Slack channel — the test message should appear
4. If the test fails, regenerate the Slack webhook URL and update it in Answerlattice
5. Check the event filter — make sure the event types you expect are selected

### "The test notification did not arrive"

1. Save the integration first.
2. Confirm at least one event type is selected.
3. Click **Send Test Notification**.
4. Wait a few seconds, then review the delivery health status shown on the integration card.

### "I'm getting too many notifications"

1. Go to Settings → Integrations
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
| Max events per night | 50 per tenant |
| Max emails per day per recipient | 20 |
| Total adapter attempts per delivery | 3 for explicit retryable provider responses |

---

## §8 — Privacy & Security

- **No PII in events** — Event payloads contain entity names, signal counts, and coverage metrics. No user emails, no ticket content, no personal data.
- **Slack webhooks** — Webhook URLs are stored in your Answerlattice configuration. Only your Answerlattice account can trigger deliveries.
- **Delivery logs** — Delivery attempts are retained for 90 days with Firestore TTL. The settings screen shows compact delivery health instead of reading raw logs.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-13 | 1.2.0 | Corrected active event-source coverage, save-before-test order, nightly digest wording, total-attempt semantics, and automatic circuit-breaker recovery behavior. |
| 2026-05-24 | 1.1.0 | Updated production scope to Slack/email, added Send Test Notification flow, delivery health, and TTL retention wording. |
| 2026-03-09 | 1.0.0 | Initial help documentation |
