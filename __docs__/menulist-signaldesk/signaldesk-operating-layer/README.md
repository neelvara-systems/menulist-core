# SignalDesk Operating Layer

**Status:** Implementation slice approved
**Created:** June 24, 2026
**Parent:** [MenuList SignalDesk](../README.md)
**Audience:** Internal only

## Purpose

The operating layer turns SignalDesk from a broad control room into a daily solo-founder operating system.

It gives Danny and the growth team:

- a Daily Growth Mission with at most five ranked actions;
- lightweight experiment cards for one market pod at a time;
- approved offer/CTA records;
- reply-to-conversion playbooks;
- source-quality learning snapshots;
- a 7-day operating trial workflow.

## Boundary

- No provider send.
- No paid campaign automation.
- No public SignalDesk pages.
- No social auto-publish.
- No new paid provider adapters.
- No MenuList store/menu/project/billing writes.

SignalDesk prepares, ranks, records, and summarizes. MenuList remains the authority for actual owner activation.

## Doc Set

| Document | Purpose |
| --- | --- |
| [Spec](./signaldesk-operating-layer_spec.md) | Business rules and owner workflow. |
| [Implementation](./signaldesk-operating-layer_impl.md) | Runtime paths, actions, and UI plan. |
| [Firebase](./signaldesk-operating-layer_firebase.md) | Collections, rules, indexes, and cost posture. |
| [Compliance](./signaldesk-operating-layer_compliance.md) | Source, claim, send, public-surface, and approval boundaries. |
| [Mobile Support](./signaldesk-operating-layer_mobile-support.md) | Desktop-first decision with emergency mobile visibility only. |
| [Test Cases](./signaldesk-operating-layer_test-cases.md) | Functional, safety, and verification matrix. |

## First Runtime Slice

```txt
seed defaults
  -> create daily mission
  -> create experiment card
  -> upsert offer/CTA
  -> upsert reply playbook
  -> create source-quality snapshot
  -> review mission/experiment decisions
```

The first route is `/signaldesk/mission`.
