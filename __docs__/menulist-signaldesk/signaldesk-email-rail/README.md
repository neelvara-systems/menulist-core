# SignalDesk Email Rail - Documentation Hub

**Feature:** SignalDesk Email Rail
**Status:** Export rail plus owned low-volume sequencer queue implemented; real send remains gated
**Created:** June 23, 2026
**Last Updated:** June 23, 2026
**Parent project:** [MenuList SignalDesk](../README.md)

---

## What This Feature Covers

Email Rail is the first controlled outbound rail for SignalDesk.

The corrected review recommends starting with email because it is easier to test, pause, track, and make compliant than WhatsApp (`../../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:282`).

## Quick Navigation

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-email-rail_spec.md) | Email/export requirements. |
| [Implementation Plan](./signaldesk-email-rail_impl.md) | Sender, unsubscribe, export/send contracts. |
| [Owned Email Sequencer](./signaldesk-email-rail_owned-sequencer.md) | Self-owned sequencer decision, queue, guards, and Smartlead fallback boundary. |
| [Firebase Cost Plan](./signaldesk-email-rail_firebase.md) | Email event and summary cost model. |
| [Compliance Policy](./signaldesk-email-rail_compliance.md) | CAN-SPAM/Gmail-style sender rules. |
| [Mobile Support](./signaldesk-email-rail_mobile-support.md) | Mobile restrictions. |
| [Test Cases](./signaldesk-email-rail_test-cases.md) | Email rail test matrix. |

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 0.1 | 2026-06-23 | Created initial email rail doc set. |
| 0.2 | 2026-06-23 | Added owned-email sequencer queue as the first self-owned execution rail, keeping real send gated and Smartlead optional. |
