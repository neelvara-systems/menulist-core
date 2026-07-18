# Answerlattice — Entity System (Product Ontology Layer)

> **Status:** MAINTAINED — Core entity loop is implemented; post-save extraction is best effort and the hybrid evidence lane remains independently gated
> **Version:** 2.0.0
> **Last Updated:** 2026-07-18
> **Pillar:** 1 of 5 — Product Ontology (Foundation Layer)
> **Feature Flag:** `ENABLE_ANSWERLATTICE_ONTOLOGY` (existing, ON in current source)
> **Source:** Current code, runtime contracts, tests, doctrine, and maintained feature documentation

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
| **Entity-Article Bridge (entityIds on KB articles)** | ✅ COMPLETE | `src/types/knowledgeBase.ts`, Knowledge Intake publishing, compiled context |
| **Aliases on Entity Document** | ✅ COMPLETE | `AnswerlatticeEntity.aliases`, entity DAL, search-index synchronization |
| **Registry-Guided Extraction** | ✅ COMPLETE | Existing scoped entities are supplied to extraction and post-extraction matching |
| **Post-Save Entity Extraction** | ✅ COMPLETE, BEST EFFORT | Article create and extraction-relevant updates attempt the protected extraction route when ontology is enabled |
| **Entity Merge** | ✅ COMPLETE | Governed bounded merge rewrites canonical, article, relation, and search-index dependencies, merges aliases, and deprecates the merged entity |
| **Entity-Enriched RAG Context** | ✅ COMPLETE | `src/lib/search/searchCore.ts` |
| **Exact technical-token/entity article lane** | ✅ IMPLEMENTED, DEFAULT OFF | `src/lib/answerlattice/hybridEvidenceRetrieval.ts`, `src/lib/search/searchCore.ts` |

---

## Enhancements (This Document Set)

Six tracked enhancements for the entity loop:

| # | Enhancement | Impact | Current state |
|---|-------------|--------|---------------|
| E1 | Add `aliases[]` to AnswerlatticeEntity | Governance + query detection | Complete |
| E2 | Add `entityIds[]` to KB articles | Article-to-entity bridge | Complete |
| E3 | Registry-guided extraction | Reduces duplicate entity proposals | Complete |
| E4 | Post-save entity extraction | Attempts to keep article entity links synchronized | Complete; best-effort browser trigger |
| E5 | Entity merge capability | Long-term entity hygiene | Complete |
| E6 | Entity-enriched RAG context | Better scoped fallback evidence | Complete |

---

## Boundary Review

| Capability | Answerlattice Status | Decision |
|---------------|----------------|----------|
| Entity Registry | ✅ Already built | Keep as-is |
| Entity Extraction | ✅ Registry-guided extraction built | Keep explicit and governed |
| Entity Candidates + Promote | ✅ Already built (with authority rules) | Keep as-is |
| Entity Search Index | ✅ Already built | Keep as-is |
| Entity Relations | ✅ Already built (6 types) | Keep as-is |
| Entity Aliases | ✅ Entity field and search-index sync built | Keep entity as source of truth |
| Entity-Article Mapping | ✅ Implemented on KB articles | Keep bounded and governed |
| Entity Coverage Index | ✅ AnswerlatticeCoverageKPI exists | Keep as-is |
| Entity Lifecycle | ✅ active/deprecated/beta | Keep as-is |
| Entity Query Detection | ✅ canonicalRetrieval Layer 1 | Keep as-is |
| Entity Memory (query learning) | Not part of the governed truth model | **DEFER** — interactions remain signals until human review |
| Entity Graph Intelligence | ✅ Relations and governed merge exist | Keep as-is |
| Product Surface Awareness | ✅ AnswerlatticeContextPayload | Keep as-is |
| Cross-Tenant Intelligence | Outside the tenant-isolated product boundary | **REJECT** — do not pool customer knowledge across tenants |
| Knowledge Trust Scoring | ✅ confidenceScore fields | Keep as-is |
| Support Reasoning Engine | ❌ Not built | **REJECT** — overkill for v1 |
| Knowledge Execution Control | ✅ Canonical retrieval does this | Keep as-is |
| Multi-pass Extraction | ❌ Not built | **DEFER** — single-pass sufficient |
| Article Summarization/Chunking | ❌ Not built | **DEFER** — valuable but not critical |

Answerlattice App Entity Candidate ID Boundary: candidate review actions normalize candidate document IDs through `src/lib/answerlattice/entityCandidateIdBoundary.ts` before approval, rejection, promotion, merge refs, promotion audit state, and promotion return metadata. Malformed, reserved, empty, or path-shaped candidate IDs fail before Firestore access while valid generated candidate IDs keep the existing human-review flow.

Answerlattice App Entity DAL ID Boundary: entity, relation, and entity search-index document refs normalize IDs through `src/lib/answerlattice/governanceIdBoundary.ts` before entity update/deprecate refs, relation delete refs, search-index writes, alias sync, merge reads/writes, merge audit state, and compiled-context source-version IDs. Malformed, reserved, empty, path-shaped, or unresolved entity IDs fail before Firestore access while valid entity governance behavior is unchanged.

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
Best-Effort Trigger → Protected Extraction Route
     ↓
Assisted Entity Extraction (active registry rows only)
     ↓
Entity Matching (alias + search index)
     ↓
Candidate Entity (if new) → Owner Review → Promote
     ↓
Confirmed successful extraction updates entityIds[] (maximum 10)
     ↓
Confirmed empty extraction clears stale links; provider/parsing failure preserves them
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
Not Found? → RAG Fallback (entity-enriched)
```

The post-save trigger runs only when ontology is enabled. It is non-blocking and best effort: article save remains authoritative if extraction fails, failed or incomplete extraction preserves current links, confirmed empty extraction can clear stale links, and new entity candidates still require review.

---

## Doctrine Alignment

- **Pillar 1 (Product Ontology):** This IS Pillar 1
- **Pillar 2 (Canonical Answers):** Already bound to entities via `scope.entityIds`
- **Pillar 3 (Drift Governance):** Uses entities for drift class detection
- **Pillar 4 (Signal Mutation):** Uses `relatedEntityIds` on mutation proposals
- **Non-Goals Charter:** Zero expansion into helpdesk/CMS/analytics territory
- **Infrastructure Freeze:** All changes are additive fields only — no breaking changes
