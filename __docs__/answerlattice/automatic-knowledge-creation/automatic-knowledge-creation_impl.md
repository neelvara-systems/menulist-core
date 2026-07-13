# Automatic Knowledge Creation — Implementation Blueprint

> **Status:** IMPLEMENTED — Capped and human-reviewed
> **Version:** 1.2.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-07-11
> **Audience:** Developers
> **Feature Flag:** `ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE`

---

## §1 — Architecture Position in Answerlattice

This feature is a **surgical enhancement** to the existing Signal Mutation Engine (Pillar 4). It adds ONE new capability: AI draft generation when proposals are created.

```
Existing 5-Pillar Architecture:
┌──────────────────────────────────────────────────────┐
│ Pillar 1: Product Ontology (entities, relations)     │
│ Pillar 2: Canonical Answer Engine                    │
│ Pillar 3: Drift Governance (4 drift classes)         │
│ Pillar 4: Signal Mutation Engine ← THIS FEATURE      │
│ Pillar 5: API & Integration                          │
└──────────────────────────────────────────────────────┘

Signal Mutation Pipeline (enhanced):
signalEvents → clusterByEntity → determineMutationType
    ↓
new_answer_required → [NEW] generateDraftContent(Gemini) → proposal.suggestedChange
    ↓
Governance UI → founder reviews draft → approve → canonical answer
```

---

## §2 — System Components

### §2.1 — What Already Exists (DO NOT REBUILD)

| Component | File | Status |
|-----------|------|--------|
| Signal collection | `src/lib/answerlattice/signalEmitter.ts` | ✅ Built |
| Signal events DAL | `src/database/answerlattice/signalEvents.ts` | ✅ Built (4 functions) |
| Entity-based clustering | `src/lib/answerlattice/signalMutation.ts` reference utility; production batch logic lives in `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` | ✅ Built |
| Mutation type determination | `src/lib/answerlattice/signalMutation.ts` reference utility; production batch logic lives in `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` | ✅ Built |
| Proposal creation | `src/database/answerlattice/mutationProposals.ts` → `addMutationProposal()` | ✅ Built (7 functions) |
| Nightly batch (CF) | `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` → `runSignalMutation()` | ✅ Built (multi-step scheduler) |
| Recurring fallback detection | `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` → `detectRecurringFallbacks()` | ✅ Built |
| Proposal review UI | `src/components/templates/answerlattice/governance/MutationProposalReview` | ✅ Built |
| Canonical answer DAL | `src/database/answerlattice/canonicalAnswers.ts` | ✅ Read/query helpers plus proposal submission; no direct browser canonical writes |
| Entity extraction | `src/lib/answerlattice/entityExtraction.ts` | ✅ Built |
| Types | `src/types/answerlattice/index.ts` | ✅ Built (604 lines) |

Runtime diagnostics for signal emission and signal mutation proposal creation use `src/lib/answerlattice/diagnostics.ts`. Manual draft regeneration, FAQ generation, translation, and article entity extraction route failures use fixed-code runtime diagnostics with bounded tenant/store/user/item metadata. FAQ generation and translation cap Gemini response text before parsing; FAQ truncation logs provider-response length metadata only, while oversized translation output fails closed before article writes. Article-save entity extraction remains non-blocking, but its browser trigger uses no-store cache, same-origin credentials, manual redirect handling, and a 16 KB bounded acknowledgement parser before logging rejected, malformed, oversized, or invalid route responses. Manual draft regeneration also logs `answerlattice_draft_regeneration_signal_examples_load_failed` and `answerlattice_draft_regeneration_existing_answers_load_failed` when optional grounding reads fail, then continues with empty grounding context. These paths must preserve graceful degradation and must not log raw tenant/store IDs, entity names, article IDs, proposal IDs, provider errors, signal text, prompt text, or generated content.

