# SignalDesk Demand Signals - Feature Doc Set

**Status:** Feature 14 locally source-complete; production data certification pending
**Created:** June 23, 2026
**Runtime reconciled:** July 21, 2026
**Parent:** [MenuList SignalDesk](../README.md)
**Audience:** Internal growth operators and maintainers

## Purpose

Demand Signals records compact internal indications of owner/business interest without turning anonymous MenuList usage into customer tracking. The implemented flow supports protected operator capture and compact aggregate summaries produced by approved Content Distribution and Trust Partner metric workflows.

## Implemented Boundary

- Five signal types: `qr_scan`, `link_click`, `share`, `claim_attempt`, and `referral`.
- Five source surfaces: `menu`, `qr`, `website`, `manual`, and `other`.
- Target-scoped capture uses canonical current SignalDesk target identity; general capture stores no free-text target identity.
- Exact actor/key replay proves the original event and source/day summary before returning `duplicate`.
- Summary reads are strict, bounded, and never expose the raw event collection to clients.
- Suppression is preserved and no target, outreach, send, or MenuList truth mutation is created from demand.
- Mobile remains SignalDesk dashboard-only; its compact control-room count may include demand, but Attribution is not available.

Not implemented: public MenuList surface hooks, customer identifiers, referral review collections, hook diagnostics, viral-route attribution collections, automatic target creation, or public analytics.

## Document Map

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-demand-signals_spec.md) | Current signal vocabulary and admission rules. |
| [Implementation](./signaldesk-demand-signals_impl.md) | Protected capture, producers, replay, and read model. |
| [Firebase](./signaldesk-demand-signals_firebase.md) | Exact collections, writes, reads, and cost. |
| [Compliance](./signaldesk-demand-signals_compliance.md) | Privacy, suppression, and identity limits. |
| [Mobile Support](./signaldesk-demand-signals_mobile-support.md) | Dashboard-only mobile contract. |
| [Test Cases](./signaldesk-demand-signals_test-cases.md) | Runtime, privacy, cost, and parity gates. |

## Production Gate

Source completion does not activate a public producer. Any future MenuList hook requires a separate privacy review, authenticated/abuse-bounded ingest design, retention decision, Firebase cost analysis, and explicit deployment approval. Provider sending remains disabled.
