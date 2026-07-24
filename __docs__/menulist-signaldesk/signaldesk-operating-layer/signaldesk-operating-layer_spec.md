# SignalDesk Operating Layer - Specification

**Status:** Implemented and cross-checked
**Created:** June 24, 2026
**Last Updated:** July 21, 2026

## Goal

Present no more than five evidence-backed founder decisions for the day while preserving source, approval, suppression, spend, and product-isolation authority.

## Included

- Daily Growth Mission and seven-day trial state.
- Experiment creation and founder readback decisions.
- Offer/CTA authority.
- Reply playbooks with suppression and escalation routing.
- Source-quality snapshots.
- Research Agent runs, research rows, and a maximum 30-row lead batch.
- Founder-reviewed market-pod recommendations.

## Excluded

- Public SignalDesk pages or partner portals.
- Provider send, social auto-publish, paid campaign automation, or sequencer activation.
- Automatic contact permission, winner promotion, rollback, or metric decisions.
- Writes to MenuList customer or billing truth.
- A mobile Operating Layer editor.

## Authority Rules

1. Parent feature disablement hides the Mission/Opportunities pages, blocks the Mission workspace section, and rejects every Operating Layer mutation.
2. Research also requires its child feature flag, a usable source policy, configured provider readiness, a clear kill switch, budget admission, desktop runtime, and `source.configure`.
3. Mission creation ignores data from any disabled child layer instead of reading stale records from that layer.
4. Mission actions are deterministic, capped at five, and may only recommend approved action classes.
5. Experiment creation requires a valid readback plan; review requires `target.review`, a fresh 2-1000 character result, and a non-pending decision.
6. Offer mutation requires `signaldesk.configure`; reply playbooks require `draft.create`; source quality and market-pod recommendation require `source.configure`.
7. Source-quality references must exist. When both a policy and run are supplied, the run must belong to that policy.
8. A reply playbook that requires suppression must route to `suppress`; unsafe combinations are rejected before writes.
9. Existing same-identity records are projected through the same strict reader contract. Malformed stored records fail closed.
10. Exact retries return existing truth and create no repeat audit, timeline, or daily-cost effects. Changed identity conflicts where the action has an explicit immutable identity contract.

## Owner Workflow

1. Use the desktop Dashboard to review the latest admitted lead batch.
2. Run a governed Market Search only when source/provider admission is ready.
3. Open Mission and prepare the daily mission.
4. Review at most five actions.
5. Create a controlled experiment, offer, reply playbook, or source-quality snapshot using the permission assigned to that action.
6. Record fresh experiment evidence before repeat, narrow, hold, stop, or complete.
7. Keep every outbound or spend action behind its separate approval and rail.

## Experiment Contract

New cards use `signaldesk-experiment-readback-v1`:

- baseline start/end;
- candidate start/end;
- one primary metric;
- bounded unique confounders;
- next readback at or after candidate completion.

Windows cannot overlap or reverse. Legacy cards remain readable as `readbackPlan: null`; the runtime never invents historical evidence.

## Seven-Day Trial

The initial trial remains one market pod, one approved source list, one CTA, one sender identity, one export/manual rail, and one outcome report. It is not passed until source rights, evidence, approval, reply state, outcome state, and founder workload are visible. The default remains zero provider/media/partner spend unless separately approved.
