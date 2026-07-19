# Releases and Changelog Specification

## Product job

When a SaaS product changes, the founder must be able to announce the change and identify which approved support answers may now be stale without publishing an unsupported or partially propagated release note.

## Actors

- **Founder or knowledge manager:** drafts and publishes release notes.
- **Answerlattice release service:** admits ordered releases and evaluates affected answers.
- **Reviewer:** resolves drifted canonical answers.
- **End user:** sees only explicitly published, workspace-correct entries.

## Invariants

1. Releases belong to one exact `pId=AL`, `tId`, and `sId` scope.
2. Versions are canonical numeric labels with matching normalized integers.
3. A release contains one to 25 unique changed entity IDs owned by the workspace.
4. A version must be greater than the latest stored release version.
5. A versioned public changelog entry requires an active release dependency.
6. The entry and release must have the same normalized version, release timestamp, and changed-entity set.
7. Drafts, missing `published`, and versioned entries without a valid `releaseId` are not deliverable.
8. Support tickets, notes, or changelog text never become canonical truth automatically.

## Publication states

- **Draft announcement:** `published=false`; may be versioned but does not affect public delivery.
- **Pending release:** release exists with `status=pending`; note remains draft.
- **Processing release:** activation lease is active; note remains draft.
- **Active linked release:** release evaluation completed; note may publish with exact `releaseId`.
- **Legacy unlinked versioned note:** normalized as a draft until repaired.

## Failure behavior

- Duplicate create requests replay only when the request fingerprint matches.
- Reused request IDs with changed data return conflict.
- Failed release activation returns the release to `pending` and records a fixed failure state.
- If publication propagation fails after staging, the note remains a draft and the owner is told to reopen and retry.
- Invalid scope, stored shape, dependency, or page size fails closed.

## Non-goals

- A public status page or incident timeline.
- Arbitrary semantic-version formats or mutable release history.
- Automatic approval of drifted answers.
- A full documentation CMS or help-desk replacement.
- Public exposure of release IDs, entity IDs, audit actors, or internal context keys.

## Success measures

- Versioned public notes with exact active release linkage: 100%.
- Draft or unlinked versioned notes reaching public surfaces: 0.
- Release activation failures stranded in `processing`: 0.
- Affected answers evaluated within the 200-answer activation cap.
- Time from release activation to review of drifted priority answers.
