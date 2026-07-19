# Answerlattice Public API v1 - Implementation

> **Status:** Implemented, locally audited, rollout-gated
> **Last Updated:** 2026-07-20

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
  -> create/rotate or revoke
  -> active-workspace transaction
  -> stores.publicApi hash-only update/delete
  -> append-only answerlattice_auditLogs summary
  -> strict private response
```

One workspace has at most one active Public API credential. Generating a new key is rotation, not key proliferation. The raw key is generated server-side and returned only in the successful create/rotate response.

The persisted credential shape is:

```ts
{
  apiKeyHash: string; // 64 lowercase hex characters
  keyPrefix: string;  // bounded al_ prefix for recognition
  createdAt: string;  // exact ISO timestamp
  productId: 'AL';
  purpose: 'answerlattice_public_api';
  scopes: Array<'public:read' | 'signals:write' | 'mcp:read'>;
}
```

The browser never receives the hash. Audit records contain only prefix, timestamp, scopes, active state, actor, and tenant/workspace scope.

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

Key-management POST requests separately reject cross-origin browser submissions before permission or Firestore work.

## Endpoint Contracts

### Answers

- Body limit: 16 KiB.
- Query: 1-500 trimmed characters.
- Optional version: positive bounded integer.
- Optional plan, role, and state: non-empty bounded IDs.
- Optional context: `AnswerlatticeContextSchema`, only when context-aware support is enabled.
- Runtime: `attemptCanonicalRetrieval()` only; no RAG/provider fallback.
- Public projection: approved answer content, applicability, normalized citations, confidence, clarification, bounded governance flags, and timestamps.
- Excluded: internal evidence IDs, drift reasons, audit records, raw source records, knowledge-graph expansion/interaction rules, and production debug traces.

### Entities

- Query allows known entity type, public status (`active` or `beta`), and limit 1-200.
- Compiled private entity-index bundle is preferred only when both bundle flags are enabled and the manifest is ready.
- Firestore fallback is capped and sorted deterministically.
- ETag is derived from stable payload fields and excludes `generatedAt`, so `If-None-Match` can return `304`.
- `deprecated`, draft, and invalid entity rows are excluded.
- The response reports `truncated` when the bounded source cannot prove completeness; v1 has no cursor pagination.

### Signals

- Body limit: 32 KiB.
- Requires `signals:write` and enabled signal mutation.
- Allows only public support/friction signal types.
- Requires a bounded idempotency key.
- Optional entity ID must pass the shared governance ID boundary.
- Metadata is capped to primitive values and reserved identity/source fields are stripped.
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
