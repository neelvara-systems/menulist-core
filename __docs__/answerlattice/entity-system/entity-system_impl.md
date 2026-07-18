# Entity System — Implementation Blueprint

> **Version:** 2.0.2
> **Last Updated:** 2026-07-18
> **Audience:** Developers
> **Status:** MAINTAINED — Entity loop implemented; best-effort extraction and rollout gates documented

---

## 1. Existing Infrastructure Map

### 1.1 Types (`src/types/answerlattice/index.ts`)

| Type                        | Lines   | Purpose                                                                              |
| --------------------------- | ------- | ------------------------------------------------------------------------------------ |
| `AnswerlatticeEntity`            | 44-64   | Entity document: id, tId, sId, type, name, slug, description, status, currentVersion |
| `AnswerlatticeEntityType`        | 24-34   | 7 types: feature, plan, role, workflow, state, integration, error                    |
| `AnswerlatticeEntityStatus`      | 36-42   | 3 states: active, deprecated, beta                                                   |
| `AnswerlatticeEntityRelation`    | 77-88   | fromEntityId → toEntityId with relationType                                          |
| `AnswerlatticeRelationType`      | 66-75   | 6 types: available_in, restricted_by, requires, part_of, transitions_to, triggers    |
| `AnswerlatticeEntitySearchIndex` | 316-329 | entityId, canonicalName, synonyms, normalizedTokens, weight                          |
| `AnswerlatticeEntityCandidate`   | 344-363 | name, type, confidence, frequency, description, status                               |
| `AnswerlatticeCandidateStatus`   | 335-342 | 4 states: pending, approved, rejected, merged                                        |

### 1.2 DAL Files

| File                                         | Functions | Purpose                                       |
| -------------------------------------------- | --------- | --------------------------------------------- |
| `src/database/answerlattice/entities.ts`          | 12        | Scoped validated reads plus server-owned ontology/governance mutations |
| `src/database/answerlattice/entityCandidates.ts`  | 7         | Scoped validated candidate reads plus server-owned review/promotion actions |
| `src/database/answerlattice/canonicalAnswers.ts`  | 8         | Answers bound to entities via scope.entityIds |
| `src/database/answerlattice/signalEvents.ts`      | 4         | Signal events with entityId                   |
| `src/database/answerlattice/mutationProposals.ts` | 7         | Proposals with relatedEntityIds               |
| `src/database/answerlattice/auditLogs.ts`         | 3         | Audit trail for entity operations             |
| `src/database/answerlattice/releases.ts`          | 6         | Version management; activation keeps advisory drift failures non-blocking while storing fixed audit failure codes and bounded source-error metadata only |

### 1.3 Core Logic

| File                                     | Purpose                                          |
| ---------------------------------------- | ------------------------------------------------ |
| `src/lib/answerlattice/entityExtraction.ts`   | AI entity extraction from KB articles            |
| `src/lib/answerlattice/canonicalRetrieval.ts` | 3-layer canonical-first retrieval                |
| `src/lib/answerlattice/driftDetection.ts`     | 4-class drift governance                         |
| `src/lib/answerlattice/signalMutation.ts`     | Signal → mutation proposal pipeline              |
| `src/lib/answerlattice/tokenizer.ts`          | Shared tokenizer for index + query normalization |

Answerlattice entity retrieval ID boundary: `src/lib/answerlattice/entityLookup.ts` and `src/lib/answerlattice/canonicalRetrieval.ts` normalize entity IDs through the resolved-entity helpers in `src/lib/answerlattice/governanceIdBoundary.ts` before direct `answerlattice_entities/{entityId}` reads. Search-index and context-boost entity IDs that are malformed, unresolved, reserved, or path-shaped are skipped before Firestore refs are built; valid entity retrieval behavior and query shapes are unchanged.

Answerlattice App Entity Candidate ID Boundary: `src/database/answerlattice/entityCandidates.ts` validates persisted candidate rows on read and normalizes candidate IDs before calling the protected `review_candidate` or `promote_candidate` server action. The browser DAL performs no candidate writes. Invalid IDs fail before the server action, while the server transaction revalidates persisted workspace ownership and lifecycle state.

Answerlattice App Entity DAL ID Boundary: `src/database/answerlattice/entities.ts` validates persisted entity/relation/search-index rows on scoped reads and normalizes action IDs before protected ontology/governance calls. Entity, relation and search-index mutations are server-owned; the browser DAL performs no direct writes. Invalid IDs fail before action dispatch, while the server transaction owns persisted scope, counters, invalidation and operation replay.

### 1.4 Hooks