The manual draft regeneration DAL in `src/database/answerlattice/mutationProposals.ts` also keeps failed route responses bounded. The browser request uses no-store cache, same-origin credentials, manual redirect handling and a stable bounded `requestId` before the response parser runs. It sends no trusted audit actor; the route derives actor identity from the authenticated session. Failed `/api/answerlattice/mutation-proposals/regenerate-draft` responses throw fixed local copy to the governance UI instead of copying route/provider text. Successful responses are parsed through a 16 KB bounded response reader and must include the route's `{ success: true }` acknowledgement before the governance hook shows draft-generated success. The route admits only exact numeric persisted lease seconds and logs a bounded secondary failure if claim recovery cannot clear the active draft lease.

Answerlattice Legacy Signal Mutation Entity ID Boundary: `src/lib/answerlattice/signalMutation.ts` is a legacy/manual reference utility, while production batch mutation runs in `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts`. The reference utility still normalizes stored signal `entityId` values through the resolved entity helper in `src/lib/answerlattice/governanceIdBoundary.ts` before cluster keys, active-answer lookups, proposal `relatedEntityIds`, and proposal diagnostics. Malformed or unresolved entity IDs are skipped before proposal creation.

Answerlattice App Resolved Entity Link Boundary: app-side entity-link writers and lookup helpers use `normalizeAnswerlatticeResolvedEntityId()` or `normalizeAnswerlatticeResolvedEntityIds()` before treating an ID as a real entity link. Product surfaces, FAQs, FAQ-from-article generation, Knowledge Intake KB/FAQ/surface/proposal publish outputs, canonical answer writes, active-answer lookups, signal-event queries, manual draft regeneration, draft approval, and the legacy/manual signal mutation utility reject malformed IDs and the `unresolved` sentinel at those boundaries while preserving signal emission's explicit `unresolved` fallback.

Answerlattice Manual Draft Helper Related Entity ID Boundary: the legacy/shared manual draft helper, proposal status action DAL, and draft approval DAL normalize mutation proposal IDs and proposal `relatedEntityIds[0]` through `src/lib/answerlattice/governanceIdBoundary.ts` before client proposal reads, proposal action transaction refs, proposal writes, entity reads, signal grounding queries, active-answer queries, canonical-answer `scope.entityIds`, and audit metadata. Malformed related entity IDs fail closed instead of being copied into new canonical answer bindings.

Answerlattice Scheduled Draft Failure Diagnostic Entity ID Boundary: `functions-answerlattice/src/answerlattice/draftGenerator.ts` normalizes proposal `relatedEntityIds[0]` through the Functions entity ID boundary before scheduled draft entity reads and before per-proposal/status-marker failure diagnostics. Malformed or unresolved related entity IDs are recorded only as absent bounded identifier metadata in failure logs.

The scheduled Cloud Function draft generator in `functions-answerlattice/src/answerlattice/draftGenerator.ts` uses fixed `ANSWERLATTICE_DRAFT_*` diagnostics for Gemini call, response-parse, per-proposal, failed draft-status marking, and batch failures. Those logs include source error name/code/status, tenant/store scope booleans, identifier presence/length metadata, and prompt/response lengths only; valid proposal writes, audit writes, draft content storage, and AI operation accounting remain unchanged.

Scheduled proposal creation and draft generation treat persisted product/tenant/store ownership as exact runtime data. The nightly signal-mutation transaction requires an `AL` entity with positive safe-integer scope before creating a proposal. The draft claim, grounding entity/signals/answers, failed-claim marker and generated-draft commit independently recheck exact `AL` scope; the final commit also rechecks mutation type, entity binding, lease ownership and the authoritative proposal document ID. Stored numeric strings and malformed lease seconds are not coerced. Entity, signal-context and existing-answer read failures have separate fixed diagnostics so missing truth is distinguishable from datastore failure without exposing raw content.

