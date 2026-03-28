# Entity System — Implementation Blueprint

> **Version:** 2.0.0
> **Last Updated:** 2026-03-08
> **Audience:** Developers
> **Status:** ENHANCEMENT — 6 targeted changes to existing infrastructure

---

## 1. Existing Infrastructure Map

### 1.1 Types (`src/types/canonica/index.ts`)

| Type                        | Lines   | Purpose                                                                              |
| --------------------------- | ------- | ------------------------------------------------------------------------------------ |
| `CanonicaEntity`            | 44-64   | Entity document: id, tId, sId, type, name, slug, description, status, currentVersion |
| `CanonicaEntityType`        | 24-34   | 7 types: feature, plan, role, workflow, state, integration, error                    |
| `CanonicaEntityStatus`      | 36-42   | 3 states: active, deprecated, beta                                                   |
| `CanonicaEntityRelation`    | 77-88   | fromEntityId → toEntityId with relationType                                          |
| `CanonicaRelationType`      | 66-75   | 6 types: available_in, restricted_by, requires, part_of, transitions_to, triggers    |
| `CanonicaEntitySearchIndex` | 316-329 | entityId, canonicalName, synonyms, normalizedTokens, weight                          |
| `CanonicaEntityCandidate`   | 344-363 | name, type, confidence, frequency, description, status                               |
| `CanonicaCandidateStatus`   | 335-342 | 4 states: pending, approved, rejected, merged                                        |

### 1.2 DAL Files

| File                                         | Functions | Purpose                                       |
| -------------------------------------------- | --------- | --------------------------------------------- |
| `src/database/canonica/entities.ts`          | 12        | Full entity CRUD + relations + search index   |
| `src/database/canonica/entityCandidates.ts`  | 7         | Candidate lifecycle + promote pipeline        |
| `src/database/canonica/canonicalAnswers.ts`  | 8         | Answers bound to entities via scope.entityIds |
| `src/database/canonica/signalEvents.ts`      | 4         | Signal events with entityId                   |
| `src/database/canonica/mutationProposals.ts` | 7         | Proposals with relatedEntityIds               |
| `src/database/canonica/auditLogs.ts`         | 3         | Audit trail for entity operations             |
| `src/database/canonica/releases.ts`          | 6         | Version management                            |

### 1.3 Core Logic

| File                                     | Purpose                                          |
| ---------------------------------------- | ------------------------------------------------ |
| `src/lib/canonica/entityExtraction.ts`   | AI entity extraction from KB articles            |
| `src/lib/canonica/canonicalRetrieval.ts` | 3-layer canonical-first retrieval                |
| `src/lib/canonica/driftDetection.ts`     | 4-class drift governance                         |
| `src/lib/canonica/signalMutation.ts`     | Signal → mutation proposal pipeline              |
| `src/lib/canonica/tokenizer.ts`          | Shared tokenizer for index + query normalization |

### 1.4 Hooks

| File                                         | Purpose                                           |
| -------------------------------------------- | ------------------------------------------------- |
| `src/hooks/canonica/useEntities.ts`          | Entity CRUD + relations + search index management |
| `src/hooks/canonica/useCanonicalAnswers.ts`  | Canonical answer CRUD + drift                     |
| `src/hooks/canonica/useEntityCandidates.ts`  | Candidate review + promote                        |
| `src/hooks/canonica/useMutationProposals.ts` | Mutation proposal review                          |

### 1.5 Feature Flags (`src/config/features.ts`)

| Flag                                | Purpose                          | Required For |
| ----------------------------------- | -------------------------------- | ------------ |
| `ENABLE_CANONICA_ONTOLOGY`          | Entity extraction + search index | E1-E5        |
| `ENABLE_CANONICA_CANONICAL_ANSWERS` | Canonical-first retrieval        | E6           |
| `ENABLE_CANONICA_GOVERNANCE_UI`     | Admin entity dashboards          | E1, E5       |

### 1.6 DB Collections (`src/constants/database.ts`)

