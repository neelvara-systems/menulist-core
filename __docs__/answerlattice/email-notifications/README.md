# Answerlattice Email Notifications

Email notifications close the durable ticket fallback loop. After a ticket, support reply, or status change is persisted, the browser may request an email. The server then reauthorizes the exact workspace, rereads the persisted ticket, derives the recipient and content, claims the delivery identity, and sends through the configured SMTP account.

## Implemented events

| Event | Recipient | Authority |
|---|---|---|
| `TICKET_CREATED` | Persisted ticket requester | Exact ticket after scoped support authorization |
| `TICKET_REPLY` | Persisted ticket requester | Exact non-system message; requester self-replies are suppressed |
| `TICKET_STATUS_CHANGED` | Persisted ticket requester | Latest persisted status transition |
| `ANSWERLATTICE_NOTIFICATION_TEST` | Workspace support inbox | Dedicated Activation test route |

## Trust boundary

- The browser sends only `eventType`, `ticketId`, optional `messageId`, `tId`, and `sId`.
- The strict route rejects browser-supplied recipient, subject, template data, product, reference ID, and dedupe controls.
- `MANAGE_SUPPORT` permission is checked against the submitted workspace scope before the ticket is read.
- The exact persisted ticket must match the authorized scope and must not be deleted.
- Direct ticket delivery uses a deterministic Firestore row and a 15-minute transactional lease before SMTP.
- Subjects and HTML values are bounded and escaped; only validated HTTPS links render.
- The ticket notification authority hardening contract is source-verified by a focused verifier.

## Operational limits

- Send route: 16 KiB request body and 120 attempts per authenticated user per hour; provider failure is fail-closed.
- Direct ticket delivery: 20 sent emails per recipient per calendar day; rate-query failure is fail-closed.
- SMTP deadlines: 10 seconds connection, 10 seconds greeting, 15 seconds socket.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` are all required. No implicit port is supplied.
- Ticket persistence does not wait for browser-triggered email delivery.

## Current limitations

- Browser delivery requests are best-effort. Closing the tab or losing the network after ticket persistence can prevent the request from reaching the server.
- There is no inbound email-to-ticket or email-reply threading.
- Delivery success means SMTP accepted the message; it does not prove inbox placement or that the customer read it.
- Notifications must not be treated as the authoritative ticket record.

## Documentation

- [Specification](./email-notifications_spec.md)
- [Implementation](./email-notifications_impl.md)
- [Firebase](./email-notifications_firebase.md)
- [Test cases](./email-notifications_test-cases.md)
- [Help](./email-notifications_helpdoc.md)
- [Mobile](./email-notifications_mobile-support.md)
- [Website](./email-notifications_website.md)
- [Marketing](./email-notifications_marketing.md)

Connected dossiers: [Ticket System](../ticket-system/README.md), [Conversation Monitoring](../chat-monitoring/README.md), and [Owner Notifications](../../owner-notifications/README.md).
