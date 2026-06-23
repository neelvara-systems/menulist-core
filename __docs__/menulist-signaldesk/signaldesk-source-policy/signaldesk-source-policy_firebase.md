# SignalDesk Source Policy - Firebase Cost Plan

**Status:** Initial planning doc
**Created:** June 23, 2026
**Cost impact now:** None.

## Collections

| Collection | Purpose | Normal reads |
| --- | --- | --- |
| `signaldeskSourcePolicies` | Source rules | Small policy list |
| `signaldeskSourcePolicyVersions` | Immutable policy snapshots | Policy detail/audit |
| `signaldeskSourceRuns` | Source run summaries | Recent list |
| `signaldeskSourceRunEvents` | Detailed run events | Run detail/debug only |
| `signaldeskSourceRetentionJobs` | Expiry/deletion jobs | Admin/debug only |

## Read / Write Model

| Flow | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Policy list | 1 query | 0 | Small collection. |
| Create/update policy | 2-4 | 2-4 | Policy, version, audit. |
| Start source run | 2-5 | 2-3 | Policy, kill switch, run summary. |
| Complete source run | 2-5 | 2-5 | Run summary, event, cost summary. |
| Retention cleanup | Bounded query | Deletes/writes | Must cap per job. |

## Indexes

- `signaldeskSourcePolicies`: `provider + status`
- `signaldeskSourceRuns`: `provider + status + startedAt`
- `signaldeskSourceRunEvents`: `sourceRunId + createdAt`
- `signaldeskSourceRetentionJobs`: `status + dueAt`

## Cost Controls

- Source policy list is small and cacheable.
- Source run events are not dashboard source.
- Retention cleanup must process bounded batches.
- No raw provider payload in Firestore unless compact and approved.

## Retention

| Data | Default |
| --- | --- |
| Source policy versions | 24 months minimum |
| Source run summaries | 24 months |
| Source run events | 90-180 days |
| Raw payload refs | Per source policy, usually 30 days max |