| Constant                       | Collection Name   |
| ------------------------------ | ----------------- |
| `CANONICA_ENTITIES`            | entities          |
| `CANONICA_ENTITY_RELATIONS`    | entityRelations   |
| `CANONICA_ENTITY_SEARCH_INDEX` | entitySearchIndex |
| `CANONICA_ENTITY_CANDIDATES`   | entityCandidates  |
| `CANONICA_CANONICAL_ANSWERS`   | canonicalAnswers  |
| `CANONICA_SIGNAL_EVENTS`       | signalEvents      |
| `CANONICA_MUTATION_PROPOSALS`  | mutationProposals |
| `CANONICA_AUDIT_LOGS`          | auditLogs         |
| `CANONICA_RELEASES`            | releases          |

---

## 2. Enhancement E1 — Add `aliases[]` to CanonicaEntity

### 2.1 Type Change

**File:** `src/types/canonica/index.ts`
**Change:** Add `aliases` field to `CanonicaEntity` interface (additive — freeze-compliant)

```typescript
export interface CanonicaEntity {
  // ... existing fields ...

  aliases?: string[]; // NEW: Lowercase aliases for this entity (max 20)
  // e.g., ["api key", "token", "access token"] for entity "API Keys"
}
```

### 2.2 DAL Changes

**File:** `src/database/canonica/entities.ts`

No new functions needed. Existing `updateEntity()` already handles partial updates with merge. The `aliases` field will be writable through the existing update path.

### 2.3 Hook Changes

**File:** `src/hooks/canonica/useEntities.ts`

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

  entityIds?: string[]; // NEW: Canonica entity IDs linked to this article (max 10)
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

### 3.3 Article Editor Integration

**File:** Entity suggestion panel in KB article editor (new component)

When author saves article, the entity suggestion panel shows detected entities:

```
Detected Entities:
✓ Webhooks (existing)
✓ Retry Policy (existing)
✓ Rate Limits (existing)
○ Delivery Logs (new — will create candidate)

[Confirm] [Edit]
```

### 3.4 Query Pattern

With `entityIds` on articles, RAG fallback can now use entity-centric article retrieval:

```typescript
// Firestore query
where("entityIds", "array-contains", detectedEntityId);
```

This replaces or supplements pure vector search with deterministic entity-based filtering.

### 3.5 Migration

Existing articles have no `entityIds` field. Migration approach:

- **Lazy migration:** Run extraction when article is next edited
- **Batch migration:** Optional admin action to extract entities for all published articles
- No urgency — articles without entityIds continue to work via existing vector search

---

## 4. Enhancement E3 — Registry-Guided Entity Extraction

### 4.1 File Changes

**File:** `src/lib/canonica/entityExtraction.ts`

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
  type: CanonicaEntityType;
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
  existingEntities: CanonicaEntity[],
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

### 5.1 Integration Point

**File:** KB article save handler (wherever articles are saved to Firestore)

After the article document is written, fire an async extraction job:

```typescript
// After article save succeeds
if (FEATURE_FLAGS.ENABLE_CANONICA_ONTOLOGY) {
  // Fire-and-forget — never block article save
  extractEntitiesForArticle(article, tId, sId, callGemini).catch((err) => {
    console.error("Entity extraction failed (non-blocking):", err);
  });
}
```

### 5.2 New Function

**File:** `src/lib/canonica/entityExtraction.ts` (add to existing file)

```typescript
export async function extractEntitiesForArticle(
  article: { id: string; title: string; content: any; categoryTitle?: string },
  tId: number,
  sId: number,
): Promise<{ entityIds: string[]; newCandidates: number }> {
  // 1. Load existing entities for context
  const { getEntities } = await import("@database/canonica/entities");
  const existing = await getEntities(tId, sId);

  // 2. Convert TipTap JSON to plain text for extraction
  const textContent = extractPlainText(article.content);

  // 3. Run registry-guided extraction
  const { callGeminiChat } = await import("@lib/vectorEmbeddings");
  const result = await extractEntitiesFromArticles(
    [
      {
        title: article.title,
        content: textContent,
        category: article.categoryTitle,
      },
    ],
    tId,
    sId,
    async (system, user) => callGeminiChat(user, [], null, undefined, system),
    existing?.map((e) => ({ name: e.name, slug: e.slug, aliases: e.aliases })),
  );

  // 4. Match extracted entities to existing registry
  const entityIds: string[] = [];
  let newCandidates = 0;

  for (const candidate of result.candidates) {
    const match = matchToExisting(candidate, existing || []);
    if (match.matched && match.entityId) {
      entityIds.push(match.entityId);
    } else {
      newCandidates++;
      // Candidate already created by extractEntitiesFromArticles
    }
  }

  // 5. Update article with entityIds
  // (use existing KB article update DAL)

  return { entityIds, newCandidates };
}
```

