# Compiled Context Distribution Firebase Notes

## Firestore

Control-plane docs live in `platformSummary`:

- `sourceVersions_{tId}_{sId}`
- `bundleManifest_{tId}_{sId}`
- `bundleBuildLock_{tId}_{sId}`
- `mcpSignal_{tId}_{sId}_{yyyyMMdd}`

No new high-volume read collections are introduced. Source-version writes happen only on approved knowledge/config changes.

The nightly Canonica scheduler compares `sourceVersions_*` with `bundleManifest_*` and rebuilds only stale workspaces. Manual rebuilds use the same manifest and Storage path contract.

## Storage

Allowed public bundle path:

`canonica-context/public/{publicBundleId}/v{bundleVersion}/{filePath=**}`

Private bundle path:

`canonica-context/private/{tId}/{sId}/v{bundleVersion}/{filePath=**}`

Private reads and all client writes are denied by Storage rules. Server/admin code writes and reads private bundles.

## Cost Rules

- Widget and MCP runtime reads must not query raw source collections.
- Storage bundles must be versioned and cacheable.
- Storage downloads are still billable, so server and browser caches are required.
- Bundle rebuild reads are bounded and source-change driven.
- Runtime reads never trigger rebuilds.
- MCP session auth avoids API-key Firestore lookup per tool call.

## Cache-Control

Public versioned bundles use long immutable cache headers because version changes create new paths.

Config/session/proxy responses use short private or no-store headers depending on auth sensitivity.

## Rules Impact

Firestore rules allow tenant members to read and update only Canonica-owned `platformSummary` control docs with matching `tId/sId`. Storage rules allow public bundle reads only from opaque public bundle paths and keep private bundles server-only.
