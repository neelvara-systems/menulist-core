# SignalDesk Source Policy - Firebase Cost Plan

**Status:** Retention Patch R1 implemented locally; deploy blocked pending root-writer integration
**Created:** June 23, 2026
**Cost impact now:** No production impact until the gated Firebase deploy. The implemented hourly task adds bounded reads/writes when enabled and deployed.

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

## Active Patch R1 Persistence Model

Patch R1 does not create per-run retention-job documents and does not perform bulk deletes. Lifecycle authority and resumable progress live on existing policy, provider-retention, and target-summary documents. Deterministic audit, incident, and timeline documents provide observability without creating a new scheduled function.

| Collection | Patch R1 role | Ownership |
| --- | --- | --- |
| `signaldeskSourcePolicies` | Expiry/block authority, target-scan cursor, retry state, final counts | `pId: SD`, document ID equals `sourcePolicyId` |
| `signaldeskTargetSummaries` | Hold-first authority, dependency phase/cursor, tombstone, retry state, final counts | `pId: SD`, document ID equals `targetId` |
| `signaldeskProviderSourceRetention` | Natural retention due rows and explicit negative `scrub_ready` rows | `pId: SD`, document ID equals `providerSourceRetentionId` |
| `signaldeskRouteTokens` | Active target-bound public capabilities are deterministically revoked; retained token hashes remain replay/audit evidence and target display names are scrubbed | `pId: SD`, document ID is derived from the token hash |
| `signaldeskTargets` and target-linked source/evidence/outbound collections | Bounded scrub phases keyed by `targetId` | SignalDesk documents only; foreign `pId` records are never mutated |
| `signaldeskIncidents`, `signaldeskAuditEvents`, `signaldeskRunTimelines` | Deterministic failure and completion evidence | System actor `signaldesk-source-data-lifecycle` |
| `_system` | Independent hourly task leases and outcomes | `pId: SD` |

### Required composite indexes

`firestore-signaldesk.indexes.json` includes product-scoped indexes for:

- policy due, blocked, pending, and retry queries;
- target-by-policy materialization plus target pending/retry queries;
- provider natural-due, explicit `scrub_ready`, and retry queries.

All due/retry queries include `pId: SD` before status/time filters. Each query reads at most its configured cap plus one overflow sentinel. Dependency phases are bounded and cursor-resumable.

### Write and cost behavior

- Policy materialization: one policy write plus deterministic audit/timeline writes, followed by bounded target pages.
- Target materialization: target summary, audit, and timeline writes before dependency scrub.
- Provider materialization: provider tombstone and target hold in one transaction.
- Dependency reconciliation: at most one bounded target-linked page per phase step, plus one target progress write. Route-token closure is one bounded dependency phase and does not create a replacement token.
- Failure: authority retry metadata, one stable incident, one stable audit, control-room counters, and one stable timeline.
- Repeat execution is idempotent: completed lifecycle tokens do not recreate scrub writes or counters.

No production index or Function deploy was performed for Patch R1 because root writer/action integration is still required.
