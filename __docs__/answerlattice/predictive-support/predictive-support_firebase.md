# Predictive Support Firebase And Cost

**Status:** Current implementation truth
**Last verified:** July 18, 2026

## Storage

| Location | Purpose | Access |
| --- | --- | --- |
| `answerlattice_predictiveTriggers/{triggerId}` | Governed trigger source records | Authorized owner/admin read and mutation; strict workspace rules |
| `platformSummary/predictiveTriggers_{tId}_{sId}` | Bounded runtime projection | Server/runtime read model; client mutation path writes through controlled DAL |
| `answerlattice_signalEvents/{signalId}` | Optional shown/opened/dismissed evidence | Server-emitted when signal mutation is enabled |
| `answerlattice_auditLogs/{logId}` | Owner mutation history | Existing audit flow |

No new collection, Storage path, listener, or index is required for the hardened flow.

## Rule contract

Both `firestore-answerlattice.rules` and the shared `firestore.rules` enforce the predictive trigger shape.

Client mutation rules require:

- exact `pId='AL'`, `tId`, and `sId` ownership;
- positive safe workspace scope;
- allowed top-level, condition, action, and known-issue fields;
- valid status, source, kind/action pairing, priority, cooldown, and lengths;
- `source: manual` on create;
- exact page when status is active;
- immutable scope and source;
- immutable kind, except one missing-kind legacy migration to the action-derived kind;
- no client-supplied resolved suggestion, friction evidence, or engagement/effectiveness fields.

Cross-workspace reads and writes are rejected.

## Answerlattice App Predictive Trigger ID Boundary

All document IDs pass the shared valid-Firestore-ID boundary before a reference is constructed or a rule mutation is attempted. The app does not use caller-supplied raw IDs directly.

## Read and write model

### Widget configuration

The widget config route checks the compact predictive summary to determine whether predictive support is available. Existing widget remote-config caching applies.

### Predictive request

The predictive engine reads one summary document on a cache miss:

- active summary cache: 60 seconds;
- empty summary cache: 5 minutes.

No trigger-collection fanout occurs on the public request path.

### Owner mutation

A successful trigger create/update/status/delete operation includes:

1. the trigger write or delete;
2. one bounded collection query, capped at 201 rows to detect overflow;
3. one summary write;
4. the existing compiled-context source invalidation write path;
5. existing audit behavior where invoked by the owner hook.

The 200-trigger workspace cap is enforced before create and during summary rebuild. Overflow fails without replacing the last valid summary.

### Interaction evidence

When `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION` is enabled, one admitted interaction can emit at most one deduplicated signal through the existing signal collection. When disabled, the endpoint returns `recorded: false` and writes nothing.

### Nightly task

The existing Answerlattice nightly task can read friction evidence, create at most five review-only suggestions, rebuild summaries, and aggregate interaction evidence. It does not auto-disable or auto-activate triggers.

## Cost risks and controls

| Risk | Control |
| --- | --- |
| Collection scan on every page | Public path reads the compact summary only |
| Unbounded summary | Hard cap of 200 triggers; overflow fails closed |
| Repeated prompt traffic | 60-second loader cache, server cache, debounce, and Redis cooldown |
| Interaction write amplification | Three bounded event types, dedupe identity, rate limits, optional signal flag |
| Invalid trigger repeatedly evaluated | Strict summary parser omits malformed rows |
| Nightly record growth | Existing signal retention and task bounds apply; no new event collection |
| Large public payload | 32 KiB response cap and public projection |

## Indexes

Current predictive queries use scoped equality filters and bounded limits. No Feature 18 index change was added. Any future query shape must be proven against both dedicated and shared index files before implementation.

## Deletion and retention

- Deleting a trigger rebuilds the summary so the runtime copy is removed.
- Archived or disabled triggers remain source records until explicitly deleted but are not eligible for delivery.
- Interaction evidence follows the existing Answerlattice signal-retention policy.
- Audit history follows the existing audit-retention policy.
- Redis cooldown entries expire through their TTL.

## Deployment requirement

Feature 18 changes both dedicated and shared Firestore rules and Answerlattice Cloud Function logic. After local verification, deploy the smallest scoped QA targets. A successful source check does not prove the remote deployment or production behavior.
