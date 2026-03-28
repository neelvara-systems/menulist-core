# 📄 DOCUMENT 2: FEATURE CATALOG

**File Name:** 02-FEATURE-CATALOG.md  
**Last Updated:** 2026-01-11  
**Status:** 🔒 LOCKED — All Features Production Ready  
**Audience:** Product, Engineering, QA

---

## PURPOSE

This document defines every feature in MenuListAi as a **production system** — not ideas, not roadmap items, not experiments.

If a feature is not listed here, it does not exist.

---

## FEATURE OVERVIEW

| #    | Feature                            | Business Objective              | Status |
| ---- | ---------------------------------- | ------------------------------- | ------ |
| F-01 | Continuous Menu Intelligence (CMI) | Silent decision engine          | ✅     |
| F-02 | Decision Blocks                    | Customer-facing recommendations | ✅     |
| F-03 | Digital Screens                    | Zero-effort public display      | ✅     |
| F-04 | Physical Surfaces                  | Printed authority (PONR)        | ✅     |
| F-05 | Staff Prompt                       | Standardized human speech       | ✅     |
| F-06 | Social Content (Today)             | External amplification          | ✅     |

---

## F-01 — CONTINUOUS MENU INTELLIGENCE (CMI)

### Feature ID

`F-01`

### Business Objective

To silently observe customer behavior and compute item-level confidence scores that drive all downstream surfaces.

### Target User / Persona

- **Primary:** System (autonomous)
- **Secondary:** Owner (indirect beneficiary)

### Key Characteristics

- Runs nightly at 02:30 UTC
- No UI exposed to owners
- No manual triggers
- No explanations

### Confidence Calculation

```
Confidence = f(views, clicks, engagement, stability)
```

**Tiers:**
| Tier | Score Range | Meaning |
|------|-------------|---------|
| VERY_HIGH | ≥ 0.8 | Extremely consistent |
| HIGH | 0.65–0.79 | Strong signal |
| MODERATE | 0.5–0.64 | Noticeable pattern |
| LOW | 0.35–0.49 | Weak signal |
| VERY_LOW | < 0.35 | Insufficient data |

### Slow Build / Fast Break Rule

- **Build:** Confidence rises slowly (requires sustained evidence)
- **Break:** Confidence drops fast (single anomaly can trigger)

### Output

- `menuIntelligence/{tId}_{sId}_{projectId}` document
- Item-level confidence scores
- Suppression windows
- Time eligibility

### Dependencies

| Depends On | Description                   |
| ---------- | ----------------------------- |
| Analytics  | Raw customer behavior events  |
| Menu Data  | Item availability, categories |

### API / Database

- **Collection:** `menuIntelligence`
- **Document ID:** `{tId}_{sId}_{projectId}`
- **No public API** (internal scheduler only)

---

## F-02 — DECISION BLOCKS

### Feature ID

`F-02`

### Business Objective

To help customers decide faster (60s → 15s) by surfacing the right items at the top of the menu.

### Target User / Persona

- **Primary:** Walk-in customer (QR scan)
- **Secondary:** Owner (trust observer)

### Block Types

| Block      | Purpose      | Confidence |
| ---------- | ------------ | ---------- |
| Popular    | Social proof | ≥ 0.65     |
| Quick Pick | Speed        | ≥ 0.65     |
| Best Value | Budget       | ≥ 0.65     |

### Scoring Formulas

**Popular:**

```
score = (0.4 × clicks7d) + (0.3 × pageViews7d) + (0.2 × engagementRate) + (0.1 × decisionBlockClicks7d)
```

**Quick Pick:**

```
score = (0.35 × prepTimeFactor) + (0.35 × orderFreq) + (0.15 × clicks7d) + (0.15 × engagement)
```

**Best Value:**

```
score = (0.4 × valueRatio) + (0.3 × orderVolume) + (0.2 × clicks7d) + (0.1 × engagement)
```

### Display Rules

- Max 3 blocks per menu
- Max 4 items per block
- No duplicates across blocks
- Availability filter only

### Dependencies

| Depends On | Description       |
| ---------- | ----------------- |
| CMI        | Confidence scores |
| Menu Data  | Item availability |

### API / Database

- **Collection:** `decisionBlocks`
- **Document ID:** `{tId}_{sId}_{projectId}`
- **Public API:** `/api/decision-blocks/{projectId}`

---

## F-03 — DIGITAL SCREENS

### Feature ID

`F-03`

### Business Objective

To act as the highest-visibility public authority surface inside the store.

### Target User / Persona

- **Primary:** Walk-in customer
- **Secondary:** Owner (trust observer)

### Workflow

1. Nightly campaign summary selects screen-eligible items (confidence ≥ 0.7)
2. Screen renders cached content
3. Monotonicity enforced (no downgrade mid-day)
4. Evergreen fallback guarantees zero-blank

### Key Rules

- ❌ No metrics
- ❌ No playlist controls
- ❌ No scheduling UI
- ❌ No explanations
- ✅ Owner can add up to 3 temporary uploads (14-day expiry)

### 4-Layer Slide Stack

1. **Campaign Slides** (confidence ≥ 0.7)
2. **Evergreen Slides** (always available)
3. **Brand Fallback** (store info)
4. **System Fallback** (MenuList branding)

### Success Metrics

