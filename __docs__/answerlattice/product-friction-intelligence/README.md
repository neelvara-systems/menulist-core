# Product Friction Evidence

**Status:** Implemented and Feature 13 source-hardened on July 18, 2026. QA deployment and hosted readback remain pending authenticated Firebase access.

Product Friction Evidence turns bounded support events and canonical-answer fallbacks into a compact review queue for active product entities. It helps a founder decide which product areas and approved answers need investigation. It does not measure product health, customer satisfaction, answer accuracy, or verified resolution.

`Customer Friction Map` is an external owner-facing description of this same
job. It is not admitted as a second journey-analytics product. The maintained
feature remains **Product Friction Evidence** because Answerlattice can prove
support evidence and mapping, but cannot infer that every cluster is a product
defect, user-experience problem, or customer-journey failure.

## Governed Flow

1. Answerlattice records privacy-filtered support signals and canonical misses.
2. The nightly scheduler reads today's bounded workspace evidence.
3. Stored entity IDs are resolved against exact-scope active product entities.
4. Daily per-entity evidence rows are written idempotently.
5. A complete UTC seven-day window ending yesterday is compared with the prior seven days.
6. All admitted entities contribute to totals; the owner view retains the top ten review areas and up to five emerging topics.
7. An optional weekly provider call can write an advisory review summary after strict output validation and a source-snapshot recheck.
8. The owner reviews underlying evidence before changing product behavior or approved answers.

## Metric Meaning

- **Evidence count:** admitted support signals plus canonical misses linked to an active entity. It is a count of events, not unique customers or questions.
- **Weighted load:** `evidence * (1 + escalation rate + canonical-miss rate)`.
- **Friction level:** a volume-sensitive label derived from total weighted load across every admitted entity.
- **Trend:** current completed seven-day weighted load compared with the previous completed seven days.
- **Emerging topic:** at least 10 current-window events and fewer than 3 previous-window events.
- **Unmapped evidence:** valid support evidence whose entity is missing, inactive, malformed, or outside the workspace.

## Documentation Decision

- Keep the existing entity-ranked, completed-window review surface.
- Expose the deterministic ticket, negative-feedback, escalation, and
  canonical-miss breakdown already retained in daily rows: implemented.
- Replace owner-facing `questions` language with `support-evidence events`.
- Present the aggregate label as support-evidence load, with its components,
  rather than an unexplained product-friction judgment.
- Preserve a selected Daily Brief entity, provide a read-only Knowledge Map
  handoff for each ranked area, and render validated entity-specific advisory
  actions as review links rather than mutations: implemented.
- Validate workflow hierarchy, release comparison, and owner-confirmed reason
  classification with real founder workspaces before development.
- Do not add session replay, product-event tracking, funnel analytics,
  automatic root-cause claims, or autonomous fixes.

## Safety Boundaries

- Source caps use cap-plus-one and fail closed; a truncated window is not published.
- Wrong product or tenant scope fails the task.
- Browser writes to daily stats and summaries are denied.
- Client readers parse schema version 2 and exact scope before rendering.
- AI output is advisory, cannot define metrics or friction level, and cannot introduce unknown entity IDs.
- Daily evidence is retained for 90 days by the existing cleanup task.

## Important Files

- `src/data/shared/answerlatticeSupportMetrics.ts`
- `functions-answerlattice/src/sharedData/answerlatticeSupportMetrics.ts`
- `functions-answerlattice/src/answerlattice/frictionAggregation.ts`
- `functions-answerlattice/src/answerlattice/frictionInsight.ts`
- `src/lib/answerlattice/analyticsIntelligenceContracts.ts`
- `src/database/answerlattice/frictionStats.ts`
- `src/hooks/answerlattice/useFrictionInsights.ts`
- `src/components/templates/answerlattice/governance/FrictionTab.tsx`
- `scripts/verification/test-answerlattice-support-metrics-contracts.ts`

## Documents

- [Specification](./product-friction-intelligence_spec.md)
- [Implementation](./product-friction-intelligence_impl.md)
- [Firebase](./product-friction-intelligence_firebase.md)
- [Mobile support](./product-friction-intelligence_mobile-support.md)
- [Help documentation](./product-friction-intelligence_helpdoc.md)
- [Marketing boundary](./product-friction-intelligence_marketing.md)
- [Website boundary](./product-friction-intelligence_website.md)
- [Test cases](./product-friction-intelligence_test-cases.md)
- [External proposal validation](./product-friction-intelligence_validation.md)

## Verification

- Focused support-metrics contract test.
- Answerlattice scoped typecheck.
- Answerlattice Functions TypeScript build.
- Dedicated and shared platform-summary rules tests.
- Full `verify:answerlattice-runtime-truth` gate.
