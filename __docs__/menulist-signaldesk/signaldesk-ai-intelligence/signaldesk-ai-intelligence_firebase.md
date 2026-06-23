# SignalDesk AI Intelligence - Firebase Cost Plan

**Status:** Initial planning doc
**Created:** June 23, 2026
**Cost impact now:** None.

## Collections

| Collection | Purpose | Normal reads |
| --- | --- | --- |
| `signaldeskAiIntelligenceSummaries` | Latest target AI scores | Target detail/list filter |
| `signaldeskAiWorkerRuns` | Worker run summaries | Admin/debug only |
| `signaldeskAiResultCache` | Cached output by evidence hash | Worker lookup |
| `signaldeskAiEvalDatasets` | Eval seed cases | Admin QA |
| `signaldeskAiEvalRuns` | Eval results | Admin QA |
| `signaldeskAiCostDailySummaries` | AI spend summaries | Control room |

## Read / Write Model

| Flow | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Display score | 1-2 | 0 | Summary docs only. |
| Run AI score | 3-8 | 3-6 | Target, evidence, source policy, cache; result, run, summary. |
| Cache hit | 1-2 | 0-1 | May update lastUsedAt. |
| Eval run | Bounded | Bounded | Admin only, not dashboard source. |

## Cost Controls

- Cache by target ID + evidence hash + worker version.
- Do not run AI from list pages.
- Do not include full histories.
- Do not run AI in webhook/request critical path.
- Store compact outputs.
- Daily model spend summary required.

## Indexes

- `signaldeskAiIntelligenceSummaries`: `targetId`
- `signaldeskAiIntelligenceSummaries`: `recommendedHumanAction + updatedAt`
- `signaldeskAiWorkerRuns`: `workerName + createdAt`
- `signaldeskAiResultCache`: `cacheKey`
- `signaldeskAiEvalRuns`: `workerName + createdAt`

## Retention

| Data | Default |
| --- | --- |
| Latest AI summaries | Until superseded/deleted |
| Worker run summaries | 90-180 days |
| Eval runs | 12 months |
| Cost summaries | 24 months |
