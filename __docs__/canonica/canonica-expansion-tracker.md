# Canonica — ICP Expansion Tracker

> **Status:** ACTIVE — Living Document
> **Version:** 1.0.0
> **Created:** 2026-03-07
> **Last Updated:** 2026-03-10
> **Source:** ChatGPT ICP gap analysis → Cascade codebase cross-check
> **Purpose:** Track implementation progress of 12 ICP-driven expansion items. Reference this doc BEFORE starting work on any item.
> **Rule:** Update this doc after completing each item (status, date, key files, notes).

---

## How to Use This Document

1. **Before starting any item:** Read this doc top-to-bottom. Check dependencies.
2. **Pick the next item:** Follow the recommended build order (§4).
3. **After completing an item:** Update its status row, add implementation date, list key files created/modified.
4. **Each item gets its own implementation session** — no mixing items.

---

## §1 — Summary Table

| #   | Item                          | Category        | Status      | Codebase Reality                                                                                                                                                                                                                                                                                                                                                             | Priority | Dependencies                                          |
| --- | ----------------------------- | --------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------- |
| 1   | Context-Aware Support         | Core Experience | ✅ COMPLETE | Implemented 2026-03-08. `applyContextBoosts()` in canonicalRetrieval.ts with page/feature/workflow/entityHints weighting. 3 guardrails. `CanonicaContextPayload` type. Flag: `ENABLE_CANONICA_CONTEXT_AWARE`. Docs: `context-aware-support/` (8 docs + archive).                                                                                                             | P1       | None                                                  |
| 2   | Guided Workflows              | Core Experience | COMPLETE    | answerType + procedure.steps[] + warnings + prerequisites on canonical answers                                                                                                                                                                                                                                                                                               | P2       | #1 (context improves step relevance)                  |
| 3   | Instant Answer Caching        | Core Experience | COMPLETE    | Upstash Redis cache for canonical answers. 2 new files + 2 modified. Flag: `ENABLE_CANONICA_INSTANT_CACHE`. Docs: `instant-response-infrastructure/`                                                                                                                                                                                                                         | P3       | #1                                                    |
| 4   | Automatic Knowledge Creation  | Core Experience | ✅ COMPLETE | Implemented 2026-03-09. `draftGenerator.ts` + `draftPrompt.ts` (frontend + CF). Nightly Step 9. +7 additive fields on suggestedChange. `approveDraftAsCanonicalAnswer` DAL. Flag: `ENABLE_CANONICA_AUTO_KNOWLEDGE`. Docs: `automatic-knowledge-creation/` (8 docs + archive).                                                                                                | P2       | #9 (ticket→knowledge feeds this)                      |
| 5   | Product Friction Insights     | Core Experience | � COMPLETE  | Implemented 2026-03-09. Flag: `ENABLE_CANONICA_FRICTION_INTELLIGENCE`. 6 new files + 5 modified. Nightly Steps 10/10b/11 wired. GovernanceHub "Friction" tab. Zero TS errors. Docs: `__docs__/canonica/product-friction-intelligence/` (8 docs + 1 archive).                                                                                                                 | P2       | #10 (trust metrics is the UI layer)                   |
| 6   | Simple Onboarding             | Adoption        | COMPLETE    | Implemented 2026-03-09. Flag: `ENABLE_CANONICA_FOUNDER_ONBOARDING`. 2 new files + 5 modified. Nightly Step 12 (separate discovery loop). Zero new collections. Zero TS errors. Docs: `__docs__/canonica/founder-onboarding/` (8 docs + 1 archive).                                                                                                                           | P1       | None                                                  |
| 7   | Tool Integrations             | Adoption        | COMPLETE    | Implemented 2026-03-09. Flag: `ENABLE_CANONICA_WORKFLOW_INTEGRATIONS`. 10 new CF files + 5 modified. 4 adapters (Slack, Email, Linear, GitHub). Nightly Step 13. 2 new collections + 4 indexes. Zero TS errors. Docs: `__docs__/canonica/workflow-integrations/` (8 docs + 1 archive).                                                                                       | P3       | #1, #8 (context + escalation drive integration value) |
| 8   | AI Escalation Path            | Adoption        | COMPLETE    | Implemented 2026-03-09. Flag: `ENABLE_CANONICA_AI_ESCALATION`. 2 new files + 12 modified. 5 escalation triggers (S1-S5), inline retrieval+entity debug on tickets, knowledgeCandidate tagging, sessionFailureCount chain, explicit intent detection, "Still need help?" UI. Zero new collections. Zero TS errors. Docs: `__docs__/canonica/ai-failure-escalation/` (8 docs). | P1       | #1 (context makes escalation tickets richer)          |
| 9   | Ticket → Knowledge Conversion | Adoption        | ✅ COMPLETE | Implemented 2026-03-09. `resolutionExtractor.ts` + `ticketKnowledgePrompt.ts` (CF). Nightly Step 14. `emitTicketResolutionSignal` in signalEmitter. +4 additive fields. Flag: `ENABLE_CANONICA_TICKET_KNOWLEDGE`. Docs: `ticket-knowledge-loop/` (8 docs + archive).                                                                                                         | P2       | #4, #8                                                |
| 10  | Trust Metrics for Founders    | Adoption        | ✅ COMPLETE | Implemented 2026-03-09. Flag: `ENABLE_CANONICA_TRUST_METRICS`. 2 new files + 4 modified. 4 metrics + top 5 failing + escalation breakdown. Zero new collections. Zero TS errors. Docs: `__docs__/canonica/founder-trust-layer/` (8 docs + archive).                                                                                                                          | P2       | #5                                                    |
| 11  | Knowledge Graph Exploitation  | Strategic       | ✅ COMPLETE | Implemented 2026-03-10. `graphTraversal.ts` (~250 lines). 1-hop entity expansion, interaction rules, related suggestions. Nightly Step 15 graph index rebuild. Retrieval integration. Flag: `ENABLE_CANONICA_KNOWLEDGE_GRAPH`. Docs: `knowledge-graph-exploitation/` (8 docs + archive).                                                                                     | P3       | #1, #2                                                |
| 12  | Predictive Support            | Strategic       | ✅ COMPLETE | Implemented 2026-03-10. `predictiveEngine.ts`, `predictiveTriggers.ts` DAL, `/api/canonica/predictive-help` route (API key auth), admin UI, nightly Step 16. 1 new collection. Cooldowns via Upstash Redis. Flag: `ENABLE_CANONICA_PREDICTIVE_SUPPORT`. Docs: `predictive-support/` (8 docs + archive).                                                                      | P4       | #1, #5, #11                                           |

