# Firebase Scale And Cost Closeout - Specification

**Status:** Local source complete
**Last verified:** July 17, 2026

## Goal

Keep Firebase operation growth proportional to real owner/customer work while
preserving security, public truth, billing, AI accounting, realtime progress,
and product separation.

## Invariants

1. Store-local EOD work, including Special Menu marker recovery, follows store
   timezone/business-day settings.
2. Platform-wide nightly work succeeds at most once per UTC day.
3. Concurrent scheduler instances cannot both own the platform daily suite.
4. A failed suite is retryable after a bounded delay; a running lease expires.
5. A day with no store due can still run the platform daily suite.
6. Denormalized summaries never become identity, authorization, or public
   membership authority.
7. Every growing list/query has an explicit bound, cursor, aggregate, compact
   read model, or documented functional exception.
8. Realtime is retained only for active jobs, opened conversations, update
   signals, and always-on displays that require freshness.
9. High-cardinality maps and TTL fields remain unindexed unless queried.
10. MenuList, Answerlattice, CampaignCue, and SignalDesk retain separate
    deployment/rule/index/Functions boundaries.

## Acceptance Criteria

- the source verifier and lease emulator pass;
- all four index manifests contain no exact duplicate definitions;
- current usage-map risk bands do not silently grow;
- the platform daily suite is transactionally claimed and completed;
- daily-cadence skips are visible in scheduler task results;
- Functions build/lint and root typecheck pass;
- no existing feature verifier regresses; and
- Firebase release work is recorded separately from local source completion.
