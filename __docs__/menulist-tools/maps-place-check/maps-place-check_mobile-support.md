# Maps Place Check - Mobile Support

**Status:** Existing mobile Maps-link flow supported; grounded-candidate UI deferred

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Low | Place identity checks are occasional, not daily owner work |
| Speed | Medium | A one-tap check could be useful during setup or support |
| Touch | Pass later | A future confirmation sheet can be mobile-friendly |
| Owner value | Conditional | Useful only when it removes drift, not when it adds another task |

## Decision

Do not add a new mobile screen. This is an occasional setup/review action and
still fails the frequency gate.

The existing `MobileOfficialPageScreen` already lets an owner save or remove the
Google Maps directions link. That shared `updateStore` mutation now mirrors or
removes the internal `google_maps` URI binding in the same write, so mobile,
desktop, and embedded editor behavior stay aligned without another mobile task.

The guarded callable can later power:

- owner onboarding review
- Business Health review card
- platform/admin assisted setup

Any future mobile UI must use the existing MobileShell targets and show only the
review decision, not raw Maps/AI mechanics. It also remains blocked until the
provider smoke and cross-store provider-ID collision-policy gates both pass.
