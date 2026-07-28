# Compiled Context Distribution Test Cases

| Case | Expected result |
| --- | --- |
| Existing ready manifest plus onboarding initialization | Existing counters and active pointers remain unchanged; only missing documents are created. |
| Wrong product, tenant, or workspace manifest | Reader and builder fail closed before Storage access. |
| Ready manifest with unequal bundle/active/last-ready versions | Rejected as not ready. |
| Manifest ref points outside derived version path | Rejected before Storage access. |
| Public object exceeds its file-specific limit | Build fails; prior ready version remains available. |
| Source query returns maximum plus one | Build fails instead of publishing truncated context. |
| Sources change during build | New version is marked superseded and does not replace the active pointer. |
| Build fails after uploads | Failed version prefixes are deleted best effort; last-ready pointer remains. |
| Manual rebuild limiter provider unavailable | Returns private/no-store `503` before permission, Firestore, or Storage work. |
| Unauthorized workspace member exhausts their manual rebuild key | The actor/workspace key does not consume another authorized owner's four-per-minute budget. |
| Public manifest download | Contains no tenant/workspace IDs, source versions, private refs, stats, or limits. |
| Malformed owned-store workspace fields | App and Functions builders produce the same exact safe product projection; raw nested/private fields and unsafe URL/email values never enter public or private bundle objects. |
| Widget config with bootstrap flag off | Returns legacy governed config without bundle pointers. |
| Public API invalid/missing private bundle | Falls back to bounded Firestore path. |
| MCP invalid/missing bundle | Tool call fails closed with bounded output. |
| Reserved `branding` or `mcpPolicy` counter differs | Source-version equality reports a change so an in-flight build cannot publish against a newer invalidation snapshot. |
| Bundle build with reserved counters present | Numeric counters may appear in private `mcp/product-summary.json` metadata; no advanced-branding profile or MCP authorization-policy payload is read or serialized. |
| Save rollout-gated advanced-branding profile | The private profile write succeeds under its own contract without staling compiled context or adding a bundle rebuild. |

Focused source proof: `npm run test:answerlattice-context-bundle-version-boundary`, runtime truth verifier, root Answerlattice typecheck, focused ESLint, dedicated Functions build, dependency freeze, and `git diff --check`.
