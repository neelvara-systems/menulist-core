# Answerlattice Public API v1 - Firebase and Cost

> **Status:** Implemented, locally audited, rollout-gated
> **Last Updated:** 2026-07-26

## Data Ownership

| Collection/object | Operation | Flow | Boundary |
| --- | --- | --- | --- |
| `stores/{sId}.publicApi` | Read/update/delete | Authentication and owner key lifecycle | Hash-only credential; exact AL product, purpose, scopes, prefix, timestamp, and non-secret rotation request ID. |
| `answerlattice_auditLogs` | Create | Rotate/revoke | Summary only; no raw key or hash. |
| `answerlattice_entitySearchIndex` | Read | Answers | Tenant/workspace-scoped entity candidates. |
| `answerlattice_releases` | Read | Answers | Latest applicable release when version is omitted. |
| `answerlattice_canonicalAnswers` | Read | Answers | Approved active canonical answers only through canonical retrieval. |
| private compiled context bundle | Storage read | Entities | Server-only bundle preference when ready and enabled. |
| `answerlattice_entities` | Read | Entities fallback | Bounded tenant/workspace scan; active/beta public projection only. |
| `answerlattice_signalEvents` | Create/read-on-replay | Signals | Append-only evidence with TTL and deterministic identity for idempotency. |

Firestore browser rules do not grant raw Public API credential management. The authenticated Next.js management route uses Answerlattice Admin after session, scope, rate, permission, and initiating-workspace corroboration. The client-provided scope can only reject a request; the authenticated session remains authoritative.

## Normal Operation Cost

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Owner key status | 1 | 0 | Exact store read after permission admission. |
| Create/rotate key | 1 transactional | 2 | Store credential update plus audit create. |
| Exact create/rotate retry | 1 transactional | 0 | Matching operation ID, hash, and scopes return the committed summary. Changed replay returns `409` with no write. |
| Revoke existing key | 1 transactional | 2 | Store field delete plus audit create. Revoking when no credential exists performs no writes. |
| Public answer request | approximately 2-5 | 0 | Key lookup plus canonical entity/release/answer reads; no AI provider call. |
| Public entity request, bundle ready | 1 key lookup plus Storage | 0 | Storage metadata/object work follows compiled-context limits. |
| Public entity request, fallback | 2 | 0 | Key lookup plus capped entity query. |
| Public signal request | 1 key lookup plus replay transaction work | 1 new event | Exact retry does not append another event; conflicting replay fails. |

Permission admission and rate-limit provider operations are additional to the collection counts above. Public API auth intentionally performs the key lookup for each admitted request so revocation is immediate.

## Scale and Abuse Controls

- Invalid key shape fails before Firestore.
- IP pre-auth admission limits random-key rotation attacks.
- Per-key/endpoint limits protect valid credentials and expensive downstream work.
- Rate-limit provider failure is fail-closed.
- JSON body limits run before schema validation and retrieval/write work.
- Entity fallback applies exact public status plus optional type predicates before reading at most 201 rows, and returns `truncated` rather than scanning the collection. Dedicated and shared index manifests include `pId + tId + sId + type + status`.
- Signal metadata, keys, arrays, strings, and idempotency values are bounded.
- Signal identity and persistence share the same sanitized finite metadata structure; malformed object/Proxy/date input cannot replace the controlled result or create a second identity.
- No provider-heavy RAG generation occurs on Public API routes.
- One active key per workspace bounds credential lookup and owner complexity.

## Retention and Deletion

- Active credential: durable until rotation, revocation, or workspace lifecycle removal.
- Credential audit: follows the Answerlattice audit-log retention policy; it contains no secret/hash.
- Signal events: new rows use the shared signal TTL contract.
- Public responses: not persisted by these routes; external consumers own their downstream retention.
- Logs: endpoint identity and bounded scope metadata only; no raw key, request body, ticket PII, or source content.

## Failure Behavior

| Condition | Result |
| --- | --- |
| Main flag disabled | `404 FEATURE_DISABLED` externally; owner page/navigation hidden. |
| Key-management cross-origin request | `403 Origin not allowed`. |
| Key-management initiating scope differs from the current session | `409`; no credential read/write and stale browser state is not admitted. |
| Key-management operation ID reused with changed key/scopes | `409`; existing credential remains active. |
| Missing/invalid/revoked/wrong-purpose key | `401 INVALID_API_KEY`. |
| Browser-origin external request | `403 BROWSER_ACCESS_NOT_SUPPORTED`. |
| Rate provider unavailable | `503 RATE_LIMIT_UNAVAILABLE`; no retrieval/write. |
| Rate exceeded | `429 RATE_LIMIT_EXCEEDED` with `Retry-After`. |
| Canonical answers disabled | `503 CANONICAL_ANSWERS_DISABLED`. |
| Signal mutation disabled | `503 SIGNAL_MUTATION_DISABLED`. |
| Signal idempotency payload conflict | `409 IDEMPOTENCY_REPLAY_CONFLICT`. |
| Bundle unavailable | Bounded Firestore entity fallback. |
| Firebase unavailable | Fixed `500/503` public response plus bounded server diagnostic. |

## Deployment Boundary

Feature 35 changes Next.js routes, components, shared TypeScript contracts, dedicated/shared Firestore rules, docs, and verifiers. The rules reserve Public API key audit actions for server writes; shared rules also prevent browser creation, modification, or deletion of `publicApi` and `answerlatticeWidgetApi` credentials while preserving ordinary authorized store updates. No Cloud Function, Storage rule, or index change is part of this feature.

After local emulator verification, both required QA deploys were attempted on 2026-07-20:

```bash
firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive
firebase deploy --only firestore:rules --project menulist-qa --config firebase.json --non-interactive
```

Both stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote rules revision changed. App/runtime deployment remains subject to the explicit Vercel deploy opt-in rule and was not run.

The July 26, 2026 data-flow audit also hardened the byte-identical support-evidence redactor used by the app and dedicated Functions runtime. After local lint/build, `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` was attempted and stopped before upload with `Failed to authenticate, have you run firebase login?`; no remote Function changed. Re-authentication and the same scoped command remain required.
