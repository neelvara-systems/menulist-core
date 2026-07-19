# Use Answerlattice with an MCP Client

> **Availability:** Controlled rollout only
> **Last Updated:** 2026-07-20

## Before You Start

You need:

- an active Answerlattice workspace;
- a ready compiled context bundle;
- MCP enabled for the workspace deployment;
- an `al_*` credential with `mcp:read`;
- `signals:write` only if the client should report missing context;
- a trusted server or desktop MCP client.

Do not place the credential in browser code, mobile code, public repositories, screenshots, logs, or client-visible configuration.

## Connect

1. Create or rotate a Public API credential from Answerlattice's Public API management screen.
2. Select `mcp:read`. Add `signals:write` only when needed.
3. Store the raw `al_*` key immediately; Answerlattice shows it once.
4. Exchange it server-side at `POST /api/answerlattice/mcp/session`.
5. Use the returned Bearer token with `POST /api/answerlattice/mcp`.
6. Send an MCP `initialize` request, then the `notifications/initialized` notification.
7. Call `tools/list` and use only the returned tools.

The MCP token expires after five minutes. Create a new session when it expires or when a tool returns `CONTEXT_CHANGED`.

## Expected Client Headers

- `Authorization: Bearer <short MCP token>`
- `Accept: application/json, text/event-stream`
- `Content-Type: application/json`
- `MCP-Protocol-Version: <negotiated version>` after initialization

## Common Problems

| Problem | Meaning | Action |
| --- | --- | --- |
| `MCP_DISABLED` | MCP or compiled context is off. | Keep rollout off or enable the approved deployment flags. |
| `MCP_NOT_CONFIGURED` | Signing secret is missing/weak. | Configure a secret of at least 32 characters. |
| `INVALID_API_KEY` | Key is missing, revoked, wrong product/purpose, wrong scope, or inactive workspace. | Rotate a dedicated key with `mcp:read` and verify workspace status. |
| `MCP_CONTEXT_NOT_READY` | No ready positive bundle version exists. | Rebuild compiled context and verify readiness. |
| `Invalid MCP session` | Token is expired, malformed, wrong audience, or signed with another secret. | Exchange the source key for a new token. |
| `CONTEXT_CHANGED` | Approved context changed after session creation. | Start a new MCP session before continuing. |
| `RESULT_TOO_LARGE` | Requested context exceeds the response boundary. | Use a narrower route/entity/canonical tool. |
| `Tool not found` | Tool is unknown or currently disabled. | Refresh `tools/list`; do not assume write-tool availability. |
| `RATE_LIMITED` | Client exceeded a bounded limit. | Respect `Retry-After` and reduce calls. |

## Rotation and Revocation

Rotation/revocation blocks new MCP sessions immediately. Because MCP sessions are stateless, an already issued token can remain valid for at most five minutes. Changing the active context bundle also stops old read sessions from silently reading new context.

## Safe Use

- Treat MCP output as approved workspace context, not permission to act.
- Keep human review for pricing, policy, security, legal, and material answer changes.
- Do not enable MCP where one credential must see only a subset of the workspace's private compiled sources.
- Measure useful resolved work and correction rate, not tool-call volume.
