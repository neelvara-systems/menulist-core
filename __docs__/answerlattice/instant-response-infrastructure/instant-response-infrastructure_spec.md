# Instant Response Infrastructure Spec

**Version:** 2.0

**Last updated:** July 18, 2026

## Problem

Repeated canonical-answer requests should avoid unnecessary repeated work when a safe cache is configured, but a cache must never serve stale, malformed, cross-scope, reviewer-blocked, or unsupported answer content.

## Required behavior

1. Cache lookup starts only after a resolved entity and positive canonical validation version are known.
2. The key includes exact tenant/workspace identity and hashes raw entity/applicability segments.
3. A Redis hit is parsed through the cached canonical schema and rejected if IDs, version, timestamp, answer type, confidence, procedure, citations, source versions, or payload bytes are invalid.
4. Freshness checks confirm source-version equality when available and otherwise re-read exact canonical truth.
5. Active status, no drift, no required review, exact scope, unchanged content, and matching validation version are mandatory.
6. Cache failure, timeout, malformed data, or staleness falls through to the normal canonical/FAQ/RAG pipeline.
7. Only resolved canonical hits are written. RAG responses are not written to Redis.
8. Search-history cache reads reject expired records and non-canonical rows without valid source references.

## Cache key

`canon:v5:{tId}:{sId}:e:{entityHash}:v{answerVersion}:q:{queryHash}:c:{contextHash}:p:{planHash}:r:{roleHash}:s:{stateHash}`

The query hash is derived from normalized text. The context hash covers the complete bounded retrieval context, including product-surface identity and server-resolved entity hints. Graph-aware retrieval bypasses Redis until graph state has an authoritative cache-version dimension.

Raw entity, plan, role, and state values are not part of the key. Hashing is an exposure/collision-hardening measure, not an authorization boundary; tenant/workspace and live canonical validation remain mandatory.

## Limits

| Setting | Current value |
| --- | ---: |
| Redis TTL | 86,400 seconds |
| Lookup timeout | 50 ms |
| Maximum normalized payload | 10 KiB UTF-8 |
| Matched entities | 50 |
| Future cached timestamp tolerance | 60 seconds |

## Success measures

- measured hit/miss/timeout/invalid/stale rates;
- measured end-to-end latency by result path;
- cache correctness regression rate;
- provider and Firestore work avoided per verified hit;
- fallback correctness when Redis is unavailable.

No numerical target is approved until a configured environment and representative customer workload produce evidence.
