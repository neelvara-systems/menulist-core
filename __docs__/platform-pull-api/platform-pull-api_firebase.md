# Platform Pull API — Firebase Cost Analysis

**Status:** ✅ VERIFIED (v1.6)
**Date:** February 22, 2026
**Last Source Gate Update:** July 6, 2026

---

## Source Gate

This Firebase/cost boundary is source-gated by `npm run verify:platform-pull-api-boundary`.

Feature flag is currently `ENABLE_PUBLIC_API: true`. The gate checks per-request key/target validation, target document-ID and MenuList numeric-ID admission, hashed rate-limit segments, the 1KB key-management body cap, strict key-management session tenant/store document-ID admission, `MANAGE_INTEGRATIONS` permission, private pull-response headers, Business Settings Integrations tab key controls, and docs parity.

---

## Reads

| Operation                     | Trigger              | Reads                                  | Frequency   |
| ----------------------------- | -------------------- | -------------------------------------- | ----------- |
| Business endpoint             | External GET request | 2 (store query by apiKeyHash + tenant eligibility read) | Per request |
| Business endpoint (migration) | Pre-hash keys        | 3 (hash miss + raw key fallback + tenant eligibility read) | Temporary   |
| Menu endpoint                 | External GET request | 4 (store query + tenant eligibility read + projects summary + project document) | Per request |
| Menu endpoint (migration)     | Pre-hash keys        | 5 (hash miss + raw fallback + tenant eligibility read + projects summary + project document) | Temporary   |
| Key generate/revoke           | Owner/staff action with `MANAGE_INTEGRATIONS`; 1KB body cap before validation | 1 store permission read + 1 store update | Rare        |

## Writes

| Operation        | Trigger      | Writes                                 | Frequency      |
| ---------------- | ------------ | -------------------------------------- | -------------- |
| Generate API key | Owner/staff action with `MANAGE_INTEGRATIONS` | 1 (store update, stores hash + prefix) | Once per store |
| Revoke API key   | Owner/staff action with `MANAGE_INTEGRATIONS` | 1 (store update, deletes publicApi)    | Rare           |

## Cost Estimate

- Rate limit: 60 req/min per key
- Worst case per store: 60 × 4 = 240 reads/min = 14,400 reads/hour
- At $0.06 per 100K reads: 14,400/hour = ~$0.009/hour per active store
- 100 active stores: ~$0.90/hour = ~$22/day at maximum sustained load
- Reality: External systems poll far less often. Expected: <100 reads/day per store.
- **ETag savings:** 304 responses skip payload construction but still require 1 store read for key validation + ETag check. Saves bandwidth, not reads.
- **Private response cache:** Business/menu GET responses now use private client-cache semantics plus `Vary: X-API-Key`. This prevents shared-cache cross-key response reuse and does not change Firestore reads, writes, deletes, Cloud Function calls, cache invalidations, or Firebase deploy requirements.
- **Target eligibility read:** Valid MenuList keys now read the tenant document before returning business/menu data so tenant-blocked stores stop serving external pull API responses. The route returns the existing `INVALID_API_KEY` shape for blocked targets. This adds one tenant read to valid requests and no writes, rules/indexes, Cloud Functions, cache invalidations, Firebase deploy, or Vercel deploy requirement.
- **Target document-ID guard:** API-key validation now returns only normalized credential store document IDs; MenuList business/menu pull routes require exact positive numeric MenuList target IDs before public response IDs or POS-sync menu payload IDs are built. The menu route also normalizes `platformSummary/projects_{storeId}` and selected project document IDs before full project reads. Invalid stored metadata fails closed as `INVALID_API_KEY` before menu-summary/project reads. This changes no valid read counts, writes, rules/indexes, Cloud Functions, cache invalidations, Firebase deploy, or Vercel deploy requirement.
- **No validation cache:** MenuList pull endpoints intentionally re-run the key lookup and target eligibility checks on every request instead of passing a process-local validation cache TTL. Revocation, inactive/deleted store state, and platform blocks therefore take effect on the next request from that server process. This changes no writes, rules/indexes, Cloud Functions, cache invalidations, Firebase deploy, or Vercel deploy requirement; it preserves the documented per-request read counts above.
- **Key-management guard cost:** Generate/revoke now adds the existing store permission read before the rare write so staff without integration authority cannot create or revoke external read keys. Oversized, malformed, or invalid-session action bodies are rejected before validation and add no key-management write. The key-management rate-limit key stores a hashed store segment, not the raw store ID; session tenant/store IDs pass through the shared Firestore document-ID guard with an exact raw-value check and a 160-character ceiling before permission checks, limiter keys, diagnostics, or `stores/{storeId}` refs. This changes no valid reads/writes and only resets existing key-management limiter buckets once. Business Settings Integrations tab is the owner UI for this route and adds no Firebase operations until generate or revoke is submitted.
- **Route diagnostics:** Bounded unexpected-failure diagnostics on the business/menu GET routes add no Firestore reads, writes, deletes, Storage operations, Cloud Function calls, provider calls, cache invalidations, or Firebase deploy requirement. Response contracts and ETag behavior stay unchanged.

**Verdict:** Acceptable. Feature flag is currently enabled in source. Rate limiting provides cost ceiling. The additional projects-summary read is required because `isDefault` is summary truth for public menu selection.

---

**Last Updated:** July 6, 2026
