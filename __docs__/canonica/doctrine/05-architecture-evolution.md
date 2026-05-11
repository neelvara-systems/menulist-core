# Canonica — Architecture Evolution Blueprint

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Source:** ChatGPT strategic session + Cascade codebase validation
> **Rule:** No code changes — documentation only. Schemas adapted to existing MenuList patterns.

---

## 1. Current State → Target State

### Current: Advanced AI Support Platform (Document-RAG Core)
- Articles = TipTap JSON blobs with metadata
- RAG = embedding + vector search over article content
- Answers = ephemeral Gemini outputs (cached but not governed)
- Signals = generate reports (feedbackIntelligence, kbQuality, weeklyNarrative)
- Tickets = full lifecycle workflow (SLA, messaging, audit trail)
- No product ontology, no version binding, no drift governance

### Target: Support Knowledge Control Plane (Entity-Canonical Core)
- Entities = first-class product concepts with relationships
- Knowledge = canonical answer objects (versioned, scoped, governed)
- Retrieval = canonical-first, deterministic entity resolution
- Signals = propose mutations to knowledge graph
- Drift = deterministic detection (4 classes)
- Operations = secondary, signal source only

---

## 2. Five-Pillar Assessment (Against Codebase)

### Pillar 1 — Product Ontology Layer
**Status:** ❌ Missing

**What exists:** KB categories → sections → articles. Article metadata (status, source, embedding, tags). No independent entity collections.

**What's needed:**
- `entities` collection — features, plans, roles, workflows, states, integrations, error codes
- `entityRelations` collection — explicit typed relationships
- Article schema extended with `referencedEntityIds: string[]`

**Cascade recommendation:** Follow existing DAL patterns. Use `DB_COLLECTIONS` constants. Entity schema must include `tenantId` (unlike current global KB). Use `requestBodyComposer` for all writes.

**Reference patterns from existing codebase:**
- MCE (Menu Correctness Engine) — 17 validation rules against structured product data → informs drift detection
- MOL (Menu Observation Layer) — append-only event ledger → informs signal event collection
- `menuVersion` + `lastPublishedAt` on projects → informs release registry

### Pillar 2 — Canonical Answer Engine
**Status:** ⚠️ Early (answers are ephemeral)

**What exists:** AI-generated answers cached in `aiSearchHistory`. Response caching by cache key. Chat session persistence with message feedback.

**What's needed:**
- `canonicalAnswers` collection — frozen schema (see Section 3 below)
- Retrieval logic: canonical-first → RAG fallback
- Version window filtering
- Scope matching (plan/role/state)

**Cascade recommendation:** `canonicalAnswers` collection must follow `DB_COLLECTIONS` pattern. Use `apiCallComposer` wrapper. Version numbers stored as normalized integers (pattern from `menuVersion`).

### Pillar 3 — Version & Drift Governance
**Status:** ❌ Missing

**What exists:** Quality scoring based on similarity. KB quality scoring via Cloud Function. No product version awareness.

**What's needed:**
- `releases` collection — immutable, append-only, with entityChanges
- 4 drift classes: version_mismatch, signal_anomaly, scope_conflict, deprecated_entity
- Nightly drift audit job (Canonica Cloud Function, exported from `functions-canonica/src/index.ts`)
- Release-triggered drift evaluation

**Cascade recommendation:** Reuse the scheduler reliability pattern, but keep the runtime in `functions-canonica/`. Add drift evaluation to the Canonica scheduler. Feature flag: `ENABLE_CANONICA_DRIFT_DETECTION`.

### Pillar 4 — Signal Mutation Engine
**Status:** ⚠️ Partial (signals generate reports, not entity updates)

**What exists:** Ticket lifecycle with SLA. Chat feedback. Negative feedback alerts. Knowledge gap detection. Aggregated analytics.

**What's needed:**
- `signalEvents` collection — raw friction events (tickets, chat negative, escalations)
- `mutationProposals` collection — governed mutation queue
- Entity-based signal clustering
- Post-mutation impact tracking

**Cascade recommendation:** Signal events follow MOL pattern (append-only, tenant-scoped). Mutation proposals follow existing `requestBodyComposer` pattern with status lifecycle.

### Pillar 5 — API & Integration Layer
**Status:** ⚠️ Partial

**What exists:** 3 clean API routes for AI search. Clear DAL pattern. Multi-tenant scoping.

**What's needed:**
- Public canonical answer retrieval API
- Version-aware answer endpoint
- Drift event webhook (outbound)
- Signal ingestion endpoint (inbound)
- Entity registry read endpoint

**Cascade recommendation:** Follow existing API route patterns (`withAuth()`, Zod validation, rate limiting, SAFE_MODE). All new routes need feature flags.

---

