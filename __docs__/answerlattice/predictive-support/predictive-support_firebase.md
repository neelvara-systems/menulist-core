# Predictive Support Firebase And Cost

**Status:** Current implementation truth
**Last verified:** July 21, 2026

## Storage

| Location | Purpose | Access |
| --- | --- | --- |
| `answerlattice_predictiveTriggers/{triggerId}` | Governed trigger source records | Authorized owner/admin read and mutation; strict workspace rules |
| `platformSummary/predictiveTriggers_{tId}_{sId}` | Bounded runtime projection | Server/runtime read model; client mutation path writes through controlled DAL |
| `answerlattice_signalEvents/{signalId}` | Optional shown/opened/dismissed evidence | Server-emitted when signal mutation is enabled |
| `answerlattice_auditLogs/{logId}` | Owner mutation history | Existing audit flow |

No new collection, Storage path, or listener is required. The exact nightly evidence query requires the mirrored `pId + tId + sId + type + timestamp desc` composite index in both Answerlattice index manifests.

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

The predictive engine reads one summary document on a cache miss. Populated and empty results use the exact-workspace `predictive` Next data-cache tag with a 60-second recovery TTL. Every successful owner summary rebuild calls the authenticated Answerlattice revalidation route in strict mode; failure produces `summarySynchronized: false`. The browser loader does not retain predictive results, so it cannot replay disabled truth or bypass an ordinary Redis cooldown; it only coalesces same-context in-flight work and ignores superseded responses. Interaction evidence bypasses the server cache and re-reads current summary truth before writing a signal.

No trigger-collection fanout occurs on the public request path.

### Owner mutation

A successful trigger create/update/status/delete operation includes:

1. on create, one scoped count aggregate to enforce the 200-trigger cap without loading trigger documents;
2. one batch containing the trigger write/delete and its matching owner audit row;
3. one bounded collection query, capped at 201 rows to rebuild the runtime summary and detect overflow;
4. one batch that replaces the summary and increments/marks the existing compiled-context source-version and stale-manifest documents atomically.

The first batch is authoritative. A failure in the derived-summary batch is securely logged and returned as `summarySynchronized: false`; the UI reports delayed public-help synchronization without treating the committed trigger mutation as failed. The nightly task remains the bounded repair path.

The 200-trigger workspace cap is enforced by aggregate count before create and by cap-plus-one during summary rebuild. Overflow fails without replacing the last valid summary.

### Interaction evidence

When `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION` is enabled, one admitted interaction can emit at most one deduplicated signal through the existing signal collection. When disabled, the endpoint returns `recorded: false` and writes nothing.

### Nightly task

The existing Answerlattice nightly task strictly reads the current friction snapshot, transaction-creates at most five deterministic review-only suggestions, rebuilds summaries, and aggregates at most 2,000 complete newest-first interaction rows from the last 30 days. The signal query is partitioned by exact `pId: AL + tId + sId`; cap-plus-one saturation fails without overwriting evidence. It does not auto-disable or auto-activate triggers.

## Cost risks and controls

| Risk | Control |
| --- | --- |
| Collection scan on every page | Public path reads the compact summary only |
| Full trigger fetch only to enforce create cap | Scoped count aggregate; the bounded full query remains only where the runtime summary must be rebuilt |
| Unbounded summary | Hard cap of 200 triggers; overflow fails closed |
| Repeated prompt traffic | Browser debounce/same-context in-flight coalescing, same-scope server miss coalescing, tagged server cache, and one atomic Redis `SET NX EX` cooldown claim |
| Interaction write amplification | Three bounded event types, dedupe identity, rate limits, optional signal flag |
| Invalid trigger repeatedly evaluated | Strict projection/count reconciliation rejects the whole malformed summary |
| Nightly record growth | Existing signal retention plus a 2,000-row complete-window ceiling; saturation fails visibly instead of publishing partial counts |
| Large public payload | 32 KiB response cap and public projection |

## Indexes

The nightly engagement query uses:

```text
answerlattice_signalEvents: pId asc, tId asc, sId asc, type asc, timestamp desc
```

The identical index exists in `firestore-answerlattice.indexes.json` and `firestore.indexes.json`. Canonical-answer entity lookup uses the already-existing product-scoped array-membership index.

## Deletion and retention

- Deleting a trigger rebuilds the summary so the runtime copy is removed.
- Archived or disabled triggers remain source records until explicitly deleted but are not eligible for delivery.
- Interaction evidence follows the existing Answerlattice signal-retention policy.
- Audit history follows the existing audit-retention policy.
- Ordinary-prompt Redis cooldown entries are partitioned by product/workspace plus hashed session/trigger identity and expire through their TTL. Known issues never create or read ordinary cooldown entries.

## Deployment requirement

Feature 18 changes both dedicated and shared Firestore rules and Answerlattice Cloud Function logic. After local verification, deploy the smallest scoped QA targets. A successful source check does not prove the remote deployment or production behavior.
