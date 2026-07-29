# Product Friction Evidence Test Cases

## Existing Runtime Contract

1. Every admitted signal and canonical miss has exact `AL`, tenant, workspace,
   date, and active-entity scope.
2. A saturated required source fails the task and preserves the prior valid
   snapshot.
3. The current window contains seven completed UTC days and excludes today.
4. The comparison window is the immediately preceding completed seven days.
5. Malformed, duplicate, foreign, or inactive entity evidence does not enter a
   ranked row.
6. Unmapped valid evidence is counted separately and is never guessed onto an
   entity.
7. Top entities and emerging topics remain bounded.
8. Advisory output cannot set metrics, invent entity IDs, or publish after its
   source fingerprint changes.
9. Browser state is rejected when its loaded scope differs from the requested
   workspace.
10. Owner loading performs one snapshot read and one optional advisory read
    without a listener.

## Evidence Breakdown Hardening

1. Ticket, negative-feedback, escalation, and canonical-miss counts come from
   already-admitted daily rows.
2. Component counts are non-negative bounded integers.
3. No component or admitted component sum exceeds the total evidence count.
4. The summary parser rejects contradictory component totals.
5. Legacy schema summaries remain readable with an explicit unavailable
   breakdown rather than invented zeroes.
6. The browser receives only declared bounded numeric fields.
7. The owner UI says `support-evidence events`, not `questions`, for mixed
   evidence totals.
8. The aggregate label explains support-evidence load and does not claim
   product health, severity, or defect probability.
9. The evidence-breakdown revision adds no Firestore query, page read, listener,
   provider call, or document family.
10. Invalid entity URL context is ignored; valid context can only reorder an
    entity already present in the exact-scope top-ten summary.
11. Strict advisory suggested actions render only for entity IDs admitted in
    the loaded snapshot.
12. Ranked rows and advisory actions open the read-only Knowledge Map with the
    validated entity and create no friction mutation or navigation write.

## Rejected-Scope Regression

1. No product journey is inferred from conversation text.
2. No automatic bug, UX, policy, expectation, or documentation classification
   is persisted as truth.
3. No release is described as causal from temporal overlap alone.
4. No session replay, product-event, funnel, abandonment, or mouse data enters
   the feature.
5. No model-generated root-cause percentage is displayed as a measured fact.
6. No product or canonical-answer mutation occurs from the friction surface.
