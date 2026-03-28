# Authority Metrics & Expansion Readiness

**Purpose:** Consolidated operational reference for founder-level KPIs, system validation metrics, expansion readiness criteria, failure mode awareness, and pricing power evolution.  
**Type:** Strategic operational reference  
**Alignment:** ISS Framework, Constitution Docs 06, 11, 15, 17  
**Source:** ChatGPT Strategic Session (March 2026) → Cascade Review + Codebase Cross-Check  
**Last Updated:** 2026-03

---

## Part 1 — Founder Weekly Dominance KPIs (5 Only)

These are NOT growth metrics. These measure whether MenuList is becoming structurally embedded.

Track weekly. Review monthly. React quarterly.

### 1. Serious Operator Count

**Definition:** Active, real businesses with live OBP/QR + structured menu usage.

**"Serious" criteria:**
- Active weekly menu updates OR stable structured usage
- OBP or QR deployed publicly
- Real footfall business (not trial/hobby)
- Updated menu at least once in last 90 days

**Track:** Net serious operators added + total active

### 2. Canonical Dependency Rate

**Definition:** % of serious operators using OBP as their primary public link across all surfaces (Google website field, Instagram bio, WhatsApp profile, in-store QR).

**Measurement:** Manual audit of 10 random accounts weekly until scale justifies automation.

**Target trajectory:**
- Month 3 → 40-50%
- Month 6 → 60%
- Month 12 → 70%+

### 3. First-Write Behavior Ratio

**Definition:** Of all structured price/availability changes this week, what % originated inside MenuList first?

**Why critical:** If operators update POS first and treat MenuList as secondary display, we are downstream — never infrastructure.

**Target:** > 50% by Month 9

### 4. 30-Day Retention (Serious Operators)

**Definition:** % of serious operators active 30 days after onboarding.

**Target:** > 90% consistently

**Signal:** If 30-day retention drops, investigate positioning or reliability problems immediately.

### 5. Structural Stability Trend

**Definition:** Are operators calming down after adopting MenuList?

**Measure:**
- Avg price changes per store per month
- Publish gate errors caught (trending down = cleaner data)
- Availability toggle frequency

**Target:** ≥ 30% volatility reduction over 6 months

---

## Part 2 — System Validation Metrics

These answer: "Is the machine stable and trustworthy?"

Track via existing monitoring systems. Add gaps to ops infrastructure.

### Already Tracked

| Metric | Where | Status |
|--------|-------|--------|
| Nightly scheduler success | `/ops/scheduler` (schedulerRunLogs) | ✅ Production |
| MCE publish gate pass/fail | `_mce` metadata on project docs | ✅ Production |
| Menu change frequency | MOL (menuChangeLog collection) | ✅ Production |
| Authority maturation phase | Nightly CF (authorityMaturation.ts) | ✅ Production |
| Menu drift (30-day rolling) | Nightly CF (menuDriftMetrics.ts) | ✅ Production |
| Store truth confidence | Nightly CF (storeTruthConfidence.ts) | ✅ Implemented |
| Alert escalation | Ops Control Room (`/ops`) | ✅ Production |
| Rate limiting health | Upstash Redis | ✅ Production |
| SAFE_MODE status | `src/lib/ops/safeMode.ts` | ✅ Production |

### Gaps to Address (Future)

| Metric | Why It Matters | Priority | Implementation Approach |
|--------|---------------|----------|------------------------|
| **Surface consistency audit** | Detect price/availability mismatch across QR vs Screens vs OBP | P2 | Nightly CF that samples 10 stores, compares rendered output |
| **Render failure rate** | Track % of page loads that error or show blank | P3 | Sentry error tracking (already integrated) + client-side error boundary logging |
| **Cache drift incidents** | Detect when stale data is visible after publish | P3 | Compare `menuVersion` in Firestore vs what's rendered, log mismatches |
| **Propagation latency** | Time from editor save to live on all surfaces | P2 | Already partially tracked in Doc 17 Layer 6. Formalize in nightly log. |

