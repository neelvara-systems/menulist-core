# Product Friction Evidence Implementation

## Shared Metric Contract

`src/data/shared/answerlatticeSupportMetrics.ts` and its byte-identical Functions mirror define schema version 2, source caps, UTC windows, weighted-load calculation, trend thresholds, and friction-level thresholds. Changes must update both copies and preserve the mirror verifier.

## Nightly Aggregation

`aggregateFrictionStats(tId, sId)` runs inside `answerlatticeNightly` when the feature flag is enabled.

1. Build the UTC date contract.
2. Read today's exact-scope signal events with cap-plus-one.
3. Read today's canonical misses with cap-plus-one and reject non-Answerlattice rows from evidence.
4. Normalize stored entity IDs.
5. Batch-read entity documents and admit only exact-scope active entities.
6. Count unresolved mappings separately.
7. Calculate deterministic daily weighted load.
8. Write deterministic daily rows in bounded batches.
9. Read the two completed seven-day windows with cap-plus-one.
10. Validate scope and count legacy rows.
11. Calculate all-entity totals, trends, top ten areas, and emerging topics.
12. Write `frictionSnapshot_*` only after the full task succeeds.

The aggregation catch logs a fixed failure code with bounded source metadata and rethrows so the scheduler cannot mark a failed task successful.

## Weekly Advisory Insight

`generateWeeklyFrictionInsight(tId, sId)` reads the deterministic snapshot and exits when there is insufficient evidence. The prompt treats entity names and support-derived text as untrusted evidence.

The provider may return only:

- a bounded summary;
- actions bound to entity IDs already present in the source packet;
- bounded emerging notes.

Strict parsing rejects malformed JSON, unknown entity IDs, excessive arrays, or unsupported fields. The model cannot set metrics or friction level. Before writing, the function re-reads the snapshot and requires the source timestamp to be unchanged.

## Client Read Path

- `frictionStats.ts` performs one snapshot read and one optional advisory read.
- strict parsers validate product, numeric scope, schema, complete windows, timestamps, counts, bounds, and advisory status.
- `useFrictionInsights.ts` uses `Promise.allSettled`; optional advisory failure does not hide a valid deterministic snapshot.
- `FrictionTab.tsx` renders explicit empty, mapping-needed, stale, and load-failure states.

## Security and Permissions

- daily stats and summary writes are server-only;
- browser reads require exact Answerlattice workspace membership plus readiness permission;
- deterministic summary IDs must match stored scope;
- the public widget does not read friction summaries;
- the AI summary does not receive unrestricted raw tickets, DOM state, credentials, or private source URLs from this pipeline.

## Cost and Scale

The owner view uses at most two compact Firestore reads. Nightly cost depends on admitted signal, miss, entity, and history counts plus daily writes. Provider cost is recorded through the existing AI operations accounting path. Do not maintain static currency estimates in this dossier.

Raise limits only with a partitioning, scheduler-duration, and Firebase-cost decision. Do not increase a cap only to suppress saturation failures.
