# Owner Action Layer Spec

## Problem

SMB owners do not want more modules. They need MenuList to show the next useful action when the public menu, customer link, hours, feedback, staff handoff, or daily menu facts need attention.

Current MenuList already has the source surfaces. The gap is selection: the owner must decide which screen matters now.

## Product Goal

Show one next owner action on desktop and mobile, then keep the remaining owner jobs one tap away.

## Owner Jobs Covered

| Owner job | Existing MenuList destination |
| --- | --- |
| Customer link missing | Business Settings / Domain settings |
| Hours missing | Working hours |
| Menu not live | Projects / Menu tab |
| Link not placed | Presence Monitor / Use MenuList |
| Private feedback off or unused | Feedback |
| Daily menu change | Menu Manager |
| Today-only status | Temporary Status |
| Staff handoff | Use MenuList / Share |
| Price change | Menu Manager |

## Priority Rules

1. Missing menu/publish state wins first.
2. Missing hours wins before distribution.
3. Missing customer link wins before placement.
4. Missing or stale external placement wins before secondary actions.
5. Feedback disabled wins before routine actions.
6. If no required gap exists, daily menu change is the default owner action.

## Accepted Behavior

- Desktop dashboard shows one primary action and compact handoff buttons.
- Mobile dashboard shows the same action layer inside `MobileShell`.
- Placement proof uses existing `menuPresence` timestamps.
- Mobile routes use existing shell callbacks, not desktop route pushes.
- The layer disappears behind `ENABLE_OWNER_ACTION_LAYER`.

## Rejected Behavior

- No external profile scanning.
- No social auto-posting.
- No review gating.
- No new analytics collection.
- No new setup score.
- No new API route.
- No new owner toggle.
- No date-specific exception schema in this slice.

## Release Boundary

This is source-verified local implementation, not launch certification. Release approval still requires current production-readiness evidence, browser/mobile QA, target deploy evidence, and production-host smoke.