Answerlattice Nightly Mutation Impact Entity ID Boundary: `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` normalizes implemented proposal `relatedEntityIds[0]` through the Functions entity ID boundary before post-implementation signal-count queries. Malformed or unresolved related entity IDs are skipped, preserving valid impact tracking while preventing path-shaped IDs from becoming scheduler query keys.

### §2.2 — What Must Be Built (NEW)

| Component | Location | Purpose |
|-----------|----------|---------|
| Draft generator lib | `src/lib/answerlattice/draftGenerator.ts` | Generate draft content from signal context + entity + KB |
| Draft prompt template | `src/lib/answerlattice/draftPrompt.ts` | Gemini prompt for structured canonical answer generation |
| CF integration | `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` | Call draft generator after proposal creation |
| Feature flag | `src/config/features.ts` | `ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE` |
| CF feature flag | `functions-answerlattice/src/constants/features.ts` | `ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE` |

### §2.3 — What Must Be Modified

| File | Change | Purpose |
|------|--------|---------|
| `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` | Add draft generation step after `runSignalMutation()` and `detectRecurringFallbacks()` | Generate drafts for new proposals |
| `src/types/answerlattice/index.ts` | Extend `AnswerlatticeMutationProposal.suggestedChange` type | Add `draftStatus` and `draftSource` fields |
| `src/components/templates/answerlattice/governance/MutationProposalReview` | Show draft content in review UI | Display AI draft for founder review |
| `src/database/answerlattice/mutationProposals.ts` | Route approval/rejection/implementation actions to the governance API | Keep browser code outside canonical and decision writes |
| `src/lib/answerlattice/governanceServer.ts` | Apply approved proposals in an Admin Firestore transaction | Validate scope, entity/version/procedure constraints, overlaps, audit, and invalidation atomically |
| `src/app/api/answerlattice/governance/actions/route.ts` | Authenticated governance action boundary | Resolve session authority, permission, rate limit, and bounded strict request schema |
| `firestore-answerlattice.rules` | Deny canonical browser writes and proposal decision updates | Enforce server authority below the UI layer |

---

## §3 — Data Model

### §3.1 — Extended `suggestedChange` on MutationProposal (Additive Fields)

```typescript
// Existing type in src/types/answerlattice/index.ts
suggestedChange: {
    structuredSummary?: string;
    detailedExplanation?: string;
    edgeCases?: string;
    constraints?: string;
    procedure?: AnswerlatticeProcedure;

    // NEW — Automatic Knowledge Creation fields (additive, freeze-compliant)
    draftTitle?: string;                    // AI-generated answer title
    draftStatus?: 'pending' | 'generated' | 'failed';  // Draft generation status
    draftSource?: 'signal_cluster' | 'recurring_fallback';  // What triggered the draft
    draftGeneratedAt?: Timestamp;           // When draft was generated
    draftSignalExamples?: string[];         // Sample signal texts used for context (max 5)
    draftEntityContext?: string;            // Entity name + description used
    draftPromptVersion?: string;            // Prompt version for reproducibility
};
```

### §3.2 — No New Collections

All data lives on the existing `answerlattice_mutation_proposals` collection. Zero new collections.

---

## §4 — Draft Generation Pipeline

### §4.1 — Trigger Points (2 existing paths, enhanced)

**Path A: Signal Mutation (Nightly)**
```
runSignalMutation() → creates proposal with mutationType: 'new_answer_required'
    ↓
[NEW] generateDraftForProposal(proposalId, entityId, tId, sId)
    ↓
Updates proposal.suggestedChange with AI draft
```

**Path B: Recurring Fallback Detection (Nightly)**
```
detectRecurringFallbacks() → creates auto-proposal from 5+ misses
    ↓
[NEW] generateDraftForProposal(proposalId, entityId, tId, sId)
    ↓
Updates proposal.suggestedChange with AI draft
```

### §4.2 — Draft Generation Logic

