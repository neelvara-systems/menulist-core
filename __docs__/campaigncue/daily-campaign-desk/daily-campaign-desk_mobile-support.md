# Daily Campaign Desk — Mobile Support

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Owners may check the daily campaign action frequently. |
| Speed | Pass | The desk uses the existing overview response and does not wait for provider work. |
| Touch | Pass | Primary actions are buttons and cards; no precision canvas editing is required. |
| Value | Pass | Owners can review a missing detail, download/use a pack, choose a quick result option, or route to assets/editor away from a desk. |

## Mobile Decision

Daily Campaign Desk is supported in the responsive CampaignCue owner workspace. It does not introduce a separate mobile DAL or separate mobile route.

## Mobile Rules

- Keep actions at least 44px high.
- Keep the first action visible before dense lists.
- Do not put the full creative editor into the daily desk.
- Use Daily desk to route owners to Inputs, Assets, Packs, Results, and Editor when needed.
- Keep quick result options as buttons before the freeform note.
- Keep asset reuse as a route to Assets/Editor/CueLayers, not a dense layer-editing surface on the desk.
- No provider posting, no account connection, and no spend action on mobile.

## Current Implementation

`CampaignCueWorkspaceApp.module.scss` already provides responsive one-column behavior below `640px`, and the daily desk uses existing buttons/cards/list patterns.
