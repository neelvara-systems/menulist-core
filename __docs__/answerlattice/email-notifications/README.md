# Answerlattice Email Notifications

> **Feature:** Generic, reusable email notification system for ticket events
> **Status:** ✅ IMPLEMENTED AND ENABLED
> **Date:** 2026-03-07
> **Last Updated:** 2026-05-22
> **Feature Flag:** `ENABLE_ANSWERLATTICE_NOTIFICATIONS` (default: ON)
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
        ├── Feature flag check (ENABLE_ANSWERLATTICE_NOTIFICATIONS)
        ├── Request validation + per-user route throttle
        ├── Idempotency (deterministic log doc by eventType + referenceId)
        ├── Rate limiting (20/day per recipient)
        ├── Template resolution (event type → subject + HTML)
        ├── SMTP send via nodemailer (reuses existing transporter)
        └── Logging to answerlattice_notificationLogs for Answerlattice events
```

## Key Design Decisions

1. **Generic & reusable** — Not ticket-specific. Any feature can add notification types by adding a template to `templates.ts`
2. **Fire-and-forget** — `triggerNotification()` never blocks the calling operation. Dev builds warn on trigger failure; production ticket flow is not blocked.
3. **Client → API → Server** — DAL runs client-side, so notifications go through an API route to access firebase-admin
4. **Reuses existing SMTP** — Same nodemailer transporter, same SMTP env vars as lifecycle messaging. Zero new infrastructure.
5. **Separate from lifecycle messaging** — Lifecycle messages are for billing/subscription events. Notifications are for operational events (tickets, etc.)
6. **Answerlattice-scoped logs** — Answerlattice events write to `answerlattice_notificationLogs` in the Answerlattice Firebase project; non-Answerlattice callers still use the legacy generic `notificationLogs` target.
7. **Activation verification** — `/answerlattice/activation` exposes a test-email action through `/api/answerlattice/notifications/test` with a 3/hour workspace rate limit.
8. **Route guardrails** — `/api/notifications/send` accepts only the three client ticket events, validates email/reference/metadata shape, limits metadata to 8KB, and throttles each authenticated user to 120 notification attempts/hour.

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/notifications/index.ts` | Core notification sender (server-side, firebase-admin) |
| `src/lib/notifications/client.ts` | Client-side fire-and-forget trigger helper |
| `src/lib/notifications/templates.ts` | Template registry (3 ticket templates) |
| `src/app/api/notifications/send/route.ts` | API route (withAuth, bridges client → server) |
| `src/app/api/answerlattice/notifications/test/route.ts` | Workspace test-send route used by Activation |

## Files Modified

| File | Change |
|------|--------|
| `src/config/features.ts` | `ENABLE_ANSWERLATTICE_NOTIFICATIONS: true` |
| `src/database/tickets/index.ts` | `triggerNotification()` calls for addTicket, addTicketMessage, updateTicketStatus with product-aware Answerlattice logging |
| `firestore-answerlattice.rules` | Platform-admin read access for `answerlattice_notificationLogs`; no client writes |
| `firestore-answerlattice.indexes.json` | Rate-limit index for `answerlattice_notificationLogs` |

## Adding a New Notification Type

1. Add template to `src/lib/notifications/templates.ts` → `NOTIFICATION_TEMPLATES` object
2. Call `triggerNotification({ eventType: 'YOUR_EVENT', ... })` from the triggering code
3. Done — the rest (feature flag, idempotency, rate limit, SMTP, logging) is automatic

---

## Version History

| Date | Change |
|------|--------|
| 2026-05-22 | Enabled Answerlattice notification verification from Activation, moved Answerlattice logs to `answerlattice_notificationLogs`, added test-send template and rate limit, and removed unnecessary reply/status notification reads. |
| 2026-03-07 | Initial implementation: 3 ticket notification types, generic service, API route |
