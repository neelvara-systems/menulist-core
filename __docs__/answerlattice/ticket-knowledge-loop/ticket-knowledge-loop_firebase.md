# Ticket-to-Knowledge Loop - Firebase

> **Status:** Dedicated and shared rule emulators pass as of 2026-07-18

## Collections and Operations

| Collection | Operation | Bound |
|---|---|---:|
| `answerlattice_signalEvents` | Resolution signal create | 1 per admitted resolution lifecycle event |
| `answerlattice_signalEvents` | 14-day extraction query | 500 + 1 sentinel |
| `answerlattice_canonicalAnswers` | Active target lookup per candidate | 2 |
| `answerlattice_mutationProposals` | Pending compatibility lookup | 10 + 1 sentinel |
| `answerlattice_mutationProposals` | New proposal writes | Max 5 per tenant run |
| `answerlattice_mutationProposals` | Compatible merge update | One transaction per admitted merge |
| `answerlattice_auditLogs` | Extract/create or evidence-merge lineage | Paired with proposal write |

## Rule Contract

- Signals are append only.
- Deduplicated signals require `identityFingerprint`; a fingerprint without `dedupKey` is rejected.
- Signal type `guided_resolution` remains admitted for the connected interactive-resolution runtime.
- Browser proposal creation requires governance permission, pending status, valid confidence range, and one existing in-scope entity.
- Browser proposal update/delete is denied.
- `ticket_knowledge_evidence_merged` is server reserved and cannot be forged by a client.
- The Support Board manual proposal plus `mutation_proposal_created_manual` audit can be created as one authorized batch.

## Idempotency

- Signal document: deterministic `sig_*` ID plus payload fingerprint.
- Ticket-derived proposal: deterministic `almp_ticket_*` ID.
- Evidence merge audit: deterministic proposal ID plus hash of newly admitted ticket IDs.
- Manual Support Board proposal: deterministic `almp_manual_*` ID plus exact replay comparison.

## Retention and Privacy

Signal events receive the shared retention `expiresAt`. Ticket documents are not reread by the nightly extractor; only bounded signal evidence is consumed. This reduces coupling but does not remove the need for approved model-provider data handling.

## Cost Statement

The runtime is bounded, but no fixed per-tenant currency claim is maintained here. Measure actual Firestore reads/writes and model operations through runtime accounting and provider billing.