**Legend:** 🔴 NOT BUILT | 🟡 PARTIAL (infrastructure exists, product layer missing) | 🟢 COMPLETE

---

## §2 — Detailed Cross-Check (ChatGPT Claims vs Codebase Reality)

### Item 1 — Context-Aware Support

**ChatGPT claim:** "Critical Missing Layer" — retrieval is just `query → entity match → canonical answer` with no product context.

**Codebase reality (HONEST):**

- `RetrievalContext` in `src/lib/canonica/canonicalRetrieval.ts` already has: `tId`, `sId`, `currentVersion`, `planId`, `roleId`
- Specificity scoring uses version window + plan match + role match (lines 174-225)
- Widget search route (`/api/widget/search`) passes `tId`, `sId` but no page/feature context
- Search-kb route passes session context

**What's genuinely missing:**

- Page/feature/workflow context injection from client product
- `entityHints` parameter for contextual pre-filtering
- Widget SDK needs to accept context payload from host product

**ChatGPT accuracy: ~60%** — Overstated as "Critical Missing Layer" when partial context (plan/role/version) already works. But page/feature context is a genuine gap.

**Doctrine check:** ✅ Allowed — improves deterministic retrieval performance (Non-Goals §VII)

---

### Item 2 — Guided Workflows

**ChatGPT claim:** Canonical answers must support step-by-step instructions with `steps[]` structure.

**Codebase reality:**

- `CanonicaCanonicalAnswer.content` has: `structuredSummary`, `detailedExplanation` (both strings)
- No `steps[]` array in the type definition
- Widget renders answers as text blocks

**What's genuinely missing:**

- `steps[]` field on canonical answer content type
- Widget renderer for step-by-step display
- Authoring UI for step-based answers

**ChatGPT accuracy: ~85%** — Valid gap. Many SaaS support queries are procedural.

**Doctrine check:** ✅ Allowed — additive metadata field on canonical answer (Freeze §2: "Additive metadata fields" allowed)

---

### Item 3 — Instant Answer Caching

**ChatGPT claim:** Firestore queries introduce latency, need response caching layer.

**Codebase reality:**

- `aiSearchHistory` already caches complete search responses (canonical hits included — see search-kb route line 211-248)
- `queryEmbeddings` caches embedding vectors for repeated queries
- Canonical retrieval path is 2 Firestore reads (search index + answer doc) — already fast (<100ms)
- RAG path is the slow path (embedding + vector search + LLM)

**What's genuinely missing:**

- Upstash Redis cache for hot canonical answers (entityId+version key)
- Reduces Firestore reads for frequently asked questions
- Primary value is latency reduction (~5ms vs ~100ms) rather than cost savings

**ChatGPT accuracy: ~55%** — Core insight valid (cache canonical answers), but overengineered (Intent Engine, pre-cache workers, semantic caching, global intent library all rejected). Didn't know about existing Upstash, entity resolution, or coreSearch pipeline.

**Doctrine check:** ✅ Allowed — performance optimization (Freeze §2)

