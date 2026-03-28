# AI Failure Escalation — Specification

> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Audience:** CEO, PM, Product
> **Feature Flag:** `ENABLE_CANONICA_AI_ESCALATION`

---

## §1 — Problem Statement

When Canonica's AI cannot reliably answer a user query, there is **no structured path** from AI failure to human support. Currently:

1. AI gives a low-quality RAG answer or empty result
2. User sees generic "I couldn't find relevant articles" message
3. User must **independently navigate** to the support ticket system
4. Ticket has **zero context** about what AI tried and failed
5. Founder must **manually investigate** what went wrong
6. The failure is **invisible** to the knowledge improvement pipeline

This breaks trust. SaaS founders (Canonica's ICP) expect AI to either solve the problem or **gracefully hand off** with full context.

---

## §2 — Solution Summary

Build a controlled AI failure capture pipeline with three layers:

1. **Detection** — Multi-signal escalation triggers inside the search pipeline
2. **Handoff** — "Still need help?" → pre-filled ticket with rich debugging context
3. **Learning** — Every escalation feeds the mutation engine for knowledge improvement

---

## §3 — User Stories

### US-1: End User — Soft Escalation
> As an end user asking a question in the help widget,
> when the AI gives a low-confidence answer,
> I want to see a "Still need help? Contact support" option
> so I can quickly create a ticket without re-explaining my problem.

**Acceptance:** Button appears when `escalationSuggested: true` in search response. Clicking opens pre-filled ticket form.

### US-2: End User — Hard Escalation
> As an end user asking a question,
> when the AI completely fails to find anything relevant,
> I want to be told clearly and offered to create a ticket immediately
> so I'm not stuck in a loop of useless answers.

**Acceptance:** When AI returns empty result or entity match fails, escalation prompt shown immediately (not after retry).

### US-3: End User — Explicit Escalation
> As an end user,
> when I type "talk to a human" or "create a ticket",
> I want to be immediately offered the ticket creation form
> so I can bypass the AI when I know I need human help.

**Acceptance:** Intent detection catches explicit escalation phrases. Ticket form opens with conversation context pre-attached.

### US-4: Founder — Actionable Escalation Ticket
> As a SaaS founder reviewing escalation tickets,
> I want to see the full AI debugging context (what was searched, what entities matched, what confidence score)
> so I can answer in under 30 seconds and understand why AI failed.

**Acceptance:** Ticket `escalationContext` contains: retrieval debug, entity debug, product context, conversation reference.

### US-5: Founder — Knowledge Gap Detection
> As a SaaS founder,
> I want escalation tickets to automatically feed the knowledge improvement pipeline
> so recurring AI failures become new canonical answers.

**Acceptance:** Every escalation ticket emits `ESCALATION` signal + `knowledgeCandidate: true` tag. Mutation engine clusters these.

### US-6: End User — Repeated Failure Detection
> As an end user who has asked 2+ questions with bad answers in the same session,
> I want the system to proactively offer escalation
> so I don't waste time with an AI that clearly can't help me.

**Acceptance:** After 2 low-confidence answers in the same chat session, escalation is auto-suggested.

---

## §4 — Escalation Triggers (5 Signals)

| # | Signal | Condition | Escalation Type |
|---|--------|-----------|----------------|
| S1 | Low Canonical Confidence | Canonical miss OR confidence === 'low' | Soft (suggest) |
| S2 | Entity Resolution Failure | No entity match in search index | Soft (suggest) |
| S3 | Repeated Failure | 2+ low-confidence answers in same session | Hard (prompt) |
| S4 | Explicit User Request | User types "talk to human", "create ticket", etc. | Hard (immediate) |
| S5 | RAG Low Similarity | Best vector search result < 0.5 similarity | Soft (suggest) |

**Escalation types:**
- **Soft**: AI answer is shown + "Still need help?" button below
- **Hard**: Escalation prompt is shown prominently, replacing or alongside the answer

---

## §5 — Ticket Enrichment

When an escalation ticket is created, it includes:

### Standard Fields (existing)
- `subject` — Auto-generated from user query
- `category` — Auto-detected from intent classification
- `priority` — Default "Normal" (user can change)
- `message` — User's original question

### Escalation-Specific Fields (NEW)
- `source: 'ai_escalation'` — Distinguishes from manual tickets
- `knowledgeCandidate: true` — Feeds System 9 (Ticket → Knowledge Loop)
- `escalationContext.triggerType` — Which signal triggered escalation
- `escalationContext.conversationId` — Reference to chat session
- `escalationContext.query` — The exact query that failed
- `escalationContext.productContext` — Page, feature, workflow, plan, role
- `escalationContext.retrievalDebug` — Top-5 docs + scores, canonical result
- `escalationContext.entityDebug` — Tokens, candidates, resolved entity, confidence

---

## §6 — Scope Boundaries

### In Scope (v1)
- Escalation detection in `coreSearch()` pipeline
- Escalation metadata in `CoreSearchResult`
- "Still need help?" UI in help chat
- Pre-filled ticket creation from escalation
- Retrieval debug capture on escalation
- Entity match debug capture on escalation
- `ESCALATION` signal emission
- `knowledgeCandidate` tagging

### Out of Scope (v1)
- Live agent routing / real-time handoff
- Sentiment analysis / frustration detection
- Automatic ticket priority escalation
- SLA acceleration for escalation tickets
- Widget-side escalation UI (deferred to widget phase)
- Escalation analytics dashboard (feeds into System 10 — Founder Trust Layer)

---

## §7 — Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Escalation rate | < 5% of conversations | `source: 'ai_escalation'` tickets / total conversations |
| Founder response time | < 5 minutes | Time from ticket creation to first response |
| Knowledge conversion rate | > 30% of escalations | Tickets with `knowledgeCandidate: true` that result in new canonical answers |
| Repeat escalation rate | < 10% | Same entity escalated after canonical answer was created |

---

## §8 — Dependencies & Prerequisites

| Dependency | Status | Required For |
|-----------|--------|-------------|
| `coreSearch()` pipeline | ✅ BUILT | Escalation detection |
| Ticket DAL (`src/database/tickets/`) | ✅ BUILT | Ticket creation |
| `emitCanonicaSignal()` | ✅ BUILT | Signal emission |
| `CanonicaContextPayload` | ✅ BUILT | Product context |
| `ENABLE_CANONICA_CANONICAL_ANSWERS` | ✅ BUILT (flag OFF) | Canonical confidence |
| Help chat UI | ✅ BUILT | Escalation UI |
| System 9 (Ticket → Knowledge Loop) | 🟡 PARTIAL | Knowledge conversion |

---

## §9 — Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Over-escalation floods founder inbox | High | Escalation rate cap: max 10 escalations/tenant/day |
| Debug data bloats ticket documents | Medium | Cap retrieval debug to top-5 docs, entity debug to top-3 candidates |
| Escalation UI disrupts chat flow | Medium | Soft escalation is non-intrusive button, not modal |
| Feature flag dependency chain | Low | Escalation works in degraded mode without canonical answers (S2, S5 still trigger) |
