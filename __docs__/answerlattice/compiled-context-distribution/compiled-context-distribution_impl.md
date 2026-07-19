# Compiled Context Distribution Implementation

## Control documents

- `platformSummary/sourceVersions_{tId}_{sId}`: exact nonnegative counters for workspace profile, widget config, KB, docs navigation, entities, entity relations, canonical answers, surfaces, releases, branding, MCP policy, and predictive triggers.
- `platformSummary/bundleManifest_{tId}_{sId}`: active/last-ready pointer, source snapshot, bounded refs, stats, limits, and failure state.
- `platformSummary/bundleBuildLock_{tId}_{sId}`: lease owner, reserved version, expiry, and bounded result.

`branding` and `mcpPolicy` are reserved source-version keys. Their current bundle-object serialization status requires verification; do not market them as active bundle payloads.

Initialization is transactional and creates only missing source/manifest documents. It does not reset existing active counters or a ready manifest.

## Build flow

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

## Object contract

Public objects include `widget-bootstrap.json`, `context-index.json`, `docs-nav.json`, `canonical-lite.json`, and route objects. Private objects include product, entity, surface, canonical, release, route, and entity-detail indexes for server consumers.

The Firestore manifest ref map excludes `manifest.json` objects to avoid a circular/stale self-hash. Bundle stats count referenced data objects and therefore exclude the two version-local manifest copies.

The public manifest projection contains only schema version, `pId`, opaque public bundle ID, bundle version, status, generation time, and hash. The private manifest copy may include internal refs, but private Storage remains server-only.

## Reader contract

`isAnswerlatticeContextBundleManifestForScope()` verifies exact product/scope, schema, source versions, ready version equality, opaque public ID, and bundle map shape. `getAnswerlatticeBundleRefPath()` derives the only allowed immutable path and verifies recorded bytes/hash and visibility-specific limits.

- Public API entity reads may fall back to bounded Firestore reads when a bundle is missing or invalid.
- MCP bundle reads fail closed for that tool call.
- Widget bundle config remains disabled until the widget consumes the files.

Manifest memory cache can retain a valid prior read for up to 60 seconds. Source-version writes mark the durable manifest stale immediately; the bounded in-process window is an operational tradeoff, not a zero-staleness guarantee.

## Governance boundaries

Answerlattice Compiled Context Bundle Entity ID Boundary: app and Functions builders normalize resolved IDs. Malformed or unresolved relation endpoints are omitted; malformed or unresolved IDs are not serialized as authoritative links.

Manual build metadata uses fixed reason/requester values. The runtime excludes raw owner ids/emails and arbitrary request reason text from locks, manifests, results, and diagnostics.
