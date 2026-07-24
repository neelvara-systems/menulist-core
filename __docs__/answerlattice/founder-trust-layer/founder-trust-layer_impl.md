# Answer Evidence Metrics Implementation

## Server Flow

`answerlatticeNightly.ts` first builds a complete canonical-coverage window. Trust aggregation runs only when that result is complete and error-free.

The trust task:

1. Reads active answers, active entities, recent signals, and the previous summary with bounded queries.
2. Rejects source saturation and invalid Answerlattice scope.
3. Classifies each search row as no escalation, knowledge gap, low confidence, or retrieval failure.
4. Calculates explicit resolution from stored widget outcomes.
5. Counts drifted active answers and entities with active canonical answers.
6. Builds top review areas from bounded evidence.
7. Writes one schema-v2 `platformSummary` document.

The **Answerlattice Nightly Scheduler Stored Entity ID Boundary** normalizes stored signal, search-history, canonical-answer, search-index, and graph-relation entity IDs before any document reference, grouping key, metric attribution, or derived summary write. Malformed or unresolved IDs are skipped rather than treated as trusted entity identity.

The compatibility `resolution` field means no escalation, and the compatibility `entityHealth` field mirrors exact entity answer coverage. Current product surfaces use `nonEscalation` and `entityAnswerCoverage`.

## Client Flow

- `src/database/answerlattice/trustMetrics.ts` performs one Firestore read.
- `parseAnswerlatticeTrustMetrics` validates schema, product, exact scope, complete window, timestamps, count/rate equations, compatibility fields, source-total coherence, top-entity scalar types/order, and array bounds.
- Coverage and trust parsers construct exact allowlisted DTOs instead of returning the stored document. Undeclared legacy/private fields never enter owner or activation state.
- `FounderTrustDashboard.tsx` shows explicit evidence metrics and stale/unavailable states.
- `activationSummary.ts` carries the explicit component metrics; it no longer computes `trustScore`.

## Important Files

- `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts`
- `src/lib/answerlattice/analyticsIntelligenceContracts.ts`
- `src/database/answerlattice/trustMetrics.ts`
- `src/components/templates/answerlattice/governance/FounderTrustDashboard.tsx`
- `src/lib/answerlattice/activationSummary.ts`
- `scripts/verification/test-answerlattice-support-metrics-contracts.ts`

## Verification

- Focused metric-contract test.
- Answerlattice scoped typecheck.
- Answerlattice Functions TypeScript build.
- Dedicated and shared platform-summary rules tests.
- Full `verify:answerlattice-runtime-truth` gate.
