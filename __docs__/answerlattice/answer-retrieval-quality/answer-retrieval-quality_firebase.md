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
- Redis `canon:v5` writes a canonical cache entry with hashed query, complete context and applicability key segments, bounded citations, evaluated confidence, and runtime payload validation. Graph-aware selection stays on live retrieval until graph state is versioned.

## Cost posture

There is no new listener, collection fanout, scheduled task, provider call, Storage object, or index. The marginal cost is limited to slightly larger existing canonical, proposal, search-history, chat-session, and Redis payloads. Existing document-size guards and citation caps bound that growth.

## Rules, indexes, and deployment

No Firestore rule, Firestore index, or Storage rule changed. Browser clients still cannot write canonical truth directly; governance remains server-owned. The dedicated Functions public-citation projector used by context-bundle repair now rejects the complete IPv6 link-local and deprecated site-local ranges, so the maintained `answerlattice-qa` `answerlatticeNightly` and `triggerAnswerlatticeNightly` targets must be deployed after the existing Firebase CLI authentication/project-access blocker is removed. Local source/build proof does not establish that deployment.

## Retention and deletion

Canonical evidence follows canonical-answer governance retention. Search-history and chat metadata follow their existing retention/deletion contracts. Removing a canonical answer or governed source does not create a separate evidence collection that requires cleanup.
