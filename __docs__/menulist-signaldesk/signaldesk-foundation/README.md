# SignalDesk Foundation - Documentation Hub

**Feature:** SignalDesk Foundation
**Status:** Runtime-backed and feature-audited
**Created:** June 23, 2026
**Last Updated:** July 21, 2026
**Parent project:** [MenuList SignalDesk](../README.md)

---

## What This Feature Covers

SignalDesk Foundation is the base layer for the private internal tool:

- internal access boundary;
- team roles and internal team access management;
- audit events;
- contact reveal audit;
- kill switches;
- feature/config flags;
- admin-only control room primitives.

This must exist before target imports, AI scoring, drafts, sends, inbox work, or attribution.

## Quick Navigation

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-foundation_spec.md) | Business requirements and role model. |
| [Implementation Plan](./signaldesk-foundation_impl.md) | Technical blueprint and future file/contracts plan. |
| [Firebase Cost Plan](./signaldesk-foundation_firebase.md) | Collections, reads/writes, audit and kill-switch cost model. |
| [Compliance Policy](./signaldesk-foundation_compliance.md) | Access, audit, contact reveal, and emergency-control rules. |
| [Mobile Support](./signaldesk-foundation_mobile-support.md) | Mobile emergency-control scope. |
| [Test Cases](./signaldesk-foundation_test-cases.md) | Foundation test matrix. |

## Why This Is First

The corrected review says the first build must start with team auth, roles, and audit logs because the internal tool handles PII and send decisions (`../../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:215`).

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 0.1 | 2026-06-23 | Created first per-feature SignalDesk doc set. |
| 0.2 | 2026-06-25 | Documented implemented Settings-based team member add/update/deactivate flow and audited role assignment. |
| 0.3 | 2026-07-21 | Reconciled current-user/session admission, transactional member identity, human-role enforcement, Firebase costs, mobile parity, and emulator evidence. |
| 0.4 | 2026-07-21 | Reconciled durable audit/privacy boundaries and added stable, bounded older-history pagination with emulator evidence. |
| 0.5 | 2026-07-21 | Reconciled all eleven kill-switch scopes, stable audit classification, clean reactivation state, and the mobile global-emergency-only boundary. |
| 0.6 | 2026-07-26 | Reconciled shared protected-route admission: actor-scoped rate limiting now precedes membership/permission reads and fails closed when distributed limiter authority is unavailable. |