| File                                         | Purpose                                           |
| -------------------------------------------- | ------------------------------------------------- |
| `src/hooks/answerlattice/useEntities.ts`          | Entity CRUD + relations + search index management |
| `src/hooks/answerlattice/useCanonicalAnswers.ts`  | Canonical answer CRUD + drift                     |
| `src/hooks/answerlattice/useEntityCandidates.ts`  | Candidate review + promote                        |
| `src/hooks/answerlattice/useMutationProposals.ts` | Mutation proposal review                          |

Hook failure states and toasts use fixed local copy. Firestore, callable, provider, route, or browser exception text must not be copied into entity, canonical-answer, candidate, or mutation-proposal dashboard messages.

### 1.5 Feature Flags (`src/config/features.ts`)

| Flag                                | Purpose                          | Required For |
| ----------------------------------- | -------------------------------- | ------------ |
| `ENABLE_ANSWERLATTICE_ONTOLOGY`          | Entity extraction + search index | E1-E5        |
| `ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS` | Canonical-first retrieval        | E6           |
| `ENABLE_ANSWERLATTICE_GOVERNANCE_UI`     | Admin entity dashboards          | E1, E5       |

### 1.6 DB Collections (`src/constants/database.ts`)

| Constant                       | Collection Name   |
| ------------------------------ | ----------------- |
| `ANSWERLATTICE_ENTITIES`            | entities          |
| `ANSWERLATTICE_ENTITY_RELATIONS`    | entityRelations   |
| `ANSWERLATTICE_ENTITY_SEARCH_INDEX` | entitySearchIndex |
| `ANSWERLATTICE_ENTITY_CANDIDATES`   | entityCandidates  |
| `ANSWERLATTICE_CANONICAL_ANSWERS`   | canonicalAnswers  |
| `ANSWERLATTICE_SIGNAL_EVENTS`       | signalEvents      |
| `ANSWERLATTICE_MUTATION_PROPOSALS`  | mutationProposals |
| `ANSWERLATTICE_AUDIT_LOGS`          | auditLogs         |
| `ANSWERLATTICE_RELEASES`            | releases          |

---

## 2. Enhancement E1 — Add `aliases[]` to AnswerlatticeEntity

### 2.1 Type Change

**File:** `src/types/answerlattice/index.ts`
**Change:** Add `aliases` field to `AnswerlatticeEntity` interface (additive — freeze-compliant)

```typescript
export interface AnswerlatticeEntity {
  // ... existing fields ...

  aliases?: string[]; // NEW: Lowercase aliases for this entity (max 20)
  // e.g., ["api key", "token", "access token"] for entity "API Keys"
}
```

### 2.2 DAL Changes

**File:** `src/database/answerlattice/entities.ts`

No new functions needed. Existing `updateEntity()` already handles partial updates with merge. The `aliases` field will be writable through the existing update path.

Current `addEntity()` delegates to the protected server ontology transaction. That transaction creates entity/search-index/counter/invalidation/operation state atomically. After commit, the server awaits tenant-summary discovery synchronization. If the derived summary write fails, the request fails and the same idempotent ontology action can be retried; a replay then re-attempts the summary sync instead of silently losing scheduler discovery state.

### 2.3 Hook Changes

**File:** `src/hooks/answerlattice/useEntities.ts`

Add `updateAliases` convenience function:

```typescript
const updateAliases = useCallback(
  async (entityId: string, aliases: string[]) => {
    const cleaned = aliases
      .map((a) => a.toLowerCase().trim())
      .filter((a) => a.length >= 2)
      .slice(0, 20);
    const unique = [...new Set(cleaned)];
    await update({ id: entityId, aliases: unique });
  },
  [update],
);
```

### 2.4 Search Index Sync

When aliases are updated on an entity, also sync to the entity's search index `synonyms` field. Add sync logic in the update function or as a separate sync step.

**Pattern:** Entity aliases → search index synonyms (one-way sync, entity is source of truth)

### 2.5 Validation Rules

- Aliases must be lowercase, trimmed
- Minimum 2 characters per alias
- Maximum 20 aliases per entity
- No duplicate aliases within same entity
- No alias can match another entity's canonical name or alias within same tenant

---

## 3. Enhancement E2 — Add `entityIds[]` to KB Articles

### 3.1 Type Change

**File:** `src/types/knowledgeBase.ts`
**Change:** Add `entityIds` field to `KnowledgeBaseArticleType` (additive)

```typescript
export interface KnowledgeBaseArticleType {
  // ... existing fields (line 161-183) ...

  entityIds?: string[]; // NEW: Answerlattice entity IDs linked to this article (max 10)
}
```

