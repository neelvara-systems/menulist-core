# SignalDesk Source Policy Implementation

**Status:** Runtime-backed; lifecycle deployment evidence pending
**Last verified:** July 29, 2026

## Source Files

| Boundary | Source |
| --- | --- |
| Create, renew, and persisted schemas | `src/lib/signaldesk/sourcePolicyContracts.ts` |
| Policy create/renew and workflow guards | `src/lib/signaldesk/workflowServer.ts` |
| Auth, permission, mobile class, validation, safe errors | `src/app/api/signaldesk/actions/route.ts` |
| Client action contract | `src/database/signaldesk/index.ts` |
| Desktop policy form/list/renewal | `src/components/signaldesk/SignalDeskWorkspace.tsx` |
| Source-data lifecycle | `functions-signaldesk/src/sourceDataLifecycle.ts` |
| Consolidated scheduler and leases | `functions-signaldesk/src/schedulers/signaldeskMaintenanceScheduler.ts` |
| Function flags | `functions-signaldesk/src/config/features.ts` |
| Composite indexes | `firestore-signaldesk.indexes.json` |

## Create Flow

1. Desktop builds a strict create payload and retains its idempotency key across retry.
2. The action route requires `signaldesk.configure`, applies mobile mutation blocking and rate limiting, then validates with the shared Zod schema.
3. A Firestore transaction checks the actor-bound claim and deterministic policy document.
4. New creation writes the policy, idempotency claim, audit event, control summary, and daily cost summary atomically.
5. Exact replay returns the stored strict policy. Divergent reuse fails closed.

## Renew Flow

1. Desktop derives a review time and expiry from the existing retention period.
2. `renew-source-policy` requires `signaldesk.configure` and is classified as `mutate_policy`, so mobile requests are rejected.
3. The server transaction rereads the claim and current strict policy.
4. It verifies actor/request binding, blocked state, monotonic review/expiry, and the existing retention ceiling.
5. Only `approvedAt`, `lastReviewedAt`, `expiresAt`, `status`, and update metadata change. Terms remain immutable.
6. Audit and cost summaries are written in the same transaction.

## Runtime Use Guard

`assertSourcePolicyUsable` centralizes status, expiry, retention, and allowed-use checks. Import, source provider, research, scoring, evidence, draft, approval/export, manual contact, operating-envelope, content, trust-partner, and related high-risk paths reread policy truth at the relevant boundary.

Contact data has a second durable authority layer in the outbound-contact contract. A policy that permits contact does not by itself invent a recipient, permission reference, or deliverable route.

## Workspace Projection

Policies are parsed strictly, malformed or foreign documents are logged and omitted, sorted by update time, and capped to the latest 30 valid rows. The bounded corruption scan may inspect up to four 100-document pages so malformed recent rows do not immediately starve valid policy truth. This is suitable for the low-cardinality policy registry; renewal avoids creating a new policy for an unchanged authority basis.

Persisted parsing projects only declared public policy fields. Timestamp
conversion and document property access are contained so hostile or corrupted
values fail with the stable `SOURCE_POLICY_SHAPE_INVALID` contract rather than
leaking an arbitrary getter exception into an import, provider, scoring, or
workspace reader. Persisted policy, target, run, template and operating-envelope
document references must also preserve their exact stored value and pass the
SignalDesk document-ID boundary. A whitespace-mutated or path-shaped reference
invalidates the complete dependent record instead of being normalized into a
different Firestore authority.

## Source-Data Lifecycle

The hourly `signaldeskMaintenanceScheduler` runs the independently leased `source_data_lifecycle` task when its Function flag is enabled. The lifecycle:

- marks expired/blocked policy authority before dependent scrubbing;
- holds affected targets before removing source-derived values;
- resumes through bounded phases/cursors;
- tombstones provider identifiers and URLs;
- revokes active target-bound route capabilities;
- removes unsent personalized content;
- retains sent/inbound/legal/suppression/outcome/audit truth with explicit review markers;
- skips foreign-product records and records stable failures/retries.

The scheduler does not use one job document per target or source record. Existing authority documents plus deterministic audit, incident, timeline, and `_system` lease/state documents hold progress.

## Failure Semantics

- Invalid or missing policy: fail closed.
- Exact action retry: replay durable result.
- Changed request under same operation key: conflict.
- Expired/review-required/use-denied policy: block operation and append bounded evidence.
- Renewal after retention cleanup: policy authority may become active, but prior targets and source data are not restored.
- Lifecycle partial failure: store retry authority and resume; do not delete suppression, outcome, idempotency, or audit truth.