```typescript
async function generateDraftForProposal(
    proposalId: string,
    entityId: string,
    tId: number,
    sId: number,
    signalExamples: string[]  // From cluster signal metadata
): Promise<void> {
    // 1. Mark draft as pending
    await updateProposal(proposalId, { 'suggestedChange.draftStatus': 'pending' });

    // 2. Gather context
    const entity = await getEntity(entityId);           // Entity name + description
    const existingAnswers = await getAnswersForEntity(); // Related answers for context
    const kbArticles = await getRelatedKBArticles();     // Existing KB for grounding

    // 3. Build prompt
    const prompt = buildDraftPrompt({
        entityName: entity.name,
        entityDescription: entity.description,
        entityType: entity.type,
        signalExamples,          // Sample user questions/issues
        existingAnswers,         // What documentation already exists
        relatedArticles,         // KB articles for grounding
    });

    // 4. Call Gemini
    const draft = await callGemini(DRAFT_SYSTEM_PROMPT, prompt);

    // 5. Parse and validate
    const parsed = parseDraftResponse(draft);

    // 6. Store on proposal
    await updateProposal(proposalId, {
        'suggestedChange.draftTitle': parsed.title,
        'suggestedChange.structuredSummary': parsed.structuredSummary,
        'suggestedChange.detailedExplanation': parsed.detailedExplanation,
        'suggestedChange.edgeCases': parsed.edgeCases,
        'suggestedChange.constraints': parsed.constraints,
        'suggestedChange.procedure': parsed.procedure,  // If guided workflows enabled
        'suggestedChange.draftStatus': 'generated',
        'suggestedChange.draftSource': 'signal_cluster',
        'suggestedChange.draftGeneratedAt': Timestamp.now(),
        'suggestedChange.draftSignalExamples': signalExamples.slice(0, 5),
        'suggestedChange.draftEntityContext': `${entity.name}: ${entity.description}`,
        'suggestedChange.draftPromptVersion': 'v1',
    });
}
```

### §4.3 — Gemini Prompt Design

```
SYSTEM PROMPT:
You are Answerlattice's Knowledge Draft Generator. You create structured
canonical answer skeletons from support signal evidence.

OUTPUT RULES:
- Follow CanonicalAnswerSchema EXACTLY
- Be declarative, not instructional (state what IS, not what to do)
- Reference only product concepts from the entity context provided
- Do NOT invent features or capabilities not mentioned in context
- Keep structuredSummary ≤500 chars
- If the topic is procedural, include steps[] (max 12 steps)
- Include warnings for destructive or irreversible actions
- Include prerequisites if the workflow requires specific roles/plans

OUTPUT FORMAT (strict JSON):
{
  "title": "...",
  "structuredSummary": "...",
  "detailedExplanation": "...",
  "edgeCases": "...",
  "constraints": "...",
  "procedure": {
    "steps": [...],
    "warnings": [...],
    "prerequisites": [...]
  }
}

USER PROMPT:
Entity: {entityName} ({entityType})
Description: {entityDescription}

Users are asking about this topic. Here are example support signals:
{signalExamples}

Existing documentation that may be related:
{existingAnswerSummaries}

Generate a canonical answer draft for this knowledge gap.
```

---

## §5 — File Structure

### §5.1 — New Files

```
src/lib/answerlattice/draftGenerator.ts          — Shared manual draft-generation logic, called through the governance API route
src/lib/answerlattice/draftPrompt.ts             — Prompt template + response parser
src/app/api/answerlattice/mutation-proposals/regenerate-draft/route.ts — Manual regeneration route; owns safe-mode/rate-limit admission, permission checks, Gemini call, and AI operation accounting
```

### §5.2 — CF Files (Server-Side Draft Generation)

```
functions-answerlattice/src/answerlattice/draftGenerator.ts  — Server-side draft generation (for nightly batch)
```