**Status:** � IMPLEMENTED (2026-03-09) — Full doc set + code complete. Zero TS errors. Parity audit passed.
**Feature flag:** `ENABLE_CANONICA_INSTANT_CACHE` (ready-to-use default ON; no-op when Upstash env is missing)
**New files:** `src/lib/canonica/instantCache.ts` (124 lines), `src/lib/canonica/instantCache.types.ts` (36 lines)
**Modified files:** `src/lib/search/searchCore.ts` (Stage 2.5 + cache write), `src/config/features.ts` (flag)
**Key decisions:** Entity-based cache keys (not intent-based), Upstash Redis (already in project), canonical-only caching (not RAG), version-based invalidation, no pre-cache workers, no semantic caching

---

### Item 4 — Automatic Knowledge Creation

**ChatGPT claim:** Ticket clusters should auto-propose articles. Knowledge base should be "self-building."

**Codebase reality:**

- Signal mutation engine (`signalMutation.ts`) already clusters ticket + chat + escalation signals by entity
- When cluster has no canonical answer → proposes `new_answer_required` mutation (line 160-166)
- But proposal is just a request — it does NOT generate the answer content
- Founder must still write the answer manually

**What's genuinely missing:**

- AI-generated draft content for `new_answer_required` proposals (using signal context + existing KB)
- "One-click publish" flow for AI-drafted answers
- This is the highest-leverage gap — turns mutation proposals from "todo items" into "review-and-publish" items

**ChatGPT accuracy: ~75%** — Correctly identified the gap. Infrastructure exists but last mile (content generation) is missing.

**Doctrine check:** ⚠️ CAREFUL — "LLM assists the control plane. It never becomes the control plane." (Non-Goals §III). AI-generated drafts are fine as PROPOSALS. Auto-publish would violate doctrine.

---

### Item 5 — Product Friction Insights

**ChatGPT claim:** Founders want actionable insights: top failing feature, most confusing workflow, most frequent support topic.

**Codebase reality (DEEP AUDIT — 2026-03-09):**

- ✅ `canonica_signalEvents` — 3 signal types (ticket, chat_negative, escalation), 4 DAL functions, fire-and-forget emitter with deduplication
- ✅ `signalMutation.ts` — Entity-based clustering with severity weighting (escalation 3x, ticket 1.5x, chat 1x) + time decay (7-day half-life)
- ✅ Nightly scheduler (8 steps) — drift detection, entity resolution, signal mutation, coverage KPI, recurring fallback, impact tracking, confidence auto-adjust, signal TTL
- ✅ `coverageKPI.ts` — Hit/miss aggregation from aiSearchHistory
- ✅ `searchCore.ts` — Logs CANONICAL_HIT/MISS with matchedEntityIds and performance metrics
- ❌ NO daily aggregated friction stats per entity
- ❌ NO friction score or severity ranking
- ❌ NO trend detection (week-over-week comparison)
- ❌ NO emerging topic detection
- ❌ NO weekly AI friction insight
- ❌ NO GovernanceHub friction tab

**What's genuinely missing (validated):**

1. `canonica_frictionDailyStats` — Daily per-entity friction metrics (1 new collection)
2. `platformSummary/frictionSnapshot_{tId}_{sId}` — Nightly snapshot with top entities + trends
3. `platformSummary/friction_{tId}_{sId}` — Weekly AI-generated insight summary
4. Nightly Steps 9-10 in canonicaNightly.ts — Friction aggregation + weekly insight
5. GovernanceHub "Friction" tab — UI to display insights

**ChatGPT accuracy: ~45%** — Strategic direction was right (support signals → product friction). But ~55% of proposed infrastructure already exists. ChatGPT proposed 6+ new collections when 1 suffices. Proposed BigQuery + Vector DB (not in stack). Proposed embedding-based clustering (violates doctrine).

**Full documentation:** `__docs__/canonica/product-friction-intelligence/` (8 docs + 1 archive)
**ChatGPT review:** `__docs__/canonica/product-friction-intelligence/_archive/chatgpt-review.md`

**Doctrine check:** ✅ Allowed — Freeze-compliant (additive fields, 1 new collection, extends existing scheduler)

---

### Item 6 — Simple Onboarding (Founder Onboarding / Knowledge Bootstrap Engine)

**ChatGPT claim:** Current onboarding is too friction-heavy (4 steps). ICP expects: upload docs → system works.

**Codebase reality (deep audit 2026-03-09):**

- KB upload pipeline exists (kb-generation: upload → AI extraction → staging → review → publish → embed)
- Entity extraction from KB articles exists (`entityExtraction.ts` — 413 lines, full pipeline)
- Entity candidate approval pipeline exists (`entityCandidates.ts` — promoteCandidate with authority guard)
- Canonical answer draft generation exists (`draftGenerator.ts` — 453 lines, from signal clusters)
- Canonical answer creation from drafts exists (`mutationProposals.ts` — approveDraftAsCanonicalAnswer)
- RAG provides immediate answers from published KB articles (no delay)

