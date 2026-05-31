# Answerlattice — Entity System (Product Ontology Layer)

> **Status:** ENHANCEMENT — Core infrastructure exists, 6 enhancements identified
> **Version:** 2.0.0
> **Last Updated:** 2026-03-08
> **Pillar:** 1 of 5 — Product Ontology (Foundation Layer)
> **Feature Flag:** `ENABLE_ANSWERLATTICE_ONTOLOGY` (existing, OFF by default)
> **Source:** ChatGPT entity deep-dive (9,430 lines) + Cascade codebase audit + industry research

---

## What This Is

The Entity System is **Pillar 1** of Answerlattice — the foundation layer that everything else depends on. Entities represent stable product concepts (features, plans, roles, workflows, states, integrations, error codes) that exist in a SaaS product's architecture. They are the semantic index layer above raw documentation.

**Without entities:** Answerlattice is semantic search over documents (a help center).
**With entities:** Answerlattice understands product structure and retrieves knowledge deterministically (governed answer infrastructure).

---

## Current State (Codebase Reality)

| Component | Status | Key File |
|-----------|--------|----------|
| Entity Types (7 types, 3 statuses) | ✅ COMPLETE | `src/types/answerlattice/index.ts` |
| Entity DAL (12 functions) | ✅ COMPLETE | `src/database/answerlattice/entities.ts` |
| Entity Relations (6 types + DAL) | ✅ COMPLETE | `src/database/answerlattice/entities.ts` |
| Entity Search Index (types + DAL) | ✅ COMPLETE | `src/database/answerlattice/entities.ts` |
| Entity Candidates (7 functions + promote) | ✅ COMPLETE | `src/database/answerlattice/entityCandidates.ts` |
| Entity Extraction Pipeline | ✅ COMPLETE | `src/lib/answerlattice/entityExtraction.ts` |
| Canonical Retrieval (3-layer, entity-first) | ✅ COMPLETE | `src/lib/answerlattice/canonicalRetrieval.ts` |
| Drift Detection (4 classes) | ✅ COMPLETE | `src/lib/answerlattice/driftDetection.ts` |
| Signal Mutation Engine | ✅ COMPLETE | `src/lib/answerlattice/signalMutation.ts` |
| useEntities Hook | ✅ COMPLETE | `src/hooks/answerlattice/useEntities.ts` |
| Governance UI Components | ✅ COMPLETE | `src/components/templates/answerlattice/governance/` |
| Entity Health Scores | ✅ COMPLETE | `src/components/templates/answerlattice/governance/EntityHealthScore.tsx` |
| **Entity-Article Bridge (entityIds on KB articles)** | ❌ MISSING | `src/types/knowledgeBase.ts` — no entityIds field |
| **Aliases on Entity Document** | ❌ MISSING | Only on search index, not on entity itself |
| **Registry-Guided Extraction** | ❌ MISSING | Extraction runs without existing entity context |
| **Auto-Extract on Article Save** | ❌ MISSING | Extraction is manual-only |
| **Entity Merge** | ❌ MISSING | Can deprecate but not merge two entities |
| **Entity-Enriched RAG Context** | ❌ MISSING | RAG fallback doesn't use entity descriptions |

---

## Enhancements (This Document Set)

6 targeted enhancements to complete the entity loop:

| # | Enhancement | Impact | Complexity |
|---|-------------|--------|------------|
| E1 | Add `aliases[]` to AnswerlatticeEntity | Governance + query detection | Low |
| E2 | Add `entityIds[]` to KB articles | **Core missing link** — connects entities to articles | Medium |
| E3 | Registry-guided extraction | Reduces duplicates dramatically | Medium |
| E4 | Auto-extract on article save | Keeps entity graph synchronized | Medium |
| E5 | Entity merge capability | Long-term entity hygiene | Low |
| E6 | Entity-enriched RAG context | Better fallback answers | Low |

---

