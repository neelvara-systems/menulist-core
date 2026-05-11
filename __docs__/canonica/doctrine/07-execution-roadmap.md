# Canonica — 12-Month Execution Roadmap

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Source:** ChatGPT strategic session + Cascade codebase validation
> **Constraints:** 3-year freeze, canonical-first doctrine, deep embedding strategy, no surface expansion

---

## Quarterly Structure

Each quarter has ONE structural objective. No feature sprawl.

---

## Q1 — Foundation Quarter: Ontology + Canonical Engine Live

**Objective:** Transition from document-RAG system → entity-bound canonical system.

### Sprint 1 — Data Layer Foundation (2-3 weeks)

| Deliverable | Details |
|-------------|---------|
| Entity schema live | `entities` collection with `DB_COLLECTIONS.CANONICA_ENTITIES` |
| CanonicalAnswer schema live | `canonicalAnswers` collection with frozen schema |
| Release schema live | `releases` collection, append-only |
| EntityRelation schema live | Explicit typed relationships |
| tenantId enforcement | Mandatory on all new collections |
| Composite indexes | Pre-declared for all query patterns |
| Server-enforced writes | No client-side writes to core collections |
| VersionNormalized logic | Integer conversion (MAJOR.MINOR.PATCH → 00X00Y00Z) |
| Feature flags | `ENABLE_CANONICA_ONTOLOGY`, `ENABLE_CANONICA_CANONICAL_ANSWERS` |

**Exit criteria:** No client direct writes. Integrity audit basic script passes.

### Sprint 2 — Canonical Retrieval Core (2-3 weeks)

| Deliverable | Details |
|-------------|---------|
| Deterministic entity search index | Inverted index + synonym map + stemmed tokens |
| Canonical-first retrieval pipeline | Entity lookup → version filter → scope match → specificity rank |
| RAG fallback instrumentation | All fallbacks logged with `non_canonical` flag |
| Latency monitoring | P95 tracking per request |
| Specificity scoring | Rule-based (version match → scope depth → validation recency → confidence) |

**Exit criteria:** Canonical retrieval works E2E. Deterministic repeated queries verified. P95 < 200ms.

### Sprint 3 — Ontology Bootstrap (2-3 weeks, parallel with Sprint 2)

| Deliverable | Details |
|-------------|---------|
| Entity extraction pipeline | AI pass over KB articles + ticket subjects + chat clusters |
| entity_candidates collection | Staging before approval |
| Confidence scoring | Frequency-based (article 0.4 + ticket 0.3 + chat 0.2 + API ref 0.1) |
| Human validation dashboard | Internal admin: suggested entities, type, frequency, examples |
| Article binding automation | Approved entities → update KB articles with `referencedEntityIds` |

**Q1 Target:** 30-50% canonical coverage for first tenant. Entity graph exists and binds to KB.

---

## Q2 — Governance Quarter: Drift Engine + Release Binding

**Objective:** Activate control plane behavior.

### Sprint 4 — Drift Detection Engine (2-3 weeks)

| Deliverable | Details |
|-------------|---------|
| All 4 drift classes | version_mismatch, signal_anomaly, scope_conflict, deprecated_entity |
| Release-triggered drift | Synchronous after release activation |
| Nightly drift audit CF | Follows the existing scheduler reliability pattern, implemented in `functions-canonica/` |
| Drift flag enforcement | Cannot serve drifted answers as primary without warning |
| DriftEvent audit collection | Append-only audit trail |
| Feature flag | `ENABLE_CANONICA_DRIFT_DETECTION` |

### Sprint 5 — Release Registration (2 weeks)

| Deliverable | Details |
|-------------|---------|
| Release registry collection | `releases` with versionLabel, versionNormalized, entityChanges, status |
| Two-phase release model | pending → processing → active (drift must process before active) |
| Manual release-entry UI | Internal admin dashboard for design partners |
| Version timeline validation | Strictly increasing, immutable after creation |

**Q2 Target:** Drift flags active. First real drift incident detected + resolved. Canonical coverage > 60%.

---

## Q3 — Compounding Quarter: Signal Mutation Engine

**Objective:** Close the feedback loop. System self-improves.

