# Founder Trust Layer — Product Specification

> **Version:** 1.0.0
> **Status:** DOCUMENTED — Implementation Pending
> **Created:** 2026-03-09
> **Feature Flag:** `ENABLE_ANSWERLATTICE_TRUST_METRICS`

---

## §1 — Problem Statement

SaaS founders who deploy Answerlattice need to know **one thing**: Is the AI answering users correctly?

Without observability:
- Founders distrust AI and override answers manually
- Knowledge gaps go undetected for weeks
- Adoption collapses because founders can't prove the system works
- Drift silently degrades answer quality

Industry data (Intercom, Zendesk, SpotsaaS research):
- B2B SaaS self-service deflection rate averages 15-25%
- Great KB content achieves 40-60% deflection
- Founders who see metrics are 3x more likely to maintain KB content
- 88% of SaaS support leaders say "knowing where AI fails" is their top priority

---

## §2 — Solution

A **Trust Dashboard** — not an analytics dashboard — that shows 4 numbers:

1. **Coverage Rate** — "What % of questions does AI handle?"
2. **Resolution Rate** — "What % of handled questions does AI resolve without escalation?"
3. **Drift Rate** — "What % of answers are potentially outdated?"
4. **Entity Health** — "What's the average health of my knowledge entities?"

Plus a **Top 5 Failing Entities** list that tells founders exactly where to focus.

---

## §3 — User Stories

### 3.1 — Founder Checks Trust Dashboard

**As** a SaaS founder using Answerlattice,
**I want** to see 4 trust metrics on my governance dashboard,
**So that** I can quickly determine if AI answers are reliable.

**Acceptance criteria:**
- Coverage, Resolution, Drift, Entity Health displayed as large numbers
- Color-coded: green (healthy), amber (attention), red (critical)
- Updated nightly (data from last 24 hours)
- Single Firestore read to load dashboard

### 3.2 — Founder Identifies Weak Areas

**As** a SaaS founder,
**I want** to see the top 5 entities where AI is failing,
**So that** I can improve documentation for those areas.

**Acceptance criteria:**
- Top 5 entities sorted by failure score (worst first)
- Each shows: entity name, type, query count, escalation count, reliability %
- Only shows entities with 20+ queries (filters noise)
- Clicking entity navigates to entity detail view

### 3.3 — Founder Tracks Improvement Over Time

**As** a SaaS founder,
**I want** to see how trust metrics have changed over the past 7 days,
**So that** I can verify that my KB improvements are working.

**Acceptance criteria:**
- 7-day trend indicator (↑ improving, → stable, ↓ degrading) for each metric
- Previous value shown for comparison
- No charts — just numbers and arrows

---

## §4 — Metrics Definition

### 4.1 — Coverage Rate

```
Coverage Rate = canonical_hits / total_queries × 100
```

- **Source:** `aiSearchHistory.canonical` field (already logged per query)
- **Window:** Last 24 hours (aligned with nightly aggregation)
- **Healthy:** ≥ 70%
- **Attention:** 40-69%
- **Critical:** < 40%

### 4.2 — Resolution Rate

```
Resolution Rate = (total_queries - escalated_queries) / total_queries × 100
```

- **Escalated query:** Any query where `confidence === 'low'` OR signal type === 'escalation' in last 24h
- **Source:** `aiSearchHistory.confidence` + `answerlattice_signalEvents` (type = 'escalation')
- **Healthy:** ≥ 85%
- **Attention:** 70-84%
- **Critical:** < 70%

### 4.3 — Drift Rate

```
Drift Rate = drifted_active_answers / total_active_answers × 100
```

- **Source:** `answerlattice_canonicalAnswers` where `governance.driftFlag === true`
- **Healthy:** ≤ 5%
- **Attention:** 6-15%
- **Critical:** > 15%
- **Note:** Lower is better (inverted color scale)

### 4.4 — Entity Health Score

```
Entity Health = average(entity_health_scores) for all active entities
```

- **Source:** Computed identically to `EntityHealthScore.tsx` (coverage 40%, drift 30%, signals 20%, index 10%)
- **Computed server-side** during nightly batch (not client-side for dashboard)
- **Healthy:** ≥ 80
- **Attention:** 60-79
- **Critical:** < 60

