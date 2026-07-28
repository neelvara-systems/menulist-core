# Knowledge Map ChatGPT Proposal Review

Reviewed: 2026-07-28

## Implemented Outcome

The three admitted hardenings from this review are now implemented: directional incoming/outgoing relation evidence, a direct action to the existing Entity Candidates queue, and source-version freshness comparison using two existing point reads. No new collection, public ontology export, event-time graph rebuild, per-click write, or map-specific AI runtime was added.

## Executive Decision

The external response has the correct product framing but overstates the value of a public product-wide map and proposes an unnecessary parallel read model. Its most useful idea is a private founder review moment: show how Answerlattice understands the product, expose uncertainty, and route corrections into existing governed workflows.

The current implementation already provides:

- a private owner Knowledge Map over active ontology entities;
- answer-coverage, drift, review, version, and relationship context;
- links to entity, canonical-answer, and drift governance;
- a customer-safe article Topic Map derived only from published headings and related published articles;
- responsive, accessible, bounded rendering;
- one existing summary read for the owner map and no incremental public read.

The highest-value remaining hardening is not three new modes. It is preserving relationship direction in the compact owner read model so the map can distinguish `Requires` from `Required by`, then making the existing entity-candidate review easier to reach from the map.

## Proposal Breakdown

| External suggestion | Repo reality | Decision |
|---|---|---|
| Call it a Product Knowledge Map, not an AI mind map | The feature is already named Knowledge Map and is a read-only governed projection. | Adopt the framing; no rename is required. |
| Do not expose the raw ontology graph | The owner map is bounded to one selected entity and 20 connected nodes. The public map receives no internal ontology. | Adopted and implemented. |
| Activation Map for founders | Entity candidates already have a dedicated governed review queue. The current map contains approved active entities only. | Validate a bounded review entry point; do not mix candidates into approved truth by default. |
| Explore Map for end users | The current public Topic Map is article-scoped. A product-wide entity map has no public visibility, role, plan, or locale export contract. | Validate before development. |
| Knowledge Health Map | Coverage, missing-answer, drift, review, version, and relationship states already exist in the owner map. | Core implemented. Do not add ticket and signal BI until it changes a real governance decision. |
| One engine with three modes | Owner governance, activation review, and anonymous help have different data, permission, freshness, and privacy contracts. | Reject. Share presentation primitives only where useful; retain separate projections. |
| Primary product hierarchy and two expanded levels | The ontology is a typed graph, not a guaranteed tree. Selecting one root and rendering one hop avoids invented hierarchy. | Retain the current bounded model. |
| Zoom and pan | The current map is a compact governance tool and mobile outline, not a canvas. | Reject until a tested corpus cannot fit the bounded view. |
| Side panel with sources, answers, plans, roles, and releases | Those records are intentionally absent from the compact graph summary. | Validate a lazy detail flow only after evidence; do not copy sensitive detail into the graph summary. |
| Ask about this topic | There is no canonical-only owner query contract scoped to one ontology entity. Public AI follow-up is a market baseline, not a differentiator. | Validate only as a context handoff into an existing canonical-first surface. Do not add map-specific RAG. |
| Role and plan filtering | Applicability exists on canonical answers, but public map visibility projection is not implemented. | Do not claim or build until a fail-closed public audience contract exists. |
| Create `knowledgeMap_{tenantId}_{storeId}_{audience}_{locale}` | Answerlattice uses `pId`, `tId`, and `sId`, and already has `entityGraphIndex_{tId}_{sId}`. | Reject. The proposed name violates tenant-shape rules and the document duplicates the existing read model. |
| Regenerate after every content or ontology mutation | Existing ontology writes already increment source versions and mark compiled output stale. Regenerating a graph on every mutation adds cost and contention. | Reuse existing invalidation semantics. Nightly remains reconciliation; validate an immediate stale indicator, not event-time rebuilds. |
| Storage JSON for larger maps | The current graph is capped at 1,000 entities and the UI renders only one bounded hop. | Reject without measured document-size or latency pressure. |
| Basic map usage analytics | Per-click Firestore writes conflict with the cost boundary. | Validate aggregate, consent-safe analytics only after the comprehension test. |
| Founder review-and-accept metric | This measures ontology trust more directly than map opens. | Adopt as validation evidence, not as a vanity activation counter. |

## Codebase Reality

### Current Owner Map

`src/components/templates/answerlattice/governance/KnowledgeMapDashboard.tsx:77-405`:

- performs one tenant-scoped summary load;
- searches and filters locally;
- renders one selected root and at most 20 connected entities;
- exposes approved, missing, drift, review, and version states;
- links to existing governance surfaces.

The existing map therefore already covers most of the proposed Knowledge Health Map without becoming a separate analytics product.

### Direction Is Currently Lost

`functions-answerlattice/src/answerlattice/answerlatticeNightly.ts:1912-1953` stores both the forward and reverse connection under the same relation type for discoverability. The UI correctly avoids a false directional claim by saying `Related by [type]`.

This is safe but less useful than the source relation. For relations such as `requires`, `available_in`, `restricted_by`, `transitions_to`, and `triggers`, direction changes the meaning. The next implementation should add bounded outgoing and incoming relation groups to the existing summary payload. It should not add a new collection, query, graph database, or generated hierarchy.

