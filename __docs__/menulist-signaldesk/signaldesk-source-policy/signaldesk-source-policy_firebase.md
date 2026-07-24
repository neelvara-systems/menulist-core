# SignalDesk Source Policy Firebase Contract

**Status:** App runtime complete; lifecycle Function/index release not verified remotely
**Last verified:** July 21, 2026

## Actual Persistence

| Collection | Role |
| --- | --- |
| `signaldeskSourcePolicies` | Strict policy authority plus lifecycle progress. |
| `signaldeskIdempotencyKeys` | Actor/request-bound create and renew claims. |
| `signaldeskSourceRuns` | Governed import/provider run summaries. |
| `signaldeskProviderSourceRetention` | Provider refresh/expiry and scrub authority. |
| `signaldeskTargetSummaries` | Source-policy lineage, hold/tombstone, and lifecycle progress. |
| `signaldeskTargets` plus linked workflow collections | Bounded source-derived dependency scrubbing. |
| `signaldeskRouteTokens` | Revocation of active target-bound public capabilities. |
| `signaldeskAuditEvents`, `signaldeskRunTimelines`, `signaldeskIncidents` | Durable success/failure evidence. |
| `signaldeskDailyCostSummaries`, `signaldeskControlSummary` | Compact operational accounting/status. |
| `_system` | Consolidated scheduler task leases and outcomes. |

There are no `signaldeskSourcePolicyVersions`, `signaldeskSourceRunEvents`, or `signaldeskSourceRetentionJobs` collections in the current contract.

## Operation Cost Shape

| Operation | Reads | Writes |
| --- | --- | --- |
| Policy list | Bounded ordered scan, normally one small query | None |
| Create policy | Claim and deterministic policy reads | Policy, claim, audit, control summary, daily cost |
| Renew policy | Claim and policy reads | Policy merge, claim, audit, daily cost |
| Import/provider use | Policy plus workflow-specific authority reads | Existing import/provider lineage writes only |
| Lifecycle pass | Capped due/retry/overflow queries and bounded dependency pages | Authority/progress/tombstone writes plus deterministic evidence |

No new read is added to ordinary public MenuList or owner MenuList surfaces. SignalDesk remains isolated in its separate Firebase project and `pId: SD` documents.

## Indexes

`firestore-signaldesk.indexes.json` contains product-scoped indexes for:

- due, blocked, pending, and retry policy lifecycle queries;
- targets by policy and target pending/retry queries;
- provider retention due, explicit scrub-ready, and retry queries.

Every lifecycle query is bounded and includes `pId: SD`. Overflow is detected with a sentinel and resumed by stored cursors.

## Retention Behavior

Policy `retentionDays` controls the maximum review/expiry window and source-derived retention authority. It does not define deletion of financial, suppression, legal, outcome, audit, or idempotency evidence.

Expired source-derived target data is hold-first and scrubbed in phases. Sent or inbound communication is retained with legal-review metadata rather than silently deleted. Active public route tokens tied to the target are revoked.

## Deployment Boundary

The source-data lifecycle code, scheduler integration, Function flag, indexes, and emulator suite exist locally. Existing validation records state that no Firebase release was applied after the lifecycle integration. Until an authenticated `menulist-signaldesk-qa` deployment and post-deploy proof are recorded, remote cleanup behavior remains pending.

Required scoped release targets when authorized:

```bash
firebase deploy --project menulist-signaldesk-qa --config firebase-signaldesk.json --only firestore:indexes,functions:signaldeskMaintenanceScheduler --non-interactive
```

Confirm the exact project alias in the environment runbook before execution. Provider sending and unrelated app/Vercel deployment remain outside this release.
