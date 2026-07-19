# Answer Retrieval Quality Firebase and Cost

## Stored fields

This audit extends existing documents only:

- `answerlattice_canonicalAnswers.evidence.sourceIds`
- `answerlattice_canonicalAnswers.evidence.citations`
- `answerlattice_mutationProposals.suggestedChange.proposedEvidence`
- `ai_search_history.citations`
- `ai_search_history.clarification`
- existing chat-session message citation, fallback, confidence, and clarification fields

The canonical evidence object is bounded to 20 source IDs and 8 public citations. Search-history and chat projections strip private source linkage before write.

## Reads and writes

- Canonical retrieval keeps the existing tenant/entity/version read pattern.
- No additional Firestore query is required to display citations; they are embedded in the already-read canonical answer.
- Knowledge Intake writes private source IDs into the existing mutation proposal transaction.
- Search history and chat sessions add small bounded fields to their existing writes.
- Answer Tests reuse evidence from already-resolved canonical or runtime results.
- Redis `canon:v4` writes the same canonical cache entry with hashed raw applicability key segments, bounded citations, evaluated confidence, and runtime payload validation.

## Cost posture

There is no new listener, collection fanout, scheduled task, provider call, Storage object, or index. The marginal cost is limited to slightly larger existing canonical, proposal, search-history, chat-session, and Redis payloads. Existing document-size guards and citation caps bound that growth.

## Rules, indexes, and deployment

No Firestore rule, Firestore index, Storage rule, or Answerlattice Cloud Function changed. Browser clients still cannot write canonical truth directly; governance remains server-owned. No Firebase deployment is required for this audit item.

## Retention and deletion

Canonical evidence follows canonical-answer governance retention. Search-history and chat metadata follow their existing retention/deletion contracts. Removing a canonical answer or governed source does not create a separate evidence collection that requires cleanup.
