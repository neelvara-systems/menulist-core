# Canonica — AI Failure Escalation

> **Status:** COMPLETE — All 6 capability blocks implemented. Flag OFF by default.
> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Feature Flag:** `ENABLE_CANONICA_AI_ESCALATION`
> **Expansion Item:** #8 in `canonica-expansion-tracker.md`
> **Tier:** A — Must exist for ICP adoption

---

## What This Is

A controlled AI failure capture pipeline that detects when AI cannot reliably answer a user query, offers a structured escalation path to human support, and captures rich debugging context (retrieval logs, entity resolution trace, conversation transcript) to make the ticket immediately actionable.

**This is NOT:**

- A live chat handoff system (no real-time agent routing)
- A generic ticketing system (that already exists)
- A sentiment analysis engine (out of scope for v1)

**This IS:**

- An escalation detection layer inside the search pipeline
- A context-enriched ticket creation flow (AI failure → pre-filled ticket)
- A debugging capture system for AI retrieval failures
- A signal emitter that feeds the mutation engine (ticket → knowledge loop)

---

## Position Inside Canonica

```
User Query
    ↓
coreSearch() — src/lib/search/searchCore.ts
    ↓
┌──────────────────────────────────────────┐
│ Stage 4: Canonical Retrieval             │
│ Stage 5: RAG Fallback                    │
│ Stage 7: Answer Generation               │
│                                          │
│   → NEW: Escalation Detection Layer      │
│     (confidence check, entity failure,   │
│      repeated failure, explicit request) │
│                                          │
│   → Returns escalation metadata in       │
│     CoreSearchResult                     │
└──────────────────────────────────────────┘
    ↓
Frontend (help chat / widget)
    ↓
┌──────────────────────────────────────────┐
│ Escalation UI                            │
│ - "Still need help?" button              │
│ - Pre-filled ticket modal                │
│ - Context auto-attached                  │
└──────────────────────────────────────────┘
    ↓
Ticket Created (existing ticket DAL)
    ↓
┌──────────────────────────────────────────┐
│ Enrichments:                             │
│ - escalationContext (retrieval debug,    │
│   entity debug, product context)         │
│ - knowledgeCandidate: true               │
│ - source: 'ai_escalation'               │
│ - ESCALATION signal emitted              │
└──────────────────────────────────────────┘
    ↓
Mutation Engine (nightly batch)
    ↓
Knowledge Improvement
```

---

## Capability Blocks (6)

| #   | Capability                | Status     | Codebase Reality                                                                      |
| --- | ------------------------- | ---------- | ------------------------------------------------------------------------------------- |
| 43  | Escalation Trigger Logic  | 🟡 PARTIAL | `ESCALATION` signal type exists but is NEVER emitted. No triggers in search pipeline. |
| 44  | Ticket Creation Interface | 🟡 PARTIAL | Full ticket CRUD exists. No AI-to-ticket flow.                                        |
| 45  | Contextual Ticket Payload | 🔴 MISSING | `CanonicaContextPayload` exists but not attached to tickets.                          |
| 46  | Transcript Capture        | 🟡 PARTIAL | Conversations in `chatSessions`. Not linked to escalation tickets.                    |
| 47  | Retrieval Log Capture     | 🔴 MISSING | Performance logs exist but no structured retrieval debug on tickets.                  |
| 48  | Entity Match Debug Info   | 🔴 MISSING | Entity scoring is internal to retrieval. Not exposed for debugging.                   |

---

## Documents in This Folder

| File                                      | Audience        | Purpose                                        |
| ----------------------------------------- | --------------- | ---------------------------------------------- |
| `README.md`                               | Everyone        | Index, architecture overview, status           |
| `ai-failure-escalation_spec.md`           | CEO/PM          | Business requirements, user stories            |
| `ai-failure-escalation_impl.md`           | Developers      | Technical blueprint, data model, API contracts |
| `ai-failure-escalation_firebase.md`       | Developers      | Firestore operations, cost analysis            |
| `ai-failure-escalation_marketing.md`      | Sales/Marketing | Pitch deck, competitive positioning            |
| `ai-failure-escalation_website.md`        | Public          | Landing page content                           |
| `ai-failure-escalation_helpdoc.md`        | Customers       | Help documentation                             |
| `ai-failure-escalation_mobile-support.md` | Developers      | Mobile admission test + assessment             |

---

## Key Architecture Decisions

1. **Inline storage, not Cloud Storage** — At Canonica's scale, escalation debug data (~800 bytes) fits inline on the ticket document. No Cloud Storage buckets needed.
2. **Reuse existing ticket system** — No new collection for escalation tickets. Enriched `SupportTicketType` with `escalationContext` field.
3. **Fire-and-forget signal emission** — Same pattern as ticket creation signals. Non-blocking.
4. **No Pub/Sub** — Canonica uses direct Firestore writes. No GCP message queue infrastructure.
5. **No live agent routing** — Canonica is async-first. Tickets go to founder inbox.
6. **Retrieval debug only on escalation** — Do NOT log retrieval debug for every query. Only when escalation triggers.
7. **14-day debug data lifecycle** — Retrieval logs and entity debug are useful for debugging, not permanent records.

---

## Dependencies

- Existing: `coreSearch()` pipeline, ticket DAL, `emitCanonicaSignal()`, `CanonicaContextPayload`
- Requires: `ENABLE_CANONICA_CANONICAL_ANSWERS` (for canonical confidence)
- Feeds: System 9 (Ticket → Knowledge Loop) via `knowledgeCandidate` tag

---

## ChatGPT Accuracy Assessment

| Claim                            | Accuracy | Notes                                                           |
| -------------------------------- | -------- | --------------------------------------------------------------- |
| Multi-signal escalation triggers | ✅ 90%   | Valid. 5 trigger types confirmed by industry research.          |
| Pub/Sub event architecture       | ❌ 20%   | Wrong for Canonica. We use fire-and-forget Firestore writes.    |
| Cloud Storage for transcripts    | ❌ 30%   | Overkill. Conversations already in chatSessions.                |
| Cloud Storage for retrieval logs | ❌ 30%   | Overkill at Canonica scale. Inline on ticket is sufficient.     |
| Pre-filled structured tickets    | ✅ 95%   | Core insight. This is exactly what developers need.             |
| "< 2 seconds" latency target     | ❌ 10%   | Not applicable. Canonica is async, not live handoff.            |
| `knowledgeCandidate` tagging     | ✅ 100%  | Excellent. Direct feed to System 9 (Ticket → Knowledge).        |
| Entity debug info inline         | ✅ 85%   | Correct decision to store inline (small payload).               |
| 100K convos/day scale model      | ❌ 15%   | Canonica is orders of magnitude smaller. Cost model irrelevant. |

**Overall ChatGPT accuracy for System 8: ~55%**
Core concepts valid. Infrastructure suggestions wrong for Canonica's architecture and scale.
