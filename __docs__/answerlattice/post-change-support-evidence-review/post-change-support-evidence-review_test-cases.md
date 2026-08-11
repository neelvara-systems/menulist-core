# Post-Change Support Evidence Review Test Cases

## Window Math

1. A midday UTC change excludes its complete UTC calendar day.
2. The before window contains exactly 14 complete UTC days.
3. The after window begins on the next UTC day and contains exactly 14 complete UTC days.
4. Review remains waiting until the after-window end instant.
5. Boundary instants are half-open and cannot be counted in both windows.
6. Invalid or future change times fail closed.
7. A before-window start outside the 365-day retention contract returns `outside_retention` before signal reads.

## Comparison

1. Counts admit only ticket, negative-feedback, and escalation types.
2. Breakdown total equals the three components.
3. Before count below 5 returns `insufficient_evidence` with no direction or percentage.
4. Sufficient baseline and lower after count returns `lower_observed`.
5. Equal counts return `same_observed`.
6. Higher after count returns `higher_observed`.
7. Zero after count with a sufficient baseline returns an arithmetic `-100%`.
8. No computed state uses causal or resolution language.

## Candidate And Review Security

1. List mode returns only exact-scope active releases and implemented corrections.
2. List response contains at most 12 candidates.
3. Review re-reads the exact selected document.
4. Wrong-scope, wrong-status, malformed, missing, or empty-entity changes fail closed.
5. Client input cannot supply timestamps or entity IDs.
6. Unknown, duplicate, missing, or contradictory query parameters return `400` before Firestore access.
7. Authentication, dashboard read rate limit, and `MANAGE_GOVERNANCE` are mandatory.
8. Responses remain private, no-store, and size-bounded.

## Source Queries

1. Waiting and outside-retention states perform no signal query.
2. Each eligible window uses exact `AL`/tenant/workspace/direct-entity/time bounds.
3. Every returned row is revalidated before counting.
4. A 201-document window returns `source_window_saturated` and no partial comparison.
5. Signal metadata and event IDs are neither selected nor returned.
6. Existing indexes satisfy candidate and signal queries.

## Responsive UI

1. No candidate request occurs on mount.
2. Product Friction Evidence remains usable when candidate or review loading fails.
3. The review section remains reachable when the latest friction snapshot has no ranked entities.
4. Narrow screens stack controls and evidence fields.
5. Buttons and select controls meet the 44 px touch target.
6. Waiting, empty, unavailable, and healthy states stay plain without a contextual illustration.

## Cost And Non-Goals

1. No new collection, document type, index, listener, scheduler, Storage object, or cache.
2. No write or transaction.
3. No model, embedding, notification, or external integration call.
4. No automatic refresh or background polling.
5. No product-analytics, unique-user, root-cause, or causal claim.
