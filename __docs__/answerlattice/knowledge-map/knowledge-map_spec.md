# Knowledge Map Specification

## Product Job

Help a SaaS founder understand support knowledge at a glance without turning Answerlattice into a generic diagramming tool.

The owner-facing promise is:

> See how Answerlattice understands approved product concepts, how those
> concepts relate, and where answer coverage or review risk needs inspection.

The map does not claim that a visual hierarchy is the authoritative product
model. The ontology, governed relations, canonical answers, and source-version
controls remain authoritative.

## Day-One Scope

### Governance Map

The Knowledge Governance hub includes a `Knowledge Map` tab. It:

1. reads `platformSummary/entityGraphIndex_{tId}_{sId}`;
2. validates exact `AL` product, tenant, and workspace scope;
3. lists active ontology entities with search and type/quality filters;
4. renders one selected entity and its bounded one-hop relationships;
5. groups every visible edge by its governed direction, such as `Requires`/`Required by`, while retaining a legacy `Related by [type]` fallback for summaries built before directional evidence existed;
6. shows entity type, current product version, approved-answer coverage, drift, and review-required state on every visible node;
7. marks uncovered nodes as `Missing answer` in text rather than color alone;
8. lets the user move the focus to a connected entity;
9. links gaps to existing ontology, entity-candidate, canonical-answer, and drift workflows;
10. compares the graph's entity/relation/canonical source-version evidence with the current control document and exposes `Freshness verified`, `Rebuild needed`, or `Freshness pending`;
11. exposes last rebuild time and a manual refresh control;
12. collapses relationship groups through one accessible disclosure on narrow screens.

The governance view never changes an entity, relation, answer, or approval.

### Public Topic Map

Each published hosted-help article includes `Article` and `Topic map` modes. The topic map:

1. derives a deterministic hierarchy from published TipTap headings;
2. assigns stable, escaped heading anchors during server rendering;
3. includes up to six related published articles, preferring the same section and category;
4. switches back to the article and scrolls to a selected heading;
5. renders as an interactive branch view on wider screens and a collapsible outline on narrow screens.

No internal entity ID, canonical-answer record, source pointer, drift status, private article, or tenant configuration is added to the public DTO.

## Guardrails

- Maximum parsed graph nodes: 1,000.
- Maximum related entities per node: 20.
- Relation types are restricted to the six governed ontology relation values.
- Maximum article headings: 40.
- Maximum public heading depth: 6.
- Maximum related public articles: 6.
- No recursive network fetch while expanding a node.
- No raw DOM, screenshot, or model-generated interpretation.
- Empty, stale, missing, or malformed summaries fail closed with a useful owner state.

## Success Measures

- Median time to find an uncovered or drifted product area.
- Percentage of map sessions that open a relevant governance workflow.
- Percentage of five target founders who can identify a product relationship,
  an uncovered concept, and a review risk within 90 seconds.
- Public topic-map selection rate.
- Public heading-to-content completion rate.
- Zero cross-tenant or private-source exposure.
- Two Firestore point reads per owner map load; zero incremental public Firestore reads.

## Product Truth Map Proposal Decision

| Proposal | Decision |
|---|---|
| Stable, owner-readable product projection | Keep through the existing selected-root, one-hop map. |
| Coverage and freshness visibility | Already admitted through approved-answer, drift, review, version, and source-version state. |
| Evidence-backed navigation | Keep as links to the existing owning governance surfaces. |
| One permanent display parent for every entity | Reject without customer evidence. It creates a second hierarchy beside governed relations. |
| Map-only groups and display-placement corrections | Reject. They add presentation truth and audit writes that do not improve canonical answer quality. |
| Demand or friction overlay | Validate first with a bounded prototype using existing aggregate evidence. Feature ownership remains Product Friction Intelligence. |
| Action Center badges | Reject as a map dependency. The Daily Brief may deep-link to a selected map node, but the map does not ingest a second action model. |
| Dedicated Product Map route | Reject. Keep the map inside Knowledge Governance. |
| Structure and metrics manifests in Firestore/Storage | Reject while the existing graph summary remains bounded and sufficient. |
| Overall product-health score | Reject. Show explicit counts and conditions. |
| Owner-editable layout or free-form map | Reject. |

## Validation Gate for Any New Overlay

A new operational overlay is admitted only when all of the following are true:

1. at least three real founder workspaces show repeated need for the same
   entity-level decision;
2. the evidence can be derived from an existing bounded summary without raw
   conversation or ticket reads;
3. the map links to the owning correction workflow instead of duplicating it;
4. missing or stale evidence is explicit;
5. the added read/write and document-size cost is measured before development.

## Rejected Scope

- free-form mind-map authoring;
- graph-database introduction;
- unrestricted multi-hop traversal;
- model-generated authoritative edges;
- public rendering of the internal ontology;
- real-time Firestore listeners;
- map-specific persistence, layout documents, or per-click analytics writes.
- a second display-parent hierarchy or map-only product taxonomy;
- customer-friction classification or release-review workflow;
- owner action lifecycle, action badges, or task completion state;
- unverified demand counts derived from raw questions or tickets.
