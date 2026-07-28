# Releases and Changelog Mobile Support

## Assessment

The public/help-center timeline is responsive and useful on narrow screens. Full release authoring remains an occasional owner workflow, but it must stay usable on tablet and mobile browser without creating a second mobile data path.

## Current contract

- The same server routes, contracts, permissions, and publication lifecycle apply at every viewport.
- Drawer save and cancel controls use at least 44 px height.
- Date, time, version, changed-entity, KB, surface, and media fields reuse the desktop form state.
- Draft recovery copy is identical across viewport sizes.
- Public pagination skips draft-only pages server-side; mobile does not implement its own filter.

## Risks to verify in hosted smoke

- The 720 px drawer collapses without horizontal overflow.
- Date and time controls remain reachable above the software keyboard.
- Multi-select chips wrap without covering later fields.
- YouTube and attachment previews do not exceed the viewport.
- Save remains disabled/loading during the complete draft, activation, and publication sequence.
- The later pre-activation preview stacks affected-answer rows, proof state, and
  confirmation controls without requiring a wide impact matrix.
- Back or cancel after preview keeps the versioned note private and the release
  pending.
- A stale-preview response returns to the review state and never continues
  publication automatically.

## Non-goal

Do not add a separate mobile release editor, direct Firestore mutation, or reduced publication safety path.

Do not add a mobile release timeline, readiness dashboard, change-unit editor,
or monitoring chart for the Feature 4 hardening.