Note: Draft generation in the nightly CF uses `firebase-admin` + Gemini server-side. Manual regeneration from the governance UI calls `/api/answerlattice/mutation-proposals/regenerate-draft`, which resolves Answerlattice scope, checks safe mode, rate-limits before permission/body/provider work, invokes the shared draft helper server-side, records Answerlattice AI operation metadata, and logs unexpected failures with fixed-code bounded metadata. Optional signal-example and existing-answer grounding read failures keep the owner action running with empty grounding arrays, but log fixed diagnostics so draft-quality degradation is visible.

### §5.3 — Modified Files

```
src/config/features.ts                              — Add ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE flag
functions-answerlattice/src/constants/features.ts         — Add ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE flag
functions-answerlattice/src/answerlattice/answerlatticeNightly.ts   — Add draft generation step (step 9)
src/types/answerlattice/index.ts                          — Extend suggestedChange type
src/database/answerlattice/mutationProposals.ts           — Send approval/rejection/implementation actions to the governance route
src/lib/answerlattice/governanceContracts.ts              — Strict request, stored-proposal, and response contracts
src/lib/answerlattice/governanceClient.ts                 — Bounded same-origin browser client
src/lib/answerlattice/governanceServer.ts                 — Server-owned governance transactions
src/app/api/answerlattice/governance/actions/route.ts     — Protected governance endpoint
firestore-answerlattice.rules                             — Deny canonical browser writes and proposal decision updates
src/hooks/answerlattice/useMutationProposals.ts           — Add manual generate/regenerate draft action
src/components/templates/answerlattice/MutationProposalReview.tsx — Surface draft evidence, publish, reject, and generate/regenerate actions
```

---

## §6 — Approve Draft → Canonical Answer Flow

When a founder approves a draft, the browser sends only the proposal ID and bounded editable text to the protected governance route. The server derives tenant, store, and actor identity from the session.

```json
POST /api/answerlattice/governance/actions
{
  "action": "approve_proposal",
  "proposalId": "proposal-id",
  "editedContent": {
    "title": "Reviewed title",
    "structuredSummary": "Reviewed summary",
    "detailedExplanation": "Reviewed explanation"
  }
}
```

The server transaction then:

1. Reads and validates the stored proposal inside the authenticated workspace.
2. Reads the target answer when the proposal updates existing truth.
3. Resolves the current active release and validates every bound entity.
4. Builds the candidate answer and validates content, procedure, version window, and product binding.
5. Rejects any overlapping active answer for the same entity, plan, role, state, and version window.
6. Creates or updates the canonical answer and marks the proposal `implemented`.
7. Writes the before/after audit snapshot needed for governed rollback.
8. Increments the canonical cache version and compiled-context source version, then marks the current bundle stale.

All writes commit together. A failure leaves the prior canonical answer, proposal decision, audit trail, and invalidation state unchanged.

Serving is fail-closed for governance review. `canonicalRetrieval.ts` excludes any active answer with `governance.driftFlag` or `governance.reviewRequired`; when that leaves a matched entity with only review-blocked answers, it returns `canonical_answer_review_required`. It also treats plan, role, and product-state scope as strict eligibility constraints. Missing restricted context returns `canonical_scope_context_required`; supplied context outside the allowed scope returns `canonical_scope_not_covered`. `searchCore.ts` converts those codes into fixed support-review messages, records non-cacheable audit-history keys, and stops before FAQ retrieval, embeddings, or RAG. A corrected and validated answer can therefore become current immediately after cache-version invalidation without an old refusal or stale answer remaining in the normal answer cache.

Direct entity truth remains authoritative over graph-neighbor candidates. A drifted or review-required answer bound to the directly matched entity cannot be bypassed by a weaker clean answer found only through graph expansion. Canonical candidates are also rechecked for Answerlattice product and tenant/store ownership before they can be returned.

Browser proposal submission keeps a stable request ID across ambiguous transport failures. A retry with the same serialized proposal payload reuses that ID until the server acknowledges success, preventing a lost acknowledgement from creating duplicate governance work. The bounded in-memory retry map holds at most 50 pending payloads and is not a durable queue.

