# Founder Trust Layer — Feature Hub

> **Version:** 1.0.0
> **Status:** ✅ IMPLEMENTED — 2026-03-09
> **Created:** 2026-03-09
> **Feature Flag:** `ENABLE_CANONICA_TRUST_METRICS`
> **Expansion Item:** #10 (Canonica ICP Coverage Index)
> **Tracker:** `__docs__/canonica/canonica-expansion-tracker.md`

---

## Identity

The Founder Trust Layer answers **one question**:

> "Can I trust the system to answer users correctly?"

This is NOT analytics. NOT dashboards. NOT business intelligence.
It is **founder confidence in AI answer quality** — expressed as 4 numbers.

---

## Architecture Summary

```
┌──────────────────────────────────────────────────────────────────────┐
│                    EXISTING CANONICA PIPELINE                        │
│                                                                      │
│  aiSearchHistory ──→ coverageKPI (nightly step 4)                   │
│  signalEvents ──→ driftDetection (nightly step 1)                   │
│  canonicalAnswers ──→ confidence auto-adjust (nightly step 7)       │
│  mutationProposals ──→ impact tracking (nightly step 6)             │
│  EntityHealthScore.tsx (client-side, real-time)                     │
└──────────┬───────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────┐
│              NEW: FOUNDER TRUST LAYER                                │
│                                                                      │
│  NIGHTLY STEP (extends canonicaNightly.ts)                          │
│  Reads: aiSearchHistory + canonicalAnswers + signalEvents           │
│  Computes: 4 trust metrics + top failing entities                   │
│  Writes: platformSummary/trustMetrics_{tId}_{sId} (1 write)        │
│                                                                      │
│  UI: FounderTrustDashboard.tsx (GovernanceHub tab)                  │
│  Reads: platformSummary/trustMetrics_{tId}_{sId} (1 read)          │
│                                                                      │
│  ZERO new collections. ZERO new Cloud Functions.                    │
│  Extends existing nightly batch. ~$0.002/tenant/night.              │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4 Trust Metrics (Intercom-Validated)

| Metric              | Formula                            | Source                                  | Industry Reference          |
| ------------------- | ---------------------------------- | --------------------------------------- | --------------------------- |
| **Coverage Rate**   | canonical hits / total queries     | `aiSearchHistory.canonical`             | Intercom "Involvement Rate" |
| **Resolution Rate** | (queries − escalations) / queries  | `aiSearchHistory` + `signalEvents`      | Intercom "Resolution Rate"  |
| **Drift Rate**      | drifted answers / active answers   | `canonicalAnswers.governance.driftFlag` | Zendesk "Content Quality"   |
| **Entity Health**   | avg weighted score across entities | `EntityHealthScore` computation         | Intercom "CX Score"         |

**Escalation Classification** (deterministic, zero-cost — derived from existing data):

- `KNOWLEDGE_GAP` — entity matched but no canonical answer
- `LOW_CONFIDENCE` — answer confidence below threshold
- `ENTITY_MISMATCH` — entity resolved but wrong
- `RETRIEVAL_FAILURE` — no entity match at all
- `USER_REQUESTED` — explicit "talk to human" (excluded from failure metrics)

---

## Key Design Decisions

| Decision              | Choice                                   | Rationale                                                     |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| New collections       | **0**                                    | All data derivable from existing collections                  |
| Aggregation frequency | **Nightly**                              | Matches Canonica's batch architecture                         |
| Storage               | **1 platformSummary doc** per tenant     | Single read for dashboard                                     |
| Dashboard complexity  | **4 numbers + 5 failing entities**       | Industry: founders want 3-5 metrics                           |
| Event instrumentation | **REJECT ChatGPT's proposal**            | `aiSearchHistory` + `signalEvents` already capture everything |
| Entity health storage | **Client-side computation**              | Already built in `EntityHealthScore.tsx`                      |
| TTL/retention         | **Uses existing signal TTL (12 months)** | No new retention policies needed                              |

---

## ChatGPT Accuracy Assessment

**Overall: ~55%**

| Category                       | Assessment                                                                  |
| ------------------------------ | --------------------------------------------------------------------------- |
| **Core insight**               | ✅ Correct — founders need trust, not analytics                             |
| **5 infrastructure layers**    | ❌ Mostly redundant — 3 of 5 already exist in Canonica                      |
| **6 new collections**          | ❌ Wrong — 0 new collections needed                                         |
| **Event instrumentation**      | ❌ Redundant — `aiSearchHistory` already captures events                    |
| **6-hourly aggregation**       | ❌ Over-engineering — nightly is correct for Canonica                       |
| **Entity reliability scoring** | ✅ Valid concept — but already built as `EntityHealthScore.tsx`             |
| **Escalation classification**  | ✅ Valid — maps cleanly to existing Canonica concepts                       |
| **Retention governance**       | ✅ Valid concept — but already implemented (12-month TTL)                   |
| **Query hashing**              | ❌ Wrong — loses diagnostic value, Canonica needs raw queries for debugging |
| **BigQuery archival**          | ❌ Overkill — not needed at Canonica's scale                                |

---

## Documents

| Document                                                                         | Audience   | Purpose                     |
| -------------------------------------------------------------------------------- | ---------- | --------------------------- |
| [README.md](./README.md)                                                         | Everyone   | Hub + architecture overview |
| [founder-trust-layer_spec.md](./founder-trust-layer_spec.md)                     | PM/CEO     | Business requirements       |
| [founder-trust-layer_impl.md](./founder-trust-layer_impl.md)                     | Developers | Technical blueprint         |
| [founder-trust-layer_firebase.md](./founder-trust-layer_firebase.md)             | DevOps     | Firebase cost tracking      |
| [founder-trust-layer_marketing.md](./founder-trust-layer_marketing.md)           | Sales      | Pitch collateral            |
| [founder-trust-layer_website.md](./founder-trust-layer_website.md)               | Marketing  | Landing page content        |
| [founder-trust-layer_helpdoc.md](./founder-trust-layer_helpdoc.md)               | Customers  | Help documentation          |
| [founder-trust-layer_mobile-support.md](./founder-trust-layer_mobile-support.md) | Mobile     | Mobile assessment           |

---

## Dependencies

- **Requires:** `ENABLE_CANONICA_ONTOLOGY` + `ENABLE_CANONICA_CANONICAL_ANSWERS` + `ENABLE_CANONICA_DRIFT_DETECTION`
- **Benefits from:** `ENABLE_CANONICA_FRICTION_INTELLIGENCE` (enriches friction data)
- **Feeds:** Expansion Item #5 (Product Friction Intelligence — shares daily stats)

---

## Files

### Implemented Files

1. `src/components/templates/canonica/governance/FounderTrustDashboard.tsx` — Trust dashboard UI
2. `src/database/canonica/trustMetrics.ts` — One-read DAL for `platformSummary/trustMetrics_{tId}_{sId}`
3. `src/types/canonica/index.ts` — `CanonicaTrustMetrics` types
4. `functions-canonica/src/canonica/canonicaNightly.ts` — Trust metrics aggregation step
5. `src/config/features.ts` — Frontend `ENABLE_CANONICA_TRUST_METRICS` flag
6. `functions-canonica/src/constants/features.ts` — Cloud Functions `ENABLE_CANONICA_TRUST_METRICS` flag
7. `__docs__/canonica/founder-trust-layer/` — Documentation set
8. `_archive/chatgpt-review.md` — ChatGPT conversation review
