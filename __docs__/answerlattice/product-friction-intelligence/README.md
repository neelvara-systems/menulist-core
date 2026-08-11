# Product Friction Evidence

**Status:** Implemented, source-hardened, extended with a zero-Firebase-cost owner evidence brief on July 30, 2026, and extended with route-aware owner review plus explicit post-change support-evidence review on August 10, 2026. QA deployment and hosted readback remain pending authenticated access.

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
8. The owner can choose a non-causal review path and prepare a deterministic Markdown evidence brief from the already-loaded entity summary.
9. Safe knowledge-review paths continue into the existing entity-filtered Knowledge Map or trusted-answer surface; product review stays a local export, and close paths create no saved state.
10. The selected entity, completed window, source timestamp, and workspace scope are frozen as one browser-local brief input; a scope change closes that selection.
11. Knowledge Map controls and investigate routing honor the feature kill switch, while an absent requested topic stays visibly unselected instead of substituting unrelated evidence.
12. The owner may explicitly load a recent release or implemented knowledge correction and compare complete 14-day UTC support-evidence windows over its direct entity links.
13. The owner reviews underlying evidence before changing product behavior or approved answers.

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
- Let the owner copy or download a bounded evidence brief for product,
  engineering, or knowledge review without adding a saved product-problem
  object, integration call, or automatic diagnosis: implemented.
- Route the selected review path to an existing entity-scoped governance surface
  when one safely exists. Keep product/engineering handoff local, and disclose
  that watch and no-action choices create no reminder or saved decision:
  implemented.
- Keep the post-change comparison explicit, direct-link-only, complete-window,
  and correlation-only. Do not reuse the legacy causal-sounding mutation impact
  percentage or schedule automatic outcome reviews: implemented.
- Validate workflow hierarchy, persisted decision memory, and owner-confirmed
  root-cause classification with real founder workspaces
  before development, using the bounded real-workspace protocol in the
  external proposal validation record.
- Do not add session replay, product-event tracking, funnel analytics,
  automatic root-cause claims, or autonomous fixes.

## Safety Boundaries

- Source caps use cap-plus-one and fail closed; a truncated window is not published.
- Wrong product or tenant scope fails the task.
- Browser writes to daily stats and summaries are denied.
- Client readers parse schema version 2 and exact scope before rendering.
- AI output is advisory, cannot define metrics or friction level, and cannot introduce unknown entity IDs.
- Daily evidence is retained for 90 days by the existing cleanup task.
- Post-change comparison reads retained signal events only after explicit owner
  intent, excludes the change day, and refuses partial, saturated, or expired
  windows.

## Important Files

- `src/data/shared/answerlatticeSupportMetrics.ts`
- `functions-answerlattice/src/sharedData/answerlatticeSupportMetrics.ts`
- `functions-answerlattice/src/answerlattice/frictionAggregation.ts`
- `functions-answerlattice/src/answerlattice/frictionInsight.ts`
- `src/lib/answerlattice/analyticsIntelligenceContracts.ts`
- `src/database/answerlattice/frictionStats.ts`
- `src/hooks/answerlattice/useFrictionInsights.ts`
- `src/lib/answerlattice/frictionEvidenceBrief.ts`
- `src/lib/answerlattice/frictionReviewRouting.ts`
- `src/components/templates/answerlattice/governance/FrictionTab.tsx`
- `src/components/templates/answerlattice/governance/FrictionEvidenceBriefDrawer.tsx`
- `src/components/templates/answerlattice/governance/PostChangeSupportEvidenceReview.tsx`
- `src/app/api/answerlattice/post-change-evidence/route.ts`
- `src/lib/answerlattice/postChangeEvidence.ts`
- `src/lib/answerlattice/postChangeEvidenceServer.ts`
- `scripts/verification/test-answerlattice-support-metrics-contracts.ts`
- `scripts/verification/test-answerlattice-post-change-evidence.ts`

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
- [Post-Change Support Evidence Review](../post-change-support-evidence-review/README.md)

## Verification

- Focused support-metrics contract test.
- Answerlattice scoped typecheck.
- Answerlattice Functions TypeScript build.
- Dedicated and shared platform-summary rules tests.
- Full `verify:answerlattice-runtime-truth` gate.
