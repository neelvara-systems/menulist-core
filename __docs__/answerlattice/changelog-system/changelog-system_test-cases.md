# Releases and Changelog Test Cases

## Contract tests

- Accept canonical `2.4.1` with normalized `2_004_001`.
- Reject label/normalized mismatch and non-canonical `v` labels in release storage.
- Reject duplicate or more than 25 changed entities.
- Reject published versioned changelog actions without `releaseId` or changed entities.
- Allow versioned drafts without a release.
- Normalize legacy unlinked versioned stored entries as drafts.

## Release emulator

- Deterministic create replay returns the same release.
- Reused request ID with changed details conflicts.
- Cross-workspace or coercive entity scope fails.
- Activation marks affected approved answers for review and audits the change.
- Activation invalidates canonical cache and compiled source state.
- A malformed affected answer returns the release to pending.
- Retry completes after the malformed answer is repaired.

## Changelog emulator

- Create/update/delete are replay-safe.
- Concurrent creates do not lose or duplicate entries.
- Owner edits preserve feedback counters.
- Replaced file URLs are returned for deferred safe cleanup.
- Published versioned entry with exact active release succeeds.
- Missing release link fails.
- Version, date, or changed-entity mismatch fails with no write.

## Public boundary

- Exact product, tenant, and store scope is required.
- Drafts are removed.
- Versioned entries without release linkage are removed.
- Internal actors, release IDs, entity changes, context keys, and page metadata are not projected.
- Latest/older reads scan past draft-only physical pages within the bounded window.

## Hosted smoke still required

- New versioned publish success.
- Forced activation failure leaves a visible owner draft and no public note.
- Reopen and retry publishes the same entry/version.
- Unpublish removes the note from public cache and surface summary.
- Narrow-width form and public timeline have no overlap or horizontal clipping.

