# Canonica Email Notifications — Implementation

> **Version:** 1.0.0
> **Last Updated:** 2026-03-07
> **Audience:** Developers

---

## File Structure

```
src/lib/notifications/
├── index.ts          # Core sender (server-side, firebase-admin, nodemailer)
├── client.ts         # Client-side fire-and-forget trigger
└── templates.ts      # Template registry (event type → subject + HTML)

src/app/api/notifications/
└── send/route.ts     # API route (withAuth, bridges client → server)

src/config/features.ts  # ENABLE_CANONICA_NOTIFICATIONS flag
src/database/tickets/index.ts  # Wired: addTicket, addTicketMessage, updateTicketStatus
```

---

## Component Details

### 1. Core Sender (`src/lib/notifications/index.ts`)

**Runtime:** Server-side only (uses firebase-admin + nodemailer)
**Main function:** `sendNotification(payload)` → returns `boolean` (sent or not)

**Flow:**
1. Feature flag check (`ENABLE_CANONICA_NOTIFICATIONS`)
2. Input validation (email, eventType, referenceId required)
3. Idempotency check (dedup by eventType + referenceId within 24h)
4. Rate limit check (20/day per recipient email)
5. Template resolution (eventType → subject + HTML)
6. SMTP send via cached nodemailer transporter
7. Log result to `notificationLogs` collection

**Key properties:**
- Never throws — always returns boolean
- SMTP transporter cached (single connection reused)
- Same SMTP env vars as lifecycle messaging (SMTP_HOST, SMTP_USER, SMTP_PASS)
- Idempotency window: 24 hours
- Rate limit: 20 emails/day per recipient

### 2. Client Trigger (`src/lib/notifications/client.ts`)

**Runtime:** Client-side (browser)
**Main function:** `triggerNotification(params)` → returns `void`

**Design:** Simple `fetch()` POST to `/api/notifications/send`, wrapped in `.catch(() => {})` for silent failure. Intentionally not `await`ed by callers — true fire-and-forget.

### 3. Templates (`src/lib/notifications/templates.ts`)

**3 templates registered:**

| Event Type | Subject | Content |
|-----------|---------|---------|
| `TICKET_CREATED` | "Ticket received: {subject}" | Confirmation with ID, category, priority |
| `TICKET_REPLY` | "Reply on your ticket: {subject}" | Reply preview (300 chars), replier name |
| `TICKET_STATUS_CHANGED` | "Ticket updated: {subject} — {status}" | New status, remark |

**Template structure:** Each template is a function `(metadata) => { subject, html }`. HTML uses inline styles matching lifecycle messaging tone (infrastructure-grade, calm, non-marketing).

**Adding new templates:** Add entry to `NOTIFICATION_TEMPLATES` object. Key = event type string. Done.

### 4. API Route (`src/app/api/notifications/send/route.ts`)

**Auth:** `withAuth()` — only authenticated users can trigger notifications
**Method:** POST
**Body:** `{ eventType, recipientEmail, recipientName?, referenceId, metadata?, skipDedup? }`
**Response:** `{ sent: boolean }`

### 5. Ticket DAL Wiring (`src/database/tickets/index.ts`)

| Function | Notification | Recipient |
|----------|-------------|-----------|
| `addTicket()` | `TICKET_CREATED` | `data.clientDetails.email` (ticket submitter) |
| `addTicketMessage()` | `TICKET_REPLY` | `message._notifyEmail` (ticket creator, set by calling component) |
| `updateTicketStatus()` | `TICKET_STATUS_CHANGED` | `changedBy._notifyEmail` (ticket creator, set by calling component) |

**Note on `_notifyEmail`:** The DAL functions don't know the ticket creator's email (they only receive the current message/status change data). The calling UI component attaches `_notifyEmail` and `_notifyName` as transient fields on the message/changedBy object. These are NOT persisted to Firestore — they're only used for the notification call.

---

## Firestore Collection

**Collection:** `notificationLogs` (NEW)

| Field | Type | Description |
|-------|------|-------------|
| `eventType` | string | Event identifier (e.g., 'TICKET_REPLY') |
| `recipientEmail` | string | Recipient email address |
| `referenceId` | string | Unique reference for idempotency |
| `status` | string | 'sent' or 'failed' |
| `subject` | string | Email subject line |
| `messageId` | string/null | SMTP message ID (if sent) |
| `error` | string/null | Error message (if failed) |
| `createdAt` | Timestamp | When the notification was sent/attempted |

**Indexes needed:**
- `eventType` + `referenceId` + `status` + `createdAt` (idempotency query)
- `recipientEmail` + `status` + `createdAt` (rate limit query)

---

## Environment Variables

Same as lifecycle messaging — no new env vars needed:
- `SMTP_HOST` — SMTP server hostname
- `SMTP_PORT` — SMTP port (default: 587)
- `SMTP_USER` — SMTP username
- `SMTP_PASS` — SMTP password

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-07 | 1.0.0 | Initial implementation |
