# Automatic Knowledge Creation — Specification

> **Status:** DOCUMENTED — Ready for Implementation
> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Audience:** CEO / PM / Clients

---

## §1 — Problem Statement

Knowledge bases decay. Products evolve. Documentation falls behind. Support tickets increase.

In the current Canonica system:
- Signal events are collected (ticket, chat_negative, escalation)
- Nightly batch clusters signals by entity
- When an entity has friction signals but NO canonical answer → a `new_answer_required` mutation proposal is created
- **But the proposal is empty** — `suggestedChange: {}` — the founder must write the answer from scratch

This creates a bottleneck: the system detects knowledge gaps perfectly, but the founder must do 100% of the writing work.

**The gap:** The last mile between "we know what's missing" and "here's a draft to review."

---

## §2 — Solution Overview

Add AI-generated draft content to `new_answer_required` mutation proposals. Transform the founder workflow from:

**Before:** "34 signals about API Keys — please write an answer" (todo item)
**After:** "34 signals about API Keys — here's a draft answer to review" (review-and-publish item)

---

## §3 — User Stories

### US-1: AI Draft on New Answer Proposal
**As a** SaaS founder using Canonica,
**I want** the system to generate a draft canonical answer when it detects a knowledge gap,
**So that** I can review and publish documentation instead of writing from scratch.

**Acceptance Criteria:**
- When a `new_answer_required` proposal is created (nightly batch or recurring fallback), the system generates a draft
- Draft follows `CanonicalAnswerSchema`: title, structuredSummary, detailedExplanation, edgeCases, constraints
- If `ENABLE_CANONICA_GUIDED_WORKFLOWS` is on, draft includes procedure steps when appropriate
- Draft is stored on the proposal's `suggestedChange` field
- Draft is visible in the MutationProposalReview UI
- Draft generation failure does NOT block proposal creation (graceful degradation)

### US-2: Founder Reviews and Publishes Draft
**As a** SaaS founder,
**I want** to review, edit, and approve an AI-generated draft,
**So that** the answer becomes a canonical answer after my review.

**Acceptance Criteria:**
- Governance UI shows the draft content alongside signal evidence (signal count, example questions, entity context)
- Founder can edit any field before approving
- "Approve" creates a real canonical answer from the draft
- "Reject" marks the proposal as rejected (no answer created)
- Published answers have `validation.validationSource: 'signal_cluster'`

### US-3: Knowledge Gap Metrics
**As a** SaaS founder,
**I want** to see how many knowledge gaps exist and how many have been resolved,
**So that** I can track documentation completeness over time.

**Acceptance Criteria:**
- Governance dashboard shows: total proposals, pending drafts, approved, rejected
- Coverage KPI already exists — this extends it with proposal-specific metrics
- No new dashboard required — extends existing governance hub

### US-4: Content Refinement Drafts
**As a** SaaS founder,
**I want** the system to suggest improvements for existing answers that have high friction signals,
**So that** I can improve unclear documentation.

**Acceptance Criteria:**
- When a `content_refinement` proposal is created, the system generates a suggested improvement
- Improvement references the existing answer content + signal evidence
- Founder sees side-by-side: current answer vs suggested improvement
- This is lower priority than US-1 (new answers) — implementation can be deferred

---

## §4 — Scope

### In Scope (v1)
1. AI draft generation for `new_answer_required` proposals
2. Draft storage on existing `suggestedChange` field
3. Draft visible in governance UI
4. Approve draft → create canonical answer flow
5. Feature flag: `ENABLE_CANONICA_AUTO_KNOWLEDGE`
6. Gemini 2.5 Flash for generation (existing AI infrastructure)

### Out of Scope (v1)
1. Content refinement drafts (US-4) — deferred to v2
2. Auto-publish (violates doctrine)
3. New Firestore collections (use existing proposal docs)
4. External integrations (Slack, Linear, etc.) — separate expansion item #7
5. Semantic embedding clustering — entity-based clustering is correct
6. Support analytics dashboards — Canonica is infrastructure, not analytics
7. Ticket management UI — Canonica observes signals, not manages tickets

---

## §5 — Doctrine Compliance

### ⚠️ Critical Doctrine Rules

| Doctrine | Rule | Compliance |
|----------|------|------------|
| Non-Goals §III | "LLM assists the control plane. It never becomes the control plane." | ✅ AI generates DRAFTS. Human approves. Never auto-publish. |
| Freeze §2 | "Additive metadata fields on existing schemas allowed" | ✅ Draft content uses existing `suggestedChange` field |
| Freeze §2 | "No new collections without RFC" | ✅ Zero new collections |
| Core Doctrine §5 | "Signals propose mutations. Humans approve." | ✅ Draft is a richer proposal, still requires human approval |
| Architecture §6 | "All derived state recomputable from primitives" | ✅ Draft is computed from signals + entities + KB context |

### Guardrails
1. **No auto-publish** — Drafts are always `pending_review`. Never skip human approval.
2. **No hallucination risk** — Draft generation uses signal examples + existing KB + entity context. No invented features.
3. **Graceful degradation** — If Gemini fails, proposal is created without draft (current behavior). System never blocks.
4. **Cost cap** — Draft generation runs max 10 proposals per nightly batch. Estimated cost: <$0.02/run.

---

## §6 — Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Draft approval rate | >60% of drafts approved (with edits) | Proposal status tracking |
| Time to publish | <5 minutes from draft to published answer | Compare draft timestamp to approval timestamp |
| Knowledge gap closure | Pending proposals decrease over time | Proposal count trend |
| Founder effort reduction | 80% less writing time per new answer | Qualitative feedback |

---

## §7 — Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| AI generates incorrect steps | Medium | Founder review is mandatory. Draft is clearly marked as AI-generated. |
| Draft quality too low | Medium | Use signal examples + entity context + existing KB for grounding. Quality improves with more KB content. |
| Gemini cost spike | Low | Max 10 drafts/nightly run. Each draft ~100 tokens input, ~500 tokens output. Cost: ~$0.001 per draft. |
| Founder ignores drafts | Low | Show impact score (signal count). Weekly summary of pending drafts. |
| Doctrine violation | High | Hard-coded: no auto-publish path exists in code. Feature flag gated. |
