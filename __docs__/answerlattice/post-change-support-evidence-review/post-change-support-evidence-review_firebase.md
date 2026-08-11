# Post-Change Support Evidence Review Firebase Cost

## Decision

Read existing retained evidence only after explicit owner intent. Do not add a summary document, invalidation system, listener, or scheduler.

The counts below cover feature-data reads after shared authentication, permission, and rate-limit admission.

## Firestore Operations

| Owner action | Maximum document reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Open Product Friction Evidence | 0 incremental | 0 | Existing two compact friction reads are unchanged; this feature does not fetch on mount |
| Load recent changes | 16 | 0 | At most 8 active releases plus 8 implemented corrections, merged to at most 12 browser choices |
| Select a waiting change | 1 | 0 | Exact change validation; no signal query before the after window closes |
| Select a change outside retention | 1 | 0 | Exact change validation; no incomplete history query |
| Compare one eligible change | 403 | 0 | One exact change read plus up to 201 records for each of two windows |
| Typical low-volume comparison | `1 + max(1, before rows) + max(1, after rows)` | 0 | Firestore applies a minimum one-document charge to each issued query; field masks reduce transfer, not read count |

The 403-read ceiling is a deliberate fail-closed worst case. A 201-row window is not interpreted; the owner receives `source_window_saturated` instead of a partial conclusion.

## Cost Controls

- No feature read until the owner chooses **Review recent changes**.
- Candidate limits are 8 per source and 12 after merge.
- Exact selected change is re-read once to prevent stale or cross-scope client selection.
- Both signal queries use existing composite indexes and at most 25 direct entity IDs.
- Field masks exclude signal metadata and reduce bandwidth.
- Complete-window and retention checks happen before signal reads.
- Maximum 200 source rows per window; cap-plus-one detects saturation.
- No raw drill-down query, pagination, listener, automatic refresh, or background poll.
- No Firestore write, transaction, retry loop, collection, document type, index, TTL, or cleanup job.
- No Storage, Redis, model, embedding, email, Slack, GitHub, or Linear operation.

The admitted queries have equality filters plus one timestamp range/order field,
so the current [Firestore billing documentation](https://firebase.google.com/docs/firestore/pricing)
indicates that the index-entry pricing exception for queries with at most one
range field should apply. Confirm the production query with Query Explain before
changing filters; do not treat this design note as a billing guarantee.

## Why Not Persist A Comparison

A persisted result would need invalidation or recomputation when retained signals arrive late, direct entity links change, a release is repaired, a proposal is corrected, retention removes old evidence, or counting rules change. It would also add writes for a view that an owner may never open.

The existing append-only change records and retained signal index are the smaller source of truth for an infrequent owner review.

## Why Not Add A Scheduler

Automatic 7/14/30-day jobs would read every eligible change whether or not an owner needs it, add durable result semantics, and encourage unsupported causal language. The explicit route contains cost and keeps the feature aligned with owner judgment.

## Cache Decision

Do not add Redis or Firestore caching at launch. A comparison is infrequent, time-window-bound, and permission-scoped. Reconsider a short exact-scope cache only if production telemetry proves repeated owner reloads create material cost; a cache must include change identity, direct entity IDs, window bounds, and counting-contract version.
