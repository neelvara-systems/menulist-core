# Compiled Context Distribution Firebase Notes

## Firestore

Control-plane docs live in `platformSummary`:

- `sourceVersions_{tId}_{sId}`
- `bundleManifest_{tId}_{sId}`
- `bundleBuildLock_{tId}_{sId}`
- `mcpSignal_{tId}_{sId}_{yyyyMMdd}`

No new high-volume read collections are introduced. Source-version writes happen only on approved knowledge/config changes. Tenant-side writes to `sourceVersions_*` and `bundleManifest_*` are narrowed by Firestore rules to source counters and stale-marker fields; active bundle pointers, paths, hashes, stats, limits, and build diagnostics remain server-owned.

The centralized Answerlattice scheduler compares `sourceVersions_*` with `bundleManifest_*` through the `runAnswerlatticeNightly()` governance batch and rebuilds only stale due workspaces. Manual rebuilds use the same manifest and Storage path contract.

Knowledge Intake counters should not increase bundle churn. Intake-only counters can be stored in summary/source-version docs for owner UI and scheduler repair, but they are excluded from compiled context equality. Bundle rebuilds happen when approved destination content changes existing bundle inputs: KB/docs navigation, canonical answers, surfaces, releases, entities, entity relations, widget config, branding, MCP policy, or predictive triggers.

## Storage

Allowed public bundle path:

`answerlattice-context/public/{publicBundleId}/v{bundleVersion}/{filePath=**}`

Private bundle path:

`answerlattice-context/private/{tId}/{sId}/v{bundleVersion}/{filePath=**}`

Private reads and all client writes are denied by Storage rules. Server/admin code writes and reads private bundles.

## Cost Rules

- Widget and MCP runtime reads must not query raw source collections.
- Storage bundles must be versioned and cacheable.
- Storage downloads are still billable, so server, browser, and CDN caches are required.
- Public bundle proxy cache misses are rate-limited by `ANSWERLATTICE_PUBLIC_BUNDLE` before Storage existence/download calls; when rate limiting is enabled but the provider is bypassing, the proxy fails closed with a no-store `503`.
- Bundle rebuild reads are bounded and source-change driven.
- Runtime reads never trigger rebuilds.
- MCP session auth avoids API-key Firestore lookup per tool call.
- MCP tool calls are rate-limited per tenant/store session before bundle reads.
- MCP read tools use cached manifests/objects; `report_missing_context` can write its aggregate bucket without loading a bundle first.

## Cache-Control

Public versioned bundles use long immutable cache headers because version changes create new paths.

Config/session/proxy responses use short private or no-store headers depending on auth sensitivity.

## Rules Impact

Firestore rules allow tenant members to read only customer-safe Answerlattice `platformSummary` summaries with matching `tId/sId`. `sourceVersions_*` and `bundleManifest_*` stay server-readable only, with tenant writes limited to stale/source-version markers needed after client-side knowledge edits. Storage rules allow public bundle reads only from opaque public bundle paths and keep private bundles server-only.
