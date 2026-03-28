# Canonica Email Notifications — Spec

> **Version:** 1.0.0
> **Last Updated:** 2026-03-07
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
- **Idempotent** — Same event + reference ID within 24h = no duplicate email
- **Rate-limited** — Max 20 emails per recipient per day (prevents spam on rapid status changes)
- **Feature-flagged** — `ENABLE_CANONICA_NOTIFICATIONS` (OFF by default, zero impact until enabled)

---

## Infrastructure Reuse

| Component | Reused From | Why |
|-----------|------------|-----|
| SMTP transport | Lifecycle messaging (`src/lib/messaging/index.ts`) | Same nodemailer, same env vars (SMTP_HOST, SMTP_USER, SMTP_PASS) |
| Email styling | Lifecycle messaging templates | Same infrastructure-grade tone, same CSS styles |
| Auth pattern | `withAuth()` middleware | API route protected by session auth |
| Logging | Firestore `notificationLogs` collection | Same append-only pattern as `messageLogs` |

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-07 | 1.0.0 | Initial spec: 3 ticket notification types |
