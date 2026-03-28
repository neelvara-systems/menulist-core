# Infrastructure Strength Score (ISS) — Measurement Framework

**Purpose:** Single composite score (0-100) that measures whether MenuList is becoming infrastructure or remaining a tool.  
**Type:** Strategic measurement framework  
**Alignment:** Constitution Doc 06 (Internal Tracking), Doc 15 (Category Dominance), Doc 17 (Infrastructure Compounding)  
**Source:** ChatGPT Strategic Session (March 2026) → Cascade Review + Codebase Cross-Check  
**Last Updated:** 2026-03

---

## Why ISS Exists

Most product metrics measure **usage** (logins, clicks, feature adoption). Infrastructure metrics measure **dependency** — how painful removal would be.

ISS answers one question:

> **"If MenuList disappeared tomorrow, how much operational risk would our customers face?"**

- ISS 0-40 → "Mild inconvenience" (tool)
- ISS 40-60 → "Noticeable gap" (product-market fit)
- ISS 60-75 → "Significant disruption" (authority forming)
- ISS 75-85 → "Operational risk" (infrastructure gravity)
- ISS 85-100 → "Structural dependency" (default layer)

---

## The 5 Pillars (Each 0-20)

### Pillar 1 — Retention Gravity (0-20)

**What it measures:** Do serious operators stay because they depend on us, not because they like us?

**Metric:** 12-month retention of serious operators.

**Definition of "serious operator":**
- Active structured menu usage (not trial/hobby)
- OBP or QR deployed publicly
- Real business with real customers
- Updated menu at least once in last 90 days

**Scoring:**

| Retention | Score |
|-----------|-------|
| < 75% | 5 |
| 75-80% | 10 |
| 80-85% | 15 |
| 85-90% | 18 |
| > 90% | 20 |

**Why this matters:** Infrastructure must feel risky to remove. If retention is weak, nothing else matters.

**Alignment:** Doc 06 Category C (Authority Maturation) tracks per-store authority. This aggregates it.

---

### Pillar 2 — Canonical Dependency (0-20)

**What it measures:** Has MenuList become the official public identity source?

**Metric:** % of serious operators using OBP as their primary public link (Google website field, Instagram bio, WhatsApp profile, in-store QR).

**Scoring:**

| Canonical Rate | Score |
|---------------|-------|
| < 40% | 5 |
| 40-50% | 10 |
| 50-60% | 15 |
| 60-75% | 18 |
| > 75% | 20 |

**Why this matters:** External dependency creates the strongest removal pain. When Google/Maps/social platforms point to MenuList, removal risks SEO instability and canonical break.

**Alignment:** Doc 15 Rule 1 (Upstream Positioning) — this measures whether we've achieved it.

**Measurement method (pre-scale):** Manual audit of 10 random serious operator accounts weekly. Post-scale: automated check of OBP link presence in store metadata.

---

### Pillar 3 — First-Write Authority (0-20)

**What it measures:** When a business changes prices/availability, does MenuList get updated first?

**Metric:** % of public offer changes that originate inside MenuList before any other system.

**Scoring:**

| First-Write Rate | Score |
|-----------------|-------|
| < 30% | 5 |
| 30-50% | 10 |
| 50-70% | 15 |
| 70-85% | 18 |
| > 85% | 20 |

**Why this matters:** Upstream authority requires being the first-write system. If operators update POS first and treat MenuList as secondary display, we are downstream — a convenience layer, not infrastructure.

**Alignment:** Doc 15 Rule 1 ("MenuList must always be the system that OTHER systems read from"). Doc 17 first-update-behavior metric.

**Measurement method:** Track `modifiedOn` timestamps on project documents. Compare with known POS update patterns. Initially qualitative (onboarding conversations), later quantitative.

---

### Pillar 4 — System Integrity (0-20)

**What it measures:** Is the system boringly reliable? Zero corruption, zero broken publishes.

**Composite of:**
- Publish success rate (% of publishes completing atomically)
- Surface consistency (zero price/availability mismatch across surfaces)
- Data corruption incidents (orphan items, broken inheritance, schema violations)
- Cache drift incidents (stale data visible to customers)

**Scoring:**

| Integrity Level | Score |
|----------------|-------|
| Weekly integrity issues | 5 |
| Occasional minor inconsistencies | 10 |
| Rare issues (< 0.5%) | 15 |
| Near zero (< 0.1%) | 18 |
| Zero visible corruption for 3+ months | 20 |

**Why this matters:** Infrastructure tolerance for bugs is near zero. One price mismatch erodes more trust than 10 features build.

**Alignment:** Doc 06 Categories A (System Health) and E (Output Stability). Existing systems: Scheduler Monitor (`/ops/scheduler`), MCE publish gate, Ops Control Room.

**Already trackable:**
- Publish success → schedulerRunLogs collection
- MCE violations → `_mce` metadata on project documents
- Zero-blank guarantee → Doc 06 Test 3

---

### Pillar 5 — Structural Stability (0-20)

**What it measures:** Is MenuList reducing operational chaos over time?

**Metrics per store (averaged across cohort):**
- Avg price changes per month (trending down = stability)
- Availability toggle frequency (trending down = stability)
- Publish gate errors caught (trending down = cleaner data)
- Category restructure events (trending down = settled structure)

**Scoring:**

| Stability Trend | Score |
|----------------|-------|
| Chaos increasing | 5 |
| No change | 10 |
| Moderate reduction | 15 |
| Strong reduction (≥ 30%) | 18 |
| Stable calm state across cohort | 20 |

