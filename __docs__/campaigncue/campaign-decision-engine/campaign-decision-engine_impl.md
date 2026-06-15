# Campaign Decision Engine — Implementation

## Code Truth

| Contract | File |
| --- | --- |
| Decision builder | `src/lib/campaigncue/decisionEngine.ts` |
| Decision types | `src/types/campaigncue.ts` |
| Daily Desk wiring | `src/lib/campaigncue/dailyDesk.ts` |
| Campaign pack storage | `src/lib/campaigncue/server.ts` |
| Owner explanation UI | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| Regression proof | `scripts/verification/verify-campaigncue-runtime.js` |

## Runtime Flow

1. Overview loads the existing bounded CampaignCue documents.
2. `buildCampaignCueOpportunities()` creates evidence-backed opportunities.
3. `buildCampaignCueDecisions()` scores campaign recipes from in-memory facts, assets, campaigns, schedules, locations, analytics, and source inputs.
4. `buildCampaignCueDailyDesk()` selects the top decision, chooses the recipe by `decision.recipeId`, converts decision missing inputs into owner cards, and returns `decision` plus `candidateDecisions`.
5. Owner UI renders "Why this recommendation" from the decision object.
6. Campaign creation recomputes bounded decisions, rejects creation unless the selected decision is `ready_to_prepare`, and returns the first owner-facing missing-input question when blocked.
7. Created campaigns store the selected decision under `campaign.pack.decision`.
8. Pack export includes decision confidence, status, score, "why this", and trust preflight.

## Non-Negotiables

- No AI/provider call.
- No model-owned recommendation.
- No Firestore write from decision scoring.
- No raw event scan.
- No separate decision collection in the current runtime.
- No direct posting or provider mutation.
- No full Campaign Pack creation from `needs_owner_input`, `safe_evergreen_only`, or `blocked` decisions.

## Storage Shape

The current runtime stores the selected decision only inside generated campaign pack metadata:

```ts
campaign.pack = {
  ownerGoal,
  recipeId,
  decision,
  reason,
  sourceFactIds,
  missingInputIds,
  deliveryCardIds,
  resultQuestion
}
```

Daily Desk candidate decisions remain derived response state.

## Missing Input Gate

The active runtime enforces the missing-input gate twice:

- Client UI disables pack creation and routes the owner to the current missing-detail surface when the selected decision is not `ready_to_prepare`.
- Server campaign creation recomputes the bounded decision set and rejects non-ready decisions before any campaign, trust report, event, or analytics write occurs.
- Rejected creation returns `CAMPAIGNCUE_DECISION_GATE` with HTTP 409 and an owner-facing missing-input message.
