# Platform Pull API — Firebase Cost Analysis

**Status:** ✅ VERIFIED (v1.1)  
**Date:** February 22, 2026

---

## Reads

| Operation                     | Trigger              | Reads                                  | Frequency   |
| ----------------------------- | -------------------- | -------------------------------------- | ----------- |
| Business endpoint             | External GET request | 1 (store query by apiKeyHash)          | Per request |
| Business endpoint (migration) | Pre-hash keys        | 2 (hash miss + raw key fallback)       | Temporary   |
| Menu endpoint                 | External GET request | 2 (store query + project query)        | Per request |
| Menu endpoint (migration)     | Pre-hash keys        | 3 (hash miss + raw fallback + project) | Temporary   |
| Key generate/revoke           | Owner action         | 1 (store update)                       | Rare        |

## Writes

| Operation        | Trigger      | Writes                                 | Frequency      |
| ---------------- | ------------ | -------------------------------------- | -------------- |
| Generate API key | Owner action | 1 (store update, stores hash + prefix) | Once per store |
| Revoke API key   | Owner action | 1 (store update, deletes publicApi)    | Rare           |

## Cost Estimate

- Rate limit: 60 req/min per key
- Worst case per store: 60 × 2 = 120 reads/min = 7,200 reads/hour
- At $0.06 per 100K reads: 7,200/hour = ~$0.004/hour per active store
- 100 active stores: ~$0.40/hour = ~$10/day at maximum sustained load
- Reality: External systems poll far less often. Expected: <100 reads/day per store.
- **ETag savings:** 304 responses skip payload construction but still require 1 store read for key validation + ETag check. Saves bandwidth, not reads.

**Verdict:** Acceptable. Feature flag OFF by default. Rate limiting provides cost ceiling.

---

**Last Updated:** March 14, 2026
