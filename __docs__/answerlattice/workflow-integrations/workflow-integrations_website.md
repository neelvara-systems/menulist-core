# Answerlattice — External Workflow Integrations — Website Content

> **Version:** 1.2.0
> **Last Updated:** 2026-07-13
> **Audience:** Website / Landing Page
> **Page:** answerlattice.com/integrations (future)

---

## §1 — SEO Meta

```html
<title>Answerlattice Integrations — Slack and Email Governance Alerts</title>
<meta name="description" content="Answerlattice sends support knowledge governance digests and critical coverage alerts to Slack or email so founders know when support knowledge needs review." />
<meta name="keywords" content="answerlattice integrations, slack knowledge alerts, email support digest, support knowledge governance, drift detection notifications" />
```

---

## §2 — Page Headline

### H1
**Knowledge governance, delivered where you work.**

### Subheadline
Answerlattice detects when your support knowledge drifts from product reality and sends the important review signals to Slack or email. No dashboard checking loop required.

---

## §3 — Integration Cards

### Slack
**Governance alerts in your team channel.**
Nightly governance activity, recurring AI failure, and critical coverage drops use structured Block Kit messages. No bot installation required — just an incoming webhook URL.

### Email
**Nightly activity digest + critical alerts.**
Receive a calm summary when the nightly governance run records activity — drift cleared, proposals created, coverage changes. Critical events (coverage drops, recurring AI failures) use the same bounded delivery path. Same infrastructure-grade tone as everything in Answerlattice.

### Linear / GitHub
**Controlled rollout.**
Issue creation adapters exist, but they should be marketed only when the per-tenant secret lifecycle is production-ready for self-service clients.

---

## §4 — How It Works (3 Steps)

### Step 1: Connect
Add your Slack webhook URL or email recipients in Answerlattice settings. Save the connection, then send a test notification.

### Step 2: Filter
Choose which governance events each integration receives. Coverage drops can go to Slack; nightly summaries can go to email. You control the signal.

### Step 3: Receive
Answerlattice pushes bounded digest events automatically. Nightly governance runs on the Answerlattice scheduler and old event/log/counter records expire through Firestore TTL.

---

## §5 — Active Automated Event Types

| Event | What Triggers It | Why It Matters |
|-------|-----------------|----------------|
| **Coverage Drop** | Canonical coverage falls below 60% | Your knowledge base is losing ground |
| **Recurring AI Failure** | The nightly run records repeated generation failures | Review the affected support-generation path |
| **Nightly Summary** | The workspace nightly run records governance activity | Review aggregate drift, proposal, coverage, and signal counts |

---

## §6 — FAQ

**Q: Do I need to install a Slack app?**
A: No. Answerlattice uses Slack Incoming Webhooks — just paste the URL. No OAuth, no app review, no permissions.

**Q: How fast are notifications?**
A: Automated events are queued after the workspace-local nightly governance run and normally arrive within minutes of that run completing. The current source does not claim direct real-time article-approval delivery.

**Q: Can I use multiple integrations?**
A: Yes. Slack and email can each have their own event filters.

**Q: Is there a per-event charge?**
A: No. Integrations are included in your Answerlattice subscription. No API charges, no per-message fees.

**Q: What about Jira, Notion, or custom webhooks?**
A: Self-service v1 supports Slack and email. Linear/GitHub issue creation is controlled rollout until credential handling is self-service safe. Additional integrations should be demand-led.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-13 | 1.2.0 | Aligned public event coverage and timing with active nightly summary, recurring-AI-failure, and coverage-drop producers. |
| 2026-05-24 | 1.1.0 | Updated public positioning to self-service Slack/email only and marked Linear/GitHub issue creation as controlled rollout. |
| 2026-03-09 | 1.0.0 | Initial website content |
