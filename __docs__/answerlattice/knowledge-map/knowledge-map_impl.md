# Knowledge Map Implementation

## Existing Sources Reused

- `answerlattice_entities`
- `answerlattice_entityRelations`
- `answerlattice_canonicalAnswers`
- `platformSummary/entityGraphIndex_{tId}_{sId}`
- published hosted-help article TipTap JSON
- published hosted-help category and section navigation

## Feature 2 Validation Result

The attached `Product Truth Map` proposal resolves to this existing feature.
No parallel implementation is admitted.

| Proposed subsystem | Current decision |
|---|---|
| `/answerlattice/product-map` | Keep the existing Knowledge Governance tab. |
| Product-map structure manifest | Reuse `entityGraphIndex_{tId}_{sId}`. |
| Structure and metrics Storage objects | Do not add. The current bounded Firestore summary is already parsed and freshness-checked. |
| Presentation configuration document | Do not add. Governed relations remain the displayed structure. |
| Map correction writes | Route to existing Entity Management and candidate review. |
| Demand overlay | Product validation pending; no code scope admitted. |
| Action badges | Keep Daily Brief deep links one-way; do not couple the map to an action store. |

The current implementation therefore has no repository-level code gap from this
proposal. The remaining evidence gap is founder comprehension and repeated
owner demand for an entity-level activity overlay.

## Governance Data Flow

```text
existing nightly graph rebuild
  -> snapshot existing entity/relation/canonical source versions
  -> bounded active entities, relations, and active canonical answers
  -> per-entity answer/drift/review counters + directional edges
  -> existing entityGraphIndex summary document
  -> tenant-scoped client DAL reads graph + current source versions in parallel
  -> runtime parser
  -> KnowledgeMapDashboard
```

The nightly builder already reads active answers to calculate `answerCount`. Drift and review counters are calculated from that same snapshot. No query is added.

The compact index preserves the legacy bidirectional `relationTypes` field for retrieval compatibility and adds `outgoingRelationTypes` and `incomingRelationTypes`. The map can therefore say `Requires` versus `Required by`, `Part of` versus `Contains`, and the equivalent governed inverse labels without re-reading relation rows.

The summary also stores the three invalidation counters used by its payload. On map load, the DAL compares those counters with the existing current source-version document:

- equal counters: freshness verified;
- a current counter is higher: rebuild needed;
- missing, invalid, or regressed evidence: freshness unverified.

The source-version snapshot is read before graph queries. A concurrent mutation after that point therefore produces a safely stale result rather than pairing newer evidence with older graph data.

## Public Data Flow

```text
cached published article
  -> deterministic TipTap heading traversal
  -> sanitized HTML with heading IDs + bounded outline
  -> existing compact hosted-help DTO
  -> ArticleTopicMap
```

Related links are selected from the compact category payload already sent for article navigation.

## Components

- `src/database/answerlattice/knowledgeMap.ts`
- `src/components/templates/answerlattice/governance/KnowledgeMapDashboard.tsx`
- `src/components/templates/answerlattice/governance/KnowledgeMapDashboard.module.scss`
- `src/components/templates/answerlattice/hostedHelp/ArticleTopicMap.tsx`
- `src/lib/answerlattice/publicRichText.ts`

## Security

- Governance reads require authenticated tenant membership and knowledge-control permission through existing Firestore rules.
- Runtime parsing verifies `pId`, `tId`, `sId`, rebuild timestamp, summary version, declared counts, entity types, relation types, directional coverage, graph references, source versions, counters, and bounded interaction rules.
- The parser returns an explicit projection and does not forward unknown summary fields.
- Public maps receive only title, URL, category/section labels, sanitized HTML, and a bounded outline.
- Unknown rich-text nodes render escaped children only.
- Heading text and IDs are bounded and escaped.

## Failure Behavior

- Missing summary: explain that the first nightly index has not completed.
- No active entity: reconcile the previous graph to an empty current summary and show an explicit empty-ontology state.
- Invalid, incomplete, orphaned, or wrong-scope summary: show a generic load failure and log no private payload.
- Source changes after rebuild: keep the map usable but show `Rebuild needed`.
- Missing legacy source-version evidence: keep the map usable but show `Freshness pending`.
- No relation: keep the selected entity visible and show a no-relationship state.
- No headings: show the article title and related published articles.
- Missing heading target: return to article top instead of failing.

## Later Code Admission

No additional code should be scheduled from the Feature 2 proposal until the
five-founder comprehension test is completed. If demand-overlay validation
passes later, the implementation plan must begin with the existing friction
summary contract and document-size budget. It must not begin by creating map
snapshots, event documents, or a new hierarchy.
