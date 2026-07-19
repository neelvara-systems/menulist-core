# AI Failure Escalation - Test Cases

> **Last Updated:** 2026-07-18

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

1. With `ENABLE_ANSWERLATTICE_AI_ESCALATION: false`, evaluator-driven metadata and Help Chat suggestion UI are not a public promise.
2. Explicit widget support requests still work independently under the widget flag and admission contract.
3. Before enabling the evaluator, run representative answer tests for correct suggestion, false suggestion, abstention, citation, unsupported claim, and founder-workload outcomes.

## Commands

- `npm run test:answerlattice-widget-answer-contracts`
- `npm run test:answerlattice-widget-escalation:emulator`
- `npm run verify:answerlattice-feedback-boundary`
- `npm run verify:answerlattice-runtime-truth`
