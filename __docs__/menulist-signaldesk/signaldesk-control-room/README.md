# SignalDesk Control Room - Feature Doc Set

**Status:** Initial feature doc set
**Created:** June 23, 2026
**Parent:** [MenuList SignalDesk](../README.md)
**Audience:** Internal growth admins and future implementers

## Purpose

SignalDesk Control Room is the internal safety, cost, queue, and health dashboard for the private growth system.

It keeps the team aware of channel health, sender reputation risk, source quality, AI evals, suppression health, approval backlog, inbox load, outcome movement, demand signals, cost, incidents, and kill-switch state.

## Source Specs

- Spec 23: compliance and health checks
- Spec 24: channel health and cost
- Spec 27: evals and quality
- Spec 29: source health
- Foundation docs: roles, audit, kill switches

## Document Map

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-control-room_spec.md) | Dashboard scope, controls, and acceptance criteria. |
| [Implementation](./signaldesk-control-room_impl.md) | Summary-first architecture and dashboard modules. |
| [Firebase](./signaldesk-control-room_firebase.md) | Summary, incident, kill-switch, eval, and cost collections. |
| [Compliance](./signaldesk-control-room_compliance.md) | Incident handling, safety controls, and audit rules. |
| [Mobile Support](./signaldesk-control-room_mobile-support.md) | Emergency mobile visibility and kill-switch constraints. |
| [Test Cases](./signaldesk-control-room_test-cases.md) | Health, kill-switch, cost, incident, and mobile tests. |

## Boundary

The control room is an internal operating surface. It does not optimize campaigns automatically, does not override compliance rules, and does not send messages.

## Build Gate

Do not implement high-volume sending or source automation until control-room summaries, incident handling, and kill switches are implemented.
