# Continuous Menu Intelligence - Product Specification

**Created:** January 8, 2026  
**Last Updated:** March 15, 2026  
**Status:** 🔒 **LOCKED — Repositioned (Two-Layer Architecture)**  
**Author:** Lead Architect (Cascade)  
**Source:** Bond Capital TAI Report + ChatGPT Strategic Synthesis + Codebase Cross-Reference + Strategic Repositioning Review (March 2026)  
**Applies:** 3-Year Architecture Freeze Rule

> **⚠️ March 2026 Strategic Repositioning:** Following ChatGPT strategic review validated against Product Evolution Doctrine (constitution #11), CMI is now a **two-layer system**: Observation Layer (MenuList) + Optimization Layer (GrowthOS-deferred). Autonomous actions remain in code (feature-flagged) but are architecturally classified as GrowthOS territory. See `_archive/chatgpt-review-strategic-repositioning.md`.

---

## Executive Summary

### Goals

Transform MenuListAi from an **episodic AI tool** (runs when triggered) to a **continuous observation system** (runs silently, learns daily, captures behavioral signals). MenuList observes how customers interact with menus; it does not optimize or manipulate what customers see.

> **Architectural Boundary:** MenuList = observation + signal capture. GrowthOS (deferred) = optimization + autonomous actions. Per Product Evolution Doctrine, optimization belongs in Stage 2 (GrowthOS), not Stage 0 (MenuList).

### The Core Problem

| Current State                   | CMI Standard                        |
| ------------------------------- | ----------------------------------- |
| AI runs on menu upload          | AI observes continuously            |
| No behavioral signals captured  | System learns from behavior daily   |
| Owner "checks" system regularly | Owner forgets system exists         |
| No item-level intelligence      | System understands item performance |

### The Solution

A **silent, always-on observation layer** that:

- Runs nightly at 02:30 UTC
- Evaluates every menu item's behavioral signals
- Computes confidence scores based on customer interaction
- Stores intelligence state for downstream consumption
- Locks project-specific calibration after sufficient data

### One-Line Value Proposition

> **"MenuList quietly understands how customers interact with your menu."**

---

### Scope

| MenuList Scope (Observation)        | GrowthOS Scope (Deferred)                 | Out of Scope                         |
| ----------------------------------- | ----------------------------------------- | ------------------------------------ |
| ✅ Nightly intelligence job         | ⏳ AUTO_HIDE (confidence < 0.35)          | ❌ New UI dashboards                 |
| ✅ Item confidence scoring          | ⏳ AUTO_PROMOTE (stable high confidence)  | ❌ Per-item analytics views          |
| ✅ Suppression window detection     | ⏳ AUTO_DEMOTE (falling confidence)       | ❌ "Why this item?" tooltips         |
| ✅ Time-window eligibility tracking | ⏳ AUTO_SUPPRESS (fatigue-based)          | ❌ Owner controls for confidence     |
| ✅ Internal audit logging           | ⏳ AUTO_ADJUST_TIME (time window changes) | ❌ ML model retraining               |
| ✅ Project-specific calibration     | ⏳ AUTO_STABILIZE (evergreen fill)        | ❌ A/B testing interface             |
| ✅ Behavioral signal state storage  | ⏳ Promotion slot allocation              | ❌ Confidence scores shown to owners |

> **⏳ = Code exists (feature-flagged), architecturally classified as GrowthOS. Will activate when GrowthOS launches.**

---

## User Stories / Flows

### Primary: Shop Owner

#### Story 1: The Forgetting Owner

> "I haven't opened MenuListAi in 2 weeks. I come back and the system already knows which items customers are engaging with and which ones they ignore. I didn't do anything."

**Flow:** Owner ignores app → Nightly job runs → Intelligence state captures behavioral patterns → System understands menu performance

#### Story 2: The Skeptical Owner

> "After a month, I could see which of my items customers actually pay attention to. The system quietly learned that my samosa isn't getting much interest compared to other items."

**Flow:** Item underperforms → Confidence drops → Intelligence state reflects reality → Future GrowthOS can act on this

#### Story 3: The Busy Owner

> "Diwali was crazy. I didn't touch MenuListAi for 3 weeks. When I came back, the system had been quietly learning the whole time. It understood my menu's performance patterns through the entire festival season."

**Flow:** Owner busy → System continues observing → Intelligence state accumulates 3 weeks of behavioral data → Owner returns to informed system

### Secondary: Support Team

#### Story 4: Fewer "Why" Tickets

> "Support tickets shifted from 'Why is this item showing?' to 'Screen didn't load.' Infrastructure issues, not intelligence questions. The system runs silently."

---

## System Constraints (No POS/Inventory)

> **CRITICAL:** MenuListAi has NO real-time inventory integration, NO POS system, NO ordering data.

### What We Have

| Data Source                      | What It Provides                     | Reliability        |
| -------------------------------- | ------------------------------------ | ------------------ |
| Page Views (`totalViews`)        | How many times menu was loaded       | ✅ High            |
| Item Clicks (`clicksByItem`)     | Which items customers tapped/clicked | ✅ High            |
| Decision Block Clicks            | Which recommendations were clicked   | ✅ High            |
| Hourly Patterns (`hourlyClicks`) | Aggregate time-of-day engagement     | ✅ High            |
| Owner Toggle (`available`)       | Manual "sold out" flag               | ⚠️ Owner-dependent |
| Owner Boost (`ownerBoost`)       | -20 to +20 score modifier            | ⚠️ Owner-dependent |

### What We DON'T Have

| Missing Data         | Impact                       | Workaround                       |
| -------------------- | ---------------------------- | -------------------------------- |
| Real-time inventory  | Can't auto-detect sold out   | Owner toggles `available`        |
| POS/Sales data       | Can't measure conversions    | Use clicks as proxy for interest |
| Order completion     | Can't track actual purchases | Clicks = engagement signal       |
| Per-item impressions | Can't calculate true CTR     | Use page views as denominator    |

### Terminology Alignment

| Spec Term       | Code Term          | Definition                      |
| --------------- | ------------------ | ------------------------------- |
| **Views**       | `totalViews`       | Page loads (not per-item)       |
| **Taps**        | `clicksByItem`     | Item clicks from customer menu  |
| **Engagement**  | clicks/views       | Proxy for customer interest     |
| **Unavailable** | `available: false` | Owner manually marked sold out  |
| **Inactive**    | `active: false`    | Owner permanently disabled item |

---

## Requirements

### Functional Requirements

#### MenuList Observation Layer (Active)

| ID    | Requirement                                             | Priority     | Notes                                                |
| ----- | ------------------------------------------------------- | ------------ | ---------------------------------------------------- |
| FR-1  | Nightly job runs for all active projects at 02:30 UTC   | Must Have    | Extends `decisionBlocksScoring.ts` (same loop)       |
| FR-2  | Item confidence updates based on 7-day rolling behavior | Must Have    | Inputs: clicks, item views, DB clicks, owner signals |
| FR-3  | Suppression window detection on fatigue signals         | Must Have    | Detects when item is overexposed (logged, not acted) |
| FR-4  | Time-window eligibility tracking                        | Must Have    | Tracks best time slots per item based on behavior    |
| FR-7  | All observations logged with reasons                    | Must Have    | Internal only, includes contributing factors         |
| FR-8  | Project-specific calibration after data sufficiency     | Should Have  | Locks baseline when sufficient data accumulated      |
| FR-9  | Stability mode on data sparsity                         | Should Have  | Low data → evergreen only                            |
| FR-10 | Mid-day lightweight check                               | Nice to Have | Owner `available` toggle sync only                   |

#### GrowthOS Optimization Layer (Deferred — code exists, flagged)

| ID    | Requirement                                      | Priority | Notes                                     |
| ----- | ------------------------------------------------ | -------- | ----------------------------------------- |
| FR-5  | Auto-hide items with confidence < 0.35           | GrowthOS | Low engagement items hidden from surfaces |
| FR-6  | Auto-promote items with stable confidence ≥ 0.65 | GrowthOS | 3+ days stable required                   |
| FR-11 | Promotion slot allocation                        | GrowthOS | Attention budget across surfaces          |
| FR-12 | Autonomous action reversal checks                | GrowthOS | 24h auto-restore check for hidden items   |

### Non-Functional Requirements

| ID    | Requirement                                  | Target                  |
| ----- | -------------------------------------------- | ----------------------- |
| NFR-1 | Nightly job duration                         | < 5 min for 1000 stores |
| NFR-2 | Intelligence state document size             | < 50KB per store        |
| NFR-3 | Confidence calculation latency               | < 100ms per item        |
| NFR-4 | Zero public failures from autonomous actions | 0 visible errors        |
| NFR-5 | Job success rate                             | > 99.5%                 |

### Firebase Cost Analysis

| Operation                        | Frequency         | Reads | Writes | Cost Impact                   |
| -------------------------------- | ----------------- | ----- | ------ | ----------------------------- |
| Nightly job - fetch analytics    | 1/store/day       | 2     | 0      | ~2000 reads/day (1000 stores) |
| Intelligence state update        | 1/store/day       | 0     | 1      | ~1000 writes/day              |
| Audit log entries                | ~5/store/day avg  | 0     | 5      | ~5000 writes/day              |
| Campaign engine reads (existing) | Already happening | 0     | 0      | No new cost                   |

**Estimated daily cost for 1000 stores:** ~$0.02/day (negligible)

---

## Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│              EXTENDED DECISION BLOCKS SCHEDULER             │
│                    (02:30 UTC Daily)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. Fetch Analytics       2. Evaluate Items      3. Act   │
│   ┌──────────────┐        ┌──────────────┐     ┌─────────┐ │
│   │ 7-day clicks │   →    │ Calculate    │  →  │ Update  │ │
│   │ by item      │        │ confidence   │     │ state   │ │
│   │ Owner boost  │        │ per item     │     │ Log     │ │
│   │ Decision blk │        │              │     │ actions │ │
│   │ clicks       │        │ Apply gates  │     │ +reason │ │
│   └──────────────┘        └──────────────┘     └─────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE STATE                       │
│           menuIntelligence/{tId}_{sId}_{projectId}          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   itemConfidence: { [itemId]: ConfidenceData }              │
│   suppressionWindows: { [itemId]: SuppressUntil }           │
│   timeEligibility: { [itemId]: { lunch, dinner, ... } }     │
│   projectCalibration: { locked: boolean, lockedAt: Date }   │
│   computedAt: Timestamp                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    EXISTING SURFACES                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Today Tab  ←──  Campaign Engine  ──→  Digital Screens    │
│   (reads confidence)  (uses confidence)  (uses confidence)  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### The 6 Autonomous Actions (GrowthOS-Deferred)

> **Note:** These actions exist in code (`functions/src/intelligence/menuIntelligence.ts`) but are architecturally classified as **GrowthOS territory**. They compute and log actions in the intelligence state document but do NOT modify source menu data. When GrowthOS launches, these become active optimization behaviors.

| Action               | Trigger                          | Reversible                   | Effect                         | Layer    |
| -------------------- | -------------------------------- | ---------------------------- | ------------------------------ | -------- |
| **AUTO-HIDE**        | Confidence < 0.35                | Yes (24h auto-restore check) | Item hidden from Today/Screens | GrowthOS |
| **AUTO-DEMOTE**      | Sliding confidence               | Yes                          | Item drops in priority         | GrowthOS |
| **AUTO-PROMOTE**     | Confidence ≥ 0.65 stable 3+ days | Yes                          | Item gains priority            | GrowthOS |
| **AUTO-SUPPRESS**    | Fatigue detected (shown 5+ days) | Yes                          | Item rests for N days          | GrowthOS |
| **AUTO-ADJUST-TIME** | Item ignored in time window      | Yes                          | Becomes ineligible for window  | GrowthOS |
| **AUTO-STABILIZE**   | Screen < 3 slides                | Instant                      | Forces evergreen fill          | GrowthOS |

### The Autonomy Gate (All 3 Required — GrowthOS)

```
canAct =
  confidenceTier >= CAUTIOUS (0.40+) &&
  actionIsReversible === true &&
  blastRadius <= SAFE_THRESHOLD
```

If any gate fails → system does **nothing**. Silence > mistakes.

### Confidence Tiers

| Tier              | Score Range | System Posture              |
| ----------------- | ----------- | --------------------------- |
| **UNTRUSTED**     | 0.00 – 0.39 | Evergreen only              |
| **CAUTIOUS**      | 0.40 – 0.59 | Passive campaigns only      |
| **CONFIDENT**     | 0.60 – 0.79 | Eligible for Today, Screens |
| **AUTHORITATIVE** | 0.80 – 1.00 | Can repeat daily            |

---

## Risks & Mitigations

| Risk                            | Likelihood | Impact | Mitigation                               |
| ------------------------------- | ---------- | ------ | ---------------------------------------- |
| Nightly job fails silently      | Medium     | High   | Dead-letter queue + Slack alerts         |
| Wrong item auto-hidden          | Low        | Medium | 24h auto-restore + internal audit log    |
| Store never reaches calibration | Low        | Low    | Manual trigger option (admin only)       |
| Firebase costs spike            | Low        | Medium | Rate limiting built into job             |
| Owner notices "AI doing things" | Medium     | Low    | No UI, no explanations, silent operation |

---

## Open Questions

| #   | Question                                         | Status           | Owner       |
| --- | ------------------------------------------------ | ---------------- | ----------- |
| 1   | Should mid-day check be enabled by default?      | Pending          | Product     |
| 2   | What's the threshold for "fatigue" (days shown)? | Proposed: 5 days | Product     |
| 3   | Should calibration lock be overridable by admin? | Pending          | Engineering |

---

## The Kill List (Features NEVER to Build)

These features will destroy trust, authority, and irreversibility. **Even if customers ask.**

| ❌ Feature                                       | Why It Kills Trust                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| **"Why did MenuList do this?" explanations**     | Authority systems don't explain themselves. Explanation invites debate.     |
| **Manual ordering / ranking controls**           | If owners can arrange → system loses accountability                         |
| **Scheduling & time rules UI**                   | Recreates spreadsheets, breaks zero-decision default                        |
| **Performance dashboards for campaigns/screens** | You don't own full funnel; you'll be wrong; trust breaks                    |
| **A/B testing interfaces**                       | Turns owners into analysts; shifts cognitive load back                      |
| **Templates marketplace / browsers**             | Choice fatigue; decision paralysis                                          |
| **Per-surface configuration**                    | Surfaces are outputs of intent, not separate products                       |
| **Notifications & alerts explosion**             | Anxiety, noise, notification blindness                                      |
| **"Advanced Mode" for power users**              | Fragments learning; power-user forks destroy system                         |
| **Letting owners disable system content**        | Lose accountability, learning, authority                                    |
| **Autonomous menu manipulation in MenuList**     | MenuList is truth infrastructure, not optimization. Optimization = GrowthOS |

### The One Sentence Policy

> **If a feature increases owner thinking, it does not ship.**

---

## Zero-Decision Default Mode (First 30 Days)

For the first 30 days, MenuListAi must not ask a single product question.

### What Is Locked (Hidden or Disabled)

For 30 days, the owner CANNOT:

- Change campaign types
- Choose surfaces
- Control cadence
- Enable/disable AI behavior
- Customize rules
- See advanced analytics

### What Still Works (Automatically)

| Surface               | Behavior                                                 |
| --------------------- | -------------------------------------------------------- |
| **Today Tab**         | Appears when confidence ≥ threshold, disappears when not |
| **Digital Screen**    | Always live, always rotating, always safe                |
| **Menu Presentation** | Auto-reordering, auto-spotlight, auto-demotion           |

### Owner Experience Arc

| Days  | Owner Feels                         |
| ----- | ----------------------------------- |
| 1–3   | "This just works."                  |
| 4–10  | "It keeps doing the right thing."   |
| 11–30 | "I don't think about this anymore." |

Only after this do controls earn the right to exist.

---

## Appendix: ChatGPT Alignment & Disagreements

### Aligned with ChatGPT

| Point                      | ChatGPT Said                | Cascade Agrees             |
| -------------------------- | --------------------------- | -------------------------- |
| Continuous > Episodic      | AI must run daily           | ✅ Yes - core thesis       |
| No explanations            | Don't show confidence       | ✅ Yes - authority pattern |
| Reversible actions only    | All auto-actions reversible | ✅ Yes - safety gate       |
| Store-specific calibration | Defaults evolve per-store   | ✅ Yes - after 21 days     |

### Disagreements with ChatGPT (Original — January 2026)

| Point                                         | ChatGPT Said            | Cascade Says                                   | Reason                                                                                     |
| --------------------------------------------- | ----------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Path: `menuIntelligence/{tenantId}/{storeId}` | Use this path           | Use `menuIntelligence/{tId}_{sId}_{projectId}` | **Project-level** - analytics are per-project, one store has multiple projects             |
| Separate scheduler job                        | New menuIntelligenceJob | Extend `decisionBlocksScoring.ts`              | Same data, same loop, 50% cost savings                                                     |
| Owner memory concept                          | Track owner preferences | Use existing campaign suppression              | Already have `suppressedTypes` in `ProjectContext` - no duplication needed                 |
| 7 loops                                       | Build all 7 loops       | Build 5 loops                                  | Loops 6-7 (Trust Gauntlet, Sales Firewall) are marketing/ops, not code                     |
| Real-time confidence                          | Update on every event   | Nightly batch only                             | Firebase cost + complexity; batch is sufficient for SMB use case                           |
| Per-item views                                | Track impressions       | Use page views as denominator                  | ~~No per-item impression tracking exists~~ → **viewsByItem NOW EXISTS** (`unified.ts:299`) |

### Strategic Repositioning Review (March 2026)

| ChatGPT Said (March 2026)                      | Cascade Verdict | Reason                                                             |
| ---------------------------------------------- | --------------- | ------------------------------------------------------------------ |
| CMI autonomous actions belong in GrowthOS      | **AGREE**       | Product Evolution Doctrine places optimization in Stage 2          |
| MenuList should only observe, not optimize     | **AGREE**       | Truth infrastructure ≠ optimization engine                         |
| Clicks are weak signal without POS             | **AGREE**       | Valid limitation; documented as known constraint                   |
| Use multi-signal scoring (impressions + dwell) | **PARTIAL**     | Valid improvement; noted for future scoring update                 |
| Data sufficiency calibration > 21-day fixed    | **AGREE**       | Statistical basis > arbitrary time. Future improvement.            |
| Exposure-based fatigue > day-based             | **AGREE**       | Better model. Future improvement.                                  |
| Contextual bandits / Thompson Sampling         | **REJECT**      | Premature at ~100 signals/day; needs 10K+ restaurants              |
| Global cross-restaurant learning               | **DEFER**       | Valid at scale; irrelevant at <100 restaurants                     |
| Rename collection to menuSignals/growthSignals | **REJECT**      | Breaking change across codebase; no functional benefit             |
| Website: subtle mention, not headline          | **AGREE**       | Reframed website/marketing docs                                    |
| Frame as "Menu Insights" not "AI optimization" | **AGREE**       | Matches Language Governance doctrine                               |
| Signal taxonomy: lock to 6 essential signals   | **AGREE**       | Prevents analytics sprawl                                          |
| Client session buffering for cost efficiency   | **DEFER**       | Valid architecture for future scale; not needed at current traffic |
| Item consideration (dwell time) signal         | **DEFER**       | New signal; implement when traffic justifies                       |

> **Full review:** `_archive/chatgpt-review-strategic-repositioning.md`