Also add to `IngestionJobArticle`:

```typescript
export interface IngestionJobArticle {
  // ... existing fields ...

  entityIds?: string[]; // NEW: Entity IDs extracted during ingestion
}
```

### 3.2 No New DAL Functions

Existing KB article DAL already handles arbitrary fields via Firestore merge writes. The `entityIds` field will be writable through existing update paths.

### 3.3 Article Save Integration

`src/database/knowledgeBase/articles.ts` starts the protected extraction request after a successful create or eligible content update. Known active entities may update `entityIds`; new concepts appear in the existing entity-candidate review queue. There is no separate article-editor suggestion panel in the maintained runtime.

### 3.4 Query Pattern

The default-off bounded hybrid evidence lane uses `entityIds` only after canonical and approved FAQ miss, only for a query with an exact technical literal, and only when deterministic entity resolution produced valid entity IDs:

```typescript
where("pId", "==", "AL");
where("tId", "==", tId);
where("sId", "==", sId);
where("status", "==", "published");
where("active", "==", true);
where("entityIds", "array-contains-any", detectedEntityIds.slice(0, 10));
limit(12);
```

Returned articles are admitted only when their title, tags, or body contains an exact technical literal from the query. The eligible lane is fused with similarity-qualified vector results; it does not replace vector search, canonical priority, source governance, or human approval.

### 3.5 Migration

Existing articles have no `entityIds` field. Migration approach:

- **Lazy migration:** Run extraction when article is next edited
- **Controlled backfill:** Requires a separately verified bounded operator workflow; no article-wide batch action is claimed here.
- No urgency — articles without entityIds continue to work via existing vector search

---

## 4. Enhancement E3 — Registry-Guided Entity Extraction

### 4.1 File Changes

**File:** `src/lib/answerlattice/entityExtraction.ts`

### 4.2 Enhanced Extraction Function Signature

```typescript
export async function extractEntitiesFromArticles(
  articles: { title: string; content: string; category?: string }[],
  tId: number,
  sId: number,
  callGemini: (
    systemPrompt: string,
    userPrompt: string,
  ) => Promise<string | null>,
  existingEntities?: { name: string; slug: string; aliases?: string[] }[], // NEW
): Promise<ExtractionResult>;
```

### 4.3 Enhanced Prompt

Add existing entity context to the extraction prompt:

```typescript
function buildExtractionPrompt(
  articles: { title: string; content: string; category?: string }[],
  existingEntities?: { name: string; slug: string; aliases?: string[] }[],
): string {
  let prompt = `Extract product entities from these knowledge base articles:\n\n`;

  // Add existing entity context
  if (existingEntities && existingEntities.length > 0) {
    const entityList = existingEntities
      .slice(0, 50) // Token budget limit
      .map(
        (e) =>
          `- ${e.name}${e.aliases?.length ? ` (also: ${e.aliases.join(", ")})` : ""}`,
      )
      .join("\n");
    prompt += `EXISTING ENTITIES (prefer reusing these over creating new ones):\n${entityList}\n\n`;
    prompt += `IMPORTANT: If an entity matches an existing entity, use the EXACT existing name.\nOnly create new entities if no existing entity covers the concept.\n\n`;
  }

  // Add articles
  const articleTexts = articles
    .map(
      (a, i) =>
        `--- Article ${i + 1}: "${a.title}" (Category: ${a.category || "Unknown"}) ---\n${a.content.substring(0, 2000)}`,
    )
    .join("\n\n");

  prompt += articleTexts;
  prompt += `\n\nReturn JSON with entities. For each entity, include "source": "existing" or "source": "new".`;

  return prompt;
}
```

### 4.4 Enhanced Output Type

```typescript
export interface ExtractedEntityRaw {
  name: string;
  type: AnswerlatticeEntityType;
  confidence: number;
  description: string;
  source?: "existing" | "new"; // NEW: whether AI matched existing entity
}
```

### 4.5 Enhanced Matching Logic

After AI extraction, perform post-processing matching against existing entities:

```typescript
function matchToExisting(
  extracted: ExtractedEntityRaw,
  existingEntities: AnswerlatticeEntity[],
): { matched: boolean; entityId?: string } {
  const normalizedName = extracted.name.toLowerCase().trim();

  // Exact name match
  const exactMatch = existingEntities.find(
    (e) =>
      e.name.toLowerCase() === normalizedName ||
      e.slug === normalizedName.replace(/\s+/g, "-"),
  );
  if (exactMatch) return { matched: true, entityId: exactMatch.id };

  // Alias match
  const aliasMatch = existingEntities.find((e) =>
    e.aliases?.some((a) => a.toLowerCase() === normalizedName),
  );
  if (aliasMatch) return { matched: true, entityId: aliasMatch.id };

  return { matched: false };
}
```

