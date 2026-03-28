# Risk / Decline Detection — Spec

**Status:** Draft  
**Author:** Cascade (Lead Architect)  
**Date:** February 19, 2026  
**Audience:** CEO, PM, Clients (non-technical)  
**Pillar:** 6 of 6 — Customer-Facing Infrastructure

---

## Executive Summary

**What:** A meta-signal that combines trust, loyalty, and engagement trends to detect if a business is silently declining. Shows one word: Stable, Watch, or At Risk.

**Why:** Sudden drops hurt but slow silent decline kills businesses. Most owners realize decline 3-6 months too late. MenuList sits at the customer entry point and sees behavioral shifts before they become revenue problems.

**For whom:** MenuList businesses with active Pillar 4 (Trust) and Pillar 5 (Loyalty) signals.

**Impact:** This is the deepest dependency-creating signal. Once owners believe MenuList will warn them about decline, they keep it forever. Because no other system provides calm early awareness.

---

## Goals & Success Metrics

| Goal | Success Metric |
|------|---------------|
| Detect decline before revenue drops | Signal transitions to "Watch" or "At Risk" weeks before owner notices revenue change |
| Owner trusts the signal | Owner takes "At Risk" seriously and investigates |
| No false alarms | Conservative thresholds — prefer "Stable" over false "Watch" |
| No analytics creep | ONE word only |

---

## Scope

### In-Scope

- Combined signal from trust + loyalty + engagement trends
- Three states: Stable / Watch / At Risk
- Weekly computation (same Cloud Function as Pillars 4-5)
- Dashboard display (single word)
- Visibility threshold (requires Pillars 4+5 active)
- Feature flag control

### Out-of-Scope (Permanent Ban)

- Business analytics dashboard
- Revenue prediction or forecasting
- Growth metrics or charts
- Diagnostic reports ("your decline is because...")
- AI business advice
- Performance comparisons with competitors
- "Action plan" recommendations

---

## User Stories

### Story 1: Business Stable

> As an **owner**, I see "Business Health: Stable" on my dashboard. Everything is fine. I don't think about it.

### Story 2: Early Warning

> As an **owner**, I see "Business Health: Watch" for the first time. It wasn't there last week. I look at my trust and loyalty signals — loyalty is weakening. I realize a new competitor opened nearby last month. I decide to focus on service quality.

### Story 3: At Risk

> As an **owner**, I see "Business Health: At Risk." Both trust and loyalty have been weak for 2 weeks. I check reviews — some recent complaints. I take immediate action to address the issues.

---

## Signal Design

### States (3 only — NEVER add more)

| State | Meaning | Derived From |
|-------|---------|-------------|
| **Stable** | All health signals are normal | Trust ≥ Stable AND Loyalty ≥ Stable |
| **Watch** | One or more signals weakening | Trust = Weak OR Loyalty = Weak |
| **At Risk** | Multiple signals declining | Trust = Weak AND Loyalty = Weak, OR declining for 3+ weeks |

### Computation Logic

```
// Combines Pillar 4 + Pillar 5 + engagement trend
risk_state = derive_from(
  trust_state,
  loyalty_state,
  engagement_trend  // week-over-week engagement change
)

Rules:
  If trust = 'strong' AND loyalty = 'strong' → "Stable"
  If trust = 'stable' AND loyalty = 'stable' → "Stable"
  If trust = 'weak' OR loyalty = 'weak' → "Watch"
  If trust = 'weak' AND loyalty = 'weak' → "At Risk"
  If any signal declining for 3+ consecutive weeks → "At Risk"
```

### Tone Discipline

Never dramatic:
- ❌ "YOUR BUSINESS IS DECLINING!!!"
- ✅ "Business Health: Watch"

Never prescriptive:
- ❌ "Improve your service to fix this"
- ✅ Just the state word

Infrastructure informs. Owner decides.

---

## Activation Requirements

This pillar CANNOT activate independently:

1. Trust Health Signal (Pillar 4) must be active and visible
2. Loyalty Health Signal (Pillar 5) must be active and visible
3. Both must have at least 4 weeks of data
4. Only then does Risk/Decline Detection compute

If either prerequisite is missing → hide this signal entirely.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| False "At Risk" alarm | Conservative rules — require multiple signals declining |
| Owner panics | Calm tone, never alarmist. "Watch" is a gentle nudge, not a siren. |
| Signal too conservative (never shows "At Risk") | Better safe than alarming. Credibility is everything. |
| Analytics creep | Constitutional ban on health dashboards |

---

## Strategic Significance

This pillar creates the **deepest long-term dependency** in the 6-pillar model:

- Presence = functional dependency (they need the link)
- Truth = reliability dependency (they trust the data)
- Reputation = emotional dependency (they feel protected)
- Trust/Loyalty = awareness dependency (they know their health)
- **Risk Detection = survival dependency (they believe MenuList will warn them)**

Survival awareness is the strongest form of lock-in. If MenuList disappears, they lose their early warning system.

---

**Document Signature:** Cascade (Lead Architect)  
**Last Updated:** February 19, 2026
