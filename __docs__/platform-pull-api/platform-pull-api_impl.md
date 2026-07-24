# Platform Pull API — Implementation

**Status:** ✅ IMPLEMENTED (v1.15 — exact tenant/store key-management settlement hardened Jul 23, 2026)
**Date:** February 22, 2026  
**Feature Flag:** `ENABLE_PUBLIC_API`
**Last Source Gate Update:** July 23, 2026

---

## Source Gate

This implementation doc is source-gated by `npm run verify:platform-pull-api-boundary`.

Current source contract:

- `POST /api/store/public-api-key` is dynamic, authenticated with `withAuth()`, feature-gated by `ENABLE_PUBLIC_API`, scoped to the session store, permission-gated by `MANAGE_INTEGRATIONS`, fail-closed rate-limited by a hashed store segment, and capped at a strict 1KB JSON body before validation. The request includes the exact tenant/store selected when the owner initiated it; both identifiers must normalize and equal the authenticated session before Firestore work. Tenant/store lifecycle, ownership, current store-role permission, and the key write are then re-read/applied in one Firestore transaction, so a concurrent block, delete, ownership change, role-definition change, or browser store switch cannot redirect the mutation.
- Key generation creates an `ml_` key and stores only the non-secret credential projection: `publicApi.apiKeyHash`, `keyPrefix`, `createdAt`, `productId: ML`, `purpose: menulist_public_api`, and `scopes: [public:read]`. It returns the raw key once with exact tenant/store acknowledgement plus `private, no-store` and logs bounded diagnostics. Revoke transactionally deletes `publicApi` and returns the same exact-scope acknowledgement with `private, no-store`.
- Business Settings Integrations tab exposes generate/regenerate/copy/revoke controls. It remounts by exact tenant/store, accepts a response only when its echoed scope matches the initiating scope, and suppresses state, secret, toast, and loading settlement after a store switch or unmount. Functional store-context merges recheck both identifiers. The raw key is shown only once after generation; after that the UI displays only the stored prefix.
- `/api/public/v1/business` and `/api/public/v1/menu` normalize the bounded key shape and accept only `ml_` credentials. Requests pass a fail-closed hashed-IP pre-auth ceiling and the fail-closed 60/minute hashed-key ceiling before lookup. While raw-key legacy compatibility remains enabled, current-hash and raw-key queries both run with a two-document cap and their document paths are combined: exactly one distinct store may match. The routes re-run key and target eligibility on every request, require normalized credential store IDs and exact positive numeric MenuList target IDs before response construction, return private success cache plus `Vary: X-API-Key`, return private/no-store errors, and log only bounded diagnostics.
- Conditional ETags hash stable public truth through `src/lib/publicApi/responseIdentity.ts`. Top-level request-time `generatedAt` and POS payload `timestamp` remain in 200 response bodies but are excluded from identity, so unchanged polls can actually return 304 while any business/menu content change still changes the ETag.
- The menu endpoint selects the public project from normalized `platformSummary/projects_{storeId}` truth, treats the summary map key and full Firestore document ID as authoritative over embedded `projectId`, and reads only normalized `projects/{tId}/{sId}/{projectId}` refs. Persisted menu versions must be nonnegative safe integers; malformed project/store values fall through to the next valid source and then version 1.
- When that selected project is a linked outlet, the route validates the encoded master project reference against the already admitted tenant, reads the master through the Admin SDK, and applies the existing multi-outlet resolver before POS projection. The outlet project ID remains authoritative. Invalid, cross-tenant, inactive, deleted, chained, missing, or empty masters fail closed as `NO_MENU`; inherited categories/items, outlet overrides, and local-only records match customer-render truth.
- MenuList product and identity admission lives in `src/lib/publicApi/menuListScope.ts`. Missing `pId`/`productId`, `sId`, or embedded tenant/store aliases remain compatible with legacy MenuList records. When present, product aliases must both be exact `ML`; tenant aliases must resolve to one exact positive numeric document ID; and store/tenant embedded aliases must agree with the authoritative Firestore path. Key mutation rechecks those invariants transactionally, and pull reads recheck them before output.
- New MenuList keys record `productId: ML`, `purpose: menulist_public_api`, and `scopes: [public:read]`. Legacy credentials without those fields remain accepted, while explicit other-product/purpose credentials and explicit scopes that omit `public:read` are rejected before any store payload is built.
- Business response projection uses `src/lib/publicApi/businessProjection.ts`: only known business-attribute keys with boolean values leave the route, and temporary status must have a known public type, parseable future ISO expiry, and bounded string message. Persisted `createdBy` and arbitrary attribute/status fields never enter the DTO.
- The maintained [Business Truth Contract](../canonical-truth-infrastructure/canonical-truth-infrastructure_business-truth-contract.md) freezes the current canonical-source/projection relationship. Focused fixtures preserve linked outlet identity, variant IDs/prices, item allergen and dietary values, public decision-fact values without internal provenance leakage, stable item URLs, and request-time-independent ETag identity. This does not add or change an API field.

