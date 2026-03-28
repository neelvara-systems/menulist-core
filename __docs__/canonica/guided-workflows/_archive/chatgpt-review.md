# Canonica — Guided Workflows: ChatGPT Feedback Review

> **Date:** 2026-03-08
> **Source:** ChatGPT review of Cascade's implementation design docs
> **Reviewer:** Cascade (against codebase reality)
> **Overall ChatGPT Rating:** 9/10 (their words)
> **Cascade Assessment:** Architecture confirmed strong. 2 small additions accepted. 1 rejected.

---

## Feedback Summary

| # | ChatGPT Point | Verdict | Action |
|---|---|---|---|
| 1 | Embedding procedures in canonical answers is correct | ✅ CONFIRMED | Already in design |
| 2 | No intent collection is correct | ✅ CONFIRMED | Already in design |
| 3 | Fixed action vocabulary is correct | ✅ CONFIRMED | Already in design |
| 4 | Max 12 steps is correct | ✅ CONFIRMED | Already in design |
| 5 | Linear steps only is correct | ✅ CONFIRMED | Already in design |
| 6 | UI Target as string is correct simplification | ✅ CONFIRMED | Already in design |
| 7 | Deferred deduplication is correct | ✅ CONFIRMED | Already in design |
| 8 | Deferred AI authoring is correct | ✅ CONFIRMED | Already in design |
| 9 | **Missing: procedureId** | ⚠️ PARTIALLY ACCEPTED | Added `procedureSlug` inside `content.procedure` (not top-level `procedureId`) to avoid creating separate procedure identity system. Lightweight, additive. |
| 10 | **Missing: Procedure drift detection** | ❌ REJECTED | Already exists. `productBinding.lastValidatedInVersion` on every canonical answer handles drift for ALL answer types including procedures. ChatGPT was unaware of existing drift architecture. |
| 11 | **Missing: Procedure coverage metrics** | ✅ ACCEPTED (lightweight) | `answerType` field makes this queryable. Coverage KPI can filter by type. No new collection needed. |
| 12 | ChatGPT proposes `entityId` + `intent` on answer | ❌ REJECTED | Canonica uses `scope.entityIds[]` (multiple entities). ChatGPT doesn't know Canonica's actual schema. |
| 13 | ChatGPT proposes `procedureId` at top level | ❌ REJECTED | `procedureSlug` inside procedure object is sufficient. Top-level ID creates separate identity system that contradicts "canonical answer IS the atomic unit" principle. |

---

## ChatGPT Accuracy for This Feature

**~55% on architecture decisions** — Core concept (structured steps) was correct, but almost all collection/storage proposals were wrong for Canonica's embedded model. ChatGPT designed for a generic system; Canonica's approach is superior for Firebase cost discipline.

**~90% on validation of our design** — ChatGPT correctly confirmed that our architecture decisions were sound. The "9/10" rating is reasonable.

**Key pattern:** ChatGPT is good at validating existing designs but proposes generic solutions when designing from scratch without codebase context.
