# Canonica — Core Doctrine

> **Status:** LOCKED
> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Authority:** Binding for all product, engineering, sales decisions
> **Source:** ChatGPT strategic session + Cascade codebase validation
> **Freeze Duration:** 3 years (additive-only changes permitted)

---

## Identity

**Product Name:** Canonica
**Category:** Support Knowledge Control Plane for SaaS
**One-Sentence Definition:** The Support Knowledge Control Plane that governs product truth across AI, documentation, and support systems.

**Canonica is NOT:**
- A helpdesk
- An AI chatbot
- A knowledge base platform
- A ticket automation tool
- A documentation CMS
- A compliance platform
- A business analytics tool

**Canonica IS:**
- Canonical product knowledge infrastructure
- Entity-modeled, version-aware, drift-detecting
- Knowledge-first (operations secondary)
- Infrastructure that other systems depend on

---

## Naming Decision (Locked)

| Candidate | Verdict | Reason |
|-----------|:-------:|--------|
| **Canonica** | ✅ CHOSEN | Authority-heavy, infrastructure-feel, category-creating, not feature-bound, aligns with MenuList pattern (canonical truth) |
| SupportOS | ❌ Rejected | Signals operational/workflow system, invites helpdesk feature pressure, competes in crowded category |
| ResolveLayer | ❌ Rejected | Resolution-centric, narrows positioning |
| TrustLayer | ❌ Rejected | Good but too abstract without "knowledge" signal |
| SignalCore | ❌ Rejected | Analytics-oriented perception |
| SupportFrame | ❌ Rejected | Still sounds like support tool |

**Pattern Symmetry:**
- MenuList → Canonical public business truth
- Canonica → Canonical product support truth
- GrowthOS / FounderOS / VisualOS → Operational execution systems (different class)

---

## Architectural Center of Gravity

**Knowledge is the spine. Everything else orbits it.**

| Layer | Role | Priority |
|-------|------|:--------:|
| **Product Ontology** | Foundation — structured entity graph | 1 (highest) |
| **Canonical Answer Engine** | Core — governed, versioned knowledge assets | 2 |
| **Drift Governance** | Control plane — monitors knowledge integrity | 3 |
| **Signal Intelligence** | Refinement — converts friction into knowledge updates | 4 |
| **Operations (Tickets/Chat)** | Fallback + signal source — NOT the center | 5 (lowest) |

**Rule:** If a feature strengthens layers 1-4, build it. If it only strengthens layer 5, reject it.

---

## The 5 Architectural Pillars (Frozen)

### Pillar 1 — Product Ontology Layer
Independent entity collections: features, plans, roles, workflows, states, integrations, error codes. With explicit relationships. Articles reference entities. Entities do not live inside articles.

### Pillar 2 — Canonical Answer Engine
Answers as persistent, versioned, entity-bound, scope-aware governed assets. Not ephemeral AI outputs. Chat retrieves them. Tickets reference them. Docs render them.

### Pillar 3 — Version & Drift Governance
4 drift classes only: version_mismatch, signal_anomaly, scope_conflict, deprecated_entity. Release-triggered + nightly audit. Deterministic, rule-driven, no ML heuristics.

### Pillar 4 — Signal Mutation Engine
Signals propose mutations. Humans approve. System enforces consistency. 4 mutation types: content_refinement, scope_adjustment, version_update, new_answer_required. No autonomous rewriting.

### Pillar 5 — API & Integration Layer
Public API for canonical answers. Version-aware retrieval. Drift webhooks. Signal ingestion endpoints. Embeddable grounding SDK.

---

## Retrieval Doctrine (Permanent)

1. **Canonical-first** — If matching canonical answer exists, return it. No generation, no reinterpretation.
2. **RAG is fallback** — Marked as `non_canonical`. Logged. Triggers mutation proposal if recurring.
3. **Deterministic entity resolution** — Inverted index + synonym map as primary. LLM extraction as secondary assist only.
4. **Specificity scoring** — Rule-based, not LLM-based. Version window → scope depth → validation recency → confidence.
5. **Canonical coverage is KPI** — % of queries resolved via canonical answers. Must increase over time.

---

## Evolution Path (Locked)

**Approach:** Controlled structural evolution (NOT full rewrite)

| Phase | What | When |
|-------|------|------|
| 1 | Ontology bootstrap (AI extraction + human validation) | Q1 |
| 2 | Canonical Answer Engine live | Q1 |
| 3 | Drift Detection Engine (4 classes) | Q2 |
| 4 | Signal Mutation Engine | Q3 |
| 5 | API surface + deep integration | Q4 |

No surface feature expansion during infrastructure build.

---

## Current State Assessment (Honest)

| Dimension | Score | Reality |
|-----------|:-----:|---------|
| Knowledge modeling | 3/10 | Document-centric (TipTap JSON blobs). No ontology. No entity graph. |
| Operational depth | 8/10 | Full ticket lifecycle, SLA, chat monitoring, admin dashboard, analytics |
| RAG quality | 7/10 | Vector search + caching + streaming. But ephemeral answers. |
| Multi-tenant isolation | 7/10 | Good except KB is global (no tenant scoping) |
| Cost discipline | 9/10 | Embedding cache, response cache, aggregated analytics, pagination |
| Infrastructure readiness | 4/10 | Clean DAL but no ontology, no governance, no canonical objects |

**Summary:** System is 70% SupportOS, 30% Canonica. Must shift toward knowledge-first.

---

## The One Metric That Matters

**Support Load Compression Rate**

Percentage reduction in recurring issues due to canonical knowledge improvements.

If this metric grows quarter over quarter → Canonica is infrastructure.
If it doesn't → it's just a tool.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-02 | 1.0.0 | Initial doctrine from ChatGPT strategic session + Cascade validation |