### Candidate Review Already Exists

`src/components/templates/answerlattice/EntityCandidateReview.tsx:109-160` already loads pending candidates and supports promote, reject, and merge. Candidate review is governed separately because candidates are evidence, not approved product truth.

The map should link to this existing review surface. Showing candidate nodes inside the approved graph should be tested first and, if admitted, candidates must remain visually and semantically separate from active entities.

### Existing Invalidation Should Be Reused

`src/lib/answerlattice/ontologyServer.ts:338-370` already increments entity or relation source versions and marks the compiled manifest stale in the same governed transaction.

The external proposal is directionally correct that an edited map should not silently appear current. The safe improvement is an immediate stale indicator using this existing invalidation contract. Rebuilding and rewriting the complete graph after every edit is unnecessary.

### Public Map Boundary

`src/components/templates/answerlattice/hostedHelp/ArticleTopicMap.tsx:66-98` and `HostedHelpClient.tsx:269-305` expose an article outline and related published articles only. This is not a product-wide entity map, and that limitation is deliberate.

A public product-wide map would require explicit approval and visibility behavior for:

- public entity naming;
- role and plan applicability;
- locale;
- version;
- canonical-answer status;
- public releases;
- product surfaces and private routes.

Until that contract exists, expanding the internal ontology into public help would create a larger privacy and correctness risk than the navigation benefit justifies.

## Market Validation

Current support products continue to center end-user discovery on hierarchy, search, and direct answers:

- Intercom documents up to three levels of help-center collections, breadcrumbs, audience-controlled published articles, and search/browse navigation. Source: [Create collections in your Help Center](https://www.intercom.com/help/en/articles/56647-create-collections-in-your-help-center), Intercom, updated July 2026.
- Intercom's current Knowledge Hub emphasizes source/channel visibility, content status, search, filters, and freshness rather than a public knowledge graph. Sources: [Search, filter and find content](https://www.intercom.com/help/en/articles/9459991-search-filter-and-find-content-and-take-bulk-actions), May 14, 2026; [Knowledge sources](https://www.intercom.com/help/en/articles/9440354-knowledge-sources-to-power-ai-agents-and-self-serve-support), June 23, 2026.
- Zendesk organizes help content through categories and nested sections and places generative answers above search results. Sources: [Organizing knowledge base content](https://support.zendesk.com/hc/en-us/articles/4408845897370-Organizing-knowledge-base-content-in-categories-and-sections), April 17, 2026; [Using generative search](https://support.zendesk.com/hc/en-us/articles/8888178335898-Using-generative-search-to-provide-AI-powered-answers-to-search-queries), April 28, 2026.
- GitBook structures published documentation through site sections and content variants rather than a graph canvas. Source: [Site structure](https://gitbook.com/docs/publishing-documentation/site-structure), GitBook Documentation.

This supports two conclusions:

1. A public visual product map is not established enough to treat as automatically useful.
2. A governed operator view that exposes coverage, drift, and source authority can differentiate Answerlattice more than another public browsing mode.

## Architect Decisions

### Build or Harden

1. Preserve relation direction in the existing graph summary.
   - Add bounded incoming/outgoing relation groups.
   - Keep the existing `related` compatibility projection.
   - Add no query or document family.
   - Render accurate labels such as `Requires` and `Required by`.

2. Add a direct map action to the existing Entity Candidates review tab.
   - Add no candidate query to normal map load.
   - Keep candidate approval, rejection, and merge in the existing governed workflow.

3. Make snapshot freshness explicit after ontology changes.
   - Reuse existing source-version or stale-manifest semantics.
   - Do not rebuild the full graph after each mutation.
   - Cost-test either one additional point read or one compact stale-marker write before choosing.

### Validate

1. Founder product-understanding review:
   - Five solo SaaS founders use real imported support knowledge.
   - At least four identify one incorrect relationship, one missing answer, and one candidate requiring review within 90 seconds.
   - Compare the map with the existing tables, not with no product at all.

2. Public Explore Product view:
   - Prototype from the already-loaded published category, section, and article hierarchy.
   - Add no public ontology export.
   - Require faster task-to-article discovery than existing search/browse for at least four of five representative tasks.

3. Ask about this topic:
   - Pass a bounded topic identifier into the existing canonical-first support surface.
   - Block release if it falls into generic RAG when an approved answer is unavailable.

### Reject

- one shared owner/public/activation data engine;
- a new `knowledgeMap_*` document family;
- `tenantId` or `storeId` fields;
- event-time full graph rebuilds;
- map-specific Storage JSON without measured size pressure;
- public pending candidates, tickets, signals, drift, or private entities;
- zoom/pan canvas, arbitrary positioning, drag/drop, export, or collaborative editing;
- per-click Firestore analytics;
- map-specific AI generation or authoritative inferred edges.

## Final Verdict

The external response is approximately 55% aligned with Answerlattice. Its framing and founder-review insight are useful. Its proposed public scope, three-mode engine, new snapshot family, and broad MVP are not justified by current evidence.

The product should keep the implemented governed owner map and safe public article map. The next attention should go to accurate relationship direction, candidate-review discoverability, and trustworthy snapshot freshness. A product-wide public Explore Map remains a bounded customer test, not pending implementation.
