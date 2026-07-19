# Answerlattice — External Workflow Integrations — Marketing

> **Version:** 1.3.0
> **Last Updated:** 2026-07-19
> **Audience:** Sales / Marketing

---

## §1 — Positioning

### One-Line Pitch
"Answerlattice sends knowledge governance digests and critical alerts to Slack or email — so founders know when support answers need review before users notice."

### Elevator Pitch (30 seconds)
"Every SaaS team has knowledge that goes stale — API docs change, features sunset, pricing updates. Answerlattice detects when support knowledge drifts from product reality and sends bounded review signals to Slack or email. No dashboard-checking loop. No noisy event stream. Knowledge governance delivered where founders already work."

---

## §2 — Key Selling Points

### For SaaS Founders
- **Lower monitoring burden** — Selected governance events come to you, while review still happens in Answerlattice
- **Nightly drift awareness** — Receive bounded aggregate drift activity after the workspace governance run
- **Knowledge gaps → review work** — Recurring support friction becomes a reviewable Answerlattice task; issue tracker creation is controlled rollout
- **Nightly activity digest** — One bounded email when the nightly run records governance activity

### For Engineering Leads
- **Support signals → review items** — Convert "users keep asking about X" into actionable Answerlattice review work
- **Product friction detection** — Know which features cause the most support friction
- **No Slack bot complexity** — Simple notifications, not interactive workflows

### For Support Managers
- **Coverage drop alerts** — Receive a separate higher-priority notification after the nightly run records coverage below threshold
- **AI workflow failure alerts** — Know when governed AI operations repeatedly fail during the nightly run
- **Low-monitoring governance** — Use the notification as a prompt to review; delivery does not prove the underlying knowledge issue is resolved

---

## §3 — Competitive Differentiation

Do not sell Slack/email delivery as unique. Support suites already offer broad notification, copilot, and automation surfaces. The defensible claim is narrower:

> Answerlattice delivers bounded signals from the governed-answer lifecycle, while the Answerlattice dashboard remains the place where authority, evidence, review, and correction are controlled.

Current externally deliverable facts are the nightly governance summary, coverage drop, repeated AI workflow failure, and controlled test. Direct drift, gap, proposal, and article-approval notifications must not be claimed until their producers are wired and evaluated. Any named competitor comparison requires current primary-source revalidation before publication.

---

## §4 — Sales Objection Handling

| Objection | Response |
|-----------|----------|
| "We already have support notifications in Slack" | "Keep them. Answerlattice sends a bounded subset of governed-answer review signals and links the operational signal back to the authority and review lifecycle; it is not trying to replace your support suite." |
| "Can it create Jira, Linear, or GitHub issues?" | "No self-service issue creation is offered today. Linear/GitHub adapter code is internal controlled-rollout infrastructure and requires a complete OAuth/token, permission, rate-limit, and deletion lifecycle before customer activation." |
| "We don't use Slack" | "Email notifications are included. An activity-driven nightly digest summarizes the governance run." |
| "How much does this cost?" | "Use the current approved pricing and entitlement source. External email or provider costs depend on the customer's/provider's plan; do not invent a connector or per-message price." |

---

## §5 — Demo Script

1. Show Answerlattice governance dashboard with drift flags
2. Show Slack receiving a nightly activity digest or critical coverage alert
3. Show Answerlattice review queue with a repeated-gap item
4. Show the nightly activity digest email with governance summary
5. Show Workflow Notifications — Slack/email setup, event filters, delivery health, and test notification

**Key message during demo:** "Answerlattice brings the review signal to you; the governed evidence and decision stay in Answerlattice."

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-19 | 1.3.0 | Removed stale competitor and pricing claims, corrected nightly timing and controlled-adapter availability, and narrowed the sales promise to governed lifecycle signals rather than generic notification uniqueness. |
| 2026-07-13 | 1.2.0 | Aligned active notification sources and replaced unsupported instant/weekly wording with the actual nightly digest and coverage-alert contract. |
| 2026-05-24 | 1.1.0 | Updated marketing to Slack/email production scope and controlled-rollout issue tracker positioning. |
| 2026-03-09 | 1.0.0 | Initial marketing content |
