# Entity System — Specification

> **Version:** 2.0.0
> **Last Updated:** 2026-07-18
> **Audience:** CEO, PM, Product
> **Status:** MAINTAINED — Six entity-loop capabilities are implemented; post-save extraction is best effort and hybrid retrieval remains rollout-gated

---

## 1. Problem Statement

Answerlattice's entity system (Pillar 1 — Product Ontology) links entities to KB articles and canonical answer scopes. The remaining product problem is operational: maintain those links safely as articles and entities change, preserve human review for new truth, and prove that entity-aware retrieval improves real answer outcomes.

Current boundaries:
- Post-save extraction is best effort and feature-flagged; it never blocks the article write.
- Existing entity matches may update article `entityIds`; new concepts remain candidates for review.
- Canonical answers retain priority over entity-linked fallback retrieval.
- Entity merge must preserve canonical, relation, search-index, and article references transactionally.

---

## 2. System Goals

The 6 enhancements achieve one objective: **close the entity loop** so that entities flow naturally from article creation through retrieval to answer generation.

| Goal | Metric |
|------|--------|
| Entities linked to KB articles | Published-article entity-link coverage, including explicit unmapped articles |
| Duplicate entity reduction | Entity reuse rate during extraction |
| Post-save entity synchronization | Eligible article saves trigger scoped extraction without blocking the save |
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

**Why:** It creates the bidirectional entity-article mapping required by governed retrieval:
- Article → entities (via entityIds)
- Entity → articles (via Firestore `array-contains` query)

**Current User Flow:**
1. Author creates an article or saves an eligible content update.
2. The article write completes first.
3. A best-effort browser request calls the protected extraction route.
4. Active known entities may be linked to the article, capped at 10.
5. Unknown concepts become candidates in the separate governance review queue.
6. A failed request leaves the authoritative article save intact and requires coverage review or retry.

**Invariants:**
- Maximum 10 entityIds per article (prevents entity dilution)
- Only active entity IDs allowed (no deprecated/archived)
- entityIds stored as Firestore string array (supports `array-contains` queries)
- Empty entityIds allowed (some articles may not map to product concepts)

---

### E3 — Registry-Guided Entity Extraction

**What:** Enhance the extraction prompt to include existing entities as context, so AI prefers reusing existing entities over creating new ones.

**Why:** Registry context lets extraction prefer existing governed concepts and leaves deterministic name, slug, and alias matching as the final reuse boundary.
- "Webhook Retry" → matches existing "Retry Policy" entity
- "API Token" → matches existing "API Keys" entity

**User Flow:**
1. Article saved → extraction triggered
2. The protected route loads at most 500 scoped entity rows and keeps only active Answerlattice entities.
3. The extraction prompt includes at most 50 existing entities and asks the model to prefer reuse.
4. Post-extraction matching resolves exact names, slugs, and owner-managed aliases deterministically.
5. Existing matches attach normalized entity IDs, capped at 10.
6. New entities create governed candidates for review.

**Invariants:**
- Maximum 50 existing entities passed as context (to stay within token limits)
- Only active `pId = AL` entity rows from the exact workspace may be reused.
- At most 50 existing entities are placed in the prompt.
- Model output must be structured JSON; final known-entity matching uses name, slug, or alias.
- Persisted article entity IDs are normalized, deduplicated, and capped at 10.

---

### E4 — Auto-Extract Entities on Article Save

**Current status:** Implemented as a best-effort post-save trigger to the protected extraction route when ontology is enabled.

**What:** Trigger entity extraction automatically when a KB article is created or updated.

**Why:** Article entity links otherwise drift as content changes. The maintained path attempts extraction after save without making the article write depend on an AI call.

**User Flow:**
1. Author saves article in KB editor
2. The browser starts a best-effort request to the protected extraction route.
3. The route re-reads the stored article, verifies product and workspace ownership, and attempts extraction.
4. A confirmed successful extraction replaces the article's entity IDs, including clearing stale links when no current match remains, and invalidates KB-backed retrieval only when links changed.
5. New concepts become candidates for governance review.
6. Failure is logged without rolling back the article save.

**Invariants:**
- Extraction is async — never blocks article save
- Create and eligible updates that include content and title trigger the request.
- Feature-flagged: `ENABLE_ANSWERLATTICE_ONTOLOGY` must be true
- Extraction or provider-response failure preserves the stored article links and returns a visible failed request.
- The protected route applies the existing AI-operation rate limit before provider work.
- The live browser trigger has no durable retry lease or per-article five-minute debounce.

---

### E5 — Entity Merge Capability

**What:** Allow owners to merge two entities into one, transferring all references.

**Why:** Over time, similar entities accumulate (e.g., "Webhook Retry", "Retry Policy", "Webhook Retry Policy"). Merging keeps the graph clean.

**User Flow:**
1. Owner selects two entities in governance UI
2. Chooses which entity survives (canonical)
3. System transfers: article entityIds, canonical answer scope.entityIds, search index entries, relations
4. Surviving entity gains merged entity's name as alias
5. Merged entity marked `deprecated` (soft delete)
6. Audit log records the merge

**Invariants:**
- Cannot merge entities of different types
- Merged entity is never hard-deleted (audit trail)
- Bounded canonical, article, relation, and search-index references are transferred atomically; an over-limit merge is rejected for controlled migration.
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
- At most five exact-scope entity point reads; failures degrade without blocking RAG.

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
| Entity Memory (query learning) | Yes | Interactions are evidence signals, not approved product truth. Keep human review. |
| Cross-Tenant Pattern Intelligence | Yes | Violates the tenant-isolated product boundary and is not required for the founder wedge. |
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

| Metric | Decision use | Measurement |
|---|---|---|
| Published article mapping coverage | Find missing or failed extraction work | Mapped and explicitly unmapped published articles |
| Entity reuse rate | Detect duplicate-candidate pressure | Existing matches divided by all valid extracted concepts |
| Candidate review outcome | Evaluate extraction usefulness | Approved, merged, edited, and rejected candidates |
| Stale-link correction rate | Verify post-save synchronization | Articles whose stored entity set changed after confirmed extraction |
| Hybrid retrieval uplift | Decide whether to enable the lane | Answer Tests with technical literals and ordinary-language controls |
| Answer-quality regressions | Block rollout | Citation, unsupported-claim, freshness, and abstention failures |
