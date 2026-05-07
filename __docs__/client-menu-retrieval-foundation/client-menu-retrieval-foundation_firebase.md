# Client Menu Retrieval Foundation Firebase Cost

## Cost Decision

This feature adds no new Firestore reads, writes, deletes, listeners, Cloud Functions, or storage operations.

## Search

Search is client-side and runs against the public menu payload already fetched by the existing public menu route.

Cost impact: `₹0`.

## Structured Data

JSON-LD is generated during the existing public menu render from the already-loaded project and store data.

Cost impact: `₹0`.

## Low-Network Resilience

The customer service worker caches only `/offline`. It does not cache tenant menu HTML, Firestore responses, images, or public menu JSON.

Cost impact: `₹0` direct Firestore cost.

## Risk Controls

- No search API.
- No background sync.
- No offline menu writes.
- No stale cached public truth.
- No owner setting writes.

