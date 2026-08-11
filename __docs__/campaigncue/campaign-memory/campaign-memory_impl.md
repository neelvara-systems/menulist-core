# Campaign Memory 2.0 - Implementation

## Architecture

```text
Owner selects a recipe-approved result
  -> guarded campaign action route
  -> auth + workspace + rate limit + Zod validation
  -> transaction reads campaign, idempotency claim, and dashboard summary
  -> validate result ID against campaign recipe
  -> update campaign latest receipt/counters
  -> update bounded recipe/channel memory in analyticsSummaries/dashboard
  -> write one minimized owner_outcome_recorded event
  -> return campaign + summary
  -> merge locally and rebuild Daily Desk without overview reload
```

## Code Contract

| Responsibility | Location |
| --- | --- |
| Feature gate | `src/config/features.ts` |
| Bounds and confidence constants | `src/constants/campaigncue/campaignMemory.ts` |
| Memory types | `src/types/campaigncue.ts` |
| Pure aggregation and projection | `src/lib/campaigncue/campaignMemory.ts` |
| Persisted runtime validation | `src/lib/campaigncue/recordBoundary.ts` |
| Outcome transaction | `src/lib/campaigncue/server.ts` |
| Decision weighting | `src/lib/campaigncue/decisionEngine.ts` |
| Owner UI | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| Regression suite | `scripts/verification/test-campaigncue-campaign-memory.ts` |

## Compatibility

Existing analytics summaries may omit `campaignMemory`. The overview projects a safe empty or bounded recent-campaign fallback until the first new result receipt writes the durable summary. The fallback is labelled as limited coverage and never presented as full history.

## Mutation Semantics

Recording an outcome adds one conditional summary read inside the existing idempotent transaction. This read is required to preserve bounded aggregate history safely under concurrent updates. It does not add a write because the summary document is already written for every outcome.

The response returns the committed summary so the browser does not guess counters or refetch the overview.

## Privacy And Event Minimization

The campaign document remains the owner-note authority. The aggregate stores no note. The event stores signal ID, bounded metrics, experiment variable, and note presence/length only; it does not duplicate the raw note.

## Recommendation Use

The Decision Engine may use persisted recipe memory for a bounded boost or penalty. It may not bypass missing facts, trust blockers, commercial gates, owner effort, or repetition fatigue. Explanation copy must say `owner-reported` and avoid winner, ROI, conversion, or guaranteed-result language.
