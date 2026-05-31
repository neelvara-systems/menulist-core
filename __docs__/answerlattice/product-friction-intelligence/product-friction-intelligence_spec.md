# Product Friction Intelligence — Specification

> **Version:** 1.1.0
> **Status:** IMPLEMENTED AND ENABLED WITH CAPS
> **Created:** 2026-03-09
> **Last Updated:** 2026-05-22
> **Feature Flag:** `ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE`
> **Expansion Item:** #5 in `answerlattice-expansion-tracker.md`

---

## §1 — Problem Statement

SaaS founders using Answerlattice receive support signals (tickets, negative chat feedback, escalations) but have **no way to see WHERE their product is failing users**. They can see individual tickets and mutation proposals, but cannot answer:

1. Which product feature causes the most support load?
2. What are users confused about most frequently?
3. Is a new confusion pattern emerging?
4. Did a recent product change increase support friction?
5. Are things getting better or worse over time?

**Original gap:** Answerlattice collected signals → clustered by entity → generated mutation proposals, but did not surface the meta-question: "fix this product area."

**Current runtime:** This is implemented through capped Answerlattice nightly aggregation and summary-backed GovernanceHub friction UI.

---

## §2 — Solution: Support Signal Intelligence

Product Friction Intelligence extracts **product-level friction signals** from existing support interactions. It operates exclusively on support signals — NOT product analytics, NOT user telemetry, NOT session data.

### What It Is
- A nightly aggregation pipeline that computes friction metrics per entity
- A weekly insight generator that produces a prioritized friction report
- A simple "Friction" tab in GovernanceHub showing top friction signals

### What It Is NOT
- An analytics dashboard (no charts, no filters, no queries)
- A product analytics tool (no funnels, no retention, no adoption)
- A real-time system (nightly batch, weekly insights)

---

## §3 — ICP Alignment

### Primary ICP: SaaS Founder / Head of Support

**Pain points addressed:**
1. "I see tickets but don't know which product area is broken"
2. "I can't tell if things are getting better or worse"
3. "New confusion patterns emerge silently"
4. "I waste time investigating individual tickets instead of seeing patterns"

### How Founders Use This

```
Every week, founder opens GovernanceHub → Friction tab

Sees:

Top Frictions This Week

1. Stripe Integration Setup
   241 support questions  │  31% escalation  │  ↑ 42% vs last week
   
2. Webhook Configuration
   198 support questions  │  27% escalation  │  → stable

3. Team Permissions
   141 support questions  │  24% escalation  │  ↓ 15% improving

⚠️ Emerging: OAuth Redirect Configuration
   New topic, 38 questions in 5 days, 45% escalation
```

**Zero cognitive load.** No analysis required. Just read and act.

---

## §4 — Feature Components

### 4.1 — Friction Daily Aggregation (Nightly)

**What:** Aggregate signal events into daily entity-level stats.

**Input:** `answerlattice_signalEvents` (existing)
**Output:** `answerlattice_frictionDailyStats` (new collection)

**Per entity, per day:**
- Query count (total signals for this entity today)
- Escalation count
- Low confidence count (canonical misses where entity matched but answer failed)
- Ticket count, chat negative count
- Weighted friction score

**Why daily:** Enables trend detection (compare day-over-day, week-over-week).

### 4.2 — Friction Score Engine

**Formula:**
```
frictionScore = queryVolume × (1 + escalationRate + lowConfidenceRate)
```

**Components:**
- `queryVolume`: Total signal count for entity in period
- `escalationRate`: escalationCount / totalCount (0-1)
- `lowConfidenceRate`: lowConfidenceCount / totalCount (0-1)

**Entity type grouping:**
- Entities of type `feature` → Feature Friction
- Entities of type `workflow` → Workflow Friction
- Entities of type `integration` → Integration Friction
- Entities of type `error` → Error Pattern
- Other types → General Friction

### 4.3 — Trend Detection (Nightly)

**Method:** Compare last 7 days vs previous 7 days for each entity.

```
trendScore = last7days / previous7days

trendScore > 1.5 → ↑ RISING (emerging friction)
trendScore > 1.0 → → STABLE  
trendScore < 0.7 → ↓ IMPROVING
trendScore = 0   → NEW (no previous data)
```

**Emerging topic detection:** If an entity has 10+ signals in last 7 days but <3 in previous 7 days → flag as "Emerging."

### 4.4 — Weekly Friction Insight (Weekly Gemini Call)

**What:** AI-generated summary of top friction entities for the week.

**Input:** `answerlattice_frictionDailyStats` (last 7 days + previous 7 days)
**Output:** `platformSummary/friction_{tId}_{sId}` (single document)

