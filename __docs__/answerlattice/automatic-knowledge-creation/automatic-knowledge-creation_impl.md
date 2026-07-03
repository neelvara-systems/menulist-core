# Automatic Knowledge Creation — Implementation Blueprint

> **Status:** IMPLEMENTED — Capped and human-reviewed
> **Version:** 1.1.2
> **Created:** 2026-03-09
> **Last Updated:** 2026-06-28
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
| Canonical answer DAL | `src/database/answerlattice/canonicalAnswers.ts` | ✅ Built (8 functions) |
| Entity extraction | `src/lib/answerlattice/entityExtraction.ts` | ✅ Built |
| Types | `src/types/answerlattice/index.ts` | ✅ Built (604 lines) |

Runtime diagnostics for signal emission and signal mutation proposal creation use `src/lib/answerlattice/diagnostics.ts`. Manual draft regeneration, FAQ generation, translation, and article entity extraction route failures use fixed-code runtime diagnostics with bounded tenant/store/user/item metadata. FAQ generation and translation cap Gemini response text before parsing; FAQ truncation logs provider-response length metadata only, while oversized translation output fails closed before article writes. Article-save entity extraction remains non-blocking, but its browser trigger uses no-store cache, same-origin credentials, manual redirect handling, and a 16 KB bounded acknowledgement parser before logging rejected, malformed, oversized, or invalid route responses. Manual draft regeneration also logs `answerlattice_draft_regeneration_signal_examples_load_failed` and `answerlattice_draft_regeneration_existing_answers_load_failed` when optional grounding reads fail, then continues with empty grounding context. These paths must preserve graceful degradation and must not log raw tenant/store IDs, entity names, article IDs, proposal IDs, provider errors, signal text, prompt text, or generated content.

The manual draft regeneration DAL in `src/database/answerlattice/mutationProposals.ts` also keeps failed route responses bounded. The browser request uses no-store cache, same-origin credentials, and manual redirect handling before the response parser runs. Failed `/api/answerlattice/mutation-proposals/regenerate-draft` responses throw fixed local copy to the governance UI instead of copying route/provider text. Successful responses are parsed through a 16 KB bounded response reader and must include the route's `{ success: true }` acknowledgement before the governance hook shows draft-generated success.

The scheduled Cloud Function draft generator in `functions-answerlattice/src/answerlattice/draftGenerator.ts` uses fixed `ANSWERLATTICE_DRAFT_*` diagnostics for Gemini call, response-parse, per-proposal, failed draft-status marking, and batch failures. Those logs include source error name/code/status, tenant/store scope booleans, identifier presence/length metadata, and prompt/response lengths only; valid proposal writes, audit writes, draft content storage, and AI operation accounting remain unchanged.

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
| `src/database/answerlattice/mutationProposals.ts` | Add `approveDraftAsCanonicalAnswer()` function | One-click approve draft → create canonical answer |

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
src/database/answerlattice/mutationProposals.ts           — Add approveDraftAsCanonicalAnswer()
src/hooks/answerlattice/useMutationProposals.ts           — Add manual generate/regenerate draft action
src/components/templates/answerlattice/MutationProposalReview.tsx — Surface draft evidence, publish, reject, and generate/regenerate actions
```

---

## §6 — Approve Draft → Canonical Answer Flow

When a founder approves a draft:

```typescript
async function approveDraftAsCanonicalAnswer(
    proposalId: string,
    editedContent: Partial<AnswerlatticeCanonicalAnswer['content']>,
    tId: number,
    sId: number,
    approvedBy: string
): Promise<AnswerlatticeCanonicalAnswer> {
    // 1. Fetch proposal
    const proposal = await getMutationProposalById(proposalId);

    // 2. Create canonical answer from draft (using edited content if founder modified)
    const canonicalAnswer = await addCanonicalAnswer({
        tId, sId,
        title: editedContent.structuredSummary ? 'edited' : proposal.suggestedChange.draftTitle,
        slug: generateSlug(proposal.suggestedChange.draftTitle),
        status: 'active',
        scope: { entityIds: proposal.relatedEntityIds },
        productBinding: {
            introducedInVersion: currentVersion,
            lastValidatedInVersion: currentVersion,
            applicableVersions: { from: currentVersion, to: null },
        },
        content: {
            structuredSummary: editedContent.structuredSummary || proposal.suggestedChange.structuredSummary,
            detailedExplanation: editedContent.detailedExplanation || proposal.suggestedChange.detailedExplanation,
            edgeCases: editedContent.edgeCases || proposal.suggestedChange.edgeCases,
            constraints: editedContent.constraints || proposal.suggestedChange.constraints,
            procedure: editedContent.procedure || proposal.suggestedChange.procedure,
        },
        validation: {
            confidenceScore: proposal.confidenceScore,
            validationSource: 'signal_cluster',
            lastValidatedOn: Timestamp.now(),
            validatedBy: approvedBy,
        },
        signalMetrics: { linkedTicketCount: 0, linkedChatCount: 0, negativeFeedbackCount: 0 },
        governance: { driftFlag: false, reviewRequired: false },
    });

    // 3. Mark proposal as implemented
    await updateMutationProposal(proposalId, { status: 'implemented' });

    // 4. Create search index entry for new answer's entities
    // (reuse existing buildSearchIndexEntry from entityExtraction.ts)

    // 5. Audit log
    await addAuditLog({ ... });

    return canonicalAnswer;
}
```

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
  - "Approve Draft" → creates canonical answer from draft content
  - "Edit & Approve" → opens editor, then creates answer
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