**Why this matters:** Infrastructure reduces entropy. If volatility persists or increases with growth, governance is weak.

**Alignment:** Doc 06 Category E (Output Stability) — `menu_mutation_count`, `mutation_reason`, `reversal_count`.

**Already trackable:**
- MOL logs all changes with types and timestamps
- Menu Drift metrics compute 30-day rolling volatility
- Authority Maturation tracks intervention frequency

---

## ISS Interpretation Bands

| ISS Range | Status | Meaning |
|-----------|--------|---------|
| 0-40 | Tool | Customers use us but can leave easily |
| 40-60 | Product-Market Fit | Value proven, authority weak |
| 60-75 | Authority Forming | Dependency signals appearing |
| 75-85 | Infrastructure Gravity | Removal creates operational risk |
| 85-100 | Default Layer | Structural dependency established |

### Strategic Implications by Band

**ISS < 60:** Do NOT raise prices. Do NOT expand geographically. Focus on reliability + canonical adoption.

**ISS 60-75:** Small structured price increases acceptable (10-20%). Push OBP adoption aggressively.

**ISS 75-85:** Confident pricing (20-35%). Begin chain conversations. Consider GBP integration push.

**ISS > 85:** Premium positioning. Annual contracts. Enterprise chain pricing. Cross-vertical expansion becomes rational to evaluate (per Doc 11 Stage 1 gate).

---

## When to Calculate

**Frequency:** Monthly.

**Method:** Manual calculation until 100+ serious operators. Then consider lightweight automation in Ops Control Room.

**Who calculates:** Founder only. This is not a team dashboard.

**Discipline:**
- Do NOT react to weekly fluctuations
- If ISS plateaus for 3 consecutive months → investigate root cause
- If ISS drops > 10 points in a quarter → pause expansion, fix authority layer
- Never let feature usage metrics distract from ISS

---

## Year 1 Targets

| Month | Serious Operators | ISS Target | Key Focus |
|-------|------------------|-----------|-----------|
| 3 | 50-100 | 45-55 | Reliability + OBP adoption |
| 6 | 150-200 | 60-70 | First-write behavior shift |
| 9 | 250-350 | 70-80 | Canonical dependency climb |
| 12 | 300-500 | 75-85 | Authority solidification |

**Year 2 Target:** ISS ≥ 85 with 1,000+ serious operators.

---

## Year 1 Example Scenarios

### Scenario A — Healthy Formation (Month 12)
```
Retention: 88% → 18/20
Canonical: 71% → 18/20
First-write: 63% → 15/20
Integrity: 99.96% → 20/20
Stability: -40% volatility → 18/20
ISS = 89 ← Authority forming. Scale justified.
```

### Scenario B — Surface Growth, Weak Authority (Month 12)
```
Retention: 79% → 10/20
Canonical: 48% → 10/20
First-write: 32% → 10/20
Integrity: 99.7% → 15/20
Stability: flat → 10/20
ISS = 55 ← Growth illusion. Still a tool. Fix before scaling.
```

### Scenario C — Small but Dangerous (Month 12)
```
Retention: 91% → 20/20
Canonical: 76% → 20/20
First-write: 70% → 15/20
Integrity: 99.98% → 20/20
Stability: strong decline → 18/20
ISS = 93 ← Small operator count but deep gravity. Ideal launchpad.
```

**Key insight:** ISS measures inevitability, not growth speed. You can grow 3x users and reduce ISS. That's failure.

---

## What ISS Does NOT Measure

Per Constitution Doc 06 (FORBIDDEN metrics):

- ❌ Feature popularity
- ❌ Time spent in app
- ❌ Click/tap tracking
- ❌ Engagement scores
- ❌ NPS or satisfaction
- ❌ Session duration
- ❌ A/B test results

ISS measures **structural dependency**, not **product satisfaction**.

---

## Relationship to Existing Metrics

| Existing System | ISS Pillar | How It Feeds ISS |
|----------------|-----------|-----------------|
| Scheduler Monitor (`/ops/scheduler`) | Integrity (P4) | Nightly job success tracking |
| MCE Metadata (`_mce` on projects) | Integrity (P4) | Publish gate pass/fail rate |
| MOL (Menu Change Log) | Stability (P5) | Change frequency + type tracking |
| Authority Maturation (nightly CF) | Stability (P5) | Intervention frequency trends |
| Menu Drift (nightly CF) | Stability (P5) | 30-day rolling volatility |
| Store Truth Confidence (nightly CF) | All pillars | Composite per-store reliability |
| OBP Analytics | Canonical (P2) | OBP view/adoption tracking |

Most data needed for ISS already exists in the system. Calculation is aggregation, not new collection.

---

## Implementation Note

**Current stage:** Documentation only. ISS is a manual monthly calculation until operator base reaches meaningful density (100+ serious operators).

**Future implementation (when justified):**
- Add ISS widget to existing Ops Control Room (`/ops`)
- Read from existing collections (schedulerRunLogs, chatAnalytics, storesSummary)
- No new Firestore collections required
- Feature flag: `ENABLE_ISS_TRACKING` (default OFF)

---

**Author:** Cascade (validated from ChatGPT strategic session)  
**ChatGPT Accuracy:** ~85% genuinely new framing. ISS concept did not exist in our docs.  
**Action taken:** Documented as strategic measurement framework. Implementation deferred until operator scale justifies it.
