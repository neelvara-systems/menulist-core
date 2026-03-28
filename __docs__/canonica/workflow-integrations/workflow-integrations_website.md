# Canonica — External Workflow Integrations — Website Content

> **Version:** 1.0.0
> **Last Updated:** 2026-03-09
> **Audience:** Website / Landing Page
> **Page:** canonica.app/integrations (future)

---

## §1 — SEO Meta

```html
<title>Canonica Integrations — Slack, Linear, GitHub, Email | Knowledge Governance Alerts</title>
<meta name="description" content="Canonica pushes knowledge governance events into Slack, Linear, GitHub, and email. Know when support knowledge drifts, before customers notice." />
<meta name="keywords" content="canonica integrations, slack knowledge alerts, linear issue creation, github knowledge gaps, support knowledge governance, drift detection notifications" />
```

---

## §2 — Page Headline

### H1
**Knowledge governance, delivered where you work.**

### Subheadline
Canonica detects when your support knowledge drifts from product reality and notifies your team in Slack, Linear, GitHub, or email. No dashboards to check. No logins required.

---

## §3 — Integration Cards

### Slack
**Instant governance alerts in your team channel.**
Drift detected. Knowledge gap found. Coverage dropped. Canonica sends structured Block Kit messages to your Slack channel within minutes of detection. No bot installation required — just an incoming webhook URL.

### Email
**Weekly digest + critical alerts.**
Receive a calm weekly summary of everything Canonica did — drift cleared, proposals created, coverage changes. Critical events (coverage drops, recurring AI failures) arrive immediately. Same infrastructure-grade tone as everything in Canonica.

### Linear
**Support friction → engineering backlog.**
When users repeatedly ask about something with no canonical answer, Canonica creates a Linear issue with full context: entity name, signal count, sample queries. Your engineering team sees the gap. No manual triage required.

### GitHub
**Product friction → tracked issues.**
Same as Linear, but for teams using GitHub Issues. Canonica creates issues with labels, priority mapping, and full event context. Support signals become engineering work items automatically.

---

## §4 — How It Works (3 Steps)

### Step 1: Connect
Add your Slack webhook URL, Linear API key, or GitHub token in Canonica settings. Takes 30 seconds per integration.

### Step 2: Filter
Choose which governance events each integration receives. Drift alerts to Slack. Knowledge gaps to Linear. Weekly digest to email. You control the signal.

### Step 3: Receive
Canonica pushes events automatically. Nightly governance runs at 3:00 AM UTC. Real-time events (article approvals) arrive within minutes. No polling. No checking.

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
A: Yes. Send drift alerts to Slack, knowledge gaps to Linear, and the weekly digest to email. Each integration has its own event filter.

**Q: Is there a per-event charge?**
A: No. Integrations are included in your Canonica subscription. No API charges, no per-message fees.

**Q: What about Jira, Notion, or custom webhooks?**
A: v1 supports Slack, Email, Linear, and GitHub. Additional integrations are planned based on customer demand.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-09 | 1.0.0 | Initial website content |
