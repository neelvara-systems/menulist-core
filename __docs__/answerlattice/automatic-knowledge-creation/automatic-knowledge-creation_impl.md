# Automatic Knowledge Creation - Implementation

> **Status:** Implemented; local source gates pass as of 2026-07-18

## Runtime Architecture

### 1. Signal Admission

`src/lib/answerlattice/signalEmitter.ts` normalizes exact numeric scope, sanitizes bounded metadata, redacts obvious credentials/contact evidence, derives payload fingerprints, and dispatches through an injected browser/server persistence boundary. Its short-lived process dedupe key includes exact tenant and workspace scope; identical external event identifiers from different tenants cannot suppress one another before the scoped Firestore identity is evaluated.

`src/database/answerlattice/signalEvents.ts` enforces session scope for browser writes. Persistent identities use deterministic document IDs. A duplicate is returned only when type, dedup key, entity, and payload fingerprint agree; changed replay throws `answerlattice_signal_replay_conflict`.

`src/lib/answerlattice/signalEmitterServer.ts` is the server-only Admin owner. It
builds the deterministic scoped document ID, performs create-only persistence,
verifies an existing replay against exact product/scope/type/dedup/payload
identity, and owns the server retention timestamp. Contract tests read this file
for durable persistence assertions rather than attributing Admin behavior to the
shared/client emitter.

### 2. Signal Mutation

`runSignalMutation()` in `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` reads a bounded, exact-`pId: AL` 14-day signal window, normalizes resolved entity IDs, clusters admitted signal types, and creates deterministic pending proposals. Drift detection, unresolved-signal resolution, mutation-impact counting, Support Board preparation, resolution extraction, and draft examples use the same product partition before their tenant/workspace predicates. The task fails closed rather than operating on a truncated window.

### 3. Draft Generation

`functions-answerlattice/src/answerlattice/draftGenerator.ts`:

- scans at most 50 pending proposals;
- claims supported proposals transactionally with a 15-minute lease;
- caps successful drafts at 10 per tenant run;
- loads entity, signal, existing-answer, and target-answer context;
- bounds required text and normalizes generated procedures through the
  authoritative procedure schema before returning a typed draft; unusable
  steps/warnings/prerequisites are omitted and a procedure with no valid step
  becomes `null`;
- validates parsed output before storing it;
- writes draft state and an audit row transactionally;
- leaves failed proposals available for explicit owner regeneration.

Supported proposal types are `new_answer_required` and `content_refinement`.

### 4. Manual Support Board Proposals

`src/hooks/answerlattice/useSupportBoard.ts` supplies `support_board_<cardId>` as a stable request ID. `src/database/answerlattice/mutationProposals.ts` derives `almp_manual_*`, batches proposal plus audit creation, returns an existing proposal only for the same scope and requested mutation facts, and rejects changed replay with `answerlattice_mutation_proposal_replay_conflict`.

### 5. Review and Governance

`src/components/templates/answerlattice/MutationProposalReview.tsx` shows evidence counts, draft state, proposed content, and an extractor/signal score. It does not label the model score as answer confidence.

`src/lib/answerlattice/governanceServer.ts` owns approval and rejection. Approval validates the stored proposal, current answer, entity bindings, overlap rules, and edited content. The transaction applies canonical truth and writes proposal state, audit, rollback lineage, cache/source version changes, and compiled-context invalidation.

### 6. Post-Implementation Impact

The Answerlattice Nightly Mutation Impact Entity ID Boundary normalizes the implemented proposal entity before any follow-up query. The task compares the same admitted signal types across exact 14-day pre- and post-implementation windows, reads one row beyond each 200-row cap, and fails closed instead of storing a partial improvement result.

## Failure Behavior

| Failure | Behavior |
|---|---|
| Invalid scope or entity | Reject or skip before mutation |
| String, fractional, zero, or negative signal scope in a browser create | Reject in both dedicated and shared Firestore rules |
| Reused signal identity with changed payload | Reject replay |
| Signal input exceeds bound | Fail task; do not mutate from partial evidence |
| Draft provider or parse failure | Mark draft failed; keep proposal |
| Active draft lease | Skip duplicate work |
| Manual request ID reused for another mutation | Reject replay |
| Proposal changed after draft creation | Governance fingerprint checks may block application |
| No applicable proposed change | Approval records reviewed state but does not invent content |

## Security and Privacy Boundary

- Ticket/chat text is untrusted input.
- Signal metadata is bounded and sanitized before persistence.
- Redaction is best-effort protection for obvious emails, labeled phones, and credentials; it is not a complete DLP system.
- Workspaces must enable ticket-derived model processing only under approved provider retention and data-handling terms.
- Browser rules allow pending proposal creation for governance users but deny canonical writes and proposal decisions.
- Server-reserved audit actions cannot be forged by browser clients.

## Connected Files

- `src/lib/answerlattice/signalIdentity.ts`
- `src/data/shared/answerlatticeSupportEvidencePrivacy.ts`
- `src/types/answerlattice/index.ts`
- `functions-answerlattice/src/sharedData/answerlatticeSupportEvidencePrivacy.ts`
- `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts`
- `functions-answerlattice/src/answerlattice/draftGenerator.ts`
- `src/lib/answerlattice/governanceContracts.ts`
- `src/lib/answerlattice/governanceServer.ts`
- `firestore-answerlattice.rules`
- `firestore.rules`

## Verification Contract

Run the focused signal, ticket-knowledge, governance-rule, runtime-truth, TypeScript, and Answerlattice Functions build gates listed in [README.md](./README.md).