**What's genuinely missing:**

- Batch entity extraction trigger after KB publish (not just per-article)
- Auto-promote logic for high-confidence entities (≥0.7 conf, ≥2 article refs)
- Canonical answer draft generation from KB article content per entity (vs signal clusters)
- Progress tracking on KB generation job
- Feature flag `ENABLE_CANONICA_FOUNDER_ONBOARDING`

**ChatGPT accuracy: ~55%** — Valid problem identification. Solution design ~30% accurate because it proposes 9 new collections (0 needed), custom queue infrastructure (Cloud Functions handle this), and a crawler (KB pipeline already handles imports). Core insight about reducing time-to-value is correct.

**Doctrine check:** ✅ COMPLIANT — Auto-promoted entities have authority guards (confidence + frequency). Drafts are `pending_review` proposals, never served as canonical until approved. RAG provides immediate answers. No governance violations.

**Documentation:** `__docs__/canonica/founder-onboarding/` (8 docs + 1 archive)

**Architecture decision:** Post-publish bootstrap engine as Step 11 in Canonica nightly batch. Zero new collections. Extends existing entity extraction, draft generation, and review infrastructure.

---

### Item 7 — Tool Integrations (Slack, Linear, GitHub, Notion, Email)

**ChatGPT claim:** Canonica should integrate with existing SaaS workflows.

**Codebase reality:**

- Zero external integrations exist
- Email notifications feature flag exists (`ENABLE_CANONICA_NOTIFICATIONS`) — email for ticket events
- Telegram alerts exist for MenuList ops but not for Canonica events
- Signal emitter (`signalEmitter.ts`) is an existing fire-and-forget event pattern that this system follows

**Documentation completed:** 2026-03-09

- **Feature flag:** `ENABLE_CANONICA_WORKFLOW_INTEGRATIONS`
- **Architecture:** Integration Event Bus (append-only) → Cloud Function (onCreate) → 4 Adapters (Slack, Email, Linear, GitHub)
- **New collections:** `canonica_integrationEvents`, `canonica_integrationDeliveryLogs`
- **Config storage:** `platformSummary/integrationConfig_{tId}_{sId}` (no new collection)
- **Nightly batch:** Hooks in as Step 13 (after existing 12 steps)
- **Cost:** ~$0.02/month at 10 tenants, ~$1.45/month at 1,000 tenants
- **Docs:** `__docs__/canonica/workflow-integrations/` (8 docs + 1 archive)
- **ChatGPT accuracy:** ~75% — valid architectural pattern, but proposed generic ticket events instead of governance events, wrong scoping (projectId vs tId/sId), missed existing infrastructure

**Doctrine check:** ✅ Allowed — Freeze §2 explicitly permits "New integrations without breaking invariants"

---

### Item 8 — AI Escalation Path

**ChatGPT claim:** Users need "Still need help? → Create ticket" flow when AI can't answer. Need retrieval debug logging and entity match debug info for developer ICP.

**Codebase reality (AUDITED 2026-03-09):**

- Ticket system exists (full lifecycle: create, message, SLA, resolve) — `src/database/tickets/index.ts`
- `ESCALATION` signal type exists in `CANONICA_SIGNAL_TYPE` — but is NEVER emitted anywhere
- Signal mutation engine already weights ESCALATION at 3x severity — `src/lib/canonica/signalMutation.ts`
- Nightly batch processes escalation signals in clustering — `functions-canonica/src/canonica/canonicaNightly.ts`
- `CanonicalRetrievalResult` returns confidence + matchedEntityIds + fallbackReason — but NOT entity candidates/tokens
- `coreSearch()` logs CANONICAL_MISS with reason — but NOT structured retrieval debug
- Widget search returns answers but NO "escalate" action
- Chat has no "create ticket from this conversation" flow

**What was genuinely missing (now DOCUMENTED):**

- 5-signal escalation trigger evaluator in coreSearch() pipeline
- "Still need help?" UI in help chat with pre-filled ticket creation
- `escalationContext` field on SupportTicketType (retrieval debug + entity debug + product context)
- `knowledgeCandidate: true` tagging for System 9 (Ticket → Knowledge Loop)
- `entityDebug` return from `attemptCanonicalRetrieval()` (expose internal match candidates)
- ESCALATION signal emission from AI-failure tickets (currently never emitted)

**Architecture decisions (diverged from ChatGPT):**

- ❌ Rejected Pub/Sub — Canonica uses fire-and-forget Firestore writes
- ❌ Rejected Cloud Storage for transcripts — conversations already in chatSessions
- ❌ Rejected Cloud Storage for retrieval logs — inline on ticket (~940 bytes typical)
- ❌ Rejected "< 2 seconds" latency target — Canonica is async, not live handoff
- ✅ Accepted multi-signal triggers (5 signals)
- ✅ Accepted pre-filled structured tickets
- ✅ Accepted knowledgeCandidate tagging
- ✅ Accepted entity debug info inline on ticket