**Rule:** Do NOT build a metrics dashboard. Track via existing ops infrastructure + nightly scheduler logs. Manual review monthly.

---

## Part 3 — Expansion Readiness Criteria

Per Constitution Doc 11 (Product Evolution Doctrine), cross-vertical expansion from restaurants to other SMB categories is a Year 5+ consideration. But the gate criteria must be defined now.

### 5 Conditions (ALL must be met simultaneously)

#### 1. Structural Penetration Threshold

**Criteria:**
- 5,000-10,000 active serious stores globally with stable retention
- OR clear chain adoption proof (50+ chain groups with 5+ outlets each)
- OR recognized as default in a visible regional segment

**Signal:** Market sees MenuList as "the standard," not "one of many."

#### 2. Distribution Authority Validation

**Criteria:**
- OBP widely adopted as official link (> 75% canonical dependency)
- Structured schema ranks reliably for "[business name] + menu" searches
- External surfaces reference MenuList as canonical source
- GBP sync stable and trusted (when unlocked)

**Signal:** External systems depend on our structured output.

#### 3. Retention Gravity

**Criteria:**
- 12+ month retention > 85% among serious operators
- Chains reluctant to remove system
- Structural dependency behavior (operators fear breaking consistency)

**Signal:** Removal creates operational anxiety, not just inconvenience.

#### 4. Authority Recognition

**Criteria:**
- Agencies recommending MenuList by default for clients
- Chains asking for governance features proactively
- Operators treating MenuList as "official source" (not "QR tool")
- Prospects assuming they should use MenuList (pull, not push)

**Signal:** Narrative shifted from "Do you need a menu tool?" to "Are you using MenuList?"

#### 5. Core System Abstraction Readiness

**Criteria:**
- Structured Offer layer is genuinely abstract (not restaurant-hardcoded at deep layer)
- Pricing logic allows non-food constraints
- Category system allows flexible mapping beyond meal logic
- Multi-language, availability, schema generalized

**Signal:** Expansion doesn't require re-architecture.

### The Expansion Trigger Formula

Expansion becomes rational when:

> **Penetration + Retention + Distribution Authority >> Current Growth Ceiling**

Meaning: Restaurant-only growth flattens because you've saturated reachable segment. NOT because you feel ambitious.

### Realistic Timeline

| Period | Focus |
|--------|-------|
| Years 1-3 | Pure restaurant authority construction |
| Years 4-5 | Evaluate metrics against criteria above |
| Years 5-7 | Consider abstraction IF criteria met |

**Anything earlier is ego-driven, not strategic.**

---

## Part 4 — Failure Mode Awareness

Real derailers for a solo founder building infrastructure. Not theoretical — operational.

### Strategic Derailers

| Derailer | Symptom | Countermeasure |
|----------|---------|---------------|
| **Premature horizontal expansion** | "Let's support salons too" | Hard rule for 24 months: only features that increase removal difficulty |
| **Chasing vanity growth** | Ads for quick signups, celebrating total count | Track only serious operators. Density > volume |
| **Category perception lock** | Market sees "QR menu tool" | Evolve messaging: Official digital menu → Official public menu → Official source of truth |

### Behavioral Derailers (Founder-Level)

| Derailer | Symptom | Countermeasure |
|----------|---------|---------------|
| **Overbuilding governance** | Complex scoring dashboards, analytics creep | Governance must be silent, backend-first, minimal UI |
| **Reacting to every customer request** | Custom themes, promo engines, coupon codes | If request doesn't strengthen structured truth or distribution → reject |
| **Feature velocity addiction** | Shipping for shipping's sake | Measure ISS, not feature count |

### Product / Technical Derailers

