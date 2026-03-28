# Canonica — External Workflow Integrations — Help Documentation

> **Version:** 1.0.0
> **Last Updated:** 2026-03-09
> **Audience:** Canonica Customers (SaaS Founders)

---

## §1 — What Are Workflow Integrations?

Canonica monitors your support knowledge for drift, gaps, and coverage changes. Workflow Integrations deliver these governance events directly to the tools your team already uses — Slack, email, Linear, or GitHub.

Instead of logging into Canonica to check your knowledge health, you receive notifications where you already work.

---

## §2 — Supported Integrations

| Integration | What It Does | Setup Time |
|-------------|-------------|------------|
| **Slack** | Sends governance alerts to a Slack channel | 30 seconds |
| **Email** | Sends critical alerts + weekly digest | 30 seconds |
| **Linear** | Creates issues from knowledge gaps and friction signals | 2 minutes |
| **GitHub** | Creates issues from knowledge gaps and friction signals | 2 minutes |

---

## §3 — Setup Guide

### 3.1 — Slack Setup

1. Go to **Canonica Dashboard → Settings → Integrations**
2. Click **Enable** on the Slack card
3. Create a Slack Incoming Webhook:
   - Go to [api.slack.com/apps](https://api.slack.com/apps) → Your Apps → Create New App
   - Choose "From scratch" → name it "Canonica Alerts"
   - Go to **Incoming Webhooks** → Activate
   - Click **Add New Webhook to Workspace** → select your channel
   - Copy the Webhook URL
4. Paste the Webhook URL into Canonica
5. Select which event types you want to receive
6. Click **Test** to verify the connection
7. Click **Save**

### 3.2 — Email Setup

1. Go to **Canonica Dashboard → Settings → Integrations**
2. Click **Enable** on the Email card
3. Enter up to 5 email addresses
4. Select which event types you want to receive
5. Click **Test** to send a test email
6. Click **Save**

### 3.3 — Linear Setup

1. Go to **Canonica Dashboard → Settings → Integrations**
2. Click **Enable** on the Linear card
3. Generate a Linear API key:
   - Go to [linear.app](https://linear.app) → Settings → API → Personal API Keys
   - Create a new key with "Issues: Write" scope
   - Copy the key
4. Paste the API key into Canonica
5. Enter your Linear Team ID (found in Settings → Teams → click team → URL contains team ID)
6. Select which event types should create issues
7. Click **Test** to create a test issue
8. Click **Save**

### 3.4 — GitHub Setup

1. Go to **Canonica Dashboard → Settings → Integrations**
2. Click **Enable** on the GitHub card
3. Generate a GitHub Personal Access Token:
   - Go to [github.com](https://github.com) → Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens
   - Create a new token with "Issues: Read and Write" permission for your repository
   - Copy the token
4. Paste the token into Canonica
5. Enter the repository owner and name (e.g., `mycompany` and `product-issues`)
6. Select which event types should create issues
7. Click **Test** to create a test issue
8. Click **Save**

---

## §4 — Event Types Explained

| Event | What It Means | Recommended Action |
|-------|--------------|-------------------|
| **Drift Detected** | A canonical answer may be stale or inaccurate | Review the answer in Canonica governance dashboard |
| **Mutation Proposed** | Signal cluster suggests an answer should be updated or created | Review the proposal — approve, edit, or reject |
| **Knowledge Gap** | Users keep asking about something with no canonical answer | Create a new canonical answer for this topic |
| **Coverage Drop** | Fewer queries are being resolved by canonical answers | Review knowledge base — likely missing answers for new topics |
| **Article Approved** | A team member approved a knowledge update | No action needed — confirmation that governance is working |
| **AI Failure (Recurring)** | AI repeatedly fails to answer questions about a topic | Create or improve the canonical answer for this entity |
| **Nightly Summary** | Summary of all governance activity from the nightly run | Scan for any critical items, otherwise no action needed |

---

## §5 — Event Filtering

You can choose which events each integration receives:

- **Slack** — Recommended: all event types (for team awareness)
- **Email** — Recommended: `coverage_drop`, `ai_failure_recurring`, `nightly_summary` (critical + digest)
- **Linear** — Recommended: `knowledge_gap_detected`, `ai_failure_recurring` (engineering-relevant only)
- **GitHub** — Recommended: same as Linear

You can change filters at any time in Settings → Integrations.

---

## §6 — Troubleshooting

### "I'm not receiving Slack notifications"

1. Check that the integration is **enabled** in Settings → Integrations
2. Click **Test** to verify the webhook URL works
3. Check your Slack channel — the test message should appear
4. If the test fails, regenerate the Slack webhook URL and update it in Canonica
5. Check the event filter — make sure the event types you expect are selected

### "Linear issues aren't being created"

1. Verify the API key is valid (test in Linear's API explorer)
2. Check the Team ID is correct
3. Ensure the API key has "Issues: Write" scope
4. Click **Test** in Canonica to create a test issue

### "I'm getting too many notifications"

1. Go to Settings → Integrations
2. Deselect event types you don't need
3. For Slack: consider only enabling `coverage_drop` and `nightly_summary`
4. For email: use the weekly digest (`nightly_summary`) instead of real-time events

### "An integration stopped working"

If an integration fails 10 times in a row, Canonica automatically disables it to prevent spam. You'll see a "Disabled — check connection" status in Settings → Integrations. Fix the connection issue, then click **Re-enable**.

---

## §7 — Limits

| Limit | Value |
|-------|-------|
| Max integrations per tenant | 4 (one of each type) |
| Max email recipients | 5 |
| Max events per night | 50 per tenant |
| Max emails per day per recipient | 20 |
| Retry attempts per failed delivery | 3 |

---

## §8 — Privacy & Security

- **No PII in events** — Event payloads contain entity names, signal counts, and coverage metrics. No user emails, no ticket content, no personal data.
- **API keys encrypted** — Linear and GitHub tokens are stored using encrypted environment variables, not in the database.
- **Slack webhooks** — Webhook URLs are stored in your Canonica configuration. Only your Canonica account can trigger deliveries.
- **Delivery logs** — All delivery attempts are logged for 90 days. You can review them in the governance dashboard.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-09 | 1.0.0 | Initial help documentation |
