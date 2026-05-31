# Ticket → Knowledge Loop — Feature Hub

> **Status:** IMPLEMENTED AND ENABLED WITH CAPS
> **Version:** 1.1.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-05-22
> **Feature Flag:** `ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE`
> **Expansion Tracker:** Item #9
> **Depends On:** Item #4 (Automatic Knowledge Creation) — ✅ IMPLEMENTED
> **Doctrine Check:** ✅ Allowed — converts operational data into canonical knowledge (Pillars 2+4)

---

## What This Feature Does

Converts resolved support ticket conversations into canonical knowledge. When tickets cluster around the same product entity and get resolved, the system extracts the resolution pattern and proposes a canonical answer draft for founder approval.

**The self-improving loop:**

```
Tickets resolved → Resolution extracted → Knowledge proposed → Founder approves → Better AI answers → Fewer tickets
```

## Architecture Position

This is a **surgical extension** of two existing systems — NOT a new system:

1. **Signal Mutation Engine (Pillar 4)** — Enhanced to detect ticket resolution patterns
2. **Automatic Knowledge Creation (Item #4)** — Enhanced to generate drafts from ticket resolutions

```
Existing Answerlattice Architecture:
┌──────────────────────────────────────────────────────────┐
│ Pillar 1: Product Ontology                                │
│ Pillar 2: Canonical Answer Engine                         │
│ Pillar 3: Drift Governance                                │
│ Pillar 4: Signal Mutation Engine ← ENHANCED HERE          │
│   └─ Item #4: Auto Knowledge Creation ← ENHANCED HERE    │
│ Pillar 5: API & Integration                               │
└──────────────────────────────────────────────────────────┘
```

## Key Design Decisions

| Decision                                    | Rationale                                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Zero new Firestore collections**          | Reuse existing `answerlattice_mutationProposals` + `answerlattice_signalEvents` + `answerlattice_auditLogs`    |
| **Accumulation over per-ticket extraction** | Intercom research proves: wait for 3+ tickets on same entity before extracting (prevents noise) |
| **Nightly batch processing**                | Existing nightly batch is the queue — no separate processing queue needed                       |
| **Entity-based clustering (not vector)**    | Already built in signal mutation engine — no external vector DB needed                          |
| **Suggestion-only, never auto-publish**     | Answerlattice doctrine: signals propose, humans approve                                              |
| **Additive type changes only**              | 3-year freeze compliance — new optional fields, no breaking changes                             |

## Industry Validation

**Intercom "Suggestions" (May 2025):**

- Same architecture pattern (accumulation → extraction → dedup → generation → approval)
- 60% approval rate at scale
- 1.2% absolute resolution rate improvement
- 3-layer deduplication eliminates ~31% of noise
- "Companies with <500 conversations/month get fewer suggestions" — matches our variable triggering

## New Firestore Collections

**None.** All data lives on existing collections with additive fields.

## Feature Flag

```typescript
ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE: true; // in src/config/features.ts
ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE: true; // in functions-answerlattice/src/constants/features.ts
```

Requires: `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION = true`

Current production guardrails:

- Only resolved/closed ticket signals are eligible.
- Creation signals and resolution signals use separate dedupe keys so one does not suppress the other.
- Nightly extraction waits for 3+ resolved tickets on the same entity before proposing knowledge.
- Draft generation remains capped at 5 proposals per nightly run.
- Nothing is auto-published; founders still review and approve canonical answers.

## Document Set

| Document                                                                             | Audience        | Purpose                     |
| ------------------------------------------------------------------------------------ | --------------- | --------------------------- |
| [README.md](./README.md)                                                             | All             | This hub document           |
| [ticket-knowledge-loop_spec.md](./ticket-knowledge-loop_spec.md)                     | CEO/PM          | Business requirements       |
| [ticket-knowledge-loop_impl.md](./ticket-knowledge-loop_impl.md)                     | Developers      | Technical blueprint         |
| [ticket-knowledge-loop_firebase.md](./ticket-knowledge-loop_firebase.md)             | Developers      | Firebase cost & operations  |
| [ticket-knowledge-loop_marketing.md](./ticket-knowledge-loop_marketing.md)           | Sales/Marketing | Sales collateral            |
| [ticket-knowledge-loop_website.md](./ticket-knowledge-loop_website.md)               | Marketing       | Landing page content        |
| [ticket-knowledge-loop_helpdoc.md](./ticket-knowledge-loop_helpdoc.md)               | Customers       | Help documentation          |
| [ticket-knowledge-loop_mobile-support.md](./ticket-knowledge-loop_mobile-support.md) | Engineering     | Mobile assessment           |
| [\_archive/chatgpt-review.md](./_archive/chatgpt-review.md)                          | Internal        | ChatGPT conversation review |

## ChatGPT Accuracy Assessment

**Overall: ~55%**

| Category                 | Accuracy | Details                                                                            |
| ------------------------ | -------- | ---------------------------------------------------------------------------------- |
| Pipeline concept         | ✅ 90%   | Correct that ticket→knowledge is a self-improving loop                             |
| Component design         | ⚠️ 40%   | Proposed 9+ new collections, per-ticket processing — both wrong for Answerlattice       |
| Infrastructure hardening | ⚠️ 30%   | Most "missing" components already exist in Answerlattice (idempotency, queue, dedup)    |
| Accumulation insight     | ❌ 0%    | Completely missed — Intercom's key finding. ChatGPT proposed per-ticket extraction |
| Cost awareness           | ⚠️ 50%   | Mentioned cost optimization but proposed expensive per-ticket LLM calls            |

## Key Files (Implemented)

| Component                  | Location                                                                | Status      |
| -------------------------- | ----------------------------------------------------------------------- | ----------- |
| Resolution extractor       | `functions-answerlattice/src/answerlattice/resolutionExtractor.ts`                | ✅ NEW      |
| Ticket knowledge prompt    | `functions-answerlattice/src/answerlattice/ticketKnowledgePrompt.ts`              | ✅ NEW      |
| Feature flag (frontend)    | `src/config/features.ts`                                                | ✅ MODIFIED |
| Feature flag (CF)          | `functions-answerlattice/src/constants/features.ts`                          | ✅ MODIFIED |
| Types (additive fields)    | `src/types/answerlattice/index.ts`                                           | ✅ MODIFIED |
| Signal emitter enhancement | `src/lib/answerlattice/signalEmitter.ts`                                     | ✅ MODIFIED |
| Nightly batch step         | `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts`                    | ✅ MODIFIED |
| UI wiring                  | `src/components/templates/platform/supportTickets/TicketDetailView.tsx` | ✅ MODIFIED |

## Cross-References

- **Item #4 (Auto Knowledge Creation):** `__docs__/answerlattice/automatic-knowledge-creation/`
- **Ticket System:** `__docs__/answerlattice/ticket-system/`
- **AI Escalation (Item #8):** `__docs__/answerlattice/ai-failure-escalation/`
- **Answerlattice Doctrine:** `__docs__/answerlattice/doctrine/`
- **Expansion Tracker:** `__docs__/answerlattice/answerlattice-expansion-tracker.md`
