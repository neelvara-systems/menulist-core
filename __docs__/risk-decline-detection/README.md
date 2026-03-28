# Risk / Decline Detection (Pillar 6)

> **"Is my business silently getting weaker?"**

**Created:** February 19, 2026  
**Pillar:** 6 of 6 — Customer-Facing Infrastructure  
**Status:** ✅ IMPLEMENTED (flags OFF — needs Pillars 4+5 active with traffic)  
**Parent:** [`__docs__/customer-facing-infrastructure/`](../customer-facing-infrastructure/README.md)

---

## Quick Navigation

| Document                                                     | Audience     | Purpose                              |
| ------------------------------------------------------------ | ------------ | ------------------------------------ |
| [Spec](./risk-decline-detection_spec.md)                     | CEO, PM      | Business requirements, signal design |
| [Impl](./risk-decline-detection_impl.md)                     | Developers   | Technical architecture, computation  |
| [Marketing](./risk-decline-detection_marketing.md)           | Sales        | Pitch deck, messaging                |
| [Website](./risk-decline-detection_website.md)               | Public       | Landing page content                 |
| [Help Doc](./risk-decline-detection_helpdoc.md)              | Customers    | How risk detection works             |
| [Firebase](./risk-decline-detection_firebase.md)             | Cost Control | Computation cost estimates           |
| [Mobile Support](./risk-decline-detection_mobile-support.md) | Internal     | Mobile display assessment            |

---

## One-Liner

An early warning signal that combines trust, loyalty, and engagement trends to detect if a business is silently declining — before revenue drops.

## Problem Solved

Businesses rarely collapse suddenly. They decline slowly over 3-6 months: repeat visits drop, engagement weakens, trust erodes. Owners notice too late — after revenue has already fallen. MenuList can detect the pattern earlier by combining signals from Pillars 4 and 5 with engagement data.

## Architecture Overview

```
Trust Signal (Pillar 4) + Loyalty Signal (Pillar 5) + Engagement Trends
  ↓
Risk Engine (combined weighted signal)
  ├── Stable    → All signals healthy
  ├── Watch     → One or more signals weakening
  └── At Risk   → Multiple signals declining together
  ↓
Owner Dashboard
  └── "Business Health: Stable" / "Watch" / "At Risk"
```

## Feature Flag

```typescript
ENABLE_RISK_DECLINE_DETECTION: false; // To be added to features.ts
```

## Dependency Chain

This pillar REQUIRES Pillars 4 and 5 to be active first. It is a meta-signal combining their outputs.

| Dependency                        | Status        |
| --------------------------------- | ------------- |
| Trust Health Signal (Pillar 4)    | 🆕 Documented |
| Loyalty Health Signal (Pillar 5)  | 🆕 Documented |
| Existing analytics infrastructure | ✅ Built      |

## Success Test

> **Owner believes: "If my business starts weakening, MenuList will know before I do."**
> That's when this becomes irreplaceable.

---

**Last Updated:** February 19, 2026
