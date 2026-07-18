# Entity System — Firebase Cost & Operations

> **Version:** 2.0.1
> **Last Updated:** 2026-07-18
> **Audience:** Developers
> **Status:** MAINTAINED — Current operations, bounded reads/writes, and required indexes

---

## 1. Collections Used

This feature uses existing Answerlattice collections and adds no collection. The table is the entity-loop subset, not the complete Answerlattice data inventory.

| Collection | DB Constant | Firebase Project | Purpose |
|------------|-------------|-----------------|---------|
| `answerlattice_entities` | `ANSWERLATTICE_ENTITIES` | Answerlattice | Product ontology entities |
| `answerlattice_entityRelations` | `ANSWERLATTICE_ENTITY_RELATIONS` | Answerlattice | Entity relationships |
| `answerlattice_entitySearchIndex` | `ANSWERLATTICE_ENTITY_SEARCH_INDEX` | Answerlattice | Deterministic retrieval index |
| `answerlattice_entityCandidates` | `ANSWERLATTICE_ENTITY_CANDIDATES` | Answerlattice | AI extraction staging |
| `answerlattice_canonicalAnswers` | `ANSWERLATTICE_CANONICAL_ANSWERS` | Answerlattice | Governed answer assets |
| `answerlattice_signalEvents` | `ANSWERLATTICE_SIGNAL_EVENTS` | Answerlattice | Raw signal log |
| `answerlattice_mutationProposals` | `ANSWERLATTICE_MUTATION_PROPOSALS` | Answerlattice | Mutation queue |
| `answerlattice_auditLogs` | `ANSWERLATTICE_AUDIT_LOGS` | Answerlattice | Audit trail |
| `answerlattice_releases` | `ANSWERLATTICE_RELEASES` | Answerlattice | Version timeline |
| `kb_articles` | `KB_ARTICLES` | Answerlattice | Article `entityIds` and fallback evidence |

---

## 2. Operations Per Enhancement

### E1 — Aliases on Entity

| Operation | Type | Frequency | Cost |
|-----------|------|-----------|------|
| Read entity to display aliases | READ | On governance UI load | 1 read |
| Update entity with aliases | WRITE | On alias edit (rare) | 1 write |
| Sync aliases to search index | WRITE | On alias edit | 1 write |

Measure actual governance usage and current Firestore pricing; do not publish a fixed manual-operation estimate.

---

### E2 — entityIds on KB Articles

| Operation | Type | Frequency | Cost |
|-----------|------|-----------|------|
| Write matched `entityIds` | WRITE | After eligible post-save extraction | 0-1 article writes, capped at 10 normalized IDs |
| Query articles by entityId | READ | Eligible technical fallback only | Up to 12 returned documents (`array-contains-any`; query minimum billing may apply) |

Recalculate monthly cost from the enabled-query rate, returned document count, and current Firestore pricing before rollout. Ordinary questions add no reads from this lane.

**Index required:** `kb_articles` composite index on `pId + tId + sId + status + active + entityIds` (`entityIds` uses `CONTAINS`).

The runtime query is default off and reads at most 12 articles only when a query has both a bounded exact technical literal and normalized resolved entities. Ordinary questions add zero reads.

---

### E3 — Registry-Guided Extraction

| Operation | Type | Frequency | Cost |
|-----------|------|-----------|------|
| Load scoped entity registry | READ | Per eligible post-save extraction | Up to 500 returned documents; only active `pId = AL` rows enter extraction context |
| AI extraction call (Gemini) | EXTERNAL | Per eligible post-save extraction | Measure from actual model usage and current provider pricing |

Do not use a fixed monthly estimate before representative source size, entity count, model usage, and provider pricing are measured.

---

### E4 — Auto-Extract on Article Save

When ontology is enabled, article create and content, title, or category updates make one best-effort request containing only the article ID to the protected extraction route. The route re-reads the scoped stored article, and the article write is never blocked.

| Operation | Type | Per eligible trigger |
|-----------|------|----------------------|
| Re-read stored article | READ | 1 point read |
| Load scoped entity registry | READ | Up to 500 returned documents; inactive/cross-product rows are discarded |
| Entity extraction | EXTERNAL | 1 model call |
| AI accounting | WRITE | Existing accounting operation writes |
| New entity candidates | READ+WRITE | Bounded governed writes per new candidate |
| Persist confirmed article `entityIds` | WRITE | 0-1 article writes with at most 10 normalized active entity IDs; a confirmed empty match may clear stale links |
| Invalidate KB cache/context versions | WRITE | Existing bounded KB invalidation batch only when links changed |

The browser trigger is best effort and has no durable retry lease. Provider or parsing failure preserves current links and returns failure; a successful no-change extraction avoids the article and cache writes. Recalculate cost from actual enabled save volume, registry size, candidate count, model usage, and current provider pricing.

