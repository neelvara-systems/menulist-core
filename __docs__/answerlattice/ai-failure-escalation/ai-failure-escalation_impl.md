# AI Failure Escalation — Implementation Blueprint

> **Version:** 2.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Status:** COMPLETE — All 6 capability blocks implemented. Flag OFF by default.
> **Audience:** Developers
> **Feature Flag:** `ENABLE_ANSWERLATTICE_AI_ESCALATION`

---

## §1 — System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    coreSearch() Pipeline                     │
│                                                             │
│  Stage 4: Canonical Retrieval ──→ confidence, matchedEntities│
│  Stage 5: RAG Fallback ──→ similarity scores, docs found    │
│  Stage 7: Answer Generation ──→ final answer quality        │
│                                                             │
│  ► NEW Stage 7.5: Escalation Evaluator                      │
│    Input: canonical result + RAG result + session history    │
│    Output: EscalationMetadata on CoreSearchResult            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend (Help Chat / Widget)                    │
│                                                             │
│  If escalationSuggested === true:                           │
│    SOFT → Show "Still need help?" button below answer       │
│    HARD → Show escalation prompt prominently                │
│                                                             │
│  On user click → Open EscalationTicketModal                 │
│    Pre-filled: subject, category, message, context          │
│    User can: edit subject, add details, submit              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              Ticket Creation (Existing DAL)                   │
│                                                             │
│  addTicket() with:                                          │
│    + escalationContext (NEW field on SupportTicketType)      │
│    + source: 'ai_escalation'                                │
│    + knowledgeCandidate: true                               │
│                                                             │
│  Fire-and-forget:                                           │
│    + emitAnswerlatticeSignal(type: ESCALATION)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## §2 — Data Model

### §2.1 — Escalation Metadata (on CoreSearchResult)

Added to `src/lib/search/types.ts`:

```typescript
// NEW fields on CoreSearchResult
export interface EscalationMetadata {
  /** Whether escalation should be suggested to the user */
  escalationSuggested: boolean;

  /** Escalation urgency level */
  escalationType: "soft" | "hard" | "none";

  /** Which signal(s) triggered the escalation */
  triggerTypes: EscalationTriggerType[];

  /** Pre-built debug context for ticket creation (only populated when escalationSuggested=true) */
  escalationContext?: EscalationContext;
}

export type EscalationTriggerType =
  | "low_canonical_confidence" // S1: canonical miss or confidence='low'
  | "entity_resolution_failure" // S2: no entity match
  | "repeated_failure" // S3: 2+ failures in session
  | "explicit_user_request" // S4: user typed escalation intent
  | "rag_low_similarity"; // S5: best vector result < 0.5
```

### §2.2 — Escalation Context (attached to ticket)

```typescript
export interface EscalationContext {
  /** Which signal(s) triggered escalation */
  triggerTypes: EscalationTriggerType[];

  /** The exact query that failed */
  query: string;

  /** Reference to the chat session (not a copy — just the ID) */
  conversationId?: string;

  /** Product context at time of failure */
  productContext?: {
    page?: string;
    feature?: string;
    workflow?: string;
    plan?: string;
    userRole?: string;
  };

  /** Retrieval debug — what AI searched and found */
  retrievalDebug?: {
    /** Canonical retrieval result */
    canonicalResult: {
      found: boolean;
      confidence: "high" | "medium" | "low" | "none";
      fallbackReason?: string;
      matchedEntityIds: string[];
    };
    /** Top-5 RAG results (doc ID + similarity score only) */
    ragResults?: Array<{
      docId: string;
      title: string;
      similarityScore: number;
    }>;
    /** Query used for embedding (may differ from user query if image was processed) */
    effectiveQuery?: string;
  };

  /** Entity resolution debug — how resolver interpreted the query */
  entityDebug?: {
    /** Tokens extracted from query */
    queryTokens: string[];
    /** Top-3 entity candidates with scores */
    candidates: Array<{
      entityId: string;
      entityName?: string;
      score: number;
    }>;
    /** Final resolved entity (if any) */
    resolvedEntityId?: string;
    /** Confidence of entity resolution */
    confidence: number;
  };

  /** Timestamp of the escalation */
  escalatedAt: string; // ISO string
}
```

