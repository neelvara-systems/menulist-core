# Compiled Context Distribution Implementation

## Control documents

- `platformSummary/sourceVersions_{tId}_{sId}`: exact nonnegative counters for workspace profile, widget config, KB, docs navigation, entities, entity relations, canonical answers, surfaces, releases, branding, MCP policy, and predictive triggers.
- `platformSummary/bundleManifest_{tId}_{sId}`: active/last-ready pointer, source snapshot, bounded refs, stats, limits, and failure state.
- `platformSummary/bundleBuildLock_{tId}_{sId}`: lease owner, reserved version, expiry, and bounded result.

`branding` and `mcpPolicy` remain reserved invalidation counters. They are normalized and compared with every source-version snapshot, and their numeric values therefore appear in Firestore control state and private `mcp/product-summary.json` metadata. No current mutation path increments either counter. The app and Functions builders do not read `platformSummary/branding_{tId}_{sId}` or an MCP authorization-policy document, and compiled context does not serialize an advanced-branding or MCP-policy payload.

Initialization is transactional and creates only missing source/manifest documents. It does not reset existing active counters or a ready manifest.

Browser-owned knowledge, FAQ, predictive-summary, and product-surface mutations use the same transaction as their compiled-context invalidation. Before any write, the transaction reads the exact source-version and manifest identities, plus the cache-version identity when applicable. Existing rows must match `AL` and the active numeric tenant/store scope; cache rows must also match their source and carry a valid positive version. Missing rows are initialized with the complete reader-compatible source/manifest shape. Foreign or malformed occupied identities abort the complete business mutation rather than being merged, repaired, or overwritten.

## Build flow

The owner-triggered route resolves exact session scope, partitions its four-per-minute budget by authenticated actor plus workspace, fails closed with `503` when distributed capacity is unavailable, and checks `REBUILD_CONTEXT` before parsing the bounded strict reason/force body or entering builder reads/uploads. Fixed `owner`/allowlisted reason metadata keeps raw identity and arbitrary text out of locks/manifests.

1. Validate `AL`, `tId`, `sId`, existing manifest, and source-version ownership.
2. Claim a UUID lease and reserve a unique version in a transaction.
3. Read approved sources with cap-plus-one overflow detection.
4. Normalize resolved entity IDs and safe public citations.
5. Build separate public and private object maps.
6. Enforce file-specific UTF-8 byte ceilings before each upload.
7. Re-read source versions and mark a changed build `superseded`.
8. Upload restricted public and private version-local manifest copies best effort.
9. Publish the Firestore manifest and release the lease transactionally if ownership remains unchanged.
10. On failure, preserve the last-ready pointer, mark bounded stale/failure state, and delete the failed version prefixes best effort.

Bundle version admission is fail-closed before locks or uploads. Legacy canonical digit strings may normalize, but fractions, exponents, leading-zero strings, unsafe integers, malformed ready pointers, and wrong-scope manifests are rejected.

Retention uses the manifest's initially observed active version as a deletion ceiling. It never deletes a higher version that may have been published concurrently, and it advances `lastRetentionCleanedVersion` only after a transaction confirms that the same owned active version is still current.

## Object contract

Public objects include `widget-bootstrap.json`, `context-index.json`, `docs-nav.json`, `canonical-lite.json`, and route objects. Private objects include product, entity, surface, canonical, release, route, and entity-detail indexes for server consumers.

Widget bootstrap and private product-summary capability fields accept `widgetConfigVersion` and `activeTriggerCount` only as exact nonnegative safe integers. Numeric strings, fractions, negative/non-finite values, and unsafe integers project to zero/disabled rather than becoming public bundle truth. The app and scheduled Functions builders apply the same rule.

Workspace product fields also pass an exact mirrored projector before bundle construction. It selects only bounded scalar legacy name values, rejects unsafe/credential-bearing product URLs and malformed support email, admits only maintained billing modes, and normalizes timezone/support-day values. Undeclared or object-valued store fields cannot enter the content-immutable public widget bootstrap or the private product summary. Public object metadata and the proxy response use `public, max-age=0, must-revalidate`; the proxy verifies Storage existence before using its bounded process payload cache, so lifecycle deletion revokes the origin instead of leaving a year-cached public response.

The Firestore manifest ref map excludes `manifest.json` objects to avoid a circular/stale self-hash. Bundle stats count referenced data objects and therefore exclude the two version-local manifest copies.

The public manifest projection contains only schema version, `pId`, opaque public bundle ID, bundle version, status, generation time, and hash. The private manifest copy may include internal refs, but private Storage remains server-only.

## Reader contract

`isAnswerlatticeContextBundleManifestForScope()` verifies exact product/scope, schema, source versions, ready version equality, opaque public ID, and bundle map shape. Server writers additionally require `publicBundleId` to equal the deterministic SHA-256-derived identity for exact tenant/workspace scope and the configured minimum-32-character `ANSWERLATTICE_PUBLIC_BUNDLE_SALT`; a merely well-formed `pb_` value is not ownership proof. `getAnswerlatticeBundleRefPath()` derives the only allowed immutable path and verifies recorded bytes/hash and visibility-specific limits.

The dedicated Functions entry point declares this salt with `defineSecret` and binds the salt-bearing secret groups to both scheduled and manual scheduler exports. This binding is part of the runtime contract: a configured Secret Manager value is unavailable to a deployed second-generation Function unless the export lists it.

- Public API entity reads may fall back to bounded Firestore reads when a bundle is missing or invalid.
- MCP bundle reads fail closed for that tool call.
- Widget bundle config remains disabled until the widget consumes the files.

Manifest memory cache can retain a valid prior read for up to 60 seconds. Source-version writes mark the durable manifest stale immediately; the bounded in-process window is an operational tradeoff, not a zero-staleness guarantee.

Tenant clients may perform exact document gets for source/manifest ownership only when they hold the existing knowledge-control/rebuild permission. Rules allow an absent get only at the deterministic path derived from the caller's authenticated tenant/store claims; an occupied foreign-product or foreign-scope row remains unreadable. Client source counters advance monotonically by at most one per mutation, and cache-version identity/source/version transitions are immutable and sequential.

## Governance boundaries

Answerlattice Compiled Context Bundle Entity ID Boundary: app and Functions builders normalize resolved IDs. Malformed or unresolved relation endpoints are omitted; malformed or unresolved IDs are not serialized as authoritative links.

Manual build metadata uses fixed reason/requester values. The runtime excludes raw owner ids/emails and arbitrary request reason text from locks, manifests, results, and diagnostics.