---

## 5. Enhancement E4 — Auto-Extract on Article Save

**Current status:** Implemented. `addArticle()` and content, title, or category updates call `_triggerEntityExtraction()`, which posts only the article ID to `/api/answerlattice/articles/extract-entities` when ontology is enabled. The protected route re-reads the stored article as the authoritative extraction input.

### 5.1 Current Integration Boundary

- The browser trigger runs only after the article write succeeds and never blocks that write.
- The route re-reads the stored article, validates exact product/tenant/workspace scope, loads at most 500 scoped rows, keeps only active Answerlattice entities, performs registry-guided extraction, records AI usage, writes governed new candidates, and replaces the article link set with at most 10 normalized matched `entityIds` after a confirmed extraction.
- A confirmed empty match clears stale links. Provider, parsing, or incomplete-batch failure preserves existing links and returns failure. Unchanged links avoid an article write and cache invalidation.
- The trigger is best effort. Browser interruption or network failure may leave an article unmapped, so coverage review and explicit retry remain necessary.
- New candidate entities still require human review; the extraction path does not auto-approve product truth.

### 5.2 Existing Helper

**File:** `src/lib/answerlattice/entityExtraction.ts`

```typescript
export async function extractEntitiesForArticle(
  article: { id: string; title: string; content: any; categoryTitle?: string },
  tId: number,
  sId: number,
  callGemini: (systemPrompt: string, userPrompt: string) => Promise<string | null>,
): Promise<{ entityIds: string[]; newCandidateCount: number } | null>
```

The standalone helper is not used by the live route. Its in-memory five-minute cooldown is not a durable cross-instance lease and must not be treated as the post-save trigger's retry or idempotency contract.

### 5.3 Operational Gate

Measure unmapped published articles, extraction failures, candidate review volume, AI usage, and entity-linked answer outcomes. Do not claim every save is synchronized durably until a server-owned retry boundary exists.

---

## 6. Enhancement E5 — Entity Merge

### 6.1 Server-Owned Merge Transaction

**Files:** `src/database/answerlattice/entities.ts`, `src/lib/answerlattice/governanceClient.ts`, `src/app/api/answerlattice/governance/actions/route.ts`, `src/lib/answerlattice/governanceServer.ts`

The DAL sends `{ action: 'merge_entities', requestId, survivorId, mergedId }` to the protected governance route. The browser does not send trusted tenant/store/actor fields and does not update canonical answers, relations, search indexes, entities, or audit logs directly.

The Admin Firestore transaction:

1. Validates same-type active entities inside the authenticated workspace.
2. Loads bounded canonical references, KB article references, survivor active answers, inbound/outbound relations, and entity-search rows.
3. Rewrites canonical and article entity references and rejects a merge that would create overlapping active answer scopes/version windows.
4. Rewrites or removes relations, merges aliases, updates/removes search-index rows, and deprecates the merged entity.
5. Writes before/after canonical audit snapshots plus one idempotent `entity_merged` audit.
6. Increments affected canonical/KB/entity/relation source versions and marks compiled context stale.

Reference and write caps stop the operation before Firestore transaction limits; larger migrations require a controlled server migration.

### 6.2 Hook Addition

**File:** `src/hooks/answerlattice/useEntities.ts`

The hook calls the server-backed DAL and reports transferred answer/article/relation counts:

```typescript
const merge = useCallback(
  async (survivorId: string, mergedId: string) => {
    try {
      const result = await mergeEntities(survivorId, mergedId, tId, sId);
      if (result?.success) {
        const transferred = Number(result.transferredAnswers || 0)
          + Number(result.transferredArticles || 0)
          + Number(result.transferredRelations || 0);
        message.success(
          `Entities merged. ${transferred} reference(s) transferred.`,
        );
        await refresh();
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Merge failed");
    }
  },
  [tId, sId, refresh],
);
```

---

## 7. Enhancement E6 — Entity-Enriched RAG Context

### 7.1 Integration Point

**File:** `src/lib/search/searchCore.ts`

After canonical retrieval fails and before RAG runs, inject entity context:

```typescript
// After canonical retrieval attempt
if (!canonicalResult.found && canonicalResult.matchedEntityIds.length > 0) {
  // Fetch entity descriptions for detected entities
  const entityDescriptions = await getEntityDescriptions(
    canonicalResult.matchedEntityIds,
    tId,
    sId,
  );
  // Prepend to RAG context
  if (entityDescriptions.length > 0) {
    ragContextPrefix = buildEntityContextBlock(entityDescriptions);
  }
}
```