### §2.3 — SupportTicketType Extension

Added to existing `src/types/supportTicket.ts`:

```typescript
export interface SupportTicketType {
  // ... existing fields ...

  /** AI escalation context (only present on tickets created via escalation) */
  escalationContext?: EscalationContext;

  /** Whether this ticket is a candidate for knowledge creation (System 9) */
  knowledgeCandidate?: boolean;

  /** How this ticket was created */
  source?: "manual" | "ai_escalation";
}
```

---

## §3 — Escalation Evaluator

### §3.1 — Location

New file: `src/lib/answerlattice/escalationEvaluator.ts`

### §3.2 — Logic

```typescript
/**
 * Evaluate whether a search result should trigger escalation.
 *
 * Called at the END of coreSearch() pipeline (after answer generation).
 * Returns EscalationMetadata to be included in CoreSearchResult.
 *
 * Feature-flagged: ENABLE_ANSWERLATTICE_AI_ESCALATION
 * Non-blocking: errors return escalationType='none'
 */
export function evaluateEscalation(params: {
  canonicalResult: CanonicalRetrievalResult;
  ragDocuments: Array<{ id: string; title: string; similarityScore: number }>;
  searchQuery: string;
  sessionFailureCount?: number; // Number of previous low-confidence results in this session
  productContext?: AnswerlatticeContextPayload;
  queryTokens?: string[];
  entityCandidates?: Array<{
    entityId: string;
    entityName?: string;
    score: number;
  }>;
}): EscalationMetadata;
```

### §3.3 — Trigger Evaluation Rules

```
S1 (Low Canonical Confidence):
  IF canonicalResult.found === false
  AND canonicalResult.confidence === 'low'
  AND canonicalResult.fallbackReason contains 'no_entity_match' or 'entity_match_below_threshold'
  → SOFT escalation

S2 (Entity Resolution Failure):
  IF canonicalResult.matchedEntityIds.length === 0
  AND ragDocuments.length === 0
  → HARD escalation (AI has nothing useful)

  IF canonicalResult.matchedEntityIds.length === 0
  AND ragDocuments.length > 0
  → SOFT escalation (RAG may have something)

S3 (Repeated Failure):
  IF sessionFailureCount >= 2
  → HARD escalation (regardless of current result quality)

S4 (Explicit User Request):
  Handled in frontend BEFORE calling coreSearch().
  Regex patterns: /talk to (a )?human/i, /create (a )?ticket/i,
                   /speak to (an )?agent/i, /this (isn't|is not|didn't) help/i,
                   /need (more )?help/i, /contact support/i

S5 (RAG Low Similarity):
  IF ragDocuments.length > 0
  AND ragDocuments[0].similarityScore < 0.5
  → SOFT escalation
```

### §3.4 — Escalation Type Resolution

When multiple signals fire, highest urgency wins:

```
HARD > SOFT > NONE

Priority order: S4 > S3 > S2 > S1 > S5
```

### §3.5 — Rate Limiting

Per-tenant daily escalation cap:

```
MAX_ESCALATIONS_PER_TENANT_PER_DAY = 10
```

Tracked via in-memory counter in `coreSearch()` (resets on server restart). Not persisted to Firestore.

---

## §4 — Integration Points

### §4.1 — coreSearch() Modification

In `src/lib/search/searchCore.ts`, after Stage 7 (answer generation):

```typescript
// ===== STAGE 7.5: ESCALATION EVALUATION =====
let escalation: EscalationMetadata = {
  escalationSuggested: false,
  escalationType: "none",
  triggerTypes: [],
};

if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_AI_ESCALATION) {
  try {
    const { evaluateEscalation } =
      await import("@lib/answerlattice/escalationEvaluator");
    escalation = evaluateEscalation({
      canonicalResult,
      ragDocuments: documentsMatched.slice(0, 5).map((d) => ({
        id: d.id,
        title: d.title,
        similarityScore: d.similarityScore,
      })),
      searchQuery,
      sessionFailureCount: input.sessionFailureCount,
      productContext,
      // Entity debug data captured from canonical retrieval internals
    });
  } catch {
    // Graceful degradation — escalation failure never blocks search
  }
}

// Include escalation metadata in result
return {
  ...result,
  escalation,
};
```

