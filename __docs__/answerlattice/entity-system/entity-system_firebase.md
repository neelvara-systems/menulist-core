# Entity System — Firebase Cost & Operations

> **Version:** 2.0.1
> **Last Updated:** 2026-06-29
> **Audience:** Developers
> **Status:** ENHANCEMENT — cost impact of 6 targeted changes

---

## 1. Existing Collections (No Changes)

All 9 Answerlattice collections remain unchanged. No new collections created.

| Collection | DB Constant | Firebase Project | Purpose |
|------------|-------------|-----------------|---------|
| entities | `ANSWERLATTICE_ENTITIES` | answerlattice | Product ontology entities |
| entityRelations | `ANSWERLATTICE_ENTITY_RELATIONS` | answerlattice | Entity relationships |
| entitySearchIndex | `ANSWERLATTICE_ENTITY_SEARCH_INDEX` | answerlattice | Deterministic retrieval index |
| entityCandidates | `ANSWERLATTICE_ENTITY_CANDIDATES` | answerlattice | AI extraction staging |
| canonicalAnswers | `ANSWERLATTICE_CANONICAL_ANSWERS` | answerlattice | Governed answer assets |
| signalEvents | `ANSWERLATTICE_SIGNAL_EVENTS` | answerlattice | Raw signal log |
| mutationProposals | `ANSWERLATTICE_MUTATION_PROPOSALS` | answerlattice | Mutation queue |
| auditLogs | `ANSWERLATTICE_AUDIT_LOGS` | answerlattice | Audit trail |
| releases | `ANSWERLATTICE_RELEASES` | answerlattice | Version timeline |

**Also affected (MenuList Firebase):**

| Collection | DB Constant | Firebase Project | Change |
|------------|-------------|-----------------|--------|
| kb_articles | `KB_ARTICLES` | menulist-qa | Add `entityIds` field (E2) |

---

## 2. Operations Per Enhancement

### E1 — Aliases on Entity

| Operation | Type | Frequency | Cost |
|-----------|------|-----------|------|
| Read entity to display aliases | READ | On governance UI load | 1 read |
| Update entity with aliases | WRITE | On alias edit (rare) | 1 write |
| Sync aliases to search index | WRITE | On alias edit | 1 write |

**Monthly cost estimate:** ~₹0 (manual operations, <10/month typical)

---

### E2 — entityIds on KB Articles

| Operation | Type | Frequency | Cost |
|-----------|------|-----------|------|
| Write entityIds on article save | WRITE | On article create/update | 0 extra writes (merged with existing save) |
| Query articles by entityId | READ | On entity-centric RAG | 1 read per query (array-contains) |

**Monthly cost estimate:** ~₹0.50 per 1,000 queries (single indexed array-contains query)

**Index required:** `kb_articles` composite index on `entityIds` (array-contains) + `status` + `tId`

---

### E3 — Registry-Guided Extraction

| Operation | Type | Frequency | Cost |
|-----------|------|-----------|------|
| Load existing entities for context | READ | Per extraction batch | 1 read (getEntities) |
| AI extraction call (Gemini) | EXTERNAL | Per batch of 5 articles | ~$0.001 per batch |

**Monthly cost estimate:** ~₹2 per 100 articles extracted (mostly AI cost, not Firestore)

**Note:** Existing entities are loaded ONCE per extraction batch, not per article. This is a single `getEntities()` call.

---

### E4 — Auto-Extract on Article Save

| Operation | Type | Frequency | Cost |
|-----------|------|-----------|------|
| Load entities for context | READ | Per article save (if changed) | 1 read |
| AI extraction | EXTERNAL | Per article save | ~$0.0002 per article |
| Write entityIds to article | WRITE | Per extraction | 0 extra (merged) |
| Write candidate entities | WRITE | Per new entity found | 1 write per candidate |

**Monthly cost estimate:** ~₹1 per 100 article saves

**Debounce protection:** Max 1 extraction per article per 5 minutes. Prevents rapid re-extraction during editing.

---

### E5 — Entity Merge

| Operation | Type | Frequency | Cost |
|-----------|------|-----------|------|
| Read both entities | READ | Per merge | 2 reads |
| Read all canonical answers | READ | Per merge | 1 read |
| Update affected answers | WRITE | Per merge | N writes (N = affected answers) |
| Read all relations | READ | Per merge | 1 read |
| Delete + recreate relations | WRITE | Per merge | 2N writes (N = affected relations) |
| Update survivor entity | WRITE | Per merge | 1 write |
| Deprecate merged entity | WRITE | Per merge | 1 write |
| Audit log | WRITE | Per merge | 1 write |

**Monthly cost estimate:** ~₹0.10 per merge (merges are rare, <5/month typical)

**Warning:** Merge is the most expensive single operation. For a tenant with 50 entities and 100 answers, worst case is ~10 reads + ~20 writes. Acceptable for rare manual operation.

---

### E6 — Entity-Enriched RAG Context

| Operation | Type | Frequency | Cost |
|-----------|------|-----------|------|
| Fetch entity descriptions | READ | Per RAG fallback query | 0-5 reads (getEntityById per matched entity) |

**Monthly cost estimate:** ~₹1 per 1,000 RAG queries

**Optimization:** If canonical retrieval already loaded entities during its attempt, reuse that data. Zero additional reads in most cases.

---

## 3. Total Monthly Cost Impact

