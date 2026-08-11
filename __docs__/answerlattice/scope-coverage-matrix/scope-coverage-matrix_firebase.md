# Scope Coverage Matrix Firebase Cost

## Decision

Derive the matrix on demand from existing compact control documents. Do not persist it.

## Firestore Operations

The counts below cover feature-data reads after the existing authentication,
permission, and rate-limit admission path. This feature does not change those
shared admission operations.

| Owner action | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Open Answer Tests with matrix | 2 | 0 | One Answer Tests summary plus one compact source-version document |
| Refresh matrix | 2 | 0 | Same bounded point-in-time projection; no listener |
| Open First 10 launch mode | 2 | 0 | Existing launch proof already reads both documents; matrix adds no read because it is not requested there |
| Save an Answer Test | Existing transaction read + 1 compact source-version read | Existing 1 summary write | Source read refreshes the response matrix; no matrix write |
| Run one matrix row | Existing Answer Test execution reads + 1 compact source-version response read | Existing reservation/run summary writes | Canonical-only execution adds no model call |
| Run release-linked tests | Existing release/test execution reads + 1 compact source-version response read | Existing reservation/run summary writes | No new release document or matrix document |

Firestore transaction retries may repeat existing transaction reads under contention. The matrix adds no transaction and no retry loop.

## Cost Controls

- Matrix is requested with `includeScopeCoverage=1`; clients that do not request it keep the existing one-read load.
- Maximum 100 active/stored tests and ten retained runs are inherited from Answer Tests.
- Projection is in memory and bounded.
- Only the compact source-version control document is added; canonical answers are not scanned.
- No per-plan, per-role, per-state, or per-version document is read.
- No real-time listener.
- No scheduler or nightly aggregation.
- No Storage object.
- No model or embedding call to render the matrix.
- No new Firestore collection, document type, index, TTL, or cleanup job.

## Why Not Persist A Summary

A persisted matrix would require invalidation after every Answer Test edit, run, canonical-source change, article change, entity change, relation change, or release change. The existing summary and source-version documents already provide the smaller and safer read model.

At the feature's hard caps, one additional compact read per explicit matrix refresh is cheaper and more reliable than maintaining another derived document.

## Monitoring

Use existing route and Firebase monitoring. Add no per-view event write. Reconsider caching only if production telemetry proves repeated rapid navigation creates material cost; any cache must remain exact-workspace and source-version aware.