| Derailer | Symptom | Countermeasure |
|----------|---------|---------------|
| **Hidden multi-source truth** | POS updates first, MenuList secondary | Push first-write behavior relentlessly. Make editing fastest here |
| **Presentation fragility** | Screens glitch, PDF misaligns, stale cache | Reliability > new features. Always. Boring stability builds authority |
| **Scaling support chaos** | Reactive ticket handling overwhelms product work | Document everything. Template responses. Solve root causes |

### Market Perception Derailers

| Derailer | Symptom | Countermeasure |
|----------|---------|---------------|
| **"QR Tool" perception** | Market says "oh, that QR thing" | Messaging evolution: Menu → Official Page → Canonical Source → Authority Layer |
| **POS vendor pushback** | POS adds basic QR, undercuts pricing | Never compete on POS depth. Position as customer-facing layer only |

### The Structural Risk

The biggest long-term failure scenario:

> You build beautiful governance, but operators still update POS first, Google separately, Instagram separately. First-write behavior never shifts.

If first-write behavior stays below 40% after 12 months, all infrastructure ambition stalls.

**The countermeasure:** Make updating MenuList faster, easier, and safer than any alternative.

---

## Part 5 — Pricing Power Evolution

Pricing must follow authority, not precede it.

> **You raise prices when removal pain > price pain.**

### Pricing by ISS Band

| ISS Band | Strategy | Justification |
|----------|----------|--------------|
| **0-60** (Tool Phase) | Keep pricing simple. No aggressive increases. | Still proving value. Price pain > removal pain. |
| **60-75** (PMF Phase) | Small increase (10-20%). Introduce tier differentiation. | Retention stable. Anchor around reliability. |
| **75-85** (Authority Phase) | Confident increase (20-35%). Shift narrative to "infrastructure." | Removal pain > price pain. Price based on authority, not features. |
| **85-95** (Gravity Phase) | Premium positioning. Multi-location enterprise pricing. | Price increases don't meaningfully affect retention. |
| **95+** (Default Phase) | Premium tiering. Annual contracts. Enterprise agreements. | Structural dependency established. |

### Pricing Principles

1. **Never raise prices while:** First-write < 50%, Canonical < 60%, Retention < 85%
2. **Early underpricing is acceptable** if it accelerates canonical dependency
3. **Price based on:** Risk mitigation + canonical authority + structural governance
4. **Never price based on:** Feature count, AI capability, usage metrics

### The Right Monetization Order

1. Prove reliability
2. Prove retention
3. Prove canonical dependency
4. Prove first-write behavior
5. **Then** increase pricing

Never reverse this order.

---

## Part 6 — What You Should NOT Obsess Over

Per Doc 06 (Internal Tracking — FORBIDDEN metrics):

| Ignore | Track Instead |
|--------|--------------|
| Total signups | Serious operator count |
| Monthly active users | 12-month retention |
| AI usage rate | First-write behavior |
| Image generation count | Canonical dependency |
| Feature adoption charts | Structural stability |
| Social engagement | ISS composite |

---

## Relationship to Existing Documents

| Document | How This Extends It |
|----------|-------------------|
| `strategy/infrastructure-strength-score.md` | ISS provides the numeric foundation. This doc provides operational context. |
| `strategy/authority-control-stack.md` | Control stack defines layers. This doc defines how to measure progress across them. |
| `constitution/06-internal-tracking.md` | Allowed metric categories. ISS pillars fit within them. |
| `constitution/11-product-evolution-doctrine.md` | Stage gates. Expansion criteria here add specific numeric thresholds. |
| `constitution/15-category-dominance-doctrine.md` | Upstream positioning. Founder KPIs measure whether we've achieved it. |
| `constitution/17-infrastructure-compounding-doctrine.md` | Concentration principle. Failure modes here explain why expansion fails. |

---

**Author:** Cascade (validated from ChatGPT strategic session)  
**ChatGPT Accuracy for this topic:** ~60% genuinely useful framing. Failure modes and pricing evolution were the strongest contributions. Metrics overlap with existing Doc 06 but add ISS-based interpretation.  
**Action taken:** Consolidated into single operational reference. No code changes required.
