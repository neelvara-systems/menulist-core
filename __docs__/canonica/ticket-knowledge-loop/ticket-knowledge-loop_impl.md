# Ticket → Knowledge Loop — Implementation Blueprint

> **Status:** DOCUMENTED — Ready for Implementation
> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Audience:** Developers
> **Feature Flag:** `ENABLE_CANONICA_TICKET_KNOWLEDGE`

---

## §1 — Architecture Position in Canonica

This feature is a **surgical extension** of two existing systems:

1. **Signal Mutation Engine (Pillar 4)** — Enhanced signal emission on ticket resolution
2. **Automatic Knowledge Creation (Item #4)** — Enhanced draft generation from ticket conversations

```
Existing 5-Pillar Architecture:
┌──────────────────────────────────────────────────────────┐
│ Pillar 1: Product Ontology (entities, relations)          │
│ Pillar 2: Canonical Answer Engine                         │
│ Pillar 3: Drift Governance (4 drift classes)              │
│ Pillar 4: Signal Mutation Engine ← ENHANCED               │
│   └─ Item #4: Auto Knowledge ← ENHANCED                  │
│   └─ Item #9: Ticket→Knowledge ← THIS FEATURE            │
│ Pillar 5: API & Integration                               │
└──────────────────────────────────────────────────────────┘

Enhanced Nightly Pipeline (1 new step):
Step 1:  Drift Detection (existing)
Step 2:  Signal Entity Resolution (existing)
Step 3:  Signal Mutation (existing)
Step 4:  Coverage KPI (existing)
Step 5:  Recurring Fallback Detection (existing)
Step 6:  Post-Mutation Impact Tracking (existing)
Step 7:  Confidence Auto-Adjustment (existing)
Step 8:  Signal TTL Archive (existing)
Step 9:  Draft Generation for new proposals (existing, Item #4)
Step 10: Friction Aggregation (existing, Item #5)
Step 11: Friction Insight Generation (existing, Item #5)
Step 12: Onboarding Bootstrap (existing, Item #6)
Step 13: Integration Events (existing, Item #7)
Step 14: [NEW] Ticket Resolution Knowledge Extraction ← THIS FEATURE
```

---

## §2 — System Components

### §2.1 — What Already Exists (DO NOT REBUILD)

| Component                  | File                                                 | Status                                                             |
| -------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| Signal emitter             | `src/lib/canonica/signalEmitter.ts`                  | ✅ Fires ticket signals on creation                                |
| Signal events DAL          | `src/database/canonica/signalEvents.ts`              | ✅ 4 functions                                                     |
| Signal clustering          | `src/lib/canonica/signalMutation.ts`                 | ✅ Entity-based clustering with severity + time decay              |
| Nightly signal mutation    | `functions-canonica/src/canonica/canonicaNightly.ts` | ✅ Clusters → proposals                                            |
| Mutation proposals DAL     | `src/database/canonica/mutationProposals.ts`         | ✅ 7 functions + approveDraftAsCanonicalAnswer                     |
| Draft generator (CF)       | `functions-canonica/src/canonica/draftGenerator.ts`  | ✅ Gemini draft for new_answer_required                            |
| Founder review queue       | `src/hooks/canonica/useMutationProposals.ts`         | ✅ approve/reject/implement                                        |
| Canonical answer creation  | `src/database/canonica/canonicalAnswers.ts`          | ✅ 8 functions                                                     |
| Ticket system              | `src/database/tickets/index.ts`                      | ✅ Full CRUD + real-time                                           |
| Ticket types               | `src/types/supportTicket.ts`                         | ✅ Already has `knowledgeCandidate`, `source`, `escalationContext` |
| Audit logs                 | `src/database/canonica/auditLogs.ts`                 | ✅ Append-only                                                     |
| Nightly batch orchestrator | `functions-canonica/src/canonica/canonicaNightly.ts` | ✅ 13+ steps, idempotent                                           |

### §2.2 — What Must Be Built (NEW)

| Component               | Location                                                   | Purpose                                              |
| ----------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| Resolution extractor    | `functions-canonica/src/canonica/resolutionExtractor.ts`   | Extract problem/resolution from ticket conversations |
| Ticket knowledge prompt | `functions-canonica/src/canonica/ticketKnowledgePrompt.ts` | Gemini prompt for resolution extraction              |

### §2.3 — What Must Be Modified

| File                                                                    | Change                                                            | Purpose                                 |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| `src/lib/canonica/signalEmitter.ts`                                     | Emit resolution metadata on ticket status change                  | Rich signal with resolution content     |
| `src/types/canonica/index.ts`                                           | Add `sourceTicketIds[]`, `resolutionContext` to mutation proposal | Lineage tracking                        |
| `functions-canonica/src/canonica/canonicaNightly.ts`                    | Add Step 14                                                       | Orchestrate ticket knowledge extraction |
| `functions-canonica/src/constants/features.ts`                          | Add `ENABLE_CANONICA_TICKET_KNOWLEDGE`                            | CF feature flag                         |
| `src/config/features.ts`                                                | Add `ENABLE_CANONICA_TICKET_KNOWLEDGE`                            | Frontend feature flag                   |
| `src/components/templates/platform/supportTickets/TicketDetailView.tsx` | Wire `emitTicketResolutionSignal()` on Resolved/Closed            | Trigger signal from ticket UI           |
| `functions-canonica/src/canonica/draftGenerator.ts`                     | Handle `ticket_resolution` draft source                           | Generate drafts from resolution context |

---

## §3 — Data Model

### §3.1 — Enhanced Signal Event Metadata (Additive)

When a ticket is resolved/closed, the signal emitter fires with enriched metadata:

```typescript
// Existing CanonicaSignalEvent.metadata — additive fields
metadata: {
    ticketId: string;          // Existing
    subject: string;           // Existing
    // NEW — resolution-specific fields
    resolutionMessages?: string[];  // Last N messages that constitute the resolution (max 5)
    conversationLength?: number;    // Total messages in ticket
    category?: string;              // Ticket category
    resolvedBy?: string;            // Who resolved (agent/founder identifier)
    resolutionTimestamp?: string;   // ISO string when resolved
}
```

### §3.2 — Enhanced Mutation Proposal (Additive Fields on suggestedChange)

```typescript
// Existing CanonicaMutationProposal.suggestedChange — additive fields
suggestedChange: {
    // ... existing fields (structuredSummary, detailedExplanation, etc.)
    // ... existing Item #4 fields (draftTitle, draftStatus, draftSource, etc.)

    // NEW — Ticket Knowledge Loop fields (additive, freeze-compliant)
    sourceTicketIds?: string[];         // Ticket IDs that contributed to this proposal
    sourceTicketCount?: number;         // How many tickets were accumulated
    resolutionContext?: string;         // Compressed summary of resolution patterns across tickets
    extractionConfidence?: number;      // 0-1 confidence of resolution extraction quality
}
```

### §3.3 — New `draftSource` Value

```typescript
// Existing draftSource values: 'signal_cluster' | 'recurring_fallback' | 'onboarding_bootstrap'
// NEW value added:
draftSource?: 'signal_cluster' | 'recurring_fallback' | 'onboarding_bootstrap' | 'ticket_resolution';
```

### §3.4 — No New Collections

All data lives on existing collections:

- `canonica_signalEvents` — enriched metadata on ticket resolution signals
- `canonica_mutationProposals` — proposals with `draftSource: 'ticket_resolution'`
- `canonica_auditLogs` — provenance tracking
- `supportTickets` — read-only (never modified by this feature)

---

## §4 — Pipeline Implementation

### §4.1 — Enhanced Signal Emission (Frontend)

**File:** `src/lib/canonica/signalEmitter.ts`

When ticket status changes to Resolved or Closed, emit an enriched signal:

```typescript
// Called from TicketDetailView or ConversationTimeline when status changes
export const emitTicketResolutionSignal = async (params: {
  ticketId: string;
  subject: string;
  messages: TicketMessage[];
  category: string;
  entityId?: string;
  tId: number;
  sId: number;
  resolvedBy: string;
}): Promise<void> => {
  if (!FEATURE_FLAGS.ENABLE_CANONICA_TICKET_KNOWLEDGE) return;

  // Extract last 5 non-system messages as resolution context
  const resolutionMessages = params.messages
    .filter((m) => m.type !== "system")
    .slice(-5)
    .map((m) => m.text);

  // Skip if resolution is too short (not substantive)
  const totalResolutionLength = resolutionMessages.join(" ").length;
  if (totalResolutionLength < 50) return;

  await emitCanonicaSignal({
    type: "ticket",
    entityId: params.entityId || "unresolved",
    tId: params.tId,
    sId: params.sId,
    metadata: {
      ticketId: params.ticketId,
      subject: params.subject,
      resolutionMessages,
      conversationLength: params.messages.length,
      category: params.category,
      resolvedBy: params.resolvedBy,
      resolutionTimestamp: new Date().toISOString(),
    },
  });
};
```

### §4.2 — Nightly Resolution Extraction (Cloud Function)

**File:** `functions-canonica/src/canonica/resolutionExtractor.ts`

This runs as Step 14 in the nightly batch.

```typescript
interface ResolutionExtractionResult {
  candidatesFound: number;
  proposalsCreated: number;
  skippedDuplicate: number;
  skippedLowConfidence: number;
}

async function extractTicketKnowledge(
  tId: number,
  sId: number,
): Promise<ResolutionExtractionResult> {
  // 1. Query signal events of type 'ticket' with resolution metadata
  //    from the last 14 days, grouped by entity
  // 2. For each entity cluster with 3+ resolved tickets:
  //    a. Collect resolution messages from signal metadata
  //    b. Check deduplication (3 stages):
  //       - Does active canonical answer exist for this entity? → skip
  //       - Does pending proposal exist for this entity? → merge (increment count)
  //       - Post-extraction similarity check (entity-level, not vector)
  //    c. If passes dedup → extract resolution using Gemini
  //    d. Create mutation proposal with draftSource: 'ticket_resolution'
  //    e. Generate draft using existing draftGenerator (enhanced)
  // 3. Cap at maxDraftsPerRun (5) to control LLM costs
  // 4. Audit log each extraction attempt
}
```

### §4.3 — Resolution Extraction Prompt (Cloud Function)

**File:** `functions-canonica/src/canonica/ticketKnowledgePrompt.ts`

```typescript
function buildTicketResolutionPrompt(params: {
  entityName: string;
  entityDescription: string;
  ticketSubjects: string[]; // Subjects from accumulated tickets
  resolutionMessages: string[][]; // Resolution messages per ticket (max 5 tickets × 5 messages)
  existingAnswerTitles: string[]; // Existing canonical answer titles for context
}): string {
  // Prompt instructs Gemini to:
  // 1. Identify the common problem pattern across tickets
  // 2. Extract the consensus resolution
  // 3. Structure as: title, structuredSummary, detailedExplanation
  // 4. Cross-verify: only include resolution steps confirmed in 2+ tickets
  // 5. Flag confidence level
  // 6. Return structured JSON
}
```

### §4.4 — Deduplication Logic (3 Stages)

**Stage 1: Entity → Existing Canonical Answer**

```
Query canonica_canonicalAnswers where:
  - tId == tId
  - sId == sId
  - scope.entityIds array-contains entityId
  - status == 'active'
If found → SKIP (answer already exists)
  Future v2: propose EDIT suggestion instead
```

**Stage 2: Entity → Pending Proposal**

```
Query canonica_mutationProposals where:
  - tId == tId
  - sId == sId
  - relatedEntityIds array-contains entityId
  - status == 'pending_review'
If found → MERGE (increment sourceTicketCount, append sourceTicketIds)
  Do NOT create new proposal
```

**Stage 3: Post-Extraction Entity-Level Check**

```
After extraction, verify the extracted problem doesn't match
any existing canonical answer title/summary (simple text comparison).
If >85% word overlap → SKIP
```

### §4.5 — Nightly Batch Integration

**File:** `functions-canonica/src/canonica/canonicaNightly.ts`

Add Step 14 to the `runCanonicaNightly()` orchestrator:

```typescript
// Step 14: Ticket Resolution Knowledge Extraction (Item #9)
if (FUNCTION_FLAGS.ENABLE_CANONICA_TICKET_KNOWLEDGE) {
  try {
    const extractionResult = await extractTicketKnowledge(tId, sId);
    tenantResult.ticketKnowledge = extractionResult;
  } catch (error) {
    console.error(
      `[Canonica Nightly] Ticket knowledge extraction failed for ${tId}/${sId}:`,
      error,
    );
    tenantResult.ticketKnowledgeError = String(error);
  }
}
```

---

## §5 — ADRs (Architecture Decision Records)

### ADR-1: Accumulation Over Per-Ticket Extraction

**Decision:** Process ticket clusters (3+ per entity), not individual tickets.

**Rationale:**

- Intercom research (May 2025) proved accumulation produces 60% approval rate vs ~30% for per-ticket
- Cross-verification across multiple conversations improves extraction quality
- Reduces LLM cost by 80%+ (fewer extraction calls)
- Prevents noise from one-off, non-representative tickets

**Alternatives rejected:**

- Per-ticket extraction (ChatGPT's proposal) — too noisy, too expensive
- Real-time extraction on ticket close — latency spike, cost amplification

### ADR-2: Zero New Firestore Collections

**Decision:** Reuse existing `canonica_mutationProposals` with additive fields.

**Rationale:**

- Firebase cost discipline (core Canonica principle)
- `knowledgeCandidates` separate collection (ChatGPT) would duplicate data already on proposals
- `draftSource: 'ticket_resolution'` distinguishes ticket-derived proposals from signal-derived ones
- Lineage tracked via `sourceTicketIds[]` on existing proposal document

**Alternatives rejected:**

- ChatGPT's 9 new collections (resolvedTickets, ticketProcessingQueue, knowledgeCandidates, etc.)
- Separate `ticketKnowledgeCandidates` collection

### ADR-3: Nightly Batch as Processing Queue

**Decision:** Process in existing nightly batch, not a separate queue.

**Rationale:**

- Nightly batch already has: idempotency, error isolation, audit logging, feature flags
- Ticket knowledge is not time-sensitive (24h delay is acceptable for knowledge creation)
- Separate queue (ChatGPT's `ticketProcessingQueue`) adds operational complexity for zero benefit

### ADR-4: Entity-Based Clustering (Not Vector Similarity)

**Decision:** Use existing entity-based signal clustering, not vector similarity for deduplication.

**Rationale:**

- Entity clustering already built and proven in signal mutation engine
- Entities are the structural key in Canonica (doctrine principle)
- Vector similarity requires external DB or expensive embedding calls
- At Canonica's scale, entity grouping is sufficient

### ADR-5: Read-Only Ticket Access

**Decision:** This feature NEVER modifies ticket documents. Read-only access to supportTickets.

**Rationale:**

- Ticket system is a separate concern (not Canonica-owned)
- Signal metadata captures resolution at emission time — no need to re-read tickets
- Prevents coupling between ticket lifecycle and knowledge pipeline
- Signal events are the authoritative source, not tickets

---

## §6 — Governance & Safety

### Resolution Quality Filters

1. **Minimum conversation length** — Skip tickets with < 3 messages (likely auto-closed)
2. **Minimum resolution text** — Skip if resolution messages total < 50 chars
3. **Status filter** — Only Resolved or Closed tickets (not Re-Opened, not Open)
4. **Entity binding** — Only tickets with resolved entity binding (not 'unresolved')
5. **System message exclusion** — Filter out system-generated status change messages

### Extraction Guardrails

1. **Confidence threshold** — Discard extractions with confidence < 0.7
2. **Max drafts per run** — Cap at 5 to control LLM costs
3. **Max tickets to analyze** — Cap at 50 entity clusters per run
4. **No PII extraction** — Prompt instructs Gemini to strip names, emails, account-specific details
5. **Reproducibility** — Store prompt version on proposal for debugging

---

## §7 — Observability

### Nightly Batch Metrics (Added to Existing Run Log)

```typescript
ticketKnowledge: {
    candidatesFound: number;      // Entity clusters meeting threshold
    proposalsCreated: number;     // New proposals generated
    skippedDuplicate: number;     // Clusters skipped by dedup
    skippedLowConfidence: number; // Extractions below confidence threshold
    mergedToExisting: number;     // Clusters merged into existing proposals
    error?: string;               // Error message if step failed
}
```

### Audit Log Actions

- `ticket_knowledge_extracted` — Resolution extracted from ticket cluster
- `ticket_knowledge_dedup_skip` — Cluster skipped due to deduplication
- `ticket_knowledge_merged` — Cluster merged into existing proposal

---

## §8 — Feature Flags

### Frontend (`src/config/features.ts`)

```typescript
/**
 * Canonica Ticket → Knowledge Loop (Expansion Item #9)
 *
 * true: Ticket resolution signals enriched with conversation data.
 *       Nightly batch extracts knowledge candidates from resolved ticket clusters.
 * false: Standard ticket signals only (no resolution extraction)
 *
 * Requires: ENABLE_CANONICA_SIGNAL_MUTATION = true
 * Requires: ENABLE_CANONICA_AUTO_KNOWLEDGE = true (for draft generation)
 * @see __docs__/canonica/ticket-knowledge-loop/
 */
ENABLE_CANONICA_TICKET_KNOWLEDGE: false,
```

### Cloud Function (`functions-canonica/src/constants/features.ts`)

```typescript
ENABLE_CANONICA_TICKET_KNOWLEDGE: false,
```

---

## §9 — Implementation Phases

### Phase 1: Enhanced Signal Emission (Frontend)

- Modify `signalEmitter.ts` — add `emitTicketResolutionSignal()`
- Wire into ticket status change flow (TicketDetailView / ConversationTimeline)
- Add additive fields to `CanonicaMutationProposal.suggestedChange` type
- Add feature flags (both frontend + CF)

### Phase 2: Resolution Extraction Engine (Cloud Function)

- Create `resolutionExtractor.ts` — nightly step logic
- Create `ticketKnowledgePrompt.ts` — Gemini extraction prompt
- Implement 3-stage deduplication
- Wire into `canonicaNightly.ts` as Step 14

### Phase 3: Draft Generator Extension

- Extend `draftGenerator.ts` to handle `ticket_resolution` source
- Pass resolution context (accumulated messages) to Gemini
- Store lineage fields on proposal

### Phase 4: Validation & Testing

- Type check (tsc --noEmit = 0 errors)
- Parity audit against this document
- Update expansion tracker status
- Update changelog

---

## §10 — Cost Analysis

### LLM Costs (Per Nightly Run Per Tenant)

| Operation                      | Frequency | Tokens (est.)             | Cost (Gemini Flash) |
| ------------------------------ | --------- | ------------------------- | ------------------- |
| Resolution extraction          | Max 5/run | ~2000 input + 500 output  | ~$0.001             |
| Draft generation               | Max 5/run | ~3000 input + 1000 output | ~$0.002             |
| **Total per tenant per night** |           |                           | **~$0.003**         |

### Firestore Costs (Per Nightly Run Per Tenant)

| Operation                        | Count | Cost          |
| -------------------------------- | ----- | ------------- |
| Signal event reads (ticket type) | ~50   | ~$0.00003     |
| Canonical answer dedup reads     | ~5    | ~$0.000003    |
| Pending proposal dedup reads     | ~5    | ~$0.000003    |
| Proposal writes (new/merge)      | ~5    | ~$0.000009    |
| Audit log writes                 | ~5    | ~$0.000009    |
| **Total per tenant per night**   |       | **~$0.00005** |

### Scale Projection

| Tenants | Monthly LLM Cost | Monthly Firestore Cost | Total   |
| ------- | ---------------- | ---------------------- | ------- |
| 10      | $0.90            | $0.015                 | ~$0.92  |
| 100     | $9.00            | $0.15                  | ~$9.15  |
| 1,000   | $90.00           | $1.50                  | ~$91.50 |

Cost is dominated by LLM calls. The 5-draft-per-run cap ensures predictable costs.

---

## §11 — Backwards Compatibility

- **Zero breaking changes** — All type modifications are additive optional fields
- **Feature flag OFF by default** — Existing behavior unchanged
- **No collection changes** — Reuses existing collections
- **No index changes** — No new composite indexes required
- **Signal events backwards compatible** — Old signals without resolution metadata still work
- **Draft generator backwards compatible** — `ticket_resolution` is a new `draftSource` value, existing values unchanged
