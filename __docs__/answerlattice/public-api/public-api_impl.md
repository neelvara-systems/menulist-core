# Answerlattice Public API v1 - Implementation

> **Status:** Implemented, locally audited, rollout-gated
> **Last Updated:** 2026-07-26

## Connected File Map

| File | Responsibility |
| --- | --- |
| `src/config/features.ts` | Main rollout flag and compiled-bundle read flag. |
| `src/constants/answerlattice/routes.ts` | Owner Public API management route. |
| `src/constants/answerlattice/navigations.ts` | Flag- and permission-gated navigation item. |
| `src/constants/answerlattice/permissions.ts` | `MANAGE_INTEGRATIONS` route admission. |
| `src/app/(answerlattice)/answerlattice/public-api/page.tsx` | Dedicated owner management page. |
| `src/components/templates/answerlattice/settings/AnswerlatticePublicApiManagement.tsx` | Strict status, create/rotate, one-time reveal, copy, and revoke UI. |
| `src/app/api/answerlattice/public-api-key/route.ts` | Authenticated key-management API. |
| `src/lib/answerlattice/publicApiContracts.ts` | Exact scopes, schemas, credential checks, response checks, public statuses/signal types, and metadata sanitization. |
| `src/lib/answerlattice/publicApiKeyStore.ts` | Hash-only store persistence and transactional audit. |
| `src/lib/answerlattice/publicApi.ts` | External request authentication, rate limiting, tenant resolution, and response headers. |
| `src/app/api/answerlattice/public/v1/answers/route.ts` | Canonical answer retrieval. |
| `src/app/api/answerlattice/public/v1/entities/route.ts` | Public entity registry and ETag behavior. |
| `src/app/api/answerlattice/public/v1/signals/route.ts` | Governed signal intake and replay-conflict response. |
| `src/lib/publicApi/auth.ts` | Shared hash lookup primitives; Answerlattice disables legacy raw fallback and positive auth cache. |
| `src/lib/answerlattice/canonicalRetrieval.ts` | Canonical-first retrieval and applicability resolution. |
| `src/lib/answerlattice/signalEmitter.ts` | Deterministic signal persistence and payload-conflict enforcement. |

## Owner Management Flow

```text
flag + authenticated session
  -> exact Answerlattice session scope
  -> fail-closed actor/workspace rate limit
  -> MANAGE_INTEGRATIONS permission
  -> strict bounded request
  -> browser-retained request ID + cryptographic key candidate
  -> create/rotate or revoke
  -> active-workspace transaction
  -> stores.publicApi hash-only update/delete
  -> append-only answerlattice_auditLogs summary
  -> strict private response
```

One workspace has at most one active Public API credential. Generating a new key is rotation, not key proliferation. The authenticated browser creates a cryptographically random candidate and operation ID, retains both across an unchanged retry, and sends them only to the protected management route. Every status or mutation request also corroborates the workspace visible when the action began. The route compares that value with the authoritative session scope and returns `409` if the session changed; the client never treats the supplied scope as authority. The transaction persists only the hash and operation ID. An exact retry returns the committed summary without another write or audit; a reused operation ID with changed key/scopes returns `409`. The raw key is returned only in the successful create/rotate response.

The persisted credential shape is:

```ts
{
  apiKeyHash: string; // 64 lowercase hex characters
  keyPrefix: string;  // bounded al_ prefix for recognition
  createdAt: string;  // exact ISO timestamp
  productId: 'AL';
  purpose: 'answerlattice_public_api';
  rotationRequestId: string; // UUID; retry identity, not secret material
  scopes: Array<'public:read' | 'signals:write' | 'mcp:read'>;
}
```

The browser never receives the hash. Firestore never receives the raw key. Audit records contain only prefix, timestamp, scopes, active state, actor, and tenant/workspace scope. Management responses acknowledge the authoritative tenant/workspace scope. The screen renders status and the one-time secret only when that acknowledgement, current Answerlattice access scope, and current session scope agree; a workspace transition clears pending rotation identity and rejects stale asynchronous settlement.

## External Authentication Flow

`authenticateAnswerlatticePublicApi()` enforces this order:

