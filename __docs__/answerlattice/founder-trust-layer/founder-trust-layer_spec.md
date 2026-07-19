# Answer Evidence Metrics Specification

## Customer Job

Show a founder what evidence exists for recent answer behavior without converting mixed signals into one misleading quality score.

## Inputs

- Complete rolling 24-hour `aiSearchHistory` window, maximum 500 rows.
- Active canonical answers, maximum 500.
- Active entities, maximum 1,000.
- Recent Answerlattice signal events, maximum 1,000.
- Previous valid schema-v2 summary for trend comparison.

Every source row must have `pId: AL` and the exact numeric tenant/store scope. A cap-plus-one result, malformed source row, query failure, or incomplete coverage input blocks publication.

## Outputs

The versioned summary contains:

- source window and completeness metadata;
- canonical coverage counts and percentage;
- no-escalation counts and percentage;
- explicit confirmed-resolution counts when available;
- drift counts and percentage;
- active-entity answer coverage;
- top five review areas with evidence count, escalation count, negative-feedback count, canonical-fallback count, and weighted load;
- deterministic query-escalation categories plus a separate explicit-human-request count.

## Metric Boundaries

- Canonical coverage measures approved-answer usage, not answer correctness.
- No escalation measures classifier outcome, not verified customer resolution.
- Confirmed resolved uses explicit widget outcomes only.
- Entity answer coverage measures answer presence, not answer completeness.
- Weighted load is `evidence * (1 + escalation rate + canonical-fallback rate)` and is not an accuracy score.

## Failure Behavior

- Preserve the previous complete summary.
- Mark the scheduler task failed or skipped with bounded diagnostics.
- Show unavailable or stale state in the client instead of zero-filled metrics.

## Non-Goals

- No opaque overall trust score.
- No claimed factual-correctness score.
- No containment or deflection claim.
- No raw-log dashboard.
- No autonomous knowledge publication.