### 5.3 Debounce

Use a simple per-article debounce to prevent rapid re-extraction:

```typescript
const EXTRACTION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const extractionTimestamps = new Map<string, number>();

function shouldExtract(articleId: string): boolean {
  const last = extractionTimestamps.get(articleId) || 0;
  if (Date.now() - last < EXTRACTION_COOLDOWN_MS) return false;
  extractionTimestamps.set(articleId, Date.now());
  return true;
}
```

---

## 6. Enhancement E5 — Entity Merge

### 6.1 New DAL Function

**File:** `src/database/canonica/entities.ts` (add to existing file)

```typescript
export const mergeEntities = async (
  survivorId: string,
  mergedId: string,
  tId: number,
  sId: number,
): Promise<{ success: boolean; transferredRefs: number }> => {
  return await apiCallComposer(
    async () => {
      // 1. Fetch both entities
      const survivor = await getEntityById(survivorId);
      const merged = await getEntityById(mergedId);
      if (!survivor || !merged) throw new Error("Entity not found");
      if (survivor.type !== merged.type)
        throw new Error("Cannot merge entities of different types");

      // 2. Transfer canonical answer references
      const { getCanonicalAnswers, updateCanonicalAnswer } =
        await import("@database/canonica/canonicalAnswers");
      const answers = await getCanonicalAnswers(tId, sId);
      let transferred = 0;
      for (const answer of answers || []) {
        if (answer.scope.entityIds.includes(mergedId)) {
          const newEntityIds = answer.scope.entityIds
            .map((id) => (id === mergedId ? survivorId : id))
            .filter((id, i, arr) => arr.indexOf(id) === i); // dedupe
          await updateCanonicalAnswer({
            id: answer.id,
            scope: { ...answer.scope, entityIds: newEntityIds },
          });
          transferred++;
        }
      }

      // 3. Transfer relations
      const relations = await getEntityRelations(tId, sId);
      for (const rel of relations || []) {
        if (rel.fromEntityId === mergedId || rel.toEntityId === mergedId) {
          await deleteEntityRelation(rel.id);
          await addEntityRelation({
            tId,
            sId,
            fromEntityId:
              rel.fromEntityId === mergedId ? survivorId : rel.fromEntityId,
            toEntityId:
              rel.toEntityId === mergedId ? survivorId : rel.toEntityId,
            relationType: rel.relationType,
          });
        }
      }

      // 4. Transfer aliases — add merged entity name as alias on survivor
      const mergedAliases = merged.aliases || [];
      const survivorAliases = survivor.aliases || [];
      const combinedAliases = [
        ...new Set([
          ...survivorAliases,
          ...mergedAliases,
          merged.name.toLowerCase().trim(),
        ]),
      ].slice(0, 20);

      await updateEntity({ id: survivorId, aliases: combinedAliases });

      // 5. Mark merged entity
      const composedData = await requestBodyComposer({ status: "deprecated" });
      await setDoc(getEntityDocRef(mergedId), composedData, { merge: true });

      // 6. Audit log
      const { addAuditLog } = await import("@database/canonica/auditLogs");
      const { Timestamp } = await import("firebase/firestore");
      await addAuditLog({
        tId,
        sId,
        action: "entity_merged",
        entityType: "entity",
        entityId: survivorId,
        previousState: { mergedEntityId: mergedId, mergedName: merged.name },
        newState: { survivorId, combinedAliases, transferredRefs: transferred },
        performedBy: "admin",
        timestamp: Timestamp.now(),
      });

      return { success: true, transferredRefs: transferred };
    },
    { survivorId, mergedId, tId, sId },
    "mergeEntities",
  );
};
```

### 6.2 Hook Addition

**File:** `src/hooks/canonica/useEntities.ts`

Add `merge` function to the hook return:

