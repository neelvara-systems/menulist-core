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

`platformSummary/bundleManifest_{tId}_{sId}` stores the current active bundle pointer, status, source snapshot, file refs, stats, limits, and public opaque bundle ID.

## Storage Paths

Public:

`canonica-context/public/{publicBundleId}/v{bundleVersion}/...`

Private:

`canonica-context/private/{tId}/{sId}/v{bundleVersion}/...`

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

Activation summary includes bundle readiness. Owners can manually rebuild compiled context from Activation. The button calls `/api/canonica/bundles/rebuild`, which runs through authenticated Canonica scope and rate limiting.

## Backend Repair Flow

Source changes mark the manifest stale by updating `sourceVersions_*` and `bundleManifest_*`. The Canonica nightly scheduler runs `repairCompiledContextBundle` per active tenant/store and exits early when source versions already match the ready manifest.

The repair builder keeps the same immutable Storage paths as the manual rebuild API, preserves the last ready bundle on failure, and records status/bytes/routes in the scheduler run log.

## Widget Flow

`GET /api/widget/config` keeps key/origin validation server-side and returns:

- standard widget config
- capability flags
- active bundle version
- public bundle proxy URLs/paths when ready

The widget can use bundle pointers for bootstrap and route context. Search remains server-mediated.

## Public API Flow

`GET /api/canonica/public/v1/entities` loads `mcp/entity-index.json` or public context equivalents from cache/Storage when enabled and falls back to bounded Firestore reads.

Answer retrieval stays canonical-first through the server because plan/role/version/context matching still needs controlled scoring and fallback behavior.

## MCP Flow

`POST /api/canonica/mcp/session` validates a Canonica `cn_*` key once and returns a short-lived signed session token.

`POST /api/canonica/mcp` implements JSON-RPC methods:

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

Read tools use private Storage bundles. `report_missing_context` writes only an aggregated bucket, not one raw signal event per agent step.
