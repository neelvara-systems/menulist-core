# Releases and Changelog Firebase Contract

## Collections

| Collection | Ownership | Purpose |
|---|---|---|
| `answerlattice_releases` | Server write, scoped management read | Immutable ordered release registry and activation state |
| `changelog/{tId}/{sId}` | Server write, scoped management read | Paginated changelog entries |
| `answerlattice_changelogEntryIndex` | Server only | Entry-to-page lookup, idempotency, deletion tombstone |
| `answerlattice_auditLogs` | Server write | Release lifecycle and drift audit |
| `answerlattice_cacheVersions` | Server write | Canonical cache invalidation |
| `platformSummary` | Server write | Source-version counters, bundle stale state, surface summaries |

Versioned public entries require an exact active release dependency. The changelog transaction validates the release before writing the published entry.

## Write cost

### Release create

- Reads: deterministic release doc, latest release query, one entity document per changed entity.
- Writes: release document and one audit document.

### Release activation

- Claim transaction: one release read, one affected-answer query up to 201, and
  one release write after the reviewed fingerprint matches.
- Completion transaction: release read, affected-answer query up to 201, answer/audit writes for drifted answers, release update, activation audit, source version, cache version when needed, and bundle manifest.

### Release impact preview

- Reads: one strict release point read, one affected-active-answer query capped
  at 201, and the existing bounded Answer Tests summary only when current proof
  is requested and permission permits.
- Writes: 0.
- Listeners: 0.
- Provider calls: 0.

Activation repeats authoritative reads by design. Preview results cannot replace
transaction-current authorization or drift evaluation.

### Prepared release evidence handoff

- Existing Knowledge Intake source save and bundle refresh: unchanged existing cost.
- Handoff-specific Firestore reads/writes/deletes: 0.
- Handoff-specific Storage, listener, provider, AI, scheduler, and cache operations: 0.
- Browser operations: one bounded same-tab `sessionStorage` write, read, and remove.
- Changelog/release operations: unchanged and begin only after explicit owner save.

Affected-answer and linked-test review links add zero preview reads or writes.
Canonical Answers and Answer Tests perform only their existing bounded loads
after the owner explicitly opens the destination. No link mounts a listener or
runs a test automatically.

### Changelog create

- Reads: entry index, latest page query, plus one release read only for direct linked publication.
- Writes: page, entry index, source-version summary, and bundle manifest.

### Changelog update/delete

- Reads: entry index and page, plus one release read for published versioned updates.
- Writes: page, index, source-version summary, and bundle manifest.

## Limits and stop rules

- Changed entities: 25 per release.
- Affected active answers: 200 per activation; cap+1 aborts.
- Changelog entries: 100 per page.
- Page payload: under 900 KB.
- Images: four, each up to 5 MB, approved image MIME types only.
- Public physical-page scan: 25 pages per request.
- Entry-index deletion tombstone: 90 days.
- Preview answer cap: the same 200-answer cap with cap-plus-one failure.
- Preview response: bounded private projection with a 256 KiB browser limit.

## Security

- Browser clients cannot create or activate releases.
- Browser clients cannot write changelog pages or entry-index rows.
- API routes require exact Answerlattice session scope, rate limits, and `MANAGE_KNOWLEDGE`.
- Changelog and release actions include initiating `tId/sId` only as corroboration; server permission scope remains authoritative and a mismatch fails before persistence.
- Mutation responses acknowledge exact authoritative `tId/sId`; browser DALs fail closed on missing or mismatched acknowledgement.
- Public content is projected through an allowlist and contains no internal release linkage, entity changes, context keys, actor identity, or audit data.
- Storage upload occurs before mutation; ambiguous persistence retains uploaded media and logs a bounded diagnostic rather than risking deletion of a committed reference.
- Upload path generation uses the same initiating workspace that the later changelog/release actions must corroborate.

The workspace fencing and acknowledgement fields add no Firestore or Storage operations and require no rule, index, Function, or schema migration.

## Rejected Firebase Expansion

Do not add `releaseGuard_*` summaries, release workspaces, change-unit
collections, impact-item documents, accepted-risk records, activation groups,
scheduled-answer versions, or release-monitoring rows for this hardening.

The preview endpoint may add server reads only on an explicit owner request.
It must not run on page load, mount a listener, scan raw support collections, or
invoke an LLM.

## Deployment

The explicit publication predicate is mirrored in `functions-answerlattice/src/answerlattice/contextBundleBuilder.ts`. Therefore the dedicated context-bundle Function deployment is required after source verification. No Firestore rules or index change is required by this Feature 11 patch.
