# Answer Retrieval Quality Implementation

## End-to-end ownership

| Layer | Current implementation |
| --- | --- |
| Question admission | Public API, widget, and authenticated Help Center routes enforce their existing auth, rate-limit, origin, body-size, and scope contracts. |
| Canonical retrieval | `canonicalRetrieval.ts` resolves exact-scoped entities, versions, plan, role, state, governance state, evidence, and confidence. |
| Fallback control | `searchCore.ts` stops on governed review/scope/unavailable outcomes and uses FAQ/RAG only for ordinary canonical misses. |
| Public projection | `publicAnswerContracts.ts` strips private evidence and validates citation URLs, fallback reasons, and clarification fields. |
| Persistence | Search history and chat sessions retain only public citation projections and bounded clarification metadata. |
| Fast path | Redis instant cache uses `canon:v4`, hashes raw applicability key segments, validates untrusted payloads, and stores evaluated confidence plus public citations. |
| Review | Canonical editor and mutation review expose reviewer-controlled public links while showing only private evidence counts. |
| Evaluation | Answer Tests compare canonical source IDs and approved citation IDs without an AI judge. |

## Retrieval decisions

1. Resolve tenant-scoped entities from the query and safe product context.
2. Load active canonical answers for those entities.
3. Reject product, tenant, version, plan, role, state, drift, and review mismatches.
4. If restricted context is missing, return `canonical_scope_context_required` with the exact required context keys.
5. If the current context is outside approved scope, return `canonical_scope_not_covered`.
6. Rank eligible direct entity answers ahead of graph-expanded neighbours.
7. Return the approved answer, public citations, private evaluation references, and validation-aware confidence.
8. If canonical retrieval is operationally unavailable, abstain with `canonical_retrieval_unavailable` rather than produce an unverified answer.

## Public and private evidence

Private paths may retain `sourceIds` and citation `sourceId` linkage:

- canonical governance documents;
- mutation proposals;
- Answer Tests;
- private context/MCP bundles;
- authorized Support Truth Export.

Customer-facing paths receive only `{ id, title, url }`:

- public answers API;
- embedded widget;
- Help Center and Help Chat;
- AI Search display;
- public compiled context bundle.

## Cache coherence

The Redis namespace is `canon:v4`. It supersedes `canon:v3` by hashing raw entity/plan/role/state key segments and validating cached payload IDs, answer version, timestamp, procedure, source versions, citations, and UTF-8 bytes before delivery. Entries retain evaluated `high`, `medium`, or `low` confidence and approved citations. Existing source-version and live canonical freshness checks remain authoritative.

## Failure behavior

| Failure | Result |
| --- | --- |
| Missing required plan/role/state | Structured clarification plus safe fallback |
| Scope mismatch | Safe abstention; no generic answer substitution |
| Drift or review required | Governed fallback and review signal path |
| Unsafe public citation | Rejected at governance/storage parse or omitted at public projection |
| Cache unavailable or stale | Live retrieval continues with bounded diagnostics |
| Canonical retrieval unavailable | Explicit safe fallback; no RAG override |
| No canonical match | Existing FAQ then bounded RAG path may continue |

No new route, collection, dependency, provider, scheduler, or Cloud Function was introduced.