**Generated content:**
- Top 5 friction entities with severity ranking
- Trend direction for each (rising/stable/improving)
- Emerging topics (new friction signals)
- Suggested actions (tied to entity type)
- Overall friction health (one word: HIGH / MODERATE / LOW)

**Cost:** 1 Gemini call per tenant per week. ~$0.001/tenant/week.

### 4.5 — GovernanceHub Friction Tab (UI)

**What:** New tab in existing GovernanceHub showing friction insights.

**Data source:** `platformSummary/friction_{tId}_{sId}` (1 Firestore read)

**Display:**
1. Friction health badge (HIGH/MODERATE/LOW)
2. Top 5 friction entities with counts, escalation %, trend arrow
3. Emerging topics section (if any)
4. AI-generated weekly summary
5. Last updated timestamp

**NOT included (per doctrine):**
- No charts/graphs
- No filters
- No date range pickers
- No export functionality

---

## §5 — User Stories

### US-1: View Top Friction Topics
**As a** SaaS founder using Answerlattice,
**I want to** see which product entities cause the most support friction,
**So that** I know where to improve my product.

**Acceptance criteria:**
- Top 5 entities ranked by friction score
- Each shows: entity name, signal count (7d), escalation rate, trend direction
- Updated nightly

### US-2: Detect Emerging Confusion
**As a** SaaS founder,
**I want to** be alerted when a new confusion pattern emerges,
**So that** I can investigate before it becomes a major issue.

**Acceptance criteria:**
- Entities with 10+ signals in last 7 days but <3 in previous 7 days flagged as "Emerging"
- Shown in dedicated "Emerging" section

### US-3: Track Friction Trends
**As a** SaaS founder,
**I want to** see if friction is increasing or decreasing per entity,
**So that** I know if my product improvements are working.

**Acceptance criteria:**
- Trend arrow (↑ rising, → stable, ↓ improving) per entity
- Based on 7-day vs previous 7-day comparison

### US-4: Read Weekly Friction Summary
**As a** SaaS founder,
**I want to** read an AI-generated summary of friction this week,
**So that** I get the "what changed?" answer without manual analysis.

**Acceptance criteria:**
- AI summary covers top frictions, emerging topics, suggested actions
- Generated weekly (follows weekly narrative pattern)
- 1 Gemini call per tenant per week

---

## §6 — Scope Boundaries

### In Scope (v1)
- Nightly friction aggregation per entity
- Friction score calculation
- 7-day trend detection
- Emerging topic detection
- Weekly AI insight generation
- GovernanceHub "Friction" tab

### Out of Scope (v1)
- Workflow step-level failure detection (deferred to v2, needs more signal data)
- Cross-tenant friction intelligence (v1 = per-workspace only)
- Feature friction mapping beyond entity type grouping
- Page context correlation (requires `ENABLE_ANSWERLATTICE_CONTEXT_AWARE` + sufficient data)
- Notification/alerting for friction spikes
- Historical friction trends beyond 90 days

### Out of Scope (PERMANENT — per doctrine)
- Product analytics dashboards
- User session replay
- Feature adoption funnels
- Embedding-based topic clustering
- External analytics services (BigQuery, Amplitude, etc.)

---

## §7 — Tier Classification

Per expansion tracker:

| Component | Tier | Rationale |
|-----------|------|-----------|
| Friction daily aggregation | **A — Must Exist** | Foundation for all intelligence |
| Friction score engine | **A — Must Exist** | Enables ranking and prioritization |
| Trend detection | **A — Must Exist** | Answers "getting better or worse?" |
| Emerging topic detection | **B — Strong Advantage** | Early warning system |
| Weekly AI insight | **B — Strong Advantage** | Reduces cognitive load |
| GovernanceHub friction tab | **A — Must Exist** | Visibility layer for all intelligence |
| Workflow step failure | **C — Future Moat** | Deferred to v2 |
| Cross-tenant intelligence | **C — Future Moat** | Deferred indefinitely |

---

## §8 — Industry Research Summary

### Intercom (Pioneer 2025 — Fin 3)
- **Topics Explorer**: ML groups conversations into topics/subtopics
- **Topic Trends**: Weekly snapshots compared against 12-week baseline
- **Insight cards**: AI-generated "what changed and why" with real examples
- **Key insight**: Weekly cadence, topic-level aggregation, anomaly detection

### Zendesk (Intelligent Triage)
- **Intent taxonomy**: ~150 prebuilt intents per industry
- **Confidence levels**: High/Medium/Low per classification
- **Dashboard**: Overview + Intent + Language + Sentiment tabs

### Answerlattice's Advantage
- **Entity graph IS the taxonomy** — no ML classification needed
- **Deterministic scoring** — reproducible, auditable, no LLM required for ranking
- **Nightly batch** — faster than Intercom's weekly, cheaper than real-time
- **Zero external dependencies** — pure Firestore, no BigQuery/Vector DB
