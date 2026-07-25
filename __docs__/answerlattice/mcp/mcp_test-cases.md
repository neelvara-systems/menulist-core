# Answerlattice MCP - Test Cases

> **Last Updated:** 2026-07-25

## Local Source and Contract Tests

| Case | Expected result | Evidence |
| --- | --- | --- |
| Valid signed session | Exact audience/workspace/scopes/version returned | `test-answerlattice-mcp-session.ts` |
| Unknown/duplicate scopes or claims | Rejected | Session contract test |
| Weak configured secret | Issuer/verifier reject | Session contract test |
| Oversized/malformed/expired token | Rejected before payload trust | Session contract test |
| Nonpositive bundle version | Rejected | Session contract test |
| Supported initialize version | Negotiated response | MCP contract test |
| Unsupported initialize version | Latest supported version returned | MCP contract test |
| Missing/invalid protocol header after init | Rejected | Protocol helper/source verifier |
| Accept missing JSON or event stream | Rejected | MCP contract test |
| Fractional JSON-RPC ID | Rejected | MCP contract test |
| Unknown keys/invalid tool args | Rejected | MCP contract test |
| Read/write annotations | Truthful | MCP contract test |
| Legacy-permissive key scope helper | Not used by session route | Runtime truth verifier |
| Disabled signal lifecycle | Write tool not discovered/callable | Runtime truth verifier; hosted test pending |
| Bundle changed after session | Structured `CONTEXT_CHANGED` | Runtime truth verifier; hosted fixture pending |
| Oversized tool result | Valid `RESULT_TOO_LARGE`, no truncated JSON | Runtime truth verifier |
| Missing-context report | Existing governed signal emitter only | Runtime truth verifier |
| Session/tool contract import | Passes in plain Node/ts-node without eagerly resolving the server-only signal persistence graph | `npm run verify:answerlattice-mcp`; runtime truth verifier |

## Required Hosted Compatibility Tests

Run against the QA hosted app only after explicit deployment approval:

1. Issue a dedicated `mcp:read` key for a test workspace.
2. Exchange it from at least one supported desktop/server MCP client.
3. Initialize using each claimed protocol version.
4. Confirm `tools/list` and all read tools against known approved fixtures.
5. Change/rebuild the bundle and prove the old session returns `CONTEXT_CHANGED`.
6. Rotate/revoke the source key and prove new exchange fails immediately.
7. Wait five minutes and prove the prior token expires.
8. Verify cross-origin/browser exchange denial.
9. Verify rate-limit provider failure is fail-closed.
10. If signal reporting is enabled, prove exact retry behavior, redaction, review-queue visibility, and no canonical mutation.

## Required Permission and Privacy Tests

- wrong product, purpose, credential source, scope, tenant, store, inactive/deleted/blocked workspace;
- token signed by another deployment/secret;
- private bundle containing prohibited object families;
- unauthorized source URL or customer PII exposure;
- prompt-injection text stored in approved content remains data, not executable instructions;
- provider/client logs do not retain raw keys/tokens or prohibited private content.

## Required Customer Evidence

Use 20-50 real technical support questions for one named workflow. Review:

- useful task completion;
- canonical/context correctness;
- missing or misleading evidence;
- stale/version mismatch handling;
- abstention/tool-error appropriateness;
- human correction rate;
- calls and cost per verified useful task.

Do not use tool-call volume, documents indexed, or generic model benchmark scores as success evidence.

## Current Verification Commands

```bash
npm run verify:answerlattice-mcp
npm run typecheck:answerlattice
node scripts/verification/verify-answerlattice-runtime-truth.js
```

Hosted client, secret manager, rate-limit provider, deployed bundle, and customer-value evidence remain external to local source completion.