| Scenario | Articles | Queries/Month | Merges | Cost Impact |
|----------|----------|---------------|--------|-------------|
| Small tenant | 50 | 500 | 1 | ~₹0.50/month |
| Medium tenant | 200 | 5,000 | 3 | ~₹5/month |
| Large tenant | 500 | 20,000 | 5 | ~₹15/month |

**Verdict:** Negligible cost impact. All enhancements are Firestore-efficient.

---

## 4. Firestore Indexes Required

### New Indexes

```
# kb_articles: entity-centric article retrieval (E2)
Collection: kb_articles
Fields: entityIds (array-contains), status (ascending), tId (ascending)
```

### Existing Indexes (No Changes)

All existing Answerlattice indexes remain unchanged:
- `entities`: tId + sId + type
- `entityCandidates`: tId + sId + status + confidence (desc)
- `canonicalAnswers`: tId + sId + scope.entityIds (array-contains) + status
- `entitySearchIndex`: tId + sId
- `signalEvents`: tId + sId + entityId + timestamp
- `entityRelations`: tId + sId + fromEntityId

---

## 5. DAL Function Inventory (After Enhancements)

### entities.ts (14 functions — 2 new)

| Function | Type | Reads | Writes |
|----------|------|-------|--------|
| getEntities | READ | 1 | 0 |
| getEntitiesByType | READ | 1 | 0 |
| getEntityById | READ | 1 | 0 |
| addEntity | SERVER TRANSACTION | bounded point reads | entity + search index + slug/counter/invalidation/operation writes |
| updateEntity | SERVER TRANSACTION | entity + operation | entity + invalidation/operation writes |
| deprecateEntity | SERVER TRANSACTION | entity + operation | entity + invalidation/operation writes |
| getEntityRelations | READ | 1 | 0 |
| getRelationsForEntity | READ | 1 | 0 |
| addEntityRelation | SERVER TRANSACTION | bounded point reads | relation + counter/invalidation/operation writes |
| deleteEntityRelation | SERVER TRANSACTION | bounded point reads | relation delete + counter/invalidation/operation writes |
| getEntitySearchIndex | READ | 1 | 0 |
| upsertEntitySearchIndex | SERVER TRANSACTION | bounded point reads | search-index + invalidation/operation writes |
| **mergeEntities** | **READ+WRITE** | **4+** | **5+** | **NEW (E5)** |

Entity mutation costs are owned by the protected ontology transaction rather than direct browser writes. Entity creation and candidate promotion atomically update entity, search-index, ontology counter, invalidation/source-version, slug-index and operation-replay state. The server then awaits the tenant-summary merge used by scheduler discovery. A failed derived-summary write returns failure after the authoritative transaction; retrying the idempotent action replays the committed result and retries summary synchronization.
| **syncAliasesToSearchIndex** | **READ+WRITE** | **1** | **1** | **NEW (E1)** |

### entityCandidates.ts (7 functions — unchanged)

| Function | Type | Reads | Writes |
|----------|------|-------|--------|
| getEntityCandidates | READ | 1 | 0 |
| getPendingCandidates | READ | 1 | 0 |
| addEntityCandidate | WRITE | 0 | 1 |
| approveCandidateStatus (compatibility alias to `promoteCandidate`) | WRITE | 0 | Server-owned promotion transaction |
| rejectCandidateStatus | SERVER TRANSACTION | candidate + operation | candidate + counter/operation writes |
| promoteCandidate | SERVER TRANSACTION | candidate/entity/slug/counter/operation | entity + search index + candidate + counter/slug/invalidation/operation writes |
| mergeCandidateStatus | SERVER TRANSACTION | candidate + operation | candidate + counter/operation writes |

Answerlattice App Entity Candidate ID Boundary: the browser normalizes action IDs and performs no candidate writes. The server transaction revalidates candidate scope/status and owns all candidate/entity/search-index/counter/operation writes.

Answerlattice App Entity DAL ID Boundary: browser reads validate stored contracts; mutation IDs are normalized before server-owned ontology/governance actions. Malformed, reserved, path-shaped or unresolved IDs fail before dispatch, and no browser mutation can bypass the server transaction.

### entityExtraction.ts (3 functions — 1 new)

| Function | Type | Reads | Writes |
|----------|------|-------|--------|
| extractEntitiesFromArticles | READ+WRITE | 0 | N (candidates) |
| buildSearchIndexEntry | PURE | 0 | 0 |
| **extractAndMapEntities** | **READ+WRITE** | **1** | **N** | **NEW (E4)** |

### canonicalRetrieval.ts (3 functions — 2 new)

| Function | Type | Reads | Writes |
|----------|------|-------|--------|
| attemptCanonicalRetrieval | READ | 2-4 | 0 |
| **getEntityDescriptions** | **READ** | **1-5** | **0** | **NEW (E6)** |
| **buildEntityContextBlock** | **PURE** | **0** | **0** | **NEW (E6)** |

---

## 6. Security Rules

No changes to Firestore security rules needed. All Answerlattice collections already have admin-only rules. The `kb_articles` collection uses existing rules that allow read/write with proper auth.

---

## 7. Backup & Recovery

- All entity operations produce audit logs (`ANSWERLATTICE_AUDIT_LOGS`)
- Entity merge is the only destructive operation — mitigated by soft-delete (deprecated status)
- No entity is ever hard-deleted
- entityIds on articles can be recalculated by re-running extraction
