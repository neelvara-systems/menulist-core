# SignalDesk Source Policy - Documentation Hub

**Feature:** SignalDesk Source Policy
**Status:** Initial doc set
**Created:** June 23, 2026
**Last Updated:** June 23, 2026
**Parent project:** [MenuList SignalDesk](../README.md)

---

## What This Feature Covers

Source Policy defines what SignalDesk may collect, store, use, display, export, or contact from each source.

It exists because source providers are not truth providers, and data availability is not outreach permission.

## Quick Navigation

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-source-policy_spec.md) | Source-policy requirements and allowed-use model. |
| [Implementation Plan](./signaldesk-source-policy_impl.md) | Policy registry contracts and guard points. |
| [Firebase Cost Plan](./signaldesk-source-policy_firebase.md) | Policy and source-run collections. |
| [Compliance Policy](./signaldesk-source-policy_compliance.md) | Google/Foursquare/Apify/manual source guardrails. |
| [Mobile Support](./signaldesk-source-policy_mobile-support.md) | Mobile posture for source policy. |
| [Test Cases](./signaldesk-source-policy_test-cases.md) | Source-policy test matrix. |

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 0.1 | 2026-06-23 | Created initial source policy doc set. |
| 0.2 | 2026-06-23 | Updated Apify from blocked-only planning to gated Source Broker use after source policy, provider approval, env Actor review, and budget cap. |
| 0.3 | 2026-07-15 | Added the locally implemented, deploy-gated source-data retention lifecycle, root-writer contract, Firebase query/cost model, and focused emulator coverage. |
| 0.4 | 2026-07-15 | Closed the public-capability gap by making target retention revoke active outcome route tokens and scrub retained token display names. |
