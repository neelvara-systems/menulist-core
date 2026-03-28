# Automatic Knowledge Creation — Implementation Blueprint

> **Status:** DOCUMENTED — Ready for Implementation
> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Audience:** Developers
> **Feature Flag:** `ENABLE_CANONICA_AUTO_KNOWLEDGE`

---

## §1 — Architecture Position in Canonica

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
| Signal collection | `src/lib/canonica/signalEmitter.ts` | ✅ Built |
| Signal events DAL | `src/database/canonica/signalEvents.ts` | ✅ Built (4 functions) |
| Entity-based clustering | `src/lib/canonica/signalMutation.ts` → `clusterSignalsByEntity()` | ✅ Built |
| Mutation type determination | `src/lib/canonica/signalMutation.ts` → `determineMutationType()` | ✅ Built |
| Proposal creation | `src/database/canonica/mutationProposals.ts` → `addMutationProposal()` | ✅ Built (7 functions) |
| Nightly batch (CF) | `functions-canonica/src/canonica/canonicaNightly.ts` → `runSignalMutation()` | ✅ Built (8 steps) |
| Recurring fallback detection | `functions-canonica/src/canonica/canonicaNightly.ts` → `detectRecurringFallbacks()` | ✅ Built |
| Proposal review UI | `src/components/templates/canonica/governance/MutationProposalReview` | ✅ Built |
| Canonical answer DAL | `src/database/canonica/canonicalAnswers.ts` | ✅ Built (8 functions) |
| Entity extraction | `src/lib/canonica/entityExtraction.ts` | ✅ Built |
| Types | `src/types/canonica/index.ts` | ✅ Built (604 lines) |

### §2.2 — What Must Be Built (NEW)

| Component | Location | Purpose |
|-----------|----------|---------|
| Draft generator lib | `src/lib/canonica/draftGenerator.ts` | Generate draft content from signal context + entity + KB |
| Draft prompt template | `src/lib/canonica/draftPrompt.ts` | Gemini prompt for structured canonical answer generation |
| CF integration | `functions-canonica/src/canonica/canonicaNightly.ts` | Call draft generator after proposal creation |
| Feature flag | `src/config/features.ts` | `ENABLE_CANONICA_AUTO_KNOWLEDGE` |
| CF feature flag | `functions-canonica/src/constants/features.ts` | `ENABLE_CANONICA_AUTO_KNOWLEDGE` |

### §2.3 — What Must Be Modified

| File | Change | Purpose |
|------|--------|---------|
| `functions-canonica/src/canonica/canonicaNightly.ts` | Add draft generation step after `runSignalMutation()` and `detectRecurringFallbacks()` | Generate drafts for new proposals |
| `src/types/canonica/index.ts` | Extend `CanonicaMutationProposal.suggestedChange` type | Add `draftStatus` and `draftSource` fields |
| `src/components/templates/canonica/governance/MutationProposalReview` | Show draft content in review UI | Display AI draft for founder review |
| `src/database/canonica/mutationProposals.ts` | Add `approveDraftAsCanonicalAnswer()` function | One-click approve draft → create canonical answer |

---

## §3 — Data Model

### §3.1 — Extended `suggestedChange` on MutationProposal (Additive Fields)

```typescript
// Existing type in src/types/canonica/index.ts
suggestedChange: {
    structuredSummary?: string;
    detailedExplanation?: string;
    edgeCases?: string;
    constraints?: string;
    procedure?: CanonicaProcedure;
    
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

All data lives on the existing `canonica_mutation_proposals` collection. Zero new collections.

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
You are Canonica's Knowledge Draft Generator. You create structured 
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
src/lib/canonica/draftGenerator.ts          — Main draft generation logic (client-side, for manual trigger)
src/lib/canonica/draftPrompt.ts             — Prompt template + response parser
```

### §5.2 — CF Files (Server-Side Draft Generation)

```
functions-canonica/src/canonica/draftGenerator.ts  — Server-side draft generation (for nightly batch)
```

