# SignalDesk Email Rail - Documentation Hub

**Feature:** SignalDesk Email Rail
**Status:** Locally source-complete; provider send remains disabled
**Created:** June 23, 2026
**Last Updated:** July 21, 2026
**Parent project:** [MenuList SignalDesk](../README.md)

## Purpose

Email Rail moves one current, approved email unit into one of three bounded
states: manual export, assisted handoff, or a one-step owned queue. It is not a
bulk campaign engine. Every route re-reads source-policy, recipient,
suppression, prior-contact, CTA, sender, draft, approval, and pause authority
inside the server transaction.

Actual SMTP execution exists but remains unavailable while
`ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND` is false. This keeps review and
export useful without implying that live sending is certified.

## Documents

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-email-rail_spec.md) | Current product and safety contract. |
| [Implementation](./signaldesk-email-rail_impl.md) | Runtime paths, state transitions, replay, and UI. |
| [Owned Sequencer](./signaldesk-email-rail_owned-sequencer.md) | One-step owned queue and external handoff boundary. |
| [Firebase](./signaldesk-email-rail_firebase.md) | Existing collections, bounded operations, retention, and deploy impact. |
| [Compliance](./signaldesk-email-rail_compliance.md) | Sender, unsubscribe, suppression, and incident controls. |
| [Mobile Support](./signaldesk-email-rail_mobile-support.md) | Observe-only mobile contract. |
| [Test Cases](./signaldesk-email-rail_test-cases.md) | Current regression matrix. |

## Current Boundary

- Export and handoff require `message.export`; live send requires `message.send`; sender changes require `channel.configure`.
- Email paths accept only an approved email draft. Another channel cannot be relabeled as email.
- Exact completed operations replay redacted durable truth and never call the provider again.
- A blocked sequencer handoff can re-evaluate provider readiness in place; an unchanged blocked retry has no repeated write effects.
- Channels loads approved actions and queued/ready sequence work before recent terminal history.
- Mobile is read-only. It does not export, send, queue, reveal recipients, or configure sender identity.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | 2026-07-21 | Rebuilt from runtime truth and hardened channel binding, blocked recovery, actionable reads, permission parity, and tests. |
| 0.2 | 2026-06-23 | Added the owned one-step queue. |
| 0.1 | 2026-06-23 | Initial planning set. |
