# SignalDesk AI Intelligence - Firebase Cost Plan

**Status:** Current runtime and cost contract
**Created:** June 23, 2026
**Cost impact now:** Local/emulator verification only; no deployed SignalDesk project writes.
**Last Updated:** July 11, 2026

## Collections

| Collection | Purpose | Normal reads |
| --- | --- | --- |
| `signaldeskAiWorkerRuns` | Rules scores, provider child runs, and parent AI volume-run summaries | Private AI/control-room workspace |
| `signaldeskAiOperationLedger` | Per-provider AI operation and estimated cost | Audit/cost investigation |
| `signaldeskDecisionSnapshots` | Compact decision evidence | Private review |
| `signaldeskModelRoutes` | Task model, provider, confidence, escalation, and per-run cap | AI workspace/configuration |
| `signaldeskModelEvals` | Cumulative provider and founder-review quality | AI workspace |
| `signaldeskProviderAccounts` / `signaldeskBudgetPolicies` | AI provider readiness and spend authority | Preflight and control room |
| `signaldeskCostDailySummaries` | Compact daily estimated AI/provider/Firestore cost | Control room |
| `signaldeskAuditEvents` / `signaldeskRunTimelines` | Founder action and batch progress evidence | Audit/control room |

## Read / Write Model

| Flow | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Display score | 1-2 | 0 | Summary docs only. |
| Run AI score | 3-8 | 3-6 | Target, evidence, source policy, cache; result, run, summary. |
| Cache hit | 1-2 | 0-1 | May update lastUsedAt. |
| Eval run | Bounded | Bounded | Admin only, not dashboard source. |
| Founder shadow review | 2 required transactional reads plus optional existing revenue summary | Existing AI run + model eval + optional revenue summary + audit/timeline/cost | No new collection or provider call. |
| AI volume start | Target/task route and provider/budget preflight, bounded by 5 targets and 3 tasks | Parent worker run + audit + timeline + cost summary | No provider call until maximum estimated cost passes. |
| AI volume child | Target + source policy + optional evidence + task route + critic route + provider/budget controls | Existing assist run ledger: child worker run, decision snapshot, AI operation ledger, model eval, provider/budget spend, timeline, audit, daily cost | Two routine calls; third call only on critic/confidence/rejected-fact escalation. |
| AI volume finish | Parent worker run | Parent status/counters/child IDs + audit + timeline + cost summary | Stable failure codes only; no raw provider error persisted. |
| AI volume stale recovery | Existing parent + maximum 20 same-parent worker rows + global lock | Existing parent terminal state + conditional owned-lock release + audit + timeline + cost summary | No provider call. Keeps at most 15 child IDs; the single-field `volumeRunId` query needs no composite index. |

## Cost Controls

- Cache by target ID + evidence hash + worker version.
- Do not run AI from list pages.
- Do not include full histories.
- Do not run AI in webhook/request critical path.
- Store compact outputs.
- Daily model spend summary required.
- Founder maximum estimated batch cost is required and capped by API schema.
- Provider and budget authority is checked for child calls even after batch preflight.
- Batch size is capped at five targets, three tasks, and three model calls per target/task pair.

## Indexes

AI workspace reads the latest bounded `signaldeskAiWorkerRuns` list by existing `createdAt`. Volume Mode adds no collection or composite index.

## Retention

| Data | Default |
| --- | --- |
| Latest AI summaries | Until superseded/deleted |
| Worker run summaries | 90-180 days |
| Eval runs | 12 months |
| Cost summaries | 24 months |
