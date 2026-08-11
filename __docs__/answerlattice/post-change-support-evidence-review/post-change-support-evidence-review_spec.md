# Post-Change Support Evidence Review Specification

## 1. Product Decision

Build one on-demand, read-only comparison inside Product Friction Evidence.

The feature answers one bounded owner question:

> What support evidence was observed in complete windows before and after this approved change?

It reports association only. It never states that a release or knowledge correction caused the observed difference.

## 2. Admitted Changes

Only these server-verified records are eligible:

1. an active Answerlattice release, using its server-owned `activatedAt` time and direct `entityChanges` links;
2. an implemented mutation proposal, using its server-owned `implementedOn` time and direct `relatedEntityIds` links.

Draft, pending, processing, approved-but-not-implemented, rejected, malformed, cross-workspace, and client-supplied change records are excluded.

## 3. Evidence Source

The comparison reads existing `answerlattice_signalEvents` records for the exact `AL` product, tenant, workspace, directly linked entity IDs, and time window.

Only these existing support evidence types contribute to counts:

- `ticket`;
- `chat_negative`;
- `escalation`.

Other signal types may be present in the bounded source query but never contribute to the result. The result counts events, not unique customers, questions, conversations, or resolved outcomes.

## 4. Window Contract

The change day is excluded because it can contain evidence from both old and new product truth.

For a change activated on UTC date `D`:

- before window: 14 complete UTC days ending at the start of `D`;
- excluded window: all of UTC date `D`;
- after window: 14 complete UTC days starting at the start of `D + 1`;
- review eligibility: the instant the after window ends.

No rolling 7/14/30-day automation is created. The owner loads the comparison explicitly.

## 5. Deterministic States

| State | Rule | Owner meaning |
| --- | --- | --- |
| Waiting for after window | Current time is before the complete after-window end | Return after the displayed eligibility time |
| Ready | Before-window admitted count is at least 5 and both queries are complete | Show exact counts and arithmetic direction |
| Insufficient evidence | Before-window admitted count is below 5 | Show exact counts, but assign no direction |
| Source window saturated | Either bounded query returns more than 200 source records | Do not interpret a partial result |
| Outside retention | The complete before window begins outside the retained signal-history contract | Do not claim the comparison is complete |

The five-event baseline is an interpretation floor, not statistical significance. `Ready` still means observed correlation only.

## 6. Comparison Output

For a ready or insufficient comparison, return:

- before and after UTC date ranges;
- total admitted support-evidence events;
- ticket count;
- negative-feedback count;
- escalation count;
- arithmetic event-count delta;
- relative change percentage only when the baseline is sufficient;
- `lower_observed`, `same_observed`, or `higher_observed` only when ready.

Do not use `improved`, `worsened`, `pain reduced`, `resolved`, `caused`, or `successful` as computed states.

## 7. Owner Flow

1. Open Governance and choose Product Friction Evidence.
2. Choose **Review recent changes**. This is the first feature-specific read.
3. Select an activated release or implemented knowledge correction.
4. Choose **Compare evidence**.
5. Review the status, exact source windows, counts, and fixed limitations.
6. Use existing release, answer, Knowledge Map, Answer Test, ticket, or product workflows for any follow-up. This feature creates no task.

## 8. Security And Privacy

- Existing authenticated Answerlattice route only.
- Existing `MANAGE_GOVERNANCE` permission.
- Rate limit before permission-dependent Firestore work.
- Exact server-derived `pId`, `tId`, and `sId` scope.
- Strict query-key and document-ID admission.
- Private, no-store, `nosniff` responses.
- Strict bounded browser response parser.
- Counts only; no signal metadata, event ID, ticket body, conversation body, visitor identity, or customer identity.

## 9. Non-Goals

- No causal release or knowledge-impact claim.
- No unique-user, churn, revenue, activation, abandonment, defect, or severity inference.
- No product analytics, funnel, event SDK, session replay, or customer tracking.
- No automatic 7/14/30-day workflow, alert, digest, or notification.
- No persisted comparison, impact score, health score, task, product-problem record, or decision record.
- No raw support-event explorer.
- No automatic product, answer, documentation, or customer-message change.

## 10. Rollout

`ENABLE_ANSWERLATTICE_POST_CHANGE_EVIDENCE_REVIEW` controls the section and private route. It requires existing Product Friction Intelligence, Release, Signal Mutation, and Governance systems. Turning it off leaves Product Friction Evidence unchanged.
