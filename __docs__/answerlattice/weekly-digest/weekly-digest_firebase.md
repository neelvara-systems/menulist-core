# Weekly Digest Firebase and Cost Contract

## Storage

Weekly Digest reuses one existing scoped document:

```text
insights/{tId}/stores/{sId}/ai/weekly
```

Daily input remains in the existing `chatAnalytics` collection. No collection, index, Storage object, listener, email record, or assistant record is added.

## Rule Boundary

Dedicated Answerlattice rules require:

- authenticated user;
- platform admin or exact tenant/store path;
- `canViewReadiness`;
- stored `pId == 'AL'`;
- stored tenant/store identity matching the path.

Client writes are denied. The shared recovery rules require the same readiness authority in addition to exact Answerlattice product and tenant/store scope. A support-only staff role cannot read the digest merely because it can review conversations.

The absence of the `weekly` document is an admitted empty state. Dedicated and shared rules allow one missing-document `get` only for the exact `weekly` ID and either the authenticated workspace with `canViewReadiness` or a platform support operator. Existing documents still require stored `pId == 'AL'` and matching `tId`/`sId`; forged IDs, cross-workspace paths, and support-only workspace roles remain denied.

## Read and Write Cost

| Path | Bounded operations |
| --- | --- |
| Browser load/refresh | One weekly insight document read |
| Manual prepare | Permission-admission cost, two queries limited to seven daily rows, one weekly insight read, at most one changed write |
| Scheduled chat intelligence | One query limited to 14 daily rows, feedback insight read, optional weekly insight read, and only changed feedback/weekly writes |
| Export | Zero Firestore operations |
| Review-route handoff | Zero operations until the destination feature performs its own governed work |

## Idempotency

The source hash excludes server timestamps and includes schema version 2. Identical admitted daily evidence produces the same hash and skips the weekly write. The scheduled and manual writers use the same field names, units, nullability, tie-breaking, bounds and deterministic text, preventing writer-to-writer hash churn. Exact replacement removes retired derived fields; the schema transition causes at most one changed write.

## Scheduler

There is no standalone weekly function. Weekly preparation is part of the existing `answerlatticeNightly` scheduled export and its per-workspace task/lease system.

## Data Safety

- No raw conversation body is copied into the weekly document.
- Repeated questions and gaps are bounded and normalized from daily summaries.
- No model prompt, response, token usage, or AI operation is stored.
- Volume movement is percent; positive-feedback-share movement is percentage points. A missing denominator is stored as `null`.
- Message feedback is not called satisfaction, and no negative-gap count is represented as all feedback.
- The weekly summary is advisory and does not become a canonical answer.
- There is no claimed email delivery or recurring owner notification.

## Retention

The current weekly insight is durable and replaced by the latest changed completed-week projection. Internal implementation status for historical archival requires verification; the feature does not claim a weekly archive.
