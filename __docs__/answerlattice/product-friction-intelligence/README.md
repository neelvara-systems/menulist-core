# Product Friction Intelligence — Answerlattice Expansion Item #5

> **Status:** IMPLEMENTED AND ENABLED WITH CAPS
> **Feature Flag:** `ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE`
> **Created:** 2026-03-09
> **Last Updated:** 2026-05-22
> **Expansion Tracker:** `__docs__/answerlattice/answerlattice-expansion-tracker.md` (Item #5)
> **Doctrine Compliance:** Freeze-compliant (additive fields, 1 new collection, extends existing scheduler)

---

## What Is This?

Product Friction Intelligence converts Answerlattice's existing support signals into actionable product friction insights for SaaS founders. It answers: **"Where is my product confusing users?"**

Instead of building dashboards or analytics tools, this system generates a **prioritized insight feed** — structured, severity-ranked friction signals derived from support interactions. Think "automated product advisor" not "analytics software."

---

## Architecture Position

```
Existing Answerlattice Signal Pipeline (built):
  signalEmitter → answerlattice_signalEvents → signalMutation → mutationProposals

Friction Intelligence Layer:
  answerlattice_signalEvents ──→ frictionAggregation (nightly) ──→ answerlattice_frictionDailyStats
                                                                      ↓
  answerlattice_frictionDailyStats ──→ frictionInsightGenerator (weekly) ──→ platformSummary/friction_{tId}_{sId}
                                                                      ↓
  platformSummary/friction_{tId}_{sId} ──→ GovernanceHub "Friction" tab (UI)
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Topic taxonomy | Reuse entity graph (entities ARE topics) | Answerlattice already has 7 entity types. No separate clustering needed. |
| New collections | 1 only: `answerlattice_frictionDailyStats` | Insights stored in existing `platformSummary`. Minimal Firestore footprint. |
| Clustering method | Entity-based (NOT embedding-based) | Answerlattice doctrine: deterministic > LLM. Entity graph is the taxonomy. |
| Processing cadence | Nightly batch (extends answerlatticeNightly.ts) | Industry standard: Intercom uses weekly, we use nightly for faster signals. |
| External services | ZERO (no BigQuery, no Vector DB, no Pub/Sub) | Firebase-only architecture. Signal TTL (12mo) handles retention. |
| Insight generation | Weekly Gemini call (same pattern as weekly narrative) | Cost-effective: 1 AI call/week/tenant. |
| UI surface | New tab in existing GovernanceHub | No new routes, no separate dashboards. |
| Workflow step failure | DEFERRED to v2 | Low ROI for v1. Procedure steps exist but step-level failure detection needs more signal data. |

---

## Document Index

| Document | Audience | Purpose |
|----------|----------|---------|
| `README.md` (this file) | Everyone | Index, architecture overview, key decisions |
| `product-friction-intelligence_spec.md` | CEO/PM | Business requirements, user stories, ICP alignment |
| `product-friction-intelligence_impl.md` | Developers | Technical blueprint, data model, pipelines, file structure |
| `product-friction-intelligence_firebase.md` | Developers | Firestore operations, cost analysis, indexes |
| `product-friction-intelligence_marketing.md` | Sales/Marketing | Pitch deck, positioning, competitive |
| `product-friction-intelligence_website.md` | Public | Landing page content, SEO |
| `product-friction-intelligence_helpdoc.md` | Customers | Customer-facing help documentation |
| `product-friction-intelligence_mobile-support.md` | Mobile | Mobile admission test, mobile UX |
| `_archive/chatgpt-review.md` | Internal | ChatGPT conversation analysis + accuracy rating |

---

## ChatGPT Accuracy Rating: ~45%

ChatGPT proposed 6 components with 68 capability blocks. After deep codebase audit:

- **~55% was already built** — Signal aggregation, entity clustering, mutation engine, coverage KPI, drift detection, nightly scheduler all exist
- **~20% was correctly identified as missing** — Daily aggregation, friction scoring, trend detection, founder insight feed
- **~25% was wrong or over-engineered** — BigQuery export, Vector DB, separate `supportSignals` collection (already exists), `workspaceId` model (should be tId/sId), real-time processing

---

## Dependencies

- **Required:** `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION: true` (signal events must be flowing)
- **Required:** `ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS: true` (for hit/miss coverage data)
- **Optional:** `ENABLE_ANSWERLATTICE_CONTEXT_AWARE: true` (enriches signals with page/feature context)
- **Extends:** `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` (adds Step 9 + Step 10)

## Current Runtime Guardrails

- Enabled in both frontend and Answerlattice functions flags.
- Runs inside the existing `answerlatticeNightly` scheduler, not a separate scheduled job.
- Uses capped daily signal/search-history windows and writes compact `platformSummary/frictionSnapshot_*` / `platformSummary/friction_*` documents for UI reads.
- Governance UI reads summaries only; it does not scan `answerlattice_signalEvents` or `aiSearchHistory` on page load.
- Friction is product support intelligence only. It does not track session replay, product analytics, or user behavior telemetry.

---

## What Must NOT Be Built

Per Answerlattice doctrine and this feature's scope:

- ❌ Analytics dashboards with charts/filters/queries
- ❌ Session replay or user product telemetry
- ❌ Feature adoption funnels
- ❌ Cohort analysis
- ❌ Real-time streaming processing
- ❌ External Vector DB or BigQuery
- ❌ Cross-tenant intelligence (v1 = per-workspace only)
- ❌ Embedding-based topic clustering (entity graph IS the taxonomy)
