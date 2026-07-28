# Product Friction Evidence Implementation

## Shared Metric Contract

`src/data/shared/answerlatticeSupportMetrics.ts` and its byte-identical Functions mirror define schema version 2, source caps, UTC windows, weighted-load calculation, trend thresholds, and friction-level thresholds. Changes must update both copies and preserve the mirror verifier.

## Feature 3 Validation Result

The Customer Friction Map proposal resolves to this existing feature. It does
not justify a second map, event pipeline, or analytics store.

### Current implementation

- bounded support signals and canonical misses;
- exact-scope entity mapping;
- deterministic per-day rows;
- complete 7-day versus previous-7-day comparison;
- top ten entities and emerging topics;
- optional source-current advisory summary;
- two-read owner surface.

### Bounded later code scope

1. Extend the next summary schema with top-entity `ticketCount`,
   `chatNegativeCount`, `escalationCount`, and
   `canonicalMissCount`/`lowConfidenceCount` totals already present in the
   normalized daily rows.
2. Update the shared root/Functions contracts byte-for-byte.
3. Update strict server and browser parsers, summary byte guards, and retained
   legacy compatibility.
4. Replace owner-visible `questions` wording with `support-evidence events`.
5. Rename the aggregate UI label to `Support evidence load` while preserving
   the documented calculation.
6. Add explicit contract tests proving that component counts do not exceed the
   admitted evidence total.

No workflow tree, release overlay, root-cause percentages, or classification
write is admitted in this code scope.

## Nightly Aggregation

`aggregateFrictionStats(tId, sId)` runs inside `answerlatticeNightly` when the feature flag is enabled.

1. Build the UTC date contract.
2. Read today's exact-scope signal events with cap-plus-one.
3. Read today's canonical misses with cap-plus-one after exact `pId: AL` query partitioning, then revalidate product and workspace scope before admitting evidence.
4. Normalize stored entity IDs.
5. Batch-read entity documents and admit only exact-scope active entities.
6. Count unresolved mappings separately.
7. Calculate deterministic daily weighted load.
8. Exactly replace deterministic daily rows in bounded batches so stale/private fields cannot survive a rerun.
9. Read the two completed seven-day windows with cap-plus-one after exact `pId: AL + tId + sId` query partitioning.
10. Normalize every historical row without numeric coercion, reject malformed or duplicate entity/day truth, recompute weighted load from admitted counts, and count valid legacy-schema rows.
11. Calculate all-entity totals, trends, top ten areas, and emerging topics.
12. Exactly replace `frictionSnapshot_*` only after the full task succeeds.

The UTC window, retention cutoff, and Sunday-only advisory decision use the master scheduler run's fixed `startedAt` clock. A long multi-tenant run therefore cannot cross midnight into a different aggregation window, cleanup boundary, or weekly decision.

The 90-day cleanup validates positive workspace scope and bounded parameters, queries exact `pId: AL + tId + sId`, rechecks every returned row, deletes oldest rows in a bounded batch, and reports its count only after commit. A failed commit propagates the fixed cleanup failure so scheduler telemetry cannot claim deletion success.

The aggregation catch logs a fixed failure code with bounded source metadata and rethrows so the scheduler cannot mark a failed task successful.

## Weekly Advisory Insight

`generateFrictionInsight(tId, sId)` admits exact positive numeric workspace scope, reads the deterministic snapshot, and exits when its scope, schema, timestamp, complete seven-day window, counts, entity/topic shapes, or minimum-evidence contract is invalid. Snapshot metrics are never string-coerced. The bounded prompt treats entity names and support-derived text as untrusted evidence.

The provider may return only:

- a bounded summary;
- actions bound to entity IDs already present in the source packet;
- bounded emerging notes.

Strict parsing rejects oversized/malformed JSON, non-string text, unknown or duplicate entity IDs, excessive arrays, and unsupported fields. The model cannot set metrics or friction level. After provider/accounting work, one Firestore transaction re-reads and fully normalizes the source snapshot, compares its prompt-relevant fingerprint, and replaces the advisory document only when current truth still matches. A concurrent source change returns `snapshot_changed`; stale opposite-version/private fields cannot survive the exact replacement. Scheduler telemetry preserves the resulting `skippedReason`.

Every completed provider response is written to the scoped AI-operation ledger before output rejection or advisory publication. Invalid or oversized output therefore remains non-publishable without disappearing from provider-usage accounting; a transport failure with no provider response remains a fixed `gemini_failed` outcome.

## Client Read Path

- `frictionStats.ts` performs one snapshot read and one optional advisory read.
- strict projectors validate and normalize product, numeric scope, schema, contiguous complete windows, timestamps, counts, ordering, bounds, prompt metadata, and advisory status, then return only declared owner fields.
- `useFrictionInsights.ts` uses `Promise.allSettled`; optional advisory failure does not hide a valid deterministic snapshot. Loaded state carries an exact scope key, and render-time projection rejects prior-scope state before the next effect runs.
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

The bounded evidence-breakdown projection uses rows the 14-day aggregation
already reads. It may enlarge one daily row and one compact summary within
existing byte guards, but it adds no query, owner read, listener, provider
call, or new document family.
