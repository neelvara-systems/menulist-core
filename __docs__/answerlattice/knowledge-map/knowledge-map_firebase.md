# Knowledge Map Firebase and Cost Model

## Collections

No new collection or document family is introduced.

The external Product Truth Map proposal's suggested manifest, structure
snapshot, metrics snapshot, presentation document, and Storage object family
are explicitly rejected for the current feature. They would duplicate the
existing graph summary, introduce invalidation and reconciliation work, and
add owner writes without evidence that the current map is insufficient.

## Reads

| Action | Reads |
|---|---:|
| Open governance Knowledge Map | 2 point reads: existing graph summary + existing source-version control document |
| Change selected entity/filter | 0 |
| Expand or focus a connected entity | 0 |
| Open with validated entity URL focus | 0 incremental reads |
| Open Canonical Answers for selected entity | 0 until navigation; destination keeps its existing bounded load |
| Manual refresh | 2 point reads |
| Open public article topic map | 0 incremental reads |
| Expand public heading | 0 |

The public article and category reads already occur for the article page. The map derives its structure in memory.

## Writes

- Normal governance map use: 0.
- Public topic map use: 0.
- Nightly graph rebuild: the existing summary write remains conditional on a deterministic source hash.
- Drift/review counters add fields to that existing payload and use the already-loaded active-answer snapshot.
- The nightly rebuild adds one existing source-version point read before graph queries. It stores only the `entities`, `entityRelations`, and `canonical` counters needed to prove map freshness.

## AI and Search Cost

- AI calls: 0.
- Embedding operations: 0.
- Vector queries: 0.
- Search index reads: 0.

## Cost Controls

- No listener.
- No per-node document read.
- No per-interaction write.
- Two parallel point reads on map load; no collection query.
- One-hop rendering only.
- Existing scheduler caps remain authoritative.
- Graph summary is written only when source data changes.
- A governance mutation does not add a map-specific write. Existing source-version invalidation makes the next map load report stale until the nightly rebuild.
- Public map structure is not persisted.
- Entity URL focus and canonical-answer handoff are browser navigation only;
  no map interaction document or listener is created.

## Cost Stop Rule

Do not add map-specific persistence, telemetry writes, deeper graph reads, or generated layouts unless measured customer value cannot be captured with existing aggregate analytics and the incremental monthly Firebase cost is documented first.

A future demand overlay must reuse a bounded server-owned aggregate already
needed by Product Friction Intelligence. It may not query raw questions,
tickets, conversations, or signals from the map page, and it may not add a
real-time listener or per-node read.
