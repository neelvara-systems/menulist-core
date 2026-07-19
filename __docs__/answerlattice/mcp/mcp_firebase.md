# Answerlattice MCP - Firebase and Cost Contract

> **Status:** Existing data paths only; no MCP-specific collection, index, rule, Function, or scheduler
> **Last Updated:** 2026-07-20

## Data Used

| Data | Operation | Boundary |
| --- | --- | --- |
| `stores.publicApi` | Exact hash-only credential lookup during session exchange | No positive auth cache; active AL workspace required. |
| `platformSummary/bundleManifest_{tId}_{sId}` | One manifest read during exchange and read-tool execution | Must be `ready` with positive matching version. |
| Storage `answerlattice-context/private/{tId}/{sId}/v{version}/...` | Private compiled object read | Admin/server only; validated manifest ref and object-size ceiling. |
| `answerlattice_signalEvents` | Optional governed missing-context signal write | Existing signal mutation path, idempotency, redaction, and retention. |

## No New Storage Model

MCP does not add:

- a session collection;
- a tool-call log collection;
- an MCP signal summary map;
- a new index;
- a Cloud Function;
- a scheduler task;
- direct browser Firestore/Storage access.

Sessions are short signed tokens. This avoids per-call session reads/writes but creates a deliberate maximum five-minute source-key revocation window for already issued tokens.

## Cost Shape

### Session Exchange

- two fail-closed rate-limit operations through the shared provider;
- one bounded hash-only credential lookup;
- one compiled manifest read;
- zero MCP session writes.

### Read Tool Call

- one fail-closed rate-limit operation;
- one manifest read, subject to existing server cache behavior;
- one validated private Storage object read, subject to existing object cache;
- zero Firestore collection scans and zero writes.

### Missing-Context Tool Call

- normal MCP call admission;
- one additional fail-closed signal rate-limit operation;
- one existing governed signal transaction/write path;
- no new summary document family.

## Retention and Deletion

- Public API credential lifecycle follows the Public API dossier.
- Tokens are not persisted by Answerlattice.
- Compiled bundle retention follows [compiled context distribution](../compiled-context-distribution/compiled-context-distribution_firebase.md).
- Missing-context signal retention follows the existing signal and Answerlattice data-retention contracts.
- Workspace deletion must remove source credentials, compiled bundle objects/manifests, and signal data through their owning lifecycles; MCP adds no separate deletion job.

## Failure Behavior

- Rate provider unavailable: fail closed with `503` and `Retry-After`.
- Credential unavailable/revoked/wrong scope: fixed `401`.
- Manifest unavailable/not ready: fixed session error or structured tool error.
- Bundle version changed: structured `CONTEXT_CHANGED` and new-session requirement.
- Storage object missing/invalid/oversized: bounded tool error; no raw fallback collection scan.
- Signal lifecycle disabled/unavailable: write tool hidden or structured signal error.

## Deployment

Feature 36 source hardening changes app/runtime files and documentation only. No Firestore rules, Storage rules, indexes, or Answerlattice Cloud Functions changed, so no Firebase deployment is required for this audit item. Hosted route changes still require an explicitly authorized app deployment before remote proof.
