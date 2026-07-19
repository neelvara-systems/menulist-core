# Answerlattice — External Workflow Integrations — Website Content

> **Version:** 1.3.0
> **Last Updated:** 2026-07-19
> **Audience:** Website / Landing Page
> **Page:** `/integrations` on the Answerlattice public site

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
Answerlattice sends bounded nightly governance summaries and higher-priority coverage or AI-workflow-failure alerts to Slack or email, so founders know when the dashboard needs review.

---

## §3 — Integration Cards

### Slack
**Governance alerts in your team channel.**
Nightly governance activity, repeated AI workflow failures, and coverage drops use structured Block Kit messages. Dynamic event text cannot create Slack mentions or injected angle-bracket links. No interactive bot is installed; the customer authorizes an incoming webhook destination in Slack.

### Email
**Nightly activity digest + critical alerts.**
Receive a calm summary when the nightly governance run records activity — drift cleared, proposals created, and coverage changes. Coverage drops and repeated AI workflow failures use separate higher-priority events after the same nightly run.

### Linear / GitHub
**Not currently offered for self-service.**
Do not market internal adapter code as customer availability. Reconsider only after OAuth/token rotation, least-privilege permission, rate-limit, deletion, and provider-receipt evidence passes.

---

## §4 — How It Works (3 Steps)

### Step 1: Connect
Add your Slack webhook URL or email recipients in the permission-gated **Workflow Notifications** screen. Save the connection, then send a test notification.

### Step 2: Filter
Choose among the three active event sources for each integration. Reserved drift, gap, proposal, and approval schemas are not presented as selectable self-service notifications.

### Step 3: Receive
Answerlattice pushes bounded digest events automatically. Nightly governance runs on the Answerlattice scheduler and old event/log/counter records expire through Firestore TTL.

---

## §5 — Active Automated Event Types

| Event | What Triggers It | Why It Matters |
|-------|-----------------|----------------|
| **Coverage Drop** | Canonical coverage falls below 60% | Review whether important questions have approved coverage |
| **Repeated AI Workflow Failure** | The nightly run records repeated failures in governed AI operations | Review the affected phase and operational state |
| **Nightly Governance Summary** | The workspace nightly run records governance activity | Review aggregate drift, proposal, coverage, and signal counts |

---

## §6 — FAQ

**Q: Do I need to install a Slack app?**
A: Answerlattice uses a Slack Incoming Webhook rather than an interactive bot. A Slack administrator or authorized user still approves the webhook destination under the workspace's Slack policy.

**Q: How fast are notifications?**
A: Automated events are queued after the workspace-local nightly governance run. Provider acceptance and inbox/channel appearance depend on the configured external service. The current product does not claim direct real-time article-approval delivery.

**Q: Can I use multiple integrations?**
A: Yes. Slack and email can each have their own event filters.

**Q: Is there a per-event charge?**
A: Check the current Answerlattice pricing and plan entitlement. External SMTP or provider costs depend on the configured provider; this page must not invent a connector or per-message price.

**Q: What about Jira, Notion, or custom webhooks?**
A: Self-service supports Slack and email. Jira, Notion, custom webhooks, and Linear/GitHub issue creation are not currently offered. Additional destinations require proven founder demand and a complete permission, secret, deletion, and provider-quality contract.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-19 | 1.3.0 | Aligned the page with the dedicated owner route, active-producer-only filters, nightly timing, provider-dependent delivery, Slack authorization/text safety, and explicit non-availability of controlled adapters. |
| 2026-07-13 | 1.2.0 | Aligned public event coverage and timing with active nightly summary, recurring-AI-failure, and coverage-drop producers. |
| 2026-05-24 | 1.1.0 | Updated public positioning to self-service Slack/email only and marked Linear/GitHub issue creation as controlled rollout. |
| 2026-03-09 | 1.0.0 | Initial website content |
