# Signal-Quality Scoring - Test Cases

1. The reserved app flag remains false.
2. No app or Functions runtime consumes the reserved flag.
3. No matching Functions flag exists.
4. Turning the app flag true in source would still enable no scoring runtime.
5. The production nightly signal-cluster proposal includes ticket, negative-chat, and escalation counts.
6. Existing proposals without `escalationCount` remain readable.
7. Negative, fractional, non-finite, or oversized escalation counts fail stored-proposal validation.
8. The review queue does not render generic `Signal strength`.
9. Ticket-resolution proposals may render a bounded `Extractor score` as a review aid.
10. The nightly scheduler contains no active usage-based canonical-confidence adjustment.
11. Human approval does not copy a proposal score or draft source into canonical validation.
12. Mutation-proposal notifications do not present the proposal score as confidence.
13. No score can approve, publish, suppress, or mutate an answer.
14. Existing canonical answers stamped by `system:confidence_auto_adjust` are treated as a data-verification cohort, not silently migrated.
15. No new collection, index, provider call, listener, or scheduler is introduced.

## Commands

- `npm run verify:answerlattice-signal-quality`
- `npm run test:answerlattice-governance-contracts`
- `npm run test:answerlattice-integration-adapter-boundaries`
- `npm --prefix functions-answerlattice run build`
- `npm run verify:answerlattice-runtime-truth`
