# Answerlattice — Complete System Identity

> **Version:** 1.0.0  
> **Last Updated:** 2026-03-04  
> **Authority:** Founder-defined. Single source of truth for what Answerlattice is.

---

## Answerlattice: The Governed Answer Infrastructure for SaaS Support

### What Answerlattice Is NOT
- A helpdesk, chatbot, documentation CMS, ticketing tool, or RAG bot

### What Answerlattice IS
A deterministic, version-aware, governance-controlled knowledge infrastructure layer behind the entire support system of a SaaS product.

The Help Center is the **interaction layer** of Answerlattice — not a separate system.

---

## 6 Layers

1. **Interaction Layer** — Help Center UI (AI Q&A, KB, Tickets, Feedback, Changelog)
2. **Knowledge Layer** — KB + Product Ontology (entities, relations, search index)
3. **Deterministic Answer Layer** — Canonical Retrieval Engine (no LLM, same input = same output)
4. **Governance Layer** — Drift Detection (4 classes) + Signal Mutation (human-in-the-loop)
5. **Signal Layer** — Friction capture from tickets, negative feedback, escalations
6. **Control & Audit Layer** — Release binding, version windows, append-only audit logs

---

## Query Flow
1. User submits query → 2. Canonical engine attempts deterministic answer → 3. If match: return governed answer → 4. If no match: fallback to RAG → 5. Negative feedback/tickets → signal captured → 6. Signals cluster → mutation proposals → human approval

---

## Product Ontology
Entity types: feature, plan, role, workflow, state, integration, error. Each entity: named, tokenized, related, tenant-scoped, version-aware. Converts unstructured docs into structured product concepts.

## Canonical Answer Engine
Each answer: binds to ≥1 entity, has version window, scope (plan/role/state), confidence score, drift flag. Retrieval: tokenize → match entity index → filter by version+scope → score by specificity. No LLM. Infrastructure behavior.

## Drift Governance (4 Classes)
1. Version Drift — entity changed, answer not revalidated
2. Signal Anomaly — negative feedback spike
3. Scope Conflict — overlapping active answers
4. Orphan Entity — deprecated entity still bound

Drift flags, does not block. Advisory governance.

## Signal Mutation
Signals: tenant-scoped, timestamped, append-only. Nightly: cluster by entity → threshold → generate mutation proposal → human approval required. No auto-edit.

## Release Control
Canonical answers bind to version windows. New release → drift engine evaluates → flags misalignment. Never blocks activation.

---

## Data Model: 9 Collections
answerlattice_entities, answerlattice_entity_relations, answerlattice_entity_search_index, answerlattice_canonical_answers, answerlattice_releases, answerlattice_signal_events, answerlattice_mutation_proposals, answerlattice_audit_logs, answerlattice_entity_candidates. All tenant-scoped (tId+sId), all writes through DAL, core logs append-only.

## Feature Flags (all OFF)
ENABLE_ANSWERLATTICE_ONTOLOGY, ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS, ENABLE_ANSWERLATTICE_DRIFT_DETECTION, ENABLE_ANSWERLATTICE_SIGNAL_MUTATION, ENABLE_ANSWERLATTICE_RELEASES, ENABLE_ANSWERLATTICE_NIGHTLY (backend)

---

## Strategic Identity
Not selling support automation. Building: **Knowledge correctness infrastructure for SaaS.** Replace probabilistic support with governed support. Make knowledge version-aware. Bind answers to product structure. Make drift measurable. Turn friction into structured mutation.

## Current State
Architecturally complete. Tenant-isolated. Deterministic. Drift-aware. Signal-aware. Feature-flag gated. Ready for controlled experiment. NOT yet: behaviorally validated, canonical coverage proven, signal-to-mutation quality proven, drift false-positive rate proven. **Infrastructure-complete, value-unproven.**

## In One Sentence
Answerlattice is deterministic, version-aware governed answer infrastructure that validates and evolves SaaS support answers through structured ontology and signal-driven mutation — with the Help Center as its interaction surface.
