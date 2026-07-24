# SignalDesk Approval Queue - Documentation Hub

**Feature:** SignalDesk Approval Queue
**Status:** Locally source-complete; export remains manual and provider send remains disabled
**Created:** June 23, 2026
**Last Updated:** July 21, 2026
**Parent project:** [MenuList SignalDesk](../README.md)

## Purpose

The Approval Queue is the human decision boundary between a deterministic,
authority-bound draft and any downstream export or handoff. It reviews only the
current email draft unit created by Draft Control. It is not a generic workflow
engine and it does not approve sources, providers, incidents, or MenuList writes.

An approval is useful only while its exact draft, evidence, source policy,
contact, CTA, sender, template, target, suppression, and prior-contact authority
remain current. The server re-reads those authorities inside the terminal review
transaction; the browser packet is decision context, not authorization.

## Documents

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-approval-queue_spec.md) | Current scope and decision contract. |
| [Implementation](./signaldesk-approval-queue_impl.md) | Queue reads, packet refresh, review transaction, and replay. |
| [Firebase](./signaldesk-approval-queue_firebase.md) | Existing collections, bounded reads/writes, retention, and deployment. |
| [Compliance](./signaldesk-approval-queue_compliance.md) | Human authority, invalidators, and downstream limits. |
| [Mobile Support](./signaldesk-approval-queue_mobile-support.md) | Observe-only mobile contract. |
| [Test Cases](./signaldesk-approval-queue_test-cases.md) | Focused and cross-feature regressions. |

## Current Boundaries

- Draft creation atomically creates one pending approval and one packet.
- Approval and rejection require `draft.approve`; packet refresh requires `target.review`; export requires `message.export`.
- Approve and reject are desktop-only. Mobile can observe bounded queue state.
- Approval authorizes the exact email/export unit only. It never sends, publishes, creates a MenuList route, or changes source policy.
- Exact same-actor terminal retries replay durable truth without duplicate audit, cost, or queue effects. Conflicting retries fail closed.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | 2026-07-21 | Rebuilt from runtime truth and hardened replay, queue reachability, permission parity, and packet readiness. |
| 0.1 | 2026-06-23 | Initial planning set. |
