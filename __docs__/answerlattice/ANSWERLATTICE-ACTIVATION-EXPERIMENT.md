# Answerlattice — Activation Experiment Framework

> **Purpose:** Define hard success/failure criteria, measurement plan, and activation sequence for Answerlattice's controlled experiment phase.
> **Created:** 2026-03-15
> **Prerequisite:** All infrastructure audited and cleared (see `answerlattice-activation-clearance.md`)
> **Duration:** 4 weeks (2 weeks signal collection + 2 weeks canonical retrieval)

---

## Table of Contents

1. [Experiment Goal](#1-experiment-goal)
2. [Success Metrics (Hard Criteria)](#2-success-metrics-hard-criteria)
3. [What We're Measuring](#3-what-were-measuring)
4. [Measurement Infrastructure](#4-measurement-infrastructure)
5. [Activation Sequence](#5-activation-sequence)
6. [Known Risks & Mitigations](#6-known-risks--mitigations)
7. [Go / No-Go Decision Framework](#7-go--no-go-decision-framework)
8. [Worst-Case Cost Projections](#8-worst-case-cost-projections)
9. [Post-Experiment Actions](#9-post-experiment-actions)

---

## 1. Experiment Goal

**Prove or disprove:** Canonical answers materially outperform RAG responses in accuracy, speed, and user satisfaction for queries that map to product entities.

**Not the goal:** Full Answerlattice rollout, UI, API, or marketing. This is measurement only.

---

## 2. Success Metrics (Hard Criteria)

### Primary Metrics (Must Pass ALL)

| Metric                      | Target                                      | How Measured                                                                | Failure Threshold                            |
| --------------------------- | ------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------- |
| **Canonical Hit Rate**      | ≥ 25% of total queries                      | `CANONICAL_HIT` / total queries in search-kb logs                           | < 15% after 2 weeks                          |
| **Negative Feedback Delta** | ≥ 10% reduction on canonical answers vs RAG | Compare `isGood` rate on `canonical: true` vs `canonical: false` responses  | No measurable improvement                    |
| **Retrieval Latency**       | Canonical ≤ RAG latency                     | `canonicalRetrievalMs` vs `embeddingGeneration + vectorSearch` in perf logs | Canonical > 2x RAG latency                   |
| **Drift Flag Rate**         | < 20% of active canonical answers flagged   | Drifted answers / total active answers after first release                  | > 50% flagged (answers are stale on arrival) |

### Secondary Metrics (Informational, not blocking)

| Metric                            | Expected Range                      | Purpose                          |
| --------------------------------- | ----------------------------------- | -------------------------------- |
| Entity match accuracy             | > 70% of hits map to correct entity | Validates search index quality   |
| Intent classification accuracy    | > 60% correct intent                | Validates rule-based patterns    |
| Mutation proposal acceptance rate | > 40% approved by admin             | Validates signal quality         |
| Signal noise ratio                | < 50% of signals are noise          | Validates entity binding quality |
| Confidence distribution           | > 50% "high" confidence hits        | Validates specificity scoring    |

---

## 3. What We're Measuring

### Phase 1: Signal Collection (Weeks 1-2)

**Flag enabled:** `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION` only

Measuring:

- **Signal volume:** How many signals per day per tenant?
- **Signal type distribution:** Tickets vs chat_negative vs escalation ratio
- **Entity resolution rate:** % of signals that get `entityId: 'unresolved'` vs bound to entity
- **Signal clustering density:** How many clusters form? What's the average cluster size?

**Expected baseline:** This establishes the friction landscape before canonical answers exist.

### Phase 2: Ontology Bootstrap (Week 2, overlapping)

**Flag enabled:** `ENABLE_ANSWERLATTICE_ONTOLOGY`

Measuring:

- **Entity extraction yield:** Entities extracted / articles processed
- **Candidate approval rate:** Approved / total candidates (validates AI extraction quality)
- **Entity coverage:** % of KB articles that map to at least one entity
- **Search index completeness:** Entities with search index entries / total entities

### Phase 3: Canonical Retrieval (Weeks 3-4)

**Flags enabled:** `ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS` + `ENABLE_ANSWERLATTICE_DRIFT_DETECTION`

Measuring:

- **Hit rate:** `CANONICAL_HIT` / (CANONICAL_HIT + CANONICAL_MISS) per day
- **Hit rate trend:** Is hit rate increasing, stable, or declining?
- **Confidence distribution:** % high / medium / low confidence answers returned
- **Fallback reasons:** Distribution of miss reasons (no_entity_match, no_canonical_answers, no_version_match, retrieval_error)
- **User satisfaction delta:** `isGood` rating on canonical vs non-canonical responses
- **Retrieval latency:** `canonicalRetrievalMs` percentiles (p50, p90, p99)
- **Drift detection:** Answers flagged per release activation

---

## 4. Measurement Infrastructure

### Already Built (No Code Needed)

| What                  | Where                                   | Data                                                            |
| --------------------- | --------------------------------------- | --------------------------------------------------------------- |
| `CANONICAL_HIT` logs  | `search-kb/route.ts` → `writeLogEntry`  | query, timing, answerId, confidence, matchedEntities, drifted   |
| `CANONICAL_MISS` logs | `search-kb/route.ts` → `writeLogEntry`  | query, reason, matchedEntities, timing                          |
| Performance metrics   | `search-kb/route.ts` → `perfMetrics`    | canonicalRetrievalMs, embeddingGeneration, vectorSearch, total  |
| Search history        | `aiSearchHistory` collection            | canonical flag, canonicalAnswerId, matchedEntityIds, confidence |
| Signal events         | `answerlattice_signalEvents` collection      | type, entityId, timestamp, metadata                             |
| Audit logs            | `answerlattice_auditLogs` collection         | action, entityType, entityId, timestamps                        |
| Mutation proposals    | `answerlattice_mutationProposals` collection | status transitions (pending → approved/rejected)                |

### What Needs Manual Analysis (No Code — Just Queries)

After each week, run these Firestore queries to extract metrics:

**Week 1-2 Signal Report:**

```
answerlattice_signalEvents WHERE timestamp >= [week_start]
→ Count by type
→ Count by entityId (identify 'unresolved' rate)
→ Count unique tId+sId pairs
```

**Week 3-4 Hit Rate Report:**

```
From perf logs: count CANONICAL_HIT vs CANONICAL_MISS per day
From aiSearchHistory: compare isGood rate WHERE canonical=true vs canonical=false
From answerlattice_canonicalAnswers: count WHERE governance.driftFlag=true
```

### Future Improvement (Sprint 5+, NOT now)

A lightweight analytics dashboard to visualize these metrics automatically. For the experiment phase, manual Firestore queries are sufficient.

---

## 5. Activation Sequence

### Week 0: Pre-Experiment (Day 0)

| Step | Action                                                                                         | Verification                                  |
| ---- | ---------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1    | Deploy current codebase to production (all flags OFF)                                          | Verify zero Answerlattice impact on existing flows |
| 2    | Record baseline metrics: current negative feedback rate, average search latency, ticket volume | Store in experiment log                       |

### Week 1: Signal Collection Begins

| Step | Action                                      | Verification                                                |
| ---- | ------------------------------------------- | ----------------------------------------------------------- |
| 3    | Set `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION: true` | Verify signals appear in `answerlattice_signalEvents` within 24h |
| 4    | Monitor signal volume daily                 | Expect 5-50 signals/day depending on traffic                |
| 5    | Check `entityId: 'unresolved'` rate         | Expected: ~100% (no ontology yet) — this is fine            |

### Week 2: Ontology Bootstrap

| Step | Action                                               | Verification                                |
| ---- | ---------------------------------------------------- | ------------------------------------------- |
| 6    | Set `ENABLE_ANSWERLATTICE_ONTOLOGY: true`                 | No visible change to users                  |
| 7    | Run entity extraction on all published KB articles   | Review extracted candidates                 |
| 8    | Approve 20-40 high-quality entity candidates         | Focus on highest-traffic entities           |
| 9    | Build search index entries for all approved entities | Verify index entries in Firestore           |
| 10   | Create 20-40 canonical answers for approved entities | Focus on entities with most signal activity |
| 11   | Create initial release (v1.0.0) for version binding  | Verify release in `answerlattice_releases`       |

### Week 3: Canonical Retrieval Live

| Step | Action                                        | Verification                                |
| ---- | --------------------------------------------- | ------------------------------------------- |
| 12   | Set `ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS: true` | Check `CANONICAL_HIT` logs appear within 1h |
| 13   | Set `ENABLE_ANSWERLATTICE_DRIFT_DETECTION: true`   | Verify nightly job runs at 2:30 AM UTC      |
| 14   | Monitor hit rate daily                        | Target: growing toward 25% by week end      |
| 15   | Monitor retrieval latency                     | Target: < RAG latency                       |
| 16   | Review first mutation proposals (if any)      | Approve/reject based on quality             |

### Week 4: Full Measurement

| Step | Action                                     | Verification                     |
| ---- | ------------------------------------------ | -------------------------------- |
| 17   | Continue monitoring all metrics            | Compile daily snapshots          |
| 18   | Simulate a product release (if applicable) | Verify drift evaluation triggers |
| 19   | Review all mutation proposals generated    | Track acceptance rate            |
| 20   | Compile final experiment report            | Compare against success criteria |
| 21   | Make Go/No-Go decision                     | See decision framework below     |

---

## 6. Known Risks & Mitigations

### Risk A: Signal Noise

**Problem:** All tickets and negative feedback emit signals, but not all represent knowledge failures. Some are product bugs, user errors, or spam.

**Current state:** v1 clustering is threshold-based only (`minSignalsForProposal: 3`). No severity weighting, duplicate collapse, time decay, or unique-user threshold.

**Mitigation for experiment:**

- Accept that v1 proposals will be noisy
- Track proposal acceptance rate as signal quality proxy
- If acceptance rate < 30% → signal quality is too low → needs weighting logic in Sprint 5

**Future improvement (post-experiment, if warranted):**

- Severity weighting (escalation > ticket > chat_negative)
- Duplicate collapse by user
- Time decay (recent signals weighted higher)
- Minimum unique-user threshold per cluster

### Risk B: Entity Resolution Gap

**Problem:** Signals emitted before ontology exists have `entityId: 'unresolved'`. The mutation engine skips `entityId: ''` but processes `entityId: 'unresolved'` — these cluster into a single "unresolved" bucket that generates noise proposals.

**Mitigation for experiment:**

- In Week 1-2, signals accumulate with 'unresolved' — this is expected and harmless
- After ontology bootstrap (Week 2), new signals will start binding to real entities
- Historical 'unresolved' signals will be ignored by the nightly job (they cluster into one bucket that may or may not hit threshold)

**Monitoring:** Track `entityId: 'unresolved'` rate. Should drop significantly after Week 2.

### Risk C: Canonical Answers Underperform RAG

**Problem:** If entity matching or answer quality is poor, canonical-first retrieval may return worse answers than RAG.

**Mitigation:**

- Drift penalty (-50 score) ensures drifted answers are deprioritized
- Confidence signal ('high'/'medium'/'low') is logged and can be used to filter
- Version window filtering prevents stale answers
- RAG fallback is seamless — canonical miss = normal RAG behavior

**Kill switch:** Set `ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS: false` → instant revert to RAG-only.

### Risk D: Nightly Job Cost Amplification

**Problem:** Cost scales linearly with canonical answer count per tenant.

**Worst-case projection (see Section 8):**

- Tenant with 300 canonical answers: ~500-1000 Firestore reads per nightly run
- Still < $0.10/month per tenant even at worst case
- But if you have 100 tenants × 300 answers → 50,000-100,000 reads/night

**Mitigation:**

- `maxProposalsPerRun: 10` caps proposal generation
- 500 signal event limit per tenant query
- Monitor Firestore read counts during experiment

---

## 7. Go / No-Go Decision Framework

After Week 4, evaluate:

### GREEN — Continue and Expand

All primary metrics met:

- ✅ Hit rate ≥ 25%
- ✅ Negative feedback reduced ≥ 10% on canonical answers
- ✅ Retrieval latency ≤ RAG
- ✅ Drift flags < 20%

**Next:** Expand canonical answer coverage, build admin dashboard (Sprint 5), begin Sprint 5 signal quality improvements.

### YELLOW — Continue with Adjustments

Some primary metrics met, others close:

- ⚠️ Hit rate 15-25% (below target but meaningful)
- ⚠️ Feedback delta 0-10% (some improvement but not significant)
- ✅ Latency acceptable
- ✅ Drift flags acceptable

**Next:** Improve entity search index (synonyms, weights), add more canonical answers, extend experiment 2 more weeks.

### RED — Pause and Reassess

Primary metrics failed:

- ❌ Hit rate < 15% (entity matching is broken)
- ❌ No feedback improvement (answers aren't better than RAG)
- ❌ Latency regression (retrieval is slower than RAG)
- ❌ Drift flags > 50% (answers are stale on arrival)

**Next:** Disable canonical retrieval. Analyze root cause. Either:

1. Search index quality issue → fix entity synonyms/tokens, retry
2. Answer quality issue → rewrite canonical answers with better content, retry
3. Fundamental approach issue → reassess whether deterministic retrieval fits the product

---

## 8. Worst-Case Cost Projections

### Single Tenant (Heavy Usage)

| Scenario | Canonical Answers | Nightly Reads | Daily Signal Writes | Search Reads/Query | Monthly Cost |
| -------- | ----------------- | ------------- | ------------------- | ------------------ | ------------ |
| Light    | 20                | ~100          | ~10                 | ~15                | ~$0.50       |
| Medium   | 100               | ~350          | ~30                 | ~30                | ~$2.00       |
| Heavy    | 300               | ~1,000        | ~80                 | ~50                | ~$5.00       |
| Extreme  | 500               | ~1,800        | ~150                | ~80                | ~$10.00      |

### Multi-Tenant (Platform-Wide)

| Tenants | Avg Answers | Nightly Total Reads | Monthly Platform Cost |
| ------- | ----------- | ------------------- | --------------------- |
| 10      | 50          | ~2,500              | ~$10                  |
| 50      | 100         | ~25,000             | ~$50                  |
| 100     | 200         | ~100,000            | ~$200                 |
| 500     | 200         | ~500,000            | ~$1,000               |

**LLM costs remain $0.00/month** during normal operations (entity extraction is admin-triggered only).

**Conclusion:** Even worst-case, Answerlattice's Firestore costs are negligible compared to the existing RAG pipeline's embedding API costs.

---

## 9. Post-Experiment Actions

### If GREEN:

1. **Sprint 5 — Admin Dashboard:** Build entity management, canonical answer editor, drift dashboard, mutation review UI
2. **Signal Quality v2:** Add severity weighting, duplicate collapse, time decay
3. **Expand Coverage:** Target 80% entity coverage of KB articles
4. **Documentation:** Update `answerlattice-activation-clearance.md` with experiment results

### If YELLOW:

1. **Improve Search Index:** Add more synonyms, adjust token weights, verify entity coverage
2. **Improve Answers:** Rewrite low-performing canonical answers based on miss reasons
3. **Extend Experiment:** Run 2 more weeks with improvements
4. **Re-evaluate:** Run Go/No-Go again

### If RED:

1. **Disable:** Set `ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS: false`
2. **Keep Signals:** Leave `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION: true` — signal data is still valuable
3. **Root Cause:** Analyze `CANONICAL_MISS` reasons to understand failure mode
4. **Decide:** Fix and retry OR pivot Answerlattice to signal-only mode (governance without retrieval)

---

_This framework turns Answerlattice from "elegant engineering" into a measurable experiment. The infrastructure is ready. The metrics will prove whether it deserves to be a product._

---

## 10. Operational Failure Modes (Watch List)

> **Source:** ChatGPT strategic session (March 6, 2026), validated against codebase.
> **Purpose:** Proactive awareness during activation phase. Some already mitigated, others need manual discipline.

### FM-1: Entity Ontology Collapse (🔴 HIGH RISK)

**What happens:** Different concepts get mixed together. "menu publishing", "menu update", "menu editing", "menu syncing" become separate entities incorrectly. Retrieval becomes inconsistent, mutation proposals become noisy.

**Mitigation:**

- Treat ontology as a **controlled vocabulary**, not an auto-generated list
- Entity naming rules: maximum 3-5 words, avoid verbs, one concept = one entity
- **Manual entity approval during the first month** — do not trust automated extraction fully
- Example corrected model: `Feature: Menu Publishing`, `Workflow: Update Menu`, `State: Menu Draft`

### FM-2: Canonical Answer Overfitting (🔴 HIGH RISK)

**What happens:** First canonical answers become too specific to one question. Small variations fall back to RAG. Canonical coverage stays low.

**Mitigation:**

- Write canonical answers **around entities, not questions**
- Structure each answer broadly: Overview → Steps → Edge cases → Common errors
- This allows many query variations to map to the same canonical answer
- **Bad:** "How do I update my menu after adding new items?"
- **Good:** Entity `Menu Publishing` → canonical answer covering the full workflow

### FM-3: Signal Noise Explosion (🟡 MEDIUM — Already Mitigated)

**What happens:** All tickets and negative feedback emit signals, but not all represent knowledge failures.

**Current mitigations:**

- `minSignalsForProposal: 3` threshold prevents single-event proposals
- Signal entity resolution (`resolveUnresolvedSignals`) reduces noise
- Signal deduplication (in-memory Set) prevents duplicates
- `maxProposalsPerRun: 10` caps output

**Monitor:** Track proposal acceptance rate. If < 30% → signal quality too low → needs weighting logic.

### FM-4: Canonical Drift Over-Triggering (🟡 MEDIUM — Partially Mitigated)

**What happens:** Product changes flag too many answers as drifted, creating governance fatigue.

**Current mitigations:**

- Drift evaluation is entity-scoped (only answers bound to changed entities are evaluated)
- Drift clearing is automatic when conditions resolve

**Additional discipline:** When registering a release, specify `entityChanges` precisely. Broad entity changes = broad drift flags.

### FM-5: RAG Dominance (🟢 LOW — Architecture Prevents)

**What happens:** Even with canonical answers present, RAG still dominates.

**Current mitigations:**

- Canonical-first retrieval is architecturally enforced (doctrine)
- `CANONICAL_HIT` / `CANONICAL_MISS` logging enables weekly inspection
- Coverage KPI aggregation tracks the ratio

**Monitor:** If hit rate stagnates below 20% after Week 3, the search index needs more synonyms/tokens.

### FM-6: Mutation Proposal Spam (🟢 LOW — Already Capped)

**What happens:** Too many proposals generated per day, overwhelming admin.

**Current mitigations:**

- `maxProposalsPerRun: 10` per nightly run per tenant
- Existing pending proposals prevent duplicate generation
- Recurring fallback detection capped at 5 per run

### FM-7: Admin Cognitive Overload (🔴 HIGH RISK)

**What happens:** Admin must review entity candidates, mutation proposals, drift flags, and canonical answers simultaneously. Too many tasks → governance stops.

**Mitigation — Weekly Governance Cycle:**

| Day           | Task                                             | Time   |
| ------------- | ------------------------------------------------ | ------ |
| **Monday**    | Review mutation proposals (approve/reject)       | 15 min |
| **Wednesday** | Review drift flags (investigate, resolve)        | 15 min |
| **Friday**    | Update canonical answers based on week's signals | 30 min |

**Rule:** Governance must remain active. Without this weekly cycle, Answerlattice becomes static documentation.

### FM-8: Knowledge Fragmentation (🟡 MEDIUM)

**What happens:** Too many canonical answers exist per entity. "update menu", "update menu items", "update menu prices" become separate answers. Knowledge scatters.

**Mitigation:**

- **Prefer ONE canonical answer per entity**
- Structure inside the answer: Overview → Steps → Edge cases → Common errors
- Do NOT split unless truly different concepts
- Review answer count per entity weekly — if > 2 per entity, consolidate

### FM-9: Governance Loop Breaking (🔴 HIGH RISK)

**What happens:** Mutation proposals get ignored, drift flags get ignored, canonical answers never updated. System becomes static documentation instead of living infrastructure.

**Mitigation:**

- Follow the weekly governance cycle (FM-7)
- Track `days_since_last_governance_action` as a health metric
- If no governance action in 14 days → system is stale → intervene
- The nightly scheduler continues generating proposals — if the admin queue grows past 20 pending items, that's a red flag

### FM-10: Hit Rate Stagnation (🟢 LOW — Already Tracked)

**What happens:** `canonical_hit_rate` plateaus below useful levels.

**Interpretation guide:**

- < 15% → Ontology is weak (search index needs work)
- 15-40% → Normal early stage (expected during experiment)
- 40-70% → System stabilizing (governance is working)
- \> 70% → Mature knowledge system (target state)

**Current tracking:** `aggregateCoverageKPI()` runs nightly, stores in `platformSummary/answerlattice_{sId}`.

---

## 11. MenuList Ontology Bootstrap — Suggested Entity Categories

> **Source:** ChatGPT conversation + Cascade validation
> **Purpose:** Starting checklist for Week 2 entity extraction and approval

### Features (Product Capabilities)

- Menu Publishing
- QR Menu
- Language Translation
- POS Webhook Sync
- Digital Screens
- Official Business Page (OBP)
- Decision Blocks (Recommendations)
- AI Image Generation
- Guest Feedback System
- Multi-Outlet Management

### Workflows (User Actions)

- Creating Menu (upload → extract → edit → publish)
- Updating Menu (edit items/prices/availability)
- Publishing Menu (preview → publish → distribute)
- Multi-Outlet Editing (master vs outlet overrides)
- Sharing Menu (QR, link, social)

### States (System Conditions)

- Menu Draft
- Menu Published
- Menu Syncing (POS)
- Store Active / Suspended
- Subscription Active / Expired

### Errors (Common Failure Scenarios)

- Menu Not Updating (after edit)
- QR Link Broken (subdomain issue)
- Translation Mismatch (wrong language)
- Image Generation Failed (capacity/API)
- POS Sync Failed (webhook delivery)

### Billing & Account

- Subscription Plans
- AI Enhancement Packs (Credits)
- Payment Methods (Razorpay)

**Target:** 20-40 entities approved in Week 2, with canonical answers for the 15-20 highest-traffic entities.

---

## 12. Canonical Answer Authoring Guidelines

> **Purpose:** Prevent FM-2 (Overfitting) and FM-8 (Fragmentation)

### Rule 1: One Answer Per Entity

Each entity should have exactly ONE canonical answer. If you need to cover sub-topics, use sections within the answer.

**Structure:**

```
## [Entity Name]

### Overview
What this is and why it matters.

### How It Works
Step-by-step instructions.

### Common Issues
Known problems and solutions.

### Edge Cases
Special situations (multi-outlet, multi-language, etc.)
```

### Rule 2: Write for Entities, Not Questions

**Bad:** "How do I update my menu after adding new items to the list?"
**Good:** Entity `Menu Publishing` — covers the full publish workflow including updates.

### Rule 3: Broad Coverage Over Precision

A canonical answer that covers 80% of questions about an entity is better than 5 precise answers that each cover 20%.

### Rule 4: Review After 2 Weeks

After the first 2 weeks of canonical retrieval, review `CANONICAL_MISS` reasons. If misses cluster around specific variations → broaden the existing answer, don't create new ones.

---

## Version History

| Date       | Change                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------- |
| 2026-03-15 | Initial experiment framework                                                                       |
| 2026-03-06 | Added §10 (Failure Modes), §11 (Entity Categories), §12 (Authoring Guidelines) from ChatGPT review |