**ChatGPT accuracy: ~55%** — Core concepts valid. Infrastructure suggestions wrong for Canonica's architecture and scale.

**Docs:** `__docs__/canonica/ai-failure-escalation/` (8 docs)
**Doctrine check:** ✅ Allowed — Operations (tickets) are signal source layer (Pillar 5). Additive fields on existing types (Freeze §2).

---

### Item 9 — Ticket → Knowledge Conversion

**ChatGPT claim:** Resolved tickets should propose canonical answers from their resolution.

**Codebase reality:**

- Signal emitter fires `ticket` signals when tickets are created
- Mutation engine clusters ticket signals → proposes mutations
- But NO detection of "this resolution is a good canonical answer candidate"
- Ticket resolution text is not analyzed for answer potential

**What's genuinely missing:**

- On ticket resolve: analyze resolution content → if substantive → propose canonical answer draft
- Link proposed answer back to source ticket for provenance
- This feeds into #4 (automatic knowledge creation)

**ChatGPT accuracy: ~80%** — Valid. Extends existing signal pipeline with resolution-specific intelligence.

**Doctrine check:** ✅ Allowed — converts operational data into canonical knowledge (strengthens Pillars 2+4)

---

### Item 10 — Trust Metrics for Founders

**ChatGPT claim:** Founders need to see canonical coverage, drift rate, signal trends, top failing entities, answer usage.

**Codebase reality:**

- `CanonicaCoverageKPI` component exists (reads from `coverageKPI.ts`)
- `ENABLE_CANONICA_GOVERNANCE_UI` feature flag exists
- Governance page exists at `src/app/(canonica)/canonica/governance/`
- But only coverage rate is displayed — no drift trends, signal trends, entity health

**What's genuinely missing:**

- Drift rate metric (% of answers currently drifted)
- Signal trend chart (signals per entity over time)
- Top failing entities ranked list
- Answer usage stats (which canonical answers are served most)
- Health score (composite of coverage + drift + signal trends)

**ChatGPT accuracy: ~75%** — Valid but partially exists. Coverage KPI is there, rest needs building.

**Doctrine check:** ✅ Allowed — "Metrics serve governance health" (Non-Goals §V). These metrics directly serve governance.

---

### Item 11 — Knowledge Graph Exploitation

**ChatGPT claim:** Entity relationships enable multi-entity question answering.

**Codebase reality:**

- `canonica_entity_relations` collection exists in `DB_COLLECTIONS`
- Entity relations DAL exists (`entities.ts` has relation CRUD)
- Entity types include `relatedEntities` field
- But retrieval does NOT traverse entity relationships
- Single-entity matching only in current `canonicalRetrieval.ts`

**What's genuinely missing:**

- Graph traversal in retrieval: if entity A relates to entity B, include B's answers in context
- Multi-entity answer composition
- Relationship-aware specificity scoring

**ChatGPT accuracy: ~80%** — Valid. Infrastructure exists but not exploited. This is genuinely powerful and rare.

**Doctrine check:** ✅ Allowed — "Ontology depth" expansion (Non-Goals §VII). Strengthens Pillar 1.

---

### Item 12 — Predictive Support

**ChatGPT claim:** Instead of answering questions, proactively show common issues based on context. Proposes Pub/Sub + Cloud Run edge collector + 4 new collections (triggerRules, frictionPatterns, helpSuggestions, suggestionSignals).

**Codebase reality (HONEST):**

