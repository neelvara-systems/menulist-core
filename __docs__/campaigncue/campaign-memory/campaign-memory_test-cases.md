# Campaign Memory 2.0 - Test Cases

## Aggregation

1. First useful result creates one recipe and one channel signal.
2. `not_useful` increments only the negative counters.
3. `not_used` increments only total/not-used counters and no useful score.
4. Metrics are summed as non-negative integers.
5. Missing channel updates recipe memory but not channel memory.
6. Repeated results update the matching signal instead of creating duplicates.
7. Recipe signals never exceed 16.
8. Channel signals never exceed the channel registry count.
9. Signal ordering is deterministic.
10. Aggregate output contains no owner note.

## Confidence

1. Zero or one sample is `not_enough_results`.
2. Two samples are `early_signal`.
3. Three aligned useful results are `repeated_signal`.
4. Three aligned not-useful results are `repeated_signal` with a review recommendation.
5. Mixed evidence remains `early_signal`.
6. Confidence copy always states owner-reported evidence.

## Validation And Security

1. A result ID from the campaign recipe is accepted.
2. `not_used` and `not_useful` remain accepted recipe options.
3. A syntactically valid but unknown result ID is rejected before writes.
4. A result ID belonging only to another recipe is rejected.
5. Cross-workspace campaign IDs remain blocked.
6. Unknown summary fields and oversized signal arrays are rejected at the persisted boundary.
7. Negative, fractional, NaN, and excessive counters are rejected.
8. Event metadata does not contain the raw owner note.

## Cost And Idempotency

1. Overview memory adds no read.
2. Outcome mutation adds one summary read and no new write.
3. Idempotent replay does not increment memory twice.
4. Concurrent distinct outcomes preserve both updates.
5. Failed transaction leaves campaign, event, and summary unchanged.

## UI

1. Analytics shows an honest empty state before any result.
2. Top recipe/channel labels are human-readable.
3. Confidence is understandable without color.
4. Recording a result merges the committed summary locally.
5. No overview refetch follows a successful outcome mutation.
6. Mobile layout avoids a dense chart or horizontal table.
