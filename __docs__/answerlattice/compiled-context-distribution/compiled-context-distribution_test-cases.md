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
| Public manifest download | Contains no tenant/workspace IDs, source versions, private refs, stats, or limits. |
| Widget config with bootstrap flag off | Returns legacy governed config without bundle pointers. |
| Public API invalid/missing private bundle | Falls back to bounded Firestore path. |
| MCP invalid/missing bundle | Tool call fails closed with bounded output. |

Focused source proof: `npm run test:answerlattice-context-bundle-version-boundary`, runtime truth verifier, root Answerlattice typecheck, focused ESLint, dedicated Functions build, dependency freeze, and `git diff --check`.
