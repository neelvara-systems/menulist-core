# Answerlattice Knowledge Map

Status: implemented and locally verified; Answerlattice QA Functions deployment is pending Firebase authentication
Owner: Answerlattice Knowledge Governance
Last reviewed: 2026-07-28

The Knowledge Map gives two bounded views of existing support truth:

- **Governance map:** workspace members see product entities, typed relationships, canonical-answer coverage, drift, and review state from the existing tenant graph summary.
- **Public topic map:** help-center readers see an article's heading structure and related published articles. It is derived from the public article payload and never exposes internal ontology data.

The map does not create truth, infer relationships, or replace canonical review. It visualizes governed data already held by Answerlattice.

`Product Truth Map` is an external description of this owner job, not a separate
feature, route, collection, or authority model. The maintained product name
remains **Knowledge Map** because the map visualizes governed support knowledge
and must not imply that visual placement itself is product truth.

## Owner Decision

- The existing governance map is the admitted owner-facing product projection.
- Coverage, drift, review state, version, and directional relationships remain
  the supported operational layers.
- A demand or friction overlay is not admitted until real workspace evidence
  proves that adding a bounded entity-level aggregate changes owner decisions.
- The map remains a read-only navigation surface. Entity Management,
  Canonical Answers, Drift Review, and Entity Candidates continue to own
  corrections.
- Product Friction Evidence and other owner review surfaces may open the map
  with one validated entity focus. The map may open Canonical Answers filtered
  to that same entity.
- A separate `/product-map` route, map manifest, Storage snapshot, layout
  document, presentation configuration, and action-count feed are rejected.

## Documents

- [Specification](./knowledge-map_spec.md)
- [Implementation](./knowledge-map_impl.md)
- [Firebase cost model](./knowledge-map_firebase.md)
- [Mobile support](./knowledge-map_mobile-support.md)
- [Help documentation](./knowledge-map_helpdoc.md)
- [Website truth](./knowledge-map_website.md)
- [Marketing boundary](./knowledge-map_marketing.md)
- [Test cases](./knowledge-map_test-cases.md)
- [External recommendation validation](./knowledge-map_validation.md)

## Governing Boundaries

- Canonical answers remain authoritative over graph presentation.
- Internal entity, source, answer, and relation data remains tenant-scoped.
- Public maps use only already-published article structure and navigation metadata.
- Relationships are human-authored ontology relations, never model-invented edges.
- Map loading is manual and bounded; no snapshot listener is permitted.
- URL focus carries no tenant/workspace identity and is revalidated against the
  loaded exact-scope graph before use.
- The feature adds no collection, embedding, vector search, AI call, or graph database.
