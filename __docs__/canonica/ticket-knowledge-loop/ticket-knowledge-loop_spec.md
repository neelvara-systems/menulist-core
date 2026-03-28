# Ticket → Knowledge Loop — Product Specification

> **Status:** DOCUMENTED — Ready for Implementation
> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Audience:** CEO, PM, Clients
> **Feature Flag:** `ENABLE_CANONICA_TICKET_KNOWLEDGE`

---

## §1 — Executive Summary

### Problem

Support tickets contain the highest-signal knowledge about real user problems and real product confusion. But this knowledge dies in ticket archives. Knowledge bases that don't learn from support interactions stagnate and become outdated, causing:

- Repeat tickets for the same problems
- AI answers that miss common issues
- Manual, unsustainable knowledge maintenance
- Growing support load over time

### Solution

An automated pipeline that detects when resolved tickets cluster around the same product entity, extracts the resolution pattern, and proposes a canonical answer draft for founder review.

### Business Impact (Industry Data)

- **Intercom (May 2025):** 5,000+ suggestions approved in first month, 60% approval rate, 1.2% absolute resolution rate improvement, 100k+ conversations served by approved suggestions
- **Industry benchmark:** Companies implementing ticket→knowledge loops see 30-40% reduction in repeat support volume over 12 months

### Core Principle

**Accumulation over extraction.** Don't extract from individual tickets. Wait for multiple tickets about the same topic, cross-verify the resolution, then propose knowledge. This prevents noise and ensures quality.

---

## §2 — User Stories

### US-1: Automatic Knowledge Gap Detection

**As** a SaaS founder using Canonica,
**I want** the system to automatically detect when resolved tickets reveal knowledge gaps,
**So that** my knowledge base grows from real support interactions without manual effort.

**Acceptance criteria:**
- System detects resolved tickets that cluster around the same entity (3+ tickets required)
- Only tickets with substantive resolutions are considered (not "closing as duplicate" or one-word answers)
- Detection runs in nightly batch (not real-time)

### US-2: AI-Generated Draft from Ticket Resolutions

**As** a SaaS founder,
**I want** the system to generate a draft canonical answer from the clustered ticket resolutions,
**So that** I can review and approve knowledge instead of writing it from scratch.

**Acceptance criteria:**
- Draft includes: title, structured summary, detailed explanation
- Draft cites the number of source tickets and entity context
- Draft appears in the existing mutation proposal review queue
- I can edit before approving, or reject entirely

### US-3: One-Click Knowledge Publication

**As** a SaaS founder,
**I want** to approve a ticket-derived draft with one click,
**So that** it becomes a canonical answer that improves AI responses immediately.

**Acceptance criteria:**
- Approve → creates canonical answer + search index entry (already built via Item #4)
- Source tickets are linked for provenance
- AI starts using the new answer in the next query

### US-4: Deduplication Protection

**As** a SaaS founder,
**I want** the system to NOT propose duplicate articles,
**So that** my knowledge base stays clean and focused.

**Acceptance criteria:**
- System checks existing canonical answers before proposing
- System checks existing pending proposals before proposing
- Duplicate ticket clusters merge into existing proposals (increment occurrence count)

---

## §3 — Scope

### In Scope

- Detect resolved ticket clusters (3+ tickets per entity, configurable)
- Extract problem/resolution from ticket conversations using AI
- Generate structured draft canonical answers
- Route to existing founder approval queue
- Track provenance (which tickets generated which knowledge)
- Deduplication against existing canonical answers and pending proposals
- Configurable thresholds (minimum tickets, confidence, conversation length)

### Out of Scope (Permanent)

- Real-time per-ticket extraction (accumulation-only architecture)
- Auto-publishing without founder approval
- Support analytics dashboards
- Agent performance tracking
- Ticket merging or linking UI
- Email/notification on new knowledge suggestions
- Resolution quality scoring dashboards

### Out of Scope (Deferred)

- Edit suggestions for existing canonical answers (v2 — after Create suggestions prove value)
- Multi-language ticket extraction (v2 — when multi-language KB is active)
- Cross-entity resolution extraction (v2 — when Knowledge Graph Exploitation #11 is built)

---

## §4 — Pipeline Overview

```
Ticket status → Resolved/Closed
    ↓
Signal emitter fires 'ticket' signal with resolution metadata
(subject, resolution messages, entity binding, conversation length)
    ↓
[Nightly Batch] Signal clustering by entity (EXISTING)
    ↓
[NEW] Ticket Resolution Accumulation Check
- Does this entity have 3+ resolved tickets with substantive resolutions?
- Are there enough resolution messages to extract from?
    ↓
[NEW] Resolution Extraction (Gemini)
- Extract problem statement + resolution steps + entities from multiple conversations
- Cross-verify resolution across tickets
    ↓
[NEW] Deduplication Check (3 stages)
1. Entity match → existing canonical answer? → skip or propose EDIT (v2)
2. Pending proposal for same entity? → merge, increment count
3. Post-generation similarity check against existing answers
    ↓
[EXISTING] Mutation Proposal created (draftSource: 'ticket_resolution')
    ↓
[EXISTING] AI Draft Generation (Item #4 infrastructure)
    ↓
[EXISTING] Founder Review Queue → Approve/Reject/Edit
    ↓
[EXISTING] approveDraftAsCanonicalAnswer() → Canonical Answer + Search Index
```

---

## §5 — Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `minTicketsForCandidate` | 3 | Minimum resolved tickets per entity before extraction |
| `minResolutionLength` | 50 | Minimum characters in resolution messages to consider substantive |
| `maxTicketsToProcess` | 50 | Max ticket clusters to process per nightly run |
| `maxDraftsPerRun` | 5 | Max draft proposals to generate per nightly run (LLM cost cap) |
| `maxResolutionExamples` | 5 | Max ticket resolutions to include in draft generation prompt |
| `confidenceThreshold` | 0.7 | Minimum confidence to create proposal |

---

## §6 — Governance Rules

1. **Suggestion-only** — Drafts are PROPOSALS. Never auto-published.
2. **Accumulation required** — No single-ticket extraction. Minimum 3 tickets.
3. **Entity binding mandatory** — Tickets without entity binding are excluded.
4. **Founder is final authority** — Approve, edit, or reject. No override.
5. **Provenance tracked** — Every canonical answer records source ticket IDs.
6. **Cost-capped** — Max 5 drafts per nightly run (LLM cost discipline).
7. **Idempotent** — Running the nightly step twice produces identical results.
8. **Non-blocking** — Failures in extraction don't affect other nightly steps.

---

## §7 — Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Proposal approval rate | >50% | Approved proposals / total proposals |
| Knowledge coverage increase | Measurable | Canonical coverage KPI trend (already tracked) |
| Repeat ticket reduction | 10-20% after 6 months | Signal count trend per entity post-approval |
| Draft quality | Minimal edits | Track if founder modifies draft before approval |

---

## §8 — Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Low ticket volume (< threshold) | Medium | Variable triggering — lower threshold for low-volume tenants |
| Poor resolution quality | Medium | Minimum conversation length filter + AI confidence scoring |
| LLM hallucination in drafts | High | Founder review mandatory. Draft is suggestion, not truth |
| Duplicate proposals | Low | 3-stage deduplication (entity, pending proposal, post-generation) |
| Cost amplification | Medium | Max 5 drafts/run cap + batch processing |
| Stale proposals unreviewed | Low | Candidate lifecycle already handles TTL in nightly batch |
