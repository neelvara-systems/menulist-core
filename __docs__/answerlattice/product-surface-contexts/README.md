# Answerlattice Product Surface Contexts

Answerlattice Product Surface Contexts connect a customer's product pages to the support truth that explains those pages.

This is the owner-managed mapping layer between product routes, semantic context, knowledge base articles, FAQs, changelogs, tickets, and canonical answers. It keeps route-specific support relevant without making route strings the knowledge source of truth.

Answerlattice App Product Surface ID Boundary: owner-edited and generated product surface IDs are normalized through the shared Firestore document-ID guard before product-surface document refs, archive refs, direct surface reads, or compiled-context source-version IDs. Malformed, reserved, empty, or path-shaped surface IDs are rejected before Firestore access while valid generated IDs keep the existing `{tId}_{sId}_{surfaceKey}` shape.

Answerlattice Product Surface Summary Boundary: stored product-surface documents and `platformSummary/contextContent_{tId}_{sId}` summaries re-enter an exact `pId=AL`, exact numeric workspace, normalized surface-key, bounded-counter, resolved-entity and allowlisted related-content parser before browser state, server memory cache, search related content, activation readiness or compiled-context fallback use. Invalid derived rows fail closed until rebuilt.

## Documents

- [Spec](product-surface-contexts_spec.md)
- [Implementation](product-surface-contexts_impl.md)
- [Firebase](product-surface-contexts_firebase.md)
- [Mobile Support](product-surface-contexts_mobile-support.md)
- [Help Doc](product-surface-contexts_helpdoc.md)
- [Marketing](product-surface-contexts_marketing.md)
- [Website](product-surface-contexts_website.md)
- [Test Cases](product-surface-contexts_test-cases.md)

## Doctrine Fit

This feature strengthens:

- Product Ontology: routes resolve to product concepts, workflows, and entities.
- Canonical Answer Engine: context narrows retrieval scope.
- FAQ Management: route/page context can surface short published answers before the user opens a full article.
- Release Binding: changelogs can be attached to affected product surfaces.
- Signal Mutation: tickets, failed searches, and reviewed feedback can carry the same context key as articles and changelogs.
- API and Integration Layer: widget runtime can pass page context without leaking tenant or user identifiers.

## Feedback Review Alignment

Feedback Review can optionally link submitted feedback to a Product Surface after the user sends it. This keeps feedback sorted by the product area it belongs to while preserving the rule that end users are never required to understand or choose internal surface keys. Support Board cards created from feedback carry `relatedSurfaceId` and `relatedContextKeys` when present.

## Knowledge Intake Alignment

Knowledge Intake can suggest product surfaces from product links, app URLs, docs, screenshots, and owner-selected routes, but approved output must write the existing `answerlattice_productSurfaces` model. Intake publishing must mark the `surfaces` source stale and rebuild or mark stale `platformSummary/contextContent_{tId}_{sId}` after article, FAQ, changelog, ticket, or surface changes that should affect page-aware related content. This keeps the widget and help-center related-content flow on one compact summary instead of adding an intake-specific route map.
