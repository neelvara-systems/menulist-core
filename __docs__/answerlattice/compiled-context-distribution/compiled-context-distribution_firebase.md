# Compiled Context Distribution Firebase Notes

## Firestore and Storage

Control state uses existing `platformSummary` documents. Versioned data objects use:

- public: `answerlattice-context/public/{publicBundleId}/v{bundleVersion}/...`
- private: `answerlattice-context/private/{tId}/{sId}/v{bundleVersion}/...`

Public Storage access is limited to opaque public paths. Private bundle access and all writes are server-only. The Firestore manifest, not a mutable `latest.json`, selects the active version.

## Writes and cost

- A source mutation adds a source-version increment and stale marker to the same domain transaction. KB/canonical cache-version invalidation is atomic with the corresponding compiled-source invalidation.
- `branding` and `mcpPolicy` remain reserved invalidation counters. Their numeric values are retained in Firestore control state and private `mcp/product-summary.json` metadata so source-version equality remains forward-compatible, but no current mutation path increments them. The builders do not read the private advanced-branding profile or an MCP authorization-policy document, and compiled context does not serialize either payload. Saving the non-delivered advanced-branding profile therefore adds only its existing profile write and does not add source-version, manifest, bundle-build, or Storage work.
- Browser mutation transactions add two ownership reads for source/manifest, plus one cache-version read for KB/canonical invalidation. Product-surface and predictive-summary mutations add the two control-plane reads. These bounded reads prevent a domain write from committing against a foreign, malformed, or partial deterministic control-plane identity.
- Missing source/manifest rows are created with the complete reader-compatible schema. Existing legacy source rows with omitted counters are normalized to explicit zero counters during the next authorized increment; active bundle pointers and bundle refs are never reset by a client update.
- A successful build reads bounded source sets, uploads content-immutable objects, uploads two unreferenced manifest copies best effort, and writes one ready/superseded manifest plus lock completion. Public object transport uses mandatory revalidation rather than one-year immutable caching so exact Storage deletion can revoke a closed workspace; dedicated and shared client Storage rules deny direct object reads so rate, byte, diagnostics, and revocation controls cannot be bypassed. Private objects keep the maintained short private cache policy.
- Manual rebuild requests are limited to four per authenticated actor/workspace per minute before permission/build work; limiter-provider uncertainty admits zero Firestore/Storage work and returns `503`.
- A failed build writes bounded failure state and attempts to delete only that failed version's public/private prefixes.
- Runtime readers use memory/Storage before bounded Firestore fallback where the consumer contract permits it.
- No runtime read triggers a rebuild.

Object bytes are enforced before upload: 50 KB for public bootstrap/routes, 512 KiB for other public files, and 2 MiB for private files. Public proxy and private readers also check metadata and downloaded bytes before parsing.

## Retention and recovery

Retention keeps active/last-ready versions under the exact safe-integer contract. If manifest state is malformed, retention deletes zero objects. Each run scans at most 25 exact version prefixes and lists at most `deleteLimit + 1` objects for the current prefix. A persisted manifest cursor freezes the observed active-version authority, keep-set, next version, and public bundle identity, so a dense early prefix cannot starve later versions and a concurrently published higher version is never eligible under a stale keep-set. Cursor completion/progress is written transactionally only while the manifest remains owned, has not moved behind the scan authority, and retains the same deterministic public identity. A separate exact failed-lock recovery deletes the failed reserved version when it is neither active nor last-ready, respects the same run-wide object budget, and transactionally marks that exact failed lock complete so an absent future build is not required for cleanup.

`publicBundleId` is not accepted merely because it begins with `pb_`. App, dedicated Functions, retention, and workspace lifecycle code independently derive the one valid ID from exact `tId`, exact `sId`, and `ANSWERLATTICE_PUBLIC_BUNDLE_SALT` (minimum 32 trimmed characters). Deleters use that derived prefix even when a partial build left no manifest pointer or a legacy manifest contains an empty pointer; retention also persists progress/completion for that empty-pointer compatibility state. A missing salt or non-empty mismatched legacy/corrupt manifest fails closed before public-object creation, overwrite, or deletion. Operators must review and repair that manifest; runtime code must not adopt or delete another workspace's syntactically valid prefix.

The salt is a declared Firebase Functions secret and must be bound to both `answerlatticeNightly` and `triggerAnswerlatticeNightly`; reading the environment variable in implementation code does not make Secret Manager inject it. The scheduled binding includes the salt plus the existing Gemini key group, and the manual binding additionally includes `ANSWERLATTICE_CRON_SECRET`. A deployed compiler without this binding fails closed before object mutation.

## Security

Source and manifest documents require exact `pId='AL'`, `tId`, and `sId`. Tenant clients can get only their exact deterministic control identities with knowledge-control/rebuild permission. A missing row is readable only at the path derived from authenticated tenant/store claims; an occupied foreign row is not exposed. First writes require the complete source/manifest shape, source counters may only remain unchanged or advance by one, and cache-version rows require immutable source/path identity plus an exact `version + 1` update. Readers reject arbitrary ref paths, wrong active versions, invalid hashes, and oversized objects. The public manifest omits internal scope, source versions, private refs, stats, and limits.

Answerlattice Compiled Context Bundle Entity ID Boundary applies before every object upload; malformed or unresolved IDs do not become trusted bundle edges.

Diagnostics use fixed reason/requester and failure codes. They exclude raw owner ids/emails, arbitrary request reason text, source content, secrets, and raw infrastructure exceptions.

## Deployment

Feature 14 changes dedicated Answerlattice Functions bundle generation. Local Functions build is required. QA deploy must target `answerlatticeNightly` through `firebase-answerlattice.json`; authenticated remote evidence is separate from local source completion.
