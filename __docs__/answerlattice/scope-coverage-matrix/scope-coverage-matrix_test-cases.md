# Scope Coverage Matrix Test Cases

## Pure Projection

1. A canonical target with a current passing canonical result and answer ID is `covered`.
2. A canonical target with a current failing canonical result is `needs_review`.
3. A canonical result without an answer ID is `needs_review`.
4. A canonical target with a current FAQ, RAG, escalation, or no-answer result is `missing`.
5. A canonical target without a current result is `unverified`.
6. A non-canonical expected route is `other_route` without requiring a run.
7. Paused cases are excluded.
8. Rows sort by attention state (`missing`, `needs_review`, `unverified`, `covered`, `other_route`), with critical questions first within each state.

## Freshness

1. Exact current source versions are accepted.
2. Any current source-version change invalidates retained proof.
3. A case edit after run completion invalidates only that case.
4. Editing another case does not invalidate an unchanged row.
5. A future-dated run beyond five minutes is rejected.
6. A legacy run without source versions is historical only.
7. Duplicate case results in one run are rejected for matrix proof.
8. The latest qualifying result wins.

## Client Admission

Reject:

- unknown fields;
- wrong schema version;
- wrong suite revision;
- duplicate rows;
- missing active rows;
- paused-case rows;
- contradictory counts;
- `other_route` for a canonical target;
- canonical coverage states for a non-canonical target;
- invalid timestamps or source labels.

## API And Security

1. Matrix is omitted unless requested and enabled.
2. Existing authentication and `MANAGE_GOVERNANCE` remain mandatory.
3. Exact tenant/store scope remains mandatory.
4. Source-version counters are not returned.
5. Responses remain private, no-store, `nosniff`, and browser-size bounded.
6. Load/save/run/release-check all return a refreshed matrix when requested.

## Responsive UI

1. Desktop shows stable Plan, Role, State, and Version columns.
2. Narrow layout shows the same values in a stacked list.
3. Missing values show `Not specified` and never imply proof across every value.
4. Long question and context labels wrap.
5. Actions meet 44 px touch targets.
6. Run, edit, generic answer review, and specific-answer review use existing flows.

## Cost And Non-Goals

1. No canonical-answer collection scan.
2. No new Firestore collection, index, listener, scheduler, or Storage object.
3. No model call for projection or canonical-only row runs.
4. No persisted matrix or invalidation write.
5. No Cartesian product generation.
