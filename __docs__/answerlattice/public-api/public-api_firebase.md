# Answerlattice Public API — Firebase & Cost Notes

> **Status:** Implemented
> **Last Updated:** 2026-05-19

---

## Collections

| Collection | Operation | Endpoint | Notes |
| --- | --- | --- | --- |
| `stores` | Read | All endpoints | API-key hash lookup through `validatePublicApiKey()`; Answerlattice public APIs read only `publicApi` credentials, skip widget credential sources, and skip the legacy raw-key fallback query |
| `answerlattice_entitySearchIndex` | Read | Answers | Capped search index read by tenant/store |
| `answerlattice_releases` | Read | Answers | Latest active release when request does not include `currentVersion` |
| `answerlattice_canonicalAnswers` | Read | Answers | Active answers for matched entities |
| `answerlattice_entities` | Read | Entities | Capped registry read by tenant/store |
| `answerlattice_signalEvents` | Write | Signals | One append-only signal event |

---

## Expected Cost

| Endpoint | Normal reads | Normal writes | Notes |
| --- | ---: | ---: | --- |
| Answers | 2-5 reads | 0 | Hash-only key lookup + entity index + optional latest release + answer queries |
| Entities | 2 reads to capped page | 0 | Hash-only key lookup + capped entity registry query |
| Signals | 1 read | 1 write | Hash-only key lookup + explicit `signals:write` scope + append-only signal event |

All endpoints are rate-limited per API key before expensive work starts.

Widget-only credentials live under `stores.answerlatticeWidgetApi` and are not used by these public API endpoints. This avoids broader API authorization from embeddable widget keys while preserving a single store-document lookup pattern.

Read-only public API keys must not be allowed to create support signals. `/api/answerlattice/public/v1/signals` requires `signals:write`, while entities/answers continue to require `public:read`.

---

## Index Notes

The routes intentionally reuse existing tenant/store query patterns.

`GET /entities` filters `type` and `status` after a capped tenant query to avoid creating extra composite indexes for early rollout.

---

## Failure Behavior

| Case | Behavior |
| --- | --- |
| Public API flag disabled | `404 FEATURE_DISABLED` |
| Missing or invalid key | `401 INVALID_API_KEY` |
| Disallowed origin | `403 ORIGIN_NOT_ALLOWED` |
| Rate limit exceeded | `429 RATE_LIMIT_EXCEEDED` with `Retry-After` |
| Canonical answers disabled | `503 CANONICAL_ANSWERS_DISABLED` |
| Signal mutation disabled | `503 SIGNAL_MUTATION_DISABLED` |
| Internal Firestore/API error | `500 INTERNAL_ERROR` with secure server log |
