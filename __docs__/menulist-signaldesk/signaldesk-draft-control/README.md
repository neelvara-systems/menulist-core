# SignalDesk Draft Control - Documentation Hub

**Feature:** SignalDesk Draft Control
**Status:** Locally source-complete; provider send remains disabled
**Created:** June 23, 2026
**Last Updated:** July 21, 2026
**Parent project:** [MenuList SignalDesk](../README.md)

## Purpose

Draft Control converts one current, personalization-authorized evidence packet
into one deterministic email draft and one pending human-review unit. It does not call an AI provider, edit templates, approve, export, contact, or send.

The server binds current target/source lineage, contact authority, evidence,
template, CTA, sender domain, suppression, and prior-contact state before any
write. Exact/concurrent retries converge on the same draft, approval, and packet.

## Documents

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-draft-control_spec.md) | Current behavior and boundaries. |
| [Implementation](./signaldesk-draft-control_impl.md) | Runtime flow, identity, and authority checks. |
| [Firebase](./signaldesk-draft-control_firebase.md) | Collections, reads/writes, retention, and deployment. |
| [Compliance](./signaldesk-draft-control_compliance.md) | Source, contact, copy, and channel controls. |
| [Mobile Support](./signaldesk-draft-control_mobile-support.md) | Observe-only mobile behavior. |
| [Test Cases](./signaldesk-draft-control_test-cases.md) | Focused and cross-feature regressions. |

## Current Boundaries

- The only current draft channel is email.
- The only seeded draft template is `template_current_list_intro_v1`.
- Template text is deterministic; SignalDesk AI Assist is a separate feature.
- Templates are seeded/server-owned and listed in the workspace; there is no template editor.
- Mobile can observe drafts but cannot create, approve, export, or send.
- Firestore clients can read projected SD records with platform authority but cannot write them.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | 2026-07-21 | Rebuilt from runtime truth and hardened template, evidence, UI, and approval authority. |
| 0.1 | 2026-06-23 | Initial planning set. |
