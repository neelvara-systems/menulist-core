# Product Friction Evidence External Proposal Validation

Reviewed: 2026-07-28

This review compares the attached `Customer Friction Map` proposal with current
Answerlattice code, compact summaries, security boundaries, and Firebase cost
contracts.

## Verdict

Do not build a separate Customer Friction Map. Improve the existing Product
Friction Evidence feature so it explains the deterministic evidence mix already
collected for each ranked entity.

The strongest owner value is:

> Show where mapped support evidence concentrates, what kind of evidence it is,
> and which governed product concept should be inspected next.

## Proposal Matrix

| Proposal | Current truth | Decision |
|---|---|---|
| Rank support problems by product area | Implemented | Existing nightly summaries rank exact-scope active entities. |
| Prefer user goals and workflows over articles | Partly implemented | Workflow entities are supported when evidence is actually mapped to them. Do not infer workflows. |
| Aggregate ticket, negative feedback, escalation, and canonical misses | Implemented in daily rows, incompletely projected | Admit the bounded component breakdown into the next summary/UI schema. |
| Show one evidence number rather than an opaque score | Partly implemented | Keep weighted load only with its formula and components; rename owner-facing aggregate language. |
| 7-day comparison | Implemented | Keep completed 7-day versus previous 7-day windows. |
| 30/90-day and arbitrary timelines | Not justified | Additional history and controls add cost and interpretation complexity. |
| Product-surface journey tree | Not implemented | Validate mapping completeness and owner usefulness first. |
| Heat overlay | Not justified | A ranked list is more legible and cheaper for the current founder ICP. |
| Automatic root-cause classification | Unsafe as stated | AI may organize admitted evidence as advisory text; it cannot prove a cause or percentage. |
| Knowledge gap, UX, bug, missing docs, expectations, policy, and technical-failure types | Not source-proven | These require owner-confirmed classification and clear evidence contracts before persistence. |
| Release overlay | Correlation only | Do not claim a release caused friction. Validate a bounded comparison separately. |
| Suggested fixes | Advisory only | Route to existing reviewed knowledge or product workflows; never auto-publish. |
| Mobile ranked drill-down | Direction accepted | Use a stacked evidence list, not a canvas or tree. |
| Nightly summary-first Firebase design | Implemented | Keep current scheduler, deterministic rows, compact summaries, and no owner listener. |

## Exact Later Code Scope

1. Project existing deterministic evidence components into the top-entity
   snapshot contract.
2. Harden server/browser parsing and legacy behavior.
3. Replace inaccurate mixed-evidence wording.
4. Make the support-evidence load label and calculation inspectable.
5. Preserve the two-read owner cost and existing scheduler queries.

## Validation-Only Scope

- workflow-tree presentation;
- product-surface journey placement;
- owner-confirmed cause taxonomy;
- release-window correlation;
- links from a ranked entity to a filtered evidence surface.

These items require real-client mapping and decision evidence before code.

## Rejected Scope

- session replay;
- behavioral product analytics;
- funnel or abandonment tracking;
- mouse or screen recording;
- autonomous root-cause determination;
- causal release claims;
- automatic product or knowledge changes;
- a second friction collection or map snapshot family.

## Final Decision

Feature 3 remains Product Friction Evidence. A bounded component-breakdown
hardening pass is justified because it uses already-retained evidence and helps
the owner interpret why an entity ranked highly. The larger journey-map vision
is a customer-validation question, not approved implementation scope.