## 3. Canonical Answer Schema (Adapted to MenuList Patterns)

ChatGPT proposed a schema. Cascade adapts it to match existing codebase patterns:

```typescript
// Collection: canonicalAnswers (via DB_COLLECTIONS.CANONICAL_ANSWERS)
// Scoping: tenantId (mandatory)

interface CanonicalAnswer {
  id: string;
  tenantId: string;  // MANDATORY — unlike current global KB
  
  title: string;
  slug: string;
  
  status: 'active' | 'needs_review' | 'deprecated' | 'archived';
  
  scope: {
    entityIds: string[];      // Bound ontology entities (mandatory ≥1)
    planIds?: string[];       // Optional plan restrictions
    roleIds?: string[];       // Optional role restrictions
    stateIds?: string[];      // Optional state conditions
  };

  productBinding: {
    introducedInVersion: number;         // Normalized integer (e.g., 002004001)
    lastValidatedInVersion: number;      // Normalized integer
    applicableVersions: {
      from: number;          // Normalized integer
      to?: number | null;    // null = current
    };
  };

  content: {
    structuredSummary: string;           // ≤500 chars — deterministic answer core
    detailedExplanation: string;         // Rich but declarative
    edgeCases?: string;                  // Optional
    constraints?: string;               // Limits, restrictions, caveats
  };

  validation: {
    confidenceScore: number;             // 0-1 (derived, not manual)
    validationSource: 'manual' | 'signal_cluster' | 'release_review';
    lastValidatedOn: Timestamp;
    validatedBy: string;
  };

  signalMetrics: {
    linkedTicketCount: number;           // Derived from signalEvents
    linkedChatCount: number;
    negativeFeedbackCount: number;
    lastSignalAt?: Timestamp;
  };

  governance: {
    driftFlag: boolean;                  // Derived, not toggled
    driftReason?: string;
    reviewRequired: boolean;
  };

  // Auto-injected by requestBodyComposer:
  createdOn: Timestamp;
  modifiedOn: Timestamp;
  createdBy: string;
  modifiedBy: string;
}
```

**Key adaptations from ChatGPT's schema:**
- Added `tenantId` (ChatGPT's schema didn't explicitly include it)
- Version numbers as normalized integers (not strings) — matches existing `menuVersion` pattern
- Timestamps as `Timestamp` type — matches existing Firestore convention
- `createdOn/modifiedOn/createdBy/modifiedBy` — via `requestBodyComposer` (existing pattern)

---

## 4. Entity Schema (Adapted)

```typescript
// Collection: entities (via DB_COLLECTIONS.CANONICA_ENTITIES)
interface CanonicaEntity {
  id: string;
  tenantId: string;
  
  type: 'feature' | 'plan' | 'role' | 'workflow' | 'state' | 'integration' | 'error';
  name: string;
  slug: string;
  description: string;
  
  status: 'active' | 'deprecated' | 'beta';
  
  currentVersion: number;  // Normalized integer
  
  createdOn: Timestamp;
  modifiedOn: Timestamp;
  createdBy: string;
  modifiedBy: string;
}

// Collection: entityRelations (via DB_COLLECTIONS.CANONICA_ENTITY_RELATIONS)
interface CanonicaEntityRelation {
  id: string;
  tenantId: string;
  fromEntityId: string;
  toEntityId: string;
  relationType: 'available_in' | 'restricted_by' | 'requires' | 'part_of' | 'transitions_to' | 'triggers';
  
  createdOn: Timestamp;
  modifiedOn: Timestamp;
}

// Collection: releases (via DB_COLLECTIONS.CANONICA_RELEASES)
interface CanonicaRelease {
  id: string;
  tenantId: string;
  versionLabel: string;        // e.g., "2.4.1"
  versionNormalized: number;   // e.g., 002004001
  releasedAt: Timestamp;
  entityChanges: string[];     // entityIds modified in this release
  status: 'pending' | 'processing' | 'active';
  
  createdOn: Timestamp;
  createdBy: string;
}
```

---

## 5. Drift Detection Logic

### 4 Drift Classes (Frozen)

| Class | Trigger | Detection Method |
|-------|---------|-----------------|
| **A — Version Drift** | Release registered with entityChanges | `release.versionNormalized > answer.lastValidatedInVersion` AND `entityIds intersect release.entityChanges` |
| **B — Signal Drift** | Rolling 14-day negative feedback spike | `negativeFeedbackCount / linkedChatCount > threshold` OR `ticket cluster > 2× baseline` |
| **C — Scope Conflict** | Multiple active answers overlap | Same entityIds + overlapping version window + overlapping scope |
| **D — Orphan Drift** | Entity deprecated but answer active | `entity.status = deprecated` AND `answer.status = active` AND `entityId still bound` |

