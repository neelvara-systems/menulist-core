# Platform Pull API — Implementation

**Status:** ✅ IMPLEMENTED (v1.1 — hardened Mar 14, 2026)  
**Date:** February 22, 2026  
**Feature Flag:** `ENABLE_PUBLIC_API`

---

## Architecture

```
External System sends GET with X-API-Key header
  ↓
API Route: /api/public/v1/business OR /api/public/v1/menu
  ├── Feature flag check (ENABLE_PUBLIC_API)
  ├── Rate limit (60 req/min per key) + Retry-After header
  ├── Validate API key → SHA-256 hash → lookup by apiKeyHash
  ├── Abuse logging (IP, user-agent, storeId)
  ├── Build response with schemaVersion + generatedAt
  ├── ETag: check If-None-Match → 304 Not Modified if unchanged
  └── Return JSON with ETag + Cache-Control headers
```

---

## Files

| File                                        | Purpose                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/app/api/public/v1/business/route.ts`   | GET business details                                                           |
| `src/app/api/public/v1/menu/route.ts`       | GET menu data (PosSyncPayload format)                                          |
| `src/lib/publicApi/auth.ts`                 | API key hashing, validation, ETag generation, structured errors, abuse logging |
| `src/app/api/store/public-api-key/route.ts` | POST generate/revoke API key                                                   |
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

1. Owner generates key via `POST /api/store/public-api-key` (action: `generate`)
2. Raw key `ml_<uuid>` returned to owner **once** (never persisted)
3. SHA-256 hash stored in Firestore as `publicApi.apiKeyHash`
4. Key prefix `ml_abc1...` stored for identification in admin UI
5. Validation: incoming key → `SHA-256(key)` → Firestore lookup by `apiKeyHash`
6. Backward compat: fallback lookup by raw `apiKey` field for pre-migration keys

---

## Response Enhancements (v1.1)

### Schema Version

All responses include `schemaVersion: "1.0"` and `generatedAt` timestamp.

### Structured Errors

All errors follow `{ error: { code, message } }` format. See spec for full error code list.

### ETag / Conditional Requests

- Response includes `ETag` header (SHA-256 hash of payload, first 32 chars)
- Clients send `If-None-Match: "<etag>"` on subsequent requests
- Server returns `304 Not Modified` if content unchanged (zero payload transfer)
- Dramatically reduces bandwidth for polling integrations

### Retry-After

429 responses include `Retry-After: <seconds>` header.

### Abuse Logging

Every successful request logs: storeId, IP, user-agent (truncated to 120 chars).
No dashboards — only for detecting leaked keys via log search.

---

## Exports from `src/lib/publicApi/auth.ts`

| Export                                      | Purpose                                             |
| ------------------------------------------- | --------------------------------------------------- |
| `validatePublicApiKey(key)`                 | Hash + Firestore lookup                             |
| `hashApiKey(key)`                           | SHA-256 hash for storage/validation                 |
| `generateETag(payload)`                     | Deterministic content hash for conditional requests |
| `apiError(code, message, status, headers?)` | Structured error response builder                   |
| `logApiRequest(request, storeId, endpoint)` | Minimal abuse-detection logging                     |
| `PULL_API_SCHEMA_VERSION`                   | Current schema version constant (`"1.0"`)           |

---

**Last Updated:** March 14, 2026
