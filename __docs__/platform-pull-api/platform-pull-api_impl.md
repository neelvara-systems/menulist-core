# Platform Pull API — Implementation

**Status:** ✅ IMPLEMENTED (v1.10 — target document-ID boundary aligned Jul 6, 2026)
**Date:** February 22, 2026  
**Feature Flag:** `ENABLE_PUBLIC_API`
**Last Source Gate Update:** July 6, 2026

---

## Source Gate

This implementation doc is source-gated by `npm run verify:platform-pull-api-boundary`.

Current source contract:

- `POST /api/store/public-api-key` is dynamic, authenticated with `withAuth()`, feature-gated by `ENABLE_PUBLIC_API`, scoped to the session store, permission-gated by `MANAGE_INTEGRATIONS`, rate-limited by a hashed store segment, and capped at a 1KB JSON body before Zod validation. The key-management route validates session tenant/store IDs through the shared Firestore document-ID guard with an exact raw-value check and a 160-character ceiling before permission checks, limiter keys, store refs, and diagnostics.
- Key generation creates an `ml_` key, stores only `publicApi.apiKeyHash`, `keyPrefix`, and `createdAt`, returns the raw key once, and logs bounded diagnostics. Revoke deletes `publicApi`.
- Business Settings Integrations tab exposes generate/regenerate/copy/revoke controls. The raw key is shown only once after generation; after that the UI displays only the stored prefix.
- `/api/public/v1/business` and `/api/public/v1/menu` accept only `ml_` keys, rate-limit by `hashApiKey(apiKey).slice(0, 16)`, re-run key and target eligibility lookup on every request, require normalized credential store IDs and exact positive numeric MenuList target IDs before response construction, return private `Cache-Control` plus `Vary: X-API-Key`, and log only bounded diagnostics on unexpected failures.
- The menu endpoint selects the public project from normalized `platformSummary/projects_{storeId}` truth, normalizes candidate project IDs, and reads the full project document only through normalized `projects/{tId}/{sId}/{projectId}` refs.

Historical sections below remain context, but this source gate is the current acceptance boundary.

## Architecture

```
External System sends GET with X-API-Key header
  ↓
API Route: /api/public/v1/business OR /api/public/v1/menu
  ├── Feature flag check (ENABLE_PUBLIC_API)
  ├── Rate limit (60 req/min per hashed key segment) + Retry-After header
  ├── Validate API key → SHA-256 hash → live lookup by apiKeyHash
  ├── Normalize credential store ID + exact positive numeric MenuList tenant/store IDs
  ├── Reject inactive/deleted/platform-blocked stores or platform-blocked tenants
  ├── Abuse logging (IP, user-agent, storeId)
  ├── Menu endpoint resolves default project from platformSummary/projects_{storeId}
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
    apiKeyHash: string;   // SHA-256 hash of API key (raw key never stored)
    keyPrefix: string;    // First 7 chars for identification (e.g., "ml_abc1")
    createdAt: string;    // ISO 8601
};
```

---

## API Key Security

1. Owner or staff user with `MANAGE_INTEGRATIONS` generates key via `POST /api/store/public-api-key` (action: `generate`)
2. Raw key `ml_<uuid>` returned to owner **once** (never persisted)
3. SHA-256 hash stored in Firestore as `publicApi.apiKeyHash`
4. Key prefix `ml_abc1...` stored for identification in admin UI
5. Validation: incoming key → `SHA-256(key)` → Firestore lookup by `apiKeyHash`
6. Backward compat: fallback lookup by raw `apiKey` field for pre-migration keys
7. Key generate/revoke is authenticated, feature-flagged, store-session scoped, permission-gated by `MANAGE_INTEGRATIONS`, rate-limited, and capped at a 1KB JSON body before validation or writing `stores/{storeId}.publicApi`. Session tenant/store IDs pass through the shared Firestore document-ID guard with an exact raw-value check and a 160-character ceiling before the route builds the store document ref.
8. Public v1 menu/business rate-limit keys use `hashApiKey(apiKey).slice(0, 16)` as the provider key segment. Raw API keys must never be written into rate-limit keys.
9. Key-management rate-limit keys use `hashPublicRateLimitValue(storeId)` as the provider key segment, and generate/revoke diagnostics use bounded store/tenant/user presence-length metadata only.
10. A valid MenuList key must also resolve to an eligible public target before data is returned: the store cannot be inactive, deleted, or platform-blocked, and the tenant document must exist and not be platform-blocked. Rejected blocked targets return the same `INVALID_API_KEY` shape to avoid disclosing account state to external callers.
11. MenuList pull endpoints do not opt into the shared validation cache. Every `/api/public/v1/business` and `/api/public/v1/menu` request rechecks the API key lookup and store/tenant eligibility so revocation, inactive/deleted state, and platform blocks are not hidden by process-local cache TTL.
12. Business Settings Integrations tab is the desktop owner UI for the key lifecycle. It uses the shared authenticated browser request policy, caps route responses at 8KB, and keeps fixed local failure copy.
13. Credential lookup returns only normalized store document IDs. MenuList pull routes additionally require exact positive numeric tenant/store IDs before emitting public response IDs or building POS-sync menu payloads; malformed, reserved, whitespace-mutated, path-shaped, or nonnumeric target IDs return the existing `INVALID_API_KEY` shape.

---

## Response Enhancements (v1.1)

### Schema Version

All responses include `schemaVersion: "1.0"` and `generatedAt` timestamp.

## Menu Source Of Truth

`GET /api/public/v1/menu` resolves the public menu through normalized `platformSummary/projects_{storeId}` before reading the full project document. The summary document owns `isDefault`, `active`, `deleted`, and special-menu listing state for project selection; the full `projects/{tId}/{sId}/{projectId}` document owns item/category/menu content and is read only after tenant, store, and selected project document IDs are normalized. This matches the customer renderer and prevents the pull API from treating a missing `isDefault` field on the full project document as "no menu."

### Structured Errors

All errors follow `{ error: { code, message } }` format. See spec for full error code list.

### Route Diagnostics

Unexpected `GET /api/public/v1/business` failures are logged as `public_api_business_route_failed`; unexpected `GET /api/public/v1/menu` failures are logged as `public_api_menu_route_failed`. Both routes keep browser responses on the existing structured `INTERNAL_ERROR` contract and send only bounded API-key/rate-limit/store/tenant/project presence-length metadata plus source error name/code/status into security diagnostics. Raw API keys, raw tenant/store/project IDs, and caught exception payloads are not emitted from these catch paths.

### ETag / Conditional Requests

- Response includes `ETag` header (SHA-256 hash of payload, first 32 chars)
- Clients send `If-None-Match: "<etag>"` on subsequent requests
- Server returns `304 Not Modified` if content unchanged (zero payload transfer)
- Dramatically reduces bandwidth for polling integrations
- Response cache headers are `private, max-age=60, stale-while-revalidate=300` with `Vary: X-API-Key`. The API remains cache-friendly for the calling client while preventing shared/CDN caches from storing one API key's business or menu payload for another key.

### Retry-After

429 responses include `Retry-After: <seconds>` header.

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
| `buildPullApiResponseHeaders(etag)`         | Private pull-response cache, ETag, and API-key Vary headers |
| `apiError(code, message, status, headers?)` | Structured error response builder                   |
| `logApiRequest(request, storeId, endpoint)` | Minimal abuse-detection logging                     |
| `PULL_API_SCHEMA_VERSION`                   | Current schema version constant (`"1.0"`)           |

---

**Last Updated:** July 6, 2026
