# Answerlattice Email Notifications Specification

> **Last verified:** July 19, 2026

## Customer job

When a customer leaves the product after submitting a support request, they need a reliable signal that the request was received and that support later replied or changed its state. The notification must reflect persisted ticket truth without letting a browser choose an arbitrary recipient or message.

## Required behavior

1. Persist the ticket mutation first.
2. Request the applicable notification without blocking the ticket workflow.
3. Reauthorize `MANAGE_SUPPORT` against the exact `tId` and `sId` supplied by the trusted DAL.
4. Read and validate the exact current ticket in that scope.
5. Project the recipient, event evidence, template fields, and deterministic reference from persisted data.
6. Claim delivery before SMTP.
7. Apply the recipient-day limit.
8. Resolve a bounded escaped template and send with finite SMTP deadlines.
9. Finalize only the matching claim as `sent`, `failed`, or `skipped`.

## Event rules

### Ticket created

- Eligible only after a ticket with a requester email is persisted.
- Recipient is `ticket.clientDetails.email`.
- Content is derived from the ticket subject, category, priority, display ID, and safe ticket URL.

### Ticket reply

- Requires a supplied message ID that resolves to one exact persisted message.
- System messages are not eligible.
- A message whose sender email equals the requester email is not eligible.
- Content uses the persisted reply preview and ticket identity.

### Ticket status changed

- Eligible only after the ticket transaction records a real status transition.
- Content uses the latest persisted status entry and optional remark.
- Ordinary edits that do not change status must not trigger this event.

### Activation test

- Requires a valid Answerlattice session and `VIEW_READINESS` permission.
- Limited to three attempts per workspace per hour.
- Recipient is the exact scoped workspace `supportEmail`.
- With the current owner-notification migration flags enabled, this registered test event is processed by the owner-notification pipeline. The three customer ticket events remain on the direct ticket notification path.

## Non-goals

- Inbound email replies.
- Marketing campaigns, broadcasts, or newsletters.
- Browser-selected recipients or arbitrary templates.
- A guarantee of inbox delivery, customer reading, or ticket resolution.
- Blocking a successful ticket mutation because email failed.

## Success measures

- Eligible direct ticket events accepted by SMTP once per deterministic reference.
- Duplicate/in-flight sends suppressed.
- Unauthorized, wrong-scope, deleted-ticket, system-message, and self-reply requests rejected.
- Notification failures visible through bounded logs without exposing raw sensitive payloads.
- Customers can return to the exact ticket after an eligible notification.
