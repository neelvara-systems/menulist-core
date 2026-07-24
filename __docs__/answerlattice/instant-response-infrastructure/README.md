# Answerlattice Instant Response Infrastructure

**Status:** Implemented as an optional fast path and Feature 14 source-hardened on July 18, 2026

**Flag:** `ENABLE_ANSWERLATTICE_INSTANT_CACHE`

**External dependency:** Upstash Redis configuration; without it, the live governed retrieval path is used.

The instant cache stores only resolved, active, reviewer-cleared canonical answers. It is never the authority for what the answer should be. Every hit re-enters payload, scope, source-version, canonical status, drift/review, version, freshness, procedure, citation, and byte-size checks before delivery.

## Current contract

- Namespace: `canon:v5`.
- Identity: hashed normalized query + complete product context + entity/version/applicability scope.
- Graph-aware canonical selection uses live retrieval until graph state has an authoritative cache version.
- Tenant/workspace remain explicit in the key; entity, plan, role, and state segments are SHA-256-derived so raw context does not appear in Redis keys.
- Payloads are validated after Redis read. Invalid data is rejected and deleted best effort with bounded diagnostics.
- Only active answers without drift or required review are written.
- Payloads are capped at 10 KiB using UTF-8 byte length.
- Redis lookup times out after 50 ms and falls through to normal retrieval.
- TTL is 24 hours; source-version and live canonical checks can invalidate an entry earlier.
- Non-canonical Firestore search-history cache entries require source references and a future `expiresAt`.

## Product boundary

This layer may reduce repeated retrieval work in a configured environment. It does not prove a latency target, cache-hit rate, Firestore savings percentage, verified resolution, or zero-staleness guarantee. Those outcomes require measured production evidence.

## Documents

- [instant-response-infrastructure_spec.md](instant-response-infrastructure_spec.md)
- [instant-response-infrastructure_impl.md](instant-response-infrastructure_impl.md)
- [instant-response-infrastructure_firebase.md](instant-response-infrastructure_firebase.md)
- [instant-response-infrastructure_test-cases.md](instant-response-infrastructure_test-cases.md)
- [instant-response-infrastructure_helpdoc.md](instant-response-infrastructure_helpdoc.md)
- [instant-response-infrastructure_mobile-support.md](instant-response-infrastructure_mobile-support.md)
- [instant-response-infrastructure_marketing.md](instant-response-infrastructure_marketing.md)
- [instant-response-infrastructure_website.md](instant-response-infrastructure_website.md)
