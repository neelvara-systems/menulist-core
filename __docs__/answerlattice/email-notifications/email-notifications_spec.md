# Answerlattice Email Notifications — Spec

> **Version:** 1.1.0
> **Last Updated:** 2026-05-22
> **Audience:** CEO / PM

---

## Purpose

Users who submit support tickets have no way to know when their ticket is answered or its status changes. This is a universal expectation — every support system (Zendesk, Intercom, Freshdesk) sends email notifications on ticket events. Without it, the ticket system is functionally broken.

---

## Notification Types (v1)

| Event | Recipient | When | Template |
|-------|-----------|------|----------|
| **Ticket Created** | Ticket submitter | Immediately after ticket creation | Confirmation with ticket ID, subject, category |
| **Ticket Reply** | Ticket creator | When support agent posts a reply | Reply preview (300 chars), replier name, link to ticket |
| **Ticket Status Changed** | Ticket creator | When status changes (open → in_progress → resolved, etc.) | New status, remark, link to ticket |
| **Notification Test** | Workspace support inbox | Owner clicks Send Test Email in Activation | Sender/readiness verification |

---

## User Experience

### Owner (ticket submitter)
1. Submits ticket → receives "Ticket received" email within seconds
2. Support agent replies → receives "New reply on your ticket" email
3. Agent changes status to "Resolved" → receives "Ticket updated: Resolved" email

### Support Agent
- No change to workflow — reply/status change triggers notification automatically
- Fire-and-forget — never slows down the support workflow

---

## Design Principles

- **Generic** — System supports any event type via template registry. Not ticket-specific.
- **Fire-and-forget** — Notification failure never blocks the triggering operation
- **Idempotent** — Every event/reference is transactionally claimed before SMTP. Same or concurrent identity cannot create a second active sender; unique tests use a unique server-generated reference rather than bypassing dedupe.
- **Rate-limited** — Max 20 emails per recipient per day (prevents spam on rapid status changes)
- **Feature-flagged** — `ENABLE_ANSWERLATTICE_NOTIFICATIONS` (ON for launch; can be disabled globally)
- **Verifiable** — Product owners can send a rate-limited test email before inviting customers.
- **Abuse-bounded** — The client route fails limiting closed, requires current support permission, accepts only strict ticket/message identity, and derives recipient/content/reference from the exact current-workspace ticket.

---

## Infrastructure Reuse

| Component | Reused From | Why |
|-----------|------------|-----|
| SMTP transport | Lifecycle messaging (`src/lib/messaging/index.ts`) | Same nodemailer, same env vars (SMTP_HOST, SMTP_USER, SMTP_PASS) |
| Email styling | Lifecycle messaging templates | Same infrastructure-grade tone, same CSS styles |
| Auth pattern | `withAuth()` plus current Answerlattice access control | Session and current `canManageSupport` both required |
| Logging | Firestore `answerlattice_notificationLogs` collection | Answerlattice-scoped transaction-owned delivery state/log |

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-22 | 1.1.0 | Added owner test-send requirement, Answerlattice-scoped notification logs, and updated flag state. |
| 2026-03-07 | 1.0.0 | Initial spec: 3 ticket notification types |