Note: Draft generation in the nightly CF uses `firebase-admin` + Gemini server-side. The client-side version (`src/lib/canonica/draftGenerator.ts`) is for manual regeneration from the governance UI.

### §5.3 — Modified Files

```
src/config/features.ts                              — Add ENABLE_CANONICA_AUTO_KNOWLEDGE flag
functions-canonica/src/constants/features.ts         — Add ENABLE_CANONICA_AUTO_KNOWLEDGE flag
functions-canonica/src/canonica/canonicaNightly.ts   — Add draft generation step (step 9)
src/types/canonica/index.ts                          — Extend suggestedChange type
src/database/canonica/mutationProposals.ts           — Add approveDraftAsCanonicalAnswer()
```

---

## §6 — Approve Draft → Canonical Answer Flow

When a founder approves a draft:

```typescript
async function approveDraftAsCanonicalAnswer(
    proposalId: string,
    editedContent: Partial<CanonicaCanonicalAnswer['content']>,
    tId: number,
    sId: number,
    approvedBy: string
): Promise<CanonicaCanonicalAnswer> {
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

### §7.1 — New Step 9 in canonicaNightly.ts

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
  - "Regenerate Draft" → calls Gemini again with same context

### §8.2 — No New Pages Required

All UI changes are within the existing `MutationProposalReview` component in the Governance Hub. No new routes.

---

## §9 — Feature Flag

```typescript
// src/config/features.ts
ENABLE_CANONICA_AUTO_KNOWLEDGE: false,
// When true: AI drafts generated for new_answer_required proposals
// When false: Proposals created without drafts (current behavior)
// Requires: ENABLE_CANONICA_SIGNAL_MUTATION = true
```

```typescript
// functions-canonica/src/constants/features.ts
ENABLE_CANONICA_AUTO_KNOWLEDGE: false,
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

### How Canonica Differs (Advantages)
- **Entity-based clustering** (vs. semantic embedding clustering) — deterministic, cheaper, more explainable
- **Unified signal pipeline** — ticket + chat + escalation signals in one system (others often separate)
- **Doctrine-governed** — 3-year architecture freeze prevents feature bloat
- **Zero new collections** — Canonica's existing schema already supports this enhancement

---

## §14 — ADR (Architecture Decision Records)

### ADR-1: Entity-Based Clustering Over Semantic Embedding Clustering
**Decision:** Use existing `clusterSignalsByEntity()` instead of building semantic embedding clustering.
**Rationale:** Canonica doctrine mandates "Entities define structure. Embeddings only assist discovery." Entity-based clustering is deterministic, zero-cost, and explainable. Semantic clustering adds compute cost, cluster drift risk, and violates the deterministic principle.
**Status:** LOCKED

### ADR-2: No External Vector DB
**Decision:** Do not introduce Qdrant or any external vector DB for this feature.
**Rationale:** Entity-based clustering requires no vector embeddings. Adding a vector DB for clustering contradicts the existing architecture and adds operational complexity.
**Status:** LOCKED

### ADR-3: Draft on Existing Proposal Document
**Decision:** Store draft content on `suggestedChange` field of existing `canonica_mutation_proposals` docs.
**Rationale:** Avoids new collections. Draft is metadata of the proposal, not a separate entity. Follows Canonica's pattern of enriching existing documents.
**Status:** LOCKED

### ADR-4: Server-Side Draft Generation (CF, not Client)
**Decision:** Primary draft generation happens in the nightly Cloud Function, not client-side.
**Rationale:** Draft generation is a batch operation (max 10/run). Running in CF avoids CORS issues, keeps Gemini API key server-side, and aligns with existing nightly batch pattern. Client-side `draftGenerator.ts` is only for manual regeneration from governance UI.
**Status:** LOCKED

### ADR-5: Structured Skeleton Over Full Article
**Decision:** Generate structured skeleton (title + summary + explanation + steps), not full long-form articles.
**Rationale:** Doctrine: "LLM assists, never becomes the control plane." Skeleton gives founder 80% of the work done. Founder adds domain expertise, screenshots, edge cases. This produces higher-quality answers than full AI articles.
**Status:** LOCKED
