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

Activation summary includes bundle readiness. Owners can manually rebuild compiled context from Activation. The button calls `/api/answerlattice/bundles/rebuild`, which runs through authenticated Answerlattice management scope and rate limiting. Owner responses are `no-store` and do not expose raw build exceptions.

## Backend Repair Flow

Source changes mark the manifest stale by updating `sourceVersions_*` and `bundleManifest_*`. The centralized Answerlattice scheduler runs hourly, filters workspaces by local timezone/support-day end time, and calls `runAnswerlatticeNightly()` only for due workspaces. That batch runs `repairCompiledContextBundle` per due tenant/store and exits early when source versions already match the ready manifest.

The repair builder keeps the same immutable Storage paths as the manual rebuild API, preserves the last ready bundle on failure, and records status/bytes/routes in the scheduler run log.

## Widget Flow

`GET /api/widget/config` keeps key/origin validation server-side and returns:

- standard widget config
- capability flags
- active bundle version
- public bundle proxy URLs/paths when ready

The widget config path uses the server-side manifest cache before falling back to Firestore. Public bundle proxy responses also keep a bounded in-process cache before Firebase Storage, while immutable object paths and browser/CDN cache headers handle repeated browser loads. If Storage Admin credentials or access are unavailable, the proxy returns a no-store `503 Bundle unavailable` response instead of caching or exposing raw infrastructure errors. Search remains server-mediated.

## Public API Flow

`GET /api/answerlattice/public/v1/entities` loads `mcp/entity-index.json` or public context equivalents from cache/Storage when enabled and falls back to bounded Firestore reads.

Answer retrieval stays canonical-first through the server because plan/role/version/context matching still needs controlled scoring and fallback behavior.

## MCP Flow

`POST /api/answerlattice/mcp/session` validates an Answerlattice `al_*` key once and returns a short-lived signed session token.

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

Read tools use private Storage bundles through a server manifest cache and object cache. `report_missing_context` does not require bundle hydration and writes only an aggregated bucket, not one raw signal event per agent step.

MCP code is split for maintenance: `src/app/api/answerlattice/mcp/route.ts` owns JSON-RPC/session/rate-limit handling, `src/lib/answerlattice/mcpTools.ts` owns tool definitions and bundle-backed handlers, and `src/lib/answerlattice/mcpSession.ts` owns signed short-lived sessions.
