# Answerlattice Public API — Implementation

> **Status:** Implemented
> **Last Updated:** 2026-06-16

---

## Files

| File | Role |
| --- | --- |
| `src/lib/answerlattice/publicApi.ts` | Shared public API-key authentication, rate limiting, schema version, timestamp helpers |
| `src/lib/publicApi/auth.ts` | Shared hash validation, credential source selection, and scope checks |
| `src/app/api/answerlattice/public/v1/answers/route.ts` | Public canonical answer retrieval |
| `src/app/api/answerlattice/public/v1/entities/route.ts` | Public entity registry |
| `src/app/api/answerlattice/public/v1/signals/route.ts` | Public signal ingestion |
| `src/lib/answerlattice/canonicalRetrieval.ts` | Canonical-first retrieval used by answers API |
| `src/lib/answerlattice/signalEmitter.ts` | Server-side Answerlattice signal write path used by signals API |

---

## Authentication Contract

`authenticateAnswerlatticePublicApi()` enforces:

1. `ENABLE_ANSWERLATTICE_PUBLIC_API` is enabled.
2. `X-API-Key` exists and starts with `al_`.
3. Rate limit is checked before Firestore key lookup.
4. `validatePublicApiKey()` resolves the hash-only key from `stores.publicApi.apiKeyHash`; Answerlattice public APIs disable the legacy raw-key fallback and do not opt into widget-only credential sources.
5. The resolved key must be an Answerlattice public API key (`productId: 'AL'` when present, `purpose` starts with `answerlattice` when present, and the endpoint's required scope is present).
   - Read endpoints require `public:read`.
   - Signal-ingestion endpoints require `signals:write`.
6. If the request has an `Origin`, it must match the store's allowed origins.
7. `tId` and `sId` are derived from the resolved store, never from the request body.

Widget credentials are intentionally separate:

- `stores.answerlatticeWidgetApi` is accepted only by widget runtime routes.
- Legacy `stores.publicApi.purpose = "answerlattice_widget"` keys remain accepted by widget routes but are rejected by Answerlattice public API routes.

---

## Endpoint Behavior

### `POST /api/answerlattice/public/v1/answers`

- Validates request body with Zod.
- Optionally validates context with `AnswerlatticeContextSchema`.
- Calls `attemptCanonicalRetrieval()`.
- Returns governed canonical answer data only.
- Suppresses internal entity-resolution debug traces in production responses; retrieval debug stays inside owner-controlled escalation/ticket diagnostics.
- Does not run RAG fallback or provider-heavy AI work.

### `GET /api/answerlattice/public/v1/entities`

- Reads a capped tenant entity list from Answerlattice Firestore.
- Filters by optional `type` and `status` in memory to avoid adding more composite index requirements.
- Defaults to public-visible statuses: `active` and `beta`.
- Supports `ETag` and short private cache headers.

### `POST /api/answerlattice/public/v1/signals`

- Requires `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION`.
- Requires an explicit `signals:write` public API key scope; `public:read` alone cannot write signals.
- Validates signal type against `ANSWERLATTICE_SIGNAL_TYPE`.
- Sanitizes metadata to primitive values with key and value limits.
- Treats `externalId`, `requestId`, or `idempotencyKey` as server-side signal idempotency keys when present.
- Calls `emitAnswerlatticeSignal()`.
- Returns `202 Accepted`.

---

## Cost Controls

- Malformed/non-`al_*` keys fail before Firestore lookup.
- Hash-only Answerlattice keys skip the legacy raw-key fallback query.
- Rate limiting runs before key validation.
- Answer retrieval does not call Gemini/RAG.
- Entity registry reads are capped at 200 documents.
- Signal ingestion writes one signal document and uses deterministic document IDs for explicit source/request IDs so retries do not append duplicate signal rows.

---

## Security Notes

- API keys are never stored raw.
- API responses do not include internal audit trails, mutation proposals, user data, or raw Firestore documents.
- Public answer responses do not expose entity-resolution debug internals in production.
- Signal ingestion never mutates canonical answers directly; it only feeds the governed mutation pipeline.
- Tenant isolation is key-derived and server-side.

---

## Testing

Baseline checks:

```bash
npx tsc --noEmit --incremental false
npm --prefix functions-answerlattice run build
```

Route smoke checks:

- Feature flag disabled returns `404 FEATURE_DISABLED`.
- Missing/invalid key returns `401 INVALID_API_KEY`.
- Malformed body returns `400 INVALID_INPUT`.