---

## §5 — Escalation Classification

Every query that does NOT resolve via canonical answer is classified:

| Classification | Condition | Meaning | Counts as Failure? |
|---|---|---|---|
| `KNOWLEDGE_GAP` | Entity matched, no canonical answer | Documentation incomplete | ✅ Yes |
| `LOW_CONFIDENCE` | Answer confidence < 0.6 | Retrieval relevance weak | ✅ Yes |
| `ENTITY_MISMATCH` | Entity resolved but follow-up triggered | Wrong entity matched | ✅ Yes |
| `RETRIEVAL_FAILURE` | No entity match at all | Entity missing from ontology | ✅ Yes |
| `USER_REQUESTED` | Explicit "talk to human" request | User preference | ❌ No |

Classification is **deterministic** — derived from existing data in `aiSearchHistory` and `CanonicalRetrievalResult`. Zero additional processing.

---

## §6 — Top Failing Entities

Ranked list of entities where AI performs worst.

**Failure Score Formula:**
```
failureScore = (escalations × 3) + (entityMismatches × 3) + (lowConfidence × 2) + (followUps × 1)
```

**Filters:**
- Minimum 20 queries in 24h window (prevents noise from low-volume entities)
- Maximum 5 entities displayed
- Sorted descending by failure score

**Data source:** Derived from `aiSearchHistory.matchedEntityIds` + `confidence` + `answerlattice_signalEvents`

---

## §7 — Dashboard UI Specification

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM TRUST                                    [date] │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Coverage │ │Resolution│ │  Drift   │ │  Health  │  │
│  │   92%    │ │   88%    │ │    3%    │ │   81     │  │
│  │  ↑ +4%  │ │  → 0%   │ │  ↓ +1%  │ │  ↑ +3   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                         │
│  TOP FAILING AREAS                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 1. Billing Upgrade        76%  │ 134 queries   │   │
│  │ 2. Slack Integration      72%  │  89 queries   │   │
│  │ 3. API Rate Limits        69%  │  67 queries   │   │
│  │ 4. Team Permissions       81%  │  45 queries   │   │
│  │ 5. Export CSV             78%  │  32 queries   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ESCALATION BREAKDOWN                                   │
│  Knowledge Gap: 28%  |  Low Confidence: 34%            │
│  Entity Mismatch: 22%  |  Retrieval Failure: 10%       │
│  User Requested: 6%                                    │
└─────────────────────────────────────────────────────────┘
```

### Design Principles

1. **No charts** — Numbers and color codes only
2. **No configuration** — Works out of the box
3. **Single read** — 1 Firestore read loads everything
4. **Calm design** — Green/amber/red, no animations, no badges
5. **Intercom-validated** — Mirrors Fin Performance Dashboard structure

---

## §8 — Feature Flag

```typescript
ENABLE_ANSWERLATTICE_TRUST_METRICS: true
```

**Requires:**
- `ENABLE_ANSWERLATTICE_ONTOLOGY` = true
- `ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS` = true
- `ENABLE_ANSWERLATTICE_DRIFT_DETECTION` = true

**When OFF:** Trust dashboard tab hidden in GovernanceHub. Nightly step skipped. Zero cost.

**Current ready-to-use default:** ON for frontend and Answerlattice functions. The writer stores one compact `platformSummary/trustMetrics_{tId}_{sId}` document per eligible tenant/night.

---

## §9 — Out of Scope

- Complex analytics dashboards
- Time-series charts
- Per-conversation debugging
- Export/sharing functionality
- Email digest of trust metrics
- Automatic degradation alerts
- Custom metric thresholds
- Historical trend graphs (beyond 7-day delta)

These may be added later but are NOT part of the Founder Trust Layer v1.

---

## §10 — Success Criteria

1. Founder can assess system trust in < 5 seconds
2. Dashboard loads in < 1 second (single Firestore read)
3. Zero false alarms (minimum query thresholds filter noise)
4. Drift detection identifies real documentation gaps
5. Founder takes action on failing entities within 24h of detection
