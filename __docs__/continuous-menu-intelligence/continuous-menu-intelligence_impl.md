# Continuous Menu Intelligence — Implementation

**Last verified:** July 16, 2026
**Authority:** Current codebase.

**Launch boundary:** Not current launch certification or deploy approval. This implementation is local source evidence only; release still requires current production-readiness audit and External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:agent-readiness`, scoped Functions deploy evidence for the scheduler bundle, runtime smoke, downstream-consumer certification, and production-host smoke.

Current retry evidence must use `npm run verify:functions-deploy-preflight` before the scoped `menulist-qa` Firebase Functions target. Broad package deploy commands are not approved by this document.

## Components

| Layer | Source | Responsibility |
| --- | --- | --- |
| Analytics input | `functions/src/intelligence/shared/analyticsAggregator.ts` | Reads one current compact 7-day snapshot or returns empty/stale |
| Item extraction | `functions/src/intelligence/shared/itemExtractor.ts` | Current active catalog, aliases, bounded normalized fields |
| Computation | `functions/src/intelligence/menuIntelligence.ts` | Confidence, private priority, time/suppression observations, calibration, health, audit |
| Scheduling/write | `functions/src/decisionBlocksScoring.ts` | Due-store iteration, prior-state read, complete replacement write |
| Shared app types | `src/types/intelligence.ts` | Client-side date representation |
| DAL | `src/lib/intelligence/dal.ts` | One direct-document read and neutral expired/disabled behavior |

## Document path

`menuIntelligence/{tId}_{sId}_{projectId}`

The document contains complete current maps for item confidence, priority, prior ranks, suppression observations, and time eligibility. `.set(intelligence)` intentionally replaces the projection; `{ merge: true }` is not used because it can retain deleted nested keys.

## Distinct-date progression

`analytics.lastSettledLocalDate` controls maturity:

- a new settled date advances `daysSinceCreation` (legacy field name), confidence stable days, trust-build clamping, top-item days, transition logs, suppression detection, and calibration;
- a same-date manual rerun increments only operational `runCount` and refreshes the projection TTL/timestamp; and
- a missing/stale analytics snapshot does not age the model.

`lastAnalyticsDate` persists the last date used for progression. Existing legacy documents without this field migrate naturally on the first current settled snapshot.

## Confidence

Confidence is bounded `0..1` from views, clicks/views engagement, recommendation clicks, bounded owner boost, and current owner bestseller flag. It is private metadata, not a customer claim.

- 50+ views and 15%+ engagement starts at `0.8`.
- 20+ views and 10%+ starts at `0.65`.
- 10+ views starts at `0.5`.
- Lower data starts at `0.4`.
- Positive movement is capped at `+0.05` per new settled date.
- Negative movement is applied on the new settled date.

## Time observations

Hourly clicks are grouped into breakfast, lunch, dinner, and late-night slots. A slot needs at least 10% of recorded slot clicks to be marked eligible. With no hourly data all slots remain neutral/eligible.

Time eligibility is stored only as metadata. `computeItemPriority()` does not apply a Function-runtime-hour penalty because the scheduler runtime hour is not reliable store-local presentation context.

## Suppression observations

Active suppression windows are retained until expiry. A new fatigue observation requires:

- at least five stable settled days before the current date; and
- a falling confidence trend on the new settled date.

The previous stable streak is used because the falling calculation resets the new `stableDays` counter. Low-confidence observations use a one-day window. Suppression reduces private priority only; it never hides canonical menu truth.

## Priority and health

Priority is bounded `0.1..1`, dampened `70%` previous plus `30%` new, and ignores changes below `0.05`. Low-data/stability mode produces neutral `0.5` priorities. Current-item merged clicks provide recency input, so deleted analytics IDs cannot bias the average.

Health metadata records volatility, maximum rank shift, average priority, low-data state, and top-item continuity. Same-date reruns do not advance top-item days.

## Request-local audit context

`createAuditLogRunContext()` returns a correlation ID, run number, and source that is passed into one computation. No mutable module-global run context is used, preventing concurrent calls from leaking audit attribution.

## Scheduling and flags

- `computeDecisionBlocksScores`: hourly trigger, due stores only, source `nightly_job`.
- `triggerStoreNightlyScheduler`: one-store current-platform recovery, source `manual_trigger`.
- `FUNCTION_FLAGS.ENABLE_CONTINUOUS_MENU_INTELLIGENCE`: controls Functions state writes without disabling shared analytics settlement.
- `FEATURE_FLAGS.ENABLE_CONTINUOUS_MENU_INTELLIGENCE`: controls DAL consumption.

Decision Blocks scoring is separately gated and can run without CMI; CMI can write its private state without a Decision Blocks projection.

## DAL behavior

`getMenuIntelligence()` returns `null` when the client flag is disabled or the document is absent. Presentation and priority helpers return neutral/empty output when `validUntil` has passed. The current public menu does not read this collection.

## Verification

- `npm run test:decision-intelligence-boundary`
- `node scripts/verification/verify-decision-intelligence-boundary.js`
- `npm --prefix functions run build`
- current checks recorded in `../decision-intelligence/decision-intelligence_verification-2026-07-16.md`

Historical implementation document: `_archive/pre-2026-07-16/continuous-menu-intelligence_impl.md`.