### Sprint 6 — Signal Clustering + Mutation Pipeline (3-4 weeks)

| Deliverable | Details |
|-------------|---------|
| signalEvents collection | Raw events: ticket clusters, chat negative feedback, escalation patterns |
| Entity-based clustering | Group signals by entityId (primary), errorCode (secondary), workflow+state (tertiary) |
| MutationProposal collection | Frozen schema with 4 mutation types |
| Admin approval workflow | Review → approve/reject → implement (transactional) |
| Version-safe answer updates | Close old window + open new window in single transaction |
| Audit trail | All mutations logged (who, what, previous state, new state) |
| Post-mutation tracking | 14-day impact: ticket delta, feedback delta, confidence shift |
| Feature flag | `ENABLE_CANONICA_SIGNAL_MUTATION` |

**Q3 Target:** ≥3 mutation cycles completed. Demonstrated ticket deflection improvement. Measurable AI accuracy improvement.

---

## Q4 — Lock-In Quarter: Deep Embedding + API Layer

**Objective:** Make Canonica operationally inseparable.

### Sprint 7 — API Surface (2-3 weeks)

| Deliverable | Details |
|-------------|---------|
| Canonical answer retrieval API | Public, read-only, version-aware, scope-filtered |
| Entity registry read endpoint | Read-only entity list per tenant |
| Drift event webhook | Outbound webhook on drift detection |
| Signal ingestion endpoint | Inbound structured signal events |
| API authentication | Scoped access tokens, tenant-isolated |
| Rate limiting | Per-tenant, per-endpoint |
| Feature flag | `ENABLE_CANONICA_PUBLIC_API` |

### Sprint 8 — Integration + Validation (2-3 weeks)

| Deliverable | Details |
|-------------|---------|
| Zendesk/Intercom connector | Replace bot knowledge source with canonical-first answers (1-2 systems only) |
| Design partner embedding | Release workflow + support review + documentation cycle + AI monitoring |
| Stress testing | Full IRC v1.0 certification pass |
| Load testing harness | High QPS, drift storm, mutation concurrency, adversarial queries |
| Backup + restore dry run | Daily snapshot + tested restore procedure |
| Infrastructure Readiness Report | SLO metrics, stress results, security validation |

**Q4 Target:** 5-15 deeply embedded SaaS customers. 70-80% canonical coverage. Drift resolution < 7 days. Mutation loop operational. 15-30% ticket reduction measurable.

---

## What We Do NOT Build in Year 1

- Multi-channel messaging
- Advanced ticket routing beyond current
- Agent gamification
- Marketing site feature explosion
- SMB tier pricing
- Compliance suite
- Marketplace integrations
- Fancy analytics dashboards
- AI rewriting everywhere
- PLG onboarding sprawl

**Everything must strengthen the 5 pillars.**

---

## Controlled Rollout Validation (CRAV)

### Phase 1 — Internal Shadow Mode (Weeks 1-6)
- Canonica runs against one real SaaS product
- Support team operates normally
- Measure: canonical coverage %, fallback %, drift events, mutation proposals

### Phase 2 — Assisted Production Mode (Weeks 7-14)
- Canonical answer suggestions visible to support agents
- Agents still decide
- Measure: override rate, incorrect selection rate, release binding adherence

### Phase 3 — Controlled Canonical-First Enforcement
- Canonical-first enforced for subset of queries
- Fallback only when no canonical
- Measure: accuracy, escalation impact, confidence reliability

### Hard Stop Criteria
Any of these → roll back:
- Overlapping version window bug
- Drift not triggering on release
- Cross-tenant leak
- Sustained latency breach
- Mutation corruption

---

## Design Partner Selection Criteria

**Start with ONE mid-market SaaS, deeply embedded. 90 days. No expansion.**

| Criterion | Requirement |
|-----------|------------|
| ARR | $5M-$40M |
| Release cadence | Biweekly or monthly |
| Product complexity | Multi-feature, plans, roles |
| Support team | 5+ agents |
| AI maturity | Already using AI support (seeing accuracy issues) |
| Willingness | Accept mandatory release registration |
| Engagement | Weekly governance review + feedback |

**Second tenant added ONLY after first validates architecture under real pressure.**
