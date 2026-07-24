# SignalDesk Operating Layer - Compliance

**Status:** Implemented and cross-checked
**Created:** June 24, 2026
**Last Updated:** July 21, 2026

## Mandatory Rules

- All APIs require authenticated SignalDesk access and the action-specific permission.
- Parent and child feature flags are server-enforced.
- Mobile mutation requests are denied server-side.
- Source-policy and run references must exist and agree.
- Research fit (`pass`, `fail`, `unsure`) is review priority, never contact consent.
- Reply playbooks for stop, unsubscribe, complaint, wrong-contact, or DNC-like intent must preserve suppression/human-review routing.
- Offer records preserve blocked claims and proof-match requirements.
- Experiments require stop rules and a valid readback plan before execution.
- Every experiment decision requires fresh evidence; `pending` is not a review action.
- Disabled child rails cannot influence the Daily Growth Mission.
- Exact retries cannot duplicate audit, timeline, or cost effects.
- No record may mutate MenuList public/customer truth.

## Forbidden Outcomes

- Cold WhatsApp, Instagram, or Messenger automation.
- Guaranteed sales, ranking, or unsupported proof claims.
- Automatic outbound send, public publish, paid campaign, winner promotion, rollback, or contact-permission inference.
- Raw provider payload persistence in the Operating Layer.
- Public SignalDesk pages.

## Founder Review

Founder-admin authority remains required for market-pod approve/hold/reject decisions, first outbound channel use, sender identity, provider or partner spend, unsupported claim resolution, scale-up, and each experiment outcome decision. A recommendation cannot overwrite a founder-reviewed pod state.

## Provider Boundary

Research provider calls are permitted only through the governed Research Agent action after source policy, budget, provider readiness, kill switch, feature flag, role, and desktop checks. Provider sending remains disabled.
