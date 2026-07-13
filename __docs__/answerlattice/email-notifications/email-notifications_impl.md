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
3. Transactionally claim the deterministic eventType + referenceId log document
4. Rate limit check (20/day per recipient email)
5. Resolve a bounded/escaped template
6. Send through the deadline-bounded cached SMTP transporter with deterministic Message-ID
7. Transactionally finalize the same claim in `answerlattice_notificationLogs`

**Key properties:**
- Never throws — always returns boolean
- SMTP transporter cached (single connection reused)
- Same SMTP env vars as lifecycle messaging (SMTP_HOST, SMTP_USER, SMTP_PASS)
- Idempotency: deterministic event/reference plus a transaction-owned delivery lease; callers cannot bypass it
- Rate limit: 20 emails/day per recipient
- Answerlattice readiness helper: `getNotificationReadiness(PRODUCT_IDS.ANSWERLATTICE)`
- Runtime diagnostics use `src/lib/notifications/notificationDiagnostics.ts`; missing-template, send, trigger, rate-limit-log, and success contexts record event/product plus bounded reference/recipient metadata only. They do not direct-console raw emails, names, ticket metadata, reference IDs, or provider/browser errors.

### 2. Client Trigger (`src/lib/notifications/client.ts`)

**Runtime:** Client-side (browser)
**Main function:** `triggerNotification(params)` → returns `void`

**Design:** Simple `fetch()` POST to `/api/notifications/send`, wrapped in `.catch()` for non-blocking failure. Intentionally not `await`ed by callers — true fire-and-forget. Development builds record bounded trigger-request diagnostics through `notificationDiagnostics.ts`; production ticket writes are never blocked by email delivery and production client triggers stay silent on request failure.

**July 13 ticket notification authority hardening:** the client payload is now only `{eventType,ticketId,messageId?}`. The authenticated route fails the limiter closed, rechecks current Answerlattice support permission, reads/parses the exact scoped ticket, and derives the recipient, product, template fields and deterministic reference. The server sender transactionally claims the deterministic log row before SMTP and claim-checks finalization; SMTP has finite connection/greeting/socket timeouts and deterministic Message-ID. Template subject/HTML values are bounded and escaped, and only HTTPS links render. Browser-supplied recipient, metadata, reference, product and dedupe bypass are retired.

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

**Auth:** `withAuth()` plus fresh `canManageSupport` admission against the current Answerlattice workspace
**Rate limit:** fail-closed 120 attempts/hour per authenticated user; the limiter key stores a `hashPublicRateLimitValue(userId || 'unknown')` segment, not the raw user id/email. Provider unavailability returns 503; caller quota remains 429.
**Body limit:** 16KB bounded JSON body before schema validation or dispatch
**Method:** POST
**Body:** `{ eventType, ticketId, messageId? }`. The strict route rejects unknown fields. Current workspace permission and the exact persisted ticket determine recipient, template values, product and deterministic reference.
**Response:** `{ sent: boolean }`

Accepted client events are limited to `TICKET_CREATED`, `TICKET_REPLY`, and `TICKET_STATUS_CHANGED`. The Activation test event uses the dedicated Answerlattice test route instead of the client route. The 16KB body cap and strict identifier-only schema run before current permission/ticket reads; unknown recipient/template/reference/product fields are rejected rather than size-capped and trusted.

Unexpected route failures use `notification_send_route_failed` through `src/lib/notifications/notificationDiagnostics.ts` with bounded user, recipient, reference, product, and metadata counts plus source error name/code/status only. The route no longer raw-logs caught exceptions through `secureError('[Notification API] Error', ...)`.

### 5. Answerlattice Test Route (`src/app/api/answerlattice/notifications/test/route.ts`)

**Auth:** `withAuth()` plus Answerlattice session-scope resolution.
**Rate limit:** 3 test emails per workspace per hour.
**Recipient:** `stores/{sId}.supportEmail`.
**Purpose:** lets an Answerlattice buyer verify sender configuration before paid launch without creating a fake ticket.

The test route applies the workspace rate limit before permission, Firebase readiness, store reads, or SMTP send work. Unexpected route failures use `answerlattice_notification_test_failed` with bounded tenant/store metadata instead of raw `secureError` exception context.

### 6. Ticket DAL Wiring (`src/database/tickets/index.ts`)

| Function | Browser trigger | Server-derived recipient/evidence |
|----------|-----------------|-----------------------------------|
| `addTicket()` | `TICKET_CREATED` + ticket ID | Exact ticket `clientDetails.email`; ticket subject/category/priority |
| `addTicketMessage()` | `TICKET_REPLY` + ticket/message IDs | Exact non-system persisted message; creator email; self-reply suppressed |
| `updateTicketStatus()` | `TICKET_STATUS_CHANGED` + ticket ID | Exact latest status entry and creator email; status-count reference |

Transient `_notifyEmail`, `_notifyName`, arbitrary metadata, product, reference and `skipDedup` are not notification authority. The route ignores none of them: its strict schema rejects them.

---

## Firestore Collection

**Answerlattice collection:** `answerlattice_notificationLogs`

Legacy/non-Answerlattice callers still use `notificationLogs`. Answerlattice ticket and test notifications pass `productId: 'AL'` and write logs in the Answerlattice Firebase project.

| Field | Type | Description |
|-------|------|-------------|
| `eventType` | string | Event identifier (e.g., 'TICKET_REPLY') |
| `recipientEmail` | string | Recipient email address |
| `referenceId` | string | Unique reference for idempotency |
| `status` | string | Transitional `sending`, then `sent`, `failed`, or `skipped` |
| `subject` | string | Email subject line |
| `messageId` | string/null | SMTP message ID (if sent) |
| `error` | string/null | Error message (if failed) |
| `reason` | string/null | Skip reason such as `rate_limited` |
| `createdAt` | Timestamp | When the notification was sent/attempted |
| `modifiedAt` | Timestamp | Last claim/finalization transition |
| `claimId` / `claimExpiresAt` | string / Timestamp | Private in-flight lease fields; removed on matching finalization |

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
