# AI Failure Escalation - Test Cases

> **Last Updated:** 2026-07-20

## Active Widget Path

1. Valid widget key, allowed origin, exact widget history, and valid email create one ticket and link the history.
2. Repeating the same request returns the same ticket and creates no duplicate signal.
3. A solved search-history record is rejected.
4. A non-widget, missing, wrong-product, wrong-tenant, or wrong-workspace history record is rejected.
5. Invalid email, oversized body, unknown fields, missing credential, wrong scope, and denied origin fail before ticket creation.
6. Client-supplied details cannot override scope, ticket lifecycle fields, retrieval evidence, or signal metadata.
7. Signal-emission failure remains observable without rolling back an already valid ticket transaction.
8. The widget uses the authoritative feedback response before opening support fallback.
9. Unsafe citation URLs are omitted, related content runs a follow-up search, and screenshot-processing failure is visible.
10. Mobile controls meet the 44px target and the support form remains usable at narrow width.

## Automatic Evaluator Gate

1. With `ENABLE_ANSWERLATTICE_AI_ESCALATION: false`, evaluator execution remains unavailable; Help Chat has no browser ticket shortcut or suggestion callback regardless of the flag.
2. Explicit widget support requests still work independently under the widget flag and admission contract.
3. A high-confidence canonical hit returns no escalation.
4. A canonical/entity miss with no useful evidence returns a hard suggestion.
5. A canonical miss with weak RAG evidence returns a soft suggestion.
6. RAG inputs are sorted before the five-result output cap, so the actual best admitted score controls classification.
7. A normal canonical miss followed by a non-empty answer with strong cited RAG evidence returns no suggestion.
8. Candidate retrieval documents that the final answer did not cite do not count as answer evidence.
9. A safe refusal is treated as an empty outcome even if retrieval considered strong candidates.
10. Query/context/entity/retrieval evidence is bounded before projection and the stored context must pass the strict schema.
11. Blank queries, malformed canonical evidence, NaN scores, and scores outside 0..1 return no automatic suggestion.
12. Browser-owned `sessionFailureCount` and `repeated_failure` contracts do not exist.
13. Browser-created tickets cannot set server-owned escalation fields under the DAL or either Firestore rule set.
14. Before enabling the evaluator, test correct suggestion, false suggestion, abstention, citation, unsupported claim, context-complete handoff, and founder-workload outcomes.
15. Activation is blocked until authenticated Help Chat uses a server-authoritative, explicitly confirmed, deterministic/idempotent ticket handoff.

## Commands

- `npm run test:answerlattice-widget-answer-contracts`
- `npm run test:answerlattice-widget-escalation:emulator`
- `npm run test:answerlattice-ai-failure-escalation`
- `npm run test:answerlattice-ticket-contracts`
- `npm run test:answerlattice-tickets:rules`
- `npm run test:answerlattice-tickets:shared-rules`
- `npm run verify:answerlattice-feedback-boundary`
- `npm run verify:answerlattice-runtime-truth`