```typescript
const merge = useCallback(
  async (survivorId: string, mergedId: string) => {
    try {
      const result = await mergeEntities(survivorId, mergedId, tId, sId);
      if (result?.success) {
        message.success(
          `Entities merged. ${result.transferredRefs} references transferred.`,
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

**File:** `src/app/api/helpCenter/search-kb/route.ts`

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

**File:** `src/lib/canonica/canonicalRetrieval.ts` (add to existing file)

```typescript
export async function getEntityDescriptions(
  entityIds: string[],
  tId: number,
  sId: number,
): Promise<{ name: string; description: string }[]> {
  const { getEntityById } = await import("@database/canonica/entities");
  const descriptions: { name: string; description: string }[] = [];

  for (const entityId of entityIds.slice(0, 5)) {
    const entity = await getEntityById(entityId);
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

## 8. Build Order

| Phase | Enhancement                     | Depends On         | Estimated Effort |
| ----- | ------------------------------- | ------------------ | ---------------- |
| 1     | E1 — Aliases on entity          | None               | ~1 hour          |
| 2     | E2 — entityIds on articles      | E1                 | ~2 hours         |
| 3     | E3 — Registry-guided extraction | E1, E2             | ~3 hours         |
| 4     | E4 — Auto-extract on save       | E2, E3             | ~2 hours         |
| 5     | E5 — Entity merge               | E1                 | ~2 hours         |
| 6     | E6 — Entity-enriched RAG        | None (independent) | ~1 hour          |

**Total estimated:** ~11 hours

Build order: E1 → E2 → E3 → E4 → E5 → E6

E6 can be done in parallel with any other enhancement since it's independent.

---

## 9. Files Modified Summary

| File                                        | Enhancement | Change Type                                                                  |
| ------------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| `src/types/canonica/index.ts`               | E1          | Add `aliases?: string[]` to CanonicaEntity                                   |
| `src/types/knowledgeBase.ts`                | E2          | Add `entityIds?: string[]` to KnowledgeBaseArticleType + IngestionJobArticle |
| `src/hooks/canonica/useEntities.ts`         | E1, E5      | Add updateAliases, merge functions                                           |
| `src/lib/canonica/entityExtraction.ts`      | E3, E4      | Registry-guided prompt, extractEntitiesForArticle, matchToExistingEntity     |
| `src/database/canonica/entities.ts`         | E5          | Add mergeEntities function                                                   |
| `src/lib/canonica/canonicalRetrieval.ts`    | E6          | Add getEntityDescriptions, buildEntityContextBlock                           |
| `src/app/api/helpCenter/search-kb/route.ts` | E6          | Inject entity context before RAG                                             |
| `src/database/knowledgeBase/articles.ts`    | E4          | `_triggerEntityExtraction()` wired into `addArticle()` + `updateArticle()`   |

### New Files: NONE

All enhancements modify existing files only. No new files needed.

---

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

**Decision:** Add `aliases[]` directly on `CanonicaEntity` document.
**Rejected:** Separate `entity_aliases` collection (ChatGPT's suggestion).
**Reason:** Fewer Firestore reads. Entity + aliases fetched in single read. Search index `synonyms` remains as secondary copy for fast lookup. Entity is source of truth for aliases.

### ADR-2: entityIds on KB Articles vs Canonical Answers Only

**Decision:** Add `entityIds[]` on BOTH KB articles AND keep `scope.entityIds` on canonical answers.
**Reason:** Canonical answers are for deterministic retrieval. KB articles need entityIds for RAG fallback to use entity-centric filtering. Different purposes, both needed.

### ADR-3: Registry-Guided vs Blind Extraction

**Decision:** Pass existing entities as AI context during extraction.
**Rejected:** Blind extraction (current behavior) + post-hoc matching only.
**Reason:** AI produces significantly fewer duplicates when it knows what entities already exist. Post-hoc matching catches remaining cases.

### ADR-4: Async Extraction vs Blocking

**Decision:** Entity extraction on article save is async (fire-and-forget).
**Rejected:** Blocking extraction that must complete before save returns.
**Reason:** Article save must be fast. Extraction involves AI calls (1-5 seconds). Users should not wait. Extraction failure should never prevent article save.

### ADR-5: Entity Merge vs Hard Delete

**Decision:** Merge transfers references, adds name as alias, marks as deprecated.
**Rejected:** Hard deletion of merged entity.
**Reason:** Audit trail. Historical references. Entity IDs in audit logs, signals, etc. remain valid pointers to a deprecated entity rather than dangling references.
