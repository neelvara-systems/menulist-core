# SignalDesk AI Intelligence - Firebase and Cost Contract

**Status:** Local source complete; QA index deployment pending
**Last Updated:** July 21, 2026

## Collections

| Collection | Purpose |
| --- | --- |
| `signaldeskAiWorkerRuns` | Rules scores, provider assists, volume parents, and the global volume lock. |
| `signaldeskAiOperationLedger` | Compact operation and estimated-cost evidence. |
| `signaldeskDecisionSnapshots` | Typed internal decision evidence. |
| `signaldeskIdempotencyKeys` | Actor-bound paid-call claims, reservations, completion, and unresolved outcomes. |
| `signaldeskModelRoutes` | Task provider/model/status/cost authority. |
| `signaldeskModelEvals` | Cumulative provider and founder-review quality counters. |
| `signaldeskProviderAccounts` | Provider readiness, caps, reserved spend, and settled spend. |
| `signaldeskBudgetPolicies` | Optional provider budget authority and reservation. |
| `signaldeskCostDailySummaries` | Compact Firestore/provider cost estimate. |
| `signaldeskAuditEvents` / `signaldeskRunTimelines` | Stable operator and recovery evidence. |

All collections are in the dedicated SignalDesk Firebase boundary. Browser writes are denied; protected server actions own mutation.

## Cost Shape

| Flow | Provider calls | Firestore behavior |
| --- | ---: | --- |
| Rules score first run | 0 | One transaction reads target/policy/score and creates score, decision, ledger, target update, audit, and daily cost. |
| Rules score exact replay | 0 | Transactional reads; no write. |
| Standalone assist | 1 | Preflight reads, one reservation/claim transaction, one final settlement transaction. |
| Multi-pass child | 2 routine, 3 maximum | Same assist reservation/settlement boundary; parent lock prevents overlapping volume spend. |
| Volume parent start/finish | 0 directly | One parent/lock transaction and one bounded terminal update; child calls carry provider cost. |
| Interrupted parent recovery | 0 | Parent plus at most 20 same-parent child rows, then one terminal transaction. |
| Exact shadow-review replay | 0 | Existing run/eval reads; no writes. |
| Changed shadow review | 0 | Existing run/eval and optional revenue summary; updates those records plus audit, timeline, and daily cost. |
| AI workspace | 0 | Three queries, each capped at 30 valid rows, plus model routes/evals, targets, and evidence lists. |

## Indexes

AI workspace category fairness requires:

```txt
signaldeskAiWorkerRuns:
  pId ASC
  workerType ASC
  createdAt DESC
```

AI detail cleanup separately uses:

```txt
signaldeskAiWorkerRuns:
  pId ASC
  aiDetailLifecycleState ASC
  aiDetailExpiresAt ASC
```

The volume-child recovery query uses `volumeRunId` with a single-field index and needs no composite index.

## Retention

AI source-derived detail expires after exactly 90 days. Cleanup nulls or clears `output`, `initialOutput`, `instruction`, critic reasons, review reason, detailed reasons, and parent target IDs. It retains compact run identity, task/provider/model, cost, confidence/counts, review decision/identity, lifecycle timestamps, and separate immutable audit evidence.

Model-eval, ledger, audit, and daily summary retention is governed by their own SignalDesk policies; this feature does not invent generic 12- or 24-month defaults.

## Deployment

The typed workspace query adds one Firestore composite index. Deploy only the SignalDesk index target to `menulist-signaldesk-qa` after local verification. The existing source-data lifecycle Function also needs its separately documented QA deployment before 90-day scrubbing is considered live. No MenuList Firebase target is involved.

## Cost Rules

- No AI on list rendering.
- No raw provider payload persistence.
- No unbounded history reads.
- No second cache collection.
- No scheduled provider generation.
- Exact paid retries do not repeat calls.
- Volume is capped at 15 pairs and 45 calls.
- Provider account and budget reservation are checked transactionally before execution and settled to actual bounded cost.
