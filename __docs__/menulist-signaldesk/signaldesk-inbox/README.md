# SignalDesk Inbox

**Status:** Code-complete local runtime; external provider and hosted-browser certification pending
**Last reviewed:** July 21, 2026
**Parent:** [MenuList SignalDesk](../README.md)

SignalDesk Inbox is the private desktop workspace for recording actual contact results and inbound replies. It preserves normalized evidence, classifies replies with one deterministic rules contract, updates the current conversation and target, and applies suppression or incident pauses synchronously when safety language is detected.

## Current Boundary

- Manual capture and signed provider webhooks use the same reply classifier.
- The current target conversation is authoritative; fabricated, stale, or `new` conversation IDs are rejected.
- `interested`, `needs_review`, complaint, privacy, and legal states count as actionable Inbox work.
- Complaint, privacy, legal, DNC, and wrong-contact signals cannot be weakened by a later non-safety reply.
- Inbox reads actionable summaries plus recent history without reading full message documents.
- Provider sending remains separately controlled and disabled by default.
- Mobile is observe-only; Inbox mutations are blocked by the mobile API contract.

## Documents

- [Specification](./signaldesk-inbox_spec.md)
- [Implementation](./signaldesk-inbox_impl.md)
- [Firebase and cost](./signaldesk-inbox_firebase.md)
- [Compliance](./signaldesk-inbox_compliance.md)
- [Mobile support](./signaldesk-inbox_mobile-support.md)
- [Test cases](./signaldesk-inbox_test-cases.md)

## Focused Gate

```bash
npm run test:signaldesk:inbox-boundary
```

No separate public inbox, autonomous reply composer, classifier override UI, assignment queue, or mobile mutation flow exists.
