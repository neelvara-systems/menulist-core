# SignalDesk Content Distribution Rail - Firebase

**Status:** Implemented for internal testing
**Date:** June 24, 2026

## Collections

| Collection | Purpose | Client access |
| --- | --- | --- |
| `signaldeskContentSources` | Source registry for content inputs. | Read only for SignalDesk members/admins. |
| `signaldeskContentAssets` | Canonical asset and proof message records. | Read only for SignalDesk members/admins. |
| `signaldeskContentDistributionDrafts` | Platform-ready drafts and approval status. | Read only for SignalDesk members/admins. |
| `signaldeskContentCalendarItems` | Queued manual distribution schedule. | Read only for SignalDesk members/admins. |
| `signaldeskContentPerformanceSummaries` | Compact performance records. | Read only for SignalDesk members/admins. |

All writes are server/admin writes through `src/app/api/signaldesk/actions/route.ts`.

## Indexes

- `signaldeskContentSources`: status plus updatedAt.
- `signaldeskContentAssets`: status plus updatedAt; sourceType plus updatedAt.
- `signaldeskContentDistributionDrafts`: status plus updatedAt; channel/status/updatedAt; contentAssetId/updatedAt.
- `signaldeskContentCalendarItems`: status plus scheduledFor.
- `signaldeskContentPerformanceSummaries`: contentAssetId/capturedAt; channel/capturedAt.

## Cost Posture

- Workspace reads are capped by the shared `LIST_LIMIT`.
- Content-source mutation requires one actor-bound key. One transaction reads the current content pause, explicit/v2/legacy source candidates, optional market pod and claim before writing source/claim/timeline/audit/cost truth. Exact retries converge; matching legacy IDs are reused, type/URL provenance is immutable, and active pod-bound sources require current founder-approved authority.
- Source URLs use a credential-free HTTP(S) canonicalizer that preserves case-sensitive path/query identity. Workspace reads project source rows through product/ID/enum/length/URL guards and omit malformed legacy rows with one bounded aggregate diagnostic.
- Default source seeding is a create-only transaction after default-control settlement. It reads the current source, content pause and default pod, creates held truth until founder approval is recorded, skips creation during pause, and never rewrites an existing source's lifecycle/provenance.
- The browser separates source editing from asset provenance selection, retains one retry UUID for unchanged source input, and can explicitly clear a default pod with `null`. Selected-source asset fields are rederived and checked in the asset transaction.
- Content-asset mutation requires one actor-bound operation key. One transaction reads the current content pause, optional selected source, prior asset, proof permission and proof target, explicit/default active CTA, effective active founder-approved market pod, and claim before writing asset/source-recency/claim/timeline/audit/cost truth. Exact retries converge and changed-input reuse conflicts.
- Proof-permission mutation requires one actor-bound operation key. One transaction reads the current target, permission and claim before writing permission/claim/audit/cost; target ownership remains immutable and exact retries converge.
- Draft generation requires one actor-bound operation key. One transaction reads the current content pause, asset, optional proof permission, explicit/default CTA, prior drafts and claim before writing drafts/claim/queue/timeline/audit/cost. Exact retries converge without incrementing review backlog twice.
- Draft review requires one actor-bound operation key. One transaction reads the current content pause, draft and claim before writing review/claim/timeline/audit/cost truth; exact retries converge and changed-input reuse conflicts.
- Scheduling requires one actor-bound operation key. One transaction reads the current content pause, draft approval, prior calendar item and claim before writing the draft/calendar/claim/audit/timeline/cost effect set. Exact retries return the durable calendar item and changed-input reuse conflicts.
- Performance capture requires one actor-bound idempotency key. One transaction reads the current content-distribution pause, asset, approved draft, matching calendar item, and operation claim before writing the compact performance record and every derived effect.
- Non-zero metrics require a credential-free publication URL and valid publication timestamp. The draft must belong to the selected asset/channel and its deterministic calendar item must match; publication evidence atomically marks the draft/calendar published and the asset distributed.
- Exact retries return the durable performance record; changed metrics or publication evidence under the same key fail closed. A later record cannot contradict already settled publication evidence.
- Owner-quality signals are incremental observations. Each independently claimed performance record increments the daily demand summary rather than overwriting earlier observations.

## Deploy

No Firebase deploy was run in this pass. Validate with:

```bash
firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"
```

## Hourly Proof-Permission Lifecycle - July 15, 2026

| Contract | Exact implementation |
| --- | --- |
| Schedule | `signaldeskMaintenanceScheduler` runs at `0 * * * *` UTC with `maxInstances: 1`; the task flag is `ENABLE_SIGNALDESK_PROOF_PERMISSION_LIFECYCLE`. |
| Durable lease | `_system/signaldeskMaintenanceTaskLock_proof_permission_lifecycle` uses a 50-minute owner lease. `_system/signaldeskMaintenanceScheduler` records the last attempt/status/details and suppresses a second successful run in the same UTC-hour bucket. A failed attempt records separate failure fields and does not erase the last successful completion time/bucket. |
| Retry scan | `signaldeskProofPermissions`: `pId == SD`, lifecycle state `failed`, retry time due; ordered by retry time then document ID. Due failures retry after 5 minutes, double per failure, and cap at 24 hours. |
| Resume scan | `signaldeskProofPermissions`: `pId == SD`, lifecycle state `pending`; ordered by document ID. |
| Expiry scan | `signaldeskProofPermissions`: `pId == SD`, `status == active`, `expiresAt <= now`; ordered by expiry then document ID. Foreign-product rows cannot consume the page budget. |
| Bounds | Default permission page/max is 25; configurable max is 100. Dependency pages cap at 50. Reconciliation defaults to 120 steps and caps at 1,000. Retry, pending, and due scans each use their own bounded page loop. |
| Materialization writes | One permission transaction writes expired/pending token state plus one deterministic audit and timeline. It resets current-cycle retry/failure fields so a renewed grant cannot inherit an old backoff. |
| Reconciliation writes | Bounded transactions update only matching `SD` assets/drafts/calendars, permission progress, optional queue decrement, deterministic incident/review/audit/timeline state, and exact control-room incident deltas. There is no scheduled `signaldeskCostDailySummaries` write; Firebase cost is the bounded Firestore reads/writes described here. |
| Published truth | Published assets/dependencies retain their status. One deterministic high-severity incident and asset review marker are created/reopened; incident totals increment only on create and open totals only on create/reopen. |
| Failure isolation | A malformed permission/dependency creates or reopens deterministic `proof-permission-lifecycle-failure` evidence, moves the permission to failed/backoff state, and processing continues. Non-`SIGNALDESK_*` errors map to `SIGNALDESK_PROOF_PERMISSION_LIFECYCLE_PROCESSING_FAILED`. A transaction-current non-`SD` permission receives no SignalDesk side effect. If diagnostic persistence itself collides/fails, `failureDiagnosticErrorCount` plus a bounded structured Functions log remains visible and later rows continue. |
| Completion | Clears pending kind/token/progress and current retry/failure fields, stores the exact reconciliation result, completion audit, and timeline. |

Required composite indexes in `firestore-signaldesk.indexes.json` are:

1. `pId ASC, status ASC, expiresAt ASC`;
2. `pId ASC, proofExpiryLifecycleState ASC, proofExpiryLifecycleRetryAt ASC`;
3. `pId ASC, proofExpiryLifecycleState ASC`.

The rules/index/Functions source changed locally. No Firebase deploy was run; live scheduler/index effect remains pending an authorized SignalDesk Firebase deployment.
