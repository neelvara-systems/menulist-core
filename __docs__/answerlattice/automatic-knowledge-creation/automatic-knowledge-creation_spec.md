# Automatic Knowledge Creation - Specification

> **Status:** Implemented and locally hardened
> **Last verified:** 2026-07-18

## Problem

Repeated tickets, negative chat outcomes, escalations, and recurring fallbacks reveal support friction, but they do not establish the correct product answer. A solo founder needs the system to organize that evidence and prepare review work without silently turning observed conversation into product truth.

## Required Outcome

For an admitted entity-scoped signal cluster, Answerlattice may create a mutation proposal and prepare a draft. The founder must be able to inspect the reason, evidence summary, target answer, proposed content, and review state before a server-owned action changes canonical truth.

## Functional Requirements

1. Signal admission is tenant scoped, append only, bounded, sanitized, and feature flagged.
2. Reused persistent signal identities are accepted only when the stored payload fingerprint matches.
3. Signal mutation fails closed when its bounded evidence window is saturated.
4. Clustering uses resolved product entity identity; unresolved signals are not mutated into truth.
5. Existing pending proposals prevent duplicate work for the same governed target.
6. Proposal creation remains deterministic where a stable source request exists.
7. Draft generation supports `new_answer_required` and `content_refinement` only.
8. Draft generation is capped at ten successful drafts per tenant scheduler run.
9. Draft claim leases prevent concurrent duplicate provider work and allow recovery after expiry.
10. Invalid, missing, or unparsable model output marks the draft failed; it does not publish or remove the proposal.
11. The review UI must call model-derived values an extractor or signal score, not answer confidence or accuracy.
12. Approval, rejection, and implementation are server owned and audited.
13. Impact tracking compares like-for-like 14-day pre/post signal windows and fails closed if a window exceeds its bound.

## Human Review Requirements

The reviewer must confirm:

- the canonical question and intended user job;
- the product entity and target answer;
- the factual content and missing caveats;
- plan, role, state, region, and version applicability;
- evidence and citations where material;
- whether the proposal should create, refine, scope, or version an answer.

## Non-Goals

- Automatic publication or approval.
- Treating ticket repetition as verified truth.
- Generic document generation.
- Semantic clustering infrastructure for its own sake.
- A replacement help desk or ticketing system.
- A single opaque answer-quality score.

## Success Measures

- Median proposal-to-reviewed-answer time.
- Percentage of priority gaps with an approved canonical answer.
- Draft edit and rejection rates.
- Repeated unresolved-question rate after implementation.
- Human correction rate.
- Like-for-like pre/post support-signal change.
- Stale or invalid draft blocked before approval.

## Rejection Conditions

Do not expand automatic drafting if real customer tests show that review effort is not lower than authoring from scratch, generated drafts frequently require factual reconstruction, or proposal volume creates more maintenance work than it removes.
