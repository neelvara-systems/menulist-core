# Firebase Scale And Cost Closeout - Implementation

**Status:** Implemented in source
**Last verified:** July 17, 2026

## Scheduler Change

`computeDecisionBlocksScores` remains hourly because stores settle in different
timezones. Before store work begins, it transactionally reads
`_system/decisionBlocksPlatformDaily`.

The lease carries a unique owner token. Completion runs in a transaction,
re-reads the current state, and writes completion/failure fields only when that
token still owns the lease. The consolidated maintenance scheduler uses the
same owner-checked finalization rule and atomically records task outcome plus
lease release. Expired predecessors therefore cannot overwrite replacement
state.

The lease admits work when:

- `lastCompletedDayKey` is not the current UTC date;
- no unexpired owner is running; and
- a same-day failed attempt is outside the 55-minute retry delay.

The winner writes a ten-minute lease. Concurrent instances receive `null`.
After all platform tasks, the owner records `completed` or `failed`. A fatal
process exit leaves the lease to expire, enabling the next hourly recovery.

## Behavior Matrix

| Due stores | Daily lease | Result |
| --- | --- | --- |
| none | unavailable/completed | prior early exit remains |
| one or more | unavailable/completed | store-local work only |
| none | acquired | platform daily suite only |
| one or more | acquired | store-local work plus one platform daily suite |

Every skipped platform task still appears in the run log with
`reason: daily_cadence`. Feature-disabled tasks use
`reason: feature_disabled`.

Special Menu marker recovery is deliberately not in the daily platform set. It
iterates `storeIds`, so it remains attached to every due-store cohort and uses
`no_due_stores` only for a lease-only run. Precise Special Menu transitions
continue through the existing two-minute maintenance task.

## Operation Effect

Normal steady state adds at most one small transactional state read per hourly
scheduler invocation plus the daily lease acquisition/completion writes. It
removes repeat full-platform scans/writes/provider checks from every populated
timezone hour.

The change does not alter task internals, document schemas, store selection,
analytics settlement, decision scoring, public cache invalidation, notification
idempotency, Special Menu transition transactions, or failure codes.

## Index Manifest Deduplication

The closeout also removes six exact duplicate composite definitions from
`firestore.indexes.json` and one from
`firestore-answerlattice.indexes.json`. One byte-equivalent definition remains
for every affected query shape. No unique composite, field override, TTL
policy, rule, Storage rule, query, or document shape changed.
