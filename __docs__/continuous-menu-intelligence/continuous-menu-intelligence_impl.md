# Continuous Menu Intelligence — Implementation

**Last verified:** July 21, 2026
**Authority:** Current codebase.

**Launch boundary:** Not current launch certification or deploy approval. This implementation is local source evidence only; release still requires current production-readiness audit and External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:agent-readiness`, scoped Functions deploy evidence for the scheduler bundle, runtime smoke, downstream-consumer certification, and production-host smoke.

Current retry evidence must use `npm run verify:functions-deploy-preflight` before the scoped `menulist-qa` Firebase Functions target. Broad package deploy commands are not approved by this document.

## Components

| Layer | Source | Responsibility |
| --- | --- | --- |
| Analytics input | `functions/src/intelligence/shared/analyticsAggregator.ts` | Strictly projects one identity/date-bound compact 7-day snapshot or returns empty/stale |
| Item extraction | `functions/src/intelligence/shared/itemExtractor.ts` | Current active catalog, aliases, bounded normalized fields |
| Computation | `functions/src/intelligence/menuIntelligence.ts` | Confidence, private priority, time/suppression observations, calibration, health, audit |
| Scheduling/write | `functions/src/decisionBlocksScoring.ts` | Due-store iteration and delegation to the transactional projector/write boundary |
| Reserved app types | `src/types/intelligence.ts` | Future DTO/helper types; not a persisted-document input |
| DAL | `src/lib/intelligence/dal.ts` | No Firestore read; uncertified app/owner/public helpers remain neutral |

## Document path

`menuIntelligence/{tId}_{sId}_{projectId}`

The document contains complete current maps for item confidence, priority, prior ranks, suppression observations, and time eligibility. `computeAndPersistMenuIntelligence()` reads, projects, computes and calls `transaction.set()` without merge in one transaction. Complete replacement prevents deleted nested keys from surviving, while Firestore retry prevents scheduled/manual last-writer loss.

`firestore.indexes.json` enables an unindexed TTL policy on `menuIntelligence.validUntil`. The scheduler refreshes this timestamp only after a successful replacement; when a project becomes empty or computation stops, the last private projection expires and is eligible for managed deletion instead of persisting indefinitely.

`computeIntelligenceState()` is exported for focused reuse/testing, so it repeats the prior-state projector for any non-null argument and binds that state to the exact computation identity. A typed direct caller cannot bypass the same runtime contract enforced by the transaction reader.

`getMenuIntelligenceDocumentId()` runs before the Admin diagnostic or transaction constructs a Firestore reference. It admits canonical positive tenant/store IDs, a slash-free project segment and a composite ID within the Firestore byte boundary, yielding the stable CMI identity error instead of an SDK path error.

Current IDs and aliases must pass the shared dynamic-key guard before derived scoring. The guard rejects JavaScript prototype-sensitive keys, control characters, whitespace variants and IDs over 512 characters. `computeIntelligenceState()` repeats this admission check so a direct typed caller cannot bypass extraction. Rejection affects only private derived scoring; it never mutates or hides canonical menu truth.

Dashboard settlement writes the compact analytics document through `writeIntelligence7dSnapshot()` as a complete replacement, not a merge, so stale nested item/hour keys and unknown legacy fields are pruned. The snapshot then passes a runtime projector before either Decision Blocks or CMI consumes it. Identity, writer kind, exact seven-day range, requested settled date, totals, days-with-data, item keys, counters, hour keys and names are bounded. Cross-scope, future, impossible or malformed snapshots become the existing `missing_or_stale` empty input instead of influencing public candidates or private state.

## Distinct-date progression

`analytics.lastSettledLocalDate` controls maturity:

- a new settled date advances `daysSinceCreation` (legacy field name), confidence stable days, trust-build clamping, top-item days, transition logs, suppression detection, and calibration;
- a same-date manual rerun increments only operational `runCount` and refreshes the projection TTL/timestamp; and
- an older/backdated rerun throws `menu_intelligence_out_of_order_analytics` before computation/write;
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

Health metadata records volatility, maximum rank shift, average priority, low-data state, and top-item continuity. Equal priorities use a binary item-ID tie-break instead of catalog insertion order. This is a determinism rule, not a promise that rank movement is capped. Same-date reruns do not advance top-item days, and an empty project never accrues a top-item day.

The exported computation reprojects typed analytics, extracted items, and persisted state at its own boundary. It computes only from those normalized return values, so a future direct caller cannot bypass the current compact-snapshot/catalog path or influence state through inherited object-map values. The persisted-state projector rejects contradictory reversal/timestamp, calibration-lock, stability-reason, view-coverage, and rank-one/top-item combinations before any prior state is used. Enum/discriminator fields require an exact primitive string and never use `String(value)` coercion. Reserved app presentation constants expose only the two thresholds the neutral helper actually consumes; they do not advertise scheduler movement limits that are not implemented.

## Request-local audit context

`createAuditLogRunContext()` returns a correlation ID, run number, and source that is passed into one computation. No mutable module-global run context is used, preventing concurrent calls from leaking audit attribution.

## Scheduling and flags

- `computeDecisionBlocksScores`: hourly trigger, due stores only, source `nightly_job`.
- `triggerStoreNightlyScheduler`: one-store current-platform recovery, source `manual_trigger`.
- `FUNCTION_FLAGS.ENABLE_CONTINUOUS_MENU_INTELLIGENCE`: controls Functions state writes without disabling shared analytics settlement.
- `FEATURE_FLAGS.ENABLE_CONTINUOUS_MENU_INTELLIGENCE`: controls DAL consumption.

Decision Blocks scoring is separately gated and can run without CMI; CMI can write its private state without a Decision Blocks projection.

## DAL behavior

`getMenuIntelligence()` performs no Firestore read and returns `null`. Presentation, confidence, validity and priority helpers therefore remain neutral/empty. Firestore permits a platform claim to inspect the raw document through separately authorized tooling, but the application DAL does not expose that path. Any future platform, owner, GrowthOS, campaign or screen consumer requires a separately certified allowlisted DTO, cost and authorization boundary; the current public menu does not read this collection.

## Verification

- `npm run test:decision-intelligence-boundary`
- `npm run test:menu-intelligence:transaction`
- `npm run test:menu-intelligence:rules`
- `npm run test:intelligence-snapshot:replacement`
- `node scripts/verification/verify-decision-intelligence-boundary.js`
- `npm --prefix functions run build`
- current checks recorded in `../decision-intelligence/decision-intelligence_verification-2026-07-16.md`

Historical implementation document: `_archive/pre-2026-07-16/continuous-menu-intelligence_impl.md`.
