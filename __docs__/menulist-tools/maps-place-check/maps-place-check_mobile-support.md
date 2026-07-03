# Maps Place Check - Mobile Support

**Status:** Mobile UI deferred; backend usable by future owner-assisted surfaces

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Low | Place identity checks are occasional, not daily owner work |
| Speed | Medium | A one-tap check could be useful during setup or support |
| Touch | Pass later | A future confirmation sheet can be mobile-friendly |
| Owner value | Conditional | Useful only when it removes drift, not when it adds another task |

## Decision

Do not add a mobile screen in the prototype. The first implementation is a guarded callable that can later power:

- owner onboarding review
- Business Health review card
- platform/admin assisted setup

Any future mobile UI must use the existing MobileShell targets and show only the review decision, not raw Maps/AI mechanics.