- Zero predictive/proactive trigger system exists
- BUT ~70% of required infrastructure already built:
  - `CanonicaContextPayload` already has page/feature/workflow/plan/userRole (Item #1 DONE)
  - `CanonicaFrictionSnapshot` already computes topFrictionEntities nightly (Item #5 DONE)
  - `canonica_signalEvents` already collects entity-bound friction signals
  - `Upstash Redis` already deployed (reusable for cooldowns)
  - `platformSummary` pattern proven for cached read-hot docs (entityGraphIndex)
  - Entity search index + canonical answers provide governed content
  - Knowledge graph (Item #11 DONE) can expand trigger entity coverage

**What's genuinely missing:**

- Trigger rules system (collection + platformSummary cache)
- Predictive evaluation engine (rule matching + condition evaluation)
- Proactive help API route (`/api/canonica/predictive-help`)
- Widget SDK extension (`canon.page()` for page entry, not just search)
- Suggestion interaction signals (shown/clicked/dismissed)
- Nightly auto-trigger generation from friction patterns
- Admin UI for trigger management (Governance tab)

**ChatGPT accuracy: ~55%** — Core concept (rule-based proactive help) is valid (90%). Architecture (Pub/Sub + Cloud Run + 4 collections) is massive over-engineering (20%). Only 1 new collection needed; rest already exists or is derived at runtime.

**Doctrine check:** ✅ Allowed — reduces fallback reliance (Non-Goals §IX filter #4). Prevents tickets before they happen. Additive signal types on existing collection (freeze-compliant).

**Full documentation:** `__docs__/canonica/predictive-support/` (8 docs + archive)

---

## §3 — Doctrine Compliance Summary

| Item                             | Doctrine Compliant? | Risk                                         | Mitigation                                                    |
| -------------------------------- | ------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| 1. Context-Aware Support         | ✅ Yes              | None                                         | —                                                             |
| 2. Guided Workflows              | ✅ Yes              | Additive field on frozen type                | Use additive-only approach (new field, don't change existing) |
| 3. Instant Answer Caching        | ✅ Yes              | None                                         | Performance optimization — explicitly allowed                 |
| 4. Automatic Knowledge Creation  | ⚠️ Careful          | AI-generated content could bypass governance | AI drafts must be PROPOSALS, never auto-published             |
| 5. Product Friction Insights     | ✅ Yes              | None                                         | Metrics serve governance health                               |
| 6. Simple Onboarding             | ⚠️ Careful          | Could skip entity approval                   | Provisional/draft status — not active until approved          |
| 7. Tool Integrations             | ✅ Yes              | None                                         | Explicitly allowed in freeze                                  |
| 8. AI Escalation Path            | ✅ Yes              | None                                         | Strengthens signal collection                                 |
| 9. Ticket → Knowledge Conversion | ✅ Yes              | None                                         | Strengthens knowledge pipeline                                |
| 10. Trust Metrics                | ✅ Yes              | None                                         | Governance health metrics                                     |
| 11. Knowledge Graph              | ✅ Yes              | None                                         | Ontology depth expansion                                      |
| 12. Predictive Support           | ✅ Yes              | None                                         | Reduces fallback reliance                                     |

---

## §4 — Recommended Build Order

Based on dependencies and impact:

| Phase                          | Items                                                                | Rationale                                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase A** (Foundation)       | #1 Context-Aware, #6 Simple Onboarding, #8 Escalation Path           | These unblock everything else. Context is the prerequisite for 6 other items. Onboarding reduces adoption friction. Escalation connects existing systems. |
| **Phase B** (Knowledge Loop)   | #4 Auto Knowledge Creation, #9 Ticket→Knowledge, #2 Guided Workflows | Builds the self-improving knowledge loop. Turns signals into content. Makes answers actionable.                                                           |
| **Phase C** (Insights & Trust) | #5 Friction Insights, #10 Trust Metrics                              | Founder-facing value layer. Shows the system is working.                                                                                                  |
| **Phase D** (Advanced)         | #3 Instant Caching, #7 Integrations, #11 Knowledge Graph             | Performance + workflow + depth.                                                                                                                           |
| **Phase E** (Differentiator)   | #12 Predictive Support                                               | Requires all prior phases. Most powerful capability.                                                                                                      |

---

## §5 — Implementation Log

> Update this section after completing each item.

| #   | Item                          | Status         | Completed  | Key Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Session Notes                                                                                                                                                                                                            |
| --- | ----------------------------- | -------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Context-Aware Support         | ✅ IMPLEMENTED | 2026-03-08 | Types: `src/types/canonica/index.ts`, Retrieval: `src/lib/canonica/canonicalRetrieval.ts`, Validation: `src/lib/validation/contextSchema.ts`, Widget: `src/app/api/widget/search/route.ts`, Search-KB: `src/app/api/helpCenter/search-kb/route.ts`, Flag: `src/config/features.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 1 new file + 5 modified. 3 guardrails from ChatGPT review. Flag: `ENABLE_CANONICA_CONTEXT_AWARE` (ON for Product Surface Contexts). tsc: 0 errors.                                                                        |
| 2   | Guided Workflows              | ✅ IMPLEMENTED | 2026-03-08 | Types: `src/types/canonica/index.ts`, Validation: `src/lib/canonica/procedureValidation.ts`, DAL: `src/database/canonica/canonicalAnswers.ts`, Retrieval: `src/lib/canonica/canonicalRetrieval.ts`, Widget: `src/app/api/widget/search/route.ts`, Search-KB: `src/app/api/helpCenter/search-kb/route.ts`, Editor: `src/components/templates/canonica/governance/CanonicalAnswerEditor.tsx`, Flag: `src/config/features.ts`                                                                                                                                                                                                                                                                                                                                                                                                              | 1 new file + 6 modified. Flag: `ENABLE_CANONICA_GUIDED_WORKFLOWS` (OFF). ChatGPT feedback reviewed: procedureSlug accepted, drift/coverage already exist. tsc: 0 errors.                                                 |
| 3   | Instant Answer Caching        | ✅ IMPLEMENTED | 2026-03-09 | Upstash Redis cache for canonical answer hits. Modified: `searchCore.ts`, `instantCache.ts`, `cacheFreshness.ts`, and cache-version manifest helpers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Flag: `ENABLE_CANONICA_INSTANT_CACHE` (ON; graceful no-op without Upstash env). Canonical-only caching, source-version freshness, no semantic caching.                                                                    |
| 4   | Automatic Knowledge Creation  | ✅ IMPLEMENTED | 2026-03-09 | New: `src/lib/canonica/draftGenerator.ts`, `src/lib/canonica/draftPrompt.ts`, `functions-canonica/src/canonica/draftGenerator.ts`. Modified: `canonicaNightly.ts` (step 9), `types/canonica/index.ts` (suggestedChange +7 additive fields), `mutationProposals.ts` (+approveDraftAsCanonicalAnswer), `features.ts` (×2 flags). Docs: `__docs__/canonica/automatic-knowledge-creation/` (8 docs + archive)                                                                                                                                                                                                                                                                                                                                                                                                                               | 3 new files + 5 modified. Flag: `ENABLE_CANONICA_AUTO_KNOWLEDGE` (ON, capped, human-reviewed). tsc: 0 errors. Zero new collections. ADR-1 through ADR-5. ChatGPT ~50% accuracy.                                           |
| 5   | Product Friction Insights     | ⏳ Pending     | —          | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | —                                                                                                                                                                                                                        |
| 6   | Simple Onboarding             | ✅ IMPLEMENTED | 2026-03-09 | `functions-canonica/src/canonica/onboardingBootstrap.ts` extracts entities from published KB jobs, auto-promotes high-confidence entities, and generates draft canonical-answer proposals.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Flag: `ENABLE_CANONICA_FOUNDER_ONBOARDING` (ON, capped, human-reviewed). Zero new collections.                                                             |
| 7   | Tool Integrations             | ⏳ Pending     | —          | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | —                                                                                                                                                                                                                        |
| 8   | AI Escalation Path            | ⏳ Pending     | —          | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | —                                                                                                                                                                                                                        |
| 9   | Ticket → Knowledge Conversion | ✅ IMPLEMENTED | 2026-03-09 | New: `functions-canonica/src/canonica/resolutionExtractor.ts`, `functions-canonica/src/canonica/ticketKnowledgePrompt.ts`. Modified: `signalEmitter.ts` (+emitTicketResolutionSignal), `types/canonica/index.ts` (+4 additive fields + draftSource value), `canonicaNightly.ts` (+Step 14 + 4 result fields), `features.ts` (×2 flags), `TicketDetailView.tsx` (+UI wiring on Resolved/Closed). Docs: `__docs__/canonica/ticket-knowledge-loop/` (8 docs + archive). Flag: `ENABLE_CANONICA_TICKET_KNOWLEDGE` (OFF). Zero new collections. tsc: 0 errors.                                                                                                                                                                                                                                                                               | 2 new files + 5 modified. Accumulation architecture (Intercom-validated). ChatGPT ~55% accuracy (9+ collections → 0). 5 ADRs. Deep audit found missing UI wiring → fixed.                                                |
| 10  | Trust Metrics for Founders    | ✅ IMPLEMENTED | 2026-03-09 | New: `FounderTrustDashboard.tsx`, `trustMetrics.ts` (DAL). Modified: `types/canonica/index.ts` (+3 interfaces), `canonicaNightly.ts` (+aggregateTrustMetrics step 9), `features.ts` (×2 flags), `governance/index.tsx` (+Trust tab). Docs: `__docs__/canonica/founder-trust-layer/` (8 docs + archive). Flag: `ENABLE_CANONICA_TRUST_METRICS` (ON). Zero new collections. tsc: 0 errors.                                                                                                                                                                                                                                                                                                                                                                                                                                                | 2 new files + 4 modified. ChatGPT ~55% accuracy (6 collections → 0). Industry-validated (Intercom). 4 metrics + top 5 failing + escalation breakdown. 5 ADRs.                                                            |     | ChatGPT ~55% accuracy. 6 proposed collections → 0. Industry-validated (Intercom 3-metric model). 4 metrics: Coverage, Resolution, Drift, Entity Health. Single platformSummary doc. |
| 11  | Knowledge Graph Exploitation  | ✅ IMPLEMENTED | 2026-03-10 | New: `src/lib/canonica/graphTraversal.ts` (~250 lines). Modified: `canonicalRetrieval.ts` (graph expansion + multi-entity scoring + post-answer suggestions), `searchCore.ts` (+graphExpansion wiring + GRAPH_EXPANSION_HIT log), `types.ts` (+graphExpansion on CoreSearchResult), `types/canonica/index.ts` (+6 additive types: CanonicaInteractionRule, CanonicaEntityGraphNode, CanonicaEntityGraphIndex, CanonicaGraphExpansionResult, CanonicaInteractionType, CANONICA_INTERACTION_TYPES), `features.ts` (×2 flags), `functions-canonica/constants/features.ts` (+1 flag), `canonicaNightly.ts` (+Step 15 rebuildEntityGraphIndex ~150 lines + 3 result fields). Docs: `__docs__/canonica/knowledge-graph-exploitation/` (8 docs + archive). Flag: `ENABLE_CANONICA_KNOWLEDGE_GRAPH` (OFF). Zero new collections. tsc: 0 errors. | 1 new file + 7 modified. ChatGPT ~70% accuracy. 7 ADRs. interactionRules.ts folded into graphTraversal.ts (simpler). Nightly rebuild preserves manually-authored interaction rules. Bidirectional relation expansion.    |
| 12  | Predictive Support            | ✅ IMPLEMENTED | 2026-03-10 | New: `src/lib/canonica/predictiveEngine.ts` (~250 lines), `src/database/canonica/predictiveTriggers.ts` (~180 lines), `src/app/api/canonica/predictive-help/route.ts` (~100 lines), `src/hooks/canonica/usePredictiveTriggers.ts` (~170 lines), `src/components/templates/canonica/governance/PredictiveTriggerManager.tsx` (~320 lines), `functions-canonica/src/canonica/predictiveTriggerSync.ts` (~260 lines). Modified: `types/canonica/index.ts` (+3 interfaces, +3 const objects, +3 signal types), `features.ts` (×2 flags), `database.ts` (×2 collections), `canonicaNightly.ts` (+Step 16 + import + 4 result fields), `signalEmitter.ts` (+emitSuggestionSignal), `governance/index.tsx` (+LuZap import + PredictiveTriggerManager import + Triggers tab). Docs: `__docs__/canonica/predictive-support/` (8 docs + archive). | 6 new files + 8 modified. Flag: `ENABLE_CANONICA_PREDICTIVE_SUPPORT` (OFF). 1 new collection: `canonica_predictiveTriggers`. Cooldowns via Upstash Redis. Nightly Step 16. 7 ADRs. ChatGPT ~55% accuracy. tsc: 0 errors. |

---

## §6 — ChatGPT Accuracy Assessment

**Overall accuracy: ~72%**

| Rating                       | Items                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| **High accuracy (80-85%)**   | #2, #7, #8, #9, #11, #12 — Correctly identified genuine gaps                                   |
| **Medium accuracy (60-75%)** | #1, #4, #5, #6, #10 — Valid gaps but overstated what's missing (partial infrastructure exists) |
| **Low accuracy (~40%)**      | #3 — Canonical path is already fast; caching already exists for RAG path                       |

**Key pattern:** ChatGPT correctly identified the PRODUCT EXPERIENCE gaps but was unaware of the INFRASTRUCTURE that already exists. This is consistent with previous reviews (~65-85% accuracy).

**What ChatGPT got right:**

- The core insight: "Canonica has strong infrastructure, what remains is product experience on top"
- The 3-category grouping (Core Experience, Adoption, Strategic) is well-structured
- Most items pass the Canonica Feature Rejection Filter

**What ChatGPT missed:**

- `RetrievalContext` already has plan/role/version context (#1)
- `aiSearchHistory` already caches canonical hits (#3)
- Signal mutation engine already proposes `new_answer_required` from ticket clusters (#4)
- Coverage KPI + Governance UI already scaffolded (#10)
- Entity relations collection + DAL already exist (#11)

---

## §7 — Key Existing Files Reference

Files you will frequently touch across multiple items:

| File                                        | Purpose                                | Relevant Items |
| ------------------------------------------- | -------------------------------------- | -------------- |
| `src/lib/canonica/canonicalRetrieval.ts`    | 3-layer retrieval stack                | #1, #3, #11    |
| `src/types/canonica/index.ts`               | All Canonica types                     | #1, #2, #4, #9 |
| `src/lib/canonica/signalMutation.ts`        | Signal clustering + mutation proposals | #4, #5, #9     |
| `src/lib/canonica/signalEmitter.ts`         | Fire-and-forget signal emission        | #8, #9         |
| `src/database/canonica/coverageKPI.ts`      | Coverage metrics DAL                   | #5, #10        |
| `src/database/canonica/entities.ts`         | Entity + relations DAL                 | #6, #11        |
| `src/database/canonica/canonicalAnswers.ts` | Canonical answer DAL                   | #2, #3, #4     |
| `src/app/api/widget/search/route.ts`        | Widget search API                      | #1, #8, #12    |
| `src/app/api/helpCenter/search-kb/route.ts` | Main search API                        | #1, #3         |
| `src/config/features.ts`                    | Feature flags                          | ALL items      |
| `functions-canonica/src/index.ts`           | Canonica Cloud Functions               | #4, #5, #7, #9 |

---

## Version History

| Date       | Version | Change                                                                       |
| ---------- | ------- | ---------------------------------------------------------------------------- |
| 2026-03-07 | 1.0.0   | Initial tracker from ChatGPT ICP gap analysis + Cascade codebase cross-check |
