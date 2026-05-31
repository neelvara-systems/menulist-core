# Entity System — Specification

> **Version:** 2.0.0
> **Last Updated:** 2026-03-08
> **Audience:** CEO, PM, Product
> **Status:** ENHANCEMENT — 6 targeted improvements to existing infrastructure

---

## 1. Problem Statement

Answerlattice's entity system (Pillar 1 — Product Ontology) is **architecturally complete** but has a critical operational gap: **entities are disconnected from KB articles**. The canonical answer engine uses entities (`scope.entityIds`), but the knowledge base articles — the raw documentation that feeds everything — have no entity references.

This means:
- Entity extraction creates candidates → entities, but doesn't map back to source articles
- RAG fallback retrieval cannot use entity-centric filtering (falls back to pure vector search)
- Entity coverage metrics cannot measure how well articles cover product concepts
- The entity graph is "floating" — exists but isn't wired into the article lifecycle

---

## 2. System Goals

The 6 enhancements achieve one objective: **close the entity loop** so that entities flow naturally from article creation through retrieval to answer generation.

| Goal | Metric |
|------|--------|
| Entities linked to KB articles | 100% of published articles have entityIds |
| Duplicate entity reduction | Entity reuse rate >70% during extraction |
| Automatic entity synchronization | Entity graph updates on every article save |
| Better RAG fallback quality | Entity descriptions included in LLM context |
| Entity hygiene over time | Merge capability prevents graph fragmentation |
| Owner governance | Aliases manageable directly on entity documents |

---

## 3. Enhancement Specifications

### E1 — Add `aliases[]` to AnswerlatticeEntity

**What:** Add an `aliases: string[]` field to the `AnswerlatticeEntity` interface and entity documents.

**Why:** Currently aliases only exist on `AnswerlatticeEntitySearchIndex.synonyms`. Entity documents themselves don't carry aliases, making governance harder — owners can't see or edit aliases when managing entities.

**User Flow:**
1. Owner opens entity detail in governance dashboard
2. Sees current aliases listed
3. Can add/remove aliases
4. Aliases auto-sync to search index synonyms

**Invariants:**
- Aliases are lowercase, trimmed, deduplicated
- Maximum 20 aliases per entity
- Aliases must be unique across the tenant's entity registry (no two entities share an alias)

---

### E2 — Add `entityIds[]` to KB Articles

**What:** Add an `entityIds: string[]` field to `KnowledgeBaseArticleType` — the core KB article interface.

**Why:** This is the **most critical enhancement**. It creates the bidirectional entity-article mapping that ChatGPT correctly identified as essential:
- Article → entities (via entityIds)
- Entity → articles (via Firestore `array-contains` query)

**User Flow:**
1. Author creates/edits KB article
2. On save, AI extraction runs asynchronously
3. System suggests entities (matched from registry + new candidates)
4. Author sees entity suggestions panel in editor
5. Author confirms/modifies entity tags
6. Article saved with entityIds

**Invariants:**
- Maximum 10 entityIds per article (prevents entity dilution)
- Only active entity IDs allowed (no deprecated/archived)
- entityIds stored as Firestore string array (supports `array-contains` queries)
- Empty entityIds allowed (some articles may not map to product concepts)

---

### E3 — Registry-Guided Entity Extraction

**What:** Enhance the extraction prompt to include existing entities as context, so AI prefers reusing existing entities over creating new ones.

**Why:** Current extraction (`entityExtraction.ts`) runs blind — it doesn't know what entities already exist. This causes duplicate candidates. By passing the existing registry, extraction becomes:
- "Webhook Retry" → matches existing "Retry Policy" entity
- "API Token" → matches existing "API Keys" entity

**User Flow:**
1. Article saved → extraction triggered
2. System loads existing entities for tenant (filtered by relevance)
3. AI extraction prompt includes: "Existing entities: [list]. Prefer reusing existing entities."
4. AI output marks each entity as `source: "existing"` or `source: "new"`
5. Existing matches → attach entityId directly
6. New entities → create candidate for review

**Invariants:**
- Maximum 50 existing entities passed as context (to stay within token limits)
- Entities filtered by category/section relevance before passing to AI
- AI must output structured JSON with `source` field
- Existing entity name must match exactly (case-insensitive)

---

### E4 — Auto-Extract Entities on Article Save

**What:** Trigger entity extraction automatically when a KB article is created or updated.

**Why:** Currently extraction is manual (called from admin UI). Articles can be saved without entity mapping, leaving the entity graph stale.

**User Flow:**
1. Author saves article in KB editor
2. System fires async entity extraction job (non-blocking)
3. Extraction runs → entities matched → entityIds updated on article
4. If new entities found → candidates created for review
5. Author sees entity suggestions on next edit

**Invariants:**
- Extraction is async — never blocks article save
- Extraction only runs if article content changed (debounce)
- Feature-flagged: `ENABLE_ANSWERLATTICE_ONTOLOGY` must be true
- Extraction failure never corrupts article data (graceful degradation)
- Rate limited: max 1 extraction per article per 5 minutes

---

### E5 — Entity Merge Capability