Historical sections below remain context, but this source gate is the current acceptance boundary.

## Architecture

```
External System sends GET with X-API-Key header
  ↓
API Route: /api/public/v1/business OR /api/public/v1/menu
  ├── Feature flag check (ENABLE_PUBLIC_API)
  ├── Fail-closed pre-auth rate limit (240 req/min per hashed client IP)
  ├── Fail-closed credential rate limit (60 req/min per hashed key segment) + Retry-After
  ├── Validate API key → SHA-256 hash → live lookup by apiKeyHash
  ├── Normalize credential store ID + exact positive numeric MenuList tenant/store IDs
  ├── Reject inactive/deleted/platform-blocked stores or platform-blocked tenants
  ├── Abuse logging (IP, user-agent, storeId)
  ├── Menu endpoint resolves default project from platformSummary/projects_{storeId}
  ├── Reject summary project IDs whose embedded tenant/store scope differs from the admitted API-key target
  ├── Build response with schemaVersion + generatedAt
  ├── ETag: check If-None-Match → 304 Not Modified if unchanged
  ├── Unexpected route failures log bounded diagnostics only
  └── Return JSON with ETag + private Cache-Control + Vary headers
```

---

## Files

| File                                        | Purpose                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/app/api/public/v1/business/route.ts`   | GET business details                                                           |
| `src/app/api/public/v1/menu/route.ts`       | GET menu data (PosSyncPayload format)                                          |
| `src/lib/publicApi/auth.ts`                 | API key hashing, validation, ETag generation, structured errors, abuse logging |
| `src/app/api/store/public-api-key/route.ts` | POST generate/revoke API key                                                   |
| `src/components/templates/main-app/businessSettings/tabs/IntegrationsTab.tsx` | Desktop generate/regenerate/copy/revoke UI |
| `src/types/platform/store.ts`               | `publicApi` field on StoreDataType                                             |
| `src/config/features.ts`                    | `ENABLE_PUBLIC_API` flag                                                       |

---

## Store Data Model

```typescript
// On StoreDataType
publicApi?: {
    apiKey?: string;      // Legacy raw-key compatibility only
    apiKeyHash?: string;  // SHA-256 hash of API key (new raw key is never stored)
    keyPrefix?: string;   // First 7 chars for identification (e.g., "ml_abc1")
    createdAt?: string;   // ISO 8601
    productId?: 'ML' | 'AL';
    purpose?: 'menulist_public_api' | 'answerlattice_public_api' | 'answerlattice_widget';
    scopes?: StorePublicApiCredentialScope[];
};
```

Current MenuList generation writes the hash, prefix, timestamp, `productId: 'ML'`, `purpose: 'menulist_public_api'`, and `scopes: ['public:read']` together. Optional fields in the shared type preserve admitted legacy rows and the existing Answerlattice public-API compatibility reader; runtime product/purpose/scope guards still reject explicit cross-product credentials.

---

## API Key Security

1. Owner or staff user with `MANAGE_INTEGRATIONS` generates key via `POST /api/store/public-api-key` (action: `generate`)
2. Raw key `ml_<uuid>` returned to owner **once** (never persisted)
3. SHA-256 hash is stored as `publicApi.apiKeyHash` together with non-secret `productId: ML`, `purpose: menulist_public_api`, and `scopes: [public:read]`; the raw key is never stored
4. Key prefix `ml_abc1...` stored for identification in admin UI
5. Validation: normalize bounded key shape → `SHA-256(key)` → Firestore lookup by `apiKeyHash`
6. Backward compat: while raw `apiKey` fields remain supported, hash and raw representations are queried together and may resolve to only one distinct store document. A transitional document containing both is valid; cross-store collisions fail closed.
7. Key generate/revoke is authenticated, feature-flagged, store-session scoped, permission-gated by `MANAGE_INTEGRATIONS`, fail-closed rate-limited, and capped at a strict 1KB JSON body. Request tenant/store IDs pass the same document-ID normalization and must exactly match the authenticated session before database work. The route transaction re-reads the tenant, store, lifecycle, ownership, and current store role before writing `stores/{storeId}.publicApi`; successful responses echo the exact admitted scope so the initiating UI can reject stale settlement.
8. Public v1 menu/business first use `hashPublicRateLimitValue(getClientIp(request))` for a 240/minute pre-auth ceiling, then `hashApiKey(apiKey).slice(0, 16)` for the 60/minute credential ceiling. Both fail closed when the limiter provider is unavailable; raw keys and IPs never enter limiter keys.
9. Key-management rate-limit keys use `hashPublicRateLimitValue(storeId)` as the provider key segment, and generate/revoke diagnostics use bounded store/tenant/user presence-length metadata only.
10. A valid MenuList key must also resolve to an eligible public target before data is returned: the store cannot be inactive, deleted, or platform-blocked, and the tenant document must exist and not be platform-blocked. Rejected blocked targets return the same `INVALID_API_KEY` shape to avoid disclosing account state to external callers.
11. MenuList pull endpoints do not opt into the shared validation cache. Every `/api/public/v1/business` and `/api/public/v1/menu` request rechecks the API key lookup and store/tenant eligibility so revocation, inactive/deleted state, and platform blocks are not hidden by process-local cache TTL.
12. Business Settings Integrations tab is the desktop owner UI for the key lifecycle. It uses the shared authenticated browser request policy, caps route responses at 8KB, keeps fixed local failure copy, blocks same-mount duplicate actions, and binds every request/response/context merge to the exact selected tenant/store.
13. Credential lookup returns only normalized store document IDs and rejects duplicate query matches. MenuList pull routes additionally require exact positive numeric tenant/store IDs before emitting public response IDs or building POS-sync menu payloads; malformed, reserved, whitespace-mutated, path-shaped, nonnumeric, or ambiguous targets return `INVALID_API_KEY`.

---

## Response Enhancements (v1.1)

### Schema Version

All responses include `schemaVersion: "1.0"` and `generatedAt` timestamp.

## Menu Source Of Truth

`GET /api/public/v1/menu` resolves the public menu through normalized `platformSummary/projects_{storeId}` before reading the full project document. The summary document owns `isDefault`, `active`, `deleted`, and special-menu listing state for project selection; the summary map key is the project identity. The full `projects/{tId}/{sId}/{projectId}` document owns item/category/menu content and its Firestore document ID remains authoritative over any embedded `projectId`. Runtime menu-version admission accepts only nonnegative safe integers. This matches the customer renderer and prevents missing default fields, embedded-ID drift, or malformed legacy versions from changing the public contract.

Linked outlet project documents intentionally persist only their master reference, overrides, and local-only content. Before formatting a linked outlet pull response, the route therefore validates the master ID with `normalizeMultiOutletProjectId`, requires the encoded tenant to match the authenticated target tenant, reads the active master project through Admin Firestore, and resolves inheritance through `resolveProjectForRender`. The outlet's own languages/menu version remain authoritative when present; a newly linked outlet with neither inherits the master languages/version instead of emitting an empty language list or unrelated default version. This adds one master-project read for linked outlets and prevents empty raw outlet documents from becoming false external menu truth.

### Structured Errors

All errors follow `{ error: { code, message } }` format. See spec for full error code list.

### Route Diagnostics

Unexpected `GET /api/public/v1/business` failures are logged as `public_api_business_route_failed`; unexpected `GET /api/public/v1/menu` failures are logged as `public_api_menu_route_failed`. Both routes keep browser responses on the existing structured `INTERNAL_ERROR` contract and send only bounded API-key/rate-limit/store/tenant/project presence-length metadata plus source error name/code/status into security diagnostics. Raw API keys, raw tenant/store/project IDs, and caught exception payloads are not emitted from these catch paths.

### ETag / Conditional Requests

- Response includes `ETag` header (SHA-256 hash of stable public truth, first 32 chars)
- Request-time `generatedAt` and top-level menu `timestamp` are excluded from ETag identity; they remain present in a newly transferred 200 response.
- Clients send `If-None-Match: "<etag>"` on subsequent requests
- Server returns `304 Not Modified` if content unchanged (zero payload transfer)
- Dramatically reduces bandwidth for polling integrations
- Response cache headers are `private, max-age=60, stale-while-revalidate=300` with `Vary: X-API-Key`. The API remains cache-friendly for the calling client while preventing shared/CDN caches from storing one API key's business or menu payload for another key.
- Structured error responses use `private, no-store` with `Vary: X-API-Key` so a keyed 401/404/429/500 cannot become shared or stale route truth.
- Limiter exhaustion returns `429 RATE_LIMIT_EXCEEDED`; limiter-provider failure under the fail-closed policy returns `503 SERVICE_UNAVAILABLE`. Both paths include `Retry-After`. The authenticated key-management route uses the same 429/503 distinction and private/no-store retry response.

### Retry-After

429 and retryable 503 responses include `Retry-After: <seconds>` header.

### Abuse Logging

Every successful request logs a fixed `public_api_request`-style diagnostic with endpoint, hashed request IP, and bounded store/user-agent presence-length metadata. Raw store IDs, raw IPs, and raw user-agent strings are not emitted. No dashboards — only for detecting leaked keys via log search.

---

## Exports from `src/lib/publicApi/auth.ts`

| Export                                      | Purpose                                             |
| ------------------------------------------- | --------------------------------------------------- |
| `validatePublicApiKey(key)`                 | Hash + Firestore lookup                             |
| `isMenuListPublicApiTargetAllowed(store)`   | Store + tenant eligibility check before MenuList public data leaves the API |
| `normalizePublicApiDocumentId(value)`        | Firestore document-ID guard for public API target IDs |
| `normalizeMenuListPublicApiNumericId(value)` | Exact positive numeric MenuList ID guard for public responses and target refs |
| `hashApiKey(key)`                           | SHA-256 hash for storage/validation                 |
| `generateETag(payload)`                     | Deterministic content hash for conditional requests |
| `generatePullApiETag(payload)`              | Stable pull hash excluding request-time response metadata |
| `buildPullApiResponseHeaders(etag)`         | Private pull-response cache, ETag, and API-key Vary headers |
| `pullApiError(code, message, status, headers?)` | Structured private/no-store pull error response |
| `apiError(code, message, status, headers?)` | Structured error response builder                   |
| `logApiRequest(request, storeId, endpoint)` | Minimal abuse-detection logging                     |
| `PULL_API_SCHEMA_VERSION`                   | Current schema version constant (`"1.0"`)           |

---

**Last Updated:** July 22, 2026
