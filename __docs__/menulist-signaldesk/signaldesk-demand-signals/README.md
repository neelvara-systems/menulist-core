# SignalDesk Demand Signals - Feature Doc Set

**Status:** Initial feature doc set
**Created:** June 23, 2026
**Parent:** [MenuList SignalDesk](../README.md)
**Audience:** Internal growth operators and future implementers

## Purpose

SignalDesk Demand Signals captures warm intent from MenuList-controlled surfaces: QR scans, shared menu links, claim/setup clicks, owner claim attempts, customer requests, partner referrals, and similar signals.

It turns observed demand into internal growth intelligence without over-tracking customers or creating prospects from anonymous customer behavior alone.

## Source Specs

- Spec 32: demand signal capture
- Spec 33: QR/menu-link loops
- Spec 34: surface hooks
- Spec 35: referral and viral route attribution

## Document Map

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-demand-signals_spec.md) | Signal types, eligibility rules, and acceptance criteria. |
| [Implementation](./signaldesk-demand-signals_impl.md) | Capture flow, summarization, and feature integrations. |
| [Firebase](./signaldesk-demand-signals_firebase.md) | Signal, summary, referral, and attribution collections. |
| [Compliance](./signaldesk-demand-signals_compliance.md) | Privacy, customer tracking limits, and consent boundaries. |
| [Mobile Support](./signaldesk-demand-signals_mobile-support.md) | Read-only mobile demand summaries. |
| [Test Cases](./signaldesk-demand-signals_test-cases.md) | Signal capture, summarization, privacy, and cost tests. |

## Boundary

Demand signals are internal growth inputs. They are not customer analytics, not a public dashboard, and not an excuse to identify anonymous customers.

## Build Gate

Do not implement surface hooks until:

- allowed signal payloads are explicitly defined,
- MenuList public surfaces are reviewed for privacy impact,
- anonymous customer data is minimized,
- summaries are designed before raw event reads,
- outcome bridge event schema is stable.
