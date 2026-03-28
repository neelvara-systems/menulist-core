# Trust Health Signal — Spec

**Status:** Draft  
**Author:** Cascade (Lead Architect)  
**Date:** February 19, 2026  
**Audience:** CEO, PM, Clients (non-technical)  
**Pillar:** 4 of 6 — Customer-Facing Infrastructure

---

## Executive Summary

**What:** A single calm indicator that tells business owners whether customer trust in their business is holding steady, strengthening, or weakening — based on aggregate visitor behavior patterns.

**Why:** Business owners constantly worry about whether customers still trust them. No reliable signal exists. POS doesn't show this. Gut feeling is misleading. MenuList sits at the entry point of the customer journey and can detect behavioral shifts before they become revenue problems.

**For whom:** MenuList businesses with sufficient public page traffic (50+ visitors/week).

**Impact:** Creates emotional dependency — owners subconsciously rely on MenuList for reassurance about their business health. Even if they rarely open it, they know it's watching.

---

## Goals & Success Metrics

| Goal | Success Metric |
|------|---------------|
| Owner gets calm trust awareness | Trust signal visible on dashboard |
| Signal is credible | Owner takes "Weak" signal seriously |
| No analytics creep | NEVER shows charts, %, or data |
| Privacy-safe | Zero individual tracking, aggregate only |
| Cost-efficient | <₹50/month for 100 stores |

---

## Scope

### In-Scope

- Aggregate visitor behavior analysis (volume, patterns, engagement)
- Weekly trust state computation via Cloud Function
- Single-word dashboard display: Strong / Stable / Weak
- Visibility threshold (hide until enough data exists)
- Feature flag control
- Mobile display (same single word)

### Out-of-Scope (Permanent Ban)

- Individual visitor tracking or fingerprinting
- Trust percentage or score display
- Trend charts or graphs
- "Why trust is weak" explanations
- Recommendations or action items
- Customer identity or profiles
- NPS-style surveys
- Engagement analytics dashboards

---

## User Stories

### Story 1: Trust Stable

> As an **owner**, I open my dashboard and see "Customer Trust: Strong" in a calm card. I feel reassured. I close the app and continue my day.

### Story 2: Trust Weakening

> As an **owner**, I see "Customer Trust: Weak" for the first time. I check my reviews, think about recent service quality, and decide to pay extra attention to customer experience this week.

### Story 3: Insufficient Data

> As a **new owner** with few visitors, I don't see the Trust Signal at all. It appears only after 4 weeks of consistent traffic. This prevents false signals from destroying credibility.

---

## Signal Design

### States (3 only — NEVER add more)

| State | Meaning | Owner Action |
|-------|---------|-------------|
| **Strong** | Visitor patterns stable or improving | None — reassurance |
| **Stable** | Normal variance, no concerns | None — baseline |
| **Weak** | Declining patterns detected | Owner self-investigates |

### Computation Inputs (Aggregate Only)

| Input | Source | What It Measures |
|-------|--------|-----------------|
| Weekly unique visitors | Existing OBP/menu analytics | Volume trend |
| Direct visit ratio | Analytics (direct vs referral) | Return behavior proxy |
| Engagement depth | Page interaction patterns | Interest level |
| Visit consistency | Week-over-week stability | Predictability |

### Computation Logic

```
trust_score = weighted_average(
  volume_trend     * 0.30,  // Are fewer people coming?
  direct_ratio     * 0.25,  // Are people coming back directly?
  engagement_depth * 0.25,  // Are people engaged?
  consistency      * 0.20   // Is traffic predictable?
)

If trust_score >= 0.65 → "Strong"
If trust_score >= 0.40 → "Stable"  
If trust_score <  0.40 → "Weak"
```

### Visibility Rules

- **Hide** until: 50+ unique visitors/week for 4+ consecutive weeks
- **Show** only on: Owner dashboard (desktop + mobile)
- **Update frequency:** Weekly (computed by nightly scheduler)
- **Never show** to: Customers or public pages

---

## Privacy Architecture (CRITICAL)

### What We Track (Aggregate Only)
- Total page views per day (number only)
- Unique visitor count per day (cookie-based counter, not identity)
- Average time on page (aggregate, not per-visitor)
- Interaction events (menu opens, action clicks — already tracked)

### What We NEVER Track
- Individual visitor identity
- Device fingerprints
- Personal browsing patterns
- Cross-site tracking
- Location data beyond what's in existing analytics

### Compliance
- India DPDPA 2023: Aggregate statistical data without personal identification = likely exempt
- GDPR (if applicable): Anonymous aggregation = not personal data
- **Recommendation:** Add privacy disclosure to public pages when this feature activates

---

## Tone & Display

### Dashboard Display
```
┌─────────────────────────┐
│  Customer Trust: Strong  │
│  ────────────────────── │
│  Based on visitor trends │  ← Single line, muted text
└─────────────────────────┘
```

### Rules
- Never dramatic: ❌ "TRUST COLLAPSING!!!"
- Always calm: ✅ "Customer Trust: Weak"
- Never prescriptive: ❌ "Improve your menu to fix trust"
- Always observational: ✅ Just the state word

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Signal shown too early (unreliable) | Visibility threshold: 50+ visitors/week × 4 weeks |
| Owner panics at "Weak" | Calm tone, no alarm. Owner self-investigates. |
| Privacy concerns | Aggregate-only, no individual tracking |
| Analytics creep (adding charts later) | Constitutional ban on health signal dashboards |
| Signal accuracy | Conservative thresholds — better to show "Stable" than false "Weak" |

---

**Document Signature:** Cascade (Lead Architect)  
**Last Updated:** February 19, 2026
