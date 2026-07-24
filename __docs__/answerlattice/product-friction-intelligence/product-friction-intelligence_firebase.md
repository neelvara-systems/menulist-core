# Product Friction Evidence Firebase Notes

## Collections

### `answerlattice_frictionDailyStats`

One deterministic per-entity, per-UTC-day row containing exact scope, schema version, entity identity, evidence counts, weighted load, and timestamps. Nightly writes exactly replace the row. The cleanup task removes exact-`AL` workspace rows older than 90 days and reports deletion only after its bounded batch commits.

### `platformSummary/frictionSnapshot_{tId}_{sId}`

One deterministic server-owned snapshot for the latest complete UTC seven-day comparison.

### `platformSummary/friction_{tId}_{sId}`

One optional server-owned advisory summary linked to a strictly normalized deterministic snapshot. The write is an exact replacement inside a transaction that re-reads and fingerprints current source truth.

## Reads and Writes

- Nightly: bounded signal, canonical-miss, entity, and product-partitioned history reads.
- Nightly: bounded exact daily-stat writes and one exact snapshot replacement after complete success.
- Nightly cleanup: one exact `pId: AL + tId + sId + date` query, at most 100 deletes, and a fixed-run-clock UTC cutoff; invalid rows or failed commit fail the task instead of returning a success count.
- Weekly: one snapshot read, one provider operation, one accounting write attempt for every completed provider response (including rejected output), and one source-read/advisory-write transaction only for valid output. Firestore may retry the transaction under contention; a changed source produces no advisory write.
- Owner surface: one deterministic snapshot read and one optional advisory read.

Actual cost must be measured from Firebase and AI-operation accounting. Static cost promises are not maintained.

## Rules

- client writes to daily stats and platform summaries are denied;
- client reads require exact tenant/store membership and readiness permission;
- platform summary document IDs must match stored scope;
- both dedicated Answerlattice and shared Firestore rules carry the same read boundary.

## Indexes

The maintained dedicated and shared index files include the friction history/cleanup shape `pId + tId + sId + date desc` and the `aiSearchHistory` canonical-miss shape `pId + tId + sId + canonical + createdOn desc`. Product identity is constrained before both bounded windows, preventing another product with colliding numeric scope from consuming the cap or entering retention deletion. Any query-shape change must update and test both index contracts before deployment.

## Deployment

Function changes require a narrow QA deployment of `answerlatticeNightly`; this exact product-aware daily-stat query also requires both maintained index manifests to be deployed to the matching environment. Rules deployment is required only when rules source changes.
