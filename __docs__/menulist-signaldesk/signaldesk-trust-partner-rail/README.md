# SignalDesk Trust Partner Rail - Documentation Hub

**Feature:** SignalDesk Trust Partner Rail
**Status:** Feature 17 locally source-complete; authenticated release-host smoke and real partner operation remain pending
**Created:** June 24, 2026
**Last Updated:** July 21, 2026
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
-> policy approver creates a 3-5 niche test
-> founder approves the partner and any spend
-> lean brief with approved claims
-> flat-fee deal record
-> deliverable/reminder tracker
-> post/result capture
-> MenuList outcome attribution
-> renew, hold, or cut recommendation
```

## Current Authority Boundaries

- `/signaldesk/partners`, its workspace read, and every partner action honor the trust-rail feature flag.
- Desktop is the only partner operation surface. SignalDesk mobile remains dashboard-only and all partner mutations are rejected.
- Profile and deliverable operations require `source.configure`; niche tests and renewal recommendations require `policy.approve`; briefs require `draft.create`.
- Only a founder-admin with `signaldesk.configure` can approve/activate a partner or approve spend.
- Profile, niche, deliverable, metric, and renewal operations are actor-bound and retry-safe.
- The `trust-partner` pause blocks forward-moving work while still allowing risk evidence, historical metrics, holds, and cuts.
- SignalDesk records evidence and decisions only. It does not contact partners, sign contracts, execute payment, publish content, or enable provider send.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 0.1 | 2026-06-24 | Created initial Trust Partner Rail doc set from the X article review and MenuList-fit validation. |
| 0.2 | 2026-06-24 | Added internal runtime for profiles, niche tests, flat-fee deal review, lean briefs, deliverables, compact metrics, renewal decisions, and pause controls. |
| 0.3 | 2026-07-21 | Completed Feature 17 hardening: route/read flags, least-privilege reads, founder authority, pause enforcement, actor-bound retries, attributable live metrics, outcome-derived renewal, exact cost accounting, desktop permission parity, mobile truth, docs, and emulator coverage. |
