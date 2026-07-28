# Releases and Changelog Test Cases

## Contract tests

- Accept canonical `2.4.1` with normalized `2_004_001`.
- Reject label/normalized mismatch and non-canonical `v` labels in release storage.
- Reject duplicate or more than 25 changed entities.
- Reject published versioned changelog actions without `releaseId` or changed entities.
- Reject changelog and release actions with missing, malformed, or non-positive initiating workspace scope.
- Reject successful mutation responses that omit exact workspace acknowledgement.
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

## Pre-Activation Impact Preview

- Preview rejects malformed, foreign, active, missing, or wrong-workspace
  release state as required by the final contract.
- Preview returns only directly entity-linked active canonical answers.
- Preview and activation use the same affected-answer admission projector and
  200-answer cap.
- Preview performs no write, drift mutation, release mutation, changelog
  mutation, test run, or provider call.
- Preview exposes linked current, stale, missing, and critical-failure Answer
  Test proof without treating missing proof as passing.
- Activation rejects a missing, malformed, wrong-release, or stale preview
  fingerprint.
- Repeating the same current preview is deterministic.
- Release or affected-answer changes invalidate the earlier preview.
- Workspace transition clears preview UI and cannot settle activation into the
  later workspace.
- Owner cancellation after preview leaves the note private and release pending.

## Changelog emulator

- Create/update/delete are replay-safe.
- Changelog create/update/delete reject a valid action whose initiating scope differs from current server permission scope, with no write.
- Concurrent creates do not lose or duplicate entries.
- Owner edits preserve feedback counters.
- Replaced file URLs are returned for deferred safe cleanup.
- Published versioned entry with exact active release succeeds.
- Missing release link fails.
- Version, date, or changed-entity mismatch fails with no write.

## Workspace transition

- An image upload and later changelog mutation use the same initiating workspace even if the active session changes between them.
- Release registration, activation, and final linked publication reject a changed workspace.
- Management rows, previews, editor state, and delayed success/error settlement clear on workspace change.
- Sorting management entries does not mutate the cached page array.

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
- Direct-impact preview is understandable on desktop and narrow widths.
- Stale preview requires review again and does not publish.
