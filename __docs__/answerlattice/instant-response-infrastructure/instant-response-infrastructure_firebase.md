# Instant Response Infrastructure Firebase Notes

## Data

- Redis stores optional `canon:v4` canonical results when Upstash is configured.
- Firestore `answerlattice_cacheVersions` stores compact canonical/KB source versions.
- `ai_search_history` remains a bounded analytics and fallback cache record with an explicit expiry; it is not authoritative knowledge.

## Writes and reads

- Canonical/KB source mutations increment cache versions through existing domain transactions/batches.
- A Redis hit still reads compact current source versions unless already supplied by the caller. If manifest freshness is unavailable, exact canonical/KB source docs are rechecked.
- Redis writes are fire-and-forget after normalized UTF-8 size validation.
- Invalid/stale Redis cleanup is best effort.
- Expired Firestore history rows are rejected even before scheduled/TTL cleanup removes them.

## Security and privacy

Redis keys contain exact numeric tenant/workspace IDs and hashed entity/applicability segments. Cached payloads contain customer-safe answer text, approved public citations, bounded procedure data, canonical/entity IDs, confidence, and source versions. They do not contain raw ticket text, private source URLs, private evidence IDs, secrets, or arbitrary application state.

The cache is not an authorization system. Exact tenant/workspace queries and canonical ownership checks remain mandatory.

## Cost boundary

This feature can trade Redis operations and compact freshness reads for avoided repeated canonical retrieval work. Actual savings depend on hit rate, Upstash pricing/configuration, traffic mix, and fallback frequency. No fixed savings or free-tier claim is approved.

No Firestore rule, index, Storage rule, or new Cloud Function is introduced by the instant cache itself.
