# Knowledge Map Test Cases

## Governance Contract

1. Exact `AL`, `tId`, and `sId` summary parses.
2. Product or scope mismatch fails closed.
3. Missing or invalid timestamp, version, declared counts, node types, relation types, counters, or graph references fail closed.
4. Related IDs and relation types are deduplicated and capped.
5. Unknown summary fields are not projected into the client contract.
6. A map load performs two parallel point reads and no listener.
7. Search and filters perform no additional read.
8. Selecting a relation focuses the connected node without fetching it.
9. New summaries render incoming and outgoing relation semantics; legacy summaries retain the non-directional fallback.
10. Every visible node shows version where present and a textual coverage/review state.
11. Current, stale, unverified, empty, and old summary states remain explicit and usable.
12. Entity-candidate review is reachable without adding another data read.
13. Removing the final active entity reconciles the old graph to an empty summary instead of leaving stale nodes indefinitely.
14. The map does not read or persist a second display-parent hierarchy.
15. Daily Brief actions may deep-link into the map, but map loading does not depend on an action document.
16. No demand, friction, or release overlay appears without an admitted bounded source contract.
17. Owner correction actions route to the existing owning workflow rather than mutating map presentation state.
18. No overall product-health score is derived.

## Public Content Contract

1. Heading hierarchy is deterministic for the same TipTap JSON.
2. Duplicate headings receive unique deterministic IDs.
3. Heading text and count are bounded.
4. Unsafe markup remains escaped.
5. Protocol-relative and unsafe-scheme links remain rejected.
6. Topic map receives no raw article JSON or internal entity data.
7. Related articles are published navigation entries only.
8. Selecting a topic opens the article and targets the matching sanitized heading.
9. No-heading articles keep a useful root and related-article view.

## Responsive and Accessibility

1. Desktop branch view does not overflow its tool surface.
2. Mobile renders a vertical outline without horizontal dragging.
3. Controls are keyboard reachable and at least 44px high on mobile.
4. Owner and public disclosure controls expose `aria-expanded`.
5. The owner disclosure controls both relationship columns through `aria-controls`.
6. Status meaning is present in text, not color alone.

## Cost Regression

1. No new collection or index.
2. No map-specific listener.
3. No per-node Firestore call.
4. No AI, embedding, or vector operation.
5. Existing nightly graph rebuild adds one source-version point read and no collection query.
6. No map-specific write is added to entity, relation, or answer mutations.
7. No manifest, Storage snapshot, presentation document, or per-node metric document is introduced.
