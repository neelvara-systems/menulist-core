# Canonica — External Workflow Integrations — Website Content

> **Version:** 1.1.0
> **Last Updated:** 2026-05-24
> **Audience:** Website / Landing Page
> **Page:** canonica.app/integrations (future)

---

## §1 — SEO Meta

```html
<title>Canonica Integrations — Slack and Email Governance Alerts</title>
<meta name="description" content="Canonica sends support knowledge governance digests and critical coverage alerts to Slack or email so founders know when support knowledge needs review." />
<meta name="keywords" content="canonica integrations, slack knowledge alerts, email support digest, support knowledge governance, drift detection notifications" />
```

---

## §2 — Page Headline

### H1
**Knowledge governance, delivered where you work.**

### Subheadline
Canonica detects when your support knowledge drifts from product reality and sends the important review signals to Slack or email. No dashboard checking loop required.

---

## §3 — Integration Cards

### Slack
**Instant governance alerts in your team channel.**
Drift detected. Knowledge gap found. Coverage dropped. Canonica sends structured Block Kit messages to your Slack channel within minutes of detection. No bot installation required — just an incoming webhook URL.

### Email
**Weekly digest + critical alerts.**
Receive a calm weekly summary of everything Canonica did — drift cleared, proposals created, coverage changes. Critical events (coverage drops, recurring AI failures) arrive immediately. Same infrastructure-grade tone as everything in Canonica.

### Linear / GitHub
**Controlled rollout.**
Issue creation adapters exist, but they should be marketed only when the per-tenant secret lifecycle is production-ready for self-service clients.

---

## §4 — How It Works (3 Steps)

### Step 1: Connect
Add your Slack webhook URL or email recipients in Canonica settings. Send a test notification, then save.

### Step 2: Filter
Choose which governance events each integration receives. Coverage drops can go to Slack; nightly summaries can go to email. You control the signal.

### Step 3: Receive
Canonica pushes bounded digest events automatically. Nightly governance runs on the Canonica scheduler and old event/log/counter records expire through Firestore TTL.

---

## §5 — Event Types Section

| Event | What Triggers It | Why It Matters |
|-------|-----------------|----------------|
| **Drift Detected** | Canonical answer flagged as potentially stale | Answer may be wrong — review before customers see it |
| **Mutation Proposed** | Signal cluster suggests answer update | Your knowledge base wants to improve itself |
| **Knowledge Gap** | 5+ queries with no canonical answer | Customers are asking about something you haven't documented |
| **Coverage Drop** | Canonical coverage falls below 60% | Your knowledge base is losing ground |
| **Article Approved** | Team member approves a knowledge update | Confirmation that governance is working |

---

## §6 — FAQ

**Q: Do I need to install a Slack app?**
A: No. Canonica uses Slack Incoming Webhooks — just paste the URL. No OAuth, no app review, no permissions.

**Q: How fast are notifications?**
A: Governance events from the nightly batch arrive within minutes of the 3:00 AM UTC run. Real-time events (article approvals) arrive within seconds.

**Q: Can I use multiple integrations?**
A: Yes. Slack and email can each have their own event filters.

**Q: Is there a per-event charge?**
A: No. Integrations are included in your Canonica subscription. No API charges, no per-message fees.

**Q: What about Jira, Notion, or custom webhooks?**
A: Self-service v1 supports Slack and email. Linear/GitHub issue creation is controlled rollout until credential handling is self-service safe. Additional integrations should be demand-led.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-24 | 1.1.0 | Updated public positioning to self-service Slack/email only and marked Linear/GitHub issue creation as controlled rollout. |
| 2026-03-09 | 1.0.0 | Initial website content |