### Execution Model
- Release-triggered (synchronous after release activation)
- Nightly scheduled audit (Cloud Function, follows existing scheduler pattern)
- Signal-triggered batch (after signal aggregation)

### Output
Updates `governance.driftFlag` + `governance.driftReason` on CanonicalAnswer.
Emits `DriftEvent` to audit collection.

---

## 6. Signal Mutation Engine

### Signal Sources (Frozen — Only 3)
1. Ticket clusters (by entity binding)
2. Chat negative feedback clusters (by entity binding)
3. Escalation patterns (by entity binding)

### Mutation Proposal Types (Frozen — Only 4)
1. `content_refinement` — Answer exists but unclear
2. `scope_adjustment` — Answer valid for specific plan/role/state only
3. `version_update` — Behavior changed in release
4. `new_answer_required` — Entity exists but no canonical answer

### Flow
```
Signal events → Entity-based clustering → MutationProposal created
  → Admin reviews → Approves/Rejects
  → If approved: CanonicalAnswer updated (transactional)
  → Post-mutation impact tracked (14-day window)
```

### Governance
- Signals do NOT auto-modify knowledge
- All mutations require human approval
- Mutation cannot bypass entity binding
- Mutation cannot create overlapping version windows
- All mutations logged to audit trail

---

## 7. Ontology Bootstrap Strategy

**Approach:** AI-assisted extraction from existing KB + human validation

### Pipeline
1. **Extract** — Run structured AI pass over KB articles, ticket subjects, chat clusters, error strings → produce entity candidates
2. **Score** — Frequency scoring: article mentions (0.4) + ticket mentions (0.3) + chat mentions (0.2) + API reference bonus (0.1)
3. **Validate** — Admin dashboard shows candidates with confidence, frequency, examples → approve/edit/merge/discard
4. **Bind** — Approved entities written to `entities` collection. Articles updated with `referencedEntityIds`

### Extraction Rules (Strict)
- Must represent real product concepts (not UI labels, not generic nouns)
- Must appear in ≥3 articles OR ≥5 ticket/chat mentions
- Must be versionable (would meaningfully change across releases)
- Must be scope-independent (describable without single sentence)
- Must classify into exactly one of the 7 entity types
- Descriptions must be declarative, not instructional, ≤3 sentences

### What Exists Already That Helps
- KB generation pipeline (ingestion + AI processing + review) → extend for entity extraction
- TipTap JSON text extraction (`extractPlainTextFromEditorContent`) → reuse for entity mining
- Gemini integration → reuse for structured extraction prompts

---

## 8. Retrieval Architecture (Frozen)

### 3-Layer Mapping Stack

**Layer 1 — Deterministic Entity Index (Primary)**
- Inverted index: entity slug → synonyms → normalized tokens → weight
- No LLM involved. Resolves 70-85% of common queries.

**Layer 2 — Intent Classifier (Lightweight)**
- Rule-based categories: how_to, why_error, feature_availability, permission_issue, integration_problem, state_transition
- Keyword + pattern detection. No generative AI.

**Layer 3 — LLM Extraction (Fallback Assist)**
- Only when deterministic mapping confidence < threshold
- LLM output validated against known entity whitelist
- LLM cannot invent new entities at runtime

### Full Retrieval Flow
```
User Query
  → Normalize + tokenize
  → Deterministic Entity Index lookup
  → Resolve context (plan, role, version, state)
  → Filter CanonicalAnswers (entityIds + version window + scope)
  → Specificity scoring (rule-based)
  → Return canonical answer
  
  If ambiguous → LLM assist (validate against whitelist)
  If no canonical → RAG fallback (logged as non_canonical)
  If recurring fallback → auto-generate MutationProposal
```

---

## 9. Implementation Sequence (Adapted to Codebase)

All new collections use existing patterns:
- `DB_COLLECTIONS` constant in `src/constants/database.ts` + `functions/src/constants/database.ts`
- DAL files in `src/database/canonica/` (new folder)
- Feature flags in `src/config/features.ts`
- Cloud Functions follow existing scheduler pattern
- Types in `src/types/canonica.ts` (new file)

| Sprint | Deliverable | Weeks |
|--------|------------|:-----:|
| 1 | Entity + CanonicalAnswer + Release schemas + tenantId enforcement + indexes | 2-3 |
| 2 | Canonical-first retrieval pipeline + entity index + fallback instrumentation | 2-3 |
| 3 | Drift engine (4 classes) + nightly audit CF + governance dashboard | 2 |
| 4 | Mutation engine + approval workflow + audit trail | 2-3 |
| 5 | Isolation hardening + security + RBAC | 2 |
| 6 | Stress testing + SLO validation + IRC certification | 2-3 |
| **Total** | | **~14-16 weeks** |
