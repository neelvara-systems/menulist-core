# Answer Evidence Metrics Firebase Notes

## Storage

One server-owned summary document per workspace:

`platformSummary/trustMetrics_{tId}_{sId}`

Required identity fields are `pId: AL`, numeric `tId`, numeric `sId`, and schema version 2. The document also stores a complete rolling-24-hour window and source counts.

## Reads and Writes

- Nightly: bounded reads from search history, canonical answers, entities, signals, and the previous summary.
- Nightly: one summary write only after every required source passes scope and saturation checks.
- Dashboard: one tenant-scoped summary read.
- Activation: reuses the same compact summary; no raw event scan.

Actual operation cost must be measured from runtime accounting and Firebase billing data. Static currency estimates are not maintained here.

## Security

- Cloud Functions use Admin SDK for writes.
- Browser writes to coverage, friction, and trust summaries are denied.
- Browser reads require Answerlattice tenant membership and readiness permission.
- Client parsers independently reject wrong product, string/fractional scope, unsupported schema, incomplete window, inconsistent counts/rates, malformed optional compatibility metrics, and wrong-typed top-entity fields.
- Successful parsing returns an exact allowlisted coverage/trust DTO. Extra persisted root or nested fields are not forwarded to dashboard or activation consumers.

## Failure and Scale

Cap-plus-one reads detect incomplete windows. The task preserves the prior summary rather than publishing a truncated replacement. Increasing a cap requires a cost and scheduler-duration review; it must not be changed only to silence saturation.

## Deployment

Function logic changes require a narrow QA deploy of `answerlatticeNightly`. Firestore rule deployment is required only when rule source changes.
