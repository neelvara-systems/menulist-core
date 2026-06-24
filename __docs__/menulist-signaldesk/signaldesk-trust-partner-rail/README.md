# SignalDesk Trust Partner Rail - Documentation Hub

**Feature:** SignalDesk Trust Partner Rail
**Status:** Runtime implemented for internal testing; real partner outreach, payment, contract execution, provider send, and paid campaigns remain outside the system
**Created:** June 24, 2026
**Last Updated:** June 24, 2026
**Parent project:** [MenuList SignalDesk](../README.md)

---

## What This Feature Covers

Trust Partner Rail turns the useful parts of the consumer-app influencer playbook into a MenuList-fit internal workflow.

The goal is not broad creator marketing. The goal is to find people or organizations whose audience already includes restaurant owners or local business operators, test them quickly, track real MenuList outcomes, and renew only the partners that create owner demand.

## Source Input

| Source | Adopted lesson |
| --- | --- |
| Jake Castillo X article on scaling Cal AI consumer distribution, June 24, 2026 | Distribution speed, niche testing, lean briefs, flat-fee partner economics, and renewal/cut tracking are useful. Broad consumer influencer tactics are not copied. |
| FTC endorsement guidance | Paid or incentivized endorsements require clear disclosure and brand monitoring. |

## Quick Navigation

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-trust-partner-rail_spec.md) | Business requirements and MenuList-fit adaptation. |
| [Implementation Plan](./signaldesk-trust-partner-rail_impl.md) | Runtime model, collections, routes, APIs, and gates. |
| [Firebase Cost Plan](./signaldesk-trust-partner-rail_firebase.md) | Collection model, reads/writes, retention, and cost controls. |
| [Compliance Policy](./signaldesk-trust-partner-rail_compliance.md) | Disclosure, claims, source, payment, and partner-content guardrails. |
| [Mobile Support](./signaldesk-trust-partner-rail_mobile-support.md) | Mobile admission decision. |
| [Test Cases](./signaldesk-trust-partner-rail_test-cases.md) | QA matrix for partner scoring, deals, briefs, deliverables, and renewal decisions. |

## Operating Shape

```txt
market pod
-> partner/creator shortlist
-> 20-second trust test
-> owner approves 3-5 niche test
-> lean brief with approved claims
-> flat-fee deal record
-> deliverable/reminder tracker
-> post/result capture
-> MenuList outcome attribution
-> renew, hold, or cut recommendation
```

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 0.1 | 2026-06-24 | Created initial Trust Partner Rail doc set from the X article review and MenuList-fit validation. |
| 0.2 | 2026-06-24 | Added internal runtime for profiles, niche tests, flat-fee deal review, lean briefs, deliverables, compact metrics, renewal decisions, and pause controls. |
