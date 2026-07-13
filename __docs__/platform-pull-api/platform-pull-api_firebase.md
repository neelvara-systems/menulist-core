# Platform Pull API — Firebase Cost Analysis

**Status:** ✅ VERIFIED (v1.7)
**Date:** February 22, 2026
**Last Source Gate Update:** July 13, 2026

---

## Source Gate

This Firebase/cost boundary is source-gated by `npm run verify:platform-pull-api-boundary`.

Feature flag is currently `ENABLE_PUBLIC_API: true`. The gate checks per-request key/target validation, duplicate-key rejection, target document-ID and MenuList numeric-ID admission, fail-closed hashed-IP/key rate limits, the strict 1KB key-management body cap, transactional tenant/store lifecycle/ownership/permission admission, `MANAGE_INTEGRATIONS`, stable response identity, private success/error/secret response headers, Business Settings Integrations tab key controls, and docs parity.

---

## Reads

| Operation                     | Trigger              | Reads                                  | Frequency   |
| ----------------------------- | -------------------- | -------------------------------------- | ----------- |
| Business endpoint             | External GET request | 3 (hash query + legacy-raw uniqueness query + tenant eligibility read) | Per request while raw compatibility remains enabled |
| Menu endpoint                 | External GET request | 5 (hash query + legacy-raw uniqueness query + tenant eligibility read + projects summary + project document) | Per request while raw compatibility remains enabled |
| Linked outlet menu endpoint   | External GET request | Base menu reads + 1 same-tenant master project read | Per linked-outlet request |
| Key generate/revoke           | Owner/staff action with `MANAGE_INTEGRATIONS`; strict 1KB body cap before validation | 2 transaction reads (tenant + store) + 1 store update | Rare        |

## Writes

| Operation        | Trigger      | Writes                                 | Frequency      |
| ---------------- | ------------ | -------------------------------------- | -------------- |
| Generate API key | Owner/staff action with `MANAGE_INTEGRATIONS` | 1 (store update, stores hash + prefix) | Once per store |
| Revoke API key   | Owner/staff action with `MANAGE_INTEGRATIONS` | 1 (store update, deletes publicApi)    | Rare           |

## Cost Estimate