### 7.2 Helper Functions

**File:** `src/lib/answerlattice/canonicalRetrieval.ts`

```typescript
export async function getEntityDescriptions(
  entityIds: string[],
  tId: number,
  sId: number,
): Promise<{ name: string; description: string }[]> {
  const descriptions: { name: string; description: string }[] = [];

  for (const entityId of entityIds.slice(0, 5)) {
    const entity = await getEntityByIdServer(entityId, tId, sId);
    if (entity && entity.status === "active" && entity.description) {
      descriptions.push({
        name: entity.name,
        description: entity.description.substring(0, 200),
      });
    }
  }

  return descriptions;
}

export function buildEntityContextBlock(
  entities: { name: string; description: string }[],
): string {
  if (entities.length === 0) return "";

  const block = entities.map((e) => `- ${e.name}: ${e.description}`).join("\n");

  return `\nRelevant Product Concepts:\n${block}\n\n`;
}
```

---

## 8. Current Implementation State

| Enhancement | Current status | Next action |
| ----------- | -------------- | ----------- |
| E1 — Aliases on entity | Complete | Maintain entity as alias source of truth |
| E2 — entityIds on articles | Complete | Evaluate coverage with real support questions |
| E3 — Registry-guided extraction | Complete | Keep tenant scope and candidate review |
| E4 — Post-save extraction | Complete, best effort | Instrument failures and unmapped-article coverage |
| E5 — Entity merge | Complete | Keep server-owned governance and audit |
| E6 — Entity-enriched RAG | Complete | Measure answer-quality impact |

---

## 9. Runtime File Map

| File | Responsibility |
| ---- | -------------- |
| `src/types/answerlattice/index.ts` | Entity aliases and governance types |
| `src/types/knowledgeBase.ts` | Article `entityIds` contract |
| `src/lib/answerlattice/entityExtraction.ts` | Registry-guided extraction and standalone single-article helper |
| `src/app/api/answerlattice/articles/extract-entities/route.ts` | Protected scoped post-save extraction workflow |
| `src/database/knowledgeBase/articles.ts` | Best-effort post-save trigger |
| `src/database/answerlattice/entities.ts` | Alias synchronization and entity merge DAL |
| `src/lib/answerlattice/governanceServer.ts` | Server-owned governed merge transaction |
| `src/lib/search/searchCore.ts` | Entity-enriched fallback and default-off exact technical evidence lane |

## 10. Type Check Verification

After all enhancements:

```bash
npx tsc --noEmit
```

Must produce **zero errors**.

All type changes are additive (`?` optional fields). No breaking changes to existing code.

---

## 11. ADRs (Architecture Decision Records)

### ADR-1: Aliases on Entity vs Separate Collection

**Decision:** Add `aliases[]` directly on `AnswerlatticeEntity` document.
**Rejected:** Separate `entity_aliases` collection (ChatGPT's suggestion).
**Reason:** Fewer Firestore reads. Entity + aliases fetched in single read. Search index `synonyms` remains as secondary copy for fast lookup. Entity is source of truth for aliases.

### ADR-2: entityIds on KB Articles vs Canonical Answers Only

**Decision:** Add `entityIds[]` on BOTH KB articles AND keep `scope.entityIds` on canonical answers.
**Reason:** Canonical answers are for deterministic retrieval. KB articles need entityIds for RAG fallback to use entity-centric filtering. Different purposes, both needed.

### ADR-3: Registry-Guided vs Blind Extraction

**Decision:** Pass existing entities as AI context during extraction.
**Rejected:** Blind extraction (current behavior) + post-hoc matching only.
**Reason:** Registry context is intended to reduce duplicate proposals; deterministic post-processing remains authoritative. Measure the actual reuse and rejection rates before making a reduction claim.

### ADR-4: Async Extraction vs Blocking

**Current decision:** Trigger the protected extraction route after successful article create or eligible content update without blocking the article write.
**Constraint:** Treat the browser trigger as best effort, record bounded failures, and preserve human review for new entities.
**Reason:** Article save remains fast while the route owns scope validation, AI accounting, candidate governance, and article-link persistence.

### ADR-5: Entity Merge vs Hard Delete

**Decision:** Merge transfers references, adds name as alias, marks as deprecated.
**Rejected:** Hard deletion of merged entity.
**Reason:** Audit trail. Historical references. Entity IDs in audit logs, signals, etc. remain valid pointers to a deprecated entity rather than dangling references.
