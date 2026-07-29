# Releases and Changelog Implementation

## Runtime ownership

Release and changelog mutations are server-owned. Browser DAL modules prepare bounded payloads, upload approved images, call authenticated routes, and validate bounded responses. Firestore transactions own ordering, idempotency, page mutation, release dependency validation, audits, and invalidation.

One initiating workspace owns the complete operation. The editor captures exact Answerlattice `tId/sId`; upload paths, changelog actions, release create/activate actions, and final publication carry that scope as corroboration. Server executors independently derive permission authority and reject a mismatch before target persistence. Successful responses acknowledge the exact authoritative scope, and browser clients reject a missing or different acknowledgement.

## Governed publication sequence

For a new or legacy-unlinked versioned entry, the editor uses:

`draft -> pending release -> impact preview -> owner confirmation -> release activation -> linked publication`

1. Save the complete changelog content with `published=false` and a stable request ID.
2. Create or replay the deterministic release keyed by changelog entry and normalized version.
3. Read the bounded direct impact and current linked Answer Tests proof.
4. Keep the note private when the owner cancels review.
5. Activate with a deterministic activation request ID and the reviewed impact
   fingerprint.
6. Recompute the fingerprint during lease claim and final transaction, then
   evaluate affected active canonical answers and set `reviewRequired` where
   version drift is detected.
7. Update the same entry to `published=true` with the active `releaseId`.
8. Rebuild product-surface summary and revalidate public caches.

Already linked entries can update directly; the server revalidates the active dependency before accepting a published result.

## Feature 4 Validation Result

The existing release route now admits strict `preview_impact`. It reads the
pending release, applies the same direct affected-answer projector and
200-answer cap used by activation, optionally reads the existing bounded Answer
Tests summary when the actor can manage governance, and returns a private
projection plus deterministic fingerprint. It performs no write or provider
call.

The editor stages the note privately, creates or replays the pending release,
shows the owner the impact, and activates only after explicit confirmation.
Cancellation keeps the note private and the release retryable. Activation
recomputes the fingerprint during the claim transaction and final transaction.
Any current answer/version/governance input change rejects the stale preview.

Each bounded affected-answer row can open the existing Canonical Answer Editor
with one validated answer ID. When linked tests exist and the actor can see
governance proof, the preview can open Answer Tests with the pending release
preselected. Both destinations revalidate the ID and retain their existing
authority and cost contracts; the preview does not run a test or mutate an
answer.

No change-unit, impact-item, readiness, risk, scheduled-version, or monitoring
collection was added.

## Release admission

`releaseContracts.ts` validates body size-compatible fields, Firestore IDs, entity fan-out, canonical numeric version labels, and matching normalized versions. `releaseServer.ts` verifies exact entity ownership, monotonic version order, and idempotent request fingerprints.

Activation uses a five-minute lease. It evaluates at most 200 active answers whose bound entities overlap the release. Malformed affected-answer state aborts the activation. Failure recovery returns the release to `pending` instead of leaving it stranded in `processing`.

The preview and activation share one pure affected-answer projector so their
admission rules cannot drift. Preview evidence is not authority:
activation always re-reads current release and answer state.

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

A stale impact preview does not activate or publish. The draft and pending
release remain retryable, and the UI requests a fresh preview.

An invalid, removed, or foreign answer/release URL context is ignored or shown
as unavailable by the destination. It cannot change activation state.

## Verification

- `npm run test:answerlattice-release-contracts`
- `npm run test:answerlattice-changelog-contracts`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-release:emulator`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-changelog:emulator`
- `npm run verify:answerlattice-public-content-boundary`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
