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

Answerlattice Compiled Context Bundle Entity ID Boundary: manual/server and Functions repair builds normalize resolved relation endpoints and answer/article/FAQ/surface/release entity ID arrays before public/private Storage objects are written. Malformed or unresolved relation endpoints are dropped from relation output; malformed or unresolved array entries are skipped without changing valid bundle read/write counts.

Build and failure diagnostics are bounded. Manifests keep fixed status fields such as `lastBuildError: "build_failed"`, build locks store fixed failure codes plus source error name/code/status metadata, manual rebuild request metadata is limited to fixed reason/requester codes, and scheduler-facing repair results return fixed codes only. Raw exception text, raw owner ids/emails, and arbitrary request reason text are not stored in `platformSummary`.

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
- Public bundle proxy cache misses are rate-limited by `ANSWERLATTICE_PUBLIC_BUNDLE` before Storage existence/download calls; when rate limiting is enabled but the provider is bypassing, the proxy fails closed with a no-store `503`. Cache-miss objects are checked against a 512 KB proxy download ceiling through Storage metadata before download, with a second byte check after download. Rate-limit, oversized-object, and proxy failures log fixed runtime codes with bounded path metadata only.
- Bundle rebuild reads are bounded and source-change driven.
- Runtime reads never trigger rebuilds.
- MCP session auth avoids API-key Firestore lookup per tool call, and manifest-read failures log `answerlattice_mcp_session_bundle_manifest_load_failed` before returning the existing missing-bundle session metadata.
- MCP tool calls are rate-limited per tenant/store session before a 16KB bounded JSON-RPC body parse and bundle reads. The final tool dispatcher requires `context:read` for bundle tools and `signals:write` for the aggregate signal tool; unauthorized calls perform no Storage read or Firestore write. MCP session and JSON-RPC failures log fixed runtime codes with bounded metadata only.
- MCP read tools use cached manifests/objects. Cold private bundle reads check Storage metadata before download, repeat the byte check after download, and treat oversized objects as unavailable. `report_missing_context` can write its aggregate bucket without loading a bundle first.
- Best-effort Storage `manifest.json` copy failures add bounded diagnostics only. They do not add Firestore operations, do not change object paths, and do not change the Firestore manifest write that selects the active bundle version.
- Manifest version fields must resolve to canonical nonnegative safe integers before a build lock, Storage upload, or retention delete. Invalid/exhausted existing versions fail closed; retention deletes zero objects when it cannot construct a valid active/last-ready keep set.
- `sourceVersions_*` ownership and counters are runtime-validated before source equality or bundle work. Wrong product/workspace or ambiguous/unsafe counters cannot suppress a rebuild or be serialized into bundle manifests.

## Cache-Control

Public versioned bundles use long immutable cache headers because version changes create new paths.

Config/session/proxy responses use short private or no-store headers depending on auth sensitivity.

## Rules Impact

Firestore rules allow tenant members to read only customer-safe Answerlattice `platformSummary` summaries with matching `tId/sId`. `sourceVersions_*` and `bundleManifest_*` stay server-readable only, with tenant writes limited to stale/source-version markers needed after client-side knowledge edits. Storage rules allow public bundle reads only from opaque public bundle paths and keep private bundles server-only.
