# Loyalty Health Signal — Spec

**Status:** Draft  
**Author:** Cascade (Lead Architect)  
**Date:** February 19, 2026  
**Audience:** CEO, PM, Clients (non-technical)  
**Pillar:** 5 of 6 — Customer-Facing Infrastructure

---

## Executive Summary

**What:** A single calm indicator that tells business owners whether customers are returning consistently, based on aggregate visitor behavior — not CRM data, not loyalty programs.

**Why:** 77.4% of restaurant guests never return (Bloom Intelligence 2025). A 5% increase in retention can boost profits 25-95% (Bain & Company). But owners have no visibility into return behavior. MenuList sits at the entry point and can detect patterns.

**For whom:** MenuList businesses with sufficient public page traffic.

**Impact:** Once owners know their loyalty health, they subconsciously rely on MenuList for this awareness. Losing that visibility creates quiet lock-in.

---

## Goals & Success Metrics

| Goal | Success Metric |
|------|---------------|
| Owner knows if customers are returning | Loyalty signal visible on dashboard |
| Signal is credible | Owner takes "Weak" seriously |
| No CRM creep | NEVER builds customer database or profiles |
| Privacy-safe | Zero individual tracking |
| Emotional reassurance | Owner feels calm when seeing "Strong" |

---

## Scope

### In-Scope

- Aggregate return visit pattern analysis
- Weekly loyalty state computation (shared Cloud Function with trust signal)
- Single-word dashboard display: Strong / Stable / Weak
- Visibility threshold (hide until enough data)
- Feature flag control
- Mobile display

### Out-of-Scope (Permanent Ban)

- Customer identity tracking or profiles
- Loyalty points / gamification / rewards
- CRM database
- Customer communication tools
- Retention marketing campaigns
- Cohort charts or retention analytics
- Push notifications to customers
- Individual customer visit history

---

## User Stories

### Story 1: Loyalty Strong

> As an **owner**, I see "Customer Loyalty: Strong" on my dashboard. I feel proud that people keep coming back. I continue what I'm doing.

### Story 2: Loyalty Weakening

> As an **owner**, I notice "Customer Loyalty: Weak." I think about recent changes — new competitor opened nearby, raised prices last month, changed a popular dish. I decide to investigate.

### Story 3: Not Enough Data

> As a **new owner**, the loyalty signal isn't visible yet. It appears only after enough traffic patterns exist. This prevents misleading signals.

---

## Signal Design

### States (3 only)

| State | Meaning | Owner Action |
|-------|---------|-------------|
| **Strong** | Healthy return visit patterns | None — keep going |
| **Stable** | Normal return behavior | None — baseline |
| **Weak** | Return visits declining | Owner self-investigates |

### Computation Inputs (Aggregate Only)

| Input | Source | What It Measures |
|-------|--------|-----------------|
| Return visitor ratio | Aggregate analytics | What % of visitors have visited before |
| Visit frequency | Weekly aggregation | How often visitors return |
| Loyalty trend | Week-over-week comparison | Is return rate improving or declining |

### Computation Logic

```
loyalty_score = weighted_average(
  return_ratio    * 0.40,  // % returning visitors
  frequency       * 0.30,  // How often they return
  loyalty_trend   * 0.30   // Improving or declining
)

If loyalty_score >= 0.60 → "Strong"
If loyalty_score >= 0.35 → "Stable"
If loyalty_score <  0.35 → "Weak"
```

### Return Visitor Detection (Privacy-Safe)

**Method:** Aggregate daily unique visitor count comparison

MenuList does NOT track individual devices. Instead:
- Compare total unique visitors vs total visits (if visits >> unique visitors, people are returning)
- Track week-over-week unique visitor stability (stable unique count = returning base)
- Use existing analytics event data (already anonymized)

This is a **statistical inference**, not individual tracking.

---

## Market Validation

| Statistic | Value | Source |
|-----------|-------|--------|
| Restaurant guests who never return | 77.4% | Bloom Intelligence 2025 |
| 5% retention increase → profit boost | 25-95% | Bain & Company / HBR |
| Company revenue from existing customers | 61-65% | Multiple sources |
| Returning customers spend more | 67% more | Bain & Company |
| Retention is cheaper than acquisition | 5-7x cheaper | Restroworks 2025 |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Statistical inference is inaccurate | Conservative thresholds, show "Stable" when uncertain |
| Privacy concerns | No individual tracking — aggregate inference only |
| Feature creep toward CRM | Constitutional ban on customer profiles/loyalty programs |
| Premature signal on low traffic | Visibility threshold (50+ visitors/week × 4 weeks) |

---

**Document Signature:** Cascade (Lead Architect)  
**Last Updated:** February 19, 2026
