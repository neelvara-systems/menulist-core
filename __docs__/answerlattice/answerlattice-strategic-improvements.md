# Answerlattice — Strategic Improvement Report

> **Date:** 2026-03-03 (updated after implementation session)
> **Scope:** Infrastructure-grade improvements for SMB SaaS ICP
> **Source:** Forensic code audit findings + architecture analysis
> **Rule:** No generic SaaS suggestions. Only high-leverage infrastructure moves.
> **Status:** 13 of 18 improvements implemented. 5 deferred (UI/analytics).

---

## 1. Gaps for SMB SaaS ICP

| Gap                                           | Impact                                                      | Why It Matters for SMB                                       |
| --------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| No nightly scheduler CF wired                 | Drift detection and mutation engine are manual-only         | SMB owners won't run governance manually — must be automatic |
| No tenant discovery for batch ops             | Cannot run drift/mutation across all tenants                | Platform-wide health requires automated tenant enumeration   |
| No canonical coverage dashboard               | No visibility into what % of queries hit canonical vs RAG   | SMB success metric invisible — can't prove value             |
| No mutation approval UI                       | Proposals exist in Firestore but no admin can review them   | The human-in-the-loop governance loop is broken without UI   |
| Entity extraction not wired to any UI trigger | `extractEntitiesFromArticles` exists but no button calls it | Ontology bootstrap requires manual code execution            |

---

## 2. Missing Leverage Opportunities

### 2.1 Canonical Coverage KPI (Must Build)

The doctrine declares "Canonical coverage is KPI" but there's no tracking mechanism.

**Recommendation:** The `search-kb` route already logs `CANONICAL_HIT` and `CANONICAL_MISS`. Add a lightweight daily aggregation:

- Count hits vs misses per tenant per day
- Store in `platformSummary/answerlattice_{sId}` (existing summary doc pattern)
- Expose via existing analytics hooks
- Cost: 1 read + 1 write per tenant per day

### 2.2 Recurring Fallback → Auto MutationProposal (Should Build)

Doctrine says: "If recurring fallback → auto-generate MutationProposal." Currently, `CANONICAL_MISS` is only logged — no one reads the logs to generate proposals.

**Recommendation:** In the nightly scheduler, query `CANONICAL_MISS` logs, cluster by `matchedEntities`, and auto-generate `new_answer_required` proposals for entities that get 5+ misses in 14 days.

### 2.3 Post-Mutation Impact Tracking (Should Build)

Doctrine says: "Post-mutation impact tracked (14-day window)." Not implemented.

**Recommendation:** When a mutation is marked `implemented`, record `implementedAt` timestamp. After 14 days, compare signal counts for that entity before/after. Store delta on the proposal doc. Zero extra reads — just a scheduled comparison.

---

## 3. Signal Quality Improvements

| Improvement                                   | Priority     | Rationale                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Resolve `unresolved` entityIds on signals** | Must Build   | Currently signals from tickets/chat default to `entityId: 'unresolved'`. The mutation engine clusters by entityId — unresolved signals are useless noise. Add a lightweight entity-matching pass during nightly batch that attempts to resolve entity from signal metadata. |
| **Add signal deduplication**                  | Should Build | If a user submits negative feedback on the same chat session twice, two signals are emitted. Add `metadata.sessionId + messageId` dedup check in `addSignalEvent`.                                                                                                          |
| **Weight escalation signals higher**          | Nice to Have | Currently all signal types count equally in clustering. Escalations should have 3x weight — they indicate the most severe knowledge gap.                                                                                                                                    |

---

## 4. Governance UX Improvements

| Improvement                                                                                                                                                                       | Priority     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **Mutation proposal review queue** — Simple list page showing pending proposals with approve/reject buttons                                                                       | Must Build   |
| **Drift dashboard** — Show drifted answers count per entity with drill-down                                                                                                       | Should Build |
| **Entity health score** — Composite: signal rate + drift status + answer coverage                                                                                                 | Should Build |
| **One-click entity promotion from candidates** — Implemented through the server-owned `promoteCandidate` ontology action, which creates the entity and search-index state transactionally. `approveCandidateStatus` remains only as a compatibility alias. | Shipped |

---

## 5. Drift Optimization Ideas

| Idea                                              | Impact                                                                                                                                            | Complexity                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Skip signal drift for entities with 0 signals** | Eliminates unnecessary `getSignalCountsForEntity` calls for quiet entities                                                                        | Low — add early return in drift loop                                      |
| **Batch signal count queries**                    | Currently fetches signal counts per-entity in a loop (N reads). Could batch with `in` query for up to 30 entities                                 | Medium — reduces reads by 10-30x for large tenants                        |
| **Cache entity list during drift evaluation**     | `evaluateDriftForTenant` already loads all entities once. But `evaluateOrphanDrift` creates a new Map per answer. Move Map creation outside loop. | Low — already partially done (Map is per-answer but entities loaded once) |

---

## 6. Cost Optimization Ideas

| Optimization                                                 | Savings                                                                                                                                                     | Effort                                                               |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------ |
| **Batch `getActiveAnswersForEntity` calls in retrieval**     | Currently 3 sequential reads for top-3 entities. Use `Promise.all` for parallel reads.                                                                      | ~40% latency reduction on retrieval. Zero cost change but better UX. | Low    |
| **Add `getCanonicalAnswers` result caching in drift engine** | Drift engine calls `getCanonicalAnswers(tId, sId)` once but then calls `getActiveAnswersForEntity` per entity in mutation engine. Reuse the loaded answers. | Eliminates ~10 redundant reads per nightly run per tenant.           | Low    |
| **TTL on signal events**                                     | Doctrine says "Archive events > 12 months" but no TTL implemented. Use Firestore TTL policies to auto-delete old signals.                                   | Prevents signal collection from growing unbounded.                   | Medium |

