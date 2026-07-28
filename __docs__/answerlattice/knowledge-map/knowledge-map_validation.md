# Knowledge Map External Recommendation Validation

Reviewed: 2026-07-28

This cross-check compares the implemented Knowledge Map with both the original
mind-map recommendation and the later attached `Product Truth Map` proposal.
Code, runtime contracts, Firestore rules, cost behavior, responsive behavior,
and focused verifiers are the implementation authority.

## Coverage Matrix

| Original recommendation | Status | Current evidence and decision |
|---|---|---|
| Governed Knowledge Map rather than a generic mind-map editor | Implemented | Both owner and public maps are read-only projections of governed or published truth. No authoring canvas or generated edge is present. |
| Put the map inside Knowledge Governance | Implemented with a safer navigation adaptation | The map has a dedicated governed tab. This avoids mounting the collection-backed Entity Management dashboard just to visualize the existing summary. |
| Select feature, workflow, integration, error, plan, role, or state roots | Implemented | Search and entity-type filtering cover every admitted Answerlattice entity type. |
| Show a bounded one-hop view | Implemented | The client parses at most 1,000 searchable nodes and renders at most 20 persisted relationship edges for the selected entity. |
| Group branches by `requires`, `part of`, `available in`, `restricted by`, `transitions to`, and `triggers` | Implemented and direction-hardened | The compact summary now retains incoming and outgoing maps while preserving its legacy bidirectional field. The UI renders accurate pairs such as `Requires`/`Required by` and `Part of`/`Contains`; old summaries retain the safe `Related by [type]` fallback. Unknown or inconsistent relation evidence fails closed. |
| Show approved canonical-answer coverage per entity | Implemented as counts | Every visible node shows approved-answer count or `Missing answer`. Answer titles are not copied into the graph summary because that would enlarge the shared document or require per-node reads. |
| Mark approved, missing, review, and drift state | Implemented | Every visible node exposes textual `approved`, `Missing answer`, `drifted`, and `need review` states. |
| Mark deprecated and not-indexed records | Represented in the correct existing workflow | The summary intentionally contains active indexed entities only. Deprecated and indexing administration remains in Entity Management; the map does not invent nodes absent from its complete active summary. |
| Show product version | Implemented | Normalized entity version is rendered as a semantic version where present. |
| Click a node to inspect it | Implemented within the summary boundary | Clicking a branch changes focus and exposes type, version, quality state, directional groups, and links to entity, candidate, canonical-answer, or drift management. |
| Show sources, citations, plan/role applicability, and validation details in the node view | Not admitted to this summary-backed map | Those records are not present in the graph summary. Pulling them into every node would add reads or duplicate sensitive answer data. Existing canonical-answer governance remains the authoritative detail surface. |
| Provide `Ask about this topic` | Not admitted | There is no current canonical-only owner search contract scoped to one ontology entity. Adding AI or RAG from this read-only map would weaken the zero-call cost and authority boundary. |
| Deliberate expansion instead of a whole-workspace graph | Implemented | Search selects one root; only one hop is rendered; focus changes are in memory. |
| Collapsible mobile outline | Implemented | The selected root appears first and one accessible disclosure controls both typed relationship columns. |
| Reuse existing ontology data | Implemented with bounded freshness proof | Two existing point reads replace entity, relation, answer, and search-index collection reads: the graph summary plus the current source-version control document. No collection query, listener, or mutation write was added. |
| Make post-mutation staleness explicit | Implemented | The nightly builder snapshots entity/relation/canonical counters before its graph queries. The owner map compares that evidence with current counters and reports verified, rebuild-needed, or unverified freshness without an event-time graph rebuild. |
| Link incomplete extraction to candidate review | Implemented | The existing Entity Candidates queue is directly reachable from the map; candidate records remain private review work and never become public nodes. |
| Public map exposes only customer-safe published truth | Implemented | The hosted-help map uses sanitized published headings and related published article navigation only. It receives no internal entity, canonical-answer, source, drift, or tenant configuration record. |
| No graph database, generic editor, drag/drop layout, generated authoritative edges, or unsafe public ontology | Implemented | None of these directions is present in code, persistence, dependencies, or public payloads. |
| Five-founder comprehension test | External evidence required | Source implementation cannot prove founder comprehension. The maintained test is: at least four of five target founders identify a requirement or restriction, approved-answer coverage, and a gap within 90 seconds using real support knowledge. |

## Product Truth Map Proposal Matrix

| Later proposal | Status | Decision |
|---|---|---|
| Rename the owner feature Product Map | Rejected | Keep `Knowledge Map`; visual placement is a projection of governed support knowledge, not independent product truth. |
| Add a dedicated route | Rejected | The existing Knowledge Governance tab preserves context and permission boundaries. |
| Create one stable primary-parent hierarchy | Not justified | The current selected-root one-hop projection is stable, bounded, and relation-backed. A second display hierarchy would require reconciliation and owner correction state. |
| Add map-only product areas | Rejected | Map-only groups would become an ungoverned taxonomy beside the ontology. |
| Add coverage overlay | Implemented in the bounded form | Approved-answer, missing-answer, drift, and review counts already appear on nodes. |
| Add freshness overlay | Implemented in the bounded form | Source-version comparison exposes current, rebuild-needed, and unverified states. |
| Add demand overlay | Validate before development | Current summaries do not provide safe, complete entity-level demand. Product Friction Intelligence owns that evidence. |
| Add action badges | Rejected as a map dependency | Daily Brief can link into the map; the map does not ingest or reproduce an action queue. |
| Add role, plan, locale, and visibility views | Not admitted | These scopes are not in the graph summary. Their detailed authority remains in canonical answers and product entities. |
| Correct placement inside the map | Rejected | Existing Entity Management and candidate review own semantic corrections and audit. |
| Add separate structure and metric snapshots | Rejected | Existing graph summary plus source-version control already provides two-read bounded loading and explicit freshness. |
| Put snapshots in Storage | Rejected | Current payload size and access pattern do not justify another storage, signing, caching, and invalidation path. |
| Record map interaction events | Rejected for now | Per-click telemetry would add writes. Existing aggregate product validation should be used first. |
| Add a map health score | Rejected | Explicit counts and conditions are more inspectable. |
| Mobile hierarchical drill-down | Implemented | The current narrow-screen outline reuses the same loaded data with no extra reads. |

## Cost Cross-Check

| Interaction | Firestore or AI cost |
|---|---:|
| First owner map load | 2 existing summary/control document reads |
| Search, filtering, focus changes, relationship collapse | 0 |
| Manual refresh | 2 existing summary/control document reads |
| Public topic-map use | 0 incremental reads |
| Map AI, embedding, vector, or generated-layout operations | 0 |

## Verdict

The existing Knowledge Map is the admitted Feature 2 implementation. The later
proposal improves the articulation of the owner job but does not justify a
parallel Product Map architecture. No code change is admitted from this review.
The unclosed product evidence is the five-founder comprehension test and,
separately, proof that entity-level demand changes owner decisions. Authenticated
QA deployment and owner-route visual interaction remain release evidence until
proven in the target environment.
