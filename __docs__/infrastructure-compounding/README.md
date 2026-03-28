# Infrastructure Compounding — Feature Set

> **"When you have bandwidth, deepen infrastructure quality. Never add features."**
> — Constitution Doc 17, Rule 1

**Status:** 📋 DOCUMENTATION PHASE (Pre-Implementation Review)  
**Priority:** P1 — Authority Phase (0-6 months)  
**Constitution Authority:** Doc 17 (Infrastructure Compounding Doctrine)  
**Source:** ChatGPT Session 15 → Cascade Review → Codebase Cross-Check

---

## Overview

4 infrastructure-deepening features that compound MenuList's canonical data quality. These are NOT new user-facing features — they are invisible systems that make existing data cleaner, more reliable, and more current.

**Internal codename:** MenuList Truth Engine — a closed-loop intelligence system.

**Design Principle:** Zero new UI. Zero new owner decisions. Zero new Firestore collections unless absolutely required.

### The Closed Loop

These 4 features form a **self-improving cycle**, not isolated tasks:

```
Extraction → Confidence Scoring → Owner Correction → Learning Loop
    ↑                                                      ↓
    └── Prompt Improvement ← Nightly Aggregation ← MOL Events
                                    ↓
                          Store Truth Confidence Score
                                    ↓
                          Staleness Detection (90 days)
                                    ↓
                          Reconfirmation Email
                                    ↓
                          Owner confirms/updates → Freshness ↑
                                    ↓
                          Next extraction is more accurate
                          (loop continues, compounds forever)
```

Each cycle makes the dataset cleaner. Over 12 months, this compounds into structural advantage: the cleanest, most reliable, continuously verified SMB menu dataset globally.

---

## Feature Set

| #    | Feature                                                                  | Purpose                                             | Integration Point                              | Firebase Impact                                   |
| ---- | ------------------------------------------------------------------------ | --------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| 10.1 | [Extraction Confidence Scoring](./extraction-confidence-scoring_spec.md) | Per-item confidence on AI extraction output         | Extraction pipeline (`processMenuImages`)      | ~0 extra cost (piggybacks on existing extraction) |
| 10.2 | [Extraction Learning Loop](./extraction-learning-loop_spec.md)           | Track owner corrections, improve extraction prompts | Editor save → MOL → Nightly aggregation        | ~$0.02/mo per 100 stores                          |
| 10.3 | [Store Truth Confidence Score](./store-truth-confidence_spec.md)         | Composite reliability score per store               | Nightly scheduler (new task)                   | ~$0.05/mo per 100 stores                          |
| 10.4 | [Periodic Staleness Check](./periodic-staleness-check_spec.md)           | 90-day reconfirmation via lifecycle messaging       | Nightly scheduler + lifecycle messaging engine | ~$0.01/mo per 100 stores                          |

**Total Firebase Cost (100 stores):** ~$0.08/month — negligible.

---

## Document Index

### Per Feature

Each feature follows the standard doc structure:

```
infrastructure-compounding/
├── README.md                                          # This file
├── extraction-confidence-scoring_spec.md              # 10.1 Spec + Impl
├── extraction-confidence-scoring_firebase.md          # 10.1 Firebase costs
├── extraction-learning-loop_spec.md                   # 10.2 Spec + Impl
├── extraction-learning-loop_firebase.md               # 10.2 Firebase costs
├── store-truth-confidence_spec.md                     # 10.3 Spec + Impl
├── store-truth-confidence_firebase.md                 # 10.3 Firebase costs
├── periodic-staleness-check_spec.md                   # 10.4 Spec + Impl
├── periodic-staleness-check_firebase.md               # 10.4 Firebase costs
└── infrastructure-compounding_mobile-support.md       # Mobile admission (FAILS — internal only)
```

---

## Implementation Order

**Strict sequence — each builds on the previous:**

1. **10.1 Extraction Confidence Scoring** — Add confidence to extraction output. No new collections. Piggybacks on existing job document.
2. **10.2 Extraction Learning Loop** — Track corrections using existing MOL. New nightly aggregation task. Requires 10.1 confidence data.
3. **10.3 Store Truth Confidence Score** — Composite score from existing signals. New nightly task. Uses data from 10.1 + 10.2.
4. **10.4 Periodic Staleness Check** — Uses 10.3 score to identify stale stores. Triggers existing lifecycle messaging.

### Target Timeline (6 weeks)

| Week | Feature                | Deliverable                                                     |
| ---- | ---------------------- | --------------------------------------------------------------- |
| 1-2  | 10.1 + 10.2 capture    | Confidence scoring in extraction + correction logging to MOL    |
| 3    | 10.2 aggregate + apply | Nightly aggregation + prompt injection                          |
| 4    | 10.3                   | Store truth confidence nightly computation                      |
| 5    | 10.4                   | Staleness detection + lifecycle email                           |
| 6    | Integration + testing  | End-to-end closed loop verification + type check + parity audit |

---

## Firebase Cost Discipline (TOPMOST PRIORITY)

Per user directive and Doc 13 (Operational Infrastructure):

1. **Zero new Firestore collections** unless existing ones cannot serve
2. **Piggyback on existing writes** wherever possible (e.g., add fields to existing job documents)
3. **Nightly batch processing only** — no real-time triggers for infrastructure metrics
4. **Feature-flag gated** — instant kill switch on all new systems
5. **Fire-and-forget pattern** — infrastructure metrics never block core operations
6. **Cost telemetry** — every new nightly task logs reads/writes to `systemTelemetry`

---

## What These Features Do NOT Do

- ❌ No new UI screens for owners
- ❌ No new dashboard pages
- ❌ No analytics exposed to users
- ❌ No new API endpoints
- ❌ No new billing features
- ❌ No owner-visible confidence scores
- ❌ No "improvement suggestions" to owners

These are **purely internal infrastructure systems** that make MenuList's data silently better over time.

---

## Existing Systems These Features Plug Into

| Existing System               | Location                                                         | How Used                                     |
| ----------------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| Extraction Pipeline           | `functions/src/logic/processMenuImages.ts`                       | 10.1 adds confidence to output               |
| Quality Scoring               | `functions/src/types/menuExtraction.types.ts`                    | 10.1 extends existing QualityScore           |
| MOL (Menu Observation Layer)  | `src/database/menuChangeLog/index.ts`                            | 10.2 adds `EXTRACTION_CORRECTION` event type |
| Nightly Scheduler             | `functions/src/decisionBlocksScoring.ts`                         | 10.2, 10.3, 10.4 add new tasks               |
| Authority Maturation          | `functions/src/analytics/authorityMaturation.ts`                 | 10.3 consumes maturation phase               |
| Menu Drift Metrics            | `functions/src/analytics/menuDriftMetrics.ts`                    | 10.3 consumes drift data                     |
| MCE (Menu Correctness Engine) | `src/lib/menuCorrectness/`                                       | 10.3 consumes MCE pass rate                  |
| Lifecycle Messaging           | `functions/src/messaging/messagingEngine.ts`                     | 10.4 adds staleness check template           |
| storesSummary                 | `platformSummary/storesSummary`                                  | 10.3, 10.4 iterate via summary (1 read)      |
| Feature Flags                 | `src/config/features.ts` + `functions/src/constants/features.ts` | All features flag-gated                      |

---

**Author:** Cascade (Lead Architect)  
**Created:** February 24, 2026