### §4.2 — CoreSearchResult Extension

In `src/lib/search/types.ts`:

```typescript
export interface CoreSearchResult {
  // ... existing fields ...

  /** Escalation metadata (only present when ENABLE_ANSWERLATTICE_AI_ESCALATION is ON) */
  escalation?: EscalationMetadata;
}
```

### §4.3 — CoreSearchInput Extension

In `src/lib/search/types.ts`:

```typescript
export interface CoreSearchInput {
  // ... existing fields ...

  /** Number of previous low-confidence results in this chat session (for S3 trigger) */
  sessionFailureCount?: number;
}
```

### §4.4 — API Route Response Extension

In `src/app/api/helpCenter/search-kb/route.ts`:

```typescript
// Add escalation data to response
if (result.escalation?.escalationSuggested) {
  response.escalation = {
    suggested: true,
    type: result.escalation.escalationType,
    triggers: result.escalation.triggerTypes,
    context: result.escalation.escalationContext,
  };
}
```

### §4.5 — Help Chat Frontend

In `src/components/templates/main-app/helpChat/`:

1. **ChatPanel.tsx / MessageBubble.tsx** — Show "Still need help?" button when `escalation.suggested === true`
2. **New: EscalationTicketModal.tsx** — Pre-filled ticket creation modal
3. **useChatHandlers.ts** — Track `sessionFailureCount`, detect explicit escalation intent (S4)

### §4.6 — Ticket Creation Enhancement

In `src/database/tickets/index.ts`, modify `addTicket()`:

```typescript
// After existing signal emission:
if (data.source === "ai_escalation" && data.escalationContext) {
  emitAnswerlatticeSignal({
    type: ANSWERLATTICE_SIGNAL_TYPE.ESCALATION,
    tId: submitData.tId,
    sId: submitData.sId,
    metadata: {
      ticketId: docRef.id,
      query: data.escalationContext.query,
      triggerTypes: data.escalationContext.triggerTypes,
      conversationId: data.escalationContext.conversationId,
    },
  });
}
```

---

## §5 — Retrieval Debug Capture

### §5.1 — What to Capture

Retrieval debug is built inside `coreSearch()` and attached to `EscalationContext.retrievalDebug`:

| Field                              | Source                                 | Size       |
| ---------------------------------- | -------------------------------------- | ---------- |
| `canonicalResult.found`            | `attemptCanonicalRetrieval()` return   | 1 byte     |
| `canonicalResult.confidence`       | `attemptCanonicalRetrieval()` return   | ~6 bytes   |
| `canonicalResult.fallbackReason`   | `attemptCanonicalRetrieval()` return   | ~50 bytes  |
| `canonicalResult.matchedEntityIds` | `attemptCanonicalRetrieval()` return   | ~100 bytes |
| `ragResults` (top-5)               | `documentsMatched` after vector search | ~300 bytes |
| `effectiveQuery`                   | `queryForEmbedding` variable           | ~100 bytes |

**Total: ~560 bytes per escalation**

### §5.2 — What NOT to Capture

- ❌ Document content (too large)
- ❌ Embedding vectors (irrelevant for debugging)
- ❌ Full RAG payload sent to Gemini
- ❌ Gemini response (already in craftedAnswer)
- ❌ Performance metrics (already in perf logs)

### §5.3 — Capture Location

Inside `coreSearch()`, after RAG vector search (Stage 5):

```typescript
const retrievalDebug = {
  canonicalResult: {
    found: canonicalResult.found,
    confidence: canonicalResult.confidence,
    fallbackReason: canonicalResult.fallbackReason,
    matchedEntityIds: canonicalResult.matchedEntityIds,
  },
  ragResults: documentsMatched.slice(0, 5).map((d) => ({
    docId: d.id,
    title: d.title || "Untitled",
    similarityScore: Math.round(d.similarityScore * 1000) / 1000,
  })),
  effectiveQuery: queryForEmbedding,
};
```

