# Campaign Decision Engine — Mobile Support

## Owner Mobile Contract

Mobile owners should see the same decision clarity as desktop:

- recommendation title
- confidence
- readiness state
- why this
- why now
- missing inputs
- trust preflight
- pack outputs

The decision engine itself has no mobile-specific data loading. It is included in `CampaignCueOverview.dailyDesk`.

## UI Rules

- Keep explanation cards short.
- Use chips for confidence/status.
- Keep buttons at 44px minimum through existing workspace styles.
- Do not expose score formulas as the primary owner message.
- Show missing input actions before editor/design actions.