---

## 7. Observability Improvements

| Improvement                                     | Priority                                                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Structured logging for drift engine results** | Must Build — Currently drift results are returned but not logged. Add audit log entry for each nightly drift run summary.           |
| **Mutation engine run summary logging**         | Must Build — `runSignalMutationEngine` returns `MutationEngineResult` but caller must log it. Add auto-logging inside the function. |
| **Canonical retrieval latency tracking**        | Already Done — `search-kb` route logs `canonicalRetrievalMs` in perf metrics.                                                       |
| **Feature flag state logging on activation**    | Should Build — When flags are toggled, log the event for debugging.                                                                 |

---

## 8. Defensibility Enhancers

| Enhancement                                 | Moat Value                                                                             | Priority                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Entity relationship graph visualization** | Shows knowledge structure depth — competitors can't replicate without the ontology     | Should Build                                                            |
| **Canonical answer version history**        | Full audit trail of how answers evolved — proves governance rigor                      | Should Build (partial — audit logs exist but no answer-level changelog) |
| **Cross-entity drift propagation**          | When entity A drifts, check if related entities (via relations) should also be flagged | Nice to Have                                                            |
| **Ontology export format**                  | Standardized entity graph export (JSON-LD or similar) for portability claims           | Do Not Build (premature — no external consumers yet)                    |

---

## 9. Moat-Building Extensions

| Extension                                                                                                                        | Category                | Priority           |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------ |
| **Canonical answer embedding** — Generate embeddings for canonical answers to enable hybrid retrieval (deterministic + semantic) | Retrieval quality       | Should Build Later |
| **Signal-to-entity auto-resolution** — Use entity search index to auto-resolve `unresolved` entityIds on incoming signals        | Signal quality          | Must Build         |
| **Multi-language canonical answers** — Leverage existing `next-intl` infrastructure for answer content                           | Market expansion        | Nice to Have       |
| **Answer usage analytics** — Track which canonical answers are served most, least, never                                         | Governance intelligence | Should Build       |
| **Confidence score auto-adjustment** — After 30 days of serving an answer with 0 negative signals, auto-increase confidence      | Self-improvement        | Nice to Have       |

---

## 10. Priority Classification

### ✅ Completed (Built 2026-03-03)

1. ✅ Nightly scheduler CF — 7-step batch wired into `decisionBlocksScoring.ts`
2. ✅ Signal entity auto-resolution — `resolveUnresolvedSignals()` in nightly
3. ✅ One-click entity creation — `promoteCandidate()` in `entityCandidates.ts`
4. ✅ Mutation proposal review UI — `MutationProposalReview.tsx` + hook
5. ✅ Canonical coverage KPI — `aggregateCoverageKPI()` → `platformSummary/answerlattice_{sId}`
6. ✅ Recurring fallback → auto MutationProposal — `detectRecurringFallbacks()`
7. ✅ Post-mutation impact tracking — `trackMutationImpact()` (14-day window)
8. ✅ Parallel retrieval reads — `Promise.all` in `canonicalRetrieval.ts`
9. ✅ Signal deduplication — in-memory Set in `signalEmitter.ts`
10. ✅ Confidence score auto-adjustment — `autoAdjustConfidence()` in nightly
11. ✅ All unbounded queries capped with `limit()`
12. ✅ CF feature flag `ENABLE_ANSWERLATTICE_NIGHTLY` added
13. ✅ Master Execution Prompt STEP 9B — Answerlattice completion rules

### Remaining (Post-Activation, Within 3 Months) — ALL COMPLETE

1. ✅ Drift dashboard — DriftDashboard.tsx (Phase 3, 2026-03-07)
2. ✅ Entity health score — EntityHealthScore.tsx (Phase 3, 2026-03-07)
3. ✅ Batch signal count queries — getBatchSignalCounts() in signalEvents.ts (Phase 4, 2026-03-07)
4. ✅ Answer usage analytics — AnswerUsageAnalytics.tsx (Phase 3, 2026-03-07)
5. ✅ Canonical answer version history — AnswerVersionHistory.tsx + getAnswerVersionHistory() (Phase 4, 2026-03-07)

### Do Not Build

1. Ontology export format (no external consumers)
2. LLM-based drift detection (violates doctrine — must be deterministic)
3. Auto-approval of mutation proposals (violates human-in-the-loop invariant)
4. Real-time drift detection (nightly batch is sufficient for SMB scale)
5. Embedding-based entity matching as primary (deterministic index is primary per doctrine)
6. Escalation signal weighting (no escalation flow exists yet)
7. Cross-entity drift propagation (premature — basic drift not proven)
8. Multi-language canonical answers (English KB only today)
9. Entity relationship graph visualization (developer tool, not SMB ICP tool)

---

## Version History

| Date       | Change                                                              |
| ---------- | ------------------------------------------------------------------- |
| 2026-03-03 | Initial strategic improvement report from forensic audit            |
| 2026-03-07 | All 5 Remaining items completed in Phase 3 + Phase 4 implementation |
