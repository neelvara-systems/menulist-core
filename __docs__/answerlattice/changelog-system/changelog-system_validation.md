# Release Impact Guard External Proposal Validation

Reviewed: 2026-07-28

This review compares the attached `Release Impact Guard` proposal with the
current immutable release registry, versioned changelog lifecycle, release
activation drift evaluation, Answer Tests release checks, governed rollback
proposals, Firebase costs, and Answerlattice doctrine.

## Verdict

Do not build a separate Release Impact Guard platform. Add one preventive
review step to the existing versioned release lifecycle:

> Before activation, show the founder which directly linked active canonical
> answers and critical Answer Tests may be affected, then require activation to
> match that current preview.

## Current Truth

- Releases are exact-scope, monotonic, immutable registry records.
- A release contains 1-25 owner-selected changed entity IDs.
- Versioned changelog entries remain private until their exact release is
  active.
- Activation evaluates at most 200 directly entity-linked active canonical
  answers and marks version drift transactionally.
- Answer Tests can run an explicitly linked release check.
- Rollback creates a governed proposal and never overwrites a live answer.
- Current changelog publishing creates and activates the release in one attempt;
  there is no owner impact-review pause before activation.

## Proposal Matrix

| Proposal | Status | Decision |
|---|---|---|
| Preventive canonical-answer review | Missing and valuable | Admit as the bounded pre-activation preview. |
| Release-scoped critical tests | Implemented separately | Compose current proof into preview; do not create another test engine. |
| Release and changelog separation | Implemented | Preserve exact dependency and private-draft boundary. |
| Immutable release history | Implemented | Preserve. |
| Individual change units | Not justified | Validate whether founders need more granularity than changed entities before adding authoring and persistence. |
| Article/procedure/surface dependency queue | Unverified | Mapping completeness and false-positive cost require customer validation. |
| One-hop graph propagation | Not admitted | Start with direct governed entity bindings only. |
| Support-readiness states and blockers | Rejected | They imply broader dependency completeness than the system can prove. |
| Risk acceptance lifecycle | Rejected | This becomes release/project management. |
| Approved-pending-effective answer versions | Rejected for this pass | It changes canonical authority and scheduling semantics. |
| Scheduled truth activation | Rejected for this pass | Requires separate failure, suppression, rollback, and retrieval design. |
| Known-stale answer suppression | Separate runtime decision | Do not alter retrieval from a changelog feature review. |
| Post-release friction attribution | Validation only | Existing friction summaries do not establish causality. |
| Release Guard summary document | Rejected | Current list/detail access does not justify another summary without telemetry. |
| CI/CD deployment gate | Rejected | Answerlattice does not own deployment. |

## Exact Later Code Scope

1. Strict `preview_impact` release action.
2. Shared direct affected-answer projector for preview and activation.
3. Bounded linked Answer Tests proof projection.
4. Deterministic impact fingerprint.
5. Explicit owner review between create and activate.
6. Transaction-current fingerprint enforcement at activation.
7. Private/no-store responses, exact permission and workspace scope, rate
   limiting, response-size limits, idempotency, and emulator proof.
8. No new Firestore document family.

## Validation-Only Scope

- atomic change units;
- article, procedure, and product-surface dependency expansion;
- release-correlated friction comparison;
- owner evidence that a preview changes release behavior and prevents stale
  answer exposure.

## Final Decision

Feature 4 remains part of Releases and Changelog plus Answer Tests and Drift
Governance. The bounded pre-activation preview is justified because it converts
the current reactive drift marking into a preventive founder decision without
creating a general release-management system.
