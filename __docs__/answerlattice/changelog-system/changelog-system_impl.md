# Releases and Changelog Implementation

## Runtime ownership

Release and changelog mutations are server-owned. Browser DAL modules prepare bounded payloads, upload approved images, call authenticated routes, and validate bounded responses. Firestore transactions own ordering, idempotency, page mutation, release dependency validation, audits, and invalidation.

One initiating workspace owns the complete operation. The editor captures exact Answerlattice `tId/sId`; upload paths, changelog actions, release create/activate actions, and final publication carry that scope as corroboration. Server executors independently derive permission authority and reject a mismatch before target persistence. Successful responses acknowledge the exact authoritative scope, and browser clients reject a missing or different acknowledgement.

## Governed publication sequence

For a new or legacy-unlinked versioned entry, the editor uses:

`draft -> release activation -> linked publication`

1. Save the complete changelog content with `published=false` and a stable request ID.
2. Create or replay the deterministic release keyed by changelog entry and normalized version.
3. Activate with a deterministic activation request ID.
4. Evaluate affected active canonical answers and set `reviewRequired` where version drift is detected.
5. Update the same entry to `published=true` with the active `releaseId`.
6. Rebuild product-surface summary and revalidate public caches.

Already linked entries can update directly; the server revalidates the active dependency before accepting a published result.

## Release admission

`releaseContracts.ts` validates body size-compatible fields, Firestore IDs, entity fan-out, canonical numeric version labels, and matching normalized versions. `releaseServer.ts` verifies exact entity ownership, monotonic version order, and idempotent request fingerprints.

Activation uses a five-minute lease. It evaluates at most 200 active answers whose bound entities overlap the release. Malformed affected-answer state aborts the activation. Failure recovery returns the release to `pending` instead of leaving it stranded in `processing`.

## Changelog persistence

- Pages are stored under `changelog/{tId}/{sId}/page_XXXXXX`.
- A page contains at most 100 entries and stays below 900 KB.
- `answerlattice_changelogEntryIndex/{entryId}` maps an entry to one page for O(1) update/delete lookup.
- Create IDs are deterministic from workspace and request ID.
- Update and delete replay state is stored in the index.
- Feedback counters survive owner edits.

## Exact release dependency

Before a versioned entry may be stored as published, `changelogServer.ts` reads its release in the same transaction and requires:

- exact Answerlattice tenant/store scope;
- `status=active`;
- canonical version label and normalized integer equality;
- exact release timestamp equality;
- exact changed-entity set equality.

Any mismatch returns a conflict and no changelog write occurs.

## Delivery filters

`isAnswerlatticeChangelogEntryPublished()` is the root publication predicate. It requires explicit `published=true`; versioned entries also require a valid release ID. Product-surface summaries, the app bundle builder, and public projection reuse it. The dedicated Functions bundle builder mirrors the same fail-closed condition.

Public page projection also verifies `pId=AL`, `tId`, and `sId`. Latest and older queries scan at most 25 physical pages to skip draft-only pages.

## Recovery

If release creation, activation, or final publication fails after the draft write, the editor keeps the saved row private, refreshes the surface summary best-effort, closes with fixed recovery copy, and lets the owner reopen the draft. Deterministic release IDs make the retry replay-safe.

If the active workspace changes, the editor and management list discard prior rows, previews, modal state, delayed results, and notifications. A save already in flight remains server-fenced to its initiating workspace and cannot be cancelled into an ambiguous browser settlement.

## Verification

- `npm run test:answerlattice-release-contracts`
- `npm run test:answerlattice-changelog-contracts`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-release:emulator`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-changelog:emulator`
- `npm run verify:answerlattice-public-content-boundary`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