---

## §6 — Entity Match Debug Capture

### §6.1 — What to Capture

Entity debug requires exposing internals from `canonicalRetrieval.ts`:

| Field                | Source                            | Size       |
| -------------------- | --------------------------------- | ---------- |
| `queryTokens`        | `tokenizeQuery()` output          | ~80 bytes  |
| `candidates` (top-3) | `matchEntitiesFromIndex()` output | ~200 bytes |
| `resolvedEntityId`   | Best match entity ID              | ~30 bytes  |
| `confidence`         | Best match score                  | ~8 bytes   |

**Total: ~320 bytes per escalation**

### §6.2 — Implementation Approach

Modify `attemptCanonicalRetrieval()` to return entity debug data:

```typescript
export interface CanonicalRetrievalResult {
  // ... existing fields ...

  /** Entity resolution debug (for escalation context) */
  entityDebug?: {
    queryTokens: string[];
    candidates: Array<{ entityId: string; entityName?: string; score: number }>;
    resolvedEntityId?: string;
    confidence: number;
  };
}
```

Populate from existing `matchedEntities` array (already computed, just not returned):

```typescript
// After matchEntitiesFromIndex():
const entityDebug = {
  queryTokens,
  candidates: matchedEntities.slice(0, 3).map((m) => ({
    entityId: m.entityId,
    score: Math.round(m.score * 100) / 100,
  })),
  resolvedEntityId:
    matchedEntities.length > 0 ? matchedEntities[0].entityId : undefined,
  confidence: matchedEntities.length > 0 ? matchedEntities[0].score : 0,
};
```

---

## §7 — File Structure

### New Files (3)

| File                                                                   | Purpose                                    | Lines (est.) |
| ---------------------------------------------------------------------- | ------------------------------------------ | ------------ |
| `src/lib/answerlattice/escalationEvaluator.ts`                              | Escalation trigger logic + context builder | ~150         |
| `src/lib/answerlattice/escalationTypes.ts`                                  | Type definitions for escalation            | ~80          |
| `src/components/templates/main-app/helpChat/EscalationTicketModal.tsx` | Pre-filled ticket creation modal           | ~200         |

### Modified Files (7)

| File                                        | Change                                                                                     | Impact       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------ |
| `src/lib/search/types.ts`                   | Add `EscalationMetadata` to `CoreSearchResult`, `sessionFailureCount` to `CoreSearchInput` | Additive     |
| `src/lib/search/searchCore.ts`              | Add Stage 7.5 escalation evaluation                                                        | Non-breaking |
| `src/lib/answerlattice/canonicalRetrieval.ts`    | Return `entityDebug` in `CanonicalRetrievalResult`                                         | Additive     |
| `src/types/supportTicket.ts`                | Add `escalationContext`, `knowledgeCandidate`, `source` to `SupportTicketType`             | Additive     |
| `src/database/tickets/index.ts`             | Emit ESCALATION signal for ai_escalation tickets                                           | Non-breaking |
| `src/app/api/helpCenter/search-kb/route.ts` | Pass escalation data in response                                                           | Additive     |
| `src/config/features.ts`                    | Add `ENABLE_ANSWERLATTICE_AI_ESCALATION` flag                                                   | Additive     |

### Files NOT Modified

- `src/lib/answerlattice/signalEmitter.ts` — Already supports ESCALATION type
- `src/lib/answerlattice/signalMutation.ts` — Already clusters ESCALATION signals with 3x weight
- `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` — Already processes escalation signals
- `src/database/answerlattice/signalEvents.ts` — Already stores escalation events

---

## §8 — Build Order

