# Answerlattice Public API v1 - Product Specification

> **Status:** Implemented, locally audited, disabled by default
> **Last Updated:** 2026-07-20

## Customer Job

An approved external service needs the same current, source-backed answer used by Answerlattice surfaces without copying knowledge into a second uncontrolled system. It may also need to report unresolved support friction back into governance without treating the report as truth.

## Primary User

- SaaS founder or technical operator integrating a trusted backend.
- Growing support/product team connecting an approved internal service or agent.
- Developer/API SaaS that needs version-, plan-, role-, state-, or context-aware governed answers.

This is not designed for a browser developer embedding a secret key, a generic chatbot builder, or an unrestricted automation platform.

## Functional Requirements

### Credential Management

1. Public API navigation and page appear only when the main flag is enabled and the actor can manage integrations.
2. One workspace has one active credential.
3. Owners can choose `public:read`, `signals:write`, and, only when MCP is intentionally enabled, `mcp:read`.
4. Raw credentials are returned once and never persisted or displayed again.
5. Rotation invalidates the previous key immediately.
6. Revocation invalidates the active key immediately.
7. Rotation/revocation creates an actor- and workspace-scoped audit record without secret material.

### Answer Retrieval

1. Accept one bounded question plus optional applicability/context fields.
2. Resolve tenant/workspace only from the key.
3. Return canonical approved truth or abstain/clarify.
4. Normalize public citations and exclude private evidence fields.
5. Do not invoke RAG fallback or present a generated guess as approved truth.

### Entity Registry

1. Return stable public entity IDs and bounded metadata.
2. Expose only active/beta records.
3. Support bounded type/status filtering and deterministic order.
4. Support conditional requests with a stable ETag.
5. Report `truncated` when a bounded source cannot prove completeness; do not imply v1 pagination exists.

### Signal Intake

1. Accept only allowlisted support/friction signals.
2. Require explicit `signals:write`.
3. Require deterministic idempotency.
4. Reject changed payloads under a reused key.
5. Treat signals as evidence for review, never approved truth.

## Security and Privacy Requirements

- Exact AL product, public API purpose, explicit scopes, and active workspace.
- Trusted-server use only; browser-origin requests rejected.
- No raw API keys/hashes in Firestore audit, client status, diagnostics, or public response.
- No request-supplied tenant/store authority.
- Fail-closed rate limiting before private retrieval/write work.
- Bounded request and response parsing.
- No private source URLs, ticket PII, internal audit, hidden evidence identifiers, or unapproved graph-derived guidance.
- `public:read` never grants private MCP context; MCP session exchange requires explicit `mcp:read`.
- Fixed error responses and bounded logs.

## Quality Requirements

- Canonical answer applicability must respect version, plan, role, state, and safe context when supplied.
- A missing or insufficient answer must produce fallback/clarification, not fabricated certainty.
- Citation presence is not treated as correctness; evaluation and approval status remain required.
- Rotation and revocation must have no positive-auth cache delay.
- Idempotent signal replay must not create duplicate evidence.

## Acceptance Metrics

| Metric | Initial target |
| --- | --- |
| Critical evaluation questions passing before enablement | 100% |
| Unsupported-claim rate on enabled workflow | 0 critical cases |
| Revoked/rotated prior key accepted after operation | 0 |
| Cross-tenant or wrong-purpose credential acceptance | 0 |
| Exact signal retry duplicate rows | 0 |
| Conflicting signal replay accepted | 0 |
| External consumer responses with private evidence/audit fields | 0 |
| Useful verified resolutions | Measured per named workflow, not inferred from answer volume |

## Rollout Decision

The feature remains off by default. Enable only for a named server-side workflow after canonical coverage, evaluation, rate limiting, secret ownership, rotation/revocation, privacy, observability, and customer value are verified. Public API availability must not become a generic public website promise while the flag remains account-gated.

## Rejection Rules

Reject expansion that requires:

- browser/mobile secret distribution;
- raw ticket, source, audit, or customer-data export;
- direct answer approval/publishing;
- arbitrary database access;
- multiple unmanaged credentials;
- action execution or account mutation;
- connector-count growth without a paying workflow.
