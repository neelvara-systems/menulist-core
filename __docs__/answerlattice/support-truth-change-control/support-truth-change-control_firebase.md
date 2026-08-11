# Support Truth Change Control Firebase Cost Contract

## Data Model

No new Firestore collection, document type, index, Storage object, Cloud Function, listener, or scheduler is introduced.

## Explicit Release Preview Reads

| Read | Maximum | Notes |
| --- | ---: | --- |
| Pending release | 1 | Existing preview read |
| Directly affected active answers | 201 | Existing cap-plus-one query; 200 admitted |
| Answer Test summary | 1 | Existing compact summary and permission dependent |
| Referenced Knowledge Intake sources | 50 | New direct document reads; only IDs already cited by affected answers |
| Product-surface content summary | 1 | Existing compact workspace summary |
| Compiled source versions | 1 | Existing compact control document |
| Compiled bundle manifest | 1 | Existing compact control document |

Typical releases should reference far fewer than 50 source records. When more than 50 unique governable source IDs are present, the proof is `partial`; no collection query or follow-up fanout occurs.

While `ENABLE_ANSWERLATTICE_SOURCE_GOVERNANCE` is `false`, the source-watch section performs zero source-document reads and reports `not_enabled`. Non-Knowledge-Intake IDs and malformed legacy references are counted for owner attention but never probed against fallback collections.

## Byte Controls

- Source lookups load identity, title, status, approval status, effective date, review date, and conflict IDs only. Source text, excerpts, reviewer identity, and governance notes are not loaded.
- Surface review uses the existing compact summary instead of raw collections.
- Surface detail is capped to 10 deterministic samples; exact aggregate counts and unmapped changed areas remain available.
- Propagation proof omits source counters, paths, hashes, and URLs from the browser response.
- The server DTO and browser reader share a 256 KiB response limit.
- A maximum-valid contract fixture verifies that the complete preview remains within that limit.

## Writes

Preview performs zero writes. Activation keeps its existing writes only:

- release lease and final state;
- affected answer drift/review fields and audits;
- canonical cache version when needed;
- source-version counters;
- stale bundle manifest.

No proof record is persisted because the release activation audit and existing control documents already provide durable authority. Persisting another snapshot would add write cost and stale duplicate state.

## Cost Decisions Rejected

- Workspace-wide source scan.
- Per-entity dependency documents.
- Per-release proof documents.
- Realtime listeners.
- Scheduled freshness recomputation.
- Runtime LLM classification.
- Rebuilding the surface summary merely to open a preview.

## Deployment

Application-only changes require no Firebase rules, index, Storage rule, or Functions deployment. A Vercel deployment remains an explicit owner action.