## ChatGPT Discussion vs Answerlattice Reality

| ChatGPT Layer | Answerlattice Status | Decision |
|---------------|----------------|----------|
| Entity Registry | ✅ Already built | Keep as-is |
| Entity Extraction | ✅ Already built | Enhance with E3 |
| Entity Candidates + Promote | ✅ Already built (with authority rules) | Keep as-is |
| Entity Search Index | ✅ Already built | Keep as-is |
| Entity Relations | ✅ Already built (6 types) | Keep as-is |
| Entity Aliases | ⚠️ Partial (only on search index) | Enhance with E1 |
| Entity-Article Mapping | ❌ Missing on KB articles | Build with E2 |
| Entity Coverage Index | ✅ AnswerlatticeCoverageKPI exists | Keep as-is |
| Entity Lifecycle | ✅ active/deprecated/beta | Keep as-is |
| Entity Query Detection | ✅ canonicalRetrieval Layer 1 | Keep as-is |
| Entity Memory (query learning) | ❌ Not built | **DEFER** — no queries yet |
| Entity Graph Intelligence | ✅ Relations exist | Keep as-is |
| Product Surface Awareness | ✅ AnswerlatticeContextPayload | Keep as-is |
| Cross-Tenant Intelligence | ❌ Not built | **REJECT** — no tenants yet |
| Knowledge Trust Scoring | ✅ confidenceScore fields | Keep as-is |
| Support Reasoning Engine | ❌ Not built | **REJECT** — overkill for v1 |
| Knowledge Execution Control | ✅ Canonical retrieval does this | Keep as-is |
| Multi-pass Extraction | ❌ Not built | **DEFER** — single-pass sufficient |
| Article Summarization/Chunking | ❌ Not built | **DEFER** — valuable but not critical |

---

## Document Index

| Document | Audience | Purpose |
|----------|----------|---------|
| [entity-system_spec.md](./entity-system_spec.md) | CEO/PM | Business requirements, user flows, entity lifecycle |
| [entity-system_impl.md](./entity-system_impl.md) | Developers | Technical blueprint, file paths, data models, build order |
| [entity-system_firebase.md](./entity-system_firebase.md) | Developers | Every Firestore read/write/delete with cost estimates |
| [entity-system_marketing.md](./entity-system_marketing.md) | Sales/Marketing | Entity system as competitive differentiator |
| [entity-system_website.md](./entity-system_website.md) | Public | Landing page content for entity features |
| [entity-system_helpdoc.md](./entity-system_helpdoc.md) | Customers | How to manage entities in Answerlattice |
| [entity-system_mobile-support.md](./entity-system_mobile-support.md) | Engineering | Mobile admission test results |
| `_archive/chatgpt-review.md` | Internal | ChatGPT conversation analysis + verdict table |

---

## Quick Architecture Reference

```
KB Article Save
     ↓
AI Entity Extraction (registry-guided)  ← E3
     ↓
Entity Matching (alias + search index)
     ↓
Candidate Entity (if new) → Owner Review → Promote
     ↓
Article entityIds[] Updated  ← E2
     ↓
Entity Search Index Updated
     ↓
[Runtime Query]
     ↓
Alias Detection → Entity IDs
     ↓
Canonical Answer Lookup (scope.entityIds)
     ↓
Found? → Return Canonical Answer
Not Found? → RAG Fallback (entity-enriched)  ← E6
```

---

## Doctrine Alignment

- **Pillar 1 (Product Ontology):** This IS Pillar 1
- **Pillar 2 (Canonical Answers):** Already bound to entities via `scope.entityIds`
- **Pillar 3 (Drift Governance):** Uses entities for drift class detection
- **Pillar 4 (Signal Mutation):** Uses `relatedEntityIds` on mutation proposals
- **Non-Goals Charter:** Zero expansion into helpdesk/CMS/analytics territory
- **Infrastructure Freeze:** All changes are additive fields only — no breaking changes
