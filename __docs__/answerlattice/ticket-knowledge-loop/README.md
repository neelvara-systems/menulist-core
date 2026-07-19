# Answerlattice Ticket-to-Knowledge Loop

> **Status:** Implemented; Feature 12 hardening verified locally on 2026-07-18
> **Flag:** `ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE`
> **Authority:** Resolved tickets are evidence for proposals, never approved truth
> **Deployment:** Scoped QA rule and nightly Function deploys were attempted on 2026-07-18 and stopped before upload because Firebase CLI authentication is unavailable

The Ticket-to-Knowledge Loop captures bounded resolution evidence when a ticket enters Resolved or Closed, groups repeated evidence by a known product entity, and creates or updates a human-reviewed mutation proposal.

## Runtime Flow

```text
ticket status transition
-> lifecycle-specific deterministic signal identity
-> sanitized resolution evidence signal
-> bounded 14-day entity cluster
-> safe canonical target resolution
-> exact compatible proposal merge or deterministic proposal create
-> validated extraction draft
-> owner review
-> governed canonical mutation
```

## Current Rules

- A resolution event includes the persisted status and status timestamp so reopen/re-resolve cycles can produce separate evidence.
- The known canonical retrieval entity is propagated when available; unresolved entity signals are not drafted into truth.
- Stored evidence excludes resolver name/email and redacts obvious credentials and contact data.
- At least three unique substantive ticket resolutions are required for a candidate cluster.
- The signal query is capped at 500 plus one sentinel row and fails closed if saturated.
- At most 50 clusters are inspected and at most 5 new ticket-derived proposals are created per tenant run.
- Zero active canonical answers means `new_answer_required`.
- Exactly one active canonical answer means `content_refinement`.
- Multiple active canonical answers remain owner triage.
- A merge is allowed only for the same entity, mutation type, and target answer.
- New evidence invalidates stale generated content and resets the extractor score until regeneration.
- Another pending proposal for the entity blocks automatic creation instead of absorbing unrelated evidence.
- Ticket content is prompt-delimited as untrusted evidence; generated procedures are locally validated.
- Nothing auto-publishes.

## Primary Files

- `src/components/templates/platform/supportTickets/TicketDetailView.tsx`
- `src/lib/answerlattice/signalEmitter.ts`
- `src/data/shared/answerlatticeSupportEvidencePrivacy.ts`
- `functions-answerlattice/src/answerlattice/resolutionExtractor.ts`
- `functions-answerlattice/src/answerlattice/ticketKnowledgePrompt.ts`
- `src/components/templates/answerlattice/MutationProposalReview.tsx`
- `firestore-answerlattice.rules`

## Verification

- `npm run test:answerlattice-ticket-knowledge-contracts`
- `npm run test:answerlattice-signal-contracts`
- `npm run test:answerlattice-signals:rules`
- `npm run test:answerlattice-signals:shared-rules`
- `npm run test:answerlattice-governance:rules`
- `npm run test:answerlattice-governance:shared-rules`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`

## Documents

- [Specification](./ticket-knowledge-loop_spec.md)
- [Implementation](./ticket-knowledge-loop_impl.md)
- [Firebase](./ticket-knowledge-loop_firebase.md)
- [Help](./ticket-knowledge-loop_helpdoc.md)
- [Mobile](./ticket-knowledge-loop_mobile-support.md)
- [Marketing](./ticket-knowledge-loop_marketing.md)
- [Website](./ticket-knowledge-loop_website.md)