| Metric            | Purpose                  |
| ----------------- | ------------------------ |
| Blank-screen rate | Embarrassment prevention |
| Content stability | Trust                    |

### Dependencies

| Depends On       | Description       |
| ---------------- | ----------------- |
| CMI              | Confidence scores |
| Campaign Summary | Selected items    |

### API / Database

- **Public URL:** Tokenized screen URL
- **Rendering:** Cached-first
- **Reads:** Summary doc only

---

## F-04 — PHYSICAL SURFACES

### Feature ID

`F-04`

### Business Objective

To embed MenuList recommendations into irreversible physical artifacts.

### Target User / Persona

- **Primary:** Walk-in customer
- **Secondary:** Owner (authority acceptance)

### Supported Surfaces

| Surface         | Size   | Confidence |
| --------------- | ------ | ---------- |
| Tent Card       | A6/A5  | ≥ 0.7      |
| Counter Sticker | 8×8 cm | ≥ 0.8      |

### Workflow

1. Eligible items selected (confidence ≥ 0.7 / 0.8)
2. Single declarative sentence generated
3. PDF/PNG rendered client-side
4. QR auto-attached

### Key Rules

- ❌ No template choice
- ❌ No copy editing
- ❌ No analytics
- ❌ No variants

### Dependencies

| Depends On     | Description       |
| -------------- | ----------------- |
| CMI            | Confidence scores |
| Digital Screen | Validation        |

### API / Database

- **Generation:** Client-only
- **Collections:** None (zero Firebase cost)
- **Output:** PDF/PNG download

---

## F-05 — STAFF PROMPT MODE

### Feature ID

`F-05`

### Business Objective

To standardize human speech at the moment of customer interaction.

### Target User / Persona

- **Primary:** Owner (reader)
- **Secondary:** Staff (mirrors owner speech)

### Workflow

1. Item qualifies (confidence ≥ 0.8, stability ≥ 10 days)
2. Appears in Today tab
3. Owner reads → repeats verbally
4. Staff mirrors naturally

### Prompt Structure (Immutable)

```
"Most people take the ___."
```

### 8 Eligibility Gates

1. Confidence ≥ 0.8
2. Stability ≥ 10 days
3. Prior validation on other surfaces
4. Item available
5. No stock volatility (7 days)
6. Not alcoholic
7. Modifier count ≤ 3
8. Runtime availability check

### Inertia Rules

| Rule                 | Value     |
| -------------------- | --------- |
| Min consecutive days | 3         |
| Max days/week        | 2         |
| Substitution         | Forbidden |

### Key Prohibitions

- ❌ No staff notifications
- ❌ No compliance tracking
- ❌ No owner override
- ❌ No explanation

### Dependencies

| Depends On        | Description      |
| ----------------- | ---------------- |
| Decision Blocks   | Prior validation |
| Digital Screens   | Prior validation |
| Physical Surfaces | Prior validation |

### API / Database

- **Storage:** `CampaignsSummaryDocument.staffPrompt`
- **Computation:** Nightly
- **Runtime:** Availability check

---

## F-06 — SOCIAL CONTENT (TODAY SURFACE)

### Feature ID

`F-06`

### Business Objective

To amplify MenuList decisions externally without becoming marketing software.

### Target User / Persona

- **Primary:** Owner
- **Secondary:** Customers (indirect)

### Campaign Types

**Active (5):**

- Meal Push
- Bestseller Boost
- Slow Item Rescue
- Festival Spike
- New Item Launch

**Passive (4):**

- Today's Special
- Weekend Pick
- Now Available
- Menu Highlight (fallback)

### Workflow

1. CMI determines campaign eligibility
2. One PRIMARY campaign selected/day
3. Optional passive operational campaigns shown
4. One execution surface recommended
5. Owner exports or skips

### Execution Surfaces

- WhatsApp Status
- WhatsApp Message
- Printable Poster
- QR Tent
- Digital Screen Image

### Outcome Framing Rules

- Closure only
- No metrics
- No causality
- No suggestions

### Dependencies

| Depends On         | Description                    |
| ------------------ | ------------------------------ |
| All prior features | CMI, Blocks, Screens, Physical |

### API / Database

- **Campaigns:** `campaigns/{tId}/{sId}/{campaignId}`
- **Summary:** `platformSummary/campaigns_{sId}`
- **Exports:** `campaignExports/{tId}/{sId}/{exportId}`

---

## FEATURE DEPENDENCY GRAPH

```
CMI
├─ Decision Blocks
│   ├─ Screens
│   │   └─ Physical Surfaces
│   └─ Staff Prompt
└─ Social Content (Today)
```

---

## FEATURE COMPLETION STATUS

| Feature                | Status |
| ---------------------- | ------ |
| F-01 CMI               | ✅     |
| F-02 Decision Blocks   | ✅     |
| F-03 Digital Screens   | ✅     |
| F-04 Physical Surfaces | ✅     |
| F-05 Staff Prompt      | ✅     |
| F-06 Social Content    | ✅     |

---

## Cross-References

- Architecture → [DOC3-ARCHITECTURE-BLUEPRINT]
- Implementation → [DOC4-IMPLEMENTATION-BLUEPRINT]
- Verification → [DOC5-PRODUCTION-VERIFICATION]

---

_Document Status: ✅ COMPLETE_