**What:** Allow owners to merge two entities into one, transferring all references.

**Why:** Over time, similar entities accumulate (e.g., "Webhook Retry", "Retry Policy", "Webhook Retry Policy"). Merging keeps the graph clean.

**User Flow:**
1. Owner selects two entities in governance UI
2. Chooses which entity survives (canonical)
3. System transfers: article entityIds, canonical answer scope.entityIds, search index entries, relations
4. Surviving entity gains merged entity's name as alias
5. Merged entity marked with status `merged` (soft delete)
6. Audit log records the merge

**Invariants:**
- Cannot merge entities of different types
- Merged entity is never hard-deleted (audit trail)
- All references atomically transferred
- Merge is irreversible (by design — owner can always create new entities)

---

### E6 — Entity-Enriched RAG Context

**What:** When RAG fallback triggers (no canonical answer found), include entity descriptions in the LLM context for better answer quality.

**Why:** Currently RAG fallback sends raw article chunks to the LLM without entity context. Adding entity descriptions gives the model semantic grounding.

**User Flow (invisible to user):**
1. Query arrives → canonical retrieval fails (no matching canonical answer)
2. System detects entities from query (existing Layer 1 logic)
3. Fetches entity descriptions for detected entities
4. Includes entity context block in RAG prompt:
   ```
   Relevant Product Concepts:
   - Webhooks: HTTP callbacks triggered when events occur.
   - Rate Limits: Restrictions on API request frequency.
   ```
5. RAG answer is grounded in entity semantics

**Invariants:**
- Maximum 5 entity descriptions in context (token budget)
- Entity descriptions ≤200 chars each
- Only active entities included
- Zero additional Firestore reads if entities already loaded during canonical retrieval attempt

---

## 4. Entity Lifecycle (Complete Loop)

```
                  ┌─────────────────────────────┐
                  │     KB Article Created       │
                  └─────────────┬───────────────┘
                                │
                    ┌───────────▼────────────┐
                    │  AI Entity Extraction   │
                    │  (registry-guided)      │
                    └───────────┬────────────┘
                                │
                  ┌─────────────▼───────────────┐
                  │  Match Existing Entities?    │
                  └──────┬──────────────┬───────┘
                         │              │
                    YES  │              │  NO
                         │              │
              ┌──────────▼─────┐  ┌─────▼──────────────┐
              │ Attach entityId│  │ Create Candidate    │
              │ to article     │  │ Entity              │
              └──────────┬─────┘  └─────┬──────────────┘
                         │              │
                         │    ┌─────────▼──────────┐
                         │    │  Owner Reviews      │
                         │    │  Approve/Reject/    │
                         │    │  Merge              │
                         │    └─────────┬──────────┘
                         │              │
                         │    ┌─────────▼──────────┐
                         │    │  Promote to Entity  │
                         │    │  + Search Index     │
                         │    └─────────┬──────────┘
                         │              │
              ┌──────────▼──────────────▼───────────┐
              │     Entity Registry (Canonical)      │
              └──────────┬──────────────────────────┘
                         │
              ┌──────────▼──────────────────────────┐
              │  Canonical Answer Retrieval          │
              │  (scope.entityIds → answer)          │
              └──────────┬──────────────────────────┘
                         │
              ┌──────────▼──────────────────────────┐
              │  Query Signals → Coverage Metrics    │
              │  → Drift Detection → Mutation        │
              └─────────────────────────────────────┘
```

---

## 5. What Is NOT Being Built (Explicit Rejections)

| Rejected Concept | ChatGPT Proposed | Reason for Rejection |
|-----------------|-----------------|---------------------|
| Entity Memory (query learning) | Yes | No queries/tenants yet. Premature. |
| Cross-Tenant Pattern Intelligence | Yes | No tenants. Zero data to learn from. |
| Support Reasoning Engine | Yes | Overkill. Canonical answers + guided workflows sufficient. |
| Knowledge Execution Control | Yes | Canonical retrieval already enforces evidence boundaries. |
| Knowledge Trust & Confidence System | Yes | `confidenceScore` fields already exist on entities + answers. |
| Product Surface Awareness (new collection) | Yes | `AnswerlatticeContextPayload` already handles this. |
| Multi-pass Global Extraction | Yes | Single-pass sufficient for <300 articles. |
| Article Summarization/Chunking | Yes | Valuable but separate enhancement. Not entity-specific. |
| Reverse Entity Index (entity_articles) | Yes | Firestore `array-contains` sufficient for <5000 articles. |
| Separate entity_aliases collection | Yes | Aliases on entity + synonyms on search index is simpler. |
| Primary/Secondary/Context entity classes | Yes (then rejected by ChatGPT too) | Over-engineering. Article hierarchy provides context. |

---

## 6. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Article entity coverage | >80% of published articles have ≥1 entityId | Nightly audit |
| Entity reuse rate | >70% during extraction | Extraction logs |
| Candidate approval rate | >60% | Candidate status distribution |
| Entity density per article | 2-5 entities average | Article entityIds.length |
| Duplicate entity rate | <10% | Candidate merge count / total |
| RAG answer quality | Measurably better with entity context | A/B comparison (future) |