- Rate limit: 60 req/min per key
- Worst valid-menu case per store key: 60 × 5 = 300 reads/min = 18,000 reads/hour
- Rotating invalid credential-shaped keys from one admitted client IP: 240 × 2 key queries = 480 reads/min = 28,800 reads/hour before the IP ceiling
- At $0.06 per 100K reads: 28,800/hour = ~$0.017/hour for one continuously abusive admitted IP
- 100 independently addressed abusive clients at that sustained ceiling would be ~$1.73/hour; provider/WAF controls remain the broader volumetric boundary
- Reality: External systems poll far less often. Expected: <100 reads/day per store.
- **ETag savings:** 304 responses still incur the normal key, tenant, and menu source reads plus response projection; they save response-transfer bandwidth, not Firestore reads or server construction. ETag identity excludes request-time `generatedAt`/`timestamp`, so unchanged truth can now produce a real 304.
- **Private response cache:** Business/menu GET responses now use private client-cache semantics plus `Vary: X-API-Key`. This prevents shared-cache cross-key response reuse and does not change Firestore reads, writes, deletes, Cloud Function calls, cache invalidations, or Firebase deploy requirements.
- **Target eligibility read:** Valid MenuList keys now read the tenant document before returning business/menu data so tenant-blocked stores stop serving external pull API responses. The route returns the existing `INVALID_API_KEY` shape for blocked targets. This adds one tenant read to valid requests and no writes, rules/indexes, Cloud Functions, cache invalidations, Firebase deploy, or Vercel deploy requirement.
- **Target document-ID guard:** API-key validation now returns only normalized credential store document IDs; MenuList business/menu pull routes require exact positive numeric MenuList target IDs before public response IDs or POS-sync menu payload IDs are built. The menu route also normalizes `platformSummary/projects_{storeId}` and selected project document IDs before full project reads. Invalid stored metadata fails closed as `INVALID_API_KEY` before menu-summary/project reads. This changes no valid read counts, writes, rules/indexes, Cloud Functions, cache invalidations, Firebase deploy, or Vercel deploy requirement.
- **No validation cache:** MenuList pull endpoints intentionally re-run the key lookup and target eligibility checks on every request instead of passing a process-local validation cache TTL. Revocation, inactive/deleted store state, and platform blocks therefore take effect on the next request from that server process. This changes no writes, rules/indexes, Cloud Functions, cache invalidations, Firebase deploy, or Vercel deploy requirement; it preserves the documented per-request read counts above.
- **Pre-auth cost ceiling:** A fail-closed hashed-IP limit allows at most 240 admitted credential-shaped requests per minute before the existing fail-closed 60/minute hashed-key limit. Rotating fake keys cannot create unbounded Upstash keys or Firestore lookups from one client IP. Rate limits add provider operations but no Firestore reads/writes.
- **Limiter outage behavior:** Normal quota exhaustion returns 429. A missing/timed-out/failed limiter provider fails closed with retryable 503 and `Retry-After` on pull and key-management routes, preventing both uncontrolled Firestore reads and misleading caller-abuse responses.
- **Duplicate credential boundary:** Hash and legacy raw-key queries run together while legacy compatibility is enabled, each read at most two matches, and the union may resolve to only one distinct store path. A transitional store containing both fields remains valid; cross-representation/cross-store collisions fail closed without tenant/menu reads. Answerlattice widget representation queries independently retain the same two-document/exactly-one boundary.
- **Key-management guard cost:** Generate/revoke transactionally reads the tenant and store before the rare write, validates lifecycle/ownership and current store-role permission from that snapshot, then writes in the same transaction. Oversized, malformed, unexpected-field, invalid-session, blocked, deleted, or unauthorized requests add no key-management write. The limiter fails closed and stores a hashed store segment. Successful one-time key/revoke responses use `private, no-store`.
- **Key-management session tenant/store document-ID admission:** session tenant/store IDs pass through the shared Firestore document-ID guard before any tenant/store reference, rate-limit identity, permission check, or key mutation is constructed.
- **Linked outlet public truth:** Linked outlet documents contain overrides/local-only data rather than a materialized copy of their master menu. Pull requests now validate the master reference against the admitted tenant, read that master once, and reuse the existing resolver before formatting. This adds one project read only for linked outlets, no writes, and no rules/index/Function change; invalid, cross-tenant, inactive, deleted, chained, missing, or empty master truth returns `NO_MENU` instead of an empty or partial snapshot.
- **MenuList product/identity scope:** Key mutation and pull reads retain legacy compatibility when product or embedded ID aliases are absent. Explicit `pId`/`productId` values must both be `ML`; explicit `tenantId`/`tId` and `storeId`/`sId` aliases must be exact numeric IDs, agree with one another, and match the authoritative tenant/store path. Failures stop before key writes or menu-summary/project reads and add no new Firebase operations.
- **Credential metadata:** New key writes add `productId: ML`, `purpose: menulist_public_api`, and `scopes: [public:read]` inside the existing single `publicApi` update. This adds no operation; legacy credentials with no metadata remain readable, while explicit incompatible metadata fails before target reads.
- **Route diagnostics:** Bounded unexpected-failure diagnostics on the business/menu GET routes add no Firestore reads, writes, deletes, Storage operations, Cloud Function calls, provider calls, cache invalidations, or Firebase deploy requirement. Response contracts and ETag behavior stay unchanged.

**Verdict:** Acceptable. Feature flag is currently enabled in source. Rate limiting provides cost ceiling. The additional projects-summary read is required because `isDefault` is summary truth for public menu selection.

---

**Last Updated:** July 13, 2026
