# Answerlattice MCP - Product Specification

> **Status:** Implemented, locally audited, disabled by default
> **Last Updated:** 2026-07-20

## Customer Job

An approved external agent or internal developer tool needs current product-support context without copying uncontrolled documents, searching raw tickets, or treating generated text as company truth.

## Primary User

- Technical SaaS founder using an MCP-compatible coding or support tool.
- Support/product operator connecting a trusted internal agent.
- Developer-platform team that needs approved version-, plan-, role-, route-, entity-, and release-aware context.

MCP is not intended for an end-user browser, unrestricted third-party agent, or client needing per-user source permissions.

## Functional Requirements

### Session Admission

1. MCP and compiled-context flags must be enabled.
2. Session exchange accepts an `al_*` Public API credential only from a server or desktop client.
3. Credential source, AL product, public-API purpose, exact explicit scopes, active tenant, and active workspace must match.
4. `mcp:read` is mandatory; `public:read` alone is insufficient.
5. A ready positive compiled bundle version is mandatory.
6. The issued token binds tenant, workspace, scopes, audience, bundle version, issue time, and expiry.

### MCP Transport

1. Support protocol versions `2025-11-25`, `2025-06-18`, and `2025-03-26`.
2. Require Streamable HTTP `Accept` values for JSON and event streams.
3. Use `POST`; return `405` for `GET` because server-sent event streaming is not implemented.
4. Validate `Origin` and reject cross-origin transport requests.
5. Validate strict JSON-RPC request, method, params, and tool arguments.
6. Accept notifications with `202` and no response body.

### Tool Behavior

1. Discover only tools allowed by session scope and current feature availability.
2. Read only immutable private bundle references from the admitted bundle version.
3. Return a stable envelope in both `structuredContent` and JSON text content.
4. Fail closed when context is missing, changed, invalid, or oversized.
5. Treat `report_missing_context` as a governed signal write, not a truth update.

## Security and Privacy Requirements

- No browser session exchange, CORS credential use, request-supplied tenant/workspace IDs, raw API key persistence, or token logging.
- Minimum 32-character signing secret and maximum five-minute token lifetime.
- Exact audience, scope allowlist, positive safe integer IDs/version, bounded token segments, and constant-time signature comparison.
- Fail-closed rate limiting before bundle reads and a lower independent signal-write limit.
- No drafts, tickets, chats, raw signals, audit logs, billing, customer account data, secrets, or arbitrary source files in MCP tool output.
- No product/account actions or arbitrary JavaScript execution.
- Workspace-level private context is the verified permission model; narrower source ACLs require a future separately validated contract.

## Quality Requirements

- Canonical context must come from approved compiled data.
- Tool output must expose bundle version and generation time where available.
- A session admitted against version N must not silently read version N+1.
- Missing records return explicit `found: false` data; unavailable or changed context returns a structured tool error.
- Citations and source facts remain evidence, not standalone proof of correctness.

## Acceptance Metrics

| Metric | Initial target |
| --- | --- |
| Wrong product/purpose/scope/workspace admitted | 0 |
| Weak-secret or oversized/malformed token accepted | 0 |
| Stale session silently reading changed bundle | 0 |
| Unauthorized or disabled tool discovered/called | 0 |
| Tool result exceeding configured boundary returned as partial JSON | 0 |
| Draft/private operational data exposed | 0 |
| Critical representative questions failing before rollout | 0 |
| Verified useful agent tasks | Measured per named workflow, not tool-call volume |

## Rollout Decision

MCP remains disabled by default. Enable only for selected design partners after hosted-client compatibility, source-access review, provider data handling, representative Answer Tests, secret/rate-limit configuration, credential recovery, and useful-task evidence are verified.

## Rejection Rules

Reject expansion into:

- generic RAG or enterprise search;
- raw Slack, ticket, email, or private-source export;
- autonomous product/account actions;
- arbitrary tools supplied by a model;
- browser credential distribution;
- automatic canonical-answer publication;
- broad MCP marketing before real-client proof.