---

## §7 — Nightly CF Integration

### §7.1 — New Step 9 in answerlatticeNightly.ts

After the existing 8 steps, add:

```
Step 9: Draft Generation for New Proposals
- Query proposals created in this nightly run with mutationType 'new_answer_required'
  AND suggestedChange.draftStatus is undefined
- For each (max 10 per run):
  - Gather entity context + signal examples
  - Call Gemini for draft generation
  - Update proposal with draft content
  - Log to audit trail
```

### §7.2 — Cost Cap

- Max 10 drafts per nightly run
- Each Gemini call: ~200 input tokens, ~800 output tokens
- Cost per draft: ~$0.001 (Gemini 2.5 Flash pricing)
- Monthly cost at scale (50k signals, 15 proposals): ~$0.015/month
- **Annual cost: <$0.20** — negligible

### §7.3 — Failure Handling

- Draft generation failure does NOT affect proposal creation
- `draftStatus: 'failed'` is set on the proposal
- Draft status updates also refresh proposal `modifiedOn` / `modifiedBy` metadata so the governance queue reflects system-side draft activity.
- Founder can manually trigger regeneration from governance UI
- Error logged but never thrown (fire-and-forget pattern)

---

## §8 — Governance UI Changes

### §8.1 — MutationProposalReview Enhancement

Current UI shows:
- Mutation type badge
- Signal summary (ticket count, chat count, feedback rate)
- Entity IDs
- Approve / Reject buttons

Enhanced UI adds:
- **Draft content section** (when `draftStatus === 'generated'`):
  - Title (editable)
  - Structured summary (editable)
  - Detailed explanation (editable)
  - Edge cases (editable)
  - Constraints (editable)
  - Procedure steps (if applicable, editable)
- **Signal evidence section** (new):
  - Example signal texts (from `draftSignalExamples`)
  - Entity context description
- **Actions** (enhanced):
  - "Approve and apply" → asks the server governance transaction to create or update canonical truth from the reviewed draft
  - Edited draft approval → sends bounded edits to the same server transaction
  - "Reject" → unchanged
  - "Generate Draft" / "Regenerate Draft" → explicit owner action, one AI request per click, keeps result in review

### §8.2 — No New Pages Required

All UI changes are within the existing `MutationProposalReview` component in the Governance Hub. No new routes.

---

## §9 — Feature Flag

```typescript
// src/config/features.ts
ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE: true,
// When true: AI drafts generated for new_answer_required proposals
// When false: Proposals created without drafts
// Requires: ENABLE_ANSWERLATTICE_SIGNAL_MUTATION = true
```

```typescript
// functions-answerlattice/src/constants/features.ts
ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE: true,
```

---

## §10 — Edge Cases and Protections

| Edge Case | Protection |
|-----------|------------|
| Entity has no description | Use entity name + signal examples only. Draft may be lower quality. |
| No existing KB articles for context | Generate from signal examples alone. Mark as low-confidence draft. |
| Gemini returns invalid JSON | Catch parse error, set `draftStatus: 'failed'`. Proposal still created. |
| Gemini returns hallucinated content | Founder review catches this. Prompt strictly says "do not invent features." |
| Duplicate proposals for same entity | Existing dedup in `detectRecurringFallbacks()` already prevents this. |
| Cost spike from many proposals | Hard cap: max 10 drafts per nightly run. |
| Entity deprecated after draft generated | Drift detection (Class D) catches orphan answers. Draft approval blocked if entity deprecated. |

---

## §11 — Performance Constraints

| Metric | Target | Rationale |
|--------|--------|-----------|
| Draft generation time | <5s per proposal | Gemini 2.5 Flash is fast. Single call. |
| Nightly batch overhead | <60s total for draft step | Max 10 drafts × 5s = 50s |
| Firestore reads per draft | 3-5 | Entity doc + related answers + KB articles |
| Firestore writes per draft | 1 | Update proposal.suggestedChange |

