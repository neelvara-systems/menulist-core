# Answerlattice Automatic Knowledge Creation

> **Status:** Implemented; Feature 12 hardening verified locally on 2026-07-18
> **Runtime flags:** `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION`, `ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE`
> **Deployment:** Scoped QA rule and nightly Function deploys were attempted on 2026-07-18 and stopped before upload because Firebase CLI authentication is unavailable

Automatic Knowledge Creation converts admitted support-friction signals into owner-reviewed mutation proposals and, where eligible, bounded draft content. It does not publish knowledge automatically.

## Customer Job

Reduce the work required to turn repeated support friction into a reviewed canonical answer without treating tickets, chats, or model output as approved truth.

## Governed Flow

```text
support event
-> sanitized signal admission
-> entity-scoped clustering
-> deterministic mutation proposal
-> bounded draft claim
-> draft generation or explicit failure state
-> owner review and edit
-> server-owned governance transaction
-> canonical answer, audit, cache/source version, and stale-bundle invalidation
```

## Invariants

- Signals propose; humans approve.
- Canonical answers take priority over generated retrieval output.
- Only `new_answer_required` and `content_refinement` proposals are eligible for automatic draft generation.
- A failed draft does not remove the underlying proposal.
- Draft claims use a lease so concurrent scheduler/manual work does not duplicate provider calls.
- Browser clients cannot directly write canonical answers or proposal decision state.
- Proposal approval validates stored content, entity bindings, scope, version overlap, and current-answer fingerprints where applicable.
- Model output is a review aid, not an answer-quality measurement.

## Current Surfaces

- Nightly master scheduler: signal mutation, impact tracking, and draft generation.
- Signal-to-Knowledge Queue: draft review, edit, approve, reject, and regenerate.
- Support Board: deterministic manual proposal creation from a governed card.
- Governance server: authoritative proposal decisions and canonical mutation.

## Primary Source Files

- `src/lib/answerlattice/signalEmitter.ts`
- `src/database/answerlattice/signalEvents.ts`
- `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts`
- `functions-answerlattice/src/answerlattice/draftGenerator.ts`
- `src/database/answerlattice/mutationProposals.ts`
- `src/components/templates/answerlattice/MutationProposalReview.tsx`
- `src/lib/answerlattice/governanceServer.ts`
- `firestore-answerlattice.rules`

## Verification

- `npm run test:answerlattice-signal-contracts`
- `npm run test:answerlattice-ticket-knowledge-contracts`
- `npm run test:answerlattice-governance:rules`
- `npm run test:answerlattice-governance:shared-rules`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `npx tsc --noEmit --pretty false`
- `npm --prefix functions-answerlattice run build`

## Documents

- [Specification](./automatic-knowledge-creation_spec.md)
- [Implementation](./automatic-knowledge-creation_impl.md)
- [Firebase](./automatic-knowledge-creation_firebase.md)
- [Help](./automatic-knowledge-creation_helpdoc.md)
- [Mobile](./automatic-knowledge-creation_mobile-support.md)
- [Marketing](./automatic-knowledge-creation_marketing.md)
- [Website](./automatic-knowledge-creation_website.md)
