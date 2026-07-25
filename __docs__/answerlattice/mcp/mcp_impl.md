# Answerlattice MCP - Implementation

> **Status:** Implemented, locally audited, rollout-gated
> **Last Updated:** 2026-07-25

## Connected File Map

| File | Responsibility |
| --- | --- |
| `src/config/features.ts` | MCP, compiled-context, and signal-mutation rollout gates. |
| `src/types/platform/store.ts` | Public credential scope union including `mcp:read`. |
| `src/lib/answerlattice/publicApiContracts.ts` | Exact AL product/purpose/scope credential validation. |
| `src/app/api/answerlattice/public-api-key/route.ts` | Owner issue/rotate/revoke path for `al_*` credentials. |
| `src/app/api/answerlattice/mcp/session/route.ts` | Server/desktop key exchange for bounded signed MCP sessions. |
| `src/lib/answerlattice/mcpSession.ts` | Token claims, signing, length limits, scope checks, and verification. |
| `src/lib/answerlattice/mcpProtocol.ts` | Supported protocol versions and strict JSON-RPC schemas. |
| `src/app/api/answerlattice/mcp/route.ts` | Streamable HTTP admission, lifecycle methods, discovery, calls, and limits. |
| `src/lib/answerlattice/mcpTools.ts` | Tool schemas, bundle reads, stable output envelope, and governed signal reporting. |
| `src/lib/answerlattice/compiledContext.ts` | Bundle paths, reference validation, route keys, and MCP limits. |
| `src/lib/answerlattice/contextBundleBuilderServer.ts` | Ready manifest and private object loading. |
| `src/lib/answerlattice/signalEmitter.ts` | Existing governed signal lifecycle used by the write tool. |
| `scripts/verification/test-answerlattice-mcp-session.ts` | Token and scope contracts. |
| `scripts/verification/test-answerlattice-mcp-contracts.ts` | Protocol, JSON-RPC, tool schema, and annotation contracts. |
| `scripts/verification/verify-answerlattice-runtime-truth.js` | Source-level architecture and ordering assertions. |

## Session Exchange

`POST /api/answerlattice/mcp/session` enforces:

1. MCP plus compiled bundles enabled.
2. signing secret configured with at least 32 characters;
3. no browser `Origin`;
4. recognizable `al_*` key;
5. fail-closed pre-auth IP and per-key limits;
6. hash-only key lookup with positive cache disabled;
7. exact Public API credential source and exact `mcp:read` product/purpose/scope contract;
8. active tenant/workspace ownership;
9. ready positive bundle version;
10. five-minute signed session issuance.

`signals:write` is copied into the session only when the source credential includes that exact scope. Rotating or revoking the `al_*` key blocks new exchanges immediately. Existing stateless sessions expire after five minutes and read tools also fail if the active bundle version changes.

## Token Contract

```ts
{
  sub: 'answerlattice_mcp_session';
  aud: 'answerlattice_mcp';
  tId: number;
  sId: number;
  scope: Array<'context:read' | 'signals:write'>;
  bundleVersion: number;
  iat: number;
  exp: number;
}
```

Tokens are HMAC-SHA256 payload/signature pairs. Verification rejects unknown claims, duplicate/unknown scopes, non-safe IDs/times, nonpositive bundle versions, future issue time, invalid lifetime, weak secret configuration, oversized segments, malformed base64url, signature mismatch, and expired tokens.

## JSON-RPC Flow

```text
feature/origin/Accept/session/rate admission
  -> bounded 16 KiB JSON body
  -> strict JSON-RPC parse
  -> initialize OR protocol-header validation
  -> notification / ping / tools-list / tools-call
  -> exact scope and runtime availability
  -> exact argument schema
  -> bundle-version-bound execution
  -> JSON-RPC result or fixed error
```

The server is stateless and does not issue `Mcp-Session-Id`. `GET` streaming is not supported, so `GET` returns `405` with `Allow: POST` after origin validation.

## Stable Tool Result

Each successful or tool-level failed call returns:

```ts
{
  content: [{ type: 'text', text: string }];
  structuredContent: {
    schemaVersion: 'answerlattice.mcp.tool.v1';
    ok: boolean;
    tool: string;
    bundleVersion: number | null;
    generatedAt: string | null;
    data: unknown;
    error: { code: string; message: string } | null;
  };
  isError: boolean;
}
```

The structured envelope is UTF-8 byte bounded. Oversized output is replaced by a valid `RESULT_TOO_LARGE` error rather than truncated invalid JSON.

## Read Tools

Read tools load only validated paths recorded in the ready private bundle manifest. The active manifest version must equal the token's admitted bundle version. `CONTEXT_CHANGED` instructs the client to create a new session.

`search_canonical_context` is deliberately bounded substring search over the approved canonical index. It is not raw-source RAG, vector search, or a completeness guarantee.

## Missing-Context Tool

`report_missing_context`:

- is hidden when signal mutation is disabled;
- requires `signals:write` and a separate 30/hour workspace limit;
- validates query, route key, and entity ID;
- creates a deterministic hourly request ID;
- emits the existing `chat_negative` governed signal with redacted bounded metadata;
- never writes a separate summary map or mutates canonical truth.

`mcpTools.ts` does not eagerly import the `server-only` signal persistence graph. It dynamically imports `signalEmitterServer.ts` only inside the admitted missing-context execution branch. Tool discovery, schema parsing, and session-scope contract tests therefore do not initialize Firebase Admin or require Next's server-only module resolver, while the production mutation still crosses the explicit server-only boundary before persistence.

## Protocol References

- [MCP Lifecycle 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle.md)
- [MCP Transports 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports.md)
- [MCP Authorization 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization.md)
- [MCP Tools 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/server/tools.md)

## Deliberate Limitations

- No general OAuth 2.1 discovery or dynamic client registration.
- No resources, prompts, subscriptions, sampling, elicitation, or server-sent event stream.
- No per-end-user or per-source ACL token claims.
- No action execution, arbitrary tool registration, raw source export, or autonomous publication.

The current API-key-to-short-session exchange is suitable only for controlled pre-registered clients. Standards-complete remote OAuth is a future option, not a rollout prerequisite for the first validated server/desktop workflow.
