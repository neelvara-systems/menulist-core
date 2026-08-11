# Local Visibility Action Center - Implementation

## Source Map

- `src/lib/campaigncue/localVisibility.ts`: `buildCampaignCueLocalVisibilityActions`, ranking, evidence bounds, freshness and image readiness.
- `src/lib/campaigncue/dailyDesk.ts`: supplies the caller clock and existing overview arrays.
- `src/types/campaigncue.ts`: `CampaignCueLocalVisibilityCue` contract.
- `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx`: action summary, evidence, steps, unlocks, and manual routing.
- `src/config/features.ts`: `ENABLE_CAMPAIGNCUE_LOCAL_VISIBILITY_ACTION_CENTER`.

## Data Flow

1. The existing CampaignCue overview loads Business Brain, campaigns, assets, source inputs, and locations.
2. Daily Desk calls `buildCampaignCueLocalVisibilityActions` with those arrays and its `now` value.
3. The pure builder derives bounded actions and sorts them by urgency and stable id.
4. UI either opens the existing source/details/assets/Google tab or invokes the existing deterministic visibility-pack builder.
5. Completion is detected on the next ordinary overview projection when canonical source truth changes.

## Important Decisions

- No action-completion document is written. The canonical source is the completion state.
- No external profile is fetched. Saved owner-managed destinations are evidence only that a handoff destination exists.
- A stale or trust-blocked Google output routes to fresh pack creation instead of being labelled ready.
- `CampaignCueLocalVisibilityCue` carries owner evidence and completion source so future UI changes do not need another read.

## Failure Behavior

Malformed or missing optional timestamps become unknown rather than current. Missing destinations and identity fields become `missing`. Unknown freshness cannot become ready. No branch can trigger provider mutation.
