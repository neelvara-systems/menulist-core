# SignalDesk Target Registry - Documentation Hub

**Feature:** SignalDesk Target Registry
**Status:** Runtime-backed and feature-audited
**Created:** June 23, 2026
**Last Updated:** July 21, 2026
**Parent project:** [MenuList SignalDesk](../README.md)

---

## What This Feature Covers

The Target Registry is the canonical private workspace for candidate business/location identity and source lineage. It stores list-safe target summaries separately from private target/contact detail, preserves suppression and source-policy authority, and feeds later scoring, evidence, draft, approval, conversation, and outcome modules through stable target IDs.

It prevents the system from becoming a flat lead sheet. The corrected review explicitly says SignalDesk must separate business/location target, source candidate, contact identity, channel identity, conversation, campaign/workflow, message/event, decision snapshot, suppression/consent event, MenuList outcome, and attribution touch (`../../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:103`).

## Quick Navigation

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-target-registry_spec.md) | Business requirements and object model. |
| [Implementation Plan](./signaldesk-target-registry_impl.md) | Technical blueprint and contracts. |
| [Firebase Cost Plan](./signaldesk-target-registry_firebase.md) | Collections, indexes, read/write model. |
| [Compliance Policy](./signaldesk-target-registry_compliance.md) | PII, source provenance, contact reveal, and suppression rules. |
| [Mobile Support](./signaldesk-target-registry_mobile-support.md) | Mobile decision for registry data. |
| [Test Cases](./signaldesk-target-registry_test-cases.md) | Registry and import test matrix. |

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 0.1 | 2026-06-23 | Created initial target registry doc set. |
| 0.2 | 2026-07-21 | Rebuilt from runtime truth: transactional 50-row imports, feature-flag enforcement, identity/provenance/suppression boundaries, 30-row cursor paging, mobile blocking, Firebase costs, and emulator evidence. |
