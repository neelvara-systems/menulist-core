# Canonica Product Surface Contexts

Canonica Product Surface Contexts connect a customer's product pages to the support truth that explains those pages.

This is the owner-managed mapping layer between product routes, semantic context, knowledge base articles, FAQs, changelogs, tickets, and canonical answers. It keeps route-specific support relevant without making route strings the knowledge source of truth.

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
- Signal Mutation: tickets and failed searches carry the same context key as articles and changelogs.
- API and Integration Layer: widget runtime can pass page context without leaking tenant or user identifiers.
