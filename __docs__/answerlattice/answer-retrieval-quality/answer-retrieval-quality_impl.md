# Answer Retrieval Quality Implementation

## End-to-end ownership

| Layer | Current implementation |
| --- | --- |
| Question admission | Public API, widget, and authenticated Help Center routes enforce their existing auth, rate-limit, origin, body-size, and scope contracts. |
| Canonical retrieval | `canonicalRetrieval.ts` resolves exact-scoped entities, versions, plan, role, state, governance state, evidence, and confidence. |
| Fallback control | `searchCore.ts` stops on governed review/scope/unavailable outcomes and uses FAQ/RAG only for ordinary canonical misses. |
| Public projection | `publicAnswerContracts.ts` strips private evidence and validates citation URLs, fallback reasons, and clarification fields. The app and dedicated Functions boundaries both reject the complete IPv6 link-local (`fe80::/10`) and deprecated site-local (`fec0::/10`) ranges in addition to their existing local/private/reserved host and separated/camel/compact sensitive-query-key policy. |
| Persistence | Search history and chat sessions retain only public citation projections and bounded clarification metadata. |
| Fast path | Redis instant cache uses `canon:v5`, hashes normalized query, complete context and raw applicability key segments, validates untrusted payloads, and stores evaluated confidence plus public citations. Graph-aware selection bypasses Redis until graph state has an authoritative version. |
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

The Redis namespace is `canon:v5`. It supersedes `canon:v4` by adding hashed normalized-query and complete-context identities to the hashed entity/plan/role/state segments, preventing distinct questions or product surfaces from sharing one answer entry. Cached payload IDs, answer version, timestamp, procedure, source versions, citations, and UTF-8 bytes are validated before delivery. Entries retain evaluated `high`, `medium`, or `low` confidence and approved citations. Existing source-version and live canonical freshness checks remain authoritative. When Knowledge Graph exploitation is enabled, search bypasses this cache because graph state does not yet have an independent authoritative cache version.

## Failure behavior

| Failure | Result |
| --- | --- |
| Missing required plan/role/state | Structured clarification plus safe fallback |
| Scope mismatch | Safe abstention; no generic answer substitution |
| Drift or review required | Governed fallback and review signal path |
| Unsafe public citation | Rejected at governance/storage parse or omitted at public projection, including full IPv6 link/site-local ranges plus camel-case and compact secret query keys |
| Cache unavailable or stale | Live retrieval continues with bounded diagnostics |
| Canonical retrieval unavailable | Explicit safe fallback; no RAG override |
| No canonical match | Existing FAQ then bounded RAG path may continue |

No new route, collection, dependency, provider, or scheduler was introduced. The existing dedicated context-bundle Function boundary changed and requires the maintained Answerlattice QA Functions deployment after Firebase access is restored.