---

### E5 — Entity Merge

| Operation | Type | Frequency | Cost |
|-----------|------|-----------|------|
| Read operation, entities, and ontology counter | READ | Per new merge | 4 point reads |
| Read merged/survivor canonical references | READ | Per merge | Two bounded queries, each returning at most 201 documents before the 200-reference guard rejects |
| Rewrite affected answers and write answer audits | WRITE | Per merge | 2N writes |
| Read articles linked to merged entity | READ | Per merge | At most 201 returned documents before the 200-reference guard rejects |
| Rewrite affected article `entityIds` | WRITE | Per merge | 0-200 bounded writes |
| Read inbound/outbound relations | READ | Per merge | Two bounded queries, each returning at most 201 documents before rejection |
| Rewrite or remove affected relations | WRITE | Per merge | One write per unique affected relation |
| Read survivor/merged search-index rows | READ | Per merge | Two bounded queries, each returning at most 11 documents before the 10-row guard rejects |
| Update or remove search-index rows | WRITE | Per merge | One write per returned row |
| Entity, counter, audit, source-version, cache, and bundle updates | WRITE | Per merge | Bounded fixed overhead; conditional cache writes depend on affected sources |

Do not use a fixed merge-price estimate. Guard queries request one extra document to detect overflow. The server rejects the merge before the 450-write transaction boundary; larger migrations require a controlled server migration.

---

### E6 — Entity-Enriched RAG Context

| Operation | Type | Frequency | Cost |
|-----------|------|-----------|------|
| Fetch entity descriptions | READ | Per RAG fallback query | 0-5 reads (getEntityById per matched entity) |

The current helper performs at most five exact-scope entity point reads. Reuse would require an explicit server-side preload contract and is not claimed by the maintained runtime.

---

## 3. Cost Measurement Boundary

Do not publish a fixed monthly estimate from document counts alone. Measure enabled post-save triggers, returned entity documents, model tokens, candidate writes, eligible hybrid queries, returned article documents, merge reference counts, and current Firebase/provider prices. Ordinary questions add no hybrid-lane reads while the feature remains off.

---

## 4. Firestore Indexes Required

### New Indexes

| Use | Collection | Fields |
|-----|------------|--------|
| Exact technical/entity fallback | `kb_articles` | `pId + tId + sId + status + active + entityIds(CONTAINS)` |
| Governed entity-merge article rewrite | `kb_articles` | `pId + tId + sId + entityIds(CONTAINS)` |

### Other Maintained Indexes

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
| getEntities | READ | bounded query documents | 0 |
| getEntitiesByType | READ | bounded query documents | 0 |
| getEntityById | READ | 1 | 0 |
| addEntity | SERVER TRANSACTION | bounded point reads | entity + search index + slug/counter/invalidation/operation writes |
| updateEntity | SERVER TRANSACTION | entity + operation | entity + invalidation/operation writes |
| deprecateEntity | SERVER TRANSACTION | entity + operation | entity + invalidation/operation writes |
| getEntityRelations | READ | bounded query documents | 0 |
| getRelationsForEntity | READ | bounded query documents | 0 |
| addEntityRelation | SERVER TRANSACTION | bounded point reads | relation + counter/invalidation/operation writes |
| deleteEntityRelation | SERVER TRANSACTION | bounded point reads | relation delete + counter/invalidation/operation writes |
| getEntitySearchIndex | READ | bounded query documents | 0 |
| upsertEntitySearchIndex | SERVER TRANSACTION | bounded point reads | search-index + invalidation/operation writes |
| **mergeEntities** | **SERVER TRANSACTION** | **bounded point and reference-query documents** | **bounded dependency rewrites + fixed governance overhead** |

Entity mutation costs are owned by the protected ontology transaction rather than direct browser writes. Entity creation and candidate promotion atomically update entity, search-index, ontology counter, invalidation/source-version, slug-index and operation-replay state. The server then awaits the tenant-summary merge used by scheduler discovery. A failed derived-summary write returns failure after the authoritative transaction; retrying the idempotent action replays the committed result and retries summary synchronization.
| **syncAliasesToSearchIndex** | **READ+WRITE** | **1** | **1** |

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

### Entity Extraction Runtime

| Function | Type | Reads | Writes |
|----------|------|-------|--------|
| extractEntitiesFromArticles | AI + callback | Caller-owned | Governed candidate callback only |
| buildSearchIndexEntry | PURE | 0 | 0 |
| extractEntitiesForArticle | Helper | Returned entity documents | 0; caller owns persistence |
| `/api/answerlattice/articles/extract-entities` | Protected route | 1 stored article + 0-500 entities | Accounting, candidates, 0-1 article, bounded cache invalidation |

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
