# Product Friction Evidence Firebase Notes

## Collections

### `answerlattice_frictionDailyStats`

One deterministic per-entity, per-UTC-day row containing exact scope, schema version, entity identity, evidence counts, weighted load, and timestamps. The cleanup task removes rows older than 90 days.

### `platformSummary/frictionSnapshot_{tId}_{sId}`

One deterministic server-owned snapshot for the latest complete UTC seven-day comparison.

### `platformSummary/friction_{tId}_{sId}`

One optional server-owned advisory summary linked to the deterministic snapshot timestamp.

## Reads and Writes

- Nightly: bounded signal, canonical-miss, entity, and history reads.
- Nightly: bounded idempotent daily-stat writes and one snapshot write after complete success.
- Weekly: one snapshot read, one provider operation, one source re-read, and at most one advisory write.
- Owner surface: one deterministic snapshot read and one optional advisory read.

Actual cost must be measured from Firebase and AI-operation accounting. Static cost promises are not maintained.

## Rules

- client writes to daily stats and platform summaries are denied;
- client reads require exact tenant/store membership and readiness permission;
- platform summary document IDs must match stored scope;
- both dedicated Answerlattice and shared Firestore rules carry the same read boundary.

## Indexes

The maintained Answerlattice index file includes friction daily-stat queries by workspace and date. Any query-shape change must update and test the dedicated index contract before deployment.

## Deployment

Function changes require a narrow QA deployment of `answerlatticeNightly`. Rules or index deployment is required only when those source files change.
