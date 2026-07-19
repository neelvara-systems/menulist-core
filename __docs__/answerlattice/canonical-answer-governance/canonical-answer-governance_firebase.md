# Canonical Answer Governance Firebase Contract

## Collections

| Collection | Role | Browser policy |
| --- | --- | --- |
| `answerlattice_canonicalAnswers` | Approved canonical truth | Scoped read; create/update/delete denied |
| `answerlattice_mutationProposals` | Pending and reviewed changes | Scoped governance read; bounded pending create; server-only update/delete denied |
| `answerlattice_auditLogs` | Append-only governance evidence | Scoped governance read; reserved server actions protected; update/delete denied |
| `answerlattice_cacheVersions` | Canonical retrieval invalidation version | Server-managed |
| `platformSummary` source/bundle docs | Compiled-context freshness | Server-managed compact state |

Separate-project rules are at `firestore-answerlattice.rules:45`; shared fallback rules mirror the same browser-deny canonical ownership at `firestore.rules:336`.

## Transaction writes

A successful canonical create or update approval performs six logical writes in one Firestore transaction:

1. canonical answer set;
2. proposal status update;
3. canonical audit event set;
4. canonical cache version set;
5. compiled source version set;
6. compiled bundle manifest set to stale.

Proposal submission performs two writes: one proposal and one proposal audit event. Reads vary by operation and include idempotency lookup, current answer for updates, bound entities, latest active release, and potentially overlapping active answers.

## Cost and scale controls

- No per-answer child collections were added.
- Invalidation uses compact version/manifest documents instead of fan-out writes to every consumer.
- Approval checks are transaction-bounded and tenant-scoped.
- Existing composite indexes support canonical, proposal, and audit list queries.
- The emulator verifier asserts exactly-once invalidation for idempotent approval replay.

## Retention and deletion

Canonical answers and governance audits have no automatic TTL in this feature. Canonical deletion is denied at the browser boundary. Product-wide retention, backup, restore, and approved deletion behavior receive final coverage in cross-cutting audits C3 and C7.

## Deployment status

The July 18 hardening changed application code, contracts, owner UI, tests, and docs only. Firestore rules, indexes, Storage rules, and Answerlattice Cloud Functions were unchanged; therefore no Firebase target required deployment for this feature pass.
