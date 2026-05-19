# Canonica Public API — Implementation

> **Status:** Implemented
> **Last Updated:** 2026-05-19

---

## Files

| File | Role |
| --- | --- |
| `src/lib/canonica/publicApi.ts` | Shared public API-key authentication, rate limiting, schema version, timestamp helpers |
| `src/lib/publicApi/auth.ts` | Shared hash validation, credential source selection, and scope checks |
| `src/app/api/canonica/public/v1/answers/route.ts` | Public canonical answer retrieval |
| `src/app/api/canonica/public/v1/entities/route.ts` | Public entity registry |
| `src/app/api/canonica/public/v1/signals/route.ts` | Public signal ingestion |
| `src/lib/canonica/canonicalRetrieval.ts` | Canonical-first retrieval used by answers API |
| `src/lib/canonica/signalEmitter.ts` | Server-side Canonica signal write path used by signals API |

---

## Authentication Contract

`authenticateCanonicaPublicApi()` enforces:

1. `ENABLE_CANONICA_PUBLIC_API` is enabled.
2. `X-API-Key` exists and starts with `cn_`.
3. Rate limit is checked before Firestore key lookup.
4. `validatePublicApiKey()` resolves the hash-only key from `stores.publicApi.apiKeyHash`; Canonica public APIs disable the legacy raw-key fallback and do not opt into widget-only credential sources.
5. The resolved key must be a Canonica public API key (`productId: "CN"` when present, `purpose` starts with `canonica` when present, and scope permits `public:read`).
6. If the request has an `Origin`, it must match the store's allowed origins.
7. `tId` and `sId` are derived from the resolved store, never from the request body.

Widget credentials are intentionally separate:

- `stores.canonicaWidgetApi` is accepted only by widget runtime routes.
- `stores.canonicaWidgetTestApi` is accepted only by the temporary MenuList-as-client widget test host.
- Legacy `stores.publicApi.purpose = "canonica_widget"` keys remain accepted by widget routes but are rejected by Canonica public API routes.

---

## Endpoint Behavior

### `POST /api/canonica/public/v1/answers`

- Validates request body with Zod.
- Optionally validates context with `CanonicaContextSchema`.
- Calls `attemptCanonicalRetrieval()`.
- Returns governed canonical answer data only.
- Does not run RAG fallback or provider-heavy AI work.

### `GET /api/canonica/public/v1/entities`

- Reads a capped tenant entity list from Canonica Firestore.
- Filters by optional `type` and `status` in memory to avoid adding more composite index requirements.
- Defaults to public-visible statuses: `active` and `beta`.
- Supports `ETag` and short private cache headers.

### `POST /api/canonica/public/v1/signals`

- Requires `ENABLE_CANONICA_SIGNAL_MUTATION`.
- Validates signal type against `CANONICA_SIGNAL_TYPE`.
- Sanitizes metadata to primitive values with key and value limits.
- Calls `emitCanonicaSignal()`.
- Returns `202 Accepted`.

---

## Cost Controls

- Malformed/non-`cn_*` keys fail before Firestore lookup.
- Hash-only Canonica keys skip the legacy raw-key fallback query.
- Rate limiting runs before key validation.
- Answer retrieval does not call Gemini/RAG.
- Entity registry reads are capped at 200 documents.
- Signal ingestion writes one signal document and uses existing dedup logic where applicable.

---

## Security Notes

- API keys are never stored raw.
- API responses do not include internal audit trails, mutation proposals, user data, or raw Firestore documents.
- Signal ingestion never mutates canonical answers directly; it only feeds the governed mutation pipeline.
- Tenant isolation is key-derived and server-side.

---

## Testing

Baseline checks:

```bash
npx tsc --noEmit --incremental false
npm --prefix functions-canonica run build
```

Route smoke checks:

- Feature flag disabled returns `404 FEATURE_DISABLED`.
- Missing/invalid key returns `401 INVALID_API_KEY`.
- Malformed body returns `400 INVALID_INPUT`.
