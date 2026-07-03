# Compiled Context Distribution Implementation

## Control Plane

`platformSummary/sourceVersions_{tId}_{sId}` stores monotonic source counters:

- `workspaceProfile`
- `widgetConfig`
- `kb`
- `docsNav`
- `entities`
- `entityRelations`
- `canonical`
- `surfaces`
- `releases`
- `branding`
- `mcpPolicy`
- `predictiveTriggers`

`platformSummary/bundleManifest_{tId}_{sId}` stores the current active bundle pointer, status, source snapshot, file refs, stats, limits, and public opaque bundle ID. It must not store raw exception text; owner-visible failures use a generic status and detailed diagnostics stay in platform logs / server-only build locks.

Knowledge Intake may store intake-only freshness counters on adjacent summary/source-version documents, such as `knowledgeIntakeSources`, `knowledgeIntakeOutputs`, and `knowledgeIntakeReadiness`. These counters are not bundle inputs by themselves. They must stay outside compiled context source equality unless approved runtime destination content also changed. Intake publishers still bump the real runtime source keys above (`kb`, `docsNav`, `canonical`, `surfaces`, `releases`, `entities`, `entityRelations`) when they publish approved output.

## Storage Paths

Public:

`answerlattice-context/public/{publicBundleId}/v{bundleVersion}/...`

Private:

`answerlattice-context/private/{tId}/{sId}/v{bundleVersion}/...`

Storage objects are immutable. The manifest chooses the active version. Runtime code must not overwrite `latest.json`.

## Bundle Files

Public:

- `manifest.json`
- `widget-bootstrap.json`
- `context-index.json`
- `docs-nav.json`
- `canonical-lite.json`
- `routes/{routeKey}.json`

Private MCP:

- `manifest.json`
- `mcp/product-summary.json`
- `mcp/entity-index.json`
- `mcp/surface-index.json`
- `mcp/canonical-index.json`
- `mcp/release-context.json`
- `mcp/routes/{routeKey}.json`
- `mcp/entities/{entityId}.json`

## Builder Contract

The builder:

1. Validates `tId/sId`.
2. Acquires `bundleBuildLock_{tId}_{sId}`.
3. Reads current source versions.
4. Exits early if manifest source versions are already current.
5. Reads bounded approved/published source collections.
6. Removes private/unapproved fields.
7. Writes immutable versioned Storage files.
8. Writes the Firestore manifest and a Storage manifest copy.
9. Rechecks source versions.
10. Marks superseded if source versions changed during the build.
11. Releases the lock.

## Owner Flow

Activation summary includes bundle readiness. Owners can manually rebuild compiled context from Activation. The button calls `/api/answerlattice/bundles/rebuild`, which resolves Answerlattice session scope, applies the rebuild rate limit before permission/build work, and then requires `REBUILD_CONTEXT` before reading the bounded optional body or building bundles. Owner responses do not expose raw build exceptions, and route failures log the fixed `answerlattice_context_bundle_manual_rebuild_failed` code with bounded tenant/store metadata.

## Backend Repair Flow

Source changes mark the manifest stale by updating `sourceVersions_*` and `bundleManifest_*`. The centralized Answerlattice scheduler runs hourly, filters workspaces by local timezone/support-day end time, and calls `runAnswerlatticeNightly()` only for due workspaces. That batch runs `repairCompiledContextBundle` per due tenant/store and exits early when source versions already match the ready manifest.

The repair builder keeps the same immutable Storage paths as the manual rebuild API, preserves the last ready bundle on failure, and records status/bytes/routes in the scheduler run log.

Manual and Functions-side repair diagnostics use fixed context-bundle failure codes. Changelog-load fallback logs use source error name/code/status and scope booleans only. Best-effort Storage manifest copy failures now log bounded manifest-upload diagnostics while preserving the Firestore manifest write and active-version behavior. Failed repairs preserve the existing manifest `build_failed` status, write the fixed repair code plus source error metadata to the build lock, and return the fixed repair code to the scheduler so raw Storage/Admin exception text cannot enter run logs.

