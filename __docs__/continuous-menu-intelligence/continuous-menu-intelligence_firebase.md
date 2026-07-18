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
| Read existing intelligence | `menuIntelligence/{tId}_{sId}_{projectId}` | Per active project with items when CMI is enabled | 1 per active project | 1 | Used for distinct-date progression, run count, dampening, calibration, and comparison. |
| Owner/client read intelligence | `menuIntelligence/{tId}_{sId}_{projectId}` | DAL consumers | On demand | 1 | `getMenuIntelligence()` reads one document; downstream use remains queued for separate feature certification. |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Notes |
| --------- | ---------- | ------- | --------- | ------------ | ----- |
| Write Decision Blocks projection | `projects/{tId}/{sId}/{projectId}.publicDecisionBlocks` | After scoring | Per active project with scored items | 1 project merge | Customer-safe projection embedded in the already-loaded project doc; no active `decisionBlocks` collection dependency. |
| Write intelligence results | `menuIntelligence/{tId}_{sId}_{projectId}` | After CMI computation when enabled | Per active project with items | 1 full replacement | Replaces the complete scheduler-owned projection so removed item keys do not remain in nested maps. |
| Write scheduler run log | `schedulerRunLogs/{autoId}` | Scheduler complete | 1 per run | 1 | Platform-only read model for scheduler monitoring with configured retention. |

### Deletes

Scheduler run logs are deleted after their configured retention window. Intelligence and projections are overwritten.

---

## Cloud Functions

| Function | Trigger | Frequency | Notes |
| -------- | ------- | --------- | ----- |
| `computeDecisionBlocksScores` | Scheduled (`30 * * * *`, UTC) | Hourly trigger; only due stores are processed | Uses `storesSummary`, project summaries, compact analytics snapshots, and writes project-embedded Decision Blocks plus `menuIntelligence`. |
| `triggerStoreNightlyScheduler` | Callable | Current active platform-owner action only; one store | Reuses the same store-local path and compact analytics snapshot. `triggerDecisionBlocksScoring` is Decision Blocks-only. |

---

## Cost Optimization Notes

- **Single scheduler:** Decision Blocks and CMI share store/project iteration and analytics input.
- **Compact input:** CMI consumes `*_intelligence_7d`; stale/missing snapshots result in empty analytics rather than broad reads.
- **Project summary first:** Active projects are resolved from `platformSummary/projects_{sId}` before nested project doc reads.
- **Valid empty summary:** A current summary with zero active projects returns empty without opening the nested project collection.
- **No unused high-cardinality indexes:** Runtime access is exact-document only. `itemConfidence`, `itemPriority`, `previousItemRanks`, `suppressionWindows`, `timeEligibility`, and `recentAuditLog` are therefore exempt from automatic single-field indexing. The stored state and nightly write count are unchanged, while index-entry fanout and index storage fall with menu size.
- **Independent feature gate:** `ENABLE_CONTINUOUS_MENU_INTELLIGENCE=false` skips prior-state reads and writes while shared analytics settlement continues.
- **Bounded document growth:** Full replacement prunes deleted item keys; the recent audit log remains capped at 50 entries.
- **No public CMI read:** Public menu rendering uses `project.publicDecisionBlocks` from the project document already loaded by the public route.
- **Client DAL is direct-doc only:** `getMenuIntelligence()` is one document read when a server/client consumer explicitly needs it.

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
| `fetchCurrentIntelligence` | `functions/src/intelligence/menuIntelligence.ts` | Admin SDK direct-doc read |
| `getMenuIntelligence` | `src/lib/intelligence/dal.ts` | Client SDK direct-doc read |
| `getItemPresentation` | `src/lib/intelligence/dal.ts` | Reads intelligence and returns `visible: true` priority metadata |
| `getItemsByPriority` | `src/lib/intelligence/dal.ts` | Reads intelligence and sorts items by priority without hiding |
