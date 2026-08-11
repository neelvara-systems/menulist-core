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

## Owner Evidence Brief

1. The brief accepts only a parsed ranked entity and a complete UTC seven-day
   comparison window.
2. Invalid counts, dates, component totals, review paths, or incomplete windows
   fail closed.
3. The same snapshot and owner selection produce byte-identical Markdown and
   filename output.
4. The output remains at or below 8 KiB and uses a bounded safe filename.
5. Legacy summaries show the explicit unavailable breakdown state rather than
   invented zeroes.
6. The brief contains the exact completed windows, counts, evidence mix,
   weighted loads, trend, selected review path, and evidence boundary.
7. The known-limitation path says to verify an intentional approved constraint
   and never labels the evidence as a confirmed limitation.
8. The brief never invents unique affected users, severity, root cause,
   workaround, defect status, release attribution, resolution, churn, or
   revenue impact.
9. Copy uses the shared clipboard fallback; download uses a local Markdown Blob.
10. Preparing, changing, copying, or downloading the brief performs no network,
   Firestore, Storage, Function, provider, scheduler, or integration operation.
11. Mobile actions and drawer controls preserve 44px touch targets and readable
    preformatted output without horizontal page overflow.
12. Investigate routes to Knowledge Map with the validated entity; support,
    limitation, and access review route to trusted answers with that entity.
13. Product-behavior review remains a local copy action and invokes no workflow
    adapter or issue tracker.
14. Watch and no-action close locally; the owner copy states that watch creates
    no reminder and no action creates no saved decision.
15. Invalid entity context and unknown runtime paths fail closed to local copy
    rather than opening an unscoped governance destination.
16. Route resolution and navigation add no Firebase write, review-path record,
    event, listener, provider call, or destination prefetch.
17. The drawer freezes entity, complete window, source timestamp, and workspace
    scope from one snapshot; a refresh cannot mix metadata into the open brief.
18. A scope switch makes the prior brief inactive immediately and clears the
    local selection.
19. Disabling Knowledge Map hides every direct map control and changes
    investigate-further to local copy. A valid but absent requested map entity
    remains unselected with an explicit unavailable state.

## Rejected-Scope Regression

1. No product journey is inferred from conversation text.
2. No automatic bug, UX, policy, expectation, or documentation classification
   is persisted as truth.
3. No release is described as causal from temporal overlap alone.
4. No session replay, product-event, funnel, abandonment, or mouse data enters
   the feature.
5. No model-generated root-cause percentage is displayed as a measured fact.
6. No product or canonical-answer mutation occurs from the friction surface.
7. No product-problem, root-cause, owner-decision, issue-delivery, or
   customer-notification lifecycle is created by the evidence brief.
8. No reminder or watch-state lifecycle is created from the review selector.

## Post-Change Overlay Regression

The complete window, security, response, responsive, and Firebase cost cases
are maintained in
`../post-change-support-evidence-review/post-change-support-evidence-review_test-cases.md`
and executed by `npm run verify:answerlattice-post-change-evidence`.
