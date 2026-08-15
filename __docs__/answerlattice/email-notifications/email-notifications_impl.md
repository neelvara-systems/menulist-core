# Answerlattice Email Notifications Implementation

> **Last verified:** July 19, 2026

## Runtime map

| File | Responsibility |
|---|---|
| `src/database/tickets/index.ts` | Requests created, reply, and status notifications after successful persistence |
| `src/lib/notifications/client.ts` | Sends the strict best-effort browser request |
| `src/app/api/notifications/send/route.ts` | Rate limits, validates, authorizes scope, reads the ticket, and projects the event |
| `src/lib/notifications/ticketNotificationBoundary.ts` | Converts persisted ticket evidence into a server-owned payload |
| `src/lib/notifications/index.ts` | Claims, limits, templates, sends, and finalizes direct notification delivery |
| `src/lib/notifications/deliveryClaim.ts` | Owns the 15-minute transactional delivery lease |
| `src/lib/notifications/smtpConfig.ts` | Strictly parses the four SMTP environment variables |
| `src/lib/notifications/templates.ts` | Escapes and bounds the three ticket templates and test template |
| `src/app/api/answerlattice/notifications/test/route.ts` | Sends the scoped Activation verification event |

## Browser request contract

```ts
type TriggerNotificationParams = {
  eventType: 'TICKET_CREATED' | 'TICKET_REPLY' | 'TICKET_STATUS_CHANGED';
  ticketId: string;
  messageId?: string;
  tId: number;
  sId: number;
};
```

The route schema is strict. It accepts no email address, name, subject, HTML, metadata, product ID, reference ID, or dedupe bypass.

## Admission order

1. `withAuth()` establishes the signed-in session.
2. A hashed user key is limited to 120 requests per hour and fails closed when the rate provider is unavailable.
3. The request body is capped at 16 KiB and parsed by the strict schema.
4. `requireAnswerlatticePermission(...MANAGE_SUPPORT, {tenantId: tId, storeId: sId})` runs before the ticket read.
5. `supportTickets/{ticketId}` is read from the Answerlattice Admin client.
6. The ticket parser rejects missing, deleted, malformed, or wrong-scope documents.
7. The projector validates event-specific persisted evidence.
8. `sendNotification()` receives only the server-owned projection.

This order is the ticket notification authority hardening boundary.

## Direct delivery state machine

```text
deterministic log ID
  -> transaction claim: sending + claimId + claimExpiresAt
  -> recipient-day sent query
  -> template resolution
  -> SMTP send with deterministic Message-ID
  -> claim-bound finalization: sent | failed | skipped
```

- Exact sent rows are never reclaimed.
- An unexpired `sending` row is treated as in flight.
- A crashed sender may be reclaimed after 15 minutes.
- Finalization fails if the claim ID no longer owns the row.
- The sender returns `false` rather than throwing to the caller.

## Event projection

| Event | Required persisted evidence | Rejection examples |
|---|---|---|
| `TICKET_CREATED` | Requester email and current ticket | Missing recipient or deleted ticket |
| `TICKET_REPLY` | Exact non-system message and requester email | Missing message, system message, requester self-reply |
| `TICKET_STATUS_CHANGED` | Latest status history entry | No valid status evidence |

The DAL decides reply eligibility inside the ticket transaction and still relies on the server projector as the final authority.

## SMTP and content safety

- Required environment: `SMTP_HOST`, numeric `SMTP_PORT` from 1 to 65535, `SMTP_USER`, and non-empty `SMTP_PASS`.
- Port 465 enables secure mode; all other valid ports use non-secure transport configuration.
- Transport deadlines are 10s connection, 10s greeting, and 15s socket.
- Template strings are trimmed, bounded, line-break sanitized for subjects, and HTML escaped.
- Links render only when they parse as HTTPS and remain under the template limit.
- Diagnostics record bounded identifiers and error codes, not raw ticket payloads or SMTP secrets.

## Activation test path

`/api/answerlattice/notifications/test` resolves the current Answerlattice workspace, limits to three attempts per hour, checks `VIEW_READINESS`, verifies Firebase and SMTP readiness, rereads the exact store, and uses its `supportEmail`.

`ANSWERLATTICE_NOTIFICATION_TEST`, exact Answerlattice billing lifecycle events, support-credit low/exhausted state, and first widget-runtime verification are registered in the owner-notification registry. Shared Razorpay callers pass the resolved `productId`, and `sendLifecycleMessage()` enqueues `AL` events into Answerlattice Firestore without consulting or falling through to the MenuList legacy sender. Ticket-created, reply, and status events are not registered there and continue through `answerlattice_notificationLogs`.

## Failure semantics

- Ticket creation/reply/status persistence can succeed when browser notification triggering fails.
- A closed tab or network interruption can prevent the browser request entirely.
- A server send failure is recorded and returns `sent: false`; there is no inbound retry worker in this feature.
- SMTP acceptance is not evidence of inbox placement.