---

## §12 — Backwards Compatibility

- **Zero breaking changes** — All modifications are additive
- `suggestedChange` type extension is optional fields only
- Proposals without drafts continue to work exactly as before
- Feature flag OFF = zero behavioral change
- Existing 8-step nightly batch unchanged — step 9 is additive

---

## §13 — External Research Findings

### Industry Patterns (validated via web research)

1. **Intercom Fin AI Engine** — Uses "AI recommendations" to identify knowledge gaps and suggest content. Gap detection runs automatically. Human review mandatory. Source: intercom.com/help
2. **Zendesk AI Knowledge Base** — "AI can detect a spike in specific customer requests" and suggest articles. Content suggestions prioritized by ticket volume + search frequency. Source: zendesk.com
3. **Fini (Zendesk plugin)** — Generates KB articles from ticket clusters. "Only suggests new content when confidence levels are high." Human-in-the-loop mandatory. Reviews hundreds of interactions collectively. Source: usefini.com
4. **Self-Improving RAG Systems** — Use RLHF feedback loops. Signal patterns (negative feedback, escalations) drive content improvement. Incremental updates preferred over batch re-clustering. Source: ragaboutit.com

### Key Industry Consensus
- **Human review is mandatory** — No production system auto-publishes AI-generated KB content
- **Batch over real-time** — Gap detection runs on schedules, not per-signal
- **Signal volume thresholds** — Content only suggested when cluster size exceeds minimum
- **Existing content as context** — AI drafts grounded in existing KB, not generated from scratch

### How Answerlattice Differs (Advantages)
- **Entity-based clustering** (vs. semantic embedding clustering) — deterministic, cheaper, more explainable
- **Unified signal pipeline** — ticket + chat + escalation signals in one system (others often separate)
- **Doctrine-governed** — 3-year architecture freeze prevents feature bloat
- **Zero new collections** — Answerlattice's existing schema already supports this enhancement

---

## §14 — ADR (Architecture Decision Records)

### ADR-1: Entity-Based Clustering Over Semantic Embedding Clustering
**Decision:** Use existing `clusterSignalsByEntity()` instead of building semantic embedding clustering.
**Rationale:** Answerlattice doctrine mandates "Entities define structure. Embeddings only assist discovery." Entity-based clustering is deterministic, zero-cost, and explainable. Semantic clustering adds compute cost, cluster drift risk, and violates the deterministic principle.
**Status:** LOCKED

### ADR-2: No External Vector DB
**Decision:** Do not introduce Qdrant or any external vector DB for this feature.
**Rationale:** Entity-based clustering requires no vector embeddings. Adding a vector DB for clustering contradicts the existing architecture and adds operational complexity.
**Status:** LOCKED

### ADR-3: Draft on Existing Proposal Document
**Decision:** Store draft content on `suggestedChange` field of existing `answerlattice_mutation_proposals` docs.
**Rationale:** Avoids new collections. Draft is metadata of the proposal, not a separate entity. Follows Answerlattice's pattern of enriching existing documents.
**Status:** LOCKED

### ADR-4: Server-Side Draft Generation (CF, not Client)
**Decision:** Draft generation happens through server-owned execution: nightly Cloud Function for batches, governance API route for manual regeneration.
**Rationale:** Draft generation is a batch operation in normal operation and a manual owner action from the UI. Both paths keep Gemini credentials server-side, apply safe-mode/rate-limit/permission checks, and record AI operation accounting.
**Status:** LOCKED

### ADR-5: Structured Skeleton Over Full Article
**Decision:** Generate structured skeleton (title + summary + explanation + steps), not full long-form articles.
**Rationale:** Doctrine: "LLM assists, never becomes the control plane." Skeleton gives founder 80% of the work done. Founder adds domain expertise, screenshots, edge cases. This produces higher-quality answers than full AI articles.
**Status:** LOCKED