## Widget Flow

`GET /api/widget/config` keeps key/origin validation server-side and returns:

- standard widget config
- capability flags
- active bundle version
- public bundle proxy URLs/paths when ready

The widget config path uses the server-side manifest cache before falling back to Firestore. If public bundle-manifest loading fails, the route logs `answerlattice_widget_config_bundle_manifest_load_failed` with bounded tenant/store metadata and returns the standard config with `contextBundles: false` and `bundles: null`; if predictive-summary loading fails, it logs `answerlattice_widget_config_predictive_summary_load_failed` and returns `predictiveSupport: false`. Public bundle proxy responses also keep a bounded in-process cache before Firebase Storage, while immutable object paths and browser/CDN cache headers handle repeated browser loads. Cache misses on `/api/answerlattice/bundles/public/[...path]` are rate-limited by `ANSWERLATTICE_PUBLIC_BUNDLE` before Storage existence/download calls so random path probing cannot create unbounded Storage reads. Before downloading a cache-miss object, the proxy checks Storage metadata size against the 512 KB proxy download ceiling and repeats the byte check after download if metadata was unavailable or stale. Oversized bundle objects return the existing no-store `503 Bundle unavailable` response and log `answerlattice_public_bundle_proxy_oversized` with bounded bundle-path metadata. The proxy hashes the client IP in the provider key, so raw IP addresses are not stored in rate-limit key names. If the rate-limit provider is bypassing while rate limiting is enabled, the proxy fails closed with a no-store `503` instead of touching Storage. If Storage Admin credentials or access are unavailable, the proxy returns a no-store `503 Bundle unavailable` response instead of caching or exposing raw infrastructure errors. Rate-limit, oversized-object, proxy, and widget config capability failures log fixed runtime codes with bounded metadata only. Search remains server-mediated.

## Public API Flow

`GET /api/answerlattice/public/v1/entities` loads `mcp/entity-index.json` or public context equivalents from cache/Storage when enabled and falls back to bounded Firestore reads. Missing, disabled, not-ready, or oversized bundles are normal fallback states. Failed manifest or bundle-object reads log `answerlattice_public_entities_bundle_manifest_load_failed` or `answerlattice_public_entities_bundle_object_load_failed` with bounded tenant/store metadata before the Firestore fallback. The shared server bundle-object loader checks Storage metadata before download, repeats the byte check after download, and logs `answerlattice_context_bundle_object_oversized` with bounded bundle-path metadata when the private-object ceiling is exceeded.

Answer retrieval stays canonical-first through the server because plan/role/version/context matching still needs controlled scoring and fallback behavior.

## MCP Flow

`POST /api/answerlattice/mcp/session` validates an Answerlattice `al_*` key once and returns a short-lived signed session token. It reads the compiled context manifest for bundle version/status metadata. A thrown manifest read logs `answerlattice_mcp_session_bundle_manifest_load_failed` with bounded tenant/store metadata and keeps the existing `bundleStatus: 'missing'` response behavior.

`POST /api/answerlattice/mcp` implements JSON-RPC methods:

- `initialize`
- `tools/list`
- `tools/call`

Day-one tools:

- `get_product_context`
- `get_route_context`
- `get_entity_context`
- `get_canonical_context`
- `search_canonical_context`
- `get_release_context`
- `report_missing_context`

Read tools use private Storage bundles through a server manifest cache, metadata-checked object downloads, and an object cache. The JSON-RPC route validates feature flags, origin, signed MCP session, and per-workspace rate limits before parsing a 16KB bounded request body. Session creation, JSON-RPC failures, and oversized private bundle objects log fixed runtime codes with bounded metadata only. `report_missing_context` does not require bundle hydration and writes only an aggregated bucket, not one raw signal event per agent step.

MCP code is split for maintenance: `src/app/api/answerlattice/mcp/route.ts` owns JSON-RPC/session/rate-limit handling, `src/lib/answerlattice/mcpTools.ts` owns tool definitions and bundle-backed handlers, and `src/lib/answerlattice/mcpSession.ts` owns signed short-lived sessions.
