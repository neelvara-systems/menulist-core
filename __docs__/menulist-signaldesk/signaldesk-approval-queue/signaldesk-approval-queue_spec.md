# SignalDesk Approval Queue - Specification

**Status:** Implemented and locally verified
**Last Updated:** July 21, 2026

## Scope

One queue item represents one exact draft approval decision. Current states are
`pending`, `approved`, `rejected`, `queued`, `exported`, `sent`, and `failed`.
The human review action accepts only `approved` or `rejected`; downstream rails
own later delivery states.

## Required Decision Context

The persisted approval packet binds:

- approval, target, draft, evidence, source-policy, CTA, and sender identifiers;
- exact message subject/body and channel;
- source-policy state and expiry;
- suppression, current-menu diagnostic, rejected facts, and unsupported claims;
- allowed route, sender readiness, expected outcome, risk summary, and cost impact;
- CTA, sender, and complete action fingerprints.

## Requirements

| ID | Requirement |
| --- | --- |
| SDA-R001 | Only a user with `draft.approve` may make a terminal decision. |
| SDA-R002 | Approval re-reads current target, detail/contact, source, evidence, CTA, sender, template, conversation, draft, approval, and packet authority. |
| SDA-R003 | Missing, stale, suppressed, held, unsupported, wrong-channel, or prior-contact truth fails before terminal writes. |
| SDA-R004 | Rejection requires a structured reason; `other` also requires a note. |
| SDA-R005 | One successful terminal decision updates approval, draft, target, packet, audit, queue summary, and cost atomically. |
| SDA-R006 | An exact same-actor retry returns the stored terminal result without another write; changed actor, status, reason, or rejection reason conflicts. |
| SDA-R007 | Pending work is loaded independently of recent terminal history so completed rows cannot hide actionable approvals. |
| SDA-R008 | Approval grants only the packet's `email-export` route and never performs delivery. |

## Acceptance

- Two conflicting concurrent decisions cannot both commit.
- Queue counters decrement exactly once.
- The UI cannot offer approve/reject without `draft.approve` or export without `message.export`.
- A visually ready but incomplete packet cannot enable approval.
- Server-side current authority remains final even when loaded browser state is stale.
