# Answer Retrieval Quality Specification

## Customer job

Return the approved answer that applies to the current customer and product state, show the approved public evidence, and refuse to improvise when the required truth or context is unavailable.

## Required flow

`question -> safe context -> entity match -> canonical applicability -> governed answer or clarification/abstention -> FAQ/RAG only when governance permits -> response -> feedback/evaluation`

## Invariants

1. Canonical retrieval runs before FAQ and RAG retrieval.
2. A canonical answer must match exact `AL` product identity plus `tId` and `sId`.
3. Drifted, review-required, version-inapplicable, or scope-inapplicable canonical answers are not delivered as truth.
4. Missing plan, role, or state context produces structured clarification and a governed fallback; it does not silently fall through to a generic answer.
5. Private evidence IDs are never serialized to a public answer surface.
6. Only reviewer-approved `{ id, title, url }` citations may reach customer-facing responses.
7. Citations support provenance but do not prove factual correctness; evaluation remains separate.
8. Confidence uses both entity-match strength and the approved answer's validation score.
9. Cached and uncached canonical answers return the same confidence and public citations.
10. Unknown internal fallback diagnostics are not exposed to public clients.

## Evidence model

The canonical answer evidence object uses:

- up to 20 private `sourceIds` for governance and evaluation;
- up to 8 reviewer-approved public citations;
- optional private citation-to-source linkage;
- no automatic conversion of a ticket, chat, or connected source into public truth.

The public citation URL must be HTTP or HTTPS, contain no credentials or sensitive query keys, and must not target local, private, link-local, multicast, documentation, or reserved network ranges. Sensitive query-key admission covers separated, camel-case, and compact credential names such as `access_token`, `accessToken`, `apiKey`, `clientSecret`, `refreshToken`, and `sig`.

## Confidence contract

- `low`: canonical validation confidence is below 0.5;
- `medium`: validation confidence is below 0.8 or the top entity match is weak;
- `high`: validation confidence is at least 0.8 and entity evidence is strong;
- `none`: no answer confidence is available.

Confidence is a delivery signal, not a replacement for correctness evaluation.

## Acceptance criteria

- Public API, widget, Help Center, Help Chat, AI Search, persisted history, and instant cache preserve public citations without private evidence IDs.
- Scope-missing responses contain only allowlisted clarification fields.
- Answer Tests can evaluate canonical and runtime reference IDs.
- Knowledge Intake canonical proposals retain their private source evidence for reviewer approval.
- Existing FAQ and RAG references remain separate from canonical citations.
- No autonomous account action, ticket-as-truth behavior, or unrestricted source URL exposure is introduced.
