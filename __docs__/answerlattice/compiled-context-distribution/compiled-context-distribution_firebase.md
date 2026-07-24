# Compiled Context Distribution Firebase Notes

## Firestore and Storage

Control state uses existing `platformSummary` documents. Versioned data objects use:

- public: `answerlattice-context/public/{publicBundleId}/v{bundleVersion}/...`
- private: `answerlattice-context/private/{tId}/{sId}/v{bundleVersion}/...`

Public Storage access is limited to opaque public paths. Private bundle access and all writes are server-only. The Firestore manifest, not a mutable `latest.json`, selects the active version.

## Writes and cost

- A source mutation adds a source-version increment and stale marker to the same domain transaction. KB/canonical cache-version invalidation is atomic with the corresponding compiled-source invalidation.
- Browser mutation transactions add two ownership reads for source/manifest, plus one cache-version read for KB/canonical invalidation. Product-surface and predictive-summary mutations add the two control-plane reads. These bounded reads prevent a domain write from committing against a foreign, malformed, or partial deterministic control-plane identity.
- Missing source/manifest rows are created with the complete reader-compatible schema. Existing legacy source rows with omitted counters are normalized to explicit zero counters during the next authorized increment; active bundle pointers and bundle refs are never reset by a client update.
- A successful build reads bounded source sets, uploads immutable objects, uploads two unreferenced manifest copies best effort, and writes one ready/superseded manifest plus lock completion.
- A failed build writes bounded failure state and attempts to delete only that failed version's public/private prefixes.
- Runtime readers use memory/Storage before bounded Firestore fallback where the consumer contract permits it.
- No runtime read triggers a rebuild.

Object bytes are enforced before upload: 50 KB for public bootstrap/routes, 512 KiB for other public files, and 2 MiB for private files. Public proxy and private readers also check metadata and downloaded bytes before parsing.

## Retention and recovery

Retention keeps active/last-ready versions under the exact safe-integer contract. If manifest state is malformed, retention deletes zero objects. A run may delete only versions at or below the active version it observed; a concurrently published higher version is never eligible under the stale keep-set. The completion marker is written transactionally only when the manifest is still owned and the active version is unchanged. Failed-version cleanup is best effort and observable; normal retention remains the recovery path for orphaned immutable versions.

## Security

Source and manifest documents require exact `pId='AL'`, `tId`, and `sId`. Tenant clients can get only their exact deterministic control identities with knowledge-control/rebuild permission. A missing row is readable only at the path derived from authenticated tenant/store claims; an occupied foreign row is not exposed. First writes require the complete source/manifest shape, source counters may only remain unchanged or advance by one, and cache-version rows require immutable source/path identity plus an exact `version + 1` update. Readers reject arbitrary ref paths, wrong active versions, invalid hashes, and oversized objects. The public manifest omits internal scope, source versions, private refs, stats, and limits.

Answerlattice Compiled Context Bundle Entity ID Boundary applies before every object upload; malformed or unresolved IDs do not become trusted bundle edges.

Diagnostics use fixed reason/requester and failure codes. They exclude raw owner ids/emails, arbitrary request reason text, source content, secrets, and raw infrastructure exceptions.

## Deployment

Feature 14 changes dedicated Answerlattice Functions bundle generation. Local Functions build is required. QA deploy must target `answerlatticeNightly` through `firebase-answerlattice.json`; authenticated remote evidence is separate from local source completion.
