# Continuous Menu Intelligence — Product Specification

**Last verified:** July 16, 2026
**Status:** Private observation/read-model layer; local source-complete for the audited feature. Firebase QA deployment and downstream-consumer certification remain pending.

## Purpose

Continuous Menu Intelligence (CMI) stores bounded, private observations from settled customer-menu interactions. It does not alter the canonical menu, hide an item, change the public menu order, or expose scores to owners or customers.

MenuList owns observation. Any future autonomous optimization or public ranking requires a separate product decision and certification.

## Current inputs

- Current active items from `projects/{tId}/{sId}/{projectId}`
- Compact settled analytics from `analytics/{tId}_{sId}_{projectId}_intelligence_7d`
- Previous private state from `menuIntelligence/{tId}_{sId}_{projectId}`
- Item views, clicks, recommendation clicks, hourly clicks, owner boost, and owner-authored bestseller flag

CMI does not receive POS sales, orders, payments, inventory, ratings, reviews, or per-item impressions. Clicks are an interest signal, not a purchase or conversion.

## Authority boundary

- The current project catalog is authoritative.
- Deleted, inactive, or analytics-only item IDs are excluded.
- Current item aliases may retain earlier analytics continuity.
- Temporary `available` state does not remove an item from private observation; public runtime owns availability.
- The CMI document is a complete scheduler-owned projection and is replaced on write so deleted item keys cannot accumulate.
- Firestore rules allow authorized reads and deny client writes.

## Computation flow

1. The unified scheduler fires hourly at minute 30 and processes due stores in their local settlement window.
2. The scheduler reads the compact 7-day snapshot once per active project.
3. The shared catalog-first extractor creates the current item set.
4. CMI reads the previous state, computes confidence, time-slot observations, suppression observations, bounded priority, calibration, and health metadata.
5. The complete `menuIntelligence` document is replaced.

`triggerStoreNightlyScheduler` runs the same store-level flow for platform recovery. `triggerDecisionBlocksScoring` does not recompute CMI.

## State contract

| Field | Meaning |
| --- | --- |
| `itemConfidence` | Private bounded confidence metadata from current settled inputs |
| `itemPriority` | Private `0.1..1` annotation; never a visibility decision |
| `previousItemRanks` | Internal comparison input for health calculations |
| `suppressionWindows` | Private fatigue/low-confidence observation that can reduce private priority, never hide menu truth |
| `timeEligibility` | Observed click distribution by broad time slot; stored as metadata only |
| `projectCalibration` | Private baseline after 21 distinct settled analytics dates |
| `lastAnalyticsDate` | Last settled analytics date used to advance maturity |
| `daysSinceCreation` | Historical field name; now counts distinct settled analytics dates processed |
| `runCount` | Every computation attempt, including manual recovery |
| `recentAuditLog` | Last 50 bounded internal events |
| `validUntil` | 48-hour read-model TTL |

## Correctness constraints

- Recomputing the same settled analytics date may increment `runCount`, but must not advance confidence, stable days, top-item days, or calibration age.
- Confidence can increase by at most `0.05` per new settled date; decreases can apply immediately on a new settled date.
- Fatigue uses the stable-day streak before a new falling day, because the falling calculation resets the new stable counter.
- A time slot is eligible only when it represents at least 10% of the item's recorded slot clicks. No hourly data means all slots remain neutral/eligible.
- Nightly stored priority is not adjusted using the Cloud Function server hour. Time metadata is retained for a future consumer that has explicit store-local time context.
- Low-data or stability mode uses neutral priority instead of hiding items.
- Client DAL helpers return neutral/empty results when the private state is expired or the app feature flag is disabled.

## Flags

- Functions writes: `FUNCTION_FLAGS.ENABLE_CONTINUOUS_MENU_INTELLIGENCE`
- App DAL reads: `FEATURE_FLAGS.ENABLE_CONTINUOUS_MENU_INTELLIGENCE`

The Decision Blocks projection has its own independent flags and remains the only current customer-facing recommendation source.

## Mobile and owner boundary

CMI has no owner-facing desktop or mobile screen, toggle, score, explanation, or alert. The separate Featured section controls belong to Decision Intelligence and do not edit CMI state.

## Out of scope

- automatic hide, show, reorder, promote, demote, or price changes;
- public or owner-facing confidence and ranking;
- a claim that CMI improves sales, ordering, conversion, or menu performance;
- public menu reads of `menuIntelligence`;
- a new scheduler, event stream, ML service, or per-item document fan-out; and
- GrowthOS, campaigns, or digital-screen behavior without separate end-to-end certification.

## Acceptance checks

- One current project catalog produces one bounded item map.
- Alias analytics merge into the current item; stale IDs are pruned.
- Same-date recovery is idempotent for maturity.
- Fatigue can be reached only after the preceding stable streak and a new falling date.
- Stored priority is independent of Function runtime timezone.
- Expired DAL reads fail neutral.
- Full state replacement removes deleted nested keys.

Historical pre-audit specification: `_archive/pre-2026-07-16/continuous-menu-intelligence_spec.md`.