1. **Types first** — `escalationTypes.ts` + extensions to `types.ts` + `supportTicket.ts`
2. **Retrieval debug** — Modify `canonicalRetrieval.ts` to return `entityDebug`
3. **Escalation evaluator** — `escalationEvaluator.ts` (pure function, easy to test)
4. **Pipeline integration** — Modify `coreSearch()` to call evaluator
5. **API response** — Modify search-kb route to include escalation data
6. **Frontend UI** — `EscalationTicketModal.tsx` + help chat integration
7. **Ticket enrichment** — Modify `addTicket()` for ESCALATION signal
8. **Feature flag** — Add `ENABLE_ANSWERLATTICE_AI_ESCALATION` to `features.ts`

---

## §9 — Explicit Escalation Intent Detection

### §9.1 — Phrases (English)

```typescript
const ESCALATION_INTENT_PATTERNS = [
  /\btalk\s+to\s+(a\s+)?human\b/i,
  /\bspeak\s+to\s+(an?\s+)?agent\b/i,
  /\bcreate\s+(a\s+)?ticket\b/i,
  /\bcontact\s+support\b/i,
  /\bneed\s+(more\s+)?help\b/i,
  /\bthis\s+(isn't|is\s+not|didn't|does\s+not)\s+help/i,
  /\bnot\s+help(ful|ing)\b/i,
  /\breal\s+person\b/i,
  /\bhuman\s+support\b/i,
];
```

### §9.2 — Detection Location

In frontend (`useChatHandlers.ts`), BEFORE calling the search API:

```typescript
function detectExplicitEscalation(query: string): boolean {
  return ESCALATION_INTENT_PATTERNS.some((p) => p.test(query));
}
```

If detected, skip search and directly open `EscalationTicketModal` with the query as subject.

---

## §10 — ADRs (Architecture Decision Records)

### ADR-1: Inline Storage vs Cloud Storage

**Decision:** Store escalation debug data inline on the Firestore ticket document.
**Rationale:** At Answerlattice scale (~5-50 escalations/day), total escalation data is ~44KB/day. Firestore document limit is 1MB. Cloud Storage adds unnecessary complexity (bucket management, lifecycle policies, URL generation).
**Constraint:** Cap retrieval debug to top-5 docs, entity debug to top-3 candidates.

### ADR-2: No Pub/Sub

**Decision:** Use existing fire-and-forget Firestore writes (same as ticket signals).
**Rationale:** Answerlattice has no GCP Pub/Sub infrastructure. All async processing uses Firestore triggers or nightly batch. Adding Pub/Sub for escalation events is over-engineering at current scale.

### ADR-3: Session Failure Count via Frontend

**Decision:** Track `sessionFailureCount` in frontend state, pass to search API.
**Rationale:** The backend is stateless per request. Tracking repeated failures requires session awareness, which the frontend already has (chat session state). Avoids server-side session storage.

### ADR-4: Explicit Escalation in Frontend

**Decision:** Detect explicit escalation intent ("talk to human") in frontend before calling search API.
**Rationale:** If user wants to escalate, making them wait for an AI search result is bad UX. Frontend detection allows immediate ticket form without API call.

### ADR-5: No Sentiment Analysis

**Decision:** Defer sentiment-driven escalation (ALL CAPS, angry words) to future iteration.
**Rationale:** Answerlattice's ICP is SaaS founders/developers — rational, technical users. Sentiment analysis adds complexity with low ROI for this audience. The 5 existing triggers cover all critical escalation scenarios.

---

## §11 — Backwards Compatibility

| Component                  | Impact                                 | Risk                                          |
| -------------------------- | -------------------------------------- | --------------------------------------------- |
| `CoreSearchResult`         | Additive field (`escalation`)          | Zero — undefined when flag OFF                |
| `CoreSearchInput`          | Additive field (`sessionFailureCount`) | Zero — optional, defaults to 0                |
| `CanonicalRetrievalResult` | Additive field (`entityDebug`)         | Zero — optional                               |
| `SupportTicketType`        | Additive fields                        | Zero — optional                               |
| `coreSearch()`             | New stage 7.5                          | Feature-flagged, dynamic import               |
| Search API response        | New `escalation` object                | Additive, ignored by clients not expecting it |
| Ticket creation            | Additional signal emission             | Fire-and-forget, non-blocking                 |

**Verdict:** All changes are additive and feature-flagged. Zero breaking changes.
