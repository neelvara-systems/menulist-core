# First Trusted Answers Test Cases

## Product-Specific Pack

1. A user without Knowledge or Governance permission cannot generate a pack.
2. A malformed job ID or cross-tenant job fails before provider work.
3. A job without a ready readable source returns a bounded validation error.
4. Generation reads no more than 30 ready sources and sends no more than 32,000 source characters.
5. Model output must contain exactly ten schema-valid candidates.
6. Unknown source IDs, entity IDs, and route paths are removed before write.
7. Unsupported questions become missing-evidence or safe-no-answer tests; no answer is invented.
8. Missing-evidence text is not stored as a canonical answer/body and cannot satisfy acceptance or publish guards.
9. Answer text returned for a candidate marked `no_answer` or `escalation` is discarded and cannot enter the canonical-proposal path.
10. One generation writes at most ten draft Intake review items and one later Answer Tests summary update.
11. The same generation-input hash returns the existing pack with zero provider calls, credits, and draft writes.
12. Two concurrent generation requests cannot both reserve usage or write packs.
13. Provider, malformed-output, or settlement failure refunds the reserved support credit and leaves a failed run marker.
14. Accepted or published prior review items are never overwritten by a changed-source pack.
15. A canonical proposal without a related entity or non-empty answer cannot be accepted.
16. Cached reuse preserves owner edits and restores only missing `product_launch_*` slots.
17. Refreshing an existing set requires explicit confirmation; a changed generation-input hash replaces only product-pack slots and preserves custom tests.
18. Product-specific and generic fallback flows remain usable on narrow mobile layouts.
19. Intake audience or included source-context changes invalidate the cached pack; unchanged prompt inputs reuse it.
20. The general fallback cannot be added after a product-specific set exists.

## Launch Workflow

1. Empty suite can add the ten starter cases in one save.
2. Existing starter IDs are not duplicated.
3. Existing custom cases remain unchanged.
4. A suite near the 100-case cap adds only available starter cases.
5. Concurrent revision conflict shows reload guidance and does not overwrite work.
6. Standard Answer Tests route does not show launch-only positioning.
7. Launch route shows links to Intake, Governance, and Install Center.
8. Canonical-only run makes no provider call.
9. Full-runtime run preserves the ten-case cap and credit confirmation.
10. No test result publishes or edits a canonical answer.
11. Editing a First 10 question after a pass makes launch proof stale until rerun.
12. Changing governed canonical, KB/FAQ, documentation, entity/relation, or release truth makes launch proof stale until rerun.
13. A legacy run without source-version evidence cannot make launch proof ready.
14. Running after a source change can become current even while an older compiled bundle is separately marked stale; proof compares with the current source-version summary, not the old bundle snapshot.
15. Malformed retained source-version counters fail closed and require a fresh run.
16. A client-supplied stale or future case timestamp cannot prevent a changed/new First 10 definition from receiving the server save time.
17. The launch screen distinguishes current First 10 proof from the latest historical run result.
18. A case or governed-source change leaves the latest result visible but marks current proof stale until all ten current cases are rerun.
19. A source change during execution is detected by the post-run current-proof read and cannot return a false ready state.
20. The First 10 route sends exact `includeLaunchProof=1`; the standard Answer Tests route omits it and does not incur the launch-only proof read.

## Outcome Feedback

1. `Solved` stores `isGood: true` and `resolutionOutcome: resolved`.
2. `Still need help` stores `isGood: false` and `resolutionOutcome: not_resolved`.
3. Duplicate feedback does not overwrite the first outcome.
4. Cross-tenant search-history ID returns not found.
5. Legacy feedback without outcome remains valid but is excluded from confirmed-resolution counts.
6. A later query in the same widget session increments recontact count.
7. A confirmed resolution without an observed same-session recontact does not create a durable-resolution claim.
8. An empty explicit-outcome sample renders confirmed resolution as unavailable, not 0%.
9. The nightly history query is product/tenant/store scoped, newest-first, and capped at 500 rows.

## Proof And Distribution

1. Example entries always show an example label.
2. Incomplete verified evidence fails registry validation or is excluded from verified rendering.
3. Verified evidence with an impossible calendar date fails closed.
4. Tool-specific Markdown routes contain the master safety and review rules.
5. Public pages expose no tenant IDs, workspace IDs, API keys, or customer data.

## Daily Brief Handoff

1. Action flag off shows navigation only.
2. Action flag on shows a prepare-card control only for supported actions.
3. Prefill values are length-bounded and generic.
4. Opening a prefilled card performs no write.
5. Owner cancellation performs no write.
6. Owner confirmation uses the existing Support Board validation and write path.
