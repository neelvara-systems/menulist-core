# Canonica Email Notifications

> **Feature:** Generic, reusable email notification system for ticket events
> **Status:** ✅ IMPLEMENTED (Phase 2 Step 3: DISTRIBUTE)
> **Date:** 2026-03-07
> **Feature Flag:** `ENABLE_CANONICA_NOTIFICATIONS` (default: OFF)
> **SMTP:** Reuses existing nodemailer infrastructure (same as lifecycle messaging)

---

## Document Index

| # | Document | Audience | Purpose |
|---|----------|----------|---------|
| 1 | **README.md** (this file) | Everyone | Master index |
| 2 | `email-notifications_spec.md` | CEO/PM | Business requirements |
| 3 | `email-notifications_impl.md` | Developers | Technical blueprint |
| 4 | `email-notifications_firebase.md` | Developers/Ops | Firestore cost |

---

## What This Is

A generic, reusable email notification system that sends emails when ticket events occur:
- **Ticket created** — confirmation to the submitter
- **Ticket reply** — notification to the ticket creator when support agent replies
- **Ticket status changed** — notification when ticket moves to new status

## Architecture

```
Client-side DAL (addTicket, addTicketMessage, updateTicketStatus)
  │
  └── triggerNotification() — fire-and-forget POST to /api/notifications/send
        │
        ├── Feature flag check (ENABLE_CANONICA_NOTIFICATIONS)
        ├── Idempotency (dedup by eventType + referenceId within 24h)
        ├── Rate limiting (20/day per recipient)
        ├── Template resolution (event type → subject + HTML)
        ├── SMTP send via nodemailer (reuses existing transporter)
        └── Logging to notificationLogs collection
```

## Key Design Decisions

1. **Generic & reusable** — Not ticket-specific. Any feature can add notification types by adding a template to `templates.ts`
2. **Fire-and-forget** — `triggerNotification()` never blocks the calling operation. Errors are silently caught.
3. **Client → API → Server** — DAL runs client-side, so notifications go through an API route to access firebase-admin
4. **Reuses existing SMTP** — Same nodemailer transporter, same SMTP env vars as lifecycle messaging. Zero new infrastructure.
5. **Separate from lifecycle messaging** — Lifecycle messages are for billing/subscription events. Notifications are for operational events (tickets, etc.)

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/notifications/index.ts` | Core notification sender (server-side, firebase-admin) |
| `src/lib/notifications/client.ts` | Client-side fire-and-forget trigger helper |
| `src/lib/notifications/templates.ts` | Template registry (3 ticket templates) |
| `src/app/api/notifications/send/route.ts` | API route (withAuth, bridges client → server) |

## Files Modified

| File | Change |
|------|--------|
| `src/config/features.ts` | Added `ENABLE_CANONICA_NOTIFICATIONS: false` |
| `src/database/tickets/index.ts` | Added `triggerNotification()` calls to addTicket, addTicketMessage, updateTicketStatus |

## Adding a New Notification Type

1. Add template to `src/lib/notifications/templates.ts` → `NOTIFICATION_TEMPLATES` object
2. Call `triggerNotification({ eventType: 'YOUR_EVENT', ... })` from the triggering code
3. Done — the rest (feature flag, idempotency, rate limit, SMTP, logging) is automatic

---

## Version History

| Date | Change |
|------|--------|
| 2026-03-07 | Initial implementation: 3 ticket notification types, generic service, API route |
