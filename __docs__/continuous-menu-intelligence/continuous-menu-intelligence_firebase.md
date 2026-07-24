# Continuous Menu Intelligence — Firebase Cost Tracking

**Feature:** Menu Behavioral Observation Layer (Two-Layer Architecture)
**Status:** Private source layer local-complete; Firebase QA deployment and downstream certification pending
**Last Updated:** July 17, 2026
**Priority:** HIGH — Unified scheduler reads project data and compact analytics snapshots, then writes Decision Blocks and Menu Intelligence.

> **Launch boundary:** Not current launch certification or deploy approval. This Firebase cost doc is source-gated scheduler/cost evidence only; CMI release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:agent-readiness`, scoped Functions deploy evidence for `computeDecisionBlocksScores` and related scheduler triggers, runtime/provider smoke where relevant, downstream consumer certification, and production-host smoke.

> Autonomous action observations are computed and logged, but MenuList uses CMI as an observation and priority layer. Optimization actions remain GrowthOS-deferred.

---

## Summary

- **Collections Used:** `analytics`, `projects/{tId}/{sId}/{projectId}`, `menuIntelligence`, `platformSummary`, `schedulerRunLogs`
- **Storage Buckets:** None
- **Cloud Functions:** `computeDecisionBlocksScores` (hourly trigger; processes only stores whose local settlement window is due)
- **Manual Recovery:** `triggerStoreNightlyScheduler` (current-platform, one-store callable)
- **Estimated Monthly Cost:** Medium, linear in active project count.

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Notes |
| --------- | ---------- | ------- | --------- | --------- | ----- |
| Read store summary | `platformSummary/storesSummary` | Scheduler invocation | 1 per invocation | 1 | Filters stores by local settlement window and active status. |
| Read active project summary | `platformSummary/projects_{sId}` | Per due store | 1 per store | 1 | Resolves active project IDs without scanning the full nested project collection. |
| Read project data | `projects/{tId}/{sId}/{projectId}` | Per active project | 1 per active project | 1 | Required for item extraction and public Decision Blocks projection. |
| Read compact analytics snapshot | `analytics/{tId}_{sId}_{projectId}_intelligence_7d` | Per active project | 1 per active project | 1 | Missing/stale snapshots return empty analytics instead of a daily-doc range query. |
| Transaction-read existing intelligence | `menuIntelligence/{tId}_{sId}_{projectId}` | Per active project with items when CMI is enabled | 1 per active project | 1 per transaction attempt | Strictly projected before distinct-date progression, run count, dampening, calibration, and comparison; malformed state aborts without overwrite. `validUntil` is an unindexed TTL field. |
| App/DAL intelligence read | `menuIntelligence/{tId}_{sId}_{projectId}` | Current application runtime | On demand | 0 | No app/owner/public consumer is certified; the app DAL is neutral and imports no Firestore reader. Platform-only rules still permit separately authorized diagnostic tooling. |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Notes |
| --------- | ---------- | ------- | --------- | ------------ | ----- |
| Write Decision Blocks projection | `projects/{tId}/{sId}/{projectId}.publicDecisionBlocks` | After scoring | Per active project with scored items | 1 project merge | Customer-safe projection embedded in the already-loaded project doc; no active `decisionBlocks` collection dependency. |
| Write intelligence results | `menuIntelligence/{tId}_{sId}_{projectId}` | Transactional CMI computation when enabled | Per active project with items | 1 full replacement per committed transaction | Reads, projects, computes and replaces atomically so removed keys are pruned and overlapping scheduled/manual runs retry against current truth. |
| Write scheduler run log | `schedulerRunLogs/{autoId}` | Scheduler complete | 1 per run | 1 | Platform-only read model for scheduler monitoring with configured retention. |

### Deletes

Scheduler run logs are deleted after their configured retention window. Current intelligence is overwritten while active; `menuIntelligence.validUntil` has a Firestore TTL policy so expired private projections are eligible for managed deletion, including after a project becomes empty and stops producing replacement state.

---

## Cloud Functions

| Function | Trigger | Frequency | Notes |
| -------- | ------- | --------- | ----- |
| `computeDecisionBlocksScores` | Scheduled (`30 * * * *`, UTC) | Hourly trigger; only due stores are processed | Uses `storesSummary`, project summaries, compact analytics snapshots, and writes project-embedded Decision Blocks plus `menuIntelligence`. |
| `triggerStoreNightlyScheduler` | Callable | Current active platform-owner action only; one store | Reuses the same store-local path and compact analytics snapshot. `triggerDecisionBlocksScoring` is Decision Blocks-only. |

---

## Cost Optimization Notes

- **Single scheduler:** Decision Blocks and CMI share store/project iteration and analytics input.
- **Compact input:** CMI consumes only an identity/kind/date/range/counter/map-projected `*_intelligence_7d`; stale, missing, cross-scope or malformed snapshots result in empty analytics rather than broad reads.
- **Complete compact writer:** Dashboard settlement exact-replaces `*_intelligence_7d`; merge semantics are forbidden because they retain omitted nested item/hour keys and unknown legacy fields.
- **Project summary first:** Active projects are resolved from `platformSummary/projects_{sId}` before nested project doc reads.
- **Valid empty summary:** A current summary with zero active projects returns empty without opening the nested project collection.
- **No unused high-cardinality indexes:** Runtime access is exact-document only. `itemConfidence`, `itemPriority`, `previousItemRanks`, `suppressionWindows`, `timeEligibility`, and `recentAuditLog` are therefore exempt from automatic single-field indexing. The stored state and nightly write count are unchanged, while index-entry fanout and index storage fall with menu size.
- **Independent feature gate:** `ENABLE_CONTINUOUS_MENU_INTELLIGENCE=false` skips prior-state reads and writes while shared analytics settlement continues.
- **Bounded document growth:** Full replacement prunes deleted item keys; the recent audit log remains capped at 50 entries.
- **Managed expiry:** `menuIntelligence.validUntil` is an unindexed TTL field. Firestore TTL deletion is asynchronous and billed as a document delete; it prevents invalid private projections from becoming permanent orphaned storage.
- **No public CMI read:** Public menu rendering uses `project.publicDecisionBlocks` from the project document already loaded by the public route.
- **No application CMI read:** `getMenuIntelligence()` returns `null` and performs zero Firestore operations. Platform-only rule access is reserved for separately authorized diagnostic tooling.

### Cost Warnings

- Cost scales with active stores and active projects.
- `menuIntelligence` client/DAL reads should not be added to public menu page loads without a separate cost review.
- Downstream GrowthOS/screen consumers need their own certification before they are treated as production-ready CMI outputs.

---

## Cost Estimate (per 1000 active projects)

| Resource | Operations/month | Unit Cost | Monthly Cost |
| -------- | ---------------- | --------- | ------------ |
| Project reads | 30,000 | $0.06/100K | ~$0.02 |
| Analytics snapshot reads | 30,000 | $0.06/100K | ~$0.02 |
| Existing intelligence reads | up to 30,000 | $0.06/100K | ~$0.02 |
| Decision Blocks project merges | 30,000 | $0.18/100K | ~$0.05 |
| Intelligence writes | 30,000 | $0.18/100K | ~$0.05 |
| Scheduler run logs | ~720/month | $0.18/100K | <$0.01 |
| **Total** | | | **~$0.16/month plus Cloud Functions compute** |

Store summary and active-project summary reads add a small fixed/linear overhead by store count and are intentionally used to avoid broad scans.

---

## DAL Functions Used

| Function | File | Operation Type |
| -------- | ---- | -------------- |
| `fetch7DayAnalytics` | `functions/src/intelligence/shared/analyticsAggregator.ts` | Admin SDK direct-doc read |
| `extractActiveItems` | `functions/src/intelligence/shared/itemExtractor.ts` | Pure computation |
| `computeIntelligenceState` | `functions/src/intelligence/menuIntelligence.ts` | Pure computation |
| `computeAndPersistMenuIntelligence` | `functions/src/intelligence/menuIntelligence.ts` | Admin SDK transaction read plus exact replacement write |
| `fetchCurrentIntelligence` | `functions/src/intelligence/menuIntelligence.ts` | Strict Admin SDK diagnostic/direct-doc read |
| `getMenuIntelligence` | `src/lib/intelligence/dal.ts` | Neutral return; no Firestore operation |
| `getItemPresentation` | `src/lib/intelligence/dal.ts` | Neutral public-safe presentation because no app reader is certified |
| `getItemsByPriority` | `src/lib/intelligence/dal.ts` | Empty result because no app reader is certified |
