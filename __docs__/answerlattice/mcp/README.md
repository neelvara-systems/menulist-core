# Answerlattice MCP

> **Status:** Implemented, locally audited, and disabled by default
> **Version:** 1.0.0
> **Last Updated:** 2026-07-20
> **Feature Flag:** `ENABLE_ANSWERLATTICE_MCP` (`false`)
> **Credential Scope:** `mcp:read`; optional `signals:write`

## Purpose

Answerlattice MCP is a controlled server-to-agent distribution surface for approved workspace context. It lets an authorized MCP client retrieve bounded product, route, entity, canonical-answer, and release context from immutable private compiled bundles.

An optional tool can report missing context as a governed signal. That report becomes review evidence; it never edits or publishes approved truth.

## Product Boundary

MCP is not the Answerlattice product, an autonomous support agent, or a generic enterprise-search endpoint. The strategic product remains the governed answer lifecycle. MCP is one consumer of that approved truth.

The verified contract provides:

- explicit `mcp:read` admission separate from public answer access;
- five-minute signed workspace sessions;
- MCP Streamable HTTP JSON-RPC over `POST`;
- fixed tool discovery with strict schemas and stable structured outputs;
- private compiled-bundle reads only;
- optional, rate-limited missing-context signals;
- no account actions, arbitrary code, browser automation, ticket access, raw source export, or truth mutation.

## Runtime Flow

```text
owner issues al_* key with mcp:read
  -> trusted server/desktop exchanges key for five-minute MCP token
  -> active AL workspace and ready bundle version are bound into token
  -> client initializes a supported MCP protocol version
  -> tools/list returns only authorized and runtime-available tools
  -> tools/call validates exact arguments and session scope
  -> read tool requires the same active bundle version
  -> bounded content + structuredContent response
  -> optional missing-context report enters governed signal lifecycle
```

## Tool Set

| Tool | Scope | Behavior |
| --- | --- | --- |
| `get_product_context` | `context:read` | Returns approved compiled product summary. |
| `get_route_context` | `context:read` | Returns approved route/product-surface context. |
| `get_entity_context` | `context:read` | Returns exact approved entity context. |
| `get_canonical_context` | `context:read` | Returns an exact approved canonical answer. |
| `search_canonical_context` | `context:read` | Bounded substring search over the approved canonical index. |
| `get_release_context` | `context:read` | Returns approved release/changelog context. |
| `report_missing_context` | `signals:write` | Records review evidence when signal mutation is enabled. |

## Trust Boundary

- The `al_*` key is server/desktop-only and is never a browser credential.
- `mcp:read` is separate from `public:read` because MCP returns private compiled workspace context.
- Session tokens are audience-bound, scope-bound, workspace-bound, bundle-version-bound, signed with a minimum 32-character secret, length-capped, and valid for at most five minutes.
- Revoking or rotating the source key blocks new sessions immediately. An already issued stateless token remains usable only until its bounded expiry, unless the active context bundle changes first.
- The verified MCP contract is workspace-wide. It does not carry an end-user identity or enforce narrower per-source audience segmentation. Do not enable it for a workspace whose connected private sources require different consumer permissions.

## Rollout Gate

Keep MCP off until a named client workflow has:

1. a dedicated credential owner and `mcp:read` key;
2. approved private bundle readiness;
3. a reviewed representative question set;
4. configured fail-closed rate limiting and signing secret;
5. a key rotation/revocation drill;
6. source-access and model-provider handling approval;
7. real-client discovery/call compatibility proof;
8. monitored answer usefulness, abstention, corrections, tool errors, and cost.

## Documents

| Document | Purpose |
| --- | --- |
| [mcp_spec.md](./mcp_spec.md) | Product, protocol, and acceptance contract |
| [mcp_impl.md](./mcp_impl.md) | Runtime architecture and connected files |
| [mcp_firebase.md](./mcp_firebase.md) | Data, Storage, cost, retention, and failure behavior |
| [mcp_helpdoc.md](./mcp_helpdoc.md) | Operator setup and troubleshooting |
| [mcp_marketing.md](./mcp_marketing.md) | Sales and positioning boundaries |
| [mcp_website.md](./mcp_website.md) | Public-site claim rules |
| [mcp_mobile-support.md](./mcp_mobile-support.md) | Mobile and responsive assessment |
| [mcp_test-cases.md](./mcp_test-cases.md) | Local, hosted, compatibility, and customer evidence matrix |

## Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-07-20 | 1.0.0 | Completed feature-flow audit: exact `mcp:read` admission, strict current protocol contracts, bounded signed sessions, bundle-version consistency, truthful tool discovery, governed signal reporting, complete documentation, and focused verification. |
