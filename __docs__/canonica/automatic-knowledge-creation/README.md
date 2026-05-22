# Canonica — Automatic Knowledge Creation

> **Status:** DOCUMENTED — Ready for Implementation
> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Feature Flag:** `ENABLE_CANONICA_AUTO_KNOWLEDGE` (ready-to-use default ON; capped and human-reviewed)
> **Expansion Item:** #4 in canonica-expansion-tracker.md
> **Doctrine Compliance:** ⚠️ CAREFUL — AI drafts are PROPOSALS only, never auto-published

---

## Quick Summary

Automatic Knowledge Creation is the **last-mile enhancement** to Canonica's existing signal mutation pipeline. It transforms mutation proposals from "todo items" into "review-and-publish" items by adding AI-generated draft content to `new_answer_required` proposals.

**What this feature IS:**
- AI-generated draft canonical answers attached to existing mutation proposals
- Structured drafts following `CanonicalAnswerSchema` (title, summary, steps, warnings, prerequisites)
- Founder reviews draft → edits → approves → canonical answer created
- Knowledge gap metrics surfaced on governance dashboard

**What this feature is NOT:**
- A ticket system (Canonica observes signals, does not manage tickets)
- A support analytics dashboard
- An auto-publishing system (doctrine: "LLM assists, never becomes the control plane")
- A new clustering engine (existing entity-based clustering is correct)

---

## Documents

| Document | Audience | Purpose |
|----------|----------|---------|
| [README.md](./README.md) | Everyone | This file — index and navigation |
| [_spec.md](./automatic-knowledge-creation_spec.md) | CEO/PM | Business requirements, user stories, acceptance criteria |
| [_impl.md](./automatic-knowledge-creation_impl.md) | Developers | Technical blueprint, architecture, file structure, API contracts |
| [_firebase.md](./automatic-knowledge-creation_firebase.md) | Developers | Firestore operations, cost model, indexes |
| [_marketing.md](./automatic-knowledge-creation_marketing.md) | Sales/Marketing | Pitch points, competitive positioning |
| [_website.md](./automatic-knowledge-creation_website.md) | Public | Landing page content, SEO |
| [_helpdoc.md](./automatic-knowledge-creation_helpdoc.md) | Customers | Help documentation for founders |
| [_mobile-support.md](./automatic-knowledge-creation_mobile-support.md) | Developers | Mobile assessment (4-gate test) |

---

## Architecture Overview

```
Existing Pipeline (ALREADY BUILT):
Signal Sources → signalEmitter.ts → canonica_signal_events
    ↓
Nightly CF → clusterSignalsByEntity() → determineMutationType()
    ↓
new_answer_required proposal → canonica_mutation_proposals (suggestedChange: {})
    ↓
Governance UI → MutationProposalReview → Founder writes answer manually

NEW (This Feature):
Signal Sources → signalEmitter.ts → canonica_signal_events
    ↓
Nightly CF → clusterSignalsByEntity() → determineMutationType()
    ↓
new_answer_required proposal → AI Draft Generator (Gemini) → proposal WITH draft content
    ↓
Governance UI → MutationProposalReview → Founder REVIEWS draft → edits → approves
    ↓
Canonical Answer created from approved draft
```

Current governance UI coverage:
- Generated drafts appear inside the Signal-to-Knowledge Queue.
- Product owners can publish a generated draft as a canonical answer after editing.
- Product owners can explicitly generate/regenerate a draft from the queue; this is manual, feature-flagged by `ENABLE_CANONICA_AUTO_KNOWLEDGE`, and uses one AI request per click.

---

## Key Decisions (Cascade, NOT ChatGPT)

| Decision | ChatGPT Said | Cascade Decision | Rationale |
|----------|-------------|-----------------|-----------|
| Clustering approach | Semantic embedding + Qdrant | Entity-based (existing) | Canonica doctrine: "Entities define structure" — deterministic, $0 cost |
| New collections | `supportSignals`, `clusters`, `knowledgeProposals` | NONE needed | All infrastructure already exists in 9 Canonica collections |
| Vector DB | Qdrant self-host | NOT needed | Entity-based clustering requires no embeddings |
| Signal retention | 30 days | 12 months | Canonica doctrine mandates 12-month TTL |
| Draft generation | Full article auto-generation | Structured skeleton only | Doctrine: "LLM assists, never becomes the control plane" |
| Batch frequency | Every 6-15 hours | Nightly (3:00 AM UTC) | Aligns with existing canonicaNightly scheduler |
| New feature flag | Multiple | Single: `ENABLE_CANONICA_AUTO_KNOWLEDGE` | Canonica pattern: one flag per expansion item |

---

## Dependencies

- **Requires:** `ENABLE_CANONICA_SIGNAL_MUTATION: true` (Pillar 4)
- **Requires:** `ENABLE_CANONICA_CANONICAL_ANSWERS: true` (Pillar 2)
- **Enhances:** Expansion Item #9 (Ticket → Knowledge Conversion) feeds into this
- **Enhanced by:** Expansion Item #8 (AI Escalation Path) generates more signals

---

## ChatGPT Accuracy Assessment

**Overall: ~50%** — ChatGPT correctly identified the problem (documentation decay, need for self-improving KB) but was ~75% wrong on the solution architecture because it was unaware of Canonica's existing entity-based infrastructure.

| What ChatGPT Got Right | What ChatGPT Got Wrong |
|------------------------|----------------------|
| Documentation decays without feedback loop | Assumed embedding-based clustering needed |
| Founder review must be mandatory | Proposed 3 new Firestore collections (unnecessary) |
| Batch processing over real-time | Suggested external vector DB (Qdrant) |
| Gap detection from signal patterns | Proposed separate clustering engine |
| Draft generation saves founder time | 30-day retention (should be 12 months) |

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-09 | 1.0.0 | Initial documentation from ChatGPT conversation + codebase audit + external research |
