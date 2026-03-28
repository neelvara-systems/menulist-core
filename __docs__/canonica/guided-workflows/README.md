# Canonica — Guided Workflows (Structured Procedure Answers)

> **Status:** DESIGNED — Ready for Implementation
> **Version:** 1.0.0
> **Created:** 2026-03-08
> **Last Updated:** 2026-03-08
> **Expansion Item:** #2 (from canonica-expansion-tracker.md)
> **Feature Flag:** `ENABLE_CANONICA_GUIDED_WORKFLOWS`
> **Dependencies:** #1 Context-Aware Support (IMPLEMENTED)
> **Doctrine Compliance:** ✅ Additive metadata field on canonical answer (Freeze §2)

---

## Summary

Converts Canonica's canonical answers from text-only explanations into structured, executable procedures for procedural ("how to") support queries. Most SaaS support load comes from Class 3 queries ("how do I do X?"), which require deterministic step-by-step instructions — not paragraphs.

This feature adds an `answerType` discriminator and an embedded `procedure` structure to the existing `CanonicaCanonicalAnswer` type. No new Firestore collections. No new reads. Same 2-read retrieval path.

---

## Key Architecture Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **No separate `procedures` collection** | Canonical answer IS the atomic knowledge unit. Separate collection breaks "one authoritative answer" invariant + adds reads |
| 2 | **No separate `warnings`/`prerequisites` collections** | Scope system (planIds/roleIds/stateIds) already handles prerequisites. Embedding in answer = zero extra reads |
| 3 | **No UI Target Map collection** | Step `target` is a simple string. Future registry can be additive without breaking structure |
| 4 | **`answerType` as discriminator field** | Backward compatible: defaults to `'explanation'` for all existing answers |
| 5 | **Steps embedded in answer document** | Maintains 2-read retrieval path (search index + answer) |
| 6 | **Fixed action vocabulary as TypeScript const** | Zero Firestore reads. Enforced at write-time |
| 7 | **Max 12 steps per procedure** | Cognitive load boundary. Exceeding = split into multiple answers |
| 8 | **Linear steps only (no branching)** | v1 simplicity. Use prerequisites for conditional logic |
| 9 | **Same mutation pipeline for procedures** | Procedure answers are canonical answers. Same governance applies |
| 10 | **No separate intent mapping collection** | Existing entity + intent resolution already handles routing |

---

## Documents

| Document | Audience | Purpose |
|----------|----------|---------|
| [README.md](./README.md) | Everyone | Index + architecture decisions |
| [guided-workflows_spec.md](./guided-workflows_spec.md) | CEO/PM/Clients | Business requirements, user stories |
| [guided-workflows_impl.md](./guided-workflows_impl.md) | Developers | Technical blueprint, data model, file changes |
| [guided-workflows_firebase.md](./guided-workflows_firebase.md) | Developers/Ops | Firebase cost tracking, read/write analysis |
| [guided-workflows_marketing.md](./guided-workflows_marketing.md) | Sales/Marketing | Positioning, pitch points |
| [guided-workflows_website.md](./guided-workflows_website.md) | Marketing | Landing page content |
| [guided-workflows_helpdoc.md](./guided-workflows_helpdoc.md) | Customers | How to use guided workflows |
| [guided-workflows_mobile-support.md](./guided-workflows_mobile-support.md) | Developers | Mobile admission test + assessment |

---

## Feature Rejection Filter (Doctrine IX)

| Question | Answer |
|----------|--------|
| Does this increase Canonical Coverage? | ✅ Yes — procedure answers cover Class 3 queries that text answers handle poorly |
| Does this strengthen Release Binding? | ✅ Yes — procedure steps reference product versions, drift when UI changes |
| Does this improve Drift Detection? | ✅ Yes — structured steps are version-diffable, drift-detectable |
| Does this reduce Fallback Reliance? | ✅ Yes — deterministic procedure answers reduce RAG fallback for how-to queries |
| Does this reinforce Ontology Quality? | ✅ Yes — procedures are entity-bound, strengthen entity coverage |

**Verdict:** PASSES all 5 filters.

---

## Expansion Axis Alignment (Doctrine VII)

- **Canonical coverage increase** ✅ — Procedures increase answer quality for procedural queries
- **Deterministic retrieval performance** ✅ — Structured steps = no generation needed for known procedures
- **Ontology depth** ✅ — Procedures bind to entities, enriching the ontology

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-08 | 1.0.0 | Initial design from ChatGPT conversation + Cascade codebase audit + external research |