1. Main feature flag is enabled.
2. `X-API-Key` is a non-empty `al_*` value.
3. IP-based pre-auth rate limiting runs and fails closed on provider error.
4. Per-key-hash and endpoint rate limiting runs and fails closed.
5. Requests carrying a browser `Origin` are rejected; this credential is server-side only.
6. Hash-only lookup runs against `stores.publicApi` with legacy raw fallback disabled and cache TTL `0`.
7. Credential source, product, purpose, scope array, and required endpoint scope match exactly.
8. Active Answerlattice tenant/workspace scope is derived from the store record.

`mcp:read` is deliberately separate from `public:read`. The MCP session exchange cannot turn an ordinary public-read credential into private compiled-context access.
9. Retrieval or signal work begins.

Key-management requests separately reject cross-origin browser submissions before permission or Firestore work, and require initiating-workspace corroboration before any credential read or write.

## Endpoint Contracts

### Answers

- Body limit: 16 KiB.
- Query: 1-500 trimmed characters.
- Optional version: positive bounded integer.
- Optional plan, role, and state: non-empty bounded IDs.
- Optional context: `AnswerlatticeContextSchema`, only when context-aware support is enabled.
- Runtime: `attemptCanonicalRetrieval()` only; no RAG/provider fallback.
- Public projection: approved answer content, an existing-schema-validated guided procedure, explicit applicability-version fields, normalized citations, confidence, clarification, bounded governance flags, and timestamps.
- Excluded: internal or future `productBinding` siblings, internal evidence IDs, drift reasons, audit records, raw source records, knowledge-graph expansion/interaction rules, and production debug traces.
- Canonical ranking uses the same failure-contained timestamp boundary as serialization; malformed legacy validation time is ignored for recency rather than suppressing all otherwise valid canonical answers.

### Entities

- Query allows known entity type, public status (`active` or `beta`), and limit 1-200.
- Compiled private entity-index bundle is preferred only when both bundle flags are enabled and the manifest is ready.
- Firestore fallback applies the admitted type and active/beta status predicates in Firestore before its cap, then sorts the admitted page deterministically. The type-plus-status index exists in both dedicated and shared manifests.
- ETag is derived from stable payload fields and excludes `generatedAt`, so `If-None-Match` can return `304`.
- `deprecated`, draft, and invalid entity rows are excluded.
- The response reports `truncated` when the bounded source cannot prove completeness; v1 has no cursor pagination.
- Shared public timestamp serialization accepts only valid ISO strings, `Date`, or timestamp-like `toDate`/`toMillis` results and returns `null` for malformed, throwing, or Proxy-backed legacy values.

### Signals

- Body limit: 32 KiB.
- Requires `signals:write` and enabled signal mutation.
- Allows only public support/friction signal types.
- Requires a bounded idempotency key.
- Optional entity ID must pass the shared governance ID boundary.
- Metadata is unknown-typed at admission, capped to finite primitive values, and strips reserved identity/source fields without invoking object coercion.
- Invalid dates, nonfinite numbers, cyclic values, throwing getters, and Proxy-backed containers cannot escape sanitization or identity derivation; process-local and durable deduplication use only the sanitized structure.
- Server-owned source/request IDs are added after sanitization.
- Exact replay is idempotent; changed replay content returns deterministic `409`.
- A successful write returns `202`; it never mutates or publishes a canonical answer.

## Response and Cache Contract

- Answer and signal responses: `private, no-store, max-age=0`.
- Entity responses: `private, max-age=60`, `Vary: X-API-Key`, `nosniff`, and stable ETag.
- Authentication and error responses: private/no-store with fixed public error bodies.
- No CORS allow headers are emitted because browser use is unsupported.

## Deliberate Non-Goals

- browser or mobile secret use;
- generic document/chunk search;
- ticket management or help-desk replacement;
- canonical-answer writes or approvals;
- private evidence/source export;
- autonomous actions;
- multiple active keys per workspace;
- customer-selected arbitrary scopes;
- broad webhook/workflow automation.

## Verification

Focused source gates:

```bash
npm run test:answerlattice-public-api-contracts
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-public-api-key:emulator
npm run typecheck:answerlattice
node scripts/verification/verify-answerlattice-runtime-truth.js
```

Hosted external-consumer proof remains a rollout requirement and is not implied by local source completion.
