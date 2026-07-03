# Answerlattice Email Notifications — Implementation

> **Version:** 1.1.0
> **Last Updated:** 2026-06-28
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

src/app/api/answerlattice/notifications/
└── test/route.ts     # Answerlattice workspace test-send verification

src/config/features.ts  # ENABLE_ANSWERLATTICE_NOTIFICATIONS flag
src/database/tickets/index.ts  # Wired: addTicket, addTicketMessage, updateTicketStatus
```

---

## Component Details

### 1. Core Sender (`src/lib/notifications/index.ts`)

**Runtime:** Server-side only (uses firebase-admin + nodemailer)
**Main function:** `sendNotification(payload)` → returns `boolean` (sent or not)

**Flow:**
1. Feature flag check (`ENABLE_ANSWERLATTICE_NOTIFICATIONS`)
2. Input validation (email, eventType, referenceId required)
3. Idempotency check (deterministic eventType + referenceId log document)
4. Rate limit check (20/day per recipient email)
5. Template resolution (eventType → subject + HTML)
6. SMTP send via cached nodemailer transporter
7. Log result to `answerlattice_notificationLogs` for Answerlattice events

**Key properties:**
- Never throws — always returns boolean
- SMTP transporter cached (single connection reused)
- Same SMTP env vars as lifecycle messaging (SMTP_HOST, SMTP_USER, SMTP_PASS)
- Idempotency: deterministic by event type + reference ID unless caller sets `skipDedup`
- Rate limit: 20 emails/day per recipient
- Answerlattice readiness helper: `getNotificationReadiness(PRODUCT_IDS.ANSWERLATTICE)`
- Runtime diagnostics use `src/lib/notifications/notificationDiagnostics.ts`; missing-template, send, trigger, rate-limit-log, and success contexts record event/product plus bounded reference/recipient metadata only. They do not direct-console raw emails, names, ticket metadata, reference IDs, or provider/browser errors.

### 2. Client Trigger (`src/lib/notifications/client.ts`)

**Runtime:** Client-side (browser)
**Main function:** `triggerNotification(params)` → returns `void`

**Design:** Simple `fetch()` POST to `/api/notifications/send`, wrapped in `.catch()` for non-blocking failure. Intentionally not `await`ed by callers — true fire-and-forget. Development builds record bounded trigger-request diagnostics through `notificationDiagnostics.ts`; production ticket writes are never blocked by email delivery and production client triggers stay silent on request failure.

### 3. Templates (`src/lib/notifications/templates.ts`)

**4 templates registered:**

| Event Type | Subject | Content |
|-----------|---------|---------|
| `TICKET_CREATED` | "Ticket received: {subject}" | Confirmation with ID, category, priority |
| `TICKET_REPLY` | "Reply on your ticket: {subject}" | Reply preview (300 chars), replier name |
| `TICKET_STATUS_CHANGED` | "Ticket updated: {subject} — {status}" | New status, remark |
| `ANSWERLATTICE_NOTIFICATION_TEST` | "Answerlattice notification test" | Activation verification email for the workspace support inbox |

**Template structure:** Each template is a function `(metadata) => { subject, html }`. HTML uses inline styles matching lifecycle messaging tone (infrastructure-grade, calm, non-marketing).

**Adding new templates:** Add entry to `NOTIFICATION_TEMPLATES` object. Key = event type string. Done.

### 4. API Route (`src/app/api/notifications/send/route.ts`)

**Auth:** `withAuth()` — only authenticated users can trigger notifications
**Rate limit:** 120 attempts/hour per authenticated user; the limiter key stores a `hashPublicRateLimitValue(userId || 'unknown')` segment, not the raw user id/email
**Body limit:** 16KB bounded JSON body before schema validation or dispatch
**Method:** POST
**Body:** `{ eventType, recipientEmail, recipientName?, referenceId, metadata?, productId?, skipDedup? }`
**Response:** `{ sent: boolean }`

Accepted client events are limited to `TICKET_CREATED`, `TICKET_REPLY`, and `TICKET_STATUS_CHANGED`. The Activation test event uses the dedicated Answerlattice test route instead of the generic client route. Request metadata is capped at 8KB to avoid accidental large payload logging or email rendering, and the full route body is capped at 16KB before validation so malformed or oversized client notification requests never reach template resolution, idempotency checks, rate-limit log queries, SMTP, or notification-log writes.

Unexpected route failures use `notification_send_route_failed` through `src/lib/notifications/notificationDiagnostics.ts` with bounded user, recipient, reference, product, and metadata counts plus source error name/code/status only. The route no longer raw-logs caught exceptions through `secureError('[Notification API] Error', ...)`.

### 5. Answerlattice Test Route (`src/app/api/answerlattice/notifications/test/route.ts`)

**Auth:** `withAuth()` plus Answerlattice session-scope resolution.
**Rate limit:** 3 test emails per workspace per hour.
**Recipient:** `stores/{sId}.supportEmail`.
**Purpose:** lets an Answerlattice buyer verify sender configuration before paid launch without creating a fake ticket.

The test route applies the workspace rate limit before permission, Firebase readiness, store reads, or SMTP send work. Unexpected route failures use `answerlattice_notification_test_failed` with bounded tenant/store metadata instead of raw `secureError` exception context.

### 6. Ticket DAL Wiring (`src/database/tickets/index.ts`)

| Function | Notification | Recipient |
|----------|-------------|-----------|
| `addTicket()` | `TICKET_CREATED` | `data.clientDetails.email` (ticket submitter) |
| `addTicketMessage()` | `TICKET_REPLY` | `message._notifyEmail` (ticket creator, set by calling component) |
| `updateTicketStatus()` | `TICKET_STATUS_CHANGED` | `changedBy._notifyEmail` (ticket creator, set by calling component) |

**Note on `_notifyEmail`:** The DAL functions don't know the ticket creator's email (they only receive the current message/status change data). The calling UI component attaches `_notifyEmail` and `_notifyName` as transient fields on the message/changedBy object. These are NOT persisted to Firestore — they're only used for the notification call.

---

## Firestore Collection

**Answerlattice collection:** `answerlattice_notificationLogs`

Legacy/non-Answerlattice callers still use `notificationLogs`. Answerlattice ticket and test notifications pass `productId: 'AL'` and write logs in the Answerlattice Firebase project.

| Field | Type | Description |
|-------|------|-------------|
| `eventType` | string | Event identifier (e.g., 'TICKET_REPLY') |
| `recipientEmail` | string | Recipient email address |
| `referenceId` | string | Unique reference for idempotency |
| `status` | string | 'sent', 'failed', or 'skipped' |
| `subject` | string | Email subject line |
| `messageId` | string/null | SMTP message ID (if sent) |
| `error` | string/null | Error message (if failed) |
| `reason` | string/null | Skip reason such as `rate_limited` |
| `createdAt` | Timestamp | When the notification was sent/attempted |

**Indexes needed:**
- `recipientEmail` + `status` + `createdAt` on `answerlattice_notificationLogs` for rate-limit checks.
- Idempotency uses deterministic document IDs and does not require a composite query.

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
| 2026-06-28 | 1.1.2 | Moved notification test route rate limiting before permission/readiness/store/send work and switched unexpected failures to bounded runtime diagnostics. |
| 2026-06-27 | 1.1.1 | Added 16KB bounded request-body admission before schema validation and notification dispatch. |
| 2026-05-22 | 1.1.0 | Enabled Answerlattice verification, product-aware logs, deterministic idempotency, test-send route, and cost-safe DAL guards. |
| 2026-03-07 | 1.0.0 | Initial implementation |
